# Halo Warrior

Low-poly green armored warrior based on the supplied Master Chief reference.
Olive armor, a curved gold visor, sealed helmet/chin respirator, split angular
breastplate, chest identification, black undersuit and rear power pack distinguish
this character from Azure Vanguard. This is a stylized modeled interpretation of
the supplied artwork. The source contains 3,064 triangles and six material regions.

- `halo-warrior.blend`: editable rigged Blender source, UV-unwrapped armor.
- `halo-warrior.glb`: browser model with skinning, weapon socket and 11 clips.
- `preview.png`: rendered portrait used by the start menu.
- `build_avatar.py`: rebuilds the mesh using the existing Red Warden skeleton
  and animations. No texture downloads or image generation are needed.

Rebuild from the project root:

    blender --background --python 3d/characters/halo-warrior/build_avatar.py
    npm run build

The character uses the shared 16-bone rig, idle, eight directional running clips,
jump and fire, and the shared right-hand weapon socket. Player size and collision
remain identical to the other avatar choices. Select **Halo Warrior** before
joining; the choice is remembered locally and replicated to other players.

Validation: `npm run check`, `npm test`, `npm run build`. For the browser check,
set `TEST_AVATAR=halo-warrior` and run `node tools/avatars-browser.mjs` with the
local server running. The script verifies three choices, saved selection,
four-player replication, fallback validation, model loading, skinning, animations
and weapon sockets. Browser checks use software WebGL.
