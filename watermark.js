/* Local Canvas watermark rendering. Google Fonts CSS requests contain font names only. */
(()=>{
'use strict';
const FONTS=[
 {id:'Noto Sans JP',label:'Noto Sans JP · 日本語ゴシック',sample:'ぷくも 素材の見本 PUKUMo',weights:[400,700],fallback:'sans-serif'},
 {id:'Noto Serif JP',label:'Noto Serif JP · 日本語明朝',sample:'ぷくも 素材の見本 PUKUMo',weights:[400,700],fallback:'serif'},
 {id:'Zen Maru Gothic',label:'Zen Maru Gothic · 日本語丸ゴシック',sample:'ぷくも 素材の見本 PUKUMo',weights:[400,700],fallback:'sans-serif'},
 {id:'Montserrat',label:'Montserrat · 英語サンセリフ',sample:'PUKUMo / Sample',weights:[400,700],fallback:'sans-serif'},
 {id:'Lora',label:'Lora · 英語セリフ',sample:'PUKUMo / Sample',weights:[400,700],fallback:'serif'},
 {id:'Dancing Script',label:'Dancing Script · 英語筆記体',sample:'PUKUMo / Sample',weights:[400,700],fallback:'cursive'}
];
const DEFAULT={mode:'text',enabled:true,text:'PUKUMo',font:'Noto Sans JP',bold:false,size:100,color:'#ffffff',transparency:65,rotation:-30,placement:'tile',margin:80,gap:180,spacing:0};
const KEY='pukumo.watermark.v2',styles=new Map(),resolved=new Map();
function clean(value={}){
 const s={...DEFAULT,...value};
 if(!['text','png'].includes(s.mode)||typeof s.enabled!=='boolean'||typeof s.bold!=='boolean'||!FONTS.some(f=>f.id===s.font)||typeof s.text!=='string'||s.text.length>240||s.text.split('\n').length>4||!/^#[0-9a-f]{6}$/i.test(s.color)||!['center','top-left','top-right','bottom-left','bottom-right','tile'].includes(s.placement))throw Error('透かし設定が不正です。');
 for(const [key,min,max] of [['size',12,500],['transparency',0,100],['rotation',-180,180],['margin',0,1000],['gap',0,1000],['spacing',0,100]]){s[key]=Number(s[key]);if(!Number.isFinite(s[key])||s[key]<min||s[key]>max)throw Error('透かしの'+key+'を'+min+'〜'+max+'で指定してください。');}
 return Object.fromEntries(Object.keys(DEFAULT).map(k=>[k,s[k]]));
}
function timeout(p,ms){return new Promise((res,rej)=>{const timer=setTimeout(()=>rej(Error('フォントの読み込みがタイムアウトしました')),ms);p.then(v=>{clearTimeout(timer);res(v)},e=>{clearTimeout(timer);rej(e)});});}
function stylesheet(font){
 if(!styles.has(font.id))styles.set(font.id,new Promise((res,rej)=>{
  const link=document.createElement('link');link.rel='stylesheet';link.href='https://fonts.googleapis.com/css2?family='+encodeURIComponent(font.id).replace(/%20/g,'+')+':wght@'+font.weights.join(';')+'&display=swap';link.dataset.pukumoFont=font.id;link.onload=()=>res();link.onerror=()=>rej(Error('Google Fontsに接続できません'));document.head.append(link);
 }));return styles.get(font.id);
}
async function resolveFont(s){
 const f=FONTS.find(f=>f.id===s.font),weight=s.bold?700:400,key=s.font+'|'+weight+'|'+s.text;
 if(!resolved.has(key))resolved.set(key,(async()=>{try{
  await timeout(stylesheet(f),8000);
  const faces=await timeout(document.fonts.load(`${weight} 32px "${f.id}"`,s.text+' '+f.sample),8000);
  if(!faces.length)throw Error('フォントを確認できません');
  return {family:`"${f.id}", ${f.fallback}`,weight,fallback:false,notice:f.id+' 読み込み済み'+(/[^\x00-\x7f]/.test(s.text)&&!f.id.includes('JP')&&f.id!=='Zen Maru Gothic'?'（日本語は端末の代替書体）':'')};
 }catch(e){return {family:f.fallback,weight,fallback:true,notice:f.id+'の読み込みに失敗：端末の代替フォントで表示・出力します。再試行できます。'};}})());
 return resolved.get(key);
}
function retry(){for(const link of document.querySelectorAll('link[data-pukumo-font]'))link.remove();styles.clear();resolved.clear();}
function graphemes(text){return typeof Intl.Segmenter==='function'?[...new Intl.Segmenter('ja',{granularity:'grapheme'}).segment(text)].map(x=>x.segment):Array.from(text);}
function textWidth(ctx,text,spacing){if(!spacing)return ctx.measureText(text).width;const chars=graphemes(text);return chars.reduce((sum,c)=>sum+ctx.measureText(c).width,0)+Math.max(0,chars.length-1)*spacing;}
function line(ctx,text,spacing){if(!spacing){ctx.textAlign='center';ctx.fillText(text,0,0);return;}const chars=graphemes(text);let x=-textWidth(ctx,text,spacing)/2;ctx.textAlign='left';for(const char of chars){ctx.fillText(char,x,0);x+=ctx.measureText(char).width+spacing;}}
function geometry(ctx,s,font,width,height){
 ctx.font=`${font.weight} ${s.size}px ${font.family}`;
 const lines=s.text.split('\n'),w=Math.max(...lines.map(t=>textWidth(ctx,t,s.spacing)),1)+s.size*.6,h=lines.length*s.size*1.35;
 const a=s.rotation*Math.PI/180,boxW=Math.abs(Math.cos(a))*w+Math.abs(Math.sin(a))*h,boxH=Math.abs(Math.sin(a))*w+Math.abs(Math.cos(a))*h;
 const margin=Math.min(s.margin,(Math.min(width,height)-1)/2),scale=Math.min(1,(width-margin*2)/boxW,(height-margin*2)/boxH),bw=boxW*scale,bh=boxH*scale;
 let points=[];
 if(s.placement==='tile'){
  const dx=bw+s.gap,dy=bh+s.gap;if(Math.ceil(width/dx+2)*Math.ceil(height/dy+2)>10000)throw Error('透かしが密すぎます。サイズや間隔を広げてください。');
  for(let y=margin+bh/2;y<=height-margin+bh/2;y+=dy)for(let x=margin+bw/2;x<=width-margin+bw/2;x+=dx)points.push([x,y]);
 }else points=[[s.placement.endsWith('left')?margin+bw/2:s.placement.endsWith('right')?width-margin-bw/2:width/2,s.placement.startsWith('top')?margin+bh/2:s.placement.startsWith('bottom')?height-margin-bh/2:height/2]];
 return {points,scale,angle:a,lines,w,h,bw,bh};
}
function paint(canvas,s,font){
 if(!s.enabled||!s.text.trim()||s.transparency===100)return;
 const ctx=canvas.getContext('2d');ctx.save();try{
  const g=geometry(ctx,s,font,canvas.width,canvas.height);ctx.fillStyle=s.color;ctx.globalAlpha=1-s.transparency/100;ctx.textBaseline='alphabetic';
  for(const [x,y] of g.points){ctx.save();ctx.translate(x,y);ctx.rotate(g.angle);ctx.scale(g.scale,g.scale);g.lines.forEach((t,i)=>{ctx.save();ctx.translate(0,(i-(g.lines.length-1)/2)*s.size*1.35+s.size*.35);line(ctx,t,s.spacing);ctx.restore();});ctx.restore();}
 }finally{ctx.restore();}
}
function canvasBlob(c){return new Promise((res,rej)=>c.toBlob(b=>b?res(b):rej(Error('PNGを作成できません')),'image/png'));}
function create({mount,checker,output,loadImage,drawCover,pngSource,pngSettings,pngPaint,onError=()=>{}}){
 let state={...DEFAULT},hasSaved=false,storageWarning='',revision=0,lastCanvas=null,lastPlan=null,pending=null,background=null,backgroundKey='',png=null,pngBlob=null,locked=false;
 try{const raw=localStorage.getItem(KEY);if(raw){state=clean(JSON.parse(raw));hasSaved=true;}}catch(e){storageWarning='設定を復元できませんでした。現在の設定を保存し直してください。';}
 mount.innerHTML=`<h3>ウォーターマーク</h3><p class="muted">画像・入力文字は端末内だけで処理します。Google Fontsからフォントを取得します（APIキー不要）。</p>
 <div class="fields"><label>透かし<select id="text-wm-enabled"><option value="yes">ON</option><option value="no">OFF</option></select></label><label>方式<select id="text-wm-mode"><option value="text">文字（Google Fonts）</option><option value="png">既存の透かしPNG</option></select></label></div>
 <div id="text-wm-settings"><label>透かし文字（4行・240文字まで）<textarea id="text-wm-text" maxlength="240" rows="2"></textarea></label><div class="fields">
 <label>フォント<select id="text-wm-font"></select></label><label>太字<select id="text-wm-bold"><option value="no">標準 400</option><option value="yes">太字 700</option></select></label><label>文字サイズ（出力画像上のpx）<input id="text-wm-size" type="number" min="12" max="500"></label><label>文字色<input id="text-wm-color" type="color"></label>
 <label>透明度（0%＝不透明、100%＝透明）<input id="text-wm-transparency" type="range" min="0" max="100"><output id="text-wm-transparency-value"></output></label>
 <label>回転角度<input id="text-wm-rotation" type="number" min="-180" max="180"></label><label>配置<select id="text-wm-placement"><option value="center">中央</option><option value="top-left">左上</option><option value="top-right">右上</option><option value="bottom-left">左下</option><option value="bottom-right">右下</option><option value="tile">全面繰り返し</option></select></label>
 <label>外側の余白 px<input id="text-wm-margin" type="number" min="0" max="1000"></label><label>繰り返し間隔 px<input id="text-wm-gap" type="number" min="0" max="1000"></label><label>文字間隔 px<input id="text-wm-spacing" type="number" min="0" max="100"></label></div>
 <p id="text-wm-font-sample" class="font-sample"></p><p id="text-wm-font-state" role="status" aria-live="polite"></p><button id="text-wm-retry" type="button">フォントを再読み込み</button><p class="muted">各書体：SIL Open Font License 1.1。商用利用可能。英語書体の日本語文字は端末の代替書体です。長い文字は画像内に収まるよう縮小します。</p></div>
 <p id="text-wm-state" class="notice" role="status" aria-live="polite"></p><canvas id="text-wm-preview" width="600" height="600" role="img" aria-label="透かし入り見本のリアルタイムプレビュー"></canvas><button type="button" id="text-wm-download">この見本をPNGで保存</button><p class="muted">読み込み画像の「確認」で選んだ1枚を表示。サイズ・切り抜きは紹介画像設定と共通です。一括生成では全対象画像に適用します。原本へは適用しません。</p>`;
 const $=id=>document.getElementById(id),fields=Object.keys(DEFAULT);
 for(const f of FONTS){const o=document.createElement('option');o.value=f.id;o.textContent=f.label;$('text-wm-font').append(o);}
 function controls(){for(const key of fields)$('text-wm-'+key).value=typeof state[key]==='boolean'?(state[key]?'yes':'no'):state[key];$('text-wm-settings').hidden=state.mode!=='text';$('legacy-watermark').hidden=state.mode!=='png';$('text-wm-transparency-value').textContent=state.transparency+'%';}
 function persist(){try{localStorage.setItem(KEY,JSON.stringify(state));storageWarning='';}catch(e){storageWarning='ブラウザへ設定を保存できません。この画面内では利用できます。';}}
 function read(){const s={};for(const key of fields)s[key]=typeof DEFAULT[key]==='boolean'?$('text-wm-'+key).value==='yes':$('text-wm-'+key).value;return clean(s);}
 async function prepare(){
  const s=read();if(!s.enabled)return {active:false,draw:()=>{},config:s,notice:'透かしOFF'};
  if(s.mode==='png'){
   const blob=pngSource();if(!blob)return {active:false,draw:()=>{},config:s,notice:'透かしPNG未登録：見本の透かしは生成しません。'};
   if(blob!==pngBlob){const image=await loadImage(blob);if(png)png.src='';png=image;pngBlob=blob;}
   const image=png,ps={...pngSettings()};for(const [key,min,max] of [['wm-width',10,2000],['wm-opacity',1,100],['wm-gap',0,2000],['wm-angle',-180,180]]){const n=Number(ps[key]);if(!Number.isFinite(n)||n<min||n>max)throw Error('PNG透かしの数値設定を確認してください。');}return {active:true,draw:c=>pngPaint(c,image,ps),config:s,notice:'登録済みPNGを使用'};
  }
  if(!s.text.trim())throw Error('透かし文字を入力するか、透かしをOFFにしてください。');
  const font=await resolveFont(s);return {active:true,draw:c=>paint(c,s,font),config:{...s,resolvedFamily:font.family,fallback:font.fallback},notice:font.notice,font};
 }
 async function source(){
  const snap=checker.snapshot(),row=snap.rows[snap.selected>=0?snap.selected:0],key=snap.run+'|'+snap.selected+'|'+row?.status;
  if(key!==backgroundKey){let next=null;if(row?.result&&!snap.busy)next=await checker.decode(await row.getBlob(snap.run),snap.run);if(background)background.src='';background=next;backgroundKey=key;}
  return background;
 }
 async function render(token){
  $('text-wm-download').disabled=true;$('text-wm-state').textContent='プレビューを更新しています…';
  try{
   const plan=await prepare();if(token!==revision)return;
   const image=await source();if(token!==revision)return;
   const {size,x,y}=output();if(!Number.isInteger(size)||size<256||size>4096||!Number.isFinite(x)||x<0||x>1||!Number.isFinite(y)||y<0||y>1)throw Error('出力サイズ・切り抜き位置を確認してください。');
   const c=document.createElement('canvas');c.width=c.height=size;const ctx=c.getContext('2d');
   if(image)drawCover(ctx,image,{x:0,y:0,w:size,h:size},x,y);else{ctx.fillStyle='#8296b5';ctx.fillRect(0,0,size,size);ctx.fillStyle='#34465f';ctx.fillRect(0,size/2,size,size/2);}
   plan.draw(c);if(lastCanvas)lastCanvas.width=lastCanvas.height=1;lastCanvas=c;lastPlan=plan;
   const preview=$('text-wm-preview');preview.width=preview.height=size;preview.getContext('2d').drawImage(c,0,0);
   const f=FONTS.find(f=>f.id===state.font);$('text-wm-font-sample').textContent=f.label+' — '+f.sample;$('text-wm-font-sample').style.fontFamily=plan.font?.family||f.fallback;$('text-wm-font-sample').style.fontWeight=plan.font?.weight||400;
   $('text-wm-font-state').textContent=plan.notice;$('text-wm-state').textContent=(image?'プレビューと同じ画像をPNG保存できます。':'背景は確認用です。画像を読み込むと実画像に切り替わります。')+(plan.config.fallback?' 代替フォント使用中。':'')+' '+storageWarning;
   $('text-wm-download').disabled=!image||locked;
  }catch(e){if(token!==revision)return;$('text-wm-state').textContent=e.message;$('text-wm-preview').getContext('2d').clearRect(0,0,$('text-wm-preview').width,$('text-wm-preview').height);lastPlan=null;onError(e);}
 }
 function update(){const token=++revision;pending=render(token);return pending;}
 for(const key of fields)$('text-wm-'+key).addEventListener('input',()=>{try{state=read();hasSaved=true;persist();controls();update();}catch(e){++revision;lastPlan=null;$('text-wm-state').textContent=e.message;$('text-wm-download').disabled=true;}});
 $('text-wm-retry').onclick=()=>{retry();update();};
 $('text-wm-download').onclick=async()=>{if(locked)return;locked=true;try{await pending;if(!lastCanvas||!lastPlan||!background)throw Error('プレビューの準備ができていません。');$('text-wm-download').disabled=true;const blob=await canvasBlob(lastCanvas),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='pukumo_watermarked_sample.png';a.click();setTimeout(()=>URL.revokeObjectURL(url),60000);}catch(e){$('text-wm-state').textContent=e.message;}finally{locked=false;$('text-wm-download').disabled=!background||!lastPlan;}};
 for(const id of ['output-size','crop-x','crop-y','wm-width','wm-opacity','wm-angle','wm-gap','wm-repeat'])$(id).addEventListener('input',update);
 let signature='';setInterval(()=>{const snap=checker.snapshot(),key=snap.run+'|'+snap.selected+'|'+snap.busy+'|'+snap.rows[0]?.status;if(key!==signature){signature=key;update();}},250);
 controls();
 return {prepare,update,getSettings:()=>({...state}),restore:value=>{state=clean(value);hasSaved=true;persist();controls();return update();},legacyReady:()=>{if(!hasSaved&&pngSource()){state.mode='png';controls();}return update();},ready:()=>pending,testing:{getCanvas:()=>lastCanvas,getPlan:()=>lastPlan}};
}
window.PukumoWatermark={create,clean,paint,geometry,resolveFont,retry,fonts:FONTS,defaults:DEFAULT,key:KEY};
})();
