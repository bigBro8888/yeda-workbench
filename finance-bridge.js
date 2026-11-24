"use strict";
db.financeOrders??=[];
const fbPeople={business:"业务经办 · 周宁",approve:"业务审批 · 投资负责人",finance:"财务确认 · 林然"};
let fbRole="business",fbFilter="全部";
const fbInbox=()=>route==="finance"&&location.hash==="#finance/inbox";
const fbActor=()=>fbInbox()?"finance":fbRole;
const fbStates=["待业务审批","待财务确认","待出证明","已出证明","已退回","已冲销"];
const fbPending=o=>["待业务审批","待财务确认"].includes(o.state);
const fbFen=n=>Math.round(n*1000000);
const fbMoney=n=>money(n/1000000)+" 万元";
const fbTime=()=>new Date().toLocaleString("zh-CN");
function fbSources(){
 const x=db.exit,all=[];
 function add(key,title,party,ref,fund,dir,amount,earliest=""){
  if(fbFen(amount)>0)all.push({key,title,party,ref,fund,dir,limit:fbFen(amount),earliest});
 }
 add("call","LP 出资到账",lpNames[0],"CALL-01 / BK-901",0,"收款",100-db.paid);
 if(db.paid>0)add("reverse","LP 核销冲销",lpNames[0],"CALL-01 / BK-901",0,"冲销",db.paid,db.cashlog.map(r=>r.date).sort().at(-1));
 for(const p of db.projects)if(p.stage==="已放行"&&!p.payment)add("project/"+p.id,"投资款支付",p.name,p.id,p.fund,"付款",p.amount,p.releaseDate||"");
 if(x.status==="已批准"&&x.delivery)add("exit","退出回款","","TC-003",0,"收款",300-sum(x.receipts,"amount"),x.delivery.date);
 if(x.approved)lpNames.forEach((party,i)=>add("lp/"+i,"LP 分配支付",party,"TC-003 / 分配方案",0,"付款",(i?80:120)-sum(x.distribution.filter(r=>r.lp===i),"amount"),x.approvedDate));
 return all;
}
function fbFree(s){
 const pending=db.financeOrders.filter(fbPending);
 if(["call","reverse"].includes(s.key)&&pending.some(o=>["call","reverse"].includes(o.key)&&o.key!==s.key))return 0;
 return s.limit-pending.filter(o=>o.key===s.key).reduce((n,o)=>n+o.amount,0);
}
function fbRoleSelect(){return fbInbox()?tag("财务确认岗"):'<label class="roleSelect">演示岗位 <select data-fb-role>'+opt(Object.entries(fbPeople),fbRole)+'</select></label>'}
function fbList(list){
 return table(["指令号 / 事项","基金 / 往来方","方向","金额","办理状态"],list.map(o=>tr([esc(o.id)+"<small>"+esc(o.title)+"</small>",esc(funds[o.fund].name)+"<small>"+esc(o.party)+"</small>",esc(o.dir),fbMoney(o.amount),tag(o.state)],"fbOpen",o.id)));
}
function fbPage(){
 if(fbInbox())return title("财务收件箱","联调演示　/　与业务窗口共用本机浏览器数据",fbRoleSelect())+
 card("待确认的收付款指令",fbList(db.financeOrders.filter(o=>o.state==="待财务确认")))+
 card("已办理指令",fbList(db.financeOrders.filter(o=>o.receipt||o.financeReturned)));
 const sources=fbSources().filter(s=>fbFree(s)>0);
 return title("资金与财务协同","业务审批 → 财务收付款确认 → 业务出具证明",'<a class="btn" href="?v=8#finance/inbox" target="_blank" rel="noopener">打开财务收件箱（演示）</a>'+fbRoleSelect())+
 '<div class="dossierHero">'+numbers([["待业务审批",db.financeOrders.filter(o=>o.state==="待业务审批").length+" 笔","审核收付款依据"],["待财务确认",db.financeOrders.filter(o=>o.state==="待财务确认").length+" 笔","核对银行回单与记账凭证"],["待出证明",db.financeOrders.filter(o=>o.state==="待出证明").length+" 笔","业务经办出具确认件"]])+'</div>'+
 card("可发起的资金事项",table(["业务依据","往来方","事项","可申请金额","办理"],sources.map(s=>tr([esc(s.ref),esc(s.party||"按转让协议填写"),s.title,fbMoney(fbFree(s)),fbActor()==="business"?cmd("fbNew","发起申请","textbtn",s.key):"业务经办发起"]))))+
 card("收付款指令",fbList(db.financeOrders.filter(o=>fbFilter==="全部"||o.state===fbFilter)),'<select id="fbFilter" aria-label="按办理状态筛选">'+opt(["全部",...fbStates].map(x=>[x,x]),fbFilter)+'</select>');
}
function fbEntry(key){
 const s=fbSources().find(s=>s.key===key);
 const orders=db.financeOrders.filter(o=>o.key===key);
 return (s&&fbFree(s)>0?cmd("fbNew","申请"+esc(s.title),"btn primary",key):"")+
 (orders.length?fbList(orders):"")+cmd("nav","进入资金与财务协同","textbtn","finance");
}
function fbNew(key){
 if(fbActor()!=="business"){announce("请切换至业务经办岗位");return}
 const s=fbSources().find(s=>s.key===key);if(!s||fbFree(s)<=0)return announce("该事项已全部办理或在审批中");
 const max=fbFree(s)/1000000,full=key.startsWith("project/")||key==="reverse";
 drawer(s.title+"申请",kv("基金 / 往来方",funds[s.fund].name+" / "+(s.party||"转让协议受让方"))+kv("业务依据",s.ref)+form("fbApply",(key==="exit"?field("party","转让协议实际付款人","text","","required maxlength=120"):"")+
 field("amount","申请金额（万元）","number",max,'required step="0.01" min="0.01" max="'+max+'" '+(full?"readonly":""))+cause("note","申请事由或审批文件编号"),"提交业务审批",key));
}
function fbInstruction(o){
 return {schema:"yeda.funds.v1",orderId:o.id,businessRef:o.ref,fund:funds[o.fund].name,counterparty:o.party,direction:o.dir,currency:"CNY",amountFen:o.amount};
}
function fbProof(o){
 return '<h2>'+esc(o.dir==="收款"?"收款确认":o.dir==="付款"?"付款确认":"核销冲销")+"证明（演示）</h2>"+
 [["证明编号",o.cert],["业务指令",o.id],["业务事项",o.title],["基金",funds[o.fund].name],["往来方",o.party],["金额",fbMoney(o.amount)],["业务依据",o.ref],["财务业务日期",o.receipt.date],["财务凭证号",o.receipt.voucher],["银行回单 / 调整依据",o.receipt.bank],["出具时间",o.issuedAt],["经办岗位",fbPeople.business]].map(([l,v])=>kv(l,v)).join("");
}
function fbOpen(id){
 const o=db.financeOrders.find(o=>o.id===id);if(!o)return;
 let body=fbRoleSelect()+kv("当前环节",o.state)+kv("业务指令",o.id)+kv("业务依据",o.ref)+kv("基金 / 往来方",funds[o.fund].name+" / "+o.party)+kv(o.title,fbMoney(o.amount))+kv("申请事由",o.note);
 if(o.state==="待业务审批"&&fbActor()==="approve")body+=form("fbApprove",formSelect("decision","审批结果",opt([["pass","同意"],["return","退回"]],"pass"))+cause("note","审批意见"),"提交审批",o.id);
 if(o.state==="待财务确认"){
  body+=cmd("fbExport","导出财务指令 JSON","btn",id);
  if(fbActor()==="finance"){
   body+=cmd("fbTemplate","下载回执模板","textbtn",id)+'<label>载入财务回执 JSON<input type="file" id="fbUpload" accept=".json" data-id="'+esc(id)+'"></label><p id="fbFeedback" role="status"></p>'+
   form("fbConfirm",when("date","财务实际业务日期")+field("voucher","财务凭证号","text","","required maxlength=100")+field("bank","银行回单号或冲销凭据","text","","required maxlength=100")+field("actual","回执金额（万元）","number","","required min=0.01 step=0.01"),"确认财务回执并更新台账",id)+form("fbReturn",cause("note","金额不符或退回原因"),"退回业务经办",id);
  }
 }
 if(o.receipt)body+=kv("财务确认",o.receipt.date+" · "+o.receipt.voucher+" · "+o.receipt.bank);
 if(o.state==="待出证明"&&fbActor()==="business")body+=cmd("fbIssue","出具业务证明","btn primary",id);
 if(o.state==="已出证明")body+=fbProof(o)+cmd("fbProof","下载可打印证明","btn",id);
 if(o.state==="已退回"&&fbActor()==="business")body+=cmd("fbNew","重新申请","btn",o.key);
 body+=history(o.history);drawer(o.title,body);$("#panel").dataset.fbId=o.id;
}
function fbCommit(o,label){
 o.history.push(fbTime()+" · "+fbPeople[fbActor()]+" · "+label);
 save(label+" "+o.id,fbPeople[fbActor()]);render();fbOpen(o.id);announce(label);
}
function fbBook(o,r){
 const amount=o.amount/1000000, item={date:r.date,amount,proof:r.bank,voucher:r.voucher,order:o.id};
 if(o.key==="call"||o.key==="reverse"){
  const delta=o.key==="call"?amount:-amount;
  db.paid=(fbFen(db.paid)+fbFen(delta))/1000000;
  db.cashlog.push({...item,amount:delta,note:o.title+" · "+r.bank});
  if(o.key==="reverse")for(const prior of db.financeOrders.filter(x=>x.key==="call"&&["待出证明","已出证明"].includes(x.state))){
   prior.state="已冲销";prior.history.push(fbTime()+" · 冲销单 "+o.id);
  }
 }else if(o.key.startsWith("project/")){
  const p=getProject(o.key.slice(8));p.payment=item;p.stage="投后管理";p.history.push(r.date+" · 财务确认付款 "+r.bank+" · "+o.id);
 }else{
  if(o.key==="exit")db.exit.receipts.push(item);else db.exit.distribution.push({...item,lp:Number(o.key.slice(3))});
  db.exit.history.push(r.date+" · "+o.title+" "+amount+" 万元 · "+o.id+" · "+r.bank);
 }
}
function fbAct(act,id){
 if(externalCompany)return;
 if(act==="fbNew")return fbNew(id);
 if(act==="fbOpen")return fbOpen(id);
 const o=db.financeOrders.find(o=>o.id===id);if(!o)return;
 if(act==="fbIssue"&&o.state==="待出证明"&&fbActor()==="business"){
  o.cert="ZM-"+o.id.slice(3);o.issuedAt=fbTime();o.state="已出证明";return fbCommit(o,"已出具证明");
 }
 if(act==="fbProof"&&o.state==="已出证明")return downloadLocal(o.cert+".html",'<!doctype html><meta charset="utf-8"><title>'+esc(o.cert)+'</title><style>body{max-width:680px;margin:60px auto;font:16px/2 sans-serif;color:#203648}.kv{display:flex;justify-content:space-between;border-bottom:1px solid #ddd}h2{text-align:center}</style>'+fbProof(o),"text/html;charset=utf-8");
 if(o.state!=="待财务确认")return;
 const data=fbInstruction(o);
 if(act==="fbTemplate")Object.assign(data,{date:"",voucher:"",bank:""});
 if(act==="fbExport"||act==="fbTemplate")downloadLocal(o.id+(act==="fbExport"?"-指令":"-回执模板")+".json",JSON.stringify(data,null,2),"application/json");
}
function fbSubmit(f){
 const v=Object.fromEntries(new FormData(f)),id=f.dataset.id,kind=f.dataset.form;
 const error=s=>{f.querySelector(".error").textContent=s};
 if(kind==="fbApply"){
  const s=fbSources().find(x=>x.key===id),amount=fbFen(Number(v.amount));
  if(fbActor()!=="business"||!s||!Number.isSafeInteger(amount)||amount<=0||amount>fbFree(s)||!v.note.trim()||((id==="reverse"||id.startsWith("project/"))&&amount!==s.limit))return error("请核对可用额度、办理岗位与申请事由。");
  const party=s.party||v.party?.trim();if(!party)return error("请填写实际付款人。");
  const o={...s,party,id:"ZJ-"+crypto.randomUUID().toUpperCase(),amount,note:v.note.trim(),state:"待业务审批",history:[]};db.financeOrders.unshift(o);return fbCommit(o,"已提交业务审批");
 }
 const o=db.financeOrders.find(o=>o.id===id);if(!o)return;
 if(kind==="fbApprove"&&fbActor()==="approve"&&o.state==="待业务审批"&&v.note.trim()){
  o.state=v.decision==="pass"?"待财务确认":"已退回";return fbCommit(o,o.state+" · "+v.note.trim());
 }
 if(o.state!=="待财务确认"||fbActor()!=="finance")return error("当前岗位或状态无法办理。");
 if(kind==="fbReturn"&&v.note.trim()){o.state="已退回";o.financeReturned=true;return fbCommit(o,"财务退回 · "+v.note.trim())}
 if(kind!=="fbConfirm")return;
 const s=fbSources().find(x=>x.key===o.key);
 if(!s||s.limit<o.amount||fbFen(+v.actual)!==o.amount)return error("回执金额必须与指令一致且在未结余额内。");
 if(!/^\d{4}-\d\d-\d\d$/.test(v.date)||v.date>new Date().toLocaleDateString("sv-SE")||v.date<(s.earliest||"")||(cc().locked&&v.date<="2026-09-30"))return error("请核对实际日期、前序业务日期及锁定期间。");
 const voucher=v.voucher.trim(), bank=v.bank.trim();if(!voucher||!bank)return error("请填写财务凭证号及回单依据。");
 if(o.key==="call"&&bank!=="BK-901")return error("该核销申请对应银行回单 BK-901，请核对原始回执。");
 if(o.dir!=="冲销"&&db.financeOrders.some(x=>x.fund===o.fund&&x.receipt?.bank===bank&&x.dir===o.dir&&!(x.key==="call"&&o.key==="call")))return error("该基金已登记此笔银行回单。");
 if(db.financeOrders.some(x=>x.receipt&&x.fund===o.fund&&x.receipt.voucher===voucher))return error("该基金已登记此财务凭证号。");
 if(o.key==="exit"&&db.exit.receipts.some(x=>x.proof===bank)||o.key.startsWith("lp/")&&db.exit.distribution.some(x=>x.proof===bank))return error("该回单已登记。");
 o.receipt={date:v.date,voucher,bank};fbBook(o,o.receipt);o.state="待出证明";fbCommit(o,"财务已确认并更新业务台账");
}
document.addEventListener("change",async e=>{
 const el=e.target;if(externalCompany)return;
 if(el.hasAttribute("data-fb-role")){fbRole=el.value;const panel=$("#panel"),id=panel.open&&panel.contains(el)&&panel.dataset.fbId;render();if(id)fbOpen(id);return}
 if(el.id==="fbFilter"){fbFilter=el.value;render();return}
 if(el.id!=="fbUpload"||fbActor()!=="finance"||!el.files[0])return;
 const out=$("#fbFeedback"),f=$("#panel [data-form=fbConfirm]"),o=db.financeOrders.find(x=>x.id===el.dataset.id);
 try{
  if(el.files[0].size>32768)throw Error("回执文件过大。");
  const data=JSON.parse((await el.files[0].text()).replace(/^\uFEFF/,""));
  if(!el.isConnected)return;
  if(Object.entries(fbInstruction(o)).some(([k,v])=>data?.[k]!==v))throw Error("指令、主体、币种、方向或金额不符。");
  if(![data.date,data.voucher,data.bank].every(s=>typeof s==="string"&&s.trim()))throw Error("请补齐回执日期、财务凭证号和银行回单号。");
  for(const k of ["date","voucher","bank"])f.elements[k].value=data[k];
  f.elements.actual.value=data.amountFen/1000000;out.textContent="回执已匹配，核对后点击确认。";
 }catch(err){f.reset();out.textContent="未载入回执："+err.message}
});
window.addEventListener("storage",e=>{
 if(e.key!==storageKey||externalCompany||route!=="finance"||e.newValue===knownRevision)return;
 const panel=$("#panel");
 if(panel.open&&panel.querySelector("form")){announce("其他窗口有更新。请核对已填内容，刷新后办理。");return}
 sessionStorage.setItem("yeda.financeResume",JSON.stringify({role:fbRole,id:panel.open?panel.dataset.fbId:""}));
 location.reload();
});
document.addEventListener("DOMContentLoaded",()=>{
 const memo=sessionStorage.getItem("yeda.financeResume");sessionStorage.removeItem("yeda.financeResume");
 if(!memo||route!=="finance"||externalCompany)return;
 try{const s=JSON.parse(memo);if(fbPeople[s.role])fbRole=s.role;render();if(s.id)fbOpen(s.id)}catch{}
});
