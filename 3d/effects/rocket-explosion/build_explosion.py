"""Bake a short Mantaflow fire burst and render a transparent browser flipbook.
blender -b --python 3d/effects/rocket-explosion/build_explosion.py
--preview-only renders two frames after the bake; --render-only reuses the saved bake.
"""
import bpy,os,math,json,random,sys
import numpy as np
from mathutils import Vector
ROOT=os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
OUT=os.path.join(ROOT,'3d/effects/rocket-explosion');CACHE=os.path.join(OUT,'cache');os.makedirs(os.path.join(OUT,'frames'),exist_ok=True)
FRAMES=40;CELL=384
if '--render-only' in sys.argv:
 bpy.ops.wm.open_mainfile(filepath=os.path.join(OUT,'rocket-explosion.blend'));s=bpy.context.scene
else:
 bpy.ops.wm.read_factory_settings(use_empty=True);s=bpy.context.scene;rng=random.Random(311);s.frame_start=1;s.frame_end=FRAMES;s.render.fps=25;s.gravity=(0,0,-.6)
 # A brief cluster of hot gas sources injects outward velocity into the domain.
 for i in range(7):
  a=i*math.tau/6;pos=Vector((math.cos(a)*.27,math.sin(a)*.27,rng.uniform(-.15,.25))) if i else Vector((0,0,0))
  bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2,radius=.42,location=pos);o=bpy.context.object;o.name='Burst fuel source '+str(i);o.display_type='WIRE';o.hide_render=True
  mod=o.modifiers.new('Brief hot fuel injection','FLUID');mod.fluid_type='FLOW';f=mod.flow_settings;f.flow_type='BOTH';f.flow_behavior='INFLOW';f.density=1.5;f.fuel_amount=2.0;f.temperature=2;f.use_initial_velocity=True;f.velocity_normal=2.5;f.velocity_random=1;f.velocity_coord=pos.normalized()*3 if pos.length else Vector((0,0,.6));f.surface_distance=1.5
  f.use_inflow=True;f.keyframe_insert(data_path='use_inflow',frame=1);f.keyframe_insert(data_path='use_inflow',frame=3);f.use_inflow=False;f.keyframe_insert(data_path='use_inflow',frame=4)
 bpy.ops.mesh.primitive_cube_add(size=1,location=(0,0,1.2));domain=bpy.context.object;domain.name='Rocket explosion gas domain';domain.dimensions=(7.2,6.0,7.2);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 mod=domain.modifiers.new('Mantaflow explosion','FLUID');mod.fluid_type='DOMAIN';d=mod.domain_settings;d.domain_type='GAS';d.resolution_max=64;d.time_scale=1.1;d.vorticity=1.5;d.flame_vorticity=2.0;d.burning_rate=.65;d.flame_smoke=.8;d.use_adaptive_domain=True;d.adapt_margin=5;d.use_noise=True;d.noise_scale=2;d.noise_strength=1.3;d.cache_type='ALL';d.cache_frame_start=1;d.cache_frame_end=FRAMES;d.cache_directory=CACHE
 m=bpy.data.materials.new('Simulated fire and charcoal smoke');m.use_nodes=True;n=m.node_tree.nodes;l=m.node_tree.links;n.clear();out=n.new('ShaderNodeOutputMaterial');p=n.new('ShaderNodeVolumePrincipled');p.inputs['Color'].default_value=(.075,.068,.06,1);p.inputs['Density'].default_value=3;p.inputs['Density Attribute'].default_value='density';p.inputs['Anisotropy'].default_value=.1;l.new(p.outputs['Volume'],out.inputs['Volume'])
 attr=n.new('ShaderNodeAttribute');attr.attribute_name='flame';temp=n.new('ShaderNodeMath');temp.operation='MULTIPLY_ADD';temp.inputs[1].default_value=1900;temp.inputs[2].default_value=850;l.new(attr.outputs['Fac'],temp.inputs[0]);bb=n.new('ShaderNodeBlackbody');l.new(temp.outputs[0],bb.inputs[0]);l.new(bb.outputs[0],p.inputs['Emission Color'])
 heat=n.new('ShaderNodeMath');heat.operation='MULTIPLY';heat.inputs[1].default_value=7;l.new(attr.outputs['Fac'],heat.inputs[0]);l.new(heat.outputs[0],p.inputs['Emission Strength']);domain.data.materials.append(m)
 s.render.engine='BLENDER_EEVEE';s.render.resolution_x=CELL;s.render.resolution_y=CELL;s.render.resolution_percentage=100;s.render.film_transparent=True;s.render.image_settings.file_format='PNG';s.render.image_settings.color_mode='RGBA';s.render.image_settings.color_depth='8';s.eevee.taa_render_samples=32;s.eevee.volumetric_tile_size='1';s.eevee.volumetric_samples=96;s.eevee.use_volumetric_shadows=True;s.eevee.volumetric_shadow_samples=16;s.eevee.use_volume_custom_range=True;s.eevee.volumetric_start=.1;s.eevee.volumetric_end=25;s.view_settings.view_transform='AgX';s.view_settings.look='AgX - Medium High Contrast'
 s.world=bpy.data.worlds.new('Transparent fire studio');s.world.use_nodes=True;s.world.node_tree.nodes['Background'].inputs['Strength'].default_value=.08
 for name,pos,energy,color in [('Warm fire light',(1,-4,1),220,(1,.45,.15)),('Cool smoke rim',(-3,1,4),450,(.72,.80,1))]:
  ld=bpy.data.lights.new(name,'AREA');ld.energy=energy;ld.color=color;ld.shape='DISK';ld.size=4;lo=bpy.data.objects.new(name,ld);s.collection.objects.link(lo);lo.location=pos;lo.rotation_euler=(Vector((0,0,1))-lo.location).to_track_quat('-Z','Y').to_euler()
 cd=bpy.data.cameras.new('Transparent explosion camera');cam=bpy.data.objects.new('Transparent explosion camera',cd);s.collection.objects.link(cam);cam.location=(0,-14,1.25);cam.rotation_euler=(Vector((0,0,1.25))-cam.location).to_track_quat('-Z','Y').to_euler();cd.type='ORTHO';cd.ortho_scale=7.6;s.camera=cam
 s.frame_set(1);bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT,'rocket-explosion.blend'));bpy.context.view_layer.objects.active=domain;bpy.ops.object.select_all(action='DESELECT');domain.select_set(True)
 print('BAKING MANTAFLOW',flush=True);bpy.ops.fluid.bake_all();print('BAKE COMPLETE',flush=True);s.frame_set(10);bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT,'rocket-explosion.blend'))
