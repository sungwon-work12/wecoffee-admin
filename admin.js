// ==========================================
// 1. 시스템 초기화 및 글로벌 변수 세팅
// ==========================================
const { createClient } = supabase;
const supabaseClient = createClient('https://dqvzowmhxorxhiqoibmk.supabase.co', 'sb_publishable_DSi3rGnuQhy6OtML_3ukEA_7ptfaoK-');

const $ = id => document.getElementById(id), $$ = q => document.querySelector(q), $$$ = q => document.querySelectorAll(q);
let globalApps=[], globalMembers=[], gRes=[], gTrn=[], gOrd=[], gBlk=[], gNotice=[];
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
let quillEditor = null;

// ==========================================
// 2. 유틸리티 함수 
// ==========================================
window.holidaysCache = {};
window.fetchHolidays = async function(year) {
  if(window.holidaysCache['fetched_' + year]) return; 
  const serviceKey = 'dd13ab368b573e49574bd2b121ecf8b4dd4673e273e64135156968f533954bd5';
  const url = `https://apis.data.go.kr/B090041/openapi/service/SpcdeInfoService/getRestDeInfo?serviceKey=${serviceKey}&solYear=${year}&numOfRows=100&_type=json`;
  try {
    const res = await fetch(url); const data = await res.json(); const items = data?.response?.body?.items?.item;
    if(items) { let arr = Array.isArray(items) ? items : [items]; arr.forEach(item => { if(item.isHoliday === 'Y') { let dStr = String(item.locdate); let fmt = `${dStr.substring(0,4)}-${dStr.substring(4,6)}-${dStr.substring(6,8)}`; window.holidaysCache[fmt] = item.dateName; } }); }
    window.holidaysCache['fetched_' + year] = true; 
  } catch(e) { console.error("Holiday API Fallback"); }
};

window.getHoliday = function(y, m, d) {
  let key = `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
  if (window.holidaysCache[key]) return window.holidaysCache[key];
  const fallbackHolidays = {
    '2024-01-01': '신정', '2024-02-09': '설날 연휴', '2024-02-10': '설날', '2024-02-11': '설날 연휴', '2024-02-12': '대체공휴일', '2024-03-01': '삼일절', '2024-04-10': '국회의원선거', '2024-05-05': '어린이날', '2024-05-06': '대체공휴일', '2024-05-15': '부처님오신날', '2024-06-06': '현충일', '2024-08-15': '광복절', '2024-09-16': '추석 연휴', '2024-09-17': '추석', '2024-09-18': '추석 연휴', '2024-10-03': '개천절', '2024-10-09': '한글날', '2024-12-25': '기독탄신일'
  };
  return fallbackHolidays[key] || null;
};

function getDow(dStr) { if(!dStr) return ''; const d = new Date(dStr.replace(/-/g, '/')); if(isNaN(d.getTime())) return ''; return ['일','월','화','수','목','금','토'][d.getDay()]; }
function formatDtWithDow(dateStr) { if(!dateStr) return "-"; const d = new Date(dateStr); if(isNaN(d.getTime())) return dateStr; const dow = ['일','월','화','수','목','금','토'][d.getDay()]; return `${d.getFullYear().toString().slice(-2)}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')}(${dow}) ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`; }
function formatDt(dateStr) { if(!dateStr) return "-"; const d = new Date(dateStr); return `${d.getFullYear().toString().slice(-2)}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`; }
function comma(str) { return Number(String(str).replace(/[^0-9]/g, '')).toLocaleString(); }
function showToast(msg) { const toast = $("toast"); toast.innerText = msg; toast.classList.add('show'); setTimeout(() => toast.classList.remove('show'), 2500); }

// 🔥 브라우저 보안 회피용 다이렉트 복사 함수
function copyTxt(txt) {
    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(txt).then(() => showToast("클립보드에 복사되었습니다.")).catch(() => fallbackCopy(txt));
    } else { fallbackCopy(txt); }
}
function fallbackCopy(txt) {
    let t = document.createElement("textarea"); t.value = txt; t.style.position = "fixed"; t.style.top = "-9999px"; document.body.appendChild(t); t.select(); document.execCommand("copy"); document.body.removeChild(t); showToast("클립보드에 복사되었습니다.");
}

window.fetchGoogleCalendarEvents = async function(yyyy, mm) {
  const API_KEY = 'AIzaSyAjtrSlv56VPhtqMYGsQd0L4q1AlZTW1Ng'; const CALENDAR_ID = 'wecoffeekorea@gmail.com';
  try {
    const timeMin = new Date(yyyy, mm - 1, 1).toISOString(); const timeMax = new Date(yyyy, mm, 0, 23, 59, 59).toISOString();
    const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(CALENDAR_ID)}/events?key=${API_KEY}&timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&orderBy=startTime`;
    const response = await fetch(url); if (!response.ok) return []; const data = await response.json();
    return (data.items || []).map(event => { let dateStr, timeStr; if (event.start.date) { dateStr = event.start.date; timeStr = '종일'; } else if (event.start.dateTime) { dateStr = event.start.dateTime.split('T')[0]; timeStr = event.start.dateTime.split('T')[1].substring(0, 5); } else return null; return { date: dateStr, time: timeStr, start: timeStr, text: event.summary || '일정', type: 'google' }; }).filter(Boolean);
  } catch (error) { return []; }
};

// ==========================================
// 3. 인증 및 모달 제어
// ==========================================
function initializeApp() {
  window.fetchHolidays(new Date().getFullYear());

  supabaseClient.auth.onAuthStateChange((event, session) => {
    if (session) { 
      var lv = $("login-view"); if(lv) lv.classList.remove('active'); 
      var dv = $("dashboard-view"); if(dv) dv.style.display = 'block'; 
      let savedMain = localStorage.getItem('wecoffee_main_tab') || 'page-center';
      let savedSub = localStorage.getItem('wecoffee_sub_tab') || 'sub-res';
      if(savedSub === 'sub-trn' || savedSub === 'sub-blk') savedSub = 'sub-trn-blk';
      let mainEl = document.querySelector(`.gnb-item[onclick*="${savedMain}"]`);
      if(mainEl) window.switchMainTab(savedMain, mainEl); else window.switchMainTab('page-center', document.querySelector(`.gnb-item[onclick*="page-center"]`));
      if(savedMain === 'page-center') { let subEl = document.querySelector(`.sub-item[onclick*="${savedSub}"]`); if(subEl) window.switchSubTab(savedSub, subEl); }
    } else { 
      var lv = $("login-view"); if(lv) lv.classList.add('active'); 
      var dv = $("dashboard-view"); if(dv) dv.style.display = 'none'; 
    }
  });
  if($("dashSpaceFilter")) $("dashSpaceFilter").innerHTML = `<option value="전체">전체 공간</option><option value="로스팅존">로스팅존</option><option value="에스프레소존">에스프레소존</option><option value="브루잉존">브루잉존</option><option value="커핑존">커핑존</option><option value="스터디존">스터디존</option>`;
}
if (document.readyState === 'loading') document.addEventListener("DOMContentLoaded", initializeApp); else initializeApp();

supabaseClient.channel('admin-realtime')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'reservations' }, handleRealtime).on('postgres_changes', { event: '*', schema: 'public', table: 'trainings' }, handleRealtime).on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, handleRealtime).on('postgres_changes', { event: '*', schema: 'public', table: 'blocks' }, handleRealtime).on('postgres_changes', { event: '*', schema: 'public', table: 'notices' }, handleRealtime).on('postgres_changes', { event: '*', schema: 'public', table: 'applications' }, handleRealtime).on('postgres_changes', { event: '*', schema: 'public', table: 'members' }, handleRealtime).subscribe();

function handleRealtime(payload) {
  if (['reservations', 'trainings', 'orders', 'blocks', 'notices'].includes(payload.table)) window.fetchCenterData();
  if (payload.table === 'applications') window.fetchApplications();
  if (payload.table === 'members') window.fetchMembers();
}

window.switchMainTab = function(pageId, element) {
  $$$(".page").forEach(p => p.classList.remove('active')); $(pageId).classList.add('active');
  $$$(".gnb-item").forEach(item => item.classList.remove('active')); 
  let targetEl = element || document.querySelector(`.gnb-item[onclick*="${pageId}"]`); if(targetEl) targetEl.classList.add('active');
  localStorage.setItem('wecoffee_main_tab', pageId);
  if(pageId === 'page-center') window.fetchCenterData();
  if(pageId === 'page-applications') { window.fetchApplications(); isInsightView = false; $("app-table-area").style.display = "block"; $("app-insight-area").style.display = "none"; $("insightToggleBtn").innerText = "인사이트 보기"; }
  if(pageId === 'page-members') window.fetchMembers();
}
window.switchSubTab = function(subId, element) {
  $$$(".sub-page").forEach(p => p.classList.remove('active')); $(subId).classList.add('active');
  $$$(".sub-item").forEach(item => item.classList.remove('active')); 
  let targetEl = element || document.querySelector(`.sub-item[onclick*="${subId}"]`); if(targetEl) { targetEl.classList.add('active'); targetEl.classList.remove("tab-pulse"); }
  if (subId === 'sub-notice') { if($('globalFilterWrap')) $('globalFilterWrap').style.display = 'none'; } else { if($('globalFilterWrap')) $('globalFilterWrap').style.display = 'inline-flex'; }
  localStorage.setItem('wecoffee_sub_tab', subId);
  if(subId === 'sub-res') window.renderDashboard(); 
}
window.handleLogin = async function(e) { e.preventDefault(); const email = $("loginEmail").value, password = $("loginPassword").value; const { error } = await supabaseClient.auth.signInWithPassword({ email, password }); if (error) showToast("접근 권한이 없습니다."); else showToast("접속되었습니다."); }
window.handleLogout = async function() { await supabaseClient.auth.signOut(); showToast("로그아웃 되었습니다."); }

// 🔥 팝업 멘트 동적 변경 및 다이렉트 닫기 연동
window.openCustomConfirm = function(title, statusHtml, actionHtml, callback, btnText = '적용하기') {
    $("confirmTarget").innerHTML = title;
    if(statusHtml) { $("confirmStateBox").style.display = 'block'; $("confirmSimpleBox").style.display = 'none'; $("confirmStatus").innerHTML = statusHtml; $("confirmActionState").innerHTML = actionHtml; } 
    else { $("confirmStateBox").style.display = 'none'; $("confirmSimpleBox").style.display = 'block'; $("confirmActionSimple").innerHTML = actionHtml; }
    
    $("confirmBtn").innerText = btnText;
    window.currentConfirmCallback = callback; 
    $("confirmModal").classList.add('show');
}
window.closeConfirmModal = function() { $("confirmModal").classList.remove('show'); window.currentConfirmCallback = null; }

$("confirmBtn").onclick = async function() { 
    if (window.currentConfirmCallback) {
        const isCopyAction = ($("confirmBtn").innerText === '복사하기');
        if(isCopyAction) { window.currentConfirmCallback(); } else { await window.currentConfirmCallback(); }
    }
    window.closeConfirmModal(); 
};
window.closeOnBackdrop = function(event, modalId) { if (event.target.id === modalId) $(modalId).classList.remove('show'); }

// ==========================================
// 공지사항 함수 (에디터 렌더링 생명주기 픽스)
// ==========================================
function initQuill() {
    if(!quillEditor && $('editor-container')) {
        quillEditor = new Quill('#editor-container', { theme: 'snow', modules: { toolbar: [ [{ 'header': [1, 2, 3, false] }], ['bold', 'italic', 'underline', 'strike'], [{ 'list': 'ordered'}, { 'list': 'bullet' }], [{ 'align': [] }], [{ 'color': [] }, { 'background': [] }], ['clean'] ] }, placeholder: '내용을 자유롭게 적어주세요.' });
    }
}
window.openNoticeModal = function() { 
  $("noticeModal").classList.add('show'); 
  setTimeout(() => { try { initQuill(); if(quillEditor) quillEditor.root.innerHTML = ''; } catch(e) { console.error("에디터 에러", e); } }, 50); 
  $("noticeId").value = ''; $("noticeTitle").value = ''; $("noticePinned").checked = false; $("noticeStatus").value = '발행'; $("noticeModalTitle").innerText = "새 공지사항 등록"; 
}
window.editNotice = function(id) { 
  // 🔥 ID 타입 매칭 강제 픽스
  let n = gNotice.find(x => String(x.id) === String(id)); if(!n) return; 
  $("noticeModal").classList.add('show'); 
  setTimeout(() => { try { initQuill(); if(quillEditor) quillEditor.root.innerHTML = n.content || ''; } catch(e) { console.error("에디터 에러", e); } }, 50);
  $("noticeId").value = n.id; $("noticeTitle").value = n.title; $("noticePinned").checked = n.is_pinned; $("noticeStatus").value = n.status || '발행'; $("noticeModalTitle").innerText = "공지사항 수정"; 
}
window.closeNoticeModal = function() { $("noticeModal").classList.remove('show'); }
window.saveNoticeData = async function() { let id = $("noticeId").value; let htmlContent = quillEditor ? quillEditor.root.innerHTML : ''; let payload = { title: $("noticeTitle").value.trim(), content: htmlContent, is_pinned: $("noticePinned").checked, status: $("noticeStatus").value }; if(!payload.title) return showToast("제목을 입력해주세요."); if(!payload.content || payload.content === '<p><br></p>') return showToast("내용을 입력해주세요."); let error; if(id) { const res = await supabaseClient.from('notices').update(payload).eq('id', id); error = res.error; } else { const res = await supabaseClient.from('notices').insert([payload]); error = res.error; } if(error) showToast("저장 실패"); else { showToast("저장되었습니다."); window.closeNoticeModal(); window.fetchCenterData(); } }
window.deleteNotice = function(id) { window.openCustomConfirm("공지사항 삭제", null, `이 공지사항을 완전히 삭제하시겠습니까?`, async () => { const { error } = await supabaseClient.from('notices').delete().eq('id', id); if(error) showToast("삭제 실패"); else { showToast("삭제되었습니다."); window.fetchCenterData(); } }); }
window.handleNoticeMediaUpload = async function(event) { const files = event.target.files; if (!files || files.length === 0) return; const overlay = $("mediaUploadOverlay"); overlay.style.display = "flex"; try { if(!quillEditor) initQuill(); let range = quillEditor.getSelection(true); if(!range) range = { index: quillEditor.getLength() }; for (let i = 0; i < files.length; i++) { const file = files[i]; const fileExt = file.name.split('.').pop(); const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`; const { error: uploadError } = await supabaseClient.storage.from('notice_media').upload(fileName, file); if (uploadError) { showToast(`${file.name} 업로드 실패`); continue; } const { data: { publicUrl } } = supabaseClient.storage.from('notice_media').getPublicUrl(fileName); if (file.type.startsWith('image/')) { quillEditor.insertEmbed(range.index, 'image', publicUrl); } else if (file.type.startsWith('video/')) { quillEditor.insertEmbed(range.index, 'video', publicUrl); } range.index++; } showToast("미디어가 첨부되었습니다."); } catch (e) { showToast("업로드 중 오류 발생"); } finally { overlay.style.display = "none"; $("noticeMediaUpload").value = ''; } }


