# Impact Hammer

Reference-inspired low-poly melee weapon. 1,664 triangles, five PBR material regions, unique packed UV atlas (UV_Atlas_0). Materials use flat colors; no baked texture maps.

- impact-hammer.blend: editable source; Game Asset scene contains the export assembly.
- impact-hammer.glb: game asset, body and separate IH01_PISTON, with IH01_GRIP_SOCKET and IH01_MUZZLE attachment nodes. Blender Z up, forward -X; 1.18 metre overall length.
- uv-layout.svg: 2048-square UV painting guide.
- preview.png: original studio preview.

Weapon 4 is always available. Hold left mouse to charge (1.25 seconds); contacting an opponent discharges automatically, or release to strike. Damage scales from 35 to 135 over a 2.15 metre reach. Right mouse performs repeated quick strikes (25 damage, 0.3-second interval) and redirects nearby incoming rockets in the aiming direction. Charged downward strikes against nearby ground launch the player upward and cost 15-35 health. Primary recovery is 0.65 seconds. Spawn protection ends when charging or striking.

Combat runs on the server, including wall occlusion, damage, cooldowns, and rocket ownership changes. Both first-person and remote player models animate the piston. Bots retain their existing weapon selection. This is an interpretation of UT99 behavior, with local balance values.

Builds copy the GLB into public/assets/weapons. Run npm test, npm run check, npm run build. With the dev server on port 3034, node tools/hammer-browser.mjs checks selection, model loading, charge/release, secondary input, and browser errors.
