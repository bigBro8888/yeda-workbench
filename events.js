function act(action,id){
 if(externalCompany&&!["identity","close","task","menu"].includes(action))return;
 if(externalCompany&&action==="task"&&!db.tasks.some(t=>t.id===id&&t.company===externalCompany))return;
 if(!externalCompany&&action.startsWith("fb")){fbAct(action,id);return}
 if(!externalCompany&&action.startsWith("ia")){iaAction(action,id);return}
 if(!externalCompany&&action.startsWith("dd")){ddAct(action,id);return}
 if(Object.hasOwn(benchActions,action)){benchActions[action](id);return}
 if(enterpriseActions.has(action)){deliveryAction(action,id);return}
 switch(action){
 case "filingExport":exportFiling();break;
 case "identity":identity();break;
 case "pipelineStage":pipelineStage=id;render();break;
 case "dueCheck":dueCheck(id);break;
 case "projectFollow":go("B",id+"/follow");break;
 case "thesisEdit":thesisEdit(id);break;
 case "conditionEdit":conditionEdit(id);break;
 case "planEdit":planEdit(id);break;
 case "policy":policyEdit(id);break;
 case "lpMetrics":lpMetrics(+id);break;
 case "archiveLP":archiveLP(+id);break;
 case "archivedLP":{const s=db.lpSnapshots.find(s=>s.id===id);if(s)lpMetrics(s.account.i,s);break}
 case "markSource":markSource();break;
 case "nav":{const [module,...path]=id.split("/");go(module,path.join("/"));break}
 case "tab":go(route,id);break;
 case "close":$("#panel").close();break;
 case "menu":document.body.classList.toggle("menu");break;
 case "search":drawer("搜索业务",'<label>输入项目、功能名称或编号<input id="lookup" placeholder="例如：海岚智造、到账核销"></label><div id="matches">'+search()+'</div>');$("#lookup").focus();break;
 case "period":period=Number(id);render();break;
 case "clear":query="";render();break;
 case "risk":riskPanel(id);break;
 case "exit":exitPanel(id);break;
 case "valuation":valuation();break;
 case "quarter":quarter();break;
 case "fund":fund(id);break;
 case "project":project(id);break;
 case "newProject":newProject();break;
 case "record":record(id);break;
 case "dispatch":dispatch();break;
 case "task":task(id);break;
 case "cash":cash();break;
 case "reportNew":reportNew();break;
 case "report":report(id);break;
 case "calc":calculate(id);break;
 case "remind":{const t=db.tasks.find(t=>t.id===id);t.history.push("站内催办已登记 · 周宁");save("催办 "+id);task(id);announce("已记录催办");break}
 case "publish":{const r=db.reports.find(r=>r.id===id);if(r.status!=="草稿")return;r.status="已发布";save("发布 "+id);render();report(id);break}
 case "export":{const r=db.reports.find(r=>r.id===id);const body=[r.title,r.q,r.status,"数据来源："+r.source+" V"+r.version,"来源附件："+r.file,"营业收入："+money(r.rev)+" 万元","营业成本："+money(r.cost)+" 万元"].join("\r\n");const url=URL.createObjectURL(new Blob(["\ufeff",body],{type:"text/plain;charset=utf-8"}));let a=document.createElement("a");a.href=url;a.download=r.id+".txt";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);save("导出 "+id);break}
 }
}
document.addEventListener("click",e=>{const el=e.target.closest("[data-act]");if(el){e.preventDefault();act(el.dataset.act,el.dataset.id||"")}else if(document.body.classList.contains("menu")&&!e.target.closest("#sidebar"))document.body.classList.remove("menu")});
document.addEventListener("keydown",e=>{if(e.key==="Enter"&&e.target.matches("tr.click"))act(e.target.dataset.act,e.target.dataset.id);if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="k"){e.preventDefault();act("search","")}if(e.key==="Escape")document.body.classList.remove("menu")});
document.addEventListener("input",e=>{if(e.target.id==="lookup")$("#matches").innerHTML=search(e.target.value)});
document.addEventListener("change",e=>{if(e.target.id==="poolOwner"){poolOwner=e.target.value;render()}if(e.target.id==="fundFilter"){fundFilter=e.target.value;render()}if(e.target.id==="statusFilter"){statusFilter=e.target.value;render()}if(e.target.name==="fund"&&$("#companies"))$("#companies").innerHTML=companies(e.target.value)});
function handleForm(f){
 const fd=new FormData(f),v=Object.fromEntries(fd),id=f.dataset.id,kind=f.dataset.form;
 if(kind==="identity"){externalCompany=v.company;sessionStorage.setItem("yeda.demo.company",externalCompany);$("#panel").close();document.body.classList.remove("menu");location.hash=externalCompany?"enterprise":"overview";render();return}
 if(externalCompany&&(kind!=="submitTask"||!db.tasks.some(t=>t.id===id&&t.company===externalCompany)))return;
 if(!externalCompany&&kind.startsWith("fb"))return fbSubmit(f);
 if(!externalCompany&&kind==="iaRun"){iaRun(f);return}
 if(!externalCompany&&kind.startsWith("dd")){ddSubmit(f);return}
 const error=s=>{f.querySelector(".error").textContent=s};
 const done=(label,reopen)=>{save(label);render();if(reopen)reopen();else $("#panel").close();announce(label)};
 if(kind==="filingCode"){if(!v.code.trim())return error("请填写主体编码。");bench.filingCode=v.code.trim();return done("报送编码已保存")}
 if(kind==="platformNew"||kind==="platformQuarter")return platformForm(kind,id,v,error,done);
 if(deskForms.has(kind))return deskForm(kind,id,v,error,done);
 if(["qStatement","qLock","qAdjust","qReview"].includes(kind))return quarterForm(kind,id,v,error);
 if(kind==="scopeWalk")return scopeWalk(id,v,error);
 if(["ballot","dueCheck"].includes(kind))return investForm(kind,id,v,error,done);
 if(handleManagerForm(kind,id,v,error,done))return;
 if(["projectStep","riskAction","exitApprove","receipt","lpPay","distribute","valuation","quarter"].includes(kind))return processOperation(kind,id,v,error,done);
 switch(kind){
 case "filter":query=v.query.trim();render();break;
 case "newProject":{
 if(db.projects.some(x=>x.name===v.name.trim()&&x.fund===Number(v.fund)))return error("该基金已有同名项目，请先核对项目台账。");
 if(!v.name.trim()||!v.owner.trim()||!v.reason.trim()||!v.risk.trim())return error("请填写项目资料。");
 let p={...v,name:v.name.trim(),fund:Number(v.fund),amount:Number(v.amount),stage:"待立项",id:"XM-"+(2601+db.projects.length),history:["周宁提交立项申请"]};
 db.projects.push(p);fundFilter="-1";done("已提交立项申请",()=>project(p.id));break}
 case "projectAction":{
 const p=db.projects.find(x=>x.id===id);if(!v.note.trim())return error("请填写办理意见。");p.stage={pass:"尽职调查",return:"待补正",resubmit:"待立项"}[v.decision];p.history.push(p.stage+" · "+v.note.trim());done("立项记录已更新",()=>project(id));break}
 case "dispatch":{
 let added=0;const names=fd.getAll("company");if(!names.length)return error("请选择至少一家企业。");
 for(const company of names){if(db.tasks.some(t=>t.company===company&&t.fund===Number(v.fund)&&t.q===v.q))continue;
 db.tasks.push({id:"QB-"+String(db.tasks.length+1).padStart(3,"0"),company,policy:{...businessRule(db.projects.find(p=>p.fund===Number(v.fund)&&p.name===company))},fund:Number(v.fund),q:v.q,due:v.due,status:"待提交",v:0,history:["周宁下发报送任务"],versions:[]});added++}
 if(!added)return error("所选企业本期任务均已下发，可在原任务内跟进。");
 statusFilter="";done("已下发 "+added+" 条，已有任务 "+(names.length-added)+" 条");break}
 case "submitTask":{
 const t=db.tasks.find(x=>x.id===id);if(!["待提交","待补正"].includes(t.status))return error("当前状态无法提交。");
 const filename=fd.get("file")?.name||t.file;if(!filename)return error("请选取一份佐证附件。");
 if(t.v)t.versions.push({v:t.v,rev:t.rev,cost:t.cost,file:t.file,orders:t.orders,cashOnHand:t.cashOnHand,burn:t.burn});
 for(const key of ["orders","cashOnHand","burn"])if(v[key]!==undefined)t[key]=Number(v[key]);Object.assign(t,{rev:Number(v.rev),cost:Number(v.cost),file:filename,v:t.v+1,status:"待复核"});
 t.history.push("V"+t.v+" 企业提交 · "+filename);done("已提交复核",()=>task(id));break}
 case "reviewTask":{
 const t=db.tasks.find(x=>x.id===id);if(t.status!=="待复核")return error("该版本已处理。");if(v.decision==="return"&&!v.note.trim())return error("请填写退回原因。");t.status=v.decision==="pass"?"已确认":"待补正";if(t.status==="已确认"){makeRisk(t);checkOperatingRisk(t)}t.history.push("V"+t.v+" "+t.status+" · 周宁 "+v.note.trim());done("已保存复核结果",()=>task(id));break}
 case "newReport":{
 const t=db.tasks.find(x=>x.id===v.source&&x.status==="已确认");if(!t)return error("需要已确认的报送。");
 const existing=db.reports.find(r=>r.source===t.id&&r.version===t.v&&r.type===v.type);if(existing)return report(existing.id);
 const r={id:"BG-"+String(db.reports.length+1).padStart(3,"0"),title:t.company+" · "+v.type,type:v.type,source:t.id,version:t.v,company:t.company,q:t.q,rev:t.rev,cost:t.cost,file:t.file,status:"草稿"};db.reports.unshift(r);done("报告草稿已生成",()=>report(r.id));break}
 case "calc":{
 let a=Number(v.a),b=Number(v.b),c=Number(v.c);$("#result").innerHTML=id==="F03"?kv("DPI · 已分配倍数",(b/a).toFixed(2)+"×")+kv("TVPI · 总价值倍数",((b+c)/a).toFixed(2)+"×"):kv("间接持有比例",Number((a*b/100).toFixed(4))+"%");break}
 }
}
document.addEventListener("submit",e=>{if(e.target.matches("[data-form]")){e.preventDefault();handleForm(e.target)}});
window.addEventListener("hashchange",readRoute);
readRoute();
const writeNotice=sessionStorage.getItem("yeda.writeNotice");if(writeNotice){sessionStorage.removeItem("yeda.writeNotice");announce(writeNotice)}

