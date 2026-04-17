const { createClient } = supabase;
const supabaseClient = createClient('https://dqvzowmhxorxhiqoibmk.supabase.co', 'sb_publishable_DSi3rGnuQhy6OtML_3ukEA_7ptfaoK-');
const $ = id => document.getElementById(id), $$ = q => document.querySelector(q), $$$ = q => document.querySelectorAll(q);

let globalApps=[], globalMembers=[], gRes=[], gTrn=[], gOrd=[], gBlk=[], gNotice=[];
let isInsightView = false, currentCalDate = new Date(), currentScheduleAppId = null, currentBlockId = null, pendingOptionData = null;
let currentGlobalCenter = '전체', currentDashView = 'week', currentDashMonthOffset = 0, currentAppDashView = 'week', appDashMonthOffset = 0;
let currentSummaryData = [], currentInsightData = {};
let isCrmReadOnly = false;
let quillEditor = null;
let isAppInitialized = false; 

window.escapeHtml = function(unsafe) {
    if (!unsafe) return '';
    return String(unsafe).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
};

window.holidaysCache = {};
window.fetchHolidays = async function(year) {
  if(window.holidaysCache['fetched_' + year]) return; 
  window.holidaysCache['fetched_' + year] = true;
  const serviceKey = 'dd13ab368b573e49574bd2b121ecf8b4dd4673e273e64135156968f533954bd5';
  const url = `https://apis.data.go.kr/B090041/openapi/service/SpcdeInfoService/getRestDeInfo?serviceKey=${serviceKey}&solYear=${year}&numOfRows=100&_type=json`;
  try {
    const res = await fetch(url); const data = await res.json(); const items = data?.response?.body?.items?.item;
    if(items) { let arr = Array.isArray(items) ? items : [items]; arr.forEach(item => { if(item.isHoliday === 'Y') { let dStr = String(item.locdate); let fmt = `${dStr.substring(0,4)}-${dStr.substring(4,6)}-${dStr.substring(6,8)}`; window.holidaysCache[fmt] = item.dateName; } }); }
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
function showToast(msg) { const toast = $("toast"); if(!toast) return; toast.innerText = msg; toast.classList.add('show'); setTimeout(() => toast.classList.remove('show'), 2500); }

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

window.copyTxt = function(txt, successMsg = "복사되었습니다.") {
    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(txt).then(() => { showToast(successMsg); }).catch(err => { fallbackCopyTextToClipboard(txt, successMsg); });
    } else { fallbackCopyTextToClipboard(txt, successMsg); }
};
function fallbackCopyTextToClipboard(text, successMsg) {
    var textArea = document.createElement("textarea"); textArea.value = text; textArea.style.top = "0"; textArea.style.left = "0"; textArea.style.position = "fixed"; document.body.appendChild(textArea); textArea.focus(); textArea.select();
    try { document.execCommand('copy'); showToast(successMsg); } catch (err) { showToast("복사 실패"); } document.body.removeChild(textArea);
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

window.updateDashSpaceFilter = function() {
    let filter = $("dashSpaceFilter");
    if(!filter) return;
    let currentVal = filter.value;
    let html = `<option value="전체">전체 공간</option>`;
    if(currentGlobalCenter === '마포 센터') {
         html += `<option value="로스팅존">로스팅존</option><option value="에스프레소존">에스프레소존</option><option value="브루잉존">브루잉존</option><option value="커핑존">커핑존</option><option value="스터디존">스터디존</option>`;
    } else if (currentGlobalCenter === '광진 센터') {
         html += `<option value="로스팅존">로스팅존</option><option value="에스프레소존">에스프레소존</option><option value="브루잉존">브루잉존</option><option value="커핑존">커핑존</option><option value="스터디룸">스터디룸</option>`;
    } else {
         html += `<option value="로스팅존">로스팅존</option><option value="에스프레소존">에스프레소존</option><option value="브루잉존">브루잉존</option><option value="커핑존">커핑존</option><option value="스터디">스터디존/룸</option>`;
    }
    filter.innerHTML = html;
    if([...filter.options].some(o => o.value === currentVal)) filter.value = currentVal;
    else filter.value = '전체';
}

window.updateSpaceOptions = function() {
    let center = $("blkCenter") ? $("blkCenter").value : "마포 센터";
    let dl = $("spaceOptions");
    if(!dl) return;
    let opts = `<option value="전체">전체 (공간 전체)</option>`;
    if (center === '마포 센터') {
        opts += `<option value="로스팅존"></option><option value="에스프레소존"></option><option value="브루잉존"></option><option value="커핑존"></option><option value="스터디존"></option><option value="아스토리아 스톰 2그룹 / 좌 그룹"></option><option value="아스토리아 스톰 2그룹 / 우 그룹"></option><option value="이지스터 800 1번"></option><option value="이지스터 800 2번"></option><option value="이지스터 1.8"></option><option value="스트롱홀드 S7X"></option>`;
    } else {
        opts += `<option value="로스팅존"></option><option value="에스프레소존"></option><option value="브루잉존"></option><option value="커핑존"></option><option value="스터디룸"></option><option value="시네소 MVP 하이드라 2그룹 / 좌 그룹"></option><option value="시네소 MVP 하이드라 2그룹 / 우 그룹"></option><option value="페마 페미나 1그룹"></option><option value="산레모 You 1그룹"></option><option value="빅토리아 아르두이노 이글원 프리마 프로 1그룹"></option><option value="빅토리아 아르두이노 이글원 프리마 EXP 1그룹"></option><option value="이지스터 800 1번"></option><option value="이지스터 800 2번"></option><option value="이지스터 1.8 1번"></option>`;
    }
    dl.innerHTML = opts;
};

function handleLoginSuccess() {
    var lv = $("login-view"); if(lv) lv.classList.remove('active'); 
    var dv = $("dashboard-view"); if(dv) dv.style.display = 'block'; 
    let savedMain = localStorage.getItem('wecoffee_main_tab') || 'page-center'; 
    let savedSub = localStorage.getItem('wecoffee_sub_tab') || 'sub-res';
    if(savedSub === 'sub-trn' || savedSub === 'sub-blk') savedSub = 'sub-trn-blk';
    let mainEl = document.querySelector(`.gnb-item[onclick*="${savedMain}"]`); 
    if(mainEl) window.switchMainTab(savedMain, mainEl); 
    else window.switchMainTab('page-center', document.querySelector(`.gnb-item[onclick*="page-center"]`));
    if(savedMain === 'page-center') { 
        let subEl = document.querySelector(`.sub-item[onclick*="${savedSub}"]`); 
        if(subEl) window.switchSubTab(savedSub, subEl); 
    }
}

function initializeApp() {
  window.fetchHolidays(new Date().getFullYear());
  if(window.updateDashSpaceFilter) window.updateDashSpaceFilter();
  
  supabaseClient.auth.getSession().then(({ data: { session } }) => {
      if (session && !isAppInitialized) {
          handleLoginSuccess();
          isAppInitialized = true;
      }
  });

  supabaseClient.auth.onAuthStateChange((event, session) => {
    if (session) { 
        if(!isAppInitialized) {
            handleLoginSuccess();
            isAppInitialized = true;
        }
    } else { 
      var lv = $("login-view"); if(lv) lv.classList.add('active'); 
      var dv = $("dashboard-view"); if(dv) dv.style.display = 'none'; 
      isAppInitialized = false;
    }
  });
}
if (document.readyState === 'loading') document.addEventListener("DOMContentLoaded", initializeApp); else initializeApp();

supabaseClient.channel('admin-realtime')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'reservations' }, handleRealtime)
  .on('postgres_changes', { event: '*', schema: 'public', table: 'trainings' }, handleRealtime)
  .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, handleRealtime)
  .on('postgres_changes', { event: '*', schema: 'public', table: 'blocks' }, handleRealtime)
  .on('postgres_changes', { event: '*', schema: 'public', table: 'notices' }, handleRealtime)
  .on('postgres_changes', { event: '*', schema: 'public', table: 'applications' }, handleRealtime)
  .on('postgres_changes', { event: '*', schema: 'public', table: 'members' }, handleRealtime)
  .subscribe();

function handleRealtime(payload) { if (['reservations', 'trainings', 'orders', 'blocks', 'notices'].includes(payload.table)) window.fetchCenterData(); if (payload.table === 'applications') window.fetchApplications(); if (payload.table === 'members') window.fetchMembers(); }

window.switchMainTab = function(pageId, element) {
  $$$(".page").forEach(p => p.classList.remove('active')); if($(pageId)) $(pageId).classList.add('active');
  $$$(".gnb-item").forEach(item => item.classList.remove('active')); let targetEl = element || document.querySelector(`.gnb-item[onclick*="${pageId}"]`); if(targetEl) targetEl.classList.add('active');
  localStorage.setItem('wecoffee_main_tab', pageId);
  if(pageId === 'page-center') window.fetchCenterData();
  if(pageId === 'page-applications') { window.fetchApplications(); isInsightView = false; if($("app-table-area")) $("app-table-area").style.display = "block"; if($("app-insight-area")) $("app-insight-area").style.display = "none"; if($("insightToggleBtn")) $("insightToggleBtn").innerText = "인사이트 보기"; }
  if(pageId === 'page-members') window.fetchMembers();
}
window.switchSubTab = function(subId, element) {
  $$$(".sub-page").forEach(p => p.classList.remove('active')); if($(subId)) $(subId).classList.add('active');
  $$$(".sub-item").forEach(item => item.classList.remove('active')); let targetEl = element || document.querySelector(`.sub-item[onclick*="${subId}"]`); if(targetEl) { targetEl.classList.add('active'); targetEl.classList.remove("tab-pulse"); }
  if (subId === 'sub-notice') { if($('globalFilterWrap')) $('globalFilterWrap').style.display = 'none'; } else { if($('globalFilterWrap')) $('globalFilterWrap').style.display = 'inline-flex'; }
  localStorage.setItem('wecoffee_sub_tab', subId); if(subId === 'sub-res') window.renderDashboard(); 
}

window.handleLogin = async function(e) { e.preventDefault(); const email = $("loginEmail").value, password = $("loginPassword").value; const { error } = await supabaseClient.auth.signInWithPassword({ email, password }); if (error) showToast("접근 권한이 없습니다."); else showToast("접속되었습니다."); }
window.handleLogout = async function() { await supabaseClient.auth.signOut(); showToast("로그아웃 되었습니다."); }

window.openCustomConfirm = function(title, statusHtml, actionHtml, callbackOrText, btnText = '적용하기') {
    if($("confirmTarget")) $("confirmTarget").innerHTML = title;
    if(statusHtml) { if($("confirmStateBox")) $("confirmStateBox").style.display = 'block'; if($("confirmSimpleBox")) $("confirmSimpleBox").style.display = 'none'; if($("confirmStatus")) $("confirmStatus").innerHTML = statusHtml; if($("confirmActionState")) $("confirmActionState").innerHTML = actionHtml; } 
    else { if($("confirmStateBox")) $("confirmStateBox").style.display = 'none'; if($("confirmSimpleBox")) $("confirmSimpleBox").style.display = 'block'; if($("confirmActionSimple")) $("confirmActionSimple").innerHTML = actionHtml; }
    
    let btn = $("confirmBtn");
    if(btn) {
        btn.innerText = btnText;
        let newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);
        newBtn.onclick = function() {
            if(btnText === '복사하기') {
                window.copyTxt(callbackOrText, "사전 설문 링크가 복사되었습니다.");
                window.closeConfirmModal();
            } else {
                (async () => {
                    await callbackOrText();
                    window.closeConfirmModal();
                })();
            }
        };
    }
    if($("confirmModal")) $("confirmModal").classList.add('show');
}
window.closeConfirmModal = function() { if($("confirmModal")) $("confirmModal").classList.remove('show'); }
window.closeOnBackdrop = function(event, modalId) { if (event.target.id === modalId && $(modalId)) $(modalId).classList.remove('show'); }

