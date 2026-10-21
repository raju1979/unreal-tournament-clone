"""Build Sunspire Battle Arena, an original daylight low-poly canyon compound.
blender -b --python 3d/canyon-arena/build_canyon.py [-- --skip-preview]
Coordinates below use game X,Y-up,Z. Source file and GLB share generated collision.
"""
import bpy,math,json,os,random,sys
from mathutils import Vector
ROOT=os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT=os.path.join(ROOT,'3d/canyon-arena');os.makedirs(OUT,exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True);scene=bpy.context.scene;rng=random.Random(721)
objects=[];colliders=[];groups={};cache={}
def material(name,c,emission=0):
 m=bpy.data.materials.new(name);m.diffuse_color=(*c,1);m.use_nodes=True;b=m.node_tree.nodes.get('Principled BSDF');b.inputs['Base Color'].default_value=(*c,1);b.inputs['Roughness'].default_value=.82
 if emission:b.inputs['Emission Color'].default_value=(*c,1);b.inputs['Emission Strength'].default_value=emission
 return m
sand=material('Warm desert sand',(.66,.48,.25));grass=material('Vivid courtyard grass',(.27,.44,.10));road=material('Graphite service road',(.16,.20,.23));edge=material('Safety golden yellow',(.97,.58,.055));ivory=material('Warm white armor',(.72,.75,.73));steel=material('Blue grey structure',(.28,.34,.38));dark=material('Dark recessed steel',(.075,.105,.13));pale=material('Light concrete',(.48,.52,.53));white=material('White road markings',(.86,.89,.86));purple=material('Magenta identification',(.70,.12,.43),.35);cyan=material('Cyan identification',(.14,.62,.71),.35);glass=material('Deep blue glazing',(.055,.15,.20));wood=material('Tree trunks',(.27,.16,.075));green=material('Pine foliage',(.16,.37,.075));rockm=[material('Canyon rock '+str(i),c) for i,c in enumerate([(.44,.29,.22),(.56,.38,.28),(.65,.47,.34),(.74,.56,.40)])]
def keep(o,group):objects.append(o);groups[o.name]=group;return o
def boxcol(name,x,y,z,w,h,d,kind='wall'):colliders.append(dict(name=name,x=round(x,4),y=round(y,4),z=round(z,4),w=round(w,4),h=round(h,4),d=round(d,4),kind=kind))
def cube(name,x,y,z,w,h,d,mat,group='architecture',solid=False,kind='wall',yaw=0):
 key=('box',mat.name)
 if key not in cache:
  me=bpy.data.meshes.new('Unit box '+mat.name);me.from_pydata([(-.5,-.5,-.5),(.5,-.5,-.5),(.5,.5,-.5),(-.5,.5,-.5),(-.5,-.5,.5),(.5,-.5,.5),(.5,.5,.5),(-.5,.5,.5)],[],[(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)]);me.materials.append(mat);cache[key]=me
 ob=bpy.data.objects.new(name,cache[key]);scene.collection.objects.link(ob);ob.location=(x,-z,y);ob.scale=(w,d,h);ob.rotation_euler.z=yaw;keep(ob,group)
 if solid:boxcol(name,x,y,z,w,h,d,kind)
 return ob
def cylinder(name,x,y,z,r,h,mat,n=12,top=None,group='architecture'):
 top=r if top is None else top;key=('cylinder',mat.name,n,round(top/r,4))
 if key not in cache:
  ratio=top/r;pts=[(math.cos(i*math.tau/n)*rr,math.sin(i*math.tau/n)*rr,zz) for rr,zz in [(1,-.5),(ratio,.5)] for i in range(n)];faces=[tuple(range(n-1,-1,-1)),tuple(range(n,2*n))]+[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)];me=bpy.data.meshes.new('Faceted cylinder');me.from_pydata(pts,[],faces);me.materials.append(mat);cache[key]=me
 ob=bpy.data.objects.new(name,cache[key]);scene.collection.objects.link(ob);ob.location=(x,-z,y);ob.scale=(r,r,h);return keep(ob,group)
