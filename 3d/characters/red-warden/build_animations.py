"""Rebuild Red Warden armed locomotion, preserving its mesh and skin weights."""
import bpy,math,os,json
from mathutils import Vector,Matrix,Quaternion
ROOT=r'D:/learning/unreal-tournament-clone'
OUT=os.path.join(ROOT,'3d/characters/red-warden')
bpy.ops.wm.open_mainfile(filepath=os.path.join(OUT,'red-warden.blend'))
previous_preview=bpy.data.collections.get('Weapon preview only')
if previous_preview:
 for obj in list(previous_preview.objects):bpy.data.objects.remove(obj,do_unlink=True)
rig=bpy.data.objects['RedWarden_Rig'];body=bpy.data.objects['BOT_RedWarden'];scene=bpy.context.scene
# Keep a clean, editable set of persistent actions in the .blend.
rig.animation_data_clear()
for a in list(bpy.data.actions):bpy.data.actions.remove(a)
for n in ['Warden_WeaponSocket','Warden_LeftGrip']:
 if bpy.data.objects.get(n):bpy.data.objects.remove(bpy.data.objects[n],do_unlink=True)
for bone in rig.pose.bones:bone.rotation_mode='QUATERNION';bone.matrix_basis=Matrix.Identity(4)
rest={b.name:b.matrix_local.copy() for b in rig.data.bones}
length={b.name:b.length for b in rig.data.bones}

def orient(name,head,tail):
 b=rig.pose.bones[name];old=rig.data.bones[name]
 q=(old.tail_local-old.head_local).normalized().rotation_difference((tail-head).normalized())
 b.matrix=Matrix.Translation(head) @ q.to_matrix().to_4x4() @ rest[name].to_3x3().to_4x4()
 bpy.context.view_layer.update()

def two_link(upper,lower,start,end,pole):
 l1,l2=length[upper],length[lower];d=end-start;dist=min(d.length,l1+l2-.002);direction=d.normalized();end=start+direction*dist
 along=(l1*l1-l2*l2+dist*dist)/(2*dist);height=math.sqrt(max(0,l1*l1-along*along))
 bend=pole-direction*pole.dot(direction)
 if bend.length<.01:bend=Vector((1,0,0))
 knee=start+direction*along+bend.normalized()*height
 orient(upper,start,knee);orient(lower,knee,end)
 return end

def pose(phase=0,direction=None,jump=0,recoil=0,idle=0):
 for b in rig.pose.bones:b.matrix_basis=Matrix.Identity(4)
 bob=(-.10+.025*math.cos(phase*math.tau*2)) if direction is not None else .004*math.sin(idle*math.tau)
 bob-=jump*.09
 rig.pose.bones['root'].location.z=bob
 bpy.context.view_layer.update()
 for side,offset,sx in [('L',0,.17),('R',.5,-.17)]:
  along=lift=0
  if direction is not None:
   u=(phase+offset)%1
   if u<.28:along=.448-3.2*u
   else:
    t=(u-.28)/.72;along=-.448+.896*(t*t*(3-2*t));lift=.21*math.sin(math.pi*t)
  a=direction or 0;dx=-math.sin(a)*along;dy=-math.cos(a)*along
  ankle=Vector((sx+dx,dy,.14+lift+jump*.16))
  hip=rig.data.bones['thigh.'+side].head_local.copy()+Vector((0,0,bob))
  foot=two_link('thigh.'+side,'shin.'+side,hip,ankle,Vector((0,-1,.04)))
  # A level sole during stance; mild toe lift during swing. No root translation in these clips.
  foot_dir=Vector((0,-.28,-.08+lift*.18))
  orient('foot.'+side,foot,foot+foot_dir)
 # Rifle-ready arms remain steady while the legs move in every direction.
 for side,target,pole in [('R',(-.23,-.20,1.42),(-1,-.1,-.65)),('L',(-.15,-.48,1.39),(1,-.1,-.8))]:
  shoulder=rig.data.bones['upper_arm.'+side].head_local.copy()+Vector((0,0,bob))
  goal=Vector(target)+Vector((0,recoil*.025,bob))
  wrist=two_link('upper_arm.'+side,'forearm.'+side,shoulder,goal,Vector(pole))
  handdir=Vector((0,-.03,-.17)) if side=='R' else Vector((-.11,0,-.10))
  orient('hand.'+side,wrist,wrist+handdir)

def key_pose(frame):
 for b in rig.pose.bones:
  b.keyframe_insert('location',frame=frame,group=b.name)
  b.keyframe_insert('rotation_quaternion',frame=frame,group=b.name)

