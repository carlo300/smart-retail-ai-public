import {createFileRoute} from '@tanstack/react-router';
import {bindings} from '../../lib/bindings.server';

type Customer={id:string;first_name:string;email:string;favorite_product:string;marketing_opt_in:number;coupon_code:string;coupon_redeemed_at:string|null;redeemed_product:string|null;created_at:string;last_seen_at:string;visit_count:number};
const COOKIE='srai_rewards_session';
const PRODUCTS=['bloom','aura','rush','vivi'];
const HEADERS={'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
function reply(obj:unknown,status=200,extra:Record<string,string>={}){return new Response(JSON.stringify(obj),{status,headers:{...HEADERS,...extra}});}
function rawSession(req:Request){const part=(req.headers.get('cookie')||'').split(';').map(s=>s.trim()).find(s=>s.startsWith(COOKIE+'='));const token=part?.slice(COOKIE.length+1);return token&&/^[A-Za-z0-9_-]{40,64}$/.test(token)?token:null;}
function newToken(){const bytes=new Uint8Array(32);crypto.getRandomValues(bytes);return btoa(String.fromCharCode(...bytes)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');}
async function digest(token:string){const h=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token));return Array.from(new Uint8Array(h)).map(b=>b.toString(16).padStart(2,'0')).join('');}
function setSession(token:string,age=7776000){return COOKIE+'='+token+'; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age='+age;}
function view(u:Customer){return {id:u.id,firstName:u.first_name,email:u.email,favorite:u.favorite_product,marketingOptIn:!!u.marketing_opt_in,couponCode:u.coupon_code,couponUsed:!!u.coupon_redeemed_at,redeemedProduct:u.redeemed_product,visits:u.visit_count,joinedAt:u.created_at};}
async function current(req:Request,db:NonNullable<ReturnType<typeof bindings>['DB']>){const token=rawSession(req);return token?db.prepare('SELECT * FROM rewards_customers WHERE session_hash=?').bind(await digest(token)).first<Customer>():null;}
export const Route=createFileRoute('/api/rewards')({server:{handlers:{
 GET:async({request})=>{const db=bindings().DB;if(!db)return reply({error:'Rewards database unavailable'},503);try{const user=await current(request,db);if(!user)return reply({profile:null});const parsed=Date.parse(user.last_seen_at.replace(' ','T')+'Z');if(Number.isFinite(parsed)&&Date.now()-parsed>20*60*1000){await db.prepare("UPDATE rewards_customers SET last_seen_at=datetime('now'),visit_count=visit_count+1 WHERE id=?").bind(user.id).run();user.visit_count++;}return reply({profile:view(user)});}catch{return reply({error:'Unable to load profile'},500);}},
 POST:async({request})=>{
  const db=bindings().DB;if(!db)return reply({error:'Rewards database unavailable'},503);
  if(request.headers.get('origin')!==new URL(request.url).origin)return reply({error:'Invalid origin'},403);
  if(!(request.headers.get('content-type')||'').startsWith('application/json'))return reply({error:'Invalid format'},400);
  if(Number(request.headers.get('content-length')||0)>4096)return reply({error:'Request too large'},413);
  let data:Record<string,unknown>;try{const obj=await request.json();if(!obj||typeof obj!=='object'||Array.isArray(obj))throw Error();data=obj as Record<string,unknown>;}catch{return reply({error:'Invalid request'},400);}
  if(data.action==='register'){
   const firstName=typeof data.firstName==='string'?data.firstName.trim():'';
   const email=typeof data.email==='string'?data.email.trim().toLowerCase():'';
   const favorite=typeof data.favorite==='string'?data.favorite:'';
   if(!firstName||firstName.length>70||email.length>190||!(/^[^\s@]+@[^\s@]+\.[^\s@]+$/).test(email)||data.adultConfirmed!==true||!['',...PRODUCTS].includes(favorite))return reply({error:'Please provide a valid name, email, and confirm you are an adult.'},400);
   try{
    const existing=await current(request,db);if(existing)return reply({profile:view(existing)});
    const token=newToken(),id=crypto.randomUUID(),code='SRAI-'+crypto.randomUUID().replace(/-/g,'').slice(0,10).toUpperCase();
    await db.prepare('INSERT INTO rewards_customers (id,first_name,email,favorite_product,marketing_opt_in,session_hash,coupon_code) VALUES (?,?,?,?,?,?,?)').bind(id,firstName,email,favorite,data.marketingOptIn===true?1:0,await digest(token),code).run();
    const user=await db.prepare('SELECT * FROM rewards_customers WHERE id=?').bind(id).first<Customer>();
    if(!user)return reply({error:'Unable to register'},500);
    return reply({profile:view(user)},201,{'Set-Cookie':setSession(token)});
   }catch(e){if(/UNIQUE|constraint/i.test(String(e)))return reply({error:'This email is already registered. For this demo, return using the original phone/browser; account recovery is not available yet.'},409);return reply({error:'Registration unavailable'},500);}
  }
  const user=await current(request,db);if(!user)return reply({error:'Please register first on this device.'},401);
  if(data.action==='redeem'){
   const product=typeof data.product==='string'?data.product:'';if(!PRODUCTS.includes(product))return reply({error:'Choose a valid product'},400);
   try{const result=await db.prepare("UPDATE rewards_customers SET coupon_redeemed_at=datetime('now'),redeemed_product=? WHERE id=? AND coupon_redeemed_at IS NULL").bind(product,user.id).run();const fresh=await db.prepare('SELECT * FROM rewards_customers WHERE id=?').bind(user.id).first<Customer>();return reply({profile:fresh?view(fresh):null,redeemed:result.meta.changes===1});}catch{return reply({error:'Unable to redeem coupon'},500);}
  }
  if(data.action==='preferences'){
   const favorite=typeof data.favorite==='string'?data.favorite:'';if(!['',...PRODUCTS].includes(favorite)||typeof data.marketingOptIn!=='boolean')return reply({error:'Invalid preferences'},400);
   try{await db.prepare('UPDATE rewards_customers SET favorite_product=?,marketing_opt_in=? WHERE id=?').bind(favorite,data.marketingOptIn?1:0,user.id).run();const fresh=await db.prepare('SELECT * FROM rewards_customers WHERE id=?').bind(user.id).first<Customer>();return reply({profile:fresh?view(fresh):null});}catch{return reply({error:'Unable to save preferences'},500);}
  }
  if(data.action==='delete'){
   try{await db.prepare('DELETE FROM rewards_customers WHERE id=?').bind(user.id).run();return reply({profile:null,deleted:true},200,{'Set-Cookie':setSession('',0)});}catch{return reply({error:'Unable to delete account'},500);}
  }
  return reply({error:'Unknown action'},400);
 }
}}});