function initQuill() { if(!quillEditor && $('editor-container')) { quillEditor = new Quill('#editor-container', { theme: 'snow', modules: { toolbar: [ [{ 'header': [1, 2, 3, false] }], ['bold', 'italic', 'underline', 'strike'], [{ 'list': 'ordered'}, { 'list': 'bullet' }], [{ 'align': [] }], [{ 'color': [] }, { 'background': [] }], ['clean'] ] }, placeholder: '내용을 자유롭게 적어주세요.' }); } }
window.openNoticeModal = function() { if($("noticeModal")) $("noticeModal").classList.add('show'); setTimeout(() => { try { initQuill(); if(quillEditor) quillEditor.root.innerHTML = ''; } catch(e) {} }, 50); if($("noticeId")) $("noticeId").value = ''; if($("noticeTitle")) $("noticeTitle").value = ''; if($("noticePinned")) $("noticePinned").checked = false; if($("noticeStatus")) $("noticeStatus").value = '발행'; if($("noticeTargetBatch")) $("noticeTargetBatch").value = ''; if($("noticeModalTitle")) $("noticeModalTitle").innerText = "새 공지사항 등록"; }
window.editNotice = function(id) { let n = gNotice.find(x => String(x.id) === String(id)); if(!n) return; if($("noticeModal")) $("noticeModal").classList.add('show'); setTimeout(() => { try { initQuill(); if(quillEditor) quillEditor.root.innerHTML = n.content || ''; } catch(e) {} }, 50); if($("noticeId")) $("noticeId").value = n.id; if($("noticeTitle")) $("noticeTitle").value = n.title; if($("noticePinned")) $("noticePinned").checked = n.is_pinned; if($("noticeStatus")) $("noticeStatus").value = n.status || '발행'; if($("noticeTargetBatch")) $("noticeTargetBatch").value = n.target_batch || ''; if($("noticeModalTitle")) $("noticeModalTitle").innerText = "공지사항 수정"; }
window.closeNoticeModal = function() { if($("noticeModal")) $("noticeModal").classList.remove('show'); }
window.saveNoticeData = async function() { 
  let id = $("noticeId")?$("noticeId").value:""; 
  let htmlContent = quillEditor ? quillEditor.root.innerHTML : ''; 
  let payload = { 
    title: $("noticeTitle")?$("noticeTitle").value.trim():"", 
    content: htmlContent, 
    is_pinned: $("noticePinned")?$("noticePinned").checked:false, 
    status: $("noticeStatus")?$("noticeStatus").value:"발행",
    target_batch: $("noticeTargetBatch")?$("noticeTargetBatch").value.trim():""
  }; 
  if(!payload.title) return showToast("제목을 입력해주세요."); 
  if(!payload.content || payload.content === '<p><br></p>') return showToast("내용을 입력해주세요."); 
  let error; 
  if(id) { 
    const res = await supabaseClient.from('notices').update(payload).eq('id', id); error = res.error; 
  } else { 
    const res = await supabaseClient.from('notices').insert([payload]); error = res.error; 
  } 
  if(error) { showToast("저장 실패 (테이블 구조 확인 필요)"); console.error(error); }
  else { showToast("저장되었습니다."); window.closeNoticeModal(); window.fetchCenterData(); } 
}
window.deleteNotice = function(id) { window.openCustomConfirm("공지사항 삭제", null, `이 공지사항을 완전히 삭제하시겠습니까?`, async () => { const { error } = await supabaseClient.from('notices').delete().eq('id', id); if(error) showToast("삭제 실패"); else { showToast("삭제되었습니다."); window.fetchCenterData(); } }); }
window.handleNoticeMediaUpload = async function(event) { const files = event.target.files; if (!files || files.length === 0) return; const overlay = $("mediaUploadOverlay"); if(overlay) overlay.style.display = "flex"; try { if(!quillEditor) initQuill(); let range = quillEditor.getSelection(true); if(!range) range = { index: quillEditor.getLength() }; for (let i = 0; i < files.length; i++) { const file = files[i]; const fileExt = file.name.split('.').pop(); const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`; const { error: uploadError } = await supabaseClient.storage.from('notice_media').upload(fileName, file); if (uploadError) continue; const { data: { publicUrl } } = supabaseClient.storage.from('notice_media').getPublicUrl(fileName); if (file.type.startsWith('image/')) { quillEditor.insertEmbed(range.index, 'image', publicUrl); } else if (file.type.startsWith('video/')) { quillEditor.insertEmbed(range.index, 'video', publicUrl); } range.index++; } showToast("미디어가 첨부되었습니다."); } catch (e) { showToast("업로드 중 오류 발생"); } finally { if(overlay) overlay.style.display = "none"; if($("noticeMediaUpload")) $("noticeMediaUpload").value = ''; } }

window.openBlockModal = function() { 
    currentBlockId = null; 
    if($("blockModalTitle")) $("blockModalTitle").innerText = "수업 및 훈련 등 등록"; 
    if($("blkId")) $("blkId").value = ""; 
    if($("blkCategory")) $("blkCategory").value = "기본 수업"; 
    if($("blkDate")) $("blkDate").value = ""; 
    if($("blkStart")) $("blkStart").value = ""; 
    if($("blkEnd")) $("blkEnd").value = ""; 
    if($("blkCenter")) {
        $("blkCenter").value = currentGlobalCenter === '전체' ? '마포 센터' : currentGlobalCenter; 
        $("blkCenter").onchange = window.updateSpaceOptions;
        window.updateSpaceOptions();
    }
    if($("blkSpace")) $("blkSpace").value = ""; 
    if($("blkReason")) $("blkReason").value = ""; 
    if($("blkCapacity")) $("blkCapacity").value = ""; 
    if($("blkRepeatType")) $("blkRepeatType").value = "none";
    if($("blkRepeatCount")) $("blkRepeatCount").value = "";
    if($("blockModal")) $("blockModal").classList.add('show'); 
}
window.editBlock = function(id) { 
    currentBlockId = id; const b = gBlk.find(x => String(x.id) === String(id)); if(!b) return; 
    if($("blockModalTitle")) $("blockModalTitle").innerText = "스케줄 내역 수정"; 
    if($("blkId")) $("blkId").value = b.id; 
    if($("blkCategory")) $("blkCategory").value = b.category; 
    if($("blkDate")) $("blkDate").value = b.block_date; 
    if($("blkStart")) $("blkStart").value = b.start_time; 
    if($("blkEnd")) $("blkEnd").value = b.end_time; 
    if($("blkCenter")) {
        $("blkCenter").value = b.center; 
        $("blkCenter").onchange = window.updateSpaceOptions;
        window.updateSpaceOptions();
    }
    if($("blkSpace")) $("blkSpace").value = b.space_equip; 
    if($("blkReason")) $("blkReason").value = b.reason; 
    if($("blkCapacity")) $("blkCapacity").value = b.capacity || ""; 
    if($("blkRepeatType")) $("blkRepeatType").value = "none"; 
    if($("blkRepeatCount")) $("blkRepeatCount").value = "";
    if($("blockModal")) $("blockModal").classList.add('show'); 
}
window.closeBlockModal = function() { if($("blockModal")) $("blockModal").classList.remove('show'); currentBlockId = null; }
window.saveBlockData = async function() { 
  const payload = { 
    category: $("blkCategory")?$("blkCategory").value:"", 
    block_date: window.formatBlockDate($("blkDate")?$("blkDate").value:""), 
    start_time: window.formatBlockTime($("blkStart")?$("blkStart").value:""), 
    end_time: window.formatBlockTime($("blkEnd")?$("blkEnd").value:""), 
    center: $("blkCenter")?$("blkCenter").value:"", 
    space_equip: $("blkSpace")?$("blkSpace").value.trim():"", 
    reason: $("blkReason")?$("blkReason").value.trim():"", 
    capacity: parseInt($("blkCapacity")?$("blkCapacity").value:"") || null 
  }; 
  
  if(!payload.block_date || !payload.start_time || !payload.end_time) { 
    showToast("날짜와 시간을 정확히 입력해주세요."); return; 
  } 

  let rType = $("blkRepeatType") ? $("blkRepeatType").value : "none";
  let rCount = parseInt($("blkRepeatCount") ? $("blkRepeatCount").value : "1") || 1;
  if(rType === 'none' || currentBlockId) rCount = 1; 

  let payloads = [];
  let baseDateStr = payload.block_date; 
  let [y, m, d] = baseDateStr.split('-').map(Number);
  let baseDate = new Date(y, m - 1, d);

  for(let i=0; i<rCount; i++) {
      let currentPayload = { ...payload };
      let targetDate = new Date(baseDate);
      if(rType === 'weekly') {
          targetDate.setDate(targetDate.getDate() + (i * 7));
      } else if(rType === 'monthly') {
          targetDate.setMonth(targetDate.getMonth() + i);
      }
      currentPayload.block_date = `${targetDate.getFullYear()}-${String(targetDate.getMonth()+1).padStart(2,'0')}-${String(targetDate.getDate()).padStart(2,'0')}`;
      payloads.push(currentPayload);
  }

  let error; 
  if(currentBlockId) { 
    const res = await supabaseClient.from('blocks').update(payload).eq('id', currentBlockId); 
    error = res.error; 
  } else { 
    const res = await supabaseClient.from('blocks').insert(payloads); 
    error = res.error; 
  } 
  
  if(error) showToast("저장 실패"); 
  else { showToast(`성공적으로 저장되었습니다.`); window.closeBlockModal(); window.fetchCenterData(); } 
}
window.deleteBlock = function(id) { window.openCustomConfirm("스케줄 삭제", null, `해당 스케줄을 삭제하시겠습니까?`, async () => { const { error } = await supabaseClient.from('blocks').delete().eq('id', id); if(error) showToast("삭제 실패"); else { showToast("삭제되었습니다."); window.fetchCenterData(); } }); }
window.bulkAction = function(table, type) { let chks = $$$(`.chk-${table==='reservations'?'res':'trn'}:checked`); if(chks.length === 0) { showToast("선택된 항목이 없습니다."); return; } window.openCustomConfirm("일괄 취소", null, `선택한 ${chks.length}건을 일괄 취소하시겠습니까?`, async () => { let promises = []; chks.forEach(chk => { promises.push(supabaseClient.from(table).update({ status: '취소(정상)' }).eq('id', chk.value)); }); await Promise.all(promises); showToast("일괄 처리가 완료되었습니다."); window.fetchCenterData(); }); }
window.cancelAction = function(table, id) { window.openCustomConfirm("정상 취소 처리", null, `해당 내역을 정상 취소로 처리하시겠습니까?`, async () => { await supabaseClient.from(table).update({ status: '취소(정상)' }).eq('id', id); showToast("정상 취소로 처리되었습니다."); window.fetchCenterData(); }); }
window.bulkActionOrd = function(statusValue) { let chks = $$$(`.chk-ord:checked`); if(chks.length === 0) { showToast("선택된 항목이 없습니다."); return; } window.openCustomConfirm("생두 상태 일괄 변경", null, `선택한 ${chks.length}건을(를) ${statusValue} 상태로 변경하시겠습니까?`, async () => { let promises = []; chks.forEach(chk => { promises.push(supabaseClient.from('orders').update({ status: statusValue }).eq('id', chk.value)); }); await Promise.all(promises); showToast(`일괄 처리가 완료되었습니다.`); window.fetchCenterData(); }); }

window.applyGlobalCenter = function() { 
    let r = document.querySelector('input[name="globalCenter"]:checked'); 
    currentGlobalCenter = r ? r.value : '전체'; 
    if(window.updateDashSpaceFilter) window.updateDashSpaceFilter();
    window.renderCenterData(); 
    window.renderDashboard(); 
}
window.toggleDashView = function(view) { currentDashView = view; if(view === 'month') { if($("dashMonthNav")) $("dashMonthNav").style.display = 'flex'; } else { if($("dashMonthNav")) $("dashMonthNav").style.display = 'none'; currentDashMonthOffset = 0; } window.renderDashboard(); }
window.changeDashMonth = function(offset) { currentDashMonthOffset += offset; window.renderDashboard(); }
window.resetDashMonth = function() { currentDashMonthOffset = 0; window.renderDashboard(); }

function updateDailyInOutBanner() { 
  let td = new Date(); let ds = `${td.getFullYear()}-${String(td.getMonth()+1).padStart(2,'0')}-${String(td.getDate()).padStart(2,'0')}`; 
  const getDailyEvents = (centerFilter) => { 
      let evts = []; 
      gRes.forEach(r => { if(r.res_date === ds && r.center === centerFilter && !String(r.status||'').includes('취소')) { let st = String(r.res_time||"").split('~')[0].trim(); let enParts = String(r.res_time||"").split('~'); let en = enParts.length > 1 ? enParts[1].trim() : ''; let spc = String(r.space_equip||"").split(' ')[0]; evts.push({ start: st, end: en, name: r.name, space: spc }); } }); 
      gTrn.forEach(t => { let p = String(t.content||"").split(' || '); if(p.length >= 5 && p[0].trim() === ds && p[3].trim() === centerFilter && !String(t.status||'').includes('취소')) { let st = String(p[2]||"").split('~')[0].trim(); let enParts = String(p[2]||"").split('~'); let en = enParts.length > 1 ? enParts[1].trim() : ''; let spc = p[4]; evts.push({ start: st, end: en, name: t.name, space: spc }); } }); 
      return evts; 
  }; 
  let centers = currentGlobalCenter === '전체' ? ['마포 센터', '광진 센터'] : [currentGlobalCenter]; 
  let html = ``; 
  centers.forEach(c => { 
      let evts = getDailyEvents(c); 
      if(evts.length === 0) { 
          html += `<div class="inout-card"><div style="font-weight:800; margin-bottom:8px; color:var(--text-display); border-bottom:1px solid var(--border-strong); padding-bottom:8px;">${c}</div><div style="font-size:13px; color:var(--text-secondary); padding:8px 0;">오늘 확정된 일정이 없습니다.</div></div>`; 
      } else { 
          evts.sort((a,b) => String(a.start||'').localeCompare(String(b.start||''))); 
          let first = evts[0]; 
          evts.sort((a,b) => String(b.end||'').localeCompare(String(a.end||''))); 
          let last = evts[evts.length-1]; 
          html += `<div class="inout-card" style="padding: 16px; gap: 8px; border-radius:12px; border:1px solid var(--border-strong); background:#fff; align-items:flex-start; text-align:left; width:100%; box-sizing:border-box;">
              <div style="font-weight:800; font-size:15px; margin-bottom:12px; color:var(--text-display); border-bottom:1px solid var(--border-strong); padding-bottom:8px; width:100%;">${c}</div>
              <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom: 4px; width:100%;">
                  <span style="font-weight:800; font-size:15px; color:var(--text-display);">[${first.space||''}] ${window.escapeHtml(first.name||'')}</span>
                  <span style="color:var(--primary); font-size:13px; font-weight:800;">첫 입실 ${first.start||''}</span>
              </div>
              <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom: 0px; width:100%;">
                  <span style="font-weight:500; font-size:14px; color:var(--text-secondary);">[${last.space||''}] ${window.escapeHtml(last.name||'')}</span>
                  <span style="color:var(--error); font-size:13px; font-weight:800;">최종 퇴실 ${last.end||''}</span>
              </div>
          </div>`; 
      } 
  }); 
  if($("dailyInOutBanner")) $("dailyInOutBanner").innerHTML = html; 
}

window.fetchCenterData = async function() {
  try {
    const [res, trn, ord, blk, noti] = await Promise.all([ supabaseClient.from('reservations').select('*').order('created_at', {ascending: false}), supabaseClient.from('trainings').select('*').order('created_at', {ascending: false}), supabaseClient.from('orders').select('*').order('created_at', {ascending: false}), supabaseClient.from('blocks').select('*').order('block_date', {ascending: false}), supabaseClient.from('notices').select('*').order('created_at', {ascending: false}) ]);
    gRes = res?.data||[]; gTrn = trn?.data||[]; gOrd = ord?.data||[]; gBlk = blk?.data||[]; gNotice = noti?.data||[];
    
    try {
        gRes.forEach(r => { if(r.space_equip) r.space_equip = String(r.space_equip).replace(/로스팅룸/g, '로스팅존'); }); 
        gBlk.forEach(b => { if(b.space_equip) b.space_equip = String(b.space_equip).replace(/로스팅룸/g, '로스팅존'); }); 
        gTrn.forEach(t => { if(t.content) t.content = String(t.content).replace(/로스팅룸/g, '로스팅존'); });

        let bSet = new Set(); gRes.forEach(r => { if(r.batch) bSet.add(r.batch); }); gTrn.forEach(t => { if(t.batch) bSet.add(t.batch); });
        let bHtml = `<option value="전체">전체 기수</option>` + Array.from(bSet).sort().map(b=>`<option value="${b}">${b}</option>`).join("");
        if($("dashBatchFilter") && $("dashBatchFilter").innerHTML !== bHtml) $("dashBatchFilter").innerHTML = bHtml;

        let sSet = new Set(); gRes.forEach(r => { if(r.space_equip) sSet.add(String(r.space_equip).split(' ')[0]); });
        let sHtml = `<option value="전체">전체 공간/장비</option>` + Array.from(sSet).sort().map(s=>`<option value="${s}">${s}</option>`).join("");
        if($("resSpaceFilter") && $("resSpaceFilter").innerHTML.length < 100) $("resSpaceFilter").innerHTML = sHtml;

        let tSet = new Set(); gTrn.forEach(t => {
            let cInfo = String(t.content||'').split(' || ');
            if(cInfo.length >= 5) tSet.add(cInfo[4]); 
            else tSet.add(t.content);
        });
        let tHtml = `<option value="전체">전체 콘텐츠</option>` + Array.from(tSet).sort().map(c=>`<option value="${c}">${c}</option>`).join("");
        if($("trnContentFilter") && $("trnContentFilter").innerHTML.length < 100) $("trnContentFilter").innerHTML = tHtml;

    } catch(err) {}

  } catch(e) { console.error("fetchCenterData Error:", e); }

  try { window.renderCenterData(); } catch(e){ console.error(e); }
  try { window.renderDashboard(); } catch(e){ console.error(e); }
  try { window.renderNoticeData(); } catch(e){ console.error(e); }
}

window.renderCenterData = function() {
  const oneMonthAgo = new Date(); oneMonthAgo.setDate(oneMonthAgo.getDate() - 30); const now = new Date(); 
  try { updateDailyInOutBanner(); } catch(e) {}
  
  try {
      let qRes = ($("searchRes")?.value || "").toLowerCase(); 
      let sRes = $("resSpaceFilter")?.value || "전체";
      let fRes = gRes.filter(r => { 
          let rDate = new Date(r.res_date || r.created_at); 
          let matchSpace = sRes === '전체' || String(r.space_equip||'').includes(sRes);
          return (rDate >= oneMonthAgo) && (currentGlobalCenter === '전체' || r.center === currentGlobalCenter) && (`${r.name} ${r.phone}`.toLowerCase().includes(qRes)) && matchSpace; 
      });
      if($("resTableBody")) $("resTableBody").innerHTML = fRes.length ? fRes.map(r=>{ let displayStatus = r.status || ''; let actBtn = String(displayStatus).includes('취소') ? '' : `<button class="btn-outline btn-sm" onclick="window.cancelAction('reservations', '${r.id}')">취소</button>`; let endTimeStr = String(r.res_time||"").split('~')[1]; if (endTimeStr && r.res_date && !String(displayStatus).includes('취소')) { let [hh, mm] = endTimeStr.trim().split(':'); let resEndObj = new Date(`${r.res_date}T${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}:00`); if (resEndObj < now) displayStatus = '이용완료'; } let badgeClass = String(displayStatus).includes('취소') ? 'badge-red' : (displayStatus === '이용완료' ? 'badge-gray' : (displayStatus === '예약완료' ? 'badge-green' : 'badge-gray')); let dow = getDow(r.res_date); let mPreview = `<td class="m-preview has-checkbox" onclick="this.closest('tr').classList.toggle('expanded')"><div class="m-prev-top"><span class="m-prev-date" style="font-weight:700; color:var(--primary); font-size:13px;">[${r.batch||'-'}] ${window.escapeHtml(r.name)}</span><span class="status-badge ${badgeClass}">${displayStatus}</span></div><div class="m-prev-title" style="font-size:18px; color:var(--text-display); letter-spacing:-0.5px;">${r.res_date}(${dow}) ${r.res_time}</div><div class="m-prev-desc" style="font-size:13px; font-weight:500;">[${r.center}] ${r.space_equip || '-'}</div><span class="m-toggle-hint">상세 정보 보기 ▼</span></td>`; return `<tr>${mPreview}<td data-label="선택" class="tc"><input type="checkbox" class="chk-res" value="${r.id}" ${String(displayStatus).includes('취소')?'disabled':''}></td><td data-label="접수일">${formatDt(r.created_at)}</td><td data-label="기수">${r.batch||'-'}</td><td data-label="성함"><strong>${window.escapeHtml(r.name)}</strong></td><td data-label="연락처">${window.escapeHtml(r.phone)}</td><td data-label="예약일">${r.res_date}</td><td data-label="시간">${r.res_time}</td><td data-label="공간">${r.center} <span class="sub-text">${r.space_equip}</span></td><td data-label="상태" class="tc"><span class="status-badge ${badgeClass}">${displayStatus}</span></td><td data-label="관리">${actBtn}</td></tr>`; }).join("") : `<tr><td colspan="10" class="empty-state">내역 없음</td></tr>`;
  } catch(e) { console.error(e); }
  
  try {
      let qTrn = ($("searchTrn")?.value || "").toLowerCase(); 
      let sTrn = $("trnContentFilter")?.value || "전체";
      let fTrnList = gTrn.filter(t => { 
          let tDate = new Date(t.created_at); 
          let matchContent = sTrn === '전체' || String(t.content||'').includes(sTrn);
          return (tDate >= oneMonthAgo) && (currentGlobalCenter === '전체' || String(t.content||"").includes(currentGlobalCenter)) && (`${t.name} ${t.phone} ${t.content}`.toLowerCase().includes(qTrn)) && matchContent; 
      });
      if($("trnTableBody")) $("trnTableBody").innerHTML = fTrnList.length ? fTrnList.map(t=>{ let displayStatus = t.status || ''; let actBtn = String(displayStatus).includes('취소') ? '' : `<button class="btn-outline btn-sm" onclick="window.cancelAction('trainings', '${t.id}')">취소</button>`; let cInfo = String(t.content||'').split(' || '); let niceContent = t.content; let preDate = cInfo[0]||'-', preTime = cInfo[2]||'-', preCenter = cInfo[3]||'-', preName = cInfo[4]||'-'; if(cInfo.length >= 5) { niceContent = `<div style="margin-bottom:4px; font-size:12px; color:var(--text-secondary);">[${cInfo[3]}] ${cInfo[0]} (${cInfo[2]})</div><div style="font-weight:600; color:var(--text-display); line-height:1.4;">${window.escapeHtml(cInfo[4])} <span style="font-weight:400; color:var(--text-tertiary); margin-left:4px;">- ${cInfo[1]}</span></div>`; } let dow = getDow(preDate); let badgeClass = String(displayStatus).includes('취소')?'badge-red':displayStatus==='접수완료'?'badge-green':'badge-gray'; let mPreview = `<td class="m-preview has-checkbox" onclick="this.closest('tr').classList.toggle('expanded')"><div class="m-prev-top"><span class="m-prev-date" style="font-weight:700; color:var(--primary); font-size:13px;">[${t.batch||'-'}] ${window.escapeHtml(t.name)}</span><span class="status-badge ${badgeClass}">${displayStatus}</span></div><div class="m-prev-title" style="font-size:18px; color:var(--text-display); letter-spacing:-0.5px;">${preDate}(${dow}) ${preTime}</div><div class="m-prev-desc" style="font-size:13px; font-weight:500;">[${preCenter}] ${window.escapeHtml(preName)}</div><span class="m-toggle-hint">상세 정보 보기 ▼</span></td>`; return `<tr>${mPreview}<td data-label="선택" class="tc"><input type="checkbox" class="chk-trn" value="${t.id}" ${String(displayStatus).includes('취소')?'disabled':''}></td><td data-label="신청일">${formatDt(t.created_at)}</td><td data-label="기수">${t.batch||'-'}</td><td data-label="성함"><strong>${window.escapeHtml(t.name)}</strong></td><td data-label="연락처">${window.escapeHtml(t.phone)}</td><td data-label="정보">${niceContent}</td><td data-label="상태" class="tc"><span class="status-badge ${badgeClass}">${displayStatus}</span></td><td data-label="관리">${actBtn}</td></tr>`; }).join("") : `<tr><td colspan="8" class="empty-state">내역 없음</td></tr>`;
  } catch(e) { console.error(e); }
  
  try {
      let qOrd = ($("searchOrd")?.value || "").toLowerCase(); let vOrd = $("ordVendorFilter")?.value || "전체"; let isOrdFilter = $("filterPendingOrd")?.checked; 
      let fOrd = gOrd.filter(o => { 
        let matchCenter = (currentGlobalCenter === '전체' || o.center === currentGlobalCenter); 
        let matchQ = `${o.name} ${o.phone} ${o.vendor} ${o.item_name} ${o.center||''}`.toLowerCase().includes(qOrd); 
        let matchV = vOrd === '전체' ? true : o.vendor === vOrd; 
        let matchS = isOrdFilter ? (o.status==='주문 접수'||o.status==='입금 대기'||o.status==='입금 확인 중'||o.status==='입금 확인') : true; 
        return matchCenter && matchQ && matchV && matchS; 
      }); 
      
      let thuOrders = fOrd.filter(o => String(o.item_name||'').includes('목')); let monOrders = fOrd.filter(o => !String(o.item_name||'').includes('목')); 
      if (!isOrdFilter) { let isMonHidden = (o) => { if (o.status !== '주문 취소' && o.status !== '센터 도착') return false; let oDate = new Date(o.created_at); if ((now - oDate) / 86400000 >= 5) return true; let dow = now.getDay(); if (dow === 2 || dow === 3 || dow === 4) return true; return false; }; let isThuHidden = (o) => { if (o.status !== '주문 취소' && o.status !== '센터 도착') return false; let oDate = new Date(o.created_at); if ((now - oDate) / 86400000 >= 5) return true; let dow = now.getDay(); if (dow === 5 || dow === 6 || dow === 0) return true; return false; }; monOrders = monOrders.filter(o => !isMonHidden(o)); thuOrders = thuOrders.filter(o => !isThuHidden(o)); }
      if($("ordTableBodyMon")) renderOrderTableHTML(monOrders, 'ordTableBodyMon', 'chk-ord-mon'); 
      if($("ordTableBodyThu")) renderOrderTableHTML(thuOrders, 'ordTableBodyThu', 'chk-ord-thu');
  } catch(e) { console.error(e); }

  try {
      let fBlk = gBlk.filter(b => currentGlobalCenter === '전체' || b.center === currentGlobalCenter); 
      if($("blkTableBody")) $("blkTableBody").innerHTML = fBlk.length ? fBlk.map(b=>{ 
          let max = b.capacity || '-'; 
          let current = 0; 
          if(max !== '-') {
              let exactContent = `${b.block_date} || ${b.space_equip||"공간 미정"} || ${b.start_time}~${b.end_time} || ${b.center} || [${b.category}] ${b.reason}`;
              current = gTrn.filter(t => String(t.content||'') === exactContent && !String(t.status||'').includes('취소')).length;
          }
          let capDisplay = max === '-' ? '-' : `<strong>${max - current}</strong> / ${max}`; 
          let dow = getDow(b.block_date); 
          let mPreview = `<td class="m-preview" onclick="this.closest('tr').classList.toggle('expanded')"><div class="m-prev-top"><span class="m-prev-date" style="font-weight:700; color:var(--primary); font-size:13px;">${b.category}</span></div><div class="m-prev-title" style="font-size:18px; color:var(--text-display); letter-spacing:-0.5px;">${b.block_date}(${dow}) ${b.start_time}~${b.end_time}</div><div class="m-prev-desc" style="font-size:13px; font-weight:500;">[${b.center}] ${b.space_equip || '전체'}</div><span class="m-toggle-hint">상세 정보 보기 ▼</span></td>`; 
          return `<tr>${mPreview}<td data-label="날짜"><strong>${b.block_date}</strong></td><td data-label="시간">${b.start_time} ~ ${b.end_time}</td><td data-label="구분"><span style="color:var(--primary);font-weight:600;">${b.category}</span></td><td data-label="공간">${b.center} <span class="sub-text">${b.space_equip}</span></td><td data-label="사유">${window.escapeHtml(b.reason)}</td><td data-label="정원" class="tc">${capDisplay}</td><td data-label="관리" class="tc"><div class="action-wrap-flex"><button class="btn-outline btn-sm" onclick="window.editBlock('${b.id}')">수정</button> <button class="btn-outline btn-sm" onclick="window.deleteBlock('${b.id}')" style="color:var(--error);border-color:var(--error)">삭제</button></div></td></tr>` 
      }).join("") : `<tr><td colspan="7" class="empty-state">내역 없음</td></tr>`;
  } catch(e) { console.error(e); }
}

window.renderDashboard = async function() {
    const now = new Date();
    let targetDate = new Date(now.getFullYear(), now.getMonth() + currentDashMonthOffset, 1);
    const yyyy = targetDate.getFullYear();
    const mm = targetDate.getMonth();
    const daysInMonth = new Date(yyyy, mm + 1, 0).getDate();
    const currDay = now.getDay();

    if (currentDashView === 'month' && $("dashMonthTitle")) {
        $("dashMonthTitle").innerText = `${yyyy}년 ${mm + 1}월`;
    }
    await window.fetchHolidays(yyyy);

    let spaceFilter = $("dashSpaceFilter") ? $("dashSpaceFilter").value : '전체';
    let batchFilter = $("dashBatchFilter") ? $("dashBatchFilter").value : '전체';

    let calEvts = {};

    if (currentDashView === 'week') {
        let startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - currDay);
        for(let i = 0; i < 7; i++) {
            let dObj = new Date(startOfWeek.getFullYear(), startOfWeek.getMonth(), startOfWeek.getDate() + i);
            let ds = `${dObj.getFullYear()}-${String(dObj.getMonth()+1).padStart(2,'0')}-${String(dObj.getDate()).padStart(2,'0')}`;
            calEvts[ds] = [];
        }
    } else {
        for(let d=1; d<=daysInMonth; d++) {
            let ds = `${yyyy}-${String(mm+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
            calEvts[ds] = [];
        }
    }

    let goEvts = [];
    try { goEvts = await window.fetchGoogleCalendarEvents(yyyy, mm + 1); } catch(e){}

    try {
        goEvts.forEach(g => {
            let include = true;
            if (currentGlobalCenter !== '전체') {
                let keyword = currentGlobalCenter.split(' ')[0];
                if (!String(g.text).includes(keyword)) include = false;
            }
            if (spaceFilter !== '전체') {
                let spaceKeyword = spaceFilter.replace('룸', '').replace('존', '');
                if (!String(g.text).includes(spaceKeyword)) include = false;
            }
            if(include && calEvts[g.date]) {
                calEvts[g.date].push({ time: g.time || '종일', start: g.start || '00:00', text: g.text, type: 'google', tooltip: g.text });
            }
        });
    } catch(e) { console.error(e); }

    try {
        gRes.forEach(r => {
            if (String(r.status||'').includes('취소')) return;
            if (currentGlobalCenter !== '전체' && r.center !== currentGlobalCenter) return;
            if (spaceFilter !== '전체' && !String(r.space_equip||'').includes(spaceFilter)) return;
            if (batchFilter !== '전체' && r.batch !== batchFilter) return;

            if (calEvts[r.res_date]) {
                let st = String(r.res_time||"").split('~')[0].trim();
                let spc = String(r.space_equip||"").split(' ')[0];
                calEvts[r.res_date].push({
                    time: st, start: st, text: `[${spc}] ${r.name}`, type: 'res', tooltip: `${r.res_time} | ${r.space_equip} | ${r.name}`
                });
            }
        });

        gBlk.forEach(b => {
            if (currentGlobalCenter !== '전체' && b.center !== currentGlobalCenter) return;
            if (spaceFilter !== '전체' && !String(b.space_equip||'').includes(spaceFilter)) return;
            if (calEvts[b.block_date]) {
                calEvts[b.block_date].push({
                    time: b.start_time, start: b.start_time, text: `[${b.category}] ${b.reason}`, type: 'blk', tooltip: `${b.start_time}~${b.end_time} | ${b.space_equip||'전체'} | ${b.reason}`
                });
            }
        });

        gTrn.forEach(t => {
            if (String(t.status||'').includes('취소')) return;
            if (batchFilter !== '전체' && t.batch !== batchFilter) return;

            let cInfo = String(t.content||"").split(' || ');
            if(cInfo.length >= 5) {
                let tDate = cInfo[0].trim(); let tCenter = cInfo[3].trim(); let tSpc = cInfo[4].trim();
                if (currentGlobalCenter !== '전체' && tCenter !== currentGlobalCenter) return;
                if (spaceFilter !== '전체' && !String(tSpc).includes(spaceFilter)) return;
                if (calEvts[tDate]) {
                    let st = String(cInfo[2]||"").split('~')[0].trim();
                    calEvts[tDate].push({
                        time: st, start: st, text: `[수강] ${t.name}`, type: 'trn', tooltip: `${cInfo[2]} | ${tSpc} | ${t.name} (${cInfo[1]})`
                    });
                }
            }
        });
    } catch(e) { console.error(e); }

    try {
        let mHtml = `<div class="dash-cal-grid"><div class="dash-cal-header" style="color:var(--error);">일</div><div class="dash-cal-header">월</div><div class="dash-cal-header">화</div><div class="dash-cal-header">수</div><div class="dash-cal-header">목</div><div class="dash-cal-header">금</div><div class="dash-cal-header" style="color:var(--blue);">토</div>`;
        let iterDates = Object.keys(calEvts).sort();
        if (currentDashView === 'month') {
            let firstDay = new Date(yyyy, mm, 1).getDay();
            for(let i=0; i<firstDay; i++) mHtml += `<div class="dash-cal-cell empty"></div>`;
        }

        iterDates.forEach(ds => {
            let dObj = new Date(ds); let evts = calEvts[ds];
            evts.sort((a,b) => String(a.start||'').localeCompare(String(b.start||'')));
            let holidayName = window.getHoliday(dObj.getFullYear(), dObj.getMonth() + 1, dObj.getDate());
            let dateClass = holidayName ? 'holiday-date' : '';
            let dateText = dObj.getDate() + (holidayName ? ` <span style="font-size:10px; font-weight:600; display:block; float:right;">${holidayName}</span>` : '');

            let evtsHtml = evts.slice(0, 3).map(e => {
                let badgeClass = e.type === 'google' ? 'dash-item-google' : (e.type === 'res' ? 'dash-item-res' : (e.type === 'trn' ? 'dash-item-trn' : 'dash-item-blk'));
                return `<div class="dash-item ${badgeClass}"><div class="dash-item-text"><span class="dash-time">${e.time||''}</span>${window.escapeHtml(e.text)||''}</div><div class="dash-tooltip">${window.escapeHtml(e.tooltip)||''}</div></div>`;
            }).join('');

            if(evts.length > 3) {
                let hiddenText = evts.slice(3).map(e => `${e.time||''} | ${window.escapeHtml(e.text)||''}`).join('<br>');
                evtsHtml += `<div class="dash-cal-more-wrap"><div class="dash-cal-more">+${evts.length - 3}건 더보기</div><div class="dash-tooltip" style="text-align:left; white-space:nowrap; font-weight:normal;">${hiddenText}</div></div>`;
            }
            mHtml += `<div class="dash-cal-cell"><div class="dash-cal-date ${dateClass}">${dateText}</div>${evtsHtml}</div>`;
        });
        mHtml += `</div>`;

        window.centerCalEvts = calEvts;
        let mobStrip = `<div class="mobile-cal"><div class="m-cal-strip" id="m-cal-strip-center">`;
        iterDates.forEach(ds => {
            let dObj = new Date(ds); let dayKr = ["일","월","화","수","목","금","토"][dObj.getDay()];
            let hasEvt = calEvts[ds].length > 0 ? 'has-evt' : '';
            mobStrip += `<div class="m-cal-date" id="m-date-center-${ds}" onclick="window.renderMCalCenter('${ds}')"><span class="m-cal-day">${dayKr}</span><span class="m-cal-num">${dObj.getDate()}</span><div class="m-cal-dot ${hasEvt}"></div></div>`;
        });
        mobStrip += `</div><div id="m-cal-list-center" class="m-cal-list"></div></div>`;

        if($("dash-content")) $("dash-content").innerHTML = `<div class="desktop-cal">${mHtml}</div>` + mobStrip;

        let td = new Date(); let todayStr = `${td.getFullYear()}-${String(td.getMonth()+1).padStart(2,'0')}-${String(td.getDate()).padStart(2,'0')}`;
        window.renderMCalCenter(calEvts[todayStr] ? todayStr : iterDates[0]);
    } catch(e) { console.error("Render HTML Error:", e); }
};

window.handlePriceInput = async function(id, val, currentStatus, inputEl) { 
    let formatted = val ? comma(val) + '원' : ''; 
    let updates = { total_price: formatted }; 
    let newStatus = currentStatus; 
    if (val && currentStatus === '주문 접수') { updates.status = '입금 대기'; newStatus = '입금 대기'; } 
    let order = gOrd.find(o => String(o.id) === String(id)); 
    if(order) { order.total_price = formatted; order.status = newStatus; } 
    inputEl.value = formatted; 
    if(newStatus !== currentStatus) { 
        let row = inputEl.closest('tr'); 
        let selectEl = row.querySelector('.status-select'); 
        if(selectEl) { 
            selectEl.value = newStatus; 
            selectEl.className = 'status-select st-arranging'; 
            let badgeEl = row.querySelector('.m-prev-top .status-badge'); 
            if(badgeEl) { badgeEl.className = 'status-badge st-arranging'; badgeEl.innerText = newStatus; } 
        } 
    } 
    await supabaseClient.from('orders').update(updates).eq('id', id); 
    showToast("저장되었습니다."); 
}

window.handleOrderStatusChange = function(id, newValue, selectEl) {
    let order = gOrd.find(o => String(o.id) === String(id));
    if(!order) return;
    let oldStatus = order.status || '주문 접수';
    if (oldStatus === newValue) return;

    let confirmMsg = `<div style="font-size:15px; color:var(--text-display); margin-top:8px;">주문 상태를 <strong style="color:var(--primary); font-size:18px;">[${newValue}]</strong>(으)로<br>변경하시겠습니까?</div>`;
    
    let isRollback = false;
    if ((oldStatus === '입금 확인 중' || oldStatus === '입금 확인' || oldStatus === '센터 도착') && (newValue === '입금 대기' || newValue === '주문 접수')) {
        isRollback = true;
    }

    if (isRollback) {
        confirmMsg = `
        <div style="background:#fff0f0; border:1px solid #ffcdd2; border-radius:8px; padding:16px; margin-bottom:12px; text-align:left;">
            <div style="color:var(--error); font-weight:800; font-size:14px; margin-bottom:8px; display:flex; align-items:center; gap:6px;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                롤백 경고
            </div>
            <div style="font-size:14px; color:var(--text-display); line-height:1.5; word-break:keep-all;">
                현재 <span style="font-weight:700; color:var(--text-secondary);">[${oldStatus}]</span> 상태입니다.<br>
                정말 <strong style="color:var(--error); font-size:16px;">[${newValue}]</strong> (으)로 되돌리시겠습니까?
            </div>
        </div>`;
    }

    window.openCustomConfirm("주문 상태 변경", null, confirmMsg, async () => {
        const { error } = await supabaseClient.from('orders').update({ status: newValue }).eq('id', id);
        if (error) {
            showToast("상태 변경에 실패했습니다.");
        } else {
            showToast(`[${newValue}] 상태로 변경되었습니다.`);
            window.fetchCenterData(); 
        }
    }, "변경하기");

    selectEl.value = oldStatus;
};

function renderOrderTableHTML(fOrd, tableId, chkClass) { 
  try {
      if(!$(tableId)) return;
      $(tableId).innerHTML = fOrd.length ? fOrd.map(o=>{ 
        let badgeClass = o.status==='주문 취소'?'st-ghosted':o.status==='센터 도착'?'st-completed':o.status==='입금 확인'?'st-confirmed':(o.status==='입금 대기'||o.status==='입금 확인 중')?'st-arranging':'st-wait'; 
        let cNm = o.item_name || ""; let m = String(cNm).match(/(.+) \[(?:희망:\s*)?(\d+)\/(\d+)\((월|화|수|목|금|토|일)\).*?\]/); if(m) cNm = m[1].trim(); else { let oM = String(cNm).match(/(.+) \[(.*?)\]/); if(oM) cNm = oM[1].trim(); } 
        let centerBadge = `<span style="background:var(--border); color:var(--text-display); padding:6px 10px; border-radius:8px; font-size:13px; font-weight:700; white-space:nowrap;">${o.center||'미지정'}</span>`; 
        let vendorUrl = o.link ? o.link : (o.url ? o.url : '#'); let vendorHtml = `<a href="${vendorUrl}" target="_blank" style="color:var(--text-secondary); font-weight:700; font-size:13px; text-decoration:none; cursor:pointer;" onmouseover="this.style.textDecoration='underline'" onmouseout="this.style.textDecoration='none'">${o.vendor}</a>`; 
        let copyableHtml = `<div class="copyable-wrap" onclick="window.copyTxt('${String(cNm).replace(/'/g, "\\'")}')" data-full-text="${String(cNm).replace(/"/g, '&quot;')}" title="클릭하여 복사"><div style="display:flex; align-items:center; width:100%; min-width: 0;"><span class="copyable-text">${cNm}</span><span class="copyable-hint">복사</span></div></div>`; 
        let cTxtPreview = o.center ? `<span style="background:var(--border); color:var(--text-secondary); padding:2px 6px; border-radius:4px; font-size:11px; font-weight:600; margin-right:6px; vertical-align:middle; white-space:nowrap;">${o.center}</span>` : ''; 
        let mPreview = `<td class="m-preview has-checkbox" onclick="this.closest('tr').classList.toggle('expanded')"><div class="m-prev-top"><span class="m-prev-date">${formatDtWithDow(o.created_at)}</span><span class="status-badge ${badgeClass}">${o.status}</span></div><div class="m-prev-title">[${o.batch||'-'}] <span style="font-weight:800;">${o.name}</span> <span style="font-size:13px; font-weight:500; color:var(--text-secondary); margin-left:4px;">(${o.quantity})</span></div><div class="m-prev-desc" style="color:var(--text-display); font-weight:500; line-height:1.5;">${cTxtPreview}<span style="font-size:12px; color:var(--text-secondary); margin-right:4px;">${o.vendor}</span>${cNm}</div><span class="m-toggle-hint">상세 정보 보기 ▼</span></td>`; 
        return `<tr style="border-bottom: 1px solid var(--border-strong);">${mPreview}<td data-label="선택" class="tc" style="text-align:center;"><input type="checkbox" class="chk-ord ${chkClass}" value="${o.id}"></td><td data-label="주문 날짜" style="white-space:nowrap; text-align:left; color:var(--text-display); font-size:14px; font-weight:500;">${formatDt(o.created_at)}</td><td data-label="수령 센터" class="tc" style="text-align:center;">${centerBadge}</td><td data-label="기수" class="tc" style="color:var(--text-secondary); font-size:14px; font-weight:600; text-align:center;">${o.batch||'-'}</td><td data-label="성함" style="text-align:left;"><strong style="font-weight:800; color:var(--text-display); font-size:15px; white-space:nowrap;">${o.name}</strong></td><td data-label="연락처" style="white-space:nowrap; text-align:left; color:var(--text-secondary); font-size:14px;">${o.phone}</td><td data-label="생두사 / 상품명" style="text-align:left; width: 100%; max-width: 320px; overflow:visible;"><div style="display:flex; align-items:center; width:100%; min-width: 0; gap:12px;"><div style="width: 80px; flex-shrink: 0; text-align: left;">${vendorHtml}</div><span style="color:var(--border-strong); font-size:12px; flex-shrink:0;">|</span>${copyableHtml}</div></td><td data-label="수량" class="tc" style="font-size:15px; font-weight:700; color:var(--text-display); text-align:center;">${o.quantity}</td><td data-label="총 금액 입력" style="text-align:right;"><input type="text" value="${o.total_price||''}" placeholder="0원" style="width:100px; padding:10px 12px; text-align:right; font-size:14px; font-weight:600; background:#fff; border:1px solid var(--border-strong); border-radius:8px; color:var(--text-display); outline:none; transition:0.2s;" onfocus="this.style.borderColor='var(--primary)';" onblur="this.style.borderColor='var(--border-strong)'; window.handlePriceInput('${o.id}', this.value, '${o.status}', this)"></td><td data-label="상태 관리" class="tc" style="text-align:center;"><div class="action-wrap" style="justify-content:center; display:flex;"><select class="status-select ${badgeClass}" onchange="window.handleOrderStatusChange('${o.id}', this.value, this)" style="text-align-last:center;"><option value="주문 접수" ${o.status==='주문 접수'?'selected':''}>주문 접수</option><option value="입금 대기" ${o.status==='입금 대기'?'selected':''}>입금 대기</option><option value="입금 확인 중" ${o.status==='입금 확인 중'?'selected':''}>입금 확인 중</option><option value="입금 확인" ${o.status==='입금 확인'?'selected':''}>입금 확인</option><option value="센터 도착" ${o.status==='센터 도착'?'selected':''}>센터 도착</option><option value="주문 취소" ${o.status==='주문 취소'?'selected':''}>주문 취소</option></select></div></td></tr>` 
      }).join("") : `<tr><td colspan="10" class="empty-state">해당 요일의 주문 내역이 없습니다.</td></tr>`; 
  } catch(e) { if($(tableId)) $(tableId).innerHTML = `<tr><td colspan="10" class="empty-state">에러 발생</td></tr>`; }
}

window.renderNoticeData = function() { 
  let fNoti = [...gNotice]; 
  fNoti.sort((a,b) => { 
    if(a.is_pinned === b.is_pinned) return new Date(b.created_at||0) - new Date(a.created_at||0); 
    return a.is_pinned ? -1 : 1; 
  }); 
  if($("noticeTableBody")) $("noticeTableBody").innerHTML = fNoti.length ? fNoti.map(n => { 
      let pinBadge = n.is_pinned ? `<span class="status-badge badge-orange" style="margin-right:8px;">필독</span>` : `<span class="status-badge badge-gray" style="margin-right:8px;">일반</span>`; 
      let statBadge = n.status === '발행' ? `<span class="status-badge badge-green">발행 중</span>` : `<span class="status-badge badge-gray">숨김</span>`; 
      let targetBadge = n.target_batch ? `<span class="status-badge badge-blue">${window.escapeHtml(n.target_batch)}</span>` : `<span class="status-badge badge-gray">전체</span>`;
      let mPreview = `<td class="m-preview" onclick="this.closest('tr').classList.toggle('expanded')"><div class="m-prev-top"><span class="m-prev-date">${formatDt(n.created_at)}</span>${statBadge}</div><div class="m-prev-title" style="font-size:16px;">${pinBadge}${window.escapeHtml(n.title)}</div><span class="m-toggle-hint">관리 메뉴 보기 ▼</span></td>`; 
      return `<tr>${mPreview}<td data-label="구분" class="tc">${pinBadge}</td><td data-label="대상" class="tc">${targetBadge}</td><td data-label="제목"><strong style="color:var(--text-display);">${window.escapeHtml(n.title)}</strong></td><td data-label="상태" class="tc">${statBadge}</td><td data-label="작성일">${formatDt(n.created_at)}</td><td data-label="관리" class="tc"><div class="action-wrap-flex" style="justify-content:center;"><button class="btn-outline btn-sm" onclick="window.editNotice('${n.id}')">수정</button> <button class="btn-outline btn-sm" onclick="window.deleteNotice('${n.id}')" style="color:var(--error);border-color:var(--error)">삭제</button></div></td></tr>`; 
    }).join("") : `<tr><td colspan="6" class="empty-state">등록된 공지사항이 없습니다.</td></tr>`; 
}

window.renderMCalCenter = function(selDate) { 
  $$$("#dash-content .m-cal-date").forEach(el => el.classList.remove('active')); 
  let target = document.getElementById(`m-date-center-${selDate}`); 
  if(target) { 
      target.classList.add('active'); 
      try { target.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' }); } catch(e) {}
  } 
  let evts = window.centerCalEvts[selDate] || []; 
  evts.sort((a,b) => String(a.start||'').localeCompare(String(b.start||''))); 
  let html = ''; 
  if(evts.length === 0) { 
      html = `<div class="empty-state" style="padding:40px 0;">예정된 일정이 없습니다.</div>`; 
  } else { 
      evts.forEach(e => { let badgeStyle = e.type==='google' ? 'color:#495057;' : 'color:var(--primary);'; html += `<div class="m-cal-card"><div class="m-cal-card-time" style="${badgeStyle}">${e.start || e.time || '종일'}</div><div class="m-cal-card-title">${window.escapeHtml(e.text)||''}</div><div class="m-cal-card-desc">${String(e.tooltip||'').split('|')[0]}</div></div>`; }); 
  } 
  let listWrap = $("m-cal-list-center"); 
  if(listWrap) listWrap.innerHTML = html; 
};

window.renderAppDashboard = async function() {
    const now = new Date(); let targetDate = new Date(now.getFullYear(), now.getMonth() + appDashMonthOffset, 1); const yyyy = targetDate.getFullYear(); const mm = targetDate.getMonth(); const daysInMonth = new Date(yyyy, mm + 1, 0).getDate(); const currDay = now.getDay();
    if (currentAppDashView === 'month' && $("appDashMonthTitle")) $("appDashMonthTitle").innerText = `${yyyy}년 ${mm + 1}월`; await window.fetchHolidays(yyyy);
    let scheduledApps = globalApps.filter(a => a.status === '상담 일정 확정' && a.call_time); let calEvts = {};
    if (currentAppDashView === 'week') { let startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - currDay); for(let i = 0; i < 7; i++) { let dObj = new Date(startOfWeek.getFullYear(), startOfWeek.getMonth(), startOfWeek.getDate() + i); let ds = `${dObj.getFullYear()}-${String(dObj.getMonth()+1).padStart(2,'0')}-${String(dObj.getDate()).padStart(2,'0')}`; calEvts[ds] = []; } } else { for(let d=1; d<=daysInMonth; d++) { let ds = `${yyyy}-${String(mm+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`; calEvts[ds] = []; } }
    
    scheduledApps.forEach(app => { 
        let callTimeStr = String(app.call_time||'');
        let m = callTimeStr.match(/(\d+)년\s*(\d+)월\s*(\d+)일/); 
        let appY, appM, appD;

        if (m) { 
            appY = parseInt(m[1]); appM = parseInt(m[2]); appD = parseInt(m[3]); 
        } else {
            let m2 = callTimeStr.match(/(\d+)월\s*(\d+)일/);
            if(m2) {
                appY = now.getFullYear(); appM = parseInt(m2[1]); appD = parseInt(m2[2]);
            }
        }

        if(appY && appM && appD) {
            let ds = `${appY}-${String(appM).padStart(2,'0')}-${String(appD).padStart(2,'0')}`; 
            if (calEvts[ds]) { 
                const tm = callTimeStr.match(/(오전|오후)\s+(\d+):(\d+)/); 
                let timeStr = tm ? `${tm[1]} ${tm[2]}:${tm[3]}` : (callTimeStr.includes(')') ? callTimeStr.split(')')[1].trim() : callTimeStr); 
                calEvts[ds].push({ time: timeStr, text: `[${app.desired_batch||'-'}] ${app.name}`, tooltip: `${timeStr} | 담당: ${app.counselor_name||'미정'}`}); 
            } 
        }
    });
    
    let mHtml = `<div class="dash-cal-grid"><div class="dash-cal-header" style="color:var(--error);">일</div><div class="dash-cal-header">월</div><div class="dash-cal-header">화</div><div class="dash-cal-header">수</div><div class="dash-cal-header">목</div><div class="dash-cal-header">금</div><div class="dash-cal-header" style="color:var(--blue);">토</div>`;
    let iterDates = Object.keys(calEvts).sort(); if (currentAppDashView === 'month') { let firstDay = new Date(yyyy, mm, 1).getDay(); for(let i=0; i<firstDay; i++) mHtml += `<div class="dash-cal-cell empty"></div>`; }
    iterDates.forEach(ds => { let dObj = new Date(ds); let evts = calEvts[ds]; let holidayName = window.getHoliday(dObj.getFullYear(), dObj.getMonth() + 1, dObj.getDate()); let dateClass = holidayName ? 'holiday-date' : ''; let dateText = dObj.getDate() + (holidayName ? ` <span style="font-size:10px; font-weight:600; display:block; float:right;">${holidayName}</span>` : ''); let evtsHtml = evts.slice(0, 3).map(e => `<div class="dash-item" style="background:#FFF6EF; border-left-color:var(--primary); color:var(--primary);"><div class="dash-item-text"><span class="dash-time">${e.time||''}</span>${window.escapeHtml(e.text)||''}</div><div class="dash-tooltip">${window.escapeHtml(e.tooltip)||''}</div></div>`).join(''); if(evts.length > 3) { let hiddenText = evts.slice(3).map(e => `${e.time||''} | ${window.escapeHtml(e.text)||''}`).join('<br>'); evtsHtml += `<div class="dash-cal-more-wrap"><div class="dash-cal-more">+${evts.length - 3}건 더보기</div><div class="dash-tooltip" style="text-align:left; white-space:nowrap; font-weight:normal;">${hiddenText}</div></div>`; } mHtml += `<div class="dash-cal-cell"><div class="dash-cal-date ${dateClass}">${dateText}</div>${evtsHtml}</div>`; }); mHtml += `</div>`;
    window.appCalEvts = calEvts; let mobStrip = `<div class="mobile-cal"><div class="m-cal-strip" id="m-cal-strip-app">`; iterDates.forEach(ds => { let dObj = new Date(ds); let dayKr = ["일","월","화","수","목","금","토"][dObj.getDay()]; let hasEvt = calEvts[ds].length > 0 ? 'has-evt' : ''; mobStrip += `<div class="m-cal-date" id="m-date-app-${ds}" onclick="window.renderMCalApp('${ds}')"><span class="m-cal-day">${dayKr}</span><span class="m-cal-num">${dObj.getDate()}</span><div class="m-cal-dot ${hasEvt}"></div></div>`; }); mobStrip += `</div><div id="m-cal-list-app" class="m-cal-list"></div></div>`;
    if($("appDashContent")) $("appDashContent").innerHTML = `<div class="desktop-cal">${mHtml}</div>` + mobStrip; let td = new Date(); let todayStr = `${td.getFullYear()}-${String(td.getMonth()+1).padStart(2,'0')}-${String(td.getDate()).padStart(2,'0')}`; window.renderMCalApp(calEvts[todayStr] ? todayStr : iterDates[0]);
}

window.renderMCalApp = function(selDate) { 
    $$$("#appDashContent .m-cal-date").forEach(el => el.classList.remove('active')); 
    let target = document.getElementById(`m-date-app-${selDate}`); 
    if(target) { 
        target.classList.add('active'); 
        try { target.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' }); } catch(e) {}
    } 
    let evts = window.appCalEvts[selDate] || []; 
    evts.sort((a,b) => String(a.time||'').localeCompare(String(b.time||''))); 
    let html = ''; 
    if(evts.length === 0) { 
        html = `<div class="empty-state" style="padding:40px 0;">예정된 상담 일정이 없습니다.</div>`; 
    } else { 
        evts.forEach(e => { 
            let rawTooltip = String(e.tooltip||'');
            let descParts = rawTooltip.split('|');
            let descText = descParts.length > 1 ? descParts.slice(1).join('|').trim() : rawTooltip;

            html += `<div class="m-cal-card" style="align-items:flex-start; text-align:left; width:100%; box-sizing:border-box;">
                <div style="display:flex; align-items:center; justify-content:space-between; width:100%; margin-bottom: 4px;">
                    <div class="m-cal-card-title" style="margin:0;">${window.escapeHtml(e.text)||''}</div>
                    <div class="m-cal-card-time" style="color:var(--primary); font-weight:800; font-size:13px;">${e.time || '종일'}</div>
                </div>
                <div class="m-cal-card-desc" style="font-size:13px; color:var(--text-secondary); margin-top:0; width:100%;">${window.escapeHtml(descText)}</div>
            </div>`; 
        }); 
    } 
    let listWrap = $("m-cal-list-app"); 
    if(listWrap) listWrap.innerHTML = html; 
};

window.toggleInsight = function() { 
    isInsightView = !isInsightView; 
    let insightArea = $("app-insight-area");
    if(insightArea) insightArea.style.paddingTop = "32px"; 
    if (isInsightView) { 
        if($("app-table-area")) $("app-table-area").style.display = "none"; 
        if(insightArea) insightArea.style.display = "block"; 
        if($("insightToggleBtn")) $("insightToggleBtn").innerText = "리스트 보기"; 
        window.applyFilterApp(); 
    } else { 
        if($("app-table-area")) $("app-table-area").style.display = "block"; 
        if(insightArea) insightArea.style.display = "none"; 
        if($("insightToggleBtn")) $("insightToggleBtn").innerText = "인사이트 보기"; 
    } 
}
window.toggleAppDashView = function(view) { currentAppDashView = view; if(view === 'month') { if($("appDashMonthNav")) $("appDashMonthNav").style.display = 'flex'; } else { if($("appDashMonthNav")) $("appDashMonthNav").style.display = 'none'; appDashMonthOffset = 0; } window.renderAppDashboard(); }
window.changeAppDashMonth = function(offset) { appDashMonthOffset += offset; window.renderAppDashboard(); }
window.resetAppDashMonth = function() { appDashMonthOffset = 0; window.renderAppDashboard(); }

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
          let timeStr = '';
          const tm = String(evt.call_time||'').match(/(오전|오후)\s+(\d+):(\d+)/);
          if (tm) {
              timeStr = `${tm[1]} ${tm[2]}:${tm[3]}`;
          } else {
              timeStr = evt.call_time.includes(')') ? evt.call_time.split(')')[1].trim() : evt.call_time;
          }
          html += `<div class="inout-card" style="padding: 16px; gap: 8px; border-radius:12px; border:1px solid var(--border-strong); background:#fff; align-items:flex-start; text-align:left; width:100%; box-sizing:border-box;">
              <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom: 4px; width:100%;">
                  <span style="font-weight:800; font-size:15px; color:var(--text-display);">[${evt.desired_batch||'-'}] ${window.escapeHtml(evt.name)}</span>
                  <span style="color:var(--primary); font-size:13px; font-weight:800;">${timeStr}</span>
              </div>
              <div style="font-weight:500; font-size:13px; color:var(--text-secondary); width:100%;">
                  ${window.escapeHtml(evt.phone)} <span style="color:var(--border-strong); margin:0 6px;">|</span> 담당: ${window.escapeHtml(evt.counselor_name)||'미정'}
              </div>
          </div>`; 
      }); 
      html += `</div>`; 
  }
  if($("appDailyBanner")) $("appDailyBanner").innerHTML = html;
}

