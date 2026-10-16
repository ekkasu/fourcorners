# Training character assets

`female-optimized2.glb` and `male-optimized2.glb` are optimized versions of
Grab3D's [Casual Woman](https://grab3d.com/models/characters/woman/) and
[Casual Man](https://grab3d.com/models/characters/man/) rigged GLBs. Grab3D
releases these models under CC0 1.0 for commercial and personal use.

The source files were about 13 MB each. These browser versions are about 2 MB
each, with textures resized to 1024 px and geometry simplified. They contain
walk and run clips. The app derives a still idle pose from the walk clip and
uses run for jog and sprint with different playback speeds.

These are clothed technical replacements for the old geometric figures. They
wear casual clothes, not football jerseys, shorts, socks or boots. Dedicated
football character assets and dribble/shoot animations remain necessary.

## Red-kit footballer pilot

`footballer-red.glb` is the controlled player's current model in training and
the arena preview. It is the combined GLB from [Cartoon Soccer Player - Red Kit](https://vibeassets.io/a/ggg93machr)
on vibeassets.io, asset ID `ggg93machr`.
The publisher marks it CC0 (public domain; no attribution required). The file
contains one skinned mesh, one skeleton and two in-place clips, `Walk` and
`Run`. It is about 555 KB. The game holds the first frame of `Walk` as an idle
pose, plays `Walk` for normal movement and `Run` for sprinting.

Only the controlled male player uses this pilot. Selecting Female still uses
the casual Grab3D woman. RIVAL 1 uses the blue kit (below); the other rivals
still use the casual Grab3D models.
The jersey color option does not yet change this footballer. It has no native
idle, dribbling or shooting clips and no female variant. Its cartoon
proportions are the source asset's design and remain below the original
high-detail target.

## Blue-kit footballer (one rival)

`footballer-blue.glb` is the combined GLB ("character with all animations")
from [Cartoon Soccer Player - Blue Kit (rigged)](https://vibeassets.io/a/6o7y1jytiy)
on vibeassets.io, asset ID `6o7y1jytiy`. The publisher marks it "CC0, public
domain. No attribution needed." The page does not name an author.

It was checked against `footballer-red.glb` before integration:

| | Red | Blue |
|---|---|---|
| File size | 554,860 B | 588,028 B |
| Skinned meshes / skeletons | 1 / 1 | 1 / 1 |
| Joints | 24 | 24, same names and order |
| Clips | `Walk` 1.07 s, `Run` 0.67 s | `Walk` 1.07 s, `Run` 0.67 s |
| Height | 1.80 m | 1.80 m |
| Triangles | 8,344 | 8,336 |
| Texture | one JPEG | one JPEG |

It renders at the same scale (1.0) as the red player. Only **RIVAL 1** (north,
`[0,0,-6]`) uses it. RIVAL 2 and RIVAL 3 still use the casual Grab3D man and
woman. Rivals are static, so in-game the blue model only shows the held
first frame of `Walk` and faces +Z (toward the south goal and camera). Its
`Walk` and `Run` clips were checked by temporarily putting it on the
controlled player in offline training. Both played and the model turned to
face the direction of travel. The swap was then reverted.

## Still missing

- The vibeassets models' Walk and Run are their own clips; everything else (idle, dribble, kicks,
  tackle, celebrations) comes from Mixamo, retargeted.
- Online players still use the casual Grab3D man.
- The cartoon models (and the more realistic Shannon) do not meet the original high-detail target.

## Footballer moves (Mixamo)

`footballer-moves.json` (blue kit) and `footballer-moves-red.json` (red kit) hold six animation clips retargeted onto the
footballer rig by `tools/retarget-mixamo.mjs`. The two models have slightly different bone rest rotations, so each gets its own retargeted copy. The sources are
Mixamo FBX files ("Without Skin", 30 fps) in `assets-src/mixamo/`, downloaded
on 2026-10-10 with the project owner's Adobe account:

| Clip in game | Mixamo animation | Used for |
|---|---|---|
| `idle` | Offensive Idle | standing still |
| `dribble` | Dribble | moving with the ball |
| `strike` | Strike Foward Jog | shooting while moving; rival shots and clearances |
| `penalty` | Soccer Penalty Kick | shooting from a standstill |
| `tackle` | Soccer Tackle (slide) | a rival winning the ball |
| `celebrate` | Victory (first 2.6 s) | after scoring |

Mixamo animations are free to use inside games, but the raw files may not be
redistributed on their own. Keep `assets-src/mixamo/` out of any public
repository. The retargeted clips ship only as part of the game.

The retargeting turns each footballer bone to match Mixamo's rest pose, copies
the per-frame rotations, strips forward hip travel so clips play in place, and
scales hip bounce to the footballer's height. The shot leaves the foot 0.18 s
after the button is released, which lines up with the contact frame of the kick
clips. The casual Grab3D models (Female, online players) do not use these clips.
Rerun the tool after adding or replacing FBX files:

    node tools/retarget-mixamo.mjs

## Female footballer (Mixamo "Shannon")

`footballer-female.glb` is Mixamo's **Shannon** character (white football kit: shirt, shorts, socks,
boots), downloaded on 2026-10-11 with the project owner's Adobe account as a T-pose FBX with skin
(`assets-src/mixamo/Shannon.fbx`, 52 MB, 145k vertices). `tools/build-female.mjs` turns it into a
1.5 MB GLB with about 12,500 vertices:

- converts FBX to glTF and scales it from centimetres to metres (1.79 m tall);
- removes skin hidden under the clothes, then simplifies the meshes (meshoptimizer);
- covers the "7" printed on the shirt back, since the game prints the player's own number;
- ships the body and hair textures once each, as 1024 px WebP.

Shirt, shorts, socks, boots, body and hair stay separate meshes, so the game colours each kit part
on its own (`dressFemale` in `src/main.jsx`). Her moves are the same Mixamo clips as the male
footballers, retargeted to her skeleton (`footballer-moves-female.json`), plus Mixamo
**Walking Forward** and **Standard Run** for locomotion, since she has no built-in clips.

Mixamo characters are free to use in games under Adobe's terms, but they are not CC0, and the
character files must not be redistributed on their own. Shannon's style is realistic, unlike the
cartoon footballers, so she looks more lifelike next to them.

Rebuild after changing the source:

    node tools/build-female.mjs
    node tools/retarget-mixamo.mjs female

## Celebrations and kit options

Four more Mixamo clips are retargeted to all three footballers for the Locker's goal
celebration choice: **Standing Backflip**, **Fist Pump** (high enthusiasm), **Rallying** (the
crowd) and **Hip Hop Dancing** (running man). **Victory** stays the default. Each rival uses one
of these too.

Shorts, socks and boots colours, and the player's name and number on the back of the shirt, are
applied at runtime with no extra assets. On the male model, a shader (`kitRegions`) separates the
parts by height in the bind pose. On the female model, each part is its own mesh.

## Crowd and music

The fans around the court reuse the two footballer models (no extra assets).
At load time the game bakes two poses per kit into static meshes: a standing
pose from `Walk`, and a hands-up pose from the Mixamo `celebrate` clip. It draws
them with one InstancedMesh per corner and pose. Fans wear their corner's colour
(red north, blue east, gold west, your jersey at the south corners). They sway
while watching and jump with arms up when their player scores.

The match music (an Afrobeat/highlife groove), the crowd murmur and all sound
effects are synthesized in `src/sound.js` with the Web Audio API. There are no
audio files.

## Athletic proportions and broadcast framing

The red and blue CC0 rigs now receive runtime proportion adjustments in
`src/player-proportions.js`: smaller heads, hands and boots, with a taller,
slimmer overall silhouette. The adjustment is restored before each animation
update, then applied afterward, so walk/run scale tracks and clip transitions
remain stable. Crowd poses bake the same proportions once before instancing.
No additional character meshes, textures or animation downloads are needed.

The shared offline/online broadcast camera uses a lower, closer angle, follows
the midpoint of the controlled player and ball, and widens to keep both visible.