// ==========================================
// 5. 센터 관리 데이터 로드 및 UI 렌더링
// ==========================================
window.applyGlobalCenter = function() { currentGlobalCenter = document.querySelector('input[name="globalCenter"]:checked').value; window.renderCenterData(); window.renderDashboard(); }
window.toggleDashView = function(view) { currentDashView = view; if(view === 'month') { $("dashMonthNav").style.display = 'flex'; } else { $("dashMonthNav").style.display = 'none'; currentDashMonthOffset = 0; } window.renderDashboard(); }
window.changeDashMonth = function(offset) { currentDashMonthOffset += offset; window.renderDashboard(); }
window.resetDashMonth = function() { currentDashMonthOffset = 0; window.renderDashboard(); }

window.fetchCenterData = async function() {
  try {
    const [res, trn, ord, blk, noti] = await Promise.all([
      supabaseClient.from('reservations').select('*').order('created_at', {ascending: false}), supabaseClient.from('trainings').select('*').order('created_at', {ascending: false}), supabaseClient.from('orders').select('*').order('created_at', {ascending: false}), supabaseClient.from('blocks').select('*').order('block_date', {ascending: false}), supabaseClient.from('notices').select('*').order('created_at', {ascending: false})
    ]);
    gRes = res.data||[]; gTrn = trn.data||[]; gOrd = ord.data||[]; gBlk = blk.data||[]; gNotice = noti.data||[];
    gRes.forEach(r => { if(r.space_equip) r.space_equip = r.space_equip.replace(/로스팅룸/g, '로스팅존'); }); gBlk.forEach(b => { if(b.space_equip) b.space_equip = b.space_equip.replace(/로스팅룸/g, '로스팅존'); }); gTrn.forEach(t => { if(t.content) t.content = t.content.replace(/로스팅룸/g, '로스팅존'); });
    let bSet = new Set(); gRes.forEach(r => { if(r.batch) bSet.add(r.batch); }); gTrn.forEach(t => { if(t.batch) bSet.add(t.batch); });
    let bHtml = `<option value="전체">전체 기수</option>` + Array.from(bSet).sort().map(b=>`<option value="${b}">${b}</option>`).join("");
    if($("dashBatchFilter").innerHTML !== bHtml) $("dashBatchFilter").innerHTML = bHtml;
    window.renderCenterData(); window.renderDashboard(); window.renderNoticeData(); updateSmartBadges();
  } catch(e) { console.error("데이터 로드 에러:", e); }
}

function updateSmartBadges() { 
  let pendingOrders = gOrd.filter(o => o.status === '주문 접수' || (o.status||'').includes('대기')).length; 
  if(pendingOrders > 0) $("ordTabBtn").classList.add('tab-pulse'); else $("ordTabBtn").classList.remove('tab-pulse'); 
  let pendingRes = gRes.filter(r => (r.status||'') === '예약완료').length;
  if(pendingRes > 0) $("resTabBtn").classList.add('tab-pulse'); else $("resTabBtn").classList.remove('tab-pulse');
  let pendingTrn = gTrn.filter(t => (t.status||'') === '접수완료').length;
  if(pendingTrn > 0) $("trnTabBtn").classList.add('tab-pulse'); else $("trnTabBtn").classList.remove('tab-pulse');
}

window.toggleAll = function(source, className) { $$$("." + className).forEach(chk => { if(!chk.disabled) chk.checked = source.checked; }); }

