# Red Warden armed bot

The editable Blender model and game GLB use the same 16-bone character mesh. `build_animations.py` authors a rifle-ready upper-body pose and eight directional lower-body run cycles, then exports the character with two animated hand sockets.

## Runtime behavior

- The character faces its aim direction. Forward, backward, diagonal and sideways movement each use the corresponding gait, with continuous direction blending.
- The client interpolates received positions 100ms behind the server and advances gait phase from actual horizontal distance. Stopped or obstructed bots stop stepping.
- One authored cycle covers 3.2 model meters; the game uses scale 0.85, so the cycle travels 2.72 game meters. The stance portion keeps each foot planted as the body moves.
- `Warden_WeaponSocket` is parented to `hand.R`. The pulse rifle, PC-01 carbine and RL-01 launcher attach there. Imported weapons align their trigger-grip markers to the socket.
- Firing adds recoil to the animated arms while locomotion continues; the gun remains attached to the hand. Jump detection ignores the small vertical velocity changes produced by floor collision.
- Travel facing follows the next navigation waypoint; combat aiming remains directed at the opponent.

## Files

- `red-warden.blend`: editable mesh, weighted rig, all 11 persistent actions, and a parented carbine for pose preview. The preview weapon is excluded from the character export.
- `red-warden.glb`: game-ready skinned character, animation clips and hand sockets.
- `build_animations.py`: reproducible animation and socket builder.
- `locomotion.json`: gait distance and scale calibration.
- `armed-preview.png`: Blender render of the carry pose.
- `game-armed-bot.png`: Babylon.js carry-pose preview using the game's bot controller and weapon asset.
- `reference.png`: supplied visual reference.

Animation names are `Warden_Idle`, `Warden_Jump`, `Warden_Fire`, and `Warden_RunForward`, `RunForwardRight`, `RunRight`, `RunBackRight`, `RunBack`, `RunBackLeft`, `RunLeft`, `RunForwardLeft`. The runtime applies recoil independently of the full-body preview fire clip.

## Rebuild and verify

From the project root:

```powershell
& 'C:\Program Files\Blender Foundation\Blender 5.2\blender.exe' -b --python 3d/characters/red-warden/build_animations.py
npm run build
```

`npm test` covers gait direction, frame-rate independence and AI facing. With the development server running, `node tools/bot-animation-browser.mjs` samples the actual exported bones to check foot planting, stopping and hand orientation. `node tools/bot-weapons-browser.mjs` checks three live bots, animated legs, and the carbine/launcher grip alignment.
