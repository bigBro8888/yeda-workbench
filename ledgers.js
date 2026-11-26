"use strict";
const ledgerLayout={
 自管基金台账报表:[
 ["基金名称"],["基础信息","类型 基金编号 级次 上级基金"],["管理人","基金管理人名称 基金管理人登记编号"],["托管人","基金托管人"],["合伙人","普通合伙人 有限合伙人"],["设立时间","工商登记时间 成立时间 备案时间"],["投资方向","投资领域 是否修订协议"],["存续期","存续期 投资期 退出期 延长期 投资期到期日 退出期到期日 延长期到期日 运行期间 是否修订协议"],["管理费","投资期 退出期 投资期基准 退出期基准 计提期间 是否修订协议"],["托管费"],["执行事务服务费"],["业绩奖励比例","门槛收益率 超额收益分配比率"],["返投","返投要求 达成情况"],["出资情况","认缴金额 实缴金额 剩余额度"],["累计投资情况（含参投子基金及直投项目）","投资数量(个) 投资金额（万元）"],["投资子基金概况","投资子基金数量 投资子基金金额 完全退出子基金数量 完全退出子基金金额 部分退出子基金数量 部分退出子基金金额"],["投资项目概况","投资数量(个) 投资金额（万元） 完全退出项目数量（个） 完全退出项目金额（万元） 部分退出项目数量（个） 部分退出项目金额（万元）"],["已投项目IPO项目情况","IPO项目数 IPO项目持有股份权益市值（万元） IPO项目持有股份权益市值计算日期"],["收益情况","项目分红（万元） 基金累计收回金额 未兑现公允价值（万元） 项目现金回报倍数 基金已分配收益（万元） 基金已投项目估值（万元） 基金DPI 基金投资收益倍数（Gross~MOIC） 基金总内部收益率（Gross~IRR） 基金总内部净收益率（Net~IRR）"],["清算","清算时间 基金总体退出金额（万） 收回本金时间"],["备注"]],
 参股基金台账报表:[
 ["基金名称"],["参股基金类型","层级 上一级基金名称 市场化基金/常州国资基金"],["实缴认缴","基金认缴 其中：金控集团认缴 基金实缴 其中：金控集团实缴"],["分配情况","累计向出资人分配金额 其中：向金控集团分配金额（含清算回款）"],["基金估值","基金估值（等于：所投项目估值之和+账上货币资金、金融资产+分配金额） 对应钟金控权益估值和回款"],["收益情况","MOIC DPI"],["投资项目信息","项目序号 被投资企业名称 项目/子基金 被投资企业性质 项目来源"],["项目所在地","被投资企业注册地 详细地址 在江苏省内是否有实际经营业务的分/子公司"],["项目所属行业","门类 大类"],["投资情况","首次投资时间 投资次数 本基金累计投资金额 本基金累计投资金额所占股权比例（%）"],["退出情况","退出状态（未退出/部分退出/全部退出） 退出方式（上市减持、回购、股权转让、清算等） 退出金额"],["剩余在投情况","剩余在投成本 剩余持股比例/稀释后持股比例（%） 最新估值（万元） 在投成本对应估值"],["收益情况","分红、补偿等其他回收金额 回收总金额 项目盈亏情况（万元） 项目收益倍数F=（C+E）/A MOIC DPI"],["荣誉奖项"],["上市情况","项目阶段（种子/成长/成熟) 是否IPO 上市板块 上市进展"],["经营状况","企业目前经营状态（正常/停业/破产） 当年营业收入（万元） 当年净利润（万元） 数据类型（毛估/财报/审定）"]],
 项目台账报表:[
 ["被投资企业名称"],["基本信息","项目负责人 被投资企业性质 企业目前经营状态"],["注册地","被投资企业注册地 在江苏省内是否有实际经营业务的分/子公司"],["行业分类","项目所属行业门类 项目所属行业大类"],["投资情况","投资主体 投资时间 投资轮次 投资方式 项目所属阶段 投前估值(万元) 投后估值(万元) 初始持股比例 初始投资金额(万元)(A)"],["协议条款","是否有董事会席位 投资角色 该轮共同投资者 其他投资者投资金额 是否有回购条款 初始回购条款内容 条款变更类型 最新回购条款内容 条款触发预警"],["退出情况","退出状态 退出方式 退出金额(B) 分红、补偿等其他回收金额(D)(万元) 回收总金额E=B+D"],["在手情况","项目最新估值(万元) 估值增值% 剩余/稀释后持股比例 剩余在投成本 在投成本对应估值(C) 在投部分增值(万元)"],["收益情况","项目盈亏情况C+E-A MOIC[F=(C+E)/A] DPI[E/A]"],["营业收入（万元）","[当前年份-3]年 [当前年份-2]年 [当前年份-1]年 去年同期 本年累计 同比增长"],["净利润（万元）","[当前年份-3]年 [当前年份-2]年 [当前年份-1]年 同比增长"],["上市情况","是否上市 上市板块 股票代码 上市进展"],["荣誉奖项"],["纳税情况","去年(万元) 区内部分 本年(万元) 区内部分"],["就业情况","去年底就业(人) 区内部分 本年就业(人) 区内部分"],["招投联动","招商项目 落地形态 区内项目 财务投资项目 与我方同轮次的其他方投资额合计 后续融资多少(我方投资之后其他方投资额合计)"]]
};
function ledgerSchema() {
 return ledgerLayout[page].map(([label,columns])=>({label,children:columns?.split(" ").map(s=>s.replaceAll("~"," "))||[]}));
}
function annualFinancials(r,notes){
 const year=new Date().getFullYear(),fin=(notes.财务情况||[]).filter(x=>x.币种==="人民币");
 const endMonth=x=>x.报表类型==="月度报表"?parseInt(x.期间):x.报表类型==="季度报表"?(periodOptions.季度报表.indexOf(x.期间)+1)*3:x.期间==="上半年"?6:12;
 const latest=y=>fin.filter(x=>Number(x.年度)===y).sort((a,b)=>endMonth(b)-endMonth(a)||String(b.填写时间).localeCompare(String(a.填写时间)))[0];
 const set=(g,k,v)=>{r[g+" / "+k]=v};
 const now=latest(year),last=latest(year-1),prior=fin.find(x=>Number(x.年度)===year-1&&x.报表类型===now?.报表类型&&x.期间===now?.期间);
 for(const [group,key] of [["营业收入（万元）","本年累计营业收入"],["净利润（万元）","本年累计净利润"]]){
  for(let i=1;i<=3;i++)set(group,"[当前年份-"+i+"]年",latest(year-i)?.[key]);
  set(group,"去年同期",prior?.[key]);set(group,"本年累计",now?.[key]);
  if(now?.[key]!==""&&now?.[key]!=null&&Number(prior?.[key])!==0&&prior?.[key])set(group,"同比增长",((now[key]-prior[key])/Math.abs(prior[key])*100).toFixed(2)+"%");
 }
 for(const [g,k,local,previous,current] of [["纳税情况","缴纳税费","其中区内缴纳税费","去年(万元)","本年(万元)"],["就业情况","就业人数","其中区内就业人数","去年底就业(人)","本年就业(人)"]]){
  set(g,previous,last?.[k]);set(g,current,now?.[k]);set(g,"区内部分",last?.[local]);set(g,"区内部分#2",now?.[local]);
 }
}
function ledgerRows(){
 return db[reportSource[page]].flatMap(source=>{
  const notes=db.notes[source.id]||{},projects=notes.已投项目信息||[],subs=notes.已投子基金信息||[];
  const r={...source,sourceId:source.id,类型:source.基金类型,级次:source.基金级别,层级:source.基金级别,基金管理人名称:source.基金管理人,认缴金额:source.基金认缴规模,实缴金额:source.基金实缴规模,基金认缴:source.基金认缴规模,基金实缴:source.基金实缴规模,
   "其中：金控集团认缴":ownAmount(source,"认缴"),"其中：金控集团实缴":ownAmount(source,"实缴"),"投资子基金数量":subs.length,"投资项目概况 / 投资数量(个)":projects.length,"投资项目概况 / 投资金额（万元）":total(projects,"累计已投金额（万元）"),"累计投资情况（含参投子基金及直投项目） / 投资数量(个)":projects.length+subs.length,
   累计向出资人分配金额:total(notes.基金分配||[],"本期分配总金额（万元）"),被投资企业名称:source.企业全称,项目负责人:source.项目经理,投资主体:source.出资主体,投资时间:source.首次出资日期,项目所属阶段:source.项目状态,"投前估值(万元)":source.投前估值,"投后估值(万元)":source.投后估值,"初始投资金额(万元)(A)":source.初始投资金额};
  if(page==="项目台账报表"){annualFinancials(r,notes);r["项目最新估值(万元)"]=[...(notes.项目估值||[])].sort((a,b)=>String(b.估值基准日).localeCompare(String(a.估值基准日)))[0]?.["最新整体估值（万元）"];r["回收总金额E=B+D"]=total(notes.项目回收款||[],"金额(万元)")}
  if(page==="参股基金台账报表"&&(projects.length||subs.length))return [...projects.map(p=>[p,"项目"]),...subs.map(f=>[f,"子基金"])].map(([child,type],i)=>({...r,id:child.id,"项目/子基金":type,项目序号:i+1,被投资企业名称:child.项目名称||child.基金名称, "收益情况#2 / MOIC":child.MOIC,"收益情况#2 / DPI":child.DPI,首次投资时间:child.首次出资日期,本基金累计投资金额:child["累计已投金额（万元）"],退出金额:child["累计已退出金额（万元）"],"最新估值（万元）":child["最新估值（万元）"]}));
  return [r];
 });
}
function ledgerColumns(schema){
 const used=new Map();
 return schema.flatMap(({label,children})=>{
  const occurrence=(used.get(label)||0)+1;used.set(label,occurrence);
  const prefix=label+(occurrence>1?"#"+occurrence:""),seen=new Map();
  return (children.length?children:[label]).map(child=>{const n=(seen.get(child)||0)+1;seen.set(child,n);const key=children.length?prefix+" / "+child+(n>1?"#"+n:""):label;return {key,label:child,group:label}});
 });
}
function ledgerValue(row,col){return Object.hasOwn(row,col.key)?row[col.key]:row[col.label]}
function ledgerPage(){
 const rows=visibleRows(),schema=ledgerSchema(),cols=ledgerColumns(schema);number=Math.min(number,Math.max(1,Math.ceil(rows.length/size)));
 const head='<tr><th rowspan="2">序号</th>'+schema.map(g=>'<th '+(g.children.length?'colspan="'+g.children.length+'"':'rowspan="2"')+'>'+esc(g.label)+'</th>').join("")+'</tr><tr>'+schema.flatMap(g=>g.children.map(k=>'<th>'+esc(k)+'</th>')).join("")+'</tr>';
 const start=(number-1)*size;
 return toolbar()+panel('<div class="tablewrap ledger"><table><thead>'+head+'</thead><tbody>'+rows.slice(start,start+size).map((r,i)=>'<tr><td>'+(start+i+1)+'</td>'+cols.map((c,j)=>'<td>'+(j===0?btn(first(ledgerValue(r,c)),"ledgerSource",r.sourceId,"link"):esc(first(ledgerValue(r,c))))+'</td>').join("")+'</tr>').join("")+'</tbody></table>'+(!rows.length?'<div class="empty">暂无数据</div>':'')+'</div>'+pager(rows.length));
}
