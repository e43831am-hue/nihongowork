// ═══════════════════════════════════════════════════════════
// NIHONGO WORK — 苦手克服ダッシュボード v12
// ═══════════════════════════════════════════════════════════

const EL={
  dashH:{ja:'苦手克服ダッシュボード',en:'Weakness Dashboard',bn:'দুর্বলতা ড্যাশবোর্ড'},
  dashD:{ja:'苦手を潰して、%G% 合格へ。やらないと、苦手は積み重なります。',en:'Crush weak points to pass %G%. Ignore them and they pile up.',bn:'দুর্বলতা দূর করুন %G% পাস করতে।'},
  passRate:{ja:'あなたの合格率',en:'Your Pass Rate',bn:'আপনার পাসের হার'},
  remaining:{ja:'合格まであと',en:'To pass: ',bn:'পাস করতে আর '},
  weakNow:{ja:'現在の苦手',en:'Weak now',bn:'দুর্বল'},
  todayGoal:{ja:'今日の目標',en:"Today's goal",bn:'আজকের লক্ষ্য'},
  crushBtn:{ja:'🔥 苦手を潰す',en:'🔥 Crush Weakness',bn:'🔥 দুর্বলতা দূর করুন'},
  analysis:{ja:'🔍 合格への分析結果',en:'🔍 Pass Analysis',bn:'🔍 পাস বিশ্লেষণ'},
  roadmap:{ja:'🗺 合格へのロードマップ',en:'🗺 Roadmap to Pass',bn:'🗺 পাসের রোডম্যাপ'},
  crushList:{ja:'🔥 苦手を潰すタスクリスト',en:'🔥 Weakness Task List',bn:'🔥 দুর্বলতা টাস্ক লিস্ট'},
  revengeT:{ja:'⚔️ リベンジテスト',en:'⚔️ Revenge Test',bn:'⚔️ রিভেঞ্জ টেস্ট'},
  revengeD:{ja:'間違えた全問題からランダム10問',en:'Random 10 from all mistakes',bn:'সব ভুল থেকে ১০টি'},
  crushIt:{ja:'苦手を潰す',en:'Crush it',bn:'দূর করুন'},
  noWeak:{ja:'苦手なし！🎉',en:'No weaknesses! 🎉',bn:'দুর্বলতা নেই! 🎉'},
  qCount:{ja:'問',en:'Q',bn:'টি'},
  avgTime:{ja:'平均時間',en:'Avg time',bn:'গড় সময়'},
  detailResult:{ja:'📊 詳細結果',en:'📊 Detailed Results',bn:'📊 বিস্তারিত'},
  yourAns:{ja:'あなた',en:'You',bn:'আপনি'},
  correctAns:{ja:'正解',en:'Correct',bn:'সঠিক'},
  wrongQ:{ja:'💀 間違えた問題',en:'💀 Wrong Questions',bn:'💀 ভুল প্রশ্ন'},
  learn:{ja:'学習',en:'Study',bn:'অধ্যয়ন'},
};
function ET(k){return(EL[k]&&EL[k][_lang])||EL[k]?.ja||k}

