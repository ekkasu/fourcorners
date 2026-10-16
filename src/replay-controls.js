// Consume button requests every frame so a late click never skips a future replay.
export function consumeReplaySkip(commands,replaying,skipFrom){
 const requested=commands.skipReplay===true;
 commands.skipReplay=false;
 return replaying&&(requested||commands.shootAt!==skipFrom);
}
