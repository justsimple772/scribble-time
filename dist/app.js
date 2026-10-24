const $=id=>document.getElementById(id),defaults=['사과','우산','기차','바다','시계','나무','구름','연필','고양이','자전거','별','커피','책','나비','모자','열쇠','풍선','의자','달','꽃'];
let mapping=[],order=[],pos=0,quizPos=0,firstCorrect=0,attempted=false,resolved=false,paused=false,timer=null,run=0,started=0,remaining=0,speaking=false,elapsed=false,currentUtterance=null;
const synth=window.speechSynthesis;
function shuffle(a){a=[...a];for(let i=a.length-1;i>0;i--){let j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
let previousWords=[];
try{const saved=JSON.parse(localStorage.getItem('scribble-last-words')||'[]');if(Array.isArray(saved))previousWords=saved.filter(w=>typeof w==='string')}catch{}
function selectedCount(){return Math.max(1,Math.min(50,Math.floor(Number($('questionCount').value)||20)))}
function drawWords(){const count=selectedCount();const previous=new Set(previousWords);const available=WORD_POOL.filter(word=>!previous.has(word));const picked=shuffle(available.length>=count?available:WORD_POOL).slice(0,count);previousWords=picked;try{localStorage.setItem('scribble-last-words',JSON.stringify(picked))}catch{}return picked}
function save(){try{localStorage.setItem('scribble-settings',JSON.stringify({words:$('words').value,mode:$('wordMode').value,playMode:$('playMode').value,count:selectedCount(),interval:$('interval').value}))}catch{}}
try{const s=JSON.parse(localStorage.getItem('scribble-settings')||'null');$('playMode').value=s?.playMode==='host'?'host':'solo';$('questionCount').value=Number.isInteger(s?.count)&&s.count>=1&&s.count<=50?s.count:20;$('words').value=s?.words||defaults.join('\n');$('wordMode').value=s?.mode==='custom'?'custom':'random';$('interval').value=s?.interval||3}catch{$('playMode').value='solo';$('questionCount').value=20;$('words').value=defaults.join('\n');$('wordMode').value='random'}
function modeUI(){$('start').innerHTML=$('playMode').value==='host'?'방장 모드 시작 <span>↗</span>':'학습 시작 <span>↗</span>';const count=selectedCount();$('countLabel').textContent=count+'개';$('headlineCount').textContent=count;$('wordBadge').textContent=count+' WORDS';$('customHint').textContent=`한 줄에 하나씩, ${count}개를 입력해 주세요. 매번 무작위 순서로 번호가 배정돼요.`;$('customWords').hidden=$('wordMode').value!=='custom';$('poolInfo').textContent=`일상 단어 ${WORD_POOL.length}개에서 ${count}개를 뽑아요. 바로 전 학습의 단어는 제외해요.`;$('poolInfo').hidden=$('wordMode').value==='custom'}
function intervalLabel(){$('seconds').textContent=$('interval').value+'초'}intervalLabel();modeUI();['words','interval','wordMode','questionCount','playMode'].forEach(id=>$(id).addEventListener('input',()=>{save();intervalLabel();modeUI()}));
$('defaults').onclick=()=>{$('words').value=[...new Set([...defaults,...WORD_POOL])].slice(0,selectedCount()).join('\n');save()};
function screen(id){['setup','learn','ready','test','result','host'].forEach(x=>$(x).hidden=x!==id);window.scrollTo(0,0)}
function stop(){stopHost();run++;clearTimeout(timer);synth?.cancel();speaking=false;currentUtterance=null}
document.querySelectorAll('.home').forEach(b=>b.onclick=()=>{stop();screen('setup')});
function speak(text,done){if(!synth||!window.SpeechSynthesisUtterance){$('audioMessage').textContent='이 브라우저는 TTS를 지원하지 않아 단어만 표시합니다.';done();return}const token=run;const u=new SpeechSynthesisUtterance(text);currentUtterance=u;u.lang='ko-KR';u.rate=0.9;u.voice=synth.getVoices().find(v=>v.lang===u.lang)||null;let finished=false;const finish=()=>{if(finished||token!==run)return;finished=true;done()};u.onend=finish;u.onerror=()=>{$('audioMessage').textContent='음성을 재생하지 못했어요. 기기 음성 설정을 확인하거나 다시 듣기를 눌러 주세요.';finish()};synth.speak(u)}
function maybeAdvance(){if(!paused&&!speaking&&elapsed){pos++;if(pos===mapping.length){stop();$('readyTitle').textContent=mapping.length+'개 단어를 모두 만났어요!';screen('ready')}else showWord()}}
function schedule(ms){remaining=ms;started=Date.now();const token=run;timer=setTimeout(()=>{if(token!==run)return;elapsed=true;maybeAdvance()},ms)}
const numberDigits=['','일','이','삼','사','오','육','칠','팔','구'];
function koreanNumber(n){return n<10?numberDigits[n]:(n<20?'':numberDigits[Math.floor(n/10)])+'십'+numberDigits[n%10]}
function numberedWord(){return `${koreanNumber(pos+1)} 번, ${mapping[pos]}`}
function showWord(){clearTimeout(timer);elapsed=false;speaking=true;$('learnCount').textContent=`${pos+1} / ${mapping.length}`;$('learnNumber').textContent=pos+1;$('learnWord').textContent=mapping[pos];$('bar').style.width=((pos+1)/mapping.length*100)+'%';schedule(Number($('interval').value)*1000);speak(numberedWord(),()=>{speaking=false;maybeAdvance()})}
$('start').onclick=()=>{const count=selectedCount();const custom=$('wordMode').value==='custom';const words=custom?$('words').value.split(/\r?\n/).map(s=>s.trim()).filter(Boolean):drawWords();if(words.length!==count){$('setupError').textContent=`단어를 정확히 ${count}개 입력해 주세요. 현재 ${words.length}개입니다.`;return}$('setupError').textContent='';save();stop();mapping=shuffle(words);if($('playMode').value==='host'){showHost();return}pos=0;paused=false;$('pause').textContent='일시정지';$('audioMessage').textContent='휴대폰의 소리를 켜 주세요. 학습 중에는 이 화면을 유지해 주세요.';screen('learn');showWord()};
$('pause').onclick=()=>{if(!paused){paused=true;remaining=Math.max(0,remaining-(Date.now()-started));clearTimeout(timer);run++;synth?.cancel();speaking=false;$('pause').textContent='계속하기'}else{paused=false;$('pause').textContent='일시정지';speaking=true;elapsed=false;schedule(remaining);speak(numberedWord(),()=>{speaking=false;maybeAdvance()})}};
$('repeat').onclick=()=>{clearTimeout(timer);run++;synth?.cancel();paused=false;$('pause').textContent='일시정지';showWord()};
function startTest(){stop();order=shuffle(Array.from({length:mapping.length},(_,i)=>i));quizPos=0;firstCorrect=0;screen('test');question()}
function question(){attempted=false;resolved=false;$('quizNumber').textContent=order[quizPos]+1;$('testCount').textContent=`${quizPos+1} / ${mapping.length}`;$('answer').value='';$('answer').disabled=false;$('check').disabled=false;$('feedback').textContent='';$('feedback').className='';$('retry').hidden=true;$('next').hidden=true;$('reveal').hidden=false;$('next').textContent=quizPos===mapping.length-1?'결과 보기 →':'다음 번호 →'}
const normalize=s=>s.normalize('NFKC').trim().replace(/\s+/g,' ').toLocaleLowerCase();
$('answerForm').onsubmit=e=>{e.preventDefault();if(resolved)return;if(!$('answer').value.trim()){$('feedback').textContent='정답을 먼저 입력해 주세요.';return}if(normalize($('answer').value)===normalize(mapping[order[quizPos]])){if(!attempted)firstCorrect++;resolved=true;$('feedback').textContent='정답이에요! 잘 기억했어요. ✦';$('feedback').className='good';$('next').hidden=false;$('retry').hidden=true;$('reveal').hidden=true;$('answer').disabled=true;$('check').disabled=true}else{attempted=true;$('feedback').textContent='아쉬워요. 다시 떠올려 볼까요?';$('feedback').className='bad';$('retry').hidden=false}};
$('retry').onclick=()=>{$('answer').value='';$('feedback').textContent='다시 도전해 보세요.';$('answer').focus()};
$('reveal').onclick=()=>{attempted=true;resolved=true;$('feedback').textContent='정답: '+mapping[order[quizPos]];$('feedback').className='';$('next').hidden=false;$('retry').hidden=true;$('reveal').hidden=true;$('answer').disabled=true;$('check').disabled=true};
$('next').onclick=()=>{quizPos++;if(quizPos===mapping.length){$('score').textContent=firstCorrect+' / '+mapping.length;$('answers').replaceChildren(...mapping.map(word=>{const li=document.createElement('li');li.textContent=word;return li}));screen('result')}else question()};$('testStart').onclick=startTest;$('testAgain').onclick=startTest;window.addEventListener('pagehide',stop);

let hostPlaying=false,hostTimer=null,hostSession=0,hostAudio=null,hostTone=null;
function hostButton(){
  $('hostToggle').textContent=hostPlaying?'Ⅱ':'▶';
  $('hostToggle').ariaLabel=hostPlaying?'삐 소리 일시정지':'삐 소리 재생';
  $('hostToggle').ariaPressed=String(hostPlaying);
}
function stopHost(){
  hostPlaying=false;hostSession++;clearTimeout(hostTimer);hostTimer=null;
  if(hostTone){try{hostTone.stop()}catch{}hostTone=null}
  hostButton();
}
function showHost(){
  const seconds=Number($('interval').value);
  $('hostSummary').textContent=mapping.length+'개 단어 · '+seconds+'초 간격';
  $('hostStatus').textContent='재생 버튼을 누르면 '+seconds+'초마다 삐 소리가 납니다. 단어는 방장이 직접 읽어 주세요.';
  $('hostWords').replaceChildren(...mapping.map((word,i)=>{
    const item=document.createElement('li');
    const number=document.createElement('span');number.className='host-number';number.textContent=i+1;
    const label=document.createElement('span');label.textContent=word;
    item.append(number,label);return item;
  }));
  screen('host');hostButton();
}
function hostBeep(){
  const audio=hostAudio,now=audio.currentTime;
  const oscillator=audio.createOscillator(),gain=audio.createGain();
  oscillator.type='sine';oscillator.frequency.value=880;
  gain.gain.setValueAtTime(0,now);
  gain.gain.linearRampToValueAtTime(0.18,now+0.01);
  gain.gain.setValueAtTime(0.18,now+0.10);
  gain.gain.linearRampToValueAtTime(0,now+0.15);
  oscillator.connect(gain);gain.connect(audio.destination);hostTone=oscillator;
  oscillator.onended=()=>{oscillator.disconnect();gain.disconnect();if(hostTone===oscillator)hostTone=null};
  oscillator.start(now);oscillator.stop(now+0.16);
}
function scheduleHost(session){
  hostTimer=setTimeout(()=>{
    if(!hostPlaying||session!==hostSession)return;
    try{hostBeep();scheduleHost(session)}catch{stopHost();$('hostStatus').textContent='소리를 재생하지 못했어요. 재생 버튼을 다시 눌러 주세요.'}
  },Number($('interval').value)*1000);
}
$('hostToggle').onclick=async()=>{
  if(hostPlaying){stopHost();$('hostStatus').textContent='일시정지했어요. 삐 소리가 멈췄습니다.';return}
  const Audio=window.AudioContext||window.webkitAudioContext;
  if(!Audio){$('hostStatus').textContent='이 브라우저는 알림음을 지원하지 않습니다.';return}
  hostPlaying=true;const session=++hostSession;hostButton();
  try{
    if(!hostAudio||hostAudio.state==='closed')hostAudio=new Audio();
    if(hostAudio.state!=='running')await hostAudio.resume();
    if(!hostPlaying||session!==hostSession)return;
    if(hostAudio.state!=='running')throw Error('Audio unavailable');
    $('hostStatus').textContent=$('interval').value+'초마다 삐 소리가 납니다. 멈추려면 왼쪽 위 일시정지 버튼을 누르세요.';
    scheduleHost(session);
  }catch{if(session===hostSession){stopHost();$('hostStatus').textContent='소리를 시작하지 못했어요. 재생 버튼을 다시 눌러 주세요.'}}
};
