# RL-01 Breacher launcher and matching projectile

Reference-inspired reconstruction from the supplied image. Hidden surfaces and the rocket projectile were designed to match; this is not the source mesh shown in the image.

- `rocket-launcher.blend`: editable launcher, separate trigger, matching rocket, UVs, materials, packed reference and preview studio.
- `rocket.blend`: standalone matching finned projectile at the origin.
- `rocket-launcher.glb`: runtime launcher export, merged static body plus separate trigger, with muzzle/backblast/grip/support-hand attachment nodes.
- `rocket.glb`: standalone runtime projectile, merged to one mesh, with exhaust attachment node.
- `launcher-uv.png`, `rocket-uv.png`: packed 2048-pixel UV layouts.
- `preview.png`: rendered launcher/projectile preview.
- `build_launcher.py`, `export_models.py`, `finalize_blends.py`: rebuildable geometry/export source and directly openable Blender-file packaging.
- `asset-info.json`: geometry statistics and validation results.

Both assets use metres, Blender Z up, with their muzzle/nose facing -X. GLB converts the up axis to Y. PBR material colors provide the current appearance; baked textures, wear maps, animation clips, smoke/fire textures and sound recordings are not included.

Installed in the game as weapon 2 and its projectile. The production build copies both GLBs into public/assets/weapons/. First-person and remote-player launcher views use the named muzzle socket for firing effects; the rocket model follows the authoritative projectile direction.

To rebuild in Blender's Python Console:

```python
p = r'D:/learning/unreal-tournament-clone/3d/weapons/rocket-launcher/build_launcher.py'
exec(compile(open(p, encoding='utf-8').read(), p, 'exec'), {'__file__': p})
```

Rebuilding creates a new scene and overwrites the generated files in this folder. Save manual edits under another name before rebuilding. No paid generators or remote assets were used. The provided reference image is preserved; its original source/artist is unspecified.
