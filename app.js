"use strict";
const $=s=>document.querySelector(s);
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const icons={home:"M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z",box:"M3 7l9-4 9 4-9 4z M3 7v10l9 4 9-4V7 M12 11v10",fund:"M3 9l9-6 9 6z M5 11v7m5-7v7m5-7v7m4-7v7 M3 21h18",project:"M3 6h7l2 2h9v12H3z",task:"M5 4h14v17H5z M9 3h6v4H9z M8 13l3 3 5-6",chart:"M3 3v18h18 M7 16l4-5 4 2 5-8",coin:"M3 7h18v13H3z M3 7l15-4v4 M15 12h6v4h-6z",layers:"M12 3l10 5-10 5L2 8z M2 12l10 5 10-5 M2 16l10 5 10-5",file:"M5 3h9l5 5v13H5z M14 3v6h5 M8 13h8m-8 4h6",shield:"M12 2l8 3v6q0 7-8 11-8-4-8-11V5z M8 11l3 3 5-6",search:"M15.5 15.5l6 6 M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0",menu:"M3 6h18M3 12h18M3 18h18",cal:"M3 6h18v15H3z M7 3v6m10-6v6 M3 11h18",stack:"M4 7l8-4 8 4-8 4z M4 12l8 4 8-4 M4 17l8 4 8-4",growth:"M3 18l6-6 4 3 8-10 M15 5h6v6",plus:"M12 5v14M5 12h14",clock:"M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0 M12 6v6l4 2",out:"M12 3v12m-4-4 4 4 4-4 M4 16v5h16v-5",close:"M5 5l14 14M19 5L5 19"};
const ico=n=>'<svg aria-hidden="true" class="icon" viewBox="0 0 24 24"><path d="'+icons[n]+'"/></svg>';
const menus=[["overview","投资驾驶舱","home","工作空间"],["todo","待办中心","task"],["agent","投资业务智能体","layers"],["platform","产业平台","fund","投资业务"],["pool","项目池","layers"],["B","直投项目","project"],["intelligence","尽调工作台","search"],["subs","投资子基金","fund"],["D","基金管理","coin"],["directory","企业档案","file","投后运营"],["C","投后管理","task"],["riskcenter","风险中心","shield"],["E","退出与分配","coin"],["F","绩效与穿透","chart"],["finance","资金与财务协同","coin","运营管理"],["close","季度结账","coin"],["G","报告中心","file"],["A","档案与权限","layers"],["delivery","实施与验收","task"]];
const mods=Object.fromEntries(menus.map(m=>[m[0],m[1]]));
const by=Object.fromEntries(catalog.map(x=>[x.id,x]));
const funds=[{name:"产业基金一期",cap:12.8,paid:9.6},{name:"成长基金二期",cap:8.6,paid:6.3},{name:"科创引导基金",cap:6.4,paid:4.8},{name:"新动能基金",cap:4.2,paid:3.2}];
const seeds=[["海岚智造","高端装备",0,3200,"投后管理","周宁"],["启航材料","新材料",0,1800,"投后管理","许舒"],["东湾科技","数字科技",0,2600,"投后管理","周宁"],["海源装备","高端装备",1,2400,"投后管理","林然"],["瑞成科技","数字科技",1,1500,"投后管理","陈越"],["蓝湾能源","新能源",2,3000,"投后管理","林然"],["远川新材","新材料",3,2600,"投后管理","周宁"],["云帆智控","数字科技",2,1600,"待立项","周宁"],["凌海动力","新能源",3,1750,"待立项","许舒"]];
const start={projects:seeds.map(([name,industry,fund,amount,stage,owner],i)=>({id:"XM-"+String(26*100+i+1),name,industry,fund,amount,stage,owner,history:["项目登记入库"]})),tasks:[{id:"QB-001",company:"海岚智造",fund:0,q:"2026 Q3",due:"2026-10-15",status:"待复核",v:1,rev:1200,cost:840,file:"第三季度经营报表.pdf",history:["V1 企业已提交"],versions:[]},{id:"QB-002",company:"启航材料",fund:0,q:"2026 Q3",due:"2026-10-15",status:"待提交",v:0,history:["已下发"],versions:[]}],paid:0,cashlog:[],reports:[],audit:[]};
let externalCompany=sessionStorage.getItem("yeda.demo.company")||"";
const storageKey="yeda.frontend.demo.v1";
let knownRevision=localStorage.getItem(storageKey);
let db;try{db=JSON.parse(knownRevision)}catch{}db=db||structuredClone(start);
let route="overview",page="",fundFilter="-1",period=6,query="",statusFilter="",timer;
const save=(action,actor="周宁")=>{
 if(localStorage.getItem(storageKey)!==knownRevision){
  sessionStorage.setItem("yeda.writeNotice","另一个页面已保存更新。已载入最新数据，请重新核对并提交刚才的操作。");
  location.reload();throw new Error("演示记录版本已变化，本次写入已取消");
 }
 db.audit.unshift([new Date().toLocaleString("zh-CN"),actor,action,"本地演示"]);const next=JSON.stringify(db);localStorage.setItem(storageKey,next);knownRevision=next};
