// ==========================================
// 1. 시스템 초기화 및 글로벌 변수 세팅
// ==========================================
const { createClient } = supabase;
const supabaseClient = createClient('https://dqvzowmhxorxhiqoibmk.supabase.co', 'sb_publishable_DSi3rGnuQhy6OtML_3ukEA_7ptfaoK-');

const $ = id => document.getElementById(id), $$ = q => document.querySelector(q), $$$ = q => document.querySelectorAll(q);
let globalApps=[], globalMembers=[], gRes=[], gTrn=[], gOrd=[], gBlk=[];
let isInsightView = false;
let currentCalDate = new Date(); 
let currentScheduleAppId = null;
let currentBlockId = null; 
let pendingOptionData = null;
let currentGlobalCenter = '전체';
let currentDashView = 'week';
let currentDashMonthOffset = 0; 
let currentAppDashView = 'week'; 
let appDashMonthOffset = 0; 
let currentSummaryData = []; 
let currentInsightData = {}; 

const equipList = ["이지스터 800(신형)-1", "이지스터 800(신형)-2", "이지스터 800(구형)-3", "이지스터 800(구형)-4", "이지스터 1.8", "스트롱홀드 S7X", "아스토리아 스톰 2그룹", "브루잉존", "커핑존", "스터디존"];

// ==========================================
// 2. 유틸리티 함수 (날짜, 요일, 포맷팅, 토스트)
// ==========================================
window.getHoliday = function(y, m, d) {
  const holidays = {
    '2026-01-01': '신정', '2026-02-16': '설날 연휴', '2026-02-17': '설날', '2026-02-18': '대체공휴일',
    '2026-03-01': '삼일절', '2026-03-02': '대체공휴일', '2026-05-05': '어린이날',
    '2026-05-24': '부처님오신날', '2026-05-25': '대체공휴일', '2026-06-06': '현충일',
    '2026-08-15': '광복절', '2026-09-24': '추석 연휴', '2026-09-25': '추석', '2026-09-26': '추석 연휴',
    '2026-10-03': '개천절', '2026-10-09': '한글날', '2026-12-25': '기독탄신일'
  };
  let key = `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
  return holidays[key] || null;
};

// 🔥 요일 구하는 마법의 함수 추가
function getDow(dStr) {
  if(!dStr) return '';
  const d = new Date(dStr.replace(/-/g, '/'));
  if(isNaN(d.getTime())) return '';
  return ['일','월','화','수','목','금','토'][d.getDay()];
}

function formatDtWithDow(dateStr) {
  if(!dateStr) return "-"; 
  const d = new Date(dateStr); 
  if(isNaN(d.getTime())) return dateStr;
  const dow = ['일','월','화','수','목','금','토'][d.getDay()];
  return `${d.getFullYear().toString().slice(-2)}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')}(${dow}) ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`; 
}

function formatDt(dateStr) { if(!dateStr) return "-"; const d = new Date(dateStr); return `${d.getFullYear().toString().slice(-2)}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`; }
function comma(str) { return Number(String(str).replace(/[^0-9]/g, '')).toLocaleString(); }
function copyTxt(txt) { let t = document.createElement("textarea"); t.value = txt; t.style.position = "fixed"; t.style.top = "-9999px"; document.body.appendChild(t); t.select(); document.execCommand("copy"); document.body.removeChild(t); showToast("상품명이 복사되었습니다."); }
function showToast(msg) { const toast = $("toast"); toast.innerText = msg; toast.classList.add('show'); setTimeout(() => toast.classList.remove('show'), 2500); }

