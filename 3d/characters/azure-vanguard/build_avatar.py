"""Build Azure Vanguard: reference-inspired low-poly blue sci-fi armor.
Shares the Red Warden skeleton and armed locomotion for future roster additions.
"""
import bpy,math,os,json
from mathutils import Vector,Matrix
ROOT=os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
OUT=os.path.join(ROOT,'3d/characters/azure-vanguard');os.makedirs(OUT,exist_ok=True)
scene=bpy.data.scenes.new('Azure Vanguard');bpy.context.window.scene=scene
with bpy.data.libraries.load(os.path.join(ROOT,'3d/characters/red-warden/red-warden.blend'),link=False) as (src,dst):
    dst.objects=[n for n in src.objects if n in ['RedWarden_Rig','Warden_WeaponSocket','Warden_LeftGrip']]
    dst.actions=[n for n in src.actions if n.startswith('Warden_') and '.' not in n]
for o in dst.objects:scene.collection.objects.link(o)
rig=next(o for o in dst.objects if o.type=='ARMATURE')
rig.animation_data_clear()
for b in rig.pose.bones:b.matrix_basis=Matrix.Identity(4)

def material(name,color,metal=0,glow=0):
    m=bpy.data.materials.new('Vanguard '+name);m.diffuse_color=(*color,1);m.use_nodes=True
    b=next(n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
    b.inputs['Base Color'].default_value=(*color,1);b.inputs['Metallic'].default_value=metal;b.inputs['Roughness'].default_value=.43
    if glow:b.inputs['Emission Color'].default_value=(*color,1);b.inputs['Emission Strength'].default_value=glow
    return m
blue=material('blue armor',(.12,.25,.40),.55);light=material('pale blue edges',(.34,.52,.67),.55)
dark=material('graphite undersuit',(.035,.047,.065));steel=material('gunmetal',(.16,.19,.23),.5)
visor=material('black glass visor',(.018,.027,.039),.7);orange=material('amber power strips',(1,.31,.035),.2,2)
skin=material('exposed lower face',(.58,.35,.24));parts=[]

def bind(o,name,mat,bone):
    o.name=name;o.data.materials.append(mat)
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    group=o.vertex_groups.new(name=bone);group.add(list(range(len(o.data.vertices))),1,'REPLACE');parts.append(o)
    return o

def box(name,loc,size,mat,bone,bevel=.025):
    bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=bpy.context.object;o.scale=size
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    if bevel:
        mod=o.modifiers.new('Faceted armor edges','BEVEL');mod.width=bevel;mod.segments=1
        bpy.ops.object.modifier_apply(modifier=mod.name)
    return bind(o,name,mat,bone)

def ellipsoid(name,loc,size,mat,bone):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=10,ring_count=5,radius=1,location=loc)
    o=bpy.context.object;o.scale=size;return bind(o,name,mat,bone)

def limb(name,bone,width,depth,mat):
    b=rig.data.bones[bone];a=b.head_local;c=b.tail_local
    o=box(name,(a+c)/2,(width,depth,(c-a).length*.83),mat,bone)
    o.rotation_euler=(c-a).to_track_quat('Z','Y').to_euler();return o

# Torso follows a sculpted eight-sided outline rather than a plain box.
verts=[]
for z,w,d in [( .94,.21,.13),(1.11,.20,.135),(1.36,.32,.18),(1.51,.26,.135)]:
    for a in range(8):
        angle=math.tau*a/8;verts.append((math.cos(angle)*w,math.sin(angle)*d,z))
faces=[tuple(range(7,-1,-1)),tuple(range(24,32))]
for row in range(3):
    for i in range(8):faces.append((row*8+i,row*8+(i+1)%8,(row+1)*8+(i+1)%8,(row+1)*8+i))
mesh=bpy.data.meshes.new('Tapered breastplate');mesh.from_pydata(verts,[],faces);o=bpy.data.objects.new('Breastplate',mesh);scene.collection.objects.link(o);bind(o,'Faceted breastplate',blue,'spine')
box('Abdominal undersuit',(0,0,1.08),(.34,.25,.35),dark,'spine')
box('Central chest ridge',(0,-.175,1.34),(.28,.075,.22),light,'spine')
box('Chest amber strip',(0,-.217,1.385),(.105,.022,.029),orange,'spine',.005)
for x in [-.24,.24]:box('Collar power indicator',(x,-.14,1.46),(.065,.03,.025),orange,'spine',.005)
box('Abdominal shield',(0,-.15,1.10),(.20,.065,.23),blue,'spine')
box('Belt',(0,0,.96),(.47,.29,.10),steel,'root')
box('Belt buckle',(0,-.16,.96),(.10,.035,.07),light,'root',.008)
box('Pelvis',(0,0,.86),(.38,.25,.21),dark,'root')
box('Pelvic plate',(0,-.14,.86),(.19,.055,.18),blue,'root')
box('Backpack',(0,.18,1.31),(.35,.17,.34),steel,'spine')
for x in [-.12,0,.12]:box('Backpack cooling fin',(x,.28,1.31),(.04,.06,.25),blue,'spine',.008)
ellipsoid('Neck seal',(0,0,1.61),(.105,.095,.14),dark,'neck')
ellipsoid('Angular helmet shell',(0,0,1.86),(.185,.165,.21),blue,'head')
box('Visor black wrap',(0,-.146,1.87),(.35,.075,.12),visor,'head',.025)
box('Helmet brow',(0,-.154,1.96),(.31,.065,.045),steel,'head',.01)
box('Brow status light',(0,-.191,1.96),(.07,.014,.015),orange,'head',.003)
box('Exposed mouth and jaw',(0,-.135,1.755),(.13,.075,.115),skin,'head',.02)
box('Mouth line',(0,-.177,1.75),(.045,.006,.009),dark,'head',0)
for x in [-.15,.15]:
    box('Helmet cheek guard',(x,-.105,1.76),(.07,.13,.16),light,'head',.02)
    box('Ear module',(x*1.16,.015,1.86),(.055,.14,.14),steel,'head',.018)
    for z in [1.77,1.795]:box('Cheek amber vents',(x,-.176,z),(.045,.012,.009),orange,'head',.002)
