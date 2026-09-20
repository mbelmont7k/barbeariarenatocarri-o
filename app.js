/* Barbearia Renato Carrico - sistema completo v2 */
const KEY='br_renato_v2';
const $=s=>document.querySelector(s);
const $$=s=>[...document.querySelectorAll(s)];
const uid=p=>(p||'id')+Date.now().toString(36)+Math.floor(Math.random()*999);
const onlyDigits=s=>(s||'').replace(/\D/g,'');
const money=v=>Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const pad=n=>String(n).padStart(2,'0');
const iso=d=>d.toISOString().slice(0,10);
const todayISO=()=>{const d=new Date();return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());};
const addDays=(base,n)=>{const d=new Date(base+'T12:00:00');d.setDate(d.getDate()+n);return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());};
const WD=['DOM','SEG','TER','QUA','QUI','SEX','SAB'];
const WDF=['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'];
const toMin=t=>{const[a,b]=(t||'00:00').split(':').map(Number);return a*60+b;};
const toHM=m=>pad(Math.floor(m/60))+':'+pad(m%60);
const hashSim=s=>btoa(unescape(encodeURIComponent('::RENATO::'+s))).split('').reverse().join('');
function toast(m){const t=$('#toast');t.textContent=m;t.hidden=false;clearTimeout(t._x);t._x=setTimeout(()=>t.hidden=true,2800);}
let CF_CB=null;
function confirmDlg(title,msg,extraHTML,onOk){$('#cfTitle').textContent=title;$('#cfMsg').textContent=msg;$('#cfExtra').innerHTML=extraHTML||'';$('#confirmModal').hidden=false;CF_CB=onOk;}
$('#cfNo').onclick=()=>{$('#confirmModal').hidden=true;CF_CB=null;};
$('#cfOk').onclick=()=>{const need=$('#cfExtra input');if(need&&need.dataset.need&&need.value!==need.dataset.need){toast('Digite '+need.dataset.need);return;}$('#confirmModal').hidden=true;if(CF_CB)CF_CB();CF_CB=null;};
function maskPhone(v){v=onlyDigits(v).slice(0,11);if(v.length<=10)return v.replace(/(\d{2})(\d{4})(\d{0,4})/,'($1) $2-$3');return v.replace(/(\d{2})(\d{5})(\d{0,4})/,'($1) $2-$3');}

function seed(){return{
 site:{shopName:'RENATO CARRIÇO • BARBEARIA',heroPhrase:'Estilo, precisão e café.',heroDesc:'Corte, barba e cuidado — Anchieta / ES.',bookTitle:'Agende seu horário',bookSub:'Só nome e WhatsApp. Em 30 segundos.',msgSuccess:'Agendamento confirmado!',cBege:'#E8DCC6',cGold:'#C9A86A',cBg:'#0A0A0A'},
 images:{logo:'',cover:'',gallery:[]},
 contacts:{address:'Av. Atilio Rauta, 783 — Anchieta / ES',mapsUrl:'https://www.google.com/maps/search/?api=1&query=Av.+Atilio+Rauta+783+Anchieta+ES',socialUrl:'https://instagram.com/',whatsapp:'27999137277'},
 hours:{days:[
  {open:false,periods:[{s:'08:30',e:'12:00'},{s:'13:20',e:'20:30'}],lunch:{on:true,start:'12:00',end:'13:00'}},
  {open:true,periods:[{s:'08:30',e:'12:00'},{s:'13:20',e:'20:30'}],lunch:{on:true,start:'12:00',end:'13:00'}},
  {open:true,periods:[{s:'08:30',e:'12:00'},{s:'13:20',e:'20:30'}],lunch:{on:true,start:'12:00',end:'13:00'}},
  {open:true,periods:[{s:'08:30',e:'12:00'},{s:'13:20',e:'20:30'}],lunch:{on:true,start:'12:00',end:'13:00'}},
  {open:true,periods:[{s:'08:30',e:'12:00'},{s:'13:20',e:'20:30'}],lunch:{on:true,start:'12:00',end:'13:00'}},
  {open:true,periods:[{s:'08:30',e:'12:00'},{s:'13:20',e:'20:30'}],lunch:{on:true,start:'12:00',end:'13:00'}},
  {open:true,periods:[{s:'08:30',e:'12:00'},{s:'13:20',e:'18:00'}],lunch:{on:true,start:'12:00',end:'13:00'}} ]},
 services:[
  {id:'s1',name:'Corte Degradê',desc:'Máquina + tesoura, finalização.',duration:30,price:50,gap:0,active:true,photo:''},
  {id:'s2',name:'Corte + Barba',desc:'Combo toalha quente + navalha.',duration:60,price:80,gap:0,active:true,photo:''},
  {id:'s3',name:'Barba Navalha',desc:'Contorno e hidratação.',duration:30,price:35,gap:0,active:true,photo:''}],
 appointments:[],blocks:[],
 automation:{enabled:true,time:'07:30',ownerPhone:'5528999137277',template:'🔔 LEMBRETE — Barbearia Renato Carriço\n📅 {{data}} {{horario}}\n👤 {{nomeCliente}} {{telefoneCliente}}\n💈 {{servico}} com {{barbeiro}} — {{valor}}',lastSentAt:'',logs:[],contacted:{}},
 security:{users:[{id:'u1',name:'Super Admin',email:'admin@barbearia.com',passHash:hashSim('admin123'),role:'Super Admin',active:true,perms:['all'],lastAccess:null}],currentId:null,logs:[],sessions:[],autoLogoutMin:30,attempts:0,lockUntil:0,fa:false}
};}
function load(){try{const d=JSON.parse(localStorage.getItem(KEY));if(d&&d.site&&d.services)return d;}catch(e){}const d=seed();localStorage.setItem(KEY,JSON.stringify(d));return d;}
function save(){localStorage.setItem(KEY,JSON.stringify(DB));cloudPush();}
let DB=load();
/* ===== NUVEM Supabase (multi-aparelhos) ===== */
function cloudCfg(){try{const s=JSON.parse(localStorage.getItem('br_cloud')||'{}');return{url:s.url||window.SUPABASE_URL||'',key:s.key||window.SUPABASE_ANON_KEY||''};}catch(e){return{url:window.SUPABASE_URL||'',key:window.SUPABASE_ANON_KEY||''};}}
function cloudOn(){const c=cloudCfg();return !!(c.url&&c.key);}
async function sb(path,method,body){const c=cloudCfg();const r=await fetch(c.url+'/rest/v1/'+path,{method:method||'GET',headers:{apikey:c.key,Authorization:'Bearer '+c.key,'Content-Type':'application/json',Prefer:method==='POST'?'return=representation':undefined},body:body?JSON.stringify(body):undefined});if(!r.ok)throw new Error('Supabase '+r.status);return method==='GET'?r.json():r.json().catch(()=>[]);}
let _pushT=null;
async function cloudPush(){if(!cloudOn())return;clearTimeout(_pushT);_pushT=setTimeout(async()=>{
 try{
  const main={site:DB.site,images:{logo:DB.images.logo,cover:DB.images.cover,gallery:(DB.images.gallery||[]).slice(0,20)},contacts:DB.contacts,hours:DB.hours,services:DB.services,automation:DB.automation,security:{users:DB.security.users,autoLogoutMin:DB.security.autoLogoutMin}};
  await sb('store?id=eq.main','PATCH',{data:main});
  setCloudBadge('nuvem ok');
 }catch(e){setCloudBadge('nuvem falha');}
},800);}
async function cloudPull(){if(!cloudOn())return false;try{
 const s=await sb('store?id=eq.main&select=data');const remote=s[0]?.data;
 const ap=await sb('appointments?select=*&order=date.asc,time.asc&limit=2000');
 const bl=await sb('blocks?select=*&limit=500');
 if(remote&&remote.site){const localAppts=DB.appointments,localBlks=DB.blocks;
  DB.site=remote.site;DB.contacts=remote.contacts||DB.contacts;DB.hours=remote.hours||DB.hours;DB.services=remote.services||DB.services;DB.automation=remote.automation||DB.automation;
  if(remote.images)DB.images=Object.assign(DB.images,remote.images);
  if(remote.security)DB.security.users=remote.security.users||DB.security.users;
  DB.appointments=(ap||[]).map(r=>({id:r.id,client:r.client,phone:r.phone,serviceId:r.service_id,barber:r.barber,date:r.date,time:r.time,end:r.end_time,note:r.note,status:r.status,createdAt:r.created_at}));
  DB.blocks=(bl||[]).map(r=>({id:r.id,date:r.date,start:r.start_time,end:r.end_time,reason:r.reason}));
  if(!DB.appointments.length&&localAppts.length){for(const a of localAppts)await cloudUpsertAppt(a);}
  localStorage.setItem(KEY,JSON.stringify(DB));
  return true;
 }return false;}catch(e){return false;}}
