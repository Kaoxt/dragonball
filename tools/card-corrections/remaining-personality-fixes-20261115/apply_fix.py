#!/usr/bin/env python3
"""Validate and install this correction into an existing Dragon Ball checkout.

Dry-run is the default. No git, network, commit, push, or deployment is performed.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import tempfile


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def within(root, relative):
    path = (root / relative).resolve()
    if not path.is_relative_to(root.resolve()):
        raise ValueError(f"Path escapes its root: {relative}")
    return path


def atomic_write(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, name = tempfile.mkstemp(prefix=".centering-", dir=path.parent)
    try:
        with os.fdopen(fd, "wb") as handle:
            handle.write(data)
        os.replace(name, path)
    finally:
        if os.path.exists(name):
            os.unlink(name)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("repo", type=Path, help="Existing Kaoxt/dragonball checkout")
    parser.add_argument("--apply", action="store_true", help="Install after all checks pass")
    args = parser.parse_args()
    here = Path(__file__).resolve().parent
    manifest = json.loads((here / "manifest.json").read_text())
    repo = args.repo.resolve()
    pending, errors = [], []

    for record in manifest["files"]:
        rel = record["path"]
        source = within(here / "payload", rel)
        target = within(repo, rel)
        if not source.is_file() or digest(source) != record["sha256"]:
            errors.append(f"Payload integrity mismatch: {rel}")
            continue
        present = digest(target) if target.is_file() else None
        if present == record["sha256"]:
            continue
        if present != record.get("baseline_sha256"):
            errors.append(f"Checkout has different or missing source: {rel}")
            continue
        pending.append((target, source.read_bytes()))

    for rel, expected in manifest["retained_dependencies"].items():
        path = within(repo, rel)
        if not path.is_file() or digest(path) != expected:
            errors.append(f"Retained source dependency differs or is missing: {rel}")

    catalog_path = within(repo, "public/cards/catalog.js")
    if not catalog_path.is_file():
        errors.append("Missing public/cards/catalog.js")
    else:
        catalog_text = catalog_path.read_text()
        try:
            current_cards, _ = json.JSONDecoder().raw_decode(catalog_text[catalog_text.index("["):])
            current_cards = {card["id"]: card for card in current_cards}
            for record in manifest["cards"]:
                before = record["before_card"]
                current = current_cards.get(before["id"], {})
                for key, value in before.items():
                    if key not in ("image", "downloadImage") and current.get(key) != value:
                        errors.append(f"Card content changed: {before['id']} {key}")
        except (ValueError, KeyError, TypeError) as error:
            errors.append(f"Cannot validate current catalog: {error}")
        for change in manifest["catalog_url_changes"]:
            old, new = json.dumps(change["before"]), json.dumps(change["after"])
            old_count, new_count = catalog_text.count(old), catalog_text.count(new)
            if old_count == 1 and new_count == 0:
                catalog_text = catalog_text.replace(old, new, 1)
            elif old_count == 0 and new_count == 1:
                pass
            else:
                errors.append(f"Catalog revision conflict: {change['id']} {change['field']}")
        if catalog_text != catalog_path.read_text():
            pending.append((catalog_path, catalog_text.encode()))

    # Narrow source changes can coexist with unrelated previous correction packages.
    semantic_texts = {}
    for change in manifest.get("semantic_text_changes", []):
        path = within(repo, change["path"])
        if not path.is_file():
            errors.append(f"Missing source for semantic patch: {change['path']}")
            continue
        content = semantic_texts.get(path, path.read_text())
        old, new = change["before"], change["after"]
        if new in content:
            if content.count(new) != 1:
                errors.append(f"Ambiguous completed semantic patch: {change['label']}")
        elif content.count(old) == 1:
            content = content.replace(old, new, 1)
        else:
            errors.append(f"Source revision conflict: {change['label']}")
        semantic_texts[path] = content
    for path, content in semantic_texts.items():
        if content != path.read_text():
            pending.append((path, content.encode()))

    if errors:
        raise SystemExit("No files written. Resolve these conflicts first:\n" + "\n".join(errors))
    if not args.apply:
        print(f"PASS: {len(manifest['cards'])} cards; {len(pending)} files would change. Dry-run only.")
        return
    # Every guard has passed before the first write. Replacement is atomic per file.
    for path, data in pending:
        atomic_write(path, data)
    print(f"PASS: installed {len(pending)} files for {len(manifest['cards'])} cards. No commit or deployment.")


if __name__ == "__main__":
    main()