for side in ['L','R']:
    sign=1 if side=='L' else -1
    shoulder=rig.data.bones['upper_arm.'+side].head_local
    ellipsoid('Shoulder joint',shoulder,(.13,.12,.13),dark,'upper_arm.'+side)
    box('Large shoulder pauldron',(sign*.35,0,1.54),(.29,.34,.25),steel,'upper_arm.'+side,.05)
    box('Shoulder blue cap',(sign*.35,-.015,1.615),(.27,.29,.12),blue,'upper_arm.'+side,.035)
    limb('Upper arm armor','upper_arm.'+side,.16,.18,blue)
    limb('Forearm gauntlet','forearm.'+side,.20,.22,light)
    b=rig.data.bones['forearm.'+side];p=(b.head_local+b.tail_local)/2
    box('Forearm power line',(p.x,p.y-.118,p.z),(.08,.018,.025),orange,'forearm.'+side,.004)
    limb('Armored glove','hand.'+side,.13,.14,dark)
    for j in range(3):
        tip=rig.data.bones['hand.'+side].tail_local
        box('Glove segmented fingers',(tip.x,tip.y+(j-1)*.038,tip.z-.025),(.06,.029,.10),dark,'hand.'+side,.006)
    limb('Thigh armor','thigh.'+side,.22,.25,blue)
    box('Outer thigh plate',(sign*.285,0,.72),(.09,.24,.30),steel,'thigh.'+side,.02)
    limb('Shin armor','shin.'+side,.20,.22,blue)
    box('Knee shield',(sign*.17,-.12,.49),(.205,.10,.17),light,'shin.'+side,.03)
    box('Knee amber light',(sign*.17,-.178,.46),(.05,.018,.028),orange,'shin.'+side,.004)
    box('Boot',(sign*.17,-.10,.09),(.23,.39,.18),steel,'foot.'+side,.035)
    box('Boot toe cap',(sign*.17,-.245,.095),(.23,.12,.13),blue,'foot.'+side,.025)

bpy.ops.object.select_all(action='DESELECT')
for o in parts:o.select_set(True)
bpy.context.view_layer.objects.active=parts[0];bpy.ops.object.join();body=bpy.context.object;body.name='AzureVanguard_Armor'
body.parent=rig;mod=body.modifiers.new('Shared locomotion rig','ARMATURE');mod.object=rig
# Each material region receives UVs for future texture painting.
bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.uv.smart_project(island_margin=.025);bpy.ops.object.mode_set(mode='OBJECT')
rig.animation_data_create()
actions=[a for a in dst.actions if a]
for action in actions:
    track=rig.animation_data.nla_tracks.new();track.name=action.name
    strip=track.strips.new(action.name,0,action);strip.action_frame_start=action.frame_range[0];strip.action_frame_end=action.frame_range[1];track.mute=True
idle=next(a for a in actions if a.name.startswith('Warden_Idle'));rig.animation_data.action=idle;rig.animation_data.action_slot=idle.slots[0]
scene.frame_start=0;scene.frame_end=60;scene.render.fps=30;scene.frame_set(0)
# Reuse the original socket contract expected by the character renderer.
scene.world=bpy.data.worlds.new('Vanguard studio');scene.world.use_nodes=True
bg=next(n for n in scene.world.node_tree.nodes if n.type=='BACKGROUND');bg.inputs['Color'].default_value=(.055,.08,.12,1);bg.inputs['Strength'].default_value=.5
for name,loc,power,size in [('Key',(3,-4,5),650,4),('Rim',(-3,2,4),800,3),('Fill',(-3,-2,2),350,3)]:
    ld=bpy.data.lights.new(name,'AREA');ld.energy=power;ld.shape='DISK';ld.size=size;o=bpy.data.objects.new(name,ld);scene.collection.objects.link(o);o.location=loc;o.rotation_euler=(Vector((0,0,1))-o.location).to_track_quat('-Z','Y').to_euler()
cd=bpy.data.cameras.new('Vanguard portrait');cam=bpy.data.objects.new('Vanguard portrait',cd);scene.collection.objects.link(cam);cam.location=(3,-5,2.8);cam.rotation_euler=(Vector((0,0,1))-cam.location).to_track_quat('-Z','Y').to_euler();cd.type='ORTHO';cd.ortho_scale=2.6;scene.camera=cam
scene.render.resolution_x=700;scene.render.resolution_y=900;scene.render.resolution_percentage=100;scene.render.image_settings.file_format='PNG'
scene.render.filepath=os.path.join(OUT,'preview.png')
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT,'azure-vanguard.blend'))
bpy.ops.object.select_all(action='DESELECT')
for o in [rig,body]+[o for o in dst.objects if o.type!='ARMATURE']:o.select_set(True)
bpy.context.view_layer.objects.active=rig
bpy.ops.export_scene.gltf(filepath=os.path.join(OUT,'azure-vanguard.glb'),use_selection=True,use_active_scene=True,export_animations=True,export_animation_mode='ACTIONS',export_force_sampling=True,export_frame_range=False,export_apply=False)
body.data.calc_loop_triangles();print('VANGUARD',len(body.data.loop_triangles),'triangles',len(actions),'animations')
rig.animation_data.action=idle;rig.animation_data.action_slot=idle.slots[0];scene.frame_set(1)
bpy.ops.render.render(write_still=True)
