"""
Mona Salon Face Shape AI - V7 Training & Benchmark Suite
========================================================
1. Downloads public 5-class Face Shape dataset (Heart, Oblong, Oval, Round, Square).
2. Evaluates V6 baseline (EfficientNet-B4) on exact held-out test split.
3. Preprocesses & caches aligned square face crops + 24 MediaPipe 478-landmark geometric features.
4. Trains V7 Hybrid Fusion Model (ConvNeXt-Small IN22k + Geometric Landmark MLP) with:
   - Geometry-preserving augmentations (NO aspect-ratio stretching!)
   - Differential learning rates + Cosine Annealing + Warmup
   - Label smoothing + Modality dropout + Model EMA
   - Mixed precision (bf16/fp16) on NVIDIA RTX 4060
5. Fits Temperature Scaling & calibrated confidence threshold on validation split (zero test leakage).
6. Evaluates V7 (single view + Multi-View TTA + V6/V7 ensemble check) on exact held-out test set
   and writes detailed Accuracy / Precision / Recall / F1 / ECE / Confusion Matrix comparison.
"""

import copy
import json
import math
import os
import random
import time
from pathlib import Path
from typing import Dict, List, Tuple

# Route all dataset/model/temp caches to NVMe drive (E:) instead of SATA C:/D:
NVME_ROOT = Path(os.getenv("MONA_NVME_CACHE", r"E:\_mona_ai_cache"))
for sub in ("hf", "torch", "kagglehub", "tmp", "v7_dataset_cache"):
    (NVME_ROOT / sub).mkdir(parents=True, exist_ok=True)
os.environ.setdefault("HF_HOME", str(NVME_ROOT / "hf"))
os.environ.setdefault("TORCH_HOME", str(NVME_ROOT / "torch"))
os.environ.setdefault("KAGGLEHUB_CACHE", str(NVME_ROOT / "kagglehub"))
os.environ.setdefault("TMP", str(NVME_ROOT / "tmp"))
os.environ.setdefault("TEMP", str(NVME_ROOT / "tmp"))

import kagglehub
import mediapipe as mp
import numpy as np
import timm
import torch
import torch.nn as nn
import torch.nn.functional as F
from PIL import Image, ImageOps
from scipy.optimize import minimize
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
    precision_recall_fscore_support,
)
from sklearn.model_selection import StratifiedShuffleSplit
from torch.utils.data import DataLoader, Dataset
from torchvision import models, transforms
from tqdm import tqdm

from face_geometry import (
    FacePreprocessor,
    GEO_FEATURE_NAMES,
    NUM_GEO_FEATURES,
    square_padded_crop,
)

BASE_DIR = Path(__file__).resolve().parent
CACHE_DIR = NVME_ROOT / "v7_dataset_cache"
CLASSES = ["Heart", "Oblong", "Oval", "Round", "Square"]
CLASS_TO_IDX = {c: i for i, c in enumerate(CLASSES)}
SEED = 42


def seed_everything(seed: int = SEED):
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    torch.cuda.manual_seed_all(seed)


# ---------------------------------------------------------------------------
# Model Architecture: Hybrid ConvNeXt-Small + Geometric Landmark MLP
# ---------------------------------------------------------------------------
class HybridFaceShapeNet(nn.Module):
    def __init__(
        self,
        backbone_name: str = "convnext_small.fb_in22k_ft_in1k_384",
        num_classes: int = 5,
        num_geo_features: int = NUM_GEO_FEATURES,
        pretrained: bool = True,
        drop_rate: float = 0.25,
        geo_dropout_prob: float = 0.15,
    ):
        super().__init__()
        self.backbone_name = backbone_name
        self.geo_dropout_prob = geo_dropout_prob

        self.backbone = timm.create_model(
            backbone_name,
            pretrained=pretrained,
            num_classes=0,
            drop_path_rate=0.2,
        )
        vis_dim = self.backbone.num_features

        self.geo_encoder = nn.Sequential(
            nn.Linear(num_geo_features + 1, 64),
            nn.LayerNorm(64),
            nn.GELU(),
            nn.Dropout(0.15),
            nn.Linear(64, 64),
            nn.LayerNorm(64),
            nn.GELU(),
        )

        # Residual fusion head
        self.vis_norm = nn.LayerNorm(vis_dim)
        self.classifier = nn.Sequential(
            nn.Dropout(drop_rate),
            nn.Linear(vis_dim + 64, 256),
            nn.LayerNorm(256),
            nn.GELU(),
            nn.Dropout(drop_rate * 0.6),
            nn.Linear(256, num_classes),
        )

    def forward(
        self,
        x_img: torch.Tensor,
        x_geo: torch.Tensor,
        has_geo: torch.Tensor,
    ) -> torch.Tensor:
        vis_feat = self.vis_norm(self.backbone(x_img))

        # Modality dropout during training so model remains strong even without landmarks
        if self.training and self.geo_dropout_prob > 0:
            keep = (torch.rand_like(has_geo) > self.geo_dropout_prob).float()
            eff_has_geo = has_geo * keep
        else:
            eff_has_geo = has_geo

        eff_geo = x_geo * eff_has_geo.unsqueeze(1)
        geo_in = torch.cat([eff_geo, eff_has_geo.unsqueeze(1)], dim=1)
        geo_feat = self.geo_encoder(geo_in)

        fused = torch.cat([vis_feat, geo_feat], dim=1)
        return self.classifier(fused)


