#!/usr/bin/env python3
"""
Batch image quality report generator for OrthodoxMetrics record scans.

Given a directory of images, computes simple quality metrics and produces
an HTML report and JSON summary indicating which images are usable vs trash.
"""

from __future__ import annotations

import json
import logging
import sys
from dataclasses import dataclass, asdict
from pathlib import Path
from statistics import mean
from typing import List, Tuple

import cv2
import numpy as np

from .io_utils import load_image

logging.basicConfig(level=logging.INFO, stream=sys.stderr)


IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".tif", ".tiff", ".bmp"}


@dataclass
class ImageQuality:
    filename: str
    width: int
    height: int
    sharpness: float
    brightness: float
    contrast: float
    score: float
    status: str  # "trash", "borderline", "usable"


def compute_metrics(img: np.ndarray) -> Tuple[float, float, float]:
    """
    Returns (sharpness, brightness, contrast).

    - sharpness: variance of Laplacian
    - brightness: mean grayscale value (0-255)
    - contrast: stddev of grayscale value
    """
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    # sharpness
    lap = cv2.Laplacian(gray, cv2.CV_64F)
    sharpness = float(lap.var())
    # brightness and contrast
    brightness = float(gray.mean())
    contrast = float(gray.std())
    return sharpness, brightness, contrast


def score_image(
    width: int,
    height: int,
    sharpness: float,
    brightness: float,
    contrast: float,
) -> Tuple[float, str]:
    """
    Return (score, status). Score is 0-100.
    Heuristic thresholds tuned for scanned record pages,
    not photography.
    """

    # Basic size gate
    min_w, min_h = 1500, 2000  # adjust as needed
    size_ok = width >= min_w and height >= min_h

    # Normalize metrics into 0-1 ranges (rough heuristic)
    # Sharpness: 0 -> 0, 400 -> 1 (clip)
    sharp_norm = max(0.0, min(sharpness / 400.0, 1.0))
    # Brightness: ideal around 200 (slightly bright paper),
    # penalize too dark or too bright.
    bright_norm = 1.0 - min(abs(brightness - 200.0) / 200.0, 1.0)
    # Contrast: 0-80, ideal ~40
    contrast_norm = 1.0 - min(abs(contrast - 40.0) / 40.0, 1.0)

    # Weighted score; size penalty if too small
    base_score = (
        0.5 * sharp_norm +
        0.25 * bright_norm +
        0.25 * contrast_norm
    )

    if not size_ok:
        base_score *= 0.6

    score = round(base_score * 100.0, 1)

    # Status buckets (tune thresholds as you get real data)
    if score < 35:
        status = "trash"
    elif score < 65:
        status = "borderline"
    else:
        status = "usable"

    return score, status


def analyze_directory(input_dir: Path) -> List[ImageQuality]:
    results: List[ImageQuality] = []

    for path in sorted(input_dir.iterdir()):
        if not path.is_file() or path.suffix.lower() not in IMAGE_EXTS:
            continue

        try:
            img = load_image(str(path))
            h, w = img.shape[:2]
            sharp, bright, contr = compute_metrics(img)
            score, status = score_image(w, h, sharp, bright, contr)

            iq = ImageQuality(
                filename=path.name,
                width=w,
                height=h,
                sharpness=round(sharp, 1),
                brightness=round(bright, 1),
                contrast=round(contr, 1),
                score=score,
                status=status,
            )
            results.append(iq)
            logging.info("%s -> score=%.1f status=%s", path.name, score, status)
        except Exception as e:
            logging.error("Error processing %s: %s", path, e)

    return results


def write_json(results: List[ImageQuality], out_path: Path) -> None:
    data = [asdict(r) for r in results]
    with out_path.open("w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)


def write_html(results: List[ImageQuality], out_path: Path) -> None:
    if not results:
        html = "<html><body><h1>No images found</h1></body></html>"
        out_path.write_text(html, encoding="utf-8")
        return

    avg_score = mean(r.score for r in results)
    trash = [r for r in results if r.status == "trash"]
    borderline = [r for r in results if r.status == "borderline"]
    usable = [r for r in results if r.status == "usable"]

    def row(r: ImageQuality) -> str:
        return (
            f"<tr>"
            f"<td>{r.filename}</td>"
            f"<td>{r.width}×{r.height}</td>"
            f"<td>{r.sharpness:.1f}</td>"
            f"<td>{r.brightness:.1f}</td>"
            f"<td>{r.contrast:.1f}</td>"
            f"<td>{r.score:.1f}</td>"
            f"<td class='{r.status}'>{r.status}</td>"
            f"</tr>"
        )

    rows_html = "\n".join(row(r) for r in results)

    html = f"""<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>Image Quality Report</title>
<style>
body {{
    font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    padding: 24px;
    background: #f7f7fb;
}}
h1 {{
    margin-bottom: 0;
}}
.summary {{
    margin: 12px 0 24px 0;
    font-size: 14px;
}}
table {{
    border-collapse: collapse;
    width: 100%;
    background: #fff;
    border-radius: 8px;
    overflow: hidden;
}}
th, td {{
    padding: 8px 10px;
    border-bottom: 1px solid #eee;
    font-size: 13px;
}}
th {{
    background: #fafafa;
    text-align: left;
}}
tr:nth-child(even) {{
    background: #fcfcff;
}}
td.trash {{
    color: #c0392b;
    font-weight: 600;
}}
td.borderline {{
    color: #e67e22;
    font-weight: 600;
}}
td.usable {{
    color: #27ae60;
    font-weight: 600;
}}
.badge {{
    display: inline-block;
    padding: 2px 8px;
    border-radius: 999px;
    font-size: 11px;
    margin-right: 6px;
}}
.badge-trash {{ background:#fdecea; color:#c0392b; }}
.badge-borderline {{ background:#fff4e6; color:#e67e22; }}
.badge-usable {{ background:#e8f7f0; color:#27ae60; }}
</style>
</head>
<body>
<h1>Image Quality Report</h1>
<div class="summary">
  <div>Average score: <strong>{avg_score:.1f}</strong> (0–100)</div>
  <div>
    <span class="badge badge-trash">Trash: {len(trash)}</span>
    <span class="badge badge-borderline">Borderline: {len(borderline)}</span>
    <span class="badge badge-usable">Usable: {len(usable)}</span>
    &nbsp;Total files: {len(results)}
  </div>
</div>
<table>
<thead>
<tr>
  <th>Filename</th>
  <th>Size</th>
  <th>Sharpness</th>
  <th>Brightness</th>
  <th>Contrast</th>
  <th>Score</th>
  <th>Status</th>
</tr>
</thead>
<tbody>
{rows_html}
</tbody>
</table>
</body>
</html>
"""
    out_path.write_text(html, encoding="utf-8")


def main() -> None:
    if len(sys.argv) != 2:
        print(
            "Usage: python -m om_image_enhance.quality_report /path/to/image_dir",
            file=sys.stderr,
        )
        sys.exit(1)

    input_dir = Path(sys.argv[1])
    if not input_dir.is_dir():
        logging.error("Input must be a directory: %s", input_dir)
        sys.exit(1)

    logging.info("Analyzing images in %s", input_dir)
    results = analyze_directory(input_dir)

    report_json = input_dir / "image_quality_report.json"
    report_html = input_dir / "image_quality_report.html"

    write_json(results, report_json)
    write_html(results, report_html)

    logging.info("Wrote %s and %s", report_json, report_html)


if __name__ == "__main__":
    main()

