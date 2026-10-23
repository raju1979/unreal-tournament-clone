# Reactor Arena

An original browser arena-shooter prototype for 2–4 family members. Babylon.js renders with WebGPU when available and falls back to WebGL. Node.js runs an authoritative 60 Hz simulation with 20 Hz snapshots using WebSockets. No account or paid service is required. This first version uses a lightweight custom server instead of Colyseus.

## Play locally

Use Node.js 22 or newer. Run `npm ci`, then `npm run dev`, and open http://localhost:3000. Open another browser tab/window and use the same private room string to test multiplayer. The room string is the invite secret: there are no user accounts. Maximum four players per room. The renderer requires desktop graphics support.

WASD moves, Space jumps, mouse aims, left click fires, 1 selects pulse rifle, 2 selects rockets, Tab shows scores, Escape pauses local input and releases the mouse. Your character stays in the match while paused. Pulse ammo is unlimited; health respawns after 12 seconds and collected ammo packs return after 8–18 seconds. First to 20 kills or 10 minutes starts the next round. Enable Fill Empty Slots With Bots to play solo or alongside family members.

## VPS deployment

Copy this project to the Linux VPS, install Docker with Compose, and run `docker compose up -d --build`. It binds only to localhost:3000. Put Caddy on the VPS using Caddyfile.example (replace the domain), point your DNS to the VPS, and allow ports 80/443. Caddy supplies HTTPS and proxies WebSockets. HTTPS is required for WebGPU outside localhost. Everyone visits the same HTTPS URL and enters the same room string. Do not expose Blender MCP on the VPS.

Alternatively: `npm ci`, `npm run build`, then `NODE_ENV=production npm start` on Linux. Run that process under your normal service manager and reverse proxy.

## Add arenas

`shared/maps.ts` is the map registry. An arena supplies a unique id, display name, box collision geometry, spawn positions (feet coordinates), and pickups. Renderer and simulation use the same geometry. Add another Arena entry to `arenas`, then add a room map selector/server validation and a client map loading transition. Six arenas are available: Reactor, Canal Village, Frostline Outpost, Sunspire Battle Arena, Iron Veil Fortress, and Ember Foundry. Select a battleground before creating a room; its first player chooses the map.

Coordinates are metres, Y up, +Z forward. Characters are 1.7 metres tall. Shared collision boxes must cover any solid imported scenery; imported GLB decorations do not automatically become server colliders. Map-specific decoration is currently authored in client/main.ts and should be extracted into a map scene builder when adding the next arena.

`assets/blender/reactor.blend` contains the editable reactor detail assembly. `public/assets/reactor.glb` is its browser export. Blender uses Z up; GLB export converts to Y up. The remaining map geometry is generated from shared map data.

## Verification and scope

`npm run check`, `npm test`, `npm run build`. This is an early playable prototype: simple character/weapon geometry, synthesized sound effects, basic prediction and reconciliation, and remote-player interpolation. It has no historical hit rewind, persistent accounts, reconnect identity, match history, or production anti-cheat. Internet play and performance on your brothers' devices still need testing. Server restarts discard rooms and scores.

## PC-01 carbine pickup

A glowing, rotating PC-01 weapon spawns at a clear arena location chosen by the server at round setup. Walk within 1.5 metres to collect it and auto-equip weapon 3 with 30 rounds (maximum 60). Press 1/2/3 to switch weapons. It fires hitscan rounds at 25 damage with a 0.16-second firing interval. Only one player can collect each appearance. The pickup returns after 20 seconds at the same location. Death removes ownership/ammo, so find it again after respawning. The first-person model retains obstacle retraction; remote players also see the carbine.

Editable source and export: 3d/weapons/pulse-carbine/. `npm run build` copies the GLB into the public runtime assets automatically. Browser pickup/fire verification: `node tools/carbine-browser.mjs` against a running local server.

## Firing effects