def make_action(name,frames,fn):
 act=bpy.data.actions.new(name);act.use_fake_user=True;rig.animation_data_create();rig.animation_data.action=act
 for f in range(frames+1):
  pose(**fn(f/frames));key_pose(f)
 # Linear sampling prevents Bezier overshoot that would push planted feet through the floor.
 for layer in act.layers:
  for strip in layer.strips:
   for slot in act.slots:
    bag=strip.channelbag(slot)
    if bag:
     for curve in bag.fcurves:
      for k in curve.keyframe_points:k.interpolation='LINEAR'
 return act
idle=make_action('Warden_Idle',60,lambda t:dict(idle=t))
for name,degrees in [('Forward',0),('ForwardRight',45),('Right',90),('BackRight',135),('Back',180),('BackLeft',225),('Left',270),('ForwardLeft',315)]:
 make_action('Warden_Run'+name,32,lambda t,a=math.radians(degrees):dict(phase=t,direction=a))
make_action('Warden_Jump',24,lambda t:dict(jump=math.sin(math.pi*t)))
make_action('Warden_Fire',12,lambda t:dict(recoil=math.sin(math.pi*t)))
rig.animation_data.action=idle;scene.frame_set(0);pose();bpy.context.view_layer.update()
# Socket is a child of the actual hand bone. Its axes are character-forward/up in the carry pose.
socket=bpy.data.objects.new('Warden_WeaponSocket',None);scene.collection.objects.link(socket);socket.empty_display_type='ARROWS';socket.empty_display_size=.13
socket.parent=rig;socket.parent_type='BONE';socket.parent_bone='hand.R';socket.matrix_world=Matrix.Translation(Vector((-.23,-.23,1.36)))
support=bpy.data.objects.new('Warden_LeftGrip',None);scene.collection.objects.link(support);support.empty_display_size=.08;support.parent=rig;support.parent_type='BONE';support.parent_bone='hand.L';support.matrix_world=Matrix.Translation(Vector((-.20,-.49,1.36)))
# Keep a rifle preview in the editable scene, but export the character and sockets separately.
old=set(bpy.data.objects)
bpy.ops.import_scene.gltf(filepath=os.path.join(ROOT,'3d/weapons/pulse-carbine/pulse-carbine.glb'))
added=[o for o in bpy.data.objects if o not in old]
gunroot=bpy.data.objects.new('Armed pose carbine preview',None);scene.collection.objects.link(gunroot);gunroot.parent=socket;gunroot.rotation_euler.z=math.pi/2;gunroot.scale=(.54,)*3;gunroot.location=(0,-.255*.54,.08*.54)
for o in added:
 if not o.parent:o.parent=gunroot
previewcol=bpy.data.collections.get('Weapon preview only') or bpy.data.collections.new('Weapon preview only')
if previewcol.name not in scene.collection.children:scene.collection.children.link(previewcol)
for o in added+[gunroot]:
 for c in list(o.users_collection):c.objects.unlink(o)
 previewcol.objects.link(o)
scene.render.fps=30;scene.frame_start=0;scene.frame_end=60
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT,'red-warden.blend'))
bpy.ops.object.select_all(action='DESELECT')
for o in [rig,body,socket,support]:o.select_set(True)
bpy.context.view_layer.objects.active=rig
bpy.ops.export_scene.gltf(filepath=os.path.join(OUT,'red-warden.glb'),export_format='GLB',use_selection=True,export_animations=True,export_animation_mode='ACTIONS',export_force_sampling=True,export_frame_range=False,export_apply=False)
with open(os.path.join(OUT,'locomotion.json'),'w') as f:json.dump(dict(stride_m=3.2,game_scale=.85,game_stride_m=2.72,forward='Blender -Y / game +Z',hand_socket='Warden_WeaponSocket',directions=8),f,indent=2)
# A posed render is useful for checking the hand grip before shipping to the browser.
cam=scene.camera;cam.location=(3.0,-4.5,2.4);cam.rotation_euler=(Vector((0,0,1.05))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='PERSP';cam.data.lens=56
scene.render.resolution_x=1000;scene.render.resolution_y=1000;scene.render.resolution_percentage=100;scene.render.image_settings.file_format='PNG';scene.render.filepath=os.path.join(OUT,'armed-preview.png');bpy.ops.render.render(write_still=True)
print('WARDEN ARMED LOCOMOTION SAVED',len(bpy.data.actions),'actions')
