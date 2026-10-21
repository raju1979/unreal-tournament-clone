# Rocket impact explosion

The editable Blender scene contains a short Mantaflow fuel burst, outward source velocities, turbulent fire, and rolling smoke. Its 64-cell base simulation uses 2x noise detail. The simulation renders to transparent PNG frames; Babylon plays those frames at every authoritative rocket explosion in all four arenas.

## Deliverables

- `rocket-explosion.blend`: editable simulation, volume material, lighting and orthographic camera.
- `build_explosion.py`: reproducible bake, render and atlas builder.
- `rocket-explosion.png`: 8-by-5 sprite sheet of 40 RGBA frames, each 384 pixels square.
- `animation.json`: playback and camera calibration. The same builder writes `shared/explosion-settings.ts`.
- `frames/`: individual transparent renders.
- `reference.png`: supplied appearance reference.
- `game-fire.png`, `game-smoke.png`, `game-wall.png`: controlled previews rendered in the daylight arena using the actual CombatEffects class.

The browser uses one shared texture, camera-facing sprites, normal alpha blending, and terrain depth testing. Each impact advances independently at 25 fps for 1.6 seconds and fades its smoke during the final half second. Random mirroring and a small size variation reduce repetition. At most 24 flipbook explosions coexist; each sprite is disposed after playback. The existing brief flash, light pulse, shockwave and flying embers accompany the animation. The previous procedural puffs remain a fallback while the atlas loads.

This is a simulated fire-and-smoke effect inspired by the supplied image, rather than an exact photographic reproduction. Baked sprites keep the simulation cost off the VPS and browser. Their view is a billboard rather than a freely orbitable volume.

## Rebuild

From the project root:

```powershell
& 'C:/Program Files/Blender Foundation/Blender 5.2/blender.exe' -b --python 3d/effects/rocket-explosion/build_explosion.py
npm run build
```

`-- --render-only` reuses the existing local bake; `-- --preview-only` renders frames 10 and 24. The generated `cache/` directory is excluded from Git because it contains large reproducible simulation files. Keep the Blender scene, builder, metadata, atlas and PNG frames in Git. The game only needs the atlas, copied to `public/assets/effects/` by the build. To scrub the simulation after cloning the project, run the builder to regenerate the local cache.

Run `npm run check`, `npm test`, `npm run build`, and `node tools/explosion-browser.mjs` with the development server running. The browser check exercises independent impact timelines, normal playback, the loading fallback, the concurrent-effect cap, disposal, and daylight fire/smoke rendering.