Pulse and carbine shots display moving cyan/amber bullet tracers, a short muzzle flash, a brief light and impact sparks. The PC-01 uses its named Blender muzzle attachment. These are cosmetic tracers: hit detection and damage remain server-authoritative hitscan. Rockets also produce launcher flash/recoil and blend their first visual position from the muzzle into the authoritative projectile position. Effects have bounded lifetimes and a 160-mesh cap. `npx tsx tools/effects-smoke.ts` verifies effect lifecycle; `node tools/firing-browser.mjs` verifies live firing in the browser. User-supplied audio can go under public/audio/weapons/ later; current audio remains synthesized placeholders.

## RL-01 launcher model

Weapon 2 uses the Blender RL-01 Breacher model in first-person and remote-player views. Fired rockets use the matching finned projectile, point along their velocity, and have a glowing exhaust. Muzzle flashes use RL01_MUZZLE. Launcher retraction accounts for its wider body. Gameplay remains the existing authoritative rocket simulation, ammo and splash damage. Both GLBs are synchronized from 3d/weapons/rocket-launcher/ during npm run build. `node tools/launcher-browser.mjs` checks asset loading, equipping and live firing.

## Random launcher and explosion update

Players now start with only the pulse rifle. Find the orange RL-01 launcher pickup to unlock weapon 2 and receive six rockets. Its pickup returns at the same spot after 25 seconds; ownership and rocket ammo are lost on respawn. Ammo packs refill the owned launcher and carbine reserves. The carbine pickup remains separate.

The old solid explosion sphere is replaced by procedural alpha-textured fire/smoke billboards, embers, a fading shockwave, brief warm light and mild camera shake near the blast. Damage is still server-authoritative. The current effect also uses a Blender-simulated fire/smoke flipbook (see Rocket explosion animation below). Scene destruction and recorded explosion audio are not included. Check launcher collection and firing with node tools/launcher-pickup-browser.mjs, and explosion lifecycle with npx tsx tools/effects-smoke.ts.

## Damage and reload balance

Shared authoritative weapon configuration is in shared/weapons.ts. Pulse: 18 damage, 0.20s between shots, unlimited ammo. Carbine: 24 damage, 0.13s between shots, 18-round magazine, 1.5s reload. Launcher: 150 direct-hit damage, one rocket loaded, 2.2s automatic reload between rockets; splash damage is 140 within 1m, then falls to zero at 5m (lethal against unshielded enemies within about 2m), is blocked by walls, and uses a 0.65 self-damage multiplier. Rockets use swept collision against players so direct hits receive damage once. Press R to reload a partial magazine; empty magazines reload automatically with reserve ammo. Switching weapons does not reset a running reload. HUD shows loaded/reserve ammo and reload countdown. See 3d/WEAPON-BALANCE.md for tuning notes.

## Solo practice bots

Leave FILL EMPTY SLOTS WITH BOTS checked when creating a new room to play against three server-controlled bots. Human friends replace bots as they join, and bots fill vacated slots. Uncheck it before creating a new room for human-only play. Press Tab to see bot names and FSM states. Bots use the animated Red Warden model with held weapons. Their patrol, pickup, health, combat, chase, retreat, reload and death behavior is documented in server/BOTS.md. They use normal player physics and weapon rules and require no external AI API.

## More forgiving practice combat

Bot tuning in server/bots.ts now uses a 0.9-second reaction delay, wider aim error, 0.4-second bursts and 1-second pauses. shared/combat.ts scales bot-to-human damage to 60% without changing PvP damage. Spawning grants three seconds of protection, cancelled immediately by firing; the HUD shows the remaining shield time. A* pathfinding, staircase traversal and the bot FSM remain enabled.

## Frostline Outpost

The supplied textured outpost is now a third selectable arena. Its main courtyard supports four players or bots, randomized weapon pickups, health/ammo, and supply-crate cover. Upper roofs remain scenery. Editable Blender source, browser export, rebuild instructions, and collision limits are documented in `3d/outpost-arena/README.md`.

