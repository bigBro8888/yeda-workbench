"use strict";
const $=s=>document.querySelector(s),esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const storage="yeda.equity.reference.1";let db=JSON.parse(localStorage.getItem(storage)||"null")||seed(),tabs=["首页"],opened=new Set(),page="首页",rid="",group="",sub="",query="",filter="",advanced=false,number=1,size=10,work="我的待办",post=false,formState=null;
const day=()=>new Date().toLocaleDateString("sv-SE"),uid=()=>crypto.randomUUID(),btn=(text,a,v="",cls="")=>'<button type="button" class="'+cls+'" data-a="'+a+'" data-v="'+esc(v)+'">'+esc(text)+'</button>',title=t=>'<h2><b>▦</b>'+esc(t)+'</h2>',panel=(t,cls="")=>'<section class="panel '+cls+'">'+t+'</section>',fund=()=>["自管基金","参股基金"].includes(page),proj=()=>page==="直投项目管理",keyfield=()=>fund()?"基金名称":(fields[page]||"名称").split(" ")[0],record=()=>db[page]?.find(r=>r.id===rid),first=(...items)=>items.find(x=>x!==undefined&&x!==null&&x!=="")??"—";
function persist(){localStorage.setItem(storage,JSON.stringify(db))}
function notice(t){$("#toast").textContent=t;clearTimeout(notice.timer);notice.timer=setTimeout(()=>$("#toast").textContent="",2200)}
function navigate(n,id="",g="",s=""){const h="#"+[n,id,g,s].map(encodeURIComponent).join("/");if(h===location.hash)route();else location.hash=h}
function route(){const values=location.hash.slice(1).split("/").map(decodeURIComponent);[page,rid="",group="",sub=""]=values;if(!Object.hasOwn(db,page)||!Array.isArray(db[page]))page="首页";if(!tabs.includes(page))tabs.push(page);for(const [n,,...kids] of groups)if(kids.includes(page))opened.add(n);query=filter="";facets={};chosenCategory="";advanced=false;number=1;size=fund()?5:10;document.body.classList.remove("reveal");render();$("#view").scrollTop=0}
function menu(){const nav=$("#menu"),pos=nav.scrollTop;nav.innerHTML=groups.map(([n,ic,...kids])=>'<button data-a="'+(kids.length?"group":"nav")+'" data-v="'+n+'" class="'+(page===n?"on":"")+'"><i>'+ic+'</i>'+n+(kids.length?'<em>'+(opened.has(n)?"⌃":"⌄")+'</em>':"")+'</button>'+(opened.has(n)?kids.map(c=>btn(pageLabel(c),"nav",c,"child "+(page===c?"on":""))).join(""):"")).join("");nav.scrollTop=pos;$("#tabs").innerHTML=tabs.map(n=>'<span class="'+(n===page?"on":"")+'">'+btn(pageLabel(n),"nav",n)+btn("×","closeTab",n)+'</span>').join("")}
function table(cols,rows){return '<div class="tablewrap"><table><thead><tr>'+cols.map(c=>'<th>'+esc(c)+'</th>').join("")+'</tr></thead><tbody>'+rows.map(cells=>'<tr>'+cells.map(v=>'<td>'+v+'</td>').join("")+'</tr>').join("")+'</tbody></table>'+(!rows.length?'<div class="empty">暂无数据</div>':"")+'</div>'}
function dashboard(){
 const stats=(after)=>{const fs=db.自管基金.filter(r=>(r.基金状态!=="募集期")===after),partners=db.参股基金.filter(r=>(r.基金状态!=="募集期")===after),ps=db.直投项目管理.filter(r=>(projectStages.indexOf(r.项目状态)>=5)===after);const totals=(rs,k)=>rs.reduce((s,r)=>s+(Number(r[k])||0),0).toLocaleString();
 return [[fs,"自管基金数量（支）","我方认缴金额","我方实缴金额","基金认缴规模","基金实缴规模"],[partners,"参股基金数量（支）","基金认缴金额","基金实缴金额","基金认缴规模","基金实缴规模"],[ps,"项目数量（个）","拟投金额","累计出资金额","拟投资金额","累计出资金额"],[ps.filter(r=>r.项目经理==="演示用户"),"我负责的项目（个）","拟投金额","累计出资金额","拟投资金额","累计出资金额"]].map(([rs,n,x,y,k,l])=>'<div class="metric"><div class="metricTop"><span class="badge">▮▥</span><div><strong>'+rs.length+'</strong><span class="muted">'+n+'</span></div></div><div class="pair">'+[[x,k],[y,l]].map(([a,b])=>'<div><small>'+a+'（万元）</small><strong>'+totals(rs,b)+'</strong></div>').join("")+'</div></div>').join("")};
 return panel(title("数据总览")+[false,true].map(a=>'<h3>投'+(a?'后':'前')+'-数据总览</h3><div class="cards">'+stats(a)+'</div>').join(""),"dash")+panel(title("功能入口")+'<div class="shortcuts">'+groups.filter(([n])=>!["上市公司","AI 能力"].includes(n)).map(([n,ic,...kids])=>'<button class="shortcut" data-a="nav" data-v="'+(kids[0]||n)+'"><b class="badge">'+ic+'</b>'+n+'<span>›</span></button>').join("")+'</div>',"dash")+panel(title("风险信息")+table(["企业名称","风险级别","风险内容","风险类型","发生时间"],[]))+panel(title("日常工作")+'<div class="pills">'+["我的待办","我的申请","我的已办","我的知会","我的消息"].map(v=>btn(v,"worktab",v,work===v?"active":"")).join("")+'</div>'+table(["任务主题","提交人","当前节点","到达时间"],riskWork()))+panel(title("项目跟进")+table(["企业名称","事项名称","跟进日期"],db.项目跟进管理.slice(0,5).map(r=>[esc(r.企业全称),btn(r.事项名称,"nav","项目跟进管理","link"),esc(r.跟进日期)])));
}
function tabButtons(arr,active,act){return '<div class="pills">'+arr.map(n=>btn(n,act,n,active===n?"active":"")).join("")+'</div>'}
const reportSource={"自管基金台账报表":"自管基金","参股基金台账报表":"参股基金","项目台账报表":"直投项目管理"};
function records(){
 if(reportSource[page])return db[reportSource[page]].map(r=>({...r,被投资企业名称:r.企业全称,初始投资金额:r.拟投资金额,项目负责人:r.项目经理,投资主体:r.出资主体}));
 if(["基金现金流","管理费缴费通知"].includes(page)){const type=page==="基金现金流"?"现金流":"基金管理费";return ["自管基金","参股基金"].flatMap(n=>db[n].flatMap(f=>(db.notes[f.id]?.[type]||[]).map(r=>({...r,基金名称:f.基金名称,基金管理人:f.基金管理人,资金去向:r.类型,往来日期:r.发生时间,申请单号:r.id.slice(0,8),流程状态:"草稿"}))))}
 if(page==="项目现金流")return db.直投项目管理.flatMap(p=>(db.notes[p.id]?.["现金流"]||[]).map(r=>({...r,企业名称:p.企业全称,发生日期:r.发生时间,资金去向:r.类型})));
 if(page==="市值统计")return db.股票列表.map(r=>({...r,投资经理:r.数据维护人,"股价（元/人民币）":r.当前股价,"当前持仓（股）":r.持仓股数,"期末市值（亿元/人民币）":((+r.当前股价||0)*(+r.持仓股数||0)/1e8).toFixed(6)}));
 return db[page]||[];
}
function visibleRows(){return records().filter(r=>(!query||Object.values(r).some(v=>String(v).includes(query)))&&(!filter||Object.values(r).some(v=>String(v)===filter))&&Object.entries(facets).every(([k,v])=>!v||String(r[k]??"").includes(v))&&(!proj()||!post||projectStages.indexOf(r.项目状态)>=5))}
const readonly=()=>Boolean(reportSource[page])||["基金现金流","项目现金流","管理费缴费通知","市值统计","股票变动","项目跟进管理"].includes(page);
function toolbar(){
 const keyword=fund()?"基金名称":proj()?"项目名称/企业名称":page==="资源池"||page==="企业库"?"企业名称/企业简称":keyfield();
 const unique=[...new Set(records().map(r=>r.基金状态||r.项目状态||r.是否已入库||r.类型||r[keyfield()]).filter(Boolean))];
 return '<form class="panel tools" id="search"><label>关键字：<input name="q" value="'+esc(query)+'" placeholder="请输入'+esc(keyword)+'"></label>'+btn("···","more")+'<div class="spacer"></div><button class="primary">'+(fund()?"搜索":"查询")+'</button>'+btn("重置","reset","","tint")+(proj()?btn("高级查询","more"):"")+(!readonly()&&!proj()?btn(fund()?"新增基金":"新增","new","","primary"):"")+(page==="资源池"?btn("跟进记录","nav","项目跟进管理"):"")+(reportSource[page]||["直投项目管理","企业库","印章管理","股票列表","股票变动","市值统计","项目跟进管理"].includes(page)?btn("导出","export"):"")+((advanced||["基金现金流","项目现金流","管理费缴费通知","股票列表","市值统计","股票变动","直投项目管理","项目跟进管理"].includes(page))?'<div class="advanced">'+(facetFields[page]||[]).map(k=>'<label>'+k+'：<input name="facet-'+k+'" value="'+esc(facets[k]||"")+'" placeholder="请输入'+k+'"></label>').join("")+'</div>':"")+(advanced?'<div class="advanced"><label>筛选条件<select name="filter"><option value="">不限</option>'+unique.map(v=>'<option '+(filter===v?"selected":"")+'>'+esc(v)+'</option>').join("")+'</select></label></div>':"")+'</form>';
}
function pager(total){const pages=Math.max(1,Math.ceil(total/size));return '<div class="pager"><small>共 '+total+' 条记录　第'+number+'/'+pages+'页</small>'+btn("‹","prev")+btn(number,"same","","active")+btn("›","next")+'<select aria-label="每页条数" id="size">'+[5,10,20,50].map(v=>'<option value="'+v+'" '+(size===v?'selected':'')+'>'+v+'条/页</option>').join("")+'</select><label>前往 <input id="jump" type="number" min="1" max="'+pages+'" value="'+number+'"> 页</label></div>'}
function card(r){
 const stages=fund()?fundStages:projectStages,status=fund()?r.基金状态:r.项目状态;
 const pairs=fund()?["基金管理人","基金经理","工商登记时间","基金类型","已投项目数","基金认缴规模","基金实缴规模","已投资金额"]:["管理平台","出资主体","项目经理","拟投资金额","首次出资日期","累计出资金额"];
 return '<section class="box"><span class="mini">'+esc((r.基金简称||r.企业简称||"项").slice(0,2))+'</span><div class="boxbody"><div class="bar">'+btn(fund()?r.基金简称+" | "+r.基金名称:r.项目名称+" | "+r.企业全称,"detail",r.id,"name")+'<small>'+esc(fund()?"最新编辑："+first(r.录入时间,r.工商登记时间):status)+'</small></div><div class="facts">'+pairs.map(k=>'<div>'+k+'： '+esc(first(r[k]))+'</div>').join("")+'</div>'+(proj()?btn("投前管理","detail",r.id)+btn("投后管理","postdetail",r.id):"")+'<div class="steps">'+stages.map(s=>'<span class="'+(s===status?"active":"")+'">'+s+'</span>').join("")+'</div></div></section>';
}
function actions(r){
 if(page==="资源池")return (r.是否已入库==="是"?"":btn("入库申请","admit",r.id,"link"))+btn("编辑","edit",r.id,"link")+btn("跟进","follow",r.id,"link")+btn("删除","remove",r.id,"link");
 if(page==="股票列表")return btn("权益变更","stock",r.id,"link")+btn("编辑","edit",r.id,"link")+btn("删除","remove",r.id,"link");
 if(!readonly()||page==="项目跟进管理")return btn("编辑","edit",r.id,"link")+btn("删除","remove",r.id,"link");
 return "";
}
function listPage(){const rs=visibleRows();number=Math.max(1,Math.min(number,Math.ceil(rs.length/size)));const sliced=rs.slice((number-1)*size,number*size);const cols=(fields[page]||"名称").split(" "),edit=!readonly()||page==="项目跟进管理";
 const content=fund()||proj()?'<div class="bar"><span>全部结果</span><span>共 <b>'+rs.length+'</b> 个'+(fund()?"基金":"项目")+'</span></div>'+sliced.map(card).join("")+(!rs.length?'<div class="empty">暂无数据</div>':""):table(["序号",...cols,...(edit?["操作"]:[])],sliced.map((r,i)=>[String((number-1)*size+i+1),...cols.map((k,j)=>j===0?btn(first(r[k]),"viewRow",r.id,"link"):esc(first(r[k]))),...(edit?[actions(r)]:[])]));
 return (proj()?panel(tabButtons(["项目投前管理","项目投后管理"],post?"项目投后管理":"项目投前管理","projectTab")):"")+toolbar()+panel(content+pager(rs.length))}
