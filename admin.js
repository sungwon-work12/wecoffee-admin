<style>
/* ── ③ 슬라이더 오터치 방지 ──────────────────────────────
   세로 스크롤 제스처는 페이지 스크롤로, 가로 드래그만 슬라이더로.
   (스크롤 중 트랙을 스치며 15로 튀는 현상 차단) */
.wc-isc-track input[type=range]{ touch-action:pan-y; }
/* ── ② 원두 전환 가독성 ────────────────────────────────── */
/* 스티키 헤더/탭 밑으로 숨지 않게 스크롤 시 여백 확보 */
.wc-acc{ scroll-margin-top:76px; }
/* 접힌 헤더도 '누를 수 있다'는 게 분명히 보이도록(색은 기존 톤 그대로) */
.wc-acc-head{ cursor:pointer; transition:background .12s ease; }
.wc-acc:not(.open) .wc-acc-head:hover{ background:var(--section-bg,#f9fafb); }
/* ※ 열린 원두 강조색(주황 등)은 손대지 않음 — 임베드 A의 기존 다크그레이 톤 유지 */
/* "다음 원두" 버튼 (푸터에 주입) — 세컨더리 톤 */
.wc-nextbean{
  display:inline-flex; align-items:center; gap:4px;
  margin-left:8px; padding:0 14px; height:40px;
  border:1px solid var(--border,#e8eaed); border-radius:12px;
  background:#fff; color:var(--text-secondary,#4e5968);
  font-size:14px; font-weight:600; cursor:pointer;
  transition:background .12s ease,border-color .12s ease;
}
.wc-nextbean:hover{ background:var(--surface-2,#f8f9fb); border-color:#d1d6db; }
.wc-nextbean .wc-nb-chev{ font-size:16px; line-height:1; color:var(--text-tertiary,#8b95a1); }
/* 푸터가 좁을 때 줄바꿈 허용 */
.wc-cva-foot{ flex-wrap:wrap; row-gap:8px; }
/* ── ④ 모바일에서 원두(커피) 헤더 키우기 ─────────────────────
   "커피 바꾸는 걸 한참 찾았다 · 글씨 작다"는 지적 대응.
   번호 뱃지·이름을 키워 접힌 원두 목록이 한눈에 스캔되도록. */
@media (max-width:860px){
  .wc-acc-head{ padding:18px 16px; }
  .wc-acc-num{ width:30px; height:30px; border-radius:9px; font-size:14px; }
  .wc-acc-name{ font-size:16px; }
  .wc-acc.open .wc-acc-name{ font-size:17px; }
  .wc-acc-chev{ font-size:22px; }
  .wc-nextbean{ height:46px; font-size:15px; padding:0 16px; }
}

/* ══════════════════════════════════════════════════════════
   ⑤ 반응형 "짤림" 방어 (특정 기기에서 화면이 잘리는 문제)
   · (1) 가로 넘침: 입력창 등 플렉스 자식이 안 줄어들어 형제('추가' 버튼 등)를
        화면 밖으로 밀어내던 문제 → .wc 안 모든 요소 min-width:0
        (고정폭 라벨은 flex-shrink:0 이라 영향 없이 그대로 유지)
   · (2) 하단 버튼·영역이 iOS 주소창/홈인디케이터 뒤로 가려짐 → safe-area + 100dvh
   · 320/390px 렌더·측정으로 검증됨. 콘텐츠를 지우거나 자르지 않음.
   ══════════════════════════════════════════════════════════ */
.wc *{ min-width:0; }
.wc .wc-noteinput input{ min-width:0; }
.wc .wc-acc-name, .wc .wc-note-chip, .wc .wc-chip, .wc .wc-tag{ overflow-wrap:anywhere; }
@media (max-width:860px){
  .wc .wc-wheel-svg, .wc .wc-wheel-svg svg{ max-width:100% !important; }
  .wc .wc-wheel-host-wrapper{ max-width:100%; }
  .wc{ padding-bottom:calc(96px + env(safe-area-inset-bottom, 0px)) !important; }
}
.wc-result-overlay{ padding-bottom:calc(24px + env(safe-area-inset-bottom, 0px)) !important; }
.wc-result-card{ max-height:calc(100dvh - 120px - env(safe-area-inset-bottom, 0px)) !important; }
</style>
<script>
(function(){
  if(window.__wcNextBeanReady) return;   // 중복 로드 방지
  window.__wcNextBeanReady = true;
  var LABEL_NEXT = '다음 원두';
  // 열린 아코디언 → 다음 아코디언 헤더를 클릭(= 임베드 C 내부 로직 그대로 실행)
  function goNext(fromAcc){
    var lineup = fromAcc.parentNode;
    if(!lineup) return;
    var accs = Array.prototype.slice.call(lineup.querySelectorAll('.wc-acc'));
    var idx = accs.indexOf(fromAcc);
    if(idx < 0 || idx >= accs.length - 1) return;   // 마지막이면 무동작
    var next = accs[idx + 1];
    var head = next.querySelector('.wc-acc-head');
    if(!head) return;
    // 이미 열려 있으면 토글로 닫히지 않도록 클릭 스킵하고 스크롤만
    if(!next.classList.contains('open')){ head.click(); }
    setTimeout(function(){
      try{ next.scrollIntoView({behavior:'smooth', block:'start'}); }catch(e){ next.scrollIntoView(); }
    }, 60);
  }
  // 클릭은 이벤트 위임 한 번으로 처리(재렌더에도 안전)
  document.addEventListener('click', function(ev){
    var btn = ev.target.closest && ev.target.closest('.wc-nextbean');
    if(!btn) return;
    ev.preventDefault();
    var acc = btn.closest('.wc-acc');
    if(acc) goNext(acc);
  });
  // 각 원두 푸터에 "다음 원두" 버튼을 보장(마지막 원두는 제외)
  function ensureButtons(){
    var lineup = document.getElementById('wcLineup');
    if(!lineup) return;
    var accs = lineup.querySelectorAll('.wc-acc');
    accs.forEach(function(acc, i){
      var foot = acc.querySelector('.wc-cva-foot');
      if(!foot) return;
      var has = foot.querySelector('.wc-nextbean');
      var isLast = (i === accs.length - 1);
      if(isLast){ if(has) has.remove(); return; }
      if(has) return;
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'wc-nextbean';
      b.innerHTML = LABEL_NEXT + ' <span class="wc-nb-chev">›</span>';
      foot.appendChild(b);
    });
  }
  // 렌더/재렌더 감지: rAF 디바운스로 과호출 방지
  var scheduled = false;
  function schedule(){
    if(scheduled) return; scheduled = true;
    requestAnimationFrame(function(){ scheduled = false; try{ ensureButtons(); }catch(e){} });
  }
  function boot(){
    var lineup = document.getElementById('wcLineup');
    if(lineup){
      try{ new MutationObserver(schedule).observe(lineup, {childList:true, subtree:true}); }catch(e){}
    }else{
      // 아직 없으면 body 관찰하다가 생기면 붙음
      try{ new MutationObserver(function(){ if(document.getElementById('wcLineup')) schedule(); }).observe(document.body, {childList:true, subtree:true}); }catch(e){}
    }
    schedule();
  }
  if(document.readyState === 'loading'){ document.addEventListener('DOMContentLoaded', boot); }
  else{ boot(); }
})();

/* ══════════════════════════════════════════════════════════
   ⑤ 하단 짤림 방어: 전체화면으로 띄우는 패널이 inline 으로 100vh 를 걸어
   iOS 주소창 뒤로 잘리는 경우 → 지원 기기에서 100dvh 로 자동 교체 + safe-area
   ══════════════════════════════════════════════════════════ */
(function(){
  if(window.__wcCutFixReady) return;
  window.__wcCutFixReady = true;
  var canDvh = false;
  try { canDvh = window.CSS && CSS.supports && CSS.supports("height","100dvh"); } catch(e){}
  if(!canDvh) return;
  function fix(el){
    if(!el || !el.style || typeof el.style.getPropertyValue !== "function") return;
    try{
      var mh = el.style.getPropertyValue("max-height") || "";
      var h  = el.style.getPropertyValue("height") || "";
      if(mh.indexOf("100vh") >= 0){
        el.style.setProperty("max-height","100dvh","important");
        if(!el.getAttribute("data-wc-safe")){
          el.style.setProperty("padding-bottom","env(safe-area-inset-bottom, 0px)","important");
          el.setAttribute("data-wc-safe","1");
        }
      }
      if(h.indexOf("100vh") >= 0) el.style.setProperty("height","100dvh","important");
    }catch(e){}
  }
  function scan(){ try{ document.querySelectorAll('[style*="100vh"]').forEach(fix); }catch(e){} }
  try{
    new MutationObserver(function(muts){
      for(var i=0;i<muts.length;i++){ var t = muts[i].target; if(t && t.style) fix(t); }
    }).observe(document.documentElement, {subtree:true, attributes:true, attributeFilter:["style"]});
  }catch(e){}
  scan();
  var n = 0, iv = setInterval(function(){ scan(); if(++n > 40) clearInterval(iv); }, 500);
  document.addEventListener("wc:authed", function(){ setTimeout(scan, 400); });
})();
</script>