async function cloudUpsertAppt(a){const s=DB.services.find(x=>x.id===a.serviceId);await sb('appointments','POST',{id:a.id,client:a.client,phone:a.phone,service_id:a.serviceId,service_name:s?.name||'',price:s?.price||0,barber:a.barber||'Renato Carriço',date:a.date,time:a.time,end_time:a.end||'',note:a.note||'',status:a.status}).catch(()=>sb('appointments?id=eq.'+a.id,'PATCH',{client:a.client,phone:a.phone,service_id:a.serviceId,status:a.status,date:a.date,time:a.time,end_time:a.end,note:a.note||''}));}
async function cloudDeleteAppt(id){if(!cloudOn())return;await fetch(cloudCfg().url+'/rest/v1/appointments?id=eq.'+id,{method:'DELETE',headers:{apikey:cloudCfg().key,Authorization:'Bearer '+cloudCfg().key}}).catch(()=>{});}
function setCloudBadge(t){const e=$('#cloudBadge');if(e)e.textContent=t||(cloudOn()?'nuvem on':'modo local');}
function slog(action,status){DB.security.logs.unshift({at:new Date().toLocaleString('pt-BR'),user:curAdmin()?.email||'public',action,ip:'local',status:status||'ok'});DB.security.logs=DB.security.logs.slice(0,200);save();}
function curAdmin(){return DB.security.users.find(u=>u.id===DB.security.currentId)||null;}

/* ---------- PUBLIC ---------- */
let BK={step:0,name:'',phone:'',serviceId:'',date:'',time:''};
const STEPS=['Você','Serviço','Dia','Hora','Confirma'];
function applyTheme(){document.documentElement.style.setProperty('--bege',DB.site.cBege);document.documentElement.style.setProperty('--gold',DB.site.cGold);document.documentElement.style.setProperty('--bg',DB.site.cBg);}
function renderPublicBase(){
 applyTheme();
 $('#shopName').textContent=DB.site.shopName;$('#heroPhrase').textContent=DB.site.heroPhrase;$('#heroDesc').textContent=DB.site.heroDesc;
 $('#bookTitle').textContent=DB.site.bookTitle;$('#bookSub').textContent=DB.site.bookSub;
 $('#addrText').textContent=DB.contacts.address;$('#foot').textContent='© '+DB.site.shopName;
 const lw=$('#logoWrap');
 if(DB.images.logo){lw.innerHTML=`<img class="logo" src="${DB.images.logo}" alt="logo">`;}
 else{lw.innerHTML=`<div class="logo-fallback">R</div><div style="font-size:11px;color:var(--mut)">Coloque logo.png na pasta ou envie no Admin → Imagens</div>`;}
 const t=new Date();const cfg=DB.hours.days[t.getDay()];
 $('#todayHours').innerHTML=cfg.open?cfg.periods.map(p=>`${p.s}–${p.e}`).join(' / '):'Fechado hoje';
 $('#weekFull').innerHTML=DB.hours.days.map((d,i)=>`${WDF[i]}: ${d.open?d.periods.map(p=>p.s+'-'+p.e).join(' / '):'Fechado'}`).join('<br>');
}
$('#weekBtn').onclick=()=>{const e=$('#weekFull');e.style.display=e.style.display==='none'?'block':'none';};
$('#mapBox').onclick=()=>window.open(DB.contacts.mapsUrl,'_blank');
$('#routeBtn').onclick=()=>window.open(DB.contacts.mapsUrl,'_blank');
$('#socialBtn').onclick=()=>window.open(DB.contacts.socialUrl,'_blank');

