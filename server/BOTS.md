# Arena bots

Bots run entirely on the game server. They use a finite state machine and A* navigation, not an external AI/LLM API. No extra API tokens or model service is required.

The first player creating a room chooses whether bots fill empty slots. The browser enables this by default. A room has at most four participants: one human gets three bots, two humans get two, and so on. A human always takes precedence over a bot. Leaving humans are replaced; rooms are deleted when the last human leaves. To play without bots, uncheck the option before creating a new room. Existing room settings remain unchanged.

## State priorities

| State | Entry condition / behavior |
|---|---|
| DEAD | No health; stop input, clear target memory and wait for normal respawn |
| RETREAT | Critically low health with a visible threat; move toward health or away while defending |
| SEEK_HEALTH | Low health and an available health pickup; navigate to it |
| RELOAD | Active reload for the held weapon; cease firing and move away from a visible enemy |
| ATTACK | Visible target within combat range; turn, aim and fire after reacting; reposition and strafe |
| CHASE | Target outside preferred range, or recently lost from view; follow the target's last seen position |
| SEEK_WEAPON | No visible opponent; find a missing weapon or replenish its depleted ammo |
| PATROL | No immediate combat or resource goal; choose navigable patrol destinations |

Decisions run at 5 Hz; actual movement, collisions, firing, ammo, reloads, damage and respawn use the shared 60 Hz server simulation. Bots have ordinary 100 health and must collect their weapons and ammo. They can attack other bots as well as humans in deathmatch. Practice bots deal 60% damage to humans; human-versus-human and bot-versus-bot damage is unchanged. Fire occurs in short 0.4-second bursts separated by 1-second pauses. All spawns receive three seconds of protection, cancelled by firing.

Perception uses a 42-metre limit, a forward field of view, close-range awareness and wall raycasts. Aiming has a 0.9-second reaction delay, limited turn speed and a larger changing angular error. Lost targets are remembered for 3.5 seconds; bots navigate to that saved position rather than tracking unseen enemies. Rocket selection avoids enemies closer than 8 metres. Pickup locations are known as part of map knowledge.

Navigation is generated once per arena from its floor/stair surfaces and shared collision boxes. A* connects standable positions, checks intermediate body clearance and handles stairs/galleries. Path refreshes are throttled. A stuck detector attempts a jump and alternative nearby route. This is a first bot implementation; playtesting can still expose edge cases around narrow map geometry.

The client currently uses the existing capsule character with distinct bot armor/visor colors. `remote(p)` in client/main.ts is the rendering integration point for a future custom model. The scoreboard shows bot names and current FSM states for inspection; state is also carried in each bot's player snapshot.

## Verification

- `npm test`: navigation, real movement along a gallery route, wall occlusion, reaction delay, FSM transitions, and weapon safety, plus existing gameplay tests.
- `node tools/bots-smoke.mjs`: live room fill, movement/combat, human replacement and backfill.
- `node tools/bots-browser.mjs`: browser opt-in, live bots, scoreboard state display, and rendering.
