# Site design versions

Version 2 is the default site design. It retains the existing playmat background image and luminosity blend, with a lighter charcoal overlay. Its 56px navigation uses the reviewed card-title brush silhouette, dark fringe and soft shadow. Logo sizing and the existing two-line hamburger are preserved from the approved preview.

The site footer offers **Version 1** and **Version 2**. A choice is saved in this browser and applies across pages. Direct links `/?design=v1` and `/?design=v2` override that preference. Header links also carry the choice when browser storage is disabled.

Version 2 also loads `public/surfaces-design.css`: dark card power-box frames around main content panels, card-title brush headings, aligned forum rows, and neutral striped rulebook tables. The compact chamfered corners, subtle silver rails, and faint perimeter detail come from the native nine-slice SVG `public/assets/power-panel-v2.svg`; the central reading area stays smooth charcoal. This framing covers news, sidebar, forum, account, lobby, deck and rulebook chapter panels. Smaller controls and nested tables keep quieter borders to avoid stacked decorative frames. The border does not clip content or post-action menus and does not change the 56px navigation. Calculator selections retain their high-contrast highlights and wide tables keep horizontal scrolling. The account name has a transparent resting background and a dark grey hover state. All companion surface rules are screen-only and scoped to Version 2; Version 1 and printed rules retain their original styles.

The preceding Version 2 panel style is saved at commit `4125c31a4a08f388baba10468aa166c0e107b6c0` if the power-box experiment needs to be reverted independently of the navigation.

Version 1 remains in `public/navigation.css` and the original background styles. Those files are unchanged. Every new design rule is scoped to `html[data-site-design=v2]`, so choosing Version 1 immediately restores the original header and background without replacing any source or account/game data.

Before Version 2: commit `15aff432b55d8b8962670abebda5f219a59f4d2d`. To restore Version 1 as the default for new visitors, change the fallback in `public/navigation-design.js` from `v2` to `v1`. Existing browser preferences continue to work.
