# Site design versions

Version 2 is the default site design. It retains the existing playmat background image and luminosity blend, with a lighter charcoal overlay. Its 56px navigation uses the reviewed card-title brush silhouette, dark fringe and soft shadow. Logo sizing and the existing two-line hamburger are preserved from the approved preview.

The site footer offers **Version 1** and **Version 2**. A choice is saved in this browser and applies across pages. Direct links `/?design=v1` and `/?design=v2` override that preference. Header links also carry the choice when browser storage is disabled.

Version 1 remains in `public/navigation.css` and the original background styles. Those files are unchanged. Every new design rule is scoped to `html[data-site-design=v2]`, so choosing Version 1 immediately restores the original header and background without replacing any source or account/game data.

Before Version 2: commit `15aff432b55d8b8962670abebda5f219a59f4d2d`. To restore Version 1 as the default for new visitors, change the fallback in `public/navigation-design.js` from `v2` to `v1`. Existing browser preferences continue to work.