def beam(name,a,b,r,mat,group='architecture',n=6):
 a=Vector((a[0],-a[2],a[1]));b=Vector((b[0],-b[2],b[1]));o=cylinder(name,0,0,0,r,(b-a).length,mat,n,group=group);o.location=(a+b)/2;o.rotation_euler=(b-a).to_track_quat('Z','Y').to_euler();return o
def ring(name,inner,outer,y,mat,n=64,start=0,end=math.tau,group='ground'):
 pts=[]
 for i in range(n+1):
  a=start+(end-start)*i/n
  for r in (inner,outer):pts.append((math.cos(a)*r,-math.sin(a)*r,y))
 faces=[(2*i,2*i+2,2*i+3,2*i+1) for i in range(n)];me=bpy.data.meshes.new(name);me.from_pydata(pts,[],faces);me.materials.append(mat);o=bpy.data.objects.new(name,me);scene.collection.objects.link(o);return keep(o,group)
def diskfloor(name,r,top,bottom):
 cylinder(name,0,(top+bottom)/2,0,r,top-bottom,pale,64)
 # Half-meter bands remain within the rendered 64-sided platform perimeter.
 for i in range(int(r*4)):
  z=-r+(i+.5)*.5;extent=math.sqrt(max(0,r*r-(abs(z)+.25)**2))*.998
  if extent>.2:boxcol(name,0,(top+bottom)/2,z,2*extent,top-bottom,.5,'floor')
def point(a,r):return math.sin(a)*r,math.cos(a)*r
# Broad playable compound, raised above a dry canyon basin.
cube('Compound foundation',0,-1.1,0,124,2.2,124,pale,'ground',True,'floor')
cube('Desert topsoil',0,.006,0,123.5,.04,123.5,sand,'ground')
for x,z,w,d in [(-47,0,19,19),(47,0,19,19),(0,-49,22,15),(0,49,22,15),(-42,-44,23,18),(42,44,23,18)]:cube('Planted green courtyard',x,.028,z,w,.010,d,grass,'ground')
ring('Circular service road',38,46,.035,road);ring('Outer golden curb',46,46.45,.05,edge);ring('Inner concrete curb',37.65,38,.05,ivory)
for i in range(64):
 a=i*math.tau/64;ring('Road center dash',41.85,42.05,.055,white,2,a,a+.045)
for a in [0,math.pi/2,math.pi,math.pi*1.5]:
 x,z=point(a,53);cube('Gate approach road',x,.045,z,10 if abs(math.sin(a))<.5 else 18,.06,18 if abs(math.sin(a))<.5 else 10,road,'ground')
 for k in range(6):
  x,z=point(a,48+k*1.7);cube('Crosswalk stripe',x,.09,z,7 if abs(math.sin(a))<.5 else .6,.03,.6 if abs(math.sin(a))<.5 else 7,white,'ground')
# Two concentric, fully walkable combat tiers.
diskfloor('Outer combat deck',25,1.4,0);diskfloor('Upper command ring',13,3.4,1.4)
ring('Outer combat deck amber edge',24.5,25,1.42,edge);ring('Upper deck amber edge',12.5,13,3.42,edge)
ring('Outer deck dark running lane',19.5,22,1.43,steel);ring('Upper ring inset paving',6.3,11.4,3.43,ivory)
for a in [0,math.pi/2,math.pi,math.pi*1.5]:
 for label,outer,inner,base,rise,count in [('Access',32,24,0,1.4,8),('Command',20,12,1.4,2.0,10)]:
  run=(outer-inner)/count
  for i in range(count):
   distance=outer-(i+.5)*run;top=base+(i+1)*rise/count;x,z=point(a,distance)
   cube(label+' stair',x,base+(top-base)/2,z,5.2 if abs(math.sin(a))<.5 else run+.04,top-base,run+.04 if abs(math.sin(a))<.5 else 5.2,ivory,'architecture',True,'stair')
   cube('Stair safety nosing',x,top+.012,z,5.2 if abs(math.sin(a))<.5 else .07,.025,.07 if abs(math.sin(a))<.5 else 5.2,edge)
  for side in (-1,1):
   dx,dz=math.cos(a)*side*2.7,-math.sin(a)*side*2.7;ax,az=point(a,outer);bx,bz=point(a,inner)
   beam('Stair handrail',(ax+dx,base+1.0,az+dz),(bx+dx,base+rise+1,bz+dz),.055,edge)
   for r in [outer,inner]:
    xx,zz=point(a,r);yy=base+(outer-r)/(outer-inner)*rise;beam('Stair post',(xx+dx,yy,zz+dz),(xx+dx,yy+1.0,zz+dz),.045,dark)
