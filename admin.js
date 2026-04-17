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

window.toggleAll = function(checkbox, targetClass) {
    const checkboxes = document.querySelectorAll('.' + targetClass);
    checkboxes.forEach(cb => {
        if (!cb.disabled) cb.checked = checkbox.checked;
    });
};

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

function isOrderExpired(order, now, isThuOrder) {
    let oDate = new Date(order.created_at);
    let status = order.status || '주문 접수';
    
    if (status === '주문 취소' || status === '품절') {
        return (now.getTime() - oDate.getTime()) > 48 * 60 * 60 * 1000;
    }
    if (status === '센터 도착') {
        return (now.getTime() - oDate.getTime()) > 7 * 24 * 60 * 60 * 1000;
    }
    if (['입금 대기', '입금 확인 중', '입금 확인'].includes(status)) {
        return false;
    }
    if (status === '주문 접수' || status === '대기') {
        let deadline = new Date(oDate);
        deadline.setHours(10, 10, 0, 0);
        let targetDay = isThuOrder ? 4 : 1; 
        let daysToAdd = (targetDay - deadline.getDay() + 7) % 7;
        
        if (daysToAdd === 0 && (oDate.getHours() > 10 || (oDate.getHours() === 10 && oDate.getMinutes() >= 10))) {
            daysToAdd = 7;
        }
        deadline.setDate(deadline.getDate() + daysToAdd);
        
        return now.getTime() > deadline.getTime();
    }
    return false;
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
            if(cInfo.length >= 5) {
                tSet.add(`[${cInfo[2]}] ${cInfo[4]}`); 
            } else {
                tSet.add(t.content);
            }
        });
        let tHtml = `<option value="전체">전체 콘텐츠</option>` + Array.from(tSet).sort().map(c=>`<option value="${window.escapeHtml(c)}">${window.escapeHtml(c)}</option>`).join("");
        if($("trnContentFilter") && $("trnContentFilter").innerHTML.length < 100) $("trnContentFilter").innerHTML = tHtml;

    } catch(err) {}

  } catch(e) { console.error("fetchCenterData Error:", e); }

  try { window.renderCenterData(); } catch(e){ console.error(e); }
  try { window.renderDashboard(); } catch(e){ console.error(e); }
  try { window.renderNoticeData(); } catch(e){ console.error(e); }
}

window.renderCenterData = function() {
  const now = new Date(); 
  const oneMonthAgo = new Date(); oneMonthAgo.setDate(now.getDate() - 30);
  let todayForBlk = new Date(); todayForBlk.setHours(0,0,0,0);

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
          let matchContent = true;
          let cInfo = String(t.content||'').split(' || ');
          if(sTrn !== '전체') {
              let targetStr = cInfo.length >= 5 ? `[${cInfo[2]}] ${cInfo[4]}` : String(t.content||'');
              if(targetStr !== sTrn) matchContent = false;
          }
          if (cInfo.length >= 5) {
              let tDateObj = new Date(cInfo[0].trim());
              tDateObj.setHours(0,0,0,0);
              if (tDateObj < todayForBlk) return false; 
          } else {
              let tDate = new Date(t.created_at);
              if (tDate < oneMonthAgo) return false;
          }
          return (currentGlobalCenter === '전체' || String(t.content||"").includes(currentGlobalCenter)) && (`${t.name} ${t.phone} ${t.content}`.toLowerCase().includes(qTrn)) && matchContent; 
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
      if (!isOrdFilter) { 
          monOrders = monOrders.filter(o => !isOrderExpired(o, now, false)); 
          thuOrders = thuOrders.filter(o => !isOrderExpired(o, now, true)); 
      }
      if($("ordTableBodyMon")) renderOrderTableHTML(monOrders, 'ordTableBodyMon', 'chk-ord-mon'); 
      if($("ordTableBodyThu")) renderOrderTableHTML(thuOrders, 'ordTableBodyThu', 'chk-ord-thu');
  } catch(e) { console.error(e); }

  try {
      let fBlk = gBlk.filter(b => {
          let bDate = new Date(b.block_date);
          bDate.setHours(0,0,0,0);
          let matchCenter = (currentGlobalCenter === '전체' || b.center === currentGlobalCenter);
          return matchCenter && (bDate >= todayForBlk); 
      }); 
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
      }).join("") : `<tr><td colspan="7" class="empty-state">진행 예정인 스케줄이 없습니다.</td></tr>`;
  } catch(e) { console.error(e); }
}

