/** Add future characters here; use the shared locomotion skeleton/socket contract. */
export const avatars={
 'red-warden':{name:'Red Warden',asset:'/assets/bots/red-warden.glb',portrait:'/assets/avatars/red-warden.png',description:'Crimson combat armor'},
 'azure-vanguard':{name:'Azure Vanguard',asset:'/assets/avatars/azure-vanguard.glb',portrait:'/assets/avatars/azure-vanguard.png',description:'Blue armor · amber power core'},
 'halo-warrior':{name:'Halo Warrior',asset:'/assets/avatars/halo-warrior.glb',portrait:'/assets/avatars/halo-warrior.png',description:'Olive power armor · gold visor'},
} as const;
export type AvatarId=keyof typeof avatars;
export function avatarId(value:unknown):AvatarId{return typeof value==='string'&&Object.hasOwn(avatars,value)?value as AvatarId:'red-warden';}
/** Prefer unused bot looks; allow repeats once the roster is exhausted. */
export function randomAvatar(used:AvatarId[]=[],random=Math.random):AvatarId{
 const all=Object.keys(avatars) as AvatarId[],unused=all.filter(id=>!used.includes(id));
 const choices=unused.length?unused:all;
 return choices[Math.min(choices.length-1,Math.floor(random()*choices.length))];
}
