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
let realtimeChannel = null;

let currentMemberPage = 1, memberItemsPerPage = 50, currentFilteredMembers = [];
let currentResPage = 1, resItemsPerPage = 10, currentFilteredRes = [];

window.currentEditingBlockId = null;

window.showGlobalTooltip = function(e, el) {
    let tt = document.getElementById('global-tooltip');
    if(!tt) {
        tt = document.createElement('div');
        tt.id = 'global-tooltip';
        tt.style.cssText = 'position:fixed; background:#333d4b; color:#fff; padding:10px 14px; border-radius:8px; font-size:13px; font-weight:500; white-space:pre-wrap; z-index:999999; box-shadow:0 4px 12px rgba(0,0,0,0.15); pointer-events:none; word-break:keep-all; line-height:1.5; text-align:left; transform: translate(-50%, -100%); margin-top: -8px;';
        document.body.appendChild(tt);
    }
    tt.innerHTML = el.getAttribute('data-tippy');
    tt.style.display = 'block';
    let rect = el.getBoundingClientRect();
    tt.style.top = rect.top + 'px';
    tt.style.left = (rect.left + (rect.width / 2)) + 'px';
};
window.hideGlobalTooltip = function() {
    let tt = document.getElementById('global-tooltip');
    if(tt) tt.style.display = 'none';
};

window.changeGlobalCenter = function(centerValue) {
    currentGlobalCenter = centerValue;
    if(window.updateDashSpaceFilter) window.updateDashSpaceFilter();
    window.fetchCenterData(); 
    setTimeout(() => { if(window.renderTimeline) window.renderTimeline(); }, 100);
};

document.addEventListener('click', function(e) {
    let txt = e.target.innerText || '';
    if (e.target.tagName !== 'SELECT' && e.target.tagName !== 'OPTION') {
        let cleanTxt = txt.trim();
        if (cleanTxt === '전체 센터' || cleanTxt === '마포 센터' || cleanTxt === '광진 센터') {
            let val = cleanTxt === '전체 센터' ? '전체' : cleanTxt;
            if (currentGlobalCenter !== val) window.changeGlobalCenter(val);
            if(e.target.parentElement) {
                Array.from(e.target.parentElement.children).forEach(child => {
                    if(child.style) { child.style.fontWeight = '500'; child.style.color = 'var(--text-secondary)'; }
                });
                e.target.style.fontWeight = '800'; e.target.style.color = 'var(--text-display)';
            }
        }
    }
    let targetBtn = e.target.closest('button, .btn');
    if (targetBtn) {
        let btnTxt = (targetBtn.innerText || '').replace(/\s+/g, '');
        if (btnTxt.includes('일괄입금확인')) window.batchUpdateOrderStatus('입금 확인');
        else if (btnTxt.includes('일괄센터도착')) window.batchUpdateOrderStatus('센터 도착');
    }
});

document.addEventListener('change', function(e) {
    if (e.target && e.target.tagName === 'SELECT') {
        if (e.target.innerHTML.includes('마포 센터') && e.target.innerHTML.includes('광진 센터') && e.target.id !== 'dashSpaceFilter' && e.target.id !== 'blkCenter') {
            window.changeGlobalCenter(e.target.value);
        }
    }
    if (e.target.id === 'filterPendingOrd' || e.target.id === 'ordVendorFilter' || e.target.id === 'resSpaceFilter' || e.target.id === 'trnContentFilter') window.renderCenterData();
    if (e.target.id === 'blkCenter') if(window.updateSpaceOptions) window.updateSpaceOptions();
});

document.addEventListener('input', function(e) {
    if (e.target.id === 'searchOrd' || e.target.id === 'searchRes' || e.target.id === 'searchTrn' || e.target.id === 'memberSearch') {
        if (e.target.id === 'memberSearch') window.searchMembers();
        else window.renderCenterData();
    }
});

