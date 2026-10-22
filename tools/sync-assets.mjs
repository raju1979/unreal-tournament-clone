import {mkdirSync,copyFileSync} from 'node:fs';
mkdirSync('public/assets/fortress',{recursive:true});
copyFileSync('3d/fortress-arena/iron-veil-fortress.glb','public/assets/fortress/iron-veil-fortress.glb');
mkdirSync('public/assets/weapons',{recursive:true});
copyFileSync('3d/weapons/pulse-carbine/pulse-carbine.glb','public/assets/weapons/pulse-carbine.glb');
copyFileSync('3d/weapons/rocket-launcher/rocket-launcher.glb','public/assets/weapons/rocket-launcher.glb');
copyFileSync('3d/weapons/rocket-launcher/rocket.glb','public/assets/weapons/rocket.glb');
mkdirSync('public/assets/bots',{recursive:true});
copyFileSync('3d/characters/red-warden/red-warden.glb','public/assets/bots/red-warden.glb');
mkdirSync('public/assets/village',{recursive:true});
copyFileSync('3d/village-arena/village-arena.glb','public/assets/village/village-arena.glb');

mkdirSync('public/assets/outpost',{recursive:true});
copyFileSync('3d/outpost-arena/outpost-arena.glb','public/assets/outpost/outpost-arena.glb');

mkdirSync('public/assets/canyon',{recursive:true});
copyFileSync('3d/canyon-arena/sunspire-arena.glb','public/assets/canyon/sunspire-arena.glb');

mkdirSync('public/assets/effects',{recursive:true});
copyFileSync('3d/effects/rocket-explosion/rocket-explosion.png','public/assets/effects/rocket-explosion.png');

mkdirSync('public/assets/foundry',{recursive:true});
copyFileSync('3d/foundry-arena/ember-foundry.glb','public/assets/foundry/ember-foundry.glb');
