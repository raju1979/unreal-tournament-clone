"""Build the Canal Village arena from the supplied Fantastic Village pack.
Run: blender -b --python 3d/village-arena/build_village.py
Writes portable .blend, embedded-texture GLB, previews and shared collision data.
"""
import bpy, math, os, json, random, sys
import numpy as np
from mathutils import Vector
ROOT = r'D:/learning/unreal-tournament-clone'
OUT = os.path.join(ROOT, '3d/village-arena')
os.makedirs(os.path.join(OUT, 'textures'), exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=os.path.join(ROOT, '3d/fantastic_village_pack_blend.blend'))
scene = bpy.context.scene
rng = random.Random(2419)
originals = {o.name:o for o in scene.objects}
keep, colliders, smoke = [], [], []
groups = {}

def plain(name, rgb, rough=.85, emission=0):
    m=bpy.data.materials.new(name);m.diffuse_color=(*rgb,1);m.use_nodes=True
    b=m.node_tree.nodes.get('Principled BSDF');b.inputs['Base Color'].default_value=(*rgb,1);b.inputs['Roughness'].default_value=rough
    if emission:b.inputs['Emission Color'].default_value=(*rgb,1);b.inputs['Emission Strength'].default_value=emission
    return m

# Preserve tile shading and wear while shifting the original blue roofs to terracotta.
roof=bpy.data.materials['M_rooftiles_01']
tex=next(n for n in roof.node_tree.nodes if n.type=='TEX_IMAGE')
source_roof=tex.image
im=bpy.data.images.new('Village terracotta roof atlas',width=source_roof.size[0],height=source_roof.size[1],alpha=True)
a=np.array(source_roof.pixels[:],dtype=np.float32).reshape(-1,4)
v=np.max(a[:,:3],axis=1)
a[:,0]=np.clip(v*1.28,0,1);a[:,1]=np.clip(v*.43,0,1);a[:,2]=np.clip(v*.25,0,1)
im.pixels.foreach_set(a.ravel());im.filepath_raw=os.path.join(OUT,'textures/roof-terracotta.png');im.file_format='PNG';im.save();im.pack();tex.image=im
for m in bpy.data.materials:
    if m.use_nodes:
        b=next((n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED'),None)
        if b:b.inputs['Roughness'].default_value=.82
        if m.name=='M_CLR_yellow_E':
            for emission_node in m.node_tree.nodes:
                if emission_node.type=='EMISSION':
                    emission_node.inputs['Color'].default_value=(1,.58,.18,1);emission_node.inputs['Strength'].default_value=.65
        if b and m.name=='M_CLR_yellow_E':
            b.inputs['Base Color'].default_value=(1,.66,.22,1);b.inputs['Emission Color'].default_value=(1,.53,.12,1);b.inputs['Emission Strength'].default_value=.4

soil=plain('Village warm earth',(.36,.29,.17))
pathmat=plain('Village sand paths',(.57,.46,.29))
grassmats=[plain('Grass meadow '+str(i),c) for i,c in enumerate([(.20,.35,.075),(.29,.43,.09),(.34,.48,.12),(.23,.39,.10)])]
stone=plain('Canal pale masonry',(.47,.46,.38))
capstone=plain('Canal coping',(.62,.60,.48))
wood=plain('Bridge honey timber',(.26,.12,.045))
rope=plain('Bridge hemp ropes',(.58,.43,.22))
water=plain('Canal water turquoise',(.055,.50,.53),.22)
flowerM=[plain('Flowers '+str(i),c) for i,c in enumerate([(.95,.59,.12),(.83,.16,.13),(.72,.35,.64),(.96,.86,.50)])]
pavers=[plain('Worn cobble '+str(i),c) for i,c in enumerate([(.42,.40,.32),(.48,.45,.35),(.55,.51,.40),(.46,.44,.37),(.60,.55,.42)])]
glow=plain('Warm window glow',(1,.55,.12),.7,1.8)
hillmats=[plain('Distant hill '+str(i),c) for i,c in enumerate([(.23,.39,.31),(.33,.46,.37),(.39,.52,.43)])]

def remember(o,group='props'):
    keep.append(o);groups[o.name]=group;return o

def asset(name,x,z,yaw=0,scale=1,height=0,group='props',center=True):
    src=originals.get(name)
    if not src or src.type!='MESH':raise RuntimeError('Missing '+name)
    o=src.copy();o.data=src.data;scene.collection.objects.link(o);o.name='Village '+name
    # Source meshes are mostly centered at their feet. Recenter offsets from modular pieces.
    lo=Vector(tuple(min(v[i] for v in src.bound_box) for i in range(3)))
    hi=Vector(tuple(max(v[i] for v in src.bound_box) for i in range(3)))
    origin=Vector(((lo.x+hi.x)/2,(lo.y+hi.y)/2,lo.z)) if center else Vector((0,0,0))
    o.rotation_euler=(0,0,yaw);o.scale=(scale,)*3
    offset=o.rotation_euler.to_matrix() @ (origin*scale)
    o.location=Vector((x,-z,height))-offset;o.hide_render=False;o.hide_viewport=False
    return remember(o,group)

cube_meshes={}
def cube(name,x,z,y,w,d,h,mat,group='ground',yaw=0):
    if mat.name not in cube_meshes:
        me=bpy.data.meshes.new('Batched unit box '+mat.name)
        me.from_pydata([(-.5,-.5,-.5),(.5,-.5,-.5),(.5,.5,-.5),(-.5,.5,-.5),(-.5,-.5,.5),(.5,-.5,.5),(.5,.5,.5),(-.5,.5,.5)],[],[(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)])
        me.materials.append(mat);cube_meshes[mat.name]=me
    o=bpy.data.objects.new(name,cube_meshes[mat.name]);scene.collection.objects.link(o);o.location=(x,-z,y);o.scale=(w,d,h);o.rotation_euler.z=yaw
    return remember(o,group)

def collider(name,x,z,y,w,d,h,kind='collision'):
    colliders.append(dict(name=name,x=round(x,3),y=round(y,3),z=round(z,3),w=round(w,3),h=round(h,3),d=round(d,3),kind=kind))

def mesh_bounds(o):
    bpy.context.view_layer.update()
    vs=[o.matrix_world@Vector(v) for v in o.bound_box]
    return [min(v[i] for v in vs) for i in range(3)], [max(v[i] for v in vs) for i in range(3)]

def cover(o,name=None,top=None):
    lo,hi=mesh_bounds(o)
    h=hi[2]-lo[2] if top is None else top-lo[2]
    collider(name or o.name,(lo[0]+hi[0])/2,-(lo[1]+hi[1])/2,lo[2]+h/2,hi[0]-lo[0],hi[1]-lo[1],h)

cylinder_meshes={}
def beam(name,a,b,r,mat,group='props',vertices=8):
    a,b=Vector((a[0],-a[1],a[2])),Vector((b[0],-b[1],b[2]));delta=b-a
    key=(mat.name,vertices)
    if key not in cylinder_meshes:
        pts=[(math.cos(i*math.tau/vertices),math.sin(i*math.tau/vertices),z) for z in (-.5,.5) for i in range(vertices)]
        faces=[tuple(range(vertices-1,-1,-1)),tuple(range(vertices,2*vertices))]+[(i,(i+1)%vertices,(i+1)%vertices+vertices,i+vertices) for i in range(vertices)]
        me=bpy.data.meshes.new('Batched beam '+mat.name);me.from_pydata(pts,[],faces);me.materials.append(mat);cylinder_meshes[key]=me
    o=bpy.data.objects.new(name,cylinder_meshes[key]);scene.collection.objects.link(o);o.location=(a+b)*.5;o.scale=(r,r,delta.length);o.rotation_euler=delta.to_track_quat('Z','Y').to_euler();return remember(o,group)
sphere_meshes={}
def sphere(name,x,z,y,scale,mat,group='vegetation'):
    if mat.name not in sphere_meshes:
        t=(1+math.sqrt(5))/2
        pts=[(-1,t,0),(1,t,0),(-1,-t,0),(1,-t,0),(0,-1,t),(0,1,t),(0,-1,-t),(0,1,-t),(t,0,-1),(t,0,1),(-t,0,-1),(-t,0,1)]
        pts=[tuple(Vector(v).normalized()) for v in pts]
        faces=[(0,11,5),(0,5,1),(0,1,7),(0,7,10),(0,10,11),(1,5,9),(5,11,4),(11,10,2),(10,7,6),(7,1,8),(3,9,4),(3,4,2),(3,2,6),(3,6,8),(3,8,9),(4,9,5),(2,4,11),(6,2,10),(8,6,7),(9,8,1)]
        me=bpy.data.meshes.new('Batched foliage '+mat.name);me.from_pydata(pts,[],faces);me.materials.append(mat);sphere_meshes[mat.name]=me
    o=bpy.data.objects.new(name,sphere_meshes[mat.name]);scene.collection.objects.link(o);o.location=(x,-z,y);o.scale=scale;return remember(o,group)

# Continuous accessible streets on both banks, shallow bed, and three level crossings.
CANAL=10.0; HALF=3.2; CROSSINGS=(-28,0,28)
for z,d in [((-56+CANAL-HALF)/2,56+CANAL-HALF),((56+CANAL+HALF)/2,56-CANAL-HALF)]:
    cube('Earth bank',0,z,-.65,112,d,1.3,soil)
    collider('Village bank',0,z,-1,112,d,2,'floor')
cube('Canal bed',0,CANAL,-1.0,112,6.4,.3,stone)
collider('Shallow canal bed',0,CANAL,-1.15,112,6.4,1.1,'floor')
cube('Canal water',0,CANAL,-.30,112,6.3,.04,water,'water')
# Visible outer walls provide a natural arena limit, with a forest and hills behind them.
for x,z,w,d in [(0,-55.5,112,1),(0,55.5,112,1),(-55.5,0,1,110),(55.5,0,1,110)]:
    cube('Village perimeter wall',x,z,.9,w,d,1.8,stone,'architecture')
    cube('Village perimeter coping',x,z,1.85,w+.12,d+.12,.16,capstone,'architecture')
    collider('Village perimeter',x,z,4.0,w,d,10)
# Roads: irregular paving overlays, warm sand verges and planted front gardens.
for x,z,w,d in [(0,-10,112,12),(0,30,112,8),(-28,0,8,108),(0,0,8,108),(28,0,8,108),(0,-43,100,6)]:
    cube('Sandy street verge',x,z,-.018,w,d,.028,pathmat)
cube('Market square',0,-10,-.004,27,25,.022,pathmat)
# Paving is low geometry, batched into one ground mesh for the game.
for ix in range(-50,51):
    for iz in range(-50,51):
        x=ix*1.05;z=iz*1.05
        if abs(z-CANAL)<4.0:continue
        onroad=(abs(z+10)<3.0 or abs(z-30)<2.1 or abs(z+43)<1.8 or min(abs(x-k) for k in CROSSINGS)<2.0)
        square=abs(x)<12.5 and abs(z+10)<10.5
        if (onroad or square) and rng.random()>.08:
            cube('Uneven street cobble',x+rng.uniform(-.05,.05),z+rng.uniform(-.06,.06),.014,rng.uniform(.78,.98),rng.uniform(.72,.96),rng.uniform(.035,.065),rng.choice(pavers),yaw=rng.uniform(-.045,.045))
# Canal banks have masonry blocks and intermittent fence sections, leaving the bridge mouths open.
for bankz in (CANAL-HALF-.18,CANAL+HALF+.18):
    for x in range(-54,55,3):
        cube('Quay stone blocks',x,bankz,-.35,2.94,.52,.8,stone,'architecture')
        cube('Quay stone cap',x,bankz,.10,3.0,.70,.24,capstone,'architecture')
    intervals=[(-55,-41),(-37,-31),(-25,-3),(3,25),(31,37),(41,55)] if bankz<CANAL else [(-55,-31),(-25,-3),(3,25),(31,55)]
    for a,b in intervals:
        mid=(a+b)/2
        collider('Canal bank railing',mid,bankz,.60,b-a,.55,1.0)
        for x in range(a,b,3):
            # Pack fence panels suit the whimsical canal promenade.
            asset('SM_PROP_fence_v02_01',x+1.4,bankz,0,1,group='architecture')
for x in CROSSINGS:
    cube('Stone bridge deck',x,CANAL,-.12,5.2,8.0,.24,stone,'architecture')
    collider('Canal crossing',x,CANAL,-.15,5.2,8.3,.30,'floor')
    for sz in np.arange(CANAL-3.65,CANAL+3.8,.7):
        for dx in (-1.75,0,1.75):cube('Bridge pavers',x+dx,float(sz),.03,1.67,.64,.08,capstone)
    for side in (-1,1):
        sx=x+side*2.50
        cube('Stone bridge parapet',sx,CANAL,.54,.38,7.8,.96,stone,'architecture')
        cube('Bridge parapet coping',sx,CANAL,1.04,.50,7.9,.18,capstone,'architecture')
        collider('Bridge parapet',sx,CANAL,.6,.45,7.8,1.2)
        for zz in (CANAL-3.7,CANAL+3.7):
            cube('Bridge stone pier',sx,zz,-.25,.8,.9,1.9,capstone,'architecture')

# Terraced streets filled with complete house assemblies. Deliberate gaps form combat lanes.
houses=[
 ('01',-41,-40,0,1.05),('04',-17,-42,0,1.0),('02',12,-43,0,1.05),('07',40,-40,0,.95),
 ('03',-43,-19,math.pi/2,1.05),('05',-16,-26,0,.95),('01',15,-27,0,.95),('04',42,-19,-math.pi/2,.95),
 ('02',-43,0,math.pi/2,1.0),('03',-17,-1,math.pi,.95),('03',17,-1,math.pi,.95),('02',43,0,-math.pi/2,1.05),
 ('04',-43,22,math.pi/2,.94),('02',-15,22,math.pi,.95),('05',15,22,math.pi,.95),('04',43,22,-math.pi/2,.95),
 ('07',-40,43,math.pi,.90),('03',-14,43,math.pi,.98),('01',13,44,math.pi,.95),('06',40,43,math.pi,.92)]

def local_to_world(x,z,yaw,lx,ly,scale=1):
    # Local Blender XY to game XZ.
    return x+(lx*math.cos(yaw)-ly*math.sin(yaw))*scale,z-(lx*math.sin(yaw)+ly*math.cos(yaw))*scale

for index,(variant,x,z,yaw,s) in enumerate(houses):
    src=originals['SM_BLD_body_v'+variant+'_01']
    house=asset(src.name,x,z,yaw,s,group='buildings')
    # Use the wall body rather than the roof overhang for the collision footprint.
    verts=[v.co for v in src.data.vertices if .25<v.co.z<4.2]
    width=(max(v.x for v in verts)-min(v.x for v in verts))*.94
    depth=(max(v.y for v in verts)-min(v.y for v in verts))*.94
    center=((max(v.x for v in verts)+min(v.x for v in verts))/2,(max(v.y for v in verts)+min(v.y for v in verts))/2)
    cx,cz=local_to_world(x,z,yaw,center[0],center[1],s)
    rotated=abs(math.sin(yaw))>.5
    collider('House '+str(index+1),cx,cz,5*s,(depth if rotated else width)*s,(width if rotated else depth)*s,10*s)
    # An irregular lawn connects each home to its planted street frontage.
    patchverts=[(x,-z,.004)];radii=[]
    for j in range(18):
        a=j*math.tau/18;rr=rng.uniform(.90,1.10)
        px,pz=local_to_world(x,z,yaw,math.cos(a)*(width*.5+2.4)*rr,math.sin(a)*(depth*.5+2.3)*rr,s)
        patchverts.append((px,-pz,.006+rng.uniform(0,.014)))
    pm=bpy.data.meshes.new('Irregular lawn');pm.from_pydata(patchverts,[],[(0,j+1,(j+1)%18+1) for j in range(18)])
    for mat in grassmats:pm.materials.append(mat)
    for face in pm.polygons:face.material_index=rng.randrange(len(grassmats))
    po=bpy.data.objects.new('Village green garden lawn',pm);scene.collection.objects.link(po);remember(po,'ground')
    front=-depth/2-.05
    def detail(name,lx,ly,height,scale=1):
        px,pz=local_to_world(x,z,yaw,lx,ly,s)
        return asset(name,px,pz,yaw,s*scale,height*s,group='buildings')
    detail('SM_BLD_door_v04_01',0,front-.12,.10,.84)
    for wx in (-width*.28,width*.28):
        detail('SM_BLD_window_v06_01',wx,front-.07,3.45,.90)
        detail('SM_PROP_PLANT_pot_v1_01',wx,front-.30,3.25,.85)
    # Side windows and upper gable windows give each facade depth.
    detail('SM_BLD_window_v07_01',0,front-.04,6.0,.82)
    chimney=detail('SM_BLD_chimney_v01_01',width*.25,depth*.2,5.4,.70)
    smoke.append([round(chimney.location.x,2),round(chimney.location.z+4.0*s,2),round(-chimney.location.y,2)])
    detail('SM_PROP_lantern_01',1.1,front-.45,2.0,.62)
    if index%3==0:detail('SM_PROP_sign_0'+str(1+index%6),-width*.35,front-.7,0,.7)
    # Organic gardens make street edges uneven, and keep grass away from fighting lanes.
    for dx,dz in [(-width*.55,-depth*.46),(width*.55,-depth*.46),(width*.45,depth*.45)]:
        gx,gz=local_to_world(x,z,yaw,dx,dz,s)
        sphere('Raised moss garden',gx,gz,-.12,(2.3,1.8,.30),rng.choice(grassmats),'ground')
        for t in range(8):
            xx=gx+rng.uniform(-1.5,1.5);zz=gz+rng.uniform(-1,1)
            asset('SM_ENV_PLANT_grass_village',xx,zz,rng.random()*6.28,rng.uniform(.7,1.5),group='grass')
        for t in range(5):
            xx=gx+rng.uniform(-1.1,1.1);zz=gz+rng.uniform(-.8,.8)
            beam('Flower stem',(xx,zz,0),(xx,zz,.28),.017,grassmats[0],'grass',5)
            sphere('Garden flowers',xx,zz,.34,(.13,.13,.07),flowerM[(index+t)%4],'grass')

# A landmark mill towers above the quay, with its sails mounted on a full house body.
asset('SM_BLD_windmill_sail',-41,19,math.pi/2,.60,7.8,group='buildings')
asset('SM_BLD_waterwheel_construct',49,5,math.pi/2,.85,group='buildings')
asset('SM_BLD_waterwheel',49,9,math.pi/2,.85,-.35,group='buildings')
# Market square: cloth canopies, counters, produce, barrels, sacks and tavern tables.
market=[(-9,-15,0,'v04_01'),(9,-15,0,'v01_01'),(-10,-7,math.pi,'v02_01'),(10,-7,math.pi,'v03_01')]
for i,(x,z,yaw,v) in enumerate(market):
    stall=asset('SM_PROP_market_'+v,x,z,yaw,group='props')
    shelf=asset('SM_PROP_market_shelf_01',x,z, yaw,1,group='props');cover(shelf,'Market counter',1.15)
    for dx in (-1.0,0,1.0):
        asset('SM_PROP_crate_01',x+dx,z,.3*i,.8,1.0,group='props')
        for j in range(4):
            asset(['SM_PROP_food_apple','SM_PROP_food_carrot','SM_PROP_food_cabbage'][i%3] if ['SM_PROP_food_apple','SM_PROP_food_carrot','SM_PROP_food_cabbage'][i%3] in originals else 'SM_PROP_basket_02',x+dx+rng.uniform(-.2,.2),z+rng.uniform(-.2,.2),0,.8,1.30,group='props')
    for dx in (-2.3,2.3):asset('SM_PROP_sack_01',x+dx,z,.5*i,1.1,group='props')
    # Thin posts collide independently; the cloth roof does not create an invisible solid wall.
    for dx in (-1.7,1.7):
        for dz in (-1.4,1.4):collider('Market canopy post',x+dx,z+dz,1.7,.22,.22,3.4)
well=asset('SM_PROP_well',0,-10,0,.8,group='props');asset('SM_PROP_well_handle',0,-10,0,.8,1.0,group='props');collider('Village well',0,-10,1.4,2.4,2.4,2.8)
for x,z in [(-23,-13),(22,-18),(-21,28),(22,35)]:
    cart=asset('SM_PROP_cart_03',x,z,math.pi/2,1.0,group='props');cover(cart,'Supply cart',1.9)
    for dz in (-1.2,0,1.2):asset('SM_PROP_barrel_01',x,z+dz,.2,.95,1.35,group='props')
for x,z in [(-6,-31),(6,-31),(-20,37),(20,37),(-45,32),(45,-31),(-7,2),(7,2)]:
    for j in range(3):
        obj=asset('SM_PROP_barrel_01' if j%2==0 else 'SM_PROP_box_01',x+j*.75,z+j*.18,.15*j,1,group='props')
    collider('Barrels and cargo',x+.7,z+.2,.6,2.3,1.2,1.2)
for x,z in [(-7,-20),(6,-20),(-9,35),(7,35)]:
    table=asset('SM_PROP_table_02',x,z,0,1,group='props');cover(table,'Tavern table',.85)
    for dz in (-1.1,1.1):asset('SM_PROP_bench_01',x,z+dz,0,1,group='props')
    for dx in (-.5,.5):asset('SM_PROP_bottle_03',x+dx,z,0,1,.83,group='props')
# Small dock: planks, moored boats, stacked timber and barrels.
for x in (-39,39):
    cube('Timber dock',x,8,-.02,3,4.6,.22,wood,'props')
    collider('Dock',x,8,-.15,3,4.6,.30,'floor')
    for dx in (-1.5,1.5):
        for zz in (6.0,10.0):beam('Dock piling',(x+dx,zz,-.9),(x+dx,zz,.8),.13,wood)
    asset('SM_PROP_rowboat',x+3.0,10,0,.9,-.35,group='props')
    asset('SM_PROP_rowboat_paddle_01',x+3,10,.2,.9,.1,group='props')
asset('SM_PROP_signpost_03',-5,2,0,.9,group='props')
for x,z in [(-24,-21),(25,-21),(-24,20),(25,20),(-4,-38),(4,38)]:
    lamp=asset('SM_PROP_streetlamp_v01_01',x,z,0,1,group='props');collider('Streetlamp post',x,z,1.8,.25,.25,3.6)
asset('SM_PROP_firepit',-8,34,0,1.3,group='props');asset('SM_PROP_firepit_woodpile',-8,34,0,1.3,.1,group='props')
# Fir groves and forest backdrop break up the hard map boundary.
for x,z,s in [(-49,-30,1.5),(-32,-37,1.2),(32,-35,1.4),(49,-29,1.5),(-49,33,1.5),(49,34,1.5),(-33,49,1.3),(31,50,1.3),(-49,-7,1.1),(49,-8,1.2),(-8,49,1.2),(7,-51,1.2)]:
    asset('SM_ENV_TREE_village_LOD0',x,z,rng.random()*6.28,s,group='vegetation');collider('Fir trunk',x,z,1.8,.6,.6,3.6)
for i in range(64):
    angle=i*math.tau/64;r=rng.uniform(65,81);x=math.cos(angle)*r;z=math.sin(angle)*r
    asset('SM_ENV_TREE_village_LOD1',x,z,rng.random()*6.28,rng.uniform(1.4,2.8),group='vegetation')
# Distant village rooftops and soft hills create depth beyond the playable arena.
for x,z,yaw in [(-22,67,0),(10,69,.2),(42,65,0),(-65,-19,1.57),(67,-24,1.57),(-30,-67,0),(20,-66,0)]:
    asset('SM_BLD_body_v03_01',x,z,yaw,rng.uniform(.9,1.3),group='buildings')
for i in range(20):
    angle=i*math.tau/20;r=rng.uniform(115,145)
    sphere('Rolling distant hills',math.cos(angle)*r,math.sin(angle)*r,-4,(rng.uniform(20,37),rng.uniform(19,34),rng.uniform(15,34)),hillmats[i%3],'backdrop')
# Bunting strung over the busy square adds color above player height.
for z in (-22,0):
    for x in (-13,13):beam('Bunting support',(x,z,0),(x,z,5.5),.085,wood)
    for i in range(14):
        x=-13+i*2;y=5.4-.65*math.sin(math.pi*(x+13)/26)
        beam('Bunting cord',(x,z,y),(min(13,x+2),z,5.4-.65*math.sin(math.pi*(min(13,x+2)+13)/26)),.018,rope)
        if i<13:
            mesh=bpy.data.meshes.new('Cloth pennant');mesh.from_pydata([(x,-z,y),(x+.75,-z,y-.10),(x+.38,-z,y-.8)],[],[(0,1,2)]);mesh.materials.append(flowerM[i%4]);o=bpy.data.objects.new('Village festival pennant',mesh);scene.collection.objects.link(o);remember(o,'props')

# Export collision data from this exact assembly, so editing the script updates both clients and server.
spawns=[[-28,0,-47],[28,0,47],[-49,0,30],[49,0,-10]]
weapons=[[-28,0,-10],[28,0,-10],[0,0,30],[0,0,-34],[-28,0,30],[28,0,30],[0,0,10],[0,0,-22]]
pickups=[dict(x=-34,y=0,z=-10,type='health'),dict(x=34,y=0,z=30,type='health'),dict(x=0,y=0,z=-38,type='ammo'),dict(x=0,y=0,z=38,type='ammo')]
layout=dict(id='village',name='Canal Village',boxes=colliders,spawns=spawns,weaponSpawns=weapons,pickups=pickups)
with open(os.path.join(ROOT,'shared/village-layout.ts'),'w') as f:
    f.write('// Generated by 3d/village-arena/build_village.py. Dimensions are in game meters.\nexport const villageLayout = '+json.dumps(layout,separators=(',',':'))+';\nexport const villageSmoke: number[][] = '+json.dumps(smoke)+';\n')
with open(os.path.join(OUT,'layout.json'),'w') as f:json.dump(dict(smoke=smoke,**layout),f,indent=2)
# Merge static scenery by category. glTF retains separate material primitives but avoids thousands of draw calls.
for name in ('ground','architecture','buildings','props','vegetation','grass','backdrop'):
    obs=[o for o in keep if groups.get(o.name)==name]
    if not obs:continue
    bpy.ops.object.select_all(action='DESELECT')
    for o in obs:o.select_set(True)
    bpy.context.view_layer.objects.active=obs[0];bpy.ops.object.join();joined=bpy.context.object;joined.name='Village '+name
    keep=[o for o in keep if o not in obs]+[joined]
# Remove the showcase collection and studio lighting; keep the constructed village only.
ids={o.as_pointer() for o in keep}
for o in list(bpy.data.objects):
    if o.as_pointer() not in ids:bpy.data.objects.remove(o,do_unlink=True)
# Portable source camera, sunlight and preview. These do not get exported into the game.
world=bpy.data.worlds.new('Village daytime');scene.world=world;world.use_nodes=True
world.node_tree.nodes['Background'].inputs['Color'].default_value=(.50,.72,.86,1);world.node_tree.nodes['Background'].inputs['Strength'].default_value=.6
ld=bpy.data.lights.new('Village afternoon sun','SUN');ld.energy=2.4;ld.angle=.16;ld.color=(1,.85,.65)
lo=bpy.data.objects.new('Village afternoon sun',ld);scene.collection.objects.link(lo);lo.rotation_euler=(.52,-.36,-.65)
cd=bpy.data.cameras.new('Village street camera');cam=bpy.data.objects.new('Village street camera',cd);scene.collection.objects.link(cam);scene.camera=cam
cam.location=(20,24,10);target=Vector((-6,-6,4.0));cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler();cd.lens=26
scene.render.engine='BLENDER_EEVEE';scene.render.resolution_x=1500;scene.render.resolution_y=960;scene.render.resolution_percentage=100;scene.render.image_settings.file_format='PNG';scene.view_settings.view_transform='AgX';scene.view_settings.exposure=.2
bpy.ops.file.pack_all();bpy.ops.object.select_all(action='DESELECT')
for o in keep:o.select_set(True)
bpy.context.view_layer.objects.active=keep[0]
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT,'village-arena.blend'))
# Keep full-size atlases in the editable blend; the browser gets 1024px textures.
small_images={}
for mat in bpy.data.materials:
    if not mat.use_nodes:continue
    for node in mat.node_tree.nodes:
        if node.type!='TEX_IMAGE' or not node.image:continue
        image=node.image
        if max(image.size)<=1024:continue
        if image.name not in small_images:
            w,h=image.size;step=max(1,math.ceil(max(w,h)/1024));pixels=np.array(image.pixels[:],dtype=np.float32).reshape(h,w,4)[::step,::step,:].copy()
            small=bpy.data.images.new('Game '+image.name,width=pixels.shape[1],height=pixels.shape[0],alpha=True);small.colorspace_settings.name=image.colorspace_settings.name;small.pixels.foreach_set(pixels.ravel());small.pack();small_images[image.name]=small
        node.image=small_images[image.name]
bpy.ops.export_scene.gltf(filepath=os.path.join(OUT,'village-arena.glb'),export_format='GLB',use_selection=True,export_yup=True,export_apply=True,export_materials='EXPORT')
if '--skip-preview' in sys.argv:
    print('VILLAGE ASSETS COMPLETE',len(colliders),'colliders;',os.path.getsize(os.path.join(OUT,'village-arena.glb')),'bytes');sys.exit(0)
scene.render.filepath=os.path.join(OUT,'preview.png');bpy.ops.render.render(write_still=True)
# An overview helps check the combat lanes and all three canal crossings.
cam.location=(80,100,105);target=Vector((0,0,0));cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler();cd.type='ORTHO';cd.ortho_scale=145
scene.render.filepath=os.path.join(OUT,'overview.png');bpy.ops.render.render(write_still=True)
print('VILLAGE COMPLETE',len(colliders),'colliders;',sum(len(o.data.polygons) for o in keep),'faces;',os.path.getsize(os.path.join(OUT,'village-arena.glb')),'bytes')