function renderStepper(){$('#stepper').innerHTML=STEPS.map((s,i)=>`<div class="${i<=BK.step?'on':''}"><span></span>${s}</div>`).join('');}
function renderStep(){
 renderStepper();
 const b=$('#stepBody');
 if(BK.step===0){b.innerHTML=`<label class="f">NOME COMPLETO</label><input class="in" id="bkName" placeholder="Ex João Silva" value="${BK.name}"><label class="f">WHATSAPP</label><input class="in" id="bkPhone" placeholder="(27) 99999-9999" value="${BK.phone}"><div class="err" id="bkErr"></div><div style="height:12px"></div><button class="btn btn-bege" id="bkNext">CONTINUAR</button>`;
  const ph=$('#bkPhone');ph.addEventListener('input',()=>ph.value=maskPhone(ph.value));
  $('#bkNext').onclick=()=>{BK.name=$('#bkName').value.trim();BK.phone=$('#bkPhone').value;const d=onlyDigits(BK.phone);
   if(BK.name.length<3){$('#bkErr').textContent='Digite seu nome completo (mín. 3 letras).';return;}
   if(d.length<10){$('#bkErr').textContent='WhatsApp inválido. Ex: (27) 99999-9999';return;}
   BK.step=1;renderStep();};}
 if(BK.step===1){const act=DB.services.filter(s=>s.active);
  b.innerHTML=`<div class="svc-list">${act.map(s=>`<button class="svc-card ${BK.serviceId===s.id?'sel':''}" data-id="${s.id}">${s.photo?`<img src="${s.photo}">`:`<img src="" style="display:none">`}<span><b>${s.name}</b><small>${s.duration} min • ${money(s.price)}</small><br><small>${s.desc||''}</small></span></button>`).join('')||'Nenhum serviço ativo.'}</div><div style="height:12px"></div><div class="row"><button class="btn btn-ghost" id="bkBack">Voltar</button><button class="btn btn-bege" id="bkNext2">CONTINUAR</button></div><div class="err" id="bkErr"></div>`;
  $$('.svc-card').forEach(c=>c.onclick=()=>{BK.serviceId=c.dataset.id;renderStep();});
  $('#bkBack').onclick=()=>{BK.step=0;renderStep();};
  $('#bkNext2').onclick=()=>{if(!BK.serviceId){$('#bkErr').textContent='Escolha um serviço.';return;}BK.step=2;renderStep();};}
 if(BK.step===2){let h='';for(let i=0;i<30;i++){const dt=addDays(todayISO(),i);const d=new Date(dt+'T12:00:00');const cfg=DB.hours.days[d.getDay()];const open=cfg.open;
   h+=`<button ${open?'':'disabled'} data-d="${dt}" class="${BK.date===dt?'sel':''}"><b>${pad(d.getDate())}/${pad(d.getMonth()+1)}</b><small>${WD[d.getDay()]}${open?'':' • fechado'}</small></button>`;}
  b.innerHTML=`<div class="cal">${h}</div><div style="height:12px"></div><div class="row"><button class="btn btn-ghost" id="bkBack">Voltar</button></div>`;
  $$('#stepBody .cal button').forEach(x=>x.onclick=()=>{BK.date=x.dataset.d;BK.time='';BK.step=3;renderStep();});
  $('#bkBack').onclick=()=>{BK.step=1;renderStep();};}
 if(BK.step===3){const svc=DB.services.find(s=>s.id===BK.serviceId);const slots=calculateAvailability(BK.date,svc.duration);
  b.innerHTML=`<p style="color:var(--mut);font-size:13px">${BK.date} • ${svc.name} (${svc.duration}min)</p><div class="hour-grid">${slots.map(t=>`<button data-t="${t}" class="${BK.time===t?'sel':''}">${t}</button>`).join('')||'<small>Nenhum horário livre neste dia.</small>'}</div><div style="height:12px"></div><div class="row"><button class="btn btn-ghost" id="bkBack">Voltar</button><button class="btn btn-bege" id="bkNext3">CONTINUAR</button></div><div class="err" id="bkErr"></div>`;
  $$('#stepBody .hour-grid button').forEach(x=>x.onclick=()=>{BK.time=x.dataset.t;renderStep();});
  $('#bkBack').onclick=()=>{BK.step=2;renderStep();};
  $('#bkNext3').onclick=()=>{if(!BK.time){$('#bkErr').textContent='Escolha a hora.';return;}BK.step=4;renderStep();};}
 if(BK.step===4){const svc=DB.services.find(s=>s.id===BK.serviceId);
  // nunca confiar preço frontend: recalcula aqui
  const price=Number(DB.services.find(s=>s.id===BK.serviceId)?.price||0);
  b.innerHTML=`<div class="summary"><b>Resumo</b><br>👤 ${BK.name} • ${BK.phone}<br>💈 ${svc.name} — ${money(price)}<br>📅 ${BK.date} às ${BK.time}<br>📍 ${DB.contacts.address}</div><div class="row"><button class="btn btn-ghost" id="bkBack">Voltar</button><button class="btn btn-bege" id="bkOk">CONFIRMAR</button></div><div class="err" id="bkErr"></div>`;
  $('#bkBack').onclick=()=>{BK.step=3;renderStep();};
  $('#bkOk').onclick=async()=>{
   await cloudPull();renderPublicBase();
   const slots=calculateAvailability(BK.date,svc.duration);
   if(!slots.includes(BK.time)){$('#bkErr').textContent='Esse horário acabou de ser ocupado. Escolha outro.';return;}
   if(DB.appointments.some(a=>a.phone===onlyDigits(BK.phone)&&a.date===BK.date&&a.time===BK.time&&a.status!=='cancelado')){$('#bkErr').textContent='Você já tem reserva neste horário.';return;}
   const nap={id:uid('a'),client:BK.name,phone:onlyDigits(BK.phone),serviceId:svc.id,barber:'Renato Carriço',date:BK.date,time:BK.time,end:toHM(toMin(BK.time)+svc.duration),note:'',status:'confirmado',createdAt:new Date().toISOString()};
   DB.appointments.push(nap);
   save();slog('Nova reserva pública '+BK.name+' '+BK.date+' '+BK.time);
   if(cloudOn()){try{await cloudUpsertAppt(nap);}catch(e){}}
   b.innerHTML=`<div class="summary">✅ <b>${DB.site.msgSuccess}</b><br>${svc.name} • ${BK.date} ${BK.time}<br>Chegue com 5 min de antecedência.</div><button class="btn btn-bege" onclick="location.reload()">FAZER OUTRO AGENDAMENTO</button>`;
   toast('Agendado!');
  };}
}
/* disponibilidade: considera duração, expediente, almoço 12-13, bloqueios, sobreposição */
function calculateAvailability(dateISO,dur){
 const d=new Date(dateISO+'T12:00:00');const cfg=DB.hours.days[d.getDay()];
 if(!cfg||!cfg.open)return[];
 DB=DB;const out=[];
 const res=DB.appointments.filter(a=>a.date===dateISO&&a.status!=='cancelado').map(a=>({s:toMin(a.time),e:toMin(a.end||toHM(toMin(a.time)+30))}));
 const blks=DB.blocks.filter(x=>x.date===dateISO).map(x=>({s:toMin(x.start),e:toMin(x.end)}));
 if(cfg.lunch&&cfg.lunch.on)blks.push({s:toMin(cfg.lunch.start||'12:00'),e:toMin(cfg.lunch.end||'13:00')});
 for(const p of cfg.periods){let cur=toMin(p.s);const end=toMin(p.e);
  while(cur+dur<=end){const sE=cur,eE=cur+dur;let busy=false;
   for(const r of res.concat(blks)){if(sE<r.e&&eE>r.s){busy=true;break;}}
   if(!busy){const t=toHM(sE);if(!(dateISO===todayISO()&&t<=pad(new Date().getHours())+':'+pad(new Date().getMinutes())))out.push(t);}
   cur+=30;}
 }
 return out;
}

