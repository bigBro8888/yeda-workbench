"use strict";

const analysisSelection = {company:"", report:"", metric:"本年累计营业收入", statement:"利润表"};
const analysisStatements = {
 利润表:[["营业收入","本年累计营业收入"],["营业成本","当年累计营业成本"],["毛利","本年累计毛利"],["毛利率","毛利率","%"],["研发费用","当年累计研发费用"],["净利润","本年累计净利润"],["净利率","净利率","%"]],
 资产负债表:[["总资产","总资产"],["货币资金","货币资金"],["流动资产","流动资产"],["总负债","总负债"],["流动负债","流动负债"],["短期借款","短期借款"],["所有者权益","所有者权益"],["资产负债率","资产负债率","%"]],
 现金流量表:[["销售商品、提供劳务收到的现金","销售商品、提供劳务收到的现金"],["购买商品、接受劳务支付的现金","购买商品、接受劳务支付的现金"],["经营活动现金流净额","经营性现金流净额"]]
};
const analysisKPIs=[["营业收入","本年累计营业收入"],["净利润","本年累计净利润"],["经营现金流","经营性现金流净额"],["资产负债率","资产负债率","%"]];
const analysisFmt=new Intl.NumberFormat("zh-CN",{maximumFractionDigits:2});
function analysisSample(){
 const records=[
  [2022,10380,2630,920,780,13040,5760,2060],[2023,11750,2980,1040,1120,14500,6460,2340],
  [2024,13260,3480,1190,1360,15860,6720,2670],[2025,14820,3940,1320,1070,17400,7020,2890]
 ].map(([year,sales,gross,profit,cash,assets,debt,money])=>({
  id:"sample-"+year,年度:String(year),报表类型:"年度报表",期间:"全年",报表期间:year+"年 全年",币种:"人民币",
  本年累计营业收入:sales,当年累计营业成本:sales-gross,本年累计毛利:gross,本年累计净利润:profit,
  经营性现金流净额:cash,总资产:assets,总负债:debt,货币资金:money,所有者权益:assets-debt
 }));
 return {key:"analysis-sample",name:"蓝川精工（演示样本）",kind:"演示样本",records,publications:[],sample:true};
}
function analysisCompanies(){
 const groupsByKey=new Map(),codesByName=new Map();
 const inputs=[
  ...db.直投项目管理.map(r=>({owner:r.id,name:r.企业全称||r.项目名称,code:r.股票代码,kind:"投资项目"})),
  ...db.股票列表.map(r=>({owner:r.id,name:r.企业名称||r.股票名称,code:r.股票代码,kind:"持仓企业"})),
  ...(db.settings.disclosures||[]).map(doc=>({doc,name:doc.issuer,code:doc.code,kind:"公开披露"}))
 ].filter(item=>item.name||item.code);
 for(const item of inputs){
  item.name=String(item.name||item.code).trim();item.code=String(item.code||"").trim().toUpperCase();
  if(item.code){if(!codesByName.has(item.name))codesByName.set(item.name,new Set());codesByName.get(item.name).add(item.code)}
 }
 for(const item of inputs){
  const codes=codesByName.get(item.name),code=item.code||(codes?.size===1?[...codes][0]:"");
  const key=code?"code:"+code:"name:"+item.name;
  if(!groupsByKey.has(key))groupsByKey.set(key,{key,name:item.name,code,kind:item.kind,owner:item.owner||"filing-"+code,records:[],publications:[]});
  const company=groupsByKey.get(key);
  if(item.doc)company.publications.push(item.doc);
  else for(const row of db.notes[item.owner]?.财务情况||[])company.records.push({...row,owner:item.owner,origin:item.kind});
 }
 // A company discovered from filings can later gain a project or a holding.
 for(const c of groupsByKey.values())if(c.code){
  const owner="filing-"+c.code;
  for(const row of db.notes[owner]?.财务情况||[])c.records.push({...row,owner,origin:"披露底稿"});
 }
 const companies=[...groupsByKey.values()];
 if(!team)companies.unshift(analysisSample());
 return companies;
}
function analysisValue(row,key){
 if(!row)return null;
 const raw=row[key];
 if(raw!=null&&String(raw).trim()!==""){const n=Number(raw);return Number.isFinite(n)?n:null}
 const calc={"毛利率":["本年累计毛利","本年累计营业收入"],"净利率":["本年累计净利润","本年累计营业收入"],"资产负债率":["总负债","总资产"]}[key];
 if(!calc)return null;
 const a=analysisValue(row,calc[0]),b=analysisValue(row,calc[1]);
 return a!==null&&b>0?100*a/b:null;
}
function analysisPeriod(row){return row.报表期间||[row.年度,row.期间].filter(Boolean).join("年 ")}
function analysisOrder(row){
 const i=periodOptions[row.报表类型]?.indexOf(row.期间)??-1;
 const month=({"年度报表":12,"半年度报表":6,"季度报表":3,"月度报表":1}[row.报表类型]||0)*(i+1);
 return Number(row.年度)*100+month;
}
function matchingSeries(row,other){
 return row.币种 && row.币种===other.币种 && row.报表类型===other.报表类型 && row.期间===other.期间;
}
function analysisContext(){
 const companies=analysisCompanies();
 const company=companies.find(c=>c.key===analysisSelection.company)||companies[0];
 if(!company)return {companies};
 const rows=company.records.slice().sort((a,b)=>analysisOrder(b)-analysisOrder(a)||String(b.填写时间||"").localeCompare(String(a.填写时间||"")));
 const row=rows.find(r=>r.id===analysisSelection.report)||rows[0];
 const peers=row?rows.filter(r=>matchingSeries(row,r)&&Number(r.年度)===Number(row.年度)-1):[];
 return {companies,company,rows,row,prior:peers.length===1?peers[0]:null,ambiguous:peers.length>1};
}
function analysisChange(current,prior,unit){
 if(current===null||prior===null)return "—";
 if(unit==="%"){const d=current-prior;return (d>0?"+":"")+analysisFmt.format(d)+" 个百分点"}
 if(prior<=0)return "同期 "+analysisFmt.format(prior);
 const d=100*(current-prior)/prior;return (d>0?"+":"")+analysisFmt.format(d)+"%";
}
function analysisSelect(label,action,options,selected){
 return '<label>'+label+'<select data-analysis="'+action+'">'+options.map(([key,name])=>'<option value="'+esc(key)+'" '+(key===selected?"selected":"")+'>'+esc(name)+'</option>').join("")+'</select></label>';
}
function statementTrend(rows,row){
 const selected=analysisSelection.metric,caption=analysisKPIs.find(([,k])=>k===selected);
 const series=rows.filter(r=>matchingSeries(row,r)&&Number(r.年度)<=Number(row.年度));
 const years=[...new Set(series.map(r=>Number(r.年度)))].sort((a,b)=>a-b).slice(-5);
 const points=years.map(y=>{
  const reports=series.filter(r=>Number(r.年度)===y);
  return {y,n:reports.length===1?analysisValue(reports[0],selected):null};
 });
 const max=Math.max(1,...points.map(p=>Math.abs(p.n||0)));
 const bars=points.map(({y,n})=>{
  const width=n===null?0:Math.abs(n)*50/max;
  return '<div class="trendRow"><span>'+esc(y)+'年</span><div class="trendTrack"><i style="left:'+(n<0?50-width:50)+'%;width:'+width+'%"></i></div><b>'+(n===null?"—":analysisFmt.format(n))+'</b></div>';
 }).join("");
 return panel('<div class="analysisBar"><h2>历年同期趋势</h2>'+analysisSelect("指标","metric",analysisKPIs.map(([n,k])=>[k,n]),selected)+'</div><p class="analysisNote">'+esc(row.期间)+' · '+esc(caption[2]||"万元")+' · 中线为零</p>'+bars+(points.length<2?'<small>录入更多同口径期间后可查看趋势。</small>':""),"analysisTrend");
}
function analysisFindings(row,prior){
 const observations=[];
 const rev=analysisValue(row,"本年累计营业收入"),old=analysisValue(prior,"本年累计营业收入");
 if(rev!==null&&old>0)observations.push(["收入变化","营业收入同比 "+analysisChange(rev,old)+"。"]);
 const cash=analysisValue(row,"经营性现金流净额"),profit=analysisValue(row,"本年累计净利润");
 if(cash!==null&&profit>0)observations.push(["盈利与现金","经营现金流净额"+(cash<profit?"低于":cash>profit?"高于":"等于")+"净利润，净现比为 "+analysisFmt.format(cash/profit)+" 倍。"]);
 else if(cash!==null&&profit!==null)observations.push(["盈利与现金","本期净利润 "+analysisFmt.format(profit)+" 万元，经营现金流净额 "+analysisFmt.format(cash)+" 万元。"]);
 const debt=analysisValue(row,"资产负债率"),prev=analysisValue(prior,"资产负债率");
 if(debt!==null)observations.push(["杠杆水平","期末资产负债率 "+analysisFmt.format(debt)+"%"+(prev===null?"。":"，同比变动 "+analysisChange(debt,prev,"%")+"。")]);
 return panel('<h2>经营观察</h2>'+(observations.length?'<dl class="observationList">'+observations.map(([label,text])=>'<div><dt>'+label+'</dt><dd>'+text+'</dd></div>').join("")+'</dl>':'<p>已有指标不足以形成观察，请补充收入、利润、现金流或资产负债数据。</p>'));
}
function statementSources(c,row){
 const files=row?.files||[];
 const recorded=row?'<div class="analysisSource"><strong>'+esc(analysisPeriod(row))+'</strong> · '+esc(c.sample?"内置演示底稿":(row.origin||c.kind)+"财务记录")+' '+(row.填写时间?esc(row.填写时间):"")+'<div>'+files.map(f=>btn(f.name,"download",f.id,"link")).join("")+btn("查看指标底稿","analysisSheet","","link")+'</div></div>':"";
 const pubs=c.publications.slice().sort((a,b)=>String(b.day).localeCompare(String(a.day)));
 return panel('<h2>资料来源</h2>'+recorded+(pubs.length?'<h3>公司公开披露</h3>'+table(["披露日期","公告原文","来源"],pubs.map(p=>[esc(p.day),safeLink(p.link,p.title),esc(p.source)])):(!row?'<p>尚无原件或公告索引。</p>':"")));
}
function analysisTable(ctx){
 const lines=analysisStatements[analysisSelection.statement];
 const rows=lines.map(([n,k,u])=>{const v=analysisValue(ctx.row,k),p=analysisValue(ctx.prior,k);return [n,u||"万元",v===null?"—":analysisFmt.format(v),p===null?"—":analysisFmt.format(p),analysisChange(v,p,u)]});
 return panel('<div class="analysisBar"><h2>三表指标</h2><div class="scopeSwitch" role="group" aria-label="报表类型">'+Object.keys(analysisStatements).map(s=>'<button data-a="analysisTab" data-v="'+s+'" aria-pressed="'+(analysisSelection.statement===s)+'">'+s+'</button>').join("")+'</div></div>'+table(["指标","单位","本期","上年同期","同比变化"],rows)+'<p class="analysisNote">金额按原报表币种列示。同期为零或负数时显示同期值，比例变化按百分点计算。</p>');
}
function statementAnalysis(){
 const ctx=analysisContext(),{companies,company:c,row,rows,prior}=ctx;
 const heading='<div class="analysisBar"><h1>财报分析</h1>'+btn("股票列表","nav","股票列表")+'</div>';
 if(!c)return panel(heading+'<div class="analysisBlank"><h3>选择分析主体</h3><p>先添加持仓企业或投资项目，也可以通过披露采集导入公司公告索引。</p>'+btn("管理股票","nav","股票列表","primary")+btn("查看项目","nav","直投项目管理")+'</div>');
 const filter=analysisSelect("分析主体","company",companies.map(x=>[x.key,x.name+(x.code?" · "+x.code:"")]),c.key)+(row?analysisSelect("报告期","report",rows.map(r=>[r.id,analysisPeriod(r)+" · "+(r.币种||"未注明币种")+(r.origin?" · "+r.origin:"")]),row.id):"");
 const actions=(writable()&&!c.sample?btn("录入财报","analysisAdd","","primary"):"")+(row?btn("导出指标","analysisExport"):"");
 const head=panel(heading+'<div class="analysisControls">'+filter+'<div>'+actions+'</div></div>');
 if(!row)return head+panel('<h2>'+esc(c.name)+'</h2><p>尚无已录入的财务指标。可从财报原件录入或识别指标，保存后生成分析。</p>')+statementSources(c);
 const meta=esc(analysisPeriod(row))+' · '+esc(row.币种||"未注明币种")+' · 金额单位为万元';
 const compare=prior?"对比 "+analysisPeriod(prior):ctx.ambiguous?"同期存在多份底稿，暂不计算同比":"暂无同币种、同期间的上年报表";
 const kpis=analysisKPIs.map(([n,k,u])=>{const value=analysisValue(row,k);return '<div><span>'+n+'</span><strong>'+(value===null?"—":analysisFmt.format(value)+(u||""))+'</strong><small>同比　'+analysisChange(value,analysisValue(prior,k),u)+'</small></div>'}).join("");
 return head+'<section class="analysisSummary"><div><span>'+esc(c.kind)+'</span><h2>'+esc(c.name)+'</h2><p>'+meta+'</p><p>'+esc(compare)+'</p></div><div class="statementKpis">'+kpis+'</div></section><div class="analysisColumns">'+statementTrend(rows,row)+analysisFindings(row,prior)+'</div>'+analysisTable(ctx)+statementSources(c,row);
}
document.addEventListener("change",e=>{
 const action=e.target.dataset.analysis;if(!action)return;
 analysisSelection[action]=e.target.value;if(action==="company")analysisSelection.report="";
 render();document.querySelector('[data-analysis="'+action+'"]')?.focus({preventScroll:true});
});
document.addEventListener("click",e=>{
 const button=e.target.closest("[data-a]");if(!button||!button.dataset.a.startsWith("analysis"))return;
 const {company:c,row,prior}=analysisContext();if(!c)return;
 switch(button.dataset.a){
 case "analysisTab":analysisSelection.statement=button.dataset.v;render();document.querySelector('[data-a=analysisTab][aria-pressed=true]')?.focus({preventScroll:true});break;
 case "analysisAdd":if(writable()&&!c.sample)financeEditor({},c.owner);break;
 case "analysisEdit":if(row&&writable()&&!c.sample)financeEditor(row,row.owner);break;
 case "analysisSheet":if(row)modal("财报指标底稿",'<h3>'+esc(c.name)+'</h3>'+kv(row,["报表类型","报表期间","币种",...financialMetrics.filter(k=>row[k]!=null&&row[k]!==""),"填写人","填写时间"])+(c.sample?'<p>本底稿为虚构演示数据。</p>':writable()?btn("编辑底稿","analysisEdit"):""));break;
 case "analysisExport":
  if(row)csvFile(c.name+"-"+analysisPeriod(row)+"-财报指标",["分析主体","报告期","币种","上年同期","报表","指标","单位","本期值","同期值","同比变化","来源"],Object.entries(analysisStatements).flatMap(([tab,lines])=>lines.map(([n,k,u])=>{
   const value=analysisValue(row,k),old=analysisValue(prior,k);
   return [c.name,analysisPeriod(row),row.币种,prior?analysisPeriod(prior):"",tab,n,u||"万元",value??"",old??"",analysisChange(value,old,u),c.sample?"内置演示底稿":row.origin];
  })));break;
 }
});
