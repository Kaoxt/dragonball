# DBZ Tabletop — Score Entertainment CCG

A lightweight browser tabletop for the **original Score Entertainment Dragon Ball Z Collectible Card Game**. Uses the Buu Saga rulebook as its guidance baseline. This is not Fusion World, Panini, the 2005 remake, or a full automated rules engine.

## Included

- Private two-player rooms, chat, reconnecting, and solo practice controlling both seats.
- Main Personality stack (levels 1–3, 4, or 5), manual MP level / anger / power-stage counters, Mastery and Sensei cards, declared Tokui-Waza.
- Life Deck, hand, Combat, Non-Combat, Drills, Allies, Dragon Balls, Battleground/Location, discard, removed-from-game, and private Sensei Deck areas.
- Three-card draw, single-card damage flips, private deck searches, shuffling, rejuvenation, and manual card movement.
- Pre-game Sensei swaps select all choices together, reveal selected cards, exchange against the original top Life Deck cards, and shuffle once. Card eligibility/capacity remains manual.
- Original seven-step turn guidance: Draw, Non-Combat, Power Up, Declare, Combat, Discard, Rejuvenation. Declare/skip Combat controls the path.
- Power-up helper uses imported MP PUR (+1 for declared Tokui-Waza) and gives Allies one stage. Counters can be adjusted for exceptions. Starting stage count defaults to five; apply Double Power manually.
- Controller-authorized Dragon Ball transfer for captures; no arbitrary manipulation of the opponent's private cards.
- Desktop drag/drop and mobile tap/select/move controls.

There is no pre-dealt opening hand, separate life pile, energy zone, or automatic mulligan. Host chooses the first player after players resolve alignment and Double Power. At five anger, players manually resolve level changes, reset anger, adjust stages, discard applicable Drills, and check Most Powerful Personality victory. PAT, costs, Endurance, Dragon Ball damage exceptions, combat action timing, card-specific effects, and all victory conditions stay manual. Flip damage one card at a time so effects can be resolved between flips. There is no automatic rules legality or card-type detection.

The home page contains site news. Play is available at `/play/`; legacy root room invitations redirect to the Play page. The shared card catalog lives at `/cards/`, and the deck builder at `/decks/`. Practice decks still use placeholder MP levels and repeated cards. For actual play, build from the available collection or import your Score card list and optional image URLs. New Score rooms use a separate server namespace and cookie; old Fusion World room links and deck imports are not compatible.

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

1. Open **Workers & Pages**, create a Worker, and connect **Kaoxt/dragonball** through the Git repository flow.
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

Text import: enter comma-separated Main Personality card IDs in consecutive level order, and optional Mastery, Sensei, and Tokui-Waza. Paste only the cards shuffled into the Life Deck:

```text
3 SAIYAN-001 Card name
3 SAIYAN-002 Another card
```

Use set-qualified IDs to distinguish repeated card numbers. Names are optional. JSON supports fuller metadata:

```json
{
  "personalities": [
    {"id":"GOKU-L1", "name":"Goku level 1", "pur":2, "maxStages":10, "image":"https://your-art-host/level1.webp"},
    {"id":"GOKU-L2", "name":"Goku level 2", "pur":3},
    {"id":"GOKU-L3", "name":"Goku level 3", "pur":3}
  ],
  "mastery":{"id":"YOUR-MASTERY"},
  "sensei":{"id":"YOUR-SENSEI"},
  "tokui":"Red",
  "senseiDeck":[{"id":"YOUR-SENSEI-CARD", "qty":1}],
  "cards":[{"id":"SAIYAN-001", "name":"Your card", "qty":3, "image":"https://your-art-host/card.webp"}]
}
```

This is a schema example, not a legal or complete deck. `pur` defaults to 1 and `maxStages` to 10; verify imported personality values. The importer warns on the normal 50–85 total size (90 for Namekian Tokui-Waza) including starting MP/Mastery/Sensei cards, and warns on more than three copies. Warnings can be overridden for card or format exceptions; they are not tournament validation. Sensei Deck capacity, Named cards, Dragon Ball sets, alignment, and other restrictions are checked by players. Up to 90 Life Deck and 90 Sensei Deck cards are accepted as technical bounds, not as a statement of legality.

Missing images fall back to names and IDs. Use artwork you are entitled to use. Images are fetched directly from imported HTTPS URLs with no referrer; arbitrary HTML/scripts are never rendered.

## Resource and privacy design

Static HTML/CSS/JS plus one Cloudflare Durable Object per room using hibernating WebSockets. No containers, image generation, or game-state polling. State persists after actions. Rooms expire after seven days without game/join activity; logs are capped at 80 entries. Creation/join is limited to ten requests/minute/IP per Cloudflare location, and sockets to 35 actions/10 seconds/connection with 48 KB messages. These controls are not a billing cap.

The server filters private hands, Sensei Decks, and Life Deck order per seat. Only the player who explicitly searches their Life Deck sees its sorted contents, and the search is logged. Shuffling uses Web Crypto with rejection sampling and refreshes card IDs. Invite links let the first visitor claim the second seat; there is no spectator role. Keep invites private. Lost cookies require a new room.

## Validation

```sh
npm test
npm run check
npx playwright install chromium
npm run test:e2e
```

Unit tests cover Score setup, Life Deck damage, private information, batch Sensei swaps, turn branches, rejuvenation, manual counters, captures, and old-format rejection. Browser tests cover two-player play/resume, chat escaping, full-room rejection, and mobile controls.

## Rules reference

[Score Buu Saga rulebook archive](https://retrodbzccg.com/rules/dragon-ball-z-ccg-rulebook-buu-saga/) · [Original Score rulebook PDF](https://lackeyccg.com/dbzccg/dbzccg_rules.pdf)

Guidance checked October 8, 2026. Agree on your format and applicable rulings before play. Unofficial fan project, not affiliated with Score Entertainment or the Dragon Ball rights holders.

## Deck builder and home

The home page uses static news posts with expandable details and shared responsive navigation. Edit `public/index.html` to publish news. No admin or posting service is required.

The deck builder imports `public/cards/catalog.js`, so future catalog additions appear automatically. It supports filtering, card previews, quantity controls, Main Personality levels, Mastery, Sensei, Life Deck and Sensei Deck, named decks, duplication, deletion, and JSON export. Decks autosave to `score-builder-v1` in this browser; there is no account or cross-device sync. Export backups before clearing browser data. Tabletop “Load deck” includes a saved-deck picker on the same origin.

Deck checks reuse the tabletop importer's guidance and flag missing MP levels. They are advisory, not format legality enforcement. Published personality level and PUR metadata are retained; verify cards with missing metadata manually.
