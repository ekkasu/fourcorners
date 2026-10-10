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

## Still missing from both footballer models

- No female footballer. Selecting Female still loads the casual Grab3D woman.
- No native idle, dribble, shoot, kick, tackle or celebration clips. Idle is a
  frozen `Walk` frame, dribbling uses the normal locomotion clips, and
  shooting has no body animation.
- The jersey color option does not recolor either model, because each kit is
  baked into its texture.
- Rivals have no AI or movement, so their locomotion clips never play in-game.
- Online players still use the casual Grab3D man.
- The low-poly cartoon style is the source assets' design. It does not meet the
  original high-detail target.

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