window.fetchApplications = async function() {
  try { 
      const { data, error } = await supabaseClient.from('applications').select('*').order('created_at', { ascending: false }); 
      if (error) throw error; 
      globalApps = data || []; 
      const batches = [...new Set(globalApps.map(d => d.desired_batch).filter(Boolean))].sort().reverse(); 
      let optionsHTML = '<option value="all">전체 기수 보기</option>'; 
      batches.forEach(b => optionsHTML += `<option value="${b}">${b}</option>`); 
      if($("batchFilterApp")) $("batchFilterApp").innerHTML = optionsHTML; 
      window.applyFilterApp(); 
      if ($("crmModal") && $("crmModal").classList.contains('show') && $("crmAppId").value) { 
          window.renderCrmInner($("crmAppId").value, isCrmReadOnly); 
      } 
  } catch(e) { 
      globalApps = [];
      if($("appTableBody")) $("appTableBody").innerHTML = `<tr><td colspan="8" class="empty-state">에러 발생</td></tr>`; 
      console.error("신청 리스트 에러:", e); 
  }
}
window.applyFilterApp = function() { try { const selected = $("batchFilterApp").value; const filtered = selected === 'all' ? globalApps : globalApps.filter(d => d.desired_batch === selected); if (isInsightView) window.renderStatistics(filtered); else { window.renderAppTable(filtered); window.renderAppDailyBanner(filtered); window.renderAppDashboard(); } } catch(e) { console.error("필터 적용 중 에러:", e); } }

