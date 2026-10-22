"""Original Iron Veil fortress. Run with Blender --background --python this_file.
Game coordinates are X,Y-up,Z; Blender coordinates are X,-Z,Y.
Image textures are generated locally, packed in the blend, and embedded in GLB.
"""
import bpy, math, random, json, os
from mathutils import Vector

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT = os.path.join(ROOT, '3d', 'fortress-arena')
os.makedirs(OUT, exist_ok=True)
# Create a separate scene: never delete the user's current scene.
scene = bpy.data.scenes.new('Iron Veil Fortress')
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

stone_image = tile('fortress-stone', (.34,.32,.25), True)
iron_image = tile('aged-iron', (.20,.24,.21))
wood_image = tile('weathered-timber', (.25,.17,.09))

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

stone = material('Moss stained masonry', (.34,.32,.25), stone_image)
iron = material('Oxidized iron', (.20,.24,.21), iron_image)
wood = material('Old timber', (.25,.17,.09), wood_image)
trim = material('Pale worn limestone', (.39,.37,.28), stone_image)
water = material('Luminous jade reservoir', (.025,.30,.23), glow=.45)
ember = material('Torch amber', (1,.42,.08), glow=4)
red = material('Crimson cloth', (.30,.025,.018))
gold = material('Heraldic brass', (.65,.39,.10))
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

cube('Fortress foundation',0,-1,0,48,2,56,stone,True,'floor')
for x in [-24,24]: cube('East west curtain wall',x,8,0,1.5,18,57,stone,True)
for z in [-28,28]: cube('North south curtain wall',0,8,z,48,18,1.5,stone,True)
# Visually shallow water: solid floor stays at y=0 so all routes are safe for bots.
cube('Jade reflecting reservoir',0,.025,0,18,.035,20,water)
cube('Central altar platform',0,.4,0,9,.8,9,stone,True,'floor')
for z in [-7.4,7.4]: cube('Reservoir crossing',0,.10,z,4,.20,6,iron,True,'floor')
for x in [-7,7]: cube('Reservoir crossing',x,.10,0,6,.20,4,iron,True,'floor')
for s in [-1,1]:
    for i in range(3):
        top=(i+1)*.2
        cube('Altar stair',0,top/2,s*(5.6-i*.45),4,top,.5,trim,True,'stair')
for x in [-19.5,19.5]:
    cube('Upper gallery',x,2.9,0,6, .6,38,stone,True,'floor')
    for s in [-1,1]:
        for i in range(16):
            top=(i+1)*.2
            cube('Gallery access stair',x,top/2,s*(25.5-i*.44),5,top,.48,trim,True,'stair')
    for z in [-14,-7,0,7,14]:
        cube('Gallery parapet cover',x+(-2.6 if x>0 else 2.6),3.75,z,.6,1.1,3.4,iron,True)
    for z in [-12,12]:
        cube('Lower gallery pier',x,1.3,z,1.8,2.6,2,stone,True)
# Four monumental center columns with metal collars and crenellated feet.
for x in [-10,10]:
    for z in [-11,11]:
        cube('Column foot',x,.6,z,4,1.2,4,iron,True)
        cube('Monumental square column',x,7,z,2.4,12.8,2.4,stone,True)
        for y in [1.5,5.8,11.8,13.3]: cube('Column iron collar',x,y,z,3.1,.45,3.1,iron,True)
        for dx in [-1.6,1.6]: cube('Column foot fluting',x+dx,.8,z,.15,1.5,4.05,trim)
for x in [-10,10]: cube('High longitudinal beam',x,13.7,0,1.1,1.2,56,wood,True)
for z in [-21,-11,0,11,21]:
    cube('High transverse beam',0,14.6,z,48,1.2,1.0,wood,True)
    for x in [-23,23]: cube('Wall buttress',x,7,z,1.2,14,2.2,iron,True)
    cube('Roof coffer',0,16.8,z,47,.4,7,wood)
# Far-wall rose windows use a dark disc, green glass and radial metal tracery.
for x in [-15,15]:
    for z in [-27.15,27.15]:
        bpy.ops.mesh.primitive_cylinder_add(vertices=32,radius=2.6,depth=.16,location=(x,-z,6.4),rotation=(math.pi/2,0,0))
        o=bpy.context.object;o.name='Rose window stone rim';o.data.materials.append(iron);objects.append(o)
        bpy.ops.mesh.primitive_cylinder_add(vertices=32,radius=2.2,depth=.19,location=(x,-z,6.4),rotation=(math.pi/2,0,0))
        o=bpy.context.object;o.name='Emerald rose glass';o.data.materials.append(green);objects.append(o)
        for a in range(8):
            angle=a*math.pi/4
            o=cube('Window radial tracery',x,6.4,z+(.13 if z<0 else -.13),.11,4.4,.14,iron)
            o.rotation_euler.y=angle
        cube('Window sill',x,3.6,z,6,.45,.65,trim)
