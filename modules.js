const intro={A:"组织岗位、授权资料与审批记录",B:"从项目储备、立项审批到交割跟踪",C:"季度报送、企业经营指标与风险跟踪",D:"基金档案、出资人缴款与到账核销",E:"退出回款、估值复核与收益分配",F:"现金流、投资回报与底层持仓",G:"经营数据、报告编制与版本追溯",todo:"按业务事项进入办理，处理结果同步至对应台账"};
const field=(key,label,type="text",val="",props="")=>'<label>'+esc(label)+'<input name="'+key+'" type="'+type+'" value="'+esc(val)+'" '+props+'></label>';
const form=(act,body,label,id="")=>'<form data-form="'+act+'" data-id="'+esc(id)+'">'+body+'<p class="error" role="alert"></p><div class="actions"><button class="btn primary" type="submit">'+label+'</button></div></form>';
const fundOptions=(f)=>opt(funds.map((x,i)=>[i,x.name]),f);
const formSelect=(key,label,options)=>'<label>'+label+'<select name="'+key+'">'+options+'</select></label>';
const filtered=(rows)=>rows.filter(r=>r.map(String).join(" ").toLowerCase().includes(query.toLowerCase()));
function bookRows(p){
 if(p==="A05")return [...db.audit,...by[p].rows];
 if(p==="D06")return db.cashlog.map(x=>[x.amount>0?"出资实缴":"实缴冲销","BK-901",money(x.amount)+" 万元",x.date]);
 if(p==="D04")return [["BK-901","甲出资人","100 万元",db.paid===100?"已核销":db.paid?"部分核销":"待认领"]];
 if(p==="D03")return [["甲出资人","180 万元","2026-09-15",db.paid?"部分到账":"已发通知"]];
 if(p==="D02")return lpNames.map((name,i)=>[name,money(funds[0].cap*10000*weights[i]),money(lpAccount(i).capital),"万元"]);
 if(p==="C05")return db.tasks.filter(t=>t.status==="已确认").flatMap(t=>[["营业收入",money(t.rev),"万元",t.company+" "+t.q+" V"+t.v],["毛利率",t.rev?((1-t.cost/t.rev)*100).toFixed(1):"收入为零","%",t.company+" "+t.q+" V"+t.v]]);
 if(p==="B03")return [...by[p].rows,...db.projects.filter(x=>x.stage==="尽职调查").map(x=>["综合",x.name+" 尽调资料",x.owner,"待提交"])];
 return by[p].rows;
}
function section(){
 if(route==="B"&&!page)return investmentDesk();
 let tabs=catalog.filter(x=>x.id[0]===route),p=page||({A:"A01",B:"projects",C:"C02",D:"funds",E:"E01",F:"F03",G:"G03",todo:"todo"})[route];
 let headAction=p==="projects"?cmd("newProject",ico("plus")+"登记项目","btn primary"):["C02","C03","C04"].includes(p)?cmd("dispatch",ico("plus")+"下发报送任务","btn primary"):"";
 let ctl=title(mods[route],intro[route],headAction);
 if(tabs.length)ctl+='<div class="chips">'+(route==="B"||route==="D"?cmd("tab",route==="B"?"项目台账":"基金总览","chip "+(!page?"on":""),""):"")+tabs.map(x=>cmd("tab",esc(x.title),"chip "+(p===x.id?"on":""),x.id)).join("")+'</div>';
 return ctl+'<section class="panel">'+panelHead(by[p]?.title||({"projects":"项目台账","funds":"基金总览","todo":"我的待办"})[p],["projects","funds","todo","B01","B02","B08","D01","A03","G02","C02","C03","C04"].includes(p)?filterSelect():"")+moduleBody(p)+'</section>'
}
function moduleBody(p){
 const operation=operationsPage(p);if(operation!==null)return operation;
 if(p==="todo"||p==="A03")return '<div class="tasklist">'+todoRows(1000)+'</div>';
 if(p==="projects"||p==="B02"||p==="B01"||p==="B08")return searchbar("搜索项目或负责人")+projectTable(selectedProjects().filter(x=>(p!=="B02"||["待立项","待补正","尽职调查"].includes(x.stage))&&[x.name,x.id,x.owner].join(" ").includes(query)));
 if(p==="funds"||p==="D01")return table(["基金名称","认缴规模","累计实缴","已投项目","运行状态"],funds.flatMap((f,i)=>selected({fund:i})?[tr([f.name,f.cap.toFixed(2)+" 亿元",money(f.paid+(i===0?db.paid/10000:0))+" 亿元",db.projects.filter(x=>x.fund===i&&x.stage==="投后管理").length,tag("运作中")],"fund",i)]:[]));
 if(["C02","C03","C04"].includes(p)){
 const tasks=db.tasks.filter(selected);return '<div class="tools"><select id="statusFilter" aria-label="任务状态">'+opt(["","待提交","待复核","待补正","已确认"].map(v=>[v,v||"全部状态"]),statusFilter)+'</select><span class="dim">已确认 '+tasks.filter(t=>t.status==="已确认").length+' / '+tasks.length+' 家次</span></div>'+table(["任务编号","报送企业","期间","截止日期","数据版本","办理状态"],tasks.filter(t=>!statusFilter||t.status===statusFilter).map(t=>tr([esc(t.id),esc(t.company),esc(t.q),esc(t.due),t.v?"V"+t.v:"—",tag(t.status)],"task",t.id)))
 }
 if(p==="D05")return table(["缴款通知","出资人","应缴金额","已核销","剩余应缴","操作"],[tr(["CALL-01","甲出资人","180 万元",money(db.paid)+" 万元",money(180-db.paid)+" 万元",cmd("cash","核销明细","textbtn")])]);
 if(p==="G01")return '<div class="tools">'+cmd("nav","查看集团经营总览","btn primary","overview")+'</div>';
 if(p==="G02")return '<div class="tasklist">'+todoRows(100)+'</div>';
 if(p==="G06")return table(["基金运营报告","编制日","状态"],bench.reports.map(r=>tr([esc(r.name),esc(r.date),tag(r.state)],"fundEdition",r.id)))+block(cmd("nav","查看季度结账报告与凭证快照","btn","close/versions"))+snapshotList()+table(["业务报告","报送期","引用版本","发布状态"],db.reports.map(r=>tr([esc(r.title),esc(r.q),"V"+r.version,tag(r.status)],"report",r.id)));
 if(p==="G03")return '<div class="tools">'+cmd("fundReport","编制基金运营简报","btn",fundFilter==="-1"?0:fundFilter)+(p==="G03"?cmd("reportNew",ico("plus")+"编制报告","btn primary"):"")+'</div>'+table(["报告名称","报送期","引用版本","发布状态"],db.reports.map(r=>tr([esc(r.title),esc(r.q),"V"+r.version,tag(r.status)],"report",r.id)));
 if(p==="F03"||p==="F05")return '<div class="tools">'+cmd("calc","打开"+(p==="F03"?"回报":"持仓")+"试算","btn primary",p)+'</div>'+sampleTable(p);
 return searchbar("搜索当前台账")+sampleTable(p);
}
function searchbar(ph){return '<form class="tools" data-form="filter"><input class="input" name="query" aria-label="'+ph+'" placeholder="'+ph+'" value="'+esc(query)+'"><button class="btn">查询</button>'+(query?cmd("clear","清除","textbtn"):"")+'</form>'}
function sampleTable(p){let rows=bookRows(p);return table(by[p].head,rows.map((r,i)=>filtered([r]).length?tr(r.map(esc),"record",p+":"+i):"").filter(Boolean))}
function newProject(){drawer("登记投资项目",form("newProject",field("name","企业名称","text","","required maxlength=60")+formSelect("fund","拟投基金",fundOptions(fundFilter==="-1"?0:fundFilter))+formSelect("industry","所属行业",opt(["高端装备","数字科技","新材料","新能源"].map(v=>[v,v]),""))+field("amount","拟投金额（万元）","number","","min=0.01 step=0.01 required")+field("owner","项目负责人","text","周宁","required maxlength=30")+field("reason","投资理由","text","","required maxlength=300")+field("risk","主要风险","text","","required maxlength=300"),"提交立项"))}
function companies(f){return db.projects.filter(x=>x.fund===Number(f)&&x.stage==="投后管理").map(p=>'<label class="check"><input type="checkbox" name="company" value="'+esc(p.name)+'" checked>'+esc(p.name)+'</label>').join("")}
function dispatch(){let f=fundFilter==="-1"?0:Number(fundFilter);drawer("下发季度报送任务",form("dispatch",formSelect("fund","所属基金",fundOptions(f))+formSelect("q","报送期间",opt(["2026 Q3","2026 Q4"].map(x=>[x,x]),"2026 Q4"))+field("due","截止日期","date","2027-01-15","required")+kv("采集模板","季度经营报送 V2")+'<h3>应报企业</h3><div id="companies">'+companies(f)+'</div>',"确认下发"))}
function task(id){const t=db.tasks.find(x=>x.id===id),editable=["待提交","待补正"].includes(t.status);let body=tag(t.status)+kv("任务编号",id)+kv("报送企业",t.company)+kv("期间 / 截止日",t.q+" / "+t.due);
 if(editable)body+=form("submitTask",field("rev","营业收入（万元）","number",t.rev??"","min=0 step=0.01 required")+field("cost","营业成本（万元）","number",t.cost??"","min=0 step=0.01 required")+extraFields(t)+field("file","佐证附件（演示仅保存文件名）","file")+ (t.file?kv("上次附件",t.file):""),"提交复核",id);
 else body+=kv("营业收入",money(t.rev)+" 万元")+kv("营业成本",money(t.cost)+" 万元")+kv("佐证附件",t.file||"未附")+kv("数据版本","V"+t.v);
 if(!editable)body+=kv(taskRule(t).label,actualMeasure(t)==null?"待补录 / 不适用":money(actualMeasure(t))+" "+taskRule(t).unit);
 if(t.status==="待复核"&&!externalCompany)body+=form("reviewTask",formSelect("decision","复核结果",opt([["pass","确认数据"],["return","退回补正"]],"pass"))+field("note","复核意见（退回时必填）","text","","maxlength=300"),"提交复核结果",id);
 if(t.versions?.length)body+='<h3>历史提交</h3>'+t.versions.map(v=>kv("V"+v.v+" · "+v.file,"收入 "+money(v.rev)+" / 成本 "+money(v.cost)+" 万元")).join("");
 if(editable&&!externalCompany)body+='<div class="actions">'+cmd("remind","记录站内催办","btn",id)+'</div>';
 drawer(t.company+" · 季度报送",body+history(t.history))
}
function cash(){drawer("LP 到账核销",kv("业务依据","产业基金一期 · 甲出资人 · CALL-01 / BK-901")+kv("银行回单金额","100 万元")+kv("已核销",amt(db.paid))+fbEntry("call")+(db.paid>0?fbEntry("reverse"):"")+history(db.cashlog.map(x=>x.date+" · "+amt(x.amount)+" · "+x.note)))}
function reportNew(){const valid=db.tasks.filter(t=>t.status==="已确认");drawer("编制投后报告",valid.length?form("newReport",formSelect("source","引用已确认报送",opt(valid.map(t=>[t.id,t.company+" · "+t.q+" · V"+t.v]),""))+formSelect("type","报告类型",opt([["季度跟踪报告","季度跟踪报告"],["投后简报","投后简报"]],"")),"生成报告草稿"):'<div class="notice">暂无已确认的企业报送。请先复核一份季度经营报表。</div><div class="actions">'+cmd("nav","进入报送复核","btn primary","C/C04")+'</div>')}
function report(id){let r=db.reports.find(x=>x.id===id);drawer(r.title,tag(r.status)+kv("报送企业",r.company)+kv("报告期间",r.q)+kv("营业收入",money(r.rev)+" 万元")+kv("营业成本",money(r.cost)+" 万元")+kv("引用版本",r.source+" · V"+r.version)+kv("来源附件",r.file)+ '<div class="actions">'+cmd("task","查看来源记录","btn",r.source)+(r.status==="草稿"?cmd("publish","复核并发布","btn primary",id):cmd("export","导出报告","btn primary",id))+'</div>')}
function calculate(id){let f=id==="F03";drawer(f?"LP 回报试算":"间接持仓试算",form("calc",(f?field("a","累计实缴（万元）","number","100","min=0.01 required step=any")+field("b","累计实分（万元）","number","30","min=0 required step=any")+field("c","剩余净值（万元）","number","90","min=0 required step=any"):field("a","母基金持有子基金（%）","number","20","min=0 max=100 required step=any")+field("b","子基金持有企业（%）","number","10","min=0 max=100 required step=any")),"计算",id)+'<div id="result" aria-live="polite"></div>')}
function record(key){let [p,i]=key.split(":"),row=bookRows(p)[Number(i)];drawer(by[p].title,by[p].head.map((h,j)=>kv(h,row[j])).join("")+'<h3>关联业务</h3><div class="chips">'+by[p].related.filter(id=>by[id]).map(id=>cmd("nav",esc(by[id].title),"chip",id[0]+"/"+id)).join("")+'</div>')}
function search(term=""){const q=term.trim().toLowerCase(),items=[...menus.map(m=>["nav",m[0],m[1]]),...db.projects.map(p=>["project",p.id,p.name+" · "+p.id]),...catalog.map(x=>["nav",x.id[0]+"/"+x.id,x.id+" · "+x.title])].filter(x=>x[2].toLowerCase().includes(q));return items.slice(0,40).map(([a,id,t])=>cmd(a,esc(t),"searchres",id)).join("")||'<p class="empty">没有匹配记录</p>'}

