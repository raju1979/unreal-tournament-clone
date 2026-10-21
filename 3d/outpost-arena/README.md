# Frostline Outpost

Third selectable arena, alongside Canal Village and Reactor. Choose **Frostline Outpost** in Battleground and use a new private room. The first player in a room chooses its arena; later arrivals use that same arena.

The supplied `source/arena.blend` and `source/UTCapture2_uv_tonemapped.png` remain the source assets. `outpost-arena.blend` is the packed, editable game version; `outpost-arena.glb` embeds the texture and includes four added supply containers. The captured architecture is about 30,000 triangles before added cover, with one 2048px color atlas.

The first version supports the main courtyard deck, four separated spawns, six possible weapon pickup locations, health/ammo pickups, bot navigation, and shared authoritative collision. Upper roofs and exterior attachments are scenery. The capture has incomplete backs and openings; collision confines play to its connected courtyard. This is an approximate box collision map derived from half-meter surface samples, rather than exact triangle collision. Small surface details aren't individual colliders.

`build_outpost.py` applies the original centimeter transform, scales architecture by 1.6, and places its main deck at game Y=0. It derives the walkable footprint, merges cells into collision boxes, generates clear spawn viewing directions, and writes `layout.json` and `shared/outpost-layout.ts`. The client cancels glTF's X reflection to keep that geometry aligned. The lower deck and added containers use the same collision data on the client and server.

Rebuild from the project root:

```powershell
& 'C:/Program Files/Blender Foundation/Blender 5.2/blender.exe' -b --python 3d/outpost-arena/build_outpost.py
npm run build
```

Restart the game server after regenerating shared collision. Blender is only needed to rebuild assets, not on the VPS.

Validation: `npm run check`, `npm test`, and `node tools/outpost-browser.mjs` with the local development server running. The browser check verifies texture loading, coordinate alignment, visible floor height at every spawn/pickup, arena selection, and live movement of three bots. `game-preview.png` and `game-courtyard.png` are camera previews captured in Babylon; `game-spawn.png` shows a live match.