/* ---------- ADMIN ---------- */
const TABS=['Página pública','Imagens','Links e contatos','Horários','Serviços','Agenda','Automações','Segurança'];
let curTab=0, agendaView='dia', agendaFilter='';
function openAdmin(){$('#adminModal').hidden=false;$('#admUser').textContent=curAdmin()?.email||'';renderSide();renderTab();}
function renderSide(){$('#sideBar').innerHTML=TABS.map((t,i)=>`<button class="${i===curTab?'active':''}" data-i="${i}">${i+1}. ${t}</button>`).join('');$$('#sideBar button').forEach(x=>x.onclick=()=>{curTab=Number(x.dataset.i);renderSide();renderTab();});}
function isURL(v){try{new URL(v);return true;}catch{return false;}}
function fileToBase64(f){return new Promise(r=>{const rd=new FileReader();rd.onload=()=>r(rd.result);rd.readAsDataURL(f);});}

function renderTab(){const b=$('#tabBody');
 if(curTab===0){b.innerHTML=`<h3>1. Página pública</h3><div class="kv"><div><label class="f">NOME LOJA</label><input class="in" id="a_shop" value="${DB.site.shopName}"></div><div><label class="f">FRASE SERIF</label><input class="in" id="a_phrase" value="${DB.site.heroPhrase}"></div></div><label class="f">DESCRIÇÃO</label><textarea class="in" id="a_desc">${DB.site.heroDesc}</textarea><div class="kv"><div><label class="f">TÍTULO FORM</label><input class="in" id="a_bt" value="${DB.site.bookTitle}"></div><div><label class="f">SUBTÍTULO</label><input class="in" id="a_bs" value="${DB.site.bookSub}"></div></div><label class="f">MSG SUCESSO</label><input class="in" id="a_msg" value="${DB.site.msgSuccess}"><div class="row"><label class="f">BEGE<input type="color" id="a_c1" value="${DB.site.cBege}"></label><label class="f">DOURADO<input type="color" id="a_c2" value="${DB.site.cGold}"></label><label class="f">FUNDO<input type="color" id="a_c3" value="${DB.site.cBg}"></label></div><div style="height:10px"></div><button class="btn btn-gold btn-sm" id="a_save">Salvar</button><div class="preview" id="a_prev"></div>`;
  const upd=()=>{$('#a_prev').innerHTML=`<div class="shop-name">${$('#a_shop').value}</div><div class="serif" style="font-size:28px">${$('#a_phrase').value}</div><small>${$('#a_desc').value}</small>`;};
  ['a_shop','a_phrase','a_desc'].forEach(id=>$('#'+id).addEventListener('input',upd));upd();
  $('#a_save').onclick=()=>{Object.assign(DB.site,{shopName:$('#a_shop').value,heroPhrase:$('#a_phrase').value,heroDesc:$('#a_desc').value,bookTitle:$('#a_bt').value,bookSub:$('#a_bs').value,msgSuccess:$('#a_msg').value,cBege:$('#a_c1').value,cGold:$('#a_c2').value,cBg:$('#a_c3').value});save();renderPublicBase();slog('Editou página pública');toast('Salvo + preview aplicado.');};}
 if(curTab===1){b.innerHTML=`<h3>2. Imagens (base64, preview 120px)</h3><label class="f">LOGO (160px topo)</label><input type="file" id="up_logo" accept="image/*"><div class="gal" id="pv_logo">${DB.images.logo?`<img src="${DB.images.logo}">`:''}</div><label class="f">GALERIA</label><input type="file" id="up_gal" accept="image/*" multiple><div class="gal">${DB.images.gallery.map((g,i)=>`<span style="position:relative"><img src="${g}"><br><button class="btn btn-ghost btn-sm" data-del="${i}">remover</button> <button class="btn btn-ghost btn-sm" data-up="${i}">◀</button><button class="btn btn-ghost btn-sm" data-dn="${i}">▶</button></span>`).join('')}</div>`;
  $('#up_logo').onchange=async e=>{const f=e.target.files[0];if(!f)return;DB.images.logo=await fileToBase64(f);save();renderPublicBase();renderTab();toast('Logo atualizada.');};
  $('#up_gal').onchange=async e=>{for(const f of e.target.files){DB.images.gallery.push(await fileToBase64(f));}save();renderTab();};
  $$('#tabBody [data-del]').forEach(x=>x.onclick=()=>confirmDlg('Remover imagem','Deseja remover?', '',()=>{DB.images.gallery.splice(Number(x.dataset.del),1);save();renderTab();}));
  $$('#tabBody [data-up]').forEach(x=>x.onclick=()=>{const i=Number(x.dataset.up);if(i>0){[DB.images.gallery[i-1],DB.images.gallery[i]]=[DB.images.gallery[i],DB.images.gallery[i-1]];save();renderTab();}});
  $$('#tabBody [data-dn]').forEach(x=>x.onclick=()=>{const i=Number(x.dataset.dn);if(i<DB.images.gallery.length-1){[DB.images.gallery[i+1],DB.images.gallery[i]]=[DB.images.gallery[i],DB.images.gallery[i+1]];save();renderTab();}});}
 if(curTab===2){b.innerHTML=`<h3>3. Links e contatos</h3><label class="f">ENDEREÇO</label><textarea class="in" id="c_addr">${DB.contacts.address}</textarea><label class="f">LINK MAPS (separado)</label><input class="in" id="c_maps" value="${DB.contacts.mapsUrl}"><label class="f">LINK REDE SOCIAL (separado)</label><input class="in" id="c_soc" value="${DB.contacts.socialUrl}"><label class="f">WHATSAPP</label><input class="in" id="c_zap" value="${DB.contacts.whatsapp}"><div class="err" id="c_err"></div><div class="row"><button class="btn btn-gold btn-sm" id="c_save">Salvar</button><button class="btn btn-ghost btn-sm" id="c_t1">Testar Maps</button><button class="btn btn-ghost btn-sm" id="c_t2">Testar perfil</button></div>`;
  $('#c_zap').addEventListener('input',e=>e.target.value=maskPhone(e.target.value));
  $('#c_save').onclick=()=>{const m=$('#c_maps').value,s=$('#c_soc').value;if(!isURL(m)||!isURL(s)){$('#c_err').textContent='Links inválidos. Use https://...';return;}DB.contacts={address:$('#c_addr').value,mapsUrl:m,socialUrl:s,whatsapp:$('#c_zap').value};save();renderPublicBase();slog('Editou contatos');toast('Links atualizados e refletidos.');};
  $('#c_t1').onclick=()=>window.open($('#c_maps').value,'_blank');$('#c_t2').onclick=()=>window.open($('#c_soc').value,'_blank');}
 if(curTab===3){b.innerHTML=`<h3>4. Horários</h3>${DB.hours.days.map((d,i)=>`<div style="border:1px solid var(--line);border-radius:10px;padding:10px;margin:8px 0"><b>${WDF[i]}</b> <label><input type="checkbox" data-open="${i}" ${d.open?'checked':''}> Aberto</label> ${d.periods.map((p,j)=>`<div class="row"><input type="time" data-ps="${i}-${j}" value="${p.s}"><input type="time" data-pe="${i}-${j}" value="${p.e}"><button class="btn btn-ghost btn-sm" data-rmp="${i}-${j}">x</button></div>`).join('')}<button class="btn btn-ghost btn-sm" data-addp="${i}">+ Período</button> <label><input type="checkbox" data-lunch="${i}" ${d.lunch.on?'checked':''}> Almoço ${d.lunch.start}-${d.lunch.end}</label></div>`).join('')}<button class="btn btn-gold btn-sm" id="h_save">Salvar horários</button>`;
  $$('#tabBody [data-addp]').forEach(x=>x.onclick=()=>{DB.hours.days[Number(x.dataset.addp)].periods.push({s:'13:00',e:'18:00'});save();renderTab();});
  $$('#tabBody [data-rmp]').forEach(x=>x.onclick=()=>{const[a,c]=x.dataset.rmp.split('-').map(Number);DB.hours.days[a].periods.splice(c,1);save();renderTab();});
  $('#h_save').onclick=()=>{$$('#tabBody [data-open]').forEach(c=>DB.hours.days[Number(c.dataset.open)].open=c.checked);$$('#tabBody [data-lunch]').forEach(c=>DB.hours.days[Number(c.dataset.lunch)].lunch.on=c.checked);$$('#tabBody [data-ps]').forEach(inp=>{const[a,c]=inp.dataset.ps.split('-').map(Number);DB.hours.days[a].periods[c].s=inp.value;});$$('#tabBody [data-pe]').forEach(inp=>{const[a,c]=inp.dataset.pe.split('-').map(Number);DB.hours.days[a].periods[c].e=inp.value;});save();renderPublicBase();slog('Editou horários');toast('Horários salvos. Domingo configurável.');};}
 if(curTab===4){b.innerHTML=`<h3>5. Serviços</h3><form id="ns" class="row"><input class="in" id="n_name" placeholder="Nome" required><select class="in" id="n_dur"><option>15</option><option selected>30</option><option>45</option><option>60</option><option>90</option></select><input class="in" id="n_price" type="number" placeholder="Preço" min="0"><button class="btn btn-gold btn-sm">+ Add</button></form><div id="svcAdm">${DB.services.map((s,i)=>`<div style="border:1px solid var(--line);border-radius:8px;padding:8px;margin:6px 0"><b>${s.name}</b> ${s.active?'✅':'⏸'} — ${s.duration}min ${money(s.price)}<br><small>${s.desc||''}</small><br><button class="btn btn-ghost btn-sm" data-ed="${s.id}">Editar</button> <button class="btn btn-ghost btn-sm" data-tg="${s.id}">Ativo/Inativo</button> <button class="btn btn-ghost btn-sm" data-mv="${i},-1">↑</button><button class="btn btn-ghost btn-sm" data-mv="${i},1}">↓</button> <button class="btn btn-ghost btn-sm" data-dl="${s.id}">Excluir</button></div>`).join('')}</div>`;
  $('#ns').onsubmit=e=>{e.preventDefault();DB.services.push({id:uid('s'),name:$('#n_name').value,desc:'',duration:Number($('#n_dur').value),price:Number($('#n_price').value||0),gap:0,active:true,photo:''});save();renderTab();};
  $$('#tabBody [data-dl]').forEach(x=>x.onclick=()=>confirmDlg('Excluir serviço','Confirmar exclusão?','',()=>{DB.services=DB.services.filter(s=>s.id!==x.dataset.dl);save();renderTab();}));
  $$('#tabBody [data-tg]').forEach(x=>x.onclick=()=>{const s=DB.services.find(v=>v.id===x.dataset.tg);s.active=!s.active;save();renderTab();});
  $$('#tabBody [data-mv]').forEach(x=>x.onclick=()=>{const[i,d]=x.dataset.mv.split(',').map(Number);const j=i+d;if(j<0||j>=DB.services.length)return;[DB.services[i],DB.services[j]]=[DB.services[j],DB.services[i]];save();renderTab();});
  $$('#tabBody [data-ed]').forEach(x=>x.onclick=()=>{const s=DB.services.find(v=>v.id===x.dataset.ed);const n=prompt('Nome',s.name);if(!n)return;const dsc=prompt('Descrição',s.desc||'');const pr=Number(prompt('Preço',s.price));const du=Number(prompt('Duração 15/30/45/60/90',s.duration));s.name=n;s.desc=dsc||'';if(!isNaN(pr))s.price=pr;if([15,30,45,60,90].includes(du))s.duration=du;save();renderTab();});}
 if(curTab===5){b.innerHTML=`<h3>6. Agenda</h3><div class="row"><button class="btn ${agendaView==='dia'?'btn-gold':'btn-ghost'} btn-sm" data-v="dia">Dia</button><button class="btn ${agendaView==='semana'?'btn-gold':'btn-ghost'} btn-sm" data-v="semana">Semana</button><button class="btn ${agendaView==='mes'?'btn-gold':'btn-ghost'} btn-sm" data-v="mes">Mês</button><select class="in" id="agF" style="height:36px"><option value="">Todos</option><option>confirmado</option><option>pendente</option><option>concluído</option><option>cancelado</option></select></div><div style="height:8px"></div><div class="row"><button class="btn btn-gold btn-sm" id="agNew">+ Nova reserva manual</button><button class="btn btn-ghost btn-sm" id="agBlk">⛔ Bloquear horário</button></div><div id="agBody" style="margin-top:10px"></div>`;
  $$('#tabBody [data-v]').forEach(x=>x.onclick=()=>{agendaView=x.dataset.v;renderTab();});
  $('#agF').value=agendaFilter;$('#agF').onchange=e=>{agendaFilter=e.target.value;paintAgenda();};
  $('#agNew').onclick=modalReserva;$('#agBlk').onclick=modalBloqueio;paintAgenda();}
 if(curTab===6)renderAuto(b);
 if(curTab===7)renderSec(b);
}
function paintAgenda(){const el=$('#agBody');if(!el)return;let list=[...DB.appointments];if(agendaFilter)list=list.filter(a=>a.status===agendaFilter);
 const acts=id=>`<button class="btn btn-ghost btn-sm" onclick="admAct('${id}','confirmado')">Confirmar</button> <button class="btn btn-ghost btn-sm" onclick="admAct('${id}','concluído')">Concluir</button> <button class="btn btn-ghost btn-sm" onclick="admAct('${id}','cancelado')">Cancelar</button> <button class="btn btn-ghost btn-sm" onclick="admEdit('${id}')">Editar</button> <button class="btn btn-ghost btn-sm" onclick="admRe('${id}')">Remarcar</button>`;
 const line=a=>{const s=DB.services.find(x=>x.id===a.serviceId);return `<div class="timeline"><div><b>${a.date} ${a.time}</b> <span class="pill p-${a.status}">${a.status}</span><br>${a.client} ${a.phone} • ${s?.name||''} ${money(s?.price)}<br>${acts(a.id)}</div></div>`;};
 if(agendaView==='dia'){const t=todayISO();el.innerHTML='<b>Hoje '+t+'</b>'+(list.filter(a=>a.date===t).map(line).join('')||'<p>Nada hoje.</p>');}
 if(agendaView==='semana'){let h='<div class="week-grid">';for(let i=0;i<7;i++){const dt=addDays(todayISO(),i);const day=list.filter(a=>a.date===dt);h+=`<div><b>${dt.slice(5)}<br>${WD[new Date(dt+'T12:00').getDay()]}</b><br>${day.map(a=>`• ${a.time} ${a.client} (${a.status})`).join('<br>')||'—'}</div>`;}el.innerHTML=h+'</div>';}
 if(agendaView==='mes'){el.innerHTML=list.slice(0,50).map(a=>`🔵 ${a.date} ${a.time} — ${a.client} [${a.status}] ${acts(a.id)}`).join('<br>')||'Vazio';}
}
window.admAct=(id,st)=>{DB.appointments.find(a=>a.id===id).status=st;save();slog('Agenda '+st+' '+id);paintAgenda();};
window.admEdit=id=>{const a=DB.appointments.find(x=>x.id===id);const n=prompt('Nome',a.client);if(n)a.client=n;const o=prompt('Obs',a.note||'');if(o!==null)a.note=o;save();paintAgenda();};
window.admRe=id=>{const a=DB.appointments.find(x=>x.id===id);const nd=prompt('Nova data AAAA-MM-DD',a.date);const nt=prompt('Nova hora HH:MM',a.time);if(!nd||!nt)return;const svc=DB.services.find(s=>s.id===a.serviceId);const slots=calculateAvailability(nd,svc?.duration||30);if(!slots.includes(nt)){alert('Conflito! Livres: '+slots.join(','));return;}a.date=nd;a.time=nt;a.end=toHM(toMin(nt)+(svc?.duration||30));save();slog('Remarcado '+id+' -> '+nd+' '+nt);paintAgenda();};
function modalReserva(){const d=prompt('Data AAAA-MM-DD',todayISO());if(!d)return;const t=prompt('Hora HH:MM','09:00');const nm=prompt('Nome cliente','');const ph=prompt('Telefone','');if(!nm)return;const svcId=prompt('Serviço ID (opções: '+DB.services.map(s=>s.id+ '='+s.name).join(', ')+')',DB.services[0]?.id);const svc=DB.services.find(s=>s.id===svcId)||DB.services[0];if(!calculateAvailability(d,svc.duration).includes(t)){alert('Conflito nesse horário.');return;}DB.appointments.push({id:uid('a'),client:nm,phone:onlyDigits(ph),serviceId:svc.id,barber:'Renato Carriço',date:d,time:t,end:toHM(toMin(t)+svc.duration),note:'manual',status:'confirmado',createdAt:new Date().toISOString()});save();paintAgenda();toast('Reserva criada.');}
function modalBloqueio(){const d=prompt('Data AAAA-MM-DD',todayISO());const s=prompt('Início HH:MM','12:00');const e=prompt('Fim HH:MM','13:00');const m=prompt('Motivo','Almoço');if(d&&s&&e){DB.blocks.push({id:uid('bl'),date:d,start:s,end:e,reason:m});save();paintAgenda();toast('Horário bloqueado.');}}

