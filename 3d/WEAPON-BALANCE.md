# Arena weapon balance

Authoritative tuning lives in shared/weapons.ts. Players have 100 health.

| Weapon | Damage | Shot interval | Magazine | Reload |
|---|---:|---:|---:|---:|
| Pulse rifle | 18 | 0.20 s | Unlimited | None |
| PC-01 carbine | 24 | 0.13 s | 18 | 1.5 s |
| RL-01 launcher | 110 direct hit | 0.65 s mechanical cooldown | 1 | 2.2 s between loaded rockets |

Rockets travel at 24 m/s and expire after 4 seconds. Splash damage falls linearly from 90 at the explosion centre to zero at 4.5 metres. Walls block splash damage. Direct victims receive the direct-hit damage once, without an additional splash hit. The shooter's splash multiplier is 0.65.

Press R to reload a partial magazine. Empty magazines reload automatically if reserve ammo remains. Reloading blocks that weapon; switching weapons does not reset its timer. Total ammo includes the rounds loaded in the weapon. Reloading transfers reserve rounds into the magazine without discarding or creating ammo. HUD shows loaded / reserve plus a countdown during reload. The launcher pickup supplies six rockets; the carbine supplies 30 rounds. Pickups are required for these weapons, and death clears them.

These are starting gameplay values for family playtesting, not a reproduction of any particular Unreal Tournament edition. Change the shared configuration to tune them.
