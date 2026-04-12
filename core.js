
// ── Utilities ──
let curMod='';
function shuf(a){const b=[...a];for(let i=b.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[b[i],b[j]]=[b[j],b[i]]}return b}
function pick(arr,n,excl){const f=arr.filter(x=>x!==excl);return shuf(f).slice(0,n)}

// ── TTS ──
function speak(text){
  if(!window.speechSynthesis)return;
  window.speechSynthesis.cancel();
  const u=new SpeechSynthesisUtterance(text);
  u.lang='ja-JP';u.rate=0.85;
  const voices=speechSynthesis.getVoices().filter(v=>v.lang.startsWith('ja'));
  if(voices.length)u.voice=voices[0];
  speechSynthesis.speak(u);
}
function ttsBtn(text,size){return `<button class="tts" onclick="event.stopPropagation();speak('${text.replace(/'/g,"\\'")}')">${T('speak')}</button>`}

// ── SRS (Spaced Repetition Tracking) ──

// ── Review Popup (記憶定着率アップ) ──
function maybeShowReviewPopup() {
  // Show popup 1 in 3 times randomly
  if (Math.random() > 0.33) return;
  const overlay = document.createElement('div');
  overlay.id = 'review-popup-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px';
  overlay.innerHTML = `<div style="background:var(--s1);border-radius:20px;padding:28px;max-width:340px;width:100%;text-align:center;border:2px solid var(--acc);box-shadow:0 20px 60px rgba(0,0,0,0.3)">
    <div style="font-size:36px;margin-bottom:12px">🧠</div>
    <div style="font-family:'Zen Maru Gothic',sans-serif;font-size:18px;font-weight:900;color:var(--acc);margin-bottom:8px">今復習すれば記憶定着率アップ！！</div>
    <div style="font-size:13px;color:var(--txM);margin-bottom:20px;line-height:1.6">間違えた問題を今すぐ復習して<br>長期記憶に移行させよう！</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px">
      <button onclick="document.getElementById('review-popup-overlay').remove();openM('review')" style="padding:12px;border-radius:12px;background:var(--acc);color:#fff;border:none;font-weight:700;font-size:13px;cursor:pointer;font-family:inherit">📋 復習テスト</button>
      <button onclick="document.getElementById('review-popup-overlay').remove();openM('longterm')" style="padding:12px;border-radius:12px;background:var(--accB);color:#fff;border:none;font-weight:700;font-size:13px;cursor:pointer;font-family:inherit">🧠 長期記憶テスト</button>
    </div>
    <button onclick="document.getElementById('review-popup-overlay').remove()" style="padding:8px 20px;border-radius:10px;background:var(--s2);color:var(--txM);border:1px solid var(--brd);font-size:12px;cursor:pointer;font-family:inherit">今はしない</button>
  </div>`;
  document.body.appendChild(overlay);
}

const SRS={
  _key(mod,item){return 'nw3_srs_'+mod+'_'+(item[0]||item.q||item.p||'')},
  get(mod,item){try{return JSON.parse(localStorage.getItem(this._key(mod,item)))||{c:0,w:0}}catch{return{c:0,w:0}}},
  correct(mod,item){const d=this.get(mod,item);d.c++;localStorage.setItem(this._key(mod,item),JSON.stringify(d))},
  wrong(mod,item){const d=this.get(mod,item);d.w++;localStorage.setItem(this._key(mod,item),JSON.stringify(d))},
  isWeak(mod,item){const d=this.get(mod,item);return d.w>0&&d.w>=d.c},
  getWeakItems(mod,allItems){return allItems.filter(i=>this.isWeak(mod,i))},
  weakCount(mod,allItems){return allItems.filter(i=>this.isWeak(mod,i)).length}
};

// ── Streak/Score ──
let st=+(localStorage.getItem('nw3_s')||0),sc=+(localStorage.getItem('nw3_t')||0);
function updS(){var a=document.getElementById('st-v'),b=document.getElementById('sc-v');if(a)a.textContent=st;if(b)b.textContent=sc}
function addS(){st++;sc++;localStorage.setItem('nw3_s',st);localStorage.setItem('nw3_t',sc);updS();if(typeof updateRankWidget==='function')updateRankWidget();}
function rstS(){st=0;localStorage.setItem('nw3_s',0);updS()}
updS();

// ── Navigation ──
function openM(id){
  if(window._nwTmr)clearInterval(window._nwTmr);
  curMod=id;document.getElementById('homeV').style.display='none';
  document.querySelectorAll('.mod').forEach(m=>m.style.display='none');
  const c=document.getElementById('m-'+id);c.style.display='block';c.innerHTML='';
  initM(c,id);window.scrollTo(0,0);
  const hb=document.getElementById("home-btn");if(hb)hb.style.display="flex";
  if(typeof trackPV==='function')trackPV('/study/'+id,'Study: '+id.toUpperCase());
}

// ──────────────────────────────────────────────────────
// RANK WIDGET UPDATE
// ──────────────────────────────────────────────────────

function updateRankWidget() {
  // Helper: compute category accuracy from SRS
  function catAcc(modKey, items) {
    let c=0,w=0;
    items.forEach(item=>{const d=SRS.get(modKey,item);c+=d.c;w+=d.w;});
    const t=c+w; return t>0?Math.round(c/t*100):0;
  }
  
  // N5 rate = avg of hiragana, katakana, N5 vocab, N5 kanji (only counted if data exists)
  function levelRate(cats) {
    const rates = cats.map(([k,d])=>{
      let c=0,w=0; d.forEach(item=>{const r=SRS.get(k,item);c+=r.c;w+=r.w;});
      return c+w>0?c/(c+w)*100:null;
    }).filter(r=>r!==null);
    return rates.length ? Math.min(100,Math.round(rates.reduce((a,b)=>a+b,0)/rates.length)) : 0;
  }
  
  const n5Rate = levelRate([['kana',[...HB,...HD]],['kana',[...KB,...KD]],['vocab',JLPT_V5],['kanji',JLPT_K5]]);
  const n4Rate = levelRate([['vocab',JLPT_V4],['kanji',JLPT_K4],['grammar',GRAM],['verb',[...VERBS,...VERBS_N4]]]);
  const n3Rate = levelRate([['vocab',JLPT_V3],['kanji',JLPT_K3]]);
  
  const totalCorrect = +(localStorage.getItem('nw3_t')||0);
  
  function getRank(r) {
    if(r>=80) return {ja:'🏆 合格圏内！',en:'🏆 Pass Zone!',bn:'🏆 পাস জোন!'}[_lang]||'🏆 合格圏内！';
    if(r>=60) return {ja:'📈 上級者',en:'📈 Advanced',bn:'📈 উন্নত'}[_lang]||'📈 上級者';
    if(r>=30) return {ja:'📚 学習中',en:'📚 Learning',bn:'📚 শিখছেন'}[_lang]||'📚 学習中';
    return {ja:'🌱 初心者',en:'🌱 Beginner',bn:'🌱 শিক্ষানবিশ'}[_lang]||'🌱 初心者';
  }
  function getBarColor(r) {
    return r>=80?'var(--grn)':r>=60?'var(--accY)':'var(--acc)';
  }
  
  // Update top rank-widget bar
  const rwBadge = document.getElementById('rw-badge');
  const rwBar = document.getElementById('rw-bar');
  const rwPct = document.getElementById('rw-pct');
  if(rwBadge) rwBadge.textContent = getRank(n5Rate);
  if(rwBar){ rwBar.style.width=n5Rate+'%'; rwBar.style.backgroundColor=getBarColor(n5Rate); }
  if(rwPct) rwPct.textContent = n5Rate+'%';
  
  // Update home dashboard card elements
  const hBadge = document.getElementById('home-rank-badge');
  const hTotal = document.getElementById('home-total-correct');
  if(hBadge) hBadge.textContent = getRank(Math.max(n5Rate,n4Rate,n3Rate));
  if(hTotal) hTotal.textContent = totalCorrect;
  
  const n5b = document.getElementById('home-n5-bar');
  const n5p = document.getElementById('home-n5-pct');
  const n4b = document.getElementById('home-n4-bar');
  const n4p = document.getElementById('home-n4-pct');
  const n3b = document.getElementById('home-n3-bar');
  const n3p = document.getElementById('home-n3-pct');
  
  if(n5b){n5b.style.width=n5Rate+'%';n5b.style.background=n5Rate>=80?'rgba(107,191,138,0.9)':'rgba(255,255,255,0.85)';}
  if(n5p) n5p.textContent=n5Rate+'%';
  if(n4b){n4b.style.width=n4Rate+'%';n4b.style.background=n4Rate>=80?'rgba(107,191,138,0.9)':'rgba(255,255,255,0.85)';}
  if(n4p) n4p.textContent=n4Rate+'%';
  if(n3b){n3b.style.width=n3Rate+'%';n3b.style.background=n3Rate>=80?'rgba(107,191,138,0.9)':'rgba(255,255,255,0.85)';}
  if(n3p) n3p.textContent=n3Rate+'%';
}


function goHome(){
  if(window._nwTmr)clearInterval(window._nwTmr);
  window.speechSynthesis&&window.speechSynthesis.cancel();
  document.getElementById('homeV').style.display='block';
  document.querySelectorAll('.mod').forEach(m=>{m.style.display='none';m.innerHTML=''});
  window.scrollTo(0,0);
  const hb=document.getElementById('home-btn');if(hb)hb.style.display='none';
  if(typeof trackPV==='function')trackPV('/','NIHONGO WORK Home');
  setTimeout(updateRankWidget,50);
}

// ── API Helper ──
async function callAPI(prompt,maxTokens=500){
  const r=await fetch("https://api.anthropic.com/v1/messages",{
    method:"POST",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:maxTokens,
      messages:[{role:"user",content:prompt}]})
  });
  const d=await r.json();
  return d.content?.map(b=>b.text||'').join('')||'';
}

// ── Lang init ──
document.addEventListener('DOMContentLoaded',()=>{
  const b=document.getElementById('lb-'+_lang);if(b)b.classList.add('on');
  // Translate dynamic home shortcut labels
  const rst=document.getElementById('rev-shortcut-t');if(rst)rst.textContent=T('revTitle').replace('📋 ','');
  const rsd=document.getElementById('rev-shortcut-d');if(rsd)rsd.textContent=T('revShortDesc');
  const ltt=document.getElementById('lt-shortcut-t');if(ltt)ltt.textContent=T('ltTitle').replace('🧠 ','');
  const ltd=document.getElementById('lt-shortcut-d');if(ltd)ltd.textContent=T('ltShortDesc');
});

// ── Kana Module ──
function mkK(c,base,daku,title,em){
  let data=base,pos=0,sc={c:0,w:0},order=shuf(base.map((_,i)=>i)),mode='type',filt='base';
  const sid=c.id.replace(/\W/g,'_');
  let _kanaQuizLog=[], _kanaQStart=Date.now();
  function setD(){data=filt==='base'?base:filt==='daku'?daku:[...base,...daku];const pool=data.map((_,i)=>i);order=mode==='reverse'?shuf(pool).slice(0,Math.min(10,pool.length)):shuf(pool);pos=0;sc={c:0,w:0};_kanaQuizLog=[];_kanaQStart=Date.now();}
  function tabs(cur){return `<div class="stabs"><div class="stab ${cur==='type'?'on':''}" onclick="${sid}_M('type')">${T("kType")}</div><div class="stab ${cur==='grid'?'on':''}" onclick="${sid}_M('grid')">${T("kGrid")}</div><div class="stab ${cur==='reverse'?'on':''}" onclick="${sid}_M('reverse')">4択</div></div>`}
  function filts(){return `<div class="flts"><button class="fb ${filt==='base'?'on':''}" onclick="${sid}_F('base')">基本(${base.length})</button><button class="fb ${filt==='daku'?'on':''}" onclick="${sid}_F('daku')">濁音(${daku.length})</button><button class="fb ${filt==='all'?'on':''}" onclick="${sid}_F('all')">全部(${base.length+daku.length})</button></div>`}
  function kanaScoreScreen(){
    const t=sc.c+sc.w,p=t?Math.round(sc.c/t*100):0;
    if(typeof trackPV==='function')trackPV('/quiz/kana/score','Kana Score');
    let h=`<div class="scr sh"><div class="scr-big">${p}%</div><div class="scr-msg">${['もっと頑張ろう！','いい感じ！','すごい！','完璧！'][p<50?0:p<75?1:p<95?2:3]} (${sc.c}/${t})</div><div class="scr-tiles"><div class="scr-t g"><div class="tl">${T("scoreCo")}</div><div class="tv">${sc.c}</div></div><div class="scr-t r"><div class="tl">${T("scoreWr")}</div><div class="tv">${sc.w}</div></div></div><button class="rbtn" onclick="openM('${curMod}')">${T("again")}</button><button class="rbtn" style="background:var(--s2);color:var(--tx)" onclick="goHome()">${T("home")}</button></div>`;
    c.innerHTML=h;
    if(_kanaQuizLog.length>0){const s=c.querySelector('.scr');if(s&&typeof renderQuizResultDetails==='function')renderQuizResultDetails(s,_kanaQuizLog);}
  }
  function render(){
    if(mode==='grid'){let h=`<div class="mod-h"><div class="mod-t">${em} ${title}</div></div>`+tabs('grid')+filts()+`<div class="kgrid">`;data.forEach(([ch,r])=>h+=`<div class="kcell"><div class="kch">${ch}</div><div class="kro">${r}</div></div>`);c.innerHTML=h+`</div>`;return}
    if(pos>=order.length){kanaScoreScreen();return}
    const [ch,rom]=data[order[pos]],pct=pos/order.length*100;
    if(typeof trackPV==='function')trackPV('/quiz/kana/'+filt+'/'+(pos+1),'Kana Q'+(pos+1));
    _kanaQStart=Date.now();
    if(mode==='type'){
      let h=`<div class="mod-h"><div class="mod-t">${em} ${title}</div></div>`+tabs('type')+filts()+`<div class="prg"><div class="prg-bar"><div class="prg-fill" style="width:${pct}%"></div></div><div class="prg-tx">${pos+1}/${order.length}</div></div><div class="qb"><div class="qB" style="font-size:80px">${ch}</div><div class="qP">${T("kPrompt")}</div></div><input class="kinp" id="ki" type="text" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="romaji..."><div class="qfb" id="kfb"></div><div style="text-align:center"><button class="qnx" id="knx">${T("nextQ")}</button></div>`;
      c.innerHTML=h;const inp=document.getElementById('ki');inp.focus();
      inp.onkeydown=e=>{if(e.key!=='Enter')return;const v=inp.value.trim().toLowerCase();if(!v)return;
        const alts={shi:['si'],chi:['ti'],tsu:['tu'],fu:['hu'],n:['nn'],wo:['o'],ji:['zi'],zu:['du']};
        let ok=v===rom;if(!ok&&alts[rom])ok=alts[rom].includes(v);const fb=document.getElementById('kfb');
        const elapsed=Math.round((Date.now()-_kanaQStart)/1000);
        if(ok){sc.c++;SRS.correct('kana',data[order[pos]]);addS();fb.className='qfb ok';fb.innerHTML='✓ '+ch+' = '+rom}else{sc.w++;SRS.wrong('kana',data[order[pos]]);rstS();fb.className='qfb no';fb.innerHTML=T('no')+' → <b>'+rom+'</b>'}
        _kanaQuizLog.push({question:ch,answer:rom,userAnswer:v,isCorrect:ok,seconds:elapsed});
        inp.disabled=true;const btn=document.getElementById('knx');btn.classList.add('sh');btn.onclick=()=>{pos++;render()}};
    } else {
      // 4択クイズ: limit to 10 questions
      const MAX_Q=10;
      if(pos===0 && order.length>MAX_Q){order=shuf(data.map((_,i)=>i)).slice(0,MAX_Q);}
      const totalQ=Math.min(order.length,MAX_Q);
      const pctQ=pos/totalQ*100;
      const wr=pick(data,3,data[order[pos]]),opts=shuf([data[order[pos]],...wr]);
      const qNum=pos+1;
      let h=`<div class="mod-h"><div class="mod-t">${em} ${title}</div></div>`+tabs('reverse')+filts();
      // Progress bar
      h+=`<div class="prg"><div class="prg-bar"><div class="prg-fill" style="width:${pctQ}%"></div></div><div class="prg-tx">${qNum}/${totalQ}</div></div>`;
      // Question card
      h+=`<div class="qb" style="padding:28px 16px;margin-bottom:12px">`;
      h+=`<div style="font-size:12px;color:var(--txD);margin-bottom:8px;letter-spacing:.06em">Q${qNum} / ${totalQ}</div>`;
      h+=`<div style="font-size:13px;font-weight:600;color:var(--txM);margin-bottom:10px">${T("kRev")}</div>`;
      h+=`<div style="font-family:'DM Mono',monospace;font-size:48px;font-weight:700;color:var(--acc);letter-spacing:.04em">${rom}</div>`;
      h+=`</div>`;
      h+=`<div class="qfb" id="kfb"></div>`;
      // 4 option buttons - cleaner UI
      h+=`<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px">`;
      ['A','B','C','D'].forEach((l,i)=>h+=`<div class="qo" data-v="${opts[i][0]}" style="display:flex;align-items:center;justify-content:center;gap:10px;padding:16px;border-radius:12px;border:2px solid var(--brd);background:var(--s1);cursor:pointer;transition:all .15s"><span style="font-size:11px;font-weight:700;color:var(--txD);min-width:16px">${l}</span><span style="font-family:'Zen Maru Gothic';font-size:32px;font-weight:900;color:var(--tx)">${opts[i][0]}</span></div>`);
      h+=`</div>`;
      h+=`<div style="text-align:center"><button class="qnx" id="knx" style="display:none">${pos+1>=totalQ?({ja:'結果を見る',en:'See Results',bn:'ফলাফল দেখুন'}[_lang]||'結果を見る'):T("nextQ")}</button></div>`;
      c.innerHTML=h;
      // Override score end condition for 10-question mode
      c.querySelectorAll('.qo').forEach(o=>{o.onclick=function(){
        c.querySelectorAll('.qo').forEach(x=>{
          x.style.pointerEvents='none';
          if(x.dataset.v===ch){x.style.border='2px solid var(--grn)';x.style.background='rgba(107,163,104,0.12)';}
        });
        const fb=document.getElementById('kfb');
        const elapsed=Math.round((Date.now()-_kanaQStart)/1000);
        if(o.dataset.v===ch){sc.c++;SRS.correct('kana',data[order[pos]]);addS();fb.className='qfb ok';fb.innerHTML=T('ok');o.style.border='2px solid var(--grn)';o.style.background='rgba(107,163,104,0.12)';
          _kanaQuizLog.push({question:rom,answer:ch,userAnswer:ch,isCorrect:true,seconds:elapsed});
        }
        else{o.style.border='2px solid var(--red)';o.style.background='rgba(217,107,107,0.12)';sc.w++;SRS.wrong('kana',data[order[pos]]);rstS();fb.className='qfb no';fb.innerHTML=T('no')+' → <b>'+ch+'</b>';
          _kanaQuizLog.push({question:rom,answer:ch,userAnswer:o.querySelector('span:last-child').textContent,isCorrect:false,seconds:elapsed});
        }
        const btn=document.getElementById('knx');btn.style.display='inline-block';
        btn.onclick=()=>{
          pos++;
          if(pos>=totalQ){kanaScoreScreen();}
          else {render();}
        };
      }})
    }
  }
  window[sid+'_M']=m=>{mode=m;setD();render()};window[sid+'_F']=f=>{filt=f;setD();render()};render()
}

// ── FLASHCARD ──
// ── Flashcard Module (with TTS, Bookmark, API Examples) ──
function mkF(c,datasets,title,em,frontFn,backFn,modKey){
  let cur=datasets[0].data,curLbl=datasets[0].label,pos=0,order=shuf(cur.map((_,i)=>i));
  const sid=c.id.replace(/\W/g,'_');
  const mk=modKey||sid;
  const bmKey='nw3_bm_'+sid;
  let bm=new Set(JSON.parse(localStorage.getItem(bmKey)||'[]'));
  let reviewMode=false;
  function saveBm(){localStorage.setItem(bmKey,JSON.stringify([...bm]))}
  function itemKey(item){return(item.p||item[0]||'')+'|'+(item.r||item[1]||'')}
  function applyFilter(){
    if(reviewMode){const f=cur.filter(i=>bm.has(itemKey(i)));if(!f.length){reviewMode=false;order=shuf(cur.map((_,i)=>i))}else{order=shuf(f.map(i=>cur.indexOf(i)))}}
    else{order=shuf(cur.map((_,i)=>i))}
    pos=0;
  }
  function render(){
    if(!cur.length){c.querySelector('.u-content').innerHTML=`<div style="text-align:center;padding:40px;color:var(--txM)">${T('nodata')}</div>`;return}
    if(pos>=order.length)pos=0;
    const item=cur[order[pos]],pct=(pos+1)/order.length*100;
    const isBm=bm.has(itemKey(item));
    const bmCount=cur.filter(x=>bm.has(itemKey(x))).length;
    const spkText=item[0]||item.p||'';
    let h='';
    h+=`<div class="lvl-tabs">`;
    datasets.forEach(d=>{const cls=d.cls||'';h+=`<button class="lvl-b ${cls} ${!reviewMode&&curLbl===d.label?'on':''}" onclick="${sid}_L('${d.label}')">${d.label} (${d.data.length})</button>`});
    if(bmCount>0){h+=`<button class="lvl-b ${reviewMode?'on':''}" style="${reviewMode?'background:var(--accY);color:#000':'background:rgba(254,202,87,.12);color:var(--accY)'}" onclick="${sid}_R()">${T('bmTab')} <span class="bm-count">${bmCount}</span></button>`}
    h+=`</div>`;
    h+=`<div class="prg"><div class="prg-bar"><div class="prg-fill" style="width:${pct}%"></div></div><div class="prg-tx">${pos+1}/${order.length}</div></div>`;
    h+=`<div class="fcw" id="fcw_${sid}"><div class="fc" id="fc_${sid}"><div class="fcf fc-fr"><div class="fc-bdg">${pos+1}/${order.length}</div><button class="bm-btn ${isBm?'on':''}" id="bm_${sid}" onclick="event.stopPropagation();${sid}_BM()">${isBm?T('bmOn'):T('bmOff')}</button>${frontFn(item)}<div class="fc-hint">${T('tap')}</div></div><div class="fc-bk-wrap">${backFn(item)}<div id="exbox_${sid}" style="margin-top:6px"></div></div></div></div>`;
    h+=`<div class="fc-acts"><button class="fc-b pv" onclick="${sid}_P()">${T('prev')}</button><button class="tts" onclick="speak('${spkText.replace(/'/g,"\\'")}')">${T('speak')}</button><button class="fc-b bk" onclick="${sid}_S()">🔀</button><button class="fc-b nx" onclick="${sid}_N()">${T('next')}</button></div>`;
    const target=c.querySelector('.u-content');if(target)target.innerHTML=h;else c.innerHTML=h;
    const fcw=document.getElementById('fcw_'+sid);if(fcw)fcw.onclick=()=>document.getElementById('fc_'+sid).classList.toggle('flip');
  }
  function pvFlash(){if(typeof trackPV==='function')trackPV('/flash/'+mk+'/'+(pos+1),mk.toUpperCase()+' Card '+(pos+1));}
  window[sid+'_BM']=()=>{const item=cur[order[pos]],k=itemKey(item);if(bm.has(k))bm.delete(k);else bm.add(k);saveBm();render()};
  window[sid+'_P']=()=>{pos=Math.max(0,pos-1);pvFlash();render()};
  window[sid+'_N']=()=>{pos++;if(pos>=order.length)pos=0;pvFlash();render()};
  window[sid+'_S']=()=>{order=shuf(order);pos=0;pvFlash();render()};
  window[sid+'_R']=()=>{reviewMode=!reviewMode;applyFilter();pvFlash();render()};
  window[sid+'_L']=lbl=>{const d=datasets.find(x=>x.label===lbl);if(d){cur=d.data;curLbl=lbl;reviewMode=false;applyFilter();pvFlash();render()}};
  pvFlash();render();
}

// ── Quiz Module — 1 question = 1 URL, result = separate URL ──
// URL pattern:  /quiz/{modKey}/question/{n}   (1-indexed, n=1..order.length)
//               /quiz/{modKey}/result/{n}
// Each pushState + gtag page_view = 1 PV
// A 10-question quiz generates 20 PV (10 question pages + 10 result pages)
function mkQ(c,datasets,title,em,qFn,optFn,max,modKey){
  let cur=datasets[0].data,curLbl=datasets[0].label,pos=0,sc={c:0,w:0},order=[];
  const sid=c.id.replace(/\W/g,'_');
  const mk=modKey||sid;
  let tmrOn=localStorage.getItem('nw3_tmr')==='1',tmrSec=+(localStorage.getItem('nw3_tmr_s')||'10'),tmrId=null,tmrLeft=0;
  let weakMode=false;

  function reset(){
    let pool=cur.map((_,i)=>i);
    if(weakMode){const wk=cur.filter(i=>SRS.isWeak(mk,i)).map(i=>cur.indexOf(i));if(wk.length)pool=wk;else weakMode=false}
    order=shuf(pool).slice(0,max||10);pos=0;sc={c:0,w:0};
    if(typeof window!=='undefined'){window._quizLog=[];window._quizQStart=Date.now();}
  }
  reset();

  // ── URL tracking helpers ──
  function qUrl(n){return '/quiz/'+mk+'/question/'+n;}
  function rUrl(n){return '/quiz/'+mk+'/result/'+n;}
  function pvPush(path,ptitle){
    if(typeof trackPV==='function')trackPV(path,ptitle);
  }

  function stopTmr(){if(tmrId){clearInterval(tmrId);tmrId=null;window._nwTmr=null}}
  function startTmr(){
    stopTmr();if(!tmrOn)return;tmrLeft=tmrSec;
    const ring=document.getElementById('tmr_fg_'+sid),num=document.getElementById('tmr_n_'+sid);
    const C=Math.PI*2*20;
    if(ring){ring.style.strokeDashoffset='0';ring.classList.remove('danger')}
    if(num){num.textContent=tmrSec;num.classList.remove('danger')}
    tmrId=setInterval(()=>{
      tmrLeft--;const pct=tmrLeft/tmrSec;
      if(ring){ring.style.strokeDashoffset=C*(1-pct);ring.classList.toggle('danger',tmrLeft<=3)}
      if(num){num.textContent=tmrLeft;num.classList.toggle('danger',tmrLeft<=3)}
      if(tmrLeft<=0){stopTmr();timeUp()}
    },1000);window._nwTmr=tmrId;
  }

  // ── Result page (shown after answering) ──
  function showResult(item,opts,ci,chosen,isCorrect){
    stopTmr();
    // PV: result page
    pvPush(rUrl(pos+1), mk.toUpperCase()+' Q'+(pos+1)+' Result');

    const target=c.querySelector('.u-content')||c;
    const spkText=item[0]||item.q||item.a||'';
    const pct=pos/order.length*100;
    const weakCnt=SRS.weakCount(mk,cur);
    const isLast=(pos+1>=order.length);

    let h='';
    // Result page header badge
    h+=`<div style="display:flex;align-items:center;gap:8px;margin-bottom:10px"><span style="background:${isCorrect?'rgba(107,163,104,.15)':'rgba(217,107,107,.12)'};color:${isCorrect?'var(--grn)':'var(--red)'};border:1px solid ${isCorrect?'rgba(107,163,104,.35)':'rgba(217,107,107,.35)'};border-radius:20px;padding:3px 12px;font-size:11px;font-weight:700">${T('resultPageLabel')} — ${pos+1}/${order.length}</span></div>`;
    // Level tabs (if multiple datasets)
    if(datasets.length>1||weakCnt>0){h+=`<div class="lvl-tabs">`;
      datasets.forEach(d=>{const cls=d.cls||'';h+=`<button class="lvl-b ${cls} ${!weakMode&&curLbl===d.label?'on':''}" onclick="${sid}_L('${d.label}')">${d.label}</button>`});
      if(weakCnt>0){h+=`<button class="lvl-b ${weakMode?'on':''}" style="${weakMode?'background:var(--red);color:#fff':'background:rgba(217,107,107,.15);color:var(--red)'}" onclick="${sid}_W()">💀 ${weakCnt}</button>`}
      h+=`</div>`}
    h+=`<div class="prg"><div class="prg-bar"><div class="prg-fill" style="width:${pct}%"></div></div><div class="prg-tx">${pos+1}/${order.length}</div></div>`;
    h+=qFn(item);
    // Render options locked with correct/wrong coloring
    h+=`<div class="qos">`;
    ['A','B','C','D'].forEach((l,i)=>{
      let cls='qo dis';
      if(i===ci) cls+=' ok';
      else if(i===chosen&&!isCorrect) cls+=' no';
      h+=`<div class="${cls}"><span class="ol">${l}</span><span>${opts[i]}</span></div>`;
    });
    h+=`</div>`;
    // Feedback banner
    h+=`<div class="qfb ${isCorrect?'ok':'no'}" style="display:block">${isCorrect?T('ok'):T('no')}</div>`;
    // Action buttons
    h+=`<div style="text-align:center;margin-top:10px;display:flex;gap:8px;justify-content:center;flex-wrap:wrap">`;
    h+=`<button class="tts" onclick="speak('${spkText.replace(/'/g,"\\'")}')">🔊 ${T('speak')}</button>`;
    if(!isLast){
      h+=`<button class="qnx sh" onclick="${sid}_next()">${T('nextQ')}</button>`;
    } else {
      h+=`<button class="qnx sh" onclick="${sid}_finish()">📊 ${T('scoreCo')} →</button>`;
    }
    h+=`</div>`;

    target.innerHTML=h;
  }

  // ── Question page ──
  // opts/ci are captured in closure — no DOM parsing needed
  let _curOpts=[], _curCi=0;

  function render(){
    stopTmr();
    const target=c.querySelector('.u-content')||c;

    // Final score screen
    if(pos>=order.length){
      pvPush('/quiz/'+mk+'/score','Score: '+mk.toUpperCase());
      let t=sc.c+sc.w,p=t?Math.round(sc.c/t*100):0;
      target.innerHTML=`<div class="scr sh"><div class="scr-big">${p}%</div><div class="scr-msg">${[T('score0'),T('score1'),T('score2'),T('score3')][p<50?0:p<75?1:p<95?2:3]} (${sc.c}/${t})</div><div class="scr-tiles"><div class="scr-t g"><div class="tl">${T('scoreCo')}</div><div class="tv">${sc.c}</div></div><div class="scr-t r"><div class="tl">${T('scoreWr')}</div><div class="tv">${sc.w}</div></div></div><button class="rbtn" onclick="openM('${curMod}')">${T('again')}</button><button class="rbtn" style="background:var(--s2);color:var(--tx)" onclick="goHome()">${T('home')}</button></div>`;
      if(typeof renderQuizResultDetails==='function'&&window._quizLog&&window._quizLog.length>0){const s=target.querySelector('.scr');if(s)renderQuizResultDetails(s,window._quizLog);}
      setTimeout(()=>maybeShowReviewPopup(),500);
      return;
    }

    // PV: question page
    pvPush(qUrl(pos+1), mk.toUpperCase()+' Q'+(pos+1));

    const item=cur[order[pos]],pct=pos/order.length*100;
    const spkText=item[0]||item.q||item.a||'';
    const weakCnt=SRS.weakCount(mk,cur);

    // Compute opts/ci and store in closure variables (no DOM parsing later)
    const {opts,ci}=optFn(item,cur);
    _curOpts=opts; _curCi=ci;

    let h=`<div class="tmr-toggle"><label><span>${T('timer')}</span><button class="tg-sw ${tmrOn?'on':''}" id="tg_${sid}" onclick="event.stopPropagation();${sid}_TT()"></button></label><input type="number" class="tmr-sec" id="ts_${sid}" value="${tmrSec}" min="3" max="60" onchange="${sid}_TS(this.value)" ${tmrOn?'':'disabled'}></div>`;
    if(datasets.length>1||weakCnt>0){h+=`<div class="lvl-tabs">`;
      datasets.forEach(d=>{const cls=d.cls||'';h+=`<button class="lvl-b ${cls} ${!weakMode&&curLbl===d.label?'on':''}" onclick="${sid}_L('${d.label}')">${d.label}</button>`});
      if(weakCnt>0){h+=`<button class="lvl-b ${weakMode?'on':''}" style="${weakMode?'background:var(--red);color:#fff':'background:rgba(217,107,107,.15);color:var(--red)'}" onclick="${sid}_W()">💀 ${weakCnt}</button>`}
      h+=`</div>`}
    h+=`<div class="prg"><div class="prg-bar"><div class="prg-fill" style="width:${pct}%"></div></div><div class="prg-tx">${pos+1}/${order.length}</div></div>`;
    h+=qFn(item);
    if(tmrOn){const C=Math.PI*2*20;h+=`<div class="tmr-wrap"><div class="tmr-ring"><svg width="48" height="48" viewBox="0 0 48 48"><circle class="bg" cx="24" cy="24" r="20"/><circle class="fg" id="tmr_fg_${sid}" cx="24" cy="24" r="20" stroke-dasharray="${C}" stroke-dashoffset="0"/></svg><div class="tmr-num" id="tmr_n_${sid}">${tmrSec}</div></div></div>`}
    h+=`<div class="qfb" id="qfb_${sid}"></div><div class="qos">`;
    opts.forEach((opt,i)=>{h+=`<div class="qo" data-i="${i}"><span class="ol">${'ABCD'[i]}</span><span>${opt}</span></div>`});
    h+=`</div><div style="text-align:center"><button class="tts" onclick="speak('${spkText.replace(/'/g,"\'")}')">${T('speak')}</button></div>`;
    target.innerHTML=h;

    // Attach click handlers — opts/ci captured in closure, no DOM parsing
    if(typeof startQuizTimer==='function')startQuizTimer();
    target.querySelectorAll('.qo').forEach(o=>{
      o.onclick=function(){
        if(o.classList.contains('dis'))return;
        stopTmr();
        const chosen=+o.dataset.i;
        const isOk=(chosen===_curCi);
        if(isOk){sc.c++;SRS.correct(mk,item);addS();}
        else{sc.w++;SRS.wrong(mk,item);rstS();}
        if(typeof logQuizAnswer==='function')logQuizAnswer(item,_curOpts,_curCi,chosen,isOk);
        showResult(item,_curOpts,_curCi,chosen,isOk);
      };
    });

    if(tmrOn)startTmr();
  }

  function timeUp(){
    const item=cur[order[pos]];
    sc.w++;SRS.wrong(mk,item);rstS();
    if(typeof logQuizAnswer==='function')logQuizAnswer(item,_curOpts,_curCi,-1,false);
    showResult(item,_curOpts,_curCi,-1,false);
  }

  // next button handler exposed to inline onclick
  window[sid+'_next']=()=>{pos++;render();window.scrollTo(0,0)};
  window[sid+'_finish']=()=>{pos=order.length;render();window.scrollTo(0,0)};
  window[sid+'_TT']=()=>{tmrOn=!tmrOn;localStorage.setItem('nw3_tmr',tmrOn?'1':'0');render()};
  window[sid+'_TS']=v=>{tmrSec=Math.max(3,Math.min(60,+v||10));localStorage.setItem('nw3_tmr_s',String(tmrSec))};
  window[sid+'_L']=lbl=>{const d=datasets.find(x=>x.label===lbl);if(d){cur=d.data;curLbl=lbl;weakMode=false;reset();render()}};
  window[sid+'_W']=()=>{weakMode=!weakMode;reset();render()};
  render();
}

// ── Unified Module Wrapper ──
function mkU(c,title,modes){
  const sid=c.id.replace(/\W/g,'_');
  let curMode=0;
  function render(){
    let h=`<div class="mod-h"><div class="mod-t">${title}</div></div>`;
    h+=`<div class="u-tabs">`;
    modes.forEach((m,i)=>{
      const cls=m.type==='quiz'?'quiz':m.type==='write'?'write':'';
      h+=`<button class="u-tab ${cls} ${i===curMode?'on':''}" onclick="${sid}_tab(${i})">${m.label}</button>`;
    });
    h+=`</div><div class="u-content" id="uc_${sid}"></div>`;
    c.innerHTML=h;
    modes[curMode].init(c);
  }
  window[sid+'_tab']=i=>{curMode=i;render()};
  render();
}

// ── Writing Practice ──
function mkWrite(c,datasets){
  const sid=c.id.replace(/\W/g,'_');
  let cur=datasets[0].data,curLbl=datasets[0].label;
  let wordIdx=Math.floor(Math.random()*cur.length);
  function render(){
    const w=cur[wordIdx];
    const word=w[0]||'',meaning=w[2]||w[1]||'';
    const target=c.querySelector('.u-content')||c;
    let h=`<div class="lvl-tabs">`;
    datasets.forEach(d=>{h+=`<button class="lvl-b ${d.cls||''} ${curLbl===d.label?'on':''}" onclick="${sid}_WL('${d.label}')">${d.label}</button>`});
    h+=`</div>`;
    h+=`<div class="wr-area">`;
    h+=`<div class="wr-word">${word} <button class="tts" onclick="speak('${word.replace(/'/g,"\\'")}')">${T('speak')}</button></div>`;
    h+=`<div class="wr-hint">${meaning} — ${T('wrPrompt')}</div>`;
    h+=`<textarea class="wr-input" id="wrin_${sid}" placeholder="ここに文を書いてください / Write your sentence here"></textarea>`;
    h+=`<button class="wr-sub" id="wrsub_${sid}" onclick="${sid}_check()">${T('wrSend')}</button>`;
    h+=`<div id="wrfb_${sid}"></div>`;
    h+=`</div>`;
    h+=`<div style="text-align:center;margin-top:12px"><button class="fc-b nx" onclick="${sid}_next()" style="padding:10px 30px">${T('next')} (${T('fWord')})</button></div>`;
    target.innerHTML=h;
  }
  window[sid+'_next']=()=>{wordIdx=Math.floor(Math.random()*cur.length);render()};
  window[sid+'_WL']=lbl=>{const d=datasets.find(x=>x.label===lbl);if(d){cur=d.data;curLbl=lbl;wordIdx=Math.floor(Math.random()*cur.length);render()}};
  window[sid+'_check']=async()=>{
    const inp=document.getElementById('wrin_'+sid);
    const btn=document.getElementById('wrsub_'+sid);
    const fb=document.getElementById('wrfb_'+sid);
    const sentence=inp?.value?.trim();if(!sentence)return;
    btn.disabled=true;btn.textContent=T('wrLoading');
    fb.innerHTML=`<div class="api-loading"><span class="dot">●</span><span class="dot">●</span><span class="dot">●</span></div>`;
    try{
      const w=cur[wordIdx];
      const prompt=`You are a Japanese language teacher for beginner Bengali workers. The student tried to make a sentence using the word "${w[0]}" (${w[1]}).

Their sentence: "${sentence}"

Please respond in this EXACT format (no markdown):
JUDGMENT: [CORRECT or NEEDS FIX]
CORRECTION: [corrected sentence in Japanese, or same if correct]
READING: [hiragana reading of the corrected sentence]
ENGLISH: [English translation]
BENGALI: [Bengali translation]
EXPLANATION: [Brief explanation in simple English and Bengali about any corrections or praise]`;
      const res=await callAPI(prompt,400);
      const lines=res.split('\n').filter(l=>l.trim());
      let html='<div class="wr-fb">';
      lines.forEach(l=>{
        if(l.startsWith('JUDGMENT:')){
          const ok=l.includes('CORRECT')&&!l.includes('NEEDS');
          html+=`<div class="${ok?'ok':'fix'}" style="font-weight:700;font-size:16px">${ok?'✅ '+T('ok'):'🔧 '+l.split(':')[1]?.trim()}</div>`;
        }else if(l.startsWith('CORRECTION:')){html+=`<div class="ja" style="font-size:20px;margin:6px 0">${l.split(':').slice(1).join(':').trim()}</div>`}
        else if(l.startsWith('READING:')){html+=`<div style="color:var(--txM);font-size:14px">${l.split(':').slice(1).join(':').trim()}</div>`}
        else if(l.startsWith('ENGLISH:')){html+=`<div style="color:var(--accB);margin-top:4px">${l.split(':').slice(1).join(':').trim()}</div>`}
        else if(l.startsWith('BENGALI:')){html+=`<div style="color:var(--accY);margin-top:2px">🇧🇩 ${l.split(':').slice(1).join(':').trim()}</div>`}
        else if(l.startsWith('EXPLANATION:')){html+=`<div class="ex" style="margin-top:8px;padding-top:8px;border-top:1px solid var(--brd)">${l.split(':').slice(1).join(':').trim()}</div>`}
      });
      html+='</div>';
      fb.innerHTML=html;
    }catch(e){fb.innerHTML=`<div class="wr-fb fix">Error: ${e.message}</div>`}
    btn.disabled=false;btn.textContent=T('wrSend');
  };
  render();
}

// ── API Example Sentence Generation ──
const _exCache=JSON.parse(localStorage.getItem('nw3_excache')||'{}');
function genExample(word,meaning,targetEl){
  const key=word+'|'+meaning;
  if(_exCache[key]){targetEl.innerHTML=_exCache[key];return}
  targetEl.innerHTML=`<div class="api-loading" style="padding:8px"><span class="dot">●</span><span class="dot">●</span><span class="dot">●</span></div>`;
  callAPI(`Make 2 simple Japanese example sentences using "${word}" (${meaning}). Target: JLPT N5 level beginners from Bangladesh.
Format each as: JAPANESE | READING | ENGLISH | BENGALI
No other text.`,300).then(res=>{
    let html='<div class="ex-box">';
    res.split('\n').filter(l=>l.includes('|')).forEach(l=>{
      const [ja,rd,en,bn]=l.split('|').map(s=>s.trim());
      html+=`<div class="ja">${ja||''}</div><div style="color:var(--txM);font-size:11px">${rd||''}</div><div class="en">${en||''}</div>${bn?`<div class="bn">🇧🇩 ${bn}</div>`:''}`;
    });
    html+='</div>';
    targetEl.innerHTML=html;
    _exCache[key]=html;
    try{localStorage.setItem('nw3_excache',JSON.stringify(_exCache))}catch{}
  }).catch(e=>{targetEl.innerHTML=`<div style="color:var(--red);font-size:12px">Error: ${e.message}</div>`});
}


const BIZ_OX=[{"q":"It's better to greet without making eye contact because Japanese people tend to be shy.","a":false},{"q":"Bow at a 45-degree angle when passing your boss in the hallway.","a":false},{"q":"Bow at a 15-degree angle when greeting your boss in the morning.","a":true},{"q":"Start preparing to leave work five minutes before the official end time.","a":false},{"q":"Do not leave the office while your boss is still working.","a":false},{"q":"During Cool Biz, men can go to work without a necktie.","a":true},{"q":"Men should carry a business bag that can hold documents when commuting.","a":true},{"q":"On casual day, it's okay to wear a tracksuit to work.","a":false},{"q":"In summer, it's acceptable to unbutton three buttons on your shirt.","a":false},{"q":"Women should avoid wearing miniskirts to the office.","a":true},{"q":"Men don't need to worry about slight bed hair.","a":false},{"q":"It's convenient to keep the pinky nail long.","a":false},{"q":"You don't have to shave your beard every day.","a":false},{"q":"Flashy nails are acceptable because fashion is important for women.","a":false},{"q":"Try to be mindful of bad breath.","a":true},{"q":"Avoid using too much perfume.","a":true},{"q":"Change your work shirt every day.","a":true},{"q":"Bangs that cover your eyes from the front.","a":false},{"q":"Be careful not to let dirt accumulate under your nails.","a":true},{"q":"Visible nose hair.","a":false},{"q":"When riding the elevator with a client, stand in front of the control panel.","a":true},{"q":"Knock loudly.","a":false},{"q":"Sit with arms crossed.","a":false},{"q":"Sit with legs together.","a":true},{"q":"Listen to your boss with elbows on the table.","a":false},{"q":"Lean back in your chair while sitting.","a":false},{"q":"Apply makeup on the train.","a":false},{"q":"Women sit with legs spread on the train.","a":false},{"q":"Talk while eating and make noise with your mouth.","a":false},{"q":"Nod appropriately while the other person is speaking.","a":true},{"q":"Look at the other person with your chin raised.","a":false},{"q":"Talk with a smirk.","a":false},{"q":"Respond with “Ah?” when called.","a":false},{"q":"Nod repeatedly with phrases like “Yes, yes, yes.”","a":false},{"q":"Listen with your mouth half open.","a":false},{"q":"The formal version of “soko” (there) is “sonata.”","a":false},{"q":"The formal version of “dare” (who) is “donata.”","a":true},{"q":"Use the honorific “o~suru” for your own actions.","a":true},{"q":"The respectful form of “How is it?” is “Ikaga ni narimasu ka?”","a":false},{"q":"Hide important documents so no one can find them.","a":false},{"q":"Dispose of trash according to company rules.","a":true},{"q":"Employees may take company supplies home.","a":false},{"q":"Ask before borrowing supplies.","a":true},{"q":"Properly file documents.","a":true},{"q":"Turn off your phone’s ringtone on the train.","a":true},{"q":"Speak loudly on the phone because you can't hear the other person.","a":false},{"q":"Text while driving.","a":false},{"q":"Personal calls are okay if you use your own phone.","a":false},{"q":"Set your ringtone loud so you notice incoming calls.","a":false},{"q":"Check text messages frequently.","a":false},{"q":"When work is slow, online shopping on the company PC is okay.","a":false},{"q":"If you're late, always call to inform.","a":true},{"q":"If you're just a little late, texting your boss is fine.","a":false},{"q":"Don't hide mistakes made at work.","a":true},{"q":"Never admit your own mistakes.","a":false},{"q":"Personal outings during work hours are strictly prohibited.","a":false},{"q":"After visiting a client, it's okay to stop by a café and not return.","a":false},{"q":"Update your blog at work because you don’t have time at home.","a":false},{"q":"When late to work, enter quietly to avoid disturbing others.","a":true},{"q":"If you're sick and absent, ask a colleague to handle urgent tasks.","a":true},{"q":"Hold business cards with both hands.","a":true},{"q":"Hand over business cards with your left hand.","a":false},{"q":"Present the card so the name faces the recipient.","a":true},{"q":"Pinch the card when receiving it.","a":false},{"q":"Keep your business card holder in your back pocket.","a":false},{"q":"If you can't read the name on a card, ask the person.","a":true},{"q":"When guiding a guest, walk directly behind them.","a":false},{"q":"When pushing a door open, let the guest enter first.","a":false},{"q":"Serve tea starting with the person in the seat of honor.","a":true},{"q":"Remove your coat before reaching the reception when visiting a client.","a":true},{"q":"Set your phone to silent mode when visiting a client.","a":true},{"q":"Do not drink the tea served to you, as it may be considered rude.","a":false},{"q":"Use chopsticks like a fork and stab food.","a":false},{"q":"Do not lift the rice bowl with your hand while eating.","a":false},{"q":"Avoid smoking until the other person finishes eating.","a":true},{"q":"When offering alcohol, say “Here you go.”","a":true},{"q":"Hold the bottle with your right hand when offering alcohol.","a":false},{"q":"Hold your glass with both hands when receiving alcohol.","a":true},{"q":"In Japan, you don’t have to finish your drink during a toast.","a":true},{"q":"Even if you’re a light drinker, don’t refuse alcohol offered by your boss.","a":false},{"q":"It’s okay to be late the day after drinking.","a":false},{"q":"In a taxi, the seat behind the driver is the seat of honor.","a":true},{"q":"In a reception room, the seat near the door is the lowest rank.","a":true},{"q":"On escalators in Tokyo, stand on the left and leave the right side open.","a":true},{"q":"Ideally, answer the phone within three rings.","a":true},{"q":"Keep a memo pad near the phone.","a":true},{"q":"Even if you can’t hear the name clearly, don’t ask again to avoid being rude.","a":false},{"q":"Place message memos on the edge of the desk to avoid being intrusive.","a":false},{"q":"Bring a memo pad and pen when asking your boss for instructions.","a":true},{"q":"Don’t make excuses immediately when your boss gives you feedback.","a":true},{"q":"Start with the conclusion when reporting.","a":true},{"q":"You don’t need to inform your boss when going out for personal reasons.","a":false},{"q":"Contact your boss directly when taking a sick day.","a":true},{"q":"Always inform the company when going directly to or from a client.","a":true},{"q":"“Sou” in “Hou-Ren-Sou” stands for “Soudan” (consultation).","a":true},{"q":"When dining with your boss, they always pay.","a":false},{"q":"Lending and borrowing money between colleagues is a sign of closeness.","a":false},{"q":"You must attend after-work drinking parties.","a":false},{"q":"The top position in a Japanese company is called “Shachou” (CEO).","a":true}];

const KANJI_DATA = [
  {k:"子",on:"シ",kun:"こ",en:"Child / Small object",ex:"電子 (Electron)"},
  {k:"安",on:"アン",kun:"やす(い)",en:"Safe / Cheap",ex:"安全器 (Protective device)"},
  {k:"時",on:"ジ",kun:"とき",en:"Time",ex:"時限組合せ (Time limit combination)"},
  {k:"一",on:"イチ",kun:"ひと(つ)",en:"One",ex:"一次側 (Primary side)"},
  {k:"金",on:"キン",kun:"かね",en:"Metal / Gold",ex:"金属管 (Metal conduit)"},
  {k:"電",on:"デン",kun:"—",en:"Electricity",ex:"電圧 (Voltage)"},
  {k:"気",on:"キ",kun:"—",en:"Spirit / Air / Energy",ex:"気中遮断器 (Air circuit breaker)"},
  {k:"外",on:"ガイ",kun:"そと",en:"Outside",ex:"外線 (Outer line)"},
  {k:"空",on:"クウ",kun:"そら",en:"Empty / Sky / Air",ex:"空調設備 (Air conditioning equipment)"},
  {k:"間",on:"カン",kun:"あいだ",en:"Interval / Between",ex:"離隔距間 (Separation distance)"},
  {k:"高",on:"コウ",kun:"たか(い)",en:"High",ex:"高圧 (High voltage)"},
  {k:"水",on:"スイ",kun:"みず",en:"Water",ex:"水平 (Horizontal)"},
  {k:"黒",on:"コク",kun:"くろ",en:"Black",ex:"黒色電線 (Black wire)"},
  {k:"大",on:"ダイ",kun:"おお(きい)",en:"Large",ex:"最大電力 (Maximum power)"},
  {k:"三",on:"サン",kun:"み",en:"Three",ex:"三相 (Three-phase)"},
  {k:"火",on:"カ",kun:"ひ",en:"Fire",ex:"引火 (Ignition)"},
  {k:"手",on:"シュ",kun:"て",en:"Hand",ex:"手動 (Manual)"},
  {k:"小",on:"ショウ",kun:"ちい(さい)",en:"Small",ex:"小勢力回路 (Small power circuit)"},
  {k:"出",on:"シュツ",kun:"で(る)",en:"Exit / Output",ex:"出力 (Output)"},
  {k:"力",on:"リョク",kun:"ちから",en:"Power / Force",ex:"電力 (Electric power)"},
  {k:"立",on:"リツ",kun:"た(てる)",en:"Stand / Build",ex:"自立形 (Self-supporting type)"},
  {k:"上",on:"ジョウ",kun:"うえ",en:"Above / Up",ex:"上限 (Upper limit)"},
  {k:"中",on:"チュウ",kun:"なか",en:"Middle / Inside",ex:"中性線 (Neutral wire)"},
  {k:"下",on:"カ",kun:"した",en:"Below / Down",ex:"下限 (Lower limit)"},
  {k:"天",on:"テン",kun:"あめ",en:"Heaven / Ceiling",ex:"天井隠ぺい配線 (Ceiling concealed wiring)"},
  {k:"少",on:"ショウ",kun:"すく(ない)",en:"Few / Little",ex:"少量 (Small quantity)"},
  {k:"二",on:"ニ",kun:"ふた(つ)",en:"Two",ex:"二次側 (Secondary side)"},
  {k:"白",on:"ハク",kun:"しろ",en:"White",ex:"白色電線 (White wire)"},
  {k:"半",on:"ハン",kun:"なか(ば)",en:"Half",ex:"半導体 (Semiconductor)"},
  {k:"口",on:"コウ",kun:"くち",en:"Mouth / Opening",ex:"取付口 (Mounting hole)"},
  {k:"風",on:"フウ",kun:"かぜ",en:"Wind",ex:"風圧荷重 (Wind pressure load)"},
  {k:"左",on:"サ",kun:"ひだり",en:"Left",ex:"左回り (Counter-clockwise)"},
  {k:"右",on:"ウ",kun:"みぎ",en:"Right",ex:"右回り (Clockwise)"},
  {k:"分",on:"ブン",kun:"わ(ける)",en:"Part / Minute / Divide",ex:"分電盤 (Distribution board)"},
  {k:"行",on:"コウ",kun:"い(く)",en:"Go / Conduct",ex:"施行 (Enforcement)"},
  {k:"目",on:"モク",kun:"め",en:"Eye / Item",ex:"項目 (Item)"},
  {k:"木",on:"モク",kun:"き",en:"Wood",ex:"木台 (Wooden base)"},
  {k:"入",on:"ニュウ",kun:"い(れる)",en:"Enter / Input",ex:"投入 (Closing / Input)"},
  {k:"地",on:"チ",kun:"つち",en:"Ground / Earth",ex:"接地 (Earthing / Grounding)"},
  {k:"工",on:"コウ",kun:"—",en:"Construction / Work",ex:"電気工事 (Electrical work)"},
  {k:"事",on:"ジ",kun:"こと",en:"Thing / Business",ex:"電気事業法 (Electricity Business Act)"},
  {k:"用",on:"ヨウ",kun:"もち(いる)",en:"Use / Purpose",ex:"業務用 (Commercial use)"},
  {k:"明",on:"メイ",kun:"あか(るい)",en:"Bright / Light",ex:"照明 (Lighting)"},
  {k:"着",on:"チャク",kun:"き(る)",en:"Wear / Arrive / Attach",ex:"密着 (Close contact)"},
  {k:"定",on:"テイ",kun:"さだ(める)",en:"Fixed / Determine",ex:"定格電圧 (Rated voltage)"},
  {k:"相",on:"ソウ",kun:"あい",en:"Phase / Mutual",ex:"相回転 (Phase rotation)"},
  {k:"内",on:"ナイ",kun:"うち",en:"Inside / Within",ex:"屋内配線 (Indoor wiring)"},
  {k:"作",on:"サク",kun:"つく(る)",en:"Make / Operate",ex:"動作 (Operation)"},
  {k:"物",on:"ブツ",kun:"もの",en:"Thing / Object",ex:"障害物 (Obstacle)"},
  {k:"屋",on:"オク",kun:"や",en:"House / Roof",ex:"屋外用 (Outdoor use)"},
  {k:"引",on:"イン",kun:"ひ(く)",en:"Pull / Draw",ex:"引込線 (Service wire)"},
  {k:"回",on:"カイ",kun:"まわ(る)",en:"Turn / Times / Circuit",ex:"回路 (Circuit)"},
  {k:"転",on:"テン",kun:"ころ(がる)",en:"Roll / Change",ex:"回転磁界 (Rotating magnetic field)"},
  {k:"計",on:"ケイ",kun:"はか(る)",en:"Measure / Plan",ex:"電力量計 (Watt-hour meter)"},
  {k:"界",on:"カイ",kun:"—",en:"World / Boundary / Field",ex:"磁界 (Magnetic field)"},
  {k:"度",on:"ド",kun:"たび",en:"Degree / Limit",ex:"温度 (Temperature)"},
  {k:"開",on:"カイ",kun:"あ(ける)",en:"Open",ex:"開閉器 (Switch)"},
  {k:"閉",on:"ヘイ",kun:"と(じる)",en:"Close",ex:"開閉器 (Switch)"},
  {k:"切",on:"セツ",kun:"き(る)",en:"Cut / Disconnect",ex:"切断 (Cutting)"},
  {k:"起",on:"キ",kun:"お(きる)",en:"Rise / Generate",ex:"起電力 (Electromotive force)"},
  {k:"形",on:"ケイ",kun:"かたち",en:"Shape / Form",ex:"扇形 (Fan-shaped)"},
  {k:"光",on:"コウ",kun:"ひかり",en:"Light",ex:"光束 (Luminous flux)"},
  {k:"軽",on:"ケイ",kun:"かる(い)",en:"Light (weight)",ex:"軽合金 (Light alloy)"},
  {k:"銀",on:"ギン",kun:"—",en:"Silver",ex:"銀 (Silver - used in contacts)"},
  {k:"放",on:"ホウ",kun:"はな(す)",en:"Release / Emit",ex:"放電 (Discharge)"},
  {k:"質",on:"シツ",kun:"—",en:"Quality / Matter",ex:"材質 (Material quality)"},
  {k:"化",on:"カ",kun:"ば(ける)",en:"Change / -ization",ex:"軟化 (Softening)"},
  {k:"合",on:"ゴウ",kun:"あ(う)",en:"Combine / Fit",ex:"接合 (Joining)"},
  {k:"色",on:"シキ",kun:"いろ",en:"Color",ex:"識色 (Color coding)"},
  {k:"動",on:"ドウ",kun:"うご(く)",en:"Move / Operate",ex:"電動機 (Motor)"},
  {k:"方",on:"ホウ",kun:"かた",en:"Direction / Method",ex:"方向性 (Directionality)"},
  {k:"理",on:"リ",kun:"—",en:"Logic / Reason",ex:"物理 (Physics)"},
  {k:"自",on:"ジ",kun:"みずか(ら)",en:"Self",ex:"自動遮断 (Automatic cutoff)"},
  {k:"家",on:"カ",kun:"いえ",en:"House / Home",ex:"一般用電気工作物 (General use)"},
  {k:"業",on:"ギョウ",kun:"わざ",en:"Business / Work",ex:"電気工業 (Electrical industry)"},
  {k:"実",on:"ジツ",kun:"み",en:"Reality / Fruit",ex:"実効値 (RMS value)"},
  {k:"弱",on:"ジャク",kun:"よわ(い)",en:"Weak",ex:"弱電流回路 (Weak current circuit)"},
  {k:"心",on:"シン",kun:"こころ",en:"Heart / Core",ex:"電線心線 (Core wire)"},
  {k:"進",on:"シン",kun:"すす(む)",en:"Advance / Lead",ex:"進相コンデンサ (Static capacitor)"},
  {k:"始",on:"シ",kun:"はじ(める)",en:"Start",ex:"開始 (Start)"},
  {k:"通",on:"ツウ",kun:"とお(る)",en:"Pass / Commute",ex:"導通 (Continuity)"},
  {k:"体",on:"タイ",kun:"からだ",en:"Body / Object",ex:"導体 (Conductor)"},
  {k:"変",on:"ヘン",kun:"か(わる)",en:"Change / Strange",ex:"変圧器 (Transformer)"},
  {k:"箱",on:"ソウ",kun:"はこ",en:"Box",ex:"アウトレットボックス"},
  {k:"材",on:"ザイ",kun:"—",en:"Material",ex:"絶縁材 (Insulating material)"},
  {k:"太",on:"タイ",kun:"ふと(い)",en:"Thick / Fat",ex:"太さ (Thickness / Gauge)"},
  {k:"池",on:"チ",kun:"いけ",en:"Pond / Battery",ex:"電池 (Battery)"},
  {k:"短",on:"タン",kun:"みじか(い)",en:"Short",ex:"短絡 (Short circuit)"},
  {k:"低",on:"テイ",kun:"ひく(い)",en:"Low",ex:"低圧 (Low voltage)"},
  {k:"降",on:"コウ",kun:"お(りる)",en:"Descend / Fall",ex:"電圧降下 (Voltage drop)"},
  {k:"者",on:"シャ",kun:"もの",en:"Person",ex:"電気工事者 (Electrician)"},
  {k:"同",on:"ドウ",kun:"おな(じ)",en:"Same",ex:"同期 (Synchronous)"},
  {k:"試",on:"シ",kun:"ため(す)",en:"Test / Try",ex:"試験 (Examination)"},
  {k:"験",on:"ケン",kun:"—",en:"Test / Verify",ex:"試験 (Examination)"},
  {k:"特",on:"トク",kun:"—",en:"Special",ex:"特別高圧 (Extra-high voltage)"},
  {k:"別",on:"ベツ",kun:"わか(れる)",en:"Separate / Different",ex:"種別 (Category)"},
  {k:"重",on:"ジュウ",kun:"おも(い)",en:"Heavy / Weight",ex:"荷重 (Load)"},
  {k:"料",on:"リョウ",kun:"—",en:"Fee / Material",ex:"材料 (Material)"},
  {k:"図",on:"ズ",kun:"—",en:"Diagram / Map",ex:"配線図 (Wiring diagram)"},
  {k:"強",on:"キョウ",kun:"つよ(い)",en:"Strong",ex:"引張強さ (Tensile strength)"},
  {k:"無",on:"ム",kun:"な(い)",en:"None / Nothing",ex:"無負荷 (No load)"},
  {k:"有",on:"ユウ",kun:"あ(る)",en:"Have / Exist",ex:"有効電力 (Active power)"},
  {k:"極",on:"キョク",kun:"きわ(める)",en:"Pole / Extreme",ex:"接地極 (Grounding electrode)"},
  {k:"路",on:"ロ",kun:"みち",en:"Path / Road",ex:"回路 (Circuit)"},
  {k:"種",on:"シュ",kun:"たね",en:"Type / Species",ex:"Ａ種接地工事 (Type A grounding)"},
  {k:"接",on:"セツ",kun:"つ(ぐ)",en:"Connect / Touch",ex:"接地 (Earthing)"},
  {k:"管",on:"カン",kun:"くだ",en:"Pipe / Tube",ex:"電線管 (Conduit)"},
  {k:"灯",on:"トウ",kun:"ひ",en:"Light / Lamp",ex:"蛍光灯 (Fluorescent lamp)"},
  {k:"厚",on:"コウ",kun:"あつ(い)",en:"Thick",ex:"厚鋼電線管 (Thick steel conduit)"},
  {k:"油",on:"ユ",kun:"あぶら",en:"Oil",ex:"油入変圧器 (Oil-immersed transformer)"},
  {k:"差",on:"サ",kun:"さ(す)",en:"Difference / Insert",ex:"差込形コネクタ (Push-in connector)"},
  {k:"点",on:"テン",kun:"—",en:"Point / Dot",ex:"接続点 (Connection point)"},
  {k:"位",on:"イ",kun:"くらい",en:"Position / Unit",ex:"位相 (Phase)"},
  {k:"表",on:"ヒョウ",kun:"おもて",en:"Table / Surface",ex:"第一表 (Table 1)"},
  {k:"示",on:"ジ",kun:"しめ(す)",en:"Show / Indicate",ex:"指示計器 (Indicating instrument)"},
  {k:"蔵",on:"ゾウ",kun:"くら",en:"Store / Internal",ex:"内蔵 (Built-in)"},
  {k:"線",on:"セン",kun:"—",en:"Line / Wire",ex:"電線 (Electric wire)"},
  {k:"般",on:"ハン",kun:"—",en:"General",ex:"一般用電気工作物 (General use)"},
  {k:"薄",on:"ハク",kun:"うす(い)",en:"Thin",ex:"薄鋼電線管 (Thin steel conduit)"},
  {k:"具",on:"グ",kun:"—",en:"Tool / Equipment",ex:"接続器具 (Connecting device)"},
  {k:"法",on:"ホウ",kun:"—",en:"Law / Method",ex:"電気工事士法 (Electricians Act)"},
  {k:"側",on:"ソク",kun:"がわ",en:"Side",ex:"負荷側 (Load side)"},
  {k:"遅",on:"チ",kun:"おそ(い)",en:"Late / Delay",ex:"遅れ位相 (Lagging phase)"},
  {k:"押",on:"オウ",kun:"お(す)",en:"Push",ex:"押ボタン (Push button)"},
  {k:"速",on:"ソク",kun:"はや(い)",en:"Speed / Fast",ex:"変速 (Speed change)"},
  {k:"確",on:"カク",kun:"たしか",en:"Certain / Confirm",ex:"確認 (Confirmation)"},
  {k:"認",on:"ニン",kun:"みと(める)",en:"Recognize / Approve",ex:"認可 (Approval)"},
  {k:"過",on:"カ",kun:"す(ぎる)",en:"Over / Excess",ex:"過電流 (Overcurrent)"},
  {k:"流",on:"リュウ",kun:"なが(れる)",en:"Flow / Current",ex:"電流 (Electric current)"},
  {k:"断",on:"ダン",kun:"ことわ(る)",en:"Cut / Disconnect",ex:"遮断器 (Circuit breaker)"},
  {k:"機",on:"キ",kun:"はた",en:"Machine",ex:"発電機 (Generator)"},
  {k:"性",on:"セイ",kun:"—",en:"Nature / Property",ex:"絶縁性 (Insulating property)"},
  {k:"粉",on:"フン",kun:"こな",en:"Powder",ex:"粉じん (Dust)"},
  {k:"付",on:"フ",kun:"つ(ける)",en:"Attach",ex:"取付 (Mounting)"},
  {k:"負",on:"フ",kun:"ま(ける)",en:"Negative / Load",ex:"負荷 (Load)"},
  {k:"荷",on:"カ",kun:"に",en:"Load / Cargo",ex:"負荷 (Load)"},
  {k:"防",on:"ボウ",kun:"ふせ(ぐ)",en:"Prevent / Protect",ex:"防護 (Protection)"},
  {k:"置",on:"チ",kun:"お(く)",en:"Place / Put / Set",ex:"設置 (Installation)"},
  {k:"換",on:"カン",kun:"か(える)",en:"Exchange / Replace",ex:"換気扇 (Ventilation fan)"},
  {k:"数",on:"スウ",kun:"かず",en:"Number",ex:"周波数 (Frequency)"},
  {k:"許",on:"キョ",kun:"ゆる(す)",en:"Permit / Allow",ex:"許容電流 (Allowable current)"},
  {k:"容",on:"ヨウ",kun:"—",en:"Capacity / Container",ex:"容量 (Capacity)"},
  {k:"配",on:"ハイ",kun:"くば(る)",en:"Distribute / Wiring",ex:"配線 (Wiring)"},
  {k:"塩",on:"エン",kun:"しお",en:"Salt / Vinyl",ex:"硬質塩化ビニル管 (Rigid PVC conduit)"},
  {k:"公",on:"コウ",kun:"おおやけ",en:"Public",ex:"公称断面積 (Nominal cross-section)"},
  {k:"面",on:"メン",kun:"つら",en:"Surface / Face",ex:"断面積 (Cross-sectional area)"},
  {k:"積",on:"セキ",kun:"つ(む)",en:"Accumulate / Area",ex:"面積 (Area)"},
  {k:"成",on:"セイ",kun:"な(る)",en:"Become / Form",ex:"合成樹脂管 (Synthetic resin conduit)"},
  {k:"束",on:"ソク",kun:"たば",en:"Bundle",ex:"束線 (Bundling wires)"},
  {k:"交",on:"コウ",kun:"まじ(わる)",en:"Exchange / Alternate",ex:"交流 (Alternating current)"},
  {k:"続",on:"ゾク",kun:"つづ(く)",en:"Continue / Connect",ex:"接続 (Connection)"},
  {k:"絶",on:"ゼツ",kun:"た(つ)",en:"Absolute / Insulate",ex:"絶縁 (Insulation)"},
  {k:"最",on:"サイ",kun:"もっと(も)",en:"Most / Max",ex:"最大 (Maximum)"},
  {k:"値",on:"チ",kun:"あたい",en:"Value",ex:"測定値 (Measured value)"},
  {k:"平",on:"ヘイ",kun:"たいら",en:"Flat / Level",ex:"平行 (Parallel)"},
  {k:"消",on:"ショウ",kun:"き(える)",en:"Extinguish / Consume",ex:"消費電力 (Power consumption)"},
  {k:"期",on:"キ",kun:"—",en:"Period / Term",ex:"周期 (Period / Cycle)"},
  {k:"波",on:"ハ",kun:"なみ",en:"Wave",ex:"周波数 (Frequency)"},
  {k:"熱",on:"ネツ",kun:"あつ(い)",en:"Heat",ex:"電熱器 (Electric heater)"},
  {k:"受",on:"ジュ",kun:"う(ける)",en:"Receive",ex:"受電 (Power reception)"},
  {k:"要",on:"ヨウ",kun:"い(る)",en:"Require / Essential",ex:"要件 (Requirement)"},
  {k:"査",on:"サ",kun:"—",en:"Inspect",ex:"検査 (Inspection)"},
  {k:"常",on:"ジョウ",kun:"つね",en:"Normal / Regular",ex:"非常用 (Emergency use)"},
  {k:"発",on:"ハツ",kun:"た(つ)",en:"Generate / Start",ex:"発電 (Power generation)"},
  {k:"設",on:"セツ",kun:"もう(ける)",en:"Establish / Install",ex:"設備 (Equipment)"},
  {k:"備",on:"ビ",kun:"そな(える)",en:"Equipment / Provide",ex:"予備 (Spare)"},
  {k:"振",on:"シン",kun:"ふ(る)",en:"Shake / Vibration",ex:"振動 (Vibration)"},
  {k:"結",on:"ケツ",kun:"むす(ぶ)",en:"Connect / Result",ex:"結線 (Wiring / Connection)"},
  {k:"制",on:"セイ",kun:"—",en:"Control / Limit",ex:"制御 (Control)"},
  {k:"御",on:"ギョ",kun:"おん",en:"Control / Honorific",ex:"制御 (Control)"},
  {k:"限",on:"ゲン",kun:"かぎ(る)",en:"Limit",ex:"制限 (Limitation)"},
  {k:"静",on:"セイ",kun:"しず(か)",en:"Quiet / Static",ex:"静電容量 (Capacitance)"},
  {k:"量",on:"リョウ",kun:"はか(る)",en:"Quantity / Capacity",ex:"電量 (Amount of electricity)"},
  {k:"全",on:"ゼン",kun:"まった(く)",en:"All / Whole",ex:"全負荷 (Full load)"},
  {k:"造",on:"ゾウ",kun:"つく(る)",en:"Create / Structure",ex:"構造 (Structure)"},
  {k:"対",on:"タイ",kun:"—",en:"Against / Opposite / Pair",ex:"接地対地電圧 (Voltage to ground)"},
  {k:"陽",on:"ヨウ",kun:"ひ",en:"Positive / Sun",ex:"陽極 (Anode)"},
  {k:"単",on:"タン",kun:"—",en:"Single",ex:"単相 (Single-phase)"},
  {k:"欠",on:"ケツ",kun:"か(ける)",en:"Missing / Lack",ex:"欠相 (Phase loss)"},
  {k:"保",on:"ホ",kun:"たも(つ)",en:"Keep / Protect",ex:"保護 (Protection)"},
  {k:"絡",on:"ラク",kun:"から(まる)",en:"Entangle / Link",ex:"短絡 (Short circuit)"},
  {k:"調",on:"チョウ",kun:"しら(べる)",en:"Adjust / Investigate",ex:"調光 (Dimming)"},
  {k:"直",on:"チョク",kun:"ただ(ちに)",en:"Straight / Direct",ex:"直流 (Direct current)"},
  {k:"列",on:"レツ",kun:"—",en:"Row / Series",ex:"直列 (Series)"},
  {k:"格",on:"カク",kun:"—",en:"Standard / Rank",ex:"定格 (Rating)"},
  {k:"供",on:"キョウ",kun:"そな(える)",en:"Provide / Offer",ex:"供給 (Supply)"},
  {k:"給",on:"キュウ",kun:"た(まう)",en:"Supply / Salary",ex:"電力供給 (Electricity supply)"},
  {k:"技",on:"ギ",kun:"わざ",en:"Technique / Skill",ex:"技術基準 (Technical standards)"},
  {k:"術",on:"ジュツ",kun:"すべ",en:"Art / Skill / Method",ex:"技術 (Technology)"},
  {k:"準",on:"ジュン",kun:"—",en:"Standard / Level",ex:"標準 (Standard)"},
  {k:"球",on:"キュウ",kun:"たま",en:"Ball / Bulb",ex:"電球 (Light bulb)"},
  {k:"減",on:"ゲン",kun:"へ(る)",en:"Decrease / Reduce",ex:"軽減 (Reduction)"},
  {k:"係",on:"ケイ",kun:"かか(わる)",en:"Relation / Coefficient",ex:"係数 (Coefficient)"},
  {k:"失",on:"シツ",kun:"うしな(う)",en:"Lose",ex:"損失 (Loss)"},
  {k:"資",on:"シ",kun:"—",en:"Resource / Qualification",ex:"資格 (Qualification)"},
  {k:"構",on:"コウ",kun:"かま(える)",en:"Structure / Compose",ex:"構内 (Premises)"},
  {k:"取",on:"シュ",kun:"と(る)",en:"Take / Fetch",ex:"取付 (Mounting)"},
  {k:"留",on:"リュウ",kun:"と(める)",en:"Fasten / Stay",ex:"留めネジ (Set screw)"},
  {k:"非",on:"ヒ",kun:"—",en:"Non- / Emergency",ex:"非常灯 (Emergency light)"},
  {k:"予",on:"ヨ",kun:"あらかじ(め)",en:"Advance / Spare",ex:"予備電源 (Backup power)"},
  {k:"件",on:"ケン",kun:"—",en:"Case / Condition",ex:"要件 (Requirement)"},
  {k:"並",on:"ヘイ",kun:"なら(べる)",en:"Line up / Parallel",ex:"並列 (Parallel)"},
  {k:"比",on:"ヒ",kun:"くら(べる)",en:"Ratio / Compare",ex:"圧比 (Pressure ratio)"},
  {k:"助",on:"ジョ",kun:"たす(ける)",en:"Help / Assistant",ex:"補助 (Auxiliary)"},
  {k:"識",on:"シキ",kun:"し(る)",en:"Discriminate / Know",ex:"識別 (Identification)"},
  {k:"打",on:"ダ",kun:"う(つ)",en:"Strike / Hit",ex:"打ち込み (Embedding)"},
  {k:"連",on:"レン",kun:"つら(なる)",en:"Lead / Connect",ex:"連動 (Interlocking)"},
  {k:"警",on:"ケイ",kun:"—",en:"Warn / Police",ex:"警報器 (Alarm)"},
  {k:"報",on:"ホウ",kun:"しら(せる)",en:"Report / Info",ex:"火災報知機 (Fire alarm)"},
  {k:"端",on:"タン",kun:"はし",en:"Edge / Terminal",ex:"端子 (Terminal)"},
  {k:"照",on:"ショウ",kun:"て(らす)",en:"Illuminate / Check",ex:"照度 (Illuminance)"},
  {k:"器",on:"キ",kun:"うつわ",en:"Device / Vessel",ex:"遮断器 (Circuit breaker)"},
  {k:"異",on:"イ",kun:"こと(なる)",en:"Different / Abnormal",ex:"異常 (Abnormality)"},
  {k:"埋",on:"マイ",kun:"う(める)",en:"Bury",ex:"埋込形 (Flush-mounted)"},
  {k:"則",on:"ソク",kun:"のっと(る)",en:"Rule / Law",ex:"規則 (Rule)"},
  {k:"装",on:"ソウ",kun:"よそお(う)",en:"Equipment / Wear",ex:"外装 (Sheath / Jacket)"},
  {k:"可",on:"カ",kun:"—",en:"Possible / Allow",ex:"可とう電線管 (Flexible conduit)"},
  {k:"燃",on:"ネン",kun:"も(える)",en:"Burn",ex:"燃焼 (Combustion)"},
  {k:"触",on:"ショク",kun:"ふ(れる)",en:"Touch",ex:"接触 (Contact)"},
  {k:"測",on:"ソク",kun:"はか(る)",en:"Measure",ex:"測定 (Measurement)"},
  {k:"扇",on:"セン",kun:"おうぎ",en:"Fan",ex:"換気扇 (Ventilation fan)"},
  {k:"幹",on:"カン",kun:"みき",en:"Main / Trunk",ex:"幹線 (Main line)"},
  {k:"板",on:"バン",kun:"いた",en:"Board / Plate",ex:"配電板 (Switchboard)"},
  {k:"張",on:"チョウ",kun:"は(る)",en:"Tension / Stretch",ex:"引張荷重 (Tensile load)"},
  {k:"径",on:"ケイ",kun:"—",en:"Diameter",ex:"直径 (Diameter)"},
  {k:"検",on:"ケン",kun:"しら(べる)",en:"Inspect / Detect",ex:"検電器 (Voltage detector)"},
  {k:"圧",on:"アツ",kun:"お(す)",en:"Pressure / Voltage",ex:"電圧 (Voltage)"},
  {k:"硬",on:"コウ",kun:"かた(い)",en:"Hard",ex:"硬質塩化ビニル管 (Rigid PVC conduit)"},
  {k:"脂",on:"シ",kun:"あぶら",en:"Resin / Fat",ex:"合成樹脂 (Synthetic resin)"},
  {k:"銅",on:"ドウ",kun:"あかがね",en:"Copper",ex:"軟銅線 (Annealed copper wire)"},
  {k:"導",on:"ドウ",kun:"みちび(く)",en:"Lead / Conduct",ex:"導体 (Conductor)"},
  {k:"効",on:"コウ",kun:"き(く)",en:"Effect / Efficient",ex:"有効電力 (Active power)"},
  {k:"周",on:"シュウ",kun:"まわ(り)",en:"Cycle / Around",ex:"周波数 (Frequency)"},
  {k:"勢",on:"セイ",kun:"いきお(い)",en:"Force / Energy",ex:"小勢力回路 (Small power circuit)"},
  {k:"被",on:"ヒ",kun:"こうむ(る)",en:"Coat / Covered",ex:"被覆 (Insulation / Covering)"},
  {k:"棒",on:"ボウ",kun:"—",en:"Rod / Stick",ex:"接地棒 (Grounding rod)"},
  {k:"柱",on:"チュウ",kun:"はしら",en:"Pillar / Pole",ex:"電柱 (Utility pole)"},
  {k:"基",on:"キ",kun:"もと",en:"Base / Standard",ex:"基準 (Standard)"},
  {k:"損",on:"ソン",kun:"そこ(なう)",en:"Loss / Damage",ex:"鉄損 (Iron loss)"},
  {k:"軟",on:"ナン",kun:"やわ(らかい)",en:"Soft / Annealed",ex:"軟銅線 (Annealed copper wire)"},
  {k:"爆",on:"バク",kun:"—",en:"Explosion",ex:"爆発 (Explosion)"},
  {k:"皮",on:"ヒ",kun:"かわ",en:"Skin / Sheath",ex:"皮剥き (Stripping insulation)"},
  {k:"層",on:"ソウ",kun:"—",en:"Layer",ex:"絶縁層 (Insulation layer)"},
  {k:"均",on:"キン",kun:"—",en:"Uniform / Average",ex:"平均 (Average)"},
  {k:"補",on:"ホ",kun:"おぎな(う)",en:"Supplement / Assist",ex:"補助 (Auxiliary)"},
  {k:"床",on:"ショウ",kun:"ゆか",en:"Floor",ex:"床下 (Underfloor)"},
  {k:"滅",on:"メツ",kun:"ほろ(びる)",en:"Extinguish / Off",ex:"点滅器 (Switch)"},
  {k:"属",on:"ゾク",kun:"—",en:"Belong / Metal",ex:"金属 (Metal)"},
  {k:"鋼",on:"コウ",kun:"はがね",en:"Steel",ex:"鋼管 (Steel pipe)"},
  {k:"磁",on:"ジ",kun:"—",en:"Magnetic",ex:"磁石 (Magnet)"},
  {k:"架",on:"カ",kun:"か(ける)",en:"Rack / Overhead",ex:"架空配線 (Overhead wiring)"},
  {k:"遮",on:"シャ",kun:"さえぎ(る)",en:"Block / Interrupt",ex:"遮断器 (Circuit breaker)"},
  {k:"素",on:"ソ",kun:"—",en:"Element / Raw",ex:"炭素 (Carbon)"},
  {k:"護",on:"ゴ",kun:"まも(る)",en:"Protect",ex:"防護 (Protection)"},
  {k:"漏",on:"ロウ",kun:"も(れる)",en:"Leak",ex:"漏電 (Electric leakage)"},
  {k:"蛍",on:"ケイ",kun:"ほたる",en:"Fluorescent",ex:"蛍光灯 (Fluorescent lamp)"},
  {k:"微",on:"ビ",kun:"—",en:"Micro / Minute",ex:"微弱 (Faint / Weak)"},
  {k:"称",on:"ショウ",kun:"とな(える)",en:"Name / Nominal",ex:"公称電圧 (Nominal voltage)"},
  {k:"樹",on:"ジュ",kun:"き",en:"Resin / Tree",ex:"合成樹脂 (Synthetic resin)"},
  {k:"抵",on:"テイ",kun:"—",en:"Resist",ex:"抵抗 (Resistance)"},
  {k:"抗",on:"コウ",kun:"—",en:"Resist / Anti-",ex:"抵抗 (Resistance)"},
  {k:"縁",on:"エン",kun:"ふち",en:"Edge / Insulation",ex:"絶縁 (Insulation)"},
  {k:"誘",on:"ユウ",kun:"さそ(う)",en:"Induce",ex:"誘導雷 (Induced lightning)"},
  {k:"己",on:"コ",kun:"おのれ",en:"Self",ex:"自己融着テープ (Self-amalgamating tape)"},
  {k:"融",on:"ユウ",kun:"と(ける)",en:"Melt / Fusion",ex:"自己融着テープ"},
  {k:"縮",on:"シュク",kun:"ちぢ(む)",en:"Shrink",ex:"熱収縮チューブ (Heat-shrink tube)"},
  {k:"需",on:"ジュ",kun:"—",en:"Demand",ex:"需用家 (Consumer)"},
  {k:"率",on:"リツ",kun:"—",en:"Rate / Factor",ex:"効率 (Efficiency)"},
  {k:"盤",on:"バン",kun:"—",en:"Board / Panel",ex:"配電盤 (Switchboard)"},
  {k:"覆",on:"フク",kun:"おお(う)",en:"Cover / Coat",ex:"被覆 (Covering)"},
  {k:"耐",on:"タイ",kun:"た(える)",en:"Endure / Resistant",ex:"耐圧 (Withstanding voltage)"},
  {k:"士",on:"シ",kun:"—",en:"Specialist / Man",ex:"電気工事士 (Electrician)"},
  {k:"隠",on:"イン",kun:"かく(す)",en:"Conceal / Hidden",ex:"隠ぺい配線 (Concealed wiring)"},
  {k:"露",on:"ロ",kun:"つゆ",en:"Exposed / Dew",ex:"露出配線 (Exposed wiring)"},
  {k:"岐",on:"キ",kun:"—",en:"Branch / Fork",ex:"分岐回路 (Branch circuit)"},
  {k:"条",on:"ジョウ",kun:"—",en:"Clause / Line",ex:"12条 (Article 12)"},
  {k:"標",on:"ヒョウ",kun:"しるし",en:"Mark / Standard",ex:"標識 (Sign / Mark)"},
  {k:"視",on:"シ",kun:"み(る)",en:"Visual / Sight",ex:"目視点検 (Visual inspection)"},
  {k:"挿",on:"ソウ",kun:"さ(す)",en:"Insert",ex:"挿入 (Insertion)"},
  {k:"災",on:"サイ",kun:"わざわい",en:"Disaster",ex:"防災設備 (Disaster prevention equipment)"},
  {k:"温",on:"オン",kun:"あたた(かい)",en:"Warm / Temperature",ex:"周囲温度 (Ambient temperature)"},
  {k:"源",on:"ゲン",kun:"みなもと",en:"Source / Origin",ex:"電源 (Power source)"},
  {k:"囲",on:"イ",kun:"かこ(む)",en:"Surround / Enclose",ex:"周囲温度 (Ambient temperature)"},
  {k:"橋",on:"キョウ",kun:"はし",en:"Bridge / Crosslink",ex:"架橋ポリエチレン絶縁 (XLPE insulation)"},
  {k:"順",on:"ジュン",kun:"—",en:"Order / Sequence",ex:"相順 (Phase sequence / rotation)"},
  {k:"軸",on:"ジク",kun:"—",en:"Axis / Shaft",ex:"軸受け (Bearing)"},
  {k:"製",on:"セイ",kun:"—",en:"Manufactured / Made of",ex:"合成樹脂製 (Synthetic resin type)"},
  {k:"品",on:"ヒン",kun:"しな",en:"Article / Goods",ex:"電気用品 (Electrical appliance)"},
  {k:"湯",on:"トウ",kun:"ゆ",en:"Hot water",ex:"給湯器 (Water heater)"},
  {k:"施",on:"シ",kun:"ほどこ(す)",en:"Apply / Execute / Install",ex:"施工 (Construction work)"},
  {k:"危",on:"キ",kun:"あぶ(ない)",en:"Dangerous / Hazardous",ex:"危険物 (Hazardous material)"},
  {k:"険",on:"ケン",kun:"—",en:"Steep / Dangerous",ex:"危険 (Danger / Hazard)"},
  {k:"害",on:"ガイ",kun:"—",en:"Harm / Damage",ex:"障害物 (Obstacle)"},
  {k:"義",on:"ギ",kun:"—",en:"Duty / Justice / Meaning",ex:"義務 (Obligation)"},
  {k:"務",on:"ム",kun:"つと(める)",en:"Duty / Serve / Work",ex:"義務 (Obligation)"},
  {k:"規",on:"キ",kun:"—",en:"Rule / Standard / Regulation",ex:"規制 (Regulation)"},
  {k:"省",on:"ショウ",kun:"はぶ(く)",en:"Ministry / Save / Omit",ex:"省令 (Ministerial ordinance)"},
  {k:"令",on:"レイ",kun:"—",en:"Order / Ordinance / Command",ex:"省令 (Ministerial ordinance)"},
  {k:"産",on:"サン",kun:"う(む)",en:"Produce / Industry / Birth",ex:"産業 (Industry)"},
  {k:"経",on:"ケイ",kun:"へ(る)",en:"Pass / Manage / Economy",ex:"経済産業省 (Ministry of Economy)"},
  {k:"済",on:"サイ",kun:"す(む)",en:"Finish / Settle / Economy",ex:"経済 (Economy)"},
  {k:"販",on:"ハン",kun:"—",en:"Sell / Distribute",ex:"販売 (Sale / Distribution)"},
  {k:"売",on:"バイ",kun:"う(る)",en:"Sell",ex:"販売 (Sale)"},
  {k:"輸",on:"ユ",kun:"—",en:"Transport / Import / Export",ex:"輸入 (Import)"},
  {k:"区",on:"ク",kun:"—",en:"Ward / Section / Classify",ex:"区分 (Classification / Category)"},
  {k:"正",on:"セイ",kun:"ただ(しい)",en:"Correct / Proper / Right",ex:"正弦波 (Sine wave)"},
  {k:"政",on:"セイ",kun:"まつりごと",en:"Government / Politics",ex:"政令 (Cabinet order)"},
  {k:"民",on:"ミン",kun:"たみ",en:"People / Civil / Private",ex:"民間事業者 (Private enterprise)"},
  {k:"的",on:"テキ",kun:"まと",en:"Target / -ive / Of",ex:"目的 (Purpose / Goal)"},
  {k:"場",on:"ジョウ",kun:"ば",en:"Place / Location / Scene",ex:"特殊場所 (Special location)"},
  {k:"所",on:"ショ",kun:"ところ",en:"Place / Location",ex:"変電所 (Substation)"},
  {k:"石",on:"セキ",kun:"いし",en:"Stone / Rock",ex:"石油 (Petroleum / Oil)"},
  {k:"貯",on:"チョ",kun:"た(める)",en:"Store / Accumulate / Save",ex:"貯蔵 (Storage)"},
  {k:"修",on:"シュウ",kun:"おさ(める)",en:"Repair / Study / Master",ex:"修理 (Repair)"},
  {k:"塗",on:"ト",kun:"ぬ(る)",en:"Paint / Coat / Apply",ex:"塗装 (Coating / Painting)"},
  {k:"吹",on:"スイ",kun:"ふ(く)",en:"Blow / Spray",ex:"吹き付け塗装 (Spray coating)"},
  {k:"住",on:"ジュウ",kun:"す(む)",en:"Reside / Live / Dwell",ex:"住宅 (Residential building)"},
  {k:"宅",on:"タク",kun:"—",en:"Home / Residence",ex:"住宅 (Residence)"},
  {k:"室",on:"シツ",kun:"—",en:"Room / Chamber",ex:"和室 (Japanese-style room)"},
  {k:"壁",on:"ヘキ",kun:"かべ",en:"Wall",ex:"壁の内部配管 (In-wall conduit)"},
  {k:"洗",on:"セン",kun:"あら(う)",en:"Wash / Clean",ex:"洗面所 (Washroom / Sink area)"},
  {k:"台",on:"ダイ",kun:"—",en:"Stand / Counter / Platform",ex:"台所 (Kitchen)"},
  {k:"車",on:"シャ",kun:"くるま",en:"Vehicle / Car / Wheel",ex:"車庫 (Garage)"},
  {k:"庫",on:"コ",kun:"—",en:"Warehouse / Storage / Garage",ex:"車庫 (Garage)"},
  {k:"和",on:"ワ",kun:"やわ(らぐ)",en:"Harmony / Japanese-style",ex:"和室 (Japanese-style room)"},
  {k:"洋",on:"ヨウ",kun:"—",en:"Western / Ocean",ex:"洋室 (Western-style room)"},
  {k:"居",on:"キョ",kun:"い(る)",en:"Reside / Be present / Stay",ex:"居間 (Living room)"},
  {k:"玄",on:"ゲン",kun:"—",en:"Mysterious / Dark / Entrance",ex:"玄関 (Entrance / Foyer)"},
  {k:"関",on:"カン",kun:"せき",en:"Gate / Connection / Involve",ex:"玄関 (Entrance / Foyer)"},
  {k:"庭",on:"テイ",kun:"にわ",en:"Garden / Yard",ex:"庭園灯 (Garden light)"},
  {k:"寝",on:"シン",kun:"ね(る)",en:"Sleep / Lie down",ex:"寝室 (Bedroom)"},
  {k:"便",on:"ベン",kun:"たよ(り)",en:"Convenient / Toilet / News",ex:"便所 (Restroom / Toilet)"},
  {k:"道",on:"ドウ",kun:"みち",en:"Road / Path / Way",ex:"公道 (Public road)"}
];

// ── 77 NEW KANJI (from resource/materials Excel) ──────────────────────────
const NEW_KANJI = [
  {k:"丸",on:"ガン",kun:"まる",en:"Round / Circle",ex:"丸形ケーブル (Round-type cable)"},
  {k:"主",on:"シュ",kun:"ぬし",en:"Main / Host / Owner",ex:"施主 (Building owner / Client)"},
  {k:"乾",on:"カン",kun:"かわ(く)",en:"Dry",ex:"乾式変圧器 (Dry-type transformer)"},
  {k:"互",on:"ゴ",kun:"たが(い)",en:"Mutual / Reciprocal",ex:"相互式インターホン (Interphone system)"},
  {k:"井",on:"セイ",kun:"い",en:"Well / Ceiling",ex:"天井 (Ceiling)"},
  {k:"亜",on:"ア",kun:"—",en:"Sub- / Zinc (亜鉛)",ex:"亜鉛めっき鉄線 (Galvanized iron wire)"},
  {k:"人",on:"ジン",kun:"ひと",en:"Person / Human",ex:"現場代理人 (Site representative)"},
  {k:"仕",on:"シ",kun:"つか(える)",en:"Serve / Work",ex:"仕様書 (Specification document)"},
  {k:"代",on:"ダイ",kun:"か(わる)",en:"Replace / Generation / Fee",ex:"現場代理人 (Field representative)"},
  {k:"任",on:"ニン",kun:"まか(せる)",en:"Responsibility / Trust",ex:"責任分界点 (Demarcation point)"},
  {k:"使",on:"シ",kun:"つか(う)",en:"Use / Employ",ex:"最大使用電流 (Maximum usable current)"},
  {k:"倍",on:"バイ",kun:"—",en:"Double / Times / Multiple",ex:"倍率器 (Multiplier / Voltage divider)"},
  {k:"共",on:"キョウ",kun:"とも",en:"Together / Public / Shared",ex:"公共事業 (Public utility work)"},
  {k:"反",on:"ハン",kun:"そ(る)",en:"Oppose / Reflect / Anti-",ex:"反射笠 (Reflector shade)"},
  {k:"号",on:"ゴウ",kun:"—",en:"Number / Type No. / Signal",ex:"2号ボックスコネクタ (No.2 box connector)"},
  {k:"呼",on:"コ",kun:"よ(ぶ)",en:"Call / Nominal / Summon",ex:"呼び線挿入器 (Fish tape / Wire guide)"},
  {k:"営",on:"エイ",kun:"いとな(む)",en:"Manage / Build / Operate",ex:"造営材 (Building structural material)"},
  {k:"型",on:"ケイ",kun:"かた",en:"Type / Model / Mold",ex:"型枠 (Formwork / Mold frame)"},
  {k:"増",on:"ゾウ",kun:"ふ(える)",en:"Increase / Amplify",ex:"増幅器 (Amplifier)"},
  {k:"多",on:"タ",kun:"おお(い)",en:"Many / Much / Multi-",ex:"湿気の多い場所 (Damp location)"},
  {k:"密",on:"ミツ",kun:"—",en:"Dense / Close / Secret",ex:"磁束密度 (Magnetic flux density)"},
  {k:"射",on:"シャ",kun:"い(る)",en:"Shoot / Emit / Reflect",ex:"反射 (Reflection)"},
  {k:"幅",on:"フク",kun:"はば",en:"Width / Range / Amplitude",ex:"増幅 (Amplification)"},
  {k:"式",on:"シキ",kun:"—",en:"Type / Formula / System",ex:"三相3線式 (3-phase 3-wire system)"},
  {k:"弦",on:"ゲン",kun:"つる",en:"String / Chord / Sine",ex:"正弦波 (Sine wave)"},
  {k:"従",on:"ジュウ",kun:"したが(う)",en:"Follow / Comply / From",ex:"電気工事従事者 (Electrical construction worker)"},
  {k:"抜",on:"バツ",kun:"ぬ(く)",en:"Pull out / Extract / Remove",ex:"抜け止め形コンセント (Locking outlet)"},
  {k:"掛",on:"カ",kun:"か(ける)",en:"Hang / Hook / Apply",ex:"引掛けシーリング (Locking ceiling outlet)"},
  {k:"措",on:"ソ",kun:"—",en:"Manage / Measure / Step",ex:"接触防護措置 (Contact protection measures)"},
  {k:"撃",on:"ゲキ",kun:"う(つ)",en:"Strike / Attack / Impact",ex:"耐衝撃性 (Impact resistance)"},
  {k:"整",on:"セイ",kun:"ととの(える)",en:"Arrange / Rectify / Adjust",ex:"整流器 (Rectifier)"},
  {k:"斉",on:"セイ",kun:"—",en:"Even / Uniform / Simultaneous",ex:"一斉鳴動 (Simultaneous alarm activation)"},
  {k:"斫",on:"シャク",kun:"は(つる)",en:"Chisel / Hack / Cut concrete",ex:"斫り工事 (Concrete cutting/chiseling work)"},
  {k:"易",on:"イ",kun:"やさ(しい)",en:"Easy / Simple",ex:"簡易電気工事 (Simple/minor electrical work)"},
  {k:"書",on:"ショ",kun:"か(く)",en:"Write / Document",ex:"仕様書 (Specification document)"},
  {k:"枠",on:"—",kun:"わく",en:"Frame / Border / Mount",ex:"連用取付枠 (Multi-gang mounting frame)"},
  {k:"根",on:"コン",kun:"ね",en:"Root / Base / Origin",ex:"羽根ぎり (Spade drill bit)"},
  {k:"械",on:"カイ",kun:"—",en:"Machine / Mechanism",ex:"機械的強度 (Mechanical strength)"},
  {k:"様",on:"ヨウ",kun:"さま",en:"Style / Manner / Specification",ex:"仕様書 (Specification document)"},
  {k:"止",on:"シ",kun:"と(まる)",en:"Stop / Fix / Prevent",ex:"抜け止め形コンセント (Locking outlet)"},
  {k:"殊",on:"シュ",kun:"こと",en:"Special / Particular",ex:"特殊電気工事 (Special electrical work)"},
  {k:"殺",on:"サツ",kun:"ころ(す)",en:"Kill / Sterilize",ex:"殺菌灯 (Germicidal lamp)"},
  {k:"液",on:"エキ",kun:"—",en:"Liquid / Fluid",ex:"液面制御 (Liquid level control)"},
  {k:"湿",on:"シツ",kun:"しめ(る)",en:"Damp / Humid / Wet",ex:"湿気の多い場所 (Damp/humid location)"},
  {k:"燥",on:"ソウ",kun:"—",en:"Dry out / Arid",ex:"乾燥した場所 (Dry/arid location)"},
  {k:"片",on:"ヘン",kun:"かた",en:"One-sided / Fragment / Piece",ex:"可動鉄片形計器 (Moving-iron instrument)"},
  {k:"現",on:"ゲン",kun:"あらわ(れる)",en:"Present / Appear / Current",ex:"現場 (Construction site / Field)"},
  {k:"画",on:"カク",kun:"かく",en:"Partition / Plan / Section",ex:"防火区画 (Fire-resistant compartment)"},
  {k:"瞬",on:"シュン",kun:"またた(く)",en:"Instant / Blink / Momentary",ex:"瞬時値 (Instantaneous value)"},
  {k:"破",on:"ハ",kun:"やぶ(る)",en:"Break / Rupture / Dash",ex:"破線 (Dashed line on wiring diagram)"},
  {k:"程",on:"テイ",kun:"ほど",en:"Degree / Extent / Code",ex:"内線規程 (Interior wiring code)"},
  {k:"竣",on:"シュン",kun:"—",en:"Complete / Finish (construction)",ex:"竣工検査 (Completion inspection)"},
  {k:"笠",on:"リュウ",kun:"かさ",en:"Hat / Shade / Reflector cap",ex:"反射笠照明 (Reflector shade lighting)"},
  {k:"第",on:"ダイ",kun:"—",en:"Ordinal / No. / Grade",ex:"第3種接地工事 (Class-3 grounding work)"},
  {k:"算",on:"サン",kun:"かぞ(える)",en:"Calculate / Count / Estimate",ex:"積算 (Cost estimation / Quantity survey)"},
  {k:"簡",on:"カン",kun:"—",en:"Simple / Brief / Easy",ex:"簡易接触防護措置 (Simple contact protection)"},
  {k:"粘",on:"ネン",kun:"ねば(る)",en:"Sticky / Adhesive / Viscous",ex:"粘着テープ (Adhesive tape)"},
  {k:"羽",on:"ウ",kun:"はね",en:"Wing / Feather / Fan blade",ex:"換気扇の羽根 (Ventilation fan blade)"},
  {k:"菌",on:"キン",kun:"—",en:"Germ / Bacteria / Fungus",ex:"殺菌灯 (Germicidal UV lamp)"},
  {k:"蓄",on:"チク",kun:"たくわ(える)",en:"Store / Accumulate / Stock",ex:"蓄電池 (Storage battery)"},
  {k:"衝",on:"ショウ",kun:"つ(く)",en:"Collide / Impact / Shock",ex:"耐衝撃性 (Impact resistance)"},
  {k:"衡",on:"コウ",kun:"—",en:"Balance / Equilibrium",ex:"平衡 (Balance / Equilibrium)"},
  {k:"責",on:"セキ",kun:"せ(める)",en:"Responsibility / Blame",ex:"責任分界点 (Demarcation point of responsibility)"},
  {k:"費",on:"ヒ",kun:"つい(やす)",en:"Expense / Consume / Cost",ex:"消費電力 (Power consumption)"},
  {k:"赤",on:"セキ",kun:"あか",en:"Red",ex:"赤色表示灯 (Red indicator lamp)"},
  {k:"足",on:"ソク",kun:"あし",en:"Foot / Leg / Sufficient / Scaffold",ex:"足場 (Scaffolding)"},
  {k:"輝",on:"キ",kun:"かがや(く)",en:"Shine / Brilliance / Luminance",ex:"高輝度放電灯 (High-intensity discharge lamp)"},
  {k:"込",on:"—",kun:"こ(む)",en:"Embed / Fill in / Into",ex:"埋込形 (Flush-mounted / Recessed type)"},
  {k:"避",on:"ヒ",kun:"さ(ける)",en:"Avoid / Deflect / Protect from",ex:"避雷器 (Lightning arrester)"},
  {k:"針",on:"シン",kun:"はり",en:"Needle / Pin / Rod / Pointer",ex:"避雷針 (Lightning rod)"},
  {k:"鉄",on:"テツ",kun:"—",en:"Iron / Steel",ex:"亜鉛めっき鉄線 (Galvanized iron wire)"},
  {k:"鉛",on:"エン",kun:"なまり",en:"Lead (Pb) / Zinc compound",ex:"亜鉛 (Zinc) / 鉛管 (Lead pipe)"},
  {k:"雨",on:"ウ",kun:"あめ",en:"Rain",ex:"防雨形コンセント (Rainproof outlet)"},
  {k:"零",on:"レイ",kun:"—",en:"Zero",ex:"零相変流器 (Zero-phase current transformer)"},
  {k:"雷",on:"ライ",kun:"かみなり",en:"Thunder / Lightning",ex:"避雷器 (Lightning arrester)"},
  {k:"鳴",on:"メイ",kun:"な(く)",en:"Sound / Ring / Alarm",ex:"一斉鳴動 (Simultaneous alarm activation)"}
];

// ── KATAKANA VOCABULARY (106 terms) ─────────────────────────────────────────
const VOCAB_DATA = [
  {k:"アース",en:"earth / grounding",ex:"Zero-potential reference connection to ground"},
  {k:"アーステスタ",en:"earth resistance meter",ex:"Measures resistance of grounding electrode"},
  {k:"アウトレットボックス",en:"outlet box",ex:"Metal box for wiring connections in walls/ceilings"},
  {k:"インサート",en:"insert (ceiling anchor)",ex:"Embedded anchor in concrete slab for hanging fixtures"},
  {k:"インサートキャップ",en:"insert cap",ex:"Protective cap for concrete ceiling inserts"},
  {k:"インシュロック",en:"cable tie / zip tie",ex:"Nylon strap for bundling and securing cables"},
  {k:"インダクタンス",en:"inductance",ex:"Property of conductor opposing change in current (unit: H)"},
  {k:"インバータ",en:"inverter",ex:"Converts DC to AC or changes frequency; used in air conditioners"},
  {k:"インピーダンス",en:"impedance",ex:"Total AC opposition (Z = R + jX, unit: Ω)"},
  {k:"ウエザーキャップ",en:"weather cap",ex:"Weatherproof cap for overhead service entrance conduit"},
  {k:"ウォータポンププライヤ",en:"water pump pliers",ex:"Adjustable slip-joint pliers for gripping pipes and fittings"},
  {k:"エルボ",en:"elbow (conduit fitting)",ex:"90° or 45° bend fitting for conduit runs"},
  {k:"エンドカバー",en:"end cover",ex:"Closing cap for cable tray or duct ends"},
  {k:"エントランスキャップ",en:"entrance cap",ex:"Service entrance cap at top of outdoor service conduit"},
  {k:"カールプラグ",en:"curl plug / wall anchor",ex:"Plastic expansion anchor for screws in masonry"},
  {k:"カットアウト",en:"cut-out switch",ex:"Open fuse holder used in distribution lines"},
  {k:"カップリング",en:"coupling",ex:"Conduit fitting that joins two conduit sections end-to-end"},
  {k:"キセノンランプ",en:"xenon lamp",ex:"High-intensity discharge lamp using xenon gas"},
  {k:"キャノピスイッチ",en:"canopy switch",ex:"Switch built into the ceiling fixture canopy base"},
  {k:"キャプタイヤケーブル",en:"tough-rubber sheath cable",ex:"Portable flexible cable with rubber sheath for equipment"},
  {k:"クランプメータ",en:"clamp meter",ex:"Current meter that clamps around conductor without cutting"},
  {k:"グロースイッチ",en:"glow switch / starter",ex:"Glow-discharge starter used in fluorescent lamp circuits"},
  {k:"ケーブル",en:"cable",ex:"Insulated conductors with protective sheath (e.g. VVF, CV)"},
  {k:"ケーブルカッタ",en:"cable cutter",ex:"Ratchet or hydraulic tool for cutting large cables cleanly"},
  {k:"ケーブルラック",en:"cable rack / cable tray",ex:"Open metal tray supporting multiple cables overhead"},
  {k:"コイル",en:"coil",ex:"Wound conductor creating inductance or electromagnetic field"},
  {k:"コード",en:"cord",ex:"Flexible insulated conductors for portable equipment"},
  {k:"コードサポート",en:"cord support",ex:"Device that supports and guides flexible cords"},
  {k:"コードレスドリル",en:"cordless drill",ex:"Battery-powered drill for boring holes in walls/ceilings"},
  {k:"コンクリートトラス",en:"concrete cable trough",ex:"Precast concrete cable duct laid underground"},
  {k:"コンクリートボックス",en:"concrete box",ex:"Junction box embedded in concrete during construction"},
  {k:"コンセント",en:"receptacle / outlet",ex:"Wall socket for plugging in electrical equipment"},
  {k:"コンデンサ",en:"capacitor / condenser",ex:"Stores electric charge; used for power factor correction"},
  {k:"コンビネーションカップリング",en:"combination coupling",ex:"Fitting connecting rigid metal conduit to flexible conduit"},
  {k:"サーマルリレー",en:"thermal relay",ex:"Overload protection device that trips on sustained overcurrent"},
  {k:"サーモスタット",en:"thermostat",ex:"Temperature-controlled switch for heating/cooling systems"},
  {k:"サドル",en:"saddle (pipe clamp)",ex:"U-shaped clamp securing conduit/pipe to a surface"},
  {k:"シース",en:"sheath / cable jacket",ex:"Outer protective covering of a cable"},
  {k:"シーリング",en:"ceiling fitting / outlet",ex:"Ceiling-mounted wiring outlet for luminaires"},
  {k:"シーリングフィッチング",en:"ceiling fitting (weatherproof)",ex:"Weatherproof conduit fitting at ceiling entry point"},
  {k:"ジャンクションボックス",en:"junction box",ex:"Box for splicing and protecting conductor connections"},
  {k:"シャンデリア",en:"chandelier",ex:"Decorative multi-light pendant fixture hanging from ceiling"},
  {k:"ジョイントボックス",en:"joint box / junction box",ex:"Box enclosing wire splices in VVF cable wiring"},
  {k:"ショウウインドー",en:"show window / display window",ex:"Illuminated retail display window requiring special wiring"},
  {k:"ショウケース",en:"showcase / display case",ex:"Illuminated glass display case in retail settings"},
  {k:"スイッチボックス",en:"switch box",ex:"Metal or plastic box for mounting wall switches"},
  {k:"ステップル",en:"staple (wiring staple)",ex:"U-shaped metal staple for securing cables to wood"},
  {k:"スポットネットワーク",en:"spot network",ex:"High-reliability power distribution network for dense areas"},
  {k:"セルラダクト",en:"cellular metal floor duct",ex:"Steel floor deck with enclosed cells for underfloor wiring"},
  {k:"ソレノイド",en:"solenoid",ex:"Electromagnetic coil producing linear motion; used in relays"},
  {k:"ターミナルキャップ",en:"terminal cap",ex:"Insulating cap placed over exposed conductor ends"},
  {k:"ダイス",en:"die (threading tool)",ex:"Tool for cutting external threads on conduit or pipe"},
  {k:"タイムスイッチ",en:"time switch",ex:"Automatic switch that operates at preset times"},
  {k:"ダクタクリップ",en:"duct clip",ex:"Clip for securing and spacing cables in cable ducts"},
  {k:"ダクトカップリング",en:"duct coupling",ex:"Fitting joining two sections of cable duct"},
  {k:"ダクトサポート",en:"duct support",ex:"Bracket or hanger supporting cable duct from structure"},
  {k:"タップ",en:"tap (threading tool)",ex:"Tool for cutting internal threads in metal"},
  {k:"チャイム",en:"chime / doorbell",ex:"Audio signaling device at building entrances"},
  {k:"チューブサポート",en:"tube support",ex:"Support bracket for tubing or conduit runs"},
  {k:"ディスクグラインダ",en:"disc grinder / angle grinder",ex:"Power tool for cutting or grinding metal conduit"},
  {k:"トーチランプ",en:"torch lamp / blowtorch",ex:"Propane torch for heating conduit or soldering"},
  {k:"トラフ",en:"cable trough",ex:"Open channel (plastic/concrete) for underground cable routing"},
  {k:"ノーマルベンド",en:"normal bend (conduit)",ex:"Standard 90° conduit elbow fitting"},
  {k:"ノックアウトパンチャ",en:"knockout puncher",ex:"Tool for punching clean holes in electrical enclosures"},
  {k:"パイプカッタ",en:"pipe cutter",ex:"Rotary tool for cutting conduit or pipe cleanly"},
  {k:"パイプバイス",en:"pipe vise",ex:"Vise that grips round pipe or conduit for threading"},
  {k:"パイプベンダ",en:"pipe bender",ex:"Tool for bending EMT or rigid conduit to desired angles"},
  {k:"パイプレンチ",en:"pipe wrench",ex:"Adjustable wrench with serrated jaw for gripping pipe"},
  {k:"バイメタル",en:"bimetal strip",ex:"Two-metal strip that bends with temperature; used in thermal relays"},
  {k:"パイロットランプ",en:"pilot lamp / indicator light",ex:"Small lamp indicating on/off status of a circuit"},
  {k:"パワーコンディショナ",en:"power conditioner (PCS)",ex:"Converts DC from solar panels to grid-compatible AC"},
  {k:"ヒューズ",en:"fuse",ex:"Overcurrent protection that melts and breaks the circuit"},
  {k:"フィクスチュアスタッド",en:"fixture stud",ex:"Threaded rod on outlet box for mounting fixtures"},
  {k:"フィラメント",en:"filament",ex:"Thin tungsten wire that glows in incandescent lamps"},
  {k:"ブザー",en:"buzzer",ex:"Electromagnetic sound device for alarms and signals"},
  {k:"プリカナイフ",en:"prica knife",ex:"Knife for cutting flexible (prica-type) conduit"},
  {k:"プルスイッチ",en:"pull switch",ex:"Ceiling-mounted switch operated by pulling a cord"},
  {k:"プルボックス",en:"pull box",ex:"Large box used to pull cables through conduit runs"},
  {k:"プレート",en:"switch / outlet cover plate",ex:"Decorative cover plate over switch or outlet mounting"},
  {k:"フロアダクト",en:"floor duct",ex:"Metal duct system embedded in floor for underfloor wiring"},
  {k:"ベクトル",en:"vector",ex:"Quantity with magnitude and direction; used in AC circuit analysis"},
  {k:"ペンダント",en:"pendant light",ex:"Luminaire suspended from ceiling by cord, chain, or rod"},
  {k:"ペンダントスイッチ",en:"pendant switch",ex:"Switch on a hanging cord for controlling overhead lights"},
  {k:"ホイートストンブリッジ",en:"Wheatstone bridge",ex:"Precision circuit for measuring unknown resistance values"},
  {k:"ボックスコネクタ",en:"box connector",ex:"Fitting for securing conduit to an electrical box"},
  {k:"ホルソ",en:"hole saw",ex:"Circular saw for cutting large holes in boxes or panels"},
  {k:"ボルトクリッパ",en:"bolt clipper",ex:"Large cutting pliers for bolts, padlocks, or wire rope"},
  {k:"メタルモールジング",en:"metal moulding / type-1 raceway",ex:"Surface-mounted metal wiring duct (一種金属線ぴ)"},
  {k:"モータブレーカ",en:"motor breaker / manual motor starter",ex:"Overload and short-circuit protection for motors"},
  {k:"ユニオンカップリング",en:"union coupling",ex:"Three-piece coupling for conduit where rotation is needed"},
  {k:"ユニバーサル",en:"universal (conduit body)",ex:"Conduit body allowing 90° turns in any direction"},
  {k:"ライティングダクト",en:"lighting duct / track lighting",ex:"Surface-mounted track allowing repositionable luminaire connections"},
  {k:"ラス",en:"lath (metal mesh)",ex:"Metal mesh base for plaster or mortar in walls"},
  {k:"リアクタンス",en:"reactance",ex:"Frequency-dependent AC opposition; inductive (XL) or capacitive (XC)"},
  {k:"リーマ",en:"reamer",ex:"Tool for deburring the cut end of conduit"},
  {k:"リモコンスイッチ",en:"remote control switch",ex:"Low-voltage switch controlling remote relay for lighting"},
  {k:"リモコンセレクタスイッチ",en:"remote control selector switch",ex:"Multi-position remote switch for selecting lighting groups"},
  {k:"リモコントランス",en:"remote control transformer",ex:"Step-down transformer for remote control (24V) lighting systems"},
  {k:"リモコンリレー",en:"remote control relay",ex:"Latching relay switched by remote control system (stays on/off)"},
  {k:"リングスリーブ",en:"ring sleeve (crimp connector)",ex:"Crimp connector for joining conductors (size: small ○, small, medium)"},
  {k:"リングレジューサ",en:"ring reducer",ex:"Concentric reducer ring for fitting smaller conduit into larger KO"},
  {k:"ルームエアコン",en:"room air conditioner",ex:"Split-type room cooling/heating; requires dedicated 200V circuit"},
  {k:"ルーメン",en:"lumen (lm)",ex:"Unit of luminous flux — total light output of a source"},
  {k:"ルクス",en:"lux (lx)",ex:"Unit of illuminance — lumens per square meter (lm/m²)"},
  {k:"ロックナット",en:"lock nut",ex:"Threaded nut that secures conduit fittings to an electrical box"},
  {k:"ワイヤストリッパ",en:"wire stripper",ex:"Tool for removing insulation from conductors without nicking wire"}
];

// ── UNIFIED DATA ─────────────────────────────────────────────────────────────
const ALL_KANJI = [...KANJI_DATA, ...NEW_KANJI];

// ── COMPOUND TERMS from lesson PDFs (type:'t') ───────────────────────────────
// on = reading (furigana), kun = category, en = English, ex = description


const TERMS_DATA = [
  // ── Laws & Regulations (第1回) ──────────────────────────────────────────
  {k:"電気事業法",         on:"でんきじぎょうほう",         kun:"Laws",       en:"Electricity Business Act",                  ex:"Governs electric utility businesses and their obligations"},
  {k:"電気工事士法",       on:"でんきこうじしほう",         kun:"Laws",       en:"Electricians Law",                          ex:"Defines qualifications and duties of electricians"},
  {k:"電気工事業法",       on:"でんきこうじぎょうほう",     kun:"Laws",       en:"Electrical Construction Business Law",      ex:"Regulates electrical construction businesses"},
  {k:"電気設備技術基準",   on:"でんきせつびぎじゅつきじゅん",kun:"Laws",      en:"Electrical Equipment Technical Standards",  ex:"Technical standards for electrical installations"},
  {k:"電気用品安全法",     on:"でんきようひんあんぜんほう", kun:"Laws",       en:"Electrical Appliance Safety Law",           ex:"Requires PSE marking on electrical appliances"},
  {k:"一般用電気工作物",   on:"いっぱんようでんきこうさくぶつ",kun:"Laws",    en:"General-use electrical works",              ex:"Low-voltage installations e.g. homes; requires 2nd-class electrician"},
  {k:"小出力発電設備",     on:"しょうしゅつりょくはつでんせつび",kun:"Laws",  en:"Small-output power generation equipment",   ex:"Solar/wind/etc. under threshold kW within general electrical works"},
  {k:"太陽電池発電設備",   on:"たいようでんちはつでんせつび",kun:"Laws",      en:"Photovoltaic power generation equipment",   ex:"Solar panel system classified as small-output generation"},
  {k:"風力発電設備",       on:"ふうりょくはつでんせつび",   kun:"Laws",       en:"Wind power generation equipment",           ex:"Wind turbine system classified as small-output generation"},
  {k:"水力発電設備",       on:"すいりょくはつでんせつび",   kun:"Laws",       en:"Hydroelectric power generation equipment",  ex:"Micro-hydro system classified as small-output generation"},
  {k:"内燃力発電設備",     on:"ないねんりょくはつでんせつび",kun:"Laws",      en:"Internal-combustion power generation",      ex:"Diesel/gas engine generator set"},
  {k:"燃料電池発電設備",   on:"ねんりょうでんちはつでんせつび",kun:"Laws",    en:"Fuel cell power generation equipment",      ex:"Hydrogen fuel cell system for stationary generation"},
  {k:"事業用電気工作物",   on:"じぎょうようでんきこうさくぶつ",kun:"Laws",   en:"Utility electrical works",                  ex:"Electrical works for electric utility companies; not covered by 2nd-class"},
  {k:"自家用電気工作物",   on:"じかようでんきこうさくぶつ", kun:"Laws",       en:"Non-utility (self-use) electrical works",   ex:"Facilities >600V for own use (factories, hospitals); need Class-1"},
  {k:"特定電気用品",       on:"とくていでんきようひん",     kun:"Laws",       en:"Specified electrical appliances",           ex:"High-risk items requiring 第三者certification; marked with ⑫PSE"},
  // ── Wiring & Installation (第2回) ──────────────────────────────────────
  {k:"天井隠ぺい配線",     on:"てんじょういんぺいはいせん", kun:"Wiring",     en:"Ceiling concealed wiring",                  ex:"Wiring hidden above ceiling boards; common in residential wiring"},
  {k:"床隠ぺい配線",       on:"ゆかいんぺいはいせん",       kun:"Wiring",     en:"Floor concealed wiring",                    ex:"Wiring hidden beneath floor boards or in underfloor space"},
  {k:"地中埋設配線",       on:"ちちゅうまいせつはいせん",   kun:"Wiring",     en:"Buried underground wiring",                 ex:"Cables buried directly in the ground; requires protective conduit"},
  {k:"受電点",             on:"じゅでんてん",               kun:"Wiring",     en:"Service/receiving point",                   ex:"Point where power is received from the utility supply"},
  {k:"絶縁被覆",           on:"ぜつえんひふく",             kun:"Wiring",     en:"Insulation coating",                        ex:"Layer of insulating material covering the conductor"},
  {k:"心線",               on:"しんせん",                   kun:"Wiring",     en:"Core wire / conductor strand",              ex:"The inner current-carrying metal conductor inside a cable"},
  {k:"屋外配線",           on:"おくがいはいせん",           kun:"Wiring",     en:"Outdoor wiring",                            ex:"Wiring installed outside a building; requires weatherproof materials"},
  {k:"屋内電路",           on:"おくないでんろ",             kun:"Wiring",     en:"Indoor wiring circuit",                     ex:"Electrical circuit installed within a building"},
  // ── Device Symbols (第3回) ─────────────────────────────────────────────
  {k:"接地端子",           on:"せっちたんし",               kun:"Devices",    en:"Earthing terminal (outlet)",                ex:"Outlet terminal connected to earth ground for safety"},
  {k:"防雨形コンセント",   on:"ぼううがたこんせんと",       kun:"Devices",    en:"Rainproof outlet",                          ex:"Weather-resistant outlet for outdoor or damp-location use"},
  {k:"防雨形スイッチ",     on:"ぼううがたスイッチ",         kun:"Devices",    en:"Rainproof switch",                          ex:"Weather-resistant switch for outdoor or damp-location use"},
  {k:"常時点灯",           on:"じょうじてんとう",           kun:"Devices",    en:"Constant lighting (pilot lamp)",            ex:"Pilot lamp that stays ON regardless of switch position"},
  {k:"同時点灯",           on:"どうじてんとう",             kun:"Devices",    en:"Simultaneous lighting",                     ex:"Pilot lamp that lights simultaneously when load is ON"},
  {k:"異時点灯",           on:"いじてんとう",               kun:"Devices",    en:"Alternate lighting",                        ex:"Pilot lamp that lights when load is OFF (position indicator)"},
  {k:"自動点滅器",         on:"じどうてんめつき",           kun:"Devices",    en:"Automatic sensor switch",                   ex:"Photocell switch that turns lighting on/off at dusk/dawn"},
  {k:"表示灯",             on:"ひょうじとう",               kun:"Devices",    en:"Indicator lamp",                            ex:"Lamp indicating the status (on/off) of a circuit or device"},
  {k:"確認表示灯内蔵スイッチ",on:"かくにんひょうじとうないぞうスイッチ",kun:"Devices",en:"Switch with built-in confirmation lamp",ex:"Switch with pilot lamp that lights when the load is ON"},
  {k:"位置表示灯内蔵スイッチ",on:"いちひょうじとうないぞうスイッチ",kun:"Devices",en:"Switch with built-in position lamp",  ex:"Switch with pilot lamp lit when switch is OFF (shows location in dark)"},
  {k:"調光器",             on:"ちょうこうき",               kun:"Devices",    en:"Dimmer switch",                             ex:"Adjusts light output by varying voltage to the lamp"},
  {k:"電力量計",           on:"でんりょくりょうけい",       kun:"Devices",    en:"Watt-hour meter",                           ex:"Integrating meter measuring consumed electric energy (kWh)"},
  {k:"電熱器",             on:"でんねつき",                 kun:"Devices",    en:"Electric heater",                           ex:"Appliance converting electrical energy to heat (resistive heating)"},
  {k:"電磁開閉器",         on:"でんじかいへいき",           kun:"Devices",    en:"Electromagnetic switch (motor starter)",    ex:"Contactor + thermal overload relay for motor start/stop control"},
  {k:"電磁開閉器用押しボタンスイッチ",on:"でんじかいへいきようおしボタンスイッチ",kun:"Devices",en:"Push-button for electromagnetic switch",ex:"Momentary push-button for start/stop of electromagnetic switch"},
  {k:"箱開閉器",           on:"はこかいへいき",             kun:"Devices",    en:"Safety enclosed switch",                    ex:"Enclosed (box-type) knife switch for isolation of a circuit"},
  {k:"単極スイッチ",       on:"たんきょくスイッチ",         kun:"Devices",    en:"Single-pole switch",                        ex:"Basic on/off switch interrupting one conductor"},
  // ── Metal Conduit Work (第4回) ─────────────────────────────────────────
  {k:"金属管工事",         on:"きんぞくかんこうじ",         kun:"Conduit",    en:"Metal conduit wiring work",                 ex:"Wiring method using steel conduit (EMT/RMC); suitable for all locations"},
  {k:"金属ダクト工事",     on:"きんぞくダクトこうじ",       kun:"Conduit",    en:"Metal duct wiring work",                    ex:"Wiring in sheet-metal trunking/duct; for large-scale installations"},
  {k:"がいし引き工事",     on:"がいしびきこうじ",           kun:"Conduit",    en:"Insulator wiring work",                     ex:"Open wiring on insulators; oldest method, rarely used today"},
  {k:"二種金属製可とう電線管工事",on:"にしゅきんぞくせいかとうでんせんかんこうじ",kun:"Conduit",en:"Class-2 flexible metal conduit work",ex:"Flexible metal conduit (Sealtite/Liquatight); for motor connections"},
  {k:"絶縁ブッシング",     on:"ぜつえんブッシング",         kun:"Conduit",    en:"Insulating bushing",                        ex:"Plastic bushing protecting wire insulation at conduit ends"},
  {k:"高速切断機",         on:"こうそくせつだんき",         kun:"Conduit",    en:"High-speed cutting machine (chop saw)",     ex:"Abrasive or carbide disc saw for cutting steel conduit quickly"},
  {k:"金切りのこ",         on:"かなぎりのこ",               kun:"Conduit",    en:"Hacksaw / metal handsaw",                   ex:"Hand-operated saw for cutting metal conduit and pipe"},
  {k:"ねじ切り器",         on:"ねじきりき",                 kun:"Conduit",    en:"Pipe threading machine",                    ex:"Power or ratchet tool that cuts NPT/PF threads on conduit"},
  {k:"振動ドリル",         on:"しんどうドリル",             kun:"Conduit",    en:"Hammer drill / vibrating drill",            ex:"Drill with hammering action for boring into concrete or masonry"},
  {k:"油圧式パイプベンダ", on:"ゆあつしきパイプベンダ",     kun:"Conduit",    en:"Hydraulic pipe bender",                     ex:"Hydraulic tool for bending large-diameter rigid conduit accurately"},
  // ── Synthetic Resin Conduit (第5回) ────────────────────────────────────
  {k:"合成樹脂管工事",     on:"ごうせいじゅしかんこうじ",   kun:"Conduit",    en:"Synthetic resin conduit work",              ex:"Wiring in PVC or PE conduit; lightweight, corrosion-resistant"},
  {k:"合成樹脂製可とう電線管",on:"ごうせいじゅしせいかとうでんせんかん",kun:"Conduit",en:"Synthetic resin flexible conduit",    ex:"Corrugated flexible plastic conduit (PF/CD pipe)"},
  // ── Cable Work (第6回) ──────────────────────────────────────────────────
  {k:"ケーブル工事",       on:"ケーブルこうじ",             kun:"Cabling",    en:"Cable wiring work",                         ex:"Most common wiring method using VVF cable in residential buildings"},
  {k:"差込み接続器",       on:"さしこみせつぞくき",         kun:"Cabling",    en:"Push-in connector / Wago connector",        ex:"Spring-clamp connector for quick wire splicing without tools"},
  {k:"電気はんだごて",     on:"でんきはんだごて",           kun:"Cabling",    en:"Electric soldering iron",                   ex:"Electrically heated tool for soldering wire connections"},
  {k:"手動油圧式圧着器",   on:"しゅどうゆあつしきあっちゃくき",kun:"Cabling", en:"Manual hydraulic crimper",                  ex:"Hydraulic hand tool for crimping large compression terminals"},
  {k:"手動油圧式圧縮機",   on:"しゅどうゆあつしきあっしゅくき",kun:"Cabling",en:"Manual hydraulic compressor/press",         ex:"Hydraulic press for compressing large cable lug terminals"},
  {k:"油圧式ケーブルカッタ",on:"ゆあつしきケーブルカッタ",  kun:"Cabling",    en:"Hydraulic cable cutter",                    ex:"Hydraulic tool for cleanly cutting large-diameter cables"},
  // ── Other Work (第7回) ──────────────────────────────────────────────────
  {k:"線ぴ工事",           on:"せんぴこうじ",               kun:"Wiring",     en:"Raceway wiring work",                       ex:"Wiring in metal surface-mounted raceways (一種・二種金属線ぴ)"},
  {k:"二種金属製可とう電線管",on:"にしゅきんぞくせいかとうでんせんかん",kun:"Conduit",en:"Class-2 flexible metal conduit",      ex:"Sealtight flexible conduit for vibrating equipment like motors"},
  // ── Indoor Wiring Design (第10回) ──────────────────────────────────────
  {k:"過電流遮断器",       on:"かでんりゅうしゃだんき",     kun:"Design",     en:"Overcurrent circuit breaker",               ex:"Device interrupting circuit on overcurrent — MCCB or fuse"},
  {k:"分岐回路",           on:"ぶんきかいろ",               kun:"Design",     en:"Branch circuit",                            ex:"Circuit branching from distribution board to outlets/loads"},
  {k:"単線",               on:"たんせん",                   kun:"Design",     en:"Solid (single-strand) wire",                ex:"Single solid conductor; e.g. 1.6mm or 2.0mm VVF wire"},
  // ── Grounding & Insulation (第11回) ────────────────────────────────────
  {k:"絶縁抵抗",           on:"ぜつえんていこう",           kun:"Grounding",  en:"Insulation resistance",                     ex:"Resistance between conductor and earth; must be ≥0.1MΩ (100V) or ≥0.2MΩ (200V)"},
  {k:"二重絶縁構造",       on:"にじゅうぜつえんこうぞう",   kun:"Grounding",  en:"Double insulation structure",               ex:"Two independent insulation layers; no earth connection required"},
  // ── Measuring Instruments (第12回) ─────────────────────────────────────
  {k:"電圧計",             on:"でんあつけい",               kun:"Instruments", en:"Voltmeter",                                ex:"Measures voltage; connected in parallel with the circuit"},
  {k:"電流計",             on:"でんりゅうけい",             kun:"Instruments", en:"Ammeter",                                  ex:"Measures current; connected in series with the circuit"},
  {k:"可動コイル形",       on:"かどうコイルがた",           kun:"Instruments", en:"Moving-coil type instrument",              ex:"DC-only meter using a coil rotating in a permanent magnetic field"},
  {k:"可動鉄片形",         on:"かどうてっぺんがた",         kun:"Instruments", en:"Moving-iron type instrument",              ex:"AC/DC meter using magnetic repulsion of iron vanes"},
  {k:"整流形計器",         on:"せいりゅうがたけいき",       kun:"Instruments", en:"Rectifier-type instrument",                ex:"AC meter that rectifies to DC internally; reads RMS value"},
  // ── Three-phase Motors (第13回) ────────────────────────────────────────
  {k:"三相誘導電動機",     on:"さんそうゆうどうでんどうき", kun:"Motors",     en:"Three-phase induction motor",               ex:"Most common industrial motor; stator creates rotating magnetic field"},
  {k:"かご形誘導電動機",   on:"かごがたゆうどうでんどうき", kun:"Motors",     en:"Squirrel-cage induction motor",             ex:"Rotor consists of conductive bars short-circuited at both ends"},
  {k:"スターデルタ始動法", on:"スターデルタしどうほう",     kun:"Motors",     en:"Star-delta starting method",                ex:"Reduces starting current by starting in Y then switching to Δ"},
  {k:"力率",               on:"りきりつ",                   kun:"Motors",     en:"Power factor",                              ex:"cos φ — ratio of active to apparent power; improved by capacitors"},
  // ── Circuit Diagrams (第14回) ───────────────────────────────────────────
  {k:"単線図",             on:"たんせんず",                 kun:"Diagrams",   en:"Single-line diagram",                       ex:"Simplified wiring diagram using one line per circuit"},
  {k:"単相２線式",         on:"たんそう２せんしき",         kun:"Diagrams",   en:"Single-phase 2-wire system",                ex:"100V system with one live + one neutral; simplest residential circuit"},
  {k:"単相３線式",         on:"たんそう３せんしき",         kun:"Diagrams",   en:"Single-phase 3-wire system",                ex:"100/200V system with two live + one neutral; standard in Japan homes"},
  // ── Electrical Theory (第15・16回) ─────────────────────────────────────
  {k:"抵抗率",             on:"ていこうりつ",               kun:"Theory",     en:"Resistivity",                               ex:"Material property ρ (Ω·m); copper ≈ 1.72×10⁻⁸ Ω·m"},
  {k:"電力量",             on:"でんりょくりょう",           kun:"Theory",     en:"Electric energy (amount of electricity)",   ex:"W = P × t [Wh or kWh]; measured by watt-hour meter"},
  {k:"熱量",               on:"ねつりょう",                 kun:"Theory",     en:"Heat / thermal energy (joules)",            ex:"Q = P × t = I²Rt [J]; also expressed in calories (1 cal ≈ 4.186 J)"},
  {k:"三相交流",           on:"さんそうこうりゅう",         kun:"Theory",     en:"Three-phase alternating current",           ex:"Three sinusoidal voltages 120° apart; used in industrial power systems"},
  {k:"三相３線式",         on:"さんそう３せんしき",         kun:"Theory",     en:"Three-phase 3-wire system",                 ex:"200V system used for motors and large appliances in Japan"},
  {k:"誘導リアクタンス",   on:"ゆうどうリアクタンス",       kun:"Theory",     en:"Inductive reactance",                       ex:"XL = 2πfL [Ω]; increases with frequency; voltage leads current by 90°"},
  {k:"容量リアクタンス",   on:"ようりょうリアクタンス",     kun:"Theory",     en:"Capacitive reactance",                      ex:"XC = 1/(2πfC) [Ω]; decreases with frequency; current leads voltage by 90°"},
];



// ──────────────────────────────────────────────────────
// NEW FEATURES (v10) - Ad System & Result Popup
// ──────────────────────────────────────────────────────

function checkAdLimit(type) {
  const today = new Date().toDateString();
  const key = 'nw3_ad_' + type + '_' + today;
  const count = +(localStorage.getItem(key) || 0);
  const limits = { quiz: 2, review: 1, longterm: 1 };
  const limit = limits[type] || 1;
  localStorage.setItem(key, count + 1);
  if (count >= limit) {
    showAdPlaceholder(type);
    return false;
  }
  return true;
}

function showAdPlaceholder(type) {
  const msg = `<div style="background:var(--s2);border:2px dashed var(--acc);border-radius:12px;padding:20px;text-align:center;margin:16px 0">
    <div style="font-size:24px">📺</div>
    <div style="font-weight:700;color:var(--acc)">広告エリア (AdMob)</div>
    <div style="font-size:12px;color:var(--txM);margin-top:4px">動画広告を視聴すると続けられます</div>
    <button onclick="this.parentElement.remove()" style="margin-top:12px;padding:8px 20px;background:var(--acc);color:#fff;border:none;border-radius:8px;cursor:pointer;font-family:inherit">▶ 広告を視聴（仮）</button>
  </div>`;
}

function updateHomeButton() {
  const homeBtn = document.getElementById('home-btn');
  if (!homeBtn) return;
  if (curMod) {
    homeBtn.style.display = 'flex';
  } else {
    homeBtn.style.display = 'none';
  }
}

// ──────────────────────────────────────────────────────
// BUSINESS MANNER OX QUIZ
// ──────────────────────────────────────────────────────

function mkBizOX(c) {
  const target = c;
  let pos = 0;
  let sc = { c: 0, w: 0 };
  let order = shuf(BIZ_OX.map((_, i) => i)).slice(0, 10);
  const mk = 'm-biz';
  
  function render() {
    const pct = pos / order.length * 100;
    
    if (pos >= order.length) {
      const t = sc.c + sc.w;
      const p = t ? Math.round(sc.c / t * 100) : 0;
      target.innerHTML = `<div class="scr sh"><div class="scr-big">${p}%</div><div class="scr-msg">${[T('score0'),T('score1'),T('score2'),T('score3')][p<50?0:p<75?1:p<95?2:3]} (${sc.c}/${t})</div><div class="scr-tiles"><div class="scr-t g"><div class="tl">${T('scoreCo')}</div><div class="tv">${sc.c}</div></div><div class="scr-t r"><div class="tl">${T('scoreWr')}</div><div class="tv">${sc.w}</div></div></div><button class="rbtn" onclick="openM('biz')">${T('again')}</button><button class="rbtn" style="background:var(--s2);color:var(--tx)" onclick="goHome()">${T('home')}</button></div>`;
      setTimeout(()=>maybeShowReviewPopup(),500);
      return;
    }
    
    const q = BIZ_OX[order[pos]];
    if(typeof trackPV==='function')trackPV('/quiz/biz/question/'+(pos+1),'BIZ Q'+(pos+1));
    let h = '<div class="mod-h"><div class="mod-t">'+T('bizTitle')+'</div></div>';
    h += `<div class="prg"><div class="prg-bar"><div class="prg-fill" style="width:${pct}%"></div></div><div class="prg-tx">${pos + 1}/${order.length}</div></div>`;
    h += `<div class="qb" style="padding:24px;min-height:120px;align-items:center"><div style="font-size:15px;color:var(--tx);line-height:1.7;text-align:center">${q.q}</div></div>`;
    h += `<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px">
      <button class="biz-btn" data-ans="true" style="padding:16px;border-radius:12px;border:2px solid var(--grn);background:rgba(107,191,138,0.1);color:var(--grn);font-size:20px;font-weight:700;cursor:pointer;font-family:inherit">○ 正しい</button>
      <button class="biz-btn" data-ans="false" style="padding:16px;border-radius:12px;border:2px solid var(--red);background:rgba(217,107,107,0.1);color:var(--red);font-size:20px;font-weight:700;cursor:pointer;font-family:inherit">× 間違い</button>
    </div>`;
    h += '<div id="biz-fb" style="margin-bottom:14px;padding:12px;border-radius:8px;display:none"></div>';
    h += '<button class="qnx" id="biz-nx" style="display:none" onclick="biz_next()">次へ</button>';
    
    target.innerHTML = h;
    
    document.querySelectorAll('.biz-btn').forEach(btn => {
      btn.onclick = function() {
        const ans = this.dataset.ans === 'true';
        const correct = ans === q.a;
        const fb = document.getElementById('biz-fb');
        const nxBtn = document.getElementById('biz-nx');
        
        document.querySelectorAll('.biz-btn').forEach(b => b.disabled = true);
        
        if (correct) {
          sc.c++;
          addS();
          SRS.correct(mk, q);
          fb.style.display = 'block';
          fb.className = 'qfb ok';
          fb.innerHTML = '✓ 正解！';
          this.style.borderColor = 'var(--grn)';
        } else {
          sc.w++;
          rstS();
          SRS.wrong(mk, q);
          fb.style.display = 'block';
          fb.className = 'qfb no';
          fb.innerHTML = `正解は ${q.a ? '○ 正しい' : '× 間違い'}です`;
          this.style.borderColor = 'var(--red)';
          this.style.background = 'rgba(217,107,107,0.2)';
        }
        
        nxBtn.style.display = 'inline-block';
        nxBtn.onclick = () => { pos++; render(); };
      };
    });
  }
  
  window.biz_next = () => { pos++; render(); };
  render();
} // END mkBizOX

// ──────────────────────────────────────────────────────
// REVIEW QUIZ (Weak Items Only)
// ──────────────────────────────────────────────────────


function getDistractors(item, allData, count=3) {
  const filtered = allData.filter(x => x !== item && x[0] !== item[0]);
  return shuf(filtered).slice(0, count).map(x => x[1]);
}

function mkReview(c) {
  const target = c;
  let currentCat = null;
  let pos = 0;
  let sc = { c: 0, w: 0 };
  let order = [];
  let allData = [];
  let currentType = '';
  
  const _revCatNames = {
    hira:      {ja:'ひらがな',  en:'Hiragana',    bn:'হিরাগানা'},
    kata:      {ja:'カタカナ',  en:'Katakana',    bn:'কাতাকানা'},
    vocab_n5:  {ja:'語彙 N5',   en:'Vocab N5',    bn:'শব্দ N5'},
    vocab_n4:  {ja:'語彙 N4',   en:'Vocab N4',    bn:'শব্দ N4'},
    vocab_n3:  {ja:'語彙 N3',   en:'Vocab N3',    bn:'শব্দ N3'},
    kanji_n5:  {ja:'漢字 N5',   en:'Kanji N5',    bn:'কানজি N5'},
    kanji_n4:  {ja:'漢字 N4',   en:'Kanji N4',    bn:'কানজি N4'},
    kanji_n3:  {ja:'漢字 N3',   en:'Kanji N3',    bn:'কানজি N3'},
    verb:      {ja:'動詞',      en:'Verbs',       bn:'ক্রিয়া'},
    adj:       {ja:'形容詞',    en:'Adjectives',  bn:'বিশেষণ'},
    grammar:   {ja:'文法',      en:'Grammar',     bn:'ব্যাকরণ'},
    biz:       {ja:'ビジネスマナー', en:'Biz Manner', bn:'ব্যবসায়িক শিষ্টাচার'},
  };
  const categories = [
    { value: 'hira',     icon: 'あ' },
    { value: 'kata',     icon: 'ア' },
    { value: 'vocab_n5', icon: '📖' },
    { value: 'vocab_n4', icon: '📖' },
    { value: 'vocab_n3', icon: '📖' },
    { value: 'kanji_n5', icon: '漢' },
    { value: 'kanji_n4', icon: '漢' },
    { value: 'kanji_n3', icon: '漢' },
    { value: 'verb',     icon: '🔄' },
    { value: 'adj',      icon: '📝' },
    { value: 'grammar',  icon: '📗' },
    { value: 'biz',      icon: '💼' },
  ];
  
  function showCategoryScreen() {
    let h = '<div class="mod-h"><div class="mod-t">'+T('revTitle')+'</div><div class="mod-d">'+T('revSelectCat')+'</div></div>';
    h += '<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:12px;padding:16px 0">';
    
    categories.forEach(cat => {
      const _rcn = (_revCatNames[cat.value]||{})[_lang]||(_revCatNames[cat.value]||{}).ja||cat.value;
      h += `<button class="cat-btn" data-cat="${cat.value}" style="padding:20px;background:var(--s1);border:2px solid var(--brd);border-radius:12px;cursor:pointer;font-family:inherit;font-size:14px;font-weight:700;text-align:center;transition:all 0.2s">${cat.icon}<br/>${_rcn}</button>`;
    });
    
    h += '</div>';
    h += '<button onclick="goHome()" style="width:100%;padding:12px;background:var(--s2);border:1px solid var(--brd);border-radius:8px;cursor:pointer;font-family:inherit;margin-top:16px">'+T('cancel')+'</button>';
    
    target.innerHTML = h;
    
    document.querySelectorAll('.cat-btn').forEach(btn => {
      btn.onclick = function() {
        const cat = this.dataset.cat;
        selectCategory(cat);
      };
    });
  }
  
  function selectCategory(cat) {
    currentCat = cat;
    pos = 0;
    sc = { c: 0, w: 0 };
    order = [];
    allData = [];
    
    // Get data and module key for each category
    let modKey = '';
    if (cat === 'hira') {
      modKey = 'kana';
      allData = [...HB, ...HD];
      currentType = 'kana';
    } else if (cat === 'kata') {
      modKey = 'kana';
      allData = [...KB, ...KD];
      currentType = 'kana';
    } else if (cat === 'vocab_n5') {
      modKey = 'vocab';
      allData = JLPT_V5;
      currentType = 'vocab';
    } else if (cat === 'vocab_n4') {
      modKey = 'vocab';
      allData = JLPT_V4;
      currentType = 'vocab';
    } else if (cat === 'vocab_n3') {
      modKey = 'vocab';
      allData = JLPT_V3;
      currentType = 'vocab';
    } else if (cat === 'kanji_n5') {
      modKey = 'kanji';
      allData = JLPT_K5;
      currentType = 'kanji';
    } else if (cat === 'kanji_n4') {
      modKey = 'kanji';
      allData = JLPT_K4;
      currentType = 'kanji';
    } else if (cat === 'kanji_n3') {
      modKey = 'kanji';
      allData = JLPT_K3;
      currentType = 'kanji';
    } else if (cat === 'verb') {
      modKey = 'verb';
      allData = [...VERBS, ...VERBS_N4];
      currentType = 'vocab';
    } else if (cat === 'adj') {
      modKey = 'adj';
      allData = [...I_ADJ, ...NA_ADJ];
      currentType = 'vocab';
    } else if (cat === 'grammar') {
      modKey = 'grammar';
      allData = GRAM;
      currentType = 'grammar';
    } else if (cat === 'biz') {
      modKey = 'biz';
      allData = BIZ_OX;
      currentType = 'biz';
    }
    
    const weakItems = SRS.getWeakItems(modKey, allData);
    const useWeak = weakItems.length > 0;
    const pool = useWeak ? weakItems : allData;
    order = shuf(pool).slice(0, 10);
    
    if (!order.length) {
      target.innerHTML = `<div style="padding:40px;text-align:center"><div style="font-size:16px;color:var(--txM);margin-bottom:16px">${T('nodata')}</div><button class="rbtn" onclick="mkReview(document.getElementById('m-review'))" style="background:var(--acc);color:#fff">${T('revOtherCat')}</button><button class="rbtn" onclick="goHome()" style="background:var(--s2);color:var(--tx)">${T('home')}</button></div>`;
      return;
    }
    
    render();
  }
  
  function render() {
    const pct = pos / order.length * 100;
    
    if (pos >= order.length) {
      const t = sc.c + sc.w;
      const p = t ? Math.round(sc.c / t * 100) : 0;
      if(typeof trackPV==='function')trackPV('/quiz/review/'+currentCat+'/score','Review Score');
      target.innerHTML = `<div class="scr sh"><div class="scr-big">${p}%</div><div class="scr-msg">${T('wellDone')} (${sc.c}/${t})</div><div class="scr-tiles"><div class="scr-t g"><div class="tl">正解</div><div class="tv">${sc.c}</div></div><div class="scr-t r"><div class="tl">不正解</div><div class="tv">${sc.w}</div></div></div><button class="rbtn" onclick="mkReview(document.getElementById('m-review'))" style="background:var(--acc);color:#fff">もう一度</button><button class="rbtn" style="background:var(--s2);color:var(--tx)" onclick="goHome()">ホーム</button></div>`;
      setTimeout(()=>maybeShowReviewPopup(),500);
      return;
    }
    
    const item = order[pos];
    if(typeof trackPV==='function')trackPV('/quiz/review/'+currentCat+'/'+(pos+1),'Review Q'+(pos+1));
    let h = '<div class="mod-h"><div class="mod-t">'+T('revTitle')+'</div></div>';
    h += `<div class="prg"><div class="prg-bar"><div class="prg-fill" style="width:${pct}%"></div></div><div class="prg-tx">${pos + 1}/${order.length}</div></div>`;
    
    if (currentType === 'kana') {
      const ch = item[0];
      const rom = item[1];
      h += `<div class="qb"><div class="qB" style="font-size:88px">${ch}</div><div class="qP">ローマ字は？</div></div>`;
      h += `<input class="kinp" id="rev-inp" type="text" placeholder="romaji..." />`;
      h += '<div id="rev-fb" style="margin-bottom:14px"></div>';
      h += '<button class="qnx" id="rev-nx" style="display:none">'+T('nextBtn')+'</button>';
      
      target.innerHTML = h;
      const inp = document.getElementById('rev-inp');
      inp.focus();
      
      inp.onkeydown = (e) => {
        if (e.key !== 'Enter') return;
        const v = inp.value.trim().toLowerCase();
        const alts = { shi:['si'], chi:['ti'], tsu:['tu'], fu:['hu'], n:['nn'], wo:['o'], ji:['zi'], zu:['du'] };
        let ok = v === rom;
        if (!ok && alts[rom]) ok = alts[rom].includes(v);
        const fb = document.getElementById('rev-fb');
        if (ok) {
          sc.c++; addS();
          SRS.correct('kana', item);
          fb.className = 'qfb ok';
          fb.innerHTML = '✓ ' + ch + ' = ' + rom;
        } else {
          sc.w++; rstS();
          SRS.wrong('kana', item);
          fb.className = 'qfb no';
          fb.innerHTML = '× → <b>' + rom + '</b>';
        }
        inp.disabled = true;
        document.getElementById('rev-nx').style.display = 'inline-block';
        document.getElementById('rev-nx').onclick = () => { pos++; render(); };
      };
    } else if (currentType === 'biz') {
      const q = item;
      h += `<div class="qb" style="padding:24px;min-height:120px;align-items:center"><div style="font-size:15px;color:var(--tx);line-height:1.7;text-align:center">${q.q}</div></div>`;
      h += `<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px">
        <button class="biz-btn" data-ans="true" style="padding:16px;border-radius:12px;border:2px solid var(--grn);background:rgba(107,191,138,0.1);color:var(--grn);font-size:20px;font-weight:700;cursor:pointer;font-family:inherit">○ 正しい</button>
        <button class="biz-btn" data-ans="false" style="padding:16px;border-radius:12px;border:2px solid var(--red);background:rgba(217,107,107,0.1);color:var(--red);font-size:20px;font-weight:700;cursor:pointer;font-family:inherit">× 間違い</button>
      </div>`;
      h += '<div id="biz-fb" style="margin-bottom:14px;padding:12px;border-radius:8px;display:none"></div>';
      h += '<button class="qnx" id="biz-nx" style="display:none" onclick="biz_next()">'+T('nextBtn')+'</button>';
      
      target.innerHTML = h;
      
      document.querySelectorAll('.biz-btn').forEach(btn => {
        btn.onclick = function() {
          const ans = this.dataset.ans === 'true';
          const correct = ans === q.a;
          const fb = document.getElementById('biz-fb');
          const nxBtn = document.getElementById('biz-nx');
          
          document.querySelectorAll('.biz-btn').forEach(b => b.disabled = true);
          
          if (correct) {
            sc.c++;
            addS();
            SRS.correct('biz', q);
            fb.style.display = 'block';
            fb.className = 'qfb ok';
            fb.innerHTML = T('correct');
            this.style.borderColor = 'var(--grn)';
          } else {
            sc.w++;
            rstS();
            SRS.wrong('biz', q);
            fb.style.display = 'block';
            fb.className = 'qfb no';
            fb.innerHTML = `${T('incorrect')} → ${q.a ? '○' : '×'}`;
            this.style.borderColor = 'var(--red)';
            this.style.background = 'rgba(217,107,107,0.2)';
          }
          
          nxBtn.style.display = 'inline-block';
          nxBtn.onclick = () => { pos++; render(); };
        };
      });
    } else {
      // vocab/kanji/grammar
      const jp = item[0];
      const meaning = item[1];
      h += `<div class="qb"><div class="qB" style="font-size:64px">${jp}</div><div class="qP">${T('meaningQ')}</div></div>`;
      
      const opts = [meaning, ...getDistractors(item, allData, 3)];
      const shuffledOpts = shuf(opts);
      const correctIdx = shuffledOpts.indexOf(meaning);
      
      h += '<div style="display:grid;gap:10px;margin:20px 0">';
      shuffledOpts.forEach((opt, idx) => {
        h += `<button class="qopt" data-correct="${idx === correctIdx}" style="padding:16px;background:var(--s1);border:2px solid var(--brd);border-radius:8px;cursor:pointer;font-family:inherit;text-align:left;transition:all 0.2s">${opt}</button>`;
      });
      h += '</div>';
      
      h += '<div id="rev-fb" style="margin-bottom:14px"></div>';
      h += '<button class="qnx" id="rev-nx" style="display:none">'+T('nextBtn')+'</button>';
      
      target.innerHTML = h;
      
      document.querySelectorAll('.qopt').forEach(btn => {
        btn.onclick = function() {
          const correct = this.dataset.correct === 'true';
          const fb = document.getElementById('rev-fb');
          
          document.querySelectorAll('.qopt').forEach(b => b.disabled = true);
          
          if (correct) {
            sc.c++;
            addS();
            SRS.correct((currentCat.includes('kanji') ? 'kanji' : currentCat.includes('grammar') ? 'grammar' : 'vocab'), item);
            fb.className = 'qfb ok';
            fb.innerHTML = '✓ 正解！';
            this.style.borderColor = 'var(--grn)';
          } else {
            sc.w++;
            rstS();
            SRS.wrong((currentCat.includes('kanji') ? 'kanji' : currentCat.includes('grammar') ? 'grammar' : 'vocab'), item);
            fb.className = 'qfb no';
            fb.innerHTML = `× 正解は「${meaning}」`;
            this.style.borderColor = 'var(--red)';
          }
          
          fb.style.display = 'block';
          document.getElementById('rev-nx').style.display = 'inline-block';
          document.getElementById('rev-nx').onclick = () => { pos++; render(); };
        };
      });
    }
  }
  
  showCategoryScreen();
}

// ──────────────────────────────────────────────────────
// LONG-TERM MEMORY TEST
// ──────────────────────────────────────────────────────

function mkLongTerm(c) {
  const target = c;
  const catDefs = [
    {key:'kana', data:[...HB,...HD,...KB,...KD], type:'kana', label:'かな'},
    {key:'vocab', data:[...JLPT_V5,...JLPT_V4,...JLPT_V3], type:'vocab', label:'語彙'},
    {key:'kanji', data:[...JLPT_K5,...JLPT_K4,...JLPT_K3], type:'kanji', label:'漢字'},
    {key:'verb', data:[...VERBS,...VERBS_N4], type:'vocab', label:'動詞'},
    {key:'adj', data:[...I_ADJ,...NA_ADJ], type:'vocab', label:'形容詞'},
    {key:'grammar', data:GRAM, type:'gram', label:'文法'},
    {key:'biz', data:BIZ_OX, type:'biz', label:'ビジネス'},
  ];
  const allWrong=[];
  catDefs.forEach(cat=>{
    const weak=SRS.getWeakItems(cat.key,cat.data);
    weak.forEach(item=>allWrong.push({item,type:cat.type,key:cat.key,label:cat.label,allData:cat.data}));
  });
  const totalWeak=allWrong.length;
  const order=shuf(allWrong).slice(0,10);
  
  function showIntro(){
    target.innerHTML=`
      <div style="min-height:65vh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:20px;text-align:center">
        <div style="font-size:64px;margin-bottom:16px">🧠</div>
        <div style="font-family:'Zen Maru Gothic',sans-serif;font-size:24px;font-weight:900;color:var(--tx);margin-bottom:8px">${T('ltTitle')}</div>
        <div style="font-size:13px;color:var(--txM);margin-bottom:24px;line-height:1.8">${T('ltDesc')}<br>${T('ltDesc2')}</div>
        <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:10px;width:100%;max-width:280px;margin-bottom:24px">
          <div style="background:var(--s2);border-radius:12px;padding:14px;border:1px solid var(--brd)">
            <div style="font-size:28px;font-weight:900;color:var(--acc)">${totalWeak}</div>
            <div style="font-size:11px;color:var(--txM)">${T('ltWeakCount')}</div>
          </div>
          <div style="background:var(--s2);border-radius:12px;padding:14px;border:1px solid var(--brd)">
            <div style="font-size:28px;font-weight:900;color:var(--accB)">${order.length}</div>
            <div style="font-size:11px;color:var(--txM)">${T('ltQuestions')}</div>
          </div>
        </div>
        ${totalWeak===0?`
          <div style="background:var(--s2);border-radius:14px;padding:20px;max-width:280px;margin-bottom:20px">
            <div style="font-size:32px;margin-bottom:8px">🎉</div>
            <div style="font-size:14px;font-weight:700;color:var(--accG);margin-bottom:6px">${T('ltPerfect')}</div>
            <div style="font-size:12px;color:var(--txM)">${T('ltNoWeak')}</div>
          </div>
          <button class="rbtn" onclick="goHome()" style="background:var(--acc);color:#fff">${T('ltHomeBack')}</button>
        `:`
          <div style="background:var(--g2);border-radius:14px;padding:14px;max-width:280px;width:100%;margin-bottom:20px;color:#fff">
            <div style="font-size:11px;opacity:.8;margin-bottom:8px">${T('ltCats')}</div>
            <div style="display:flex;flex-wrap:wrap;gap:6px">
              ${catDefs.map(cat=>{const w=SRS.getWeakItems(cat.key,cat.data).length;return w>0?`<span style="background:rgba(255,255,255,.15);border-radius:20px;padding:3px 10px;font-size:10px">${cat.label} ${w}</span>`:''}).join('')}
            </div>
          </div>
          <button onclick="ltStart()" style="background:var(--g1);color:#fff;border:none;border-radius:14px;padding:16px 40px;font-size:16px;font-weight:900;cursor:pointer;font-family:inherit;box-shadow:0 4px 20px rgba(228,87,46,0.3)">${T('ltStart')}</button>
          <button onclick="goHome()" style="margin-top:12px;background:transparent;border:none;color:var(--txM);font-size:13px;cursor:pointer;font-family:inherit">${T('cancel')}</button>
        `}
      </div>`;
    window.ltStart=()=>runTest();
  }
  
  function runTest(){
    let pos=0,sc={c:0,w:0};
    function render(){
      if(pos>=order.length){
        const t=sc.c+sc.w,p=t?Math.round(sc.c/t*100):0;
        if(typeof trackPV==='function')trackPV('/quiz/longterm/score','LongTerm Score');
        target.innerHTML=`<div class="scr sh">
          <div class="scr-big">${p}%</div>
          <div class="scr-msg">${[T('score0'),T('score1'),T('score2'),T('score3')][p<50?0:p<75?1:p<95?2:3]} (${sc.c}/${t})</div>
          <div class="scr-tiles">
            <div class="scr-t g"><div class="tl">${T('scoreCo')}</div><div class="tv">${sc.c}</div></div>
            <div class="scr-t r"><div class="tl">${T('scoreWr')}</div><div class="tv">${sc.w}</div></div>
          </div>
          <button class="rbtn" onclick="openM('longterm')" style="background:var(--acc);color:#fff">${T('again')}</button>
          <button class="rbtn" style="background:var(--s2);color:var(--tx)" onclick="goHome()">${T('home')}</button>
        </div>`;
        setTimeout(()=>maybeShowReviewPopup(),500);
        return;
      }
      const cur=order[pos];
      const item=cur.item;
      const pct=pos/order.length*100;
      if(typeof trackPV==='function')trackPV('/quiz/longterm/'+(pos+1),'LongTerm Q'+(pos+1));
      let h=`<div class="mod-h"><div class="mod-t">${T('ltTitle')}</div><div class="mod-d">${cur.label}</div></div>`;
      h+=`<div class="prg"><div class="prg-bar"><div class="prg-fill" style="width:${pct}%"></div></div><div class="prg-tx">${pos+1}/${order.length}</div></div>`;
      
      if(cur.type==='kana'){
        const ch=item[0],rom=item[1];
        h+=`<div class="qb"><div class="qB" style="font-size:88px">${ch}</div><div class="qP">${T('romajiQ')}</div></div>`;
        h+=`<input class="kinp" id="lt-inp" type="text" placeholder="romaji..."/>`;
        h+=`<div id="lt-fb" style="margin-bottom:14px"></div>`;
        h+=`<button class="qnx" id="lt-nx" style="display:none">${T('nextBtn')}</button>`;
        target.innerHTML=h;
        const inp=document.getElementById('lt-inp');inp.focus();
        inp.onkeydown=(e)=>{
          if(e.key!=='Enter')return;
          const v=inp.value.trim().toLowerCase();
          const alts={shi:['si'],chi:['ti'],tsu:['tu'],fu:['hu'],n:['nn'],wo:['o'],ji:['zi'],zu:['du']};
          let ok=v===rom;
          if(!ok&&alts[rom])ok=alts[rom].includes(v);
          const fb=document.getElementById('lt-fb');
          if(ok){sc.c++;addS();SRS.correct(cur.key,item);fb.className='qfb ok';fb.innerHTML='✓ '+ch+' = '+rom;}
          else{sc.w++;rstS();SRS.wrong(cur.key,item);fb.className='qfb no';fb.innerHTML='× → <b>'+rom+'</b>';}
          inp.disabled=true;
          const nx=document.getElementById('lt-nx');nx.style.display='inline-block';nx.onclick=()=>{pos++;render();};
        };
      } else if(cur.type==='biz'){
        const q=item;
        h+=`<div class="qb" style="padding:24px;min-height:120px;align-items:center"><div style="font-size:15px;color:var(--tx);line-height:1.7;text-align:center">${q.q}</div></div>`;
        h+=`<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px">
          <button class="biz-btn" data-ans="true" style="padding:16px;border-radius:12px;border:2px solid var(--grn);background:rgba(107,163,104,.1);font-size:22px;cursor:pointer;font-weight:700">○</button>
          <button class="biz-btn" data-ans="false" style="padding:16px;border-radius:12px;border:2px solid var(--red);background:rgba(217,107,107,.1);font-size:22px;cursor:pointer;font-weight:700">×</button>
        </div>`;
        h+=`<div id="lt-fb" style="margin-bottom:14px"></div><button class="qnx" id="lt-nx" style="display:none">${T('nextBtn')}</button>`;
        target.innerHTML=h;
        document.querySelectorAll('.biz-btn').forEach(btn=>{
          btn.onclick=function(){
            if(this.dataset.answered)return;
            document.querySelectorAll('.biz-btn').forEach(b=>b.dataset.answered='1');
            const ans=this.dataset.ans==='true';
            const fb=document.getElementById('lt-fb');
            if(ans===q.a){sc.c++;addS();SRS.correct(cur.key,item);fb.className='qfb ok';fb.textContent='✓ 正解！ '+(q.a?'○ 正しい':'× 間違い');}
            else{sc.w++;rstS();SRS.wrong(cur.key,item);fb.className='qfb no';fb.textContent='× 不正解。正解: '+(q.a?'○ 正しい':'× 間違い');}
            const nx=document.getElementById('lt-nx');nx.style.display='inline-block';nx.onclick=()=>{pos++;render();};
          };
        });
      } else {
        const jp=item[0]||'',meaning=item[1]||'';
        const isGram=cur.type==='gram';
        const others=shuf(cur.allData.filter(x=>x!==item)).slice(0,3);
        const opts=shuf([item,...others]);
        const ci=opts.indexOf(item);
        h+=`<div class="qb"><div class="qT">${isGram?'文法：':'意味は？'}</div><div class="qB" style="font-size:${jp.length>4?'28px':'40px'}">${jp}</div></div>`;
        h+='<div class="qos">';
        opts.forEach((opt,i)=>{h+=`<button class="qo" data-idx="${i}" data-correct="${i===ci}"><span class="ol">${String.fromCharCode(65+i)}</span>${opt[1]||''}</button>`;});
        h+=`</div><div class="qfb" id="lt-fb"></div><button class="qnx" id="lt-nx" style="display:none">${T('nextBtn')}</button>`;
        target.innerHTML=h;
        document.querySelectorAll('.qo').forEach(btn=>{
          btn.onclick=function(){
            if(this.disabled)return;
            document.querySelectorAll('.qo').forEach(b=>b.disabled=true);
            const ok=this.dataset.correct==='true';
            const fb=document.getElementById('lt-fb');
            if(ok){sc.c++;addS();SRS.correct(cur.key,item);this.classList.add('ok');fb.className='qfb ok';fb.textContent='✓ '+meaning;}
            else{sc.w++;rstS();SRS.wrong(cur.key,item);this.classList.add('no');document.querySelectorAll('.qo')[ci].classList.add('ok');fb.className='qfb no';fb.textContent='× → '+meaning;}
            const nx=document.getElementById('lt-nx');nx.style.display='inline-block';nx.onclick=()=>{pos++;render();};
          };
        });
        return;
      }
    }
    render();
  }
  
  showIntro();
}

// ──────────────────────────────────────────────────────
// DASHBOARD
// ──────────────────────────────────────────────────────

function mkDashboard(c) {
  const target = c;
  
  function getCatStats(modKey, allItems) {
    let correct = 0, wrong = 0, weakCount = 0;
    allItems.forEach(item => {
      const d = SRS.get(modKey, item);
      correct += d.c;
      wrong += d.w;
      if (d.w > 0 && d.w >= d.c) weakCount++;
    });
    const total = correct + wrong;
    const rate = total > 0 ? Math.round(correct / total * 100) : 0;
    const mastered = allItems.filter(item => { const d = SRS.get(modKey, item); return d.c >= 3 && d.c > d.w; }).length;
    return { correct, wrong, total, rate, weakCount, mastered, itemCount: allItems.length };
  }
  
  const _catNames = {
    'ひらがな': {ja:'ひらがな', en:'Hiragana',    bn:'হিরাগানা'},
    'カタカナ': {ja:'カタカナ', en:'Katakana',    bn:'কাতাকানা'},
    '漢字 N5':  {ja:'漢字 N5',  en:'Kanji N5',   bn:'কানজি N5'},
    '漢字 N4':  {ja:'漢字 N4',  en:'Kanji N4',   bn:'কানজি N4'},
    '漢字 N3':  {ja:'漢字 N3',  en:'Kanji N3',   bn:'কানজি N3'},
    '語彙 N5':  {ja:'語彙 N5',  en:'Vocab N5',   bn:'শব্দভাণ্ডার N5'},
    '語彙 N4':  {ja:'語彙 N4',  en:'Vocab N4',   bn:'শব্দভাণ্ডার N4'},
    '語彙 N3':  {ja:'語彙 N3',  en:'Vocab N3',   bn:'শব্দভাণ্ডার N3'},
    '動詞':     {ja:'動詞',     en:'Verbs',      bn:'ক্রিয়া'},
    '形容詞':   {ja:'形容詞',   en:'Adjectives', bn:'বিশেষণ'},
    '文法':     {ja:'文法',     en:'Grammar',    bn:'ব্যাকরণ'},
  };
  function _cn(k){ return (_catNames[k]||{})[_lang]||k; }
  const cats = [
    { name: 'ひらがな', icon: 'あ', modKey: 'kana', items: [...HB, ...HD], color: '#E4572E', mod: 'kana' },
    { name: 'カタカナ', icon: 'ア', modKey: 'kana', items: [...KB, ...KD], color: '#3A86C9', mod: 'kana' },
    { name: '漢字 N5', icon: '漢', modKey: 'kanji', items: JLPT_K5, color: '#6BA368', mod: 'kanji' },
    { name: '漢字 N4', icon: '漢', modKey: 'kanji', items: JLPT_K4, color: '#6BA368', mod: 'kanji' },
    { name: '漢字 N3', icon: '漢', modKey: 'kanji', items: JLPT_K3, color: '#6BA368', mod: 'kanji' },
    { name: '語彙 N5', icon: '📖', modKey: 'vocab', items: JLPT_V5, color: '#1F3A5F', mod: 'vocab' },
    { name: '語彙 N4', icon: '📖', modKey: 'vocab', items: JLPT_V4, color: '#1F3A5F', mod: 'vocab' },
    { name: '語彙 N3', icon: '📖', modKey: 'vocab', items: JLPT_V3, color: '#7B5EA7', mod: 'vocab' },
    { name: '動詞', icon: '🔄', modKey: 'verb', items: [...VERBS, ...VERBS_N4], color: '#D4A843', mod: 'verb' },
    { name: '形容詞', icon: '📝', modKey: 'adj', items: [...I_ADJ, ...NA_ADJ], color: '#E4572E', mod: 'adj' },
    { name: '文法', icon: '📗', modKey: 'grammar', items: GRAM, color: '#3A86C9', mod: 'grammar' },
  ];
  
  const catStats = cats.map(cat => ({ ...cat, ...getCatStats(cat.modKey, cat.items) }));
  
  const totalCorrect = +(localStorage.getItem('nw3_t') || 0);
  const totalStreak = +(localStorage.getItem('nw3_s') || 0);
  const allTotal = catStats.reduce((s, c) => s + c.total, 0);
  const allCorrect = catStats.reduce((s, c) => s + c.correct, 0);
  const allWrong = catStats.reduce((s, c) => s + c.wrong, 0);
  const allWeak = catStats.reduce((s, c) => s + c.weakCount, 0);
  const allMastered = catStats.reduce((s, c) => s + c.mastered, 0);
  const allItemCount = catStats.reduce((s, c) => s + c.itemCount, 0);
  const overallRate = allTotal > 0 ? Math.round(allCorrect / allTotal * 100) : 0;
  const masteryPercent = allItemCount > 0 ? Math.round(allMastered / allItemCount * 100) : 0;
  
  // SVG circular progress
  function circleProgress(percent, size, color, label, subLabel) {
    const r = (size - 8) / 2;
    const circ = 2 * Math.PI * r;
    const offset = circ * (1 - percent / 100);
    return '<div style="text-align:center">' +
      '<svg width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + ' ' + size + '">' +
      '<circle cx="' + size/2 + '" cy="' + size/2 + '" r="' + r + '" fill="none" stroke="var(--s3)" stroke-width="6"/>' +
      '<circle cx="' + size/2 + '" cy="' + size/2 + '" r="' + r + '" fill="none" stroke="' + color + '" stroke-width="6" stroke-linecap="round" stroke-dasharray="' + circ + '" stroke-dashoffset="' + offset + '" transform="rotate(-90 ' + size/2 + ' ' + size/2 + ')" style="transition:stroke-dashoffset 1.5s ease"/>' +
      '<text x="' + size/2 + '" y="' + (size/2 - 2) + '" text-anchor="middle" dominant-baseline="middle" fill="var(--tx)" font-size="' + (size > 80 ? 22 : 16) + '" font-weight="900">' + percent + '%</text>' +
      '<text x="' + size/2 + '" y="' + (size/2 + 14) + '" text-anchor="middle" dominant-baseline="middle" fill="var(--txM)" font-size="9">' + subLabel + '</text>' +
      '</svg>' +
      '<div style="font-size:11px;color:var(--txM);margin-top:4px">' + label + '</div>' +
    '</div>';
  }
  
  // JLPT pass rates
  function getPassRate(catNames) {
    const items = catNames.map(n => catStats.find(c => c.name === n)).filter(x => x && x.total > 0);
    if (!items.length) return 0;
    return Math.min(100, Math.round(items.reduce((s,c) => s + c.rate, 0) / items.length));
  }
  const n5Rate = getPassRate(['ひらがな','カタカナ','語彙 N5','漢字 N5']);
  const n4Rate = getPassRate(['語彙 N4','漢字 N4','文法']);
  const n3Rate = getPassRate(['語彙 N3','漢字 N3']);
  
  let h = '<div style="padding:4px 0">';
  
  // Header with greeting
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'おはよう' : hour < 18 ? 'こんにちは' : 'お疲れ様';
  h += '<div style="text-align:center;padding:16px 0 20px">';
  h += '<div style="font-size:15px;color:var(--txM);margin-bottom:4px">' + greeting + '！</div>';
  h += '<div style="font-family:\'Zen Maru Gothic\',sans-serif;font-size:22px;font-weight:900;color:var(--tx)">📊 マイダッシュボード</div>';
  h += '</div>';
  
  // Top stats row with circular progress
  h += '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:16px">';
  h += '<div style="background:var(--s1);border-radius:14px;padding:16px 8px;text-align:center;border:1px solid var(--brd)">';
  h += circleProgress(overallRate, 90, overallRate >= 80 ? 'var(--grn)' : overallRate >= 60 ? '#D4A843' : 'var(--acc)', '正答率', allCorrect + '/' + allTotal);
  h += '</div>';
  h += '<div style="background:var(--s1);border-radius:14px;padding:16px 8px;text-align:center;border:1px solid var(--brd)">';
  h += circleProgress(masteryPercent, 90, 'var(--accB)', '習得率', allMastered + '/' + allItemCount);
  h += '</div>';
  h += '<div style="background:var(--s1);border-radius:14px;padding:16px 8px;text-align:center;border:1px solid var(--brd)">';
  h += '<div style="font-size:36px;margin-bottom:4px">🔥</div>';
  h += '<div style="font-size:24px;font-weight:900;color:var(--tx)">' + totalStreak + '</div>';
  h += '<div style="font-size:11px;color:var(--txM);margin-top:4px">連続正解</div>';
  h += '</div>';
  h += '</div>';
  
  // Alert: weak items
  if (allWeak > 0) {
    h += '<div onclick="openM(\'review\')" style="background:linear-gradient(135deg,#FFF3E0,#FFE0B2);border-radius:12px;padding:14px 16px;margin-bottom:14px;cursor:pointer;border:1px solid #FFB74D;display:flex;align-items:center;gap:12px">';
    h += '<div style="font-size:28px">⚠️</div>';
    h += '<div><div style="font-size:13px;font-weight:700;color:#E65100">苦手アイテム: ' + allWeak + '個</div>';
    h += '<div style="font-size:11px;color:#BF360C;margin-top:2px">タップして復習クイズへ →</div></div>';
    h += '</div>';
  }
  
  // JLPT Pass Estimation
  h += '<div style="background:var(--s1);border-radius:14px;padding:16px;margin-bottom:14px;border:1px solid var(--brd)">';
  h += '<div style="font-family:\'Zen Maru Gothic\',sans-serif;font-size:14px;font-weight:700;margin-bottom:14px;color:var(--tx)">🎓 JLPT 合格予測</div>';
  
  [{level:'N5', rate:n5Rate, color:'#4CAF50'}, {level:'N4', rate:n4Rate, color:'#2196F3'}, {level:'N3', rate:n3Rate, color:'#9C27B0'}].forEach(function(item) {
    const statusIcon = item.rate >= 80 ? '✅' : item.rate >= 60 ? '📈' : item.rate >= 30 ? '📚' : '🌱';
    const _st={80:{ja:'合格圏内！',en:'Pass Zone!',bn:'পাস জোন!'},60:{ja:'もう少し！',en:'Almost there!',bn:'আরেকটু!'},30:{ja:'学習中',en:'Learning',bn:'শিখছেন'},0:{ja:'始めよう',en:'Get Started!',bn:'শুরু করুন'}};
    const statusText = item.rate>=80?_st[80][_lang]||_st[80].ja:item.rate>=60?_st[60][_lang]||_st[60].ja:item.rate>=30?_st[30][_lang]||_st[30].ja:_st[0][_lang]||_st[0].ja;
    const barW = Math.max(2, item.rate);
    h += '<div style="margin-bottom:12px">';
    h += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">';
    h += '<div style="display:flex;align-items:center;gap:6px"><span style="font-weight:800;font-size:15px;color:var(--tx)">' + item.level + '</span><span style="font-size:11px;color:var(--txM)">' + statusIcon + ' ' + statusText + '</span></div>';
    h += '<span style="font-size:15px;font-weight:800;color:' + item.color + '">' + item.rate + '%</span>';
    h += '</div>';
    h += '<div style="background:var(--s3);border-radius:6px;height:10px;overflow:hidden">';
    h += '<div style="height:100%;background:' + item.color + ';border-radius:6px;width:' + barW + '%;transition:width 1.2s ease"></div>';
    h += '</div></div>';
  });
  h += '</div>';
  
  // Category details
  h += '<div style="background:var(--s1);border-radius:14px;padding:16px;margin-bottom:14px;border:1px solid var(--brd)">';
  h += '<div style="font-family:\'Zen Maru Gothic\',sans-serif;font-size:14px;font-weight:700;margin-bottom:12px;color:var(--tx)">📋 カテゴリー別詳細</div>';
  
  catStats.forEach(function(cat) {
    const pct = cat.itemCount > 0 ? Math.round(cat.mastered / cat.itemCount * 100) : 0;
    const barColor = cat.rate >= 80 ? 'var(--grn)' : cat.rate >= 60 ? '#D4A843' : 'var(--acc)';
    h += '<div style="padding:10px 0;border-bottom:1px solid var(--brd)">';
    h += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">';
    h += '<div style="display:flex;align-items:center;gap:6px">';
    h += '<span style="font-size:16px">' + cat.icon + '</span>';
    h += '<span style="font-size:13px;font-weight:600;color:var(--tx)">' + _cn(cat.name) + '</span>';
    h += '</div>';
    h += '<div style="display:flex;align-items:center;gap:8px">';
    if (cat.weakCount > 0) h += '<span style="font-size:10px;background:#FFF3E0;color:#E65100;padding:2px 6px;border-radius:8px">苦手' + cat.weakCount + '</span>';
    h += '<span style="font-size:13px;font-weight:700;color:' + barColor + '">' + cat.rate + '%</span>';
    h += '</div></div>';
    
    // Two bars: accuracy + mastery
    h += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">';
    h += '<div><div style="font-size:9px;color:var(--txM);margin-bottom:2px">正答率 (' + cat.correct + '/' + cat.total + ')</div>';
    h += '<div style="background:var(--s3);border-radius:3px;height:5px;overflow:hidden"><div style="height:100%;background:' + barColor + ';border-radius:3px;width:' + cat.rate + '%"></div></div></div>';
    h += '<div><div style="font-size:9px;color:var(--txM);margin-bottom:2px">習得 (' + cat.mastered + '/' + cat.itemCount + ')</div>';
    h += '<div style="background:var(--s3);border-radius:3px;height:5px;overflow:hidden"><div style="height:100%;background:var(--accB);border-radius:3px;width:' + pct + '%"></div></div></div>';
    h += '</div></div>';
  });
  h += '</div>';
  
  // Action buttons
  h += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px">';
  h += '<button onclick="openM(\'review\')" style="padding:14px;border-radius:12px;background:linear-gradient(135deg,var(--acc),#C53E1B);color:#fff;border:none;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit">📝 復習クイズ</button>';
  h += '<button onclick="openM(\'longterm\')" style="padding:14px;border-radius:12px;background:linear-gradient(135deg,var(--accB),#152D4D);color:#fff;border:none;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit">🧠 長期記憶テスト</button>';
  h += '</div>';
  h += '<button onclick="goHome()" style="width:100%;padding:12px;border-radius:12px;background:var(--s2);color:var(--txM);border:1px solid var(--brd);font-size:13px;cursor:pointer;font-family:inherit">🏠 ホームに戻る</button>';
  h += '</div>';
  
  target.innerHTML = h;
}

function boostPassRate() {
  // Find weakest category and go to review or longterm
  const mods = ['vocab', 'kanji', 'verb', 'adj', 'grammar'];
  const allItems = {
    vocab: [...JLPT_V5, ...JLPT_V4, ...JLPT_V3],
    kanji: [...JLPT_K5, ...JLPT_K4, ...JLPT_K3],
    verb: [...VERBS, ...VERBS_N4],
    adj: [...I_ADJ, ...NA_ADJ],
    grammar: GRAM
  };
  
  // Find mod with most wrong answers
  let maxWrong = 0, weakMod = 'vocab';
  mods.forEach(mod => {
    const items = allItems[mod] || [];
    const wrongCount = SRS.getWeakItems(mod, items).length;
    if (wrongCount > maxWrong) { maxWrong = wrongCount; weakMod = mod; }
  });
  
  // Randomly go to review or longterm
  if (Math.random() > 0.5 || maxWrong === 0) {
    openM('longterm');
  } else {
    openM('review');
  }
}



function mkDenkou(c) {
  if (!document.getElementById('dk-style')) {
    const s = document.createElement('style');
    s.id = 'dk-style';
    s.textContent = `
      #m-denkou { background:#0e0f13; min-height:100vh; color:#e8e6df; }
      .dk-wrap { max-width:720px; margin:0 auto; padding:16px; font-family:'Noto Sans JP',sans-serif; }
      .dk-mode-tabs { display:flex; gap:0; background:#16181f; border:1px solid rgba(255,255,255,.07); border-radius:10px; margin-bottom:14px; overflow:hidden; }
      .dk-tab { flex:1; padding:9px 6px; font-size:11px; font-weight:600; color:#8a8880; cursor:pointer; border-bottom:2px solid transparent; transition:all .2s; text-align:center; white-space:nowrap; }
      .dk-tab:hover { color:#e8e6df; }
      .dk-tab.dk-on { color:#e8a84c; border-bottom-color:#e8a84c; background:#1e2028; }
      .dk-ctrl { display:flex; gap:8px; flex-wrap:wrap; margin-bottom:12px; align-items:center; }
      .dk-btn { padding:6px 12px; border-radius:6px; border:1px solid rgba(255,255,255,.07); background:#16181f; color:#e8e6df; font-size:11px; cursor:pointer; font-family:'Noto Sans JP',sans-serif; transition:all .15s; }
      .dk-btn:hover { background:#252730; }
      .dk-btn.dk-on { background:#e8a84c; color:#000; border-color:#e8a84c; }
      .dk-sep { width:1px; height:20px; background:rgba(255,255,255,.07); }
      .dk-prog-bar { flex:1; height:3px; background:#1e2028; border-radius:2px; overflow:hidden; }
      .dk-prog-fill { height:100%; background:#e8a84c; border-radius:2px; transition:width .3s; }
      .dk-prog-text { font-size:11px; color:#8a8880; min-width:48px; text-align:right; }
      .dk-fc-wrap { perspective:1200px; height:320px; margin-bottom:16px; cursor:pointer; }
      .dk-fc { width:100%; height:100%; position:relative; transform-style:preserve-3d; transition:transform .55s cubic-bezier(.23,1,.32,1); }
      .dk-fc.dk-flip { transform:rotateY(180deg); }
      .dk-face { position:absolute; inset:0; backface-visibility:hidden; border-radius:14px; display:flex; flex-direction:column; align-items:center; justify-content:center; border:1px solid rgba(255,255,255,.07); overflow:hidden; }
      .dk-front { background:#16181f; }
      .dk-back { background:#1e2028; transform:rotateY(180deg); align-items:flex-start; padding:24px 28px; justify-content:flex-start; }
      .dk-kanji-big { font-family:'Noto Serif JP',serif; font-size:110px; font-weight:700; color:#e8e6df; line-height:1; text-shadow:0 2px 20px rgba(232,168,76,.15); }
      .dk-card-hint { margin-top:12px; font-size:11px; color:#5a5856; letter-spacing:.1em; display:flex; align-items:center; gap:6px; }
      .dk-card-hint::before,.dk-card-hint::after { content:''; width:16px; height:1px; background:#5a5856; }
      .dk-badge { position:absolute; top:12px; right:12px; background:#252730; border:1px solid rgba(255,255,255,.07); border-radius:4px; padding:2px 8px; font-size:10px; color:#8a8880; }
      .dk-back-row { display:flex; gap:14px; width:100%; margin-bottom:14px; }
      .dk-back-sec { flex:1; }
      .dk-blbl { font-size:9px; color:#5a5856; letter-spacing:.12em; text-transform:uppercase; margin-bottom:4px; }
      .dk-bval { font-size:15px; color:#e8a84c; font-family:'DM Mono',monospace; font-weight:500; }
      .dk-bmean { font-size:18px; font-weight:600; color:#e8e6df; border-left:3px solid #e8a84c; padding-left:10px; margin-bottom:12px; }
      .dk-bex { background:#252730; border-radius:8px; border:1px solid rgba(255,255,255,.07); padding:10px 12px; width:100%; font-size:12px; color:#e8e6df; line-height:1.6; }
      .dk-bex-lbl { font-size:9px; color:#5a5856; letter-spacing:.1em; margin-bottom:4px; }
      .dk-bksmall { font-family:'Noto Serif JP',serif; font-weight:700; color:#5a5856; position:absolute; top:16px; right:20px; opacity:.35; }
      .dk-acts { display:flex; gap:10px; justify-content:center; margin-top:4px; }
      .dk-act { padding:9px 20px; border-radius:8px; border:1px solid rgba(255,255,255,.07); font-size:12px; font-weight:500; cursor:pointer; font-family:'Noto Sans JP',sans-serif; transition:all .15s; }
      .dk-act.prev { background:#16181f; color:#8a8880; } .dk-act.prev:hover { background:#252730; color:#e8e6df; }
      .dk-act.flag { background:#16181f; color:#d96b6b; border-color:rgba(217,107,107,.25); } .dk-act.flag:hover { background:rgba(217,107,107,.1); }
      .dk-act.flag.dk-flagged { background:rgba(217,107,107,.15); }
      .dk-act.nxt { background:#e8a84c; color:#000; border-color:transparent; } .dk-act.nxt:hover { background:#c47d25; }
      .dk-qbox { background:#16181f; border:1px solid rgba(255,255,255,.07); border-radius:14px; padding:32px; text-align:center; margin-bottom:16px; min-height:180px; display:flex; flex-direction:column; align-items:center; justify-content:center; }
      .dk-qkanji { font-family:'Noto Serif JP',serif; font-size:88px; font-weight:700; color:#e8e6df; line-height:1; }
      .dk-qctx { margin-top:10px; font-size:12px; color:#8a8880; }
      .dk-qbadge { display:inline-block; margin-bottom:12px; background:#252730; border:1px solid rgba(255,255,255,.07); border-radius:20px; padding:3px 14px; font-size:10px; color:#e8a84c; letter-spacing:.08em; }
      .dk-opts { display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:16px; }
      .dk-opt { padding:12px 16px; border-radius:10px; border:1px solid rgba(255,255,255,.07); background:#1e2028; color:#e8e6df; font-size:13px; cursor:pointer; transition:all .15s; text-align:left; font-family:'Noto Sans JP',sans-serif; line-height:1.5; display:flex; align-items:center; gap:8px; }
      .dk-opt:hover:not(.dk-dis) { background:#252730; }
      .dk-opt.dk-ok { background:rgba(107,191,138,.15); border-color:#6bbf8a; color:#6bbf8a; }
      .dk-opt.dk-ng { background:rgba(217,107,107,.12); border-color:#d96b6b; color:#d96b6b; }
      .dk-opt.dk-dis { cursor:default; }
      .dk-ollbl { display:inline-flex; align-items:center; justify-content:center; width:20px; height:20px; min-width:20px; background:#252730; border-radius:4px; font-size:10px; color:#8a8880; font-family:'DM Mono',monospace; flex-shrink:0; }
      .dk-opt.dk-ok .dk-ollbl { background:rgba(107,191,138,.2); color:#6bbf8a; }
      .dk-opt.dk-ng .dk-ollbl { background:rgba(217,107,107,.15); color:#d96b6b; }
      .dk-fb { padding:12px 16px; border-radius:10px; margin-bottom:12px; font-size:12px; line-height:1.7; }
      .dk-fb.ok { background:rgba(107,191,138,.1); border:1px solid rgba(107,191,138,.25); color:#6bbf8a; }
      .dk-fb.ng { background:rgba(217,107,107,.08); border:1px solid rgba(217,107,107,.2); color:#d96b6b; }
      .dk-nx-btn { padding:9px 28px; border-radius:8px; background:#e8a84c; color:#000; border:none; font-size:12px; font-weight:700; cursor:pointer; font-family:'Noto Sans JP',sans-serif; transition:background .15s; }
      .dk-nx-btn:hover { background:#c47d25; }
      .dk-scr { text-align:center; padding:40px 16px; }
      .dk-scr-big { font-family:'Noto Serif JP',serif; font-size:72px; font-weight:700; color:#e8a84c; line-height:1; margin-bottom:8px; }
      .dk-scr-msg { font-size:13px; color:#8a8880; margin-bottom:20px; }
      .dk-tiles { display:flex; gap:12px; justify-content:center; margin-bottom:20px; }
      .dk-tile { background:#1e2028; border:1px solid rgba(255,255,255,.07); border-radius:12px; padding:12px 20px; min-width:70px; }
      .dk-tile .tl { font-size:10px; color:#5a5856; margin-bottom:3px; }
      .dk-tile .tv { font-size:22px; font-weight:700; }
      .dk-tile.g .tv { color:#6bbf8a; }
      .dk-tile.r .tv { color:#d96b6b; }
    `;
    document.head.appendChild(s);
  }

  const target = c;

  const DK_KANJI = [
  {k:`子`,on:`シ`,kun:`こ`,en:`Child / Small object`,ex:`電子（でんし）Electron`},
  {k:`安`,on:`アン`,kun:`やす(い)`,en:`Safe / Cheap`,ex:`安全器（あんぜんき）Protective device`},
  {k:`時`,on:`ジ`,kun:`とき`,en:`Time`,ex:`時限組合せ（じげんくみあわせ）Time limit combination`},
  {k:`一`,on:`イチ`,kun:`ひと(つ)`,en:`One`,ex:`一次側（いちじがわ）Primary side`},
  {k:`金`,on:`キン`,kun:`かね`,en:`Metal / Gold`,ex:`金属管（きんぞくかん）Metal conduit`},
  {k:`電`,on:`デン`,kun:`—`,en:`Electricity`,ex:`電圧（でんあつ）Voltage`},
  {k:`気`,on:`キ`,kun:`—`,en:`Spirit / Air / Energy`,ex:`気中遮断器（きちゅうしゃだんき）Air circuit breaker`},
  {k:`外`,on:`ガイ`,kun:`そと`,en:`Outside`,ex:`外線（がいせん）Outer line`},
  {k:`空`,on:`クウ`,kun:`そら`,en:`Empty / Sky / Air`,ex:`空調設備（くうちょうせつび）Air conditioning equipment`},
  {k:`間`,on:`カン`,kun:`あいだ`,en:`Interval / Between`,ex:`離隔距間（りかくきょかん）Separation distance`},
  {k:`高`,on:`コウ`,kun:`たか(い)`,en:`High`,ex:`高圧（こうあつ）High voltage`},
  {k:`水`,on:`スイ`,kun:`みず`,en:`Water`,ex:`水平（すいへい）Horizontal`},
  {k:`黒`,on:`コク`,kun:`くろ`,en:`Black`,ex:`黒色電線（こくしょくでんせん）Black wire`},
  {k:`大`,on:`ダイ`,kun:`おお(きい)`,en:`Large`,ex:`最大電力（さいだいでんりょく）Maximum power`},
  {k:`三`,on:`サン`,kun:`み`,en:`Three`,ex:`三相（さんそう）Three-phase`},
  {k:`火`,on:`カ`,kun:`ひ`,en:`Fire`,ex:`引火（いんか）Ignition`},
  {k:`手`,on:`シュ`,kun:`て`,en:`Hand`,ex:`手動（しゅどう）Manual`},
  {k:`小`,on:`ショウ`,kun:`ちい(さい)`,en:`Small`,ex:`小勢力回路（しょうせいりょくかいろ）Small power circuit`},
  {k:`出`,on:`シュツ`,kun:`で(る)`,en:`Exit / Output`,ex:`出力（しゅつりょく）Output`},
  {k:`力`,on:`リョク`,kun:`ちから`,en:`Power / Force`,ex:`電力（でんりょく）Electric power`},
  {k:`立`,on:`リツ`,kun:`た(てる)`,en:`Stand / Build`,ex:`自立形（じりつがた）Self-supporting type`},
  {k:`上`,on:`ジョウ`,kun:`うえ`,en:`Above / Up`,ex:`上限（じょうげん）Upper limit`},
  {k:`中`,on:`チュウ`,kun:`なか`,en:`Middle / Inside`,ex:`中性線（ちゅうせいせん）Neutral wire`},
  {k:`下`,on:`カ`,kun:`した`,en:`Below / Down`,ex:`下限（かげん）Lower limit`},
  {k:`天`,on:`テン`,kun:`あめ`,en:`Heaven / Ceiling`,ex:`天井隠ぺい配線（てんじょういんぺいはいせん）Ceiling concealed wiring`},
  {k:`少`,on:`ショウ`,kun:`すく(ない)`,en:`Few / Little`,ex:`少量（しょうりょう）Small quantity`},
  {k:`二`,on:`ニ`,kun:`ふた(つ)`,en:`Two`,ex:`二次側（にじがわ）Secondary side`},
  {k:`白`,on:`ハク`,kun:`しろ`,en:`White`,ex:`白色電線（はくしょくでんせん）White wire`},
  {k:`半`,on:`ハン`,kun:`なか(ば)`,en:`Half`,ex:`半導体（はんどうたい）Semiconductor`},
  {k:`口`,on:`コウ`,kun:`くち`,en:`Mouth / Opening`,ex:`取付口（とりつけぐち）Mounting hole`},
  {k:`風`,on:`フウ`,kun:`かぜ`,en:`Wind`,ex:`風圧荷重（ふうあつかじゅう）Wind pressure load`},
  {k:`左`,on:`サ`,kun:`ひだり`,en:`Left`,ex:`左回り（ひだりまわり）Counter-clockwise`},
  {k:`右`,on:`ウ`,kun:`みぎ`,en:`Right`,ex:`右回り（みぎまわり）Clockwise`},
  {k:`分`,on:`ブン`,kun:`わ(ける)`,en:`Part / Minute / Divide`,ex:`分電盤（ぶんでんばん）Distribution board`},
  {k:`行`,on:`コウ`,kun:`い(く)`,en:`Go / Conduct`,ex:`施行（しこう）Enforcement`},
  {k:`目`,on:`モク`,kun:`め`,en:`Eye / Item`,ex:`項目（こうもく）Item`},
  {k:`木`,on:`モク`,kun:`き`,en:`Wood`,ex:`木台（きだい）Wooden base`},
  {k:`入`,on:`ニュウ`,kun:`い(れる)`,en:`Enter / Input`,ex:`投入（とうにゅう）Closing / Input`},
  {k:`地`,on:`チ`,kun:`つち`,en:`Ground / Earth`,ex:`接地（せっち）Earthing / Grounding`},
  {k:`工`,on:`コウ`,kun:`—`,en:`Construction / Work`,ex:`電気工事（でんきこうじ）Electrical work`},
  {k:`事`,on:`ジ`,kun:`こと`,en:`Thing / Business`,ex:`電気事業法（でんきじぎょうほう）Electricity Business Act`},
  {k:`用`,on:`ヨウ`,kun:`もち(いる)`,en:`Use / Purpose`,ex:`業務用（ぎょうむよう）Commercial use`},
  {k:`明`,on:`メイ`,kun:`あか(るい)`,en:`Bright / Light`,ex:`照明（しょうめい）Lighting`},
  {k:`着`,on:`チャク`,kun:`き(る)`,en:`Wear / Arrive / Attach`,ex:`密着（みっちゃく）Close contact`},
  {k:`定`,on:`テイ`,kun:`さだ(める)`,en:`Fixed / Determine`,ex:`定格電圧（ていかくでんあつ）Rated voltage`},
  {k:`相`,on:`ソウ`,kun:`あい`,en:`Phase / Mutual`,ex:`相回転（そうかいてん）Phase rotation`},
  {k:`内`,on:`ナイ`,kun:`うち`,en:`Inside / Within`,ex:`屋内配線（おくないはいせん）Indoor wiring`},
  {k:`作`,on:`サク`,kun:`つく(る)`,en:`Make / Operate`,ex:`動作（どうさ）Operation`},
  {k:`物`,on:`ブツ`,kun:`もの`,en:`Thing / Object`,ex:`障害物（しょうがいぶつ）Obstacle`},
  {k:`屋`,on:`オク`,kun:`や`,en:`House / Roof`,ex:`屋外用（おくがいよう）Outdoor use`},
  {k:`引`,on:`イン`,kun:`ひ(く)`,en:`Pull / Draw`,ex:`引込線（ひきこみせん）Service wire`},
  {k:`回`,on:`カイ`,kun:`まわ(る)`,en:`Turn / Times / Circuit`,ex:`回路（かいろ）Circuit`},
  {k:`転`,on:`テン`,kun:`ころ(がる)`,en:`Roll / Change`,ex:`回転磁界（かいてんじかい）Rotating magnetic field`},
  {k:`計`,on:`ケイ`,kun:`はか(る)`,en:`Measure / Plan`,ex:`電力量計（でんりょくりょうけい）Watt-hour meter`},
  {k:`界`,on:`カイ`,kun:`—`,en:`World / Boundary / Field`,ex:`磁界（じかい）Magnetic field`},
  {k:`度`,on:`ド`,kun:`たび`,en:`Degree / Limit`,ex:`温度（おんど）Temperature`},
  {k:`開`,on:`カイ`,kun:`あ(ける)`,en:`Open`,ex:`開閉器（かいへいき）Switch`},
  {k:`閉`,on:`ヘイ`,kun:`と(じる)`,en:`Close`,ex:`開閉器（かいへいき）Switch`},
  {k:`切`,on:`セツ`,kun:`き(る)`,en:`Cut / Disconnect`,ex:`切断（せつだん）Cutting`},
  {k:`起`,on:`キ`,kun:`お(きる)`,en:`Rise / Generate`,ex:`起電力（きでんりょく）Electromotive force`},
  {k:`形`,on:`ケイ`,kun:`かたち`,en:`Shape / Form`,ex:`扇形（おうぎがた）Fan-shaped`},
  {k:`光`,on:`コウ`,kun:`ひかり`,en:`Light`,ex:`光束（こうそく）Luminous flux`},
  {k:`軽`,on:`ケイ`,kun:`かる(い)`,en:`Light (weight)`,ex:`軽合金（けいごうきん）Light alloy`},
  {k:`銀`,on:`ギン`,kun:`—`,en:`Silver`,ex:`銀（ぎん）Silver - used in contacts`},
  {k:`放`,on:`ホウ`,kun:`はな(す)`,en:`Release / Emit`,ex:`放電（ほうでん）Discharge`},
  {k:`質`,on:`シツ`,kun:`—`,en:`Quality / Matter`,ex:`材質（ざいしつ）Material quality`},
  {k:`化`,on:`カ`,kun:`ば(ける)`,en:`Change / -ization`,ex:`軟化（なんか）Softening`},
  {k:`合`,on:`ゴウ`,kun:`あ(う)`,en:`Combine / Fit`,ex:`接合（せつごう）Joining`},
  {k:`色`,on:`シキ`,kun:`いろ`,en:`Color`,ex:`識色（しきしょく）Color coding`},
  {k:`動`,on:`ドウ`,kun:`うご(く)`,en:`Move / Operate`,ex:`電動機（でんどうき）Motor`},
  {k:`方`,on:`ホウ`,kun:`かた`,en:`Direction / Method`,ex:`方向性（ほうこうせい）Directionality`},
  {k:`理`,on:`リ`,kun:`—`,en:`Logic / Reason`,ex:`物理（ぶつり）Physics`},
  {k:`自`,on:`ジ`,kun:`みずか(ら)`,en:`Self`,ex:`自動遮断（じどうしゃだん）Automatic cutoff`},
  {k:`家`,on:`カ`,kun:`いえ`,en:`House / Home`,ex:`一般用電気工作物（いっぱんようでんきこうさくぶつ）General use`},
  {k:`業`,on:`ギョウ`,kun:`わざ`,en:`Business / Work`,ex:`電気工業（でんきこうぎょう）Electrical industry`},
  {k:`実`,on:`ジツ`,kun:`み`,en:`Reality / Fruit`,ex:`実効値（じっこうち）RMS value`},
  {k:`弱`,on:`ジャク`,kun:`よわ(い)`,en:`Weak`,ex:`弱電流回路（じゃくでんりゅうかいろ）Weak current circuit`},
  {k:`心`,on:`シン`,kun:`こころ`,en:`Heart / Core`,ex:`電線心線（でんせんしんせん）Core wire`},
  {k:`進`,on:`シン`,kun:`すす(む)`,en:`Advance / Lead`,ex:`進相コンデンサ（しんそうコンデンサ）Static capacitor`},
  {k:`始`,on:`シ`,kun:`はじ(める)`,en:`Start`,ex:`開始（かいし）Start`},
  {k:`通`,on:`ツウ`,kun:`とお(る)`,en:`Pass / Commute`,ex:`導通（どうつう）Continuity`},
  {k:`体`,on:`タイ`,kun:`からだ`,en:`Body / Object`,ex:`導体（どうたい）Conductor`},
  {k:`変`,on:`ヘン`,kun:`か(わる)`,en:`Change / Strange`,ex:`変圧器（へんあつき）Transformer`},
  {k:`箱`,on:`ソウ`,kun:`はこ`,en:`Box`,ex:`アウトレットボックス（あうとれっとぼっくす）Outlet box`},
  {k:`材`,on:`ザイ`,kun:`—`,en:`Material`,ex:`絶縁材（ぜつえんざい）Insulating material`},
  {k:`太`,on:`タイ`,kun:`ふと(い)`,en:`Thick / Fat`,ex:`太さ（ふとさ）Thickness / Gauge`},
  {k:`池`,on:`チ`,kun:`いけ`,en:`Pond / Battery`,ex:`電池（でんち）Battery`},
  {k:`短`,on:`タン`,kun:`みじか(い)`,en:`Short`,ex:`短絡（たんらく）Short circuit`},
  {k:`低`,on:`テイ`,kun:`ひく(い)`,en:`Low`,ex:`低圧（ていあつ）Low voltage`},
  {k:`降`,on:`コウ`,kun:`お(りる)`,en:`Descend / Fall`,ex:`電圧降下（でんあつこうか）Voltage drop`},
  {k:`者`,on:`シャ`,kun:`もの`,en:`Person`,ex:`電気工事者（でんきこうじしゃ）Electrician`},
  {k:`同`,on:`ドウ`,kun:`おな(じ)`,en:`Same`,ex:`同期（どうき）Synchronous`},
  {k:`試`,on:`シ`,kun:`ため(す)`,en:`Test / Try`,ex:`試験（しけん）Examination`},
  {k:`験`,on:`ケン`,kun:`—`,en:`Test / Verify`,ex:`試験（しけん）Examination`},
  {k:`特`,on:`トク`,kun:`—`,en:`Special`,ex:`特別高圧（とくべつこうあつ）Extra-high voltage`},
  {k:`別`,on:`ベツ`,kun:`わか(れる)`,en:`Separate / Different`,ex:`種別（しゅべつ）Category`},
  {k:`重`,on:`ジュウ`,kun:`おも(い)`,en:`Heavy / Weight`,ex:`荷重（かじゅう）Load`},
  {k:`料`,on:`リョウ`,kun:`—`,en:`Fee / Material`,ex:`材料（ざいりょう）Material`},
  {k:`図`,on:`ズ`,kun:`—`,en:`Diagram / Map`,ex:`配線図（はいせんず）Wiring diagram`},
  {k:`強`,on:`キョウ`,kun:`つよ(い)`,en:`Strong`,ex:`引張強さ（ひっぱりつよさ）Tensile strength`},
  {k:`無`,on:`ム`,kun:`な(い)`,en:`None / Nothing`,ex:`無負荷（むふか）No load`},
  {k:`有`,on:`ユウ`,kun:`あ(る)`,en:`Have / Exist`,ex:`有効電力（ゆうこうでんりょく）Active power`},
  {k:`極`,on:`キョク`,kun:`きわ(める)`,en:`Pole / Extreme`,ex:`接地極（せっちきょく）Grounding electrode`},
  {k:`路`,on:`ロ`,kun:`みち`,en:`Path / Road`,ex:`回路（かいろ）Circuit`},
  {k:`種`,on:`シュ`,kun:`たね`,en:`Type / Species`,ex:`Ａ種接地工事（えーしゅせっちこうじ）Type A grounding`},
  {k:`接`,on:`セツ`,kun:`つ(ぐ)`,en:`Connect / Touch`,ex:`接地（せっち）Earthing`},
  {k:`管`,on:`カン`,kun:`くだ`,en:`Pipe / Tube`,ex:`電線管（でんせんかん）Conduit`},
  {k:`灯`,on:`トウ`,kun:`ひ`,en:`Light / Lamp`,ex:`蛍光灯（けいこうとう）Fluorescent lamp`},
  {k:`厚`,on:`コウ`,kun:`あつ(い)`,en:`Thick`,ex:`厚鋼電線管（こうこうでんせんかん）Thick steel conduit`},
  {k:`油`,on:`ユ`,kun:`あぶら`,en:`Oil`,ex:`油入変圧器（あぶらいりへんあつき）Oil-immersed transformer`},
  {k:`差`,on:`サ`,kun:`さ(す)`,en:`Difference / Insert`,ex:`差込形コネクタ（さしこみがたコネクタ）Push-in connector`},
  {k:`点`,on:`テン`,kun:`—`,en:`Point / Dot`,ex:`接続点（せつぞくてん）Connection point`},
  {k:`位`,on:`イ`,kun:`くらい`,en:`Position / Unit`,ex:`位相（いそう）Phase`},
  {k:`表`,on:`ヒョウ`,kun:`おもて`,en:`Table / Surface`,ex:`第一表（だいいちひょう）Table 1`},
  {k:`示`,on:`ジ`,kun:`しめ(す)`,en:`Show / Indicate`,ex:`指示計器（しじけいき）Indicating instrument`},
  {k:`蔵`,on:`ゾウ`,kun:`くら`,en:`Store / Internal`,ex:`内蔵（ないぞう）Built-in`},
  {k:`線`,on:`セン`,kun:`—`,en:`Line / Wire`,ex:`電線（でんせん）Electric wire`},
  {k:`般`,on:`ハン`,kun:`—`,en:`General`,ex:`一般用電気工作物（いっぱんようでんきこうさくぶつ）General use`},
  {k:`薄`,on:`ハク`,kun:`うす(い)`,en:`Thin`,ex:`薄鋼電線管（はくこうでんせんかん）Thin steel conduit`},
  {k:`具`,on:`グ`,kun:`—`,en:`Tool / Equipment`,ex:`接続器具（せつぞくきぐ）Connecting device`},
  {k:`法`,on:`ホウ`,kun:`—`,en:`Law / Method`,ex:`電気工事士法（でんきこうじしほう）Electricians Act`},
  {k:`側`,on:`ソク`,kun:`がわ`,en:`Side`,ex:`負荷側（ふかがわ）Load side`},
  {k:`遅`,on:`チ`,kun:`おそ(い)`,en:`Late / Delay`,ex:`遅れ位相（おくれいそう）Lagging phase`},
  {k:`押`,on:`オウ`,kun:`お(す)`,en:`Push`,ex:`押ボタン（おしボタン）Push button`},
  {k:`速`,on:`ソク`,kun:`はや(い)`,en:`Speed / Fast`,ex:`変速（へんそく）Speed change`},
  {k:`確`,on:`カク`,kun:`たしか`,en:`Certain / Confirm`,ex:`確認（かくにん）Confirmation`},
  {k:`認`,on:`ニン`,kun:`みと(める)`,en:`Recognize / Approve`,ex:`認可（にんか）Approval`},
  {k:`過`,on:`カ`,kun:`す(ぎる)`,en:`Over / Excess`,ex:`過電流（かでんりゅう）Overcurrent`},
  {k:`流`,on:`リュウ`,kun:`なが(れる)`,en:`Flow / Current`,ex:`電流（でんりゅう）Electric current`},
  {k:`断`,on:`ダン`,kun:`ことわ(る)`,en:`Cut / Disconnect`,ex:`遮断器（しゃだんき）Circuit breaker`},
  {k:`機`,on:`キ`,kun:`はた`,en:`Machine`,ex:`発電機（はつでんき）Generator`},
  {k:`性`,on:`セイ`,kun:`—`,en:`Nature / Property`,ex:`絶縁性（ぜつえんせい）Insulating property`},
  {k:`粉`,on:`フン`,kun:`こな`,en:`Powder`,ex:`粉じん（こなじん）Dust`},
  {k:`付`,on:`フ`,kun:`つ(ける)`,en:`Attach`,ex:`取付（とりつけ）Mounting`},
  {k:`負`,on:`フ`,kun:`ま(ける)`,en:`Negative / Load`,ex:`負荷（ふか）Load`},
  {k:`荷`,on:`カ`,kun:`に`,en:`Load / Cargo`,ex:`負荷（ふか）Load`},
  {k:`防`,on:`ボウ`,kun:`ふせ(ぐ)`,en:`Prevent / Protect`,ex:`防護（ぼうご）Protection`},
  {k:`置`,on:`チ`,kun:`お(く)`,en:`Place / Put / Set`,ex:`設置（せっち）Installation`},
  {k:`換`,on:`カン`,kun:`か(える)`,en:`Exchange / Replace`,ex:`換気扇（かんきせん）Ventilation fan`},
  {k:`数`,on:`スウ`,kun:`かず`,en:`Number`,ex:`周波数（しゅうはすう）Frequency`},
  {k:`許`,on:`キョ`,kun:`ゆる(す)`,en:`Permit / Allow`,ex:`許容電流（きょようでんりゅう）Allowable current`},
  {k:`容`,on:`ヨウ`,kun:`—`,en:`Capacity / Container`,ex:`容量（ようりょう）Capacity`},
  {k:`配`,on:`ハイ`,kun:`くば(る)`,en:`Distribute / Wiring`,ex:`配線（はいせん）Wiring`},
  {k:`塩`,on:`エン`,kun:`しお`,en:`Salt / Vinyl`,ex:`硬質塩化ビニル管（こうしつえんかビニルかん）Rigid PVC conduit`},
  {k:`公`,on:`コウ`,kun:`おおやけ`,en:`Public`,ex:`公称断面積（こうしょうだんめんせき）Nominal cross-section`},
  {k:`面`,on:`メン`,kun:`つら`,en:`Surface / Face`,ex:`断面積（だんめんせき）Cross-sectional area`},
  {k:`積`,on:`セキ`,kun:`つ(む)`,en:`Accumulate / Area`,ex:`面積（めんせき）Area`},
  {k:`成`,on:`セイ`,kun:`な(る)`,en:`Become / Form`,ex:`合成樹脂管（ごうせいじゅしかん）Synthetic resin conduit`},
  {k:`束`,on:`ソク`,kun:`たば`,en:`Bundle`,ex:`束線（そくせん）Bundling wires`},
  {k:`交`,on:`コウ`,kun:`まじ(わる)`,en:`Exchange / Alternate`,ex:`交流（こうりゅう）Alternating current`},
  {k:`続`,on:`ゾク`,kun:`つづ(く)`,en:`Continue / Connect`,ex:`接続（せつぞく）Connection`},
  {k:`絶`,on:`ゼツ`,kun:`た(つ)`,en:`Absolute / Insulate`,ex:`絶縁（ぜつえん）Insulation`},
  {k:`最`,on:`サイ`,kun:`もっと(も)`,en:`Most / Max`,ex:`最大（さいだい）Maximum`},
  {k:`値`,on:`チ`,kun:`あたい`,en:`Value`,ex:`測定値（そくていち）Measured value`},
  {k:`平`,on:`ヘイ`,kun:`たいら`,en:`Flat / Level`,ex:`平行（へいこう）Parallel`},
  {k:`消`,on:`ショウ`,kun:`き(える)`,en:`Extinguish / Consume`,ex:`消費電力（しょうひでんりょく）Power consumption`},
  {k:`期`,on:`キ`,kun:`—`,en:`Period / Term`,ex:`周期（しゅうき）Period / Cycle`},
  {k:`波`,on:`ハ`,kun:`なみ`,en:`Wave`,ex:`周波数（しゅうはすう）Frequency`},
  {k:`熱`,on:`ネツ`,kun:`あつ(い)`,en:`Heat`,ex:`電熱器（でんねつき）Electric heater`},
  {k:`受`,on:`ジュ`,kun:`う(ける)`,en:`Receive`,ex:`受電（じゅでん）Power reception`},
  {k:`要`,on:`ヨウ`,kun:`い(る)`,en:`Require / Essential`,ex:`要件（ようけん）Requirement`},
  {k:`査`,on:`サ`,kun:`—`,en:`Inspect`,ex:`検査（けんさ）Inspection`},
  {k:`常`,on:`ジョウ`,kun:`つね`,en:`Normal / Regular`,ex:`非常用（ひじょうよう）Emergency use`},
  {k:`発`,on:`ハツ`,kun:`た(つ)`,en:`Generate / Start`,ex:`発電（はつでん）Power generation`},
  {k:`設`,on:`セツ`,kun:`もう(ける)`,en:`Establish / Install`,ex:`設備（せつび）Equipment`},
  {k:`備`,on:`ビ`,kun:`そな(える)`,en:`Equipment / Provide`,ex:`予備（よび）Spare`},
  {k:`振`,on:`シン`,kun:`ふ(る)`,en:`Shake / Vibration`,ex:`振動（しんどう）Vibration`},
  {k:`結`,on:`ケツ`,kun:`むす(ぶ)`,en:`Connect / Result`,ex:`結線（けっせん）Wiring / Connection`},
  {k:`制`,on:`セイ`,kun:`—`,en:`Control / Limit`,ex:`制御（せいぎょ）Control`},
  {k:`御`,on:`ギョ`,kun:`おん`,en:`Control / Honorific`,ex:`制御（せいぎょ）Control`},
  {k:`限`,on:`ゲン`,kun:`かぎ(る)`,en:`Limit`,ex:`制限（せいげん）Limitation`},
  {k:`静`,on:`セイ`,kun:`しず(か)`,en:`Quiet / Static`,ex:`静電容量（せいでんようりょう）Capacitance`},
  {k:`量`,on:`リョウ`,kun:`はか(る)`,en:`Quantity / Capacity`,ex:`電量（でんりょう）Amount of electricity`},
  {k:`全`,on:`ゼン`,kun:`まった(く)`,en:`All / Whole`,ex:`全負荷（ぜんふか）Full load`},
  {k:`造`,on:`ゾウ`,kun:`つく(る)`,en:`Create / Structure`,ex:`構造（こうぞう）Structure`},
  {k:`対`,on:`タイ`,kun:`—`,en:`Against / Opposite / Pair`,ex:`接地対地電圧（せっちたいちでんあつ）Voltage to ground`},
  {k:`陽`,on:`ヨウ`,kun:`ひ`,en:`Positive / Sun`,ex:`陽極（ようきょく）Anode`},
  {k:`単`,on:`タン`,kun:`—`,en:`Single`,ex:`単相（たんそう）Single-phase`},
  {k:`欠`,on:`ケツ`,kun:`か(ける)`,en:`Missing / Lack`,ex:`欠相（けっそう）Phase loss`},
  {k:`保`,on:`ホ`,kun:`たも(つ)`,en:`Keep / Protect`,ex:`保護（ほご）Protection`},
  {k:`絡`,on:`ラク`,kun:`から(まる)`,en:`Entangle / Link`,ex:`短絡（たんらく）Short circuit`},
  {k:`調`,on:`チョウ`,kun:`しら(べる)`,en:`Adjust / Investigate`,ex:`調光（ちょうこう）Dimming`},
  {k:`直`,on:`チョク`,kun:`ただ(ちに)`,en:`Straight / Direct`,ex:`直流（ちょくりゅう）Direct current`},
  {k:`列`,on:`レツ`,kun:`—`,en:`Row / Series`,ex:`直列（ちょくれつ）Series`},
  {k:`格`,on:`カク`,kun:`—`,en:`Standard / Rank`,ex:`定格（ていかく）Rating`},
  {k:`供`,on:`キョウ`,kun:`そな(える)`,en:`Provide / Offer`,ex:`供給（きょうきゅう）Supply`},
  {k:`給`,on:`キュウ`,kun:`た(まう)`,en:`Supply / Salary`,ex:`電力供給（でんりょくきょうきゅう）Electricity supply`},
  {k:`技`,on:`ギ`,kun:`わざ`,en:`Technique / Skill`,ex:`技術基準（ぎじゅつきじゅん）Technical standards`},
  {k:`術`,on:`ジュツ`,kun:`すべ`,en:`Art / Skill / Method`,ex:`技術（ぎじゅつ）Technology`},
  {k:`準`,on:`ジュン`,kun:`—`,en:`Standard / Level`,ex:`標準（ひょうじゅん）Standard`},
  {k:`球`,on:`キュウ`,kun:`たま`,en:`Ball / Bulb`,ex:`電球（でんきゅう）Light bulb`},
  {k:`減`,on:`ゲン`,kun:`へ(る)`,en:`Decrease / Reduce`,ex:`軽減（けいげん）Reduction`},
  {k:`係`,on:`ケイ`,kun:`かか(わる)`,en:`Relation / Coefficient`,ex:`係数（けいすう）Coefficient`},
  {k:`失`,on:`シツ`,kun:`うしな(う)`,en:`Lose`,ex:`損失（そんしつ）Loss`},
  {k:`資`,on:`シ`,kun:`—`,en:`Resource / Qualification`,ex:`資格（しかく）Qualification`},
  {k:`構`,on:`コウ`,kun:`かま(える)`,en:`Structure / Compose`,ex:`構内（こうない）Premises`},
  {k:`取`,on:`シュ`,kun:`と(る)`,en:`Take / Fetch`,ex:`取付（とりつけ）Mounting`},
  {k:`留`,on:`リュウ`,kun:`と(める)`,en:`Fasten / Stay`,ex:`留めネジ（とめネジ）Set screw`},
  {k:`非`,on:`ヒ`,kun:`—`,en:`Non- / Emergency`,ex:`非常灯（ひじょうとう）Emergency light`},
  {k:`予`,on:`ヨ`,kun:`あらかじ(め)`,en:`Advance / Spare`,ex:`予備電源（よびでんげん）Backup power`},
  {k:`件`,on:`ケン`,kun:`—`,en:`Case / Condition`,ex:`要件（ようけん）Requirement`},
  {k:`並`,on:`ヘイ`,kun:`なら(べる)`,en:`Line up / Parallel`,ex:`並列（へいれつ）Parallel`},
  {k:`比`,on:`ヒ`,kun:`くら(べる)`,en:`Ratio / Compare`,ex:`圧比（あつひ）Pressure ratio`},
  {k:`助`,on:`ジョ`,kun:`たす(ける)`,en:`Help / Assistant`,ex:`補助（ほじょ）Auxiliary`},
  {k:`識`,on:`シキ`,kun:`し(る)`,en:`Discriminate / Know`,ex:`識別（しきべつ）Identification`},
  {k:`打`,on:`ダ`,kun:`う(つ)`,en:`Strike / Hit`,ex:`打ち込み（うちこみ）Embedding`},
  {k:`連`,on:`レン`,kun:`つら(なる)`,en:`Lead / Connect`,ex:`連動（れんどう）Interlocking`},
  {k:`警`,on:`ケイ`,kun:`—`,en:`Warn / Police`,ex:`警報器（けいほうき）Alarm`},
  {k:`報`,on:`ホウ`,kun:`しら(せる)`,en:`Report / Info`,ex:`火災報知機（かさいほうちき）Fire alarm`},
  {k:`端`,on:`タン`,kun:`はし`,en:`Edge / Terminal`,ex:`端子（たんし）Terminal`},
  {k:`照`,on:`ショウ`,kun:`て(らす)`,en:`Illuminate / Check`,ex:`照度（しょうど）Illuminance`},
  {k:`器`,on:`キ`,kun:`うつわ`,en:`Device / Vessel`,ex:`遮断器（しゃだんき）Circuit breaker`},
  {k:`異`,on:`イ`,kun:`こと(なる)`,en:`Different / Abnormal`,ex:`異常（いじょう）Abnormality`},
  {k:`埋`,on:`マイ`,kun:`う(める)`,en:`Bury`,ex:`埋込形（うめこみがた）Flush-mounted`},
  {k:`則`,on:`ソク`,kun:`のっと(る)`,en:`Rule / Law`,ex:`規則（きそく）Rule`},
  {k:`装`,on:`ソウ`,kun:`よそお(う)`,en:`Equipment / Wear`,ex:`外装（がいそう）Sheath / Jacket`},
  {k:`可`,on:`カ`,kun:`—`,en:`Possible / Allow`,ex:`可とう電線管（かとうでんせんかん）Flexible conduit`},
  {k:`燃`,on:`ネン`,kun:`も(える)`,en:`Burn`,ex:`燃焼（ねんしょう）Combustion`},
  {k:`触`,on:`ショク`,kun:`ふ(れる)`,en:`Touch`,ex:`接触（せっしょく）Contact`},
  {k:`測`,on:`ソク`,kun:`はか(る)`,en:`Measure`,ex:`測定（そくてい）Measurement`},
  {k:`扇`,on:`セン`,kun:`おうぎ`,en:`Fan`,ex:`換気扇（かんきせん）Ventilation fan`},
  {k:`幹`,on:`カン`,kun:`みき`,en:`Main / Trunk`,ex:`幹線（かんせん）Main line`},
  {k:`板`,on:`バン`,kun:`いた`,en:`Board / Plate`,ex:`配電板（はいでんばん）Switchboard`},
  {k:`張`,on:`チョウ`,kun:`は(る)`,en:`Tension / Stretch`,ex:`引張荷重（ひっぱりかじゅう）Tensile load`},
  {k:`径`,on:`ケイ`,kun:`—`,en:`Diameter`,ex:`直径（ちょっけい）Diameter`},
  {k:`検`,on:`ケン`,kun:`しら(べる)`,en:`Inspect / Detect`,ex:`検電器（けんでんき）Voltage detector`},
  {k:`圧`,on:`アツ`,kun:`お(す)`,en:`Pressure / Voltage`,ex:`電圧（でんあつ）Voltage`},
  {k:`硬`,on:`コウ`,kun:`かた(い)`,en:`Hard`,ex:`硬質塩化ビニル管（こうしつえんかビニルかん）Rigid PVC conduit`},
  {k:`脂`,on:`シ`,kun:`あぶら`,en:`Resin / Fat`,ex:`合成樹脂（ごうせいじゅし）Synthetic resin`},
  {k:`銅`,on:`ドウ`,kun:`あかがね`,en:`Copper`,ex:`軟銅線（なんどうせん）Annealed copper wire`},
  {k:`導`,on:`ドウ`,kun:`みちび(く)`,en:`Lead / Conduct`,ex:`導体（どうたい）Conductor`},
  {k:`効`,on:`コウ`,kun:`き(く)`,en:`Effect / Efficient`,ex:`有効電力（ゆうこうでんりょく）Active power`},
  {k:`周`,on:`シュウ`,kun:`まわ(り)`,en:`Cycle / Around`,ex:`周波数（しゅうはすう）Frequency`},
  {k:`勢`,on:`セイ`,kun:`いきお(い)`,en:`Force / Energy`,ex:`小勢力回路（しょうせいりょくかいろ）Small power circuit`},
  {k:`被`,on:`ヒ`,kun:`こうむ(る)`,en:`Coat / Covered`,ex:`被覆（ひふく）Insulation / Covering`},
  {k:`棒`,on:`ボウ`,kun:`—`,en:`Rod / Stick`,ex:`接地棒（せっちぼう）Grounding rod`},
  {k:`柱`,on:`チュウ`,kun:`はしら`,en:`Pillar / Pole`,ex:`電柱（でんちゅう）Utility pole`},
  {k:`基`,on:`キ`,kun:`もと`,en:`Base / Standard`,ex:`基準（きじゅん）Standard`},
  {k:`損`,on:`ソン`,kun:`そこ(なう)`,en:`Loss / Damage`,ex:`鉄損（てつそん）Iron loss`},
  {k:`軟`,on:`ナン`,kun:`やわ(らかい)`,en:`Soft / Annealed`,ex:`軟銅線（なんどうせん）Annealed copper wire`},
  {k:`爆`,on:`バク`,kun:`—`,en:`Explosion`,ex:`爆発（ばくはつ）Explosion`},
  {k:`皮`,on:`ヒ`,kun:`かわ`,en:`Skin / Sheath`,ex:`皮剥き（かわむき）Stripping insulation`},
  {k:`層`,on:`ソウ`,kun:`—`,en:`Layer`,ex:`絶縁層（ぜつえんそう）Insulation layer`},
  {k:`均`,on:`キン`,kun:`—`,en:`Uniform / Average`,ex:`平均（へいきん）Average`},
  {k:`補`,on:`ホ`,kun:`おぎな(う)`,en:`Supplement / Assist`,ex:`補助（ほじょ）Auxiliary`},
  {k:`床`,on:`ショウ`,kun:`ゆか`,en:`Floor`,ex:`床下（ゆかした）Underfloor`},
  {k:`滅`,on:`メツ`,kun:`ほろ(びる)`,en:`Extinguish / Off`,ex:`点滅器（てんめつき）Switch`},
  {k:`属`,on:`ゾク`,kun:`—`,en:`Belong / Metal`,ex:`金属（きんぞく）Metal`},
  {k:`鋼`,on:`コウ`,kun:`はがね`,en:`Steel`,ex:`鋼管（こうかん）Steel pipe`},
  {k:`磁`,on:`ジ`,kun:`—`,en:`Magnetic`,ex:`磁石（じしゃく）Magnet`},
  {k:`架`,on:`カ`,kun:`か(ける)`,en:`Rack / Overhead`,ex:`架空配線（かくうはいせん）Overhead wiring`},
  {k:`遮`,on:`シャ`,kun:`さえぎ(る)`,en:`Block / Interrupt`,ex:`遮断器（しゃだんき）Circuit breaker`},
  {k:`素`,on:`ソ`,kun:`—`,en:`Element / Raw`,ex:`炭素（たんそ）Carbon`},
  {k:`護`,on:`ゴ`,kun:`まも(る)`,en:`Protect`,ex:`防護（ぼうご）Protection`},
  {k:`漏`,on:`ロウ`,kun:`も(れる)`,en:`Leak`,ex:`漏電（ろうでん）Electric leakage`},
  {k:`蛍`,on:`ケイ`,kun:`ほたる`,en:`Fluorescent`,ex:`蛍光灯（けいこうとう）Fluorescent lamp`},
  {k:`微`,on:`ビ`,kun:`—`,en:`Micro / Minute`,ex:`微弱（びじゃく）Faint / Weak`},
  {k:`称`,on:`ショウ`,kun:`とな(える)`,en:`Name / Nominal`,ex:`公称電圧（こうしょうでんあつ）Nominal voltage`},
  {k:`樹`,on:`ジュ`,kun:`き`,en:`Resin / Tree`,ex:`合成樹脂（ごうせいじゅし）Synthetic resin`},
  {k:`抵`,on:`テイ`,kun:`—`,en:`Resist`,ex:`抵抗（ていこう）Resistance`},
  {k:`抗`,on:`コウ`,kun:`—`,en:`Resist / Anti-`,ex:`抵抗（ていこう）Resistance`},
  {k:`縁`,on:`エン`,kun:`ふち`,en:`Edge / Insulation`,ex:`絶縁（ぜつえん）Insulation`},
  {k:`誘`,on:`ユウ`,kun:`さそ(う)`,en:`Induce`,ex:`誘導雷（ゆうどうらい）Induced lightning`},
  {k:`己`,on:`コ`,kun:`おのれ`,en:`Self`,ex:`自己融着テープ（じこゆうちゃくテープ）Self-amalgamating tape`},
  {k:`融`,on:`ユウ`,kun:`と(ける)`,en:`Melt / Fusion`,ex:`自己融着テープ（じこゆうちゃくテープ）Self-amalgamating tape`},
  {k:`縮`,on:`シュク`,kun:`ちぢ(む)`,en:`Shrink`,ex:`熱収縮チューブ（ねつしゅうしゅくチューブ）Heat-shrink tube`},
  {k:`需`,on:`ジュ`,kun:`—`,en:`Demand`,ex:`需用家（じゅようか）Consumer`},
  {k:`率`,on:`リツ`,kun:`—`,en:`Rate / Factor`,ex:`効率（こうりつ）Efficiency`},
  {k:`盤`,on:`バン`,kun:`—`,en:`Board / Panel`,ex:`配電盤（はいでんばん）Switchboard`},
  {k:`覆`,on:`フク`,kun:`おお(う)`,en:`Cover / Coat`,ex:`被覆（ひふく）Covering`},
  {k:`耐`,on:`タイ`,kun:`た(える)`,en:`Endure / Resistant`,ex:`耐圧（たいあつ）Withstanding voltage`},
  {k:`士`,on:`シ`,kun:`—`,en:`Specialist / Man`,ex:`電気工事士（でんきこうじし）Electrician`},
  {k:`隠`,on:`イン`,kun:`かく(す)`,en:`Conceal / Hidden`,ex:`隠ぺい配線（いんぺいはいせん）Concealed wiring`},
  {k:`露`,on:`ロ`,kun:`つゆ`,en:`Exposed / Dew`,ex:`露出配線（ろしゅつはいせん）Exposed wiring`},
  {k:`岐`,on:`キ`,kun:`—`,en:`Branch / Fork`,ex:`分岐回路（ぶんきかいろ）Branch circuit`},
  {k:`条`,on:`ジョウ`,kun:`—`,en:`Clause / Line`,ex:`12条（じゅうにじょう）Article 12`},
  {k:`標`,on:`ヒョウ`,kun:`しるし`,en:`Mark / Standard`,ex:`標識（ひょうしき）Sign / Mark`},
  {k:`視`,on:`シ`,kun:`み(る)`,en:`Visual / Sight`,ex:`目視点検（もくしてんけん）Visual inspection`},
  {k:`挿`,on:`ソウ`,kun:`さ(す)`,en:`Insert`,ex:`挿入（そうにゅう）Insertion`},
  {k:`災`,on:`サイ`,kun:`わざわい`,en:`Disaster`,ex:`防災設備（ぼうさいせつび）Disaster prevention equipment`},
  {k:`温`,on:`オン`,kun:`あたた(かい)`,en:`Warm / Temperature`,ex:`周囲温度（しゅういおんど）Ambient temperature`},
  {k:`源`,on:`ゲン`,kun:`みなもと`,en:`Source / Origin`,ex:`電源（でんげん）Power source`},
  {k:`囲`,on:`イ`,kun:`かこ(む)`,en:`Surround / Enclose`,ex:`周囲温度（しゅういおんど）Ambient temperature`},
  {k:`橋`,on:`キョウ`,kun:`はし`,en:`Bridge / Crosslink`,ex:`架橋ポリエチレン絶縁（かきょうポリエチレンぜつえん）XLPE insulation`},
  {k:`順`,on:`ジュン`,kun:`—`,en:`Order / Sequence`,ex:`相順（そうじゅん）Phase sequence / rotation`},
  {k:`軸`,on:`ジク`,kun:`—`,en:`Axis / Shaft`,ex:`軸受け（じくうけ）Bearing`},
  {k:`製`,on:`セイ`,kun:`—`,en:`Manufactured / Made of`,ex:`合成樹脂製（ごうせいじゅしせい）Synthetic resin type`},
  {k:`品`,on:`ヒン`,kun:`しな`,en:`Article / Goods`,ex:`電気用品（でんきようひん）Electrical appliance`},
  {k:`湯`,on:`トウ`,kun:`ゆ`,en:`Hot water`,ex:`給湯器（きゅうとうき）Water heater`},
  {k:`施`,on:`シ`,kun:`ほどこ(す)`,en:`Apply / Execute / Install`,ex:`施工（せこう）Construction work`},
  {k:`危`,on:`キ`,kun:`あぶ(ない)`,en:`Dangerous / Hazardous`,ex:`危険物（きけんぶつ）Hazardous material`},
  {k:`険`,on:`ケン`,kun:`—`,en:`Steep / Dangerous`,ex:`危険（きけん）Danger / Hazard`},
  {k:`害`,on:`ガイ`,kun:`—`,en:`Harm / Damage`,ex:`障害物（しょうがいぶつ）Obstacle`},
  {k:`義`,on:`ギ`,kun:`—`,en:`Duty / Justice / Meaning`,ex:`義務（ぎむ）Obligation`},
  {k:`務`,on:`ム`,kun:`つと(める)`,en:`Duty / Serve / Work`,ex:`義務（ぎむ）Obligation`},
  {k:`規`,on:`キ`,kun:`—`,en:`Rule / Standard / Regulation`,ex:`規制（きせい）Regulation`},
  {k:`省`,on:`ショウ`,kun:`はぶ(く)`,en:`Ministry / Save / Omit`,ex:`省令（しょうれい）Ministerial ordinance`},
  {k:`令`,on:`レイ`,kun:`—`,en:`Order / Ordinance / Command`,ex:`省令（しょうれい）Ministerial ordinance`},
  {k:`産`,on:`サン`,kun:`う(む)`,en:`Produce / Industry / Birth`,ex:`産業（さんぎょう）Industry`},
  {k:`経`,on:`ケイ`,kun:`へ(る)`,en:`Pass / Manage / Economy`,ex:`経済産業省（けいざいさんぎょうしょう）Ministry of Economy`},
  {k:`済`,on:`サイ`,kun:`す(む)`,en:`Finish / Settle / Economy`,ex:`経済（けいざい）Economy`},
  {k:`販`,on:`ハン`,kun:`—`,en:`Sell / Distribute`,ex:`販売（はんばい）Sale / Distribution`},
  {k:`売`,on:`バイ`,kun:`う(る)`,en:`Sell`,ex:`販売（はんばい）Sale`},
  {k:`輸`,on:`ユ`,kun:`—`,en:`Transport / Import / Export`,ex:`輸入（ゆにゅう）Import`},
  {k:`区`,on:`ク`,kun:`—`,en:`Ward / Section / Classify`,ex:`区分（くぶん）Classification / Category`},
  {k:`正`,on:`セイ`,kun:`ただ(しい)`,en:`Correct / Proper / Right`,ex:`正弦波（せいげんは）Sine wave`},
  {k:`政`,on:`セイ`,kun:`まつりごと`,en:`Government / Politics`,ex:`政令（せいれい）Cabinet order`},
  {k:`民`,on:`ミン`,kun:`たみ`,en:`People / Civil / Private`,ex:`民間事業者（みんかんじぎょうしゃ）Private enterprise`},
  {k:`的`,on:`テキ`,kun:`まと`,en:`Target / -ive / Of`,ex:`目的（もくてき）Purpose / Goal`},
  {k:`場`,on:`ジョウ`,kun:`ば`,en:`Place / Location / Scene`,ex:`特殊場所（とくしゅばしょ）Special location`},
  {k:`所`,on:`ショ`,kun:`ところ`,en:`Place / Location`,ex:`変電所（へんでんしょ）Substation`},
  {k:`石`,on:`セキ`,kun:`いし`,en:`Stone / Rock`,ex:`石油（せきゆ）Petroleum / Oil`},
  {k:`貯`,on:`チョ`,kun:`た(める)`,en:`Store / Accumulate / Save`,ex:`貯蔵（ちょぞう）Storage`},
  {k:`修`,on:`シュウ`,kun:`おさ(める)`,en:`Repair / Study / Master`,ex:`修理（しゅうり）Repair`},
  {k:`塗`,on:`ト`,kun:`ぬ(る)`,en:`Paint / Coat / Apply`,ex:`塗装（とそう）Coating / Painting`},
  {k:`吹`,on:`スイ`,kun:`ふ(く)`,en:`Blow / Spray`,ex:`吹き付け塗装（ふきつけとそう）Spray coating`},
  {k:`住`,on:`ジュウ`,kun:`す(む)`,en:`Reside / Live / Dwell`,ex:`住宅（じゅうたく）Residential building`},
  {k:`宅`,on:`タク`,kun:`—`,en:`Home / Residence`,ex:`住宅（じゅうたく）Residence`},
  {k:`室`,on:`シツ`,kun:`—`,en:`Room / Chamber`,ex:`和室（わしつ）Japanese-style room`},
  {k:`壁`,on:`ヘキ`,kun:`かべ`,en:`Wall`,ex:`壁の内部配管（かべのないぶはいかん）In-wall conduit`},
  {k:`洗`,on:`セン`,kun:`あら(う)`,en:`Wash / Clean`,ex:`洗面所（せんめんじょ）Washroom / Sink area`},
  {k:`台`,on:`ダイ`,kun:`—`,en:`Stand / Counter / Platform`,ex:`台所（だいどころ）Kitchen`},
  {k:`車`,on:`シャ`,kun:`くるま`,en:`Vehicle / Car / Wheel`,ex:`車庫（しゃこ）Garage`},
  {k:`庫`,on:`コ`,kun:`—`,en:`Warehouse / Storage / Garage`,ex:`車庫（しゃこ）Garage`},
  {k:`和`,on:`ワ`,kun:`やわ(らぐ)`,en:`Harmony / Japanese-style`,ex:`和室（わしつ）Japanese-style room`},
  {k:`洋`,on:`ヨウ`,kun:`—`,en:`Western / Ocean`,ex:`洋室（ようしつ）Western-style room`},
  {k:`居`,on:`キョ`,kun:`い(る)`,en:`Reside / Be present / Stay`,ex:`居間（いま）Living room`},
  {k:`玄`,on:`ゲン`,kun:`—`,en:`Mysterious / Dark / Entrance`,ex:`玄関（げんかん）Entrance / Foyer`},
  {k:`関`,on:`カン`,kun:`せき`,en:`Gate / Connection / Involve`,ex:`玄関（げんかん）Entrance / Foyer`},
  {k:`庭`,on:`テイ`,kun:`にわ`,en:`Garden / Yard`,ex:`庭園灯（ていえんとう）Garden light`},
  {k:`寝`,on:`シン`,kun:`ね(る)`,en:`Sleep / Lie down`,ex:`寝室（しんしつ）Bedroom`},
  {k:`便`,on:`ベン`,kun:`たよ(り)`,en:`Convenient / Toilet / News`,ex:`便所（べんじょ）Restroom / Toilet`},
  {k:`道`,on:`ドウ`,kun:`みち`,en:`Road / Path / Way`,ex:`公道（こうどう）Public road`},
  {k:`丸`,on:`ガン`,kun:`まる`,en:`Round / Circle`,ex:`丸形ケーブル（まるがたケーブル）Round-type cable`},
  {k:`主`,on:`シュ`,kun:`ぬし`,en:`Main / Host / Owner`,ex:`施主（せしゅ）Building owner / Client`},
  {k:`乾`,on:`カン`,kun:`かわ(く)`,en:`Dry`,ex:`乾式変圧器（かんしきへんあつき）Dry-type transformer`},
  {k:`互`,on:`ゴ`,kun:`たが(い)`,en:`Mutual / Reciprocal`,ex:`相互式インターホン（そうごしきインターホン）Interphone system`},
  {k:`井`,on:`セイ`,kun:`い`,en:`Well / Ceiling`,ex:`天井（てんじょう）Ceiling`},
  {k:`亜`,on:`ア`,kun:`—`,en:`Sub- / Zinc (亜鉛)`,ex:`亜鉛めっき鉄線（あえんめっきてっせん）Galvanized iron wire`},
  {k:`人`,on:`ジン`,kun:`ひと`,en:`Person / Human`,ex:`現場代理人（げんばだいりにん）Site representative`},
  {k:`仕`,on:`シ`,kun:`つか(える)`,en:`Serve / Work`,ex:`仕様書（しようしょ）Specification document`},
  {k:`代`,on:`ダイ`,kun:`か(わる)`,en:`Replace / Generation / Fee`,ex:`現場代理人（げんばだいりにん）Field representative`},
  {k:`任`,on:`ニン`,kun:`まか(せる)`,en:`Responsibility / Trust`,ex:`責任分界点（せきにんぶんかいてん）Demarcation point`},
  {k:`使`,on:`シ`,kun:`つか(う)`,en:`Use / Employ`,ex:`最大使用電流（さいだいしようでんりゅう）Maximum usable current`},
  {k:`倍`,on:`バイ`,kun:`—`,en:`Double / Times / Multiple`,ex:`倍率器（ばいりつき）Multiplier / Voltage divider`},
  {k:`共`,on:`キョウ`,kun:`とも`,en:`Together / Public / Shared`,ex:`公共事業（こうきょうじぎょう）Public utility work`},
  {k:`反`,on:`ハン`,kun:`そ(る)`,en:`Oppose / Reflect / Anti-`,ex:`反射笠（はんしゃがさ）Reflector shade`},
  {k:`号`,on:`ゴウ`,kun:`—`,en:`Number / Type No. / Signal`,ex:`2号ボックスコネクタ（にごうボックスコネクタ）No.2 box connector`},
  {k:`呼`,on:`コ`,kun:`よ(ぶ)`,en:`Call / Nominal / Summon`,ex:`呼び線挿入器（よびせんそうにゅうき）Fish tape / Wire guide`},
  {k:`営`,on:`エイ`,kun:`いとな(む)`,en:`Manage / Build / Operate`,ex:`造営材（ぞうえいざい）Building structural material`},
  {k:`型`,on:`ケイ`,kun:`かた`,en:`Type / Model / Mold`,ex:`型枠（かたわく）Formwork / Mold frame`},
  {k:`増`,on:`ゾウ`,kun:`ふ(える)`,en:`Increase / Amplify`,ex:`増幅器（ぞうふくき）Amplifier`},
  {k:`多`,on:`タ`,kun:`おお(い)`,en:`Many / Much / Multi-`,ex:`湿気の多い場所（しっけのおおいばしょ）Damp location`},
  {k:`密`,on:`ミツ`,kun:`—`,en:`Dense / Close / Secret`,ex:`磁束密度（じそくみつど）Magnetic flux density`},
  {k:`射`,on:`シャ`,kun:`い(る)`,en:`Shoot / Emit / Reflect`,ex:`反射（はんしゃ）Reflection`},
  {k:`幅`,on:`フク`,kun:`はば`,en:`Width / Range / Amplitude`,ex:`増幅（ぞうふく）Amplification`},
  {k:`式`,on:`シキ`,kun:`—`,en:`Type / Formula / System`,ex:`三相3線式（さんそうさんせんしき）3-phase 3-wire system`},
  {k:`弦`,on:`ゲン`,kun:`つる`,en:`String / Chord / Sine`,ex:`正弦波（せいげんは）Sine wave`},
  {k:`従`,on:`ジュウ`,kun:`したが(う)`,en:`Follow / Comply / From`,ex:`電気工事従事者（でんきこうじじゅうじしゃ）Electrical construction worker`},
  {k:`抜`,on:`バツ`,kun:`ぬ(く)`,en:`Pull out / Extract / Remove`,ex:`抜け止め形コンセント（ぬけどめがたコンセント）Locking outlet`},
  {k:`掛`,on:`カ`,kun:`か(ける)`,en:`Hang / Hook / Apply`,ex:`引掛けシーリング（ひっかけシーリング）Locking ceiling outlet`},
  {k:`措`,on:`ソ`,kun:`—`,en:`Manage / Measure / Step`,ex:`接触防護措置（せっしょくぼうごそち）Contact protection measures`},
  {k:`撃`,on:`ゲキ`,kun:`う(つ)`,en:`Strike / Attack / Impact`,ex:`耐衝撃性（たいしょうげきせい）Impact resistance`},
  {k:`整`,on:`セイ`,kun:`ととの(える)`,en:`Arrange / Rectify / Adjust`,ex:`整流器（せいりゅうき）Rectifier`},
  {k:`斉`,on:`セイ`,kun:`—`,en:`Even / Uniform / Simultaneous`,ex:`一斉鳴動（いっせいめいどう）Simultaneous alarm activation`},
  {k:`斫`,on:`シャク`,kun:`は(つる)`,en:`Chisel / Hack / Cut concrete`,ex:`斫り工事（はつりこうじ）Concrete cutting/chiseling work`},
  {k:`易`,on:`イ`,kun:`やさ(しい)`,en:`Easy / Simple`,ex:`簡易電気工事（かんいでんきこうじ）Simple/minor electrical work`},
  {k:`書`,on:`ショ`,kun:`か(く)`,en:`Write / Document`,ex:`仕様書（しようしょ）Specification document`},
  {k:`枠`,on:`—`,kun:`わく`,en:`Frame / Border / Mount`,ex:`連用取付枠（れんようとりつけわく）Multi-gang mounting frame`},
  {k:`根`,on:`コン`,kun:`ね`,en:`Root / Base / Origin`,ex:`羽根ぎり（はねぎり）Spade drill bit`},
  {k:`械`,on:`カイ`,kun:`—`,en:`Machine / Mechanism`,ex:`機械的強度（きかいてききょうど）Mechanical strength`},
  {k:`様`,on:`ヨウ`,kun:`さま`,en:`Style / Manner / Specification`,ex:`仕様書（しようしょ）Specification document`},
  {k:`止`,on:`シ`,kun:`と(まる)`,en:`Stop / Fix / Prevent`,ex:`抜け止め形コンセント（ぬけどめがたコンセント）Locking outlet`},
  {k:`殊`,on:`シュ`,kun:`こと`,en:`Special / Particular`,ex:`特殊電気工事（とくしゅでんきこうじ）Special electrical work`},
  {k:`殺`,on:`サツ`,kun:`ころ(す)`,en:`Kill / Sterilize`,ex:`殺菌灯（さっきんとう）Germicidal lamp`},
  {k:`液`,on:`エキ`,kun:`—`,en:`Liquid / Fluid`,ex:`液面制御（えきめんせいぎょ）Liquid level control`},
  {k:`湿`,on:`シツ`,kun:`しめ(る)`,en:`Damp / Humid / Wet`,ex:`湿気の多い場所（しっけのおおいばしょ）Damp/humid location`},
  {k:`燥`,on:`ソウ`,kun:`—`,en:`Dry out / Arid`,ex:`乾燥した場所（かんそうしたばしょ）Dry/arid location`},
  {k:`片`,on:`ヘン`,kun:`かた`,en:`One-sided / Fragment / Piece`,ex:`可動鉄片形計器（かどうてっぺんがたけいき）Moving-iron instrument`},
  {k:`現`,on:`ゲン`,kun:`あらわ(れる)`,en:`Present / Appear / Current`,ex:`現場（げんば）Construction site / Field`},
  {k:`画`,on:`カク`,kun:`かく`,en:`Partition / Plan / Section`,ex:`防火区画（ぼうかくかく）Fire-resistant compartment`},
  {k:`瞬`,on:`シュン`,kun:`またた(く)`,en:`Instant / Blink / Momentary`,ex:`瞬時値（しゅんじち）Instantaneous value`},
  {k:`破`,on:`ハ`,kun:`やぶ(る)`,en:`Break / Rupture / Dash`,ex:`破線（はせん）Dashed line on wiring diagram`},
  {k:`程`,on:`テイ`,kun:`ほど`,en:`Degree / Extent / Code`,ex:`内線規程（ないせんきてい）Interior wiring code`},
  {k:`竣`,on:`シュン`,kun:`—`,en:`Complete / Finish (construction)`,ex:`竣工検査（しゅんこうけんさ）Completion inspection`},
  {k:`笠`,on:`リュウ`,kun:`かさ`,en:`Hat / Shade / Reflector cap`,ex:`反射笠照明（はんしゃがさしょうめい）Reflector shade lighting`},
  {k:`第`,on:`ダイ`,kun:`—`,en:`Ordinal / No. / Grade`,ex:`第3種接地工事（だいさんしゅせっちこうじ）Class-3 grounding work`},
  {k:`算`,on:`サン`,kun:`かぞ(える)`,en:`Calculate / Count / Estimate`,ex:`積算（せきさん）Cost estimation / Quantity survey`},
  {k:`簡`,on:`カン`,kun:`—`,en:`Simple / Brief / Easy`,ex:`簡易接触防護措置（かんいせっしょくぼうごそち）Simple contact protection`},
  {k:`粘`,on:`ネン`,kun:`ねば(る)`,en:`Sticky / Adhesive / Viscous`,ex:`粘着テープ（ねんちゃくテープ）Adhesive tape`},
  {k:`羽`,on:`ウ`,kun:`はね`,en:`Wing / Feather / Fan blade`,ex:`換気扇の羽根（かんきせんのはね）Ventilation fan blade`},
  {k:`菌`,on:`キン`,kun:`—`,en:`Germ / Bacteria / Fungus`,ex:`殺菌灯（さっきんとう）Germicidal UV lamp`},
  {k:`蓄`,on:`チク`,kun:`たくわ(える)`,en:`Store / Accumulate / Stock`,ex:`蓄電池（ちくでんち）Storage battery`},
  {k:`衝`,on:`ショウ`,kun:`つ(く)`,en:`Collide / Impact / Shock`,ex:`耐衝撃性（たいしょうげきせい）Impact resistance`},
  {k:`衡`,on:`コウ`,kun:`—`,en:`Balance / Equilibrium`,ex:`平衡（へいこう）Balance / Equilibrium`},
  {k:`責`,on:`セキ`,kun:`せ(める)`,en:`Responsibility / Blame`,ex:`責任分界点（せきにんぶんかいてん）Demarcation point of responsibility`},
  {k:`費`,on:`ヒ`,kun:`つい(やす)`,en:`Expense / Consume / Cost`,ex:`消費電力（しょうひでんりょく）Power consumption`},
  {k:`赤`,on:`セキ`,kun:`あか`,en:`Red`,ex:`赤色表示灯（あかいろひょうじとう）Red indicator lamp`},
  {k:`足`,on:`ソク`,kun:`あし`,en:`Foot / Leg / Sufficient / Scaffold`,ex:`足場（あしば）Scaffolding`},
  {k:`輝`,on:`キ`,kun:`かがや(く)`,en:`Shine / Brilliance / Luminance`,ex:`高輝度放電灯（こうきどほうでんとう）High-intensity discharge lamp`},
  {k:`込`,on:`—`,kun:`こ(む)`,en:`Embed / Fill in / Into`,ex:`埋込形（うめこみがた）Flush-mounted / Recessed type`},
  {k:`避`,on:`ヒ`,kun:`さ(ける)`,en:`Avoid / Deflect / Protect from`,ex:`避雷器（ひらいき）Lightning arrester`},
  {k:`針`,on:`シン`,kun:`はり`,en:`Needle / Pin / Rod / Pointer`,ex:`避雷針（ひらいしん）Lightning rod`},
  {k:`鉄`,on:`テツ`,kun:`—`,en:`Iron / Steel`,ex:`亜鉛めっき鉄線（あえんめっきてっせん）Galvanized iron wire`},
  {k:`鉛`,on:`エン`,kun:`なまり`,en:`Lead (Pb) / Zinc compound`,ex:`亜鉛（あえん）Zinc / 鉛管（なまりかん）Lead pipe`},
  {k:`雨`,on:`ウ`,kun:`あめ`,en:`Rain`,ex:`防雨形コンセント（ぼううがたコンセント）Rainproof outlet`},
  {k:`零`,on:`レイ`,kun:`—`,en:`Zero`,ex:`零相変流器（れいそうへんりゅうき）Zero-phase current transformer`},
  {k:`雷`,on:`ライ`,kun:`かみなり`,en:`Thunder / Lightning`,ex:`避雷器（ひらいき）Lightning arrester`},
  {k:`鳴`,on:`メイ`,kun:`な(く)`,en:`Sound / Ring / Alarm`,ex:`一斉鳴動（いっせいめいどう）Simultaneous alarm activation`}
  ];

  const DK_KATA = [
  {k:`アース`,on:`earth / grounding`,kun:`カタカナ`,en:`earth / grounding`,ex:`Zero-potential reference connection to ground`},
  {k:`アーステスタ`,on:`earth resistance meter`,kun:`カタカナ`,en:`earth resistance meter`,ex:`Measures resistance of grounding electrode`},
  {k:`アウトレットボックス`,on:`outlet box`,kun:`カタカナ`,en:`outlet box`,ex:`Metal box for wiring connections in walls/ceilings`},
  {k:`インサート`,on:`insert (ceiling anchor)`,kun:`カタカナ`,en:`insert (ceiling anchor)`,ex:`Embedded anchor in concrete slab for hanging fixtures`},
  {k:`インサートキャップ`,on:`insert cap`,kun:`カタカナ`,en:`insert cap`,ex:`Protective cap for concrete ceiling inserts`},
  {k:`インシュロック`,on:`cable tie / zip tie`,kun:`カタカナ`,en:`cable tie / zip tie`,ex:`Nylon strap for bundling and securing cables`},
  {k:`インダクタンス`,on:`inductance`,kun:`カタカナ`,en:`inductance`,ex:`Property of conductor opposing change in current (unit: H)`},
  {k:`インバータ`,on:`inverter`,kun:`カタカナ`,en:`inverter`,ex:`Converts DC to AC or changes frequency; used in air conditioners`},
  {k:`インピーダンス`,on:`impedance`,kun:`カタカナ`,en:`impedance`,ex:`Total AC opposition (Z = R + jX, unit: Ω)`},
  {k:`ウエザーキャップ`,on:`weather cap`,kun:`カタカナ`,en:`weather cap`,ex:`Weatherproof cap for overhead service entrance conduit`},
  {k:`ウォータポンププライヤ`,on:`water pump pliers`,kun:`カタカナ`,en:`water pump pliers`,ex:`Adjustable slip-joint pliers for gripping pipes and fittings`},
  {k:`エルボ`,on:`elbow (conduit fitting)`,kun:`カタカナ`,en:`elbow (conduit fitting)`,ex:`90° or 45° bend fitting for conduit runs`},
  {k:`エンドカバー`,on:`end cover`,kun:`カタカナ`,en:`end cover`,ex:`Closing cap for cable tray or duct ends`},
  {k:`エントランスキャップ`,on:`entrance cap`,kun:`カタカナ`,en:`entrance cap`,ex:`Service entrance cap at top of outdoor service conduit`},
  {k:`カールプラグ`,on:`curl plug / wall anchor`,kun:`カタカナ`,en:`curl plug / wall anchor`,ex:`Plastic expansion anchor for screws in masonry`},
  {k:`カットアウト`,on:`cut-out switch`,kun:`カタカナ`,en:`cut-out switch`,ex:`Open fuse holder used in distribution lines`},
  {k:`カップリング`,on:`coupling`,kun:`カタカナ`,en:`coupling`,ex:`Conduit fitting that joins two conduit sections end-to-end`},
  {k:`キセノンランプ`,on:`xenon lamp`,kun:`カタカナ`,en:`xenon lamp`,ex:`High-intensity discharge lamp using xenon gas`},
  {k:`キャノピスイッチ`,on:`canopy switch`,kun:`カタカナ`,en:`canopy switch`,ex:`Switch built into the ceiling fixture canopy base`},
  {k:`キャプタイヤケーブル`,on:`tough-rubber sheath cable`,kun:`カタカナ`,en:`tough-rubber sheath cable`,ex:`Portable flexible cable with rubber sheath for equipment`},
  {k:`クランプメータ`,on:`clamp meter`,kun:`カタカナ`,en:`clamp meter`,ex:`Current meter that clamps around conductor without cutting`},
  {k:`グロースイッチ`,on:`glow switch / starter`,kun:`カタカナ`,en:`glow switch / starter`,ex:`Glow-discharge starter used in fluorescent lamp circuits`},
  {k:`ケーブル`,on:`cable`,kun:`カタカナ`,en:`cable`,ex:`Insulated conductors with protective sheath (e.g. VVF, CV)`},
  {k:`ケーブルカッタ`,on:`cable cutter`,kun:`カタカナ`,en:`cable cutter`,ex:`Ratchet or hydraulic tool for cutting large cables cleanly`},
  {k:`ケーブルラック`,on:`cable rack / cable tray`,kun:`カタカナ`,en:`cable rack / cable tray`,ex:`Open metal tray supporting multiple cables overhead`},
  {k:`コイル`,on:`coil`,kun:`カタカナ`,en:`coil`,ex:`Wound conductor creating inductance or electromagnetic field`},
  {k:`コード`,on:`cord`,kun:`カタカナ`,en:`cord`,ex:`Flexible insulated conductors for portable equipment`},
  {k:`コードサポート`,on:`cord support`,kun:`カタカナ`,en:`cord support`,ex:`Device that supports and guides flexible cords`},
  {k:`コードレスドリル`,on:`cordless drill`,kun:`カタカナ`,en:`cordless drill`,ex:`Battery-powered drill for boring holes in walls/ceilings`},
  {k:`コンクリートトラス`,on:`concrete cable trough`,kun:`カタカナ`,en:`concrete cable trough`,ex:`Precast concrete cable duct laid underground`},
  {k:`コンクリートボックス`,on:`concrete box`,kun:`カタカナ`,en:`concrete box`,ex:`Junction box embedded in concrete during construction`},
  {k:`コンセント`,on:`receptacle / outlet`,kun:`カタカナ`,en:`receptacle / outlet`,ex:`Wall socket for plugging in electrical equipment`},
  {k:`コンデンサ`,on:`capacitor / condenser`,kun:`カタカナ`,en:`capacitor / condenser`,ex:`Stores electric charge; used for power factor correction`},
  {k:`コンビネーションカップリング`,on:`combination coupling`,kun:`カタカナ`,en:`combination coupling`,ex:`Fitting connecting rigid metal conduit to flexible conduit`},
  {k:`サーマルリレー`,on:`thermal relay`,kun:`カタカナ`,en:`thermal relay`,ex:`Overload protection device that trips on sustained overcurrent`},
  {k:`サーモスタット`,on:`thermostat`,kun:`カタカナ`,en:`thermostat`,ex:`Temperature-controlled switch for heating/cooling systems`},
  {k:`サドル`,on:`saddle (pipe clamp)`,kun:`カタカナ`,en:`saddle (pipe clamp)`,ex:`U-shaped clamp securing conduit/pipe to a surface`},
  {k:`シース`,on:`sheath / cable jacket`,kun:`カタカナ`,en:`sheath / cable jacket`,ex:`Outer protective covering of a cable`},
  {k:`シーリング`,on:`ceiling fitting / outlet`,kun:`カタカナ`,en:`ceiling fitting / outlet`,ex:`Ceiling-mounted wiring outlet for luminaires`},
  {k:`シーリングフィッチング`,on:`ceiling fitting (weatherproof)`,kun:`カタカナ`,en:`ceiling fitting (weatherproof)`,ex:`Weatherproof conduit fitting at ceiling entry point`},
  {k:`ジャンクションボックス`,on:`junction box`,kun:`カタカナ`,en:`junction box`,ex:`Box for splicing and protecting conductor connections`},
  {k:`シャンデリア`,on:`chandelier`,kun:`カタカナ`,en:`chandelier`,ex:`Decorative multi-light pendant fixture hanging from ceiling`},
  {k:`ジョイントボックス`,on:`joint box / junction box`,kun:`カタカナ`,en:`joint box / junction box`,ex:`Box enclosing wire splices in VVF cable wiring`},
  {k:`ショウウインドー`,on:`show window / display window`,kun:`カタカナ`,en:`show window / display window`,ex:`Illuminated retail display window requiring special wiring`},
  {k:`ショウケース`,on:`showcase / display case`,kun:`カタカナ`,en:`showcase / display case`,ex:`Illuminated glass display case in retail settings`},
  {k:`スイッチボックス`,on:`switch box`,kun:`カタカナ`,en:`switch box`,ex:`Metal or plastic box for mounting wall switches`},
  {k:`ステップル`,on:`staple (wiring staple)`,kun:`カタカナ`,en:`staple (wiring staple)`,ex:`U-shaped metal staple for securing cables to wood`},
  {k:`スポットネットワーク`,on:`spot network`,kun:`カタカナ`,en:`spot network`,ex:`High-reliability power distribution network for dense areas`},
  {k:`セルラダクト`,on:`cellular metal floor duct`,kun:`カタカナ`,en:`cellular metal floor duct`,ex:`Steel floor deck with enclosed cells for underfloor wiring`},
  {k:`ソレノイド`,on:`solenoid`,kun:`カタカナ`,en:`solenoid`,ex:`Electromagnetic coil producing linear motion; used in relays`},
  {k:`ターミナルキャップ`,on:`terminal cap`,kun:`カタカナ`,en:`terminal cap`,ex:`Insulating cap placed over exposed conductor ends`},
  {k:`ダイス`,on:`die (threading tool)`,kun:`カタカナ`,en:`die (threading tool)`,ex:`Tool for cutting external threads on conduit or pipe`},
  {k:`タイムスイッチ`,on:`time switch`,kun:`カタカナ`,en:`time switch`,ex:`Automatic switch that operates at preset times`},
  {k:`ダクタクリップ`,on:`duct clip`,kun:`カタカナ`,en:`duct clip`,ex:`Clip for securing and spacing cables in cable ducts`},
  {k:`ダクトカップリング`,on:`duct coupling`,kun:`カタカナ`,en:`duct coupling`,ex:`Fitting joining two sections of cable duct`},
  {k:`ダクトサポート`,on:`duct support`,kun:`カタカナ`,en:`duct support`,ex:`Bracket or hanger supporting cable duct from structure`},
  {k:`タップ`,on:`tap (threading tool)`,kun:`カタカナ`,en:`tap (threading tool)`,ex:`Tool for cutting internal threads in metal`},
  {k:`チャイム`,on:`chime / doorbell`,kun:`カタカナ`,en:`chime / doorbell`,ex:`Audio signaling device at building entrances`},
  {k:`チューブサポート`,on:`tube support`,kun:`カタカナ`,en:`tube support`,ex:`Support bracket for tubing or conduit runs`},
  {k:`ディスクグラインダ`,on:`disc grinder / angle grinder`,kun:`カタカナ`,en:`disc grinder / angle grinder`,ex:`Power tool for cutting or grinding metal conduit`},
  {k:`トーチランプ`,on:`torch lamp / blowtorch`,kun:`カタカナ`,en:`torch lamp / blowtorch`,ex:`Propane torch for heating conduit or soldering`},
  {k:`トラフ`,on:`cable trough`,kun:`カタカナ`,en:`cable trough`,ex:`Open channel (plastic/concrete) for underground cable routing`},
  {k:`ノーマルベンド`,on:`normal bend (conduit)`,kun:`カタカナ`,en:`normal bend (conduit)`,ex:`Standard 90° conduit elbow fitting`},
  {k:`ノックアウトパンチャ`,on:`knockout puncher`,kun:`カタカナ`,en:`knockout puncher`,ex:`Tool for punching clean holes in electrical enclosures`},
  {k:`パイプカッタ`,on:`pipe cutter`,kun:`カタカナ`,en:`pipe cutter`,ex:`Rotary tool for cutting conduit or pipe cleanly`},
  {k:`パイプバイス`,on:`pipe vise`,kun:`カタカナ`,en:`pipe vise`,ex:`Vise that grips round pipe or conduit for threading`},
  {k:`パイプベンダ`,on:`pipe bender`,kun:`カタカナ`,en:`pipe bender`,ex:`Tool for bending EMT or rigid conduit to desired angles`},
  {k:`パイプレンチ`,on:`pipe wrench`,kun:`カタカナ`,en:`pipe wrench`,ex:`Adjustable wrench with serrated jaw for gripping pipe`},
  {k:`バイメタル`,on:`bimetal strip`,kun:`カタカナ`,en:`bimetal strip`,ex:`Two-metal strip that bends with temperature; used in thermal relays`},
  {k:`パイロットランプ`,on:`pilot lamp / indicator light`,kun:`カタカナ`,en:`pilot lamp / indicator light`,ex:`Small lamp indicating on/off status of a circuit`},
  {k:`パワーコンディショナ`,on:`power conditioner (PCS)`,kun:`カタカナ`,en:`power conditioner (PCS)`,ex:`Converts DC from solar panels to grid-compatible AC`},
  {k:`ヒューズ`,on:`fuse`,kun:`カタカナ`,en:`fuse`,ex:`Overcurrent protection that melts and breaks the circuit`},
  {k:`フィクスチュアスタッド`,on:`fixture stud`,kun:`カタカナ`,en:`fixture stud`,ex:`Threaded rod on outlet box for mounting fixtures`},
  {k:`フィラメント`,on:`filament`,kun:`カタカナ`,en:`filament`,ex:`Thin tungsten wire that glows in incandescent lamps`},
  {k:`ブザー`,on:`buzzer`,kun:`カタカナ`,en:`buzzer`,ex:`Electromagnetic sound device for alarms and signals`},
  {k:`プリカナイフ`,on:`prica knife`,kun:`カタカナ`,en:`prica knife`,ex:`Knife for cutting flexible (prica-type) conduit`},
  {k:`プルスイッチ`,on:`pull switch`,kun:`カタカナ`,en:`pull switch`,ex:`Ceiling-mounted switch operated by pulling a cord`},
  {k:`プルボックス`,on:`pull box`,kun:`カタカナ`,en:`pull box`,ex:`Large box used to pull cables through conduit runs`},
  {k:`プレート`,on:`switch / outlet cover plate`,kun:`カタカナ`,en:`switch / outlet cover plate`,ex:`Decorative cover plate over switch or outlet mounting`},
  {k:`フロアダクト`,on:`floor duct`,kun:`カタカナ`,en:`floor duct`,ex:`Metal duct system embedded in floor for underfloor wiring`},
  {k:`ベクトル`,on:`vector`,kun:`カタカナ`,en:`vector`,ex:`Quantity with magnitude and direction; used in AC circuit analysis`},
  {k:`ペンダント`,on:`pendant light`,kun:`カタカナ`,en:`pendant light`,ex:`Luminaire suspended from ceiling by cord, chain, or rod`},
  {k:`ペンダントスイッチ`,on:`pendant switch`,kun:`カタカナ`,en:`pendant switch`,ex:`Switch on a hanging cord for controlling overhead lights`},
  {k:`ホイートストンブリッジ`,on:`Wheatstone bridge`,kun:`カタカナ`,en:`Wheatstone bridge`,ex:`Precision circuit for measuring unknown resistance values`},
  {k:`ボックスコネクタ`,on:`box connector`,kun:`カタカナ`,en:`box connector`,ex:`Fitting for securing conduit to an electrical box`},
  {k:`ホルソ`,on:`hole saw`,kun:`カタカナ`,en:`hole saw`,ex:`Circular saw for cutting large holes in boxes or panels`},
  {k:`ボルトクリッパ`,on:`bolt clipper`,kun:`カタカナ`,en:`bolt clipper`,ex:`Large cutting pliers for bolts, padlocks, or wire rope`},
  {k:`メタルモールジング`,on:`metal moulding / type-1 raceway`,kun:`カタカナ`,en:`metal moulding / type-1 raceway`,ex:`Surface-mounted metal wiring duct (一種金属線ぴ)`},
  {k:`モータブレーカ`,on:`motor breaker / manual motor starter`,kun:`カタカナ`,en:`motor breaker / manual motor starter`,ex:`Overload and short-circuit protection for motors`},
  {k:`ユニオンカップリング`,on:`union coupling`,kun:`カタカナ`,en:`union coupling`,ex:`Three-piece coupling for conduit where rotation is needed`},
  {k:`ユニバーサル`,on:`universal (conduit body)`,kun:`カタカナ`,en:`universal (conduit body)`,ex:`Conduit body allowing 90° turns in any direction`},
  {k:`ライティングダクト`,on:`lighting duct / track lighting`,kun:`カタカナ`,en:`lighting duct / track lighting`,ex:`Surface-mounted track allowing repositionable luminaire connections`},
  {k:`ラス`,on:`lath (metal mesh)`,kun:`カタカナ`,en:`lath (metal mesh)`,ex:`Metal mesh base for plaster or mortar in walls`},
  {k:`リアクタンス`,on:`reactance`,kun:`カタカナ`,en:`reactance`,ex:`Frequency-dependent AC opposition; inductive (XL) or capacitive (XC)`},
  {k:`リーマ`,on:`reamer`,kun:`カタカナ`,en:`reamer`,ex:`Tool for deburring the cut end of conduit`},
  {k:`リモコンスイッチ`,on:`remote control switch`,kun:`カタカナ`,en:`remote control switch`,ex:`Low-voltage switch controlling remote relay for lighting`},
  {k:`リモコンセレクタスイッチ`,on:`remote control selector switch`,kun:`カタカナ`,en:`remote control selector switch`,ex:`Multi-position remote switch for selecting lighting groups`},
  {k:`リモコントランス`,on:`remote control transformer`,kun:`カタカナ`,en:`remote control transformer`,ex:`Step-down transformer for remote control (24V) lighting systems`},
  {k:`リモコンリレー`,on:`remote control relay`,kun:`カタカナ`,en:`remote control relay`,ex:`Latching relay switched by remote control system (stays on/off)`},
  {k:`リングスリーブ`,on:`ring sleeve (crimp connector)`,kun:`カタカナ`,en:`ring sleeve (crimp connector)`,ex:`Crimp connector for joining conductors (size: small ○, small, medium)`},
  {k:`リングレジューサ`,on:`ring reducer`,kun:`カタカナ`,en:`ring reducer`,ex:`Concentric reducer ring for fitting smaller conduit into larger KO`},
  {k:`ルームエアコン`,on:`room air conditioner`,kun:`カタカナ`,en:`room air conditioner`,ex:`Split-type room cooling/heating; requires dedicated 200V circuit`},
  {k:`ルーメン`,on:`lumen (lm)`,kun:`カタカナ`,en:`lumen (lm)`,ex:`Unit of luminous flux — total light output of a source`},
  {k:`ルクス`,on:`lux (lx)`,kun:`カタカナ`,en:`lux (lx)`,ex:`Unit of illuminance — lumens per square meter (lm/m²)`},
  {k:`ロックナット`,on:`lock nut`,kun:`カタカナ`,en:`lock nut`,ex:`Threaded nut that secures conduit fittings to an electrical box`},
  {k:`ワイヤストリッパ`,on:`wire stripper`,kun:`カタカナ`,en:`wire stripper`,ex:`Tool for removing insulation from conductors without nicking wire`}
  ];

  const DK_TERMS = [
  {k:`電気事業法`,on:`でんきじぎょうほう`,kun:`Laws`,en:`Electricity Business Act`,ex:`Governs electric utility businesses and their obligations`},
  {k:`電気工事士法`,on:`でんきこうじしほう`,kun:`Laws`,en:`Electricians Law`,ex:`Defines qualifications and duties of electricians`},
  {k:`電気工事業法`,on:`でんきこうじぎょうほう`,kun:`Laws`,en:`Electrical Construction Business Law`,ex:`Regulates electrical construction businesses`},
  {k:`電気設備技術基準`,on:`でんきせつびぎじゅつきじゅん`,kun:`Laws`,en:`Electrical Equipment Technical Standards`,ex:`Technical standards for electrical installations`},
  {k:`電気用品安全法`,on:`でんきようひんあんぜんほう`,kun:`Laws`,en:`Electrical Appliance Safety Law`,ex:`Requires PSE marking on electrical appliances`},
  {k:`一般用電気工作物`,on:`いっぱんようでんきこうさくぶつ`,kun:`Laws`,en:`General-use electrical works`,ex:`Low-voltage installations e.g. homes; requires 2nd-class electrician`},
  {k:`小出力発電設備`,on:`しょうしゅつりょくはつでんせつび`,kun:`Laws`,en:`Small-output power generation equipment`,ex:`Solar/wind/etc. under threshold kW within general electrical works`},
  {k:`太陽電池発電設備`,on:`たいようでんちはつでんせつび`,kun:`Laws`,en:`Photovoltaic power generation equipment`,ex:`Solar panel system classified as small-output generation`},
  {k:`風力発電設備`,on:`ふうりょくはつでんせつび`,kun:`Laws`,en:`Wind power generation equipment`,ex:`Wind turbine system classified as small-output generation`},
  {k:`水力発電設備`,on:`すいりょくはつでんせつび`,kun:`Laws`,en:`Hydroelectric power generation equipment`,ex:`Micro-hydro system classified as small-output generation`},
  {k:`内燃力発電設備`,on:`ないねんりょくはつでんせつび`,kun:`Laws`,en:`Internal-combustion power generation`,ex:`Diesel/gas engine generator set`},
  {k:`燃料電池発電設備`,on:`ねんりょうでんちはつでんせつび`,kun:`Laws`,en:`Fuel cell power generation equipment`,ex:`Hydrogen fuel cell system for stationary generation`},
  {k:`事業用電気工作物`,on:`じぎょうようでんきこうさくぶつ`,kun:`Laws`,en:`Utility electrical works`,ex:`Electrical works for electric utility companies; not covered by 2nd-class`},
  {k:`自家用電気工作物`,on:`じかようでんきこうさくぶつ`,kun:`Laws`,en:`Non-utility (self-use) electrical works`,ex:`Facilities >600V for own use (factories, hospitals); need Class-1`},
  {k:`特定電気用品`,on:`とくていでんきようひん`,kun:`Laws`,en:`Specified electrical appliances`,ex:`High-risk items requiring 第三者certification; marked with ⑫PSE`},
  {k:`天井隠ぺい配線`,on:`てんじょういんぺいはいせん`,kun:`Wiring`,en:`Ceiling concealed wiring`,ex:`Wiring hidden above ceiling boards; common in residential wiring`},
  {k:`床隠ぺい配線`,on:`ゆかいんぺいはいせん`,kun:`Wiring`,en:`Floor concealed wiring`,ex:`Wiring hidden beneath floor boards or in underfloor space`},
  {k:`地中埋設配線`,on:`ちちゅうまいせつはいせん`,kun:`Wiring`,en:`Buried underground wiring`,ex:`Cables buried directly in the ground; requires protective conduit`},
  {k:`受電点`,on:`じゅでんてん`,kun:`Wiring`,en:`Service/receiving point`,ex:`Point where power is received from the utility supply`},
  {k:`絶縁被覆`,on:`ぜつえんひふく`,kun:`Wiring`,en:`Insulation coating`,ex:`Layer of insulating material covering the conductor`},
  {k:`心線`,on:`しんせん`,kun:`Wiring`,en:`Core wire / conductor strand`,ex:`The inner current-carrying metal conductor inside a cable`},
  {k:`屋外配線`,on:`おくがいはいせん`,kun:`Wiring`,en:`Outdoor wiring`,ex:`Wiring installed outside a building; requires weatherproof materials`},
  {k:`屋内電路`,on:`おくないでんろ`,kun:`Wiring`,en:`Indoor wiring circuit`,ex:`Electrical circuit installed within a building`},
  {k:`接地端子`,on:`せっちたんし`,kun:`Devices`,en:`Earthing terminal (outlet)`,ex:`Outlet terminal connected to earth ground for safety`},
  {k:`防雨形コンセント`,on:`ぼううがたこんせんと`,kun:`Devices`,en:`Rainproof outlet`,ex:`Weather-resistant outlet for outdoor or damp-location use`},
  {k:`防雨形スイッチ`,on:`ぼううがたスイッチ`,kun:`Devices`,en:`Rainproof switch`,ex:`Weather-resistant switch for outdoor or damp-location use`},
  {k:`常時点灯`,on:`じょうじてんとう`,kun:`Devices`,en:`Constant lighting (pilot lamp)`,ex:`Pilot lamp that stays ON regardless of switch position`},
  {k:`同時点灯`,on:`どうじてんとう`,kun:`Devices`,en:`Simultaneous lighting`,ex:`Pilot lamp that lights simultaneously when load is ON`},
  {k:`異時点灯`,on:`いじてんとう`,kun:`Devices`,en:`Alternate lighting`,ex:`Pilot lamp that lights when load is OFF (position indicator)`},
  {k:`自動点滅器`,on:`じどうてんめつき`,kun:`Devices`,en:`Automatic sensor switch`,ex:`Photocell switch that turns lighting on/off at dusk/dawn`},
  {k:`表示灯`,on:`ひょうじとう`,kun:`Devices`,en:`Indicator lamp`,ex:`Lamp indicating the status (on/off) of a circuit or device`},
  {k:`確認表示灯内蔵スイッチ`,on:`かくにんひょうじとうないぞうスイッチ`,kun:`Devices`,en:`Switch with built-in confirmation lamp`,ex:`Switch with pilot lamp that lights when the load is ON`},
  {k:`位置表示灯内蔵スイッチ`,on:`いちひょうじとうないぞうスイッチ`,kun:`Devices`,en:`Switch with built-in position lamp`,ex:`Switch with pilot lamp lit when switch is OFF (shows location in dark)`},
  {k:`調光器`,on:`ちょうこうき`,kun:`Devices`,en:`Dimmer switch`,ex:`Adjusts light output by varying voltage to the lamp`},
  {k:`電力量計`,on:`でんりょくりょうけい`,kun:`Devices`,en:`Watt-hour meter`,ex:`Integrating meter measuring consumed electric energy (kWh)`},
  {k:`電熱器`,on:`でんねつき`,kun:`Devices`,en:`Electric heater`,ex:`Appliance converting electrical energy to heat (resistive heating)`},
  {k:`電磁開閉器`,on:`でんじかいへいき`,kun:`Devices`,en:`Electromagnetic switch (motor starter)`,ex:`Contactor + thermal overload relay for motor start/stop control`},
  {k:`電磁開閉器用押しボタンスイッチ`,on:`でんじかいへいきようおしボタンスイッチ`,kun:`Devices`,en:`Push-button for electromagnetic switch`,ex:`Momentary push-button for start/stop of electromagnetic switch`},
  {k:`箱開閉器`,on:`はこかいへいき`,kun:`Devices`,en:`Safety enclosed switch`,ex:`Enclosed (box-type) knife switch for isolation of a circuit`},
  {k:`単極スイッチ`,on:`たんきょくスイッチ`,kun:`Devices`,en:`Single-pole switch`,ex:`Basic on/off switch interrupting one conductor`},
  {k:`金属管工事`,on:`きんぞくかんこうじ`,kun:`Conduit`,en:`Metal conduit wiring work`,ex:`Wiring method using steel conduit (EMT/RMC); suitable for all locations`},
  {k:`金属ダクト工事`,on:`きんぞくダクトこうじ`,kun:`Conduit`,en:`Metal duct wiring work`,ex:`Wiring in sheet-metal trunking/duct; for large-scale installations`},
  {k:`がいし引き工事`,on:`がいしびきこうじ`,kun:`Conduit`,en:`Insulator wiring work`,ex:`Open wiring on insulators; oldest method, rarely used today`},
  {k:`二種金属製可とう電線管工事`,on:`にしゅきんぞくせいかとうでんせんかんこうじ`,kun:`Conduit`,en:`Class-2 flexible metal conduit work`,ex:`Flexible metal conduit (Sealtite/Liquatight); for motor connections`},
  {k:`絶縁ブッシング`,on:`ぜつえんブッシング`,kun:`Conduit`,en:`Insulating bushing`,ex:`Plastic bushing protecting wire insulation at conduit ends`},
  {k:`高速切断機`,on:`こうそくせつだんき`,kun:`Conduit`,en:`High-speed cutting machine (chop saw)`,ex:`Abrasive or carbide disc saw for cutting steel conduit quickly`},
  {k:`金切りのこ`,on:`かなぎりのこ`,kun:`Conduit`,en:`Hacksaw / metal handsaw`,ex:`Hand-operated saw for cutting metal conduit and pipe`},
  {k:`ねじ切り器`,on:`ねじきりき`,kun:`Conduit`,en:`Pipe threading machine`,ex:`Power or ratchet tool that cuts NPT/PF threads on conduit`},
  {k:`振動ドリル`,on:`しんどうドリル`,kun:`Conduit`,en:`Hammer drill / vibrating drill`,ex:`Drill with hammering action for boring into concrete or masonry`},
  {k:`油圧式パイプベンダ`,on:`ゆあつしきパイプベンダ`,kun:`Conduit`,en:`Hydraulic pipe bender`,ex:`Hydraulic tool for bending large-diameter rigid conduit accurately`},
  {k:`合成樹脂管工事`,on:`ごうせいじゅしかんこうじ`,kun:`Conduit`,en:`Synthetic resin conduit work`,ex:`Wiring in PVC or PE conduit; lightweight, corrosion-resistant`},
  {k:`合成樹脂製可とう電線管`,on:`ごうせいじゅしせいかとうでんせんかん`,kun:`Conduit`,en:`Synthetic resin flexible conduit`,ex:`Corrugated flexible plastic conduit (PF/CD pipe)`},
  {k:`ケーブル工事`,on:`ケーブルこうじ`,kun:`Cabling`,en:`Cable wiring work`,ex:`Most common wiring method using VVF cable in residential buildings`},
  {k:`差込み接続器`,on:`さしこみせつぞくき`,kun:`Cabling`,en:`Push-in connector / Wago connector`,ex:`Spring-clamp connector for quick wire splicing without tools`},
  {k:`電気はんだごて`,on:`でんきはんだごて`,kun:`Cabling`,en:`Electric soldering iron`,ex:`Electrically heated tool for soldering wire connections`},
  {k:`手動油圧式圧着器`,on:`しゅどうゆあつしきあっちゃくき`,kun:`Cabling`,en:`Manual hydraulic crimper`,ex:`Hydraulic hand tool for crimping large compression terminals`},
  {k:`手動油圧式圧縮機`,on:`しゅどうゆあつしきあっしゅくき`,kun:`Cabling`,en:`Manual hydraulic compressor/press`,ex:`Hydraulic press for compressing large cable lug terminals`},
  {k:`油圧式ケーブルカッタ`,on:`ゆあつしきケーブルカッタ`,kun:`Cabling`,en:`Hydraulic cable cutter`,ex:`Hydraulic tool for cleanly cutting large-diameter cables`},
  {k:`線ぴ工事`,on:`せんぴこうじ`,kun:`Wiring`,en:`Raceway wiring work`,ex:`Wiring in metal surface-mounted raceways (一種・二種金属線ぴ)`},
  {k:`二種金属製可とう電線管`,on:`にしゅきんぞくせいかとうでんせんかん`,kun:`Conduit`,en:`Class-2 flexible metal conduit`,ex:`Sealtight flexible conduit for vibrating equipment like motors`},
  {k:`過電流遮断器`,on:`かでんりゅうしゃだんき`,kun:`Design`,en:`Overcurrent circuit breaker`,ex:`Device interrupting circuit on overcurrent — MCCB or fuse`},
  {k:`分岐回路`,on:`ぶんきかいろ`,kun:`Design`,en:`Branch circuit`,ex:`Circuit branching from distribution board to outlets/loads`},
  {k:`単線`,on:`たんせん`,kun:`Design`,en:`Solid (single-strand) wire`,ex:`Single solid conductor; e.g. 1.6mm or 2.0mm VVF wire`},
  {k:`絶縁抵抗`,on:`ぜつえんていこう`,kun:`Grounding`,en:`Insulation resistance`,ex:`Resistance between conductor and earth; must be ≥0.1MΩ (100V) or ≥0.2MΩ (200V)`},
  {k:`二重絶縁構造`,on:`にじゅうぜつえんこうぞう`,kun:`Grounding`,en:`Double insulation structure`,ex:`Two independent insulation layers; no earth connection required`},
  {k:`電圧計`,on:`でんあつけい`,kun:`Instruments`,en:`Voltmeter`,ex:`Measures voltage; connected in parallel with the circuit`},
  {k:`電流計`,on:`でんりゅうけい`,kun:`Instruments`,en:`Ammeter`,ex:`Measures current; connected in series with the circuit`},
  {k:`可動コイル形`,on:`かどうコイルがた`,kun:`Instruments`,en:`Moving-coil type instrument`,ex:`DC-only meter using a coil rotating in a permanent magnetic field`},
  {k:`可動鉄片形`,on:`かどうてっぺんがた`,kun:`Instruments`,en:`Moving-iron type instrument`,ex:`AC/DC meter using magnetic repulsion of iron vanes`},
  {k:`整流形計器`,on:`せいりゅうがたけいき`,kun:`Instruments`,en:`Rectifier-type instrument`,ex:`AC meter that rectifies to DC internally; reads RMS value`},
  {k:`三相誘導電動機`,on:`さんそうゆうどうでんどうき`,kun:`Motors`,en:`Three-phase induction motor`,ex:`Most common industrial motor; stator creates rotating magnetic field`},
  {k:`かご形誘導電動機`,on:`かごがたゆうどうでんどうき`,kun:`Motors`,en:`Squirrel-cage induction motor`,ex:`Rotor consists of conductive bars short-circuited at both ends`},
  {k:`スターデルタ始動法`,on:`スターデルタしどうほう`,kun:`Motors`,en:`Star-delta starting method`,ex:`Reduces starting current by starting in Y then switching to Δ`},
  {k:`力率`,on:`りきりつ`,kun:`Motors`,en:`Power factor`,ex:`cos φ — ratio of active to apparent power; improved by capacitors`},
  {k:`単線図`,on:`たんせんず`,kun:`Diagrams`,en:`Single-line diagram`,ex:`Simplified wiring diagram using one line per circuit`},
  {k:`単相２線式`,on:`たんそう２せんしき`,kun:`Diagrams`,en:`Single-phase 2-wire system`,ex:`100V system with one live + one neutral; simplest residential circuit`},
  {k:`単相３線式`,on:`たんそう３せんしき`,kun:`Diagrams`,en:`Single-phase 3-wire system`,ex:`100/200V system with two live + one neutral; standard in Japan homes`},
  {k:`抵抗率`,on:`ていこうりつ`,kun:`Theory`,en:`Resistivity`,ex:`Material property ρ (Ω·m); copper ≈ 1.72×10⁻⁸ Ω·m`},
  {k:`電力量`,on:`でんりょくりょう`,kun:`Theory`,en:`Electric energy (amount of electricity)`,ex:`W = P × t [Wh or kWh]; measured by watt-hour meter`},
  {k:`熱量`,on:`ねつりょう`,kun:`Theory`,en:`Heat / thermal energy (joules)`,ex:`Q = P × t = I²Rt [J]; also expressed in calories (1 cal ≈ 4.186 J)`},
  {k:`三相交流`,on:`さんそうこうりゅう`,kun:`Theory`,en:`Three-phase alternating current`,ex:`Three sinusoidal voltages 120° apart; used in industrial power systems`},
  {k:`三相３線式`,on:`さんそう３せんしき`,kun:`Theory`,en:`Three-phase 3-wire system`,ex:`200V system used for motors and large appliances in Japan`},
  {k:`誘導リアクタンス`,on:`ゆうどうリアクタンス`,kun:`Theory`,en:`Inductive reactance`,ex:`XL = 2πfL [Ω]; increases with frequency; voltage leads current by 90°`},
  {k:`容量リアクタンス`,on:`ようりょうリアクタンス`,kun:`Theory`,en:`Capacitive reactance`,ex:`XC = 1/(2πfC) [Ω]; decreases with frequency; current leads voltage by 90°`}
  ];

    const ALL_D = [
    ...DK_KANJI.map(e=>({...e,type:'k'})),
    ...DK_KATA.map(e=>({...e,type:'kana'})),
    ...DK_TERMS.map(e=>({...e,type:'t'}))
  ];

  const DK_BATCH = 10;
  const BATCH_TYPES = [
    {key:'kanji', label:'漢字', items:DK_KANJI.map(e=>({...e,type:'k'})), cls:'#e8a84c'},
    {key:'kata',  label:'カタカナ語', items:DK_KATA.map(e=>({...e,type:'kana'})), cls:'#6bbf8a'},
    {key:'terms', label:'専門用語', items:DK_TERMS.map(e=>({...e,type:'t'})), cls:'#6b9fd4'}
  ];
  function dkBatchKey(typeKey, bi, kind) { return 'nw3_dk_'+typeKey+'_'+bi+'_'+kind; }
  function dkIsDone(typeKey, bi) { return !!localStorage.getItem(dkBatchKey(typeKey,bi,'done')); }
  function dkIsUnlocked(typeKey, bi) { return !!localStorage.getItem(dkBatchKey(typeKey,bi,'unlock')); }
  function dkSetDone(typeKey, bi) { localStorage.setItem(dkBatchKey(typeKey,bi,'done'),'1'); localStorage.setItem(dkBatchKey(typeKey,bi,'unlock'),'1'); }
  function dkGetBatches(items) {
    const out=[];
    for(let i=0;i<items.length;i+=DK_BATCH) out.push(items.slice(i,i+DK_BATCH));
    return out;
  }

  // Batch state
  let dkView='select'; // 'select'|'batchmenu'|'flash'|'quiz'
  let dkCurType=BATCH_TYPES[0];
  let dkCurBatch=0;
  let dkBatchItems=[];

  let mode='flash', typeFilter='all', filterMode='all';
  let deckIdx=ALL_D.map((_,i)=>i), cardPos=0, flagged=new Set(), isFlipped=false;
  let quizDeck=[], quizPos=0, quizScore={c:0,w:0}, quizAnswered=false;

  function shufArr(a){const b=[...a];for(let i=b.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[b[i],b[j]]=[b[j],b[i]];}return b;}

  function getActive(){
    let idx=deckIdx;
    if(typeFilter==='kanji') idx=idx.filter(i=>ALL_D[i].type==='k');
    else if(typeFilter==='kata') idx=idx.filter(i=>ALL_D[i].type==='kana');
    else if(typeFilter==='terms') idx=idx.filter(i=>ALL_D[i].type==='t');
    if(filterMode==='flagged') idx=idx.filter(i=>flagged.has(i));
    return idx;
  }

  function buildQuizDeck(){
    let active=getActive();
    if(mode==='reading') active=active.filter(i=>ALL_D[i].type==='k');
    else if(mode==='example') active=active.filter(i=>ALL_D[i].type==='k');
    else if(mode==='vocab') active=active.filter(i=>ALL_D[i].type==='t'||ALL_D[i].type==='kana');
    quizDeck=shufArr(active).slice(0,10); quizPos=0; quizScore={c:0,w:0}; quizAnswered=false;
  }

  function render(){
    const sid=c.id.replace(/\W/g,'_');
    const active=getActive();
    const pct=mode==='flash'?(active.length?(cardPos+1)/active.length*100:0):(quizDeck.length?quizPos/quizDeck.length*100:0);
    const prog=mode==='flash'?`${Math.min(cardPos+1,active.length)}/${active.length}`:`${quizPos}/${quizDeck.length}`;
    let h=`<div class="dk-wrap">`;
    // タブバー非表示
    h+=`<div class="dk-ctrl">`;
    h+=`<button class="dk-btn" onclick="dkShuffle_${sid}()">${T('dkShuffle')}</button>`;
    h+=`<button class="dk-btn" onclick="dkReset_${sid}()">${T('dkReset')}</button>`;
    h+=`<div class="dk-sep"></div>`;
    [['all',T('dkAll')],['kanji',T('dkKanji')],['kata','カタカナ'],['terms',T('dkTerms')]].forEach(([t,lbl])=>{
      h+=`<button class="dk-btn ${typeFilter===t?'dk-on':''}" onclick="dkT_${sid}('${t}')">${lbl}</button>`;
    });
    h+=`<div class="dk-sep"></div>`;
    h+=`<button class="dk-btn ${filterMode==='all'?'dk-on':''}" onclick="dkF_${sid}('all')">${T('dkAllCards')}</button>`;
    h+=`<button class="dk-btn ${filterMode==='flagged'?'dk-on':''}" onclick="dkF_${sid}('flagged')">${T('dkFlagged')}</button>`;
    h+=`<div style="margin-left:auto;display:flex;align-items:center;gap:8px">`;
    h+=`<div class="dk-prog-bar"><div class="dk-prog-fill" id="dkpf_${sid}" style="width:${pct}%"></div></div>`;
    h+=`<div class="dk-prog-text">${prog}</div></div></div>`;
    h+=`<div id="dkCA_${sid}"></div></div>`;
    target.innerHTML=h;
    if(mode==='flash') renderFlash(sid); else renderQuizView(sid);
  }

  function renderFlash(sid){
    const active=getActive();
    const area=document.getElementById('dkCA_'+sid);
    if(!active.length){area.innerHTML=`<div style="text-align:center;padding:60px;color:#8a8880">${T('dkNoCards')}</div>`;return;}
    if(cardPos>=active.length)cardPos=0;
    const ri=active[cardPos]; const e=ALL_D[ri]; const isTerm=(e.type==='t'||e.type==='kana');
    const isKana=e.type==='kana';
    const fsz=isTerm?(e.k.length>12?'18px':e.k.length>7?'26px':'38px'):'110px';
    const isFl=flagged.has(ri);
    const pct2=active.length?(cardPos+1)/active.length*100:0;
    const pf=document.getElementById('dkpf_'+sid); if(pf)pf.style.width=pct2+'%';
    let h=`<div class="dk-fc-wrap" onclick="dkFlip_${sid}()" id="dkFCW_${sid}">`;
    h+=`<div class="dk-fc ${isFlipped?'dk-flip':''}" id="dkFC_${sid}">`;
    h+=`<div class="dk-face dk-front"><div class="dk-badge">${cardPos+1}/${active.length}</div>`;
    h+=`<div class="dk-kanji-big" style="font-size:${fsz};${isTerm?'line-height:1.4;text-align:center;padding:0 20px':'line-height:1'}">${e.k}</div>`;
    h+=`<div class="dk-card-hint">${T('dkTapHint')}</div></div>`;
    h+=`<div class="dk-face dk-back">`;
    h+=`<div class="dk-bksmall" style="font-size:${isTerm?'14px':'44px'}">${e.k}</div>`;
    h+=`<div style="width:100%">`;
    if(isKana){
      h+=`<div class="dk-back-row"><div class="dk-back-sec"><div class="dk-blbl">ENGLISH</div><div class="dk-bval">${e.on}</div></div><div class="dk-back-sec"><div class="dk-blbl">TYPE</div><div class="dk-bval" style="color:#8a8880">カタカナ語</div></div></div>`;
    } else if(isTerm){
      h+=`<div class="dk-back-row"><div class="dk-back-sec"><div class="dk-blbl">${T('dkReading2')}</div><div class="dk-bval">${e.on}</div></div><div class="dk-back-sec"><div class="dk-blbl">${T('dkCategory')}</div><div class="dk-bval" style="color:#8a8880">${e.kun}</div></div></div>`;
    } else {
      h+=`<div class="dk-back-row"><div class="dk-back-sec"><div class="dk-blbl">${T('dkOnYomi')}</div><div class="dk-bval">${e.on}</div></div><div class="dk-back-sec"><div class="dk-blbl">${T('dkKunYomi')}</div><div class="dk-bval">${e.kun}</div></div></div>`;
    }
    h+=`<div class="dk-blbl" style="margin-bottom:6px">${T('dkMeaning2')}</div><div class="dk-bmean">${e.en}</div>`;
    h+=`<div class="dk-bex"><div class="dk-bex-lbl">${isKana?'DESCRIPTION':isTerm?T('dkDesc'):T('dkExamEx')}</div><div>${e.ex}</div></div>`;
    h+=`</div></div></div></div>`;
    h+=`<div class="dk-acts">`;
    h+=`<button class="dk-act prev" onclick="dkPrev_${sid}()">${T('dkPrev')}</button>`;
    h+=`<button class="dk-act flag ${isFl?'dk-flagged':''}" onclick="dkFlag_${sid}()">${isFl?T('dkReviewing'):T('dkMarkReview')}</button>`;
    if(dkView==='flash' && dkBatchItems.length>0 && cardPos>=dkBatchItems.length-1){
      h+=`<button class="dk-act nxt" style="background:#6bbf8a;color:#000" onclick="dkBatchDone_${sid}()">✓ 完了！</button>`;
    } else {
      h+=`<button class="dk-act nxt" onclick="dkNext_${sid}()">${T('dkNext')}</button>`;
    }
    h+=`</div>`;
    area.innerHTML=h;
  }

  function renderQuizView(sid){
    const area=document.getElementById('dkCA_'+sid);
    if(quizPos>=quizDeck.length&&quizDeck.length>0){
      if(typeof trackPV==='function')trackPV('/quiz/denkou-'+mode+'/score','電工 '+mode+' Score');
      const t=quizScore.c+quizScore.w,p=t?Math.round(quizScore.c/t*100):0;
      const nextBi=dkCurBatch+1;const bt2=dkCurType;const hasNext=dkView==='quiz'&&bt2&&nextBi<dkGetBatches(bt2.items).length;
    area.innerHTML=`<div class="dk-scr"><div class="dk-scr-big">${p}%</div><div class="dk-scr-msg">${[T('score0'),T('score1'),T('score2'),T('score3')][p<50?0:p<75?1:p<95?2:3]} (${quizScore.c}/${t})</div><div class="dk-tiles"><div class="dk-tile g"><div class="tl">${T('scoreCo')}</div><div class="tv">${quizScore.c}</div></div><div class="dk-tile r"><div class="tl">${T('scoreWr')}</div><div class="tv">${quizScore.w}</div></div><div class="dk-tile"><div class="tl">Total</div><div class="tv">${t}</div></div></div><button class="dk-nx-btn" onclick="dkRestart_${sid}()" style="margin-right:10px">${T('dkTryAgain')}</button>${hasNext?`<button class="dk-nx-btn" onclick="dkOpenBatch_${sid}(${nextBi})" style="background:#6bbf8a;color:#000;margin-right:10px">次のセット →</button>`:''}<button class="dk-nx-btn" onclick="${sid}_bsR()" style="background:#1e2028;color:#e8e6df">← セット一覧</button></div>`;
      return;
    }
    if(!quizDeck.length){area.innerHTML=`<div style="text-align:center;padding:60px;color:#8a8880">${T('dkNoCards')}</div>`;return;}
    if(typeof trackPV==='function')trackPV('/quiz/denkou-'+mode+'/question/'+(quizPos+1),'電工 '+mode+' Q'+(quizPos+1));
    const pf=document.getElementById('dkpf_'+sid); if(pf)pf.style.width=(quizDeck.length?quizPos/quizDeck.length*100:0)+'%';
    const ri=quizDeck[quizPos]; const e=ALL_D[ri];
    let badge='',qText='',correct='',field='',qCtx='';
    if(mode==='meaning'){qText=e.k;badge=T('dkSelectMean');correct=e.en;field='en';qCtx=(e.type==='t')?T('dkCatLabel')+e.kun:(e.type==='kana'?'カタカナ語':'');}
    else if(mode==='reading'){qText=e.k;badge=T('dkSelectRead');correct=e.on;field='on';}
    else if(mode==='example'){qText=e.k;badge=T('dkSelectEx');correct=e.ex;field='ex';qCtx=T('dkHintMean')+': '+e.en;}
    else if(mode==='vocab'){qText=e.en;badge=T('dkSelectVoc');correct=e.k;field='k';}
    const eType=e.type==='kana'?'kana':e.type;
    const pool=ALL_D.map((_,i)=>i).filter(i=>i!==ri&&(ALL_D[i].type===eType||(eType==='t'&&ALL_D[i].type==='kana')||(eType==='kana'&&ALL_D[i].type==='t')));
    const wrongs=shufArr(pool).slice(0,3).map(i=>ALL_D[i][field]||'—');
    const opts=shufArr([correct,...wrongs.slice(0,3)]);
    const ci=opts.indexOf(correct);
    const qfs=(mode==='vocab'||qText.length>8)?(qText.length>30?'15px':qText.length>15?'20px':'32px'):'88px';
    const qll=(mode==='vocab'||qText.length>8)?'1.5':'1';
    // Store answer data in global map to avoid HTML-attribute escaping issues
    window['_dkQ_'+sid]={ci,correct,entry:e};
    let h=`<div class="dk-qbox"><div class="dk-qbadge">${badge}</div>`;
    h+=`<div class="dk-qkanji" style="font-size:${qfs};line-height:${qll}">${qText}</div>`;
    if(qCtx)h+=`<div class="dk-qctx">${qCtx}</div>`;
    h+=`</div><div class="dk-fb" id="dkfb_${sid}"></div><div class="dk-opts">`;
    ['A','B','C','D'].forEach((l,i)=>{
      h+=`<div class="dk-opt" onclick="dkAns_${sid}(this,${i})"><span class="dk-ollbl">${l}</span>${opts[i]}</div>`;
    });
    h+=`</div><div style="text-align:center"><button class="dk-nx-btn" id="dknx_${sid}" style="display:none" onclick="dkQN_${sid}()">${T('dkNextQ')}</button></div>`;
    area.innerHTML=h;
    quizAnswered=false;
  }

  const sid=c.id.replace(/\W/g,'_');
  window['dkM_'+sid]=(m)=>{mode=m;isFlipped=false;if(m==='flash')render();else{buildQuizDeck();render();}};
  window['dkShuffle_'+sid]=()=>{deckIdx=shufArr(deckIdx);cardPos=0;if(mode==='flash')render();else{buildQuizDeck();render();}};
  window['dkReset_'+sid]=()=>{deckIdx=ALL_D.map((_,i)=>i);cardPos=0;flagged.clear();typeFilter='all';filterMode='all';isFlipped=false;if(mode==='flash')render();else{buildQuizDeck();render();}};
  window['dkT_'+sid]=(t)=>{typeFilter=t;cardPos=0;if(mode==='flash')render();else{buildQuizDeck();render();}};
  window['dkSelType_'+sid]=(key)=>{const bt=BATCH_TYPES.find(x=>x.key===key);if(bt){dkCurType=bt;}batchSelectRender();};
  window[sid+'_bsR']=()=>batchSelectRender();
  window['dkOpenBatch_'+sid]=(bi)=>dkBatchMenuRender(bi);
  window['dkStartFlash_'+sid]=(bi)=>dkBatchFlashRender(bi);
  window['dkStartQuiz_'+sid]=(bi)=>{dkCurBatch=bi;const bt=dkCurType;const batches=dkGetBatches(bt.items);dkBatchItems=[...batches[bi]];dkBatchQuizRender(sid);};
  window['dkResetAll_'+sid]=()=>{if(!confirm('このタイプの進捗をリセットしますか？'))return;const bt=dkCurType;const batches=dkGetBatches(bt.items);batches.forEach((_,bi)=>{localStorage.removeItem(dkBatchKey(bt.key,bi,'done'));localStorage.removeItem(dkBatchKey(bt.key,bi,'unlock'));});batchSelectRender();};
  window['dkF_'+sid]=(f)=>{filterMode=f;cardPos=0;if(mode==='flash')render();else{buildQuizDeck();render();}};
  window['dkFlip_'+sid]=()=>{isFlipped=!isFlipped;const fc=document.getElementById('dkFC_'+sid);if(fc){fc.classList.toggle('dk-flip',isFlipped);}};
  window['dkNext_'+sid]=()=>{const a=getActive();isFlipped=false;cardPos=(cardPos+1)%Math.max(a.length,1);if(typeof trackPV==='function')trackPV('/flash/denkou/'+(cardPos+1),'電工 Card '+(cardPos+1));renderFlash(sid);};
  window['dkPrev_'+sid]=()=>{const a=getActive();isFlipped=false;cardPos=(cardPos-1+a.length)%Math.max(a.length,1);if(typeof trackPV==='function')trackPV('/flash/denkou/'+(cardPos+1),'電工 Card '+(cardPos+1));renderFlash(sid);};
  window['dkFlag_'+sid]=()=>{const a=getActive();if(!a.length)return;const ri=a[cardPos];if(flagged.has(ri))flagged.delete(ri);else flagged.add(ri);renderFlash(sid);};
  window['dkAns_'+sid]=(el,chosen)=>{
    if(quizAnswered)return; quizAnswered=true;
    const qdata=window['_dkQ_'+sid]||{};
    const ci=qdata.ci||0, correct=qdata.correct||'', entry=qdata.entry||{};
    const isOk=(chosen===ci);
    if(isOk)quizScore.c++;else quizScore.w++;
    document.querySelectorAll('#dkCA_'+sid+' .dk-opt').forEach((o,j)=>{
      o.classList.add('dk-dis');
      if(j===ci)o.classList.add('dk-ok');
      else if(j===chosen&&!isOk)o.classList.add('dk-ng');
    });
    const fb=document.getElementById('dkfb_'+sid);
    if(fb){fb.className='dk-fb '+(isOk?'ok':'ng');
      fb.textContent=isOk?(T('dkCorrect')+'  '+correct):(T('dkWrong')+correct+(entry.on?' ('+entry.on+')':''));}
    const nx=document.getElementById('dknx_'+sid);if(nx)nx.style.display='inline-block';
  };
  window['dkQN_'+sid]=()=>{quizPos++;renderQuizView(sid);};
  window['dkRestart_'+sid]=()=>{buildQuizDeck();render();};
  window['dkBatchDone_'+sid]=()=>{
    dkSetDone(dkCurType.key, dkCurBatch);
    dkBatchCompleteScreen(sid);
  };
  window['dkBatchQuiz_'+sid]=()=>{
    dkView='quiz';
    // バッチのアイテムをquizDeckに設定
    quizDeck=shufArr(dkBatchItems.map((_,i)=>ALL_D.indexOf(_)>=0?ALL_D.indexOf(_):i)).slice(0,dkBatchItems.length);
    // quizDeckを直接アイテムインデックスで持つ
    quizDeck=shufArr([...Array(dkBatchItems.length).keys()]);
    quizPos=0; quizScore={c:0,w:0}; quizAnswered=false;
    dkBatchQuizRender(sid);
  };

  // ─────────────────────────────────────────────
  // バッチ選択・フラッシュ・クイズ UI
  // ─────────────────────────────────────────────
  function batchSelectRender() {
    dkView='select';
    dkBatchItems=[];
    const sid=c.id.replace(/\W/g,'_');
    let h=`<div class="dk-wrap">`;
    // タイプタブ
    h+=`<div class="dk-mode-tabs">`;
    BATCH_TYPES.forEach(bt=>{
      h+=`<div class="dk-tab ${dkCurType.key===bt.key?'dk-on':''}" onclick="dkSelType_${sid}('${bt.key}')">${bt.label}</div>`;
    });
    h+=`</div>`;

    const bt=dkCurType;
    const batches=dkGetBatches(bt.items);
    const doneCount=batches.filter((_,bi)=>dkIsDone(bt.key,bi)).length;
    const pct=batches.length?Math.round(doneCount/batches.length*100):0;

    // 進捗バー
    h+=`<div style="background:#16181f;border:1px solid rgba(255,255,255,.07);border-radius:12px;padding:16px;margin-bottom:16px">`;
    h+=`<div style="display:flex;justify-content:space-between;margin-bottom:8px">`;
    h+=`<span style="font-size:13px;font-weight:700;color:#e8e6df">${bt.label} 進捗</span>`;
    h+=`<span style="font-size:12px;color:#8a8880">${doneCount}/${batches.length} セット完了</span>`;
    h+=`</div>`;
    h+=`<div style="background:#252730;border-radius:20px;height:6px;overflow:hidden">`;
    h+=`<div style="height:100%;width:${pct}%;background:${bt.cls};border-radius:20px;transition:width .4s"></div>`;
    h+=`</div>`;
    h+=`<div style="margin-top:8px;display:flex;justify-content:space-between">`;
    h+=`<span style="font-size:11px;color:#5a5856">${bt.items.length}語 / ${batches.length}セット × 10語</span>`;
    if(doneCount>0){h+=`<button onclick="dkResetAll_${sid}()" style="font-size:11px;color:#5a5856;background:none;border:none;cursor:pointer;font-family:inherit">↺ リセット</button>`;}
    h+=`</div></div>`;

    // バッチグリッド
    h+=`<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px">`;
    batches.forEach((batch,bi)=>{
      const done=dkIsDone(bt.key,bi);
      const startWord=batch[0]?batch[0].k:'';
      const endWord=batch[batch.length-1]?batch[batch.length-1].k:'';
      let cardStyle=`background:#16181f;border:1px solid rgba(255,255,255,.07);border-radius:14px;padding:14px;position:relative;overflow:hidden;cursor:pointer;`;
      if(done) cardStyle+=`border-color:${bt.cls}55;`;
      h+=`<div style="${cardStyle}" onclick="dkOpenBatch_${sid}(${bi})">`;
      if(done){h+=`<div style="position:absolute;top:8px;right:8px;background:#6bbf8a;color:#000;border-radius:20px;padding:2px 8px;font-size:10px;font-weight:700">✓ 完了</div>`;}
      else{h+=`<div style="position:absolute;top:8px;right:8px;background:#e8a84c;color:#000;border-radius:20px;padding:2px 8px;font-size:10px;font-weight:700">▶ 開始</div>`;}
      h+=`<div style="font-size:10px;color:#5a5856;margin-bottom:6px">セット ${bi+1}</div>`;
      h+=`<div style="font-size:${startWord.length>4?'18':'26'}px;font-family:'Noto Serif JP',serif;font-weight:700;color:#e8e6df;margin-bottom:3px">${startWord}</div>`;
      h+=`<div style="font-size:10px;color:#8a8880">〜 ${endWord}</div>`;
      h+=`<div style="margin-top:8px;display:flex;gap:4px;flex-wrap:wrap">`;
      h+=`<span style="font-size:9px;padding:2px 6px;border-radius:10px;${done?'background:rgba(107,191,138,.15);color:#6bbf8a':'background:#252730;color:#8a8880'}">📇${done?'✓':''}</span>`;
      h+=`<span style="font-size:9px;padding:2px 6px;border-radius:10px;${done?'background:rgba(232,168,76,.15);color:#e8a84c':'background:rgba(232,168,76,.08);color:#e8a84c'}">🎯</span>`;
      h+=`</div></div>`;
    });
    h+=`</div></div>`;
    target.innerHTML=h;
  }

  function dkBatchMenuRender(bi) {
    dkCurBatch=bi;
    const sid=c.id.replace(/\W/g,'_');
    const bt=dkCurType;
    const batches=dkGetBatches(bt.items);
    const batch=batches[bi];
    const done=dkIsDone(bt.key,bi);
    let h=`<div class="dk-wrap">`;
    h+=`<div style="display:flex;align-items:center;gap:10px;margin-bottom:20px">`;
    h+=`<button onclick="${sid}_bsR()" style="background:#252730;border:1px solid rgba(255,255,255,.07);border-radius:8px;padding:6px 12px;font-size:12px;color:#8a8880;cursor:pointer;font-family:inherit">← 一覧</button>`;
    h+=`<div style="font-size:15px;font-weight:700;color:#e8e6df">セット${bi+1} — ${bt.label}</div>`;
    h+=`</div>`;
    // 単語プレビュー
    h+=`<div style="background:#16181f;border:1px solid rgba(255,255,255,.07);border-radius:12px;padding:12px 16px;margin-bottom:20px">`;
    h+=`<div style="font-size:10px;color:#5a5856;margin-bottom:8px;letter-spacing:.1em">このセットの語</div>`;
    h+=`<div style="display:flex;flex-wrap:wrap;gap:6px">`;
    batch.forEach(item=>{h+=`<span style="background:#252730;border:1px solid rgba(255,255,255,.07);border-radius:20px;padding:3px 10px;font-size:13px;color:#e8e6df">${item.k}</span>`;});
    h+=`</div></div>`;
    // ボタン
    h+=`<div style="display:flex;flex-direction:column;gap:12px">`;
    h+=`<button onclick="dkStartFlash_${sid}(${bi})" style="display:flex;align-items:center;gap:14px;background:#16181f;border:1px solid rgba(255,255,255,.07);border-radius:14px;padding:18px 20px;cursor:pointer;font-family:inherit;text-align:left">`;
    h+=`<div style="width:48px;height:48px;border-radius:12px;background:#1e2028;display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0">📇</div>`;
    h+=`<div><div style="font-size:15px;font-weight:700;color:#e8e6df;margin-bottom:3px">フラッシュカード${done?' ✓':''}</div><div style="font-size:12px;color:#8a8880">${batch.length}枚のカードで学習</div></div></button>`;
    // クイズボタン — 常にアンロック
    h+=`<button onclick="dkStartQuiz_${sid}(${bi})" style="display:flex;align-items:center;gap:14px;background:#16181f;border:1px solid rgba(232,168,76,.4);border-radius:14px;padding:18px 20px;cursor:pointer;font-family:inherit;text-align:left">`;
    h+=`<div style="width:48px;height:48px;border-radius:12px;background:#252730;display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0">🎯</div>`;
    h+=`<div><div style="font-size:15px;font-weight:700;color:#e8a84c;margin-bottom:3px">クイズ${done?' 🔓':''}</div><div style="font-size:12px;color:#8a8880">意味・読み・用例クイズ</div></div></button>`;
    h+=`</div></div>`;
    target.innerHTML=h;
  }

  function dkBatchCompleteScreen(sid) {
    const bi=dkCurBatch;
    const bt=dkCurType;
    let h=`<div class="dk-wrap"><div style="text-align:center;padding:40px 20px">`;
    h+=`<div style="font-size:48px;margin-bottom:12px">🎉</div>`;
    h+=`<div style="font-family:'Zen Maru Gothic',sans-serif;font-size:22px;font-weight:900;color:#e8e6df;margin-bottom:8px">セット${bi+1}のカード完了！</div>`;
    h+=`<div style="font-size:14px;color:#8a8880;margin-bottom:24px;line-height:1.8">クイズがアンロックされました！<br>同じ語でクイズを試しましょう。</div>`;
    h+=`<div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap">`;
    h+=`<button onclick="dkStartQuiz_${sid}(${bi})" style="background:#e8a84c;color:#000;border:none;border-radius:12px;padding:14px 28px;font-size:15px;font-weight:700;cursor:pointer;font-family:inherit">🎯 クイズを開始</button>`;
    h+=`<button onclick="${sid}_bsR()" style="background:#252730;border:1px solid rgba(255,255,255,.07);border-radius:12px;padding:14px 24px;font-size:14px;color:#8a8880;cursor:pointer;font-family:inherit">← 戻る</button>`;
    h+=`</div></div></div>`;
    target.innerHTML=h;
  }

  function dkBatchFlashRender(bi) {
    dkView='flash';
    dkCurBatch=bi;
    const bt=dkCurType;
    const batches=dkGetBatches(bt.items);
    const batch=batches[bi];
    dkBatchItems=[...batch];
    cardPos=0; isFlipped=false;
    deckIdx=batch.map((_,i)=>i);
    // ALL_Dインデックスにマッピング
    const batchAllDIdx=batch.map(e=>ALL_D.findIndex(d=>d.k===e.k&&d.type===e.type));
    deckIdx=batchAllDIdx.filter(i=>i>=0);
    if(!deckIdx.length) deckIdx=batch.map((_,i)=>i);
    render();
  }

  function dkBatchQuizRender(sid) {
    dkView='quiz';
    const bt=dkCurType;
    const batches=dkGetBatches(bt.items);
    const batch=batches[dkCurBatch];
    // バッチのALL_Dインデックス
    const batchIdx=batch.map(e=>ALL_D.findIndex(d=>d.k===e.k&&d.type===e.type)).filter(i=>i>=0);
    quizDeck=shufArr([...batchIdx]);
    quizPos=0; quizScore={c:0,w:0}; quizAnswered=false;
    // modeを'meaning'に設定
    mode='meaning';
    render();
  }

  window[sid+'_bsR']();
}


// ── Batch Learning System ──
// 10-card flashcard → quiz unlock flow
// localStorage keys:
//   nw3_batch_done_{modKey}_{levelLabel}_{batchIdx} = '1' (flashcard completed)
//   nw3_batch_unlock_{modKey}_{levelLabel}_{batchIdx} = '1' (quiz unlocked)
function mkBatch(c, modKey, levels, frontFn, backFn, qFn, optFn, verbQF) {
  const BATCH = 10;
  const sid = c.id.replace(/\W/g,'_');
  let curLevel = levels[0];
  let view = 'select'; // 'select' | 'flash' | 'quiz'
  let curBatch = 0;

  function storeDoneKey(lvl, bi) { return 'nw3_batch_done_'+modKey+'_'+lvl.label+'_'+bi; }
  function storeUnlockKey(lvl, bi) { return 'nw3_batch_unlock_'+modKey+'_'+lvl.label+'_'+bi; }
  function isDone(lvl, bi) { return !!localStorage.getItem(storeDoneKey(lvl, bi)); }
  function isUnlocked(lvl, bi) { return !!localStorage.getItem(storeUnlockKey(lvl, bi)); }
  function setDone(lvl, bi) { localStorage.setItem(storeDoneKey(lvl, bi),'1'); }
  function setUnlocked(lvl, bi) { localStorage.setItem(storeUnlockKey(lvl, bi),'1'); }

  function getBatches(lvl) {
    const d = lvl.data;
    const out = [];
    for (let i = 0; i < d.length; i += BATCH) out.push(d.slice(i, i+BATCH));
    return out;
  }

  function resetProgress(lvl) {
    const batches = getBatches(lvl);
    batches.forEach((_, bi) => {
      localStorage.removeItem(storeDoneKey(lvl, bi));
      localStorage.removeItem(storeUnlockKey(lvl, bi));
    });
  }

  // ── SELECT SCREEN ──
  function renderSelect() {
    view = 'select';
    const lvl = curLevel;
    const batches = getBatches(lvl);
    const doneCount = batches.filter((_, bi) => isDone(lvl, bi)).length;
    const unlockedCount = batches.filter((_, bi) => isUnlocked(lvl, bi)).length;

    let h = '';
    // Level tabs
    h += `<div style="margin-bottom:16px">`;
    h += `<div class="lvl-tabs" style="flex-wrap:wrap">`;
    levels.forEach(lv => {
      const cls = lv.cls || '';
      const done = getBatches(lv).filter((_,bi)=>isDone(lv,bi)).length;
      const total = getBatches(lv).length;
      h += `<button class="lvl-b ${cls} ${curLevel.label===lv.label?'on':''}" onclick="${sid}_setLvl('${lv.label}')">${lv.label} <span style="font-size:10px;opacity:.7">${done}/${total}</span></button>`;
    });
    h += `</div></div>`;

    // Progress bar
    const pct = batches.length ? Math.round(doneCount/batches.length*100) : 0;
    h += `<div style="background:var(--s2);border-radius:12px;padding:16px;margin-bottom:16px;border:1px solid var(--brd)">`;
    h += `<div style="display:flex;justify-content:space-between;margin-bottom:8px">`;
    h += `<span style="font-size:13px;font-weight:700;color:var(--tx)">${lvl.label} 全体進捗</span>`;
    h += `<span style="font-size:12px;color:var(--txM)">${doneCount}/${batches.length} セット完了</span>`;
    h += `</div>`;
    h += `<div style="background:var(--s3);border-radius:20px;height:8px;overflow:hidden">`;
    h += `<div style="height:100%;width:${pct}%;background:var(--g5);border-radius:20px;transition:width .4s"></div>`;
    h += `</div>`;
    h += `<div style="margin-top:8px;display:flex;gap:8px;justify-content:space-between;align-items:center">`;
    h += `<span style="font-size:11px;color:var(--txD)">${lvl.data.length}語 / ${batches.length}セット × 10語</span>`;
    if (doneCount > 0) {
      h += `<button onclick="${sid}_resetAll()" style="font-size:11px;color:var(--txD);background:none;border:none;cursor:pointer;padding:0;font-family:inherit">↺ リセット</button>`;
    } else { h += `<span></span>`; }
    h += `</div></div>`;

    // Batch cards grid
    h += `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:10px">`;
    batches.forEach((batch, bi) => {
      const done = isDone(lvl, bi);
      const unlocked = isUnlocked(lvl, bi);
      const startWord = batch[0][0] || '';
      const endWord = batch[batch.length-1][0] || '';
      const batchNum = bi + 1;

      // All batches always accessible
      let cardStyle = done
        ? `background:linear-gradient(135deg,rgba(107,163,104,0.08),rgba(8,145,178,0.06));border:1px solid rgba(107,163,104,0.3);border-radius:14px;padding:14px;cursor:pointer;transition:all .2s;position:relative;overflow:hidden`
        : `background:var(--s1);border:1px solid var(--brd);border-radius:14px;padding:14px;cursor:pointer;transition:all .2s;position:relative;overflow:hidden`;

      h += `<div style="${cardStyle}" onclick="${sid}_openBatch(${bi})">`;

      // Status badge
      if (done) {
        h += `<div style="position:absolute;top:8px;right:8px;background:var(--grn);color:#fff;border-radius:20px;padding:2px 8px;font-size:10px;font-weight:700">✓ 完了</div>`;
      } else {
        h += `<div style="position:absolute;top:8px;right:8px;background:var(--acc);color:#fff;border-radius:20px;padding:2px 8px;font-size:10px;font-weight:700">▶ 開始</div>`;
      }

      h += `<div style="font-size:11px;font-weight:700;color:var(--txD);margin-bottom:6px">セット ${batchNum}</div>`;
      h += `<div style="font-size:20px;font-family:'Zen Maru Gothic',sans-serif;font-weight:900;color:var(--tx);margin-bottom:4px">${startWord}</div>`;
      h += `<div style="font-size:11px;color:var(--txM)">〜 ${endWord}</div>`;
      h += `<div style="margin-top:10px;display:flex;gap:6px;flex-wrap:wrap">`;
      // Flash badge
      h += `<div style="display:inline-flex;align-items:center;gap:3px;font-size:10px;padding:3px 8px;border-radius:20px;${done?'background:rgba(107,163,104,0.15);color:var(--grn)':'background:var(--s2);color:var(--txM)'}">📇 カード${done?'✓':''}</div>`;
      // Quiz badge — always unlocked
      h += `<div style="display:inline-flex;align-items:center;gap:3px;font-size:10px;padding:3px 8px;border-radius:20px;background:rgba(228,87,46,0.15);color:var(--acc)">🎯 クイズ</div>`;
      h += `</div>`;
      h += `</div>`;
    });
    h += `</div>`;

    const target = c.querySelector('.u-content') || c;
    target.innerHTML = h;
  }

  // ── FLASH SCREEN for a batch ──
  function renderFlash(bi) {
    view = 'flash';
    curBatch = bi;
    const lvl = curLevel;
    const batch = getBatches(lvl)[bi];
    let pos = 0;
    const order = shuf(batch.map((_,i)=>i));
    const batchNum = bi + 1;

    const render = () => {
      const item = batch[order[pos]];
      const pct = (pos+1)/order.length*100;
      const fcId = 'bfc_'+sid+'_'+bi;
      let h = '';
      h += `<div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">`;
      h += `<button onclick="${sid}_backSelect()" style="background:var(--s2);border:1px solid var(--brd);border-radius:8px;padding:6px 12px;font-size:12px;color:var(--txM);cursor:pointer;font-family:inherit">← 一覧</button>`;
      h += `<div style="flex:1;font-size:13px;font-weight:700;color:var(--txM)">セット${batchNum} フラッシュカード</div>`;
      h += `<div style="font-size:12px;color:var(--txD)">${pos+1}/${order.length}</div>`;
      h += `</div>`;
      h += `<div class="prg"><div class="prg-bar"><div class="prg-fill" style="width:${pct}%"></div></div></div>`;
      h += `<div class="fcw" id="${fcId}_w"><div class="fc" id="${fcId}"><div class="fcf fc-fr"><div class="fc-bdg">${pos+1}/${order.length}</div>${frontFn(item)}<div class="fc-hint">${T('tap')}</div></div><div class="fc-bk-wrap">${backFn(item)}<div id="exbox_${fcId}" style="margin-top:6px"></div></div></div></div>`;
      h += `<div class="fc-acts">`;
      h += `<button class="fc-b pv" onclick="${sid}_fp()">${T('prev')}</button>`;
      h += `<button class="tts" onclick="speak('${(item[0]||item.p||'').replace(/'/g,"\\'")}')">🔊</button>`;
      if (pos < order.length - 1) {
        h += `<button class="fc-b nx" style="background:var(--g1);color:#fff" onclick="${sid}_fn()">${T('next')}</button>`;
      } else {
        h += `<button class="fc-b nx" style="background:var(--g5);color:#fff" onclick="${sid}_fdone(${bi})">✓ 完了！</button>`;
      }
      h += `</div>`;
      const target = c.querySelector('.u-content') || c;
      target.innerHTML = h;
      const fw = document.getElementById(fcId+'_w');
      if (fw) fw.onclick = () => document.getElementById(fcId).classList.toggle('flip');
    }

    window[sid+'_fp'] = () => { pos = Math.max(0, pos-1); render(); };
    window[sid+'_fn'] = () => { pos++; if(pos>=order.length) pos=order.length-1; render(); };
    window[sid+'_fdone'] = (batchIdx) => {
      setDone(lvl, batchIdx);
      setUnlocked(lvl, batchIdx);
      renderBatchComplete(batchIdx);
    };
    render();
  }

  // ── BATCH COMPLETE SCREEN ──
  function renderBatchComplete(bi) {
    const lvl = curLevel;
    const batchNum = bi + 1;
    let h = '';
    h += `<div style="text-align:center;padding:40px 20px">`;
    h += `<div style="font-size:48px;margin-bottom:12px">🎉</div>`;
    h += `<div style="font-family:'Zen Maru Gothic',sans-serif;font-size:22px;font-weight:900;color:var(--tx);margin-bottom:8px">セット${batchNum}のカード完了！</div>`;
    h += `<div style="font-size:14px;color:var(--txM);margin-bottom:24px;line-height:1.8">クイズがアンロックされました！<br>同じ10語でクイズを試しましょう。</div>`;
    h += `<div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap">`;
    h += `<button onclick="${sid}_startQuiz(${bi})" style="background:var(--g1);color:#fff;border:none;border-radius:12px;padding:14px 28px;font-size:15px;font-weight:700;cursor:pointer;font-family:inherit">🎯 クイズを開始</button>`;
    h += `<button onclick="${sid}_backSelect()" style="background:var(--s2);border:1px solid var(--brd);border-radius:12px;padding:14px 24px;font-size:14px;color:var(--txM);cursor:pointer;font-family:inherit">← セット一覧に戻る</button>`;
    h += `</div>`;
    h += `</div>`;
    const target = c.querySelector('.u-content') || c;
    target.innerHTML = h;
  }

  // ── QUIZ SCREEN for a batch ──
  function renderQuiz(bi) {
    view = 'quiz';
    curBatch = bi;
    const lvl = curLevel;
    const batch = getBatches(lvl)[bi];
    const batchNum = bi + 1;
    let pos = 0;
    const order = shuf(batch.map((_,i)=>i));
    let sc = {c:0, w:0};
    // For verb: pick random form
    let vqf = null;
    if (verbQF) vqf = verbQF[0];
    // Quiz log for detailed results
    let _batchQuizLog = [];
    let _batchQStart = Date.now();

    const render = () => {
      if (pos >= order.length) {
        // Score screen
        const t = sc.c + sc.w;
        const pct = t ? Math.round(sc.c/t*100) : 0;
        const msg = pct >= 90 ? '完璧！素晴らしい！🏆' : pct >= 70 ? 'よくできました！👍' : 'もう一度頑張ろう！💪';
        const avgT = _batchQuizLog.length ? (_batchQuizLog.reduce((s,q)=>s+q.seconds,0)/_batchQuizLog.length).toFixed(1) : 0;
        let h = `<div style="text-align:center;padding:32px 20px">`;
        h += `<div style="display:flex;align-items:center;gap:10px;margin-bottom:20px;justify-content:center">`;
        h += `<button onclick="${sid}_backSelect()" style="background:var(--s2);border:1px solid var(--brd);border-radius:8px;padding:6px 12px;font-size:12px;color:var(--txM);cursor:pointer;font-family:inherit">← 一覧</button>`;
        h += `</div>`;
        h += `<div style="font-size:56px;font-family:'Zen Maru Gothic',sans-serif;font-weight:900;color:var(--acc);margin-bottom:8px">${pct}%</div>`;
        h += `<div style="font-size:16px;color:var(--txM);margin-bottom:8px">${msg}</div>`;
        h += `<div style="font-size:14px;color:var(--txD);margin-bottom:24px">正解 ${sc.c} / ${t}</div>`;
        h += `<div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap">`;
        h += `<button onclick="${sid}_startQuiz(${bi})" style="background:var(--s2);border:1px solid var(--brd);border-radius:12px;padding:12px 24px;font-size:13px;color:var(--txM);cursor:pointer;font-family:inherit">🔄 もう一度</button>`;
        // Next batch if available
        const nextBatches = getBatches(lvl);
        if (bi + 1 < nextBatches.length) {
          h += `<button onclick="${sid}_openBatch(${bi+1})" style="background:var(--g1);color:#fff;border:none;border-radius:12px;padding:12px 24px;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit">次のセット → セット${batchNum+1}</button>`;
        } else {
          h += `<button onclick="${sid}_backSelect()" style="background:var(--g5);color:#fff;border:none;border-radius:12px;padding:12px 24px;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit">🎉 全セット完了！</button>`;
        }
        h += `</div>`;
        // Detailed result section
        if (_batchQuizLog.length > 0) {
          const wrongs = _batchQuizLog.filter(q=>!q.isCorrect);
          h += `<div style="margin-top:16px;background:var(--s1);border:1px solid var(--brd);border-radius:14px;padding:16px;text-align:left">`;
          h += `<div style="font-size:14px;font-weight:700;margin-bottom:8px">📊 ${({ja:'詳細結果',en:'Detailed Results',bn:'বিস্তারিত ফলাফল'}[_lang]||'詳細結果')}</div>`;
          h += `<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-bottom:8px">`;
          h += `<div style="text-align:center;padding:6px;background:var(--s2);border-radius:8px"><div style="font-size:16px;font-weight:900;color:var(--grn)">${sc.c}</div><div style="font-size:9px;color:var(--txM)">${T('scoreCo')}</div></div>`;
          h += `<div style="text-align:center;padding:6px;background:var(--s2);border-radius:8px"><div style="font-size:16px;font-weight:900;color:var(--red)">${wrongs.length}</div><div style="font-size:9px;color:var(--txM)">${T('scoreWr')}</div></div>`;
          h += `<div style="text-align:center;padding:6px;background:var(--s2);border-radius:8px"><div style="font-size:16px;font-weight:900;color:var(--accB)">${avgT}s</div><div style="font-size:9px;color:var(--txM)">${({ja:'平均時間',en:'Avg time',bn:'গড় সময়'}[_lang]||'平均時間')}</div></div>`;
          h += `</div>`;
          _batchQuizLog.forEach((q,i)=>{
            const bg = q.isCorrect ? 'rgba(107,163,104,0.06)' : 'rgba(217,107,107,0.06)';
            h += `<div style="display:flex;align-items:center;gap:5px;padding:5px 6px;margin-bottom:2px;background:${bg};border-radius:5px">`;
            h += `<span style="font-size:9px;font-weight:700;color:var(--txD);min-width:18px">Q${i+1}</span>`;
            h += `<span style="font-size:12px;color:${q.isCorrect?'var(--grn)':'var(--red)'}">${q.isCorrect?'✓':'✗'}</span>`;
            h += `<div style="flex:1;font-size:10px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${q.question}</div>`;
            if(!q.isCorrect) h += `<span style="font-size:8px;color:var(--red)">→${q.answer}</span>`;
            h += `<span style="font-size:9px;color:var(--txD)">${q.seconds}s</span>`;
            h += `</div>`;
          });
          if (wrongs.length) {
            h += `<div style="margin-top:10px;padding-top:10px;border-top:1px solid var(--brd)"><div style="font-size:12px;font-weight:700;color:var(--red);margin-bottom:6px">💀 ${({ja:'間違えた問題',en:'Wrong Questions',bn:'ভুল প্রশ্ন'}[_lang]||'間違えた問題')} (${wrongs.length})</div>`;
            wrongs.forEach(q=>{
              h += `<div style="padding:5px 8px;margin-bottom:3px;background:rgba(217,107,107,0.06);border-radius:6px"><div style="font-size:12px;font-weight:700">${q.question}</div><div style="font-size:10px;color:var(--txM)">${({ja:'正解',en:'Correct',bn:'সঠিক'}[_lang]||'正解')}: ${q.answer} | ⏱${q.seconds}s</div></div>`;
            });
            h += `</div>`;
          }
          h += `</div>`;
        }
        h += `</div>`;
        const target = c.querySelector('.u-content') || c;
        target.innerHTML = h;
        return;
      }

      const item = batch[order[pos]];
      const pct = pos/order.length*100;
      _batchQStart = Date.now();

      // Generate options
      let opts, ci;
      if (verbQF) {
        vqf = verbQF[Math.floor(Math.random()*verbQF.length)];
        const correct = item[vqf.i];
        const others = shuf(verbQF.filter(f=>f!==vqf&&item[f.i]&&item[f.i]!==correct).map(f=>item[f.i])).slice(0,3);
        const o = shuf([correct,...others]);
        opts = o; ci = o.indexOf(correct);
      } else {
        const {opts:o, ci:c2} = optFn(item, batch);
        opts = o; ci = c2;
      }
      const qText = verbQF
        ? `<div class="qb"><div class="qT">${vqf.l}${T('qForm')}</div><div class="qB" style="font-size:36px">${item[0]}</div><div class="qP">${item[1]}</div></div>`
        : qFn(item);

      let h = '';
      h += `<div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">`;
      h += `<button onclick="${sid}_backSelect()" style="background:var(--s2);border:1px solid var(--brd);border-radius:8px;padding:6px 12px;font-size:12px;color:var(--txM);cursor:pointer;font-family:inherit">← 一覧</button>`;
      h += `<div style="flex:1;font-size:13px;font-weight:700;color:var(--txM)">セット${batchNum} クイズ</div>`;
      h += `<div style="font-size:12px;color:var(--txD)">${pos+1}/${order.length}</div>`;
      h += `</div>`;
      h += `<div class="prg"><div class="prg-bar"><div class="prg-fill" style="width:${pct}%"></div></div></div>`;
      h += qText;
      const qid = 'bq_'+sid+'_'+bi+'_'+pos;
      h += `<div id="${qid}" style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px">`;
      opts.forEach((opt,oi) => {
        h += `<div class="qo" data-v="${oi}" data-correct="${oi===ci?1:0}" onclick="${sid}_qa(this,${ci},'${qid}')" style="display:flex;align-items:center;justify-content:center;gap:8px;padding:14px;border-radius:12px;border:2px solid var(--brd);background:var(--s1);cursor:pointer;transition:all .15s;min-height:56px;text-align:center;font-size:13px;line-height:1.4">`;
        h += `<span style="font-size:10px;font-weight:700;color:var(--txD);min-width:14px">${['A','B','C','D'][oi]}</span>`;
        h += `<span>${opt||''}</span></div>`;
      });
      h += `</div>`;
      h += `<div id="${qid}_fb" style="min-height:32px;text-align:center;padding:6px;font-weight:700;font-size:14px"></div>`;
      const target = c.querySelector('.u-content') || c;
      target.innerHTML = h;
    }

    window[sid+'_qa'] = (el, correctIdx, gridId) => {
      const grid = document.getElementById(gridId);
      if (!grid) return;
      const chosen = parseInt(el.dataset.v);
      const isOk = chosen === correctIdx;
      const item = batch[order[pos]];
      const elapsed = Math.round((Date.now() - _batchQStart) / 1000);
      // Disable all
      grid.querySelectorAll('.qo').forEach(o => {
        o.onclick = null; o.style.cursor='default';
        const v = parseInt(o.dataset.v);
        if (v === correctIdx) { o.style.border='2px solid var(--grn)'; o.style.background='rgba(107,163,104,0.12)'; }
        else if (v === chosen && !isOk) { o.style.border='2px solid var(--red)'; o.style.background='rgba(217,107,107,0.12)'; }
      });
      const fb = document.getElementById(gridId+'_fb');
      if (fb) { fb.style.color=isOk?'var(--grn)':'var(--red)'; fb.textContent=isOk?T('correct'):T('incorrect'); }
      if (isOk) { sc.c++; SRS.correct(modKey, item); } else { sc.w++; SRS.wrong(modKey, item); }
      if (typeof addS === 'function' && isOk) addS();
      if (typeof rstS === 'function' && !isOk) rstS();
      // Get correct/chosen text for logging
      const allOpts = grid.querySelectorAll('.qo');
      const correctText = allOpts[correctIdx] ? allOpts[correctIdx].querySelector('span:last-child').textContent : '';
      const chosenText = allOpts[chosen] ? allOpts[chosen].querySelector('span:last-child').textContent : '';
      _batchQuizLog.push({
        question: item[0] || item.q || item.p || '?',
        answer: correctText,
        userAnswer: chosenText,
        isCorrect: isOk,
        seconds: elapsed
      });
      setTimeout(() => { pos++; render(); }, 900);
    };
    render();
  }

  // ── Batch entry point: show flash or quiz menu ──
  function renderBatchMenu(bi) {
    const lvl = curLevel;
    const done = isDone(lvl, bi);
    const batchNum = bi + 1;
    const batch = getBatches(lvl)[bi];

    let h = '';
    h += `<div style="display:flex;align-items:center;gap:10px;margin-bottom:20px">`;
    h += `<button onclick="${sid}_backSelect()" style="background:var(--s2);border:1px solid var(--brd);border-radius:8px;padding:6px 12px;font-size:12px;color:var(--txM);cursor:pointer;font-family:inherit">← 一覧</button>`;
    h += `<div style="font-size:15px;font-weight:700;color:var(--tx)">セット ${batchNum} — ${lvl.label}</div>`;
    h += `</div>`;

    // Word preview
    h += `<div style="background:var(--s2);border-radius:12px;padding:12px 16px;margin-bottom:20px;border:1px solid var(--brd)">`;
    h += `<div style="font-size:11px;font-weight:700;color:var(--txD);margin-bottom:8px">このセットの10語</div>`;
    h += `<div style="display:flex;flex-wrap:wrap;gap:6px">`;
    batch.slice(0,10).forEach(item => {
      h += `<span style="background:var(--s1);border:1px solid var(--brd);border-radius:20px;padding:3px 10px;font-size:13px">${item[0]}</span>`;
    });
    h += `</div></div>`;

    h += `<div style="display:flex;flex-direction:column;gap:12px">`;
    // Flashcard button
    h += `<button onclick="${sid}_startFlash(${bi})" style="display:flex;align-items:center;gap:14px;background:var(--s1);border:1px solid var(--brd);border-radius:14px;padding:18px 20px;cursor:pointer;font-family:inherit;text-align:left;transition:all .2s;${done?'border-color:rgba(107,163,104,0.4)':''}">`;
    h += `<div style="width:48px;height:48px;border-radius:12px;background:var(--g2);display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0">📇</div>`;
    h += `<div><div style="font-size:15px;font-weight:700;color:var(--tx);margin-bottom:3px">フラッシュカード${done?' ✓':''}</div>`;
    h += `<div style="font-size:12px;color:var(--txM)">10枚のカードで学習する</div></div></button>`;

    // Quiz button — always unlocked
    h += `<button onclick="${sid}_startQuiz(${bi})" style="display:flex;align-items:center;gap:14px;background:var(--s1);border:1px solid rgba(228,87,46,0.4);border-radius:14px;padding:18px 20px;cursor:pointer;font-family:inherit;text-align:left;transition:all .2s">`;
    h += `<div style="width:48px;height:48px;border-radius:12px;background:var(--g1);display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0">🎯</div>`;
    h += `<div><div style="font-size:15px;font-weight:700;color:var(--acc);margin-bottom:3px">クイズ${done?' 🔓':''}</div>`;
    h += `<div style="font-size:12px;color:var(--txM)">10問のクイズに挑戦</div></div></button>`;
    h += `</div>`;

    const target = c.querySelector('.u-content') || c;
    target.innerHTML = h;
  }

  // Wire up global handlers
  window[sid+'_setLvl'] = label => {
    const lv = levels.find(x=>x.label===label);
    if (lv) { curLevel = lv; renderSelect(); }
  };
  window[sid+'_openBatch'] = bi => renderBatchMenu(bi);
  window[sid+'_backSelect'] = () => renderSelect();
  window[sid+'_startFlash'] = bi => renderFlash(bi);
  window[sid+'_startQuiz'] = bi => renderQuiz(bi);
  window[sid+'_resetAll'] = () => {
    if (!confirm('このレベルの進捗をリセットしますか？')) return;
    resetProgress(curLevel);
    renderSelect();
  };

  // Initial render via mkU-like wrapper
  let h = `<div class="mod-h"><div class="mod-t">${modKey === 'vocab' ? '📖 語彙' : modKey === 'kanji' ? '🈶 漢字' : '🔄 動詞活用'} — バッチ学習</div></div>`;
  h += `<div class="u-content" id="uc_${sid}"></div>`;
  c.innerHTML = h;
  renderSelect();
}

function initM(c,id){
  switch(id){
    case 'kana':{
      const sid=c.id.replace(/\W/g,'_');
      let kanaType=0; // 0=hiragana, 1=katakana
      let kanaView='menu'; // 'menu' | 'flash' | 'quiz'
      function renderKanaMenu(){
        kanaView='menu';
        const typeLabel=kanaType===0?'ひらがな':'カタカナ';
        const typeIcon=kanaType===0?'あ':'ア';
        let h=`<div class="u-tabs" style="margin-top:12px"><button class="u-tab ${kanaType===0?'on':''}" onclick="${sid}_kt(0)">ひらがな</button><button class="u-tab ${kanaType===1?'on':''}" onclick="${sid}_kt(1)">カタカナ</button></div>`;
        h+=`<div style="padding:16px">`;
        h+=`<div style="font-family:'Zen Maru Gothic',sans-serif;font-size:20px;font-weight:900;margin-bottom:16px;text-align:center">${typeIcon} ${typeLabel}</div>`;
        // Flashcard section
        h+=`<div style="margin-bottom:16px">`;
        h+=`<div style="font-size:13px;font-weight:700;color:var(--txM);margin-bottom:10px;display:flex;align-items:center;gap:6px">📇 ${({ja:'フラッシュカード・一覧',en:'Flashcards & Grid',bn:'ফ্ল্যাশকার্ড ও গ্রিড'}[_lang]||'フラッシュカード・一覧')}</div>`;
        h+=`<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">`;
        h+=`<button onclick="${sid}_startView('grid')" style="display:flex;flex-direction:column;align-items:center;gap:8px;background:var(--s1);border:1px solid var(--brd);border-radius:14px;padding:18px 14px;cursor:pointer;font-family:inherit;transition:all .2s">`;
        h+=`<div style="width:44px;height:44px;border-radius:12px;background:var(--g2);display:flex;align-items:center;justify-content:center;font-size:20px">📋</div>`;
        h+=`<div style="font-size:14px;font-weight:700;color:var(--tx)">${({ja:'一覧表',en:'Grid View',bn:'গ্রিড ভিউ'}[_lang]||'一覧表')}</div>`;
        h+=`<div style="font-size:11px;color:var(--txM)">${({ja:'全文字を一覧で確認',en:'See all characters',bn:'সব অক্ষর দেখুন'}[_lang]||'全文字を一覧で確認')}</div>`;
        h+=`</button>`;
        h+=`<button onclick="${sid}_startView('type')" style="display:flex;flex-direction:column;align-items:center;gap:8px;background:var(--s1);border:1px solid var(--brd);border-radius:14px;padding:18px 14px;cursor:pointer;font-family:inherit;transition:all .2s">`;
        h+=`<div style="width:44px;height:44px;border-radius:12px;background:var(--g2);display:flex;align-items:center;justify-content:center;font-size:20px">⌨️</div>`;
        h+=`<div style="font-size:14px;font-weight:700;color:var(--tx)">${({ja:'タイピング練習',en:'Typing Drill',bn:'টাইপিং ড্রিল'}[_lang]||'タイピング練習')}</div>`;
        h+=`<div style="font-size:11px;color:var(--txM)">${({ja:'ローマ字を入力して覚える',en:'Type romaji to memorize',bn:'রোমাজি টাইপ করুন'}[_lang]||'ローマ字を入力して覚える')}</div>`;
        h+=`</button>`;
        h+=`</div></div>`;
        // Quiz section
        h+=`<div>`;
        h+=`<div style="font-size:13px;font-weight:700;color:var(--txM);margin-bottom:10px;display:flex;align-items:center;gap:6px">🎯 ${({ja:'クイズ',en:'Quiz',bn:'কুইজ'}[_lang]||'クイズ')}</div>`;
        h+=`<button onclick="${sid}_startView('reverse')" style="display:flex;align-items:center;gap:14px;background:var(--s1);border:1px solid rgba(228,87,46,0.4);border-radius:14px;padding:18px 20px;cursor:pointer;font-family:inherit;text-align:left;transition:all .2s;width:100%">`;
        h+=`<div style="width:48px;height:48px;border-radius:12px;background:var(--g1);display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0">🎯</div>`;
        h+=`<div><div style="font-size:15px;font-weight:700;color:var(--acc);margin-bottom:3px">${({ja:'4択クイズ (10問)',en:'4-Choice Quiz (10Q)',bn:'৪-পছন্দ কুইজ (১০টি)'}[_lang]||'4択クイズ (10問)')}</div>`;
        h+=`<div style="font-size:12px;color:var(--txM)">${({ja:'ローマ字から正しい文字を選ぶ',en:'Pick the correct character from romaji',bn:'রোমাজি থেকে সঠিক অক্ষর বাছুন'}[_lang]||'ローマ字から正しい文字を選ぶ')}</div></div></button>`;
        h+=`</div>`;
        h+=`</div>`;
        c.innerHTML=h;
      }
      window[sid+'_kt']=t=>{kanaType=t;renderKanaMenu()};
      window[sid+'_startView']=mode=>{
        kanaView=mode;
        const inner=document.createElement('div');
        inner.id='kana_inner_'+sid;
        c.innerHTML='';c.appendChild(inner);
        if(kanaType===0)mkK(inner,HB,HD,'ひらがな','あ');
        else mkK(inner,KB,KD,'カタカナ','ア');
        // Force the mode
        const fnM=window[inner.id.replace(/\W/g,'_')+'_M'];
        if(fnM)fnM(mode);
      };
      renderKanaMenu();
      break;}

    case 'vocab':{
      const ds=[{label:'N5',data:JLPT_V5,cls:'n5'},{label:'N4',data:JLPT_V4,cls:'n4'},{label:'N3',data:JLPT_V3,cls:'n3'},{label:'入門',data:IRO_NY,cls:'iro'},{label:'初級1',data:IRO_S1,cls:'iro'},{label:'初級2',data:IRO_S2,cls:'iro'}];
      mkBatch(c,'vocab',ds,
        i=>`<div class="fc-big">${i[0]}</div><div style="margin-top:8px;font-size:18px;color:var(--txM);font-weight:500">${i[2]||''}</div>`,
        i=>`<div style="width:100%"><div class="fc-lbl">${T('fRead')}</div><div class="fc-v ac" style="font-size:22px">${i[1]||''}</div><div class="fc-lbl">${T('fMean')} (English)</div><div class="fc-v" style="font-size:22px">${i[2]||''}</div>${i[3]?'<div class="fc-lbl">বাংলা</div><div class="fc-mn">🇧🇩 '+i[3]+'</div>':''}</div>`,
        i=>`<div class="qb"><div class="qT">${T('qMean')}</div><div class="qB">${i[0]}</div><div class="qP" style="font-size:14px;color:var(--txD)">${i[1]||''}</div></div>`,
        (i,batch)=>{const all=batch.filter(v=>v[2]);const w=pick(all.length>=4?all:JLPT_V5.filter(v=>v[2]),3,i),o=shuf([i,...w]);return{opts:o.map(x=>x[2]),ci:o.indexOf(i)}},
        null
      );break;}

    case 'kanji':{
      const ds=[{label:'N5',data:JLPT_K5,cls:'n5'},{label:'N4',data:JLPT_K4,cls:'n4'},{label:'N3',data:JLPT_K3,cls:'n3'}];
      const _lqfPool=[{l:T('f_onyomi'),i:1},{l:T('f_kunyomi'),i:1},{l:T('fMean'),i:2}];
      let _lqf=_lqfPool[0];
      mkBatch(c,'kanji',ds,
        i=>`<div class="fc-big" style="font-size:72px">${i[0]}</div>`,
        i=>`<div style="width:100%"><div class="fc-lbl">${T('fRead')}</div><div class="fc-v ac">${i[1]}</div><div class="fc-lbl">${T('fMean')} (English)</div><div class="fc-v">${K_EN[i[0]]||''}</div><div class="fc-lbl">${T('fEx')}</div><div class="fc-v" style="font-size:16px">${i[2]||''}</div></div>`,
        i=>{_lqf=_lqfPool[Math.floor(Math.random()*_lqfPool.length)];return`<div class="qb"><div class="qT">${_lqf.l}${T('qForm')}</div><div class="qB" style="font-size:72px">${i[0]}</div></div>`},
        (i,batch)=>{if(_lqf.i===2){const w=pick(batch.filter(v=>K_EN[v[0]]),3,i),o=shuf([i,...w]);return{opts:o.map(x=>K_EN[x[0]]||x[2]),ci:o.indexOf(i)}}const w=pick(batch.filter(v=>v[1]),3,i),o=shuf([i,...w]);return{opts:o.map(x=>x[1]),ci:o.indexOf(i)}},
        null
      );break;}

    case 'verb':{
      const VF=[{l:T('f_dict'),i:2},{l:T('f_nai'),i:3},{l:T('f_ta'),i:4},{l:T('f_te'),i:6},{l:T('f_ukemi'),i:10},{l:T('f_kanou'),i:13},{l:T('f_ikou'),i:15},{l:T('f_shieki'),i:16},{l:T('f_meirei'),i:18},{l:T('f_kinshi'),i:19}];
      const QF=[{l:T('f_te'),i:6},{l:T('f_nai'),i:3},{l:T('f_ta'),i:4},{l:T('f_dict'),i:2},{l:T('f_ukemiK'),i:10},{l:T('f_kanouK'),i:13}];
      const ds=[{label:'N5',data:VERBS,cls:'n5'},{label:'N4',data:VERBS_N4,cls:'n4'}];
      mkBatch(c,'verb',ds,
        i=>`<div class="fc-big" style="font-size:36px">${i[0]}</div><div style="margin-top:6px;font-size:13px;color:var(--txM)">${i[1]}</div>`,
        i=>{const rows=VF.filter(f=>i[f.i]).map(f=>`<div style="display:flex;justify-content:space-between;padding:4px 8px;border-radius:6px;background:var(--s1);margin:2px 0"><span style="color:var(--txD);font-size:11px">${f.l}</span><span style="color:var(--acc);font-family:'DM Mono',monospace;font-size:14px">${i[f.i]}</span></div>`).join('');return`<div style="width:100%"><div style="display:grid;grid-template-columns:1fr 1fr;gap:3px">${rows}</div></div>`},
        null, null, QF
      );break;}

    case 'adj':{
      const AFI=[{l:T('f_hitei'),i:2},{l:T('f_kako'),i:3},{l:T('f_kakohitei'),i:4},{l:T('f_te'),i:5},{l:T('f_ku'),i:6},{l:T('f_ba'),i:7}];
      const AFNA=[{l:T('f_hitei'),i:2},{l:T('f_kako'),i:3},{l:T('f_kakohitei'),i:4},{l:T('f_te'),i:5},{l:T('f_ni'),i:6},{l:T('f_ba'),i:7}];
      const AQF=[{l:T('f_hitei'),i:2},{l:T('f_kako'),i:3},{l:T('f_kakohitei'),i:4},{l:T('f_te'),i:5}];
      const ds=[{label:'い形容詞',data:I_ADJ,cls:'n5'},{label:'な形容詞',data:NA_ADJ,cls:'n4'}];
      mkBatch(c,'adj',ds,
        i=>`<div class="fc-big" style="font-size:42px">${i[0]}</div><div style="margin-top:6px;font-size:13px;color:var(--txM)">${i[1]}</div>`,
        i=>{const isI=I_ADJ.includes(i);const forms=isI?AFI:AFNA;const tl=isI?T('f_iadj'):T('f_naadj');
          const rows=forms.filter(f=>i[f.i]).map(f=>`<div style="display:flex;justify-content:space-between;padding:4px 8px;border-radius:6px;background:var(--s1);margin:2px 0"><span style="color:var(--txD);font-size:11px">${f.l}</span><span style="color:var(--acc);font-family:'DM Mono',monospace;font-size:14px">${i[f.i]}</span></div>`).join('');
          return`<div style="width:100%"><div style="font-size:12px;color:var(--txM);margin-bottom:6px"><span style="background:${isI?'var(--accG)':'var(--accB)'};color:#fff;padding:2px 8px;border-radius:10px;font-size:10px;font-weight:700">${tl}</span></div><div style="display:grid;grid-template-columns:1fr 1fr;gap:3px">${rows}</div></div>`},
        null, null, AQF
      );break;}

    case 'timenum':{
      const timeAll=[...HOURS.map(h=>[h[2],h[1],'時',_hEN[h[0]]||'',_hBN[h[0]]||'']),...MINS.map(m=>[m[2],m[1],'分',_mEN[m[0]]||'',_mBN[m[0]]||''])];
      const dateAll=[...MOS.map(m=>[m[2],m[1],'月',_moEN[m[0]]||'']),...DYS.map(d=>[d[2],d[1],'日',_dyEN[d[0]]||'']),...WKD.map(w=>[w[0],w[1],'曜日',w[2]]),...KAGE.map(k=>[k[2],k[1],'ヶ月',_kgEN[k[0]]||''])];
      const numAll=NMS.map(n=>[String(n[0]),n[1],_nBN[n[0]]||'']);
      const cntAll=[];CTRS.forEach(ct=>ct.items.forEach(([n,r])=>cntAll.push([n+ct.n.replace('〜',''),r,ct.n,_ctEN[ct.n]||''])));

      const quizDD=[...MOS.map(m=>({q:m[2],a:m[1],c:'月'})),...DYS.map(d=>({q:d[2],a:d[1],c:'日'})),...WKD.map(w=>({q:w[0],a:w[1],c:'曜'})),...KAGE.map(k=>({q:k[2],a:k[1],c:'ヶ月'}))];

      mkU(c,T('secTime'),[
        {label:'📇 '+T('c_time'),type:'flash',init:cc=>mkF(cc,[{label:T('t_all'),data:timeAll,cls:'iro'},{label:T('c_hour'),data:HOURS.map(h=>[h[2],h[1],'時',_hEN[h[0]]||'',_hBN[h[0]]||'']),cls:'n5'},{label:T('c_min'),data:MINS.map(m=>[m[2],m[1],'分',_mEN[m[0]]||'',_mBN[m[0]]||'']),cls:'n4'}],T('secTime'),'🕐',
          i=>`<div class="fc-big" style="font-size:56px">${i[0]}</div><div style="margin-top:4px;font-size:11px;color:var(--txD)">${i[2]}</div>`,
          i=>`<div style="width:100%"><div class="fc-lbl">${T('fRead')}</div><div class="fc-v ac" style="font-size:24px">${i[1]}</div><div class="fc-lbl">English / বাংলা</div><div class="fc-mn">${i[3]||''} / ${i[4]||''}</div></div>`,'timenum')},
        {label:'📇 '+T('c_date'),type:'flash',init:cc=>mkF(cc,[{label:T('t_all'),data:dateAll,cls:'iro'},{label:T('c_month'),data:MOS.map(m=>[m[2],m[1],'月',_moEN[m[0]]]),cls:'n5'},{label:T('c_day'),data:DYS.map(d=>[d[2],d[1],'日',_dyEN[d[0]]||'']),cls:'n4'},{label:T('c_week'),data:WKD.map(w=>[w[0],w[1],'曜日',w[2]]),cls:'n3'},{label:T('c_dur'),data:KAGE.map(k=>[k[2],k[1],'ヶ月',_kgEN[k[0]]]),cls:'n5'}],T('secTime'),'📅',
          i=>`<div class="fc-big" style="font-size:${(i[0]||'').length>3?'42':'56'}px">${i[0]}</div><div style="margin-top:4px;font-size:11px;color:var(--txD)">${i[2]}</div>`,
          i=>`<div style="width:100%"><div class="fc-lbl">${T('fRead')}</div><div class="fc-v ac" style="font-size:24px">${i[1]}</div>${i[3]?'<div class="fc-lbl">English / বাংলা</div><div class="fc-mn">'+i[3]+'</div>':''}</div>`,'timenum')},
        {label:'📇 '+T('c_num'),type:'flash',init:cc=>mkF(cc,[{label:T('c_num'),data:numAll,cls:'n5'}],T('secTime'),'🔢',
          i=>`<div class="fc-big">${i[0]}</div>`,
          i=>`<div style="width:100%"><div class="fc-lbl">${T('fRead')}</div><div class="fc-v ac" style="font-size:24px">${i[1]}</div>${i[2]?'<div class="fc-lbl">বাংলা</div><div class="fc-mn">🇧🇩 '+i[2]+'</div>':''}</div>`,'timenum')},
        {label:'🎯 '+T('tQuiz'),type:'quiz',init:cc=>{
          const tq=[...HOURS.map(h=>({q:h[2],a:h[1]})),...MINS.map(m=>({q:m[2],a:m[1]}))];
          mkQ(cc,[{label:T('c_time'),data:tq,cls:'n5'},{label:T('c_date'),data:quizDD},{label:T('c_num'),data:NMS.map(n=>({q:String(n[0]),a:n[1]}))}],T('secTime'),'🎯',
            i=>`<div class="qb"><div class="qT">${T('qRead')}?</div><div class="qB">${i.q||i[0]||''}</div></div>`,
            (i,all)=>{const same=all.filter(x=>(x.c||'')===(i.c||''));const pool=same.length>=4?same:all;const w=pick(pool,3,i),o=shuf([i,...w]);return{opts:o.map(x=>x.a||x[1]),ci:o.indexOf(i)}},10,'timenum')}}
      ]);break;}

    case 'grammar':{
      mkU(c,T('secGram'),[
        {label:T('tPattern'),type:'flash',init:cc=>{
          const target=cc.querySelector('.u-content')||cc;
          let h='<div style="padding:8px">';
          GRAM.forEach(g=>{h+=`<div style="background:var(--s1);border:1px solid var(--brd);border-radius:12px;padding:14px;margin-bottom:8px"><div style="font-size:18px;font-weight:700;color:var(--acc)">${g.p}</div><div style="font-size:13px;color:var(--txM);margin:4px 0">${g.en||''}</div><div style="font-size:12px;color:var(--accY)">🇧🇩 ${g.bn||''}</div><div style="font-size:14px;margin-top:8px;color:var(--tx)">${g.ex||''}</div></div>`});
          h+='</div>';target.innerHTML=h}},
        {label:'📇 '+T('cPF'),type:'flash',init:cc=>mkF(cc,[{label:T('cPF'),data:PARTICLES,cls:'n5'}],T('secGram'),'📇',
          i=>`<div class="fc-big" style="font-size:72px">${i.p}</div><div style="margin-top:6px;font-size:13px;color:var(--txM)">${i.r}</div>`,
          i=>`<div style="width:100%"><div class="fc-lbl">${T('fEx')}</div><div style="font-size:18px;line-height:1.8;margin-bottom:12px">${i.ex}</div><div class="fc-lbl">English</div><div class="fc-v">${i.en}</div>${i.bn?'<div class="fc-lbl">বাংলা</div><div class="fc-mn">🇧🇩 '+i.bn+'</div>':''}</div>`,'grammar')},
        {label:'🎯 '+T('cGQ'),type:'quiz',init:cc=>mkQ(cc,[{label:T('cGQ'),data:GQ}],T('secGram'),'🎯',
          i=>`<div class="qb"><div class="qT">${T('qPart')}</div><div class="qB" style="font-size:28px;line-height:1.6">${i.q.replace('＿','<span style="border-bottom:3px solid var(--acc);padding:0 8px;color:var(--acc)">＿</span>')}</div></div>`,
          (i,all)=>{const o=shuf([...i.opts]);return{opts:o,ci:o.indexOf(i.opts[i.ans])}},10,'grammar')}
      ]);break;}

    case 'biz':{
      mkBizOX(c);
      break;}
      
    case 'dashboard':{
      if(typeof mkDashboard==='function')mkDashboard(c);
      break;}
      
    case 'longterm':
    case 'review':
    case 'revenge':{
      if(typeof mkRevenge==='function')mkRevenge(c);
      else c.innerHTML='<div style="padding:40px;text-align:center;color:var(--txM)">Loading...</div>';
      break;}
      
    case 'denkou':{
      mkDenkou(c);
      break;}

    case 'articles':{
      renderArticlesList(c);
      break;}


  }
}

document.addEventListener('DOMContentLoaded', updateRankWidget);
document.addEventListener('DOMContentLoaded',()=>setTimeout(updateRankWidget,100));

// ── Articles ──
function openArticles(){
  if(window._nwTmr)clearInterval(window._nwTmr);
  curMod='articles';
  document.getElementById('homeV').style.display='none';
  document.querySelectorAll('.mod').forEach(m=>m.style.display='none');
  const c=document.getElementById('m-articles');
  c.style.display='block';
  renderArticlesList(c);
  window.scrollTo(0,0);
  const hb=document.getElementById('home-btn');if(hb)hb.style.display='flex';
  if(typeof trackPV==='function')trackPV('/articles','Articles');
}

function openArticle(url){
  // Direct navigation to the article page (no iframe)
  window.location.href = url;
}

function renderArticlesList(c){
  const ARTICLES=[
    {url:'roadmap.html',       icon:'🗺',   title:'Learning Roadmap',   ja:'N5 → N4 → N3 → 日本就職',       tag:'Planning', color:'linear-gradient(135deg,#D4A017,#E4572E)',  desc:'Complete study roadmap from zero to JLPT N3 — the level that opens real job opportunities in Japan.'},
    {url:'guide.html',         icon:'📖',   title:'How to Use the App', ja:'クイズ・電工モジュールの使い方',  tag:'Guide',    color:'linear-gradient(135deg,#6BA368,#0891B2)',  desc:'Step-by-step guide to every module including the Electrical Worker specialist course and JLPT mock tests.'},
  ];
  let h=`<div style="max-width:720px;margin:0 auto;padding:16px 16px 60px">`;
  // Header
  h+=`<div style="margin-bottom:24px">
    <div style="font-family:'Zen Maru Gothic',sans-serif;font-size:22px;font-weight:900;color:var(--tx);margin-bottom:4px">📚 Articles &amp; Guides</div>
    <div style="font-size:13px;color:var(--txM)">Study tips, phrase guides, and roadmaps — all written for Bangladeshi learners.</div>
  </div>`;
  // Cards
  ARTICLES.forEach(a=>{
    h+=`<a href="${a.url}" style="background:var(--s1);border:1px solid var(--brd);border-radius:var(--r);padding:20px;margin-bottom:12px;cursor:pointer;transition:all .2s;position:relative;overflow:hidden;display:block;text-decoration:none"
         onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 6px 20px rgba(0,0,0,.08)';this.style.borderColor='rgba(0,0,0,.14)'"
         onmouseout="this.style.transform='';this.style.boxShadow='';this.style.borderColor='var(--brd)'">
      <div style="position:absolute;top:0;left:0;right:0;height:3px;background:${a.color}"></div>
      <div style="display:flex;align-items:flex-start;gap:16px">
        <div style="font-size:36px;flex-shrink:0;line-height:1;margin-top:2px">${a.icon}</div>
        <div style="flex:1;min-width:0">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;flex-wrap:wrap">
            <div style="font-family:'Zen Maru Gothic',sans-serif;font-size:16px;font-weight:900;color:var(--tx)">${a.title}</div>
            <span style="font-size:10px;background:var(--s2);border:1px solid var(--brd);border-radius:20px;padding:2px 9px;color:var(--txD);font-family:'DM Mono',monospace;white-space:nowrap">${a.tag}</span>
          </div>
          <div style="font-size:11px;color:var(--txD);margin-bottom:6px;font-family:'DM Mono',monospace">${a.ja}</div>
          <div style="font-size:13px;color:var(--txM);line-height:1.7">${a.desc}</div>
        </div>
        <div style="color:var(--txD);font-size:18px;flex-shrink:0;align-self:center">›</div>
      </div>
    </a>`;
  });
  h+=`</div>`;
  c.innerHTML=h;
}

// ── Browser back/forward: return to home ──
window.addEventListener('popstate',function(e){
  // On back, always go home safely
  const path=e.state&&e.state.path?e.state.path:'/';
  const isQuizPath=path.indexOf('/quiz/')!==-1||path.indexOf('/flash/')!==-1||path.indexOf('/jlpt/')!==-1;
  if(path==='/'||!isQuizPath){
    // Silently restore home without another pushState
    if(window._nwTmr)clearInterval(window._nwTmr);
    window._jlptTmrStarted=false;
    window.speechSynthesis&&window.speechSynthesis.cancel();
    document.getElementById('homeV').style.display='block';
    document.querySelectorAll('.mod').forEach(m=>{m.style.display='none';m.innerHTML=''});
    window.scrollTo(0,0);
    const hb=document.getElementById('home-btn');if(hb)hb.style.display='none';
    setTimeout(updateRankWidget,50);
  }
});

// Initial PV for the home page load
document.addEventListener('DOMContentLoaded',function(){
  if(typeof gtag==='function'){
    gtag('event','page_view',{page_location:location.href,page_title:document.title});
  }
});