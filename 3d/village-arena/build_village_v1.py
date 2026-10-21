import bpy, math, os
from mathutils import Vector
ROOT=r'D:/learning/unreal-tournament-clone/3d'
OUT=os.path.join(ROOT,'village-arena')
SRC=os.path.join(ROOT,'fantastic_village_pack_blend.blend')
os.makedirs(OUT,exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=SRC)
scene=bpy.context.scene
# duplicate useful showcase assets into a purpose-built, walkable village block
keep=[]
def clone(name, gx, gz, yaw=0.0, scale=1.0):
 src=bpy.data.objects.get(name)
 if not src or src.type!='MESH': raise RuntimeError('Missing village source mesh: '+name)
 obj=src.copy(); obj.data=src.data.copy(); scene.collection.objects.link(obj)
 obj.name='Arena_'+name
 obj.location=(gx,-gz,0.0); obj.rotation_euler=(0,0,yaw); obj.scale=(scale,scale,scale); obj.hide_render=False; obj.hide_viewport=False
 keep.append(obj); return obj
# House meshes from the supplied village set. Each sits on the outer ring, leaving the square open.
houses=[
 ('SM_BLD_body_v01_01',-38,-38,0),('SM_BLD_body_v02_01',0,-41,math.pi/2),('SM_BLD_body_v03_01',38,-38,0),
 ('SM_BLD_body_v04_01',-41,0,math.pi/2),('SM_BLD_body_v05_01',41,0,-math.pi/2),
 ('SM_BLD_body_v06_01',-38,38,math.pi),('SM_BLD_body_v07_01',0,41,-math.pi/2),('SM_BLD_body_v03_02',38,38,math.pi)]
for name,x,z,yaw in houses: clone(name,x,z,yaw)
# Small medieval market stands shape the central combat plaza.
for name,x,z,yaw in [
 ('SM_PROP_market_v04_01',-10,-10,0),('SM_PROP_market_v01_01',0,-11,0),('SM_PROP_market_v02_01',10,-10,0),
 ('SM_PROP_market_v03_01',-10,10,math.pi),('SM_PROP_market_v01_02',10,10,math.pi),
 ('SM_PROP_market_v02_02',-23,-1,math.pi/2),('SM_PROP_market_v03_02',23,1,-math.pi/2)]: clone(name,x,z,yaw)
# Recognizable village landmarks and cover props.
clone('SM_PROP_well',0,0,0)
clone('SM_PROP_well_handle',0,0,0)
clone('SM_PROP_cart_01',-19,0,math.pi/2)
clone('SM_PROP_cart_03',19,0,-math.pi/2)
clone('SM_PROP_campfire',0,18,0)
clone('SM_PROP_campfire_poles',0,18,0)
clone('SM_PROP_hay_01',-22,5,0)
clone('SM_PROP_barrel_06',22,5,0)
# Full-size windmill and waterwheel landmarks on opposite edges.
clone('SM_BLD_windmill_sail',0,-49,0,.72)
clone('SM_BLD_waterwheel_construct',49,0,math.pi/2,.9)
clone('SM_BLD_waterwheel',49,0,math.pi/2,.9)
# Tree instances form a soft perimeter while leaving the playable streets unobstructed.
for x,z,s in [(-49,-26,.9),(-49,26,1.0),(49,-27,1.0),(49,27,.9),(-25,-50,.85),(25,-50,.95),(-25,50,1.0),(25,50,.85),(-50,0,.9),(50,0,.9)]:
 clone('SM_ENV_TREE_village_LOD0',x,z,0,s)
# Arena ground and warm paths/plaza are simple game-ready meshes.
def plain_mat(name,color,rough=.9):
 m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True
 bs=next(n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED');bs.inputs['Base Color'].default_value=(*color,1);bs.inputs['Roughness'].default_value=rough
 return m
soil=plain_mat('Arena | sunlit village earth',(.34,.24,.13))
road=plain_mat('Arena | worn ochre paths',(.52,.39,.23))
stone=plain_mat('Arena | market square stone',(.42,.40,.34))
def plane(name,x,y,sx,sy,z,material):
 bpy.ops.mesh.primitive_plane_add(size=1,location=(x,y,z));o=bpy.context.object;o.name=name;o.dimensions=(sx,sy,1);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(material);keep.append(o);return o
plane('Arena ground',0,0,112,112,-.08,soil)
plane('Market square',0,0,29,29,-.035,stone)
plane('North south village road',0,0,7,105,-.025,road)
plane('East west village road',0,0,105,7,-.02,road)
for x,z in [(-18,-18),(18,-18),(-18,18),(18,18)]:
 plane('Square approach',x,-z,5,10,-.015,road)
# Lightweight studio camera and lighting remain in the editable file; exporter includes meshes only.
center=Vector((0,0,4));camdata=bpy.data.cameras.new('Village preview camera');cam=bpy.data.objects.new('Village preview camera',camdata);scene.collection.objects.link(cam);cam.location=(92,-112,100);cam.rotation_euler=(center-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=128;scene.camera=cam
for name,loc,power,size,color in [('Preview sun',(0,-25,90),32000,70,(1,.84,.65)),('Preview fill',(-55,-25,52),15000,60,(.58,.76,1)),('Preview rim',(25,70,55),17000,55,(1,.58,.34))]:
 d=bpy.data.lights.new(name,'AREA');o=bpy.data.objects.new(name,d);scene.collection.objects.link(o);o.location=loc;o.rotation_euler=(center-o.location).to_track_quat('-Z','Y').to_euler();d.energy=power;d.shape='DISK';d.size=size;d.color=color
scene.render.engine='BLENDER_EEVEE';scene.render.resolution_x=1400;scene.render.resolution_y=1050;scene.render.resolution_percentage=100;scene.render.image_settings.file_format='PNG';scene.render.filepath=os.path.join(OUT,'preview.png');scene.world.use_nodes=True;scene.world.node_tree.nodes.get('Background').inputs['Color'].default_value=(.42,.5,.62,1);scene.world.node_tree.nodes.get('Background').inputs['Strength'].default_value=.4;scene.view_settings.view_transform='Standard';scene.view_settings.exposure=.25
# Keep only the assembled arena, camera and lights in this editable file.
keep_ids={o.as_pointer() for o in keep}
for o in list(scene.objects):
 if o.as_pointer() not in keep_ids and o not in (cam,):
  if o.type!='LIGHT': bpy.data.objects.remove(o,do_unlink=True)
# Pack all referenced image assets for a portable source blend.
bpy.ops.file.pack_all()
bpy.ops.object.select_all(action='DESELECT')
for o in keep:o.select_set(True)
bpy.context.view_layer.objects.active=keep[0]
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT,'village-arena.blend'))
# Export only visible arena geometry with embedded PBR textures; Blender Z-up converts to glTF Y-up.
bpy.ops.export_scene.gltf(filepath=os.path.join(OUT,'village-arena.glb'),export_format='GLB',use_selection=True,export_yup=True,export_apply=True,export_materials='EXPORT',export_image_format='AUTO')
scene.render.filepath=os.path.join(OUT,'preview.png');bpy.ops.render.render(write_still=True)
tris=sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in keep if o.type=='MESH')
print('VILLAGE SAVED',len(keep),'objects',tris,'triangles',os.path.getsize(os.path.join(OUT,'village-arena.glb')),'bytes')