const statusClassMap = { '대기': 'st-wait', '상담 일정 조율 중': 'st-arranging', '상담 일정 확정': 'st-confirmed', '상담 완료': 'st-completed', '연락 두절': 'st-ghosted', '설문 완료': 'st-confirmed' };
const joinClassMap = { '': 'jn-none', '고민 중': 'jn-thinking', '가입 완료': 'jn-joined', '미가입': 'jn-declined', '다음 기수 희망': 'jn-next' };

function parseAcquisitionChannel(rawText) { 
    if(!rawText) return '-'; 
    let txt = String(rawText).toLowerCase(); 
    if(txt.includes('광고') || txt.includes('스폰서드')) return '광고'; 
    if(txt.includes('인스타')) return '인스타그램'; 
    if(txt.includes('블로그')) return '네이버 블로그'; 
    if(txt.includes('블랙워터')) return '블랙워터이슈'; 
    if(txt.includes('지인')) return '지인 추천'; 
    return '기타'; 
}

window.closeCrmModal = function() { if($("crmModal")) $("crmModal").classList.remove('show'); };

window.renderCrmInner = function(id, isReadOnly = false) {
    const app = globalApps.find(a => String(a.id) === String(id)); if(!app) return;
    if($("crmName")) $("crmName").innerText = app.name || '이름 없음';
    
    let shortAcq = parseAcquisitionChannel(app.acquisition_channel);
    
    let batchTag = `<span style="font-weight:800; color:var(--text-display);">[${app.desired_batch||'미정'}]</span>`;
    let divider = `<span style="color:var(--border-strong); margin:0 8px;">|</span>`;
    let phoneTag = `<span style="font-weight:600; color:var(--text-secondary);">${window.escapeHtml(app.phone)||'-'}</span>`;
    let acqTag = `<span style="font-weight:600; color:var(--text-secondary);">${window.escapeHtml(shortAcq)}</span>`;
    
    if($("crmProfile")) $("crmProfile").innerHTML = `${batchTag}${divider}${phoneTag}${divider}${acqTag}`;
    
    let timeStr = app.call_time && app.call_time !== 'null' ? window.escapeHtml(app.call_time) : '미정';
    if($("crmTimeBadge")) {
        $("crmTimeBadge").innerHTML = `상담 예정일: <span style="color:var(--text-display); font-weight:700;">${timeStr}</span>`;
        $("crmTimeBadge").style.color = "var(--text-secondary)";
        $("crmTimeBadge").style.fontWeight = "500";
    }
    
    const job = app.survey_job; const edu = app.survey_edu; const goal = app.survey_goal; const brand = app.survey_brand;
    if($("crmSurveyResult")) {
        if (job || edu) {
            $("crmSurveyResult").innerHTML = `<div class="crm-box"><div class="crm-label">1. 직업 상태</div><div class="crm-answer">${window.escapeHtml(job) || '<span class="crm-empty">미작성</span>'}</div></div><div class="crm-box"><div class="crm-label">2. 과거 교육 피드백</div><div class="crm-answer">${window.escapeHtml(edu) || '<span class="crm-empty">미작성</span>'}</div></div><div class="crm-box"><div class="crm-label">3. 달성 목표 (니즈)</div><div class="crm-answer">${window.escapeHtml(goal) || '<span class="crm-empty">미작성</span>'}</div></div><div class="crm-box"><div class="crm-label">4. 선호 브랜드</div><div class="crm-answer">${window.escapeHtml(brand) || '<span class="crm-empty">미작성</span>'}</div></div>`;
        } else {
            $("crmSurveyResult").innerHTML = `<div style="text-align:center; padding: 40px 20px; background:#fff; border-radius:12px; border:1px dashed var(--border-strong);"><div style="font-size:16px; font-weight:700; color:var(--text-secondary); margin-bottom:16px;">아직 사전 설문을 작성하지 않은 고객입니다.</div><button class="btn-outline" style="color:var(--primary); border-color:var(--primary); padding:12px 24px; font-size:15px;" onclick="window.copyTxt('https://www.wecoffee.co.kr/survey?uid=${app.id}&name=${encodeURIComponent(app.name || '')}', '사전 설문 링크가 복사되었습니다.')">고객 전용 설문 링크 복사하기</button></div>`;
        }
    }

    let notesHtml = '';
    if (app.admin_memo) {
        let notes = app.admin_memo.split('|||'); 
        notes.forEach(note => {
            let parts = note.split(':::');
            if(parts.length === 2) {
                let q = parts[0].trim();
                let a = parts[1].trim();
                if(q || a) {
                    notesHtml += `<div class="crm-box"><div class="crm-label">${window.escapeHtml(q)}</div><div class="crm-answer">${window.escapeHtml(a).replace(/\n/g, '<br>')}</div></div>`;
                }
            } else if (note.trim()) {
                 notesHtml += `<div class="crm-box"><div class="crm-answer">${window.escapeHtml(note.trim()).replace(/\n/g, '<br>')}</div></div>`;
            }
        });
    }
    
    if(!notesHtml) notesHtml = `<div style="font-size:13px; color:var(--text-tertiary); text-align:center; padding:10px;">등록된 상담 기록이 없습니다.</div>`;
    if($("crmAdminNotes")) $("crmAdminNotes").innerHTML = notesHtml;
    
    if($("crmNoteTitle")) $("crmNoteTitle").value = '';
    if($("crmNoteInput")) $("crmNoteInput").value = '';

    let initialStatus = app.join_status || (app.status === '상담 완료' ? '상담 완료' : ''); if(!initialStatus || initialStatus === '대기') initialStatus = '상담 완료'; 
    if($("crmStatusSelect")) $("crmStatusSelect").value = initialStatus;

    if (isCrmReadOnly) {
        if($("crmNoteInputWrap")) $("crmNoteInputWrap").style.display = 'none';
        if($("crmStatusActionArea")) $("crmStatusActionArea").style.display = 'none';
    } else {
        if($("crmNoteInputWrap")) $("crmNoteInputWrap").style.display = 'block';
        if($("crmStatusActionArea")) $("crmStatusActionArea").style.display = 'flex';
    }
}

