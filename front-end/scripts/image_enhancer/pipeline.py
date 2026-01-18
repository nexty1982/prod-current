import cv2
import numpy as np
from typing import Dict, List, Tuple


def auto_crop(img: np.ndarray, config: Dict) -> np.ndarray:
    try:
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        _, thresh = cv2.threshold(gray, 200, 255, cv2.THRESH_BINARY_INV)
        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (20, 20))
        dilate = cv2.dilate(thresh, kernel, iterations=2)
        contours, _ = cv2.findContours(
            dilate, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE
        )
        if contours:
            largest = max(contours, key=cv2.contourArea)
            x, y, w, h = cv2.boundingRect(largest)
            return img[y : y + h, x : x + w]
        return img
    except Exception:
        return img


def deskew(img: np.ndarray, config: Dict) -> np.ndarray:
    try:
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        blur = cv2.GaussianBlur(gray, (9, 9), 0)
        thresh = cv2.threshold(
            blur, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU
        )[1]
        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (30, 5))
        dilate = cv2.dilate(thresh, kernel, iterations=5)
        contours, _ = cv2.findContours(
            dilate, cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE
        )
        contours = sorted(contours, key=cv2.contourArea, reverse=True)
        if not contours:
            return img
        largest = contours[0]
        min_area_rect = cv2.minAreaRect(largest)
        angle = min_area_rect[-1]
        if angle < -45:
            angle = 90 + angle
        angle = -angle
        if abs(angle) < 0.5:
            return img
        (h, w) = img.shape[:2]
        center = (w // 2, h // 2)
        M = cv2.getRotationMatrix2D(center, angle, 1.0)
        rotated = cv2.warpAffine(
            img,
            M,
            (w, h),
            flags=cv2.INTER_CUBIC,
            borderMode=cv2.BORDER_REPLICATE,
        )
        return rotated
    except Exception:
        return img


def adjust_brightness_contrast(img: np.ndarray, config: Dict) -> np.ndarray:
    alpha = config.get("contrast", 1.0)
    beta = config.get("brightness", 0)
    return cv2.convertScaleAbs(img, alpha=alpha, beta=beta)


def enhance_contrast(img: np.ndarray, config: Dict) -> np.ndarray:
    try:
        lab = cv2.cvtColor(img, cv2.COLOR_BGR2LAB)
        l, a, b = cv2.split(lab)
        clahe = cv2.createCLAHE(
            clipLimit=config.get("clahe_clip_limit", 2.0),
            tileGridSize=(8, 8),
        )
        l = clahe.apply(l)
        lab = cv2.merge((l, a, b))
        return cv2.cvtColor(lab, cv2.COLOR_LAB2BGR)
    except Exception:
        return img


def denoise(img: np.ndarray, config: Dict) -> np.ndarray:
    try:
        return cv2.bilateralFilter(img, d=9, sigmaColor=75, sigmaSpace=75)
    except Exception:
        return img


def sharpen(img: np.ndarray, config: Dict) -> np.ndarray:
    try:
        gaussian = cv2.GaussianBlur(img, (0, 0), sigmaX=2.0)
        return cv2.addWeighted(img, 1.5, gaussian, -0.5, 0)
    except Exception:
        return img


def binarize(img: np.ndarray, config: Dict) -> np.ndarray:
    try:
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        thresh = cv2.adaptiveThreshold(
            gray,
            255,
            cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
            cv2.THRESH_BINARY,
            11,
            2,
        )
        return cv2.cvtColor(thresh, cv2.COLOR_GRAY2BGR)
    except Exception:
        return img


def run_pipeline(
    img: np.ndarray, config: Dict
) -> Tuple[np.ndarray, list[str]]:
    steps_applied: list[str] = []

    if config.get("auto_crop", False):
        img = auto_crop(img, config)
        steps_applied.append("auto_crop")

    if config.get("deskew", False):
        img = deskew(img, config)
        steps_applied.append("deskew")

    if config.get("adjust_brightness_contrast", False):
        img = adjust_brightness_contrast(img, config)
        steps_applied.append("adjust_brightness_contrast")

    if config.get("enhance_contrast", False):
        img = enhance_contrast(img, config)
        steps_applied.append("enhance_contrast")

    if config.get("denoise", False):
        img = denoise(img, config)
        steps_applied.append("denoise")

    if config.get("sharpen", False):
        img = sharpen(img, config)
        steps_applied.append("sharpen")

    if config.get("high_legibility", False):
        img = binarize(img, config)
        steps_applied.append("binarize")

    return img, steps_applied

