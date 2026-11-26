"use strict";

const financialMetrics="总资产 货币资金 总负债 流动资产 所有者权益 流动负债 资产负债率 流动比率 销售商品、提供劳务收到的现金 购买商品、接受劳务支付的现金 经营性现金流净额 本年累计营业收入 收入同比增长率 本年累计毛利 毛利率 本年累计净利润 净利率 就业人数 其中区内就业人数 缴纳税费 其中区内缴纳税费 当年累计营业成本 短期借款 当年累计研发费用".split(" ");
const calculatedMetrics=["所有者权益","资产负债率","流动比率"];
const periodOptions={月度报表:Array.from({length:12},(_,i)=>String(i+1).padStart(2,"0")+"月"),季度报表:["一季度","二季度","三季度","四季度"],半年度报表:["上半年","下半年"],年度报表:["全年"]};
function reportPeriodOptions(type,current){
 return periodOptions[type].map(x=>'<option '+(x===current?"selected":"")+'>'+x+'</option>').join("");
}
function financeEditor(row={}) {
 const type=row.报表类型||"月度报表",yr=row.年度||new Date().getFullYear();
 formState={mode:"financial",id:row.id||""};
 const metrics=financialMetrics.map(k=>{
  const unit=k.endsWith("率")?"%":k.endsWith("人数")?"人":"万元";
  return '<label>'+k+'（'+unit+'）<input type="number" step="'+(unit==="人"?"1":"any")+'" name="'+k+'" value="'+esc(row[k])+'" '+(calculatedMetrics.includes(k)?"readonly":"")+'></label>';
 }).join("");
 modal(row.id?"编辑财务情况":"新增财务情况",'<div class="fields">'+input("报表类型",type,options.报表类型,true)+input("币种",row.币种||"人民币",["人民币","美元","港元"],true)+'<label>报告年度<input name="年度" type="number" min="1900" max="9999" value="'+esc(yr)+'" required></label><label>报表期间<select name="期间">'+reportPeriodOptions(type,row.期间)+'</select></label>'+metrics+'</div>'+financeReader()+'<h3>相关附件</h3>'+((row.files||[]).map(f=>btn(f.name,"download",f.id,"link")).join(""))+'<label>上传附件<input type="file" name="files" multiple '+(row.files?.length?"":"required")+'></label>',true);
}
function recalcFinance(form) {
 const get=k=>form.elements.namedItem(k).value;
 const calc=(out,a,b,ratio)=>{
  const first=get(a),second=get(b);
  form.elements.namedItem(out).value=(first===""||second===""||(ratio&&Number(second)===0))?"":String(Number((ratio?100*Number(first)/Number(second):Number(first)-Number(second)).toFixed(4)));
 };
 calc("所有者权益","总资产","总负债",false);calc("资产负债率","总负债","总资产",true);calc("流动比率","流动资产","流动负债",true);
}
async function saveFinancial(form,values,newFiles) {
 const items=(db.notes[rid]??={}).财务情况??=[];
 const existing=items.find(r=>r.id===formState.id);
 if(items.some(r=>r.id!==existing?.id&&["报表类型","年度","期间"].every(k=>r[k]===values[k])))throw Error("该期间已有报表，请编辑原记录");
 const files=Array.from(form.elements.files.files);
 if(files.some(f=>f.size>300*1024*1024))throw Error("单个附件最大 300 MB");
 const attachments=[...(existing?.files||[])];
 for(const f of files){const id=uid();await fileStore("readwrite",s=>s.put(f,id));newFiles.push(id);attachments.push({id,name:f.name})}
 delete values.files;delete values.extractFiles;
 Object.assign(values,{files:attachments,报表期间:values.年度+"年 "+values.期间,填写人:"演示用户",填写时间:day()});
 if(existing)Object.assign(existing,values);else items.unshift({...values,id:uid()});
 logs(rid,"更新财务情况");
}
document.addEventListener("change",e=>{
 const form=e.target.form;
 if(form?.id==="dialogForm"&&formState?.mode==="financial"&&e.target.name==="报表类型")form.elements.期间.innerHTML=reportPeriodOptions(e.target.value,"");
});
document.addEventListener("input",e=>{
 if(e.target.form?.id==="dialogForm"&&formState?.mode==="financial"&&financialMetrics.includes(e.target.name))recalcFinance(e.target.form);
});
