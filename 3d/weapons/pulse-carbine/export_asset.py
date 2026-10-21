"""Merge static export copies while preserving the fully editable Blender source."""
import bpy

def export_optimized(asset, root, filepath):
    temp=bpy.data.collections.new('PC01_EXPORT_TEMP')
    bpy.context.scene.collection.children.link(temp)
    copies={}
    for original in list(asset.objects):
        copy=original.copy()
        if original.type=='MESH':copy.data=original.data.copy()
        temp.objects.link(copy);copies[original]=copy
    for original,copy in copies.items():
        copy.parent=copies.get(original.parent)
    groups={'Body':[], 'Magazine':[]}
    for original,copy in copies.items():
        if original.type!='MESH':continue
        if original.name=='PC01_Trigger' or original.name.startswith('PC01_Charging bolt'):continue
        group='Magazine' if original.parent and original.parent.name.startswith('PC01_MAGAZINE_ROOT') else 'Body'
        groups[group].append(copy)
    for name,objects in groups.items():
        bpy.ops.object.select_all(action='DESELECT')
        for o in objects:o.select_set(True)
        bpy.context.view_layer.objects.active=objects[0]
        bpy.ops.object.join();objects[0].name='PC01_EXPORT_'+name
    bpy.ops.object.select_all(action='DESELECT')
    for o in temp.objects:o.select_set(True)
    meshes=[o for o in temp.objects if o.type=='MESH']
    stats={'export_meshes':len(meshes),'export_triangles':sum(len(p.vertices)-2 for o in meshes for p in o.data.polygons)}
    # Keep attachment/animation names stable despite duplicates in the live file.
    copy_names={copy.name:original.name for original,copy in copies.items() if original.type!='MESH' or original.name in ('PC01_Trigger','PC01_Charging bolt')}
    original_names={o:o.name for o in asset.objects}
    for o,name in original_names.items():o.name='_EDIT_'+name
    for o in temp.objects:
        if o.name in copy_names:o.name=copy_names[o.name]
    try:
        bpy.ops.export_scene.gltf(filepath=str(filepath),use_selection=True,use_active_scene=True,export_apply=True)
    finally:
        for o in temp.objects:o.name='_TEMP_'+o.name
        for o,name in original_names.items():o.name=name
    for o in list(temp.objects):
        mesh=o.data if o.type=='MESH' else None
        bpy.data.objects.remove(o,do_unlink=True)
        if mesh and mesh.users==0:bpy.data.meshes.remove(mesh)
    bpy.data.collections.remove(temp)
    for o in asset.objects:o.select_set(o.type=='MESH')
    bpy.context.view_layer.objects.active=next(o for o in asset.objects if o.type=='MESH')
    return stats
