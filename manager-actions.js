"use strict";
function policyEdit(id){
 const r=businessRule(getProject(id));
 drawer("经营指标与比较基准",form("policy",formSelect("key","跟踪指标",opt([["orders","在手订单（万元）"],["runway","现金可支撑月数（个月）"]],r.key))+field("target","目标值","number",r.target,"required min=0.01 step=0.01")+'<p class="dim">新下发任务采用此基准，已下发任务保留原口径。</p>',"保存指标",id));
}
function handleManagerForm(kind,id,v,error,done){
 const [key,index]=id.split(":"),p=getProject(key);
 switch(kind){
 case "thesisEdit":{
  const textKeys=["title","target","actual","action","owner"];
  if(textKeys.some(k=>!v[k].trim())){error("请补齐假设、验证依据及行动。");return true}
  const list=db.theses[key]??=[],value={...v,log:[...(list[index]?.log||[]),reviewDate+" · "+v.state+" · "+v.actual+" · "+v.owner]};
  if(index==="new")list.push(value);else list[Number(index)]=value;
  done("投资跟踪记录已保存");return true;
 }
 case "policy":{
  if(!p||!(Number(v.target)>0)){error("请输入有效的比较基准。");return true}
  p.policy={...(v.key==="runway"?technology:manufacturing),target:Number(v.target)};
  done("已更新后续报送基准");return true;
 }
 case "addCondition":case "supplyCondition":case "confirmCondition":{
  if(!p||p.stage!=="待交割"){error("当前项目不在交割核验阶段。");return true}
  const list=conditions(p);
  if(kind==="addCondition"){
   if(!v.name.trim()||!v.owner.trim()||!v.reviewer.trim()||v.owner.trim()===v.reviewer.trim()){error("请输入条件并分别指定经办人和复核人。");return true}
   list.push({name:v.name.trim(),owner:v.owner.trim(),reviewer:v.reviewer.trim()});
  }else{
   const c=list[index];
   if(!c||c.confirmed){error("该条件已处理。");return true}
   if(kind==="supplyCondition"){
    if(!v.proof.trim()){error("请填写凭证编号。");return true}
    c.proof=v.proof.trim();p.history.push(c.owner+" 登记 "+c.proof+" · "+c.name);
   }else{
    if(!c.proof){error("需要先登记经办凭证。");return true}
    c.confirmed=true;c.date=v.date;p.history.push(v.date+" · "+c.reviewer+" 复核 "+c.proof);
   }
  }
  done("交割清单已更新");return true;
 }
 case "planEdit":{
  if(!v.label.trim()||!(Number(v.amount)>0)){error("请填写事项与计划金额。");return true}
  const row={...v,amount:Number(v.amount),fund:Number(key)};
  if(index==="new")db.plans.push({...row,id:"PLAN-"+Date.now()});else Object.assign(db.plans.find(x=>x.id===index&&x.fund===Number(key)),row);
  done("资金排期已更新");return true;
 }
 case "transfer":{
  if((cc().locked&&v.date<="2026-09-30")||db.exit.status!=="已批准"||db.exit.delivery||!v.proof.trim()){error("请核对退出批准状态、交付凭证和期间状态。");return true}
  if(db.exit.approvalDate&&v.date<db.exit.approvalDate){error("股权交付日不得早于退出批准日。");return true}
  db.exit.delivery={date:v.date,proof:v.proof.trim()};db.exit.history.push(v.date+" · 交付 25% 持仓 · "+v.proof);
  done("股权交付已登记",()=>exitPanel("E02"));return true;
 }
 case "exposureTrial":{
  const result=document.getElementById("trialResult");
  const current=Number(result.dataset.known),extra=Number(v.amount);
  result.innerHTML=kv("投后已知敞口（新增投资按成本）",amt(current+extra))+kv("其中本次拟追加",amt(extra));return true;
 }
 default:return false;
 }
}

