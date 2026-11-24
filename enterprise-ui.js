"use strict";
function operatingFocus(){
 const c=cc(),diff=compareQuarter().filter(r=>r.state!=="相符").length;
 const q=c.locked?"已锁期 · V"+c.versions[0]?.version:(diff?diff+" 项资金差异":"资金账已核平");
 const confirmed=db.tasks.filter(t=>t.status==="已确认").length;
 return '<section class="focusWork">'+[
 ["close/cash","季度结账",q,"产业基金一期 · 2026 Q3","coin"],
 ["C/C04","企业经营报送",confirmed+" / "+db.tasks.length+" 项已确认","按确认版本出具报告","file"],
 ["delivery/blueprint","建设与交付","10 个模块 · 62 项","软件、实施与首年运维","layers"]
 ].map(([dest,label,status,detail,icon])=>cmd("nav",'<div class="focusIcon">'+ico(icon)+'</div><div><small>'+label+'</small><b>'+esc(status)+'</b><span>'+detail+'</span></div>',"workFocusItem",dest)).join("")+'</section>';
}
function enterpriseRoute(){
 if(route==="finance")return fbPage();
 if(route==="agent")return iaPage();
 if(route==="intelligence")return ddWorkspace();
 if(route==="platform")return platformPage();
 if(route==="pool")return poolPage();
 if(route==="subs")return subPage(page);
 if(route==="directory"){let name="";try{name=decodeURIComponent(page)}catch{}return name?companyView(name):directoryPage()}
 if(route==="riskcenter")return riskCenter();
 if(route==="close")return closePage();
 if(route==="delivery")return deliveryPage();
 return null;
}
function goEnterpriseTab(kind,id){
 if(kind==="close"){if(!qNav.some(([k])=>k===id))return;go("close",id)}
 else{if(!deliveryTabs.some(([k])=>k===id))return;go("delivery",id)}
}
function enterEnterpriseRoute(r,p){
 if(r==="close")closeTab=qNav.some(([k])=>k===p)?p:"cash";
 if(r==="delivery")deliveryTab=deliveryTabs.some(([k])=>k===p)?p:"blueprint";
}
function fileFeedback(id,err){const target=document.getElementById(id);if(target)target.textContent=err.message;else announce(err.message)}
async function deliveryAction(action,id){
 try{
  switch(action){
  case "baselineCSV":baselineDownload();break;
  case "qStatementPanel":bankStatementPanel();break;
  case "qTab":goEnterpriseTab("close",id);break;
  case "dTab":goEnterpriseTab("delivery",id);break;
  case "ledgerFilter":ledgerFilter=id;render();break;
  case "qEntry":entryPanel(id);break;
  case "qBase":drawer("NAV-Q3-01 · 历史迁移基线",kv("归口人","基金财务")+kv("其他净资产",amt(90580))+kv("示例来源","期初持仓及往来净额汇总底稿。正式迁移时须提供逐笔台账并签认。"));break;
  case "qLockForm":qLockForm();break;
  case "qReport":qReport(id);break;
  case "qExport":qExport(id);break;
  case "qVoucher":sampleVoucher(id);break;
  case "dGroup":groupFilter=id;render();break;
  case "scopeItem":scopeItem(id);break;
  case "csvSample":downloadLocal("业达-Q3银行试导样表.csv","\ufeff"+sampleImport(),"text/csv;charset=utf-8");break;
  case "csvTrial":trialBatch=trialImport(sampleImport(),"Q3银行试导样表.csv");render();break;
  case "csvCommit":commitImport();break;
  case "qBackup":if(closeRole==="admin")downloadLocal("业达-Q3季度备份.json",JSON.stringify(await packQuarter()),"application/json");break;
  case "qDrill":await runDrill(await packQuarter());break;
  case "qRecoveredFile":if(closeRole==="admin"&&restoredCopy){const f=restoredCopy.files[0];downloadLocal(f.name,"\ufeff"+f.text,"text/csv;charset=utf-8")}break;
  }
 }catch(e){fileFeedback(action.startsWith("csv")?"batchError":"drillError",e)}
}
const enterpriseActions=new Set(["qStatementPanel","baselineCSV","qTab","dTab","ledgerFilter","qEntry","qBase","qLockForm","qReport","qExport","qVoucher","dGroup","scopeItem","csvSample","csvTrial","csvCommit","qBackup","qDrill","qRecoveredFile"]);
document.addEventListener("change",async event=>{
 if(externalCompany)return;
 const el=event.target;
 if(el.id==="closeRole"){qRoles(el);return}
 if(!["bankUpload","archiveUpload"].includes(el.id)||!el.files?.length)return;
 const file=el.files[0];
 try{
  if(el.id==="bankUpload"){
   trialBatch=null;if(file.size>256000)throw Error("单次演示导入最多 250 KB。");
   trialBatch=trialImport(await file.text(),file.name);render();
  }else if(closeRole==="admin"){
   restoredCopy=null;if(file.size>2097152)throw Error("季度演练包最多 2 MB。");await runDrill(JSON.parse(await file.text()));
  }
 }catch(e){render();fileFeedback(el.id==="bankUpload"?"batchError":"drillError",e)}
});