window.openCrmModal = function(id, readOnly = false) { 
    isCrmReadOnly = readOnly;
    if($("crmAppId")) $("crmAppId").value = id; 
    window.renderCrmInner(id, isCrmReadOnly); 
    if($("crmModal")) $("crmModal").classList.add('show'); 
}
window.saveCrmStatus = function() { const id = $("crmAppId").value; const selected = $("crmStatusSelect").value; if(!id || !selected) return; if(selected === '상담 완료' || selected === '연락 두절') { window.updateAppStatus(id, 'status', selected); } else { window.updateAppStatus(id, 'join_status', selected); window.updateAppStatus(id, 'status', '상담 완료'); } window.closeCrmModal(); }
window.handleStatusChange = function(id, newStatus, callTime, counselorName) { if (newStatus === '상담 일정 확정') { window.openScheduleModal(id, callTime, counselorName); } else { window.updateAppStatus(id, 'status', newStatus); } };

window.openScheduleModal = function(id, time, name) { 
    currentScheduleAppId = id; 
    if($("schedInputDate")) { $("schedInputDate").value = ""; $("schedInputDate").dataset.raw = ""; }
    if($("schedInputTime")) { $("schedInputTime").value = ""; $("schedInputTime").dataset.raw = ""; }
    if($("schedInputName")) { $("schedInputName").value = (name && name !== 'null' && name !== 'undefined') ? name : ''; }

    if (time && time !== '미정' && time !== 'null') {
        let mDate = time.match(/(\d+)월\s*(\d+)일/);
        if (mDate && $("schedInputDate")) {
            let dRaw = String(mDate[1]).padStart(2,'0') + String(mDate[2]).padStart(2,'0');
            $("schedInputDate").dataset.raw = dRaw;
            $("schedInputDate").value = window.formatCounselDateDisplay(dRaw) || "";
        }
        
        let mTime = time.match(/(오전|오후)\s*(\d+):(\d+)/);
        if (mTime && $("schedInputTime")) {
            let ampm = mTime[1];
            let hh = parseInt(mTime[2], 10);
            let min = String(mTime[3]).padStart(2, '0');
            if (ampm === '오후' && hh < 12) hh += 12;
            if (ampm === '오전' && hh === 12) hh = 0;
            let tRaw = String(hh).padStart(2,'0') + min;
            $("schedInputTime").dataset.raw = tRaw;
            $("schedInputTime").value = window.formatCounselTimeDisplay(tRaw) || "";
        }
    }
    
    if($("scheduleModal")) $("scheduleModal").classList.add('show'); 
};
window.closeScheduleModal = function() { if($("scheduleModal")) $("scheduleModal").classList.remove('show'); currentScheduleAppId = null; };

window.saveScheduleData = async function() {
    if (!currentScheduleAppId) return;
    
    let dVal = $("schedInputDate") ? ($("schedInputDate").dataset.raw || $("schedInputDate").value) : ""; 
    const tVal = $("schedInputTime") ? ($("schedInputTime").dataset.raw || $("schedInputTime").value) : ""; 
    const name = $("schedInputName") ? $("schedInputName").value.trim() : "";
    if (!dVal || !tVal) { showToast("상담 날짜와 시간을 모두 입력해주세요."); return; }
    
    let dt = String(dVal).replace(/\D/g, ''); 
    if (dt.length > 4) dt = dt.slice(-4);
    
    const timeRe = String(tVal).replace(/\D/g, '');
    if(dt.length !== 4) { showToast("날짜는 MMDD 형식(4자리)으로 입력해주세요."); return; }
    if(timeRe.length < 4) { showToast("시간은 HHMM 형식(4자리)으로 입력해주세요."); return; }

    const now = new Date(); let currentYear = now.getFullYear();
    const mm = parseInt(dt.slice(0,2), 10); const dd = parseInt(dt.slice(2,4), 10);
    const hh = parseInt(timeRe.slice(0,2), 10); const min = parseInt(timeRe.slice(2,4), 10);

    if (mm < now.getMonth() + 1 - 2) { currentYear += 1; }

    const parseDate = new Date(currentYear, mm - 1, dd, hh, min);
    if(isNaN(parseDate.getTime())) { showToast("유효하지 않은 날짜입니다."); return; }

    const dow = ['일','월','화','수','목','금','토'][parseDate.getDay()];
    let ampm = hh >= 12 ? '오후' : '오전'; let hh12 = hh % 12 || 12;
    const formattedCallTime = `${currentYear}년 ${mm}월 ${dd}일(${dow}) ${ampm} ${hh12}:${String(min).padStart(2,'0')}`;

    const { error } = await supabaseClient.from('applications').update({ status: '상담 일정 확정', call_time: formattedCallTime, counselor_name: name }).eq('id', currentScheduleAppId);
    if (error) { 
        showToast("저장 실패"); 
    } else { 
        showToast("상담 일정이 확정되었습니다."); 
        
        const app = globalApps.find(a => String(a.id) === String(currentScheduleAppId));
        const surveyLink = `https://www.wecoffee.co.kr/survey?uid=${currentScheduleAppId}&name=${encodeURIComponent(app.name || '')}`;
        
        window.closeScheduleModal(); 
        window.fetchApplications(); 
        window.openCustomConfirm("일정 확정 완료", null, `고객에게 발송할 <b>사전 설문 링크</b>를 복사하시겠습니까?`, surveyLink, "복사하기");
    }
};

