"""Build Halo Warrior: reference-inspired low-poly green power armor with a gold visor.
Shares the Red Warden skeleton and armed locomotion for future roster additions.
"""
import bpy,math,os,json
from mathutils import Vector,Matrix
ROOT=os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
OUT=os.path.join(ROOT,'3d/characters/halo-warrior');os.makedirs(OUT,exist_ok=True)
scene=bpy.data.scenes.new('Halo Warrior');bpy.context.window.scene=scene
with bpy.data.libraries.load(os.path.join(ROOT,'3d/characters/red-warden/red-warden.blend'),link=False) as (src,dst):
    dst.objects=[n for n in src.objects if n in ['RedWarden_Rig','Warden_WeaponSocket','Warden_LeftGrip']]
    dst.actions=[n for n in src.actions if n.startswith('Warden_') and '.' not in n]
for o in dst.objects:scene.collection.objects.link(o)
rig=next(o for o in dst.objects if o.type=='ARMATURE')
rig.animation_data_clear()
for b in rig.pose.bones:b.matrix_basis=Matrix.Identity(4)

def material(name,color,metal=0,glow=0):
    m=bpy.data.materials.new('Spartan '+name);m.diffuse_color=(*color,1);m.use_nodes=True
    b=next(n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
    b.inputs['Base Color'].default_value=(*color,1);b.inputs['Metallic'].default_value=metal;b.inputs['Roughness'].default_value=.43
    if glow:b.inputs['Emission Color'].default_value=(*color,1);b.inputs['Emission Strength'].default_value=glow
    return m
blue=material('olive armor',(.19,.27,.09),.35);light=material('sage armor edges',(.31,.39,.16),.35)
dark=material('graphite undersuit',(.035,.047,.065));steel=material('gunmetal',(.11,.15,.07),.35)
visor=material('black glass visor',(.85,.39,.035),.72);orange=material('amber power strips',(1,.31,.035),.2,2)
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

# Angular independent chest plates and a sealed helmet distinguish this character.
def plate(name,points,depth,mat,bone):
    verts=[(x,y,z) for y in [-.19,-.19+depth] for x,z in points]
    n=len(points);faces=[tuple(range(n-1,-1,-1)),tuple(range(n,2*n))]
    for j in range(n):faces.append((j,(j+1)%n,(j+1)%n+n,j+n))
    mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],faces)
    o=bpy.data.objects.new(name,mesh);scene.collection.objects.link(o);return bind(o,name,mat,bone)
box('Black ribbed torso',(0,0,1.25),(.45,.29,.48),dark,'spine',.04)
for side in [-1,1]:
    plate('Angular split breastplate',[(side*x,z) for x,z in [(.025,1.48),(.23,1.52),(.31,1.35),(.20,1.22),(.035,1.27)]],.08,blue,'spine')
    box('Clavicle armor',(side*.21,-.12,1.50),(.15,.17,.09),light,'spine',.025)
    box('Chest recessed vent',(side*.11,-.205,1.26),(.09,.023,.035),dark,'spine',.006)
box('Abdominal center plate',(0,-.15,1.13),(.20,.09,.19),blue,'spine',.035)
for z in [1.04,1.10,1.16]:
    for side in [-1,1]:box('Flexible black abdomen',(side*.19,-.105,z),(.09,.07,.035),dark,'spine',.004)
box('Belt armored girdle',(0,0,.96),(.48,.30,.11),blue,'root',.025)
box('Belt clasp',(0,-.17,.96),(.11,.035,.09),light,'root',.012)
box('Pelvis undersuit',(0,0,.86),(.35,.24,.22),dark,'root',.035)
plate('Groin shield',[(-.12,.91),(.12,.91),(.075,.76),(-.075,.76)],.06,blue,'root')
box('Raised rear power pack',(0,.18,1.41),(.35,.19,.42),blue,'spine',.035)
for x in [-.135,.135]:
    box('Back exhaust stack',(x,.22,1.55),(.11,.17,.21),light,'spine',.025)
    box('Black exhaust recess',(x,.315,1.57),(.065,.018,.09),dark,'spine',.004)
ellipsoid('Neck pressure seal',(0,0,1.61),(.10,.095,.14),dark,'neck')
ellipsoid('Olive helmet dome',(0,0,1.87),(.195,.175,.21),blue,'head')
box('Helmet black visor surround',(0,-.12,1.86),(.355,.145,.20),dark,'head',.035)
# Curved gold faceplate has a continuous broad silhouette rather than a black slit.
verts=[]
for z,r in [(1.79,.17),(1.94,.185)]:
    for j in range(9):
        a=-1.13+j*2.26/8;verts.append((math.sin(a)*r,-math.cos(a)*r-.045,z))
faces=[(j,j+1,j+10,j+9) for j in range(8)]
mesh=bpy.data.meshes.new('Gold panoramic visor');mesh.from_pydata(verts,[],faces)
o=bpy.data.objects.new('Gold panoramic visor',mesh);scene.collection.objects.link(o);bind(o,'Gold panoramic visor',visor,'head')
box('Extended helmet peak',(0,-.11,1.975),(.39,.28,.055),light,'head',.018)
box('Chin armored respirator',(0,-.12,1.735),(.23,.17,.105),blue,'head',.03)
box('Respirator black opening',(0,-.211,1.755),(.09,.013,.035),dark,'head',.008)
for x in [-.15,.15]:
    box('Helmet jaw rail',(x,-.115,1.76),(.075,.14,.12),light,'head',.02)
    box('Recessed ear housing',(x*1.17,.005,1.85),(.05,.13,.14),blue,'head',.016)
