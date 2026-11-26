"use strict";
// Stored ZIP entries keep the original bytes, including PDF and Office documents.
async function documentArchive(files) {
 const blocks=[], directory=[], encoder=new TextEncoder(), used=new Set();
 let offset=0;
 const header=n=>new DataView(new ArrayBuffer(n));
 for(const file of files){
  let name=file.name.replace(/[\\/]/g,"_"),index=1;
  while(used.has(name))name=(++index)+"-"+file.name.replace(/[\\/]/g,"_");
  used.add(name);
  const label=encoder.encode(name);
  if(offset+file.size+label.length+30>0xffffffff)throw Error("所选文件总量超过 ZIP 打包上限");
  let crc=-1;
  const reader=file.stream().getReader();
  try{while(true){const {done,value}=await reader.read();if(done)break;
   for(const byte of value)crc=(crc>>>8)^zipCrc[(crc^byte)&255];
  }}finally{reader.releaseLock()}
  crc=(crc^-1)>>>0;
  const local=header(30),central=header(46);
  local.setUint32(0,0x04034b50,true);local.setUint16(4,20,true);local.setUint16(6,2048,true);
  local.setUint16(12,33,true);local.setUint32(14,crc,true);local.setUint32(18,file.size,true);local.setUint32(22,file.size,true);local.setUint16(26,label.length,true);
  central.setUint32(0,0x02014b50,true);central.setUint16(4,20,true);
  new Uint8Array(central.buffer,6,24).set(new Uint8Array(local.buffer,4,24));
  central.setUint32(42,offset,true);directory.push(central.buffer,label);
  blocks.push(local.buffer,label,file);offset+=30+label.length+file.size;
 }
 const length=directory.reduce((s,part)=>s+part.byteLength,0),end=header(22);
 if(files.length>65535||offset+length>0xffffffff)throw Error("所选文件超出 ZIP 打包上限");
 end.setUint32(0,0x06054b50,true);end.setUint16(8,files.length,true);end.setUint16(10,files.length,true);end.setUint32(12,length,true);end.setUint32(16,offset,true);
 return new Blob([...blocks,...directory,end.buffer],{type:"application/zip"});
}
const zipCrc=Uint32Array.from({length:256},(_,i)=>{let value=i;for(let bit=0;bit<8;bit++)value=value&1?(0xedb88320^(value>>>1)):value>>>1;return value});
