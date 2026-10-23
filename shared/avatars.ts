/** Add future characters here; use the shared locomotion skeleton/socket contract. */
export const avatars={
 'red-warden':{name:'Red Warden',asset:'/assets/bots/red-warden.glb',portrait:'/assets/avatars/red-warden.png',description:'Crimson combat armor'},
 'azure-vanguard':{name:'Azure Vanguard',asset:'/assets/avatars/azure-vanguard.glb',portrait:'/assets/avatars/azure-vanguard.png',description:'Blue armor · amber power core'},
} as const;
export type AvatarId=keyof typeof avatars;
export function avatarId(value:unknown):AvatarId{return typeof value==='string'&&Object.hasOwn(avatars,value)?value as AvatarId:'red-warden';}
