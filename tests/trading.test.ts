import test from 'node:test';
import assert from 'node:assert/strict';
import {DAY_SECONDS, createGame, buy, purchaseCost, setPrice, setSpeed, startDay, upgrade, serve, tick, finishDay, nextDay, rentFor, stockCount, stockValue, capacity, serialize, deserialize, visitorCount} from '../src/game.ts';
import {prepare} from '../scripts/balance.ts';

test('45 game seconds keep the same daily visitor quota at every speed',()=>{
 assert.equal(DAY_SECONDS,45);
 const games=[1,2,3].map(speed=>{const g=createGame(12);prepare(g,'balanced');setSpeed(g,speed);startDay(g);tick(g,DAY_SECONDS/speed);return g;});
 for(const g of games){assert.equal(g.elapsed,45);assert.equal(g.phase,'summary');assert.equal(g.stats.visitors,visitorCount(g));assert.deepEqual(g.visits,games[0].visits);assert.equal(g.cash,games[0].cash);assert.equal(g.history.length,1);}
});

test('large and small accelerated ticks process every customer exactly once',()=>{
 for(const speed of [1,2,3]){
  const a=createGame(9),b=createGame(9);prepare(a,'balanced');prepare(b,'balanced');setSpeed(a,speed);setSpeed(b,speed);startDay(a);startDay(b);
  for(let i=0;i<DAY_SECONDS*10/speed;i++)tick(a,.1);
  tick(b,1000);
  assert.equal(a.phase,'summary');assert.equal(a.stats.visitors,visitorCount(a));assert.deepEqual(a.visits,b.visits);assert.equal(a.cash,b.cash);
  const end=serialize(a);tick(a,10);assert.equal(serialize(a),end);
 }
});

test('speed changes are prospective and pause stops time, visitors and revenue',()=>{
 const g=createGame(18);prepare(g,'balanced');startDay(g);
 tick(g,5);assert.equal(g.elapsed,5);setSpeed(g,2);assert.equal(g.elapsed,5);tick(g,5);assert.equal(g.elapsed,15);
 setSpeed(g,3);tick(g,5);assert.equal(g.elapsed,30);
 g.paused=true;setSpeed(g,2);const paused=serialize(g);tick(g,100);assert.equal(serve(g),null);assert.equal(serialize(g),paused);
 g.paused=false;tick(g,7.5);assert.equal(g.elapsed,45);assert.equal(g.stats.visitors,visitorCount(g));
 for(const value of [0,4,1.5,NaN,Infinity])assert.equal(setSpeed(g,value),false);
});

test('urgent procurement charges rounded-up +15% per unit and creates distinct FIFO lots',()=>{
 const g=createGame(55);g.costs[0]=20;assert.equal(purchaseCost(g,0),20);assert.ok(buy(g,0,1));
 startDay(g);assert.equal(purchaseCost(g,0),23);assert.ok(buy(g,0,1));
 assert.equal(g.cash,157);assert.equal(g.stats.procurement,43);assert.deepEqual(g.stock[0].lots,[{qty:1,cost:20},{qty:1,cost:23}]);
 setPrice(g,0,1);let sold=0;
 while(g.stats.visitors<visitorCount(g)&&sold<2){const v=serve(g)!;if(v.bought){sold++;assert.equal(g.stats.cogs,sold===1?20:43);}}
 assert.equal(sold,2);assert.equal(g.stock[0].qty,0);assert.equal(stockValue(g),0);assert.equal(g.stats.revenue,2);
 const rounded=createGame(1);rounded.costs[0]=6;startDay(rounded);assert.equal(purchaseCost(rounded,0),7);
});

test('urgent procurement respects its actual cost, capacity and repeated orders including pause',()=>{
 const g=createGame(55);g.costs[0]=20;startDay(g);g.cash=22;const before=serialize(g);assert.equal(buy(g,0,1),false);assert.equal(serialize(g),before);
 g.cash=10000;g.paused=true;
 for(let i=0;i<capacity(g);i++)assert.ok(buy(g,0,1));
 assert.equal(stockCount(g),capacity(g));assert.equal(buy(g,0,1),false);assert.equal(g.cash,10000-26*23);
 g.paused=false;setPrice(g,0,1);
 while(g.stats.visitors<visitorCount(g)&&stockCount(g)===capacity(g))serve(g);
 assert.ok(stockCount(g)<capacity(g));assert.ok(buy(g,0,1));
 for(const qty of [0,-1,1.1,NaN,Infinity])assert.equal(buy(g,0,qty),false);
 finishDay(g);assert.equal(buy(g,0,1),false);
});

