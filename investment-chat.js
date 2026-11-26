"use strict";

const chatPrompts=["最近有哪些报告可以查看？","各基金的认缴和实缴是多少？","哪些投后风险需要跟进？"];
let chatBook, chatPending="", chatDraft="", chatProject="";
const chatPage=()=>page==="易投AI"||page==="智能问数";
function chatStorage(){return team?sessionStorage:localStorage}
function conversations(){
 if(chatBook)return chatBook;
 const saved=chatStorage().getItem("equity.agent."+actor());
 if(saved){try{chatBook=JSON.parse(saved);if(Array.isArray(chatBook?.threads))return chatBook}catch{}}
 const legacy=team?JSON.parse(sessionStorage.getItem("team.dialogs."+actor())||"{}"):db.settings.localDialogs||{};
 chatBook={current:"",threads:Object.entries(legacy).filter(([,turns])=>Array.isArray(turns)&&turns.length).map(([name,turns])=>({id:uid(),title:name,project:"",turns:turns.map(t=>({q:t.question,a:t.answer,refs:[],context:{}}))}))};
 return chatBook;
}
function saveChat(){
 try{chatStorage().setItem("equity.agent."+actor(),JSON.stringify(conversations()))}
 catch{notice("当前浏览器存储空间不足，对话仅在本次页面中保留")}
}
function activeChat(){const b=conversations();return b.threads.find(t=>t.id===b.current)}
function chatRecords(){
 const items=[];
 function add(type,id,title,body,extra={}){
  items.push({key:type+"/"+id,type,title,body:String(body||""),...extra});
 }
 for(const project of db.直投项目管理){
  const owner=project.id,name=project.企业简称||project.企业全称||project.项目名称,notes=db.notes[owner]||{};
  add("项目",owner,project.项目名称,[project.企业全称,project.项目状态,project.主营业务,project.项目经理&&"项目经理 "+project.项目经理].filter(Boolean).join(" · "),{owner});
  for(const row of notes.定期报告||[])add("定期报告",owner+"/"+row.id,name+" · "+(row.报告标题||"定期报告"),[row.报告分类,row.报告季度,row.备注].filter(Boolean).join("\n"),{owner,year:String(row.报告年度||"").slice(0,4),date:row.上传日期,files:row.files});
  for(const row of notes.文档资料||[])if(/尽调|报告|年报|季报/.test(row.文件名称||""))add("归档报告",owner+"/"+row.id,row.文件名称,"归档原件，可下载查阅。",{owner,date:row.上传时间,files:[{id:row.id,name:row.文件名称}]});
 }
 for(const c of analysisCompanies()){
  if(c.sample)continue;
  for(const row of c.records){
   const fields=financialMetrics.filter(k=>row[k]!=null&&row[k]!=="");
   const label=k=>k.endsWith("率")?"%":k.endsWith("人数")?"人":"万元";
   add("财务报告",row.owner+"/"+row.id,c.name+" · "+analysisPeriod(row)+"财报",fields.map(k=>k+" "+row[k]+" "+label(k)).join("\n")||"该期尚未填写财务指标。",{owner:row.owner,company:c.name,year:String(row.年度||""),date:row.填写时间,currency:row.币种,files:row.files,code:c.code});
  }
 }
 for(const r of db.行业报告)add("行业报告",r.id,String(r.text||"行业报告").split("\n")[0]+" · "+r.date,r.text,{date:r.date});
 for(const r of db.投资建议书)add("投资建议书",r.id,r.name,r.text,{owner:r.project,date:r.date});
 for(const r of db.settings.disclosures||[])add("公开披露",r.id,r.title,"已收录公告索引，可查阅披露原文。",{company:r.issuer,code:r.code,year:String(r.period||"").slice(0,4),date:r.day,url:r.link});
 for(const r of risks())add("风险事项",r.projectId+"/"+r.id,r.企业名称+" · "+first(r.风险级别)+"风险",r.风险内容,{owner:r.projectId,date:r.发生时间});
 for(const fund of allFunds()){
  for(const r of db.notes[fund.id]?.["认缴/实缴信息"]||[]){
   const name=r.投资人名称||r.投资人||"未注明投资人";
   add("出资人",fund.id+"/"+r.id,name+" · "+fund.基金名称,"认缴 "+first(r["认缴金额（万元）"])+" 万元，实缴 "+first(r["实缴金额（万元）"])+" 万元。",{name,fund:fund.基金名称,record:r});
  }
 }
 for(const [type,funds] of [["自管基金",db.自管基金],["参股基金",db.参股基金]])for(const r of funds)add(type,r.id,r.基金名称,"认缴规模 "+first(r.基金认缴规模)+" 万元，实缴规模 "+first(r.基金实缴规模)+" 万元。",{name:r.基金简称,record:r});
 return items;
}
const reportKinds=["行业报告","财务报告","公开披露","定期报告","投资建议书","归档报告"];
function reportKind(q){
 if(/建议书/.test(q))return ["投资建议书"];
 if(/行业|研报/.test(q))return ["行业报告"];
 if(/披露|公告/.test(q))return ["公开披露"];
 if(/尽调/.test(q))return ["归档报告","定期报告","投资建议书"];
 if(/定期报告/.test(q))return ["定期报告","财务报告","公开披露"];
 if(/财报|财务报告|年报|季报/.test(q))return ["财务报告","公开披露","归档报告"];
 return reportKinds;
}
function chatLookup(q,thread){
 const records=chatRecords(),last=thread.turns.at(-1),prev=last?.context||{};
 const scope=db.直投项目管理.find(p=>p.id===thread.project);
 const eligible=r=>!thread.project||r.owner===thread.project||(r.type==="公开披露"&&scope&&((scope.股票代码&&String(scope.股票代码)===r.code)||scope.企业全称===r.company));
 const base=records.filter(eligible);
 const ordinal=q.match(/第([一二三四五六七八九十]|\d+)(?:份|条|个|家|支)/);
 const which=ordinal?(Number(ordinal[1])||"一二三四五六七八九十".indexOf(ordinal[1])+1)-1:0;
 const detail=ordinal||/这份|这条|总结|摘要|展开|详细|原文|底稿/.test(q);
 const previous=(last?.refs||[]).map(key=>base.find(r=>r.key===key)).filter(Boolean);
 if(detail&&previous.length){
  const r=previous[which];
  if(!r)return {text:"上一次结果没有这一项，请选择已列出的来源。",items:previous,context:prev};
  return {text:r.title+"\n"+(r.currency?"报表币种："+r.currency+"\n":"")+r.body.slice(0,2000),items:[r],context:{...prev,owner:r.owner||prev.owner}};
 }
 const financial=/营收|营业收入|净利润|毛利|净利率|总资产|负债|现金流|货币资金|利润率/.test(q);
 let intent=financial?"财务":/风险|预警|巡检/.test(q)?"风险":/报告|财报|尽调|公告|披露|年报|季报|建议书/.test(q)?"报告":/LP|出资人|投资人/i.test(q)?"出资人":/基金|认缴|实缴/.test(q)?"基金":/直投|项目|企业/.test(q)?"项目":"";
 const follow=/那|呢|上一年|去年|今年|本年|只看|上年|同期|20\d{2}|继续|这家|它/.test(q);
 if(!intent&&follow)intent=prev.intent||"";
 if(!intent)return {text:"你想查哪家企业、哪份报告，或哪个业务指标？可以问“有哪些财报”或“各基金实缴了多少”。",items:[],context:prev};
 const named=db.直投项目管理.filter(p=>[p.企业简称,p.企业全称,p.项目名称].some(n=>n&&q.includes(n))).sort((a,b)=>String(b.企业简称).length-String(a.企业简称).length)[0];
 const owner=thread.project||named?.id||((follow||financial)&&prev.intent!=="基金"?prev.owner:"")||"";
 const namedCompany=base.find(r=>r.company&&q.includes(r.company));
 const company=namedCompany?.company||(!named&&(follow||financial)?prev.company:"")||"";
 let year=q.match(/(?:19|20)\d{2}/)?.[0]||"";
 if(!year&&/今年|本年/.test(q))year=String(new Date().getFullYear());
 if(!year&&/去年/.test(q))year=String(new Date().getFullYear()-1);
 if(!year&&/上一年|上年|同期/.test(q)&&prev.year)year=String(Number(prev.year)-1);
 if(!year&&(follow||financial))year=prev.year||"";
 const context={intent,owner,company,year};
 let items=base.filter(r=>(!owner||r.owner===owner||(r.type==="公开披露"&&eligible(r)&&db.直投项目管理.some(p=>p.id===owner&&(p.企业全称===r.company||(p.股票代码&&String(p.股票代码)===r.code)))) )&&(!company||r.company===company||owner&&r.owner===owner));
 let label="",text="";
 if(intent==="出资人"){
  items=base.filter(r=>r.type==="出资人");
  const matches=items.filter(r=>q.includes(r.name)||q.includes(r.fund));
  if(matches.length)items=matches;
  label="出资人认缴与实缴记录";
  if(items.length)text="共 "+items.length+" 条出资记录。\n"+items.slice(0,8).map(r=>r.title+"："+r.body).join("\n");
 }else if(intent==="基金"){
  items=base.filter(r=>["自管基金","参股基金"].includes(r.type));
  if(/自管|参股/.test(q))items=items.filter(r=>q.includes(r.type));
  const namedFunds=items.filter(r=>[r.name,r.title].some(n=>n&&q.includes(n)));
  if(namedFunds.length)items=namedFunds;
  else if(follow&&prev.funds?.length)items=items.filter(r=>prev.funds.includes(r.key));
  context.funds=items.map(r=>r.key);label="基金";
  if(items.length){
   const amount=k=>{const values=items.map(r=>r.record[k]);return values.every(v=>v!=null&&String(v).trim()!==""&&Number.isFinite(Number(v)))?analysisFmt.format(values.reduce((s,v)=>s+Number(v),0))+" 万元":"部分底稿缺数"};
   text="共 "+items.length+" 支基金。认缴规模 "+amount("基金认缴规模")+"，实缴规模 "+amount("基金实缴规模")+"。\n"+items.slice(0,8).map(r=>r.title+"："+r.body).join("\n");
  }
 }else{
  const explicit=/报告|财报|尽调|披露|年报|季报|公告|建议书/.test(q);
  const kinds=intent==="报告"?(explicit?reportKind(q):prev.kinds||reportKinds):intent==="财务"?["财务报告"]:intent==="风险"?["风险事项"]:["项目"];
  context.kinds=kinds;
  items=items.filter(r=>kinds.includes(r.type)&&(!year||String(r.year||r.date||"").startsWith(year)));
  const quoted=q.match(/[《“"]([^》”"]+)[》”"]/);
  if(quoted)items=items.filter(r=>(r.title+" "+r.body).includes(quoted[1]));
  else if(intent==="报告"&&explicit){
   const ignored=[named?.项目名称,named?.企业简称,named?.企业全称,namedCompany?.company].filter(Boolean).sort((a,b)=>b.length-a.length);
   let term=q;for(const n of ignored)term=term.replaceAll(n,"");
   term=term.replace(/(?:19|20)\d{2}年?|有哪些|有没有|能不能|可以|请问|一下|帮我|给我|我想|查找|查一下|查一查|查看|查询|搜索|查|找|看|请|统计|列出|有哪些|公司的|公司|企业|本项目|本基金|投资报告|最近|最新|所有|全部|资料|目前|当前|我们|已收录|已归档|归档|已收到|收到|今年|去年|本年|只|的|相关|哪些|行业报告|投资建议书|尽调报告|财务报告|定期报告|报告|财报|研报|公告|披露|一下|呢|吗|啦|了|有什么|有|年报|季报|年|[\s，。？?！!、：:]/g,"").trim();
   context.term=term;
   if(term.length>1)items=items.filter(r=>(r.title+" "+r.body+" "+(r.company||"")).includes(term));
   if(/尽调/.test(q))items=items.filter(r=>/尽调|尽职调查/.test(r.title+" "+r.body));
   if(/年报|季报/.test(q))items=items.filter(r=>(/年报/.test(q)?/全年|年度报告|年报/:/季度|季报/).test(r.title));
  }
  if(intent==="报告"&&!explicit&&follow&&prev.term){context.term=prev.term;items=items.filter(r=>(r.title+" "+r.body+" "+(r.company||"")).includes(prev.term))}
  items.sort((a,b)=>String(b.year||b.date||"").slice(0,4).localeCompare(String(a.year||a.date||"").slice(0,4))||String(b.date||"").localeCompare(String(a.date||"")));
  label={报告:"报告资料",财务:"财务底稿",风险:"风险事项",项目:"项目档案"}[intent];
  if(items.length){
   const limit=8;
   text=(year?year+" 年":"当前范围")+"共 "+items.length+" 条"+label+"。"+(items.length>limit?"以下列出前 "+limit+" 条。":"");
   const keys=financialMetrics.filter(k=>q.includes(k)||k==="本年累计营业收入"&&/营收|营业收入/.test(q)||k==="本年累计净利润"&&/净利润/.test(q)||k==="经营性现金流净额"&&/现金流/.test(q));
   text+="\n"+items.slice(0,limit).map((r,i)=>{
    const values=intent==="财务"?r.body.split("\n").filter(line=>!keys.length||keys.some(k=>line.startsWith(k+" "))):[];
    return (i+1)+". "+r.title+(intent==="财务"?"（"+(r.currency||"币种未注明")+"）\n"+(values.slice(0,6).join("；")||"该指标未录入"):intent==="风险"||intent==="项目"?" · "+r.body:"");
   }).join("\n");
   if(items.length===1){context.owner=items[0].owner||owner;context.company=items[0].company||company;if(!context.year&&items[0].year)context.year=items[0].year}
  }
 }
 return {text:text||"当前范围"+(year?" "+year+" 年":"")+"没有匹配的"+label+"。可以调整年份、项目范围或报告关键词再查。",items:items.slice(0,8),context};
}
function chatSource(key){
 const r=chatRecords().find(i=>i.key===key);
 if(!r){notice("该来源已移除，请重新查询");return}
 const files=(r.files||[]).map(f=>btn(f.name,"download",f.id,"link")).join("");
 modal(r.title,'<small>'+esc([r.type,r.currency,r.date].filter(Boolean).join(" · "))+'</small><pre>'+esc(r.body)+'</pre>'+files+(r.url?safeLink(r.url,"查阅披露机构原文"):""));
}
function investmentChat(){
 const b=conversations(),t=activeChat(),scope=t?t.project:chatProject,turns=t?.turns||[];
 const choices='<option value="">全部业务</option>'+db.直投项目管理.map(p=>'<option value="'+esc(p.id)+'" '+(p.id===scope?"selected":"")+'>'+esc(p.项目名称)+'</option>').join("");
 const recent=b.threads.map(item=>btn(item.title,"chatOpen",item.id,item===t?"selected":"")).join("");
 const stream=turns.map(m=>'<article class="agentTurn"><div class="chatQuestion">'+esc(m.q)+'</div><div class="agentSignature">投资研究智能体</div><pre>'+esc(m.a)+'</pre><div class="sourceChips">'+(m.sources||[]).map(r=>btn(r.title,"chatSource",r.key)).join("")+'</div></article>').join("");
 return '<section class="investChat"><div class="chatHistory"><h2>对话工作区</h2>'+btn("＋ 新建对话","chatNew","","primary")+'<label>项目范围<select id="chatScope">'+choices+'</select></label><h3>历史对话</h3><div class="chatHistoryList">'+(recent||'<small>发送首条消息后在此保存</small>')+'</div></div><div class="chatMain"><div class="chatHeader"><strong>投资研究智能体</strong><small>'+(team?.services.model?"业务检索 · 模型辅助":"工作区业务检索")+'</small></div><div class="chatStream" role="log">'+(stream||'<div class="chatWelcome"><span class="chatMark" aria-hidden="true">研</span><h1>今天想研究什么？</h1><p>查报告、问业务数据，或从一份底稿继续追问。</p><div class="chatExamples">'+chatPrompts.map(p=>btn(p,"chatPrompt",p)).join("")+'</div></div>')+(chatPending&&t?.id===chatPending?'<p role="status">正在核对工作区资料…</p>':"")+'</div><form id="chatComposer"><textarea maxlength="2000" aria-label="向投资研究智能体提问" placeholder="输入问题，例如：帮我查一下去年的财报" rows="2">'+esc(chatDraft)+'</textarea><div><small>Enter 发送 · Shift + Enter 换行</small><button class="primary" '+(chatPending?"disabled":"")+'>发送 ↑</button></div></form></div></section>';
}
function refreshChat(focus=false){
 if(!chatPage())return;
 render();const stream=document.querySelector(".chatStream");stream.scrollTop=stream.scrollHeight;
 if(focus)document.querySelector("#chatComposer textarea")?.focus({preventScroll:true});
}
async function askInvestment(q){
 q=q.trim();if(!q||chatPending)return;
 const b=conversations();let t=activeChat();
 if(!t){t={id:uid(),project:chatProject,title:q.slice(0,30),turns:[]};b.current=t.id;b.threads.unshift(t)}
 const result=chatLookup(q,t),previous=t.turns.slice(-4).map(m=>m.q+"\n"+m.a).join("\n");
 const turn={q,a:"",refs:result.items.map(r=>r.key),sources:result.items.map(r=>({key:r.key,title:r.type+" · "+r.title})),context:result.context};
 t.turns.push(turn);chatDraft="";chatPending=t.id;refreshChat();
 try{
  turn.a=result.text;
  if(team?.services.model){
   const evidence=result.items.map(r=>r.title+"\n"+r.body.slice(0,2200)).join("\n");
   try{turn.a=(await teamRequest("model",{question:q,context:("前序对话\n"+previous+"\n本轮业务查询\n"+result.text+"\n本轮底稿\n"+evidence).slice(0,49000)})).answer||result.text}
   catch{turn.a=result.text+"\n\n模型服务暂未返回，以上为本次业务查询结果。"}
  }
 }finally{chatPending="";saveChat();refreshChat(true)}
}
document.addEventListener("input",e=>{if(e.target.closest("#chatComposer"))chatDraft=e.target.value});
document.addEventListener("keydown",e=>{if(e.target.closest("#chatComposer textarea")&&e.key==="Enter"&&!e.shiftKey&&!e.isComposing&&e.keyCode!==229){e.preventDefault();e.target.form.requestSubmit()}});
document.addEventListener("submit",e=>{if(e.target.id==="chatComposer"){e.preventDefault();askInvestment(e.target.querySelector("textarea").value).catch(showFailure)}});
document.addEventListener("change",e=>{if(e.target.id==="chatScope"){chatProject=e.target.value;conversations().current="";chatDraft="";saveChat();refreshChat(true)}});
document.addEventListener("click",e=>{
 const el=e.target.closest("[data-a]");if(!el)return;
 switch(el.dataset.a){
 case "chatSource":chatSource(el.dataset.v);break;
 case "chatPrompt":askInvestment(el.dataset.v).catch(showFailure);break;
 case "chatNew":conversations().current="";chatDraft="";saveChat();refreshChat(true);break;
 case "chatOpen":conversations().current=el.dataset.v;chatProject=activeChat()?.project||"";chatDraft="";saveChat();refreshChat(true);break;
 }
});