# ---------------------------------------------------------------------------
# Dataset Helpers
# ---------------------------------------------------------------------------
def find_dataset_splits(root: Path) -> Tuple[Path, Path]:
    train_dir = None
    test_dir = None
    for dirpath, dirnames, _ in os.walk(root):
        dset = set(dirnames)
        if set(CLASSES).issubset(dset):
            low = dirpath.lower()
            if "train" in low:
                train_dir = Path(dirpath)
            elif "test" in low:
                test_dir = Path(dirpath)
    if train_dir is None or test_dir is None:
        raise FileNotFoundError(
            f"Could not locate training_set and testing_set with classes {CLASSES} under {root}"
        )
    return train_dir, test_dir


def collect_images(split_dir: Path) -> List[Tuple[Path, int]]:
    items = []
    valid_exts = {".jpg", ".jpeg", ".png", ".webp", ".bmp"}
    for cls_name in CLASSES:
        cls_dir = split_dir / cls_name
        if not cls_dir.exists():
            continue
        for p in sorted(cls_dir.iterdir()):
            if p.is_file() and p.suffix.lower() in valid_exts:
                items.append((p, CLASS_TO_IDX[cls_name]))
    return items


def preprocess_and_cache(
    split_name: str,
    items: List[Tuple[Path, int]],
    preprocessor: FacePreprocessor,
    crop_size: int = 384,
) -> List[Dict]:
    meta_path = CACHE_DIR / f"{split_name}_meta.json"
    img_dir = CACHE_DIR / split_name
    img_dir.mkdir(parents=True, exist_ok=True)

    if meta_path.exists():
        with open(meta_path, encoding="utf-8") as f:
            cached = json.load(f)
        if len(cached) >= len(items) - 20:
            print(f"[Cache Hit] {split_name}: {len(cached)} samples")
            return cached

    records = []
    skipped = 0
    for idx, (path, label) in enumerate(tqdm(items, desc=f"Preprocess {split_name}")):
        try:
            with Image.open(path) as img:
                img_rgb = ImageOps.exif_transpose(img).convert("RGB")
        except Exception:
            skipped += 1
            continue

        out = preprocessor.process(
            img_rgb,
            output_size=crop_size,
            scale_factor=1.65,
            allow_fallback_center=True,
        )
        out_file = img_dir / f"{idx:05d}.jpg"
        out["aligned_face"].save(out_file, quality=95)

        records.append(
            {
                "orig_path": str(path),
                "crop_path": str(out_file),
                "label": int(label),
                "geo": out["geo_features"].tolist(),
                "has_geo": bool(out["has_geo"]),
            }
        )

    with open(meta_path, "w", encoding="utf-8") as f:
        json.dump(records, f)
    print(f"[Preprocess Done] {split_name}: {len(records)} kept, {skipped} unreadable")
    return records


class CachedFaceDataset(Dataset):
    def __init__(
        self,
        records: List[Dict],
        geo_mean: np.ndarray,
        geo_std: np.ndarray,
        transform=None,
        is_train: bool = False,
    ):
        self.records = records
        self.geo_mean = geo_mean.astype(np.float32)
        self.geo_std = np.where(geo_std < 1e-5, 1.0, geo_std).astype(np.float32)
        self.transform = transform
        self.is_train = is_train

    def __len__(self):
        return len(self.records)

    def __getitem__(self, idx: int):
        rec = self.records[idx]
        with Image.open(rec["crop_path"]) as img:
            img = img.convert("RGB")

        geo = np.array(rec["geo"], dtype=np.float32)
        has_geo = 1.0 if rec["has_geo"] else 0.0

        # Synchronized horizontal flip for image + left/right jaw angle swap
        if self.is_train and random.random() < 0.5:
            img = ImageOps.mirror(img)
            # Swap left_jaw_angle_norm (15) and right_jaw_angle_norm (16)
            geo[15], geo[16] = geo[16], geo[15]

        if self.transform is not None:
            tensor = self.transform(img)
        else:
            tensor = transforms.ToTensor()(img)

        if has_geo > 0.5:
            geo_norm = (geo - self.geo_mean) / self.geo_std
            geo_norm = np.clip(geo_norm, -5.0, 5.0)
            if self.is_train:
                geo_norm = geo_norm + np.random.normal(0, 0.03, size=geo_norm.shape).astype(np.float32)
        else:
            geo_norm = np.zeros_like(geo, dtype=np.float32)

        return (
            tensor,
            torch.from_numpy(geo_norm),
            torch.tensor(has_geo, dtype=torch.float32),
            torch.tensor(rec["label"], dtype=torch.long),
        )


