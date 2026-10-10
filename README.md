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

## What's playable

**Training** (offline, against three AI rivals):

- Drop-ball kick-off: everyone races for the ball. Run onto it or slide-tackle to win it.
- Dribble, sprint, and hold shoot to power a shot (power and lift grow with the charge).
- Shoot without the ball to slide-tackle.
- Rivals defend their goals, press, tackle, dribble and shoot at you and at each other.
- Choose the rival difficulty (Easy / Normal / Hard) and how many goals knock a player out (1, 2, 3 or 5).
- Knocked-out players leave the court. Win by being the last corner standing.
- Five arenas: Accra, Kumasi, Village, School (Ghana) and a London cage.
- Phones: landscape full-screen play with a joystick, SHOOT/TACKLE and SPRINT buttons.
- Synthesized Afrobeat match music, crowd sound and effects; fans in corner colours.

Free-for-All, Duo Battle and Private Room are menu prototypes. The room server handles joining and presence, but
online play is not authoritative yet.

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

- Online play is not server-authoritative, and has no matchmaking, accounts, anti-cheat or voice chat.
- No female footballer model yet (Female uses a casual model).
- Physics and AI are game-feel approximations, not a full football simulation.