// 💡 수정: CSS 캐싱 무시 및 강제 덮어쓰기 적용 (배너 5:5 + 타임라인 표 디자인 완벽 보장)
let wecoffeeStyle = document.getElementById('wecoffee-custom-styles');
if (!wecoffeeStyle) {
    wecoffeeStyle = document.createElement('style');
    wecoffeeStyle.id = 'wecoffee-custom-styles';
    document.head.appendChild(wecoffeeStyle);
}
wecoffeeStyle.innerHTML = `
    .wecoffee-banner-wrap, .banner-grid { animation: wecoffeeFadeIn 0.35s ease-out forwards; display: flex; gap: 24px; align-items: stretch; width: 100%; }
    .wecoffee-banner-wrap > div, .banner-grid > div { flex: 1; min-width: 0; }
    @keyframes wecoffeeFadeIn { from { opacity: 0; transform: translateY(2px); } to { opacity: 1; transform: translateY(0); } }
    
    .info-tooltip { position: relative; display: inline-flex; align-items: center; justify-content: center; margin-left: 8px; cursor: help; color: #b0b8c1; vertical-align: middle; transition: 0.2s; font-style: normal !important; font-weight: 700; width: 18px; height: 18px; border-radius: 50%; border: 1.5px solid #b0b8c1; font-size: 11px; line-height: 1; font-family: sans-serif; }
    .info-tooltip:hover { color: #505967; border-color: #505967; }
    .nth-badge { margin-left:6px; font-size:11px; padding:2px 6px; border-radius:4px; background:#e8f0fe; color:#1a73e8; font-weight:800; vertical-align:middle; display:inline-block; letter-spacing:-0.5px; }
    .pagination-btn { height:32px; min-width:32px; padding:0 8px; border:1px solid var(--border-strong); background:#fff; border-radius:6px; font-size:13px; font-weight:600; cursor:pointer; transition:0.2s; }
    .pagination-btn.active { background:var(--primary); color:#fff; border-color:var(--primary); }
    .pagination-btn:disabled { opacity:0.5; cursor:not-allowed; }
    .dash-cal-grid, .dash-cal-cell, .desktop-cal { overflow: visible !important; }
    .mem-action-wrap { display: flex; align-items: center; gap: 8px; flex-wrap: nowrap !important; overflow-x: auto; }
    .mem-action-row { display: flex; align-items: center; gap: 4px; flex-wrap: nowrap !important; white-space: nowrap; }
    .date-inputs select { flex-shrink: 0; width: auto !important; min-width: 75px; padding-left: 8px !important; padding-right: 28px !important; background-position: right 8px center; }
    .order-day-badge { display: none !important; } 
    .space-opt-item:hover { background: #f9fafb; color: var(--primary); font-weight: 700; }
    .space-opt-item.selected { background: #e8f0fe; color: var(--primary); font-weight: 700; }
    #dynamic-ord-container { padding-bottom: 120px; }
    
    /* 타임라인 강제 레이아웃 보장 CSS */
    #timeline-area { width: 100%; max-width: 100vw; box-sizing: border-box; margin-top: 32px; display: block !important; clear: both; }
    #timeline-area .timeline-section { width: 100%; margin: 0 0 32px 0 !important; background: #fff; padding: 24px; border-radius: 12px; border: 1px solid var(--border-strong); box-shadow: 0 4px 20px rgba(0,0,0,0.05); box-sizing: border-box; overflow: hidden; text-align: left; display: block !important; }
    .timeline-container { width: 100%; overflow-x: auto; position: relative; border: 1px solid #eee; border-radius: 8px; -webkit-overflow-scrolling: touch; padding-bottom: 8px; box-sizing: border-box; text-align: left; display: block !important; }
    .timeline-grid { min-width: 1200px; display: flex !important; flex-direction: column !important; border-top: 1px solid #eee; border-left: 1px solid #eee; border-right: 1px solid #eee; }
    .timeline-header { display: flex !important; flex-direction: row !important; background: #f9fafb; border-bottom: 2px solid #eee; width: 100%; }
    .resource-label-header { width: 210px; flex-shrink: 0; padding: 12px; border-right: 1px solid #eee; font-weight: 800; font-size: 13px; color: var(--text-secondary); text-align: center; box-sizing: border-box; }
    .time-slots-header { display: flex !important; flex-direction: row !important; flex-grow: 1; }
    .time-slot-num { flex: 1; text-align: center; font-size: 11px; font-weight: 700; padding: 12px 0; color: #999; border-right: 1px solid #f0f0f0; }
    .zone-group-row { display: flex !important; flex-direction: row !important; border-bottom: 1px solid #eee; width: 100%; }
    .zone-col { width: 90px; flex-shrink: 0; background: #f4f5f7; border-right: 1px solid #eee; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 800; color: #333d4b; text-align: center; word-break: keep-all; padding: 8px; box-sizing: border-box; }
    .equip-col-wrapper { flex: 1; display: flex !important; flex-direction: column !important; min-width: 0; }
    .timeline-row { display: flex !important; flex-direction: row !important; border-bottom: 1px solid #eee; min-height: 54px; position: relative; width: 100%; }
    .equip-name { width: 120px; flex-shrink: 0; padding: 10px 12px; border-right: 1px solid #eee; font-size: 12px; font-weight: 600; background: #fcfcfc; display: flex; align-items: center; justify-content: center; line-height: 1.3; color: #505967; text-align: center; word-break: keep-all; box-sizing: border-box; }
    .time-grid-bg { display: flex !important; flex-direction: row !important; flex-grow: 1; position: relative; background-image: repeating-linear-gradient(to right, transparent, transparent calc(4.16666% - 1px), #f0f0f0 calc(4.16666% - 1px), #f0f0f0 4.16666%); }
    .timeline-bar { position: absolute; height: 36px; top: 9px; border-radius: 8px; color: #fff; padding: 0 10px; display: flex; align-items: center; font-size: 11px; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; z-index: 2; cursor: pointer; transition: transform 0.2s; box-shadow: 0 2px 6px rgba(0,0,0,0.1); border: 1.5px solid rgba(255,255,255,0.8); box-sizing: border-box; }
    .bar-res { background: var(--primary); }
    .bar-trn { background: rgba(255, 121, 0, 0.65); color: #fff; }
    .bar-blk { background: #9ca3af; color: #fff; }

    @media (max-width: 1024px) { .mem-action-wrap { flex-wrap: nowrap !important; overflow-x: auto; } }
    @media (max-width: 768px) { .wecoffee-banner-wrap, .banner-grid { flex-direction: column; } .mem-action-wrap { flex-direction: column !important; align-items: stretch !important; gap: 8px !important; width: 100%; overflow-x: visible; } .mem-action-row { width: 100%; justify-content: space-between; flex-wrap: wrap !important; gap: 6px; } .mem-action-row select { flex: 1; min-width: 0; padding-left: 8px !important; padding-right: 28px !important; } #timeline-area .timeline-section { padding: 16px; margin-bottom: 24px !important; } }
`;

