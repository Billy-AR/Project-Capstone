
import io
import json
import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F
import mediapipe as mp

from pathlib import Path
from PIL import Image, ImageOps
from torchvision import models, transforms


class MonaSalonPredictor:
    def __init__(self, model_dir, device="cpu"):
        self.model_dir = Path(model_dir)

        with open(
            self.model_dir / "mona_ai_config.json",
            encoding="utf-8"
        ) as f:
            self.config = json.load(f)

        self.classes = self.config["classes"]
        self.device = torch.device(device)

        # Load EfficientNet-B4 V6
        self.model = models.efficientnet_b4(weights=None)
        in_features = self.model.classifier[1].in_features

        self.model.classifier[1] = nn.Linear(
            in_features,
            len(self.classes)
        )

        checkpoint = torch.load(
            self.model_dir / self.config["model_file"],
            map_location="cpu",
            weights_only=True
        )

        self.model.load_state_dict(
            checkpoint["model_state_dict"],
            strict=True
        )

        self.model.to(self.device)
        self.model.eval()

        self.transform = transforms.Compose([
            transforms.Resize(
                tuple(self.config["input_size"])
            ),
            transforms.ToTensor(),
            transforms.Normalize(
                mean=self.config["normalization"]["mean"],
                std=self.config["normalization"]["std"]
            )
        ])

        # MediaPipe Face Detector
        self.detector = (
            mp.tasks.vision.FaceDetector.create_from_options(
                mp.tasks.vision.FaceDetectorOptions(
                    base_options=mp.tasks.BaseOptions(
                        model_asset_path=str(
                            self.model_dir /
                            self.config["detector_file"]
                        )
                    ),
                    running_mode=(
                        mp.tasks.vision.RunningMode.IMAGE
                    ),
                    min_detection_confidence=0.5
                )
            )
        )

    def predict(self, image_bytes):
        # Decode gambar
        with Image.open(io.BytesIO(image_bytes)) as img:
            image = ImageOps.exif_transpose(img).convert("RGB")

        width, height = image.size

        rgb = np.ascontiguousarray(
            np.asarray(image, dtype=np.uint8)
        )

        mp_image = mp.Image(
            image_format=mp.ImageFormat.SRGB,
            data=rgb
        )

        result = self.detector.detect(mp_image)

        if not result.detections:
            return {
                "success": False,
                "error": "Wajah tidak terdeteksi"
            }

        # Pilih bounding box terbesar
        detection = max(
            result.detections,
            key=lambda d: (
                d.bounding_box.width *
                d.bounding_box.height
            )
        )

        bbox = detection.bounding_box

        x, y = bbox.origin_x, bbox.origin_y
        bw, bh = bbox.width, bbox.height

        margin_x = self.config["face_crop"]["margin_x"]
        margin_y = self.config["face_crop"]["margin_y"]

        x1 = max(0, int(x - margin_x * bw))
        y1 = max(0, int(y - margin_y * bh))
        x2 = min(width, int(x + bw + margin_x * bw))
        y2 = min(height, int(y + bh + margin_y * bh))

        if x2 <= x1 or y2 <= y1:
            return {
                "success": False,
                "error": "Area wajah tidak valid"
            }

        face = image.crop((x1, y1, x2, y2))
        face = face.resize(
            tuple(self.config["input_size"]),
            Image.Resampling.BILINEAR
        )

        tensor = self.transform(face)
        tensor = tensor.unsqueeze(0).to(self.device)

        with torch.inference_mode():
            logits = self.model(tensor)
            scores = F.softmax(logits, dim=1)[0]

        probabilities = scores.cpu().numpy()

        ranking = sorted(
            [
                {
                    "label": label,
                    "score": round(float(score), 6)
                }
                for label, score in zip(
                    self.classes,
                    probabilities
                )
            ],
            key=lambda item: item["score"],
            reverse=True
        )

        top = ranking[0]

        return {
            "success": True,
            "face_shape": top["label"],
            "confidence": top["score"],
            "predictions": ranking,
            "needs_review": (
                top["score"] <
                self.config["confidence_threshold"]["value"]
            ),
            "faces_detected": len(result.detections)
        }

    def close(self):
        self.detector.close()