function updateDailyInOutBanner() {
  let td = new Date(); let ds = `${td.getFullYear()}-${String(td.getMonth()+1).padStart(2,'0')}-${String(td.getDate()).padStart(2,'0')}`;
  const getDailyEvents = (centerFilter) => {
    let evts = [];
    gRes.forEach(r => { if(r.res_date === ds && r.center === centerFilter && !(r.status||'').includes('취소')) { let st = String(r.res_time||"").split('~')[0].trim(); let en = String(r.res_time||"").split('~')[1]?.trim() || ''; let spc = String(r.space_equip||"").split(' ')[0]; evts.push({ start: st, end: en, name: r.name, space: spc }); } });
    gTrn.forEach(t => { let p = String(t.content||"").split(' || '); if(p.length >= 5 && p[0].trim() === ds && p[3].trim() === centerFilter && !(t.status||'').includes('취소')) { let st = String(p[2]||"").split('~')[0].trim(); let en = String(p[2]||"").split('~')[1]?.trim() || ''; let spc = p[4]; evts.push({ start: st, end: en, name: t.name, space: spc }); } });
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

window.handlePriceInput = async function(id, val, currentStatus, inputEl) {
  let formatted = val ? comma(val) + '원' : ''; let updates = { total_price: formatted }; let newStatus = currentStatus;
  if (val && currentStatus === '주문 접수') { updates.status = '입금 대기'; newStatus = '입금 대기'; }
  let order = gOrd.find(o => String(o.id) === String(id)); if(order) { order.total_price = formatted; order.status = newStatus; }
  inputEl.value = formatted;
  if(newStatus !== currentStatus) {
      let row = inputEl.closest('tr'); let selectEl = row.querySelector('.status-select');
      if(selectEl) { selectEl.value = newStatus; selectEl.className = 'status-select st-arranging'; let badgeEl = row.querySelector('.m-prev-top .status-badge'); if(badgeEl) { badgeEl.className = 'status-badge st-arranging'; badgeEl.innerText = newStatus; } }
  }
  const { error } = await supabaseClient.from('orders').update(updates).eq('id', id);
  if (error) showToast("저장 실패"); else showToast("금액이 저장되었습니다."); 
}

function renderOrderTableHTML(fOrd, tableId, chkClass) {
    $(tableId).innerHTML = fOrd.length ? fOrd.map(o=>{ 
        let badgeClass = o.status==='주문 취소'?'st-ghosted':o.status==='센터 도착'?'st-completed':o.status==='입금 확인'?'st-confirmed':o.status==='입금 대기'?'st-arranging':'st-wait';
        let cNm = o.item_name || ""; let m = cNm.match(/(.+) \[(?:희망:\s*)?(\d+)\/(\d+)\((월|화|수|목|금|토|일)\).*?\]/);
        if(m) cNm = m[1].trim(); else { let oM = cNm.match(/(.+) \[(.*?)\]/); if(oM) cNm = oM[1].trim(); }
        let centerBadge = `<span style="background:var(--border); color:var(--text-display); padding:6px 10px; border-radius:8px; font-size:13px; font-weight:700; white-space:nowrap;">${o.center||'미지정'}</span>`;
        let vendorUrl = o.link ? o.link : (o.url ? o.url : '#');
        let vendorHtml = `<a href="${vendorUrl}" target="_blank" style="color:var(--text-secondary); font-weight:700; font-size:13px; text-decoration:none; cursor:pointer;" onmouseover="this.style.textDecoration='underline'" onmouseout="this.style.textDecoration='none'">${o.vendor}</a>`;
        let copyableHtml = `<div class="copyable-wrap" onclick="copyTxt('${String(cNm).replace(/'/g, "\\'")}')" data-full-text="${String(cNm).replace(/"/g, '&quot;')}" title="클릭하여 복사"><div style="display:flex; align-items:center; width:100%; min-width: 0;"><span class="copyable-text">${cNm}</span><span class="copyable-hint">복사</span></div></div>`;
        let cTxtPreview = o.center ? `<span style="background:var(--border); color:var(--text-secondary); padding:2px 6px; border-radius:4px; font-size:11px; font-weight:600; margin-right:6px; vertical-align:middle; white-space:nowrap;">${o.center}</span>` : '';
        let mPreview = `<td class="m-preview has-checkbox" onclick="this.closest('tr').classList.toggle('expanded')"><div class="m-prev-top"><span class="m-prev-date">${formatDtWithDow(o.created_at)}</span><span class="status-badge ${badgeClass}">${o.status}</span></div><div class="m-prev-title">[${o.batch||'-'}] <span style="font-weight:800;">${o.name}</span> <span style="font-size:13px; font-weight:500; color:var(--text-secondary); margin-left:4px;">(${o.quantity})</span></div><div class="m-prev-desc" style="color:var(--text-display); font-weight:500; line-height:1.5;">${cTxtPreview}<span style="font-size:12px; color:var(--text-secondary); margin-right:4px;">${o.vendor}</span>${cNm}</div><span class="m-toggle-hint">상세 정보 보기 ▼</span></td>`;
        return `<tr style="border-bottom: 1px solid var(--border-strong);">${mPreview}<td data-label="선택" class="tc" style="text-align:center;"><input type="checkbox" class="chk-ord ${chkClass}" value="${o.id}"></td><td data-label="주문 날짜" style="white-space:nowrap; text-align:left; color:var(--text-display); font-size:14px; font-weight:500;">${formatDt(o.created_at)}</td><td data-label="수령 센터" class="tc" style="text-align:center;">${centerBadge}</td><td data-label="기수" class="tc" style="color:var(--text-secondary); font-size:14px; font-weight:600; text-align:center;">${o.batch||'-'}</td><td data-label="성함" style="text-align:left;"><strong style="font-weight:800; color:var(--text-display); font-size:15px; white-space:nowrap;">${o.name}</strong></td><td data-label="연락처" style="white-space:nowrap; text-align:left; color:var(--text-secondary); font-size:14px;">${o.phone}</td><td data-label="생두사 / 상품명" style="text-align:left; width: 100%; max-width: 320px; overflow:visible;"><div style="display:flex; align-items:center; width:100%; min-width: 0; gap:12px;"><div style="width: 80px; flex-shrink: 0; text-align: left;">${vendorHtml}</div><span style="color:var(--border-strong); font-size:12px; flex-shrink:0;">|</span>${copyableHtml}</div></td><td data-label="수량" class="tc" style="font-size:15px; font-weight:700; color:var(--text-display); text-align:center;">${o.quantity}</td><td data-label="총 금액 입력" style="text-align:right;"><input type="text" value="${o.total_price||''}" placeholder="0원" style="width:100px; padding:10px 12px; text-align:right; font-size:14px; font-weight:600; background:#fff; border:1px solid var(--border-strong); border-radius:8px; color:var(--text-display); outline:none; transition:0.2s;" onfocus="this.style.borderColor='var(--primary)';" onblur="this.style.borderColor='var(--border-strong)'; window.handlePriceInput('${o.id}', this.value, '${o.status}', this)"></td><td data-label="상태 관리" class="tc" style="text-align:center;"><div class="action-wrap" style="justify-content:center; display:flex;"><select class="status-select ${badgeClass}" onchange="window.updateTable('orders','status','${o.id}',this.value, this)" style="text-align-last:center;"><option value="주문 접수" ${o.status==='주문 접수'?'selected':''}>주문 접수</option><option value="입금 대기" ${o.status==='입금 대기'?'selected':''}>입금 대기</option><option value="입금 확인" ${o.status==='입금 확인'?'selected':''}>입금 확인</option><option value="센터 도착" ${o.status==='센터 도착'?'selected':''}>센터 도착</option><option value="주문 취소" ${o.status==='주문 취소'?'selected':''}>주문 취소</option></select></div></td></tr>` 
    }).join("") : `<tr><td colspan="10" class="empty-state">해당 요일의 주문 내역이 없습니다.</td></tr>`;
}

window.renderCenterData = function() {
  const oneMonthAgo = new Date(); oneMonthAgo.setDate(oneMonthAgo.getDate() - 30); const now = new Date(); updateDailyInOutBanner();
  let qRes = ($("searchRes")?.value || "").toLowerCase(); let fRes = gRes.filter(r => { let rDate = new Date(r.res_date || r.created_at); return (rDate >= oneMonthAgo) && (currentGlobalCenter === '전체' || r.center === currentGlobalCenter) && (`${r.name} ${r.phone}`.toLowerCase().includes(qRes)); });
  $("resTableBody").innerHTML = fRes.length ? fRes.map(r=>{ 
    let displayStatus = r.status || ''; let actBtn = displayStatus.includes('취소') ? '' : `<button class="btn-outline btn-sm" onclick="window.cancelAction('reservations', '${r.id}')">취소</button>`; 
    let endTimeStr = String(r.res_time||"").split('~')[1];
    if (endTimeStr && r.res_date && !displayStatus.includes('취소')) { let [hh, mm] = endTimeStr.trim().split(':'); let resEndObj = new Date(`${r.res_date}T${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}:00`); if (resEndObj < now) displayStatus = '이용완료'; }
    let badgeClass = displayStatus.includes('취소') ? 'badge-red' : (displayStatus === '이용완료' ? 'badge-gray' : (displayStatus === '예약완료' ? 'badge-green' : 'badge-gray')); let dow = getDow(r.res_date);
    let mPreview = `<td class="m-preview has-checkbox" onclick="this.closest('tr').classList.toggle('expanded')"><div class="m-prev-top"><span class="m-prev-date" style="font-weight:700; color:var(--primary); font-size:13px;">[${r.batch||'-'}] ${r.name}</span><span class="status-badge ${badgeClass}">${displayStatus}</span></div><div class="m-prev-title" style="font-size:18px; color:var(--text-display); letter-spacing:-0.5px;">${r.res_date}(${dow}) ${r.res_time}</div><div class="m-prev-desc" style="font-size:13px; font-weight:500;">[${r.center}] ${r.space_equip || '-'}</div><span class="m-toggle-hint">상세 정보 보기 ▼</span></td>`;
    return `<tr>${mPreview}<td data-label="선택" class="tc"><input type="checkbox" class="chk-res" value="${r.id}" ${displayStatus.includes('취소')?'disabled':''}></td><td data-label="접수일">${formatDt(r.created_at)}</td><td data-label="기수">${r.batch||'-'}</td><td data-label="성함"><strong>${r.name}</strong></td><td data-label="연락처">${r.phone}</td><td data-label="예약일">${r.res_date}</td><td data-label="시간">${r.res_time}</td><td data-label="공간">${r.center} <span class="sub-text">${r.space_equip}</span></td><td data-label="상태" class="tc"><span class="status-badge ${badgeClass}">${displayStatus}</span></td><td data-label="관리">${actBtn}</td></tr>`; 
  }).join("") : `<tr><td colspan="10" class="empty-state">내역 없음</td></tr>`;
  
  let qTrn = ($("searchTrn")?.value || "").toLowerCase(); let fTrnList = gTrn.filter(t => { let tDate = new Date(t.created_at); return (tDate >= oneMonthAgo) && (currentGlobalCenter === '전체' || String(t.content||"").includes(currentGlobalCenter)) && (`${t.name} ${t.phone} ${t.content}`.toLowerCase().includes(qTrn)); });
  $("trnTableBody").innerHTML = fTrnList.length ? fTrnList.map(t=>{ 
    let displayStatus = t.status || ''; let actBtn = displayStatus.includes('취소') ? '' : `<button class="btn-outline btn-sm" onclick="window.cancelAction('trainings', '${t.id}')">취소</button>`; 
    let cInfo = String(t.content||'').split(' || '); let niceContent = t.content; let preDate = cInfo[0]||'-', preTime = cInfo[2]||'-', preCenter = cInfo[3]||'-', preName = cInfo[4]||'-';
    if(cInfo.length >= 5) { niceContent = `<div style="margin-bottom:4px; font-size:12px; color:var(--text-secondary);">[${cInfo[3]}] ${cInfo[0]} (${cInfo[2]})</div><div style="font-weight:600; color:var(--text-display); line-height:1.4;">${cInfo[4]} <span style="font-weight:400; color:var(--text-tertiary); margin-left:4px;">- ${cInfo[1]}</span></div>`; }
    let dow = getDow(preDate); let badgeClass = displayStatus.includes('취소')?'badge-red':displayStatus==='접수완료'?'badge-green':'badge-gray';
    let mPreview = `<td class="m-preview has-checkbox" onclick="this.closest('tr').classList.toggle('expanded')"><div class="m-prev-top"><span class="m-prev-date" style="font-weight:700; color:var(--primary); font-size:13px;">[${t.batch||'-'}] ${t.name}</span><span class="status-badge ${badgeClass}">${displayStatus}</span></div><div class="m-prev-title" style="font-size:18px; color:var(--text-display); letter-spacing:-0.5px;">${preDate}(${dow}) ${preTime}</div><div class="m-prev-desc" style="font-size:13px; font-weight:500;">[${preCenter}] ${preName}</div><span class="m-toggle-hint">상세 정보 보기 ▼</span></td>`;
    return `<tr>${mPreview}<td data-label="선택" class="tc"><input type="checkbox" class="chk-trn" value="${t.id}" ${displayStatus.includes('취소')?'disabled':''}></td><td data-label="신청일">${formatDt(t.created_at)}</td><td data-label="기수">${t.batch||'-'}</td><td data-label="성함"><strong>${t.name}</strong></td><td data-label="연락처">${t.phone}</td><td data-label="정보">${niceContent}</td><td data-label="상태" class="tc"><span class="status-badge ${badgeClass}">${displayStatus}</span></td><td data-label="관리">${actBtn}</td></tr>`; 
  }).join("") : `<tr><td colspan="8" class="empty-state">내역 없음</td></tr>`;

  let qOrd = ($("searchOrd")?.value || "").toLowerCase(); let vOrd = $("ordVendorFilter")?.value || "전체"; let isOrdFilter = $("filterPendingOrd")?.checked;
  let fOrd = gOrd.filter(o => { let matchCenter = (currentGlobalCenter === '전체' || o.center === currentGlobalCenter); let matchQ = `${o.name} ${o.phone} ${o.vendor} ${o.item_name} ${o.center||''}`.toLowerCase().includes(qOrd); let matchV = vOrd === '전체' ? true : o.vendor === vOrd; let matchS = isOrdFilter ? (o.status==='주문 접수'||o.status==='입금 대기'||o.status==='입금 확인') : true; return matchCenter && matchQ && matchV && matchS; });
  let thuOrders = fOrd.filter(o => o.item_name && o.item_name.includes('목')); let monOrders = fOrd.filter(o => !(o.item_name && o.item_name.includes('목'))); 
  
  if (!isOrdFilter) {
      let isMonHidden = (o) => { if (o.status !== '주문 취소' && o.status !== '센터 도착') return false; let oDate = new Date(o.created_at); if ((now - oDate) / 86400000 >= 5) return true; let dow = now.getDay(); if (dow === 2 || dow === 3 || dow === 4) return true; return false; };
      let isThuHidden = (o) => { if (o.status !== '주문 취소' && o.status !== '센터 도착') return false; let oDate = new Date(o.created_at); if ((now - oDate) / 86400000 >= 5) return true; let dow = now.getDay(); if (dow === 5 || dow === 6 || dow === 0) return true; return false; };
      monOrders = monOrders.filter(o => !isMonHidden(o)); thuOrders = thuOrders.filter(o => !isThuHidden(o));
  }

  renderOrderTableHTML(monOrders, 'ordTableBodyMon', 'chk-ord-mon'); renderOrderTableHTML(thuOrders, 'ordTableBodyThu', 'chk-ord-thu');

  let fBlk = gBlk.filter(b => currentGlobalCenter === '전체' || b.center === currentGlobalCenter);
  $("blkTableBody").innerHTML = fBlk.length ? fBlk.map(b=>{ 
    let max = b.capacity || '-'; let current = 0; if(max !== '-') current = gTrn.filter(t => String(t.content||'').includes(b.start_time) && !(t.status||'').includes('취소')).length; let capDisplay = max === '-' ? '-' : `<strong>${max - current}</strong> / ${max}`; let dow = getDow(b.block_date);
    let mPreview = `<td class="m-preview" onclick="this.closest('tr').classList.toggle('expanded')"><div class="m-prev-top"><span class="m-prev-date" style="font-weight:700; color:var(--primary); font-size:13px;">${b.category}</span></div><div class="m-prev-title" style="font-size:18px; color:var(--text-display); letter-spacing:-0.5px;">${b.block_date}(${dow}) ${b.start_time}~${b.end_time}</div><div class="m-prev-desc" style="font-size:13px; font-weight:500;">[${b.center}] ${b.space_equip || '전체'}</div><span class="m-toggle-hint">상세 정보 보기 ▼</span></td>`;
    return `<tr>${mPreview}<td data-label="날짜"><strong>${b.block_date}</strong></td><td data-label="시간">${b.start_time} ~ ${b.end_time}</td><td data-label="구분"><span style="color:var(--primary);font-weight:600;">${b.category}</span></td><td data-label="공간">${b.center} <span class="sub-text">${b.space_equip}</span></td><td data-label="사유">${b.reason}</td><td data-label="정원" class="tc">${capDisplay}</td><td data-label="관리" class="tc"><div class="action-wrap-flex"><button class="btn-outline btn-sm" onclick="window.editBlock('${b.id}')">수정</button> <button class="btn-outline btn-sm" onclick="window.deleteBlock('${b.id}')" style="color:var(--error);border-color:var(--error)">삭제</button></div></td></tr>` 
  }).join("") : `<tr><td colspan="7" class="empty-state">내역 없음</td></tr>`;
}

window.renderNoticeData = function() {
  let fNoti = [...gNotice]; fNoti.sort((a,b) => { if(a.is_pinned === b.is_pinned) return new Date(b.created_at) - new Date(a.created_at); return a.is_pinned ? -1 : 1; });
  $("noticeTableBody").innerHTML = fNoti.length ? fNoti.map(n => {
    let pinBadge = n.is_pinned ? `<span class="status-badge badge-orange" style="margin-right:8px;">필독</span>` : `<span class="status-badge badge-gray" style="margin-right:8px;">일반</span>`; let statBadge = n.status === '발행' ? `<span class="status-badge badge-green">발행 중</span>` : `<span class="status-badge badge-gray">숨김</span>`;
    let mPreview = `<td class="m-preview" onclick="this.closest('tr').classList.toggle('expanded')"><div class="m-prev-top"><span class="m-prev-date">${formatDt(n.created_at)}</span>${statBadge}</div><div class="m-prev-title" style="font-size:16px;">${pinBadge}${n.title}</div><span class="m-toggle-hint">관리 메뉴 보기 ▼</span></td>`;
    return `<tr>${mPreview}<td data-label="구분" class="tc">${pinBadge}</td><td data-label="제목"><strong style="color:var(--text-display);">${n.title}</strong></td><td data-label="상태" class="tc">${statBadge}</td><td data-label="작성일">${formatDt(n.created_at)}</td><td data-label="관리" class="tc"><div class="action-wrap-flex" style="justify-content:center;"><button class="btn-outline btn-sm" onclick="window.editNotice('${n.id}')">수정</button> <button class="btn-outline btn-sm" onclick="window.deleteNotice('${n.id}')" style="color:var(--error);border-color:var(--error)">삭제</button></div></td></tr>`;
  }).join("") : `<tr><td colspan="5" class="empty-state">등록된 공지사항이 없습니다.</td></tr>`;
}

window.renderMCalCenter = function(selDate) {
    $$$("#dash-content .m-cal-date").forEach(el => el.classList.remove('active')); let target = document.getElementById(`m-date-center-${selDate}`); if(target) { target.classList.add('active'); target.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' }); }
    let evts = window.centerCalEvts[selDate] || []; evts.sort((a,b) => String(a.start||'').localeCompare(String(b.start||''))); let html = '';
    if(evts.length === 0) { html = `<div class="empty-state" style="padding:40px 0;">예정된 일정이 없습니다.</div>`; } else { evts.forEach(e => { let badgeStyle = e.type==='google' ? 'color:#495057;' : 'color:var(--primary);'; html += `<div class="m-cal-card"><div class="m-cal-card-time" style="${badgeStyle}">${e.start || e.time || '종일'}</div><div class="m-cal-card-title">${e.text||''}</div><div class="m-cal-card-desc">${String(e.tooltip||'').split('|')[0]}</div></div>`; }); }
    let listWrap = $("m-cal-list-center"); if(listWrap) listWrap.innerHTML = html;
};

window.renderDashboard = async function() {
  const now = new Date(); let dYear = now.getFullYear(); let dMonth = now.getMonth() + currentDashMonthOffset; const focusDate = new Date(dYear, dMonth, 1); const yyyy = focusDate.getFullYear(); const mm = focusDate.getMonth(); const daysInMonth = new Date(yyyy, mm + 1, 0).getDate(); const currDay = now.getDay() || 7; 
  if (currentDashView === 'month' && $("dashMonthTitle")) $("dashMonthTitle").innerText = `${yyyy}년 ${mm + 1}월`;
  await window.fetchHolidays(yyyy);

  let fSpc = $("dashSpaceFilter").value; let fBtc = $("dashBatchFilter").value;
  let filteredRes = gRes.filter(r => (currentGlobalCenter === '전체' || r.center === currentGlobalCenter) && !(r.status||'').includes('취소') && (fSpc === '전체' || String(r.space_equip||'').includes(fSpc)) && (fBtc === '전체' || r.batch === fBtc));
  let filteredBlk = gBlk.filter(b => (currentGlobalCenter === '전체' || b.center === currentGlobalCenter) && (fSpc === '전체' || b.space_equip === fSpc || !b.space_equip || b.space_equip === '전체'));
  let filteredTrn = gTrn.filter(t => { if((t.status||'').includes('취소') || (fBtc !== '전체' && t.batch !== fBtc)) return false; let parts = String(t.content||"").split(' || '); if(parts.length < 5) return false; if(currentGlobalCenter !== '전체' && parts[3].trim() !== currentGlobalCenter) return false; if(fSpc !== '전체' && !parts[1].includes(fSpc)) return false; return true; });
  let googleEvents = await window.fetchGoogleCalendarEvents(yyyy, mm + 1); let calEvts = {};
  
  if (currentDashView === 'week') {
    let weekDates = []; let daysKr = ["일", "월", "화", "수", "목", "금", "토"];
    for(let i = 1; i <= 7; i++) { let dObj = new Date(now.getFullYear(), now.getMonth(), now.getDate() - currDay + i); weekDates.push(dObj); calEvts[`${dObj.getFullYear()}-${String(dObj.getMonth()+1).padStart(2,'0')}-${String(dObj.getDate()).padStart(2,'0')}`] = []; }
    let matrix = {}; equipList.forEach(eq => { matrix[eq] = {}; weekDates.forEach(wd => { let ds = `${wd.getFullYear()}-${String(wd.getMonth()+1).padStart(2,'0')}-${String(wd.getDate()).padStart(2,'0')}`; matrix[eq][ds] = []; }); });
    const pushData = (dStr, spaceStr, text) => { equipList.forEach(eq => { if(spaceStr === "전체" || spaceStr.includes(eq)) if(matrix[eq][dStr]) matrix[eq][dStr].push(text); }); };

    filteredRes.forEach(r => { let stTime = String(r.res_time||"").split('~')[0].trim(); let spaceName = String(r.space_equip||"").split(' ')[0]; pushData(r.res_date, r.space_equip || '', `<div class="dash-item dash-item-res"><div class="dash-item-text"><span class="dash-time">${stTime}</span>[${r.batch||'-'}] ${r.name}</div><div class="dash-tooltip">[${spaceName}] ${r.res_time} | [${r.batch||'-'}] ${r.name}</div></div>`); if(calEvts[r.res_date]) calEvts[r.res_date].push({ type:'res', start:stTime, text:`[${r.batch||'-'}] ${r.name}`, tooltip:`[${spaceName}] ${r.res_time} | [${r.batch||'-'}] ${r.name}` }); });
    filteredBlk.forEach(b => { let spaceName = String(b.space_equip||"전체").split(' ')[0] || "전체"; pushData(b.block_date, b.space_equip || '전체', `<div class="dash-item dash-item-blk"><div class="dash-item-text"><span class="dash-time">${b.start_time}</span>[${b.category}]</div><div class="dash-tooltip">[${spaceName}] ${b.start_time}~${b.end_time} | ${b.category}</div></div>`); if(calEvts[b.block_date]) calEvts[b.block_date].push({ type:'blk', start:b.start_time, text:`[${b.category}]`, tooltip:`[${spaceName}] ${b.start_time}~${b.end_time} | ${b.category}` }); });
    filteredTrn.forEach(t => { let parts = String(t.content||"").split(' || '); let stTime = String(parts[2]||"").split('~')[0].trim(); let spaceName = String(parts[1]||"전체").split(' ')[0]; let ds = parts[0].trim(); pushData(ds, parts[1].trim(), `<div class="dash-item dash-item-trn"><div class="dash-item-text"><span class="dash-time">${stTime}</span>[${t.batch||'-'}] ${t.name}</div><div class="dash-tooltip">[${spaceName}] ${parts[2]} | [${t.batch||'-'}] ${t.name}</div></div>`); if(calEvts[ds]) calEvts[ds].push({ type:'trn', start:stTime, text:`[${t.batch||'-'}] ${t.name}`, tooltip:`[${spaceName}] ${parts[2]} | [${t.batch||'-'}] ${t.name}` }); });
    googleEvents.forEach(g => { if(calEvts[g.date]) calEvts[g.date].push({ type: 'google', start: g.time, text: g.text, tooltip: `${g.time} | ${g.text}` }); });

    let hHtml = `<div class="dash-grid"><div class="dash-header dash-cell" style="word-break:keep-all;">날짜</div>` + equipList.map(e=>`<div class="dash-header dash-cell">${e}</div>`).join("");
    weekDates.forEach(wd => { let ds = `${wd.getFullYear()}-${String(wd.getMonth()+1).padStart(2,'0')}-${String(wd.getDate()).padStart(2,'0')}`; let holidayName = window.getHoliday(wd.getFullYear(), wd.getMonth()+1, wd.getDate()); let dateColorClass = holidayName ? 'color:var(--error); font-weight:800;' : ''; let dateText = `${wd.getMonth()+1}/${wd.getDate()} (${daysKr[wd.getDay()]})` + (holidayName ? `<br><span style="font-size:10px;">${holidayName}</span>` : ''); hHtml += `<div class="dash-header dash-cell" style="${dateColorClass}">${dateText}</div>`; equipList.forEach(eq => hHtml += `<div class="dash-cell">${matrix[eq][ds].join('')}</div>`); }); hHtml += `</div>`; 
    window.centerCalEvts = calEvts;
    let mHtml = `<div class="mobile-cal"><div class="m-cal-strip" id="m-cal-strip-center">`; Object.keys(calEvts).sort().forEach(ds => { let dObj = new Date(ds); let dayKr = ["일","월","화","수","목","금","토"][dObj.getDay()]; let hasEvt = calEvts[ds].length > 0 ? 'has-evt' : ''; mHtml += `<div class="m-cal-date" id="m-date-center-${ds}" onclick="window.renderMCalCenter('${ds}')"><span class="m-cal-day">${dayKr}</span><span class="m-cal-num">${dObj.getDate()}</span><div class="m-cal-dot ${hasEvt}"></div></div>`; }); mHtml += `</div><div id="m-cal-list-center" class="m-cal-list"></div></div>`;
    $("dash-content").innerHTML = `<div class="desktop-cal">${hHtml}</div>` + mHtml;
    let td = new Date(); let todayStr = `${td.getFullYear()}-${String(td.getMonth()+1).padStart(2,'0')}-${String(td.getDate()).padStart(2,'0')}`; window.renderMCalCenter(calEvts[todayStr] ? todayStr : Object.keys(calEvts).sort()[0]);
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
      if(evts.length > 3) { let hiddenText = evts.slice(3).map(e => `${e.time||''} | ${e.text||''}`).join('<br>'); evtsHtml += `<div class="dash-cal-more-wrap"><div class="dash-cal-more">+${evts.length - 3}건 더보기</div><div class="dash-tooltip" style="text-align:left; white-space:nowrap; font-weight:normal;">${hiddenText}</div></div>`; }
      mHtml += `<div class="dash-cal-cell"><div class="dash-cal-date ${dateClass}">${dateText}</div>${evtsHtml}</div>`;
    }
    mHtml += `</div>`; 
    window.centerCalEvts = calEvts;
    let mobStrip = `<div class="mobile-cal"><div class="m-cal-strip" id="m-cal-strip-center">`; Object.keys(calEvts).sort().forEach(ds => { let dObj = new Date(ds); let dayKr = ["일","월","화","수","목","금","토"][dObj.getDay()]; let hasEvt = calEvts[ds].length > 0 ? 'has-evt' : ''; mobStrip += `<div class="m-cal-date" id="m-date-center-${ds}" onclick="window.renderMCalCenter('${ds}')"><span class="m-cal-day">${dayKr}</span><span class="m-cal-num">${dObj.getDate()}</span><div class="m-cal-dot ${hasEvt}"></div></div>`; }); mobStrip += `</div><div id="m-cal-list-center" class="m-cal-list"></div></div>`;
    if($("appDashContent")) $("appDashContent").innerHTML = `<div class="desktop-cal">${mHtml}</div>` + mobStrip;
    let td = new Date(); let todayStr = `${td.getFullYear()}-${String(td.getMonth()+1).padStart(2,'0')}-${String(td.getDate()).padStart(2,'0')}`; window.renderMCalCenter(calEvts[todayStr] ? todayStr : Object.keys(calEvts).sort()[0]);
  }
}

window.showOrderSummary = function() {
  let pending = gOrd.filter(o => o.status === '주문 접수'); if(pending.length === 0) { showToast("현재 발주 대기 중인 내역이 없습니다."); return; }
  let grouped = {};
  pending.forEach(o => { 
      let vendor = o.vendor; if(!grouped[vendor]) grouped[vendor] = {}; 
      let cNm = o.item_name; let dOpt = "월요일 발주"; let m = (o.item_name||"").match(/(.+) \[(?:희망:\s*)?(\d+)\/(\d+)\((월|화|수|목|금|토|일)\).*?\]/);
      if(m) { cNm = m[1].trim(); dOpt = m[4] + "요일 발주"; } else { let oM = (o.item_name||"").match(/(.+) \[(.*?)\]/); if(oM) { cNm = oM[1].trim(); let optText = oM[2].trim(); if(optText.includes('목')) dOpt = '목요일 발주'; else dOpt = '월요일 발주'; } }
      if(!grouped[vendor][dOpt]) grouped[vendor][dOpt] = {}; if(!grouped[vendor][dOpt][cNm]) grouped[vendor][dOpt][cNm] = [];
      grouped[vendor][dOpt][cNm].push(`[${o.center||'미지정'}] ${o.name}(${o.quantity})`); 
  });
  currentSummaryData = []; let html = `<div style="display:flex; flex-direction:column; gap:16px;">`;
  for(let vendor in grouped) {
    html += `<div style="background:#f9fafb; padding:16px; border-radius:12px; border:1px solid var(--border-strong);"><div style="font-weight:800; font-size:16px; margin-bottom:12px; color:var(--primary);">${vendor}</div>`;
    for(let dOpt in grouped[vendor]) {
        let dOptStyle = dOpt === '목요일 발주' ? 'background:var(--text-display); color:#fff;' : 'background:var(--primary-light); color:var(--primary);';
        html += `<div style="margin-bottom:8px;"><span style="${dOptStyle} padding:4px 8px; border-radius:6px; font-size:12px; font-weight:700;">${dOpt}</span></div>`;
        for(let item in grouped[vendor][dOpt]) { 
            let buyers = grouped[vendor][dOpt][item]; let totalCount = buyers.length; let detailsHtml = buyers.map(b => `<div style="color:var(--text-secondary); margin-top:4px; padding-left:12px; border-left:2px solid var(--border-strong);">➔ ${b}</div>`).join('');
            html += `<div style="font-size:14px; margin-bottom:12px; line-height:1.4; background:#fff; padding:12px; border-radius:8px; border:1px solid var(--border);"><strong style="color:var(--text-display);">${item} <span style="color:var(--primary); font-size:13px;">(총 ${totalCount}건)</span></strong>${detailsHtml}</div>`; 
            currentSummaryData.push({ vendor: vendor, day: dOpt, item: item, details: buyers.join(', ') }); 
        }
    } html += `</div>`;
  } html += `</div>`; $("summaryModalBody").innerHTML = html; $("summaryModal").classList.add('show');
}

window.closeSummaryModal = function() { $("summaryModal").classList.remove('show'); }
window.downloadSummaryExcel = function() {
  if(currentSummaryData.length === 0) return; let csvContent = '\uFEFF생두사,발주일,상품명,발주요약내용(센터/이름/수량)\n';
  currentSummaryData.forEach(d => { csvContent += `"${d.vendor}","${d.day}","${String(d.item).replace(/"/g, '""')}","${String(d.details).replace(/"/g, '""')}"\n`; });
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' }); const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `발주요약_${new Date().toISOString().slice(0,10)}.csv`; link.click();
}

window.updateTable = async function(table, column, id, value, selectEl) { 
    const { error } = await supabaseClient.from(table).update({ [column]: value }).eq('id', id); 
    if(error) { showToast("저장 실패"); } else { 
        showToast("업데이트 되었습니다."); 
        if(table === 'orders' && column === 'status') {
            let order = gOrd.find(o => String(o.id) === String(id)); if(order) order.status = value;
            if(selectEl) {
                let badgeClass = value==='주문 취소'?'st-ghosted':value==='센터 도착'?'st-completed':value==='입금 확인'?'st-confirmed':value==='입금 대기'?'st-arranging':'st-wait';
                selectEl.className = 'status-select ' + badgeClass; let row = selectEl.closest('tr');
                if(row) { let badgeEl = row.querySelector('.m-prev-top .status-badge'); if(badgeEl) { badgeEl.className = 'status-badge ' + badgeClass; badgeEl.innerText = value; } }
            }
        }
    } 
}

window.renderMCalApp = function(selDate) {
    $$$("#appDashContent .m-cal-date").forEach(el => el.classList.remove('active')); let target = document.getElementById(`m-date-app-${selDate}`); if(target) { target.classList.add('active'); target.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' }); }
    let evts = window.appCalEvts[selDate] || []; evts.sort((a,b) => String(a.time||'').localeCompare(String(b.time||''))); let html = '';
    if(evts.length === 0) { html = `<div class="empty-state" style="padding:40px 0;">예정된 상담 일정이 없습니다.</div>`; } else { evts.forEach(e => { html += `<div class="m-cal-card"><div class="m-cal-card-time" style="color:var(--primary);">${e.time || '종일'}</div><div class="m-cal-card-title">${e.text||''}</div><div class="m-cal-card-desc">${String(e.tooltip||'').split('|').slice(1).join('|').trim()}</div></div>`; }); }
    let listWrap = $("m-cal-list-app"); if(listWrap) listWrap.innerHTML = html;
};

window.toggleInsight = function() {
  isInsightView = !isInsightView;
  if (isInsightView) { $("app-table-area").style.display = "none"; $("app-insight-area").style.display = "block"; $("insightToggleBtn").innerText = "리스트 보기"; window.applyFilterApp(); } 
  else { $("app-table-area").style.display = "block"; $("app-insight-area").style.display = "none"; $("insightToggleBtn").innerText = "인사이트 보기"; }
}
window.toggleAppDashView = function(view) { currentAppDashView = view; if(view === 'month') { $("appDashMonthNav").style.display = 'flex'; } else { $("appDashMonthNav").style.display = 'none'; appDashMonthOffset = 0; } window.renderAppDashboard(); }
window.changeAppDashMonth = function(offset) { appDashMonthOffset += offset; window.renderAppDashboard(); }
window.resetAppDashMonth = function() { appDashMonthOffset = 0; window.renderAppDashboard(); }

window.renderAppDailyBanner = function(data) {
  let td = new Date(); let mm = td.getMonth() + 1; let dd = td.getDate();
  let scheduled = data.filter(a => a.status === '상담 일정 확정' && a.call_time);
  let todayEvts = scheduled.filter(app => { const m = String(app.call_time||'').match(/(\d+)월\s+(\d+)일/); return m && parseInt(m[1]) === mm && parseInt(m[2]) === dd; });
  let html = '';
  if(todayEvts.length === 0) { html = `<div class="inout-card"><div style="font-weight:800; margin-bottom:8px; color:var(--text-display); border-bottom:1px solid var(--border-strong); padding-bottom:8px;">오늘의 상담 일정</div><div style="font-size:13px; color:var(--text-secondary); padding:8px 0;">오늘 확정된 상담 일정이 없습니다.</div></div>`; } 
  else {
    html = `<div class="inout-card"><div style="font-weight:800; font-size:15px; margin-bottom:12px; color:var(--text-display); border-bottom:1px solid var(--border-strong); padding-bottom:8px;">오늘의 상담 일정 (${todayEvts.length}건)</div><div style="display:flex; flex-direction:column; gap:8px;">`;
    todayEvts.sort((a,b) => String(a.call_time||'').localeCompare(String(b.call_time||'')));
    todayEvts.forEach(evt => {
      const tm = String(evt.call_time||'').match(/(오전|오후)\s+(\d+)시(?:\s+(\d+)분)?/); let timeStr = tm ? `${tm[1]} ${tm[2]}:${tm[3]||'00'}` : evt.call_time;
      html += `<div style="display:flex; align-items:center; flex-wrap:nowrap; overflow-x:auto;"><div class="today-time-wrap" style="color:var(--primary); background:var(--primary-light); padding:2px 8px; border-radius:4px; font-size:12px; font-weight:700; white-space:nowrap; flex-shrink:0;">${timeStr}</div> <div class="today-time-wrap" style="font-weight:800; margin:0 8px; flex-shrink:0;">[${evt.desired_batch||'-'}] ${evt.name}</div> <div style="white-space:nowrap; font-weight:500; color:var(--text-secondary); flex-shrink:0;">(${evt.phone}) | 담당: ${evt.counselor_name||'미정'}</div></div>`;
    });
    html += `</div></div>`;
  }
  if($("appDailyBanner")) $("appDailyBanner").innerHTML = html;
}

window.fetchApplications = async function() {
  try {
    const { data, error } = await supabaseClient.from('applications').select('*').order('created_at', { ascending: false });
    if (error) throw error; globalApps = data || []; 
    const batches = [...new Set(globalApps.map(d => d.desired_batch).filter(Boolean))].sort().reverse();
    let optionsHTML = '<option value="all">전체 기수 보기</option>'; batches.forEach(b => optionsHTML += `<option value="${b}">${b}</option>`);
    $("batchFilterApp").innerHTML = optionsHTML; window.applyFilterApp(); 
    
    if ($("crmModal").classList.contains('show') && $("crmAppId").value) {
        window.renderCrmInner($("crmAppId").value);
    }
  } catch(e) { $("appTableBody").innerHTML = `<tr><td colspan="8" class="empty-state">에러 발생</td></tr>`; console.error("신청 리스트 에러:", e); }
}

window.applyFilterApp = function() {
  try {
      const selected = $("batchFilterApp").value; const filtered = selected === 'all' ? globalApps : globalApps.filter(d => d.desired_batch === selected);
      if (isInsightView) window.renderStatistics(filtered); else { window.renderAppTable(filtered); window.renderAppDailyBanner(filtered); window.renderAppDashboard(); }
  } catch(e) { console.error("필터 적용 중 에러:", e); }
}

const statusClassMap = { '대기': 'st-wait', '상담 일정 조율 중': 'st-arranging', '상담 일정 확정': 'st-confirmed', '상담 완료': 'st-completed', '연락 두절': 'st-ghosted', '설문 완료': 'st-confirmed' };
const joinClassMap = { '': 'jn-none', '고민 중': 'jn-thinking', '가입 완료': 'jn-joined', '미가입': 'jn-declined', '다음 기수 희망': 'jn-next' };

// 🔥 유입 경로 파싱 로직
function parseAcquisitionChannel(rawText) {
    if(!rawText) return '-';
    let txt = String(rawText).toLowerCase();
    if(txt.includes('광고') || txt.includes('스폰서드')) return '광고';
    if(txt.includes('인스타')) return '인스타그램';
    if(txt.includes('블로그')) return '네이버 블로그';
    if(txt.includes('블랙워터')) return '블랙워터';
    if(txt.includes('지인')) return '지인 추천';
    return rawText.split('(')[0].trim();
}

window.copySurveyLink = function(id, name, e) {
    if(e) e.stopPropagation();
    const baseUrl = 'https://www.wecoffee.co.kr/survey'; 
    const url = `${baseUrl}?uid=${id}&name=${encodeURIComponent(name)}`;
    copyTxt(url);
};

window.closeCrmModal = function() {
    $("crmModal").classList.remove('show');
};

// 🔥 CRM 모달 렌더링 독립 (라이브 싱크용)
window.renderCrmInner = function(id) {
    const app = globalApps.find(a => String(a.id) === String(id)); if(!app) return;
    $("crmName").innerText = app.name || '이름 없음';
    $("crmProfile").innerText = `[${app.desired_batch||'기수 미정'}] | ${app.phone||'-'} | ${app.acquisition_channel||'-'}`;
    $("crmTimeBadge").innerText = app.call_time && app.call_time !== 'null' ? app.call_time : '상담시간 미정';

    const job = app.survey_job; const edu = app.survey_edu; const goal = app.survey_goal; const brand = app.survey_brand;

    if (job || edu) {
        $("crmSurveyResult").innerHTML = `
            <div class="crm-box"><div class="crm-label">1. 직업 상태</div><div class="crm-answer">${job || '<span class="crm-empty">미작성</span>'}</div></div>
            <div class="crm-box"><div class="crm-label">2. 과거 교육 피드백</div><div class="crm-answer">${edu || '<span class="crm-empty">미작성</span>'}</div></div>
            <div class="crm-box"><div class="crm-label">3. 달성 목표 (니즈)</div><div class="crm-answer">${goal || '<span class="crm-empty">미작성</span>'}</div></div>
            <div class="crm-box"><div class="crm-label">4. 선호 브랜드</div><div class="crm-answer">${brand || '<span class="crm-empty">미작성</span>'}</div></div>`;
    } else {
        $("crmSurveyResult").innerHTML = `
            <div style="text-align:center; padding: 40px 20px; background:#fff; border-radius:12px; border:1px dashed var(--border-strong);">
                <div style="font-size:16px; font-weight:700; color:var(--text-secondary); margin-bottom:16px;">아직 사전 설문을 작성하지 않은 고객입니다.</div>
                <button class="btn-outline" style="color:var(--primary); border-color:var(--primary); padding:12px 24px; font-size:15px;" onclick="window.copySurveyLink('${app.id}', '${app.name || ''}', event)">🔗 고객 전용 설문 링크 복사하기</button>
            </div>`;
    }

    let initialStatus = app.join_status || (app.status === '상담 완료' ? '상담 완료' : '');
    if(!initialStatus || initialStatus === '대기') initialStatus = '상담 완료';
    $("crmStatusSelect").value = initialStatus;
}

window.openCrmModal = function(id) {
    $("crmAppId").value = id;
    window.renderCrmInner(id);
    $("crmModal").classList.add('show');
}

window.saveCrmStatus = function() {
    const id = $("crmAppId").value; const selected = $("crmStatusSelect").value; if(!id || !selected) return;
    if(selected === '상담 완료' || selected === '연락 두절') {
        window.updateAppStatus(id, 'status', selected);
    } else {
        window.updateAppStatus(id, 'join_status', selected);
        window.updateAppStatus(id, 'status', '상담 완료');
    }
    window.closeCrmModal();
}

window.handleStatusChange = function(id, newStatus, callTime, counselorName) {
    if (newStatus === '상담 일정 확정') {
        window.openScheduleModal(id, callTime, counselorName);
    } else {
        window.updateAppStatus(id, 'status', newStatus);
    }
};

window.openScheduleModal = function(id, time, name) {
    currentScheduleAppId = id;
    $("schedInputDate").value = ""; $("schedInputTime").value = "";
    $("schedInputName").value = (name && name !== 'null' && name !== 'undefined') ? name : '';
    $("scheduleModal").classList.add('show');
};

window.closeScheduleModal = function() { $("scheduleModal").classList.remove('show'); currentScheduleAppId = null; };

window.saveScheduleData = async function() {
    if (!currentScheduleAppId) return;
    const dVal = $("schedInputDate").value; const tVal = $("schedInputTime").value; const name = $("schedInputName").value.trim();
    if (!dVal || !tVal) { showToast("상담 날짜와 시간을 모두 선택해주세요."); return; }
    
    const dObj = new Date(dVal); const dow = ['일','월','화','수','목','금','토'][dObj.getDay()];
    const mm = dObj.getMonth() + 1; const dd = dObj.getDate();
    let [hh, min] = tVal.split(':'); let ampm = parseInt(hh) >= 12 ? '오후' : '오전'; let hh12 = parseInt(hh) % 12 || 12;
    const formattedCallTime = `${mm}월 ${dd}일(${dow}) ${ampm} ${hh12}:${min}`;

    const { error } = await supabaseClient.from('applications').update({ status: '상담 일정 확정', call_time: formattedCallTime, counselor_name: name }).eq('id', currentScheduleAppId);
    if (error) { showToast("저장 실패"); } else { 
        showToast("상담 일정이 확정되었습니다."); window.closeScheduleModal(); window.fetchApplications(); 
        
        const app = globalApps.find(a => String(a.id) === String(currentScheduleAppId));
        setTimeout(() => {
            window.openCustomConfirm(
              "일정 확정 완료", 
              null, 
              `고객에게 발송할 <b>사전 설문 링크</b>를 복사하시겠습니까?`, 
              () => { window.copySurveyLink(currentScheduleAppId, app.name); window.closeConfirmModal(); }, 
              "복사하기"
            );
        }, 300);
    }
};

// 🔥 멤버 이관 실패 방지: DB 중복 스캔 로직(Upsert 분기처리) 추가
window.updateAppStatus = async function(id, column, value) {
    if (column === 'join_status' && value === '가입 완료') {
        window.openCustomConfirm("가입 완료 (멤버 전환)", null, `해당 고객을 멤버 리스트로 이관하시겠습니까?<br><span style="font-size:12px; color:var(--text-secondary);">오늘 기준으로 6개월 활동 종료일이 자동 세팅됩니다.</span>`, async () => {
            const app = globalApps.find(a => String(a.id) === String(id)); if (!app) return;
            const d = new Date(); d.setMonth(d.getMonth() + 6);
            const endDateStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
            
            // DB에서 해당 연락처가 있는지 먼저 스캔
            const { data: existingMember, error: checkErr } = await supabaseClient.from('members').select('*').eq('phone', app.phone).limit(1);
            if (checkErr) { showToast("멤버 확인 중 오류 발생"); return; }
            
            let dbErr;
            if (existingMember && existingMember.length > 0) {
                // 존재하면 정보 덮어씌우기 (Update)
                const { error: updateErr } = await supabaseClient.from('members').update({ status: '활동 중', end_date: endDateStr, batch: app.desired_batch, name: app.name }).eq('phone', app.phone);
                dbErr = updateErr;
            } else {
                // 없으면 새로 넣기 (Insert)
                const { error: insertErr } = await supabaseClient.from('members').insert([{ name: app.name, phone: app.phone, batch: app.desired_batch, status: '활동 중', end_date: endDateStr }]);
                dbErr = insertErr;
            }

            if(dbErr) { showToast("멤버 이관 실패"); return; }
            await supabaseClient.from('applications').update({ join_status: '가입 완료' }).eq('id', id);
            showToast("멤버 이관이 완료되었습니다."); window.fetchApplications(); window.fetchMembers();
        });
        return;
    }
    
    if (column === 'join_status' && value === '다음 기수 희망') {
        const app = globalApps.find(a => String(a.id) === String(id)); let nextBatch = app.desired_batch;
        if (nextBatch && nextBatch.includes('기')) { let num = parseInt(nextBatch.replace(/[^0-9]/g, '')); if (!isNaN(num)) { nextBatch = (num + 1) + '기'; } }
        window.openCustomConfirm("다음 기수 희망", null, `해당 고객의 희망 기수를 <b>[${nextBatch}]</b>로 자동 변경하시겠습니까?`, async () => {
            await supabaseClient.from('applications').update({ join_status: '다음 기수 희망', desired_batch: nextBatch }).eq('id', id);
            showToast("다음 기수로 이월되었습니다."); window.fetchApplications();
        });
        return;
    }

    const { error } = await supabaseClient.from('applications').update({ [column]: value }).eq('id', id);
    if (error) showToast("업데이트 실패"); else { showToast("상태가 업데이트 되었습니다."); window.fetchApplications(); }
};

window.renderAppTable = function(data) {
  const tbody = $("appTableBody"); tbody.innerHTML = '';
  if(data.length === 0) { tbody.innerHTML = `<tr><td colspan="8" class="empty-state">내역이 없습니다.</td></tr>`; return; }
  data.forEach(row => {
    const interestFull = row.interest_detail ? `${row.interest_area} <div class="sub-text">(${row.interest_detail})</div>` : (row.interest_area || '-');
    
    let routeDisplay = parseAcquisitionChannel(row.acquisition_channel);
    if (row.brand_awareness_duration && row.brand_awareness_duration !== '정보없음') routeDisplay += ` <div class="sub-text">(${row.brand_awareness_duration})</div>`; else if (row.acquisition_detail) routeDisplay += ` <div class="sub-text">(${row.acquisition_detail})</div>`;
    
    const cStat = statusClassMap[row.status] || 'st-wait'; const cJoin = joinClassMap[row.join_status || ''] || 'jn-none'; const dis = row.status === '상담 완료' ? '' : 'disabled'; 
    
    let timeBadgeHtml = '';

    if(row.status === '상담 일정 확정' || row.status === '설문 완료') {
      let displayTime = (row.call_time && row.call_time !== 'null') ? row.call_time : '미정';
      timeBadgeHtml = `<span class="edit-schedule-link" onclick="window.openScheduleModal('${row.id}', '${displayTime}', '${row.counselor_name}')">상담 일정 수정</span>`;
    }

    let hasSurvey = row.survey_job || row.survey_edu;
    let surveyBadge = hasSurvey ? `<span class="status-badge badge-orange" style="margin-right:8px; font-size:11px; padding:2px 6px;">설문완료</span>` : `<span class="status-badge badge-gray" style="margin-right:8px; font-size:11px; padding:2px 6px;">미응답</span>`;
    let nameHtml = `${surveyBadge}<strong style="cursor:pointer; color:var(--text-display); transition:0.2s;" onmouseover="this.style.color='var(--primary)'" onmouseout="this.style.color='var(--text-display)'" onclick="window.openCrmModal('${row.id}')">${row.name || '-'}</strong>`;

    let mPreview = `<td class="m-preview" onclick="this.closest('tr').classList.toggle('expanded')"><div class="m-prev-top"><span class="m-prev-date">${formatDtWithDow(row.created_at)}</span><span class="status-badge ${cStat}" style="margin:0 !important;">${row.status}</span></div><div class="m-prev-title">[${row.desired_batch || '-'}] ${row.name || '-'} <span style="font-size:13px; font-weight:500; color:var(--text-secondary); margin-left:4px;">(${row.phone || '-'})</span></div><div class="m-prev-desc">${row.interest_area || '-'}</div><span class="m-toggle-hint">상세 정보 보기 ▼</span></td>`;

    const tr = document.createElement('tr');
    tr.innerHTML = `${mPreview}<td data-label="신청일시">${formatDt(row.created_at)}</td><td data-label="기수">${row.desired_batch || '-'}</td><td data-label="성함(설문여부)">${nameHtml}</td><td data-label="연락처">${row.phone || '-'}</td><td data-label="관심 분야"><div>${interestFull}</div></td><td data-label="유입 경로"><div>${routeDisplay}</div></td><td data-label="상담 진행 상황"><div class="action-wrap"><select class="status-select ${cStat}" onchange="window.handleStatusChange('${row.id}', this.value, '${String(row.call_time || '')}', '${String(row.counselor_name || '')}')"><option value="대기" ${row.status === '대기' ? 'selected' : ''}>대기</option><option value="상담 일정 조율 중" ${row.status === '상담 일정 조율 중' ? 'selected' : ''}>상담 일정 조율 중</option><option value="상담 일정 확정" ${row.status === '상담 일정 확정' ? 'selected' : ''}>상담 일정 확정</option><option value="설문 완료" ${row.status === '설문 완료' ? 'selected' : ''}>설문 완료 (확정)</option><option value="상담 완료" ${row.status === '상담 완료' ? 'selected' : ''}>상담 완료</option><option value="연락 두절" ${row.status === '연락 두절' ? 'selected' : ''}>연락 두절</option></select>${timeBadgeHtml}</div></td><td data-label="가입 여부"><div class="action-wrap"><select class="status-select ${cJoin}" onchange="window.updateAppStatus('${row.id}', 'join_status', this.value)" ${dis}><option value="" ${!row.join_status ? 'selected' : ''}>선택 전</option><option value="고민 중" ${row.join_status === '고민 중' ? 'selected' : ''}>고민 중</option><option value="가입 완료" ${row.join_status === '가입 완료' ? 'selected' : ''}>가입 완료</option><option value="미가입" ${row.join_status === '미가입' ? 'selected' : ''}>미가입</option><option value="다음 기수 희망" ${row.join_status === '다음 기수 희망' ? 'selected' : ''}>다음 기수 희망</option></select></div></td>`;
    tbody.appendChild(tr);
  });
}

function getFrequency(arr) { return Object.entries(arr.reduce((acc, val) => { if(val) acc[val] = (acc[val] || 0) + 1; return acc; }, {})).sort((a, b) => b[1] - a[1]); }
function generateBarHTML(label, count, maxCount, opacity = 1) { const percent = maxCount === 0 ? 0 : Math.round((count / maxCount) * 100); return `<div style="margin-bottom:8px;"><div style="font-size:13px; font-weight:600; margin-bottom:4px; display:flex; justify-content:space-between;"><span>${label}</span><span style="color:var(--text-secondary); font-size:12px;">${count}건 (${percent}%)</span></div><div style="background:var(--border-strong); height:8px; border-radius:4px; overflow:hidden;"><div style="width:${percent}%; background:rgba(255, 121, 0, ${opacity}); height:100%;"></div></div></div>`; }

window.renderStatistics = function(data) {
  const container = $("statsContainer"); container.innerHTML = ''; 
  if(data.length === 0) { $("insightSummaryText").innerHTML = "<div style='padding:16px;'>데이터가 부족합니다.</div>"; return; }
  
  const total = data.length; const counseled = data.filter(d => d.status === '상담 일정 확정' || d.status === '설문 완료' || d.status === '상담 완료').length; const joined = data.filter(d => d.join_status === '가입 완료').length; const convRate = total > 0 ? Math.round((joined / total) * 100) : 0;
  let channelMap = {}; let safeDataForSummary = { instaFollow:0, instaNonFollow:0, adNow:0, leadTime3M:0 };

  data.forEach(d => {
     let rawCh = String(d.acquisition_channel || '기타 경로'); let acq_ch = '기타 경로'; let detail = '';
     const match = rawCh.match(/\(([^)]+)\)/); if (match) { detail = match[1].trim(); rawCh = rawCh.split('(')[0].trim(); }

     if (rawCh.includes('인스타')) { acq_ch = '인스타그램'; if (!detail) detail = (d.acquisition_detail && d.acquisition_detail !== '정보없음' && d.acquisition_detail !== 'null') ? String(d.acquisition_detail) : ''; if (!detail) detail = (d.brand_awareness_duration && d.brand_awareness_duration !== '정보없음' && d.brand_awareness_duration !== 'null') ? String(d.brand_awareness_duration) : ''; if (detail.includes('팔로')) safeDataForSummary.instaFollow++; else safeDataForSummary.instaNonFollow++; } 
     else if (rawCh.includes('광고') || rawCh.includes('스폰서드')) { acq_ch = '모집 광고'; if (!detail) detail = (d.brand_awareness_duration && d.brand_awareness_duration !== '정보없음' && d.brand_awareness_duration !== 'null') ? String(d.brand_awareness_duration) : ''; if (!detail) detail = (d.acquisition_detail && d.acquisition_detail !== '정보없음' && d.acquisition_detail !== 'null') ? String(d.acquisition_detail) : ''; if (detail.includes('방금') || detail.includes('1주일') || detail.includes('한 달') || detail.includes('1개월 이내')) safeDataForSummary.adNow++; else if (detail.includes('3개월') || detail.includes('이상')) safeDataForSummary.leadTime3M++; } 
     else if (rawCh.includes('지인')) { acq_ch = '지인 추천'; if (!detail) detail = (d.acquisition_detail && d.acquisition_detail !== '정보없음' && d.acquisition_detail !== 'null') ? String(d.acquisition_detail) : ''; } 
     else if (rawCh.includes('블로그')) { acq_ch = '네이버 블로그'; if (!detail) detail = (d.acquisition_detail && d.acquisition_detail !== '정보없음' && d.acquisition_detail !== 'null') ? String(d.acquisition_detail) : ''; } 
     else { acq_ch = rawCh; }

     if(!channelMap[acq_ch]) channelMap[acq_ch] = { total: 0, details: {} }; channelMap[acq_ch].total++;
     if(detail && detail !== 'null' && detail !== '정보없음' && !detail.includes('미기재')) { channelMap[acq_ch].details[detail] = (channelMap[acq_ch].details[detail] || 0) + 1; } 
  });

  let interestData = getFrequency(data.map(d => String(d.interest_area||''))); let topInterest = interestData.length > 0 ? interestData[0][0] : '없음'; let topInterestRate = total > 0 && interestData.length > 0 ? Math.round((interestData[0][1] / total) * 100) : 0;
  
  let summaryHtml = `<div style="display:flex; flex-wrap:wrap; gap:16px; margin-bottom:32px;"><div style="flex:1; min-width:260px; background:#fff; border:1px solid var(--border-strong); border-radius:12px; padding:24px; display:flex; flex-direction:column; justify-content:center; align-items:center; text-align:center;"><div style="font-size:13px; color:var(--text-secondary); margin-bottom:8px; font-weight:600;">기수 주요 목적 (관심사)</div><div style="font-size:20px; font-weight:800; color:var(--text-display);">${topInterest} <span style="font-size:15px; color:var(--primary);">(${topInterestRate}%)</span></div></div><div style="flex:1; min-width:260px; background:#fff; border:1px solid var(--border-strong); border-radius:12px; padding:24px; display:flex; flex-direction:column; justify-content:center; align-items:center; text-align:center;"><div style="font-size:13px; color:var(--text-secondary); margin-bottom:8px; font-weight:600;">인스타그램 팬덤 유입 현황</div><div style="font-size:15px; font-weight:700; color:var(--text-display);">팔로워 <span style="font-size:22px; color:var(--primary); font-weight:800;">${safeDataForSummary.instaFollow}</span>명 <span style="color:var(--border-strong); margin:0 8px;">|</span> 비팔로워 <span style="font-size:20px; font-weight:800;">${safeDataForSummary.instaNonFollow}</span>명</div></div><div style="flex:1; min-width:260px; background:#fff; border:1px solid var(--border-strong); border-radius:12px; padding:24px; display:flex; flex-direction:column; justify-content:center; align-items:center; text-align:center;"><div style="font-size:13px; color:var(--text-secondary); margin-bottom:8px; font-weight:600;">모집 광고 리드타임 (고민 후 전환)</div><div style="font-size:15px; font-weight:700; color:var(--text-display);">1개월 이상 <span style="font-size:22px; color:var(--primary); font-weight:800;">${safeDataForSummary.leadTime3M}</span>명 <span style="color:var(--border-strong); margin:0 8px;">|</span> 단기 유입 <span style="font-size:20px; font-weight:800;">${safeDataForSummary.adNow}</span>명</div></div></div>`;
  $("insightSummaryText").innerHTML = summaryHtml;

  let cardsHtml = `<div class="stat-card" style="padding:24px 16px;"><div style="font-size:13px; color:var(--text-secondary); margin-bottom:8px; font-weight:600;">총 신청 건수</div><div style="font-size:26px; font-weight:800; color:var(--text-display); line-height:1;">${total}<span style="font-size:15px; margin-left:2px;">건</span></div></div><div class="stat-card" style="padding:24px 16px;"><div style="font-size:13px; color:var(--text-secondary); margin-bottom:8px; font-weight:600;">최종 가입 전환율</div><div style="font-size:26px; font-weight:800; color:var(--primary); line-height:1;">${convRate}<span style="font-size:18px;">%</span></div></div><div class="stat-card" style="padding:24px 16px;"><div style="font-size:13px; color:var(--text-secondary); margin-bottom:8px; font-weight:600;">인스타그램 (총합)</div><div style="font-size:26px; font-weight:800; color:var(--text-display); line-height:1;">${channelMap['인스타그램'] ? channelMap['인스타그램'].total : 0}<span style="font-size:15px; margin-left:2px;">건</span></div></div><div class="stat-card" style="padding:24px 16px;"><div style="font-size:13px; color:var(--text-secondary); margin-bottom:8px; font-weight:600;">모집 광고 (총합)</div><div style="font-size:26px; font-weight:800; color:var(--text-display); line-height:1;">${channelMap['모집 광고'] ? channelMap['모집 광고'].total : 0}<span style="font-size:15px; margin-left:2px;">건</span></div></div>`;
  $("statsCards").innerHTML = cardsHtml;
  
  let funnelHtml = `<div class="stat-card" style="padding:24px;"><div style="font-size:16px; font-weight:800; margin-bottom:20px; color:var(--text-display); width:100%; text-align:left;">고객 전환 퍼널 (Funnel)</div><div class="funnel-wrap"><div class="funnel-step"><div style="font-size:13px; color:var(--text-secondary); margin-bottom:6px; font-weight:600;">신청 접수</div><div style="font-size:20px; font-weight:800; color:var(--text-display);">${total}명</div></div><div class="funnel-arrow">➔</div><div class="funnel-step"><div style="font-size:13px; color:var(--text-secondary); margin-bottom:6px; font-weight:600;">상담 확정/완료</div><div style="font-size:20px; font-weight:800; color:var(--text-display); margin-bottom:4px;">${counseled}명</div><div style="font-size:12px; color:var(--primary); font-weight:700; background:#fff; padding:2px 8px; border-radius:4px; border:1px solid #f2f4f6;">${total > 0 ? Math.round(counseled/total*100) : 0}% 전환</div></div><div class="funnel-arrow">➔</div><div class="funnel-step success"><div style="font-size:13px; margin-bottom:6px; font-weight:600;">가입 완료</div><div style="font-size:20px; font-weight:800; margin-bottom:4px;">${joined}명</div><div style="font-size:12px; color:var(--primary); font-weight:700; background:#fff; padding:2px 8px; border-radius:4px;">${counseled > 0 ? Math.round(joined/counseled*100) : 0}% 전환</div></div></div></div>`;
  $("statsFunnel").innerHTML = funnelHtml; $("statsFunnel").style.display = 'block';

  let sortedChannels = Object.entries(channelMap).sort((a,b) => b[1].total - a[1].total);
  let treeChartHtml = '';
  
  sortedChannels.forEach((item, index) => {
     let chName = item[0]; let chTotal = item[1].total; let details = item[1].details; let opacity = index === 0 ? 1 : (index === 1 ? 0.8 : (index === 2 ? 0.6 : 0.4)); let percent = total > 0 ? Math.round((chTotal / total) * 100) : 0;
     treeChartHtml += `<div style="margin-bottom: 16px;"><div style="font-size:14px; font-weight:800; color:var(--text-display); margin-bottom:4px; display:flex; justify-content:space-between;"><span>${index+1}. ${chName}</span><span>${chTotal}건 (${percent}%)</span></div><div style="background:var(--border-strong); height:8px; border-radius:4px; overflow:hidden; margin-bottom:8px;"><div style="width: ${percent}%; background:rgba(255, 121, 0, ${opacity}); height:100%;"></div></div>`;
     let sortedDetails = Object.entries(details).sort((a,b) => b[1] - a[1]);
     if (sortedDetails.length > 0) { sortedDetails.forEach(det => { let dName = det[0]; let dCount = det[1]; let dPercent = Math.round((dCount / chTotal) * 100); treeChartHtml += `<div style="display:flex; align-items:center; margin-bottom:6px; padding-left:12px;"><div style="color:var(--text-tertiary); margin-right:8px; font-size:12px; font-weight:800;">ㄴ</div><div style="flex:1;"><div style="display:flex; justify-content:space-between; font-size:12px; font-weight:600; color:var(--text-secondary); margin-bottom:4px;"><span>${dName}</span><span>${dCount}건</span></div><div style="background:var(--border); height:4px; border-radius:2px; overflow:hidden;"><div style="width: ${dPercent}%; background:rgba(255, 121, 0, ${opacity * 0.4}); height:100%;"></div></div></div></div>`; }); }
     treeChartHtml += `</div>`;
  });

  let chartsHtml = `<div class="stat-card" style="padding:24px; text-align:left; align-items:flex-start;"><div style="font-size:16px; font-weight:800; margin-bottom:24px; width:100%;">전체 유입 경로 순위 (상세 속성 트리)</div><div style="width:100%;">${treeChartHtml}</div></div><div class="stat-card" style="padding:24px; text-align:left; align-items:flex-start;"><div style="font-size:16px; font-weight:800; margin-bottom:24px; width:100%;">관심 분야 (목적)</div><div style="width:100%;">${getFrequency(data.map(d => String(d.interest_area||''))).map((c, i) => generateBarHTML(c[0], c[1], total, i === 0 ? 1 : (i === 1 ? 0.8 : (i === 2 ? 0.6 : 0.4)))).join('')}</div></div>`;
  container.innerHTML = chartsHtml;
  window.currentInsightData = { total, joined, instaCount: channelMap['인스타그램']?channelMap['인스타그램'].total:0, adCount: channelMap['모집 광고']?channelMap['모집 광고'].total:0, leadTime1M: safeDataForSummary.adNow, leadTime3M: safeDataForSummary.leadTime3M };
}

// ==========================================
// 10. 멤버 리스트 관리
// ==========================================
window.fetchMembers = async function() { 
  const { data, error } = await supabaseClient.from('members').select('*').order('created_at', { ascending: false }); 
  if (error) return; 
  globalMembers = data; 
  let bSet = new Set(); globalMembers.forEach(m => { if(m.batch) bSet.add(m.batch); });
  let bHtml = `<option value="all">기수 전체</option>` + Array.from(bSet).sort().reverse().map(b=>`<option value="${b}">${b}</option>`).join("");
  if($("memberBatchFilter")) $("memberBatchFilter").innerHTML = bHtml;
  window.searchMembers(); 
}

window.searchMembers = function() {
  const query = $("memberSearch").value.trim().toLowerCase(); 
  const statusFilter = $("memberStatusFilter") ? $("memberStatusFilter").value : 'all';
  const batchFilter = $("memberBatchFilter") ? $("memberBatchFilter").value : 'all';
  const today = new Date(); today.setHours(0,0,0,0);
  
  const filtered = globalMembers.filter(m => {
    let isExpired = true; let isPaused = m.status === '활동 일시정지';
    if (m.end_date && m.end_date.length === 10) { let endD = new Date(m.end_date); endD.setHours(0,0,0,0); if (endD >= today) isExpired = false; }
    let statusText = m.status || '활동 중'; 
    if (statusText === '패널티 정지') statusText = '패널티 정지'; else if (statusText === '활동 일시정지') statusText = '활동 일시정지'; else if (isExpired) statusText = '활동 종료';
    let matchQuery = `${m.batch||''} ${m.name||''} ${m.phone||''} ${statusText}`.toLowerCase().includes(query);
    let matchBatch = batchFilter === 'all' || m.batch === batchFilter;
    let matchStatus = false;
    if (statusFilter === 'all') matchStatus = true; else if (statusFilter === '활동 중 (전체)') matchStatus = ['활동 중', '연장 활동 중', '단일권 이용'].includes(statusText); else matchStatus = statusText === statusFilter;
    return matchQuery && matchStatus && matchBatch;
  });
  renderMemberTable(filtered);
}

function renderMemberTable(data) {
  const tbody = $("memberTableBody"); tbody.innerHTML = ''; if(data.length === 0) { tbody.innerHTML = `<tr><td colspan="6" class="empty-state">내역이 없습니다.</td></tr>`; return; }
  const today = new Date(); today.setHours(0,0,0,0);
  data.forEach(row => {
    let yy = '', mm = '', dd = ''; let isExpired = true; let isPaused = row.status === '활동 일시정지';
    if (row.end_date && row.end_date.length === 10) { [yy, mm, dd] = row.end_date.split('-'); let endD = new Date(row.end_date); endD.setHours(0,0,0,0); if (endD >= today) isExpired = false; }
    if (isExpired && !isPaused && row.status !== '패널티 정지') { yy = ''; mm = ''; dd = ''; } 
    
    let currentStat = row.status || '활동 중'; let statusBadge = "";
    if (currentStat === '패널티 정지') statusBadge = `<span class="status-badge badge-red">패널티 정지</span>`; else if (isPaused) statusBadge = `<span class="status-badge badge-gray">일시정지</span>`; else if (isExpired) statusBadge = `<span class="status-badge badge-ended" style="background:#fff0f0;color:var(--error);">활동 종료</span>`; else statusBadge = `<span class="status-badge badge-active" style="background:#e8f5e9;color:var(--success);">${currentStat}</span>`;
    
    let yearOpts = '<option value="">년도</option>'; for(let i = 2024; i <= 2030; i++) yearOpts += `<option value="${i}" ${yy == i ? 'selected' : ''}>${i}년</option>`; let monthOpts = '<option value="">월</option>'; for(let i = 1; i <= 12; i++) { let val = String(i).padStart(2, '0'); monthOpts += `<option value="${val}" ${mm == val ? 'selected' : ''}>${i}월</option>`; } let dayOpts = '<option value="">일</option>'; for(let i = 1; i <= 31; i++) { let val = String(i).padStart(2, '0'); dayOpts += `<option value="${val}" ${dd == val ? 'selected' : ''}>${i}일</option>`; }
    let mPreview = `<td class="m-preview" onclick="this.closest('tr').classList.toggle('expanded')"><div class="m-prev-top"><span class="m-prev-date">${formatDtWithDow(row.created_at)}</span>${statusBadge}</div><div class="m-prev-title" style="font-size:16px;">[${row.batch || '-'}] ${row.name || '-'} <span style="font-size:13px; font-weight:500; color:var(--text-secondary); margin-left:4px;">(${row.phone || '-'})</span></div><span class="m-toggle-hint">상세 정보 보기 ▼</span></td>`;

    const tr = document.createElement('tr');
    tr.innerHTML = `${mPreview}<td data-label="등록일">${formatDt(row.created_at)}</td><td data-label="상태" class="tc">${statusBadge}</td><td data-label="기수"><strong>${row.batch || '-'}</strong></td><td data-label="성함"><strong style="cursor:pointer;" onclick="$('memberSearch').value='${row.name}'; window.searchMembers();">${row.name || '-'}</strong></td><td data-label="연락처">${row.phone || '-'}</td><td data-label="종료일 관리" class="col-action"><div class="date-select-group" data-id="${row.id}"><div class="date-inputs"><select class="date-sel year">${yearOpts}</select><select class="date-sel month">${monthOpts}</select><select class="date-sel day">${dayOpts}</select></div><div class="action-btns"><select class="date-sel option-btn" onchange="window.handleMemberOption('${row.id}', '${row.batch || '미정'}', '${row.name}', '${row.phone}', '${row.end_date || ''}', this)"><option value="">옵션 선택</option><option value="1">1개월 연장</option><option value="3">3개월 연장</option><option value="6">6개월 연장</option><option value="bonus">보너스 1개월</option><option value="day">당일권 추가</option><option value="pause">활동 일시정지</option><option value="resume">활동 재개 (자동 연장)</option><option value="release">패널티 적용/해제</option></select><button class="btn-outline btn-sm" onclick="event.stopPropagation(); window.openHistoryModal('${row.phone}', '${row.name}')">내역</button></div></div></td>`;
    tbody.appendChild(tr);
  });
}

document.addEventListener('change', function(e) {
  if (e.target.classList.contains('date-sel') && !e.target.classList.contains('option-btn')) { const group = e.target.closest('.date-select-group'); const y = group.querySelector('.year').value, m = group.querySelector('.month').value, d = group.querySelector('.day').value; if (y && m && d) window.updateMemberEndDate(group.dataset.id, `${y}-${m}-${d}`).then(() => window.fetchMembers()); }
});

window.handleMemberOption = function(id, batch, name, phone, currentEndDate, selectEl) {
  const opt = selectEl.value; const optText = selectEl.options[selectEl.selectedIndex].text; selectEl.value = ''; if(!opt) return;
  let confirmMsg = ""; let baseDateForUpdate = new Date(); baseDateForUpdate.setHours(0,0,0,0);
  if (currentEndDate && currentEndDate.length === 10) { let endD = new Date(currentEndDate); endD.setHours(0,0,0,0); if (endD >= baseDateForUpdate) { baseDateForUpdate = endD; } }

  if(opt === 'release') {
      const m = globalMembers.find(x => String(x.id) === String(id)); let newStat = m.status === '패널티 정지' ? '활동 중' : '패널티 정지'; confirmMsg = `상태를 <b>[${newStat}]</b> 상태로 전환하시겠습니까?`;
  } else if (opt === 'pause') {
      confirmMsg = `활동을 <b>일시정지</b>하시겠습니까?<br><span style="font-size:12px; color:var(--text-secondary); font-weight:500;">(재개 시 정지된 기간만큼 종료일이 연장됩니다.)</span>`;
  } else if (opt === 'resume') {
      confirmMsg = `활동을 <b>재개</b>하시겠습니까?<br><span style="font-size:12px; color:var(--text-secondary); font-weight:500;">(이전 정지 기간을 자동 계산하여 연장합니다.)</span>`;
  } else {
      let baseDate = new Date(); baseDate.setHours(0,0,0,0); let isActive = false;
      if (currentEndDate && currentEndDate.length === 10) { let endD = new Date(currentEndDate); endD.setHours(0,0,0,0); if (endD >= baseDate) { isActive = true; } }
      if (isActive) { confirmMsg = `이어서 <b>${optText}</b>을(를) 적용하시겠습니까?`; } else { confirmMsg = `오늘 날짜를 기준으로<br><b>${optText}</b>을(를) 새롭게 적용하시겠습니까?`; }
  }

  let statText = "";
  if (opt === 'release' || opt === 'pause' || opt === 'resume') { let cur = opt === 'resume' ? '일시정지' : (opt === 'release' ? '확인요망' : '활동 중'); statText = `현재 상태: <b>${cur}</b>`; } else { if(currentEndDate && new Date(currentEndDate) >= new Date().setHours(0,0,0,0)) { statText = `현재 활동 종료일: <b>${currentEndDate}</b>`;  } else { statText = `현재 활동 종료 상태입니다.`;  } }

  pendingOptionData = { id, name, phone, opt, optText, baseDate: baseDateForUpdate, currentEndDate };
  
  window.openCustomConfirm(`[${batch || '미정'}] ${name} 님`, statText, confirmMsg, async () => {
      if(opt === 'release') { const m = globalMembers.find(x => String(x.id) === String(id)); let newStat = m.status === '패널티 정지' ? '활동 중' : '패널티 정지'; m.status = newStat; window.searchMembers(); showToast(`상태가 [${newStat}](으)로 변경되었습니다.`); return; }
      if(opt === 'pause') { const m = globalMembers.find(x => String(x.id) === String(id)); m.status = '활동 일시정지'; window.searchMembers(); await supabaseClient.from('member_history').insert([{ member_name: name, member_phone: phone, action_detail: '활동 일시정지 시작', amount: '-' }]); showToast("활동이 일시정지되었습니다."); return; }
      if(opt === 'resume') {
          const { data: hist } = await supabaseClient.from('member_history').select('*').eq('member_phone', phone).like('action_detail', '활동 일시정지 시작%').order('created_at', { ascending: false }).limit(1);
          let extendDays = 0; if (hist && hist.length > 0) { let pauseDate = new Date(hist[0].created_at); pauseDate.setHours(0,0,0,0); let todayDate = new Date(); todayDate.setHours(0,0,0,0); extendDays = Math.floor((todayDate - pauseDate) / (1000 * 60 * 60 * 24)); }
          if (extendDays < 0) extendDays = 0; let endD = new Date(currentEndDate); endD.setDate(endD.getDate() + extendDays); let newEndDate = `${endD.getFullYear()}-${String(endD.getMonth() + 1).padStart(2, '0')}-${String(endD.getDate()).padStart(2, '0')}`;
          const m = globalMembers.find(x => String(x.id) === String(id)); m.status = '연장 활동 중'; m.end_date = newEndDate; window.searchMembers(); await supabaseClient.from('members').update({ end_date: newEndDate }).eq('id', id); await supabaseClient.from('member_history').insert([{ member_name: name, member_phone: phone, action_detail: `활동 재개 (정지일수: ${extendDays}일 자동 연장)`, amount: '-' }]); showToast(`재개 완료. ${extendDays}일이 연장되었습니다.`); return;
      }

      let amountStr = '0원'; let targetStatus = '연장 활동 중';
      if (opt === '1') { baseDateForUpdate.setMonth(baseDateForUpdate.getMonth() + 1); amountStr = '220,000원'; } else if (opt === '3') { baseDateForUpdate.setMonth(baseDateForUpdate.getMonth() + 3); amountStr = '550,000원'; } else if (opt === '6') { baseDateForUpdate.setMonth(baseDateForUpdate.getMonth() + 6); amountStr = '1,100,000원'; } else if (opt === 'bonus') { baseDateForUpdate.setMonth(baseDateForUpdate.getMonth() + 1); amountStr = '무료 제공'; } else if (opt === 'day') { baseDateForUpdate.setDate(baseDateForUpdate.getDate() + 1); amountStr = '별도 안내'; targetStatus = '단일권 이용'; }
      let yyyy = baseDateForUpdate.getFullYear(), mm = String(baseDateForUpdate.getMonth() + 1).padStart(2, '0'), dd = String(baseDateForUpdate.getDate()).padStart(2, '0'); const newDateStr = `${yyyy}-${mm}-${dd}`;
      const m = globalMembers.find(x => String(x.id) === String(id)); m.end_date = newDateStr; m.status = targetStatus; window.searchMembers(); await supabaseClient.from('members').update({ end_date: newDateStr }).eq('id', id); await supabaseClient.from('member_history').insert([{ member_name: name, member_phone: phone, action_detail: optText, amount: amountStr }]); showToast("업데이트 되었습니다.");
  });
}

window.updateMemberEndDate = async function(id, dateStr) {
  const { error } = await supabaseClient.from('members').update({ end_date: dateStr }).eq('id', id);
  if(error) showToast("날짜 변경에 실패했습니다."); else showToast("종료일이 업데이트 되었습니다.");
}

window.deleteHistory = async function(id, phone, name, action_detail) {
    window.openCustomConfirm("내역 삭제", null, `해당 내역을 완전히 삭제하시겠습니까?<br><span style='font-size:12px;color:var(--text-secondary);'>(삭제 시, 늘어난 종료일이 자동으로 계산되어 복구됩니다.)</span>`, async () => {
        await supabaseClient.from('member_history').delete().eq('id', id);
        const m = globalMembers.find(x => String(x.phone) === String(phone));
        if (m && m.end_date) {
            let d = new Date(m.end_date); let isChanged = false;
            if (action_detail.includes('1개월 연장') || action_detail.includes('보너스 1개월')) { d.setMonth(d.getMonth() - 1); isChanged = true; } else if (action_detail.includes('3개월 연장')) { d.setMonth(d.getMonth() - 3); isChanged = true; } else if (action_detail.includes('6개월 연장')) { d.setMonth(d.getMonth() - 6); isChanged = true; } else if (action_detail.includes('당일권 추가')) { d.setDate(d.getDate() - 1); isChanged = true; }
            if (isChanged) { let newEndDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; m.end_date = newEndDate; await supabaseClient.from('members').update({ end_date: newEndDate }).eq('phone', phone); }
        }
        showToast("내역이 삭제되고 종료일이 복구되었습니다."); window.searchMembers(); window.openHistoryModal(phone, name); 
    });
};

window.openHistoryModal = async function(phone, name) {
  $("historyModalTitle").innerText = `${name} 님의 내역`; const modal = $("historyModal"); modal.classList.add('show'); const body = $("historyModalBody"); body.innerHTML = '<div class="empty-state">내역을 불러오는 중입니다.</div>';
  const { data, error } = await supabaseClient.from('member_history').select('*').eq('member_phone', phone).order('created_at', { ascending: false });
  if (error || !data || data.length === 0) { body.innerHTML = '<div class="empty-state">결제/연장 내역이 없습니다.</div>'; return; }
  body.innerHTML = '<div style="display:flex;flex-direction:column;gap:12px;padding:24px 0;">' + data.map(item => `<div style="background:#f9fafb;padding:16px;border-radius:12px;border:1px solid var(--border-strong);display:flex;justify-content:space-between;align-items:center;"><div><div style="font-weight:700;margin-bottom:4px;color:var(--text-display);">${item.action_detail}</div><div style="font-size:13px;color:var(--text-secondary);">${formatDt(item.created_at)}</div></div><div style="display:flex; align-items:center; gap:12px;"><div style="font-weight:700;color:var(--primary);">${item.amount||''}</div><button class="btn-outline btn-sm" style="color:var(--error);border-color:var(--border-strong);" onclick="event.stopPropagation(); window.deleteHistory('${item.id}', '${phone}', '${name}', '${item.action_detail}')">삭제</button></div></div>`).join('') + '</div>';
}
window.closeHistoryModal = function() { $("historyModal").classList.remove('show'); }

window.downloadExcel = function(type) {
  if (type === 'applications' && isInsightView) {
    const d = window.currentInsightData || {};
    let csv = "\uFEFF항목,수치,비고\n";
    csv += `총 신청 건수,${d.total||0}건,-\n`; csv += `최종 가입 완료,${d.joined||0}건,(전환율 ${d.total > 0 ? Math.round(d.joined/d.total*100) : 0}%)\n`; csv += `인스타그램 총 유입,${d.instaCount||0}건,-\n`; csv += `모집 광고/스폰서드 유입,${d.adCount||0}건,-\n`;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' }); const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `위커피_인사이트_마케팅_보고서_${new Date().toISOString().slice(0,10)}.csv`; link.click(); return;
  }
  let data = []; let headers = []; let filename = "";
  if(type === 'applications') { data = globalApps; filename = "가입신청"; headers = ['신청일', '기수', '성함', '연락처', '관심분야', '유입경로', '진행상황', '가입여부', '상담일시', '담당자']; } else if(type === 'members') { data = globalMembers; filename = "멤버리스트"; headers = ['등록일', '상태', '기수', '성함', '연락처', '활동종료일']; } else if(type === 'reservations') { data = gRes; filename = "예약현황"; headers = ['접수일', '기수', '성함', '연락처', '예약날짜', '예약시간', '센터', '장비', '상태', '취소사유']; } else if(type === 'trainings') { data = gTrn; filename = "수업훈련"; headers = ['신청일', '기수', '성함', '연락처', '콘텐츠', '상태', '취소사유']; } else if(type === 'orders') { data = gOrd; filename = "생두주문"; headers = ['주문일', '주문번호', '기수', '성함', '연락처', '생두사', '상품명', '수량', '총금액', '상태']; }
  if(data.length === 0) { showToast('다운로드할 데이터가 없습니다.'); return; }
  let csvContent = '\uFEFF' + headers.join(',') + '\n';
  data.forEach(d => {
    let row = [];
    if(type === 'applications') row = [formatDt(d.created_at), d.desired_batch, d.name, d.phone, d.interest_area, d.acquisition_channel, d.status, d.join_status, d.call_time, d.counselor_name]; else if(type === 'members') row = [formatDt(d.created_at), d.status, d.batch, d.name, d.phone, d.end_date]; else if(type === 'reservations') row = [formatDt(d.created_at), d.batch, d.name, d.phone, d.res_date, d.res_time, d.center, d.space_equip, d.status, d.cancel_reason]; else if(type === 'trainings') row = [formatDt(d.created_at), d.batch, d.name, d.phone, d.content, d.status, d.cancel_reason]; else if(type === 'orders') row = [formatDt(d.created_at), d.id, d.batch, d.name, d.phone, d.vendor, d.item_name, d.quantity, d.total_price, d.status];
    csvContent += row.map(item => { let text = String(item || ''); text = text.replace(/"/g, '""'); text = text.replace(/\n/g, ' '); return `"${text}"`; }).join(',') + '\n';
  });
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' }); const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `${filename}_${new Date().toISOString().slice(0,10)}.csv`; document.body.appendChild(link); link.click(); document.body.removeChild(link);
}

// 🔥 스케줄 관리 함수 재연결 (오류 방지)
window.openBlockModal = function() { 
  currentBlockId = null; $("blockModalTitle").innerText = "수업 및 훈련 등 등록"; $("blkId").value = ""; $("blkCategory").value = "기본 수업"; 
  $("blkDate").value = ""; $("blkStart").value = ""; $("blkEnd").value = ""; $("blkCenter").value = "마포 센터"; $("blkSpace").value = ""; $("blkReason").value = ""; $("blkCapacity").value = ""; 
  $("blockModal").classList.add('show'); 
}
window.editBlock = function(id) { 
  currentBlockId = id; const b = gBlk.find(x => String(x.id) === String(id)); if(!b) return; 
  $("blockModalTitle").innerText = "스케줄 내역 수정"; $("blkId").value = b.id; $("blkCategory").value = b.category; $("blkDate").value = b.block_date; $("blkStart").value = b.start_time; $("blkEnd").value = b.end_time; $("blkCenter").value = b.center; $("blkSpace").value = b.space_equip; $("blkReason").value = b.reason; $("blkCapacity").value = b.capacity || ""; 
  $("blockModal").classList.add('show'); 
}
window.saveBlockData = async function() {
  let dVal = $("blkDate").value; let stVal = $("blkStart").value; let enVal = $("blkEnd").value;
  const payload = { category: $("blkCategory").value, block_date: dVal, start_time: stVal, end_time: enVal, center: $("blkCenter").value, space_equip: $("blkSpace").value.trim(), reason: $("blkReason").value.trim(), capacity: parseInt($("blkCapacity").value) || null };
  if(!payload.block_date || !payload.start_time || !payload.end_time) { showToast("날짜와 시간을 정확히 입력해주세요."); return; }
  let error; if(currentBlockId) { const res = await supabaseClient.from('blocks').update(payload).eq('id', currentBlockId); error = res.error; } else { const res = await supabaseClient.from('blocks').insert([payload]); error = res.error; }
  if(error) showToast("저장 실패"); else { showToast("저장되었습니다."); window.closeBlockModal(); window.fetchCenterData(); }
}
window.closeBlockModal = function() { $("blockModal").classList.remove('show'); currentBlockId = null; }
