import math
from pathlib import Path
from typing import Optional, Tuple, Dict, Any

import numpy as np
import mediapipe as mp
from PIL import Image, ImageOps


GEO_FEATURE_NAMES = [
    "height_to_cheek_ratio",
    "brow_height_to_cheek_ratio",
    "forehead_to_cheek_ratio",
    "upper_forehead_to_cheek_ratio",
    "temple_to_cheek_ratio",
    "jaw_to_cheek_ratio",
    "lower_jaw_to_cheek_ratio",
    "chin_to_cheek_ratio",
    "jaw_to_forehead_ratio",
    "chin_to_jaw_ratio",
    "chin_to_forehead_ratio",
    "cheek_width_to_height",
    "upper_third_ratio",
    "mid_third_ratio",
    "lower_third_ratio",
    "left_jaw_angle_norm",
    "right_jaw_angle_norm",
    "mean_jaw_angle_norm",
    "chin_angle_norm",
    "forehead_curvature_ratio",
    "jaw_taper_slope",
    "cheek_taper_slope",
    "width_std_ratio",
    "face_symmetry_ratio",
]

NUM_GEO_FEATURES = len(GEO_FEATURE_NAMES)


def _dist2d(pts: np.ndarray, i: int, j: int) -> float:
    return float(np.linalg.norm(pts[i] - pts[j]))


def _angle_deg(a: np.ndarray, b: np.ndarray, c: np.ndarray) -> float:
    """Angle ABC in degrees (at vertex b)."""
    ba = a - b
    bc = c - b
    na = np.linalg.norm(ba)
    nc = np.linalg.norm(bc)
    if na < 1e-6 or nc < 1e-6:
        return 120.0
    cos_val = float(np.clip(np.dot(ba, bc) / (na * nc), -1.0, 1.0))
    return math.degrees(math.acos(cos_val))


