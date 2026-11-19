#!/usr/bin/env python3
"""Build responsive WebP derivatives without modifying source artwork.

Requires cwebp on PATH; uses only the Python standard library. Generated PNG
masters are preferred when the existing hero provenance makes them available.
Run from any directory. Content hashes keep immutable asset URLs cache-safe.
"""

import argparse
import hashlib
import json
import os
from pathlib import Path
import shutil
import struct
import subprocess
import tempfile


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "assets" / "optimized"
MANIFEST = OUTPUT / "manifest.json"
HERO_NAMES = (
    "about-us", "account-types", "introducing-broker", "forex",
    "metals-energy", "indices", "crypto",
)
ASSETS = [
    *[(f"assets/hero-art/{name}.webp", "hero", 90) for name in HERO_NAMES],
    ("assets/portal-signature/glacier-gloss-background-lossless.webp", "background", 88),
    ("assets/portal-signature/glacier-dark-floor-1025-lossless.webp", "background", 88),
    ("assets/product/nextwise-crm-original.png", "screenshot", 92),
    ("assets/product/mt5-web-devices.png", "screenshot", 92),
    ("assets/hero-art/metatrader5-terminal.png", "screenshot", 92),
]


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def image_info(path):
    """Read dimensions and alpha flags from PNG/WebP headers, without decoding."""
    data = path.read_bytes()
    if data[:8] == b"\x89PNG\r\n\x1a\n":
        width, height = struct.unpack(">II", data[16:24])
        alpha = data[25] in (4, 6)
        offset = 8
        while offset + 12 <= len(data):
            length = struct.unpack(">I", data[offset:offset + 4])[0]
            if data[offset + 4:offset + 8] == b"tRNS":
                alpha = True
            offset += length + 12
        return {"width": width, "height": height, "alpha": alpha}
    if data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        offset = 12
        alpha = False
        while offset + 8 <= len(data):
            kind = data[offset:offset + 4]
            length = struct.unpack("<I", data[offset + 4:offset + 8])[0]
            chunk = data[offset + 8:offset + 8 + length]
            if kind == b"VP8X":
                return {
                    "width": int.from_bytes(chunk[4:7], "little") + 1,
                    "height": int.from_bytes(chunk[7:10], "little") + 1,
                    "alpha": bool(chunk[0] & 0x10),
                }
            if kind == b"ALPH":
                alpha = True
            if kind == b"VP8 ":
                width, height = struct.unpack("<HH", chunk[6:10])
                return {"width": width & 0x3fff, "height": height & 0x3fff, "alpha": alpha}
            if kind == b"VP8L":
                bits = int.from_bytes(chunk[1:5], "little")
                return {
                    "width": (bits & 0x3fff) + 1,
                    "height": ((bits >> 14) & 0x3fff) + 1,
                    "alpha": bool(bits & (1 << 28)),
                }
            offset += 8 + length + (length % 2)
    raise ValueError(f"Unsupported or invalid image: {path}")


def hero_masters():
    masters = {}
    for name in ("brand-prompts.json", "market-prompts.json"):
        provenance = ROOT / "assets" / "hero-art" / name
        if not provenance.is_file():
            continue
        for item in json.loads(provenance.read_text())["assets"]:
            filename = item.get("file") or item.get("asset")
            original = item.get("original") or item.get("original_png")
            if filename and original and Path(original).is_file():
                masters[filename] = Path(original)
    return masters


def record(path, quality, reused_original=False):
    return {
        "src": "/" + path.relative_to(ROOT).as_posix(),
        **image_info(path),
        "bytes": path.stat().st_size,
        "sha256": digest(path),
        "quality": quality,
        "reused_original": reused_original,
    }


