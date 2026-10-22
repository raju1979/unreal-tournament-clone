# Ember Foundry

The sixth battleground: an original 64 by 52 metre indoor industrial arena.
Two sealed orange furnaces divide the ground floor into looping routes. Two side
gantries and a central bridge form an H-shaped upper route at 3 metres, reached
by four staircases. Interrupted parapets and cargo crates provide cover. Roof
trusses, copper process pipes, loading bays and a crane complete the foundry.
Furnaces are solid scenery; this map adds no heat damage or lava mechanics.

Select **Ember Foundry · Industrial** and enter a new private room name.
The first human player chooses a room's map; existing rooms retain their map.

## Assets and rebuilding

- `ember-foundry.blend`: editable Blender source; active scene is Ember Foundry.
- `ember-foundry.glb`: browser export with embedded generated image textures.
- `layout.json` and `shared/foundry-layout.ts`: generated authoritative collision,
  four player spawns, seven weapon locations, two health and two ammo locations.
- `build_foundry.py`: deterministic model and layout builder. No downloads or
  external texture files are needed; textures are generated and packed locally.

From the project root:

    "C:/Program Files/Blender Foundation/Blender 5.2/blender.exe" --background --python 3d/foundry-arena/build_foundry.py
    npm run build

Builder coordinates use game metres X,Y-up,Z. Blender stores X,-Z,Y. The client
cancels the Babylon glTF X reflection, matching the other imported arenas.
The GLB has seven mesh groups and 134 shared collision boxes, about 0.87 MB.
The client loads and caches this scenery only when the arena is selected.

## Verification

Run `npm run check`, `npm test`, and `npm run build`. With `npm run dev` running,
run `node tools/foundry-browser.mjs`. The suite covers supported and reachable
spawns/pickups, correct floor heights, all four stairs with actual movement,
solid walls/furnaces, imported GLB floor alignment, six menu options, switching
away/back, joining the correct room map, three moving bots, supported players,
and browser JavaScript errors. Screenshots are saved beside this document.
Browser testing uses the software WebGL fallback; native WebGPU hardware and
internet multiplayer performance need separate testing.
