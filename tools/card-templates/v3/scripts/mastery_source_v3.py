"""Load the exact approved Mastery source from transport-sized gzip parts."""
from pathlib import Path
import argparse
import gzip
import hashlib
import json

SOURCE = Path(__file__).resolve().parents[1] / 'masters/mastery-v3-source'
APPROVED_SHA256 = '10948151b2cb82fa190ec88cdf52e8ab8db469acf4c3c7baaf13096f1a17a78c'

def load():
    manifest = json.loads((SOURCE / 'manifest.json').read_text())
    chunks = []
    for part in manifest['parts']:
        data = (SOURCE / part['file']).read_bytes()
        assert len(data) == part['bytes']
        assert hashlib.sha256(data).hexdigest() == part['sha256']
        chunks.append(data)
    compressed = b''.join(chunks)
    assert hashlib.sha256(compressed).hexdigest() == manifest['compressed_sha256']
    data = gzip.decompress(compressed)
    assert len(data) == manifest['bytes']
    assert hashlib.sha256(data).hexdigest() == manifest['approved_sha256'] == APPROVED_SHA256
    return data

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('output', type=Path, help='Destination for Mastery-Master-V3.svg')
    args = parser.parse_args()
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_bytes(load())
    print(args.output)