def build():
    encoder = shutil.which("cwebp")
    if not encoder:
        raise SystemExit("cwebp is required; no dependencies were installed.")
    OUTPUT.mkdir(parents=True, exist_ok=True)
    masters = hero_masters()
    assets = {}
    with tempfile.TemporaryDirectory(prefix=".encode-", dir=OUTPUT) as temporary:
        candidate = Path(temporary) / "candidate.webp"
        for relative, category, quality in ASSETS:
            original = ROOT / relative
            original_info = image_info(original)
            source = masters.get(original.name, original) if category == "hero" else original
            source_info = image_info(source)
            if (source_info["width"], source_info["height"]) != (original_info["width"], original_info["height"]):
                raise ValueError(f"Master dimensions do not match {relative}; refusing an unexpected crop/resize.")
            full_width = original_info["width"]
            widths = sorted({w for w in (480, 768, 1024, full_width) if w <= full_width})
            variants = []
            for width in widths:
                command = [
                    encoder, "-quiet", "-q", str(quality), "-m", "6", "-pass", "6",
                    "-sharp_yuv", "-alpha_q", "100", "-alpha_filter", "best",
                    "-metadata", "icc", "-resize", str(width), "0",
                    str(source), "-o", str(candidate),
                ]
                subprocess.run(command, check=True)
                info = image_info(candidate)
                if info["width"] != width:
                    raise ValueError(f"Unexpected encoded width for {relative}: {info}")
                if category == "hero" and original_info["alpha"] and not info["alpha"]:
                    raise ValueError(f"Transparency was unexpectedly lost: {relative}")
                if width == full_width and candidate.stat().st_size >= original.stat().st_size:
                    # Never publish a full-size derivative that costs more than
                    # the existing original. Smaller candidates remain useful.
                    variants.append(record(original, None, reused_original=True))
                    continue
                content_hash = digest(candidate)
                destination = OUTPUT / f"{original.stem}-{width}.{content_hash[:12]}.webp"
                if destination.exists():
                    if digest(destination) != content_hash:
                        raise ValueError(f"Content hash collision: {destination}")
                else:
                    os.replace(candidate, destination)
                variants.append(record(destination, quality))
            original_bytes = original.stat().st_size
            assets["/" + relative] = {
                "category": category,
                **original_info,
                "bytes": original_bytes,
                "sha256": digest(original),
                # The existing hero provenance records the master location;
                # keep machine-specific filesystem paths out of this manifest.
                "encoding_source": source.name if source != original else "/" + relative,
                "encoding_source_sha256": digest(source),
                "uses_original_png_master": source != original,
                "variants": variants,
                "full_size_savings_bytes": original_bytes - variants[-1]["bytes"],
                "smallest_variant_savings_bytes": original_bytes - variants[0]["bytes"],
            }
            print(f"{relative}: {original_bytes:,} -> {variants[-1]['bytes']:,} bytes full; {variants[0]['bytes']:,} bytes at {variants[0]['width']}px", flush=True)
        baseline = sum(item["bytes"] for item in assets.values())
        full_size = sum(item["variants"][-1]["bytes"] for item in assets.values())
        smallest = sum(item["variants"][0]["bytes"] for item in assets.values())
        manifest = {
            "schema_version": 1,
            "generator": "scripts/optimize-images.py",
            "encoder": "cwebp " + subprocess.check_output([encoder, "-version"], text=True).splitlines()[0],
            "settings": {"hero_quality": 90, "background_quality": 88, "screenshot_quality": 92, "alpha_quality": 100, "method": 6, "sharp_yuv": True},
            "assets": assets,
            "totals": {
                "original_bytes": baseline,
                "full_size_variant_bytes": full_size,
                "full_size_savings_bytes": baseline - full_size,
                "full_size_savings_percent": round((baseline - full_size) / baseline * 100, 2),
                "smallest_variant_bytes": smallest,
                "smallest_variant_savings_percent": round((baseline - smallest) / baseline * 100, 2),
                "note": "Totals compare one candidate per source across the collection, not a single page load; browsers select a responsive candidate.",
            },
        }
        staged = Path(temporary) / "manifest.json"
        staged.write_text(json.dumps(manifest, indent=2, sort_keys=True) + "\n")
        os.replace(staged, MANIFEST)
    print(json.dumps(manifest["totals"], indent=2))


def verify():
    manifest = json.loads(MANIFEST.read_text())
    count = 0
    for original_url, item in manifest["assets"].items():
        original = ROOT / original_url.lstrip("/")
        if digest(original) != item["sha256"]:
            raise ValueError(f"Original changed since encoding: {original_url}")
        widths = []
        for variant in item["variants"]:
            path = ROOT / variant["src"].lstrip("/")
            info = image_info(path)
            if path.stat().st_size != variant["bytes"] or digest(path) != variant["sha256"]:
                raise ValueError(f"Derivative bytes/hash do not match: {path}")
            if any(info[key] != variant[key] for key in ("width", "height", "alpha")):
                raise ValueError(f"Derivative dimensions/alpha do not match: {path}")
            widths.append(info["width"])
            count += 1
        if widths != sorted(set(widths)) or widths[-1] != item["width"]:
            raise ValueError(f"Unexpected responsive widths: {original_url}")
        if item["variants"][-1]["bytes"] > item["bytes"]:
            raise ValueError(f"Full-size derivative exceeds source: {original_url}")
    print(f"Verified {count} responsive variants for {len(manifest['assets'])} original assets; sources unchanged.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="Verify existing outputs and original hashes without encoding.")
    arguments = parser.parse_args()
    if not arguments.check:
        build()
    verify()
