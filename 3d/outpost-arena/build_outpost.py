"""Prepare the supplied captured outpost and derive its main-deck collision.
Run with Blender --background --python 3d/outpost-arena/build_outpost.py.
Source geometry and UVs are preserved; the original source file is never overwritten.
"""
import bpy,os,json,math,collections
from mathutils import Vector
from mathutils.bvhtree import BVHTree
ROOT=os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT=os.path.join(ROOT,'3d/outpost-arena');SCALE=1.6;BASE=-9.45;CELL=.5
bpy.ops.wm.open_mainfile(filepath=os.path.join(OUT,'source/arena.blend'))
s=bpy.context.scene;o=next(o for o in s.objects if o.type=='MESH');o.name='Outpost captured architecture'
# Apply the source's centimeter transform and move the main courtyard deck to y=0 in game space.
for v in o.data.vertices:
 p=o.matrix_world@v.co;v.co=(p.x*SCALE,p.y*SCALE,(p.z-BASE)*SCALE)
o.location=(0,0,0);o.rotation_euler=(0,0,0);o.scale=(1,1,1)
texture=os.path.join(OUT,'source/UTCapture2_uv_tonemapped.png')
if not os.path.exists(texture):raise RuntimeError('Missing supplied outpost color atlas')
for image in list(bpy.data.images):
 if image.source=='FILE' and not image.has_data and not image.packed_file:bpy.data.images.remove(image)
im=bpy.data.images.load(texture,check_existing=True);im.pack()
m=bpy.data.materials.new('Outpost baked color atlas');m.use_nodes=True
bs=m.node_tree.nodes.get('Principled BSDF');bs.inputs['Roughness'].default_value=.92;bs.inputs['Metallic'].default_value=0
tex=m.node_tree.nodes.new('ShaderNodeTexImage');tex.image=im
m.node_tree.links.new(tex.outputs['Color'],bs.inputs['Base Color']);m.node_tree.links.new(tex.outputs['Color'],bs.inputs['Emission Color']);bs.inputs['Emission Strength'].default_value=.55
m.use_backface_culling=False;o.data.materials.clear();o.data.materials.append(m)
for p in o.data.polygons:p.material_index=0
vs=[v.co.copy() for v in o.data.vertices];bvh=BVHTree.FromPolygons(vs,[list(p.vertices) for p in o.data.polygons],all_triangles=True)
# Restrict play to the captured main courtyard. Upper roofs remain scenery.
# Ray-derived half-meter cells preserve the winding outline and pillar footprints.
xmin,xmax=-27,32;zmin,zmax=-31,31
nx,nz=round((xmax-xmin)/CELL),round((zmax-zmin)/CELL)
floor=set();walk=set()
for ix in range(nx):
 for iz in range(nz):
  x=xmin+(ix+.5)*CELL;z=zmin+(iz+.5)*CELL
  p,n,_,_=bvh.ray_cast(Vector((x,-z,.5)),Vector((0,0,-1)),1)
  if not p or abs(n.z)<.82 or abs(p.z)>.16:continue
  floor.add((ix,iz));clear=True
  for h in (.4,.9,1.4,1.85):
   near,_,_,dist=bvh.find_nearest(Vector((x,-z,h)))
   if near and dist<.26:clear=False;break
  if clear:walk.add((ix,iz))
# Keep only the largest connected courtyard component; tiny scan islands aren't playable.
components=[];remaining=set(walk)
while remaining:
 seed=remaining.pop();component={seed};queue=[seed]
 for ix,iz in queue:
  for q in ((ix-1,iz),(ix+1,iz),(ix,iz-1),(ix,iz+1)):
   if q in remaining:remaining.remove(q);component.add(q);queue.append(q)
 components.append(component)
walk=max(components,key=len)
boxes=[]
def add(name,x,y,z,w,h,d,kind='wall'):boxes.append(dict(name=name,x=round(x,4),y=round(y,4),z=round(z,4),w=round(w,4),h=round(h,4),d=round(d,4),kind=kind))
def rectangles(cells,name,y,h,kind):
 cells=set(cells)
 while cells:
  ix,iz=min(cells);width=1
  while (ix+width,iz) in cells:width+=1
  depth=1
  while all((xx,iz+depth) in cells for xx in range(ix,ix+width)):depth+=1
  for xx in range(ix,ix+width):
   for zz in range(iz,iz+depth):cells.remove((xx,zz))
  add(name,xmin+(ix+width/2)*CELL,y,zmin+(iz+depth/2)*CELL,width*CELL,h,depth*CELL,kind)
# Full outside columns prevent escaping into the unmodeled backs of the capture.
rectangles(walk,'Outpost main deck',-.25,.5,'floor')
rectangles({(x,z) for x in range(nx) for z in range(nz)}-walk,'Outpost structure',3,6,'wall')
# Sample clear spots with a generous margin; choose separated corners deterministically.
def blocked(x,z):
 return any(abs(x-b['x'])<b['w']/2+.42 and abs(z-b['z'])<b['d']/2+.42 for b in boxes if b['kind']=='wall')
spots=[]
for ix,iz in sorted(walk):
 x=xmin+(ix+.5)*CELL;z=zmin+(iz+.5)*CELL
 if all(not blocked(x+dx,z+dz) for dx,dz in [(0,0),(.6,0),(-.6,0),(0,.6),(0,-.6)]):spots.append([x,0,z])