# Tall command tower: layered silhouette, recesses, yellow armor and magenta markers.
cylinder('Tower armored footing',0,4.0,0,5.9,1.2,steel,8)
boxcol('Central tower',0,14.7,0,9.6,22.6,9.6)
boxcol('Central tower footing',0,6.0,0,11.8,5.2,11.8)
cylinder('Tower lower plinth',0,6.5,0,5.25,4,ivory,8)
cylinder('Tower narrow machinery',0,10.2,0,4.4,3.4,dark,8)
cylinder('Tower upper white shell',0,17.0,0,4.8,10.5,ivory,8)
for yy,rr,hh in [(8.5,5.5,.45),(12,5.7,.6),(21.9,5.3,.65),(24.0,4.5,.5)]:cylinder('Tower steel collar',0,yy,0,rr,hh,steel,8)
cylinder('Tower observation glass',0,22.9,0,4.3,1.3,glass,8)
cylinder('Tower crown',0,24.5,0,3.5,.6,ivory,8)
for side in (-1,1):
 for axis in (0,1):
  x,z=(side*4.86,0) if axis==0 else (0,side*4.86)
  cube('Tower tall inset',x,16.3,z,.08 if axis==0 else 2.6,7.5,2.6 if axis==0 else .08,steel)
  cube('Tower yellow spine',x*1.01,16,z,.09 if axis==0 else .24,6,.24 if axis==0 else .09,edge)
  cube('Tower faction marker',x*1.015,7,z,.12 if axis==0 else .30,2,.30 if axis==0 else .12,purple)
for x,z,h in [(-2,-2,5),(2,-2,3),(0,2,4.5)]:
 beam('Tower antenna',(x,24.5,z),(x,24.5+h,z),.13,dark);cylinder('Antenna sleeve',x,25.2,z,.29,.5,ivory,8)
# Deck cover, inset panels and perimeter bollards keep circular fights varied.
for i in range(12):
 a=(i+.5)*math.tau/12;x,z=point(a,23.9)
 cube('Ring parapet',x,1.98,z,2.3,1.16,1.2,steel,solid=True)
 cube('Ring parapet armor',x,2.58,z,2.4,.10,1.3,ivory)
 cube('Ring parapet yellow stripe',x,2.2,z,2.35,.12,1.22,edge)
for i in range(8):
 a=(i+.5)*math.tau/8;x,z=point(a,9.5);cube('Command ring cover',x,4,z,1.6,1.2,1.1,steel,solid=True)
