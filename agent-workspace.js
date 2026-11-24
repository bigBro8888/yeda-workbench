"use strict";
const iw = db.agentWorkspace ??= {
 projects:[
  {id:"ws-dd",name:"清源膜材尽调",group:"投前研究",record:"XM-DD01"},
  {id:"ws-invest",name:"海岚智造跟踪",group:"投后管理",record:"XM-2601"},
  {id:"ws-lp",name:"产业基金一期季报",group:"基金运营"}
 ],threads:{}
};
let iwDraftProject=sessionStorage.getItem("yeda.agent.draftProject")||"";
let iwDocFilter="",iwHistoryFilter="";
function iwProject(id){return iw.projects.find(p=>p.id===id)}
function iwThreadList(){
 const threads=new Map();
 for(const r of db.agentRuns){
  const key=iaThreadKey(r);
  if(!threads.has(key))threads.set(key,{key,latest:r,first:r,count:0});
  const t=threads.get(key);t.first=r;t.count++;
 }
 return [...threads.values()].map(t=>{
  const m=iw.threads[t.key]||{};
  return {...t,name:m.name||t.first.question,project:m.project??t.first.workspaceProject??"",group:m.group||iaTools[t.first.plan?.[0]]?.title||"其他"};
 });
}
function iwCurrentProject(){
 if(iaThread){const t=iwThreadList().find(t=>t.key===iaThread);return t?.project||""}
 return iwProject(iwDraftProject)?iwDraftProject:"";
}
function iwProjects(selected){
 return opt([["","未归项目"],...iw.projects.map(p=>[p.id,p.name])],selected);
}
// Keep workspace actions beside their launcher, inside the agent surface.
let iwLauncher=null, iwOriginProject="", iwViewVersion=0;
function iwClose(restore=false){
 const pane=$(".iwPane");
 iwViewVersion++;
 iwPaneSize.disconnect();pane?.remove();
 if(iwLauncher?.isConnected){
  iwLauncher.removeAttribute("aria-expanded");
  if(restore)iwLauncher.focus({preventScroll:true});
 }
 iwLauncher=null;iwOriginProject="";
}
function iwPosition(){
 const pane=$(".iwPane"),split=$(".iwSplit"),rail=$(".iwRail");
 if(!pane||!split||!rail)return;
 const bounds=split.getBoundingClientRect(),item=iwLauncher?.getBoundingClientRect();
 const top=item?item.top-bounds.top:10;
 pane.style.top=Math.max(8,Math.min(top,bounds.height-pane.offsetHeight-8))+"px";
}
const iwPaneSize=new ResizeObserver(iwPosition);
function iwSurface(title,body,{back,backId="",caption="",primary=false}={}){
 const split=$(".iwSplit");if(!split)return;
 iwViewVersion++;
 let pane=split.querySelector(".iwPane");
 if(!pane){
  pane=document.createElement("section");pane.className="iwPane";pane.setAttribute("role","dialog");
  pane.setAttribute("aria-labelledby","iwPaneTitle");split.append(pane);iwPaneSize.observe(pane);
 }
 if(iwLauncher?.isConnected)iwLauncher.setAttribute("aria-expanded","true");
 const prev=back?cmd(back,"‹ 返回","iwBack",backId):"";
 pane.innerHTML='<header class="iwPaneHead">'+prev+(caption?'<small>'+esc(caption)+'</small>':"")+'<h2 id="iwPaneTitle" tabindex="-1">'+esc(title)+'</h2><button class="iwDismiss" data-act="iaWorkspaceClose" aria-label="关闭工作面板">'+ico("close")+'</button></header><div class="dcontent iwPaneBody">'+body+'</div>';
 iwPosition();(primary?pane.querySelector(".iwStart"):pane.querySelector("#iwPaneTitle"))?.focus({preventScroll:true});
}
function iwRootBack(){return matchMedia("(max-width:950px)").matches?"iaWorkspaceRail":""}
document.addEventListener("click",e=>{
 const launcher=e.target.closest(".iwRail [data-act],.iaHeader [data-act=iaWorkspaceRail],.iwContext [data-act]");
 if(launcher){
  if($(".iwPane")&&launcher===iwLauncher){iwClose(true);e.preventDefault();e.stopPropagation();return}
  iwClose();iwLauncher=launcher;
 }else if($(".iwPane")&&!e.target.closest(".iwPane"))iwClose();
},true);
document.addEventListener("keydown",e=>{
 if(e.key==="Escape"&&$(".iwPane")&&!$("#panel").open){e.preventDefault();iwClose(true)}
});
window.addEventListener("resize",iwPosition);
document.addEventListener("scroll",e=>{if(e.target.matches?.(".iwRail"))iwPosition()},true);
function iwDraft(id){
 iaUseThread("");iwDraftProject=iwProject(id)?.id||"";sessionStorage.setItem("yeda.agent.draftProject",iwDraftProject);
 iwClose();render();$("#main textarea")?.focus();
}
function iwLine(act,id,icon,label,end="",active=false){
 return cmd(act,ico(icon)+'<span>'+esc(label)+'</span>'+(end?'<small>'+esc(end)+'</small>':""),"iwLine"+(active?" selected":""),id);
}
function iwSidebar(){
 const ts=iwThreadList(),pid=iwCurrentProject(),groups=[...new Set(iw.projects.map(p=>p.group))];
 return '<div class="iwRailInner">'+cmd("iaNew",ico("plus")+"新对话","iwNew")+
 iwLine("iaWorkspaceHistory","","clock","全部对话",String(ts.length))+
 iwLine("iaWorkspaceDocs","","file","我的资料")+ '<div class="iwSection"><strong>项目空间</strong><button data-act="iaWorkspaceProjectEdit" aria-label="新建项目空间" title="新建项目空间">＋</button></div>'+
 groups.map(g=>'<div class="iwGroupName">'+esc(g)+'</div>'+iw.projects.filter(p=>p.group===g).map(p=>iwLine("iaWorkspaceProject",p.id,"project",p.name,String(ts.filter(t=>t.project===p.id).length),p.id===pid)).join("")).join("")+
 '<div class="iwSection"><strong>'+(ts.length?"最近对话":"对话示例")+'</strong></div>'+
 (ts.length?ts.slice(0,8).map(t=>iwLine("iaResume",t.key,"file",t.name,"",t.key===iaThread)).join(""):iaExamples.map(([k])=>iwLine("iaWorkspaceExample",k,iaTools[k].icon,iaExampleQuestion(k))).join(""))+'</div>';
}
function iwLayout(header,content){
 const y=$(".iwRail")?.scrollTop||0;
 queueMicrotask(()=>{const rail=$(".iwRail");if(rail)rail.scrollTop=y});
 const t=iwThreadList().find(t=>t.key===iaThread),p=iwProject(iwCurrentProject());
 const context=t||p?'<div class="iwContext"><span>'+esc([p?.name,t?.name].filter(Boolean).join(" / "))+'</span>'+(t?cmd("iaWorkspaceThreadEdit","整理对话","iaToolBtn",t.key):"")+'</div>':"";
 return '<article class="iaPage">'+header+'<div class="iwSplit"><aside class="iwRail" aria-label="智能体工作空间">'+iwSidebar()+'</aside><div class="iwConversation">'+context+content+'</div></div></article>';
}
function iwThreadRows(ts){
 return ts.length?ts.map(t=>'<div class="iwItem">'+cmd("iaResume",'<b>'+esc(t.name)+'</b><small>'+esc([t.group,iwProject(t.project)?.name||"未归项目",t.count+" 轮"].join(" · "))+'</small>',"iwItemMain",t.key)+cmd("iaWorkspaceThreadEdit","整理","textbtn",t.key)+'</div>').join(""):'<p class="dim">此处还没有对话。</p>';
}
function iwHistory(){
 const ts=iwThreadList(),groups=[...new Set(ts.map(t=>t.group))];
 if(!groups.includes(iwHistoryFilter))iwHistoryFilter="";
 iwSurface("全部对话",'<label>对话分类<select id="iwHistoryFilter">'+opt([["","全部分类"],...groups.map(g=>[g,g])],iwHistoryFilter)+'</select></label>'+iwThreadRows(ts.filter(t=>!iwHistoryFilter||t.group===iwHistoryFilter)),{back:iwRootBack()});
}
function iwProjectView(id){
 const p=iwProject(id);if(!p)return;
 iwOriginProject=id;
 const chats=iwThreadList().filter(t=>t.project===id);
 const action=(act,key,icon,label)=>cmd(act,ico(icon)+'<span>'+label+'</span><b aria-hidden="true">›</b>',"iwCommand",key);
 const history=chats.length?iwThreadRows(chats):'<p class="iwEmpty">发起第一段对话后，可以在这里继续。</p>';
 iwSurface(p.name,cmd("iaWorkspaceChat",ico("plus")+"在此项目中新建对话","iwStart",id)+
  '<section class="iwProjectHistory"><h3>项目对话 <small>'+chats.length+'</small></h3><div class="iwProjectThreads">'+history+'</div></section>'+
  '<div class="iwCommandList">'+action("iaWorkspaceProjectDocs",id,"file","查看项目资料")+
  (p.record?action("project",p.record,"box","打开投资档案"):"")+action("iaWorkspaceProjectEdit",id,"project","编辑项目信息")+'</div>',
  {back:iwRootBack(),caption:p.group,primary:true});
}
function iwGroupField(label,current,groups){
 return field("group",label,"text",current,'required maxlength="40" list="iwGroupOptions"')+'<datalist id="iwGroupOptions">'+[...new Set(groups)].map(g=>'<option value="'+esc(g)+'">').join("")+'</datalist>';
}
function iwProjectForm(id){
 const p=iwProject(id);
 iwSurface(p?"编辑项目":"新建项目空间",form("iwProject",field("name","项目名称","text",p?.name||"",'required maxlength="80"')+
 iwGroupField("项目分类（可新建）",p?.group||"投前研究",iw.projects.map(x=>x.group))+
 formSelect("record","关联投资档案（选填）",opt([["","无"],...db.projects.map(x=>[x.id,x.name+" · "+x.id])],p?.record||"")),"保存项目",id||""),{back:p?"iaWorkspaceProject":iwRootBack(),backId:id});
}
function iwThreadForm(id){
 const t=iwThreadList().find(t=>t.key===id);if(!t)return;
 iwSurface("整理对话",form("iwThread",field("name","对话名称","text",t.name,'required maxlength="400"')+
 formSelect("project","所属项目",iwProjects(t.project))+iwGroupField("对话分类（可新建）",t.group,iwThreadList().map(x=>x.group)),"保存归类",id),{back:iwOriginProject?"iaWorkspaceProject":"iaWorkspaceHistory",backId:iwOriginProject});
}
// Each attachment and its metadata share a single IndexedDB transaction.
let iwLibrary;
function iwOpenLibrary(){
 if(!iwLibrary)iwLibrary=new Promise((resolve,reject)=>{
  const req=indexedDB.open("yeda.personal.agent.library",1);
  req.onupgradeneeded=()=>req.result.createObjectStore("materials",{keyPath:"id"});
  req.onsuccess=()=>resolve(req.result);req.onerror=()=>{iwLibrary=null;reject(req.error)};
 });
 return iwLibrary;
}
async function iwStore(mode,operation){
 const database=await iwOpenLibrary();
 return new Promise((resolve,reject)=>{
  const tx=database.transaction("materials",mode),req=operation(tx.objectStore("materials"));
  tx.oncomplete=()=>resolve(req.result);tx.onabort=()=>reject(tx.error||Error("资料保存失败"));
 });
}
async function iwDocs(){
 iwSurface(iwOriginProject?"项目资料":"我的资料",'<label>所属项目<select id="iwDocFilter">'+opt([["*","全部资料"],["","未归项目"],...iw.projects.map(p=>[p.id,p.name])],iwDocFilter)+'</select></label><div class="iwActions">'+cmd("iaWorkspaceDocEdit","添加资料","btn primary")+'</div><p class="dim">文件和笔记保存在此浏览器。</p><div id="iwDocsList" role="status">正在读取资料…</div>',{back:iwOriginProject?"iaWorkspaceProject":iwRootBack(),backId:iwOriginProject});
 const el=$("#iwDocsList"),filter=iwDocFilter;
 try{
  const docs=(await iwStore("readonly",s=>s.getAll())).filter(d=>filter==="*"||d.project===filter).sort((a,b)=>b.updated-a.updated);
  el.innerHTML=docs.length?docs.map(d=>'<div class="iwItem">'+cmd("iaWorkspaceDocView",'<b>'+esc(d.name)+'</b><small>'+esc([d.file?.name||"笔记",iwProject(d.project)?.name||"未归项目"].join(" · "))+'</small>',"iwItemMain",d.id)+'</div>').join(""):'<p class="dim">还没有资料，可添加文件或研究笔记。</p>';
 }catch{el.textContent="浏览器资料库不可用，请检查站点存储权限。"}
}
async function iwDoc(id,edit){
 const version=iwViewVersion,d=id?await iwStore("readonly",s=>s.get(id)):null;
 if(version!==iwViewVersion||route!=="agent")return;
 if(id&&!d)throw Error("资料已移除，请重新打开资料库。");
 if(edit){
  iwSurface(d?"编辑资料":"添加资料",form("iwDoc",field("name","资料名称","text",d?.name||"",'maxlength="120" placeholder="留空时使用文件名"')+
   formSelect("project","所属项目",iwProjects(d?.project??(iwDocFilter==="*"?iwCurrentProject():iwDocFilter)))+
   '<label>研究笔记<textarea name="note" rows="4" maxlength="20000">'+esc(d?.note||"")+'</textarea></label><label>'+esc(d?.file?"替换文件（当前为 "+d.file.name+"）":"选择文件（最大 25 MB）")+'<input name="file" type="file"></label>',"保存资料",id),{back:id?"iaWorkspaceDocView":"iaWorkspaceLibraryBack",backId:id});return;
 }
 iwSurface(d.name,kv("所属项目",iwProject(d.project)?.name||"未归项目")+kv("最近更新",new Date(d.updated).toLocaleString("zh-CN"))+
  (d.note?'<p class="iwNote">'+esc(d.note)+'</p>':"")+(d.file?kv("文件",d.file.name)+" "+cmd("iaWorkspaceDownload","下载原文件","btn",id):"")+
  '<div class="iwActions">'+cmd("iaWorkspaceDocEdit","编辑资料","btn",id)+cmd("iaWorkspaceRemove","移除资料","textbtn",id)+'</div>',{back:"iaWorkspaceLibraryBack"});
}
async function iwAct(action,id){
 try{
  switch(action){
   case "iaWorkspaceClose":iwClose(true);break;
   case "iaWorkspaceRail":iwOriginProject="";iwSurface("智能体工作空间",iwSidebar());break;
   case "iaWorkspaceLibraryBack":await iwDocs();break;
   case "iaWorkspaceExample":iwClose();iaAction("iaPreset",id);break;
   case "iaWorkspaceHistory":iwOriginProject="";iwHistory();break;
   case "iaWorkspaceProject":iwProjectView(id);break;
   case "iaWorkspaceProjectEdit":iwProjectForm(id);break;
   case "iaWorkspaceThreadEdit":iwThreadForm(id);break;
   case "iaWorkspaceChat":iwDraft(id);break;
   case "iaWorkspaceDocs":iwOriginProject="";iwDocFilter="*";await iwDocs();break;
   case "iaWorkspaceProjectDocs":iwDocFilter=id;await iwDocs();break;
   case "iaWorkspaceDocEdit":await iwDoc(id,true);break;
   case "iaWorkspaceDocView":await iwDoc(id,false);break;
   case "iaWorkspaceDownload":{
    const d=await iwStore("readonly",s=>s.get(id));if(!d?.file)throw Error("文件不可用。");
    const u=URL.createObjectURL(d.file),a=document.createElement("a");a.href=u;a.download=d.file.name;a.click();setTimeout(()=>URL.revokeObjectURL(u),1500);break;
   }
   case "iaWorkspaceRemove":iwSurface("移除此资料？",'<p>资料及其文件将从当前浏览器删除。</p>'+cmd("iaWorkspaceDocView","保留资料","btn",id)+cmd("iaWorkspaceRemoveConfirm","确认移除","btn",id),{back:"iaWorkspaceDocView",backId:id});break;
   case "iaWorkspaceRemoveConfirm":await iwStore("readwrite",s=>s.delete(id));await iwDocs();break;
  }
 }catch(e){announce(e.message||"资料库暂不可用")}
}
async function iwSubmit(f){
 if(f.dataset.busy)return;
 const id=f.dataset.id,kind=f.dataset.form,v=Object.fromEntries(new FormData(f)),name=v.name.trim(),group=v.group?.trim();
 const err=f.querySelector(".error"),version=iwViewVersion;f.dataset.busy="1";
 try{
  if(kind==="iwDoc"){
   const old=id?await iwStore("readonly",s=>s.get(id)):null,file=v.file?.name?v.file:old?.file;
   if(file&&file.size>25*1024*1024)throw Error("请选择 25 MB 以内的文件。");
   if(!file&&!v.note.trim())throw Error("请填写笔记或选择文件。");
   if(!name&&!file)throw Error("请填写资料名称。");
   await iwStore("readwrite",s=>s.put({id:id||crypto.randomUUID(),name:name||file.name,project:v.project,note:v.note.trim(),file,updated:Date.now()}));
   if(version===iwViewVersion&&f.isConnected){iwDocFilter=v.project||"*";await iwDocs()}return;
  }
  if(!name||!group)throw Error("请填写名称和分类。");
  if(kind==="iwProject"){
   if(iw.projects.some(p=>p.id!==id&&p.name===name))throw Error("已有同名项目空间。");
   const p=iwProject(id)||{id:crypto.randomUUID()};Object.assign(p,{name,group,record:v.record});if(!id)iw.projects.push(p);
   save("整理智能体项目空间");iwRefreshRail();iwProjectView(p.id);
  }else if(kind==="iwThread"){
   iw.threads[id]={name,group,project:v.project};save("整理智能体对话");iwRefreshRail();iwHistoryFilter=group;if(iwOriginProject)iwProjectView(iwOriginProject);else iwHistory();
  }
 }catch(e){err.textContent=e.message||"保存失败，请检查浏览器存储空间。"}finally{delete f.dataset.busy}
}
function iwRefreshRail(){
 const rail=$(".iwRail");
 if(rail){
  const old=rail.contains(iwLauncher)?iwLauncher.dataset:null;
  rail.innerHTML=iwSidebar();
  if(old)iwLauncher=[...rail.querySelectorAll("[data-act]")].find(b=>b.dataset.act===old.act&&b.dataset.id===old.id);
 }
 const context=$(".iwContext span");
 if(context){const t=iwThreadList().find(x=>x.key===iaThread);context.textContent=[iwProject(iwCurrentProject())?.name,t?.name].filter(Boolean).join(" / ")}
}
document.addEventListener("change",e=>{
 if(externalCompany||route!=="agent")return;
 if(e.target.id==="iwDocFilter"){iwDocFilter=e.target.value;iwDocs()}
 if(e.target.id==="iwHistoryFilter"){iwHistoryFilter=e.target.value;iwHistory()}
});