selected=[min(spots,key=lambda p:p[0]+p[2])]
for _ in range(11):selected.append(max(spots,key=lambda p:min(math.hypot(p[0]-q[0],p[2]-q[2]) for q in selected)))
# Add readable, solid cover to the captured courtyard's open center.
cover=[];export_objects=[o]
steel=bpy.data.materials.new('Outpost supply steel');steel.diffuse_color=(.11,.18,.23,1);steel.use_nodes=True;steel.node_tree.nodes.get('Principled BSDF').inputs['Base Color'].default_value=(.11,.18,.23,1)
warning=bpy.data.materials.new('Outpost supply amber');warning.diffuse_color=(.9,.32,.06,1);warning.use_nodes=True;warning.node_tree.nodes.get('Principled BSDF').inputs['Base Color'].default_value=(.9,.32,.06,1)
for p in sorted(spots,key=lambda p:abs(p[0])+abs(p[2])):
 if min(math.hypot(p[0]-q[0],p[2]-q[2]) for q in selected)<3.2:continue
 if any(math.hypot(p[0]-q[0],p[2]-q[2])<6 for q in cover):continue
 if blocked(p[0]+.8,p[2]+.8) or blocked(p[0]-.8,p[2]-.8):continue
 cover.append(p);x,_,z=p;add('Outpost supply cover',x,.7,z,1.6,1.4,1.6,'crate')
 for name,loc,size,mat in [('Supply container',(x,-z,.7),(1.6,1.6,1.4),steel),('Supply warning band',(x,-z,1.1),(1.63,1.63,.12),warning)]:
  bpy.ops.mesh.primitive_cube_add(size=1,location=loc);ob=bpy.context.object;ob.name=name;ob.scale=size;ob.data.materials.append(mat);export_objects.append(ob)
 if len(cover)==4:break
# Face each spawn down a clear sightline instead of into the central machinery.
spawn_points=[]
for x,y,z in selected[:4]:
 best=None
 for k in range(48):
  yaw=k*math.tau/48;origin=Vector((x,-z,1.45));direction=Vector((math.sin(yaw),-math.cos(yaw),0))
  hit,_,_,distance=bvh.ray_cast(origin,direction,40);clear=distance if hit else 40
  # Prefer a clear view into the playable courtyard, rather than a scan opening.
  interior=sum(not blocked(x+math.sin(yaw)*r,z+math.cos(yaw)*r) for r in (2,4,6,8,10))
  score=interior*10+min(clear,18)
  if best is None or score>best[0]:best=(score,yaw)
 spawn_points.append([x,y,z,round(best[1],6)])
layout=dict(id='outpost'  ,name='Frostline Outpost',boxes=boxes,spawns=spawn_points,weaponSpawns=selected[4:10],pickups=[dict(x=p[0],y=p[1],z=p[2],type='health' if i==0 else 'ammo') for i,p in enumerate(selected[10:])])
with open(os.path.join(ROOT,'shared/outpost-layout.ts'),'w') as f:f.write('// Generated by 3d/outpost-arena/build_outpost.py; game meters.\nexport const outpostLayout = '+json.dumps(layout,separators=(',',':'))+';\n')
with open(os.path.join(OUT,'layout.json'),'w') as f:json.dump(dict(scale=SCALE,sourceFloor=BASE,walkCells=len(walk),**layout),f,indent=2)
# Save portable edited Blender source and embedded-texture browser model.
s.world=bpy.data.worlds.new('Outpost cold sky');s.world.use_nodes=True;s.world.node_tree.nodes['Background'].inputs['Color'].default_value=(.56,.69,.80,1);s.world.node_tree.nodes['Background'].inputs['Strength'].default_value=.65
ld=bpy.data.lights.new('Outpost sun','SUN');ld.energy=1.25;lo=bpy.data.objects.new('Outpost sun',ld);s.collection.objects.link(lo);lo.rotation_euler=(.4,-.6,-.4)
cd=bpy.data.cameras.new('Outpost preview');cam=bpy.data.objects.new('Outpost preview',cd);s.collection.objects.link(cam);s.camera=cam;cam.location=(42,-58,62);cam.rotation_euler=(Vector((0,0,12))-cam.location).to_track_quat('-Z','Y').to_euler();cd.lens=38
s.render.engine='BLENDER_EEVEE';s.render.resolution_x=1400;s.render.resolution_y=1000;s.render.resolution_percentage=100;s.render.image_settings.file_format='PNG'
bpy.ops.file.pack_all();bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT,'outpost-arena.blend'))
bpy.ops.object.select_all(action='DESELECT');
for ob in export_objects:ob.select_set(True)
bpy.context.view_layer.objects.active=o
bpy.ops.export_scene.gltf(filepath=os.path.join(OUT,'outpost-arena.glb'),export_format='GLB',use_selection=True,export_yup=True,export_materials='EXPORT')
s.render.filepath=os.path.join(OUT,'preview.png');bpy.ops.render.render(write_still=True)
print('OUTPOST COMPLETE',len(walk),'walk cells',len(boxes),'boxes',selected)
