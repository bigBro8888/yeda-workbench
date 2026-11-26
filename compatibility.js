"use strict";
function upgradeNotes(data){
 if(data.settings.noteSchema===2)return;
 const synonyms={"基金估值":{"整体估值（万元）":"基金估值（万元）","估值方式":"估值方法","定期估值季度":"估值日期"},
  "基金分配":{"基金分配日期":"分配日期","本期分配总金额（万元）":"分配金额（万元）"},
  "定期报告":{"报告标题":"事项名称"},"委派人员":{"姓名":"事项名称"},"协议签订":{"合同名称":"事项名称"},
  "公司三会":{"事项标题":"事项名称"},"用印管理":{"用印事项名称":"事项名称"}};
 for(const [id,notes] of Object.entries(data.notes)){
  if(!notes||Array.isArray(notes))continue;
  for(const [section,map] of Object.entries(synonyms))for(const row of notes[section]||[])for(const [current,previous] of Object.entries(map)){
   if(row[current]==null&&row[previous]!=null)row[current]=row[previous];
  }
  if(!data.直投项目管理.some(p=>p.id===id))continue;
  if(notes.现金流?.length){
   notes.资金流水??=[];
   for(const old of notes.现金流)if(!notes.资金流水.some(n=>n.id===old.id))notes.资金流水.push({...old,费用发生时间:old.发生时间,资金流向:old.类型,"费用金额（万元）":old["发生金额（万元）"]});
   delete notes.现金流;
  }
 }
 data.settings.noteSchema=2;
}
