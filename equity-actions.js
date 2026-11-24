"use strict";
const benchActions={
 platformNew,platformDetail,leadBatchForm:()=>{leadBatch=null;leadBatchForm()},leadBatchSave:commitLeadBatch,
 leadExample:()=>downloadLocal("项目池导入样表.csv","\ufeff"+[leadHeaders,["澄海智能","科技部门推介","高端装备","产业基金一期","1200"]].map(r=>r.map(csvCell).join(",")).join("\r\n"),"text/csv;charset=utf-8"),
 cockpitView:id=>{cockpitView=id;render()},funnelStage:id=>{pipelineStage=id;go("B")},
 poolTab:id=>{poolTab=id;render()},leadNew,leadOpen,weekReport,
 weekExport:()=>{const rows=weekReport();downloadLocal("项目推进周报-2026W48.csv","\ufeff"+[["企业","经理","日期","进展","下一步"],...rows].map(r=>r.map(v=>csvCell(/^[=+@-]/.test(v)?"'"+v:v)).join(",")).join("\r\n"),"text/csv;charset=utf-8")},
 company:id=>go("directory",encodeURIComponent(id)),scoreEdit,returnNew,returnReview,markTrial,markDetail,
 riskFilter:id=>{riskFilter=id;render()},riskScan:scanPortfolio,
 fundReport:id=>fundReportForm(+id),fundEdition:id=>fundEdition(id),fundWord:id=>exportEdition(id)
};
const stageWeights=p=>["待立项","尽职调查","待补正"].includes(p.stage)?[25,20,20,25,10]:p.stage==="投后管理"?[15,10,20,20,35]:[25,15,20,15,25];
function deskForm(kind,id,v,error,done){
 const l=bench.leads.find(z=>z.id===id);
 switch(kind){
 case "poolFilter":poolSearch=v.text.trim();render();return;
 case "leadNew":{
  const name=v.name.trim(),source=v.source.trim();
  if(!name||!source)return error("请填写企业名称及来源。");
  if(bench.leads.some(z=>z.name===name&&z.fund===+v.fund)||db.projects.some(p=>p.name===name&&p.fund===+v.fund))return error("本基金已有同名企业，请先核对线索或项目。");
  const lead={id:"XS-"+Date.now().toString(36),name,source,sector:v.sector,amount:+v.amount,fund:+v.fund,owner:"",notes:[]};
  bench.leads.unshift(lead);poolTab="全部";poolSearch="";poolOwner="";fundFilter="-1";done("已登记项目线索",()=>leadOpen(lead.id));return;
 }
 case "leadAssign":case "leadNote":case "leadConvert":{
  if(!l||l.project)return error("该线索已转项目或无法办理。");
  if(kind==="leadAssign"){if(!v.reason.trim()||!v.owner)return error("请填写移交依据及负责人。");const old=l.owner;l.owner=v.owner;l.notes.push({owner:l.owner,date:reviewDate,note:(old?old+" 移交":"分配")+"给 "+l.owner+" · "+v.reason,next:"跟踪项目进展"});done("负责人已更新",()=>leadOpen(id));return}
  if(!l.owner)return error("请先分配经办经理。");
  if(kind==="leadNote"){if(!v.note.trim()||!v.next.trim())return error("请填写本次进展与后续事项。");l.notes.push({owner:l.owner,date:reviewDate,note:v.note.trim(),next:v.next.trim()});done("跟进记录已保存",()=>leadOpen(id));return}
  if(!v.reason.trim()||!v.risk.trim()||db.projects.some(p=>p.name===l.name&&p.fund===l.fund))return error("请核对重名项目、投资理由及风险。");
  const p={id:"XM-P"+Date.now().toString(36),name:l.name,industry:l.sector,fund:l.fund,amount:l.amount,owner:l.owner,reason:v.reason,risk:v.risk,stage:"待立项",leadId:id,history:l.notes.map(n=>n.date+" · "+n.owner+" · "+n.note).concat(reviewDate+" · 由 "+id+" 发起立项")};
  l.project=p.id;l.notes.push({date:reviewDate,owner:l.owner,note:"由项目池发起立项 "+p.id,next:"待投资负责人审批"});db.projects.push(p);done("已生成立项申请",()=>go("B",p.id+"/decision"));return;
 }
 case "scoreEdit":{
  const p=getProject(id),indicators=qualityMetrics.map((row,i)=>row.map((label,j)=>Number(v["n"+i+"_"+j]))),values=indicators.map(row=>row.reduce((n,x)=>n+x,0)/row.length),reasons=qualityDimensions.map((_,i)=>v["r"+i].trim()),weights=stageWeights(p);
  if(reasons.some(s=>!s)||indicators.flat().some(n=>!Number.isInteger(n)||n<1||n>5)||!v.owner.trim())return error("请补齐五项有效评分和依据。");
  const all=bench.assessments[id]??=[];all.unshift({values:values.map(x=>Number(x.toFixed(2))),indicators,reasons,weights,stage:p.stage,score:Number(values.reduce((n,a,i)=>n+a/5*weights[i],0).toFixed(2)),owner:v.owner,date:reviewDate,version:all.length+1});
  done("阶段评分已归档");return;
 }
 case "returnNew":{
  const f=subfunds.find(x=>x.id===id);
  if(!f||[v.company,v.proof,v.evidence,v.area].some(z=>!z.trim()))return error("请补齐企业、地区与证明依据。");
  if(bench.fundReviews.some(z=>z.sub===id&&z.proof===v.proof.trim()&&z.state!=="未认定"))return error("此子基金已有同一付款凭据，请勿重复认定。");
  bench.fundReviews.unshift({...v,company:v.company.trim(),id:"RT-"+Date.now().toString(36),sub:id,amount:+v.amount,proof:v.proof.trim(),state:"待复核"});done("已提交返投认定");return;
 }
 case "returnReview":{
  const x=bench.fundReviews.find(z=>z.id===id);if(!x||x.state!=="待复核"||!v.note.trim()||!v.owner.trim())return error("请核对办理状态并填写复核人及依据。");
  Object.assign(x,{state:v.result,owner:v.owner.trim(),note:v.note.trim()});done("认定结论已保存");return;
 }
 case "markTrial":{
  const [key,k]=id.split(":"),m=markModels[+k],inputs=m.inputs.map((_,i)=>+v["a"+i]),equity=m.calc(inputs),share=+v.share,value=equity*share/100;
  if(!Number.isFinite(value)||share<=0||share>100||!v.proof.trim())return error("请检查估值参数及数据来源。");
  (bench.marks[key]??=[]).unshift({model:+k,inputs,equity,share,value,date:v.date,proof:v.proof.trim()});done("估值测算已保存");return;
 }
 case "fundDraft":case "fundApprove":return fundReportAction(kind,id,v,error,done);
 }
}
const deskForms=new Set(["poolFilter","leadNew","leadAssign","leadNote","leadConvert","scoreEdit","returnNew","returnReview","markTrial","fundDraft","fundApprove"]);
const reportParts=["基金概况","投资组合","投后运营","风险与整改","资金及披露依据"];
function fundReportForm(i){
 const editions=bench.reports.filter(r=>r.fund===i);
 drawer(funds[i].name+" · 基金报告",kv("编制口径","运营简报按当前业务台账取数，保存后固定选用内容与来源。")+form("fundDraft",field("name","报告名称","text",funds[i].name+"运营简报","required maxlength=80")+reportParts.map((s,j)=>formSelect("part"+j,s,opt([["yes","包含"],["no","不包含"]],!bench.reportTemplates?.[i]||bench.reportTemplates[i].includes(s)?"yes":"no"))).join(""),"生成预览稿",String(i))+'<h3>已编报告</h3>'+editions.map(r=>cmd("fundEdition",esc(r.name)+"　"+tag(r.state),"searchres",r.id)).join(""));
}
function fundReportAction(kind,id,v,error,done){
 if(kind==="fundApprove"){const r=bench.reports.find(x=>x.id===id);if(!r||r.state!=="待复核"||!v.owner.trim()||!v.note.trim())return error("请填写复核人及意见。");r.state=v.result;r.owner=v.owner;r.note=v.note;done("复核意见已归档",()=>fundEdition(id));return}
 const i=+id,ps=db.projects.filter(p=>p.fund===i),ts=db.tasks.filter(t=>t.fund===i&&t.status==="已确认"),rs=db.risks.filter(z=>ps.some(p=>p.name===z.company)),latest=i===0?cc().versions[0]:null;
 const lists=[
 [funds[i].name+" · 认缴 "+funds[i].cap+" 亿元；累计实缴 "+amt(funds[i].paid*10000+(i===0?db.paid:0))],
 ps.map(p=>p.name+" · "+p.stage+" · "+amt(p.amount)+(p.stage==="投后管理"?" 已投":" 拟投")+" · "+p.id),
 ts.map(t=>t.company+" · "+t.q+" · 已确认 V"+t.v+" · 收入 "+amt(t.rev)+" · "+t.id),
 rs.map(r=>r.company+" · "+r.state+" · "+r.source+" · "+r.id),
 ["当前可用现金 "+amt(settledCash(i)),latest?"历史结账依据：2026 Q3 V"+latest.version+"，期末现金 "+wan(latest.cash):"本基金暂无已锁季度快照，当前资金数据仅供运营走查。"]
 ];
 const sections=reportParts.flatMap((title,j)=>v["part"+j]==="yes"?[{title,lines:lists[j].length?lists[j]:["本基金当前无对应记录。"]}]:[]);
 if(!sections.length||!v.name.trim())return error("请填写标题并至少选择一章。");
 const r={id:"FR-"+Date.now().toString(36),fund:i,name:v.name.trim(),date:reviewDate,sections,state:"待复核"};bench.reportTemplates??={};bench.reportTemplates[i]=sections.map(s=>s.title);bench.reports.unshift(r);done("运营报告草稿已生成",()=>fundEdition(r.id));
}
function fundEdition(id){const r=bench.reports.find(z=>z.id===id);drawer(r.name,tag(r.state)+kv("编制日",r.date)+r.sections.map(s=>'<h3>'+esc(s.title)+'</h3>'+s.lines.map(line=>'<p>'+esc(line)+'</p>').join("")).join("")+(r.state==="待复核"?form("fundApprove",formSelect("result","结论",opt([["已发布","复核发布"],["已退回","退回重编"]],"已发布"))+cause("owner","复核人")+cause("note","复核意见"),"保存复核",id):kv("复核记录",r.owner+" · "+r.note))+(r.state==="已发布"?cmd("fundWord","导出 Word（.docx）","btn primary",id):""))}
function exportEdition(id){
 const r=bench.reports.find(z=>z.id===id);if(r?.state!=="已发布")return;
 const lines=[r.name,r.date+"　"+funds[r.fund].name,...r.sections.flatMap(s=>[s.title,...s.lines]),"复核："+r.owner+"　"+r.note];
 const documentXml='<?xml version="1.0" encoding="UTF-8"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>'+lines.map((line,i)=>'<w:p><w:r><w:rPr><w:rFonts w:eastAsia="微软雅黑"/><w:sz w:val="'+(i===0?36:22)+'"/></w:rPr><w:t xml:space="preserve">'+esc(line)+'</w:t></w:r></w:p>').join("")+'<w:sectPr/></w:body></w:document>';
 const contentTypes='<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>';
 const rels='<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>';
 downloadLocal(r.name+".docx",officeZip({"[Content_Types].xml":contentTypes,"_rels/.rels":rels,"word/document.xml":documentXml}),"application/vnd.openxmlformats-officedocument.wordprocessingml.document");
}
// Store uncompressed OOXML parts so reports also export when opened offline.
function officeZip(files){
 const enc=new TextEncoder(),body=[],directory=[];let position=0;
 const word=n=>[n&255,(n>>>8)&255],long=n=>[...word(n),...word(n>>>16)];
 for(const [name,text] of Object.entries(files)){
  const path=enc.encode(name),data=enc.encode(text);let crc=0xffffffff;
  for(const byte of data){crc^=byte;for(let bit=0;bit<8;bit++)crc=(crc>>>1)^((crc&1)?0xedb88320:0)}
  const shared=[...word(20),0,0,0,0,0,0,33,0,...long((~crc)>>>0),...long(data.length),...long(data.length),...word(path.length),0,0];
  const local=Uint8Array.from([...long(0x04034b50),...shared,...path]);body.push(local,data);
  directory.push(Uint8Array.from([...long(0x02014b50),...word(20),...shared,0,0,0,0,0,0,0,0,0,0,...long(position),...path]));position+=local.length+data.length;
 }
 const count=directory.length,size=directory.reduce((n,p)=>n+p.length,0),end=Uint8Array.from([...long(0x06054b50),0,0,0,0,...word(count),...word(count),...long(size),...long(position),0,0]);
 return new Blob([...body,...directory,end]);
}

