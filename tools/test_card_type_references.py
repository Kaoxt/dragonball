#!/usr/bin/env python3
import json
import tempfile
import unittest
from pathlib import Path
from check_card_type_references import inspect_file, inspect_json, review

ROOT = Path(__file__).resolve().parents[1]


class CardTypeReferences(unittest.TestCase):
    def test_standalone_and_explicit_list(self):
        for text in ['Name any Combat, Physical Combat or Energy Combat card.',
                     'Search your Life Deck for 1 Combat card.',
                     'Each Combat card you play gains damage.',
                     'This Combat card remains in play.',
                     'Discard any number of Combat cards.',
                     'Your next Combat card cannot be stopped.',
                     'This attack cannot be stopped by combat card defenses.']:
            with self.subTest(text=text):
                self.assertTrue(review(text))
        self.assertFalse(review('Name an Event, Physical Combat, or Energy Combat card.'))

    def test_timing_and_current_categories(self):
        for text in ['HIT: No other Physical Combat cards can be played for the rest of this Combat.',
                     'Once per Combat. Entering Combat. End of Combat.',
                     'During Combat cards in your hand cannot be discarded.',
                     'During the Non-Combat Step, play a Setup or Drill.',
                     'Search for an Energy Combat or Physical Combat card.']:
            with self.subTest(text=text):
                self.assertFalse(review(text))
        self.assertEqual(len(review('Name a Non-Combat card.')), 1)

    def test_legacy_public_types_and_source_exclusions(self):
        for category in ['Combat', 'Event Combat', 'Non-Combat', 'Non-Combat Drill']:
            self.assertTrue(inspect_json({'type': category}))
        self.assertFalse(inspect_json({'rules': 'Search for an Event.',
            'original_rules': 'Search for a Combat card.',
            'crd_entry': 'Name a Combat card.',
            'history': {'rules': 'Name a Non-Combat card.'}}))

    def test_power_fields_and_coverage(self):
        for record in [{'power': 'Name a Combat card.'}, {'powers': [{'text': 'Name a Combat card.'}]}]:
            counts = {'rule_fields': 0, 'category_fields': 0}
            self.assertTrue(inspect_json(record, coverage=counts))
            self.assertEqual(counts['rule_fields'], 1)
        counts = {'rule_fields': 0, 'category_fields': 0}
        self.assertFalse(inspect_json({'unknown_text': 'Name a Combat card.'}, coverage=counts))
        self.assertEqual(counts['rule_fields'], 0)

    def test_svg_identifiers_and_empty_extraction(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'card.svg'
            for ident in ['rules-line-1', 'power-line-1', 'rules-text', 'power-text']:
                path.write_text(f'<svg><path id="{ident}" aria-label="Name a Combat card."/></svg>')
                counts = {'rule_fields': 0, 'category_fields': 0}
                self.assertTrue(inspect_file(path, counts))
                self.assertEqual(counts['rule_fields'], 1)
            path.write_text('<svg><path id="unknown"/></svg>')
            counts = {'rule_fields': 0, 'category_fields': 0}
            self.assertFalse(inspect_file(path, counts))
            self.assertEqual(counts['rule_fields'], 0)

    def test_catalog_has_no_unreviewed_legacy_terms(self):
        text = (ROOT / 'public/cards/catalog.js').read_text()
        cards = json.loads(text.split('=', 1)[1].strip().removesuffix(';'))
        audit = json.loads((ROOT / 'docs/card-type-audit-2026-10-25.json').read_text())
        exceptions = {item['id']: item for item in audit['unresolved_references']}
        image_reviews = {item['id']: item['image'] for item in audit['missing_rules_image_reviewed']}
        for card in cards:
            with self.subTest(card=card['id']):
                self.assertFalse(inspect_json({'type': card['type']}))
                if not card.get('rules'):
                    self.assertEqual(card['image'], image_reviews.get(card['id']),
                        'Add current rules to the catalog or record an image wording review.')
                findings = inspect_json(card)
                if findings:
                    self.assertIn(card['id'], exceptions, 'Resolve new legacy references before publishing.')
                    self.assertEqual(card['rules'], exceptions[card['id']]['rules'],
                        'Changed ambiguous powers require a fresh semantic review.')
        self.assertTrue(set(exceptions).issubset({c['id'] for c in cards}))


if __name__ == '__main__':
    unittest.main()