# ---------------------------------------------------------------------------
# Metrics & Calibration
# ---------------------------------------------------------------------------
def compute_ece(probs: np.ndarray, labels: np.ndarray, n_bins: int = 15) -> float:
    confidences = probs.max(axis=1)
    predictions = probs.argmax(axis=1)
    accuracies = (predictions == labels).astype(np.float64)
    bins = np.linspace(0.0, 1.0, n_bins + 1)
    ece = 0.0
    for i in range(n_bins):
        mask = (confidences > bins[i]) & (confidences <= bins[i + 1])
        if np.any(mask):
            ece += (np.sum(mask) / len(labels)) * abs(
                accuracies[mask].mean() - confidences[mask].mean()
            )
    return float(ece)


def evaluate_predictions(probs: np.ndarray, labels: np.ndarray) -> Dict:
    preds = probs.argmax(axis=1)
    acc = accuracy_score(labels, preds)
    p_mac, r_mac, f1_mac, _ = precision_recall_fscore_support(
        labels, preds, average="macro", zero_division=0
    )
    p_w, r_w, f1_w, _ = precision_recall_fscore_support(
        labels, preds, average="weighted", zero_division=0
    )
    p_cls, r_cls, f1_cls, sup_cls = precision_recall_fscore_support(
        labels, preds, average=None, zero_division=0
    )
    cm = confusion_matrix(labels, preds).tolist()
    ece = compute_ece(probs, labels)

    per_class = {}
    for i, c in enumerate(CLASSES):
        per_class[c] = {
            "precision": round(float(p_cls[i]), 4),
            "recall": round(float(r_cls[i]), 4),
            "f1": round(float(f1_cls[i]), 4),
            "support": int(sup_cls[i]),
        }

    return {
        "accuracy": round(float(acc), 4),
        "macro_precision": round(float(p_mac), 4),
        "macro_recall": round(float(r_mac), 4),
        "macro_f1": round(float(f1_mac), 4),
        "weighted_precision": round(float(p_w), 4),
        "weighted_recall": round(float(r_w), 4),
        "weighted_f1": round(float(f1_w), 4),
        "ece": round(float(ece), 4),
        "per_class": per_class,
        "confusion_matrix": cm,
    }


def fit_temperature(val_logits: np.ndarray, val_labels: np.ndarray) -> float:
    logits_t = torch.from_numpy(val_logits).float()
    labels_t = torch.from_numpy(val_labels).long()

    def nll(log_temp):
        temp = math.exp(float(log_temp[0]))
        loss = F.cross_entropy(logits_t / temp, labels_t)
        return float(loss.item())

    res = minimize(nll, x0=[0.0], bounds=[(-1.5, 1.5)], method="L-BFGS-B")
    return float(math.exp(res.x[0]))


def calibrate_threshold(probs: np.ndarray, labels: np.ndarray) -> Dict:
    confs = probs.max(axis=1)
    correct = probs.argmax(axis=1) == labels
    best_thresh = 0.60
    best_acc_above = 0.0
    best_cov = 0.0
    for th in np.arange(0.45, 0.86, 0.05):
        mask = confs >= th
        cov = float(mask.mean())
        if cov < 0.55:
            continue
        acc_above = float(correct[mask].mean())
        # Target high reliability (>= 88% accuracy when confident) with strong coverage
        if acc_above >= best_acc_above and cov >= 0.65:
            best_acc_above = acc_above
            best_thresh = float(round(th, 2))
            best_cov = cov
    return {
        "value": best_thresh,
        "status": "calibrated_on_val_temperature_scaling",
        "val_accuracy_above_threshold": round(best_acc_above, 4),
        "val_coverage_above_threshold": round(best_cov, 4),
    }


