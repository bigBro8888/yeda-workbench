"use strict";
const committeeMembers = ["投资负责人", "风控委员", "产业专家"];
const channelGroups = [
 ["全部项目", []], ["立项", ["待立项", "待补正"]], ["尽调", ["尽职调查"]],
 ["投决", ["待投决"]], ["交割", ["待交割", "已放行"]], ["持有", ["投后管理"]], ["终止", ["未获通过"]]
];
let pipelineStage = "全部项目";
for (const sample of [
 {id:"XM-IC01",name:"澜芯传感",industry:"高端装备",fund:2,amount:2200,stage:"待投决",owner:"许舒",reason:"国产压力传感器已完成两家客户的小批量验证，拟投 A 轮支持量产。",risk:"前两大客户占收入 61%，订单兑现速度影响本轮估值。",diligence:[{subject:"客户订单真实性",owner:"许舒",closed:true,proof:"客户访谈纪要 FT-031"},{subject:"知识产权权属",owner:"法务",closed:true,proof:"法律意见 FL-017"}],history:["2026-11-19 · 完成尽调，登记财务及法律意见","2026-11-23 · 提交上会材料包 IC-026-V2"]},
 {id:"XM-DD01",name:"清源膜材",industry:"新材料",fund:1,amount:1450,stage:"尽职调查",owner:"林然",reason:"水处理膜已进入设备商供应链，拟扩充中试产能。",risk:"第一大客户账期延长，需核验发货、签收及回款。",diligence:[{subject:"核对前三大客户的合同、发货单与期后回款",owner:"财务",closed:false},{subject:"核实中试线良率与量产假设",owner:"林然",closed:true,proof:"现场抽检 DD-039"}],history:["2026-11-18 · 批准立项 LY-039","2026-11-21 · 现场核验中试线，财务函证待收"]}
]) if(!getProject(sample.id)) db.projects.push(sample);
function diligence(p){
 return p.diligence??=[{subject:"核验商业假设及主要客户",owner:p.owner,closed:false},{subject:"复核财务数据与法律权属",owner:"风控",closed:false}];
}
function projectSignal(p){
 if(p.stage==="待交割"){
  const open=conditions(p).filter(c=>!c.confirmed);
  return open.length?["交割受阻",open[0].name+" · "+open[0].owner,"decision"]:["可放行","所有必备条件已复核","decision"];
 }
 if(p.stage==="尽职调查"){
  const missing=diligence(p).filter(d=>!d.closed);
  return missing.length?["尽调缺件",missing[0].subject+" · "+missing[0].owner,"decision"]:["可上会","尽调事项已核验，可以提交投委会","decision"];
 }
 if(p.stage==="投后管理"){
  const t=(db.theses[p.id]||[]).find(t=>!["已验证","已终止"].includes(t.state));
  const risk=riskItems(p).find(r=>r.state!=="已销号");
  return t?[t.state,t.action+" · "+t.due,"follow"]:risk?["风险跟踪",risk.source,"follow"]:["例行跟踪","核对本季经营数据与上期判断","follow"];
 }
 const rest={"待投决":["待表决",p.risk||"复核投资理由、风险及交割前提"],"待立项":["待审批","确认投资主体、拟投金额和调查授权"],"待补正":["待补正",p.history.at(-1)],"已放行":["待实付","登记实际付款日及银行回单"],"未获通过":["已终止",p.ballot?.note||"查阅投决意见"]};
 return [...(rest[p.stage]||[p.stage,"查看办理记录"]),"decision"];
}
function investmentDesk(){
 const universe=selectedProjects(),stages=channelGroups.find(([key])=>key===pipelineStage)[1];
 const rows=universe.filter(p=>(!stages.length||stages.includes(p.stage))&&[p.name,p.owner,p.id,p.industry].join(" ").includes(query));
 const active=universe.filter(p=>!["投后管理","未获通过"].includes(p.stage));
 const order=["待交割","待投决","尽职调查"];
 const priorities=active.filter(p=>order.includes(p.stage)).sort((a,b)=>order.indexOf(a.stage)-order.indexOf(b.stage)).slice(0,3);
 const signals=priorities.map(p=>{const [state,note,target]=projectSignal(p);return cmd("nav",'<span class="pipelineType">'+esc(state)+'</span><strong>'+esc(p.name)+'</strong><small>'+esc(note)+'</small>','pipelineTicket',projectUrl(p.id,target))}).join("");
 return title("项目投资","集团投资组合 · "+universe.length+" 个项目",filterSelect()+cmd("newProject",ico("plus")+"登记项目","btn primary"))+
 '<section class="pipelineBrief"><div class="pipelineTotal"><span>推进中拟投金额</span><strong>'+money(sum(active,"amount"))+' <small>万元</small></strong><span>'+active.length+' 个项目 · 从立项至交割</span></div><div class="pipelineQueue">'+(signals||'<p>当前没有待尽调、投决或交割的项目。</p>')+'</div></section>'+
 '<section class="panel">'+panelHead("项目台账",cmd("nav","投委会议题","textbtn","B/B05"))+'<div class="stageStrip">'+channelGroups.map(([label,list])=>cmd("pipelineStage",esc(label)+' <b>'+universe.filter(p=>!list.length||list.includes(p.stage)).length+'</b>',pipelineStage===label?"on":"",label)).join("")+'</div>'+searchbar("搜索企业、行业、负责人或项目编号")+
 table(["项目 / 投资主体","阶段","金额（万元）","当前判断与下一步","负责人","操作"],rows.map(p=>{const [signal,action,target]=projectSignal(p);return tr(['<b>'+esc(p.name)+'</b><small>'+esc(funds[p.fund].name)+'</small>',tag(p.stage),money(p.amount),'<b>'+esc(signal)+'</b><small class="signalNote">'+esc(action)+'</small>',esc(p.owner),cmd("nav","办理","textbtn",projectUrl(p.id,target))],"project",p.id)}))+'</section>'+
 '<div class="chips pipelineLinks">'+catalog.filter(x=>x.id[0]==="B").map(x=>cmd("tab",esc(x.title),"chip",x.id)).join("")+'</div>';
}
function diligencePanel(p){
 const list=diligence(p);
 return card("尽调事项与证据",table(["核验事项","责任人","凭据编号","状态"],list.map((d,i)=>tr([esc(d.subject),esc(d.owner),esc(d.proof||"待补件"),tag(d.closed?"已确认":"待补件")],p.stage==="尽职调查"&&!d.closed?"dueCheck":null,p.id+":"+i))),cmd("nav","查企业与收财报","textbtn",ddUrl(p.id)));
}
function dueCheck(key){
 const [id,idx]=key.split(":"),item=diligence(getProject(id))[Number(idx)];
 drawer("登记尽调核验结果",kv("核验事项",item.subject)+kv("责任人",item.owner)+form("dueCheck",cause("proof","凭证编号或材料版本")+cause("note","核验结论"),"确认此项尽调",key));
}
function ballotForm(p){
 const choices=[["","请选择"],["同意","同意"],["反对","反对"],["弃权","弃权"],["回避","回避"]];
 return form("ballot",kv("投资主体",funds[p.fund].name)+kv("拟投金额",amt(p.amount))+'<p class="notice">演示表决规则：至少两名委员参与，回避不计入基数，赞成须超过非回避委员的一半。</p>'+
 committeeMembers.map((name,i)=>formSelect("vote"+i,name,opt(choices,""))).join("")+cause("proof","决议或会议纪要编号")+cause("note","投委意见与理由")+field("condition","通过后的附加条件（选填）","text","","maxlength=160")+field("payDue","预计付款日","date","2026-12-15","required"),"归档表决并更新项目",p.id);
}
function ballotRecord(p){
 const r=p.ballot;
 return card("投委会决议",block(kv("表决结果",r.result)+kv("决议依据",r.proof)+kv("投委意见",r.note)+kv("附加条件",r.condition||"无"))+table(["委员","表决"],r.votes.map((v,i)=>tr([committeeMembers[i],esc(v)]))));
}
function investForm(kind,id,v,error,done){
 if(kind==="dueCheck"){
  const [key,i]=id.split(":"),p=getProject(key),d=diligence(p)[Number(i)];
  if(p.stage!=="尽职调查"||d.closed||!v.proof.trim()||!v.note.trim())return error("请核对当前事项并填写凭证与结论。");
  Object.assign(d,{closed:true,proof:v.proof.trim(),note:v.note.trim()});p.history.push(d.owner+" 核验 "+d.subject+" · "+d.proof+" · "+d.note);return done("尽调凭证已登记");
 }
 const p=getProject(id),votes=committeeMembers.map((_,i)=>v["vote"+i]);
 if(p.stage!=="待投决"||votes.some(x=>!["同意","反对","弃权","回避"].includes(x))||!v.proof.trim()||!v.note.trim())return error("请逐位登记表决，并填写决议编号及意见。");
 const valid=votes.filter(x=>x!=="回避").length,yes=votes.filter(x=>x==="同意").length;
 if(valid<2)return error("有效参与人数不足，议题继续保留为待投决。");
 const passed=yes>valid/2,condition=v.condition.trim(),result=passed?(condition?"附条件通过":"通过"):"未获通过";
 p.ballot={votes,proof:v.proof.trim(),note:v.note.trim(),condition:passed?condition:"",result};
 p.stage=passed?"待交割":"未获通过";p.history.push(reviewDate+" · "+result+" · 同意 "+yes+" / 有效 "+valid+" · "+v.proof);
 if(passed){p.payDue=v.payDue;p.conditions=[{name:"增资协议签章齐全",owner:"法务经办",reviewer:"法务负责人"}];if(condition)p.conditions.push({name:condition,owner:p.owner,reviewer:"风控负责人"})}
 return done("投委决议已归档");
}
