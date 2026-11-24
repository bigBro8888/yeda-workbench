"use strict";
const ddApiBase = "http://127.0.0.1:18765";
const ddTabs = [["research","企业与产业链"],["reports","公开财报"],["requests","企业回传"]];
const ddRoles = ["标的企业","对标企业","上下游企业"];
const ddRelations = ["标的企业","上游供应商","下游客户","经销商","对标企业"];
const ddIndustries = ["A 农林牧渔","B 采矿业","C 制造业","D 水电煤气","E 建筑业","F 批发零售","G 运输仓储","H 住宿餐饮","I 信息技术","J 金融业","K 房地产","L 商务服务","M 科研服务","N 水利环境","O 居民服务","P 教育","Q 卫生和社会工作","R 文化体育娱乐","S 综合"];
db.ddEvidence ??= [];
let ddView = null;
const ddOptions = items => items.map(s=>[s,s]);
const ddDay = () => new Date().toLocaleDateString("sv-SE");
const ddUrl = (id,tab="research") => "intelligence/"+id+"/"+tab;
function ddLink(url,label){
 try{const u=new URL(url);if(!["https:","http:"].includes(u.protocol))return ""}catch{return ""}
 return '<a class="ddLink" target="_blank" rel="noopener noreferrer" href="'+esc(url)+'">'+esc(label)+' ↗</a>';
}
function ddUrlValid(url){return !url||Boolean(ddLink(url,"查看"))}
function ddQcc(term){return "https://www.qcc.com/web/search?key="+encodeURIComponent(term)}
function ddEmpty(msg){return '<div class="ddEmpty">'+esc(msg)+'</div>'}
function ddPanel(name, action, body){return '<section class="panel ddPanel">'+panelHead(name,action)+body+'</section>'}
async function ddApi(op,data,asBlob=false){
 if(location.hostname.endsWith(".github.io")){
  if(op==="agent-plan")return {available:false};
  throw Error("当前为 GitHub Pages 网页演示。在线取数和企业资料回传请在本地尽调工作台办理。");
 }
 let response;
 try{response=await fetch(ddApiBase+"/api/"+op,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(data),signal:AbortSignal.timeout(95000)})}
 catch{throw Error("尽调服务连接失败。请双击交付目录中的“启动尽调工作台.cmd”，从本机工作台重试。")}
 if(!response.ok){let m;try{m=(await response.json()).error}catch{}throw Error(m||"服务暂不可用，请重试。")}
 return asBlob?response.blob():response.json();
}
function ddWorkspace(){
 const p=getProject(page)||getProject("XM-DD01")||db.projects[0];
 if(!p)return ddEmpty("请先在项目池登记投资项目。");
 const tab=ddTabs.some(t=>t[0]===detailTab)?detailTab:"research";
 const v={p,tab,data:null,peers:[],reports:[],qcc:null};
 ddView=v;
 const selector='<label class="ddProjectSelect">当前项目<select id="ddProject">'+opt(db.projects.map(x=>[x.id,x.name+" · "+x.id]),p.id)+'</select></label>';
 const head=title("尽调工作台","投资业务　/　项目尽职调查",selector);
 const banner='<div class="ddBanner"><div><small>'+esc(funds[p.fund].name)+'</small><h2>'+esc(p.name)+'</h2><span>'+esc(p.industry)+'　·　项目负责人 '+esc(p.owner)+'</span></div>'+
 '<div class="ddContext"><b>'+esc(p.stage)+'</b>'+cmd("nav","查看投资档案 ›","",projectUrl(p.id,"overview"))+'</div></div>';
 const tabs='<nav class="viewtabs ddTabs" aria-label="尽调分类">'+ddTabs.map(([key,label])=>cmd("nav",label,key===tab?"active":"",ddUrl(p.id,key))).join("")+'</nav>';
 queueMicrotask(()=>ddLoad(v));
 return '<div class="ddWork">'+head+banner+tabs+'<div id="ddStatus" role="status"></div><div id="ddBody">'+ddBody(v)+'</div></div>';
}
function ddActive(v){return v===ddView&&route==="intelligence"&&!externalCompany&&$("#ddBody")}
async function ddLoad(v){
 if(!ddActive(v))return;
 try{
  v.data=await ddApi("workspace",{project:v.p.id});
  if(!ddActive(v))return;
  $("#ddStatus").textContent="";
  if(v.tab==="research"){const s=$("#ddLicense");if(s)s.textContent=v.data.licensed?"服务器已配置密钥，按已购接口取数":"企查查 API 待授权"}
  else {const el=$("#ddSaved");if(el)el.innerHTML=v.tab==="requests"?ddTasks(v):ddRecords(v)}
 }catch(e){
  if(!ddActive(v))return;
  $("#ddStatus").textContent=e.message;
  if($("#ddLicense"))$("#ddLicense").textContent="未连接尽调服务";
  if($("#ddSaved"))$("#ddSaved").innerHTML=ddEmpty("连接尽调服务后可查看项目记录。");
 }
}
function ddBody(v){
 if(v.tab==="reports")return ddReportsPage(v);
 if(v.tab==="requests")return ddPanel("企业资料请求",'<div class="row">'+cmd("ddRefresh","刷新","textbtn")+cmd("ddNew","发起资料请求","btn primary")+'</div>','<div id="ddSaved">'+ddEmpty("正在读取资料请求…")+'</div>');
 const term=v.p.name;
 const search=form("ddCompany",field("term","企业全称或统一社会信用代码","text",term,'required minlength="2" maxlength="160"')+
  formSelect("kind","查询维度",opt(ddOptions(["工商登记","上游供应商","下游客户"]),"工商登记")),"查询企查查");
 const lookup=ddPanel("企业查询",'<small class="ddStatus" id="ddLicense">正在检查授权</small>',
  '<div class="ddPad">'+search+'<div class="ddSourceLinks"><span id="ddQccLink">'+ddLink(ddQcc(term),"在企查查查看")+'</span>'+ddLink("https://www.gsxt.gov.cn/","国家企业信用信息公示系统")+'</div><div id="ddCompanyResult" aria-live="polite"></div></div>');
 const sector=v.p.industry==="数字科技"?"I":"C";
 const find=form("ddPeers",formSelect("industry","深交所行业分类",opt(ddIndustries.map(i=>[i[0],i]),sector))+
  field("term","证券简称或代码（选填）","text","","maxlength=50"),"查找同行");
 const similar=ddPanel("对标候选",'<small class="ddStatus">深交所 A 股名录</small>',
  '<div class="ddPad">'+find+'<p class="ddHint">按行业生成候选。纳入项目时填写产品、客户或收入结构的可比依据。</p><div id="ddPeerResult" aria-live="polite"></div></div>');
 const open=(v.p.diligence||[]).filter(d=>!d.closed);
 const issues=open.length?ddPanel("待核验事项",cmd("nav","查看项目尽调清单","textbtn",projectUrl(v.p.id,"decision")),
  table(["需核实的事项","责任人","取证"],open.map((d,i)=>tr([esc(d.subject),esc(d.owner),cmd("ddAskProof","向企业取证","textbtn",i)])))):"";
 return '<div class="ddGrid">'+lookup+similar+'</div>'+issues+ddEvidencePanel(v);
}
function ddEvidencePanel(v){
 const rows=db.ddEvidence.filter(x=>x.project===v.p.id);
 return ddPanel("项目关系与证据",cmd("ddEvidence","登记证据","btn"), rows.length?table(["企业 / 关系","判断依据","证据出处","核对日期"],rows.map(x=>tr([
  '<b>'+esc(x.name)+'</b><small>'+esc(x.kind)+'</small>',esc(x.reason),esc(x.source),esc(x.date)],"ddEvidence",x.id))):
  ddEmpty("可登记供应商、客户、经销商或对标公司，附上财报页码、访谈纪要编号或来源链接。"));
}
function ddEvidenceForm(values={}){
 const p=ddView.p;
 let fields=field("name","企业名称","text",values.name||"",'required maxlength="160"')+formSelect("kind","与项目的关系",opt(ddOptions(ddRelations),values.kind||"上游供应商"))+
 field("reason","关系或可比依据","text",values.reason||"",'required maxlength="500" placeholder="例如主要产品、采购品类或客户构成"')+
 field("source","证据出处及定位","text",values.source||"",'required maxlength="400" placeholder="报告名称及页码、名录证券代码或纪要编号"')+
 field("url","原始链接（选填）","url",values.url||"", 'maxlength="1500"')+field("date","核对日期","date",values.date||ddDay(),"required");
 if(values.snapshot)fields+='<details><summary>本次查询快照</summary><pre>'+esc(values.snapshot)+'</pre></details>';
 ddView.draftSnapshot=values.snapshot||"";
 drawer("项目证据 · "+p.name,(values.url?ddLink(values.url,"打开已登记来源"):"")+form("ddSaveEvidence",fields,"保存到项目底稿",values.id||""));
}
function ddReportsPage(v){
 const yr=new Date().getFullYear();
 const formBody=formSelect("market","披露市场",opt([["neeq","新三板挂牌公司"],["listed","沪深北 A 股"]],"neeq"))+
  field("code","证券代码","text","",'required pattern="[0-9]{6}" maxlength="6" inputmode="numeric" placeholder="六位证券代码"')+
  field("year","披露年份","number",yr,'required min="2000" max="'+yr+'"');
 return ddPanel("按证券代码收集财报","",'<div class="ddPad ddPublic">'+form("ddReports",formBody,"查找定期报告")+
 '<div class="ddSourceLinks">试查公开企业 '+cmd("ddExample","原子高科 · 430005","textbtn","neeq")+
 cmd("ddExample","平安银行 · 000001","textbtn","listed")+ddLink("https://www.neeq.com.cn/disclosure/announcement.html","股转系统公告")+'</div>'+
 '<div id="ddHits" aria-live="polite"></div></div>')+ddPanel("项目财报底稿",cmd("ddRefresh","刷新","textbtn"),'<div id="ddSaved">'+ddEmpty("正在读取底稿…")+'</div>');
}
function ddRecords(v){
 const rs=v.data?.records||[];
 return rs.length?table(["报告 / 披露主体","归档关系","披露日期","来源","原件"],rs.map(r=>tr([
  '<b>'+esc(r.title)+'</b><small>'+esc(r.issuer+" · "+r.code)+'</small>',esc(r.role),esc(r.day),ddLink(r.link,r.source),
  (r.pages?cmd("ddText","下载网页正文","textbtn",String(r.fileId))+'<small>已收齐 '+r.pages+' 页网页正文</small>':"")+
  (r.hasFile?cmd("ddOriginal","下载已存 PDF","textbtn",String(r.fileId))+'<small>'+esc(r.method)+'</small>':cmd("ddRetry","重试收取 PDF","textbtn",String(r.fileId))+cmd("ddAttach","补存 PDF","textbtn",String(r.fileId))+'<small>'+(r.pages?'PDF 待补存':'仅存公告索引')+'</small>')]))):
  ddEmpty("查询后核对披露主体，选择它与当前项目的关系，即可收集财报。");
}
function ddTasks(v){
 const ts=v.data?.tasks||[];
 return ts.length?table(["资料名称 / 企业","报告期间","截止日期","状态","提交版本"],ts.map(t=>tr([
  '<b>'+esc(t.title)+'</b><small>'+esc(t.company)+'</small>',esc(t.period),esc(t.due),tag(t.state),t.versions.length?"V"+t.versions.length:"待回传"],"ddTask",t.id))):
  ddEmpty("向标的企业发起一项资料请求，指定报告期间和截止日期，企业可从专属入口上传原件。");
}
function ddTask(t){
 const origin=ddView.data?.intake||ddApiBase, portal=origin+"/intake#"+t.token;
 let body=kv("提交企业",t.company)+kv("资料期间",t.period)+kv("截止日期",t.due)+kv("当前状态",t.state)+(t.note?kv("资料要求",t.note):"")+
 '<div class="ddIntake">'+ddLink(portal,"打开企业回传入口")+cmd("ddCopy","复制回传链接","textbtn",t.id)+'<small>'+(origin===ddApiBase?"本机演示地址，可在本机另一个浏览器中提交。":"使用已配置的企业回传域名，持链接的联系人可办理本项请求。")+'</small></div>';
 if(t.versions.length)body+="<h3>提交与复核记录</h3>"+t.versions.map(f=>'<div class="ddVersion"><b>V'+f.ver+'　'+esc(f.name)+'</b>'+
  '<small>'+esc(f.stamp.replace("T"," ")+" · "+f.verdict)+'</small>'+(f.comment?'<p>'+esc(f.comment)+'</p>':"")+cmd("ddDownload","下载原件","textbtn",f.id)+'</div>').join("");
 if(t.state==="待复核")body+=form("ddReview",formSelect("verdict","复核决定",opt(ddOptions(["已确认","待补正"]),"已确认"))+
  field("note","复核意见（退回必填）","text","","maxlength=1200"),"提交复核",t.id);
 drawer(t.title,body);
}
function ddTaskNew(subject="年度审计报告"){
 const p=ddView.p;
 drawer("向企业收集资料",form("ddCreate",field("company","提交企业","text",p.name,'required maxlength="160"')+
  field("title","所需资料","text",subject,'required maxlength="160"')+
  field("period","报告期间","text","",'required maxlength="160" placeholder="例如 2025 年度"')+
  field("due","提交截止日期","date","","required")+field("note","资料要求（选填）","text","",'maxlength="1200" placeholder="例如合并口径，含审计意见、三张主表和附注"'),"生成企业回传入口",crypto.randomUUID()));
}
function ddResults(items){
 if(!items.length)return ddEmpty("此代码在所选市场和披露年份未检索到定期报告全文。可核对证券代码、年份或来源网站。");
 return table(["报告名称","报告期间","披露日期","原始公告"],items.map(r=>tr([esc(r.title),esc(r.period),esc(r.day),ddLink(r.link,r.source)])))+
  form("ddCollect",formSelect("role","披露主体与当前项目的关系",opt([["","请选择"],...ddOptions(ddRoles)],"")),"收集本次 "+items.length+" 份财报");
}
async function ddDownload(op,id,name){
 const blob=await ddApi(op,{id},true),u=URL.createObjectURL(blob),a=document.createElement("a");
 a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);
}
async function ddAct(action,id){
 const v=ddView;if(!ddActive(v))return;
 try{
  switch(action){
   case "ddEvidence":return ddEvidenceForm(db.ddEvidence.find(x=>x.project===v.p.id&&x.id===id));
   case "ddNew":return ddTaskNew();
   case "ddAskProof":{const d=(v.p.diligence||[]).filter(x=>!x.closed)[+id];if(d)ddTaskNew(d.subject);return}
   case "ddRefresh":return ddLoad(v);
   case "ddTask":{const t=v.data?.tasks.find(x=>x.id===id);if(t)ddTask(t);return}
   case "ddCopy":{const t=v.data?.tasks.find(x=>x.id===id);if(t){await navigator.clipboard.writeText((v.data.intake||ddApiBase)+"/intake#"+t.token);announce("已复制企业回传链接")}return}
   case "ddExample":{const f=document.querySelector('[data-form="ddReports"]');f.elements.market.value=id;f.elements.code.value=id==="neeq"?"430005":"000001";f.requestSubmit();return}
   case "ddCandidate":{const x=v.peers[+id];if(x)ddEvidenceForm({name:x.name,kind:"对标企业",url:x.link,source:"深交所 A 股名录 · "+x.code+" · "+x.sector+" · "+v.peerDate});return}
   case "ddQEvidence":{const q=v.qcc;if(!q)return;const x=q.rows?.[+id];ddEvidenceForm({name:x?.name||q.name,kind:q.kind==="工商登记"?"标的企业":q.kind,url:ddQcc(q.term),
    source:x?.source||"企查查 · "+q.kind+" · 查询主体 "+q.term,snapshot:JSON.stringify(x||q.fields,null,2)});return}
   case "ddOriginal":{const r=v.data?.records.find(x=>String(x.fileId)===id);if(r)await ddDownload("original",id,r.title+".pdf");return}
   case "ddText":{const r=v.data?.records.find(x=>String(x.fileId)===id);if(r)await ddDownload("text",id,r.title+".txt");return}
   case "ddAttach":{const r=v.data?.records.find(x=>String(x.fileId)===id);if(r&&!r.hasFile)drawer("补存公告原件",kv("公告",r.title)+kv("披露主体",r.issuer+" · "+r.code)+ddLink(r.link,"核对来源公告")+form("ddAttachFile",field("file","核对主体及报告期间后选择 PDF","file","","required accept=\".pdf\""),"保存原件",id));return}
   case "ddDownload":{const f=v.data?.tasks.flatMap(t=>t.versions).find(x=>x.id===id);if(f)await ddDownload("download",id,f.name);return}
   case "ddRetry":{const r=v.data?.records.find(x=>String(x.fileId)===id);if(r){const result=await ddApi("collect",{project:v.p.id,notice:r.id,role:r.role,retry:true});await ddLoad(v);announce(result.hasFile?"已保存 PDF 原件":result.pages?"已收齐网页正文，PDF 待补存":"来源暂未提供可下载的 PDF，公告索引已保留")}return}
  }
 }catch(e){announce(e.message)}
}
async function ddSubmit(f){
 const v=ddView;if(!ddActive(v)||f.dataset.busy)return;
 const op=f.dataset.form,id=f.dataset.id,data=Object.fromEntries(new FormData(f));
 for(const k in data)if(typeof data[k]==="string")data[k]=data[k].trim();
 const err=f.querySelector(".error"),btn=f.querySelector('[type="submit"]'),label=btn.textContent;
 f.dataset.busy="1";btn.disabled=true;btn.textContent="正在办理…";err.textContent="";
 try{
  if(op==="ddSaveEvidence"){
   if(!data.name||!data.reason||!data.source||!ddUrlValid(data.url))throw Error("请填写企业、具体依据和出处，并核对原始链接。");
   const old=db.ddEvidence.find(x=>x.project===v.p.id&&x.id===id);
   const x={...data,project:v.p.id,id:old?.id||crypto.randomUUID(),snapshot:v.draftSnapshot};
   if(old)Object.assign(old,x);else db.ddEvidence.unshift(x);
   save("登记尽调证据 · "+x.name);$("#panel").close();render();announce("证据已保存到项目底稿");return;
  }
  if(op==="ddCompany"){
   $("#ddCompanyResult").replaceChildren();v.qcc=null;$("#ddQccLink").innerHTML=ddLink(ddQcc(data.term),"在企查查查看");
   const q=await ddApi("company",data);if(!ddActive(v))return;
   v.qcc={...q,...data,name:q.fields?.find(x=>x[0]==="企业名称")?.[1]||data.term};
   $("#ddCompanyResult").innerHTML=q.fields?(q.fields.length?q.fields.map(x=>kv(...x)).join("")+cmd("ddQEvidence","登记查询快照","btn") : ddEmpty("查询结果为空")):
    (q.rows.length?'<p class="ddHint">本次返回 '+q.rows.length+' 条，最多展示 50 条。</p>'+table(["企业 / 年份","金额（万元）","占比","出处",""],q.rows.map((x,i)=>tr([esc(x.name)+"<small>"+esc(x.year)+"</small>",esc(x.amount||"—"),esc(x.percent||"—"),esc(x.source||"待核对"),cmd("ddQEvidence","留存","textbtn",i)]))):ddEmpty("该企业暂未返回已披露的交易对手。"));return;
  }
  if(op==="ddPeers"){
   $("#ddPeerResult").replaceChildren();const d=await ddApi("peers",data);if(!ddActive(v))return;v.peers=d.rows;v.peerDate=d.asof;
   $("#ddPeerResult").innerHTML=d.rows.length?'<p class="ddHint">名录日期 '+esc(d.asof)+' · 首批 '+d.rows.length+' 家</p><div class="ddPeerScroll">'+table(["候选公司 / 代码","行业",""],d.rows.map((x,i)=>tr(['<b>'+esc(x.name)+'</b><small>'+esc(x.code)+'</small>',esc(x.sector),cmd("ddCandidate","选作对标","textbtn",i)])))+'</div>':ddEmpty("本行业未匹配到该证券简称或代码。");return;
  }
  if(op==="ddReports"){
   const target=$("#ddHits");target.replaceChildren();v.reports=[];
   const d=await ddApi("reports",{...data,year:Number(data.year)});if(!ddActive(v))return;v.reports=d.items;
   target.innerHTML=(d.items.length?'<h3>'+esc(d.items[0].issuer)+' <small>'+esc(data.code)+'</small></h3>':"")+ddResults(d.items)+(d.partial?'<p>已达单次分页上限，本次结果可能不完整。</p>':"");return;
  }
  if(op==="ddCollect"){
   if(!ddRoles.includes(data.role))throw Error("请先核对披露主体，并选定与当前项目的关系。");
   const list=[...v.reports];let n=0,web=0,count=0;
   try{for(const r of list){btn.textContent="正在收集 "+(count+1)+" / "+list.length;const d=await ddApi("collect",{project:v.p.id,notice:r.id,role:data.role});count++;if(d.hasFile)n++;else if(d.pages)web++}}
   finally{await ddLoad(v)}
   err.textContent="已归档 "+count+" 份。PDF 原件 "+n+" 份，网页正文 "+web+" 份，仅有索引 "+(count-n-web)+" 份。";return;
  }
  if(op==="ddCreate"||op==="ddReview"){
   const t=op==="ddCreate"?await ddApi("new",{...data,id,project:v.p.id}):
    await ddApi("review",{...data,id,version:v.data.tasks.find(x=>x.id===id)?.versions[0]?.id});
   if(!ddActive(v))return;await ddLoad(v);if(!ddActive(v)||!f.isConnected)return;ddTask(t);announce(op==="ddCreate"?"已生成独立回传入口":"已保存复核结果");
  }
  if(op==="ddAttachFile"){
   const file=f.elements.file.files[0];if(!file||file.size>25*1024*1024)throw Error("请选择 25 MB 以内的 PDF。");
   const res=await fetch(ddApiBase+"/api/attach",{method:"POST",headers:{"Content-Type":"application/octet-stream","X-Archive-Id":id},body:file});
   if(!res.ok)throw Error((await res.json()).error);await ddLoad(v);if(ddActive(v)&&f.isConnected)$("#panel").close();announce("已补存公告原件");
  }
 }catch(e){err.textContent=e.message}finally{delete f.dataset.busy;btn.disabled=false;btn.textContent=label}
}
document.addEventListener("change",e=>{if(e.target.id==="ddProject")go("intelligence",e.target.value+"/"+ddView.tab)});
window.addEventListener("focus",()=>{if(ddView?.tab==="requests"&&ddActive(ddView))ddLoad(ddView)});
document.addEventListener("input",e=>{if(e.target.name==="term"&&e.target.form?.dataset.form==="ddCompany")$("#ddQccLink").innerHTML=ddLink(ddQcc(e.target.value.trim()),"在企查查查看")});
