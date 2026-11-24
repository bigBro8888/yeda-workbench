"use strict";
bench.plans??=[
 {id:"JH-01",fund:0,year:2026,metric:"产业项目实际投资",target:8000,unit:"万元",owner:"周宁",method:"按已付款凭证统计本年度项目投资，不含未实付决议。",quarters:[{q:"Q3",actual:620,proof:"FK-Q3-016",note:"启航材料投资付款",date:"2026-09-30"}]},
 {id:"JH-02",fund:2,year:2026,metric:"产业项目落地",target:4,unit:"家",owner:"许舒",method:"按已取得落地证明的企业去重统计。",quarters:[]}
];
function platformPage(){
 const rows=bench.plans.filter(selected);
 return title("产业平台管理","年度经营计划与季度执行跟踪",filterSelect()+cmd("platformNew","登记年度计划","btn primary"))+
 bmTable("年度计划与执行",["年度 / 基金","考核指标","全年目标","累计确认","完成率","责任人"],rows.map(x=>{
 const n=sum(x.quarters,"actual");return tr([x.year+" · "+esc(funds[x.fund].name),esc(x.metric),money(x.target)+" "+esc(x.unit),money(n)+" "+esc(x.unit),(100*n/x.target).toFixed(1)+"%",esc(x.owner)],"platformDetail",x.id)}))+
 bmTable("已确认的季度执行",["基金","季度","指标","实际完成","执行依据"],rows.flatMap(x=>x.quarters.map(q=>tr([esc(funds[x.fund].name),x.year+" "+q.q,esc(x.metric),money(q.actual)+" "+esc(x.unit),esc(q.proof)],"platformDetail",x.id))));
}
function platformNew(){drawer("年度计划",form("platformNew",formSelect("fund","适用基金",fundOptions(0))+field("year","计划年度","number",2026,"min=2000 max=2100 required")+cause("metric","经营指标")+field("target","年度目标","number","","required min=0.01 step=0.01")+cause("unit","计量单位")+cause("method","指标口径及取数依据")+cause("owner","归口负责人"),"保存年度计划"))}
function platformDetail(id){
 const x=bench.plans.find(z=>z.id===id),n=sum(x.quarters,"actual"),pending=["Q1","Q2","Q3","Q4"].filter(q=>!x.quarters.some(z=>z.q===q));
 drawer(x.metric,kv("计划主体",funds[x.fund].name)+kv("统计口径",x.method)+kv("年度目标",money(x.target)+" "+x.unit)+kv("累计完成",money(n)+" "+x.unit)+x.quarters.map(q=>kv(x.year+" "+q.q,money(q.actual)+" "+x.unit+" · "+q.proof+" · "+q.note)).join("")+(pending.length?form("platformQuarter",formSelect("q","执行季度",opt(pending.map(q=>[q,q]),pending[0]))+field("actual","当季完成值（"+x.unit+"）","number","","min=0 step=0.01 required")+cause("proof","核对底稿")+cause("note","执行说明"),"登记当季执行",id):""));
}
function platformForm(kind,id,v,error,done){
 if(kind==="platformNew"){if([v.metric,v.unit,v.method,v.owner].some(s=>!s.trim())||bench.plans.some(x=>x.fund===+v.fund&&x.year===+v.year&&x.metric===v.metric.trim()))return error("请补齐指标口径，并检查同基金同年度是否已有该指标。");
 const x={...v,metric:v.metric.trim(),target:+v.target,fund:+v.fund,year:+v.year,id:"JH-"+Date.now().toString(36),quarters:[]};bench.plans.unshift(x);done("年度计划已保存",()=>platformDetail(x.id));return}
 const x=bench.plans.find(z=>z.id===id);if(x.quarters.some(q=>q.q===v.q)||!v.proof.trim()||!v.note.trim())return error("请核对执行季度和底稿编号。");x.quarters.push({q:v.q,actual:+v.actual,proof:v.proof,note:v.note,date:reviewDate});done("季度执行已更新",()=>platformDetail(id));
}
const leadHeaders=["企业名称","项目来源","行业","拟投基金","拟投金额（万元）"];
let leadBatch=null;
function leadBatchForm(){
 drawer("项目线索批量导入",kv("文件格式","UTF-8 CSV · 以基金和企业名称检查重复")+cmd("leadExample","下载样表","btn")+'<label>选择线索文件<input type="file" accept=".csv,text/csv" id="leadCsv"></label><p id="leadErr" class="error"></p><div id="leadRows"></div>');
}
function parseLeads(csv){
 const [headers,...lines]=parseCSV(csv.replace(/^\uFEFF/,""));if(headers?.join("|")!==leadHeaders.join("|"))throw Error("表头不匹配，请使用提供的样表。");
 const keys=new Set([...db.projects,...bench.leads].map(x=>x.fund+"|"+x.name));
 return lines.filter(row=>row.some(x=>x.trim())).map(row=>{
 const [name,source,sector,f,raw]=row.map(x=>x.trim()),fund=funds.findIndex(x=>x.name===f),amount=Number(raw),key=fund+"|"+name;
 const valid=row.length===5&&name&&source&&sector&&fund>=0&&Number.isFinite(amount)&&amount>0;
 const status=!valid?"字段错误":keys.has(key)?"重复跳过":"待导入";if(valid)keys.add(key);return {name,source,sector,fund,amount,status};
 });
}
document.addEventListener("change",async e=>{
 if(e.target.id!=="leadCsv"||externalCompany)return;const file=e.target.files?.[0];leadBatch=null;if(!file)return;
 try{if(file.size>256000)throw Error("请分批导入，每批文件最多 250 KB。");const csv=await file.text();const rows=parseLeads(csv);if(!rows.length)throw Error("缺少数据行。");
 leadBatch=csv;$("#leadRows").innerHTML=table(["企业","来源","校验"],rows.map(r=>tr([esc(r.name),esc(r.source),tag(r.status)])))+(rows.some(r=>r.status==="字段错误")||!rows.some(r=>r.status==="待导入")?"":cmd("leadBatchSave","确认导入","btn primary"));$("#leadErr").textContent="";
 }catch(err){$("#leadRows").innerHTML="";$("#leadErr").textContent=err.message}
});
function commitLeadBatch(){
 const rows=parseLeads(leadBatch||"");if(rows.some(r=>r.status==="字段错误"))return;
 const fresh=rows.filter(r=>r.status==="待导入");if(!fresh.length)return announce("没有新增线索");
 for(const [i,r] of fresh.entries()){const {status,...fields}=r;bench.leads.push({...fields,id:"XS-"+Date.now().toString(36)+"-"+i,owner:"",notes:[]})}
 save("批量导入 "+fresh.length+" 条线索");leadBatch=null;poolTab="全部";poolOwner="";poolSearch="";fundFilter="-1";$("#panel").close();render();announce("线索已导入");
}

