"use strict";
const iaTools = {
 post:{title:"投后巡检",icon:"shield",prompt:"检查投后报送、经营指标和待跟进事项"},
 cash:{title:"资金排期",icon:"coin",prompt:"汇总基金可用现金和未来90天资金缺口"},
 lp:{title:"LP 报表",icon:"chart",prompt:"编制 LP 实缴、分配和回报统计报表"}
};
db.agentRuns??=[];
db.agentTodos??=[];
let iaFund="-1",iaLP="-1";
function iaTable(title,headers,rows){return {title,headers,rows}}
function iaRow(cells,action="",id=""){return {cells:cells.map(String),action,id:String(id)}}
function iaPost(i,company){
 const ps=db.projects.filter(p=>p.fund===i&&p.stage==="投后管理"&&(!company||p.name===company)),names=new Set(ps.map(p=>p.name));
 const tasks=db.tasks.filter(t=>t.fund===i&&names.has(t.company)),rows=[];
 for(const t of tasks){
  if(t.status!=="已确认"){
   const late=["待提交","待补正"].includes(t.status)&&t.due<reviewDate;
   rows.push(iaRow([t.company,t.q+" · "+t.status,late?"逾期 · "+t.due:"截止 "+t.due,t.status==="待复核"?"复核提交版本":"跟进报送",t.id],"task",t.id));continue;
  }
  const rule=taskRule(t),val=actualMeasure(t);
  if(val==null||val<rule.target)rows.push(iaRow([t.company,rule.label,val==null?"确认版缺指标":money(val)+rule.unit+" / 目标 "+money(rule.target)+rule.unit,"核对经营底稿",t.id+" V"+t.v],"task",t.id));
 }
 for(const p of ps){
  if(!tasks.some(t=>t.company===p.name))rows.push(iaRow([p.name,"报送覆盖","当前台账无报送记录","核对应报期间",p.id],"projectFollow",p.id));
  for(const t of db.theses[p.id]||[])if(!["已验证","已终止"].includes(t.state))rows.push(iaRow([p.name,t.title,t.state+" · "+t.due,t.action+" · "+t.owner,p.id],"projectFollow",p.id));
 }
 for(const r of db.risks.filter(r=>names.has(r.company)&&r.state!=="已销号"&&(r.fund===i||(r.fund==null&&new Set(db.projects.filter(p=>p.name===r.company).map(p=>p.fund)).size===1)))){
  rows.push(iaRow([r.company,"风险 · "+r.state,r.source,r.action||"复核整改凭证 · "+r.owner,r.id],"risk",r.id));
 }
 return {message:funds[i].name+"覆盖 "+ps.length+" 家在投项目，读取 "+tasks.length+" 条报送，列出 "+rows.length+" 个跟进事项。",tables:[{...iaTable("投后巡检 · "+funds[i].name,["企业","检查事项","发现 / 状态","办理建议","来源"],rows),followFund:i}]};
}
function iaCash(i){
 const flows=forecast(i),cash=settledCash(i),low=flows.find(x=>x.base<0);
 const dest="D/fund-"+i,rows=flows.map(x=>iaRow([x.date,x.label,x.type,money(x.amount),money(x.base),money(x.expected),x.id],"nav",dest));
 return {message:funds[i].name+"可用现金 "+money(cash)+" 万元，"+(cash<0?"基准日已出现缺口。":low?"按已到账口径，首次缺口出现在 "+low.date+"，缺口 "+money(-low.base)+" 万元。":"未来 90 天按现有排期未见资金缺口。"),
  tables:[iaTable("资金头寸 · "+funds[i].name,["基准日","可用现金（万元）","计划支出（万元）","预计到账（万元）"],[iaRow([reviewDate,money(cash),money(sum(flows.filter(x=>x.type!=="预计到账"),"amount")),money(sum(flows.filter(x=>x.type==="预计到账"),"amount"))],"nav",dest)]),
  iaTable("资金排期 · "+funds[i].name+"（万元）",["日期","事项","性质","计划金额","不含预计到账余额","含预计到账余额","依据"],rows)]};
}
function iaLPReport(i,lp){
 if(i!==0)return {message:funds[i].name+"尚未接入分户 LP 底稿。",tables:[]};
 const accounts=lpNames.map((name,j)=>({name,a:lpAccount(j)})).filter(({a})=>lp==="-1"||String(a.i)===lp);
 const multiple=n=>Number.isFinite(n)?n.toFixed(4)+"×":"待核";
 const rows=accounts.map(({name,a})=>iaRow([name,a.asOf,money(a.capital),money(a.distributions),money(a.payable),multiple(a.dpi),multiple(a.tvpi),a.irr==null?"历史流水待补":(a.irr*100).toFixed(2)+"%"],"lpMetrics",a.i));
 return {message:funds[i].name+"汇总 "+rows.length+" 户 LP，累计实缴 "+money(accounts.reduce((n,x)=>n+x.a.capital,0))+" 万元、实收分配 "+money(accounts.reduce((n,x)=>n+x.a.distributions,0))+" 万元。",
 tables:[iaTable("LP 累计统计 · "+funds[i].name+"（万元）",["出资人","截至日期","累计实缴","实收分配","应收未付","DPI","TVPI","年化 IRR"],rows)]};
}
function iaRules(q){
 const tasks=[];
 if(/投后|报送|经营|整改|风险|巡检|逾期|跟进|预警/.test(q))tasks.push("post");
 if(/资金|现金|缺口|排期|头寸|支出/.test(q))tasks.push("cash");
 if(/LP|出资人|分配|回报|DPI|TVPI|IRR|实缴/i.test(q))tasks.push("lp");
 return tasks;
}
const iaExamples=[
 ["post","哪些投后事项需要我跟进？"],
 ["cash","产业基金一期未来 90 天有资金缺口吗？"],
 ["lp","帮我整理甲出资人的实缴和分配情况。"]
];
let iaThread=sessionStorage.getItem("yeda.agent.thread")||"";
let iaPending=null;
const iaThreadKey=r=>r.thread||r.id;
function iaTurns(){return db.agentRuns.filter(r=>iaThreadKey(r)===iaThread).slice().reverse()}
function iaUseThread(key){
 iaPending=null;
 iaThread=key;sessionStorage.setItem("yeda.agent.thread",key);
 const last=iaTurns().at(-1);
 iaFund=last?.fund??String(funds.findIndex(f=>last?.scope?.startsWith(f.name)));
 iaLP=last?.lp??String(lpNames.findIndex(n=>last?.scope?.includes(n)));
}
iaUseThread(iaThread);
function iaMark(){return '<span class="iaMark" aria-hidden="true"><i></i><i></i><i></i></span>'}
function iaComposer(chat){
 const label=iaFund==="-1"?"全部基金":funds[+iaFund].name;
 return '<form class="iaComposer" data-form="iaRun"><textarea aria-label="给投资业务智能体发消息" name="question" maxlength="400" required rows="2" placeholder="'+(chat?"继续追问，或交办下一项任务…":"问问投资业务智能体…")+'"></textarea><div class="iaComposerBar"><details class="iaScope"><summary>'+ico("fund")+'<span>'+esc(label)+(iaLP==="-1"?"":" · "+esc(lpNames[+iaLP]))+'</span> ⌄</summary><div><label>基金<select name="fund">'+opt([["-1","全部基金"],...funds.map((f,i)=>[i,f.name])],iaFund)+'</select></label><label>出资人<select name="lp">'+opt([["-1","全部出资人"],...lpNames.map((n,i)=>[i,n])],iaLP)+'</select></label></div></details><div class="iaSendGroup"><small>Enter 发送</small><button type="submit" class="iaSend" aria-label="发送消息" title="发送消息">↑</button></div></div><p class="error" role="status"></p></form>';
}
function iaPage(){
 const turns=iaTurns(),last=turns.at(-1);
 const header='<header class="iaHeader"><div>'+iaMark()+'<h1>投资业务智能体</h1></div><nav>'+cmd("iaWorkspaceRail",ico("menu")+"工作空间","iaToolBtn iwMobileOnly")+'</nav></header>';
 const welcome='<section class="iaWelcome">'+iaMark()+'<h2>今天想了解哪项投资业务？</h2><p>查投后事项、看资金缺口，或生成一份 LP 报表。</p>'+iaComposer(false)+'<div class="iaExamples">'+iaExamples.map(([id,q])=>cmd("iaPreset",ico(iaTools[id].icon)+'<span>'+q+'</span><b aria-hidden="true">↗</b>',"iaExample",id)).join("")+'</div></section>';
 const suggested=last?(last.plan.includes("cash")?"哪些支出形成了资金缺口？":last.plan.includes("post")?"只看逾期报送":"查看这份报表的依据"):"";
 const pending=iaPending?'<section class="iaTurn"><p class="iaQuestion">'+esc(iaPending.question)+'</p><div class="iaAgentLabel">'+iaMark()+'<strong>投资业务智能体</strong></div><p class="iaWorking" role="status">'+esc(iaPending.status)+'</p></section>':"";
 const footer=iaPending?cmd("iaCancel","取消本轮","iaNext"):cmd("iaNext",esc(suggested)+" ↗","iaNext",suggested)+iaComposer(true);
 const feed='<section class="iaFeed" aria-label="对话记录">'+turns.map(iaResult).join("")+pending+'</section><footer class="iaDock">'+footer+'</footer>';
 return iwLayout(header,last||iaPending?feed:welcome);
}
function iaResult(r){
 const tables=r.tables.map(t=>'<details class="iaEvidence"><summary>'+esc(t.title)+' <small>'+t.rows.length+' 条</small></summary>'+table([...t.headers,"底稿"],t.rows.map(row=>tr([...row.cells.map(esc),row.action?cmd(row.action,"查看","textbtn",row.id):"—"])))+'</details>').join("");
 const ops=cmd("iaCSV","导出 CSV","iaToolBtn",r.id)+(r.state==="待复核"?cmd("iaReview","确认已复核","iaToolBtn",r.id):r.tables.some(t=>t.followFund!=null&&t.rows.length)?cmd("iaDispatch","生成巡检待办","iaToolBtn",r.id):"");
 return '<section class="iaTurn"><p class="iaQuestion">'+esc(r.question)+'</p><div class="iaAgentLabel">'+iaMark()+'<strong>投资业务智能体</strong></div><div class="iaAnswer"><small>'+esc(r.scope)+" · "+esc(r.engine)+'</small>'+r.notes.map(n=>'<p>'+esc(n)+'</p>').join("")+tables+'<div class="iaOutputs">'+tag(r.state)+ops+'</div></div></section>';
}
function iaContinuation(q,last){
 if(!last)return null;
 if(/^(查看这份报表的依据|查看依据|依据是什么)[？?。]?$/.test(q))return {plan:last.plan,notes:["以下是上一条分析采用的 "+last.tables.length+" 份台账明细。展开后可逐项核对来源。"],tables:last.tables};
 if(/只看逾期|哪些报送逾期/.test(q)&&last.plan.includes("post")){
  const tables=last.tables.filter(t=>t.followFund!=null).map(t=>({...t,rows:t.rows.filter(r=>r.cells[2].startsWith("逾期 · "))}));
  return {plan:["post"],tables,notes:tables.map(t=>t.title+"有 "+t.rows.length+" 条逾期报送。")};
 }
 if(/哪些支出形成|缺口.*(原因|怎么来)|为什么.*缺口/.test(q)&&last.plan.includes("cash")){
  const tables=last.tables.filter(t=>t.title.startsWith("资金排期")),notes=[];
  const number=s=>Number(s.replaceAll(",",""));
  for(const t of tables){
   const name=t.title.split(" · ")[1].split("（")[0],first=t.rows.findIndex(r=>number(r.cells[4])<0);
   if(first<0){notes.push(name+"的排期内未出现负余额。");continue}
   const gap=t.rows[first].cells,expenses=t.rows.slice(0,first+1).filter(r=>r.cells[2]!=="预计到账");
   notes.push(name+"在 "+gap[0]+" 的计划事项后，按已到账口径余额为 "+gap[4]+" 万元。截至该笔，排期内支出为 "+(expenses.map(r=>r.cells[1]+" "+r.cells[3]+" 万元").join("、")||"0 万元")+"。");
  }
  return {plan:["cash"],tables,notes};
 }
 return null;
}
async function iaRun(f){
 if(iaPending||externalCompany)return;
 const data=new FormData(f),q=String(data.get("question")).trim(),msg=f.querySelector(".error");
 let fund=String(data.get("fund")),lp=String(data.get("lp"));
 if(!q){msg.textContent="请填写任务要求。";return}
 if(/(?:执行|直接|帮我|立即).{0,14}(?:付款|转账|记账|划款)|上季度|去年|上个月|本季度|按月|按季|20\d{2}\s*[年Q季/-]/i.test(q)){msg.textContent="当前任务支持台账累计统计、当前投后巡检及未来90天排期。请调整任务口径。";return}
 const fs=funds.map((f,i)=>q.includes(f.name)?i:-1).filter(i=>i>=0);
 const ls=lpNames.map((n,i)=>q.includes(n)?i:-1).filter(i=>i>=0);
 if(fs.length>1||ls.length>1){msg.textContent="每次可以分析一个主体或全部主体，请指定范围。";return}
 if(fs.length)fund=String(fs[0]);if(ls.length)lp=String(ls[0]);
 const previous=iaTurns().at(-1);
 if(q.includes("全部基金"))fund="-1";if(q.includes("全部出资人"))lp="-1";
 const request={question:q,status:"正在识别任务范围…",fund,lp};
 iaPending=request;render();iaScroll();
 try{
  let plan=iaRules(q),engine="本地业务规则";
  const asksCompany=db.projects.some(p=>q.includes(p.name));
  const follow=previous&&fund===iaFund&&lp===iaLP&&!fs.length&&!ls.length&&!asksCompany&&!q.includes("全部企业")?iaContinuation(q,previous):null;
  if(follow){plan=follow.plan;engine="引用上轮底稿"}
  else{
   try{const d=await ddApi("agent-plan",{question:q});if(d.available){plan=d.tasks;engine="本机模型规划"}else if(d.offline)engine+="（本机模型暂不可用）"}catch{/* Local business tools work without the planner. */}
   if(!plan.length&&previous&&(fs.length||ls.length||/^(重新分析|再查一次|换成全部基金)[。？?]?$/.test(q)))plan=previous.plan;
  }
  if(iaPending!==request||route!=="agent"||externalCompany)return;
  if(!plan.length||plan.some(k=>!Object.hasOwn(iaTools,k)))throw Error("暂未识别可执行的业务任务。可选择投后巡检、资金排期或 LP 报表。");
  const companies=[...new Set(db.projects.filter(p=>q.includes(p.name)).map(p=>p.name))];
  if(!companies.length&&previous?.company&&plan.length===1&&plan[0]==="post"&&fund===iaFund&&!fs.length&&!q.includes("全部企业"))companies.push(previous.company);
  if(companies.length&&(companies.length>1||plan.some(k=>k!=="post")))throw Error("企业维度支持单家投后巡检，基金和 LP 统计请按基金范围执行。");
  if(companies.length&&!db.projects.some(p=>p.name===companies[0]&&p.stage==="投后管理"&&(fund==="-1"||String(p.fund)===fund)))throw Error("所选范围中没有该企业的在投项目。");
  const results=[];request.status=follow?"正在核对上轮分析快照…":"正在读取"+plan.map(k=>iaTools[k].title).join("、")+"底稿…";
  const status=$(".iaWorking");if(status)status.textContent=request.status;
  if(!follow)for(const kind of plan)for(let i=0;i<funds.length;i++)if(fund==="-1"||String(i)===fund){
   if(companies.length&&!db.projects.some(p=>p.name===companies[0]&&p.fund===i))continue;
   const result=kind==="post"?iaPost(i,companies[0]):kind==="cash"?iaCash(i):iaLPReport(i,lp);
   if(kind==="post"&&/只看逾期|哪些报送逾期/.test(q)){
    const filtered=iaContinuation("只看逾期",{plan:["post"],tables:result.tables});
    result.tables=filtered.tables;result.message=filtered.notes.join(" ");
   }
   results.push(result);
  }
  const run={id:crypto.randomUUID(),thread:iaThread||crypto.randomUUID(),workspaceProject:iwCurrentProject(),fund,lp,company:companies[0],question:q,scope:(fund==="-1"?"全部基金":funds[+fund].name)+(companies.length?" · "+companies[0]:"")+(plan.includes("lp")?" · "+(lp==="-1"?"全部出资人":lpNames[+lp]):""),time:new Date().toLocaleString("zh-CN"),state:"待复核",engine,plan,notes:follow?.notes||results.map(r=>r.message),tables:follow?.tables||results.flatMap(r=>r.tables)};
  db.agentRuns.unshift(run);
  try{save("智能体执行 · "+q)}catch(e){db.agentRuns.shift();throw e}
  iaUseThread(run.thread);render();iaScroll();announce("分析已完成");
 }catch(e){if(iaPending===request&&route==="agent"){iaRestoreDraft(request);$(".iaComposer .error").textContent=e.message}}
}
function iaRestoreDraft(request){
 iaPending=null;render();iaScroll();
 const f=$(".iaComposer");f.elements.question.value=request.question;f.elements.fund.value=request.fund;f.elements.lp.value=request.lp;
 f.elements.fund.dispatchEvent(new Event("change",{bubbles:true}));f.elements.question.focus();
}
window.addEventListener("hashchange",()=>{iaPending=null});
function iaAction(action,id){
 if(externalCompany)return;
 if(action==="iaCancel"&&iaPending){iaRestoreDraft(iaPending);return}
 if(action.startsWith("iaWorkspace")){iwAct(action,id);return}
 if(action==="iaNew"){iwDraft("");return}
 if(action==="iaHistory"){iwHistory();return}
 if(action==="iaResume"){iaUseThread(id);$("#panel").close();render();iaScroll();return}
 if(action==="iaTodo"||action==="iaFinish"){
  const t=db.agentTodos.find(x=>x.id===id);if(!t)return;
  if(action==="iaFinish"){if(!t.done){t.done=true;save("完成巡检待办 · "+t.title)}$("#panel").close();render();return}
  drawer(t.title,kv("办理依据",t.sub)+kv("下一步",t.next)+cmd(t.sourceAction,"查看业务底稿","btn",t.sourceId)+(t.done?"":cmd("iaFinish","标记已办理","btn primary",t.id)));return;
 }
 if(action==="iaPreset"||action==="iaNext"){
  const f=document.querySelector('[data-form=iaRun]');if(!f||f.dataset.busy)return;
  f.elements.question.value=action==="iaNext"?id:iaExamples.find(x=>x[0]===id)?.[1]||"";f.requestSubmit();return;
 }
 const run=db.agentRuns.find(x=>x.id===id);if(!run)return;
 if(action==="iaShow"){iaUseThread(iaThreadKey(run));render();iaScroll();return}
 if(action==="iaReview"&&run.state==="待复核"){run.state="已复核";save("复核智能体报表 "+run.id);render();return}
 if(action==="iaDispatch"&&run.state==="已复核"){
  let count=0;
  for(const t of run.tables.filter(t=>t.followFund!=null))for(const r of t.rows){
   const key=JSON.stringify([t.followFund,r.action,r.id,r.cells[1],r.cells[2]]);
   if(db.agentTodos.some(x=>x.key===key))continue;
   db.agentTodos.push({key,id:crypto.randomUUID(),fund:t.followFund,title:r.cells[0]+" · "+r.cells[1],sub:r.cells[2]+" · "+r.cells[4],next:r.cells[3],sourceAction:r.action,sourceId:r.id,done:false});count++;
  }
  if(count)save("智能体生成巡检待办 "+count+" 项");go("todo");announce(count?"已生成 "+count+" 项巡检待办":"这些事项已有办理记录");return;
 }
 if(action==="iaCSV"){
  const rows=[[run.question],[run.scope,run.time,run.state,run.engine],...run.notes.map(x=>[x])];
  for(const t of run.tables)rows.push([],[t.title],[...t.headers,"依据"],...t.rows.map(r=>[...r.cells,r.action==="lpMetrics"?lpNames[Number(r.id)]+" · 回报底稿":r.action==="nav"?"基金资金计划 "+r.id:r.id]));
  const cell=v=>{const s=String(v);return '"'+(/^[\s]*[=+@-]/.test(s)&&!/^-[\d,.]+$/.test(s)?"'":"")+s.replace(/"/g,'""')+'"'};
  const u=URL.createObjectURL(new Blob(["\ufeff"+rows.map(r=>r.map(cell).join(",")).join("\r\n")],{type:"text/csv;charset=utf-8"}));
  const a=document.createElement("a");a.href=u;a.download="投资业务分析-"+run.id.slice(0,8)+".csv";a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);
 }
}
function iaScroll(){const feed=$(".iaFeed");if(feed)feed.scrollTop=feed.scrollHeight}
document.addEventListener("keydown",e=>{
 if(e.target.matches('.iaComposer textarea')&&e.key==="Enter"&&!e.shiftKey&&!e.isComposing&&e.keyCode!==229){
  e.preventDefault();e.target.form.requestSubmit();
 }
});
document.addEventListener("change",e=>{
 if(!e.target.closest(".iaScope"))return;
 const f=e.target.form,labels=[f.elements.fund.selectedOptions[0].text,f.elements.lp.selectedOptions[0].text];
 f.querySelector("summary span").textContent=labels.filter((x,i)=>i===0||x!=="全部出资人").join(" · ");
});
