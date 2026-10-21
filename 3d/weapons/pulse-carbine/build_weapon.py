"""Run in Blender's Python console: exec(compile(open(PATH).read(), PATH, 'exec')).
Reference-guided hard-surface carbine. No downloaded models or paid generators.
"""
import bpy, math, json
from pathlib import Path
from mathutils import Vector

OUT = Path(__file__).resolve().parent if '__file__' in globals() else Path('D:/learning/unreal-tournament-clone/3d/weapons/pulse-carbine')
OUT.mkdir(parents=True, exist_ok=True)
scene = bpy.data.scenes.new('PC-01 / Pulse Carbine')
bpy.context.window.scene = scene
asset = bpy.data.collections.new('PC01_WEAPON')
studio = bpy.data.collections.new('STUDIO / not exported')
scene.collection.children.link(asset); scene.collection.children.link(studio)
root = bpy.data.objects.new('PC01_ROOT', None); asset.objects.link(root)
root['forward_axis'] = '-X'; root['units'] = 'metres'
root['description'] = 'Reference-inspired sci-fi pulse carbine; separate magazine, trigger and bolt'
parts = []

def material(name, color, metal=.65, rough=.36, emit=0):
    m = bpy.data.materials.new('PC01 / ' + name); m.use_nodes = True
    n = next(n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    n.inputs['Base Color'].default_value = (*color, 1)
    n.inputs['Metallic'].default_value = metal; n.inputs['Roughness'].default_value = rough
    if emit:
        n.inputs['Emission Color'].default_value = (*color, 1)
        n.inputs['Emission Strength'].default_value = emit
    m.diffuse_color = (*color, 1)
    return m

shell = material('Ceramic silver', (.46,.52,.55), .7, .32)
edge = material('Graphite frame', (.045,.064,.079), .8, .3)
dark = material('Recess black', (.012,.02,.026), .4, .43)
rubber = material('Grip rubber', (.032,.043,.047), .05, .75)
steel = material('Machined steel', (.22,.29,.32), .9, .25)
accent = material('Warm titanium', (.36,.23,.105), .8, .32)
cyan = material('Energy cyan', (.015,.65,.72), .3, .24, 2)
ink = material('Markings', (.025,.037,.043), .1, .5)

def register(o, name, mat, bevel=.003):
    o.name = 'PC01_' + name
    for c in list(o.users_collection): c.objects.unlink(o)
    asset.objects.link(o); o.parent = root
    if mat: o.data.materials.append(mat)
    if bevel:
        mod = o.modifiers.new('Machined bevel', 'BEVEL'); mod.width = bevel; mod.segments = 2
    parts.append(o)
    return o

def poly(name, points, depth, mat, y=0, bevel=.003):
    n=len(points)
    verts=[(x,y-depth/2,z) for x,z in points]+[(x,y+depth/2,z) for x,z in points]
    faces=[tuple(range(n-1,-1,-1)),tuple(range(n,n*2))]
    faces += [(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
    mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],faces);mesh.update()
    o=bpy.data.objects.new(name,mesh);asset.objects.link(o)
    return register(o,name,mat,bevel)

def box(name, loc, dims, mat, bevel=.002):
    bpy.ops.mesh.primitive_cube_add(size=1,location=loc)
    o=bpy.context.object;o.dimensions=dims
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    return register(o,name,mat,bevel)

def cyl(name, loc, radius, depth, mat, axis='Y', sides=16):
    bpy.ops.mesh.primitive_cylinder_add(vertices=sides,radius=radius,depth=depth,location=loc)
    o=bpy.context.object
    if axis=='Y':o.rotation_euler.x=math.pi/2
    elif axis=='X':o.rotation_euler.y=math.pi/2
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    return register(o,name,mat,.0015)

# Main silhouette: long faceted receiver, beveled nose, broad side armor.
poly('Receiver chassis',[(-.51,.115),(-.46,.205),(-.26,.234),(.11,.22),(.29,.17),(.32,.085),(.19,.005),(-.39,-.005),(-.49,.045)],.128,edge)
poly('Upper armor',[(-.49,.135),(-.45,.19),(-.25,.218),(.105,.205),(.25,.165),(.11,.145),(-.27,.15),(-.40,.10)],.145,shell)
poly('Lower forebody',[(-.50,.045),(-.39,-.034),(-.10,-.047),(.10,-.016),(.18,.045),(-.03,.067),(-.40,.074)],.134,steel)
poly('Belly frame',[(-.44,.018),(-.40,-.055),(-.17,-.068),(.04,-.105),(.115,-.028),(-.10,-.034)],.102,edge)

for sign in [-1,1]:
    y=sign*.079
    poly('Side armor', [(-.455,.105),(-.36,.142),(-.16,.151),(-.065,.117),(.125,.125),(.215,.09),(.13,.025),(-.12,.015),(-.37,.038)],.012,shell,y)
    poly('Side inset',[(-.35,.107),(-.18,.13),(-.105,.106),(-.14,.085),(-.33,.079),(-.395,.086)],.006,dark,sign*.088,.001)
    poly('Chamber inset',[(-.105,.075),(.055,.112),(.14,.085),(.115,.032),(-.065,.028)],.006,edge,sign*.089,.001)
    poly('Chamber plate',[(-.065,.071),(.045,.092),(.09,.075),(.075,.045),(-.045,.042)],.005,steel,sign*.094,.001)
    for i in range(3):
        poly('Chevron', [(-.052+i*.037,.073),(-.036+i*.037,.054),(-.02+i*.037,.073)],.003,dark,sign*.099,.0005)
    box('Charge window',(-.265,sign*.095,.103),(.092,.006,.013),edge,.003)
    box('Charge filament',(-.265,sign*.099,.103),(.065,.003,.004),cyan,.001)
    # Lower side channel and mechanical cylinder.
    box('Lower channel',(-.25,sign*.074,.025),(.28,.012,.012),dark)
    cyl('Gas piston',(-.245,sign*.085,.027),.009,.24,steel,'X',12)
    cyl('Piston collar',(-.16,sign*.085,.027),.015,.026,edge,'X',12)
    # Large circular rear receiver hub, matching the reference landmark.
    cyl('Receiver hub base',(.145,sign*.088,.105),.067,.025,edge)
    cyl('Receiver hub ring',(.145,sign*.105,.105),.054,.012,steel)
    cyl('Receiver hub inner',(.145,sign*.113,.105),.043,.008,dark)
    cyl('Receiver hub rotor',(.145,sign*.119,.105),.033,.006,shell)
    cyl('Receiver hub axle',(.145,sign*.124,.105),.013,.008,accent)
    for a in range(8):
        t=a*math.tau/8
        cyl('Hub bolt',(.145+math.cos(t)*.045,sign*.119,.105+math.sin(t)*.045),.003,.004,dark,sides=8)
    for x,z in [(-.43,.09),(-.37,.047),(-.11,.135),(.25,.15),(.11,.021)]:
        cyl('Panel fastener',(x,sign*.09,z),.004,.005,dark,sides=8)
        box('Fastener slot',(x,sign*.094,z),(.005,.002,.001),steel,.0002)

# Barrel, muzzle bore and front shroud. Bore is a ring, not a solid cap.
cyl('Barrel',(-.55,0,.076),.021,.22,steel,'X',16)
cyl('Barrel collar',(-.505,0,.076),.034,.055,edge,'X',16)
bpy.ops.mesh.primitive_torus_add(major_radius=.020,minor_radius=.005,major_segments=16,minor_segments=6,location=(-.665,0,.076),rotation=(0,math.pi/2,0))
register(bpy.context.object,'Muzzle crown',steel,0)
cyl('Bore shadow',(-.659,0,.076),.015,.002,dark,'X',16)
for x in [-.62,-.60,-.58]:cyl('Barrel cooling ring',(x,0,.076),.023,.008,edge,'X',16)

# Dorsal rail and cooling vents.
box('Top rail',(-.12,0,.237),(.55,.066,.018),edge)
for i in range(15):box('Rail tooth',(-.375+i*.034,0,.251),(.018,.073,.011),steel,.001)
for sign in [-1,1]:
    for i in range(6):
        o=box('Front cooling slot',(-.415+i*.022,sign*.065,.183),(.009,.014,.038),dark,.001)
        o.rotation_euler.y=-.22
poly('Front sight',[(-.34,.255),(-.326,.278),(-.303,.278),(-.303,.254)],.027,edge)
box('Rear sight',(.19,0,.225),(.027,.045,.062),edge)

# Stock, hollow-looking skeletal brace and butt pad.
poly('Stock spine',[(.235,.17),(.48,.14),(.57,.12),(.57,.071),(.45,.09),(.28,.112)],.075,steel)
poly('Stock lower brace',[(.26,.085),(.48,.074),(.56,.04),(.54,.017),(.44,.051),(.27,.061)],.058,edge)
poly('Butt pad',[(.55,.128),(.596,.12),(.58,-.065),(.554,-.063),(.548,.045)],.096,rubber)
for z in [-.04,-.01,.02,.05,.08]:box('Butt tread',(.586,0,z),(.009,.102,.008),edge,.001)

# Pistol grip behind trigger opening. Three frame pieces leave an actual hole.
poly('Grip frame',[(.22,.04),(.29,.04),(.33,-.15),(.29,-.193),(.20,-.18),(.18,-.115)],.094,edge)
poly('Rubber grip insert',[(.237,-.005),(.275,-.004),(.305,-.145),(.279,-.164),(.222,-.151),(.212,-.106)],.103,rubber)
for i in range(7):
    z=-.035-i*.016
    o=box('Grip rib',(.258+(i*.003),0,z),(.065,.108,.006),steel,.001)
    o.rotation_euler.y=-.15
poly('Trigger guard front',[(.125,.012),(.146,.003),(.145,-.105),(.12,-.103)],.034,edge)
poly('Trigger guard bottom',[(.12,-.104),(.22,-.136),(.224,-.112),(.14,-.084)],.034,edge)
trigger=poly('Trigger',[(.18,.012),(.194,.009),(.177,-.056),(.16,-.067),(.169,-.04)],.019,steel)
trigger['animatable']='Rotate locally for firing'

# Angled detachable magazine / power cell in front of the grip.
magroot=bpy.data.objects.new('PC01_MAGAZINE_ROOT',None);asset.objects.link(magroot);magroot.parent=root
magparts=[]
magparts.append(poly('Magazine well',[(-.13,-.026),(.025,-.05),(.066,-.147),(-.085,-.185),(-.14,-.092)],.12,steel))
magparts.append(poly('Magazine',[(-.068,-.16),(.025,-.143),(.088,-.305),(.04,-.337),(-.008,-.322)],.079,edge))
magparts.append(poly('Magazine foot',[(.032,-.315),(.09,-.294),(.101,-.319),(.046,-.35),(.021,-.34)],.09,steel))
for sign in [-1,1]:
    magparts.append(poly('Cell side plate',[(-.105,-.069),(-.012,-.08),(.024,-.136),(-.079,-.16)],.008,shell,sign*.065))
    for i in range(5):
        o=box('Magazine flute',(.012+i*.006,sign*.045,-.19-i*.022),(.044,.005,.006),steel,.001);o.rotation_euler.y=-.3;magparts.append(o)
    for x,z in [(-.09,-.09),(-.03,-.105),(-.067,-.14)]:magparts.append(cyl('Cell screw',(x,sign*.072,z),.004,.004,dark,sides=8))
for o in magparts:o.parent=magroot
magroot['reload_direction']=[-.12,0,-.25]

bolt=box('Charging bolt',(.32,-.053,.14),(.11,.035,.018),edge)
bolt['animatable']='Slide along X for charging'
for name,loc in [('MUZZLE',(-.672,0,.076)),('GRIP_SOCKET',(.255,0,-.08)),('SUPPORT_HAND',(-.26,0,-.045)),('EJECTION_PORT',(.035,.09,.125))]:
    o=bpy.data.objects.new('PC01_'+name,None);asset.objects.link(o);o.parent=root;o.location=loc;o.empty_display_size=.025

# Small readable markings on the visible side.
def label(text,loc,size):
    bpy.ops.object.text_add(location=loc,rotation=(math.pi/2,0,0))
    o=bpy.context.object;o.data.body=text;o.data.size=size;o.data.extrude=.00005
    bpy.ops.object.convert(target='MESH');return register(bpy.context.object,'Decal '+text,ink,0)
label('PC-01  /  PULSE CARBINE',(-.22,-.079,.171),.012)
label('ION SYSTEMS',(-.40,-.089,.058),.009)
label('07',(.01,-.071,-.12),.018)

# Apply bevels and create one packed, non-overlapping UV atlas across all parts.
bpy.ops.object.select_all(action='DESELECT')
for o in parts:
    o.select_set(True);bpy.context.view_layer.objects.active=o
    for mod in list(o.modifiers):bpy.ops.object.modifier_apply(modifier=mod.name)
    o.select_set(False)
for o in parts:o.select_set(True)
bpy.context.view_layer.objects.active=parts[0]
bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT')

bpy.ops.uv.smart_project(angle_limit=1.15,island_margin=.008)
bpy.ops.object.mode_set(mode='OBJECT')
try:
    bpy.ops.uv.export_layout(filepath=str(OUT/'uv-layout.png'),size=(2048,2048),export_all=True)
except Exception as e: print('UV layout preview unavailable:',e)

# Export only the asset hierarchy, never the studio.
for o in asset.objects:o.select_set(True)
import runpy
export_stats=runpy.run_path(str(OUT/'export_asset.py'))['export_optimized'](asset,root,OUT/'pulse-carbine.glb')

# Self-contained studio scene for review renders.
world=bpy.data.worlds.new('PC01 Studio World');world.use_nodes=True
world.node_tree.nodes.get('Background').inputs[0].default_value=(.045,.06,.075,1)
world.node_tree.nodes.get('Background').inputs[1].default_value=.45;scene.world=world
def studio_obj(o):
    for c in list(o.users_collection):c.objects.unlink(o)
    studio.objects.link(o)
def aim(o,target):o.rotation_euler=(Vector(target)-o.location).to_track_quat('-Z','Y').to_euler()
for name,loc,power,size,color in [('Key',(-.4,-1.5,2),180,2,(.8,.9,1)),('Rim',(.2,1.2,1),220,1.4,(.2,.75,1)),('Fill',(-1,-.4,.3),65,1,(1,.7,.45))]:
    bpy.ops.object.light_add(type='AREA',location=loc);o=bpy.context.object;o.name=name;studio_obj(o);o.data.energy=power;o.data.shape='DISK';o.data.size=size;o.data.color=color;aim(o,(0,0,0))
bpy.ops.object.camera_add(location=(-1.05,-2.4,.85));cam=bpy.context.object;studio_obj(cam);cam.name='PC01 Review Camera';aim(cam,(-.035,0,-.015));cam.data.type='ORTHO';cam.data.ortho_scale=1.6;scene.camera=cam
scene.render.resolution_x=1600;scene.render.resolution_y=1000;scene.render.resolution_percentage=100
try:scene.render.engine='CYCLES'
except TypeError:pass
if hasattr(scene,'cycles'):scene.cycles.samples=32
scene.render.filepath=str(OUT/'preview.png')
scene.render.image_settings.file_format='PNG'
scene.view_settings.view_transform='AgX'
reference=OUT/'reference.png'
if reference.exists():
    img=bpy.data.images.load(str(reference),check_existing=True);img.pack()
    o=bpy.data.objects.new('REFERENCE / packed image',None);studio.objects.link(o);o.empty_display_type='IMAGE';o.data=img;o.hide_viewport=True;o.hide_render=True
scene['asset_notes']='UV-unwrapped, material-based PBR. No baked texture maps. Reference reconstruction, unseen surfaces interpreted.'
triangles=sum(len(p.vertices)-2 for o in parts for p in o.data.polygons)
info={'name':'PC-01 Pulse Carbine','mesh_objects':len(parts),'triangles':triangles,'uv_layers':sorted(set(uv.name for o in parts for uv in o.data.uv_layers)),'length_metres':1.28,'blender_forward':'-X','materials':'PBR material colors, no baked texture maps','animation_parts':['PC01_MAGAZINE_ROOT','PC01_Trigger','PC01_Charging bolt'],'attachments':['PC01_MUZZLE','PC01_GRIP_SOCKET','PC01_SUPPORT_HAND','PC01_EJECTION_PORT']}
info.update(export_stats)
(OUT/'asset-info.json').write_text(json.dumps(info,indent=2))
bpy.data.libraries.write(str(OUT/'pulse-carbine.blend'),{scene},fake_user=True)
bpy.ops.render.render(write_still=True)
print(json.dumps(info))
