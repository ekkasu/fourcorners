# Four Corners: Street Football

A street-football web game built with **React**, **Three.js / React Three Fiber** and **Vite**, with **Firebase Authentication, Firestore and Realtime Database**. Four players each defend their own corner goal and attack the other three. Concede too many
goals and you're out. The last one standing wins.

## Run locally

Install Node.js 24.12+ and run:

```bash
npm install
npm run dev
```

Open `http://localhost:5173`. For accounts and private rooms, configure the server-only Firebase Admin credential and run `npm run server` in a second terminal.

To play on a phone on the same Wi-Fi, open `http://<your-computer's-IP>:5173`.

## Run in production

```bash
npm install
npm run build
npm start
```

`npm start` runs `server/index.js`, which serves the built game from `dist/` (gzip-compressed, with long caching for
hashed files) and the Firebase API on `$PORT` (default 3001). `/healthz` answers `ok`.

### Deploy to Vercel

`vercel.json` builds the frontend and deploys `api/handler.js` as a Node 24 function.
Firebase hosts authentication and all persistent data. Private-room state and controls
sync through Realtime Database; no separate WebSocket server or Render service is needed.
See Firebase setup below for the server credential and security rules.

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

**Private Room** supports 2–4 friends in a Firebase-synchronized match. Create a room, share its six-character code, choose the court and goals to eliminate, and have everyone ready up. The host starts the match. Everyone shares the ball, player movement, goals, lives, timer and result. Unused corners are walls. Disconnected players are eliminated. The host must keep the game open; if the host leaves, create a new room. After the result, the room reopens for a rematch.

Online controls: WASD/arrows or the touch joystick to move; Shift/SPRINT to sprint; hold and release Space/SHOOT to charge a shot; shoot without possession near the ball to tackle. Online uses free-play dribbling and a shared sideline camera that follows the ball. Offline skill moves, curved shots, replays and career XP are not part of online matches yet. Duo Battle is coming soon.

Friends can join the deployed game from different networks using a room invite link. Localhost links only work on the host computer.

## Project layout

| Path | What it is |
|---|---|
| `src/main.jsx` | App, game loop, rival AI, characters, crowd, controls |
| `src/environment.jsx` | Arenas: surfaces, buildings, props, court borders, sky |
| `src/sound.js` | Synthesized sound effects, music and crowd ambience (Web Audio) |
| `public/models/` | Footballer GLBs and retargeted animation clips (see its README for sources and licences) |
| `public/textures/env/` | CC0 Poly Haven textures and sky (see its README) |
| `tools/retarget-mixamo.mjs` | Converts Mixamo FBX clips into `public/models/footballer-moves.json` |
| `server/index.js` | Local Firebase API and static server |
| `src/firebase-rooms.js` | Firebase room transport and host simulation |

## Assets and licences

- Footballers: CC0 "Cartoon Soccer Player" red and blue kits from vibeassets.io.
- Casual characters: CC0 Grab3D models.
- Textures and sky: CC0 from Poly Haven.
- Animations: Mixamo clips, retargeted. Mixamo animations may be used in games but not redistributed on their own,
  so the raw FBX files (`assets-src/mixamo/`) are not in this repository. Download them from Mixamo and run
  `node tools/retarget-mixamo.mjs` to rebuild the clips.

## Not production-ready

- Private matches use host simulation with Firebase state synchronization. There is no public matchmaking or voice chat.
- No female footballer model yet (Female uses a casual model).
- Physics and AI are game-feel approximations, not a full football simulation.

## Multiplayer validation

Run `npm test` for simulation, graphics and navigation checks. Cloud integration should verify two Firebase identities can create/join/ready/start, share state and controls, and save results once. Outsiders must be unable to read rooms; guests must be unable to write another player’s controls or the host state. Run `FC_API_BASE=https://fourkorners.online node tests/firebase-client-integration.mjs`
to verify movement and synchronized player positions using two isolated guest clients,
including a device clock difference, immediate local movement, direction reversals,
smooth playback between packets, and stopping. Temporary guest accounts are cleaned up afterward.
Private matches predict the local player's movement using the host's movement model,
reconcile acknowledged inputs, and buffer remote players and the ball for smooth playback.
The previous WebSocket integration script is legacy and no longer applies.

