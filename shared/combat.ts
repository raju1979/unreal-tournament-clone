export const combatRules={spawnShieldSeconds:3,botDamageToHuman:.6};
export function incomingDamage(amount:number,botAttacker:boolean,botTarget:boolean,shield:number){
 if(shield>0||amount<=0)return 0;
 return Math.round(amount*(botAttacker&&!botTarget?combatRules.botDamageToHuman:1));
}
