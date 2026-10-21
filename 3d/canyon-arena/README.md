# Sunspire Battle Arena

Original low-poly daylight arena inspired by the fifteen images supplied in `Downloads/arena-1`. `references.jpg` is a contact sheet of those images. The arena is modeled procedurally in Blender; no asset pack or external texture is needed.

## Assets

- `sunspire-arena.blend`: editable, portable Blender scene, including camera and midday lighting.
- `sunspire-arena.glb`: browser model, under 1 MB, with flat-color materials embedded.
- `build_canyon.py`: deterministic Blender builder for geometry and collision.
- `layout.json` and the project root's `shared/canyon-layout.ts`: generated game-space collision, spawns and pickups.
- `preview.png`: Blender render. `game-overview.png`, `game-courtyard.png` and `game-hangar.png`: camera previews captured in Babylon. `game-spawn.png`: live match capture.

## Layout

A 124-meter compound includes a circular service road, a central command tower, two combat decks at 1.4 and 3.4 meters, four stair approaches, four open hangars with rear passages, watchtowers, fuel silos, solar panels, cargo cover, planted areas and a faceted canyon backdrop. Lighting stays in daylight; there is no night cycle.

All four spawn positions, eight weapon spawn candidates, two health packs and four recurring ammo packs are shared with the authoritative server. Existing randomized ammo respawns apply here too. Bots can route through the hangars and up both decks. Hangar roofs, watchtower interiors and the central tower are scenery rather than additional playable floors. Doors stay closed or are modeled as open passages.

Collision uses shared boxes for structural surfaces and half-meter bands for the round platforms. Decorative handrails, trim and foliage crowns are visual detail. The GLB's X reflection is canceled by the client wrapper so source coordinates match server collision.

## Rebuild

From the project root:

```powershell
& 'C:/Program Files/Blender Foundation/Blender 5.2/blender.exe' -b --python 3d/canyon-arena/build_canyon.py
npm run build
```

Add `-- --skip-preview` to the Blender command to skip the offline render. Restart the game server after regenerating shared collision. Blender is not required on the VPS.

## Checks

Run `npm run check`, `npm test`, `npm run build`, and, with the dev server running, `node tools/canyon-browser.mjs`. Tests cover clear/reachable spawns and pickups, actual movement up all four staircases, an actual movement route from a hangar to the upper ring, wall and boundary collision, visual/collision floor alignment, the fourth arena menu option, daylight activation, and a live room with three moving bots.
