"use strict";

const riskColumns = ["企业名称","风险级别","风险内容","风险类型","发生时间"];
const workColumns = ["任务主题","提交人","当前节点","到达时间"];
let riskFilter = { keyword:"", level:"", page:1 };
let chartMeasure = "基金数量";
function allFunds() { return [...db.自管基金, ...db.参股基金] }
function total(rows, field) { return rows.reduce((sum, row) => sum + (Number(row[field]) || 0), 0) }
function ownAmount(fundRow, field) {
 const investors = (db.notes[fundRow.id]?.["认缴/实缴信息"] || []).filter(row => row.是否内部投资人 === "是");
 return total(investors, field+"金额（万元）");
}
function risks() {
 return db.直投项目管理.flatMap(project => (db.notes[project.id]?.重大风险事项 || []).map(entry =>
  ({...entry, 发生时间:entry.发生日期, 企业名称:project.企业全称, projectId:project.id})
 )).sort((a,b) => String(b.发生时间).localeCompare(String(a.发生时间)));
}
function riskTable(rows) {
 return table(riskColumns, rows.map(r => [btn(r.企业名称,"riskProject",r.projectId,"link"),
  ...riskColumns.slice(1).map(k=>esc(first(r[k]))) ]));
}
function homeHeading(label, action) {
 return '<div class="bar">'+title(label)+btn("更多",action,"","link")+'</div>';
}
function showRisks() {
 const {keyword,level}=riskFilter;
 const rows=risks().filter(r=>(!level||r.风险级别===level)&&[r.企业名称,r.风险内容].some(x=>String(x||"").includes(keyword)));
 const pages=Math.max(1,Math.ceil(rows.length/10));
 riskFilter.page=Math.min(pages,Math.max(1,riskFilter.page));
 const start=(riskFilter.page-1)*10;
 modal("风险信息",'<div class="queryline">'+input("关键字",keyword)+input("风险级别",level,["低","中","高"])+btn("查询","riskSearch","","primary")+btn("重置","riskReset")+'</div>'+riskTable(rows.slice(start,start+10))+
 '<div class="pager">共 '+rows.length+' 条　'+riskFilter.page+' / '+pages+btn("上一页","riskPrev")+btn("下一页","riskNext")+'</div>');
 $("#modal [name=关键字]").placeholder="请输入企业名称/风险描述";
}
function cockpit() {
 const funds=allFunds(), projects=db.直投项目管理;
 const fees=funds.flatMap(f=>db.notes[f.id]?.基金管理费||[]);
 const recoveries=projects.flatMap(p=>db.notes[p.id]?.项目回收款||[]);
 const receipts=projects.flatMap(p=>(db.notes[p.id]?.资金流水||[]).filter(r=>r.资金流向==="收款"));
 const stats=[["基金数",funds.length],["自管基金数量",db.自管基金.length],["基金规模（万元）",total(funds,"基金认缴规模")],
  ["我方认缴（万元）",funds.reduce((s,f)=>s+ownAmount(f,"认缴"),0)],["我方实缴规模（万元）",funds.reduce((s,f)=>s+ownAmount(f,"实缴"),0)],
  ["累计管理费（万元）",total(fees,"实付管理费（万元）")],["直投项目数",projects.length],
  ["参股基金项目数",db.参股基金.reduce((s,f)=>s+(db.notes[f.id]?.已投项目信息||[]).length,0)],["项目投资金额（万元）",total(projects,"累计出资金额")],["项目回款金额（万元）",total(receipts,"费用金额（万元）")+total(recoveries,"金额(万元)")]];
 function bars(field, measure) {
  const labels=[...new Set(funds.map(f=>f[field]||"未填写"))];
  const values=labels.map(label=>{const subset=funds.filter(f=>(f[field]||"未填写")===label);
   return measure==="基金数量"?subset.length:total(subset,"基金"+measure)});
  const max=Math.max(1,...values);
  return labels.map((label,i)=>'<div class="analysisRow"><span>'+esc(label)+'</span><div><i style="width:'+100*values[i]/max+'%"></i></div><b>'+values[i].toLocaleString()+(measure==="基金数量"?" 支":" 万元")+'</b></div>').join("")||'<p class="empty">暂无数据</p>';
 }
 return panel(title("数据总览")+'<div class="portfolioMetrics">'+stats.map(([label,value])=>'<div class="metric"><strong>'+value.toLocaleString()+'</strong><small>'+label+'</small></div>').join("")+'</div>')+
 panel(title("基金运营情况")+'<div class="analysisGrid"><section><h3>基金类型分析</h3>'+tabButtons(["基金数量","认缴规模","实缴规模"],chartMeasure,"measure")+bars("基金类型",chartMeasure)+'</section><section><h3>投资阶段分析</h3>'+bars("基金状态","基金数量")+'</section></div>');
}

