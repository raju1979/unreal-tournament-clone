# Iron Veil Fortress

Original fortress arena inspired by the supplied dark medieval arena reference.
48 × 56 metres, four monumental columns, timber ceiling coffers, a shallow jade
reservoir, central altar, four stair approaches and two upper galleries at 3.2m.
Crimson pennants use an original brass diamond sigil. No game assets were copied.

`iron-veil-fortress.blend` is the editable Blender source; the active scene is the
fortress. `iron-veil-fortress.glb` embeds all three generated color textures.
The PNG tiles are generated locally; no external texture downloads are required.
Blender adds bump shading; the browser export uses the textured base color.
Water is decorative, shallow, and safe to cross, without swimming or damage.
The square collision foundation supports it at y=0.

Rebuild from the repository root:

    "C:/Program Files/Blender Foundation/Blender 5.2/blender.exe" --background --python 3d/fortress-arena/build_fortress.py
    npm run build

The builder generates both the GLB and `shared/fortress-layout.ts` from the same
coordinates. Game X,Y,Z map to Blender X,-Z,Y. The client cancels the Babylon glTF
X reflection as the existing arenas do. Nine material mesh groups and 145 shared
collision boxes keep this arena small (approximately 0.61 MB GLB).

Select **Iron Veil Fortress · Gothic Hall**, then create a new room. A room's
first human player chooses its arena. Existing rooms keep their selected arena.

Verification: `npm run check`, `npm test`, `npm run build`, and
`node tools/fortress-browser.mjs` while `npm run dev` is running. Tests verify
supported, clear and reachable spawns/pickups, all four gallery staircases using
actual player physics, walls/cover, imported floor alignment, joining a live room,
three moving bots, and no browser JavaScript errors. Browser testing used the
WebGL fallback with software graphics; native WebGPU hardware was not verified.