/* automações */
function renderAuto(b){const A=DB.automation;
 b.innerHTML=`<h3>7. Automações</h3><div style="border:1px solid var(--line);border-radius:10px;padding:12px"><b>Lembrete Diário para Proprietário</b><br><small>Todo dia ${A.time} envia lembrete dos agendamentos do dia para 28 99913-7277 • America/Sao_Paulo</small><br><label><input type="checkbox" id="au_on" ${A.enabled?'checked':''}> Ativado / Desativado</label> <input type="time" id="au_time" value="${A.time}"><br><label class="f">TEMPLATE (variáveis {{nomeCliente}} {{telefoneCliente}} {{servico}} {{barbeiro}} {{data}} {{horario}} {{valor}})</label><textarea class="in" id="au_tpl" rows="4">${A.template}</textarea><div class="row"><button class="btn btn-gold btn-sm" id="au_save">Salvar</button><button class="btn btn-ghost btn-sm" id="au_now">Gerar hoje</button><button class="btn btn-ghost btn-sm" id="au_wa">Abrir WhatsApp proprietário</button><button class="btn btn-ghost btn-sm" id="au_ct">Marcar como contatado</button></div><div id="au_prev" style="margin-top:8px"></div><h4>Logs</h4><div style="font-size:12px">${A.logs.slice(0,20).map(l=>`${l.at} — ${l.msg}`).join('<br>')||'sem logs'}</div></div>`;
 $('#au_save').onclick=()=>{A.enabled=$('#au_on').checked;A.time=$('#au_time').value;A.template=$('#au_tpl').value;save();toast('Automação salva.');};
 const gen=()=>{const t=todayISO();const list=DB.appointments.filter(a=>a.date===t&&a.status!=='cancelado');
  if(!list.length)return 'Nenhum agendamento hoje (cancelados não geram).';
  return list.map(a=>{const s=DB.services.find(x=>x.id===a.serviceId);return A.template.replaceAll('{{nomeCliente}}',a.client).replaceAll('{{telefoneCliente}}',a.phone).replaceAll('{{servico}}',s?.name||'').replaceAll('{{barbeiro}}',a.barber||'Renato Carriço').replaceAll('{{data}}',a.date).replaceAll('{{horario}}',a.time).replaceAll('{{valor}}',money(s?.price));}).join('\n---\n');};
 $('#au_now').onclick=()=>{try{const txt=gen();$('#au_prev').innerHTML='<pre style="white-space:pre-wrap">'+txt+'</pre>';const t=todayISO();if(A.lastSentAt===t){A.logs.unshift({at:new Date().toLocaleString('pt-BR'),msg:'falha: duplicado bloqueado (lastSentAt='+t+')'});}else{A.lastSentAt=t;A.logs.unshift({at:new Date().toLocaleString('pt-BR'),msg:'gerado lembrete '+t});}save();renderTab();}catch(e){A.logs.unshift({at:new Date().toLocaleString('pt-BR'),msg:'falha: '+e.message});save();}};
 window._lastAutoTxt=gen();
 $('#au_wa').onclick=()=>{const txt=encodeURIComponent(typeof window._lastAutoTxt==='string'?window._lastAutoTxt:gen());window.open('https://wa.me/'+A.ownerPhone+'?text='+txt,'_blank');};
 $('#au_ct').onclick=()=>{A.contacted[todayISO()]=true;A.logs.unshift({at:new Date().toLocaleString('pt-BR'),msg:'marcado como contatado '+todayISO()});save();toast('Contatado.');};
}