# Open hangars with genuine entrances and side passages. Roofs are scenery.
def hangar(x,z,number):
 w,d=16,15
 cube('Hangar '+number+' floor',x,.08,z,w,.16,d,ivory,'architecture',True,'floor')
 for dx in (-w/2,w/2):cube('Hangar side wall',x+dx,3.3,z,.65,6.6,d,steel,solid=True)
 for side in (-1,1):cube('Hangar rear wall',x+side*5.8,3.3,z-d/2,4.4,6.6,.65,ivory,solid=True)
 cube('Hangar rear door header',x,5.65,z-d/2,7.2,1.9,.65,steel,solid=True)
 cube('Hangar roof',x,6.8,z,w+.8,.5,d+.8,ivory,solid=True)
 for side in (-1,1):
  cube('Hangar portal column',x+side*7.2,3.2,z+d/2,.85,6.4,1,ivory,solid=True)
  cube('Hangar portal amber',x+side*7.21,3.3,z+d/2+.53,.18,5.7,.07,edge)
 cube('Hangar portal header',x,6.0,z+d/2,14.4,1.1,1,steel,solid=True)
 cube('Hangar sign panel',x,5.95,z+d/2+.54,4.2,.55,.08,edge)
 # Raised relief bay number and aisle markings.
 for digit in range(int(number)):
  cube('Hangar bay number',x-1.5+digit*.55,5.95,z+d/2+.6,.22,.35,.04,dark)
 for dx in (-5,5):cube('Hangar aisle stripe',x+dx,.18,z,.14,.025,13,edge,'ground')
 for zz in (-5,0,5):
  cube('Hangar roof beam',x,6.35,z+zz,15,.3,.22,dark)
 for xx in (-4,0,4):
  cube('Hangar ceiling fixture',x+xx,6.40,z,2,.10,.35,white)
 for dx in (-4,4):
  cube('Hangar solar frame',x+dx,7.14,z,5.7,.15,9,dark)
  for k in range(7):cube('Hangar solar panel',x+dx,7.24,z-3.9+k*1.3,5.3,.05,1.15,glass)
 for xx in (-5,5):
  cube('Hangar interior crate',x+xx,.85,z-2,2,1.5,2,steel,solid=True)
  cube('Hangar cargo strap',x+xx,1.65,z-2,2.04,.1,2.04,edge)
for x in (-44,44):
 for z in (-25,25):hangar(x,z,'1' if x<0 else '2')
# North/south operations buildings and small radar towers frame the road.
for z in (-51,51):
 cube('Operations block',0,3.0,z,21,6,11,steel,solid=True)
 cube('Operations white roof',0,6.2,z,22,.45,12,ivory)
 cube('Operations recessed glazing',0,4.25,z+(5.55 if z<0 else -5.55),15,1.5,.1,glass)
 for x in (-8,8):cube('Operations yellow trim',x,3.5,z+(5.62 if z<0 else -5.62),.35,4.5,.1,edge)
 for x in (-5,0,5):
  cube('Operations roof equipment',x,6.8,z,3,1,3,dark)
  for k in range(5):cube('Vent grille',x-1+k*.5,7.32,z,.12,.06,2.6,ivory)
for x,z in [(-53,-48),(53,48),(-53,48),(53,-48)]:
 cube('Corner watchtower base',x,3,z,6,6,6,ivory,solid=True)
 cylinder('Watchtower control room',x,7,z,4.1,2.2,steel,8)
 cylinder('Watchtower panoramic glass',x,7.4,z,4.16,.7,glass,8)
 cylinder('Watchtower roof',x,8.4,z,4.7,.6,ivory,8)
 beam('Watchtower antenna',(x,8.7,z),(x,12,z),.10,dark)
# Twin fuel silos, cargo containers, concrete barriers and supply crates.
for x in (-23,23):
 for z in (-48,48):
  cylinder('Fuel silo base',x,.3,z,2.9,.6,steel)
  cylinder('Fuel silo',x,3.4,z,2.45,5.7,ivory)
  boxcol('Fuel silo',x,3.4,z,4.9,6.8,4.9)
  for y in (1.1,5.7):cylinder('Fuel silo yellow band',x,y,z,2.5,.22,edge)
  cylinder('Fuel silo cap',x,6.6,z,2.6,.6,steel,12,top=1.6)