// ── ANALYSIS ENGINE ──
function analyzeUser(){
  const goal=localStorage.getItem('nw3_goal')||'N4';
  const cats=[
    {key:'kana',name:{ja:'ひらがな',en:'Hiragana',bn:'হিরাগানা'},items:[...HB,...HD],level:'N5',icon:'あ',href:'kana-practice.html'},
    {key:'kana',name:{ja:'カタカナ',en:'Katakana',bn:'কাতাকানা'},items:[...KB,...KD],level:'N5',icon:'ア',href:'kana-practice.html',id:'kata'},
    {key:'vocab',name:{ja:'語彙N5',en:'Vocab N5',bn:'শব্দ N5'},items:JLPT_V5,level:'N5',icon:'📖',href:'vocab.html'},
    {key:'kanji',name:{ja:'漢字N5',en:'Kanji N5',bn:'কানজি N5'},items:JLPT_K5,level:'N5',icon:'漢',href:'kanji.html'},
    {key:'vocab',name:{ja:'語彙N4',en:'Vocab N4',bn:'শব্দ N4'},items:JLPT_V4,level:'N4',icon:'📖',href:'vocab.html'},
    {key:'kanji',name:{ja:'漢字N4',en:'Kanji N4',bn:'কানজি N4'},items:JLPT_K4,level:'N4',icon:'漢',href:'kanji.html'},
    {key:'verb',name:{ja:'動詞活用',en:'Verbs',bn:'ক্রিয়া'},items:[...VERBS,...VERBS_N4],level:'N4',icon:'🔄',href:'verb.html'},
    {key:'adj',name:{ja:'形容詞',en:'Adj.',bn:'বিশেষণ'},items:[...I_ADJ,...NA_ADJ],level:'N4',icon:'📝',href:'adj.html'},
    {key:'grammar',name:{ja:'文法',en:'Grammar',bn:'ব্যাকরণ'},items:GRAM,level:'N4',icon:'📗',href:'grammar.html'},
    {key:'vocab',name:{ja:'語彙N3',en:'Vocab N3',bn:'শব্দ N3'},items:JLPT_V3,level:'N3',icon:'📖',href:'vocab.html'},
    {key:'kanji',name:{ja:'漢字N3',en:'Kanji N3',bn:'কানজি N3'},items:JLPT_K3,level:'N3',icon:'漢',href:'kanji.html'},
  ];
  const goalOrder={N5:['N5'],N4:['N5','N4'],N3:['N5','N4','N3']};
  const needed=goalOrder[goal]||['N5','N4'];
  const relevantCats=cats.filter(c=>needed.includes(c.level));
  let totalC=0,totalW=0,totalWeak=0,totalMastered=0,totalItems=0;
  const catResults=relevantCats.map(cat=>{
    let c=0,w=0,weak=0,mastered=0,attempted=0;
    cat.items.forEach(item=>{
      const d=SRS.get(cat.key,item);
      c+=d.c;w+=d.w;
      if(d.c+d.w>0)attempted++;
      if(d.w>0&&d.w>=d.c)weak++;
      if(d.c>=3&&d.c>d.w*2)mastered++;
    });
    totalC+=c;totalW+=w;totalWeak+=weak;totalMastered+=mastered;totalItems+=cat.items.length;
    const total=c+w;
    const rate=total>0?Math.round(c/total*100):0;
    const coverage=cat.items.length>0?Math.round(attempted/cat.items.length*100):0;
    return{...cat,c,w,weak,mastered,rate,coverage,total,attempted,nameL:cat.name[_lang]||cat.name.ja};
  });
  const overallTotal=totalC+totalW;
  let passRate=0;
  if(overallTotal>0){let wS=0,wT=0;catResults.forEach(c=>{if(c.total>0){const w=Math.sqrt(c.items.length);wS+=c.rate*w;wT+=w;}});passRate=wT>0?Math.min(95,Math.round(wS/wT)):0;}
  // Insights
  const insights=[];
  const avgTimes=JSON.parse(localStorage.getItem('nw3_avg_times')||'{}');
  const avArr=Object.values(avgTimes);
  if(avArr.length>3){const avg=avArr.reduce((a,b)=>a+b,0)/avArr.length;
    if(avg>8)insights.push({icon:'⚡',title:{ja:'反応速度が足りない',en:'Response speed is slow',bn:'প্রতিক্রিয়া ধীর'},desc:{ja:'回答時間が遅いため、スコアに影響。平均'+avg.toFixed(1)+'秒',en:'Slow answer time affects scores. Avg '+avg.toFixed(1)+'s',bn:'ধীর উত্তর স্কোরে প্রভাব ফেলছে। গড় '+avg.toFixed(1)+'সে'}});
  }
  const best=catResults.filter(c=>c.total>10).sort((a,b)=>b.rate-a.rate)[0];
  const worst=catResults.filter(c=>c.total>5).sort((a,b)=>a.rate-b.rate)[0];
  if(best&&worst&&best.rate-worst.rate>20){
    insights.push({icon:'⚠️',title:{ja:worst.nameL+'が弱点',en:worst.nameL+' is weak',bn:worst.nameL+' দুর্বল'},desc:{ja:best.nameL+'は'+best.rate+'%ですが、'+worst.nameL+'が'+worst.rate+'%で止まっています。',en:best.nameL+' is '+best.rate+'%, but '+worst.nameL+' stuck at '+worst.rate+'%.',bn:best.nameL+' '+best.rate+'%, কিন্তু '+worst.nameL+' '+worst.rate+'% এ আটকে।'}});
  }
  const repeats=catResults.filter(c=>c.weak>=5);
  if(repeats.length)insights.push({icon:'🔁',title:{ja:'同じ間違いを繰り返している',en:'Repeating same mistakes',bn:'একই ভুল পুনরাবৃত্তি'},desc:{ja:repeats.map(c=>c.nameL).join('、')+'で繰り返しています。',en:'In: '+repeats.map(c=>c.nameL).join(', ')+'.',bn:repeats.map(c=>c.nameL).join(', ')+' এ।'}});
  const lowCov=catResults.filter(c=>c.coverage<20);
  if(lowCov.length)insights.push({icon:'📉',title:{ja:'未学習の分野がある',en:'Unstudied areas',bn:'অধ্যয়ন হয়নি'},desc:{ja:lowCov.map(c=>c.nameL+'('+c.coverage+'%)').join('、')+'が未学習。',en:lowCov.map(c=>c.nameL+'('+c.coverage+'%)').join(', ')+' barely studied.',bn:lowCov.map(c=>c.nameL+'('+c.coverage+'%)').join(', ')+' প্রায় পড়া হয়নি।'}});
  if(!insights.length&&overallTotal>20)insights.push({icon:'✨',title:{ja:'順調！',en:'On track!',bn:'ভালো চলছে!'},desc:{ja:'バランスよく学習中。この調子！',en:'Study is well-balanced. Keep it up!',bn:'সুষম পড়াশোনা চলছে!'}});
  return{goal,passRate,totalWeak,totalMastered,totalItems,catResults,insights,needed};
}

