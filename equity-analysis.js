"use strict";
const subfunds=[
 {id:"SF01",name:"成长子基金",manager:"成长基金管理公司",parent:0,target:3000,area:"烟台",rule:"实际投入金额认定，需提供投资付款与属地证明。"},
 {id:"SF02",name:"装备产业子基金",manager:"装备产业基金管理公司",parent:2,target:2400,area:"烟台",rule:"按项目实际投入认定，招引落地须另附落地证明。"},
 {id:"SF03",name:"先进制造子基金",manager:"先进制造基金管理公司",parent:0,target:1600,area:"烟台",rule:"未披露底层持仓须先补充标的及证明。"}
];
if(!bench.fundSeed){
 bench.fundReviews.push({id:"RT-001",sub:"SF01",company:"海岚智造",amount:800,date:"2026-09-30",kind:"返投",proof:"RT-PAY-026",area:"烟台",evidence:"属地经营及付款资料 RT-026",state:"已确认",owner:"林然",note:"按实际付款核验"});
 bench.fundSeed=true;
}
const approvedReturn=id=>bench.fundReviews.filter(r=>r.sub===id&&r.state==="已确认").reduce((s,r)=>s+r.amount,0);
function subPage(id){
 const f=subfunds.find(x=>x.id===id);
 if(!f){
 const fs=subfunds.filter(x=>selected({fund:x.parent}));
 return title("投资子基金","母基金出资、底层披露与返投认定",filterSelect())+bmTable("子基金组合",["基金 / 管理人","出资主体","返投目标","已认定","达成率","待复核"],fs.map(s=>tr(['<b>'+s.name+'</b><small>'+s.manager+'</small>',funds[s.parent].name,amt(s.target),amt(approvedReturn(s.id)),(approvedReturn(s.id)/s.target*100).toFixed(1)+"%",bench.fundReviews.filter(r=>r.sub===s.id&&r.state==="待复核").length+" 项"],"nav","subs/"+s.id)));
 }
 const list=bench.fundReviews.filter(x=>x.sub===id),paths=db.paths.filter(x=>x.child===f.name);
 return cmd("nav","‹　子基金组合","backlink","subs")+title(f.name,f.manager+"　·　"+funds[f.parent].name,cmd("returnNew","发起认定","btn primary",f.id))+
 '<div class="companySummary">'+numbers([["返投目标",amt(f.target),"示例协议"],["已认定金额",amt(approvedReturn(id)),"复核通过项目"],["达成率",(approvedReturn(id)/f.target*100).toFixed(1)+"%","按确认金额 / 目标"],["待复核",list.filter(x=>x.state==="待复核").length+" 项",f.area]])+'</div>'+
 bmTable("底层持仓披露",["投资路径","底层项目持仓价值","母基金份额","披露日期","材料编号"],paths.map(x=>tr([esc(x.enterprise||"未披露底层企业"),x.value==null?"待披露":amt(x.value),x.share+"%",esc(x.date),esc(x.source)],x.enterprise?"company":null,x.enterprise)))+
 bmTable("返投与招引认定",["项目","类别","认定申报额","所在地","证明编号","办理状态"],list.map(x=>tr([esc(x.company),esc(x.kind),amt(x.amount),esc(x.area),esc(x.proof),tag(x.state)],"returnReview",x.id)))+card("认定规则",block(kv("适用条件",f.rule)));
}
function returnNew(id){
 const f=subfunds.find(x=>x.id===id);drawer("返投与招引认定",kv("子基金",f.name)+form("returnNew",cause("company","底层企业")+formSelect("kind","认定类别",opt([["返投","返投"],["招引并返投","招引并返投"]],"返投"))+field("area","认定地区","text",f.area,"required maxlength=50")+field("amount","实际投资金额（万元）","number","","min=0.01 step=0.01 required")+when("date","实际投资日")+cause("proof","投资付款凭据编号")+cause("evidence","属地 / 招引材料依据"),"提交认定",id));
}
function returnReview(id){
 const x=bench.fundReviews.find(r=>r.id===id);drawer("认定单 "+id,kv("企业",x.company)+kv("申报金额",amt(x.amount))+kv("投资日",x.date)+kv("地区 / 类别",x.area+" · "+x.kind)+kv("证明资料",x.proof+" · "+x.evidence)+tag(x.state)+(x.state==="待复核"?form("returnReview",formSelect("result","核验结论",opt([["已确认","通过认定"],["未认定","不予认定"]],"已确认"))+cause("owner","复核人")+cause("note","认定意见"),"保存结论",id):kv("复核记录",x.owner+" · "+x.note)));
}
const markModels=[
 {name:"最新融资价格",inputs:[["融资后企业股权价值","万元"]],calc:a=>a[0]},
 {name:"市场乘数",inputs:[["年化净利润","万元"],["可比市盈率","倍"]],calc:a=>a[0]*a[1]},
 {name:"可回收净值",inputs:[["可回收资产估计","万元"],["预计清偿负债与处置成本","万元"]],calc:a=>Math.max(0,a[0]-a[1])},
 {name:"上市市场价格",inputs:[["收盘价","元/股"],["公司总股本","万股"]],calc:a=>a[0]*a[1]},
 {name:"行业指标",inputs:[["行业业务量","单位"],["单位业务量对应企业价值","万元/单位"],["净债务","万元"]],calc:a=>Math.max(0,a[0]*a[1]-a[2])},
 {name:"现金流折现",inputs:[["第 1 年股权自由现金流","万元"],["第 2 年股权自由现金流","万元"],["第 2 年末股权终值","万元"],["年折现率","%"]],calc:a=>Math.max(0,a[0]/(1+a[3]/100)+(a[1]+a[2])/(1+a[3]/100)**2)},
 {name:"净资产",inputs:[["调整后资产总额","万元"],["调整后负债总额","万元"]],calc:a=>Math.max(0,a[0]-a[1])}
];
function marksPanel(p){
 const rows=bench.marks[p.id]||[];
 return card("项目估值比较",block('<p class="dim">按基准日留存测算。股权价值乘以持股比例得到对应持仓价值，测算结果供估值复核参考。</p>')+table(["基准日","估值方法","企业股权价值","持股比例","持仓测算值","依据"],rows.map((x,i)=>tr([esc(x.date),esc(markModels[x.model].name),amt(x.equity),money(x.share)+"%",amt(x.value),esc(x.proof)],"markDetail",p.id+":"+i)))+block('<div class="chips">'+markModels.map((m,i)=>cmd("markTrial",esc(m.name),"chip",p.id+":"+i)).join("")+'</div>'));
}
function markTrial(key){
 const [id,k]=key.split(":"),p=getProject(id),m=markModels[+k];drawer(m.name+" · 估值测算",kv("投资标的",p.name)+form("markTrial",when("date","估值基准日")+m.inputs.map(([label,unit],i)=>field("a"+i,label+"（"+unit+"）","number","","required step=any"+(k==="5"&&i<2?"":" min=0"))).join("")+field("share","适用持股比例（%）","number",positions(p).holding??"","required min=0.0001 max=100 step=any")+cause("proof","数据来源与估值假设"),"计算并加入比较",key));
}
function markDetail(key){const [id,i]=key.split(":"),x=bench.marks[id][+i],m=markModels[x.model];drawer(m.name+" · 测算底稿",kv("企业",getProject(id).name)+kv("基准日",x.date)+m.inputs.map(([k,u],i)=>kv(k,money(x.inputs[i])+" "+u)).join("")+kv("持股比例",money(x.share)+"%")+kv("持仓测算值",amt(x.value))+kv("来源",x.proof));}
function riskCenter(){
 const work=db.risks.filter(r=>fundFilter==="-1"||r.fund===+fundFilter||(!Number.isInteger(r.fund)&&db.projects.some(p=>p.name===r.company&&p.fund===+fundFilter)));
 const rows=work.filter(r=>riskFilter==="全部"||(riskFilter==="待处理"?r.state!=="已销号":r.state==="已销号"));
 return title("风险中心","经营指标、投资条件与跟踪期限",filterSelect()+cmd("riskScan","扫描当前组合","btn primary"))+
 '<div class="companySummary">'+numbers([["未结风险",work.filter(x=>x.state!=="已销号").length+" 项","需整改或复核"],["已销号",work.filter(x=>x.state==="已销号").length+" 项","已完成处置"],["覆盖企业",new Set(work.map(x=>x.company)).size+" 家","有风险记录的企业"],["扫描批次",bench.scans.filter(x=>String(x.fund)===fundFilter).length+" 次","当前筛选范围"]])+'</div>'+
 card("风险工作清单",'<div class="stageStrip">'+["待处理","已销号","全部"].map(v=>cmd("riskFilter",v,riskFilter===v?"on":"",v)).join("")+'</div>'+table(["风险 / 企业","触发依据","整改责任人","期限","状态"],rows.map(r=>tr(['<b>'+esc(r.id)+'</b><small>'+esc(r.company)+'</small>','<span class="wrapCell">'+esc(r.source)+'</span>',esc(r.owner),esc(r.due||"待确认"),tag(r.state)],"risk",r.id))))+
 bmTable("扫描记录",["日期","覆盖范围","核查规则","新增工单"],bench.scans.filter(x=>String(x.fund)===fundFilter).map(s=>tr([esc(s.date),esc(s.label),"经营偏差 / 投资假设延期 / 交割凭证",s.added+" 项"])));
}
function scanPortfolio(){
 const before=db.risks.length,ps=selectedProjects();
 for(const t of db.tasks.filter(t=>selected(t)&&t.status==="已确认")){checkOperatingRisk(t);makeRisk(t)}
 function add(p,key,source,action,due){
  if(db.risks.some(r=>r.scanKey===key))return;
  db.risks.unshift({id:"FX-S"+Date.now().toString(36)+"-"+db.risks.length,scanKey:key,company:p.name,fund:p.fund,owner:p.owner,source,action,due,state:"待整改",history:[reviewDate+" 组合扫描触发"]});
 }
 for(const p of ps){
  for(const [i,t] of (db.theses[p.id]||[]).entries())if(t.state==="延期")add(p,p.id+":thesis:"+i+":"+t.due,"投资假设延期 · "+t.title,t.action,t.due);
  if(p.stage==="待交割")for(const c of conditions(p).filter(c=>!c.confirmed))add(p,p.id+":condition:"+c.name,"必备条件未完成 · "+c.name,"核实交割凭证与付款排期",p.payDue||reviewDate);
 }
 const added=db.risks.length-before;
 bench.scans.unshift({date:reviewDate,fund:fundFilter,label:fundFilter==="-1"?"集团全部基金":funds[+fundFilter].name,added});save("完成组合风险扫描");render();announce("扫描完成，新增 "+added+" 项风险");
}

