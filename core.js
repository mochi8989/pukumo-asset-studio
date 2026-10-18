/* Pukumo Asset Studio: pure naming, layout, CSV and ZIP utilities. No dependencies. */
(function(root){
'use strict';
const enc=new TextEncoder();
function normalize(value){const normalized=String(value).normalize('NFKC').trim().replace(/[\x00-\x1f\x7f<>:"/\\|?*]/g,'_').replace(/\s+/g,'_').replace(/[. ]+$/g,'');let out='';for(const char of normalized){if(enc.encode(out+char).length>80)break;out+=char;}return out||'untitled';}
function filename(id,name,index,digits,color,ext){return `${id}_${normalize(name)}_${String(index).padStart(digits,'0')}_${normalize(color||'color'+String(index).padStart(2,'0'))}.${ext}`;}
// Rows contain almost the same count; their heights are proportional to counts.
// Thus every cell has exactly 1/n area, without empty cells (subpixel rounding at render).
function layout(n,size,mode='auto'){
 if(!Number.isInteger(n)||n<1||!Number.isInteger(size)||size<1)throw Error('配置サイズが不正です。');
 if(mode==='auto')mode=n<=5?'stripes':'grid';
 const rows=mode==='stripes'?1:Math.max(1,Math.round(Math.sqrt(n)));
 const base=Math.floor(n/rows),extra=n%rows,rects=[];let used=0;
 for(let r=0;r<rows;r++){const count=base+(r<extra?1:0);for(let c=0;c<count;c++)rects.push({x:c*size/count,y:used*size/n,w:size/count,h:count*size/n});used+=count;}
 return rects;
}
const table=Uint32Array.from({length:256},(_,n)=>{let c=n;for(let i=0;i<8;i++)c=c&1?0xedb88320^(c>>>1):c>>>1;return c>>>0;});
function crc32(bytes){let c=0xffffffff;for(const b of bytes)c=table[(c^b)&255]^(c>>>8);return (c^0xffffffff)>>>0;}
async function zip(entries){
 const local=[],central=[];let offset=0;const names=new Set();
 for(const entry of entries){
  if(names.has(entry.name)||!entry.name||entry.name.startsWith('/')||entry.name.split('/').includes('..'))throw Error('ZIPの重複名・不正パス');names.add(entry.name);
  const name=enc.encode(entry.name),data=new Uint8Array(await entry.blob.arrayBuffer()),crc=crc32(data),h=new Uint8Array(30),v=new DataView(h.buffer);
  v.setUint32(0,0x04034b50,true);v.setUint16(4,20,true);v.setUint16(6,0x800,true);v.setUint16(12,33,true);v.setUint32(14,crc,true);v.setUint32(18,data.length,true);v.setUint32(22,data.length,true);v.setUint16(26,name.length,true);
  const c=new Uint8Array(46),d=new DataView(c.buffer);d.setUint32(0,0x02014b50,true);d.setUint16(4,20,true);d.setUint16(6,20,true);d.setUint16(8,0x800,true);d.setUint16(14,33,true);d.setUint32(16,crc,true);d.setUint32(20,data.length,true);d.setUint32(24,data.length,true);d.setUint16(28,name.length,true);d.setUint32(42,offset,true);
  local.push(h,name,data);central.push(c,name);offset+=30+name.length+data.length;
 }
 const centralSize=central.reduce((n,a)=>n+a.length,0),end=new Uint8Array(22),e=new DataView(end.buffer);e.setUint32(0,0x06054b50,true);e.setUint16(8,entries.length,true);e.setUint16(10,entries.length,true);e.setUint32(12,centralSize,true);e.setUint32(16,offset,true);
 return new Blob([...local,...central,end],{type:'application/zip'});
}
async function verifyZip(blob,expected){
 const bytes=new Uint8Array(await blob.arrayBuffer()),v=new DataView(bytes.buffer),end=bytes.length-22;
 if(end<0||v.getUint32(end,true)!==0x06054b50)throw Error('ZIP終端不正');
 const count=v.getUint16(end+10,true),offset=v.getUint32(end+16,true);let p=offset;const names=[];
 if(count!==expected.length||offset+v.getUint32(end+12,true)!==end)throw Error('ZIP項目欠落');
 for(let i=0;i<count;i++){
  if(p+46>end||v.getUint32(p,true)!==0x02014b50)throw Error('ZIP目次不正');
  const nl=v.getUint16(p+28,true),size=v.getUint32(p+24,true),crc=v.getUint32(p+16,true),at=v.getUint32(p+42,true),name=new TextDecoder().decode(bytes.subarray(p+46,p+46+nl));
  if(at+30>offset||v.getUint32(at,true)!==0x04034b50||v.getUint32(at+22,true)!==size||v.getUint32(at+14,true)!==crc||v.getUint16(at+26,true)!==nl)throw Error('ZIPヘッダー不正');
  const begin=at+30+nl;if(begin+size>offset||new TextDecoder().decode(bytes.subarray(at+30,begin))!==name||crc32(bytes.subarray(begin,begin+size))!==crc)throw Error('ZIP CRC不一致');
  if(name!==expected[i].name||size!==expected[i].blob.size)throw Error('ZIPファイル欠落');
  // Compare exact bytes to keep original image quality and prevent payload swaps.
  const original=new Uint8Array(await expected[i].blob.arrayBuffer());if(!original.every((b,j)=>b===bytes[begin+j]))throw Error('ZIP内容不一致');
  names.push(name);p+=46+nl;
 }
 if(p!==end||new Set(names).size!==count)throw Error('ZIP重複・目次不正');return names;
}
const columns=['商品名','商品ID','登録日','販売日','販売状況','カテゴリ','色数','色名','販売用ファイル名','pCloud保存先','BOOTH URL','Etsy URL'];
function date(value){if(!value)return '';const m=String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);return m?`${m[2]}/${m[3]}/${m[1]}`:'';}
function csv(products){const escape=v=>'"'+String(v??'').replace(/"/g,'""')+'"';return '\ufeff'+[columns,...products.map(p=>[p.name,p.id,date(p.created),date(p.saleDate),p.saleStatus,p.category,p.colors.length,p.colors.join(' / '),p.zipName,p.cloud,p.booth,p.etsy])].map(r=>r.map(escape).join(',')).join('\r\n')+'\r\n';}
function today(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
const api={normalize,filename,layout,crc32,zip,verifyZip,csv,date,today};root.PukumoCore=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