// ── RENDER HOME DASHBOARD ──
function renderHomeDashboard(){
  const el=document.getElementById('nw-dashboard');
  if(!el)return;
  const A=analyzeUser();
  const pct=A.passRate,remain=100-pct,weakTotal=A.totalWeak;
  const todayTarget=Math.min(12,Math.max(3,Math.ceil(weakTotal*0.3)));
  const R=54,C=2*Math.PI*R,off=C*(1-pct/100);
  const rc=pct>=80?'#6BA368':pct>=50?'#D4A017':'#E4572E';
  let h='';
  // Header
  h+=`<div style="margin-bottom:10px">
    <div style="font-family:'Zen Maru Gothic',sans-serif;font-size:17px;font-weight:900;color:var(--tx)">🔥 ${ET('dashH')}</div>
    <div style="font-size:11px;color:var(--txM);margin-top:2px">${ET('dashD').replace('%G%',A.goal)}</div>
  </div>`;
  // ── Row 1: Pass Rate (dark) + Analysis ──
  h+=`<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px">`;
  // Left dark card
  h+=`<div style="background:#1a1a2e;border-radius:16px;padding:16px;color:#fff;display:flex;flex-direction:column;justify-content:space-between">
    <div style="font-size:11px;opacity:.7">${ET('passRate')}</div>
    <div style="display:flex;align-items:center;gap:10px;margin:8px 0">
      <div style="position:relative;width:110px;height:110px;flex-shrink:0">
        <svg width="110" height="110" viewBox="0 0 120 120"><circle cx="60" cy="60" r="${R}" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="10"/><circle cx="60" cy="60" r="${R}" fill="none" stroke="${rc}" stroke-width="10" stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="${off}" transform="rotate(-90 60 60)" style="transition:stroke-dashoffset 1.5s"/></svg>
        <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center"><div style="font-size:34px;font-weight:900">${pct}<span style="font-size:18px">%</span></div></div>
      </div>
    </div>
    <div style="background:${rc};border-radius:20px;padding:4px 10px;display:inline-block;font-size:10px;font-weight:700;margin-bottom:6px;align-self:flex-start">${ET('remaining')}${remain}%</div>
    <div style="display:flex;gap:10px">
      <div><div style="font-size:9px;opacity:.5">💀 ${ET('weakNow')}</div><div style="font-size:16px;font-weight:900">${weakTotal}${ET('qCount')}</div></div>
      <div><div style="font-size:9px;opacity:.5">🎯 ${ET('todayGoal')}</div><div style="font-size:16px;font-weight:900">${todayTarget}${ET('qCount')}</div></div>
    </div>
    <button onclick="showCrushPopup()" style="margin-top:8px;width:100%;padding:9px;background:#E4572E;color:#fff;border:none;border-radius:10px;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit">${ET('crushBtn')}</button>
  </div>`;
  // Right analysis
  h+=`<div style="background:var(--s1);border:1px solid var(--brd);border-radius:16px;padding:14px;display:flex;flex-direction:column">
    <div style="font-size:12px;font-weight:700;margin-bottom:8px">${ET('analysis')}</div>`;
  A.insights.forEach(ins=>{
    h+=`<div style="margin-bottom:8px;padding-bottom:8px;border-bottom:1px solid var(--brd)">
      <div style="font-size:12px;font-weight:700;display:flex;align-items:center;gap:4px">${ins.icon} ${ins.title[_lang]||ins.title.ja}</div>
      <div style="font-size:10px;color:var(--txM);margin-top:2px;line-height:1.4">${ins.desc[_lang]||ins.desc.ja}</div>
    </div>`;
  });
  h+=`</div></div>`;
  // ── Row 2: Roadmap + Task list ──
  h+=`<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px">`;
  // Left roadmap
  h+=`<div style="background:var(--s1);border:1px solid var(--brd);border-radius:14px;padding:12px">
    <div style="font-size:12px;font-weight:700;margin-bottom:8px">${ET('roadmap')}</div>
    <div style="font-size:10px;color:var(--txM);margin-bottom:8px">${A.goal} 合格を目指す</div>`;
  A.catResults.forEach(cat=>{
    const bc=cat.rate>=80?'var(--grn)':cat.rate>=50?'var(--accY)':'var(--acc)';
    const bg=cat.rate>=80?'var(--grn)':cat.rate>=50?'linear-gradient(90deg,#D4A017,#6BA368)':'linear-gradient(90deg,#E4572E,#D4A017)';
    h+=`<div style="margin-bottom:6px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:2px">
        <div style="display:flex;align-items:center;gap:3px"><span style="font-size:11px">${cat.icon}</span><span style="font-size:10px;font-weight:600">${cat.nameL}</span><span style="font-size:8px;color:var(--txD)">${cat.level}</span></div>
        <span style="font-size:10px;font-weight:700;color:${bc}">${cat.rate}%</span>
      </div>
      <div style="background:var(--s3);border-radius:3px;height:5px;overflow:hidden"><div style="height:100%;border-radius:3px;width:${Math.max(2,cat.rate)}%;background:${bg};transition:width 1s"></div></div>
    </div>`;
  });
  h+=`</div>`;
  // Right task list
  h+=`<div style="background:var(--s1);border:1px solid var(--brd);border-radius:14px;padding:12px">
    <div style="font-size:12px;font-weight:700;margin-bottom:8px">${ET('crushList')}</div>`;
  const sorted=A.catResults.filter(c=>c.weak>0||c.coverage<40).sort((a,b)=>b.weak-a.weak||(a.rate-b.rate));
  if(!sorted.length){h+=`<div style="padding:16px;text-align:center;font-size:11px;color:var(--txM)">${ET('noWeak')}</div>`;}
  else{sorted.slice(0,4).forEach((cat,i)=>{
    h+=`<div style="display:flex;align-items:center;gap:6px;padding:6px;margin-bottom:3px;background:var(--s2);border-radius:8px">
      <div style="background:var(--acc);color:#fff;width:18px;height:18px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:900;flex-shrink:0">${i+1}</div>
      <div style="flex:1;min-width:0"><div style="font-size:11px;font-weight:700">${cat.nameL} (${cat.level})</div><div style="font-size:9px;color:var(--txD)">苦手${cat.weak} | ${cat.rate}%</div></div>
      <a href="${cat.href}" style="background:var(--acc);color:#fff;padding:3px 8px;border-radius:6px;font-size:9px;font-weight:700;text-decoration:none">${ET('crushIt')}</a>
    </div>`;
  });}
  // Revenge test button
  h+=`<div onclick="openM('revenge')" style="margin-top:6px;background:linear-gradient(135deg,#1a1a2e,#2d1b4e);border-radius:10px;padding:8px 10px;cursor:pointer;display:flex;align-items:center;gap:6px">
    <span style="font-size:16px">⚔️</span>
    <div><div style="font-size:11px;font-weight:700;color:#fff">${ET('revengeT')}</div><div style="font-size:9px;color:rgba(255,255,255,0.6)">${ET('revengeD')}</div></div>
  </div>`;
  h+=`</div></div>`;
  el.innerHTML=h;
}

