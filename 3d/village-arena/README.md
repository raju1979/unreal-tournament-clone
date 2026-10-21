# Canal Village arena

The arena uses the supplied `../fantastic_village_pack_blend.blend` assets to create a dense outdoor village inspired by the reference image.

- 112 by 112 meter play area, 20 detailed houses and additional scenery beyond the boundary.
- A shallow canal, three stone crossings, two attached timber docks, boats and a watermill.
- Terracotta roofs, doors, windows, chimneys, planted yards, cobbled streets and a furnished market.
- Babylon.js adds daylight shadows, a sky gradient, clouds, moving water, chimney smoke and a courtyard campfire.
- Buildings are exterior scenery. Gameplay uses the generated solid house footprints, cover and bridge collision.

## Files

- `village-arena.blend`: editable assembly with packed full-resolution textures and a preview camera.
- `village-arena.glb`: game export with embedded textures reduced to 1024px where appropriate.
- `textures/roof-terracotta.png`: roof atlas derived from the pack's blue roof texture.
- `layout.json`: exported collision, spawn, pickup and chimney locations.
- `build_village.py`: deterministic scene builder; also writes `../../shared/village-layout.ts`.
- `game-preview.png`: screenshot from the running Babylon.js game.
- `preview.png` and `overview.png`: offline Blender previews.

## Rebuild

From the project root, run in PowerShell:

```powershell
& 'C:\Program Files\Blender Foundation\Blender 5.2\blender.exe' -b --python 3d/village-arena/build_village.py
npm run build
```

For a faster rebuild without the optional offline preview renders, append `-- --skip-preview` to the Blender command.

Edit the builder when changing the layout, then rebuild the scene and shared collision together. Restart the game server after changing collision data. `npm run build` copies the GLB to the public assets directory and creates the production client.

Choose **Canal Village** when creating a room. The first player selects that room's arena; later players receive the same map from the server.

## Verification

`npm test` includes spawn accessibility, three bridge crossings using actual player movement, and bot routes between canal banks. `node tools/village-browser.mjs` checks the rendered scene, asset coordinate alignment, room map, and three practice bots against the local development server.
