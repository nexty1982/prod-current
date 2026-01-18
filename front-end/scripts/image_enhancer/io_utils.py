import cv2
import numpy as np
from typing import Tuple
from pathlib import Path


def load_image(path: str) -> np.ndarray:
    img = cv2.imread(path, cv2.IMREAD_UNCHANGED)
    if img is None:
        raise ValueError(f"Could not load image: {path}")
    if len(img.shape) == 2:  # grayscale to BGR
        img = cv2.cvtColor(img, cv2.COLOR_GRAY2BGR)
    return img


def save_image(path: str, img: np.ndarray) -> None:
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    cv2.imwrite(path, img)


def create_preview(original: np.ndarray, enhanced: np.ndarray) -> np.ndarray:
    h = max(original.shape[0], enhanced.shape[0])

    def resize_to_height(im: np.ndarray) -> np.ndarray:
        scale = h / im.shape[0]
        w = int(im.shape[1] * scale)
        return cv2.resize(im, (w, h))

    orig_resized = resize_to_height(original)
    enh_resized = resize_to_height(enhanced)
    return np.hstack((orig_resized, enh_resized))

