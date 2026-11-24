"use strict";
const workspaceViews=[["board","集团总览"],["invest","投资经理"],["operate","投后风控"]];
let cockpitView="board",poolTab="全部",poolOwner="",poolSearch="",riskFilter="待处理";
const bench=db.equityDesk??={leads:[],reports:[],assessments:{},fundReviews:[],scans:[],marks:{},initialized:false};
if(!bench.initialized){
 bench.leads=[
  {id:"XS-0261",name:"岚川精密",sector:"高端装备",source:"园区招商",owner:"",amount:1800,fund:0,notes:[]},
  {id:"XS-0262",name:"启衡新材",sector:"新材料",source:"产业方推荐",owner:"林然",amount:1200,fund:1,notes:[{date:"2026-11-23",owner:"林然",note:"已取得中试线良率数据，安排客户访谈。",next:"核实两家客户的试用反馈"}]},
  {id:"XS-0263",name:"瀚星微控",sector:"数字科技",source:"科技部门推介",owner:"许舒",amount:900,fund:2,notes:[{date:"2026-11-24",owner:"许舒",note:"已收到商业计划书与首批订单清单。",next:"核对交货日期及产品验证进度"}]}
 ];
 bench.initialized=true;
}
const companyNames=()=>[...new Set(db.projects.map(p=>p.name))];
const ownerOptions=()=>[...new Set(db.projects.map(p=>p.owner).concat(bench.leads.map(l=>l.owner)).filter(Boolean))];
function bmTable(titleText,headers,rows,action=""){return card(titleText,table(headers,rows),action)}
function goButtons(items){return '<div class="workspaceShortcuts">'+items.map(([dest,label,icon])=>cmd("nav",ico(icon)+esc(label),"shortcut",dest)).join("")+'</div>'}
function cockpit(){
 const ps=selectedProjects(),fs=funds.filter((f,i)=>selected({fund:i})),open=ps.filter(p=>!["投后管理","未获通过"].includes(p.stage)),held=ps.filter(p=>p.stage==="投后管理"),tasks=db.tasks.filter(selected);
 const risks=db.risks.filter(r=>r.state!=="已销号"&&ps.some(p=>p.name===r.company));
 const fundCap=fs.reduce((sum,f)=>sum+f.cap,0),cost=held.reduce((sum,p)=>sum+positions(p).book,0);
 const header='<div class="portalHeading"><div><small>集团投资管理部　 /　 资产组合</small><h1>投资管理驾驶舱</h1></div><div class="portalTools">'+filterSelect()+'<span>'+ico("cal")+' 2026年11月24日</span></div></div>';
 const tabs='<div class="viewtabs">'+workspaceViews.map(([key,text])=>cmd("cockpitView",text,cockpitView===key?"active":"",key)).join("")+'</div>';
 const menu=goButtons([["pool","项目池","layers"],["B","直投项目","project"],["subs","投资子基金","fund"],["directory","企业档案","file"],["riskcenter","风险中心","shield"],["close/cash","季度结账","coin"]]);
 const kpi='<div class="portfolioKpis">'+[
 ["在管基金认缴",fundCap.toFixed(2),"亿元",fs.length+" 只基金","D"],
 ["在投持仓成本",money(cost),"万元",held.length+" 个持有项目","B"],
 ["推进中拟投",money(open.reduce((n,p)=>n+p.amount,0)),"万元",open.length+" 个在办项目","B"],
 ["待处置风险",risks.length,"项","来自已投企业的未结工单","riskcenter"]
 ].map(([label,value,unit,footer,dest])=>cmd("nav",'<small>'+label+'</small><strong>'+value+' <em>'+unit+'</em></strong><span>'+esc(footer)+'</span>',"portfolioKpi",dest)).join("")+'</div>';
 const funnel=card("投资阶段分布",'<div class="funnel">'+channelGroups.slice(1).map(([name,stages])=>{const count=ps.filter(p=>stages.includes(p.stage)).length;return cmd("funnelStage",'<span>'+name+'</span><i><b style="width:'+100*count/Math.max(1,ps.length)+'%"></b></i><strong>'+count+' 个</strong>',"funnelLine",name)}).join("")+'</div>');
 const riskCard=card("风险处置",risks.length?risks.slice(0,5).map(r=>cmd("risk",'<b>'+esc(r.company)+'</b><span>'+esc(r.source)+'</span>'+tag(r.state),"reviewLine",r.id)).join(""):block("当前组合没有未结风险。"),cmd("nav","全部工单","textbtn","riskcenter"));
 const holds=bmTable("投资组合",["项目 / 投资基金","行业","剩余成本","负责人"],held.map(p=>tr(['<strong>'+esc(p.name)+'</strong><small>'+esc(funds[p.fund].name)+'</small>',esc(p.industry),amt(positions(p).book),esc(p.owner)],"company",p.name)),cmd("nav","查看企业档案","textbtn","directory"));
 const ongoing=bmTable("项目推进",["企业","阶段","下一步","负责人"],open.map(p=>tr([esc(p.name),tag(p.stage),'<span class="wrapCell">'+esc(projectSignal(p)[1])+'</span>',esc(p.owner)],"nav",projectUrl(p.id,"decision"))));
 const post=bmTable("企业季度报送",["企业","期间","数据版本","状态"],tasks.map(t=>tr([esc(t.company),esc(t.q),t.v?"V"+t.v:"—",tag(t.status)],"task",t.id)));
 const main=cockpitView==="invest"?ongoing+funnel:cockpitView==="operate"?post+riskCard:'<div class="grid">'+funnel+card("行业投资分布",allocation(ps))+'</div><div class="grid">'+holds+riskCard+'</div>';
 return header+tabs+kpi+menu+main;
}
function leadStatus(l){return l.project?"已转项目":l.owner?"跟进中":"待分配"}
function poolPage(){
 const labels=["全部","待分配","跟进中","已转项目"];
 const scope=bench.leads.filter(selected);
 const rows=scope.filter(l=>(poolTab==="全部"||leadStatus(l)===poolTab)&&(!poolOwner||poolOwner===l.owner)&&(l.name+" "+l.source).includes(poolSearch));
 return title("项目池","项目来源、经理分配与跟进记录",cmd("leadBatchForm","批量导入","btn")+cmd("weekReport","本周推进报告","btn")+cmd("leadNew",ico("plus")+"登记线索","btn primary"))+
 card("线索台账",'<div class="stageStrip">'+labels.map(v=>cmd("poolTab",v+' <b>'+scope.filter(l=>v==="全部"||leadStatus(l)===v).length+'</b>',poolTab===v?"on":"",v)).join("")+'</div>'+
 '<form class="tools" data-form="poolFilter">'+filterSelect()+'<select id="poolOwner" aria-label="项目经理">'+opt([["","全部经理"],...ownerOptions().map(v=>[v,v])],poolOwner)+'</select><input class="input" name="text" placeholder="企业或来源" value="'+esc(poolSearch)+'"><button class="btn">查询</button></form>'+
 table(["企业 / 编号","来源","拟投金额","经办人","最近跟进","状态"],rows.map(l=>tr(['<b>'+esc(l.name)+'</b><small>'+esc(l.id)+'</small>',esc(l.source),amt(l.amount),esc(l.owner||"未分配"),esc(l.notes.at(-1)?.date||"—"),tag(leadStatus(l))],"leadOpen",l.id))));
}
function leadNew(){
 drawer("登记项目线索",form("leadNew",cause("name","企业名称")+cause("source","线索来源")+formSelect("sector","行业",opt(["高端装备","新材料","数字科技","新能源"].map(v=>[v,v]),""))+formSelect("fund","拟投基金",fundOptions(0))+field("amount","拟投金额（万元）","number","","required min=0.01 step=0.01"),"加入项目池"));
}
function leadOpen(id){
 const l=bench.leads.find(l=>l.id===id);if(!l)return;
 const log=l.notes.map(n=>kv(n.date+" · "+n.owner,n.note+"　下一步："+n.next)).join("");
 const actions=l.project?cmd("project","进入项目档案","btn primary",l.project):
 form("leadAssign",formSelect("owner","经办经理",opt(ownerOptions().map(v=>[v,v]),l.owner))+cause("reason","分配或接管依据"),l.owner?"确认交接":"确认分配",id)+(l.owner?form("leadNote",cause("note","本次跟进")+cause("next","下一步动作"),"登记跟进",id)+form("leadConvert",cause("reason","立项理由")+cause("risk","核心风险"),"转为立项申请",id):"");
 drawer(l.name+" · 线索档案",tag(leadStatus(l))+kv("来源 / 经办",l.source+" / "+(l.owner||"待分配"))+kv("拟投基金",funds[l.fund].name)+kv("拟投金额",amt(l.amount))+'<h3>跟进动态</h3>'+log+actions);
}
function weekReport(){
 const leads=bench.leads.filter(selected).filter(l=>!poolOwner||l.owner===poolOwner);
 const entries=leads.flatMap(l=>l.notes.filter(n=>n.date>="2026-11-23"&&n.date<="2026-11-29").map(n=>[l.name,n.owner,n.date,n.note,n.next]));
 drawer("项目推进周报",kv("报告期","2026.11.23 — 11.29")+kv("经办人",poolOwner||"全部经理")+kv("本周跟进",entries.length+" 次")+table(["企业","负责人","日期","进展","下一步"],entries.map(r=>tr(r.map(esc))))+cmd("weekExport","导出本周推进明细","btn"));
 return entries;
}
const qualityDimensions=["投资价值","行业环境","竞争优势","团队执行","经营财务"];
const qualityMetrics=[
 ["投资策略匹配","需求验证","商业模式","融资用途","退出可行性"],
 ["市场空间","行业增长","政策适配","周期敏感性","供应链稳定性"],
 ["技术壁垒","知识产权","客户黏性","产品替代性","议价能力"],
 ["创始团队经验","关键岗位覆盖","团队稳定性","治理机制","执行里程碑"],
 ["收入质量","毛利水平","现金周转","客户集中度","融资续航","财务资料可信度"]
];
function scoreBreakdown(x){
 if(!x.indicators)return "";
 return '<details><summary>查看 26 项评分明细</summary>'+table(["维度","指标","评分"],qualityMetrics.flatMap((row,i)=>row.map((label,j)=>tr([qualityDimensions[i],label,x.indicators[i][j]+" / 5"]))))+'</details>';
}
function scorePanel(p){
 const entries=bench.assessments[p.id]||[],last=entries[0];
 return card("项目质量评估",block(kv("当前阶段",p.stage)+kv("最近综合评分",last?last.score+" / 100":"待评估")+kv("计分口径","五项各评 1 至 5 分；本阶段权重为 "+stageWeights(p).join(" / ")+"%，折算百分制。"))+(last?table(["评估维度","分值","归档权重","评分依据"],qualityDimensions.map((t,i)=>tr([t,String(last.values[i])+" / 5",last.weights[i]+"%",esc(last.reasons[i])])))+scoreBreakdown(last):"")+block(entries.map(x=>kv(x.stage+" · V"+x.version,x.score+" 分 · "+x.owner+" · "+x.date)).join("")),cmd("scoreEdit","登记阶段评估","btn",p.id));
}
function scoreEdit(id){
 const p=getProject(id);drawer("阶段质量评估",kv("投资项目",p.name+" · "+p.stage)+form("scoreEdit",qualityDimensions.map((t,i)=>'<h3>'+t+'</h3>'+'<div class="qualityGrid">'+qualityMetrics[i].map((label,j)=>field("n"+i+"_"+j,label+"（1–5）","number","","required min=1 max=5 step=1")).join("")+'</div>'+field("r"+i,"判断依据","text","","required maxlength=180")).join("")+field("owner","评估人","text",p.owner,"required maxlength=30"),"保存评估版本",id));
}
function directoryPage(){
 const names=companyNames().filter(name=>db.projects.some(p=>p.name===name&&selected(p))&&name.includes(query));
 return title("企业档案","集团项目、经营报送、估值及风险记录",filterSelect())+card("企业名录",searchbar("搜索企业名称")+table(["投资企业","行业标签","投资主体","已确认报送","未结风险","关系项目"],names.map(name=>{
 const all=db.projects.filter(p=>p.name===name);return tr(['<b>'+esc(name)+'</b>',esc(all[0].industry),esc([...new Set(all.map(p=>funds[p.fund].name))].join(" / ")),String(db.tasks.filter(t=>t.company===name&&t.status==="已确认").length),String(db.risks.filter(r=>r.company===name&&r.state!=="已销号").length),all.length+" 笔"],"company",name)})));
}
function companyView(name){
 const ps=db.projects.filter(p=>p.name===name);if(!ps.length)return directoryPage();
 const tasks=db.tasks.filter(t=>t.company===name),risk=db.risks.filter(r=>r.company===name);
 return cmd("nav","‹　企业名录","backlink","directory")+title(esc(name),esc(ps[0].industry)+"　·　企业综合档案",tag(ps[0].stage))+
 '<div class="companySummary">'+numbers([["关联投资",ps.length+" 笔","集团内项目"],["累计投资",amt(ps.reduce((n,p)=>n+positions(p).cost,0)),"已付款成本"],["确认报送",tasks.filter(t=>t.status==="已确认").length+" 次","企业确认版本"],["未结风险",risk.filter(r=>r.state!=="已销号").length+" 项","整改及复核"]])+'</div>'+
 '<div class="grid">'+bmTable("投资与投决",["基金","项目阶段","经办人","投资依据"],ps.map(p=>tr([esc(funds[p.fund].name),tag(p.stage),esc(p.owner),esc(p.reason||"查看项目档案")],"project",p.id)))+
 card("业务导航",goButtons([[ddUrl(ps[0].id),"尽调工作台","search"],["B/"+ps[0].id+"/score","质量评估","task"],["B/"+ps[0].id+"/marks","项目估值","coin"],["B/"+ps[0].id+"/paths","持仓穿透","layers"]]))+'</div>'+
 bmTable("经营报告与佐证",["期间","报送任务","确认状态","版本 / 材料"],tasks.map(t=>tr([esc(t.q),esc(t.id),tag(t.status),esc("V"+t.v+" · "+(t.file||"待提交"))],"task",t.id)))+
 bmTable("风险与整改记录",["事项编号","触发依据","责任人","状态"],risk.map(r=>tr([esc(r.id),esc(r.source),esc(r.owner),tag(r.state)],"risk",r.id)));
}
function projectRibbon(p){
 const stages=["立项","尽调","投决","交割","持有"],i=channelGroups.findIndex(g=>g[1].includes(p.stage))-1;
 return '<div class="processRibbon">'+stages.map((s,k)=>'<span class="'+(i===k?"current":k<i?"finished":"")+'"><i>'+(k<i?"✓":k+1)+'</i>'+s+'</span>').join("")+'</div>';
}

