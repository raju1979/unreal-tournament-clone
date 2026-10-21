import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {explosionAnimation as settings} from './explosion-settings';

test('Blender explosion atlas matches the runtime cell grid and playback settings',()=>{
 const root=new URL('../3d/effects/rocket-explosion/',import.meta.url);
 const metadata=JSON.parse(readFileSync(new URL('animation.json',root),'utf8'));
 assert.deepEqual(metadata,settings);
 const png=readFileSync(new URL('rocket-explosion.png',root));
 assert.equal(png.readUInt32BE(16),settings.columns*settings.cellSize);
 assert.equal(png.readUInt32BE(20),settings.rows*settings.cellSize);
 assert.equal(png[25],6,'RGBA atlas retains smoke transparency');
 assert.equal(settings.frames,settings.columns*settings.rows);
 assert.equal(settings.frames/settings.fps,settings.duration);
});
