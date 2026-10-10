# Environment textures and sky

All files are 1K versions from [Poly Haven](https://polyhaven.com), published
under CC0 (public domain; no attribution required). They were downloaded
through the Poly Haven API on 2026-10-10.

| File(s) | Poly Haven asset | Used for |
|---|---|---|
| `cracked_concrete_diff_1k.jpg`, `cracked_concrete_nor_gl_1k.jpg` | [cracked_concrete](https://polyhaven.com/a/cracked_concrete) | Accra and Kumasi court and street |
| `red_laterite_soil_stones_diff_1k.jpg`, `red_laterite_soil_stones_nor_gl_1k.jpg` | [red_laterite_soil_stones](https://polyhaven.com/a/red_laterite_soil_stones) | Village and School court and ground |
| `asphalt_02_diff_1k.jpg`, `asphalt_02_nor_gl_1k.jpg` | [asphalt_02](https://polyhaven.com/a/asphalt_02) | London court and street |
| `yellow_plaster_diff_1k.jpg` | [yellow_plaster](https://polyhaven.com/a/yellow_plaster) | Accra walls |
| `worn_plaster_wall_diff_1k.jpg` | [worn_plaster_wall](https://polyhaven.com/a/worn_plaster_wall) | Kumasi and School walls |
| `clay_plaster_diff_1k.jpg` | [clay_plaster](https://polyhaven.com/a/clay_plaster) | Village walls |
| `brick_wall_02_diff_1k.jpg` | [brick_wall_02](https://polyhaven.com/a/brick_wall_02) | London walls |
| `rusty_corrugated_iron_diff_1k.jpg` | [rusty_corrugated_iron](https://polyhaven.com/a/rusty_corrugated_iron) | Ghana tin roofs |
| `sky_1k.hdr` | [kloofendal_48d_partly_cloudy_puresky](https://polyhaven.com/a/kloofendal_48d_partly_cloudy_puresky) | Sky background and image-based lighting |

About 11 MB in total. Each arena loads only the textures it uses. Buildings,
kiosks, palms, power lines, lamps and court borders are built in code in
`src/environment.jsx`; those are environment props, not characters.
