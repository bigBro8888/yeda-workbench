"use strict";
const $=s=>document.querySelector(s),esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const storage="yeda.equity.reference.1";let db=team?structuredClone(team.data):JSON.parse(localStorage.getItem(storage)||"null")||seed(),tabs=["首页"],opened=new Set(),page="首页",rid="",group="",sub="",query="",filter="",advanced=false,number=1,size=10,work="我的待办",post=false,formState=null;
const day=()=>new Date().toLocaleDateString("sv-SE"),uid=()=>crypto.randomUUID(),btn=(text,a,v="",cls="")=>'<button type="button" class="'+cls+'" data-a="'+a+'" data-v="'+esc(v)+'">'+esc(text)+'</button>',title=t=>'<h2 class="sectionTitle">'+esc(t)+'</h2>',panel=(t,cls="")=>'<section class="panel '+cls+'">'+t+'</section>',fund=()=>["自管基金","参股基金"].includes(page),proj=()=>page==="直投项目管理",keyfield=()=>fund()?"基金名称":(fields[page]||"名称").split(" ")[0],record=()=>db[page]?.find(r=>r.id===rid),first=(...items)=>items.find(x=>x!==undefined&&x!==null&&x!=="")??"—";
upgradeNotes(db);
async function persist(){if(team)return sharedSave("state",{data:structuredClone(db)});localStorage.setItem(storage,JSON.stringify(db))}
function notice(t){$("#toast").textContent=t;clearTimeout(notice.timer);notice.timer=setTimeout(()=>$("#toast").textContent="",2200)}
let detailMode="",projectView="卡片视图";
function projectDetailMode(){return detailMode||((group!=="文档资料"&&group in projectPostGroups)?"post":"pre")}
function navigate(n,id="",g="",s="",mode=""){const h="#"+[n,id,g,s,...(mode?[mode]:[])].map(encodeURIComponent).join("/");if(h===location.hash)route();else location.hash=h}
function route(){const values=location.hash.slice(1).split("/").map(decodeURIComponent);[page,rid="",group="",sub="",detailMode=""]=values;if(!Object.hasOwn(db,page)||!Array.isArray(db[page]))page="首页";if(!tabs.includes(page))tabs.push(page);for(const [n,,...kids] of groups)if(kids.includes(page))opened.add(n);query=filter="";docFilter={folder:"",name:"",uploader:""};if(proj()&&group==="投后管理"&&sub==="现金流"){group="权益管理";sub="资金流水";detailMode="post"}if(proj()&&group==="投后管理"&&sub==="退出计划"){group="投资退出";detailMode="post"}facets={};chosenCategory="";advanced=false;number=1;size=fund()?5:10;document.body.classList.remove("reveal");render();$("#view").scrollTop=0}
function menu(){const nav=$("#menu"),pos=nav.scrollTop;nav.innerHTML=groups.map(([n,ic,...kids])=>'<button data-a="'+(kids.length?"group":"nav")+'" data-v="'+n+'" class="'+(page===n?"on":"")+'"><i>'+ic+'</i>'+n+(kids.length?'<em>'+(opened.has(n)?"⌃":"⌄")+'</em>':"")+'</button>'+(opened.has(n)?kids.map(c=>btn(pageLabel(c),"nav",c,"child "+(page===c?"on":""))).join(""):"")).join("");nav.scrollTop=pos;$("#tabs").innerHTML=tabs.map(n=>'<span class="'+(n===page?"on":"")+'">'+btn(pageLabel(n),"nav",n)+btn("×","closeTab",n)+'</span>').join("")}
function table(cols,rows){return '<div class="tablewrap"><table><thead><tr>'+cols.map(c=>'<th>'+esc(c)+'</th>').join("")+'</tr></thead><tbody>'+rows.map(cells=>'<tr>'+cells.map(v=>'<td>'+v+'</td>').join("")+'</tr>').join("")+'</tbody></table>'+(!rows.length?'<div class="empty">暂无数据</div>':"")+'</div>'}
let overviewScope="投前";
const overviewScopes=["投前","投后","对照"];
function overviewCards(after){
 const funds=db.自管基金.filter(r=>(r.基金状态!=="募集期")===after);
 const partners=db.参股基金.filter(r=>(r.基金状态!=="募集期")===after);
 const projects=db.直投项目管理.filter(r=>(projectStages.indexOf(r.项目状态)>=5)===after);
 function amount(rows,key){
  const value=rows.reduce((sum,row)=>sum+(key.startsWith("我方")?ownAmount(row,key.slice(2)):Number(row[key])||0),0);
  return value.toLocaleString();
 }
 const metrics=[
  ["自管基金","支",funds,"我方认缴","我方认缴","我方实缴","我方实缴"],
  ["参股基金","支",partners,"基金认缴","基金认缴规模","基金实缴","基金实缴规模"],
  ["直投项目","个",projects,"拟投金额","拟投资金额","累计出资","累计出资金额"],
  ["我负责的项目","个",projects.filter(r=>r.项目经理===actor()),"拟投金额","拟投资金额","累计出资","累计出资金额"]
 ];
 return '<div class="cards overviewCards">'+metrics.map(([label,unit,rows,left,k,right,l])=>
  '<div class="metric"><h3>'+label+'</h3><div class="metricCount">'+rows.length+'<small>'+unit+'</small></div>'+
  '<dl class="metricAmounts">'+[[left,k],[right,l]].map(([name,key])=>'<div><dt>'+name+'</dt><dd>'+amount(rows,key)+'</dd></div>').join("")+'</dl></div>').join("")+'</div>';
}
function overview(){
 const options=overviewScopes.map(s=>'<button type="button" data-a="overviewScope" data-v="'+s+'" aria-pressed="'+(s===overviewScope)+'">'+s+'</button>').join("");
 const stages=overviewScope==="对照"?["投前","投后"]:[overviewScope];
 return panel('<div class="overviewHead"><h1>投资总览</h1><div class="scopeSwitch" role="group" aria-label="统计阶段">'+options+'</div></div>'+
  stages.map(s=>'<div class="overviewCaption"><h2>'+s+'概况</h2><small>金额单位 · 万元</small></div>'+overviewCards(s==="投后")).join(""),"overview");
}
function dashboard(){
 const shortcuts=groups.filter(([n])=>!["上市公司","AI 能力"].includes(n)).map(([n,ic,...kids])=>
  '<button type="button" class="shortcut" data-a="nav" data-v="'+(kids[0]||n)+'"><b class="badge" aria-hidden="true">'+ic+'</b>'+n+'<span aria-hidden="true">›</span></button>').join("");
 return overview()+panel(title("功能入口")+'<div class="shortcuts">'+shortcuts+'</div>',"dash")+panel(homeHeading("风险信息","riskReset")+riskTable(risks().slice(0,5)))+panel(homeHeading("日常工作","allWork")+'<div class="pills">'+["我的待办","我的申请","我的已办","我的知会","我的消息"].map(v=>btn(v,"worktab",v,work===v?"active":"")).join("")+'</div>'+table(["任务主题","提交人","当前节点","到达时间"],riskWork().slice(0,5)))+panel(homeHeading("项目跟进","allFollow")+table(["企业名称","事项名称","跟进日期"],db.项目跟进管理.slice(0,5).map(r=>[esc(r.企业全称),btn(r.事项名称,"followDetail",r.id,"link"),esc(r.跟进日期)])));
}
function tabButtons(arr,active,act){return '<div class="pills">'+arr.map(n=>btn(n,act,n,active===n?"active":"")).join("")+'</div>'}
const reportSource={"自管基金台账报表":"自管基金","参股基金台账报表":"参股基金","项目台账报表":"直投项目管理"};
function records(){
 if(reportSource[page])return ledgerRows();
 if(["基金现金流","管理费缴费通知"].includes(page)){const type=page==="基金现金流"?"现金流":"基金管理费";return ["自管基金","参股基金"].flatMap(n=>db[n].flatMap(f=>(db.notes[f.id]?.[type]||[]).map(r=>({...r,基金名称:f.基金名称,基金管理人:f.基金管理人,资金去向:r.类型,往来日期:r.发生时间,申请单号:r.单号||r.id.slice(0,8),流程状态:r.状态||"草稿"}))))}
 if(page==="项目现金流")return db.直投项目管理.flatMap(p=>{
  const notes=db.notes[p.id]||{}, entries=[...(notes.现金流||[]),...(notes.资金流水||[]).map(n=>({...n,发生时间:n.费用发生时间,类型:n.资金流向,"发生金额（万元）":n["费用金额（万元）"]})),...(notes.项目回收款||[]).map(n=>({...n,发生时间:n.时间,类型:"收款",资金类型:n.回收款类型,"发生金额（万元）":n["金额(万元)"]}))];
  return entries.map(r=>({...r,企业名称:p.企业全称,发生日期:r.发生时间,资金去向:r.类型}))});
 if(page==="市值统计")return db.股票列表.map(r=>({...r,投资经理:r.数据维护人,"股价（元/人民币）":r.当前股价,"当前持仓（股）":r.持仓股数,"期末市值（亿元/人民币）":((+r.当前股价||0)*(+r.持仓股数||0)/1e8).toFixed(6)}));
 return db[page]||[];
}
function visibleRows(){return records().filter(r=>(!query||Object.values(r).some(v=>String(v).includes(query)))&&(!filter||Object.values(r).some(v=>String(v)===filter))&&Object.entries(facets).every(([k,v])=>facetMatches(r,k,v))&&(!proj()||!post||projectStages.indexOf(r.项目状态)>=5))}
const readonly=()=>Boolean(reportSource[page])||["基金现金流","项目现金流","管理费缴费通知","市值统计","股票变动","项目跟进管理"].includes(page);
function toolbar(){
 const keyword=fund()?"基金名称":proj()?"项目名称/企业名称":page==="资源池"||page==="企业库"?"企业名称/企业简称":keyfield();
 const unique=[...new Set(records().map(r=>r.基金状态||r.项目状态||r.是否已入库||r.类型||r[keyfield()]).filter(Boolean))];
 return '<form class="panel tools" id="search"><label>关键字：<input name="q" value="'+esc(query)+'" placeholder="请输入'+esc(keyword)+'"></label>'+btn("···","more")+'<div class="spacer"></div><button class="primary">'+(fund()?"搜索":"查询")+'</button>'+btn("重置","reset","","tint")+(proj()?btn("高级查询","more"):"")+(!readonly()&&!proj()?btn(fund()?"新增基金":"新增","new","","primary"):"")+(page==="印章管理"?btn("打印","printSeals"):"")+(page==="资源池"?btn("跟进记录","nav","项目跟进管理"):"")+(reportSource[page]||["直投项目管理","企业库","印章管理","股票列表","股票变动","市值统计","项目跟进管理"].includes(page)?btn("导出","export"):"")+((advanced||["基金现金流","项目现金流","管理费缴费通知","股票列表","市值统计","股票变动","直投项目管理","项目跟进管理"].includes(page))?'<div class="advanced">'+(facetFields[page]||[]).map(dateFacet).join("")+'</div>':"")+(advanced?'<div class="advanced"><label>筛选条件<select name="filter"><option value="">不限</option>'+unique.map(v=>'<option '+(filter===v?"selected":"")+'>'+esc(v)+'</option>').join("")+'</select></label></div>':"")+'</form>';
}
function pager(total){const pages=Math.max(1,Math.ceil(total/size));return '<div class="pager"><small>共 '+total+' 条记录　第'+number+'/'+pages+'页</small>'+btn("‹","prev")+btn(number,"same","","active")+btn("›","next")+'<select aria-label="每页条数" id="size">'+[5,10,20,50].map(v=>'<option value="'+v+'" '+(size===v?'selected':'')+'>'+v+'条/页</option>').join("")+'</select><label>前往 <input id="jump" type="number" min="1" max="'+pages+'" value="'+number+'"> 页</label></div>'}
function card(r){
 const stages=fund()?fundStages:projectStages,status=fund()?r.基金状态:r.项目状态;
 const pairs=fund()?["基金管理人","基金经理","工商登记时间","基金类型","已投项目数","基金认缴规模","基金实缴规模","已投资金额"]:["管理平台","出资主体","项目经理","拟投资金额","首次出资日期","累计出资金额"];
 return '<section class="box"><span class="mini">'+esc((r.基金简称||r.企业简称||"项").slice(0,2))+'</span><div class="boxbody"><div class="bar">'+btn(fund()?r.基金简称+" | "+r.基金名称:r.项目名称+" | "+r.企业全称,"detail",r.id,"name")+'<small>'+esc(fund()?"最新编辑："+first(r.录入时间,r.工商登记时间):status)+'</small></div><div class="facts">'+pairs.map(k=>'<div><small>'+k+'</small><strong>'+esc(first(r[k]))+'</strong></div>').join("")+'</div>'+(proj()?btn("投前管理","detail",r.id)+btn("投后管理","postdetail",r.id)+(r.项目状态==="已终止"?"":btn("终止","terminate",r.id)):"")+'<div class="steps">'+stages.map(s=>'<span class="'+(s===status?"active":"")+'">'+s+'</span>').join("")+'</div></div></section>';
}
function actions(r){
 if(page==="资源池")return btn("企业查询","companyInfo",r.id,"link")+(r.是否已入库==="是"?"":btn("入库申请","admit",r.id,"link"))+btn("编辑","edit",r.id,"link")+btn("跟进","follow",r.id,"link")+btn("删除","remove",r.id,"link");
 if(page==="股票列表")return (team?.services.quotes?btn("更新行情","applyQuote",r.id,"link"):"")+btn("权益变更","stock",r.id,"link")+btn("编辑","edit",r.id,"link")+btn("删除","remove",r.id,"link");
 if(page==="股票变动")return btn("编辑","editChange",r.id,"link")+btn("删除","remove",r.id,"link");
 if(!readonly()||page==="项目跟进管理")return btn("编辑","edit",r.id,"link")+btn("删除","remove",r.id,"link");
 return "";
}
function listPage(){const rs=visibleRows();number=Math.max(1,Math.min(number,Math.ceil(rs.length/size)));const sliced=rs.slice((number-1)*size,number*size);const cols=(fields[page]||"名称").split(" "),edit=!readonly()||["项目跟进管理","股票变动"].includes(page);
 const content=proj()&&projectView==="列表视图"?table(["项目名称","企业全称","项目状态","出资主体","项目经理","拟投资金额","操作"],sliced.map(p=>[btn(p.项目名称,"detail",p.id,"link"),...[p.企业全称,p.项目状态,p.出资主体,p.项目经理,p.拟投资金额].map(esc),btn("投前管理","detail",p.id)+btn("投后管理","postdetail",p.id)])):fund()||proj()?'<div class="bar"><span>全部结果</span><span>共 <b>'+rs.length+'</b> 个'+(fund()?"基金":"项目")+'</span></div>'+sliced.map(card).join("")+(!rs.length?'<div class="empty">暂无数据</div>':""):table(["序号",...cols,...(edit?["操作"]:[])],sliced.map((r,i)=>[String((number-1)*size+i+1),...cols.map((k,j)=>j===0?btn(first(r[k]),"viewRow",r.id,"link"):esc(first(r[k]))),...(edit?[actions(r)]:[])]));
 return (proj()?panel(tabButtons(["项目投前管理","项目投后管理"],post?"项目投后管理":"项目投前管理","projectTab")):"")+toolbar()+panel((proj()?tabButtons(["卡片视图","列表视图"],projectView,"viewMode"):"")+content+pager(rs.length))}
