import argparse
import json
import logging
import sys
from datetime import datetime
from pathlib import Path
from typing import Dict

from .config import DEFAULT_CONFIG
from .io_utils import load_image, save_image, create_preview
from .pipeline import run_pipeline

logging.basicConfig(level=logging.INFO, stream=sys.stderr)


def process_file(input_path: Path, output_dir: Path, config: Dict) -> None:
    try:
        img = load_image(str(input_path))
        enhanced, steps = run_pipeline(img, config)

        stem = input_path.stem
        suffix = input_path.suffix

        output_file = output_dir / f"{stem}_enhanced{suffix}"
        preview_file = output_dir / f"{stem}_preview.jpg"
        json_file = output_dir / f"{stem}_meta.json"

        save_image(str(output_file), enhanced)
        preview = create_preview(img, enhanced)
        save_image(str(preview_file), preview)

        metadata = {
            "input_file": str(input_path),
            "output_file": str(output_file),
            "steps": steps,
            "params": config,
            "timestamp": datetime.now().isoformat(),
        }
        with open(json_file, "w", encoding="utf-8") as f:
            json.dump(metadata, f, indent=4)

        logging.info("Processed %s -> %s", input_path, output_file)
    except Exception as e:
        logging.error("Error processing %s: %s", input_path, e)


def main() -> None:
    parser = argparse.ArgumentParser(description="Enhance scanned images.")
    parser.add_argument("input", type=str, help="Input file or directory")
    parser.add_argument(
        "--out", type=str, default=None, help="Output file or directory"
    )
    parser.add_argument(
        "--high-legibility",
        action="store_true",
        help="Enable high legibility mode",
    )
    parser.add_argument(
        "--brightness",
        type=float,
        default=0,
        help="Brightness adjustment",
    )
    parser.add_argument(
        "--contrast",
        type=float,
        default=1.0,
        help="Contrast adjustment (global); also used as CLAHE clip limit if changed",
    )
    parser.add_argument(
        "--no-deskew",
        action="store_false",
        dest="deskew",
        help="Disable deskew",
    )
    parser.add_argument(
        "--no-denoise",
        action="store_false",
        dest="denoise",
        help="Disable denoise",
    )
    parser.add_argument(
        "--no-auto-crop",
        action="store_false",
        dest="auto_crop",
        help="Disable auto crop",
    )
    parser.add_argument(
        "--no-enhance-contrast",
        action="store_false",
        dest="enhance_contrast",
        help="Disable contrast enhancement",
    )
    parser.add_argument(
        "--no-sharpen",
        action="store_false",
        dest="sharpen",
        help="Disable sharpening",
    )

    args = parser.parse_args()

    config = DEFAULT_CONFIG.copy()
    config["high_legibility"] = args.high_legibility
    config["brightness"] = args.brightness
    config["contrast"] = args.contrast
    if args.contrast != 1.0:
        config["clahe_clip_limit"] = args.contrast

    config["deskew"] = args.deskew
    config["denoise"] = args.denoise
    config["auto_crop"] = args.auto_crop
    config["enhance_contrast"] = args.enhance_contrast
    config["sharpen"] = args.sharpen

    if args.brightness == 0 and args.contrast == 1.0:
        config["adjust_brightness_contrast"] = False

    input_path = Path(args.input)
    out_path = Path(args.out) if args.out else Path.cwd()

    if input_path.is_file():
        output_dir = out_path if out_path.is_dir() else out_path.parent
        process_file(input_path, output_dir, config)
    elif input_path.is_dir():
        if not out_path.is_dir():
            logging.error("For input directory, --out should be a directory")
            sys.exit(1)
        out_path.mkdir(parents=True, exist_ok=True)
        image_extensions = {".jpg", ".jpeg", ".png", ".tiff", ".tif"}
        for file in input_path.iterdir():
            if file.suffix.lower() in image_extensions:
                process_file(file, out_path, config)
    else:
        logging.error("Input must be a file or directory")
        sys.exit(1)


if __name__ == "__main__":
    main()

