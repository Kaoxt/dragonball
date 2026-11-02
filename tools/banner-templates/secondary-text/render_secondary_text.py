"""Render reusable Flipside lettering and a phrase-fitted shadow as alpha masks."""
import argparse
import hashlib
import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont
from scipy import ndimage


STYLE_PATH = Path(__file__).with_name("style.json")


def render(text, font_path, style, layout):
    font_hash = hashlib.sha256(font_path.read_bytes()).hexdigest()
    if font_hash != style["font"]["sha256"]:
        raise ValueError("Use the approved Flipside.ttf; its SHA-256 must match style.json.")
    text = text.strip().upper()
    if not text or "\n" in text or "\r" in text:
        raise ValueError("Provide one nonempty line of banner text.")
    if min(layout["width"], layout["height"], layout["font_size"]) <= 0:
        raise ValueError("Canvas dimensions and font size must be positive.")

    font = ImageFont.truetype(str(font_path), layout["font_size"])
    left, top, right, bottom = font.getbbox(text)
    probe = Image.new("L", (right - left + 20, bottom - top + 20))
    ImageDraw.Draw(probe).text((10 - left, 10 - top), text, font=font, fill=255)
    bounds = probe.getbbox()
    if bounds is None:
        raise ValueError("The supplied text has no visible glyphs.")
    raw = np.asarray(probe.crop(bounds)).astype(float)
    x, y = layout["x"], layout["y"]
    if x < 0 or y < 0 or x + raw.shape[1] > layout["width"] or y + raw.shape[0] > layout["height"]:
        raise ValueError("Lettering does not fit. Choose an explicit size or position; it is never stretched or clipped.")

    repair = style["lower_stroke_repair"]
    pad = repair["padding"]
    closed = ndimage.grey_closing(
        np.pad(raw, pad), size=tuple(repair["closing_kernel_yx"])
    )[pad:-pad, pad:-pad]
    ramp = np.clip(
        (np.arange(raw.shape[0]) - raw.shape[0] * repair["start_height_fraction"])
        / (raw.shape[0] * repair["ramp_height_fraction"]), 0, 1
    )[:, None]
    solid = np.clip((closed - repair["opacity_threshold"]) * repair["opacity_gain"], 0, 255)
    repaired = raw + (np.maximum(raw, solid) - raw) * ramp
    lettering = Image.new("L", (layout["width"], layout["height"]))
    lettering.paste(Image.fromarray(np.rint(repaired).astype("uint8")), (x, y))

    shadow_style = style["shadow"]
    field = ndimage.maximum_filter(
        np.asarray(lettering).astype(float) / 255,
        size=tuple(shadow_style["maximum_filter_yx"])
    )
    field = ndimage.gaussian_filter(field, sigma=shadow_style["gaussian_sigma"])
    backing = Image.fromarray(
        np.rint(np.clip(field * shadow_style["opacity"], 0, 1) * 255).astype("uint8")
    )
    return lettering, backing, {
        "text": text,
        "font": style["font"]["family"],
        "font_sha256": font_hash,
        "style_sha256": hashlib.sha256(STYLE_PATH.read_bytes()).hexdigest(),
        "synthetic_bold": False,
        "bottom_erosion_repair": True,
        "layout": layout,
        "ink_bounds": lettering.getbbox(),
        "shadow_bounds": backing.getbbox(),
        "text_color": style["text_color"],
        "shadow_color": style["shadow_color"]
    }


def main():
    style = json.loads(STYLE_PATH.read_text())
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--text", required=True)
    parser.add_argument("--font", required=True, type=Path)
    parser.add_argument("--preset", choices=style["presets"], required=True)
    parser.add_argument("--output-dir", required=True, type=Path)
    for key in ("width", "height", "font_size", "x", "y"):
        parser.add_argument("--" + key.replace("_", "-"), type=int)
    args = parser.parse_args()
    layout = dict(style["presets"][args.preset])
    for key in layout:
        value = getattr(args, key)
        if value is not None:
            layout[key] = value
    try:
        lettering, backing, metadata = render(args.text, args.font, style, layout)
    except (ValueError, OSError) as error:
        parser.error(str(error))
    args.output_dir.mkdir(parents=True, exist_ok=True)
    lettering.save(args.output_dir / f"{args.preset}-lettering.png")
    backing.save(args.output_dir / f"{args.preset}-backing.png")
    (args.output_dir / f"{args.preset}-provenance.json").write_text(
        json.dumps(metadata, indent=2) + "\n"
    )


if __name__ == "__main__":
    main()