window.updateAppStatus = async function(id, column, value) {
    const app = globalApps.find(a => String(a.id) === String(id)); if (!app) return;
    if (column === 'join_status' && app.join_status === '가입 완료' && value !== '가입 완료') {
        window.openCustomConfirm("가입 취소 (롤백)", null, `해당 고객의 가입 처리를 취소하시겠습니까?<br><span style="font-size:12px; color:var(--text-secondary); font-weight:500; display:block; margin-top:8px; line-height:1.5;">멤버 리스트와 결제 내역에서 해당 고객을 완전히 삭제하고,<br>상태를 [${value}](으)로 되돌리시겠습니까?</span>`, async () => {
            await supabaseClient.from('members').delete().eq('phone', app.phone); await supabaseClient.from('member_history').delete().eq('member_phone', app.phone); await supabaseClient.from('applications').update({ join_status: value }).eq('id', id); showToast("멤버 리스트에서 삭제되고 롤백 되었습니다."); window.fetchApplications(); window.fetchMembers();
        });
        return;
    }
    if (column === 'join_status' && value === '가입 완료') {
        window.openCustomConfirm("가입 완료 (멤버 전환)", null, `해당 고객을 멤버 리스트로 이관하시겠습니까?<br><span style="font-size:12px; color:var(--text-secondary); font-weight:500; display:block; margin-top:8px; line-height:1.5;">당월 15일 기준에 따라 6개월 후 활동 종료일이 자동 세팅됩니다.</span>`, async () => {
            if (!app.phone) { showToast("연락처가 없는 고객은 이관할 수 없습니다."); return; }
            
            const now = new Date();
            let endY = now.getFullYear();
            let endM = now.getMonth() + 6; 
            let endDay = now.getDate() <= 15 ? 1 : 15;
            let endDateObj = new Date(endY, endM, endDay);
            const endDateStr = `${endDateObj.getFullYear()}-${String(endDateObj.getMonth()+1).padStart(2,'0')}-${String(endDateObj.getDate()).padStart(2,'0')}`;
            
            const targetBatch = app.desired_batch || '미정'; const targetName = app.name || '이름없음';
            const { data: existingMember, error: checkErr } = await supabaseClient.from('members').select('*').eq('phone', app.phone).limit(1); if (checkErr) { showToast("멤버 조회 중 오류 발생"); return; }
            let dbErr; if (existingMember && existingMember.length > 0) { const { error: updateErr } = await supabaseClient.from('members').update({ status: '활동 중', end_date: endDateStr, batch: targetBatch, name: targetName }).eq('phone', app.phone); dbErr = updateErr; } else { const { error: insertErr } = await supabaseClient.from('members').insert([{ name: targetName, phone: app.phone, batch: targetBatch, status: '활동 중', end_date: endDateStr }]); dbErr = insertErr; }
            if(dbErr) { showToast(`이관 실패: members 테이블 오류`); return; }
            await supabaseClient.from('member_history').insert([{ member_name: targetName, member_phone: app.phone, action_detail: '신규 가입 (6개월)', amount: '1,650,000원' }]); await supabaseClient.from('applications').update({ join_status: '가입 완료' }).eq('id', id); showToast("멤버 이관 및 내역 등록이 완료되었습니다."); window.fetchApplications(); window.fetchMembers();
        });
        return;
    }
    if (column === 'join_status' && value === '다음 기수 희망') {
        let nextBatch = app.desired_batch; if (nextBatch && nextBatch.includes('기')) { let num = parseInt(nextBatch.replace(/[^0-9]/g, '')); if (!isNaN(num)) { nextBatch = (num + 1) + '기'; } }
        window.openCustomConfirm("다음 기수 희망", null, `해당 고객의 희망 기수를 <b>[${nextBatch}]</b>로 자동 변경하시겠습니까?`, async () => { await supabaseClient.from('applications').update({ join_status: '다음 기수 희망', desired_batch: nextBatch }).eq('id', id); showToast("다음 기수로 이월되었습니다."); window.fetchApplications(); });
        return;
    }
    const { error } = await supabaseClient.from('applications').update({ [column]: value }).eq('id', id); if (error) showToast("업데이트 실패"); else { showToast("상태가 업데이트 되었습니다."); window.fetchApplications(); }
};

window.renderAppTable = function(data) {
  if(!$("appTableBody")) return;
  const tbody = $("appTableBody"); tbody.innerHTML = ''; if(data.length === 0) { tbody.innerHTML = `<tr><td colspan="8" class="empty-state">내역이 없습니다.</td></tr>`; return; }
  data.forEach(row => {
    const interestFull = row.interest_detail ? `${row.interest_area} <div class="sub-text">(${row.interest_detail})</div>` : (row.interest_area || '-');
    let routeDisplay = parseAcquisitionChannel(row.acquisition_channel); if (row.brand_awareness_duration && row.brand_awareness_duration !== '정보없음') routeDisplay += ` <div class="sub-text">(${row.brand_awareness_duration})</div>`; else if (row.acquisition_detail) routeDisplay += ` <div class="sub-text">(${row.acquisition_detail})</div>`;
    const cStat = statusClassMap[row.status] || 'st-wait'; const cJoin = joinClassMap[row.join_status || ''] || 'jn-none'; const dis = row.status === '상담 완료' ? '' : 'disabled'; 
    let timeBadgeHtml = ''; let emptyJoinSpace = '';
    if(row.status === '상담 일정 확정' || row.status === '설문 완료') { 
        let displayTime = (row.call_time && row.call_time !== 'null') ? row.call_time : '미정'; 
        timeBadgeHtml = `<div class="edit-schedule-link" onclick="window.openScheduleModal('${row.id}', '${displayTime}', '${row.counselor_name}')">상담 일정 수정</div>`; 
        emptyJoinSpace = `<div class="edit-schedule-link" style="visibility:hidden; pointer-events:none;">-</div>`; 
    }
    let hasSurvey = row.survey_job || row.survey_edu; let surveyBadge = hasSurvey ? `<span class="status-badge badge-orange" style="margin-right:8px; font-size:11px; padding:2px 6px;">설문완료</span>` : `<span class="status-badge badge-gray" style="margin-right:8px; font-size:11px; padding:2px 6px;">미응답</span>`; let nameHtml = `${surveyBadge}<strong style="cursor:pointer; color:var(--text-display); font-weight:700; transition:0.2s;" onmouseover="this.style.fontWeight='900'" onmouseout="this.style.fontWeight='700'" onclick="window.openCrmModal('${row.id}')">${window.escapeHtml(row.name) || '-'}</strong>`;
    let mPreview = `<td class="m-preview" onclick="this.closest('tr').classList.toggle('expanded')"><div class="m-prev-top"><span class="m-prev-date">${formatDtWithDow(row.created_at)}</span><span class="status-badge ${cStat}" style="margin:0 !important;">${row.status}</span></div><div class="m-prev-title">[${row.desired_batch || '-'}] ${window.escapeHtml(row.name) || '-'} <span style="font-size:13px; font-weight:500; color:var(--text-secondary); margin-left:4px;">(${window.escapeHtml(row.phone) || '-'})</span></div><div class="m-prev-desc">${window.escapeHtml(row.interest_area) || '-'}</div><span class="m-toggle-hint">상세 정보 보기 ▼</span></td>`;
    const tr = document.createElement('tr');
    tr.innerHTML = `${mPreview}<td data-label="신청일시">${formatDt(row.created_at)}</td><td data-label="기수">${row.desired_batch || '-'}</td><td data-label="성함">${nameHtml}</td><td data-label="연락처">${window.escapeHtml(row.phone) || '-'}</td><td data-label="관심 분야"><div>${interestFull}</div></td><td data-label="유입 경로"><div>${routeDisplay}</div></td><td data-label="상담 진행 상황"><div class="action-wrap"><select class="status-select ${cStat}" onchange="window.handleStatusChange('${row.id}', this.value, '${String(row.call_time || '')}', '${String(row.counselor_name || '')}')"><option value="대기" ${row.status === '대기' ? 'selected' : ''}>대기</option><option value="상담 일정 조율 중" ${row.status === '상담 일정 조율 중' ? 'selected' : ''}>상담 일정 조율 중</option><option value="상담 일정 확정" ${row.status === '상담 일정 확정' ? 'selected' : ''}>상담 일정 확정</option><option value="설문 완료" ${row.status === '설문 완료' ? 'selected' : ''}>설문 완료 (확정)</option><option value="상담 완료" ${row.status === '상담 완료' ? 'selected' : ''}>상담 완료</option><option value="연락 두절" ${row.status === '연락 두절' ? 'selected' : ''}>연락 두절</option></select>${timeBadgeHtml}</div></td><td data-label="가입 여부"><div class="action-wrap"><select class="status-select ${cJoin}" onchange="window.updateAppStatus('${row.id}', 'join_status', this.value)" ${dis}><option value="" ${!row.join_status ? 'selected' : ''}>선택 전</option><option value="고민 중" ${row.join_status === '고민 중' ? 'selected' : ''}>고민 중</option><option value="가입 완료" ${row.join_status === '가입 완료' ? 'selected' : ''}>가입 완료</option><option value="미가입" ${row.join_status === '미가입' ? 'selected' : ''}>미가입</option><option value="다음 기수 희망" ${row.join_status === '다음 기수 희망' ? 'selected' : ''}>다음 기수 희망</option></select>${emptyJoinSpace}</div></td>`;
    tbody.appendChild(tr);
  });
}
function getFrequency(arr) { return Object.entries(arr.reduce((acc, val) => { if(val) acc[val] = (acc[val] || 0) + 1; return acc; }, {})).sort((a, b) => b[1] - a[1]); }
function generateBarHTML(label, count, maxCount, opacity = 1) { const percent = maxCount === 0 ? 0 : Math.round((count / maxCount) * 100); return `<div style="margin-bottom:8px;"><div style="font-size:13px; font-weight:600; margin-bottom:4px; display:flex; justify-content:space-between;"><span>${label}</span><span style="color:var(--text-secondary); font-size:12px;">${count}건 (${percent}%)</span></div><div style="background:var(--border-strong); height:8px; border-radius:4px; overflow:hidden;"><div style="width:${percent}%; background:rgba(255, 121, 0, ${opacity}); height:100%;"></div></div></div>`; }