// ==========================================
// 3. 구글 캘린더 연동
// ==========================================
window.fetchGoogleCalendarEvents = async function(yyyy, mm) {
  const API_KEY = 'AIzaSyAjtrSlv56VPhtqMYGsQd0L4q1AlZTW1Ng';
  const CALENDAR_ID = 'wecoffeekorea@gmail.com';
  try {
    const timeMin = new Date(yyyy, mm - 1, 1).toISOString();
    const timeMax = new Date(yyyy, mm, 0, 23, 59, 59).toISOString();
    const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(CALENDAR_ID)}/events?key=${API_KEY}&timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&orderBy=startTime`;
    const response = await fetch(url);
    if (!response.ok) return [];
    const data = await response.json();
    let formattedEvents = (data.items || []).map(event => {
      let dateStr, timeStr;
      if (event.start.date) { dateStr = event.start.date; timeStr = '종일'; } 
      else if (event.start.dateTime) { dateStr = event.start.dateTime.split('T')[0]; timeStr = event.start.dateTime.split('T')[1].substring(0, 5); } 
      else return null;
      return { date: dateStr, time: timeStr, start: timeStr, text: event.summary || '일정', type: 'google' };
    }).filter(Boolean);
    return formattedEvents;
  } catch (error) { return []; }
};

// ==========================================
// 4. 인증, 탭 전환 및 리얼타임 동기화
// ==========================================
document.addEventListener("DOMContentLoaded", function() {
  supabaseClient.auth.onAuthStateChange((event, session) => {
    if (session) { 
      var lv = $("login-view"); if(lv) lv.classList.remove('active'); 
      var dv = $("dashboard-view"); if(dv) dv.style.display = 'block'; 
      let savedMain = localStorage.getItem('wecoffee_main_tab') || 'page-center';
      let savedSub = localStorage.getItem('wecoffee_sub_tab') || 'sub-res';
      let mainEl = document.querySelector(`.gnb-item[onclick*="${savedMain}"]`);
      if(mainEl) switchMainTab(savedMain, mainEl);
      else switchMainTab('page-center', document.querySelector(`.gnb-item[onclick*="page-center"]`));
      if(savedMain === 'page-center') {
          let subEl = document.querySelector(`.sub-item[onclick*="${savedSub}"]`);
          if(subEl) switchSubTab(savedSub, subEl);
      }
    } else { 
      var lv = $("login-view"); if(lv) lv.classList.add('active'); 
      var dv = $("dashboard-view"); if(dv) dv.style.display = 'none'; 
    }
  });
});

const handleRealtime = (payload) => {
  const table = payload.table;
  if (payload.eventType === 'INSERT') {
     if(table === 'orders' && $("ordTabBtn")) $("ordTabBtn").classList.add("tab-pulse");
     if(table === 'reservations' && $("resTabBtn")) $("resTabBtn").classList.add("tab-pulse");
     if(table === 'trainings' && $("trnTabBtn")) $("trnTabBtn").classList.add("tab-pulse");
  }
  if (['reservations', 'trainings', 'orders', 'blocks'].includes(table) && typeof fetchCenterData === 'function') fetchCenterData();
  if (table === 'applications' && typeof fetchApplications === 'function') fetchApplications();
  if (table === 'members' && typeof fetchMembers === 'function') fetchMembers();
};

supabaseClient.channel('admin-realtime').on('postgres_changes', { event: '*', schema: 'public', table: 'reservations' }, handleRealtime).on('postgres_changes', { event: '*', schema: 'public', table: 'trainings' }, handleRealtime).on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, handleRealtime).on('postgres_changes', { event: '*', schema: 'public', table: 'blocks' }, handleRealtime).on('postgres_changes', { event: '*', schema: 'public', table: 'applications' }, handleRealtime).on('postgres_changes', { event: '*', schema: 'public', table: 'members' }, handleRealtime).subscribe();

function switchMainTab(pageId, element) {
  $$$(".page").forEach(p => p.classList.remove('active')); $(pageId).classList.add('active');
  $$$(".gnb-item").forEach(item => item.classList.remove('active')); 
  let targetEl = element || document.querySelector(`.gnb-item[onclick*="${pageId}"]`);
  if(targetEl) targetEl.classList.add('active');
  localStorage.setItem('wecoffee_main_tab', pageId);
  if(pageId === 'page-center') fetchCenterData();
  if(pageId === 'page-applications') { fetchApplications(); isInsightView = false; $("app-table-area").style.display = "block"; $("app-insight-area").style.display = "none"; $("insightToggleBtn").innerText = "인사이트 보기"; $("app-subtitle").innerText = "유입된 신청 내역의 상태를 관리하고 상담 일정을 확정합니다."; }
  if(pageId === 'page-members') fetchMembers();
}

function switchSubTab(subId, element) {
  $$$(".sub-page").forEach(p => p.classList.remove('active')); $(subId).classList.add('active');
  $$$(".sub-item").forEach(item => item.classList.remove('active')); 
  let targetEl = element || document.querySelector(`.sub-item[onclick*="${subId}"]`);
  if(targetEl) { targetEl.classList.add('active'); targetEl.classList.remove("tab-pulse"); }
  localStorage.setItem('wecoffee_sub_tab', subId);
  if(subId === 'sub-res') renderDashboard(); 
}

async function handleLogin(e) { e.preventDefault(); const email = $("loginEmail").value, password = $("loginPassword").value; const { error } = await supabaseClient.auth.signInWithPassword({ email, password }); if (error) showToast("접근 권한이 없습니다."); else showToast("접속되었습니다."); }
async function handleLogout() { await supabaseClient.auth.signOut(); showToast("로그아웃 되었습니다."); }

// ==========================================
// 5. 공통 커스텀 모달 (브라우저 기본 Alert/Confirm 대체)
// ==========================================
window.openCustomConfirm = function(title, statusHtml, statusBg, statusColor, actionHtml, callback) {
    $("confirmTarget").innerHTML = title;
    const stEl = $("confirmStatus");
    if(statusHtml) { stEl.style.display = 'inline-block'; stEl.innerHTML = statusHtml; stEl.style.background = statusBg || '#F2F4F6'; stEl.style.color = statusColor || 'var(--text-secondary)'; } 
    else { stEl.style.display = 'none'; }
    $("confirmAction").innerHTML = actionHtml;
    window.currentConfirmCallback = callback;
    $("confirmModal").classList.add('show');
}
function closeConfirmModal() { $("confirmModal").classList.remove('show'); window.currentConfirmCallback = null; }
$("confirmBtn").onclick = async function() { if (window.currentConfirmCallback) await window.currentConfirmCallback(); closeConfirmModal(); };
function closeOnBackdrop(event, modalId) { if (event.target.id === modalId) $(modalId).classList.remove('show'); }

// ==========================================
// 6. 센터 관리 데이터 로드 및 UI 렌더링
// ==========================================
function applyGlobalCenter() { currentGlobalCenter = document.querySelector('input[name="globalCenter"]:checked').value; renderCenterData(); renderDashboard(); }
function toggleDashView(view) { currentDashView = view; if(view === 'month') { $("dashMonthNav").style.display = 'flex'; } else { $("dashMonthNav").style.display = 'none'; currentDashMonthOffset = 0; } renderDashboard(); }
function changeDashMonth(offset) { currentDashMonthOffset += offset; renderDashboard(); }
function resetDashMonth() { currentDashMonthOffset = 0; renderDashboard(); }

async function fetchCenterData() {
  try {
    const [res, trn, ord, blk] = await Promise.all([
      supabaseClient.from('reservations').select('*').order('created_at', {ascending: false}),
      supabaseClient.from('trainings').select('*').order('created_at', {ascending: false}),
      supabaseClient.from('orders').select('*').order('created_at', {ascending: false}),
      supabaseClient.from('blocks').select('*').order('block_date', {ascending: false})
    ]);
    gRes = res.data||[]; gTrn = trn.data||[]; gOrd = ord.data||[]; gBlk = blk.data||[];
    let bSet = new Set(); gRes.forEach(r => { if(r.batch) bSet.add(r.batch); }); gTrn.forEach(t => { if(t.batch) bSet.add(t.batch); });
    let bHtml = `<option value="전체">전체 기수</option>` + Array.from(bSet).sort().map(b=>`<option value="${b}">${b}</option>`).join("");
    if($("dashBatchFilter").innerHTML !== bHtml) $("dashBatchFilter").innerHTML = bHtml;
    renderCenterData(); renderDashboard(); updateSmartBadges();
  } catch(e) { console.error("데이터 로드 에러:", e); }
}

function updateSmartBadges() { let pendingOrders = gOrd.filter(o => o.status === '주문 접수' || o.status === '입금 대기' || o.status === '입금 확인').length; let tab = $("ordTabBtn"); if(pendingOrders > 0 && tab) tab.classList.add('tab-pulse'); else if (tab) tab.classList.remove('tab-pulse'); }
function toggleAll(source, className) { $$$("." + className).forEach(chk => { if(!chk.disabled) chk.checked = source.checked; }); }
function isToday(dateStr) { const d = new Date(dateStr); const td = new Date(); return d.getDate() === td.getDate() && d.getMonth() === td.getMonth() && d.getFullYear() === td.getFullYear(); }

function updateDailyInOutBanner() {
  let td = new Date(); let ds = `${td.getFullYear()}-${String(td.getMonth()+1).padStart(2,'0')}-${String(td.getDate()).padStart(2,'0')}`;
  const getDailyEvents = (centerFilter) => {
    let evts = [];
    gRes.forEach(r => { if(r.res_date === ds && r.center === centerFilter && !r.status.includes('취소')) { let st = String(r.res_time||"").split('~')[0].trim(); let en = String(r.res_time||"").split('~')[1]?.trim() || ''; let spc = String(r.space_equip||"").split(' ')[0]; evts.push({ start: st, end: en, name: r.name, space: spc }); } });
    gTrn.forEach(t => { let p = String(t.content||"").split(' || '); if(p.length >= 5 && p[0].trim() === ds && p[3].trim() === centerFilter && !t.status.includes('취소')) { let st = String(p[2]||"").split('~')[0].trim(); let en = String(p[2]||"").split('~')[1]?.trim() || ''; let spc = p[4]; evts.push({ start: st, end: en, name: t.name, space: spc }); } });
    return evts;
  };
  let centers = currentGlobalCenter === '전체' ? ['마포 센터', '광진 센터'] : [currentGlobalCenter];
  let html = ``;
  centers.forEach(c => {
    let evts = getDailyEvents(c);
    if(evts.length === 0) { html += `<div class="inout-card"><div style="font-weight:800; margin-bottom:8px; color:var(--text-display); border-bottom:1px solid var(--border-strong); padding-bottom:8px;">${c}</div><div style="font-size:13px; color:var(--text-secondary); padding:8px 0;">오늘 확정된 일정이 없습니다.</div></div>`; } 
    else { evts.sort((a,b) => String(a.start||'').localeCompare(String(b.start||''))); let first = evts[0]; evts.sort((a,b) => String(b.end||'').localeCompare(String(a.end||''))); let last = evts[evts.length-1]; html += `<div class="inout-card"><div style="font-weight:800; font-size:15px; margin-bottom:12px; color:var(--text-display); border-bottom:1px solid var(--border-strong); padding-bottom:8px;">${c}</div><div style="display:flex; flex-direction:column; gap:8px; font-size:14px; font-weight:600;"><div style="display:flex; align-items:center;"><span style="color:var(--primary); background:var(--primary-light); padding:2px 8px; border-radius:4px; font-size:12px; margin-right:8px;">첫 입실</span> <span style="font-size:16px; font-weight:800; width:50px;">${first.start}</span> <span style="font-weight:500; color:var(--text-secondary);">[${first.space}] ${first.name}</span></div><div style="display:flex; align-items:center;"><span style="color:var(--error); background:#fff0f0; padding:2px 8px; border-radius:4px; font-size:12px; margin-right:8px;">최종 퇴실</span> <span style="font-size:16px; font-weight:800; width:50px;">${last.end}</span> <span style="font-weight:500; color:var(--text-secondary);">[${last.space}] ${last.name}</span></div></div></div>`; }
  });
  if($("dailyInOutBanner")) $("dailyInOutBanner").innerHTML = html;
}

// 🔥 금액 입력 시 '입금 대기' 0.1초 즉시 변경 처리 함수
window.handlePriceInput = async function(id, val, currentStatus) {
  let formatted = val ? comma(val) + '원' : '';
  let updates = { total_price: formatted };
  if (val && currentStatus === '주문 접수') updates.status = '입금 대기';
  const { error } = await supabaseClient.from('orders').update(updates).eq('id', id);
  if (error) showToast("저장 실패"); else { showToast("업데이트 되었습니다."); fetchCenterData(); }
}

function renderCenterData() {
  const oneMonthAgo = new Date(); oneMonthAgo.setDate(oneMonthAgo.getDate() - 30); 
  const now = new Date();
  updateDailyInOutBanner();

  let qRes = ($("searchRes")?.value || "").toLowerCase(); 
  let fRes = gRes.filter(r => { let rDate = new Date(r.res_date || r.created_at); return (rDate >= oneMonthAgo) && (currentGlobalCenter === '전체' || r.center === currentGlobalCenter) && (`${r.name} ${r.phone}`.toLowerCase().includes(qRes)); });
  
  $("resTableBody").innerHTML = fRes.length ? fRes.map(r=>{ 
    let actBtn = r.status.includes('취소') ? '' : `<button class="btn-outline btn-sm" onclick="cancelAction('reservations', '${r.id}')">취소</button>`; 
    let displayStatus = r.status;
    let endTimeStr = String(r.res_time||"").split('~')[1];
    if (endTimeStr && r.res_date && !r.status.includes('취소')) {
        let [hh, mm] = endTimeStr.trim().split(':');
        let resEndObj = new Date(`${r.res_date}T${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}:00`);
        if (resEndObj < now) displayStatus = '이용완료';
    }
    let badgeClass = displayStatus.includes('취소') ? 'badge-red' : (displayStatus === '이용완료' ? 'badge-gray' : (displayStatus === '예약완료' ? 'badge-green' : 'badge-gray'));
    let dow = getDow(r.res_date);
    let mPreview = `<td class="m-preview has-checkbox" onclick="this.closest('tr').classList.toggle('expanded')"><div class="m-prev-top"><span class="m-prev-date" style="font-weight:700; color:var(--primary); font-size:13px;">[${r.batch||'-'}] ${r.name}</span><span class="status-badge ${badgeClass}">${displayStatus}</span></div><div class="m-prev-title" style="font-size:18px; color:var(--text-display); letter-spacing:-0.5px;">${r.res_date}(${dow}) ${r.res_time}</div><div class="m-prev-desc" style="font-size:13px; font-weight:500;">[${r.center}] ${r.space_equip || '-'}</div><span class="m-toggle-hint">상세 정보 보기 ▼</span></td>`;

    return `<tr>${mPreview}<td data-label="선택" class="tc"><input type="checkbox" class="chk-res" value="${r.id}" ${r.status.includes('취소')?'disabled':''}></td><td data-label="접수일">${formatDt(r.created_at)}</td><td data-label="기수">${r.batch||'-'}</td><td data-label="성함"><strong>${r.name}</strong></td><td data-label="연락처">${r.phone}</td><td data-label="예약일">${r.res_date}</td><td data-label="시간">${r.res_time}</td><td data-label="공간">${r.center} <span class="sub-text">${r.space_equip}</span></td><td data-label="상태" class="tc"><span class="status-badge ${badgeClass}">${displayStatus}</span></td><td data-label="관리">${actBtn}</td></tr>`; 
  }).join("") : `<tr><td colspan="10" class="empty-state">내역 없음</td></tr>`;
  
  let qTrn = ($("searchTrn")?.value || "").toLowerCase(); let fTrnList = gTrn.filter(t => { let tDate = new Date(t.created_at); return (tDate >= oneMonthAgo) && (currentGlobalCenter === '전체' || String(t.content||"").includes(currentGlobalCenter)) && (`${t.name} ${t.phone} ${t.content}`.toLowerCase().includes(qTrn)); });
  
  $("trnTableBody").innerHTML = fTrnList.length ? fTrnList.map(t=>{ 
    let actBtn = t.status.includes('취소') ? '' : `<button class="btn-outline btn-sm" onclick="cancelAction('trainings', '${t.id}')">취소</button>`; 
    let cInfo = String(t.content||'').split(' || ');
    let niceContent = t.content;
    let preDate = cInfo[0]||'-', preTime = cInfo[2]||'-', preCenter = cInfo[3]||'-', preName = cInfo[4]||'-';
    if(cInfo.length >= 5) {
        niceContent = `<div style="margin-bottom:4px; font-size:12px; color:var(--text-secondary);">[${cInfo[3]}] ${cInfo[0]} (${cInfo[2]})</div><div style="font-weight:600; color:var(--text-display); line-height:1.4;">${cInfo[4]} <span style="font-weight:400; color:var(--text-tertiary); margin-left:4px;">- ${cInfo[1]}</span></div>`;
    }
    let dow = getDow(preDate);
    let badgeClass = t.status.includes('취소')?'badge-red':t.status==='접수완료'?'badge-green':'badge-gray';
    let mPreview = `<td class="m-preview has-checkbox" onclick="this.closest('tr').classList.toggle('expanded')"><div class="m-prev-top"><span class="m-prev-date" style="font-weight:700; color:var(--primary); font-size:13px;">[${t.batch||'-'}] ${t.name}</span><span class="status-badge ${badgeClass}">${t.status}</span></div><div class="m-prev-title" style="font-size:18px; color:var(--text-display); letter-spacing:-0.5px;">${preDate}(${dow}) ${preTime}</div><div class="m-prev-desc" style="font-size:13px; font-weight:500;">[${preCenter}] ${preName}</div><span class="m-toggle-hint">상세 정보 보기 ▼</span></td>`;

    return `<tr>${mPreview}<td data-label="선택" class="tc"><input type="checkbox" class="chk-trn" value="${t.id}" ${t.status.includes('취소')?'disabled':''}></td><td data-label="신청일">${formatDt(t.created_at)}</td><td data-label="기수">${t.batch||'-'}</td><td data-label="성함"><strong>${t.name}</strong></td><td data-label="연락처">${t.phone}</td><td data-label="정보">${niceContent}</td><td data-label="상태" class="tc"><span class="status-badge ${badgeClass}">${t.status}</span></td><td data-label="관리">${actBtn}</td></tr>`; 
  }).join("") : `<tr><td colspan="8" class="empty-state">내역 없음</td></tr>`;

  let qOrd = ($("searchOrd")?.value || "").toLowerCase(); let vOrd = $("ordVendorFilter")?.value || "전체"; let isOrdFilter = $("filterPendingOrd")?.checked;
  let fOrd = gOrd.filter(o => { 
      let matchQ = `${o.name} ${o.phone} ${o.vendor} ${o.item_name} ${o.id}`.toLowerCase().includes(qOrd); 
      let matchV = vOrd === '전체' ? true : o.vendor === vOrd; 
      let matchS = isOrdFilter ? (o.status==='주문 접수'||o.status==='입금 대기'||o.status==='입금 확인') : true; 
      return matchQ && matchV && matchS; 
  });
  
  $("ordTableBody").innerHTML = fOrd.length ? fOrd.map(o=>{ 
    let badgeClass = o.status==='주문 취소'?'st-ghosted':o.status==='센터 도착'?'st-completed':o.status==='입금 확인'?'st-confirmed':o.status==='입금 대기'?'st-arranging':'st-wait';
    let mPreview = `<td class="m-preview has-checkbox" onclick="this.closest('tr').classList.toggle('expanded')"><div class="m-prev-top"><span class="m-prev-date">${formatDtWithDow(o.created_at)}</span><span class="status-badge ${badgeClass}">${o.status}</span></div><div class="m-prev-title">[${o.batch||'-'}] ${o.name} <span style="font-size:13px; font-weight:500; color:var(--text-secondary); margin-left:4px;">(${o.quantity})</span></div><div class="m-prev-desc" style="color:var(--text-display); font-weight:600;">[${o.vendor}] ${o.item_name}</div><span class="m-toggle-hint">상세 정보 보기 ▼</span></td>`;

    return `<tr>${mPreview}<td data-label="선택" class="tc"><input type="checkbox" class="chk-ord" value="${o.id}"></td><td data-label="주문일">${formatDt(o.created_at)}</td><td data-label="주문번호">${o.id}</td><td data-label="기수">${o.batch||'-'}</td><td data-label="성함"><strong style="cursor:pointer; text-decoration:underline;" onclick="$('searchOrd').value='${o.name}'; renderCenterData();">${o.name}</strong></td><td data-label="연락처">${o.phone}</td><td data-label="생두사 / 상품명"><div style="display:flex; flex-direction:column; align-items:flex-start; width:100%; gap:4px;"><div style="display:flex; align-items:center; gap:8px;"><a href="${o.url}" target="_blank" style="color:var(--primary);font-weight:800;text-decoration:underline;flex-shrink:0;">${o.vendor}</a><button type="button" class="btn-copy" onclick="copyTxt('${String(o.item_name).replace(/'/g, "\\'")}')">복사</button></div><span class="item-name-clamp" style="color:var(--text-display); font-weight:500; line-height:1.4;">${o.item_name}</span></div></td><td data-label="수량">${o.quantity}</td><td data-label="금액"><input type="text" class="input-search" value="${o.total_price||''}" placeholder="예: 45,000" style="width:100%;padding:8px;text-align:right;font-size:13px;font-weight:600;" onblur="handlePriceInput('${o.id}', this.value, '${o.status}')"></td><td data-label="상태 관리"><div class="action-wrap"><select class="status-select ${badgeClass}" onchange="updateTable('orders','status','${o.id}',this.value)"><option value="주문 접수" ${o.status==='주문 접수'?'selected':''}>주문 접수</option><option value="입금 대기" ${o.status==='입금 대기'?'selected':''}>입금 대기</option><option value="입금 확인" ${o.status==='입금 확인'?'selected':''}>입금 확인</option><option value="센터 도착" ${o.status==='센터 도착'?'selected':''}>센터 도착</option><option value="주문 취소" ${o.status==='주문 취소'?'selected':''}>주문 취소</option></select></div></td></tr>` 
  }).join("") : `<tr><td colspan="10" class="empty-state">내역 없음</td></tr>`;

  let fBlk = gBlk.filter(b => currentGlobalCenter === '전체' || b.center === currentGlobalCenter);
  $("blkTableBody").innerHTML = fBlk.length ? fBlk.map(b=>{ 
    let max = b.capacity || '-'; let current = 0; if(max !== '-') current = gTrn.filter(t => String(t.content||'').includes(b.start_time) && !t.status.includes('취소')).length; let capDisplay = max === '-' ? '-' : `<strong>${max - current}</strong> / ${max}`; 
    let dow = getDow(b.block_date);
    let mPreview = `<td class="m-preview" onclick="this.closest('tr').classList.toggle('expanded')"><div class="m-prev-top"><span class="m-prev-date" style="font-weight:700; color:var(--primary); font-size:13px;">${b.category}</span></div><div class="m-prev-title" style="font-size:18px; color:var(--text-display); letter-spacing:-0.5px;">${b.block_date}(${dow}) ${b.start_time}~${b.end_time}</div><div class="m-prev-desc" style="font-size:13px; font-weight:500;">[${b.center}] ${b.space_equip || '전체'}</div><span class="m-toggle-hint">상세 정보 보기 ▼</span></td>`;

    return `<tr>${mPreview}<td data-label="날짜"><strong>${b.block_date}</strong></td><td data-label="시간">${b.start_time} ~ ${b.end_time}</td><td data-label="구분"><span style="color:var(--primary);font-weight:600;">${b.category}</span></td><td data-label="공간">${b.center} <span class="sub-text">${b.space_equip}</span></td><td data-label="사유">${b.reason}</td><td data-label="정원" class="tc">${capDisplay}</td><td data-label="관리" class="tc"><div class="action-wrap-flex"><button class="btn-outline btn-sm" onclick="editBlock('${b.id}')">수정</button> <button class="btn-outline btn-sm" onclick="deleteBlock('${b.id}')" style="color:var(--error);border-color:var(--error)">삭제</button></div></td></tr>` 
  }).join("") : `<tr><td colspan="7" class="empty-state">내역 없음</td></tr>`;
}