// ── CRUSH POPUP ──
function showCrushPopup(){
  const A=analyzeUser();
  const sorted=A.catResults.filter(c=>A.needed.includes(c.level)).sort((a,b)=>(b.weak-a.weak)||(a.rate-b.rate));
  const ov=document.createElement('div');ov.id='crush-popup';
  ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:10000;display:flex;align-items:center;justify-content:center;padding:16px;overflow-y:auto';
  let h=`<div style="background:var(--s1);border-radius:20px;padding:24px;max-width:440px;width:100%;max-height:85vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,0.3)">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
      <div style="font-family:'Zen Maru Gothic',sans-serif;font-size:16px;font-weight:900">🔥 ${ET('crushList')}</div>
      <button onclick="document.getElementById('crush-popup').remove()" style="background:var(--s2);border:none;border-radius:50%;width:28px;height:28px;cursor:pointer;font-size:14px;color:var(--txM)">✕</button>
    </div>
    <div style="font-size:11px;color:var(--txM);margin-bottom:12px">${A.goal} 合格に必要なタスク</div>`;
  sorted.forEach(cat=>{
    const bc=cat.rate>=80?'var(--grn)':cat.rate>=50?'var(--accY)':'var(--acc)';
    const st=cat.rate>=80?'✅':cat.rate>=50?'📈':'🔴';
    h+=`<div style="background:var(--s2);border-radius:10px;padding:10px;margin-bottom:6px;display:flex;align-items:center;gap:8px">
      <span style="font-size:16px">${cat.icon}</span>
      <div style="flex:1"><div style="display:flex;justify-content:space-between;margin-bottom:2px"><span style="font-size:12px;font-weight:700">${st} ${cat.nameL}</span><span style="font-size:11px;font-weight:700;color:${bc}">${cat.rate}%</span></div>
        <div style="background:var(--s3);border-radius:3px;height:4px;overflow:hidden"><div style="height:100%;background:${bc};border-radius:3px;width:${cat.rate}%"></div></div>
        <div style="font-size:9px;color:var(--txD);margin-top:2px">苦手:${cat.weak} | 習得:${cat.mastered}/${cat.items.length}</div>
      </div>
      <a href="${cat.href}" style="background:${cat.weak>0?'var(--acc)':'var(--accB)'};color:#fff;padding:5px 10px;border-radius:8px;font-size:10px;font-weight:700;text-decoration:none">${cat.weak>0?ET('crushIt'):ET('learn')}</a>
    </div>`;
  });
  h+=`<div onclick="document.getElementById('crush-popup').remove();openM('revenge')" style="margin-top:8px;background:linear-gradient(135deg,#1a1a2e,#2d1b4e);border-radius:12px;padding:12px;cursor:pointer;display:flex;align-items:center;gap:10px;color:#fff">
    <span style="font-size:22px">⚔️</span><div><div style="font-size:13px;font-weight:900">${ET('revengeT')}</div><div style="font-size:10px;opacity:.7">${ET('revengeD')}</div></div>
  </div></div>`;
  ov.innerHTML=h;document.body.appendChild(ov);
}

