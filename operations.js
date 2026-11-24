db.risks??=[{id:"FX-012",company:"海岚智造",source:"应收款逾期 45 天，阈值 30 天",owner:"周宁",state:"待复核",history:["周宁已提交整改凭证 · 回款安排说明.pdf"]}];
function identity(){
 const names=[...new Set(db.projects.filter(p=>p.stage==="投后管理").map(p=>p.name))];
 drawer("切换演示身份",form("identity",formSelect("company","当前办理身份",opt([["","集团投资管理部 · 周宁"],...names.map(n=>[n,n+" · 企业联系人"])],externalCompany)),"进入工作台"));
}
function enterpriseView(){
 const tasks=db.tasks.filter(t=>t.company===externalCompany);
 $("#sidebar").innerHTML='<div class="brand"><div class="emblem">'+ico("fund")+'</div><div><strong>业达投资</strong><small>YEDA INVESTMENT</small></div>'+cmd("menu","×","collapse")+'</div><nav><div class="ng">企业工作空间</div><div class="navbtn active">'+ico("file")+'季度报送</div></nav><div class="profile"><div class="avatar">企</div><div>企业联系人<small>'+esc(externalCompany)+'</small></div>'+cmd("identity","⇄","switcher")+'</div>';
 $("#top").innerHTML=cmd("menu",ico("menu"),"hamb")+'企业工作空间　 /　 季度报送 <div class="right"></div>'+cmd("identity","切换演示身份","btn");
 $("#main").innerHTML=title("我的报送任务",esc(externalCompany))+'<section class="panel">'+panelHead("季度经营报送",'<span class="count">'+tasks.length+' 项</span>')+table(["任务编号","报送期间","截止日期","当前状态","提交版本"],tasks.map(t=>tr([esc(t.id),esc(t.q),esc(t.due),tag(t.status),t.v?"V"+t.v:"—"],"task",t.id)))+'</section>';
}
db.exit??={status:"待审批",receipts:[],approved:false,distribution:[],history:[]};
db.valuation??={state:"待复核",value:900,history:[]};
db.quarter??={locked:false,version:0,history:[]};
const sum=(xs,key)=>Math.round(xs.reduce((a,x)=>a+x[key],0)*100)/100;
const cause=(key,label)=>field(key,label,"text","","required maxlength=200");
const when=(key,label)=>field(key,label,"date","2026-11-24",'max="2026-11-24" required');
const editableQuarter=()=>!cc().locked;
function makeRisk(t){
 if(taskRule(t).key==="runway"||t.rev<=0||(t.rev-t.cost)/t.rev>=.2||db.risks.some(x=>x.task===t.id&&!x.metric))return;
 db.risks.unshift({id:"FX-"+String(13+db.risks.length),company:t.company,task:t.id,source:t.id+" V"+t.v+" · 毛利率 "+((1-t.cost/t.rev)*100).toFixed(1)+"%，低于演示阈值 20%",owner:db.projects.find(p=>p.name===t.company&&p.fund===t.fund)?.owner||"周宁",fund:t.fund,due:t.due,action:"核对成本结构并制定毛利修复计划",state:"待整改",history:["确认版经营指标触发预警"]})
}
function operationsPage(p){
 let x=db.exit,paid=sum(x.receipts,"amount"),phase=x.status;
 switch(p){
 case "G05":return filingPage();
 case "B01":return block(cmd("nav","打开项目池与跟进周报","btn primary","pool"));
 case "C06":return block(cmd("nav","打开风险中心","btn","riskcenter"))+table(["企业","指标口径","触发阈值"],db.projects.filter(z=>z.stage==="投后管理").map(z=>{const r=businessRule(z);return tr([esc(z.name),esc(r.label),"低于 "+money(r.target)+" "+r.unit],"policy",z.id)}));
 case "D07":return block(kv("归口岗位","基金财务及独立复核岗")+kv("2026 Q3 逐笔差异",compareQuarter().filter(r=>r.state!=="相符").length+" 条")+cmd("nav","打开季度资金对账","btn primary","close/cash"));
 case "E07":return block(kv("季结范围",quarterKey)+kv("关账状态",cc().locked?"已锁定":"开放")+cmd("nav","检查或办理关账","btn primary","close/versions"));
 case "E08":return returnBridge();
 case "G04":case "F02":case "F03":return performanceTable()+(p==="F03"?'<div class="tools">'+cmd("calc","自定义倍数试算","btn","F03")+'</div>':"");
 case "F05":case "F06":return exposure(getProject(flagshipId))+(p==="F05"?'<div class="tools">'+cmd("calc","持仓比例试算","btn","F05")+'</div>':"");
 case "C07":return table(["工单","企业","整改责任人","状态"],db.risks.map(r=>tr([esc(r.id),esc(r.company),esc(r.owner),tag(r.state)],"risk",r.id)));
 case "B05":case "B07":{let stages=p==="B05"?["尽职调查","待投决","待交割","已放行"]:["待交割","已放行","投后管理"];return table(["项目","拟投基金","当前阶段","经办人"],db.projects.filter(z=>stages.includes(z.stage)).map(z=>tr([esc(z.name),funds[z.fund].name,tag(z.stage),esc(z.owner)],"nav",projectUrl(z.id,"decision"))))}
 case "E01":case "E02":case "E05":case "E06":{
 const titles={E01:"退出审批",E02:"退出回款",E05:"分配测算与审批",E06:"逐户分配付款",G04:"出资人报告"};
 return '<div class="tools"><span class="dim">产业基金一期 · 海岚智造 · TC-003</span></div>'+table(["业务事项","当前记录","操作"],p==="G04"?["甲出资人","乙出资人"].map((lp,i)=>tr([lp,"累计实收 "+money(sum(x.distribution.filter(d=>d.lp===i),"amount"))+" 万元",cmd("exit","查看报告","textbtn","lp"+i)])):[tr([titles[p],p==="E01"?tag(phase):p==="E02"?"已收 "+money(paid)+" / 300 万元":p==="E05"?tag(x.approved?"已批准":"待测算"):"LP 已付 "+money(sum(x.distribution,"amount"))+" 万元",cmd("exit","进入办理","textbtn",p)])])
 }
 case "E03":return table(["估值标的","基准日","持仓估值","状态"],[tr(["海岚智造","2026-09-30",db.valuation.value+" 万元",tag(db.valuation.state)],"valuation","")]);

 default:return null;
 }
}
function projectStep(p){
 if(p.stage==="已放行")return fbEntry("project/"+p.id);
 if(p.stage==="待投决")return ballotForm(p);
 if(p.stage==="尽职调查"&&diligence(p).some(d=>!d.closed))return '<div class="notice">必备尽调事项尚未核验，补齐材料后可提交上会。</div>';
 const fields={"尽职调查":["尽调结论及材料编号","提交投委会"],"待投决":["决议编号、表决结果及回避记录","登记附条件通过决议"],"待交割":["交割必备条件的核验凭证","核验并放行付款"],"已放行":["实际付款回单号","登记实付"]};
 const cfg=fields[p.stage];if(!cfg)return "";if(p.stage==="待交割"&&conditions(p).some(c=>!c.confirmed))return '<div class="notice">暂不能放行。请逐项补齐并复核清单中的必备条件。</div>';
 return form("projectStep",cause("evidence",p.stage==="待交割"?"放行单编号":cfg[0])+(p.stage==="待投决"?field("payDue","预计交割付款日","date","2026-12-15","required"):"")+when("date","业务日期"),cfg[1],p.id)
}
function riskPanel(id){let r=db.risks.find(x=>x.id===id);drawer("风险整改 · "+r.id,tag(r.state)+kv("企业",r.company)+kv("预警依据",r.source)+kv("责任人",r.owner)+kv("跟进期限",r.due||"2026-11-30")+kv("下一步动作",r.action||"复核应收款整改凭证")+history(r.history)+(r.state==="已销号"?"":form("riskAction",(r.state==="待复核"?formSelect("decision","复核结论",opt([["pass","复核销号"],["return","退回整改"]],"")):"")+cause("note",r.state==="待复核"?"复核意见":"整改措施及举证材料编号"),r.state==="待复核"?"确认复核":"提交整改证据",id)))}
function exitPanel(p){let x=db.exit,received=sum(x.receipts,"amount"),paid=sum(x.distribution,"amount"),body=kv("项目退出单","TC-003 · 转让持仓的 25%")+kv("退出应收 / 已收", "300 / "+money(received)+" 万元")+kv("已批准分配 / LP 已实收",(x.approved?200:0)+" / "+money(paid)+" 万元"),lock=false;
 if(p.startsWith("lp"))return lpMetrics(+p.slice(-1));
 if(lock)body+='<p class="notice">本期已锁定，需要更正请在季末关账页登记重开。</p>';
 else if(p==="E01"&&x.status==="待审批")body+=form("exitApprove",cause("note","审批意见"),"批准退出方案");
 else if(p==="E02"&&x.status==="已批准"&&!x.delivery)body+=form("transfer",when("date","持仓交付日")+cause("proof","股权交付凭证"),"登记转让 25% 持仓");
 else if(p==="E02"&&x.status==="已批准"&&x.delivery)body+=fbEntry("exit");
 else if(p==="E05"&&!x.approved&&received>=200)body+=form("distribute",kv("可分金额","200 万元")+kv("返本顺序","甲 120 万元 · 乙 80 万元")+cause("note","分配审批意见"),"批准分户方案");
 else if(p==="E06"&&x.approved)body+=lpNames.map((n,i)=>kv("出资人",n)+fbEntry("lp/"+i)).join("");
 else if(p==="E02"&&x.status!=="已批准"||p==="E05"&&received<200||p==="E06"&&!x.approved)body+='<p class="notice">'+({E02:"请先批准退出方案。",E05:"本样本需先登记至少 200 万元实际回款。",E06:"请先批准分户分配方案。"})[p]+'</p>';
 if(x.delivery)body+=kv("股权交付",x.delivery.date+" · "+x.delivery.proof);
 drawer(({E01:"退出方案审批",E02:"退出回款登记",E05:"收益分配审批",E06:"LP 分配实付"})[p],body+history(x.history))
}
function valuation(){
 const v=db.valuation;
 const controls=closeRole==="checker"&&editableQuarter()?form("valuation",field("value","基准日估值（万元）","number",v.value,"min=0 step=0.01 required")+cause("note","估值底稿编号、采用方法及复核意见"),"确认估值并记录依据"):'<p class="notice">'+(cc().locked?"季度已锁定。重开并登记原因后可更正。":"请切换至财务复核岗位办理估值确认。")+'</p>';
 drawer("海岚智造 · 估值复核",kv("估值基准日","2026-09-30")+kv("待核底稿 GZ-008",amt(v.value))+kv("复核状态",v.state)+closeActors()+controls+history(v.history));
}
function quarter(){go("close","versions")}
function processOperation(kind,id,v,error,done){
 let x=db.exit;
 switch(kind){
 case "projectStep":{const p=db.projects.find(p=>p.id===id);if(!v.evidence.trim())return error("请填写办理凭据。");
 if(p.stage==="待交割"&&!conditions(p).every(c=>c.confirmed))return error("尚有必备交割条件未复核，无法放行。");
 if(p.stage==="待投决")return error("请逐位登记表决。");
 if(p.stage==="尽职调查"&&diligence(p).some(d=>!d.closed))return error("必备尽调事项尚未全部核验。");
 if(p.stage==="已放行")return error("请通过财务协同确认实际付款。");
 if(p.stage==="待交割")p.releaseDate=v.date;

 p.stage=({"尽职调查":"待投决","待投决":"待交割","待交割":"已放行","已放行":"投后管理"})[p.stage];p.history.push(v.date+" · "+p.stage+" · "+v.evidence);return done("项目阶段已更新",()=>project(id))}
 case "riskAction":{const r=db.risks.find(r=>r.id===id);if(!v.note.trim())return error("请填写处理依据。");r.state=r.state==="待复核"?(v.decision==="pass"?"已销号":"待整改"):"待复核";r.history.push(r.state+" · "+v.note);return done("风险工单已更新",()=>riskPanel(id))}
 case "exitApprove":x.status="已批准";x.approvalDate=reviewDate;x.history.push("退出获批 · "+v.note);return done("退出方案已批准",()=>exitPanel("E01"));
 case "distribute":x.approved=true;x.approvedDate=reviewDate;x.history.push("分配获批 · "+v.note);return done("分户方案已批准",()=>exitPanel("E05"));
 case "valuation":if(closeRole!=="checker"||!editableQuarter()||!v.note.trim())return error("请核对复核岗位、期间状态及复核依据。");db.valuation={state:"已确认",value:+v.value,note:v.note,history:[...db.valuation.history,"确认 "+v.value+" 万元 · "+v.note]};qAudit("确认持仓估值","GZ-008",v.note);render();valuation();announce("估值已确认");return;

 }
}

