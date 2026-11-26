"use strict";
const vendorURL=name=>new URL("vendor/"+name,document.baseURI).href;
const scriptLoads=new Map();
async function loadLocalScript(name) {
 if(!scriptLoads.has(name))scriptLoads.set(name,new Promise((resolve,reject)=>{
  const script=document.createElement("script");script.src=vendorURL(name);script.onload=resolve;
  script.onerror=()=>{scriptLoads.delete(name);script.remove();reject(Error("组件加载失败，请刷新页面重试"))};document.head.append(script);
 }));
 return scriptLoads.get(name);
}
async function extractText(file,progress=()=>{}) {
 if(!file?.size)throw Error("请选择文件");
 if(file.size>300*1024*1024)throw Error("单个文件最大 300 MB");
 const kind=extension(file.name);
 if(["TXT","CSV"].includes(kind))return file.text();
 if(kind==="XLSX"){
  await loadLocalScript("zip.min.js");const zip=await JSZip.loadAsync(file);
  const parse=async entry=>new DOMParser().parseFromString(await entry.async("string"),"application/xml");
  const shared=zip.file("xl/sharedStrings.xml"),strings=shared?Array.from((await parse(shared)).getElementsByTagNameNS("*","si"),e=>e.textContent):[];
  const lines=[];
  for(const sheet of zip.file(/^xl\/worksheets\/sheet\d+\.xml$/)){
   const doc=await parse(sheet);
   for(const row of doc.getElementsByTagNameNS("*","row"))lines.push(Array.from(row.getElementsByTagNameNS("*","c"),c=>{
    const value=c.getElementsByTagNameNS("*","v")[0]?.textContent||"";
    return c.getAttribute("t")==="s"?strings[Number(value)]||"":c.getAttribute("t")==="inlineStr"?c.textContent:value;
   }).join(" "));
  }
  return lines.join("\n");
 }
 if(kind==="DOCX"){
  await loadLocalScript("zip.min.js");
  const archive=await JSZip.loadAsync(file),word=archive.file("word/document.xml");
  if(!word)throw Error("无法读取 Word 文档正文");
  const doc=new DOMParser().parseFromString(await word.async("string"),"application/xml");
  return Array.from(doc.getElementsByTagNameNS("*","p"),p=>Array.from(p.getElementsByTagNameNS("*","t"),n=>n.textContent).join("")).join("\n");
 }
 let worker,pdf;
 async function ocr(image){
  if(!worker){
   progress("正在加载本地识别组件");await loadLocalScript("ocr.min.js");
   worker=await Tesseract.createWorker("chi_sim+eng",1,{workerPath:vendorURL("worker.min.js"),corePath:vendorURL("tesseract-core-lstm.wasm.js"),langPath:vendorURL(""),logger:m=>{if(m.status==="recognizing text")progress("文字识别 "+Math.round(100*m.progress)+"%")}});
  }
  return (await worker.recognize(image)).data.text;
 }
 try{
  if(["PNG","JPG","JPEG"].includes(kind))return await ocr(file);
  if(kind!=="PDF")throw Error("支持 XLSX、DOCX、PDF、PNG、JPG、TXT 和 CSV");
  const pdfjs=await import(vendorURL("pdf.min.mjs"));pdfjs.GlobalWorkerOptions.workerSrc=vendorURL("pdf.worker.min.mjs");
  pdf=await pdfjs.getDocument({data:new Uint8Array(await file.arrayBuffer()),isEvalSupported:false,useSystemFonts:true,cMapUrl:vendorURL("cmaps/"),cMapPacked:true,standardFontDataUrl:vendorURL("standard_fonts/")}).promise;
  const pages=[];
  for(let i=1;i<=pdf.numPages;i++){
   progress("正在读取第 "+i+" / "+pdf.numPages+" 页");
   const page=await pdf.getPage(i),content=await page.getTextContent();
   let text=content.items.map(item=>(item.str||"")+(item.hasEOL?"\n":" ")).join("");
   if(!text.trim()){
    const unit=page.getViewport({scale:1}),vp=page.getViewport({scale:Math.min(2.25,2400/Math.max(unit.width,unit.height))});
    const canvas=document.createElement("canvas");canvas.width=Math.ceil(vp.width);canvas.height=Math.ceil(vp.height);
    await page.render({canvasContext:canvas.getContext("2d"),viewport:vp}).promise;
    text=await ocr(canvas);canvas.width=canvas.height=0;
   }
   pages.push(text);page.cleanup();
  }
  return pages.join("\n");
 }finally{if(worker)await worker.terminate();if(pdf)await pdf.destroy()}
}
const contractPatterns={
 金额:/(?:人民币|[￥¥$])\s*[\d,.]+(?:亿|万|千)?(?:元)?|[\d,.]+(?:亿|万|千)?元|[零〇壹贰叁肆伍陆柒捌玖拾佰仟万亿]+[元圆](?:整)?/g,
 日期:/\d{4}\s*[年./-]\s*\d{1,2}\s*[月./-]\s*\d{1,2}日?/g,
 主体:/(?:甲方|乙方|丙方|签署方|受让方|转让方)\s*[:：]\s*[^\n，,。;；]{2,80}/g,
 比例:/\d+(?:\.\d+)?\s*%/g,
 管辖:/[^。\n；;]{0,60}(?:人民法院|仲裁委员会|管辖法院)[^。\n；;]{0,40}/g
};
function compareContracts(original,signed) {
 const tidy=s=>s.normalize("NFKC").replace(/(?<=[\u3400-\u9fff]) +(?=[\u3400-\u9fff])/g,"");
 return Object.entries(contractPatterns).map(([label,pattern])=>{
  const extract=s=>(tidy(s).match(pattern)||[]).map(x=>x.trim());
  const a=extract(original),b=extract(signed),matched=new Set(),removed=[];
  const normalized=x=>x.replace(/[\s,]/g,"");
  for(const x of a){const j=b.findIndex((y,i)=>!matched.has(i)&&normalized(x)===normalized(y));if(j<0)removed.push(x);else matched.add(j)}
  const added=b.filter((_,i)=>!matched.has(i));
  return [label,removed,added,a.length,b.length];
 });
}
function contractScreen(){
 return panel(title("合同签回核验")+'<h3>上传比对文件</h3><form id="compareFiles"><div class="fields"><label>Word 原件<input name="draft" type="file" accept=".docx" required></label><label>签回件<input name="signed" type="file" accept=".pdf,.png,.jpg,.jpeg" required></label></div><p class="muted">在本机提取原文和扫描件中的金额、日期、主体、比例和管辖条款，差异供人工复核。</p><button class="primary">开始比对</button></form><div id="compareResult" aria-live="polite"></div>');
}
function recognitionScreen(){
 return panel(title("文档识别")+'<form id="recognizeDoc" class="queryline"><label>选择文档<input name="source" type="file" accept=".docx,.pdf,.png,.jpg,.jpeg,.txt,.csv,.xlsx" required></label><button class="primary">识别文字</button></form><div id="recognizedText" aria-live="polite"></div>');
}
function financeReader(){
 return '<section class="structures"><h3>财务解析</h3><label>解析附件（最多 5 个）<input type="file" name="extractFiles" accept=".docx,.pdf,.png,.jpg,.jpeg,.txt,.csv,.xlsx" multiple></label>'+btn("识别财务指标","parseFinancial")+ '<p class="muted" id="extractStatus" aria-live="polite"></p><div id="extractCandidates"></div></section>';
}
async function parseFinancial(button){
 const form=button.form,files=[...form.elements.extractFiles.files],status=form.querySelector("#extractStatus"),result=form.querySelector("#extractCandidates");result.innerHTML="";
 if(!files.length||files.length>5){status.textContent="请选择 1 至 5 个文件";return}
 button.disabled=true;
 try{
  const texts=[];for(const f of files)texts.push(await extractText(f,m=>status.textContent=m));
  const text=texts.join("\n").normalize("NFKC").replace(/(?<=[\u3400-\u9fff]) +(?=[\u3400-\u9fff])/g,"");
  const candidates=[];
  for(const k of financialMetrics.filter(k=>!calculatedMetrics.includes(k))){
   const re=new RegExp(k+"\\s*(?:[（(](万元|元|%|人)[)）])?\\s*[:：,，]?\\s*(-?[0-9][0-9,]*(?:\\.[0-9]+)?)\\s*(万元|元|%|人)?");
   const m=text.match(re);if(!m)continue;
   let value=Number(m[2].replaceAll(",",""));if((m[1]||m[3])==="元"&&!k.endsWith("人数")&&!k.endsWith("率"))value/=10000;
   candidates.push('<label><input type="checkbox" data-metric="'+esc(k)+'" value="'+value+'" checked> '+esc(k)+'　'+value+'</label>');
  }
  status.textContent=candidates.length?"请核对识别值与原件单位，再填入表单。":"未识别到可匹配的财务指标，请按原件填写。";
  result.innerHTML=candidates.length?'<div class="fields">'+candidates.join("")+'</div>'+btn("填入所选指标","applyMetrics"):"";
 }catch(e){status.textContent=e.message}finally{button.disabled=false}
}
document.addEventListener("click",e=>{const el=e.target.closest("[data-a]");if(!el)return;
 if(el.dataset.a==="parseFinancial")parseFinancial(el);
 if(el.dataset.a==="applyMetrics"){for(const input of el.form.querySelectorAll("[data-metric]:checked"))el.form.elements.namedItem(input.dataset.metric).value=input.value;recalcFinance(el.form);el.form.querySelector("#extractStatus").textContent="已填入表单，保存后生效。"}
});
document.addEventListener("submit",async e=>{
 const f=e.target;if(!["compareFiles","recognizeDoc"].includes(f.id))return;e.preventDefault();
 const compare=f.id==="compareFiles",result=document.querySelector(compare?"#compareResult":"#recognizedText"),button=f.querySelector("button");button.disabled=true;
 try{
  const progress=m=>result.textContent=m;progress("正在读取文件…");
  if(compare){
   const a=await extractText(f.elements.draft.files[0],progress),b=await extractText(f.elements.signed.files[0],progress);
   if(!a.trim()||!b.trim())throw Error("有文件未识别到文字，请检查原件和签回件");
   const diff=compareContracts(a,b);result.innerHTML='<h3>关键字段比对结果</h3>'+table(["类别","原件独有","签回件独有","识别数（原件 / 签回件）"],diff.map(([k,removed,added,x,y])=>[k,'<span class="diffOld">'+esc(removed.join("、")||"—")+'</span>','<span class="diffNew">'+esc(added.join("、")||"—")+'</span>',x+" / "+y]))+'<details><summary>核对识别原文</summary><div class="fields"><pre>'+esc(a)+'</pre><pre>'+esc(b)+'</pre></div></details>';
  }else{const text=await extractText(f.elements.source.files[0],progress);result.innerHTML=text.trim()?'<h3>识别结果</h3><pre>'+esc(text)+'</pre>':'<p>未识别到文字。</p>'}
 }catch(error){result.textContent=error.message}finally{button.disabled=false}
});
