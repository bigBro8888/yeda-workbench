"use strict";
const facetFields={
 基金现金流:["基金名称","往来单位","备注","往来日期"],项目现金流:["企业名称","往来单位","备注","发生日期"],管理费缴费通知:["基金管理人","基金名称"],股票列表:["管理平台","上市方式","上市板块"],市值统计:["投资主体","股票代码"],股票变动:["基金名称","操作类型","发生日期"],印章管理:["印章管理员"],项目跟进管理:["记录人员","跟进日期"],自管基金台账报表:["出资主体"],参股基金台账报表:["出资主体"],项目台账报表:["投资主体"],直投项目管理:["出资主体","管理平台","项目状态"],自管基金:["基金类型","基金经理","基金状态"],参股基金:["基金类型","基金经理","基金状态"]};
let facets={},chosenCategory="";
function categories(){
 const isIndustry=page==="行业图谱",isFile=page==="文件分类配置",key=keyfield(),rows=db[page];
 const r=rows.find(x=>x.id===chosenCategory)||rows[0];
 const left=rows.map(x=>btn(x[key]+(isIndustry?" ("+db.企业库.filter(e=>e.清科行业===x[key]).length+")":""),"category",x.id,x.id===r?.id?"active":"")).join("");
 let content='';
 if(r&&isIndustry){const rs=db.企业库.filter(e=>e.清科行业===r[key]);content=table(["企业全称","企业简称","清科行业"],rs.map(e=>[esc(e.企业全称),esc(e.企业简称),esc(e.清科行业)]))}
 else if(r){content=kv(r,fields[page].split(" "))+btn("编辑","edit",r.id)+btn("删除","remove",r.id)}
 return panel('<div class="bar"><h2>'+page+'</h2>'+btn("新增","new","","primary")+'</div><div class="categoryLayout"><div class="categoryNav">'+left+'</div><section><h3>'+esc(r?.[key]||(isFile?"请选择左侧文件分类或点击新增":"暂无数据"))+'</h3>'+content+'</section></div>');
}
function platformCards(){
 const rs=visibleRows();return toolbar()+panel(rs.map(r=>'<div class="box"><div class="mini">企</div><div class="boxbody">'+btn(r.管理平台名称,"viewRow",r.id,"name")+kv(r,fields.管理平台.split(" ").slice(1))+btn("编辑","edit",r.id,"link")+'</div></div>').join("")||'<div class="empty">暂无数据</div>');
}
function riskWork(){
 return (db.notes["daily"]||[]).filter(myJob).map(n=>[btn(n.name,"job",n.id,"link"),esc(n.person),esc(n.stage),esc(n.date)]);
}
function workflowSection(){return group==="投资流程"||["退出决策","退出计划","用印管理","公司三会","协议签订","委派人员","一般事项","重大风险事项","重要事项决策","缴款通知","注资缴款","基金分配","基金管理费"].includes(sub)}
function workflowAction(item){
 if(!workflowSection())return "";
 if(item.状态==="审批中")return btn("查看待办","work","","link");
 if(writable()&&(item.状态==="草稿"||item.状态==="已退回"))return btn("提交审批","submitStage",item.id,"link");
 return "";
}
function stageRecord(item){
 const row=db.notes[rid]?.[sub]?.find(n=>n.id===item);if(!row||!["草稿","已退回"].includes(row.状态))return;
 const scope=proj()?"直投项目":page;
 if(db.settings[scope+"开启审批流程"]==="否"){row.状态="审批通过";logs(rid,sub+" · 无需审批");persist();render();notice("已按配置完成提交");return}
 row.状态="审批中";(db.notes.daily??=[]).unshift({id:uid(),objectId:rid,entryId:item,module:page,group,sub,name:row.事项名称||row.合同名称||row.风险内容||row.用印事项名称||sub,person:"演示用户",stage:"审批中",date:day(),type:"我的待办"});logs(rid,"提交"+sub);persist();render();notice("已提交至本地待办")
}
function reviewStage(item,accept){
 const job=db.notes.daily?.find(n=>n.id===item&&n.type==="我的待办");if(!job)return;
 const entry=db.notes[job.objectId]?.[job.sub]?.find(n=>n.id===job.entryId);if(!entry)return;
 const status=accept?"审批通过":"已退回";entry.状态=status;job.stage=status;job.type="我的已办";logs(job.objectId,job.sub+" · "+status);persist();$("#modal").close();render();notice(status)
}
function jobDetail(item){
 const job=db.notes.daily?.find(n=>n.id===item);if(!job)return;
 modal(job.name,kv({任务主题:job.name,所属模块:job.module,业务事项:job.sub,提交人:job.person,当前节点:job.stage,到达时间:job.date},["任务主题","所属模块","业务事项","提交人","当前节点","到达时间"])+(canReview(job)?btn("通过","approve",item,"primary")+" "+btn("退回","reject",item):""))
}