# Small painted chest identifier is geometry, so it survives the GLB export.
paint=material('armor identification',(.68,.72,.52))
bpy.ops.object.text_add(location=(.145,-.236,1.385),rotation=(math.pi/2,0,0))
o=bpy.context.object;o.data.body='117';o.data.size=.055;o.data.align_x='CENTER';o.data.extrude=.0003
bpy.ops.object.convert(target='MESH');bind(bpy.context.object,'Chest 117 marking',paint,'spine')
for side in ['L','R']:
    sign=1 if side=='L' else -1
    shoulder=rig.data.bones['upper_arm.'+side].head_local
    ellipsoid('Shoulder joint',shoulder,(.13,.12,.13),dark,'upper_arm.'+side)
    box('Large shoulder pauldron',(sign*.35,0,1.54),(.27,.30,.25),blue,'upper_arm.'+side,.05)
    box('Shoulder blue cap',(sign*.35,-.015,1.615),(.25,.27,.10),light,'upper_arm.'+side,.035)
    limb('Upper arm armor','upper_arm.'+side,.16,.18,blue)
    limb('Forearm gauntlet','forearm.'+side,.20,.22,light)
    b=rig.data.bones['forearm.'+side];p=(b.head_local+b.tail_local)/2
    box('Forearm recessed vent',(p.x,p.y-.118,p.z),(.08,.018,.025),dark,'forearm.'+side,.004)
    limb('Armored glove','hand.'+side,.13,.14,dark)
    for j in range(3):
        tip=rig.data.bones['hand.'+side].tail_local
        box('Glove segmented fingers',(tip.x,tip.y+(j-1)*.038,tip.z-.025),(.06,.029,.10),dark,'hand.'+side,.006)
    limb('Thigh armor','thigh.'+side,.23,.27,blue)
    box('Outer thigh plate',(sign*.285,0,.72),(.09,.24,.30),steel,'thigh.'+side,.02)
    limb('Shin armor','shin.'+side,.20,.22,blue)
    box('Knee shield',(sign*.17,-.12,.49),(.22,.12,.18),blue,'shin.'+side,.03)
    box('Knee recessed detail',(sign*.17,-.178,.46),(.05,.018,.028),steel,'shin.'+side,.004)
    box('Boot',(sign*.17,-.10,.09),(.23,.39,.18),steel,'foot.'+side,.035)
    box('Boot toe cap',(sign*.17,-.245,.095),(.23,.12,.13),blue,'foot.'+side,.025)

bpy.ops.object.select_all(action='DESELECT')
for o in parts:o.select_set(True)
bpy.context.view_layer.objects.active=parts[0];bpy.ops.object.join();body=bpy.context.object;body.name='HaloWarrior_Armor'
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
scene.world=bpy.data.worlds.new('Spartan studio');scene.world.use_nodes=True
bg=next(n for n in scene.world.node_tree.nodes if n.type=='BACKGROUND');bg.inputs['Color'].default_value=(.055,.08,.12,1);bg.inputs['Strength'].default_value=.5
for name,loc,power,size in [('Key',(3,-4,5),650,4),('Rim',(-3,2,4),800,3),('Fill',(-3,-2,2),350,3)]:
    ld=bpy.data.lights.new(name,'AREA');ld.energy=power;ld.shape='DISK';ld.size=size;o=bpy.data.objects.new(name,ld);scene.collection.objects.link(o);o.location=loc;o.rotation_euler=(Vector((0,0,1))-o.location).to_track_quat('-Z','Y').to_euler()
cd=bpy.data.cameras.new('Spartan portrait');cam=bpy.data.objects.new('Spartan portrait',cd);scene.collection.objects.link(cam);cam.location=(3,-5,2.8);cam.rotation_euler=(Vector((0,0,1))-cam.location).to_track_quat('-Z','Y').to_euler();cd.type='ORTHO';cd.ortho_scale=2.6;scene.camera=cam
scene.render.resolution_x=700;scene.render.resolution_y=900;scene.render.resolution_percentage=100;scene.render.image_settings.file_format='PNG'
scene.render.filepath=os.path.join(OUT,'preview.png')
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT,'halo-warrior.blend'))
bpy.ops.object.select_all(action='DESELECT')
for o in [rig,body]+[o for o in dst.objects if o.type!='ARMATURE']:o.select_set(True)
bpy.context.view_layer.objects.active=rig
bpy.ops.export_scene.gltf(filepath=os.path.join(OUT,'halo-warrior.glb'),use_selection=True,use_active_scene=True,export_animations=True,export_animation_mode='ACTIONS',export_force_sampling=True,export_frame_range=False,export_apply=False)
body.data.calc_loop_triangles();print('HALO WARRIOR',len(body.data.loop_triangles),'triangles',len(actions),'animations')
rig.animation_data.action=idle;rig.animation_data.action_slot=idle.slots[0];scene.frame_set(1)
bpy.ops.render.render(write_still=True)