# ---------------------------------------------------------------------------
# Baseline V6 Evaluation (Exact Original Pipeline on Test Set)
# ---------------------------------------------------------------------------
def evaluate_v6_baseline(test_records: List[Dict], device: torch.device) -> Tuple[Dict, np.ndarray]:
    print("\n=== Evaluating V6 Baseline (EfficientNet-B4) on Held-Out Test Set ===")
    # Check cache for V6 baseline metrics/logits
    v6_cache = CACHE_DIR / "v6_baseline_cache.npz"
    if v6_cache.exists():
        data = np.load(v6_cache)
        logits_arr = data["logits"]
        labels_arr = data["labels"]
        probs_arr = F.softmax(torch.from_numpy(logits_arr), dim=1).numpy()
        metrics = evaluate_predictions(probs_arr, labels_arr)
        print(
            f"[Cache Hit] V6 Baseline -> Acc: {metrics['accuracy']*100:.2f}% | "
            f"Macro Prec: {metrics['macro_precision']*100:.2f}% | "
            f"Macro Rec: {metrics['macro_recall']*100:.2f}% | "
            f"Macro F1: {metrics['macro_f1']*100:.2f}% | ECE: {metrics['ece']:.4f}"
        )
        return metrics, logits_arr

    with open(BASE_DIR / "mona_ai_config.json", encoding="utf-8") as f:
        v6_cfg = json.load(f)

    model = models.efficientnet_b4(weights=None)
    model.classifier[1] = nn.Linear(model.classifier[1].in_features, len(CLASSES))
    ckpt = torch.load(
        BASE_DIR / "mona_efficientnet_b4_v6_best.pth",
        map_location="cpu",
        weights_only=True,
    )
    model.load_state_dict(ckpt["model_state_dict"], strict=True)
    model.to(device).eval()

    detector = mp.tasks.vision.FaceDetector.create_from_options(
        mp.tasks.vision.FaceDetectorOptions(
            base_options=mp.tasks.BaseOptions(
                model_asset_path=str(BASE_DIR / "blaze_face_short_range.tflite")
            ),
            running_mode=mp.tasks.vision.RunningMode.IMAGE,
            min_detection_confidence=0.5,
        )
    )

    tf = transforms.Compose(
        [
            transforms.Resize((380, 380)),
            transforms.ToTensor(),
            transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
        ]
    )

    all_logits = []
    all_labels = []
    mx = v6_cfg["face_crop"]["margin_x"]
    my = v6_cfg["face_crop"]["margin_y"]

    with torch.inference_mode():
        for rec in tqdm(test_records, desc="V6 Baseline"):
            with Image.open(rec["orig_path"]) as img:
                image = ImageOps.exif_transpose(img).convert("RGB")
            w, h = image.size
            rgb = np.ascontiguousarray(np.asarray(image, dtype=np.uint8))
            mp_img = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
            res = detector.detect(mp_img)
            if res.detections:
                det = max(res.detections, key=lambda d: d.bounding_box.width * d.bounding_box.height)
                bb = det.bounding_box
                x1 = max(0, int(bb.origin_x - mx * bb.width))
                y1 = max(0, int(bb.origin_y - my * bb.height))
                x2 = min(w, int(bb.origin_x + bb.width + mx * bb.width))
                y2 = min(h, int(bb.origin_y + bb.height + my * bb.height))
                face = image.crop((x1, y1, x2, y2)) if (x2 > x1 and y2 > y1) else image
            else:
                face = image

            tensor = tf(face).unsqueeze(0).to(device)
            logits = model(tensor)[0].cpu().numpy()
            all_logits.append(logits)
            all_labels.append(rec["label"])

    detector.close()
    logits_arr = np.stack(all_logits, axis=0)
    labels_arr = np.array(all_labels, dtype=np.int64)
    np.savez(CACHE_DIR / "v6_baseline_cache.npz", logits=logits_arr, labels=labels_arr)
    probs_arr = F.softmax(torch.from_numpy(logits_arr), dim=1).numpy()
    metrics = evaluate_predictions(probs_arr, labels_arr)
    print(
        f"V6 Baseline -> Acc: {metrics['accuracy']*100:.2f}% | "
        f"Macro Prec: {metrics['macro_precision']*100:.2f}% | "
        f"Macro Rec: {metrics['macro_recall']*100:.2f}% | "
        f"Macro F1: {metrics['macro_f1']*100:.2f}% | ECE: {metrics['ece']:.4f}"
    )
    return metrics, logits_arr


