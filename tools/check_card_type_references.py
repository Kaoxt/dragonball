#!/usr/bin/env python3
"""Review legacy card terminology in final JSON/catalog/SVG text; never change mechanics."""
import argparse
import json
import re
from pathlib import Path
from xml.etree import ElementTree as ET

LEGACY = {'combat', 'event combat', 'non-combat', 'non combat', 'non-combat drill', 'non combat drill'}
DISPLAY = {'rules', 'modern_rules', 'display_rules', 'final_rules', 'modern_text', 'power', 'powers', 'power_text', 'rule_lines', 'rules_lines', 'lines'}
SOURCE = {'original_rules', 'original_text', 'source_text', 'crd', 'crd_notes', 'crd_entry', 'provenance', 'source', 'original', 'history'}


def review(text):
    text = re.sub(r'\s+', ' ', text)
    out = []
    if re.search(r'\bnon[ -]?combat\b(?!\s+(?:step|phase)\b)', text, re.I):
        out.append('Resolve Non-Combat category scope: Setup only, Drill, or Setup/Drill family.')
    for match in re.finditer(r'\bcombat\b(?=\s+(?:cards?\b|card-type\b)|\s*,?\s*(?:or\s+|and\s+)?(?:physical|energy|event)\b)', text, re.I):
        prefix = text[:match.start()].rstrip()
        if re.search(r'\b(?:physical|energy|event|non)[ -]?$', prefix, re.I):
            continue
        if re.search(r'\b(?:(?:during|after|before|entering|ending)(?:\s+(?:this|that|the|next|each))?|(?:once|twice)\s+per|(?:end|rest)\s+of(?:\s+(?:this|that|the))?)\s*$', prefix, re.I):
            continue
        out.append('Resolve Combat card reference: standalone Event type or broad three-type family.')
    if re.search(r'\bevent\s+combat\b', text, re.I):
        out.append('Use Event as the current standalone category.')
    return list(dict.fromkeys(out))


def inspect_json(value, where='$', coverage=None, display_context=False):
    coverage = coverage if coverage is not None else {'rule_fields': 0, 'category_fields': 0}
    out = []
    if isinstance(value, list):
        for index, item in enumerate(value):
            out += inspect_json(item, f'{where}[{index}]', coverage, display_context)
    elif isinstance(value, dict):
        for key, item in value.items():
            loc = f'{where}.{key}'
            if key in SOURCE or key.startswith(('original_', 'source_', 'crd_')):
                continue
            if key in {'type', 'category', 'card_type'} and isinstance(item, str):
                coverage['category_fields'] += 1
                if item.strip().lower() in LEGACY:
                    out.append((loc, f'Legacy public category: {item}'))
            elif key in DISPLAY or (display_context and key in {'text', 'value'}):
                if isinstance(item, str) or isinstance(item, list) and all(isinstance(t, str) for t in item):
                    content = item if isinstance(item, str) else ' '.join(item)
                    if content.strip():
                        coverage['rule_fields'] += 1
                        out += [(loc, message) for message in review(content)]
                else:
                    out += inspect_json(item, loc, coverage, True)
            elif isinstance(item, (list, dict)):
                out += inspect_json(item, loc, coverage, display_context)
    return out


def inspect_file(path, coverage=None):
    coverage = coverage if coverage is not None else {'rule_fields': 0, 'category_fields': 0}
    text = path.read_text()
    if path.suffix == '.svg':
        root = ET.fromstring(text)
        labels, out = [], []
        for element in root.iter():
            ident = element.get('id', '')
            label = element.get('aria-label', '') or ''.join(element.itertext())
            if ident == 'card-category' and label.strip():
                coverage['category_fields'] += 1
                if label.strip().lower() in LEGACY:
                    out.append((ident, 'Legacy printed category: ' + label))
            if re.match(r'^(?:(?:rules|power)(?:-line(?:-|$)|-text$)|card-(?:rules|power)$)', ident) and label.strip():
                labels.append(label)
                coverage['rule_fields'] += 1
        out += [('rules', message) for message in review(' '.join(labels))]
        return out
    if path.suffix in {'.js', '.mjs'}:
        text = re.sub(r'^\s*export\s+const\s+catalog\s*=\s*', '', text).strip().removesuffix(';')
    return inspect_json(json.loads(text), coverage=coverage)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('paths', nargs='+', type=Path)
    args = parser.parse_args()
    found, coverage = [], []
    for path in args.paths:
        counts = {'rule_fields': 0, 'category_fields': 0}
        for loc, message in inspect_file(path, counts):
            found.append({'file': str(path), 'location': loc, 'review': message})
        coverage.append({'file': str(path), **counts, 'manual_wording_review_required': counts['rule_fields'] == 0})
    print(json.dumps({'checked_files': len(args.paths), 'coverage': coverage, 'findings': found}, indent=2))
    # Missing/unrecognized wording must never look like a clean wording review.
    return 1 if found else 2 if any(row['manual_wording_review_required'] for row in coverage) else 0


if __name__ == '__main__':
    raise SystemExit(main())