function kv(r,keys){return '<div class="detailgrid">'+keys.map(k=>'<div><small>'+esc(k)+'</small>'+esc(first(r[k]))+'</div>').join("")+'</div>'}
function currentGroups(){return proj()?(projectDetailMode()==="post"?projectPostGroups:{"项目概况":[],"投资流程":projectStages,"文档资料":["文档资料"]}):detailGroups}
function detailPage(r){const tree=currentGroups();if(!Object.hasOwn(tree,group))group=Object.keys(tree)[0];if(!tree[group].includes(sub))sub=tree[group][0]||"";
 const header=panel('<div class="bar"><h2>'+esc(r.基金名称||r.项目名称)+'</h2>'+btn("返回列表","nav",page)+'</div><p class="muted">法定代表人或执行事务合伙人：'+esc(first(r.法定代表人或执行事务合伙人))+'　　统一社会信用代码：'+esc(first(r.统一社会信用代码))+'　　工商注册时间：'+esc(first(r.工商登记时间))+'</p>'+tabButtons(Object.keys(tree),group,"detailGroup"));
 if(!sub)return header+panel('<div class="bar"><h3>'+group+'</h3><div>'+btn("企业查询","companyInfo",rid)+btn("变更记录","history")+btn("编辑","edit",rid)+'</div></div>'+kv(r,fund()?fundFields:[...new Set([...fields.直投项目管理.split(" "),...enterpriseFields])]));
 const allNotes=db.notes[rid]?.[sub]||[],rows=allNotes.filter(n=>!query||Object.values(n).some(v=>String(v).includes(query))),cols=(subFields[sub]||"事项名称 状态 填写人 填写时间 备注").split(" ");
 if(sub==="文档资料")return header+panel(documents(rows));
 number=Math.max(1,Math.min(number,Math.ceil(rows.length/size)));const start=(number-1)*size;
 return header+panel((tree[group].length>1?tabButtons(tree[group],sub,"detailSub"):"")+'<form class="queryline" id="noteQuery"><label>关键字<input name="q" value="'+esc(query)+'"></label><button>查询</button>'+btn("重置","reset")+'</form>'+'<div class="bar"><h3>'+esc(sub)+'</h3>'+btn(sub==="文档资料"?"上传文件":"新增","addNote","","primary")+'</div>'+table(["序号",...cols,"操作"],rows.slice(start,start+size).map((n,i)=>[String(start+i+1),...cols.map((k,i)=>i===0?btn(first(n[k]),"noteInfo",n.id,"link"):esc(first(n[k]))),sub==="文档资料"?btn("下载","download",n.id,"link"):((!n.receiptId&&(!workflowSection()||!["审批中","审批通过"].includes(n.状态)))?btn("编辑","editNote",n.id,"link")+btn("删除","removeNote",n.id,"link"):"")+workflowAction(n)]))+pager(rows.length));
}
function settings(){const cfg=page==="基础管理设置"?["不开启流程时默认提交状态","开启审批流程","支持历史数据导入","投后自动定期推送"]:["基金类型","投资流程环节","投资流程必要环节","投后管理功能","必要环节校验"];return panel(title(pageLabel(page))+'<form id="config">'+["自管基金","参股基金","直投项目"].map(n=>'<h3>'+n+'</h3><div class="fields">'+cfg.map(k=>input(n+" · "+k,db.settings[n+k],k.includes("状态")?["草稿","审批通过"]:page==="基础管理设置"?["是","否"]:null)).join("")+'</div><br>').join("")+'<button class="primary">保存配置</button></form>')}
function externalPage(){const local={"报表配置":templateView,"支付现金流":paymentsView,"投资建议书":proposalView,"易投AI":assistantHome,"行业配置":industryConfig,"行业报告":industryReports,"智能问数":askView,"合同校验":contractScreen,"文档识别":recognitionScreen};if(local[page])return local[page]();return panel(title(page)+'<div class="empty">'+(page==="支付现金流"?"原系统此入口返回“该页面无法访问”。":page==="报表配置"?"原系统的报表配置服务返回 502，当前尚未接入报表设计器。":"此功能使用独立服务，当前本地版尚未接入。")+'</div>'+btn("返回首页","nav","首页"))}
function render(){document.title=pageLabel(page)+" - 股权管理系统";menu();$("#view").innerHTML=page==="首页"?dashboard():page==="驾驶舱"?cockpit():page==="支付现金流"||groups.at(-1).slice(2).includes(page)?externalPage():["基础管理设置","业务流程设置"].includes(page)?settings():record()&&(fund()||proj())?detailPage(record()) :["文件分类配置","标签管理","行业图谱"].includes(page)?categories():page==="管理平台"?platformCards():reportSource[page]?ledgerPage():listPage();teamControls()}
function input(k,v,choices,required=false){
 const opts=choices||options[k]||(/^是否/.test(k)?["是","否"]:null),name=' name="'+esc(k)+'" '+(required?"required":"");
 let control;
 if(opts)control='<select'+name+'><option value="">请选择</option>'+opts.map(o=>'<option '+(v===o?"selected":"")+'>'+esc(o)+'</option>').join("")+'</select>';
 else if(/说明|备注|经营范围|主营业务|简介|计划$|特色|融资需求|初步判断/.test(k))control='<textarea'+name+'>'+esc(v)+'</textarea>';
 else control='<input'+name+' type="'+(/日期$|时间$/.test(k)?"date":/金额|比例|股数|当前股价|持仓股数|规模|排序/.test(k)?'number" step="any':'text')+'" value="'+esc(v??"")+'" placeholder="请输入">';
 return '<label>'+esc(k)+(required?" *":"")+control+'</label>';
}
function modal(name,body,save=false){$("#modal").innerHTML='<form id="dialogForm"><h2>'+esc(name)+btn("×","dismiss")+'</h2><section>'+body+'</section><footer>'+btn("关闭","dismiss")+(save?' <button class="primary">保存</button>':"")+'</footer></form>';if(!save)formState=null;if(!$("#modal").open)$("#modal").showModal()}
function editor(mode,r={}){
 const forms={follow:fields.项目跟进管理.split(" "),stock:["发生日期","操作类型","直接持股主体股数变化量（股）","交易方式","原币币种"],admit:["项目名称","项目经理","拟投资金额","出资主体","管理平台"],note:(subFields[sub]||"事项名称 状态 填写人 填写时间 备注").split(" ")};
 const keys=(mode==="editChange"?forms.stock:forms[mode])||(fund()?fundFields:["资源池","企业库"].includes(page)?enterpriseFields:(fields[page]||"名称").split(" "));

 let initial={...r};
 if(!r.id&&mode==="note"&&sub==="重大风险事项")initial.发生日期=day();
 if(mode==="follow")initial={企业全称:r.企业全称,事项名称:"",跟进日期:day(),记录人员:actor(),数据来源:"投前"};
 if(mode==="admit")initial={项目名称:r.企业简称+"投资项目",项目经理:r.项目经理};
 if(!team&&mode==="note"&&workflowSection()&&db.settings[(proj()?"直投项目":page)+"开启审批流程"]==="否"&&!r.id)initial.状态=db.settings[(proj()?"直投项目":page)+"不开启流程时默认提交状态"]||"草稿";
 if(mode==="new")initial={基金注册状态:"已注册",基金状态:fundStages[0],所属部门:"股权投资部",所属小组:"基金组",基金经理:actor(),录入人:actor(),录入时间:day(),填写时间:day(),填写人:actor()};
 formState={mode,id:r.id||"",keys};const must=mode==="note"?[keys[0]]:mode==="stock"||mode==="editChange"?["发生日期","操作类型",stockDelta]:fund()?["基金名称","基金简称","基金状态","基金类型","基金经理"]:["资源池","企业库"].includes(page)&&["new","edit"].includes(mode)?["企业全称","企业简称"]:[keys[0]];
 modal(({follow:"添加跟进记录",stock:"权益变更",editChange:"编辑股票变动",admit:"入库申请",note:sub,new:fund()?"新增基金":page==="资源池"?"新增资源池企业":"新增"+page,edit:"编辑"+page})[mode],'<div class="fields">'+keys.map(k=>mode==="note"&&workflowSection()&&k==="状态"?'<label>状态<input name="状态" value="'+esc(initial[k]||"草稿")+'" readonly></label>':input(k,initial[k],null,must.includes(k))).join("")+'</div>'+((mode==="new"||mode==="edit")&&["资源池","企业库"].includes(page)?structures(initial,true):""),true);
}
function logs(id,what){db.notes[id]??={};(db.notes[id].变更记录??=[]).unshift({操作:what,填写人:actor(),填写时间:day()})}
function saveForm(v){
 const {mode,id}=formState,rs=db[page],r=rs.find(z=>z.id===id);
 if(mode==="remove"&&page==="股票变动"){updateStockChange(owningStock(r),r,null);return}
 if(mode==="remove"&&page==="股票列表"&&db.股票变动.some(change=>owningStock(change)?.id===id))throw Error("请先处理该持仓的变动记录");
 if(mode==="terminate"){r.终止前状态=r.项目状态;r.项目状态="已终止";r.终止原因=v.终止原因;logs(id,"终止项目："+v.终止原因);return}
 if(mode==="remove"){if(page==="项目跟进管理")for(const owner of Object.values(db.notes)){if(owner.项目跟进)owner.项目跟进=owner.项目跟进.filter(n=>n.id!==id)}db[page]=rs.filter(z=>z.id!==id);return}
 if(mode==="new"){rs.unshift({...v,id:uid(),录入人:actor(),录入时间:day(),...(page==="资源池"?{是否已入库:"否"}:{})});return}
 if(mode==="edit"){Object.assign(r,v);if(page==="项目跟进管理"){for(const owner of Object.values(db.notes)){const n=owner.项目跟进?.find(x=>x.id===r.id);if(n)Object.assign(n,v)}}logs(id,"更新基本信息");return}
 if(mode==="admit"){if(r.是否已入库==="是")throw Error("该企业已入库");r.是否已入库="是";if(!db.企业库.some(e=>e.企业全称===r.企业全称))db.企业库.unshift({...r,id:uid()});db.直投项目管理.unshift({...r,...v,id:uid(),项目状态:"储备项目"});logs(id,"完成本地入库登记");return}
 if(mode==="follow"){const entry={...v,id:uid()},matches=db.直投项目管理.filter(p=>p.企业全称===entry.企业全称);if(matches.length===1){entry.projectId=matches[0].id;const notes=db.notes[entry.projectId]??={};(notes.项目跟进??=[]).unshift({...entry})}db.项目跟进管理.unshift(entry);return}
 if(mode==="stock"||mode==="editChange"){updateStockChange(mode==="stock"?r:owningStock(r),mode==="editChange"?r:null,v);return}
 if(mode==="removeNote"){const notes=db.notes[rid];notes[sub]=notes[sub].filter(n=>n.id!==id);if(sub==="项目跟进")db.项目跟进管理=db.项目跟进管理.filter(n=>n.id!==id);logs(rid,"删除"+sub);return}
 if(mode==="note"){db.notes[rid]??={};const items=db.notes[rid][sub]??=[];const item=items.find(x=>x.id===id);if(item)Object.assign(item,v);else items.unshift({...v,id:uid()});if(sub==="项目跟进"){const entry=item||items[0],global=db.项目跟进管理.find(n=>n.id===entry.id);if(global)Object.assign(global,v);else db.项目跟进管理.unshift({...entry,企业全称:record().企业全称,projectId:rid})}logs(rid,"更新"+sub)}
}
function download(blob,name){const u=URL.createObjectURL(blob),a=document.createElement("a");a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),1500)}
function exportRows(){const schema=reportSource[page]?ledgerColumns(ledgerSchema()):null,cols=schema?["序号",...schema.map(c=>c.key)]:fields[page].split(" ");const cell=s=>{let v=String(s??"");if(/^[=+@-]/.test(v))v="'"+v;return '"'+v.replaceAll('"','""')+'"'};download(new Blob(["\ufeff"+[cols,...visibleRows().map((r,i)=>schema?[i+1,...schema.map(c=>ledgerValue(r,c))]:cols.map(k=>r[k]))].map(row=>row.map(cell).join(",")).join("\r\n")],{type:"text/csv;charset=utf-8"}),page+".csv")}
function fileStore(mode,job){if(team)return sharedFileStore(job);return new Promise((ok,no)=>{const q=indexedDB.open("equity-reference-documents",1);q.onupgradeneeded=()=>q.result.createObjectStore("files");q.onerror=()=>no(q.error);q.onsuccess=()=>{const dbx=q.result,tx=dbx.transaction("files",mode),req=job(tx.objectStore("files"));tx.oncomplete=()=>{dbx.close();ok(req.result)};tx.onabort=()=>{dbx.close();no(tx.error)}}})}
document.addEventListener("click",async e=>{
 const el=e.target.closest("[data-a]");if(!el)return;const a=el.dataset.a,v=el.dataset.v,r=db[page]?.find(o=>o.id===v);
 switch(a){
 case "riskProject":$("#modal").close();navigate("直投项目管理",v,"投后管理","重大风险事项","post");return;
 case "riskReset":riskFilter={keyword:"",level:"",page:1};showRisks();return;
 case "riskSearch":riskFilter={keyword:$("#modal [name=关键字]").value.trim(),level:$("#modal [name=风险级别]").value,page:1};showRisks();return;
 case "riskPrev":case "riskNext":riskFilter.page+=a==="riskNext"?1:-1;showRisks();return;
 case "allWork":modal("日常工作",tabButtons(["我的待办","我的申请","我的已办","我的知会","我的消息"],work,"allWorkTab")+table(workColumns,riskWork()));return;
 case "allWorkTab":work=v;render();modal("日常工作",tabButtons(["我的待办","我的申请","我的已办","我的知会","我的消息"],work,"allWorkTab")+table(workColumns,riskWork()));return;
 case "allFollow":navigate("项目跟进管理");return;
 case "followDetail":modal("项目跟进",kv(db.项目跟进管理.find(r=>r.id===v),fields.项目跟进管理.split(" ")));return;
 case "ledgerSource":navigate(reportSource[page],v);return;
 case "measure":chartMeasure=v;render();return;
 case "printSeals":{const cols=fields.印章管理.split(" ");modal("印章列表",table(cols,visibleRows().map(r=>cols.map(k=>esc(first(r[k])))))+btn("打印","printNow","","primary"));return}
 case "printNow":window.print();return;
 case "folder":docFilter.folder=v;render();return;
 case "docReset":docFilter={...docFilter,name:"",uploader:""};render();return;
 case "downloadSelected":{const ids=[...document.querySelectorAll("[data-doc]:checked")].map(i=>i.dataset.doc);
  if(!ids.length){notice("请先选择文件");return}
  try{const files=await Promise.all(ids.map(id=>fileStore("readonly",s=>s.get(id))));if(files.some(f=>!f))throw Error("部分原文件不可用，请重新选择");
  if(files.length===1)download(files[0],files[0].name);else download(await documentArchive(files),"文档资料.zip")}catch(error){notice(error.message)}return}
 case "addStructure":el.closest("[data-section]").insertAdjacentHTML("beforeend",structureRow(v));return;
 case "dropStructure":el.closest(".structureRow").remove();return;
 case "terminate":formState={mode:"terminate",id:v};modal("终止项目",'<p>'+esc(r.项目名称)+'</p>'+input("终止原因","",null,true),true);return;
 case "submitStage":if(team)await transition("submit",v);else stageRecord(v);return;
 case "job":jobDetail(v);return;
 case "approve":case "reject":if(team)await transition(a,v);else reviewStage(v,a==="approve");return;
 case "group":opened.has(v)?opened.delete(v):opened.add(v);menu();return;
 case "collapse":document.body.classList.toggle(innerWidth<996?"reveal":"hide");return;
 case "full":if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();return;
 case "nav":post=false;navigate(v);return;
 case "closeTab":tabs=tabs.filter(x=>x!==v);if(page===v)navigate(tabs.at(-1)||"首页");else menu();return;
 case "work":work="我的待办";navigate("首页");setTimeout(()=>$("#view .pills")?.scrollIntoView(),40);return;
 case "overviewScope":
  if(overviewScopes.includes(v)){overviewScope=v;render();document.querySelector('.scopeSwitch [aria-pressed="true"]')?.focus({preventScroll:true})}
  return;
 case "worktab":work=v;render();return;
 case "more":query=$("#search [name=q]").value;advanced=!advanced;render();return;
 case "category":chosenCategory=v;render();return;
 case "reset":facets={};query=filter="";number=1;render();return;
 case "next":number++;render();return;
 case "prev":number--;render();return;
 case "new":editor("new");return;
 case "editChange":case "edit":case "follow":case "admit":case "stock":editor(a,r);return;
 case "remove":formState={mode:"remove",id:v};modal("删除记录","确认删除本地记录「"+esc(r[keyfield()])+"」？",true);return;
 case "dismiss":$("#modal").close();return;
 case "detail":case "postdetail":navigate(page,v,a==="postdetail"?"企业概况":"项目概况","",a==="postdetail"?"post":"pre");return;
 case "viewMode":projectView=v;render();return;
 case "projectTab":post=v==="项目投后管理";number=1;render();return;
 case "detailGroup":navigate(page,rid,v,"",proj()?projectDetailMode():"");return;
 case "detailSub":navigate(page,rid,group,v,proj()?projectDetailMode():"");return;
 case "history":modal("变更记录",table(["操作","填写人","填写时间"],(db.notes[rid]?.变更记录||[]).map(l=>[esc(l.操作),esc(l.填写人),esc(l.填写时间)])));return;
 case "viewRow":{const row=records().find(z=>z.id===v);modal(pageLabel(page),kv(row,["资源池","企业库"].includes(page)?enterpriseFields:(fields[page]||"名称").split(" "))+(["资源池","企业库"].includes(page)?structures(row,false):""));return}
 case "addNote":if(sub==="财务情况"){financeEditor();return}if(sub==="文档资料"){formState={mode:"upload"};modal("上传文件",'<label>附件<input type="file" name="file" required></label>'+input("类别",docFilter.folder||documentCategories([])[0],documentCategories(db.notes[rid]?.文档资料||[]),true),true)}else editor("note",{填写时间:day(),填写人:actor(),创建日期:day(),创建人:actor(),发起人:actor(),记录人员:actor(),数据来源:projectDetailMode()==="post"?"投后":"投前",状态:"草稿"});return;
 case "noteInfo":{const n=db.notes[rid][sub].find(x=>x.id===v);modal(sub,printNote(n,sub==="财务情况"?["报表类型","报表期间","币种",...financialMetrics]:(subFields[sub]||"事项名称 状态 填写人 填写时间 备注").split(" "))+(n.files||[]).map(f=>btn(f.name,"download",f.id,"link")).join("")+btn("打印","printNow"));return}
 case "editNote":{const n=db.notes[rid][sub].find(x=>x.id===v);if(sub==="财务情况")financeEditor(n);else editor("note",n);return}
 case "removeNote":formState={mode:"removeNote",id:v};modal("删除记录","确认删除这条"+esc(sub)+"记录？",true);return;
 case "download":{const f=await fileStore("readonly",s=>s.get(v));if(f)download(f,f.name);else notice("找不到原文件");return}
 case "export":exportRows();return;
 }
});
document.addEventListener("submit",async e=>{
 e.preventDefault();const f=e.target,fd=new FormData(f),v=Object.fromEntries(fd);
 if(f.id==="noteQuery"){query=v.q.trim();number=1;render();return}
 if(f.id==="documentQuery"){docFilter.name=v.文件名称.trim();docFilter.uploader=v.上传人.trim();render();return}
 if(f.id==="dialogForm"&&!formState){$("#modal [data-a=riskSearch]")?.click();return}
 if(f.id==="search"){for(const k of Object.keys(v).filter(k=>k.endsWith("日期开始"))){const end=v[k.slice(0,-2)+"结束"];if(v[k]&&end&&v[k]>end){notice("结束日期须晚于或等于开始日期");return}}query=v.q.trim();filter=v.filter||"";facets=Object.fromEntries(Object.entries(v).filter(([k])=>k.startsWith("facet-")).map(([k,x])=>[k.slice("facet-".length),x.trim()]));number=1;render();return}
 if(f.id==="config"){for(const [k,x] of Object.entries(v))db.settings[k.replace(" · ","")]=x;try{await persist();notice("配置已保存")}catch(err){showFailure(err)}return}
 if(f.id!=="dialogForm"||f.dataset.busy)return;f.dataset.busy="1";
 const backup=JSON.stringify(db),newFiles=[];
 try{if(formState.mode==="financial"){await saveFinancial(f,v,newFiles)}else if(formState.mode==="upload"){
 const file=fd.get("file"),id=uid();await fileStore("readwrite",s=>s.put(file,id));newFiles.push(id);db.notes[rid]??={};(db.notes[rid].文档资料??=[]).unshift({id,文件名称:file.name,类别:v.类别,附件类型:extension(file.name),上传人:actor(),上传时间:day()});logs(rid,"上传文档")
 }else {readStructures(f,v);saveForm(v)}await persist();$("#modal").close();render();notice("已保存")}
 catch(err){db=team?structuredClone(team.data):JSON.parse(backup);await Promise.allSettled(newFiles.map(id=>fileStore("readwrite",s=>s.delete(id))));showFailure(err)}finally{delete f.dataset.busy}
});
document.addEventListener("change",e=>{if(e.target.id==="size"){size=+e.target.value;number=1;render()}if(e.target.id==="jump"){number=Math.trunc(+e.target.value)||1;render()}});
document.addEventListener("input",e=>{if(e.target.id==="folderSearch")for(const row of document.querySelectorAll(".docTree button"))row.hidden=!row.textContent.includes(e.target.value.trim())});
document.addEventListener("change",e=>{if(e.target.id==="allDocs")for(const row of document.querySelectorAll("[data-doc]"))row.checked=e.target.checked;if(e.target.matches("[data-doc]"))$("#allDocs").checked=![...document.querySelectorAll("[data-doc]")].some(i=>!i.checked)});
window.addEventListener("hashchange",route);route();
