import bpy

def export_model(collection,filepath):
    temp=bpy.data.collections.new('RL01 export copies');bpy.context.scene.collection.children.link(temp)
    copies={};names={}
    for original in collection.objects:
        o=original.copy()
        if original.type=='MESH':o.data=original.data.copy()
        temp.objects.link(o);copies[original]=o;names[o.name]=original.name
    for original,o in copies.items():o.parent=copies.get(original.parent)
    bpy.ops.object.select_all(action='DESELECT')
    body=[o for original,o in copies.items() if original.type=='MESH' and not original.name.endswith('_Trigger')]
    for o in body:o.select_set(True)
    bpy.context.view_layer.objects.active=body[0];bpy.ops.object.join();body[0].name=collection.name+'_BODY'
    original_names={o:o.name for o in collection.objects}
    for o,name in original_names.items():o.name='_SOURCE_'+name
    for o in temp.objects:
        if o.name in names:o.name=names[o.name]
    bpy.ops.object.select_all(action='DESELECT')
    for o in temp.objects:o.select_set(True)
    meshes=[o for o in temp.objects if o.type=='MESH']
    result={'mesh_count':len(meshes),'triangles':sum(len(p.vertices)-2 for o in meshes for p in o.data.polygons)}
    try:bpy.ops.export_scene.gltf(filepath=str(filepath),use_selection=True,use_active_scene=True,export_apply=True)
    finally:
        for o in temp.objects:o.name='_EXPORT_'+o.name
        for o,name in original_names.items():o.name=name
        for o in list(temp.objects):
            mesh=o.data if o.type=='MESH' else None
            bpy.data.objects.remove(o,do_unlink=True)
            if mesh and mesh.users==0:bpy.data.meshes.remove(mesh)
        bpy.data.collections.remove(temp)
    return result
