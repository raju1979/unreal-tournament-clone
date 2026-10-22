"""Original Ember Foundry arena. Run with Blender --background --python this_file.
Game coordinates are X,Y-up,Z; Blender coordinates are X,-Z,Y.
Image textures are generated locally, packed in the blend, and embedded in GLB.
"""
import bpy, math, random, json, os
from mathutils import Vector

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT = os.path.join(ROOT, '3d', 'foundry-arena')
os.makedirs(OUT, exist_ok=True)
# Create a separate scene: never delete the user's current scene.
scene = bpy.data.scenes.new('Ember Foundry')
bpy.context.window.scene = scene
colliders, objects = [], []
rng = random.Random(731)

def tile(name, base, brick=False):
    size = 256
    im = bpy.data.images.new(name, width=size, height=size)
    pixels = []
    for y in range(size):
        row = y // 32
        for x in range(size):
            xx = (x + (32 if row % 2 else 0)) % 64
            mortar = brick and (xx < 2 or y % 32 < 2)
            grain = rng.uniform(-.055, .055)
            variation = .85 + .13 * math.sin(row * 29 + (x + (32 if row % 2 else 0)) // 64 * 17)
            moss = .025 * max(0, math.sin(x*.05) * math.sin(y*.07))
            pixels.extend([max(.01, min(1, c * (.30 if mortar else variation) + grain + (moss if i == 1 else 0))) for i,c in enumerate(base)] + [1])
    im.pixels = pixels
    im.filepath_raw = os.path.join(OUT, name + '.png')
    im.file_format = 'PNG'
    im.save()
    im.pack()
    return im

stone_image = tile('foundry-concrete', (.36,.38,.40), True)
iron_image = tile('foundry-steel', (.22,.29,.34))
wood_image = tile('foundry-rust', (.38,.19,.09))

def material(name, color, image=None, glow=0):
    m = bpy.data.materials.new(name)
    m.diffuse_color = (*color,1)
    m.use_nodes = True
    bsdf = next(n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    bsdf.inputs['Base Color'].default_value = (*color,1)
    bsdf.inputs['Roughness'].default_value = .88
    if image:
        tex = m.node_tree.nodes.new('ShaderNodeTexImage')
        tex.image = image
        m.node_tree.links.new(tex.outputs['Color'], bsdf.inputs['Base Color'])
        bump = m.node_tree.nodes.new('ShaderNodeBump')
        bump.inputs['Strength'].default_value = .32
        bump.inputs['Distance'].default_value = .10
        m.node_tree.links.new(tex.outputs['Color'], bump.inputs['Height'])
        m.node_tree.links.new(bump.outputs['Normal'], bsdf.inputs['Normal'])
    if glow:
        bsdf.inputs['Emission Color'].default_value = (*color,1)
        bsdf.inputs['Emission Strength'].default_value = glow
    return m

stone = material('Foundry concrete', (.34,.32,.25), stone_image)
iron = material('Blue steel panels', (.20,.24,.21), iron_image)
wood = material('Oxidized copper', (.25,.17,.09), wood_image)
trim = material('Poured concrete', (.39,.37,.28), stone_image)
water = material('Luminous jade reservoir', (.025,.30,.23), glow=.45)
ember = material('Molten orange', (1,.42,.08), glow=4)
red = material('Crimson cloth', (.30,.025,.018))
gold = material('Safety yellow', (.65,.39,.10))
black = material('Window recess', (.025,.045,.035))
green = material('Green stained glass', (.07,.29,.14), glow=.7)

def cube(name,x,y,z,w,h,d,mat,solid=False,kind='wall'):
    bpy.ops.mesh.primitive_cube_add(size=1, location=(x,-z,y))
    o = bpy.context.object
    o.name = name
    o.scale = (w,d,h)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    o.data.materials.append(mat)
    # World-scale UVs keep large wall bricks from stretching across entire walls.
    if o.data.uv_layers.active:
        for poly in o.data.polygons:
            axis = max(range(3), key=lambda a: abs(poly.normal[a]))
            axes = [a for a in range(3) if a != axis]
            for li in poly.loop_indices:
                co = o.data.vertices[o.data.loops[li].vertex_index].co
                o.data.uv_layers.active.data[li].uv = (co[axes[0]]/4,co[axes[1]]/4)
    objects.append(o)
    if solid:
        colliders.append(dict(name=name,x=x,y=y,z=z,w=w,h=h,d=d,kind=kind))
    return o

cyan = material('Foundry cyan guidance',(.05,.55,.85),glow=2)
dark = material('Foundry charcoal',(.045,.065,.08))

def cylinder(name,x,y,z,r,h,mat,solid=False):
    bpy.ops.mesh.primitive_cylinder_add(vertices=16,radius=r,depth=h,location=(x,-z,y))
    o=bpy.context.object;o.name=name;o.data.materials.append(mat);objects.append(o)
    if solid:colliders.append(dict(name=name,x=x,y=y,z=z,w=2*r,h=h,d=2*r,kind='wall'))
    return o

def text(label,x,y,z,size,mat):
    bpy.ops.object.text_add(location=(x,-z,y),rotation=(math.pi/2,0,0))
    o=bpy.context.object;o.name='Foundry sign '+label;o.data.body=label;o.data.size=size;o.data.align_x='CENTER'
    o.data.extrude=.005;o.data.materials.append(mat)
    bpy.ops.object.convert(target='MESH');objects.append(bpy.context.object)

cube('Foundry foundation',0,-1,0,64,2,52,stone,True,'floor')
for x in [-32,32]:cube('Foundry perimeter wall',x,7,0,1.2,16,53,iron,True)
for z in [-26,26]:cube('Foundry end wall',0,7,z,64,16,1.2,iron,True)
cube('Sealed industrial roof',0,15.6,0,65,.6,53,dark,True)
for x in range(-28,29,4):cube('Floor expansion seam',x,.012,0,.035,.02,50,dark)
for z in range(-24,25,4):cube('Floor expansion seam',0,.014,z,62,.02,.035,dark)
# H-shaped upper route: two long galleries and a cross-hall bridge.
for x in [-20,20]:
    cube('Upper service gantry',x,2.7,0,6,.6,32,iron,True,'floor')
    for sign in [-1,1]:
        for i in range(15):
            top=(i+1)*.2
            cube('Gantry access stair',x,top/2,sign*(24.7-i*.6),5,top,.64,iron,True,'stair')
            cube('Stair yellow nosing',x,top+.012,sign*(24.94-i*.6),5,.024,.07,gold)
    for z in [-12,-6,6,12]:
        cube('Gantry inner parapet',x+(-2.7 if x>0 else 2.7),3.55,z,.4,1.1,3,iron,True)
        cube('Gantry outer parapet',x+(2.7 if x>0 else -2.7),3.55,z,.4,1.1,3,iron,True)
    for z in [-12,12]:cube('Gantry support',x,1.2,z,1.4,2.4,1.4,iron,True)
    for edge in [-2.8,2.8]:cube('Gantry yellow edge',x+edge,3.015,0,.12,.03,32,gold)
cube('Cross hall command bridge',0,2.7,0,40,.6,6,iron,True,'floor')
for z in [-2.8,2.8]:
    cube('Bridge yellow edge',0,3.015,z,34,.03,.12,gold)
    for x in [-12,-6,6,12]:cube('Bridge interrupted cover',x,3.55,z,3,1.1,.4,iron,True)
for x in [-12,12]:cube('Command bridge support',x,1.2,0,1.5,2.4,1.5,iron,True)
# Two massive sealed furnaces create a figure-eight circulation on the ground.
for z in [-12,12]:
    cube('Furnace plinth',0,.35,z,10,.7,10,iron,True)
    cube('Smelting furnace',0,4.5,z,8,8,8,wood,True)
    for y in [1,3,7.6]:cube('Furnace armor band',0,y,z,8.4,.3,8.4,dark,True)
    cylinder('Furnace exhaust',0,11,z,1.65,7,iron,True)
    for y in [8.5,10.5,12.5,14]:cylinder('Exhaust collar',0,y,z,1.9,.24,dark)
    for side in [-1,1]:
        cube('Recessed furnace face',side*4.23,4,z,.06,4.4,5,dark)
        cube('Furnace orange aperture',side*4.27,4,z,.07,3.3,4,ember)
        for dz in [-1.6,-.8,0,.8,1.6]:cube('Furnace face grate',side*4.34,4,z+dz,.12,3.6,.14,iron)
    for offset in [-1.8,0,1.8]:cube('Furnace front vent',offset,5,z-4.25,.18,2.8,.12,ember)
    text('F-01' if z<0 else 'F-02',0,7.7,z-4.35,.65,gold)
# Wall ribs, overhead process pipes, crane beam and readable bay numbering.
for z in [-22,-11,0,11,22]:
    for x in [-31,31]:
        cube('Wall structural rib',x,7,z,1.2,14,1.2,dark,True)
        cube('Cool wall strip',x+(.65 if x<0 else -.65),7,z,.08,4,.14,cyan)
    cube('Roof truss',0,14.3,z,62,.65,.75,iron,True)
for x in [-27,27]:
    pipe=cylinder('Overhead process pipeline',x,11,0,.65,49,wood)
    pipe.rotation_euler.x=math.pi/2
    for z in [-20,-10,0,10,20]:
        pipe=cylinder('Process pipe collar',x,11,z,.8,.3,iron);pipe.rotation_euler.x=math.pi/2
cube('Overhead crane beam',0,12.8,0,56,1.2,1.4,gold,True)
cube('Crane trolley',5,11.7,0,3,1,2.3,iron,True)
cube('Crane hanging cable',5,9.4,0,.08,3.5,.08,dark)
for x,z in [(-10,-20),(10,20),(-10,9),(10,-9),(-27,-7),(27,7)]:
    cube('Cargo cover',x,1,z,3,2,2.4,iron,True)
    for dx in [-1.1,1.1]:cube('Cargo yellow corner',x+dx,1,z,.12,2.03,2.45,gold)
for z in [-25.2,25.2]:
    cube('Sealed loading bay',0,4,z,12,8,.25,dark)
    for y in range(1,8):cube('Loading bay slat',0,y,z+(.16 if z<0 else -.16),11,.09,.08,iron)
text('EMBER / 06',0,10,-25.1,1.3,gold)
text('SMELTING DIVISION',0,8.7,-25.1,.45,cyan)
# Lighting included in editable source, recreated by the game environment.
for x in [-7,7]:
    for z in [-12,12]:
        ld=bpy.data.lights.new('Furnace orange spill','POINT');ld.energy=1500;ld.color=(1,.28,.055);ld.shadow_soft_size=2
        o=bpy.data.objects.new('Furnace orange spill',ld);scene.collection.objects.link(o);o.location=(x,-z,5)
for z in [-18,0,18]:
    cube('Overhead light fixture',0,13,z,12,.3,1.2,iron)
    cube('Overhead light diffuser',0,12.8,z,11,.06,.8,cyan)
    ld=bpy.data.lights.new('Foundry overhead fill','AREA');ld.energy=4500;ld.color=(.62,.79,1);ld.shape='DISK';ld.size=13
    o=bpy.data.objects.new('Foundry overhead fill',ld);scene.collection.objects.link(o);o.location=(0,-z,12)

layout=dict(id='foundry',name='Ember Foundry',boxes=colliders,
    spawns=[[-27,0,-21],[27,0,21],[-27,0,21],[27,0,-21]],
    weaponSpawns=[[0,3,0],[-20,3,-8],[20,3,8],[0,0,-21],[0,0,21],[-12,0,12],[12,0,-12]],
    pickups=[dict(x=-12,y=0,z=-12,type='health'),dict(x=12,y=0,z=12,type='health'),dict(x=-20,y=3,z=8,type='ammo'),dict(x=20,y=3,z=-8,type='ammo')])
with open(os.path.join(OUT,'layout.json'),'w') as f:json.dump(layout,f,indent=2)
with open(os.path.join(ROOT,'shared','foundry-layout.ts'),'w') as f:f.write('// Generated by 3d/foundry-arena/build_foundry.py\nexport const foundryLayout = '+json.dumps(layout,separators=(',',':'))+';\n')
for mat in list(bpy.data.materials):
    obs=[o for o in scene.objects if o.type=='MESH' and o.data.materials and o.data.materials[0]==mat]
    if not obs:continue
    bpy.ops.object.select_all(action='DESELECT')
    for o in obs:o.select_set(True)
    bpy.context.view_layer.objects.active=obs[0]
    if len(obs)>1:bpy.ops.object.join()
    bpy.context.object.name='Ember Foundry '+mat.name
scene.world=bpy.data.worlds.new('Foundry atmosphere');scene.world.use_nodes=True
bg=next(n for n in scene.world.node_tree.nodes if n.type=='BACKGROUND');bg.inputs['Color'].default_value=(.13,.18,.24,1);bg.inputs['Strength'].default_value=.35
cd=bpy.data.cameras.new('Foundry overview');cam=bpy.data.objects.new('Foundry overview',cd);scene.collection.objects.link(cam)
cam.location=(27,23,7.5);cam.rotation_euler=(Vector((0,-2,5))-cam.location).to_track_quat('-Z','Y').to_euler();cd.lens=18;scene.camera=cam
scene.render.resolution_x=1440;scene.render.resolution_y=900;scene.render.resolution_percentage=100;scene.render.image_settings.file_format='PNG'
bpy.ops.object.select_all(action='DESELECT')
for o in scene.objects:
    if o.type=='MESH':o.select_set(True)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT,'ember-foundry.blend'))
bpy.ops.export_scene.gltf(filepath=os.path.join(OUT,'ember-foundry.glb'),use_selection=True,use_active_scene=True,export_yup=True)
print('FOUNDRY COMPLETE',len(colliders),'colliders',len([o for o in scene.objects if o.type=='MESH']),'mesh groups')

