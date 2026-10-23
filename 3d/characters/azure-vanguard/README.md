# Azure Vanguard

Original low-poly blue sci-fi warrior inspired by the user-supplied design sheet.
Blue plate armor, black visor, visible lower face, grey shoulder guards, pale
gauntlets and amber power strips. It is a stylized interpretation, not an exact
reconstruction of the painted concept. The model has 2,944 triangles, seven
material regions, UV-unwrapped armor, and rigid armor weights on the existing
16-bone Red Warden skeleton. All avatars retain the same gameplay hitbox.

`azure-vanguard.blend` is the editable source. `azure-vanguard.glb` contains the
skinned model, hand socket, idle, eight running directions, jump and fire clips.
`preview.png` is the menu portrait. No external texture downloads are needed;
materials use glTF-compatible colors and emission.

Rebuild with Blender:

    blender --background --python 3d/characters/azure-vanguard/build_avatar.py
    npm run build

The builder reads the existing Red Warden source to reuse its skeleton/actions.
The client uses the shared BotAvatar animation adapter for remote humans and bots.
Future characters should keep the same bone names, `Warden_WeaponSocket`,
`Warden_Idle`, `Warden_Run*`, `Warden_Jump` and `Warden_Fire` animation contract.

To extend the roster, add an entry in `shared/avatars.ts` and copy the GLB and
portrait in `tools/sync-assets.mjs`. The menu builds its buttons from that roster,
and the server automatically validates the new ID. Selection is made before
joining, remembered in localStorage, and retained through respawns. Bots also choose random appearances from the roster. The game is first-person, so your chosen body is seen by other
players; the portrait identifies your own selection before entering a match.

Checks: `npm run check`, `npm test`, `npm run build`, and
`node tools/avatars-browser.mjs` against a running local server. The browser check
covers persistence, four-player avatar replication, invalid ID fallback, both
models loading, skinning, shared animations, weapon socket and JavaScript errors.
Native WebGPU hardware was not tested; browser checks use software WebGL.