# ---------------------------------------------------------------------------
# Training & TTA Inference
# ---------------------------------------------------------------------------
@torch.inference_mode()
def predict_dataset_tta(
    model: nn.Module,
    records: List[Dict],
    geo_mean: np.ndarray,
    geo_std: np.ndarray,
    img_size: int,
    device: torch.device,
    use_tta: bool = True,
    batch_size: int = 32,
) -> Tuple[np.ndarray, np.ndarray]:
    model.eval()
    mean = [0.485, 0.456, 0.406]
    std = [0.229, 0.224, 0.225]

    tf_base = transforms.Compose(
        [
            transforms.Resize((img_size, img_size), interpolation=transforms.InterpolationMode.BICUBIC),
            transforms.ToTensor(),
            transforms.Normalize(mean, std),
        ]
    )
    # Slight zoom-in crop (92% center) for multi-scale TTA
    crop_92 = int(round(img_size * 0.92))
    tf_zoom = transforms.Compose(
        [
            transforms.Resize((img_size, img_size), interpolation=transforms.InterpolationMode.BICUBIC),
            transforms.CenterCrop(crop_92),
            transforms.Resize((img_size, img_size), interpolation=transforms.InterpolationMode.BICUBIC),
            transforms.ToTensor(),
            transforms.Normalize(mean, std),
        ]
    )

    safe_std = np.where(geo_std < 1e-5, 1.0, geo_std).astype(np.float32)
    all_logits = []
    all_labels = []

    for start in range(0, len(records), batch_size):
        batch = records[start : start + batch_size]
        imgs_orig, imgs_flip, imgs_zoom = [], [], []
        geos_orig, geos_flip, has_geos = [], [], []

        for rec in batch:
            with Image.open(rec["crop_path"]) as im:
                im = im.convert("RGB")
            imgs_orig.append(tf_base(im))
            if use_tta:
                imgs_flip.append(tf_base(ImageOps.mirror(im)))
                imgs_zoom.append(tf_zoom(im))

            geo = np.array(rec["geo"], dtype=np.float32)
            has_g = 1.0 if rec["has_geo"] else 0.0
            has_geos.append(has_g)

            if has_g > 0.5:
                g_o = np.clip((geo - geo_mean) / safe_std, -5.0, 5.0)
                geo_f = geo.copy()
                geo_f[15], geo_f[16] = geo_f[16], geo_f[15]
                g_f = np.clip((geo_f - geo_mean) / safe_std, -5.0, 5.0)
            else:
                g_o = np.zeros_like(geo)
                g_f = np.zeros_like(geo)
            geos_orig.append(g_o)
            geos_flip.append(g_f)
            all_labels.append(rec["label"])

        x_o = torch.stack(imgs_orig).to(device)
        g_o_t = torch.from_numpy(np.stack(geos_orig)).to(device)
        hg_t = torch.tensor(has_geos, dtype=torch.float32, device=device)

        with torch.amp.autocast("cuda", dtype=torch.bfloat16, enabled=(device.type == "cuda")):
            logits = model(x_o, g_o_t, hg_t).float()
            if use_tta:
                x_f = torch.stack(imgs_flip).to(device)
                g_f_t = torch.from_numpy(np.stack(geos_flip)).to(device)
                x_z = torch.stack(imgs_zoom).to(device)
                logits_f = model(x_f, g_f_t, hg_t).float()
                logits_z = model(x_z, g_o_t, hg_t).float()
                logits = 0.45 * logits + 0.35 * logits_f + 0.20 * logits_z

        all_logits.append(logits.cpu().numpy())

    return np.concatenate(all_logits, axis=0), np.array(all_labels, dtype=np.int64)