def extract_geometric_features(
    landmarks_xy: np.ndarray,
) -> Tuple[np.ndarray, Dict[str, float]]:
    """
    Extract 24 scale-invariant anthropometric features from 468/478 MediaPipe
    FaceLandmarker (x, y) coordinates (in pixel space).
    Also returns pose/quality diagnostics (yaw_asymmetry, roll_deg).
    """
    pts = landmarks_xy[:, :2].astype(np.float64)

    # Key anatomical landmark indices (MediaPipe 468 Face Mesh)
    # Vertical axis
    # 10: top of forehead, 9: glabella/brow center, 168: nose bridge,
    # 2: subnasale (nose base), 152: menton (chin bottom)
    face_height = max(_dist2d(pts, 10, 152), 1e-5)
    brow_to_chin = max(_dist2d(pts, 9, 152), 1e-5)
    upper_third = _dist2d(pts, 10, 9)
    mid_third = _dist2d(pts, 9, 2)
    lower_third = _dist2d(pts, 2, 152)

    # Horizontal widths at key levels
    # Upper forehead: 67 - 297, Forehead: 54 - 284, Temple: 127 - 356
    # Cheekbone (bizygomatic): 234 - 454 (and 93 - 323)
    # Jaw (bigonial): 172 - 397 (and 58 - 288, lower jaw: 136 - 365)
    # Chin width: 149 - 378 (and 148 - 377)
    upper_forehead_w = _dist2d(pts, 67, 297)
    forehead_w = 0.5 * (_dist2d(pts, 54, 284) + _dist2d(pts, 103, 332))
    temple_w = _dist2d(pts, 127, 356)
    cheek_w = max(0.5 * (_dist2d(pts, 234, 454) + _dist2d(pts, 93, 323)), 1e-5)
    jaw_w = 0.5 * (_dist2d(pts, 172, 397) + _dist2d(pts, 58, 288))
    lower_jaw_w = _dist2d(pts, 136, 365)
    chin_w = 0.5 * (_dist2d(pts, 149, 378) + _dist2d(pts, 148, 377))

    # Jaw & chin angles
    left_jaw_angle = _angle_deg(pts[234], pts[172], pts[152])
    right_jaw_angle = _angle_deg(pts[454], pts[397], pts[152])
    mean_jaw_angle = 0.5 * (left_jaw_angle + right_jaw_angle)
    chin_angle = _angle_deg(pts[136], pts[152], pts[365])

    # Forehead curvature: height of forehead apex above temple line / cheek_w
    forehead_mid_y = 0.5 * (pts[54, 1] + pts[284, 1])
    forehead_curve = (forehead_mid_y - pts[10, 1]) / face_height

    # Taper slopes
    jaw_taper_slope = (cheek_w - jaw_w) / face_height
    cheek_taper_slope = (jaw_w - chin_w) / face_height

    # Width variation across vertical profile (small for Square/Oblong, large for Heart/Oval)
    widths = np.array([forehead_w, cheek_w, jaw_w, chin_w], dtype=np.float64) / cheek_w
    width_std = float(np.std(widths))

    # Pose diagnostics: yaw asymmetry using nose tip (1) vs left/right cheeks (234, 454)
    d_left = _dist2d(pts, 1, 234)
    d_right = _dist2d(pts, 1, 454)
    yaw_asym = abs(d_left - d_right) / max(d_left + d_right, 1e-5)
    symmetry_ratio = min(d_left, d_right) / max(d_left, d_right, 1e-5)

    # Eye roll angle (outer eye corners 33 & 263)
    eye_vec = pts[263] - pts[33]
    roll_deg = math.degrees(math.atan2(float(eye_vec[1]), float(eye_vec[0])))

    feats = np.array(
        [
            face_height / cheek_w,
            brow_to_chin / cheek_w,
            forehead_w / cheek_w,
            upper_forehead_w / cheek_w,
            temple_w / cheek_w,
            jaw_w / cheek_w,
            lower_jaw_w / cheek_w,
            chin_w / cheek_w,
            jaw_w / max(forehead_w, 1e-5),
            chin_w / max(jaw_w, 1e-5),
            chin_w / max(forehead_w, 1e-5),
            cheek_w / face_height,
            upper_third / face_height,
            mid_third / face_height,
            lower_third / face_height,
            left_jaw_angle / 180.0,
            right_jaw_angle / 180.0,
            mean_jaw_angle / 180.0,
            chin_angle / 180.0,
            forehead_curve,
            jaw_taper_slope,
            cheek_taper_slope,
            width_std,
            symmetry_ratio,
        ],
        dtype=np.float32,
    )

    # Guard against NaN/Inf
    feats = np.nan_to_num(feats, nan=0.0, posinf=0.0, neginf=0.0)
    diagnostics = {
        "yaw_asymmetry": round(float(yaw_asym), 4),
        "roll_deg": round(float(roll_deg), 2),
        "height_to_width": round(float(face_height / cheek_w), 4),
        "jaw_to_cheek": round(float(jaw_w / cheek_w), 4),
        "forehead_to_cheek": round(float(forehead_w / cheek_w), 4),
    }
    return feats, diagnostics


def square_padded_crop(
    image: Image.Image,
    cx: float,
    cy: float,
    box_size: float,
    output_size: int = 384,
) -> Image.Image:
    """
    Crop a square region centered at (cx, cy) with side length `box_size`,
    padding with edge-border pixels whenever the square extends beyond image
    boundaries so the face aspect ratio is NEVER distorted.
    """
    w, h = image.size
    half = box_size / 2.0
    x1 = int(round(cx - half))
    y1 = int(round(cy - half))
    x2 = int(round(cx + half))
    y2 = int(round(cy + half))

    pad_l = max(0, -x1)
    pad_t = max(0, -y1)
    pad_r = max(0, x2 - w)
    pad_b = max(0, y2 - h)

    if pad_l or pad_t or pad_r or pad_b:
        arr = np.asarray(image)
        arr_pad = np.pad(
            arr,
            ((pad_t, pad_b), (pad_l, pad_r), (0, 0)),
            mode="edge",
        )
        crop = arr_pad[
            y1 + pad_t : y2 + pad_t,
            x1 + pad_l : x2 + pad_l,
        ]
        face_img = Image.fromarray(crop)
    else:
        face_img = image.crop((x1, y1, x2, y2))

    return face_img.resize((output_size, output_size), Image.Resampling.BICUBIC)