// ── REVENGE TEST ──
function mkRevenge(c){
  const target=c;
  const pools=[
    {key:'kana',items:[...HB,...HD],type:'kana',all:[...HB,...HD,...KB,...KD]},
    {key:'kana',items:[...KB,...KD],type:'kana',all:[...HB,...HD,...KB,...KD]},
    {key:'vocab',items:JLPT_V5,type:'vocab',all:[...JLPT_V5,...JLPT_V4,...JLPT_V3]},
    {key:'vocab',items:JLPT_V4,type:'vocab',all:[...JLPT_V5,...JLPT_V4,...JLPT_V3]},
    {key:'vocab',items:JLPT_V3,type:'vocab',all:[...JLPT_V5,...JLPT_V4,...JLPT_V3]},
    {key:'kanji',items:JLPT_K5,type:'kanji',all:[...JLPT_K5,...JLPT_K4,...JLPT_K3]},
    {key:'kanji',items:JLPT_K4,type:'kanji',all:[...JLPT_K5,...JLPT_K4,...JLPT_K3]},
    {key:'kanji',items:JLPT_K3,type:'kanji',all:[...JLPT_K5,...JLPT_K4,...JLPT_K3]},
    {key:'verb',items:[...VERBS,...VERBS_N4],type:'vocab',all:[...VERBS,...VERBS_N4]},
    {key:'adj',items:[...I_ADJ,...NA_ADJ],type:'vocab',all:[...I_ADJ,...NA_ADJ]},
    {key:'grammar',items:GRAM,type:'grammar',all:GRAM},
  ];
  let allWeak=[];
  pools.forEach(p=>{SRS.getWeakItems(p.key,p.items).forEach(item=>{allWeak.push({item,key:p.key,type:p.type,all:p.all});});});
  if(!allWeak.length){
    target.innerHTML=`<div style="text-align:center;padding:60px 20px"><div style="font-size:48px;margin-bottom:12px">🎉</div><div style="font-size:18px;font-weight:700;margin-bottom:8px">${ET('noWeak')}</div><div style="font-size:13px;color:var(--txM);margin-bottom:20px">クイズを解いて苦手を増やしましょう</div><button class="rbtn" onclick="goHome()" style="background:var(--s2);color:var(--tx)">${T('home')}</button></div>`;
    return;
  }
  const deck=shuf(allWeak).slice(0,10);
  let pos=0,sc={c:0,w:0},quizLog=[],qStart=Date.now();
  
  function showScore(){
    const t=sc.c+sc.w,p=t?Math.round(sc.c/t*100):0;
    const totalTime=quizLog.reduce((s,q)=>s+q.seconds,0);
    const avgT=quizLog.length?(totalTime/quizLog.length).toFixed(1):0;
    try{const at=JSON.parse(localStorage.getItem('nw3_avg_times')||'{}');at['r_'+Date.now()]=+avgT;const ks=Object.keys(at);if(ks.length>30)ks.slice(0,ks.length-30).forEach(k=>delete at[k]);localStorage.setItem('nw3_avg_times',JSON.stringify(at));}catch{}
    let h=`<div class="scr sh"><div class="scr-big">${p}%</div><div class="scr-msg">${[T('score0'),T('score1'),T('score2'),T('score3')][p<50?0:p<75?1:p<95?2:3]} (${sc.c}/${t})</div>
      <div class="scr-tiles"><div class="scr-t g"><div class="tl">${T('scoreCo')}</div><div class="tv">${sc.c}</div></div><div class="scr-t r"><div class="tl">${T('scoreWr')}</div><div class="tv">${sc.w}</div></div><div class="scr-t"><div class="tl">${ET('avgTime')}</div><div class="tv" style="color:var(--accB)">${avgT}s</div></div></div>
      <button class="rbtn" onclick="openM('revenge')">${T('again')}</button><button class="rbtn" style="background:var(--s2);color:var(--tx)" onclick="goHome()">${T('home')}</button></div>`;
    // Detail
    h+=`<div style="margin-top:16px;background:var(--s1);border:1px solid var(--brd);border-radius:14px;padding:16px">
      <div style="font-size:14px;font-weight:700;margin-bottom:10px">${ET('detailResult')}</div>`;
    quizLog.forEach((q,i)=>{
      const bg=q.isCorrect?'rgba(107,163,104,0.06)':'rgba(217,107,107,0.06)';
      const bd=q.isCorrect?'rgba(107,163,104,0.2)':'rgba(217,107,107,0.2)';
      h+=`<div style="display:flex;align-items:center;gap:6px;padding:6px 8px;margin-bottom:3px;background:${bg};border:1px solid ${bd};border-radius:6px">
        <span style="font-size:10px;font-weight:700;color:var(--txD);min-width:20px">Q${i+1}</span>
        <span style="font-size:13px;color:${q.isCorrect?'var(--grn)':'var(--red)'}">${q.isCorrect?'✓':'✗'}</span>
        <div style="flex:1;min-width:0"><div style="font-size:11px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${q.question}</div>
          ${!q.isCorrect?`<div style="font-size:9px;color:var(--red)">${ET('yourAns')}: ${q.userAnswer}</div><div style="font-size:9px;color:var(--grn)">${ET('correctAns')}: ${q.answer}</div>`:''}
        </div><span style="font-size:10px;color:var(--txD)">${q.seconds}s</span></div>`;
    });
    const wrongs=quizLog.filter(q=>!q.isCorrect);
    if(wrongs.length){
      h+=`<div style="margin-top:10px;padding-top:10px;border-top:1px solid var(--brd)"><div style="font-size:12px;font-weight:700;color:var(--red);margin-bottom:6px">${ET('wrongQ')} (${wrongs.length})</div>`;
      wrongs.forEach(q=>{h+=`<div style="padding:5px 8px;margin-bottom:3px;background:rgba(217,107,107,0.06);border-radius:6px"><div style="font-size:12px;font-weight:700">${q.question}</div><div style="font-size:10px;color:var(--txM)">${ET('correctAns')}: ${q.answer} | ⏱${q.seconds}s</div></div>`;});
      h+=`</div>`;
    }
    h+=`</div>`;
    target.innerHTML=h;
  }
  
  function handleAnswer(entry,item,opts,ci,chosenIdx,getCorrectText,getChosenText){
    const ok=chosenIdx===ci;
    if(ok){sc.c++;SRS.correct(entry.key,item);addS();}
    else{sc.w++;SRS.wrong(entry.key,item);rstS();}
    quizLog.push({question:item[0]||item.p||'?',answer:getCorrectText(),userAnswer:getChosenText(),isCorrect:ok,seconds:Math.round((Date.now()-qStart)/1000)});
    target.querySelectorAll('.qo').forEach(x=>x.classList.add('dis'));
    target.querySelectorAll('.qo')[ci]?.classList.add('ok');
    if(!ok)target.querySelectorAll('.qo')[chosenIdx]?.classList.add('no');
    setTimeout(()=>{pos++;render();},600);
  }
  
  function render(){
    if(pos>=deck.length){showScore();return;}
    const entry=deck[pos],item=entry.item;
    qStart=Date.now();
    let h=`<div class="mod-h"><div class="mod-t">${ET('revengeT')}</div></div>`;
    h+=`<div class="prg"><div class="prg-bar"><div class="prg-fill" style="width:${pos/deck.length*100}%"></div></div><div class="prg-tx">${pos+1}/${deck.length}</div></div>`;
    
    if(entry.type==='kana'){
      const ch=item[0],rom=item[1];
      const wrongs=shuf(entry.all.filter(x=>x[1]!==rom)).slice(0,3);
      const opts=shuf([item,...wrongs]),ci=opts.indexOf(item);
      h+=`<div class="qb"><div class="qB" style="font-size:80px">${ch}</div><div class="qP">ローマ字は？</div></div><div class="qos">`;
      ['A','B','C','D'].forEach((l,i)=>{h+=`<div class="qo" data-i="${i}"><span class="ol">${l}</span><span>${opts[i][1]}</span></div>`;});
      h+=`</div>`;target.innerHTML=h;
      target.querySelectorAll('.qo').forEach(o=>{o.onclick=function(){if(this.classList.contains('dis'))return;const ch2=+this.dataset.i;handleAnswer(entry,item,opts,ci,ch2,()=>rom,()=>opts[ch2][1]);};});
    }else if(entry.type==='grammar'){
      const jp=item.p||'',ans=item.en||item.ex||'';
      const wrongs=shuf(entry.all.filter(x=>x!==item)).slice(0,3);
      const opts=shuf([item,...wrongs]),ci=opts.indexOf(item);
      h+=`<div class="qb"><div class="qT">文法</div><div class="qB" style="font-size:24px">${jp}</div></div><div class="qos">`;
      ['A','B','C','D'].forEach((l,i)=>{h+=`<div class="qo" data-i="${i}"><span class="ol">${l}</span><span>${opts[i].en||opts[i].ex||''}</span></div>`;});
      h+=`</div>`;target.innerHTML=h;
      target.querySelectorAll('.qo').forEach(o=>{o.onclick=function(){if(this.classList.contains('dis'))return;const ch2=+this.dataset.i;handleAnswer(entry,item,opts,ci,ch2,()=>ans,()=>opts[ch2].en||opts[ch2].ex||'');};});
    }else{
      const jp=item[0]||'',correctText=item[2]||item[1]||'';
      const wrongs=shuf(entry.all.filter(x=>x!==item&&(x[2]||x[1])!==correctText)).slice(0,3);
      const opts=shuf([item,...wrongs]),ci=opts.indexOf(item);
      h+=`<div class="qb"><div class="qT">意味は？</div><div class="qB" style="font-size:${jp.length>4?'28px':'44px'}">${jp}</div></div><div class="qos">`;
      ['A','B','C','D'].forEach((l,i)=>{h+=`<div class="qo" data-i="${i}"><span class="ol">${l}</span><span>${opts[i][2]||opts[i][1]||''}</span></div>`;});
      h+=`</div>`;target.innerHTML=h;
      target.querySelectorAll('.qo').forEach(o=>{o.onclick=function(){if(this.classList.contains('dis'))return;const ch2=+this.dataset.i;handleAnswer(entry,item,opts,ci,ch2,()=>correctText,()=>opts[ch2][2]||opts[ch2][1]||'');};});
    }
  }
  render();
}

