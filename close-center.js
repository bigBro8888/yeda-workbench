"use strict";
const quarterKey="产业基金一期 · 2026 年第三季度";
const closeRoles={maker:"财务经办 · 许舒",checker:"财务复核 · 林然",admin:"实施管理员 · 陈越"};
let closeRole=sessionStorage.getItem("yeda.close.role")||"maker";
let closeTab="cash", ledgerFilter="全部";
const closeActors=()=>'<label class="roleSelect">演示岗位 <select aria-label="季度作业演示岗位" id="closeRole">'+opt(Object.entries(closeRoles),closeRole)+'</select></label>';
const qSeed=[
 ["BK-0712","2026-07-12","甲出资人","LP 实缴",240,"CALL-Q3-A"],
 ["BK-0718","2026-07-18","乙出资人","LP 实缴",160,"CALL-Q3-B"],
 ["BK-0805","2026-08-05","启航材料","项目投资",-620,"FK-Q3-016"],
 ["BK-0821","2026-08-21","成长子基金","子基金出资",-120,"CI-Q3-007"],
 ["BK-0902","2026-09-02","东湾科技","退出回款",300,"TC-Q3-011"],
 ["BK-0915","2026-09-15","基金管理人","管理费用",-60,"FY-Q3-019"],
 ["BK-0930","2026-09-30","托管银行","托管费用",-12,"FY-Q3-022"]
];
function seedClose(){
 const bank=qSeed.map(([ref,date,party,type,amount,proof])=>({ref,date,party,type,cents:Math.round(amount*1000000),proof}));
 return {opening:2012*1000000,bank,book:structuredClone(bank.slice(0,-1)),proposals:[],log:[],versions:[],locked:false,imports:[],drills:[]};
}
db.closeCase??=seedClose();
const cc=()=>db.closeCase;
cc().statement??={closing:1900*1000000,ref:"ST-2026-Q3-001",note:"季度托管对账单期末数",actor:"历史导入"};
function bankStatementPanel(){
 const s=cc().statement;
 drawer("银行期末余额控制数",kv("对账单编号",s.ref)+kv("凭单列示期末余额",wan(s.closing))+kv("按已导流水推算",wan(qTotal(cc().bank)))+kv("复核依据",s.note)+(closeRole==="checker"&&!cc().locked?form("qStatement",field("closing","对账单列示期末（元）","number",(s.closing/100).toFixed(2),"required step=0.01")+cause("proof","新对账单编号")+cause("note","更改依据"),"确认对账单控制数"):""));
}
const wan=cents=>amt(cents/1000000);
function qTotal(rows){return cc().opening+rows.reduce((n,r)=>n+r.cents,0)}
function compareQuarter(){
 const book=new Map(cc().book.map(r=>[r.ref,r])),bank=new Map(cc().bank.map(r=>[r.ref,r]));
 return [...new Set([...bank.keys(),...book.keys()])].map(ref=>{
  const b=bank.get(ref),l=book.get(ref),difference=(b?.cents||0)-(l?.cents||0);
  const state=!l?"业务账缺项":!b?"缺银行流水":difference?"金额不符":b.party!==l.party||b.date!==l.date?"要素不符":"相符";
  return {ref,b,l,difference,state,proposal:cc().proposals.findLast(x=>x.ref===ref&&x.state==="待复核")};
 });
}
function qAudit(action,ref,detail){
 const entry={time:new Date().toLocaleString("zh-CN"),actor:closeRoles[closeRole],action,ref,detail};
 cc().log.unshift(entry);save(action+" · "+ref,entry.actor);
}
function qRoles(el){if(closeRoles[el.value]){closeRole=el.value;sessionStorage.setItem("yeda.close.role",closeRole);render();if($("#panel").open&&$("#panel h2")?.textContent==="海岚智造 · 估值复核")valuation()}}
function qCommit(label,ref,detail){qAudit(label,ref,detail);render();$("#panel").close();announce(label)}
function quarterChecks(){
 const diff=compareQuarter().filter(x=>x.state!=="相符").length,pending=cc().proposals.filter(x=>x.state==="待复核").length;
 return [
 ["银行资金核对",diff===0,diff?diff+" 条差异待解决":"本期逐笔核对相符","cash"],
 ["银行对账单控制数",qTotal(cc().bank)===cc().statement.closing,cc().statement.ref+" · "+wan(cc().statement.closing),"statement"],
 ["调整凭证复核",pending===0,pending?pending+" 笔待复核":"无悬挂调整单","cash"],
 ["确认估值底稿",db.valuation.state==="已确认",db.valuation.state+" · GZ-008","valuation"],
 ["LP 实缴核对",lpQuarter().every(x=>x.book===x.bank),lpQuarter().map(x=>x.name+" "+wan(x.bank)).join(" / "),"accounts"]];
}
function lpQuarter(){
 return lpNames.map((name,i)=>{
  const sumRows=rows=>rows.filter(r=>r.type==="LP 实缴"&&r.party===name).reduce((s,r)=>s+r.cents,0);
  return {name,opening:[57360,38240][i]*1000000,book:sumRows(cc().book),bank:sumRows(cc().bank)};
 });
}
function closeMast(){
 const list=compareQuarter(),diff=list.filter(x=>x.state!=="相符"),balance=qTotal(cc().bank)-qTotal(cc().book);
 return '<section class="quarterMast"><div class="quarterName"><small>季度关账</small><strong>产业基金一期</strong><span>2026.07.01 — 09.30</span></div><div><small>银行期末余额</small><strong>'+wan(qTotal(cc().bank))+'</strong><span>'+cc().bank.length+' 笔银行收支</span></div><div><small>业务账期末余额</small><strong>'+wan(qTotal(cc().book))+'</strong><span>期初 '+wan(cc().opening)+'</span></div><div><small>银行减业务账</small><strong class="'+(balance?"qAmber":"")+'">'+wan(balance)+'</strong><span>'+diff.length+' 条未平事项</span></div></section>';
}
function closeStage(){
 const checks=quarterChecks(),cleared=checks.filter(x=>x[1]).length;
 return card("关账检查",'<div class="gateList">'+checks.map(([name,ok,hint,target])=>cmd(target==="statement"?"qStatementPanel":target==="valuation"?"valuation":"qTab",'<i class="gateMark '+(ok?"pass":"")+'">'+(ok?"✓":"!")+'</i><span><b>'+name+'</b><small>'+esc(hint)+'</small></span>',"gateRow",target)).join("")+'</div>',tag(cc().locked?"已锁定":cleared+" / "+checks.length+" 项通过"));
}
const qNav=[["cash","逐笔对账"],["accounts","出资与持仓"],["versions","关账与报告"],["log","办理记录"]];
function closePage(){
 return title("季度结账工作台","基金财务　/　"+quarterKey,closeActors())+closeMast()+'<div class="viewtabs">'+qNav.map(([id,text])=>cmd("qTab",text,closeTab===id?"active":"",id)).join("")+'</div>'+
 (closeTab==="cash"?cashPage():closeTab==="accounts"?accountPage():closeTab==="versions"?versionPage():logPage());
}
function cashPage(){
 const rows=compareQuarter().sort((a,b)=>Number(a.state==="相符")-Number(b.state==="相符"));
 const filtered=rows.filter(x=>ledgerFilter==="全部"||x.state!=="相符");
 return '<div class="closeLayout"><div>'+card("流水与业务凭证",'<div class="transTools"><div class="seg">'+["全部","仅看差异"].map(s=>cmd("ledgerFilter",s,s===ledgerFilter?"on":"",s)).join("")+'</div><small>金额单位：万元</small></div>'+table(["流水 / 日期","业务与对方","银行","业务账","核对结果"],filtered.map(x=>{const r=x.b||x.l;return tr(['<strong>'+esc(r.ref)+'</strong><small>'+esc(r.date)+'</small>','<b>'+esc(r.type)+'</b><small>'+esc(r.party)+'</small>',x.b?money(x.b.cents/1000000):"—",x.l?money(x.l.cents/1000000):"—",tag(x.proposal?"待复核":x.state)],"qEntry",x.ref)})))+'</div><div>'+closeStage()+card("本期资金变动",block(qSeedTypes().map(([kind,value])=>kv(kind,wan(value))).join("")+kv("期末账面余额",wan(qTotal(cc().book)))))+'</div></div>';
}
function qSeedTypes(){const types=new Map();for(const r of cc().book)types.set(r.type,(types.get(r.type)||0)+r.cents);return [...types]}
function accountPage(){
 return card("出资人资本底稿",table(["出资人","期初实缴","本期业务账","本期银行到账","期末累计实缴"],lpQuarter().map(x=>tr([esc(x.name),wan(x.opening),wan(x.book),wan(x.bank),wan(x.opening+x.book)],"qEntry",x.name===lpNames[0]?"BK-0712":"BK-0718"))))+
 card("估值及资产底稿",table(["底稿","采用口径","金额","复核状态"],[tr(["GZ-008 · 海岚智造","9 月 30 日持仓估值",amt(db.valuation.value),tag(db.valuation.state)],"valuation",""),tr(["NAV-Q3-01 · 其他净资产","历史迁移期初底稿，含其余持仓与往来",amt(90580),tag("示例基线")],"qBase","")]))+
 block('<p class="dim">历史季度采用本期发生日。11 月项目付款和分配在后续期间办理。</p>');
}
function versionPage(){
 const c=cc(),ready=quarterChecks().every(x=>x[1]),btn=c.locked?"申请重开":"锁定本季并生成报告";
 return '<div class="closeLayout"><div>'+card("季度报告版本",table(["版本","基准日","期末现金","净资产","复核人"],c.versions.map(x=>tr(["V"+x.version,"2026-09-30",wan(x.cash),wan(x.nav),esc(x.actor)],"qReport",x.version))))+
 card("季结办理",block(kv("当前期间状态",c.locked?"已锁定":ready?"可锁期":"检查中")+kv("办理岗位",closeRoles.checker)+(closeRole==="checker"&&(c.locked||ready)?cmd("qLockForm",btn,"btn primary"):'<p class="dim">'+(closeRole!=="checker"?"切换财务复核岗位可办理锁期或重开。":"处理未通过的检查后可以锁期。")+'</p>')))+'</div><div>'+closeStage()+'</div></div>';
}
function logPage(){return card("季度办理轨迹",table(["操作时间","岗位 / 人员","操作","业务对象","依据"],cc().log.map(l=>tr([esc(l.time),esc(l.actor),esc(l.action),esc(l.ref),esc(l.detail)]))))}
function entryPanel(ref){
 const x=compareQuarter().find(z=>z.ref===ref);if(!x)return;
 const r=x.b||x.l;
 let body=tag(x.state)+kv("流水编号",ref)+kv("交易日 / 对方",r.date+" · "+r.party)+kv("银行金额",x.b?wan(x.b.cents):"未取得")+kv("业务账金额",x.l?wan(x.l.cents):"尚未登记")+kv("银行减业务账",wan(x.difference))+kv("来源",r.source||"Q3 托管户对账单")+kv("业务凭证",x.l?.proof||"待补录");
 if(x.proposal){const adj=x.proposal;body+=kv("经办人",adj.maker)+kv("调整依据",adj.proof+" · "+adj.note);
  if(closeRole==="checker"&&!cc().locked)body+=form("qReview",formSelect("decision","复核决定",opt([["pass","批准入账"],["return","退回补充"]],"pass"))+cause("note","复核意见"),"提交复核",ref);
 }else if(x.state!=="相符"&&x.b&&!cc().locked&&closeRole==="maker"){
  body+=form("qAdjust",cause("proof","补账或更正凭证编号")+cause("note","差异原因及调整依据"),"提交财务复核",ref);
 }else if(x.state!=="相符"&&!cc().locked)body+='<p class="notice">本项由财务经办登记依据，财务复核确认后更新业务账。</p>';
 const logs=cc().log.filter(l=>l.ref===ref);
 drawer("凭证核对 · "+ref,body+(x.b?cmd("qVoucher","下载来源流水文件","btn",ref):"")+history(logs.map(l=>l.actor+" · "+l.action+" · "+l.detail)));
}
function qLockForm(){
 const reopen=cc().locked;
 drawer(reopen?"登记重开原因":"生成季结快照",kv("期末账面现金",wan(qTotal(cc().book)))+kv("估值底稿","GZ-008 · "+amt(db.valuation.value))+form("qLock",cause("note",reopen?"重开原因及影响范围":"复核说明"),reopen?"重开本期":"锁期并生成版本"));
}
function qReport(id){
 const x=cc().versions.find(v=>v.version===+id);if(!x)return;
 drawer("产业基金一期 · 季结 V"+id,kv("报告基准日","2026-09-30")+kv("复核人",x.actor)+kv("银行 / 业务账",wan(x.bankCash)+" / "+wan(x.cash))+kv("海岚智造估值 · GZ-008",wan(x.valuation))+kv("其他净资产 · NAV-Q3-01",wan(x.other))+kv("本期净资产",wan(x.nav))+kv("复核说明",x.note)+table(["出资人","本期实缴","累计实缴"],x.accounts.map(a=>tr([esc(a.name),wan(a.book),wan(a.opening+a.book)])))+'<h3>采用的凭证</h3>'+table(["流水","业务凭证","金额"],x.book.map(r=>tr([esc(r.ref),esc(r.proof),wan(r.cents)])))+cmd("qExport","导出此版本底稿","btn primary",id));
}
function quarterForm(kind,id,v,error){
 const c=cc(),note=v.note?.trim();if(!note)return error("请填写办理依据。");
 if(kind==="qStatement"){
  const closing=Math.round(Number(v.closing)*100);
  if(closeRole!=="checker"||c.locked||!Number.isSafeInteger(closing)||!v.proof.trim())return error("请核对复核岗位、期末数及凭证编号。");
  const prev=c.statement;c.statement={closing,ref:v.proof.trim(),note,actor:closeRoles[closeRole]};return qCommit("确认独立期末控制数",v.proof,prev.ref+" → "+v.proof+" · "+note);
 }
 if(kind==="qLock"){
  if(closeRole!=="checker")return error("需要财务复核岗位。");
  if(c.locked){c.locked=false;db.quarter.locked=false;return qCommit("重开季度","2026 Q3",note)}
  if(!quarterChecks().every(x=>x[1]))return error("关账检查尚未全部通过。");
  const cash=qTotal(c.book),valuation=Math.round(db.valuation.value*1000000),other=90580*1000000;
  const snap={version:c.versions.length+1,actor:closeRoles[closeRole],note,cash,bankCash:qTotal(c.bank),valuation,other,nav:cash+valuation+other,book:structuredClone(c.book),accounts:lpQuarter(),statement:structuredClone(c.statement),bank:structuredClone(c.bank)};
  c.versions.unshift(snap);c.locked=true;db.quarter.locked=true;db.quarter.version=snap.version;return qCommit("锁期并归档","Q3-V"+snap.version,note);
 }
 if(c.locked)return error("本期已锁定。");
 const x=compareQuarter().find(z=>z.ref===id);if(!x||!x.b||x.state==="相符")return error("该差异已处理或缺少银行依据。");
 if(kind==="qAdjust"){
  if(closeRole!=="maker"||x.proposal||!v.proof?.trim())return error("需要经办人提交有效且未重复的调整单。");
  c.proposals.push({ref:id,maker:closeRoles.maker,proof:v.proof.trim(),note,state:"待复核"});
  return qCommit("提交差异调整",id,note);
 }
 if(closeRole!=="checker"||!x.proposal)return error("需由复核人办理有效调整单。");
 const adj=x.proposal;adj.state=v.decision==="pass"?"已确认":"已退回";adj.reviewer=closeRoles.checker;
 if(v.decision==="pass"){
  const row={...x.b,proof:adj.proof};if(x.l)Object.assign(x.l,row);else c.book.push(row);
 }
 qCommit(v.decision==="pass"?"复核入账":"退回调整",id,note);
}
function downloadLocal(name,text,type="text/plain;charset=utf-8"){
 const link=document.createElement("a"),url=URL.createObjectURL(new Blob([text],{type}));link.href=url;link.download=name;link.click();setTimeout(()=>URL.revokeObjectURL(url),1500);
}
function qExport(id){const v=cc().versions.find(s=>s.version===+id);if(v)downloadLocal("产业基金一期-Q3-V"+id+".json",JSON.stringify(v,null,2),"application/json")}