const money=n=>Number(n).toLocaleString("zh-CN",{maximumFractionDigits:2});
const tag=s=>'<span class="tag '+(/已确认|投后管理|生效|已通过|已发布|^相符$|已锁定/.test(s)?"green":/待补正|退回|缺项|不符|冲突/.test(s)?"red":/待|整改/.test(s)?"gold":"")+'">'+esc(s)+'</span>';
const opt=(arr,current)=>arr.map(x=>'<option '+(String(x[0])===String(current)?"selected":"")+' value="'+esc(x[0])+'">'+esc(x[1])+'</option>').join("");
const cmd=(a,label,cls="",id="")=>'<button class="'+cls+'" data-act="'+a+'" data-id="'+esc(id)+'">'+label+'</button>';
const kv=(a,b)=>'<div class="kv"><span>'+esc(a)+'</span><b>'+esc(b)+'</b></div>';
const history=a=>'<h3>办理记录</h3>'+a.map(v=>'<p class="timeline">'+esc(v)+'</p>').join("");
const selected=p=>fundFilter==="-1"||p.fund===Number(fundFilter);
const selectedProjects=()=>db.projects.filter(selected);
const filterSelect=()=>'<select id="fundFilter" aria-label="筛选基金">'+opt([[-1,"全部基金"],...funds.map((f,i)=>[i,f.name])],fundFilter)+'</select>';
const announce=s=>{clearTimeout(timer);$("#toast").textContent=s;timer=setTimeout(()=>$("#toast").textContent="",2800)};
function drawer(title,body){const d=$("#panel");d.className="drawer";d.innerHTML='<div class="dhead"><h2>'+esc(title)+'</h2>'+cmd("close",ico("close"),"btn")+'</div><div class="dcontent">'+body+'</div>';d.querySelector("[data-act=close]").ariaLabel="关闭";if(!d.open)d.showModal()}
function go(r,p=""){const next="#"+r+(p?"/"+p:"");if(location.hash!==next)location.hash=next;else readRoute(false);$("#panel").close();document.body.classList.remove("menu")}
let detailTab="overview";
function readRoute(resetScroll=true){const [r,p,sub]=location.hash.slice(1).split("/");route=mods[r]?r:"overview";enterEnterpriseRoute(route,p);detailTab=sub||"overview";page=(r==="directory"||r==="subs"||r==="intelligence")?(p||""):(r==="B"&&getProject(p))||(r==="D"&&/^fund-[0-3]$/.test(p))?p:(p&&by[p]?.id[0]===r?p:"");query="";statusFilter="";render();if(resetScroll!==false)window.scrollTo(0,0)}
function renderWorkspaceSidebar(){
 const sidebar=$("#sidebar");
 if(!sidebar.querySelector("nav[data-workspace]")){
  const menu=menus.map(([key,label,icon,group])=>(group?'<div class="ng">'+esc(group)+'</div>':"")+cmd("nav",ico(icon)+esc(label),"navbtn",key)).join("");
  sidebar.innerHTML='<div class="brand"><div class="emblem"><svg width="31" height="30" viewBox="0 0 32 30" fill="white"><path d="M1 7h7l8 10-4 5zM23 3h8L15 27H7z"/></svg></div><div><strong>业达投资</strong><small>YEDA INVESTMENT</small></div>'+cmd("menu","×","collapse")+'</div><nav data-workspace>'+menu+'</nav><div class="profile"><div class="avatar"></div><div><span class="profileName"></span><small></small></div><button class="switcher" data-act="identity" title="切换演示身份" aria-label="切换演示身份">⇄</button></div>';
 }
 for(const item of sidebar.querySelectorAll(".navbtn")){
  const active=item.dataset.id===route;
  item.classList.toggle("active",active);
  if(active)item.setAttribute("aria-current","page");else item.removeAttribute("aria-current");
 }
 const [role,name]=(route==="close"||route==="delivery")?closeRoles[closeRole].split(" · "):["集团投资管理部","周宁"];
 sidebar.querySelector(".avatar").textContent=name[0];
 sidebar.querySelector(".profileName").textContent=name;
 sidebar.querySelector(".profile small").textContent=role;
}
function render(){
 if(externalCompany){enterpriseView();return}
 renderWorkspaceSidebar();
 $("#top").innerHTML=cmd("menu",ico("menu"),"hamb")+'<span class="crumb">集团工作空间</span><span class="crumb">/</span><b>'+mods[route]+'</b><div class="right"></div>'+cmd("search",ico("search")+'<span>搜索业务</span> <small class="key">Ctrl K</small>',"searchbtn")+'<span class="env"><i class="dot"></i>本地演示</span>';
 $("#main").innerHTML=enterpriseRoute()??(route==="B"&&getProject(page)?projectPage(getProject(page),detailTab):route==="D"&&page.startsWith("fund-")?fundPage(+page.slice(5)):route==="overview"?cockpit():section()); 
}
function title(t,sub,right=""){return '<div class="heading"><div><h1>'+t+'</h1><div class="eyedate">'+sub+'</div></div><div class="row">'+right+'</div></div>'}
function panelHead(t,more=""){return '<div class="panelhead"><h2>'+t+'</h2>'+more+'</div>'}
function todoList(){
 return [...db.agentTodos.filter(t=>!t.done).map(t=>({...t,act:"iaTodo",status:"待办理",icon:"task",color:"green"})),...followups(),...db.tasks.filter(t=>t.status==="待复核").map(t=>({act:"task",id:t.id,title:"季度经营报送复核",sub:t.company+" · "+t.q,status:"待复核",icon:"file",color:"green",fund:t.fund})),...db.projects.filter(p=>p.stage==="待立项").map(p=>({act:"project",id:p.id,title:"项目立项审批",sub:p.name+" · "+p.owner,status:"待审批",icon:"project",color:"",fund:p.fund})),...(db.paid<100?[{act:"cash",id:"",title:"LP 到账核销",sub:"甲出资人 · BK-901",status:"待核销",icon:"coin",color:"gold",fund:0}]:[])].filter(selected)
}
function todoRows(max){return todoList().slice(0,max).map(t=>cmd(t.act,'<span class="taskicon '+t.color+'">'+ico(t.icon)+'</span><span><strong>'+esc(t.title)+'</strong><small>'+esc(t.sub)+'</small></span>'+tag(t.status),"taskrow",t.id)).join("")||'<div class="empty">当前没有待办事项</div>'}
function table(headers,rows){return '<div class="tablewrap"><table><thead><tr>'+headers.map(v=>'<th>'+esc(v)+'</th>').join("")+'</tr></thead><tbody>'+rows.join("")+'</tbody></table></div>'+(!rows.length?'<div class="empty">暂无符合条件的记录</div>':'')}
function tr(cells,act,id){return '<tr '+(act?'class="click" tabindex="0" data-act="'+act+'" data-id="'+esc(id)+'"':'')+'>'+cells.map(c=>'<td>'+c+'</td>').join("")+'</tr>'}
function projectTable(list,compact=false){return table(compact?["项目名称","所属基金","投资金额¹","项目阶段"]:["项目名称","所属基金","行业","投资金额¹","负责人","项目阶段"],list.map(p=>tr(['<strong>'+esc(p.name)+'</strong><small>'+esc(p.id)+'</small>',funds[p.fund].name,...(compact?[]:[esc(p.industry)]),money(p.amount)+' 万元',...(compact?[]:[esc(p.owner)]),tag(p.stage)],"project",p.id)))}
function metric(label,val,unit,foot,icon,act,lead=false){let wave=lead?'<svg class="wave" viewBox="0 0 180 80" preserveAspectRatio="none" fill="none" stroke="#a1caff">'+Array.from({length:11},(_,i)=>'<path d="M-10 '+(67+i*2)+' Q35 '+(15+i*3)+' 70 '+(47+i*2)+' T135 '+(33+i*2)+' T210 '+(5+i*2)+'"/>').join("")+'</svg>':"";return cmd("nav",'<div class="metrichead">'+label+'<span class="ib">'+ico(icon)+'</span></div><div class="metricvalue">'+val+'<small>'+unit+'</small></div><div class="metricfoot">'+foot+'</div>'+wave,"metric "+(lead?"lead":""),act)}
function trend(cap,paid){
 const months=period===6?[5,6,7,8,9,10]:[0,1,2,3,4,5,6,7,8,9,10];const a=[.53,.55,.62,.66,.73,.78,.79,.86,.88,.94,1],b=[.48,.54,.6,.61,.69,.72,.78,.8,.9,.93,1];
 const max=Math.max(4,Math.ceil(cap/4)*4);const px=i=>45+i*550/(months.length-1),py=n=>149-n/max*123;
 const line=(base,arr)=>months.map((m,i)=>(i?"L":"M")+px(i)+" "+py(base*arr[m])).join(" ");
 const series=(base,arr,c,fill)=>{let l=line(base,arr);return '<path d="'+l+' L595 149 L45 149Z" fill="url(#'+fill+')"/><path d="'+l+'" fill="none" stroke="'+c+'" stroke-width="2.6"/>'+months.map((m,i)=>'<circle cx="'+px(i)+'" cy="'+py(base*arr[m])+'" r="3.4" fill="white" stroke="'+c+'" stroke-width="2"><title>'+ (m+1)+' 月 · '+money(base*arr[m])+' 亿元</title></circle>').join("")};
 return '<svg class="chart" role="img" aria-label="认缴与实缴规模趋势，单位亿元" viewBox="0 0 620 180" preserveAspectRatio="none"><defs><linearGradient id="blue" x2="0" y2="1"><stop stop-color="#3a79e6" stop-opacity=".22"/><stop offset="1" stop-color="#3a79e6" stop-opacity=".02"/></linearGradient><linearGradient id="green" x2="0" y2="1"><stop stop-color="#22a697" stop-opacity=".12"/><stop offset="1" stop-color="#22a697" stop-opacity=".01"/></linearGradient></defs>'+Array.from({length:5},(_,i)=>'<path d="M45 '+py(i*max/4)+' H595" stroke="#dce4ed" stroke-dasharray="3 4"/><text x="30" y="'+(py(i*max/4)+4)+'" text-anchor="end" fill="#74859a" font-size="11">'+money(i*max/4)+'</text>').join("")+series(cap,a,"#3876db","blue")+series(paid,b,"#23a391","green")+months.map((m,i)=>'<text x="'+px(i)+'" y="171" text-anchor="middle" fill="#718399" font-size="11">'+(m+1)+'月</text>').join("")+'</svg>'
}
function allocation(list){const d={};for(const p of list.filter(p=>p.stage==="投后管理"))d[p.industry]=(d[p.industry]||0)+p.amount;let n=0;const colors=["#306ac5","#3c9fa4","#76a6e6","#d9ab61"],sum=Object.values(d).reduce((a,b)=>a+b,0);const entries=Object.entries(d).sort((a,b)=>b[1]-a[1]);const grad=entries.map(([,v],i)=>{let prev=n;n+=v/sum*100;return colors[i%4]+' '+prev+'% '+n+'%'}).join(",");return '<div class="allocation"><div class="donut" style="background:'+(grad?'conic-gradient('+grad+')':'#eee')+'"><div class="hole"><strong>'+entries.length+'</strong><small>投资行业</small></div></div><div class="alloclegend">'+entries.map(([k,v],i)=>'<div><i class="swatch" style="background:'+colors[i%4]+'"></i>'+esc(k)+'<b>'+Math.round(v/sum*100)+'%</b></div>').join("")+'</div></div>'}
function overview(){
 const fs=funds.filter((_,i)=>selected({fund:i})),cap=fs.reduce((a,f)=>a+f.cap,0),paid=fs.reduce((a,f)=>a+f.paid,0)+(selected({fund:0})?db.paid/10000:0);
 const list=selectedProjects(),held=list.filter(x=>x.stage==="投后管理");return title("经营总览","2026 年 11 月 24 日　星期二",filterSelect())+'<div class="metrics">'+metric("基金认缴规模",cap.toFixed(2),"亿元","在管基金　"+fs.length+" 只","fund","D",true)+metric("累计实缴规模",paid.toFixed(2),"亿元","实缴进度　"+(paid/cap*100).toFixed(1)+"%","coin","D")+metric("在投项目金额",(held.reduce((a,x)=>a+x.amount,0)/10000).toFixed(2),"亿元","已投项目　"+held.length+" 个","growth","B")+metric("在管项目",list.length,"个","投前跟进　"+(list.length-held.length)+" 个","project","B")+'</div>'+operatingFocus()+'<div class="focusbar"><div><strong>投资例会</strong>项目判断与资金安排</div><div class="row">'+cmd("project","海岚智造 · 投资档案","btn",flagshipId)+cmd("fund","产业基金一期 · 资金排期","btn",0)+'</div></div><div class="grid"><section class="panel">'+panelHead("基金规模趋势",'<div class="seg">'+cmd("period","近半年",period===6?"on":"","6")+cmd("period","本年度",period!==6?"on":"","11")+'</div>')+'<div class="chartmeta"><span class="legend" style="--c:#3876db">认缴规模</span><span class="legend" style="--c:#23a391">实缴规模</span><span class="right">单位：亿元</span></div>'+trend(cap,paid)+'</section><section class="panel">'+panelHead('待办事项 <small class="count">'+todoList().length+'</small>',cmd("nav","查看全部","textbtn","todo"))+'<div class="tasklist">'+todoRows(4)+'</div></section></div><div class="grid"><section class="panel">'+panelHead("项目动态",cmd("nav","项目台账","textbtn","B"))+projectTable([...list].reverse().slice(0,5),true)+'</section><section class="panel">'+panelHead("行业投资分布")+'<div class="chartmeta">按在投项目金额统计</div>'+allocation(list)+'</section></div><p class="footnote">¹ 投前项目列示拟投金额。页面金额及业务记录均为演示样例。</p>'
}

