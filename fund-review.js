"use strict";
const openingCash=[1900,2300,1700,1400];
const lpNames=["甲出资人","乙出资人"];
const weights=[.6,.4];
db.lpSnapshots??=[];
function markSource(){
 const h=positions(getProject(flagshipId)),v=db.valuation;
 drawer("海岚智造 · 已批准估值",kv("估值底稿",h.proof)+kv("基准日",h.date)+kv("基准持仓估值",amt(v.state==="已确认"?v.value:3520))+kv("剩余持仓对应比例",money(h.remaining*100)+"%")+kv("剩余持仓估值",amt(h.mark))+kv("批准依据",v.state==="已确认"?(v.note||v.history.at(-1)):"期初批准估值底稿 GZ-006")+'<div class="actions">'+cmd("valuation","进入估值复核","btn")+'</div>');
}
function returnBridge(){
 const h=positions(getProject(flagshipId)),x=db.exit,sold=!!x.delivery;
 const realized=sold?300-(h.cost-h.book):0,unrealized=h.mark-h.book;
 return block(kv("项目 / 口径","海岚智造 · 累计项目损益，人民币万元")+kv("已实现损益",amt(realized))+kv("剩余持仓未实现损益",amt(unrealized)))+
 table(["构成","金额（万元）","业务依据"],[
  tr(["已交付股权的退出对价",sold?"300":"0",sold?esc(x.delivery.date+" · "+x.delivery.proof):"尚未交付"],"exit","E02"),
  tr(["对应结转成本",money(h.cost-h.book),sold?"原始投资成本 × 25%":"无已交付持仓"],"project",flagshipId),
  tr(["剩余持仓成本",money(h.book),"项目轮次及付款凭证"],"project",flagshipId),
  tr(["剩余持仓估值",money(h.mark),h.date+" · "+h.proof],"markSource",""),
  ...x.receipts.map(r=>tr(["已收退出款",money(r.amount),esc(r.date+" · "+r.proof)],"exit","E02"))
 ]);
}
function archiveLP(i){
 if(!cc().locked||!cc().versions.length)return announce("请先完成季度锁期后归档。");
 const account=lpAccount(i),nav=netAsset(),last=db.lpSnapshots.find(s=>s.account.i===i);
 if(last&&last.closeVersion===cc().versions[0].version&&JSON.stringify([last.account,last.nav])===JSON.stringify([account,nav])){lpMetrics(i,last);return}
 const version=1+db.lpSnapshots.filter(s=>s.account.i===i).length;
 const snap={closeVersion:cc().versions[0].version,id:"LP-"+(i+1)+"-V"+version,account:structuredClone(account),nav:structuredClone(nav)};
 db.lpSnapshots.unshift(snap);save("归档回报底稿 "+snap.id);render();lpMetrics(i,snap);announce("回报底稿已归档");
}
function snapshotList(){
 return block('<h3>LP 回报底稿</h3>')+table(["出资人","报告基准日","归档版本","实收分配"],db.lpSnapshots.map(s=>tr([lpNames[s.account.i],esc(s.account.asOf),esc(s.id),amt(s.account.distributions)],"archivedLP",s.id)));
}
function settledCash(i){
 const paidProjects=db.projects.filter(p=>p.fund===i&&p.payment).reduce((v,p)=>v+p.amount,0);
 return ((i===0&&cc().versions.length)?cc().versions[0].cash/1000000:openingCash[i])-paidProjects+(i===0?db.paid+sum(db.exit.receipts,"amount")-sum(db.exit.distribution,"amount"):0);
}
function forecast(i){
 const plans=db.plans.filter(p=>p.fund===i);
 const pending=db.projects.filter(p=>p.fund===i&&["已放行","待交割"].includes(p.stage)&&p.payDue).map(p=>({date:p.payDue,label:p.name+" · 协议投资款",id:p.id,type:"签约待付",amount:p.amount}));
 const lpDue=i===0&&db.exit.approved?200-sum(db.exit.distribution,"amount"):0;
 const rows=[...plans,...pending,...(lpDue>0?[{id:"FP-003",label:"已批准分户分配",type:"分配待付",amount:lpDue,date:reviewDate}]:[])].filter(p=>p.date>=reviewDate&&p.date<="2027-02-22").sort((a,b)=>a.date.localeCompare(b.date));
 let base=settledCash(i),expected=base;
 return rows.map(row=>{if(row.type!=="预计到账")base-=row.amount;expected+=row.type==="预计到账"?row.amount:-row.amount;return {...row,base,expected}});
}
function fundPage(i){
 const f=funds[i],flows=forecast(i),gap=flows.find(r=>r.base<0),scheduled=flows.filter(r=>r.type!=="预计到账"),incoming=flows.filter(r=>r.type==="预计到账");
 return cmd("nav","‹　基金台账","backlink","D")+title(f.name,"人民币基金　·　资金计划基准日 "+reviewDate,cmd("fundReport","编制基金报告","btn",i)+cmd("planEdit",ico("plus")+"登记资金计划","btn primary",i+":new"))+
 '<div class="dossierHero">'+numbers([["可用现金",amt(settledCash(i)),"已到账及实付口径"],["未来 90 天待支出",amt(sum(scheduled,"amount")),"协议款、分配和费用"],["预计 LP 到账",amt(sum(incoming,"amount")),"尚未计入可用现金"],["首次资金缺口",settledCash(i)<0?reviewDate:gap?gap.date:"未出现","按已到账资金测算"]])+'</div>'+
 card("90 天资金排期",block('<p class="dim">截至 2027-02-22，逐笔列示计划执行后的资金余额。点击手工计划可以调整日期和金额。</p>')+table(["日期","事项 / 凭据","类型","计划金额","不含预计到账余额","含预计到账余额"],flows.map(r=>tr([esc(r.date),'<b>'+esc(r.label)+'</b><small>'+esc(r.id)+'</small>',tag(r.type),amt(r.amount),'<span class="'+(r.base<0?"negative":"")+'">'+amt(r.base)+'</span>',amt(r.expected)],db.plans.some(z=>z.id===r.id)?"planEdit":r.id.startsWith("XM-")?"project":"exit",db.plans.some(z=>z.id===r.id)?i+":"+r.id:r.id.startsWith("XM-")?r.id:"E06"))))+
 '<div class="dossierGrid">'+card("基金档案",block(kv("认缴规模",f.cap.toFixed(2)+" 亿元")+kv("累计实缴",amt(f.paid*10000+(i===0?db.paid:0)))+kv("期初可用资金",amt(openingCash[i]))))+card("投资项目",block(db.projects.filter(p=>p.fund===i).map(p=>cmd("project",esc(p.name)+"　"+tag(p.stage),"searchres",p.id)).join("")))+'</div>';
}
function planEdit(key){
 const [idx,id]=key.split(":"),p=db.plans.find(p=>p.id===id)||{};
 drawer("基金资金计划",form("planEdit",field("label","业务事项与依据","text",p.label,"required maxlength=120")+formSelect("type","计划类别",opt(["签约待付","分配待付","运营费用","预计到账"].map(s=>[s,s]),p.type))+field("amount","计划金额（万元）","number",p.amount,"required min=0.01 step=0.01")+field("date","预计日期","date",p.date||"2026-12-01",'required min="2026-11-24" max="2027-02-22"'),"保存计划",idx+":"+id));
}
function flowDate(raw){
 const match=String(raw).match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
 return match?match[1]+"-"+match[2].padStart(2,"0")+"-"+match[3].padStart(2,"0"):reviewDate;
}
function netAsset(){
 const pos=positions(getProject(flagshipId));
 // Other approved assets less liabilities, excluding cash, this holding and its exit receivable.
 const otherAssets=90580+db.projects.filter(p=>p.fund===0&&p.payment&&p.id!==flagshipId).reduce((a,p)=>a+p.amount,0);
 const receivable=db.exit.delivery?300-sum(db.exit.receipts,"amount"):0;
 const unpaid=db.exit.approved?200-sum(db.exit.distribution,"amount"):0;
 return {cash:settledCash(0),otherAssets,receivable,unpaid,pos,total:settledCash(0)+otherAssets+pos.mark+receivable-unpaid};
}
function lpAccount(i){
 const opening=lpQuarter()[i].opening/1000000;
 const flows=cc().book.filter(r=>r.type==="LP 实缴"&&r.party===lpNames[i]).map(r=>({date:r.date,amount:-r.cents/1000000,label:"季度实缴",proof:r.ref}));
 if(i===0)for(const row of db.cashlog)flows.push({date:flowDate(row.date),amount:-row.amount,label:row.amount>0?"出资实缴":"出资冲销",proof:row.proof||"BK-901"});
 for(const row of db.exit.distribution.filter(z=>z.lp===i))flows.push({...row,label:"分配实付"});
 const asOf=[reviewDate,...flows.map(x=>x.date),...db.exit.receipts.map(x=>x.date)].sort().at(-1);
 const capital=opening+lpQuarter()[i].book/1000000+(i===0?db.paid:0),distributions=sum(db.exit.distribution.filter(z=>z.lp===i),"amount"),nav=netAsset();
 // Confirmed distributions payable remain a receivable of the individual LP until paid.
 const payable=(db.exit.approved?200*weights[i]:0)-distributions;
 const residual=nav.total*weights[i]+payable;
 const dated=[...flows,{date:asOf,amount:residual,label:"期末权益及应收分配",proof:nav.pos.proof+" / NAV-01"}].sort((a,b)=>a.date.localeCompare(b.date));
 if(opening)dated.unshift({date:"期初 · 日期待补",amount:-opening,label:"历史实缴汇总",proof:"OPEN-LP-"+(i+1)});
 return {i,capital,distributions,payable,residual,dated,asOf,dpi:distributions/capital,tvpi:(distributions+residual)/capital,irr:opening?null:annualReturn(dated)};
}
function annualReturn(flows){
 const first=Date.parse(flows[0].date),npv=rate=>flows.reduce((n,f)=>n+f.amount/(1+rate)**((Date.parse(f.date)-first)/31536000000),0);
 let low=-.999,high=1;
 if(!flows.some(f=>f.amount<0)||!flows.some(f=>f.amount>0))return null;
 while(npv(high)>0&&high<1048576)high*=2;
 if(npv(low)*npv(high)>0)return null;
 for(let k=0;k<85;k++){const mid=(low+high)/2;if(npv(mid)>0)low=mid;else high=mid}
 return (low+high)/2;
}
function lpMetrics(i,snapshot){
 const a=snapshot?.account||lpAccount(i),nav=snapshot?.nav||netAsset();
 drawer(lpNames[i]+" · 回报底稿",(snapshot?kv("归档版本",snapshot.id+" · 季结 "+(snapshot.closeVersion?"V"+snapshot.closeVersion:"历史版本待核")):"")+numbers([["DPI",a.dpi.toFixed(4)+"×","累计实收 / 实缴"],["TVPI",a.tvpi.toFixed(4)+"×","总价值 / 实缴"],["年化 IRR",a.irr==null?"历史流水待补":(a.irr*100).toFixed(2)+"%","含期末权益 · 实际日数 / 365"]])+
 kv("报告基准日",a.asOf)+kv("累计实缴",amt(a.capital))+kv("累计实收分配",amt(a.distributions))+kv("应收未付分配",amt(a.payable))+kv("期末权益含应收分配",amt(a.residual))+'<h3>基金净资产构成</h3>'+kv("现金余额",amt(nav.cash))+kv("其他净资产 · 期初底稿及新增投资成本",amt(nav.otherAssets))+kv("海岚智造剩余持仓估值",amt(nav.pos.mark))+kv("项目退出应收",amt(nav.receivable))+kv("减：尚未支付的分配",amt(nav.unpaid))+kv("基金净资产",amt(nav.total))+kv("演示协议权益比例",weights[i]*100+"%")+'<h3>计算现金流 · 万元</h3>'+table(["发生日","类型","金额","凭证 / 来源"],a.dated.map(f=>tr([esc(f.date),esc(f.label),money(f.amount),esc(f.proof)])))+(snapshot?"":'<div class="actions">'+cmd("markSource","查看采用的估值记录","btn")+cmd("exit","查看分配实付","btn","E06")+(cc().locked?cmd("archiveLP","归档当前底稿","btn primary",String(i)):cmd("nav","进入季度结账","btn","close/versions"))+'</div>'));
}
function performanceTable(){
 return '<div class="tools"><span class="dim">产业基金一期 · 按 LP 实缴、实收付款及期末权益计算</span></div>'+table(["出资人","已实缴（万元）","已实收（万元）","DPI","TVPI","年化 IRR"],lpNames.map((name,i)=>{const a=lpAccount(i);return tr([name,money(a.capital),money(a.distributions),a.dpi.toFixed(4)+"×",a.tvpi.toFixed(4)+"×",a.irr==null?"历史流水待补":(a.irr*100).toFixed(2)+"%"],"lpMetrics",String(i))}));
}

