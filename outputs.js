"use strict";
let outputReport="项目台账报表",selectedTemplate="";
function proposalText(p){
 const n=db.notes[p.id]||{},financial=[...(n.财务情况||[])].sort((a,b)=>String(b.年度).localeCompare(String(a.年度))||String(b.填写时间).localeCompare(String(a.填写时间)));
 const list=(rows,fmt)=>rows.length?rows.map(fmt).join("\n"):"暂无记录";
 return [p.项目名称+" · 投资建议书","编制日期　"+day(),"","一、项目与主体",p.企业全称+"　"+first(p.主营业务),"项目经理　"+first(p.项目经理)+"　项目阶段　"+first(p.项目状态),"","二、交易方案","出资主体　"+first(p.出资主体)+"　拟投资金额（万元）　"+first(p.拟投资金额),"投资轮次　"+first(p.投资轮次)+"　投资方式　"+first(p.投资方式),"","三、财务依据",list(financial.slice(0,6),f=>[f.报表期间,f.币种,"营收 "+first(f.本年累计营业收入)+" 万元","净利润 "+first(f.本年累计净利润)+" 万元"].join("　")),"","四、风险与待决事项",list(n.重大风险事项||[],r=>first(r.发生日期)+"　"+first(r.风险级别)+"　"+first(r.风险内容)),"","五、投资意见","待投资负责人填写拟议条件与决策建议。","","依据：项目基本信息、已录入财报与重大风险事项。"].join("\n");
}
function proposalView(){
 return panel(title("投资建议书")+'<form id="newProposal" class="queryline"><label>选择项目<select name="project" required><option value="">请选择</option>'+db.直投项目管理.map(p=>'<option value="'+esc(p.id)+'">'+esc(p.项目名称)+'</option>').join("")+'</select></label><button class="primary" '+(writable()?"":"disabled")+'>生成草稿</button></form>'+
 table(["名称","编制人","更新日期","版本","操作"],db.投资建议书.map(r=>[esc(r.name),esc(r.author),esc(r.date),String(r.version),btn("查看","proposalShow",r.id,"link")+btn("下载","proposalDownload",r.id,"link")])));
}
function templateView(){
 const templates=db.settings.reportTemplates||[],model=templates.find(t=>t.id===selectedTemplate);
 const schema=ledgerColumns(ledgerSchema(outputReport)),active=model?.report===outputReport?model:null;
 return panel(title("报表配置")+'<div class="queryline">'+btn("新模板","newTemplate")+templates.map(t=>btn(t.name,"selectTemplate",t.id,t.id===selectedTemplate?"active":"")).join("")+'</div><form id="reportDesigner"><div class="fields">'+input("模板名称",active?.name||"",null,true)+input("数据来源",outputReport,Object.keys(ledgerLayout),true)+'</div><h3>输出列</h3><div class="templateCols">'+schema.map((c,i)=>'<label><input type="checkbox" name="column" value="'+i+'" '+((active?active.keys.includes(c.key):i<6)?"checked":"")+'>'+esc(c.key)+'</label>').join("")+'</div><div class="queryline"><button class="primary" '+(writable()?"":"disabled")+'>保存模板</button>'+btn("预览","previewTemplate")+btn("导出 CSV","exportTemplate")+'</div></form>');
}
function templateColumns(form){
 const keys=new FormData(form).getAll("column").map(Number),schema=ledgerColumns(ledgerSchema(outputReport));
 const columns=keys.map(i=>schema[i]).filter(Boolean);
 if(!columns.length)throw Error("请至少选择一列");return columns;
}
function csvFile(name,headers,rows){
 const quote=v=>{let s=String(v??"");if(/^[=+@-]/.test(s)&&!Number.isFinite(Number(s)))s="'"+s;return '"'+s.replaceAll('"','""')+'"'};
 download(new Blob(["\ufeff"+[headers,...rows].map(row=>row.map(quote).join(",")).join("\r\n")],{type:"text/csv;charset=utf-8"}),name+".csv");
}
const receiptFields={"缴款通知":["收款","本期应缴金额（万元）"],"基金管理费":["付款","本期应付管理费（万元）"],"基金分配":["付款","本期分配总金额（万元）"],"注资缴款":["付款","付款金额（万元）"]};
function paymentOrders(){
 const receipts=db.settings.receipts||[];
 return allFunds().flatMap(f=>Object.entries(receiptFields).flatMap(([section,[direction,field]])=>(db.notes[f.id]?.[section]||[]).filter(n=>n.状态==="审批通过").map(n=>({entry:n.id,owner:f.id,name:f.基金名称,section,direction,amount:n[field],receipt:receipts.find(x=>x.entry===n.id)}))));
}
function paymentSettlement(){
 const orders=paymentOrders();
 return panel(title("业务收付款核对")+table(["基金","业务单据","方向","审批金额（万元）","回单状态","操作"],orders.map(o=>[esc(o.name),o.section,o.direction,esc(o.amount),o.receipt?"已核对":"待财务确认",o.receipt?btn("收付款证明","receiptPrint",o.entry,"link"):(!team||["管理员","财务"].includes(team.user.role))?btn("登记回单","receiptForm",o.entry,"link"):"—"])));
}
function printNote(row,cols){
 const trace=(db.notes.daily||[]).filter(t=>t.objectId===rid&&t.entryId===row.id);
 return '<div class="printDoc"><small>业达投资 · 业务单据</small><h3>'+esc(sub)+'</h3><p>'+esc(record()?.基金名称||record()?.项目名称||"")+'</p>'+kv(row,cols)+(trace.length?table(["提交人","提交时间","审批人","审批结果","处理时间"],trace.map(t=>[t.person,t.date,t.reviewer,t.stage,t.reviewedAt].map(v=>esc(first(v))))):"")+'</div>';
}
function paymentsView(){
 const directions=["收款","付款"];const pack=[];
 for(const p of db.直投项目管理){
  const n=db.notes[p.id]||{};
  for(const r of n.资金流水||[])pack.push([p.项目名称,r.费用发生时间,r.资金流向,r["费用金额（万元）"],"项目资金流水"]);
  for(const r of n.项目回收款||[])pack.push([p.项目名称,r.时间,"收款",r["金额(万元)"],"项目回收款"]);
 }
 for(const f of allFunds())for(const r of db.notes[f.id]?.现金流||[])pack.push([f.基金名称,r.发生时间,r.类型,r["发生金额（万元）"],"基金现金流"]);
 const rows=pack.filter(r=>(!filter||r[2]===filter)&&r.some(v=>String(v??"").includes(query))).sort((a,b)=>String(b[1]).localeCompare(String(a[1])));
 return paymentSettlement()+panel(title("支付现金流")+'<form id="paymentFilter" class="queryline">'+input("关键字",query)+input("资金去向",filter,directions)+'<button>查询</button></form>'+table(["项目 / 基金","发生日期","资金去向","金额（万元）","业务来源"],rows.map(r=>r.map(esc))));
}
function finalLedgerRow(r,report,source,notes){
 if(report==="项目台账报表"){
  const vals=[...(notes.项目估值||[])].sort((a,b)=>String(b.估值基准日).localeCompare(String(a.估值基准日))),v=vals[0]||{};
  const returns=notes.项目回收款||[],exits=returns.filter(x=>/退出|股权转让|回购|清算|减持/.test(x.回收款类型));
  const amount=total(returns,"金额(万元)"),exit=total(exits,"金额(万元)");
  const cost=source.初始投资金额,remaining=v["未退出部分公允价值（万元）"];
  Object.assign(r,{"退出金额(B)":exit,"分红、补偿等其他回收金额(D)(万元)":amount-exit,"回收总金额E=B+D":amount,"在投成本对应估值(C)":remaining,"剩余/稀释后持股比例":v["最新持股比例（%）"],"DPI[E/A]":Number(cost)>0?(amount/cost).toFixed(4):undefined});
  if(remaining!=null&&remaining!==""&&Number(cost)>0){r["项目盈亏情况C+E-A"]=Number(remaining)+amount-cost;r["MOIC[F=(C+E)/A]"]=((Number(remaining)+amount)/cost).toFixed(4)}
 }else{
  const invested=notes.已投项目信息||[],children=notes.已投子基金信息||[],perf=[...(notes.基金业绩||[])].sort((a,b)=>String(b.基金季度).localeCompare(String(a.基金季度)))[0]||{};
  r.剩余额度=source.基金认缴规模!=null&&source.基金实缴规模!=null?source.基金认缴规模-source.基金实缴规模:undefined;
  const childAmount=total(children,"我方实缴规模（万元）");r.投资子基金金额=childAmount;
  r["累计投资情况（含参投子基金及直投项目） / 投资金额（万元）"]=childAmount+total(invested,"累计已投金额（万元）");
  for(const [status,prefix] of [["全部退出","完全退出"],["部分退出","部分退出"]]){
   const ps=invested.filter(x=>x.项目状态===status),fs=children.filter(x=>x.状态===status);
   r[prefix+"项目数量（个）"]=ps.length;r[prefix+"项目金额（万元）"]=total(ps,"累计已退出金额（万元）");r[prefix+"子基金数量"]=fs.length;
  }

  r.基金累计收回金额=perf["累计回款金额（万元）"];
  r["基金总内部净收益率（Net IRR）"]=perf["Net-IRR（%）"];
  if(perf["DPI（%）"]!=null&&perf["DPI（%）"]!==""){r.基金DPI=Number(perf["DPI（%）"])/100;r["收益情况 / DPI"]=r.基金DPI}
 }
 return r;
}
function rowSupplement(report,r){return db.notes[r.sourceId]?.台账补录?.find(x=>x.report===report&&x.row===r.id)}
function supplementView(r){
 const cols=ledgerColumns(ledgerSchema(page)),saved=rowSupplement(page,r);
 const available=cols.filter(c=>rawLedgerValue(r,c)==null||rawLedgerValue(r,c)==="");
 modal("台账取数底稿",'<p>'+esc(r.基金名称||r.被投资企业名称||"")+'</p><div class="fields">'+available.map(c=>'<label>'+esc(c.key)+'<input data-supplement="'+esc(c.key)+'" value="'+esc(saved?.values?.[c.key]||"")+'"></label>').join("")+'</div>'+input("补录依据",saved?.basis||"")+ (writable()?btn("保存补录","saveSupplement",r.id,"primary"):""));
}
document.addEventListener("change",e=>{if(e.target.form?.id==="reportDesigner"&&e.target.name==="数据来源"){outputReport=e.target.value;selectedTemplate="";render()}});
document.addEventListener("submit",async e=>{
 const f=e.target;if(!["reportDesigner","newProposal","paymentFilter"].includes(f.id))return;e.preventDefault();
 const v=Object.fromEntries(new FormData(f));
 try{
  if(f.id==="paymentFilter"){query=v.关键字.trim();filter=v.资金去向;render();return}
  if(f.id==="newProposal"){
   const p=db.直投项目管理.find(p=>p.id===v.project);if(!p)return;
   const row={id:uid(),project:p.id,name:p.项目名称+"投资建议书",author:actor(),date:day(),version:1,text:proposalText(p)};db.投资建议书.unshift(row);await persist();render();document.querySelector('[data-a="proposalShow"]').click();return;
  }
  const cols=templateColumns(f),templates=db.settings.reportTemplates??=[],existing=templates.find(t=>t.id===selectedTemplate);
  const row={id:existing?.id||uid(),name:v.模板名称.trim(),report:outputReport,keys:cols.map(c=>c.key)};
  if(!row.name)throw Error("请输入模板名称");if(existing)Object.assign(existing,row);else templates.push(row);
  await persist();selectedTemplate=row.id;render();notice("模板已保存");
 }catch(err){showFailure(err)}
});
document.addEventListener("click",async e=>{
 const el=e.target.closest("[data-a]");if(!el)return;
 const a=el.dataset.a,v=el.dataset.v;
 try{
  if(["receiptForm","receiptPrint","confirmReceipt"].includes(a)){
   const o=paymentOrders().find(x=>x.entry===v);if(!o)return;
   if(a==="receiptForm")modal("登记财务回单",kv({基金:o.name,业务类型:o.section,资金去向:o.direction,审批金额:o.amount},["基金","业务类型","资金去向","审批金额"])+input("回单编号","",null,true)+input("到账日期",day(),null,true)+btn("确认回单","confirmReceipt",v,"primary"));
   if(a==="receiptPrint"){const r=o.receipt;modal("收付款证明",'<div class="printDoc"><h3>收付款证明</h3>'+kv({基金:o.name,业务类型:o.section,资金去向:r.direction,"金额（万元）":r.amount,发生日期:r.date,回单编号:r.reference,财务确认人:r.actor},["基金","业务类型","资金去向","金额（万元）","发生日期","回单编号","财务确认人"])+'</div>'+btn("打印证明","printNow"));return}
   if(a==="confirmReceipt"){const reference=el.form.elements.回单编号.value.trim(),date=el.form.elements.到账日期.value;if(!reference||!date||!(Number(o.amount)>0))throw Error("请核对审批金额、回单编号和发生日期");
    if(team)await sharedSave("receipt",{entry:o.entry,section:o.section,owner:o.owner,reference,date});
    else{const receipts=db.settings.receipts??=[];if(receipts.some(r=>r.entry===v||r.reference===reference))throw Error("事项或回单已登记");
     const rec={id:uid(),entry:v,owner:o.owner,section:o.section,reference,date,amount:o.amount,direction:o.direction,actor:actor()};receipts.push(rec);(db.notes[o.owner].现金流??=[]).unshift({id:rec.id,类型:o.direction,发生时间:date,"发生金额（万元）":o.amount,业务类型:o.section,备注:"回单 "+reference,receiptId:rec.id});await persist()}
    $("#modal").close();render();notice("回单已确认，现金流已更新")}
  }
  if(a==="newTemplate"){selectedTemplate="";render()}
  if(a==="selectTemplate"){const t=db.settings.reportTemplates.find(x=>x.id===v);selectedTemplate=v;outputReport=t.report;render()}
  if(a==="exportTemplate"||a==="previewTemplate"){const cols=templateColumns(el.form),rows=ledgerRows(outputReport).map(r=>cols.map(c=>ledgerValue(r,c,outputReport)));if(a==="exportTemplate")csvFile(el.form.elements.模板名称.value||outputReport,cols.map(c=>c.key),rows);else modal("报表预览",table(cols.map(c=>c.key),rows.map(r=>r.map(v=>esc(first(v))))))}
  if(a==="proposalShow"||a==="proposalDownload"||a==="proposalSave"){
   const r=db.投资建议书.find(x=>x.id===v);
   if(a==="proposalDownload")download(new Blob([r.text],{type:"text/plain;charset=utf-8"}),r.name+".txt");
   if(a==="proposalShow")modal(r.name,'<label>建议书正文<textarea id="proposalBody" rows="18" '+(writable()?"":"readonly")+'>'+esc(r.text)+'</textarea></label>'+ (writable()?btn("保存修订","proposalSave",v,"primary"):"")+btn("下载","proposalDownload",v));
   if(a==="proposalSave"){r.text=$("#proposalBody").value;r.version++;r.date=day();r.author=actor();await persist();$("#modal").close();render()}
  }
  if(a==="supplement")supplementView(ledgerRows().find(x=>x.id===v));
  if(a==="saveSupplement"){
   const r=ledgerRows().find(x=>x.id===v),basis=el.form.elements.补录依据.value.trim(),values={};
   for(const i of el.form.querySelectorAll("[data-supplement]"))if(i.value.trim())values[i.dataset.supplement]=i.value.trim();
   if(Object.keys(values).length&&!basis)throw Error("请填写补录依据");
   const items=((db.notes[r.sourceId]??={}).台账补录??=[]),old=rowSupplement(page,r),row={id:old?.id||uid(),report:page,row:r.id,values,basis,author:actor(),date:day()};
   if(old)Object.assign(old,row);else items.push(row);
   await persist();$("#modal").close();render();notice("已更新台账");
  }
 }catch(err){showFailure(err)}
});