/* segurança */
function pwScore(p){let s=0;if(p.length>=8)s++;if(/[A-Z]/.test(p))s++;if(/[0-9]/.test(p))s++;return s;}
function renderSec(b){const S=DB.security;const me=curAdmin();
 b.innerHTML=`<h3>🛡️ Segurança e Acesso</h3><div class="kv"><div style="border:1px solid var(--line);border-radius:10px;padding:12px"><b>🔑 Alterar Senha</b><br><label class="f">Senha atual</label><input class="in" id="s_cur" type="password"><label class="f">Nova senha</label><input class="in" id="s_new" type="password"><div class="strength"><i id="s_bar"></i></div><small id="s_req">min 8, 1 maiúscula, 1 número</small><label class="f">Confirmar</label><input class="in" id="s_c2" type="password"><div class="err" id="s_err"></div><label><input type="checkbox" id="s_out"> desconectar outros dispositivos</label><div style="height:8px"></div><button class="btn btn-bege" id="s_save" style="height:48px">SALVAR NOVA SENHA</button></div>
 <div style="border:1px solid var(--line);border-radius:10px;padding:12px"><b>👥 Acesso Admin Total</b> <button class="btn btn-gold btn-sm" id="u_new">+ Novo Admin</button><table class="t"><tr><th>Nome/Email</th><th>Função</th><th>Status</th><th>Ações</th></tr>${S.users.map(u=>`<tr><td>${u.name}<br><small>${u.email}</small></td><td>${u.role}</td><td>${u.active?'ativo':'off'}<br><small>${u.lastAccess||''}</small></td><td><button class="btn btn-ghost btn-sm" data-ue="${u.id}">Editar</button> <button class="btn btn-ghost btn-sm" data-ud="${u.id}">Desativar</button> <button class="btn btn-ghost btn-sm" data-ux="${u.id}">Excluir</button></td></tr>`).join('')}</table><small>Super Admin: acesso total irrestrito. Admin: tudo exceto admins. Barbeiro: só agenda.</small></div></div>
 <h4>Logs Segurança</h4><div class="row"><input class="in" id="lg_f" placeholder="filtrar" style="height:36px"><button class="btn btn-ghost btn-sm" id="lg_c">Limpar</button></div><div style="font-size:12px;max-height:150px;overflow:auto">${S.logs.map(l=>`${l.at} • ${l.user} • ${l.action} • ${l.status}`).join('<br>')}</div>
 <h4>Sessões Ativas</h4><div style="font-size:12px">${S.sessions.map(s=>`${s.id} • ${s.email} • ${s.at} <button data-kill="${s.id}">Encerrar</button>`).join('<br>')||'—'}</div>
 <div class="row" style="margin-top:8px"><label>Auto logout (min)<input type="number" id="s_auto" value="${S.autoLogoutMin}"></label><label><input type="checkbox" id="s_2fa" ${S.fa?'checked':''}> 2FA QR simulado</label></div><div id="qr">${S.fa?'<p>QR simulado: <b>RENATO-2FA-123456</b> — digite 123456 no login (simulação)</p>':''}</div>`;
 $('#s_new').addEventListener('input',e=>{const v=e.target.value;const s=pwScore(v);const c=['#555','#E05D5D','#E8A33D','#4CAF7D'][s];$('#s_bar').style.width=(s/3*100)+'%';$('#s_bar').style.background=c;$('#s_req').textContent=s<3?'fraca/média — min 8, 1 maiúscula, 1 número':'forte ✔';});
 $('#s_c2').addEventListener('input',e=>{e.target.style.borderColor=e.target.value!==$('#s_new').value?'red':'';});
 $('#s_save').onclick=()=>{if(hashSim($('#s_cur').value)!==me.passHash){$('#s_err').textContent='Senha atual incorreta.';return;}if(pwScore($('#s_new').value)<3){$('#s_err').textContent='Nova senha fraca.';return;}if($('#s_new').value!==$('#s_c2').value){$('#s_err').textContent='Confirmação difere.';return;}me.passHash=hashSim($('#s_new').value);if($('#s_out').checked)S.sessions=S.sessions.filter(s=>s.email!==me.email||s.id===sessionStorage.getItem('br_sess'));slog('Trocou senha','ok');save();toast('Senha salva.');renderTab();};
 $$('#tabBody [data-ud]').forEach(x=>x.onclick=()=>{if(me.role!=='Super Admin'){toast('Só Super Admin.');return;}const u=S.users.find(v=>v.id===x.dataset.ud);u.active=!u.active;save();renderTab();});
 $$('#tabBody [data-ux]').forEach(x=>x.onclick=()=>{if(me.role!=='Super Admin'){toast('Só Super Admin.');return;}confirmDlg('Excluir admin','Digite EXCLUIR para confirmar',`<input data-need="EXCLUIR" placeholder="EXCLUIR">`,()=>{S.users=S.users.filter(v=>v.id!==x.dataset.ux);save();renderTab();});});
 $$('#tabBody [data-ue]').forEach(x=>x.onclick=()=>{if(me.role!=='Super Admin'){toast('Só Super Admin.');return;}const u=S.users.find(v=>v.id===x.dataset.ue);const r=prompt('Função Super Admin/Admin/Barbeiro',u.role);if(r)u.role=r;save();renderTab();});
 $('#u_new').onclick=()=>{if(me.role!=='Super Admin'){toast('Só Super Admin.');return;}const n=prompt('Nome');const e=prompt('Email');const p=prompt('Senha (min 8)');const r=prompt('Função','Admin');if(n&&e&&p){S.users.push({id:uid('u'),name:n,email:e,passHash:hashSim(p),role:r||'Admin',active:true,perms:r==='Barbeiro'?['agenda']:['all'],lastAccess:null});save();renderTab();}};
 $('#lg_c').onclick=()=>confirmDlg('Limpar logs','Apagar todos os logs?', '',()=>{S.logs=[];save();renderTab();});
 $$('#tabBody [data-kill]').forEach(x=>x.onclick=()=>{S.users&&(S.sessions=S.sessions.filter(s=>s.id!==x.dataset.kill));save();renderTab();});
 $('#s_auto').onchange=e=>{S.autoLogoutMin=Number(e.target.value)||30;save();};
 $('#s_2fa').onchange=e=>{S.fa=e.target.checked;save();renderTab();};
 const cc=cloudCfg();
 b.innerHTML+=`<div style="border:1px solid var(--gold);border-radius:10px;padding:12px;margin-top:12px"><b>☁️ Nuvem / Multi-aparelhos (Supabase)</b><br><small>Status: <b id="cloudSt">${cloudOn()?'configurado':'modo local — configure para sincronizar'}</b> • <span id="cloudBadge"></span><br>Sem isso cada celular tem banco separado. Com isso tudo sincroniza.</small><label class="f">SUPABASE URL</label><input class="in" id="cl_url" value="${cc.url}" placeholder="https://xyz.supabase.co"><label class="f">ANON KEY</label><input class="in" id="cl_key" value="${cc.key}" placeholder="eyJ..."><div class="row" style="margin-top:8px"><button class="btn btn-gold btn-sm" id="cl_save">Salvar e sincronizar</button><button class="btn btn-ghost btn-sm" id="cl_test">Testar</button><button class="btn btn-ghost btn-sm" id="cl_pull">Puxar agora</button></div></div>`;
 $('#cl_save').onclick=async()=>{localStorage.setItem('br_cloud',JSON.stringify({url:$('#cl_url').value.trim(),key:$('#cl_key').value.trim()}));toast('Config salva. Sincronizando...');const ok=await cloudPull();renderPublicBase();renderTab();toast(ok?'Nuvem conectada!':'Falha — confira URL/key + schema.sql');};
 $('#cl_test').onclick=async()=>{localStorage.setItem('br_cloud',JSON.stringify({url:$('#cl_url').value.trim(),key:$('#cl_key').value.trim()}));try{await sb('store?id=eq.main&select=id');toast('Conexão OK!');}catch(e){toast('Falha: '+e.message);}};
 $('#cl_pull').onclick=async()=>{const ok=await cloudPull();renderPublicBase();renderTab();toast(ok?'Atualizado da nuvem.':'Nada / falha');};
}