// ── QUIZ RESULT TRACKING ──
window._quizLog=[];window._quizQStart=0;
function startQuizTimer(){window._quizQStart=Date.now();}
function logQuizAnswer(item,opts,ci,chosen,ok){
  const el=window._quizQStart?Math.round((Date.now()-window._quizQStart)/1000):0;
  window._quizLog.push({question:item[0]||item.q||item.p||'?',answer:opts?opts[ci]:'',userAnswer:opts?(chosen>=0?opts[chosen]:'(時間切れ)'):'',isCorrect:ok,seconds:el});
  window._quizQStart=Date.now();
  try{const at=JSON.parse(localStorage.getItem('nw3_avg_times')||'{}');at['q_'+Date.now()]=el;const ks=Object.keys(at);if(ks.length>50)ks.slice(0,ks.length-50).forEach(k=>delete at[k]);localStorage.setItem('nw3_avg_times',JSON.stringify(at));}catch{}
}
function renderQuizResultDetails(scrEl,log){
  if(!log||!log.length)return;
  const wrongs=log.filter(q=>!q.isCorrect);
  const avgT=log.length?(log.reduce((s,q)=>s+q.seconds,0)/log.length).toFixed(1):0;
  let h=`<div style="margin-top:16px;background:var(--s1);border:1px solid var(--brd);border-radius:14px;padding:16px;text-align:left">
    <div style="font-size:14px;font-weight:700;margin-bottom:8px">${ET('detailResult')}</div>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-bottom:8px">
      <div style="text-align:center;padding:6px;background:var(--s2);border-radius:8px"><div style="font-size:16px;font-weight:900;color:var(--grn)">${log.length-wrongs.length}</div><div style="font-size:9px;color:var(--txM)">${T('scoreCo')}</div></div>
      <div style="text-align:center;padding:6px;background:var(--s2);border-radius:8px"><div style="font-size:16px;font-weight:900;color:var(--red)">${wrongs.length}</div><div style="font-size:9px;color:var(--txM)">${T('scoreWr')}</div></div>
      <div style="text-align:center;padding:6px;background:var(--s2);border-radius:8px"><div style="font-size:16px;font-weight:900;color:var(--accB)">${avgT}s</div><div style="font-size:9px;color:var(--txM)">${ET('avgTime')}</div></div>
    </div>`;
  log.forEach((q,i)=>{
    const bg=q.isCorrect?'rgba(107,163,104,0.06)':'rgba(217,107,107,0.06)';
    h+=`<div style="display:flex;align-items:center;gap:5px;padding:5px 6px;margin-bottom:2px;background:${bg};border-radius:5px">
      <span style="font-size:9px;font-weight:700;color:var(--txD);min-width:18px">Q${i+1}</span>
      <span style="font-size:12px;color:${q.isCorrect?'var(--grn)':'var(--red)'}">${q.isCorrect?'✓':'✗'}</span>
      <div style="flex:1;font-size:10px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${q.question}</div>
      ${!q.isCorrect?`<span style="font-size:8px;color:var(--red)">→${q.answer}</span>`:''}
      <span style="font-size:9px;color:var(--txD)">${q.seconds}s</span>
    </div>`;
  });
  h+=`</div>`;
  scrEl.innerHTML+=h;
}

// ── INIT HOOKS ──
document.addEventListener('DOMContentLoaded',()=>{setTimeout(renderHomeDashboard,150);});
const _origGoHome=typeof goHome==='function'?goHome:null;
goHome=function(){if(_origGoHome)_origGoHome();setTimeout(renderHomeDashboard,80);};
console.log('✅ 苦手克服ダッシュボード v12');