// ==========================================
// 7. 센터 캘린더 대시보드 렌더링
// ==========================================
window.renderMCalCenter = function(selDate) {
    $$$("#dash-content .m-cal-date").forEach(el => el.classList.remove('active'));
    let target = document.getElementById(`m-date-center-${selDate}`);
    if(target) { target.classList.add('active'); target.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' }); }
    let evts = window.centerCalEvts[selDate] || []; evts.sort((a,b) => String(a.start||'').localeCompare(String(b.start||'')));
    let html = '';
    if(evts.length === 0) { html = `<div class="empty-state" style="padding:40px 0;">예정된 일정이 없습니다.</div>`; } 
    else { evts.forEach(e => { let badgeStyle = e.type==='google' ? 'color:#495057;' : 'color:var(--primary);'; html += `<div class="m-cal-card"><div class="m-cal-card-time" style="${badgeStyle}">${e.start || e.time || '종일'}</div><div class="m-cal-card-title">${e.text||''}</div><div class="m-cal-card-desc">${String(e.tooltip||'').split('|')[0]}</div></div>`; }); }
    let listWrap = $("m-cal-list-center"); if(listWrap) listWrap.innerHTML = html;
};

async function renderDashboard() {
  const now = new Date(); let dYear = now.getFullYear(); let dMonth = now.getMonth() + currentDashMonthOffset;
  const focusDate = new Date(dYear, dMonth, 1); const yyyy = focusDate.getFullYear(); const mm = focusDate.getMonth(); const daysInMonth = new Date(yyyy, mm + 1, 0).getDate(); const currDay = now.getDay() || 7; 
  if (currentDashView === 'month' && $("dashMonthTitle")) $("dashMonthTitle").innerText = `${yyyy}년 ${mm + 1}월`;

  let fSpc = $("dashSpaceFilter").value; let fBtc = $("dashBatchFilter").value;
  let filteredRes = gRes.filter(r => (currentGlobalCenter === '전체' || r.center === currentGlobalCenter) && !r.status.includes('취소') && (fSpc === '전체' || String(r.space_equip||'').includes(fSpc)) && (fBtc === '전체' || r.batch === fBtc));
  let filteredBlk = gBlk.filter(b => (currentGlobalCenter === '전체' || b.center === currentGlobalCenter) && (fSpc === '전체' || b.space_equip === fSpc || !b.space_equip || b.space_equip === '전체'));
  let filteredTrn = gTrn.filter(t => { if(t.status.includes('취소') || (fBtc !== '전체' && t.batch !== fBtc)) return false; let parts = String(t.content||"").split(' || '); if(parts.length < 5) return false; if(currentGlobalCenter !== '전체' && parts[3].trim() !== currentGlobalCenter) return false; if(fSpc !== '전체' && !parts[1].includes(fSpc)) return false; return true; });

  let googleEvents = await window.fetchGoogleCalendarEvents(yyyy, mm + 1);
  let calEvts = {};
  
  if (currentDashView === 'week') {
    let weekDates = []; let daysKr = ["일", "월", "화", "수", "목", "금", "토"];
    for(let i = 1; i <= 7; i++) { 
        let dObj = new Date(now.getFullYear(), now.getMonth(), now.getDate() - currDay + i);
        weekDates.push(dObj); calEvts[`${dObj.getFullYear()}-${String(dObj.getMonth()+1).padStart(2,'0')}-${String(dObj.getDate()).padStart(2,'0')}`] = [];
    }
    let matrix = {}; equipList.forEach(eq => { matrix[eq] = {}; weekDates.forEach(wd => { let ds = `${wd.getFullYear()}-${String(wd.getMonth()+1).padStart(2,'0')}-${String(wd.getDate()).padStart(2,'0')}`; matrix[eq][ds] = []; }); });
    const pushData = (dStr, spaceStr, text) => { equipList.forEach(eq => { if(spaceStr === "전체" || spaceStr.includes(eq)) if(matrix[eq][dStr]) matrix[eq][dStr].push(text); }); };

    filteredRes.forEach(r => { let stTime = String(r.res_time||"").split('~')[0].trim(); let spaceName = String(r.space_equip||"").split(' ')[0]; pushData(r.res_date, r.space_equip || '', `<div class="dash-item dash-item-res"><div class="dash-item-text"><span class="dash-time">${stTime}</span>[${r.batch||'-'}] ${r.name}</div><div class="dash-tooltip">[${spaceName}] ${r.res_time} | [${r.batch||'-'}] ${r.name}</div></div>`); if(calEvts[r.res_date]) calEvts[r.res_date].push({ type:'res', start:stTime, text:`[${r.batch||'-'}] ${r.name}`, tooltip:`[${spaceName}] ${r.res_time} | [${r.batch||'-'}] ${r.name}` }); });
    filteredBlk.forEach(b => { let spaceName = String(b.space_equip||"전체").split(' ')[0] || "전체"; pushData(b.block_date, b.space_equip || '전체', `<div class="dash-item dash-item-blk"><div class="dash-item-text"><span class="dash-time">${b.start_time}</span>[${b.category}]</div><div class="dash-tooltip">[${spaceName}] ${b.start_time}~${b.end_time} | ${b.category}</div></div>`); if(calEvts[b.block_date]) calEvts[b.block_date].push({ type:'blk', start:b.start_time, text:`[${b.category}]`, tooltip:`[${spaceName}] ${b.start_time}~${b.end_time} | ${b.category}` }); });
    filteredTrn.forEach(t => { let parts = String(t.content||"").split(' || '); let stTime = String(parts[2]||"").split('~')[0].trim(); let spaceName = String(parts[1]||"전체").split(' ')[0]; let ds = parts[0].trim(); pushData(ds, parts[1].trim(), `<div class="dash-item dash-item-trn"><div class="dash-item-text"><span class="dash-time">${stTime}</span>[${t.batch||'-'}] ${t.name}</div><div class="dash-tooltip">[${spaceName}] ${parts[2]} | [${t.batch||'-'}] ${t.name}</div></div>`); if(calEvts[ds]) calEvts[ds].push({ type:'trn', start:stTime, text:`[${t.batch||'-'}] ${t.name}`, tooltip:`[${spaceName}] ${parts[2]} | [${t.batch||'-'}] ${t.name}` }); });
    googleEvents.forEach(g => { if(calEvts[g.date]) calEvts[g.date].push({ type: 'google', start: g.time, text: g.text, tooltip: `${g.time} | ${g.text}` }); });

    let hHtml = `<div class="dash-grid"><div class="dash-header dash-cell" style="word-break:keep-all;">날짜</div>` + equipList.map(e=>`<div class="dash-header dash-cell">${e}</div>`).join("");
    weekDates.forEach(wd => {
      let ds = `${wd.getFullYear()}-${String(wd.getMonth()+1).padStart(2,'0')}-${String(wd.getDate()).padStart(2,'0')}`; let holidayName = window.getHoliday(wd.getFullYear(), wd.getMonth()+1, wd.getDate()); let dateColorClass = holidayName ? 'color:var(--error); font-weight:800;' : ''; let dateText = `${wd.getMonth()+1}/${wd.getDate()} (${daysKr[wd.getDay()]})` + (holidayName ? `<br><span style="font-size:10px;">${holidayName}</span>` : ''); hHtml += `<div class="dash-header dash-cell" style="${dateColorClass}">${dateText}</div>`;
      equipList.forEach(eq => hHtml += `<div class="dash-cell">${matrix[eq][ds].join('')}</div>`); 
    });
    hHtml += `</div>`; 
    
    window.centerCalEvts = calEvts;
    let mHtml = `<div class="mobile-cal"><div class="m-cal-strip" id="m-cal-strip-center">`;
    Object.keys(calEvts).sort().forEach(ds => { let dObj = new Date(ds); let dayKr = ["일","월","화","수","목","금","토"][dObj.getDay()]; let hasEvt = calEvts[ds].length > 0 ? 'has-evt' : ''; mHtml += `<div class="m-cal-date" id="m-date-center-${ds}" onclick="window.renderMCalCenter('${ds}')"><span class="m-cal-day">${dayKr}</span><span class="m-cal-num">${dObj.getDate()}</span><div class="m-cal-dot ${hasEvt}"></div></div>`; });
    mHtml += `</div><div id="m-cal-list-center" class="m-cal-list"></div></div>`;
    
    $("dash-content").innerHTML = `<div class="desktop-cal">${hHtml}</div>` + mHtml;
    let td = new Date(); let todayStr = `${td.getFullYear()}-${String(td.getMonth()+1).padStart(2,'0')}-${String(td.getDate()).padStart(2,'0')}`;
    window.renderMCalCenter(calEvts[todayStr] ? todayStr : Object.keys(calEvts).sort()[0]);
    
  } else {
    for(let d=1; d<=daysInMonth; d++) { let ds = `${yyyy}-${String(mm+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`; calEvts[ds] = []; }
    filteredRes.forEach(r => { if(calEvts[r.res_date]) { let stTime = String(r.res_time||"").split('~')[0].trim(); let spaceName = String(r.space_equip||"").split(' ')[0]; calEvts[r.res_date].push({ type: 'res', start: stTime, text: `[${r.batch||'-'}] ${r.name}`, tooltip: `[${spaceName}] ${r.res_time} | [${r.batch||'-'}] ${r.name}` }); } });
    filteredBlk.forEach(b => { if(calEvts[b.block_date]) { let spaceName = String(b.space_equip||"전체").split(' ')[0] || "전체"; calEvts[b.block_date].push({ type: 'blk', start: b.start_time, text: `[${b.category}]`, tooltip: `[${spaceName}] ${b.start_time}~${b.end_time} | ${b.category}` }); } });
    filteredTrn.forEach(t => { let parts = String(t.content||"").split(' || '); let ds = parts[0].trim(); if(calEvts[ds]) { let stTime = String(parts[2]||"").split('~')[0].trim(); let spaceName = String(parts[1]||"전체").split(' ')[0]; calEvts[ds].push({ type: 'trn', start: stTime, text: `[${t.batch||'-'}] ${t.name}`, tooltip: `[${spaceName}] ${parts[2]} | [${t.batch||'-'}] ${t.name}` }); } });
    googleEvents.forEach(g => { if(calEvts[g.date]) calEvts[g.date].push({ type: 'google', start: g.time, text: g.text, tooltip: `${g.time} | ${g.text}` }); });

    let mHtml = `<div class="dash-cal-grid"><div class="dash-cal-header" style="color:var(--error);">일</div><div class="dash-cal-header">월</div><div class="dash-cal-header">화</div><div class="dash-cal-header">수</div><div class="dash-cal-header">목</div><div class="dash-cal-header">금</div><div class="dash-cal-header" style="color:var(--blue);">토</div>`;
    let firstDay = new Date(yyyy, mm, 1).getDay(); for(let i=0; i<firstDay; i++) mHtml += `<div class="dash-cal-cell empty"></div>`;
    for(let d=1; d<=daysInMonth; d++) {
      let ds = `${yyyy}-${String(mm+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`; let evts = calEvts[ds] || []; evts.sort((a,b) => String(a.start || '').localeCompare(String(b.start || '')));
      let holidayName = window.getHoliday(yyyy, mm + 1, d); let dateClass = holidayName ? 'holiday-date' : ''; let dateText = d + (holidayName ? ` <span style="font-size:10px; font-weight:600; display:block; float:right;">${holidayName}</span>` : '');
      let evtsHtml = evts.slice(0, 3).map(e => `<div class="dash-item dash-item-res" style="background:#FFF6EF; border-left-color:var(--primary); color:var(--primary);"><div class="dash-item-text"><span class="dash-time">${e.start||''}</span>${e.text||''}</div><div class="dash-tooltip">${e.tooltip||''}</div></div>`).join('');
      if(evts.length > 3) { let hiddenText = evts.slice(3).map(e => `${e.start||''} | ${e.text||''}`).join('<br>'); evtsHtml += `<div class="dash-cal-more-wrap"><div class="dash-cal-more">+${evts.length - 3}건 더보기</div><div class="dash-tooltip" style="text-align:left; white-space:nowrap; font-weight:normal;">${hiddenText}</div></div>`; }
      let isTd = isToday(ds) ? 'today' : ''; mHtml += `<div class="dash-cal-cell ${isTd}"><div class="dash-cal-date ${dateClass}">${dateText}</div>${evtsHtml}</div>`;
    }
    mHtml += `</div>`; 
    
    window.centerCalEvts = calEvts;
    let mobStrip = `<div class="mobile-cal"><div class="m-cal-strip" id="m-cal-strip-center">`;
    Object.keys(calEvts).sort().forEach(ds => { let dObj = new Date(ds); let dayKr = ["일","월","화","수","목","금","토"][dObj.getDay()]; let hasEvt = calEvts[ds].length > 0 ? 'has-evt' : ''; mobStrip += `<div class="m-cal-date" id="m-date-center-${ds}" onclick="window.renderMCalCenter('${ds}')"><span class="m-cal-day">${dayKr}</span><span class="m-cal-num">${dObj.getDate()}</span><div class="m-cal-dot ${hasEvt}"></div></div>`; });
    mobStrip += `</div><div id="m-cal-list-center" class="m-cal-list"></div></div>`;

    $("dash-content").innerHTML = `<div class="desktop-cal">${mHtml}</div>` + mobStrip;
    let td = new Date(); let todayStr = `${td.getFullYear()}-${String(td.getMonth()+1).padStart(2,'0')}-${String(td.getDate()).padStart(2,'0')}`;
    window.renderMCalCenter(calEvts[todayStr] ? todayStr : Object.keys(calEvts).sort()[0]);
  }
}

// ==========================================
// 8. 생두 발주 요약, 예약 스케줄 컨트롤 및 일괄 액션
// ==========================================
// 🔥 생두 주문 요약 업그레이드 (누가 얼마나 시켰는지 리스트 그룹핑)
function showOrderSummary() {
  let pending = gOrd.filter(o => o.status === '주문 접수');
  if(pending.length === 0) { showToast("현재 발주 대기 중인 내역이 없습니다."); return; }
  
  let grouped = {};
  pending.forEach(o => { 
      let key = o.vendor;
      if(!grouped[key]) grouped[key] = {}; 
      if(!grouped[key][o.item_name]) grouped[key][o.item_name] = []; 
      grouped[key][o.item_name].push(`[${o.batch||'-'}] ${o.name}(${o.quantity})`); 
  });

  currentSummaryData = [];
  let html = `<div style="display:flex; flex-direction:column; gap:16px;">`;
  for(let v in grouped) {
    html += `<div style="background:#f9fafb; padding:16px; border-radius:12px; border:1px solid var(--border-strong);"><div style="font-weight:800; font-size:16px; margin-bottom:12px; color:var(--primary);">${v}</div>`;
    for(let i in grouped[v]) { 
        let buyers = grouped[v][i];
        let totalCount = buyers.length;
        let detailsHtml = buyers.map(b => `<div style="color:var(--text-secondary); margin-top:4px; padding-left:12px; border-left:2px solid var(--border-strong);">➔ ${b}</div>`).join('');
        
        html += `<div style="font-size:14px; margin-bottom:12px; line-height:1.4; background:#fff; padding:12px; border-radius:8px; border:1px solid var(--border);"><strong style="color:var(--text-display);">${i} <span style="color:var(--primary); font-size:13px;">(총 ${totalCount}건)</span></strong>${detailsHtml}</div>`; 
        currentSummaryData.push({ vendor: v, item: i, details: buyers.join(', ') }); 
    }
    html += `</div>`;
  }
  html += `</div>`; $("summaryModalBody").innerHTML = html; $("summaryModal").classList.add('show');
}
function closeSummaryModal() { $("summaryModal").classList.remove('show'); }
function downloadSummaryExcel() {
  if(currentSummaryData.length === 0) return; let csvContent = '\uFEFF생두사,상품명,발주요약내용\n';
  currentSummaryData.forEach(d => { csvContent += `"${d.vendor}","${String(d.item).replace(/"/g, '""')}","${String(d.details).replace(/"/g, '""')}"\n`; });
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' }); const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `발주요약_${new Date().toISOString().slice(0,10)}.csv`; link.click();
}

async function updateTable(table, column, id, value) { const { error } = await supabaseClient.from(table).update({ [column]: value }).eq('id', id); if(error) showToast("저장 실패"); else showToast("업데이트 되었습니다."); if(table === 'orders') fetchCenterData(); }
function formatBlockDate(v) { let d = String(v).replace(/\D/g, ''); if(d.length === 4) { let y = new Date().getFullYear(); return `${y}-${d.slice(0,2)}-${d.slice(2,4)}`; } if(d.length === 6) { return `20${d.slice(0,2)}-${d.slice(2,4)}-${d.slice(4,6)}`; } if(d.length === 8) { return `${d.slice(0,4)}-${d.slice(4,6)}-${d.slice(6,8)}`; } return v; }
function formatBlockTime(v) { let t = String(v).replace(/\D/g, ''); if(t.length === 1) return `0${t}:00`; if(t.length === 2) return `${t.padStart(2,'0')}:00`; if(t.length === 3) return `0${t.slice(0,1)}:${t.slice(1,3)}`; if(t.length === 4) return `${t.slice(0,2)}:${t.slice(2,4)}`; return v; }

function openBlockModal() { currentBlockId = null; $("blockModalTitle").innerText = "수업 및 훈련 등 등록"; $("blkId").value = ""; $("blkCategory").value = "기본 수업"; $("blkDate").value = ""; $("blkStart").value = ""; $("blkEnd").value = ""; $("blkCenter").value = "마포 센터"; $("blkSpace").value = ""; $("blkReason").value = ""; $("blkCapacity").value = ""; $("blockModal").classList.add('show'); }
function editBlock(id) { currentBlockId = id; const b = gBlk.find(x => x.id === id); if(!b) return; $("blockModalTitle").innerText = "스케줄 내역 수정"; $("blkId").value = b.id; $("blkCategory").value = b.category; $("blkDate").value = b.block_date; $("blkStart").value = b.start_time; $("blkEnd").value = b.end_time; $("blkCenter").value = b.center; $("blkSpace").value = b.space_equip; $("blkReason").value = b.reason; $("blkCapacity").value = b.capacity || ""; $("blockModal").classList.add('show'); }
function closeBlockModal() { $("blockModal").classList.remove('show'); currentBlockId = null; }

async function saveBlockData() {
  const payload = { category: $("blkCategory").value, block_date: formatBlockDate($("blkDate").value), start_time: formatBlockTime($("blkStart").value), end_time: formatBlockTime($("blkEnd").value), center: $("blkCenter").value, space_equip: $("blkSpace").value.trim(), reason: $("blkReason").value.trim(), capacity: parseInt($("blkCapacity").value) || null };
  if(!payload.block_date || !payload.start_time || !payload.end_time) { showToast("날짜와 시간을 정확히 입력해주세요."); return; }
  let error; if(currentBlockId) { const res = await supabaseClient.from('blocks').update(payload).eq('id', currentBlockId); error = res.error; } else { const res = await supabaseClient.from('blocks').insert([payload]); error = res.error; }
  if(error) showToast("저장 실패"); else { showToast("저장되었습니다."); closeBlockModal(); fetchCenterData(); }
}

function deleteBlock(id) {
  openCustomConfirm("스케줄 삭제", null, null, null, "해당 스케줄을 삭제하시겠습니까?", async () => {
    const { error } = await supabaseClient.from('blocks').delete().eq('id', id); 
    if(error) showToast("삭제 실패"); else { showToast("삭제되었습니다."); fetchCenterData(); }
  });
}

function bulkAction(table, type) {
  let chks = $$$(`.chk-${table==='reservations'?'res':'trn'}:checked`); 
  if(chks.length === 0) { showToast("선택된 항목이 없습니다."); return; }
  openCustomConfirm("일괄 취소", null, null, null, `선택한 ${chks.length}건을 일괄 취소하시겠습니까?`, async () => {
    let promises = []; chks.forEach(chk => { promises.push(supabaseClient.from(table).update({ status: '취소(정상)' }).eq('id', chk.value)); });
    await Promise.all(promises); showToast("일괄 처리가 완료되었습니다."); fetchCenterData();
  });
}

function cancelAction(table, id) {
  openCustomConfirm("정상 취소 처리", null, null, null, "해당 예약을 정상 취소로 처리하시겠습니까?", async () => {
    await supabaseClient.from(table).update({ status: '취소(정상)' }).eq('id', id); showToast("정상 취소로 처리되었습니다."); fetchCenterData();
  });
}

function bulkActionOrd(statusValue) {
  let chks = $$$(`.chk-ord:checked`);
  if(chks.length === 0) { showToast("선택된 항목이 없습니다."); return; }
  openCustomConfirm("생두 상태 일괄 변경", null, null, null, `선택한 ${chks.length}건을 <strong style="color:var(--primary);">${statusValue}</strong> 상태로 변경하시겠습니까?`, async () => {
    let promises = []; chks.forEach(chk => { promises.push(supabaseClient.from('orders').update({ status: statusValue }).eq('id', chk.value)); });
    await Promise.all(promises); showToast(`일괄 처리가 완료되었습니다.`); fetchCenterData();
  });
}
</script>
