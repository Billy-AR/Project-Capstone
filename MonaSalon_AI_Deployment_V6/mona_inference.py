import io
import json
from pathlib import Path
from typing import Dict, Any, List

import numpy as np
import timm
import torch
import torch.nn as nn
import torch.nn.functional as F
from PIL import Image, ImageOps
from torchvision import transforms

from face_geometry import FacePreprocessor, NUM_GEO_FEATURES


class HybridFaceShapeNet(nn.Module):
    """
    Mona Salon V7 Hybrid Architecture:
    ConvNeXt-Small (IN22k->IN1k) visual encoder fused with 24 scale-invariant
    MediaPipe 478-landmark anthropometric geometric ratios.
    """

    def __init__(
        self,
        backbone_name: str = "convnext_small.fb_in22k_ft_in1k_384",
        num_classes: int = 5,
        num_geo_features: int = NUM_GEO_FEATURES,
        drop_rate: float = 0.30,
    ):
        super().__init__()
        self.backbone_name = backbone_name
        self.backbone = timm.create_model(
            backbone_name,
            pretrained=False,
            num_classes=0,
            drop_path_rate=0.0,
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
        eff_geo = x_geo * has_geo.unsqueeze(1)
        geo_in = torch.cat([eff_geo, has_geo.unsqueeze(1)], dim=1)
        geo_feat = self.geo_encoder(geo_in)
        fused = torch.cat([vis_feat, geo_feat], dim=1)
        return self.classifier(fused)


class MonaSalonPredictor:
    def __init__(self, model_dir, device="auto"):
        self.model_dir = Path(model_dir)

        with open(self.model_dir / "mona_ai_config.json", encoding="utf-8") as f:
            self.config = json.load(f)

        self.classes = self.config["classes"]
        if device == "auto":
            self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        else:
            self.device = torch.device(device)

        checkpoint = torch.load(
            self.model_dir / self.config["model_file"],
            map_location="cpu",
            weights_only=False,
        )

        backbone_name = checkpoint.get(
            "backbone_name",
            self.config.get("backbone_name", "convnext_small.fb_in22k_ft_in1k_384"),
        )
        self.img_size = int(checkpoint.get("img_size", self.config["input_size"][0]))
        self.temperature = float(
            checkpoint.get("temperature", self.config.get("temperature", 1.0))
        )
        self.geo_mean = np.array(checkpoint["geo_mean"], dtype=np.float32)
        geo_std = np.array(checkpoint["geo_std"], dtype=np.float32)
        self.geo_std = np.where(geo_std < 1e-5, 1.0, geo_std).astype(np.float32)

        self.model = HybridFaceShapeNet(
            backbone_name=backbone_name,
            num_classes=len(self.classes),
            num_geo_features=len(self.geo_mean),
        )
        self.model.load_state_dict(checkpoint["model_state_dict"], strict=True)
        self.model.to(self.device)
        self.model.eval()

        mean = self.config["normalization"]["mean"]
        std = self.config["normalization"]["std"]
        self.transform_base = transforms.Compose(
            [
                transforms.Resize(
                    (self.img_size, self.img_size),
                    interpolation=transforms.InterpolationMode.BICUBIC,
                ),
                transforms.ToTensor(),
                transforms.Normalize(mean=mean, std=std),
            ]
        )
        crop_92 = int(round(self.img_size * 0.92))
        self.transform_zoom = transforms.Compose(
            [
                transforms.Resize(
                    (self.img_size, self.img_size),
                    interpolation=transforms.InterpolationMode.BICUBIC,
                ),
                transforms.CenterCrop(crop_92),
                transforms.Resize(
                    (self.img_size, self.img_size),
                    interpolation=transforms.InterpolationMode.BICUBIC,
                ),
                transforms.ToTensor(),
                transforms.Normalize(mean=mean, std=std),
            ]
        )

        self.use_tta = bool(self.config.get("tta", {}).get("enabled", True))
        self.tta_weights = self.config.get("tta", {}).get("weights", [0.45, 0.35, 0.20])

        self.preprocessor = FacePreprocessor(
            detector_path=self.model_dir / self.config["detector_file"],
            landmarker_path=self.model_dir / self.config["landmarker_file"],
            min_detection_confidence=0.45,
        )

    def _collect_quality_warnings(self, diag: Dict[str, Any]) -> List[str]:
        warnings: List[str] = []
        yaw = float(diag.get("yaw_asymmetry", 0.0))
        sharp = float(diag.get("sharpness", 999.0))
        face_px = int(diag.get("face_size_px", 999))

        if yaw > 0.32:
            warnings.append(
                "Wajah tampak agak menyamping. Foto menghadap lurus ke kamera memberikan hasil paling akurat."
            )
        if face_px < 70:
            warnings.append(
                "Ukuran wajah pada foto cukup kecil. Gunakan foto close-up agar kontur rahang terbaca optimal."
            )
        if sharp < 30.0:
            warnings.append(
                "Foto terlihat agak buram atau kurang cahaya. Pastikan pencahayaan cukup jelas."
            )
        return warnings

    def predict(self, image_bytes: bytes) -> Dict[str, Any]:
        with Image.open(io.BytesIO(image_bytes)) as img:
            image = ImageOps.exif_transpose(img).convert("RGB")

        prep = self.preprocessor.process(
            image,
            output_size=384,
            scale_factor=float(self.config["face_crop"].get("scale_factor", 1.65)),
            allow_fallback_center=False,
        )

        if not prep["success"]:
            return {
                "success": False,
                "error": prep.get("error", "Wajah tidak terdeteksi"),
            }

        face_img = prep["aligned_face"]
        geo_raw = prep["geo_features"]
        has_geo = 1.0 if prep["has_geo"] else 0.0

        if has_geo > 0.5:
            geo_orig = np.clip((geo_raw - self.geo_mean) / self.geo_std, -5.0, 5.0)
            geo_flip_raw = geo_raw.copy()
            geo_flip_raw[15], geo_flip_raw[16] = geo_flip_raw[16], geo_flip_raw[15]
            geo_flip = np.clip((geo_flip_raw - self.geo_mean) / self.geo_std, -5.0, 5.0)
        else:
            geo_orig = np.zeros_like(geo_raw, dtype=np.float32)
            geo_flip = np.zeros_like(geo_raw, dtype=np.float32)

        x_orig = self.transform_base(face_img)

        if self.use_tta:
            x_flip = self.transform_base(ImageOps.mirror(face_img))
            x_zoom = self.transform_zoom(face_img)
            x_batch = torch.stack([x_orig, x_flip, x_zoom], dim=0).to(self.device)
            g_batch = torch.from_numpy(
                np.stack([geo_orig, geo_flip, geo_orig], axis=0)
            ).to(self.device)
            hg_batch = torch.tensor(
                [has_geo, has_geo, has_geo], dtype=torch.float32, device=self.device
            )
        else:
            x_batch = x_orig.unsqueeze(0).to(self.device)
            g_batch = torch.from_numpy(geo_orig).unsqueeze(0).to(self.device)
            hg_batch = torch.tensor([has_geo], dtype=torch.float32, device=self.device)

        with torch.inference_mode():
            logits_batch = self.model(x_batch, g_batch, hg_batch).float()
            if self.use_tta:
                w0, w1, w2 = self.tta_weights
                logits = w0 * logits_batch[0] + w1 * logits_batch[1] + w2 * logits_batch[2]
            else:
                logits = logits_batch[0]
            scores = F.softmax(logits / self.temperature, dim=0)

        probabilities = scores.cpu().numpy()

        ranking = sorted(
            [
                {"label": label, "score": round(float(score), 6)}
                for label, score in zip(self.classes, probabilities)
            ],
            key=lambda item: item["score"],
            reverse=True,
        )

        top = ranking[0]
        second = ranking[1] if len(ranking) > 1 else {"score": 0.0}
        threshold = float(self.config["confidence_threshold"]["value"])
        diag = prep.get("diagnostics", {})
        quality_warnings = self._collect_quality_warnings(diag)

        return {
            "success": True,
            "face_shape": top["label"],
            "confidence": top["score"],
            "predictions": ranking,
            "needs_review": (top["score"] < threshold) or (len(quality_warnings) > 0),
            "faces_detected": int(prep.get("faces_detected", 1)),
            "model_version": self.config.get("model_name", "ConvNeXt-Small + GeoLandmarks V7"),
            "calibrated": True,
            "top2_margin": round(float(top["score"] - second["score"]), 6),
            "quality_warnings": quality_warnings,
            "geometry_summary": {
                "height_to_width": diag.get("height_to_width"),
                "jaw_to_cheek": diag.get("jaw_to_cheek"),
                "forehead_to_cheek": diag.get("forehead_to_cheek"),
                "roll_deg": diag.get("roll_deg"),
            },
        }

    def close(self):
        self.preprocessor.close()