window.renderStatistics = function(data) {
  if(!$("statsContainer")) return;
  const container = $("statsContainer"); container.innerHTML = ''; if(data.length === 0) { if($("insightSummaryText")) $("insightSummaryText").innerHTML = "<div style='padding:16px;'>데이터가 부족합니다.</div>"; return; }
  const total = data.length; const counseled = data.filter(d => d.status === '상담 일정 확정' || d.status === '설문 완료' || d.status === '상담 완료').length; const joined = data.filter(d => d.join_status === '가입 완료').length; const convRate = total > 0 ? Math.round((joined / total) * 100) : 0;
  let channelMap = {}; let safeDataForSummary = { instaFollow:0, instaNonFollow:0, adNow:0, leadTime3M:0 };
  
  data.forEach(d => { 
    let rawCh = String(d.acquisition_channel || '기타 경로'); let acq_ch = '기타 경로'; let detail = ''; 
    const match = rawCh.match(/\(([^)]+)\)/); 
    if (match) { detail = match[1].trim(); rawCh = rawCh.split('(')[0].trim(); } 
    
    if (rawCh.includes('인스타')) { 
        acq_ch = '인스타그램'; 
        if (!detail) detail = (d.acquisition_detail && d.acquisition_detail !== '정보없음' && d.acquisition_detail !== 'null') ? String(d.acquisition_detail) : ''; 
        if (!detail) detail = (d.brand_awareness_duration && d.brand_awareness_duration !== '정보없음' && d.brand_awareness_duration !== 'null') ? String(d.brand_awareness_duration) : ''; 
        if (detail.includes('팔로')) safeDataForSummary.instaFollow++; else safeDataForSummary.instaNonFollow++; 
    } else if (rawCh.includes('광고') || rawCh.includes('스폰서드')) { 
        acq_ch = '모집 광고'; 
        if (!detail) detail = (d.brand_awareness_duration && d.brand_awareness_duration !== '정보없음' && d.brand_awareness_duration !== 'null') ? String(d.brand_awareness_duration) : ''; 
        if (!detail) detail = (d.acquisition_detail && d.acquisition_detail !== '정보없음' && d.acquisition_detail !== 'null') ? String(d.acquisition_detail) : ''; 
        if (detail.includes('방금') || detail.includes('1주일') || detail.includes('한 달') || detail.includes('1개월 이내')) safeDataForSummary.adNow++; 
        else if (detail.includes('3개월') || detail.includes('이상')) safeDataForSummary.leadTime3M++; 
    } else if (rawCh.includes('지인')) { 
        acq_ch = '지인 추천'; 
        if (!detail) detail = (d.acquisition_detail && d.acquisition_detail !== '정보없음' && d.acquisition_detail !== 'null') ? String(d.acquisition_detail) : ''; 
    } else if (rawCh.includes('블로그')) { 
        acq_ch = '네이버 블로그'; 
        if (!detail) detail = (d.acquisition_detail && d.acquisition_detail !== '정보없음' && d.acquisition_detail !== 'null') ? String(d.acquisition_detail) : ''; 
    } else { 
        acq_ch = rawCh; 
    } 
    
    if(!channelMap[acq_ch]) channelMap[acq_ch] = { total: 0, details: {} }; 
    channelMap[acq_ch].total++; 
    if(detail && detail !== 'null' && detail !== '정보없음' && !detail.includes('미기재')) { 
        channelMap[acq_ch].details[detail] = (channelMap[acq_ch].details[detail] || 0) + 1; 
    } 
  });
  
  let interestData = getFrequency(data.map(d => String(d.interest_area||''))); let topInterest = interestData.length > 0 ? interestData[0][0] : '없음'; let topInterestRate = total > 0 && interestData.length > 0 ? Math.round((interestData[0][1] / total) * 100) : 0;
  let summaryHtml = `<div style="display:flex; flex-wrap:wrap; gap:16px; margin-bottom:32px;"><div style="flex:1; min-width:260px; background:#fff; border:1px solid var(--border-strong); border-radius:12px; padding:24px; display:flex; flex-direction:column; justify-content:center; align-items:center; text-align:center;"><div style="font-size:13px; color:var(--text-secondary); margin-bottom:8px; font-weight:600;">기수 주요 목적 (관심사)</div><div style="font-size:20px; font-weight:800; color:var(--text-display);">${topInterest} <span style="font-size:15px; color:var(--primary);">(${topInterestRate}%)</span></div></div><div style="flex:1; min-width:260px; background:#fff; border:1px solid var(--border-strong); border-radius:12px; padding:24px; display:flex; flex-direction:column; justify-content:center; align-items:center; text-align:center;"><div style="font-size:13px; color:var(--text-secondary); margin-bottom:8px; font-weight:600;">인스타그램 팬덤 유입 현황</div><div style="font-size:15px; font-weight:700; color:var(--text-display);">팔로워 <span style="font-size:22px; color:var(--primary); font-weight:800;">${safeDataForSummary.instaFollow}</span>명 <span style="color:var(--border-strong); margin:0 8px;">|</span> 비팔로워 <span style="font-size:20px; font-weight:800;">${safeDataForSummary.instaNonFollow}</span>명</div></div><div style="flex:1; min-width:260px; background:#fff; border:1px solid var(--border-strong); border-radius:12px; padding:24px; display:flex; flex-direction:column; justify-content:center; align-items:center; text-align:center;"><div style="font-size:13px; color:var(--text-secondary); margin-bottom:8px; font-weight:600;">모집 광고 리드타임 (고민 후 전환)</div><div style="font-size:15px; font-weight:700; color:var(--text-display);">1개월 이상 <span style="font-size:22px; color:var(--primary); font-weight:800;">${safeDataForSummary.leadTime3M}</span>명 <span style="color:var(--border-strong); margin:0 8px;">|</span> 단기 유입 <span style="font-size:20px; font-weight:800;">${safeDataForSummary.adNow}</span>명</div></div></div>`; 
  if($("insightSummaryText")) $("insightSummaryText").innerHTML = summaryHtml;
  let cardsHtml = `<div class="stat-card" style="padding:24px 16px;"><div style="font-size:13px; color:var(--text-secondary); margin-bottom:8px; font-weight:600;">총 신청 건수</div><div style="font-size:26px; font-weight:800; color:var(--text-display); line-height:1;">${total}<span style="font-size:15px; margin-left:2px;">건</span></div></div><div class="stat-card" style="padding:24px 16px;"><div style="font-size:13px; color:var(--text-secondary); margin-bottom:8px; font-weight:600;">최종 가입 전환율</div><div style="font-size:26px; font-weight:800; color:var(--primary); line-height:1;">${convRate}<span style="font-size:18px;">%</span></div></div><div class="stat-card" style="padding:24px 16px;"><div style="font-size:13px; color:var(--text-secondary); margin-bottom:8px; font-weight:600;">인스타그램 (총합)</div><div style="font-size:26px; font-weight:800; color:var(--text-display); line-height:1;">${channelMap['인스타그램'] ? channelMap['인스타그램'].total : 0}<span style="font-size:15px; margin-left:2px;">건</span></div></div><div class="stat-card" style="padding:24px 16px;"><div style="font-size:13px; color:var(--text-secondary); margin-bottom:8px; font-weight:600;">모집 광고 (총합)</div><div style="font-size:26px; font-weight:800; color:var(--text-display); line-height:1;">${channelMap['모집 광고'] ? channelMap['모집 광고'].total : 0}<span style="font-size:15px; margin-left:2px;">건</span></div></div>`; 
  if($("statsCards")) $("statsCards").innerHTML = cardsHtml;
  let funnelHtml = `<div class="stat-card" style="padding:24px;"><div style="font-size:16px; font-weight:800; margin-bottom:20px; color:var(--text-display); width:100%; text-align:left;">고객 전환 퍼널 (Funnel)</div><div class="funnel-wrap"><div class="funnel-step"><div style="font-size:13px; color:var(--text-secondary); margin-bottom:6px; font-weight:600;">신청 접수</div><div style="font-size:20px; font-weight:800; color:var(--text-display);">${total}명</div></div><div class="funnel-arrow">➔</div><div class="funnel-step"><div style="font-size:13px; color:var(--text-secondary); margin-bottom:6px; font-weight:600;">상담 확정/완료</div><div style="font-size:20px; font-weight:800; color:var(--text-display); margin-bottom:4px;">${counseled}명</div><div style="font-size:12px; color:var(--primary); font-weight:700; background:#fff; padding:2px 8px; border-radius:4px; border:1px solid #f2f4f6;">${total > 0 ? Math.round(counseled/total*100) : 0}% 전환</div></div><div class="funnel-arrow">➔</div><div class="funnel-step success"><div style="font-size:13px; margin-bottom:6px; font-weight:600;">가입 완료</div><div style="font-size:20px; font-weight:800; margin-bottom:4px;">${joined}명</div><div style="font-size:12px; color:var(--primary); font-weight:700; background:#fff; padding:2px 8px; border-radius:4px;">${counseled > 0 ? Math.round(joined/counseled*100) : 0}% 전환</div></div></div></div>`; 
  if($("statsFunnel")) { $("statsFunnel").innerHTML = funnelHtml; $("statsFunnel").style.display = 'block'; }
  let sortedChannels = Object.entries(channelMap).sort((a,b) => b[1].total - a[1].total); let treeChartHtml = '';
  sortedChannels.forEach((item, index) => { let chName = item[0]; let chTotal = item[1].total; let details = item[1].details; let opacity = index === 0 ? 1 : (index === 1 ? 0.8 : (index === 2 ? 0.6 : 0.4)); let percent = total > 0 ? Math.round((chTotal / total) * 100) : 0; treeChartHtml += `<div style="margin-bottom: 16px;"><div style="font-size:14px; font-weight:800; color:var(--text-display); margin-bottom:4px; display:flex; justify-content:space-between;"><span>${index+1}. ${chName}</span><span>${chTotal}건 (${percent}%)</span></div><div style="background:var(--border-strong); height:8px; border-radius:4px; overflow:hidden; margin-bottom:8px;"><div style="width: ${percent}%; background:rgba(255, 121, 0, ${opacity}); height:100%;"></div></div>`; let sortedDetails = Object.entries(details).sort((a,b) => b[1] - a[1]); if (sortedDetails.length > 0) { sortedDetails.forEach(det => { let dName = det[0]; let dCount = det[1]; let dPercent = Math.round((dCount / chTotal) * 100); treeChartHtml += `<div style="display:flex; align-items:center; margin-bottom:6px; padding-left:12px;"><div style="color:var(--text-tertiary); margin-right:8px; font-size:12px; font-weight:800;">ㄴ</div><div style="flex:1;"><div style="display:flex; justify-content:space-between; font-size:12px; font-weight:600; color:var(--text-secondary); margin-bottom:4px;"><span>${dName}</span><span>${dCount}건</span></div><div style="background:var(--border); height:4px; border-radius:2px; overflow:hidden;"><div style="width: ${dPercent}%; background:rgba(255, 121, 0, ${opacity * 0.4}); height:100%;"></div></div></div></div>`; }); } treeChartHtml += `</div>`; });
  let chartsHtml = `<div class="stat-card" style="padding:24px; text-align:left; align-items:flex-start;"><div style="font-size:16px; font-weight:800; margin-bottom:24px; width:100%;">전체 유입 경로 순위 (상세 속성 트리)</div><div style="width:100%;">${treeChartHtml}</div></div><div class="stat-card" style="padding:24px; text-align:left; align-items:flex-start;"><div style="font-size:16px; font-weight:800; margin-bottom:24px; width:100%;">관심 분야 (목적)</div><div style="width:100%;">${getFrequency(data.map(d => String(d.interest_area||''))).map((c, i) => generateBarHTML(c[0], c[1], total, i === 0 ? 1 : (i === 1 ? 0.8 : (i === 2 ? 0.6 : 0.4)))).join('')}</div></div>`; container.innerHTML = chartsHtml; 
  
  window.currentInsightData = { total, joined, instaCount: channelMap['인스타그램']?channelMap['인스타그램'].total:0, adCount: channelMap['모집 광고']?channelMap['모집 광고'].total:0, instaFollow: safeDataForSummary.instaFollow, instaNonFollow: safeDataForSummary.instaNonFollow, leadTime1M: safeDataForSummary.adNow, leadTime3M: safeDataForSummary.leadTime3M, channelMap: channelMap };
}

window.fetchMembers = async function() { const { data, error } = await supabaseClient.from('members').select('*').order('created_at', { ascending: false }); if (error) return; globalMembers = data; let bSet = new Set(); globalMembers.forEach(m => { if(m.batch) bSet.add(m.batch); }); let bHtml = `<option value="all">기수 전체</option>` + Array.from(bSet).sort().reverse().map(b=>`<option value="${b}">${b}</option>`).join(""); if($("memberBatchFilter")) $("memberBatchFilter").innerHTML = bHtml; window.searchMembers(); }
window.searchMembers = function() { const query = $("memberSearch") ? $("memberSearch").value.trim().toLowerCase() : ""; const statusFilter = $("memberStatusFilter") ? $("memberStatusFilter").value : 'all'; const batchFilter = $("memberBatchFilter") ? $("memberBatchFilter").value : 'all'; const today = new Date(); today.setHours(0,0,0,0); const filtered = globalMembers.filter(m => { let isExpired = true; let isPaused = m.status === '활동 일시정지'; if (m.end_date && m.end_date.length === 10) { let endD = new Date(m.end_date); endD.setHours(0,0,0,0); if (endD >= today) isExpired = false; } let statusText = m.status || '활동 중'; if (statusText === '패널티 정지') statusText = '패널티 정지'; else if (statusText === '활동 일시정지') statusText = '활동 일시정지'; else if (isExpired) statusText = '활동 종료'; let matchQuery = `${m.batch||''} ${m.name||''} ${m.phone||''} ${statusText}`.toLowerCase().includes(query); let matchBatch = batchFilter === 'all' || m.batch === batchFilter; let matchStatus = false; if (statusFilter === 'all') matchStatus = true; else if (statusFilter === '활동 중 (전체)') matchStatus = ['활동 중', '연장 활동 중', '단일권 이용'].includes(statusText); else matchStatus = statusText === statusFilter; return matchQuery && matchStatus && matchBatch; }); renderMemberTable(filtered); }
function renderMemberTable(data) {
  if(!$("memberTableBody")) return;
  const tbody = $("memberTableBody"); tbody.innerHTML = ''; if(data.length === 0) { tbody.innerHTML = `<tr><td colspan="6" class="empty-state">내역이 없습니다.</td></tr>`; return; } const today = new Date(); today.setHours(0,0,0,0);
  data.forEach(row => {
    let yy = '', mm = '', dd = ''; let isExpired = true; let isPaused = row.status === '활동 일시정지'; if (row.end_date && row.end_date.length === 10) { [yy, mm, dd] = row.end_date.split('-'); let endD = new Date(row.end_date); endD.setHours(0,0,0,0); if (endD >= today) isExpired = false; } if (isExpired && !isPaused && row.status !== '패널티 정지') { yy = ''; mm = ''; dd = ''; } 
    let currentStat = row.status || '활동 중'; let statusBadge = ""; if (currentStat === '패널티 정지') statusBadge = `<span class="status-badge badge-red">패널티 정지</span>`; else if (isPaused) statusBadge = `<span class="status-badge badge-gray">일시정지</span>`; else if (isExpired) statusBadge = `<span class="status-badge badge-ended" style="background:#fff0f0;color:var(--error);">활동 종료</span>`; else statusBadge = `<span class="status-badge badge-active" style="background:#e8f5e9;color:var(--success);">${currentStat}</span>`;
    let yearOpts = '<option value="">년도</option>'; for(let i = 2024; i <= 2030; i++) yearOpts += `<option value="${i}" ${yy == i ? 'selected' : ''}>${i}년</option>`; let monthOpts = '<option value="">월</option>'; for(let i = 1; i <= 12; i++) { let val = String(i).padStart(2, '0'); monthOpts += `<option value="${val}" ${mm == val ? 'selected' : ''}>${i}월</option>`; } let dayOpts = '<option value="">일</option>'; for(let i = 1; i <= 31; i++) { let val = String(i).padStart(2, '0'); dayOpts += `<option value="${val}" ${dd == val ? 'selected' : ''}>${i}일</option>`; }
    let mPreview = `<td class="m-preview" onclick="this.closest('tr').classList.toggle('expanded')"><div class="m-prev-top"><span class="m-prev-date">${formatDtWithDow(row.created_at)}</span>${statusBadge}</div><div class="m-prev-title" style="font-size:16px;">[${row.batch || '-'}] ${window.escapeHtml(row.name) || '-'} <span style="font-size:13px; font-weight:500; color:var(--text-secondary); margin-left:4px;">(${window.escapeHtml(row.phone) || '-'})</span></div><span class="m-toggle-hint">상세 정보 보기 ▼</span></td>`;
    
    const tr = document.createElement('tr'); tr.innerHTML = `${mPreview}<td data-label="등록일">${formatDt(row.created_at)}</td><td data-label="상태" class="tc">${statusBadge}</td><td data-label="기수"><strong>${row.batch || '-'}</strong></td><td data-label="성함"><strong style="color:var(--text-display); cursor:pointer;" onclick="window.openCrmModalFromPhone('${row.phone}')" title="이전 설문/상담 내역 보기">${window.escapeHtml(row.name) || '-'}</strong></td><td data-label="연락처">${window.escapeHtml(row.phone) || '-'}</td><td data-label="종료일 관리" class="col-action"><div class="date-select-group" data-id="${row.id}"><div class="date-inputs"><select class="date-sel year">${yearOpts}</select><select class="date-sel month">${monthOpts}</select><select class="date-sel day">${dayOpts}</select></div><div class="action-btns"><select class="date-sel option-btn" onchange="window.handleMemberOption('${row.id}', '${row.batch || '미정'}', '${window.escapeHtml(row.name)}', '${window.escapeHtml(row.phone)}', '${row.end_date || ''}', this)"><option value="">옵션 선택</option><option value="1">1개월 연장</option><option value="3">3개월 연장</option><option value="6">6개월 연장</option><option value="bonus">보너스 1개월</option><option value="day">당일권 추가</option><option value="pause">활동 일시정지</option><option value="resume">활동 재개 (자동 연장)</option><option value="release">패널티 적용/해제</option></select><button class="btn-outline btn-sm" onclick="event.stopPropagation(); window.openHistoryModal('${window.escapeHtml(row.phone)}', '${window.escapeHtml(row.name)}')">내역</button></div></div></td>`; tbody.appendChild(tr);
  });
}
document.addEventListener('change', function(e) { if (e.target.classList.contains('date-sel') && !e.target.classList.contains('option-btn')) { const group = e.target.closest('.date-select-group'); const y = group.querySelector('.year').value, m = group.querySelector('.month').value, d = group.querySelector('.day').value; if (y && m && d) window.updateMemberEndDate(group.dataset.id, `${y}-${m}-${d}`).then(() => window.fetchMembers()); } });