window.renderDashboard = async function() {
    const now = new Date();
    let targetDate = new Date(now.getFullYear(), now.getMonth() + currentDashMonthOffset, 1);
    const yyyy = targetDate.getFullYear();
    const mm = targetDate.getMonth();
    const daysInMonth = new Date(yyyy, mm + 1, 0).getDate();
    const currDay = now.getDay();
    if (currentDashView === 'month' && $("dashMonthTitle")) { $("dashMonthTitle").innerText = `${yyyy}년 ${mm + 1}월`; }
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
            if (currentGlobalCenter !== '전체') { let keyword = currentGlobalCenter.split(' ')[0]; if (!String(g.text).includes(keyword)) include = false; }
            if (spaceFilter !== '전체') { let spaceKeyword = spaceFilter.replace('룸', '').replace('존', ''); if (!String(g.text).includes(spaceKeyword)) include = false; }
            if(include && calEvts[g.date]) { calEvts[g.date].push({ time: g.time || '종일', start: g.start || '00:00', text: g.text, type: 'google', tooltip: g.text }); }
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
                calEvts[r.res_date].push({ time: st, start: st, text: `[${spc}] ${r.name}`, type: 'res', tooltip: `${r.res_time} | ${r.space_equip} | ${r.name}` });
            }
        });
        gBlk.forEach(b => {
            if (currentGlobalCenter !== '전체' && b.center !== currentGlobalCenter) return;
            if (spaceFilter !== '전체' && !String(b.space_equip||'').includes(spaceFilter)) return;
            if (calEvts[b.block_date]) {
                calEvts[b.block_date].push({ time: b.start_time, start: b.start_time, text: `[${b.category}] ${b.reason}`, type: 'blk', tooltip: `${b.start_time}~${b.end_time} | ${b.space_equip||'전체'} | ${b.reason}` });
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
                    calEvts[tDate].push({ time: st, start: st, text: `[수강] ${t.name}`, type: 'trn', tooltip: `${cInfo[2]} | ${tSpc} | ${t.name} (${cInfo[1]})` });
                }
            }
        });
    } catch(e) { console.error(e); }
    try {
        let mHtml = `<div class="dash-cal-grid"><div class="dash-cal-header" style="color:var(--error);">일</div><div class="dash-cal-header">월</div><div class="dash-cal-header">화</div><div class="dash-cal-header">수</div><div class="dash-cal-header">목</div><div class="dash-cal-header">금</div><div class="dash-cal-header" style="color:var(--blue);">토</div>`;
        let iterDates = Object.keys(calEvts).sort();
        if (currentDashView === 'month') { let firstDay = new Date(yyyy, mm, 1).getDay(); for(let i=0; i<firstDay; i++) mHtml += `<div class="dash-cal-cell empty"></div>`; }
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
    let isRollback = (['입금 확인 중', '입금 확인', '센터 도착'].includes(oldStatus)) && (['입금 대기', '주문 접수'].includes(newValue));
    if (isRollback) {
        confirmMsg = `<div style="background:#fff0f0; border:1px solid #ffcdd2; border-radius:8px; padding:16px; margin-bottom:12px; text-align:left;"><div style="color:var(--error); font-weight:800; font-size:14px; margin-bottom:8px; display:flex; align-items:center; gap:6px;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>롤백 경고</div><div style="font-size:14px; color:var(--text-display); line-height:1.5; word-break:keep-all;">현재 <span style="font-weight:700; color:var(--text-secondary);">[${oldStatus}]</span> 상태입니다.<br>정말 <strong style="color:var(--error); font-size:16px;">[${newValue}]</strong> (으)로 되돌리시겠습니까?</div></div>`;
    }
    window.openCustomConfirm("주문 상태 변경", null, confirmMsg, async () => {
        const { error } = await supabaseClient.from('orders').update({ status: newValue }).eq('id', id);
        if (error) showToast("상태 변경에 실패했습니다.");
        else { showToast(`[${newValue}] 상태로 변경되었습니다.`); window.fetchCenterData(); }
    }, "변경하기");
    selectEl.value = oldStatus;
};

