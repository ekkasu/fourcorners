# Arena props

CC0 (public domain) models from [Poly Haven](https://polyhaven.com), downloaded
on 2026-10-10 as 1K glTF. Each was compressed with `@gltf-transform/cli`
(`optimize`: meshopt geometry, WebP textures resized to 512 px; the fence at
1024 px so its thin wire stays visible).

| File | Poly Haven asset | Used in |
|---|---|---|
| `plastic_monobloc_chair_01.glb` | [plastic_monobloc_chair_01](https://polyhaven.com/a/plastic_monobloc_chair_01) | Ghana arenas, School chair rows |
| `plastic_crate_01.glb` | [plastic_crate_01](https://polyhaven.com/a/plastic_crate_01) | Stacked drink crates |
| `Barrel_01.glb` | [Barrel_01](https://polyhaven.com/a/Barrel_01) | Water drums |
| `old_tyre.glb` | [old_tyre](https://polyhaven.com/a/old_tyre) | Street clutter |
| `plastic_jerrycan.glb` | [plastic_jerrycan](https://polyhaven.com/a/plastic_jerrycan) | Beside kiosks and drums |
| `painted_wooden_bench.glb` | [painted_wooden_bench](https://polyhaven.com/a/painted_wooden_bench) | Spectator benches |
| `trashbag.glb` | [trashbag](https://polyhaven.com/a/trashbag) | Street corners |
| `power_box_01.glb` | [power_box_01](https://polyhaven.com/a/power_box_01) | Accra and Kumasi street |
| `grass_medium_01.glb` | [grass_medium_01](https://polyhaven.com/a/grass_medium_01) | Village and School edges |
| `modular_chainlink_fence.glb` + `chainlink_wire_opacity.png` | [modular_chainlink_fence](https://polyhaven.com/a/modular_chainlink_fence) | East Legon Cage arena (the glTF's wire texture is a JPEG, so its opacity map is shipped separately) |
| `street_lamp_01.glb` | [street_lamp_01](https://polyhaven.com/a/street_lamp_01) | East Legon Cage street lamps |
| `metal_trash_can.glb` | [metal_trash_can](https://polyhaven.com/a/metal_trash_can) | East Legon Cage |
| `utility_box_01.glb` | [utility_box_01](https://polyhaven.com/a/utility_box_01) | East Legon Cage |

Placement lives in `src/environment.jsx` (`PROP_SETS`).