Ammo packs appear at marked ammo spots in all arenas after 3–8 seconds, then return 8–18 seconds after collection. Each pack adds 24 carbine rounds and 6 rockets for weapons already owned, up to 60 rounds and 30 rockets. Packs remain until collected; reserve ammunition still requires normal reloading. Bots can seek available packs when low on ammunition.

## Sunspire Battle Arena

Choose Sunspire Battle Arena in Battleground to play the fourth arena: a low-poly daylight sci-fi compound with two raised combat rings, four stair routes, open hangars, cargo cover and canyon cliffs. Editable Blender source, the GLB export and the rebuild script are in `3d/canyon-arena/`. See its README for layout details and validation. The first player chooses a private room's map, so use a new room name when changing arenas.

## Rocket explosion animation

Rocket impacts use a Blender-simulated fire/smoke flipbook in all arenas, accompanied by the flash, sparks, shockwave and light pulse. Editable source, transparent frame renders, atlas and rebuild instructions are in `3d/effects/rocket-explosion/`. The generated fluid cache is local and excluded from Git; runtime playback requires only the shared atlas.

## Bot jumping and dodging

Bots use short lateral dodges when hit, when an opponent fires toward them, or when a visible approaching rocket threatens their route. They can mix jumps into those dodges and occasionally hop in close combat or over an obstruction. Maneuvers use normal player movement and cooldowns. A preview of movement and landing rejects high drops, blocked escape routes and jumps under low ceilings. A dodge keeps the existing target, aiming and navigation goal; the scoreboard shows DODGE or JUMP while the maneuver is requested.

Weapon locations are randomized at round setup and remain fixed during that round. After collection, the carbine returns in 20 seconds, the launcher in 25 seconds, and ammo packs in 8–18 seconds at their original spots. The server shares these timers with everyone in the room.


## Iron Veil Fortress

A dark medieval hall inspired by the supplied reference, with mossy stone, massive pillars, timber beams, torchlight, green rose windows, crimson banners, a safe shallow jade pool, and two elevated galleries. Select Iron Veil Fortress and use a new room name. Editable Blender source, generated textures, GLB, and rebuild details are in `3d/fortress-arena/README.md`.


## Ember Foundry

The sixth selectable arena is a 64 by 52 metre industrial hall with two orange furnaces, looping ground routes, two elevated gantries joined by a bridge, four stair approaches, cargo cover, overhead piping and a crane. Select Ember Foundry and create a new room. Editable Blender source, embedded generated textures, GLB and rebuilding instructions are in `3d/foundry-arena/README.md`.


## Weapon pickups across all arenas

Every clear authored weapon spawn is now populated at round setup, with all four weapon types represented: pulse rifle (1), launcher (2), carbine (3), and Impact Hammer (4). Additional positions repeat weapon types. Positions are assigned without overlap, remain fixed during the round, and are reshuffled together for the next round. Launcher and carbine pickups retain their 25s and 20s respawn timers; pulse and hammer pickups return after 12s. Pulse and hammer remain available from spawn; their world pickups equip them. Bots can seek every launcher/carbine location. Run `node tools/all-weapons-browser.mjs` against the local server to verify every arena and the new pickup models.


## Rocket smoke trails

Flying rockets leave a short grey smoke trail behind their exhaust. Puffs expand, drift upward, and fade within 0.8 seconds, including after impact. Smoke is cosmetic and shared for local and remote rockets, with a cap of 80 smoke puffs inside the existing 160-effect budget. `npx tsx tools/effects-smoke.ts` checks fading, sizing, cleanup and bounds.


## Player avatars

Choose Red Warden or Azure Vanguard in the start menu before entering a room. The browser remembers your selection; the server validates and replicates it to other players, and respawning preserves it. Human characters now use animated models with held weapons, like the bots. Azure Vanguard is an original low-poly blue armored warrior inspired by the supplied reference, with 2,944 triangles, rigid armor skinning, UVs and shared armed locomotion. Add future choices in `shared/avatars.ts` and sync their source assets through `tools/sync-assets.mjs`; use the shared skeleton, animation names and hand socket. See `3d/characters/azure-vanguard/README.md`.
