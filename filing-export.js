"use strict";
function filingValues(){
 const s=cc().versions[0];
 return [["报送主体编码",bench.filingCode||null,"需按业达确认的编码表配置"],["基金名称",funds[0].name,"基金档案"],["数据截止日","2026-09-30","期间基准"],["实缴出资（万元）",s?s.accounts.reduce((n,a)=>n+(a.opening+a.book)/1000000,0):null,"锁期资本底稿"],["期末净资产（万元）",s?s.nav/1000000:null,"锁期净资产底稿"],["来源季结版本",s&&cc().locked?"V"+s.version:null,"当前锁定版本"]];
}
function filingPage(){
 const values=filingValues(),ready=values.every(x=>x[1]!=null);
 return block(kv("报表样式","基金季度汇总 · 演示字段映射")+kv("签认要求","正式报送的字段、编码与 Excel 版式由业达提供样表后确认。")+form("filingCode",field("code","报送主体编码","text",bench.filingCode||"","required maxlength=40"),"保存映射"))+
 table(["报表字段","取值","校验","来源"],values.map(([key,value,source])=>tr([esc(key),esc(value??"—"),tag(value==null?"待补正":"已确认"),esc(source)])))+
 block(ready?cmd("filingExport","导出 Excel 样表","btn primary"):cmd("nav","查看季度结账条件","btn","close/versions"));
}
function exportFiling(){
 const values=filingValues();if(values.some(x=>x[1]==null))return announce("请先补齐编码并完成本季锁期。");
 const xmlHead='<?xml version="1.0" encoding="UTF-8"?>',main="http://schemas.openxmlformats.org/spreadsheetml/2006/main",rel="http://schemas.openxmlformats.org/officeDocument/2006/relationships",pkg="http://schemas.openxmlformats.org/package/2006/relationships";
 const sheetRows=[["基金季度汇总 · 演示样表"],["报表字段","取值","取数依据"],...values];
 const sheet='<worksheet xmlns="'+main+'"><cols><col min="1" max="3" width="28" customWidth="1"/></cols><sheetData>'+sheetRows.map((row,i)=>'<row r="'+(i+1)+'">'+row.map((v,j)=>{const cell=String.fromCharCode(65+j)+(i+1);return typeof v==="number"?'<c r="'+cell+'"><v>'+v+'</v></c>':'<c r="'+cell+'" t="inlineStr"><is><t>'+esc(v)+'</t></is></c>'}).join("")+'</row>').join("")+'</sheetData></worksheet>';
 const types='<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>';
 const relationship=(type,target)=>'<Relationships xmlns="'+pkg+'"><Relationship Id="rId1" Type="'+rel+'/'+type+'" Target="'+target+'"/></Relationships>';
 const book='<workbook xmlns="'+main+'" xmlns:r="'+rel+'"><sheets><sheet name="季度汇总" sheetId="1" r:id="rId1"/></sheets></workbook>';
 downloadLocal("基金季度汇总-演示样表.xlsx",officeZip({"[Content_Types].xml":xmlHead+types,"_rels/.rels":xmlHead+relationship("officeDocument","xl/workbook.xml"),"xl/workbook.xml":xmlHead+book,"xl/_rels/workbook.xml.rels":xmlHead+relationship("worksheet","worksheets/sheet1.xml"),"xl/worksheets/sheet1.xml":xmlHead+sheet}),"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
}

