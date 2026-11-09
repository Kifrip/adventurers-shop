import test from 'node:test';
import assert from 'node:assert/strict';
import {translate} from '../src/i18n';
import {GOODS,EVENTS,UPGRADES,CUSTOMERS,createGame,eventDescription,serialize} from '../src/game';
const russian=/[а-яё]/i;
test('catalog covers all goods, upgrades, customer types and daily event descriptions',()=>{
 for(const item of [...GOODS,...UPGRADES,...CUSTOMERS,...EVENTS])assert.equal(russian.test(translate(item.name,'en')),false,item.name);
 const g=createGame(12);
 for(let event=0;event<EVENTS.length;event++){g.event=event;g.demand=GOODS.map(x=>EVENTS[event].demand[x.id]??1);assert.equal(russian.test(translate(eventDescription(g),'en')),false,eventDescription(g));}
});
test('localization preserves numbers and saved customer outcomes',()=>{
 const g=createGame(3),before=serialize(g);
 assert.equal(translate('Дорого: рынок 28 з., у вас 40 з.','en'),'Too expensive: market 28 g, your price 40 g');
 assert.equal(translate('Цена: Зелье здоровья','en'),'Price: Health potion');
 assert.equal(serialize(g),before);
});
test('Russian and unknown strings remain unchanged',()=>{
 const text='Срочная закупка: 23 з.';assert.equal(translate(text,'ru'),text);
 assert.equal(translate('1× / 2× / 3× +15%','en'),'1× / 2× / 3× +15%');
});
