"use strict";
let researchFilter="", researcher="", agentTag="";
const agents=["尽调报告智能体","股权统计问答智能体","智能问数"];
function researchSettings(){return db.settings.industryMonitor||{code:"C27",name:"医药制造业",limit:10,keywords:"生物医药,创新药,医药"}}
function industryConfig(){
 const c=researchSettings();
 const choices=[["C27","医药制造业"],["C36","汽车制造业"],["C39","计算机、通信和其他电子设备制造业"],["I65","软件和信息技术服务业"]];
 return panel(title("行业配置")+'<form id="industryConfig"><div class="fields"><label>国标行业分类（GB/T 4754）<input list="industryCodes" name="code" value="'+esc(c.code)+'" required placeholder="输入代码或名称"><datalist id="industryCodes">'+choices.map(([id,name])=>'<option value="'+id+'">'+name+'</option>').join("")+'</datalist></label><label>行业名称<input name="name" value="'+esc(c.name)+'" required></label><label>显示新闻条数<input type="number" min="1" max="100" name="limit" value="'+esc(c.limit)+'" required></label><label>搜索关键词<input name="keywords" value="'+esc(c.keywords)+'" placeholder="逗号分隔"></label></div><div class="queryline"><button class="primary">保存</button>'+btn("查看行业报告","nav","行业报告")+'</div></form>');
}
function industryReports(){
 const rows=db.行业报告;
 return panel(title("报告管理")+'<form id="generateReport" class="queryline"><label>报告日期<input required type="date" name="date" value="'+day()+'"></label><button class="primary">生成报告</button>'+btn("行业配置","nav","行业配置")+'</form><p class="muted">使用本地企业档案、项目跟进和风险记录生成报告。</p>'+
 table(["ID","报告日期","状态","开始时间","完成时间","耗时","操作"],rows.map((r,i)=>[rows.length-i,esc(r.date),"已生成",esc(r.started),esc(r.finished),esc(r.elapsed),btn("查看","localReport",r.id,"link")+btn("下载","downloadLocalReport",r.id,"link")])));
}
function buildIndustryReport(date) {
 const start=new Date(),cfg=researchSettings(),terms=[cfg.code,cfg.name,...cfg.keywords.split(/[,，]/)].map(t=>t.trim()).filter(Boolean);
 const companies=db.企业库.filter(r=>terms.some(q=>[r.清科行业,r.七大行业,r.主营业务,r.企业标签,r.企业全称].some(x=>String(x||"").includes(q))));
 const names=new Set(companies.map(r=>r.企业全称));
 const follow=db.项目跟进管理.filter(r=>names.has(r.企业全称)&&r.跟进日期&&r.跟进日期<=date).sort((a,b)=>b.跟进日期.localeCompare(a.跟进日期));
 const risk=risks().filter(r=>names.has(r.企业名称)&&r.发生时间&&r.发生时间<=date);
 const lines=[cfg.name+"行业报告",date,"","行业代码　"+cfg.code,"搜索关键词　"+cfg.keywords,"","本地企业档案（生成时快照）",...(companies.length?companies.map(r=>r.企业全称+"　"+(r.主营业务||"")):["暂无匹配档案"]),"","截至报告日的项目跟进",...(follow.length?follow.slice(0,cfg.limit).map(r=>r.跟进日期+"　"+r.企业全称+"　"+r.事项名称):["暂无匹配记录"]),"","截至报告日的风险记录",...(risk.length?risk.slice(0,cfg.limit).map(r=>r.发生时间+"　"+r.企业名称+"　"+r.风险级别+"　"+r.风险内容):["暂无匹配记录"])];
 const finish=new Date();return {id:uid(),date,text:lines.join("\n"),started:start.toLocaleTimeString(),finished:finish.toLocaleTimeString(),elapsed:((finish-start)/1000).toFixed(2)+"秒"};
}
function askView() {
 if(!researcher)return panel(title("智能问数")+'<form id="filterAgents" class="queryline"><label>搜索<input name="q" value="'+esc(researchFilter)+'"></label><label>标签<select name="tag">'+["全部标签","占位标签","演示用"].map(v=>'<option '+(v===agentTag?"selected":"")+'>'+v+'</option>').join("")+'</select></label><button>筛选</button></form><div class="agentChoices">'+agents.filter((name)=>name.includes(researchFilter)&&(!agentTag||agentTag==="全部标签"||agentTag===(name==="智能问数"?"演示用":"占位标签"))).map(name=>btn(name,"askAgent",name)).join("")+'</div>');
 const history=chatHistory()[researcher]||[];
 return panel('<div class="bar">'+title(researcher)+btn("返回智能体列表","askBack")+'</div><p class="muted">查询当前浏览器保存的基金、项目、财报及风险记录。</p>'+history.map(h=>'<section class="askTurn"><b>'+esc(h.question)+'</b><pre>'+esc(h.answer)+'</pre></section>').join("")+'<form id="askPortfolio" class="queryline"><label>问题<input name="question" placeholder="例如：统计今年公司财报" required></label><button class="primary">查询</button></form>');
}
function answerPortfolio(question) {
 const projects=db.直投项目管理,matched=projects.filter(p=>[p.企业简称,p.企业全称,p.项目名称].some(n=>n&&question.includes(n)));
 const scope=matched.length?matched:projects;
 if(/财报|财务|营业收入|营收|净利润/.test(question)){
  const year=question.match(/(?:19|20)\d{2}/)?.[0]||(/今年|本年/.test(question)?String(new Date().getFullYear()):/去年/.test(question)?String(new Date().getFullYear()-1):"");
  const rows=scope.flatMap(p=>(db.notes[p.id]?.财务情况||[]).filter(r=>!year||String(r.年度)===year).map(r=>p.企业简称+"　"+r.报表期间+"　"+r.币种+"　累计营收 "+first(r.本年累计营业收入)+" 万元　累计净利润 "+first(r.本年累计净利润)+" 万元"));
  return (year?year+" 年":"全部期间")+"共 "+rows.length+" 份财报。\n"+rows.join("\n")+"\n来源：直投项目管理 / 投后管理 / 财务情况";
 }
 if(/风险|预警/.test(question)){
  const rows=risks().filter(r=>scope.some(p=>p.id===r.projectId));return "共 "+rows.length+" 条风险记录。\n"+rows.map(r=>r.发生时间+"　"+r.企业名称+"　"+r.风险级别+"　"+r.风险内容).join("\n")+"\n来源：投后管理 / 重大风险事项";
 }
 if(/基金|认缴|实缴/.test(question)){
  const funds=/自管/.test(question)?db.自管基金:/参股/.test(question)?db.参股基金:allFunds();const matches=funds.filter(f=>[f.基金名称,f.基金简称].some(n=>n&&question.includes(n))),selected=matches.length?matches:funds;
  return selected.length+" 支基金，认缴规模 "+total(selected,"基金认缴规模").toLocaleString()+" 万元，实缴规模 "+total(selected,"基金实缴规模").toLocaleString()+" 万元。\n来源：基金基本信息";
 }
 if(/尽调|项目|跟进|企业/.test(question))return "共 "+scope.length+" 个直投项目。\n"+scope.map(p=>p.项目名称+"　"+p.项目状态+"　"+first(p.主营业务)+"　项目经理 "+first(p.项目经理)).join("\n")+"\n来源：直投项目管理 / 企业概况";
 return "当前可查询基金认缴实缴、项目档案、已录入财报和风险记录。请说明查询对象和指标。";
}
function chatHistory(){return team?JSON.parse(sessionStorage.getItem("team.dialogs."+actor())||"{}"):(db.settings.localDialogs??={})}
document.addEventListener("submit",async e=>{
 const f=e.target;if(!["industryConfig","generateReport","filterAgents","askPortfolio"].includes(f.id))return;e.preventDefault();
 const values=Object.fromEntries(new FormData(f));
 try{if(f.id==="industryConfig"){db.settings.industryMonitor={...values,limit:Number(values.limit)};await persist();notice("行业配置已保存");return}
 if(f.id==="generateReport"){db.行业报告.unshift(buildIndustryReport(values.date));await persist();render();notice("报告已生成");return}
 if(f.id==="filterAgents"){researchFilter=values.q.trim();agentTag=values.tag;render();return}
 if(!values.question.trim())return;
 const question=values.question.trim(),selected=researcher;
 const context=answerPortfolio(question);
 const answer=team?.services.model?(await teamRequest("model",{question,context:context+"\n"+portfolioContext(question)})).answer:context;
 const dialogs=chatHistory();(dialogs[selected]??=[]).push({question,answer});if(team)sessionStorage.setItem("team.dialogs."+actor(),JSON.stringify(dialogs));else await persist();render();
 }catch(err){showFailure(err)}
});
document.addEventListener("change",e=>{if(e.target.name==="code"&&e.target.form?.id==="industryConfig"){const opt=Array.from(e.target.list.options).find(o=>o.value===e.target.value);if(opt)e.target.form.elements.namedItem("name").value=opt.textContent}});
document.addEventListener("click",e=>{const button=e.target.closest("[data-a]");if(!button)return;const a=button.dataset.a;
 if(a==="askAgent"||a==="askBack"){researcher=a==="askBack"?"":button.dataset.v;render()}
 if(["localReport","downloadLocalReport"].includes(a)){const report=db.行业报告.find(r=>r.id===button.dataset.v);if(a==="localReport")modal("行业报告",'<pre>'+esc(report.text)+'</pre>');else download(new Blob(["\ufeff"+report.text],{type:"text/plain;charset=utf-8"}),"行业报告-"+report.date+".txt")}
});