def compute_sharpness(image: Image.Image) -> float:
    """Simple Laplacian variance sharpness proxy on grayscale 128x128 face."""
    gray = np.asarray(image.convert("L").resize((128, 128)), dtype=np.float32)
    lap = (
        -4.0 * gray[1:-1, 1:-1]
        + gray[:-2, 1:-1]
        + gray[2:, 1:-1]
        + gray[1:-1, :-2]
        + gray[1:-1, 2:]
    )
    return float(np.var(lap))


class FacePreprocessor:
    """
    Unified face detector + roll aligner + aspect-ratio-safe square cropper +
    MediaPipe 478-landmark geometric feature extractor.
    """

    def __init__(
        self,
        detector_path: Path,
        landmarker_path: Path,
        min_detection_confidence: float = 0.45,
    ):
        self.detector = mp.tasks.vision.FaceDetector.create_from_options(
            mp.tasks.vision.FaceDetectorOptions(
                base_options=mp.tasks.BaseOptions(
                    model_asset_path=str(detector_path)
                ),
                running_mode=mp.tasks.vision.RunningMode.IMAGE,
                min_detection_confidence=min_detection_confidence,
            )
        )
        self.landmarker = mp.tasks.vision.FaceLandmarker.create_from_options(
            mp.tasks.vision.FaceLandmarkerOptions(
                base_options=mp.tasks.BaseOptions(
                    model_asset_path=str(landmarker_path)
                ),
                running_mode=mp.tasks.vision.RunningMode.IMAGE,
                num_faces=2,
                min_face_detection_confidence=0.4,
                min_face_presence_confidence=0.4,
            )
        )

    def _detect_largest(self, pil_img: Image.Image):
        rgb = np.ascontiguousarray(np.asarray(pil_img, dtype=np.uint8))
        mp_img = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
        res = self.detector.detect(mp_img)
        if not res.detections:
            return None, 0
        largest = max(
            res.detections,
            key=lambda d: d.bounding_box.width * d.bounding_box.height,
        )
        return largest, len(res.detections)

    def _extract_landmarks(self, pil_img: Image.Image) -> Optional[np.ndarray]:
        rgb = np.ascontiguousarray(np.asarray(pil_img, dtype=np.uint8))
        mp_img = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
        res = self.landmarker.detect(mp_img)
        if not res.face_landmarks:
            return None
        w, h = pil_img.size
        # Choose largest face landmark set by bounding box area
        best_pts = None
        best_area = -1.0
        for lm_list in res.face_landmarks:
            pts = np.array([[lm.x * w, lm.y * h] for lm in lm_list], dtype=np.float32)
            area = float((pts[:, 0].max() - pts[:, 0].min()) * (pts[:, 1].max() - pts[:, 1].min()))
            if area > best_area:
                best_area = area
                best_pts = pts
        return best_pts

    def process(
        self,
        image: Image.Image,
        output_size: int = 384,
        scale_factor: float = 1.65,
        allow_fallback_center: bool = False,
    ) -> Dict[str, Any]:
        """
        Detects face, aligns head roll using eye landmarks/keypoints, produces
        aspect-ratio-preserving square crops (at primary scale + TTA scales),
        and extracts 24 normalized geometric features + quality diagnostics.
        """
        image = ImageOps.exif_transpose(image).convert("RGB")
        w, h = image.size

        # Step 1: Try FaceLandmarker first for accurate eye alignment + bbox
        lm_pts = self._extract_landmarks(image)
        det, num_faces = self._detect_largest(image)

        if lm_pts is None and det is None:
            if not allow_fallback_center:
                return {"success": False, "error": "Wajah tidak terdeteksi"}
            # Training-only fallback when celebrity image is already tightly cropped
            side = min(w, h)
            crop = square_padded_crop(image, w / 2.0, h / 2.0, side, output_size)
            return {
                "success": True,
                "aligned_face": crop,
                "aligned_image": image,
                "crop_center": (w / 2.0, h / 2.0),
                "crop_box_size": float(side),
                "geo_features": np.zeros(NUM_GEO_FEATURES, dtype=np.float32),
                "has_geo": False,
                "faces_detected": 1,
                "diagnostics": {
                    "yaw_asymmetry": 0.0,
                    "roll_deg": 0.0,
                    "sharpness": round(compute_sharpness(crop), 1),
                    "face_size_px": int(side),
                },
            }

        # Step 2: Estimate head roll from eyes and rotate upright if |roll| <= 35 deg
        roll_deg = 0.0
        center_rot = (w / 2.0, h / 2.0)
        if lm_pts is not None:
            left_eye = lm_pts[33]
            right_eye = lm_pts[263]
            dx = float(right_eye[0] - left_eye[0])
            dy = float(right_eye[1] - left_eye[1])
            roll_deg = math.degrees(math.atan2(dy, dx))
            center_rot = (
                float(0.5 * (left_eye[0] + right_eye[0])),
                float(0.5 * (left_eye[1] + right_eye[1])),
            )
        elif det is not None and det.keypoints and len(det.keypoints) >= 2:
            # BlazeFace keypoints: 0 = right eye, 1 = left eye (in image coords)
            kp0 = det.keypoints[0]
            kp1 = det.keypoints[1]
            p0 = (kp0.x * w, kp0.y * h)
            p1 = (kp1.x * w, kp1.y * h)
            if p0[0] > p1[0]:
                p0, p1 = p1, p0
            roll_deg = math.degrees(math.atan2(p1[1] - p0[1], p1[0] - p0[0]))
            center_rot = (0.5 * (p0[0] + p1[0]), 0.5 * (p0[1] + p1[1]))

        aligned_img = image
        if 1.5 < abs(roll_deg) <= 35.0:
            aligned_img = image.rotate(
                roll_deg,
                resample=Image.Resampling.BICUBIC,
                center=center_rot,
                expand=False,
            )
            # Re-detect landmarks on the upright aligned image
            lm_aligned = self._extract_landmarks(aligned_img)
            if lm_aligned is not None:
                lm_pts = lm_aligned
            else:
                # Keep original if rotation pushed face out
                aligned_img = image

        # Step 3: Determine tight, consistent square crop centered on face
        if lm_pts is not None:
            min_x, max_x = float(lm_pts[:, 0].min()), float(lm_pts[:, 0].max())
            min_y, max_y = float(lm_pts[:, 1].min()), float(lm_pts[:, 1].max())
            fw = max_x - min_x
            fh = max_y - min_y
            cx = 0.5 * (min_x + max_x)
            # Shift center slightly up (5%) to include forehead & hairline context
            cy = 0.5 * (min_y + max_y) - 0.05 * fh
            base_size = max(fw, fh)
            box_size = base_size * scale_factor
            geo_feats, diag = extract_geometric_features(lm_pts)
            has_geo = True
            face_px = int(max(fw, fh))
        else:
            det_aligned, nf2 = self._detect_largest(aligned_img)
            use_det = det_aligned if det_aligned is not None else det
            bbox = use_det.bounding_box
            cx = bbox.origin_x + 0.5 * bbox.width
            cy = bbox.origin_y + 0.45 * bbox.height
            base_size = max(bbox.width, bbox.height)
            box_size = base_size * scale_factor
            geo_feats = np.zeros(NUM_GEO_FEATURES, dtype=np.float32)
            diag = {"yaw_asymmetry": 0.0, "roll_deg": round(roll_deg, 2)}
            has_geo = False
            face_px = int(base_size)
            num_faces = max(num_faces, nf2)

        crop = square_padded_crop(aligned_img, cx, cy, box_size, output_size)
        diag["sharpness"] = round(compute_sharpness(crop), 1)
        diag["face_size_px"] = face_px
        diag["roll_deg"] = round(roll_deg, 2)

        return {
            "success": True,
            "aligned_face": crop,
            "aligned_image": aligned_img,
            "crop_center": (cx, cy),
            "crop_box_size": float(box_size),
            "geo_features": geo_feats,
            "has_geo": has_geo,
            "faces_detected": max(1, num_faces),
            "diagnostics": diag,
        }

    def close(self):
        self.detector.close()
        self.landmarker.close()