window.handleMemberOption = function(id, batch, name, phone, currentEndDate, selectEl) {
  const opt = selectEl.value; const optText = selectEl.options[selectEl.selectedIndex].text; selectEl.value = ''; if(!opt) return;
  let confirmMsg = ""; let baseDateForUpdate = new Date(); baseDateForUpdate.setHours(0,0,0,0);
  if (currentEndDate && currentEndDate.length === 10) { let endD = new Date(currentEndDate); endD.setHours(0,0,0,0); if (endD >= baseDateForUpdate) { baseDateForUpdate = endD; } }
  if(opt === 'release') { const m = globalMembers.find(x => String(x.id) === String(id)); let newStat = m.status === '패널티 정지' ? '활동 중' : '패널티 정지'; confirmMsg = `상태를 <b>[${newStat}]</b> 상태로 전환하시겠습니까?`; } else if (opt === 'pause') { confirmMsg = `활동을 <b>일시정지</b>하시겠습니까?<br><span style="font-size:12px; color:var(--text-secondary); font-weight:500;">(재개 시 정지된 기간만큼 종료일이 연장됩니다.)</span>`; } else if (opt === 'resume') { confirmMsg = `활동을 <b>재개</b>하시겠습니까?<br><span style="font-size:12px; color:var(--text-secondary); font-weight:500;">(이전 정지 기간을 자동 계산하여 연장합니다.)</span>`; } else { let baseDate = new Date(); baseDate.setHours(0,0,0,0); let isActive = false; if (currentEndDate && currentEndDate.length === 10) { let endD = new Date(currentEndDate); endD.setHours(0,0,0,0); if (endD >= baseDate) { isActive = true; } } if (isActive) { confirmMsg = `이어서 <b>${optText}</b>을(를) 적용하시겠습니까?`; } else { confirmMsg = `오늘 날짜를 기준으로<br><b>${optText}</b>을(를) 새롭게 적용하시겠습니까?`; } }
  let statText = ""; if (opt === 'release' || opt === 'pause' || opt === 'resume') { let cur = opt === 'resume' ? '일시정지' : (opt === 'release' ? '확인요망' : '활동 중'); statText = `현재 상태: <b>${cur}</b>`; } else { if(currentEndDate && new Date(currentEndDate) >= new Date().setHours(0,0,0,0)) { statText = `현재 활동 종료일: <b>${currentEndDate}</b>`;  } else { statText = `현재 활동 종료 상태입니다.`;  } }
  pendingOptionData = { id, name, phone, opt, optText, baseDate: baseDateForUpdate, currentEndDate };
  window.openCustomConfirm(`[${batch || '미정'}] ${name} 님`, statText, confirmMsg, async () => {
      if(opt === 'release') { const m = globalMembers.find(x => String(x.id) === String(id)); let newStat = m.status === '패널티 정지' ? '활동 중' : '패널티 정지'; m.status = newStat; window.searchMembers(); await supabaseClient.from('members').update({ status: newStat }).eq('id', id); showToast(`상태가 [${newStat}](으)로 변경되었습니다.`); return; }
      if(opt === 'pause') { const m = globalMembers.find(x => String(x.id) === String(id)); m.status = '활동 일시정지'; window.searchMembers(); await supabaseClient.from('members').update({ status: '활동 일시정지' }).eq('id', id); await supabaseClient.from('member_history').insert([{ member_name: name, member_phone: phone, action_detail: '활동 일시정지 시작', amount: '-' }]); showToast("활동이 일시정지되었습니다."); return; }
      if(opt === 'resume') { const { data: hist } = await supabaseClient.from('member_history').select('*').eq('member_phone', phone).like('action_detail', '활동 일시정지 시작%').order('created_at', { ascending: false }).limit(1); let extendDays = 0; if (hist && hist.length > 0) { let pauseDate = new Date(hist[0].created_at); pauseDate.setHours(0,0,0,0); let todayDate = new Date(); todayDate.setHours(0,0,0,0); extendDays = Math.floor((todayDate - pauseDate) / (1000 * 60 * 60 * 24)); } if (extendDays < 0) extendDays = 0; let endD = new Date(currentEndDate); endD.setDate(endD.getDate() + extendDays); let newEndDate = `${endD.getFullYear()}-${String(endD.getMonth() + 1).padStart(2, '0')}-${String(endD.getDate()).padStart(2, '0')}`; const m = globalMembers.find(x => String(x.id) === String(id)); m.status = '연장 활동 중'; m.end_date = newEndDate; window.searchMembers(); await supabaseClient.from('members').update({ status: '연장 활동 중', end_date: newEndDate }).eq('id', id); await supabaseClient.from('member_history').insert([{ member_name: name, member_phone: phone, action_detail: `활동 재개 (정지일수: ${extendDays}일 자동 연장)`, amount: '-' }]); showToast(`재개 완료. ${extendDays}일이 연장되었습니다.`); return; }
      let amountStr = '0원'; let targetStatus = '연장 활동 중';
      if (opt === '1') { baseDateForUpdate.setMonth(baseDateForUpdate.getMonth() + 1); amountStr = '220,000원'; } else if (opt === '3') { baseDateForUpdate.setMonth(baseDateForUpdate.getMonth() + 3); amountStr = '550,000원'; } else if (opt === '6') { baseDateForUpdate.setMonth(baseDateForUpdate.getMonth() + 6); amountStr = '1,100,000원'; } else if (opt === 'bonus') { baseDateForUpdate.setMonth(baseDateForUpdate.getMonth() + 1); amountStr = '무료 제공'; } else if (opt === 'day') { baseDateForUpdate.setDate(baseDateForUpdate.getDate() + 1); amountStr = '별도 안내'; targetStatus = '단일권 이용'; }
      let yyyy = baseDateForUpdate.getFullYear(), mm = String(baseDateForUpdate.getMonth() + 1).padStart(2, '0'), dd = String(baseDateForUpdate.getDate()).padStart(2, '0'); const newDateStr = `${yyyy}-${mm}-${dd}`;
      const m = globalMembers.find(x => String(x.id) === String(id)); m.end_date = newDateStr; m.status = targetStatus; window.searchMembers(); await supabaseClient.from('members').update({ status: targetStatus, end_date: newDateStr }).eq('id', id); await supabaseClient.from('member_history').insert([{ member_name: name, member_phone: phone, action_detail: optText, amount: amountStr }]); showToast("업데이트 되었습니다.");
  });
}
window.updateMemberEndDate = async function(id, dateStr) { const { error } = await supabaseClient.from('members').update({ end_date: dateStr }).eq('id', id); if(error) showToast("날짜 변경에 실패했습니다."); else showToast("종료일이 업데이트 되었습니다."); }
window.deleteHistory = async function(id, phone, name, action_detail) { window.openCustomConfirm("내역 삭제", null, `해당 내역을 완전히 삭제하시겠습니까?<br><span style='font-size:12px;color:var(--text-secondary);'>(삭제 시, 늘어난 종료일이 자동으로 계산되어 복구됩니다.)</span>`, async () => { await supabaseClient.from('member_history').delete().eq('id', id); const m = globalMembers.find(x => String(x.phone) === String(phone)); if (m && m.end_date) { let d = new Date(m.end_date); let isChanged = false; if (action_detail.includes('1개월 연장') || action_detail.includes('보너스 1개월')) { d.setMonth(d.getMonth() - 1); isChanged = true; } else if (action_detail.includes('3개월 연장')) { d.setMonth(d.getMonth() - 3); isChanged = true; } else if (action_detail.includes('6개월 연장')) { d.setMonth(d.getMonth() - 6); isChanged = true; } else if (action_detail.includes('당일권 추가')) { d.setDate(d.getDate() - 1); isChanged = true; } if (isChanged) { let newEndDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; m.end_date = newEndDate; await supabaseClient.from('members').update({ end_date: newEndDate }).eq('phone', phone); } } showToast("내역이 삭제되고 종료일이 복구되었습니다."); window.searchMembers(); window.openHistoryModal(phone, name); }); };
window.openHistoryModal = async function(phone, name) { if(!$("historyModalTitle")) return; $("historyModalTitle").innerText = `${name} 님의 내역`; const modal = $("historyModal"); modal.classList.add('show'); const body = $("historyModalBody"); body.innerHTML = '<div class="empty-state">내역을 불러오는 중입니다.</div>'; const { data, error } = await supabaseClient.from('member_history').select('*').eq('member_phone', phone).order('created_at', { ascending: false }); if (error || !data || data.length === 0) { body.innerHTML = '<div class="empty-state" style="color:var(--text-tertiary);">결제/연장 내역이 없습니다.</div>'; return; } body.innerHTML = '<div style="display:flex;flex-direction:column;gap:12px;padding:24px 0;">' + data.map(item => `<div style="background:#f9fafb;padding:16px;border-radius:12px;border:1px solid var(--border-strong);display:flex;justify-content:space-between;align-items:center;"><div><div style="font-weight:700;margin-bottom:4px;color:var(--text-display);">${item.action_detail}</div><div style="font-size:13px;color:var(--text-secondary);">${formatDt(item.created_at)}</div></div><div style="display:flex; align-items:center; gap:12px;"><div style="font-weight:700;color:var(--primary);">${item.amount||''}</div><button class="btn-outline btn-sm" style="color:var(--error);border-color:var(--border-strong);" onclick="event.stopPropagation(); window.deleteHistory('${item.id}', '${phone}', '${name}', '${item.action_detail}')">삭제</button></div></div>`).join('') + '</div>'; }
window.closeHistoryModal = function() { if($("historyModal")) $("historyModal").classList.remove('show'); }

window.downloadExcel = function(type) {
  if (type === 'applications' && isInsightView) { 
    const d = window.currentInsightData || {}; 
    let csv = "\uFEFF카테고리,세부 항목,수치,비고\n"; 
    csv += `전체 요약,총 신청 건수,${d.total||0}건,-\n`; 
    csv += `전체 요약,최종 가입 완료,${d.joined||0}건,(전환율 ${d.total > 0 ? Math.round(d.joined/d.total*100) : 0}%)\n`; 
    csv += `유입 채널,인스타그램 총 유입,${d.instaCount||0}건,-\n`; 
    csv += `인스타 상세,팔로워 유입,${d.instaFollow||0}건,-\n`; 
    csv += `인스타 상세,비팔로워 유입,${d.instaNonFollow||0}건,-\n`; 
    csv += `유입 채널,모집 광고/스폰서드 유입,${d.adCount||0}건,-\n`; 
    csv += `광고 리드타임,단기 유입 (1개월 이내),${d.leadTime1M||0}건,-\n`; 
    csv += `광고 리드타임,장기 유입 (3개월 이상),${d.leadTime3M||0}건,-\n`; 
    
    if (d.channelMap) {
        csv += `\n상세 채널별 트래킹,상세 내역,건수,비고\n`;
        for (let ch in d.channelMap) {
            let chData = d.channelMap[ch];
            csv += `[${ch}],(총 ${chData.total}건),-,-\n`;
            for (let det in chData.details) {
                let detSafe = String(det).replace(/"/g, '""');
                csv += `ㄴ,${detSafe},${chData.details[det]}건,-\n`;
            }
        }
    }
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' }); 
    const link = document.createElement('a'); 
    link.href = URL.createObjectURL(blob); 
    link.download = `위커피_인사이트_마케팅_보고서_${new Date().toISOString().slice(0,10)}.csv`; 
    link.click(); 
    return; 
  }
  
  let data = []; let headers = []; let filename = "";
  if(type === 'applications') { data = globalApps; filename = "가입신청"; headers = ['신청일', '기수', '성함', '연락처', '관심분야', '유입경로', '진행상황', '가입여부', '상담일시', '담당자']; } else if(type === 'members') { globalMembers.forEach(m => m.batch = m.batch || '미정'); data = globalMembers; filename = "멤버리스트"; headers = ['등록일', '상태', '기수', '성함', '연락처', '활동종료일']; } else if(type === 'reservations') { data = gRes; filename = "예약현황"; headers = ['접수일', '기수', '성함', '연락처', '예약날짜', '예약시간', '센터', '장비', '상태', '취소사유']; } else if(type === 'trainings') { data = gTrn; filename = "수업훈련"; headers = ['신청일', '기수', '성함', '연락처', '콘텐츠', '상태', '취소사유']; } else if(type === 'orders') { data = gOrd; filename = "생두주문"; headers = ['주문일', '주문번호', '기수', '성함', '연락처', '생두사', '상품명', '수량', '총금액', '상태']; }
  if(data.length === 0) { showToast('다운로드할 데이터가 없습니다.'); return; }
  let csvContent = '\uFEFF' + headers.join(',') + '\n';
  data.forEach(d => { let row = []; if(type === 'applications') row = [formatDt(d.created_at), d.desired_batch, window.escapeHtml(d.name), window.escapeHtml(d.phone), d.interest_area, d.acquisition_channel, d.status, d.join_status, d.call_time, d.counselor_name]; else if(type === 'members') row = [formatDt(d.created_at), d.status, d.batch, window.escapeHtml(d.name), window.escapeHtml(d.phone), d.end_date]; else if(type === 'reservations') row = [formatDt(d.created_at), d.batch, window.escapeHtml(d.name), window.escapeHtml(d.phone), d.res_date, d.res_time, d.center, d.space_equip, d.status, d.cancel_reason]; else if(type === 'trainings') row = [formatDt(d.created_at), d.batch, window.escapeHtml(d.name), window.escapeHtml(d.phone), window.escapeHtml(d.content), d.status, d.cancel_reason]; else if(type === 'orders') row = [formatDt(d.created_at), d.id, d.batch, window.escapeHtml(d.name), window.escapeHtml(d.phone), d.vendor, d.item_name, d.quantity, d.total_price, d.status];
    csvContent += row.map(item => { let text = String(item || ''); text = text.replace(/"/g, '""'); text = text.replace(/\n/g, ' '); return `"${text}"`; }).join(',') + '\n'; });
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' }); const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `${filename}_${new Date().toISOString().slice(0,10)}.csv`; document.body.appendChild(link); link.click(); document.body.removeChild(link);
}

window.saveAdminNote = async function() {
    if(!$("crmAppId")) return;
    const id = $("crmAppId").value;
    const app = globalApps.find(a => String(a.id) === String(id));
    if(!app) { showToast("신청 정보를 찾을 수 없습니다."); return; }
    
    const title = $("crmNoteTitle") ? $("crmNoteTitle").value.trim() : "";
    const content = $("crmNoteInput") ? $("crmNoteInput").value.trim() : "";
    
    if(!title && !content) return showToast("내용을 입력해주세요.");

    const newNote = `${title}:::${content}`;
    let updatedMemo = app.admin_memo ? app.admin_memo + '|||' + newNote : newNote;

    const originalMemo = app.admin_memo;
    app.admin_memo = updatedMemo;
    window.renderCrmInner(id, isCrmReadOnly);

    const { error } = await supabaseClient.from('applications').update({ admin_memo: updatedMemo }).eq('id', id);
    if(error) {
        app.admin_memo = originalMemo; 
        window.renderCrmInner(id, isCrmReadOnly);
        showToast("기록 추가에 실패했습니다.");
        console.error(error);
    } else {
        showToast("상담 기록이 추가되었습니다.");
    }
}

window.openCrmModalFromPhone = async function(phone) {
    if(!phone || phone === '-') return showToast("연락처 정보가 없어 설문 내역을 찾을 수 없습니다.");
    
    const normalizePhone = p => String(p).replace(/\D/g, '');
    const targetPhone = normalizePhone(phone);
    
    let app = globalApps.find(a => normalizePhone(a.phone) === targetPhone);
    
    if (app) {
        window.openCrmModal(app.id, true);
    } else {
        showToast("내역을 불러오는 중입니다...");
        const { data, error } = await supabaseClient.from('applications').select('*');
        if (!error && data) {
            let matched = data.find(a => normalizePhone(a.phone) === targetPhone);
            if (matched) {
                if(!globalApps.find(a => String(a.id) === String(matched.id))) globalApps.push(matched);
                window.openCrmModal(matched.id, true);
                return;
            }
        }
        showToast("해당 멤버의 가입 신청/설문 내역을 찾을 수 없습니다.");
    }
}

window.showOrderSummary = function() {
    let pendingOrders = gOrd.filter(o => o.status !== '주문 취소' && o.status !== '센터 도착');
    
    if (pendingOrders.length === 0) {
        $("summaryModalBody").innerHTML = '<div class="empty-state">현재 요약할 미처리 발주 건이 없습니다.</div>';
    } else {
        let summary = {};
        pendingOrders.forEach(o => {
            let key = `${o.vendor}:::${o.item_name}`;
            if(!summary[key]) summary[key] = { vendor: o.vendor, item: o.item_name, qty: 0, total: 0 };
            
            summary[key].qty += parseInt(o.quantity) || 0;
            let price = parseInt(String(o.total_price || '0').replace(/[^0-9]/g, '')) || 0;
            summary[key].total += price;
        });
        
        let html = `<table style="width:100%; border-collapse:collapse; text-align:left; font-size:13px;">
            <thead><tr style="border-bottom:1px solid var(--border-strong);"><th style="padding-bottom:8px;">생두사</th><th style="padding-bottom:8px;">상품명</th><th style="text-align:center; padding-bottom:8px;">수량</th><th style="text-align:right; padding-bottom:8px;">총 금액</th></tr></thead>
            <tbody>`;
        let totalQty = 0;
        let grandTotal = 0;
        
        Object.values(summary).forEach(s => {
            html += `<tr style="border-bottom:1px solid var(--border-strong);">
                <td style="padding:12px 8px; color:var(--text-secondary);">${window.escapeHtml(s.vendor)}</td>
                <td style="padding:12px 8px; font-weight:600; color:var(--text-display);">${window.escapeHtml(s.item)}</td>
                <td style="padding:12px 8px; text-align:center; font-weight:700;">${s.qty}</td>
                <td style="padding:12px 8px; text-align:right;">${comma(s.total)}원</td>
            </tr>`;
            totalQty += s.qty;
            grandTotal += s.total;
        });
        
        html += `<tr style="background:#f9fafb;"><td colspan="2" style="padding:12px 8px; font-weight:800; text-align:right;">총 합계</td><td style="padding:12px 8px; text-align:center; font-weight:800; color:var(--primary);">${totalQty}</td><td style="padding:12px 8px; text-align:right; font-weight:800; color:var(--primary);">${comma(grandTotal)}원</td></tr>`;
        html += `</tbody></table>`;
        
        $("summaryModalBody").innerHTML = html;
        window.currentSummaryData = Object.values(summary); 
    }
    
    $("summaryModal").classList.add('show');
};

window.closeSummaryModal = function() {
    if($("summaryModal")) $("summaryModal").classList.remove('show');
};

window.downloadSummaryExcel = function() {
    if(!window.currentSummaryData || window.currentSummaryData.length === 0) {
        showToast('다운로드할 데이터가 없습니다.');
        return;
    }
    let csv = "\uFEFF생두사,상품명,수량,총 금액\n";
    window.currentSummaryData.forEach(s => {
        csv += `"${s.vendor}","${String(s.item).replace(/"/g, '""')}",${s.qty},${s.total}\n`;
    });
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' }); 
    const link = document.createElement('a'); 
    link.href = URL.createObjectURL(blob); 
    link.download = `생두_발주요약_${new Date().toISOString().slice(0,10)}.csv`; 
    link.click(); 
};
