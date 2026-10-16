// Reuse the lightweight, licensed footballer rigs with adult proportions.
// Restore before the mixer runs so animation scale tracks cannot accumulate
// the head/hand/boot adjustment over successive frames.
export const ATHLETIC_SCALE=[.94,1.18,.94];
export function athleticRig(model){
 const adjusted=[];
 model.traverse(bone=>{
  if(!bone.isBone)return;
  const factor=bone.name==='Head'?.53:/^(Left|Right)(Hand|Foot)$/.test(bone.name)?.85:1;
  if(factor!==1)adjusted.push({bone,factor,base:bone.scale.clone()});
 });
 return {
  restore(){for(const{bone,base}of adjusted)bone.scale.copy(base)},
  apply(){for(const{bone,factor}of adjusted)bone.scale.multiplyScalar(factor)},
 };
}
