# Fusion Tabletop

A lightweight, browser-based **Dragon Ball Super Card Game: Fusion World** manual tabletop, built for the owner's Cloudflare Workers account. Unofficial fan project; not affiliated with Bandai or the Dragon Ball rights holders.

## Included in this first version

- Private two-player rooms with shareable invite links; browser seats use HttpOnly cookies.
- Server-side shuffling, hidden decks, private hands and life cards, and per-player state filtering.
- Text/JSON deck import, local deck draft saving, optional HTTPS artwork URLs, and front/back leader images.
- Opening six cards, one full-hand mulligan, eight life, random first player, and second-player energy marker.
- Hand, battle, combo, energy, drop, removed, leader, deck and life areas.
- Drag/drop on desktop; select-and-move controls on phones.
- Draw, shuffle, take life, Critical damage, deck search, ready/rest, flip, awaken/revert, temporary power, combo cleanup, marker adjustment, and concession.
- Charge/Main/End guidance, game log, chat, reconnection, and solo practice controlling both seats.

This is a **manual tabletop MVP**, not a full rules engine or the official digital game. No AI opponent, matchmaking, accounts, automatic card effects, or bundled searchable card/art catalog. Text imports show names/IDs; JSON may supply artwork URLs. Practice cards are clearly labeled placeholders, not playable official decks. Card legality, colors, skill conditions, victory conditions, costs, attack targets, and temporary effects are the players' responsibility. Each player controls their own cards; game-ending concessions are explicit.

## Run locally

Requires Node.js 22 or newer.

```sh
npm ci
npm run dev
```

Open the local URL. Use two different browser profiles (or one private window) for multiplayer testing. A seat is remembered in that browser for seven days. Reopen the same invite and choose **Join / resume this table**. One active tab per seat; a new connection closes the previous tab's connection. Rooms expire after seven days without gameplay/join activity. Practice is local and is not saved.

## Deploy on Cloudflare

Deploy this repository as a **Worker with static assets**, not as a Pages-only project: the game server requires a Durable Object. It can use the existing Workers Paid account.

### Connect this GitHub repository in Cloudflare

1. Open **Workers & Pages**, create a Worker, and connect **Kaoxt/dregonball** through the Git repository flow.
2. Choose the `main` branch and repository root.
3. Use `npm ci && npm test` as the build command and `npx wrangler deploy` as the deploy command. If dependencies are installed automatically, running `npm test` as the build command is also sufficient.
4. Keep the Worker name `dregonball`, matching `wrangler.jsonc`.
5. Deploy. Wrangler creates the `ROOMS` binding and SQLite Durable Object migration. Static assets are in `public`; there is no separate frontend build output directory.
6. Open the assigned `workers.dev` URL. Create a table, import a deck, and share the invite with a friend. A custom domain can be added later.

Dashboard wording may vary. The CLI route below is the equivalent deploy operation.

### CLI deployment

```sh
npm ci
npx wrangler login
npm test
npm run deploy
```

No Cloudflare credentials are stored in this repository. Deployment needs access to the owner's Cloudflare account. GitHub commits alone do not deploy until the Cloudflare Git integration is connected.

## Importing decks

Enter a leader ID separately, then one entry per line:

```text
4 FS01-02 Son Gohan
4 FS01-03 Son Goku
```

The snippet only demonstrates syntax; supply a complete 50–60-card deck. Names are optional. Or import JSON:

```json
{
  "leader": { "id": "FS01-01", "name": "Son Goku", "image": "https://your-art-host/front.webp", "backImage": "https://your-art-host/back.webp" },
  "cards": [ { "id": "FS01-02", "name": "Son Gohan", "qty": 4, "image": "https://your-art-host/card.webp" } ]
}
```

This is a schema example, not a complete deck. Missing/unavailable images fall back to readable card names/IDs. Use artwork you are entitled to host/use; no official images are copied into this repo. HTTPS image hosts are fetched directly by browsers with no referrer; the server does not proxy artwork. No arbitrary HTML or scripts are rendered.

## Resource and privacy design

- Static HTML/CSS/JS; no framework runtime, containers, image rendering, or polling for game state.
- One Durable Object per room using WebSocket **hibernation**, with automatic ping/pong handled without waking the object.
- Save after successful actions, not animation frames. Bounded 80-entry log; at most 60 deck cards per player. Seven-day inactive room cleanup.
- Room creation/join rate limit: 10 requests per minute per IP per Cloudflare location. Socket actions limited to 35 per 10 seconds per connection. Message size capped at 48 KB.
- Server enforces ownership and private information. Browsers never receive opponent hand identities, life identities, or deck order. Private deck search is explicitly logged; only the searching player gets the sorted card list.
- Shuffling uses Web Crypto random numbers with rejection sampling; hidden card IDs are refreshed to reduce tracking.
- Invite links are unguessable and let the first visitor claim the second seat. There is no host approval or spectator role. Keep invite links private. Lost browser cookies cannot recover seats; create a new room.
- The shared Workers allowance still applies; existing project usage and optional artwork hosting can add costs. Rate limits reduce accidental load but are not a billing cap or complete anti-abuse system. Review account usage before broadly advertising the service.

## Validation

```sh
npm test
npm run check
npx playwright install chromium
npm run test:e2e
```

Tests cover hidden-state filtering, ownership, setup/mulligan, search, shuffle, deck validation, phase progression, real two-browser WebSocket play, resume, third-player rejection, chat escaping, and mobile controls.

## Rules references

- [Official Fusion World rules](https://www.dbs-cardgame.com/fw/en/products/01_31.html)
- [English rule manual v1.20](https://www.dbs-cardgame.com/fw/pdf/rules/manual/fw_manual_EN_v1.20.pdf)
- [First-player draw rule update](https://www.dbs-cardgame.com/fw/en/news/01_62.html)

Guidance checked October 7, 2026. Card-specific effects and later errata take priority; consult the current official rules.
