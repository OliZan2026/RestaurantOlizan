import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {stripTypeScriptTypes} from 'node:module';
import {customerDisabled} from '../netlify/lib/customer-disabled.mts';

const cookie='olizan_client=old-session; olizan_admin=admin-session';
test('retired login, registration and account handlers do not load database auth',async()=>{
 for(const file of ['auth','account']){
  let src=await readFile(new URL('../netlify/functions/'+file+'.mts',import.meta.url),'utf8');
  assert.doesNotMatch(src,/clientDinCerere|db\.|creeazaSesiune|verifyPassword/);
  src=src.replace(/^import .*;$/gm,'').replace(/export const config[\s\S]*$/,'');
  const handler=new Function('customerDisabled',stripTypeScriptTypes(src).replace('export default','return'))(customerDisabled);
  for(const action of ['login','register','forgot-password','reset-password','logout','profil','adrese','comenzi','cos']){
   for(const method of ['GET','POST','PUT','DELETE']){
    const req=new Request('https://www.restaurantolizan.ro/api/'+file+'/'+action,{method,headers:{cookie}});
    const res=await handler(req,{params:{actiune:action,resursa:action}});
    assert.equal(res.status,410);
    assert.match(res.headers.get('set-cookie'),/^olizan_client=;.*Max-Age=0/);
    assert.doesNotMatch(res.headers.get('set-cookie'),/olizan_admin/);
    assert.equal(res.headers.get('cache-control'),'no-store');
   }
  }
  if(file==='auth'){
   const res=await handler(new Request('https://www.restaurantolizan.ro/api/auth/me',{headers:{cookie}}),{params:{actiune:'me'}});
   assert.deepEqual(await res.json(),{autentificat:false,client:null});
  }
 }
});
test('guest order ignores former customer session and recalculates prices',async()=>{
 let src=await readFile(new URL('../netlify/functions/orders.mts',import.meta.url),'utf8');
 assert.doesNotMatch(src,/clientDinCerere|salveazaAdresa/);
 src=src.replace(/^import .*;$/gm,'').replace(/export const config[\s\S]*$/,'');
 const recorded=[];
 const db={select:()=>({from:()=>({where:async()=>[{id:'pizza',active:true,withSizes:false,price:'35.00',name:'Pizza',weight:'400 g',categoryId:'pizza'}]})}),insert:table=>({values:value=>{recorded.push({table,value});return {returning:async()=>[{id:123,createdAt:'2026-09-19'}]};}})};
 const deps={db,menuItems:{id:'id'},orderItems:'items',orders:'orders',inArray:()=>true,taxaAmbalajBani:()=>200,numarAfisat:n=>String(n).padStart(2,'0'),rezervaNumarZilnic:async()=>({zi:'2026-09-19',numar:4}),asiguraMeniu:async()=>{},corpJson:req=>req.json(),eroare:(message,status=400)=>new Response(JSON.stringify({eroare:message}),{status}),json:(body,init)=>new Response(JSON.stringify(body),init),origineValida:()=>true,text:(x,n)=>String(x||'').slice(0,n),stareComenzi:async()=>({blocat:false})};
 const handler=new Function(...Object.keys(deps),stripTypeScriptTypes(src).replace('export default','return'))(...Object.values(deps));
 const res=await handler(new Request('https://www.restaurantolizan.ro/api/orders',{method:'POST',headers:{cookie,'content-type':'application/json'},body:JSON.stringify({nume:'Test local',telefon:'0700000000',modalitate:'livrare',adresa:'Adresă test local',linii:[{id:'pizza',cant:2,pret:1}],customerId:99,salveazaAdresa:true})}));
 assert.equal(res.status,201);
 assert.equal((await res.json()).comanda.total,74);
 assert.equal(recorded[0].value.customerId,null);
 assert.equal(recorded[0].value.email,'');
 assert.deepEqual(recorded.map(x=>x.table),['orders','items']);
 const invalid=await handler(new Request('https://www.restaurantolizan.ro/api/orders',{method:'POST',body:JSON.stringify({linii:[{id:'pizza',cant:1}],nume:'Test',telefon:'0700000000',modalitate:'livrare'})}));
 assert.equal(invalid.status,400);
 assert.equal(recorded.length,2);
});
