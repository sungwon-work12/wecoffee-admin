const { createClient } = supabase;
const supabaseClient = createClient('https://dqvzowmhxorxhiqoibmk.supabase.co', 'sb_publishable_DSi3rGnuQhy6OtML_3ukEA_7ptfaoK-');
const $ = id => document.getElementById(id), $$ = q => document.querySelector(q), $$$ = q => document.querySelectorAll(q);
let globalApps=[], globalMembers=[], gRes=[], gTrn=[], gOrd=[], gBlk=[], gNotice=[];
let isInsightView = false, currentCalDate = new Date(), currentScheduleAppId = null, currentBlockId = null, pendingOptionData = null;
let currentGlobalCenter = '전체', currentDashView = 'week', currentDashMonthOffset = 0, currentAppDashView = 'week', appDashMonthOffset = 0;
let currentSummaryData = [], currentInsightData = {};
const equipList = ["이지스터 800(신형)-1", "이지스터 800(신형)-2", "이지스터 800(구형)-3", "이지스터 800(구형)-4", "이지스터 1.8", "스트롱홀드 S7X", "아스토리아 스톰 2그룹", "브루잉존", "커핑존", "스터디존"];
let quillEditor = null;

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
  const fallbackHolidays = { '2024-01-01': '신정', '2024-02-09': '설날 연휴', '2024-02-10': '설날', '2024-02-11': '설날 연휴', '2024-02-12': '대체공휴일', '2024-03-01': '삼일절', '2024-04-10': '국회의원선거', '2024-05-05': '어린이날', '2024-05-06': '대체공휴일', '2024-05-15': '부처님오신날', '2024-06-06': '현충일', '2024-08-15': '광복절', '2024-09-16': '추석 연휴', '2024-09-17': '추석', '2024-09-18': '추석 연휴', '2024-10-03': '개천절', '2024-10-09': '한글날', '2024-12-25': '기독탄신일' };
  return fallbackHolidays[key] || null;
};

function getDow(dStr) { if(!dStr) return ''; const d = new Date(dStr.replace(/-/g, '/')); if(isNaN(d.getTime())) return ''; return ['일','월','화','수','목','금','토'][d.getDay()]; }
function formatDtWithDow(dateStr) { if(!dateStr) return "-"; const d = new Date(dateStr); if(isNaN(d.getTime())) return dateStr; const dow = ['일','월','화','수','목','금','토'][d.getDay()]; return `${d.getFullYear().toString().slice(-2)}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')}(${dow}) ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`; }
function formatDt(dateStr) { if(!dateStr) return "-"; const d = new Date(dateStr); return `${d.getFullYear().toString().slice(-2)}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`; }
function comma(str) { return Number(String(str).replace(/[^0-9]/g, '')).toLocaleString(); }
function showToast(msg) { const toast = $("toast"); toast.innerText = msg; toast.classList.add('show'); setTimeout(() => toast.classList.remove('show'), 2500); }

window.formatBlockDate = function(v) { let d = String(v).replace(/\D/g, ''); if(d.length === 4) { let y = new Date().getFullYear(); return `${y}-${d.slice(0,2)}-${d.slice(2,4)}`; } if(d.length === 6) { return `20${d.slice(0,2)}-${d.slice(2,4)}-${d.slice(4,6)}`; } if(d.length >= 8) { return `${d.slice(0,4)}-${d.slice(4,6)}-${d.slice(6,8)}`; } return v; }
window.formatBlockTime = function(v) { let t = String(v).replace(/\D/g, ''); if(t.length === 1) return `0${t}:00`; if(t.length === 2) return `${t.padStart(2,'0')}:00`; if(t.length === 3) return `0${t.slice(0,1)}:${t.slice(1,3)}`; if(t.length >= 4) return `${t.slice(0,2)}:${t.slice(2,4)}`; return v; }

window.formatCounselDateDisplay = function(val) {
    if(!val) return '';
    let dt = String(val).replace(/\D/g, '');
    if(dt.length === 8) dt = dt.slice(4);
    if(dt.length > 4 && dt.length !== 8) dt = dt.slice(-4);
    if(dt.length !== 4) return val;
    let now = new Date();
    let y = now.getFullYear();
    let m = parseInt(dt.slice(0,2), 10);
    let d = parseInt(dt.slice(2,4), 10);
    if (m < now.getMonth() + 1 - 2) y += 1;
    let dObj = new Date(y, m - 1, d);
    if(isNaN(dObj.getTime())) return val;
    let dowKr = ['일','월','화','수','목','금','토'][dObj.getDay()];
    return `${y}년 ${m}월 ${d}일 (${dowKr})`;
}

window.formatCounselDateRaw = function(val) {
    if(!val) return '';
    let match = val.match(/(\d+)년\s*(\d+)월\s*(\d+)일/);
    if(match) return String(match[2]).padStart(2,'0') + String(match[3]).padStart(2,'0');
    let dt = String(val).replace(/\D/g, '');
    if(dt.length > 4) return dt.slice(-4);
    return dt;
}

window.formatCounselTimeDisplay = function(val) {
    if(!val) return '';
    let t = String(val).replace(/\D/g, '');
    if(t.length < 3) return val;
    let hh = parseInt(t.length === 3 ? t.slice(0,1) : t.slice(0,2), 10);
    let mm = t.length === 3 ? t.slice(1,3) : t.slice(2,4);
    let ampm = hh >= 12 ? '오후' : '오전';
    let hh12 = hh % 12 || 12;
    return `${ampm} ${hh12}:${mm}`;
}

window.copyTxt = function(txt) {
    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(txt).then(() => { showToast("사전 설문 링크가 복사되었습니다."); }).catch(err => { fallbackCopyTextToClipboard(txt); });
    } else { fallbackCopyTextToClipboard(txt); }
};
function fallbackCopyTextToClipboard(text) {
    var textArea = document.createElement("textarea"); textArea.value = text; textArea.style.top = "0"; textArea.style.left = "0"; textArea.style.position = "fixed"; document.body.appendChild(textArea); textArea.focus(); textArea.select();
    try { document.execCommand('copy'); showToast("사전 설문 링크가 복사되었습니다."); } catch (err) { showToast("복사 실패"); } document.body.removeChild(textArea);
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

function initializeApp() {
  window.fetchHolidays(new Date().getFullYear());
  supabaseClient.auth.onAuthStateChange((event, session) => {
    if (session) { 
      var lv = $("login-view"); if(lv) lv.classList.remove('active'); 
      var dv = $("dashboard-view"); if(dv) dv.style.display = 'block'; 
      let savedMain = localStorage.getItem('wecoffee_main_tab') || 'page-center'; let savedSub = localStorage.getItem('wecoffee_sub_tab') || 'sub-res';
      if(savedSub === 'sub-trn' || savedSub === 'sub-blk') savedSub = 'sub-trn-blk';
      let mainEl = document.querySelector(`.gnb-item[onclick*="${savedMain}"]`); if(mainEl) window.switchMainTab(savedMain, mainEl); else window.switchMainTab('page-center', document.querySelector(`.gnb-item[onclick*="page-center"]`));
      if(savedMain === 'page-center') { let subEl = document.querySelector(`.sub-item[onclick*="${savedSub}"]`); if(subEl) window.switchSubTab(savedSub, subEl); }
    } else { 
      var lv = $("login-view"); if(lv) lv.classList.add('active'); var dv = $("dashboard-view"); if(dv) dv.style.display = 'none'; 
    }
  });
  if($("dashSpaceFilter")) $("dashSpaceFilter").innerHTML = `<option value="전체">전체 공간</option><option value="로스팅존">로스팅존</option><option value="에스프레소존">에스프레소존</option><option value="브루잉존">브루잉존</option><option value="커핑존">커핑존</option><option value="스터디존">스터디존</option>`;
}
if (document.readyState === 'loading') document.addEventListener("DOMContentLoaded", initializeApp); else initializeApp();

supabaseClient.channel('admin-realtime').on('postgres_changes', { event: '*', schema: 'public', table: 'reservations' }, handleRealtime).on('postgres_changes', { event: '*', schema: 'public', table: 'trainings' }, handleRealtime).on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, handleRealtime).on('postgres_changes', { event: '*', schema: 'public', table: 'blocks' }, handleRealtime).on('postgres_changes', { event: '*', schema: 'public', table: 'notices' }, handleRealtime).on('postgres_changes', { event: '*', schema: 'public', table: 'applications' }, handleRealtime).on('postgres_changes', { event: '*', schema: 'public', table: 'members' }, handleRealtime).subscribe();
function handleRealtime(payload) { if (['reservations', 'trainings', 'orders', 'blocks', 'notices'].includes(payload.table)) window.fetchCenterData(); if (payload.table === 'applications') window.fetchApplications(); if (payload.table === 'members') window.fetchMembers(); }

