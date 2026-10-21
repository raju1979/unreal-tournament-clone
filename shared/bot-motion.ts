/** Bot visual gait calibration: one authored cycle travels 3.2m at 0.85 model scale. */
export const botStrideMeters=2.72;
export const runDirections=['RunForward','RunForwardRight','RunRight','RunBackRight','RunBack','RunBackLeft','RunLeft','RunForwardLeft'] as const;
export const angleDelta=(from:number,to:number)=>Math.atan2(Math.sin(to-from),Math.cos(to-from));
export function gaitDirection(dx:number,dz:number,yaw:number){
 const right=dx*Math.cos(yaw)-dz*Math.sin(yaw),forward=dx*Math.sin(yaw)+dz*Math.cos(yaw);
 const sector=((Math.atan2(right,forward)+Math.PI*2)%(Math.PI*2))/(Math.PI/4),a=Math.floor(sector)%8;
 return {a:runDirections[a],b:runDirections[(a+1)%8],weight:sector-Math.floor(sector)};
}
export function advanceStride(phase:number,distance:number){return (phase+Math.max(0,distance)/botStrideMeters)%1;}
