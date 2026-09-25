export class Survival {
 constructor(random=Math.random,inventory=null){this.random=random;this.satiety=100;this.food=inventory||{coconut:0,fish:0,seafood:0,cooked:0};for(const key of ['coconut','fish','seafood','cooked'])this.food[key]??=0;this.torch=false;this.lit=false;this.traps=new Map();this.cooking=null;}
 craft(game){if(this.torch||game.wood<2||game.leaves<2)return false;game.wood-=2;game.leaves-=2;this.torch=this.lit=true;return true;}
 eat(){if(this.satiety>=100)return false;const kind=this.food.cooked?'cooked':this.food.coconut?'coconut':null;if(!kind)return false;this.food[kind]--;this.satiety=Math.min(100,this.satiety+(kind==='cooked'?38:18));return true;}
 cook(fire){if(!fire||this.cooking)return false;const kind=this.food.fish?'fish':this.food.seafood?'seafood':null;if(!kind)return false;this.food[kind]--;this.cooking={fire,kind,remaining:8};return true;}
 collect(trap){const state=this.traps.get(trap);if(!state||!state.catch)return false;this.food[state.catch]++;state.catch=null;state.wait=25+this.random()*30;return true;}
 update(dt,buildings){this.satiety=Math.max(0,this.satiety-dt*.075);for(const b of buildings){if(b.type!=='trap')continue;if(!this.traps.has(b))this.traps.set(b,{wait:25+this.random()*30,catch:null});const s=this.traps.get(b);if(!s.catch&&(s.wait-=dt)<=0){s.catch=this.random()<.6?'fish':'seafood';}}
 if(this.cooking){this.cooking.remaining-=dt;if(this.cooking.remaining<=0){this.food.cooked++;this.cooking=null;return true;}}return false;}
}