window.switchMainTab = function(pageId, element) {
  $$$(".page").forEach(p => p.classList.remove('active')); $(pageId).classList.add('active');
  $$$(".gnb-item").forEach(item => item.classList.remove('active')); let targetEl = element || document.querySelector(`.gnb-item[onclick*="${pageId}"]`); if(targetEl) targetEl.classList.add('active');
  localStorage.setItem('wecoffee_main_tab', pageId);
  if(pageId === 'page-center') window.fetchCenterData();
  if(pageId === 'page-applications') { window.fetchApplications(); isInsightView = false; $("app-table-area").style.display = "block"; $("app-insight-area").style.display = "none"; $("insightToggleBtn").innerText = "인사이트 보기"; }
  if(pageId === 'page-members') window.fetchMembers();
}
window.switchSubTab = function(subId, element) {
  $$$(".sub-page").forEach(p => p.classList.remove('active')); $(subId).classList.add('active');
  $$$(".sub-item").forEach(item => item.classList.remove('active')); let targetEl = element || document.querySelector(`.sub-item[onclick*="${subId}"]`); if(targetEl) { targetEl.classList.add('active'); targetEl.classList.remove("tab-pulse"); }
  if (subId === 'sub-notice') { if($('globalFilterWrap')) $('globalFilterWrap').style.display = 'none'; } else { if($('globalFilterWrap')) $('globalFilterWrap').style.display = 'inline-flex'; }
  localStorage.setItem('wecoffee_sub_tab', subId); if(subId === 'sub-res') window.renderDashboard(); 
}

window.handleLogin = async function(e) { e.preventDefault(); const email = $("loginEmail").value, password = $("loginPassword").value; const { error } = await supabaseClient.auth.signInWithPassword({ email, password }); if (error) showToast("접근 권한이 없습니다."); else showToast("접속되었습니다."); }
window.handleLogout = async function() { await supabaseClient.auth.signOut(); showToast("로그아웃 되었습니다."); }

// 🔥 1. 복사 버튼 동기화 완벽 우회 (이벤트 초기화 및 재할당)
window.openCustomConfirm = function(title, statusHtml, actionHtml, callback, btnText = '적용하기') {
    $("confirmTarget").innerHTML = title;
    if(statusHtml) { $("confirmStateBox").style.display = 'block'; $("confirmSimpleBox").style.display = 'none'; $("confirmStatus").innerHTML = statusHtml; $("confirmActionState").innerHTML = actionHtml; } 
    else { $("confirmStateBox").style.display = 'none'; $("confirmSimpleBox").style.display = 'block'; $("confirmActionSimple").innerHTML = actionHtml; }
    
    let btn = $("confirmBtn");
    btn.innerText = btnText;
    btn.onclick = null; // 초기화
    
    btn.onclick = function() {
        if(btnText === '복사하기') {
            window.copyTxt(callback); // 동기적 즉시 실행
            window.closeConfirmModal();
        } else {
            (async () => {
                await callback();
                window.closeConfirmModal();
            })();
        }
    };
    $("confirmModal").classList.add('show');
}
window.closeConfirmModal = function() { $("confirmModal").classList.remove('show'); }
window.closeOnBackdrop = function(event, modalId) { if (event.target.id === modalId) $(modalId).classList.remove('show'); }