window.escapeHtml = function(unsafe) { if (!unsafe) return ''; return String(unsafe).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;"); };

window.safeKST = function(dateStr) {
    if(!dateStr) return new Date();
    let d = new Date(dateStr);
    if(isNaN(d.getTime())) {
        let str = String(dateStr).replace(/-/g, '/').replace('T', ' ').split('.')[0];
        d = new Date(str);
    }
    return isNaN(d.getTime()) ? new Date() : d;
};

window.parseDeliveryDate = function(dateStr) {
    if(!dateStr) return new Date();
    let str = String(dateStr).trim();
    let currentYear = new Date().getFullYear();
    let m = str.match(/(\d{1,2})[\/\-\.월]\s*(\d{1,2})/);
    if (m) { return new Date(currentYear, parseInt(m[1], 10) - 1, parseInt(m[2], 10)); }
    let d = new Date(str);
    if(!isNaN(d.getTime())) { if(d.getFullYear() < 2010) d.setFullYear(currentYear); return d; }
    return new Date();
};

window.formatDeliveryDateFull = function(dateStr) {
    if(!dateStr) return '미정';
    let d = window.parseDeliveryDate(dateStr);
    let dow = ['일','월','화','수','목','금','토'][d.getDay()];
    return `${d.getMonth()+1}월 ${d.getDate()}일 ${dow}요일`;
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
  return null;
};

function getDow(dStr) { 
    if(!dStr) return ''; 
    try {
        let str = String(dStr).replace('T', ' ').split('.')[0];
        let datePart = str.split(' ')[0];
        if(!datePart) return '';
        let [y, m, d] = datePart.split('-');
        if(!y || !m || !d) return '';
        let dObj = new Date(y, m-1, d);
        return ['일','월','화','수','목','금','토'][dObj.getDay()] || ''; 
    } catch(e) { return ''; }
}

function formatDtWithDow(dateStr) { 
    if(!dateStr) return "-"; 
    try {
        let str = String(dateStr).replace('T', ' ').split('.')[0];
        let parts = str.split(' ');
        if(parts.length < 2) return str;
        let [y, m, d] = parts[0].split('-');
        let [hh, mm] = parts[1].split(':');
        if(!y || !m || !d || !hh || !mm) return str;
        let dObj = new Date(y, m-1, d);
        const dow = ['일','월','화','수','목','금','토'][dObj.getDay()] || '';
        return `${y.slice(-2)}/${m}/${d}(${dow}) ${hh}:${mm}`; 
    } catch(e) { return String(dateStr); }
}

function formatDt(dateStr) { 
    if(!dateStr) return "-"; 
    try {
        let str = String(dateStr).replace('T', ' ').split('.')[0];
        let parts = str.split(' ');
        if(parts.length < 2) return str;
        let [y, m, d] = parts[0].split('-');
        let [hh, mm] = parts[1].split(':');
        if(!y || !m || !d || !hh || !mm) return str;
        return `${y.slice(-2)}/${m}/${d} ${hh}:${mm}`; 
    } catch(e) { return String(dateStr); }
}

function comma(str) { return Number(String(str).replace(/[^0-9]/g, '')).toLocaleString(); }
function showToast(msg) { const toast = $("toast"); if(!toast) return; toast.innerText = msg; toast.classList.add('show'); setTimeout(() => toast.classList.remove('show'), 3500); }

window.toggleAll = function(checkbox, targetClass) { 
    const checkboxes = document.querySelectorAll('.' + targetClass); 
    checkboxes.forEach(cb => { if (!cb.disabled) cb.checked = checkbox.checked; }); 
};

window.batchUpdateOrderStatus = async function(statusText) {
    let checkedBoxes = document.querySelectorAll('input[type="checkbox"][class*="chk-ord"]:checked');
    let idsToUpdate = Array.from(checkedBoxes).map(cb => String(cb.value)).filter(val => val !== "on");
    if (idsToUpdate.length === 0) return showToast("선택된 발주 건이 없습니다.");
    window.openCustomConfirm("일괄 상태 변경", null, `선택한 ${idsToUpdate.length}건을 일괄 <b>[${statusText}]</b> 처리하시겠습니까?`, async () => {
        const { error } = await supabaseClient.from('orders').update({ status: statusText }).in('id', idsToUpdate);
        if (error) { showToast("일괄 변경에 실패했습니다."); console.error(error); } 
        else { showToast(`${idsToUpdate.length}건이 [${statusText}] 상태로 변경되었습니다.`); window.fetchCenterData(); }
    }, "일괄 변경");
};

window.formatBlockDate = function(v) { let d = String(v).replace(/\D/g, ''); if(d.length === 4) { let y = new Date().getFullYear(); return `${y}-${d.slice(0,2)}-${d.slice(2,4)}`; } if(d.length === 6) { return `20${d.slice(0,2)}-${d.slice(2,4)}-${d.slice(4,6)}`; } if(d.length >= 8) { return `${d.slice(0,4)}-${d.slice(4,6)}-${d.slice(6,8)}`; } return v; }
window.formatBlockTime = function(v) { let t = String(v).replace(/\D/g, ''); if(t.length === 1) return `0${t}:00`; if(t.length === 2) return `${t.padStart(2,'0')}:00`; if(t.length === 3) return `0${t.slice(0,1)}:${t.slice(1,3)}`; if(t.length >= 4) return `${t.slice(0,2)}:${t.slice(2,4)}`; return v; }

window.formatCounselDateDisplay = function(val) { if(!val) return ''; let dt = String(val).replace(/\D/g, ''); if(dt.length === 8) dt = dt.slice(4); if(dt.length > 4 && dt.length !== 8) dt = dt.slice(-4); if(dt.length !== 4) return val; let now = new Date(); let y = now.getFullYear(); let m = parseInt(dt.slice(0,2), 10); let d = parseInt(dt.slice(2,4), 10); if (m < now.getMonth() + 1 - 2) y += 1; let dObj = new Date(y, m - 1, d); if(isNaN(dObj.getTime())) return val; let dowKr = ['일','월','화','수','목','금','토'][dObj.getDay()]; return `${y}년 ${m}월 ${d}일 (${dowKr})`; }
window.formatCounselDateRaw = function(val) { if(!val) return ''; let match = val.match(/(\d+)년\s*(\d+)월\s*(\d+)일/); if(match) return String(match[2]).padStart(2,'0') + String(match[3]).padStart(2,'0'); let dt = String(val).replace(/\D/g, ''); if(dt.length > 4) return dt.slice(-4); return dt; }
window.formatCounselTimeDisplay = function(val) { if(!val) return ''; let t = String(val).replace(/\D/g, ''); if(t.length < 3) return val; let hh = parseInt(t.length === 3 ? t.slice(0,1) : t.slice(0,2), 10); let mm = t.length === 3 ? t.slice(1,3) : t.slice(2,4); let ampm = hh >= 12 ? '오후' : '오전'; let hh12 = hh % 12 || 12; return `${ampm} ${hh12}:${mm}`; }

window.copyTxt = function(txt, successMsg = "복사되었습니다.") { if (navigator.clipboard && window.isSecureContext) { navigator.clipboard.writeText(txt).then(() => { showToast(successMsg); }).catch(err => { fallbackCopyTextToClipboard(txt, successMsg); }); } else { fallbackCopyTextToClipboard(txt, successMsg); } };
function fallbackCopyTextToClipboard(text, successMsg) { var textArea = document.createElement("textarea"); textArea.value = text; textArea.style.top = "0"; textArea.style.left = "0"; textArea.style.position = "fixed"; document.body.appendChild(textArea); textArea.focus(); textArea.select(); try { document.execCommand('copy'); showToast(successMsg); } catch (err) { showToast("복사 실패"); } document.body.removeChild(textArea); }
window.fetchGoogleCalendarEvents = async function(yyyy, mm) {
  const API_KEY = 'AIzaSyAjtrSlv56VPhtqMYGsQd0L4q1AlZTW1Ng'; const CALENDAR_ID = 'wecoffeekorea@gmail.com';
  try {
    const timeMin = new Date(yyyy, mm - 1, 1).toISOString(); const timeMax = new Date(yyyy, mm, 0, 23, 59, 59).toISOString();
    const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(CALENDAR_ID)}/events?key=${API_KEY}&timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&orderBy=startTime`;
    const response = await fetch(url); if (!response.ok) return []; const data = await response.json();
    return (data.items || []).map(event => { let dateStr, timeStr; if (event.start.date) { dateStr = event.start.date; timeStr = '종일'; } else if (event.start.dateTime) { dateStr = event.start.dateTime.split('T')[0]; timeStr = event.start.dateTime.split('T')[1].substring(0, 5); } else return null; return { date: dateStr, time: timeStr, start: timeStr, text: event.summary || '일정', type: 'google' }; }).filter(Boolean);
  } catch (error) { return []; }
};

window.updateDailyInOutBanner = function() { 
  let td = new Date(); let ds = `${td.getFullYear()}-${String(td.getMonth()+1).padStart(2,'0')}-${String(td.getDate()).padStart(2,'0')}`; 
  const getDailyEvents = (centerFilter) => { let evts = []; gRes.forEach(r => { if(r.res_date === ds && r.center === centerFilter && !String(r.status||'').includes('취소')) { let st = String(r.res_time||"").split('~')[0].trim(); let enParts = String(r.res_time||"").split('~'); let en = enParts.length > 1 ? enParts[1].trim() : ''; let spc = String(r.space_equip||"").split(' ')[0]; evts.push({ start: st, end: en, name: r.name, space: spc }); } }); return evts; }; 
  let centers = currentGlobalCenter === '전체' ? ['마포 센터', '광진 센터'] : [currentGlobalCenter]; let html = ``; 
  centers.forEach(c => { 
      let evts = getDailyEvents(c); 
      if(evts.length === 0) { html += `<div class="inout-card" style="height:100%; box-sizing:border-box;"><div style="font-weight:800; margin-bottom:8px; color:var(--text-display); border-bottom:1px solid var(--border-strong); padding-bottom:8px;">${c}</div><div style="font-size:13px; color:var(--text-secondary); padding:8px 0;">오늘 확정된 예약이 없습니다.</div></div>`; } 
      else { 
          let first = [...evts].sort((a,b) => String(a.start||'').localeCompare(String(b.start||'')))[0]; let last = [...evts].sort((a,b) => String(b.end||'').localeCompare(String(a.end||'')))[0]; 
          html += `<div class="inout-card" style="padding: 16px; gap: 8px; border-radius:12px; border:1px solid var(--border-strong); background:#fff; align-items:flex-start; text-align:left; width:100%; height:100%; box-sizing:border-box;"><div style="font-weight:800; font-size:15px; margin-bottom:12px; color:var(--text-display); border-bottom:1px solid var(--border-strong); padding-bottom:8px; width:100%;">${c}</div><div style="display:flex; align-items:center; justify-content:space-between; margin-bottom: 8px; width:100%;"><span style="font-weight:600; font-size:14px; color:var(--text-display);">[${first.space||''}] ${window.escapeHtml(first.name||'')}</span><span style="color:var(--text-secondary); font-size:13px; font-weight:600;">첫 입실 <strong style="color:var(--text-display); font-weight:600;">${first.start||''}</strong></span></div><div style="display:flex; align-items:center; justify-content:space-between; margin-bottom: 0px; width:100%;"><span style="font-weight:600; font-size:14px; color:var(--text-display);">[${last.space||''}] ${window.escapeHtml(last.name||'')}</span><span style="color:var(--text-secondary); font-size:13px; font-weight:600;">최종 퇴실 <strong style="color:var(--text-display); font-weight:600;">${last.end||''}</strong></span></div></div>`; 
      } 
  }); 
  if($("dailyInOutBanner")) $("dailyInOutBanner").innerHTML = html; 
};

window.updateCancelAccumulationBanner = function() {
    let now = new Date(); let y = now.getFullYear(); let m = String(now.getMonth() + 1).padStart(2, '0'); let monthPrefix = `${y}-${m}`; let cancelCounts = {};
    let addCancel = (phone, name, batch) => { if(!phone) return; if(!cancelCounts[phone]) cancelCounts[phone] = { name, batch, count: 0 }; cancelCounts[phone].count++; };
    gRes.forEach(r => { if (r.status === '당일 취소' && String(r.res_date || r.created_at).startsWith(monthPrefix)) addCancel(r.phone, r.name, r.batch); });
    gTrn.forEach(t => { if (t.status === '당일 취소') { let cInfo = String(t.content||'').split('||').map(s=>s.trim()); let dateStr = cInfo.length >= 5 ? cInfo[0] : String(t.created_at); if(dateStr.startsWith(monthPrefix)) addCancel(t.phone, t.name, t.batch); } });
    let sorted = Object.values(cancelCounts).sort((a,b) => b.count - a.count); let html = '';
    if (sorted.length === 0) { html = `<div class="inout-card" style="text-align:center; color:var(--text-secondary); padding:16px; background:#fff; border:1px solid var(--border-strong); border-radius:12px; height:100%; display:flex; align-items:center; justify-content:center; box-sizing:border-box;">이번 달 당일 취소 내역이 없습니다.</div>`; } 
    else { 
        html += `<div style="height:100%; box-sizing:border-box; display:flex; flex-direction:column;">`;
        sorted.forEach(user => { let isWarning = user.count >= 4; let style = isWarning ? 'border:1px solid var(--error); background:#fff0f0;' : 'border:1px solid var(--border-strong); background:#fff;'; let nameColor = isWarning ? 'color:var(--error); font-weight:800;' : 'color:var(--text-display); font-weight:700;'; let warningBadge = isWarning ? `<span style="background:var(--error); color:#fff; font-size:11px; padding:2px 6px; border-radius:4px; margin-left:8px; font-weight:700;">경고</span>` : ''; html += `<div style="padding:12px 16px; border-radius:12px; display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; ${style}"><div style="${nameColor}">[${user.batch||'-'}] ${window.escapeHtml(user.name)} ${warningBadge}</div><div style="font-size:14px; font-weight:800; ${isWarning ? 'color:var(--error);' : 'color:var(--text-secondary);'}">${user.count}회</div></div>`; }); 
        html += `</div>`;
    }
    if($("cancelAccumulationBanner")) $("cancelAccumulationBanner").innerHTML = html;
};

window.renderNoticeData = function() { 
  let fNoti = [...gNotice]; 
  fNoti.sort((a,b) => { if(a.is_pinned === b.is_pinned) return window.safeKST(b.created_at) - window.safeKST(a.created_at); return a.is_pinned ? -1 : 1; }); 
  if($("noticeTableBody")) $("noticeTableBody").innerHTML = fNoti.length ? fNoti.map(n => { 
      let pinBadge = n.is_pinned ? `<span class="status-badge badge-orange" style="margin-right:8px;">필독</span>` : `<span class="status-badge badge-gray" style="margin-right:8px;">일반</span>`; 
      let statBadge = n.status === '발행' ? `<span class="status-badge badge-green">발행 중</span>` : `<span class="status-badge badge-gray">숨김</span>`; 
      let targetBadge = n.target_batch ? `<span class="status-badge badge-blue">${window.escapeHtml(n.target_batch)}</span>` : `<span class="status-badge badge-gray">전체</span>`;
      let mPreview = `<td class="m-preview" onclick="this.closest('tr').classList.toggle('expanded')"><div class="m-prev-top"><span class="m-prev-date">${formatDt(n.created_at)}</span>${statBadge}</div><div class="m-prev-title" style="font-size:16px;">${pinBadge}${window.escapeHtml(n.title)}</div><span class="m-toggle-hint">관리 메뉴 보기 ▼</span></td>`; 
      return `<tr>${mPreview}<td data-label="구분" class="tc">${pinBadge}</td><td data-label="대상" class="tc">${targetBadge}</td><td data-label="제목"><strong style="color:var(--text-display);">${window.escapeHtml(n.title)}</strong></td><td data-label="상태" class="tc">${statBadge}</td><td data-label="작성일">${formatDt(n.created_at)}</td><td data-label="관리" class="tc"><div class="action-wrap-flex" style="justify-content:center;"><button class="btn-outline btn-sm" onclick="window.editNotice('${n.id}')">수정</button> <button class="btn-outline btn-sm" onclick="window.deleteNotice('${n.id}')" style="color:var(--error);border-color:var(--error)">삭제</button></div></td></tr>`; 
    }).join("") : `<tr><td colspan="6" class="empty-state">등록된 공지사항이 없습니다.</td></tr>`; 
};

window.updateDashSpaceFilter = function() {
    let filter = $("dashSpaceFilter"); if(!filter) return; let currentVal = filter.value; let html = `<option value="전체">전체 공간</option>`;
    if(currentGlobalCenter === '마포 센터') html += `<option value="에스프레소존">에스프레소존</option><option value="로스팅존">로스팅존</option><option value="브루잉존">브루잉존</option><option value="커핑존">커핑존</option><option value="스터디존">스터디존</option>`;
    else if (currentGlobalCenter === '광진 센터') html += `<option value="에스프레소존">에스프레소존</option><option value="로스팅존">로스팅존</option><option value="브루잉존">브루잉존</option><option value="커핑존">커핑존</option><option value="스터디룸">스터디룸</option>`;
    else html += `<option value="에스프레소존">에스프레소존</option><option value="로스팅존">로스팅존</option><option value="브루잉존">브루잉존</option><option value="커핑존">커핑존</option><option value="스터디">스터디존/룸</option>`;
    filter.innerHTML = html; if([...filter.options].some(o => o.value === currentVal)) filter.value = currentVal; else filter.value = '전체';
}

window.currentSpaceOpts = [];
window.updateSpaceOptions = function() {
    let center = $("blkCenter") ? $("blkCenter").value : "마포 센터";
    window.currentSpaceOpts = ['전체 (공간 전체)'];
    
    if (center === '마포 센터') {
        window.currentSpaceOpts.push('에스프레소존', '아스토리아 스톰 1번(좌)', '아스토리아 스톰 2번(우)', '로스팅존', '이지스터 800 1번(좌)', '이지스터 800 2번(우)', '이지스터 1.8', '스트롱홀드 S7X', '브루잉존', '커핑존', '스터디존');
    } else {
        window.currentSpaceOpts.push('에스프레소존', '시네소 MVP 1번(좌)', '시네소 MVP 2번(우)', '페마 페미나', '산레모 You', '이글원 프리마 프로', '이글원 프리마 EXP', '로스팅존', '이지스터 800 1번(좌)', '이지스터 800 2번(우)', '이지스터 1.8 1번(좌)', '이지스터 1.8 2번', '브루잉존', '커핑존', '스터디룸');
    }

    let blkSpaceInput = $("blkSpace");
    if (!blkSpaceInput) return;

    blkSpaceInput.removeAttribute('list');

    let wrapper = document.getElementById('custom-space-dropdown');
    if (!wrapper) {
        wrapper = document.createElement('div');
        wrapper.id = 'custom-space-dropdown';
        wrapper.style.cssText = 'position:absolute; background:#fff; border:1px solid var(--border-strong); border-radius:8px; max-height:200px; overflow-y:auto; width:100%; z-index:9999; display:none; box-shadow:0 4px 12px rgba(0,0,0,0.15); margin-top:4px;';
        
        blkSpaceInput.parentNode.style.position = 'relative';
        blkSpaceInput.parentNode.appendChild(wrapper);

        blkSpaceInput.addEventListener('focus', () => { wrapper.style.display = 'block'; window.renderCustomOptions(""); });
        blkSpaceInput.addEventListener('click', () => { wrapper.style.display = 'block'; window.renderCustomOptions(""); });

        document.addEventListener('click', (e) => {
            if(e.target !== blkSpaceInput && !wrapper.contains(e.target)) {
                wrapper.style.display = 'none';
            }
        });
        
        blkSpaceInput.addEventListener('input', function(e) {
            let val = this.value;
            let parts = val.split(',');
            let lastTerm = parts[parts.length - 1].trim(); 
            wrapper.style.display = 'block';
            window.renderCustomOptions(lastTerm);
        });
    }

    window.renderCustomOptions = (searchTerm = "") => {
        let currentArr = blkSpaceInput.value ? blkSpaceInput.value.split(',').map(s=>s.trim()).filter(Boolean) : [];
        let filteredOpts = window.currentSpaceOpts;
        if (searchTerm) { filteredOpts = window.currentSpaceOpts.filter(opt => opt.toLowerCase().includes(searchTerm.toLowerCase())); }
        if(filteredOpts.length === 0) { wrapper.innerHTML = `<div style="padding:10px 12px; font-size:13px; color:var(--text-secondary);">검색 결과가 없습니다.</div>`; } 
        else {
            wrapper.innerHTML = filteredOpts.map(opt => {
                let isSelected = currentArr.includes(opt);
                let bgStyle = isSelected ? 'background:#e8f0fe; color:var(--primary); font-weight:800;' : '';
                return `<div class="space-opt-item" style="padding:10px 12px; cursor:pointer; font-size:14px; border-bottom:1px solid #f2f4f6; transition:0.1s; ${bgStyle}">${opt}</div>`;
            }).join('');
        }
        wrapper.querySelectorAll('.space-opt-item').forEach(item => {
            item.addEventListener('click', function(e) {
                e.preventDefault(); e.stopPropagation();
                let clickedVal = this.innerText.trim();
                let currentVal = blkSpaceInput.value;
                let parts = currentVal.split(',').map(s=>s.trim());
                if(searchTerm) parts.pop();
                if(clickedVal === '전체 (공간 전체)') { blkSpaceInput.value = '전체 (공간 전체)'; } 
                else {
                    let arr = parts.filter(s => s !== '전체 (공간 전체)' && s !== '');
                    if(!arr.includes(clickedVal)) { arr.push(clickedVal); } else { arr = arr.filter(v => v !== clickedVal); }
                    blkSpaceInput.value = arr.join(', ') + (arr.length > 0 ? ', ' : '');
                }
                blkSpaceInput.focus(); window.renderCustomOptions("");
            });
        });
    };
    let currentVals = blkSpaceInput.value.split(',').map(s=>s.trim()).filter(Boolean);
    let hasInvalid = currentVals.some(v => !window.currentSpaceOpts.includes(v) && v !== "");
    if(hasInvalid) blkSpaceInput.value = '';
    window.renderCustomOptions("");
};

function startRealtimeSync() {
    if(realtimeChannel) return;
    realtimeChannel = supabaseClient.channel('admin-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reservations' }, () => { window.fetchCenterData(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trainings' }, () => { window.fetchCenterData(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => { window.fetchCenterData(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'blocks' }, () => { window.fetchCenterData(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notices' }, () => { window.fetchCenterData(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'applications' }, () => { window.fetchApplications(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'members' }, () => { window.fetchMembers(); })
      .subscribe();
}

function handleLoginSuccess() {
    var lv = $("login-view"); if(lv) lv.classList.remove('active'); 
    var dv = $("dashboard-view"); if(dv) dv.style.display = 'block'; 
    startRealtimeSync();
    
    let savedMain = localStorage.getItem('wecoffee_main_tab') || 'page-center'; 
    let savedSub = localStorage.getItem('wecoffee_sub_tab') || 'sub-res';
    if(savedSub === 'sub-trn' || savedSub === 'sub-blk') savedSub = 'sub-trn-blk';
    let mainEl = document.querySelector(`.gnb-item[onclick*="${savedMain}"]`); 
    if(mainEl) window.switchMainTab(savedMain, mainEl); 
    else window.switchMainTab('page-center', document.querySelector(`.gnb-item[onclick*="page-center"]`));
    if(savedMain === 'page-center') { let subEl = document.querySelector(`.sub-item[onclick*="${savedSub}"]`); if(subEl) window.switchSubTab(savedSub, subEl); }
}

function initializeApp() {
  window.fetchHolidays(new Date().getFullYear());
  if(window.updateDashSpaceFilter) window.updateDashSpaceFilter();
  supabaseClient.auth.getSession().then(({ data: { session } }) => { if (session && !isAppInitialized) { handleLoginSuccess(); isAppInitialized = true; } });
  supabaseClient.auth.onAuthStateChange((event, session) => {
    if (session) { if(!isAppInitialized) { handleLoginSuccess(); isAppInitialized = true; } } 
    else { var lv = $("login-view"); if(lv) lv.classList.add('active'); var dv = $("dashboard-view"); if(dv) dv.style.display = 'none'; isAppInitialized = false; if(realtimeChannel) { supabaseClient.removeChannel(realtimeChannel); realtimeChannel = null; } }
  });
}
if (document.readyState === 'loading') document.addEventListener("DOMContentLoaded", initializeApp); else initializeApp();

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
  localStorage.setItem('wecoffee_sub_tab', subId); 
  if(subId === 'sub-res' || subId === 'sub-trn-blk' || subId === 'sub-ord') { window.fetchCenterData(); }
}

window.handleLogin = async function(e) { e.preventDefault(); const email = $("loginEmail").value, password = $("loginPassword").value; const { error } = await supabaseClient.auth.signInWithPassword({ email, password }); if (error) showToast("접근 권한이 없습니다."); else showToast("접속되었습니다."); }
window.handleLogout = async function() { await supabaseClient.auth.signOut(); showToast("로그아웃 되었습니다."); }

window.openCustomConfirm = function(title, statusHtml, actionHtml, callbackOrText, btnText = '적용하기') {
    if($("confirmTarget")) $("confirmTarget").innerHTML = title;
    if(statusHtml) { if($("confirmStateBox")) $("confirmStateBox").style.display = 'block'; if($("confirmSimpleBox")) $("confirmSimpleBox").style.display = 'none'; if($("confirmStatus")) $("confirmStatus").innerHTML = statusHtml; if($("confirmActionState")) $("confirmActionState").innerHTML = actionHtml; } 
    else { if($("confirmStateBox")) $("confirmStateBox").style.display = 'none'; if($("confirmSimpleBox")) $("confirmSimpleBox").style.display = 'block'; if($("confirmActionSimple")) $("confirmActionSimple").innerHTML = actionHtml; }
    
    let btn = $("confirmBtn");
    if(btn) {
        btn.innerText = btnText; let newBtn = btn.cloneNode(true); btn.parentNode.replaceChild(newBtn, btn);
        newBtn.onclick = function() {
            if(btnText === '복사하기') { window.copyTxt(callbackOrText, "사전 설문 링크가 복사되었습니다."); window.closeConfirmModal(); } 
            else { 
                (async () => {
                    newBtn.disabled = true; let originalText = newBtn.innerText; newBtn.innerText = "처리 중..."; 
                    try { await callbackOrText(); } catch(e) { console.error(e); } 
                    finally { newBtn.disabled = false; newBtn.innerText = originalText; window.closeConfirmModal(); }
                })();
            }
        };
        let cancelBtn = newBtn.previousElementSibling; if(cancelBtn && cancelBtn.tagName === 'BUTTON') { cancelBtn.style.display = (btnText === '확인') ? 'none' : 'block'; }
    }
    if($("confirmModal")) $("confirmModal").classList.add('show');
}
window.closeConfirmModal = function() { if($("confirmModal")) $("confirmModal").classList.remove('show'); }
window.closeOnBackdrop = function(event, modalId) { if (event.target.id === modalId && $(modalId)) $(modalId).classList.remove('show'); }
window.showCancelReason = function(reason) { window.openCustomConfirm("당일 취소 사유", null, `<div style="padding:16px; background:#f9fafb; border-radius:8px; text-align:left; font-size:14px; line-height:1.5; color:var(--text-display); border:1px solid var(--border-strong); white-space:pre-wrap;">${window.escapeHtml(reason || '사유가 기재되지 않았습니다.')}</div>`, () => {}, "확인"); };

window.isOrderExpired = function(order, now) {
    let baseDate = order.delivery_date ? window.parseDeliveryDate(order.delivery_date) : window.safeKST(order.created_at);
    let cancelBaseDate = order.updated_at ? window.safeKST(order.updated_at) : baseDate;
    let status = order.status || '주문 접수';
    
    if (['주문 접수', '입금 대기', '입금 확인 중', '입금 확인', '대기'].includes(status)) return false;
    if (status === '주문 취소' || status === '품절') { return (now.getTime() - cancelBaseDate.getTime()) > 48 * 60 * 60 * 1000; }
    if (status === '센터 도착') { return (now.getTime() - baseDate.getTime()) > 7 * 24 * 60 * 60 * 1000; }
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
        let bHtml = `<option value="전체">전체 기수</option>` + Array.from(bSet).sort((a,b) => parseInt(String(a).replace(/[^0-9]/g, '') || 0) - parseInt(String(b).replace(/[^0-9]/g, '') || 0)).map(b=>`<option value="${b}">${b}</option>`).join("");
        if($("dashBatchFilter") && $("dashBatchFilter").innerHTML !== bHtml) $("dashBatchFilter").innerHTML = bHtml;
        let sSet = new Set(); gRes.forEach(r => { if(r.space_equip) sSet.add(String(r.space_equip).split(' ')[0]); });
        let sHtml = `<option value="전체">전체 공간/장비</option>` + Array.from(sSet).sort().map(s=>`<option value="${s}">${s}</option>`).join("");
        if($("resSpaceFilter") && $("resSpaceFilter").innerHTML.length < 100) $("resSpaceFilter").innerHTML = sHtml;
        let todayForFilter = new Date(); todayForFilter.setHours(0,0,0,0);
        let tSet = new Set(); 
        gTrn.forEach(t => {
            let cInfo = String(t.content||'').split('||').map(s=>s.trim());
            if(cInfo.length >= 5) { 
                let tDateObj = new Date(cInfo[0]); tDateObj.setHours(0,0,0,0);
                if (tDateObj >= todayForFilter) tSet.add(`[${cInfo[0]}] [${cInfo[2]}] ${cInfo[4]}`); 
            } 
            else { tSet.add(String(t.content||'').trim()); }
        });
        let tHtml = `<option value="전체">전체 콘텐츠</option>` + Array.from(tSet).sort().map(c=>`<option value="${window.escapeHtml(c)}">${window.escapeHtml(c)}</option>`).join("");
        if($("trnContentFilter") && $("trnContentFilter").innerHTML.length < 100) $("trnContentFilter").innerHTML = tHtml;
    } catch(err) { console.error("Data prep error:", err); }
  } catch(e) { console.error("fetchCenterData Error:", e); }
  
  try { window.renderCenterData(); } catch(e) { console.error(e); }
  try { window.renderDashboard(); } catch(e) { console.error(e); }
  try { window.renderNoticeData(); } catch(e) { console.error(e); }
  
  try {
      if (!document.getElementById('timeline-area')) {
          const dailyBanner = document.getElementById('dailyInOutBanner');
          const cancelBanner = document.getElementById('cancelAccumulationBanner');
          
          if (dailyBanner && cancelBanner) {
              let commonWrapper = dailyBanner.parentElement;
              while (commonWrapper && !commonWrapper.contains(cancelBanner)) {
                  commonWrapper = commonWrapper.parentElement;
              }
              if (commonWrapper) {
                  const area = document.createElement('div');
                  area.id = 'timeline-area';
                  commonWrapper.insertAdjacentElement('afterend', area);
              }
          } else if (dailyBanner && dailyBanner.parentNode) {
              let wrapper = dailyBanner.parentElement;
              if (wrapper.parentElement && wrapper.parentElement.tagName === 'DIV') {
                  wrapper = wrapper.parentElement; 
              }
              const area = document.createElement('div');
              area.id = 'timeline-area';
              wrapper.insertAdjacentElement('afterend', area);
          }
      }
      if(window.renderTimeline) window.renderTimeline(); 
  } catch(e){ console.error(e); }
}
window.changeResPage = function(page) {
    currentResPage = page;
    window.renderResTablePage();
};

window.toggleResAccordion = function() {
    let wrap = document.getElementById('resTableWrap');
    let pg = document.getElementById('resPaginationWrap');
    let btn = document.getElementById('resAccordionBtn');
    
    if (wrap.style.display === 'none') {
        wrap.style.display = 'block';
        if (pg) pg.style.display = 'flex';
        btn.innerHTML = '접기 ▲';
    } else {
        wrap.style.display = 'none';
        if (pg) pg.style.display = 'none';
        btn.innerHTML = '펼치기 ▼';
    }
};

window.renderTimeline = function() {
    const timelineArea = document.getElementById('timeline-area');
    if (!timelineArea) return;

    let centersToRender = currentGlobalCenter === '전체' ? ['마포 센터', '광진 센터'] : [currentGlobalCenter];
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    
    const START_HOUR = 0;
    const TOTAL_MINUTES = 24 * 60; 

    // 💡 해결: 인라인 <style> 태그를 제거했습니다. 디자인은 파트 1의 글로벌 CSS가 담당합니다.
    let finalHtml = `
        <div class="timeline-section">
            <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 20px; flex-wrap: wrap; gap: 8px;">
                <div style="font-size: 18px; font-weight: 800; color: var(--text-display); margin-bottom: 0; line-height: 1; text-align: left;">
                    실시간 센터 현황 <span style="font-size: 13px; color: var(--text-tertiary); font-weight: 500; margin-left: 8px;">${todayStr} 기준</span>
                </div>
            </div>
    `;

    function generateBar(timeRange, label, typeClass, tooltip) {
        if (!timeRange || !timeRange.includes('~')) return '';
        const [startStr, endStr] = timeRange.split('~');
        const [sh, sm] = startStr.trim().split(':').map(Number);
        const [eh, em] = endStr.trim().split(':').map(Number);
        if (isNaN(sh) || isNaN(eh)) return '';
        const startMins = sh * 60 + (sm || 0);
        const endMins = eh * 60 + (em || 0);
        let startOffset = startMins - (START_HOUR * 60);
        let duration = endMins - startMins;
        if (duration <= 0) return '';
        const left = (startOffset / TOTAL_MINUTES) * 100;
        const width = (duration / TOTAL_MINUTES) * 100;
        return `<div class="timeline-bar ${typeClass}" style="left:${left}%; width:${width}%;" data-tippy="${window.escapeHtml(tooltip)}" onmouseenter="window.showGlobalTooltip(event, this)" onmouseleave="window.hideGlobalTooltip()">${window.escapeHtml(label)}</div>`;
    }

    function isMatch(dbSpace, uiEquip, zoneName) {
        let dbStr = String(dbSpace || '').trim();
        if (uiEquip === 'merged' || uiEquip === '공간 전체') {
            let safeDb = dbStr.replace(/\s+/g, '');
            return safeDb === zoneName.replace(/\s+/g, '') || safeDb.includes('전체');
        }
        
        let uiClean = uiEquip.split('(')[0].trim(); 
        
        let safeUi = uiClean.replace(/\s+/g, '');
        let safeDb = dbStr.replace(/\s+/g, '');
        if (safeDb.includes(safeUi)) return true;
        
        let coreWords = uiClean.split(' '); 
        let allWordsMatch = coreWords.every(word => safeDb.includes(word));
        if (allWordsMatch) return true;
        
        return false;
    }

    function renderBarsFor(equipName, zoneName, centerName) {
        let barsHtml = '';
        gRes.forEach(r => {
            if (r.res_date === todayStr && r.center === centerName && !String(r.status).includes('취소')) {
                if (isMatch(r.space_equip, equipName, zoneName)) {
                    barsHtml += generateBar(r.res_time, `[${r.batch||'-'}] ${r.name}`, 'bar-res', `${r.res_time} | ${r.space_equip} | ${r.name}`);
                }
            }
        });
        gTrn.forEach(t => {
            let cInfo = String(t.content || '').split('||').map(s => s.trim());
            if (cInfo.length >= 5 && cInfo[0] === todayStr && cInfo[3] === centerName && !String(t.status).includes('취소')) {
                if (isMatch(cInfo[4], equipName, zoneName)) {
                    barsHtml += generateBar(cInfo[2], `[수강] ${t.name}`, 'bar-trn', `${cInfo[2]} | ${cInfo[4]} | ${t.name}`);
                }
            }
        });
        gBlk.forEach(b => {
            if (b.block_date === todayStr && b.center === centerName) {
                if (isMatch(b.space_equip, equipName, zoneName) || (!b.space_equip && (equipName === 'merged' || equipName === '공간 전체'))) {
                    barsHtml += generateBar(`${b.start_time}~${b.end_time}`, `[${b.category}] ${b.reason}`, 'bar-blk', `${b.start_time}~${b.end_time} | ${b.reason}`);
                }
            }
        });
        return barsHtml;
    }

    let mapoSpaces = [
        { zone: '에스프레소존', equips: ['공간 전체', '아스토리아 스톰 1번(좌)', '아스토리아 스톰 2번(우)'] },
        { zone: '로스팅존', equips: ['공간 전체', '이지스터 800 1번(좌)', '이지스터 800 2번(우)', '이지스터 1.8', '스트롱홀드 S7X'] },
        { zone: '브루잉존', equips: ['merged'] }, { zone: '커핑존', equips: ['merged'] }, { zone: '스터디존', equips: ['merged'] }
    ];
    let gwangjinSpaces = [
        { zone: '에스프레소존', equips: ['공간 전체', '시네소 MVP 1번(좌)', '시네소 MVP 2번(우)', '페마 페미나', '산레모 You', '이글원 프리마 프로', '이글원 프리마 EXP'] },
        { zone: '로스팅존', equips: ['공간 전체', '이지스터 800 1번(좌)', '이지스터 800 2번(우)', '이지스터 1.8 1번(좌)', '이지스터 1.8 2번'] },
        { zone: '브루잉존', equips: ['merged'] }, { zone: '커핑존', equips: ['merged'] }, { zone: '스터디룸', equips: ['merged'] }
    ];

    centersToRender.forEach((centerName, idx) => {
        let spaceGroups = centerName === '마포 센터' ? mapoSpaces : gwangjinSpaces;
        finalHtml += `
            <div style="${idx > 0 ? 'margin-top: 32px;' : ''}">
                <div style="font-size:15px; font-weight:800; color:var(--text-display); margin-bottom:12px; text-align: left;">${centerName}</div>
                <div class="timeline-container">
                    <div class="timeline-grid">
                        <div class="timeline-header">
                            <div class="resource-label-header">공간 / 장비</div>
                            <div class="time-slots-header">
                                ${Array.from({length: 24}, (_, i) => `<div class="time-slot-num">${String(i).padStart(2,'0')}:00</div>`).join('')}
                            </div>
                        </div>
        `;
        spaceGroups.forEach(group => {
            if (group.equips.length === 1 && group.equips[0] === 'merged') {
                finalHtml += `<div class="timeline-row"><div style="width: 210px; flex-shrink: 0; background: #f4f5f7; border-right: 1px solid #eee; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 800; color: #333d4b;">${group.zone}</div><div class="time-grid-bg">${renderBarsFor('merged', group.zone, centerName)}</div></div>`;
            } else {
                finalHtml += `<div class="zone-group-row"><div class="zone-col">${group.zone}</div><div class="equip-col-wrapper">`;
                group.equips.forEach(eq => {
                    finalHtml += `<div class="timeline-row"><div class="equip-name">${eq}</div><div class="time-grid-bg">${renderBarsFor(eq, group.zone, centerName)}</div></div>`;
                });
                finalHtml += `</div></div>`;
            }
        });
        finalHtml += `</div></div></div>`; 
    });
    timelineArea.innerHTML = finalHtml + `</div>`;
};
