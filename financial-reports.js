"use strict";

const iaReportTerms=/财报|财务报(?:表|告)|经营报表|审计报告|(?:公司|企业|年度|半年|季度)(?:年报|季报)|年报|营业收入|营业成本|营收|毛利率/;
function iaFinancialIntent(q,previous){
 if(iaReportTerms.test(q))return true;
 return previous?.plan?.includes("financials")&&/^(?:那|再看|换成|查下|看看)?(?:今年|本年|去年|上年|前年|20\d{2}年?)(?:的呢|的|呢)?[？?。]?$|^(?:查看这份报表的依据|查看依据|依据是什么|重新分析|再查一次)[？?。]?$/.test(q);
}
function iaFinancialYear(q,last){
 const current=new Date().getFullYear();
 const years=new Set([...q.matchAll(/20\d{2}/g)].map(m=>Number(m[0])));
 for(const [re,n] of [[/今年|本年|本年度/,current],[/去年|上年/,current-1],[/前年/,current-2]])if(re.test(q))years.add(n);
 if(years.size>1||/近[两三四五\d]+年|过去.*年|同比|环比|上个月|本月|按月|季度|Q[1-4]|半年/i.test(q))throw Error("请指定一个报告年度，例如“统计清源膜材 2026 年财报”。年度查询会列出该年的各期报送。");
 return [...years][0]??last?.reportYear??current;
}
function iaHasAmount(n){return typeof n==="number"&&Number.isFinite(n)}
async function iaFinancialAnswer(q,previous,fund){
 const last=previous?.plan?.includes("financials")?previous:null;
 if(last&&/^(?:查看这份报表的依据|查看依据|依据是什么)[？?。]?$/.test(q)){
  return {company:last.company,reportProject:last.reportProject,reportYear:last.reportYear,scope:last.scope,plan:["financials"],engine:"引用上轮底稿",notes:["以下是上轮财报统计使用的记录和来源。"],tables:last.tables};
 }
 const yr=iaFinancialYear(q,last),explicit=db.projects.filter(p=>q.includes(p.name));
 if(new Set(explicit.map(p=>p.name)).size>1)throw Error("请指定一家企业，例如“统计海岚智造今年的财报”。");
 const linked=getProject(iwProject(iwCurrentProject())?.record);
 const candidates=explicit.length?explicit:[getProject(last?.reportProject)||linked].filter(Boolean);
 const project=candidates.find(p=>fund==="-1"||String(p.fund)===fund);
 if(!project)throw Error(candidates.length?"该企业不在当前基金范围内，请选择对应基金或全部基金。":"要统计哪家企业？请输入“企业名称＋年度＋财报”，也可以从已关联投资档案的项目发起查询。");
 const scope=project.name+" · "+yr+" 年财报",yearMatch=s=>String(s||"").match(/(?:^|\D)(20\d{2})(?!\d)/)?.[1]===String(yr);
 const reports=db.tasks.filter(t=>t.company===project.name&&t.fund===project.fund&&yearMatch(t.q)).sort((a,b)=>a.q.localeCompare(b.q,"zh-CN"));
 const confirmed=reports.filter(t=>t.status==="已确认");
 const notes=[scope+"：经营报送 "+reports.length+" 条，其中已确认 "+confirmed.length+" 条。"];
 const rows=reports.map(t=>{
  const verified=t.status==="已确认",rev=verified&&iaHasAmount(t.rev),cost=verified&&iaHasAmount(t.cost);
  return iaRow([t.q,t.status,rev?money(t.rev):"—",cost?money(t.cost):"—",rev&&cost&&t.rev>0?((t.rev-t.cost)/t.rev*100).toFixed(1)+"%":"—",t.id+" · V"+t.v],"task",t.id);
 });
 const tables=[];
 if(rows.length)tables.push(iaTable("经营报送及指标（万元）",["报告期间","复核状态","营业收入","营业成本","毛利率","来源版本"],rows));
 for(const t of confirmed){
  if(iaHasAmount(t.rev)&&iaHasAmount(t.cost))notes.push(t.q+" 已确认营业收入 "+money(t.rev)+" 万元，营业成本 "+money(t.cost)+" 万元。");
 }
 if(!confirmed.length)notes.push("该年度暂无已确认的经营指标，营业收入、营业成本和毛利率待补。可从企业回传和公开财报核对报告期间与原件。");
 else notes.push("指标按原报送期间列示。季度数据不折算为全年业绩。");
 const refs=[];
 try{
  const data=await ddApi("workspace",{project:project.id});
  for(const r of data.records||[])if(r.role==="标的企业"&&yearMatch(r.period))
   refs.push(iaRow([r.period,r.title,r.source,r.hasFile?"PDF 已归档":r.pages?"已归档网页正文":"仅公告索引"],"nav",ddUrl(project.id,"reports")));
  for(const t of data.tasks||[])if(t.company===project.name&&yearMatch(t.period)&&iaReportTerms.test(t.title))
   refs.push(iaRow([t.period,t.title,"企业回传",t.state+" · "+(t.versions?.length||0)+" 个版本"],"nav",ddUrl(project.id,"requests")));
  notes.push("该年度匹配到 "+refs.length+" 条公开披露或企业回传资料记录。");
 }catch{notes.push("本次未读取到本机尽调服务的披露及回传记录，其收集状态待核实。")}
 const spaces=new Set(iw.projects.filter(s=>s.record===project.id).map(s=>s.id));
 try{
  const docs=await iwStore("readonly",s=>s.getAll());
  for(const d of docs){
   const title=[d.name,d.file?.name].filter(Boolean).join(" ");
   if(spaces.has(d.project)&&iaReportTerms.test(title)&&yearMatch(title))refs.push(iaRow([String(yr),d.name,"项目资料",d.file?"附件待核验":"笔记待核验"],"iaWorkspaceDocView",d.id));
  }
 }catch{notes.push("当前浏览器的项目资料库暂不可用。")}
 if(refs.length)tables.push(iaTable("财报资料与来源",["报告期间","资料名称","来源","材料状态"],refs));
 return {plan:["financials"],engine:"项目财报台账",company:project.name,reportYear:yr,reportProject:project.id,scope,notes,tables};
}