function initQuill() { if(!quillEditor && $('editor-container')) { quillEditor = new Quill('#editor-container', { theme: 'snow', modules: { toolbar: [ [{ 'header': [1, 2, 3, false] }], ['bold', 'italic', 'underline', 'strike'], [{ 'list': 'ordered'}, { 'list': 'bullet' }], [{ 'align': [] }], [{ 'color': [] }, { 'background': [] }], ['clean'] ] }, placeholder: '내용을 자유롭게 적어주세요.' }); } }
window.openNoticeModal = function() { $("noticeModal").classList.add('show'); setTimeout(() => { try { initQuill(); if(quillEditor) quillEditor.root.innerHTML = ''; } catch(e) {} }, 50); $("noticeId").value = ''; $("noticeTitle").value = ''; $("noticePinned").checked = false; $("noticeStatus").value = '발행'; $("noticeModalTitle").innerText = "새 공지사항 등록"; }
window.editNotice = function(id) { let n = gNotice.find(x => String(x.id) === String(id)); if(!n) return; $("noticeModal").classList.add('show'); setTimeout(() => { try { initQuill(); if(quillEditor) quillEditor.root.innerHTML = n.content || ''; } catch(e) {} }, 50); $("noticeId").value = n.id; $("noticeTitle").value = n.title; $("noticePinned").checked = n.is_pinned; $("noticeStatus").value = n.status || '발행'; $("noticeModalTitle").innerText = "공지사항 수정"; }
window.closeNoticeModal = function() { $("noticeModal").classList.remove('show'); }
window.saveNoticeData = async function() { let id = $("noticeId").value; let htmlContent = quillEditor ? quillEditor.root.innerHTML : ''; let payload = { title: $("noticeTitle").value.trim(), content: htmlContent, is_pinned: $("noticePinned").checked, status: $("noticeStatus").value }; if(!payload.title) return showToast("제목을 입력해주세요."); if(!payload.content || payload.content === '<p><br></p>') return showToast("내용을 입력해주세요."); let error; if(id) { const res = await supabaseClient.from('notices').update(payload).eq('id', id); error = res.error; } else { const res = await supabaseClient.from('notices').insert([payload]); error = res.error; } if(error) showToast("저장 실패"); else { showToast("저장되었습니다."); window.closeNoticeModal(); window.fetchCenterData(); } }
window.deleteNotice = function(id) { window.openCustomConfirm("공지사항 삭제", null, `이 공지사항을 완전히 삭제하시겠습니까?`, async () => { const { error } = await supabaseClient.from('notices').delete().eq('id', id); if(error) showToast("삭제 실패"); else { showToast("삭제되었습니다."); window.fetchCenterData(); } }); }
window.handleNoticeMediaUpload = async function(event) { const files = event.target.files; if (!files || files.length === 0) return; const overlay = $("mediaUploadOverlay"); overlay.style.display = "flex"; try { if(!quillEditor) initQuill(); let range = quillEditor.getSelection(true); if(!range) range = { index: quillEditor.getLength() }; for (let i = 0; i < files.length; i++) { const file = files[i]; const fileExt = file.name.split('.').pop(); const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`; const { error: uploadError } = await supabaseClient.storage.from('notice_media').upload(fileName, file); if (uploadError) continue; const { data: { publicUrl } } = supabaseClient.storage.from('notice_media').getPublicUrl(fileName); if (file.type.startsWith('image/')) { quillEditor.insertEmbed(range.index, 'image', publicUrl); } else if (file.type.startsWith('video/')) { quillEditor.insertEmbed(range.index, 'video', publicUrl); } range.index++; } showToast("미디어가 첨부되었습니다."); } catch (e) { showToast("업로드 중 오류 발생"); } finally { overlay.style.display = "none"; $("noticeMediaUpload").value = ''; } }

window.openBlockModal = function() { currentBlockId = null; $("blockModalTitle").innerText = "수업 및 훈련 등 등록"; $("blkId").value = ""; $("blkCategory").value = "기본 수업"; $("blkDate").value = ""; $("blkStart").value = ""; $("blkEnd").value = ""; $("blkCenter").value = "마포 센터"; $("blkSpace").value = ""; $("blkReason").value = ""; $("blkCapacity").value = ""; $("blockModal").classList.add('show'); }
window.editBlock = function(id) { currentBlockId = id; const b = gBlk.find(x => String(x.id) === String(id)); if(!b) return; $("blockModalTitle").innerText = "스케줄 내역 수정"; $("blkId").value = b.id; $("blkCategory").value = b.category; $("blkDate").value = b.block_date; $("blkStart").value = b.start_time; $("blkEnd").value = b.end_time; $("blkCenter").value = b.center; $("blkSpace").value = b.space_equip; $("blkReason").value = b.reason; $("blkCapacity").value = b.capacity || ""; $("blockModal").classList.add('show'); }
window.closeBlockModal = function() { $("blockModal").classList.remove('show'); currentBlockId = null; }
window.saveBlockData = async function() { const payload = { category: $("blkCategory").value, block_date: window.formatBlockDate($("blkDate").value), start_time: window.formatBlockTime($("blkStart").value), end_time: window.formatBlockTime($("blkEnd").value), center: $("blkCenter").value, space_equip: $("blkSpace").value.trim(), reason: $("blkReason").value.trim(), capacity: parseInt($("blkCapacity").value) || null }; if(!payload.block_date || !payload.start_time || !payload.end_time) { showToast("날짜와 시간을 정확히 입력해주세요."); return; } let error; if(currentBlockId) { const res = await supabaseClient.from('blocks').update(payload).eq('id', currentBlockId); error = res.error; } else { const res = await supabaseClient.from('blocks').insert([payload]); error = res.error; } if(error) showToast("저장 실패"); else { showToast("저장되었습니다."); window.closeBlockModal(); window.fetchCenterData(); } }
window.deleteBlock = function(id) { window.openCustomConfirm("스케줄 삭제", null, `해당 스케줄을 삭제하시겠습니까?`, async () => { const { error } = await supabaseClient.from('blocks').delete().eq('id', id); if(error) showToast("삭제 실패"); else { showToast("삭제되었습니다."); window.fetchCenterData(); } }); }
window.bulkAction = function(table, type) { let chks = $$$(`.chk-${table==='reservations'?'res':'trn'}:checked`); if(chks.length === 0) { showToast("선택된 항목이 없습니다."); return; } window.openCustomConfirm("일괄 취소", null, `선택한 ${chks.length}건을 일괄 취소하시겠습니까?`, async () => { let promises = []; chks.forEach(chk => { promises.push(supabaseClient.from(table).update({ status: '취소(정상)' }).eq('id', chk.value)); }); await Promise.all(promises); showToast("일괄 처리가 완료되었습니다."); window.fetchCenterData(); }); }
window.cancelAction = function(table, id) { window.openCustomConfirm("정상 취소 처리", null, `해당 내역을 정상 취소로 처리하시겠습니까?`, async () => { await supabaseClient.from(table).update({ status: '취소(정상)' }).eq('id', id); showToast("정상 취소로 처리되었습니다."); window.fetchCenterData(); }); }
window.bulkActionOrd = function(statusValue) { let chks = $$$(`.chk-ord:checked`); if(chks.length === 0) { showToast("선택된 항목이 없습니다."); return; } window.openCustomConfirm("생두 상태 일괄 변경", null, `선택한 ${chks.length}건을(를) ${statusValue} 상태로 변경하시겠습니까?`, async () => { let promises = []; chks.forEach(chk => { promises.push(supabaseClient.from('orders').update({ status: statusValue }).eq('id', chk.value)); }); await Promise.all(promises); showToast(`일괄 처리가 완료되었습니다.`); window.fetchCenterData(); }); }

window.applyGlobalCenter = function() { currentGlobalCenter = document.querySelector('input[name="globalCenter"]:checked').value; window.renderCenterData(); window.renderDashboard(); }
window.toggleDashView = function(view) { currentDashView = view; if(view === 'month') { $("dashMonthNav").style.display = 'flex'; } else { $("dashMonthNav").style.display = 'none'; currentDashMonthOffset = 0; } window.renderDashboard(); }
window.changeDashMonth = function(offset) { currentDashMonthOffset += offset; window.renderDashboard(); }
window.resetDashMonth = function() { currentDashMonthOffset = 0; window.renderDashboard(); }

window.fetchCenterData = async function() {
  try {
    const [res, trn, ord, blk, noti] = await Promise.all([ supabaseClient.from('reservations').select('*').order('created_at', {ascending: false}), supabaseClient.from('trainings').select('*').order('created_at', {ascending: false}), supabaseClient.from('orders').select('*').order('created_at', {ascending: false}), supabaseClient.from('blocks').select('*').order('block_date', {ascending: false}), supabaseClient.from('notices').select('*').order('created_at', {ascending: false}) ]);
    gRes = res.data||[]; gTrn = trn.data||[]; gOrd = ord.data||[]; gBlk = blk.data||[]; gNotice = noti.data||[];
    gRes.forEach(r => { if(r.space_equip) r.space_equip = r.space_equip.replace(/로스팅룸/g, '로스팅존'); }); gBlk.forEach(b => { if(b.space_equip) b.space_equip = b.space_equip.replace(/로스팅룸/g, '로스팅존'); }); gTrn.forEach(t => { if(t.content) t.content = t.content.replace(/로스팅룸/g, '로스팅존'); });
    let bSet = new Set(); gRes.forEach(r => { if(r.batch) bSet.add(r.batch); }); gTrn.forEach(t => { if(t.batch) bSet.add(t.batch); });
    let bHtml = `<option value="전체">전체 기수</option>` + Array.from(bSet).sort().map(b=>`<option value="${b}">${b}</option>`).join("");
    if($("dashBatchFilter").innerHTML !== bHtml) $("dashBatchFilter").innerHTML = bHtml;
    window.renderCenterData(); window.renderDashboard(); window.renderNoticeData(); updateSmartBadges();
  } catch(e) {}
}

function updateSmartBadges() { let pendingOrders = gOrd.filter(o => o.status === '주문 접수' || (o.status||'').includes('대기')).length; if(pendingOrders > 0) $("ordTabBtn").classList.add('tab-pulse'); else $("ordTabBtn").classList.remove('tab-pulse'); let pendingRes = gRes.filter(r => (r.status||'') === '예약완료').length; if(pendingRes > 0) $("resTabBtn").classList.add('tab-pulse'); else $("resTabBtn").classList.remove('tab-pulse'); let pendingTrn = gTrn.filter(t => (t.status||'') === '접수완료').length; if(pendingTrn > 0) $("trnTabBtn").classList.add('tab-pulse'); else $("trnTabBtn").classList.remove('tab-pulse'); }
window.toggleAll = function(source, className) { $$$("." + className).forEach(chk => { if(!chk.disabled) chk.checked = source.checked; }); }
function updateDailyInOutBanner() { let td = new Date(); let ds = `${td.getFullYear()}-${String(td.getMonth()+1).padStart(2,'0')}-${String(td.getDate()).padStart(2,'0')}`; const getDailyEvents = (centerFilter) => { let evts = []; gRes.forEach(r => { if(r.res_date === ds && r.center === centerFilter && !(r.status||'').includes('취소')) { let st = String(r.res_time||"").split('~')[0].trim(); let en = String(r.res_time||"").split('~')[1]?.trim() || ''; let spc = String(r.space_equip||"").split(' ')[0]; evts.push({ start: st, end: en, name: r.name, space: spc }); } }); gTrn.forEach(t => { let p = String(t.content||"").split(' || '); if(p.length >= 5 && p[0].trim() === ds && p[3].trim() === centerFilter && !(t.status||'').includes('취소')) { let st = String(p[2]||"").split('~')[0].trim(); let en = String(p[2]||"").split('~')[1]?.trim() || ''; let spc = p[4]; evts.push({ start: st, end: en, name: t.name, space: spc }); } }); return evts; }; let centers = currentGlobalCenter === '전체' ? ['마포 센터', '광진 센터'] : [currentGlobalCenter]; let html = ``; centers.forEach(c => { let evts = getDailyEvents(c); if(evts.length === 0) { html += `<div class="inout-card"><div style="font-weight:800; margin-bottom:8px; color:var(--text-display); border-bottom:1px solid var(--border-strong); padding-bottom:8px;">${c}</div><div style="font-size:13px; color:var(--text-secondary); padding:8px 0;">오늘 확정된 일정이 없습니다.</div></div>`; } else { evts.sort((a,b) => String(a.start||'').localeCompare(String(b.start||''))); let first = evts[0]; evts.sort((a,b) => String(b.end||'').localeCompare(String(a.end||''))); let last = evts[evts.length-1]; html += `<div class="inout-card"><div style="font-weight:800; font-size:15px; margin-bottom:12px; color:var(--text-display); border-bottom:1px solid var(--border-strong); padding-bottom:8px;">${c}</div><div style="display:flex; flex-direction:column; gap:8px; font-size:14px; font-weight:600;"><div style="display:flex; align-items:center;"><span style="color:var(--primary); background:var(--primary-light); padding:2px 8px; border-radius:4px; font-size:12px; margin-right:8px;">첫 입실</span> <span style="font-size:16px; font-weight:800; width:50px;">${first.start}</span> <span style="font-weight:500; color:var(--text-secondary);">[${first.space}] ${first.name}</span></div><div style="display:flex; align-items:center;"><span style="color:var(--error); background:#fff0f0; padding:2px 8px; border-radius:4px; font-size:12px; margin-right:8px;">최종 퇴실</span> <span style="font-size:16px; font-weight:800; width:50px;">${last.end}</span> <span style="font-weight:500; color:var(--text-secondary);">[${last.space}] ${last.name}</span></div></div></div>`; } }); if($("dailyInOutBanner")) $("dailyInOutBanner").innerHTML = html; }
window.handlePriceInput = async function(id, val, currentStatus, inputEl) { let formatted = val ? comma(val) + '원' : ''; let updates = { total_price: formatted }; let newStatus = currentStatus; if (val && currentStatus === '주문 접수') { updates.status = '입금 대기'; newStatus = '입금 대기'; } let order = gOrd.find(o => String(o.id) === String(id)); if(order) { order.total_price = formatted; order.status = newStatus; } inputEl.value = formatted; if(newStatus !== currentStatus) { let row = inputEl.closest('tr'); let selectEl = row.querySelector('.status-select'); if(selectEl) { selectEl.value = newStatus; selectEl.className = 'status-select st-arranging'; let badgeEl = row.querySelector('.m-prev-top .status-badge'); if(badgeEl) { badgeEl.className = 'status-badge st-arranging'; badgeEl.innerText = newStatus; } } } await supabaseClient.from('orders').update(updates).eq('id', id); showToast("저장되었습니다."); }
function renderOrderTableHTML(fOrd, tableId, chkClass) { $(tableId).innerHTML = fOrd.length ? fOrd.map(o=>{ let badgeClass = o.status==='주문 취소'?'st-ghosted':o.status==='센터 도착'?'st-completed':o.status==='입금 확인'?'st-confirmed':o.status==='입금 대기'?'st-arranging':'st-wait'; let cNm = o.item_name || ""; let m = cNm.match(/(.+) \[(?:희망:\s*)?(\d+)\/(\d+)\((월|화|수|목|금|토|일)\).*?\]/); if(m) cNm = m[1].trim(); else { let oM = cNm.match(/(.+) \[(.*?)\]/); if(oM) cNm = oM[1].trim(); } let centerBadge = `<span style="background:var(--border); color:var(--text-display); padding:6px 10px; border-radius:8px; font-size:13px; font-weight:700; white-space:nowrap;">${o.center||'미지정'}</span>`; let vendorUrl = o.link ? o.link : (o.url ? o.url : '#'); let vendorHtml = `<a href="${vendorUrl}" target="_blank" style="color:var(--text-secondary); font-weight:700; font-size:13px; text-decoration:none; cursor:pointer;" onmouseover="this.style.textDecoration='underline'" onmouseout="this.style.textDecoration='none'">${o.vendor}</a>`; let copyableHtml = `<div class="copyable-wrap" onclick="window.copyTxt('${String(cNm).replace(/'/g, "\\'")}')" data-full-text="${String(cNm).replace(/"/g, '&quot;')}" title="클릭하여 복사"><div style="display:flex; align-items:center; width:100%; min-width: 0;"><span class="copyable-text">${cNm}</span><span class="copyable-hint">복사</span></div></div>`; let cTxtPreview = o.center ? `<span style="background:var(--border); color:var(--text-secondary); padding:2px 6px; border-radius:4px; font-size:11px; font-weight:600; margin-right:6px; vertical-align:middle; white-space:nowrap;">${o.center}</span>` : ''; let mPreview = `<td class="m-preview has-checkbox" onclick="this.closest('tr').classList.toggle('expanded')"><div class="m-prev-top"><span class="m-prev-date">${formatDtWithDow(o.created_at)}</span><span class="status-badge ${badgeClass}">${o.status}</span></div><div class="m-prev-title">[${o.batch||'-'}] <span style="font-weight:800;">${o.name}</span> <span style="font-size:13px; font-weight:500; color:var(--text-secondary); margin-left:4px;">(${o.quantity})</span></div><div class="m-prev-desc" style="color:var(--text-display); font-weight:500; line-height:1.5;">${cTxtPreview}<span style="font-size:12px; color:var(--text-secondary); margin-right:4px;">${o.vendor}</span>${cNm}</div><span class="m-toggle-hint">상세 정보 보기 ▼</span></td>`; return `<tr style="border-bottom: 1px solid var(--border-strong);">${mPreview}<td data-label="선택" class="tc" style="text-align:center;"><input type="checkbox" class="chk-ord ${chkClass}" value="${o.id}"></td><td data-label="주문 날짜" style="white-space:nowrap; text-align:left; color:var(--text-display); font-size:14px; font-weight:500;">${formatDt(o.created_at)}</td><td data-label="수령 센터" class="tc" style="text-align:center;">${centerBadge}</td><td data-label="기수" class="tc" style="color:var(--text-secondary); font-size:14px; font-weight:600; text-align:center;">${o.batch||'-'}</td><td data-label="성함" style="text-align:left;"><strong style="font-weight:800; color:var(--text-display); font-size:15px; white-space:nowrap;">${o.name}</strong></td><td data-label="연락처" style="white-space:nowrap; text-align:left; color:var(--text-secondary); font-size:14px;">${o.phone}</td><td data-label="생두사 / 상품명" style="text-align:left; width: 100%; max-width: 320px; overflow:visible;"><div style="display:flex; align-items:center; width:100%; min-width: 0; gap:12px;"><div style="width: 80px; flex-shrink: 0; text-align: left;">${vendorHtml}</div><span style="color:var(--border-strong); font-size:12px; flex-shrink:0;">|</span>${copyableHtml}</div></td><td data-label="수량" class="tc" style="font-size:15px; font-weight:700; color:var(--text-display); text-align:center;">${o.quantity}</td><td data-label="총 금액 입력" style="text-align:right;"><input type="text" value="${o.total_price||''}" placeholder="0원" style="width:100px; padding:10px 12px; text-align:right; font-size:14px; font-weight:600; background:#fff; border:1px solid var(--border-strong); border-radius:8px; color:var(--text-display); outline:none; transition:0.2s;" onfocus="this.style.borderColor='var(--primary)';" onblur="this.style.borderColor='var(--border-strong)'; window.handlePriceInput('${o.id}', this.value, '${o.status}', this)"></td><td data-label="상태 관리" class="tc" style="text-align:center;"><div class="action-wrap" style="justify-content:center; display:flex;"><select class="status-select ${badgeClass}" onchange="window.updateTable('orders','status','${o.id}',this.value, this)" style="text-align-last:center;"><option value="주문 접수" ${o.status==='주문 접수'?'selected':''}>주문 접수</option><option value="입금 대기" ${o.status==='입금 대기'?'selected':''}>입금 대기</option><option value="입금 확인" ${o.status==='입금 확인'?'selected':''}>입금 확인</option><option value="센터 도착" ${o.status==='센터 도착'?'selected':''}>센터 도착</option><option value="주문 취소" ${o.status==='주문 취소'?'selected':''}>주문 취소</option></select></div></td></tr>` }).join("") : `<tr><td colspan="10" class="empty-state">해당 요일의 주문 내역이 없습니다.</td></tr>`; }
window.renderCenterData = function() {
  const oneMonthAgo = new Date(); oneMonthAgo.setDate(oneMonthAgo.getDate() - 30); const now = new Date(); updateDailyInOutBanner();
  let qRes = ($("searchRes")?.value || "").toLowerCase(); let fRes = gRes.filter(r => { let rDate = new Date(r.res_date || r.created_at); return (rDate >= oneMonthAgo) && (currentGlobalCenter === '전체' || r.center === currentGlobalCenter) && (`${r.name} ${r.phone}`.toLowerCase().includes(qRes)); });
  $("resTableBody").innerHTML = fRes.length ? fRes.map(r=>{ let displayStatus = r.status || ''; let actBtn = displayStatus.includes('취소') ? '' : `<button class="btn-outline btn-sm" onclick="window.cancelAction('reservations', '${r.id}')">취소</button>`; let endTimeStr = String(r.res_time||"").split('~')[1]; if (endTimeStr && r.res_date && !displayStatus.includes('취소')) { let [hh, mm] = endTimeStr.trim().split(':'); let resEndObj = new Date(`${r.res_date}T${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}:00`); if (resEndObj < now) displayStatus = '이용완료'; } let badgeClass = displayStatus.includes('취소') ? 'badge-red' : (displayStatus === '이용완료' ? 'badge-gray' : (displayStatus === '예약완료' ? 'badge-green' : 'badge-gray')); let dow = getDow(r.res_date); let mPreview = `<td class="m-preview has-checkbox" onclick="this.closest('tr').classList.toggle('expanded')"><div class="m-prev-top"><span class="m-prev-date" style="font-weight:700; color:var(--primary); font-size:13px;">[${r.batch||'-'}] ${r.name}</span><span class="status-badge ${badgeClass}">${displayStatus}</span></div><div class="m-prev-title" style="font-size:18px; color:var(--text-display); letter-spacing:-0.5px;">${r.res_date}(${dow}) ${r.res_time}</div><div class="m-prev-desc" style="font-size:13px; font-weight:500;">[${r.center}] ${r.space_equip || '-'}</div><span class="m-toggle-hint">상세 정보 보기 ▼</span></td>`; return `<tr>${mPreview}<td data-label="선택" class="tc"><input type="checkbox" class="chk-res" value="${r.id}" ${displayStatus.includes('취소')?'disabled':''}></td><td data-label="접수일">${formatDt(r.created_at)}</td><td data-label="기수">${r.batch||'-'}</td><td data-label="성함"><strong>${r.name}</strong></td><td data-label="연락처">${r.phone}</td><td data-label="예약일">${r.res_date}</td><td data-label="시간">${r.res_time}</td><td data-label="공간">${r.center} <span class="sub-text">${r.space_equip}</span></td><td data-label="상태" class="tc"><span class="status-badge ${badgeClass}">${displayStatus}</span></td><td data-label="관리">${actBtn}</td></tr>`; }).join("") : `<tr><td colspan="10" class="empty-state">내역 없음</td></tr>`;
  let qTrn = ($("searchTrn")?.value || "").toLowerCase(); let fTrnList = gTrn.filter(t => { let tDate = new Date(t.created_at); return (tDate >= oneMonthAgo) && (currentGlobalCenter === '전체' || String(t.content||"").includes(currentGlobalCenter)) && (`${t.name} ${t.phone} ${t.content}`.toLowerCase().includes(qTrn)); });
  $("trnTableBody").innerHTML = fTrnList.length ? fTrnList.map(t=>{ let displayStatus = t.status || ''; let actBtn = displayStatus.includes('취소') ? '' : `<button class="btn-outline btn-sm" onclick="window.cancelAction('trainings', '${t.id}')">취소</button>`; let cInfo = String(t.content||'').split(' || '); let niceContent = t.content; let preDate = cInfo[0]||'-', preTime = cInfo[2]||'-', preCenter = cInfo[3]||'-', preName = cInfo[4]||'-'; if(cInfo.length >= 5) { niceContent = `<div style="margin-bottom:4px; font-size:12px; color:var(--text-secondary);">[${cInfo[3]}] ${cInfo[0]} (${cInfo[2]})</div><div style="font-weight:600; color:var(--text-display); line-height:1.4;">${cInfo[4]} <span style="font-weight:400; color:var(--text-tertiary); margin-left:4px;">- ${cInfo[1]}</span></div>`; } let dow = getDow(preDate); let badgeClass = displayStatus.includes('취소')?'badge-red':displayStatus==='접수완료'?'badge-green':'badge-gray'; let mPreview = `<td class="m-preview has-checkbox" onclick="this.closest('tr').classList.toggle('expanded')"><div class="m-prev-top"><span class="m-prev-date" style="font-weight:700; color:var(--primary); font-size:13px;">[${t.batch||'-'}] ${t.name}</span><span class="status-badge ${badgeClass}">${displayStatus}</span></div><div class="m-prev-title" style="font-size:18px; color:var(--text-display); letter-spacing:-0.5px;">${preDate}(${dow}) ${preTime}</div><div class="m-prev-desc" style="font-size:13px; font-weight:500;">[${preCenter}] ${preName}</div><span class="m-toggle-hint">상세 정보 보기 ▼</span></td>`; return `<tr>${mPreview}<td data-label="선택" class="tc"><input type="checkbox" class="chk-trn" value="${t.id}" ${displayStatus.includes('취소')?'disabled':''}></td><td data-label="신청일">${formatDt(t.created_at)}</td><td data-label="기수">${t.batch||'-'}</td><td data-label="성함"><strong>${t.name}</strong></td><td data-label="연락처">${t.phone}</td><td data-label="정보">${niceContent}</td><td data-label="상태" class="tc"><span class="status-badge ${badgeClass}">${displayStatus}</span></td><td data-label="관리">${actBtn}</td></tr>`; }).join("") : `<tr><td colspan="8" class="empty-state">내역 없음</td></tr>`;
  let qOrd = ($("searchOrd")?.value || "").toLowerCase(); let vOrd = $("ordVendorFilter")?.value || "전체"; let isOrdFilter = $("filterPendingOrd")?.checked; let fOrd = gOrd.filter(o => { let matchCenter = (currentGlobalCenter === '전체' || o.center === currentGlobalCenter); let matchQ = `${o.name} ${o.phone} ${o.vendor} ${o.item_name} ${o.center||''}`.toLowerCase().includes(qOrd); let matchV = vOrd === '전체' ? true : o.vendor === vOrd; let matchS = isOrdFilter ? (o.status==='주문 접수'||o.status==='입금 대기'||o.status==='입금 확인') : true; return matchCenter && matchQ && matchV && matchS; }); let thuOrders = fOrd.filter(o => o.item_name && o.item_name.includes('목')); let monOrders = fOrd.filter(o => !(o.item_name && o.item_name.includes('목'))); 
  if (!isOrdFilter) { let isMonHidden = (o) => { if (o.status !== '주문 취소' && o.status !== '센터 도착') return false; let oDate = new Date(o.created_at); if ((now - oDate) / 86400000 >= 5) return true; let dow = now.getDay(); if (dow === 2 || dow === 3 || dow === 4) return true; return false; }; let isThuHidden = (o) => { if (o.status !== '주문 취소' && o.status !== '센터 도착') return false; let oDate = new Date(o.created_at); if ((now - oDate) / 86400000 >= 5) return true; let dow = now.getDay(); if (dow === 5 || dow === 6 || dow === 0) return true; return false; }; monOrders = monOrders.filter(o => !isMonHidden(o)); thuOrders = thuOrders.filter(o => !isThuHidden(o)); }
  renderOrderTableHTML(monOrders, 'ordTableBodyMon', 'chk-ord-mon'); renderOrderTableHTML(thuOrders, 'ordTableBodyThu', 'chk-ord-thu');
  let fBlk = gBlk.filter(b => currentGlobalCenter === '전체' || b.center === currentGlobalCenter); $("blkTableBody").innerHTML = fBlk.length ? fBlk.map(b=>{ let max = b.capacity || '-'; let current = 0; if(max !== '-') current = gTrn.filter(t => String(t.content||'').includes(b.start_time) && !(t.status||'').includes('취소')).length; let capDisplay = max === '-' ? '-' : `<strong>${max - current}</strong> / ${max}`; let dow = getDow(b.block_date); let mPreview = `<td class="m-preview" onclick="this.closest('tr').classList.toggle('expanded')"><div class="m-prev-top"><span class="m-prev-date" style="font-weight:700; color:var(--primary); font-size:13px;">${b.category}</span></div><div class="m-prev-title" style="font-size:18px; color:var(--text-display); letter-spacing:-0.5px;">${b.block_date}(${dow}) ${b.start_time}~${b.end_time}</div><div class="m-prev-desc" style="font-size:13px; font-weight:500;">[${b.center}] ${b.space_equip || '전체'}</div><span class="m-toggle-hint">상세 정보 보기 ▼</span></td>`; return `<tr>${mPreview}<td data-label="날짜"><strong>${b.block_date}</strong></td><td data-label="시간">${b.start_time} ~ ${b.end_time}</td><td data-label="구분"><span style="color:var(--primary);font-weight:600;">${b.category}</span></td><td data-label="공간">${b.center} <span class="sub-text">${b.space_equip}</span></td><td data-label="사유">${b.reason}</td><td data-label="정원" class="tc">${capDisplay}</td><td data-label="관리" class="tc"><div class="action-wrap-flex"><button class="btn-outline btn-sm" onclick="window.editBlock('${b.id}')">수정</button> <button class="btn-outline btn-sm" onclick="window.deleteBlock('${b.id}')" style="color:var(--error);border-color:var(--error)">삭제</button></div></td></tr>` }).join("") : `<tr><td colspan="7" class="empty-state">내역 없음</td></tr>`;
}
window.renderNoticeData = function() { let fNoti = [...gNotice]; fNoti.sort((a,b) => { if(a.is_pinned === b.is_pinned) return new Date(b.created_at) - new Date(a.created_at); return a.is_pinned ? -1 : 1; }); $("noticeTableBody").innerHTML = fNoti.length ? fNoti.map(n => { let pinBadge = n.is_pinned ? `<span class="status-badge badge-orange" style="margin-right:8px;">필독</span>` : `<span class="status-badge badge-gray" style="margin-right:8px;">일반</span>`; let statBadge = n.status === '발행' ? `<span class="status-badge badge-green">발행 중</span>` : `<span class="status-badge badge-gray">숨김</span>`; let mPreview = `<td class="m-preview" onclick="this.closest('tr').classList.toggle('expanded')"><div class="m-prev-top"><span class="m-prev-date">${formatDt(n.created_at)}</span>${statBadge}</div><div class="m-prev-title" style="font-size:16px;">${pinBadge}${n.title}</div><span class="m-toggle-hint">관리 메뉴 보기 ▼</span></td>`; return `<tr>${mPreview}<td data-label="구분" class="tc">${pinBadge}</td><td data-label="제목"><strong style="color:var(--text-display);">${n.title}</strong></td><td data-label="상태" class="tc">${statBadge}</td><td data-label="작성일">${formatDt(n.created_at)}</td><td data-label="관리" class="tc"><div class="action-wrap-flex" style="justify-content:center;"><button class="btn-outline btn-sm" onclick="window.editNotice('${n.id}')">수정</button> <button class="btn-outline btn-sm" onclick="window.deleteNotice('${n.id}')" style="color:var(--error);border-color:var(--error)">삭제</button></div></td></tr>`; }).join("") : `<tr><td colspan="5" class="empty-state">등록된 공지사항이 없습니다.</td></tr>`; }
window.renderMCalCenter = function(selDate) { $$$("#dash-content .m-cal-date").forEach(el => el.classList.remove('active')); let target = document.getElementById(`m-date-center-${selDate}`); if(target) { target.classList.add('active'); target.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' }); } let evts = window.centerCalEvts[selDate] || []; evts.sort((a,b) => String(a.start||'').localeCompare(String(b.start||''))); let html = ''; if(evts.length === 0) { html = `<div class="empty-state" style="padding:40px 0;">예정된 일정이 없습니다.</div>`; } else { evts.forEach(e => { let badgeStyle = e.type==='google' ? 'color:#495057;' : 'color:var(--primary);'; html += `<div class="m-cal-card"><div class="m-cal-card-time" style="${badgeStyle}">${e.start || e.time || '종일'}</div><div class="m-cal-card-title">${e.text||''}</div><div class="m-cal-card-desc">${String(e.tooltip||'').split('|')[0]}</div></div>`; }); } let listWrap = $("m-cal-list-center"); if(listWrap) listWrap.innerHTML = html; };

// 🔥 2. 캘린더 요일 중복 노출 제거 (시간만 추출)
window.renderAppDashboard = async function() {
    const now = new Date(); let targetDate = new Date(now.getFullYear(), now.getMonth() + appDashMonthOffset, 1); const yyyy = targetDate.getFullYear(); const mm = targetDate.getMonth(); const daysInMonth = new Date(yyyy, mm + 1, 0).getDate(); const currDay = now.getDay();
    if (currentAppDashView === 'month' && $("appDashMonthTitle")) $("appDashMonthTitle").innerText = `${yyyy}년 ${mm + 1}월`; await window.fetchHolidays(yyyy);
    let scheduledApps = globalApps.filter(a => a.status === '상담 일정 확정' && a.call_time); let calEvts = {};
    if (currentAppDashView === 'week') { let startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - currDay); for(let i = 0; i < 7; i++) { let dObj = new Date(startOfWeek.getFullYear(), startOfWeek.getMonth(), startOfWeek.getDate() + i); let ds = `${dObj.getFullYear()}-${String(dObj.getMonth()+1).padStart(2,'0')}-${String(dObj.getDate()).padStart(2,'0')}`; calEvts[ds] = []; } } else { for(let d=1; d<=daysInMonth; d++) { let ds = `${yyyy}-${String(mm+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`; calEvts[ds] = []; } }
    
    scheduledApps.forEach(app => { 
        const m = String(app.call_time||'').match(/(\d+)년\s*(\d+)월\s*(\d+)일/); 
        if (m) { 
            let appY = parseInt(m[1]); let appM = parseInt(m[2]); let appD = parseInt(m[3]); 
            let ds = `${appY}-${String(appM).padStart(2,'0')}-${String(appD).padStart(2,'0')}`; 
            if (calEvts[ds]) { 
                const tm = String(app.call_time||'').match(/(오전|오후)\s+(\d+):(\d+)/); 
                let timeStr = tm ? `${tm[1]} ${tm[2]}:${tm[3]}` : (app.call_time.split(')')[1] ? app.call_time.split(')')[1].trim() : app.call_time); 
                calEvts[ds].push({ time: timeStr, text: `[${app.desired_batch||'-'}] ${app.name}`, tooltip: `${timeStr} | 담당: ${app.counselor_name||'미정'}`}); 
            } 
        } 
    });
    
    let mHtml = `<div class="dash-cal-grid"><div class="dash-cal-header" style="color:var(--error);">일</div><div class="dash-cal-header">월</div><div class="dash-cal-header">화</div><div class="dash-cal-header">수</div><div class="dash-cal-header">목</div><div class="dash-cal-header">금</div><div class="dash-cal-header" style="color:var(--blue);">토</div>`;
    let iterDates = Object.keys(calEvts).sort(); if (currentAppDashView === 'month') { let firstDay = new Date(yyyy, mm, 1).getDay(); for(let i=0; i<firstDay; i++) mHtml += `<div class="dash-cal-cell empty"></div>`; }
    iterDates.forEach(ds => { let dObj = new Date(ds); let evts = calEvts[ds]; let holidayName = window.getHoliday(dObj.getFullYear(), dObj.getMonth() + 1, dObj.getDate()); let dateClass = holidayName ? 'holiday-date' : ''; let dateText = dObj.getDate() + (holidayName ? ` <span style="font-size:10px; font-weight:600; display:block; float:right;">${holidayName}</span>` : ''); let evtsHtml = evts.slice(0, 3).map(e => `<div class="dash-item" style="background:#FFF6EF; border-left-color:var(--primary); color:var(--primary);"><div class="dash-item-text"><span class="dash-time">${e.time||''}</span>${e.text||''}</div><div class="dash-tooltip">${e.tooltip||''}</div></div>`).join(''); if(evts.length > 3) { let hiddenText = evts.slice(3).map(e => `${e.time||''} | ${e.text||''}`).join('<br>'); evtsHtml += `<div class="dash-cal-more-wrap"><div class="dash-cal-more">+${evts.length - 3}건 더보기</div><div class="dash-tooltip" style="text-align:left; white-space:nowrap; font-weight:normal;">${hiddenText}</div></div>`; } mHtml += `<div class="dash-cal-cell"><div class="dash-cal-date ${dateClass}">${dateText}</div>${evtsHtml}</div>`; }); mHtml += `</div>`;
    window.appCalEvts = calEvts; let mobStrip = `<div class="mobile-cal"><div class="m-cal-strip" id="m-cal-strip-app">`; iterDates.forEach(ds => { let dObj = new Date(ds); let dayKr = ["일","월","화","수","목","금","토"][dObj.getDay()]; let hasEvt = calEvts[ds].length > 0 ? 'has-evt' : ''; mobStrip += `<div class="m-cal-date" id="m-date-app-${ds}" onclick="window.renderMCalApp('${ds}')"><span class="m-cal-day">${dayKr}</span><span class="m-cal-num">${dObj.getDate()}</span><div class="m-cal-dot ${hasEvt}"></div></div>`; }); mobStrip += `</div><div id="m-cal-list-app" class="m-cal-list"></div></div>`;
    if($("appDashContent")) $("appDashContent").innerHTML = `<div class="desktop-cal">${mHtml}</div>` + mobStrip; let td = new Date(); let todayStr = `${td.getFullYear()}-${String(td.getMonth()+1).padStart(2,'0')}-${String(td.getDate()).padStart(2,'0')}`; window.renderMCalApp(calEvts[todayStr] ? todayStr : iterDates[0]);
}

window.toggleInsight = function() { isInsightView = !isInsightView; if (isInsightView) { $("app-table-area").style.display = "none"; $("app-insight-area").style.display = "block"; $("insightToggleBtn").innerText = "리스트 보기"; window.applyFilterApp(); } else { $("app-table-area").style.display = "block"; $("app-insight-area").style.display = "none"; $("insightToggleBtn").innerText = "인사이트 보기"; } }
window.toggleAppDashView = function(view) { currentAppDashView = view; if(view === 'month') { $("appDashMonthNav").style.display = 'flex'; } else { $("appDashMonthNav").style.display = 'none'; appDashMonthOffset = 0; } window.renderAppDashboard(); }
window.changeAppDashMonth = function(offset) { appDashMonthOffset += offset; window.renderAppDashboard(); }
window.resetAppDashMonth = function() { appDashMonthOffset = 0; window.renderAppDashboard(); }

// 🔥 3. PC 가로 Grid 카드 배치 & 모바일 세로 자연스러운 래핑 적용
window.renderAppDailyBanner = function(data) {
  let td = new Date(); let mm = td.getMonth() + 1; let dd = td.getDate(); let yy = td.getFullYear(); 
  let scheduled = data.filter(a => a.status === '상담 일정 확정' && a.call_time); 
  let todayEvts = scheduled.filter(app => { const m = String(app.call_time||'').match(/(\d+)년\s*(\d+)월\s*(\d+)일/); return m && parseInt(m[1]) === yy && parseInt(m[2]) === mm && parseInt(m[3]) === dd; }); let html = '';
  
  if(todayEvts.length === 0) { 
      html = `<div class="inout-card" style="width:100%;"><div style="font-weight:800; margin-bottom:8px; color:var(--text-display); border-bottom:1px solid var(--border-strong); padding-bottom:8px;">오늘의 상담 일정</div><div style="font-size:13px; color:var(--text-secondary); padding:8px 0;">오늘 확정된 상담 일정이 없습니다.</div></div>`; 
  } else { 
      html = `<div style="width:100%; display:grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap:16px;">`; 
      todayEvts.sort((a,b) => String(a.call_time||'').localeCompare(String(b.call_time||''))); 
      todayEvts.forEach(evt => { 
          const tm = String(evt.call_time||'').match(/(오전|오후)\s+(\d+):(\d+)/); 
          let timeStr = tm ? `${tm[1]} ${tm[2]}:${tm[3]}` : (evt.call_time.split(')')[1] ? evt.call_time.split(')')[1].trim() : evt.call_time); 
          html += `<div class="inout-card" style="padding: 16px; gap: 8px;">
              <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom: 4px;">
                  <span style="font-weight:800; font-size:15px; color:var(--text-display);">[${evt.desired_batch||'-'}] ${evt.name}</span>
                  <span style="color:var(--primary); font-size:13px; font-weight:800;">${timeStr}</span>
              </div>
              <div style="font-weight:500; font-size:13px; color:var(--text-secondary);">
                  ${evt.phone} <span style="color:var(--border-strong); margin:0 6px;">|</span> 담당: ${evt.counselor_name||'미정'}
              </div>
          </div>`; 
      }); 
      html += `</div>`; 
  }
  if($("appDailyBanner")) $("appDailyBanner").innerHTML = html;
}

window.fetchApplications = async function() {
  try { const { data, error } = await supabaseClient.from('applications').select('*').order('created_at', { ascending: false }); if (error) throw error; globalApps = data || []; const batches = [...new Set(globalApps.map(d => d.desired_batch).filter(Boolean))].sort().reverse(); let optionsHTML = '<option value="all">전체 기수 보기</option>'; batches.forEach(b => optionsHTML += `<option value="${b}">${b}</option>`); $("batchFilterApp").innerHTML = optionsHTML; window.applyFilterApp(); if ($("crmModal").classList.contains('show') && $("crmAppId").value) { window.renderCrmInner($("crmAppId").value); } } catch(e) { $("appTableBody").innerHTML = `<tr><td colspan="8" class="empty-state">에러 발생</td></tr>`; console.error("신청 리스트 에러:", e); }
}
window.applyFilterApp = function() { try { const selected = $("batchFilterApp").value; const filtered = selected === 'all' ? globalApps : globalApps.filter(d => d.desired_batch === selected); if (isInsightView) window.renderStatistics(filtered); else { window.renderAppTable(filtered); window.renderAppDailyBanner(filtered); window.renderAppDashboard(); } } catch(e) { console.error("필터 적용 중 에러:", e); } }

const statusClassMap = { '대기': 'st-wait', '상담 일정 조율 중': 'st-arranging', '상담 일정 확정': 'st-confirmed', '상담 완료': 'st-completed', '연락 두절': 'st-ghosted', '설문 완료': 'st-confirmed' };
const joinClassMap = { '': 'jn-none', '고민 중': 'jn-thinking', '가입 완료': 'jn-joined', '미가입': 'jn-declined', '다음 기수 희망': 'jn-next' };

// 🔥 3. 텍스트 파싱 로직 완벽 매칭
function parseAcquisitionChannel(rawText) { 
    if(!rawText) return '-'; 
    let txt = String(rawText).toLowerCase(); 
    if(txt.includes('광고') || txt.includes('스폰서드')) return '광고'; 
    if(txt.includes('인스타')) return '인스타그램'; 
    if(txt.includes('블로그')) return '네이버 블로그'; 
    if(txt.includes('블랙워터')) return '블랙워터이슈'; 
    if(txt.includes('지인')) return '지인 추천'; 
    if(txt.includes('기타')) return '기타';
    return txt.split('(')[0].trim(); 
}

window.closeCrmModal = function() { $("crmModal").classList.remove('show'); };

// 🔥 2. 모바일/PC 공통 CRM 태그 UI (토스 스타일 세로선 위계 정리 적용)
window.renderCrmInner = function(id) {
    const app = globalApps.find(a => String(a.id) === String(id)); if(!app) return;
    $("crmName").innerText = app.name || '이름 없음';
    
    let shortAcq = parseAcquisitionChannel(app.acquisition_channel);
    
    let batchTag = `<span style="font-weight:800; color:var(--text-display);">[${app.desired_batch||'미정'}]</span>`;
    let divider = `<span style="color:var(--border-strong); margin:0 8px;">|</span>`;
    let phoneTag = `<span style="font-weight:600; color:var(--text-secondary);">${app.phone||'-'}</span>`;
    let acqTag = `<span style="font-weight:600; color:var(--text-secondary);">${shortAcq}</span>`;
    
    $("crmProfile").innerHTML = `${batchTag}${divider}${phoneTag}${divider}${acqTag}`;
    
    let timeStr = app.call_time && app.call_time !== 'null' ? app.call_time : '미정';
    $("crmTimeBadge").innerHTML = `상담 예정일 : <span style="color:var(--text-display); font-weight:700;">${timeStr}</span>`;
    $("crmTimeBadge").style.color = "var(--text-secondary)";
    $("crmTimeBadge").style.fontWeight = "500";
    
    const job = app.survey_job; const edu = app.survey_edu; const goal = app.survey_goal; const brand = app.survey_brand;
    if (job || edu) {
        $("crmSurveyResult").innerHTML = `<div class="crm-box"><div class="crm-label">1. 직업 상태</div><div class="crm-answer">${job || '<span class="crm-empty">미작성</span>'}</div></div><div class="crm-box"><div class="crm-label">2. 과거 교육 피드백</div><div class="crm-answer">${edu || '<span class="crm-empty">미작성</span>'}</div></div><div class="crm-box"><div class="crm-label">3. 달성 목표 (니즈)</div><div class="crm-answer">${goal || '<span class="crm-empty">미작성</span>'}</div></div><div class="crm-box"><div class="crm-label">4. 선호 브랜드</div><div class="crm-answer">${brand || '<span class="crm-empty">미작성</span>'}</div></div>`;
    } else {
        $("crmSurveyResult").innerHTML = `<div style="text-align:center; padding: 40px 20px; background:#fff; border-radius:12px; border:1px dashed var(--border-strong);"><div style="font-size:16px; font-weight:700; color:var(--text-secondary); margin-bottom:16px;">아직 사전 설문을 작성하지 않은 고객입니다.</div><button class="btn-outline" style="color:var(--primary); border-color:var(--primary); padding:12px 24px; font-size:15px;" onclick="window.copyTxt('https://www.wecoffee.co.kr/survey?uid=${app.id}&name=${encodeURIComponent(app.name || '')}')">고객 전용 설문 링크 복사하기</button></div>`;
    }
    let initialStatus = app.join_status || (app.status === '상담 완료' ? '상담 완료' : ''); if(!initialStatus || initialStatus === '대기') initialStatus = '상담 완료'; $("crmStatusSelect").value = initialStatus;
}
