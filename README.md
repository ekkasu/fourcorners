# Four Corners: Street Football

A street-football web game built with **React**, **Three.js / React Three Fiber** and **Vite**, plus a lightweight
**WebSocket room server**. Four players each defend their own corner goal and attack the other three. Concede too many
goals and you're out. The last one standing wins.

## Run locally

Install Node.js 20+ and run:

```bash
npm install
npm run dev
```

Open `http://localhost:5173`. To try private rooms, also run `npm run server` in a second terminal.

To play on a phone on the same Wi-Fi, open `http://<your-computer's-IP>:5173`.

## Run in production

```bash
npm install
npm run build
npm start
```

`npm start` runs `server/index.js`, which serves the built game from `dist/` (gzip-compressed, with long caching for
hashed files) and the multiplayer rooms on `/ws`, on `$PORT` (default 3001). `/healthz` answers `ok`.

### Deploy to Vercel

`vercel.json` holds the build settings (`npm run build`, output `dist/`) and caching. Import the repository on
[vercel.com](https://vercel.com); every push to `main` redeploys. Vercel serves the game but cannot run the
multiplayer room server (it needs a long-running WebSocket server). Training and Free-for-All work fully; for
Private Rooms, host `server/index.js` elsewhere (for example Render, below) and set the Vercel environment
variable `VITE_ROOM_SERVER_URL` to its address, such as `wss://four-corners.onrender.com/ws`, then redeploy.

### Deploy to Render (free)

`render.yaml` describes the service. On [render.com](https://render.com): **New → Blueprint**, pick this repository,
and deploy. Every push to `main` redeploys. The free plan sleeps after about 15 minutes idle, so the first visit
afterwards takes 30–60 seconds to wake up.

### Shrinking assets

`node tools/optimize-assets.mjs` converts environment textures to WebP and compresses the casual character models.

## What's playable

**Free-for-All** (offline, against three AI rivals): a 3-minute match. When two corners remain it becomes a
final showdown (next goal wins). At full time the most lives wins; tied leaders go to golden goal. A results screen
shows your place, goals, shots, tackles won and time survived. A four-step tutorial appears on your first match
("How to play" on the Play screen reopens it).

**Training** (offline, no clock, against three AI rivals):

- Drop-ball kick-off: everyone races for the ball. Run onto it or slide-tackle to win it.
- Dribble and sprint (sprint stamina lasts about 3 s), and hold shoot to power a shot. Shots curve with Q/E or when you shoot while running across; on phones, swipe the SHOOT button to aim. Gentle aim assist helps shots near the goal.
- Two concrete blocks mark each goal, with physical block rebounds and no crossbar or net.
- Skill move (F, or SKILL on phones): a step-over feint that leaves nearby rivals stumbling, or a knock-on with a speed
  burst when sprinting.
- Rival personalities: RIVAL 1 is a Presser, RIVAL 2 a Wall, RIVAL 3 a Sniper. Rivals gang up on whoever leads on lives.
- Shoot without the ball to slide-tackle.
- Rivals defend their goals, press, tackle, dribble and shoot at you and at each other.
- Choose the rival difficulty (Easy / Normal / Hard) and how many goals knock a player out (1, 2, 3 or 5).
- Knocked-out players leave the court. Win by being the last corner standing.
- Five arenas: Accra, Kumasi, Village, School and the East Legon Cage.
- Phones: landscape full-screen play with a joystick, SHOOT/TACKLE and SPRINT buttons.
- Synthesized Afrobeat match music, crowd sound and effects; fans in corner colours.

**Private Room** supports 2–4 friends in a server-controlled match. Create a room, share its six-character code, choose the court and goals to eliminate, and have everyone ready up. The host starts the match. Everyone shares the ball, player movement, goals, lives, timer and result. Unused corners are walls. Disconnected players are eliminated; the host role transfers to the next player. After the result, the room reopens for a rematch.

Online controls: WASD/arrows or the touch joystick to move; Shift/SPRINT to sprint; hold and release Space/SHOOT to charge a shot; shoot without possession near the ball to tackle. Online uses free-play dribbling and a shared sideline camera that follows the ball. Offline skill moves, curved shots, replays and career XP are not part of online matches yet. Duo Battle is coming soon.

For friends on the same Wi-Fi, run `npm run build` then `npm start`. Everyone must open `http://<host-computer-IP>:3001`, then join the same room. For friends on different networks, deploy this Node server to a publicly accessible host (for example the Render configuration above); localhost links work only on the host computer.

## Project layout

| Path | What it is |
|---|---|
| `src/main.jsx` | App, game loop, rival AI, characters, crowd, controls |
| `src/environment.jsx` | Arenas: surfaces, buildings, props, court borders, sky |
| `src/sound.js` | Synthesized sound effects, music and crowd ambience (Web Audio) |
| `public/models/` | Footballer GLBs and retargeted animation clips (see its README for sources and licences) |
| `public/textures/env/` | CC0 Poly Haven textures and sky (see its README) |
| `tools/retarget-mixamo.mjs` | Converts Mixamo FBX clips into `public/models/footballer-moves.json` |
| `server/index.js` | WebSocket room server |

## Assets and licences

- Footballers: CC0 "Cartoon Soccer Player" red and blue kits from vibeassets.io.
- Casual characters: CC0 Grab3D models.
- Textures and sky: CC0 from Poly Haven.
- Animations: Mixamo clips, retargeted. Mixamo animations may be used in games but not redistributed on their own,
  so the raw FBX files (`assets-src/mixamo/`) are not in this repository. Download them from Mixamo and run
  `node tools/retarget-mixamo.mjs` to rebuild the clips.

## Not production-ready

- Private matches use server-controlled input, physics and scores. There is no public matchmaking, account system or voice chat.
- No female footballer model yet (Female uses a casual model).
- Physics and AI are game-feel approximations, not a full football simulation.

## Multiplayer validation

Run `npm test` for simulation, graphics and navigation checks. With the game server running, run `TEST_WS_URL=ws://localhost:3001/ws node tests/multiplayer-integration.mjs` to verify four connected clients, host-only start, readiness, room capacity, shared snapshots, movement, disconnects and host migration.

The default Uncompleted Building court uses the exposed sandcrete walls, empty openings, lintels, rebar and timber supports in [this Adenta New-Legon photo reference](https://ghanaproperty.org/africa/ghana/greater-accra-region/property/3-bedroom-uncompleted-house-for-sale-at-adenta-new-legon-1) as architectural inspiration. The arena is original 3D geometry and procedural materials; the listing photographs are not included in the game.