# Grade the simulated flames and expose fine turbulent detail without clipping the core.
s.render.resolution_x=CELL;s.render.resolution_y=CELL
if '--render-only' not in sys.argv:
 mat=bpy.data.materials['Simulated fire and charcoal smoke'];n=mat.node_tree.nodes;l=mat.node_tree.links;p=next(v for v in n if v.type=='PRINCIPLED_VOLUME');p.inputs['Density'].default_value=5.5
 attr=next(v for v in n if v.type=='ATTRIBUTE');temp=next(v for v in n if v.type=='MATH' and v.operation=='MULTIPLY_ADD');temp.inputs[1].default_value=950
 clamp=n.new('ShaderNodeMath');clamp.operation='MINIMUM';clamp.inputs[1].default_value=1;l.new(attr.outputs['Fac'],clamp.inputs[0]);l.new(clamp.outputs[0],temp.inputs[0])
 coord=n.new('ShaderNodeTexCoord');detail=n.new('ShaderNodeTexNoise');detail.name='Flame detail noise';detail.inputs['Scale'].default_value=3.0;detail.inputs['Detail'].default_value=3.5;detail.inputs['Roughness'].default_value=.7;l.new(coord.outputs['Object'],detail.inputs['Vector'])
 ramp=n.new('ShaderNodeValToRGB');ramp.color_ramp.elements[0].position=.35;ramp.color_ramp.elements[0].color=(.015,.015,.015,1);ramp.color_ramp.elements[1].position=.65;l.new(detail.outputs['Fac'],ramp.inputs[0])
 heat=next(v for v in n if v.type=='MATH' and v.operation=='MULTIPLY');heat.inputs[1].default_value=5
 mask=n.new('ShaderNodeMath');mask.operation='MULTIPLY';l.new(heat.outputs[0],mask.inputs[0]);l.new(ramp.outputs['Color'],mask.inputs[1]);l.new(mask.outputs[0],p.inputs['Emission Strength'])
 s.frame_set(10);bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT,'rocket-explosion.blend'))
meta=dict(columns=8,rows=5,frames=40,cellSize=CELL,fps=25,duration=1.6,worldSize=7.6,centerHeight=1.25)
with open(os.path.join(OUT,'animation.json'),'w') as f:json.dump(meta,f,indent=2)
with open(os.path.join(ROOT,'shared/explosion-settings.ts'),'w') as f:f.write('// Generated by 3d/effects/rocket-explosion/build_explosion.py.\nexport const explosionAnimation = '+json.dumps(meta,separators=(',',':'))+' as const;\n')
for frame in ([10,24] if '--preview-only' in sys.argv else range(1,41)):
 s.frame_set(frame);s.render.filepath=os.path.join(OUT,'frames',str(frame).zfill(3)+'.png');bpy.ops.render.render(write_still=True)
if '--preview-only' in sys.argv:sys.exit(0)
atlas=np.zeros((5*CELL,8*CELL,4),dtype=np.float32)
for i in range(40):
 im=bpy.data.images.load(os.path.join(OUT,'frames',str(i+1).zfill(3)+'.png'),check_existing=False);pixels=np.array(im.pixels[:],dtype=np.float32).reshape(CELL,CELL,4);x=(i%8)*CELL;y=(4-i//8)*CELL;atlas[y:y+CELL,x:x+CELL]=pixels;bpy.data.images.remove(im)
im=bpy.data.images.new('Rocket explosion flipbook',width=8*CELL,height=5*CELL,alpha=True);im.alpha_mode='STRAIGHT';im.pixels.foreach_set(atlas.ravel());im.filepath_raw=os.path.join(OUT,'rocket-explosion.png');im.file_format='PNG';im.save();print('EXPLOSION COMPLETE',os.path.getsize(im.filepath_raw),'bytes',flush=True)