function renderOrderTableHTML(fOrd, tableId, chkClass) { 
  try {
      if(!$(tableId)) return;
      $(tableId).innerHTML = fOrd.length ? fOrd.map(o=>{ 
        let badgeClass = (o.status==='주문 취소' || o.status==='품절')?'st-ghosted':o.status==='센터 도착'?'st-completed':o.status==='입금 확인'?'st-confirmed':(o.status==='입금 대기'||o.status==='입금 확인 중')?'st-arranging':'st-wait'; 
        let cNm = o.item_name || ""; let m = String(cNm).match(/(.+) \[(?:희망:\s*)?(\d+)\/(\d+)\((월|화|수|목|금|토|일)\).*?\]/); if(m) cNm = m[1].trim(); else { let oM = String(cNm).match(/(.+) \[(.*?)\]/); if(oM) cNm = oM[1].trim(); } 
        let centerBadge = `<span style="background:var(--border); color:var(--text-display); padding:6px 10px; border-radius:8px; font-size:13px; font-weight:700; white-space:nowrap;">${o.center||'미지정'}</span>`; 
        let vendorUrl = o.link ? o.link : (o.url ? o.url : '#'); let vendorHtml = `<a href="${vendorUrl}" target="_blank" style="color:var(--text-secondary); font-weight:700; font-size:13px; text-decoration:none; cursor:pointer;" onmouseover="this.style.textDecoration='underline'" onmouseout="this.style.textDecoration='none'">${o.vendor}</a>`; 
        let copyableHtml = `<div class="copyable-wrap" onclick="window.copyTxt('${String(cNm).replace(/'/g, "\\'")}')" data-full-text="${String(cNm).replace(/"/g, '&quot;')}" title="클릭하여 복사"><div style="display:flex; align-items:center; width:100%; min-width: 0;"><span class="copyable-text">${cNm}</span><span class="copyable-hint">복사</span></div></div>`; 
        let cTxtPreview = o.center ? `<span style="background:var(--border); color:var(--text-secondary); padding:2px 6px; border-radius:4px; font-size:11px; font-weight:600; margin-right:6px; vertical-align:middle; white-space:nowrap;">${o.center}</span>` : ''; 
        let mPreview = `<td class="m-preview has-checkbox" onclick="this.closest('tr').classList.toggle('expanded')"><div class="m-prev-top"><span class="m-prev-date">${formatDtWithDow(o.created_at)}</span><span class="status-badge ${badgeClass}">${o.status}</span></div><div class="m-prev-title">[${o.batch||'-'}] <span style="font-weight:800;">${o.name}</span> <span style="font-size:13px; font-weight:500; color:var(--text-secondary); margin-left:4px;">(${o.quantity})</span></div><div class="m-prev-desc" style="color:var(--text-display); font-weight:500; line-height:1.5;">${cTxtPreview}<span style="font-size:12px; color:var(--text-secondary); margin-right:4px;">${o.vendor}</span>${cNm}</div><span class="m-toggle-hint">상세 정보 보기 ▼</span></td>`; 
        return `<tr style="border-bottom: 1px solid var(--border-strong);">${mPreview}<td data-label="선택" class="tc" style="text-align:center;"><input type="checkbox" class="chk-ord ${chkClass}" value="${o.id}"></td><td data-label="주문 날짜" style="white-space:nowrap; text-align:left; color:var(--text-display); font-size:14px; font-weight:500;">${formatDt(o.created_at)}</td><td data-label="수령 센터" class="tc" style="text-align:center;">${centerBadge}</td><td data-label="기수" class="tc" style="color:var(--text-secondary); font-size:14px; font-weight:600; text-align:center;">${o.batch||'-'}</td><td data-label="성함" style="text-align:left;"><strong style="font-weight:800; color:var(--text-display); font-size:15px; white-space:nowrap;">${o.name}</strong></td><td data-label="연락처" style="white-space:nowrap; text-align:left; color:var(--text-secondary); font-size:14px;">${o.phone}</td><td data-label="생두사 / 상품명" style="text-align:left; width: 100%; max-width: 320px; overflow:visible;"><div style="display:flex; align-items:center; width:100%; min-width: 0; gap:12px;"><div style="width: 80px; flex-shrink: 0; text-align: left;">${vendorHtml}</div><span style="color:var(--border-strong); font-size:12px; flex-shrink:0;">|</span>${copyableHtml}</div></td><td data-label="수량" class="tc" style="font-size:15px; font-weight:700; color:var(--text-display); text-align:center;">${o.quantity}</td><td data-label="총 금액 입력" style="text-align:right;"><input type="text" value="${o.total_price||''}" placeholder="0원" style="width:100px; padding:10px 12px; text-align:right; font-size:14px; font-weight:600; background:#fff; border:1px solid var(--border-strong); border-radius:8px; color:var(--text-display); outline:none; transition:0.2s;" onfocus="this.style.borderColor='var(--primary)';" onblur="this.style.borderColor='var(--border-strong)'; window.handlePriceInput('${o.id}', this.value, '${o.status}', this)"></td><td data-label="상태 관리" class="tc" style="text-align:center;"><div class="action-wrap" style="justify-content:center; display:flex;"><select class="status-select ${badgeClass}" onchange="window.handleOrderStatusChange('${o.id}', this.value, this)" style="text-align-last:center;"><option value="주문 접수" ${o.status==='주문 접수'?'selected':''}>주문 접수</option><option value="입금 대기" ${o.status==='입금 대기'?'selected':''}>입금 대기</option><option value="입금 확인 중" ${o.status==='입금 확인 중'?'selected':''}>입금 확인 중</option><option value="입금 확인" ${o.status==='입금 확인'?'selected':''}>입금 확인</option><option value="센터 도착" ${o.status==='센터 도착'?'selected':''}>센터 도착</option><option value="주문 취소" ${o.status==='주문 취소'?'selected':''}>주문 취소</option><option value="품절" ${o.status==='품절'?'selected':''}>품절</option></select></div></td></tr>` 
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
  if(target) { target.classList.add('active'); try { target.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' }); } catch(e) {} } 
  let evts = window.centerCalEvts[selDate] || []; 
  evts.sort((a,b) => String(a.start||'').localeCompare(String(b.start||''))); 
  let html = ''; 
  if(evts.length === 0) { html = `<div class="empty-state" style="padding:40px 0;">예정된 일정이 없습니다.</div>`; } 
  else { evts.forEach(e => { let badgeStyle = e.type==='google' ? 'color:#495057;' : 'color:var(--primary);'; html += `<div class="m-cal-card"><div class="m-cal-card-time" style="${badgeStyle}">${e.start || e.time || '종일'}</div><div class="m-cal-card-title">${window.escapeHtml(e.text)||''}</div><div class="m-cal-card-desc">${String(e.tooltip||'').split('|')[0]}</div></div>`; }); } 
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
        if (m) { appY = parseInt(m[1]); appM = parseInt(m[2]); appD = parseInt(m[3]); } else { let m2 = callTimeStr.match(/(\d+)월\s*(\d+)일/); if(m2) { appY = now.getFullYear(); appM = parseInt(m2[1]); appD = parseInt(m2[2]); } }
        if(appY && appM && appD) {
            let ds = `${appY}-${String(appM).padStart(2,'0')}-${String(appD).padStart(2,'0')}`; 
            if (calEvts[ds]) { const tm = callTimeStr.match(/(오전|오후)\s+(\d+):(\d+)/); let timeStr = tm ? `${tm[1]} ${tm[2]}:${tm[3]}` : (callTimeStr.includes(')') ? callTimeStr.split(')')[1].trim() : callTimeStr); calEvts[ds].push({ time: timeStr, text: `[${app.desired_batch||'-'}] ${app.name}`, tooltip: `${timeStr} | 담당: ${app.counselor_name||'미정'}`}); } 
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
    if(target) { target.classList.add('active'); try { target.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' }); } catch(e) {} } 
    let evts = window.appCalEvts[selDate] || []; 
    evts.sort((a,b) => String(a.time||'').localeCompare(String(b.time||''))); 
    let html = ''; 
    if(evts.length === 0) { html = `<div class="empty-state" style="padding:40px 0;">예정된 상담 일정이 없습니다.</div>`; } 
    else { evts.forEach(e => { let rawTooltip = String(e.tooltip||''); let descParts = rawTooltip.split('|'); let descText = descParts.length > 1 ? descParts.slice(1).join('|').trim() : rawTooltip; html += `<div class="m-cal-card" style="align-items:flex-start; text-align:left; width:100%; box-sizing:border-box;"><div style="display:flex; align-items:center; justify-content:space-between; width:100%; margin-bottom: 4px;"><div class="m-cal-card-title" style="margin:0;">${window.escapeHtml(e.text)||''}</div><div class="m-cal-card-time" style="color:var(--primary); font-weight:800; font-size:13px;">${e.time || '종일'}</div></div><div class="m-cal-card-desc" style="font-size:13px; color:var(--text-secondary); margin-top:0; width:100%;">${window.escapeHtml(descText)}</div></div>`; }); } 
    let listWrap = $("m-cal-list-app"); 
    if(listWrap) listWrap.innerHTML = html; 
};

window.toggleInsight = function() { 
    isInsightView = !isInsightView; 
    let insightArea = $("app-insight-area");
    if(insightArea) { insightArea.style.paddingTop = "32px"; insightArea.style.display = isInsightView ? "block" : "none"; }
    if($("app-table-area")) $("app-table-area").style.display = isInsightView ? "none" : "block"; 
    if($("insightToggleBtn")) $("insightToggleBtn").innerText = isInsightView ? "리스트 보기" : "인사이트 보기"; 
    if(isInsightView) window.applyFilterApp(); 
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
      if ($("crmModal") && $("crmModal").classList.contains('show') && $("crmAppId").value) { window.renderCrmInner($("crmAppId").value, isCrmReadOnly); } 
  } catch(e) { console.error(e); }
}
window.applyFilterApp = function() { try { const selected = $("batchFilterApp").value; const filtered = selected === 'all' ? globalApps : globalApps.filter(d => d.desired_batch === selected); if (isInsightView) window.renderStatistics(filtered); else { window.renderAppTable(filtered); window.renderAppDailyBanner(filtered); window.renderAppDashboard(); } } catch(e) { console.error(e); } }

const statusClassMap = { '대기': 'st-wait', '상담 일정 조율 중': 'st-arranging', '상담 일정 확정': 'st-confirmed', '상담 완료': 'st-completed', '연락 두절': 'st-ghosted', '설문 완료': 'st-confirmed', '품절': 'st-ghosted' };
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
    if($("crmTimeBadge")) { $("crmTimeBadge").innerHTML = `상담 예정일: <span style="color:var(--text-display); font-weight:700;">${timeStr}</span>`; }
    const job = app.survey_job; const edu = app.survey_edu; const goal = app.survey_goal; const brand = app.survey_brand;
    if($("crmSurveyResult")) {
        if (job || edu) { $("crmSurveyResult").innerHTML = `<div class="crm-box"><div class="crm-label">1. 직업 상태</div><div class="crm-answer">${window.escapeHtml(job) || '<span class="crm-empty">미작성</span>'}</div></div><div class="crm-box"><div class="crm-label">2. 과거 교육 피드백</div><div class="crm-answer">${window.escapeHtml(edu) || '<span class="crm-empty">미작성</span>'}</div></div><div class="crm-box"><div class="crm-label">3. 달성 목표 (니즈)</div><div class="crm-answer">${window.escapeHtml(goal) || '<span class="crm-empty">미작성</span>'}</div></div><div class="crm-box"><div class="crm-label">4. 선호 브랜드</div><div class="crm-answer">${window.escapeHtml(brand) || '<span class="crm-empty">미작성</span>'}</div></div>`; }
        else { $("crmSurveyResult").innerHTML = `<div style="text-align:center; padding: 40px 20px; background:#fff; border-radius:12px; border:1px dashed var(--border-strong);"><div style="font-size:16px; font-weight:700; color:var(--text-secondary); margin-bottom:16px;">아직 사전 설문을 작성하지 않은 고객입니다.</div><button class="btn-outline" style="color:var(--primary); border-color:var(--primary); padding:12px 24px; font-size:15px;" onclick="window.copyTxt('https://www.wecoffee.co.kr/survey?uid=${app.id}&name=${encodeURIComponent(app.name || '')}', '사전 설문 링크가 복사되었습니다.')">고객 전용 설문 링크 복사하기</button></div>`; }
    }
    let notesHtml = '';
    if (app.admin_memo) {
        let notes = app.admin_memo.split('|||'); 
        notes.forEach(note => {
            let parts = note.split(':::');
            if(parts.length === 2) { notesHtml += `<div class="crm-box"><div class="crm-label">${window.escapeHtml(parts[0])}</div><div class="crm-answer">${window.escapeHtml(parts[1]).replace(/\n/g, '<br>')}</div></div>`; }
            else if (note.trim()) { notesHtml += `<div class="crm-box"><div class="crm-answer">${window.escapeHtml(note.trim()).replace(/\n/g, '<br>')}</div></div>`; }
        });
    }
    if(!notesHtml) notesHtml = `<div style="font-size:13px; color:var(--text-tertiary); text-align:center; padding:10px;">등록된 상담 기록이 없습니다.</div>`;
    if($("crmAdminNotes")) $("crmAdminNotes").innerHTML = notesHtml;
    if($("crmNoteTitle")) $("crmNoteTitle").value = '';
    if($("crmNoteInput")) $("crmNoteInput").value = '';
    let initialStatus = app.join_status || (app.status === '상담 완료' ? '상담 완료' : ''); if(!initialStatus || initialStatus === '대기') initialStatus = '상담 완료'; 
    if($("crmStatusSelect")) $("crmStatusSelect").value = initialStatus;
    if($("crmNoteInputWrap")) $("crmNoteInputWrap").style.display = isReadOnly ? 'none' : 'block';
    if($("crmStatusActionArea")) $("crmStatusActionArea").style.display = isReadOnly ? 'none' : 'flex';
}

window.openCrmModal = function(id, readOnly = false) { isCrmReadOnly = readOnly; if($("crmAppId")) $("crmAppId").value = id; window.renderCrmInner(id, isCrmReadOnly); if($("crmModal")) $("crmModal").classList.add('show'); }
window.saveCrmStatus = function() { const id = $("crmAppId").value; const selected = $("crmStatusSelect").value; if(!id || !selected) return; if(selected === '상담 완료' || selected === '연락 두절') { window.updateAppStatus(id, 'status', selected); } else { window.updateAppStatus(id, 'join_status', selected); window.updateAppStatus(id, 'status', '상담 완료'); } window.closeCrmModal(); }
window.handleStatusChange = function(id, newStatus, callTime, counselorName) { if (newStatus === '상담 일정 확정') { window.openScheduleModal(id, callTime, counselorName); } else { window.updateAppStatus(id, 'status', newStatus); } };

window.openScheduleModal = function(id, time, name) { 
    currentScheduleAppId = id; 
    if($("schedInputDate")) { $("schedInputDate").value = ""; $("schedInputDate").dataset.raw = ""; }
    if($("schedInputTime")) { $("schedInputTime").value = ""; $("schedInputTime").dataset.raw = ""; }
    if($("schedInputName")) { $("schedInputName").value = (name && name !== 'null' && name !== 'undefined') ? name : ''; }
    if (time && time !== '미정' && time !== 'null') {
        let mDate = time.match(/(\d+)월\s*(\d+)일/);
        if (mDate && $("schedInputDate")) { let dRaw = String(mDate[1]).padStart(2,'0') + String(mDate[2]).padStart(2,'0'); $("schedInputDate").dataset.raw = dRaw; $("schedInputDate").value = window.formatCounselDateDisplay(dRaw); }
        let mTime = time.match(/(오전|오후)\s*(\d+):(\d+)/);
        if (mTime && $("schedInputTime")) { let hh = parseInt(mTime[2], 10); if (mTime[1] === '오후' && hh < 12) hh += 12; if (mTime[1] === '오전' && hh === 12) hh = 0; let tRaw = String(hh).padStart(2,'0') + String(mTime[3]).padStart(2, '0'); $("schedInputTime").dataset.raw = tRaw; $("schedInputTime").value = window.formatCounselTimeDisplay(tRaw); }
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
    let dt = String(dVal).replace(/\D/g, '').slice(-4);
    const timeRe = String(tVal).replace(/\D/g, '').slice(-4);
    const now = new Date(); let currentYear = now.getFullYear();
    const mm = parseInt(dt.slice(0,2), 10); const dd = parseInt(dt.slice(2,4), 10);
    const hh = parseInt(timeRe.slice(0,2), 10); const min = parseInt(timeRe.slice(2,4), 10);
    if (mm < now.getMonth() + 1 - 2) currentYear += 1;
    const parseDate = new Date(currentYear, mm - 1, dd, hh, min);
    if(isNaN(parseDate.getTime())) { showToast("유효하지 않은 날짜입니다."); return; }
    const dow = ['일','월','화','수','목','금','토'][parseDate.getDay()];
    let ampm = hh >= 12 ? '오후' : '오전'; let hh12 = hh % 12 || 12;
    const formattedCallTime = `${currentYear}년 ${mm}월 ${dd}일(${dow}) ${ampm} ${hh12}:${String(min).padStart(2,'0')}`;
    const { error } = await supabaseClient.from('applications').update({ status: '상담 일정 확정', call_time: formattedCallTime, counselor_name: name }).eq('id', currentScheduleAppId);
    if (error) showToast("저장 실패"); 
    else { 
        showToast("상담 일정이 확정되었습니다."); 
        const app = globalApps.find(a => String(a.id) === String(currentScheduleAppId));
        const surveyLink = `https://www.wecoffee.co.kr/survey?uid=${currentScheduleAppId}&name=${encodeURIComponent(app.name || '')}`;
        window.closeScheduleModal(); window.fetchApplications(); window.openCustomConfirm("일정 확정 완료", null, `고객에게 발송할 <b>사전 설문 링크</b>를 복사하시겠습니까?`, surveyLink, "복사하기");
    }
};

window.updateAppStatus = async function(id, column, value) {
    const app = globalApps.find(a => String(a.id) === String(id)); if (!app) return;
    if (column === 'join_status' && app.join_status === '가입 완료' && value !== '가입 완료') {
        window.openCustomConfirm("가입 취소 (롤백)", null, `해당 고객의 가입 처리를 취소하시겠습니까?`, async () => {
            await supabaseClient.from('members').delete().eq('phone', app.phone); await supabaseClient.from('member_history').delete().eq('member_phone', app.phone); await supabaseClient.from('applications').update({ join_status: value }).eq('id', id); showToast("롤백 되었습니다."); window.fetchApplications(); window.fetchMembers();
        });
        return;
    }
    if (column === 'join_status' && value === '가입 완료') {
        window.openCustomConfirm("가입 완료 (멤버 전환)", null, `해당 고객을 멤버 리스트로 이관하시겠습니까?`, async () => {
            const now = new Date(); let endDateObj = new Date(now.getFullYear(), now.getMonth() + 6, now.getDate() <= 15 ? 1 : 15);
            const endDateStr = `${endDateObj.getFullYear()}-${String(endDateObj.getMonth()+1).padStart(2,'0')}-${String(endDateObj.getDate()).padStart(2,'0')}`;
            const { data: exMem } = await supabaseClient.from('members').select('*').eq('phone', app.phone).limit(1);
            let dbErr; if (exMem && exMem.length > 0) { dbErr = (await supabaseClient.from('members').update({ status: '활동 중', end_date: endDateStr, batch: app.desired_batch, name: app.name }).eq('phone', app.phone)).error; } 
            else { dbErr = (await supabaseClient.from('members').insert([{ name: app.name, phone: app.phone, batch: app.desired_batch, status: '활동 중', end_date: endDateStr }])).error; }
            if(dbErr) return showToast(`이관 실패`);
            await supabaseClient.from('member_history').insert([{ member_name: app.name, member_phone: app.phone, action_detail: '신규 가입 (6개월)', amount: '1,650,000원' }]); 
            await supabaseClient.from('applications').update({ join_status: '가입 완료' }).eq('id', id); showToast("멤버 이관 완료"); window.fetchApplications(); window.fetchMembers();
        });
        return;
    }
    const { error } = await supabaseClient.from('applications').update({ [column]: value }).eq('id', id); if (error) showToast("업데이트 실패"); else { showToast("업데이트 되었습니다."); window.fetchApplications(); }
};

window.renderAppTable = function(data) {
  if(!$("appTableBody")) return;
  const tbody = $("appTableBody"); tbody.innerHTML = ''; if(data.length === 0) { tbody.innerHTML = `<tr><td colspan="8" class="empty-state">내역이 없습니다.</td></tr>`; return; }
  data.forEach(row => {
    const interestFull = row.interest_detail ? `${row.interest_area} <div class="sub-text">(${row.interest_detail})</div>` : (row.interest_area || '-');
    let routeDisplay = parseAcquisitionChannel(row.acquisition_channel); if (row.brand_awareness_duration && row.brand_awareness_duration !== '정보없음') routeDisplay += ` <div class="sub-text">(${row.brand_awareness_duration})</div>`;
    const cStat = statusClassMap[row.status] || 'st-wait'; const cJoin = joinClassMap[row.join_status || ''] || 'jn-none';
    let timeBadgeHtml = (row.status === '상담 일정 확정' || row.status === '설문 완료') ? `<div class="edit-schedule-link" onclick="window.openScheduleModal('${row.id}', '${row.call_time}', '${row.counselor_name}')">상담 일정 수정</div>` : '';
    let surveyBadge = (row.survey_job || row.survey_edu) ? `<span class="status-badge badge-orange" style="margin-right:8px; font-size:11px;">설문완료</span>` : `<span class="status-badge badge-gray" style="margin-right:8px; font-size:11px;">미응답</span>`;
    let nameHtml = `${surveyBadge}<strong style="cursor:pointer;" onclick="window.openCrmModal('${row.id}')">${window.escapeHtml(row.name)}</strong>`;
    let mPreview = `<td class="m-preview" onclick="this.closest('tr').classList.toggle('expanded')"><div class="m-prev-top"><span class="m-prev-date">${formatDtWithDow(row.created_at)}</span><span class="status-badge ${cStat}">${row.status}</span></div><div class="m-prev-title">[${row.desired_batch || '-'}] ${window.escapeHtml(row.name)} <span style="font-size:13px; color:var(--text-secondary);">(${window.escapeHtml(row.phone)})</span></div><div class="m-prev-desc">${window.escapeHtml(row.interest_area)}</div></td>`;
    const tr = document.createElement('tr');
    tr.innerHTML = `${mPreview}<td data-label="신청일시">${formatDt(row.created_at)}</td><td data-label="기수">${row.desired_batch || '-'}</td><td data-label="성함">${nameHtml}</td><td data-label="연락처">${window.escapeHtml(row.phone)}</td><td data-label="관심 분야"><div>${interestFull}</div></td><td data-label="유입 경로"><div>${routeDisplay}</div></td><td data-label="상담 진행 상황"><div class="action-wrap"><select class="status-select ${cStat}" onchange="window.handleStatusChange('${row.id}', this.value, '${row.call_time}', '${row.counselor_name}')"><option value="대기" ${row.status === '대기' ? 'selected' : ''}>대기</option><option value="상담 일정 조율 중" ${row.status === '상담 일정 조율 중' ? 'selected' : ''}>상담 일정 조율 중</option><option value="상담 일정 확정" ${row.status === '상담 일정 확정' ? 'selected' : ''}>상담 일정 확정</option><option value="설문 완료" ${row.status === '설문 완료' ? 'selected' : ''}>설문 완료 (확정)</option><option value="상담 완료" ${row.status === '상담 완료' ? 'selected' : ''}>상담 완료</option><option value="연락 두절" ${row.status === '연락 두절' ? 'selected' : ''}>연락 두절</option></select>${timeBadgeHtml}</div></td><td data-label="가입 여부"><div class="action-wrap"><select class="status-select ${cJoin}" onchange="window.updateAppStatus('${row.id}', 'join_status', this.value)" ${row.status === '상담 완료' ? '' : 'disabled'}><option value="" ${!row.join_status ? 'selected' : ''}>선택 전</option><option value="고민 중" ${row.join_status === '고민 중' ? 'selected' : ''}>고민 중</option><option value="가입 완료" ${row.join_status === '가입 완료' ? 'selected' : ''}>가입 완료</option><option value="미가입" ${row.join_status === '미가입' ? 'selected' : ''}>미가입</option><option value="다음 기수 희망" ${row.join_status === '다음 기수 희망' ? 'selected' : ''}>다음 기수 희망</option></select></div></td>`;
    tbody.appendChild(tr);
  });
}

/** 💡 [혁신] 실무 최적화 발주 요약 렌더링 (수량 우선, 그룹 분리) */
window.showOrderSummary = function() {
    let qOrd = ($("searchOrd")?.value || "").toLowerCase();
    let vOrd = $("ordVendorFilter")?.value || "전체";
    let now = new Date();

    let pendingOrders = gOrd.filter(o => {
        if (['주문 취소', '센터 도착', '품절'].includes(o.status)) return false;
        let matchCenter = (currentGlobalCenter === '전체' || o.center === currentGlobalCenter);
        let matchQ = `${o.name} ${o.phone} ${o.vendor} ${o.item_name} ${o.center||''}`.toLowerCase().includes(qOrd);
        let matchV = vOrd === '전체' ? true : o.vendor === vOrd;
        return matchCenter && matchQ && matchV;
    });
    
    if (pendingOrders.length === 0) {
        $("summaryModalBody").innerHTML = '<div class="empty-state" style="padding: 80px 0;">조건에 일치하는 발주 내역이 없습니다.</div>';
    } else {
        let summary = {};
        pendingOrders.forEach(o => {
            let center = o.center || '미지정';
            let dayType = String(o.item_name || '').includes('목') ? '목요일 발주' : '월요일 발주';
            let cNm = o.item_name;
            let m = String(cNm).match(/(.+) \[(?:희망:\s*)?(\d+)\/(\d+)\((월|화|수|목|금|토|일)\).*?\]/);
            if(m) cNm = m[1].trim(); else { let oM = String(cNm).match(/(.+) \[(.*?)\]/); if(oM) cNm = oM[1].trim(); }

            let key = `${center}:::${dayType}:::${o.vendor}:::${cNm}`;
            if(!summary[key]) summary[key] = { center, dayType, vendor: o.vendor, item: cNm, numQty: 0, unit: '', total: 0, orderers: [] };
            
            let rawQty = String(o.quantity || '0').trim();
            let numVal = parseFloat(rawQty.replace(/[^0-9.]/g, '')) || 0;
            let unitVal = rawQty.replace(/[0-9.\s]/g, '');

            summary[key].numQty += numVal;
            if(!summary[key].unit) summary[key].unit = unitVal; 
            summary[key].total += parseInt(String(o.total_price || '0').replace(/[^0-9]/g, '')) || 0;
            summary[key].orderers.push({ batch: o.batch || '미정', name: o.name, phone: o.phone, qty: rawQty });
        });
        
        let html = `<div style="display: flex; flex-direction: column; gap: 16px; width: 100%;">`;
        let totalQtySum = 0; let grandTotal = 0;
        let sortedData = Object.values(summary).sort((a,b) => a.center.localeCompare(b.center) || a.dayType.localeCompare(b.dayType) || a.vendor.localeCompare(b.vendor));
        
        let currentGroupLabel = '';
        sortedData.forEach(s => {
            let groupLabel = `${s.center} - ${s.dayType}`;
            if (currentGroupLabel !== groupLabel) {
                currentGroupLabel = groupLabel;
                html += `<div style="font-size:18px; font-weight:800; color:var(--text-display); margin-top:24px; padding-bottom:10px; border-bottom:3px solid var(--text-display); letter-spacing:-0.5px;">${currentGroupLabel} 요약</div>`;
            }

            let ordererDetailText = s.orderers.map(o => `${o.batch} | ${o.name}`).join(', ');
            let copyableHtml = `<div class="copyable-wrap" onclick="window.copyTxt('${String(s.item).replace(/'/g, "\\'")}')" data-full-text="${String(s.item).replace(/"/g, '&quot;')}" style="max-width: 100%;"><div style="display:flex; align-items:center; width:100%; min-width: 0;"><span class="copyable-text" style="font-size: 16px; font-weight: 800; color: var(--text-display); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: block; max-width: 100%;">${window.escapeHtml(s.item)}</span><span class="copyable-hint">복사</span></div></div>`;

            html += `
            <div style="display: flex; flex-direction: column; gap: 8px; padding: 16px 0; border-bottom: 1px solid var(--border);">
                <div style="font-size: 12px; font-weight: 600; color: var(--text-secondary);">${window.escapeHtml(s.vendor)}</div>
                <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; width: 100%; min-width: 0;">
                    <div style="flex: 1; min-width: 0; display: flex; flex-direction: column;">
                        ${copyableHtml}
                        <div style="font-size: 13px; font-weight: 500; color: var(--text-tertiary); margin-top: 6px; word-break: keep-all; white-space: normal;">
                            <span style="color:var(--primary); font-weight:700;">주문자:</span> ${ordererDetailText}
                        </div>
                    </div>
                    <div style="text-align: right; flex-shrink: 0;">
                        <div style="font-size: 22px; font-weight: 900; color: var(--text-display); line-height: 1;">${s.numQty}<span style="font-size: 14px; margin-left: 2px; font-weight:700;">${s.unit}</span></div>
                        <div style="font-size: 12px; font-weight: 500; color: var(--text-tertiary); margin-top: 6px;">${comma(s.total)}원</div>
                    </div>
                </div>
            </div>`;
            totalQtySum += s.numQty;
            grandTotal += s.total;
        });
        
        html += `
            <div style="margin-top: 12px; padding: 24px; background: #f9fafb; border-radius: 16px; display: flex; flex-direction: column; gap: 12px; border: 1px solid var(--border-strong);">
                <div style="display: flex; justify-content: space-between; align-items: center;"><span style="font-size: 14px; font-weight: 600; color: var(--text-secondary);">총 발주 수량</span><span style="font-size: 20px; font-weight: 900; color: var(--text-display);">${totalQtySum}kg/g</span></div>
                <div style="height: 1px; background: var(--border); opacity: 0.5;"></div>
                <div style="display: flex; justify-content: space-between; align-items: center;"><span style="font-size: 14px; font-weight: 600; color: var(--text-secondary);">총 예상 금액</span><span style="font-size: 20px; font-weight: 900; color: var(--primary);">${comma(grandTotal)}원</span></div>
            </div>
        </div>`;
        
        $("summaryModalBody").innerHTML = html;
        let exportData = []; sortedData.forEach(s => { s.orderers.forEach(o => { exportData.push({ center: s.center, dayType: s.dayType, vendor: s.vendor, item: s.item, rawQty: o.qty, batch: o.batch, name: o.name, phone: o.phone }); }); });
        window.currentSummaryData = exportData;
        let footerWrap = document.querySelector('#summaryModal .modal-content > div:last-child');
        if(footerWrap) footerWrap.innerHTML = `<button class="btn-outline" style="margin-right:8px; border-color:#32b06a; color:#32b06a;" id="btn-send-sheet" onclick="window.sendToGoogleSheet()">구글 시트 전송</button><button class="btn-primary" style="padding: 12px 24px; font-size: 14px;" onclick="window.downloadSummaryExcel()">엑셀 다운로드</button>`;
    }
    const modal = $("summaryModal"); if(modal) modal.classList.add('show');
};

window.closeSummaryModal = function() { const modal = $("summaryModal"); if(modal) modal.classList.remove('show'); };

window.downloadSummaryExcel = function() {
    if(!window.currentSummaryData || window.currentSummaryData.length === 0) { showToast('데이터 없음'); return; }
    let csv = "\uFEFF수령 센터,발주 구분,생두사,상품명,수량,기수,성함,연락처\n";
    window.currentSummaryData.forEach(s => { csv += `"${s.center}","${s.dayType}","${s.vendor}","${String(s.item).replace(/"/g, '""')}","${s.rawQty}","${s.batch}","${s.name}","${s.phone}"\n`; });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' }); 
    const link = document.createElement('a'); link.href = URL.createObjectURL(blob); 
    link.download = `위커피_발주명단_${new Date().toISOString().slice(0,10)}.csv`; link.click(); 
};

window.sendToGoogleSheet = async function() {
    if(!window.currentSummaryData || window.currentSummaryData.length === 0) { showToast('데이터 없음'); return; }
    const GAS_URL = 'https://script.google.com/macros/s/AKfycbwPIhlxDj5iiFU3NN0YCIVf-3alEYxNWQ_7RprQS5fRNEejwueDJg35DTScAP3mZ6k/exec'; 
    const btn = document.getElementById('btn-send-sheet');
    if(btn) { btn.innerText = '전송 중...'; btn.disabled = true; }
    try {
        await fetch(GAS_URL, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(window.currentSummaryData) });
        showToast("구글 시트 전송 요청 완료");
    } catch(e) { showToast("전송 오류"); } finally { if(btn) { btn.innerText = '구글 시트 전송'; btn.disabled = false; } }
}