function kv(r,keys){return '<div class="detailgrid">'+keys.map(k=>'<div><small>'+esc(k)+'</small>'+esc(first(r[k]))+'</div>').join("")+'</div>'}
function currentGroups(){return proj()?{"项目概况":[],"投资流程":projectStages,"投后管理":["项目跟进","现金流","定期报告","退出计划"],"文档资料":["文档资料"]}:detailGroups}
function detailPage(r){const tree=currentGroups();if(!Object.hasOwn(tree,group))group=Object.keys(tree)[0];if(!tree[group].includes(sub))sub=tree[group][0]||"";
 const header=panel('<div class="bar"><h2>'+esc(r.基金名称||r.项目名称)+'</h2>'+btn("返回列表","nav",page)+'</div><p class="muted">法定代表人或执行事务合伙人：'+esc(first(r.法定代表人或执行事务合伙人))+'　　统一社会信用代码：'+esc(first(r.统一社会信用代码))+'　　工商注册时间：'+esc(first(r.工商登记时间))+'</p>'+tabButtons(Object.keys(tree),group,"detailGroup"));
 if(!sub)return header+panel('<div class="bar"><h3>'+group+'</h3><div>'+btn("变更记录","history")+btn("编辑","edit",rid)+'</div></div>'+kv(r,fund()?fundFields:[...new Set([...fields.直投项目管理.split(" "),...enterpriseFields])]));
 const rows=db.notes[rid]?.[sub]||[],cols=(subFields[sub]||"事项名称 状态 填写人 填写时间 备注").split(" ");
 return header+panel(tabButtons(tree[group],sub,"detailSub")+'<div class="bar"><h3>'+esc(sub)+'</h3>'+btn(sub==="文档资料"?"上传文件":"新增","addNote","","primary")+'</div>'+table(["序号",...cols,"操作"],rows.map((n,i)=>[String(i+1),...cols.map(k=>esc(first(n[k]))),sub==="文档资料"?btn("下载","download",n.id,"link"):((!workflowSection()||!["审批中","审批通过"].includes(n.状态))?btn("编辑","editNote",n.id,"link"):"")+workflowAction(n)])));
}
function cockpit(){const all=[...db.自管基金,...db.参股基金],sum=k=>all.reduce((s,r)=>s+(+r[k]||0),0);return panel(title("数据总览")+'<div class="cards">'+[["基金数",all.length],["自管基金数量",db.自管基金.length],["基金规模（万元）",sum("基金认缴规模")],["我方实缴规模（万元）",sum("基金实缴规模")],["直投项目数",db.直投项目管理.length],["参股基金项目数",db.参股基金.length]].map(([n,v])=>'<div class="metric"><h3>'+v+'</h3>'+n+'</div>').join("")+'</div>')+panel(title("基金运营情况")+["基金类型分析","投资阶段分析"].map((n,i)=>'<h3>'+n+'</h3>'+(i?fundStages:["母基金","子基金"]).map(k=>{const v=all.filter(r=>r[i?"基金状态":"基金类型"]===k).length;return '<div class="chartrow"><span>'+k+'</span><i style="width:'+100*v/Math.max(1,all.length)+'%"></i><span>'+v+' 支</span></div>'}).join("")).join(""))}
function settings(){const cfg=page==="基础管理设置"?["不开启流程时默认提交状态","开启审批流程","支持历史数据导入","投后自动定期推送"]:["基金类型","投资流程环节","投资流程必要环节","投后管理功能","必要环节校验"];return panel(title(pageLabel(page))+'<form id="config">'+["自管基金","参股基金","直投项目"].map(n=>'<h3>'+n+'</h3><div class="fields">'+cfg.map(k=>input(n+" · "+k,db.settings[n+k],k.includes("状态")?["草稿","审批通过"]:page==="基础管理设置"?["是","否"]:null)).join("")+'</div><br>').join("")+'<button class="primary">保存配置</button></form>')}
function externalPage(){return panel(title(page)+'<div class="empty">'+(page==="支付现金流"?"原系统此入口返回“该页面无法访问”。":"此功能使用独立服务，当前本地版尚未接入。")+'</div>'+btn("返回首页","nav","首页"))}
function render(){document.title=pageLabel(page)+" - 股权管理系统";menu();$("#view").innerHTML=page==="首页"?dashboard():page==="驾驶舱"?cockpit():page==="支付现金流"||groups.at(-1).slice(2).includes(page)?externalPage():["基础管理设置","业务流程设置"].includes(page)?settings():record()&&(fund()||proj())?detailPage(record()) :["文件分类配置","标签管理","行业图谱"].includes(page)?categories():page==="管理平台"?platformCards():listPage()}
function input(k,v,choices,required=false){
 const opts=choices||options[k]||(/^是否/.test(k)?["是","否"]:null),name=' name="'+esc(k)+'" '+(required?"required":"");
 let control;
 if(opts)control='<select'+name+'><option value="">请选择</option>'+opts.map(o=>'<option '+(v===o?"selected":"")+'>'+esc(o)+'</option>').join("")+'</select>';
 else if(/说明|备注|经营范围|主营业务|简介|计划$|特色|融资需求|初步判断/.test(k))control='<textarea'+name+'>'+esc(v)+'</textarea>';
 else control='<input'+name+' type="'+(/日期$|时间$/.test(k)?"date":/金额|比例|股数|当前股价|持仓股数|规模|排序/.test(k)?'number" step="any':'text')+'" value="'+esc(v||"")+'" placeholder="请输入">';
 return '<label>'+esc(k)+(required?" *":"")+control+'</label>';
}
function modal(name,body,save=false){$("#modal").innerHTML='<form id="dialogForm"><h2>'+esc(name)+btn("×","dismiss")+'</h2><section>'+body+'</section><footer>'+btn("关闭","dismiss")+(save?' <button class="primary">保存</button>':"")+'</footer></form>';if(!$("#modal").open)$("#modal").showModal()}
function editor(mode,r={}){
 const forms={follow:fields.项目跟进管理.split(" "),stock:["发生日期","操作类型","直接持股主体股数变化量（股）","交易方式","原币币种"],admit:["项目名称","项目经理","拟投资金额","出资主体","管理平台"],note:(subFields[sub]||"事项名称 状态 填写人 填写时间 备注").split(" ")};
 const keys=forms[mode]||(fund()?fundFields:["资源池","企业库"].includes(page)?enterpriseFields:(fields[page]||"名称").split(" "));
 let initial={...r};
 if(mode==="follow")initial={企业全称:r.企业全称,事项名称:"",跟进日期:day(),记录人员:"演示用户",数据来源:"投前"};
 if(mode==="admit")initial={项目名称:r.企业简称+"投资项目",项目经理:r.项目经理};
 if(mode==="new")initial={基金注册状态:"已注册",基金状态:fundStages[0],所属部门:"股权投资部",所属小组:"基金组",基金经理:"演示用户",录入人:"演示用户",录入时间:day(),填写时间:day(),填写人:"演示用户"};
 formState={mode,id:r.id||"",keys};const must=fund()?["基金名称","基金简称","基金状态","基金类型","基金经理"]:["资源池","企业库"].includes(page)&&["new","edit"].includes(mode)?["企业全称","企业简称"]:[keys[0]];
 modal(({follow:"添加跟进记录",stock:"权益变更",admit:"入库申请",note:sub,new:fund()?"新增基金":page==="资源池"?"新增资源池企业":"新增"+page,edit:"编辑"+page})[mode],'<div class="fields">'+keys.map(k=>mode==="note"&&workflowSection()&&k==="状态"?'<label>状态<input name="状态" value="'+esc(initial[k]||"草稿")+'" readonly></label>':input(k,initial[k],null,must.includes(k))).join("")+'</div>',true);
}
function logs(id,what){db.notes[id]??={};(db.notes[id].变更记录??=[]).unshift({操作:what,填写人:"演示用户",填写时间:day()})}
function saveForm(v){
 const {mode,id}=formState,rs=db[page],r=rs.find(z=>z.id===id);
 if(mode==="remove"){db[page]=rs.filter(z=>z.id!==id);return}
 if(mode==="new"){rs.unshift({...v,id:uid(),录入人:"演示用户",录入时间:day(),...(page==="资源池"?{是否已入库:"否"}:{})});return}
 if(mode==="edit"){Object.assign(r,v);logs(id,"更新基本信息");return}
 if(mode==="admit"){if(r.是否已入库==="是")throw Error("该企业已入库");r.是否已入库="是";if(!db.企业库.some(e=>e.企业全称===r.企业全称))db.企业库.unshift({...r,id:uid()});db.直投项目管理.unshift({...r,...v,id:uid(),项目状态:"储备项目"});logs(id,"完成本地入库登记");return}
 if(mode==="follow"){db.项目跟进管理.unshift({...v,id:uid()});return}
 if(mode==="stock"){const delta=Number(v["直接持股主体股数变化量（股）"]),prev=+r.持仓股数||0;if(prev+delta<0)throw Error("变更后持仓不能为负");db.股票变动.unshift({...v,企业名称:r.企业名称,直接持股主体:r.投资主体,"变化前直接持股主体持有股数（股）":prev,"变化后直接持股主体持有股数（股）":prev+delta,操作人:"演示用户",操作日期:day(),id:uid()});r.持仓股数=prev+delta;return}
 if(mode==="note"){db.notes[rid]??={};const items=db.notes[rid][sub]??=[];const item=items.find(x=>x.id===id);if(item)Object.assign(item,v);else items.unshift({...v,id:uid()});if(sub==="项目跟进"&&!item)db.项目跟进管理.unshift({...v,id:items[0].id,企业全称:record().企业全称});logs(rid,"更新"+sub)}
}
function download(blob,name){const u=URL.createObjectURL(blob),a=document.createElement("a");a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),1500)}
function exportRows(){const cols=fields[page].split(" ");const cell=s=>{let v=String(s??"");if(/^[=+@-]/.test(v))v="'"+v;return '"'+v.replaceAll('"','""')+'"'};download(new Blob(["\ufeff"+[cols,...visibleRows().map(r=>cols.map(k=>r[k]))].map(row=>row.map(cell).join(",")).join("\r\n")],{type:"text/csv;charset=utf-8"}),page+".csv")}
function fileStore(mode,job){return new Promise((ok,no)=>{const q=indexedDB.open("equity-reference-documents",1);q.onupgradeneeded=()=>q.result.createObjectStore("files");q.onerror=()=>no(q.error);q.onsuccess=()=>{const dbx=q.result,tx=dbx.transaction("files",mode),req=job(tx.objectStore("files"));tx.oncomplete=()=>{dbx.close();ok(req.result)};tx.onabort=()=>{dbx.close();no(tx.error)}}})}
document.addEventListener("click",async e=>{
 const el=e.target.closest("[data-a]");if(!el)return;const a=el.dataset.a,v=el.dataset.v,r=db[page]?.find(o=>o.id===v);
 switch(a){
 case "submitStage":stageRecord(v);return;
 case "job":jobDetail(v);return;
 case "approve":case "reject":reviewStage(v,a==="approve");return;
 case "group":opened.has(v)?opened.delete(v):opened.add(v);menu();return;
 case "collapse":document.body.classList.toggle(innerWidth<996?"reveal":"hide");return;
 case "full":if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();return;
 case "nav":post=false;navigate(v);return;
 case "closeTab":tabs=tabs.filter(x=>x!==v);if(page===v)navigate(tabs.at(-1)||"首页");else menu();return;
 case "work":work="我的待办";navigate("首页");setTimeout(()=>$("#view .pills")?.scrollIntoView(),40);return;
 case "worktab":work=v;render();return;
 case "more":query=$("#search [name=q]").value;advanced=!advanced;render();return;
 case "category":chosenCategory=v;render();return;
 case "reset":facets={};query=filter="";number=1;render();return;
 case "next":number++;render();return;
 case "prev":number--;render();return;
 case "new":editor("new");return;
 case "edit":case "follow":case "admit":case "stock":editor(a,r);return;
 case "remove":formState={mode:"remove",id:v};modal("删除记录","确认删除本地记录「"+esc(r[keyfield()])+"」？",true);return;
 case "dismiss":$("#modal").close();return;
 case "detail":case "postdetail":navigate(page,v,a==="postdetail"?"投后管理":"");return;
 case "projectTab":post=v==="项目投后管理";number=1;render();return;
 case "detailGroup":navigate(page,rid,v);return;
 case "detailSub":navigate(page,rid,group,v);return;
 case "history":modal("变更记录",table(["操作","填写人","填写时间"],(db.notes[rid]?.变更记录||[]).map(l=>[esc(l.操作),esc(l.填写人),esc(l.填写时间)])));return;
 case "viewRow":{const row=records().find(z=>z.id===v);modal(pageLabel(page),kv(row,(fields[page]||"名称").split(" ")));return}
 case "addNote":if(sub==="文档资料"){formState={mode:"upload"};modal("上传文件",'<label>附件<input type="file" name="file" required></label>'+input("类别","基本信息"),true)}else editor("note",{填写时间:day(),填写人:"演示用户",状态:"草稿"});return;
 case "editNote":editor("note",db.notes[rid][sub].find(n=>n.id===v));return;
 case "download":{const f=await fileStore("readonly",s=>s.get(v));if(f)download(f,f.name);else notice("找不到原文件");return}
 case "export":exportRows();return;
 }
});
document.addEventListener("submit",async e=>{
 e.preventDefault();const f=e.target,fd=new FormData(f),v=Object.fromEntries(fd);
 if(f.id==="search"){query=v.q.trim();filter=v.filter||"";facets=Object.fromEntries(Object.entries(v).filter(([k])=>k.startsWith("facet-")).map(([k,x])=>[k.slice(5),x.trim()]));number=1;render();return}
 if(f.id==="config"){for(const [k,x] of Object.entries(v))db.settings[k.replace(" · ","")]=x;persist();notice("配置已保存");return}
 if(f.id!=="dialogForm"||f.dataset.busy)return;f.dataset.busy="1";
 const backup=JSON.stringify(db);
 try{if(formState.mode==="upload"){
 const file=fd.get("file"),id=uid();await fileStore("readwrite",s=>s.put(file,id));db.notes[rid]??={};(db.notes[rid].文档资料??=[]).unshift({id,文件名称:file.name,类别:v.类别,上传人:"演示用户",上传时间:day()});logs(rid,"上传文档")
 }else saveForm(v);persist();$("#modal").close();render();notice("已保存")}
 catch(err){db=JSON.parse(backup);notice(err.message||"保存失败")}finally{delete f.dataset.busy}
});
document.addEventListener("change",e=>{if(e.target.id==="size"){size=+e.target.value;number=1;render()}if(e.target.id==="jump"){number=Math.trunc(+e.target.value)||1;render()}});
window.addEventListener("hashchange",route);route();
