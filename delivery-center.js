"use strict";
let deliveryTab="blueprint",groupFilter="A",trialBatch=null,restoredCopy=null;
db.scopeWalks??=[];
function scopeWalk(id,v,error){
 if(!deliveryScope.items.some(x=>x.id===id)||!v.sample.trim()||!v.outcome.trim()||!v.owner.trim())return error("请填写样本、走查结果与责任人。");
 const rec={id,at:new Date().toLocaleString("zh-CN"),sample:v.sample.trim(),outcome:v.outcome.trim(),owner:v.owner.trim(),result:v.result};
 db.scopeWalks.unshift(rec);save("登记方案走查 "+id,rec.owner);render();scopeItem(id);announce("走查记录已保存");
}
function baselineDownload(){
 const rows=deliveryScope.items.map(x=>{const last=db.scopeWalks.find(r=>r.id===x.id);return [x.id,x.title,x.price,x.role,x.scope,x.output,x.accept,last?.result||"待走查",last?.sample||"",last?.outcome||"",last?.owner||""]});
 const safeCell=v=>csvCell(/^[=+@\-]/.test(String(v))?"'"+v:v);
 const csv=[["编号","功能或服务","含税价（元）","归口","范围","交付物","验收用例","方案走查","样本编号","实测记录","记录人"],...rows].map(r=>r.map(safeCell).join(",")).join("\r\n");
 downloadLocal("业达基金管理系统-108万元交付与验收基线.csv","\ufeff"+csv,"text/csv;charset=utf-8");
}
const deliveryTabs=[["blueprint","建设设计"],["scope","报价与验收"],["migration","数据迁移"],["restore","恢复演练"]];
const milestoneDesign=[
 ["业务与财务口径签认","业务负责人、基金财务","交付岗位矩阵、审批权限、协议参数及样表映射。选一只基金一个已结季度，固化样本编号和预期数。","H01–H03"],
 ["数据试导与对账","实施顾问、数据归口人","按基金比对主数据和资金流水的笔数、期初数及实缴分配合计。异常行逐笔签认后正式导入。","I02、I03、D07"],
 ["跨岗位试运行","投资、风控、财务、信息部","逐项执行主线和例外用例。保存测试角色、版本、凭证、实际结果、阻断问题与复测记录。","I05、A02、E07"],
 ["上线切换与移交","信息部、项目经理","测试与生产分开部署。核对安装清单、配置、回退点、培训记录；在独立环境恢复一笔业务及其附件。","I01、I04、I06、I07"],
 ["验收后连续 12 个月","服务工程师、信息部","运行工单从受理到用户确认，缺陷验证后发布并保留回退记录，每季交付一次巡检报告。","J01–J03"]
];
const systems=[
 ["投资与投后","基金 → 项目 → 投资轮次 → 投决议题 → 交割条件","附条件批准生成逐项核验任务。交割放行引用当时有效的决议及凭证。"],
 ["资金与核算","LP → 缴款通知 → 银行流水 → 核销分录 → 资本账户","服务端事务同时写入核销、余额变动和审计。按账户、外部流水号判断重复，冲销保留原分录。"],
 ["估值与披露","持仓 → 估值基准日 → 季结版本 → LP 报告","批准估值与期间快照有明确引用关系。重开登记原因，历史已发布版本可独立复算。"],
 ["权限与资料","人员 → 岗位 → 基金及项目授权 → 附件版本","服务端逐请求校验对象和操作，敏感文件下载与导出记录操作者及来源审批。"]
];
function deliveryPage(){
 return title("实施与验收","业达集团基金投资管理系统　/　方案讨论稿",deliveryTab==="migration"||deliveryTab==="restore"?closeActors():'<a class="btn" href="建设设计方案.html" target="_blank" rel="noopener">完整设计方案</a>'+cmd("baselineCSV",ico("out")+"导出验收基线","btn"))+
 '<div class="viewtabs">'+deliveryTabs.map(([key,label])=>cmd("dTab",label,key===deliveryTab?"active":"",key)).join("")+'</div>'+
 (deliveryTab==="scope"?scopePage():deliveryTab==="migration"?migrationPage():deliveryTab==="restore"?drillPage():designPage());
}
function designPage(){
 return '<div class="designBanner"><div><small>项目建设范围</small><h2>基金投资管理系统</h2><span>集团本地部署 · 单集团多基金 · 人民币核算</span></div><div><small>含税方案估算</small><strong>108 <small>万元</small></strong></div></div>'+
 card("投资构成",'<div class="budgetBars">'+[["业务软件",84.5],["调研与验收设计",5.5],["本地实施与上线",12],["首年运维",6]].map(([a,b])=>'<div><b>'+a+'</b><span><i style="width:'+b/108*100+'%"></i></span><strong>'+b+' 万元</strong></div>').join("")+'</div>',cmd("dTab","查看 62 个分项","textbtn","scope"))+
 card("核心数据与业务控制",table(["业务域","主要数据关联","生产实现与验收要求"],systems.map(r=>tr(r.map(v=>'<span class="wrapCell">'+esc(v)+'</span>')))))+
 '<div class="dossierGrid">'+card("本地部署设计",block(kv("访问层","集团内网访问；企业填报按信息部批准的外部通道接入。")+kv("应用层","业务 API 集中执行业务状态校验、岗位授权、文件鉴权和日志记录。")+kv("数据层","业务数据库存放分录、版本和授权；附件存储保留文件版本及摘要。")+kv("运行层","一套测试环境及一套生产环境，数据库和附件按同一恢复点备份。")))+
 card("数据交接边界",block(kv("银行与财务","银行流水文件导入、财务汇总文件导出；实际支付经既有渠道办理。")+kv("监管与披露","按确认样表校验后导出，经既有渠道报送。")+kv("上线前签认","业达提供脱敏历史数据、基金协议、报表样表、服务器和环境。")+kv("服务口径","响应时限、试运行周期及次年续费由合同确认。")))+'</div>'+
 card("实施里程碑与签收物",table(["里程碑","归口岗位","交付与验证","报价依据"],milestoneDesign.map(r=>tr(r.map(v=>'<span class="wrapCell">'+esc(v)+'</span>')))));
}
const workLinks={H01:"delivery/blueprint",H02:"close/accounts",H03:"delivery/scope",H04:"delivery/blueprint",I01:"delivery/blueprint",I02:"delivery/migration",I03:"delivery/migration",I04:"delivery/restore",I05:"close/cash",I06:"delivery/blueprint",I07:"delivery/blueprint",J01:"delivery/blueprint",J02:"delivery/blueprint",J03:"delivery/blueprint",D07:"close/cash",D04:"delivery/migration",E07:"close/versions",G06:"G/G06"};
function scopePage(){
 const g=deliveryScope.groups[groupFilter],items=deliveryScope.items.filter(x=>x.id[0]===groupFilter);
 return '<div class="scopeLayout"><div class="panel moduleSelector">'+Object.entries(deliveryScope.groups).map(([key,g])=>cmd("dGroup",'<b>'+key+'</b><span>'+esc(g.name)+'</span>',groupFilter===key?"on":"",key)).join("")+'</div>'+
 card(g.name,block('<p>'+esc(g.goal)+'</p>'+tag(items.length+" 项")+"　<span class='dim'>含税 "+amt(g.amount/10000)+'</span>')+table(["编号","交付项目","岗位","含税分项价"],items.map(x=>tr([esc(x.id),esc(x.title),esc(x.role),money(x.price)+" 元"],"scopeItem",x.id))))+'</div>'+
 card("范围与待确认事项",'<div class="termList">'+deliveryScope.terms.map(t=>'<details><summary>'+esc(t[1])+'</summary><p>'+esc(t[2])+'</p><small>'+esc(t[3])+'</small></details>').join("")+'</div>');
}
function scopeItem(id){
 const x=deliveryScope.items.find(r=>r.id===id);
 const rows=db.scopeWalks.filter(w=>w.id===id);
 drawer(id+" · "+x.title,kv("业务归口",x.role)+kv("含税分项价",money(x.price)+" 元")+kv("交付范围",x.scope)+kv("交付结果",x.output)+'<h3>签收用例</h3><p class="notice">'+esc(x.accept)+'</p><div class="actions">'+cmd("nav","查看对应页面或设计","btn",workLinks[id]||id[0]+"/"+id)+'</div><h3>方案走查记录</h3>'+rows.map(r=>kv(r.result+" · "+r.sample,r.outcome+" · "+r.owner+" · "+r.at)).join("")+form("scopeWalk",field("sample","走查样本或用例编号","text","","required maxlength=80")+formSelect("result","本轮结果",opt([["符合预期","符合预期"],["待整改","待整改"],["待现场验证","待现场验证"]],"待现场验证"))+cause("outcome","观察结果、差异或待补证据")+cause("owner","记录人或问题归口"),"保存方案走查",id));
}
const importHeader=["流水号","日期","对方","业务类型","金额（元）"];
const csvCell=v=>'"'+String(v).replaceAll('"','""')+'"';
function lineCSV(rows){return [importHeader,...rows.map(r=>[r.ref,r.date,r.party,r.type,(r.cents/100).toFixed(2)])].map(r=>r.map(csvCell).join(",")).join("\r\n")}
function parseCSV(text){
 const rows=[];let row=[],cell="",quoted=false;
 for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){cell+='"';i++}else quoted=!quoted}
 else if(c===","&&!quoted){row.push(cell);cell=""}else if(c==="\n"&&!quoted){row.push(cell.replace(/\r$/,""));rows.push(row);row=[];cell=""}else cell+=c}
 if(quoted)throw Error("引号未闭合");if(cell||row.length)rows.push([...row,cell.replace(/\r$/,"")]);return rows;
}
function trialImport(text,name){
 const [head,...all]=parseCSV(text.replace(/^\uFEFF/,""));if(!head||head.join("|")!==importHeader.join("|"))throw Error("文件表头与银行流水样表不一致。");
 const seen=new Map(cc().bank.map(r=>[r.ref,r])),rows=[];
 for(const cols of all.filter(r=>r.some(c=>c.trim()))){
  const [ref,date,party,type,value]=cols.map(s=>s.trim()),cents=Math.round(Number(value)*100);
  const row={ref,date,party,type,cents,source:name},old=seen.get(ref);
  const valid=cols.length===5&&ref&&party&&type&&/^\d{4}-\d{2}-\d{2}$/.test(date)&&date>="2026-07-01"&&date<="2026-09-30"&&new Date(date+"T00:00:00Z").toJSON()?.slice(0,10)===date&&/^-?\d+(\.\d{1,2})?$/.test(value)&&Number.isSafeInteger(cents)&&cents!==0;
  let status=!valid?"格式或期间错误":old?(["date","party","type","cents"].every(k=>old[k]===row[k])?"重复跳过":"同号内容冲突"):"可导入";
  if(valid&&!old)seen.set(ref,row);rows.push({row,status});
 }
 if(!rows.length)throw Error("文件为空");return {rows,name,text};
}
function sampleImport(){
 const existing=cc().bank.find(r=>r.ref==="BK-0712");
 return lineCSV([existing,{ref:"BK-0928-S",date:"2026-09-28",party:"托管银行",type:"利息收入",cents:350000}]);
}
function migrationPage(){
 const t=trialBatch,rows=t?.rows||[],errors=rows.filter(r=>!["可导入","重复跳过"].includes(r.status)).length;
 return card("银行流水试导",block(kv("目标期间",quarterKey)+kv("文件映射",importHeader.join("  /  "))+kv("校验规则","核对期间、必填项、金额精度。已存在的相同流水跳过，同号内容冲突阻止整批入账。")+
 '<div class="actions">'+cmd("csvSample","下载试导样表","btn")+cmd("csvTrial","用样例试导","btn")+'<label class="btn">选择 CSV<input id="bankUpload" class="visuallyHidden" type="file" accept=".csv,text/csv"></label></div><p class="error" id="batchError" role="alert"></p>'))+
 (t?card("试导结果",block(kv("来源文件",t.name)+kv("校验汇总","新增 "+rows.filter(x=>x.status==="可导入").length+" 笔 · 重复 "+rows.filter(x=>x.status==="重复跳过").length+" 笔 · 异常 "+errors+" 笔"))+table(["流水号","日期","对方","金额（元）","校验"],rows.map(({row:r,status})=>tr([esc(r.ref),esc(r.date),esc(r.party),Number.isFinite(r.cents)?money(r.cents/100):"—",tag(status)])))+block(closeRole==="admin"&&!cc().locked&&!errors&&rows.some(x=>x.status==="可导入")?cmd("csvCommit","确认导入本期银行流水","btn primary"):'<p class="dim">'+(cc().locked?"本期已锁定。":closeRole!=="admin"?"正式导入由实施管理员办理。":"请处理异常或选择含新增记录的文件。")+'</p>')):"")+
 card("批次交接记录",table(["批次","来源文件","新增笔数","净变动（元）","执行人"],cc().imports.map(b=>tr([esc(b.id),esc(b.name),b.count,money(b.cents/100),esc(b.actor)]))),cmd("nav","进入本期对账","textbtn","close/cash"));
}
function commitImport(){
 if(closeRole!=="admin"||cc().locked||!trialBatch)return;
 const checked=trialImport(trialBatch.text,trialBatch.name),fresh=checked.rows.filter(x=>x.status==="可导入");
 if(!fresh.length||checked.rows.some(x=>!["可导入","重复跳过"].includes(x.status))){trialBatch=checked;render();return}
 const id="IMP-"+String(cc().imports.length+1).padStart(3,"0");
 cc().bank.push(...fresh.map(x=>({...x.row,batch:id})));
 cc().imports.unshift({id,name:checked.name,count:fresh.length,cents:fresh.reduce((s,r)=>s+r.row.cents,0),actor:closeRoles[closeRole],csv:checked.text});
 trialBatch=null;qCommit("历史流水正式导入",id,checked.name);
}
async function digest(text){const bytes=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(text));return Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,"0")).join("")}
function sampleVoucher(ref){const b=cc().bank.find(x=>x.ref===ref);if(!b)return;
 const batch=cc().imports.find(x=>x.id===b.batch);
 downloadLocal(batch?.name||"Q3托管户对账单.csv","\ufeff"+(batch?.csv||lineCSV(cc().bank.filter(r=>!r.batch))),"text/csv;charset=utf-8");
}
async function packQuarter(){
 const c=cc(),data={period:"2026-Q3",fund:funds[0].name,opening:c.opening,statement:c.statement,book:c.book,bank:c.bank,versions:c.versions,proposals:c.proposals,log:c.log,valuation:db.valuation,files:[{name:"Q3托管户对账单.csv",text:lineCSV(c.bank.filter(b=>!b.batch))},...c.imports.map(i=>({name:i.name,text:i.csv}))]};
 const payload=JSON.stringify(data);return {format:"yeda-quarter-1",digest:await digest(payload),payload};
}
async function verifyArchive(pack){
 if(pack?.format!=="yeda-quarter-1"||typeof pack.payload!=="string"||await digest(pack.payload)!==pack.digest)throw Error("备份格式或 SHA-256 校验失败。");
 const d=JSON.parse(pack.payload);
 if(d.period!=="2026-Q3"||d.fund!==funds[0].name||!Number.isSafeInteger(d.opening)||!Array.isArray(d.bank)||!Array.isArray(d.book)||!Array.isArray(d.files)||!d.files.length)throw Error("缺少季度业务数据或附件。");
 for(const rows of [d.book,d.bank])if(rows.some(r=>!r?.ref||!Number.isSafeInteger(r.cents))||new Set(rows.map(r=>r.ref)).size!==rows.length)throw Error("凭证主键或金额无效。");
 if(d.files.some(f=>typeof f.name!=="string"||typeof f.text!=="string"))throw Error("附件内容不完整。");
 const original=parseCSV(d.files[0].text).slice(1);const proof=original.find(r=>r[0]==="BK-0712"),entry=d.book.find(r=>r.ref==="BK-0712");
 if(!proof||!entry||entry.date!==proof[1]||entry.party!==proof[2]||entry.cents!==Math.round(Number(proof[4])*100))throw Error("未找到抽检凭证 BK-0712 及其银行附件。");
 return d;
}
function drillPage(){
 return card("季度底稿备份与恢复演练",block(kv("备份范围","本季银行流水、业务凭证、调整记录、已归档版本、估值及 CSV 来源附件。")+kv("恢复目标","独立浏览器内存副本，使用 SHA-256 核对备份内容。")+kv("抽检单据","甲出资人到账流水 BK-0712 与银行文件对应行。")+ '<div class="actions">'+(closeRole==="admin"?cmd("qBackup","下载季度备份","btn")+cmd("qDrill","用当前数据演练","btn primary")+'<label class="btn">载入备份演练<input class="visuallyHidden" id="archiveUpload" type="file" accept=".json"></label>':"")+'</div><p class="error" id="drillError" role="alert"></p>'))+
 (restoredCopy?card("恢复副本抽检",block(kv("恢复期间",restoredCopy.period)+kv("恢复的业务凭证",restoredCopy.book.length+" 笔")+kv("恢复的来源文件",restoredCopy.files.length+" 份")+kv("抽检凭证 BK-0712",wan(restoredCopy.book.find(x=>x.ref==="BK-0712").cents))+cmd("qRecoveredFile","下载恢复出的银行附件","btn"))):"")+
 card("演练记录",table(["演练时间","结果","数据与文件","备份摘要"],cc().drills.map(d=>tr([esc(d.at),tag("抽检通过"),esc(d.summary),esc(d.hash.slice(0,16))+"…"]))));
}
async function runDrill(pack){
 if(closeRole!=="admin")return;
 const copy=await verifyArchive(pack);restoredCopy=copy;
 const summary=copy.book.length+" 笔凭证 · "+copy.files.length+" 份附件";cc().drills.unshift({at:new Date().toLocaleString("zh-CN"),hash:pack.digest,summary});qAudit("恢复演练通过","I04",summary);render();
}

