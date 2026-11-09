import english from './en.json';
export type Language='ru'|'en';
const KEY='adventurers-shop-language';
let language:Language='ru';
try{if(localStorage.getItem(KEY)==='en')language='en';}catch{ /* Storage is optional. */ }
export const getLanguage=()=>language;
export function setLanguage(value:Language){language=value;try{localStorage.setItem(KEY,value);}catch{ /* Keep session preference. */ }}
const translations:Record<string,string>=english;
const pattern=new RegExp(Object.keys(translations).sort((a,b)=>b.length-a.length).map(s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|'),'g');
/** Translate presentation only; saved names and customer reasons remain compatible. */
export function translate(value:string,locale:Language=language):string{return locale==='en'?value.replace(pattern,key=>translations[key]):value;}
const originals=new WeakMap<Node,Map<string,{source:string;rendered:string}>>();
export function localize(root:HTMLElement){
 const update=(node:Node,key:string,value:string,set:(text:string)=>void)=>{
  let fields=originals.get(node);if(!fields){fields=new Map();originals.set(node,fields);}
  const old=fields.get(key),source=old?.rendered===value?old.source:value,rendered=translate(source);
  if(value!==rendered)set(rendered);fields.set(key,{source,rendered});
 };
 const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);let node:Node|null;
 while((node=walker.nextNode())){const text=node;update(text,'text',text.nodeValue??'',value=>{text.nodeValue=value;});}
 for(const el of [root,...Array.from(root.querySelectorAll<HTMLElement>('[title],[aria-label],[data-label]'))])for(const key of ['title','aria-label','data-label']){
  const value=el.getAttribute(key);if(value!==null)update(el,key,value,text=>el.setAttribute(key,text));
 }
 document.documentElement.lang=language;document.title=language==='en'?'Adventurer’s Shop — seven days to a dream':'Лавка приключенца — семь дней до мечты';
 const toggle=root.querySelector<HTMLButtonElement>('[data-action="language"]');if(toggle){toggle.textContent=language==='ru'?'EN':'RU';toggle.setAttribute('aria-label',language==='ru'?'Switch to English':'Switch to Russian');}
}
