# Environment textures and sky

All files are 1K versions from [Poly Haven](https://polyhaven.com), converted from JPEG to WebP by
`tools/optimize-assets.mjs`, published
under CC0 (public domain; no attribution required). They were downloaded
through the Poly Haven API on 2026-10-10.

| File(s) | Poly Haven asset | Used for |
|---|---|---|
| `cracked_concrete_diff_1k.webp`, `cracked_concrete_nor_gl_1k.webp` | [cracked_concrete](https://polyhaven.com/a/cracked_concrete) | Kumasi court, and the street around Accra and Kumasi |
| `leafy_grass_diff_1k.webp`, `leafy_grass_nor_gl_1k.webp` | [leafy_grass](https://polyhaven.com/a/leafy_grass) | Accra grass court (colour removed in code and tinted pitch green, with mowing stripes) |
| `red_laterite_soil_stones_diff_1k.webp`, `red_laterite_soil_stones_nor_gl_1k.webp` | [red_laterite_soil_stones](https://polyhaven.com/a/red_laterite_soil_stones) | Village and School court and ground |
| `asphalt_02_diff_1k.webp`, `asphalt_02_nor_gl_1k.webp` | [asphalt_02](https://polyhaven.com/a/asphalt_02) | East Legon Cage court and street |
| `brick_wall_02_diff_1k.webp`, `brick_wall_02_nor_gl_1k.webp` | [brick_wall_02](https://polyhaven.com/a/brick_wall_02) | East Legon Cage walls |
| `clay_plaster_diff_1k.webp`, `clay_plaster_nor_gl_1k.webp` | [clay_plaster](https://polyhaven.com/a/clay_plaster) | Village walls; its grain (colour removed in code) under the painted walls of Accra, Kumasi and School |
| `rusty_corrugated_iron_diff_1k.webp`, `rusty_corrugated_iron_nor_gl_1k.webp` | [rusty_corrugated_iron](https://polyhaven.com/a/rusty_corrugated_iron) | Ghana tin roofs |
| `sky_1k.hdr` | [kloofendal_48d_partly_cloudy_puresky](https://polyhaven.com/a/kloofendal_48d_partly_cloudy_puresky) | Sky background and image-based lighting |

About 11 MB in total. Each arena loads only the textures it uses. Buildings,
kiosks, palms, power lines, lamps and court borders are built in code in
`src/environment.jsx`; those are environment props, not characters.
