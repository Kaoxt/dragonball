# Saiyan Prepared Smash — Babidi Saga #30

This separate release fills the previously unpublished #30 using the user's
selected 2066 × 1412 artwork. The existing 99 Babidi cards, all earlier card
records, and all previous permanent deck ID positions are unchanged. The new
card and permanent ID are appended after the first Majin Buu release.

The selected illustration is retained byte-for-byte. Its optional middle-fist
correction was not applied; the user requested publication after that limitation
was disclosed. Card assembly adds no further crop or stretching. All existing
native frame, lettering, rules, marks, and footer positions are preserved.

`cards.json`, `source/`, and `audit/030.json` retain the original scan, CRD review,
approved artwork selection, geometry checks, and the independently reviewed
lossless exports. `release.json` describes the runtime entry and repository
paths. `checksums.json` pins the two exports and retained production evidence.
The original production `publication-manifest.json` remains a preparation record;
it does not claim a verified live deployment.

`integration-files.json` and `before/` preserve the exact previous bytes of each
modified existing file. `tests/helpers/pre-babidi-030.js` restores that state
before the Majin Buu, Movie 7 and older historical readers run. Earlier immutable release
manifests and `AGENTS.md` are unchanged.

Publish through the existing main → Security checks → verified production
package → Cloudflare workflow. The package builder includes the two committed
WebP files in the private card-storage manifest. Verify the live card route and
both image digests before reporting publication complete.