const docDefaultCategories=["基本信息","投资流程","日常管理","运营管理","投资人管理","基金投资情况","退出管理"];
let docFilter={folder:"",name:"",uploader:""};
function documentCategories(rows) {
 const module=fund()?page+"管理":projectDetailMode()==="post"?"项目投后管理":"项目投前管理";
 return [...new Set([...(fund()?docDefaultCategories:["项目概况","投资流程","投后管理"]),
  ...db.文件分类配置.filter(r=>[module,"公共模块"].includes(r.所属模块)||[module,"公共模块"].includes(r.上级分类)).map(r=>r.分类名称),...rows.map(r=>r.类别)].filter(Boolean))];
}
function documents(rows) {
 const matches=rows.filter(r=>(!docFilter.folder||r.类别===docFilter.folder)&&String(r.文件名称||"").includes(docFilter.name)&&String(r.上传人||"").includes(docFilter.uploader));
 const nav=["",...documentCategories(rows)].map(dir=>btn(dir||"全部文件","folder",dir,dir===docFilter.folder?"active":"")).join("");
 return '<div class="docWorkspace"><div class="docTree"><input id="folderSearch" aria-label="筛选分类" placeholder="输入关键字进行过滤">'+nav+'</div><div class="docList"><form id="documentQuery" class="queryline">'+input("文件名称",docFilter.name)+input("上传人",docFilter.uploader)+'<button class="primary">查询</button>'+btn("重置","docReset")+'</form><div class="bar"><h3>'+esc(docFilter.folder||"文档资料")+'</h3><div>'+btn("新增","addNote","","primary")+btn("下载","downloadSelected")+'</div></div><div class="tablewrap"><table><thead><tr><th><input type="checkbox" id="allDocs" aria-label="全选文件"></th>'+["序号","文件名称","类别","附件类型","上传人","上传时间","操作"].map(k=>"<th>"+k+"</th>").join("")+'</tr></thead><tbody>'+
 matches.map((r,i)=>'<tr><td><input type="checkbox" data-doc="'+esc(r.id)+'" aria-label="选择文件"></td><td>'+(i+1)+'</td>'+[r.文件名称,r.类别,r.附件类型||extension(r.文件名称),r.上传人,r.上传时间].map(v=>'<td>'+esc(first(v))+'</td>').join("")+'<td>'+btn("下载","download",r.id,"link")+'</td></tr>').join("")+'</tbody></table>'+(!matches.length?'<div class="empty">暂无数据</div>':'')+'</div></div></div>';
}
function extension(name) { return String(name||"").match(/\.([^.]+)$/)?.[1]?.toUpperCase()||"无扩展名" }
function dateFacet(k) {
 if(!/日期$/.test(k))return '<label>'+k+'：<input name="facet-'+k+'" value="'+esc(facets[k])+'" placeholder="请输入'+k+'"></label>';
 return '<label>'+k+'：<input type="date" aria-label="'+k+'开始" name="facet-'+k+'开始" value="'+esc(facets[k+"开始"])+'"></label><label>至<input type="date" aria-label="'+k+'结束" name="facet-'+k+'结束" value="'+esc(facets[k+"结束"])+'"></label>';
}
function facetMatches(r,k,v) {
 if(!v)return true;
 if(k.endsWith("日期开始")||k.endsWith("日期结束")){
  const date=String(r[k.slice(0,-2)]||"").slice(0,10);
  return !!date&&(k.endsWith("开始")?date>=v:date<=v);
 }
 return String(r[k]??"").includes(v);
}
const structureColumns={股权结构:["股东名称","持股比例","认缴出资额","实际出资额"],对外投资:["被投资企业名称","持股比例","认缴出资额"]};
function structureRow(section,record={}) {
 return '<div class="structureRow">'+structureColumns[section].map((k,i)=>'<label>'+k+'<input aria-label="'+k+'" data-column="'+k+'" required '+(i?'type="number" step="any" min="0" '+(k==="持股比例"?'max="100"':''):'type="text"')+' value="'+esc(record[k])+'"></label>').join("")+btn("移除","dropStructure")+'</div>';
}
function structures(r,edit) {
 return Object.entries(structureColumns).map(([section,cols])=>{
  const rows=Array.isArray(r[section])?r[section]:[];
  return '<section class="structures" data-section="'+section+'"><div class="bar"><h3>'+section+'</h3>'+(edit?btn("新增一行","addStructure",section):"")+'</div>'+(edit?rows.map(row=>structureRow(section,row)).join(""):table(cols,rows.map(row=>cols.map(k=>esc(first(row[k]))))))+'</section>';
 }).join("");
}
function readStructures(form,values) {
 for(const section of form.querySelectorAll("[data-section]")){
  values[section.dataset.section]=Array.from(section.querySelectorAll(".structureRow"),row=>
   Object.fromEntries(Array.from(row.querySelectorAll("[data-column]"),i=>[i.dataset.column,i.value.trim()])));
 }
}
function owningStock(change) {
 if(change.stockId)return db.股票列表.find(r=>r.id===change.stockId);
 const candidates=db.股票列表.filter(r=>r.企业名称===change.企业名称&&r.投资主体===change.直接持股主体);
 return candidates.length===1?candidates[0]:null;
}
const stockDelta="直接持股主体股数变化量（股）",stockBefore="变化前直接持股主体持有股数（股）",stockAfter="变化后直接持股主体持有股数（股）";
function updateStockChange(stock, original, data) {
 if(!stock)throw Error("无法唯一确定这笔变动对应的持仓");
 const changes=db.股票变动.filter(r=>owningStock(r)?.id===stock.id);
 const opening=Number(stock.持仓股数||0)-total(changes,stockDelta);
 if(data){
  if(data[stockDelta]===""||!Number.isSafeInteger(Number(data[stockDelta])))throw Error("股数变化量须为整数");
  if(original)Object.assign(original,data);
  else db.股票变动.unshift({...data,id:uid(),企业名称:stock.企业名称,直接持股主体:stock.投资主体,stockId:stock.id,操作人:"演示用户",操作日期:day()});
 }else db.股票变动=db.股票变动.filter(r=>r.id!==original.id);
 const sequence=db.股票变动.filter(r=>owningStock(r)?.id===stock.id).reverse().sort((a,b)=>String(a.发生日期).localeCompare(String(b.发生日期)));
 let holding=opening;
 for(const row of sequence){
  row.stockId=stock.id;row[stockBefore]=holding;holding+=Number(row[stockDelta]);
  if(holding<0)throw Error("该变动会使历史持仓为负");
  row[stockAfter]=holding;
  const shares=Number(stock["总股本（股）"]);
  if(shares>0){row["变化前占比（%）"]=(100*row[stockBefore]/shares).toFixed(4);row["变化后占比（%）"]=(100*holding/shares).toFixed(4)}
 }
 stock.持仓股数=holding;
}
