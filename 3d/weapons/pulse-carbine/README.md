# PC-01 Pulse Carbine

Reference-guided reconstruction from reference.png. The unseen surfaces are interpreted; this is not the original mesh from the screenshot.

- **pulse-carbine.blend**: editable source, packed reference image, UVs, PBR materials, camera and studio lighting. Separate magazine hierarchy, trigger and charging bolt. The original arena scene is excluded from this file.
- **pulse-carbine.glb**: self-contained game export. Static body details are merged to reduce object count; the magazine, trigger, bolt and attachment nodes remain separate. No studio objects.
- **uv-layout.png**: 2048 × 2048 UV atlas for painting. Materials currently use flat PBR colors; there are no baked albedo/normal/roughness texture maps.
- **preview.png**: review render.
- **build_weapon.py** / **export_asset.py**: reproducible geometry and export source.
- **asset-info.json**: geometry statistics and attachment names.

Units are metres. Blender axes: Z up, muzzle points -X. GLB converts Z up to Y up automatically. Named attachment empties mark muzzle, grip, support hand and ejection port. Separate parts are prepared for animation; no animation clips or armature are included.

To rebuild, run in Blender's Python Console (Shift+F4):

```python
p = r'D:/learning/unreal-tournament-clone/3d/weapons/pulse-carbine/build_weapon.py'
exec(compile(open(p, encoding='utf-8').read(), p, 'exec'), {'__file__': p})
```

This creates a new scene and writes the outputs to this folder. Rebuilding overwrites the output files; save manual edits under another filename first. The GLB is used in-game for the random pickup, first-person view, and remote players. The production build synchronizes this export into public/assets/weapons/.

All files are local and can be tracked in Git. No generated files depend on temporary paths, online asset services or paid generators. reference.png is the image supplied by the user; its original artist/source is unspecified.