The default Uncompleted Building court uses the exposed sandcrete walls, empty openings, lintels, rebar and timber supports in [this Adenta New-Legon photo reference](https://ghanaproperty.org/africa/ghana/greater-accra-region/property/3-bedroom-uncompleted-house-for-sale-at-adenta-new-legon-1) as architectural inspiration. The arena is original 3D geometry and procedural materials; the listing photographs are not included in the game.


## Firebase accounts and Vercel API

The current account backend runs as a Vercel Node function at `api/handler.js`.
Firebase Authentication handles email/password sign-in, persistent browser sessions,
and password-reset emails. Firestore stores public player profiles, match tickets,
match totals, duplicate-result records and rate limits. The client uses Firebase
ID tokens; the server verifies project identity and revocation before any write.
Emails and passwords are never stored in public profiles.

### Deployment checklist

1. In Firebase project `fourkorners-46cfc`, enable Email/Password and Anonymous Authentication (for guest rooms).
2. Create the default **Cloud Firestore** database in **production mode**. Deploy
   `firestore.rules` and `firestore.indexes.json` using the Firebase CLI from an
   authorized owner account (`firebase deploy --only firestore --project fourkorners-46cfc`).
3. In Vercel project `fourcorners`, add `FIREBASE_SERVICE_ACCOUNT_JSON` as a sensitive
   server-only environment variable for the intended deployment environments. Its
   value is the Firebase service-account JSON with Auth verification and Firestore
   access. Never commit it or expose it using a `VITE_` variable. A project owner
   must provision the credential; do not paste it into chat.
4. Use Node.js 24.x. Deploy the branch and verify a preview before promoting to
   production. The account API runs directly on Vercel; `ACCOUNT_SERVER_URL` is
   no longer needed. `VITE_ROOM_SERVER_URL` is also unused.
5. Add `fourkorners.online` and `www.fourkorners.online` to Firebase Authentication's
   authorized domains. Add the exact preview hostname if testing OAuth there later.
6. Create Realtime Database in locked mode at the URL in `src/firebase.js` and
   `server/firebase-admin.js`. Publish `database.rules.json`. The Vercel API manages
   room membership, settings and frozen match rosters. Members write only their own
   inputs and presence; the host writes snapshots. Room codes expire after one hour.

Local development: configure the server-only Admin credential in your shell and
run `npm run server` plus `npm run dev`, or build then `npm start`. Never place
Admin credentials in client code. Tests for transactional result logic run without
cloud credentials using an in-memory database adapter. Cloud integration tests
must also verify deployed indexes and security rules.

### Scoring and session behavior

Signed-in completed solo and multiplayer matches update the same Firebase UID.
Wins earn 3 points and multiplayer draws earn 1. Leaderboard ties use wins, goals,
then username. Solo match tickets persist across serverless instances and expire
after an hour. Ticket consumption and score updates occur in one Firestore
transaction. Both solo results and multiplayer host results are client-reported with
identity, roster, elapsed-time, score bounds and duplicate checks. This prevents
accidental duplicate points, but is not a cheat-proof competitive ranking system.
Use trusted Firebase compute for simulation before offering prizes or ranked tournaments. Offline guest results are not imported.

Firestore denies all direct browser reads/writes; account APIs expose only public
profile fields. `matchTickets.expires`, `apiLimits.expires` and room `meta.expires`
are epoch milliseconds. An admin cleanup job can remove expired records; configure
Firestore TTL only after converting these fields to Firestore timestamps. Rate limiting is stored in Firestore, rather than an individual function's RAM.

### Existing SQLite accounts

The prior SQLite implementation remains in `server/accounts.js` for export and
regression tests. It is no longer used by the running account API. Keep a backup
of `server/data/accounts.sqlite` from the old server before switching. Old accounts
only had usernames and no email addresses, so they cannot be silently converted
to Firebase email logins or safely matched to new users by username alone. A
separate verified ownership migration is needed before transferring historical
points. This deployment does not delete the old database or import unverified scores.

The `jwks-rsa` override keeps Firebase Admin compatible with Vercel runtimes
that disable CommonJS `require()` of ESM. Tests run with that behavior disabled
to catch startup regressions. No Analytics SDK is initialized.