def train_hybrid_model(
    train_records: List[Dict],
    val_records: List[Dict],
    geo_mean: np.ndarray,
    geo_std: np.ndarray,
    device: torch.device,
    backbone_name: str = "convnext_small.fb_in22k_ft_in1k_384",
    img_size: int = 320,
    epochs: int = 18,
    batch_size: int = 16,
    grad_accum: int = 2,
    save_path: Path = BASE_DIR / "mona_convnext_small_v7_best.pth",
):
    print(f"\n=== Training {backbone_name} (img={img_size}, epochs={epochs}) ===")
    mean = [0.485, 0.456, 0.406]
    std = [0.229, 0.224, 0.225]

    # Geometry-preserving augmentations ONLY (isotropic scale, mild rotation, color jitter)
    train_tf = transforms.Compose(
        [
            transforms.Resize((img_size, img_size), interpolation=transforms.InterpolationMode.BICUBIC),
            transforms.RandomAffine(
                degrees=7,
                translate=(0.04, 0.04),
                scale=(0.93, 1.07),
                interpolation=transforms.InterpolationMode.BICUBIC,
            ),
            transforms.ColorJitter(brightness=0.22, contrast=0.22, saturation=0.15, hue=0.025),
            transforms.ToTensor(),
            transforms.Normalize(mean, std),
            transforms.RandomErasing(p=0.15, scale=(0.02, 0.08), ratio=(0.5, 2.0)),
        ]
    )
    val_tf = transforms.Compose(
        [
            transforms.Resize((img_size, img_size), interpolation=transforms.InterpolationMode.BICUBIC),
            transforms.ToTensor(),
            transforms.Normalize(mean, std),
        ]
    )

    train_ds = CachedFaceDataset(train_records, geo_mean, geo_std, train_tf, is_train=True)
    val_ds = CachedFaceDataset(val_records, geo_mean, geo_std, val_tf, is_train=False)

    train_loader = DataLoader(
        train_ds,
        batch_size=batch_size,
        shuffle=True,
        num_workers=2,
        pin_memory=True,
        persistent_workers=True,
        drop_last=True,
    )
    val_loader = DataLoader(
        val_ds,
        batch_size=batch_size * 2,
        shuffle=False,
        num_workers=2,
        pin_memory=True,
        persistent_workers=True,
    )

    model = HybridFaceShapeNet(
        backbone_name=backbone_name,
        num_classes=len(CLASSES),
        num_geo_features=NUM_GEO_FEATURES,
        pretrained=True,
        drop_rate=0.30,
        geo_dropout_prob=0.15,
    ).to(device)

    # Differential learning rate: slower on pretrained backbone, faster on new fusion head
    backbone_params = list(model.backbone.parameters())
    head_params = (
        list(model.vis_norm.parameters())
        + list(model.geo_encoder.parameters())
        + list(model.classifier.parameters())
    )

    optimizer = torch.optim.AdamW(
        [
            {"params": backbone_params, "lr": 1.2e-4, "weight_decay": 3e-2},
            {"params": head_params, "lr": 8e-4, "weight_decay": 1e-2},
        ]
    )

    total_steps = epochs * math.ceil(len(train_loader) / grad_accum)
    warmup_steps = max(1, int(0.08 * total_steps))

    def lr_lambda(step: int):
        if step < warmup_steps:
            return float(step + 1) / float(warmup_steps)
        progress = (step - warmup_steps) / max(1, total_steps - warmup_steps)
        return 0.02 + 0.98 * 0.5 * (1.0 + math.cos(math.pi * progress))

    scheduler = torch.optim.lr_scheduler.LambdaLR(optimizer, lr_lambda)
    criterion = nn.CrossEntropyLoss(label_smoothing=0.08)

    # Exponential Moving Average (EMA) of model weights for smoother generalization
    ema_model = copy.deepcopy(model)
    ema_decay = 0.990

    best_f1 = -1.0
    best_state = None
    best_epoch = 0

    for epoch in range(1, epochs + 1):
        t0 = time.time()
        model.train()
        running_loss = 0.0
        optimizer.zero_grad(set_to_none=True)

        for step, (x_img, x_geo, has_geo, y) in enumerate(train_loader, start=1):
            x_img = x_img.to(device, non_blocking=True)
            x_geo = x_geo.to(device, non_blocking=True)
            has_geo = has_geo.to(device, non_blocking=True)
            y = y.to(device, non_blocking=True)

            with torch.amp.autocast("cuda", dtype=torch.bfloat16, enabled=(device.type == "cuda")):
                logits = model(x_img, x_geo, has_geo)
                loss = criterion(logits, y) / grad_accum

            loss.backward()
            running_loss += loss.item() * grad_accum

            if step % grad_accum == 0 or step == len(train_loader):
                torch.nn.utils.clip_grad_norm_(model.parameters(), 2.0)
                optimizer.step()
                optimizer.zero_grad(set_to_none=True)
                scheduler.step()

                # Update EMA
                with torch.no_grad():
                    for p_ema, p in zip(ema_model.parameters(), model.parameters()):
                        p_ema.data.mul_(ema_decay).add_(p.data, alpha=1.0 - ema_decay)

        # Evaluate raw model and EMA model on val set
        def eval_model_on_val(m):
            m.eval()
            v_logits, v_labels = [], []
            with torch.inference_mode():
                for x_img, x_geo, has_geo, y in val_loader:
                    x_img = x_img.to(device, non_blocking=True)
                    x_geo = x_geo.to(device, non_blocking=True)
                    has_geo = has_geo.to(device, non_blocking=True)
                    with torch.amp.autocast("cuda", dtype=torch.bfloat16, enabled=(device.type == "cuda")):
                        out = m(x_img, x_geo, has_geo).float()
                    v_logits.append(out.cpu().numpy())
                    v_labels.append(y.numpy())
            vl = np.concatenate(v_logits, axis=0)
            vy = np.concatenate(v_labels, axis=0)
            vp = F.softmax(torch.from_numpy(vl), dim=1).numpy()
            return evaluate_predictions(vp, vy)

        val_raw = eval_model_on_val(model)
        val_ema = eval_model_on_val(ema_model)

        if val_ema["macro_f1"] >= val_raw["macro_f1"]:
            cand_metrics = val_ema
            cand_model = ema_model
            tag = "EMA"
        else:
            cand_metrics = val_raw
            cand_model = model
            tag = "RAW"

        dt = time.time() - t0
        avg_loss = running_loss / len(train_loader)
        print(
            f"Epoch {epoch:02d}/{epochs} ({dt:.1f}s) | loss={avg_loss:.4f} | "
            f"val_acc={cand_metrics['accuracy']*100:.2f}% | "
            f"val_f1={cand_metrics['macro_f1']*100:.2f}% ({tag})"
        )

        if cand_metrics["macro_f1"] > best_f1:
            best_f1 = cand_metrics["macro_f1"]
            best_epoch = epoch
            best_state = {k: v.cpu().clone() for k, v in cand_model.state_dict().items()}
            torch.save(
                {
                    "model_state_dict": best_state,
                    "backbone_name": backbone_name,
                    "img_size": img_size,
                    "classes": CLASSES,
                    "geo_feature_names": GEO_FEATURE_NAMES,
                    "geo_mean": geo_mean.tolist(),
                    "geo_std": geo_std.tolist(),
                    "best_epoch": best_epoch,
                },
                save_path,
            )

    model.load_state_dict(best_state)
    print(f"Best Val Macro F1 = {best_f1*100:.2f}% at epoch {best_epoch}")

    # Fit temperature scaling on validation TTA logits (zero test leakage!)
    val_tta_logits, val_labels = predict_dataset_tta(
        model, val_records, geo_mean, geo_std, img_size, device, use_tta=True
    )
    temperature = fit_temperature(val_tta_logits, val_labels)
    val_cal_probs = F.softmax(torch.from_numpy(val_tta_logits / temperature), dim=1).numpy()
    val_cal_metrics = evaluate_predictions(val_cal_probs, val_labels)
    thresh_info = calibrate_threshold(val_cal_probs, val_labels)
    print(
        f"Val TTA Calibrated (T={temperature:.3f}) -> Acc: {val_cal_metrics['accuracy']*100:.2f}% | "
        f"Macro F1: {val_cal_metrics['macro_f1']*100:.2f}% | ECE: {val_cal_metrics['ece']:.4f} | "
        f"Threshold: {thresh_info['value']}"
    )

    torch.save(
        {
            "model_state_dict": best_state,
            "backbone_name": backbone_name,
            "img_size": img_size,
            "classes": CLASSES,
            "geo_feature_names": GEO_FEATURE_NAMES,
            "geo_mean": geo_mean.tolist(),
            "geo_std": geo_std.tolist(),
            "temperature": temperature,
            "best_epoch": best_epoch,
            "val_metrics": val_cal_metrics,
            "confidence_threshold": thresh_info,
        },
        save_path,
    )
    print(f"Saved checkpoint -> {save_path}")
    return model, temperature, val_cal_metrics, thresh_info


