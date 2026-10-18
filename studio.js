/* Browser-only orchestration. Original checker owns all source decoding and edge inspection. */
(async()=>{
'use strict';
const C=window.PukumoCore,checker=window.PukumoChecker,$=id=>document.getElementById(id);
const section=document.createElement('section');section.className='panel studio';section.id='studio';section.innerHTML=`
<h2>販売準備をまとめて生成</h2><p>01 画像を投入 → 02 商品情報を設定 → 03 ZIPを生成 → 04 Notion用CSVへ</p>
<p class="muted">端ピクセルの一致は自然なシームレス性を保証しません。上のタイル・拡大表示も確認してください。原本画像は端末外へ送信されません。</p>
<div id="storage-state" class="notice" role="status">保存領域を開いています…</div>
<fieldset id="studio-fields" disabled>
<h3>商品情報</h3><div class="fields">
<label>商品ID<input id="product-id" readonly placeholder="生成時に発行"></label><label>商品名<input id="product-name" maxlength="80" placeholder="star_pattern"></label>
<label>カテゴリ<input id="category"></label><label>pCloud保存先<input id="cloud" placeholder="保存先を手動入力"></label>
<label>検査モード<select id="inspection-mode"><option value="strict">端ピクセル一致のみ販売（合格）</option><option value="exempt">通常イラスト（検査対象外）</option></select></label>
<label>開始連番<input id="sequence" type="number" min="1" max="999999" value="1"></label><label>連番桁数<input id="digits" type="number" min="1" max="8" value="2"></label>
<label>正規化<select id="normalize"><option value="safe">NFKC・空白と禁止文字を置換（日本語保持）</option><option value="lower">上記＋英字を小文字にする</option></select></label></div>
<button id="new-product">別の商品として作成</button><p id="current-product" class="muted">同じ商品IDで再生成すると商品情報を更新します。</p>
<h3>画像ごとの色名</h3><p class="muted">空欄はcolor01などを付与します。連番は入力順、標準の紹介画像は販売ファイル名順です。</p><div id="color-list" class="table-scroll"></div>
<details><summary>紹介画像・透かし・READMEの共通設定</summary><h3>紹介画像</h3><div class="fields">
<label>出力サイズ（正方形 px）<input id="output-size" type="number" min="256" max="4096" value="2000"></label>
<label>レイアウト<select id="layout-mode"><option value="auto">自動（1〜5枚：縦帯、6枚以上：グリッド）</option><option value="stripes">縦帯</option><option value="grid">グリッド</option></select></label>
<label>配置順<select id="sort-mode"><option value="name">販売ファイル名順</option><option value="input">入力順</option><option value="reverse">販売ファイル名の逆順</option></select></label>
<label>切り抜き位置 横（0〜100%）<input id="crop-x" type="number" min="0" max="100" value="50"></label><label>切り抜き位置 縦（0〜100%）<input id="crop-y" type="number" min="0" max="100" value="50"></label></div>
<h3>透かしPNG</h3><p class="muted">1000×1000pxの透過PNGを推奨。販売原本へは適用しません。</p><label>PNGを登録<input id="watermark-file" type="file" accept="image/png,.png"></label><p id="watermark-state">未登録</p><div class="fields">
<label>表示幅 px<input id="wm-width" type="number" min="10" max="2000" value="300"></label><label>透明度 %<input id="wm-opacity" type="number" min="1" max="100" value="20"></label><label>回転角度 °<input id="wm-angle" type="number" min="-180" max="180" value="-30"></label><label>間隔 px<input id="wm-gap" type="number" min="0" max="2000" value="100"></label><label>繰り返し<select id="wm-repeat"><option value="yes">ON</option><option value="no">OFF</option></select></label></div>
<h3>README.txt</h3><p class="muted">未登録では販売用ZIPを生成できません。利用規約の本文はご自身で登録してください。</p><label>UTF-8 TXTを読み込む<input id="readme-file" type="file" accept=".txt,text/plain"></label><label>README本文<textarea id="readme" placeholder="ここに用意した本文を入力"></textarea></label><button id="save-settings">共通設定を保存</button></details>
<div class="actions"><button id="generate" class="primary">販売準備ファイルを一括生成</button><button id="cancel-generation" disabled>生成を中止</button></div>
<progress id="generation-progress" max="100" value="0" aria-label="生成の進捗"></progress><div id="generation-state" class="notice" role="status" aria-live="polite">画像とREADMEを登録してください。</div><pre id="quality" class="quality"></pre><div id="downloads" class="downloads"></div><img id="output-preview" class="preview-output" alt="生成した紹介画像" hidden>
<h3>商品登録待ち一覧</h3><div class="fields"><label>検索<input id="product-search" type="search" placeholder="商品ID・商品名・カテゴリ"></label></div>
<div class="actions"><button id="select-visible">表示中を全選択</button><button id="csv-export">選択商品をNotion用CSVへ</button><button id="mark-registered">選択商品を登録済みに</button><button id="delete-products">選択商品を削除</button></div>
<p class="muted">CSV出力後は「CSV出力済み」、Notion取り込み後は手動で「登録済み」にします。</p><div id="products" class="table-scroll"></div>
<dialog id="edit-dialog"><form method="dialog"><h3>商品情報を編集</h3><div id="edit-fields" class="fields"></div><button type="button" id="close-edit">閉じる</button><button type="button" id="save-product">保存</button></form></dialog>
<details><summary>バックアップと復元</summary><p>設定・透かし・商品一覧・CSV履歴をJSONに保存。原本画像と生成ZIPは含みません。復元時、同じ商品IDの既存データと現在の設定を保持し、新しい商品だけ追加します。空の保存領域では設定も復元します。既存の共通設定を置き換える場合は下の項目を選択してください。</p><button id="backup">JSONを書き出し</button><label><input id="restore-settings" type="checkbox">共通設定も復元する（現在のREADME・透かし・設定を置き換える）</label><label>JSONを復元<input id="restore" type="file" accept=".json,application/json"></label><p id="backup-state" role="status"></p></details>
</fieldset>`;
document.querySelector('main').append(section);
let db,settings={},watermark=null,products=[],history=[],colors=new Map(),currentId='',busy=false,cancelled=false,seenRun=-1,urls=[],editing=null;
const ids=['sequence','digits','normalize','inspection-mode','output-size','layout-mode','sort-mode','crop-x','crop-y','wm-width','wm-opacity','wm-angle','wm-gap','wm-repeat','readme'];
const selected=new Set();
const msg=(s,error=false)=>{$('generation-state').textContent=s;$('generation-state').classList.toggle('error',error);};
function transaction(stores,mode,action){return new Promise((resolve,reject)=>{const tx=db.transaction(stores,mode);let value;try{value=action(tx);}catch(e){tx.abort();reject(e);return;}tx.oncomplete=()=>resolve(typeof value==='function'?value():value);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||Error('保存を中止しました'));});}
function getAll(store){return new Promise((resolve,reject)=>{const r=db.transaction(store).objectStore(store).getAll();r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
function get(store,key){return new Promise((resolve,reject)=>{const r=db.transaction(store).objectStore(store).get(key);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
async function put(store,value){return transaction([store],'readwrite',tx=>tx.objectStore(store).put(value));}
async function refresh(){products=await getAll('products');history=await getAll('history');renderProducts();}
function readSettings(){return Object.fromEntries(ids.map(id=>[id,$(id).value]));}
function numeric(id,min,max){const n=Number($(id).value);if(!Number.isFinite(n)||!Number.isInteger(n)||n<min||n>max)throw Error(id+'：'+min+'〜'+max+'の整数を入力してください。');return n;}
function validateSettings(){numeric('sequence',1,999999);numeric('digits',1,8);numeric('output-size',256,4096);numeric('crop-x',0,100);numeric('crop-y',0,100);numeric('wm-width',10,2000);numeric('wm-opacity',1,100);numeric('wm-angle',-180,180);numeric('wm-gap',0,2000);}
async function saveSettings(){validateSettings();settings=readSettings();await put('settings',{key:'common',value:settings,watermark});$('storage-state').textContent='設定はこのブラウザのIndexedDBに保存済みです。定期的にJSONバックアップを保存してください。';}
async function allocateId(){let id;await transaction(['meta','products'],'readwrite',tx=>{const s=tx.objectStore('meta'),r=s.get('counter');r.onsuccess=()=>{const n=(r.result?.value||0)+1;id='PKM-'+String(n).padStart(4,'0');s.put({key:'counter',value:n});};});return id;}
function bind(id,fn){$(id).addEventListener('click',()=>Promise.resolve().then(fn).catch(e=>msg(e.message,true)));}
function dl(name,blob,parent=$('downloads')){const a=document.createElement('a'),url=URL.createObjectURL(blob);urls.push(url);a.href=url;a.download=name;a.textContent=name;parent.append(a);return a;}
function download(name,blob){const a=dl(name,blob);a.click();}
function resetOutputs(){for(const u of urls)URL.revokeObjectURL(u);urls=[];$('downloads').replaceChildren();$('output-preview').hidden=true;$('output-preview').removeAttribute('src');}
function td(text){const e=document.createElement('td');e.textContent=text;return e;}
function renderColors(){const snap=checker.snapshot();if(snap.run===seenRun)return;seenRun=snap.run;colors=new Map();const table=document.createElement('table');const head=document.createElement('tr');for(const h of ['元ファイル','色名'])head.append(td(h));table.append(head);snap.rows.forEach((row,i)=>{const tr=document.createElement('tr'),cell=document.createElement('td'),input=document.createElement('input');input.placeholder='color'+String(i+1).padStart(2,'0');input.setAttribute('aria-label',row.name+' の色名');input.maxLength=80;input.addEventListener('input',()=>colors.set(row,input.value));cell.append(input);tr.append(td(row.name),cell);table.append(tr);});$('color-list').replaceChildren(table);}
// Batch rows are populated asynchronously after run changes; observe the table as well.
new MutationObserver(()=>{seenRun=-1;if(!busy)renderColors();}).observe($('results'),{childList:true});
setInterval(()=>{if(!busy)renderColors();},500);
function drawCover(ctx,image,r,x,y){r={x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.x+r.w)-Math.round(r.x),h:Math.round(r.y+r.h)-Math.round(r.y)};const scale=Math.max(r.w/image.naturalWidth,r.h/image.naturalHeight),sw=r.w/scale,sh=r.h/scale;ctx.save();ctx.beginPath();ctx.rect(r.x,r.y,r.w,r.h);ctx.clip();ctx.drawImage(image,(image.naturalWidth-sw)*x,(image.naturalHeight-sh)*y,sw,sh,r.x,r.y,r.w,r.h);ctx.restore();}
function newCanvas(size){const c=document.createElement('canvas');c.width=c.height=size;if(!c.getContext('2d'))throw Error('Canvasが利用できません');return c;}
function toBlob(c){return new Promise((resolve,reject)=>c.toBlob(b=>b?resolve(b):reject(Error('画像の出力に失敗しました')),'image/png'));}
async function loadImage(blob){const url=URL.createObjectURL(blob),img=new Image();try{await new Promise((res,rej)=>{img.onload=res;img.onerror=()=>rej(Error('画像を読み込めません'));img.src=url;});return img;}finally{URL.revokeObjectURL(url);}}
function transparent(image){const c=document.createElement('canvas'),ctx=c.getContext('2d',{willReadFrequently:true});c.width=image.naturalWidth;c.height=Math.min(64,image.naturalHeight);try{for(let y=0;y<image.naturalHeight;y+=64){const h=Math.min(64,image.naturalHeight-y);ctx.clearRect(0,0,c.width,c.height);ctx.drawImage(image,0,y,c.width,h,0,0,c.width,h);const d=ctx.getImageData(0,0,c.width,h).data;for(let i=3;i<d.length;i+=4)if(d[i]<255)return true;}return false;}finally{c.width=c.height=1;}}
function stamp(canvas,img,s){const ctx=canvas.getContext('2d'),w=Number(s['wm-width']),h=w*img.naturalHeight/img.naturalWidth,gap=Number(s['wm-gap']),angle=Number(s['wm-angle'])*Math.PI/180;ctx.save();ctx.globalAlpha=Number(s['wm-opacity'])/100;ctx.translate(canvas.width/2,canvas.height/2);ctx.rotate(angle);if(s['wm-repeat']==='no'){ctx.drawImage(img,-w/2,-h/2,w,h);}else{const extent=Math.ceil(Math.hypot(canvas.width,canvas.height)/2);if((2*extent/(w+gap)+2)*(2*extent/(h+gap)+2)>50000)throw Error('透かしが密すぎます。表示幅・間隔を広げてください。');for(let y=-extent-h;y<extent+h;y+=h+gap)for(let x=-extent-w;x<extent+w;x+=w+gap)ctx.drawImage(img,x,y,w,h);}ctx.restore();}
function compactAnalysis(result){return Object.fromEntries(Object.entries(result).map(([axis,r])=>[axis,{pass:r.pass,count:r.count,length:r.length,maxDifference:r.maxDifference,differences:Array.from(r.differences)}]));}
async function checkPNG(blob,size){const image=await loadImage(blob);try{if(image.naturalWidth!==size||image.naturalHeight!==size)throw Error('生成画像の寸法が不正です');}finally{image.src='';}}
function checkCancelled(run){if(cancelled||checker.snapshot().run!==run)throw Error('生成を中止しました。入力画像が変更された場合は再生成してください。');}
const tick=()=>new Promise(r=>setTimeout(r,0));
async function generate(){
 if(busy)return;resetOutputs();$('generation-progress').value=0;const snap=checker.snapshot();if(snap.busy)throw Error('画像の検査が完了するまでお待ちください。');if(!$('product-name').value.trim())throw Error('商品名を入力してください。');validateSettings();
 if(!$('readme').value.trim())throw Error('README未登録：共通設定に本文を登録してください。販売用ZIPは生成しません。');
 const exempt=$('inspection-mode').value==='exempt',rows=snap.rows.filter(r=>r.status==='good'||(exempt&&r.status==='diff'));
 if(!rows.length)throw Error('販売対象の画像が0枚です。ZIPは生成しません。');
 busy=true;cancelled=false;resetOutputs();msg('生成の準備をしています…');$('generation-progress').value=0;$('studio-fields').disabled=true;$('cancel-generation').disabled=false; // fieldset disabled is overridden below by moving cancel outside
 section.append($('cancel-generation'));const issues=[],inspections=[],management=[];let canvas,wm;
 const report=(level,text)=>{issues.push({level,text});$('quality').textContent=issues.map(x=>`[${x.level}] ${x.text}`).join('\n');};$('quality').textContent='';
 try{
  await saveSettings();const s={...settings},size=Number(s['output-size']);
  if(!currentId){currentId=await allocateId();$('product-id').value=currentId;}
  const old=await get('products',currentId),name=$('product-name').value.trim(),safeName=C.normalize(s.normalize==='lower'?name.toLowerCase():name),base=currentId+'_'+safeName;
  for(const row of snap.rows)if(!rows.includes(row)){report('警告',row.name+'：販売用ZIPから除外（'+row.status+'）');inspections.push({source:row.name,status:row.status==='diff'?'failed':'error',detail:row.label.textContent});}
  const items=rows.map((row,i)=>{let color=colors.get(row)?.trim()||'color'+String(i+1).padStart(2,'0');if(s.normalize==='lower')color=color.toLowerCase();return {row,color,index:i};});
  for(const item of items){checkCancelled(snap.run);const blob=await item.row.getBlob(snap.run),info=checker.info(new Uint8Array(await blob.arrayBuffer())),ext={'image/png':'png','image/jpeg':'jpg','image/webp':'webp'}[info.type];item.blob=blob;item.name=C.filename(currentId,safeName,Number(s.sequence)+item.index,Number(s.digits),item.color,ext);}
  if(new Set(items.map(i=>i.name.toLowerCase())).size!==items.length)throw Error('ファイル名が重複しています。');
  if(s['sort-mode']!=='input')items.sort((a,b)=>a.name<b.name?-1:a.name>b.name?1:0);if(s['sort-mode']==='reverse')items.reverse();
  const rects=C.layout(items.length,size,s['layout-mode']);canvas=newCanvas(size);const ctx=canvas.getContext('2d');
  if(watermark)wm=await loadImage(watermark);else report('警告','透かし未登録：preview_watermarked.pngと個別見本は生成しません。');
  let firstSize='';
  for(let i=0;i<items.length;i++){
   checkCancelled(snap.run);msg(`画像を生成中 ${i+1} / ${items.length}`);$('generation-progress').value=Math.round(i/items.length*70);await tick();
   const item=items[i],image=await checker.decode(item.blob,snap.run);
   try{
    const analysis=checker.analyze(image);if(!exempt&&(!analysis.horizontal.pass||!analysis.vertical.pass))throw Error('再検査で不一致：'+item.row.name);
    const info=checker.info(new Uint8Array(await item.blob.arrayBuffer())),hasAlpha=transparent(image),dimensions=image.naturalWidth+'×'+image.naturalHeight;
    if(firstSize&&firstSize!==dimensions)report('警告',item.name+'：色違い画像で寸法が異なります（'+dimensions+'）');firstSize=firstSize||dimensions;
    if(image.naturalWidth<size||image.naturalHeight<size)report('警告',item.name+'：見本出力時に拡大される場合があります');
    inspections.push({source:item.row.name,file:item.name,status:exempt?'exempt':'passed',width:image.naturalWidth,height:image.naturalHeight,bytes:item.blob.size,type:info.type,transparent:hasAlpha,edges:compactAnalysis(analysis)});
    drawCover(ctx,image,rects[i],Number(s['crop-x'])/100,Number(s['crop-y'])/100);
    if(wm){const sample=newCanvas(size);try{drawCover(sample.getContext('2d'),image,{x:0,y:0,w:size,h:size},Number(s['crop-x'])/100,Number(s['crop-y'])/100);stamp(sample,wm,s);const blob=await toBlob(sample);await checkPNG(blob,size);management.push({name:'watermarked/'+item.name.replace(/\.[^.]+$/,'.png'),blob});}finally{sample.width=sample.height=1;}}
    report('正常',item.name+'：'+dimensions+' / '+info.type+' / '+(hasAlpha?'透過あり':'透過なし')+' / '+(exempt?'検査対象外':'合格'));
   }finally{image.src='';}
  }
  checkCancelled(snap.run);const preview=await toBlob(canvas);await checkPNG(preview,size);management.unshift({name:'preview.png',blob:preview});
  if(wm){stamp(canvas,wm,s);const blob=await toBlob(canvas);await checkPNG(blob,size);management.push({name:'preview_watermarked.png',blob});}
  const area=size*size/items.length;if(rects.some(r=>Math.abs(r.w*r.h-area)>0.01))throw Error('紹介画像の面積が不均等です');report('正常',`紹介画像 ${size}×${size}px・全${items.length}領域の均等面積を確認（画素境界は丸め）`);
  const product={...old,id:currentId,name,created:old?.created||C.today(),category:$('category').value,cloud:$('cloud').value,colors:items.map(i=>i.color),zipName:base+'.zip',status:old?.status||'未登録',saleDate:old?.saleDate||'',saleStatus:old?.saleStatus||'',booth:old?.booth||'',etsy:old?.etsy||'',updated:new Date().toISOString(),inspectionMode:exempt?'exempt':'strict'};
  const sale=items.map(i=>({name:i.name,blob:i.blob}));sale.push({name:'README.txt',blob:new Blob([s.readme],{type:'text/plain;charset=utf-8'})});
  // Sale allowlist is constructed only from untouched source blobs and README.
  $('generation-progress').value=78;msg('ZIPを生成し、全ファイルの内容・CRCを再検証しています…');await tick();
  const saleZip=await C.zip(sale);await C.verifyZip(saleZip,sale);report('正常','販売用ZIP：原本バイト完全一致、README同梱、管理ファイル混入なし、CRC・一覧検証済み');
  management.push({name:'manifest.json',blob:new Blob([JSON.stringify({version:'1.2',product,settings:{...s,readme:undefined},layout:rects,files:items.map(i=>i.name)},null,2)],{type:'application/json'})},{name:'inspection.json',blob:new Blob([JSON.stringify({version:'1.2',issues,images:inspections},null,2)],{type:'application/json'})});
  const assetsZip=await C.zip(management);await C.verifyZip(assetsZip,management);checkCancelled(snap.run);report('正常','管理用ZIP：全ファイル・CRC検証済み');
  await transaction(['products'],'readwrite',tx=>{const store=tx.objectStore('products'),request=store.get(product.id);request.onsuccess=()=>{if(request.result)product.status=request.result.status;store.put(product);};});await refresh();dl(product.zipName,saleZip);dl(base+'_assets.zip',assetsZip);const previewURL=URL.createObjectURL(preview);urls.push(previewURL);$('output-preview').src=previewURL;$('output-preview').hidden=false;$('generation-progress').value=100;msg('生成完了。2つのZIPをそれぞれ保存してください。商品情報を登録待ち一覧に保存しました。');
 }catch(e){report('エラー',e.message);resetOutputs();msg('出力を停止しました：'+e.message,true);}
 finally{if(canvas)canvas.width=canvas.height=1;if(wm)wm.src='';busy=false;$('studio-fields').disabled=false;$('generate').after($('cancel-generation'));$('cancel-generation').disabled=true;}
}
bind('generate',async()=>{try{await generate();}catch(e){$('quality').textContent='[エラー] '+e.message;throw e;}});bind('cancel-generation',()=>{cancelled=true;});bind('save-settings',async()=>{await saveSettings();msg('共通設定を保存しました。');});
bind('new-product',()=>{currentId='';$('product-id').value='';$('product-name').value='';$('category').value='';$('cloud').value='';resetOutputs();msg('次の生成時に新しい商品IDを発行します。');});
$('readme-file').addEventListener('change',async e=>{try{const f=e.target.files[0];if(!f)return;if(f.size>2*1024*1024)throw Error('READMEは2MiB以下にしてください。');const text=new TextDecoder('utf-8',{fatal:true}).decode(await f.arrayBuffer());$('readme').value=text;await saveSettings();msg('READMEを保存しました。');}catch(err){msg(err.message,true);}finally{e.target.value='';}});
$('watermark-file').addEventListener('change',async e=>{let img;try{const f=e.target.files[0];if(!f)return;if(f.size>5*1024*1024)throw Error('透かしは5MiB以下にしてください。');const info=checker.info(new Uint8Array(await f.arrayBuffer()));if(info.type!=='image/png')throw Error('透かしにはPNGを登録してください。');img=await loadImage(f);if(!transparent(img))throw Error('透過のないPNGです。透過PNGを登録してください。');watermark=f;await saveSettings();$('watermark-state').textContent='登録済み：'+img.naturalWidth+'×'+img.naturalHeight+' px';}catch(err){msg(err.message,true);}finally{if(img)img.src='';e.target.value='';}});
function visibleProducts(){const q=$('product-search').value.toLowerCase();return products.filter(p=>[p.id,p.name,p.category].join(' ').toLowerCase().includes(q));}
function renderProducts(){const table=document.createElement('table'),head=document.createElement('tr');for(const h of ['選択','商品ID / 商品名','登録日 / 色数','カテゴリ / pCloud','Notion登録状況','操作'])head.append(td(h));table.append(head);for(const p of visibleProducts()){const tr=document.createElement('tr'),cell=document.createElement('td'),input=document.createElement('input');input.type='checkbox';input.checked=selected.has(p.id);input.setAttribute('aria-label',p.id+'を選択');input.onchange=()=>input.checked?selected.add(p.id):selected.delete(p.id);cell.append(input);const actions=document.createElement('td');for(const [text,fn] of [['編集',()=>editProduct(p)],['再加工',()=>{currentId=p.id;$('product-id').value=p.id;$('product-name').value=p.name;$('category').value=p.category||'';$('cloud').value=p.cloud||'';msg(p.id+'を選択しました。対応する原本画像を投入して生成してください。');$('studio').scrollIntoView();}]]){const b=document.createElement('button');b.textContent=text;b.onclick=fn;actions.append(b);}tr.append(cell,td(p.id+' / '+p.name),td(p.created+' / '+p.colors.length+'色'),td((p.category||'')+' / '+(p.cloud||'')),td(p.status),actions);table.append(tr);}$('products').replaceChildren(table);}
$('product-search').addEventListener('input',renderProducts);bind('select-visible',()=>{for(const p of visibleProducts())selected.add(p.id);renderProducts();});
function chosen(){const list=products.filter(p=>selected.has(p.id));if(!list.length)throw Error('商品を選択してください。');return list;}
function editProduct(p){editing=p.id;$('edit-fields').replaceChildren();for(const [key,label,type] of [['name','商品名','text'],['category','カテゴリ','text'],['cloud','pCloud保存先','text'],['saleDate','販売日','date'],['saleStatus','販売状況','text'],['booth','BOOTH URL','text'],['etsy','Etsy URL','text'],['colors','色名（1行1色）','textarea'],['status','Notion登録状況','select']]){const l=document.createElement('label');l.textContent=label;const input=document.createElement(type==='select'?'select':type==='textarea'?'textarea':'input');input.id='edit-'+key;if(type==='select')for(const status of ['未登録','CSV出力済み','登録済み']){const o=document.createElement('option');o.textContent=status;input.append(o);}else if(type!=='textarea')input.type=type;input.value=key==='colors'?p.colors.join('\n'):p[key]||'';l.append(input);$('edit-fields').append(l);}$('edit-dialog').showModal();}
bind('close-edit',()=>$('edit-dialog').close());
bind('save-product',async()=>{const p=await get('products',editing);for(const key of ['name','category','cloud','saleDate','saleStatus','booth','etsy','status'])p[key]=$('edit-'+key).value;p.colors=$('edit-colors').value.split('\n').map(s=>s.trim()).filter(Boolean);if(!p.name.trim())throw Error('商品名を入力してください');await put('products',p);$('edit-dialog').close();await refresh();});
bind('mark-registered',async()=>{const list=chosen();await transaction(['products'],'readwrite',tx=>{for(const p of list)tx.objectStore('products').put({...p,status:'登録済み'});});await refresh();});
bind('delete-products',async()=>{const list=chosen();if(!confirm(`${list.length}件の商品情報を削除します。元画像・保存済みZIPは削除しません。よろしいですか？`))return;await transaction(['products'],'readwrite',tx=>{for(const p of list)tx.objectStore('products').delete(p.id);});selected.clear();await refresh();});
bind('csv-export',async()=>{const list=chosen();if(list.some(p=>p.status!=='未登録')&&!confirm('CSV出力済み・登録済みの商品が含まれます。Notionで重複する可能性があります。再出力しますか？'))return;const filename='pukumo_notion_'+C.today().replace(/-/g,'')+'.csv',blob=new Blob([C.csv(list)],{type:'text/csv;charset=utf-8'});await transaction(['products','history'],'readwrite',tx=>{for(const p of list)tx.objectStore('products').put({...p,status:'CSV出力済み'});tx.objectStore('history').put({id:crypto.randomUUID(),date:new Date().toISOString(),products:list.map(p=>p.id),filename});});download(filename,blob);await refresh();msg('CSVを出力しました。ダウンロードリンクから再保存もできます。');});
async function blobData(blob){return new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=rej;r.readAsDataURL(blob);});}
bind('backup',async()=>{await saveSettings();await refresh();const data={app:'Pukumo Asset Studio',version:1,exported:new Date().toISOString(),settings,watermark:watermark?await blobData(watermark):null,products,history,counter:(await get('meta','counter'))?.value||0};download('pukumo_backup_'+C.today()+'.json',new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));});
function validateBackup(b){if(b.app!=='Pukumo Asset Studio'||b.version!==1||!Array.isArray(b.products)||!Array.isArray(b.history)||!b.settings||typeof b.settings!=='object'||b.products.length>10000||b.history.length>50000)throw Error('バックアップ形式が不正です');if(!Number.isSafeInteger(b.counter)||b.counter<0||b.counter>9999999999)throw Error('商品IDカウンターが不正です');
const limits={'sequence':[1,999999],'digits':[1,8],'output-size':[256,4096],'crop-x':[0,100],'crop-y':[0,100],'wm-width':[10,2000],'wm-opacity':[1,100],'wm-angle':[-180,180],'wm-gap':[0,2000]};for(const [key,[min,max]] of Object.entries(limits)){const n=Number(b.settings[key]);if(!Number.isInteger(n)||n<min||n>max)throw Error('設定値が不正です：'+key);}for(const [key,allowed] of Object.entries({'normalize':['safe','lower'],'inspection-mode':['strict','exempt'],'layout-mode':['auto','stripes','grid'],'sort-mode':['name','input','reverse'],'wm-repeat':['yes','no']}))if(!allowed.includes(b.settings[key]))throw Error('設定値が不正です：'+key);if(typeof b.settings.readme!=='string'||b.settings.readme.length>2*1024*1024)throw Error('READMEが不正です');
const ids=new Set();for(const p of b.products){if(!/^PKM-\d{4,10}$/.test(p.id)||ids.has(p.id)||typeof p.name!=='string'||!Array.isArray(p.colors)||!p.colors.every(c=>typeof c==='string')||!['未登録','CSV出力済み','登録済み'].includes(p.status))throw Error('商品IDの重複または商品情報が不正です');ids.add(p.id);for(const k of ['created','category','cloud','zipName','saleDate','saleStatus','booth','etsy'])if(p[k]!=null&&typeof p[k]!=='string')throw Error('商品情報が不正です');}for(const h of b.history)if(typeof h.id!=='string'||!Array.isArray(h.products))throw Error('CSV履歴が不正です');}
$('restore').addEventListener('change',async e=>{try{const file=e.target.files[0];if(!file)return;if(file.size>30*1024*1024)throw Error('バックアップは30MiB以下にしてください');const b=JSON.parse(await file.text());validateBackup(b);let restoredWatermark=null;if(b.watermark){if(typeof b.watermark!=='string'||!/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(b.watermark))throw Error('透かし形式が不正です');const bytes=Uint8Array.from(atob(b.watermark.split(',')[1]),c=>c.charCodeAt(0));if(bytes.length>5*1024*1024||checker.info(bytes).type!=='image/png')throw Error('透かしが不正です');restoredWatermark=new Blob([bytes],{type:'image/png'});const img=await loadImage(restoredWatermark);try{if(!transparent(img))throw Error('透かしに透過がありません');}finally{img.src='';}}
 const saved=await get('settings','common'),restoreSettings=!saved||$('restore-settings').checked;let skipped=0,added=0;await transaction(['products','history','meta','settings'],'readwrite',tx=>{const store=tx.objectStore('products');for(const p of b.products){const r=store.get(p.id);r.onsuccess=()=>{if(r.result)skipped++;else{store.put(p);added++;}};}for(const h of b.history){const r=tx.objectStore('history').get(h.id);r.onsuccess=()=>{if(!r.result)tx.objectStore('history').put(h);};}const meta=tx.objectStore('meta'),r=meta.get('counter');r.onsuccess=()=>meta.put({key:'counter',value:Math.max(r.result?.value||0,Number.isSafeInteger(b.counter)?b.counter:0,...b.products.map(p=>Number(p.id.slice(4))))});if(restoreSettings)tx.objectStore('settings').put({key:'common',value:b.settings,watermark:restoredWatermark});});if(restoreSettings)await loadSettings();await refresh();$('backup-state').textContent=`${added}件を追加、重複${skipped}件は既存を保持。`+(restoreSettings?'共通設定も復元しました。':'現在の共通設定を保持しました。');
 }catch(err){$('backup-state').textContent='復元失敗：'+err.message;}finally{e.target.value='';}});
async function loadSettings(){const saved=await get('settings','common');if(saved){settings=saved.value;watermark=saved.watermark;for(const id of ids)if(settings[id]!=null)$(id).value=String(settings[id]);$('watermark-state').textContent=watermark?'登録済み（保存領域から復元）':'未登録';}}
try{db=await new Promise((res,rej)=>{const r=indexedDB.open('pukumo-asset-studio',1);r.onupgradeneeded=()=>{for(const [name,keyPath] of [['settings','key'],['products','id'],['history','id'],['meta','key']])r.result.createObjectStore(name,{keyPath});};r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error);r.onblocked=()=>msg('他のタブを閉じて再読み込みしてください',true);});db.onversionchange=()=>{db.close();$('studio-fields').disabled=true;msg('保存領域が更新されました。再読み込みしてください。',true);};await loadSettings();await refresh();$('studio-fields').disabled=false;$('storage-state').textContent='端末内保存が利用できます。画像原本は保存しません。設定・商品情報はJSONでバックアップできます。';}catch(e){$('storage-state').textContent='保存領域を開けません。ブラウザの保存設定を確認してください：'+e.message;}
// Directory drops in supporting browsers, bounded by the checker's limits.
for(const target of [$('drop'),$('stage')])target.addEventListener('drop',async event=>{
 const entries=Array.from(event.dataTransfer?.items||[]).map(i=>i.webkitGetAsEntry?.()).filter(Boolean);
 if(!entries.some(e=>e.isDirectory))return;
 event.preventDefault();event.stopImmediatePropagation();target.classList.remove('dragging');
 if(checker.snapshot().busy||busy){msg('処理が終わってからフォルダを投入してください。',true);return;}
 const files=[];let total=0,count=0;
 async function walk(entry,path=''){
  if(++count>2000)throw Error('フォルダ項目は2,000件以下にしてください。');
  if(entry.isFile){const file=await new Promise((resolve,reject)=>entry.file(resolve,reject));total+=file.size;if(total>100*1024*1024)throw Error('入力合計は100MiB以下にしてください。');Object.defineProperty(file,'webkitRelativePath',{value:path+file.name});files.push(file);}
  else{const reader=entry.createReader();while(true){const children=await new Promise((resolve,reject)=>reader.readEntries(resolve,reject));if(!children.length)break;for(const child of children)await walk(child,path+entry.name+'/');}}
 }
 try{for(const entry of entries)await walk(entry);await checker.start(files);}catch(e){msg(e.message,true);}
},true);
// Future local mockup plugins can accept source Blobs and return derived Blobs.
// No template renderer is registered or invoked in v1.2.
window.PukumoStudio={version:'1.2',layout:C.layout,extensionContract:{input:'Blob[]',output:'Blob[]',mutatesOriginal:false},testing:{drawCover,stamp,transparent,validateBackup}};
})();