# Original pennants and brass diamond emblems, no borrowed game artwork.
for x in [-5.5,5.5]:
    cube('Crimson hanging pennant',x,7.8,27.05,2.7,6,.10,red)
    cube('Banner crossbar',x,11,26.9,3.3,.15,.25,gold)
    o=cube('Iron Veil diamond sigil',x,8,26.9,1.15,1.15,.14,gold);o.rotation_euler.y=math.pi/4
    cube('Sigil central blade',x,7.7,26.8,.18,3,.15,trim)
for x,z in [(-14,-20),(14,20),(-14,8),(14,-8)]:
    cube('Stone cover sarcophagus',x,.8,z,3,1.6,2,stone,True)
    cube('Sarcophagus iron lid',x,1.7,z,3.2,.2,2.2,iron,True)
torches=[]
for x in [-22,22]:
    for z in [-20,-8,8,20]:
        cube('Torch bracket',x,5,z,.7,.3,.7,iron)
        cube('Torch stem',x,5.5,z,.18,.9,.18,wood)
        for dx in [-.22,0,.22]:
            bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1,radius=.24,location=(x+dx,-z,6.15))
            o=bpy.context.object;o.name='Amber torch flame';o.scale.z=2;o.data.materials.append(ember);objects.append(o)
        torches.append([x,6.25,z])
        ld=bpy.data.lights.new('Amber torch','POINT');ld.energy=650;ld.color=(1,.48,.17);ld.shadow_soft_size=1
        ob=bpy.data.objects.new('Amber torch',ld);scene.collection.objects.link(ob);ob.location=(x,-z,6.25)

layout=dict(id='fortress',name='Iron Veil Fortress',boxes=colliders,
    spawns=[[-14,0,-23],[14,0,23],[-14,0,23],[14,0,-23]],
    weaponSpawns=[[0,.8,0],[-19.5,3.2,0],[19.5,3.2,0],[0,0,-22],[0,0,22],[14,0,0],[-14,0,0]],
    pickups=[dict(x=0,y=0,z=-16,type='health'),dict(x=0,y=0,z=16,type='health'),dict(x=-19.5,y=3.2,z=-10,type='ammo'),dict(x=19.5,y=3.2,z=10,type='ammo')])
with open(os.path.join(OUT,'layout.json'),'w') as f: json.dump(layout,f,indent=2)
with open(os.path.join(ROOT,'shared','fortress-layout.ts'),'w') as f:
    f.write('// Generated by 3d/fortress-arena/build_fortress.py\nexport const fortressLayout = '+json.dumps(layout,separators=(',',':'))+';\n')
# Merge per material: few draw calls while retaining editable material groups.
for mat in [stone,iron,wood,trim,water,ember,red,gold,black,green]:
    obs=[o for o in scene.objects if o.type=='MESH' and o.data.materials[0]==mat]
    if not obs: continue
    bpy.ops.object.select_all(action='DESELECT')
    for o in obs:o.select_set(True)
    bpy.context.view_layer.objects.active=obs[0];bpy.ops.object.join()
    bpy.context.object.name='Iron Veil '+mat.name

scene.world=bpy.data.worlds.new('Fortress twilight');scene.world.use_nodes=True
bg=next(n for n in scene.world.node_tree.nodes if n.type=='BACKGROUND')
bg.inputs['Color'].default_value=(.17,.21,.19,1);bg.inputs['Strength'].default_value=.5
ld=bpy.data.lights.new('Vault soft fill','AREA');ld.energy=3800;ld.shape='DISK';ld.size=20
ob=bpy.data.objects.new('Vault soft fill',ld);scene.collection.objects.link(ob);ob.location=(0,0,13)
cd=bpy.data.cameras.new('Fortress reference view');cam=bpy.data.objects.new('Fortress reference view',cd);scene.collection.objects.link(cam)
cam.location=(17,23,5);cam.rotation_euler=(Vector((0,-3,5.8))-cam.location).to_track_quat('-Z','Y').to_euler();cd.lens=19;scene.camera=cam
scene.render.resolution_x=1440;scene.render.resolution_y=900;scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG'
bpy.ops.object.select_all(action='DESELECT')
for o in scene.objects:
    if o.type=='MESH':o.select_set(True)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT,'iron-veil-fortress.blend'))
bpy.ops.export_scene.gltf(filepath=os.path.join(OUT,'iron-veil-fortress.glb'),use_selection=True,use_active_scene=True,export_yup=True)
print('FORTRESS COMPLETE',len(colliders),'colliders',len([o for o in scene.objects if o.type=='MESH']),'mesh groups')