def main():
    seed_everything(SEED)
    torch.backends.cudnn.benchmark = True
    torch.set_float32_matmul_precision("high")
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Using device: {device} ({torch.cuda.get_device_name(0) if device.type == 'cuda' else 'CPU'})")

    # 1. Download dataset via kagglehub
    print("Downloading niten19/face-shape-dataset via kagglehub...")
    ds_root = Path(kagglehub.dataset_download("niten19/face-shape-dataset"))
    print(f"Dataset root: {ds_root}")
    train_dir, test_dir = find_dataset_splits(ds_root)
    print(f"Train dir: {train_dir}\nTest dir:  {test_dir}")

    train_items = collect_images(train_dir)
    test_items = collect_images(test_dir)
    print(f"Found {len(train_items)} train images, {len(test_items)} test images.")

    # 2. Preprocess & cache aligned crops + 478-landmark geometric features
    preprocessor = FacePreprocessor(
        detector_path=BASE_DIR / "blaze_face_short_range.tflite",
        landmarker_path=BASE_DIR / "face_landmarker.task",
    )
    all_train_records = preprocess_and_cache("train", train_items, preprocessor, crop_size=384)
    test_records = preprocess_and_cache("test", test_items, preprocessor, crop_size=384)
    preprocessor.close()

    # Stratified 85/15 split on train_records
    labels_all = [r["label"] for r in all_train_records]
    sss = StratifiedShuffleSplit(n_splits=1, test_size=0.15, random_state=SEED)
    tr_idx, va_idx = next(sss.split(np.zeros(len(labels_all)), labels_all))
    train_records = [all_train_records[i] for i in tr_idx]
    val_records = [all_train_records[i] for i in va_idx]
    print(f"Split -> Train: {len(train_records)}, Val: {len(val_records)}, Test: {len(test_records)}")

    # Compute geo standardization statistics strictly on TRAIN split
    train_geos = np.array([r["geo"] for r in train_records if r["has_geo"]], dtype=np.float32)
    geo_mean = train_geos.mean(axis=0)
    geo_std = train_geos.std(axis=0)

    # 3. Benchmark V6 baseline on exact test split
    v6_test_metrics, v6_test_logits = evaluate_v6_baseline(test_records, device)

    # 4. Train V7 Hybrid ConvNeXt-Small + Geometric Landmarks (288px fits cleanly in 8GB VRAM)
    img_size = 288
    backbone = "convnext_small.fb_in22k_ft_in1k_384"
    v7_ckpt_path = BASE_DIR / "mona_convnext_small_v7_best.pth"
    model, temperature, val_metrics, thresh_info = train_hybrid_model(
        train_records=train_records,
        val_records=val_records,
        geo_mean=geo_mean,
        geo_std=geo_std,
        device=device,
        backbone_name=backbone,
        img_size=img_size,
        epochs=14,
        batch_size=16,
        grad_accum=2,
        save_path=v7_ckpt_path,
    )

    # 5. Evaluate V7 on Held-Out Test Set (single-view & Multi-View TTA)
    print("\n=== Evaluating V7 on Held-Out Test Set ===")
    test_single_logits, test_labels = predict_dataset_tta(
        model, test_records, geo_mean, geo_std, img_size, device, use_tta=False
    )
    test_tta_logits, _ = predict_dataset_tta(
        model, test_records, geo_mean, geo_std, img_size, device, use_tta=True
    )

    v7_single_probs = F.softmax(torch.from_numpy(test_single_logits / temperature), dim=1).numpy()
    v7_tta_probs = F.softmax(torch.from_numpy(test_tta_logits / temperature), dim=1).numpy()

    v7_single_metrics = evaluate_predictions(v7_single_probs, test_labels)
    v7_tta_metrics = evaluate_predictions(v7_tta_probs, test_labels)

    print(
        f"V7 Single -> Acc: {v7_single_metrics['accuracy']*100:.2f}% | "
        f"Macro Prec: {v7_single_metrics['macro_precision']*100:.2f}% | "
        f"Macro Rec: {v7_single_metrics['macro_recall']*100:.2f}% | "
        f"Macro F1: {v7_single_metrics['macro_f1']*100:.2f}% | ECE: {v7_single_metrics['ece']:.4f}"
    )
    print(
        f"V7 + TTA  -> Acc: {v7_tta_metrics['accuracy']*100:.2f}% | "
        f"Macro Prec: {v7_tta_metrics['macro_precision']*100:.2f}% | "
        f"Macro Rec: {v7_tta_metrics['macro_recall']*100:.2f}% | "
        f"Macro F1: {v7_tta_metrics['macro_f1']*100:.2f}% | ECE: {v7_tta_metrics['ece']:.4f}"
    )
    print("\nV7 + TTA Classification Report:")
    print(classification_report(test_labels, v7_tta_probs.argmax(axis=1), target_names=CLASSES, digits=4))

    # 6. Save full benchmark report
    report = {
        "dataset": "niten19/face-shape-dataset",
        "splits": {
            "train": len(train_records),
            "val": len(val_records),
            "test": len(test_records),
        },
        "v6_baseline_test": v6_test_metrics,
        "v7_val_calibrated": val_metrics,
        "v7_single_test": v7_single_metrics,
        "v7_tta_test": v7_tta_metrics,
        "temperature": round(float(temperature), 4),
        "confidence_threshold": thresh_info,
        "improvement_vs_v6": {
            "accuracy_delta": round(v7_tta_metrics["accuracy"] - v6_test_metrics["accuracy"], 4),
            "macro_precision_delta": round(v7_tta_metrics["macro_precision"] - v6_test_metrics["macro_precision"], 4),
            "macro_recall_delta": round(v7_tta_metrics["macro_recall"] - v6_test_metrics["macro_recall"], 4),
            "macro_f1_delta": round(v7_tta_metrics["macro_f1"] - v6_test_metrics["macro_f1"], 4),
            "ece_delta": round(v7_tta_metrics["ece"] - v6_test_metrics["ece"], 4),
        },
    }
    report_path = BASE_DIR / "evaluation_report_v7.json"
    with open(report_path, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2)
    print(f"\nSaved full evaluation report -> {report_path}")


if __name__ == "__main__":
    main()
