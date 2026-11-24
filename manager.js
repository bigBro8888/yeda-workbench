"use strict";
const reviewDate = "2026-11-24";
const flagshipId = "XM-2601";
const amt = n => money(n) + " 万元";
const getProject = id => db.projects.find(p => p.id === id);
const projectUrl = (id,tab="overview") => "B/"+id+"/"+tab;
const project = id => go("B", id);
const fund = id => go("D","fund-"+id);
const card = (name,body,action="") => '<section class="panel dossierCard">'+panelHead(name,action)+body+'</section>';
const block = html => '<div class="cardbody">'+html+'</div>';
const numbers = entries => '<div class="managerNumbers">'+entries.map(([key,value,hint])=>'<div><small>'+esc(key)+'</small><strong>'+esc(value)+'</strong><span>'+esc(hint)+'</span></div>').join("")+'</div>';
function initializeManager(){
 if(!db.projects.some(p=>p.id==="XM-JG01"))db.projects.push({id:"XM-JG01",name:"泽航精工",industry:"高端装备",fund:0,amount:680,owner:"陈越",stage:"待交割",payDue:"2026-12-05",reason:"核心设备已通过两家客户验证，拟支持扩产。",risk:"交割前需完成协议签章。",history:["2026-11-20 · 投委会附条件通过 TW-026"],conditions:[{name:"增资协议签章齐全",owner:"陈越",reviewer:"法务负责人"},{name:"董事会决议生效",owner:"陈越",reviewer:"风控负责人",proof:"DS-026",confirmed:true,date:"2026-11-23"}]});
 if(!db.tasks.some(t=>t.id==="QB-HL-Q2"))db.tasks.push({id:"QB-HL-Q2",company:"海岚智造",fund:0,q:"2026 Q2",due:"2026-07-15",status:"已确认",v:1,rev:1100,cost:770,orders:5200,policy:{key:"orders",label:"在手订单",target:6000,unit:"万元"},file:"Q2订单与经营报表.pdf",history:["2026-07-16 · 季度经营报表复核通过"],versions:[]});
 db.theses??={};
 db.theses[flagshipId]??=[
  {title:"核心客户完成产线验证",target:"三季度取得客户终验单",actual:"样机已通过测试，客户终验延至 12 月",state:"延期",owner:"周宁",due:"2026-12-08",action:"与客户技术负责人核实排产与终验日期",log:["2026-11-20 · 走访纪要 FT-026"]},
  {title:"新增订单能够覆盖扩产投入",target:"在手订单达到 6,000 万元",actual:"最新经营走访确认 5,200 万元",state:"跟踪中",owner:"许舒",due:"2026-12-15",action:"取得在手订单清单，复核取消条款",log:["2026-11-21 · 订单核对 DD-018"]}
 ];
 db.plans??=funds.flatMap((f,i)=>[
  {id:"AG-"+(101+i),fund:i,date:"2026-12-12",type:"签约待付",label:"已签投资协议第 "+(i+1)+" 期出资",amount:[2400,1300,1800,900][i]},
  {id:"FEE-"+(101+i),fund:i,date:"2026-12-25",type:"运营费用",label:"季度管理及托管费",amount:[160,95,80,45][i]},
  {id:"CALL-"+(101+i),fund:i,date:"2027-01-08",type:"预计到账",label:"下一期 LP 缴款计划",amount:[2100,900,1100,600][i]}
 ]);
 db.paths??=[
  {fund:0,child:"成长子基金",enterprise:"海岚智造",share:20,value:2400,date:"2026-09-30",source:"CT-026"},
  {fund:2,child:"装备产业子基金",enterprise:"海岚智造",share:15,value:1800,date:"2026-09-30",source:"CT-032"},
  {fund:0,child:"先进制造子基金",enterprise:null,share:10,value:null,date:"2026-06-30",source:"CT-015"}
 ];
 for(const t of db.tasks) t.policy??={...businessRule(db.projects.find(p=>p.fund===t.fund&&p.name===t.company))};
 // Preserve completed operations from the first preview.
 if(!db.exit.delivery && (db.exit.receipts.length || db.exit.approved))db.exit.delivery={date:db.exit.receipts[0]?.date||reviewDate,proof:"旧版已回款退出单 TC-003"};
}
function projectRounds(p){
 if(p.id===flagshipId)return [["2024-06-20","A 轮",2000,"HK-240620"],["2025-10-15","A+ 轮",1200,"HK-251015"]];
 if(p.payment)return [[p.payment.date,"首轮",p.amount,p.payment.proof]];
 return p.stage==="投后管理"?[["待补录","期初持仓",p.amount,"历史项目台账"]]:[];
}
function positions(p){
 const cost=projectRounds(p).reduce((n,r)=>n+r[2],0);
 if(p.id!==flagshipId)return {cost,book:cost,mark:null,holding:null,date:"待补录",cash:0,remaining:cost};
 const sold=db.exit.delivery?.date;
 const approved=db.valuation.state==="已确认",base=approved?db.valuation.value:3520;
 const remaining=sold ? 0.75 : 1;
 return {cost,book:cost*remaining,mark:base*remaining,holding:12*remaining,date:approved?"2026-09-30":"2026-06-30",cash:sum(db.exit.receipts,"amount"),remaining,proof:approved?"GZ-008":"GZ-006"};
}
function riskItems(p){return db.risks.filter(r=>r.company===p.name && (r.fund===undefined||r.fund===p.fund))}
function followups(){
 const decisions=db.projects.flatMap(p=>(db.theses[p.id]||[]).filter(t=>t.state!=="已验证"&&t.state!=="已终止").map(t=>({act:"projectFollow",id:p.id,title:t.action,sub:p.name+" · "+t.owner+" · "+t.due,status:t.state,icon:"clock",color:"gold",fund:p.fund,deadline:t.due})));
 const risks=db.risks.filter(r=>r.state!=="已销号").map(r=>({act:"risk",id:r.id,title:r.action||"复核整改凭证与回款计划",sub:r.company+" · "+r.owner+" · "+(r.due||"2026-11-30"),status:r.state,icon:"shield",color:"gold",fund:r.fund??db.projects.find(p=>p.name===r.company)?.fund,deadline:r.due||"2026-11-30"}));
 return [...risks,...decisions].sort((a,b)=>a.deadline.localeCompare(b.deadline));
}
function thesisView(p){
 const rows=db.theses[p.id]||[];
 return card("投决假设与验证",rows.length?rows.map((t,i)=>'<article class="hypothesis"><div class="metrichead"><b>'+esc(t.title)+'</b>'+tag(t.state)+'</div><p><small>投决目标</small>'+esc(t.target)+'</p><p><small>本期实况</small>'+esc(t.actual)+'</p><div class="next"><span>'+esc(t.action)+'<small>'+esc(t.owner)+" · "+esc(t.due)+'</small></span>'+cmd("thesisEdit","更新","textbtn",p.id+":"+i)+'</div></article>').join(""):block('<p class="dim">尚未登记可验证的投资假设。</p>'),cmd("thesisEdit",ico("plus")+"新增假设","btn",p.id+":new"));
}
function thesisEdit(key){
 const [id,index]=key.split(":"),p=getProject(id),t=(db.theses[id]||[])[index]||{};
 drawer("投资假设与跟踪计划",form("thesisEdit",field("title","投资假设","text",t.title,"required maxlength=100")+field("target","投决时的验证条件","text",t.target,"required maxlength=180")+field("actual","本期实况与依据","text",t.actual,"required maxlength=200")+formSelect("state","判断",opt(["跟踪中","延期","已验证","已终止"].map(v=>[v,v]),t.state))+field("action","下一步动作或结论","text",t.action,"required maxlength=160")+field("owner","责任人","text",t.owner||p.owner,"required maxlength=30")+field("due","复核日期","date",t.due||reviewDate,"required"),"保存跟踪记录",key)+(t.log?history(t.log):""));
}
const manufacturing={key:"orders",label:"在手订单",unit:"万元",target:6000};
const technology={key:"runway",label:"现金可支撑月数",unit:"个月",target:9};
initializeManager();
function businessRule(p){return p?.policy || (p?.industry==="数字科技"?technology:manufacturing)}
function taskRule(t){return t.policy||businessRule(db.projects.find(p=>p.fund===t.fund&&p.name===t.company))}
function extraFields(t){
 const r=taskRule(t),params='min=0 step=0.01 required';
 return r.key==="runway"?field("cashOnHand","公司可用现金（万元）","number",t.cashOnHand??"",params)+field("burn","月均净消耗（万元）","number",t.burn??"",params):
 field("orders","在手订单（万元）","number",t.orders??"",params);
}
function actualMeasure(t){
 if(taskRule(t).key==="runway"){return t.cashOnHand!=null && t.burn>0?t.cashOnHand/t.burn:null}
 return t.orders??null;
}
function checkOperatingRisk(t){
 const r=taskRule(t),value=actualMeasure(t);
 if(value==null||value>=r.target||db.risks.some(x=>x.task===t.id&&x.metric===r.key))return;
 const p=db.projects.find(z=>z.name===t.company&&z.fund===t.fund);
 db.risks.unshift({id:"FX-"+(db.risks.length+20),metric:r.key,task:t.id,fund:t.fund,company:t.company,owner:p?.owner||"周宁",due:t.due,action:r.key==="runway"?"核对现金消耗与下一轮融资安排":"核实在手订单缺口与客户排产",source:t.id+" V"+t.v+" · "+r.label+" "+money(value)+r.unit+"，目标 "+r.target+r.unit,state:"待整改",history:["确认版报送触发经营指标预警"]});
}
function operatingView(p){
 const r=businessRule(p),ts=db.tasks.filter(t=>t.fund===p.fund&&t.company===p.name&&t.status==="已确认").sort((a,b)=>b.q.localeCompare(a.q));
 return card("经营偏差",block(kv("跟踪指标",r.label)+kv("当前比较基准",money(r.target)+" "+r.unit)+cmd("policy","调整跟踪指标与目标","textbtn",p.id))+
 table(["报送期 / 指标","确认值","实际减当期目标","数据来源"],ts.map(t=>{const v=actualMeasure(t),r=taskRule(t);return tr([esc(t.q+" · "+r.label),v==null?"待补录 / 不适用":money(v)+" "+r.unit,v==null?"—":money(v-r.target)+" "+r.unit,esc(t.id)+" · V"+t.v],"task",t.id)})))+
 card("风险与下一步动作",table(["事项","责任人","到期日","状态"],riskItems(p).map(r=>tr([esc(r.action||"复核应收款整改凭证"),esc(r.owner),esc(r.due||"2026-11-30"),tag(r.state)],"risk",r.id))));
}
function exposure(p){
 const direct=db.projects.filter(z=>z.name===p.name && z.stage==="投后管理"),paths=db.paths.filter(z=>z.enterprise===p.name),missing=db.paths.filter(z=>!z.enterprise);
 const directKnown=direct.filter(z=>positions(z).mark!==null);
 const a=directKnown.reduce((n,z)=>n+positions(z).mark,0),b=paths.reduce((n,z)=>n+z.value*z.share/100,0);
 return card("集团合并敞口",numbers([["已披露直接持仓",amt(a),"按批准估值"],["已披露间接持仓",amt(b),paths.length+" 条独立路径"],["已知敞口合计",amt(a+b),"未知持仓单列"]])+table(["投资路径","计算依据","敞口","披露日 / 来源"],[
 ...direct.map(z=>{const h=positions(z);return tr([esc(funds[z.fund].name+" → "+z.name),"直接持仓",h.mark===null?"未知":amt(h.mark),esc(h.date+" · "+(h.proof||"待补估值"))])}),
 ...paths.map(z=>tr([esc(funds[z.fund].name+" → "+z.child+" → "+p.name),money(z.share)+"% × "+amt(z.value),amt(z.value*z.share/100),esc(z.date+" · "+z.source)])),
 ...missing.map(z=>tr([esc(funds[z.fund].name+" → "+z.child),"底层企业未披露","未知",esc(z.date+" · "+z.source)]))])+'<details><summary>追加投资敞口试算</summary>'+block(form("exposureTrial",field("amount","本次拟追加金额（万元）","number","","min=0.01 step=0.01 required"),"测算投后敞口",p.id)+'<div id="trialResult" data-known="'+(a+b)+'"></div>')+'</details>');
}
function conditions(p){
 p.conditions??=[{name:"增资协议签章齐全",owner:"法务",reviewer:"法务负责人"},{name:"决议附加条件取得证明",owner:p.owner,reviewer:"风控负责人"}];
 return p.conditions;
}
function closingPanel(p){
 const checks=conditions(p);
 return card("交割条件核验",table(["必备条件","经办 / 复核","凭证","状态"],checks.map((c,i)=>tr([esc(c.name),esc(c.owner+" / "+c.reviewer),esc(c.proof||"待上传编号"),tag(c.confirmed?"已确认":c.proof?"待复核":"缺件")],p.stage==="待交割"?"conditionEdit":null,p.id+":"+i)))+block('<span class="dim">已复核 '+checks.filter(c=>c.confirmed).length+" / "+checks.length+' 项</span>'),p.stage==="待交割"?cmd("conditionEdit","添加决议条件","btn",p.id+":new"):"");
}
function conditionEdit(key){
 const [id,i]=key.split(":"),p=getProject(id);if(p?.stage!=="待交割")return;
 const c=conditions(p)[i];
 if(!c)return drawer("新增决议条件",form("addCondition",cause("name","必备条件")+cause("owner","经办人")+cause("reviewer","复核人"),"加入核验清单",id));
 if(c.confirmed)return drawer(c.name,kv("凭证",c.proof)+kv("复核人",c.reviewer)+kv("复核日",c.date));
 drawer(c.name,kv("经办人",c.owner)+kv("指定复核人",c.reviewer)+(c.proof?kv("经办凭证",c.proof)+form("confirmCondition",when("date","复核日期"),"确认凭证核验通过",key):form("supplyCondition",cause("proof","签章件或证明文件编号"),"登记凭证并送复核",key)));
}
function projectWorkflow(p){
 const approval=["待立项","待补正"].includes(p.stage)?form("projectAction",formSelect("decision","办理决定",opt(p.stage==="待立项"?[["pass","批准立项，转入尽调"],["return","退回补充"]]:[["resubmit","补充后重新提交"]],""))+cause("note","办理意见"),"确认办理",p.id):"";
 return (p.ballot?ballotRecord(p):"")+(p.stage==="尽职调查"||p.diligence?diligencePanel(p):"")+(p.stage==="待交割"||p.conditions?closingPanel(p):"")+card("项目办理",block(approval+projectStep(p)||kv("当前阶段",p.stage)))+exposure(p)+card("业务轨迹",block(history(p.history)));
}
function projectPage(p,tab){
 const h=positions(p),tabs=[["overview","投资概览"],["follow","投后跟踪"],["decision","投决与交割"],["score","质量评估"],["marks","估值比较"],["paths","持仓穿透"]];
 if(!tabs.some(t=>t[0]===tab))tab="overview";
 const meta=[funds[p.fund].name,p.industry,p.id,"负责人 "+p.owner].map(esc).join("　·　");
 let body="";
 if(tab==="score")body=scorePanel(p);else if(tab==="marks")body=marksPanel(p);else if(tab==="decision")body=projectWorkflow(p);
 else if(tab==="paths")body=exposure(p);
 else if(tab==="follow")body=thesisView(p)+operatingView(p);
 else body='<div class="dossierGrid"><div>'+thesisView(p)+card("历次投资",table(["投资日","轮次","成本","付款凭证"],projectRounds(p).map(r=>tr([esc(r[0]),esc(r[1]),amt(r[2]),esc(r[3])]))))+'</div><div>'+card("持仓与回款",block(kv("当前持股比例",h.holding==null?"待补录":money(h.holding)+"%")+kv("剩余持仓成本",amt(h.book))+kv("估值基准日",h.mark==null?"待批准":h.date)+kv("估值底稿",h.proof||"待补录")+(p.id===flagshipId?cmd("markSource","查看估值底稿","textbtn"):"")))+card("投资判断",block(kv("投资理由",p.reason||(p.id===flagshipId?"设备验证转向批量订单，跟踪订单转化和扩产节奏。":"待完善投资理由"))+kv("主要风险",p.risk||(p.id===flagshipId?"客户终验延期影响交货与回款。":"待登记"))))+card("最近办理",block(history(p.history.slice(-2))))+'</div></div>';
 return cmd("nav","‹　项目台账","backlink","B")+title(esc(p.name),meta,tag(p.stage)+cmd("nav","尽调工作台","btn",ddUrl(p.id))+cmd("fund","查看所属基金","btn",p.fund))+
 projectRibbon(p)+'<div class="dossierHero">'+numbers([["累计投资成本",amt(h.cost),"已付投资款"],["剩余持仓估值",h.mark==null?"待批准":amt(h.mark),h.mark==null?"尚无确认估值":h.date+" 基准"],["累计退出回款",amt(h.cash),"基金实际收到"],["当前阶段",p.stage,p.owner+" 跟进"]])+'</div><div class="viewtabs">'+tabs.map(([v,l])=>cmd("nav",l,v===tab?"active":"",projectUrl(p.id,v))).join("")+'</div>'+body;
}

