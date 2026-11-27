
(function(){
'use strict';
var $=function(s,r){return (r||document).querySelector(s)};
var esc=function(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})};
var inr=function(n){return '₹'+Math.round(n).toLocaleString('en-IN')};
var num=function(n){return Number(n||0).toLocaleString('en-IN')};
var ymd=function(d){var p=function(n){return (n<10?'0':'')+n};return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate())};
var today=function(){return ymd(new Date())};
function defProducts(){return [{n:'300 ml',c:30,r:120},{n:'500 ml',c:24,r:120},{n:'500 ml',c:20,r:100},{n:'1 L',c:12,r:108},{n:'2 L',c:9,r:135},{n:'20 L Can',c:1,r:0}]}
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
I.download='<path d="M12 3v12M7 10l5 5 5-5M4 21h16"/>';I.factory='<path d="M3 21V10l6 4v-4l6 4V6h4v15z"/><path d="M7 18h2M12 18h2M17 18h2"/>';I.truck='<path d="M2 6h12v10H2zM14 10h4l3 3v3h-7"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/>';
var ic=function(n,extra){return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" '+(extra||'')+'>'+I[n]+'</svg>'};

/* ---------- data ---------- */
var KEY='aquaflow-bms-v1';
/* ---------- Cafe Module Storage Isolation (FROZEN) ---------- */
var KEY_CAFE = 'larven-cafe-v1';
var CAFE_DATA = null;
function initCafeStorage() {
  try {
    CAFE_DATA = JSON.parse(localStorage.getItem(KEY_CAFE) || 'null');
  } catch(e) { CAFE_DATA = null; }
  if (!CAFE_DATA) {
    CAFE_DATA = {
      cafeSales: (S && S.cafeSales) || [],
      cafePurchases: (S && S.cafePurchases) || [],
      cafeStockMoves: (S && S.cafeStockMoves) || [],
      cafeExpenses: (S && S.cafeExpenses) || [],
      cafeEmployees: (S && S.cafeEmployees) || []
    };
  }
  // Bind S cafe fields to CAFE_DATA for zero-change compatibility with frozen cafe code
  S.cafeSales = CAFE_DATA.cafeSales;
  S.cafePurchases = CAFE_DATA.cafePurchases;
  S.cafeStockMoves = CAFE_DATA.cafeStockMoves;
  S.cafeExpenses = CAFE_DATA.cafeExpenses;
  S.cafeEmployees = CAFE_DATA.cafeEmployees;
}
function saveCafe() {
  if (!CAFE_DATA) return;
  CAFE_DATA.cafeSales = S.cafeSales;
  CAFE_DATA.cafePurchases = S.cafePurchases;
  CAFE_DATA.cafeStockMoves = S.cafeStockMoves;
  CAFE_DATA.cafeExpenses = S.cafeExpenses;
  CAFE_DATA.cafeEmployees = S.cafeEmployees;
  try {
    localStorage.setItem(KEY_CAFE, JSON.stringify(CAFE_DATA));
  } catch(e) {}
}

/* ---------- Roles, Permissions & Hierarchy ---------- */
var SYSTEM_ROLES = ['admin', 'owner', 'manager', 'employee'];
var DUTY_TAGS = ['delivery', 'production', 'godown'];
var CURRENT_ROLE = 'owner';
var CURRENT_PROFILE = { id: 'owner-1', full_name: 'Muni Prasad', role: 'owner', employee_id: null };

function setCurrentRole(r) {
  CURRENT_ROLE = r;
}
function getCurrentRole() {
  return CURRENT_ROLE;
}
function setCurrentProfile(p) {
  CURRENT_PROFILE = p;
}
function getCurrentProfile() {
  return CURRENT_PROFILE;
}
try {
  Object.defineProperty(window, 'CURRENT_ROLE', {
    get: function() { return CURRENT_ROLE; },
    set: function(r) { CURRENT_ROLE = r; },
    configurable: true
  });
  Object.defineProperty(window, 'CURRENT_PROFILE', {
    get: function() { return CURRENT_PROFILE; },
    set: function(p) { CURRENT_PROFILE = p; },
    configurable: true
  });
} catch(e) {}

function roleRank(r) {
  if (r === 'admin') return 4;
  if (r === 'owner') return 3;
  if (r === 'manager') return 2;
  if (r === 'employee') return 1;
  return 0;
}
function isAdmin() { return CURRENT_ROLE === 'admin'; }
function isOwner() { return CURRENT_ROLE === 'owner'; }
function isManager() { return CURRENT_ROLE === 'manager'; }
function isStaff() { return CURRENT_ROLE === 'owner' || CURRENT_ROLE === 'manager'; }
function isEmployee() { return CURRENT_ROLE === 'employee'; }

function canCreateRole(targetRole) {
  if (isAdmin()) return true;
  if (isOwner()) return targetRole === 'manager' || targetRole === 'employee';
  if (isManager()) return targetRole === 'employee';
  return false;
}
function canManageUser(targetRole) {
  if (isAdmin()) return true;
  return roleRank(CURRENT_ROLE) > roleRank(targetRole);
}
function canDeactivateUser(targetUser, allUsers) {
  var role = typeof targetUser === 'string' ? targetUser : (targetUser && targetUser.role);
  var id = typeof targetUser === 'string' ? null : (targetUser && targetUser.id);
  // Decisions block: Owner has explicit authority to deactivate admin accounts ("who has admin access" list)
  if (isOwner() && role === 'admin') {
    return true;
  }
  if (!canManageUser(role)) return false;
  if (role === 'owner') {
    var activeOwners = (allUsers || []).filter(function(u) {
      return u.role === 'owner' && u.active && (!id || u.id !== id);
    });
    if (activeOwners.length < 1) return false;
  }
  return true;
}

/* ---------- Driver Scoped Customer Visibility ---------- */
function visibleCustomers() {
  if (CURRENT_ROLE !== 'employee') return S.customers;
  var myEmpId = (CURRENT_PROFILE && CURRENT_PROFILE.employee_id) || '';
  var openTrips = (S.vehicleTrips || []).filter(function(t) {
    return (!myEmpId || t.employee === myEmpId) && !t.handoverAt;
  });
  var allowed = {};
  openTrips.forEach(function(t) {
    if (Array.isArray(t.customers)) t.customers.forEach(function(id) { allowed[id] = true; });
    (S.fg || []).forEach(function(r) {
      if (r.trip === t.id && r.cust) allowed[r.cust] = true;
    });
  });
  return S.customers.filter(function(c) { return allowed[c.id]; });
}

/* ---------- Driver Offline Delivery Outbox ---------- */
var OUTBOX_KEY = 'larven_dispatch_outbox';
function getOutbox() {
  try { return JSON.parse(localStorage.getItem(OUTBOX_KEY) || '[]'); }
  catch(e) { return []; }
}
function saveOutbox(list) {
  try { localStorage.setItem(OUTBOX_KEY, JSON.stringify(list)); }
  catch(e) {}
}
function queueOfflineDelivery(tripId, data) {
  var provId = 'PROV-' + (tripId || 'DEL') + '-' + Math.random().toString(36).substring(2, 7).toUpperCase();
  var item = { provisional_id: provId, trip_id: tripId, created_at: new Date().toISOString(), data: data };
  var outbox = getOutbox();
  outbox.push(item);
  saveOutbox(outbox);
  if (typeof OutboxDB !== 'undefined' && OutboxDB.enqueue) {
    OutboxDB.enqueue({
      id: provId,
      idempotency_key: 'idem_' + provId,
      action: 'deliver_stop',
      endpoint: '/api/rpc/deliver_stop',
      trip_id: tripId,
      stop_id: (data && data.stop_id) || '',
      payload: data || {},
      provisional_receipt: provId,
      status: 'pending',
      created_at: new Date().toISOString(),
      attempts: 0,
      last_error: null
    });
  }
  return provId;
}

function bmsDef(){
 return {
  customers:[],bills:[],payments:[],stock:[],expenses:[],employees:[],attendance:[],advances:[],
  settings:{name:'Larven Enterprises',owner:'Muni prasad',phone:'',gst:'37BDGPS8418C2ZC',gv:1,address:'',products:defProducts(),pv:3,low:100}
 };
}
var S;
try{S=JSON.parse(localStorage.getItem(KEY)||'null')}catch(e){S=null}
if(!S||!S.bills)S=bmsDef();
initCafeStorage();
if(S.settings&&/aquaflow/i.test(S.settings.name))S.settings.name='Larven Enterprises';
 if(!Array.isArray(S.cafeSales))S.cafeSales=[];if(!Array.isArray(S.cafePurchases))S.cafePurchases=[];if(!Array.isArray(S.cafeStockMoves))S.cafeStockMoves=[];if(!Array.isArray(S.cafeExpenses))S.cafeExpenses=[];if(!Array.isArray(S.cafeEmployees))S.cafeEmployees=[];
 if(!Array.isArray(S.cafeStockMoves))S.cafeStockMoves=[];
if(S.settings&&/^SR Industries$/i.test(S.settings.name||''))S.settings.name='Larven Enterprises';
if(!Array.isArray(S.fg))S.fg=[];if(!Array.isArray(S.visits))S.visits=[];if(!Array.isArray(S.contacts))S.contacts=[];
if(S.settings&&!(S.settings.products||[]).some(function(p){return p.n=='20 L Can'}))(S.settings.products=S.settings.products||[]).push({n:'20 L Can',c:1,r:0});
if(S.settings&&S.settings.ssv!==1){var LN=S.settings.locNames||(S.settings.locNames={});if(!LN.G1||LN.G1=='Godown 1')LN.G1='Godown 1 (SS Point 1)';if(!LN.G2||LN.G2=='Godown 2')LN.G2='Godown 2 (SS Point 2)';S.settings.ssv=1}if(S.settings&&!S.settings.locNames)S.settings.locNames={P:'Plant',G1:'Godown 1 (SS Point 1)',G2:'Godown 2 (SS Point 2)'};
if(S.settings&&S.settings.fgUnit!='cases'){S.fg.forEach(function(r){var pc=fgPer(r.size);r.qty=Math.round((+r.qty||0)/pc*100)/100});S.settings.fgUnit='cases'}
 if(!Array.isArray(S.vehicles))S.vehicles=[];if(!Array.isArray(S.vehicleTrips))S.vehicleTrips=[];if(!S.settings.vehicleVideoMaxMB)S.settings.vehicleVideoMaxMB=25;
 if(!Array.isArray(S.trips))S.trips=[];if(!Array.isArray(S.tripStops))S.tripStops=[];if(!Array.isArray(S.orders))S.orders=[];if(!Array.isArray(S.deliveries))S.deliveries=[];if(!Array.isArray(S.cashHandovers))S.cashHandovers=[];
 (function initOperationsSeed(){
   if(!S.vehicles.length){
     S.vehicles=[
       {id:'V1',number:'AP 39 AB 1234',type:'Tata Ace',driver:'M1',capacity_cases:100},
       {id:'V2',number:'AP 39 CD 5678',type:'Bolero Maxi',driver:'M4',capacity_cases:120}
     ];
   }
   if(Array.isArray(S.customers)){
     var coords=[
       {id:'C1',lat:13.558312,lng:78.502145,acc:8.4,lim:5000},
       {id:'C2',lat:13.561200,lng:78.504300,acc:12.0,lim:3000},
       {id:'C3',lat:null,lng:null,acc:null,lim:2000},
       {id:'C4',lat:13.565100,lng:78.508200,acc:15.0,lim:2500},
       {id:'C5',lat:null,lng:null,acc:null,lim:null}
     ];
     coords.forEach(function(item){
       var c=S.customers.find(function(x){return x.id===item.id});
       if(c){
         if(c.lat===undefined)c.lat=item.lat;
         if(c.lng===undefined)c.lng=item.lng;
         if(c.accuracy_m===undefined)c.accuracy_m=item.acc;
         if(c.credit_limit===undefined)c.credit_limit=item.lim;
       }
     });
   }
   if(!S.orders.length){
     S.orders=[
       {id:'ORD-1',order_no:'ORD-26-001',customer_id:'C1',order_date:today(),requested_date:today(),status:'planned',source:'sales_visit',notes:'Morning restock delivery',items:[{product_name:'20 L Can',cases:10,bottles:10,unit_rate:40,total_amount:400}],total_amount:400,created_by:'Muni Prasad'},
       {id:'ORD-2',order_no:'ORD-26-002',customer_id:'C2',order_date:today(),requested_date:today(),status:'planned',source:'phone',notes:'Hotel dining supply',items:[{product_name:'1 L',cases:5,bottles:60,unit_rate:108,total_amount:540},{product_name:'20 L Can',cases:5,bottles:5,unit_rate:40,total_amount:200}],total_amount:740,created_by:'Muni Prasad'},
       {id:'ORD-3',order_no:'ORD-26-003',customer_id:'C3',order_date:today(),requested_date:today(),status:'new',source:'sales_visit',notes:'Market general store order',items:[{product_name:'500 ml',cases:8,bottles:192,unit_rate:120,total_amount:960}],total_amount:960,created_by:'Suresh (Driver)'},
       {id:'ORD-4',order_no:'ORD-26-004',customer_id:'C4',order_date:today(),requested_date:today(),status:'new',source:'stop',notes:'Daily sweet shop delivery',items:[{product_name:'20 L Can',cases:15,bottles:15,unit_rate:40,total_amount:600}],total_amount:600,created_by:'Suresh (Driver)'}
     ];
   }
   if(!S.trips.length){
     S.trips=[
       {id:'TR-101',trip_no:'TR-26-001',vehicle_id:'AP 39 AB 1234',driver_employee_id:'M1',trip_date:today(),status:'loading',start_odometer:45210,end_odometer:null,loaded_at:null,closed_at:null,load_items:[{product_name:'20 L Can',cases:35,bottles:35},{product_name:'1 L',cases:10,bottles:120},{product_name:'500 ml',cases:10,bottles:240}]}
     ];
   }
   if(!S.tripStops.length){
     S.tripStops=[
       {id:'TS-101-1',trip_id:'TR-101',stop_sequence:1,customer_id:'C1',order_id:'ORD-1',planned_cases:10,planned_bottles:10,items:[{product_name:'20 L Can',cases:10,bottles:10,rate:40}],status:'pending',arrived_at:null,arrival_lat:null,arrival_lng:null,distance_meters:null,completed_at:null,skip_reason:null},
       {id:'TS-101-2',trip_id:'TR-101',stop_sequence:2,customer_id:'C2',order_id:'ORD-2',planned_cases:10,planned_bottles:65,items:[{product_name:'1 L',cases:5,bottles:60,rate:108},{product_name:'20 L Can',cases:5,bottles:5,rate:40}],status:'pending',arrived_at:null,arrival_lat:null,arrival_lng:null,distance_meters:null,completed_at:null,skip_reason:null},
       {id:'TS-101-3',trip_id:'TR-101',stop_sequence:3,customer_id:'C3',order_id:null,planned_cases:5,planned_bottles:5,items:[{product_name:'20 L Can',cases:5,bottles:5,rate:40}],status:'pending',arrived_at:null,arrival_lat:null,arrival_lng:null,distance_meters:null,completed_at:null,skip_reason:null}
     ];
   }
 })();
 if(!Array.isArray(S.cancelledBills))S.cancelledBills=[];if(!Array.isArray(S.deletedBills))S.deletedBills=[];
if(S.settings&&S.settings.pv!==2){var oldp=S.settings.products||[],np=defProducts();np.forEach(function(p){var m=oldp.filter(function(o){return o.n==p.n})[0];if(m&&m.r)p.r=m.r});S.settings.products=np;S.settings.pv=2}
if(S.settings&&S.settings.address==null)S.settings.address='';
if(S.settings&&S.settings.upiId==null)S.settings.upiId='';if(S.settings&&S.settings.upiPayee==null)S.settings.upiPayee=S.settings.name||'Larven Enterprises';
if(!S.invites)S.invites=[];if(!S.applications)S.applications=[];
if(S.settings&&S.settings.pv!==3){(S.settings.products||[]).forEach(function(p){if(p.r<50)p.r=Math.round(p.r*p.c*100)/100});S.settings.pv=3}
if(S.settings&&S.settings.gv!==1){if(!S.settings.gst)S.settings.gst='37BDGPS8418C2ZC';S.settings.gv=1}
/* bill.paid is always calculated from the payment records, so Bills, Customers, Payments and Outstanding can never disagree */
function syncPaid(){var m={};S.payments.forEach(function(p){if(p.bill&&p.bill!='-')m[p.bill]=(m[p.bill]||0)+p.amount});S.bills.forEach(function(b){b.paid=Math.round((m[b.id]||0)*100)/100})}
function heal(){var bid={},cid={},m={};S.bills.forEach(function(b){bid[b.id]=1});(S.cancelledBills||[]).forEach(function(b){bid[b.id]=1});(S.deletedBills||[]).forEach(function(b){bid[b.id]=1});S.customers.forEach(function(c){cid[c.id]=1});
 S.payments.forEach(function(p){if(p.bill&&p.bill!='-')m[p.bill]=(m[p.bill]||0)+p.amount});
 S.bills.forEach(function(b){var d=Math.round(((b.paid||0)-(m[b.id]||0))*100)/100;if(d>0)S.payments.push({id:nid('P',S.payments),date:b.date,cust:b.cust,amount:d,mode:b.mode||'Cash',bill:b.id})});
 S.payments=S.payments.filter(function(p){return p.bill=='-'?!!cid[p.cust]:!!bid[p.bill]});syncPaid()}
function save(){
  try{
    syncPaid();
    saveCafe();
    var bmsData = Object.assign({}, S);
    delete bmsData.cafeSales;
    delete bmsData.cafePurchases;
    delete bmsData.cafeStockMoves;
    delete bmsData.cafeExpenses;
    delete bmsData.cafeEmployees;
    delete bmsData.trips;
    delete bmsData.tripStops;
    localStorage.setItem(KEY, JSON.stringify(bmsData));
  }catch(e){toast('Could not save: browser storage is full')}}
function nid(p,a){return p+(a.length?Math.max.apply(null,a.map(function(x){return parseInt(String(x.id).replace(/\D/g,''))||0}))+1:1)}
function custName(id){var c=S.customers.filter(function(x){return x.id==id})[0];return c?c.name:'Walk-in'}
function empName(id){var c=(S.employees||[]).filter(function(x){return x.id==id})[0];if(c)return c.name;if(typeof CURRENT_PROFILE!=='undefined'&&CURRENT_PROFILE&&(CURRENT_PROFILE.employee_id===id||CURRENT_PROFILE.id===id))return CURRENT_PROFILE.full_name;return '-'}
function cafeActorName(){var el=document.querySelector('.user b');return (el&&el.textContent.trim())||(S.settings&&S.settings.owner)||'Unknown User'}
function cafeItemNames(){var a=['Tea','Coffee','Milk','Boost','Horlicks','Lemon Tea','Irani Tea','Honey Tea','Ginger Tea','Green Tea','Badam Milk','Hot Milk','Cold Coffee','Other'];(S.cafePurchases||[]).forEach(function(x){if(x.item&&a.indexOf(x.item)<0)a.push(x.item)});(S.cafeStockMoves||[]).forEach(function(x){if(x.item&&a.indexOf(x.item)<0)a.push(x.item)});return a}

function toast(m,undo){var t=$('#toast');t.textContent=m;toast.u=null;if(undo){var b=document.createElement('button');b.type='button';b.id='tundo';b.className='tundo';b.textContent='Undo';t.appendChild(b);toast.u=undo}t.hidden=false;clearTimeout(toast.t);toast.t=setTimeout(function(){t.hidden=true;toast.u=null},undo?9000:2200)}
function outstanding(id){return S.bills.filter(function(b){return !id||b.cust==id}).reduce(function(a,b){return a+b.total-b.paid},0)}
function stockLevels(){var m={};S.stock.forEach(function(r){m[r.item]=(m[r.item]||0)+(r.type=='In'?r.qty:-r.qty)});return m}
 function cafeItemKey(v){return String(v||'').trim().toLocaleLowerCase().replace(/\s+/g,' ')}
 function cafeStockLevels(){var m={};(S.cafeStockMoves||[]).forEach(function(r){var key=cafeItemKey(r.item);if(!key)return;var x=m[key]||(m[key]={name:String(r.item||'').trim(),qty:0,ins:0,outs:0,unit:r.unit||'',min:0});if(x.unit&&r.unit&&String(x.unit).toLowerCase()!=String(r.unit).toLowerCase())return;x.unit=r.unit||x.unit;if(r.type=='In'){x.qty+=+r.qty;x.ins+=+r.qty}else{x.qty-=+r.qty;x.outs+=+r.qty}});return m}
 function cafeProfit(from,to){var sales=sum(S.cafeSales.filter(function(x){return (!from||x.date>=from)&&(!to||x.date<=to)}),function(x){return +x.total||0}),purchases=sum(S.cafePurchases.filter(function(x){return (!from||x.date>=from)&&(!to||x.date<=to)}),function(x){return +x.amount||0}),expenses=sum((S.cafeExpenses||[]).filter(function(x){return (!from||x.date>=from)&&(!to||x.date<=to)}),function(x){return +x.amount||0});return {sales:sales,purchases:purchases,expenses:expenses,profit:sales-purchases-expenses}}
function sum(a,f){return a.reduce(function(x,y){return x+f(y)},0)}
heal();save();
window.__AF={S:function(){return S},save:save};
window.S=S;
/* ---------- navigation ---------- */
var NAV=[
 ['',[['dashboard','Dashboard','home']]],
 ['Billing',[['new-bill','New Bill','plus'],['bills','All Bills','doc'],['customers','Customers','users'],['payments','Payments','card'],['outstanding','Credit / Outstanding','clock'],['day-close','Day Close & Handover','wallet']]],
 ['Stock',[['my-route','My Delivery Route','truck'],['route-planner','Route Planner','truck'],['production-plan','Production Planning','factory'],['stock-overview','Plant Stock Overview','home'],['production','Production (Manufacturing)','factory'],['fg-transfer','Transfer to Godown','box'],['fg-dispatch','Dispatch to Customers','truck'],['fg-empload','Dispatch to Employees','truck'],['stock-in','Raw Material In (Purchase)','box'],['stock-out','Raw Material Used','box'],['current-stock','Raw Material Stock','hist'],['sales-visits','Salesman Visits & Orders','users']]],
 ['Expenses',[['diesel','Diesel Expenses','fuel'],['diesel-approvals','Diesel Approvals','doc'],['expenses','Other Expenses','list']]],
 ['Employees',[['employees','Employee Management','users'],['attendance','Attendance','cal'],['att-setup','Attendance Banners','cal'],['timings','In / Out Timings','clock'],['advances','Advances / Salary','wallet']]],
  ['',[['vehicles','Vehicle Management','box'],['contacts','Contacts Directory','users']]],
 ['Cafe',[['cafe-dashboard','Cafe Dashboard','home'],['cafe-employees','Cafe Employee Management','users'],['cafe-sales','Cafe Sales','doc'],['cafe-purchases','Cafe Purchases','box'],['cafe-expenses','Cafe Expenses','list'],['cafe-stock-in','Cafe Stock In','box'],['cafe-stock-out','Cafe Stock Out / Usage','box'],['cafe-current-stock','Cafe Current Stock','hist'],['cafe-reports','Cafe Reports','bars']]],
 ['Reports',[['backup','Backup & Restore','download'],['price-variance','Price Variance Report','bars']]],
 ['Settings',[['users','User Accounts & Roles','users'],['settings','Business Settings','gear']]]
];
var TITLES={'my-route':'My Delivery Route','route-planner':'Route Planner','production-plan':'Production Planning','day-close':'Day Close & Handover',customers:'Customers','emp-stock':'Delivery Staff Stock Report','godown-stock':'Godown Stock','stock-history':'Plant Stock Overview','price-variance':'Price Variance Report','users':'User Accounts & Roles'},NAVOPEN={},LASTCUR='';
function groupOf(id){for(var i=0;i<NAV.length;i++)for(var j=0;j<NAV[i][1].length;j++)if(NAV[i][1][j][0]==id)return NAV[i][0]||''}
function buildNav(cur){
 var g0=groupOf(cur);if(cur!=LASTCUR&&g0)NAVOPEN[g0]=true;LASTCUR=cur;
 var h='';NAV.forEach(function(g){
  var links=g[1].filter(function(i){
    if (i[0] == 'price-variance' && CURRENT_ROLE == 'employee') return false;
    if (i[0] == 'users' && CURRENT_ROLE == 'employee') return false;
    if ((i[0] == 'route-planner' || i[0] == 'production-plan') && CURRENT_ROLE == 'employee') return false;
    return true;
  }).map(function(i){TITLES[i[0]]=i[1];return '<a href="#'+i[0]+'" class="'+(i[0]==cur?'on':'')+'"'+(i[0]==cur?' aria-current="page"':'')+'>'+ic(i[2])+i[1]+'</a>'}).join('');
  if(g[0] == 'Cafe' && CURRENT_ROLE == 'employee') return;
  if(!g[0]){h+=links;return}
  var open=!!NAVOPEN[g[0]];
  h+='<button type="button" class="grp'+(g[0]==g0?' has':'')+'" data-grp="'+g[0]+'" aria-expanded="'+open+'">'+g[0]+ic('chev')+'</button><div class="sub"'+(open?'':' hidden')+'>'+links+'</div>'});
 $('#nav').innerHTML=h;
}
function closeMenu(){$('#side').classList.remove('open');$('#scrim').classList.remove('open')}

/* ---------- dashboard ---------- */
function ago(d){var n=Math.round((new Date(today())-new Date(d))/864e5);return n<=0?'Today':n+'d ago'}
function dayBills(d){return S.bills.filter(function(b){return b.date==d})}
function dayOff(n){var x=new Date();x.setDate(x.getDate()-n);return ymd(x)}
function pct(a,b){if(!b)return {t:'new',up:true};var p=Math.round((a-b)/b*100);return {t:(Math.abs(p)>999?'999+':Math.abs(p))+'%',up:p>=0}}
function arrow(p,suffix){return '<em style="color:'+(p.up?'var(--green)':'var(--red)')+'">'+(p.up?'↑':'↓')+' '+p.t+' '+suffix+'</em>'}
function heroArt(){var nm=esc(S.settings.name),sh=esc(S.settings.name.split(/\s+/).map(function(w){return w[0]||''}).join('').slice(0,3).toUpperCase());return '<svg class="art" viewBox="0 0 1200 240" preserveAspectRatio="xMaxYMid slice" aria-hidden="true">'+
 '<defs><linearGradient id="mt" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#cf9681"/><stop offset="1" stop-color="#eacdbd"/></linearGradient><linearGradient id="bt" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fae2d4"/><stop offset="1" stop-color="#e38a6a"/></linearGradient></defs>'+
 '<path d="M520 190 640 90l60 50 90-80 110 100 120-60 110 90v40H520z" fill="url(#mt)" opacity=".85"/>'+
 '<rect x="860" y="130" width="320" height="90" fill="#f7f2ef"/><rect x="860" y="118" width="320" height="16" fill="#e1d8d4"/><text x="1020" y="170" font-size="22" font-weight="800" fill="#c2502a" text-anchor="middle">'+nm+'</text><text x="1020" y="190" font-size="11" fill="#6e5b52" text-anchor="middle">WATER PLANT</text>'+
 '<rect x="40" y="226" width="1120" height="20" fill="#2f8f4a" opacity=".0"/>'+
 '<g transform="translate(560 100)"><rect x="0" y="30" width="210" height="82" rx="6" fill="#fff"/><rect x="170" y="48" width="70" height="64" rx="8" fill="#faf7f5"/><rect x="180" y="56" width="40" height="22" rx="3" fill="#e0a887"/><circle cx="40" cy="116" r="14" fill="#42342d"/><circle cx="190" cy="116" r="14" fill="#42342d"/><text x="95" y="76" font-size="18" font-weight="800" fill="#c2502a" text-anchor="middle">'+nm+'</text><path d="M95 38c-8 10-12 15-12 20a12 12 0 0 0 24 0c0-5-4-10-12-20z" fill="#d0622e" opacity=".0"/></g>'+
 '<g><rect x="900" y="196" width="22" height="28" rx="5" fill="url(#bt)"/><rect x="928" y="200" width="22" height="26" rx="5" fill="url(#bt)"/><rect x="956" y="196" width="22" height="28" rx="5" fill="url(#bt)"/><rect x="984" y="200" width="22" height="26" rx="5" fill="url(#bt)"/><rect x="1012" y="196" width="22" height="28" rx="5" fill="url(#bt)"/></g>'+
 '<g transform="translate(60 18)"><rect x="40" y="26" width="92" height="160" rx="30" fill="url(#bt)" stroke="#e8bca2"/><rect x="62" y="6" width="48" height="26" rx="8" fill="#e8bca2"/><rect x="48" y="96" width="76" height="46" rx="8" fill="#fff"/><text x="86" y="124" font-size="20" font-weight="800" fill="#c2502a" text-anchor="middle">'+sh+'</text></g>'+
 '<g transform="translate(190 80)"><rect x="40" y="26" width="64" height="110" rx="22" fill="url(#bt)" stroke="#e8bca2"/><rect x="56" y="10" width="32" height="20" rx="6" fill="#e8bca2"/><rect x="48" y="70" width="48" height="34" rx="6" fill="#fff"/><text x="72" y="92" font-size="15" font-weight="800" fill="#c2502a" text-anchor="middle">'+sh+'</text></g>'+
 '<path d="M0 232c120-18 220 16 360 0s240-20 360 0 240 14 480-6V240H0z" fill="#e38a6a" opacity=".55"/></svg>'}

var UP={'new-bill':1};
function dpanel(cl,icon,title,sub,tiles){return '<div class="dp '+cl+'"><div class="dp-h"><span class="dp-ic">'+ic(icon)+'</span><div><b>'+title+'</b><small>'+sub+'</small></div></div><div class="dp-b">'+tiles.map(function(x){return '<div class="dt"><span class="dti">'+ic(x[0])+'</span><div><small>'+x[1]+'</small><strong>'+x[2]+'</strong></div>'+x[3]+'</div>'}).join('')+'</div></div>'}
function dashboard(){
 var t=today(),y=dayOff(1);
 var ts=sum(dayBills(t),function(b){return b.total}),ys=sum(dayBills(y),function(b){return b.total});
 var tc=sum(dayBills(t),function(b){return b.paid}),yc=sum(dayBills(y),function(b){return b.paid});
 var out=outstanding(),yo=out-sum(dayBills(t),function(b){return b.total-b.paid});
 var mon=t.slice(0,7),newC=S.customers.filter(function(c){return (c.date||'').slice(0,7)==mon}).length;
 var days=[],lab=[];for(var i=6;i>=0;i--){var d=dayOff(i);days.push(d);lab.push(['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][new Date(d+'T00:00').getDay()])}
 var sales=days.map(function(d){return sum(dayBills(d),function(b){return b.total})}),col=days.map(function(d){return sum(dayBills(d),function(b){return b.paid})});
 var mx=Math.max.apply(null,sales.concat(col).concat([1])),top=Math.ceil(mx/5000)*5000||5000,ch='';
 for(var g=0;g<=4;g++){var yy=20+g*40;ch+='<line x1="52" x2="560" y1="'+yy+'" y2="'+yy+'" stroke="var(--line)"/><text x="44" y="'+(yy+4)+'" font-size="11" fill="var(--muted)" text-anchor="end">'+(g==4?'0':'₹'+((top/4*(4-g))/1000)+'K')+'</text>'}
 days.forEach(function(d,i){var x=70+i*70,h1=sales[i]/top*160,h2=col[i]/top*160;
  ch+='<rect x="'+x+'" y="'+(180-h1)+'" width="22" height="'+h1+'" rx="3" fill="#c2502a"><title>'+lab[i]+' sales '+inr(sales[i])+'</title></rect><rect x="'+(x+26)+'" y="'+(180-h2)+'" width="22" height="'+h2+'" rx="3" fill="#18a957"><title>'+lab[i]+' collections '+inr(col[i])+'</title></rect><text x="'+(x+24)+'" y="200" font-size="11" fill="var(--muted)" text-anchor="middle">'+lab[i]+'</text>'});
 var pc={};S.bills.filter(function(b){return (b.date||'').slice(0,7)==mon}).forEach(function(b){b.items.forEach(function(it){pc[it.p]=(pc[it.p]||0)+it.q})});
 var pn=Object.keys(pc).filter(function(k){return Number.isFinite(pc[k])&&pc[k]>0}),tot=sum(pn,function(k){return pc[k]})||1,cols=['#c2502a','#e4b768','#14b8c4','#f59e0b'],C=2*Math.PI*60,off=0,dn='';
 pn.forEach(function(k,i){var L=pc[k]/tot*C;dn+='<circle cx="85" cy="85" r="60" fill="none" stroke="'+cols[i%4]+'" stroke-width="22" stroke-dasharray="'+L+' '+(C-L)+'" stroke-dashoffset="'+(-off)+'" transform="rotate(-90 85 85)"/>';off+=L});
 var dl=pn.map(function(k,i){return '<div><i style="background:'+cols[i%4]+'"></i><span>'+esc(k)+' Bottles</span><b>'+Math.round(pc[k]).toLocaleString('en-IN')+' ('+Math.round(pc[k]/tot*100)+'%)</b></div>'}).join('');
 var ev=[];
 S.bills.slice(-1).forEach(function(b){ev.push(['doc','var(--brand-soft)','var(--brand)','New Bill #'+b.id,inr(b.total)+' - '+b.mode,ago(b.date)])});
 S.payments.slice(-1).forEach(function(p){ev.push(['rupee','var(--green-soft)','var(--green)','Payment Received',inr(p.amount)+' - '+p.mode,ago(p.date)])});
 S.stock.filter(function(r){return r.type=='Out'}).slice(-1).forEach(function(r){ev.push(['box','var(--amber-soft)','var(--amber)','Stock Out',r.item+' - '+r.qty,ago(r.date)])});
 S.expenses.slice(-1).forEach(function(r){ev.push(['fuel','var(--red-soft)','var(--red)',r.cat+' Expense Added',inr(r.amount),ago(r.date)])});
 S.customers.slice(-1).forEach(function(c){ev.push(['user','var(--brand-soft)','var(--brand)','New Customer Added',c.name,ago(c.date)])});
 var act=ev.map(function(e){return '<li><span class="dot" style="background:'+e[1]+';color:'+e[2]+'">'+ic(e[0])+'</span><div><b>'+esc(e[3])+'</b><small>'+esc(e[4])+'</small></div><time>'+e[5]+'</time></li>'}).join('');
 var lv=stockLevels(),lows=Object.keys(lv).map(function(k){return [k,lv[k]]}).filter(function(a){return a[1]<=S.settings.low*1.5}).sort(function(a,b){return a[1]-b[1]}).slice(0,4);
 var low=lows.length?lows.map(function(a){var L=a[1]<=S.settings.low*.6,cl=L?'var(--red)':'var(--amber)';return '<li><span class="ico">'+ic('box')+'</span><div class="t"><b>'+esc(a[0])+'</b><small>'+a[1]+' left</small></div><div class="bar"><i style="width:'+Math.min(100,a[1]/S.settings.low/1.5*100)+'%;background:'+cl+'"></i></div><span class="pill '+(L?'p-red':'p-amber')+'">'+(L?'Low':'Medium')+'</span></li>'}).join(''):'<li class="empty">All stock levels are healthy.</li>';
 var truck='<svg class="tr" viewBox="0 0 48 32" fill="currentColor"><rect x="1" y="6" width="28" height="18" rx="2"/><path d="M31 11h9l6 7v6H31z"/><circle cx="11" cy="26" r="4" stroke="var(--surface)" stroke-width="2"/><circle cx="38" cy="26" r="4" stroke="var(--surface)" stroke-width="2"/></svg>';
 var dd=S.fg.filter(function(r){return r.date==t&&(r.kind=='Dispatch'||r.kind=='EmpLoad')}).slice().reverse().slice(0,5);
 var dh=dd.length?dd.map(function(r){var c=r.kind=='Dispatch';return '<li>'+truck+'<div class="t"><b>'+(c?esc(r.custName||'Customer'):'Load → '+esc(empName(r.emp)))+'</b><small>'+nf(r.qty)+' cases · '+esc(r.size)+' · from '+esc(locName(r.from))+'</small></div><span class="pill '+(c?'p-green':'p-amber')+'">'+(c?'Customer':'Employee')+'</span></li>'}).join(''):'<li class="muted" style="padding:10px 0">No dispatches yet today.</li>';
 var q=function(h,c,i,l){return '<button class="'+c+'" data-go="'+h+'">'+ic(i)+l+'</button>'};
 return '<section class="hero"><div class="hero-photo"><img src="'+IMG_HERO+'" alt="SR PLUS packaged drinking water"></div>'+'<div class="welcome"><b>Welcome Back!</b><h1>'+esc(curUser())+' 👋</h1><p>Here’s your business overview for today</p><div class="quote">“Clean Water<br>Healthy Life<br>Happier Customers”</div></div><div class="pure"><svg width="34" height="34" viewBox="0 0 24 24" fill="#18a957"><path d="M12 22c0-8-6-9-9-9 0 6 4 9 9 9zm0 0c0-9 5-12 9-12 0 7-4 12-9 12zM12 12C12 6 9 3 7 2c-1 4 1 8 5 10z"/></svg><span>Pure Water<br>Better Tomorrow</span></div></section>'+
 '<section class="dpanels">'+
 dpanel('dp-blue','bars','Business Summary','All-time performance',[
  ['bars','Total Sales',inr(sum(S.bills,function(b){return b.total})),'<em>All recorded bills</em>'],
  ['wallet','Total Collections',inr(sum(S.payments,function(p){return p.amount})),'<em>All recorded payments</em>'],
  ['clock','Total Outstanding',inr(out),'<em>Unpaid bill balances</em>']])+
 dpanel('dp-green','bars','Daily Performance','Today at a glance',[
  ['bars','Today’s Sales',inr(ts),arrow(pct(ts,ys),'vs yesterday')],
  ['wallet','Today’s Collections',inr(tc),arrow(pct(tc,yc),'vs yesterday')],
  ['clock','Today’s Outstanding',inr(sum(dayBills(t),function(b){return Math.max(0,b.total-b.paid)})),'<em>Due on today’s bills</em>']])+
 dpanel('dp-purple','users','Customers','Customer overview',[
  ['users','Total Customers',S.customers.length,'<em>All registered</em>'],
  ['user','Today’s New Customers',S.customers.filter(function(c){return c.date==t}).length,'<em>Added today</em>'],
  ['clock','Customers With Dues',S.customers.filter(function(c){return cstat(c).pend>0}).length,'<em>Payment pending</em>']])+
 '</section>'+
 '<section class="dgrid"><div class="card"><div class="card-h"><h3>Sales Overview</h3><select class="sel" aria-label="Range"><option>This Week</option></select></div><div class="legend"><span><i style="background:#c2502a"></i>Sales</span><span><i style="background:#18a957"></i>Collections</span></div><div class="chart"><svg viewBox="0 0 580 210" role="img" aria-label="Sales and collections for the last 7 days">'+ch+'</svg></div></div>'+
 '<div class="card"><div class="card-h"><h3>Bottle Sales (This Month)</h3></div><div class="donut"><svg viewBox="0 0 170 170" role="img" aria-label="Bottle sales by size">'+dn+'<text x="85" y="84" font-size="24" font-weight="800" fill="var(--fg)" text-anchor="middle">'+(pn.length?tot.toLocaleString('en-IN'):'0')+'</text><text x="85" y="104" font-size="12" fill="var(--muted)" text-anchor="middle">Bottles</text></svg><div class="dl">'+(dl||'<div><span>No bottle sales this month yet</span></div>')+'</div></div></div>'+
 '<div class="card"><div class="card-h"><h3>Recent Activity</h3><a class="link" href="#bills">View All</a></div><ul class="act">'+act+'</ul></div></section>'+
 '<section class="grid3b"><div class="card"><div class="card-h"><h3>Quick Actions</h3></div><div class="qa">'+q('new-bill','q-blue','doc','Create New Bill')+q('customers','q-lb','user','Add Customer')+q('fg-dispatch','q-g','truck','Dispatch to Customers')+q('fg-empload','q-o','truck','Dispatch to Employees')+q('expenses','q-r','fuel','Add Expense')+q('attendance','q-v','check','Mark Attendance')+'</div></div>'+
 '<div class="card"><div class="card-h"><h3>Low Raw Material Alert</h3><a class="link" href="#current-stock">View All</a></div><ul class="low">'+low+'</ul></div>'+
 '<div class="card"><div class="card-h"><h3>Today’s Deliveries</h3><a class="link" href="#fg-dispatch">View All</a></div><ul class="del">'+dh+'</ul></div></section>'+
 '';
}
/* ---------- generic page helpers ---------- */
var PRODUCTS=function(){return [['20 Ltr',S.settings.rate20],['10 Ltr',S.settings.rate10],['5 Ltr',S.settings.rate5]]};
var ITEMS=['20 Ltr Empty Bottles','10 Ltr Empty Bottles','5 Ltr Empty Bottles','Jar Caps','Sealing Caps'];
function fld(f){var id='f-'+f.k,v=f.v!=null?f.v:(f.t=='date'?today():'');
 if(f.t=='file')return '<div class="fld"><label for="'+id+'">'+f.l+'</label><input id="'+id+'" type="file" data-upl="'+f.k+'" accept="image/*,application/pdf" style="height:auto;padding:10px"><small class="muted" id="upl-'+f.k+'"></small></div>';
 if(f.t=='select')return '<div class="fld"><label for="'+id+'">'+f.l+'</label><select id="'+id+'" name="'+f.k+'">'+f.o.map(function(o){o=[].concat(o);return '<option value="'+esc(o[0])+'">'+esc(o.length>1?o[1]:o[0])+'</option>'}).join('')+'</select></div>';
 return '<div class="fld"><label for="'+id+'">'+f.l+'</label><input id="'+id+'" name="'+f.k+'" type="'+(f.t||'text')+'" value="'+esc(v)+'"'+(f.list?' list="'+f.list+'"':'')+(f.t=='number'?' min="0" step="any" inputmode="decimal"':'')+(f.r===false?'':' required')+'></div>'}
function table(cols,rows,empty){if(!rows.length)return '<div class="card tw"><div class="empty">'+(empty||'Nothing here yet.')+'</div></div>';
 return '<div class="card tw" style="padding:6px"><table><thead><tr>'+cols.map(function(c){return '<th>'+c+'</th>'}).join('')+'</tr></thead><tbody>'+rows.map(function(r){return '<tr>'+r.map(function(c,i){return '<td data-l="'+esc(cols[i]||'')+'">'+c+'</td>'}).join('')+'</tr>'}).join('')+'</tbody></table></div>'}
function del(coll,id){return '<button class="btn sm danger" data-del="'+coll+':'+id+'" aria-label="Delete">Delete</button>'}
function head(t,extra){return '<div class="ph"><h2>'+t+'</h2>'+(extra||'')+'</div>'}
function formCard(fields,btn,id){var lists=fields.filter(function(f){return f.list}).map(function(f){return '<datalist id="'+f.list+'">'+(f.options||[]).map(function(o){return '<option value="'+esc(o)+'"></option>'}).join('')+'</datalist>'}).join('');return '<form class="card form" id="'+id+'" autocomplete="off">'+fields.map(fld).join('')+'<div class="fld"><button class="btn" type="submit" style="width:100%;height:42px">'+btn+'</button></div>'+lists+'</form>'}
function kp(a){return '<div class="kpis">'+a.map(function(k){return '<div class="kpi"><small>'+k[0]+'</small><b>'+k[1]+'</b></div>'}).join('')+'</div>'}
var custOpts=function(){return visibleCustomers().map(function(c){return [c.id,c.name]})};
var empOpts=function(){return S.employees.map(function(c){return [c.id,c.name]})};
var MODES=['Cash','PhonePe','GPay','Bank Transfer','Cheque'];

/* each form: submit handler gets values object */
var FORMS={};
function allocate(cust,amt,mode,date){var rest=amt;
 S.bills.filter(function(b){return b.cust==cust&&b.total>b.paid}).forEach(function(b){var take=Math.min(rest,b.total-b.paid);if(take>0){b.paid+=take;rest-=take;S.payments.push({id:nid('P',S.payments),date:date,cust:cust,amount:take,mode:mode,bill:b.id})}});
 if(rest>0)S.payments.push({id:nid('P',S.payments),date:date,cust:cust,amount:rest,mode:mode,bill:'-'})}

var CAFEINV=null;function cafeWaInvite(){if(!CAFEINV)return '#';var msg='Please complete your Cafe Employee joining form for '+S.settings.name+':\n'+CAFEINV.url;return 'https://wa.me/'+(CAFEINV.to?'91'+CAFEINV.to:'')+'?text='+encodeURIComponent(msg)}
var PAGES={
 dashboard:dashboard,
 'new-bill':function(){return newBillPage()},
 bills:function(){return allBillsPage()},
 customers:function(){FORMS.cf=function(v){S.customers.push({id:nid('C',S.customers),name:v.name,phone:v.phone,area:v.area,date:today()});return 'Customer added'};
  return head('Customers')+formCard([{k:'name',l:'Name'},{k:'phone',l:'Phone',t:'tel',r:false},{k:'area',l:'Address',r:false}],'Add Customer','cf')+table(['Name','Phone','Address','Outstanding',''],S.customers.map(function(c){var o=outstanding(c.id);return [esc(c.name),esc(c.phone),esc(c.area),'<span class="pill '+(o>0?'p-amber':'p-green')+'">'+inr(o)+'</span>',del('customers',c.id)]}))},
 payments:function(){FORMS.pf=function(v){var a=+v.amount;if(!(a>0))return 'Enter an amount';allocate(v.cust,a,v.mode,v.date);return 'Payment recorded'};
  return head('Payments')+formCard([{k:'cust',l:'Customer',t:'select',o:custOpts()},{k:'amount',l:'Amount (₹)',t:'number'},{k:'mode',l:'Mode',t:'select',o:MODES},{k:'date',l:'Date',t:'date'}],'Receive Payment','pf')+table(['Date','Customer','Amount','Mode',''],S.payments.slice().reverse().map(function(p){return [p.date,esc(custName(p.cust)),inr(p.amount),esc(p.mode),del('payments',p.id)]}))},
 outstanding:function(){var rows=S.customers.map(function(c){return [c,outstanding(c.id)]}).filter(function(a){return a[1]>0}).sort(function(a,b){return b[1]-a[1]});
  return head('Credit / Outstanding')+kp([['Total outstanding',inr(outstanding())],['Customers with dues',rows.length]])+table(['Customer','Phone','Due amount',''],rows.map(function(a){return [esc(a[0].name),esc(a[0].phone),'<b>'+inr(a[1])+'</b>','<a class="btn sm alt" href="#payments" style="text-decoration:none">Receive</a>']}),'No pending dues.')},
 'stock-in':function(){return stockPage('In','Stock In (Purchase)','Purchase')},
 'stock-out':function(){return stockPage('Out','Stock Out (Delivery)','Delivery')},
 'current-stock':function(){var lv=stockLevels();return head('Current Stock')+table(['Item','In hand','Status'],ITEMS.map(function(i){var n=lv[i]||0,l=S.settings.low;return [esc(i),'<b>'+n+'</b>','<span class="pill '+(n<=l*.6?'p-red':n<=l*1.5?'p-amber':'p-green')+'">'+(n<=l*.6?'Low':n<=l*1.5?'Medium':'Good')+'</span>']}))},
 'stock-history':function(){return head('Stock History')+table(['Date','Type','Item','Qty','Note',''],S.stock.slice().reverse().map(function(r){return [r.date,'<span class="pill '+(r.type=='In'?'p-green':'p-amber')+'">'+r.type+'</span>',esc(r.item),r.qty,esc(r.note),del('stock',r.id)]}))},
 diesel:function(){FORMS.df=function(v){S.expenses.push({id:nid('E',S.expenses),date:v.date,cat:'Diesel',note:v.note,amount:+v.amount});return 'Diesel expense added'};
  var l=S.expenses.filter(function(e){return e.cat=='Diesel'});
  return head('Diesel Expenses')+kp([['Total diesel spend',inr(sum(l,function(e){return e.amount}))],['Entries',l.length]])+formCard([{k:'note',l:'Vehicle number',v:'AP 39 '},{k:'amount',l:'Amount (₹)',t:'number'},{k:'date',l:'Date',t:'date'}],'Add Diesel Expense','df')+table(['Date','Vehicle','Amount',''],l.slice().reverse().map(function(e){return [e.date,esc(e.note),inr(e.amount),del('expenses',e.id)]}))},
 expenses:function(){FORMS.ef=function(v){S.expenses.push({id:nid('E',S.expenses),date:v.date,cat:v.cat,note:v.note,amount:+v.amount});return 'Expense added'};
  var l=S.expenses.filter(function(e){return e.cat!='Diesel'});
  return head('Other Expenses')+kp([['Total',inr(sum(l,function(e){return e.amount}))],['Entries',l.length]])+formCard([{k:'cat',l:'Category',t:'select',o:['Electricity','Repairs','Salary','Packaging','Chemicals','Rent','Other']},{k:'note',l:'Details',r:false},{k:'amount',l:'Amount (₹)',t:'number'},{k:'date',l:'Date',t:'date'}],'Add Expense','ef')+table(['Date','Category','Details','Amount',''],l.slice().reverse().map(function(e){return [e.date,esc(e.cat),esc(e.note),inr(e.amount),del('expenses',e.id)]}))},
 employees:function(){FORMS.mf=function(v){S.employees.push({id:nid('M',S.employees),name:v.name,role:v.role,phone:v.phone,salary:+v.salary});return 'Employee added'};
  return head('Employee Management')+formCard([{k:'name',l:'Name'},{k:'role',l:'Role',t:'select',o:ROLES},{k:'phone',l:'Phone',t:'tel',r:false},{k:'salary',l:'Monthly salary (₹)',t:'number'}],'Add Employee','mf')+table(['Name','Role','Phone','Salary',''],S.employees.map(function(e){return [esc(e.name),esc(e.role),esc(e.phone),inr(e.salary),del('employees',e.id)]}))},
 attendance:function(){FORMS.af=function(v){S.attendance.push({id:nid('A',S.attendance),date:v.date,emp:v.emp,status:v.status,tin:v.tin,tout:v.tout});return 'Attendance marked'};
  var l=S.attendance.filter(function(a){return a.date==today()}),p=l.filter(function(a){return a.status=='Present'}).length;
  return head('Attendance')+kp([['Present today',p],['Absent today',l.length-p],['Staff',S.employees.length]])+formCard([{k:'emp',l:'Employee',t:'select',o:empOpts()},{k:'status',l:'Status',t:'select',o:['Present','Absent','Half day']},{k:'tin',l:'In time',t:'time',v:'08:00',r:false},{k:'tout',l:'Out time',t:'time',r:false},{k:'date',l:'Date',t:'date'}],'Mark Attendance','af')+table(['Date','Employee','Status',''],S.attendance.slice().reverse().map(function(a){return [a.date,esc(empName(a.emp)),'<span class="pill '+(a.status=='Present'?'p-green':a.status=='Absent'?'p-red':'p-amber')+'">'+a.status+'</span>',del('attendance',a.id)]}))},
 timings:function(){return head('In / Out Timings')+table(['Date','Employee','In','Out','Hours'],S.attendance.filter(function(a){return a.tin}).slice().reverse().map(function(a){var h='-';if(a.tin&&a.tout){var x=a.tin.split(':'),y=a.tout.split(':');h=(((+y[0]*60+ +y[1])-(+x[0]*60+ +x[1]))/60).toFixed(1)+' h'}return [a.date,esc(empName(a.emp)),a.tin||'-',a.tout||'-',h]}))},
 advances:function(){FORMS.vf=function(v){S.advances.push({id:nid('V',S.advances),date:v.date,emp:v.emp,amount:+v.amount,note:v.note});return 'Advance saved'};
  return head('Advances / Salary')+formCard([{k:'emp',l:'Employee',t:'select',o:empOpts()},{k:'amount',l:'Advance (₹)',t:'number'},{k:'note',l:'Note',r:false},{k:'date',l:'Date',t:'date'}],'Give Advance','vf')+
  '<h3 style="margin:18px 0 0">Salary summary</h3>'+table(['Employee','Salary','Advances','Payable'],S.employees.map(function(e){var a=sum(S.advances.filter(function(x){return x.emp==e.id}),function(x){return x.amount});return [esc(e.name),inr(e.salary),inr(a),'<b>'+inr(e.salary-a)+'</b>']}))+
  '<h3 style="margin:18px 0 0">Advance history</h3>'+table(['Date','Employee','Amount','Note',''],S.advances.slice().reverse().map(function(a){return [a.date,esc(empName(a.emp)),inr(a.amount),esc(a.note),del('advances',a.id)]}))},
 'cafe-dashboard':function(){
  var d=today(),ds=S.cafeSales.filter(function(x){return x.date==d}),dp=S.cafePurchases.filter(function(x){return x.date==d}),de=(S.cafeExpenses||[]).filter(function(x){return x.date==d}),profit=cafeProfit(d,d),levels=cafeStockLevels(),low=Object.keys(levels).filter(function(k){return levels[k].qty<=levels[k].min}),moves=S.cafeStockMoves.filter(function(x){return x.date==d});
  return '<div class="bk-hero" style="background:linear-gradient(120deg,#713f12,#c26a1b 62%,#e9a23b)"><div><h2>☕ Cafe Management</h2><p>Manage cafe sales, purchases, daily expenses and ingredient stock separately from the water plant.</p></div><div class="bk-mark">☕</div></div>'+
   kp([['Today Sales',inr(sum(ds,function(x){return x.total}))],['Today Purchases',inr(sum(dp,function(x){return x.amount}))],['Today Expenses',inr(sum(de,function(x){return x.amount}))],['Today Estimated Profit',inr(profit.profit)]])+
   '<div class="note warn" style="margin:12px 0">Estimated Profit = Sales − Purchases − Expenses. This is a cash-based estimate, not final accounting profit; ingredient consumption, closing stock and wastage are not yet costed.</div><div class="grid3b"><section class="card"><div class="card-h"><h3>Quick Actions</h3></div><div class="qa"><button class="q-blue" type="button" data-go="cafe-sales">＋ New Cafe Sale</button><button class="q-g" type="button" data-go="cafe-purchases">＋ Add Purchase</button><button class="q-lb" type="button" data-go="cafe-expenses">＋ Add Expense</button><button class="q-o" type="button" data-go="cafe-stock-in">↓ Stock In</button><button class="q-v" type="button" data-go="cafe-stock-out">↑ Stock Out / Usage</button><button class="q-r" type="button" data-go="cafe-current-stock">▦ Current Stock</button></div></section>'+
   '<section class="card"><div class="card-h"><h3>Today’s Activity</h3></div>'+table(['Activity','Records / Quantity'],[['Sales transactions',ds.length],['Purchase entries',dp.length],['Stock In entries',moves.filter(function(x){return x.type=='In'}).length],['Stock Out entries',moves.filter(function(x){return x.type=='Out'}).length],['Stock items available',Object.keys(levels).length]])+'</section>'+
   '<section class="card"><div class="card-h"><h3>Low Stock Alerts</h3></div>'+table(['Item','Balance'],low.map(function(k){return [esc(levels[k].name),levels[k].qty+' '+esc(levels[k].unit)]}),'No low-stock items.')+'</section></div>'+
   '<section class="card" style="margin-top:14px"><div class="card-h"><h3>Recent Cafe Sales</h3><a class="link" href="#cafe-sales">View All</a></div>'+table(['Date','Item','Qty','Amount','Payment'],S.cafeSales.slice().reverse().slice(0,8).map(function(x){return [x.date,esc(x.item),x.qty,inr(x.total),esc(x.mode)]}),'No cafe sales yet.')+'</section>';
 },
 'cafe-employees':function(){
  FORMS.cafemf=function(v){if(!v.name.trim())return 'Enter employee name';S.cafeEmployees.push({id:nid('CEM',S.cafeEmployees),name:v.name.trim(),role:v.role,phone:v.phone,salary:+v.salary||0,joined:today(),createdBy:cafeActorName()});return 'Cafe employee added'};
  var pend=S.applications.filter(function(a){return a.status=='Pending'&&a.department=='Cafe'});
  var inv='<section class="card"><h3>Invite Cafe Employee</h3><p class="pdesc">Create a secure joining link. Cafe staff can submit their details, live photo, Aadhaar, PAN and Driving Licence documents using the same joining form.</p><div class="invrow"><div class="fld"><label for="cafe-inv-me">Business WhatsApp number</label><input id="cafe-inv-me" type="tel" maxlength="10" value="'+esc(digits(S.settings.phone))+ '" placeholder="10-digit mobile"></div><div class="fld"><label for="cafe-inv-to">Cafe employee mobile (optional)</label><input id="cafe-inv-to" type="tel" maxlength="10" placeholder="10-digit mobile"></div><div class="fld"><button type="button" class="btn" data-cej="newinv" style="width:100%;height:42px">Create Cafe Joining Link</button></div></div>'+(CAFEINV?'<div class="linkbox"><input readonly value="'+esc(CAFEINV.url)+'"><button class="btn alt" type="button" data-cej="copy">Copy Link</button><a class="btn wa" target="_blank" rel="noopener" href="'+cafeWaInvite()+'">Send on WhatsApp</a></div>':'')+'</section>';
  var apps='<section class="card" style="margin-top:14px"><div class="aphead"><h3>Cafe Joining Applications <span class="cnt">'+pend.length+' pending</span></h3><button class="btn sm" type="button" data-ej="refresh">Refresh</button></div>'+(pend.length?pend.map(appCard).join(''):'<p class="pdesc">No pending Cafe applications.</p>')+'</section>';
  var manual='<section class="card" style="margin-top:14px"><h3>Add Cafe Employee Manually</h3>'+formCard([{k:'name',l:'Name'},{k:'role',l:'Role',t:'select',o:['Cafe Manager','Cashier','Barista','Cook','Service Staff','Cleaner','Other']},{k:'phone',l:'Phone',t:'tel',r:false},{k:'salary',l:'Monthly Salary (₹)',t:'number'}],'Add Cafe Employee','cafemf')+'</section>';
  return head('Cafe Employee Management')+inv+apps+manual+table(['Photo','Name','Role','Phone','Salary','Joining Date'],S.cafeEmployees.map(function(e){return [e.photo?'<img class="eph" src="'+e.photo+'" alt="">':'-',esc(e.name),esc(e.role),esc(e.phone||'-'),inr(e.salary),e.joined||'-']}),'No Cafe employees added yet.');
 },
 'cafe-sales':function(){
  FORMS.cafesale=function(v){var q=+v.qty,r=+v.rate,item=(v.item=='Other'?(v.otherItem||'').trim():(v.item||'').trim());if(!item||!(q>0)||!(r>=0))return 'ERROR: Select or enter an item, quantity and valid rate';S.cafeSales.push({id:nid('CS',S.cafeSales),date:v.date,item:item,qty:q,unit:'Serving',total:Math.round(q*r*100)/100,rate:r,mode:v.mode,createdBy:cafeActorName()});return 'Cafe sale saved'};
  return head('Cafe Sales','<button class="btn alt" type="button" data-go="cafe-dashboard">← Cafe Dashboard</button>')+'<div class="note warn" style="margin:12px 0">Estimated Profit is calculated as Sales − Purchases − Expenses. For accurate net profit, recipe-wise ingredient consumption and closing stock valuation must be added.</div>'+kp([['Today Sales',inr(sum(S.cafeSales.filter(function(x){return x.date==today()}),function(x){return x.total}))],['All-Time Sales',inr(sum(S.cafeSales,function(x){return x.total}))],['Today Estimated Profit',inr(cafeProfit(today(),today()).profit)],['Transactions',S.cafeSales.length]])+
   formCard([{k:'item',l:'Cafe Menu Item',t:'select',o:['Tea','Coffee','Milk','Boost','Horlicks','Lemon Tea','Irani Tea','Honey Tea','Ginger Tea','Green Tea','Badam Milk','Hot Milk','Cold Coffee','Other']},{k:'otherItem',l:'Other Item Name (if Other selected)',r:false},{k:'qty',l:'Quantity',t:'number'},{k:'rate',l:'Rate per Item (₹)',t:'number'},{k:'mode',l:'Payment Mode',t:'select',o:MODES},{k:'date',l:'Sale Date',t:'date'}],'Save Cafe Sale','FORM-cafesale')+
   table(['Date','Sale ID','Item','Qty','Rate','Total','Payment','Entered By'],S.cafeSales.slice().reverse().map(function(x){return [x.date,esc(x.id),esc(x.item),x.qty,inr(x.rate),inr(x.total),esc(x.mode),esc(x.createdBy||'-')]}),'No cafe sales yet.');
 },
 'cafe-purchases':function(){
  FORMS.cafepurchase=function(v){var q=+v.qty,a=+v.amount,paid=+v.paid||0,item=(v.item||'').trim(),supplier=(v.supplier||'').trim();if(!item||!(q>0)||!(a>=0)||paid<0||paid>a)return 'ERROR: Enter item, quantity, total amount and a paid amount not greater than the total';var stockMap=cafeStockLevels(),existing=stockMap[cafeItemKey(item)];if(existing)item=existing.name;if(existing&&existing.unit&&String(existing.unit).toLowerCase()!=String(v.unit).toLowerCase())return 'This item already uses '+existing.unit+'. Keep the same unit.';var p={id:nid('CP',S.cafePurchases),date:v.date,item:item,qty:q,unit:v.unit,supplier:supplier,amount:a,paid:paid,balance:Math.round((a-paid)*100)/100,note:v.note||'',createdBy:cafeActorName()};S.cafePurchases.push(p);S.cafeStockMoves.push({id:nid('CM',S.cafeStockMoves),date:v.date,type:'In',item:p.item,qty:q,unit:p.unit,note:'Purchase '+p.id,createdBy:p.createdBy});return 'Cafe purchase saved. Supplier balance: '+inr(p.balance)};
  return head('Cafe Purchases','<button class="btn alt" type="button" data-go="cafe-dashboard">← Cafe Dashboard</button>')+kp([['Today Purchases',inr(sum(S.cafePurchases.filter(function(x){return x.date==today()}),function(x){return x.amount}))],['All-Time Purchases',inr(sum(S.cafePurchases,function(x){return x.amount}))],['Supplier Balance Due',inr(sum(S.cafePurchases,function(x){return x.balance!=null?x.balance:Math.max(0,x.amount-(x.paid||0))}))],['Records',S.cafePurchases.length]])+
   formCard([{k:'item',l:'Purchased Ingredient / Item',list:'cafe-purchase-items',options:cafeItemNames()},{k:'qty',l:'Quantity',t:'number'},{k:'unit',l:'Unit',t:'select',o:['Kg','Gram','Litre','ML','Packet','Piece','Box','Other']},{k:'amount',l:'Total Purchase Amount (₹)',t:'number'},{k:'paid',l:'Amount Paid Now (₹)',t:'number',v:0},{k:'supplier',l:'Supplier Name'},{k:'date',l:'Purchase Date',t:'date'},{k:'note',l:'Notes / Invoice No.',r:false}],'Save Purchase','FORM-cafepurchase')+
   '<div class="note">Balance Due = Total Purchase Amount − Amount Paid Now. The person who saves this purchase is recorded automatically.</div>'+
   table(['Date','Purchase ID','Item','Qty','Supplier','Total','Paid','Balance Due','Entered By'],S.cafePurchases.slice().reverse().map(function(x){var paid=Number(x.paid||0),bal=x.balance!=null?x.balance:Math.max(0,Number(x.amount||0)-paid);return [x.date,esc(x.id),esc(x.item),x.qty+' '+esc(x.unit),esc(x.supplier||'-'),inr(x.amount),inr(paid),'<b class="'+(bal>0?'':'p-green')+'">'+inr(bal)+'</b>',esc(x.createdBy||'-')]}),'No cafe purchases yet.');
 },
 'cafe-expenses':function(){
  FORMS.cafeexpense=function(v){var a=+v.amount;if(!(a>0)||!v.category.trim())return 'ERROR: Enter expense category and amount';S.cafeExpenses.push({id:nid('CE',S.cafeExpenses),date:v.date,category:v.category.trim(),amount:a,note:v.note||'',createdBy:cafeActorName()});return 'Cafe expense saved'};
  return head('Cafe Expenses','<button class="btn alt" type="button" data-go="cafe-dashboard">← Cafe Dashboard</button>')+kp([['Today Expenses',inr(sum(S.cafeExpenses.filter(function(x){return x.date==today()}),function(x){return x.amount}))],['All-Time Expenses',inr(sum(S.cafeExpenses,function(x){return x.amount}))],['Expense Records',S.cafeExpenses.length]])+
   formCard([{k:'category',l:'Expense Category',t:'select',o:['Electricity','Gas','Water','Staff Food','Cleaning','Repairs','Transport','Other']},{k:'amount',l:'Amount (₹)',t:'number'},{k:'date',l:'Expense Date',t:'date'},{k:'note',l:'Description / Note',r:false}],'Save Cafe Expense','FORM-cafeexpense')+
   table(['Date','Category','Amount','Description','Entered By'],S.cafeExpenses.slice().reverse().map(function(x){return [x.date,esc(x.category),inr(x.amount),esc(x.note||'-'),esc(x.createdBy||'-')]}),'No cafe expenses yet.');
 },
 'cafe-stock-in':function(){
  FORMS.cafestockin=function(v){var q=+v.qty,item=(v.item||'').trim();if(!item||!(q>0))return 'ERROR: Enter item and quantity';var stockMap=cafeStockLevels(),existing=stockMap[cafeItemKey(item)];if(existing)item=existing.name;if(existing&&existing.unit&&String(existing.unit).toLowerCase()!=String(v.unit).toLowerCase())return 'This item already uses '+existing.unit+'. Keep the same unit.';S.cafeStockMoves.push({id:nid('CM',S.cafeStockMoves),date:v.date,type:'In',item:item,qty:q,unit:v.unit,note:v.note||'Manual stock in',createdBy:cafeActorName()});return 'Cafe stock-in saved'};
  return head('Cafe Stock In','<button class="btn alt" type="button" data-go="cafe-dashboard">← Cafe Dashboard</button>')+formCard([{k:'item',l:'Ingredient / Stock Item',list:'cafe-stock-items',options:cafeItemNames()},{k:'qty',l:'Quantity',t:'number'},{k:'unit',l:'Unit',t:'select',o:['Kg','Gram','Litre','ML','Packet','Piece','Cup','Box','Other']},{k:'date',l:'Date',t:'date'},{k:'note',l:'Reference / Purchase / Note',r:false}],'Add Stock In','FORM-cafestockin')+
  table(['Date','Item','Qty','Unit','Reference / Note','Entered By'],S.cafeStockMoves.filter(function(x){return x.type=='In'}).slice().reverse().map(function(x){return [x.date,esc(x.item),x.qty,esc(x.unit),esc(x.note),esc(x.createdBy||'-')]}));
 },
 'cafe-stock-out':function(){
  FORMS.cafestockout=function(v){var q=+v.qty;if(!v.item.trim()||!(q>0))return 'Enter item and quantity';var stockMap=cafeStockLevels(),bal=stockMap[cafeItemKey(v.item)],itemName=bal?bal.name:v.item.trim();if(!bal)return 'Select an ingredient already added in Cafe Stock In';if(bal&&q>bal.qty)return 'Stock out quantity is greater than available stock';S.cafeStockMoves.push({id:nid('CM',S.cafeStockMoves),date:v.date,type:'Out',item:itemName,qty:q,unit:bal.unit,note:v.note||'Cafe usage',createdBy:cafeActorName()});return 'Cafe stock-out saved'};
  return head('Cafe Stock Out / Usage','<button class="btn alt" type="button" data-go="cafe-dashboard">← Cafe Dashboard</button>')+formCard([{k:'item',l:'Select Ingredient (from Stock In)',t:'select',o:Object.keys(cafeStockLevels()).filter(function(k){return cafeStockLevels()[k].ins>0}).map(function(k){return cafeStockLevels()[k].name})},{k:'qty',l:'Quantity',t:'number'},{k:'date',l:'Date',t:'date'},{k:'note',l:'Reason (Usage / Waste / Adjustment)',r:false}],'Save Stock Out','FORM-cafestockout')+
  table(['Date','Item','Qty','Unit','Reason'],S.cafeStockMoves.filter(function(x){return x.type=='Out'}).slice().reverse().map(function(x){return [x.date,esc(x.item),x.qty,esc(x.unit),esc(x.note)]}));
 },
 'cafe-current-stock':function(){
  var levels=cafeStockLevels(),keys=Object.keys(levels).sort();
  return head('Cafe Current Stock','<button class="btn alt" type="button" data-go="cafe-dashboard">← Cafe Dashboard</button>')+kp([['Stock Items',keys.length],['Stock In Records',S.cafeStockMoves.filter(function(x){return x.type=='In'}).length],['Stock Out Records',S.cafeStockMoves.filter(function(x){return x.type=='Out'}).length]])+
   table(['Item','Unit','Total In','Total Out','Available Balance','Status'],keys.map(function(k){var x=levels[k],st=x.qty<=x.min?'Low':'Available';return [esc(x.name),esc(x.unit),x.ins,x.outs,'<b>'+x.qty+'</b>','<span class="pill '+(st=='Low'?'p-red':'p-green')+'">'+st+'</span>']}),'No cafe stock yet. Record a purchase or Stock In first.');
 },
 'cafe-reports':function(){
  var d=today(),sales=S.cafeSales.filter(function(x){return x.date==d}),purch=S.cafePurchases.filter(function(x){return x.date==d}),byItem={};S.cafeSales.forEach(function(x){var z=byItem[x.item]||(byItem[x.item]=[0,0]);z[0]+=x.qty;z[1]+=x.total});
  return head('Cafe Reports','<button class="btn alt" type="button" data-go="cafe-dashboard">← Cafe Dashboard</button>')+kp([['Today Sales',inr(sum(sales,function(x){return x.total}))],['Today Purchases',inr(sum(purch,function(x){return x.amount}))],['Today Stock In',sum(S.cafeStockMoves.filter(function(x){return x.date==d&&x.type=='In'}),function(x){return x.qty})],['Today Stock Out',sum(S.cafeStockMoves.filter(function(x){return x.date==d&&x.type=='Out'}),function(x){return x.qty})]])+
   '<section class="card"><div class="card-h"><h3>Sales by Menu Item · All Time</h3></div>'+table(['Item','Quantity Sold','Sales Amount'],Object.keys(byItem).map(function(k){return [esc(k),byItem[k][0],inr(byItem[k][1])]}))+'</section><section class="card" style="margin-top:14px"><div class="card-h"><h3>Purchase History</h3></div>'+table(['Date','Item','Quantity','Supplier','Amount'],S.cafePurchases.slice().reverse().map(function(x){return [x.date,esc(x.item),x.qty+' '+esc(x.unit),esc(x.supplier||'-'),inr(x.amount)]}))+'</section><section class="card" style="margin-top:14px"><div class="card-h"><h3>Stock Movement History</h3></div>'+table(['Date','Type','Item','Quantity','Note'],S.cafeStockMoves.slice().reverse().map(function(x){return [x.date,'<span class="pill '+(x.type=='In'?'p-green':'p-amber')+'">'+x.type+'</span>',esc(x.item),x.qty+' '+esc(x.unit),esc(x.note)]}))+'</section>';
 },
 backup:function(){
  var d=today();
  return '<div class="bk-hero"><div><h2>Backup & Data Export</h2><p>Download your Larven Enterprises business records in one professionally organised Excel workbook, with separate sheets for each business area.</p></div><div class="bk-mark">⇩</div></div>'+ 
   '<div class="bk-modes"><button type="button" class="bk-mode active" data-bkmode="daily"><span class="bk-ico">▣</span><span><b>Daily Backup</b><small>All available records for one selected date</small></span></button><button type="button" class="bk-mode" data-bkmode="range"><span class="bk-ico">▦</span><span><b>Custom Date Range</b><small>Choose a From and To date</small></span></button><button type="button" class="bk-mode" data-bkmode="all"><span class="bk-ico">◫</span><span><b>All-Time Backup</b><small>Every available record in this browser</small></span></button></div>'+ 
   '<section class="card"><div class="card-h"><div><h3>Choose Backup Period</h3><p class="pdesc">Select the period and download the complete workbook.</p></div><span class="pill p-blue">Excel · XLSX</span></div><div class="bk-filter"><div class="fld" id="bk-date-wrap"><label for="bk-date">Backup Date</label><input id="bk-date" type="date" value="'+d+'"></div><div class="fld" id="bk-from-wrap" hidden><label for="bk-from">From Date</label><input id="bk-from" type="date" value="'+d+'"></div><div class="fld" id="bk-to-wrap" hidden><label for="bk-to">To Date</label><input id="bk-to" type="date" value="'+d+'"></div><div class="fld"><label>Export Format</label><input value="Excel Workbook (.xlsx)" disabled></div><button type="button" class="btn" id="backup-download">⇩ Download Data</button></div><div class="bk-note" id="bk-period-note">Daily backup includes records dated on the selected day. The workbook also includes an All-Time Sales summary for comparison.</div></section>'+ 
   '<div class="bk-summary"><div class="bk-stat"><small>Total Sales · All Time</small><b>'+inr(sum(S.bills,function(x){return +x.total||0}))+'</b></div><div class="bk-stat"><small>Total Bills</small><b>'+S.bills.length+'</b></div><div class="bk-stat"><small>Total Customers</small><b>'+S.customers.length+'</b></div><div class="bk-stat"><small>Employees / Vehicles</small><b>'+S.employees.length+' / '+S.vehicles.length+'</b></div></div>'+ 
   '<section class="card"><div class="card-h"><h3>Workbook Sheets Included</h3><span class="pill p-green">Multi-sheet export</span></div><div class="bk-includes"><span>Backup Summary</span><span>Selected Period Sales</span><span>All-Time Sales</span><span>All Bills & Items</span><span>Customers</span><span>New Customers</span><span>Payments & Collections</span><span>Purchases / Stock In</span><span>Stock Out / Deliveries</span><span>Current Stock</span><span>Expenses & Diesel</span><span>Employees</span><span>Attendance</span><span>Salary & Advances</span><span>Vehicles</span><span>Vehicle Trips</span><span>Cancelled Bills</span><span>Deleted Bills</span><span>Cafe Sales</span><span>Cafe Purchases</span><span>Cafe Stock Movements</span></div><div class="bk-note"><b>Important data notes:</b> Profit cannot be calculated reliably until product purchase cost / cost of goods sold is recorded. Stock In records currently contain quantities and notes, not purchase values. Cafe sales, purchases and stock movements are also included. This export includes every record currently available in this browser; it is not yet a cloud-wide backup shared across devices. Keep the downloaded Excel file in a secure location because it may contain employee and customer personal information.</div></section>';
 },
 'rep-sales':function(){var m={};S.bills.forEach(function(b){var o=m[b.date]||(m[b.date]=[0,0,0]);o[0]++;o[1]+=b.total;o[2]+=b.paid});var k=Object.keys(m).sort().reverse();
  return head('Sales Reports')+kp([['Total sales',inr(sum(S.bills,function(b){return b.total}))],['Bills',S.bills.length],['Collected',inr(sum(S.bills,function(b){return b.paid}))]])+table(['Date','Bills','Sales','Collected','Due'],k.map(function(d){return [d,m[d][0],inr(m[d][1]),inr(m[d][2]),inr(m[d][1]-m[d][2])]}))},
 'rep-pay':function(){var m={};S.payments.forEach(function(p){m[p.mode]=(m[p.mode]||0)+p.amount});return head('Payment Reports')+kp(Object.keys(m).map(function(k){return [k,inr(m[k])]}))+table(['Customer','Received','Outstanding'],S.customers.map(function(c){return [esc(c.name),inr(sum(S.payments.filter(function(p){return p.cust==c.id}),function(p){return p.amount})),inr(outstanding(c.id))]}))},
 'rep-stock':function(){var i={},o={};S.stock.forEach(function(r){(r.type=='In'?i:o)[r.item]=((r.type=='In'?i:o)[r.item]||0)+r.qty});return head('Stock Reports')+table(['Item','Total in','Total out','Balance'],ITEMS.map(function(k){return [esc(k),i[k]||0,o[k]||0,'<b>'+((i[k]||0)-(o[k]||0))+'</b>']}))},
 'rep-exp':function(){var m={};S.expenses.forEach(function(e){m[e.cat]=(m[e.cat]||0)+e.amount});var t=sum(S.expenses,function(e){return e.amount}),inc=sum(S.bills,function(b){return b.paid});return head('Expense Reports')+kp([['Total expenses',inr(t)],['Collections',inr(inc)],['Net',inr(inc-t)]])+table(['Category','Amount','Share'],Object.keys(m).map(function(k){return [esc(k),inr(m[k]),Math.round(m[k]/t*100)+'%']}))},
 settings:function(){FORMS.sf=function(v){var s=S.settings;s.name=v.name;s.owner=v.owner;s.phone=v.phone;s.gst=v.gst;s.address=v.address;s.upiId=(v.upiId||'').trim();s.upiPayee=(v.upiPayee||v.name||'Larven Enterprises').trim();s.low=+v.low;s.products.forEach(function(p,i){p.r=+v['pr'+i]||0});return 'Settings saved'};var s=S.settings;
  var pf=[];s.products.forEach(function(p,i){pf.push({k:'pr'+i,l:p.n+' Case of '+p.c+' - price per case (\u20B9)',t:'number',v:p.r})});
  return head('Business Settings')+formCard([{k:'name',l:'Business name',v:s.name},{k:'owner',l:'Owner name',v:s.owner},{k:'phone',l:'Phone',v:s.phone,r:false},{k:'gst',l:'GST number',v:s.gst,r:false},{k:'address',l:'Business address (shown on bill)',v:s.address,r:false},{k:'upiPayee',l:'UPI Payee Name',v:s.upiPayee||s.name,r:false},{k:'upiId',l:'PhonePe / UPI ID (e.g. business@upi)',v:s.upiId||'',r:false},{k:'low',l:'Low stock level',t:'number',v:s.low}].concat(pf),'Save Settings','sf')+'<div class="note">PhonePe QR uses this UPI ID and the amount entered on the New Bill page. Payment is not automatically verified.</div>'+billSettingsCard()}
};
function stockPage(type,title,note){var f='sf'+type;FORMS[f]=function(v){S.stock.push({id:nid('S',S.stock),date:v.date,type:type,item:v.item,qty:+v.qty,note:v.note||note});return 'Stock '+type.toLowerCase()+' saved'};
 return head(title)+formCard([{k:'item',l:'Item',t:'select',o:ITEMS},{k:'qty',l:'Quantity',t:'number'},{k:'note',l:'Note',r:false,v:note},{k:'date',l:'Date',t:'date'}],'Save','FORM-'+f)+table(['Date','Item','Qty','Note',''],S.stock.filter(function(r){return r.type==type}).slice().reverse().map(function(r){return [r.date,esc(r.item),r.qty,esc(r.note),del('stock',r.id)]}))}
/* ---------- Plant stock (in CASES): production -> plant -> godowns -> vehicles / customers, plus raw materials ---------- */
var STKDATE='',ESFROM='',ESTO='';
function stkDate(){return STKDATE||today()}
function nf(n){return (Math.round((+n||0)*100)/100).toLocaleString('en-IN')}
function locName(i){var d={P:'Plant',G1:'Godown 1 (SS Point 1)',G2:'Godown 2 (SS Point 2)',V:'On vehicles'};if(i=='V')return d.V;return (S.settings.locNames&&S.settings.locNames[i])||d[i]||(i?String(i):'-')}
function locOpts(ids){return (ids||['P','G1','G2']).map(function(i){return [i,locName(i)]})}
function fgPer(z){var pr=(S.settings.products||[]).filter(function(p){return p.n==z})[0];return (pr&&+pr.c)||({'300 ml':30,'500 ml':24,'1 L':12,'2 L':9}[z])||1}
function fgSizes(){var o=[],m={};(S.settings.products||[]).forEach(function(p){if(p.n&&!m[p.n]){m[p.n]=1;o.push(p.n)}});S.fg.forEach(function(r){if(r.size&&!m[r.size]){m[r.size]=1;o.push(r.size)}});return o.length?o:['300 ml','500 ml','1 L','2 L']}
function fgBalOf(list){var m={};list.forEach(function(r){var q=+r.qty||0;if(r.to){var k=r.to+'|'+r.size;m[k]=(m[k]||0)+q}if(r.from){var k2=r.from+'|'+r.size;m[k2]=(m[k2]||0)-q}});return m}
function fgBal(){return fgBalOf(S.fg)}
function fgGet(m,loc,size){return Math.round((m[loc+'|'+size]||0)*100)/100}
function fgSum(l,f){return sum(l,function(r){return (!f||f(r))?(+r.qty||0):0})}
function fgBy(){return cafeActorName()}
function rawItems(){var a=[];fgSizes().forEach(function(z){a.push('Empty Bottles - '+z)});['Caps','Labels','Shrink Film (rolls)','Cartons / Packing'].forEach(function(x){a.push(x)});Object.keys(stockLevels()).forEach(function(k){if(a.indexOf(k)<0)a.push(k)});return a}
function rawIO(){var m={};S.stock.forEach(function(r){var o=m[r.item]||(m[r.item]={i:0,o:0});if(r.type=='In')o.i+=+r.qty||0;else o.o+=+r.qty||0});return m}
function rawPill(n){var l=S.settings.low||100;return '<span class="pill '+(n<=0?'p-red':n<=l*.6?'p-red':n<=l*1.5?'p-amber':'p-green')+'">'+(n<=0?'Empty':n<=l*.6?'Low':n<=l*1.5?'Medium':'Good')+'</span>'}
var FGSELF=['Production','Transfer','Dispatch','Adjust'];
function fgDelete(id){var row=S.fg.filter(function(r){return r.id==id})[0];if(!row)return '';if(FGSELF.indexOf(row.kind)<0)return 'This entry belongs to a vehicle trip and cannot be deleted here.';var rest=S.fg.filter(function(r){return r.id!=id}),m=fgBalOf(rest),bad=Object.keys(m).some(function(k){return m[k]<-0.0001});if(bad)return 'Cannot delete: later transfers, dispatches or trips depend on this entry.';S.fg=rest;S.stock=S.stock.filter(function(r){return r.ref!=id});return ''}
function delFg(r){return FGSELF.indexOf(r.kind)>=0?del('fg',r.id):''}
function kindPill(k){var c={Production:'p-blue',Transfer:'p-amber',Dispatch:'p-green',Adjust:'p-red',Load:'p-amber',TripSale:'p-green',Return:'p-blue',Shortage:'p-red'}[k]||'p-blue';return '<span class="pill '+c+'">'+esc({TripSale:'Route sale'}[k]||k)+'</span>'}
function vehNo(id){var v=S.vehicles.filter(function(x){return x.id==id})[0];return v?v.number:''}
function stage(icon,label,num,sub,col){return '<div class="pst" style="--c:'+col+'"><span>'+ic(icon)+'</span><small>'+label+'</small><b>'+nf(num)+'</b><em>'+sub+'</em></div>'}
function plHero(t,p){return '<div class="bk-hero" style="background:linear-gradient(120deg,#6a211c,#c2502a 60%,#14b8c4)"><div><h2>'+t+'</h2><p>'+p+'</p></div><div class="bk-mark">🏭</div></div>'}
function fgForm(fields,btn,id,extra){var h=formCard(fields,btn,id);return extra?h.replace('<div class="fld"><button',extra+'<div class="fld"><button'):h}
function fgChips(locs){var b=fgBal(),sz=fgSizes();return '<div class="note" style="margin:0 0 12px">Available now (cases): '+(locs||['P','G1','G2']).map(function(l){return '<b>'+esc(locName(l))+'</b> '+sz.map(function(z){return esc(z)+' '+nf(fgGet(b,l,z))}).join(' · ')}).join(' &nbsp;|&nbsp; ')+'</div>'}
function fgCheck(loc,size,q){var have=fgGet(fgBal(),loc,size);return q>have+0.0001?'ERROR: Only '+nf(have)+' cases of '+size+' available at '+locName(loc):''}
function fgRows(kind){return S.fg.filter(function(r){return r.kind==kind}).slice().reverse()}
/* ---- vehicle trips: stock loaded / sold / returned ---- */
function tripStat(t){var o={load:{},sold:{},ret:{},short:{}},m={Load:'load',TripSale:'sold',Return:'ret',Shortage:'short'};S.fg.forEach(function(r){if(r.trip!=t.id)return;var k=m[r.kind];if(k)o[k][r.size]=Math.round(((o[k][r.size]||0)+(+r.qty||0))*100)/100});return o}
function sizeTxt(m){var a=Object.keys(m).filter(function(k){return m[k]}).map(function(k){return esc(k)+': <b>'+nf(m[k])+'</b>'});return a.length?a.join(' · '):'-'}
function mapTot(m){return Math.round(sum(Object.keys(m),function(k){return m[k]})*100)/100}
function fgLoadHTML(){var sz=fgSizes();return '<div class="fld full"><label>Stock loaded from godown (cases) *</label><div class="vm-load"><div class="fld"><label>Take stock from</label><select name="godown">'+['G1','G2'].map(function(g){return '<option value="'+g+'">'+esc(locName(g))+'</option>'}).join('')+'</select></div>'+sz.map(function(z,i){return '<div class="fld"><label>'+esc(z)+' (cases)</label><input name="load_'+i+'" type="number" min="0" step="any" inputmode="decimal" placeholder="0"></div>'}).join('')+'</div><div class="vm-help">'+fgChips(['G1','G2']).replace(/<div[^>]*>|<\/div>/g,'')+'</div></div>'}
function fgReturnHTML(){var sz=fgSizes();return '<div class="fld full"><label>Stock at return (cases) – sold and handed back to godown</label><div class="vm-load"><div class="fld"><label>Hand over to godown</label><select name="rgodown">'+['G1','G2'].map(function(g){return '<option value="'+g+'">'+esc(locName(g))+'</option>'}).join('')+'</select></div>'+sz.map(function(z,i){return '<div class="fld"><label>'+esc(z)+' – sold</label><input name="sold_'+i+'" type="number" min="0" step="any" inputmode="decimal" placeholder="0"></div><div class="fld"><label>'+esc(z)+' – returned</label><input name="ret_'+i+'" type="number" min="0" step="any" inputmode="decimal" placeholder="0"></div>'}).join('')+'</div><div class="vm-help">Anything loaded but not sold or returned is recorded as shortage (broken / missing).</div></div>'}
function fgParseLoad(v){var sz=fgSizes(),b=fgBal(),loads=[];sz.forEach(function(z,i){var q=+v['load_'+i]||0;if(q<0)q=0;if(q>0)loads.push({size:z,q:q})});if(!loads.length)return {err:'Enter at least one size with cases loaded'};for(var i=0;i<loads.length;i++){if(loads[i].q>fgGet(b,v.godown,loads[i].size)+0.0001)return {err:'Only '+nf(fgGet(b,v.godown,loads[i].size))+' cases of '+loads[i].size+' available at '+locName(v.godown)}}return {loads:loads,godown:v.godown}}
function fgParseReturn(trip,v){var sz=fgSizes(),L=tripStat(trip).load,rows=[];for(var i=0;i<sz.length;i++){var z=sz[i],ld=L[z]||0,so=+v['sold_'+i]||0,rt=+v['ret_'+i]||0;if(so<0||rt<0)return {err:'Cases cannot be negative'};if(so+rt>ld+0.0001)return {err:z+': sold + returned ('+nf(so+rt)+') is more than loaded ('+nf(ld)+')'};if(ld>0)rows.push({size:z,sold:so,ret:rt,short:Math.round((ld-so-rt)*100)/100})}return {rows:rows,godown:v.rgodown}}
function fgApplyReturn(trip,rs){var d=today(),by=fgBy(),short=0;rs.rows.forEach(function(r){var base={date:d,size:r.size,trip:trip.id,emp:trip.employee,vehicle:trip.vehicle,by:by,at:new Date().toISOString()};
 if(r.sold>0)S.fg.push(Object.assign({id:nid('F',S.fg),kind:'TripSale',qty:r.sold,from:'V',to:''},base));
 if(r.ret>0)S.fg.push(Object.assign({id:nid('F',S.fg),kind:'Return',qty:r.ret,from:'V',to:rs.godown},base));
 if(r.short>0.0001){short+=r.short;S.fg.push(Object.assign({id:nid('F',S.fg),kind:'Shortage',qty:r.short,from:'V',to:''},base))}});trip.returnGodown=rs.godown;return short}
function fgLoadTxt(t){return sizeTxt(tripStat(t).load).replace(/<[^>]+>/g,'')}

PAGES['stock-overview']=function(){
 var d=stkDate(),sizes=fgSizes(),bal=fgBal(),L=S.fg.filter(function(r){return r.date==d}),P=L.filter(function(r){return r.kind=='Production'}),T=L.filter(function(r){return r.kind=='Transfer'}),X=L.filter(function(r){return r.kind=='Dispatch'}),R=L.filter(function(r){return r.kind=='TripSale'});
 var nowAt=function(loc){return sum(sizes,function(z){return fgGet(bal,loc,z)})},god=nowAt('G1')+nowAt('G2'),onVeh=nowAt('V'),active=S.vehicleTrips.filter(function(t){return !t.handoverAt&&mapTot(tripStat(t).load)>0}).length;
 var rows=sizes.map(function(z){var pz=fgSum(P,function(r){return r.size==z}),w=sum(P,function(r){return r.size==z?(+r.waste||0):0}),tr=fgSum(T,function(r){return r.size==z&&r.from=='P'}),dx=fgSum(X,function(r){return r.size==z}),rs=fgSum(R,function(r){return r.size==z}),all=['P','G1','G2','V'].reduce(function(a,l){return a+fgGet(bal,l,z)},0);return [esc(z),pz,w,tr,dx,rs,all]});
 var body=rows.map(function(r){return [r[0],'<b>'+nf(r[1])+'</b>',nf(r[2]),nf(r[3]),nf(r[4]),nf(r[5]),'<b>'+nf(r[6])+'</b>']});
 body.push(['<b>TOTAL</b>'].concat([1,2,3,4,5,6].map(function(i){return '<b>'+nf(sum(rows,function(r){return r[i]}))+'</b>'})));
 var mat=sizes.map(function(z){var a=fgGet(bal,'P',z),b=fgGet(bal,'G1',z),c=fgGet(bal,'G2',z),v=fgGet(bal,'V',z),t=a+b+c+v;return [esc(z)+' <small class="muted">('+fgPer(z)+'/case)</small>',nf(a),nf(b),nf(c),nf(v),'<b>'+nf(t)+'</b>','<span class="pill '+(t<=0?'p-red':'p-green')+'">'+(t<=0?'Empty':'In stock')+'</span>']});
 var io=rawIO(),low=rawItems().map(function(k){var o=io[k]||{i:0,o:0};return [k,o.i-o.o]}).filter(function(a){return io[a[0]]&&a[1]<=(S.settings.low||100)*1.5}).sort(function(a,b){return a[1]-b[1]}).slice(0,6);
 return plHero('Plant Stock Overview','Cases made in the plant, moved to godowns, loaded on vehicles and sold to wholesalers, retailers and shops.')+
 '<div class="card" style="margin-top:12px;display:flex;gap:14px;align-items:end;flex-wrap:wrap"><div class="fld" style="min-width:190px"><label for="stk-date">Show activity for date</label><input id="stk-date" type="date" value="'+d+'"></div><div class="qa" style="flex:1;min-width:260px;grid-template-columns:repeat(auto-fit,minmax(150px,1fr))"><button class="q-blue" type="button" data-go="production">＋ Production</button><button class="q-o" type="button" data-go="fg-transfer">⇄ Transfer to Godown</button><button class="q-g" type="button" data-go="fg-dispatch">➜ Dispatch</button><button class="q-v" type="button" data-go="vehicles">🚚 Start Delivery Trip</button></div></div>'+
 '<div class="pflow">'+stage('factory','Produced',fgSum(P),'cases on '+d,'#c2502a')+'<i class="par">→</i>'+stage('box','Plant now',nowAt('P'),'cases at '+esc(locName('P')),'#f59e0b')+'<i class="par">→</i>'+stage('box','Godowns now',god,esc(locName('G1'))+' '+nf(nowAt('G1'))+' · '+esc(locName('G2'))+' '+nf(nowAt('G2')),'#e4b768')+'<i class="par">→</i>'+stage('truck','On vehicles',onVeh,active+' trip(s) out now','#14b8c4')+'<i class="par">→</i>'+stage('rupee','Sold',fgSum(X)+fgSum(R),'Dispatch '+nf(fgSum(X))+' · Routes '+nf(fgSum(R)),'#18a957')+'</div>'+
 '<h3 style="margin:16px 0 8px">Activity on '+d+' (cases)</h3>'+table(['Size','Produced','Rejected (bottles)','Plant → Godown','Dispatched','Sold on routes','Stock now'],body,'')+
 '<h3 style="margin:16px 0 8px">Finished stock now – by location (cases)</h3>'+table(['Size',esc(locName('P')),esc(locName('G1')),esc(locName('G2')),'On vehicles','Total','Status'],mat,'No sizes')+
 '<h3 style="margin:16px 0 8px">Raw material alerts</h3>'+table(['Item','Balance','Status'],low.map(function(a){return [esc(a[0]),'<b>'+nf(a[1])+'</b>',rawPill(a[1])]}),'No low raw materials. Add purchases under Raw Material In.')};

PAGES.production=function(){
 FORMS.prod=function(v){var q=+v.qty,w=+v.waste||0,z=v.size;if(!(q>0))return 'ERROR: Enter the number of cases produced';var id=nid('F',S.fg),pc=fgPer(z),bt=q*pc;
  S.fg.push({id:id,kind:'Production',date:v.date,size:z,qty:q,from:'',to:'P',shift:v.shift,waste:w,note:v.note||'',by:fgBy(),at:new Date().toISOString()});
  var warn='';if(v.auto){[['Empty Bottles - '+z,bt+w],['Caps',bt],['Labels',bt],['Cartons / Packing',q]].forEach(function(x){var have=(stockLevels()[x[0]]||0);S.stock.push({id:nid('S',S.stock),date:v.date,type:'Out',item:x[0],qty:x[1],note:'Production '+id,ref:id});if(have<x[1])warn+=(warn?', ':'')+x[0]});}
  return 'Production saved: '+nf(q)+' cases of '+z+' ('+nf(bt)+' bottles) stored in '+locName('P')+(warn?'. Raw stock is short for: '+warn+' (add purchases)':'')};
 var td=S.fg.filter(function(r){return r.kind=='Production'&&r.date==today()}),sz=fgSizes();
 return head('Production (Manufacturing)','')+kp([['Cases produced today',nf(fgSum(td))],['Rejected bottles today',nf(sum(td,function(r){return +r.waste||0}))]].concat(sz.map(function(z){return [z+' – cases today',nf(fgSum(td,function(r){return r.size==z}))]})))+
 fgForm([{k:'date',l:'Date',t:'date'},{k:'shift',l:'Shift',t:'select',o:['Morning','Afternoon','Evening','Night']},{k:'size',l:'Bottle size',t:'select',o:sz},{k:'qty',l:'Cases produced',t:'number'},{k:'waste',l:'Rejected bottles (loose)',t:'number',r:false,v:0},{k:'note',l:'Note',r:false}],'Save Production','FORM-prod','<label class="chk" style="grid-column:1/-1"><input type="checkbox" name="auto" value="1" checked><span>Auto-deduct raw materials: per bottle 1 empty bottle + 1 cap + 1 label (rejected bottles also use empty bottles), and 1 carton per case</span></label>')+
 table(['Date','Shift','Size','Cases','Bottles','Rejected','Stored in','By',''],fgRows('Production').map(function(r){return [r.date,esc(r.shift||''),esc(r.size),'<b>'+nf(r.qty)+'</b>',nf(r.qty*fgPer(r.size)),nf(r.waste||0),esc(locName(r.to)),esc(r.by||''),del('fg',r.id)]}),'No production entered yet.')};

PAGES['fg-transfer']=function(){
 FORMS.xfer=function(v){var q=+v.qty;if(!(q>0))return 'ERROR: Enter the number of cases';if(v.from==v.to)return 'ERROR: From and To must be different';if(!(v.vehicle||'').trim())return 'ERROR: Vehicle number is required before a transfer can be saved';if(!v.empBy)return 'ERROR: Select the employee who is doing this transfer';var e=fgCheck(v.from,v.size,q);if(e)return e;
  S.fg.push({id:nid('F',S.fg),kind:'Transfer',date:v.date,size:v.size,qty:q,from:v.from,to:v.to,vehicle:(v.vehicle||'').trim(),driver:v.empBy||'',empBy:v.empBy||'',note:v.note||'',by:fgBy(),at:new Date().toISOString()});return 'Transferred '+nf(q)+' cases of '+v.size+' to '+locName(v.to)};
 var td=S.fg.filter(function(r){return r.kind=='Transfer'&&r.date==today()});
 return head('Transfer to Godown','')+plantAvail()+kp([['Cases transferred today',nf(fgSum(td))],['Transfers today',td.length]])+fgChips()+
 formCard([{k:'date',l:'Date',t:'date'},{k:'from',l:'From',t:'select',o:locOpts()},{k:'to',l:'To',t:'select',o:locOpts(['G1','G2','P'])},{k:'size',l:'Bottle size',t:'select',o:fgSizes()},{k:'qty',l:'Cases',t:'number'},{k:'vehicle',l:'Vehicle number *',list:'fg-veh',options:(S.vehicles||[]).map(function(x){return x.number})},{k:'empBy',l:'Employee (transferred by) *',t:'select',o:[['','Select employee']].concat(waterEmps().map(function(e){return [e.name,e.name]}))},{k:'note',l:'Note',r:false}],'Save Transfer','FORM-xfer')+
 table(['Date','Size','Cases','From','To','Vehicle','Employee','By',''],fgRows('Transfer').map(function(r){return [r.date,esc(r.size),'<b>'+nf(r.qty)+'</b>',esc(locName(r.from)),esc(locName(r.to)),esc(r.vehicle||''),esc(r.driver||''),esc(r.by||''),del('fg',r.id)]}),'No transfers yet.')};

PAGES['fg-dispatch']=function(){
 FORMS.disp=function(v){var q=+v.qty;if(!S.customers.length)return 'ERROR: Add a customer first';if(!(q>0))return 'ERROR: Enter the number of cases';var e=fgCheck(v.from,v.size,q);if(e)return e;var c=S.customers.filter(function(x){return x.id==v.cust})[0]||{};
  S.fg.push({id:nid('F',S.fg),kind:'Dispatch',date:v.date,size:v.size,qty:q,from:v.from,to:'',cust:v.cust,custName:c.name||'',saleType:v.stype,bill:v.bill||'',vehicle:v.vehicle||'',driver:v.driver||'',note:v.note||'',by:fgBy(),at:new Date().toISOString()});return 'Dispatched '+nf(q)+' cases of '+v.size+' to '+(c.name||'customer')};
 var td=S.fg.filter(function(r){return r.kind=='Dispatch'&&r.date==today()});
 return head('Dispatch to Customers','')+'<div class="note" style="margin:0 0 12px">Use this for direct godown deliveries (bulk / wholesale). Stock sold by delivery staff on the road is recorded through Vehicle Management → Start Trip / Return Handover.</div>'+kp([['Cases dispatched today',nf(fgSum(td))],['Deliveries today',td.length],['Wholesale today',nf(fgSum(td,function(r){return r.saleType=='Wholesale'}))],['Retail / shops today',nf(fgSum(td,function(r){return r.saleType!='Wholesale'}))]])+fgChips()+
 formCard([{k:'date',l:'Date',t:'date'},{k:'from',l:'From godown',t:'select',o:locOpts(['G1','G2','P'])},{k:'cust',l:'Customer',t:'select',o:custOpts()},{k:'stype',l:'Sale type',t:'select',o:['Wholesale','Retail','Shop']},{k:'size',l:'Bottle size',t:'select',o:fgSizes()},{k:'qty',l:'Cases',t:'number'},{k:'bill',l:'Bill no (optional)',r:false},{k:'vehicle',l:'Vehicle',list:'fg-veh2',options:(S.vehicles||[]).map(function(x){return x.number}),r:false},{k:'driver',l:'Driver',t:'select',o:[['','—']].concat(S.employees.map(function(e){return [e.name,e.name]}))},{k:'note',l:'Note',r:false}],'Save Dispatch','FORM-disp')+
 table(['Date','Customer','Type','Size','Cases','From','Bill','Vehicle','Driver',''],fgRows('Dispatch').map(function(r){return [r.date,esc(r.custName||''),esc(r.saleType||''),esc(r.size),'<b>'+nf(r.qty)+'</b>',esc(locName(r.from)),esc(r.bill||''),esc(r.vehicle||''),esc(r.driver||''),del('fg',r.id)]}),'No dispatches yet.')};

PAGES['godown-stock']=function(){
 FORMS.adj=function(v){var q=+v.qty;if(!(q>0))return 'ERROR: Enter the number of cases';var add=v.dir=='Add';if(!add){var e=fgCheck(v.loc,v.size,q);if(e)return e}
  S.fg.push({id:nid('F',S.fg),kind:'Adjust',date:v.date,size:v.size,qty:q,from:add?'':v.loc,to:add?v.loc:'',note:v.reason||'',by:fgBy(),at:new Date().toISOString()});return 'Stock adjusted'};
 FORMS.locn=function(v){S.settings.locNames={P:(v.p||'').trim()||'Plant',G1:(v.g1||'').trim()||'Godown 1',G2:(v.g2||'').trim()||'Godown 2'};return 'Location names saved'};
 var bal=fgBal(),sz=fgSizes();
 var cards=['P','G1','G2'].map(function(l){var t=sum(sz,function(z){return fgGet(bal,l,z)});return '<section class="card"><div class="card-h"><h3>'+esc(locName(l))+'</h3><span class="pill p-blue">'+nf(t)+' cases</span></div>'+table(['Size','Cases'],sz.map(function(z){return [esc(z),'<b>'+nf(fgGet(bal,l,z))+'</b>']}),'')+'</section>'}).join('');
 return head('Godown Stock','')+'<div class="grid3b">'+cards+'</div>'+
 '<h3 style="margin:18px 0 8px">Stock adjustment (damaged, lost, or count correction)</h3>'+formCard([{k:'date',l:'Date',t:'date'},{k:'loc',l:'Location',t:'select',o:locOpts()},{k:'size',l:'Bottle size',t:'select',o:sz},{k:'dir',l:'Type',t:'select',o:[['Remove','Remove (damaged / lost)'],['Add','Add (found / correction)']]},{k:'qty',l:'Cases',t:'number'},{k:'reason',l:'Reason',r:false}],'Save Adjustment','FORM-adj')+
 '<h3 style="margin:18px 0 8px">Location names</h3>'+formCard([{k:'p',l:'Plant',v:locName('P')},{k:'g1',l:'Godown 1',v:locName('G1')},{k:'g2',l:'Godown 2',v:locName('G2')}],'Save Names','FORM-locn')+
 '<h3 style="margin:18px 0 8px">Adjustments</h3>'+table(['Date','Location','Size','Change (cases)','Reason','By',''],fgRows('Adjust').map(function(r){return [r.date,esc(locName(r.to||r.from)),esc(r.size),(r.to?'+':'−')+nf(r.qty),esc(r.note||''),esc(r.by||''),del('fg',r.id)]}),'No adjustments.')};

PAGES['emp-stock']=function(){
 var f=ESFROM||today(),t=ESTO||today(),trips=S.vehicleTrips.filter(function(x){return x.date&&x.date>=f&&x.date<=t&&mapTot(tripStat(x).load)>0});
 var by={};trips.forEach(function(x){var s=tripStat(x),o=by[x.employee]||(by[x.employee]={n:0,load:{},sold:{},ret:{},short:{}});o.n++;['load','sold','ret','short'].forEach(function(k){Object.keys(s[k]).forEach(function(z){o[k][z]=(o[k][z]||0)+s[k][z]})})});
 var rows=Object.keys(by).map(function(e){var o=by[e];return [esc(empName(e)),o.n,'<b>'+nf(mapTot(o.load))+'</b>','<b style="color:var(--green)">'+nf(mapTot(o.sold))+'</b>',nf(mapTot(o.ret)),'<span style="color:'+(mapTot(o.short)>0?'var(--red)':'inherit')+'">'+nf(mapTot(o.short))+'</span>',sizeTxt(o.load),sizeTxt(o.sold)]});
 var all={load:0,sold:0,ret:0,short:0};trips.forEach(function(x){var s=tripStat(x);for(var k in all)all[k]+=mapTot(s[k])});
 var det=trips.slice().reverse().map(function(x){var s=tripStat(x),open=!x.handoverAt;return [esc(x.date),esc(empName(x.employee)),esc(vehNo(x.vehicle)),esc(locName(x.godown)),esc(x.startReading)+(open?'':' → '+esc(x.endReading)),sizeTxt(s.load),open?'<span class="pill p-amber">Out on route</span>':sizeTxt(s.sold),open?'-':sizeTxt(s.ret),open?'-':(mapTot(s.short)>0?'<span style="color:var(--red)">'+sizeTxt(s.short)+'</span>':'-')]});
 return head('Delivery Staff Stock Report','')+'<div class="card" style="display:flex;gap:14px;flex-wrap:wrap;align-items:end"><div class="fld"><label for="es-from">From</label><input id="es-from" type="date" value="'+f+'"></div><div class="fld"><label for="es-to">To</label><input id="es-to" type="date" value="'+t+'"></div><button class="btn alt" type="button" data-go="vehicles">Start / close a trip →</button></div>'+
 kp([['Trips',trips.length],['Cases loaded',nf(all.load)],['Cases sold',nf(all.sold)],['Cases returned',nf(all.ret)],['Shortage',nf(all.short)]])+
 '<h3 style="margin:8px 0 8px">Employee-wise</h3>'+table(['Employee','Trips','Loaded','Sold','Returned','Shortage','Loaded – by size','Sold – by size'],rows,'No trips with stock in this period.')+
 '<h3 style="margin:16px 0 8px">Trip details</h3>'+table(['Date','Employee','Vehicle','Godown','Meter (KM)','Loaded','Sold','Returned','Shortage'],det,'No trips in this period.')};

function rawPage(type){var out=type=='Out',f='raw'+type;
 FORMS[f]=function(v){var q=+v.qty,it=(v.item||'').trim();if(!it||!(q>0))return 'ERROR: Enter item and quantity';
  if(out){var have=stockLevels()[it]||0;if(q>have)return 'ERROR: Only '+nf(have)+' '+it+' available'}
  var r={id:nid('S',S.stock),date:v.date,type:type,item:it,qty:q,note:out?v.purpose:(v.supplier?'Purchase - '+v.supplier:'Purchase')};if(!out){var tot=+v.amount||0,pd=+v.paid||0,sp=digits(v.sphone);if(pd>tot+0.0001)return 'ERROR: Amount paid cannot be more than the total purchase amount';if(v.sphone&&sp.length!=10)return 'ERROR: Supplier mobile number must be 10 digits';r.supplier=(v.supplier||'').trim();r.sphone=sp;r.saddr=(v.saddr||'').trim();r.amount=tot;r.paid=pd;r.pending=round2(tot-pd);r.bill=takeUpl('rawbill')}S.stock.push(r);return 'Raw material '+(out?'issued':'purchase saved')};
 var l=S.stock.filter(function(r){return r.type==type&&!r.ref}),td=l.filter(function(r){return r.date==today()});
 var flds=out?[{k:'item',l:'Item',list:'raw-items',options:rawItems()},{k:'qty',l:'Quantity',t:'number'},{k:'purpose',l:'Purpose',t:'select',o:['Production','Damaged / Wasted','Returned to supplier','Other']},{k:'date',l:'Date',t:'date'}]:[{k:'item',l:'Item',list:'raw-items',options:rawItems()},{k:'qty',l:'Quantity',t:'number'},{k:'supplier',l:'Supplier name',r:false},{k:'sphone',l:'Supplier mobile number',t:'tel',r:false},{k:'saddr',l:'Supplier address',r:false},{k:'amount',l:'Total purchase amount (₹)',t:'number',r:false},{k:'paid',l:'Amount paid to supplier (₹)',t:'number',r:false,v:0},{k:'date',l:'Date',t:'date'},{k:'rawbill',l:'Upload purchase bill / document (photo or PDF)',t:'file',r:false}];
 return head(out?'Raw Material Used / Issued':'Raw Material In (Purchase)','')+kp([['Entries today',td.length],['Quantity today',nf(sum(td,function(r){return r.qty}))]].concat(out?[]:[['Purchase value today',inr(sum(td,function(r){return +r.amount||0}))],['Pending to suppliers',inr(sum(l,function(r){return r.paid==null?0:Math.max(0,(+r.amount||0)-(+r.paid||0))}))]]))+
 (out?'<div class="note" style="margin:0 0 12px">Production entries deduct bottles, caps, labels and cartons automatically. Use this page for other usage such as wastage or returns.</div>':'<div class="note" style="margin:0 0 12px">Enter your current stock once as “Opening stock”, then add every purchase here. Empty bottles are named “Empty Bottles - 1 L” etc. (quantities in pieces).</div>')+
 formCard(flds,out?'Save Usage':'Save Purchase','FORM-'+f)+
 table(out?['Date','Item','Qty','Purpose','']:['Date','Item','Qty','Supplier','Mobile','Address','Total','Paid','Pending','Bill',''],l.slice().reverse().map(function(r){return out?[r.date,esc(r.item),'<b>'+nf(r.qty)+'</b>',esc(r.note||''),del('stock',r.id)]:[r.date,esc(r.item),'<b>'+nf(r.qty)+'</b>',esc(r.supplier||''),esc(r.sphone||'-'),esc(r.saddr||'-'),r.amount?inr(r.amount):'-',r.paid==null?'-':inr(r.paid),r.paid==null?'-':'<b style="color:'+(r.amount-r.paid>0?'var(--red)':'var(--green)')+'">'+inr(Math.max(0,r.amount-r.paid))+'</b>',vdoc('stock',r.id),del('stock',r.id)]}),'Nothing here yet.')}
PAGES['stock-in']=function(){return rawPage('In')};
PAGES['stock-out']=function(){return rawPage('Out')};
PAGES['current-stock']=function(){var io=rawIO(),items=rawItems();return head('Raw Material Stock','')+kp([['Items',items.length],['Low / empty',items.filter(function(k){var o=io[k]||{i:0,o:0};return o.i-o.o<=(S.settings.low||100)*.6}).length]])+table(['Item','Total in','Total used','In hand','Status'],items.map(function(k){var o=io[k]||{i:0,o:0},n=o.i-o.o;return [esc(k),nf(o.i),nf(o.o),'<b>'+nf(n)+'</b>',rawPill(n)]}))};
function fgDest(r){if(r.kind=='EmpLoad')return 'Employee '+esc(empName(r.emp))+(r.vehicle?' · '+esc(r.vehicle):'');if(r.kind=='EmpReturn')return esc(locName(r.to))+' (returned by '+esc(empName(r.emp))+')';if(r.kind=='Dispatch')return esc(r.custName||'')+' ('+esc(r.saleType||'')+')';if(r.kind=='Load')return 'On vehicle '+esc(vehNo(r.vehicle));if(r.kind=='TripSale')return 'Route sale – '+esc(empName(r.emp));if(r.kind=='Shortage')return 'Shortage – '+esc(empName(r.emp));if(r.kind=='Return')return esc(locName(r.to))+' (returned by '+esc(empName(r.emp))+')';return esc(locName(r.to))}
PAGES['stock-history']=function(){return head('Stock History','')+'<h3 style="margin:6px 0 8px">Finished stock movements (cases)</h3>'+table(['Date','Type','Size','Cases','From','To / Customer','Details','By',''],S.fg.slice().reverse().map(function(r){var det=r.kind=='Production'?esc(r.shift||'')+(r.waste?' · rejected '+nf(r.waste)+' btl':''):esc(r.note||r.vehicle||'');return [r.date,kindPill(r.kind),esc(r.size),'<b>'+nf(r.qty)+'</b>',r.from?esc(locName(r.from)):'Production',fgDest(r),det,esc(r.by||''),delFg(r)]}),'No production movements yet.')+
 '<h3 style="margin:18px 0 8px">Raw material ledger</h3>'+table(['Date','Type','Item','Qty','Note',''],S.stock.slice().reverse().map(function(r){return [r.date,'<span class="pill '+(r.type=='In'?'p-green':'p-amber')+'">'+r.type+'</span>',esc(r.item),nf(r.qty),esc(r.note||''),del('stock',r.id)]}),'No raw material entries.')};
PAGES['rep-stock']=function(){var bal=fgBal(),sz=fgSizes(),io=rawIO();return head('Stock Reports','')+'<h3 style="margin:6px 0 8px">Finished stock (cases)</h3>'+table(['Size','Total produced','Dispatched','Sold on routes','Shortage','In stock now'],sz.map(function(z){return [esc(z),nf(fgSum(S.fg,function(r){return r.kind=='Production'&&r.size==z})),nf(fgSum(S.fg,function(r){return r.kind=='Dispatch'&&r.size==z})),nf(fgSum(S.fg,function(r){return r.kind=='TripSale'&&r.size==z})),nf(fgSum(S.fg,function(r){return r.kind=='Shortage'&&r.size==z})),'<b>'+nf(['P','G1','G2','V'].reduce(function(a,l){return a+fgGet(bal,l,z)},0))+'</b>']}))+'<h3 style="margin:18px 0 8px">Raw materials</h3>'+table(['Item','Total in','Total used','Balance'],rawItems().map(function(k){var o=io[k]||{i:0,o:0};return [esc(k),nf(o.i),nf(o.o),'<b>'+nf(o.i-o.o)+'</b>']}))};
document.addEventListener('change',function(e){var i=e.target.id;if(i=='stk-date'){STKDATE=e.target.value||'';render()}else if(i=='es-from'){ESFROM=e.target.value||'';render()}else if(i=='es-to'){ESTO=e.target.value||'';render()}});


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
 eaBox()+'<div class="card nb-sec"><h3>Customer details</h3><div class="nb-cust">'+
  '<div class="fld sugwrap"><label for="nb-name">Customer Name *</label><input id="nb-name" name="name" placeholder="Type name or mobile to search" autocomplete="off" value="'+esc(d.name)+'"><div id="sug" class="sug" hidden></div></div>'+
  '<div class="fld"><label for="nb-mob">Mobile Number *</label><input id="nb-mob" name="mobile" type="tel" inputmode="numeric" maxlength="10" placeholder="10-digit mobile" value="'+esc(d.mobile)+'"></div>'+
  '<div class="fld wide"><label for="nb-addr">Address *</label><input id="nb-addr" name="addr" placeholder="Door no, street, area, town" value="'+esc(d.addr)+'"></div>'+
  '<div class="fld wide"><label>Customer location</label><div class="locrow"><button type="button" class="btn alt sm" data-loc="save">📍 Save Location</button><span id="locnote"></span></div></div>'+
  '</div>'+
  '<div id="custnote" class="note"></div></div>'+
 '<div class="card nb-sec"><h3>Order / delivery details <small class="muted">(optional – shown on the invoice)</small></h3><div class="nb-pay"><div class="fld"><label for="nb-gstin">Buyer GSTIN (if any)</label><input id="nb-gstin" value="'+esc((d.x||{}).gstin||'')+'" placeholder="Buyer GST number"></div><div class="fld"><label for="nb-po">Buyer’s order no.</label><input id="nb-po" value="'+esc((d.x||{}).po||'')+'"></div><div class="fld"><label for="nb-veh">Dispatched through (vehicle)</label><input id="nb-veh" value="'+esc((d.x||{}).veh||'')+'" placeholder="Vehicle number"></div><div class="fld"><label for="nb-dest">Destination</label><input id="nb-dest" value="'+esc((d.x||{}).dest||'')+'"></div></div></div>'+
'<div class="card nb-sec"><h3>Bill type</h3><div class="seg" role="radiogroup" aria-label="Bill type"><label class="segi"><input type="radio" name="gst" value="0"'+(NB.gst?'':' checked')+'><span>Without GST</span></label><label class="segi"><input type="radio" name="gst" value="1"'+(NB.gst?' checked':'')+'><span>With GST (5%)</span></label></div><div id="gstnote" class="note"></div></div>'+
 '<div class="card nb-sec"><h3>Items</h3><div id="nblines"></div><button type="button" class="btn alt" data-nb="add">+ Add Item</button></div>'+
 '<div class="card nb-sec"><h3>Payment</h3><div class="nb-pay"><div class="fld"><label for="nb-mode">Payment mode</label><select id="nb-mode" name="mode">'+MODES.map(function(m){return '<option'+(m==d.mode?' selected':'')+'>'+m+'</option>'}).join('')+'</select></div>'+
  '<div class="fld"><label for="nb-rec">Amount Received (₹)</label><input id="nb-rec" name="rec" type="number" min="0" step="any" inputmode="decimal" value="'+(d.paid?d.paid:'')+'" placeholder="0"></div></div>'+
  '<div id="nb-payx">'+payFields(d.mode||'Cash',d.ref)+'</div>'+
  '<div id="upi-qr-card" class="upi-qr-card" hidden><div><div class="fld upi-qr-amount"><label for="nb-qr-amount">QR Amount (₹)</label><input id="nb-qr-amount" type="number" min="0.01" step="0.01" inputmode="decimal" placeholder="Enter customer payment amount"></div><div class="upi-qr-visual"><div id="upi-qr-code"></div></div></div><div class="upi-qr-info"><h4>Scan & Pay with PhonePe / UPI</h4><p id="upi-qr-payee"></p><p id="upi-qr-total"><b>QR Amount: ₹0</b></p><div class="upiw"></div><p id="upi-qr-hint" class="upi-qr-warn">Set your UPI ID in Business Settings to generate the QR.</p><div class="upi-qr-actions"><button type="button" class="btn alt" id="upi-qr-refresh">Refresh QR</button></div></div></div>'+
  '<div id="gstrow" class="gstrow" hidden></div><div class="sumbox"><div><small>Total Bill</small><b id="s-tot">₹0</b></div><div><small>Amount Received</small><b id="s-rec" class="g">₹0</b></div><div><small>Credit (Balance)</small><b id="s-bal" class="r">₹0</b></div></div>'+
  '<div id="prevdue" class="note"></div></div>'+
 '<div class="nb-actions"><div class="nb-barsum" id="nb-barsum"></div><div class="nb-btns"><button type="button" class="btn alt" data-nb="clear">'+(eb?'Reset':'Clear')+'</button><button type="submit" class="btn">'+(eb?'Update Bill':'Save Bill')+'</button></div></div></form>'}
function billInit(){NB.loc=null;renderLines();calcNB();custNote();gstNote();initUPIQR();locPaint()}
function upiUri(amount){var id=String(S.settings.upiId||'').trim(),name=String(S.settings.upiPayee||S.settings.name||'Larven Enterprises').trim();if(!id||!(amount>0))return '';return 'upi://pay?pa='+encodeURIComponent(id)+'&pn='+encodeURIComponent(name)+'&am='+encodeURIComponent(round2(amount).toFixed(2))+'&cu=INR&tn='+encodeURIComponent((S.settings.name||'Larven Enterprises')+' Bill '+(NB.edit||'New Bill'))}
function updateUPIQR(){var card=$('#upi-qr-card');if(!card)return;var mode=$('#nb-mode').value;if(mode!=='PhonePe'&&mode!=='GPay'){card.hidden=true;return}card.hidden=false;var amountEl=$('#nb-qr-amount'),amount=+(amountEl.value||0),id=String(S.settings.upiId||'').trim(),box=$('#upi-qr-code'),hint=$('#upi-qr-hint');$('#upi-qr-payee').textContent='Payee: '+(S.settings.upiPayee||S.settings.name||'Larven Enterprises')+' · UPI ID: '+(id||'Not configured');$('#upi-qr-total').innerHTML='<b>QR Amount: '+money(amount)+'</b>';box.innerHTML='';if(!id){hint.textContent='Set your UPI ID in Business Settings, then return to New Bill.';hint.hidden=false;return}if(!(amount>0)){hint.textContent='Enter a QR Amount greater than zero.';hint.hidden=false;return}if(typeof QRCode==='undefined'){hint.textContent='QR library did not load. Check internet connection and refresh the page.';hint.hidden=false;return}hint.textContent='Customer can scan this QR using PhonePe or another UPI app. Payment is not automatically verified.';hint.hidden=false;try{new QRCode(box,{text:upiUri(amount),width:210,height:210,colorDark:'#111827',colorLight:'#ffffff',correctLevel:QRCode.CorrectLevel.M})}catch(e){hint.textContent='Could not generate QR. Check the UPI ID in Business Settings.'}}
function initUPIQR(){var card=$('#upi-qr-card');if(!card)return;var total=round2(totalNB()+gstAmt(totalNB())),amt=$('#nb-qr-amount');if(amt&&!amt.value)amt.value=total>0?total.toFixed(2):'';updateUPIQR()}
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
  '<div class="fld"><label>Price (₹ per case)</label><input class="lr" type="number" min="0" step="any" inputmode="decimal" placeholder="Enter price" value="'+(l.r>0?l.r:'')+'" aria-label="Price per case"'+dis+'>'+(l.pi>=0&&P[l.pi]&&P[l.pi].r?'<small class="muted">Rate list: '+money(P[l.pi].r)+'</small>':'')+'</div>'+
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
function calcNB(){try{eaRefresh()}catch(e){}var sub=totalNB(),g=gstAmt(sub),t=round2(sub+g),r=+($('#nb-rec')||{}).value||0;
 $('#s-tot').textContent=money(t);$('#s-rec').textContent=money(r);var b=round2(t-r);
 var el=$('#s-bal');el.textContent=money(Math.abs(b));el.className=b<0?'r':(b==0?'g':'r');
 el.previousElementSibling.textContent=b<0?'Excess received':'Credit (Balance)';
 var gr=$('#gstrow');if(gr){gr.hidden=!NB.gst;gr.innerHTML=NB.gst?'<span>Items total <b>'+money(sub)+'</b></span><span>CGST 2.5% <b>'+money(round2(g/2))+'</b></span><span>SGST 2.5% <b>'+money(round2(g-round2(g/2)))+'</b></span>':''}var qa=$('#nb-qr-amount');if(qa&&document.activeElement!==qa){var qv=r>0?r:t;qa.value=qv>0?(+qv).toFixed(2):''}var bs=$('#nb-barsum');if(bs)bs.innerHTML='Total <b>'+money(t)+'</b> &nbsp;·&nbsp; Received <b>'+money(r)+'</b> &nbsp;·&nbsp; '+(b<0?'Excess':'Balance')+' <b class="'+(b>0?'r':'')+'">'+money(Math.abs(b))+'</b>';updateUPIQR()}
function lookup(q){q=q.trim().toLowerCase();var d=digits(q);if(q.length<1)return [];
 return visibleCustomers().filter(function(c){return c.name.toLowerCase().indexOf(q)>-1||(d&&/\d/.test(q)&&digits(c.phone).indexOf(d)>-1)}).slice(0,6)}
function showSug(){var src=document.activeElement&&document.activeElement.id=='nb-mob'?$('#nb-mob'):$('#nb-name'),list=lookup(src.value),box=$('#sug');
 if(!list.length){box.hidden=true;return}
 box.innerHTML=list.map(function(c){return '<button type="button" data-nb="pick" data-id="'+c.id+'"><span>'+esc(c.name)+'</span><small>'+esc(c.phone)+'</small></button>'}).join('');box.hidden=false}
function custNote0(){var m=digits($('#nb-mob').value),c=S.customers.filter(function(x){return digits(x.phone)==m})[0],n=$('#custnote'),pd=$('#prevdue');if(!n)return;
 if(c){
  n.className='note ex';
  var o=outstanding(c.id);
  var noteText='Existing customer: '+c.name;
  if(c.credit_limit&&c.credit_limit>0){
    noteText+=' · Credit limit: '+money(c.credit_limit);
    if(o>c.credit_limit)noteText+=' ⚠️ Warning: Dues exceed credit limit!';
  }
  n.textContent=noteText;
  var dueTxt=o>0?'Total pending of this customer: '+money(o)+(NB.edit?'':' (not included in this bill)'):'';
  if(c.credit_limit&&c.credit_limit>0&&o>c.credit_limit){
    pd.innerHTML=(dueTxt?dueTxt+'<br>':'')+'<span style="color:var(--red);font-weight:600">⚠️ Credit limit warning: Outstanding ('+money(o)+') exceeds limit ('+money(c.credit_limit)+'). (Warning only)</span>';
  }else{
    pd.textContent=dueTxt;
  }
 }
 else if(m.length==10){n.className='note new';n.textContent='New customer. They will be added to Customers when you save the bill.';pd.textContent=''}
 else{n.className='note';n.textContent='Name, mobile number and address are all required to save the bill. Search an existing customer by name or mobile.';pd.textContent=''}}
function custNote(){custNote0();locPaint()}
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
 var items=NB.lines.filter(function(l){return l.q>0}).map(function(l){var p=lc(l);return {
  p: p.n,
  q: l.q,
  r: Number(l.r) || 0,
  cs: p.c,
  rate_source: 'manual',
  entered_by: (CURRENT_PROFILE && (CURRENT_PROFILE.full_name || CURRENT_PROFILE.id)) || 'staff'
}});
 if(!items.length)return bad('#nblines .lp','Select a product and enter cases or quantity');
 if(NB.lines.some(function(l){return l.q>0&&!(l.r>0)}))return bad('#nblines .lr','Enter the price for every item');
 var sub=totalNB(),tax=gstAmt(sub),total=round2(sub+tax),rec=round2(+$('#nb-rec').value||0);
 if(NB.gst&&!S.settings.gst){toast('Add your GST number in Settings first');return}
 if(rec<0)return bad('#nb-rec','Amount received cannot be negative');
 if(rec>total)return bad('#nb-rec','Amount received cannot be more than the bill total');
 if((mode=='PhonePe'||mode=='GPay')&&$('#nb-qr-amount')&&round2(+$('#nb-qr-amount').value||0)!==rec)return bad('#nb-qr-amount','QR amount and amount received must be the same');
 var ref=readPayRef(mode);if(ref===false)return;
 var c=S.customers.filter(function(x){return digits(x.phone)==mob})[0],isNew=!c;
 if(!c){c={id:nid('C',S.customers),name:name,phone:mob,area:addr,date:today()};S.customers.push(c)}
 if(NB.edit){
  var b=S.bills.filter(function(x){return x.id==NB.edit})[0];
  if(!isNew){c.name=name;c.area=addr}
  var prev=round2(b.paid);b.cust=c.id;b.name=name;b.mobile=mob;b.addr=addr;b.items=items;b.total=total;b.gst=!!NB.gst;b.sub=sub;b.tax=tax;b.mode=mode;b.ref=ref;b.x=Object.assign({},b.x&&b.x.from?{from:b.x.from,type:b.x.type}:{},readNbX());b.by=b.by||curUser();if(NB.loc){c.loc=NB.loc}
  if(rec==prev){S.payments.forEach(function(p){if(p.bill==b.id)p.cust=c.id})}
  else{S.payments=S.payments.filter(function(p){return p.bill!=b.id});
   if(rec>0)S.payments.push({id:nid('P',S.payments),date:b.date,cust:c.id,amount:rec,mode:mode,bill:b.id})}
  save();EDITID=null;toast('Bill '+b.id+' updated');location.hash='#bills';return}
 if(!isNew){c.area=addr||c.area}
 var nb={id:nid('B',S.bills),date:today(),cust:c.id,name:name,mobile:mob,addr:addr,items:items,total:total,gst:!!NB.gst,sub:sub,tax:tax,paid:rec,mode:mode,by:curUser(),time:new Date().toTimeString().slice(0,5),ref:ref,x:readNbX()};
 if(NB.loc)c.loc=NB.loc;
 S.bills.push(nb);
 if(rec>0)S.payments.push({id:nid('P',S.payments),date:nb.date,cust:c.id,amount:rec,mode:mode,bill:nb.id});
 save();EDITID=null;NBPRE=null;render();showSaved(nb,isNew)}
document.addEventListener('submit',function(e){if(e.target.id=='nbform'){e.preventDefault();saveBill()}});
document.addEventListener('change',function(e){if(e.target.id=='nb-mode'){var rc0=$('#nb-rec'),tt0=round2(totalNB()+gstAmt(totalNB()));if((e.target.value=='PhonePe'||e.target.value=='GPay')&&rc0&&!(+rc0.value>0)&&tt0>0)rc0.value=tt0.toFixed(2);calcNB()}if(e.target.name=='gst'&&e.target.closest('#nbform')){NB.gst=e.target.value=='1';gstNote();calcNB()}});
document.addEventListener('click',function(e){if(e.target&&e.target.id=='upi-qr-refresh')updateUPIQR()});
document.addEventListener('input',function(e){var t=e.target;
 if(t.id=='nb-name'||t.id=='nb-mob'||t.id=='nb-addr')clearErr(t);
 if(t.id=='nb-name'){showSug();custNote()}
 else if(t.id=='nb-mob'){t.value=t.value.replace(/\D/g,'').slice(0,10);showSug();custNote();var c=S.customers.filter(function(x){return digits(x.phone)==t.value})[0];if(c&&!$('#nb-name').value.trim()){$('#nb-name').value=c.name;$('#nb-addr').value=c.area||''}}
 else if(t.id=='nb-rec')calcNB();
 else if(t.id=='nb-qr-amount'){var rcx=$('#nb-rec');if(rcx)rcx.value=t.value;calcNB()}
 else if(t.classList.contains('lq')||t.classList.contains('lr')||t.classList.contains('lcs')){var row=t.closest('.nbl'),i=+row.dataset.i,l=NB.lines[i];
  if(t.classList.contains('lcs'))l.q=Math.max(0,Math.round((+t.value||0)*(lc(l).c||1)));else if(t.classList.contains('lq'))l.q=Math.max(0,Math.floor(+t.value||0));
  l.r=Math.max(0,+row.querySelector('.lr').value||0);paintLine(l,i);calcNB()}});

document.addEventListener('change',function(e){var t=e.target;if(t.classList.contains('lp')){var i=+t.dataset.i,k=+t.value,o=NB.lines[i];
 if(k>=0){var p=S.settings.products[k],cs=o.q>0?o.q/(lc(o).c||1):0;NB.lines[i]={pi:k,q:Math.round(cs*p.c),r:(o.r>0?o.r:0)};renderLines();calcNB()}
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
function locAddr(i){var a=(S.settings.locAddr||{})[i]||'';return a}
function billX(b){var x=b.x||{},o={};Object.keys(x).forEach(function(k){o[k]=x[k]});if(x.from){o.fn=locName(x.from);o.fa=locAddr(x.from)}return o}
function billData(b){var c=S.customers.filter(function(x){return x.id==b.cust})[0]||{};
 return {id:b.id,date:b.date,name:b.name||c.name||'Walk-in customer',mobile:b.mobile||c.phone||'',addr:b.addr||c.area||'',
  by:b.by||'',time:b.time||'',ref:b.ref||null,x:billX(b),items:b.items.map(function(i){return {p:i.p,q:i.q,r:i.r,cs:i.cs||0}}),total:b.total,paid:b.paid,mode:b.mode,gst:!!b.gst,sub:b.gst&&b.sub!=null?b.sub:b.total,tax:b.gst?(b.tax||0):0,
  biz:(function(){var B=bset();return {n:B.n,a:B.a,p:B.p,g:b.gst?B.g:'',x:{pan:B.pan,em:B.em,st:B.st,sc:B.sc,tag:B.tag,hsn:B.hsn,bk:B.bk,ac:B.ac,ifs:B.ifs,br:B.br,ho:B.ho,de:B.de,tc:B.tc,wm:B.wm,qr:B.qr}}})()}}
var SHEETCSS='.sheet{position:relative;background:#fff;color:#2b1a16;font-family:"Plus Jakarta Sans",system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;font-size:12.5px;line-height:1.45;border:2px solid #8a2a24;border-radius:6px;padding:0 0 14px;max-width:794px;margin:0 auto;overflow:hidden;-webkit-print-color-adjust:exact;print-color-adjust:exact}.sheet *{box-sizing:border-box}'+
'.sh-wm{position:absolute;left:0;right:0;top:50%;transform:translateY(-50%) rotate(-28deg);text-align:center;font-size:62px;font-weight:900;letter-spacing:5px;color:rgba(138,42,36,.065);white-space:nowrap;pointer-events:none;user-select:none;z-index:3}'+
'.sh-top{display:flex;justify-content:space-between;align-items:center;gap:14px;padding:18px 26px;background:linear-gradient(120deg,#5e1a17,#8a2a24 60%,#a8452b);color:#fff}.sh-brand{display:flex;gap:14px;align-items:center;min-width:0}.sh-logo{width:52px;height:52px;flex:none;border-radius:50%;border:2px solid rgba(255,255,255,.55);display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,.1)}.sh-brand h1{margin:0;font-size:22px;font-weight:800;letter-spacing:.2px;line-height:1.15;color:#fff}.sh-brand .tag{margin-top:3px;font-size:10px;letter-spacing:2.2px;color:#f1c9a5;font-weight:600}'+
'.sh-title{text-align:right;flex:none}.sh-title h2{margin:0 0 6px;font-size:21px;letter-spacing:4px;font-weight:800;color:#fff}.stp{display:inline-block;padding:3px 14px;border-radius:20px;font-size:10.5px;font-weight:800;letter-spacing:1.4px;background:#fff}.stp.ok{color:#12803f}.stp.pt{color:#b45f00}.stp.un{color:#b42318}'+
'.sh-cbar{display:flex;flex-wrap:wrap;gap:3px 18px;justify-content:center;padding:7px 26px;background:#f6ece5;color:#5b3a32;font-size:11px;font-weight:600;border-bottom:2px solid #c58a55}'+
'.sh-info{display:grid;grid-template-columns:1fr 1fr;gap:14px;padding:14px 26px 4px;align-items:start}.sh-pl{display:grid;gap:10px}.sh-party{border:1px solid #b9a198;border-top:3px solid #8a2a24;border-radius:5px;padding:9px 12px;min-width:0}.lb{font-size:10px;letter-spacing:1.3px;text-transform:uppercase;font-weight:800;color:#8a2a24;margin-bottom:4px}.sh-party .nm{font-size:14px;font-weight:800}.sh-party .ad{color:#5b4a43;overflow-wrap:anywhere}'+
'.sh-pr{display:grid;gap:8px;min-width:0}.sh-qr{display:flex;align-items:center;gap:10px;justify-content:flex-end;text-align:right}.sh-qr img{width:92px;height:92px;border:1px solid #e6d9d1;border-radius:4px;padding:3px;background:#fff}.sh-qr small{max-width:110px;font-size:10px;color:#7a6760;font-weight:600;line-height:1.3}'+
'.sh-grid{display:grid;grid-template-columns:1fr 1fr;border:1px solid #b9a198;border-radius:5px;overflow:hidden}.gc{padding:6px 10px;border-bottom:1px solid #d9c6bb;border-right:1px solid #d9c6bb;min-width:0}.gc:nth-child(2n){border-right:0}.gc small{display:block;font-size:9.5px;letter-spacing:.8px;text-transform:uppercase;color:#7a6760;font-weight:700}.gc b{font-size:12px;overflow-wrap:anywhere}'+
'.sh-tw{padding:10px 26px 0;overflow-x:auto}.sh-t{width:100%;border-collapse:collapse;table-layout:fixed;min-width:520px}.sh-t col.w1{width:34px}.sh-t col.w2{width:92px}.sh-t col.w3{width:58px}.sh-t col.w4{width:92px}.sh-t col.w5{width:104px}.sh-t th{border:1px solid #6e1f1a;background:#8a2a24;color:#fff;padding:8px 8px;font-size:10.5px;text-transform:uppercase;letter-spacing:.6px;font-weight:700;text-align:left;white-space:nowrap}.sh-t td{padding:8px;border:1px solid #d9c6bb;vertical-align:middle;overflow-wrap:anywhere}.sh-t tbody tr:nth-child(even) td{background:rgba(138,42,36,.035)}.sh-t .r{text-align:right;font-variant-numeric:tabular-nums}.sh-t .c{text-align:center}.sh-t td.hs{white-space:nowrap;font-size:11.5px}.sh-t .amt{font-weight:700}.sh-t td small{display:block;color:#7a6760;font-size:10px}.sh-t tr.tx td{border-top:0;border-bottom:0;font-size:11.5px;color:#5b4a43;background:transparent!important}.sh-t tfoot td{border:1px solid #d9c6bb;border-top:2px solid #8a2a24;padding-top:9px;font-size:13px}.sh-t .gtc{color:#8a2a24;font-size:14px}'+
'.sh-words{display:flex;justify-content:space-between;align-items:flex-end;gap:10px;margin:10px 26px 0;padding:9px 12px;background:#faf4ef;border:1px solid #b9a198;border-left:4px solid #8a2a24;border-radius:3px}.sh-words b{display:block;font-size:13px}.sh-words i{font-size:10.5px;color:#7a6760}.sh-h{min-width:0;table-layout:auto}.sh-h th{background:#f6ece5;color:#5e1a17;font-size:10px}.sh-h td{font-size:11.5px}.sh-h tr.tt td{font-weight:800;border-top:1px solid #8a2a24}.sh-tx{margin:8px 26px 0;font-size:11.5px;color:#5b4a43}'+
'.sh-lower{display:grid;grid-template-columns:1.15fr 1fr;gap:16px;padding:12px 26px 0;align-items:start}.sh-pan{margin-bottom:6px;font-size:12px}.sh-decl{font-size:11px;color:#5b4a43;border:1px solid #b9a198;border-radius:5px;padding:8px 10px}.sh-bank{margin-top:8px;border:1px solid #b9a198;border-radius:5px;padding:8px 10px}.sh-bank dl{margin:0;display:grid;grid-template-columns:auto 1fr;gap:2px 12px;font-size:11.5px}.sh-bank dt{color:#7a6760}.sh-bank dd{margin:0;font-weight:700;overflow-wrap:anywhere}'+
'.sh-sum>div{display:flex;justify-content:space-between;gap:10px;padding:6px 4px;font-size:13px;border-bottom:1px solid #efe4de}.sh-sum span:last-child{font-variant-numeric:tabular-nums;font-weight:600}.sh-sum .gt{background:#8a2a24;color:#fff;border:0;padding:9px 12px;border-radius:5px;margin-bottom:4px;font-weight:800;font-size:14px}.sh-sum .gt span:last-child{font-weight:800}.sh-sum .due{background:#fff3df;color:#b45f00;border:1px solid #f2c88a;padding:8px 12px;border-radius:5px;font-weight:800;margin-top:6px;font-size:13.5px}.sh-sum .okr{background:#e8f8ef;color:#12803f;border:1px solid #a6dcbb;padding:8px 12px;border-radius:5px;font-weight:800;margin-top:6px;font-size:13.5px}'+
'.sh-sign{text-align:center;margin-top:14px;font-size:11.5px;color:#7a6760}.sh-sign i{display:block;width:170px;border-bottom:1px solid #2b1a16;margin:30px auto 4px}.sh-sign b{color:#2b1a16}.sh-thanks{margin:14px 26px 0;padding-top:8px;border-top:1px dashed #cdb9ae;text-align:center;font-size:10px;letter-spacing:1.6px;text-transform:uppercase;color:#8a2a24;font-weight:700}'+
'.cmp .sh-top{padding:14px}.cmp .sh-logo{width:42px;height:42px}.cmp .sh-logo svg{width:24px;height:28px}.cmp .sh-brand h1{font-size:16px}.cmp .sh-brand .tag{font-size:8.5px;letter-spacing:1.4px}.cmp .sh-title h2{font-size:15px;letter-spacing:2px}.cmp .stp{font-size:9.5px;padding:2px 9px}.cmp .sh-cbar{padding:7px 12px;font-size:10.5px}.cmp .sh-info{grid-template-columns:1fr;padding:12px 14px 4px}.cmp .sh-tw{padding:10px 14px 0}.cmp .sh-t{min-width:0;table-layout:auto}.cmp .sh-t col{width:auto!important}.cmp .sh-t th:nth-child(1),.cmp .sh-t td:nth-child(1),.cmp .sh-t .hs,.cmp .sh-t .pr{display:none}.cmp .sh-t th,.cmp .sh-t td{padding:7px 5px;font-size:11.5px}.cmp .sh-words{margin:10px 14px 0}.cmp .sh-tx{margin:8px 14px 0}.cmp .sh-lower{grid-template-columns:1fr;padding:12px 14px 0}.cmp .sh-thanks{margin:12px 14px 0;letter-spacing:1px}.cmp .sh-grid{grid-template-columns:1fr 1fr}'+
'@media(max-width:560px){.sheet .sh-top{padding:14px}.sheet .sh-logo{width:42px;height:42px}.sheet .sh-logo svg{width:24px;height:28px}.sheet .sh-brand h1{font-size:16px}.sheet .sh-brand .tag{font-size:8.5px;letter-spacing:1.4px}.sheet .sh-title h2{font-size:15px;letter-spacing:2px}.sheet .stp{font-size:9.5px;padding:2px 9px}.sheet .sh-cbar{padding:7px 12px;font-size:10.5px}.sheet .sh-info{grid-template-columns:1fr;padding:12px 14px 4px}.sheet .sh-tw{padding:10px 14px 0}.sheet .sh-t{min-width:0;table-layout:auto}.sheet .sh-t col{width:auto!important}.sheet .sh-t th:nth-child(1),.sheet .sh-t td:nth-child(1),.sheet .sh-t .hs,.sheet .sh-t .pr{display:none}.sheet .sh-t th,.sheet .sh-t td{padding:7px 5px;font-size:11.5px}.sheet .sh-words{margin:10px 14px 0}.sheet .sh-tx{margin:8px 14px 0}.sheet .sh-lower{grid-template-columns:1fr;padding:12px 14px 0}.sheet .sh-thanks{margin:12px 14px 0;letter-spacing:1px}.sheet .sh-grid{grid-template-columns:1fr 1fr}}'+
'.sh-back{position:relative;overflow:hidden;min-height:620px;margin-top:14px;padding:28px}.sh-back .sh-wm{font-size:50px}.sh-bk{position:relative;font-size:13px;color:#4a3a34}.sh-bk h3{margin:0 0 10px;color:#8a2a24}.sh-bk li{margin:6px 0}@media print{.sh-back{page-break-before:always;margin-top:0}}';
(function(){var st=document.createElement('style');st.textContent=SHEETCSS;document.head.appendChild(st)})();
(function(){var st=document.createElement('style');st.textContent='.stmt{background:#fff;color:#38201a;padding:22px;border-radius:8px;max-width:1000px;margin:auto;font:13px/1.5 system-ui}.stmthead{display:flex;justify-content:space-between;gap:18px;flex-wrap:wrap;border-bottom:3px solid #c2502a;padding-bottom:14px}.stmthead h2{margin:0;color:#6a211c}.stmtintro{margin:16px 0;color:#77665d}.stmtTable{width:100%;border-collapse:collapse}.stmtTable th,.stmtTable td{padding:9px 8px;text-align:left;border-bottom:1px solid #efe4de;vertical-align:top}.stmtTable thead th{background:#fdf2ec;color:#6a211c}.stmtTable tfoot th{background:#fbf6f3}.stmt .blue{color:#c2502a;font-weight:700}.stmt .green{color:#16803d;font-weight:700}.stmt .red{color:#dc2626;font-weight:700}.stmtfoot{text-align:right;margin-top:16px;font-size:16px}@media(max-width:700px){.stmt{padding:12px;overflow-x:auto}.stmtTable{min-width:650px}}';document.head.appendChild(st)})();

/* shareable link: the bill is stored inside the link itself */
function b64e(o){return btoa(unescape(encodeURIComponent(JSON.stringify(o)))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')}
function b64d(s){s=s.replace(/-/g,'+').replace(/_/g,'/');while(s.length%4)s+='=';return JSON.parse(decodeURIComponent(escape(atob(s))))}
function billLink(d,lean){var XX={},X0=d.biz.x||{};Object.keys(X0).forEach(function(k){if(!(lean&&(k=='de'||k=='tc')))XX[k]=X0[k]});var o={x:d.x&&Object.keys(d.x).length?d.x:0,rf:d.ref||0,tm:d.time||'',e:d.by||'',i:d.id,d:d.date,n:d.name,m:d.mobile,a:d.addr,t:d.total,p:d.paid,md:d.mode,gs:d.gst?1:0,sb:d.sub,tx:d.tax,it:d.items.map(function(i){return [i.p,i.q,i.r,i.cs]}),b:[d.biz.n,d.biz.a,d.biz.p,d.biz.g,XX]};
 return location.href.split('#')[0]+'#bill='+b64e(o)}
function parseLink(s){var o=b64d(s);return {ref:o.rf||null,time:o.tm||'',by:o.e||'',id:o.i,date:o.d,name:o.n,mobile:o.m,addr:o.a,total:o.t,paid:o.p,mode:o.md,gst:!!o.gs,sub:o.gs&&o.sb!=null?o.sb:o.t,tax:o.gs?(o.tx||0):0,items:o.it.map(function(x){return {p:x[0],q:x[1],r:x[2],cs:x[3]}}),biz:{n:o.b[0],a:o.b[1],p:o.b[2],g:o.b[3],x:o.b[4]||{}},x:o.x||{}}}
function waURL(d){var due=round2(d.total-d.paid);
 var txt='*'+d.biz.n+'*\nHello '+d.name+', thank you for your purchase.\nBill No: '+d.id+' ('+fdate(d.date)+')\n'+
  d.items.map(function(i){return itemTxt(i).replace(' × ',' x ')+' @ '+money(i.r)+(i.cs>1?'/case':'')+' = '+money((i.q/(i.cs||1))*i.r)}).join('\n')+
  (d.gst?'\nTaxable: '+money(d.sub)+'\nGST 5% (CGST 2.5% + SGST 2.5%): '+money(d.tax)+'\nGSTIN: '+d.biz.g:'')+'\nTotal: '+money(d.total)+'\nReceived: '+money(d.paid)+(due>0?'\nCredit (balance): '+money(due):'\nFully paid')+'\n\nView / download your bill:\n'+billLink(d);
 return 'https://wa.me/91'+digits(d.mobile)+'?text='+encodeURIComponent(txt)}

function printBill(d){var r=$('#printroot');if(!r){r=document.createElement('div');r.id='printroot';document.body.appendChild(r)}r.innerHTML=sheetHTML(d);try{window.print()}catch(e){toast('Printing is not available in this view')}}
function downloadBill(d){
 var wrap=document.createElement('div');wrap.style.cssText='position:fixed;left:-10000px;top:0;width:794px;background:#fff';wrap.innerHTML=sheetHTML(d);document.body.appendChild(wrap);
 var fn='Larven-Bill-'+d.id;
 var fallback=function(){wrap.remove();var h='<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+esc(fn)+'</title><style>body{margin:0;padding:16px;background:#f7f2ef}'+SHEETCSS+'@media print{body{background:#fff;padding:0}.sheet{border:0}}</style>'+sheetHTML(d);
  var a=document.createElement('a');a.href=URL.createObjectURL(new Blob([h],{type:'text/html'}));a.download=fn+'.html';document.body.appendChild(a);a.click();a.remove();toast('Bill downloaded (open it and tap Print to save as PDF)')};
 if(window.html2canvas&&window.jspdf){
  var els=[].slice.call(wrap.children),pdf=new window.jspdf.jsPDF({unit:'pt',format:'a4'}),W=595.28,H=841.89;
  els.reduce(function(pr,el,idx){return pr.then(function(){return window.html2canvas(el,{scale:2,backgroundColor:'#ffffff'}).then(function(cv){var h=cv.height*W/cv.width,img=cv.toDataURL('image/jpeg',.95);if(idx)pdf.addPage();if(h<=H)pdf.addImage(img,'JPEG',0,0,W,h);else{var w2=W*H/h;pdf.addImage(img,'JPEG',(W-w2)/2,0,w2,H)}})})},Promise.resolve()).then(function(){pdf.save(fn+'.pdf');wrap.remove();toast('Bill downloaded')}).catch(fallback)}
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
 var rows=list.slice().reverse().map(function(b){var due=round2(b.total-b.paid),row=['<b>#'+esc(b.id)+'</b>'+(b.gst?'<br><small class="muted">GST bill</small>':''),fdate(b.date)+(b.time?'<br><small class="muted">'+fmt12(b.time)+'</small>':'')];
  if(!hideCust)row.push('<div><b>'+esc(bname(b))+'</b><br><small class="muted">'+esc(baddr(b)||'No address')+'</small><br><small class="muted">'+esc(bmob(b))+'</small></div>');
  row.push('<div>'+b.items.map(function(i){return esc(itemTxt(i))}).join('<br>')+'</div>',money(b.total),money(b.paid),'<b style="color:'+(due>0?'var(--red)':'var(--green)')+'">'+money(due)+'</b>',
   '<span class="pill '+(due<=0?'p-green':b.paid?'p-amber':'p-red')+'">'+(due<=0?'Paid':b.paid?'Partial':'Unpaid')+'</span>',
   '<div class="rowact"><button class="btn sm alt" data-nb="preview" data-id="'+b.id+'">View</button><button class="btn sm alt" data-nb="edit" data-id="'+b.id+'">Edit</button><button class="btn sm" style="background:var(--amber-soft);color:#a86500" data-billact="cancel" data-id="'+b.id+'">Cancel</button><button class="btn sm danger" data-billact="delete" data-id="'+b.id+'">Delete</button></div>');
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
function printStatement(d){var w=window.open('','_blank');if(!w){toast('Allow pop-ups to download/print the bills');return}var css='body{margin:0;padding:12px;background:#fff}'+SHEETCSS+'.stpage{margin:0 0 14px}.sheet{max-width:794px}@media print{body{padding:0}.stpage{page-break-after:always;margin:0}.stpage:last-child{page-break-after:auto}.sheet{border:0!important;border-radius:0!important;padding:0!important;max-width:none!important}@page{size:A4;margin:12mm}}';w.document.write('<!doctype html><html><head><meta charset="utf-8"><title>Larven Enterprises Bills - '+esc(d.name)+' '+esc(d.mobile)+'</title><style>'+css+'</style></head><body>'+billsSheetsHTML(d.bills,false)+'<scr'+'ipt>window.onload=function(){window.focus();window.print()}<\/scr'+'ipt></body></html>');w.document.close()}
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
 return head2('All Bills','Every bill you have made. Search, filter, open a bill to print or share it, or edit a wrong amount or address.','<a class="btn" href="#new-bill" style="text-decoration:none">+ New Bill</a>')+
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
 return head2('Customers','Everyone you sell to. A customer is added automatically when you save a bill. Open a customer to see their full history, edit their details or receive a payment.','<button class="btn" data-cu="add">+ Add Customer</button>')+
 '<div class="card abf" style="grid-template-columns:1fr"><div class="fld"><label for="cu-q">Search customer</label><input id="cu-q" type="search" placeholder="Name, mobile or address" autocomplete="off"></div></div><div id="cures">'+custRows('')+'</div>'}
function matchCust(c,q){q=(q||'').trim().toLowerCase();if(!q)return true;var d=q.replace(/[\s+\-]/g,'');if(/^\d+$/.test(d)){var ph=digits(c.phone);return d.length>=10?ph==d.slice(-10):ph.indexOf(d)==0}return (String(c.name||'')+' '+String(c.area||'')).toLowerCase().indexOf(q)>-1}
function custRows(q){q=q.trim().toLowerCase();
 var l=visibleCustomers().filter(function(c){return matchCust(c,q)}).map(function(c){return [c,cstat(c)]}).sort(function(a,b){return b[1].pend-a[1].pend||a[0].name.localeCompare(b[0].name)});
 return table(['Customer','Mobile','Last purchase','Cases','Total','Paid','Pending','Location',''],l.map(function(a){var c=a[0],s=a[1],last=s.bills.length?s.bills[s.bills.length-1]:null;
  return ['<div><b>'+esc(c.name)+'</b><br><small class="muted">'+esc(c.area||'No address')+'</small></div>','<div class="rowact" style="align-items:center;gap:6px"><span>'+esc(c.phone)+'</span><button type="button" class="btn sm alt" data-cu="copy-mobile" data-phone="'+esc(c.phone)+'">Copy</button></div>',
   last?'<div>'+last.items.map(function(i){return esc(itemTxt(i))}).join('<br>')+'<br><small class="muted">'+fdate(last.date)+(last.time?' · '+fmt12(last.time):'')+'</small></div>':'-',
   '<b>'+nf(custCases(s.bills))+'</b>',money(s.total),money(s.paid),pendTag(s.pend),
   c.loc?'<a class="btn sm alt" target="_blank" rel="noopener" href="'+mapUrl(c.loc)+'">📍 View Location</a>':'<span class="muted">Not saved</span>',
   '<div class="rowact"><button class="btn sm alt" data-cu="open" data-id="'+c.id+'">Open</button>'+(s.pend>0?'<button class="btn sm" data-cu="pay" data-id="'+c.id+'">Receive</button>':'')+'</div>']}),'No customers found.')}
function custCases(bs){return Math.round(bs.reduce(function(a,b){return a+b.items.reduce(function(x,i){return x+i.q/(i.cs||1)},0)},0)*100)/100}
function custBySize(bs){var m={};bs.forEach(function(b){b.items.forEach(function(i){m[i.p]=(m[i.p]||0)+i.q/(i.cs||1)})});return Object.keys(m).map(function(k){return '<span class="pill p-blue">'+esc(k)+': '+nf(Math.round(m[k]*100)/100)+' cases</span>'}).join(' ')}
function custDetail(c){
 if(CURRENT_ROLE==='employee' && !visibleCustomers().some(function(vc){return vc.id==c.id})){
  return '<div class="ph"><button class="btn alt" data-cu="back">← All customers</button></div><div class="note">Access restricted: Customer is not on your open trips.</div>';
 }
 var s=cstat(c),pays=S.payments.filter(function(p){return p.cust==c.id}).slice().reverse();
 return '<div class="ph"><button class="btn alt" data-cu="back">← All customers</button></div>'+
 '<div class="card custcard"><div style="flex:1;min-width:0"><small class="muted">Customer</small><h2 style="margin:2px 0;font-size:22px">'+esc(c.name)+'</h2><div>'+esc(c.phone)+'</div><div class="muted">'+esc(c.area||'No address')+'</div></div>'+
  '<div class="rowact" style="align-self:flex-start"><button class="btn sm alt" data-cu="edit" data-id="'+c.id+'">Edit</button><button class="btn sm" data-cu="bill" data-id="'+c.id+'">+ New Bill</button>'+(s.pend>0?'<button class="btn sm green" data-cu="pay" data-id="'+c.id+'">Receive payment</button><a class="btn sm wa" target="_blank" rel="noopener" href="'+remindURL(c,s.pend)+'">Remind on WhatsApp</a>':'')+'<button class="btn sm danger" data-cu="del" data-id="'+c.id+'">Delete</button></div></div>'+
 kp([['Total bills',s.n],['Total cases',nf(custCases(s.bills))],['Total purchase',money(s.total)],['Total paid',money(s.paid)],['Pending amount','<span style="color:'+(s.pend>0?'var(--red)':'var(--green)')+'">'+money(s.pend)+'</span>'],['Credit limit',c.credit_limit?money(c.credit_limit):'Off']])+'<div class="card" style="margin-bottom:12px"><b>Cases taken (all bills):</b> '+(custBySize(s.bills)||'<span class="muted">None yet</span>')+'<div style="margin-top:10px">'+(c.loc?'<span class="muted">Saved location ('+c.loc.lat+', '+c.loc.lng+(c.loc.acc?' ±'+c.loc.acc+' m':'')+')</span><br>'+locLinks(c.loc,c.name,c.phone):'<span class="muted">No location saved. Use “Save Location” in New Bill.</span>')+'</div></div>'+
 '<h3 style="margin:16px 0 0">Bills (date wise)</h3>'+billTable(s.bills,true)+
 '<h3 style="margin:16px 0 0">Payments received</h3>'+table(['Date','Amount','Mode','Against bill'],pays.map(function(p){return [fdate(p.date),money(p.amount),esc(p.mode),p.bill=='-'?'Advance':'#'+esc(p.bill)]}),'No payments yet.')}
function custForm(c){var f=function(k,l,v,t,m){return '<div class="fld"><label for="cf-'+k+'">'+l+'</label><input id="cf-'+k+'" name="'+k+'" type="'+(t||'text')+'" value="'+esc(v||'')+'"'+(m||'')+'></div>'};
 openModal('<h3>'+(c?'Edit customer':'Add customer')+'</h3><p>Name, mobile number and address are all required.</p><form id="cuform" data-id="'+(c?c.id:'')+'" novalidate style="display:grid;gap:12px">'+f('name','Customer Name *',c&&c.name)+f('mobile','Mobile Number *',c&&digits(c.phone),'tel',' inputmode="numeric" maxlength="10"')+f('addr','Address *',c&&c.area)+
  f('credit_limit','Credit Limit (₹, optional, off by default)',c&&c.credit_limit,'number',' min="0" step="1"')+
  '<div class="dact"><button type="button" class="btn alt" data-nb="close">Cancel</button><button type="submit" class="btn">Save</button></div></form>')}
document.addEventListener('submit',function(e){if(e.target.id!='cuform')return;e.preventDefault();var f=e.target,id=f.dataset.id;
 var name=f.name.value.trim(),mob=digits(f.mobile.value),addr=f.addr.value.trim(),clim=f.credit_limit?(parseFloat(f.credit_limit.value)||0):0;
 ['#cf-name','#cf-mobile','#cf-addr'].forEach(clearErr);
 if(!name)return bad('#cf-name','Enter the customer name');if(mob.length!=10)return bad('#cf-mobile','Enter a 10-digit mobile number');if(!addr)return bad('#cf-addr','Enter the address');
 var dup=S.customers.filter(function(x){return x.id!=id&&digits(x.phone)==mob})[0];if(dup)return bad('#cf-mobile','Mobile already used by '+dup.name);
 if(id){var c=cget(id);c.name=name;c.phone=mob;c.area=addr;c.credit_limit=clim;cbills(id).forEach(function(b){b.name=name;b.mobile=mob;b.addr=addr});toast('Customer updated')}
 else{var n={id:nid('C',S.customers),name:name,phone:mob,area:addr,credit_limit:clim,date:today()};S.customers.push(n);toast('Customer added')}
 save();closeModal();render()});
document.addEventListener('input',function(e){if(e.target.id=='cu-q'){$('#cures').innerHTML=custRows(e.target.value)}
 if(e.target.id=='op-q'){$('#opres').innerHTML=opRows(e.target.value)}});
function copyMobileFallback(ph){var x=document.createElement('textarea');x.value=ph;x.style.position='fixed';x.style.opacity='0';document.body.appendChild(x);x.select();try{document.execCommand('copy');toast('Mobile number copied: '+ph)}catch(e){toast('Copy failed. Mobile: '+ph)}x.remove()}
document.addEventListener('click',function(e){var t=e.target.closest('[data-cu],[data-op]');if(!t)return;var a=t.dataset.cu||('op-'+t.dataset.op),id=t.dataset.id;
 if(a=='copy-mobile'){var ph=digits(t.dataset.phone||'');if(!ph){toast('Mobile number not available');return}if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(ph).then(function(){toast('Mobile number copied: '+ph)}).catch(function(){copyMobileFallback(ph)})}else copyMobileFallback(ph);return}
 if(a=='open'||a=='op-open'){CV=id;if(location.hash=='#customers')render();else location.hash='#customers'}
 else if(a=='back'){CV=null;render()}
 else if(a=='add')custForm(null);
 else if(a=='edit')custForm(cget(id));
 else if(a=='pay'||a=='op-pay'){PAYCUST=id;if(location.hash=='#payments')render();else location.hash='#payments'}
 else if(a=='bill'){NBPRE=id;if(location.hash=='#new-bill')render();else location.hash='#new-bill'}
 else if(a=='del')askDelete('customers',id)});

/* ---------- v15: logged-in user on bills, customer WhatsApp & filters, bar sizing ---------- */
function curUser(){return cafeActorName()}
(function(){var v=document.getElementById('view');if(!v||!window.ResizeObserver)return;var f=function(){document.documentElement.style.setProperty('--sbw',Math.max(0,v.offsetWidth-v.clientWidth)+'px')};new ResizeObserver(f).observe(v);f()})();
var CUF={st:'all'};
var CVF={f:'all',sel:{},id:''};
function billState(b){var d=round2(b.total-b.paid);return d<=0?'paid':b.paid>0?'partial':'unpaid'}
function custState(c){var bs=cbills(c.id);return {paid:bs.length>0&&bs.every(function(b){return billState(b)=='paid'}),partial:bs.some(function(b){return billState(b)=='partial'}),unpaid:bs.some(function(b){return billState(b)=='unpaid'}),due:bs.some(function(b){return billState(b)!='paid'})}}
function waBillText(b){var d=billData(b),due=round2(d.total-d.paid);return '*Bill #'+d.id+'* · '+fdate(d.date)+(d.time?' '+fmt12(d.time):'')+'\n'+d.items.map(function(i){return '  '+itemTxt(i).replace(' × ',' x ')+' @ '+money(i.r)+(i.cs>1?'/case':'')+' = '+money((i.q/(i.cs||1))*i.r)}).join('\n')+'\n  Total '+money(d.total)+' | Paid '+money(d.paid)+' | *Due '+money(due)+'*'}
function waBillsURL(c,bills){var due=round2(bills.reduce(function(a,b){return a+(b.total-b.paid)},0)),head='*'+S.settings.name+'*\nHello '+c.name+', these are your pending bill details:\n\n',tail='\n\n*Total pending: '+money(due)+'*\nPlease clear the balance at your earliest convenience. Thank you.';
 var body=bills.map(waBillText).join('\n\n'),withLinks=bills.map(function(b){return waBillText(b)+'\n  View bill: '+billLink(billData(b))}).join('\n\n'),txt=head+withLinks+tail;
 if(encodeURIComponent(txt).length>5500)txt=head+body+tail;
 return 'https://wa.me/91'+digits(c.phone)+'?text='+encodeURIComponent(txt)}
function custRows(q){q=(q||'').trim().toLowerCase();var CUQ_=q;
 var l=S.customers.filter(function(c){if(!matchCust(c,q))return false;var s=custState(c);return CUF.st=='all'||(CUF.st=='paid'&&s.paid)||(CUF.st=='partial'&&s.partial)||(CUF.st=='unpaid'&&s.unpaid)||(CUF.st=='due'&&s.due)}).map(function(c){return [c,cstat(c)]}).sort(function(a,b){return b[1].pend-a[1].pend||a[0].name.localeCompare(b[0].name)});
 return table(['Customer','Mobile','Last purchase','Cases','Total','Paid','Pending','Location',''],l.map(function(a){var c=a[0],s=a[1],last=s.bills.length?s.bills[s.bills.length-1]:null,duebills=s.bills.filter(function(b){return billState(b)!='paid'});
  return ['<div><b>'+esc(c.name)+'</b><br><small class="muted">'+esc(c.area||'No address')+'</small></div>','<div class="rowact" style="align-items:center;gap:6px"><span>'+esc(c.phone)+'</span><button type="button" class="btn sm alt" data-cu="copy-mobile" data-phone="'+esc(c.phone)+'">Copy</button></div>',
   last?'<div>'+last.items.map(function(i){return esc(itemTxt(i))}).join('<br>')+'<br><small class="muted">'+fdate(last.date)+(last.time?' · '+fmt12(last.time):'')+'</small></div>':'-',
   '<b>'+nf(custCases(s.bills))+'</b>',money(s.total),money(s.paid),pendTag(s.pend),
   c.loc?'<a class="btn sm alt" target="_blank" rel="noopener" href="'+mapUrl(c.loc)+'">📍 View Location</a>':'<span class="muted">Not saved</span>',
   '<div class="rowact"><button class="btn sm alt" data-cu="open" data-id="'+c.id+'">Open</button>'+(duebills.length?'<a class="btn sm wa" target="_blank" rel="noopener" href="'+waBillsURL(c,duebills)+'" title="Send pending bills to '+esc(c.phone)+'">WhatsApp</a>':'')+(s.pend>0?'<button class="btn sm" data-cu="pay" data-id="'+c.id+'">Receive</button>':'')+'</div>']}),'No customers found for this filter.')}
custList=function(){CUF.st='all';return head2('Customers','Everyone you sell to. A customer is added automatically when you save a bill. Use the WhatsApp button to send a customer’s pending bills to their mobile number.','<button class="btn" data-cu="add">+ Add Customer</button>')+
 '<div class="card abf" style="grid-template-columns:2fr 1fr"><div class="fld"><label for="cu-q">Search customer</label><input id="cu-q" type="search" placeholder="Name, mobile or address" autocomplete="off"></div><div class="fld"><label for="cu-f">Show</label><select id="cu-f"><option value="all">All customers</option><option value="due">Has pending bills</option><option value="partial">Partial paid</option><option value="unpaid">Unpaid</option><option value="paid">All paid</option></select></div></div><div id="cures">'+custRows('')+'</div>'};
document.addEventListener('change',function(e){if(e.target.id=='cu-f'){CUF.st=e.target.value;$('#cures').innerHTML=custRows($('#cu-q').value)}});
function cvBills(c){var bs=cbills(c.id).slice();return bs.filter(function(b){return CVF.f=='all'||billState(b)==CVF.f})}
function cvTable(c){var l=cvBills(c).slice().reverse();
 return table(['','Bill No','Date','Items','Total','Paid','Due','Status',''],l.map(function(b){var d=round2(b.total-b.paid),st=billState(b);
  return ['<input type="checkbox" class="cv-chk" data-b="'+esc(b.id)+'"'+(CVF.sel[b.id]?' checked':'')+(d>0?'':' disabled')+' aria-label="Select bill '+esc(b.id)+'">','<b>#'+esc(b.id)+'</b>',fdate(b.date)+(b.time?'<br><small class="muted">'+fmt12(b.time)+'</small>':''),'<div>'+b.items.map(function(i){return esc(itemTxt(i))}).join('<br>')+'</div>',money(b.total),money(b.paid),'<b style="color:'+(d>0?'var(--red)':'var(--green)')+'">'+money(d)+'</b>','<span class="pill '+(st=='paid'?'p-green':st=='partial'?'p-amber':'p-red')+'">'+(st=='paid'?'Paid':st=='partial'?'Partial':'Unpaid')+'</span>','<button class="btn sm alt" data-nb="preview" data-id="'+b.id+'">View</button>']}),'No bills for this filter.')}
function cvSelDefault(c){CVF.sel={};cbills(c.id).forEach(function(b){if(billState(b)!='paid'&&(CVF.f=='all'||billState(b)==CVF.f))CVF.sel[b.id]=true})}
function cvWaBtn(c){var n=cbills(c.id).filter(function(b){return CVF.sel[b.id]}).length;return n?'<a class="btn wa" target="_blank" rel="noopener" id="cv-wa" href="'+waBillsURL(c,cbills(c.id).filter(function(b){return CVF.sel[b.id]}))+'">Send '+n+' bill'+(n>1?'s':'')+' on WhatsApp to '+esc(c.phone)+'</a>':'<button type="button" class="btn wa" id="cv-wa" disabled style="opacity:.55">Tick a pending bill to send on WhatsApp</button>'}
custDetail=function(c){if(CVF.id!=c.id){CVF={f:'partial',sel:{},id:c.id};if(!cbills(c.id).some(function(b){return billState(b)=='partial'}))CVF.f='all';cvSelDefault(c)}
 var s=cstat(c),pays=S.payments.filter(function(p){return p.cust==c.id}).slice().reverse(),F=[['all','All'],['paid','All paid'],['partial','Partial paid'],['unpaid','Unpaid']];
 return '<div class="ph"><button class="btn alt" data-cu="back">← All customers</button></div>'+
 '<div class="card custcard"><div style="flex:1;min-width:0"><small class="muted">Customer</small><h2 style="margin:2px 0;font-size:22px">'+esc(c.name)+'</h2><div>'+esc(c.phone)+'</div><div class="muted">'+esc(c.area||'No address')+'</div></div>'+
  '<div class="rowact" style="align-self:flex-start"><button class="btn sm alt" data-cu="edit" data-id="'+c.id+'">Edit</button><button class="btn sm" data-cu="bill" data-id="'+c.id+'">+ New Bill</button>'+(s.pend>0?'<button class="btn sm green" data-cu="pay" data-id="'+c.id+'">Receive payment</button>':'')+'<button class="btn sm danger" data-cu="del" data-id="'+c.id+'">Delete</button></div></div>'+
 kp([['Total bills',s.n],['Total cases',nf(custCases(s.bills))],['Total purchase',money(s.total)],['Total paid',money(s.paid)],['Pending amount','<span style="color:'+(s.pend>0?'var(--red)':'var(--green)')+'">'+money(s.pend)+'</span>']])+
 '<div class="card" style="margin-bottom:12px"><b>Cases taken (all bills):</b> '+(custBySize(s.bills)||'<span class="muted">None yet</span>')+'<div style="margin-top:10px">'+(c.loc?'<span class="muted">Saved location ('+c.loc.lat+', '+c.loc.lng+(c.loc.acc?' ±'+c.loc.acc+' m':'')+')</span><br>'+locLinks(c.loc,c.name,c.phone):'<span class="muted">No location saved. Use “Save Location” in New Bill.</span>')+'</div></div>'+
 '<h3 style="margin:16px 0 8px">Bills (date wise)</h3><div class="svtabs" style="margin-top:0">'+F.map(function(x){return '<button type="button" class="svtab'+(CVF.f==x[0]?' on':'')+'" data-cvf="'+x[0]+'">'+x[1]+' ('+(x[0]=='all'?s.bills.length:s.bills.filter(function(b){return billState(b)==x[0]}).length)+')</button>'}).join('')+'</div>'+
 '<div class="card" style="margin-bottom:10px;display:flex;gap:12px;align-items:center;flex-wrap:wrap"><div id="cv-wabox">'+cvWaBtn(c)+'</div><small class="muted">Tick the bills to send. Bills with a pending amount are ticked automatically. Opens WhatsApp for the customer’s number saved here (edit the customer to change it).</small></div>'+
 '<div id="cv-tbl">'+cvTable(c)+'</div>'+
 '<h3 style="margin:16px 0 0">Payments received</h3>'+table(['Date','Amount','Mode','Against bill'],pays.map(function(p){return [fdate(p.date),money(p.amount),esc(p.mode),p.bill=='-'?'Advance':'#'+esc(p.bill)]}),'No payments yet.')};
document.addEventListener('click',function(e){var t=e.target.closest('[data-cvf]');if(!t)return;var c=cget(CV);if(!c)return;CVF.f=t.dataset.cvf;cvSelDefault(c);render()});
document.addEventListener('change',function(e){var t=e.target;if(!t.classList||!t.classList.contains('cv-chk'))return;var c=cget(CV);if(!c)return;CVF.sel[t.dataset.b]=t.checked;$('#cv-wabox').innerHTML=cvWaBtn(c)});

/* ---------- v15.1: payment mode details ---------- */
var BANKS=['SBI','HDFC Bank','ICICI Bank','Axis Bank','Canara Bank','Union Bank','Bank of Baroda','Punjab National Bank','Indian Bank','Kotak Mahindra','Andhra Pradesh Grameena Vikas Bank','Telangana Grameena Bank','Other'];
function payFields(mode,r){r=r||{};function fld(l,id,v,ph,extra){return '<div class="fld"><label for="'+id+'">'+l+'</label><input id="'+id+'" value="'+esc(v||'')+'" placeholder="'+(ph||'')+'" '+(extra||'')+'></div>'}
 function bank(id,v){return '<div class="fld"><label for="'+id+'">Bank name</label><input id="'+id+'" list="bank-dl" value="'+esc(v||'')+'" placeholder="Select or type bank name"><datalist id="bank-dl">'+BANKS.map(function(b){return '<option value="'+b+'">'}).join('')+'</datalist></div>'}
 if(mode=='Bank Transfer')return '<div class="payx"><h4>Bank transfer details</h4><div class="nb-pay"><div class="fld"><label for="px-type">Transfer type</label><select id="px-type">'+['NEFT','RTGS','IMPS','Direct bank deposit'].map(function(t){return '<option'+(r.type==t?' selected':'')+'>'+t+'</option>'}).join('')+'</select></div>'+fld('UTR / Reference number *','px-no',r.no,'Bank transaction reference','autocapitalize="characters"')+bank('px-bank',r.bank)+'<div class="fld"><label for="px-date">Transfer date</label><input id="px-date" type="date" value="'+esc(r.date||today())+'"></div></div></div>';
 if(mode=='Cheque')return '<div class="payx"><h4>Cheque details</h4><div class="nb-pay">'+fld('Cheque number *','px-no',r.no,'6-digit cheque number','inputmode="numeric" maxlength="6"')+bank('px-bank',r.bank)+'<div class="fld"><label for="px-date">Cheque date</label><input id="px-date" type="date" value="'+esc(r.date||today())+'"></div><div class="fld"><label for="px-st">Cheque status</label><select id="px-st">'+['Received','Deposited','Cleared','Bounced'].map(function(t){return '<option'+(r.status==t?' selected':'')+'>'+t+'</option>'}).join('')+'</select></div></div></div>';
 if(mode=='PhonePe'||mode=='GPay')return '<div class="payx"><div class="nb-pay">'+fld('UPI transaction ID (optional)','px-no',r.no,'12-digit UPI reference after payment')+'</div></div>';
 return ''}
function readPayRef(mode){var no=($('#px-no')||{}).value,bk=($('#px-bank')||{}).value,dt=($('#px-date')||{}).value;no=(no||'').trim();
 if(mode=='Bank Transfer'){if(!no){bad('#px-no','Enter the UTR / reference number');return false}return {type:$('#px-type').value,no:no,bank:(bk||'').trim(),date:dt||''}}
 if(mode=='Cheque'){if(!/^\d{6}$/.test(no)){bad('#px-no','Enter the 6-digit cheque number');return false}return {no:no,bank:(bk||'').trim(),date:dt||'',status:$('#px-st').value}}
 if(mode=='PhonePe'||mode=='GPay')return no?{no:no}:null;
 return null}
function refRows(d){var r=d.ref;if(!r||!r.no)return '';var m=d.mode;return '<dt>'+(m=='Cheque'?'Cheque No':m=='Bank Transfer'?(r.type||'Ref')+' UTR':'UPI Txn ID')+'</dt><dd>'+esc(r.no)+'</dd>'+(r.bank?'<dt>Bank</dt><dd>'+esc(r.bank)+'</dd>':'')+(m=='Cheque'&&r.date?'<dt>Cheque Date</dt><dd>'+fdate(r.date)+'</dd>':'')+(m=='Cheque'&&r.status?'<dt>Status</dt><dd>'+esc(r.status)+'</dd>':'')}
document.addEventListener('change',function(e){if(e.target.id=='nb-mode'){var x=$('#nb-payx');if(x)x.innerHTML=payFields(e.target.value,null)}});

/* ---------- v16: stock board, UPI ID memory, bill settings, tax-invoice bill ---------- */
function fgChips(locs){var b=fgBal(),sz=fgSizes();locs=locs||['P','G1','G2'];
 return '<div class="board"><div class="bh"><b>Available stock now</b><span>cases · Red = out of stock</span></div><div class="bgrid">'+locs.map(function(l){var tot=sz.reduce(function(a,z){return a+Math.max(0,fgGet(b,l,z))},0);
  return '<div class="bloc"><div class="bt"><span>'+esc(locName(l))+'</span><em>Total '+nf(tot)+'</em></div><div class="btiles">'+sz.map(function(z){var n=fgGet(b,l,z);return '<div class="bt1'+(n<=0?' zero':n<=(+S.settings.low||0)/10?' low':'')+'"><small>'+esc(z)+'</small><b>'+nf(n)+'</b></div>'}).join('')+'</div></div>'}).join('')+'</div></div>'}
/* UPI ID is saved once and reused everywhere */
var UPIED=false;
function upiWidget(){var id=String(S.settings.upiId||'').trim();
 if(id&&!UPIED)return '<div class="upiw-row"><span>UPI ID: <b>'+esc(id)+'</b><br><small class="muted">Payee: '+esc(S.settings.upiPayee||S.settings.name||'')+'</small></span><button type="button" class="btn sm alt" data-upi="chg">Change UPI ID</button></div>';
 return '<div class="upiw-row"><input class="upi-in" placeholder="e.g. 9876543210@ybl" value="" autocomplete="off" aria-label="UPI ID"><button type="button" class="btn sm" data-upi="save">Save UPI ID</button>'+(id?'<button type="button" class="btn sm alt" data-upi="cancel">Cancel</button>':'')+'</div><small class="muted">Enter once and save. It stays saved until you press Change UPI ID.</small>'}
function fillUpiW(){[].forEach.call(document.querySelectorAll('.upiw'),function(e){e.innerHTML=upiWidget()})}
function upiRepaint(){fillUpiW();if($('#nb-mode'))updateUPIQR();if($('#dsp-mode'))dspQR();if($('#pp-mode'))ppQR()}
document.addEventListener('click',function(e){var t=e.target.closest('[data-upi]');if(!t)return;var a=t.dataset.upi;
 if(a=='chg'){UPIED=true}else if(a=='cancel'){UPIED=false}
 else if(a=='save'){var v=((t.parentNode.querySelector('.upi-in')||{}).value||'').trim();if(!/^[\w.\-]{2,}@[A-Za-z][\w]{1,}$/.test(v)){toast('Enter a valid UPI ID, e.g. name@bank');return}S.settings.upiId=v;if(!S.settings.upiPayee)S.settings.upiPayee=S.settings.name||'';save();UPIED=false;toast('UPI ID saved')}
 upiRepaint()});
/* Dispatch: QR + payment reference */
function dspQR(){var card=$('#dsp-qr');if(!card)return;var m=$('#dsp-mode').value;if(m!='PhonePe'&&m!='GPay'){card.hidden=true;return}card.hidden=false;fillUpiW();var t=dspTotal(),r=+($('#dsp-rec').value||0),a=r>0?r:t;$('#dsp-qr-pay').innerHTML='<b>QR Amount: '+money(a)+'</b>';upiQR('dsp-qr-code','dsp-qr-hint',a,(S.settings.name||'')+' dispatch')}
document.addEventListener('change',function(e){if(e.target.id=='dsp-mode'){var x=$('#dsp-payx');if(x)x.innerHTML=payFields(e.target.value,null);var r=$('#dsp-rec');if((e.target.value=='PhonePe'||e.target.value=='GPay')&&r&&!(+r.value>0)&&dspTotal()>0)r.value=dspTotal().toFixed(2);dspSum()}});
document.addEventListener('click',function(e){if(e.target&&e.target.id=='dsp-qr-refresh')dspQR()});
var _dspSum=dspSum;dspSum=function(){_dspSum();dspQR()};
/* ---- Bill settings ---- */
var BS_DEF_TC='Goods once sold will not be taken back.|Please check the quantity at the time of delivery.|Empty cans / bottles and crates remain the property of the supplier unless stated otherwise.|Credit balance, if any, is to be cleared as agreed with the office.';
var BS_DEF_DE='We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.';
function bset(){var s=S.settings,b=s.bill||{};return {n:b.n||s.name||'Larven Enterprises',a:b.a||s.address||'',p:b.p||s.phone||'',g:b.g||s.gst||'',pan:b.pan||'',em:b.em||'',st:b.st||'Andhra Pradesh',sc:b.sc||'37',tag:b.tag||'PACKAGED DRINKING WATER',hsn:b.hsn||'22011010',bk:b.bk||'',ac:b.ac||'',ifs:b.ifs||'',br:b.br||'',ho:b.ho||'',de:b.de||BS_DEF_DE,tc:b.tc||BS_DEF_TC,wm:b.wm||'SR INDUSTRIES',qr:b.qr!=='no'}}
function billSettingsCard(){FORMS.bs=function(v){var b=S.settings.bill=S.settings.bill||{};['n','a','p','g','pan','em','st','sc','tag','hsn','bk','ac','ifs','br','ho','de','tc','wm'].forEach(function(k){b[k]=(v['b_'+k]||'').trim()});b.qr=v.b_qr=='no'?'no':'yes';S.settings.locAddr={G1:(v.b_la_G1||'').trim(),G2:(v.b_la_G2||'').trim(),P:(v.b_la_P||'').trim()};if(b.tc)b.tc=b.tc.replace(/\s*\|\s*/g,'|');return 'Bill settings updated. All bills now use these details.'};
 var b=bset(),F=[['n','Company name on bill',b.n],['tag','Tagline under name',b.tag],['a','Company address',b.a],['p','Mobile number',b.p],['em','Email (optional)',b.em],['g','GSTIN',b.g],['pan','Company PAN',b.pan],['st','State name',b.st],['sc','State code',b.sc],['hsn','HSN / SAC code for water',b.hsn],['bk','Bank name',b.bk],['ho','Account holder name',b.ho],['ac','Account number',b.ac],['ifs','IFSC code',b.ifs],['br','Branch',b.br],['wm','Watermark text (light, behind bill)',b.wm],['la_G1','Godown 1 (SS Point 1) address – shown on dispatch bills',(S.settings.locAddr||{}).G1||''],['la_G2','Godown 2 (SS Point 2) address – shown on dispatch bills',(S.settings.locAddr||{}).G2||''],['la_P','Plant address – shown on dispatch bills',(S.settings.locAddr||{}).P||''],['de','Declaration (printed at the bottom)',b.de],['tc','Terms &amp; conditions (separate points with |)',b.tc]].map(function(x){return {k:'b_'+x[0],l:x[1],v:x[2],r:false}});
 F.push({k:'b_qr',l:'Show “scan to download invoice” QR on bill',t:'select',o:[['yes','Yes'],['no','No']]});
 var h=formCard(F,'Update Bill Settings','bs');if(b.qr===false)h=h.replace('<option value="no">','<option value="no" selected>');
 return '<div style="margin-top:22px"><h3 style="margin:0 0 4px">Bill Settings</h3><p class="pdesc" style="margin:0 0 10px">Company name, GSTIN, PAN, bank details, declaration and terms shown on every bill. Change here and all bills use it.</p>'+h+'</div>'}
/* ---- QR image (synchronous, from the QR library canvas) ---- */
function qrImg(url){try{if(typeof QRCode==='undefined')return '';var t=document.createElement('div');new QRCode(t,{text:url,width:240,height:240,colorDark:'#2b1a16',colorLight:'#ffffff',correctLevel:QRCode.CorrectLevel.L});var c=t.querySelector('canvas');return c?c.toDataURL('image/png'):''}catch(e){return ''}}
function refText(d){var r=d.ref,m=d.mode;if(!r||!r.no)return '';return (m=='Cheque'?'No '+r.no:m=='Bank Transfer'?(r.type||'Ref')+' '+r.no:'Txn '+r.no)+(r.bank?' · '+r.bank:'')+(m=='Cheque'&&r.date?' · '+fdate(r.date):'')+(m=='Cheque'&&r.status?' · '+r.status:'')}
function sheetHTML(d,compact,noBack){var X=d.biz.x||{},o=d.x||{},gst=d.gst;var disp=!!(d.x&&d.x.from);
 var rows=d.items.map(function(i,k){var cs=i.cs>1,cases=Math.round(i.q/(i.cs||1)*100)/100,nm=esc(i.p)+(/can|jar/i.test(i.p)?'':(cs?' Packaged Drinking Water':''));
  return '<tr><td class="c">'+(k+1)+'</td><td class="it"><b>'+nm+'</b></td><td class="c hs">'+esc(X.hsn||'')+'</td><td class="r"><b>'+nf(cases)+'</b> '+(cs?'cases':'nos')+(cs?'<small>'+nf(i.q)+' bottles</small>':'')+'</td><td class="r">'+money(i.r)+'</td><td class="c pr">'+(cs?'case':'nos')+'</td><td class="r amt">'+money((i.q/(i.cs||1))*i.r)+'</td></tr>'}).join('');
 var due=round2(d.total-d.paid),st=due<=0?'PAID':d.paid>0?'PARTIAL':'UNPAID',stc=due<=0?'ok':d.paid>0?'pt':'un',totCases=Math.round(d.items.reduce(function(a,i){return a+i.q/(i.cs||1)},0)*100)/100,cg=round2(d.tax/2),sg=round2(d.tax-cg);
 var url=location.href.split('#')[0]+'#bill=',qi='';if(X.qr!==false){qi=qrImg(billLink(d,true))}
 var cell=function(l,v){return v?'<div class="gc"><small>'+l+'</small><b>'+esc(v)+'</b></div>':''};
 var pt=d.mode+(refText(d)?' — '+refText(d):'');
 var info='<div class="sh-grid">'+cell('Invoice No.',d.id)+cell('Dated',fdate(d.date)+(d.time?' · '+fmt12(d.time):''))+cell('Mode / Terms of Payment',pt)+cell('Sale type',disp?o.type:'')+cell('Buyer’s Order No.',o.po)+cell('Dispatched through',o.veh)+cell('Destination',o.dest)+cell('Billed by',d.by)+'</div>';
 var fromBox='<div class="sh-party"><div class="lb">Dispatched From</div><div class="nm">'+esc(o.fn||'')+'</div>'+(o.fa?'<div class="ad">'+esc(o.fa)+'</div>':'<div class="ad">Address not set (Settings → Bill Settings)</div>')+'<div>'+esc(d.biz.n)+(d.biz.p?' · Ph: '+esc(d.biz.p):'')+'</div></div>';var fromCo='<div class="sh-party"><div class="lb">From</div><div class="nm">'+esc(d.biz.n)+'</div>'+(d.biz.a?'<div class="ad">'+esc(d.biz.a)+'</div>':'')+(d.biz.p?'<div>Mobile: '+esc(d.biz.p)+'</div>':'')+(d.biz.g?'<div>GSTIN: <b>'+esc(d.biz.g)+'</b></div>':'')+'</div>';var party=function(t,show){return '<div class="sh-party"><div class="lb">'+t+'</div><div class="nm">'+esc(d.name)+'</div>'+(d.addr?'<div class="ad">'+esc(d.addr)+'</div>':'')+(d.mobile?'<div>Mobile: '+esc(d.mobile)+'</div>':'')+(show&&o.gstin?'<div>GSTIN/UIN: <b>'+esc(o.gstin)+'</b></div>':'')+(show&&gst?'<div>Place of Supply: '+esc(X.st||'')+(X.sc?' (Code: '+esc(X.sc)+')':'')+'</div>':'')+'</div>'};
 var taxrows=gst?'<tr class="tx"><td></td><td class="r" colspan="2"><i>Output CGST @ 2.5%</i></td><td></td><td class="r">2.5</td><td class="c pr">%</td><td class="r">'+money(cg)+'</td></tr><tr class="tx"><td></td><td class="r" colspan="2"><i>Output SGST @ 2.5%</i></td><td></td><td class="r">2.5</td><td class="c pr">%</td><td class="r">'+money(sg)+'</td></tr>':'';
 var hsnT=gst?'<div class="sh-tw"><table class="sh-t sh-h"><thead><tr><th>HSN / SAC</th><th class="r">Taxable Value</th><th class="r">CGST Rate</th><th class="r">CGST Amt</th><th class="r">SGST Rate</th><th class="r">SGST Amt</th><th class="r">Total Tax</th></tr></thead><tbody><tr><td>'+esc(X.hsn||'')+'</td><td class="r">'+money(d.sub)+'</td><td class="r">2.5%</td><td class="r">'+money(cg)+'</td><td class="r">2.5%</td><td class="r">'+money(sg)+'</td><td class="r">'+money(d.tax)+'</td></tr><tr class="tt"><td>Total</td><td class="r">'+money(d.sub)+'</td><td></td><td class="r">'+money(cg)+'</td><td></td><td class="r">'+money(sg)+'</td><td class="r">'+money(d.tax)+'</td></tr></tbody></table></div><div class="sh-tx">Tax Amount (in words): <b>INR '+words(d.tax)+' Only</b></div>':'';
 var bank=X.bk||X.ac?'<div class="sh-bank"><div class="lb">Company’s Bank Details</div><dl>'+(X.ho?'<dt>A/c Holder</dt><dd>'+esc(X.ho)+'</dd>':'')+(X.bk?'<dt>Bank Name</dt><dd>'+esc(X.bk)+'</dd>':'')+(X.ac?'<dt>A/c No.</dt><dd>'+esc(X.ac)+'</dd>':'')+(X.ifs||X.br?'<dt>Branch &amp; IFSC</dt><dd>'+esc((X.br||'')+(X.br&&X.ifs?' & ':'')+(X.ifs||''))+'</dd>':'')+'</dl></div>':'';
 return '<div class="sheet'+(compact?' cmp':'')+'">'+wmHTML(X)+''+
  '<div class="sh-top"><div class="sh-brand"><div class="sh-logo"><svg width="34" height="40" viewBox="0 0 44 52"><path d="M22 2C22 2 4 22 4 34a18 18 0 0 0 36 0C40 22 22 2 22 2Z" fill="#fff"/><path d="M8 36c8-6 16 4 28-2" stroke="#8a2a24" stroke-width="3" fill="none" stroke-linecap="round"/></svg></div><div><h1>'+esc(d.biz.n)+'</h1><div class="tag">'+esc(X.tag||'PACKAGED DRINKING WATER')+'</div></div></div><div class="sh-title"><h2>'+(gst?'TAX INVOICE':'INVOICE')+'</h2><span class="stp '+stc+'">'+st+'</span></div></div>'+
  '<div class="sh-cbar">'+(d.biz.a?'<span>'+esc(d.biz.a)+'</span>':'')+(d.biz.p?'<span>Ph: '+esc(d.biz.p)+'</span>':'')+(X.em?'<span>'+esc(X.em)+'</span>':'')+(d.biz.g?'<span>GSTIN/UIN: '+esc(d.biz.g)+'</span>':'')+(X.pan?'<span>PAN: '+esc(X.pan)+'</span>':'')+(X.st?'<span>State: '+esc(X.st)+(X.sc?', Code: '+esc(X.sc):'')+'</span>':'')+'</div>'+
  '<div class="sh-info"><div class="sh-pl">'+(disp?fromBox:fromCo)+party('To (Customer)',1)+'</div><div class="sh-pr">'+(qi?'<div class="sh-qr"><img src="'+qi+'" alt="QR"><small>Scan to view / download invoice</small></div>':'')+info+'</div></div>'+
  '<div class="sh-tw"><table class="sh-t"><colgroup><col class="w1"><col><col class="w2"><col class="w5"><col class="w4"><col class="w3"><col class="w4"></colgroup><thead><tr><th class="c">SI</th><th>Description of Goods</th><th class="c hs">HSN/SAC</th><th class="r">Quantity</th><th class="r">Rate</th><th class="c pr">per</th><th class="r">Amount</th></tr></thead><tbody>'+rows+taxrows+'</tbody><tfoot><tr><td></td><td class="r"><b>Total</b></td><td class="hs"></td><td class="r"><b>'+nf(totCases)+'</b></td><td></td><td class="pr"></td><td class="r gtc"><b>'+money(d.total)+'</b></td></tr></tfoot></table></div>'+
  '<div class="sh-words"><div><span class="lb">Amount Chargeable (in words)</span><b>INR '+words(d.total)+' Only</b></div><i>E. &amp; O.E</i></div>'+hsnT+
  '<div class="sh-lower"><div class="sh-l">'+(X.pan?'<div class="sh-pan">Company’s PAN: <b>'+esc(X.pan)+'</b></div>':'')+'<div class="sh-decl"><div class="lb">Declaration</div>'+esc(X.de||BS_DEF_DE)+'</div>'+bank+'</div>'+
  '<div class="sh-r"><div class="sh-sum"><div class="gt"><span>Grand Total</span><span>'+money(d.total)+'</span></div><div><span>Amount Received</span><span>'+money(d.paid)+'</span></div>'+(due>0?'<div class="due"><span>Balance Due</span><span>'+money(due)+'</span></div>':'<div class="okr"><span>Balance Due</span><span>'+money(0)+'</span></div>')+'</div><div class="sh-sign"><div>for <b>'+esc(d.biz.n)+'</b></div><i></i>Authorised Signatory</div></div></div>'+
  '<div class="sh-thanks">This is a computer generated invoice · Thank you for your business</div></div>'+(compact||noBack?'':backHTML(d))}
function backHTML(d){var X=d.biz.x||{},t=(X.tc||BS_DEF_TC).split('|').filter(Boolean);return '<div class="sheet sh-back">'+wmHTML(X)+'<div class="sh-bk"><h3>Terms &amp; Conditions</h3><ol>'+t.map(function(x){return '<li>'+esc(x)+'</li>'}).join('')+'</ol><p>Invoice No: <b>'+esc(d.id)+'</b> · '+fdate(d.date)+'</p><p>'+esc(d.biz.n)+(d.biz.p?' · Ph: '+esc(d.biz.p):'')+'</p></div></div>'}

function readNbX(){var g=function(i){return (($(i)||{}).value||'').trim()},o={gstin:g('#nb-gstin').toUpperCase(),po:g('#nb-po'),veh:g('#nb-veh'),dest:g('#nb-dest')};Object.keys(o).forEach(function(k){if(!o[k])delete o[k]});return o}

/* ---------- v17: Dispatch to Employees (route load) + employee vehicle stock in New Bill ---------- */
function eaKey(d,t){return (d||'')+' '+(t||'00:00')}
function eaAlloc(name){var emps=S.employees.filter(function(e){return e.name==name}).map(function(e){return e.id});if(!emps.length)return null;
 var rs=S.fg.filter(function(r){return (r.kind=='EmpLoad'||r.kind=='EmpReturn')&&emps.indexOf(r.emp)>=0});if(!rs.length)return null;
 var loaded={},ret={},sold={},cut=rs.filter(function(r){return r.kind=='EmpLoad'}).map(function(r){return eaKey(r.date,r.tm)}).sort()[0]||'';
 rs.forEach(function(r){var m=r.kind=='EmpLoad'?loaded:ret;m[r.size]=round2((m[r.size]||0)+(+r.qty||0))});
 S.bills.forEach(function(b){if(b.by!=name||(b.x&&b.x.from)||eaKey(b.date,b.time)<cut)return;b.items.forEach(function(i){sold[i.p]=round2((sold[i.p]||0)+i.q/(i.cs||1))})});
 return {loaded:loaded,ret:ret,sold:sold}}
function eaLeft(a,z){return round2((a.loaded[z]||0)-(a.ret[z]||0)-(a.sold[z]||0))}
function eaTiles(a,pend){pend=pend||{};return fgSizes().filter(function(z){return a.loaded[z]||a.sold[z]||pend[z]}).map(function(z){var l=round2(eaLeft(a,z)-(pend[z]||0));return '<div class="bt1'+(l<0?' zero':l===0?' zero':'')+'"><small>'+esc(z)+'</small><b>'+nf(l)+'</b><em class="ea-s">Loaded '+nf((a.loaded[z]||0)-(a.ret[z]||0))+' · Sold '+nf(round2((a.sold[z]||0)+(pend[z]||0)))+'</em></div>'}).join('')}
function eaPend(){var p={};if(typeof NB!='undefined'&&NB.lines)NB.lines.forEach(function(l){var q=lc(l);if(l.q>0&&q)p[q.n]=round2((p[q.n]||0)+l.q/(q.c||1))});return p}
function eaBox(){var a=eaAlloc(curUser());if(!a)return '';return '<div class="card nb-sec" id="emp-stock"><h3>Your vehicle stock <small class="muted">cases left after this bill</small></h3><div class="btiles">'+eaTiles(a,eaPend())+'</div></div>'}
function eaRefresh(){var b=$('#emp-stock');if(!b)return;var a=eaAlloc(curUser());if(a)b.querySelector('.btiles').innerHTML=eaTiles(a,eaPend())}
var EL={lines:[{s:'',c:0}],from:'G1'};
function elLines(){var sz=fgSizes(),b=fgBal();return EL.lines.map(function(l,i){var have=l.s?fgGet(b,EL.from,l.s):null;
 return '<div class="ell"><div class="fld"><label>Bottle size</label><select data-el="size" data-i="'+i+'"><option value="">Select size</option>'+sz.map(function(z){return '<option'+(z==l.s?' selected':'')+'>'+esc(z)+'</option>'}).join('')+'</select>'+(have!=null?'<small class="muted">Available at '+esc(locName(EL.from))+': <b>'+nf(have)+'</b> cases</small>':'')+'</div><div class="fld"><label>Cases to load</label><input type="number" min="0" step="any" inputmode="decimal" data-el="cs" data-i="'+i+'" value="'+(l.c>0?l.c:'')+'" placeholder="0"></div>'+(EL.lines.length>1?'<button type="button" class="rm" data-el="rm" data-i="'+i+'">✕ Remove</button>':'<span></span>')+'</div>'}).join('')}
function eaCards(){var emps=S.employees.filter(function(e){return eaAlloc(e.name)});
 return emps.length?emps.map(function(e){var a=eaAlloc(e.name);return '<div class="bloc"><div class="bt"><span>'+esc(e.name)+'</span><em>On vehicle now</em></div><div class="btiles">'+eaTiles(a)+'</div></div>'}).join(''):'<div class="empty">No stock loaded to employees yet.</div>'}
PAGES['fg-empload']=function(){
 FORMS.eret=function(v){var e=S.employees.filter(function(x){return x.id==v.emp})[0];if(!e)return 'ERROR: Select the employee';var q=+v.qty;if(!(q>0))return 'ERROR: Enter the cases returned';var a=eaAlloc(e.name);var left=a?eaLeft(a,v.size):0;if(q>left+0.0001)return 'ERROR: '+e.name+' has only '+nf(left)+' cases of '+v.size+' left';
  S.fg.push({id:nid('F',S.fg),kind:'EmpReturn',date:v.date,tm:new Date().toTimeString().slice(0,5),size:v.size,qty:q,from:'V',to:v.to,emp:e.id,note:'Unsold stock returned',by:fgBy(),at:new Date().toISOString()});return nf(q)+' cases of '+v.size+' returned from '+e.name+' to '+locName(v.to)};
 var td=S.fg.filter(function(r){return r.kind=='EmpLoad'&&r.date==today()}),emps=S.employees.map(function(e){return [e.id,e.name+(e.role?' ('+e.role+')':'')]}),vs=(S.vehicles||[]).map(function(x){return x.number});
 return head('Dispatch to Employees','<a class="btn alt sm" href="#fg-dispatch">Dispatch to Customers →</a>')+'<div class="note" style="margin:0 0 12px">Load stock onto a delivery employee’s vehicle for route sales. The employee then sees how many cases are left whenever they make a New Bill. Direct sales to a wholesaler / dealer from the godown go under Dispatch to Customers.</div>'+
 kp([['Cases loaded today',nf(fgSum(td))],['Loads today',td.length]])+fgChips(['G1','G2','P'])+
 '<form id="elform" class="nb" autocomplete="off" novalidate><div class="card nb-sec"><h3>Load details</h3><div class="nb-pay"><div class="fld"><label for="el-date">Date</label><input id="el-date" type="date" value="'+today()+'"></div><div class="fld"><label for="el-emp">Employee *</label><select id="el-emp"><option value="">Select employee</option>'+emps.map(function(e){return '<option value="'+e[0]+'">'+esc(e[1])+'</option>'}).join('')+'</select></div>'+
 '<div class="fld"><label for="el-from">Dispatch from</label><select id="el-from">'+['G1','G2','P'].map(function(g){return '<option value="'+g+'"'+(g==EL.from?' selected':'')+'>'+esc(locName(g))+'</option>'}).join('')+'</select></div><div class="fld"><label for="el-veh">Vehicle (optional)</label><input id="el-veh" list="el-vl" placeholder="Vehicle number"><datalist id="el-vl">'+vs.map(function(v){return '<option value="'+esc(v)+'"></option>'}).join('')+'</datalist></div></div></div>'+
 '<div class="card nb-sec"><h3>Stock to load (cases)</h3><div id="el-lines">'+elLines()+'</div><button type="button" class="btn alt" data-el="add">+ Add Size</button></div>'+
 '<div class="nb-actions st"><button type="submit" class="btn">Load Stock to Employee</button></div></form>'+
 '<h3 style="margin:18px 0 8px">Stock on employee vehicles now</h3><div class="board"><div class="bgrid">'+eaCards()+'</div></div>'+
 '<h3 style="margin:18px 0 8px">Return unsold stock</h3>'+formCard([{k:'date',l:'Date',t:'date'},{k:'emp',l:'Employee',t:'select',o:emps.length?emps:[['','No employees']]},{k:'to',l:'Return to',t:'select',o:locOpts(['G1','G2','P'])},{k:'size',l:'Bottle size',t:'select',o:fgSizes()},{k:'qty',l:'Cases returned',t:'number'}],'Return Stock','eret')+
 '<h3 style="margin:18px 0 8px">Load history</h3>'+table(['Date','Employee','Size','Cases','From','Vehicle','Loaded by',''],S.fg.filter(function(r){return r.kind=='EmpLoad'||r.kind=='EmpReturn'}).slice().reverse().map(function(r){return [r.date,esc(empName(r.emp)),esc(r.size),'<b>'+(r.kind=='EmpReturn'?'−':'')+nf(r.qty)+'</b>',r.kind=='EmpReturn'?'Returned to '+esc(locName(r.to)):esc(locName(r.from)),esc(r.vehicle||''),esc(r.by||''),del('fg',r.id)]}),'Nothing loaded yet.')};
document.addEventListener('change',function(e){var t=e.target;if(t.id=='el-from'){EL.from=t.value;$('#el-lines').innerHTML=elLines()}else if(t.dataset&&t.dataset.el=='size'){EL.lines[+t.dataset.i].s=t.value;$('#el-lines').innerHTML=elLines()}});
document.addEventListener('input',function(e){var t=e.target;if(t.dataset&&t.dataset.el=='cs')EL.lines[+t.dataset.i].c=Math.max(0,+t.value||0)});
document.addEventListener('click',function(e){var t=e.target.closest('[data-el]');if(!t||!t.dataset.el)return;var a=t.dataset.el,i=+t.dataset.i;if(a=='add'){EL.lines.push({s:'',c:0});$('#el-lines').innerHTML=elLines()}else if(a=='rm'){EL.lines.splice(i,1);$('#el-lines').innerHTML=elLines()}});
document.addEventListener('submit',function(e){if(e.target.id!='elform')return;e.preventDefault();e.stopPropagation();
 var emp=$('#el-emp').value,from=$('#el-from').value,veh=$('#el-veh').value.trim(),date=$('#el-date').value||today();
 if(!emp){bad('#el-emp','Select the employee');return}clearErr('#el-emp');
 var ls=EL.lines.filter(function(l){return l.s&&+l.c>0});if(!ls.length){toast('Select a size and enter the cases');return}
 var need={};ls.forEach(function(l){need[l.s]=round2((need[l.s]||0)+(+l.c))});var bal=fgBal(),k;for(k in need){if(need[k]>fgGet(bal,from,k)+0.0001){toast('Only '+nf(fgGet(bal,from,k))+' cases of '+k+' available at '+locName(from));return}}
 ls.forEach(function(l){S.fg.push({id:nid('F',S.fg),kind:'EmpLoad',date:date,tm:new Date().toTimeString().slice(0,5),size:l.s,qty:+l.c,from:from,to:'V',emp:emp,vehicle:veh,note:'Loaded for route sales',by:fgBy(),at:new Date().toISOString()})});
 EL={lines:[{s:'',c:0}],from:from};save();toast('Stock loaded to '+empName(emp));render()},true);

/* ---------- v18: premium dashboard, global search, SR Industries logo watermark ---------- */
var IMG_HERO='/assets/hero.jpg';
var IMG_WM='/assets/watermark.png';
function wmHTML(X){var w=X&&X.wm;if(!w||w=='SR INDUSTRIES')return '<div class="sh-wm sh-wmi"><img src="'+IMG_WM+'" alt=""></div>';return '<div class="sh-wm">'+esc(w)+'</div>'}
/* ---- global search ---- */
var GS={items:[],sel:0};
function gsFind(q){q=(q||'').trim().toLowerCase();if(!q)return [];var d=digits(q),out=[],has=function(a){var j=a.join(' ').toLowerCase();return j.indexOf(q)>-1||(d.length>2&&digits(j).indexOf(d)>-1)};
 S.customers.filter(function(c){return has([c.name,c.phone,c.area,c.id])}).slice(0,6).forEach(function(c){var st=cstat(c);out.push({g:'Customers',t:c.name,s:c.phone+(c.area?' · '+c.area:'')+(st.pend>0?' · Due '+money(st.pend):''),a:'cust',id:c.id})});
 S.bills.filter(function(b){return has([b.id,b.name,b.mobile,b.date,b.mode])}).slice(-6).reverse().forEach(function(b){out.push({g:'Bills',t:'Bill #'+b.id+' · '+(b.name||''),s:fdate(b.date)+' · '+money(b.total)+(b.total>b.paid?' · Due '+money(round2(b.total-b.paid)):' · Paid'),a:'bill',id:b.id})});
 S.employees.filter(function(e){return has([e.name,e.phone,e.role,e.id])}).slice(0,5).forEach(function(e){var al=eaAlloc(e.name),left=al?fgSizes().map(function(z){return eaLeft(al,z)>0?z+' '+nf(eaLeft(al,z)):''}).filter(Boolean).join(', '):'';out.push({g:'Employees',t:e.name,s:(e.role||'')+' · '+(e.phone||'')+(left?' · On vehicle: '+left:''),a:'go',id:'employees'})});
 var bl=fgBal();fgSizes().filter(function(z){return z.toLowerCase().indexOf(q)>-1}).forEach(function(z){out.push({g:'Stock',t:z+' – finished stock',s:['G1','G2','P'].map(function(l){return locName(l).split(' (')[0]+' '+nf(fgGet(bl,l,z))}).join(' · '),a:'go',id:'stock-overview'})});
 var lv=stockLevels();Object.keys(lv).filter(function(k){return k.toLowerCase().indexOf(q)>-1}).slice(0,4).forEach(function(k){out.push({g:'Stock',t:k+' – raw material',s:nf(lv[k])+' in stock',a:'go',id:'current-stock'})});
 (S.vehicles||[]).filter(function(v){return has([v.number,v.driver,v.type])}).slice(0,3).forEach(function(v){out.push({g:'Vehicles',t:v.number,s:(v.type||'')+(v.driver?' · '+v.driver:''),a:'go',id:'vehicles'})});
 (S.contacts||[]).filter(function(c){return has([c.name,c.phone,c.work,c.type])}).slice(0,3).forEach(function(c){out.push({g:'Contacts',t:c.name,s:(c.type||'')+' · '+c.phone,a:'go',id:'contacts'})});
 NAV.forEach(function(g){g[1].forEach(function(n){if(n[1].toLowerCase().indexOf(q)>-1)out.push({g:'Pages',t:n[1],s:'Open page',a:'go',id:n[0]})})});
 return out.slice(0,24)}
function gsBox(){var b=$('#gsres');if(!b){b=document.createElement('div');b.id='gsres';b.className='gsres';b.hidden=true;document.body.appendChild(b)}return b}
function gsShow(){var inp=$('#q'),b=gsBox(),v=inp.value;GS.items=gsFind(v);GS.sel=0;if(!v.trim()){b.hidden=true;return}
 var r=inp.closest('.search').getBoundingClientRect();b.style.left=Math.max(8,r.left)+'px';b.style.top=(r.bottom+6)+'px';b.style.width=Math.max(320,Math.min(560,innerWidth-16-r.left))+'px';
 if(!GS.items.length){b.innerHTML='<div class="gs-none">No results for “'+esc(v)+'”</div>';b.hidden=false;return}
 var last='',h='';GS.items.forEach(function(it,i){if(it.g!=last){h+='<div class="gs-g">'+it.g+'</div>';last=it.g}h+='<button type="button" class="gs-i'+(i==GS.sel?' on':'')+'" data-gs="'+i+'"><b>'+esc(it.t)+'</b><small>'+esc(it.s)+'</small></button>'});b.innerHTML=h;b.hidden=false}
function gsGo(i){var it=GS.items[i];if(!it)return;gsBox().hidden=true;var inp=$('#q');inp.value='';inp.blur();document.body.classList.remove('searching');
 if(it.a=='cust'){CV=it.id;if(location.hash=='#customers')render();else location.hash='#customers'}
 else if(it.a=='bill'){if(location.hash!='#bills')location.hash='#bills';setTimeout(function(){showPreview(it.id)},80)}
 else location.hash='#'+it.id}
document.addEventListener('input',function(e){if(e.target.id=='q')gsShow()});
document.addEventListener('focusin',function(e){if(e.target.id=='q'&&e.target.value.trim())gsShow()});
document.addEventListener('keydown',function(e){if(e.target.id!='q')return;var b=gsBox();
 if(e.key=='Escape'){b.hidden=true;e.target.value='';e.target.blur();return}
 if(b.hidden||!GS.items.length)return;
 if(e.key=='ArrowDown'||e.key=='ArrowUp'){e.preventDefault();GS.sel=(GS.sel+(e.key=='ArrowDown'?1:-1)+GS.items.length)%GS.items.length;[].forEach.call(b.querySelectorAll('.gs-i'),function(x,i){x.classList.toggle('on',i==GS.sel);if(i==GS.sel)x.scrollIntoView({block:'nearest'})})}
 else if(e.key=='Enter'){e.preventDefault();gsGo(GS.sel)}});
document.addEventListener('mousedown',function(e){var t=e.target.closest('[data-gs]');if(t){e.preventDefault();gsGo(+t.dataset.gs);return}if(!e.target.closest('.search,#gsres')){var b=$('#gsres');if(b)b.hidden=true}});

/* ----- Payments ----- */
PAGES.payments=function(){
 var pend=S.customers.map(function(c){return [c,cstat(c).pend]}).filter(function(a){return a[1]>0}).sort(function(a,b){return a[0].name.localeCompare(b[0].name)});
 var pre=pend.filter(function(a){return a[0].id==PAYCUST})[0];if(!pre)PAYCUST='';
 var sel=pre?pre[0].id:(pend[0]?pend[0][0].id:''),cust=sel&&cget(sel),bills=cust?cbills(cust.id).filter(function(b){return round2(b.total-b.paid)>0}):[];
 var billSel=bills[0],billDue=billSel?round2(billSel.total-billSel.paid):0;
 var form=pend.length?'<form id="payform" class="card form" autocomplete="off" novalidate>'+
  '<div class="fld" style="grid-column:1/-1"><label for="pay-search">Search customer by mobile number or name</label><input id="pay-search" type="search" placeholder="Paste mobile number or type customer name" autocomplete="off"></div>'+
  '<div class="fld" style="grid-column:1/-1"><label for="pay-c">Customer</label><select id="pay-c">'+pend.map(function(a){return '<option value="'+a[0].id+'"'+(a[0].id==sel?' selected':'')+'>'+esc(a[0].name)+' · '+esc(a[0].phone)+' · Pending '+money(a[1])+'</option>'}).join('')+'</select></div>'+
  '<div class="fld" style="grid-column:1/-1"><label for="pay-b">Bill Number (choose the exact bill)</label><select id="pay-b">'+bills.map(function(b){return '<option value="'+b.id+'">#'+esc(b.id)+' · '+fdate(b.date)+' · Total '+money(b.total)+' · Paid '+money(b.paid)+' · Due '+money(round2(b.total-b.paid))+'</option>'}).join('')+'</select></div>'+
  '<div class="fld"><label for="pay-a">Amount received (₹)</label><input id="pay-a" type="number" min="0.01" step="0.01" inputmode="decimal" value="'+billDue+'" max="'+billDue+'"></div>'+
  '<div class="fld"><label for="pay-m">Payment mode</label><select id="pay-m">'+MODES.map(function(m){return '<option>'+m+'</option>'}).join('')+'</select></div>'+
  '<div class="fld"><label for="pay-d">Date</label><input id="pay-d" type="date" value="'+today()+'"></div>'+
  '<div class="fld"><button class="btn green" type="submit" style="width:100%;height:42px">Save Payment</button></div>'+
  '<div id="payinfo" class="note" style="grid-column:1/-1;margin:0">Payment applies only to selected bill.</div></form>'
  :'<div class="card"><div class="empty">No customer has a pending amount right now. Nothing to receive.</div></div>';
 var l=S.payments.slice().reverse();
 return head2('Payments','Search by customer mobile/name, then select the exact bill. Bill total, received and due are shown separately.')+form+
  '<h3 style="margin:18px 0 0">Payment history</h3>'+table(['Date','Customer','Amount Paid','Mode','Against bill',''],l.map(function(p){return [fdate(p.date),esc(custName(p.cust)),money(p.amount),esc(p.mode),p.bill=='-'?'Advance':'#'+esc(p.bill),del('payments',p.id)]}),'No payments yet.')};
function paySearchCustomers(q){var s=$('#pay-c');if(!s)return;var needle=(q||'').trim(),all=S.customers.filter(function(c){return matchCust(c,needle)}),matches=all.map(function(c){return [c,cstat(c).pend]}).filter(function(a){return a[1]>0}),current=s.value;
 s.innerHTML=matches.map(function(a){return '<option value="'+a[0].id+'">'+esc(a[0].name)+' · '+esc(a[0].phone)+' · Pending '+money(a[1])+'</option>'}).join('');
 if(matches.some(function(a){return a[0].id==current}))s.value=current;else if(matches.length)s.value=matches[0][0].id;
 payFill();
 if(!matches.length)$('#payinfo').innerHTML=!needle?'No customer has a pending amount.':all.length?all.map(function(c){return '<b>'+esc(c.name)+'</b> ('+esc(c.phone)+')'}).join(', ')+' has no unpaid bills. Nothing to receive.':'No customer found for "'+esc(needle)+'".'}
function payFill(){var s=$('#pay-c');if(!s)return;var c=cget(s.value),bs=c?cbills(c.id).filter(function(b){return round2(b.total-b.paid)>0}):[],sel=$('#pay-b');if(!sel)return;sel.innerHTML=bs.map(function(b){return '<option value="'+b.id+'">#'+esc(b.id)+' · '+fdate(b.date)+' · Total '+money(b.total)+' · Paid '+money(b.paid)+' · Due '+money(round2(b.total-b.paid))+'</option>'}).join('');var b=bs[0],due=b?round2(b.total-b.paid):0;$('#pay-a').value=due;$('#pay-a').max=due;var total=c?cstat(c).pend:0;payInfo(b,total,due)}
function payBillFill(){var id=$('#pay-b').value,b=S.bills.filter(function(x){return x.id==id})[0],due=b?round2(b.total-b.paid):0;$('#pay-a').value=due;$('#pay-a').max=due;var c=b&&cget(b.cust),total=c?cstat(c).pend:0;payInfo(b,total,due)}
function payInfo(b,total,due){$('#payinfo').innerHTML=b?'<div style="display:flex;flex-wrap:wrap;gap:10px;margin-bottom:8px"><span style="color:#c2502a;font-weight:700">Bill total: '+money(b.total)+'</span><span style="color:#16a34a;font-weight:700">Paid: '+money(b.paid)+'</span><span style="color:#dc2626;font-weight:700">Due: '+money(due)+'</span></div><b>Customer total pending: '+money(total)+'</b><br>Amount defaults to selected bill due. Payment updates this bill only.':'No unpaid bills for this customer.'}
document.addEventListener('input',function(e){if(e.target.id=='pay-search')paySearchCustomers(e.target.value)});
document.addEventListener('change',function(e){if(e.target.id=='pay-c')payFill();else if(e.target.id=='pay-b')payBillFill()});
document.addEventListener('submit',function(e){if(e.target.id!='payform')return;e.preventDefault();
 var b=S.bills.filter(function(x){return x.id==$('#pay-b').value})[0],c=b&&cget(b.cust),pend=b?round2(b.total-b.paid):0,a=round2(+$('#pay-a').value||0);clearErr('#pay-a');
 if(!b||!c)return toast('Select an unpaid bill');
 if(!(a>0))return bad('#pay-a','Enter an amount received');
 if(a>pend)return bad('#pay-a','Amount cannot be more than this bill pending '+money(pend));
 b.paid=round2(b.paid+a);S.payments.push({id:nid('P',S.payments),date:$('#pay-d').value||today(),cust:c.id,amount:a,mode:$('#pay-m').value,bill:b.id});save();PAYCUST='';toast(money(a)+' received for bill #'+b.id+'. Bill pending '+money(round2(b.total-b.paid)));render()});

/* ----- Bill cancellation and controlled deletion ----- */
function billDispositionModal(action,id){
 var b=S.bills.filter(function(x){return x.id==id})[0];if(!b)return;
 var isDel=action=='delete',title=isDel?'Delete bill #'+esc(id):'Cancel bill #'+esc(id);
 var linkedPayments=S.payments.filter(function(p){return p.bill==id}),linkedAmount=sum(linkedPayments,function(p){return p.amount||0});
 var note=isDel?'This bill will move to Deleted Bills. The original record and reason remain in the audit archive.':'This bill will move to Cancelled Bills and will no longer count in active sales or outstanding totals. '+(linkedPayments.length?'Existing receipts ('+linkedPayments.length+' payment(s), '+money(linkedAmount)+') will remain in Payment History for audit; handle any refund or adjustment separately.':'No payment is linked to this bill.');
 var html='<div class="bill-modal-title"><span class="mark">'+(isDel?'🔒':'⊘')+'</span><div><h3 style="text-align:left;margin:0">'+title+'</h3><small class="muted">'+esc(bname(b))+' · '+money(b.total)+' · '+fdate(b.date)+'</small></div></div><p style="text-align:left">'+note+'</p>'+
 '<form id="billDispositionForm" data-action="'+action+'" data-id="'+esc(id)+'" class="form" style="grid-template-columns:1fr">'+
 '<div class="fld"><label for="bill-action-by">Employee name</label><input id="bill-action-by" name="actionBy" required maxlength="80" placeholder="Enter employee name"></div>'+
 '<div class="fld"><label for="bill-action-reason">'+(isDel?'Deletion reason':'Cancellation reason')+'</label><textarea class="bill-reason" id="bill-action-reason" name="actionReason" required minlength="5" maxlength="500" placeholder="Explain why this bill is '+(isDel?'being deleted':'being cancelled')+'"></textarea></div>'+
 '<div class="note warn">'+(isDel?'Moving this bill to Deleted Bills archive.':'Cancellation keeps the original bill in the Cancelled Bills archive.')+'</div><div class="dact"><button type="button" class="btn alt" data-nb="close">Go back</button><button type="submit" class="btn '+(isDel?'danger':'')+'">'+(isDel?'Confirm Deletion':'Confirm Cancellation')+'</button></div></form>';
 openModal(html);
}
function archiveBill(action,id,data){var b=S.bills.filter(function(x){return x.id==id})[0];if(!b)return false;
 var archived=Object.assign({},b,{archiveType:action,actionReason:data.actionReason.trim(),actionBy:data.actionBy.trim(),actionDate:new Date().toLocaleString('en-IN'),actionAt:new Date().toISOString()});
 if(action=='cancel')S.cancelledBills.push(archived);else S.deletedBills.push(archived);
 S.bills=S.bills.filter(function(x){return x.id!=id});save();closeModal();render();toast('Bill #'+id+(action=='cancel'?' cancelled':' moved to Deleted Bills')+'. Reason saved.');return true}
document.addEventListener('submit',function(e){var f=e.target;
 if(f.id=='billDispositionForm'){e.preventDefault();var d={actionBy:f.elements.actionBy.value,actionReason:f.elements.actionReason.value};
  if(d.actionBy.trim().length<2||d.actionReason.trim().length<5){toast('Enter employee name and a clear reason');return}
  archiveBill(f.dataset.action=='delete'?'delete':'cancel',f.dataset.id,d);return}
});
document.addEventListener('click',function(e){var t=e.target.closest('[data-billact]');if(t)billDispositionModal(t.dataset.billact,t.dataset.id)});
/* ----- Deleting with a clear warning, cascade and Undo ----- */
function askDelete(kind,id){var h='',pays,bl;
 if(kind=='payments'){var p=S.payments.filter(function(x){return x.id==id})[0];if(!p)return;
  h='<h3>Delete this payment?</h3><p><b>'+money(p.amount)+'</b> received from <b>'+esc(custName(p.cust))+'</b> on '+fdate(p.date)+(p.bill=='-'?' (advance)':' against bill <b>#'+esc(p.bill)+'</b>')+'.'+(p.bill=='-'?'':'<br><br>Bill #'+esc(p.bill)+' will show this '+money(p.amount)+' as pending again, everywhere (Customers, All Bills, Credit / Outstanding, Dashboard).')+'</p>'}
 else if(kind=='bills'){var b=S.bills.filter(function(x){return x.id==id})[0];if(!b)return;pays=S.payments.filter(function(x){return x.bill==id});
  h='<h3>Delete bill #'+esc(b.id)+'?</h3><p>Bill of <b>'+money(b.total)+'</b> for <b>'+esc(bname(b))+'</b> ('+fdate(b.date)+').<br><br>'+(pays.length?'Its '+pays.length+' payment'+(pays.length>1?'s':'')+' ('+money(sum(pays,function(x){return x.amount}))+') will also be removed from Payment history. ':'')+'The customer stays in Customers.</p>'}
 else{var c=cget(id);if(!c)return;bl=cbills(id);pays=S.payments.filter(function(x){return x.cust==id});
  h='<h3>Delete customer '+esc(c.name)+'?</h3><p>'+(bl.length?'This will also delete their <b>'+bl.length+' bill'+(bl.length>1?'s':'')+'</b> ('+money(sum(bl,function(x){return x.total}))+') and <b>'+pays.length+' payment'+(pays.length==1?'':'s')+'</b>. Their pending '+money(cstat(c).pend)+' will disappear from Credit / Outstanding.':'This customer has no bills or payments.')+'</p>'}
 openModal(h+'<div class="dact"><button type="button" class="btn alt" data-nb="close">Cancel</button><button type="button" class="btn" style="background:var(--red);color:#fff" data-dx="'+kind+':'+id+'">Yes, delete</button></div>')}
function doDelete(kind,id){var snap=JSON.stringify(S),msg;
 if(kind=='payments'){S.payments=S.payments.filter(function(x){return x.id!=id});msg='Payment deleted'}
 else if(kind=='bills'){S.payments=S.payments.filter(function(x){return x.bill!=id});S.bills=S.bills.filter(function(x){return x.id!=id});msg='Bill '+id+' deleted'}
 else{S.payments=S.payments.filter(function(x){return x.cust!=id});S.bills=S.bills.filter(function(x){return x.cust!=id});S.customers=S.customers.filter(function(x){return x.id!=id});CV=null;msg='Customer deleted'}
 save();closeModal();render();
 toast(msg+'. Tap Undo if this was a mistake.',function(){S=JSON.parse(snap);save();render();toast('Restored')})}
document.addEventListener('click',function(e){var x=e.target.closest('[data-dx]');if(x){var p=x.dataset.dx.split(':');doDelete(p[0],p.slice(1).join(':'));return}
 if(e.target.closest('#tundo')&&toast.u){var f=toast.u;toast.u=null;f()}});
/* ===== New employee joining: invite link, employee form, owner approval ===== */
var INVLINK=null,JOIN={t:'',biz:'',own:'',photo:'',doc:'',docType:'',stream:null,app:null};
var VD=[[0,1,2,3,4,5,6,7,8,9],[1,2,3,4,0,6,7,8,9,5],[2,3,4,0,1,7,8,9,5,6],[3,4,0,1,2,8,9,5,6,7],[4,0,1,2,3,9,5,6,7,8],[5,9,8,7,6,0,4,3,2,1],[6,5,9,8,7,1,0,4,3,2],[7,6,5,9,8,2,1,0,4,3],[8,7,6,5,9,3,2,1,0,4],[9,8,7,6,5,4,3,2,1,0]],
 VP=[[0,1,2,3,4,5,6,7,8,9],[1,5,7,6,2,8,3,0,9,4],[5,8,0,3,7,9,6,1,4,2],[8,9,1,6,0,4,3,5,2,7],[9,4,5,3,1,2,6,8,7,0],[4,2,8,6,5,7,3,9,0,1],[2,7,9,3,8,0,6,4,1,5],[7,0,4,6,9,1,3,2,5,8]];
function aadhaarOk(a){a=String(a||'');if(!/^[2-9]\d{11}$/.test(a))return false;var c=0,r=a.split('').reverse();for(var i=0;i<r.length;i++)c=VD[c][VP[i%8][+r[i]]];return c===0}
function normalizeDL(v){return String(v||'').toUpperCase().replace(/[\s\/-]/g,'')}
function drivingLicenseOk(v){v=normalizeDL(v);return !v||/^[A-Z]{2}\d{2}\d{4}\d{7}$/.test(v)}
function maskA(a){a=String(a||'');return a.length==12?'XXXX XXXX '+a.slice(8):'Not provided'}
function fmtA(a){a=String(a||'');return a?a.replace(/(\d{4})(?=\d)/g,'$1 '):'Not provided'}
function newTok(){var a='abcdefghjkmnpqrstuvwxyz23456789',t='';for(var i=0;i<8;i++)t+=a.charAt(Math.floor(Math.random()*a.length));return t}
function readImg(file,maxW,q){return new Promise(function(res,rej){var fr=new FileReader();fr.onerror=function(){rej()};fr.onload=function(){var im=new Image();im.onerror=function(){rej()};im.onload=function(){var sc=Math.min(1,maxW/Math.max(im.width,im.height)),c=document.createElement('canvas');c.width=Math.max(1,Math.round(im.width*sc));c.height=Math.max(1,Math.round(im.height*sc));c.getContext('2d').drawImage(im,0,0,c.width,c.height);res(c.toDataURL('image/jpeg',q))};im.src=fr.result};fr.readAsDataURL(file)})}
function copyTxt(v){if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(v).then(function(){toast('Copied')},function(){copyTxtFb(v)})}else copyTxtFb(v)}
function copyTxtFb(v){var x=document.createElement('textarea');x.value=v;x.style.position='fixed';x.style.opacity='0';document.body.appendChild(x);x.select();try{document.execCommand('copy');toast('Copied')}catch(e){toast('Copy not supported, select the link and copy it')}x.remove()}

/* ---------- owner: invite + approvals ---------- */
function mkInviteLink(inv){return location.href.split('#')[0]+'#join='+b64e({t:inv.t,b:S.settings.name,p:digits(S.settings.phone),department:inv.department||'Water Plant'})}
function waInvite(){var l=INVLINK;if(!l)return '#';var m='Hello! Please fill your joining details for '+S.settings.name+' using this link:\n'+l.url+'\n\n'+S.settings.name+' లో చేరడానికి ఈ లింక్ ఓపెన్ చేసి మీ వివరాలు నింపండి.';return 'https://wa.me/'+(l.to?'91'+l.to:'')+'?text='+encodeURIComponent(m)}
var SYNC={busy:false,state:''};
function online(){return typeof navigator !== 'undefined' ? navigator.onLine !== false && location.protocol != 'file:' : location.protocol != 'file:'}
function api(path,opt){
 opt=opt||{};
 var sess=getSession();
 var token=sess&&sess.session&&sess.session.access_token;
 var headers=Object.assign({'content-type':'application/json'},opt.headers||{});
 if(token)headers['authorization']='Bearer '+token;
 opt.headers=headers;
 return fetch(path,opt);
}
function syncApps(manual){
 if(!online()||SYNC.busy)return Promise.resolve();
 var sess=getSession();
 if(!sess||!sess.session)return Promise.resolve();
 SYNC.busy=true;var ok=0,names=[];
 return api('/api/apps').then(function(r){if(!r.ok)throw r.status;return r.json()}).then(function(d){
  (d.items||[]).forEach(function(o){var r=addApplication(o);if(r=='ok'){ok++;names.push(o.name)}});
  SYNC.state='ok';
  if(ok){save();toast(ok==1?'New joining application: '+names[0]:ok+' new joining applications');var f=document.activeElement;if((PAGE_IS('employees')||PAGE_IS('cafe-employees'))&&!(f&&/INPUT|SELECT|TEXTAREA/.test(f.tagName)))render()}else if(manual)toast('No new applications');
 }).catch(function(e){SYNC.state='err';if(manual)toast('Could not sync applications')}).then(function(){SYNC.busy=false;if((PAGE_IS('employees')||PAGE_IS('cafe-employees'))&&(manual||SYNC.state!='ok')){var el=$('#sync-st');if(el)el.outerHTML=syncStatus()}});
}
function PAGE_IS(id){return (location.hash||'#dashboard').replace('#','').split('?')[0]==id}
function syncStatus(){
 if(!online())return '<span id="sync-st" class="muted">Not available offline</span>';
 var sess=getSession();
 if(!sess||!sess.session)return '<span id="sync-st" class="muted">Sign in with owner/manager account to sync</span>';
 return '<span id="sync-st" class="muted" style="color:var(--green)">Connected to Supabase · new applications sync automatically</span>';
}
setInterval(function(){if(!document.hidden&&!JOIN.t)syncApps(false)},25000);
var ROLES=['Driver','Helper','Operator','System Operator','Sweeper','Security Guard','Accountant','Salesman','Other'];
function appCard(a){var roleOptions=a.department=='Cafe'?['Cafe Manager','Cashier','Barista','Cook','Service Staff','Cleaner','Other']:ROLES;return '<div class="apc"><img class="eph big" src="'+a.photo+'" alt="Photo of '+esc(a.name)+'"><div class="ainfo"><b>'+esc(a.name)+'</b><span>'+esc(a.mobile)+' · Aadhaar '+maskA(a.aadhaar)+'</span><span>Emergency contact: '+esc(a.emergency?a.emergency+(a.emergencyName?' ('+a.emergencyName+')':''):'Not provided')+'</span><span>'+esc(a.address)+'</span><span>Applied '+fdate(a.date)+'</span><div class="rowact"><button type="button" class="btn sm alt" data-ej="doc" data-id="'+a.id+'">Aadhaar</button>'+(a.panDoc?'<button type="button" class="btn sm alt" data-ej="appdoc" data-id="'+a.id+'" data-type="pan">PAN</button>':'')+(a.licenseDoc?'<button type="button" class="btn sm alt" data-ej="appdoc" data-id="'+a.id+'" data-type="license">Licence</button>':'')+'</div></div>'+
 '<div class="aact"><div class="fld"><label for="ar-'+a.id+'">Role</label><select id="ar-'+a.id+'">'+roleOptions.map(function(r){return '<option>'+r+'</option>'}).join('')+'</select></div><div class="fld"><label for="as-'+a.id+'">Monthly salary (₹)</label><input id="as-'+a.id+'" type="number" min="0" inputmode="numeric" placeholder="0"></div><div class="arow"><button type="button" class="btn green" data-ej="approve" data-id="'+a.id+'">Approve</button><button type="button" class="btn sm alt" data-ej="pending" data-id="'+a.id+'">Keep Pending</button><button type="button" class="btn danger" data-ej="delete" data-id="'+a.id+'">Delete</button></div></div></div>'}
PAGES.employees=function(){setTimeout(function(){syncApps(false)},50);
 FORMS.mf=function(v){var ph=digits(v.phone),em=digits(v.emergency);if(!/^[6-9]\d{9}$/.test(ph))return 'ERROR: Enter the employee\'s own 10-digit mobile number';if(!/^[6-9]\d{9}$/.test(em))return 'ERROR: Enter a valid 10-digit emergency contact number';if(em==ph)return 'ERROR: Emergency contact must be a different number';if(S.employees.some(function(x){return digits(x.phone)==ph}))return 'ERROR: An employee with this mobile number already exists';S.employees.push({id:nid('M',S.employees),name:v.name,role:v.role,phone:ph,emergency:em,emergencyName:(v.emergencyName||'').trim(),address:(v.address||'').trim(),salary:+v.salary,joined:today(),joinedAt:new Date().toISOString()});return 'Employee added. Login ID: '+(RPFX[v.role]||'EM')+'-'+ph};
 var pend=S.applications.filter(function(a){return a.status=='Pending'&&(a.department||'Water Plant')!='Cafe'});
 var inv='<div class="card inv"><h3>Invite a new employee</h3><p class="pdesc">Send a joining link on WhatsApp. The employee fills personal details, Aadhaar and PAN details, uploads Aadhaar/PAN/Driving Licence documents, takes a live photo, and submits. You review and approve the application.</p>'+
  (location.protocol=='file:'?'<div class="note warn">This link will open on the employee\'s phone only after the app is hosted online (Cloudflare Pages). A link made from a file on this computer cannot be opened on another phone.</div>':'')+
  '<div class="invrow"><div class="fld"><label for="inv-me">Your WhatsApp number</label><input id="inv-me" type="tel" inputmode="numeric" maxlength="10" value="'+esc(digits(S.settings.phone))+'" placeholder="10-digit mobile"></div><div class="fld"><label for="inv-to">Employee mobile (optional, opens their chat)</label><input id="inv-to" type="tel" inputmode="numeric" maxlength="10" placeholder="10-digit mobile"></div><div class="fld"><button type="button" class="btn" data-ej="newinv" style="width:100%;height:42px">Create joining link</button></div></div>'+
  '<div class="linkbox" style="margin-top:10px"><span class="muted">Online connection:</span> '+syncStatus()+'</div>'+
  (INVLINK?'<div class="linkbox"><input id="inv-link" readonly value="'+esc(INVLINK.url)+'" aria-label="Joining link"><button type="button" class="btn alt" data-ej="copyinv">Copy link</button><a class="btn wa" target="_blank" rel="noopener" href="'+waInvite()+'">Send on WhatsApp</a></div>':'')+'</div>';
 var ap='<div class="card"><div class="aphead"><h3>Joining applications<span class="cnt">'+pend.length+' pending</span></h3><div><button type="button" class="btn sm" data-ej="refresh">Refresh</button> <button type="button" class="btn alt sm" data-ej="import">Import file</button><input type="file" id="ej-file" accept=".txt,.json,text/plain,application/json" hidden multiple></div></div>'+
  (pend.length?pend.map(appCard).join(''):'<p class="pdesc" style="margin:10px 0 0">No pending applications. When an employee submits the joining form, it appears here automatically.</p>')+'</div>';
 return head('Employee Management')+inv+ap+'<h3 style="margin:18px 0 0">Add employee manually</h3>'+formCard([{k:'name',l:'Name'},{k:'role',l:'Role',t:'select',o:ROLES},{k:'phone',l:'Employee mobile number (login ID)',t:'tel'},{k:'emergency',l:'Emergency contact number',t:'tel'},{k:'emergencyName',l:'Emergency contact person (optional)',r:false},{k:'address',l:'Employee address'},{k:'salary',l:'Monthly salary (₹)',t:'number'}],'Add Employee','mf')+
  '<div class="note" style="margin:8px 0 0">Employee login ID = role code + mobile number, e.g. Helper HP-9848012345, Operator OP-9848012345, Driver DR-…, Salesman SM-…</div><h3 style="margin:18px 0 0">All employees</h3>'+table(['Name','Login ID','Role','Phone','Emergency','Salary',''],S.employees.filter(function(e){return (e.department||'Water Plant')!='Cafe'}).map(function(e){return [(e.photo?'<img class="eph" src="'+e.photo+'" alt="">':'')+esc(e.name),'<b>'+esc(empCode(e))+'</b>',esc(e.role),esc(e.phone),esc(e.emergency||'-'),inr(e.salary),'<div class="rowact"><button type="button" class="btn sm alt" data-ej="profile" data-id="'+e.id+'">Profile</button>'+del('employees',e.id)+'</div>']}))};
function showDoc(id){var o=S.applications.filter(function(x){return x.id==id})[0]||S.employees.filter(function(x){return x.id==id})[0];if(!o||!o.doc){toast('No Aadhaar document uploaded');return}
 openModal('<h3>Aadhaar card</h3>'+(/^data:application\/pdf/.test(o.doc)?'<p><a class="btn" href="'+o.doc+'" download="aadhaar-'+esc(o.name)+'.pdf">Download PDF</a></p>':'<img class="docimg" src="'+o.doc+'" alt="Aadhaar card">')+'<div class="dact"><button type="button" class="btn alt" data-nb="close">Close</button></div>',true)}
function showApplicationDoc(id,type){var a=S.applications.filter(function(x){return x.id==id})[0];if(!a)return;var data=type=='pan'?a.panDoc:a.licenseDoc;if(!data){toast('Document not uploaded');return}var title=type=='pan'?'PAN card':'Driving Licence';openModal('<h3>'+title+'</h3>'+(/^data:application\/pdf/.test(data)?'<p><a class="btn" href="'+data+'" download="'+type+'-'+esc(a.name)+'.pdf">Download PDF</a></p>':'<img class="docimg" src="'+data+'" alt="'+title+'">')+'<div class="dact"><button type="button" class="btn alt" data-nb="close">Close</button></div>',true)}
function showEmployeeDoc(id,type){var e=S.employees.filter(function(x){return x.id==id})[0];if(!e)return;var field=type=='aadhaar'?'doc':type=='pan'?'panDoc':'licenseDoc',data=e[field];if(!data){toast('Document not uploaded');return}var title=type=='aadhaar'?'Aadhaar card':type=='pan'?'PAN card':'Driving Licence',pdf=/^data:application\/pdf/i.test(data),ext=pdf?'pdf':(/^data:image\/png/i.test(data)?'png':(/^data:image\/webp/i.test(data)?'webp':'jpg')),filename=type+'-'+String(e.name||'employee').replace(/[^a-z0-9_-]/gi,'_')+'.'+ext;openModal('<div class="ph"><h3 style="margin:0">'+title+'</h3><a class="btn green" href="'+data+'" download="'+filename+'">Download '+(pdf?'PDF':'Image')+'</a></div>'+(pdf?'<iframe title="'+title+' preview" src="'+data+'" style="width:100%;height:65vh;border:1px solid var(--line);border-radius:12px"></iframe>':'<img class="docimg" src="'+data+'" alt="'+title+'" style="max-height:65vh;object-fit:contain">')+'<div class="dact"><button type="button" class="btn alt" data-nb="close">Close</button></div>',true)}
function showProfile(id){
 var e=S.employees.filter(function(x){return x.id==id})[0];if(!e)return;
 var joined=e.joinedAt?new Date(e.joinedAt).toLocaleString('en-IN',{dateStyle:'medium',timeStyle:'medium'}):(e.joined?fdate(e.joined):'Not recorded');
 var docBtn=function(label,type,exists){return '<div class="card" style="padding:16px"><b>'+label+'</b><p class="pdesc">'+(exists?'Document uploaded':'Not uploaded')+'</p><div class="rowact">'+(exists?'<button type="button" class="btn sm alt" data-ej="doc-'+type+'" data-id="'+e.id+'">View</button><button type="button" class="btn sm green" data-ej="download-'+type+'" data-id="'+e.id+'">Download</button>':'')+'<label class="btn sm" style="display:inline-flex;align-items:center;cursor:pointer" for="emp-upload-'+type+'">'+(exists?'Replace file':'Upload file')+'</label><input id="emp-upload-'+type+'" data-empdoc="'+type+'" data-id="'+e.id+'" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" hidden></div><p class="pdesc">Image or PDF · Max 1.5 MB</p></div>'};
 var view=$('#view');if(!view)return;var oldTitle=$('#ptitle');if(oldTitle)oldTitle.textContent='Employee Profile';
 view.innerHTML='<div class="ph"><div><h2>Employee Profile</h2><p class="pdesc">Employee information and documents</p></div><div class="rowact"><button type="button" class="btn" data-ej="edit-details" data-id="'+e.id+'">✎ Edit Details</button><button type="button" class="btn alt" data-ej="backprofile">← Back to Employee Management</button></div></div>'+
 '<section class="card" style="margin-bottom:14px"><div style="display:flex;align-items:center;gap:18px;flex-wrap:wrap">'+(e.photo?'<img class="eph big" style="width:112px;height:112px" src="'+e.photo+'" alt="Employee photo">':'<div class="eph big" style="display:grid;place-items:center">No photo</div>')+'<div><h2 style="margin:0 0 5px">'+esc(e.name)+'</h2><p class="pdesc">'+esc(e.role)+'</p><span class="pill p-blue">Employee ID: '+esc(e.id)+'</span><div style="margin-top:10px"><label class="btn sm alt" for="emp-upload-photo">Change Photo</label><input id="emp-upload-photo" data-empdoc="photo" data-id="'+e.id+'" type="file" accept="image/jpeg,image/png,image/webp" hidden></div></div></div></section>'+
 '<section class="card" style="margin-bottom:14px"><h3>Personal & Employment Details</h3><div class="pf" style="grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:18px;margin-top:16px">'+
 '<div><small class="muted">Employee ID</small><br><b>'+esc(e.id)+'</b></div><div><small class="muted">Login ID (role + mobile)</small><br><b>'+esc(empCode(e))+'</b></div><div><small class="muted">Joining date & time</small><br><b>'+esc(joined)+'</b></div><div><small class="muted">Mobile number</small><br><b>'+esc(e.phone||'Not provided')+'</b></div><div><small class="muted">Emergency contact</small><br><b>'+esc(e.emergency?e.emergency+(e.emergencyName?' ('+e.emergencyName+')':''):'Not provided')+'</b></div><div><small class="muted">Monthly salary</small><br><b>'+inr(e.salary)+'</b></div><div style="grid-column:1/-1"><small class="muted">Full address</small><br><b>'+esc(e.address||'Not provided')+'</b></div><div><small class="muted">Aadhaar number</small><br><b>'+maskA(e.aadhaar)+'</b></div><div><small class="muted">PAN number</small><br><b>'+esc(e.pan||'Not provided')+'</b></div><div><small class="muted">Driving Licence number</small><br><b>'+esc(e.licenseNo||'Not provided')+'</b></div><div><small class="muted">Application ID</small><br><b>'+esc(e.app||'Manual entry')+'</b></div></div>'+
 '<div id="emp-edit-panel" hidden style="margin-top:18px;padding-top:16px;border-top:1px solid var(--line)"><h3>Edit Employee Details</h3><p class="pdesc">Correct the details below and save. Employee ID and joining date cannot be changed.</p><form id="employee-edit-form" data-id="'+e.id+'" class="form" style="margin-top:14px">'+
 '<div class="fld"><label>Employee name</label><input name="name" required maxlength="80" value="'+esc(e.name)+'"></div>'+
 '<div class="fld"><label>Role</label><select name="role">'+ROLES.map(function(r){return '<option value="'+esc(r)+'" '+(r==e.role?'selected':'')+'>'+esc(r)+'</option>'}).join('')+'</select></div>'+
 '<div class="fld"><label>Mobile number</label><input name="phone" type="tel" inputmode="numeric" maxlength="10" required value="'+esc(e.phone||'')+'"></div>'+
 '<div class="fld"><label>Monthly salary (₹)</label><input name="salary" type="number" min="0" step="0.01" required value="'+esc(e.salary||0)+'"></div>'+
 '<div class="fld"><label>Emergency contact number</label><input id="f-emergency" name="emergency" type="tel" inputmode="numeric" maxlength="10" required value="'+esc(e.emergency||'')+'"></div><div class="fld"><label>Emergency contact person</label><input name="emergencyName" maxlength="80" value="'+esc(e.emergencyName||'')+'"></div>'+
 '<div class="fld" style="grid-column:1/-1"><label>Full address</label><input name="address" maxlength="300" value="'+esc(e.address||'')+'"></div>'+
 '<div class="fld"><label>Aadhaar number</label><input name="aadhaar" inputmode="numeric" maxlength="14" value="'+esc(e.aadhaar||'')+'" placeholder="12 digits"></div>'+
 '<div class="fld"><label>PAN number</label><input name="pan" maxlength="10" value="'+esc(e.pan||'')+'" placeholder="ABCDE1234F"></div>'+
 '<div class="fld"><label>Driving Licence number</label><input name="licenseNo" maxlength="30" value="'+esc(e.licenseNo||'')+'"></div>'+
 '<div class="rowact" style="grid-column:1/-1"><button type="submit" class="btn">Save Changes</button><button type="button" class="btn alt" data-ej="cancel-edit" data-id="'+e.id+'">Cancel</button></div></form></div></section>'+
 '<section class="card"><h3>Uploaded Documents</h3><p class="pdesc">You can view, download, upload a missing document, or replace an incorrect file.</p><div class="pf" style="grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:14px;margin-top:14px">'+docBtn('Aadhaar Card','aadhaar',!!e.doc)+docBtn('PAN Card','pan',!!e.panDoc)+docBtn('Driving Licence','license',!!e.licenseDoc)+'</div></section>'+hrCard(e);
}
function downloadEmployeeDoc(id,type){var e=S.employees.filter(function(x){return x.id==id})[0];if(!e)return;var field=type=='aadhaar'?'doc':type=='pan'?'panDoc':'licenseDoc',data=e[field];if(!data){toast('Document not uploaded');return}var pdf=/^data:application\/pdf/i.test(data),ext=pdf?'pdf':(/^data:image\/png/i.test(data)?'png':(/^data:image\/webp/i.test(data)?'webp':'jpg')),filename=type+'-'+String(e.name||'employee').replace(/[^a-z0-9_-]/gi,'_')+'.'+ext;var a=document.createElement('a');a.href=data;a.download=filename;document.body.appendChild(a);a.click();a.remove();toast('Document download started')}
function addApplication(o){
 if(!o||o.srjoin!==1)return 'bad';
 var id=String(o.id||''),nm=String(o.name||'').trim(),mb=digits(o.mobile),ad=String(o.address||'').trim(),aa=String(o.aadhaar||'').replace(/\D/g,''),ph=String(o.photo||''),dc=String(o.doc||''),pan=String(o.pan||'').toUpperCase().trim(),pd=String(o.panDoc||''),ln=String(o.licenseNo||'').toUpperCase().trim(),ld=String(o.licenseDoc||'');
 if(!/^[A-Za-z0-9_-]{4,40}$/.test(id)||nm.length<2||nm.length>80||!/^[6-9]\d{9}$/.test(mb)||ad.length<3||ad.length>300||!aadhaarOk(aa))return 'bad';
 var emg=digits(o.emergency),emn=String(o.emergencyName||'').trim().slice(0,80);if(o.emergency&&(!/^[6-9]\d{9}$/.test(emg)||emg==mb))return 'bad';
 if(!/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+\/=]+$/.test(ph)||ph.length>700000)return 'bad';
 if(!/^data:(image\/(jpeg|png|webp)|application\/pdf);base64,[A-Za-z0-9+\/=]+$/.test(dc)||dc.length>1800000)return 'bad';
  if(pan&&!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(pan))return 'bad';
  if(!drivingLicenseOk(ln))return 'bad';
  if(pd&&!/^data:(image\/(jpeg|png|webp)|application\/pdf);base64,[A-Za-z0-9+\/=]+$/.test(pd))return 'bad';
  if(ld&&!/^data:(image\/(jpeg|png|webp)|application\/pdf);base64,[A-Za-z0-9+\/=]+$/.test(ld))return 'bad';
  if(pd.length>1100000||ld.length>1100000)return 'bad';
 if(S.applications.some(function(x){return x.id==id})||S.employees.some(function(x){return x.app==id})||(S.cafeEmployees||[]).some(function(x){return x.app==id}))return 'dup';
 var dt=/^\d{4}-\d{2}-\d{2}$/.test(o.date||'')?o.date:today();
 S.applications.push({id:id,t:String(o.t||''),department:String(o.department||'Water Plant'),date:dt,submittedAt:String(o.submittedAt||new Date().toISOString()),name:nm,mobile:mb,emergency:emg,emergencyName:emn,address:ad,aadhaar:aa,photo:ph,doc:dc,docType:/^data:application\/pdf/.test(dc)?'pdf':'image',pan:pan,panDoc:pd,panDocType:/^data:application\/pdf/.test(pd)?'pdf':'image',licenseNo:ln,licenseDoc:ld,licenseDocType:/^data:application\/pdf/.test(ld)?'pdf':'image',status:'Pending'});
 S.invites.forEach(function(v){if(o.t&&v.t==o.t)v.status='used'});return 'ok'}
document.addEventListener('click',function(e){var t=e.target.closest('[data-cej]');if(!t)return;var a=t.dataset.cej;if(a=='copy'){var box=t.parentNode.querySelector('input');if(box)copyTxt(box.value);return}if(a=='newinv'){var me=digits($('#cafe-inv-me').value),to=digits($('#cafe-inv-to').value);if(me.length!=10)return bad('#cafe-inv-me','Enter 10-digit WhatsApp number');if(to&&to.length!=10)return bad('#cafe-inv-to','Employee mobile must be 10 digits');if(!online())return toast('Open the hosted Cloudflare URL to create an employee joining link');var inv={id:nid('I',S.invites),t:newTok(),date:today(),status:'open',department:'Cafe'};S.settings.phone=me;api('/api/invite',{method:'POST',body:JSON.stringify({t:inv.t,department:'Cafe',to:to})}).then(function(r){if(!r.ok)throw r.status;S.invites.push(inv);save();CAFEINV={url:location.href.split('#')[0]+'#join='+b64e({t:inv.t,b:S.settings.name,p:digits(S.settings.phone),department:'Cafe'}),to:to};render()}).catch(function(){toast('Could not create Cafe joining link. Sign in with owner/manager account.')})}});
document.addEventListener('click',function(e){var t=e.target.closest('[data-ej]');if(!t)return;var a=t.dataset.ej,id=t.dataset.id;
 if(a=='newinv'){var me=digits($('#inv-me').value),to=digits($('#inv-to').value);clearErr('#inv-me');clearErr('#inv-to');
  if(me.length!=10)return bad('#inv-me','Enter your 10-digit WhatsApp number');if(to&&to.length!=10)return bad('#inv-to','Employee mobile must be 10 digits');
  S.settings.phone=me;var inv={id:nid('I',S.invites),t:newTok(),date:today(),status:'open'};
  var fin=function(){S.invites.push(inv);save();INVLINK={url:mkInviteLink(inv),to:to};render()};
  if(!online())return fin();
  api('/api/invite',{method:'POST',body:JSON.stringify({t:inv.t,department:'Water Plant',to:to})}).then(function(r){if(r.ok)fin();else toast(r.status==401?'Sign in with owner or manager account':r.status==503?'Online service is not set up yet':'Could not create the link')},function(){toast('Could not reach the online service')})}
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
 else if(a=='edit-details'){var ep=$('#emp-edit-panel');if(ep)ep.hidden=false}
 else if(a=='cancel-edit'){showProfile(id)}
  else if(a=='backprofile'){if(location.hash==='#employees'){render()}else{location.hash='#employees'}}
 else if(a=='profile')showProfile(id);
 else if(a=='approve'){var ap=S.applications.filter(function(x){return x.id==id})[0];if(!ap)return;var sal=+$('#as-'+id).value;clearErr('#as-'+id);
  if(!(sal>0))return bad('#as-'+id,'Enter the monthly salary');
  if(S.employees.concat(S.cafeEmployees||[]).some(function(x){return digits(x.phone)==ap.mobile}))return toast('An employee with this mobile number already exists');
  var employeeRecord={id:nid(ap.department=='Cafe'?'CEM':'M',ap.department=='Cafe'?S.cafeEmployees:S.employees),name:ap.name,role:$('#ar-'+id).value,phone:ap.mobile,salary:sal,address:ap.address,emergency:ap.emergency||'',emergencyName:ap.emergencyName||'',aadhaar:ap.aadhaar,photo:ap.photo,doc:ap.doc,docType:ap.docType,pan:ap.pan||'',panDoc:ap.panDoc||'',panDocType:ap.panDocType||'',licenseNo:ap.licenseNo||'',licenseDoc:ap.licenseDoc||'',licenseDocType:ap.licenseDocType||'',joined:today(),joinedAt:ap.submittedAt||new Date().toISOString(),app:ap.id,department:ap.department||'Water Plant'};if(ap.department=='Cafe')S.cafeEmployees.push(employeeRecord);else S.employees.push(employeeRecord);
  ap.status='Approved';ap.photo='';ap.doc='';save();toast(ap.name+' added to '+(ap.department=='Cafe'?'Cafe Employees':'Employees'));render()}
 else if(a=='pending'){var pp=S.applications.filter(function(x){return x.id==id})[0];if(!pp)return;pp.status='Pending';save();toast('Application kept as Pending');render()}
 else if(a=='delete'){if(!confirm('Delete this joining application permanently? This cannot be undone.'))return;S.applications=S.applications.filter(function(x){return x.id!=id});save();toast('Application deleted');render()}});
document.addEventListener('change',function(e){
 var inp=e.target;if(!inp||!inp.dataset||!inp.dataset.empdoc)return;
 var id=inp.dataset.id,type=inp.dataset.empdoc,file=inp.files&&inp.files[0],emp=S.employees.filter(function(x){return x.id==id})[0];if(!file||!emp)return;
 var isPhoto=type=='photo',max=isPhoto?2*1024*1024:1500*1024;
 if(file.size>max){toast('File is too large. Maximum '+(isPhoto?'2 MB':'1.5 MB'));inp.value='';return}
 if(isPhoto&&!/^image\/(jpeg|png|webp)$/.test(file.type)){toast('Please select JPG, PNG or WEBP photo');inp.value='';return}
 if(!isPhoto&&!/^image\/(jpeg|png|webp)$|^application\/pdf$/.test(file.type)){toast('Please select JPG, PNG, WEBP or PDF');inp.value='';return}
 var done=function(data){
  if(isPhoto){emp.photo=data}
  else{var field=type=='aadhaar'?'doc':type=='pan'?'panDoc':'licenseDoc';emp[field]=data;emp[type=='aadhaar'?'docType':type=='pan'?'panDocType':'licenseDocType']=/^data:application\/pdf/i.test(data)?'pdf':'image'}
  save();toast(isPhoto?'Employee photo updated':(type+' document uploaded'));showProfile(id)
 };
 if(isPhoto){readImg(file,900,.78).then(done).catch(function(){toast('Could not read photo')})}
 else{var fr=new FileReader();fr.onload=function(){done(String(fr.result||''))};fr.onerror=function(){toast('Could not read document')};fr.readAsDataURL(file)}
 inp.value='';
});
document.addEventListener('change',function(e){if(e.target.id!='ej-file')return;var files=[].slice.call(e.target.files||[]),ok=0,dup=0,bd=0;
 Promise.all(files.map(function(f){if(f.size>3000000){bd++;return Promise.resolve()}return f.text().then(function(tx){var r='bad';try{r=addApplication(JSON.parse(tx))}catch(x){}if(r=='ok')ok++;else if(r=='dup')dup++;else bd++})})).then(function(){if(ok)save();render();toast(ok+' application'+(ok==1?'':'s')+' imported'+(dup?', '+dup+' already imported':'')+(bd?', '+bd+' invalid file'+(bd==1?'':'s'):''))});e.target.value=''});

/* ---------- employee: public joining form (opened from the link) ---------- */
function renderJoin(){
 var P=null;try{P=b64d(location.hash.slice(6))}catch(e){}
 document.body.classList.add('public');closeModal();jStop();var v=$('#pubview');
 if(!P||!P.t){v.innerHTML='<div class="pubwrap jn"><div class="card empty">This joining link is not valid. Please ask for a new link.</div></div>';return}
 JOIN={t:String(P.t),biz:String(P.b||'Larven Enterprises'),own:digits(P.p),department:String(P.department||'Water Plant'),photo:'',doc:'',docType:'',panDoc:'',panDocType:'',licenseDoc:'',licenseDocType:'',stream:null,app:null};document.title=JOIN.biz+' - Joining form';
 v.innerHTML='<div class="pubwrap jn"><div class="card"><h2 style="margin:0 0 4px">'+esc(JOIN.biz)+'</h2><p class="pdesc" style="margin:0 0 16px">Employee joining form · ఉద్యోగి వివరాల ఫారం</p>'+
 '<form id="joinform" class="jform" autocomplete="off" novalidate>'+
 '<div class="fld"><label for="j-name">Full name / పూర్తి పేరు *</label><input id="j-name" type="text" autocomplete="name" maxlength="80"></div>'+
 '<div class="fld"><label for="j-mob">Mobile number / మొబైల్ నంబర్ *</label><input id="j-mob" type="tel" inputmode="numeric" maxlength="10" placeholder="10-digit mobile" autocomplete="tel-national"></div>'+
 '<div class="fld"><label for="j-emg">Emergency contact number / అత్యవసర సంప్రదింపు నంబర్ *</label><input id="j-emg" type="tel" inputmode="numeric" maxlength="10" placeholder="Family member / friend 10-digit mobile"></div>'+
 '<div class="fld"><label for="j-emgn">Emergency contact person name / వ్యక్తి పేరు (Optional)</label><input id="j-emgn" type="text" maxlength="80" placeholder="e.g. Father, Wife"></div>'+
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
 var emg=digits($('#j-emg').value);clearErr('#j-emg');if(!/^[6-9]\d{9}$/.test(emg))return bad('#j-emg','Enter a valid 10-digit emergency contact number');if(emg==mb)return bad('#j-emg','Emergency contact must be a different number from your own');
 if(!aadhaarOk(aa))return bad('#j-aad','Enter a valid 12-digit Aadhaar number');
  var pan=$('#j-pan').value.trim().toUpperCase();if(pan&&!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(pan))return bad('#j-pan','Enter a valid PAN number (ABCDE1234F)');
 var dl=normalizeDL($('#j-license').value);if(dl&&!drivingLicenseOk(dl))return bad('#j-license','Enter a valid Indian Driving Licence number (e.g. AP0920110123456 or AP-09-2011-0123456)');
 if(!JOIN.photo)return jbad('#j-pf','Please take your live photo');
 if(!JOIN.doc)return bad('#j-doc','Please upload your Aadhaar card');
 if(!$('#j-ok').checked)return toast('Please tick the confirmation box');
 if(!JOIN.app)JOIN.app={srjoin:1,id:'J'+Date.now().toString(36)+Math.random().toString(36).slice(2,6),t:JOIN.t,date:ymd(new Date()),submittedAt:new Date().toISOString(),department:JOIN.department||'Water Plant',name:nm,mobile:mb,emergency:emg,emergencyName:$('#j-emgn').value.trim(),address:ad,aadhaar:aa,photo:JOIN.photo,doc:JOIN.doc,docType:JOIN.docType,pan:pan,panDoc:JOIN.panDoc,panDocType:JOIN.panDocType,licenseNo:normalizeDL($('#j-license').value),licenseDoc:JOIN.licenseDoc,licenseDocType:JOIN.licenseDocType};else{JOIN.app.name=nm;JOIN.app.mobile=mb;JOIN.app.emergency=emg;JOIN.app.emergencyName=$('#j-emgn').value.trim();JOIN.app.address=ad;JOIN.app.aadhaar=aa;JOIN.app.photo=JOIN.photo;JOIN.app.doc=JOIN.doc;JOIN.app.docType=JOIN.docType;JOIN.app.pan=pan;JOIN.app.panDoc=JOIN.panDoc;JOIN.app.panDocType=JOIN.panDocType;JOIN.app.licenseNo=$('#j-license').value.trim().toUpperCase();JOIN.app.licenseDoc=JOIN.licenseDoc;JOIN.app.licenseDocType=JOIN.licenseDocType;JOIN.app.submittedAt=JOIN.app.submittedAt||new Date().toISOString();JOIN.app.department=JOIN.department||'Water Plant'}
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
var DOCCSS='.pap{background:#fff;color:#301914;font-family:"Plus Jakarta Sans",system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;font-size:12.5px;line-height:1.5;text-align:left;border:1px solid #ede2db;border-radius:8px;padding:0 0 22px;max-width:794px;margin:0 auto;overflow:hidden;-webkit-print-color-adjust:exact;print-color-adjust:exact}.pap *{box-sizing:border-box}\n.pp-head{display:flex;justify-content:space-between;gap:16px;flex-wrap:wrap;padding:24px 30px 18px;background:linear-gradient(135deg,#4a1712,#c2502a);color:#fff}.pp-brand{display:flex;gap:12px;align-items:center}.pp-brand h1{margin:0;font-size:24px;font-weight:800;letter-spacing:-.3px;line-height:1.1;color:#fff}.pp-brand p{margin:2px 0 0;font-size:11.5px;color:#fae6db}.pp-brand svg path:first-child{fill:#fff}.pp-brand svg path:last-child{stroke:#c2502a}\n.pp-title{text-align:right}.pp-title small{display:block;font-size:11px;letter-spacing:.18em;font-weight:700;color:#f8d7c3}.pp-title b{display:block;font-size:22px;font-weight:800}.pp-title span{font-size:11.5px;color:#fae6db}.pp-band{height:5px;background:linear-gradient(90deg,#c9a24a,#f0d78c,#c9a24a)}\n.pp-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:14px 18px;padding:20px 30px 6px}.pp-grid small{display:block;color:#8c7d75;font-size:10.5px;text-transform:uppercase;letter-spacing:.06em}.pp-grid b{font-size:13px;word-break:break-word}\n.pp-att{margin:10px 30px 0;padding:9px 14px;background:#fdf5f0;border-radius:8px;display:flex;gap:22px;flex-wrap:wrap;font-size:12px}.pp-att em{margin-left:auto;color:#8c7d75;font-size:11px}\n.pp-t{width:calc(100% - 60px);margin:16px 30px 0;border-collapse:collapse}.pp-t th{background:#4a1712;color:#fff;font-size:11.5px;text-transform:uppercase;letter-spacing:.06em;padding:9px 12px;text-align:left}.pp-t td{padding:9px 12px;border-bottom:1px solid #f4eae4}.pp-t .r{text-align:right}.pp-t .sp{width:14px;padding:0;background:#fff;border:0}.pp-t th.sp{background:#fff}.pp-t tfoot td{font-weight:800;background:#fcf7f4;border-top:2px solid #4a1712}.pp-t tfoot td.sp{background:#fff;border-top:0}\n.pp-net{margin:18px 30px 0;display:flex;gap:18px;align-items:center;flex-wrap:wrap;border:1.5px solid #c2502a;border-radius:12px;padding:14px 18px;background:linear-gradient(135deg,#fef8f4,#fff)}.pp-net small{display:block;color:#8c7d75;font-size:10.5px;letter-spacing:.08em}.pp-net b{font-size:28px;color:#4a1712;font-weight:800}.pp-w{flex:1;min-width:200px;font-weight:700}\n.pp-foot{display:flex;justify-content:space-between;align-items:flex-end;gap:16px;padding:26px 30px 0}.pp-note{color:#8c7d75;font-size:11px}.pp-sign{text-align:center;font-size:12px}.pp-sign i,.lt-sig i{display:block;width:190px;max-width:100%;border-top:1.5px solid #301914;margin:0 auto 6px}\n.pp-cg{margin:18px 30px 0;padding-top:10px;border-top:1px dashed #e8d8cf;text-align:center;color:#a79891;font-size:10.5px}\n.lt p{margin:10px 30px}.lt-meta{display:flex;justify-content:space-between;gap:10px;padding:16px 30px 0}.lt-to{margin:12px 30px 0}.lt-to small{display:block;color:#8c7d75;font-size:10.5px;text-transform:uppercase;letter-spacing:.06em}.lt p.lt-sub{margin:14px 30px 0}.lt-ol{margin:8px 30px 0;padding-left:20px}.lt-ol li{margin:5px 0}.lt-sig{display:flex;justify-content:space-between;gap:20px;padding:34px 30px 0;font-size:12px}.lt-sig>div{text-align:center}\n@media print{.pap{border:0!important;border-radius:0!important;max-width:none!important}}';(function(){var st=document.createElement('style');st.id='doccss';st.textContent=DOCCSS;document.head.appendChild(st)})();
var MONTHS=['January','February','March','April','May','June','July','August','September','October','November','December'],HRC={html:'',fn:''},PORT=[];
function pss(){if(!Array.isArray(S.payslips))S.payslips=[];return S.payslips}
function ymLabel(ym){var p=String(ym).split('-');return (MONTHS[+p[1]-1]||'')+' '+p[0]}
function dDay(s){var d=new Date(/^\d{4}-\d{2}-\d{2}$/.test(s)?s+'T00:00:00':s);return isNaN(d)?'-':d.toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}
function dFull(s){var d=new Date(s);return isNaN(d)?'-':d.toLocaleString('en-IN',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'})}
function bizObj(){var s=S.settings;return {n:s.name,a:s.address||'',p:s.phone||'',g:s.gst||''}}
function etok(e){if(!e.tok){e.tok=newTok()+newTok()+newTok();save()}return e.tok}
function ehead(b,t1,t2,t3){return '<div class="pp-head"><div class="pp-brand"><svg width="42" height="50" viewBox="0 0 44 52"><path d="M22 2C22 2 4 22 4 34a18 18 0 0 0 36 0C40 22 22 2 22 2Z" fill="#c2502a"/><path d="M8 36c8-6 16 4 28-2" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round"/></svg><div><h1>'+esc(b.n)+'</h1><p>Packaged Drinking Water</p>'+(b.a?'<p>'+esc(b.a)+'</p>':'')+(b.p||b.g?'<p>'+(b.p?'Ph: '+esc(b.p):'')+(b.p&&b.g?' &nbsp;|&nbsp; ':'')+(b.g?'GSTIN: '+esc(b.g):'')+'</p>':'')+'</div></div><div class="pp-title"><small>'+t1+'</small><b>'+t2+'</b><span>'+t3+'</span></div></div><div class="pp-band"></div>'}
function slipData(e,ym,bonus,other,note){var rec=S.attendance.filter(function(a){return a.emp==e.id&&String(a.date).slice(0,7)==ym}),pr=0,ab=0;
 rec.forEach(function(a){if(a.status=='Present')pr+=1;else if(a.status=='Half day'){pr+=.5;ab+=.5}else ab+=1});
 var y=+ym.slice(0,4),m=+ym.slice(5,7),days=new Date(y,m,0).getDate(),adv=sum(S.advances.filter(function(x){return x.emp==e.id&&String(x.date).slice(0,7)==ym}),function(x){return +x.amount||0}),g=+e.salary||0;
 return {k:'p',id:'PS-'+ym.replace('-','')+'-'+e.id,m:ym,b:bizObj(),e:{id:e.id,n:e.name,r:e.role,p:e.phone||'',j:e.joinedAt||e.joined||'',pan:e.pan||''},at:new Date().toISOString(),att:rec.length?[days,pr,ab]:null,g:g,bo:round2(+bonus||0),ad:round2(adv),ot:round2(+other||0),on:note||'',net:round2(g+(+bonus||0)-adv-(+other||0))}}
function slipHTML(s){var b=s.b,e=s.e,n=Math.max(3,s.bo>0?2:1,(s.ad>0?1:0)+(s.ot>0?1:0)),E=[['Basic Salary',s.g]],D=[];if(s.bo>0)E.push(['Bonus / Incentive',s.bo]);if(s.ad>0)D.push(['Salary advance recovered',s.ad]);if(s.ot>0)D.push([s.on||'Other deduction',s.ot]);
 var rows='';for(var i=0;i<n;i++)rows+='<tr><td>'+(E[i]?esc(E[i][0]):'&nbsp;')+'</td><td class="r">'+(E[i]?money(E[i][1]):'')+'</td><td class="sp"></td><td>'+(D[i]?esc(D[i][0]):'&nbsp;')+'</td><td class="r">'+(D[i]?money(D[i][1]):'')+'</td></tr>';
 var te=round2(s.g+s.bo),td=round2(s.ad+s.ot),p=s.e.pan?String(s.e.pan).replace(/^(.{3}).*(.{2})$/,'$1*****$2'):'-';
 return '<div class="pap">'+ehead(b,'PAY SLIP',esc(ymLabel(s.m)),'Pay period: 01 – '+new Date(+s.m.slice(0,4),+s.m.slice(5,7),0).getDate()+' '+esc(ymLabel(s.m)))+
 '<div class="pp-grid"><div><small>Employee name</small><b>'+esc(e.n)+'</b></div><div><small>Employee ID</small><b>'+esc(e.id)+'</b></div><div><small>Designation</small><b>'+esc(e.r)+'</b></div><div><small>Mobile</small><b>'+esc(e.p||'-')+'</b></div><div><small>Date of joining</small><b>'+(e.j?dDay(e.j):'-')+'</b></div><div><small>PAN</small><b>'+esc(p)+'</b></div><div><small>Pay slip no.</small><b>'+esc(s.id)+'</b></div><div><small>Generated on</small><b>'+dFull(s.at)+'</b></div></div>'+
 (s.att?'<div class="pp-att"><span>Days in month <b>'+s.att[0]+'</b></span><span>Present <b>'+s.att[1]+'</b></span><span>Absent <b>'+s.att[2]+'</b></span><em>As recorded in attendance</em></div>':'')+
 '<table class="pp-t"><thead><tr><th>Earnings</th><th class="r">Amount</th><th class="sp"></th><th>Deductions</th><th class="r">Amount</th></tr></thead><tbody>'+rows+'</tbody><tfoot><tr><td>Gross earnings</td><td class="r">'+money(te)+'</td><td class="sp"></td><td>Total deductions</td><td class="r">'+money(td)+'</td></tr></tfoot></table>'+
 '<div class="pp-net"><div><small>NET PAY (TAKE HOME)</small><b>'+money(s.net)+'</b></div><div class="pp-w"><small>Amount in words</small>Rupees '+words(Math.max(0,s.net))+' Only</div></div>'+
 '<div class="pp-foot"><div class="pp-note">Net pay = Gross earnings − Total deductions.<br>Salary advances given during the month are recovered here.</div><div class="pp-sign"><i></i>Authorised Signatory<br><b>'+esc(b.n)+'</b></div></div><div class="pp-cg">This is a computer-generated pay slip. Please contact the office for any query.</div></div>'}
function letterData(e){return {k:'l',at:new Date().toISOString(),id:'LT-'+e.id,ref:'SRI/HR/'+new Date().getFullYear()+'/'+e.id,d:today(),b:bizObj(),e:{id:e.id,n:e.name,r:e.role,p:e.phone||'',a:e.address||'',j:e.joinedAt||e.joined||today(),s:+e.salary||0}}}
function letterHTML(L){var b=L.b,e=L.e,first=String(e.n).split(' ')[0],sal=money(e.s);
 return '<div class="pap lt">'+ehead(b,'APPOINTMENT LETTER','Joining Letter','Ref: '+esc(L.ref))+
 '<div class="lt-meta"><div><b>Date:</b> '+dDay(L.d)+'</div><div><b>Employee ID:</b> '+esc(e.id)+'</div></div>'+
 '<div class="lt-to"><small>To</small><b>'+esc(e.n)+'</b><div>'+esc(e.a||'-')+'</div><div>Mobile: '+esc(e.p||'-')+'</div></div>'+
 '<p class="lt-sub"><b>Subject: Letter of appointment as '+esc(e.r)+'</b></p>'+
 '<p>Dear '+esc(first)+',</p><p>We are pleased to appoint you at <b>'+esc(b.n)+'</b> as <b>'+esc(e.r)+'</b> with effect from <b>'+dDay(e.j)+'</b>, on the following terms and conditions:</p>'+
 '<ol class="lt-ol"><li><b>Duties.</b> You will perform the duties of '+esc(e.r)+' and any other work reasonably assigned by the management of the plant.</li>'+
 '<li><b>Salary.</b> Your monthly salary will be <b>'+sal+'</b> (Rupees '+words(e.s)+' Only), payable every month after deductions, if any, as per rules.</li>'+
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
 var fallback=function(){wrap.remove();var h='<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+esc(fn)+'</title><style>body{margin:0;padding:16px;background:#f7f2ef}'+DOCCSS+'@media print{body{background:#fff;padding:0}.pap{border:0}}</style>'+html,a=document.createElement('a');a.href=URL.createObjectURL(new Blob([h],{type:'text/html'}));a.download=fn+'.html';document.body.appendChild(a);a.click();a.remove();toast('Downloaded (open it and tap Print to save as PDF)')};
 if(window.html2canvas&&window.jspdf){window.html2canvas(wrap.firstElementChild,{scale:2,backgroundColor:'#ffffff'}).then(function(cv){var pdf=new window.jspdf.jsPDF({unit:'pt',format:'a4'}),W=595.28,H=841.89,h=cv.height*W/cv.width,img=cv.toDataURL('image/jpeg',.95);
  if(h<=H)pdf.addImage(img,'JPEG',0,0,W,h);else{var w2=W*H/h;pdf.addImage(img,'JPEG',(W-w2)/2,0,w2,H)}pdf.save(fn+'.pdf');wrap.remove();toast('Downloaded')}).catch(fallback)}else fallback()}
function hrFn(o){return 'SR-Industries-'+(o.k=='p'?'PaySlip-'+String(o.e.n).replace(/[^A-Za-z0-9]+/g,'_')+'-'+o.m:'Joining-Letter-'+String(o.e.n).replace(/[^A-Za-z0-9]+/g,'_'))}
function hrHTML(o){return o.k=='p'?slipHTML(o):letterHTML(o)}
function docLink(o){return location.href.split('#')[0]+'#doc='+b64e(o)}
function portalLink(e){return location.href.split('#')[0]+'#me='+etok(e)}
function hrWa(e,txt){var m=digits(e.phone);return 'https://wa.me/'+(m?'91'+m:'')+'?text='+encodeURIComponent(txt)}
function slipWa(e,s){return hrWa(e,'*'+s.b.n+'*\nHello '+e.name+', your pay slip for '+ymLabel(s.m)+' is ready.\nNet pay: '+money(s.net)+'\n\nView / download: '+docLink(s)+'\n\nAll your pay slips: '+portalLink(e))}
function letterWa(e,L){return hrWa(e,'*'+L.b.n+'*\nDear '+e.name+', welcome to '+L.b.n+'! Your joining letter is ready.\n\nView / download: '+docLink(L)+'\n\nYour pay slips will appear here: '+portalLink(e))}
function pubItem(e,o){if(!online())return toast('Saved.');
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
 else if(a=='pv'||a=='pd'){var o=PORT[+t.dataset.i];if(!o)return;if(a=='pv')hrShow(hrHTML(o),hrFn(o));else dlDoc(hrHTML(o),hrFn(o))}});
function renderDoc(){var o=null;try{o=b64d(location.hash.slice(5))}catch(e){}document.body.classList.add('public');closeModal();var v=$('#pubview');
 if(!o||(o.k!='p'&&o.k!='l')||!o.e||!o.b){v.innerHTML='<div class="pubwrap"><div class="card empty">This document link is not valid.</div></div>';return}
 HRC.html=hrHTML(o);HRC.fn=hrFn(o);document.title=o.b.n+' - '+(o.k=='p'?'Pay slip':'Joining letter');
 v.innerHTML='<div class="pubwrap"><div class="pbar"><button type="button" class="btn green" data-hr="dl">Download PDF</button><button type="button" class="btn alt" data-hr="pr">Print</button></div>'+HRC.html+'</div>'}
function renderPortal(){var tok=location.hash.slice(4);document.body.classList.add('public');closeModal();var v=$('#pubview');document.title='Employee Portal';
 v.innerHTML='<div class="pubwrap"><div class="card empty">Loading…</div></div>';
 fetch('/api/slips?tok='+encodeURIComponent(tok)).then(function(r){if(!r.ok)throw 0;return r.json()}).then(function(d){PORT=(d.items||[]).slice().sort(function(a,b){return String(b.at||b.d||'')<String(a.at||a.d||'')?-1:1});
  var f=PORT[0],nm=f?f.e.n:'',bz=f?f.b.n:'';
  v.innerHTML='<div class="pubwrap jn"><div class="card"><h2 style="margin:0">'+esc(bz||'Employee Portal')+'</h2><p class="pdesc" style="margin:2px 0 14px">Employee portal'+(nm?' · '+esc(nm):'')+'</p><div id="att-card" style="margin-bottom:14px"></div>'+
  (PORT.length?PORT.map(function(o,i){return '<div class="prow" style="display:flex;justify-content:space-between;gap:10px;align-items:center;flex-wrap:wrap;padding:12px 0;border-top:1px solid var(--line)"><div><b>'+(o.k=='p'?'Pay slip · '+esc(ymLabel(o.m)):'Joining letter')+'</b><br><small class="muted">'+(o.k=='p'?'Net pay '+money(o.net)+' · ':'')+dFull(o.at||o.d)+'</small></div><div class="rowact"><button type="button" class="btn sm alt" data-hr="pv" data-i="'+i+'">View</button><button type="button" class="btn sm green" data-hr="pd" data-i="'+i+'">Download</button></div></div>'}).join(''):'<p class="pdesc">No documents yet. Your pay slips will appear here when the office generates them.</p>')+'</div></div>';attPortal(tok)},
  function(){v.innerHTML='<div class="pubwrap"><div class="card empty">This portal link is not valid or the service is not available.</div></div>'})}

/* ---------- Photo attendance at banners (QR + live camera + GPS, saved with server time) ---------- */
var ATTSYNCED=false,ATT={stream:null,iv:null,wid:null,pos:null,tok:'',kind:'',done:false,busy:false};
function attSites(){if(!Array.isArray(S.attSites))S.attSites=[];return S.attSites}
function attCode(){return newTok()+newTok()+newTok().slice(0,4)}
function attMin(t){var x=String(t||'').split(':');return (+x[0]||0)*60+(+x[1]||0)}
function attGrace(){return S.settings.attGrace==null||S.settings.attGrace===''?15:+S.settings.attGrace}
function attLate(t){return !!t&&attMin(t)>attMin(S.settings.attStart||'09:00')+attGrace()}
function fmt12(t){var x=String(t||'').split(':'),h=+x[0]||0,m=x[1]||'00';return (h%12||12)+':'+m+' '+(h>=12?'PM':'AM')}
function attDay(n){var d=new Date();d.setDate(d.getDate()-n);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}
function loadScript(src){return new Promise(function(ok,no){var s=document.createElement('script');s.src=src;s.onload=ok;s.onerror=no;document.head.appendChild(s)})}
function attSync(manual){if(!online()){if(manual)toast('Open the deployed website, not the file');return Promise.resolve(false)}
 var body={sites:attSites().map(function(x){return {id:x.id,name:x.name,code:x.code,lat:x.lat,lng:x.lng,r:x.r}}),emps:S.employees.map(function(e){return {tok:etok(e),id:e.id,name:e.name}})};
 return api('/api/att/setup',{method:'POST',body:JSON.stringify(body)}).then(function(r){if(!r.ok)throw r.status;return r.json()}).then(function(d){S.settings.attSyncAt=new Date().toISOString();save();if(manual)toast('Synced: '+d.sites+' banner(s), '+d.emps+' employee link(s)');if(PAGE_IS('att-setup'))render();return true}).catch(function(e){if(manual)toast('Could not sync with database');return false})}
function attMerge(rec){if(!rec||!S.employees.some(function(e){return e.id==rec.emp}))return false;var row=S.attendance.filter(function(a){return a.date==rec.date&&a.emp==rec.emp})[0],ch=false,tin=rec.in?rec.in.t.slice(0,5):'',tout=rec.out?rec.out.t.slice(0,5):'';
 if(!row){row={id:nid('A',S.attendance),date:rec.date,emp:rec.emp,status:'Present',tin:tin,tout:tout};S.attendance.push(row);ch=true}
 if(rec.in&&row.phIn!=rec.in.ph){row.src='banner';row.tin=tin;row.phIn=rec.in.ph;row.site=rec.in.siteName;row.dist=rec.in.dist;row.late=attLate(tin);if(row.status=='Absent')row.status='Present';ch=true}
 if(rec.out&&row.phOut!=rec.out.ph){row.tout=tout;row.phOut=rec.out.ph;ch=true}
 return ch}
function attPull(manual){if(!online()||ATT.pulling)return Promise.resolve();ATT.pulling=true;var ch=false;
 return [0,1,2].reduce(function(p,n){return p.then(function(){return api('/api/atts?date='+attDay(n)).then(function(r){if(!r.ok)throw r.status;return r.json()}).then(function(d){(d.items||[]).forEach(function(x){if(attMerge(x))ch=true})})})},Promise.resolve()).then(function(){if(ch){save();var f=document.activeElement;if((PAGE_IS('attendance')||PAGE_IS('timings'))&&!(f&&/INPUT|SELECT|TEXTAREA/.test(f.tagName)))render();if(manual)toast('Attendance updated from photo check-ins')}else if(manual)toast('No new check-ins')}).catch(function(e){if(manual)toast('Could not reach the server')}).then(function(){ATT.pulling=false})}
setTimeout(function(){attPull()},2500);setInterval(function(){if(PAGE_IS('attendance')||PAGE_IS('timings')||PAGE_IS('dashboard'))attPull()},45000);

PAGES.attendance=function(){
 FORMS.af=function(v){S.attendance.push({id:nid('A',S.attendance),date:v.date,emp:v.emp,status:v.status,tin:v.tin,tout:v.tout,ot:+v.ot||0,src:'manual'});return 'Attendance marked'};
 setTimeout(function(){attPull()},60);
 var T=today(),l=S.attendance.filter(function(a){return a.date==T}),p=l.filter(function(a){return a.status=='Present'}).length,ban=l.filter(function(a){return a.src=='banner'}).length,late=l.filter(function(a){return a.late}).length,sites=attSites();
 return head('Attendance','<a class="btn alt sm" href="#att-setup">Banners & employee links</a>')+kp([['Present today',p],['Absent today',l.length-p],['Photo check-ins today',ban],['Late today',late],['Staff',S.employees.length]])+
 (sites.length?'<div class="note" style="margin:0 0 12px">Photo attendance is ON for: <b>'+sites.map(function(s){return esc(s.name)}).join(', ')+'</b>. Work starts at '+fmt12(S.settings.attStart||'09:00')+' (late after '+attGrace()+' min). New check-ins appear here automatically.</div>':'<div class="note" style="margin:0 0 12px">Photo attendance is not set up yet. Open <a href="#att-setup"><b>Banners & employee links</b></a> to add the plant / godown banners.</div>')+
 formCard([{k:'emp',l:'Employee',t:'select',o:empOpts()},{k:'status',l:'Status',t:'select',o:['Present','Absent','Half day']},{k:'tin',l:'In time',t:'time',v:'08:00',r:false},{k:'tout',l:'Out time',t:'time',r:false},{k:'ot',l:'Overtime hours (optional)',t:'number',r:false},{k:'date',l:'Date',t:'date'}],'Mark Manually','af')+
 table(['Date','Employee','Status','In','Out','Place','Photos',''],S.attendance.slice().reverse().map(function(a){return [a.date,esc(empName(a.emp)),'<span class="pill '+(a.status=='Present'?'p-green':a.status=='Absent'?'p-red':'p-amber')+'">'+a.status+'</span>'+(a.late?' <span class="pill p-amber">Late</span>':''),a.tin?fmt12(a.tin):'-',a.tout?fmt12(a.tout):'-',a.src=='banner'?esc(a.site||'Banner')+(a.dist!=null?' <small class="muted">'+a.dist+' m</small>':''):'<small class="muted">Manual</small>',(a.phIn?'<button type="button" class="btn sm alt" data-att="ph" data-k="'+esc(a.phIn)+'">In</button> ':'')+(a.phOut?'<button type="button" class="btn sm alt" data-att="ph" data-k="'+esc(a.phOut)+'">Out</button>':''),del('attendance',a.id)]}))};

PAGES['att-setup']=function(){
 FORMS.attsite=function(v){var la=String(v.lat||'').trim(),ln=String(v.lng||'').trim();if((la==='')!=(ln===''))return 'ERROR: Enter both latitude and longitude (or leave both empty)';if(la!==''&&(!isFinite(+la)||!isFinite(+ln)))return 'ERROR: Latitude / longitude must be numbers';if(!(v.name||'').trim())return 'ERROR: Enter the banner location name';
  attSites().push({id:nid('ST',attSites()),name:v.name.trim(),lat:la===''?null:+la,lng:ln===''?null:+ln,r:Math.max(20,+v.r||30),code:attCode()});setTimeout(function(){attSync()},80);return 'Banner location added. Open “Banner” to print it.'};
 FORMS.attt=function(v){S.settings.attStart=v.start||'09:00';S.settings.attGrace=Math.max(0,+v.grace||0);return 'Work timing saved'};
 if(!ATTSYNCED){ATTSYNCED=true;setTimeout(function(){attSync()},100)}
 var sites=attSites(),msg=function(e){return 'Hello '+e.name+', this is your personal Larven Enterprises employee link:\n'+portalLink(e)+'\n\nOpen it on your phone (Chrome → menu → Add to Home screen). Every day, stand near the Larven Enterprises banner, tap “Check in” and scan the QR code on the banner. In the evening tap “Check out”.\n\nప్రతిరోజూ Larven Enterprises బ్యానర్ దగ్గర నిలబడి “Check in” నొక్కి, బ్యానర్ మీద ఉన్న QR కోడ్ స్కాన్ చేయండి. సాయంత్రం “Check out” నొక్కండి.'};
 var geo='<button type="button" class="btn alt" data-att="geo" style="grid-column:1/-1">📍 Use my current location (do this while standing at the banner place)</button>';
 var form=formCard([{k:'name',l:'Banner location name (e.g. Plant, Godown 1)'},{k:'r',l:'Allowed distance (meters, 20–30 recommended)',t:'number',v:30},{k:'lat',l:'Latitude',r:false},{k:'lng',l:'Longitude',r:false}],'Add Banner Location','FORM-attsite');form=form.replace('<div class="fld"><button',geo+'<div class="fld"><button');
 return head2('Attendance Banners & Employee Links','Put a banner with a QR code at each location. Employees scan it with their phone camera to mark attendance.')+
  kp([['Banner locations',sites.length],['Employees',S.employees.length],['Last synced to server',S.settings.attSyncAt?dFull(S.settings.attSyncAt):'Not yet']])+
  '<div class="note" style="margin:0 0 12px">How it works: the employee opens his personal link, taps <b>Check in</b>, and the live camera must scan the QR on the banner. The app also checks the phone’s GPS is within the allowed distance, takes a photo, and saves the <b>server time</b>. It appears in Attendance automatically.</div>'+
  '<h3 style="margin:8px 0">1. Banner locations</h3>'+form+
  table(['Location','GPS','Distance','',''],sites.map(function(s){return ['<b>'+esc(s.name)+'</b>',s.lat!=null?s.lat.toFixed(5)+', '+s.lng.toFixed(5):'<span class="pill p-amber">No GPS check</span>',s.r+' m','<div class="rowact"><button type="button" class="btn sm" data-att="banner" data-id="'+s.id+'">Banner (QR)</button><button type="button" class="btn sm alt" data-att="regen" data-id="'+s.id+'">New code</button></div>','<button type="button" class="btn sm danger" data-att="delsite" data-id="'+s.id+'">Delete</button>']}),'No banner locations yet. Add Plant, Godown 1 and Godown 2.')+
  '<h3 style="margin:18px 0 8px">2. Work timing</h3>'+formCard([{k:'start',l:'Work starts at',t:'time',v:S.settings.attStart||'09:00'},{k:'grace',l:'Grace minutes',t:'number',v:attGrace()}],'Save Timing','FORM-attt')+
  '<h3 style="margin:18px 0 8px">3. Employee links</h3><div class="rowact" style="margin-bottom:8px"><button type="button" class="btn alt sm" data-att="sync">Sync to server now</button></div>'+
  table(['Employee','Role','Link',''],S.employees.map(function(e){return [esc(e.name),esc(e.role||''),'<small class="muted" style="word-break:break-all">'+esc(portalLink(e))+'</small>','<div class="rowact"><button type="button" class="btn sm alt" data-att="copy" data-id="'+e.id+'">Copy</button><a class="btn sm wa" target="_blank" rel="noopener" href="'+hrWa(e,msg(e))+'">WhatsApp</a></div>']}),'No employees yet.')};

function attQR(text){return (window.qrcode?Promise.resolve():loadScript('https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js')).then(function(){var q=qrcode(0,'M');q.addData(text);q.make();return q.createSvgTag({cellSize:10,margin:0,scalable:true})})}
function attBanner(id){var s=attSites().filter(function(x){return x.id==id})[0];if(!s)return;var o=document.createElement('div');o.id='bnprint';o.className='bnov';
 o.innerHTML='<div class="bnbar"><button type="button" class="btn" data-att="bnprint">🖨 Print banner</button><button type="button" class="btn alt" data-att="bnclose">Close</button></div><div class="bnpage"><div class="bnhead">'+esc(S.settings.name||'Larven Enterprises')+'</div><div class="bnsub">ATTENDANCE</div><div class="bnqr" id="bn-qr">Loading QR…</div><div class="bnloc">'+esc(s.name)+'</div><p>Open your Larven Enterprises employee link → tap <b>Check in</b> → scan this QR code</p><p>మీ Larven Enterprises లింక్ ఓపెన్ చేసి <b>Check in</b> నొక్కి, ఈ QR కోడ్ స్కాన్ చేయండి</p></div>';document.body.appendChild(o);
 attQR('SRATT|'+s.id+'|'+s.code).then(function(svg){var e=$('#bn-qr');if(e)e.innerHTML=svg}).catch(function(){var e=$('#bn-qr');if(e)e.textContent='Could not load the QR library. Check internet and open again.'})}
function attPhoto(k){api('/api/att/photo?k='+encodeURIComponent(k)).then(function(r){if(!r.ok)throw 0;return r.json()}).then(function(d){openModal('<h3>Attendance photo</h3><img alt="Attendance photo" src="'+d.p+'" style="max-width:100%;border-radius:12px"><div class="dact"><button type="button" class="btn alt" data-nb="close">Close</button></div>')}).catch(function(){toast('Photo not available (kept for 120 days, or server not reachable)')})}

/* ----- employee side (portal) ----- */
function attPortal(tok){var el=$('#att-card');if(!el)return;ATT.tok=tok;
 fetch('/api/me?tok='+encodeURIComponent(tok)).then(function(r){if(!r.ok)throw r.status;return r.json()}).then(function(d){ATT.name=d.name;ATT.date=d.date;var t=d.today||{},tin=t.in?t.in.t.slice(0,5):'',tout=t.out?t.out.t.slice(0,5):'';
  el.innerHTML='<div class="attc"><h3 style="margin:0">Today’s attendance</h3><p class="pdesc" style="margin:2px 0 12px">'+esc(d.name)+' · '+esc(d.date)+'</p><div class="attrow"><div><small>ENTRY</small><b>'+(tin?fmt12(tin):'—')+'</b><em>'+(t.in?esc(t.in.siteName):'Not yet')+'</em></div><div><small>EXIT</small><b>'+(tout?fmt12(tout):'—')+'</b><em>'+(t.out?esc(t.out.siteName):'Not yet')+'</em></div></div><div class="rowact" style="margin:12px 0 6px"><button type="button" class="btn" data-att="scan-in"'+(tin?' disabled':'')+'>📷 Entry – Scan QR code</button><button type="button" class="btn alt" data-att="scan-out">📷 Exit – Scan QR code</button></div><p class="pdesc" style="margin:6px 0 0">Stand near the Larven Enterprises banner and scan its QR code with the camera.<br>బ్యానర్ దగ్గర నిలబడి కెమెరాతో QR కోడ్ స్కాన్ చేయండి.</p></div>'}).catch(function(){el.innerHTML='<div class="note">Attendance is not active for this link yet. Please contact the office.</div>'})}
function attMsg(t){var e=$('#at-msg');if(e)e.textContent=t}
function attStop(){clearInterval(ATT.iv);ATT.iv=null;if(ATT.stream){ATT.stream.getTracks().forEach(function(t){t.stop()});ATT.stream=null}if(ATT.wid!=null&&navigator.geolocation){navigator.geolocation.clearWatch(ATT.wid);ATT.wid=null}}
function attClose(){attStop();var o=$('#atov');if(o)o.remove();ATT.done=false;ATT.busy=false;if(ATT.tok)attPortal(ATT.tok)}
function attFail(t){attStop();var box=$('#at-res'),v=$('.atvid');if(v)v.style.display='none';attMsg('');if(box)box.innerHTML='<div class="atbad">✗ '+t+'</div>'}
function attDecoder(){if(window.BarcodeDetector){try{var d=new BarcodeDetector({formats:['qr_code']});return Promise.resolve(function(v){return d.detect(v).then(function(a){return a.length?a[0].rawValue:''})})}catch(e){}}
 return (window.jsQR?Promise.resolve():loadScript('https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js')).then(function(){var c=document.createElement('canvas'),x=c.getContext('2d',{willReadFrequently:true});return function(v){var w=v.videoWidth,h=v.videoHeight;if(!w)return Promise.resolve('');var sc=Math.min(1,640/w);c.width=Math.round(w*sc);c.height=Math.round(h*sc);x.drawImage(v,0,0,c.width,c.height);var im=x.getImageData(0,0,c.width,c.height),r=jsQR(im.data,c.width,c.height);return Promise.resolve(r?r.data:'')}})}
function attScan(kind){if($('#atov'))return;ATT.kind=kind;ATT.pos=null;ATT.done=false;ATT.busy=false;var o=document.createElement('div');o.id='atov';o.className='atov';
 o.innerHTML='<div class="atbox"><h3 style="margin:0 0 6px">'+(kind=='in'?'Entry':'Exit')+'</h3><p id="at-msg" class="pdesc">Starting camera…</p><div class="atvid"><video id="at-v" playsinline muted autoplay></video><div class="atframe"></div></div><div id="at-res"></div><div class="rowact" style="margin-top:12px"><button type="button" class="btn alt" data-att="scan-close">Close</button></div></div>';document.body.appendChild(o);
 if(navigator.geolocation)ATT.wid=navigator.geolocation.watchPosition(function(p){ATT.pos={lat:p.coords.latitude,lng:p.coords.longitude,acc:p.coords.accuracy}},function(){},{enableHighAccuracy:true,maximumAge:0,timeout:30000});
 if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia)return attFail('This browser cannot open the camera. Use Chrome on your phone.');
 navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'},width:{ideal:1280}},audio:false}).then(function(st){ATT.stream=st;var v=$('#at-v');v.srcObject=st;v.play().catch(function(){});attMsg('Point the camera at the banner QR code. / బ్యానర్ QR కోడ్ వైపు కెమెరా చూపించండి.');
  attDecoder().then(function(dec){ATT.iv=setInterval(function(){var v2=$('#at-v');if(!v2||ATT.done||ATT.busy)return;ATT.busy=true;dec(v2).then(function(t){ATT.busy=false;if(ATT.done)return;if(t&&/^SRATT\|/.test(t)){ATT.done=true;attCapture(t)}else if(t)attMsg('This is not an Larven Enterprises banner. / ఇది Larven Enterprises బ్యానర్ కాదు.')}).catch(function(){ATT.busy=false})},350)}).catch(function(){attFail('Could not load the QR scanner. Check your internet and try again.')})
 }).catch(function(){attFail('Camera permission is needed. Allow the camera for this page and try again. / కెమెరా అనుమతి ఇవ్వండి.')})}
function attCapture(text){var v=$('#at-v'),w=v.videoWidth||800,h=v.videoHeight||600,c=document.createElement('canvas'),sc=Math.min(1,800/w);c.width=Math.round(w*sc);c.height=Math.round(h*sc);c.getContext('2d').drawImage(v,0,0,c.width,c.height);var ph=c.toDataURL('image/jpeg',.6);if(ph.length>180000)ph=c.toDataURL('image/jpeg',.4);
 var vv=$('.atvid');if(vv)vv.style.display='none';if(ATT.stream){ATT.stream.getTracks().forEach(function(t){t.stop()});ATT.stream=null}clearInterval(ATT.iv);attMsg('Banner found. Getting your location… / లొకేషన్ తీసుకుంటున్నాను…');var n=0;(function wt(){if(ATT.pos||n++>24)return attSend(text,ph);setTimeout(wt,500)})()}
function attSend(text,ph){var p=ATT.pos||{};attStop();attMsg('Saving… / నమోదు చేస్తున్నాను…');fetch('/api/att',{method:'POST',body:JSON.stringify({tok:ATT.tok,kind:ATT.kind,code:text,lat:p.lat,lng:p.lng,acc:p.acc,photo:ph})}).then(function(r){return r.json().then(function(d){return d})}).then(attResult).catch(function(){attFail('No internet. Try again. / ఇంటర్నెట్ లేదు, మళ్ళీ ప్రయత్నించండి.')})}
function attResult(d){var box=$('#at-res');if(d.ok){attMsg('');if(box)box.innerHTML='<div class="atgood">✓ '+(d.dup?'Entry already recorded at '+fmt12(d.time.slice(0,5)):(d.kind=='in'?'Entry recorded':'Exit recorded'))+'<br><b>'+esc(ATT.name||'')+'</b><br><small>Date: '+esc(fdate(d.date||ATT.date||today()))+' · Time: '+fmt12(d.time.slice(0,5))+'<br>Location: '+esc(d.site||'')+(d.dist!=null?' ('+d.dist+' m from QR)':'')+'</small></div>';return}
 var m={too_far:'You are '+d.dist+' m away from '+esc(d.site||'the banner')+' (allowed '+d.r+' m). Go to the banner and try again. / బ్యానర్ దగ్గరికి వెళ్ళి మళ్ళీ ప్రయత్నించండి.',location_required:'Location is off. Turn on GPS / location for this page and try again. / లొకేషన్ ఆన్ చేసి మళ్ళీ ప్రయత్నించండి.',bad_code:'This banner is not valid. Ask the office for the correct banner. / ఈ బ్యానర్ చెల్లదు.',unknown_emp:'This link is not active. Please contact the office.',bad_photo:'Photo could not be saved. Try again.',too_big:'Photo too large. Try again.',not_configured:'The server is not ready. Contact the office.'};
 attFail(m[d.error]||'Could not save. Try again.')}
document.addEventListener('click',function(e){var t=e.target.closest('[data-att]');if(!t)return;var a=t.dataset.att,id=t.dataset.id;
 if(a=='scan-in')attScan('in');else if(a=='scan-out')attScan('out');else if(a=='scan-close')attClose();
 else if(a=='geo'){if(!navigator.geolocation)return toast('Location is not available on this device');toast('Getting location…');navigator.geolocation.getCurrentPosition(function(p){var f=$('#FORM-attsite');if(f){f.querySelector('[name=lat]').value=p.coords.latitude.toFixed(6);f.querySelector('[name=lng]').value=p.coords.longitude.toFixed(6)}toast('Location filled (accuracy about '+Math.round(p.coords.accuracy)+' m)')},function(){toast('Could not get location. Allow location permission.')},{enableHighAccuracy:true,timeout:20000})}
 else if(a=='sync')attSync(true);
 else if(a=='banner')attBanner(id);
 else if(a=='bnclose'){var b=$('#bnprint');if(b)b.remove()}
 else if(a=='bnprint')window.print();
 else if(a=='regen'){if(!confirmTap(t))return;var s=attSites().filter(function(x){return x.id==id})[0];if(s){s.code=attCode();save();attSync();toast('New code created. Print the banner again; old banners stop working.');render()}}
 else if(a=='delsite'){if(!confirmTap(t))return;S.attSites=attSites().filter(function(x){return x.id!=id});save();attSync();toast('Deleted');render()}
 else if(a=='copy'){var e2=S.employees.filter(function(x){return x.id==id})[0];if(e2){attSync();copyTxt(portalLink(e2))}}
 else if(a=='ph')attPhoto(t.dataset.k)});

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
function vmDB(){
 return new Promise(function(resolve,reject){
  if(!window.indexedDB){reject(new Error('This browser does not support local media storage'));return}
  var req=indexedDB.open('sr-vehicle-evidence-v1',1);
  req.onupgradeneeded=function(){var db=req.result;if(!db.objectStoreNames.contains('media'))db.createObjectStore('media',{keyPath:'id'})};
  req.onsuccess=function(){resolve(req.result)};req.onerror=function(){reject(req.error)}
 })
}
function vmStoreMedia(file,kind){
 return vmDB().then(function(db){return new Promise(function(resolve,reject){
  var id='VM-'+Date.now()+'-'+Math.random().toString(36).slice(2,8),tx=db.transaction('media','readwrite');
  tx.objectStore('media').put({id:id,blob:file,type:file.type,name:file.name||kind+' evidence',size:file.size,created:new Date().toISOString()});
  tx.oncomplete=function(){db.close();resolve({id:id,name:file.name||kind+' evidence',type:file.type,size:file.size,kind:kind})};
  tx.onerror=function(){db.close();reject(tx.error)}
 })})
}
function vmGetMedia(id){
 return vmDB().then(function(db){return new Promise(function(resolve,reject){
  var tx=db.transaction('media','readonly'),r=tx.objectStore('media').get(id);
  r.onsuccess=function(){db.close();if(!r.result){reject(new Error('Evidence not found'));return}resolve(r.result)};
  r.onerror=function(){db.close();reject(r.error)}
 })})
}
function vmMB(n){return (n/1048576).toFixed(1)+' MB'}
function vmLimit(){return Math.max(1,Math.min(200,Number(S.settings.vehicleVideoMaxMB)||25))}
function vmVehicleOptions(){return S.vehicles.map(function(v){return '<option value="'+esc(v.id)+'">'+esc(v.number)+' · '+esc(v.type)+'</option>'}).join('')}
function vmEmployeeOptions(){return S.employees.map(function(e){return '<option value="'+esc(e.id)+'">'+esc(e.name)+' ('+esc(e.role)+')</option>'}).join('')}
function vmEvidenceButton(media,label){
 if(!media||!media.length)return '<span class="muted">No evidence</span>';
 return media.map(function(m){return '<button type="button" class="btn sm alt" data-vm-media="'+esc(m.id)+'">'+(m.kind=='video'?'▶':'▧')+' '+esc(label||m.kind)+' · '+vmMB(m.size)+'</button>'}).join(' ');
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
   fgLoadHTML()+
   '<div class="fld full"><label>Existing damage / remarks</label><textarea name="startNotes" placeholder="Mention scratches, dents, tyre issue, warning light etc. If none, enter No visible damage."></textarea></div>'+
   '<div class="fld full"><label>Before-start photos / video *</label><div class="vm-upload"><input id="vm-start-files" type="file" accept="image/*,video/*" multiple required><div class="vm-help">Upload clear photos around vehicle (front, rear, left, right, dashboard/odometer). Video maximum: '+vmLimit()+' MB per video. At least one photo or video required.</div><div id="vm-start-filelist" class="vm-help">No files selected.</div><button type="button" class="btn alt sm" id="vm-record-start">● Record a walk-around video</button><div id="vm-rec-status" class="vm-help" aria-live="polite"></div></div></div>'+
   '<div class="fld full"><label class="vm-check"><input type="checkbox" name="driverConfirm" required> I confirm that I checked the vehicle and the information above is correct.</label></div>'+
   '<div class="fld full"><button class="btn" type="submit" '+(!S.vehicles.length?'disabled':'')+'>Confirm Vehicle Start & Create Trip</button></div></form></section>';
 }else if(VM_ACTIVE_TAB=='handover'){
  content='<section class="vm-card"><h3>Vehicle Return / Handover Inspection</h3><p>After the vehicle returns, supervisor records closing meter, fuel level, condition and any damage. Trip closes only after supervisor confirmation.</p>'+
   (active.length?'<form id="vm-end-form" class="vm-form"><div class="fld"><label>Active Trip *</label><select name="trip" required><option value="">Select returned vehicle</option>'+active.map(function(t){var v=S.vehicles.filter(function(x){return x.id==t.vehicle})[0];return '<option value="'+esc(t.id)+'">'+esc(v?v.number:'Vehicle')+' · '+esc(empName(t.employee))+' · Start '+esc(t.startReading)+' KM · Loaded: '+esc(fgLoadTxt(t))+'</option>'}).join('')+'</select></div>'+
   '<div class="fld"><label>Closing Odometer Reading (KM) *</label><input name="endReading" type="number" min="0" step="0.1" required></div>'+
   '<div class="fld"><label>Fuel Level on Return (%) *</label><input name="endFuel" type="number" min="0" max="100" required></div>'+
   '<div class="fld"><label>Battery Level on Return (%)</label><input name="endBattery" type="number" min="0" max="100"></div>'+
   '<div class="fld"><label>Supervisor Name *</label><input name="supervisor" required placeholder="Name of person inspecting"></div>'+
   '<div class="fld"><label>Final Vehicle Condition *</label><select name="condition" required><option value="">Select</option><option>Good – no damage</option><option>Damage / Repair</option><option>Needs cleaning</option></select></div>'+
   fgReturnHTML()+
   '<div class="fld full"><label>Damage / issue details (required if not Good)</label><textarea name="damage" placeholder="Describe damage, location, severity, possible cause and action needed"></textarea></div>'+
   '<div class="fld full"><label>Return photos / video</label><div class="vm-upload"><input id="vm-end-files" type="file" accept="image/*,video/*" multiple><div class="vm-help">Take photos of any new damage and dashboard reading. Video maximum: '+vmLimit()+' MB per video.</div><div id="vm-end-filelist" class="vm-help">No files selected.</div><button type="button" class="btn alt sm" id="vm-record-end">● Record return inspection video</button></div></div>'+
   '<div class="fld full"><label class="vm-check"><input type="checkbox" name="supervisorConfirm" required> I inspected the returned vehicle and confirm this handover report.</label></div>'+
   '<div class="fld full"><button class="btn" type="submit">Complete Handover & Close Trip</button></div></form>':'<div class="empty">No active trips waiting for handover.</div>')+'</section>';
 }else{
  var list=closed.slice().reverse();
  content='<section class="vm-card"><div class="card-h"><h3>Trip & Handover History</h3><span class="cnt">'+S.vehicleTrips.length+' records</span></div>'+
   (list.length?list.map(function(t){var v=S.vehicles.filter(function(x){return x.id==t.vehicle})[0];var damaged=t.handoverCondition=='Damage / Repair'||t.handoverCondition=='Needs cleaning';return '<div class="vm-record"><div class="vm-record-head"><div><strong>'+esc(v?v.number:'Vehicle')+' · '+esc(empName(t.employee))+'</strong><div class="muted">Trip '+esc(t.id)+' · '+esc(t.startAt||'')+'</div></div><span class="vm-status '+(damaged?'damage':'closed')+'">'+esc(t.handoverCondition||'Closed')+'</span></div><div class="vm-meta"><span>Start: '+esc(t.startReading)+' KM</span><span>End: '+esc(t.endReading)+' KM</span><span>Distance: '+(Number(t.endReading)-Number(t.startReading)).toFixed(1)+' KM</span><span>Fuel: '+esc(t.fuelType)+' · '+esc(t.fuelPercent)+'% → '+esc(t.endFuel)+'%</span><span>Supervisor: '+esc(t.supervisor||'-')+'</span></div>'+(t.load!==undefined?(function(){var st=tripStat(t);return '<div class="vm-meta"><span>Loaded (cases): '+sizeTxt(st.load)+'</span><span>Sold: '+sizeTxt(st.sold)+'</span><span>Returned: '+sizeTxt(st.ret)+'</span><span>Shortage: '+sizeTxt(st.short)+'</span></div>'})():'')+(t.damage?'<div class="vm-warning">Issue: '+esc(t.damage)+'</div>':'')+'<div class="vm-actions">'+vmEvidenceButton(t.startMedia,'Start evidence')+' '+vmEvidenceButton(t.endMedia,'Return evidence')+'</div></div>'}).join(''):'<div class="empty">No completed handover reports yet.</div>')+'</section>';
 }
 return head2('Vehicle Management','Vehicle register, pre-trip inspection, driver handover and supervisor return reports.')+
 '<div class="vm-kpis"><div class="vm-kpi"><small>Registered vehicles</small><b>'+S.vehicles.length+'</b></div><div class="vm-kpi"><small>Currently on trip</small><b>'+active.length+'</b></div><div class="vm-kpi"><small>Completed trips</small><b>'+closed.length+'</b></div><div class="vm-kpi"><small>Damage / repair cases</small><b>'+damaged.length+'</b></div></div>'+
 '<div class="vm-tabs"><button class="vm-tab '+(VM_ACTIVE_TAB=='overview'?'active':'')+'" data-vm-tab="overview">Vehicle Register</button><button class="vm-tab '+(VM_ACTIVE_TAB=='start'?'active':'')+'" data-vm-tab="start">Start Trip Check</button><button class="vm-tab '+(VM_ACTIVE_TAB=='handover'?'active':'')+'" data-vm-tab="handover">Return Handover</button><button class="vm-tab '+(VM_ACTIVE_TAB=='history'?'active':'')+'" data-vm-tab="history">Handover Reports</button></div>'+content;
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
 var med=e.target.closest('[data-vm-media]');if(med){vmGetMedia(med.dataset.vmMedia).then(function(m){var u=URL.createObjectURL(m.blob);var w=window.open(u,'_blank');if(!w){var a=document.createElement('a');a.href=u;a.download=m.name;a.click()}setTimeout(function(){URL.revokeObjectURL(u)},60000)}).catch(function(){toast('Could not open evidence')});return}
});
document.addEventListener('submit',function(e){
 var f=e.target;if(!f.id||f.id.indexOf('vm-')!==0)return;e.preventDefault();
 var v=vmFormData(f);
 if(f.id=='vm-vehicle-form'){
  if(S.vehicles.some(function(x){return x.number.toLowerCase()==v.number.trim().toLowerCase()})){toast('This vehicle number is already registered');return}
  S.vehicles.push({id:nid('VH',S.vehicles),number:v.number.trim().toUpperCase(),type:v.type,model:v.model,driver:v.driver,notes:v.notes,createdAt:new Date().toISOString()});save();toast('Vehicle added');render();return;
 }
 if(f.id=='vm-settings-form'){S.settings.vehicleVideoMaxMB=Math.max(1,Math.min(200,+v.maxmb||25));save();toast('Video size limit saved');render();return}
 if(f.id=='vm-start-form'){
  var files=$('#vm-start-files').files;if(!files||!files.length){toast('Upload at least one before-start photo or video');return}
  var veh=S.vehicles.filter(function(x){return x.id==v.vehicle})[0];if(!veh){toast('Select a valid vehicle');return}
  if(+v.startReading<0||+v.fuelPercent>100||+v.fuelPercent<0||(+v.batteryPercent>100||+v.batteryPercent<0)){toast('Check meter / percentage values');return}
  var ld=fgParseLoad(v);if(ld.err){toast(ld.err);return}
  vmReadFiles('vm-start-files').then(function(media){
   var tid=nid('TR',S.vehicleTrips);ld.loads.forEach(function(x){S.fg.push({id:nid('F',S.fg),kind:'Load',date:today(),size:x.size,qty:x.q,from:ld.godown,to:'V',trip:tid,emp:v.employee,vehicle:v.vehicle,by:fgBy(),at:new Date().toISOString()})});
   S.vehicleTrips.push({id:tid,date:today(),godown:ld.godown,vehicle:v.vehicle,employee:v.employee,startReading:+v.startReading,fuelType:v.fuelType,fuelPercent:+v.fuelPercent,batteryPercent:v.batteryPercent==''?null:+v.batteryPercent,startCondition:v.startCondition,safetyCheck:v.safetyCheck,startNotes:v.startNotes,startMedia:media,startAt:new Date().toLocaleString(),status:'Active'});
   save();toast('Pre-trip check saved. Vehicle trip started.');VM_ACTIVE_TAB='history';render();
  }).catch(function(err){toast(err.message||'Could not save evidence')});return;
 }
 if(f.id=='vm-end-form'){
  var trip=S.vehicleTrips.filter(function(x){return x.id==v.trip&&!x.handoverAt})[0];if(!trip){toast('Select an active trip');return}
  if(+v.endReading<+trip.startReading){toast('Closing reading cannot be less than start reading');return}
  if(+v.endFuel<0||+v.endFuel>100||(+v.endBattery<0||+v.endBattery>100)){toast('Fuel / battery percentage must be between 0 and 100');return}
  if(v.condition!='Good – no damage'&&!v.damage.trim()){toast('Mention the damage / issue details before closing this trip');return}
  var rs=fgParseReturn(trip,v);if(rs.err){toast(rs.err);return}
  vmReadFiles('vm-end-files').then(function(media){
   var shortC=fgApplyReturn(trip,rs);
   trip.endReading=+v.endReading;trip.endFuel=+v.endFuel;trip.endBattery=v.endBattery==''?null:+v.endBattery;trip.supervisor=v.supervisor.trim();trip.handoverCondition=v.condition;trip.damage=v.damage;trip.endMedia=media;trip.handoverAt=new Date().toLocaleString();trip.status='Closed';
   save();toast('Trip closed.'+(shortC>0?' Shortage of '+nf(shortC)+' cases recorded.':' All stock accounted for.'));VM_ACTIVE_TAB='history';render();
  }).catch(function(err){toast(err.message||'Could not save evidence')});return;
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
 var cafeSales=S.cafeSales.filter(function(x){return backupInRange(x,from,to)}),cafePurchases=S.cafePurchases.filter(function(x){return backupInRange(x,from,to)}),cafeMoves=S.cafeStockMoves.filter(function(x){return backupInRange(x,from,to)});var bills=S.bills.filter(function(x){return backupInRange(x,from,to)}),payments=S.payments.filter(function(x){return backupInRange(x,from,to)}),stock=S.stock.filter(function(x){return backupInRange(x,from,to)}),expenses=S.expenses.filter(function(x){return backupInRange(x,from,to)}),customers=S.customers.slice(),newCustomers=S.customers.filter(function(x){return backupInRange(x,from,to)}),attendance=S.attendance.filter(function(x){return backupInRange(x,from,to)}),advances=S.advances.filter(function(x){return backupInRange(x,from,to)});
 var allSales=S.bills.slice().sort(function(a,b){return backupDateOf(a).localeCompare(backupDateOf(b))}),selSales=bills.slice().sort(function(a,b){return backupDateOf(a).localeCompare(backupDateOf(b))});
 var wb=XLSX.utils.book_new(),summary=[['SR INDUSTRIES','BUSINESS DATA BACKUP'],['Backup generated on',now.toLocaleDateString('en-IN')],['Backup generated at',now.toLocaleTimeString('en-IN')],['Backup mode',mode=='daily'?'Daily Backup':mode=='range'?'Custom Date Range':'All-Time Backup'],['Data period',mode=='all'?'All available dates':from+' to '+to],['Business',S.settings.name||'Larven Enterprises'],['Owner',S.settings.owner||''],['Total sales in selected period',sum(bills,function(x){return backupMoney(x.total)})],['Collections in selected period',sum(payments,function(x){return backupMoney(x.amount)})],['Outstanding (current snapshot)',outstanding()],['Bills in selected period',bills.length],['Payments in selected period',payments.length],['Customers in master list',customers.length],['New customers in selected period',newCustomers.length],['Purchases / Stock In records',stock.filter(function(x){return x.type=='In'}).length],['Stock Out records',stock.filter(function(x){return x.type=='Out'}).length],['Expenses in selected period',sum(expenses,function(x){return backupMoney(x.amount)})],['Employees',S.employees.length],['Attendance records in period',attendance.length],['Salary advances in period',advances.length],['Registered vehicles',S.vehicles.length],['Vehicle trips',S.vehicleTrips.length],['Profit calculation','Not available: product cost data is not recorded in the current data model'],['Source','Records currently stored in this browser localStorage']];
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
 var fgIn=S.fg.filter(function(x){return backupInRange(x,from,to)}),fgB=fgBal(),fgS=fgSizes();
 add('Production',backupRows(fgIn.filter(function(x){return x.kind=='Production'}),['ID','Date','Shift','Line (source)','Bottle size','Cases produced','Rejected bottles','Stored in','Note','Entered by'],function(x){return [x.id,x.date,x.shift||'',x.line||'',x.size,x.qty,x.waste||0,locName(x.to),x.note||'',x.by||'']}),[9,13,12,14,13,12,11,14,28,18]);
 add('Godown Transfers',backupRows(fgIn.filter(function(x){return x.kind=='Transfer'}),['ID','Date','Bottle size','Cases','From','To','Vehicle','Driver','Note','Entered by'],function(x){return [x.id,x.date,x.size,x.qty,locName(x.from),locName(x.to),x.vehicle||'',x.driver||'',x.note||'',x.by||'']}),[9,13,13,11,14,14,16,18,28,18]);
 add('Dispatch to Customers',backupRows(fgIn.filter(function(x){return x.kind=='Dispatch'}),['ID','Date','Customer','Sale type','Bottle size','Cases','From','Bill no','Vehicle','Driver','Entered by'],function(x){return [x.id,x.date,x.custName||'',x.saleType||'',x.size,x.qty,locName(x.from),x.bill||'',x.vehicle||'',x.driver||'',x.by||'']}),[9,13,26,12,13,11,14,12,16,18,18]);
 add('Stock Adjustments',backupRows(fgIn.filter(function(x){return x.kind=='Adjust'}),['ID','Date','Location','Bottle size','Change (cases)','Reason','Entered by'],function(x){return [x.id,x.date,locName(x.to||x.from),x.size,(x.to?'+':'-')+x.qty,x.note||'',x.by||'']}),[9,13,14,13,10,30,18]);
 add('Godown Stock Now (cases)',backupRows(fgS,['Bottle size',locName('P'),locName('G1'),locName('G2'),'On vehicles','Total'],function(z){var a=fgGet(fgB,'P',z),b=fgGet(fgB,'G1',z),c=fgGet(fgB,'G2',z),d=fgGet(fgB,'V',z);return [z,a,b,c,d,a+b+c+d]}),[16,14,14,14,14,12]);
 add('Delivery Staff Trips',backupRows(S.vehicleTrips.filter(function(x){return x.load!==undefined&&backupInRange({date:x.date},from,to)}),['Trip ID','Date','Employee','Vehicle','Godown','Start KM','End KM','Loaded (cases)','Sold (cases)','Returned (cases)','Shortage (cases)','Status'],function(x){var s=tripStat(x),f=function(m){return Object.keys(m).map(function(k){return k+': '+m[k]}).join(', ')};return [x.id,x.date,empName(x.employee),vehNo(x.vehicle),locName(x.godown),x.startReading,x.endReading==null?'':x.endReading,f(s.load),f(s.sold),f(s.ret),f(s.short),x.handoverAt?'Closed':'Out on route']}),[9,13,22,16,14,10,10,30,30,30,24,14]);
 var levels=stockLevels();add('Current Stock',backupRows(Object.keys(levels).sort(),['Item','Current Balance'],function(k){return [k,levels[k]]}),[34,20]);
 add('Expenses',backupRows(expenses,['Expense ID','Date','Category','Description','Amount'],function(x){return [x.id,backupDateOf(x),x.cat,x.note||'',backupMoney(x.amount)]}),[16,14,20,40,18]);
 add('Employees',backupRows(S.employees,['Employee ID','Name','Role','Mobile','Monthly Salary','Address'],function(x){return [x.id,x.name,x.role,x.phone,backupMoney(x.salary),x.address||'']}),[16,26,18,16,20,35]);
 add('Attendance',backupRows(attendance,['Record ID','Date','Employee','Status','In Time','Out Time'],function(x){return [x.id,backupDateOf(x),empName(x.emp),x.status||'',x.tin||'',x.tout||'']}),[16,14,26,16,14,14]);
 add('Salary Advances',backupRows(advances,['Advance ID','Date','Employee','Amount','Note'],function(x){return [x.id,backupDateOf(x),empName(x.emp),backupMoney(x.amount),x.note||'']}),[16,14,26,18,36]);
 add('Vehicles',backupRows(S.vehicles,['Vehicle ID','Vehicle Number','Type','Model','Default Driver','Notes','Created At'],function(x){return [x.id,x.number,x.type,x.model||'',empName(x.driver),x.notes||'',x.createdAt||'']}),[16,20,18,20,25,35,24]);
 add('Vehicle Trips',backupRows(S.vehicleTrips,['Trip ID','Vehicle','Employee','Start Date/Time','Start KM','Fuel Type','Start Fuel %','End KM','End Fuel %','Supervisor','Condition','Damage / Notes','Handover At','Status'],function(x){var v=S.vehicles.filter(function(z){return z.id==x.vehicle})[0];return [x.id,v?v.number:x.vehicle,empName(x.employee),x.startAt||'',x.startReading||'',x.fuelType||'',x.fuelPercent||'',x.endReading||'',x.endFuel||'',x.supervisor||'',x.handoverCondition||'',x.damage||'',x.handoverAt||'',x.status||'']}),[16,20,25,24,14,16,15,14,15,22,22,35,24,16]);
 add('Cancelled Bills',backupRows((S.cancelledBills||[]).filter(function(x){return backupInRange(x,from,to)}),['Bill ID','Date','Customer','Total','Reason','Cancelled At'],function(x){return [x.id,backupDateOf(x),custName(x.cust),backupMoney(x.total),x.reason||'',x.cancelledAt||'']}),[16,14,26,16,35,24]);
 add('Deleted Bills',backupRows((S.deletedBills||[]).filter(function(x){return backupInRange(x,from,to)}),['Bill ID','Date','Customer','Total','Reason','Deleted At'],function(x){return [x.id,backupDateOf(x),custName(x.cust),backupMoney(x.total),x.reason||'',x.deletedAt||'']}),[16,14,26,16,35,24]);
  add('Cafe Sales',backupRows(cafeSales,['Sale ID','Date','Item','Quantity','Unit','Rate','Total','Payment Mode'],function(x){return [x.id,backupDateOf(x),x.item,x.qty,x.unit,x.rate,x.total,x.mode]}),[16,14,28,14,14,14,16,18]);
  add('Cafe Purchases',backupRows(cafePurchases,['Purchase ID','Date','Item','Quantity','Unit','Supplier','Total Amount','Paid Now','Balance Due','Entered By','Note'],function(x){return [x.id,backupDateOf(x),x.item,x.qty,x.unit,x.supplier,x.amount,x.paid||0,x.balance!=null?x.balance:Math.max(0,(x.amount||0)-(x.paid||0)),x.createdBy||'',x.note]}),[16,14,28,14,14,24,16,16,16,24,35]);
  add('Cafe Expenses',backupRows((S.cafeExpenses||[]).filter(function(x){return backupInRange(x,from,to)}),['Expense ID','Date','Category','Amount','Description','Entered By'],function(x){return [x.id,backupDateOf(x),x.category,x.amount,x.note||'',x.createdBy||'']}),[16,14,22,16,35,24]);
  add('Cafe Stock Movements',backupRows(cafeMoves,['Movement ID','Date','Type','Item','Quantity','Unit','Note'],function(x){return [x.id,backupDateOf(x),x.type,x.item,x.qty,x.unit,x.note]}),[16,14,14,28,14,14,35]);
 var filename='Larven_Enterprises_Backup_'+label+'_'+datePart+'_'+timePart+'.xlsx';XLSX.writeFile(wb,filename,{compression:true});toast('Excel backup downloaded: '+filename);
}
/* ---------- router & events ---------- */
var view=$('#view');
function buildTabs(cur){var T=[['dashboard','Home','home'],['new-bill','New Bill','plus'],['bills','Bills','doc'],['payments','Payments','card']];
 $('#tabbar').innerHTML=T.map(function(t){return '<a href="#'+t[0]+'" class="'+(t[0]==cur?'on':'')+'">'+ic(t[2])+t[1]+'</a>'}).join('')+'<button type="button" id="tabmenu">'+ic('list')+'More</button>'}
function render(){
 if((location.hash||'').indexOf('#login')==0){return renderLogin()}
 if((location.hash||'').indexOf('#join=')==0){return renderJoin()}
 if((location.hash||'').indexOf('#bill=')==0){return renderPublic()}
 if((location.hash||'').indexOf('#doc=')==0){return renderDoc()}
 if((location.hash||'').indexOf('#me=')==0){return renderPortal()}
 document.body.classList.remove('public');var id=(location.hash||'#dashboard').slice(1);
 if(id.indexOf('cafe-') == 0 && CURRENT_ROLE == 'employee'){
   toast('Access restricted: Cafe is not accessible to employee accounts.');
   id = 'dashboard';
   location.hash = '#dashboard';
 }
 if(id == 'users' && CURRENT_ROLE == 'employee'){
   toast('Access restricted: User management is only accessible to manager and owner accounts.');
   id = 'dashboard';
   location.hash = '#dashboard';
 }
 if((id == 'route-planner' || id == 'production-plan') && CURRENT_ROLE == 'employee'){
   toast('Access restricted: Planning screens are reserved for managers and owners.');
   id = 'my-route';
   location.hash = '#my-route';
 }
 if (id === 'my-route' && CURRENT_ROLE === 'employee' && !window.__LOADING_ROUTE && typeof navigator !== 'undefined' && navigator.onLine !== false) {
   window.__LOADING_ROUTE = true;
   loadMyRouteFromSupabase().then(function(res) {
     window.__LOADING_ROUTE = false;
     if (res && (location.hash || '').slice(1) === 'my-route') {
       var v = $('#view');
       if (v && typeof PAGES['my-route'] === 'function') {
         v.innerHTML = PAGES['my-route']();
       }
     }
   }).catch(function() {
     window.__LOADING_ROUTE = false;
   });
 }
 if(!PAGES[id])id='dashboard';if(id!='new-bill')EDITID=null;if(id!='customers')CV=null;
 if(id=='backup')BACKUP_MODE='daily';buildNav(id);buildTabs(id);closeMenu();document.body.classList.remove('searching');var pt=$('#ptitle');if(pt)pt.textContent=TITLES[id]||'';view.innerHTML=PAGES[id]();view.scrollTop=0;
 if(id=='new-bill')billInit();
 var nb=S.stock&&Object.keys(stockLevels()).filter(function(k){return stockLevels()[k]<=S.settings.low*.6}).length;
 $('#nbadge').textContent=nb||'';$('#nbadge').hidden=!nb;
 document.title='Larven Enterprises BMS';$('#brandname').textContent=S.settings.name;
}
document.addEventListener('submit',function(e){
 var f=e.target;e.preventDefault();
 if(f.id=='employee-edit-form'){
  var id=f.dataset.id,emp=S.employees.filter(function(x){return x.id==id})[0];if(!emp)return;
  var fd=new FormData(f),v={};fd.forEach(function(val,key){v[key]=String(val).trim()});
  var phone=digits(v.phone),salary=Number(v.salary),aad=v.aadhaar.replace(/\D/g,'');
  if(v.name.length<2||phone.length!=10||!(/^[6-9]\d{9}$/.test(phone))||!(salary>=0)||!Number.isFinite(salary))return toast('Please check name, 10-digit mobile number and salary');
  if(S.employees.some(function(x){return x.id!=id&&digits(x.phone)==phone}))return toast('This mobile number is already used by another employee');
  if(aad&&aad.length!=12)return toast('Aadhaar number must contain 12 digits');
  var emg=digits(v.emergency);if(!/^[6-9]\d{9}$/.test(emg)||emg==phone)return toast('Enter a valid emergency contact number (different from the employee\'s own number)');
  var pan=v.pan.toUpperCase();if(pan&&!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(pan))return toast('Enter a valid PAN number');
  var lic=v.licenseNo.toUpperCase();if(!drivingLicenseOk(lic))return toast('Please check the Driving Licence number');
  emp.name=v.name;emp.role=v.role;emp.phone=phone;emp.salary=salary;emp.address=v.address;emp.emergency=digits(v.emergency);emp.emergencyName=v.emergencyName||'';emp.aadhaar=aad;emp.pan=pan;emp.licenseNo=lic;
  save();toast('Employee details updated');showProfile(id);return;
 }
 var k=f.id.replace('FORM-','');if(!FORMS[k])return;
 var v={};new FormData(f).forEach(function(val,key){v[key]=val});
 var msg=FORMS[k](v);if(typeof msg=='string'&&msg.indexOf('ERROR:')===0){toast(msg.slice(6));return}save();toast(msg);render();
});
document.addEventListener('click',function(e){
 var t=e.target.closest('#stog,#tabmenu,.grp,[data-del],[data-go],[data-bkmode],#backup-download,#burger,#scrim,#theme,#addline,#reset,.nav a');if(!t)return;
 if(t.dataset.bkmode){BACKUP_MODE=t.dataset.bkmode;view.querySelectorAll('[data-bkmode]').forEach(function(b){b.classList.toggle('active',b.dataset.bkmode==BACKUP_MODE)});$('#bk-date-wrap').hidden=BACKUP_MODE!='daily';$('#bk-from-wrap').hidden=BACKUP_MODE!='range';$('#bk-to-wrap').hidden=BACKUP_MODE!='range';$('#bk-period-note').textContent=BACKUP_MODE=='daily'?'Daily backup includes records dated on the selected day. The workbook also includes an All-Time Sales summary for comparison.':BACKUP_MODE=='range'?'Custom backup includes records dated from the selected start date through the selected end date. The workbook also includes an All-Time Sales summary.':'All-Time backup includes every available record currently stored in this browser.';return}
 if(t.id=='backup-download'){backupExport();return}
 if(t.id=='stog'){document.body.classList.toggle('searching');if(document.body.classList.contains('searching'))$('#q').focus()}
 else if(t.id=='tabmenu'){$('#side').classList.add('open');$('#scrim').classList.add('open')}
 else if(t.classList.contains('grp')){var g=t.dataset.grp,o=!NAVOPEN[g];NAVOPEN[g]=o;t.setAttribute('aria-expanded',o);t.nextElementSibling.hidden=!o}
 else if(t.dataset.del){var p=t.dataset.del.split(':'),coll=p[0],id=p.slice(1).join(':');if(coll=='bills'){billDispositionModal('delete',id);return}if(coll=='payments'||coll=='customers'){askDelete(coll,id);return}if(!confirmTap(t))return;if(coll=='fg'){var fe=fgDelete(id);if(fe){toast(fe);render();return}save();toast('Deleted');render();return}if(S[coll])S[coll]=S[coll].filter(function(x){return x.id!=id});if(coll=='cafePurchases')S.cafeStockMoves=S.cafeStockMoves.filter(function(x){return x.note!='Purchase '+id});save();toast('Deleted');render()}
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
document.addEventListener('keydown',function(e){if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()=='k'){e.preventDefault();$('#q').focus()}});

/* =====================================================================
   v14 – requirement document changes (Larven Enterprises)
   ===================================================================== */
var UPL={};
var RPFX={'Driver':'DR','Helper':'HP','Operator':'OP','System Operator':'SO','Sweeper':'SW','Security Guard':'SG','Accountant':'AC','Salesman':'SM','Other':'EM'};
function empCode(e){if(!e)return '';var m=digits(e.phone||'');return m.length==10?(RPFX[e.role]||'EM')+'-'+m:String(e.id||'')}
function waterEmps(){return S.employees.filter(function(e){return (e.department||'Water Plant')!='Cafe'})}
function empNameOpts(sel){var o=S.settings.owner||'Owner',names=[o].concat(waterEmps().map(function(e){return e.name}));var seen={};names=names.filter(function(n){if(!n||seen[n])return false;seen[n]=1;return true});
 var cur=sel||S.settings.lastBy||o;if(names.indexOf(cur)<0)names.push(cur);
 return names.map(function(n){return '<option'+(n==cur?' selected':'')+'>'+esc(n)+'</option>'}).join('')}
function dayNum(d){return Math.round(new Date(d+'T00:00:00').getTime()/864e5)}
function addDays(d,n){var x=new Date(d+'T00:00:00');x.setDate(x.getDate()+n);return ymd(x)}
function hrsBetween(a,b){if(!a||!b)return 0;var x=String(a).split(':'),y=String(b).split(':'),h=((+y[0]*60+ +y[1])-(+x[0]*60+ +x[1]))/60;return h>0?Math.round(h*100)/100:0}

/* ---------- uploads (bills / receipts / documents) ---------- */
document.addEventListener('change',function(e){var t=e.target;if(!t||!t.dataset||!t.dataset.upl)return;var k=t.dataset.upl,f=t.files&&t.files[0],st=document.getElementById('upl-'+k);UPL[k]='';if(st)st.textContent='';if(!f)return;
 if(/^image\//.test(f.type)){readImg(f,1000,.6).then(function(d){UPL[k]=d;if(st)st.textContent='Attached: '+f.name},function(){toast('Could not read this image');t.value=''})}
 else if(f.type=='application/pdf'){if(f.size>600000){t.value='';return toast('PDF maximum size is 600 KB')}var fr=new FileReader();fr.onload=function(){UPL[k]=String(fr.result);if(st)st.textContent='Attached: '+f.name};fr.readAsDataURL(f)}
 else{t.value='';toast('Please choose a photo or a PDF')}});
function takeUpl(k){var d=UPL[k]||'';UPL[k]='';return d}
function vdoc(coll,id,f){var r=(S[coll]||[]).filter(function(x){return x.id==id})[0];return r&&r[f||'bill']?'<button type="button" class="btn sm alt" data-vdoc="'+coll+':'+id+':'+(f||'bill')+'">View</button>':'<span class="muted">-</span>'}
document.addEventListener('click',function(e){var t=e.target.closest('[data-vdoc]');if(!t)return;var p=t.dataset.vdoc.split(':'),r=(S[p[0]]||[]).filter(function(x){return x.id==p[1]})[0],d=r&&r[p[2]];if(!d)return toast('No document attached');
 openModal('<h3>Attached bill / document</h3>'+(/^data:application\/pdf/.test(d)?'<iframe src="'+d+'" style="width:100%;height:60vh;border:0;border-radius:10px"></iframe>':'<img alt="Attached document" src="'+d+'" style="max-width:100%;border-radius:12px">')+'<div class="dact"><a class="btn green" download="bill-'+esc(p[1])+(/^data:application\/pdf/.test(d)?'.pdf':'.jpg')+'" href="'+d+'">Download</a><button type="button" class="btn alt" data-nb="close">Close</button></div>',true)});

/* ---------- location helpers ---------- */
function getLoc(cb){if(!navigator.geolocation){toast('Location is not available on this device');return}toast('Getting location…');
 navigator.geolocation.getCurrentPosition(function(p){cb({lat:+p.coords.latitude.toFixed(6),lng:+p.coords.longitude.toFixed(6),acc:Math.round(p.coords.accuracy),at:new Date().toISOString()})},function(){toast('Could not get location. Allow location permission and turn on GPS.')},{enableHighAccuracy:true,timeout:20000,maximumAge:0})}
function mapUrl(l){return 'https://www.google.com/maps?q='+l.lat+','+l.lng}
function locWa(l,name,phone){return 'https://wa.me/?text='+encodeURIComponent('📍 '+(name||'Customer location')+(phone?' ('+phone+')':'')+'\nGoogle Maps: '+mapUrl(l))}
function locLinks(l,name,phone){return '<a class="btn alt sm" target="_blank" rel="noopener" href="'+mapUrl(l)+'">🗺 Open in Google Maps</a> <a class="btn wa sm" target="_blank" rel="noopener" href="'+locWa(l,name,phone)+'">Share on WhatsApp</a>'}
function locPaint(){var el=$('#locnote');if(!el||typeof NB=='undefined'||!NB)return;var m=digits(($('#nb-mob')||{}).value),c=S.customers.filter(function(x){return digits(x.phone)==m})[0],nm=($('#nb-name')||{}).value||'',l=NB.loc||(c&&c.loc);
 if(!l){el.innerHTML='<span class="muted">No location saved for this customer.</span>';return}
 el.innerHTML='<span class="pill p-green">'+(NB.loc?'Location captured now':'Saved location')+'</span> <small class="muted">'+l.lat+', '+l.lng+(l.acc?' (±'+l.acc+' m)':'')+'</small> '+locLinks(l,nm||(c&&c.name),m)}
document.addEventListener('click',function(e){var t=e.target.closest('[data-loc]');if(!t)return;if(t.dataset.loc=='save'){var m=digits($('#nb-mob').value);if(m.length!=10)return bad('#nb-mob','Enter the customer mobile number first');if(!$('#nb-name').value.trim())return bad('#nb-name','Enter the customer name first');
 getLoc(function(l){NB.loc=l;locPaint();toast('Location saved with this customer (±'+l.acc+' m). It is stored when you save the bill.')})}});

/* ---------- PhonePe / UPI QR (shared) ---------- */
function upiQR(boxId,hintId,amount,note){var box=document.getElementById(boxId),hint=document.getElementById(hintId);if(!box)return;box.innerHTML='';var id=String(S.settings.upiId||'').trim(),nm=String(S.settings.upiPayee||S.settings.name||'Larven Enterprises').trim();
 var say=function(t){if(hint)hint.textContent=t};
 if(!id)return say('Set your UPI ID in Business Settings to generate the QR.');
 if(!(amount>0))return say('Enter an amount greater than zero.');
 if(typeof QRCode==='undefined')return say('QR library did not load. Check internet connection and refresh the page.');
 var uri='upi://pay?pa='+encodeURIComponent(id)+'&pn='+encodeURIComponent(nm)+'&am='+encodeURIComponent(round2(amount).toFixed(2))+'&cu=INR&tn='+encodeURIComponent(note||nm);
 try{new QRCode(box,{text:uri,width:210,height:210,colorDark:'#111827',colorLight:'#ffffff',correctLevel:QRCode.CorrectLevel.M});say('Scan with PhonePe or any UPI app to pay '+money(amount)+'. Payment is not verified automatically – check your phone, then save the payment.')}catch(x){say('Could not generate QR. Check the UPI ID in Business Settings.')}}

/* ---------- Payments: customer position, bills with checkboxes, PhonePe QR ---------- */
var PAYS={cust:'',sel:{}};
function payCusts(){return S.customers.filter(function(c){return S.bills.some(function(b){return b.cust==c.id})}).map(function(c){return [c,cstat(c).pend]}).sort(function(a,b){return (b[1]>0)-(a[1]>0)||a[0].name.localeCompare(b[0].name)})}
function payBillsOf(id){return S.bills.filter(function(b){return b.cust==id}).slice().sort(function(a,b){return a.date<b.date?-1:a.date>b.date?1:0})}
function dueOf(b){return round2(b.total-b.paid)}
function paySelDue(){return round2(payBillsOf(PAYS.cust).filter(function(b){return PAYS.sel[b.id]&&dueOf(b)>0}).reduce(function(a,b){return a+dueOf(b)},0))}
function payOpts(list,cur){return list.map(function(a){return '<option value="'+a[0].id+'"'+(a[0].id==cur?' selected':'')+'>'+esc(a[0].name)+' · '+esc(a[0].phone)+(a[1]>0?' · Due '+money(a[1]):' · No dues')+'</option>'}).join('')}
function payDetail(){var c=cget(PAYS.cust);if(!c)return '<div class="card"><div class="empty">Select a customer to see their bills.</div></div>';
 var bs=payBillsOf(c.id),tot=sum(bs,function(b){return b.total}),pd=sum(bs,function(b){return b.paid}),due=round2(tot-pd);
 return kp([['Total bill amount',money(tot)],['Total paid',money(pd)],['Total due',money(due)]])+
 '<div class="card tw" style="padding:6px"><table><thead><tr><th style="width:44px"><input type="checkbox" id="pp-all" aria-label="Select all unpaid bills"></th><th>Bill No</th><th>Date</th><th>Total</th><th>Paid</th><th>Due</th><th>Status</th></tr></thead><tbody>'+
 (bs.length?bs.map(function(b){var d=dueOf(b);return '<tr><td data-l="Select"><input type="checkbox" class="pp-chk" data-b="'+esc(b.id)+'"'+(d>0?'':' disabled')+(PAYS.sel[b.id]&&d>0?' checked':'')+' aria-label="Select bill '+esc(b.id)+'"></td><td data-l="Bill No"><b>#'+esc(b.id)+'</b></td><td data-l="Date">'+fdate(b.date)+'</td><td data-l="Total">'+money(b.total)+'</td><td data-l="Paid">'+money(b.paid)+'</td><td data-l="Due"><b>'+money(d)+'</b></td><td data-l="Status"><span class="pill '+(d<=0?'p-green':b.paid>0?'p-amber':'p-red')+'">'+(d<=0?'Paid':b.paid>0?'Part paid':'Unpaid')+'</span></td></tr>'}).join(''):'<tr><td colspan="7"><div class="empty">No bills for this customer.</div></td></tr>')+'</tbody></table></div>'}
PAGES.payments=function(){var list=payCusts();if(!cget(PAYS.cust)||!list.some(function(a){return a[0].id==PAYS.cust})){var first=list.filter(function(a){return a[1]>0})[0]||list[0];PAYS.cust=(PAYCUST&&cget(PAYCUST)?PAYCUST:(first?first[0].id:''));PAYS.sel={}}PAYCUST='';
 var l=S.payments.slice().reverse();
 return head2('Payments','Choose a customer, tick the bill(s) being paid, enter the amount and save. PhonePe QR is available for UPI payments.')+
 '<div class="card form" style="margin-bottom:12px"><div class="fld" style="grid-column:1/-1"><label for="pp-search">Search customer by mobile number or name</label><input id="pp-search" type="search" placeholder="Type mobile number or customer name" autocomplete="off"></div>'+
 '<div class="fld" style="grid-column:1/-1"><label for="pp-cust">Customer</label><select id="pp-cust">'+payOpts(list,PAYS.cust)+'</select></div></div>'+
 '<div id="pp-detail">'+payDetail()+'</div>'+
 '<form id="payform2" class="card form" autocomplete="off" novalidate style="margin-top:12px"><div class="fld"><label for="pp-amt">Amount received (₹)</label><input id="pp-amt" type="number" min="0.01" step="0.01" inputmode="decimal" placeholder="Tick bill(s) above"></div>'+
 '<div class="fld"><label for="pp-mode">Payment mode</label><select id="pp-mode">'+MODES.map(function(m){return '<option>'+m+'</option>'}).join('')+'</select></div><div class="fld"><label for="pp-date">Date</label><input id="pp-date" type="date" value="'+today()+'"></div>'+
 '<div class="fld"><button class="btn green" type="submit" style="width:100%;height:42px">Save Payment</button></div>'+
 '<div id="pp-info" class="note" style="grid-column:1/-1;margin:0">Tick one or more bills. The amount fills in automatically and can be reduced for a part payment.</div>'+
 '<div id="pp-qr" class="upi-qr-card" style="grid-column:1/-1" hidden><div class="upi-qr-visual"><div id="pp-qr-code"></div></div><div class="upi-qr-info"><h4>Scan &amp; Pay with PhonePe / UPI</h4><p id="pp-qr-pay"></p><div class="upiw"></div><p id="pp-qr-hint" class="upi-qr-warn"></p><div class="upi-qr-actions"><button type="button" class="btn alt" id="pp-qr-refresh">Refresh QR</button></div></div></div></form>'+
 '<h3 style="margin:18px 0 0">Payment history</h3>'+table(['Date','Customer','Amount Paid','Mode','Against bill',''],l.map(function(p){return [fdate(p.date),esc(custName(p.cust)),money(p.amount),esc(p.mode),p.bill=='-'?'Advance':'#'+esc(p.bill),del('payments',p.id)]}),'No payments yet.')};
function ppRefresh(){var amt=$('#pp-amt');if(!amt)return;var due=paySelDue();amt.value=due>0?due:'';amt.max=due||'';ppQR();
 var n=Object.keys(PAYS.sel).filter(function(k){return PAYS.sel[k]}).length;$('#pp-info').textContent=n?n+' bill(s) selected · due '+money(due)+'. Amount can be reduced for a part payment.':'Tick one or more bills. The amount fills in automatically and can be reduced for a part payment.'}
function ppQR(){var card=$('#pp-qr');if(!card)return;var m=$('#pp-mode').value;if(m!='PhonePe'){card.hidden=true;return}card.hidden=false;var a=+($('#pp-amt').value||0),c=cget(PAYS.cust);$('#pp-qr-pay').innerHTML='Payee: <b>'+esc(S.settings.upiPayee||S.settings.name)+'</b> · UPI ID: '+esc(S.settings.upiId||'Not configured')+'<br><b>Amount: '+money(a)+'</b>'+(c?' · '+esc(c.name):'');upiQR('pp-qr-code','pp-qr-hint',a,(S.settings.name||'')+' payment '+(c?c.name:''))}
function ppCustChanged(){PAYS.cust=$('#pp-cust').value;PAYS.sel={};$('#pp-detail').innerHTML=payDetail();ppRefresh()}
document.addEventListener('input',function(e){var t=e.target;if(t.id=='pp-search'){var q=t.value.trim(),list=payCusts().filter(function(a){return !q||matchCust(a[0],q)}),s=$('#pp-cust'),cur=s.value;s.innerHTML=payOpts(list,cur);if(!list.length){PAYS.cust='';$('#pp-detail').innerHTML='<div class="card"><div class="empty">No customer found for "'+esc(q)+'".</div></div>';return}if(!list.some(function(a){return a[0].id==cur}))s.value=list[0][0].id;ppCustChanged()}
 else if(t.id=='pp-amt')ppQR()});
document.addEventListener('change',function(e){var t=e.target;if(t.id=='pp-cust')ppCustChanged();else if(t.id=='pp-mode')ppQR();
 else if(t.classList&&t.classList.contains('pp-chk')){PAYS.sel[t.dataset.b]=t.checked;ppRefresh()}
 else if(t.id=='pp-all'){payBillsOf(PAYS.cust).forEach(function(b){PAYS.sel[b.id]=t.checked&&dueOf(b)>0});document.querySelectorAll('.pp-chk').forEach(function(c){if(!c.disabled)c.checked=t.checked});ppRefresh()}});
document.addEventListener('click',function(e){if(e.target&&e.target.id=='pp-qr-refresh')ppQR()});
document.addEventListener('submit',function(e){if(e.target.id!='payform2')return;e.preventDefault();e.stopPropagation();clearErr('#pp-amt');
 var c=cget(PAYS.cust),picked=payBillsOf(PAYS.cust).filter(function(b){return PAYS.sel[b.id]&&dueOf(b)>0}),a=round2(+$('#pp-amt').value||0),due=paySelDue();
 if(!c)return toast('Select a customer');if(!picked.length)return toast('Tick the bill(s) this payment is for');
 if(!(a>0))return bad('#pp-amt','Enter the amount received');if(a>due)return bad('#pp-amt','Amount cannot be more than the selected bills due '+money(due));
 var rest=a,d=$('#pp-date').value||today(),mode=$('#pp-mode').value,n=0;
 picked.forEach(function(b){var take=Math.min(rest,dueOf(b));if(take>0){b.paid=round2(b.paid+take);rest=round2(rest-take);n++;S.payments.push({id:nid('P',S.payments),date:d,cust:c.id,amount:take,mode:mode,bill:b.id})}});
 save();PAYS.sel={};toast(money(a)+' received from '+c.name+' against '+n+' bill(s)');render()},true);


/* ---------- Stock: plant availability banner, merged history ---------- */
function plantAvail(){var b=fgBal(),sz=fgSizes();return '<div class="avail"><div class="avh"><b>Available cases in the plant right now</b><small>Transfer cannot exceed the stock at the “From” location</small></div><div class="avrow">'+sz.map(function(z){var n=fgGet(b,'P',z);return '<div class="avc'+(n<=0?' zero':'')+'"><small>'+esc(z)+'</small><b>'+nf(n)+'</b><em>cases</em></div>'}).join('')+'</div><div class="avgod">'+['G1','G2'].map(function(g){return '<span><b>'+esc(locName(g))+':</b> '+sz.map(function(z){return esc(z)+' '+nf(fgGet(b,g,z))}).join(' · ')+'</span>'}).join('')+'</div></div>'}
var _ovPage=PAGES['stock-overview'],_histPage=PAGES['stock-history'];
PAGES['stock-overview']=function(){var h=_histPage().replace('<div class="ph"><h2>Stock History</h2></div>','');return _ovPage()+'<div class="shist"><h2 style="margin:26px 0 4px">Stock History</h2><p class="pdesc" style="margin:0 0 8px">Every production, transfer, dispatch and raw material movement.</p>'+h+'</div>'};
PAGES['stock-history']=PAGES['stock-overview'];

/* ---------- Dispatch to Customers: multi-item bill, preview / download, customer history ---------- */
var DSP={cust:'',lines:[{pi:-2,cs:0,r:0}],from:'G1'};
function dspProds(){var seen={},out=[];(S.settings.products||[]).forEach(function(p,i){if(!seen[p.n]){seen[p.n]=1;out.push({i:i,n:p.n,c:+p.c||1,r:+p.r||0})}});return out}
function dspSummary(c){if(!c)return '<div class="note">New customer – enter name, mobile and address below. Existing customers appear in the list above.</div>';
 var bs=S.bills.filter(function(b){return b.cust==c.id}),cases=Math.round(sum(bs,function(b){return sum(b.items,function(i){return i.q/(i.cs||1)})})*100)/100,tot=sum(bs,function(b){return b.total}),pd=sum(bs,function(b){return b.paid}),last=bs.length?bs[bs.length-1].date:'';
 return '<div class="note ex"><b>'+esc(c.name)+'</b> · '+esc(c.phone)+(c.area?' · '+esc(c.area):'')+'</div>'+kp([['Total cases purchased',nf(cases)],['Total billed',money(tot)],['Amount paid',money(pd)],['Credit amount',money(round2(tot-pd))],['Bills',bs.length],['Last purchase',last?fdate(last):'-']])+(c.loc?'<div style="margin:-4px 0 10px">'+locLinks(c.loc,c.name,c.phone)+'</div>':'')}
function dspLines(){var P=dspProds(),b=fgBal();return DSP.lines.map(function(l,i){var p=P.filter(function(x){return x.i==l.pi})[0],have=p?fgGet(b,DSP.from,p.n):null;
 return '<div class="nbl dsl" data-i="'+i+'"><div class="fld"><label>Product / size</label><select data-dsp="prod" data-i="'+i+'"><option value="-2">Select size</option>'+P.map(function(x){return '<option value="'+x.i+'"'+(x.i==l.pi?' selected':'')+'>'+esc(x.n)+' · Case of '+x.c+'</option>'}).join('')+'</select>'+(have!=null?'<small class="muted">Available at '+esc(locName(DSP.from))+': <b>'+nf(have)+'</b> cases</small>':'')+'</div>'+
  '<div class="fld"><label>Cases</label><input type="number" min="0" step="any" inputmode="decimal" data-dsp="cs" data-i="'+i+'" value="'+(l.cs>0?l.cs:'')+'" placeholder="0"></div>'+
  '<div class="fld"><label>Price (₹ per case)</label><input type="number" min="0" step="any" inputmode="decimal" data-dsp="rate" data-i="'+i+'" value="'+(l.r>0?l.r:'')+'" placeholder="Enter price">'+(p&&p.r?'<small class="muted">Rate list: '+money(p.r)+'</small>':'')+'</div>'+
  '<div class="fld"><label>Amount</label><b class="la">'+money(round2((+l.cs||0)*(+l.r||0)))+'</b></div>'+(DSP.lines.length>1?'<button type="button" class="rm" data-dsp="rm" data-i="'+i+'">✕ Remove</button>':'<span></span>')+'</div>'}).join('')}
function dspTotal(){return round2(DSP.lines.reduce(function(a,l){return a+(+l.cs||0)*(+l.r||0)},0))}
function dspPaint(){var el=$('#dsp-lines');if(el)el.innerHTML=dspLines();dspSum()}
function dspSum(){var t=dspTotal(),r=+($('#dsp-rec')||{}).value||0;var a=$('#dsp-tot');if(a)a.textContent=money(t);var b=$('#dsp-bal');if(b)b.textContent=money(Math.max(0,round2(t-r)))}
PAGES['fg-dispatch']=function(){var c=cget(DSP.cust),td=S.fg.filter(function(r){return r.kind=='Dispatch'&&r.date==today()}),vs=(S.vehicles||[]).map(function(x){return x.number});
 var bills=S.bills.filter(function(b){return S.fg.some(function(r){return r.kind=='Dispatch'&&r.bill==b.id})});
 return head('Dispatch to Customers','<a class="btn alt sm" href="#fg-empload">Dispatch to Employees →</a>')+'<div class="note" style="margin:0 0 12px">Direct godown deliveries (wholesale / retail / shops). Enter the cases and price, then generate the bill. Stock is reduced from the chosen godown. Route sales by delivery staff are recorded in Vehicle Management.</div>'+
 kp([['Cases dispatched today',nf(fgSum(td))],['Deliveries today',td.length],['Wholesale today',nf(fgSum(td,function(r){return r.saleType=='Wholesale'}))],['Retail / shops today',nf(fgSum(td,function(r){return r.saleType!='Wholesale'}))]])+fgChips(['G1','G2','P'])+
 '<form id="dspform" class="nb" autocomplete="off" novalidate><div class="card nb-sec"><h3>Customer</h3><div class="nb-cust"><div class="fld wide"><label for="dsp-cust">Existing customer</label><select id="dsp-cust"><option value="">— New customer —</option>'+S.customers.map(function(x){return '<option value="'+x.id+'"'+(x.id==DSP.cust?' selected':'')+'>'+esc(x.name)+' · '+esc(x.phone)+'</option>'}).join('')+'</select></div>'+
 '<div class="fld"><label for="dsp-name">Customer name *</label><input id="dsp-name" value="'+esc(c?c.name:'')+'"></div><div class="fld"><label for="dsp-mob">Mobile number *</label><input id="dsp-mob" type="tel" inputmode="numeric" maxlength="10" value="'+esc(c?digits(c.phone):'')+'"></div><div class="fld wide"><label for="dsp-addr">Address *</label><input id="dsp-addr" value="'+esc(c?c.area||'':'')+'"></div></div><div id="dsp-sum">'+dspSummary(c)+'</div></div>'+
 '<div class="card nb-sec"><h3>Dispatch details</h3><div class="nb-pay"><div class="fld"><label for="dsp-from">Dispatch from</label><select id="dsp-from">'+['G1','G2','P'].map(function(g){return '<option value="'+g+'"'+(g==DSP.from?' selected':'')+'>'+esc(locName(g))+'</option>'}).join('')+'</select></div><div class="fld"><label for="dsp-type">Sale type</label><select id="dsp-type"><option>Wholesale</option><option>Retail</option><option>Shop</option></select></div>'+
 '<div class="fld"><label for="dsp-veh">Vehicle (optional)</label><input id="dsp-veh" list="dsp-vl" placeholder="Vehicle number"><datalist id="dsp-vl">'+vs.map(function(v){return '<option value="'+esc(v)+'"></option>'}).join('')+'</datalist></div></div></div>'+
 '<div class="card nb-sec"><h3>Items (cases)</h3><div id="dsp-lines">'+dspLines()+'</div><button type="button" class="btn alt" data-dsp="add">+ Add Item</button></div>'+
 '<div class="card nb-sec"><h3>Amount</h3><div class="nb-pay"><div class="fld"><label for="dsp-mode">Payment mode</label><select id="dsp-mode">'+MODES.map(function(m){return '<option>'+m+'</option>'}).join('')+'</select></div><div class="fld"><label for="dsp-rec">Amount received (₹)</label><input id="dsp-rec" type="number" min="0" step="any" inputmode="decimal" placeholder="0"></div></div>'+
 '<div id="dsp-payx">'+payFields('Cash',null)+'</div><div id="dsp-qr" class="upi-qr-card" hidden><div class="upi-qr-visual"><div id="dsp-qr-code"></div></div><div class="upi-qr-info"><h4>Scan &amp; Pay with PhonePe / UPI</h4><p id="dsp-qr-pay"></p><div class="upiw"></div><p id="dsp-qr-hint" class="upi-qr-warn"></p><div class="upi-qr-actions"><button type="button" class="btn alt" id="dsp-qr-refresh">Refresh QR</button></div></div></div>'+
 '<div class="sumbox"><div><small>Total bill</small><b id="dsp-tot">₹0</b></div><div><small>Credit (balance)</small><b id="dsp-bal" class="r">₹0</b></div></div></div>'+
 '<div class="nb-actions st"><button type="submit" class="btn">Generate Bill &amp; Dispatch</button></div></form>'+
 '<h3 style="margin:18px 0 8px">Dispatch history</h3>'+table(['Date','Customer','Type','Size','Cases','From','Bill','Employee',''],fgRows('Dispatch').map(function(r){return [r.date,esc(r.custName||''),esc(r.saleType||''),esc(r.size),'<b>'+nf(r.qty)+'</b>',esc(locName(r.from)),r.bill&&S.bills.some(function(b){return b.id==r.bill})?'<button type="button" class="btn sm alt" data-nb="preview" data-id="'+esc(r.bill)+'">#'+esc(r.bill)+'</button>':esc(r.bill||'-'),esc(r.driver||r.by||''),del('fg',r.id)]}),'No dispatches yet.')};
document.addEventListener('change',function(e){var t=e.target;if(t.id=='dsp-cust'){DSP.cust=t.value;var c=cget(DSP.cust);$('#dsp-name').value=c?c.name:'';$('#dsp-mob').value=c?digits(c.phone):'';$('#dsp-addr').value=c?c.area||'':'';$('#dsp-sum').innerHTML=dspSummary(c)}
 else if(t.id=='dsp-from'){DSP.from=t.value;dspPaint()}
 else if(t.dataset&&t.dataset.dsp=='prod'){var i=+t.dataset.i,k=+t.value,l=DSP.lines[i];l.pi=k;if(k>=0&&!(l.r>0)){/* price is entered by the user */}dspPaint()}});
document.addEventListener('input',function(e){var t=e.target;if(t.id=='dsp-rec'){dspSum()}else if(t.id=='dsp-mob')t.value=t.value.replace(/\D/g,'').slice(0,10);
 else if(t.dataset&&(t.dataset.dsp=='cs'||t.dataset.dsp=='rate')){var i=+t.dataset.i,l=DSP.lines[i];if(t.dataset.dsp=='cs')l.cs=Math.max(0,+t.value||0);else l.r=Math.max(0,+t.value||0);var row=t.closest('.dsl');if(row)row.querySelector('.la').textContent=money(round2((+l.cs||0)*(+l.r||0)));dspSum()}});
document.addEventListener('click',function(e){var t=e.target.closest('[data-dsp]');if(!t)return;var a=t.dataset.dsp,i=+t.dataset.i;if(a=='add'){DSP.lines.push({pi:-2,cs:0,r:0});dspPaint()}else if(a=='rm'){DSP.lines.splice(i,1);dspPaint()}});
document.addEventListener('submit',function(e){if(e.target.id!='dspform')return;e.preventDefault();e.stopPropagation();
 var name=$('#dsp-name').value.trim(),mob=digits($('#dsp-mob').value),addr=$('#dsp-addr').value.trim(),from=$('#dsp-from').value,by=curUser(),veh=$('#dsp-veh').value.trim(),stype=$('#dsp-type').value,mode=$('#dsp-mode').value,rec=round2(+$('#dsp-rec').value||0),ref=readPayRef(mode);if(ref===false)return;
 ['#dsp-name','#dsp-mob','#dsp-addr','#dsp-rec'].forEach(clearErr);
 if(!name)return bad('#dsp-name','Enter the customer name');if(mob.length!=10)return bad('#dsp-mob','Enter a 10-digit mobile number');if(!addr)return bad('#dsp-addr','Enter the customer address');
 var P=dspProds(),lines=DSP.lines.filter(function(l){return l.pi>=0&&+l.cs>0});if(!lines.length)return toast('Select a size and enter the cases');
 if(lines.some(function(l){return !(+l.r>0)}))return toast('Enter the price for every item');
 var need={};lines.forEach(function(l){var p=P.filter(function(x){return x.i==l.pi})[0];need[p.n]=(need[p.n]||0)+(+l.cs)});
 var bal=fgBal(),k;for(k in need){if(need[k]>fgGet(bal,from,k)+0.0001)return toast('Only '+nf(fgGet(bal,from,k))+' cases of '+k+' available at '+locName(from))}
 var total=dspTotal();if(rec<0||rec>total)return bad('#dsp-rec','Amount received cannot be more than the bill total');
 var c=S.customers.filter(function(x){return digits(x.phone)==mob})[0],isNew=!c;if(!c){c={id:nid('C',S.customers),name:name,phone:mob,area:addr,date:today()};S.customers.push(c)}else if(!c.area)c.area=addr;
 var items=lines.map(function(l){var p=P.filter(function(x){return x.i==l.pi})[0];return {p:p.n,q:Math.round((+l.cs)*p.c),r:+l.r,cs:p.c}});
 var nb={id:nid('B',S.bills),date:today(),cust:c.id,name:name,mobile:mob,addr:addr,items:items,total:total,gst:false,sub:total,tax:0,paid:rec,mode:mode,by:by,time:new Date().toTimeString().slice(0,5),ref:ref,x:Object.assign({from:from,type:stype},veh?{veh:veh}:{})};S.bills.push(nb);
 if(rec>0)S.payments.push({id:nid('P',S.payments),date:nb.date,cust:c.id,amount:rec,mode:mode,bill:nb.id});
 lines.forEach(function(l){var p=P.filter(function(x){return x.i==l.pi})[0];S.fg.push({id:nid('F',S.fg),kind:'Dispatch',date:nb.date,size:p.n,qty:+l.cs,from:from,to:'',cust:c.id,custName:c.name,saleType:stype,bill:nb.id,price:+l.r,vehicle:veh,driver:by,note:'',by:cafeActorName(),at:new Date().toISOString()})});
 DSP={cust:'',lines:[{pi:-2,cs:0,r:0}],from:from};save();render();showSaved(nb,isNew)},true);

/* ---------- Expenses: diesel (bill upload + approval) and other expenses ---------- */
function dstat(e){return e.status||'Approved'}
function statPill(s){return '<span class="pill '+(s=='Approved'?'p-green':s=='Rejected'?'p-red':'p-amber')+'">'+s+'</span>'}
PAGES.diesel=function(){FORMS.df=function(v){var a=+v.amount;if(!(a>0))return 'ERROR: Enter the amount';if(!(v.note||'').trim())return 'ERROR: Enter the vehicle number';S.expenses.push({id:nid('E',S.expenses),date:v.date,cat:'Diesel',note:v.note.trim(),amount:a,bill:takeUpl('dbill'),status:'Pending',submittedBy:cafeActorName()});return 'Diesel expense submitted for approval'};
 var l=S.expenses.filter(function(e){return e.cat=='Diesel'}),ok=l.filter(function(e){return dstat(e)=='Approved'}),pend=l.filter(function(e){return dstat(e)=='Pending'});
 return head('Diesel Expenses','<a class="btn alt sm" href="#diesel-approvals">Approve / Reject'+(pend.length?' ('+pend.length+')':'')+'</a>')+kp([['Approved diesel spend',inr(sum(ok,function(e){return e.amount}))],['Waiting for approval',pend.length+' · '+inr(sum(pend,function(e){return e.amount}))],['Entries',l.length]])+
 formCard([{k:'note',l:'Vehicle number',v:'AP 39 '},{k:'amount',l:'Amount (₹)',t:'number'},{k:'date',l:'Date',t:'date'},{k:'dbill',l:'Upload diesel bill / receipt (photo or PDF)',t:'file',r:false}],'Submit Diesel Expense','df')+
 table(['Date','Vehicle','Amount','Status','Approved / decided by','Bill',''],l.slice().reverse().map(function(e){var s=dstat(e);return [e.date,esc(e.note),inr(e.amount),statPill(s),s=='Pending'?'-':esc(e.approvedBy||'—'),vdoc('expenses',e.id),del('expenses',e.id)]}))};
PAGES['diesel-approvals']=function(){var l=S.expenses.filter(function(e){return e.cat=='Diesel'}),pend=l.filter(function(e){return dstat(e)=='Pending'}).slice().reverse(),done=l.filter(function(e){return dstat(e)!='Pending'}).slice().reverse();
 return head('Diesel Approvals','')+kp([['Waiting for approval',pend.length],['Pending amount',inr(sum(pend,function(e){return e.amount}))],['Approved',done.filter(function(e){return dstat(e)=='Approved'}).length],['Rejected',done.filter(function(e){return dstat(e)=='Rejected'}).length]])+
 '<h3 style="margin:8px 0">Waiting for approval</h3>'+table(['Date','Vehicle','Amount','Submitted by','Bill','Action'],pend.map(function(e){return [e.date,esc(e.note),inr(e.amount),esc(e.submittedBy||'-'),vdoc('expenses',e.id),'<div class="rowact"><button type="button" class="btn sm green" data-dap="ok" data-id="'+e.id+'">✓ Approve</button><button type="button" class="btn sm danger" data-dap="no" data-id="'+e.id+'">✕ Reject</button></div>']}),'Nothing is waiting for approval.')+
 '<h3 style="margin:18px 0 8px">Decided</h3>'+table(['Date','Vehicle','Amount','Status','Decided by','Reason / note','Bill'],done.map(function(e){return [e.date,esc(e.note),inr(e.amount),statPill(dstat(e)),esc(e.approvedBy||'—'),esc(e.reason||''),vdoc('expenses',e.id)]}),'No decisions yet.')};
document.addEventListener('click',function(e){var t=e.target.closest('[data-dap]');if(!t)return;var r=S.expenses.filter(function(x){return x.id==t.dataset.id})[0];if(!r)return;
 if(t.dataset.dap=='ok'){r.status='Approved';r.approvedBy=cafeActorName();r.decidedAt=new Date().toISOString();r.reason='';save();toast('Approved by '+r.approvedBy);render()}
 else openModal('<h3>Reject diesel expense</h3><p class="pdesc">'+esc(r.note)+' · '+inr(r.amount)+' · '+esc(r.date)+'</p><form id="dapform" data-id="'+r.id+'" class="form" style="grid-template-columns:1fr"><div class="fld"><label for="dap-r">Reason (optional)</label><textarea id="dap-r" class="bill-reason" maxlength="300" placeholder="Why is this rejected?"></textarea></div><div class="dact"><button type="button" class="btn alt" data-nb="close">Go back</button><button type="submit" class="btn danger">Reject</button></div></form>')});
document.addEventListener('submit',function(e){if(e.target.id!='dapform')return;e.preventDefault();var r=S.expenses.filter(function(x){return x.id==e.target.dataset.id})[0];if(!r)return;r.status='Rejected';r.approvedBy=cafeActorName();r.decidedAt=new Date().toISOString();r.reason=($('#dap-r').value||'').trim();save();closeModal();toast('Rejected');render()},true);
PAGES.expenses=function(){FORMS.ef=function(v){var a=+v.amount;if(!(a>0))return 'ERROR: Enter the amount';var ph=digits(v.pphone);if(v.pphone&&ph.length!=10)return 'ERROR: Phone number must be 10 digits';S.expenses.push({id:nid('E',S.expenses),date:v.date,cat:v.cat,note:v.note,amount:a,payee:(v.payee||'').trim(),pphone:ph,bill:takeUpl('ebill')});return 'Expense added'};
 var l=S.expenses.filter(function(e){return e.cat!='Diesel'});
 return head('Other Expenses')+kp([['Total',inr(sum(l,function(e){return e.amount}))],['Entries',l.length]])+formCard([{k:'cat',l:'Category',t:'select',o:['Electricity','Repairs','Salary','Packaging','Chemicals','Rent','Other']},{k:'note',l:'Details',r:false},{k:'amount',l:'Amount (₹)',t:'number'},{k:'payee',l:'Paid to (person / vendor name)'},{k:'pphone',l:'Phone number of person / vendor',t:'tel',r:false},{k:'date',l:'Date',t:'date'},{k:'ebill',l:'Upload bill / receipt (photo or PDF)',t:'file',r:false}],'Add Expense','ef')+
 table(['Date','Category','Details','Paid to','Phone','Amount','Bill',''],l.slice().reverse().map(function(e){return [e.date,esc(e.cat),esc(e.note),esc(e.payee||'-'),e.pphone?'<a href="tel:'+esc(e.pphone)+'">'+esc(e.pphone)+'</a>':'-',inr(e.amount),vdoc('expenses',e.id),del('expenses',e.id)]}))};

/* ---------- In / Out Timings: search, date range, OT, full details, PDF ---------- */
var TM={q:'',emp:'',from:'',to:'',duty:8};
function tmFrom(){return TM.from||today().slice(0,8)+'01'}
function tmTo(){return TM.to||today()}
function tmDays(from,to){var out=[],d=from,n=0;while(d<=to&&n<400){out.push(d);d=addDays(d,1);n++}return out}
function tmRow(a,duty){var h=hrsBetween(a.tin,a.tout),ot=a.ot>0?+a.ot:Math.max(0,Math.round((h-duty)*100)/100);return {h:h,ot:ot}}
function tmStats(eid,from,to){var duty=+TM.duty||8,days=tmDays(from,to),rows=[],pres=0,half=0,absn=0,hrs=0,ot=0,T=today();
 days.forEach(function(d){var a=S.attendance.filter(function(x){return x.emp==eid&&x.date==d})[0];if(a){var r=tmRow(a,duty);if(a.status=='Absent')absn++;else if(a.status=='Half day'){half++;pres+=.5}else pres++;hrs+=r.h;ot+=r.ot;rows.push({d:d,a:a,h:r.h,ot:r.ot,s:a.status})}else{if(d<=T)absn++;rows.push({d:d,a:null,h:0,ot:0,s:d<=T?'Absent':'-'})}});
 return {rows:rows,days:days.length,pres:pres,half:half,absn:absn,hrs:Math.round(hrs*100)/100,ot:Math.round(ot*100)/100}}
function tmEmpInfo(e){return '<div class="card" style="margin-bottom:12px"><div style="display:flex;gap:16px;align-items:center;flex-wrap:wrap">'+(e.photo?'<img class="eph big" style="width:84px;height:84px" src="'+e.photo+'" alt="">':'')+'<div style="flex:1;min-width:220px"><h3 style="margin:0">'+esc(e.name)+'</h3><span class="pill p-blue">'+esc(empCode(e))+'</span> <span class="pill">'+esc(e.role||'')+'</span></div></div>'+
 '<div class="pf" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px 18px;margin-top:14px"><div><small class="muted">Mobile</small><br><b>'+esc(e.phone||'-')+'</b></div><div><small class="muted">Emergency contact</small><br><b>'+esc(e.emergency?e.emergency+(e.emergencyName?' ('+e.emergencyName+')':''):'Not provided')+'</b></div><div><small class="muted">Monthly salary</small><br><b>'+inr(e.salary)+'</b></div><div><small class="muted">Joined</small><br><b>'+esc(e.joined?fdate(e.joined):'-')+'</b></div><div><small class="muted">Aadhaar</small><br><b>'+maskA(e.aadhaar)+'</b></div><div style="grid-column:1/-1"><small class="muted">Address</small><br><b>'+esc(e.address||'Not provided')+'</b></div></div></div>'}
function tmTable(st){return table(['Date','Day','Status','In','Out','Duty hours','OT hours','Place'],st.rows.map(function(r){var wd=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][new Date(r.d+'T00:00').getDay()],a=r.a;return [fdate(r.d),wd,r.s=='-'?'-':'<span class="pill '+(r.s=='Present'?'p-green':r.s=='Absent'?'p-red':'p-amber')+'">'+r.s+'</span>'+(a&&a.late?' <span class="pill p-amber">Late</span>':''),a&&a.tin?fmt12(a.tin):'-',a&&a.tout?fmt12(a.tout):'-',r.h?r.h.toFixed(2)+' h':'-',r.ot?'<b>'+r.ot.toFixed(2)+' h</b>':'-',a?(a.src=='banner'?esc(a.site||'Banner'):'Manual'):'-']}),'No days in this range.')}
PAGES.timings=function(){setTimeout(function(){attPull()},60);var f=tmFrom(),t=tmTo(),emps=waterEmps(),q=TM.q.trim().toLowerCase(),list=emps.filter(function(e){return !q||e.name.toLowerCase().indexOf(q)>-1||digits(e.phone).indexOf(digits(q)||'~')>-1||empCode(e).toLowerCase().indexOf(q)>-1||String(e.id).toLowerCase()==q}),e0=emps.filter(function(e){return e.id==TM.emp})[0];
 var ctl='<div class="card form" style="margin-bottom:12px"><div class="fld" style="grid-column:1/-1"><label for="tm-q">Search employee by name, mobile number or employee ID</label><input id="tm-q" type="search" value="'+esc(TM.q)+'" placeholder="e.g. Ravi, 98480…, HP-98480…" autocomplete="off"></div>'+
  '<div class="fld"><label for="tm-emp">Employee</label><select id="tm-emp"><option value="">— All employees (summary) —</option>'+list.map(function(e){return '<option value="'+e.id+'"'+(e.id==TM.emp?' selected':'')+'>'+esc(e.name)+' · '+esc(empCode(e))+'</option>'}).join('')+'</select></div>'+
  '<div class="fld"><label for="tm-from">From date</label><input id="tm-from" type="date" value="'+f+'"></div><div class="fld"><label for="tm-to">To date</label><input id="tm-to" type="date" value="'+t+'"></div><div class="fld"><label for="tm-duty">Normal duty hours / day (OT after this)</label><input id="tm-duty" type="number" min="1" max="24" step="0.5" value="'+(+TM.duty||8)+'"></div>'+
  '<div class="rowact" style="grid-column:1/-1"><button type="button" class="btn alt sm" data-tm="today">Today</button><button type="button" class="btn alt sm" data-tm="week">Last 7 days</button><button type="button" class="btn alt sm" data-tm="month">This month</button>'+(e0?'<button type="button" class="btn green sm" data-tm="pdf">⇩ Download attendance PDF</button>':'')+'</div></div>';
 if(e0){var st=tmStats(e0.id,f,t);return head('In / Out Timings')+ctl+tmEmpInfo(e0)+kp([['Days in range',st.days],['Days present',st.pres],['Absent',st.absn],['Total duty hours',st.hrs.toFixed(2)+' h'],['Overtime (OT)',st.ot.toFixed(2)+' h']])+tmTable(st)}
 var rows=list.map(function(e){var st=tmStats(e.id,f,t);return [esc(e.name),esc(empCode(e)),esc(e.role||''),st.pres,st.absn,st.hrs.toFixed(2)+' h','<b>'+st.ot.toFixed(2)+' h</b>','<button type="button" class="btn sm alt" data-tm="open" data-id="'+e.id+'">Open</button>']});
 return head('In / Out Timings')+ctl+table(['Employee','Employee ID','Role','Days present','Absent','Duty hours','OT hours',''],rows,'No employees found.')};
document.addEventListener('input',function(e){var t=e.target;if(t.id=='tm-q'){TM.q=t.value;var emps=waterEmps(),q=TM.q.trim().toLowerCase(),list=emps.filter(function(x){return !q||x.name.toLowerCase().indexOf(q)>-1||digits(x.phone).indexOf(digits(q)||'~')>-1||empCode(x).toLowerCase().indexOf(q)>-1||String(x.id).toLowerCase()==q});$('#tm-emp').innerHTML='<option value="">— All employees (summary) —</option>'+list.map(function(x){return '<option value="'+x.id+'"'+(x.id==TM.emp?' selected':'')+'>'+esc(x.name)+' · '+esc(empCode(x))+'</option>'}).join('');if(list.length==1&&q){TM.emp=list[0].id;render();var qi=$('#tm-q');if(qi){qi.focus();qi.setSelectionRange(qi.value.length,qi.value.length)}}}});
document.addEventListener('change',function(e){var t=e.target;if(t.id=='tm-emp'){TM.emp=t.value;render()}else if(t.id=='tm-from'){TM.from=t.value;render()}else if(t.id=='tm-to'){TM.to=t.value;render()}else if(t.id=='tm-duty'){TM.duty=Math.max(1,+t.value||8);render()}});
document.addEventListener('click',function(e){var t=e.target.closest('[data-tm]');if(!t)return;var a=t.dataset.tm;
 if(a=='today'){TM.from=TM.to=today();render()}else if(a=='week'){TM.to=today();TM.from=addDays(today(),-6);render()}else if(a=='month'){TM.from='';TM.to='';render()}else if(a=='open'){TM.emp=t.dataset.id;render()}else if(a=='pdf')tmPDF()});
function pdfFromHTML(html,fn,css){var wrap=document.createElement('div');wrap.style.cssText='position:fixed;left:-10000px;top:0;width:794px;background:#fff';wrap.innerHTML='<style>'+(css||'')+'</style>'+html;document.body.appendChild(wrap);
 var el=wrap.querySelector('.pdfdoc'),fallback=function(){wrap.remove();var h='<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+esc(fn)+'</title><style>'+(css||'')+'@media print{body{padding:0}}</style>'+html,a=document.createElement('a');a.href=URL.createObjectURL(new Blob([h],{type:'text/html'}));a.download=fn+'.html';document.body.appendChild(a);a.click();a.remove();toast('Downloaded (open it and tap Print to save as PDF)')};
 if(window.html2canvas&&window.jspdf){window.html2canvas(el,{scale:2,backgroundColor:'#ffffff'}).then(function(cv){var pdf=new window.jspdf.jsPDF({unit:'pt',format:'a4'}),W=595.28,H=841.89,ph=Math.floor(cv.width*H/W),y=0,pg=0;
  while(y<cv.height){var sl=document.createElement('canvas');sl.width=cv.width;sl.height=Math.min(ph,cv.height-y);sl.getContext('2d').drawImage(cv,0,y,cv.width,sl.height,0,0,cv.width,sl.height);if(pg)pdf.addPage();pdf.addImage(sl.toDataURL('image/jpeg',.92),'JPEG',0,0,W,sl.height*W/cv.width);y+=ph;pg++}
  pdf.save(fn+'.pdf');wrap.remove();toast('PDF downloaded')}).catch(fallback)}else fallback()}
function tmPDF(){var e=S.employees.filter(function(x){return x.id==TM.emp})[0];if(!e)return toast('Select an employee first');var f=tmFrom(),t=tmTo(),st=tmStats(e.id,f,t);
 var css='.pdfdoc{font:12px/1.45 system-ui,Arial,sans-serif;color:#301914;padding:26px 28px;background:#fff}.pdfdoc h1{margin:0;color:#6a211c;font-size:22px}.pdfdoc .sub{color:#78675f;margin:2px 0 14px}.pdfdoc .top{border-bottom:3px solid #c2502a;padding-bottom:10px;margin-bottom:14px}.pdfdoc .g{display:grid;grid-template-columns:repeat(3,1fr);gap:8px 16px;margin-bottom:14px}.pdfdoc .g small{color:#78675f;display:block;font-size:10px;text-transform:uppercase}.pdfdoc .k{display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin-bottom:14px}.pdfdoc .k div{background:#fdf2ec;border-radius:6px;padding:8px}.pdfdoc .k b{display:block;font-size:15px}.pdfdoc table{width:100%;border-collapse:collapse}.pdfdoc th{background:#6a211c;color:#fff;text-align:left;padding:6px 7px;font-size:10.5px}.pdfdoc td{padding:5px 7px;border-bottom:1px solid #f0e4dd;font-size:11px}';
 var html='<div class="pdfdoc"><div class="top"><h1>'+esc(S.settings.name)+'</h1><div class="sub">Employee attendance report · '+fdate(f)+' to '+fdate(t)+'</div></div>'+
  '<div class="g"><div><small>Employee</small><b>'+esc(e.name)+'</b></div><div><small>Employee ID</small><b>'+esc(empCode(e))+'</b></div><div><small>Role</small><b>'+esc(e.role||'')+'</b></div><div><small>Mobile</small><b>'+esc(e.phone||'-')+'</b></div><div><small>Emergency contact</small><b>'+esc(e.emergency||'-')+'</b></div><div><small>Salary</small><b>'+inr(e.salary)+'</b></div><div style="grid-column:1/-1"><small>Address</small><b>'+esc(e.address||'-')+'</b></div></div>'+
  '<div class="k"><div><small>Days</small><b>'+st.days+'</b></div><div><small>Present</small><b>'+st.pres+'</b></div><div><small>Absent</small><b>'+st.absn+'</b></div><div><small>Duty hours</small><b>'+st.hrs.toFixed(2)+'</b></div><div><small>OT hours</small><b>'+st.ot.toFixed(2)+'</b></div></div>'+
  '<table><thead><tr><th>Date</th><th>Day</th><th>Status</th><th>In</th><th>Out</th><th>Duty h</th><th>OT h</th></tr></thead><tbody>'+st.rows.map(function(r){var wd=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][new Date(r.d+'T00:00').getDay()];return '<tr><td>'+fdate(r.d)+'</td><td>'+wd+'</td><td>'+r.s+'</td><td>'+(r.a&&r.a.tin?fmt12(r.a.tin):'-')+'</td><td>'+(r.a&&r.a.tout?fmt12(r.a.tout):'-')+'</td><td>'+(r.h?r.h.toFixed(2):'-')+'</td><td>'+(r.ot?r.ot.toFixed(2):'-')+'</td></tr>'}).join('')+'</tbody></table><p style="margin-top:12px;color:#78675f;font-size:10.5px">Generated on '+fdate(today())+'. OT is counted after '+(+TM.duty||8)+' duty hours per day unless OT hours were entered manually.</p></div>';
 pdfFromHTML(html,'Attendance-'+String(e.name).replace(/[^A-Za-z0-9]+/g,'_')+'-'+f+'-to-'+t,css)}


/* ---------- Salesman visits & orders ---------- */
var SV={q:'',emp:'',loc:null,lines:[{pi:-2,cs:0}],tab:'orders'};
function svList(){if(!Array.isArray(S.visits))S.visits=[];return S.visits}
function svEmps(){var a=waterEmps();var s=a.filter(function(e){return e.role=='Salesman'});return s.length?s.concat(a.filter(function(e){return e.role!='Salesman'})):a}
function svItemsTxt(v){return (v.items||[]).map(function(i){return nf(i.cases)+' case'+(i.cases==1?'':'s')+' '+i.p}).join(', ')||'-'}
function svLines(){var P=dspProds(),b=fgBal();return SV.lines.map(function(l,i){var p=P.filter(function(x){return x.i==l.pi})[0],have=p?fgGet(b,'G1',p.n)+fgGet(b,'G2',p.n)+fgGet(b,'P',p.n):null;
 return '<div class="nbl svl" data-i="'+i+'" style="grid-template-columns:2fr 1fr auto"><div class="fld"><label>Product / size</label><select data-sv="prod" data-i="'+i+'"><option value="-2">Select size</option>'+P.map(function(x){return '<option value="'+x.i+'"'+(x.i==l.pi?' selected':'')+'>'+esc(x.n)+'</option>'}).join('')+'</select>'+(have!=null?'<small class="muted">In stock (plant + godowns): <b>'+nf(have)+'</b> cases</small>':'')+'</div><div class="fld"><label>Cases required</label><input type="number" min="0" step="any" inputmode="decimal" data-sv="cs" data-i="'+i+'" value="'+(l.cs>0?l.cs:'')+'" placeholder="0"></div>'+(SV.lines.length>1?'<button type="button" class="rm" data-sv="rm" data-i="'+i+'">✕</button>':'<span></span>')+'</div>'}).join('')}
function svLocPaint(){var el=$('#sv-locnote');if(!el)return;var l=SV.loc;el.innerHTML=l?'<span class="pill p-green">Location saved</span> <small class="muted">'+l.lat+', '+l.lng+(l.acc?' (±'+l.acc+' m)':'')+'</small> '+locLinks(l,$('#sv-shop').value,$('#sv-mob').value):'<span class="muted">No location saved yet.</span>'}
function svStats(emp){var v=svList().filter(function(x){return x.emp==emp});var dates={};v.forEach(function(x){var d=dates[x.date]||(dates[x.date]={visits:0,orders:0,confirmed:0,cases:0});d.visits++;if(x.order){d.orders++;if(x.order=='Confirmed'){d.confirmed++;d.cases+=sum(x.items||[],function(i){return +i.cases||0})}}});return {rows:v,dates:dates}}
function svRowsFor(list){return list.map(function(v){return {Date:v.date,Salesman:v.empName,'Salesman ID':v.empCode,'Salesman mobile':v.empPhone||'','Shop / customer':v.shop,'Shop mobile':v.mobile,Address:v.addr||'','Saved location':v.loc?mapUrl(v.loc):'','Customer response':v.resp,Notes:v.note||'','Order items':svItemsTxt(v),'Order status':v.order||'No order','Confirmed by':v.confirmedBy||''}})}
function svDownload(rows,fn){if(!rows.length)return toast('Nothing to download');
 if(window.XLSX){var wb=XLSX.utils.book_new(),ws=XLSX.utils.json_to_sheet(rows);XLSX.utils.book_append_sheet(wb,ws,'Visits & Orders');XLSX.writeFile(wb,fn+'.xlsx');toast('Excel downloaded');return}
 var keys=Object.keys(rows[0]),csv=[keys].concat(rows.map(function(r){return keys.map(function(k){return r[k]})})).map(function(r){return r.map(function(c){return '"'+String(c==null?'':c).replace(/"/g,'""')+'"'}).join(',')}).join('\n'),a=document.createElement('a');a.href=URL.createObjectURL(new Blob(['﻿'+csv],{type:'text/csv'}));a.download=fn+'.csv';document.body.appendChild(a);a.click();a.remove();toast('Downloaded (CSV)')}
PAGES['sales-visits']=function(){var emps=svEmps(),L=svList(),q=SV.q.trim().toLowerCase();
 var form='<form id="svform" class="nb" autocomplete="off" novalidate><div class="card nb-sec"><h3>Record a visit / order</h3><div class="nb-cust"><div class="fld"><label for="sv-emp">Salesman *</label><select id="sv-emp"><option value="">Select salesman</option>'+emps.map(function(e){return '<option value="'+e.id+'">'+esc(e.name)+' · '+esc(empCode(e))+'</option>'}).join('')+'</select></div><div class="fld"><label for="sv-date">Visit date</label><input id="sv-date" type="date" value="'+today()+'"></div>'+
  '<div class="fld"><label for="sv-shop">Shop / restaurant / customer name *</label><input id="sv-shop" list="sv-cl" placeholder="Name"><datalist id="sv-cl">'+S.customers.map(function(c){return '<option value="'+esc(c.name)+'"></option>'}).join('')+'</datalist></div><div class="fld"><label for="sv-mob">Customer mobile number *</label><input id="sv-mob" type="tel" inputmode="numeric" maxlength="10" placeholder="10-digit mobile"></div><div class="fld wide"><label for="sv-addr">Address (optional)</label><input id="sv-addr"></div>'+
  '<div class="fld wide"><label>Shop location</label><div class="locrow"><button type="button" class="btn alt sm" data-sv="loc">📍 Save Location</button><span id="sv-locnote"><span class="muted">No location saved yet.</span></span></div></div>'+
  '<div class="fld"><label for="sv-resp">Customer response / status *</label><select id="sv-resp"><option>Order placed</option><option>Interested – will order later</option><option>Needs more time</option><option>Follow-up required</option><option>Not interested</option></select></div><div class="fld wide"><label for="sv-note">Notes (what the customer said)</label><textarea id="sv-note" rows="2" maxlength="500" style="width:100%" placeholder="e.g. Will take 5 cases next week / asked for more time"></textarea></div></div></div>'+
  '<div class="card nb-sec"><h3>Order items <small class="muted">(optional – leave empty if no order)</small></h3><div id="sv-lines">'+svLines()+'</div><button type="button" class="btn alt" data-sv="add">+ Add Item</button></div>'+
  '<div class="nb-actions"><button type="submit" class="btn">Save Visit</button></div></form>';
 var orders=L.filter(function(v){return v.order}).slice().reverse(),pend=orders.filter(function(v){return v.order=='Pending'}).length;
 var oT=table(['Date','Salesman','Shop','Mobile','Order details','Status',''],orders.map(function(v){return [fdate(v.date),'<b>'+esc(v.empName)+'</b><br><small class="muted">'+esc(v.empCode)+'</small>',esc(v.shop),esc(v.mobile),esc(svItemsTxt(v)),'<span class="pill '+(v.order=='Confirmed'?'p-green':v.order=='Cancelled'?'p-red':'p-amber')+'">'+v.order+'</span>'+(v.confirmedBy?'<br><small class="muted">by '+esc(v.confirmedBy)+'</small>':''),'<div class="rowact">'+(v.order=='Pending'?'<button type="button" class="btn sm green" data-sv="ok" data-id="'+v.id+'">Confirm</button><button type="button" class="btn sm danger" data-sv="cancel" data-id="'+v.id+'">Cancel</button>':'')+'</div>']}),'No orders yet. Orders created from a visit appear here with the salesman name.');
 var vT=table(['Date','Salesman','Shop / customer','Mobile','Location','Response','Notes',''],L.slice().reverse().map(function(v){return [fdate(v.date),'<b>'+esc(v.empName)+'</b>',esc(v.shop),esc(v.mobile),v.loc?locLinks(v.loc,v.shop,v.mobile):'-',esc(v.resp),esc(v.note||''),del('visits',v.id)]}),'No visits recorded yet.');
 var f=emps.filter(function(e){return !q||e.name.toLowerCase().indexOf(q)>-1||digits(e.phone).indexOf(digits(q)||'~')>-1||empCode(e).toLowerCase().indexOf(q)>-1||String(e.id).toLowerCase()==q}),se=emps.filter(function(e){return e.id==SV.emp})[0],act='';
 if(se){var st=svStats(se.id),ds=Object.keys(st.dates).sort().reverse();var conf=st.rows.filter(function(x){return x.order=='Confirmed'}).length;
  act=kp([['Visits',st.rows.length],['Orders brought',st.rows.filter(function(x){return x.order}).length],['Orders confirmed',conf],['Cases confirmed',nf(sum(st.rows,function(x){return x.order=='Confirmed'?sum(x.items||[],function(i){return +i.cases||0}):0}))]])+
   '<h4 style="margin:8px 0">Day-wise activity – '+esc(se.name)+' ('+esc(empCode(se))+')</h4>'+table(['Date','Visits','Orders brought','Confirmed','Cases confirmed'],ds.map(function(d){var x=st.dates[d];return [fdate(d),x.visits,x.orders,x.confirmed,nf(x.cases)]}),'No activity yet.')+
   '<h4 style="margin:14px 0 8px">All visits & orders</h4>'+table(['Date','Shop','Mobile','Response','Order','Status'],st.rows.slice().reverse().map(function(v){return [fdate(v.date),esc(v.shop),esc(v.mobile),esc(v.resp),esc(svItemsTxt(v)),v.order?'<span class="pill '+(v.order=='Confirmed'?'p-green':'p-amber')+'">'+v.order+'</span>':'-']}),'No visits.')}
 var srch='<div class="card form" style="margin-bottom:12px"><div class="fld" style="grid-column:1/-1"><label for="sv-q">Search a salesman by name, ID or mobile number</label><input id="sv-q" type="search" value="'+esc(SV.q)+'" placeholder="e.g. Ravi / SM-98480… / 98480…" autocomplete="off"></div><div class="fld"><label for="sv-pick">Salesman</label><select id="sv-pick"><option value="">— Select —</option>'+f.map(function(e){return '<option value="'+e.id+'"'+(e.id==SV.emp?' selected':'')+'>'+esc(e.name)+' · '+esc(empCode(e))+'</option>'}).join('')+'</select></div><div class="rowact" style="align-self:end">'+(se?'<button type="button" class="btn green" data-sv="dl1">⇩ Download '+esc(se.name)+' report</button>':'')+'<button type="button" class="btn alt" data-sv="dlall">⇩ Download all visits</button></div></div>';
 return head('Salesman Visits & Orders')+form+
  '<div class="svtabs"><button type="button" class="svtab'+(SV.tab=='orders'?' on':'')+'" data-sv="tab" data-t="orders"><span>Orders'+(pend?' ('+pend+' pending)':'')+'</span></button><button type="button" class="svtab'+(SV.tab=='visits'?' on':'')+'" data-sv="tab" data-t="visits"><span>Visits</span></button><button type="button" class="svtab'+(SV.tab=='sales'?' on':'')+'" data-sv="tab" data-t="sales"><span>Salesman activity</span></button></div>'+
  (SV.tab=='orders'?oT:SV.tab=='visits'?vT:srch+act)};
function svPaintLines(){var el=$('#sv-lines');if(el)el.innerHTML=svLines()}
document.addEventListener('change',function(e){var t=e.target;if(t.id=='sv-pick'){SV.emp=t.value;render()}else if(t.dataset&&t.dataset.sv=='prod'){SV.lines[+t.dataset.i].pi=+t.value;svPaintLines()}
 else if(t.id=='sv-shop'){var c=S.customers.filter(function(x){return x.name.toLowerCase()==t.value.trim().toLowerCase()})[0];if(c){$('#sv-mob').value=digits(c.phone);$('#sv-addr').value=c.area||'';if(c.loc&&!SV.loc){SV.loc=c.loc;svLocPaint()}}}});
document.addEventListener('input',function(e){var t=e.target;if(t.id=='sv-mob'){t.value=t.value.replace(/\D/g,'').slice(0,10);var c=S.customers.filter(function(x){return digits(x.phone)==t.value})[0];if(c&&!$('#sv-shop').value.trim()){$('#sv-shop').value=c.name;$('#sv-addr').value=c.area||''}}
 else if(t.dataset&&t.dataset.sv=='cs'){SV.lines[+t.dataset.i].cs=Math.max(0,+t.value||0)}
 else if(t.id=='sv-q'){SV.q=t.value;var q=SV.q.trim().toLowerCase(),f=svEmps().filter(function(x){return !q||x.name.toLowerCase().indexOf(q)>-1||digits(x.phone).indexOf(digits(q)||'~')>-1||empCode(x).toLowerCase().indexOf(q)>-1||String(x.id).toLowerCase()==q});$('#sv-pick').innerHTML='<option value="">— Select —</option>'+f.map(function(x){return '<option value="'+x.id+'"'+(x.id==SV.emp?' selected':'')+'>'+esc(x.name)+' · '+esc(empCode(x))+'</option>'}).join('');if(q&&f.length==1){SV.emp=f[0].id;render();var qi=$('#sv-q');if(qi){qi.focus();qi.setSelectionRange(qi.value.length,qi.value.length)}}}});
document.addEventListener('click',function(e){var t=e.target.closest('[data-sv]');if(!t)return;var a=t.dataset.sv,L=svList();
 if(a=='add'){SV.lines.push({pi:-2,cs:0});svPaintLines()}
 else if(a=='rm'){SV.lines.splice(+t.dataset.i,1);svPaintLines()}
 else if(a=='loc'){getLoc(function(l){SV.loc=l;svLocPaint()})}
 else if(a=='tab'){SV.tab=t.dataset.t;render()}
 else if(a=='ok'||a=='cancel'){var v=L.filter(function(x){return x.id==t.dataset.id})[0];if(!v)return;v.order=a=='ok'?'Confirmed':'Cancelled';v.confirmedBy=cafeActorName();v.confirmedAt=new Date().toISOString();save();toast(a=='ok'?'Order confirmed – shown with '+v.empName+'\'s name':'Order cancelled');render()}
 else if(a=='dlall')svDownload(svRowsFor(L),'Salesman-visits-orders-'+today());
 else if(a=='dl1'){var se=S.employees.filter(function(x){return x.id==SV.emp})[0];if(se)svDownload(svRowsFor(L.filter(function(x){return x.emp==se.id})),'Salesman-'+String(se.name).replace(/[^A-Za-z0-9]+/g,'_')+'-'+today())}});
document.addEventListener('submit',function(e){if(e.target.id!='svform')return;e.preventDefault();e.stopPropagation();
 var emp=S.employees.filter(function(x){return x.id==$('#sv-emp').value})[0],shop=$('#sv-shop').value.trim(),mob=digits($('#sv-mob').value),P=dspProds();
 ['#sv-emp','#sv-shop','#sv-mob'].forEach(clearErr);
 if(!emp)return bad('#sv-emp','Select the salesman');if(!shop)return bad('#sv-shop','Enter the shop / customer name');if(mob.length!=10)return bad('#sv-mob','Enter a 10-digit mobile number');
 var items=SV.lines.filter(function(l){return l.pi>=0&&+l.cs>0}).map(function(l){var p=P.filter(function(x){return x.i==l.pi})[0];return {p:p.n,cases:+l.cs}});
 if(SV.lines.some(function(l){return l.pi<0&&+l.cs>0}))return toast('Select the size for every item');
 var resp=$('#sv-resp').value;if(resp=='Order placed'&&!items.length)return toast('Add the items for the order, or change the response');
 var v={id:nid('V',svList()),date:$('#sv-date').value||today(),emp:emp.id,empName:emp.name,empCode:empCode(emp),empPhone:emp.phone||'',shop:shop,mobile:mob,addr:$('#sv-addr').value.trim(),loc:SV.loc,resp:resp,note:$('#sv-note').value.trim(),items:items,order:items.length?'Pending':'',at:new Date().toISOString()};
 svList().push(v);var c=S.customers.filter(function(x){return digits(x.phone)==mob})[0];if(c&&SV.loc&&!c.loc)c.loc=SV.loc;
 SV.loc=null;SV.lines=[{pi:-2,cs:0}];save();toast(items.length?'Visit saved. Order is waiting for confirmation in Orders.':'Visit saved');SV.tab=items.length?'orders':'visits';render()},true);

/* ---------- Contacts directory ---------- */
var CT={q:'',t:''};
var CTYPES=['Machinery repair technician','CCTV technician','Plumber','Electrician','Supplier','Transport / Vehicle mechanic','Other'];
PAGES.contacts=function(){if(!Array.isArray(S.contacts))S.contacts=[];
 FORMS.ctf=function(v){var ph=digits(v.phone);if(ph.length!=10)return 'ERROR: Contact number must be 10 digits';S.contacts.push({id:nid('K',S.contacts),name:v.name.trim(),phone:ph,type:v.type,work:(v.work||'').trim(),address:(v.address||'').trim()});return 'Contact saved'};
 var q=CT.q.trim().toLowerCase(),l=S.contacts.filter(function(c){return (!CT.t||c.type==CT.t)&&(!q||[c.name,c.phone,c.type,c.work,c.address].join(' ').toLowerCase().indexOf(q)>-1)});
 return head('Contacts Directory')+'<div class="note" style="margin:0 0 12px">Keep the numbers of machinery technicians, CCTV technicians, plumbers, electricians, suppliers and other service providers in one place.</div>'+
 formCard([{k:'name',l:'Name'},{k:'phone',l:'Contact number',t:'tel'},{k:'type',l:'Type of work / service',t:'select',o:CTYPES},{k:'work',l:'Work details (optional)',r:false},{k:'address',l:'Address',r:false}],'Save Contact','ctf')+
 '<div class="card form" style="margin:12px 0"><div class="fld"><label for="ct-q">Search contacts</label><input id="ct-q" type="search" value="'+esc(CT.q)+'" placeholder="Name, number, work, address"></div><div class="fld"><label for="ct-t">Filter by type</label><select id="ct-t"><option value="">All types</option>'+CTYPES.map(function(x){return '<option'+(x==CT.t?' selected':'')+'>'+esc(x)+'</option>'}).join('')+'</select></div></div>'+
 '<div id="ct-list">'+ctTable(l)+'</div>'};
function ctTable(l){return table(['Name','Contact number','Type of work','Details','Address',''],l.map(function(c){return ['<b>'+esc(c.name)+'</b>','<a href="tel:'+esc(c.phone)+'">'+esc(c.phone)+'</a>',esc(c.type),esc(c.work||''),esc(c.address||''),'<div class="rowact"><a class="btn sm alt" href="tel:'+esc(c.phone)+'">Call</a><a class="btn sm wa" target="_blank" rel="noopener" href="https://wa.me/91'+esc(c.phone)+'">WhatsApp</a>'+del('contacts',c.id)+'</div>']}),'No contacts found.')}
document.addEventListener('input',function(e){if(e.target.id=='ct-q'){CT.q=e.target.value;ctRefresh()}});
document.addEventListener('change',function(e){if(e.target.id=='ct-t'){CT.t=e.target.value;ctRefresh()}});
function ctRefresh(){var q=CT.q.trim().toLowerCase(),l=S.contacts.filter(function(c){return (!CT.t||c.type==CT.t)&&(!q||[c.name,c.phone,c.type,c.work,c.address].join(' ').toLowerCase().indexOf(q)>-1)}),el=$('#ct-list');if(el)el.innerHTML=ctTable(l)}

/* ---------- Backup & Restore ---------- */
var _bkPage=PAGES.backup;
PAGES.backup=function(){return _bkPage().replace('Backup & Data Export','Backup & Restore')+'<section class="card" style="margin-top:14px"><div class="card-h"><div><h3>Full backup &amp; restore (all data)</h3><p class="pdesc">Download one file with every record, photo and setting. Use it to move to a new phone / computer or to restore after a problem.</p></div><span class="pill p-amber">JSON file</span></div>'+
 '<div class="rowact"><button type="button" class="btn green" data-bkp="dl">⇩ Download full backup</button><button type="button" class="btn alt" data-bkp="pick">⇧ Restore from backup file</button><input type="file" id="bkp-file" accept=".json,application/json" hidden></div><div class="note warn" style="margin-top:10px">Restoring replaces everything currently in this browser with the contents of the backup file. Download a fresh backup first if unsure.</div></section>'};
document.addEventListener('click',function(e){var t=e.target.closest('[data-bkp]');if(!t)return;if(t.dataset.bkp=='dl'){var a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(S)],{type:'application/json'}));a.download='Larven-Enterprises-backup-'+today()+'.json';document.body.appendChild(a);a.click();a.remove();toast('Full backup downloaded')}else if(t.dataset.bkp=='pick')$('#bkp-file').click()});
document.addEventListener('change',function(e){if(e.target.id!='bkp-file')return;var f=e.target.files&&e.target.files[0];if(!f)return;f.text().then(function(tx){var o=null;try{o=JSON.parse(tx)}catch(x){}
 if(!o||!Array.isArray(o.bills)||!Array.isArray(o.customers)||!o.settings){toast('This is not a valid Larven Enterprises backup file');return}
 if(!confirm('Restore this backup? All current data in this browser (bills: '+S.bills.length+') will be replaced by the backup ('+o.bills.length+' bills, '+o.customers.length+' customers).'))return;
 try{localStorage.setItem(KEY,tx)}catch(x){toast('Could not restore: browser storage is full');return}toast('Backup restored. Reloading…');setTimeout(function(){location.reload()},600)});e.target.value=''});

/* ---------- joining form: emergency contact ---------- */
document.addEventListener('input',function(e){if(e.target.id=='j-emg'||e.target.id=='f-emergency')e.target.value=e.target.value.replace(/\D/g,'').slice(0,10)});

/* ---------- employee-facing attendance wording ---------- */

/* ---------- Price Variance Report (Decision 2) ---------- */
function priceVarianceReport() {
  if (CURRENT_ROLE === 'employee') {
    return head('Price Variance Report') + '<div class="note">Access restricted to Managers and Owners.</div>';
  }
  var rows = [];
  var custMap = {};
  (S.customers || []).forEach(function(c) { custMap[c.id] = c; });
  
  var sortedBills = (S.bills || []).slice().sort(function(a, b) {
    return (a.date || '').localeCompare(b.date || '') || (a.id || '').localeCompare(b.id || '');
  });
  
  var lastRates = {};
  sortedBills.forEach(function(b) {
    var c = custMap[b.cust] || { name: b.name || 'Unknown', phone: b.mobile || '' };
    (b.items || []).forEach(function(it) {
      var prod = it.p || it.name;
      var rate = Number(it.r) || 0;
      var key = b.cust + '::' + prod;
      if (lastRates[key] !== undefined) {
        var prevRate = lastRates[key];
        if (rate !== prevRate) {
          var diff = round2(rate - prevRate);
          rows.push({
            date: b.date,
            bill: b.id,
            customer: c.name,
            product: prod,
            prevRate: prevRate,
            newRate: rate,
            diff: diff,
            entered_by: it.entered_by || 'staff'
          });
        }
      }
      lastRates[key] = rate;
    });
  });
  
  rows.reverse();
  
  return head('Price Variance Report', '<small class="muted">Informational only · Shows bill items where the rate differed from the customer’s previous rate for that product</small>') +
    kp([['Total Variances', rows.length], ['Customers Affected', new Set(rows.map(function(r){return r.customer})).size]]) +
    table(['Date', 'Bill #', 'Customer', 'Product', 'Prev Rate', 'Billed Rate', 'Diff', 'Entered By'],
      rows.map(function(r) {
        var diffStyle = r.diff > 0 ? 'color:var(--green)' : 'color:var(--red)';
        var diffStr = (r.diff > 0 ? '+' : '') + inr(r.diff);
        return [
          fdate(r.date),
          '<b>#' + esc(r.bill) + '</b>',
          esc(r.customer),
          esc(r.product),
          inr(r.prevRate),
          '<b>' + inr(r.newRate) + '</b>',
          '<b style="' + diffStyle + '">' + diffStr + '</b>',
          esc(r.entered_by)
        ];
      }),
      'No price variances detected across customer billing history.'
    );
}
PAGES['price-variance'] = priceVarianceReport;

/* ---------- Authentication, Inactivity & User Management ---------- */
var CURRENT_SESSION = null;
var INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes
var inactivityTimer = null;

function getSession() {
  return CURRENT_SESSION;
}

function setSession(sess) {
  CURRENT_SESSION = sess;
  try {
    if (typeof OutboxDB !== 'undefined' && OutboxDB.setSession) {
      OutboxDB.setSession(sess);
    }
    if (sess && sess.user) {
      setCurrentRole(sess.user.role || 'employee');
      setCurrentProfile(sess.user);
      updateUserBadge(sess.user);
    } else if (!sess) {
      if (typeof OutboxDB !== 'undefined' && OutboxDB.clearSession) {
        OutboxDB.clearSession();
      }
      setCurrentRole('owner');
    }
  } catch(e) {}
}

function updateUserBadge(u) {
  var userBox = document.querySelector('.user');
  if (userBox && u) {
    var initial = (u.full_name || 'U')[0].toUpperCase();
    userBox.innerHTML = '<span class="avatar">' + esc(initial) + '</span>' +
      '<div><b>' + esc(u.full_name || 'Staff') + '</b><small>' + esc(u.role ? u.role.toUpperCase() : 'STAFF') + '</small></div>' +
      '<button type="button" class="btn sm alt" id="btn-logout" title="Sign out" style="margin-left:8px;padding:3px 8px;font-size:11px;">Logout</button>';
  }
}

function resetInactivityTimer() {
  if (inactivityTimer) clearTimeout(inactivityTimer);
  var sess = getSession();
  if (sess && typeof window !== 'undefined') {
    inactivityTimer = setTimeout(function() {
      handleInactivityLogout();
    }, INACTIVITY_TIMEOUT_MS);
  }
}

function handleInactivityLogout() {
  if (inactivityTimer) clearTimeout(inactivityTimer);
  setSession(null);
  toast('Logged out due to inactivity for security');
  location.hash = '#login';
  render();
}

function handleLogout() {
  if (inactivityTimer) clearTimeout(inactivityTimer);
  setSession(null);
  toast('Signed out successfully');
  location.hash = '#login';
  render();
}

if (typeof window !== 'undefined' && window.addEventListener) {
  ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click'].forEach(function(evt) {
    window.addEventListener(evt, resetInactivityTimer, { passive: true });
  });
}

function renderLogin() {
  document.body.classList.add('public');
  closeModal();
  var pub = $('#pubview');
  var v = $('#view');
  var target = pub || v;
  if (!target) return;

  target.innerHTML = '<div class="pubwrap" style="max-width:440px;margin:50px auto;padding:14px;">' +
    '<div class="card" style="padding:28px 24px;border-radius:20px;box-shadow:var(--shadow);border:1px solid var(--line);">' +
      '<div style="text-align:center;margin-bottom:24px;">' +
        '<svg width="44" height="52" viewBox="0 0 44 52" style="margin:0 auto 10px"><path d="M22 2C22 2 4 22 4 34a18 18 0 0 0 36 0C40 22 22 2 22 2Z" fill="#c2502a"></path><path d="M22 10C22 10 10 25 10 34a12 12 0 0 0 12 12c-6-3-9-8-9-13 0-6 5-14 9-23Z" fill="#fff"></path></svg>' +
        '<h2 style="margin:0 0 4px;font-size:24px;color:var(--brand);font-weight:800;">Larven Enterprises</h2>' +
        '<p class="pdesc" style="margin:0;">Water Plant BMS · Sign In</p>' +
      '</div>' +
      '<form id="login-form" class="form" autocomplete="on">' +
        '<div class="fld">' +
          '<label for="login-phone">Mobile Number / మొబైల్ నంబర్</label>' +
          '<input id="login-phone" name="phone" type="tel" inputmode="numeric" maxlength="10" placeholder="10-digit mobile number" required autocomplete="username">' +
        '</div>' +
        '<div class="fld">' +
          '<label for="login-password">Password / పాస్‌వర్డ్</label>' +
          '<input id="login-password" name="password" type="password" placeholder="Enter password" required autocomplete="current-password">' +
        '</div>' +
        '<div id="cf-turnstile-wrap" style="margin:12px 0;display:flex;justify-content:center;">' +
          '<div class="cf-turnstile" id="cf-turnstile" data-sitekey="1x00000000000000000000AA"></div>' +
        '</div>' +
        '<div id="login-err" class="note bad" style="display:none;margin-top:10px;"></div>' +
        '<div style="margin-top:16px;">' +
          '<button type="submit" class="btn" id="btn-login-submit" style="width:100%;height:44px;font-weight:700;font-size:15px;">Sign In</button>' +
        '</div>' +
      '</form>' +
    '</div>' +
  '</div>';
}

function showForcedPasswordChangeModal() {
  openModal(
    '<h3>Password Change Required</h3>' +
    '<p class="pdesc">Your account was initialized with a temporary password. Please set a new personal password before accessing the system.</p>' +
    '<form id="forced-pw-form" class="form" style="margin-top:12px;">' +
      '<div class="fld"><label for="fpw-new">New Password (minimum 8 characters)</label><input type="password" id="fpw-new" minlength="8" required autocomplete="new-password"></div>' +
      '<div class="fld"><label for="fpw-confirm">Confirm New Password</label><input type="password" id="fpw-confirm" minlength="8" required autocomplete="new-password"></div>' +
      '<div id="fpw-err" class="note bad" style="display:none;margin-top:8px;"></div>' +
      '<div class="dact" style="margin-top:14px;"><button type="submit" class="btn">Update Password</button></div>' +
    '</form>',
    false
  );
}

async function submitLogin(phone, password, turnstileToken) {
  var errEl = document.getElementById('login-err');
  if (errEl) errEl.style.display = 'none';
  try {
    var res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        phone: phone,
        password: password,
        turnstile_token: turnstileToken || 'TEST_TURNSTILE_TOKEN'
      })
    });
    var data = await res.json().catch(function() { return {}; });
    if (!res.ok || !data.ok) {
      var msg = data.error || 'Invalid phone number or password';
      if (errEl) {
        errEl.textContent = msg;
        errEl.style.display = 'block';
      }
      return false;
    }
    setSession(data);
    resetInactivityTimer();
    toast('Welcome back, ' + (data.user && data.user.full_name ? data.user.full_name : 'User'));
    if (data.user && data.user.role === 'employee') {
      try { await loadMyRouteFromSupabase(); } catch(e) {}
    }
    if (data.must_change_password) {
      showForcedPasswordChangeModal();
    } else {
      location.hash = '#dashboard';
      render();
    }
    return true;
  } catch(e) {
    if (errEl) {
      errEl.textContent = 'Invalid phone number or password';
      errEl.style.display = 'block';
    }
    return false;
  }
}

async function submitForcedPasswordChange(newPw) {
  var sess = getSession();
  var token = sess && sess.session && sess.session.access_token;
  var errEl = document.getElementById('fpw-err');
  if (errEl) errEl.style.display = 'none';
  try {
    var res = await fetch('/api/auth/change-password', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'authorization': 'Bearer ' + (token || '')
      },
      body: JSON.stringify({ new_password: newPw })
    });
    var data = await res.json().catch(function() { return {}; });
    if (!res.ok || !data.ok) {
      if (errEl) {
        errEl.textContent = data.error || 'Failed to update password';
        errEl.style.display = 'block';
      }
      return false;
    }
    if (sess) {
      sess.must_change_password = false;
      setSession(sess);
    }
    closeModal();
    toast('Password changed successfully');
    location.hash = '#dashboard';
    render();
    return true;
  } catch(e) {
    if (errEl) {
      errEl.textContent = 'Failed to update password. Please try again.';
      errEl.style.display = 'block';
    }
    return false;
  }
}

/* ---------- User Accounts & Role Management Page ---------- */
function userManagementPage() {
  if (isEmployee()) {
    return head('User Accounts') + '<div class="note bad">Access denied: User management is restricted to manager and owner accounts.</div>';
  }

  var isOwn = isOwner();
  var isAdm = isAdmin();

  var out = head('User Accounts & Roles') +
    '<div class="card" style="margin-bottom:14px;">' +
      '<div class="card-h">' +
        '<div>' +
          '<h3 style="margin:0">User Account Management</h3>' +
          '<p class="pdesc" style="margin:2px 0 0">Phone + password authentication. Rank hierarchy rules and service-role profile guards enforced.</p>' +
        '</div>' +
        '<button type="button" class="btn" id="btn-add-user" data-user-act="new-user">+ Add User Account</button>' +
      '</div>' +
    '</div>';

  // 1. "Who has admin access" list (Visible to Owner and Admin) with Deactivate Button
  if (isOwn || isAdm) {
    var adminUsers = (S.users || []).filter(function(u) { return u.role === 'admin'; });
    if (!adminUsers.length) {
      adminUsers = [{
        id: 'admin-dev-1',
        full_name: 'Developer Support',
        phone: '9848099999',
        role: 'admin',
        active: true,
        created_at: '2026-11-20T10:00:00Z'
      }];
    }

    out += '<section class="card" style="margin-bottom:18px; border-left:4px solid var(--amber);">' +
      '<div class="card-h">' +
        '<div>' +
          '<h3 style="margin:0">Who has admin access</h3>' +
          '<p class="pdesc" style="margin:2px 0 0">Developer and technical support accounts (read-only operational data, MFA required, fully audited). Owner has explicit authority to audit and deactivate admin accounts.</p>' +
        '</div>' +
        '<span class="pill p-amber">Support / Developer Access</span>' +
      '</div>' +
      '<div class="tw">' +
        '<table class="table">' +
          '<thead>' +
            '<tr>' +
              '<th>Name</th>' +
              '<th>Mobile / Login</th>' +
              '<th>Role</th>' +
              '<th>Status</th>' +
              '<th>Created</th>' +
              '<th style="text-align:right">Action</th>' +
            '</tr>' +
          '</thead>' +
          '<tbody>' +
            adminUsers.map(function(u) {
              return '<tr>' +
                '<td><b>' + esc(u.full_name) + '</b></td>' +
                '<td>' + esc(u.phone) + '</td>' +
                '<td><span class="pill">admin</span></td>' +
                '<td><span class="pill ' + (u.active ? 'p-green' : 'p-red') + '">' + (u.active ? 'Active' : 'Deactivated') + '</span></td>' +
                '<td>' + (u.created_at ? fdate(u.created_at.slice(0, 10)) : 'Recent') + '</td>' +
                '<td style="text-align:right">' +
                  (u.active
                    ? '<button type="button" class="btn sm danger" data-user-act="deactivate" data-id="' + esc(u.id) + '" data-role="admin" data-name="' + esc(u.full_name) + '">Deactivate</button>'
                    : '<span class="muted">Deactivated</span>') +
                '</td>' +
              '</tr>';
            }).join('') +
          '</tbody>' +
        '</table>' +
      '</div>' +
    '</section>';
  }

  // 2. Managers Section (Visible to Owner and Admin)
  if (isOwn || isAdm) {
    var mgrUsers = (S.users || []).filter(function(u) { return u.role === 'manager'; });
    if (!mgrUsers.length) {
      mgrUsers = [{
        id: 'mgr-1',
        full_name: 'Operations Manager',
        phone: '9848011111',
        role: 'manager',
        employee_id: 'MGR-001',
        active: true,
        created_at: '2026-11-20T10:00:00Z'
      }];
    }
    out += '<section class="card" style="margin-bottom:18px;">' +
      '<div class="card-h">' +
        '<h3>Managers</h3>' +
        '<span class="pill p-blue">' + mgrUsers.length + ' Managers</span>' +
      '</div>' +
      '<div class="tw">' +
        '<table class="table">' +
          '<thead>' +
            '<tr><th>Name</th><th>Phone</th><th>Role</th><th>Status</th><th style="text-align:right">Actions</th></tr>' +
          '</thead>' +
          '<tbody>' +
            mgrUsers.map(function(u) {
              return '<tr>' +
                '<td><b>' + esc(u.full_name) + '</b></td>' +
                '<td>' + esc(u.phone) + '</td>' +
                '<td><span class="pill">manager</span></td>' +
                '<td><span class="pill ' + (u.active ? 'p-green' : 'p-red') + '">' + (u.active ? 'Active' : 'Inactive') + '</span></td>' +
                '<td style="text-align:right">' +
                  '<div class="rowact" style="justify-content:flex-end">' +
                    '<button type="button" class="btn sm alt" data-user-act="reset-password" data-id="' + esc(u.id) + '" data-name="' + esc(u.full_name) + '">Reset Password</button>' +
                    (u.active ? '<button type="button" class="btn sm danger" data-user-act="deactivate" data-id="' + esc(u.id) + '" data-role="manager" data-name="' + esc(u.full_name) + '">Deactivate</button>' : '') +
                  '</div>' +
                '</td>' +
              '</tr>';
            }).join('') +
          '</tbody>' +
        '</table>' +
      '</div>' +
    '</section>';
  }

  // 3. Employees Section (Visible to Manager, Owner, Admin)
  var empUsers = (S.users || []).filter(function(u) { return u.role === 'employee'; });
  if (!empUsers.length) {
    empUsers = (S.employees || []).filter(function(e) { return (e.department || 'Water Plant') != 'Cafe'; }).map(function(e) {
      return {
        id: e.id,
        full_name: e.name,
        phone: e.phone,
        role: 'employee',
        employee_id: e.id,
        duties: e.duties || ['delivery'],
        active: e.active !== false,
        salary: e.salary
      };
    });
  }

  out += '<section class="card">' +
    '<div class="card-h">' +
      '<h3>Employees & Duty Tags</h3>' +
      '<span class="pill p-green">' + empUsers.length + ' Employees</span>' +
    '</div>' +
    '<div class="tw">' +
      '<table class="table">' +
        '<thead>' +
          '<tr>' +
            '<th>Name</th>' +
            '<th>Phone / Login</th>' +
            '<th>Duty Tags</th>' +
            '<th>Monthly Salary</th>' +
            '<th>Status</th>' +
            '<th style="text-align:right">Actions</th>' +
          '</tr>' +
        '</thead>' +
        '<tbody>' +
          empUsers.map(function(u) {
            var dutiesHtml = (u.duties && u.duties.length)
              ? u.duties.map(function(d) { return '<span class="pill p-blue" style="margin-right:4px;">' + esc(d) + '</span>'; }).join('')
              : '<span class="muted">No duties</span>';

            return '<tr>' +
              '<td><b>' + esc(u.full_name) + '</b></td>' +
              '<td>' + esc(u.phone) + '</td>' +
              '<td>' + dutiesHtml + '</td>' +
              '<td>' + inr(u.salary || 0) + '</td>' +
              '<td><span class="pill ' + (u.active ? 'p-green' : 'p-red') + '">' + (u.active ? 'Active' : 'Inactive') + '</span></td>' +
              '<td style="text-align:right">' +
                '<div class="rowact" style="justify-content:flex-end">' +
                  '<button type="button" class="btn sm alt" data-user-act="duty-tags" data-id="' + esc(u.id) + '" data-duties="' + esc((u.duties || []).join(',')) + '" data-name="' + esc(u.full_name) + '">Duty Tags</button>' +
                  '<button type="button" class="btn sm alt" data-user-act="reset-password" data-id="' + esc(u.id) + '" data-name="' + esc(u.full_name) + '">Reset Password</button>' +
                  (u.active ? '<button type="button" class="btn sm danger" data-user-act="deactivate" data-id="' + esc(u.id) + '" data-role="employee" data-name="' + esc(u.full_name) + '">Deactivate</button>' : '') +
                '</div>' +
              '</td>' +
            '</tr>';
          }).join('') +
        '</tbody>' +
      '</table>' +
    '</div>' +
  '</section>';

  return out;
}

function showAddUserModal() {
  var allowedRoles = [];
  if (isAdmin()) allowedRoles = ['employee', 'manager', 'owner', 'admin'];
  else if (isOwner()) allowedRoles = ['employee', 'manager'];
  else if (isManager()) allowedRoles = ['employee'];

  openModal(
    '<h3>Add User Account</h3>' +
    '<p class="pdesc">Accounts are created with phone_confirm=true and forced password change on first login. Rank hierarchy is strictly enforced.</p>' +
    '<form id="new-user-form" class="form" style="margin-top:14px;">' +
      '<div class="fld"><label>Role / పాత్ర</label><select name="role" id="nu-role" required>' +
        allowedRoles.map(function(r) { return '<option value="' + r + '">' + r.toUpperCase() + '</option>'; }).join('') +
      '</select></div>' +
      '<div class="fld"><label>Full Name / పూర్తి పేరు</label><input name="full_name" required placeholder="e.g. Ramesh Kumar"></div>' +
      '<div class="fld"><label>10-digit Mobile Number / మొబైల్ నంబర్</label><input name="phone" type="tel" inputmode="numeric" maxlength="10" required placeholder="9848012345"></div>' +
      '<div id="nu-duty-wrap" class="fld" style="grid-column:1/-1;">' +
        '<label>Duty Tags (Employees only)</label>' +
        '<div style="display:flex;gap:14px;margin-top:4px;">' +
          '<label><input type="checkbox" name="duties" value="delivery" checked> Delivery</label>' +
          '<label><input type="checkbox" name="duties" value="production"> Production</label>' +
          '<label><input type="checkbox" name="duties" value="godown"> Godown</label>' +
        '</div>' +
      '</div>' +
      '<div class="fld"><label>Monthly Salary (₹)</label><input name="salary" type="number" min="0" value="0"></div>' +
      '<div class="fld"><label>Address (Optional)</label><input name="address" placeholder="Address"></div>' +
      '<div class="dact" style="grid-column:1/-1;margin-top:12px;">' +
        '<button type="button" class="btn alt" data-nb="close">Cancel</button>' +
        '<button type="submit" class="btn">Create Account</button>' +
      '</div>' +
    '</form>',
    true
  );
}

function showEditDutyTagsModal(targetId, currentDutiesStr, targetName) {
  var duties = currentDutiesStr ? currentDutiesStr.split(',') : [];
  openModal(
    '<h3>Change Duty Tags</h3>' +
    '<p class="pdesc">Update assigned operational duties for <b>' + esc(targetName) + '</b>. Duty tags govern trip, plant, and godown permissions.</p>' +
    '<form id="duty-tags-form" data-id="' + esc(targetId) + '" class="form" style="margin-top:14px;">' +
      '<div class="fld" style="grid-column:1/-1;">' +
        '<div style="display:grid;gap:10px;margin-top:4px;">' +
          '<label><input type="checkbox" name="duty" value="delivery" ' + (duties.indexOf('delivery') >= 0 ? 'checked' : '') + '> <b>Delivery</b> (Assigned trip stops, customer routes, invoice generation)</label>' +
          '<label><input type="checkbox" name="duty" value="production" ' + (duties.indexOf('production') >= 0 ? 'checked' : '') + '> <b>Production</b> (Manufacturing batches, plant inventory creation)</label>' +
          '<label><input type="checkbox" name="duty" value="godown" ' + (duties.indexOf('godown') >= 0 ? 'checked' : '') + '> <b>Godown</b> (Inventory transfers between plant and depots)</label>' +
        '</div>' +
      '</div>' +
      '<div class="dact" style="grid-column:1/-1;margin-top:14px;">' +
        '<button type="button" class="btn alt" data-nb="close">Cancel</button>' +
        '<button type="submit" class="btn">Save Duty Tags</button>' +
      '</div>' +
    '</form>',
    true
  );
}

async function handleDeactivateUser(targetId, targetRole, targetName) {
  if (!canDeactivateUser({ id: targetId, role: targetRole }, S.users || [])) {
    if (targetRole === 'owner') {
      toast('Cannot remove or deactivate the last active owner.');
    } else {
      toast('Permission denied: Cannot deactivate account of equal or higher rank.');
    }
    return;
  }

  if (!confirm('Deactivate account for ' + targetName + '? The account will be immediately banned and logged to audit.')) {
    return;
  }

  var sess = getSession();
  var token = sess && sess.session && sess.session.access_token;
  try {
    var res = await fetch('/api/users/' + encodeURIComponent(targetId) + '/deactivate', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'authorization': 'Bearer ' + (token || '')
      }
    });
    var data = await res.json().catch(function() { return {}; });
    if (!res.ok || !data.ok) {
      toast(data.message || data.error || 'Failed to deactivate account');
      return;
    }
    toast('Account for ' + targetName + ' has been deactivated');
    if (S.users) {
      var u = S.users.find(function(x) { return x.id === targetId; });
      if (u) u.active = false;
    }
    render();
  } catch(e) {
    toast('Error contacting server to deactivate account');
  }
}

async function handleResetPassword(targetId, targetName) {
  if (!confirm('Reset password for ' + targetName + '? A temporary password will be generated and password change forced on next login.')) {
    return;
  }

  var sess = getSession();
  var token = sess && sess.session && sess.session.access_token;
  try {
    var res = await fetch('/api/users/' + encodeURIComponent(targetId) + '/reset-password', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'authorization': 'Bearer ' + (token || '')
      }
    });
    var data = await res.json().catch(function() { return {}; });
    if (!res.ok || !data.ok) {
      toast(data.error || 'Failed to reset password');
      return;
    }
    openModal(
      '<h3>Temporary Password Generated</h3>' +
      '<p class="pdesc">Password reset for <b>' + esc(targetName) + '</b>. Share this temporary password securely. The user will be required to change it upon signing in.</p>' +
      '<div style="background:var(--surface);border:1px dashed var(--brand);padding:14px;border-radius:10px;text-align:center;margin:14px 0;">' +
        '<code style="font-size:18px;font-weight:800;letter-spacing:1px;color:var(--brand);">' + esc(data.temporary_password) + '</code>' +
      '</div>' +
      '<div class="dact"><button type="button" class="btn" data-nb="close">Done</button></div>',
      true
    );
  } catch(e) {
    toast('Error resetting password');
  }
}

/* User Management Form & Action Listeners */
document.addEventListener('submit', function(e) {
  var f = e.target;
  if (!f) return;

  if (f.id === 'login-form') {
    e.preventDefault();
    var ph = $('#login-phone') ? $('#login-phone').value : '';
    var pw = $('#login-password') ? $('#login-password').value : '';
    var tt = '';
    var ttIn = f.querySelector('[name="cf-turnstile-response"]');
    if (ttIn) tt = ttIn.value;
    submitLogin(ph, pw, tt);
    return;
  }

  if (f.id === 'forced-pw-form') {
    e.preventDefault();
    var p1 = $('#fpw-new') ? $('#fpw-new').value : '';
    var p2 = $('#fpw-confirm') ? $('#fpw-confirm').value : '';
    var errEl = document.getElementById('fpw-err');
    if (p1 !== p2) {
      if (errEl) { errEl.textContent = 'Passwords do not match'; errEl.style.display = 'block'; }
      return;
    }
    submitForcedPasswordChange(p1);
    return;
  }

  if (f.id === 'new-user-form') {
    e.preventDefault();
    var fd = new FormData(f);
    var role = fd.get('role');
    var fullName = fd.get('full_name');
    var phone = fd.get('phone');
    var salary = fd.get('salary');
    var address = fd.get('address');
    var duties = [];
    f.querySelectorAll('input[name="duties"]:checked').forEach(function(cb) { duties.push(cb.value); });

    var sess = getSession();
    var token = sess && sess.session && sess.session.access_token;
    fetch('/api/users', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'authorization': 'Bearer ' + (token || '')
      },
      body: JSON.stringify({
        role: role,
        full_name: fullName,
        phone: phone,
        salary: salary,
        address: address,
        duties: duties
      })
    }).then(function(res) {
      return res.json().then(function(data) {
        if (!res.ok || !data.ok) {
          toast(data.message || data.error || 'Failed to create user');
          return;
        }
        closeModal();
        openModal(
          '<h3>Account Created Successfully</h3>' +
          '<p class="pdesc">Account created for <b>' + esc(fullName) + '</b> (' + esc(phone) + '). Phone confirmed: <b>true</b>. Forced password change: <b>true</b>.</p>' +
          '<div style="background:var(--surface);border:1px dashed var(--green);padding:14px;border-radius:10px;text-align:center;margin:14px 0;">' +
            '<small class="muted" style="display:block;margin-bottom:4px;">Temporary Password:</small>' +
            '<code style="font-size:18px;font-weight:800;letter-spacing:1px;color:var(--green);">' + esc(data.temporary_password) + '</code>' +
          '</div>' +
          '<p class="note">The user must sign in with their mobile number and this temporary password, and will be prompted to set a new password on first login.</p>' +
          '<div class="dact"><button type="button" class="btn" data-nb="close">Done</button></div>',
          true
        );
        render();
      });
    }).catch(function() {
      toast('Network error creating user');
    });
    return;
  }

  if (f.id === 'duty-tags-form') {
    e.preventDefault();
    var targetId = f.dataset.id;
    var selectedDuties = [];
    f.querySelectorAll('input[name="duty"]:checked').forEach(function(cb) { selectedDuties.push(cb.value); });

    var sess = getSession();
    var token = sess && sess.session && sess.session.access_token;
    fetch('/api/users/' + encodeURIComponent(targetId) + '/duty-tags', {
      method: 'PATCH',
      headers: {
        'content-type': 'application/json',
        'authorization': 'Bearer ' + (token || '')
      },
      body: JSON.stringify({ duties: selectedDuties })
    }).then(function(res) {
      return res.json().then(function(data) {
        if (!res.ok || !data.ok) {
          toast(data.error || 'Failed to update duty tags');
          return;
        }
        closeModal();
        toast('Duty tags updated successfully');
        render();
      });
    }).catch(function() {
      toast('Network error updating duty tags');
    });
    return;
  }
});

document.addEventListener('click', function(e) {
  var t = e.target.closest('[data-user-act], #btn-logout');
  if (!t) return;

  if (t.id === 'btn-logout') {
    handleLogout();
    return;
  }

  var act = t.dataset.userAct;
  var id = t.dataset.id;
  var role = t.dataset.role;
  var name = t.dataset.name;
  var duties = t.dataset.duties;

  if (act === 'new-user') {
    showAddUserModal();
    return;
  }
  if (act === 'deactivate') {
    handleDeactivateUser(id, role, name);
    return;
  }
  if (act === 'reset-password') {
    handleResetPassword(id, name);
    return;
  }
  if (act === 'duty-tags') {
    showEditDutyTagsModal(id, duties, name);
    return;
  }
});

/* ---------- Route & Operations Module (Larven BMS) ---------- */
function tomorrow() {
  var d = new Date();
  d.setDate(d.getDate() + 1);
  return ymd(d);
}

function haversineDist(lat1, lon1, lat2, lon2) {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return null;
  var R = 6371e3; // metres
  var p1 = lat1 * Math.PI / 180;
  var p2 = lat2 * Math.PI / 180;
  var dp = (lat2 - lat1) * Math.PI / 180;
  var dl = (lon2 - lon1) * Math.PI / 180;
  var a = Math.sin(dp / 2) * Math.sin(dp / 2) +
          Math.cos(p1) * Math.cos(p2) *
          Math.sin(dl / 2) * Math.sin(dl / 2);
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

function getVehNo(id) {
  var v = (S.vehicles || []).find(function(x) { return x.id == id || x.number == id; });
  return v ? v.number : (id || 'Vehicle');
}

function getVehCapacity(id) {
  var v = (S.vehicles || []).find(function(x) { return x.id == id || x.number == id; });
  return (v && v.capacity_cases) ? v.capacity_cases : 100;
}

function renderUpiQr(el, vpa, payee, amt, billRef) {
  if (!el) return;
  var upiUri = 'upi://pay?pa=' + encodeURIComponent(vpa || 'larven@okaxis') +
    '&pn=' + encodeURIComponent(payee || (S.settings && S.settings.name) || 'Larven Enterprises') +
    '&am=' + encodeURIComponent(Number(amt || 0).toFixed(2)) +
    '&cu=INR&tn=' + encodeURIComponent('Bill ' + (billRef || ''));
  el.innerHTML = '';
  if (typeof QRCode !== 'undefined') {
    try {
      new QRCode(el, {
        text: upiUri,
        width: 140,
        height: 140,
        colorDark: '#000000',
        colorLight: '#ffffff',
        correctLevel: QRCode.CorrectLevel ? QRCode.CorrectLevel.M : 0
      });
    } catch(e) {
      el.innerHTML = '<div style="padding:10px;border:1px dashed var(--brand);border-radius:6px;font-size:12px;color:var(--brand);text-align:center;">UPI Payee: <b>' + esc(payee) + '</b><br>VPA: <b>' + esc(vpa) + '</b><br>Amount: <b>' + inr(amt) + '</b></div>';
    }
  } else {
    el.innerHTML = '<div style="padding:10px;border:1px dashed var(--brand);border-radius:6px;font-size:12px;color:var(--brand);text-align:center;">UPI Payee: <b>' + esc(payee) + '</b><br>VPA: <b>' + esc(vpa) + '</b><br>Amount: <b>' + inr(amt) + '</b></div>';
  }
}

/* ---------- (2) Customer Location Capture ---------- */
function captureCustomerLocation(customerId, onDone) {
  var cust = (S.customers || []).find(function(c) { return c.id === customerId; });
  if (!cust) return;

  if (CURRENT_ROLE === 'employee' && cust.lat != null && cust.lng != null) {
    openModal(
      '<h3>Location Locked / లొకేషన్ మార్చలేరు</h3>' +
      '<p class="pdesc">GPS coordinates are already recorded for <b>' + esc(cust.name) + '</b> (' + esc(cust.lat) + ', ' + esc(cust.lng) + ').</p>' +
      '<p class="note" style="margin-top:10px;">Per operational policy, delivery staff can only capture initial location. Only managers or owners can update existing customer coordinates.</p>' +
      '<div class="dact"><button type="button" class="btn" data-nb="close">Understood</button></div>'
    );
    return;
  }

  openModal(
    '<h3>Capture GPS Location / జీపీఎస్ లొకేషన్</h3>' +
    '<p class="pdesc">Capturing high-accuracy coordinates for <b>' + esc(cust.name) + '</b> (' + esc(cust.area || 'Area') + '). 3 successive readings will be taken to guarantee accuracy &le; 50 meters.</p>' +
    '<div id="loc-status" style="margin:16px 0;padding:16px;background:var(--surface);border-radius:10px;text-align:center;">' +
      '<div style="font-size:14px;color:var(--muted);">Click <b>Start GPS Capture</b> to acquire high-precision fix.</div>' +
    '</div>' +
    '<div class="dact" id="loc-actions">' +
      '<button type="button" class="btn" id="btn-start-gps" data-loc-act="start-gps" data-cust-id="' + esc(cust.id) + '">Start GPS Capture</button>' +
      '<button type="button" class="btn alt" data-nb="close">Cancel</button>' +
    '</div>'
  );
  window.__LOC_CAPTURE_CALLBACK = onDone || null;
}

function executeGpsCapture(custId) {
  var cust = (S.customers || []).find(function(c) { return c.id === custId; });
  if (!cust) return;
  var statusEl = document.getElementById('loc-status');
  var actionsEl = document.getElementById('loc-actions');
  if (!navigator.geolocation) {
    if (statusEl) statusEl.innerHTML = '<div style="color:var(--red);font-weight:700;">Geolocation is not supported by this browser.</div>';
    return;
  }
  if (actionsEl) actionsEl.innerHTML = '<button type="button" class="btn" disabled>Capturing Readings...</button>';

  var readings = [];
  function step(n, total, done) {
    if (statusEl) {
      statusEl.innerHTML = '<div style="font-weight:700;color:var(--brand);font-size:16px;">Reading ' + n + ' of ' + total + '...</div>' +
        '<div style="font-size:13px;color:var(--muted);margin-top:4px;">Acquiring satellite lock with high precision...</div>';
    }
    navigator.geolocation.getCurrentPosition(
      function(pos) {
        readings.push({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          acc: pos.coords.accuracy
        });
        if (n < total) {
          setTimeout(function() { step(n + 1, total, done); }, 1200);
        } else {
          done(readings);
        }
      },
      function(err) {
        done(readings, err);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }

  step(1, 3, function(results) {
    var valid = results.filter(function(r) { return r && r.acc <= 50; });
    if (valid.length === 0) {
      var minAcc = results.length ? Math.min.apply(null, results.map(function(r){ return r.acc; })) : 999;
      if (statusEl) {
        statusEl.innerHTML = '<div style="color:var(--red);font-weight:700;">⚠️ GPS Accuracy Degraded (±' + Math.round(minAcc) + ' m > 50 m)</div>' +
          '<div style="font-size:13px;color:var(--muted);margin-top:6px;">All 3 readings exceeded the 50-meter threshold. Please move outdoors with a clear sky view and retry.</div>';
      }
      if (actionsEl) {
        actionsEl.innerHTML = '<button type="button" class="btn" data-loc-act="start-gps" data-cust-id="' + esc(cust.id) + '">Retry Capture</button>' +
          '<button type="button" class="btn alt" data-nb="close">Cancel</button>';
      }
      return;
    }

    valid.sort(function(a, b) { return a.acc - b.acc; });
    var best = valid[0];
    var latFmt = Number(best.lat).toFixed(6);
    var lngFmt = Number(best.lng).toFixed(6);
    var accFmt = Number(best.acc).toFixed(1);

    if (statusEl) {
      statusEl.innerHTML = '<div style="text-align:left;background:#f7faf8;border:1px solid #b7eb8f;padding:14px;border-radius:10px;">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">' +
          '<span class="pill p-green">±' + accFmt + ' m (High Precision)</span>' +
          '<a href="https://www.google.com/maps?q=' + latFmt + ',' + lngFmt + '" target="_blank" rel="noopener" class="btn alt sm">🗺️ Preview on Google Maps</a>' +
        '</div>' +
        '<div style="font-size:14px;color:#333;"><b>Latitude:</b> ' + latFmt + '<br><b>Longitude:</b> ' + lngFmt + '</div>' +
        '<div style="font-size:12px;color:var(--muted);margin-top:6px;">Captured across 3 GPS fixes. Meets &le; 50 m accuracy requirement.</div>' +
      '</div>';
    }
    if (actionsEl) {
      actionsEl.innerHTML = '<button type="button" class="btn green" data-loc-act="confirm-gps" data-cust-id="' + esc(cust.id) + '" data-lat="' + latFmt + '" data-lng="' + lngFmt + '" data-acc="' + accFmt + '">Confirm & Save Coordinates</button>' +
        '<button type="button" class="btn alt" data-nb="close">Cancel</button>';
    }
  });
}

/* ---------- (8B) IndexedDB Online-First Outbox, Cache & Sync ---------- */
var DB_NAME = 'larven_outbox_v1';
var DB_VERSION = 2;

var OutboxDB = {
  db: null,
  state: {
    pendingItems: [],
    attentionItems: [],
    cachedTrips: {},
    session: null
  },
  _initPromise: null,

  init: function() {
    if (this._initPromise) return this._initPromise;
    var self = this;
    this._initPromise = new Promise(function(resolve) {
      if (typeof indexedDB === 'undefined') {
        self._loadFallback();
        return resolve(self);
      }
      try {
        var req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = function(e) {
          var db = e.target.result;
          if (!db.objectStoreNames.contains('outbox')) {
            var outStore = db.createObjectStore('outbox', { keyPath: 'id' });
            outStore.createIndex('trip_id', 'trip_id', { unique: false });
            outStore.createIndex('status', 'status', { unique: false });
            outStore.createIndex('created_at', 'created_at', { unique: false });
          }
          if (!db.objectStoreNames.contains('trip_cache')) {
            db.createObjectStore('trip_cache', { keyPath: 'trip_id' });
          }
          if (!db.objectStoreNames.contains('needs_attention')) {
            db.createObjectStore('needs_attention', { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains('session')) {
            db.createObjectStore('session', { keyPath: 'key' });
          }
        };
        req.onsuccess = function(e) {
          self.db = e.target.result;
          self._refreshState().then(function() {
            resolve(self);
          });
        };
        req.onerror = function() {
          self._loadFallback();
          resolve(self);
        };
      } catch(err) {
        self._loadFallback();
        resolve(self);
      }
    });
    return this._initPromise;
  },

  _loadFallback: function() {
    try {
      var rawOutbox = localStorage.getItem('larven_idb_outbox');
      this.state.pendingItems = rawOutbox ? JSON.parse(rawOutbox) : [];
      var rawAtt = localStorage.getItem('larven_idb_attention');
      this.state.attentionItems = rawAtt ? JSON.parse(rawAtt) : [];
      var rawCache = localStorage.getItem('larven_idb_trip_cache');
      this.state.cachedTrips = rawCache ? JSON.parse(rawCache) : {};
    } catch(e) {
      this.state.pendingItems = [];
      this.state.attentionItems = [];
      this.state.cachedTrips = {};
    }
  },

  _saveFallback: function() {
    try {
      localStorage.setItem('larven_idb_outbox', JSON.stringify(this.state.pendingItems));
      localStorage.setItem('larven_idb_attention', JSON.stringify(this.state.attentionItems));
      localStorage.setItem('larven_idb_trip_cache', JSON.stringify(this.state.cachedTrips));
    } catch(e) {}
  },

  _refreshState: function() {
    var self = this;
    if (!this.db) {
      this._loadFallback();
      return Promise.resolve();
    }
    return new Promise(function(resolve) {
      try {
        var stores = ['outbox', 'needs_attention', 'trip_cache'];
        if (self.db.objectStoreNames.contains('session')) stores.push('session');
        var tx = self.db.transaction(stores, 'readonly');
        var outStore = tx.objectStore('outbox');
        var attStore = tx.objectStore('needs_attention');
        var cacheStore = tx.objectStore('trip_cache');

        var getAllOut = outStore.getAll();
        getAllOut.onsuccess = function() {
          self.state.pendingItems = (getAllOut.result || []).filter(function(x) { return x.status === 'pending'; });
        };

        var getAllAtt = attStore.getAll();
        getAllAtt.onsuccess = function() {
          self.state.attentionItems = getAllAtt.result || [];
        };

        var getAllCache = cacheStore.getAll();
        getAllCache.onsuccess = function() {
          var m = {};
          (getAllCache.result || []).forEach(function(c) { m[c.trip_id] = c; });
          self.state.cachedTrips = m;
        };

        if (self.db.objectStoreNames.contains('session')) {
          var sessionStore = tx.objectStore('session');
          var getSess = sessionStore.get('auth_session');
          getSess.onsuccess = function() {
            self.state.session = getSess.result ? getSess.result.value : null;
            if (self.state.session && !CURRENT_SESSION) {
              setSession(self.state.session);
            }
          };
        }

        tx.oncomplete = function() { resolve(); };
        tx.onerror = function() { resolve(); };
      } catch(e) {
        self._loadFallback();
        resolve();
      }
    });
  },

  enqueue: async function(item) {
    await this.init();
    if (!this.db) {
      var existingIdx = this.state.pendingItems.findIndex(function(x) { return x.id === item.id; });
      if (existingIdx >= 0) this.state.pendingItems[existingIdx] = item;
      else this.state.pendingItems.push(item);
      this._saveFallback();
      return item;
    }
    var self = this;
    return new Promise(function(resolve, reject) {
      try {
        var tx = self.db.transaction(['outbox'], 'readwrite');
        var req = tx.objectStore('outbox').put(item);
        req.onsuccess = function() {
          self._refreshState().then(function() { resolve(item); });
        };
        req.onerror = function(e) { reject(e); };
      } catch(e) {
        self.state.pendingItems.push(item);
        self._saveFallback();
        resolve(item);
      }
    });
  },

  update: async function(item) {
    await this.init();
    if (!this.db) {
      var idx = this.state.pendingItems.findIndex(function(x) { return x.id === item.id; });
      if (idx >= 0) this.state.pendingItems[idx] = item;
      this._saveFallback();
      return item;
    }
    var self = this;
    return new Promise(function(resolve, reject) {
      try {
        var tx = self.db.transaction(['outbox'], 'readwrite');
        var req = tx.objectStore('outbox').put(item);
        req.onsuccess = function() {
          self._refreshState().then(function() { resolve(item); });
        };
        req.onerror = function(e) { reject(e); };
      } catch(e) {
        var idx2 = self.state.pendingItems.findIndex(function(x) { return x.id === item.id; });
        if (idx2 >= 0) self.state.pendingItems[idx2] = item;
        self._saveFallback();
        resolve(item);
      }
    });
  },

  remove: async function(id) {
    await this.init();
    if (!this.db) {
      this.state.pendingItems = this.state.pendingItems.filter(function(x) { return x.id !== id; });
      this._saveFallback();
      return;
    }
    var self = this;
    return new Promise(function(resolve, reject) {
      try {
        var tx = self.db.transaction(['outbox'], 'readwrite');
        var req = tx.objectStore('outbox').delete(id);
        req.onsuccess = function() {
          self._refreshState().then(resolve);
        };
        req.onerror = function(e) { reject(e); };
      } catch(e) {
        self.state.pendingItems = self.state.pendingItems.filter(function(x) { return x.id !== id; });
        self._saveFallback();
        resolve();
      }
    });
  },

  getAllPending: async function() {
    await this.init();
    await this._refreshState();
    return this.state.pendingItems.slice();
  },

  cacheTrip: async function(tripData) {
    await this.init();
    if (!this.db) {
      this.state.cachedTrips[tripData.trip_id] = tripData;
      this._saveFallback();
      return tripData;
    }
    var self = this;
    return new Promise(function(resolve, reject) {
      try {
        var tx = self.db.transaction(['trip_cache'], 'readwrite');
        var req = tx.objectStore('trip_cache').put(tripData);
        req.onsuccess = function() {
          self._refreshState().then(function() { resolve(tripData); });
        };
        req.onerror = function(e) { reject(e); };
      } catch(e) {
        self.state.cachedTrips[tripData.trip_id] = tripData;
        self._saveFallback();
        resolve(tripData);
      }
    });
  },

  getCachedTrip: async function(tripId) {
    await this.init();
    return this.state.cachedTrips[tripId] || null;
  },

  addAttention: async function(item) {
    await this.init();
    if (!this.db) {
      var idx = this.state.attentionItems.findIndex(function(x) { return x.id === item.id; });
      if (idx >= 0) this.state.attentionItems[idx] = item;
      else this.state.attentionItems.push(item);
      this._saveFallback();
      return item;
    }
    var self = this;
    return new Promise(function(resolve, reject) {
      try {
        var tx = self.db.transaction(['needs_attention'], 'readwrite');
        var req = tx.objectStore('needs_attention').put(item);
        req.onsuccess = function() {
          self._refreshState().then(function() { resolve(item); });
        };
        req.onerror = function(e) { reject(e); };
      } catch(e) {
        self.state.attentionItems.push(item);
        self._saveFallback();
        resolve(item);
      }
    });
  },

  getAttention: async function() {
    await this.init();
    await this._refreshState();
    return this.state.attentionItems.slice();
  },

  removeAttention: async function(id) {
    await this.init();
    if (!this.db) {
      this.state.attentionItems = this.state.attentionItems.filter(function(x) { return x.id !== id; });
      this._saveFallback();
      return;
    }
    var self = this;
    return new Promise(function(resolve, reject) {
      try {
        var tx = self.db.transaction(['needs_attention'], 'readwrite');
        var req = tx.objectStore('needs_attention').delete(id);
        req.onsuccess = function() {
          self._refreshState().then(resolve);
        };
        req.onerror = function(e) { reject(e); };
      } catch(e) {
        self.state.attentionItems = this.state.attentionItems.filter(function(x) { return x.id !== id; });
        self._saveFallback();
        resolve();
      }
    });
  },

  retryAttention: async function(id) {
    var attItem = this.state.attentionItems.find(function(x) { return x.id === id; });
    if (!attItem) return;
    await this.removeAttention(id);
    var outboxItem = {
      id: attItem.id,
      idempotency_key: attItem.id,
      action: attItem.action,
      endpoint: '/api/rpc/' + attItem.action,
      trip_id: attItem.trip_id,
      stop_id: attItem.stop_id,
      payload: attItem.payload,
      provisional_receipt: attItem.provisional_receipt,
      status: 'pending',
      created_at: new Date().toISOString(),
      attempts: 0,
      last_error: null
    };
    await this.enqueue(outboxItem);
  },

  setSession: async function(sess) {
    this.state.session = sess;
    await this.init();
    if (!this.db || !this.db.objectStoreNames.contains('session')) return sess;
    var self = this;
    return new Promise(function(resolve) {
      try {
        var tx = self.db.transaction(['session'], 'readwrite');
        var store = tx.objectStore('session');
        if (sess) {
          store.put({ key: 'auth_session', value: sess });
        } else {
          store.delete('auth_session');
        }
        tx.oncomplete = function() { resolve(sess); };
        tx.onerror = function() { resolve(sess); };
      } catch(e) { resolve(sess); }
    });
  },

  getSession: async function() {
    if (this.state.session !== undefined && this.state.session !== null) {
      return this.state.session;
    }
    await this.init();
    if (!this.db || !this.db.objectStoreNames.contains('session')) return this.state.session || null;
    var self = this;
    return new Promise(function(resolve) {
      try {
        var tx = self.db.transaction(['session'], 'readonly');
        var req = tx.objectStore('session').get('auth_session');
        req.onsuccess = function() {
          var res = req.result ? req.result.value : null;
          self.state.session = res;
          resolve(res);
        };
        req.onerror = function() { resolve(null); };
      } catch(e) { resolve(null); }
    });
  },

  clearSession: async function() {
    this.state.session = null;
    await this.init();
    if (!this.db || !this.db.objectStoreNames.contains('session')) return;
    var self = this;
    return new Promise(function(resolve) {
      try {
        var tx = self.db.transaction(['session'], 'readwrite');
        tx.objectStore('session').delete('auth_session');
        tx.oncomplete = function() { resolve(); };
        tx.onerror = function() { resolve(); };
      } catch(e) { resolve(); }
    });
  }
};
OutboxDB.init();

function replaceProvisionalReceipt(provId, officialNo, tripId, stopId) {
  if (!provId || !officialNo) return;
  (S.bills || []).forEach(function(b) {
    if (b.provisional_id === provId || b.id === provId) {
      b.id = officialNo;
      b.official_invoice_no = officialNo;
      b.provisional_id = null;
    }
  });
  (S.deliveries || []).forEach(function(d) {
    if (d.provisional_id === provId || d.bill_id === provId) {
      d.bill_id = officialNo;
      d.official_invoice_no = officialNo;
      d.provisional_id = null;
    }
  });
  (S.payments || []).forEach(function(p) {
    if (p.bill === provId) {
      p.bill = officialNo;
    }
  });
  (S.tripStops || []).forEach(function(s) {
    if ((stopId && s.id === stopId) || s.provisional_receipt === provId) {
      s.provisional_receipt = null;
      s.official_invoice_no = officialNo;
    }
  });
  save();
}

function cacheTripAtStart(trip) {
  if (!trip) return;
  var stops = (S.tripStops || []).filter(function(s) { return s.trip_id === trip.id; });
  var custIds = {};
  stops.forEach(function(s) { custIds[s.customer_id] = true; });

  var custs = (S.customers || []).filter(function(c) { return custIds[c.id]; }).map(function(c) {
    var custBills = (S.bills || []).filter(function(b) { return b.cust === c.id; });
    var lastBill = custBills[custBills.length - 1];
    var lastRates = {};
    if (lastBill && Array.isArray(lastBill.items)) {
      lastBill.items.forEach(function(it) {
        lastRates[it.p] = it.r;
      });
    }
    stops.filter(function(s) { return s.customer_id === c.id; }).forEach(function(cs) {
      if (Array.isArray(cs.items)) {
        cs.items.forEach(function(it) {
          if (it.rate != null) lastRates[it.product_name] = it.rate;
        });
      }
    });
    return Object.assign({}, c, { last_rates: lastRates });
  });

  var prods = (S.settings && S.settings.products) || defProducts();

  var cacheData = {
    trip_id: trip.id,
    cached_at: new Date().toISOString(),
    trip: JSON.parse(JSON.stringify(trip)),
    stops: JSON.parse(JSON.stringify(stops)),
    customers: custs,
    products: JSON.parse(JSON.stringify(prods))
  };

  if (OutboxDB && OutboxDB.state && OutboxDB.state.cachedTrips) {
    OutboxDB.state.cachedTrips[cacheData.trip_id] = cacheData;
  }
  OutboxDB.cacheTrip(cacheData);
  return cacheData;
}

async function onlineFirstWrite(action, endpoint, payload, options) {
  options = options || {};
  var idemKey = (payload && (payload.p_idempotency_key || payload.idempotency_key)) ||
    ('idem_' + action + '_' + (options.refId || options.tripId || 'req') + '_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8));

  if (payload) {
    payload.p_idempotency_key = idemKey;
    payload.idempotency_key = idemKey;
  }

  var provReceipt = options.provisionalReceipt;
  if (action === 'deliver_stop' && !provReceipt) {
    provReceipt = 'PROV-' + (options.tripId || 'DEL') + '-' + Math.random().toString(36).substring(2, 7).toUpperCase();
    if (payload) {
      payload.p_provisional_id = provReceipt;
    }
  }

  var isOffline = (typeof navigator !== 'undefined' && navigator.onLine === false);

  if (!isOffline) {
    try {
      var controller = (typeof AbortController !== 'undefined') ? new AbortController() : null;
      var timeoutId = controller ? setTimeout(function() { controller.abort(); }, 5000) : null;
      var sess = getSession();
      var headers = { 'content-type': 'application/json' };
      if (sess && sess.token) {
        headers['authorization'] = 'Bearer ' + sess.token;
      }

      var res = await fetch(endpoint, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(payload),
        signal: controller ? controller.signal : undefined
      });

      if (timeoutId) clearTimeout(timeoutId);

      var resData = await res.json().catch(function() { return {}; });

      if (res.status >= 400 && res.status < 500) {
        var err = new Error(resData.message || resData.error || ('Business error ' + res.status));
        err.status = res.status;
        err.data = resData;
        throw err;
      }

      if (!res.ok) {
        throw new Error('Server returned ' + res.status);
      }

      return {
        ok: true,
        online: true,
        data: resData,
        official_invoice_no: resData.official_invoice_no || resData.bill_id,
        provisional_receipt: provReceipt
      };
    } catch (netOrTimeoutErr) {
      if (netOrTimeoutErr.status && netOrTimeoutErr.status >= 400 && netOrTimeoutErr.status < 500) {
        throw netOrTimeoutErr;
      }
      console.warn('onlineFirstWrite fetch failed on ' + action + ', queuing in Outbox:', netOrTimeoutErr.message || netOrTimeoutErr);
    }
  }

  var outboxItem = {
    id: idemKey,
    idempotency_key: idemKey,
    action: action,
    endpoint: endpoint,
    trip_id: options.tripId || '',
    stop_id: options.stopId || '',
    payload: payload,
    provisional_receipt: provReceipt || null,
    status: 'pending',
    created_at: new Date().toISOString(),
    attempts: 0,
    last_error: null
  };

  await OutboxDB.enqueue(outboxItem);

  return {
    ok: true,
    online: false,
    queued: true,
    status: 'pending',
    idempotency_key: idemKey,
    provisional_receipt: provReceipt
  };
}

var IS_SYNCING = false;
async function syncOutbox() {
  if (IS_SYNCING) return;
  IS_SYNCING = true;
  try {
    var pending = await OutboxDB.getAllPending();
    if (!pending || !pending.length) {
      IS_SYNCING = false;
      return;
    }

    // Sort in per-trip FIFO order: group by trip_id, then sort by created_at
    pending.sort(function(a, b) {
      if (a.trip_id !== b.trip_id) {
        return a.trip_id.localeCompare(b.trip_id);
      }
      return (new Date(a.created_at || 0)) - (new Date(b.created_at || 0));
    });

    var sess = getSession();
    if (!sess || !sess.token) {
      console.warn('Sync paused: No active auth session. Will resume upon login.');
      IS_SYNCING = false;
      return;
    }

    for (var i = 0; i < pending.length; i++) {
      var item = pending[i];
      try {
        var headers = {
          'content-type': 'application/json',
          'authorization': 'Bearer ' + sess.token
        };

        var res = await fetch(item.endpoint, {
          method: 'POST',
          headers: headers,
          body: JSON.stringify(item.payload)
        });

        if (res.status === 401) {
          console.warn('Sync paused: Session expired (401). Leaving queue intact for re-login.');
          break;
        }

        var resData = await res.json().catch(function() { return {}; });

        if (res.status >= 400 && res.status < 500) {
          console.warn('Server rejected outbox item ' + item.id + ':', resData);
          await OutboxDB.remove(item.id);
          await OutboxDB.addAttention({
            id: item.id,
            action: item.action,
            trip_id: item.trip_id,
            stop_id: item.stop_id,
            provisional_receipt: item.provisional_receipt,
            error_code: resData.error || ('http_' + res.status),
            reason: resData.message || resData.error || ('Rejected by server (HTTP ' + res.status + ')'),
            timestamp: new Date().toISOString(),
            payload: item.payload
          });
          continue;
        }

        if (res.ok) {
          if (item.action === 'deliver_stop') {
            var officialNo = resData.official_invoice_no || resData.bill_id;
            if (officialNo && item.provisional_receipt) {
              replaceProvisionalReceipt(item.provisional_receipt, officialNo, item.trip_id, item.stop_id);
            }
          }
          await OutboxDB.remove(item.id);
        }
      } catch (netErr) {
        console.warn('Network error during outbox sync on ' + item.id + ':', netErr);
        item.attempts = (item.attempts || 0) + 1;
        item.last_error = netErr.message;
        await OutboxDB.update(item);
        break;
      }
    }
  } finally {
    IS_SYNCING = false;
  }
}

if (typeof window !== 'undefined' && window.addEventListener) {
  window.addEventListener('online', function() {
    toast('Network restored! Syncing offline outbox...');
    syncOutbox().then(function() {
      if (location.hash === '#my-route' || location.hash === '#dashboard') {
        render();
      }
    });
  });
}

/* ---------- Supabase REST Read Helper & Employee Route Loader (Slice 1) ---------- */
async function sbGet(table, query) {
  var sess = getSession();
  var token = sess && sess.session && sess.session.access_token;
  if (!token) return null;
  var url = '/api/rest/' + encodeURIComponent(table) + (query ? (query.startsWith('?') ? query : '?' + query) : '');
  try {
    var res = await fetch(url, {
      method: 'GET',
      headers: {
        'content-type': 'application/json',
        'authorization': 'Bearer ' + token
      }
    });
    if (!res.ok) return null;
    return await res.json().catch(function() { return null; });
  } catch(e) {
    return null;
  }
}

async function loadMyRouteFromSupabase() {
  if (CURRENT_ROLE !== 'employee') return null;
  var myEmpId = CURRENT_PROFILE && CURRENT_PROFILE.employee_id;
  if (!myEmpId) return null;

  var sess = getSession();
  var token = sess && sess.session && sess.session.access_token;
  if (!token) return null;

  // If offline, attempt loading cached trip from OutboxDB
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    if (typeof OutboxDB !== 'undefined') {
      if (typeof OutboxDB.init === 'function') await OutboxDB.init();
      if (OutboxDB.state && OutboxDB.state.cachedTrips) {
        var cachedKeys = Object.keys(OutboxDB.state.cachedTrips);
        for (var i = 0; i < cachedKeys.length; i++) {
          var cData = OutboxDB.state.cachedTrips[cachedKeys[i]];
          if (cData && cData.trip && (cData.trip.driver_employee_id === myEmpId || cData.trip.driver_id === myEmpId)) {
            if (!S.trips || !S.trips.length) S.trips = [cData.trip];
            if (!S.tripStops || !S.tripStops.length) S.tripStops = cData.stops || [];
            return cData;
          }
        }
      }
    }
    return null;
  }

  try {
    // 1. Fetch caller's open trip from Supabase (RLS-scoped: driver_id = current_employee_id())
    // Status in planned, loading, on_route (not completed, settled, or cancelled)
    var trips = await sbGet('trips', 'status=in.(planned,loading,on_route)&order=trip_date.desc,created_at.desc&limit=1');
    if (!Array.isArray(trips) || !trips.length) {
      if (CURRENT_ROLE === 'employee') {
        S.trips = [];
        S.tripStops = [];
      } else {
        S.trips = (S.trips || []).filter(function(t) {
          return t.driver_employee_id !== myEmpId && t.driver_id !== myEmpId;
        });
      }
      return null;
    }

    var rawTrip = trips[0];
    var tripId = rawTrip.id;

    // 2. Fetch trip stops for this trip (RLS-scoped: customer on caller's trip)
    var rawStops = await sbGet('trip_stops', 'trip_id=eq.' + encodeURIComponent(tripId) + '&order=sequence_no.asc');
    if (!Array.isArray(rawStops)) rawStops = [];

    // 3. Fetch stop items for these stops (RLS-scoped)
    var stopIds = rawStops.map(function(s) { return s.id; }).filter(Boolean);
    var rawItems = [];
    if (stopIds.length > 0) {
      rawItems = await sbGet('trip_stop_items', 'trip_stop_id=in.(' + stopIds.map(encodeURIComponent).join(',') + ')');
      if (!Array.isArray(rawItems)) rawItems = [];
    }

    // 4. Fetch customers on this open trip (RLS-scoped via is_customer_on_my_open_trip)
    var rawCusts = await sbGet('customers', 'select=*');
    if (!Array.isArray(rawCusts)) rawCusts = [];

    var itemsByStop = {};
    rawItems.forEach(function(it) {
      if (!itemsByStop[it.trip_stop_id]) itemsByStop[it.trip_stop_id] = [];
      itemsByStop[it.trip_stop_id].push({
        id: it.id,
        product_name: it.product_name,
        cases: +it.planned_cases || 0,
        bottles: +it.planned_bottles || 0,
        rate: +it.rate_per_case || 0,
        case_size: +it.case_size || 1,
        delivered_cases: +it.delivered_cases || 0,
        delivered_bottles: +it.delivered_bottles || 0
      });
    });

    var loadTotals = {};
    rawItems.forEach(function(it) {
      var pn = it.product_name;
      if (!loadTotals[pn]) loadTotals[pn] = { product_name: pn, cases: 0, bottles: 0 };
      loadTotals[pn].cases += (+it.planned_cases || 0);
      loadTotals[pn].bottles += (+it.planned_bottles || 0);
    });

    var tripObj = {
      id: rawTrip.id,
      trip_no: rawTrip.id,
      vehicle_id: rawTrip.vehicle_id,
      driver_id: rawTrip.driver_id,
      driver_employee_id: rawTrip.driver_id,
      trip_date: rawTrip.trip_date,
      status: rawTrip.status,
      start_odometer: rawTrip.start_odometer != null ? rawTrip.start_odometer : rawTrip.start_km,
      end_odometer: rawTrip.end_odometer != null ? rawTrip.end_odometer : rawTrip.end_km,
      loaded_at: rawTrip.loaded_at,
      closed_at: rawTrip.closed_at,
      notes: rawTrip.notes,
      load_items: Object.values(loadTotals)
    };

    var stopObjs = rawStops.map(function(s) {
      return {
        id: s.id,
        trip_id: s.trip_id,
        stop_sequence: s.sequence_no,
        customer_id: s.customer_id,
        order_id: s.order_id,
        planned_cases: +s.planned_cases || 0,
        status: s.result || 'pending',
        arrived_at: s.arrival_time,
        arrival_lat: s.arrival_lat,
        arrival_lng: s.arrival_lng,
        distance_meters: s.distance_m,
        completed_at: s.delivered_at,
        skip_reason: s.skip_reason,
        items: itemsByStop[s.id] || []
      };
    });

    // Update in-memory collections
    if (CURRENT_ROLE === 'employee') {
      S.trips = [tripObj];
      S.tripStops = stopObjs;
    } else {
      var existingTripIdx = (S.trips || []).findIndex(function(t) { return t.id === tripObj.id; });
      if (existingTripIdx >= 0) {
        S.trips[existingTripIdx] = tripObj;
      } else {
        S.trips.unshift(tripObj);
      }
      S.tripStops = (S.tripStops || []).filter(function(s) { return s.trip_id !== tripObj.id; }).concat(stopObjs);
    }

    // Merge RLS-scoped customers into S.customers
    rawCusts.forEach(function(c) {
      var exIdx = (S.customers || []).findIndex(function(x) { return x.id === c.id; });
      var mappedCust = {
        id: c.id,
        name: c.name,
        phone: c.phone,
        area: c.area,
        address: c.address,
        lat: c.lat,
        lng: c.lng,
        accuracy_m: c.accuracy_m,
        credit_limit: c.credit_limit,
        balance: c.balance
      };
      if (exIdx >= 0) {
        Object.assign(S.customers[exIdx], mappedCust);
      } else {
        S.customers.push(mappedCust);
      }
    });

    // Cache trip at start for offline resilience per Decision 3
    if (typeof cacheTripAtStart === 'function') {
      try { await cacheTripAtStart(tripObj); } catch(e) {}
    }

    return { trip: tripObj, stops: stopObjs, customers: rawCusts };
  } catch (err) {
    console.warn('Could not load employee route from Supabase:', err);
    return null;
  }
}

/* ---------- (1) Employee "My Route" (#my-route) ---------- */
function myRoutePage() {
  var trips = (S.trips || []).slice();
  var trip = null;
  if (CURRENT_ROLE === 'employee') {
    var myEmpId = CURRENT_PROFILE && (CURRENT_PROFILE.employee_id || CURRENT_PROFILE.id);
    if (myEmpId) {
      trip = trips.find(function(t) {
        return (t.driver_employee_id === myEmpId || t.driver_id === myEmpId) &&
               t.status !== 'settled' && t.status !== 'cancelled';
      }) || null;
    }
  } else {
    var curTripId = window.__SELECTED_ROUTE_TRIP_ID;
    trip = (curTripId && trips.find(function(t) { return t.id === curTripId; })) ||
           trips.find(function(t) { return t.status !== 'settled'; }) ||
           trips[trips.length - 1];
  }

  // Needs Attention Banner (if server rejected any offline transactions)
  var attentionList = (OutboxDB && OutboxDB.state && OutboxDB.state.attentionItems) || [];
  var attentionHtml = '';
  if (attentionList.length > 0) {
    attentionHtml = '<div class="card" style="margin-bottom:14px;padding:14px;border-left:4px solid var(--red);background:#fff5f5;">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">' +
        '<h3 style="margin:0;color:var(--red);font-size:16px;">⚠️ Needs Attention (' + attentionList.length + ' Items)</h3>' +
      '</div>' +
      '<p class="pdesc" style="margin:0 0 10px;color:var(--fg);font-size:13px;">The following offline transactions were rejected by the server and require attention:</p>' +
      '<div style="display:grid;gap:8px;">' +
      attentionList.map(function(att) {
        var custNameStr = (att.payload && att.payload.p_customer_id) ? custName(att.payload.p_customer_id) : (att.trip_id || 'Action');
        return '<div style="background:#fff;border:1px solid #fecaca;border-radius:6px;padding:10px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">' +
          '<div>' +
            '<div style="font-weight:700;font-size:14px;color:#991b1b;">' + esc(att.action) + ' · ' + esc(custNameStr) + (att.provisional_receipt ? ' (' + esc(att.provisional_receipt) + ')' : '') + '</div>' +
            '<div style="font-size:12px;color:#b91c1c;margin-top:2px;">Reason: <b>' + esc(att.reason) + '</b></div>' +
          '</div>' +
          '<div style="display:flex;gap:6px;">' +
            '<button type="button" class="btn sm" data-route-act="retry-attention" data-att-id="' + esc(att.id) + '">Retry 🔄</button>' +
            '<button type="button" class="btn alt sm" data-route-act="dismiss-attention" data-att-id="' + esc(att.id) + '">Dismiss ✕</button>' +
          '</div>' +
        '</div>';
      }).join('') +
      '</div>' +
    '</div>';
  }

  if (!trip) {
    return head('My Delivery Route / నా రూట్') + attentionHtml +
      '<div class="card tw"><div class="empty">No active delivery trip assigned for today.<br><br>' +
      (CURRENT_ROLE !== 'employee' ? '<a href="#route-planner" class="btn alt sm">Go to Route Planner →</a>' : '<small class="muted">Check with manager for trip assignment.</small>') +
      '</div></div>';
  }

  var stops = (S.tripStops || []).filter(function(s) { return s.trip_id === trip.id; }).sort(function(a, b) { return a.stop_sequence - b.stop_sequence; });
  var deliveredCount = stops.filter(function(s) { return s.status === 'delivered'; }).length;
  var pendingCount = stops.filter(function(s) { return s.status === 'pending' || s.status === 'arrived'; }).length;
  var skippedCount = stops.filter(function(s) { return s.status === 'skipped'; }).length;

  var statusPill = trip.status === 'planned' || trip.status === 'loading'
    ? '<span class="pill p-amber">Loading & Verification</span>'
    : trip.status === 'on_route'
    ? '<span class="pill p-green">On Route / డెలివరీలో ఉంది</span>'
    : trip.status === 'completed'
    ? '<span class="pill p-blue">Completed / డెలివరీలు పూర్తయ్యాయి</span>'
    : '<span class="pill">Settled / క్లోజ్ చేయబడింది</span>';

  var tripSelector = '';
  if (CURRENT_ROLE !== 'employee' && trips.length > 1) {
    tripSelector = '<div style="margin-bottom:12px;"><label style="font-size:12px;font-weight:700;color:var(--muted);display:block;margin-bottom:4px;">Select Vehicle Trip:</label>' +
      '<select id="myroute-trip-select" class="fld-in" style="max-width:320px;">' +
      trips.map(function(t) {
        return '<option value="' + esc(t.id) + '"' + (t.id === trip.id ? ' selected' : '') + '>' + esc(t.trip_no || t.id) + ' · ' + esc(getVehNo(t.vehicle_id)) + ' (' + esc(t.status) + ')</option>';
      }).join('') +
      '</select></div>';
  }

  var html = head('My Delivery Route / నా రూట్') + tripSelector + attentionHtml;

  // Pending Outbox Sync Banner
  var pendingList = (OutboxDB && OutboxDB.state && OutboxDB.state.pendingItems) || [];
  if (pendingList.length > 0) {
    html += '<div class="card" style="margin-bottom:14px;padding:12px 16px;border-left:4px solid var(--amber);background:#fffdf0;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">' +
      '<div>' +
        '<b style="color:#b45309;font-size:15px;">⏳ ' + pendingList.length + ' Offline Transactions Pending Sync</b>' +
        '<div style="font-size:12px;color:var(--muted);margin-top:2px;">Saved locally in IndexedDB Outbox. Will auto-sync when network is restored.</div>' +
      '</div>' +
      '<div>' +
        '<button type="button" class="btn sm" data-route-act="sync-outbox">Sync Now 🔄</button>' +
      '</div>' +
    '</div>';
  }

  // Header Trip Card
  html += '<div class="card" style="margin-bottom:14px;padding:16px;">' +
    '<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">' +
      '<div>' +
        '<h3 style="margin:0 0 4px;font-size:18px;">Trip #' + esc(trip.trip_no || trip.id) + ' · ' + esc(getVehNo(trip.vehicle_id)) + '</h3>' +
        '<div style="font-size:13px;color:var(--muted);">' +
          'Driver: <b>' + esc(empName(trip.driver_employee_id)) + '</b> · Date: <b>' + esc(trip.trip_date) + '</b>' +
          (trip.start_odometer ? ' · Start KM: <b>' + num(trip.start_odometer) + '</b>' : '') +
          (trip.end_odometer ? ' · End KM: <b>' + num(trip.end_odometer) + '</b>' : '') +
        '</div>' +
      '</div>' +
      '<div>' + statusPill + '</div>' +
    '</div>' +
  '</div>';

  // Section 1: Load Checklist (if planned or loading)
  if (trip.status === 'planned' || trip.status === 'loading') {
    var loadItems = trip.load_items || [];
    var totalLoadedCases = sum(loadItems, function(x) { return +x.cases || 0; });

    html += '<div class="card" style="margin-bottom:16px;padding:16px;">' +
      '<h3 style="margin-top:0;">1. Stock Loading & Odometer Checklist / లోడింగ్ సరిచూసుకోండి</h3>' +
      '<p class="pdesc">Verify loaded stock counts before departure. Enter vehicle odometer reading to start route dispatch.</p>' +
      '<table style="width:100%;margin:12px 0;border-collapse:collapse;">' +
        '<thead><tr style="border-bottom:2px solid var(--line);text-align:left;">' +
          '<th style="padding:8px 4px;">Product SKU</th>' +
          '<th style="padding:8px 4px;">Loaded Cases</th>' +
          '<th style="padding:8px 4px;">Bottles Total</th>' +
        '</tr></thead>' +
        '<tbody>' +
        loadItems.map(function(li) {
          return '<tr style="border-bottom:1px solid var(--line);">' +
            '<td style="padding:8px 4px;font-weight:600;">' + esc(li.product_name) + '</td>' +
            '<td style="padding:8px 4px;"><b>' + num(li.cases) + '</b> cases</td>' +
            '<td style="padding:8px 4px;color:var(--muted);">' + num(li.bottles) + ' btl</td>' +
          '</tr>';
        }).join('') +
        '<tr style="font-weight:800;background:var(--surface);"><td style="padding:8px 4px;">Total Vehicle Load</td><td style="padding:8px 4px;color:var(--brand);">' + num(totalLoadedCases) + ' cases</td><td style="padding:8px 4px;"></td></tr>' +
        '</tbody>' +
      '</table>' +
      '<div style="display:flex;gap:12px;align-items:flex-end;flex-wrap:wrap;margin-top:14px;">' +
        '<div class="fld" style="margin:0;min-width:200px;">' +
          '<label for="route-start-km">Vehicle Start Odometer (KM) *</label>' +
          '<input type="number" id="route-start-km" value="' + esc(trip.start_odometer || '') + '" placeholder="e.g. 45210" min="0" required>' +
        '</div>' +
        '<button type="button" class="btn green" data-route-act="confirm-loading" data-trip-id="' + esc(trip.id) + '">Confirm Loading & Start Trip 🚚</button>' +
      '</div>' +
    '</div>';
  }

  // Section 2: Stop Itinerary
  html += '<div style="margin-bottom:12px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">' +
    '<h3 style="margin:0;">2. Delivery Itinerary (' + stops.length + ' Stops)</h3>' +
    '<div class="gchips" style="margin:0;">' +
      '<span class="chip on">Total <b>' + stops.length + '</b></span>' +
      '<span class="chip">Delivered <b>' + deliveredCount + '</b></span>' +
      '<span class="chip">Pending <b>' + pendingCount + '</b></span>' +
      (skippedCount ? '<span class="chip">Skipped <b>' + skippedCount + '</b></span>' : '') +
    '</div>' +
  '</div>';

  if (!stops.length) {
    html += '<div class="card tw"><div class="empty">No stops added to this trip yet.</div></div>';
  } else {
    html += '<div style="display:grid;gap:12px;">';
    stops.forEach(function(s) {
      var cust = (S.customers || []).find(function(c) { return c.id === s.customer_id; }) || {};
      var itemsText = (s.items || []).map(function(it) {
        return num(it.cases || it.quantity_cases || 1) + ' × ' + esc(it.product_name);
      }).join(', ') || (num(s.planned_cases || 0) + ' cases');

      var stopBadge = '';
      if (s.status === 'delivered') {
        if (s.provisional_receipt) {
          stopBadge = '<span class="pill p-amber">Delivered (Pending Sync) ⏳</span>';
        } else {
          stopBadge = '<span class="pill p-green">Delivered 📦</span>';
        }
      } else if (s.status === 'arrived') {
        stopBadge = '<span class="pill p-blue">Arrived at Location 🏁</span>';
      } else if (s.status === 'skipped') {
        stopBadge = '<span class="pill">Skipped (' + esc(s.skip_reason || '') + ')</span>';
      } else {
        stopBadge = '<span class="pill p-amber">Pending Stop</span>';
      }

      var navBtn = '';
      if (cust.lat && cust.lng) {
        navBtn = '<a href="https://www.google.com/maps/dir/?api=1&destination=' + esc(cust.lat) + ',' + esc(cust.lng) + '" target="_blank" rel="noopener" class="btn alt sm">📍 Navigate (Google Maps)</a>';
      } else {
        navBtn = '<button type="button" class="btn alt sm" data-route-act="capture-loc" data-cust-id="' + esc(cust.id) + '">📍 Capture GPS Location</button>';
      }

      var actionBtns = '';
      if (s.status === 'pending') {
        actionBtns = '<button type="button" class="btn sm" data-route-act="arrive-stop" data-stop-id="' + esc(s.id) + '" data-trip-id="' + esc(trip.id) + '">Arrive at Stop 🏁</button>' +
                     '<button type="button" class="btn alt sm" data-route-act="skip-modal" data-stop-id="' + esc(s.id) + '">Skip</button>';
      } else if (s.status === 'arrived') {
        actionBtns = '<button type="button" class="btn green sm" data-route-act="deliver-modal" data-stop-id="' + esc(s.id) + '" data-trip-id="' + esc(trip.id) + '">Deliver & Bill 📦</button>' +
                     '<button type="button" class="btn alt sm" data-route-act="log-order-modal" data-stop-id="' + esc(s.id) + '">Log Future Order 📝</button>' +
                     '<button type="button" class="btn alt sm" data-route-act="skip-modal" data-stop-id="' + esc(s.id) + '">Skip</button>';
      } else if (s.status === 'delivered') {
        var delRec = (S.deliveries || []).find(function(d) { return d.stop_id === s.id; });
        var invoiceStr = s.official_invoice_no || (delRec && delRec.official_invoice_no) || (delRec && delRec.bill_id) || '';
        var isProv = s.provisional_receipt || (delRec && delRec.provisional_id);
        var billLabel = isProv
          ? '<span style="color:#b45309;font-weight:700;">Provisional Receipt: ' + esc(isProv) + ' (Pending Sync ⏳)</span>'
          : '<span style="color:var(--green);font-weight:700;">Official Bill #' + esc(invoiceStr) + ' ✓</span>';

        actionBtns = '<div style="font-size:12px;color:var(--muted);margin-bottom:6px;">' +
          billLabel +
          (delRec ? ' · Total: ' + inr(delRec.amount || 0) + ' · Paid: ' + inr(delRec.paid || 0) + ' (' + esc(delRec.payment_mode || 'Cash') + ')' + (delRec.empty_cans_returned ? ' · Cans: ' + num(delRec.empty_cans_returned) : '') : '') +
          '</div>' +
          '<button type="button" class="btn alt sm" data-route-act="log-order-modal" data-stop-id="' + esc(s.id) + '">Log Future Order 📝</button>';
      }

      html += '<div class="card" style="padding:14px;border-left:4px solid ' + (s.status === 'delivered' ? 'var(--green)' : s.status === 'arrived' ? '#1890ff' : 'var(--brand)') + ';">' +
        '<div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:8px;">' +
          '<div>' +
            '<div style="font-size:12px;font-weight:700;color:var(--muted);text-transform:uppercase;">Stop #' + s.stop_sequence + '</div>' +
            '<div style="font-size:16px;font-weight:800;color:#222;margin:2px 0;">' + esc(cust.name || 'Customer') + '</div>' +
            '<div style="font-size:13px;color:var(--muted);">' +
              (cust.phone ? '<a href="tel:' + esc(cust.phone) + '" class="pill" style="margin-right:6px;">' + esc(cust.phone) + ' 📞</a>' : '') +
              esc(cust.area || '') +
            '</div>' +
            '<div style="font-size:13px;font-weight:600;margin-top:6px;color:var(--brand);">Planned: ' + itemsText + '</div>' +
          '</div>' +
          '<div style="text-align:right;">' +
            '<div>' + stopBadge + '</div>' +
            (s.distance_meters != null ? '<div style="font-size:11px;color:var(--muted);margin-top:4px;">Arrival distance: ' + num(s.distance_meters) + ' m</div>' : '') +
          '</div>' +
        '</div>' +
        '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px;padding-top:10px;border-top:1px solid var(--line);align-items:center;">' +
          navBtn + actionBtns +
        '</div>' +
      '</div>';
    });
    html += '</div>';
  }

  // Section 3: End Trip & Close
  if (trip.status === 'on_route' || trip.status === 'completed') {
    html += '<div class="card" style="margin-top:20px;padding:16px;background:var(--surface);">' +
      '<h3 style="margin-top:0;">3. End Route & Return to Godown / ట్రిప్ ముగింపు</h3>' +
      '<p class="pdesc">When deliveries are completed, enter ending odometer reading to close trip and proceed to Day Close & Cash Settlement.</p>' +
      '<div style="display:flex;gap:12px;align-items:flex-end;flex-wrap:wrap;">' +
        '<div class="fld" style="margin:0;min-width:200px;">' +
          '<label for="route-end-km">Vehicle End Odometer (KM) *</label>' +
          '<input type="number" id="route-end-km" value="' + esc(trip.end_odometer || '') + '" placeholder="e.g. 45285" min="0">' +
        '</div>' +
        '<button type="button" class="btn danger" data-route-act="close-trip" data-trip-id="' + esc(trip.id) + '">End Trip & Proceed to Day Close →</button>' +
      '</div>' +
    '</div>';
  }

  return html;
}

function showDeliverModal(stopId, tripId) {
  var stop = (S.tripStops || []).find(function(s) { return s.id === stopId; });
  if (!stop) return;
  var cust = (S.customers || []).find(function(c) { return c.id === stop.customer_id; }) || {};
  var custBal = outstanding(cust.id);
  var defRate = (S.settings.products && S.settings.products[0] && S.settings.products[0].r) || 40;

  var items = (stop.items && stop.items.length) ? stop.items : [{ product_name: '20 L Can', cases: stop.planned_cases || 5, rate: defRate }];

  openModal(
    '<h3>Deliver & Generate Invoice / డెలివరీ & బిల్</h3>' +
    '<p class="pdesc">Record delivered quantities, manual line item rates, and payment collection for <b>' + esc(cust.name) + '</b>.</p>' +
    '<div style="background:var(--surface);padding:10px 14px;border-radius:8px;margin-bottom:12px;font-size:13px;display:flex;justify-content:space-between;flex-wrap:wrap;">' +
      '<div>Current Dues: <b>' + inr(custBal) + '</b></div>' +
      '<div>Credit Limit: <b>' + (cust.credit_limit ? inr(cust.credit_limit) : 'No limit') + '</b></div>' +
    '</div>' +
    '<div id="del-credit-warn" style="display:none;background:#fff3cd;color:#856404;border:1px solid #ffeeba;padding:10px;border-radius:8px;margin-bottom:12px;font-size:13px;">' +
      '⚠️ <b>Credit Warning:</b> Current outstanding + this bill exceeds customer credit limit. Delivery is still permitted.' +
    '</div>' +
    '<form id="deliver-stop-form" data-stop-id="' + esc(stop.id) + '" data-trip-id="' + esc(tripId) + '">' +
      '<div style="border:1px solid var(--line);border-radius:8px;overflow:hidden;margin-bottom:14px;">' +
        '<table style="width:100%;border-collapse:collapse;" id="del-items-table">' +
          '<thead style="background:var(--surface);text-align:left;font-size:12px;">' +
            '<tr>' +
              '<th style="padding:8px;">Product</th>' +
              '<th style="padding:8px;width:90px;">Cases</th>' +
              '<th style="padding:8px;width:110px;">Rate (₹)</th>' +
              '<th style="padding:8px;text-align:right;">Total</th>' +
            '</tr>' +
          '</thead>' +
          '<tbody>' +
          items.map(function(it, i) {
            var r = it.rate != null ? it.rate : (it.unit_rate != null ? it.unit_rate : 40);
            var q = it.cases || it.quantity_cases || 1;
            var tot = q * r;
            return '<tr class="del-row" data-idx="' + i + '">' +
              '<td style="padding:8px;"><input type="text" class="del-prod" value="' + esc(it.product_name) + '" style="width:100%;padding:4px 6px;border:1px solid var(--line);border-radius:4px;"></td>' +
              '<td style="padding:8px;"><input type="number" class="del-qty" value="' + q + '" min="1" style="width:100%;padding:4px 6px;border:1px solid var(--line);border-radius:4px;"></td>' +
              '<td style="padding:8px;"><input type="number" class="del-rate" value="' + r + '" min="0" step="any" style="width:100%;padding:4px 6px;border:1px solid var(--line);border-radius:4px;"></td>' +
              '<td style="padding:8px;text-align:right;font-weight:700;" class="del-line-tot">' + inr(tot) + '</td>' +
            '</tr>';
          }).join('') +
          '</tbody>' +
        '</table>' +
        '<div style="padding:6px 8px;background:var(--surface);font-size:11px;color:var(--muted);">' +
          '* Rates entered manually per Decision 2 (rate_source: \'manual\', no price-list enforcement).' +
        '</div>' +
      '</div>' +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;padding:0 4px;">' +
        '<label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:13px;font-weight:600;">' +
          '<input type="checkbox" id="del-gst" style="width:16px;height:16px;">' +
          '<span>Bill with GST (5% tax computed)</span>' +
        '</label>' +
      '</div>' +
      '<div id="del-tax-breakdown" style="display:none;background:var(--surface);border-radius:6px;padding:6px 10px;margin-bottom:10px;font-size:12px;">' +
        '<div style="display:flex;justify-content:space-between;"><span>Subtotal:</span><span id="del-subtotal-val">₹0</span></div>' +
        '<div style="display:flex;justify-content:space-between;color:var(--muted);"><span>GST (5%):</span><span id="del-tax-val">₹0</span></div>' +
      '</div>' +
      '<div style="display:flex;justify-content:space-between;align-items:center;font-size:16px;font-weight:800;margin-bottom:14px;padding:0 4px;">' +
        '<span>Invoice Bill Total:</span>' +
        '<span style="color:var(--brand);" id="del-bill-total">' + inr(sum(items, function(x){ return (x.cases||1) * (x.rate||40); })) + '</span>' +
      '</div>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;">' +
        '<div class="fld" style="margin:0;">' +
          '<label for="del-pay-mode">Payment Mode *</label>' +
          '<select id="del-pay-mode">' +
            '<option value="Cash">Cash</option>' +
            '<option value="UPI">UPI / QR Code</option>' +
            '<option value="Credit">Credit (Unpaid)</option>' +
            '<option value="Cheque">Cheque</option>' +
          '</select>' +
        '</div>' +
        '<div class="fld" style="margin:0;">' +
          '<label for="del-paid-amount">Amount Received (₹) *</label>' +
          '<input type="number" id="del-paid-amount" value="' + sum(items, function(x){ return (x.cases||1) * (x.rate||40); }) + '" min="0">' +
        '</div>' +
      '</div>' +
      '<div id="del-qr-container" style="display:none;background:var(--surface);border:1px dashed var(--brand);border-radius:10px;padding:14px;text-align:center;margin-bottom:14px;">' +
        '<div style="font-weight:700;font-size:13px;color:var(--brand);margin-bottom:6px;">Scan UPI QR Code to Pay</div>' +
        '<div id="del-upi-qr" style="display:inline-block;padding:8px;background:#fff;border-radius:8px;"></div>' +
        '<div style="font-size:11px;color:var(--muted);margin-top:6px;">UPI ID: ' + esc(S.settings.upiId || 'larven@okaxis') + ' · ' + esc(S.settings.upiPayee || S.settings.name || 'Larven Enterprises') + '</div>' +
      '</div>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px;">' +
        '<div class="fld" style="margin:0;">' +
          '<label for="del-empty-cans">Empty Cans Returned</label>' +
          '<input type="number" id="del-empty-cans" value="' + (items[0] && items[0].product_name === '20 L Can' ? (items[0].cases || 5) : 0) + '" min="0">' +
        '</div>' +
        '<div class="fld" style="margin:0;">' +
          '<label for="del-notes">Delivery Notes</label>' +
          '<input type="text" id="del-notes" placeholder="Optional notes">' +
        '</div>' +
      '</div>' +
      '<div class="dact">' +
        '<button type="button" class="btn alt" data-nb="close">Cancel</button>' +
        '<button type="submit" class="btn green" id="btn-submit-delivery">Complete Delivery & Issue Bill</button>' +
      '</div>' +
    '</form>',
    true
  );

  // Recalculate totals and check credit limit
  recalcDeliveryModal(cust);
}

function recalcDeliveryModal(cust) {
  var rows = document.querySelectorAll('.del-row');
  var subtotal = 0;
  rows.forEach(function(r) {
    var q = +((r.querySelector('.del-qty') || {}).value) || 0;
    var rate = +((r.querySelector('.del-rate') || {}).value) || 0;
    var lineTot = q * rate;
    subtotal += lineTot;
    var lineEl = r.querySelector('.del-line-tot');
    if (lineEl) lineEl.textContent = inr(lineTot);
  });

  var gstBox = document.getElementById('del-gst');
  var isGst = !!(gstBox && gstBox.checked);
  var tax = isGst ? round2(subtotal * 0.05) : 0;
  var total = subtotal + tax;

  var taxSection = document.getElementById('del-tax-breakdown');
  var subValEl = document.getElementById('del-subtotal-val');
  var taxValEl = document.getElementById('del-tax-val');
  if (taxSection) {
    taxSection.style.display = isGst ? 'block' : 'none';
    if (subValEl) subValEl.textContent = inr(subtotal);
    if (taxValEl) taxValEl.textContent = inr(tax);
  }

  var totEl = document.getElementById('del-bill-total');
  if (totEl) totEl.textContent = inr(total);

  var modeEl = document.getElementById('del-pay-mode');
  var paidEl = document.getElementById('del-paid-amount');
  if (modeEl && paidEl) {
    if (modeEl.value === 'Credit') {
      paidEl.value = '0';
    } else if (paidEl.dataset.manual !== '1') {
      paidEl.value = total;
    } else {
      // Cap manual payment at bill total
      var currPaid = +paidEl.value || 0;
      if (currPaid > total) paidEl.value = total;
    }
  }

  // Credit limit non-blocking warning check
  var warnEl = document.getElementById('del-credit-warn');
  if (warnEl && cust && cust.credit_limit) {
    var custBal = outstanding(cust.id);
    if ((custBal + total) > cust.credit_limit) {
      warnEl.style.display = 'block';
    } else {
      warnEl.style.display = 'none';
    }
  }

  // UPI QR update if active
  var qrContainer = document.getElementById('del-qr-container');
  var qrBox = document.getElementById('del-upi-qr');
  if (modeEl && modeEl.value === 'UPI') {
    if (qrContainer) qrContainer.style.display = 'block';
    renderUpiQr(qrBox, S.settings.upiId || 'larven@okaxis', S.settings.upiPayee || S.settings.name || 'Larven Enterprises', paidEl ? +paidEl.value : total, 'DEL');
  } else {
    if (qrContainer) qrContainer.style.display = 'none';
  }
}

function showSkipModal(stopId) {
  var stop = (S.tripStops || []).find(function(s) { return s.id === stopId; });
  if (!stop) return;
  var cust = (S.customers || []).find(function(c) { return c.id === stop.customer_id; }) || {};

  openModal(
    '<h3>Skip Stop / స్టాప్ దాటవేయండి</h3>' +
    '<p class="pdesc">Select the operational reason for skipping delivery at <b>' + esc(cust.name) + '</b>.</p>' +
    '<form id="skip-stop-form" data-stop-id="' + esc(stop.id) + '">' +
      '<div class="fld">' +
        '<label for="skip-reason">Reason Code *</label>' +
        '<select id="skip-reason" required>' +
          '<option value="Shop Closed">Shop Closed / దుకాణం మూసివేయబడింది</option>' +
          '<option value="Customer Unavailable">Customer Unavailable / యజమాని లేరు</option>' +
          '<option value="Sufficient Stock">Sufficient Stock / తగినంత స్టాక్ ఉంది</option>' +
          '<option value="Payment Dispute">Payment Dispute / మునుపటి బకాయిల వివాదం</option>' +
          '<option value="Other">Other / ఇతర కారణం</option>' +
        '</select>' +
      '</div>' +
      '<div class="fld">' +
        '<label for="skip-note">Notes / వివరాలు</label>' +
        '<input type="text" id="skip-note" placeholder="Optional notes for manager review">' +
      '</div>' +
      '<div class="dact" style="margin-top:14px;">' +
        '<button type="button" class="btn alt" data-nb="close">Cancel</button>' +
        '<button type="submit" class="btn danger">Confirm Skip</button>' +
      '</div>' +
    '</form>'
  );
}

function showLogOrderModal(stopId) {
  var stop = (S.tripStops || []).find(function(s) { return s.id === stopId; });
  if (!stop) return;
  var cust = (S.customers || []).find(function(c) { return c.id === stop.customer_id; }) || {};

  openModal(
    '<h3>Log Future Order / ఆర్డర్ నమోదు</h3>' +
    '<p class="pdesc">Book tomorrow\'s or next scheduled order from customer stop for <b>' + esc(cust.name) + '</b>.</p>' +
    '<form id="log-order-form" data-stop-id="' + esc(stop.id) + '" data-cust-id="' + esc(cust.id) + '">' +
      '<div class="fld">' +
        '<label for="lo-req-date">Requested Delivery Date *</label>' +
        '<input type="date" id="lo-req-date" value="' + esc(tomorrow()) + '" required>' +
      '</div>' +
      '<div class="fld">' +
        '<label for="lo-sku">Product SKU *</label>' +
        '<select id="lo-sku">' +
          (S.settings.products || defProducts()).map(function(p) {
            return '<option value="' + esc(p.n) + '">' + esc(p.n) + ' (₹' + p.r + '/case)</option>';
          }).join('') +
        '</select>' +
      '</div>' +
      '<div class="fld">' +
        '<label for="lo-cases">Quantity (Cases / Cans) *</label>' +
        '<input type="number" id="lo-cases" value="10" min="1" required>' +
      '</div>' +
      '<div class="fld">' +
        '<label for="lo-notes">Order Notes</label>' +
        '<input type="text" id="lo-notes" placeholder="e.g. Deliver before 11 AM">' +
      '</div>' +
      '<div class="dact" style="margin-top:14px;">' +
        '<button type="button" class="btn alt" data-nb="close">Cancel</button>' +
        '<button type="submit" class="btn green">Book Order</button>' +
      '</div>' +
    '</form>'
  );
}

/* ---------- (3) Manager "Route Planner" (#route-planner) ---------- */
var RP_STATE = {
  date: today(),
  vehicle: 'V1',
  driver: 'M1',
  stagedStops: []
};

function routePlannerPage() {
  if (CURRENT_ROLE === 'employee') {
    return head('Route Planner') + '<div class="card tw"><div class="empty">Access restricted: Route planning is reserved for manager and owner accounts.</div></div>';
  }

  var selDate = RP_STATE.date || today();
  var pendingOrders = (S.orders || []).filter(function(o) {
    return o.requested_date === selDate && o.status !== 'delivered' && o.status !== 'cancelled';
  });

  // Calculate vehicle load summary from staged stops
  var loadAgg = {};
  RP_STATE.stagedStops.forEach(function(s) {
    (s.items || []).forEach(function(it) {
      loadAgg[it.product_name] = (loadAgg[it.product_name] || 0) + (+it.cases || 0);
    });
  });
  var totalStagedCases = Object.keys(loadAgg).reduce(function(a, k) { return a + loadAgg[k]; }, 0);
  var vehCap = getVehCapacity(RP_STATE.vehicle);
  var capPct = Math.round((totalStagedCases / vehCap) * 100);

  var html = head('Route Planner & Vehicle Dispatch / రూట్ ప్లానర్') +
    '<div class="card" style="margin-bottom:16px;padding:16px;">' +
      '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;">' +
        '<div class="fld" style="margin:0;">' +
          '<label for="rp-date">Delivery Date / తేదీ</label>' +
          '<input type="date" id="rp-date" value="' + esc(selDate) + '">' +
        '</div>' +
        '<div class="fld" style="margin:0;">' +
          '<label for="rp-vehicle">Vehicle / వాహనం</label>' +
          '<select id="rp-vehicle">' +
            (S.vehicles || []).map(function(v) {
              return '<option value="' + esc(v.id) + '"' + (v.id === RP_STATE.vehicle ? ' selected' : '') + '>' + esc(v.number) + ' · ' + esc(v.type) + ' (' + v.capacity_cases + ' cases max)</option>';
            }).join('') +
          '</select>' +
        '</div>' +
        '<div class="fld" style="margin:0;">' +
          '<label for="rp-driver">Driver / డ్రైవర్</label>' +
          '<select id="rp-driver">' +
            (S.employees || []).filter(function(e) { return e.role === 'Driver' || (e.duties && e.duties.indexOf('delivery') >= 0) || true; }).map(function(e) {
              return '<option value="' + esc(e.id) + '"' + (e.id === RP_STATE.driver ? ' selected' : '') + '>' + esc(e.name) + ' (' + esc(e.role || 'Staff') + ')</option>';
            }).join('') +
          '</select>' +
        '</div>' +
      '</div>' +
    '</div>';

  // Section 1: Orders Due for Selected Date
  html += '<div style="margin-bottom:16px;">' +
    '<h3 style="margin:0 0 8px;">1. Pending Orders Due (' + pendingOrders.length + ')</h3>' +
    '<p class="pdesc" style="margin:0 0 10px;">Select pending customer orders to add to today\'s vehicle trip itinerary.</p>';

  if (!pendingOrders.length) {
    html += '<div class="card tw"><div class="empty">No pending orders due for ' + esc(selDate) + '.</div></div>';
  } else {
    html += '<div style="display:grid;gap:10px;">';
    pendingOrders.forEach(function(o) {
      var c = (S.customers || []).find(function(x) { return x.id === o.customer_id; }) || {};
      var itemsDesc = (o.items || []).map(function(it) {
        return num(it.cases) + ' × ' + esc(it.product_name);
      }).join(', ');
      var isStaged = RP_STATE.stagedStops.some(function(s) { return s.order_id === o.id; });

      html += '<div class="card" style="padding:12px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">' +
        '<div>' +
          '<div style="font-weight:700;font-size:15px;">' + esc(c.name || 'Customer') + ' · <small class="muted">' + esc(c.area || '') + '</small></div>' +
          '<div style="font-size:13px;color:var(--brand);margin-top:2px;">Ordered: <b>' + itemsDesc + '</b> · Amount: ' + inr(o.total_amount || 0) + '</div>' +
        '</div>' +
        '<div>' +
          (isStaged
            ? '<span class="pill p-green">✓ Added to Trip</span>'
            : '<button type="button" class="btn sm" data-rp-act="add-order" data-order-id="' + esc(o.id) + '">➕ Add to Route</button>') +
        '</div>' +
      '</div>';
    });
    html += '</div>';
  }
  html += '</div>';

  // Section 2: Trip Stop Organizer (Drag and Steppers)
  html += '<div style="margin-bottom:16px;">' +
    '<h3 style="margin:0 0 8px;">2. Planned Trip Stops (' + RP_STATE.stagedStops.length + ')</h3>' +
    '<p class="pdesc" style="margin:0 0 10px;">Drag or use steppers (▲/▼) to sequence deliveries in optimal driving order.</p>';

  if (!RP_STATE.stagedStops.length) {
    html += '<div class="card tw"><div class="empty">No stops added yet. Click <b>➕ Add to Route</b> above to stage delivery stops.</div></div>';
  } else {
    html += '<div id="rp-stops-container" style="display:grid;gap:8px;">';
    RP_STATE.stagedStops.forEach(function(s, idx) {
      var c = (S.customers || []).find(function(x) { return x.id === s.customer_id; }) || {};
      var itemsDesc = (s.items || []).map(function(it) {
        return num(it.cases) + ' × ' + esc(it.product_name);
      }).join(', ');

      html += '<div class="card rp-stop-item" draggable="true" data-stop-idx="' + idx + '" style="padding:12px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;cursor:grab;">' +
        '<div style="display:flex;align-items:center;gap:10px;">' +
          '<span style="font-weight:800;font-size:14px;background:var(--surface);padding:4px 8px;border-radius:6px;color:var(--brand);">Stop #' + (idx + 1) + '</span>' +
          '<div>' +
            '<div style="font-weight:700;">' + esc(c.name || 'Customer') + ' · <small class="muted">' + esc(c.area || '') + '</small></div>' +
            '<div style="font-size:12px;color:var(--muted);">' + itemsDesc + '</div>' +
          '</div>' +
        '</div>' +
        '<div style="display:flex;gap:6px;align-items:center;">' +
          '<button type="button" class="btn alt sm" data-rp-act="move-up" data-idx="' + idx + '"' + (idx === 0 ? ' disabled' : '') + '>▲</button>' +
          '<button type="button" class="btn alt sm" data-rp-act="move-down" data-idx="' + idx + '"' + (idx === RP_STATE.stagedStops.length - 1 ? ' disabled' : '') + '>▼</button>' +
          '<button type="button" class="btn alt sm danger" data-rp-act="remove-stop" data-idx="' + idx + '">✕</button>' +
        '</div>' +
      '</div>';
    });
    html += '</div>';
  }
  html += '</div>';

  // Section 3: Auto-Calculated Vehicle Load List & Dispatch
  html += '<div class="card" style="padding:16px;background:var(--surface);">' +
    '<h3 style="margin-top:0;">3. Auto-Calculated Vehicle Load List</h3>' +
    '<div style="margin:12px 0;">';

  if (Object.keys(loadAgg).length === 0) {
    html += '<p class="muted">Add stops above to calculate total cases and vehicle utilization.</p>';
  } else {
    html += '<div style="display:flex;flex-wrap:wrap;gap:12px;margin-bottom:12px;">' +
      Object.keys(loadAgg).map(function(k) {
        return '<div style="background:#fff;padding:8px 14px;border-radius:8px;border:1px solid var(--line);">' +
          '<span style="font-size:12px;color:var(--muted);display:block;">' + esc(k) + '</span>' +
          '<b style="font-size:16px;color:var(--brand);">' + num(loadAgg[k]) + ' cases</b>' +
        '</div>';
      }).join('') +
    '</div>' +
    '<div style="margin-bottom:10px;">' +
      '<div style="display:flex;justify-content:space-between;font-size:13px;font-weight:700;margin-bottom:4px;">' +
        '<span>Vehicle Capacity Utilization:</span>' +
        '<span style="color:' + (capPct > 100 ? 'var(--red)' : 'var(--green)') + ';">' + num(totalStagedCases) + ' / ' + num(vehCap) + ' cases (' + capPct + '%)</span>' +
      '</div>' +
      '<div style="height:10px;background:#e9ecef;border-radius:5px;overflow:hidden;">' +
        '<div style="width:' + Math.min(100, capPct) + '%;height:100%;background:' + (capPct > 100 ? 'var(--red)' : 'var(--green)') + ';"></div>' +
      '</div>' +
    '</div>';
  }

  html += '</div>' +
    '<div style="text-align:right;margin-top:14px;">' +
      '<button type="button" class="btn green" data-rp-act="dispatch-trip"' + (RP_STATE.stagedStops.length === 0 ? ' disabled' : '') + '>Create & Dispatch Trip 🚚</button>' +
    '</div>' +
  '</div>';

  return html;
}

/* ---------- (4) Orders and "Production Plan" (#production-plan) ---------- */
var PP_DATE = today();

function productionPlanPage() {
  if (CURRENT_ROLE === 'employee') {
    return head('Production Planning') + '<div class="card tw"><div class="empty">Access restricted: Production planning is reserved for manager and owner accounts.</div></div>';
  }

  var selDate = PP_DATE || today();
  var orders = (S.orders || []).filter(function(o) {
    return o.requested_date === selDate && o.status !== 'delivered' && o.status !== 'cancelled';
  });

  // Calculate ordered cases per SKU
  var orderedCases = {};
  orders.forEach(function(o) {
    (o.items || []).forEach(function(it) {
      orderedCases[it.product_name] = (orderedCases[it.product_name] || 0) + (+it.cases || 0);
    });
  });

  var bal = fgBal();
  var skus = fgSizes();

  var rows = skus.map(function(sku) {
    var plantStock = fgGet(bal, 'P', sku);
    var demand = orderedCases[sku] || 0;
    var net = plantStock - demand;
    var deficit = net < 0 ? Math.abs(net) : 0;

    var statusCol = deficit > 0
      ? '<span class="pill p-red">Deficit: -' + num(deficit) + ' Cases</span>'
      : '<span class="pill p-green">Sufficient Stock (+' + num(net) + ')</span>';

    var actionCol = '<button type="button" class="btn sm ' + (deficit > 0 ? 'green' : 'alt') + '" data-pp-act="batch-modal" data-sku="' + esc(sku) + '" data-deficit="' + deficit + '">➕ ' + (deficit > 0 ? 'Produce Deficit' : 'New Batch') + '</button>';

    return [
      '<b>' + esc(sku) + '</b>',
      num(plantStock) + ' cases',
      num(demand) + ' cases',
      '<span style="font-weight:700;color:' + (net < 0 ? 'var(--red)' : 'var(--green)') + ';">' + (net >= 0 ? '+' : '') + num(net) + ' cases</span>',
      statusCol,
      actionCol
    ];
  });

  var html = head('Production Planning / ఉత్పత్తి ప్రణాళిక') +
    '<div class="card" style="margin-bottom:16px;padding:16px;">' +
      '<div style="display:flex;align-items:flex-end;justify-content:space-between;flex-wrap:wrap;gap:12px;">' +
        '<div class="fld" style="margin:0;min-width:220px;">' +
          '<label for="pp-date">Target Order Date / తేదీ</label>' +
          '<input type="date" id="pp-date" value="' + esc(selDate) + '">' +
        '</div>' +
        '<div style="font-size:13px;color:var(--muted);">' +
          'Pending Orders for Date: <b>' + orders.length + '</b> · Plant Stock Reference: <b>Location P</b>' +
        '</div>' +
      '</div>' +
    '</div>' +
    '<div class="card tw" style="padding:6px;">' +
      table(['Product / Size', 'Plant Stock Now', 'Orders Due (' + esc(selDate) + ')', 'Net Balance', 'Status', 'Action'], rows) +
    '</div>';

  return html;
}

function showProductionBatchModal(sku, deficit) {
  var batchNo = 'BATCH-' + today().replace(/-/g, '') + '-' + Math.floor(10 + Math.random() * 90);
  var casesPrefill = deficit > 0 ? deficit : 20;
  var btlPrefill = casesPrefill * fgPer(sku);

  openModal(
    '<h3>Create Production Batch / బ్యాచ్ ఉత్పత్తి</h3>' +
    '<p class="pdesc">Record manufacturing run for <b>' + esc(sku) + '</b>. Stock will be credited directly to Plant inventory (Location P).</p>' +
    '<form id="prod-batch-form" data-sku="' + esc(sku) + '">' +
      '<div class="fld">' +
        '<label for="pb-no">Batch Number *</label>' +
        '<input type="text" id="pb-no" value="' + esc(batchNo) + '" required>' +
      '</div>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">' +
        '<div class="fld">' +
          '<label for="pb-cases">Quantity to Produce (Cases) *</label>' +
          '<input type="number" id="pb-cases" value="' + casesPrefill + '" min="1" required>' +
        '</div>' +
        '<div class="fld">' +
          '<label for="pb-bottles">Bottles Count</label>' +
          '<input type="number" id="pb-bottles" value="' + btlPrefill + '" readonly style="background:var(--surface);">' +
        '</div>' +
      '</div>' +
      '<div class="fld">' +
        '<label for="pb-notes">Batch Notes</label>' +
        '<input type="text" id="pb-notes" placeholder="e.g. Morning shift run 1">' +
      '</div>' +
      '<div class="dact" style="margin-top:14px;">' +
        '<button type="button" class="btn alt" data-nb="close">Cancel</button>' +
        '<button type="submit" class="btn green">Record Production & Credit Stock</button>' +
      '</div>' +
    '</form>'
  );
}

/* ---------- (5) Day Close & Cash Handover (#day-close) ---------- */
function dayClosePage() {
  var trips = (S.trips || []).slice();
  var trip = null;
  if (CURRENT_ROLE === 'employee') {
    var myEmpId = CURRENT_PROFILE && CURRENT_PROFILE.employee_id;
    if (myEmpId) {
      trip = trips.find(function(t) {
        return (t.driver_employee_id === myEmpId || t.driver_id === myEmpId) &&
               t.status !== 'settled' && t.status !== 'cancelled';
      }) || trips.find(function(t) {
        return (t.driver_employee_id === myEmpId || t.driver_id === myEmpId);
      }) || null;
    }
  } else {
    var curTripId = window.__SELECTED_DAYCLOSE_TRIP_ID;
    trip = (curTripId && trips.find(function(t) { return t.id === curTripId; })) ||
           trips.find(function(t) { return t.status !== 'settled'; }) ||
           trips[trips.length - 1];
  }

  if (!trip) {
    return head('Day Close & Cash Handover / నగదు అప్పగింత') +
      '<div class="card tw"><div class="empty">No vehicle trips found to reconcile today.</div></div>';
  }

  // Calculate deliveries for this trip
  var deliveries = (S.deliveries || []).filter(function(d) {
    return d.trip_id === trip.id || (S.tripStops || []).some(function(s) { return s.trip_id === trip.id && s.id === d.stop_id; });
  });

  // Calculate bill payments and expenses
  var grossInvoiced = sum(deliveries, function(d) { return +d.amount || 0; });
  var grossCash = sum(deliveries, function(d) { return d.payment_mode === 'Cash' ? (+d.paid || 0) : 0; });
  var totalUpi = sum(deliveries, function(d) { return d.payment_mode === 'UPI' ? (+d.paid || 0) : 0; });
  var creditDues = sum(deliveries, function(d) { return Math.max(0, (+d.amount || 0) - (+d.paid || 0)); });
  var emptyCans = sum(deliveries, function(d) { return +d.empty_cans_returned || 0; });

  // Trip expenses (diesel, toll, etc.)
  var tripExpenses = sum((S.expenses || []).filter(function(e) {
    return (e.trip_id && e.trip_id === trip.id) || (e.vehicle && e.vehicle === trip.vehicle_id && e.date === trip.trip_date);
  }), function(e) { return +e.amount || 0; });

  // Formula: Net Cash = Gross Cash - Trip Expenses
  var netCash = Math.max(0, grossCash - tripExpenses);

  var tripSelect = '';
  if (CURRENT_ROLE !== 'employee' && trips.length > 1) {
    tripSelect = '<div style="margin-bottom:12px;"><label style="font-size:12px;font-weight:700;color:var(--muted);display:block;margin-bottom:4px;">Reconcile Trip:</label>' +
      '<select id="dayclose-trip-select" class="fld-in" style="max-width:320px;">' +
      trips.map(function(t) {
        return '<option value="' + esc(t.id) + '"' + (t.id === trip.id ? ' selected' : '') + '>' + esc(t.trip_no || t.id) + ' · ' + esc(getVehNo(t.vehicle_id)) + ' · ' + esc(empName(t.driver_employee_id)) + '</option>';
      }).join('') +
      '</select></div>';
  }

  var html = head('Day Close & Cash Handover / నగదు అప్పగింత') + tripSelect +
    '<div class="card" style="margin-bottom:16px;padding:16px;">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">' +
        '<div>' +
          '<h3 style="margin:0 0 4px;font-size:18px;">Trip #' + esc(trip.trip_no || trip.id) + ' Settlement</h3>' +
          '<div style="font-size:13px;color:var(--muted);">' +
            'Vehicle: <b>' + esc(getVehNo(trip.vehicle_id)) + '</b> · Driver: <b>' + esc(empName(trip.driver_employee_id)) + '</b> · Date: <b>' + esc(trip.trip_date) + '</b>' +
          '</div>' +
        '</div>' +
        '<div>' +
          (trip.status === 'settled'
            ? '<span class="pill p-green">✓ Settled & Handed Over</span>'
            : '<span class="pill p-amber">Pending Settlement</span>') +
        '</div>' +
      '</div>' +
    '</div>';

  // 4 KPI Summary Tiles
  html += kp([
    ['Total Invoiced Sales', inr(grossInvoiced)],
    ['Gross Cash Collected', inr(grossCash)],
    ['UPI / Online Payments', inr(totalUpi)],
    ['Credit Dues / Balance', inr(creditDues)]
  ]);

  // Net Cash Calculation Card
  html += '<div class="card" style="background:var(--brand-soft);border:1px solid var(--brand);padding:16px;border-radius:12px;margin:16px 0;">' +
    '<div style="font-size:13px;font-weight:700;color:var(--brand);text-transform:uppercase;letter-spacing:0.5px;">Driver Settlement Reconciliation</div>' +
    '<div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;margin-top:10px;">' +
      '<div>' +
        '<div style="font-size:12px;color:var(--muted);">Gross Cash Collections</div>' +
        '<div style="font-size:18px;font-weight:700;">' + inr(grossCash) + '</div>' +
      '</div>' +
      '<div style="font-size:20px;font-weight:700;color:var(--red);">−</div>' +
      '<div>' +
        '<div style="font-size:12px;color:var(--muted);">Trip Fuel & Toll Expenses</div>' +
        '<div style="font-size:18px;font-weight:700;color:var(--red);">' + inr(tripExpenses) + '</div>' +
      '</div>' +
      '<div style="font-size:20px;font-weight:700;color:var(--brand);">=</div>' +
      '<div>' +
        '<div style="font-size:12px;color:var(--brand);font-weight:700;">Net Cash to Hand Over</div>' +
        '<div style="font-size:24px;font-weight:800;color:var(--brand);" id="net-cash-display">' + inr(netCash) + '</div>' +
      '</div>' +
    '</div>' +
    '<div style="font-size:12px;color:var(--muted);margin-top:10px;border-top:1px dashed var(--line);padding-top:8px;">' +
      'Empty Cans Collected: <b>' + num(emptyCans) + ' cans</b> · Digital UPI Receipts: <b>' + inr(totalUpi) + '</b>' +
    '</div>' +
  '</div>';

  // Supervisor Cash Handover Form
  if (trip.status !== 'settled') {
    var managers = (S.employees || []).filter(function(e) { return e.role === 'Manager' || e.role === 'Owner'; });
    if (!managers.length) managers = [{ id: 'owner-1', name: S.settings.owner || 'Muni Prasad', role: 'Owner' }];

    html += '<form id="dayclose-handover-form" class="card form" data-trip-id="' + esc(trip.id) + '" style="padding:16px;">' +
      '<h3 style="margin-top:0;">Supervisor Cash Handover / నగదు అప్పగింత ఫారం</h3>' +
      '<p class="pdesc">Driver hands over physical net cash and digital UPI reconciliation receipts to the shift supervisor.</p>' +
      '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;margin:12px 0;">' +
        '<div class="fld" style="margin:0;">' +
          '<label for="ho-supervisor">Supervisor / Manager *</label>' +
          '<select id="ho-supervisor" required>' +
            managers.map(function(m) {
              return '<option value="' + esc(m.id) + '">' + esc(m.name) + ' (' + esc(m.role || 'Supervisor') + ')</option>';
            }).join('') +
          '</select>' +
        '</div>' +
        '<div class="fld" style="margin:0;">' +
          '<label for="ho-cash">Net Physical Cash (₹) *</label>' +
          '<input type="number" id="ho-cash" value="' + netCash + '" min="0" required>' +
        '</div>' +
        '<div class="fld" style="margin:0;">' +
          '<label for="ho-upi">UPI Collections Verified (₹)</label>' +
          '<input type="number" id="ho-upi" value="' + totalUpi + '" readonly style="background:var(--surface);">' +
        '</div>' +
        '<div class="fld" style="margin:0;">' +
          '<label for="ho-cans">Empty Cans Returned</label>' +
          '<input type="number" id="ho-cans" value="' + emptyCans + '" min="0">' +
        '</div>' +
      '</div>' +
      '<div class="fld">' +
        '<label for="ho-notes">Settlement Remarks / Notes</label>' +
        '<input type="text" id="ho-notes" placeholder="e.g. Fuel bill ₹350 attached; cash verified">' +
      '</div>' +
      '<div class="dact" style="margin-top:14px;">' +
        '<button type="submit" class="btn green" id="btn-submit-handover">Confirm Handover & Settle Trip</button>' +
      '</div>' +
    '</form>';
  } else {
    var hoRec = (S.cashHandovers || []).find(function(h) { return h.trip_id === trip.id; });
    html += '<div class="card" style="padding:16px;border:1px solid var(--green);">' +
      '<div style="display:flex;align-items:center;gap:10px;">' +
        '<div class="okic" style="margin:0;"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 5 5 9-10"/></svg></div>' +
        '<div>' +
          '<h3 style="margin:0 0 4px;">Trip Settlement Finalized</h3>' +
          '<div style="font-size:13px;color:var(--muted);">' +
            (hoRec ? 'Receipt: <b>' + esc(hoRec.handover_no) + '</b> · Settled at: ' + esc(hoRec.handed_over_at) + ' · Net Cash: <b>' + inr(hoRec.net_cash_amount) + '</b>' : 'Trip settled') +
          '</div>' +
        '</div>' +
      '</div>' +
    '</div>';
  }

  return html;
}

function showHandoverReceiptModal(hoRec, trip) {
  openModal(
    '<div class="okic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 5 5 9-10"/></svg></div>' +
    '<h3>Settlement Handover Finalized</h3>' +
    '<p class="pdesc">Cash handover receipt <b>#' + esc(hoRec.handover_no) + '</b> successfully recorded.</p>' +
    '<div style="background:var(--surface);border-radius:10px;padding:14px;margin:14px 0;font-size:13px;">' +
      '<div style="display:flex;justify-content:space-between;margin-bottom:6px;"><span>Trip Ref:</span><b>#' + esc(trip.trip_no || trip.id) + '</b></div>' +
      '<div style="display:flex;justify-content:space-between;margin-bottom:6px;"><span>Vehicle:</span><b>' + esc(getVehNo(trip.vehicle_id)) + '</b></div>' +
      '<div style="display:flex;justify-content:space-between;margin-bottom:6px;"><span>Driver:</span><b>' + esc(empName(trip.driver_employee_id)) + '</b></div>' +
      '<div style="display:flex;justify-content:space-between;margin-bottom:6px;"><span>Supervisor:</span><b>' + esc(empName(hoRec.manager_profile_id)) + '</b></div>' +
      '<div style="border-top:1px dashed var(--line);margin:8px 0;"></div>' +
      '<div style="display:flex;justify-content:space-between;margin-bottom:6px;"><span>Net Cash Handed Over:</span><b style="color:var(--green);font-size:15px;">' + inr(hoRec.net_cash_amount) + '</b></div>' +
      '<div style="display:flex;justify-content:space-between;margin-bottom:6px;"><span>UPI Receipts Confirmed:</span><b>' + inr(hoRec.upi_amount) + '</b></div>' +
      '<div style="display:flex;justify-content:space-between;"><span>Empty Cans Returned:</span><b>' + num(hoRec.empty_cans) + ' cans</b></div>' +
    '</div>' +
    '<div class="dact">' +
      '<button type="button" class="btn" data-nb="close">Done</button>' +
    '</div>',
    true
  );
}

/* Event Delegation for Operations Actions */
document.addEventListener('click', function(e) {
  var t = e.target.closest('[data-route-act], [data-loc-act], [data-rp-act], [data-pp-act]');
  if (!t) return;

  // Location Capture
  var locAct = t.dataset.locAct;
  if (locAct === 'start-gps') {
    executeGpsCapture(t.dataset.custId);
    return;
  }
  if (locAct === 'confirm-gps') {
    var custId = t.dataset.custId;
    var cust = (S.customers || []).find(function(c) { return c.id === custId; });
    if (cust) {
      cust.lat = Number(t.dataset.lat);
      cust.lng = Number(t.dataset.lng);
      cust.accuracy_m = Number(t.dataset.acc);
      cust.location_set_by = (CURRENT_PROFILE && CURRENT_PROFILE.full_name) || CURRENT_ROLE;
      cust.location_set_at = new Date().toISOString();
      save();
      closeModal();
      toast('GPS Coordinates saved for ' + cust.name + ' (±' + cust.accuracy_m + ' m)!');
      if (typeof window.__LOC_CAPTURE_CALLBACK === 'function') {
        window.__LOC_CAPTURE_CALLBACK();
        window.__LOC_CAPTURE_CALLBACK = null;
      }
      render();
    }
    return;
  }

  // Route Actions
  var routeAct = t.dataset.routeAct;
  if (routeAct === 'capture-loc') {
    captureCustomerLocation(t.dataset.custId, function() { render(); });
    return;
  }
  if (routeAct === 'confirm-loading') {
    var tripId = t.dataset.tripId;
    var trip = (S.trips || []).find(function(x) { return x.id === tripId; });
    var startKm = $('#route-start-km') ? +$('#route-start-km').value : 0;
    if (!(startKm >= 0)) {
      toast('Please enter vehicle start odometer reading');
      return;
    }
    if (trip) {
      cacheTripAtStart(trip);
      trip.status = 'on_route';
      trip.start_odometer = startKm;
      trip.loaded_at = new Date().toISOString();
      save();
      onlineFirstWrite('confirm_loading', '/api/rpc/confirm_loading', {
        p_trip_id: trip.id,
        p_start_odometer: startKm
      }, { tripId: trip.id }).then(function(res) {
        if (res.online) toast('Trip started & verified online! Drive safely.');
        else toast('Trip started! Action queued in Outbox (pending sync).');
      }).catch(function(err) {
        toast('Trip start error: ' + err.message);
      });
      render();
    }
    return;
  }
  if (routeAct === 'arrive-stop') {
    var stopId = t.dataset.stopId;
    var stop = (S.tripStops || []).find(function(s) { return s.id === stopId; });
    if (!stop) return;
    var cust = (S.customers || []).find(function(c) { return c.id === stop.customer_id; });

    var doArrive = function(lat, lng, dist) {
      stop.status = 'arrived';
      stop.arrived_at = new Date().toISOString();
      stop.arrival_lat = lat;
      stop.arrival_lng = lng;
      stop.distance_meters = dist;
      save();
      onlineFirstWrite('arrive_at_stop', '/api/rpc/arrive_at_stop', {
        p_trip_id: stop.trip_id,
        p_customer_id: stop.customer_id,
        p_lat: lat,
        p_lng: lng,
        p_distance_meters: dist
      }, { tripId: stop.trip_id, stopId: stop.id });
      toast('Arrived at stop! ' + (dist != null ? '(' + dist + ' m away)' : ''));
      render();
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        function(pos) {
          var dist = (cust && cust.lat && cust.lng) ? haversineDist(pos.coords.latitude, pos.coords.longitude, cust.lat, cust.lng) : null;
          doArrive(pos.coords.latitude, pos.coords.longitude, dist);
        },
        function() {
          doArrive(null, null, null);
        },
        { enableHighAccuracy: true, timeout: 6000 }
      );
    } else {
      doArrive(null, null, null);
    }
    return;
  }
  if (routeAct === 'deliver-modal') {
    showDeliverModal(t.dataset.stopId, t.dataset.tripId);
    return;
  }
  if (routeAct === 'skip-modal') {
    showSkipModal(t.dataset.stopId);
    return;
  }
  if (routeAct === 'log-order-modal') {
    showLogOrderModal(t.dataset.stopId);
    return;
  }
  if (routeAct === 'close-trip') {
    var tripId = t.dataset.tripId;
    var trip = (S.trips || []).find(function(x) { return x.id === tripId; });
    var endKm = $('#route-end-km') ? +$('#route-end-km').value : 0;
    if (!(endKm >= (trip ? (trip.start_odometer || 0) : 0))) {
      toast('Ending odometer must be greater than or equal to start odometer (' + (trip ? trip.start_odometer : 0) + ' KM)');
      return;
    }
    if (trip) {
      trip.status = 'completed';
      trip.end_odometer = endKm;
      trip.closed_at = new Date().toISOString();
      save();
      onlineFirstWrite('close_trip', '/api/rpc/close_trip', {
        p_trip_id: trip.id,
        p_end_odometer: endKm
      }, { tripId: trip.id });
      toast('Trip completed! Proceed to Day Close & Cash Settlement.');
      location.hash = '#day-close';
      render();
    }
    return;
  }
  if (routeAct === 'sync-outbox') {
    syncOutbox().then(function() {
      toast('Outbox sync complete!');
      render();
    }).catch(function(err) {
      toast('Sync error: ' + (err.message || err));
      render();
    });
    return;
  }
  if (routeAct === 'retry-attention') {
    var attId = t.dataset.attId;
    OutboxDB.retryAttention(attId).then(function() {
      toast('Item moved back to outbox for retry.');
      syncOutbox().then(render);
    });
    return;
  }
  if (routeAct === 'dismiss-attention') {
    var attId = t.dataset.attId;
    OutboxDB.removeAttention(attId).then(function() {
      toast('Item dismissed from attention list.');
      render();
    });
    return;
  }

  // Route Planner Actions
  var rpAct = t.dataset.rpAct;
  if (rpAct === 'add-order') {
    var orderId = t.dataset.orderId;
    var ord = (S.orders || []).find(function(o) { return o.id === orderId; });
    if (ord && !RP_STATE.stagedStops.some(function(s) { return s.order_id === ord.id; })) {
      RP_STATE.stagedStops.push({
        customer_id: ord.customer_id,
        order_id: ord.id,
        planned_cases: sum(ord.items || [], function(x) { return +x.cases || 0; }),
        items: ord.items || []
      });
      render();
    }
    return;
  }
  if (rpAct === 'remove-stop') {
    var idx = parseInt(t.dataset.idx, 10);
    RP_STATE.stagedStops.splice(idx, 1);
    render();
    return;
  }
  if (rpAct === 'move-up') {
    var idx = parseInt(t.dataset.idx, 10);
    if (idx > 0) {
      var tmp = RP_STATE.stagedStops[idx];
      RP_STATE.stagedStops[idx] = RP_STATE.stagedStops[idx - 1];
      RP_STATE.stagedStops[idx - 1] = tmp;
      render();
    }
    return;
  }
  if (rpAct === 'move-down') {
    var idx = parseInt(t.dataset.idx, 10);
    if (idx < RP_STATE.stagedStops.length - 1) {
      var tmp = RP_STATE.stagedStops[idx];
      RP_STATE.stagedStops[idx] = RP_STATE.stagedStops[idx + 1];
      RP_STATE.stagedStops[idx + 1] = tmp;
      render();
    }
    return;
  }
  if (rpAct === 'dispatch-trip') {
    if (!RP_STATE.stagedStops.length) return;
    var dt = $('#rp-date') ? $('#rp-date').value : RP_STATE.date;
    var veh = $('#rp-vehicle') ? $('#rp-vehicle').value : RP_STATE.vehicle;
    var drv = $('#rp-driver') ? $('#rp-driver').value : RP_STATE.driver;
    var tripId = nid('TR', S.trips);
    var tripNo = 'TR-' + dt.replace(/-/g, '').slice(2) + '-' + Math.floor(100 + Math.random() * 900);

    var loadMap = {};
    RP_STATE.stagedStops.forEach(function(s) {
      (s.items || []).forEach(function(it) {
        loadMap[it.product_name] = (loadMap[it.product_name] || 0) + (+it.cases || 0);
      });
    });
    var loadItems = Object.keys(loadMap).map(function(k) {
      var pr = (S.settings.products || []).find(function(p) { return p.n === k; });
      var c = (pr && pr.c) || 1;
      return { product_name: k, cases: loadMap[k], bottles: loadMap[k] * c };
    });

    var newTrip = {
      id: tripId,
      trip_no: tripNo,
      vehicle_id: veh,
      driver_employee_id: drv,
      trip_date: dt,
      status: 'loading',
      start_odometer: null,
      end_odometer: null,
      loaded_at: null,
      closed_at: null,
      load_items: loadItems
    };
    S.trips.push(newTrip);

    RP_STATE.stagedStops.forEach(function(s, i) {
      var stopId = nid('TS', S.tripStops);
      S.tripStops.push({
        id: stopId,
        trip_id: tripId,
        stop_sequence: i + 1,
        customer_id: s.customer_id,
        order_id: s.order_id || null,
        planned_cases: s.planned_cases,
        planned_bottles: 0,
        items: s.items || [],
        status: 'pending',
        arrived_at: null,
        arrival_lat: null,
        arrival_lng: null,
        distance_meters: null,
        completed_at: null,
        skip_reason: null
      });
      if (s.order_id) {
        var ord = (S.orders || []).find(function(o) { return o.id === s.order_id; });
        if (ord) ord.status = 'planned';
      }
    });

    RP_STATE.stagedStops = [];
    save();
    toast('Trip #' + tripNo + ' dispatched with ' + loadItems.length + ' SKUs! Ready for loading verification.');
    location.hash = '#my-route';
    render();
    return;
  }

  // Production Plan Actions
  var ppAct = t.dataset.ppAct;
  if (ppAct === 'batch-modal') {
    showProductionBatchModal(t.dataset.sku, +t.dataset.deficit);
    return;
  }
});

/* Event Delegation for Operations Form Submits */
document.addEventListener('submit', function(e) {
  var f = e.target;
  if (!f) return;

  if (f.id === 'deliver-stop-form') {
    e.preventDefault();
    var stopId = f.dataset.stopId;
    var tripId = f.dataset.tripId;
    var stop = (S.tripStops || []).find(function(s) { return s.id === stopId; });
    var cust = stop ? (S.customers || []).find(function(c) { return c.id === stop.customer_id; }) : null;

    var rows = f.querySelectorAll('.del-row');
    var lineItems = [];
    var totalAmt = 0;
    var totalCases = 0;

    rows.forEach(function(r) {
      var prod = (r.querySelector('.del-prod') || {}).value;
      var qty = +((r.querySelector('.del-qty') || {}).value) || 0;
      var rate = +((r.querySelector('.del-rate') || {}).value) || 0;
      if (qty > 0) {
        var tot = qty * rate;
        totalAmt += tot;
        totalCases += qty;
        lineItems.push({
          p: prod,
          product_name: prod,
          q: qty,
          cases: qty,
          bottles: qty * fgPer(prod),
          r: rate,
          rate_per_case: rate,
          case_size: fgPer(prod),
          rate_source: 'manual',
          entered_by: (CURRENT_PROFILE && CURRENT_PROFILE.full_name) || CURRENT_ROLE
        });
      }
    });

    if (!lineItems.length) {
      toast('Please enter delivered items');
      return;
    }

    var isGst = !!($('#del-gst') && $('#del-gst').checked);
    var subtotalAmt = totalAmt;
    var taxAmt = isGst ? round2(subtotalAmt * 0.05) : 0;
    var finalTotal = subtotalAmt + taxAmt;

    var payMode = $('#del-pay-mode') ? $('#del-pay-mode').value : 'Cash';
    var rawPaid = $('#del-paid-amount') ? +$('#del-paid-amount').value : finalTotal;
    var paidAmt = Math.min(Math.max(rawPaid, 0), finalTotal);
    var emptyCans = $('#del-empty-cans') ? +$('#del-empty-cans').value : 0;
    var notes = $('#del-notes') ? $('#del-notes').value.trim() : '';

    var provId = 'PROV-' + (tripId || 'DEL') + '-' + Math.random().toString(36).substring(2, 7).toUpperCase();

    // Create provisional bill locally
    S.bills.push({
      id: provId,
      provisional_id: provId,
      date: today(),
      cust: cust ? cust.id : '',
      items: lineItems,
      subtotal: subtotalAmt,
      tax: taxAmt,
      gst: isGst,
      total: finalTotal,
      paid: paidAmt,
      mode: payMode,
      rate_source: 'manual',
      entered_by: (CURRENT_PROFILE && CURRENT_PROFILE.full_name) || CURRENT_ROLE,
      trip_id: tripId
    });

    if (paidAmt > 0) {
      S.payments.push({
        id: nid('P', S.payments),
        date: today(),
        cust: cust ? cust.id : '',
        amount: paidAmt,
        mode: payMode,
        bill: provId
      });
    }

    var delId = nid('DEL', S.deliveries);
    S.deliveries.push({
      id: delId,
      stop_id: stopId,
      trip_id: tripId,
      bill_id: provId,
      provisional_id: provId,
      delivered_at: new Date().toISOString(),
      delivered_cases: totalCases,
      amount: finalTotal,
      paid: paidAmt,
      payment_mode: payMode,
      empty_cans_returned: emptyCans,
      entered_by: (CURRENT_PROFILE && CURRENT_PROFILE.full_name) || CURRENT_ROLE
    });

    if (stop) {
      stop.status = 'delivered';
      stop.completed_at = new Date().toISOString();
      stop.provisional_receipt = provId;
      if (stop.order_id) {
        var ord = (S.orders || []).find(function(o) { return o.id === stop.order_id; });
        if (ord) ord.status = 'delivered';
      }
    }

    save();
    closeModal();
    render();

    var deliveryPayload = {
      p_trip_id: tripId,
      p_stop_id: stopId,
      p_customer_id: cust ? cust.id : '',
      p_items: lineItems,
      p_total: finalTotal,
      p_amount_received: paidAmt,
      p_payment_mode: payMode,
      p_empty_cans_returned: emptyCans,
      p_notes: notes,
      p_provisional_id: provId,
      p_offline: (typeof navigator !== 'undefined' && navigator.onLine === false),
      p_gst: isGst
    };

    onlineFirstWrite('deliver_stop', '/api/rpc/deliver_stop', deliveryPayload, {
      tripId: tripId,
      stopId: stopId,
      provisionalReceipt: provId
    }).then(function(res) {
      if (res.online && res.official_invoice_no) {
        replaceProvisionalReceipt(provId, res.official_invoice_no, tripId, stopId);
        toast('Delivery recorded! Official Bill #' + res.official_invoice_no + ' issued (' + inr(totalAmt) + ').');
      } else {
        toast('Delivery saved offline to Outbox! Provisional Receipt: ' + provId + '. Pending sync.');
      }
      render();
    }).catch(function(err) {
      toast('Delivery error: ' + (err.message || err));
      render();
    });

    return;
  }

  if (f.id === 'skip-stop-form') {
    e.preventDefault();
    var stopId = f.dataset.stopId;
    var stop = (S.tripStops || []).find(function(s) { return s.id === stopId; });
    var reason = $('#skip-reason') ? $('#skip-reason').value : 'Other';
    var note = $('#skip-note') ? $('#skip-note').value.trim() : '';

    if (stop) {
      stop.status = 'skipped';
      stop.skip_reason = reason + (note ? ' - ' + note : '');
      stop.completed_at = new Date().toISOString();
      save();
      closeModal();
      onlineFirstWrite('skip_stop', '/api/rpc/skip_stop', {
        p_trip_id: stop.trip_id,
        p_stop_id: stop.id,
        p_customer_id: stop.customer_id,
        p_reason: reason,
        p_note: note
      }, { tripId: stop.trip_id, stopId: stop.id });
      toast('Stop marked as skipped');
      render();
    }
    return;
  }

  if (f.id === 'log-order-form') {
    e.preventDefault();
    var stopId = f.dataset.stopId;
    var stop = (S.tripStops || []).find(function(s) { return s.id === stopId; });
    var custId = f.dataset.custId;
    var cust = (S.customers || []).find(function(c) { return c.id === custId; });
    var reqDate = $('#lo-req-date') ? $('#lo-req-date').value : tomorrow();
    var sku = $('#lo-sku') ? $('#lo-sku').value : '20 L Can';
    var cases = $('#lo-cases') ? +$('#lo-cases').value : 10;
    var notes = $('#lo-notes') ? $('#lo-notes').value.trim() : '';

    var pr = (S.settings.products || defProducts()).find(function(p) { return p.n === sku; });
    var rate = (pr && pr.r) || 40;
    var btl = cases * ((pr && pr.c) || 1);
    var tot = cases * rate;

    var ordId = nid('ORD', S.orders);
    var ordNo = 'ORD-' + today().replace(/-/g, '').slice(2) + '-' + Math.floor(1000 + Math.random() * 9000);

    S.orders.push({
      id: ordId,
      order_no: ordNo,
      customer_id: custId,
      order_date: today(),
      requested_date: reqDate,
      status: 'new',
      source: 'stop',
      notes: notes,
      items: [{ product_name: sku, cases: cases, bottles: btl, unit_rate: rate, total_amount: tot }],
      total_amount: tot,
      created_by: (CURRENT_PROFILE && CURRENT_PROFILE.full_name) || CURRENT_ROLE
    });

    save();
    closeModal();
    onlineFirstWrite('log_order_from_stop', '/api/rpc/log_order_from_stop', {
      p_trip_id: stop ? stop.trip_id : '',
      p_stop_id: stopId,
      p_customer_id: custId,
      p_order_no: ordNo,
      p_requested_date: reqDate,
      p_product_name: sku,
      p_cases: cases,
      p_bottles: btl,
      p_unit_rate: rate,
      p_total_amount: tot,
      p_notes: notes
    }, { tripId: stop ? stop.trip_id : '', stopId: stopId });
    toast('Future order booked for ' + (cust ? cust.name : 'Customer') + ' on ' + reqDate + '!');
    return;
  }

  if (f.id === 'prod-batch-form') {
    e.preventDefault();
    var sku = f.dataset.sku;
    var batchNo = $('#pb-no') ? $('#pb-no').value.trim() : ('BATCH-' + today());
    var cases = $('#pb-cases') ? +$('#pb-cases').value : 10;
    var notes = $('#pb-notes') ? $('#pb-notes').value.trim() : '';

    S.fg.push({
      id: nid('F', S.fg),
      kind: 'Production',
      date: today(),
      size: sku,
      qty: cases,
      to: 'P',
      from: '',
      batch: batchNo,
      note: notes,
      by: (CURRENT_PROFILE && CURRENT_PROFILE.full_name) || CURRENT_ROLE,
      at: new Date().toISOString()
    });

    save();
    closeModal();
    toast('Batch ' + batchNo + ' recorded! ' + num(cases) + ' cases credited to Plant stock.');
    render();
    return;
  }

  if (f.id === 'dayclose-handover-form') {
    e.preventDefault();
    var tripId = f.dataset.tripId;
    var trip = (S.trips || []).find(function(t) { return t.id === tripId; });
    if (!trip) return;

    var supId = $('#ho-supervisor') ? $('#ho-supervisor').value : '';
    var cashAmt = $('#ho-cash') ? +$('#ho-cash').value : 0;
    var upiAmt = $('#ho-upi') ? +$('#ho-upi').value : 0;
    var cansCount = $('#ho-cans') ? +$('#ho-cans').value : 0;
    var notes = $('#ho-notes') ? $('#ho-notes').value.trim() : '';

    var hoNo = 'CHO-' + today().replace(/-/g, '').slice(2) + '-' + Math.floor(1000 + Math.random() * 9000);
    var hoRec = {
      id: nid('CHO', S.cashHandovers),
      handover_no: hoNo,
      trip_id: trip.id,
      driver_employee_id: trip.driver_employee_id,
      manager_profile_id: supId,
      gross_cash_amount: cashAmt,
      trip_expenses_amount: 0,
      net_cash_amount: cashAmt,
      upi_amount: upiAmt,
      empty_cans: cansCount,
      handed_over_at: new Date().toISOString(),
      notes: notes
    };

    S.cashHandovers.push(hoRec);
    trip.status = 'settled';
    trip.handoverAt = hoRec.handed_over_at;

    save();
    showHandoverReceiptModal(hoRec, trip);
    render();
    return;
  }
});

/* Event Delegation for Dynamic Updates (Inputs & Selects) */
document.addEventListener('input', function(e) {
  var t = e.target;
  if (!t) return;
  if (t.classList.contains('del-qty') || t.classList.contains('del-rate')) {
    var f = t.closest('#deliver-stop-form');
    if (f) {
      var stop = (S.tripStops || []).find(function(s) { return s.id === f.dataset.stopId; });
      var cust = stop ? (S.customers || []).find(function(c) { return c.id === stop.customer_id; }) : null;
      recalcDeliveryModal(cust);
    }
  }
  if (t.id === 'del-paid-amount') {
    t.dataset.manual = '1';
  }
  if (t.id === 'pb-cases') {
    var form = t.closest('#prod-batch-form');
    var sku = form ? form.dataset.sku : '20 L Can';
    var cases = +t.value || 0;
    var btlEl = document.getElementById('pb-bottles');
    if (btlEl) btlEl.value = cases * fgPer(sku);
  }
});

document.addEventListener('change', function(e) {
  var t = e.target;
  if (!t) return;
  if (t.id === 'del-pay-mode' || t.id === 'del-gst') {
    var f = t.closest('#deliver-stop-form');
    if (f) {
      var stop = (S.tripStops || []).find(function(s) { return s.id === f.dataset.stopId; });
      var cust = stop ? (S.customers || []).find(function(c) { return c.id === stop.customer_id; }) : null;
      if (t.id === 'del-pay-mode') {
        var paidEl = document.getElementById('del-paid-amount');
        if (paidEl) delete paidEl.dataset.manual;
      }
      recalcDeliveryModal(cust);
    }
  }
  if (t.id === 'myroute-trip-select') {
    window.__SELECTED_ROUTE_TRIP_ID = t.value;
    render();
  }
  if (t.id === 'dayclose-trip-select') {
    window.__SELECTED_DAYCLOSE_TRIP_ID = t.value;
    render();
  }
  if (t.id === 'rp-date') {
    RP_STATE.date = t.value;
    render();
  }
  if (t.id === 'rp-vehicle') {
    RP_STATE.vehicle = t.value;
    render();
  }
  if (t.id === 'rp-driver') {
    RP_STATE.driver = t.value;
    render();
  }
  if (t.id === 'pp-date') {
    PP_DATE = t.value;
    render();
  }
});

/* Drag & Drop Reordering for Route Planner */
var dragSrcIdx = null;
document.addEventListener('dragstart', function(e) {
  var item = e.target.closest('.rp-stop-item');
  if (item) {
    dragSrcIdx = parseInt(item.dataset.stopIdx, 10);
    if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move';
  }
});
document.addEventListener('dragover', function(e) {
  var item = e.target.closest('.rp-stop-item');
  if (item && e.dataTransfer) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }
});
document.addEventListener('drop', function(e) {
  var item = e.target.closest('.rp-stop-item');
  if (item && dragSrcIdx !== null) {
    e.preventDefault();
    var targetIdx = parseInt(item.dataset.stopIdx, 10);
    if (dragSrcIdx !== targetIdx && RP_STATE.stagedStops) {
      var moved = RP_STATE.stagedStops.splice(dragSrcIdx, 1)[0];
      RP_STATE.stagedStops.splice(targetIdx, 0, moved);
      render();
    }
    dragSrcIdx = null;
  }
});

PAGES['users'] = userManagementPage;
window.userManagementPage = userManagementPage;
PAGES['my-route'] = myRoutePage;
PAGES['route-planner'] = routePlannerPage;
PAGES['production-plan'] = productionPlanPage;
PAGES['day-close'] = dayClosePage;
window.myRoutePage = myRoutePage;
window.routePlannerPage = routePlannerPage;
window.productionPlanPage = productionPlanPage;
window.dayClosePage = dayClosePage;
window.captureCustomerLocation = captureCustomerLocation;
window.RP_STATE = RP_STATE;
window.num = num;

window.getSession = getSession;
window.setSession = setSession;
window.submitLogin = submitLogin;
window.handleLogout = handleLogout;
window.handleInactivityLogout = handleInactivityLogout;
window.resetInactivityTimer = resetInactivityTimer;
window.showAddUserModal = showAddUserModal;
window.showForcedPasswordChangeModal = showForcedPasswordChangeModal;
window.handleDeactivateUser = handleDeactivateUser;
window.handleResetPassword = handleResetPassword;

window.addEventListener('hashchange',render);
render();
window.NAV=NAV;window.PAGES=PAGES;
window.SYSTEM_ROLES=SYSTEM_ROLES;
window.DUTY_TAGS=DUTY_TAGS;
window.roleRank=roleRank;
window.canCreateRole=canCreateRole;
window.canManageUser=canManageUser;
window.canDeactivateUser=canDeactivateUser;
window.visibleCustomers=visibleCustomers;
window.queueOfflineDelivery=queueOfflineDelivery;
window.KEY_CAFE=KEY_CAFE;
window.setCurrentRole=setCurrentRole;
window.getCurrentRole=getCurrentRole;
window.setCurrentProfile=setCurrentProfile;
window.getCurrentProfile=getCurrentProfile;
window.OutboxDB = OutboxDB;
window.onlineFirstWrite = onlineFirstWrite;
window.syncOutbox = syncOutbox;
window.cacheTripAtStart = cacheTripAtStart;
window.replaceProvisionalReceipt = replaceProvisionalReceipt;
window.priceVarianceReport=priceVarianceReport;
window.loadMyRouteFromSupabase = loadMyRouteFromSupabase;
window.sbGet = sbGet;
window.getSession = getSession;
window.setSession = setSession;
window.save = save;
window.S=S;
})();