/* login */
$('#adminLink').onclick=e=>{e.preventDefault();$('#loginModal').hidden=false;};
$('#loginClose').onclick=()=>$('#loginModal').hidden=true;
$('#loginGo').onclick=()=>{
 const em=$('#loginEmail').value.trim(),pw=$('#loginPass').value;const S=DB.security;
 if(Date.now()<S.lockUntil){$('#loginErr').textContent='Bloqueado 15min após 5 falhas.';return;}
 const u=S.users.find(x=>x.email===em);
 if(!u||!u.active||u.passHash!==hashSim(pw)){S.attempts++;if(S.attempts>=5){S.lockUntil=Date.now()+15*60*1000;S.attempts=0;}save();$('#loginErr').textContent='Login inválido.';slog('Falha login '+em,'falha');return;}
 S.attempts=0;S.currentId=u.id;u.lastAccess=new Date().toLocaleString('pt-BR');
 const sess={id:uid('sess'),email:u.email,at:new Date().toLocaleString('pt-BR')};S.sessions.push(sess);sessionStorage.setItem('br_sess',sess.id);
 save();slog('Login '+em);$('#loginModal').hidden=true;openAdmin();renderPublicBase();
};
$('#admClose').onclick=()=>{$('#adminModal').hidden=true;};
let lastAct=Date.now();document.addEventListener('click',()=>lastAct=Date.now());
setInterval(()=>{const S=DB.security;if(!$('#adminModal').hidden&&Date.now()-lastAct>S.autoLogoutMin*60*1000){$('#adminModal').hidden=true;toast('Auto logout '+S.autoLogoutMin+'min.');}},30000);

renderPublicBase();renderStep();setCloudBadge();
(async()=>{if(cloudOn()){setCloudBadge('sincronizando...');const ok=await cloudPull();if(ok){renderPublicBase();renderStep();setCloudBadge('nuvem ok');}else setCloudBadge('modo local');}})();
setInterval(async()=>{if(cloudOn()&&document.hidden===false){await cloudPull();renderPublicBase();if(!$('#adminModal').hidden&&curTab===5)paintAgenda();}},20000);