for x,z in [(-30,-32),(30,32),(-31,32),(31,-32),(-15,-30),(15,30),(-31,12),(31,-12)]:
 cube('Armored cargo crate',x,1,z,2.8,2,2.8,steel,solid=True)
 for dx in (-1.22,1.22):cube('Cargo corner guard',x+dx,1,z,.18,2.1,2.95,ivory)
 for dz in (-1.43,1.43):
  beam('Cargo diagonal',(x-1.1,.2,z+dz),(x+1.1,1.8,z+dz),.07,ivory)
  beam('Cargo diagonal',(x+1.1,.2,z+dz),(x-1.1,1.8,z+dz),.07,ivory)
 cube('Cargo caution rim',x,2.05,z,2.9,.08,2.9,edge)
for x,z in [(-18,27),(18,-27),(-33,-5),(33,5),(-6,-34),(6,34)]:
 cube('Concrete barricade',x,.65,z,4,1.3,1,ivory,solid=True)
 cube('Barricade yellow cap',x,1.33,z,4.05,.12,1.1,edge)
 for i in range(5):cube('Barricade hazard block',x-1.6+i*.8,1.05,z+.51,.35,.4,.025,dark)
for x,z in [(-39,6),(39,-6),(-10,50),(10,-50)]:
 for i in range(3):
  xx=x+(i%2)*1.0;zz=z+(i//2)*1.1;cylinder('Supply drum',xx,.65,zz,.46,1.3,steel,10);boxcol('Supply drum',xx,.65,zz,.92,1.3,.92)
  for y in (.15,1.12):cylinder('Drum strap',xx,y,zz,.47,.08,edge,10)
# Secure square perimeter, segmented panels, and four sealed industrial gates.
for axis in (0,1):
 for sign in (-1,1):
  for k in range(-56,57,8):
   if abs(k)<8:continue
   x,z=(sign*61,k) if axis==0 else (k,sign*61)
   cube('Perimeter armored wall',x,2.25,z,.6 if axis==0 else 7.8,4.5,7.8 if axis==0 else .6,steel,solid=True)
   cube('Perimeter white armor',x,3.2,z,.7 if axis==0 else 7.4,1.5,7.4 if axis==0 else .7,ivory)
   cube('Perimeter yellow cap',x,4.55,z,.9 if axis==0 else 8,.18,8 if axis==0 else .9,edge)
  x,z=(sign*61,0) if axis==0 else (0,sign*61)
  cube('Sealed compound gate',x,3.2,z,.9 if axis==0 else 9,6.4,9 if axis==0 else .9,dark,solid=True)
  for side in (-1,1):
   xx,zz=(x,side*6) if axis==0 else (side*6,z)
   cube('Gate pylon',xx,4,zz,2.2,8,2.2,ivory,solid=True)
   cube('Gate identification',xx+.01,4,zz+.01,2.25,.3,2.25,purple)
  boxcol('Outer arena boundary',sign*62 if axis==0 else 0,7,0 if axis==0 else sign*62,1 if axis==0 else 125,16,125 if axis==0 else 1)
# Conifers, rocks and layered canyon formations: low-poly silhouettes in daylight.
for x,z in [(-51,-6),(-51,0),(-51,6),(51,-6),(51,0),(51,6),(-12,49),(12,-49),(-36,-47),(36,47),(-39,-43),(39,43)]:
 cylinder('Pine trunk',x,1,z,.23,2,wood,6,group='vegetation');boxcol('Pine trunk',x,1,z,.46,2,.46)
 for y,r in [(2.2,1.8),(3.4,1.4),(4.5,.9)]:cylinder('Faceted pine boughs',x,y,z,r,2.3,green,7,top=0,group='vegetation')
for i in range(36):
 a=i*math.tau/36;r=104+rng.uniform(-8,14);x,z=point(a,r);h=rng.uniform(16,38);radius=rng.uniform(11,20)
 for layer in range(3):
  yy=-8+h*(layer+.5)/3;ob=cylinder('Layered canyon mesa',x,yy,z,radius*(1-layer*.16),h/3+1,rockm[(i+layer)%4],7,top=radius*(.85-layer*.15),group='backdrop');ob.rotation_euler.z=rng.uniform(-.15,.15)
for i in range(20):
 a=i*math.tau/20;x,z=point(a,69);cylinder('Compound cliff foundation',x,-7,z,12,13,rockm[i%4],7,top=10,group='backdrop')
# Shared gameplay positions avoid cover and use the same generated geometry.
spawns=[[-28,0,-51],[28,0,51],[-54,0,16],[54,0,-16]]
weapons=[[-30,0,22],[30,0,-22],[-18,1.4,4],[18,1.4,-4],[0,3.4,8],[0,1.4,-23],[0,0,35],[0,0,-35]]
pickups=[dict(x=-20,y=1.4,z=-8,type='health'),dict(x=20,y=1.4,z=8,type='health'),dict(x=-44,y=.16,z=-22,type='ammo'),dict(x=44,y=.16,z=22,type='ammo'),dict(x=-10,y=3.4,z=0,type='ammo'),dict(x=10,y=3.4,z=0,type='ammo')]
layout=dict(id='canyon',name='Sunspire Battle Arena',boxes=colliders,spawns=spawns,weaponSpawns=weapons,pickups=pickups)
with open(os.path.join(ROOT,'shared/canyon-layout.ts'),'w',encoding='utf-8') as f:f.write('// Generated by 3d/canyon-arena/build_canyon.py; game meters.\nexport const canyonLayout = '+json.dumps(layout,separators=(',',':'))+';\n')
with open(os.path.join(OUT,'layout.json'),'w') as f:json.dump(layout,f,indent=2)
# Batch static objects to keep the browser and VPS workload modest.
for category in ('ground','architecture','vegetation','backdrop'):
 obs=[o for o in objects if groups.get(o.name)==category]
 bpy.ops.object.select_all(action='DESELECT')
 for ob in obs:ob.select_set(True)
 bpy.context.view_layer.objects.active=obs[0];bpy.ops.object.join();joined=bpy.context.object;joined.name='Sunspire '+category
 objects=[o for o in objects if o not in obs]+[joined]
scene.world=bpy.data.worlds.new('Sunspire clear midday sky');scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs['Color'].default_value=(.48,.68,.85,1);scene.world.node_tree.nodes['Background'].inputs['Strength'].default_value=.65
ld=bpy.data.lights.new('Sunspire midday sun','SUN');ld.energy=2.4;ld.angle=.14;light=bpy.data.objects.new('Sunspire midday sun',ld);scene.collection.objects.link(light);light.rotation_euler=(.45,-.45,-.5)
cd=bpy.data.cameras.new('Sunspire overview camera');cam=bpy.data.objects.new('Sunspire overview camera',cd);scene.collection.objects.link(cam);scene.camera=cam;cam.location=(104,-122,103);cam.rotation_euler=(Vector((0,0,1))-cam.location).to_track_quat('-Z','Y').to_euler();cd.lens=36
scene.render.engine='BLENDER_EEVEE';scene.render.resolution_x=1500;scene.render.resolution_y=1000;scene.render.resolution_percentage=100;scene.render.image_settings.file_format='PNG';scene.view_settings.view_transform='AgX'
bpy.ops.object.select_all(action='DESELECT')
for ob in objects:ob.select_set(True)
bpy.context.view_layer.objects.active=objects[0]
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT,'sunspire-arena.blend'))
bpy.ops.export_scene.gltf(filepath=os.path.join(OUT,'sunspire-arena.glb'),export_format='GLB',use_selection=True,export_yup=True,export_materials='EXPORT')
print('SUNSPIRE ASSETS COMPLETE',len(colliders),'colliders',sum(len(ob.data.polygons) for ob in objects),'polygons')
if '--skip-preview' not in sys.argv:
 scene.render.filepath=os.path.join(OUT,'preview.png');bpy.ops.render.render(write_still=True)
