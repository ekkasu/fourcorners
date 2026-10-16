// Eligibility depends on the last player, never on a timer or a wall/post rebound.
export const canTouchBall=(state,who)=>!state.oneTouch||state.toucher!==who;

// Returns true when contact is blocked. Callers must check eligibility before
// changing possession or velocity so an ineligible body cannot affect the ball.
export function touchBall(state,who){
 if(!canTouchBall(state,who))return true;
 if(!state.oneTouch||state.penalty||state.pause>0||state.over)return false;
 state.prevToucher=state.toucher;
 state.toucher=who;
 return false;
}
