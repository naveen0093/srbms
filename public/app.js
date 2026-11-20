(function(){
'use strict';
var $=function(s,r){return (r||document).querySelector(s)};
var esc=function(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})};
var num=function(x){var n=Number(x);return isFinite(n)?n:0};
var inr=function(n){return '₹'+Math.round(n).toLocaleString('en-IN')};
var ymd=function(d){var p=function(n){return (n<10?'0':'')+n};return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate())};
var today=function(){return ymd(new Date())};
function defProducts(){return [{n:'300 ml',c:30,r:120},{n:'500 ml',c:24,r:120},{n:'500 ml',c:20,r:100},{n:'1 L',c:12,r:108},{n:'2 L',c:9,r:135}]}
var I={ // icons (24px stroke)
 home:'<path d="M3 11 12 3l9 8v10h-6v-6H9v6H3z" fill="currentColor" stroke="none"/>',
 plus:'<circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/>',
 doc:'<path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5M9 13h6M9 17h6"/>',
 users:'<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-4 3-6 6.5-6s6.5 2 6.5 6"/><circle cx="17" cy="9" r="2.5"/><path d="M17 14c3 0 4.5 2 4.5 5"/>',
 card:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18"/>',
 clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
 box:'<path d="m12 3 9 4.5v9L12 21l-9-4.5v-9z"/><path d="m3 7.5 9 4.5 9-4.5M12 12v9"/>',
 hist:'<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5M12 8v5l3 2"/>',
 fuel:'<path d="M5 21V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v16M3 21h14M15 9h2a2 2 0 0 1 2 2v6a1.5 1.5 0 0 0 3 0V9l-3-3"/><path d="M8 7h4"/>',
 list:'<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 8h6M9 12h6M9 16h4"/>',
 cal:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 10h18M8 14h2M12 14h2M16 14h2"/>',
 wallet:'<rect x="3" y="6" width="18" height="14" rx="2"/><path d="M3 10h18M16 15h2"/>',
 bars:'<path d="M5 20V10M12 20V4M19 20v-7" stroke-width="3"/>',
 gear:'<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/>',
 user:'<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.5 3.5-7 8-7s8 2.5 8 7"/>',
 rupee:'<path d="M7 5h10M7 9h10M7 5c6 0 6 8 0 8h-1l8 7"/>',
 chev:'<path d="m6 9 6 6 6-6"/>',
 check:'<rect x="4" y="4" width="16" height="17" rx="2"/><path d="M8 2v4M16 2v4M8 14l3 3 5-6"/>'
};
var ic=function(n,extra){return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" '+(extra||'')+'>'+I[n]+'</svg>'};

/* ---------- data (Supabase persistence, storage & auth) ---------- */
var KEY='aquaflow-bms-v1';
var SB=null,SB_CFG=null,SESSION=null,CURRENT_PROFILE=null,CURRENT_ROLE=null,DATA_READY=false,SETTINGS_ID=1,BOOT_ERR='',DOC_URL_CACHE={};
function isOwner(){return CURRENT_ROLE==='owner'}
function fetchCurrentRole(){
 if(!SB||!SESSION)return Promise.reject(new Error('Not signed in'));
 return SB.from('profiles').select('user_id,full_name,role,employee_id,active').eq('user_id',SESSION.user.id).maybeSingle().then(function(res){
  var p=res&&res.data;
  if(!p||!p.active||!p.role){
   signOutOwner('Account not active');
   throw new Error('Account not active');
  }
  CURRENT_PROFILE=p;
  CURRENT_ROLE=p.role;
  return p.role;
 }).catch(function(err){
  if(err&&err.message=='Account not active')throw err;
  signOutOwner('Account not active');
  throw new Error('Account not active');
 });
}
function emptyState(){
 return {customers:[],bills:[],cancelledBills:[],deletedBills:[],payments:[],stock:[],expenses:[],employees:[],attendance:[],advances:[],invites:[],applications:[],payslips:[],vehicles:[],vehicleTrips:[],
  settings:{name:'SR Industries',owner:'Owner',phone:'',gst:'37BDGPS8418C2ZC',gv:1,address:'',products:defProducts(),pv:3,low:100,vehicleVideoMaxMB:25}};
}
var S=emptyState();
/* bill.paid is always calculated from the payment records, so Bills, Customers, Payments and Outstanding can never disagree */
function allBills(){return (S.bills||[]).concat(S.cancelledBills||[],S.deletedBills||[])}
function syncPaid(){var m={};S.payments.forEach(function(p){if(!p.reversed_at&&p.bill&&p.bill!='-')m[p.bill]=(m[p.bill]||0)+p.amount});S.bills.forEach(function(b){b.paid=Math.round((m[b.id]||0)*100)/100})}
function save(){syncPaid()}
function nid(p,a){return p+(a.length?Math.max.apply(null,a.map(function(x){return parseInt(String(x.id).replace(/\D/g,''))||0}))+1:1)}
function custName(id){var c=S.customers.filter(function(x){return x.id==id})[0];return c?c.name:'Walk-in'}
function empName(id){var c=S.employees.filter(function(x){return x.id==id})[0];return c?c.name:'-'}
function toast(m,undo){var t=$('#toast');t.textContent=m;toast.u=null;if(undo){var b=document.createElement('button');b.type='button';b.id='tundo';b.className='tundo';b.textContent='Undo';t.appendChild(b);toast.u=undo}t.hidden=false;clearTimeout(toast.t);toast.t=setTimeout(function(){t.hidden=true;toast.u=null},undo?9000:2200)}
function outstanding(id){return S.bills.filter(function(b){return !id||b.cust==id}).reduce(function(a,b){return a+b.total-b.paid},0)}
function stockLevels(){var m={};S.stock.forEach(function(r){m[r.item]=(m[r.item]||0)+(r.type=='In'?r.qty:-r.qty)});return m}
function sum(a,f){return a.reduce(function(x,y){return x+f(y)},0)}
window.__AF={S:function(){return S},save:save};

function isPublicHash(){var h=location.hash||'';return h.indexOf('#join=')==0||h.indexOf('#bill=')==0||h.indexOf('#doc=')==0||h.indexOf('#me=')==0}
function sbErr(ctx,err){console.error('[Supabase]',ctx,err);toast('Sync error ('+ctx+'): '+(err&&err.message?err.message:'check connection'))}
function sbCheck(ctx){return function(res){if(res&&res.error){sbErr(ctx,res.error);throw res.error}return res}}
function toIsoOrNull(v){if(!v)return null;var d=new Date(v);return isNaN(d.getTime())?null:d.toISOString()}
function isStoragePath(p){return typeof p==='string'&&p.trim()!==''&&!/^data:/i.test(p)&&!/^https?:\/\//i.test(p)}
function dataUrlToBlob(dataUrl){
 var m=/^data:(image\/(?:jpeg|png|webp)|application\/pdf);base64,([A-Za-z0-9+/=]+)$/i.exec(String(dataUrl||''));
 if(!m)return null;
 var mime=m[1].toLowerCase(),bin=atob(m[2]),arr=new Uint8Array(bin.length);
 for(var i=0;i<bin.length;i++)arr[i]=bin.charCodeAt(i);
 var ext=mime=='application/pdf'?'pdf':mime=='image/png'?'png':mime=='image/webp'?'webp':'jpg';
 return {blob:new Blob([arr],{type:mime}),mime:mime,ext:ext,docType:mime=='application/pdf'?'pdf':'image'};
}
function signEmployeePaths(paths){
 if(!SB)return Promise.resolve({});
 var uniq=[],seen={};
 (paths||[]).forEach(function(p){if(isStoragePath(p)&&!seen[p]){seen[p]=1;uniq.push(p)}});
 if(!uniq.length)return Promise.resolve({});
 var chunks=[];for(var i=0;i<uniq.length;i+=100)chunks.push(uniq.slice(i,i+100));
 var out={};
 return Promise.all(chunks.map(function(chunk){
  return SB.storage.from('employee-docs').createSignedUrls(chunk,3600).then(function(res){
   if(res.error||!res.data)return;
   res.data.forEach(function(item){if(item&&item.path&&item.signedUrl){out[item.path]=item.signedUrl;DOC_URL_CACHE[item.path]=item.signedUrl}});
  });
 })).then(function(){return out});
}
function resolveDocUrl(path,signedMap){if(!path)return '';if(/^data:|^https?:\/\//i.test(path))return path;return (signedMap&&signedMap[path])||DOC_URL_CACHE[path]||''}
function uploadEmployeeDoc(path,fileOrBlob,contentType){
 return SB.storage.from('employee-docs').upload(path,fileOrBlob,{contentType:contentType,upsert:true}).then(function(res){
  if(res.error)throw res.error;
  return SB.storage.from('employee-docs').createSignedUrl(path,3600).then(function(sr){
   var url=(sr&&sr.data&&sr.data.signedUrl)||'';
   if(url)DOC_URL_CACHE[path]=url;
   return {path:path,url:url};
  });
 });
}
function fetchAllRows(table,orders){
 var rows=[],pageSize=1000;
 function next(from){
  var q=SB.from(table).select('*');
  (orders||[]).forEach(function(o){q=q.order(o[0],{ascending:o[1]!==false})});
  q=q.range(from,from+pageSize-1);
  return q.then(function(res){
   if(res.error)throw res.error;
   var data=res.data||[];rows=rows.concat(data);
   if(data.length===pageSize)return next(from+pageSize);
   return rows;
  });
 }
 return next(0);
}
function mapEmployeeRow(r,sm,ident){
 ident=ident||{};
 return {id:r.id,name:r.name||'',role:r.role||'',phone:r.phone||'',salary:Number(r.salary||0),address:r.address||'',
  photoPath:r.photo_path||ident.photo_path||'',photo:resolveDocUrl(r.photo_path||ident.photo_path,sm),
  aadhaar:ident.aadhaar?maskA(ident.aadhaar):'',pan:ident.pan?maskPan(ident.pan):'',licenseNo:ident.license_no?maskLicense(ident.license_no):'',
  docPath:ident.aadhaar_doc_path||'',doc:resolveDocUrl(ident.aadhaar_doc_path,sm),docType:ident.aadhaar_doc_type||'',
  panDocPath:ident.pan_doc_path||'',panDoc:resolveDocUrl(ident.pan_doc_path,sm),panDocType:ident.pan_doc_type||'',
  licenseDocPath:ident.license_doc_path||'',licenseDoc:resolveDocUrl(ident.license_doc_path,sm),licenseDocType:ident.license_doc_type||'',
  tok:r.portal_token||'',app:r.application_id||'',joined:r.joined_date||'',joinedAt:r.joined_at||''};
}
function mapApplicationRow(r,sm){
 return {id:r.id,t:r.invite_token||'',date:r.applied_date||today(),submittedAt:r.submitted_at||'',decidedAt:r.decided_at||'',retentionDeadline:r.retention_deadline||'',name:r.name||'',mobile:r.mobile||'',address:r.address||'',
  aadhaar:r.aadhaar?maskA(r.aadhaar):'',pan:r.pan?maskPan(r.pan):'',licenseNo:r.license_no?maskLicense(r.license_no):'',
  photoPath:r.photo_path||'',photo:resolveDocUrl(r.photo_path,sm),
  docPath:r.doc_path||'',doc:resolveDocUrl(r.doc_path,sm),docType:r.doc_type||'',
  panDocPath:r.pan_doc_path||'',panDoc:resolveDocUrl(r.pan_doc_path,sm),panDocType:r.pan_doc_type||'',
  licenseDocPath:r.license_doc_path||'',licenseDoc:resolveDocUrl(r.license_doc_path,sm),licenseDocType:r.license_doc_type||'',
  status:r.status||'Pending'};
}
function safeFetch(table,promise,fallback){
 return promise.catch(function(err){
  console.warn('[Supabase] safeFetch caught on '+table+':',(err&&err.message)||err);
  return fallback!==undefined?fallback:[];
 });
}
function loadAllFromSupabase(){
 var ensureRole=CURRENT_ROLE?Promise.resolve(CURRENT_ROLE):fetchCurrentRole();
 return ensureRole.then(function(role){
  var isOwn=isOwner();
  var canSettings=role==='owner'||role==='manager'||role==='accountant'||role==='billing_staff';
  var canCust=role==='owner'||role==='manager'||role==='accountant'||role==='billing_staff';
  var canBills=role==='owner'||role==='manager'||role==='accountant'||role==='billing_staff';
  var canPay=role==='owner'||role==='manager'||role==='accountant'||role==='billing_staff';
  var canStock=role==='owner'||role==='manager'||role==='accountant'||role==='billing_staff';
  var canExp=role==='owner'||role==='manager'||role==='accountant';
  var canEmp=role==='owner'||role==='manager'||role==='accountant';
  var canHr=role==='owner'||role==='manager'||role==='accountant';
  var canAtt=role==='owner'||role==='manager'||role==='accountant'||role==='driver';
  var canAdv=role==='owner'||role==='manager'||role==='accountant';
  var canVeh=role==='owner'||role==='manager'||role==='accountant'||role==='driver';
  var canTrips=role==='owner'||role==='manager'||role==='accountant'||role==='driver';

  return Promise.all([
   canSettings?safeFetch('business_settings',SB.from('business_settings').select('*').limit(1).then(sbCheck('business_settings')),{data:[]}):Promise.resolve({data:[]}),
   canCust?safeFetch('customers',fetchAllRows('customers',[['created_date',true],['id',true]])):Promise.resolve([]),
   canBills?safeFetch('bills',fetchAllRows('bills',[['bill_date',true],['id',true]])):Promise.resolve([]),
   canBills?safeFetch('bill_items',fetchAllRows('bill_items',[])):Promise.resolve([]),
   canPay?safeFetch('payments',fetchAllRows('payments',[['payment_date',true],['id',true]])):Promise.resolve([]),
   canStock?safeFetch('stock_movements',fetchAllRows('stock_movements',[['move_date',true],['id',true]])):Promise.resolve([]),
   canExp?safeFetch('expenses',fetchAllRows('expenses',[['expense_date',true],['id',true]])):Promise.resolve([]),
   canEmp?safeFetch('employees',fetchAllRows('employees',[['id',true]])):Promise.resolve([]),
   isOwn?safeFetch('employee_identities',fetchAllRows('employee_identities',[['employee_id',true]])):Promise.resolve([]),
   isOwn?safeFetch('employee_invites',fetchAllRows('employee_invites',[['created_date',true]])):Promise.resolve([]),
   isOwn?safeFetch('employee_applications',fetchAllRows('employee_applications',[['submitted_at',true]])):Promise.resolve([]),
   canHr?safeFetch('employee_hr_docs',fetchAllRows('employee_hr_docs',[['created_at',true]])):Promise.resolve([]),
   canAtt?safeFetch('attendance',fetchAllRows('attendance',[['att_date',true],['id',true]])):Promise.resolve([]),
   canAdv?safeFetch('advances',fetchAllRows('advances',[['adv_date',true],['id',true]])):Promise.resolve([]),
   canVeh?safeFetch('vehicles',fetchAllRows('vehicles',[['created_at',true]])):Promise.resolve([]),
   canTrips?safeFetch('vehicle_trips',fetchAllRows('vehicle_trips',[['start_at',true]])):Promise.resolve([])
  ]).then(function(res){
  var bsRows=(res[0]&&res[0].data)||[],custRows=res[1],billRows=res[2],itemRows=res[3],payRows=res[4],stockRows=res[5],expRows=res[6],empRows=res[7],identRows=res[8]||[],invRows=res[9]||[],appRows=res[10]||[],hrRows=res[11]||[],attRows=res[12]||[],advRows=res[13]||[],vehRows=res[14]||[],tripRows=res[15]||[];
  var identitiesByEmp={};
  identRows.forEach(function(i){if(i&&i.employee_id)identitiesByEmp[i.employee_id]=i});
  var paths=[];
  if(isOwn){
   empRows.forEach(function(r){
    var i=identitiesByEmp[r.id]||{};
    paths.push(r.photo_path,i.photo_path,i.aadhaar_doc_path,i.pan_doc_path,i.license_doc_path);
   });
   appRows.forEach(function(r){paths.push(r.photo_path,r.doc_path,r.pan_doc_path,r.license_doc_path)});
  }
  var signPromise=isOwn&&paths.filter(isStoragePath).length?signEmployeePaths(paths):Promise.resolve({});
  return signPromise.then(function(sm){
   sm=sm||{};
   var ns=emptyState();
   if(bsRows[0]){
    var bs=bsRows[0];SETTINGS_ID=bs.id!=null?bs.id:1;
    ns.settings={name:bs.name||'SR Industries',owner:bs.owner||'Owner',phone:bs.phone||'',gst:bs.gst||'',gv:1,address:bs.address||'',products:Array.isArray(bs.products)&&bs.products.length?bs.products:defProducts(),pv:3,low:Number(bs.low_stock_threshold!=null?bs.low_stock_threshold:100),vehicleVideoMaxMB:Number(bs.vehicle_video_max_mb!=null?bs.vehicle_video_max_mb:25)};
   }
   ns.customers=custRows.map(function(r){return {id:r.id,name:r.name||'',phone:r.phone||'',area:r.area||'',date:r.created_date||today(),active:r.active!==false}});
   var itemsByBill={};
   itemRows.forEach(function(r){if(!itemsByBill[r.bill_id])itemsByBill[r.bill_id]=[];itemsByBill[r.bill_id].push({p:r.product_name,q:Number(r.qty_bottles||0),r:Number(r.rate_per_case||0),cs:Number(r.case_size||1)})});
   billRows.forEach(function(r){
    var b={id:r.id,date:r.bill_date||today(),cust:r.customer_id||'',name:r.customer_name||'',mobile:r.mobile||'',addr:r.address||'',gst:!!r.gst,sub:Number(r.subtotal!=null?r.subtotal:(r.total||0)),tax:Number(r.tax||0),total:Number(r.total||0),paid:Number(r.paid||0),mode:r.payment_mode||'Cash',items:itemsByBill[r.id]||[]};
    if(r.status=='cancelled'||r.status=='deleted'){
     b.archiveType=r.status=='cancelled'?'cancel':'delete';b.actionReason=r.action_reason||'';b.reason=r.action_reason||'';b.actionBy=r.action_by||'';b.actionAt=r.action_at||'';b.actionDate=r.action_at?dFull(r.action_at):'-';
     if(r.status=='cancelled'){b.cancelledAt=r.action_at||'';ns.cancelledBills.push(b)}else{b.deletedAt=r.action_at||'';ns.deletedBills.push(b)}
    }else ns.bills.push(b);
   });
   ns.payments=payRows.map(function(r){return {id:r.id,date:r.payment_date||today(),cust:r.customer_id||'',bill:r.bill_id||'-',amount:Number(r.amount||0),mode:r.mode||'Cash',reversed_at:r.reversed_at||null,reversed_by:r.reversed_by||'',reversal_reason:r.reversal_reason||'',notes:r.notes||''}});
   ns.stock=stockRows.map(function(r){return {id:r.id,date:r.move_date||today(),type:r.move_type||'In',item:r.item_name||'',qty:Number(r.qty||0),note:r.note||''}});
   ns.expenses=expRows.map(function(r){return {id:r.id,date:r.expense_date||today(),cat:r.category||'Other',note:r.note||'',amount:Number(r.amount||0)}});
   ns.employees=empRows.map(function(r){return mapEmployeeRow(r,sm,isOwn?identitiesByEmp[r.id]:null)});
   ns.invites=invRows.map(function(r){return {id:r.token,t:r.token,status:r.status||'open',date:r.created_date||today(),expiresAt:r.expires_at||''}});
   ns.applications=appRows.map(function(r){return mapApplicationRow(r,sm)});
   ns.payslips=hrRows.filter(function(r){return r.doc_kind=='p'||(r.payload&&r.payload.k=='p')}).map(function(r){return r.payload}).filter(Boolean);
   ns.attendance=attRows.map(function(r){return {id:r.id,date:r.att_date||today(),emp:r.employee_id||'',status:r.status||'Present',tin:r.time_in||'',tout:r.time_out||''}});
   ns.advances=advRows.map(function(r){return {id:r.id,date:r.adv_date||today(),emp:r.employee_id||'',amount:Number(r.amount||0),note:r.note||''}});
   ns.vehicles=vehRows.map(function(r){return {id:r.id,number:r.vehicle_number||'',type:r.vehicle_type||'',model:r.model||'',driver:r.default_driver_id||'',notes:r.notes||'',createdAt:r.created_at||''}});
   ns.vehicleTrips=tripRows.map(function(r){return {id:r.id,vehicle:r.vehicle_id||'',employee:r.employee_id||'',startReading:Number(r.start_reading||0),fuelType:r.fuel_type||'',fuelPercent:Number(r.fuel_percent||0),batteryPercent:r.battery_percent!=null?Number(r.battery_percent):null,startCondition:r.start_condition||'',safetyCheck:r.safety_check||'',startNotes:r.start_notes||'',startMedia:Array.isArray(r.start_media)?r.start_media:[],startAt:r.start_at||'',endReading:r.end_reading!=null?Number(r.end_reading):null,endFuel:r.end_fuel!=null?Number(r.end_fuel):null,endBattery:r.end_battery!=null?Number(r.end_battery):null,supervisor:r.supervisor||'',handoverCondition:r.handover_condition||'',damage:r.damage||'',endMedia:Array.isArray(r.end_media)?r.end_media:[],handoverAt:r.handover_at||'',status:r.status||(r.handover_at?'Closed':'Active')}});
   S=ns;syncPaid();DATA_READY=true;return S;
  });
 });
 });
}
/* Supabase CRUD helpers */
function sbSaveSettings(){
 if(!SB||!SESSION)return Promise.resolve();
 var s=S.settings;
 var row={id:SETTINGS_ID,name:s.name||'SR Industries',owner:s.owner||'Owner',phone:s.phone||'',gst:s.gst||'',address:s.address||'',low_stock_threshold:Number(s.low!=null?s.low:100),vehicle_video_max_mb:Number(s.vehicleVideoMaxMB||25),products:s.products||defProducts(),updated_at:new Date().toISOString()};
 return SB.from('business_settings').upsert(row).then(sbCheck('business_settings'));
}
function sbCustomerRow(c){return {id:c.id,name:c.name,phone:c.phone||'',area:c.area||'',created_date:c.date||today(),active:c.active!==false}}
function sbInsertCustomer(c){if(!SB||!SESSION)return Promise.resolve();return SB.from('customers').insert(sbCustomerRow(c)).then(sbCheck('customers'))}
function sbUpsertCustomer(c){if(!SB||!SESSION)return Promise.resolve();return SB.from('customers').upsert(sbCustomerRow(c)).then(sbCheck('customers'))}
function sbSetCustomerActive(id,active){if(!SB||!SESSION)return Promise.resolve();return SB.from('customers').update({active:!!active}).eq('id',id).then(sbCheck('customers'))}
function sbUpdateCustomerAndBills(c){
 if(!SB||!SESSION)return Promise.resolve();
 return sbUpsertCustomer(c).then(function(){
  return SB.from('bills').update({customer_name:c.name,mobile:c.phone||'',address:c.area||''}).eq('customer_id',c.id).then(sbCheck('bills'));
 });
}
function sbBillRow(b,status){
 var st=status||'active';
 return {id:b.id,bill_date:b.date||today(),customer_id:b.cust||null,customer_name:b.name||'',mobile:b.mobile||'',address:b.addr||'',gst:!!b.gst,subtotal:Number(b.sub!=null?b.sub:b.total),tax:Number(b.tax||0),total:Number(b.total||0),paid:Number(b.paid||0),payment_mode:b.mode||'Cash',status:st,action_reason:b.actionReason||null,action_by:b.actionBy||null,action_at:toIsoOrNull(b.actionAt)};
}
function sbBillItemRows(b){return (b.items||[]).map(function(i){return {bill_id:b.id,product_name:i.p,qty_bottles:Number(i.q||0),rate_per_case:Number(i.r||0),case_size:Number(i.cs||1)}})}
function sbPaymentRow(p){return {id:p.id,payment_date:p.date||today(),customer_id:p.cust||null,bill_id:(p.bill&&p.bill!='-')?p.bill:null,amount:Number(p.amount||0),mode:p.mode||'Cash'}}
function sbStockRow(r){return {id:r.id,move_date:r.date||today(),move_type:r.type,item_name:r.item,qty:Number(r.qty||0),note:r.note||''}}
function sbExpenseRow(e){return {id:e.id,expense_date:e.date||today(),category:e.cat,note:e.note||'',amount:Number(e.amount||0)}}
function sbEmployeeRow(e){
 return {
  id:e.id,
  name:e.name,
  role:e.role||'',
  phone:e.phone||'',
  salary:Number(e.salary||0),
  address:e.address||'',
  photo_path:e.photoPath||'',
  portal_token:e.tok||null,
  application_id:e.app||null,
  joined_date:e.joined||today(),
  joined_at:toIsoOrNull(e.joinedAt)||new Date().toISOString()
 };
}
function sbIdentityRow(e){
 var rawAad=String(e.aadhaar||'').replace(/\D/g,'');
 var aLast4=rawAad.length>=4?rawAad.slice(-4):'';
 var rawPan=String(e.pan||'').trim().toUpperCase();
 var pLast4=rawPan.length>=4?rawPan.slice(-4):'';
 var rawLic=String(e.licenseNo||'').trim().replace(/[\s\/-]/g,'').toUpperCase();
 var lLast4=rawLic.length>=4?rawLic.slice(-4):'';
 return {
  employee_id:e.id,
  aadhaar:e.aadhaar?maskA(e.aadhaar):'',
  pan:e.pan?maskPan(e.pan):'',
  license_no:e.licenseNo?maskLicense(e.licenseNo):'',
  aadhaar_last4:aLast4||null,
  pan_last4:pLast4||null,
  license_last4:lLast4||null,
  photo_path:e.photoPath||'',
  aadhaar_doc_path:e.docPath||'',
  aadhaar_doc_type:e.docType||null,
  pan_doc_path:e.panDocPath||'',
  pan_doc_type:e.panDocType||null,
  license_doc_path:e.licenseDocPath||'',
  license_doc_type:e.licenseDocType||null
 };
}
function sbUpsertIdentity(e){
 if(!SB||!SESSION||!isOwner())return Promise.resolve();
 return SB.from('employee_identities').upsert(sbIdentityRow(e),{onConflict:'employee_id'}).then(sbCheck('employee_identities'));
}
function sbApplicationRow(a){
 return {
  id:a.id,
  invite_token:a.t||null,
  applied_date:a.date||today(),
  submitted_at:toIsoOrNull(a.submittedAt)||new Date().toISOString(),
  decided_at:toIsoOrNull(a.decidedAt)||null,
  retention_deadline:toIsoOrNull(a.retentionDeadline)||null,
  name:a.name,
  mobile:a.mobile,
  address:a.address,
  aadhaar:a.aadhaar?maskA(a.aadhaar):'',
  pan:a.pan?maskPan(a.pan):'',
  license_no:a.licenseNo?maskLicense(a.licenseNo):'',
  photo_path:a.photoPath||'',
  doc_path:a.docPath||'',
  doc_type:a.docType||null,
  pan_doc_path:a.panDocPath||'',
  pan_doc_type:a.panDocType||null,
  license_doc_path:a.licenseDocPath||'',
  license_doc_type:a.licenseDocType||null,
  status:a.status||'Pending'
 };
}
function sbAttendanceRow(a){return {id:a.id,att_date:a.date||today(),employee_id:a.emp||null,status:a.status||'Present',time_in:a.tin||null,time_out:a.tout||null}}
function sbAdvanceRow(v){return {id:v.id,adv_date:v.date||today(),employee_id:v.emp||null,amount:Number(v.amount||0),note:v.note||''}}
function sbVehicleRow(v){return {id:v.id,vehicle_number:v.number,vehicle_type:v.type,model:v.model||'',default_driver_id:v.driver||null,notes:v.notes||'',created_at:toIsoOrNull(v.createdAt)||new Date().toISOString()}}
function sbVehicleTripRow(t){
 return {id:t.id,vehicle_id:t.vehicle,employee_id:t.employee||null,start_reading:Number(t.startReading||0),fuel_type:t.fuelType||'',fuel_percent:Number(t.fuelPercent||0),battery_percent:t.batteryPercent!=null?Number(t.batteryPercent):null,start_condition:t.startCondition||'',safety_check:t.safetyCheck||'',start_notes:t.startNotes||'',start_media:t.startMedia||[],start_at:toIsoOrNull(t.startAt)||new Date().toISOString(),end_reading:t.endReading!=null?Number(t.endReading):null,end_fuel:t.endFuel!=null?Number(t.endFuel):null,end_battery:t.endBattery!=null?Number(t.endBattery):null,supervisor:t.supervisor||null,handover_condition:t.handoverCondition||null,damage:t.damage||null,end_media:t.endMedia||[],handover_at:toIsoOrNull(t.handoverAt),status:t.status||'Active'};
}
function sbRpc(fn,args){
 if(!SB||!SESSION)return Promise.reject(new Error('Supabase not authenticated'));
 return SB.rpc(fn,args||{}).then(sbCheck('rpc:'+fn)).then(function(res){
  return res.data;
 });
}
function sbCreateBill(d){
 var items=(d.items||[]).map(function(it){
  return {
   product_name:it.p||it.product_name,
   qty_bottles:Number(it.q!=null?it.q:it.qty_bottles||0),
   rate_per_case:Number(it.r!=null?it.r:it.rate_per_case||0),
   case_size:Number(it.cs!=null?it.cs:it.case_size||1)
  };
 });
 return sbRpc('create_bill',{
  p_customer_name:d.name||d.customer_name,
  p_mobile:d.mobile||d.phone,
  p_address:d.address||d.addr||'',
  p_items:items,
  p_bill_date:d.bill_date||d.date||today(),
  p_payment_mode:d.payment_mode||d.mode||'Cash',
  p_initial_payment:Number(d.initial_payment!=null?d.initial_payment:(d.paid||0)),
  p_is_gst:!!d.is_gst||!!d.gst,
  p_notes:d.notes||''
 });
}
function sbUpdateBill(d){
 var items=(d.items||[]).map(function(it){
  return {
   product_name:it.p||it.product_name,
   qty_bottles:Number(it.q!=null?it.q:it.qty_bottles||0),
   rate_per_case:Number(it.r!=null?it.r:it.rate_per_case||0),
   case_size:Number(it.cs!=null?it.cs:it.case_size||1)
  };
 });
 return sbRpc('update_bill',{
  p_bill_id:d.id||d.bill_id,
  p_customer_name:d.name||d.customer_name,
  p_mobile:d.mobile||d.phone,
  p_address:d.address||d.addr||'',
  p_items:items,
  p_bill_date:d.bill_date||d.date||today(),
  p_payment_mode:d.payment_mode||d.mode||'Cash',
  p_is_gst:!!d.is_gst||!!d.gst,
  p_notes:d.notes||''
 });
}
function sbCancelBill(billId,reason){
 return sbRpc('cancel_bill',{
  p_bill_id:billId,
  p_reason:reason||'Cancelled'
 });
}
function sbRecordPayment(d){
 return sbRpc('record_payment',{
  p_customer_id:d.customer_id||d.cust,
  p_bill_id:(d.bill_id||d.bill)==='-'?null:(d.bill_id||d.bill||null),
  p_amount:Number(d.amount||0),
  p_mode:d.mode||'Cash',
  p_payment_date:d.payment_date||d.date||today(),
  p_notes:d.notes||''
 });
}
function sbReversePayment(paymentId,reason){
 return sbRpc('reverse_payment',{
  p_payment_id:paymentId,
  p_reason:reason||'User reversed payment'
 });
}
function refreshBills(){
 if(!SB||!SESSION)return Promise.resolve();
 return Promise.all([
  safeFetch('bills',fetchAllRows('bills',[['bill_date',true],['id',true]])),
  safeFetch('bill_items',fetchAllRows('bill_items',[]))
 ]).then(function(res){
  var billRows=res[0]||[],itemRows=res[1]||[];
  var itemsByBill={};
  itemRows.forEach(function(r){if(!itemsByBill[r.bill_id])itemsByBill[r.bill_id]=[];itemsByBill[r.bill_id].push({p:r.product_name,q:Number(r.qty_bottles||0),r:Number(r.rate_per_case||0),cs:Number(r.case_size||1)})});
  var activeBills=[],cancelledBills=[],deletedBills=[];
  billRows.forEach(function(r){
   var b={id:r.id,date:r.bill_date||today(),cust:r.customer_id||'',name:r.customer_name||'',mobile:r.mobile||'',addr:r.address||'',gst:!!r.gst,sub:Number(r.subtotal!=null?r.subtotal:(r.total||0)),tax:Number(r.tax||0),total:Number(r.total||0),paid:Number(r.paid||0),mode:r.payment_mode||'Cash',items:itemsByBill[r.id]||[]};
   if(r.status=='cancelled'||r.status=='deleted'){
    b.archiveType=r.status=='cancelled'?'cancel':'delete';b.actionReason=r.action_reason||'';b.reason=r.action_reason||'';b.actionBy=r.action_by||'';b.actionAt=r.action_at||'';b.actionDate=r.action_at?dFull(r.action_at):'-';
    if(r.status=='cancelled'){b.cancelledAt=r.action_at||'';cancelledBills.push(b)}else{b.deletedAt=r.action_at||'';deletedBills.push(b)}
   }else activeBills.push(b);
  });
  S.bills=activeBills;S.cancelledBills=cancelledBills;S.deletedBills=deletedBills;syncPaid();return S.bills;
 });
}
function refreshPayments(){
 if(!SB||!SESSION)return Promise.resolve();
 return safeFetch('payments',fetchAllRows('payments',[['payment_date',true],['id',true]])).then(function(payRows){
  S.payments=(payRows||[]).map(function(r){return {id:r.id,date:r.payment_date||today(),cust:r.customer_id||'',bill:r.bill_id||'-',amount:Number(r.amount||0),mode:r.mode||'Cash',reversed_at:r.reversed_at||null,reversed_by:r.reversed_by||'',reversal_reason:r.reversal_reason||'',notes:r.notes||''}});
  syncPaid();return S.payments;
 });
}
function refreshCustomers(){
 if(!SB||!SESSION)return Promise.resolve();
 return safeFetch('customers',fetchAllRows('customers',[['created_date',true],['id',true]])).then(function(custRows){
  S.customers=(custRows||[]).map(function(r){return {id:r.id,name:r.name||'',phone:r.phone||'',area:r.area||'',date:r.created_date||today(),active:r.active!==false}});
  return S.customers;
 });
}
function sbUpsertBillWithItems(b,isEdit,status){
 if(isEdit)return sbUpdateBill(b);
 return sbCreateBill(b);
}
function sbArchiveBill(b,status){
 if(!SB||!SESSION)return Promise.resolve();
 if(status==='cancelled')return sbCancelBill(b.id,b.actionReason||b.reason||'Cancelled');
 return SB.from('bills').update({status:status,action_reason:b.actionReason,action_by:b.actionBy,action_at:toIsoOrNull(b.actionAt)}).eq('id',b.id).then(sbCheck('bills'));
}
function sbInsertPayment(p,billPaid){
 if(!SB||!SESSION)return Promise.resolve();
 return sbRecordPayment(p);
}
function sbDeletePayment(id,billId,newPaid){
 if(!SB||!SESSION)return Promise.resolve();
 return sbReversePayment(id,'User reversed payment');
}
function sbInsertRow(table,row){if(!SB||!SESSION)return Promise.resolve();return SB.from(table).insert(row).then(sbCheck(table))}
function sbDeleteRow(table,id){if(!SB||!SESSION)return Promise.resolve();return SB.from(table).delete().eq('id',id).then(sbCheck(table))}
function sbUpsertRow(table,row){if(!SB||!SESSION)return Promise.resolve();return SB.from(table).upsert(row).then(sbCheck(table))}
function sbUpdateRow(table,id,patch){if(!SB||!SESSION)return Promise.resolve();return SB.from(table).update(patch).eq('id',id).then(sbCheck(table))}
function sbDeleteIdentity(employeeId){if(!SB||!SESSION)return Promise.resolve();return SB.from('employee_identities').delete().eq('employee_id',employeeId).then(sbCheck('employee_identities'))}
/* ---------- navigation ---------- */
var PERMS={
 owner:{
  pages:['dashboard','new-bill','bills','customers','payments','outstanding','stock-in','stock-out','current-stock','stock-history','diesel','expenses','employees','attendance','timings','advances','vehicles','rep-sales','rep-pay','rep-stock','rep-exp','backup','settings','users','activity-log'],
  tabs:[['dashboard','Home','home'],['new-bill','New Bill','plus'],['bills','Bills','doc'],['customers','Customers','users']],
  actions:['create_bill','cancel_bill','edit_bill','create_customer','edit_customer','create_payment','reverse_payment','stock_in','stock_out','create_expense','delete_expense','manage_employees','manage_attendance','manage_advances','manage_vehicles','manage_settings','manage_users','view_activity_log','export_backup']
 },
 manager:{
  pages:['dashboard','new-bill','bills','customers','payments','outstanding','stock-in','stock-out','current-stock','stock-history','diesel','expenses','employees','attendance','timings','advances','vehicles','rep-sales','rep-pay','rep-stock','rep-exp'],
  tabs:[['dashboard','Home','home'],['new-bill','New Bill','plus'],['bills','Bills','doc'],['customers','Customers','users']],
  actions:['create_bill','cancel_bill','edit_bill','create_customer','edit_customer','create_payment','reverse_payment','stock_in','stock_out','create_expense','delete_expense','manage_employees','manage_attendance','manage_advances','manage_vehicles']
 },
 accountant:{
  pages:['dashboard','bills','customers','payments','outstanding','current-stock','stock-history','diesel','expenses','employees','attendance','timings','advances','vehicles','rep-sales','rep-pay','rep-stock','rep-exp'],
  tabs:[['dashboard','Home','home'],['bills','Bills','doc'],['payments','Payments','card'],['expenses','Expenses','list']],
  actions:['create_payment','reverse_payment','create_expense','delete_expense','manage_advances','manage_payslips']
 },
 billing_staff:{
  pages:['dashboard','new-bill','bills','customers','payments','outstanding','current-stock'],
  tabs:[['dashboard','Home','home'],['new-bill','New Bill','plus'],['bills','Bills','doc'],['customers','Customers','users']],
  actions:['create_bill','cancel_bill','create_customer','edit_customer','create_payment']
 },
 driver:{
  pages:['vehicles'],
  tabs:[['vehicles','Vehicles','box']],
  actions:['record_trip']
 }
};
function canPage(pageId){
 var role=CURRENT_ROLE;
 if(!role||!PERMS[role])return false;
 return PERMS[role].pages.indexOf(pageId)!==-1;
}
function canAct(actionId){
 var role=CURRENT_ROLE;
 if(!role||!PERMS[role])return false;
 return PERMS[role].actions.indexOf(actionId)!==-1;
}
function firstAllowedPage(){
 var role=CURRENT_ROLE;
 if(role&&PERMS[role]&&PERMS[role].pages.length)return PERMS[role].pages[0];
 return 'dashboard';
}

var NAV=[
 ['',[['dashboard','Dashboard','home']]],
 ['Billing',[['new-bill','New Bill','plus'],['bills','All Bills','doc'],['customers','Customers','users'],['payments','Payments','card'],['outstanding','Credit / Outstanding','clock']]],
 ['Stock',[['stock-in','Stock In (Purchase)','box'],['stock-out','Stock Out (Delivery)','box'],['current-stock','Current Stock','box'],['stock-history','Stock History','hist']]],
 ['Expenses',[['diesel','Diesel Expenses','fuel'],['expenses','Other Expenses','list']]],
 ['Employees',[['employees','Employee Management','users'],['attendance','Attendance','cal'],['timings','In / Out Timings','clock'],['advances','Advances / Salary','wallet']]],
 ['',[['vehicles','Vehicle Management','box']]],
 ['Reports',[['rep-sales','Sales Reports','bars'],['rep-pay','Payment Reports','doc'],['rep-stock','Stock Reports','box'],['rep-exp','Expense Reports','list'],['backup','Backup & Data Export','download']]],
 ['Settings',[['settings','Business Settings','gear'],['users','User Management','users'],['activity-log','Activity Log','hist']]]
];
var TITLES={},NAVOPEN={},LASTCUR='';
function groupOf(id){for(var i=0;i<NAV.length;i++)for(var j=0;j<NAV[i][1].length;j++)if(NAV[i][1][j][0]==id)return NAV[i][0]||''}
function buildNav(cur){
 var g0=groupOf(cur);if(cur!=LASTCUR&&g0)NAVOPEN[g0]=true;LASTCUR=cur;
 var h='';
 NAV.forEach(function(g){
  var allowed=g[1].filter(function(i){return canPage(i[0])});
  if(!allowed.length)return;
  var links=allowed.map(function(i){TITLES[i[0]]=i[1];return '<a href="#'+i[0]+'" class="'+(i[0]==cur?'on':'')+'"'+(i[0]==cur?' aria-current="page"':'')+'>'+ic(i[2])+i[1]+'</a>'}).join('');
  if(!g[0]){h+=links;return}
  var open=!!NAVOPEN[g[0]];
  h+='<button type="button" class="grp'+(g[0]==g0?' has':'')+'" data-grp="'+g[0]+'" aria-expanded="'+open+'">'+g[0]+ic('chev')+'</button><div class="sub"'+(open?'':' hidden')+'>'+links+'</div>';
 });
 $('#nav').innerHTML=h;
}
function closeMenu(){$('#side').classList.remove('open');$('#scrim').classList.remove('open')}

/* ---------- dashboard ---------- */
function ago(d){var n=Math.round((new Date(today())-new Date(d))/864e5);return n<=0?'Today':n+'d ago'}
function dayBills(d){return S.bills.filter(function(b){return b.date==d})}
function dayOff(n){var x=new Date();x.setDate(x.getDate()-n);return ymd(x)}
function pct(a,b){if(!b)return {t:'new',up:true};var p=Math.round((a-b)/b*100);return {t:Math.abs(p)+'%',up:p>=0}}
function arrow(p,suffix){return '<em style="color:'+(p.up?'var(--green)':'var(--red)')+'">'+(p.up?'↑':'↓')+' '+p.t+' '+suffix+'</em>'}
function heroArt(){var nm=esc(S.settings.name),sh=esc(S.settings.name.split(/\s+/).map(function(w){return w[0]||''}).join('').slice(0,3).toUpperCase());return '<svg class="art" viewBox="0 0 1200 240" preserveAspectRatio="xMaxYMid slice" aria-hidden="true">'+
 '<defs><linearGradient id="mt" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7aa7d6"/><stop offset="1" stop-color="#b9d6ee"/></linearGradient><linearGradient id="bt" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#cfe9ff"/><stop offset="1" stop-color="#5fb0ee"/></linearGradient></defs>'+
 '<path d="M520 190 640 90l60 50 90-80 110 100 120-60 110 90v40H520z" fill="url(#mt)" opacity=".85"/>'+
 '<rect x="860" y="130" width="320" height="90" fill="#eef3f8"/><rect x="860" y="118" width="320" height="16" fill="#cfd9e6"/><text x="1020" y="170" font-size="22" font-weight="800" fill="#1368e8" text-anchor="middle">'+nm+'</text><text x="1020" y="190" font-size="11" fill="#46597a" text-anchor="middle">WATER PLANT</text>'+
 '<rect x="40" y="226" width="1120" height="20" fill="#2f8f4a" opacity=".0"/>'+
 '<g transform="translate(560 100)"><rect x="0" y="30" width="210" height="82" rx="6" fill="#fff"/><rect x="170" y="48" width="70" height="64" rx="8" fill="#f4f7fb"/><rect x="180" y="56" width="40" height="22" rx="3" fill="#7fb8e8"/><circle cx="40" cy="116" r="14" fill="#25324a"/><circle cx="190" cy="116" r="14" fill="#25324a"/><text x="95" y="76" font-size="18" font-weight="800" fill="#1368e8" text-anchor="middle">'+nm+'</text><path d="M95 38c-8 10-12 15-12 20a12 12 0 0 0 24 0c0-5-4-10-12-20z" fill="#1f7bff" opacity=".0"/></g>'+
 '<g><rect x="900" y="196" width="22" height="28" rx="5" fill="url(#bt)"/><rect x="928" y="200" width="22" height="26" rx="5" fill="url(#bt)"/><rect x="956" y="196" width="22" height="28" rx="5" fill="url(#bt)"/><rect x="984" y="200" width="22" height="26" rx="5" fill="url(#bt)"/><rect x="1012" y="196" width="22" height="28" rx="5" fill="url(#bt)"/></g>'+
 '<g transform="translate(60 18)"><rect x="40" y="26" width="92" height="160" rx="30" fill="url(#bt)" stroke="#9cc9ee"/><rect x="62" y="6" width="48" height="26" rx="8" fill="#9cc9ee"/><rect x="48" y="96" width="76" height="46" rx="8" fill="#fff"/><text x="86" y="124" font-size="20" font-weight="800" fill="#1368e8" text-anchor="middle">'+sh+'</text></g>'+
 '<g transform="translate(190 80)"><rect x="40" y="26" width="64" height="110" rx="22" fill="url(#bt)" stroke="#9cc9ee"/><rect x="56" y="10" width="32" height="20" rx="6" fill="#9cc9ee"/><rect x="48" y="70" width="48" height="34" rx="6" fill="#fff"/><text x="72" y="92" font-size="15" font-weight="800" fill="#1368e8" text-anchor="middle">'+sh+'</text></g>'+
 '<path d="M0 232c120-18 220 16 360 0s240-20 360 0 240 14 480-6V240H0z" fill="#5fb0ee" opacity=".55"/></svg>'}

var UP={'new-bill':1};
function dashboard(){
 var t=today(),y=dayOff(1);
 var ts=sum(dayBills(t),function(b){return b.total}),ys=sum(dayBills(y),function(b){return b.total});
 var tc=sum(dayBills(t),function(b){return b.paid}),yc=sum(dayBills(y),function(b){return b.paid});
 var out=outstanding(),yo=out-sum(dayBills(t),function(b){return b.total-b.paid});
 var mon=t.slice(0,7),newC=S.customers.filter(function(c){return c.date.slice(0,7)==mon}).length;
 var days=[],lab=[];for(var i=6;i>=0;i--){var d=dayOff(i);days.push(d);lab.push(['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][new Date(d+'T00:00').getDay()])}
 var sales=days.map(function(d){return sum(dayBills(d),function(b){return b.total})}),col=days.map(function(d){return sum(dayBills(d),function(b){return b.paid})});
 var mx=Math.max.apply(null,sales.concat(col).concat([1])),top=Math.ceil(mx/5000)*5000||5000,ch='';
 for(var g=0;g<=4;g++){var yy=20+g*40;ch+='<line x1="52" x2="560" y1="'+yy+'" y2="'+yy+'" stroke="var(--line)"/><text x="44" y="'+(yy+4)+'" font-size="11" fill="var(--muted)" text-anchor="end">'+(g==4?'0':'₹'+((top/4*(4-g))/1000)+'K')+'</text>'}
 days.forEach(function(d,i){var x=70+i*70,h1=sales[i]/top*160,h2=col[i]/top*160;
  ch+='<rect x="'+x+'" y="'+(180-h1)+'" width="22" height="'+h1+'" rx="3" fill="#1368e8"><title>'+lab[i]+' sales '+inr(sales[i])+'</title></rect><rect x="'+(x+26)+'" y="'+(180-h2)+'" width="22" height="'+h2+'" rx="3" fill="#18a957"><title>'+lab[i]+' collections '+inr(col[i])+'</title></rect><text x="'+(x+24)+'" y="200" font-size="11" fill="var(--muted)" text-anchor="middle">'+lab[i]+'</text>'});
 var pc={};S.bills.filter(function(b){return b.date.slice(0,7)==mon}).forEach(function(b){b.items.forEach(function(it){pc[it.p]=(pc[it.p]||0)+it.q})});
 var pn=Object.keys(pc).filter(function(k){return Number.isFinite(pc[k])&&pc[k]>0}),tot=sum(pn,function(k){return pc[k]})||1,cols=['#1368e8','#7c4dff','#14b8c4','#f59e0b'],C=2*Math.PI*60,off=0,dn='';
 pn.forEach(function(k,i){var L=pc[k]/tot*C;dn+='<circle cx="85" cy="85" r="60" fill="none" stroke="'+cols[i%4]+'" stroke-width="22" stroke-dasharray="'+L+' '+(C-L)+'" stroke-dashoffset="'+(-off)+'" transform="rotate(-90 85 85)"/>';off+=L});
 var dl=pn.map(function(k,i){return '<div><i style="background:'+cols[i%4]+'"></i><span>'+esc(k)+' Bottles</span><b>'+Math.round(pc[k]).toLocaleString('en-IN')+' ('+Math.round(pc[k]/tot*100)+'%)</b></div>'}).join('');
 var ev=[];
 S.bills.slice(-1).forEach(function(b){ev.push(['doc','var(--brand-soft)','var(--brand)','New Bill #'+b.id,inr(b.total)+' - '+b.mode,'2 min ago'])});
 S.payments.slice(-1).forEach(function(p){ev.push(['rupee','var(--green-soft)','var(--green)','Payment Received',inr(p.amount)+' - '+p.mode,'15 min ago'])});
 S.stock.filter(function(r){return r.type=='Out'}).slice(-1).forEach(function(r){ev.push(['box','var(--amber-soft)','var(--amber)','Stock Out',r.item+' - '+r.qty,'32 min ago'])});
 S.expenses.slice(-1).forEach(function(r){ev.push(['fuel','var(--red-soft)','var(--red)',r.cat+' Expense Added',inr(r.amount),'1 hour ago'])});
 S.customers.slice(-1).forEach(function(c){ev.push(['user','var(--brand-soft)','var(--brand)','New Customer Added',c.name,'2 hours ago'])});
 var act=ev.map(function(e){return '<li><span class="dot" style="background:'+e[1]+';color:'+e[2]+'">'+ic(e[0])+'</span><div><b>'+esc(e[3])+'</b><small>'+esc(e[4])+'</small></div><time>'+e[5]+'</time></li>'}).join('');
 var lv=stockLevels(),lows=Object.keys(lv).map(function(k){return [k,lv[k]]}).filter(function(a){return a[1]<=S.settings.low*1.5}).sort(function(a,b){return a[1]-b[1]}).slice(0,4);
 var low=lows.length?lows.map(function(a){var L=a[1]<=S.settings.low*.6,cl=L?'var(--red)':'var(--amber)';return '<li><span class="ico">'+ic('box')+'</span><div class="t"><b>'+esc(a[0])+'</b><small>'+a[1]+' left</small></div><div class="bar"><i style="width:'+Math.min(100,a[1]/S.settings.low/1.5*100)+'%;background:'+cl+'"></i></div><span class="pill '+(L?'p-red':'p-amber')+'">'+(L?'Low':'Medium')+'</span></li>'}).join(''):'<li class="empty">All stock levels are healthy.</li>';
 var dv=[['AP 39 AB 1234','12 Deliveries - 240 Bottles','On Route','p-green'],['AP 39 CD 5678','8 Deliveries - 160 Bottles','On Route','p-green'],['AP 39 EF 9012','Completed - 180 Bottles','Completed','p-blue'],['AP 39 GH 3456','5 Deliveries - 100 Bottles','Pending','p-amber']];
 var truck='<svg class="tr" viewBox="0 0 48 32" fill="currentColor"><rect x="1" y="6" width="28" height="18" rx="2"/><path d="M31 11h9l6 7v6H31z"/><circle cx="11" cy="26" r="4" stroke="var(--surface)" stroke-width="2"/><circle cx="38" cy="26" r="4" stroke="var(--surface)" stroke-width="2"/></svg>';
 var dh=dv.map(function(v){return '<li>'+truck+'<div class="t"><b>Vehicle '+v[0]+'</b><small>'+v[1]+'</small></div><span class="pill '+v[3]+'">'+v[2]+'</span></li>'}).join('');
 var q=function(h,c,i,l){return '<button class="'+c+'" data-go="'+h+'">'+ic(i)+l+'</button>'};
 return '<section class="hero">'+heroArt()+'<div class="welcome"><b>Welcome Back!</b><h1>'+esc(S.settings.owner)+' 👋</h1><p>Here’s your business overview for today</p><div class="quote">“Clean Water<br>Healthy Life<br>Happier Customers”</div></div><div class="pure"><svg width="34" height="34" viewBox="0 0 24 24" fill="#18a957"><path d="M12 22c0-8-6-9-9-9 0 6 4 9 9 9zm0 0c0-9 5-12 9-12 0 7-4 12-9 12zM12 12C12 6 9 3 7 2c-1 4 1 8 5 10z"/></svg><span>Pure Water<br>Better Tomorrow</span></div></section>'+
 '<section class="stat-group"><h3 class="stat-group-title"><span class="group-mark"></span>Business Summary <small>All-time performance</small></h3><div class="stats"><div class="stat s-blue"><span class="ic">'+ic('bars')+'</span><div><small>Total Sales</small><strong>'+inr(sum(S.bills,function(b){return b.total}))+'</strong><em>All recorded bills</em></div></div>'+
 '<div class="stat s-green"><span class="ic">'+ic('wallet')+'</span><div><small>Total Collections</small><strong>'+inr(sum(S.payments,function(p){return p.amount}))+'</strong><em>All recorded payments</em></div></div>'+
 '<div class="stat s-red"><span class="ic">'+ic('clock')+'</span><div><small>Total Outstanding</small><strong>'+inr(out)+'</strong><em>All unpaid bill balances</em></div></div></div></section>'+
 '<section class="stat-group"><h3 class="stat-group-title"><span class="group-mark" style="background:var(--green)"></span>Daily Performance <small>Today at a glance</small></h3><div class="stats"><div class="stat s-green"><span class="ic">'+ic('bars')+'</span><div><small>Today’s Sales</small><strong>'+inr(ts)+'</strong>'+arrow(pct(ts,ys),'from yesterday')+'</div></div>'+
 '<div class="stat s-red"><span class="ic">'+ic('wallet')+'</span><div><small>Today’s Collections</small><strong>'+inr(tc)+'</strong>'+arrow(pct(tc,yc),'from yesterday')+'</div></div>'+
 '<div class="stat s-amber"><span class="ic">'+ic('clock')+'</span><div><small>Today’s Outstanding</small><strong>'+inr(sum(dayBills(t),function(b){return Math.max(0,b.total-b.paid)}))+'</strong><em>Due on bills created today</em></div></div></div></section>'+
 '<section class="stat-group"><h3 class="stat-group-title"><span class="group-mark" style="background:#7c4dff"></span>Customers <small>Customer overview</small></h3><div class="stats"><div class="stat s-blue"><span class="ic">'+ic('users')+'</span><div><small>Total Customers</small><strong>'+S.customers.length+'</strong><em>All registered customers</em></div></div>'+
 '<div class="stat s-blue"><span class="ic">'+ic('users')+'</span><div><small>Today’s New Customers</small><strong>'+S.customers.filter(function(c){return c.date==t}).length+'</strong><em>Added today</em></div></div></div></section>'+
 '<section class="grid3"><div class="card"><div class="card-h"><h3>Sales Overview</h3><select class="sel" aria-label="Range"><option>This Week</option></select></div><div class="legend"><span><i style="background:#1368e8"></i>Sales</span><span><i style="background:#18a957"></i>Collections</span></div><div class="chart"><svg viewBox="0 0 580 210" role="img" aria-label="Sales and collections for the last 7 days">'+ch+'</svg></div></div>'+
 '<div class="card"><div class="card-h"><h3>Bottle Sales (This Month)</h3></div><div class="donut"><svg viewBox="0 0 170 170" role="img" aria-label="Bottle sales by size">'+dn+'<text x="85" y="84" font-size="24" font-weight="800" fill="var(--fg)" text-anchor="middle">'+tot.toLocaleString('en-IN')+'</text><text x="85" y="104" font-size="12" fill="var(--muted)" text-anchor="middle">Bottles</text></svg><div class="dl">'+dl+'</div></div></div>'+
 '<div class="card"><div class="card-h"><h3>Recent Activity</h3><a class="link" href="#stock-history">View All</a></div><ul class="act">'+act+'</ul></div></section>'+
 '<section class="grid3b"><div class="card"><div class="card-h"><h3>Quick Actions</h3></div><div class="qa">'+q('new-bill','q-blue','doc','Create New Bill')+q('customers','q-lb','user','Add Customer')+q('stock-in','q-g','box','Stock In')+q('stock-out','q-o','box','Stock Out')+q('expenses','q-r','fuel','Add Expense')+q('attendance','q-v','check','Mark Attendance')+'</div></div>'+
 '<div class="card"><div class="card-h"><h3>Low Stock Alert</h3><a class="link" href="#current-stock">View All</a></div><ul class="low">'+low+'</ul></div>'+
 '<div class="card"><div class="card-h"><h3>Today’s Deliveries</h3><a class="link" href="#stock-out">View All</a></div><ul class="del">'+dh+'</ul></div></section>'+
 '<section class="foot"><div>'+ic('box','style="color:var(--brand)"')+'<span><b>100% Pure &amp; Safe</b><small>RO Purified Water</small></span></div><div>'+ic('user','style="color:var(--red)"')+'<span><b>Healthy Families</b><small>Our Joy</small></span></div><div>'+ic('fuel','style="color:var(--brand)"')+'<span><b>On-Time Delivery</b><small>Always</small></span></div><div>'+ic('home','style="color:var(--green)"')+'<span><b>Clean Environment</b><small>Brighter Future</small></span></div></section>';
}
/* ---------- generic page helpers ---------- */
var PRODUCTS=function(){return [['20 Ltr',S.settings.rate20],['10 Ltr',S.settings.rate10],['5 Ltr',S.settings.rate5]]};
var ITEMS=['20 Ltr Empty Bottles','10 Ltr Empty Bottles','5 Ltr Empty Bottles','Jar Caps','Sealing Caps'];
function fld(f){var id='f-'+f.k,v=f.v!=null?f.v:(f.t=='date'?today():'');
 if(f.t=='select')return '<div class="fld"><label for="'+id+'">'+f.l+'</label><select id="'+id+'" name="'+f.k+'">'+f.o.map(function(o){o=[].concat(o);return '<option value="'+esc(o[0])+'">'+esc(o.length>1?o[1]:o[0])+'</option>'}).join('')+'</select></div>';
 return '<div class="fld"><label for="'+id+'">'+f.l+'</label><input id="'+id+'" name="'+f.k+'" type="'+(f.t||'text')+'" value="'+esc(v)+'"'+(f.t=='number'?' min="0" step="any" inputmode="decimal"':'')+(f.r===false?'':' required')+'></div>'}
function table(cols,rows,empty){if(!rows.length)return '<div class="card tw"><div class="empty">'+(empty||'Nothing here yet.')+'</div></div>';
 return '<div class="card tw" style="padding:6px"><table><thead><tr>'+cols.map(function(c){return '<th>'+c+'</th>'}).join('')+'</tr></thead><tbody>'+rows.map(function(r){return '<tr>'+r.map(function(c,i){return '<td data-l="'+esc(cols[i]||'')+'">'+c+'</td>'}).join('')+'</tr>'}).join('')+'</tbody></table></div>'}
function del(coll,id){
 if(coll=='stock'&&!(canAct('stock_in')||canAct('stock_out')))return '';
 if(coll=='expenses'&&!canAct('delete_expense'))return '';
 if(coll=='employees'&&!isOwner())return '';
 if(coll=='attendance'&&!canAct('manage_attendance'))return '';
 if(coll=='advances'&&!isOwner())return '';
 return '<button class="btn sm danger" data-del="'+coll+':'+id+'" aria-label="Delete">Delete</button>';
}
function head(t,extra){return '<div class="ph"><h2>'+t+'</h2>'+(extra||'')+'</div>'}
function formCard(fields,btn,id){return '<form class="card form" id="'+id+'" autocomplete="off">'+fields.map(fld).join('')+'<div class="fld"><button class="btn" type="submit" style="width:100%;height:42px">'+btn+'</button></div></form>'}
function kp(a){return '<div class="kpis">'+a.map(function(k){return '<div class="kpi"><small>'+k[0]+'</small><b>'+k[1]+'</b></div>'}).join('')+'</div>'}
var custOpts=function(){return S.customers.filter(function(c){return c.active!==false}).map(function(c){return [c.id,c.name]})};
var empOpts=function(){return S.employees.map(function(c){return [c.id,c.name]})};
var MODES=['Cash','PhonePe','GPay','Bank Transfer','Cheque'];

/* each form: submit handler gets values object */
var FORMS={};
function allocate(cust,amt,mode,date){
 if(!canAct('create_payment'))return Promise.resolve();
 return sbRecordPayment({customer_id:cust,amount:amt,mode:mode,payment_date:date,notes:'Customer payment'}).then(function(res){
  if(res&&res.payment){var p=res.payment;S.payments.push({id:p.id,date:p.payment_date||date,cust:p.customer_id||cust,amount:Number(p.amount||amt),mode:p.mode||mode,bill:p.bill_id||'-',reversed_at:null,reversed_by:'',reversal_reason:'',notes:p.notes||''})}
  save();refreshPayments().then(function(){refreshBills().then(function(){render()})});
 });
}

var USERS_LIST=null,USERS_LOADING=false,USERS_ERR='';
function sbApi(path,method,body){
 var token=(SESSION&&SESSION.access_token)||'';
 var opt={
  method:method||'GET',
  headers:{'authorization':'Bearer '+token,'content-type':'application/json'}
 };
 if(body)opt.body=JSON.stringify(body);
 return fetch(path,opt).then(function(r){
  return r.json().catch(function(){return {}}).then(function(data){
   if(!r.ok){
    var err=new Error((data&&data.error)||'Request failed ('+r.status+')');
    err.status=r.status;
    throw err;
   }
   return data;
  });
 });
}


var AUDIT_LOGS=null,AUDIT_LOADING=false,AUDIT_ERR='';
var AUDIT_FILTERS={from:'',to:'',user:'',table:'',action:''};

function maskAuditJson(val){
 if(!val||typeof val!=='object')return val;
 if(Array.isArray(val))return val.map(maskAuditJson);
 var out={};
 for(var k in val){
  if(!Object.prototype.hasOwnProperty.call(val,k))continue;
  var lk=k.toLowerCase(),v=val[k];
  if(lk.indexOf('aadhaar')!==-1&&typeof v==='string'&&v.trim()){
   var clean=v.replace(/\D/g,'');
   out[k]=clean.length>=4?'XXXX XXXX '+clean.slice(-4):'XXXX XXXX ****';
  }else if(lk.indexOf('pan')!==-1&&typeof v==='string'&&v.trim()){
   out[k]=v.length>=4?v.slice(0,2)+'*****'+v.slice(-2):'*****';
  }else if(typeof v==='object'&&v!==null){
   out[k]=maskAuditJson(v);
  }else{
   out[k]=v;
  }
 }
 return out;
}

function fetchAuditLogs(){
 if(!isOwner()||!SB||!SESSION)return Promise.resolve([]);
 AUDIT_LOADING=true;
 AUDIT_ERR='';
 var q=SB.from('audit_log').select('*').order('at',{ascending:false}).limit(250);
 if(AUDIT_FILTERS.from)q=q.gte('at',AUDIT_FILTERS.from+'T00:00:00Z');
 if(AUDIT_FILTERS.to)q=q.lte('at',AUDIT_FILTERS.to+'T23:59:59.999Z');
 if(AUDIT_FILTERS.table)q=q.eq('table_name',AUDIT_FILTERS.table);
 if(AUDIT_FILTERS.user)q=q.eq('user_id',AUDIT_FILTERS.user);
 if(AUDIT_FILTERS.action)q=q.eq('action',AUDIT_FILTERS.action);
 return q.then(function(res){
  AUDIT_LOADING=false;
  if(res.error)throw res.error;
  AUDIT_LOGS=res.data||[];
  if(PAGE_IS('activity-log'))render();
  return AUDIT_LOGS;
 }).catch(function(err){
  AUDIT_LOADING=false;
  AUDIT_ERR=(err&&err.message)||'Failed to load activity logs';
  if(PAGE_IS('activity-log'))render();
  return [];
 });
}

function formatAuditUser(userId,role){
 if(!userId)return '<span class="muted">System / Background</span>';
 if(SESSION&&SESSION.user&&SESSION.user.id===userId){
  return '<b>You</b> <small class="muted">('+esc(SESSION.user.email||'Owner')+')</small>';
 }
 if(USERS_LIST&&USERS_LIST.length){
  var u=USERS_LIST.filter(function(x){return x.user_id===userId})[0];
  if(u)return '<b>'+esc(u.full_name||u.email)+'</b> <small class="muted">('+esc(u.email||u.role)+')</small>';
 }
 return '<code>'+esc(userId.slice(0,8))+'…</code>'+(role?' <small class="muted">('+esc(role)+')</small>':'');
}

function showAuditDetailModal(id){
 var log=(AUDIT_LOGS||[]).filter(function(x){return x.id===id})[0];
 if(!log)return;
 var maskedOld=maskAuditJson(log.old);
 var maskedNew=maskAuditJson(log.new);
 var actPill=log.action==='INSERT'?'<span class="pill p-green">INSERT</span>':log.action==='UPDATE'?'<span class="pill p-amber">UPDATE</span>':'<span class="pill p-red">DELETE</span>';
 var userDisplay=formatAuditUser(log.user_id,log.role);

 var html='<div class="bill-modal-title"><span class="mark" style="background:var(--brand-soft);color:var(--brand)">📋</span>'+
  '<div><h3 style="text-align:left;margin:0">Audit Record Details</h3>'+
  '<small class="muted">'+esc(log.table_name)+' · ID: '+esc(log.row_id)+' · '+dFull(log.at)+'</small></div></div>'+
  '<div style="text-align:left;margin:14px 0;display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px;background:var(--bg);padding:12px;border-radius:8px">'+
  '<div><small class="muted">Action</small><br>'+actPill+'</div>'+
  '<div><small class="muted">Table Name</small><br><b>'+esc(log.table_name)+'</b></div>'+
  '<div><small class="muted">Row ID</small><br><code>'+esc(log.row_id)+'</code></div>'+
  '<div><small class="muted">Actor</small><br>'+userDisplay+'</div>'+
  '<div><small class="muted">Role</small><br><span class="pill">'+esc(log.role||'auth')+'</span></div>'+
  '<div><small class="muted">Timestamp</small><br><span>'+dFull(log.at)+'</span></div>'+
  '</div>';

 if(log.action==='INSERT'){
  html+='<h4 style="margin:14px 0 6px">Inserted Row Data</h4>'+
   '<pre style="background:var(--surface);border:1px solid var(--line);border-radius:6px;padding:12px;font-size:12px;overflow-x:auto;max-height:300px">'+
   esc(JSON.stringify(maskedNew,null,2))+'</pre>';
 }else if(log.action==='DELETE'){
  html+='<h4 style="margin:14px 0 6px">Deleted Row Data</h4>'+
   '<pre style="background:var(--surface);border:1px solid var(--line);border-radius:6px;padding:12px;font-size:12px;overflow-x:auto;max-height:300px">'+
   esc(JSON.stringify(maskedOld,null,2))+'</pre>';
 }else{
  var changes=[],allKeys={};
  if(maskedOld)Object.keys(maskedOld).forEach(function(k){allKeys[k]=true});
  if(maskedNew)Object.keys(maskedNew).forEach(function(k){allKeys[k]=true});
  for(var k in allKeys){
   var ov=maskedOld?maskedOld[k]:undefined,nv=maskedNew?maskedNew[k]:undefined;
   if(JSON.stringify(ov)!==JSON.stringify(nv))changes.push({key:k,oldVal:ov,newVal:nv});
  }
  if(changes.length){
   html+='<h4 style="margin:14px 0 6px">Modified Fields ('+changes.length+')</h4>'+
    '<div style="overflow-x:auto;margin-bottom:14px"><table class="t" style="width:100%;font-size:12px">'+
    '<thead><tr><th>Field</th><th>Previous Value</th><th>New Value</th></tr></thead><tbody>'+
    changes.map(function(ch){
     var ovStr=ch.oldVal!==undefined?esc(typeof ch.oldVal==='object'?JSON.stringify(ch.oldVal):String(ch.oldVal)):'<em class="muted">none</em>';
     var nvStr=ch.newVal!==undefined?esc(typeof ch.newVal==='object'?JSON.stringify(ch.newVal):String(ch.newVal)):'<em class="muted">none</em>';
     return '<tr><td><b>'+esc(ch.key)+'</b></td><td style="color:var(--red)">'+ovStr+'</td><td style="color:var(--green)">'+nvStr+'</td></tr>';
    }).join('')+'</tbody></table></div>';
  }
  html+='<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">'+
   '<div><h4 style="margin:0 0 6px">Full Old Record</h4><pre style="background:var(--surface);border:1px solid var(--line);border-radius:6px;padding:10px;font-size:11px;overflow-x:auto;max-height:220px">'+esc(JSON.stringify(maskedOld,null,2))+'</pre></div>'+
   '<div><h4 style="margin:0 0 6px">Full New Record</h4><pre style="background:var(--surface);border:1px solid var(--line);border-radius:6px;padding:10px;font-size:11px;overflow-x:auto;max-height:220px">'+esc(JSON.stringify(maskedNew,null,2))+'</pre></div>'+
   '</div>';
 }

 html+='<div class="dact" style="margin-top:16px"><button type="button" class="btn alt" data-nb="close">Close</button></div>';
 openModal(html,true);
}

var PAGES={
 dashboard:dashboard,
 'new-bill':function(){return newBillPage()},
 bills:function(){return allBillsPage()},
 customers:function(){FORMS.cf=function(v){if(!canAct('create_customer'))return 'Not permitted';var n={id:nid('C',S.customers),name:v.name,phone:v.phone,area:v.area,date:today(),active:true};S.customers.push(n);sbUpsertCustomer(n);return 'Customer added'};
  var canAdd=canAct('create_customer'),canEdit=canAct('edit_customer');
  return head('Customers')+(canAdd?formCard([{k:'name',l:'Name'},{k:'phone',l:'Phone',t:'tel',r:false},{k:'area',l:'Address',r:false}],'Add Customer','cf'):'')+table(['Name','Phone','Address','Outstanding',''],S.customers.map(function(c){var o=outstanding(c.id);return [esc(c.name)+(c.active===false?' <span class="pill">Inactive</span>':''),esc(c.phone),esc(c.area),'<span class="pill '+(o>0?'p-amber':'p-green')+'">'+inr(o)+'</span>',canEdit?('<button type="button" class="btn sm '+(c.active===false?'green':'alt')+'" data-cu="toggle-active" data-id="'+c.id+'">'+(c.active===false?'Activate':'Make Inactive')+'</button>'):'']}))},
 payments:function(){FORMS.pf=function(v){if(!canAct('create_payment'))return 'Not permitted';var a=+v.amount;if(!(a>0))return 'Enter an amount';allocate(v.cust,a,v.mode,v.date);return 'Payment recorded'};
  var canCreate=canAct('create_payment'),canRev=canAct('reverse_payment');
  return head('Payments')+(canCreate?formCard([{k:'cust',l:'Customer',t:'select',o:custOpts()},{k:'amount',l:'Amount (₹)',t:'number'},{k:'mode',l:'Mode',t:'select',o:MODES},{k:'date',l:'Date',t:'date'}],'Receive Payment','pf'):'')+table(['Date','Customer','Amount','Mode','Against bill',''],S.payments.slice().reverse().map(function(p){return [p.date,esc(custName(p.cust)),money(p.amount),esc(p.mode),p.bill=='-'?'Advance':'#'+esc(p.bill),p.amount>0?(canRev?'<button type="button" class="btn sm danger" data-rev-pay="'+p.id+'">Reverse</button>':''):'<span class="pill p-amber">Reversal</span>']}))},
 outstanding:function(){var rows=S.customers.map(function(c){return [c,outstanding(c.id)]}).filter(function(a){return a[1]>0}).sort(function(a,b){return b[1]-a[1]});
  return head('Credit / Outstanding')+kp([['Total outstanding',inr(outstanding())],['Customers with dues',rows.length]])+table(['Customer','Phone','Due amount',''],rows.map(function(a){return [esc(a[0].name),esc(a[0].phone),'<b>'+inr(a[1])+'</b>','<a class="btn sm alt" href="#payments" style="text-decoration:none">Receive</a>']}),'No pending dues.')},
 'stock-in':function(){return stockPage('In','Stock In (Purchase)','Purchase')},
 'stock-out':function(){return stockPage('Out','Stock Out (Delivery)','Delivery')},
 'current-stock':function(){var lv=stockLevels();return head('Current Stock')+table(['Item','In hand','Status'],ITEMS.map(function(i){var n=lv[i]||0,l=S.settings.low;return [esc(i),'<b>'+n+'</b>','<span class="pill '+(n<=l*.6?'p-red':n<=l*1.5?'p-amber':'p-green')+'">'+(n<=l*.6?'Low':n<=l*1.5?'Medium':'Good')+'</span>']}))},
 'stock-history':function(){return head('Stock History')+table(['Date','Type','Item','Qty','Note',''],S.stock.slice().reverse().map(function(r){return [r.date,'<span class="pill '+(r.type=='In'?'p-green':'p-amber')+'">'+r.type+'</span>',esc(r.item),r.qty,esc(r.note),del('stock',r.id)]}))},
 diesel:function(){FORMS.df=function(v){if(!canAct('create_expense'))return 'Not permitted';var rec={id:nid('E',S.expenses),date:v.date,cat:'Diesel',note:v.note,amount:+v.amount};S.expenses.push(rec);sbInsertRow('expenses',sbExpenseRow(rec));return 'Diesel expense added'};
  var l=S.expenses.filter(function(e){return e.cat=='Diesel'});
  return head('Diesel Expenses')+kp([['Total diesel spend',inr(sum(l,function(e){return e.amount}))],['Entries',l.length]])+(canAct('create_expense')?formCard([{k:'note',l:'Vehicle number',v:'AP 39 '},{k:'amount',l:'Amount (₹)',t:'number'},{k:'date',l:'Date',t:'date'}],'Add Diesel Expense','df'):'')+table(['Date','Vehicle','Amount',''],l.slice().reverse().map(function(e){return [e.date,esc(e.note),inr(e.amount),del('expenses',e.id)]}))},
 expenses:function(){FORMS.ef=function(v){if(!canAct('create_expense'))return 'Not permitted';var rec={id:nid('E',S.expenses),date:v.date,cat:v.cat,note:v.note,amount:+v.amount};S.expenses.push(rec);sbInsertRow('expenses',sbExpenseRow(rec));return 'Expense added'};
  var l=S.expenses.filter(function(e){return e.cat!='Diesel'});
  return head('Other Expenses')+kp([['Total',inr(sum(l,function(e){return e.amount}))],['Entries',l.length]])+(canAct('create_expense')?formCard([{k:'cat',l:'Category',t:'select',o:['Electricity','Repairs','Salary','Packaging','Chemicals','Rent','Other']},{k:'note',l:'Details',r:false},{k:'amount',l:'Amount (₹)',t:'number'},{k:'date',l:'Date',t:'date'}],'Add Expense','ef'):'')+table(['Date','Category','Details','Amount',''],l.slice().reverse().map(function(e){return [e.date,esc(e.cat),esc(e.note),inr(e.amount),del('expenses',e.id)]}))},
 employees:function(){FORMS.mf=function(v){if(!canAct('manage_employees'))return 'Not permitted';var rec={id:nid('M',S.employees),name:v.name,role:v.role,phone:v.phone,salary:+v.salary,tok:newTok()+newTok()+newTok(),joined:today(),joinedAt:new Date().toISOString()};S.employees.push(rec);sbUpsertRow('employees',sbEmployeeRow(rec));return 'Employee added'};
  return head('Employee Management')+(canAct('manage_employees')?formCard([{k:'name',l:'Name'},{k:'role',l:'Role',t:'select',o:ROLES},{k:'phone',l:'Phone',t:'tel',r:false},{k:'salary',l:'Monthly salary (₹)',t:'number'}],'Add Employee','mf'):'')+table(['Name','Role','Phone','Salary',''],S.employees.map(function(e){return [esc(e.name),esc(e.role),esc(e.phone),inr(e.salary),del('employees',e.id)]}))},
 attendance:function(){FORMS.af=function(v){if(!canAct('manage_attendance'))return 'Not permitted';var rec={id:nid('A',S.attendance),date:v.date,emp:v.emp,status:v.status,tin:v.tin,tout:v.tout};S.attendance.push(rec);sbInsertRow('attendance',sbAttendanceRow(rec));return 'Attendance marked'};
  var l=S.attendance.filter(function(a){return a.date==today()}),p=l.filter(function(a){return a.status=='Present'}).length;
  return head('Attendance')+kp([['Present today',p],['Absent today',l.length-p],['Staff',S.employees.length]])+(canAct('manage_attendance')?formCard([{k:'emp',l:'Employee',t:'select',o:empOpts()},{k:'status',l:'Status',t:'select',o:['Present','Absent','Half day']},{k:'tin',l:'In time',t:'time',v:'08:00',r:false},{k:'tout',l:'Out time',t:'time',r:false},{k:'date',l:'Date',t:'date'}],'Mark Attendance','af'):'')+table(['Date','Employee','Status',''],S.attendance.slice().reverse().map(function(a){return [a.date,esc(empName(a.emp)),'<span class="pill '+(a.status=='Present'?'p-green':a.status=='Absent'?'p-red':'p-amber')+'">'+a.status+'</span>',del('attendance',a.id)]}))},
 timings:function(){return head('In / Out Timings')+table(['Date','Employee','In','Out','Hours'],S.attendance.filter(function(a){return a.tin}).slice().reverse().map(function(a){var h='-';if(a.tin&&a.tout){var x=a.tin.split(':'),y=a.tout.split(':');h=(((+y[0]*60+ +y[1])-(+x[0]*60+ +x[1]))/60).toFixed(1)+' h'}return [a.date,esc(empName(a.emp)),a.tin||'-',a.tout||'-',h]}))},
 advances:function(){FORMS.vf=function(v){if(!canAct('manage_advances'))return 'Not permitted';var rec={id:nid('V',S.advances),date:v.date,emp:v.emp,amount:+v.amount,note:v.note};S.advances.push(rec);sbInsertRow('advances',sbAdvanceRow(rec));return 'Advance saved'};
  return head('Advances / Salary')+(canAct('manage_advances')?formCard([{k:'emp',l:'Employee',t:'select',o:empOpts()},{k:'amount',l:'Advance (₹)',t:'number'},{k:'note',l:'Note',r:false},{k:'date',l:'Date',t:'date'}],'Give Advance','vf'):'')+
  '<h3 style="margin:18px 0 0">Salary summary</h3>'+table(['Employee','Salary','Advances','Payable'],S.employees.map(function(e){var a=sum(S.advances.filter(function(x){return x.emp==e.id}),function(x){return x.amount});return [esc(e.name),inr(e.salary),inr(a),'<b>'+inr(e.salary-a)+'</b>']}))+
  '<h3 style="margin:18px 0 0">Advance history</h3>'+table(['Date','Employee','Amount','Note',''],S.advances.slice().reverse().map(function(a){return [a.date,esc(empName(a.emp)),inr(a.amount),esc(a.note),del('advances',a.id)]}))},
 backup:function(){
  if(!canAct('export_backup'))return head('Backup & Data Export')+'<div class="card"><p class="muted">Access restricted to owners.</p></div>';
  var d=today();
  return '<div class="bk-hero"><div><h2>Backup & Data Export</h2><p>Download your SR Industries business records in one professionally organised Excel workbook, with separate sheets for each business area.</p></div><div class="bk-mark">⇩</div></div>'+ 
   '<div class="bk-modes"><button type="button" class="bk-mode active" data-bkmode="daily"><span class="bk-ico">▣</span><span><b>Daily Backup</b><small>All available records for one selected date</small></span></button><button type="button" class="bk-mode" data-bkmode="range"><span class="bk-ico">▦</span><span><b>Custom Date Range</b><small>Choose a From and To date</small></span></button><button type="button" class="bk-mode" data-bkmode="all"><span class="bk-ico">◫</span><span><b>All-Time Backup</b><small>Every available record in this browser</small></span></button></div>'+ 
   '<section class="card"><div class="card-h"><div><h3>Choose Backup Period</h3><p class="pdesc">Select the period and download the complete workbook.</p></div><span class="pill p-blue">Excel · XLSX</span></div><div class="bk-filter"><div class="fld" id="bk-date-wrap"><label for="bk-date">Backup Date</label><input id="bk-date" type="date" value="'+d+'"></div><div class="fld" id="bk-from-wrap" hidden><label for="bk-from">From Date</label><input id="bk-from" type="date" value="'+d+'"></div><div class="fld" id="bk-to-wrap" hidden><label for="bk-to">To Date</label><input id="bk-to" type="date" value="'+d+'"></div><div class="fld"><label>Export Format</label><input value="Excel Workbook (.xlsx)" disabled></div><button type="button" class="btn" id="backup-download">⇩ Download Data</button></div><div class="bk-note" id="bk-period-note">Daily backup includes records dated on the selected day. The workbook also includes an All-Time Sales summary for comparison.</div></section>'+ 
   '<div class="bk-summary"><div class="bk-stat"><small>Total Sales · All Time</small><b>'+inr(sum(S.bills,function(x){return +x.total||0}))+'</b></div><div class="bk-stat"><small>Total Bills</small><b>'+S.bills.length+'</b></div><div class="bk-stat"><small>Total Customers</small><b>'+S.customers.length+'</b></div><div class="bk-stat"><small>Employees / Vehicles</small><b>'+S.employees.length+' / '+S.vehicles.length+'</b></div></div>'+ 
   '<section class="card"><div class="card-h"><h3>Workbook Sheets Included</h3><span class="pill p-green">Multi-sheet export</span></div><div class="bk-includes"><span>Backup Summary</span><span>Selected Period Sales</span><span>All-Time Sales</span><span>All Bills & Items</span><span>Customers</span><span>New Customers</span><span>Payments & Collections</span><span>Purchases / Stock In</span><span>Stock Out / Deliveries</span><span>Current Stock</span><span>Expenses & Diesel</span><span>Employees</span><span>Attendance</span><span>Salary & Advances</span><span>Vehicles</span><span>Vehicle Trips</span><span>Cancelled Bills</span><span>Deleted Bills</span></div><div class="bk-note"><b>Important data notes:</b> Profit cannot be calculated reliably until product purchase cost / cost of goods sold is recorded. Stock In records currently contain quantities and notes, not purchase values. This export includes every record currently available in this browser; it is not yet a cloud-wide backup shared across devices. Keep the downloaded Excel file in a secure location because it may contain employee and customer personal information.</div></section>';
 },
 'rep-sales':function(){var m={};S.bills.forEach(function(b){var o=m[b.date]||(m[b.date]=[0,0,0]);o[0]++;o[1]+=b.total;o[2]+=b.paid});var k=Object.keys(m).sort().reverse();
  return head('Sales Reports')+kp([['Total sales',inr(sum(S.bills,function(b){return b.total}))],['Bills',S.bills.length],['Collected',inr(sum(S.bills,function(b){return b.paid}))]])+table(['Date','Bills','Sales','Collected','Due'],k.map(function(d){return [d,m[d][0],inr(m[d][1]),inr(m[d][2]),inr(m[d][1]-m[d][2])]}))},
 'rep-pay':function(){var m={};S.payments.forEach(function(p){m[p.mode]=(m[p.mode]||0)+p.amount});return head('Payment Reports')+kp(Object.keys(m).map(function(k){return [k,inr(m[k])]}))+table(['Customer','Received','Outstanding'],S.customers.map(function(c){return [esc(c.name),inr(sum(S.payments.filter(function(p){return p.cust==c.id}),function(p){return p.amount})),inr(outstanding(c.id))]}))},
 'rep-stock':function(){var i={},o={};S.stock.forEach(function(r){(r.type=='In'?i:o)[r.item]=((r.type=='In'?i:o)[r.item]||0)+r.qty});return head('Stock Reports')+table(['Item','Total in','Total out','Balance'],ITEMS.map(function(k){return [esc(k),i[k]||0,o[k]||0,'<b>'+((i[k]||0)-(o[k]||0))+'</b>']}))},
 'rep-exp':function(){var m={};S.expenses.forEach(function(e){m[e.cat]=(m[e.cat]||0)+e.amount});var t=sum(S.expenses,function(e){return e.amount}),inc=sum(S.bills,function(b){return b.paid});return head('Expense Reports')+kp([['Total expenses',inr(t)],['Collections',inr(inc)],['Net',inr(inc-t)]])+table(['Category','Amount','Share'],Object.keys(m).map(function(k){return [esc(k),inr(m[k]),Math.round(m[k]/t*100)+'%']}))},
 settings:function(){
  if(!canAct('manage_settings'))return head('Business Settings')+'<div class="card"><p class="muted">Access restricted to owners.</p></div>';
  FORMS.sf=function(v){var s=S.settings;s.name=v.name;s.owner=v.owner;s.phone=v.phone;s.gst=v.gst;s.address=v.address;s.low=+v.low;s.products.forEach(function(p,i){p.r=+v['pr'+i]||0});sbSaveSettings();return 'Settings saved'};var s=S.settings;
  var pf=[];s.products.forEach(function(p,i){pf.push({k:'pr'+i,l:p.n+' Case of '+p.c+' - price per case (\u20B9)',t:'number',v:p.r})});   return head('Business Settings')+formCard([{k:'name',l:'Business name',v:s.name},{k:'owner',l:'Owner name',v:s.owner},{k:'phone',l:'Phone',v:s.phone,r:false},{k:'gst',l:'GST number',v:s.gst,r:false},{k:'address',l:'Business address (shown on bill)',v:s.address,r:false},{k:'low',l:'Low stock level',t:'number',v:s.low}].concat(pf),'Save Settings','sf')+
    '<div style="margin-top:16px;display:flex;gap:10px;flex-wrap:wrap"><button type="button" class="btn alt" id="settings-signout">Sign Out</button></div>'},
 users:function(){
  if(!isOwner())return head('User Management')+'<div class="card"><p class="muted">Access restricted to owners.</p></div>';
  if(!USERS_LIST&&!USERS_LOADING){
   USERS_LOADING=true;
   sbApi('/api/users').then(function(res){
    USERS_LIST=res.users||[];
    USERS_LOADING=false;
    USERS_ERR='';
    if(PAGE_IS('users'))render();
   }).catch(function(err){
    USERS_ERR=(err&&err.message)||'Failed to load users';
    USERS_LOADING=false;
    if(PAGE_IS('users'))render();
   });
  }
  var h=head2('User Management','Manage system logins, roles, and credential access.','<button class="btn" id="open-add-user-modal">'+ic('plus')+'Add User</button>');
  if(USERS_ERR)h+='<div class="card auth-err" style="margin-bottom:14px">'+esc(USERS_ERR)+'</div>';
  if(USERS_LOADING&&!USERS_LIST)return h+'<div class="card" style="text-align:center;padding:32px"><p class="muted">Loading users from Supabase…</p></div>';
  var users=USERS_LIST||[];
  var roles=['owner','manager','accountant','billing_staff','driver'];
  var myId=(SESSION&&SESSION.user)?SESSION.user.id:'';
  var rows=users.map(function(u){
   var isSelf=(u.user_id===myId);
   var rolePill='<span class="pill '+(u.role==='owner'?'p-blue':u.role==='manager'?'p-amber':u.role==='accountant'?'p-green':'p-blue')+'">'+esc(u.role)+'</span>';
   var statusPill=u.active?'<span class="pill p-green">Active</span>':'<span class="pill p-red">Inactive</span>';
   var roleOpts=roles.map(function(r){return '<option value="'+r+'"'+(r===u.role?' selected':'')+'>'+r+'</option>'}).join('');
   var roleSelect=isSelf?rolePill:('<select class="usr-role-sel" data-id="'+u.user_id+'" style="padding:4px 8px;font-size:12px;border-radius:6px;border:1px solid var(--line);background:var(--surface)">'+roleOpts+'</select>');
   var toggleBtn='';
   if(!isSelf){
    toggleBtn='<button type="button" class="btn sm '+(u.active?'alt danger':'green')+'" data-usr-action="toggle-active" data-id="'+u.user_id+'" data-active="'+(u.active?'1':'0')+'">'+(u.active?'Deactivate':'Activate')+'</button>';
   } else {
    toggleBtn='<span class="muted" style="font-size:12px">Current account</span>';
   }
   var resetBtn='<button type="button" class="btn sm alt" data-usr-action="reset-pw" data-id="'+u.user_id+'" data-name="'+esc(u.full_name)+'">Reset Password</button>';
   return [
    '<div><b>'+esc(u.full_name)+'</b>'+(isSelf?' <small class="pill p-blue" style="font-size:10px">You</small>':'')+'<br><small class="muted">'+esc(u.email||'No email')+'</small></div>',
    roleSelect,
    esc(u.employee_id||'-'),
    statusPill,
    '<div class="rowact" style="gap:6px;align-items:center">'+toggleBtn+resetBtn+'</div>'
   ];
  });
  return h+table(['User / Email','Role','Employee ID','Status','Actions'],rows,'No users found.');
 },
  'activity-log':function(){
   if(!isOwner())return head('Activity Log')+'<div class="card"><p class="muted">Access restricted to owners.</p></div>';
   if(AUDIT_LOGS===null&&!AUDIT_LOADING){
    if(!USERS_LIST&&!USERS_LOADING)sbApi('/api/users').then(function(r){USERS_LIST=r.users||[];render()}).catch(function(){});
    fetchAuditLogs();
   }
   var h=head2('Activity Log','Immutable audit trail of record inserts, updates, and cancellations across BMS tables.','<button type="button" class="btn alt sm" id="btn-refresh-audit">'+ic('sync')+'Refresh</button>');
   if(AUDIT_ERR)h+='<div class="card auth-err" style="margin-bottom:14px">'+esc(AUDIT_ERR)+'</div>';

   var tables=['bills','bill_items','payments','customers','employees','attendance','advances','expenses','business_settings','profiles'];
   var tableOpts='<option value="">All Tables ('+tables.length+')</option>'+tables.map(function(t){
    return '<option value="'+t+'"'+(AUDIT_FILTERS.table===t?' selected':'')+'>'+t+'</option>';
   }).join('');

   var actions=['INSERT','UPDATE','DELETE'];
   var actionOpts='<option value="">All Actions</option>'+actions.map(function(a){
    return '<option value="'+a+'"'+(AUDIT_FILTERS.action===a?' selected':'')+'>'+a+'</option>';
   }).join('');

   var userMap={};
   if(USERS_LIST){
    USERS_LIST.forEach(function(u){if(u.user_id)userMap[u.user_id]=u.full_name+' ('+(u.email||u.role)+')'});
   }
   if(AUDIT_LOGS){
    AUDIT_LOGS.forEach(function(l){
     if(l.user_id&&!userMap[l.user_id])userMap[l.user_id]=l.user_id.slice(0,8)+'… ('+(l.role||'user')+')';
    });
   }
   var userOpts='<option value="">All Users</option>'+Object.keys(userMap).map(function(uid){
    return '<option value="'+uid+'"'+(AUDIT_FILTERS.user===uid?' selected':'')+'>'+esc(userMap[uid])+'</option>';
   }).join('');

   var filterBar='<div class="card form" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px;align-items:end;margin-bottom:14px;padding:14px">'+
    '<div class="fld" style="margin:0"><label for="audit-filter-from">From Date</label><input type="date" id="audit-filter-from" value="'+esc(AUDIT_FILTERS.from||'')+'"></div>'+
    '<div class="fld" style="margin:0"><label for="audit-filter-to">To Date</label><input type="date" id="audit-filter-to" value="'+esc(AUDIT_FILTERS.to||'')+'"></div>'+
    '<div class="fld" style="margin:0"><label for="audit-filter-table">Table</label><select id="audit-filter-table">'+tableOpts+'</select></div>'+
    '<div class="fld" style="margin:0"><label for="audit-filter-user">User</label><select id="audit-filter-user">'+userOpts+'</select></div>'+
    '<div class="fld" style="margin:0"><label for="audit-filter-action">Action</label><select id="audit-filter-action">'+actionOpts+'</select></div>'+
    '<div class="fld" style="margin:0;display:flex;gap:6px">'+
    '<button type="button" class="btn sm" id="btn-apply-audit-filters" style="height:38px;flex:1">Filter</button>'+
    '<button type="button" class="btn alt sm" id="btn-reset-audit-filters" style="height:38px;flex:1">Reset</button>'+
    '</div></div>';

   h+=filterBar;

   if(AUDIT_LOADING&&!AUDIT_LOGS){
    return h+'<div class="card" style="text-align:center;padding:32px"><p class="muted">Loading activity logs from Supabase…</p></div>';
   }

   var logs=AUDIT_LOGS||[];
   if(AUDIT_FILTERS.from)logs=logs.filter(function(l){return l.at&&l.at.slice(0,10)>=AUDIT_FILTERS.from});
   if(AUDIT_FILTERS.to)logs=logs.filter(function(l){return l.at&&l.at.slice(0,10)<=AUDIT_FILTERS.to});
   if(AUDIT_FILTERS.table)logs=logs.filter(function(l){return l.table_name===AUDIT_FILTERS.table});
   if(AUDIT_FILTERS.user)logs=logs.filter(function(l){return l.user_id===AUDIT_FILTERS.user});
   if(AUDIT_FILTERS.action)logs=logs.filter(function(l){return l.action===AUDIT_FILTERS.action});

   var rows=logs.map(function(l){
    var actPill=l.action==='INSERT'?'<span class="pill p-green">INSERT</span>':l.action==='UPDATE'?'<span class="pill p-amber">UPDATE</span>':'<span class="pill p-red">DELETE</span>';
    return [
     '<small>'+dFull(l.at)+'</small>',
     formatAuditUser(l.user_id,l.role),
     '<span class="pill">'+esc(l.role||'auth')+'</span>',
     '<span class="pill alt">'+esc(l.table_name)+'</span>',
     '<code>'+esc(l.row_id)+'</code>',
     actPill,
     '<button type="button" class="btn sm alt" data-audit-view="'+l.id+'">View Details</button>'
    ];
   });

   return h+table(['Timestamp','User','Role','Table','Row ID','Action','Details'],rows,'No activity logs found matching the filters.');
  }
};
function stockPage(type,title,note){var f='sf'+type;FORMS[f]=function(v){var rec={id:nid('S',S.stock),date:v.date,type:type,item:v.item,qty:+v.qty,note:v.note||note};S.stock.push(rec);sbInsertRow('stock_movements',sbStockRow(rec));return 'Stock '+type.toLowerCase()+' saved'};
 return head(title)+formCard([{k:'item',l:'Item',t:'select',o:ITEMS},{k:'qty',l:'Quantity',t:'number'},{k:'note',l:'Note',r:false,v:note},{k:'date',l:'Date',t:'date'}],'Save','FORM-'+f)+table(['Date','Item','Qty','Note',''],S.stock.filter(function(r){return r.type==type}).slice().reverse().map(function(r){return [r.date,esc(r.item),r.qty,esc(r.note),del('stock',r.id)]}))}
/* ---------- New Bill (also used to edit a bill) ---------- */
var NB={lines:[],edit:null},EDITID=null;
function digits(s){return String(s||'').replace(/\D/g,'').slice(-10)}
function money(n){n=Math.round(n*100)/100;return '₹'+n.toLocaleString('en-IN',{maximumFractionDigits:2})}
function round2(n){return Math.round(n*100)/100}
function lc(l){return l.pi>=0?S.settings.products[l.pi]:(l.cp||{n:'',c:1,r:0})}
function casesVal(l){return Math.round(l.q/(lc(l).c||1)*100)/100}
function catIndex(n,c){var P=S.settings.products;for(var i=0;i<P.length;i++)if(P[i].n==n&&P[i].c==c)return i;return -1}
function newLine(){return {pi:-2,q:0,r:0}}
function newBillPage(){
 var eb=EDITID?S.bills.filter(function(b){return b.id==EDITID})[0]:null;if(!eb)EDITID=null;
 var pre=!eb&&NBPRE?cget(NBPRE):null;NBPRE=null;
 var d=eb?billData(eb):(pre?{name:pre.name,mobile:digits(pre.phone),addr:pre.area||'',paid:0,mode:'Cash'}:{name:'',mobile:'',addr:'',paid:0,mode:'Cash'});
 NB={edit:eb?eb.id:null,gst:eb?!!eb.gst:false,lines:eb?eb.items.map(function(it){var k=catIndex(it.p,it.cs);return k>=0?{pi:k,q:it.q,r:it.r}:{pi:-1,q:it.q,r:it.r,cp:{n:it.p,c:it.cs||1}}}):[newLine()]};
 return head2(eb?'Edit Bill '+esc(eb.id):'New Bill',eb?'Change anything that was entered wrongly, then press Update Bill.':'Make a bill for a customer. Name, mobile number and address are required. A new customer is added to Customers automatically.',eb?'<button class="btn alt" data-nb="cancel">Cancel</button>':'')+
 '<form id="nbform" class="nb" autocomplete="off" novalidate>'+
 '<div class="card nb-sec"><h3>Customer details</h3><div class="nb-cust">'+
  '<div class="fld sugwrap"><label for="nb-name">Customer Name *</label><input id="nb-name" name="name" placeholder="Type name or mobile to search" autocomplete="off" value="'+esc(d.name)+'"><div id="sug" class="sug" hidden></div></div>'+
  '<div class="fld"><label for="nb-mob">Mobile Number *</label><input id="nb-mob" name="mobile" type="tel" inputmode="numeric" maxlength="10" placeholder="10-digit mobile" value="'+esc(d.mobile)+'"></div>'+
  '<div class="fld wide"><label for="nb-addr">Address *</label><input id="nb-addr" name="addr" placeholder="Door no, street, area, town" value="'+esc(d.addr)+'"></div></div>'+
  '<div id="custnote" class="note"></div></div>'+
 '<div class="card nb-sec"><h3>Bill type</h3><div class="seg" role="radiogroup" aria-label="Bill type"><label class="segi"><input type="radio" name="gst" value="0"'+(NB.gst?'':' checked')+'><span>Without GST</span></label><label class="segi"><input type="radio" name="gst" value="1"'+(NB.gst?' checked':'')+'><span>With GST (5%)</span></label></div><div id="gstnote" class="note"></div></div>'+
 '<div class="card nb-sec"><h3>Items</h3><div id="nblines"></div><button type="button" class="btn alt" data-nb="add">+ Add Item</button></div>'+
 '<div class="card nb-sec"><h3>Payment</h3><div class="nb-pay"><div class="fld"><label for="nb-mode">Payment mode</label><select id="nb-mode" name="mode">'+MODES.map(function(m){return '<option'+(m==d.mode?' selected':'')+'>'+m+'</option>'}).join('')+'</select></div>'+
  '<div class="fld"><label for="nb-rec">Amount Received (₹)</label><input id="nb-rec" name="rec" type="number" min="0" step="any" inputmode="decimal" value="'+(d.paid?d.paid:'')+'" placeholder="0"></div></div>'+
  '<div id="gstrow" class="gstrow" hidden></div><div class="sumbox"><div><small>Total Bill</small><b id="s-tot">₹0</b></div><div><small>Amount Received</small><b id="s-rec" class="g">₹0</b></div><div><small>Credit (Balance)</small><b id="s-bal" class="r">₹0</b></div></div>'+
  '<div id="prevdue" class="note"></div></div>'+
 '<div class="nb-actions"><button type="button" class="btn alt" data-nb="clear">'+(eb?'Reset':'Clear')+'</button><button type="submit" class="btn">'+(eb?'Update Bill':'Save Bill')+'</button></div></form>'}
function billInit(){renderLines();calcNB();custNote();gstNote()}
function gstAmt(sub){return NB.gst?round2(sub*0.05):0}
function gstNote(){var n=$('#gstnote');if(!n)return;var g=S.settings.gst;n.className='note'+(NB.gst?' new':'');n.textContent=NB.gst?(g?'Tax invoice with GSTIN '+g+'. 5% GST (CGST 2.5% + SGST 2.5%) is added on top of the items total.':'Add your GST number in Settings before making a GST bill.'):'Normal bill without GST.'}
function renderLines(){
 var P=S.settings.products;
 $('#nblines').innerHTML=NB.lines.map(function(l,i){
  var blank=l.pi==-2,dis=blank?' disabled':'';
  var opts='<option value="-2"'+(blank?' selected':'')+'>Select product</option>'+P.map(function(p,k){return '<option value="'+k+'"'+(k==l.pi?' selected':'')+'>'+esc(p.n)+' · Case of '+p.c+'</option>'}).join('')+(l.pi==-1?'<option value="-1" selected>'+esc(l.cp.n)+' · Case of '+l.cp.c+' (old)</option>':'');
  return '<div class="nbl" data-i="'+i+'"><div class="fld"><label>Product</label><select class="lp" data-i="'+i+'" aria-label="Product">'+opts+'</select></div>'+
  '<div class="fld"><label>Cases</label><div class="step"><button type="button" data-nb="cdec" data-i="'+i+'" aria-label="Decrease cases"'+dis+'>−</button><input class="lcs" type="number" min="0" step="any" inputmode="decimal" placeholder="0" value="'+(l.q>0?casesVal(l):'')+'" aria-label="Cases"'+dis+'><button type="button" data-nb="cinc" data-i="'+i+'" aria-label="Increase cases"'+dis+'>+</button></div></div>'+
  '<div class="fld"><label>Quantity (bottles)</label><div class="step"><button type="button" data-nb="dec" data-i="'+i+'" aria-label="Decrease quantity"'+dis+'>−</button><input class="lq" type="number" min="0" step="1" inputmode="numeric" placeholder="0" value="'+(l.q>0?l.q:'')+'" aria-label="Quantity"'+dis+'><button type="button" data-nb="inc" data-i="'+i+'" aria-label="Increase quantity"'+dis+'>+</button></div><small class="cs"></small></div>'+
  '<div class="fld"><label>Price (₹ per case)</label><input class="lr" type="number" min="0" step="any" inputmode="decimal" placeholder="0" value="'+(l.r>0?l.r:'')+'" aria-label="Price per case"'+dis+'></div>'+
  '<div class="fld"><label>Amount</label><b class="la">₹0</b></div>'+
  (NB.lines.length>1?'<button type="button" class="rm" data-nb="rm" data-i="'+i+'" aria-label="Remove item">✕ Remove</button>':'<span></span>')+'</div>'}).join('');
 NB.lines.forEach(paintLine)}
function caseText(l){var c=lc(l).c;if(c<=1)return '';var full=Math.floor(l.q/c),rest=l.q%c;return '= '+(full?full+(full==1?' case':' cases'):'')+(full&&rest?' + ':'')+(rest?rest+(rest==1?' bottle':' bottles'):'')}
function lineAmt(l){return l.q>0?round2((l.q/(lc(l).c||1))*l.r):0}
function paintLine(l,i){var row=$('#nblines [data-i="'+i+'"]');if(!row)return;row.querySelector('.la').textContent=money(lineAmt(l));row.querySelector('.cs').textContent=l.q>0?caseText(l):'';
 var ci=row.querySelector('.lcs'),qi=row.querySelector('.lq');
 if(ci&&document.activeElement!==ci)ci.value=l.q>0?casesVal(l):'';
 if(qi&&document.activeElement!==qi)qi.value=l.q>0?l.q:''}
function totalNB(){return round2(NB.lines.reduce(function(a,l){return a+lineAmt(l)},0))}
function calcNB(){var sub=totalNB(),g=gstAmt(sub),t=round2(sub+g),r=+($('#nb-rec')||{}).value||0;
 $('#s-tot').textContent=money(t);$('#s-rec').textContent=money(r);var b=round2(t-r);
 var el=$('#s-bal');el.textContent=money(Math.abs(b));el.className=b<0?'r':(b==0?'g':'r');
 el.previousElementSibling.textContent=b<0?'Excess received':'Credit (Balance)';
 var gr=$('#gstrow');if(gr){gr.hidden=!NB.gst;gr.innerHTML=NB.gst?'<span>Items total <b>'+money(sub)+'</b></span><span>CGST 2.5% <b>'+money(round2(g/2))+'</b></span><span>SGST 2.5% <b>'+money(round2(g-round2(g/2)))+'</b></span>':''}}
function lookup(q){q=q.trim().toLowerCase();var d=digits(q);if(q.length<1)return [];
 return S.customers.filter(function(c){return c.name.toLowerCase().indexOf(q)>-1||(d&&/\d/.test(q)&&digits(c.phone).indexOf(d)>-1)}).slice(0,6)}
function showSug(){var list=lookup($('#nb-name').value),box=$('#sug');
 if(!list.length){box.hidden=true;return}
 box.innerHTML=list.map(function(c){return '<button type="button" data-nb="pick" data-id="'+c.id+'"><span>'+esc(c.name)+'</span><small>'+esc(c.phone)+'</small></button>'}).join('');box.hidden=false}
function custNote(){var m=digits($('#nb-mob').value),c=S.customers.filter(function(x){return digits(x.phone)==m})[0],n=$('#custnote'),pd=$('#prevdue');if(!n)return;
 if(c){n.className='note ex';n.textContent='Existing customer: '+c.name;var o=outstanding(c.id);pd.textContent=o>0?'Total pending of this customer: '+money(o)+(NB.edit?'':' (not included in this bill)'):''}
 else if(m.length==10){n.className='note new';n.textContent='New customer. They will be added to Customers when you save the bill.';pd.textContent=''}
 else{n.className='note';n.textContent='Name, mobile number and address are all required to save the bill. Search an existing customer by name or mobile.';pd.textContent=''}}
function pickCustomer(id){var c=S.customers.filter(function(x){return x.id==id})[0];if(!c)return;
 ['#nb-name','#nb-mob','#nb-addr'].forEach(clearErr);
 $('#nb-name').value=c.name;$('#nb-mob').value=digits(c.phone);$('#nb-addr').value=c.area||'';$('#sug').hidden=true;custNote()}
function clearErr(sel){var el=typeof sel=='string'?$(sel):sel;if(!el)return;var f=el.closest('.fld');if(!f)return;f.classList.remove('err');var m=f.querySelector('.em');if(m)m.remove()}
function bad(sel,msg){var el=$(sel);toast(msg);if(!el)return false;var f=el.closest('.fld');f.classList.add('err');if(!f.querySelector('.em')){var s=document.createElement('span');s.className='em';s.textContent=msg;f.appendChild(s)}el.focus();if(el.scrollIntoView)el.scrollIntoView({block:'center',behavior:'smooth'});return false}
function saveBill(){
 var name=$('#nb-name').value.trim(),mob=digits($('#nb-mob').value),addr=$('#nb-addr').value.trim(),mode=$('#nb-mode').value;
 ['#nb-name','#nb-mob','#nb-addr','#nb-rec'].forEach(clearErr);
 if(!name)return bad('#nb-name','Enter the customer name');
 if(mob.length!=10)return bad('#nb-mob','Enter a 10-digit mobile number');
 if(!addr)return bad('#nb-addr','Enter the customer address');
 var items=NB.lines.filter(function(l){return l.q>0}).map(function(l){var p=lc(l);return {p:p.n,q:l.q,r:l.r,cs:p.c}});
 if(!items.length)return bad('#nblines .lp','Select a product and enter cases or quantity');
 if(NB.lines.some(function(l){return l.q>0&&!(l.r>0)}))return bad('#nblines .lr','Enter the price for every item');
 var sub=totalNB(),tax=gstAmt(sub),total=round2(sub+tax),rec=round2(+$('#nb-rec').value||0);
 if(NB.gst&&!S.settings.gst){toast('Add your GST number in Settings first');return}
 if(rec<0)return bad('#nb-rec','Amount received cannot be negative');
 if(rec>total)return bad('#nb-rec','Amount received cannot be more than the bill total');
 var c=S.customers.filter(function(x){return digits(x.phone)==mob})[0],isNew=!c;
 if(NB.edit){
  var editId=NB.edit;
  var b=S.bills.filter(function(x){return x.id==editId})[0];
  if(!b){toast('Bill not found');return}
  var payload={id:editId,name:name,mobile:mob,address:addr,items:items,bill_date:b.date,payment_mode:mode,is_gst:!!NB.gst};
  sbUpdateBill(payload).then(function(res){
   EDITID=null;toast('Bill '+editId+' updated');location.hash='#bills';
   refreshBills().then(function(){refreshCustomers();render();});
  }).catch(function(err){
   toast('Failed to update bill: '+(err&&err.message?err.message:'Unknown error'));
  });
  return;
 }
 var payload={name:name,mobile:mob,address:addr,items:items,bill_date:today(),payment_mode:mode,initial_payment:rec,is_gst:!!NB.gst};
 sbCreateBill(payload).then(function(res){
  var billRow=res.bill,custRow=res.customer,payRow=res.payment,itemRows=res.items||[];
  var nbItems=itemRows.map(function(r){return {p:r.product_name,q:Number(r.qty_bottles||0),r:Number(r.rate_per_case||0),cs:Number(r.case_size||1)}});
  var nb={id:billRow.id,date:billRow.bill_date||today(),cust:billRow.customer_id||(custRow&&custRow.id)||'',name:billRow.customer_name||name,mobile:billRow.mobile||mob,addr:billRow.address||addr,items:nbItems.length?nbItems:items,total:Number(billRow.total!=null?billRow.total:total),gst:!!billRow.gst,sub:Number(billRow.subtotal!=null?billRow.subtotal:sub),tax:Number(billRow.tax!=null?billRow.tax:tax),paid:Number(billRow.paid!=null?billRow.paid:rec),mode:billRow.payment_mode||mode};
  if(custRow){
   var existingC=S.customers.filter(function(x){return x.id==custRow.id})[0];
   if(!existingC){S.customers.push({id:custRow.id,name:custRow.name,phone:custRow.phone,area:custRow.area,date:custRow.created_date||today(),active:custRow.active!==false})}
   else{existingC.name=custRow.name;existingC.phone=custRow.phone;existingC.area=custRow.area}
  }
  S.bills.push(nb);
  if(payRow){
   S.payments.push({id:payRow.id,date:payRow.payment_date||today(),cust:payRow.customer_id||nb.cust,bill:payRow.bill_id||nb.id,amount:Number(payRow.amount||0),mode:payRow.mode||mode,reversed_at:null,reversed_by:'',reversal_reason:'',notes:payRow.notes||''});
  }
  save();showSaved(nb,isNew);
  refreshBills().then(function(){refreshCustomers();refreshPayments();render();});
 }).catch(function(err){
  toast('Failed to create bill: '+(err&&err.message?err.message:'Unknown error'));
 });
}
document.addEventListener('submit',function(e){if(e.target.id=='nbform'){e.preventDefault();saveBill()}});
document.addEventListener('change',function(e){if(e.target.name=='gst'&&e.target.closest('#nbform')){NB.gst=e.target.value=='1';gstNote();calcNB()}});
document.addEventListener('input',function(e){var t=e.target;
 if(t.id=='nb-name'||t.id=='nb-mob'||t.id=='nb-addr')clearErr(t);
 if(t.id=='nb-name'){showSug();custNote()}
 else if(t.id=='nb-mob'){t.value=t.value.replace(/\D/g,'').slice(0,10);custNote();var c=S.customers.filter(function(x){return digits(x.phone)==t.value})[0];if(c&&!$('#nb-name').value.trim()){$('#nb-name').value=c.name;$('#nb-addr').value=c.area||''}}
 else if(t.id=='nb-rec')calcNB();
 else if(t.classList.contains('lq')||t.classList.contains('lr')||t.classList.contains('lcs')){var row=t.closest('.nbl'),i=+row.dataset.i,l=NB.lines[i];
  if(t.classList.contains('lcs'))l.q=Math.max(0,Math.round((+t.value||0)*(lc(l).c||1)));else if(t.classList.contains('lq'))l.q=Math.max(0,Math.floor(+t.value||0));
  l.r=Math.max(0,+row.querySelector('.lr').value||0);paintLine(l,i);calcNB()}});

document.addEventListener('change',function(e){
 if(e.target&&e.target.id&&e.target.id.indexOf('audit-filter-')===0){
  AUDIT_FILTERS.from=($('#audit-filter-from')?$('#audit-filter-from').value:'').trim();
  AUDIT_FILTERS.to=($('#audit-filter-to')?$('#audit-filter-to').value:'').trim();
  AUDIT_FILTERS.table=($('#audit-filter-table')?$('#audit-filter-table').value:'').trim();
  AUDIT_FILTERS.user=($('#audit-filter-user')?$('#audit-filter-user').value:'').trim();
  AUDIT_FILTERS.action=($('#audit-filter-action')?$('#audit-filter-action').value:'').trim();
  fetchAuditLogs();
 }
});
document.addEventListener('change',function(e){var t=e.target;if(t.classList.contains('lp')){var i=+t.dataset.i,k=+t.value,o=NB.lines[i];
 if(k>=0){var p=S.settings.products[k],cs=o.q>0?o.q/(lc(o).c||1):0;NB.lines[i]={pi:k,q:Math.round(cs*p.c),r:p.r};renderLines();calcNB()}
 else if(k==-2){NB.lines[i]=newLine();renderLines();calcNB()}}});
document.addEventListener('click',function(e){
 if(!e.target.closest('.sugwrap')){var sg=$('#sug');if(sg)sg.hidden=true}
 var t=e.target.closest('[data-nb]');if(!t)return;var a=t.dataset.nb,i=+t.dataset.i;
 if(a=='add'){NB.lines.push(newLine());renderLines();calcNB();var ls=document.querySelectorAll('#nblines .lp');ls[ls.length-1].focus()}
 else if(a=='rm'){NB.lines.splice(i,1);renderLines();calcNB()}
 else if(a=='cinc'||a=='cdec'){var l=NB.lines[i],cc=lc(l).c||1;l.q=Math.max(0,l.q+(a=='cinc'?cc:-cc));paintLine(l,i);calcNB()}
 else if(a=='inc'||a=='dec'){var l=NB.lines[i];l.q=Math.max(1,l.q+(a=='inc'?1:-1));var inp=document.querySelector('#nblines [data-i="'+i+'"] .lq');inp.value=l.q;paintLine(l,i);calcNB()}
 else if(a=='pick')pickCustomer(t.dataset.id)
 else if(a=='clear'){render()}
 else if(a=='cancel'){EDITID=null;location.hash='#bills'}
 else if(a=='edit'){EDITID=t.dataset.id;closeModal();if(location.hash=='#new-bill')render();else location.hash='#new-bill'}
 else billAction(a,t);
});
/* ---------- Bill sheet, share, print, download ---------- */
var ONES=['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen'],TENS=['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];
function w99(n){return n<20?ONES[n]:TENS[Math.floor(n/10)]+(n%10?' '+ONES[n%10]:'')}
function w999(n){return (n>99?ONES[Math.floor(n/100)]+' Hundred'+(n%100?' ':''):'')+(n%100?w99(n%100):'')}
function words(n){n=Math.round(n);if(n==0)return 'Zero';var o=[],cr=Math.floor(n/1e7),lk=Math.floor(n/1e5)%100,th=Math.floor(n/1e3)%100,hu=n%1000;
 if(cr)o.push(w999(cr)+' Crore');if(lk)o.push(w99(lk)+' Lakh');if(th)o.push(w99(th)+' Thousand');if(hu)o.push(w999(hu));return o.join(' ')}
function itemTxt(i){var c=i.cs||1,n=i.p;if(c<=1)return i.q+' × '+n;var f=Math.floor(i.q/c),r=i.q%c;return (f?f+(f==1?' case':' cases'):'')+(f&&r?' + ':'')+(r?r+(r==1?' bottle':' bottles'):'')+' × '+n}
function fdate(s){var p=String(s).split('-');return p.length==3?p[2]+'-'+p[1]+'-'+p[0]:s}
function billData(b){var c=S.customers.filter(function(x){return x.id==b.cust})[0]||{};
 return {id:b.id,date:b.date,name:b.name||c.name||'Walk-in customer',mobile:b.mobile||c.phone||'',addr:b.addr||c.area||'',
  items:b.items.map(function(i){return {p:i.p,q:i.q,r:i.r,cs:i.cs||0}}),total:b.total,paid:b.paid,mode:b.mode,gst:!!b.gst,sub:b.gst&&b.sub!=null?b.sub:b.total,tax:b.gst?(b.tax||0):0,
  biz:{n:S.settings.name,a:S.settings.address||'',p:S.settings.phone||'',g:b.gst?(S.settings.gst||''):''}}}
function sheetHTML(d,compact){
 var rows=d.items.map(function(i,k){var cases=i.cs>1?(Math.round(num(i.q)/num(i.cs)*100)/100):'-';
  return '<tr><td>'+(k+1)+'</td><td>'+esc(i.p)+(i.cs>1?' Water Bottle':' Water Jar')+'</td><td class="r">'+cases+'</td><td class="r">'+esc(i.q)+'</td><td class="r">'+money(num(i.r))+'</td><td class="r">'+money((num(i.q)/(num(i.cs)||1))*num(i.r))+'</td></tr>'}).join('');
 var due=round2(num(d.total)-num(d.paid));
 return '<div class="sheet'+(compact?' cmp':'')+'"><div class="sh-top"><div class="sh-brand"><svg width="40" height="48" viewBox="0 0 44 52"><path d="M22 2C22 2 4 22 4 34a18 18 0 0 0 36 0C40 22 22 2 22 2Z" fill="#1368e8"/><path d="M8 36c8-6 16 4 28-2" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round"/></svg><div><h1>'+esc(d.biz.n)+'</h1><p>Packaged Drinking Water</p>'+(d.biz.a?'<p>'+esc(d.biz.a)+'</p>':'')+(d.biz.p||d.biz.g?'<p>'+(d.biz.p?'Ph: '+esc(d.biz.p):'')+(d.biz.p&&d.biz.g?' | ':'')+(d.biz.g?'GSTIN: '+esc(d.biz.g):'')+'</p>':'')+'</div></div>'+
  '<div class="sh-meta"><h2>'+(d.gst?'TAX INVOICE':'BILL')+'</h2><div><b>Bill No:</b> '+esc(d.id)+'</div><div><b>Date:</b> '+esc(fdate(d.date))+'</div><div><b>Payment:</b> '+esc(d.mode)+'</div></div></div>'+
  '<div class="sh-to"><div><small>Billed to</small><b>'+esc(d.name)+'</b><div>Mobile: '+esc(d.mobile)+'</div>'+(d.addr?'<div>'+esc(d.addr)+'</div>':'')+'</div></div>'+
  '<div class="sh-tw"><table class="sh-t"><thead><tr><th>#</th><th>Item</th><th class="r">Cases</th><th class="r">Qty (bottles)</th><th class="r">Price per case</th><th class="r">Amount</th></tr></thead><tbody>'+rows+'</tbody></table></div>'+
  '<div class="sh-bot"><div class="sh-words">Amount in words<b>Rupees '+words(num(d.total))+' Only</b></div><div class="sh-sum">'+(d.gst?'<div><span>Taxable Amount</span><span>'+money(num(d.sub))+'</span></div><div><span>CGST @ 2.5%</span><span>'+money(round2(num(d.tax)/2))+'</span></div><div><span>SGST @ 2.5%</span><span>'+money(round2(num(d.tax)-round2(num(d.tax)/2)))+'</span></div>':'')+'<div><span>'+(d.gst?'Total (incl. GST)':'Total Bill')+'</span><span>'+money(num(d.total))+'</span></div><div><span>Amount Received</span><span>'+money(num(d.paid))+'</span></div>'+
  (due>0?'<div class="due"><span>Credit (Balance Due)</span><span>'+money(due)+'</span></div>':'<div class="ok"><span>Fully Paid</span><span>'+money(0)+' due</span></div>')+'</div></div>'+
  '<div class="sh-foot"><div>Thank you for your business.<br>Goods once sold will not be taken back.</div><div class="sh-sign"><i></i>Authorised Signatory<br><b>'+esc(d.biz.n)+'</b></div></div></div>'}
var SHEETCSS='.sheet{background:#fff;color:#111c33;font-family:"Plus Jakarta Sans",system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;font-size:13px;line-height:1.45;border:1px solid #d9e2ef;border-radius:6px;padding:26px 28px;max-width:794px;margin:0 auto}.sheet *{box-sizing:border-box}'+
'.sh-top{display:flex;justify-content:space-between;gap:16px;flex-wrap:wrap;border-bottom:3px solid #1368e8;padding-bottom:14px}.sh-brand{display:flex;gap:12px;align-items:center}.sh-brand h1{margin:0;font-size:24px;font-weight:800;color:#0b3f9c;letter-spacing:-.3px;line-height:1.1}.sh-brand p{margin:2px 0 0;color:#546583;font-size:12px}'+
'.sh-meta{text-align:right}.sh-meta h2{margin:0 0 4px;font-size:22px;letter-spacing:3px;color:#1368e8}.sh-meta div{font-size:12.5px}.sh-to{margin:16px 0}.sh-to small{display:block;color:#546583;font-size:11px;letter-spacing:.8px;text-transform:uppercase;font-weight:700;margin-bottom:3px}.sh-to b{font-size:15px}'+
'.sh-tw{overflow-x:auto}.sh-t{width:100%;border-collapse:collapse;min-width:480px}.sh-t th{background:#eaf2ff;color:#0b3f9c;text-align:left;padding:8px 10px;font-size:11.5px;text-transform:uppercase;letter-spacing:.5px;border:0;white-space:nowrap}.sh-t td{padding:9px 10px;border-bottom:1px solid #e3eaf4;font-size:13px;color:#111c33}.sh-t .r{text-align:right}'+
'.sh-bot{display:flex;justify-content:space-between;gap:20px;flex-wrap:wrap;margin-top:16px}.sh-words{flex:1;min-width:200px;font-size:12px;color:#546583}.sh-words b{display:block;color:#111c33;font-size:13px;margin-top:2px}.sh-sum{min-width:240px;flex:0 1 300px}.sh-sum div{display:flex;justify-content:space-between;gap:10px;padding:5px 0;font-size:13.5px}'+
'.sh-sum .due{background:#fff3df;color:#b45f00;padding:8px 10px;border-radius:6px;font-weight:800;margin-top:6px}.sh-sum .ok{background:#e8f8ef;color:#12803f;padding:8px 10px;border-radius:6px;font-weight:800;margin-top:6px}'+
'.cmp{padding:16px 14px}.cmp .sh-brand h1{font-size:19px}.cmp .sh-meta h2{font-size:18px}.cmp .sh-t{min-width:0}.cmp .sh-t th:nth-child(1),.cmp .sh-t td:nth-child(1),.cmp .sh-t th:nth-child(3),.cmp .sh-t td:nth-child(3){display:none}.cmp .sh-t th,.cmp .sh-t td{padding:7px 6px;font-size:12px}.cmp .sh-sum{min-width:0;flex:1 1 100%}.cmp .sh-foot{margin-top:20px}'+
'.sh-foot{display:flex;justify-content:space-between;align-items:flex-end;gap:16px;margin-top:34px;padding-top:12px;border-top:1px dashed #b9c6da;font-size:12px;color:#546583}.sh-sign{text-align:center}.sh-sign i{display:block;width:150px;border-bottom:1px solid #111c33;margin:0 auto 4px;height:30px}.sh-sign b{color:#111c33}';
(function(){var st=document.createElement('style');st.textContent=SHEETCSS;document.head.appendChild(st)})();
(function(){var st=document.createElement('style');st.textContent='.stmt{background:#fff;color:#17233b;padding:22px;border-radius:8px;max-width:1000px;margin:auto;font:13px/1.5 system-ui}.stmthead{display:flex;justify-content:space-between;gap:18px;flex-wrap:wrap;border-bottom:3px solid #1368e8;padding-bottom:14px}.stmthead h2{margin:0;color:#0b3f9c}.stmtintro{margin:16px 0;color:#526582}.stmtTable{width:100%;border-collapse:collapse}.stmtTable th,.stmtTable td{padding:9px 8px;text-align:left;border-bottom:1px solid #dce5f1;vertical-align:top}.stmtTable thead th{background:#eaf2ff;color:#0b3f9c}.stmtTable tfoot th{background:#f2f6fc}.stmt .blue{color:#2563eb;font-weight:700}.stmt .green{color:#16803d;font-weight:700}.stmt .red{color:#dc2626;font-weight:700}.stmtfoot{text-align:right;margin-top:16px;font-size:16px}@media(max-width:700px){.stmt{padding:12px;overflow-x:auto}.stmtTable{min-width:650px}}';document.head.appendChild(st)})();

/* shareable link: the bill is stored inside the link itself */
function b64e(o){return btoa(unescape(encodeURIComponent(JSON.stringify(o)))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')}
function b64d(s){s=s.replace(/-/g,'+').replace(/_/g,'/');while(s.length%4)s+='=';return JSON.parse(decodeURIComponent(escape(atob(s))))}
function billLink(d){var o={i:d.id,d:d.date,n:d.name,m:d.mobile,a:d.addr,t:d.total,p:d.paid,md:d.mode,gs:d.gst?1:0,sb:d.sub,tx:d.tax,it:d.items.map(function(i){return [i.p,i.q,i.r,i.cs]}),b:[d.biz.n,d.biz.a,d.biz.p,d.biz.g]};
 return location.href.split('#')[0]+'#bill='+b64e(o)}
function parseLink(s){
 var o=null;try{o=b64d(s)}catch(e){}if(!o||typeof o!='object')return null;
 var b=Array.isArray(o.b)?o.b:[];
 var dt=typeof o.d=='string'&&/^\d{4}-\d{2}-\d{2}$/.test(o.d)?o.d:'';
 var its=Array.isArray(o.it)?o.it.map(function(x){x=Array.isArray(x)?x:[];return {p:String(x[0]||''),q:num(x[1]),r:num(x[2]),cs:num(x[3])}}):[];
 return {id:String(o.i||''),date:dt,name:String(o.n||''),mobile:String(o.m||''),addr:String(o.a||''),total:num(o.t),paid:num(o.p),mode:String(o.md||''),gst:!!o.gs,sub:o.gs&&o.sb!=null?num(o.sb):num(o.t),tax:o.gs?num(o.tx):0,items:its,biz:{n:String(b[0]||''),a:String(b[1]||''),p:String(b[2]||''),g:String(b[3]||'')}};
}
function waURL(d){var due=round2(d.total-d.paid);
 var txt='*'+d.biz.n+'*\nHello '+d.name+', thank you for your purchase.\nBill No: '+d.id+' ('+fdate(d.date)+')\n'+
  d.items.map(function(i){return itemTxt(i).replace(' × ',' x ')+' @ '+money(i.r)+(i.cs>1?'/case':'')+' = '+money((i.q/(i.cs||1))*i.r)}).join('\n')+
  (d.gst?'\nTaxable: '+money(d.sub)+'\nGST 5% (CGST 2.5% + SGST 2.5%): '+money(d.tax)+'\nGSTIN: '+d.biz.g:'')+'\nTotal: '+money(d.total)+'\nReceived: '+money(d.paid)+(due>0?'\nCredit (balance): '+money(due):'\nFully paid')+'\n\nView / download your bill:\n'+billLink(d);
 return 'https://wa.me/91'+digits(d.mobile)+'?text='+encodeURIComponent(txt)}

function printBill(d){var r=$('#printroot');if(!r){r=document.createElement('div');r.id='printroot';document.body.appendChild(r)}r.innerHTML=sheetHTML(d);try{window.print()}catch(e){toast('Printing is not available in this view')}}
function downloadBill(d){
 var wrap=document.createElement('div');wrap.style.cssText='position:fixed;left:-10000px;top:0;width:794px;background:#fff';wrap.innerHTML=sheetHTML(d);document.body.appendChild(wrap);
 var fn='SR-Industries-Bill-'+d.id;
 var fallback=function(){wrap.remove();var h='<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+esc(fn)+'</title><style>body{margin:0;padding:16px;background:#eef2f8}'+SHEETCSS+'@media print{body{background:#fff;padding:0}.sheet{border:0}}</style>'+sheetHTML(d);
  var a=document.createElement('a');a.href=URL.createObjectURL(new Blob([h],{type:'text/html'}));a.download=fn+'.html';document.body.appendChild(a);a.click();a.remove();toast('Bill downloaded (open it and tap Print to save as PDF)')};
 if(window.html2canvas&&window.jspdf){
  window.html2canvas(wrap.firstElementChild,{scale:2,backgroundColor:'#ffffff'}).then(function(cv){
   var pdf=new window.jspdf.jsPDF({unit:'pt',format:'a4'}),W=595.28,H=841.89,h=cv.height*W/cv.width,img=cv.toDataURL('image/jpeg',.95);
   if(h<=H)pdf.addImage(img,'JPEG',0,0,W,h);else{var w2=W*H/h;pdf.addImage(img,'JPEG',(W-w2)/2,0,w2,H)}
   pdf.save(fn+'.pdf');wrap.remove();toast('Bill downloaded')}).catch(fallback)}
 else fallback()}

/* ---------- popups ---------- */
function openModal(html,wide){closeModal();var m=document.createElement('div');m.className='modal';m.id='modal';m.setAttribute('role','dialog');m.setAttribute('aria-modal','true');
 m.innerHTML='<div class="dialog'+(wide?' wide':'')+'">'+html+'</div>';document.body.appendChild(m);m.addEventListener('click',function(e){if(e.target===m)closeModal()})}
function closeModal(){var m=$('#modal');if(m)m.remove()}
document.addEventListener('keydown',function(e){if(e.key=='Escape')closeModal()});
var CUR=null;
function actions(d,id){return '<a class="btn wa" target="_blank" rel="noopener" href="'+waURL(d)+'">Send WhatsApp</a>'}
function showSaved(b,isNew){var d=billData(b);CUR=b.id;var due=round2(d.total-d.paid);
 openModal('<div class="okic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 5 5 9-10"/></svg></div><h3>Bill saved successfully</h3><p>Bill '+esc(b.id)+' for '+esc(d.name)+'<br>Total '+money(d.total)+' · '+(due>0?'Credit '+money(due):'Fully paid')+(isNew?'<br>New customer added to Customers':'')+'</p>'+
  '<div class="dact"><button class="btn alt" data-nb="preview" data-id="'+b.id+'">Preview Bill</button><button class="btn alt" data-nb="print" data-id="'+b.id+'">Print Bill</button>'+actions(d)+'<button class="btn green" data-nb="dl" data-id="'+b.id+'">Download PDF</button></div>'+
  '<div class="dact" style="margin-top:10px"><button class="btn" data-nb="newbill">+ New Bill</button><button class="btn alt" data-nb="close">Close</button></div>')}
function showPreview(id){var b=S.bills.filter(function(x){return x.id==id})[0];if(!b)return;var d=billData(b);CUR=id;
 openModal('<div class="pbar"><button class="btn alt sm" data-nb="print" data-id="'+id+'">Print</button><button class="btn green sm" data-nb="dl" data-id="'+id+'">Download PDF</button>'+actions(d).replace('class="btn wa"','class="btn wa sm"')+'<button class="btn sm danger" data-nb="close">Close</button></div>'+sheetHTML(d,window.innerWidth<=640),true)}
function billAction(a,t){var id=t.dataset.id,b=S.bills.filter(function(x){return x.id==id})[0];
 if(a=='close')closeModal();
 else if(a=='newbill'){closeModal();if(location.hash=='#new-bill')render();else location.hash='#new-bill'}
 else if(a=='preview')showPreview(id);
 else if(a=='print'&&b)printBill(billData(b));
 else if(a=='dl'&&b)downloadBill(billData(b));
 else if(a=='pdl'&&PUB)downloadBill(PUB);
 else if(a=='pprint'&&PUB)printBill(PUB)}

/* public bill page (opened from the WhatsApp link) */
var PUB=null;
function renderPublic(){
 try{PUB=parseLink(location.hash.slice(6))}catch(e){PUB=null}
 document.body.classList.add('public');closeModal();var v=$('#pubview');
 if(!PUB){v.innerHTML='<div class="pubwrap"><div class="card empty">This bill link is not valid.</div></div>';return}
 document.title=PUB.biz.n+' - Bill '+PUB.id;
 v.innerHTML='<div class="pubwrap"><div class="pbar"><button class="btn green" data-nb="pdl">Download Bill</button><button class="btn alt" data-nb="pprint">Print</button></div>'+sheetHTML(PUB)+'</div>'}
/* ---------- All Bills: search, filter, view, edit, delete ---------- */
function head2(t,desc,extra){return '<div class="ph"><div><h2>'+t+'</h2><p class="pdesc">'+desc+'</p></div>'+(extra||'')+'</div>'}
function bmob(b){var c=S.customers.filter(function(x){return x.id==b.cust})[0]||{};return digits(b.mobile||c.phone)}
function baddr(b){var c=S.customers.filter(function(x){return x.id==b.cust})[0]||{};return b.addr||c.area||''}
function bname(b){return b.name||custName(b.cust)}
function billTable(list,hideCust){
 var cols=hideCust?['Bill No','Date','Items','Total','Paid','Due','Status','']:['Bill No','Date','Customer','Items','Total','Paid','Due','Status',''];
 var rows=list.slice().reverse().map(function(b){var due=round2(b.total-b.paid),row=['<b>#'+esc(b.id)+'</b>'+(b.gst?'<br><small class="muted">GST bill</small>':''),fdate(b.date)];
  if(!hideCust)row.push('<div><b>'+esc(bname(b))+'</b><br><small class="muted">'+esc(baddr(b)||'No address')+'</small><br><small class="muted">'+esc(bmob(b))+'</small></div>');
  var act='<div class="rowact"><button class="btn sm alt" data-nb="preview" data-id="'+b.id+'">View</button>'+(canAct('edit_bill')?'<button class="btn sm alt" data-nb="edit" data-id="'+b.id+'">Edit</button>':'')+(canAct('cancel_bill')?'<button class="btn sm" style="background:var(--amber-soft);color:#a86500" data-billact="cancel" data-id="'+b.id+'">Cancel</button>':'')+'</div>';
  row.push('<div>'+b.items.map(function(i){return esc(itemTxt(i))}).join('<br>')+'</div>',money(b.total),money(b.paid),'<b style="color:'+(due>0?'var(--red)':'var(--green)')+'">'+money(due)+'</b>',
   '<span class="pill '+(due<=0?'p-green':b.paid?'p-amber':'p-red')+'">'+(due<=0?'Paid':b.paid?'Partial':'Unpaid')+'</span>',act);
  return row});
 return table(cols,rows,'No bills found.')}
var ABF={q:'',st:'all',from:'',to:'',gst:'all',bucket:'active'};
function filteredBills(skipGst){var q=ABF.q.trim().toLowerCase();
 return S.bills.filter(function(b){var due=round2(b.total-b.paid);
  if(!skipGst&&ABF.gst=='gst'&&!b.gst)return false;if(!skipGst&&ABF.gst=='non'&&b.gst)return false;
  if(q&&(b.id+' '+bname(b)+' '+bmob(b)+' '+baddr(b)).toLowerCase().indexOf(q)<0)return false;
  if(ABF.st=='paid'&&due>0)return false;if(ABF.st=='credit'&&due<=0)return false;
  if(ABF.from&&b.date<ABF.from)return false;if(ABF.to&&b.date>ABF.to)return false;return true})}
function mobileStatementBills(){var q=digits(ABF.q);if(q.length<10)return [];var l=filteredBills().filter(function(b){return bmob(b)==q});return l.length>1?l.slice().sort(function(a,b){return String(a.date).localeCompare(String(b.date))||String(a.id).localeCompare(String(b.id))}):[]}
function statementData(list){var b=list[0],c=S.customers.filter(function(x){return x.id==b.cust})[0]||{};return {name:bname(b),mobile:bmob(b),addr:baddr(b),bills:list,total:sum(list,function(x){return x.total}),paid:sum(list,function(x){return x.paid}),due:sum(list,function(x){return round2(x.total-x.paid)}),biz:S.settings.name}}
function statementText(d){return '*'+d.biz+' — Customer Account Statement*\nCustomer: '+d.name+'\nMobile: '+d.mobile+'\n\n'+d.bills.map(function(b){return 'Bill #'+b.id+' | '+fdate(b.date)+'\nItems: '+b.items.map(function(i){return itemTxt(i)}).join(', ')+'\nTotal: '+money(b.total)+' | Paid: '+money(b.paid)+' | Due: '+money(round2(b.total-b.paid))}).join('\n\n')+'\n\n*Total billed: '+money(d.total)+'*\n*Total received: '+money(d.paid)+'*\n*Total pending: '+money(d.due)+'*\n\nPlease contact us for any clarification. Thank you.'}
function billsSheetsHTML(list,compact){return list.map(function(b){return '<div class="stpage">'+sheetHTML(billData(b),compact)+'</div>'}).join('')}
function statementHTML_old(d){return '<div class="stmt"><div class="stmthead"><div><h2>'+esc(d.biz)+'</h2><div>Customer Account Statement</div></div><div><b>Customer</b><br>'+esc(d.name)+'<br><b>Mobile:</b> '+esc(d.mobile)+'</div></div><div class="stmtintro">Bill-wise purchase and payment summary</div><table class="stmtTable"><thead><tr><th>Bill No.</th><th>Date</th><th>Items purchased</th><th>Total</th><th>Paid</th><th>Due</th></tr></thead><tbody>'+d.bills.map(function(b){return '<tr><td>#'+esc(b.id)+'</td><td>'+fdate(b.date)+'</td><td>'+b.items.map(function(i){return esc(i.q+' × '+i.p)}).join('<br>')+'</td><td class="blue">'+money(b.total)+'</td><td class="green">'+money(b.paid)+'</td><td class="red">'+money(round2(b.total-b.paid))+'</td></tr>'}).join('')+'</tbody><tfoot><tr><th colspan=3>Total</th><th class="blue">'+money(d.total)+'</th><th class="green">'+money(d.paid)+'</th><th class="red">'+money(d.due)+'</th></tr></tfoot></table><div class="stmtfoot">Amount pending: <b class="red">'+money(d.due)+'</b></div></div>'}
function printStatement(d){var w=window.open('','_blank');if(!w){toast('Allow pop-ups to download/print the bills');return}var css='body{margin:0;padding:12px;background:#fff}'+SHEETCSS+'.stpage{margin:0 0 14px}.sheet{max-width:794px}@media print{body{padding:0}.stpage{page-break-after:always;margin:0}.stpage:last-child{page-break-after:auto}.sheet{border:0!important;border-radius:0!important;padding:0!important;max-width:none!important}@page{size:A4;margin:12mm}}';w.document.write('<!doctype html><html><head><meta charset="utf-8"><title>SR Industries Bills - '+esc(d.name)+' '+esc(d.mobile)+'</title><style>'+css+'</style></head><body>'+billsSheetsHTML(d.bills,false)+'<scr'+'ipt>window.onload=function(){window.focus();window.print()}<\/scr'+'ipt></body></html>');w.document.close()}
function showStatement(){var d=statementData(mobileStatementBills());if(!d.bills.length)return;openModal('<div class="pbar"><button class="btn alt sm" data-ab="statement-download">Print / Download PDF</button><a class="btn wa sm" target="_blank" rel="noopener" href="https://wa.me/91'+digits(d.mobile)+'?text='+encodeURIComponent(statementText(d))+'">Send on WhatsApp</a><button class="btn danger sm" data-nb="close">Close</button></div><div class="stsum"><b>'+esc(d.name)+' \u00b7 '+esc(d.mobile)+'</b><span>'+d.bills.length+' bills</span><span>Total '+money(d.total)+'</span><span>Received '+money(d.paid)+'</span><span style="color:var(--red)">Pending '+money(d.due)+'</span></div>'+billsSheetsHTML(d.bills,window.innerWidth<=640),true)}
function gchips(){var base=filteredBills(true),g=base.filter(function(b){return b.gst}).length,k=function(x,lbl,n){return '<button type="button" class="chip'+(ABF.gst==x?' on':'')+'" data-ab="g-'+x+'" aria-pressed="'+(ABF.gst==x)+'">'+lbl+' <b>'+n+'</b></button>'};
 return '<div class="gchips" role="group" aria-label="Filter by bill type">'+k('all','All bills',base.length)+k('gst','GST bills',g)+k('non','Without GST bills',base.length-g)+'</div>'}
function gl(){return ABF.gst=='gst'?' · GST bills only':ABF.gst=='non'?' · Without GST bills only':''}
function billArchiveTable(list,label){return table(['Bill No','Date','Customer','Total','Paid','Reason','Recorded by','Action date'],list.slice().reverse().map(function(b){return ['<b>#'+esc(b.id)+'</b>',fdate(b.date),'<b>'+esc(bname(b))+'</b><br><small class="muted">'+esc(bmob(b))+'</small>',money(b.total),money(b.paid||0),esc(b.actionReason||'-'),esc(b.actionBy||'-'),esc(b.actionDate||'-')]}),'No '+label.toLowerCase()+' bills found.')}
function billBucketTabs(){var c=S.cancelledBills.length,d=S.deletedBills.length;return '<div class="gchips" role="tablist" aria-label="Bill records"><button type="button" class="chip'+(ABF.bucket=='active'?' on':'')+'" data-ab="bucket-active">All Bills <b>'+S.bills.length+'</b></button><button type="button" class="chip'+(ABF.bucket=='cancelled'?' on':'')+'" data-ab="bucket-cancelled">Cancelled Bills <b>'+c+'</b></button><button type="button" class="chip'+(ABF.bucket=='deleted'?' on':'')+'" data-ab="bucket-deleted">Deleted Bills <b>'+d+'</b></button></div>'}
function abResult(){if(ABF.bucket!='active'){var list=ABF.bucket=='cancelled'?S.cancelledBills:S.deletedBills;return billBucketTabs()+kp([['Records',list.length],['Total value',money(sum(list,function(b){return b.total}))],['Audit trail','Reason + employee']])+billArchiveTable(list,ABF.bucket=='cancelled'?'Cancelled':'Deleted')}
 var l=filteredBills(),t=sum(l,function(b){return b.total}),p=sum(l,function(b){return b.paid}),st=mobileStatementBills();
 return billBucketTabs()+kp([['Bills shown',l.length],['Total billed',money(t)],['Received',money(p)],['Pending','<span style="color:'+(t-p>0?'var(--red)':'var(--green)')+'">'+money(t-p)+'</span>']])+gchips()+(st.length?'<div class="card" style="margin:12px 0;padding:14px;display:flex;gap:10px;align-items:center;flex-wrap:wrap"><div style="flex:1;min-width:220px"><b>'+esc(bname(st[0]))+' · '+esc(bmob(st[0]))+'</b><div class="muted">'+st.length+' bills found · All bills of this mobile number'+gl()+'</div></div><button type="button" class="btn alt" data-ab="statement-preview">Preview Bills</button><button type="button" class="btn alt" data-ab="statement-download">Download PDF</button><button type="button" class="btn wa" data-ab="statement-send">Send on WhatsApp</button></div>':'')+billTable(l)}
function allBillsPage(){ABF={q:'',st:'all',from:'',to:'',gst:'all',bucket:'active'};
 return head2('All Bills','Every bill you have made. Search, filter, open a bill to print or share it, or edit a wrong amount or address.',(canAct('create_bill')?'<a class="btn" href="#new-bill" style="text-decoration:none">+ New Bill</a>':''))+
 '<div class="card abf"><div class="fld"><label for="ab-q">Search</label><input id="ab-q" type="search" placeholder="Bill no, name, mobile or address" autocomplete="off"></div>'+
 '<div class="fld"><label for="ab-st">Status</label><select id="ab-st"><option value="all">All bills</option><option value="credit">With pending amount</option><option value="paid">Fully paid</option></select></div>'+
 '<div class="fld"><label for="ab-from">From date</label><input id="ab-from" type="date"></div><div class="fld"><label for="ab-to">To date</label><input id="ab-to" type="date"></div>'+
 '<div class="fld"><button type="button" class="btn alt" data-ab="reset" style="width:100%;height:42px">Reset</button></div></div><div id="abres">'+abResult()+'</div>'}
document.addEventListener('input',function(e){var id=e.target.id;
 if(id=='ab-q'||id=='ab-st'||id=='ab-from'||id=='ab-to'){ABF.q=$('#ab-q').value;ABF.st=$('#ab-st').value;ABF.from=$('#ab-from').value;ABF.to=$('#ab-to').value;$('#abres').innerHTML=abResult()}});
document.addEventListener('click',function(e){var t=e.target.closest('[data-ab]');if(!t)return;if(t.dataset.ab=='reset'){['#ab-q','#ab-from','#ab-to'].forEach(function(s){$(s).value=''});$('#ab-st').value='all';ABF={q:'',st:'all',from:'',to:'',gst:'all',bucket:'active'};$('#abres').innerHTML=abResult()}else if(/^bucket-/.test(t.dataset.ab)){ABF.bucket=t.dataset.ab.slice(7);$('#abres').innerHTML=abResult()}else if(/^g-/.test(t.dataset.ab)){ABF.gst=t.dataset.ab.slice(2);$('#abres').innerHTML=abResult()}else if(t.dataset.ab=='statement-preview')showStatement();else if(t.dataset.ab=='statement-download'){var d=statementData(mobileStatementBills());if(d.bills.length)printStatement(d)}else if(t.dataset.ab=='statement-send'){var d=statementData(mobileStatementBills());if(d.bills.length)window.open('https://wa.me/91'+digits(d.mobile)+'?text='+encodeURIComponent(statementText(d)),'_blank')}});
/* ---------- Customers, Payments, Credit / Outstanding ---------- */
var CV=null,CUQ='',PAYCUST='',NBPRE=null;
function cget(id){return S.customers.filter(function(c){return c.id==id})[0]}
function cbills(id){return S.bills.filter(function(b){return b.cust==id})}
function cstat(c){var bl=cbills(c.id),t=sum(bl,function(b){return b.total}),p=sum(bl,function(b){return b.paid}),od='';
 bl.forEach(function(b){if(b.total>b.paid&&(!od||b.date<od))od=b.date});
 return {bills:bl,n:bl.length,total:round2(t),paid:round2(p),pend:round2(t-p),oldest:od}}
function daysAgo(d){return Math.max(0,Math.round((new Date(today())-new Date(d))/864e5))}
function confirmTap(t){if(t.dataset.arm)return true;t.dataset.arm='1';t.dataset.lbl=t.textContent;t.textContent='Tap again to confirm';t.classList.add('armed');
 setTimeout(function(){if(t.isConnected){delete t.dataset.arm;t.textContent=t.dataset.lbl;t.classList.remove('armed')}},3000);return false}
function remindURL(c,pend){var m=digits(c.phone);return 'https://wa.me/91'+m+'?text='+encodeURIComponent('Hello '+c.name+', this is a reminder from '+S.settings.name+'. Your pending balance is '+money(pend)+'. Please pay at your earliest convenience. Thank you.')}
function pendTag(n){return '<span class="pill '+(n>0?'p-amber':'p-green')+'">'+money(n)+'</span>'}

/* ----- Customers ----- */
PAGES.customers=function(){if(CV&&!cget(CV))CV=null;return CV?custDetail(cget(CV)):custList()};
function custList(){CUQ='';
 var addBtn=canAct('create_customer')?'<button class="btn" data-cu="add">+ Add Customer</button>':'';
 return head2('Customers','Everyone you sell to. A customer is added automatically when you save a bill. Open a customer to see their full history, edit their details or receive a payment.',addBtn)+
 '<div class="card abf" style="grid-template-columns:1fr"><div class="fld"><label for="cu-q">Search customer</label><input id="cu-q" type="search" placeholder="Name, mobile or address" autocomplete="off"></div></div><div id="cures">'+custRows('')+'</div>'}
function matchCust(c,q){q=(q||'').trim().toLowerCase();if(!q)return true;var d=q.replace(/[\s+\-]/g,'');if(/^\d+$/.test(d)){var ph=digits(c.phone);return d.length>=10?ph==d.slice(-10):ph.indexOf(d)==0}return (String(c.name||'')+' '+String(c.area||'')).toLowerCase().indexOf(q)>-1}
function custRows(q){q=q.trim().toLowerCase();
 var l=S.customers.filter(function(c){return matchCust(c,q)}).map(function(c){return [c,cstat(c)]}).sort(function(a,b){return b[1].pend-a[1].pend||a[0].name.localeCompare(b[0].name)});
 return table(['Customer','Mobile','Bills','Total purchase','Pending',''],l.map(function(a){var c=a[0],s=a[1];
  return ['<div><b>'+esc(c.name)+(c.active===false?' <span class="pill">Inactive</span>':'')+'</b><br><small class="muted">'+esc(c.area||'No address')+'</small></div>','<div class="rowact" style="align-items:center;gap:6px"><span>'+esc(c.phone)+'</span><button type="button" class="btn sm alt" data-cu="copy-mobile" data-phone="'+esc(c.phone)+'">Copy Mobile</button></div>',s.n,money(s.total),pendTag(s.pend),
   '<div class="rowact"><button class="btn sm alt" data-cu="open" data-id="'+c.id+'">Open</button>'+(s.pend>0&&canAct('create_payment')?'<button class="btn sm" data-cu="pay" data-id="'+c.id+'">Receive</button>':'')+'</div>']}),'No customers found.')}
function custDetail(c){var s=cstat(c),pays=S.payments.filter(function(p){return p.cust==c.id}).slice().reverse();
 return '<div class="ph"><button class="btn alt" data-cu="back">← All customers</button></div>'+
 '<div class="card custcard"><div style="flex:1;min-width:0"><small class="muted">Customer</small><h2 style="margin:2px 0;font-size:22px">'+esc(c.name)+(c.active===false?' <span class="pill" style="font-size:12px;vertical-align:middle">Inactive</span>':'')+'</h2><div>'+esc(c.phone)+'</div><div class="muted">'+esc(c.area||'No address')+'</div></div>'+
  '<div class="rowact" style="align-self:flex-start">'+
  (canAct('edit_customer')?'<button class="btn sm alt" data-cu="edit" data-id="'+c.id+'">Edit</button>':'')+
  (canAct('create_bill')?'<button class="btn sm" data-cu="bill" data-id="'+c.id+'">+ New Bill</button>':'')+
  (s.pend>0&&canAct('create_payment')?'<button class="btn sm green" data-cu="pay" data-id="'+c.id+'">Receive payment</button><a class="btn sm wa" target="_blank" rel="noopener" href="'+remindURL(c,s.pend)+'">Remind on WhatsApp</a>':'')+
  (canAct('edit_customer')?'<button type="button" class="btn sm '+(c.active===false?'green':'danger')+'" data-cu="toggle-active" data-id="'+c.id+'">'+(c.active===false?'Reactivate':'Mark Inactive')+'</button>':'')+
  '</div></div>'+
 kp([['Total bills',s.n],['Total purchase',money(s.total)],['Total paid',money(s.paid)],['Pending amount','<span style="color:'+(s.pend>0?'var(--red)':'var(--green)')+'">'+money(s.pend)+'</span>']])+
 '<h3 style="margin:16px 0 0">Bills (date wise)</h3>'+billTable(s.bills,true)+
 '<h3 style="margin:16px 0 0">Payments received</h3>'+table(['Date','Amount','Mode','Against bill',''],pays.map(function(p){return [fdate(p.date),money(p.amount),esc(p.mode),p.bill=='-'?'Advance':'#'+esc(p.bill),p.amount>0?(canAct('reverse_payment')?'<button type="button" class="btn sm danger" data-rev-pay="'+p.id+'">Reverse</button>':''):'<span class="pill p-amber">Reversal</span>']}),'No payments yet.')}
function custForm(c){var f=function(k,l,v,t,m){return '<div class="fld"><label for="cf-'+k+'">'+l+'</label><input id="cf-'+k+'" name="'+k+'" type="'+(t||'text')+'" value="'+esc(v||'')+'"'+(m||'')+'></div>'};
 openModal('<h3>'+(c?'Edit customer':'Add customer')+'</h3><p>Name, mobile number and address are all required.</p><form id="cuform" data-id="'+(c?c.id:'')+'" novalidate style="display:grid;gap:12px">'+f('name','Customer Name *',c&&c.name)+f('mobile','Mobile Number *',c&&digits(c.phone),'tel',' inputmode="numeric" maxlength="10"')+f('addr','Address *',c&&c.area)+
  '<div class="dact"><button type="button" class="btn alt" data-nb="close">Cancel</button><button type="submit" class="btn">Save</button></div></form>')}
document.addEventListener('submit',function(e){if(e.target.id!='cuform')return;e.preventDefault();var f=e.target,id=f.dataset.id;
 var isNew=!id;
 if(isNew&&!canAct('create_customer')){toast('Not permitted');return}
 if(!isNew&&!canAct('edit_customer')){toast('Not permitted');return}
 var name=f.name.value.trim(),mob=digits(f.mobile.value),addr=f.addr.value.trim();
 ['#cf-name','#cf-mobile','#cf-addr'].forEach(clearErr);
 if(!name)return bad('#cf-name','Enter the customer name');if(mob.length!=10)return bad('#cf-mobile','Enter a 10-digit mobile number');if(!addr)return bad('#cf-addr','Enter the address');
 var dup=S.customers.filter(function(x){return x.id!=id&&digits(x.phone)==mob})[0];if(dup)return bad('#cf-mobile','Mobile already used by '+dup.name);
 if(id){var c=cget(id);c.name=name;c.phone=mob;c.area=addr;cbills(id).forEach(function(b){b.name=name;b.mobile=mob;b.addr=addr});sbUpdateCustomerAndBills(c);toast('Customer updated')}
 else{var n={id:nid('C',S.customers),name:name,phone:mob,area:addr,date:today()};S.customers.push(n);sbUpsertCustomer(n);toast('Customer added')}
 save();closeModal();render()});
document.addEventListener('input',function(e){if(e.target.id=='cu-q'){$('#cures').innerHTML=custRows(e.target.value)}
 if(e.target.id=='op-q'){$('#opres').innerHTML=opRows(e.target.value)}});
function copyMobileFallback(ph){var x=document.createElement('textarea');x.value=ph;x.style.position='fixed';x.style.opacity='0';document.body.appendChild(x);x.select();try{document.execCommand('copy');toast('Mobile number copied: '+ph)}catch(e){toast('Copy failed. Mobile: '+ph)}x.remove()}
document.addEventListener('click',function(e){var t=e.target.closest('[data-cu],[data-op]');if(!t)return;var a=t.dataset.cu||('op-'+t.dataset.op),id=t.dataset.id;
 if(a=='copy-mobile'){var ph=digits(t.dataset.phone||'');if(!ph){toast('Mobile number not available');return}if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(ph).then(function(){toast('Mobile number copied: '+ph)}).catch(function(){copyMobileFallback(ph)})}else copyMobileFallback(ph);return}
 if(a=='open'||a=='op-open'){CV=id;if(location.hash=='#customers')render();else location.hash='#customers'}
 else if(a=='back'){CV=null;render()}
 else if(a=='add'){if(!canAct('create_customer')){toast('Not permitted');return}custForm(null)}
 else if(a=='edit'){if(!canAct('edit_customer')){toast('Not permitted');return}custForm(cget(id))}
 else if(a=='pay'||a=='op-pay'){if(!canAct('create_payment')){toast('Not permitted');return}PAYCUST=id;if(location.hash=='#payments')render();else location.hash='#payments'}
 else if(a=='bill'){if(!canAct('create_bill')){toast('Not permitted');return}NBPRE=id;if(location.hash=='#new-bill')render();else location.hash='#new-bill'}
 else if(a=='toggle-active'){
  if(!canAct('edit_customer')){toast('Not permitted');return}
  var c=cget(id);if(!c)return;
  var nextActive=c.active===false;
  var snap=JSON.stringify(S);
  c.active=nextActive;save();sbSetCustomerActive(id,nextActive);render();
  toast('Customer '+(nextActive?'reactivated':'marked inactive')+'. Tap Undo if this was a mistake.',function(){
   S=JSON.parse(snap);save();sbSetCustomerActive(id,!nextActive);render();toast('Restored');
  });
 }
});

/* ----- Payments ----- */
PAGES.payments=function(){
 var canCreatePay=canAct('create_payment'),canRev=canAct('reverse_payment');
 var pend=S.customers.map(function(c){return [c,cstat(c).pend]}).filter(function(a){return a[1]>0}).sort(function(a,b){return a[0].name.localeCompare(b[0].name)});
 var pre=pend.filter(function(a){return a[0].id==PAYCUST})[0];if(!pre)PAYCUST='';
 var sel=pre?pre[0].id:(pend[0]?pend[0][0].id:''),cust=sel&&cget(sel),bills=cust?cbills(cust.id).filter(function(b){return round2(b.total-b.paid)>0}):[];
 var billSel=bills[0],billDue=billSel?round2(billSel.total-billSel.paid):0;
 var form=canCreatePay?(pend.length?'<form id="payform" class="card form" autocomplete="off" novalidate>'+
  '<div class="fld" style="grid-column:1/-1"><label for="pay-search">Search customer by mobile number or name</label><input id="pay-search" type="search" placeholder="Paste mobile number or type customer name" autocomplete="off"></div>'+
  '<div class="fld" style="grid-column:1/-1"><label for="pay-c">Customer</label><select id="pay-c">'+pend.map(function(a){return '<option value="'+a[0].id+'"'+(a[0].id==sel?' selected':'')+'>'+esc(a[0].name)+' · '+esc(a[0].phone)+' · Pending '+money(a[1])+'</option>'}).join('')+'</select></div>'+
  '<div class="fld" style="grid-column:1/-1"><label for="pay-b">Bill Number (choose the exact bill)</label><select id="pay-b">'+bills.map(function(b){return '<option value="'+b.id+'">#'+esc(b.id)+' · '+fdate(b.date)+' · Total '+money(b.total)+' · Paid '+money(b.paid)+' · Due '+money(round2(b.total-b.paid))+'</option>'}).join('')+'</select></div>'+
  '<div class="fld"><label for="pay-a">Amount received (₹)</label><input id="pay-a" type="number" min="0.01" step="0.01" inputmode="decimal" value="'+billDue+'" max="'+billDue+'"></div>'+
  '<div class="fld"><label for="pay-m">Payment mode</label><select id="pay-m">'+MODES.map(function(m){return '<option>'+m+'</option>'}).join('')+'</select></div>'+
  '<div class="fld"><label for="pay-d">Date</label><input id="pay-d" type="date" value="'+today()+'"></div>'+
  '<div class="fld"><button class="btn green" type="submit" style="width:100%;height:42px">Save Payment</button></div>'+
  '<div id="payinfo" class="note" style="grid-column:1/-1;margin:0">Payment applies only to selected bill.</div></form>'
  :'<div class="card"><div class="empty">No customer has a pending amount right now. Nothing to receive.</div></div>'):'';
 var l=S.payments.slice().reverse();
 return head2('Payments','Search by customer mobile/name, then select the exact bill. Bill total, received and due are shown separately.')+form+
  '<h3 style="margin:18px 0 0">Payment history</h3>'+table(['Date','Customer','Amount Paid','Mode','Against bill',''],l.map(function(p){return [fdate(p.date),esc(custName(p.cust)),money(p.amount),esc(p.mode),p.bill=='-'?'Advance':'#'+esc(p.bill),p.amount>0?(canRev?'<button type="button" class="btn sm danger" data-rev-pay="'+p.id+'">Reverse</button>':''):'<span class="pill p-amber">Reversal</span>']}),'No payments yet.')};
function paySearchCustomers(q){var s=$('#pay-c');if(!s)return;var needle=(q||'').trim(),all=S.customers.filter(function(c){return matchCust(c,needle)}),matches=all.map(function(c){return [c,cstat(c).pend]}).filter(function(a){return a[1]>0}),current=s.value;
 s.innerHTML=matches.map(function(a){return '<option value="'+a[0].id+'">'+esc(a[0].name)+' · '+esc(a[0].phone)+' · Pending '+money(a[1])+'</option>'}).join('');
 if(matches.some(function(a){return a[0].id==current}))s.value=current;else if(matches.length)s.value=matches[0][0].id;
 payFill();
 if(!matches.length)$('#payinfo').innerHTML=!needle?'No customer has a pending amount.':all.length?all.map(function(c){return '<b>'+esc(c.name)+'</b> ('+esc(c.phone)+')'}).join(', ')+' has no unpaid bills. Nothing to receive.':'No customer found for "'+esc(needle)+'".'}
function payFill(){var s=$('#pay-c');if(!s)return;var c=cget(s.value),bs=c?cbills(c.id).filter(function(b){return round2(b.total-b.paid)>0}):[],sel=$('#pay-b');if(!sel)return;sel.innerHTML=bs.map(function(b){return '<option value="'+b.id+'">#'+esc(b.id)+' · '+fdate(b.date)+' · Total '+money(b.total)+' · Paid '+money(b.paid)+' · Due '+money(round2(b.total-b.paid))+'</option>'}).join('');var b=bs[0],due=b?round2(b.total-b.paid):0;$('#pay-a').value=due;$('#pay-a').max=due;var total=c?cstat(c).pend:0;payInfo(b,total,due)}
function payBillFill(){var id=$('#pay-b').value,b=S.bills.filter(function(x){return x.id==id})[0],due=b?round2(b.total-b.paid):0;$('#pay-a').value=due;$('#pay-a').max=due;var c=b&&cget(b.cust),total=c?cstat(c).pend:0;payInfo(b,total,due)}
function payInfo(b,total,due){$('#payinfo').innerHTML=b?'<div style="display:flex;flex-wrap:wrap;gap:10px;margin-bottom:8px"><span style="color:#2563eb;font-weight:700">Bill total: '+money(b.total)+'</span><span style="color:#16a34a;font-weight:700">Paid: '+money(b.paid)+'</span><span style="color:#dc2626;font-weight:700">Due: '+money(due)+'</span></div><b>Customer total pending: '+money(total)+'</b><br>Amount defaults to selected bill due. Payment updates this bill only.':'No unpaid bills for this customer.'}
document.addEventListener('input',function(e){if(e.target.id=='pay-search')paySearchCustomers(e.target.value)});
document.addEventListener('change',function(e){if(e.target.id=='pay-c')payFill();else if(e.target.id=='pay-b')payBillFill()});
document.addEventListener('submit',function(e){if(e.target.id!='payform')return;e.preventDefault();
 if(!canAct('create_payment')){toast('Not permitted');return}
 var b=S.bills.filter(function(x){return x.id==$('#pay-b').value})[0],c=b&&cget(b.cust),pend=b?round2(b.total-b.paid):0,a=round2(+$('#pay-a').value||0);clearErr('#pay-a');
 if(!b||!c)return toast('Select an unpaid bill');
 if(!(a>0))return bad('#pay-a','Enter an amount received');
 if(a>pend)return bad('#pay-a','Amount cannot be more than this bill pending '+money(pend));
 var payDate=$('#pay-d').value||today(),payMode=$('#pay-m').value;
 sbRecordPayment({customer_id:c.id,bill_id:b.id,amount:a,mode:payMode,payment_date:payDate,notes:'Payment for bill #'+b.id}).then(function(res){
  var p=res.payment,updatedBill=res.bill;
  if(updatedBill&&b){b.paid=Number(updatedBill.paid||0)}
  if(p){S.payments.push({id:p.id,date:p.payment_date||payDate,cust:p.customer_id||c.id,amount:Number(p.amount||a),mode:p.mode||payMode,bill:p.bill_id||b.id,reversed_at:null,reversed_by:'',reversal_reason:'',notes:p.notes||''})}
  PAYCUST='';save();toast(money(a)+' received for bill #'+b.id+'. Bill pending '+money(round2(b.total-b.paid)));render();
  refreshPayments().then(function(){refreshBills().then(function(){render()})});
 }).catch(function(err){
  toast('Failed to record payment: '+(err&&err.message?err.message:'Unknown error'));
 });
});

/* ----- Bill cancellation ----- */
function billDispositionModal(action,id){
 var b=S.bills.filter(function(x){return x.id==id})[0];if(!b)return;
 var linkedPayments=S.payments.filter(function(p){return p.bill==id}),linkedAmount=sum(linkedPayments,function(p){return p.amount||0});
 var note='This bill will move to Cancelled Bills and will no longer count in active sales or outstanding totals. '+(linkedPayments.length?'Existing receipts ('+linkedPayments.length+' payment(s), '+money(linkedAmount)+') will remain in Payment History for audit; handle any refund or adjustment separately.':'No payment is linked to this bill.');
 var html='<div class="bill-modal-title"><span class="mark">⊘</span><div><h3 style="text-align:left;margin:0">Cancel bill #'+esc(id)+'</h3><small class="muted">'+esc(bname(b))+' · '+money(b.total)+' · '+fdate(b.date)+'</small></div></div><p style="text-align:left">'+note+'</p>'+
 '<form id="billDispositionForm" data-action="cancel" data-id="'+esc(id)+'" class="form" style="grid-template-columns:1fr">'+
 '<div class="fld"><label for="bill-action-by">Employee name</label><input id="bill-action-by" name="actionBy" required maxlength="80" placeholder="Enter employee name"></div>'+
 '<div class="fld"><label for="bill-action-reason">Cancellation reason</label><textarea class="bill-reason" id="bill-action-reason" name="actionReason" required minlength="5" maxlength="500" placeholder="Explain why this bill is being cancelled"></textarea></div>'+
 '<div class="note warn">Cancellation keeps the original bill in the Cancelled Bills archive.</div><div class="dact"><button type="button" class="btn alt" data-nb="close">Go back</button><button type="submit" class="btn">Confirm Cancellation</button></div></form>';
 openModal(html);
}
function archiveBill(action,id,data){var b=S.bills.filter(function(x){return x.id==id})[0];if(!b)return false;
 var nowIso=new Date().toISOString(),reason=(data.actionReason||'').trim(),by=(data.actionBy||'').trim();
 closeModal();
 return sbCancelBill(id,reason).then(function(res){
  var archived=Object.assign({},b,{archiveType:'cancel',status:'cancelled',actionReason:reason,reason:reason,actionBy:by,actionDate:new Date().toLocaleString('en-IN'),actionAt:nowIso,cancelledAt:nowIso,deletedAt:''});
  S.cancelledBills.push(archived);
  S.bills=S.bills.filter(function(x){return x.id!=id});
  save();render();toast('Bill #'+id+' cancelled');
  refreshBills().then(function(){render()});
 }).catch(function(err){
  toast('Failed to cancel bill: '+(err&&err.message?err.message:'Unknown error'));
 });
 return true}
document.addEventListener('submit',function(e){var f=e.target;
 if(f.id=='billDispositionForm'){e.preventDefault();var d={actionBy:(f.elements.actionBy.value||'').trim(),actionReason:(f.elements.actionReason.value||'').trim()};
  if(d.actionBy.length<2||d.actionReason.length<5){toast('Enter employee name and a clear reason');return}
  archiveBill('cancel',f.dataset.id,d);return}
});
document.addEventListener('click',function(e){var t=e.target.closest('[data-billact]');if(t)billDispositionModal(t.dataset.billact,t.dataset.id)});
/* ----- Payment reversal (audit safe) ----- */
function reversePayment(id){
 var p=S.payments.filter(function(x){return x.id==id})[0];if(!p)return;
 if(!(p.amount>0)){toast('Cannot reverse a payment reversal entry');return}
 var c=cget(p.cust),cName=c?c.name:custName(p.cust);
 var h='<div class="bill-modal-title"><span class="mark" style="background:#fef3c7;color:#d97706">↺</span><div><h3 style="text-align:left;margin:0">Reverse Payment #'+esc(p.id)+'?</h3><small class="muted">'+esc(cName)+' · '+money(p.amount)+' · '+fdate(p.date)+'</small></div></div>'+
  '<p style="text-align:left">This will create a negative reversing entry of <b>-'+money(p.amount)+'</b> in payment history dated today. '+
  (p.bill&&p.bill!='-'?'Bill #<b>'+esc(p.bill)+'</b> will show this amount as pending again across Customers, Bills, Outstanding, and Dashboard.':'Customer pending balance will increase by '+money(p.amount)+'.')+
  '<br><br>The original receipt remains in payment history for audit compliance.</p>'+
  '<div class="dact"><button type="button" class="btn alt" data-nb="close">Cancel</button><button type="button" class="btn danger" data-confirm-rev="'+esc(p.id)+'">Confirm Reversal</button></div>';
 openModal(h);
}
function doReversePayment(id){
 var p=S.payments.filter(function(x){return x.id==id})[0];if(!p)return;
 if(p.reversed_at||!(p.amount>0)){toast('Cannot reverse this payment');return}
 closeModal();
 var reason='User reversed payment';
 var revBy=(SESSION&&SESSION.user&&SESSION.user.email)||'Authorized Staff';
 return sbReversePayment(p.id,reason).then(function(res){
  p.reversed_at=new Date().toISOString();
  p.reversed_by=revBy;
  p.reversal_reason=reason;
  var b=p.bill&&p.bill!='-'?S.bills.filter(function(x){return x.id==p.bill})[0]:null;
  if(res&&res.bill&&b){b.paid=Number(res.bill.paid||0)}
  save();render();toast('Payment #'+p.id+' reversed');
  refreshPayments().then(function(){refreshBills().then(function(){render()})});
 }).catch(function(err){
  toast('Failed to reverse payment: '+(err&&err.message?err.message:'Unknown error'));
 });
}
document.addEventListener('click',function(e){
 var rp=e.target.closest('[data-rev-pay]');if(rp){if(!canAct('reverse_payment')){toast('Not permitted');return}reversePayment(rp.dataset.revPay);return}
 var cr=e.target.closest('[data-confirm-rev]');if(cr){if(!canAct('reverse_payment')){toast('Not permitted');return}doReversePayment(cr.dataset.confirmRev);return}
 if(e.target.closest('#tundo')&&toast.u){var f=toast.u;toast.u=null;f()}
});
/* ===== New employee joining: invite link, employee form, owner approval ===== */
var INVLINK=null,JOIN={t:'',biz:'',own:'',photo:'',doc:'',docType:'',stream:null,app:null};
var VD=[[0,1,2,3,4,5,6,7,8,9],[1,2,3,4,0,6,7,8,9,5],[2,3,4,0,1,7,8,9,5,6],[3,4,0,1,2,8,9,5,6,7],[4,0,1,2,3,9,5,6,7,8],[5,9,8,7,6,0,4,3,2,1],[6,5,9,8,7,1,0,4,3,2],[7,6,5,9,8,2,1,0,4,3],[8,7,6,5,9,3,2,1,0,4],[9,8,7,6,5,4,3,2,1,0]],
 VP=[[0,1,2,3,4,5,6,7,8,9],[1,5,7,6,2,8,3,0,9,4],[5,8,0,3,7,9,6,1,4,2],[8,9,1,6,0,4,3,5,2,7],[9,4,5,3,1,2,6,8,7,0],[4,2,8,6,5,7,3,9,0,1],[2,7,9,3,8,0,6,4,1,5],[7,0,4,6,9,1,3,2,5,8]];
function aadhaarOk(a){a=String(a||'');if(!/^[2-9]\d{11}$/.test(a))return false;var c=0,r=a.split('').reverse();for(var i=0;i<r.length;i++)c=VD[c][VP[i%8][+r[i]]];return c===0}
function normalizeDL(v){return String(v||'').toUpperCase().replace(/[\s\/-]/g,'')}
function drivingLicenseOk(v){v=normalizeDL(v);return !v||/^[A-Z]{2}\d{2}\d{4}\d{7}$/.test(v)}
function maskA(a){
 a=String(a||'').trim();
 if(!a)return 'Not provided';
 if(/^XXXX[\s-]*XXXX[\s-]*\d{4}$/i.test(a))return 'XXXX XXXX '+a.slice(-4);
 var d=a.replace(/\D/g,'');
 if(d.length>=4)return 'XXXX XXXX '+d.slice(-4);
 return 'XXXX XXXX ****';
}
function maskPan(p){
 p=String(p||'').trim().toUpperCase();
 if(!p)return 'Not provided';
 if(p.indexOf('*')>=0)return p;
 if(p.length===10)return p.slice(0,2)+'*****'+p.slice(-2);
 if(p.length>=4)return '*****'+p.slice(-4);
 return '*****';
}
function maskLicense(l){
 l=String(l||'').trim().toUpperCase();
 if(!l)return 'Not provided';
 if(l.indexOf('XXXX')>=0)return l;
 var c=l.replace(/[\s\/-]/g,'');
 if(c.length>=4)return 'XXXX-XXXX-'+c.slice(-4);
 return 'XXXX-XXXX-****';
}
function appRetentionBadge(a){
 if(a.status!=='Approved'&&a.status!=='Rejected')return '';
 var deadline=a.retentionDeadline?new Date(a.retentionDeadline).getTime():(a.decidedAt?new Date(a.decidedAt).getTime()+30*864e5:0);
 if(!deadline)return '<span class="pill sm p-gray">30d retention</span>';
 var days=Math.ceil((deadline-Date.now())/864e5);
 if(days<=0)return '<span class="pill sm p-red" title="Eligible for document purge">Expired (pending purge)</span>';
 return '<span class="pill sm p-orange" title="Auto-purged in '+days+' days">Purging in '+days+'d (30d retention)</span>';
}
function triggerRetentionCleanup(){
 if(!SB||!SESSION||!isOwner())return Promise.resolve();
 return api('/api/retention/cleanup',{method:'POST'}).then(function(r){
  if(r.ok)return r.json();
  return null;
 }).then(function(data){
  if(data&&data.deletedCount>0){
   toast('Retention cleanup: '+data.deletedCount+' expired application(s) purged');
   return syncApps(false);
  }
 }).catch(function(){});
}
function fmtA(a){a=String(a||'');return a?a.replace(/(\d{4})(?=\d)/g,'$1 '):'Not provided'}
function newTok(){var a='abcdefghjkmnpqrstuvwxyz23456789',t='';for(var i=0;i<8;i++)t+=a.charAt(Math.floor(Math.random()*a.length));return t}
function readImg(file,maxW,q){return new Promise(function(res,rej){var fr=new FileReader();fr.onerror=function(){rej()};fr.onload=function(){var im=new Image();im.onerror=function(){rej()};im.onload=function(){var sc=Math.min(1,maxW/Math.max(im.width,im.height)),c=document.createElement('canvas');c.width=Math.max(1,Math.round(im.width*sc));c.height=Math.max(1,Math.round(im.height*sc));c.getContext('2d').drawImage(im,0,0,c.width,c.height);res(c.toDataURL('image/jpeg',q))};im.src=fr.result};fr.readAsDataURL(file)})}
function copyTxt(v){if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(v).then(function(){toast('Copied')},function(){copyTxtFb(v)})}else copyTxtFb(v)}
function copyTxtFb(v){var x=document.createElement('textarea');x.value=v;x.style.position='fixed';x.style.opacity='0';document.body.appendChild(x);x.select();try{document.execCommand('copy');toast('Copied')}catch(e){toast('Copy not supported, select the link and copy it')}x.remove()}

/* ---------- owner: invite + approvals ---------- */
function mkInviteLink(inv){return location.href.split('#')[0]+'#join='+b64e({t:inv.t,b:S.settings.name,p:digits(S.settings.phone)})}
function waInvite(){var l=INVLINK;if(!l)return '#';var m='Hello! Please fill your joining details for '+S.settings.name+' using this link:\n'+l.url+'\n\n'+S.settings.name+' లో చేరడానికి ఈ లింక్ ఓపెన్ చేసి మీ వివరాలు నింపండి.';return 'https://wa.me/'+(l.to?'91'+l.to:'')+'?text='+encodeURIComponent(m)}
var SYNC={busy:false,state:'ok'};
function online(){return location.protocol!='file:'}
function api(path,opt){
 opt=opt||{};
 var getTok=SB?SB.auth.getSession().then(function(r){var s=r&&r.data&&r.data.session;if(s)SESSION=s;return s&&s.access_token?s.access_token:''}):Promise.resolve(SESSION&&SESSION.access_token||'');
 return getTok.then(function(tok){
  var hdrs=Object.assign({'content-type':'application/json'},opt.headers||{});
  if(tok)hdrs.authorization='Bearer '+tok;
  opt.headers=hdrs;
  return fetch(path,opt);
 });
}
function syncApps(manual){
 if(!SB||!SESSION||SYNC.busy)return Promise.resolve();
 SYNC.busy=true;
 var prevIds={};S.applications.forEach(function(a){prevIds[a.id]=1});
 return Promise.all([
  fetchAllRows('employee_applications',[['submitted_at',true]]),
  fetchAllRows('employee_invites',[['created_date',true]])
 ]).then(function(res){
  var appRows=res[0],invRows=res[1],paths=[];
  appRows.forEach(function(r){paths.push(r.photo_path,r.doc_path,r.pan_doc_path,r.license_doc_path)});
  return signEmployeePaths(paths).then(function(sm){
   var mapped=appRows.map(function(r){return mapApplicationRow(r,sm)});
   var newApps=mapped.filter(function(a){return a.status=='Pending'&&!prevIds[a.id]});
   S.applications=mapped;
   S.invites=invRows.map(function(r){return {id:r.token,t:r.token,status:r.status||'open',date:r.created_date||today(),expiresAt:r.expires_at||''}});
   SYNC.state='ok';
   if(newApps.length){
    toast(newApps.length==1?'New joining application: '+newApps[0].name:newApps.length+' new joining applications');
    var f=document.activeElement;if(PAGE_IS('employees')&&!(f&&/INPUT|SELECT|TEXTAREA/.test(f.tagName)))render();
   }else if(manual){
    toast('No new applications');
    if(PAGE_IS('employees'))render();
   }
  });
 }).catch(function(e){
  SYNC.state='err';
  if(manual)toast('Could not refresh applications from Supabase');
 }).then(function(){
  SYNC.busy=false;
  if(PAGE_IS('employees')){var el=$('#sync-st');if(el)el.outerHTML=syncStatus()}
 });
}
function PAGE_IS(id){return (location.hash||'#dashboard').replace('#','').split('?')[0]==id}
function syncStatus(){var h='';if(!online())h='Not available when opened as a file';else if(!SESSION)h='Not signed in';else if(SYNC.state=='ok')h='Connected to Supabase · new applications appear here automatically';else h='Could not reach Supabase';return '<span id="sync-st" class="muted">'+h+'</span>'}
setInterval(function(){if(!document.hidden&&!JOIN.t&&SESSION&&DATA_READY)syncApps(false)},25000);
var ROLES=['Driver','Helper','Operator','System Operator','Sweeper','Security Guard','Accountant','Other'];
function appCard(a){
 var isDecided=a.status==='Approved'||a.status==='Rejected';
 var idParts=[];
 if(a.aadhaar)idParts.push('Aadhaar '+maskA(a.aadhaar));
 if(a.pan)idParts.push('PAN '+maskPan(a.pan));
 if(a.licenseNo)idParts.push('Licence '+maskLicense(a.licenseNo));
 return '<div class="apc"><img class="eph big" src="'+a.photo+'" alt="Photo of '+esc(a.name)+'"><div class="ainfo"><b>'+esc(a.name)+'</b><span>'+esc(a.mobile)+(idParts.length?' · '+idParts.join(' · '):'')+'</span><span>'+esc(a.address)+'</span><span>Applied '+fdate(a.date)+(isDecided?' · <b>'+esc(a.status)+'</b> ':'')+'</span>'+appRetentionBadge(a)+'<div class="rowact" style="margin-top:6px"><button type="button" class="btn sm alt" data-ej="doc" data-id="'+a.id+'">Aadhaar</button>'+(a.panDoc?'<button type="button" class="btn sm alt" data-ej="appdoc" data-id="'+a.id+'" data-type="pan">PAN</button>':'')+(a.licenseDoc?'<button type="button" class="btn sm alt" data-ej="appdoc" data-id="'+a.id+'" data-type="license">Licence</button>':'')+'</div></div>'+
 (isDecided?'<div class="aact"><div class="arow"><button type="button" class="btn sm danger alt" data-ej="delete" data-id="'+a.id+'">Purge now</button></div></div>':
 '<div class="aact"><div class="fld"><label for="ar-'+a.id+'">Role</label><select id="ar-'+a.id+'">'+ROLES.map(function(r){return '<option>'+r+'</option>'}).join('')+'</select></div><div class="fld"><label for="as-'+a.id+'">Monthly salary (₹)</label><input id="as-'+a.id+'" type="number" min="0" inputmode="numeric" placeholder="0"></div><div class="arow"><button type="button" class="btn green" data-ej="approve" data-id="'+a.id+'">Approve</button><button type="button" class="btn sm alt" data-ej="pending" data-id="'+a.id+'">Keep Pending</button><button type="button" class="btn sm danger" data-ej="reject" data-id="'+a.id+'">Reject</button><button type="button" class="btn danger" data-ej="delete" data-id="'+a.id+'">Delete</button></div></div>')+
 '</div>';
}
PAGES.employees=function(){setTimeout(function(){if(isOwner())syncApps(false)},50);
 FORMS.mf=function(v){if(!canAct('manage_employees'))return 'Not permitted';var rec={id:nid('M',S.employees),name:v.name,role:v.role,phone:v.phone,salary:+v.salary,tok:newTok()+newTok()+newTok(),joined:today(),joinedAt:new Date().toISOString()};S.employees.push(rec);sbUpsertRow('employees',sbEmployeeRow(rec));return 'Employee added'};
 var isOwn=isOwner(),canManage=canAct('manage_employees');
 var pend=isOwn?S.applications.filter(function(a){return a.status=='Pending'}):[];
 var decided=isOwn?S.applications.filter(function(a){return a.status=='Approved'||a.status=='Rejected'}):[];
 var inv=isOwn?('<div class="card inv"><h3>Invite a new employee</h3><p class="pdesc">Send a joining link on WhatsApp. The employee fills personal details, Aadhaar and PAN details, uploads Aadhaar/PAN/Driving Licence documents, takes a live photo, and submits. You review and approve the application.</p>'+
  (location.protocol=='file:'?'<div class="note warn">This link will open on the employee\'s phone only after the app is hosted online (Cloudflare Pages). A link made from a file on this computer cannot be opened on another phone.</div>':'')+
  '<div class="invrow"><div class="fld"><label for="inv-me">Your WhatsApp number</label><input id="inv-me" type="tel" inputmode="numeric" maxlength="10" value="'+esc(digits(S.settings.phone))+'" placeholder="10-digit mobile"></div><div class="fld"><label for="inv-to">Employee mobile (optional, opens their chat)</label><input id="inv-to" type="tel" inputmode="numeric" maxlength="10" placeholder="10-digit mobile"></div><div class="fld"><button type="button" class="btn" data-ej="newinv" style="width:100%;height:42px">Create joining link</button></div></div>'+
  '<div class="linkbox" style="margin-top:10px"><span class="muted">Online connection:</span> '+syncStatus()+'</div>'+
  (INVLINK?'<div class="linkbox"><input id="inv-link" readonly value="'+esc(INVLINK.url)+'" aria-label="Joining link"><button type="button" class="btn alt" data-ej="copyinv">Copy link</button><a class="btn wa" target="_blank" rel="noopener" href="'+waInvite()+'">Send on WhatsApp</a></div>':'')+'</div>'):'';
 var ap=isOwn?('<div class="card"><div class="aphead"><h3>Joining applications<span class="cnt">'+pend.length+' pending</span></h3><div><button type="button" class="btn sm" data-ej="refresh">Refresh</button> <button type="button" class="btn alt sm" data-ej="purge-retention" title="Purge application documents past 30 days">Purge Expired</button> <button type="button" class="btn alt sm" data-ej="import">Import file</button><input type="file" id="ej-file" accept=".txt,.json,text/plain,application/json" hidden multiple></div></div>'+
  (pend.length?pend.map(appCard).join(''):'<p class="pdesc" style="margin:10px 0 0">No pending applications. When an employee submits the joining form, it appears here automatically.</p>')+
  (decided.length?('<div style="margin-top:20px;padding-top:14px;border-top:1px solid var(--line)"><h4 style="margin:0 0 10px">Past Applications (30-day Retention)</h4><p class="pdesc" style="margin-bottom:12px">Approved and rejected application records and documents are permanently deleted after 30 days under UIDAI and DPDP retention guidelines.</p>'+decided.map(appCard).join('')+'</div>'):'')+
  '</div>'):'';
 return head('Employee Management')+inv+ap+(canManage?'<h3 style="margin:18px 0 0">Add employee manually</h3>'+formCard([{k:'name',l:'Name'},{k:'role',l:'Role',t:'select',o:ROLES},{k:'phone',l:'Phone',t:'tel',r:false},{k:'salary',l:'Monthly salary (₹)',t:'number'}],'Add Employee','mf'):'')+
  '<h3 style="margin:18px 0 0">All employees</h3>'+table(['Name','Role','Phone','Salary',''],S.employees.map(function(e){return [(e.photo?'<img class="eph" src="'+e.photo+'" alt="">':'')+esc(e.name),esc(e.role),esc(e.phone),inr(e.salary),'<div class="rowact"><button type="button" class="btn sm alt" data-ej="profile" data-id="'+e.id+'">Profile</button>'+(canManage?del('employees',e.id):'')+'</div>']}))};
function isPdfDoc(url,docType,path){return docType=='pdf'||/^data:application\/pdf/i.test(url||'')||/\.pdf(\?|$)/i.test(path||url||'')}
function extFromDoc(url,docType,path){if(isPdfDoc(url,docType,path))return 'pdf';if(/\.png(\?|$)/i.test(path||url||'')||/^data:image\/png/i.test(url||''))return 'png';if(/\.webp(\?|$)/i.test(path||url||'')||/^data:image\/webp/i.test(url||''))return 'webp';return 'jpg'}
function triggerDocDownload(url,filename){
 if(/^data:/i.test(url)){var a=document.createElement('a');a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();toast('Document download started');return}
 fetch(url).then(function(r){if(!r.ok)throw 0;return r.blob()}).then(function(blob){
  var u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download=filename;document.body.appendChild(a);a.click();a.remove();
  setTimeout(function(){URL.revokeObjectURL(u)},10000);toast('Document download started');
 }).catch(function(){window.open(url,'_blank');toast('Opened document in new tab')});
}
function ensureSignedDocUrl(path,cachedUrl){
 if(cachedUrl&&/^data:/i.test(cachedUrl))return Promise.resolve(cachedUrl);
 if(isStoragePath(path)&&SB){return SB.storage.from('employee-docs').createSignedUrl(path,3600).then(function(r){var u=(r&&r.data&&r.data.signedUrl)||cachedUrl||'';if(u)DOC_URL_CACHE[path]=u;return u})}
 return Promise.resolve(cachedUrl||'');
}
function showDoc(id){var o=S.applications.filter(function(x){return x.id==id})[0]||S.employees.filter(function(x){return x.id==id})[0];if(!o||(!o.doc&&!o.docPath)){toast('No Aadhaar document uploaded');return}
 ensureSignedDocUrl(o.docPath,o.doc).then(function(url){
  if(!url){toast('Could not load Aadhaar document');return}
  o.doc=url;var pdf=isPdfDoc(url,o.docType,o.docPath);
  openModal('<h3>Aadhaar card</h3>'+(pdf?'<iframe title="Aadhaar preview" src="'+url+'" style="width:100%;height:65vh;border:1px solid var(--line);border-radius:12px"></iframe><p style="margin-top:10px"><a class="btn" target="_blank" rel="noopener" href="'+url+'">Open PDF</a></p>':'<img class="docimg" src="'+url+'" alt="Aadhaar card">')+'<div class="dact"><button type="button" class="btn alt" data-nb="close">Close</button></div>',true);
 })}
function showApplicationDoc(id,type){var a=S.applications.filter(function(x){return x.id==id})[0];if(!a)return;
 var field=type=='pan'?'panDoc':'licenseDoc',pField=type=='pan'?'panDocPath':'licenseDocPath',tField=type=='pan'?'panDocType':'licenseDocType';
 if(!a[field]&&!a[pField]){toast('Document not uploaded');return}
 var title=type=='pan'?'PAN card':'Driving Licence';
 ensureSignedDocUrl(a[pField],a[field]).then(function(url){
  if(!url){toast('Could not load document');return}
  a[field]=url;var pdf=isPdfDoc(url,a[tField],a[pField]);
  openModal('<h3>'+title+'</h3>'+(pdf?'<iframe title="'+title+' preview" src="'+url+'" style="width:100%;height:65vh;border:1px solid var(--line);border-radius:12px"></iframe><p style="margin-top:10px"><a class="btn" target="_blank" rel="noopener" href="'+url+'">Open PDF</a></p>':'<img class="docimg" src="'+url+'" alt="'+title+'">')+'<div class="dact"><button type="button" class="btn alt" data-nb="close">Close</button></div>',true);
 })}
function showEmployeeDoc(id,type){var e=S.employees.filter(function(x){return x.id==id})[0];if(!e)return;
 var field=type=='aadhaar'?'doc':type=='pan'?'panDoc':'licenseDoc',pField=type=='aadhaar'?'docPath':type=='pan'?'panDocPath':'licenseDocPath',tField=type=='aadhaar'?'docType':type=='pan'?'panDocType':'licenseDocType';
 if(!e[field]&&!e[pField]){toast('Document not uploaded');return}
 var title=type=='aadhaar'?'Aadhaar card':type=='pan'?'PAN card':'Driving Licence';
 ensureSignedDocUrl(e[pField],e[field]).then(function(url){
  if(!url){toast('Could not load document');return}
  e[field]=url;var pdf=isPdfDoc(url,e[tField],e[pField]);
  openModal('<div class="ph"><h3 style="margin:0">'+title+'</h3><button type="button" class="btn green" data-ej="download-'+type+'" data-id="'+e.id+'">Download '+(pdf?'PDF':'Image')+'</button></div>'+(pdf?'<iframe title="'+title+' preview" src="'+url+'" style="width:100%;height:65vh;border:1px solid var(--line);border-radius:12px"></iframe>':'<img class="docimg" src="'+url+'" alt="'+title+'" style="max-height:65vh;object-fit:contain">')+'<div class="dact"><button type="button" class="btn alt" data-nb="close">Close</button></div>',true);
 })}
function showProfile(id){
 var e=S.employees.filter(function(x){return x.id==id})[0];if(!e)return;
 var joined=e.joinedAt?new Date(e.joinedAt).toLocaleString('en-IN',{dateStyle:'medium',timeStyle:'medium'}):(e.joined?fdate(e.joined):'Not recorded');
 var docBtn=function(label,type,exists){return '<div class="card" style="padding:16px"><b>'+label+'</b><p class="pdesc">'+(exists?'Document uploaded':'Not uploaded')+'</p><div class="rowact">'+(exists?'<button type="button" class="btn sm alt" data-ej="doc-'+type+'" data-id="'+e.id+'">View</button><button type="button" class="btn sm green" data-ej="download-'+type+'" data-id="'+e.id+'">Download</button>':'')+'<label class="btn sm" style="display:inline-flex;align-items:center;cursor:pointer" for="emp-upload-'+type+'">'+(exists?'Replace file':'Upload file')+'</label><input id="emp-upload-'+type+'" data-empdoc="'+type+'" data-id="'+e.id+'" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" hidden></div><p class="pdesc">Image or PDF · Max 1.5 MB</p></div>'};
 var view=$('#view');if(!view)return;var oldTitle=$('#ptitle');if(oldTitle)oldTitle.textContent='Employee Profile';
 var isOwn=isOwner(),canManage=canAct('manage_employees');
 view.innerHTML='<div class="ph"><div><h2>Employee Profile</h2><p class="pdesc">Employee information and documents</p></div><div class="rowact">'+(canManage?'<button type="button" class="btn" data-ej="edit-details" data-id="'+e.id+'">✎ Edit Details</button>':'')+'<button type="button" class="btn alt" data-ej="backprofile">← Back to Employee Management</button></div></div>'+
 '<section class="card" style="margin-bottom:14px"><div style="display:flex;align-items:center;gap:18px;flex-wrap:wrap">'+(e.photo?'<img class="eph big" style="width:112px;height:112px" src="'+e.photo+'" alt="Employee photo">':'<div class="eph big" style="display:grid;place-items:center">No photo</div>')+'<div><h2 style="margin:0 0 5px">'+esc(e.name)+'</h2><p class="pdesc">'+esc(e.role)+'</p><span class="pill p-blue">Employee ID: '+esc(e.id)+'</span>'+(canManage?'<div style="margin-top:10px"><label class="btn sm alt" for="emp-upload-photo">Change Photo</label><input id="emp-upload-photo" data-empdoc="photo" data-id="'+e.id+'" type="file" accept="image/jpeg,image/png,image/webp" hidden></div>':'')+'</div></div></section>'+
 '<section class="card" style="margin-bottom:14px"><h3>Personal & Employment Details</h3><div class="pf" style="grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:18px;margin-top:16px">'+
 '<div><small class="muted">Employee ID</small><br><b>'+esc(e.id)+'</b></div><div><small class="muted">Joining date & time</small><br><b>'+esc(joined)+'</b></div><div><small class="muted">Mobile number</small><br><b>'+esc(e.phone||'Not provided')+'</b></div><div><small class="muted">Monthly salary</small><br><b>'+inr(e.salary)+'</b></div><div style="grid-column:1/-1"><small class="muted">Full address</small><br><b>'+esc(e.address||'Not provided')+'</b></div>'+
 (isOwn?'<div><small class="muted">Aadhaar number (masked)</small><br><b>'+maskA(e.aadhaar)+'</b></div><div><small class="muted">PAN number (masked)</small><br><b>'+maskPan(e.pan)+'</b></div><div><small class="muted">Driving Licence number (masked)</small><br><b>'+maskLicense(e.licenseNo)+'</b></div>':'')+
 '<div><small class="muted">Application ID</small><br><b>'+esc(e.app||'Manual entry')+'</b></div></div>'+
 (canManage?('<div id="emp-edit-panel" hidden style="margin-top:18px;padding-top:16px;border-top:1px solid var(--line)"><h3>Edit Employee Details</h3><p class="pdesc">Correct the details below and save. Employee ID and joining date cannot be changed.</p><form id="employee-edit-form" data-id="'+e.id+'" class="form" style="margin-top:14px">'+
 '<div class="fld"><label>Employee name</label><input name="name" required maxlength="80" value="'+esc(e.name)+'"></div>'+
 '<div class="fld"><label>Role</label><select name="role">'+ROLES.map(function(r){return '<option value="'+esc(r)+'" '+(r==e.role?'selected':'')+'>'+esc(r)+'</option>'}).join('')+'</select></div>'+
 '<div class="fld"><label>Mobile number</label><input name="phone" type="tel" inputmode="numeric" maxlength="10" required value="'+esc(e.phone||'')+'"></div>'+
 '<div class="fld"><label>Monthly salary (₹)</label><input name="salary" type="number" min="0" step="0.01" required value="'+esc(e.salary||0)+'"></div>'+
 '<div class="fld" style="grid-column:1/-1"><label>Full address</label><input name="address" maxlength="300" value="'+esc(e.address||'')+'"></div>'+
 (isOwn?'<div class="fld"><label>Aadhaar number (masked)</label><input name="aadhaar" inputmode="numeric" maxlength="14" value="'+esc(e.aadhaar?maskA(e.aadhaar):'')+'" placeholder="12 digits"></div><div class="fld"><label>PAN number (masked)</label><input name="pan" maxlength="10" value="'+esc(e.pan?maskPan(e.pan):'')+'" placeholder="ABCDE1234F"></div><div class="fld"><label>Driving Licence number (masked)</label><input name="licenseNo" maxlength="30" value="'+esc(e.licenseNo?maskLicense(e.licenseNo):'')+'"></div>':'')+
 '<div class="rowact" style="grid-column:1/-1"><button type="submit" class="btn">Save Changes</button><button type="button" class="btn alt" data-ej="cancel-edit" data-id="'+e.id+'">Cancel</button></div></form></div>'):'')+
 '</section>'+
 (isOwn?'<section class="card"><h3>Uploaded Documents</h3><p class="pdesc">You can view, download, upload a missing document, or replace an incorrect file.</p><div class="pf" style="grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:14px;margin-top:14px">'+docBtn('Aadhaar Card','aadhaar',!!(e.doc||e.docPath))+docBtn('PAN Card','pan',!!(e.panDoc||e.panDocPath))+docBtn('Driving Licence','license',!!(e.licenseDoc||e.licenseDocPath))+'</div></section>':'')+hrCard(e);
}
function downloadEmployeeDoc(id,type){var e=S.employees.filter(function(x){return x.id==id})[0];if(!e)return;
 var field=type=='aadhaar'?'doc':type=='pan'?'panDoc':'licenseDoc',pField=type=='aadhaar'?'docPath':type=='pan'?'panDocPath':'licenseDocPath',tField=type=='aadhaar'?'docType':type=='pan'?'panDocType':'licenseDocType';
 if(!e[field]&&!e[pField]){toast('Document not uploaded');return}
 ensureSignedDocUrl(e[pField],e[field]).then(function(url){
  if(!url){toast('Could not download document');return}
  e[field]=url;var ext=extFromDoc(url,e[tField],e[pField]),filename=type+'-'+String(e.name||'employee').replace(/[^a-z0-9_-]/gi,'_')+'.'+ext;
  triggerDocDownload(url,filename);
 })}
function addApplication(o){
 if(!o||o.srjoin!==1)return 'bad';
 var id=String(o.id||''),nm=String(o.name||'').trim(),mb=digits(o.mobile),ad=String(o.address||'').trim(),aa=String(o.aadhaar||'').replace(/\D/g,''),ph=String(o.photo||''),dc=String(o.doc||''),pan=String(o.pan||'').toUpperCase().trim(),pd=String(o.panDoc||''),ln=String(o.licenseNo||'').toUpperCase().trim(),ld=String(o.licenseDoc||'');
 if(!/^[A-Za-z0-9_-]{4,40}$/.test(id)||nm.length<2||nm.length>80||!/^[6-9]\d{9}$/.test(mb)||ad.length<3||ad.length>300||!aadhaarOk(aa))return 'bad';
 if(!/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+\/=]+$/.test(ph)||ph.length>700000)return 'bad';
 if(!/^data:(image\/(jpeg|png|webp)|application\/pdf);base64,[A-Za-z0-9+\/=]+$/.test(dc)||dc.length>1800000)return 'bad';
  if(pan&&!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(pan))return 'bad';
  if(!drivingLicenseOk(ln))return 'bad';
  if(pd&&!/^data:(image\/(jpeg|png|webp)|application\/pdf);base64,[A-Za-z0-9+\/=]+$/.test(pd))return 'bad';
  if(ld&&!/^data:(image\/(jpeg|png|webp)|application\/pdf);base64,[A-Za-z0-9+\/=]+$/.test(ld))return 'bad';
  if(pd.length>1100000||ld.length>1100000)return 'bad';
 if(S.applications.some(function(x){return x.id==id})||S.employees.some(function(x){return x.app==id}))return 'dup';
 var dt=/^\d{4}-\d{2}-\d{2}$/.test(o.date||'')?o.date:today();
 var appObj={id:id,t:String(o.t||''),date:dt,submittedAt:String(o.submittedAt||new Date().toISOString()),name:nm,mobile:mb,address:ad,aadhaar:aa,photo:ph,photoPath:'',doc:dc,docPath:'',docType:/^data:application\/pdf/.test(dc)?'pdf':'image',pan:pan,panDoc:pd,panDocPath:'',panDocType:/^data:application\/pdf/.test(pd)?'pdf':'image',licenseNo:ln,licenseDoc:ld,licenseDocPath:'',licenseDocType:/^data:application\/pdf/.test(ld)?'pdf':'image',status:'Pending'};
 S.applications.push(appObj);
 S.invites.forEach(function(v){if(o.t&&v.t==o.t)v.status='used'});return appObj}
function persistImportedApplication(appObj){
 if(!SB||!SESSION)return Promise.resolve();
 function up(dataUrl,name){
  if(!dataUrl||!/^data:/i.test(dataUrl))return Promise.resolve({path:'',url:'',docType:''});
  var parsed=dataUrlToBlob(dataUrl);if(!parsed)return Promise.resolve({path:'',url:'',docType:''});
  return uploadEmployeeDoc('applications/'+appObj.id+'/'+name+'.'+parsed.ext,parsed.blob,parsed.mime).then(function(u){return {path:u.path,url:u.url,docType:parsed.docType}});
 }
 var invStep=appObj.t?SB.from('employee_invites').upsert({token:appObj.t,status:'used',created_date:appObj.date||today(),expires_at:new Date(Date.now()+30*864e5).toISOString()}).then(sbCheck('employee_invites')):Promise.resolve();
 return invStep.then(function(){
  return Promise.all([up(appObj.photo,'photo'),up(appObj.doc,'aadhaar'),up(appObj.panDoc,'pan'),up(appObj.licenseDoc,'license')]);
 }).then(function(u){
  appObj.photoPath=u[0].path;if(u[0].url)appObj.photo=u[0].url;
  appObj.docPath=u[1].path;if(u[1].url)appObj.doc=u[1].url;appObj.docType=u[1].docType||appObj.docType;
  appObj.panDocPath=u[2].path;if(u[2].url)appObj.panDoc=u[2].url;appObj.panDocType=u[2].docType||appObj.panDocType;
  appObj.licenseDocPath=u[3].path;if(u[3].url)appObj.licenseDoc=u[3].url;appObj.licenseDocType=u[3].docType||appObj.licenseDocType;
  return sbUpsertRow('employee_applications',sbApplicationRow(appObj));
 });
}
document.addEventListener('click',function(e){var t=e.target.closest('[data-ej]');if(!t)return;var a=t.dataset.ej,id=t.dataset.id;
 if(!isOwner()&&(a=='newinv'||a=='refresh'||a=='copyinv'||a=='import'||a=='approve'||a=='pending'||a=='reject'||a=='delete'||a=='purge-retention')){toast('Access denied');return}
 if(a=='newinv'){var me=digits($('#inv-me').value),to=digits($('#inv-to').value);clearErr('#inv-me');clearErr('#inv-to');
  if(me.length!=10)return bad('#inv-me','Enter your 10-digit WhatsApp number');if(to&&to.length!=10)return bad('#inv-to','Employee mobile must be 10 digits');
  S.settings.phone=me;sbSaveSettings();
  var inv={id:newTok(),t:'',date:today(),status:'open',expiresAt:new Date(Date.now()+30*864e5).toISOString()};inv.t=inv.id;
  var fin=function(){S.invites.push(inv);save();INVLINK={url:mkInviteLink(inv),to:to};render()};
  if(!online())return fin();
  api('/api/invite',{method:'POST',body:JSON.stringify({t:inv.t,date:inv.date,expires_at:inv.expiresAt})}).then(function(r){if(r.ok)fin();else toast(r.status==401?'Session expired. Please sign in again.':r.status==503?'Online service is not configured yet':'Could not create the link')},function(){toast('Could not reach the online service')})}
 else if(a=='refresh'){syncApps(true)}
 else if(a=='copyinv'){copyTxt($('#inv-link').value)}
 else if(a=='import'){$('#ej-file').click()}
 else if(a=='doc')showDoc(id);
 else if(a=='appdoc')showApplicationDoc(id,t.dataset.type);
 else if(a=='doc-aadhaar')showEmployeeDoc(id,'aadhaar');
 else if(a=='doc-pan')showEmployeeDoc(id,'pan');
 else if(a=='doc-license')showEmployeeDoc(id,'license');
 else if(a=='download-aadhaar')downloadEmployeeDoc(id,'aadhaar');
 else if(a=='download-pan')downloadEmployeeDoc(id,'pan');
 else if(a=='download-license')downloadEmployeeDoc(id,'license');
 else if(a=='edit-details'){if(!canAct('manage_employees')){toast('Not permitted');return}var ep=$('#emp-edit-panel');if(ep)ep.hidden=false}
 else if(a=='cancel-edit'){showProfile(id)}
  else if(a=='backprofile'){if(location.hash==='#employees'){render()}else{location.hash='#employees'}}
 else if(a=='profile')showProfile(id);
 else if(a=='approve'){
  var ap=S.applications.filter(function(x){return x.id==id})[0];if(!ap)return;var sal=+$('#as-'+id).value;clearErr('#as-'+id);
  if(!(sal>0))return bad('#as-'+id,'Enter the monthly salary');
  if(S.employees.some(function(x){return digits(x.phone)==ap.mobile}))return toast('An employee with this mobile number already exists');
  var newEmp={id:nid('M',S.employees),name:ap.name,role:$('#ar-'+id).value,phone:ap.mobile,salary:sal,address:ap.address,aadhaar:ap.aadhaar,photo:ap.photo,photoPath:ap.photoPath||'',doc:ap.doc,docPath:ap.docPath||'',docType:ap.docType||'',pan:ap.pan||'',panDoc:ap.panDoc||'',panDocPath:ap.panDocPath||'',panDocType:ap.panDocType||'',licenseNo:ap.licenseNo||'',licenseDoc:ap.licenseDoc||'',licenseDocPath:ap.licenseDocPath||'',licenseDocType:ap.licenseDocType||'',tok:newTok()+newTok()+newTok(),joined:today(),joinedAt:ap.submittedAt||new Date().toISOString(),app:ap.id};
  var approveBtn=t;if(approveBtn){approveBtn.disabled=true;approveBtn.textContent='Approving…'}
  sbUpsertRow('employees',sbEmployeeRow(newEmp)).then(function(){
   return sbUpsertIdentity(newEmp).catch(function(err){
    return sbDeleteRow('employees',newEmp.id).then(function(){throw err},function(){throw err});
   });
  }).then(function(){
   var nowIso=new Date().toISOString();
   return sbUpdateRow('employee_applications',ap.id,{status:'Approved',decided_at:nowIso}).catch(function(err){
    return Promise.all([
     sbDeleteIdentity(newEmp.id),
     sbDeleteRow('employees',newEmp.id)
    ]).then(function(){throw err},function(){throw err});
   });
  }).then(function(){
   var nowIso=new Date().toISOString();
   S.employees.push(newEmp);ap.status='Approved';ap.decidedAt=nowIso;save();
   toast(ap.name+' added to Employees (30-day retention countdown started)');render();
  }).catch(function(err){
   if(approveBtn){approveBtn.disabled=false;approveBtn.textContent='Approve'}
   sbErr('approve-application',err);
  });
 }
 else if(a=='pending'){var pp=S.applications.filter(function(x){return x.id==id})[0];if(!pp)return;pp.status='Pending';save();sbUpdateRow('employee_applications',pp.id,{status:'Pending'});toast('Application kept as Pending');render()}
 else if(a=='reject'){
  var rj=S.applications.filter(function(x){return x.id==id})[0];if(!rj)return;
  var nowIso=new Date().toISOString();
  rj.status='Rejected';rj.decidedAt=nowIso;save();
  sbUpdateRow('employee_applications',rj.id,{status:'Rejected',decided_at:nowIso}).catch(function(err){
   sbErr('reject-application',err);
  });
  toast('Application rejected (30-day retention countdown started)');render();
 }
 else if(a=='delete'){if(!confirm('Delete this joining application permanently? This cannot be undone.'))return;S.applications=S.applications.filter(function(x){return x.id!=id});save();sbDeleteRow('employee_applications',id);toast('Application deleted');render()}
 else if(a=='purge-retention'){
  toast('Purging expired applications…');
  triggerRetentionCleanup().then(function(){
   toast('Retention purge complete');
   render();
  });
 }});
document.addEventListener('change',function(e){
 var inp=e.target;if(!inp||!inp.dataset||!inp.dataset.empdoc)return;
 var id=inp.dataset.id,type=inp.dataset.empdoc,file=inp.files&&inp.files[0],emp=S.employees.filter(function(x){return x.id==id})[0];if(!file||!emp)return;
 if(!isOwner()){toast('Only the owner can upload or change employee documents');inp.value='';return}
 var isPhoto=type=='photo',max=isPhoto?2*1024*1024:1500*1024;
 if(file.size>max){toast('File is too large. Maximum '+(isPhoto?'2 MB':'1.5 MB'));inp.value='';return}
 if(isPhoto&&!/^image\/(jpeg|png|webp)$/.test(file.type)){toast('Please select JPG, PNG or WEBP photo');inp.value='';return}
 if(!isPhoto&&!/^image\/(jpeg|png|webp)$|^application\/pdf$/.test(file.type)){toast('Please select JPG, PNG, WEBP or PDF');inp.value='';return}
 toast('Uploading…');
 if(isPhoto){
  readImg(file,900,.78).then(function(dataUrl){
   var parsed=dataUrlToBlob(dataUrl);if(!parsed)throw new Error('Invalid photo');
   var path='employees/'+emp.id+'/photo-'+Date.now()+'.'+parsed.ext;
   return uploadEmployeeDoc(path,parsed.blob,parsed.mime).then(function(u){
    emp.photoPath=u.path;emp.photo=u.url||dataUrl;save();
    return Promise.all([
     sbUpdateRow('employees',emp.id,{photo_path:u.path}),
     sbUpsertIdentity(emp)
    ]);
   });
  }).then(function(){toast('Employee photo updated');showProfile(id)}).catch(function(){toast('Could not upload photo')});
 }else{
  var isPdf=file.type=='application/pdf',ext=isPdf?'pdf':file.type=='image/png'?'png':file.type=='image/webp'?'webp':'jpg',docType=isPdf?'pdf':'image';
  var path='employees/'+emp.id+'/'+type+'-'+Date.now()+'.'+ext;
  uploadEmployeeDoc(path,file,file.type).then(function(u){
   if(type=='aadhaar'){emp.docPath=u.path;emp.doc=u.url;emp.docType=docType}
   else if(type=='pan'){emp.panDocPath=u.path;emp.panDoc=u.url;emp.panDocType=docType}
   else{emp.licenseDocPath=u.path;emp.licenseDoc=u.url;emp.licenseDocType=docType}
   save();return sbUpsertIdentity(emp);
  }).then(function(){toast(type+' document uploaded');showProfile(id)}).catch(function(){toast('Could not upload document')});
 }
 inp.value='';
});
document.addEventListener('change',function(e){if(e.target.id!='ej-file')return;var files=[].slice.call(e.target.files||[]),ok=0,dup=0,bd=0;
 Promise.all(files.map(function(f){if(f.size>3000000){bd++;return Promise.resolve()}return f.text().then(function(tx){var r='bad';try{r=addApplication(JSON.parse(tx))}catch(x){}if(r&&typeof r=='object'){ok++;return persistImportedApplication(r)}else if(r=='dup')dup++;else bd++})})).then(function(){if(ok)save();render();toast(ok+' application'+(ok==1?'':'s')+' imported'+(dup?', '+dup+' already imported':'')+(bd?', '+bd+' invalid file'+(bd==1?'':'s'):''))});e.target.value=''});

/* ---------- employee: public joining form (opened from the link) ---------- */
function renderJoin(){
 var P=null;try{P=b64d(location.hash.slice(6))}catch(e){}
 document.body.classList.add('public');closeModal();jStop();var v=$('#pubview');
 if(!P||!P.t){v.innerHTML='<div class="pubwrap jn"><div class="card empty">This joining link is not valid. Please ask for a new link.</div></div>';return}
 JOIN={t:String(P.t),biz:String(P.b||'SR Industries'),own:digits(P.p),photo:'',doc:'',docType:'',panDoc:'',panDocType:'',licenseDoc:'',licenseDocType:'',stream:null,app:null};document.title=JOIN.biz+' - Joining form';
 v.innerHTML='<div class="pubwrap jn"><div class="card"><h2 style="margin:0 0 4px">'+esc(JOIN.biz)+'</h2><p class="pdesc" style="margin:0 0 16px">Employee joining form · ఉద్యోగి వివరాల ఫారం</p>'+
 '<form id="joinform" class="jform" autocomplete="off" novalidate>'+
 '<div class="fld"><label for="j-name">Full name / పూర్తి పేరు *</label><input id="j-name" type="text" autocomplete="name" maxlength="80"></div>'+
 '<div class="fld"><label for="j-mob">Mobile number / మొబైల్ నంబర్ *</label><input id="j-mob" type="tel" inputmode="numeric" maxlength="10" placeholder="10-digit mobile" autocomplete="tel-national"></div>'+
 '<div class="fld"><label for="j-addr">Address / అడ్రస్ *</label><input id="j-addr" type="text" maxlength="300" placeholder="Door no, street, area, town" autocomplete="street-address"></div>'+
 '<div class="fld"><label for="j-aad">Aadhaar number / ఆధార్ నంబర్ *</label><input id="j-aad" type="text" inputmode="numeric" maxlength="14" placeholder="XXXX XXXX XXXX"></div>'+
  '<div class="fld"><label for="j-pan">PAN number / పాన్ నంబర్ (Optional)</label><input id="j-pan" type="text" maxlength="10" placeholder="ABCDE1234F" autocapitalize="characters"></div>'+
  '<div class="fld"><label for="j-pan-doc">PAN card upload (Photo or PDF) / పాన్ కార్డ్ అప్‌లోడ్</label><input id="j-pan-doc" type="file" accept="image/*,application/pdf" style="height:auto;padding:10px"><div id="j-pan-prev" class="docprev"></div></div>'+
  '<div class="fld"><label for="j-license">Driving Licence number / డ్రైవింగ్ లైసెన్స్ నంబర్ (Optional)</label><input id="j-license" type="text" maxlength="25" placeholder="AP-09-2011-0123456" autocapitalize="characters"></div>'+
  '<div class="fld"><label for="j-license-doc">Driving Licence upload (Photo or PDF) / లైసెన్స్ అప్‌లోడ్</label><input id="j-license-doc" type="file" accept="image/*,application/pdf" style="height:auto;padding:10px"><div id="j-license-prev" class="docprev"></div></div>'+
 '<div class="fld" id="j-pf"><label>Live photo / లైవ్ ఫోటో *</label><div class="camwrap"><video id="j-video" playsinline muted hidden></video><img id="j-photo" alt="Your photo" hidden><div id="j-ph" class="camph">No photo yet</div></div>'+
 '<div class="camact"><button type="button" class="btn" data-j="cam" id="j-bcam">Open camera</button><button type="button" class="btn green" data-j="snap" id="j-bsnap" hidden>Capture photo</button><button type="button" class="btn alt" data-j="retake" id="j-bre" hidden>Retake</button></div>'+
 '<button type="button" class="linkbtn" data-j="camfile">Camera not opening? Take the photo with your phone camera</button><input type="file" id="j-pfile" accept="image/*" capture="user" hidden></div>'+
 '<div class="fld"><label for="j-doc">Aadhaar card (photo or PDF) / ఆధార్ కార్డ్ అప్‌లోడ్ *</label><input id="j-doc" type="file" accept="image/*,application/pdf" style="height:auto;padding:10px"><div id="j-docprev" class="docprev"></div></div>'+
 '<div class="fld"><label class="chk"><input type="checkbox" id="j-ok"><span>I confirm these details are mine and I agree to share them with '+esc(JOIN.biz)+' for employment. / ఈ వివరాలు నావే, ఉద్యోగం కోసం '+esc(JOIN.biz)+' తో పంచుకోవడానికి అంగీకరిస్తున్నాను.</span></label></div>'+
 '<button class="btn" type="submit" style="width:100%;height:48px">Submit details / పంపండి</button></form></div></div>'}
function jStop(){if(JOIN.stream){JOIN.stream.getTracks().forEach(function(t){t.stop()});JOIN.stream=null}}
function jShow(){var p=$('#j-photo');if(!p)return;var has=!!JOIN.photo,live=!!JOIN.stream;p.hidden=!has;if(has)p.src=JOIN.photo;$('#j-ph').hidden=has||live;$('#j-video').hidden=!live;$('#j-bcam').hidden=has||live;$('#j-bsnap').hidden=!live;$('#j-bre').hidden=!has}
function jCam(){if(!(navigator.mediaDevices&&navigator.mediaDevices.getUserMedia)){toast('Camera not available here. Use "Take the photo with your phone camera".');$('#j-pfile').click();return}
 navigator.mediaDevices.getUserMedia({video:{facingMode:'user'},audio:false}).then(function(s){JOIN.stream=s;var v=$('#j-video');v.srcObject=s;var pl=v.play();if(pl&&pl.catch)pl.catch(function(){});jShow()}).catch(function(){toast('Camera permission was denied. Opening the phone camera instead.');$('#j-pfile').click()})}
function jbad(sel,msg){var f=$(sel);toast(msg);if(!f)return false;f.classList.add('err');if(!f.querySelector('.em')){var s=document.createElement('span');s.className='em';s.textContent=msg;f.appendChild(s)}if(f.scrollIntoView)f.scrollIntoView({block:'center',behavior:'smooth'});return false}
function jOK(sel){var f=$(sel);if(!f)return;f.classList.remove('err');var m=f.querySelector('.em');if(m)m.remove()}
document.addEventListener('click',function(e){var t=e.target.closest('[data-j]');if(!t)return;var a=t.dataset.j;
 if(a=='cam')jCam();
 else if(a=='retake'){JOIN.photo='';jShow();jCam()}
 else if(a=='camfile')$('#j-pfile').click();
 else if(a=='snap'){var v=$('#j-video');if(!v||!v.videoWidth){toast('Camera is still starting, try again');return}var sc=Math.min(1,640/Math.max(v.videoWidth,v.videoHeight)),c=document.createElement('canvas');c.width=Math.round(v.videoWidth*sc);c.height=Math.round(v.videoHeight*sc);var x=c.getContext('2d');x.translate(c.width,0);x.scale(-1,1);x.drawImage(v,0,0,c.width,c.height);JOIN.photo=c.toDataURL('image/jpeg',.72);jStop();jOK('#j-pf');jShow()}
 else if(a=='send')jSend();else if(a=='again')jDownload()});
document.addEventListener('change',function(e){var t=e.target;
 if(t.id=='j-pfile'&&t.files&&t.files[0]){readImg(t.files[0],640,.72).then(function(d){JOIN.photo=d;jStop();jOK('#j-pf');jShow()},function(){toast('Could not read this photo, please try again')});t.value=''}
 else if(['j-doc','j-pan-doc','j-license-doc'].indexOf(t.id)>=0){var f=t.files&&t.files[0],kind=t.id=='j-doc'?'aadhaar':t.id=='j-pan-doc'?'pan':'license',dataKey=kind=='aadhaar'?'doc':kind+'Doc',typeKey=kind=='aadhaar'?'docType':kind+'DocType',preview=kind=='aadhaar'?'#j-docprev':kind=='pan'?'#j-pan-prev':'#j-license-prev';JOIN[dataKey]='';JOIN[typeKey]='';$(preview).innerHTML='';jOK(preview);if(!f)return;
  if(f.type=='application/pdf'){if(f.size>700000){t.value='';return toast('PDF maximum size is 700 KB. Please upload a smaller PDF.')}var fr=new FileReader();fr.onload=function(){JOIN[dataKey]=fr.result;JOIN[typeKey]='pdf';$(preview).textContent='PDF attached: '+f.name};fr.readAsDataURL(f)}
  else if(/^image\//.test(f.type)){readImg(f,1280,.68).then(function(d){JOIN[dataKey]=d;JOIN[typeKey]='image';$(preview).innerHTML='<img src="'+d+'" alt="'+kind+' document preview">'},function(){toast('Could not read this image, please try again')})}
  else{t.value='';toast('Please choose a photo or a PDF')}}});
document.addEventListener('input',function(e){if(e.target.id=='j-aad'){var d=e.target.value.replace(/\D/g,'').slice(0,12);e.target.value=d.replace(/(\d{4})(?=\d)/g,'$1 ')}else if(e.target.id=='j-mob')e.target.value=e.target.value.replace(/\D/g,'').slice(0,10);else if(e.target.id=='j-pan')e.target.value=e.target.value.toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,10);else if(e.target.id=='j-license')e.target.value=e.target.value.toUpperCase().slice(0,25)});
document.addEventListener('submit',function(e){if(e.target.id!='joinform')return;e.preventDefault();
 var nm=$('#j-name').value.trim(),mb=digits($('#j-mob').value),ad=$('#j-addr').value.trim(),aa=$('#j-aad').value.replace(/\D/g,'');['#j-name','#j-mob','#j-addr','#j-aad'].forEach(clearErr);jOK('#j-pf');
 if(nm.length<2)return bad('#j-name','Enter your full name');
 if(!/^[6-9]\d{9}$/.test(mb))return bad('#j-mob','Enter a valid 10-digit mobile number');
 if(ad.length<3)return bad('#j-addr','Enter your address');
 if(!aadhaarOk(aa))return bad('#j-aad','Enter a valid 12-digit Aadhaar number');
  var pan=$('#j-pan').value.trim().toUpperCase();if(pan&&!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(pan))return bad('#j-pan','Enter a valid PAN number (ABCDE1234F)');
 var dl=normalizeDL($('#j-license').value);if(dl&&!drivingLicenseOk(dl))return bad('#j-license','Enter a valid Indian Driving Licence number (e.g. AP0920110123456 or AP-09-2011-0123456)');
 if(!JOIN.photo)return jbad('#j-pf','Please take your live photo');
 if(!JOIN.doc)return bad('#j-doc','Please upload your Aadhaar card');
 if(!$('#j-ok').checked)return toast('Please tick the confirmation box');
 if(!JOIN.app)JOIN.app={srjoin:1,id:'J'+Date.now().toString(36)+Math.random().toString(36).slice(2,6),t:JOIN.t,date:ymd(new Date()),submittedAt:new Date().toISOString(),name:nm,mobile:mb,address:ad,aadhaar:aa,photo:JOIN.photo,doc:JOIN.doc,docType:JOIN.docType,pan:pan,panDoc:JOIN.panDoc,panDocType:JOIN.panDocType,licenseNo:normalizeDL($('#j-license').value),licenseDoc:JOIN.licenseDoc,licenseDocType:JOIN.licenseDocType};else{JOIN.app.name=nm;JOIN.app.mobile=mb;JOIN.app.address=ad;JOIN.app.aadhaar=aa;JOIN.app.photo=JOIN.photo;JOIN.app.doc=JOIN.doc;JOIN.app.docType=JOIN.docType;JOIN.app.pan=pan;JOIN.app.panDoc=JOIN.panDoc;JOIN.app.panDocType=JOIN.panDocType;JOIN.app.licenseNo=$('#j-license').value.trim().toUpperCase();JOIN.app.licenseDoc=JOIN.licenseDoc;JOIN.app.licenseDocType=JOIN.licenseDocType;JOIN.app.submittedAt=JOIN.app.submittedAt||new Date().toISOString()}
 jStop();jSubmit()});
function jSubmit(){var b=$('#joinform button[type=submit]'),er=$('#j-err');if(er)er.remove();b.disabled=true;b.textContent='Sending… / పంపుతున్నాం…';
 var fail=function(msg,wa){b.disabled=false;b.textContent='Submit details / పంపండి';var d=document.createElement('div');d.id='j-err';d.className='note warn';d.innerHTML=esc(msg)+(wa?'<br><button type="button" class="linkbtn" data-j="send">Send the details on WhatsApp instead</button>':'');$('#joinform').appendChild(d)};
 fetch('/api/apply',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(JOIN.app)}).then(function(r){
  if(r.ok)return jDone();
  if(r.status==403)return fail('This link has expired or was already used. Please ask '+JOIN.biz+' for a new link. / ఈ లింక్ గడువు ముగిసింది, కొత్త లింక్ అడగండి.',false);
  if(r.status==413)return fail('The files are too big. Please use smaller photos.',false);
  fail('Could not send right now. Please try again. / ఇప్పుడు పంపలేకపోయాం, మళ్లీ ప్రయత్నించండి.',true)},function(){fail('No internet connection. Please try again. / ఇంటర్నెట్ లేదు, మళ్లీ ప్రయత్నించండి.',true)})}
/* Transport: today the employee sends a details file to the owner on WhatsApp.
   When the online database (Supabase) is connected, replace jSend() with a direct insert so the application appears in the owner's app automatically. */
function jFile(){var a=JOIN.app,nm=a.name.replace(/[^A-Za-z0-9]+/g,'_').slice(0,30)||'employee';return new File([JSON.stringify(a)],'Joining_'+nm+'.txt',{type:'text/plain'})}
function jDownload(){var f=jFile(),u=URL.createObjectURL(f),l=document.createElement('a');l.href=u;l.download=f.name;document.body.appendChild(l);l.click();l.remove();setTimeout(function(){URL.revokeObjectURL(u)},4000)}
function jSend(){var f=jFile(),msg='Hello, I have filled the joining form for '+JOIN.biz+'. My details file is attached: '+f.name;
 if(navigator.canShare&&navigator.canShare({files:[f]})){navigator.share({files:[f],text:msg}).catch(function(){})}
 else{jDownload();window.open('https://wa.me/'+(JOIN.own?'91'+JOIN.own:'')+'?text='+encodeURIComponent(msg+'\n(Please attach the downloaded file in this chat.)'),'_blank')}}
function jDone(){$('#pubview').innerHTML='<div class="pubwrap jn"><div class="card" style="text-align:center"><div class="okmark">✓</div><h2 style="margin:8px 0">Details submitted<br><small style="font-weight:600">మీ వివరాలు పంపబడ్డాయి</small></h2><p class="pdesc">Thank you. '+esc(JOIN.biz)+' will review your application and contact you. You can close this page. / ధన్యవాదాలు. '+esc(JOIN.biz)+' మీ దరఖాస్తును పరిశీలించి మిమ్మల్ని సంప్రదిస్తారు. ఈ పేజీని మూసివేయవచ్చు.</p></div></div>';window.scrollTo(0,0)}

/* ---------- HR documents: joining letter, pay slip, employee portal link ---------- */
var DOCCSS='.pap{background:#fff;color:#111c33;font-family:"Plus Jakarta Sans",system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;font-size:12.5px;line-height:1.5;text-align:left;border:1px solid #d9e2ef;border-radius:8px;padding:0 0 22px;max-width:794px;margin:0 auto;overflow:hidden;-webkit-print-color-adjust:exact;print-color-adjust:exact}.pap *{box-sizing:border-box}\n.pp-head{display:flex;justify-content:space-between;gap:16px;flex-wrap:wrap;padding:24px 30px 18px;background:linear-gradient(135deg,#0b2a6b,#1368e8);color:#fff}.pp-brand{display:flex;gap:12px;align-items:center}.pp-brand h1{margin:0;font-size:24px;font-weight:800;letter-spacing:-.3px;line-height:1.1;color:#fff}.pp-brand p{margin:2px 0 0;font-size:11.5px;color:#d6e4ff}.pp-brand svg path:first-child{fill:#fff}.pp-brand svg path:last-child{stroke:#1368e8}\n.pp-title{text-align:right}.pp-title small{display:block;font-size:11px;letter-spacing:.18em;font-weight:700;color:#bcd3ff}.pp-title b{display:block;font-size:22px;font-weight:800}.pp-title span{font-size:11.5px;color:#d6e4ff}.pp-band{height:5px;background:linear-gradient(90deg,#c9a24a,#f0d78c,#c9a24a)}\n.pp-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:14px 18px;padding:20px 30px 6px}.pp-grid small{display:block;color:#6b7a96;font-size:10.5px;text-transform:uppercase;letter-spacing:.06em}.pp-grid b{font-size:13px;word-break:break-word}\n.pp-att{margin:10px 30px 0;padding:9px 14px;background:#eef4ff;border-radius:8px;display:flex;gap:22px;flex-wrap:wrap;font-size:12px}.pp-att em{margin-left:auto;color:#6b7a96;font-size:11px}\n.pp-t{width:calc(100% - 60px);margin:16px 30px 0;border-collapse:collapse}.pp-t th{background:#0b2a6b;color:#fff;font-size:11.5px;text-transform:uppercase;letter-spacing:.06em;padding:9px 12px;text-align:left}.pp-t td{padding:9px 12px;border-bottom:1px solid #e3eaf5}.pp-t .r{text-align:right}.pp-t .sp{width:14px;padding:0;background:#fff;border:0}.pp-t th.sp{background:#fff}.pp-t tfoot td{font-weight:800;background:#f3f7fd;border-top:2px solid #0b2a6b}.pp-t tfoot td.sp{background:#fff;border-top:0}\n.pp-net{margin:18px 30px 0;display:flex;gap:18px;align-items:center;flex-wrap:wrap;border:1.5px solid #1368e8;border-radius:12px;padding:14px 18px;background:linear-gradient(135deg,#f3f8ff,#fff)}.pp-net small{display:block;color:#6b7a96;font-size:10.5px;letter-spacing:.08em}.pp-net b{font-size:28px;color:#0b2a6b;font-weight:800}.pp-w{flex:1;min-width:200px;font-weight:700}\n.pp-foot{display:flex;justify-content:space-between;align-items:flex-end;gap:16px;padding:26px 30px 0}.pp-note{color:#6b7a96;font-size:11px}.pp-sign{text-align:center;font-size:12px}.pp-sign i,.lt-sig i{display:block;width:190px;max-width:100%;border-top:1.5px solid #111c33;margin:0 auto 6px}\n.pp-cg{margin:18px 30px 0;padding-top:10px;border-top:1px dashed #cdd8ea;text-align:center;color:#8896b0;font-size:10.5px}\n.lt p{margin:10px 30px}.lt-meta{display:flex;justify-content:space-between;gap:10px;padding:16px 30px 0}.lt-to{margin:12px 30px 0}.lt-to small{display:block;color:#6b7a96;font-size:10.5px;text-transform:uppercase;letter-spacing:.06em}.lt p.lt-sub{margin:14px 30px 0}.lt-ol{margin:8px 30px 0;padding-left:20px}.lt-ol li{margin:5px 0}.lt-sig{display:flex;justify-content:space-between;gap:20px;padding:34px 30px 0;font-size:12px}.lt-sig>div{text-align:center}\n@media print{.pap{border:0!important;border-radius:0!important;max-width:none!important}}';(function(){var st=document.createElement('style');st.id='doccss';st.textContent=DOCCSS;document.head.appendChild(st)})();
var MONTHS=['January','February','March','April','May','June','July','August','September','October','November','December'],HRC={html:'',fn:''},PORT=[];
function pss(){if(!Array.isArray(S.payslips))S.payslips=[];return S.payslips}
function ymLabel(ym){var p=String(ym).split('-');return (MONTHS[+p[1]-1]||'')+' '+p[0]}
function dDay(s){var d=new Date(/^\d{4}-\d{2}-\d{2}$/.test(s)?s+'T00:00:00':s);return isNaN(d)?'-':d.toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}
function dFull(s){var d=new Date(s);return isNaN(d)?'-':d.toLocaleString('en-IN',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'})}
function bizObj(){var s=S.settings;return {n:s.name,a:s.address||'',p:s.phone||'',g:s.gst||''}}
function etok(e){if(!e.tok){e.tok=newTok()+newTok()+newTok();save();sbUpdateRow('employees',e.id,{portal_token:e.tok})}return e.tok}
function ehead(b,t1,t2,t3){return '<div class="pp-head"><div class="pp-brand"><svg width="42" height="50" viewBox="0 0 44 52"><path d="M22 2C22 2 4 22 4 34a18 18 0 0 0 36 0C40 22 22 2 22 2Z" fill="#1368e8"/><path d="M8 36c8-6 16 4 28-2" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round"/></svg><div><h1>'+esc(b.n)+'</h1><p>Packaged Drinking Water</p>'+(b.a?'<p>'+esc(b.a)+'</p>':'')+(b.p||b.g?'<p>'+(b.p?'Ph: '+esc(b.p):'')+(b.p&&b.g?' &nbsp;|&nbsp; ':'')+(b.g?'GSTIN: '+esc(b.g):'')+'</p>':'')+'</div></div><div class="pp-title"><small>'+esc(t1)+'</small><b>'+esc(t2)+'</b><span>'+esc(t3)+'</span></div></div><div class="pp-band"></div>'}
function slipData(e,ym,bonus,other,note){var rec=S.attendance.filter(function(a){return a.emp==e.id&&String(a.date).slice(0,7)==ym}),pr=0,ab=0;
 rec.forEach(function(a){if(a.status=='Present')pr+=1;else if(a.status=='Half day'){pr+=.5;ab+=.5}else ab+=1});
 var y=+ym.slice(0,4),m=+ym.slice(5,7),days=new Date(y,m,0).getDate(),adv=sum(S.advances.filter(function(x){return x.emp==e.id&&String(x.date).slice(0,7)==ym}),function(x){return +x.amount||0}),g=+e.salary||0;
 return {k:'p',id:'PS-'+ym.replace('-','')+'-'+e.id,m:ym,b:bizObj(),e:{id:e.id,n:e.name,r:e.role,p:e.phone||'',j:e.joinedAt||e.joined||'',pan:e.pan||''},at:new Date().toISOString(),att:rec.length?[days,pr,ab]:null,g:g,bo:round2(+bonus||0),ad:round2(adv),ot:round2(+other||0),on:note||'',net:round2(g+(+bonus||0)-adv-(+other||0))}}
function slipHTML(s){var b=s.b||{},e=s.e||{},bo=num(s.bo),ad=num(s.ad),ot=num(s.ot),g=num(s.g),net=num(s.net);
 var n=Math.max(3,bo>0?2:1,(ad>0?1:0)+(ot>0?1:0)),E=[['Basic Salary',g]],D=[];if(bo>0)E.push(['Bonus / Incentive',bo]);if(ad>0)D.push(['Salary advance recovered',ad]);if(ot>0)D.push([s.on||'Other deduction',ot]);
 var rows='';for(var i=0;i<n;i++)rows+='<tr><td>'+(E[i]?esc(E[i][0]):'&nbsp;')+'</td><td class="r">'+(E[i]?money(E[i][1]):'')+'</td><td class="sp"></td><td>'+(D[i]?esc(D[i][0]):'&nbsp;')+'</td><td class="r">'+(D[i]?money(D[i][1]):'')+'</td></tr>';
 var te=round2(g+bo),td=round2(ad+ot),p=e.pan?String(e.pan).replace(/^(.{3}).*(.{2})$/,'$1*****$2'):'-';
 var ymTxt=s.m?ymLabel(s.m):'',pDays=s.m&&/^\d{4}-\d{2}$/.test(s.m)?new Date(+s.m.slice(0,4),+s.m.slice(5,7),0).getDate():'';
 return '<div class="pap">'+ehead(b,'PAY SLIP',ymTxt,'Pay period: 01 – '+pDays+' '+ymTxt)+
 '<div class="pp-grid"><div><small>Employee name</small><b>'+esc(e.n)+'</b></div><div><small>Employee ID</small><b>'+esc(e.id)+'</b></div><div><small>Designation</small><b>'+esc(e.r)+'</b></div><div><small>Mobile</small><b>'+esc(e.p||'-')+'</b></div><div><small>Date of joining</small><b>'+esc(e.j?dDay(e.j):'-')+'</b></div><div><small>PAN</small><b>'+esc(p)+'</b></div><div><small>Pay slip no.</small><b>'+esc(s.id)+'</b></div><div><small>Generated on</small><b>'+esc(dFull(s.at))+'</b></div></div>'+
 (Array.isArray(s.att)&&s.att.length>=3?'<div class="pp-att"><span>Days in month <b>'+esc(num(s.att[0]))+'</b></span><span>Present <b>'+esc(num(s.att[1]))+'</b></span><span>Absent <b>'+esc(num(s.att[2]))+'</b></span><em>As recorded in attendance</em></div>':'')+
 '<table class="pp-t"><thead><tr><th>Earnings</th><th class="r">Amount</th><th class="sp"></th><th>Deductions</th><th class="r">Amount</th></tr></thead><tbody>'+rows+'</tbody><tfoot><tr><td>Gross earnings</td><td class="r">'+money(te)+'</td><td class="sp"></td><td>Total deductions</td><td class="r">'+money(td)+'</td></tr></tfoot></table>'+
 '<div class="pp-net"><div><small>NET PAY (TAKE HOME)</small><b>'+money(net)+'</b></div><div class="pp-w"><small>Amount in words</small>Rupees '+words(Math.max(0,net))+' Only</div></div>'+
 '<div class="pp-foot"><div class="pp-note">Net pay = Gross earnings − Total deductions.<br>Salary advances given during the month are recovered here.</div><div class="pp-sign"><i></i>Authorised Signatory<br><b>'+esc(b.n)+'</b></div></div><div class="pp-cg">This is a computer-generated pay slip. Please contact the office for any query.</div></div>'}
function letterData(e){return {k:'l',at:new Date().toISOString(),id:'LT-'+e.id,ref:'SRI/HR/'+new Date().getFullYear()+'/'+e.id,d:today(),b:bizObj(),e:{id:e.id,n:e.name,r:e.role,p:e.phone||'',a:e.address||'',j:e.joinedAt||e.joined||today(),s:+e.salary||0}}}
function letterHTML(L){var b=L.b||{},e=L.e||{},first=String(e.n||'').split(' ')[0],sal=money(num(e.s));
 return '<div class="pap lt">'+ehead(b,'APPOINTMENT LETTER','Joining Letter','Ref: '+(L.ref||''))+
 '<div class="lt-meta"><div><b>Date:</b> '+esc(dDay(L.d))+'</div><div><b>Employee ID:</b> '+esc(e.id)+'</div></div>'+
 '<div class="lt-to"><small>To</small><b>'+esc(e.n)+'</b><div>'+esc(e.a||'-')+'</div><div>Mobile: '+esc(e.p||'-')+'</div></div>'+
 '<p class="lt-sub"><b>Subject: Letter of appointment as '+esc(e.r)+'</b></p>'+
 '<p>Dear '+esc(first)+',</p><p>We are pleased to appoint you at <b>'+esc(b.n)+'</b> as <b>'+esc(e.r)+'</b> with effect from <b>'+esc(dDay(e.j))+'</b>, on the following terms and conditions:</p>'+
 '<ol class="lt-ol"><li><b>Duties.</b> You will perform the duties of '+esc(e.r)+' and any other work reasonably assigned by the management of the plant.</li>'+
 '<li><b>Salary.</b> Your monthly salary will be <b>'+sal+'</b> (Rupees '+words(num(e.s))+' Only), payable every month after deductions, if any, as per rules.</li>'+
 '<li><b>Working hours.</b> Normally 8 hours a day and 6 days a week as per the plant schedule. Weekly off and holidays will be decided by the management.</li>'+
 '<li><b>Advances.</b> Any salary advance given to you will be recovered from your salary.</li>'+
 '<li><b>Conduct and confidentiality.</b> You will work honestly, take care of company property, vehicles and stock, and keep business and customer information confidential.</li>'+
 '<li><b>Documents.</b> The Aadhaar, PAN and licence details given by you are true. Any false information may lead to termination.</li>'+
 '<li><b>Termination.</b> Either side may end this employment by giving 30 days notice. The management may end it immediately in case of misconduct.</li>'+
 '<li><b>Law.</b> This appointment is governed by the laws of India.</li></ol>'+
 '<p>We welcome you to '+esc(b.n)+' and wish you a successful career with us. Please sign the copy below and return it as your acceptance.</p>'+
 '<div class="lt-sig"><div><i></i>Authorised Signatory<br><b>'+esc(b.n)+'</b></div><div><i></i>Employee acceptance<br><b>'+esc(e.n)+'</b><br><small>Date: ____________</small></div></div>'+
 '<div class="pp-cg">This is a system-generated letter issued by '+esc(b.n)+'.</div></div>'}
function hrShow(html,fn){HRC.html=html;HRC.fn=fn;openModal('<div class="pbar"><button type="button" class="btn green sm" data-hr="dl">Download PDF</button><button type="button" class="btn alt sm" data-hr="pr">Print</button><button type="button" class="btn sm danger" data-nb="close">Close</button></div>'+html,true)}
function dlDoc(html,fn){var wrap=document.createElement('div');wrap.style.cssText='position:fixed;left:-10000px;top:0;width:794px;background:#fff';wrap.innerHTML=html;document.body.appendChild(wrap);
 var fallback=function(){wrap.remove();var h='<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+esc(fn)+'</title><style>body{margin:0;padding:16px;background:#eef2f8}'+DOCCSS+'@media print{body{background:#fff;padding:0}.pap{border:0}}</style>'+html,a=document.createElement('a');a.href=URL.createObjectURL(new Blob([h],{type:'text/html'}));a.download=fn+'.html';document.body.appendChild(a);a.click();a.remove();toast('Downloaded (open it and tap Print to save as PDF)')};
 if(window.html2canvas&&window.jspdf){window.html2canvas(wrap.firstElementChild,{scale:2,backgroundColor:'#ffffff'}).then(function(cv){var pdf=new window.jspdf.jsPDF({unit:'pt',format:'a4'}),W=595.28,H=841.89,h=cv.height*W/cv.width,img=cv.toDataURL('image/jpeg',.95);
  if(h<=H)pdf.addImage(img,'JPEG',0,0,W,h);else{var w2=W*H/h;pdf.addImage(img,'JPEG',(W-w2)/2,0,w2,H)}pdf.save(fn+'.pdf');wrap.remove();toast('Downloaded')}).catch(fallback)}else fallback()}
function hrFn(o){return 'SR-Industries-'+(o.k=='p'?'PaySlip-'+String(o.e.n).replace(/[^A-Za-z0-9]+/g,'_')+'-'+o.m:'Joining-Letter-'+String(o.e.n).replace(/[^A-Za-z0-9]+/g,'_'))}
function hrHTML(o){return o.k=='p'?slipHTML(o):letterHTML(o)}
function docLink(o){return location.href.split('#')[0]+'#doc='+b64e(o)}
function portalLink(e){return location.href.split('#')[0]+'#me='+etok(e)}
function hrWa(e,txt){var m=digits(e.phone);return 'https://wa.me/'+(m?'91'+m:'')+'?text='+encodeURIComponent(txt)}
function slipWa(e,s){return hrWa(e,'*'+s.b.n+'*\nHello '+e.name+', your pay slip for '+ymLabel(s.m)+' is ready.\nNet pay: '+money(s.net)+'\n\nView / download: '+docLink(s)+'\n\nAll your pay slips: '+portalLink(e))}
function letterWa(e,L){return hrWa(e,'*'+L.b.n+'*\nDear '+e.name+', welcome to '+L.b.n+'! Your joining letter is ready.\n\nView / download: '+docLink(L)+'\n\nYour pay slips will appear here: '+portalLink(e))}
function pubItem(e,o){if(!online()||!SESSION)return toast('Sign in online to publish to the employee portal.');
 api('/api/slip',{method:'POST',body:JSON.stringify({tok:etok(e),item:o})}).then(function(r){toast(r.ok?'Published to the employee portal':'Could not publish to the employee portal')},function(){toast('Could not reach the online service')})}
function hrCard(e){var ym=today().slice(0,7),mine=pss().filter(function(x){return x.e.id==e.id}).sort(function(a,b){return a.m<b.m?1:-1});
 return '<section class="card" style="margin-top:14px"><h3>HR Documents</h3><p class="pdesc">Joining letter and monthly pay slips are made from this employee\'s saved details. Share on WhatsApp or download as PDF.</p><div class="pf" style="grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:14px;margin-top:14px">'+
 '<div class="card" style="padding:16px"><b>Joining / Appointment Letter</b><p class="pdesc">Uses name, address, role, salary and joining date.</p><div class="rowact"><button type="button" class="btn sm alt" data-hr="l-view" data-id="'+e.id+'">Preview</button><button type="button" class="btn sm green" data-hr="l-dl" data-id="'+e.id+'">Download Joining Letter</button><button type="button" class="btn sm wa" data-hr="l-wa" data-id="'+e.id+'">Send Joining Letter</button></div></div>'+
 '<div class="card" style="padding:16px"><b>Employee portal link</b><p class="pdesc">The employee opens this link on their phone to see all pay slips.</p><div class="rowact"><button type="button" class="btn sm alt" data-hr="p-copy" data-id="'+e.id+'">Copy link</button><button type="button" class="btn sm wa" data-hr="p-wa" data-id="'+e.id+'">Send on WhatsApp</button></div></div></div>'+
 '<div class="card" style="padding:16px;margin-top:14px"><b>Generate Pay Slip</b><div class="invrow" style="grid-template-columns:repeat(4,1fr);margin-top:10px"><div class="fld"><label for="hr-m">Month</label><input id="hr-m" type="month" value="'+ym+'"></div><div class="fld"><label for="hr-bo">Bonus / incentive (₹)</label><input id="hr-bo" type="number" min="0" inputmode="decimal" placeholder="0"></div><div class="fld"><label for="hr-ot">Other deduction (₹)</label><input id="hr-ot" type="number" min="0" inputmode="decimal" placeholder="0"></div><div class="fld"><label for="hr-on">Deduction reason</label><input id="hr-on" type="text" maxlength="40" placeholder="Optional"></div></div>'+
 '<p class="pdesc" style="margin:8px 0 10px">Salary '+money(e.salary||0)+' per month. Advances given in the selected month are deducted automatically.</p><button type="button" class="btn" data-hr="s-gen" data-id="'+e.id+'">Generate Pay Slip</button>'+
 (mine.length?'<div style="margin-top:14px">'+table(['Month','Net pay','Generated',''],mine.map(function(s){return [esc(ymLabel(s.m)),'<b>'+money(s.net)+'</b>',dFull(s.at),'<div class="rowact"><button type="button" class="btn sm alt" data-hr="s-view" data-sid="'+s.id+'">View</button><button type="button" class="btn sm green" data-hr="s-dl" data-sid="'+s.id+'">Download Pay Slip</button><button type="button" class="btn sm wa" data-hr="s-wa" data-sid="'+s.id+'">WhatsApp</button></div>']}))+'</div>':'')+'</div></section>'}
function hrEmp(id){return S.employees.filter(function(x){return x.id==id})[0]}
function hrSlip(id){return pss().filter(function(x){return x.id==id})[0]}
document.addEventListener('click',function(e){var t=e.target.closest('[data-hr]');if(!t)return;var a=t.dataset.hr,em=t.dataset.id?hrEmp(t.dataset.id):null,s,L;
 if(a=='dl')dlDoc(HRC.html,HRC.fn);
 else if(a=='pr'){var r=$('#printroot');if(!r){r=document.createElement('div');r.id='printroot';document.body.appendChild(r)}r.innerHTML=HRC.html;try{window.print()}catch(x){toast('Printing is not available in this view')}}
 else if(a=='l-view'||a=='l-dl'||a=='l-wa'){if(!em)return;L=letterData(em);
  if(a=='l-view')hrShow(letterHTML(L),hrFn(L));else if(a=='l-dl')dlDoc(letterHTML(L),hrFn(L));else{window.open(letterWa(em,L),'_blank');pubItem(em,L)}}
 else if(a=='p-copy'){if(em)copyTxt(portalLink(em))}
 else if(a=='p-wa'){if(em)window.open(hrWa(em,'Hello '+em.name+', open this link to see your pay slips and documents from '+S.settings.name+':\n'+portalLink(em)),'_blank')}
 else if(a=='s-gen'){if(!em)return;var ym=$('#hr-m').value;clearErr('#hr-m');if(!/^\d{4}-\d{2}$/.test(ym))return bad('#hr-m','Choose the month');
  s=slipData(em,ym,$('#hr-bo').value,$('#hr-ot').value,$('#hr-on').value.trim());if(s.net<0)return toast('Deductions are more than the salary. Check the amounts.');
  var L2=pss(),ix=-1;L2.forEach(function(x,i){if(x.id==s.id)ix=i});if(ix>=0)L2[ix]=s;else L2.push(s);save();pubItem(em,s);showProfile(em.id);hrShow(slipHTML(s),hrFn(s))}
 else if(a=='s-view'||a=='s-dl'||a=='s-wa'){s=hrSlip(t.dataset.sid);if(!s)return;em=hrEmp(s.e.id);
  if(a=='s-view')hrShow(slipHTML(s),hrFn(s));else if(a=='s-dl')dlDoc(slipHTML(s),hrFn(s));else if(em)window.open(slipWa(em,s),'_blank')}
 else if(a=='pv'||a=='pd'){var o=PORT[+t.dataset.i];if(!o)return;o=parseDoc(o);if(!o)return toast('Invalid document');if(a=='pv')hrShow(hrHTML(o),hrFn(o));else dlDoc(hrHTML(o),hrFn(o))}});
function parseDoc(o){
 if(!o||typeof o!='object'||(o.k!='p'&&o.k!='l')||!o.e||!o.b||typeof o.e!='object'||typeof o.b!='object')return null;
 var b={n:String(o.b.n||''),a:String(o.b.a||''),p:String(o.b.p||''),g:String(o.b.g||'')};
 var dt=function(s){return typeof s=='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)?s:''};
 if(o.k=='p'){
  var ym=typeof o.m=='string'&&/^\d{4}-\d{2}$/.test(o.m)?o.m:'';
  var att=null;
  if(Array.isArray(o.att)&&o.att.length>=3){
   att=[num(o.att[0]),num(o.att[1]),num(o.att[2])];
  }
  return {k:'p',id:String(o.id||''),m:ym,b:b,e:{id:String(o.e.id||''),n:String(o.e.n||''),r:String(o.e.r||''),p:String(o.e.p||''),j:dt(o.e.j),pan:String(o.e.pan||'')},at:String(o.at||''),att:att,g:num(o.g),bo:num(o.bo),ad:num(o.ad),ot:num(o.ot),on:String(o.on||''),net:num(o.net)};
 }else{
  return {k:'l',id:String(o.id||''),ref:String(o.ref||''),d:dt(o.d),b:b,e:{id:String(o.e.id||''),n:String(o.e.n||''),r:String(o.e.r||''),p:String(o.e.p||''),a:String(o.e.a||''),j:dt(o.e.j),s:num(o.e.s)},at:String(o.at||'')};
 }
}
function renderDoc(){var raw=null;try{raw=b64d(location.hash.slice(5))}catch(e){}document.body.classList.add('public');closeModal();var v=$('#pubview');
 var o=parseDoc(raw);
 if(!o){v.innerHTML='<div class="pubwrap"><div class="card empty">This document link is not valid.</div></div>';return}
 HRC.html=hrHTML(o);HRC.fn=hrFn(o);document.title=o.b.n+' - '+(o.k=='p'?'Pay slip':'Joining letter');
 v.innerHTML='<div class="pubwrap"><div class="pbar"><button type="button" class="btn green" data-hr="dl">Download PDF</button><button type="button" class="btn alt" data-hr="pr">Print</button></div>'+HRC.html+'</div>'}
function renderPortal(){var tok=location.hash.slice(4);document.body.classList.add('public');closeModal();var v=$('#pubview');document.title='Employee Portal';
 v.innerHTML='<div class="pubwrap"><div class="card empty">Loading…</div></div>';
 fetch('/api/slips?tok='+encodeURIComponent(tok)).then(function(r){if(!r.ok)throw 0;return r.json()}).then(function(d){PORT=(d.items||[]).slice().sort(function(a,b){return String(b.at||b.d||'')<String(a.at||a.d||'')?-1:1});
  var f=PORT[0],nm=f&&f.e?String(f.e.n||''):'',bz=f&&f.b?String(f.b.n||''):'';
  v.innerHTML='<div class="pubwrap jn"><div class="card"><h2 style="margin:0">'+esc(bz||'Employee Portal')+'</h2><p class="pdesc" style="margin:2px 0 14px">Employee portal'+(nm?' · '+esc(nm):'')+'</p>'+
  (PORT.length?PORT.map(function(o,i){return '<div class="prow" style="display:flex;justify-content:space-between;gap:10px;align-items:center;flex-wrap:wrap;padding:12px 0;border-top:1px solid var(--line)"><div><b>'+(o.k=='p'?'Pay slip · '+esc(ymLabel(o.m)):'Joining letter')+'</b><br><small class="muted">'+(o.k=='p'?'Net pay '+money(num(o.net))+' · ':'')+esc(dFull(o.at||o.d))+'</small></div><div class="rowact"><button type="button" class="btn sm alt" data-hr="pv" data-i="'+i+'">View</button><button type="button" class="btn sm green" data-hr="pd" data-i="'+i+'">Download</button></div></div>'}).join(''):'<p class="pdesc">No documents yet. Your pay slips will appear here when the office generates them.</p>')+'</div></div>'},
  function(){v.innerHTML='<div class="pubwrap"><div class="card empty">This portal link is not valid or the service is not available.</div></div>'})}

/* ----- Credit / Outstanding ----- */
PAGES.outstanding=function(){
 var tot=sum(S.customers,function(c){return cstat(c).pend});var n=S.customers.filter(function(c){return cstat(c).pend>0}).length;
 return head2('Credit / Outstanding','Who still owes you money. Tap Receive when a customer pays, or Remind to send a WhatsApp reminder.')+
  kp([['Total pending',money(tot)],['Customers with dues',n]])+
  '<div class="card abf" style="grid-template-columns:1fr"><div class="fld"><label for="op-q">Search</label><input id="op-q" type="search" placeholder="Name, mobile or address" autocomplete="off"></div></div><div id="opres">'+opRows('')+'</div>'};
function opRows(q){q=q.trim().toLowerCase();
 var l=S.customers.map(function(c){return [c,cstat(c)]}).filter(function(a){return a[1].pend>0&&matchCust(a[0],q)}).sort(function(a,b){return b[1].pend-a[1].pend});
 return table(['Customer','Mobile','Pending','Oldest unpaid bill',''],l.map(function(a){var c=a[0],s=a[1],d=daysAgo(s.oldest);
  return ['<div><b>'+esc(c.name)+'</b><br><small class="muted">'+esc(c.area||'No address')+'</small></div>',esc(c.phone),'<b style="color:var(--red)">'+money(s.pend)+'</b>',fdate(s.oldest)+' <small class="muted">('+d+(d==1?' day':' days')+')</small>',
   '<div class="rowact"><button class="btn sm" data-op="pay" data-id="'+c.id+'">Receive</button><a class="btn sm wa" target="_blank" rel="noopener" href="'+remindURL(c,s.pend)+'">Remind</a><button class="btn sm alt" data-op="open" data-id="'+c.id+'">Open</button></div>']}),'No pending amounts. Everyone has paid.')}

/* ================= Vehicle Management / Trip Handover ================= */
var VM_ACTIVE_TAB='overview',VM_RECORDING=null,VM_STREAM=null,VM_CHUNKS=[],VM_RECORD_TIMER=null,VM_PENDING=[];
function vmStoreMedia(file,kind){
 if(!SB||!SESSION)return Promise.reject(new Error('Not signed in to Supabase'));
 var safeName=String(file.name||(kind+'-evidence')).replace(/[^A-Za-z0-9._-]+/g,'_').slice(0,60);
 var path='trips/'+Date.now()+'-'+Math.random().toString(36).slice(2,8)+'-'+safeName;
 var contentType=file.type||(kind=='video'?'video/webm':'image/jpeg');
 return SB.storage.from('vehicle-evidence').upload(path,file,{contentType:contentType,upsert:false}).then(function(res){
  if(res.error)throw new Error(res.error.message||'Could not upload vehicle evidence');
  return {id:path,path:path,name:file.name||kind+' evidence',type:contentType,size:file.size,kind:kind};
 });
}
function vmGetMedia(id){
 if(!SB||!SESSION)return Promise.reject(new Error('Not signed in'));
 return SB.storage.from('vehicle-evidence').createSignedUrl(id,300).then(function(res){
  if(res.error||!res.data||!res.data.signedUrl)throw new Error((res.error&&res.error.message)||'Evidence not found');
  return {url:res.data.signedUrl,name:id.split('/').pop()||'evidence'};
 });
}
function vmMB(n){return (n/1048576).toFixed(1)+' MB'}
function vmLimit(){return Math.max(1,Math.min(200,Number(S.settings.vehicleVideoMaxMB)||25))}
function vmVehicleOptions(){return S.vehicles.map(function(v){return '<option value="'+esc(v.id)+'">'+esc(v.number)+' · '+esc(v.type)+'</option>'}).join('')}
function vmEmployeeOptions(){return S.employees.map(function(e){return '<option value="'+esc(e.id)+'">'+esc(e.name)+' ('+esc(e.role)+')</option>'}).join('')}
function vmEvidenceButton(media,label){
 if(!media||!media.length)return '<span class="muted">No evidence</span>';
 return media.map(function(m){return '<button type="button" class="btn sm alt" data-vm-media="'+esc(m.path||m.id)+'">'+(m.kind=='video'?'▶':'▧')+' '+esc(label||m.kind)+' · '+vmMB(m.size||0)+'</button>'}).join(' ');
}
function vmPage(){
 var active=S.vehicleTrips.filter(function(t){return !t.handoverAt});
 var closed=S.vehicleTrips.filter(function(t){return !!t.handoverAt});
 var damaged=closed.filter(function(t){return t.handoverCondition=='Damage / Repair'});
 var content='';
 if(VM_ACTIVE_TAB=='overview'){
  content='<div class="vm-grid"><section class="vm-card"><h3>Vehicle Register</h3><p>Add and maintain company vehicles before assigning them to trips.</p>'+
   '<form id="vm-vehicle-form" class="vm-form">'+
   '<div class="fld"><label>Vehicle Number *</label><input name="number" placeholder="AP 39 AB 1234" required></div>'+
   '<div class="fld"><label>Vehicle Type *</label><select name="type" required><option value="">Select type</option><option>Truck</option><option>Mini Truck</option><option>Van</option><option>Pickup</option><option>Car</option><option>Other</option></select></div>'+
   '<div class="fld"><label>Make / Model</label><input name="model" placeholder="Tata Ace / Bolero"></div>'+
   '<div class="fld"><label>Default Driver</label><select name="driver"><option value="">Not assigned</option>'+vmEmployeeOptions()+'</select></div>'+
   '<div class="fld full"><label>Notes</label><input name="notes" placeholder="Vehicle details / identification"></div>'+
   '<div class="fld full"><button class="btn" type="submit">+ Add Vehicle</button></div></form></section>'+
   '<section class="vm-card"><h3>Evidence & Video Settings</h3><p>Set the maximum size allowed for each recorded or uploaded video.</p>'+
   '<form id="vm-settings-form" class="vm-form"><div class="fld"><label>Maximum video size (MB)</label><input name="maxmb" type="number" min="1" max="200" value="'+vmLimit()+'" required></div><div class="fld"><label>Allowed video types</label><input value="MP4 / WebM (browser supported)" disabled></div><div class="fld full"><div class="vm-warning">Video recording will stop automatically when it reaches this limit. Uploads larger than the limit will be rejected. Photos are stored separately.</div><button class="btn alt" type="submit">Save Evidence Settings</button></div></form></section></div>'+
   '<section class="vm-card" style="margin-top:14px"><div class="card-h"><h3>Registered Vehicles</h3><span class="cnt">'+S.vehicles.length+' vehicles</span></div>'+
   (S.vehicles.length?S.vehicles.map(function(v){var driver=empName(v.driver);return '<div class="vm-record"><div class="vm-record-head"><div><strong>'+esc(v.number)+'</strong><div class="muted">'+esc(v.type)+' · '+esc(v.model||'Model not entered')+'</div></div><span class="vm-status '+(active.some(function(t){return t.vehicle==v.id})?'active':'closed')+'">'+(active.some(function(t){return t.vehicle==v.id})?'On Trip':'Available')+'</span></div><div class="vm-meta"><span>Default driver: '+esc(v.driver?driver:'Not assigned')+'</span><span>'+esc(v.notes||'No notes')+'</span></div></div>'}).join(''):'<div class="empty">No vehicles registered yet. Add the first vehicle above.</div>')+'</section>';
 }else if(VM_ACTIVE_TAB=='start'){
  content='<section class="vm-card"><h3>Pre-Trip Vehicle Check & Start Trip</h3><p>Driver must record vehicle meter, fuel/battery status and capture vehicle condition evidence before leaving the plant.</p>'+
   (!S.vehicles.length?'<div class="vm-warning">First add a vehicle in Vehicle Register.</div>':'')+
   '<form id="vm-start-form" class="vm-form">'+
   '<div class="fld"><label>Vehicle *</label><select name="vehicle" required><option value="">Select vehicle</option>'+vmVehicleOptions()+'</select></div>'+
   '<div class="fld"><label>Employee / Driver *</label><select name="employee" required><option value="">Select employee</option>'+vmEmployeeOptions()+'</select></div>'+
   '<div class="fld"><label>Start Odometer Reading (KM) *</label><input name="startReading" type="number" min="0" step="0.1" placeholder="e.g. 45210.5" required></div>'+
   '<div class="fld"><label>Fuel / Power Type *</label><select name="fuelType" required><option value="">Select</option><option>Diesel</option><option>Petrol</option><option>Electric</option><option>CNG</option></select></div>'+
   '<div class="fld"><label>Fuel Level (%) *</label><input name="fuelPercent" type="number" min="0" max="100" placeholder="0–100" required></div>'+
   '<div class="fld"><label>Battery Level (%)</label><input name="batteryPercent" type="number" min="0" max="100" placeholder="For EV / optional"></div>'+
   '<div class="fld"><label>Vehicle condition before start *</label><select name="startCondition" required><option value="">Select condition</option><option>Good</option><option>Minor issue</option><option>Needs repair</option></select></div>'+
   '<div class="fld"><label>Tyres / lights / mirrors checked?</label><select name="safetyCheck" required><option value="">Select</option><option>Yes – all checked</option><option>Issue found</option></select></div>'+
   '<div class="fld full"><label>Existing damage / remarks</label><textarea name="startNotes" placeholder="Mention scratches, dents, tyre issue, warning light etc. If none, enter No visible damage."></textarea></div>'+
   '<div class="fld full"><label>Before-start photos / video *</label><div class="vm-upload"><input id="vm-start-files" type="file" accept="image/*,video/*" multiple required><div class="vm-help">Upload clear photos around vehicle (front, rear, left, right, dashboard/odometer). Video maximum: '+vmLimit()+' MB per video. At least one photo or video required.</div><div id="vm-start-filelist" class="vm-help">No files selected.</div><button type="button" class="btn alt sm" id="vm-record-start">● Record a walk-around video</button><div id="vm-rec-status" class="vm-help" aria-live="polite"></div></div></div>'+
   '<div class="fld full"><label class="vm-check"><input type="checkbox" name="driverConfirm" required> I confirm that I checked the vehicle and the information above is correct.</label></div>'+
   '<div class="fld full"><button class="btn" type="submit" '+(!S.vehicles.length?'disabled':'')+'>Confirm Vehicle Start & Create Trip</button></div></form></section>';
 }else if(VM_ACTIVE_TAB=='handover'){
  content='<section class="vm-card"><h3>Vehicle Return / Handover Inspection</h3><p>After the vehicle returns, supervisor records closing meter, fuel level, condition and any damage. Trip closes only after supervisor confirmation.</p>'+
   (active.length?'<form id="vm-end-form" class="vm-form"><div class="fld"><label>Active Trip *</label><select name="trip" required><option value="">Select returned vehicle</option>'+active.map(function(t){var v=S.vehicles.filter(function(x){return x.id==t.vehicle})[0];return '<option value="'+esc(t.id)+'">'+esc(v?v.number:'Vehicle')+' · '+esc(empName(t.employee))+' · Start '+esc(t.startReading)+' KM</option>'}).join('')+'</select></div>'+
   '<div class="fld"><label>Closing Odometer Reading (KM) *</label><input name="endReading" type="number" min="0" step="0.1" required></div>'+
   '<div class="fld"><label>Fuel Level on Return (%) *</label><input name="endFuel" type="number" min="0" max="100" required></div>'+
   '<div class="fld"><label>Battery Level on Return (%)</label><input name="endBattery" type="number" min="0" max="100"></div>'+
   '<div class="fld"><label>Supervisor Name *</label><input name="supervisor" required placeholder="Name of person inspecting"></div>'+
   '<div class="fld"><label>Final Vehicle Condition *</label><select name="condition" required><option value="">Select</option><option>Good – no damage</option><option>Damage / Repair</option><option>Needs cleaning</option></select></div>'+
   '<div class="fld full"><label>Damage / issue details (required if not Good)</label><textarea name="damage" placeholder="Describe damage, location, severity, possible cause and action needed"></textarea></div>'+
   '<div class="fld full"><label>Return photos / video</label><div class="vm-upload"><input id="vm-end-files" type="file" accept="image/*,video/*" multiple><div class="vm-help">Take photos of any new damage and dashboard reading. Video maximum: '+vmLimit()+' MB per video.</div><div id="vm-end-filelist" class="vm-help">No files selected.</div><button type="button" class="btn alt sm" id="vm-record-end">● Record return inspection video</button></div></div>'+
   '<div class="fld full"><label class="vm-check"><input type="checkbox" name="supervisorConfirm" required> I inspected the returned vehicle and confirm this handover report.</label></div>'+
   '<div class="fld full"><button class="btn" type="submit">Complete Handover & Close Trip</button></div></form>':'<div class="empty">No active trips waiting for handover.</div>')+'</section>';
 }else{
  var list=closed.slice().reverse();
  content='<section class="vm-card"><div class="card-h"><h3>Trip & Handover History</h3><span class="cnt">'+S.vehicleTrips.length+' records</span></div>'+
   (list.length?list.map(function(t){var v=S.vehicles.filter(function(x){return x.id==t.vehicle})[0];var damaged=t.handoverCondition=='Damage / Repair'||t.handoverCondition=='Needs cleaning';return '<div class="vm-record"><div class="vm-record-head"><div><strong>'+esc(v?v.number:'Vehicle')+' · '+esc(empName(t.employee))+'</strong><div class="muted">Trip '+esc(t.id)+' · '+esc(t.startAt?dFull(t.startAt):'')+'</div></div><span class="vm-status '+(damaged?'damage':'closed')+'">'+esc(t.handoverCondition||'Closed')+'</span></div><div class="vm-meta"><span>Start: '+esc(t.startReading)+' KM</span><span>End: '+esc(t.endReading)+' KM</span><span>Distance: '+(Number(t.endReading)-Number(t.startReading)).toFixed(1)+' KM</span><span>Fuel: '+esc(t.fuelType)+' · '+esc(t.fuelPercent)+'% → '+esc(t.endFuel)+'%</span><span>Supervisor: '+esc(t.supervisor||'-')+'</span></div>'+(t.damage?'<div class="vm-warning">Issue: '+esc(t.damage)+'</div>':'')+'<div class="vm-actions">'+vmEvidenceButton(t.startMedia,'Start evidence')+' '+vmEvidenceButton(t.endMedia,'Return evidence')+'</div></div>'}).join(''):'<div class="empty">No completed handover reports yet.</div>')+'</section>';
 }
 var canManageVeh=canAct('manage_vehicles');
 if(!canManageVeh&&VM_ACTIVE_TAB=='overview')VM_ACTIVE_TAB='start';
 return head2('Vehicle Management','Vehicle register, pre-trip inspection, driver handover and supervisor return reports.')+
 '<div class="vm-kpis"><div class="vm-kpi"><small>Registered vehicles</small><b>'+S.vehicles.length+'</b></div><div class="vm-kpi"><small>Currently on trip</small><b>'+active.length+'</b></div><div class="vm-kpi"><small>Completed trips</small><b>'+closed.length+'</b></div><div class="vm-kpi"><small>Damage / repair cases</small><b>'+damaged.length+'</b></div></div>'+
 '<div class="vm-tabs">'+(canManageVeh?'<button class="vm-tab '+(VM_ACTIVE_TAB=='overview'?'active':'')+'" data-vm-tab="overview">Vehicle Register</button>':'')+'<button class="vm-tab '+(VM_ACTIVE_TAB=='start'?'active':'')+'" data-vm-tab="start">Start Trip Check</button><button class="vm-tab '+(VM_ACTIVE_TAB=='handover'?'active':'')+'" data-vm-tab="handover">Return Handover</button><button class="vm-tab '+(VM_ACTIVE_TAB=='history'?'active':'')+'" data-vm-tab="history">Handover Reports</button></div>'+content;
}
PAGES.vehicles=function(){return vmPage()};
function vmReadFiles(inputId){
 var input=$('#'+inputId),files=input&&input.files?Array.from(input.files):[],max=vmLimit()*1048576;
 for(var f of files){if(f.type.indexOf('video/')===0&&f.size>max)throw new Error(f.name+' is '+vmMB(f.size)+'. Maximum allowed is '+vmLimit()+' MB per video.');if(f.type.indexOf('image/')!==0&&f.type.indexOf('video/')!==0)throw new Error('Only image and video files are allowed.')}
 return Promise.all(files.map(function(f){return vmStoreMedia(f,f.type.indexOf('video/')===0?'video':'photo')}));
}
function vmShowFiles(inputId,listId){
 var input=$('#'+inputId),el=$('#'+listId);if(!input||!el)return;
 var fs=Array.from(input.files||[]);el.textContent=fs.length?fs.map(function(f){return f.name+' ('+vmMB(f.size)+')'}).join(' · '):'No files selected.';
}
function vmStartRecording(kind){
 if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia||!window.MediaRecorder){toast('Camera recording is not supported in this browser. Use file upload.');return}
 var limit=vmLimit()*1048576;VM_CHUNKS=[];
 navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'},audio:true}).then(function(stream){
  VM_STREAM=stream;var opts={};if(MediaRecorder.isTypeSupported('video/webm;codecs=vp9'))opts.mimeType='video/webm;codecs=vp9';else if(MediaRecorder.isTypeSupported('video/webm'))opts.mimeType='video/webm';
  VM_RECORDING=new MediaRecorder(stream,opts);var size=0;var status=$('#vm-rec-status');
  VM_RECORDING.ondataavailable=function(e){if(e.data&&e.data.size){VM_CHUNKS.push(e.data);size+=e.data.size;if(status)status.textContent='Recording: '+vmMB(size)+' / '+vmLimit()+' MB';if(size>=limit&&VM_RECORDING&&VM_RECORDING.state=='recording'){VM_RECORDING.stop();if(status)status.textContent='Maximum video size reached. Recording stopped automatically.'}}};
  VM_RECORDING.onstop=function(){stream.getTracks().forEach(function(t){t.stop()});VM_STREAM=null;var blob=new Blob(VM_CHUNKS,{type:VM_RECORDING.mimeType||'video/webm'});if(blob.size>limit){toast('Video exceeded size limit. Please record again.');return}
   var f=new File([blob],'vehicle-'+kind+'-'+Date.now()+'.webm',{type:blob.type});var input=$('#vm-'+kind+'-files');var dt=new DataTransfer();if(input)Array.from(input.files||[]).forEach(function(x){dt.items.add(x)});dt.items.add(f);if(input)input.files=dt.files;vmShowFiles('vm-'+kind+'-files','vm-'+kind+'-filelist');if(status)status.textContent='Recording saved locally: '+vmMB(blob.size);toast('Video captured. Submit the report to save it.');
  };
  VM_RECORDING.start(1000);if(status)status.textContent='Recording… it will stop at '+vmLimit()+' MB.';
  var btn=$('#vm-record-'+kind);if(btn){btn.textContent='■ Stop recording';btn.dataset.recording='1';}
  VM_RECORD_TIMER=setTimeout(function(){if(VM_RECORDING&&VM_RECORDING.state=='recording')VM_RECORDING.stop()},Math.max(60000,limit/50000*1000));
 }).catch(function(){toast('Camera permission denied or camera unavailable. You can upload an existing video instead.')});
}
function vmFormData(form){var v={};new FormData(form).forEach(function(x,k){v[k]=x});return v}
document.addEventListener('change',function(e){
 if(e.target.id=='vm-start-files')vmShowFiles('vm-start-files','vm-start-filelist');
 if(e.target.id=='vm-end-files')vmShowFiles('vm-end-files','vm-end-filelist');
});
document.addEventListener('click',function(e){
 var tab=e.target.closest('[data-vm-tab]');if(tab){VM_ACTIVE_TAB=tab.dataset.vmTab;render();return}
 var rec=e.target.closest('#vm-record-start,#vm-record-end');if(rec){var kind=rec.id.indexOf('start')>=0?'start':'end';if(rec.dataset.recording=='1'){if(VM_RECORDING&&VM_RECORDING.state=='recording')VM_RECORDING.stop();rec.textContent='● Record a '+(kind=='start'?'walk-around':'return inspection')+' video';rec.dataset.recording='';}else vmStartRecording(kind);return}
 var med=e.target.closest('[data-vm-media]');if(med){vmGetMedia(med.dataset.vmMedia).then(function(m){var w=window.open(m.url,'_blank','noopener');if(!w){var a=document.createElement('a');a.href=m.url;a.download=m.name;a.target='_blank';a.rel='noopener';a.click()}}).catch(function(){toast('Could not open evidence')});return}
});
document.addEventListener('submit',function(e){
 var f=e.target;if(!f.id||f.id.indexOf('vm-')!==0)return;e.preventDefault();
 var v=vmFormData(f);
 if(f.id=='vm-vehicle-form'){
  if(!canAct('manage_vehicles')){toast('Not permitted');return}
  if(S.vehicles.some(function(x){return x.number.toLowerCase()==v.number.trim().toLowerCase()})){toast('This vehicle number is already registered');return}
  var vehRec={id:nid('VH',S.vehicles),number:v.number.trim().toUpperCase(),type:v.type,model:v.model,driver:v.driver,notes:v.notes,createdAt:new Date().toISOString()};
  S.vehicles.push(vehRec);save();sbUpsertRow('vehicles',sbVehicleRow(vehRec));toast('Vehicle added');render();return;
 }
 if(f.id=='vm-settings-form'){if(!canAct('manage_vehicles')){toast('Not permitted');return}S.settings.vehicleVideoMaxMB=Math.max(1,Math.min(200,+v.maxmb||25));save();sbSaveSettings();toast('Video size limit saved');render();return}
 if(f.id=='vm-start-form'){
  var files=$('#vm-start-files').files;if(!files||!files.length){toast('Upload at least one before-start photo or video');return}
  var veh=S.vehicles.filter(function(x){return x.id==v.vehicle})[0];if(!veh){toast('Select a valid vehicle');return}
  if(+v.startReading<0||+v.fuelPercent>100||+v.fuelPercent<0||(+v.batteryPercent>100||+v.batteryPercent<0)){toast('Check meter / percentage values');return}
  var sBtn=f.querySelector('button[type="submit"]');if(sBtn){sBtn.disabled=true;sBtn.textContent='Uploading evidence…'}
  vmReadFiles('vm-start-files').then(function(media){
   var trRec={id:nid('TR',S.vehicleTrips),vehicle:v.vehicle,employee:v.employee,startReading:+v.startReading,fuelType:v.fuelType,fuelPercent:+v.fuelPercent,batteryPercent:v.batteryPercent==''?null:+v.batteryPercent,startCondition:v.startCondition,safetyCheck:v.safetyCheck,startNotes:v.startNotes,startMedia:media,startAt:new Date().toISOString(),status:'Active'};
   S.vehicleTrips.push(trRec);save();
   return sbUpsertRow('vehicle_trips',sbVehicleTripRow(trRec)).then(function(){
    toast('Pre-trip check saved. Vehicle trip started.');VM_ACTIVE_TAB='history';render();
   });
  }).catch(function(err){if(sBtn){sBtn.disabled=false;sBtn.textContent='Confirm Vehicle Start & Create Trip'}toast(err.message||'Could not save evidence')});return;
 }
 if(f.id=='vm-end-form'){
  var trip=S.vehicleTrips.filter(function(x){return x.id==v.trip&&!x.handoverAt})[0];if(!trip){toast('Select an active trip');return}
  if(+v.endReading<+trip.startReading){toast('Closing reading cannot be less than start reading');return}
  if(+v.endFuel<0||+v.endFuel>100||(+v.endBattery<0||+v.endBattery>100)){toast('Fuel / battery percentage must be between 0 and 100');return}
  if(v.condition!='Good – no damage'&&!v.damage.trim()){toast('Mention the damage / issue details before closing this trip');return}
  var eBtn=f.querySelector('button[type="submit"]');if(eBtn){eBtn.disabled=true;eBtn.textContent='Uploading evidence…'}
  vmReadFiles('vm-end-files').then(function(media){
   trip.endReading=+v.endReading;trip.endFuel=+v.endFuel;trip.endBattery=v.endBattery==''?null:+v.endBattery;trip.supervisor=v.supervisor.trim();trip.handoverCondition=v.condition;trip.damage=v.damage;trip.endMedia=media;trip.handoverAt=new Date().toISOString();trip.status='Closed';
   save();
   return sbUpsertRow('vehicle_trips',sbVehicleTripRow(trip)).then(function(){
    toast('Supervisor handover report saved. Trip closed.');VM_ACTIVE_TAB='history';render();
   });
  }).catch(function(err){if(eBtn){eBtn.disabled=false;eBtn.textContent='Complete Handover & Close Trip'}toast(err.message||'Could not save evidence')});return;
 }
});

/* ---------- Backup & Data Export ---------- */
var BACKUP_MODE='daily';
function backupDateOf(x){return String(x&&x.date||'').slice(0,10)}
function backupInRange(x,from,to){var d=backupDateOf(x);return !!d&&d>=from&&d<=to}
function backupMoney(v){return Number(v||0)}
function backupRows(list,headers,mapper){return [headers].concat((list||[]).map(mapper))}
function backupExport(){
 if(!window.XLSX){toast('Excel library did not load. Check internet and reload this page.');return}
 var mode=BACKUP_MODE,now=new Date(),stamp=function(n){return String(n).padStart(2,'0')},datePart=now.getFullYear()+stamp(now.getMonth()+1)+stamp(now.getDate()),timePart=stamp(now.getHours())+stamp(now.getMinutes())+stamp(now.getSeconds());
 var from,to,label;
 if(mode=='daily'){from=$('#bk-date').value;to=from;label='Daily_'+from}
 else if(mode=='range'){from=$('#bk-from').value;to=$('#bk-to').value;label='Custom_'+from+'_to_'+to}
 else{from='0000-01-01';to='9999-12-31';label='All_Time'}
 if(!from||!to||from>to){toast('Please select a valid date range');return}
 var bills=S.bills.filter(function(x){return backupInRange(x,from,to)}),payments=S.payments.filter(function(x){return backupInRange(x,from,to)}),stock=S.stock.filter(function(x){return backupInRange(x,from,to)}),expenses=S.expenses.filter(function(x){return backupInRange(x,from,to)}),customers=S.customers.slice(),newCustomers=S.customers.filter(function(x){return backupInRange(x,from,to)}),attendance=S.attendance.filter(function(x){return backupInRange(x,from,to)}),advances=S.advances.filter(function(x){return backupInRange(x,from,to)});
 var allSales=S.bills.slice().sort(function(a,b){return backupDateOf(a).localeCompare(backupDateOf(b))}),selSales=bills.slice().sort(function(a,b){return backupDateOf(a).localeCompare(backupDateOf(b))});
 var wb=XLSX.utils.book_new(),summary=[['SR INDUSTRIES','BUSINESS DATA BACKUP'],['Backup generated on',now.toLocaleDateString('en-IN')],['Backup generated at',now.toLocaleTimeString('en-IN')],['Backup mode',mode=='daily'?'Daily Backup':mode=='range'?'Custom Date Range':'All-Time Backup'],['Data period',mode=='all'?'All available dates':from+' to '+to],['Business',S.settings.name||'SR Industries'],['Owner',S.settings.owner||''],['Total sales in selected period',sum(bills,function(x){return backupMoney(x.total)})],['Collections in selected period',sum(payments,function(x){return backupMoney(x.amount)})],['Outstanding (current snapshot)',outstanding()],['Bills in selected period',bills.length],['Payments in selected period',payments.length],['Customers in master list',customers.length],['New customers in selected period',newCustomers.length],['Purchases / Stock In records',stock.filter(function(x){return x.type=='In'}).length],['Stock Out records',stock.filter(function(x){return x.type=='Out'}).length],['Expenses in selected period',sum(expenses,function(x){return backupMoney(x.amount)})],['Employees',S.employees.length],['Attendance records in period',attendance.length],['Salary advances in period',advances.length],['Registered vehicles',S.vehicles.length],['Vehicle trips',S.vehicleTrips.length],['Profit calculation','Not available: product cost data is not recorded in the current data model'],['Source','Live records loaded from Supabase']];
 function add(name,rows,widths){var ws=XLSX.utils.aoa_to_sheet(rows);if(widths)ws['!cols']=widths.map(function(w){return {wch:w}});ws['!freeze']={xSplit:0,ySplit:1};if(rows.length>1)ws['!autofilter']={ref:XLSX.utils.encode_range({s:{r:0,c:0},e:{r:rows.length-1,c:Math.max(0,rows[0].length-1)}})};XLSX.utils.book_append_sheet(wb,ws,name)}
 add('Backup Summary',summary, [38,70]);
 add('Selected Period Sales',backupRows(selSales,['Bill ID','Date','Customer','Items','Subtotal / Total','Paid','Due','Payment Mode'],function(b){return [b.id,backupDateOf(b),custName(b.cust),(b.items||[]).map(function(i){return i.p+' × '+i.q+' @ '+i.r}).join(' | '),backupMoney(b.total),backupMoney(b.paid),backupMoney(b.total)-backupMoney(b.paid),b.mode||'']}),[16,14,26,55,18,16,16,18]);
 var dailyToday=S.bills.filter(function(x){return backupDateOf(x)==today()});
 add('Today Sales',backupRows(dailyToday,['Bill ID','Date','Customer','Items','Total','Collected','Due','Mode'],function(b){return [b.id,backupDateOf(b),custName(b.cust),(b.items||[]).map(function(i){return i.p+' × '+i.q}).join(' | '),backupMoney(b.total),backupMoney(b.paid),backupMoney(b.total)-backupMoney(b.paid),b.mode||'']}),[16,14,25,50,16,16,16,16]);
 add('All-Time Sales',backupRows(allSales,['Bill ID','Date','Customer','Items','Total','Collected','Due','Mode'],function(b){return [b.id,backupDateOf(b),custName(b.cust),(b.items||[]).map(function(i){return i.p+' × '+i.q}).join(' | '),backupMoney(b.total),backupMoney(b.paid),backupMoney(b.total)-backupMoney(b.paid),b.mode||'']}),[16,14,25,50,16,16,16,16]);
 add('All Bills Items',backupRows(bills.reduce(function(a,b){(b.items||[]).forEach(function(i){a.push({bill:b,item:i})});return a},[]),['Bill ID','Date','Customer','Product','Quantity','Rate','Case Size','Line Amount'],function(x){return [x.bill.id,backupDateOf(x.bill),custName(x.bill.cust),x.item.p,x.item.q,x.item.r,x.item.cs||'',(Number(x.item.q||0)/Number(x.item.cs||1))*Number(x.item.r||0)]}),[16,14,25,28,14,14,14,18]);
 add('Customers',backupRows(customers,['Customer ID','Name','Mobile','Address / Area','Created Date','Current Outstanding'],function(c){return [c.id,c.name,c.phone,c.area,backupDateOf(c),outstanding(c.id)]}),[16,26,16,34,14,22]);
 add('New Customers',backupRows(newCustomers,['Customer ID','Name','Mobile','Address / Area','Created Date'],function(c){return [c.id,c.name,c.phone,c.area,backupDateOf(c)]}),[16,26,16,34,14]);
 add('Payments',backupRows(payments,['Payment ID','Date','Customer','Amount','Mode','Bill ID'],function(x){return [x.id,backupDateOf(x),custName(x.cust),backupMoney(x.amount),x.mode||'',x.bill||'-']}),[16,14,26,16,18,16]);
 add('Purchases Stock In',backupRows(stock.filter(function(x){return x.type=='In'}),['Record ID','Date','Item','Quantity','Note'],function(x){return [x.id,backupDateOf(x),x.item,x.qty,x.note||'']}),[16,14,30,14,35]);
 add('Stock Out Delivery',backupRows(stock.filter(function(x){return x.type=='Out'}),['Record ID','Date','Item','Quantity','Note'],function(x){return [x.id,backupDateOf(x),x.item,x.qty,x.note||'']}),[16,14,30,14,35]);
 var levels=stockLevels();add('Current Stock',backupRows(Object.keys(levels).sort(),['Item','Current Balance'],function(k){return [k,levels[k]]}),[34,20]);
 add('Expenses',backupRows(expenses,['Expense ID','Date','Category','Description','Amount'],function(x){return [x.id,backupDateOf(x),x.cat,x.note||'',backupMoney(x.amount)]}),[16,14,20,40,18]);
 add('Employees',backupRows(S.employees,['Employee ID','Name','Role','Mobile','Monthly Salary','Address'],function(x){return [x.id,x.name,x.role,x.phone,backupMoney(x.salary),x.address||'']}),[16,26,18,16,20,35]);
 add('Attendance',backupRows(attendance,['Record ID','Date','Employee','Status','In Time','Out Time'],function(x){return [x.id,backupDateOf(x),empName(x.emp),x.status||'',x.tin||'',x.tout||'']}),[16,14,26,16,14,14]);
 add('Salary Advances',backupRows(advances,['Advance ID','Date','Employee','Amount','Note'],function(x){return [x.id,backupDateOf(x),empName(x.emp),backupMoney(x.amount),x.note||'']}),[16,14,26,18,36]);
 add('Vehicles',backupRows(S.vehicles,['Vehicle ID','Vehicle Number','Type','Model','Default Driver','Notes','Created At'],function(x){return [x.id,x.number,x.type,x.model||'',empName(x.driver),x.notes||'',x.createdAt||'']}),[16,20,18,20,25,35,24]);
 add('Vehicle Trips',backupRows(S.vehicleTrips,['Trip ID','Vehicle','Employee','Start Date/Time','Start KM','Fuel Type','Start Fuel %','End KM','End Fuel %','Supervisor','Condition','Damage / Notes','Handover At','Status'],function(x){var v=S.vehicles.filter(function(z){return z.id==x.vehicle})[0];return [x.id,v?v.number:x.vehicle,empName(x.employee),x.startAt||'',x.startReading||'',x.fuelType||'',x.fuelPercent||'',x.endReading||'',x.endFuel||'',x.supervisor||'',x.handoverCondition||'',x.damage||'',x.handoverAt||'',x.status||'']}),[16,20,25,24,14,16,15,14,15,22,22,35,24,16]);
 add('Cancelled Bills',backupRows((S.cancelledBills||[]).filter(function(x){return backupInRange(x,from,to)}),['Bill ID','Date','Customer','Total','Reason','Cancelled At'],function(x){return [x.id,backupDateOf(x),custName(x.cust),backupMoney(x.total),x.reason||'',x.cancelledAt||'']}),[16,14,26,16,35,24]);
 add('Deleted Bills',backupRows((S.deletedBills||[]).filter(function(x){return backupInRange(x,from,to)}),['Bill ID','Date','Customer','Total','Reason','Deleted At'],function(x){return [x.id,backupDateOf(x),custName(x.cust),backupMoney(x.total),x.reason||'',x.deletedAt||'']}),[16,14,26,16,35,24]);
 var filename='SR_Industries_Backup_'+label+'_'+datePart+'_'+timePart+'.xlsx';XLSX.writeFile(wb,filename,{compression:true});toast('Excel backup downloaded: '+filename);
}
/* ---------- router, auth & events ---------- */
var view=$('#view');
var LAST_ACTIVITY=Date.now();
function markActivity(){LAST_ACTIVITY=Date.now()}
['mousedown','keydown','touchstart','scroll','click'].forEach(function(ev){
 window.addEventListener(ev,markActivity,{passive:true});
});
setInterval(function(){
 if(!SESSION||!DATA_READY||isPublicHash())return;
 var timeoutMs=isOwner()?(10*60*1000):(30*60*1000);
 if(Date.now()-LAST_ACTIVITY>timeoutMs){
  signOutOwner('Logged out due to inactivity');
 }
},15000);

function hideAuthScreen(){document.body.classList.remove('auth-locked');var el=$('#auth-screen');if(el){el.hidden=true;el.innerHTML=''}}
function renderAuthScreen(mode,errMsg){
 document.body.classList.remove('public');
 document.body.classList.add('auth-locked');
 var el=$('#auth-screen');if(!el)return;
 el.hidden=false;
 var logo='<svg width="42" height="50" viewBox="0 0 44 52" aria-hidden="true"><path d="M22 2C22 2 4 22 4 34a18 18 0 0 0 36 0C40 22 22 2 22 2Z" fill="#1368e8"/><path d="M22 10C22 10 10 25 10 34a12 12 0 0 0 12 12c-6-3-9-8-9-13 0-6 5-14 9-23Z" fill="#4b92ff"/><path d="M8 36c8-6 16 4 28-2" stroke="#14b8c4" stroke-width="3" fill="none" stroke-linecap="round"/></svg>';
 if(mode=='loading'){
  el.innerHTML='<div class="auth-wrap"><div class="auth-card" style="text-align:center"><div class="auth-head" style="justify-content:center">'+logo+'<div style="text-align:left"><h1>SR Industries</h1><small>Water Plant BMS</small></div></div><p class="pdesc" style="margin:8px 0 0">Loading your business data from Supabase…</p></div></div>';
  return;
 }
 if(mode=='change-password'){
  var err=errMsg||'';
  el.innerHTML='<div class="auth-wrap"><div class="auth-card">'+
   '<div class="auth-head">'+logo+'<div><h1>SR Industries</h1><small>Change Temporary Password</small></div></div>'+
   '<p class="pdesc" style="margin:0 0 14px">You are signing in with a temporary password. Please set a new permanent password of at least 8 characters to continue.</p>'+
   '<form id="change-pw-form" style="display:grid;gap:14px">'+
   '<div class="fld"><label for="cp-new-pw">New Password</label><div class="auth-pw"><input id="cp-new-pw" name="new_password" type="password" autocomplete="new-password" required minlength="8" placeholder="Minimum 8 characters"><button type="button" class="auth-toggle-btn" data-target="cp-new-pw" aria-label="Show password">Show</button></div></div>'+
   '<div class="fld"><label for="cp-confirm-pw">Confirm New Password</label><div class="auth-pw"><input id="cp-confirm-pw" name="confirm_password" type="password" autocomplete="new-password" required minlength="8" placeholder="Confirm new password"><button type="button" class="auth-toggle-btn" data-target="cp-confirm-pw" aria-label="Show password">Show</button></div></div>'+
   '<button type="submit" class="btn" id="cp-submit" style="width:100%;height:46px">Change Password & Continue</button>'+
   '<button type="button" class="btn alt" id="cp-signout" style="width:100%;height:40px">Sign Out</button>'+
   '<div id="cp-err" class="auth-err"'+(err?'':' hidden')+'>'+esc(err)+'</div>'+
   '</form></div></div>';
  return;
 }
 var err=errMsg||BOOT_ERR||'';
 el.innerHTML='<div class="auth-wrap"><div class="auth-card"><div class="auth-head">'+logo+'<div><h1>SR Industries</h1><small>Sign-In · Water Plant BMS</small></div></div>'+
  '<form id="auth-form" style="display:grid;gap:14px">'+
  '<div class="fld"><label for="auth-email">Email Address</label><input id="auth-email" name="email" type="email" autocomplete="username" spellcheck="false" enterkeyhint="next" required placeholder="user@srindustries.com"></div>'+
  '<div class="fld"><label for="auth-password">Password</label><div class="auth-pw"><input id="auth-password" name="password" type="password" autocomplete="current-password" enterkeyhint="done" required placeholder="Enter password"><button type="button" id="auth-toggle-pw" class="auth-toggle-btn" data-target="auth-password" aria-label="Show password">Show</button></div></div>'+
  '<button type="submit" class="btn" id="auth-submit" style="width:100%;height:46px"'+(SB?'':' disabled')+'>Sign In</button>'+
  '<div id="auth-err" class="auth-err"'+(err?'':' hidden')+'>'+esc(err)+'</div>'+
  '</form></div></div>';
}
function signOutOwner(msg){
 CURRENT_PROFILE=null;
 CURRENT_ROLE=null;
 SESSION=null;
 DATA_READY=false;
 S=emptyState();
 DOC_URL_CACHE={};
 var so=$('#signout-btn');if(so)so.hidden=true;
 if(SB&&SB.auth)SB.auth.signOut({scope:'local'}).catch(function(){});
 if(!isPublicHash())renderAuthScreen('signin',msg||'');
 else if(msg)toast(msg);
}
function buildTabs(cur){
 var role=CURRENT_ROLE;
 var tabs=(role&&PERMS[role]&&PERMS[role].tabs)?PERMS[role].tabs:[['dashboard','Home','home']];
 $('#tabbar').innerHTML=tabs.map(function(t){return '<a href="#'+t[0]+'" class="'+(t[0]==cur?'on':'')+'">'+ic(t[2])+t[1]+'</a>'}).join('')+'<button type="button" id="tabmenu">'+ic('list')+'More</button>';
}
function render(){
 if((location.hash||'').indexOf('#join=')==0){hideAuthScreen();return renderJoin()}
 if((location.hash||'').indexOf('#bill=')==0){hideAuthScreen();return renderPublic()}
 if((location.hash||'').indexOf('#doc=')==0){hideAuthScreen();return renderDoc()}
 if((location.hash||'').indexOf('#me=')==0){hideAuthScreen();return renderPortal()}
 document.body.classList.remove('public');
 if(!SESSION){renderAuthScreen('signin',BOOT_ERR);return}
 var uMeta=(SESSION&&SESSION.user&&SESSION.user.user_metadata)||{};
 if(uMeta.must_change_password===true){renderAuthScreen('change-password');return}
 if(!DATA_READY){renderAuthScreen('loading');return}
 hideAuthScreen();
 var id=(location.hash||'#dashboard').slice(1);
 if(!canPage(id)){
  id=firstAllowedPage();
  if(location.hash!=='#'+id){
   location.hash='#'+id;
   return;
  }
 }
 if(!PAGES[id])id=firstAllowedPage();
 if(id!='new-bill')EDITID=null;if(id!='customers')CV=null;
 if(id=='backup')BACKUP_MODE='daily';
 buildNav(id);buildTabs(id);closeMenu();document.body.classList.remove('searching');
 var pt=$('#ptitle');if(pt)pt.textContent=TITLES[id]||'';
 view.innerHTML=PAGES[id]();view.scrollTop=0;
 if(id=='new-bill')billInit();
 var nb=S.stock&&Object.keys(stockLevels()).filter(function(k){return stockLevels()[k]<=S.settings.low*.6}).length;
 $('#nbadge').textContent=nb||'';$('#nbadge').hidden=!nb;
 document.title='SR Industries BMS';$('#brandname').textContent=S.settings.name;
 var un=$('#user-name'),ua=$('#user-avatar'),ur=$('#user-role'),so=$('#signout-btn');
 var name=(CURRENT_PROFILE&&CURRENT_PROFILE.full_name)||S.settings.owner||'User';
 var roleLabel=(CURRENT_ROLE||'').replace(/_/g,' ');
 if(roleLabel)roleLabel=roleLabel.charAt(0).toUpperCase()+roleLabel.slice(1);
 if(un)un.textContent=name;
 if(ur)ur.textContent=roleLabel||'';
 if(ua)ua.textContent=name.trim().charAt(0).toUpperCase()||'U';
 if(so)so.hidden=false;
}

function showAddUserModal(){
 var roles=['owner','manager','accountant','billing_staff','driver'];
 var roleOpts=roles.map(function(r){return '<option value="'+r+'">'+r+'</option>'}).join('');
 var html='<div class="bill-modal-title"><span class="mark">+</span><div><h3 style="margin:0;text-align:left">Add New User</h3><small class="muted">Creates user login credentials and profile</small></div></div>'+
  '<form id="add-user-form" class="form" style="grid-template-columns:1fr;gap:12px;margin-top:14px">'+
  '<div class="fld"><label for="new-usr-email">Email Address</label><input id="new-usr-email" name="email" type="email" required placeholder="user@srindustries.com"></div>'+
  '<div class="fld"><label for="new-usr-name">Full Name</label><input id="new-usr-name" name="full_name" required maxlength="80" placeholder="e.g. Ramesh Kumar"></div>'+
  '<div class="fld"><label for="new-usr-role">Role</label><select id="new-usr-role" name="role">'+roleOpts+'</select></div>'+
  '<div class="fld"><label for="new-usr-empid">Employee ID (Optional)</label><input id="new-usr-empid" name="employee_id" placeholder="e.g. M1, M2 (leave blank if none)"></div>'+
  '<div class="note warn">A random temporary password will be generated and shown once. The user must change it upon their first login.</div>'+
  '<div class="dact"><button type="button" class="btn alt" data-nb="close">Cancel</button><button type="submit" class="btn" id="add-user-submit">Create User</button></div>'+
  '</form>';
 openModal(html);
}

function showTempPasswordModal(title,msg,tempPassword){
 var html='<div class="bill-modal-title"><span class="mark" style="background:#ecfdf5;color:#059669">✓</span><div><h3 style="margin:0;text-align:left">'+title+'</h3><small class="muted">Share these temporary credentials with the user</small></div></div>'+
  '<p style="text-align:left;margin:12px 0">'+msg+'</p>'+
  '<div class="card" style="background:var(--bg);border:1.5px dashed var(--line);padding:14px;text-align:center;margin:14px 0">'+
  '<small class="muted" style="display:block;margin-bottom:6px">Temporary Password (shown only once)</small>'+
  '<code id="temp-pw-display" style="font-size:20px;font-weight:800;letter-spacing:1px;color:var(--brand);user-select:all">'+esc(tempPassword)+'</code>'+
  '</div>'+
  '<div class="dact" style="justify-content:space-between">'+
  '<button type="button" class="btn alt" id="copy-pw-btn" data-pw="'+esc(tempPassword)+'">Copy Password</button>'+
  '<button type="button" class="btn" id="temp-pw-done" data-nb="close">Done</button>'+
  '</div>';
 openModal(html);
}

document.addEventListener('submit',function(e){
 var f=e.target;e.preventDefault();
 if(f.id=='auth-form'){
  if(!SB){var er0=$('#auth-err');if(er0){er0.textContent=BOOT_ERR||'Supabase is not configured.';er0.hidden=false}return}
  var em=($('#auth-email')||{}).value.trim(),pw=($('#auth-password')||{}).value||'',btn=$('#auth-submit'),er=$('#auth-err');
  if(er){er.hidden=true;er.textContent=''}
  if(!em||!pw)return;
  if(btn){btn.disabled=true;btn.textContent='Signing in…'}
  SB.auth.signInWithPassword({email:em,password:pw}).then(function(res){
   if(res.error){
    if(btn){btn.disabled=false;btn.textContent='Sign In'}
    if(er){er.textContent='Invalid email or password';er.hidden=false}
    return;
   }
   SESSION=res.data.session;
   var uMeta=(SESSION&&SESSION.user&&SESSION.user.user_metadata)||{};
   if(uMeta.must_change_password===true){
    renderAuthScreen('change-password');
    return;
   }
   DATA_READY=false;renderAuthScreen('loading');
   return loadAllFromSupabase().then(function(){render()}).catch(function(err){
    var msg=(err&&err.message)||'';
    if(msg=='Account not active'){
     signOutOwner('Account not active');
    }else{
     SESSION=null;DATA_READY=false;CURRENT_PROFILE=null;CURRENT_ROLE=null;
     renderAuthScreen('signin',msg||'Signed in, but failed to load data');
    }
   });
  }).catch(function(){
   if(btn){btn.disabled=false;btn.textContent='Sign In'}
   if(er){er.textContent='Invalid email or password';er.hidden=false}
  });
  return;
 }
 if(f.id=='change-pw-form'){
  var npw=($('#cp-new-pw')||{}).value||'',cpw=($('#cp-confirm-pw')||{}).value||'',btn=$('#cp-submit'),er=$('#cp-err');
  if(er){er.hidden=true;er.textContent=''}
  if(npw.length<8){
   if(er){er.textContent='Password must be at least 8 characters long';er.hidden=false}
   return;
  }
  if(npw!==cpw){
   if(er){er.textContent='Passwords do not match';er.hidden=false}
   return;
  }
  if(btn){btn.disabled=true;btn.textContent='Saving password…'}
  SB.auth.updateUser({password:npw}).then(function(res){
   if(res.error){
    if(btn){btn.disabled=false;btn.textContent='Change Password & Continue'}
    if(er){er.textContent=res.error.message||'Could not update password';er.hidden=false}
    return;
   }
   return sbApi('/api/me/password-changed','POST',{}).then(function(){
    if(SESSION&&SESSION.user&&SESSION.user.user_metadata){
     SESSION.user.user_metadata.must_change_password=false;
    }
    DATA_READY=false;
    renderAuthScreen('loading');
    return loadAllFromSupabase().then(function(){
     render();
     toast('Password changed successfully');
    });
   });
  }).catch(function(err){
   if(btn){btn.disabled=false;btn.textContent='Change Password & Continue'}
   if(er){er.textContent=(err&&err.message)||'Failed to update password';er.hidden=false}
  });
  return;
 }
 if(f.id=='add-user-form'){
  var uem=(f.elements.email.value||'').trim();
  var unm=(f.elements.full_name.value||'').trim();
  var url=(f.elements.role.value||'').trim();
  var ueid=(f.elements.employee_id.value||'').trim()||null;
  var sBtn=$('#add-user-submit');
  if(sBtn){sBtn.disabled=true;sBtn.textContent='Creating user…'}
  sbApi('/api/users','POST',{email:uem,full_name:unm,role:url,employee_id:ueid}).then(function(res){
   closeModal();
   USERS_LIST=null;
   showTempPasswordModal('User Created Successfully','User <b>'+esc(unm)+'</b> ('+esc(uem)+') has been created with role <b>'+esc(url)+'</b>.',res.temporary_password);
  }).catch(function(err){
   if(sBtn){sBtn.disabled=false;sBtn.textContent='Create User'}
   toast(err.message||'Failed to create user');
  });
  return;
 }
 if(f.id=='employee-edit-form'){
  var id=f.dataset.id,emp=S.employees.filter(function(x){return x.id==id})[0];if(!emp)return;
  var fd=new FormData(f),v={};fd.forEach(function(val,key){v[key]=String(val).trim()});
  var phone=digits(v.phone),salary=Number(v.salary),aad=v.aadhaar?v.aadhaar.replace(/\D/g,''):'';
  if(v.name.length<2||phone.length!=10||!(/^[6-9]\d{9}$/.test(phone))||!(salary>=0)||!Number.isFinite(salary))return toast('Please check name, 10-digit mobile number and salary');
  if(S.employees.some(function(x){return x.id!=id&&digits(x.phone)==phone}))return toast('This mobile number is already used by another employee');
  if(isOwner()){
   if(aad&&aad.length!=12&&!aad.startsWith('XXXX'))return toast('Aadhaar number must contain 12 digits');
   var pan=v.pan?v.pan.toUpperCase():'';if(pan&&!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(pan)&&pan.indexOf('*')<0)return toast('Enter a valid PAN number');
   var lic=v.licenseNo?v.licenseNo.toUpperCase():'';if(lic&&!drivingLicenseOk(lic)&&lic.indexOf('XXXX')<0)return toast('Please check the Driving Licence number');
   if(v.aadhaar!==undefined)emp.aadhaar=aad?maskA(aad):'';
   if(v.pan!==undefined)emp.pan=pan?maskPan(pan):'';
   if(v.licenseNo!==undefined)emp.licenseNo=lic?maskLicense(lic):'';
  }
  emp.name=v.name;emp.role=v.role;emp.phone=phone;emp.salary=salary;emp.address=v.address||'';
  save();
  sbUpsertRow('employees',sbEmployeeRow(emp));
  if(isOwner())sbUpsertIdentity(emp);
  toast('Employee details updated');showProfile(id);return;
 }
 var k=f.id.replace('FORM-','');if(!FORMS[k])return;
 var v={};new FormData(f).forEach(function(val,key){v[key]=val});
 var msg=FORMS[k](v);save();toast(msg);render();
});
document.addEventListener('click',function(e){
 var pwt=e.target.closest('#auth-toggle-pw,.auth-toggle-btn');
 if(pwt){
  var targetId=pwt.dataset.target||'auth-password';
  var pw=$('#'+targetId);
  if(pw){
   var show=pw.type=='password';
   pw.type=show?'text':'password';
   pwt.textContent=show?'Hide':'Show';
   pwt.setAttribute('aria-label',show?'Hide password':'Show password');
  }
  return;
 }
 if(e.target.id=='cp-signout'||e.target.closest('#cp-signout')){signOutOwner();return}
 if(e.target.id=='btn-refresh-audit'||e.target.closest('#btn-refresh-audit')){fetchAuditLogs();return}
  if(e.target.id=='btn-apply-audit-filters'||e.target.closest('#btn-apply-audit-filters')){
   AUDIT_FILTERS.from=($('#audit-filter-from')?$('#audit-filter-from').value:'').trim();
   AUDIT_FILTERS.to=($('#audit-filter-to')?$('#audit-filter-to').value:'').trim();
   AUDIT_FILTERS.table=($('#audit-filter-table')?$('#audit-filter-table').value:'').trim();
   AUDIT_FILTERS.user=($('#audit-filter-user')?$('#audit-filter-user').value:'').trim();
   AUDIT_FILTERS.action=($('#audit-filter-action')?$('#audit-filter-action').value:'').trim();
   fetchAuditLogs();
   return;
  }
  if(e.target.id=='btn-reset-audit-filters'||e.target.closest('#btn-reset-audit-filters')){
   AUDIT_FILTERS={from:'',to:'',user:'',table:'',action:''};
   if($('#audit-filter-from'))$('#audit-filter-from').value='';
   if($('#audit-filter-to'))$('#audit-filter-to').value='';
   if($('#audit-filter-table'))$('#audit-filter-table').value='';
   if($('#audit-filter-user'))$('#audit-filter-user').value='';
   if($('#audit-filter-action'))$('#audit-filter-action').value='';
   fetchAuditLogs();
   return;
  }
  var viewAuditBtn=e.target.closest('[data-audit-view]');
  if(viewAuditBtn){
   showAuditDetailModal(viewAuditBtn.dataset.auditView);
   return;
  }
  if(e.target.id=='open-add-user-modal'||e.target.closest('#open-add-user-modal')){showAddUserModal();return}
 var cpBtn=e.target.closest('#copy-pw-btn');
 if(cpBtn){copyTxt(cpBtn.dataset.pw);toast('Temporary password copied to clipboard');return}
 if(e.target.id=='temp-pw-done'||e.target.closest('#temp-pw-done')){closeModal();return}

 var actBtn=e.target.closest('[data-usr-action="toggle-active"]');
 if(actBtn){
  var uid=actBtn.dataset.id;
  var curAct=actBtn.dataset.active==='1';
  var nxtAct=!curAct;
  if(!confirm('Are you sure you want to '+(nxtAct?'activate':'deactivate')+' this user?'+(curAct?' They will be signed out and banned from accessing the system.':''))){
   return;
  }
  actBtn.disabled=true;
  sbApi('/api/users/'+uid,'PATCH',{active:nxtAct}).then(function(){
   toast('User '+(nxtAct?'activated':'deactivated'));
   if(USERS_LIST){
    var u=USERS_LIST.filter(function(x){return x.user_id===uid})[0];
    if(u)u.active=nxtAct;
   }
   render();
  }).catch(function(err){
   actBtn.disabled=false;
   toast(err.message||'Failed to update user status');
  });
  return;
 }

 var rstBtn=e.target.closest('[data-usr-action="reset-pw"]');
 if(rstBtn){
  var uid=rstBtn.dataset.id;
  var unm=rstBtn.dataset.name||'this user';
  if(!confirm('Reset password for '+unm+'? A new temporary password will be generated.')){
   return;
  }
  rstBtn.disabled=true;
  sbApi('/api/users/'+uid+'/reset-password','POST').then(function(res){
   rstBtn.disabled=false;
   showTempPasswordModal('Password Reset Successfully','Password has been reset for <b>'+esc(unm)+'</b>. The user will be required to change this password on next login.',res.temporary_password);
  }).catch(function(err){
   rstBtn.disabled=false;
   toast(err.message||'Failed to reset password');
  });
  return;
 }

 var t=e.target.closest('#signout-btn,#settings-signout,#stog,#tabmenu,.grp,[data-del],[data-go],[data-bkmode],#backup-download,#burger,#scrim,#theme,#addline,.nav a');if(!t)return;
 if(t.id=='signout-btn'||t.id=='settings-signout'){signOutOwner();return}
 if(t.dataset.bkmode){BACKUP_MODE=t.dataset.bkmode;view.querySelectorAll('[data-bkmode]').forEach(function(b){b.classList.toggle('active',b.dataset.bkmode==BACKUP_MODE)});$('#bk-date-wrap').hidden=BACKUP_MODE!='daily';$('#bk-from-wrap').hidden=BACKUP_MODE!='range';$('#bk-to-wrap').hidden=BACKUP_MODE!='range';$('#bk-period-note').textContent=BACKUP_MODE=='daily'?'Daily backup includes records dated on the selected day. The workbook also includes an All-Time Sales summary for comparison.':BACKUP_MODE=='range'?'Custom backup includes records dated from the selected start date through the selected end date. The workbook also includes an All-Time Sales summary.':'All-Time backup includes every available record loaded from Supabase.';return}
 if(t.id=='backup-download'){backupExport();return}
 if(t.id=='stog'){document.body.classList.toggle('searching');if(document.body.classList.contains('searching'))$('#q').focus()}
 else if(t.id=='tabmenu'){$('#side').classList.add('open');$('#scrim').classList.add('open')}
 else if(t.classList.contains('grp')){var g=t.dataset.grp,o=!NAVOPEN[g];NAVOPEN[g]=o;t.setAttribute('aria-expanded',o);t.nextElementSibling.hidden=!o}
 else if(t.dataset.del){
  var p=t.dataset.del.split(':'),coll=p[0],id=p.slice(1).join(':');
  if(!confirmTap(t))return;
  var tblMap={stock:'stock_movements',expenses:'expenses',employees:'employees',attendance:'attendance',advances:'advances'};
  if(S[coll])S[coll]=S[coll].filter(function(x){return x.id!=id});
  save();if(tblMap[coll])sbDeleteRow(tblMap[coll],id);
  toast('Deleted');render();
 }
 else if(t.dataset.go)location.hash='#'+t.dataset.go;
 else if(t.id=='burger'){$('#side').classList.add('open');$('#scrim').classList.add('open')}
 else if(t.id=='scrim')closeMenu();
 else if(t.id=='addline')addLine();
 else if(t.id=='theme'){var d=document.documentElement,dark=d.dataset.theme=='dark'||(!d.dataset.theme&&matchMedia('(prefers-color-scheme:dark)').matches);d.dataset.theme=dark?'light':'dark'}
 else if(t.matches('.nav a'))closeMenu();
});
document.addEventListener('input',function(e){
 var t=e.target;
 if(t.id=='q'){var q=t.value.toLowerCase();view.querySelectorAll('tbody tr').forEach(function(r){r.hidden=q&&r.textContent.toLowerCase().indexOf(q)<0})}
});
document.addEventListener('change',function(e){
 var sel=e.target.closest('.usr-role-sel');
 if(sel){
  var uid=sel.dataset.id;
  var newRole=sel.value;
  sel.disabled=true;
  sbApi('/api/users/'+uid,'PATCH',{role:newRole}).then(function(){
   toast('Role updated to '+newRole);
   sel.disabled=false;
   if(USERS_LIST){
    var u=USERS_LIST.filter(function(x){return x.user_id===uid})[0];
    if(u)u.role=newRole;
   }
   render();
  }).catch(function(err){
   sel.disabled=false;
   toast(err.message||'Failed to change role');
   USERS_LIST=null;
   render();
  });
 }
});
document.addEventListener('keydown',function(e){if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()=='k'){e.preventDefault();$('#q').focus()}});
window.addEventListener('hashchange',render);

function bootApp(){
 if(isPublicHash())render();
 else renderAuthScreen('loading');
 fetch('/api/config',{cache:'no-store'}).then(function(r){
  if(!r.ok)throw new Error(r.status==503?'Server environment variables SUPABASE_URL and SUPABASE_ANON_KEY are not configured in Cloudflare Pages.':'Could not load /api/config ('+r.status+')');
  return r.json();
 }).then(function(cfg){
  if(!cfg||!cfg.url||!cfg.anonKey)throw new Error('Invalid Supabase configuration returned by /api/config');
  if(!window.supabase||!window.supabase.createClient)throw new Error('Supabase JS client library failed to load. Check internet connection and reload.');
  SB_CFG=cfg;
  SB=window.supabase.createClient(cfg.url,cfg.anonKey);
  SB.auth.onAuthStateChange(function(ev,sess){
   SESSION=sess||null;
   if(ev=='SIGNED_OUT'){CURRENT_PROFILE=null;CURRENT_ROLE=null;DATA_READY=false;S=emptyState();var so=$('#signout-btn');if(so)so.hidden=true;if(!isPublicHash())renderAuthScreen('signin')}
  });
  return SB.auth.getSession().then(function(res){
   SESSION=(res&&res.data&&res.data.session)||null;
   if(SESSION){
    var uMeta=(SESSION.user&&SESSION.user.user_metadata)||{};
    if(uMeta.must_change_password===true){
     if(!isPublicHash())renderAuthScreen('change-password');
     return;
    }
    return loadAllFromSupabase().then(function(){if(!isPublicHash())render()}).catch(function(err){
     var msg=(err&&err.message)||'';
     if(msg=='Account not active'){
      signOutOwner('Account not active');
     }else{
      SESSION=null;DATA_READY=false;CURRENT_PROFILE=null;CURRENT_ROLE=null;
      if(!isPublicHash())renderAuthScreen('signin',msg);
     }
    });
   }else{
    if(!isPublicHash())renderAuthScreen('signin');
   }
  });
 }).catch(function(err){
  BOOT_ERR=(err&&err.message)||'Could not connect to Supabase.';
  if(!isPublicHash())renderAuthScreen('signin',BOOT_ERR);
 });
}
bootApp();
})();
