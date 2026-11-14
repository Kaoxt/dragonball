#!/usr/bin/env python3
"""Verify the retained Cell Hi-Tech sources without modifying release exports."""
import argparse
from concurrent.futures import ThreadPoolExecutor
import hashlib
import json
from pathlib import Path
import subprocess

from PIL import Image, ImageChops

ROOT = Path(__file__).resolve().parents[3]
BASE = ROOT / 'tools/card-corrections/v3-cell-191-200'


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def verify(row, work):
    source = ROOT / row['native_source_path']
    assert sha(source) == row['native_source_sha256'], source
    for asset in row['assets']:
        assert sha(ROOT / asset['path']) == asset['sha256'], asset['path']
    rendered = work / f"{row['id']}.png"
    subprocess.run(['inkscape', str(source), '--export-area-page',
                    '--export-width=2120', '--export-height=2968',
                    f'--export-filename={rendered}'], check=True,
                   stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    full = Image.open(rendered).convert('RGBA')
    assert full.size == (2120, 2968)
    assert full.getextrema()[3] == (255, 255)
    display = full.resize((1060, 1484), Image.Resampling.LANCZOS)
    results = []
    for export in row['exports']:
        path = ROOT / export['path']
        assert sha(path) == export['sha256'], path
        actual = Image.open(path).convert('RGBA')
        expected = display if export['field'] == 'image' else full
        assert actual.size == expected.size == tuple(export['size'])
        delta = ImageChops.difference(actual, expected)
        assert all(high == 0 for low, high in delta.getextrema()), path
        results.append({**export, 'decoded_pixels_match_render': True})
    print(f"Verified {row['number']}: native source and both exports", flush=True)
    return {'number': row['number'], 'id': row['id'],
            'native_source_sha256': sha(source), 'exports': results}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--work', type=Path, required=True)
    args = parser.parse_args()
    args.work.mkdir(parents=True, exist_ok=True)
    rows = json.loads((BASE / 'audit.json').read_text())
    with ThreadPoolExecutor(max_workers=2) as pool:
        results = list(pool.map(lambda row: verify(row, args.work), rows))
    (args.work / 'render-verification.json').write_text(json.dumps(results, indent=2) + '\n')