test('midday restocking conserves cash and lot value throughout campaigns',()=>{
 for(let seed=1;seed<=40;seed++){
  const g=createGame(seed);const initial=g.cash;prepare(g,'balanced');setSpeed(g,3);startDay(g);
  for(let step=0;step<15;step++){
   tick(g,1);
   if(g.phase==='sales')for(let i=0;i<6;i++)if(g.stock[i].qty<1&&g.cash>=purchaseCost(g,i)+rentFor(g.day))buy(g,i,1);
   assert.equal(stockValue(g)+g.stats.cogs,g.stats.procurement);
  }
  assert.equal(g.phase,'summary');assert.equal(g.cash,initial-g.stats.procurement+g.stats.revenue-g.stats.rent);assert.ok(g.stock.every(s=>s.qty>=0));
 }
});

test('early closing charges full rent and upgrades without inventing customers or sales',()=>{
 const g=createGame(19);g.cash=500;g.stats.startCash=500;
 // Keep an unsold, overpriced item to check that closing does not liquidate it.
 assert.ok(upgrade(g,'ads'));buy(g,0,1);setPrice(g,0,9999);startDay(g);tick(g,6);g.paused=true;
 const cash=g.cash,visits=structuredClone(g.visits),seed=g.seed,stock=structuredClone(g.stock),revenue=g.stats.revenue,lost=g.stats.lost;
 assert.ok(g.stats.visitors<visitorCount(g));assert.ok(finishDay(g));
 assert.equal(g.cash,cash-rentFor(1));assert.equal(g.stats.revenue,revenue);assert.equal(g.stats.lost,lost);assert.deepEqual(g.visits,visits);assert.deepEqual(g.stock,stock);assert.equal(g.seed,seed);
 assert.equal(g.history.length,1);assert.equal(g.stats.upgrades,85);assert.equal(g.stats.rent,rentFor(1));assert.equal(finishDay(g),false);tick(g,100);assert.equal(g.history.length,1);
});

test('early closing can lose or win and the next day retains stocks, cash and speed',()=>{
 const empty=createGame(1);empty.cash=0;startDay(empty);finishDay(empty);assert.equal(empty.phase,'lost');assert.equal(empty.cash,-rentFor(1));
 for(const [cash,result] of [[1026,'won'],[1025,'lost']] as const){const g=createGame(1);g.day=7;g.cash=cash;startDay(g);finishDay(g);assert.equal(g.phase,result);}
 const g=createGame(5);buy(g,0,2);setSpeed(g,3);startDay(g);finishDay(g);const cash=g.cash,value=stockValue(g);assert.ok(nextDay(g));
 assert.equal(g.day,2);assert.equal(g.phase,'prep');assert.equal(g.elapsed,0);assert.equal(g.speed,3);assert.equal(g.cash,cash);assert.equal(stockValue(g),value);assert.equal(g.stats.procurement,0);assert.equal(purchaseCost(g,0),g.costs[0]);
});

test('new saves preserve speed, paused trading progress, quotes and urgent lot costs',()=>{
 const g=createGame(6);prepare(g,'balanced');setSpeed(g,3);startDay(g);tick(g,4);buy(g,0,1);g.paused=true;
 const loaded=deserialize(serialize(g))!;assert.ok(loaded);assert.deepEqual(loaded,g);tick(loaded,20);assert.deepEqual(loaded,g);
 g.paused=false;loaded.paused=false;tick(g,20);tick(loaded,20);assert.deepEqual(loaded,g);
});

test('legacy 90-second saves migrate once, preserving percentage, money, inventory and visitors',()=>{
 const control=createGame(31);prepare(control,'balanced');startDay(control);tick(control,30);
 const old=JSON.parse(serialize(control));old.version=1;delete old.speed;old.elapsed=60;
 const migrated=deserialize(JSON.stringify(old))!;assert.ok(migrated);assert.equal(migrated.version,2);assert.equal(migrated.speed,1);assert.equal(migrated.elapsed,30);
 assert.equal(migrated.cash,control.cash);assert.deepEqual(migrated.stock,control.stock);assert.deepEqual(migrated.visits,control.visits);
 assert.equal(deserialize(serialize(migrated))!.elapsed,30);
 tick(migrated,15);tick(control,15);assert.deepEqual(migrated,control);
});

test('legacy completed and preparation saves remain usable while corrupt timers/speeds are rejected',()=>{
 for(const phase of ['prep','summary'] as const){const g=createGame(3);if(phase==='summary'){startDay(g);tick(g,45);}const old=JSON.parse(serialize(g));old.version=1;delete old.speed;old.elapsed=phase==='summary'?90:0;const restored=deserialize(JSON.stringify(old))!;assert.ok(restored);assert.equal(restored.phase,phase);assert.deepEqual(restored.history,g.history);if(phase==='summary')assert.ok(nextDay(restored));}
 const modern=createGame(1);
 for(const speed of [0,4,1.5,'2',null])assert.equal(deserialize(JSON.stringify({...modern,speed})),null);
 const missing=JSON.parse(serialize(modern));delete missing.speed;assert.equal(deserialize(JSON.stringify(missing)),null);
 assert.equal(deserialize(JSON.stringify({...modern,elapsed:46})),null);
 assert.equal(deserialize(JSON.stringify({...modern,version:1,elapsed:91})),null);
});
