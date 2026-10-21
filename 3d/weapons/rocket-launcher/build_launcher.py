"""Reference-inspired RL-01 launcher and matching rocket. Run in Blender."""
import bpy, math, json
from pathlib import Path
from mathutils import Vector
OUT=Path(__file__).resolve().parent
OUT.mkdir(parents=True,exist_ok=True)
scene=bpy.data.scenes.new('RL-01 / Breacher Launcher');bpy.context.window.scene=scene
launcher=bpy.data.collections.new('RL01_LAUNCHER');projectile=bpy.data.collections.new('RL01_PROJECTILE');studio=bpy.data.collections.new('RL01_STUDIO')
for c in (launcher,projectile,studio):scene.collection.children.link(c)
root=bpy.data.objects.new('RL01_ROOT',None);launcher.objects.link(root)
rocketroot=bpy.data.objects.new('ROCKET01_ROOT',None);projectile.objects.link(rocketroot)
active_collection=launcher;active_root=root;parts=[];rocketparts=[]

def enum(owner,key,value):
    choices=owner.bl_rna.properties[key].enum_items
    match=next((i.identifier for i in choices if i.identifier==value),None)
    if match:setattr(owner,key,match)

def mat(name,color,metal=.7,rough=.4,emit=0):
    m=bpy.data.materials.new('RL01 / '+name);m.use_nodes=True
    n=next(n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
    n.inputs['Base Color'].default_value=(*color,1);n.inputs['Metallic'].default_value=metal;n.inputs['Roughness'].default_value=rough
    if emit:n.inputs['Emission Color'].default_value=(*color,1);n.inputs['Emission Strength'].default_value=emit
    m.diffuse_color=(*color,1);return m
orange=mat('Burnt orange armor',(.52,.205,.065),.6,.48)
steel=mat('Machined dark steel',(.16,.205,.23),.88,.32)
edge=mat('Graphite structure',(.037,.05,.062),.8,.35)
silver=mat('Edge metal',(.4,.47,.5),.85,.3)
black=mat('Bore / recess',(.009,.014,.018),.2,.6)
rubber=mat('Rubber',(.028,.035,.039),.02,.78)
yellow=mat('Safety yellow',(.92,.56,.065),.35,.43)
green=mat('Optic green',(.025,.24,.12),.2,.2,1)
cyan=mat('Status cyan',(.01,.7,.8),.15,.2,2)

def register(o,name,material,bevel=.002):
    o.name=('RL01_' if active_collection==launcher else 'ROCKET01_')+name
    for c in list(o.users_collection):c.objects.unlink(o)
    active_collection.objects.link(o);o.parent=active_root
    o.data.materials.append(material)
    if bevel:
        mod=o.modifiers.new('Machined edge','BEVEL');mod.width=bevel;mod.segments=2
    (parts if active_collection==launcher else rocketparts).append(o);return o

def box(name,loc,dims,material,bevel=.002):
    bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=bpy.context.object;o.dimensions=dims
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    return register(o,name,material,bevel)

def poly(name,points,depth,material,y=0,bevel=.002):
    n=len(points);v=[(x,y-depth/2,z) for x,z in points]+[(x,y+depth/2,z) for x,z in points]
    f=[tuple(range(n-1,-1,-1)),tuple(range(n,n*2))]+[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
    mesh=bpy.data.meshes.new(name);mesh.from_pydata(v,[],f);mesh.update();o=bpy.data.objects.new(name,mesh);active_collection.objects.link(o)
    return register(o,name,material,bevel)

def cyl(name,loc,r,depth,material,axis='X',sides=24):
    bpy.ops.mesh.primitive_cylinder_add(vertices=sides,radius=r,depth=depth,location=loc);o=bpy.context.object
    if axis=='X':o.rotation_euler.y=math.pi/2
    elif axis=='Y':o.rotation_euler.x=math.pi/2
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    return register(o,name,material,.001)

def lathe(name,profile,material,center_z=.15,sides=32,closed=True):
    vertices=[(x,math.sin(a*math.tau/sides)*r,center_z+math.cos(a*math.tau/sides)*r) for x,r in profile for a in range(sides)]
    faces=[]
    for i in range(len(profile) if closed else len(profile)-1):
        j=(i+1)%len(profile)
        for a in range(sides):faces.append((i*sides+a,i*sides+(a+1)%sides,j*sides+(a+1)%sides,j*sides+a))
    mesh=bpy.data.meshes.new(name);mesh.from_pydata(vertices,[],faces);mesh.update();o=bpy.data.objects.new(name,mesh);active_collection.objects.link(o)
    return register(o,name,material,.001)

# Genuine hollow muzzle and through-tube, with a flared front rim.
lathe('Main launch tube',[(-.55,.178),(.55,.178),(.55,.15),(-.55,.15)],steel)
lathe('Front muzzle bell',[(-.73,.207),(-.70,.23),(-.62,.23),(-.57,.204),(-.43,.195),(-.43,.163),(-.6,.163),(-.73,.18)],edge)
for x,r in [(-.70,.23),(-.62,.23),(-.54,.206),(-.45,.198)]:lathe('Muzzle band',[(x-.012,r+.008),(x+.012,r+.008),(x+.012,r-.006),(x-.012,r-.006)],silver)
lathe('Inner muzzle liner',[(-.729,.178),(-.48,.161),(-.48,.156),(-.729,.172)],black)
lathe('Rear exhaust bell',[(.43,.18),(.55,.185),(.65,.22),(.72,.22),(.74,.207),(.74,.175),(.65,.175),(.53,.15),(.43,.15)],steel)
for x,r in [(.46,.184),(.57,.199),(.69,.222)]:lathe('Rear reinforcing ring',[(x-.012,r+.008),(x+.012,r+.008),(x+.012,r-.005),(x-.012,r-.005)],edge)

# Orange segmented armor wraps around the main tube.
lathe('Orange tube armor',[(-.43,.186),(.03,.186),(.03,.18),(-.43,.18)],orange,sides=16)
for sign in [-1,1]:
    y=sign*.185
    poly('Forward armor panel',[(-.43,.255),(-.09,.27),(.04,.22),(.04,.09),(-.43,.075)],.015,orange,y)
    box('Vent recess',(-.205,sign*.199,.13),(.42,.014,.074),black)
    for i in range(8):box('Cooling fin',(-.38+i*.047,sign*.212,.13),(.014,.023,.066),steel,.001)
    poly('Receiver armor',[(-.035,.31),(.18,.285),(.3,.21),(.3,.00),(.22,-.072),(.035,-.055),(-.02,.03)],.025,orange,sign*.172)
    poly('Receiver frame',[(-.055,.32),(.19,.3),(.325,.22),(.325,-.005),(.23,-.094),(.02,-.077),(-.04,.02)],.02,edge,sign*.151)
    box('Control panel',(.13,sign*.193,.15),(.23,.025,.08),edge)
    for i in range(5):box('Control grille',(.075+i*.025,sign*.209,.15),(.013,.009,.055),steel,.001)
    box('Status display',(.035,sign*.209,.15),(.035,.006,.043),cyan,.001)
    poly('Lower cooling slot',[(.04,.035),(.22,.035),(.252,-.002),(.2,-.042),(.015,-.032)],.008,black,sign*.191)
    for i in range(5):box('Lower grille',(.04+i*.033,sign*.202,-.005),(.012,.013,.035),silver,.001)
    # Side pistons beneath the barrel.
    cyl('Side piston',(-.23,sign*.17,-.105),.013,.34,silver)
    cyl('Piston shroud',(-.09,sign*.17,-.105),.021,.10,steel)
    for x,z in [(-.42,.247),(-.38,.085),(-.05,.24),(.02,.285),(.27,.205),(.28,.075),(.04,-.05)]:
        cyl('Armor bolt',(x,sign*.208,z),.006,.006,silver,'Y',12)
        cyl('Bolt socket',(x,sign*.213,z),.0023,.003,black,'Y',8)

# Hazard-striped top rail, solid geometry so no texture dependency.
box('Hazard rail',(-.21,0,.351),(.5,.09,.033),edge)
for sign in [-1,1]:
    box('Hazard backing',(-.21,sign*.052,.353),(.46,.008,.027),yellow,.001)
    for i in range(12):poly('Hazard stripe',[(-.435+i*.038,.34),(-.418+i*.038,.34),(-.401+i*.038,.367),(-.418+i*.038,.367)],.002,black,sign*.057,.0002)
for i in range(13):box('Rail tooth',(-.445+i*.039,0,.378),(.02,.074,.012),steel,.001)

# Forward hand grip and trigger assembly.
poly('Main grip frame',[(.055,-.07),(.16,-.07),(.16,-.185),(.115,-.37),(.025,-.354),(.005,-.30)],.083,orange)
poly('Main rubber grip',[(.051,-.16),(.129,-.17),(.092,-.338),(.034,-.326),(.022,-.287)],.093,rubber)
for i in range(7):
    z=-.19-i*.02;box('Grip texture',(.066,0,z),(.058,.097,.004),steel,.0005)
poly('Trigger guard front',[(.195,-.07),(.22,-.075),(.22,-.205),(.195,-.21)],.03,edge)
poly('Trigger guard bottom',[(.11,-.215),(.22,-.21),(.22,-.186),(.12,-.19)],.03,edge)
poly('Trigger',[(.164,-.08),(.178,-.08),(.178,-.14),(.159,-.16),(.15,-.15)],.016,silver)
poly('Forward grip',[(.41,-.03),(.47,-.03),(.493,-.24),(.461,-.263),(.421,-.25)],.078,edge)
poly('Forward grip rubber',[(.428,-.09),(.46,-.09),(.475,-.235),(.444,-.241)],.084,rubber)
box('Grip hazard plate',(.441,-.049,-.065),(.062,.008,.036),yellow)
for i in range(3):poly('Grip hazard stripe',[(.414+i*.02,-.083),(.422+i*.02,-.083),(.442+i*.02,-.047),(.434+i*.02,-.047)],.002,black,-.055,.0001)

# Skeletal shoulder support below the forward tube, with an open centre.
poly('Shoulder brace front',[(-.46,-.08),(-.38,-.09),(-.40,-.23),(-.32,-.30),(-.34,-.33),(-.46,-.25)],.09,edge)
poly('Shoulder brace lower',[(-.34,-.33),(.026,-.36),(.035,-.325),(-.32,-.30)],.065,steel)
poly('Shoulder rest',[(-.46,-.085),(-.3,-.085),(-.31,-.2),(-.40,-.23),(-.46,-.2)],.11,rubber)

# Box optic with a visible green glass front, mounting base and controls.
box('Optic mount',(.08,0,.365),(.22,.10,.045),edge)
poly('Optic housing',[(-.015,.385),(-.01,.50),(.02,.535),(.11,.535),(.14,.50),(.15,.385)],.10,steel)
box('Optic face',(-.019,0,.471),(.008,.075,.076),black,.003)
box('Optic glass',(-.024,0,.472),(.004,.062,.061),green,.001)
box('Optic reticle',(-.027,0,.472),(.002,.027,.0015),yellow,.0001)
box('Optic reticle',(-.027,0,.472),(.002,.0015,.027),yellow,.0001)
for i in range(2):cyl('Optic adjustment',(.045+i*.06,-.065,.395),.016,.018,steel,'Y',16)

def label(text,loc,size,material):
    bpy.ops.object.text_add(location=loc,rotation=(math.pi/2,0,0));o=bpy.context.object;o.data.body=text;o.data.size=size;o.data.extrude=.00004;bpy.ops.object.convert(target='MESH');register(bpy.context.object,'Marking '+text,material,0)
label('RL-01 / BREACHER',(-.37,-.207,.225),.018,black)
label('BACKBLAST',(.39,-.18,.17),.017,silver)
label('DANGER',(.4,-.18,.143),.012,silver)
for name,loc in [('MUZZLE',(-.745,0,.15)),('BACKBLAST',(.75,0,.15)),('GRIP_SOCKET',(.08,0,-.24)),('SUPPORT_HAND',(.45,0,-.16))]:
    o=bpy.data.objects.new('RL01_'+name,None);launcher.objects.link(o);o.parent=root;o.location=loc;o.empty_display_size=.03

# Separate matching finned projectile; its nose points -X, like the launcher.
active_collection=projectile;active_root=rocketroot
lathe('Warhead',[(-.29,.001),(-.26,.028),(-.19,.053),(-.10,.055),(-.10,.001)],orange,center_z=0,sides=16)
cyl('Motor casing',(.035,0,0),.046,.27,steel,sides=16)
for x in [-.10,-.065,.12]:cyl('Motor band',(x,0,0),.048,.013,edge,sides=16)
lathe('Exhaust nozzle',[(.16,.033),(.205,.026),(.205,.016),(.16,.022)],edge,center_z=0,sides=16)
for a in range(4):
    o=poly('Stabilizer fin',[(.04,.035),(.13,.095),(.18,.095),(.16,.035)],.008,orange,bevel=.0008);o.rotation_euler.x=a*math.pi/2
cyl('Warhead stripe',(-.13,0,0),.056,.018,yellow,sides=16)
o=bpy.data.objects.new('ROCKET01_EXHAUST',None);projectile.objects.link(o);o.parent=rocketroot;o.location=(.21,0,0);o.empty_display_size=.02

def prepare(objects,uvfile):
    bpy.ops.object.select_all(action='DESELECT')
    for o in objects:
        o.select_set(True);bpy.context.view_layer.objects.active=o
        for mod in list(o.modifiers):bpy.ops.object.modifier_apply(modifier=mod.name)
        o.select_set(False)
    for o in objects:o.select_set(True)
    bpy.context.view_layer.objects.active=objects[0];bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.uv.smart_project(angle_limit=1.15,island_margin=.008);bpy.ops.object.mode_set(mode='OBJECT')
    bpy.ops.uv.export_layout(filepath=str(OUT/uvfile),size=(2048,2048),export_all=True)
prepare(parts,'launcher-uv.png');prepare(rocketparts,'rocket-uv.png')

import runpy
export_model=runpy.run_path(str(OUT/'export_models.py'))['export_model']
launcher_export=export_model(launcher,OUT/'rocket-launcher.glb')
rocket_export=export_model(projectile,OUT/'rocket.glb')

# Source remains unmerged for editing; exported low-poly meshes are self-contained.
rocketroot.location=(0,-.04,-.65)
world=bpy.data.worlds.new('RL01 Studio World');world.use_nodes=True
background=next(n for n in world.node_tree.nodes if n.type=='BACKGROUND');background.inputs[0].default_value=(.045,.06,.075,1);background.inputs[1].default_value=.45;scene.world=world
def studio_obj(o):
    for c in list(o.users_collection):c.objects.unlink(o)
    studio.objects.link(o)
def aim(o,p):o.rotation_euler=(Vector(p)-o.location).to_track_quat('-Z','Y').to_euler()
for name,loc,power,size,color in [('Key',(-.6,-1.5,2),240,2,(.85,.92,1)),('Rim',(.4,1.2,1.4),260,1.6,(.3,.7,1)),('Fill',(-1.3,-.6,.1),85,1,(1,.7,.4))]:
    data=bpy.data.lights.new('RL01 '+name,'AREA');o=bpy.data.objects.new(name,data);studio.objects.link(o);o.location=loc;data.energy=power;data.size=size;data.color=color;aim(o,(0,0,0))
bpy.ops.object.camera_add(location=(-1.2,-2.7,1.0));cam=bpy.context.object;studio_obj(cam);aim(cam,(0,0,-.06));enum(cam.data,'type','ORTHO');cam.data.ortho_scale=1.95;scene.camera=cam
scene.render.resolution_x=1600;scene.render.resolution_y=1100;scene.render.resolution_percentage=100
try:scene.render.engine='CYCLES'
except TypeError:pass
if hasattr(scene,'cycles'):scene.cycles.samples=32
enum(scene.render.image_settings,'file_format','PNG');scene.render.filepath=str(OUT/'preview.png')
reference=OUT/'reference.png'
if reference.exists():
    image=bpy.data.images.load(str(reference),check_existing=True);image.pack();o=bpy.data.objects.new('RL01 packed reference',None);studio.objects.link(o);enum(o,'empty_display_type','IMAGE');o.data=image;o.hide_viewport=True;o.hide_render=True
issues=[]
for o in parts+rocketparts:
    if not o.data.uv_layers:issues.append(o.name+' missing UV')
    if o.data.validate():issues.append(o.name+' mesh corrected')
    for uv in o.data.uv_layers.active.data:
        if any(not math.isfinite(c) or c<-.0001 or c>1.0001 for c in uv.uv):issues.append(o.name+' invalid UV');break
info={'launcher_meshes':len(parts),'launcher_triangles':sum(len(p.vertices)-2 for o in parts for p in o.data.polygons),'rocket_meshes':len(rocketparts),'rocket_triangles':sum(len(p.vertices)-2 for o in rocketparts for p in o.data.polygons),'forward':'-X','up':'Z','units':'metres','validation_issues':issues,'materials':'PBR material colors; no baked texture maps','animations':'none; trigger and sockets are separate'}
info.update({'launcher_export':launcher_export,'rocket_export':rocket_export})
(OUT/'asset-info.json').write_text(json.dumps(info,indent=2))
bpy.data.libraries.write(str(OUT/'rocket-launcher.blend'),{scene},fake_user=True)
bpy.ops.render.render(write_still=True)
import subprocess
subprocess.run([bpy.app.binary_path,'--background',str(OUT/'rocket-launcher.blend'),'--python',str(OUT/'finalize_blends.py')],check=True,stdout=subprocess.PIPE,stderr=subprocess.STDOUT)
print(json.dumps(info))
