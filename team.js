"use strict";
const team=window.teamSession||null;
const actor=()=>team?.user.name||"演示用户";
const writable=()=>!team||["经办人","管理员"].includes(team.user.role);
let teamBusy=false;

async function teamRequest(name,body){
 const response=await fetch("/api/"+name,body===undefined?{cache:"no-store"}:{
  method:"POST",headers:{"Content-Type":"application/json","X-Workspace":"1"},body:JSON.stringify(body)});
 if(response.status===401){location.reload();throw Error("登录已到期")}
 const result=await response.json();
 if(!response.ok)throw Error(result.error||"团队服务未响应");
 return result;
}
function showFailure(error){
 notice(error.message);
 const section=document.querySelector("dialog[open] section");
 if(section){let p=section.querySelector(".saveError");if(!p){p=document.createElement("p");p.className="saveError";p.setAttribute("role","alert");section.prepend(p)}p.textContent=error.message}
}
async function sharedSave(action,body){
 if(teamBusy)throw Error("正在保存，请等待当前操作完成");
 teamBusy=true;
 try{
  const revision=team.revision;
  const result=await teamRequest(action,{...body,revision});
  team.revision=result.revision;
  if(result.data)db=result.data;
  team.data=structuredClone(result.data||body.data);
 }catch(error){db=structuredClone(team.data);throw error}finally{teamBusy=false}
}
async function refreshTeam(){
 if(teamBusy)return;
 const result=await teamRequest("state");team.revision=result.revision;team.data=result.data;db=structuredClone(result.data);render();
}
if(team){
 let checking=false;
 const idleHome=()=>document.visibilityState==="visible" && page==="首页" && !teamBusy && !$("#modal").open;
 async function checkDashboard(){
  if(checking||!idleHome())return;
  checking=true;
  try{
   const revision=team.revision,latest=await teamRequest("revision");
   if(latest.revision>revision && idleHome() && team.revision===revision){
    const snapshot=await teamRequest("state");
    if(idleHome() && team.revision===revision){
     team.revision=snapshot.revision;team.data=snapshot.data;db=structuredClone(snapshot.data);render();
    }
   }
  }catch{/* A disconnected dashboard retries on the next interval. */}finally{checking=false}
 }
 setInterval(checkDashboard,15000);
 window.addEventListener("focus",checkDashboard);
}
async function transition(action,target){
 try{
  await sharedSave("workflow",action==="submit"?{action,module:page,owner:rid,section:sub,entry:target}:{action,task:target});
  if($("#modal").open)$("#modal").close();
  render();notice(action==="submit"?"申请已提交":"审批结果已保存");
 }catch(error){showFailure(error)}
}
function canReview(job){
 return job.type==="我的待办"&&(!team||(["管理员","审批人"].includes(team.user.role)&&job.person!==actor()));
}
function myJob(job){
 if(!team)return job.type===work||work==="我的申请";
 if(work==="我的申请")return job.person===actor();
 if(work==="我的已办")return job.reviewer===actor();
 return work==="我的待办"&&canReview(job);
}
async function sharedFileStore(operation){
 return operation({
  async put(file,id){
   const r=await fetch("/api/files/"+encodeURIComponent(id),{method:"POST",headers:{"X-Workspace":"1","X-File-Name":encodeURIComponent(file.name)},body:file});
   if(!r.ok)throw Error((await r.json()).error||"附件上传失败");return id;
  },
  async get(id){
   const r=await fetch("/api/files/"+encodeURIComponent(id));if(!r.ok)throw Error("附件不可用");
   return new File([await r.blob()],decodeURIComponent(r.headers.get("X-File-Name")||"附件"));
  },
  async delete(id){await teamRequest("discard-file",{id})}
 });
}
function teamControls(){
 if(!team)return;
 const name=$("#identity");name.textContent=actor()+" · "+team.user.role;
 if(!writable()){
  const actions=["new","edit","remove","editNote","removeNote","addNote","submitStage","stock","editChange","admit","follow","terminate","applyQuote","saveTemplate","proposalNew"];
  for(const a of actions)document.querySelectorAll('#view [data-a="'+a+'"]').forEach(el=>el.disabled=true);
  document.querySelectorAll("#config button,#industryConfig button.primary,#generateReport button.primary").forEach(el=>el.disabled=true);
 }
}
function safeLink(url,label){
 try{const u=new URL(url);if(u.protocol==="https:")return '<a target="_blank" rel="noreferrer" href="'+esc(u.href)+'">'+esc(label)+'</a>'}catch{}
 return esc(label)
}
function teamHub(){
 const actions=btn("同步最新业务数据","syncTeam")+btn("退出登录","logoutTeam");
 const admin=team.user.role==="管理员";
 modal("团队工作区",kv({当前用户:actor(),角色:team.user.role,数据版本:team.revision},["当前用户","角色","数据版本"])+'<div class="queryline">'+actions+'</div>'+
 (admin?'<div class="queryline">'+btn("成员与角色","members")+btn("操作记录","auditTeam")+btn("披露采集与推送","scheduleTeam")+'</div>':""));
}
async function members(){
 const users=await teamRequest("accounts");
 modal("成员与角色",table(["用户名","角色"],users.map(r=>[esc(r.name),esc(r.role)]))+
 '<h3>新建成员</h3><div class="fields">'+input("用户名","",null,true)+'<label>初始密码<input name="密码" type="password" minlength="10" autocomplete="new-password"></label>'+input("成员角色","经办人",["经办人","审批人","财务","只读","管理员"])+'</div>'+btn("创建成员","createMember","","primary"));
}
async function scheduleTeam(){
 const cfg=db.settings.disclosureSchedule||{targets:[],at:"18:00"};
 const items=db.settings.disclosures||[],history=await teamRequest("history");
 modal("披露采集与推送",'<div class="fields"><label>证券代码（每行一个，市场用 listed 或 neeq）<textarea name="targets" placeholder="listed 600000">'+esc(cfg.targets.map(t=>t.market+" "+t.code).join("\n"))+'</textarea></label><label>每日运行时间<input type="time" name="at" value="'+esc(cfg.at)+'"></label><label><input type="checkbox" name="enabled" '+(cfg.enabled?"checked":"")+'>启用每日采集</label><label><input type="checkbox" name="email" '+(cfg.email?"checked":"")+' '+(team.services.mail?"":"disabled")+'>新增公告邮件推送'+(team.services.mail?"":"（待配置 SMTP）")+'</label></div><div class="queryline">'+btn("保存调度","saveSchedule")+btn("立即采集","collectNow")+'</div><h3>公告索引</h3>'+table(["企业","公告","披露日期","来源"],items.slice(0,100).map(r=>[esc(r.issuer),safeLink(r.link,r.title),esc(r.day),esc(r.source)]))+'<h3>任务记录</h3>'+table(["任务","结果","时间","详情"],history.map(r=>[esc(r.kind),esc(r.status),esc(r.at),esc(r.detail)])));
}
async function companyLookup(r){
 const term=r.企业全称||r.基金名称||r.项目名称||"";
 modal("企业信息查询",'<div class="queryline">'+input("查询主体",term)+input("信息类型","工商登记",["工商登记","上游供应商","下游客户"])+(team?.services.company?btn("查询授权数据","lookupCompany","","primary"):"")+'</div>'+safeLink("https://www.qcc.com/web/search?key="+encodeURIComponent(term),"在企查查核对企业与关联方")+'<div id="companyResult"></div>');
}
document.addEventListener("click",async e=>{
 const el=e.target.closest("[data-a]");if(!el)return;
 const a=el.dataset.a;
 try{
  if(a==="identity"){if(team)teamHub();else modal("浏览器演示",'<p>业务数据保存在当前浏览器。团队版支持独立账号、共享附件与跨人审批。</p>');return}
  if(a==="syncTeam"){await refreshTeam();$("#modal").close();notice("数据已同步")}
  if(a==="logoutTeam"){await teamRequest("logout",{});sessionStorage.removeItem("team.dialogs."+actor());sessionStorage.removeItem("equity.agent."+actor());location.reload()}
  if(a==="members")await members();
  if(a==="createMember"){const f=el.form;await teamRequest("accounts",{name:f.elements.用户名.value,password:f.elements.密码.value,role:f.elements.成员角色.value});await members()}
  if(a==="auditTeam"){const logs=await teamRequest("audit");modal("操作记录",table(["时间","操作人","操作","业务对象"],logs.map(x=>[x.at,x.actor,x.event,x.subject].map(esc))))}
  if(a==="scheduleTeam")await scheduleTeam();
  if(a==="saveSchedule"){
   const f=el.form,targets=f.elements.targets.value.trim().split(/\r?\n/).filter(Boolean).map(line=>{const match=line.trim().match(/^(listed|neeq)\s+(\d{6})$/);if(!match)throw Error("证券代码格式示例：listed 600000");return {market:match[1],code:match[2]}});
   if(targets.length>30||!f.elements.at.value||(f.elements.enabled.checked&&!targets.length))throw Error("请填写运行时间，并配置 1 至 30 个采集目标");
   db.settings.disclosureSchedule={targets,at:f.elements.at.value,enabled:f.elements.enabled.checked,email:f.elements.email.checked};await persist();await scheduleTeam();notice("调度已保存");
  }
  if(a==="collectNow"){el.disabled=true;if(!db.settings.disclosureSchedule?.targets?.length)throw Error("请先保存采集目标");const result=await teamRequest("collect",{});await refreshTeam();await scheduleTeam();notice(result.message)}
  if(a==="companyInfo"){await companyLookup(record()||records().find(x=>x.id===el.dataset.v)||{})}
  if(a==="lookupCompany"){const r=await teamRequest("company",{term:el.form.elements.查询主体.value,kind:el.form.elements.信息类型.value});$("#companyResult").innerHTML=r.fields?table(["字段","结果"],r.fields.map(pair=>pair.map(esc))):table(["企业","年份","金额","比例","来源"],r.rows.map(x=>[x.name,x.year,x.amount,x.percent,x.source].map(esc)))}
  if(a==="applyQuote"){const r=db.股票列表.find(r=>r.id===el.dataset.v);const quote=await teamRequest("quote",{code:r.股票代码});const old=r.当前股价;r.当前股价=quote.price;r.最后更新时间=quote.asof.slice(0,10);logs(r.id,"行情更新："+old+" → "+quote.price+"，来源时间 "+quote.asof);await persist();render();notice("行情已更新")}
 }catch(err){showFailure(err)}finally{if(a==="collectNow")el.disabled=false}
});
