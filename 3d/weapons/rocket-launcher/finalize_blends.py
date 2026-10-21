"""Convert the scene-library source to ordinary directly openable .blend files."""
import bpy
from pathlib import Path
out=Path(__file__).resolve().parent
collection=bpy.data.collections['RL01_LAUNCHER']
target=next(s for s in bpy.data.scenes if any(o in collection.objects.values() for o in s.objects))
bpy.context.window.scene=target
for s in list(bpy.data.scenes):
    if s!=target:bpy.data.scenes.remove(s)
bpy.ops.wm.save_as_mainfile(filepath=str(out/'rocket-launcher.blend'))
print('Launcher source saved as normal Blender file:',len(target.objects),'scene objects')
projectile=bpy.data.collections['RL01_PROJECTILE'];keep=set(projectile.objects)
for o in list(bpy.data.objects):
    if o not in keep:bpy.data.objects.remove(o,do_unlink=True)
for c in list(bpy.data.collections):
    if c!=projectile:bpy.data.collections.remove(c)
if projectile.name not in target.collection.children:target.collection.children.link(projectile)
bpy.data.objects['ROCKET01_ROOT'].location=(0,0,0);target.camera=None
bpy.ops.wm.save_as_mainfile(filepath=str(out/'rocket.blend'))
print('Standalone projectile saved:',len(target.objects),'scene objects')
