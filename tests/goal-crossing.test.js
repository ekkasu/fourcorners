import test from 'node:test';
import assert from 'node:assert/strict';
import {crossedGoal,BALL_RADIUS,GOAL_WIDTH,BLOCK_HEIGHT} from '../src/court-layout.js';
const point=(side,lateral,depth,y=BALL_RADIUS)=>{const [ox,oz]=[[0,-1],[1,0],[0,1],[-1,0]][side];return{x:ox*depth-oz*lateral,z:oz*depth+ox*lateral,y}};
test('all corners require a complete forward crossing inside the visible opening',()=>{
 for(let side=0;side<4;side++){
  const before=point(side,0,10.8);
  assert.ok(crossedGoal(before,point(side,0,11.5),side));
  assert.equal(crossedGoal(before,point(side,0,11.1),side),false,'ball still overlaps line');
  assert.equal(crossedGoal(point(side,1.5,11.5),point(side,0,11.5),side),false,'side entry behind goal');
  assert.equal(crossedGoal(point(side,0,11.5),before,side),false,'reverse crossing');
  assert.equal(crossedGoal(point(side,GOAL_WIDTH/2,10.8),point(side,GOAL_WIDTH/2,11.5),side),false,'post or wide');
  assert.equal(crossedGoal(point(side,0,10.8,BLOCK_HEIGHT+.2),point(side,0,11.5,BLOCK_HEIGHT+.2),side),false,'above blocks');
  assert.equal(crossedGoal(point(side,0,10.8),point(side,3,12),side),false,'crossing was wide even if trajectory continues');
 }
});
