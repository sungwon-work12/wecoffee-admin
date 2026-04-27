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

window.currentEditingBlockId = null;

window.changeGlobalCenter = function(centerValue) {
    currentGlobalCenter = centerValue;
    if(window.updateDashSpaceFilter) window.updateDashSpaceFilter();
    window.fetchCenterData(); 
};

// 💡 [이벤트 위임 완벽 적용]
document.addEventListener('click', function(e) {
    let txt = e.target.innerText || '';
    if (e.target.tagName !== 'SELECT' && e.target.tagName !== 'OPTION') {
        let cleanTxt = txt.trim();
        if (cleanTxt === '전체 센터' || cleanTxt === '마포 센터' || cleanTxt === '광진 센터') {
            let val = cleanTxt === '전체 센터' ? '전체' : cleanTxt;
            if (currentGlobalCenter !== val) {
                window.changeGlobalCenter(val);
            }
            if(e.target.parentElement) {
                Array.from(e.target.parentElement.children).forEach(child => {
                    if(child.style) {
                        child.style.fontWeight = '500';
                        child.style.color = 'var(--text-secondary)';
                    }
                });
                e.target.style.fontWeight = '800';
                e.target.style.color = 'var(--text-display)';
            }
        }
    }

    let targetBtn = e.target.closest('button, .btn');
    if (targetBtn) {
        let btnTxt = (targetBtn.innerText || '').replace(/\s+/g, '');
        if (btnTxt.includes('일괄입금확인')) {
            window.batchUpdateOrderStatus('입금 확인');
        } else if (btnTxt.includes('일괄센터도착')) {
            window.batchUpdateOrderStatus('센터 도착');
        }
    }
});

// 💡 [이벤트 위임] 센터 장비 즉시 연동
document.addEventListener('change', function(e) {
    if (e.target && e.target.tagName === 'SELECT') {
        if (e.target.innerHTML.includes('마포 센터') && e.target.innerHTML.includes('광진 센터') && e.target.id !== 'dashSpaceFilter' && e.target.id !== 'blkCenter') {
            window.changeGlobalCenter(e.target.value);
        }
    }
    
    if (e.target.id === 'filterPendingOrd' || e.target.id === 'ordVendorFilter' || e.target.id === 'resSpaceFilter' || e.target.id === 'trnContentFilter') {
        window.renderCenterData();
    }
    
    if (e.target.id === 'blkCenter') {
        if(window.updateSpaceOptions) window.updateSpaceOptions();
    }
});

document.addEventListener('input', function(e) {
    if (e.target.id === 'searchOrd' || e.target.id === 'searchRes' || e.target.id === 'searchTrn' || e.target.id === 'memberSearch') {
        if (e.target.id === 'memberSearch') {
            window.searchMembers();
        } else {
            window.renderCenterData();
        }
    }
});

// 💡 [툴팁 및 커스텀 스타일 수정] 툴팁 UI 붕괴 버그 해결
if (!document.getElementById('wecoffee-custom-styles')) {
    let style = document.createElement('style');
    style.id = 'wecoffee-custom-styles';
    style.innerHTML = `
        .info-tooltip { position: relative; display: inline-flex; align-items: center; justify-content: center; margin-left: 8px; cursor: help; color: #b0b8c1; vertical-align: middle; transition: 0.2s; font-style: normal !important; font-weight: 700; width: 18px; height: 18px; border-radius: 50%; border: 1.5px solid #b0b8c1; font-size: 11px; line-height: 1; font-family: sans-serif; }
        .info-tooltip:hover { color: #505967; border-color: #505967; }
        .info-tooltip::after { content: attr(data-tooltip); position: absolute; bottom: 130%; left: -10px; background: #333d4b; color: #fff; padding: 10px 14px; border-radius: 8px; font-size: 13px; font-weight: 500; white-space: pre-wrap; width: max-content; max-width: 260px; z-index: 9999; margin-bottom: 4px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); line-height: 1.5; opacity: 0; visibility: hidden; pointer-events: none; transition: 0.2s; text-align: left; word-break: keep-all; font-style: normal; }
        .info-tooltip:hover::after { opacity: 1; visibility: visible; }
        
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

        @media (max-width: 1024px) {
            .mem-action-wrap { flex-wrap: nowrap !important; overflow-x: auto; }
        }

        @media (max-width: 768px) {
            .mem-action-wrap { flex-direction: column !important; align-items: stretch !important; gap: 8px !important; width: 100%; overflow-x: visible; }
            .mem-action-row { width: 100%; justify-content: space-between; flex-wrap: wrap !important; gap: 6px; }
            .mem-action-row select { flex: 1; min-width: 0; padding-left: 8px !important; padding-right: 28px !important; }
            .apply-date-btn, .action-btns button { flex-shrink: 0; }
        }
    `;
    document.head.appendChild(style);
}

window.escapeHtml = function(unsafe) { if (!unsafe) return ''; return String(unsafe).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;"); };

window.safeKST = function(dateStr) {
    if(!dateStr) return new Date();
    let str = String(dateStr).split(' ')[0].split('T')[0];
    let d = new Date(str);
    if(isNaN(d.getTime())) {
        str = str.replace(/-/g, '/');
        d = new Date(str);
    }
    return isNaN(d.getTime()) ? new Date() : d;
};

window.parseDeliveryDate = function(dateStr) {
    if(!dateStr) return new Date();
    let str = String(dateStr).trim();
    let currentYear = new Date().getFullYear();
    
    let m = str.match(/(\d{1,2})[\/\-\.월]\s*(\d{1,2})/);
    if (m) {
        return new Date(currentYear, parseInt(m[1], 10) - 1, parseInt(m[2], 10));
    }
    
    let d = new Date(str);
    if(!isNaN(d.getTime())) {
        if(d.getFullYear() < 2010) d.setFullYear(currentYear);
        return d;
    }
    return new Date();
};

window.formatDeliveryDateFull = function(dateStr) {
    if(!dateStr) return '미정';
    let d = window.parseDeliveryDate(dateStr);
    let dow = ['일','월','화','수','목','금','토'][d.getDay()];
    return `${d.getMonth()+1}월 ${d.getDate()}일 ${dow}요일`;
};

window.formatDeliveryDay = function(dateStr) {
    if(!dateStr) return '미정';
    let d = window.parseDeliveryDate(dateStr);
    return ['일','월','화','수','목','금','토'][d.getDay()];
};

window.getOrderTargetFull = function(itemName) {
    let m = String(itemName).match(/(?:희망:\s*)?(\d+)[\/\.](\d+)\s*\((월|화|수|목|금|토|일)\)/);
    if (m) return `${parseInt(m[1])}월 ${parseInt(m[2])}일 ${m[3]}요일`; 
    let m2 = String(itemName).match(/\((월|화|수|목|금|토|일)\)/);
    if (m2) return `${m2[1]}요일`;
    return '월요일'; 
};
window.getOrderTargetDay = function(itemName) {
    let m = String(itemName).match(/(?:희망:\s*)?(\d+)[\/\.](\d+)\s*\((월|화|수|목|금|토|일)\)/);
    if(m) return m[3];
    let m2 = String(itemName).match(/\((월|화|수|목|금|토|일)\)/);
    if (m2) return m2[1];
    return '월';
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

function getDow(dStr) { if(!dStr) return ''; const d = window.safeKST(dStr); return ['일','월','화','수','목','금','토'][d.getDay()]; }
function formatDtWithDow(dateStr) { if(!dateStr) return "-"; const d = window.safeKST(dateStr); if(isNaN(d.getTime())) return dateStr; const dow = ['일','월','화','수','목','금','토'][d.getDay()]; return `${d.getFullYear().toString().slice(-2)}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')}(${dow}) ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`; }
function formatDt(dateStr) { if(!dateStr) return "-"; const d = window.safeKST(dateStr); return `${d.getFullYear().toString().slice(-2)}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`; }
function comma(str) { return Number(String(str).replace(/[^0-9]/g, '')).toLocaleString(); }
function showToast(msg) { const toast = $("toast"); if(!toast) return; toast.innerText = msg; toast.classList.add('show'); setTimeout(() => toast.classList.remove('show'), 3500); }

window.toggleAll = function(checkbox, targetClass) { 
    const checkboxes = document.querySelectorAll('.' + targetClass); 
    checkboxes.forEach(cb => { if (!cb.disabled) cb.checked = checkbox.checked; }); 
};

window.batchUpdateOrderStatus = async function(statusText) {
    let checkedBoxes = document.querySelectorAll('.chk-ord-dynamic:checked, .chk-ord:checked, .chk-ord-thu:checked');
    let idsToUpdate = Array.from(checkedBoxes).map(cb => String(cb.value));
    
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
      if(evts.length === 0) { html += `<div class="inout-card"><div style="font-weight:800; margin-bottom:8px; color:var(--text-display); border-bottom:1px solid var(--border-strong); padding-bottom:8px;">${c}</div><div style="font-size:13px; color:var(--text-secondary); padding:8px 0;">오늘 확정된 예약이 없습니다.</div></div>`; } 
      else { 
          let first = [...evts].sort((a,b) => String(a.start||'').localeCompare(String(b.start||'')))[0]; let last = [...evts].sort((a,b) => String(b.end||'').localeCompare(String(a.end||'')))[0]; 
          html += `<div class="inout-card" style="padding: 16px; gap: 8px; border-radius:12px; border:1px solid var(--border-strong); background:#fff; align-items:flex-start; text-align:left; width:100%; box-sizing:border-box;"><div style="font-weight:800; font-size:15px; margin-bottom:12px; color:var(--text-display); border-bottom:1px solid var(--border-strong); padding-bottom:8px; width:100%;">${c}</div><div style="display:flex; align-items:center; justify-content:space-between; margin-bottom: 8px; width:100%;"><span style="font-weight:600; font-size:14px; color:var(--text-display);">[${first.space||''}] ${window.escapeHtml(first.name||'')}</span><span style="color:var(--text-secondary); font-size:13px; font-weight:600;">첫 입실 <strong style="color:var(--text-display); font-weight:600;">${first.start||''}</strong></span></div><div style="display:flex; align-items:center; justify-content:space-between; margin-bottom: 0px; width:100%;"><span style="font-weight:600; font-size:14px; color:var(--text-display);">[${last.space||''}] ${window.escapeHtml(last.name||'')}</span><span style="color:var(--text-secondary); font-size:13px; font-weight:600;">최종 퇴실 <strong style="color:var(--text-display); font-weight:600;">${last.end||''}</strong></span></div></div>`; 
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
    if (sorted.length === 0) { html = `<div class="inout-card" style="text-align:center; color:var(--text-secondary); padding:16px; background:#fff; border:1px solid var(--border-strong); border-radius:12px;">이번 달 당일 취소 내역이 없습니다.</div>`; } 
    else { sorted.forEach(user => { let isWarning = user.count >= 4; let style = isWarning ? 'border:1px solid var(--error); background:#fff0f0;' : 'border:1px solid var(--border-strong); background:#fff;'; let nameColor = isWarning ? 'color:var(--error); font-weight:800;' : 'color:var(--text-display); font-weight:700;'; let warningBadge = isWarning ? `<span style="background:var(--error); color:#fff; font-size:11px; padding:2px 6px; border-radius:4px; margin-left:8px; font-weight:700;">경고</span>` : ''; html += `<div style="padding:12px 16px; border-radius:12px; display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; ${style}"><div style="${nameColor}">[${user.batch||'-'}] ${window.escapeHtml(user.name)} ${warningBadge}</div><div style="font-size:14px; font-weight:800; ${isWarning ? 'color:var(--error);' : 'color:var(--text-secondary);'}">${user.count}회</div></div>`; }); }
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
        window.currentSpaceOpts.push('에스프레소존', '아스토리아 스톰 1번그룹 (좌)', '아스토리아 스톰 2번그룹 (우)', '로스팅존', '이지스터 800 1번 (좌)', '이지스터 800 2번 (우)', '이지스터 1.8', '스트롱홀드 S7X', '브루잉존', '커핑존', '스터디존');
    } else {
        window.currentSpaceOpts.push('에스프레소존', '시네소 MVP 하이드라 1번그룹 (좌)', '시네소 MVP 하이드라 2번그룹 (우)', '페마 페미나 1그룹', '산레모 You 1그룹', '빅토리아 아르두이노 이글원 프리마 프로 1그룹', '빅토리아 아르두이노 이글원 프리마 EXP 1그룹', '로스팅존', '이지스터 800 1번 (좌)', '이지스터 800 2번 (우)', '이지스터 1.8 1번 (좌)', '이지스터 1.8 2번', '브루잉존', '커핑존', '스터디룸');
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

        if(filteredOpts.length === 0) {
            wrapper.innerHTML = `<div style="padding:10px 12px; font-size:13px; color:var(--text-secondary);">검색 결과가 없습니다.</div>`;
        } else {
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
                
                blkSpaceInput.focus();
                window.renderCustomOptions("");
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
            else if(btnText === '확인' || btnText === '취소 확정') { 
                (async () => {
                    newBtn.disabled = true; let originalText = newBtn.innerText; newBtn.innerText = "처리 중..."; 
                    try { await callbackOrText(); } catch(e) { console.error(e); } 
                    finally { newBtn.disabled = false; newBtn.innerText = originalText; window.closeConfirmModal(); }
                })();
            } else { 
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
    let oDate = window.safeKST(order.created_at); let status = order.status || '주문 접수';
    if (['주문 접수', '입금 대기', '입금 확인 중', '입금 확인', '대기'].includes(status)) return false;
    if (status === '주문 취소' || status === '품절') return (now.getTime() - oDate.getTime()) > 48 * 60 * 60 * 1000;
    if (status === '센터 도착') return (now.getTime() - oDate.getTime()) > 7 * 24 * 60 * 60 * 1000;
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
                if (tDateObj >= todayForFilter) {
                    tSet.add(`[${cInfo[0]}] [${cInfo[2]}] ${cInfo[4]}`); 
                }
            } 
            else { tSet.add(String(t.content||'').trim()); }
        });
        let tHtml = `<option value="전체">전체 콘텐츠</option>` + Array.from(tSet).sort().map(c=>`<option value="${window.escapeHtml(c)}">${window.escapeHtml(c)}</option>`).join("");
        if($("trnContentFilter") && $("trnContentFilter").innerHTML.length < 100) $("trnContentFilter").innerHTML = tHtml;

    } catch(err) {}
  } catch(e) { console.error("fetchCenterData Error:", e); }

  try { window.renderCenterData(); window.renderDashboard(); window.renderNoticeData(); } catch(e){ console.error(e); }
}

window.renderCenterData = function() {
  const now = new Date(); 
  const oneMonthAgo = new Date(); oneMonthAgo.setDate(now.getDate() - 30);
  let todayForBlk = new Date(); todayForBlk.setHours(0,0,0,0);

  try { window.updateDailyInOutBanner(); if(window.updateCancelAccumulationBanner) window.updateCancelAccumulationBanner(); } catch(e) {}
  
  try {
      // 💡 [버그 수정] innerHTML += 방식의 DOM 리셋을 피해 insertAdjacentHTML 적용 (아이콘 UI 깨짐 방지)
      const addTooltipToText = (textMatch, id, tooltipText, isLong = false) => {
          let titles = document.querySelectorAll('.page-title, .section-title, h2, h3, .table-toolbar > div, .sub-page-title');
          titles.forEach(el => {
              if(el.textContent.includes(textMatch) && !document.getElementById(id) && !el.closest('#dynamic-ord-container')) {
                  let sub = el.querySelector('.sub-text'); if(sub) sub.remove();
                  el.style.display = 'flex'; el.style.alignItems = 'center'; el.style.gap = '6px';
                  el.insertAdjacentHTML('beforeend', `<i id="${id}" class="info-tooltip ${isLong ? 'long-text' : ''}" data-tooltip="${tooltipText}">i</i>`);
              }
          });
      };
      
      let resTitle = document.querySelector('#sub-res .table-toolbar .section-title');
      if(resTitle && resTitle.textContent.includes('상세 예약 로그')) resTitle.innerHTML = '센터 예약 리스트';
      
      addTooltipToText('센터 예약 리스트', 'tt-res', '최근 1개월(30일) 내의 예약만 표시됩니다. 이전 내역은 서버에 안전하게 보관됩니다.', true);
      addTooltipToText('수업 및 훈련', 'tt-trn', '종료된 일정은 자정(다음 날)을 기점으로 리스트에서 자동 정리되며, 과거 내역은 서버에 보관됩니다.', true);
      addTooltipToText('생두 주문 관리', 'tt-ord-main', "주문 및 입금 관련 상태는 리스트에 계속 유지됩니다. 단, '취소/품절' 건은 2일 뒤, '센터 도착' 건은 7일 뒤 자동 정리되어 서버에 보관됩니다.", true);
  } catch(e) {}

  try {
      let resTable = $("resTableBody")?.closest('table');
      if(resTable) { 
          let theadTr = resTable.querySelector('thead tr');
          if (theadTr) {
              let firstTh = theadTr.querySelector('th');
              if (firstTh && !firstTh.querySelector('input[type="checkbox"]') && firstTh.innerText.includes('접수')) {
                  let chkTh = document.createElement('th'); chkTh.style.width = '48px'; chkTh.style.textAlign = 'center';
                  chkTh.innerHTML = '<input type="checkbox" onchange="window.toggleAll(this, \'chk-res\')">';
                  theadTr.insertBefore(chkTh, firstTh);
              }
          }
          let masterChk = resTable.querySelector('thead input[type="checkbox"]'); 
          if(masterChk) masterChk.onchange = function() { window.toggleAll(this, 'chk-res'); }; 
      }

      let trnTable = $("trnTableBody")?.closest('table');
      if(trnTable) { 
          let theadTr = trnTable.querySelector('thead tr');
          if (theadTr) {
              let firstTh = theadTr.querySelector('th');
              if (firstTh && !firstTh.querySelector('input[type="checkbox"]') && (firstTh.innerText.includes('신청') || firstTh.innerText.includes('일시'))) {
                  let chkTh = document.createElement('th'); chkTh.style.width = '48px'; chkTh.style.textAlign = 'center';
                  chkTh.innerHTML = '<input type="checkbox" onchange="window.toggleAll(this, \'chk-trn\')">';
                  theadTr.insertBefore(chkTh, firstTh);
              }
          }
          let masterChk = trnTable.querySelector('thead input[type="checkbox"]'); 
          if(masterChk) masterChk.onchange = function() { window.toggleAll(this, 'chk-trn'); }; 
      }
  } catch(e) {}

  try {
      let qRes = ($("searchRes")?.value || "").toLowerCase(); let sRes = $("resSpaceFilter")?.value || "전체";
      let fRes = gRes.filter(r => { 
          let rDate = window.safeKST(r.res_date || r.created_at); 
          let matchSpace = sRes === '전체' || String(r.space_equip||'').includes(sRes);
          return (rDate >= oneMonthAgo) && (currentGlobalCenter === '전체' || r.center === currentGlobalCenter) && (`${r.name} ${r.phone}`.toLowerCase().includes(qRes)) && matchSpace; 
      });
      if($("resTableBody")) $("resTableBody").innerHTML = fRes.length ? fRes.map(r=>{ 
          let displayStatus = r.status || ''; let isExpired = false;
          if (r.res_time && r.res_date && !String(displayStatus).includes('취소')) { 
              let endTimeStr = String(r.res_time).split('~')[1];
              if(endTimeStr) { let [hh, mm] = endTimeStr.trim().split(':'); let resEndObj = new Date(`${r.res_date}T${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}:00`); if (resEndObj < now) { displayStatus = '이용완료'; isExpired = true; } }
          } 
          let actBtn = (String(displayStatus).includes('취소') || displayStatus === '이용완료' || isExpired) 
            ? `<button class="btn-outline btn-sm" disabled style="opacity:0.5; cursor:not-allowed;">취소</button>` : `<button class="btn-outline btn-sm" onclick="window.cancelAction('reservations', '${r.id}')">취소</button>`; 
          let badgeClass = displayStatus === '당일 취소' ? 'badge-red' : (String(displayStatus).includes('취소') ? 'badge-gray' : (displayStatus === '이용완료' ? 'badge-gray' : (displayStatus === '예약완료' ? 'badge-green' : 'badge-gray'))); 
          let statHtml = '';
          if(displayStatus === '당일 취소') { let safeReason = window.escapeHtml(r.cancel_reason || '사유 미기재').replace(/'/g, "\\'"); statHtml = `<span class="status-badge ${badgeClass}" style="cursor:pointer;" onclick="event.stopPropagation(); window.showCancelReason('${safeReason}')" title="클릭하여 사유 확인">${displayStatus}</span>`; } else { statHtml = `<span class="status-badge ${badgeClass}">${displayStatus}</span>`; }

          let dow = getDow(r.res_date); 
          let mPreview = `<td class="m-preview has-checkbox" onclick="this.closest('tr').classList.toggle('expanded')"><div class="m-prev-top"><span class="m-prev-date" style="font-weight:700; color:var(--primary); font-size:13px;">[${r.batch||'-'}] ${window.escapeHtml(r.name)}</span>${statHtml}</div><div class="m-prev-title" style="font-size:18px; color:var(--text-display); letter-spacing:-0.5px;">${r.res_date}(${dow}) ${r.res_time}</div><div class="m-prev-desc" style="font-size:13px; font-weight:500;">[${r.center}] ${r.space_equip || '-'}</div><span class="m-toggle-hint">상세 정보 보기 ▼</span></td>`; 
          return `<tr>${mPreview}<td data-label="선택" class="tc"><input type="checkbox" class="chk-res" value="${r.id}" ${String(displayStatus).includes('취소')?'disabled':''}></td><td data-label="접수일">${formatDt(r.created_at)}</td><td data-label="기수">${r.batch||'-'}</td><td data-label="성함"><strong>${window.escapeHtml(r.name)}</strong></td><td data-label="연락처">${window.escapeHtml(r.phone)}</td><td data-label="예약일">${r.res_date}</td><td data-label="시간">${r.res_time}</td><td data-label="공간">${r.center} <span class="sub-text">${r.space_equip}</span></td><td data-label="상태" class="tc">${statHtml}</td><td data-label="관리">${actBtn}</td></tr>`; 
      }).join("") : `<tr><td colspan="11" class="empty-state">내역 없음</td></tr>`;
  } catch(e) { console.error(e); }
  
  try {
      let qTrn = ($("searchTrn")?.value || "").toLowerCase(); let sTrn = $("trnContentFilter")?.value || "전체";
      let trnSearchInput = $("searchTrn");
      if(trnSearchInput) {
          let filterWrap = trnSearchInput.closest('.filter-wrap') || trnSearchInput.parentNode;
          if(filterWrap && !document.getElementById('btn-download-attendance')) {
              let btnHtml = `<button id="btn-download-attendance" class="btn-outline btn-sm" style="margin-left:8px; height:36px;" onclick="window.downloadAttendanceExcel()">참가자 리스트 다운로드</button>`;
              filterWrap.insertAdjacentHTML('beforeend', btnHtml);
          }
      }

      let fTrnList = gTrn.filter(t => { 
          let matchContent = true; 
          let cInfo = String(t.content||'').split('||').map(s=>s.trim());
          if(sTrn !== '전체') { 
              let targetStr = cInfo.length >= 5 ? `[${cInfo[0]}] [${cInfo[2]}] ${cInfo[4]}` : String(t.content||'').trim(); 
              if(targetStr.replace(/\s+/g, '') !== sTrn.replace(/\s+/g, '')) matchContent = false; 
          }
          if (cInfo.length >= 5) { let tDateObj = new Date(cInfo[0]); tDateObj.setHours(0,0,0,0); if (tDateObj < todayForBlk) return false; } else { let tDate = window.safeKST(t.created_at); if (tDate < oneMonthAgo) return false; }
          return (currentGlobalCenter === '전체' || String(t.content||"").includes(currentGlobalCenter)) && (`${t.name} ${t.phone} ${t.content}`.toLowerCase().includes(qTrn)) && matchContent; 
      });

      window.currentFilteredTrn = fTrnList; 

      if($("trnTableBody")) $("trnTableBody").innerHTML = fTrnList.length ? fTrnList.map(t=>{ 
          let displayStatus = t.status || ''; let actBtn = String(displayStatus).includes('취소') ? '' : `<button class="btn-outline btn-sm" onclick="window.cancelAction('trainings', '${t.id}')">취소</button>`; 
          let cInfo = String(t.content||'').split('||').map(s=>s.trim()); let niceContent = t.content; let preDate = cInfo[0]||'-', preTime = cInfo[2]||'-', preCenter = cInfo[3]||'-', preName = cInfo[4]||'-'; 
          
          let baseContent = String(t.content||'').trim();
          let attendCount = gTrn.filter(x => x.phone === t.phone && !String(x.status||'').includes('취소') && String(x.content||'').trim() === baseContent).length;
          t._attendCount = attendCount; let nthBadge = attendCount >= 2 ? `<span class="nth-badge">${attendCount}회차</span>` : '';

          if(cInfo.length >= 5) { niceContent = `<div style="margin-bottom:4px; font-size:12px; color:var(--text-secondary);">[${cInfo[3]}] ${cInfo[0]} (${cInfo[2]})</div><div style="font-weight:600; color:var(--text-display); line-height:1.4;">${window.escapeHtml(cInfo[4])} <span style="font-weight:400; color:var(--text-tertiary); margin-left:4px;">- ${cInfo[1]||''}</span></div>`; } 

          let badgeClass = displayStatus === '당일 취소' ? 'badge-red' : (String(displayStatus).includes('취소') ? 'badge-gray' : (displayStatus === '접수완료' ? 'badge-green' : 'badge-gray')); 
          let statHtml = '';
          if(displayStatus === '당일 취소') { let safeReason = window.escapeHtml(t.cancel_reason || '사유 미기재').replace(/'/g, "\\'"); statHtml = `<span class="status-badge ${badgeClass}" style="cursor:pointer;" onclick="event.stopPropagation(); window.showCancelReason('${safeReason}')" title="클릭하여 사유 확인">${displayStatus}</span>`; } else { statHtml = `<span class="status-badge ${badgeClass}">${displayStatus}</span>`; }

          let dow = getDow(preDate); 
          let mPreview = `<td class="m-preview has-checkbox" onclick="this.closest('tr').classList.toggle('expanded')"><div class="m-prev-top"><span class="m-prev-date" style="font-weight:700; color:var(--primary); font-size:13px;">[${t.batch||'-'}] ${window.escapeHtml(t.name)} ${nthBadge}</span>${statHtml}</div><div class="m-prev-title" style="font-size:18px; color:var(--text-display); letter-spacing:-0.5px;">${preDate}(${dow}) ${preTime}</div><div class="m-prev-desc" style="font-size:13px; font-weight:500;">[${preCenter}] ${window.escapeHtml(preName)}</div><span class="m-toggle-hint">상세 정보 보기 ▼</span></td>`; 
          return `<tr>${mPreview}<td data-label="선택" class="tc"><input type="checkbox" class="chk-trn" value="${t.id}" ${String(displayStatus).includes('취소')?'disabled':''}></td><td data-label="신청일">${formatDt(t.created_at)}</td><td data-label="기수">${t.batch||'-'}</td><td data-label="성함" style="white-space:nowrap;"><strong style="vertical-align:middle;">${window.escapeHtml(t.name)}</strong>${nthBadge}</td><td data-label="연락처">${window.escapeHtml(t.phone)}</td><td data-label="정보">${niceContent}</td><td data-label="상태" class="tc">${statHtml}</td><td data-label="관리">${actBtn}</td></tr>`; 
      }).join("") : `<tr><td colspan="9" class="empty-state">내역 없음</td></tr>`;
  } catch(e) { console.error(e); }

  try {
      let qOrd = ($("searchOrd")?.value || "").toLowerCase(); 
      let vOrd = $("ordVendorFilter")?.value || "전체"; 
      let isOrdFilter = $("filterPendingOrd")?.checked; 

      let fOrd = gOrd.filter(o => { 
        let matchCenter = (currentGlobalCenter === '전체' || o.center === currentGlobalCenter); 
        let matchQ = `${o.name} ${o.phone} ${o.vendor} ${o.item_name} ${o.center||''}`.toLowerCase().includes(qOrd); 
        let matchV = vOrd === '전체' ? true : o.vendor === vOrd; 
        
        let matchS = isOrdFilter ? (o.status==='주문 접수'||o.status==='입금 대기'||o.status==='입금 확인 중') : true; 
        return matchCenter && matchQ && matchV && matchS; 
      }); 
      
      if (!isOrdFilter) { fOrd = fOrd.filter(o => !window.isOrderExpired(o, now)); }
      
      let groupedOrders = {};
      fOrd.forEach(o => {
          let dateKey = window.formatDeliveryDateFull(o.delivery_date);
          o._targetBadge = ''; 
          
          if (!groupedOrders[dateKey]) groupedOrders[dateKey] = [];
          groupedOrders[dateKey].push(o);
      });

      let sortedKeys = Object.keys(groupedOrders).sort((a, b) => {
          return window.parseDeliveryDate(groupedOrders[a][0].delivery_date) - window.parseDeliveryDate(groupedOrders[b][0].delivery_date);
      });

      let dynamicHtml = '';
      if (sortedKeys.length === 0) {
          dynamicHtml = `<div class="table-wrap" style="margin-bottom: 32px;"><div class="empty-state">발주 내역이 없습니다.</div></div>`;
      } else {
          sortedKeys.forEach((key) => {
              let list = groupedOrders[key];
              dynamicHtml += `<div class="section-title" style="margin-bottom:12px; display:flex; align-items:center; flex-wrap:wrap;"><span style="background:#212529;color:#fff;padding:6px 12px;border-radius:8px;font-size:14px;font-weight:700;display:inline-block; letter-spacing:-0.5px;">${key} 발주</span></div>`;
              dynamicHtml += `<div class="table-wrap" style="margin-bottom: 32px;">
                  <table>
                      <thead>
                          <tr>
                              <th style="width:48px; text-align:center;"><input type="checkbox" onchange="window.toggleAll(this, 'chk-ord-dynamic')"></th>
                              <th>주문 시간</th>
                              <th>수령 센터</th>
                              <th>기수</th>
                              <th>성함</th>
                              <th>연락처</th>
                              <th>생두사 / 상품명</th>
                              <th>수량</th>
                              <th>총 금액 입력</th>
                              <th>상태 관리</th>
                          </tr>
                      </thead>
                      <tbody>
                          ${generateOrderRows(list, 'chk-ord-dynamic')}
                      </tbody>
                  </table>
              </div>`;
          });
      }

      let ordTab = document.getElementById('sub-ord');
      if (ordTab) {
          let container = document.getElementById('dynamic-ord-container');
          if (!container) {
              container = document.createElement('div');
              container.id = 'dynamic-ord-container';
              let filterWrap = ordTab.querySelector('.filter-wrap');
              if (filterWrap) filterWrap.parentNode.insertBefore(container, filterWrap.nextSibling);
              else ordTab.appendChild(container);
          }
          container.innerHTML = dynamicHtml;

          Array.from(ordTab.children).forEach(child => {
              if (child.id !== 'dynamic-ord-container' && 
                  !child.classList.contains('filter-wrap') && 
                  !child.classList.contains('table-toolbar') &&
                  !child.querySelector('.filter-wrap')) {
                  child.style.display = 'none';
              }
          });
      }
  } catch(e) { console.error(e); }

  try {
      let fBlk = gBlk.filter(b => {
          let bDate = new Date(b.block_date); bDate.setHours(0,0,0,0);
          let matchCenter = (currentGlobalCenter === '전체' || b.center === currentGlobalCenter); return matchCenter && (bDate >= todayForBlk); 
      }); 
      
      if($("blkTableBody")) $("blkTableBody").innerHTML = fBlk.length ? fBlk.map(b=>{ 
          let capVal = b.capacity; let max = capVal === null ? null : parseInt(capVal); let current = 0; 
          if(max !== null) {
              let bTime = `${b.start_time}~${b.end_time}`; let bTitle = `[${b.category}] ${b.reason}`;
              current = gTrn.filter(t => {
                  if (String(t.status||'').includes('취소')) return false;
                  let cInfo = String(t.content||'').split('||').map(s => s.trim());
                  if (cInfo.length >= 5) { return cInfo[0] === b.block_date && cInfo[2] === bTime && cInfo[3] === b.center && cInfo[4] === bTitle; } return false;
              }).length;
          }
          
          let capDisplay = '-';
          if (max !== null) {
              if (max === 0) { capDisplay = `<span style="color:var(--primary); font-weight:800; font-size:12px; border:1px solid var(--primary); padding:4px 8px; border-radius:12px; white-space:nowrap; background:#fff;">오픈 예정</span>`; } 
              else if (current >= max) { capDisplay = `<strong style="color:var(--error);">마감 (${max}명)</strong>`; } 
              else { capDisplay = `<strong>${current}</strong> / ${max}`; }
          }

          let dow = getDow(b.block_date); 
          let mPreview = `<td class="m-preview" onclick="this.closest('tr').classList.toggle('expanded')"><div class="m-prev-top"><span class="m-prev-date" style="font-weight:700; color:var(--primary); font-size:13px;">${b.category}</span></div><div class="m-prev-title" style="font-size:18px; color:var(--text-display); letter-spacing:-0.5px;">${b.block_date}(${dow}) ${b.start_time}~${b.end_time}</div><div class="m-prev-desc" style="font-size:13px; font-weight:500;">[${b.center}] ${b.space_equip || '전체'}</div><span class="m-toggle-hint">상세 정보 보기 ▼</span></td>`; 
          return `<tr>${mPreview}<td data-label="날짜"><strong>${b.block_date}</strong></td><td data-label="시간">${b.start_time} ~ ${b.end_time}</td><td data-label="구분"><span style="color:var(--primary);font-weight:600;">${b.category}</span></td><td data-label="공간">${b.center} <span class="sub-text">${b.space_equip || '전체'}</span></td><td data-label="사유">${window.escapeHtml(b.reason)}</td><td data-label="정원" class="tc">${capDisplay}</td><td data-label="관리" class="tc"><div class="action-wrap-flex"><button class="btn-outline btn-sm" onclick="window.editBlock('${b.id}')">수정</button> <button class="btn-outline btn-sm" onclick="window.deleteBlock('${b.id}')" style="color:var(--error);border-color:var(--error)">삭제</button></div></td></tr>` 
      }).join("") : `<tr><td colspan="8" class="empty-state">진행 예정인 스케줄이 없습니다.</td></tr>`;
  } catch(e) { console.error(e); }
}

function generateOrderRows(fOrd, chkClass) { 
  return fOrd.map(o=>{ 
    let badgeClass = (o.status==='주문 취소' || o.status==='품절')?'st-ghosted':o.status==='센터 도착'?'st-completed':o.status==='입금 확인'?'st-confirmed':(o.status==='입금 대기'||o.status==='입금 확인 중')?'st-arranging':'st-wait'; 
    let cNm = o.item_name || ""; let m = String(cNm).match(/(.+) \[(?:희망:\s*)?(\d+)[\/\.](\d+)\s*\((월|화|수|목|금|토|일)\).*?\]/); if(m) cNm = m[1].trim(); else { let oM = String(cNm).match(/(.+) \[(.*?)\]/); if(oM) cNm = oM[1].trim(); } 
    let centerBadge = `<span style="background:var(--border); color:var(--text-display); padding:6px 10px; border-radius:8px; font-size:13px; font-weight:700; white-space:nowrap;">${o.center||'미지정'}</span>`; 
    let vendorUrl = o.link ? o.link : (o.url ? o.url : '#'); let vendorHtml = `<a href="${vendorUrl}" target="_blank" style="color:var(--text-secondary); font-weight:700; font-size:13px; text-decoration:none; cursor:pointer;" onmouseover="this.style.textDecoration='underline'" onmouseout="this.style.textDecoration='none'">${o.vendor}</a>`; 
    let copyableHtml = `<div class="copyable-wrap" onclick="window.copyTxt('${String(cNm).replace(/'/g, "\\'")}')" data-full-text="${String(cNm).replace(/"/g, '&quot;')}" title="클릭하여 복사"><div style="display:flex; align-items:center; width:100%; min-width: 0;"><span class="copyable-text">${cNm}</span><span class="copyable-hint">복사</span></div></div>`; 
    let cTxtPreview = o.center ? `<span style="background:var(--border); color:var(--text-secondary); padding:2px 6px; border-radius:4px; font-size:11px; font-weight:600; margin-right:6px; vertical-align:middle; white-space:nowrap;">${o.center}</span>` : ''; 
    let targetBadgeHtml = o._targetBadge || ''; 
    let mPreview = `<td class="m-preview has-checkbox" onclick="this.closest('tr').classList.toggle('expanded')"><div class="m-prev-top"><span class="m-prev-date">${formatDtWithDow(o.created_at)}</span><span class="status-badge ${badgeClass}">${o.status}</span></div><div class="m-prev-title">${targetBadgeHtml}[${o.batch||'-'}] <span style="font-weight:800;">${o.name}</span> <span style="font-size:13px; font-weight:500; color:var(--text-secondary); margin-left:4px;">(${o.quantity})</span></div><div class="m-prev-desc" style="color:var(--text-display); font-weight:500; line-height:1.5;">${cTxtPreview}<span style="font-size:12px; color:var(--text-secondary); margin-right:4px;">${o.vendor}</span>${cNm}</div><span class="m-toggle-hint">상세 정보 보기 ▼</span></td>`; 
    
    return `<tr style="border-bottom: 1px solid var(--border-strong);">${mPreview}<td data-label="선택" class="tc" style="text-align:center;"><input type="checkbox" class="chk-ord ${chkClass}" value="${o.id}"></td><td data-label="주문 시간" style="white-space:nowrap; text-align:left; color:var(--text-display); font-size:14px; font-weight:500;">${formatDt(o.created_at).split(' ')[1]}</td><td data-label="수령 센터" class="tc" style="text-align:center;">${centerBadge}</td><td data-label="기수" class="tc" style="color:var(--text-secondary); font-size:14px; font-weight:600; text-align:center;">${o.batch||'-'}</td><td data-label="성함" style="text-align:left;"><strong style="font-weight:800; color:var(--text-display); font-size:15px; white-space:nowrap;">${o.name}</strong></td><td data-label="연락처" style="white-space:nowrap; text-align:left; color:var(--text-secondary); font-size:14px;">${o.phone}</td><td data-label="생두사 / 상품명" style="text-align:left; width: 100%; max-width: 340px; overflow:visible;"><div style="display:flex; align-items:center; width:100%; min-width: 0; gap:8px;"><div style="flex-shrink: 0; text-align: right;">${vendorHtml}</div><span style="color:var(--border-strong); font-size:12px; flex-shrink:0;">|</span><div style="flex:1; min-width:0;">${copyableHtml}</div></div></td><td data-label="수량" class="tc" style="font-size:15px; font-weight:700; color:var(--text-display); text-align:center;">${o.quantity}</td><td data-label="총 금액 입력" style="text-align:right;"><input type="text" value="${o.total_price||''}" placeholder="0원" style="width:100px; padding:10px 12px; text-align:right; font-size:14px; font-weight:600; background:#fff; border:1px solid var(--border-strong); border-radius:8px; color:var(--text-display); outline:none; transition:0.2s;" onfocus="this.style.borderColor='var(--primary)';" onblur="this.style.borderColor='var(--border-strong)'; window.handlePriceInput('${o.id}', this.value, '${o.status}', this)"></td><td data-label="상태 관리" class="tc" style="text-align:center;"><div class="action-wrap" style="justify-content:center; display:flex;"><select class="status-select ${badgeClass}" onchange="window.handleOrderStatusChange('${o.id}', this.value, this)" style="text-align-last:center;"><option value="주문 접수" ${o.status==='주문 접수'?'selected':''}>주문 접수</option><option value="입금 대기" ${o.status==='입금 대기'?'selected':''}>입금 대기</option><option value="입금 확인 중" ${o.status==='입금 확인 중'?'selected':''}>입금 확인 중</option><option value="입금 확인" ${o.status==='입금 확인'?'selected':''}>입금 확인</option><option value="센터 도착" ${o.status==='센터 도착'?'selected':''}>센터 도착</option><option value="주문 취소" ${o.status==='주문 취소'?'selected':''}>주문 취소</option><option value="품절" ${o.status==='품절'?'selected':''}>품절</option></select></div></td></tr>` 
  }).join("");
}
window.renderDashboard = async function() {
    const now = new Date(); let targetDate = new Date(now.getFullYear(), now.getMonth() + currentDashMonthOffset, 1); const yyyy = targetDate.getFullYear(); const mm = targetDate.getMonth(); const daysInMonth = new Date(yyyy, mm + 1, 0).getDate(); const currDay = now.getDay();
    if (currentDashView === 'month' && $("dashMonthTitle")) { $("dashMonthTitle").innerText = `${yyyy}년 ${mm + 1}월`; }
    await window.fetchHolidays(yyyy);

    let spaceFilter = $("dashSpaceFilter") ? $("dashSpaceFilter").value : '전체'; let batchFilter = $("dashBatchFilter") ? $("dashBatchFilter").value : '전체'; let calEvts = {};

    if (currentDashView === 'week') {
        let startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - currDay);
        for(let i = 0; i < 7; i++) { let dObj = new Date(startOfWeek.getFullYear(), startOfWeek.getMonth(), startOfWeek.getDate() + i); let ds = `${dObj.getFullYear()}-${String(dObj.getMonth()+1).padStart(2,'0')}-${String(dObj.getDate()).padStart(2,'0')}`; calEvts[ds] = []; }
    } else {
        for(let d=1; d<=daysInMonth; d++) { let ds = `${yyyy}-${String(mm+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`; calEvts[ds] = []; }
    }

    let goEvts = []; try { goEvts = await window.fetchGoogleCalendarEvents(yyyy, mm + 1); } catch(e){}

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
            if (String(r.status||'').includes('취소') || (currentGlobalCenter !== '전체' && r.center !== currentGlobalCenter) || (spaceFilter !== '전체' && !String(r.space_equip||'').includes(spaceFilter)) || (batchFilter !== '전체' && r.batch !== batchFilter)) return;
            if (calEvts[r.res_date]) { let st = String(r.res_time||"").split('~')[0].trim(); let spc = String(r.space_equip||"").split(' ')[0]; calEvts[r.res_date].push({ time: st, start: st, text: `[${spc}] ${r.name}`, type: 'res', tooltip: `${r.res_time} | ${r.space_equip} | ${r.name}` }); }
        });

        gBlk.forEach(b => {
            if ((currentGlobalCenter !== '전체' && b.center !== currentGlobalCenter) || (spaceFilter !== '전체' && !String(b.space_equip||'').includes(spaceFilter))) return;
            if (calEvts[b.block_date]) { calEvts[b.block_date].push({ time: b.start_time, start: b.start_time, text: `[${b.category}] ${b.reason}`, type: 'blk', tooltip: `${b.start_time}~${b.end_time} | ${b.space_equip||'전체'} | ${b.reason}` }); }
        });

        gTrn.forEach(t => {
            if (String(t.status||'').includes('취소') || (batchFilter !== '전체' && t.batch !== batchFilter)) return;
            let cInfo = String(t.content||"").split(' || ');
            if(cInfo.length >= 5) {
                let tDate = cInfo[0].trim(); let tCenter = cInfo[3].trim(); let tSpc = cInfo[4].trim();
                if ((currentGlobalCenter !== '전체' && tCenter !== currentGlobalCenter) || (spaceFilter !== '전체' && !String(tSpc).includes(spaceFilter))) return;
                if (calEvts[tDate]) { let st = String(cInfo[2]||"").split('~')[0].trim(); calEvts[tDate].push({ time: st, start: st, text: `[수강] ${t.name}`, type: 'trn', tooltip: `${cInfo[2]} | ${tSpc} | ${t.name} (${cInfo[1]})` }); }
            }
        });
    } catch(e) { console.error(e); }

    try {
        let mHtml = `<div class="dash-cal-grid"><div class="dash-cal-header" style="color:var(--error);">일</div><div class="dash-cal-header">월</div><div class="dash-cal-header">화</div><div class="dash-cal-header">수</div><div class="dash-cal-header">목</div><div class="dash-cal-header">금</div><div class="dash-cal-header" style="color:var(--blue);">토</div>`;
        let iterDates = Object.keys(calEvts).sort();
        if (currentDashView === 'month') { let firstDay = new Date(yyyy, mm, 1).getDay(); for(let i=0; i<firstDay; i++) mHtml += `<div class="dash-cal-cell empty"></div>`; }

        iterDates.forEach(ds => {
            let dObj = new Date(ds); let evts = calEvts[ds]; evts.sort((a,b) => String(a.start||'').localeCompare(String(b.start||'')));
            let holidayName = window.getHoliday(dObj.getFullYear(), dObj.getMonth() + 1, dObj.getDate());
            let dateClass = holidayName ? 'holiday-date' : '';
            let dateText = dObj.getDate() + (holidayName ? ` <span style="font-size:10px; font-weight:600; display:block; float:right;">${holidayName}</span>` : '');

            let evtsHtml = evts.slice(0, 3).map(e => {
                let badgeClass = e.type === 'google' ? 'dash-item-google' : (e.type === 'res' ? 'dash-item-res' : (e.type === 'trn' ? 'dash-item-trn' : 'dash-item-blk'));
                return `<div class="dash-item ${badgeClass}"><div class="dash-item-text"><span class="dash-time">${e.time||''}</span>${window.escapeHtml(e.text)||''}</div><div class="dash-tooltip">${window.escapeHtml(e.tooltip)||''}</div></div>`;
            }).join('');

            if(evts.length > 3) {
                let hiddenText = evts.slice(3).map(e => `${e.time||''} | ${window.escapeHtml(e.text)||''}`).join('<br>');
                evtsHtml += `<div class="dash-cal-more-wrap" style="position:relative;"><div class="dash-cal-more">+${evts.length - 3}건 더보기</div><div class="dash-tooltip" style="text-align:left; white-space:nowrap; font-weight:normal;">${hiddenText}</div></div>`;
            }
            mHtml += `<div class="dash-cal-cell"><div class="dash-cal-date ${dateClass}">${dateText}</div>${evtsHtml}</div>`;
        });
        mHtml += `</div>`;

        window.centerCalEvts = calEvts;
        let mobStrip = `<div class="mobile-cal"><div class="m-cal-strip" id="m-cal-strip-center">`;
        iterDates.forEach(ds => {
            let dObj = new Date(ds); let dayKr = ["일","월","화","수","목","금","토"][dObj.getDay()]; let hasEvt = calEvts[ds].length > 0 ? 'has-evt' : '';
            mobStrip += `<div class="m-cal-date" id="m-date-center-${ds}" onclick="window.renderMCalCenter('${ds}')"><span class="m-cal-day">${dayKr}</span><span class="m-cal-num">${dObj.getDate()}</span><div class="m-cal-dot ${hasEvt}"></div></div>`;
        });
        mobStrip += `</div><div id="m-cal-list-center" class="m-cal-list"></div></div>`;

        if($("dash-content")) $("dash-content").innerHTML = `<div class="desktop-cal">${mHtml}</div>` + mobStrip;

        let td = new Date(); let todayStr = `${td.getFullYear()}-${String(td.getMonth()+1).padStart(2,'0')}-${String(td.getDate()).padStart(2,'0')}`;
        window.renderMCalCenter(calEvts[todayStr] ? todayStr : iterDates[0]);
    } catch(e) { console.error("Render HTML Error:", e); }
};

window.handleOrderStatusChange = function(id, newValue, selectEl) {
    let order = gOrd.find(o => String(o.id) === String(id)); if(!order) return; let oldStatus = order.status || '주문 접수'; if (oldStatus === newValue) return;
    let confirmMsg = `<div style="font-size:15px; color:var(--text-display); margin-top:8px;">주문 상태를 <strong style="color:var(--primary); font-size:18px;">[${newValue}]</strong>(으)로<br>변경하시겠습니까?</div>`;
    let isRollback = false; if ((oldStatus === '입금 확인 중' || oldStatus === '입금 확인' || oldStatus === '센터 도착') && (newValue === '입금 대기' || newValue === '주문 접수')) { isRollback = true; }
    if (isRollback) { confirmMsg = `<div style="background:#fff0f0; border:1px solid #ffcdd2; border-radius:8px; padding:16px; margin-bottom:12px; text-align:left;"><div style="color:var(--error); font-weight:800; font-size:14px; margin-bottom:8px; display:flex; align-items:center; gap:6px;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>롤백 경고</div><div style="font-size:14px; color:var(--text-display); line-height:1.5; word-break:keep-all;">현재 <span style="font-weight:700; color:var(--text-secondary);">[${oldStatus}]</span> 상태입니다.<br>정말 <strong style="color:var(--error); font-size:16px;">[${newValue}]</strong> (으)로 되돌리시겠습니까?</div></div>`; }
    window.openCustomConfirm("주문 상태 변경", null, confirmMsg, async () => { const { error } = await supabaseClient.from('orders').update({ status: newValue }).eq('id', id); if (error) { showToast("상태 변경에 실패했습니다."); } else { showToast(`[${newValue}] 상태로 변경되었습니다.`); window.fetchCenterData(); } }, "변경하기"); selectEl.value = oldStatus;
};

// 💡 [디밸롭 1] 발주 요약 모달 UI 하이어라키 재구성
window.showOrderSummary = function() {
    let checkedBoxes = document.querySelectorAll('.chk-ord-dynamic:checked, .chk-ord:checked, .chk-ord-thu:checked');
    let checkedIds = Array.from(checkedBoxes).map(cb => String(cb.value));

    let pendingOrders = gOrd.filter(o => {
        if (checkedIds.length > 0) return checkedIds.includes(String(o.id));
        return o.status === '주문 접수' && (currentGlobalCenter === '전체' || o.center === currentGlobalCenter);
    });

    if (pendingOrders.length === 0) {
        $("summaryModalBody").innerHTML = '<div class="empty-state" style="padding: 80px 0;">요약할 발주 내역이 없습니다. (주문 접수 상태인 건을 체크해보세요)</div>';
    } else {
        let grouped = {};
        pendingOrders.forEach(o => {
            let dateGroup = window.formatDeliveryDateFull(o.delivery_date);
            let bigKey = `${dateGroup} 발주 | ${o.center || '미지정'}`;
            let vendor = o.vendor || '기타 생두사';
            let cNm = o.item_name;
            let m = String(cNm).match(/(.+) \[(?:희망:\s*)?(\d+)[\/\.](\d+)\s*\((월|화|수|목|금|토|일)\).*?\]/);
            if(m) cNm = m[1].trim(); else { let oM = String(cNm).match(/(.+) \[(.*?)\]/); if(oM) cNm = oM[1].trim(); }

            if(!grouped[bigKey]) grouped[bigKey] = {};
            if(!grouped[bigKey][vendor]) grouped[bigKey][vendor] = {};
            if(!grouped[bigKey][vendor][cNm]) grouped[bigKey][vendor][cNm] = { totalGrams: 0, orderers: [] };

            let rawQty = String(o.quantity || '0').trim().toLowerCase();
            let numMatch = rawQty.match(/[0-9.]+/);
            let numVal = numMatch ? parseFloat(numMatch[0]) : 0;
            grouped[bigKey][vendor][cNm].totalGrams += rawQty.includes('kg') ? numVal * 1000 : numVal;
            grouped[bigKey][vendor][cNm].orderers.push({ batch: o.batch || '미정', name: o.name, qty: o.quantity });
        });

        let html = ``;
        for (let bigKey in grouped) {
            html += `<div style="font-size:18px; font-weight:900; color:var(--text-display); margin-top:32px; padding-bottom:12px; border-bottom:3px solid var(--text-display); letter-spacing:-0.5px;">[${bigKey}]</div>`;
            for (let vendor in grouped[bigKey]) {
                html += `<div style="margin-top:20px; font-size:14px; font-weight:800; color:var(--primary); padding-left:4px;">${vendor}</div>`;
                for (let item in grouped[bigKey][vendor]) {
                    let d = grouped[bigKey][vendor][item];
                    let displayQty = d.totalGrams >= 1000 ? (d.totalGrams / 1000) + 'kg' : d.totalGrams + 'g';
                    let ordererText = d.orderers.map(ord => `[${ord.batch}] ${ord.name}(${ord.qty})`).join(', ');
                    
                    html += `<div style="margin: 12px 0; padding: 16px; background:#fff; border:1px solid var(--border-strong); border-radius:12px;">
                        <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                            <div style="flex:1; font-weight:700; font-size:15px; color:var(--text-display); line-height:1.4;">${window.escapeHtml(item)}</div>
                            <div style="font-size:20px; font-weight:900; color:var(--primary); margin-left:12px;">${displayQty}</div>
                        </div>
                        <div style="font-size:12px; color:var(--text-tertiary); margin-top:8px; line-height:1.5;">주문자: ${ordererText}</div>
                        <div style="margin-top:10px; text-align:right;"><span style="font-size:11px; color:var(--primary); cursor:pointer; font-weight:800; border:1px solid var(--primary); padding:2px 8px; border-radius:4px;" onclick="window.copyTxt('${String(item).replace(/'/g, "\\'")}')">상품명 복사</span></div>
                    </div>`;
                }
            }
        }
        $("summaryModalBody").innerHTML = `<div style="padding-bottom:40px;">${html}</div>`;
        
        // 데이터 추출용 flat array 생성 (성함/연락처 undefined 방지)
        let exportData = [];
        pendingOrders.forEach(o => {
            exportData.push({
                "등록 일시": formatDt(o.created_at),
                "발주 구분": window.formatDeliveryDateFull(o.delivery_date) + " 발주",
                "수령 센터": o.center || "미지정",
                "생두사": o.vendor,
                "상품명": o.item_name,
                "주문 수량": o.quantity,
                "기수": o.batch || "-",
                "성함": o.name || "이름없음",
                "연락처": o.phone || "-"
            });
        });
        window.currentSummaryData = exportData;
    }
    const modal = $("summaryModal"); if(modal) modal.classList.add('show');
};

// 💡 [디밸롭 2] 구글 시트 전송 시 명세서 수식 자동화
window.sendToGoogleSheet = async function() {
    if(!window.currentSummaryData || window.currentSummaryData.length === 0) { showToast('데이터 없음'); return; }
    const GAS_URL = 'https://script.google.com/macros/s/AKfycbwz9G7mgetN8FAUpGpQQustHRliPvC3JJWUrslHXzuTJBgoLPVbZ7o6JBdGqP0SNn5P/exec'; 
    const btn = document.getElementById('btn-send-sheet');
    if(btn) { btn.innerText = '전송 중...'; btn.disabled = true; }

    try {
        // 명세서 수식 생성을 위한 멤버 리스트 추출
        let uniqueMembers = [...new Set(window.currentSummaryData.map(d => d['성함']))];
        let invoiceData = uniqueMembers.map(name => {
            return {
                "유형": "명세서 요약",
                "성함": name,
                "합산 수식": `=IFERROR(SUMIFS(G:G, I:I, "${name}"), 0)`, // G열(가격) 합산, I열(성함) 매칭
                "설명": "입금 대기 총액"
            };
        });

        // 발주 데이터 + 명세서 데이터 병합 전송
        let payload = {
            orders: window.currentSummaryData,
            invoices: invoiceData
        };

        await fetch(GAS_URL, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        showToast("구글 시트 전송 및 명세서 생성 완료");
    } catch(e) { showToast("전송 오류"); } 
    finally { if(btn) { btn.innerText = '구글 시트 전송'; btn.disabled = false; } }
}

window.downloadSummaryExcel = function() {
    if(!window.currentSummaryData || window.currentSummaryData.length === 0) { showToast('데이터 없음'); return; }
    let csv = "\uFEFF발주 구분,수령 센터,생두사,상품명,주문 수량,예상 금액,기수,성함,연락처\n";
    window.currentSummaryData.forEach(s => { 
        csv += `"${s['발주 구분']}","${s['수령 센터']}","${s['생두사']}","${String(s['상품명']).replace(/"/g, '""')}","${s['주문 수량']}","","${s['기수']}","${s['성함']}","${s['연락처']}"\n`; 
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' }); 
    const link = document.createElement('a'); link.href = URL.createObjectURL(blob); 
    link.download = `위커피_발주명단_${new Date().toISOString().slice(0,10)}.csv`; link.click(); 
};

window.renderAppMCal = function(selDate) { 
    $$$("#appDashContent .m-cal-date").forEach(el => el.classList.remove('active')); 
    let target = document.getElementById(`m-date-app-${selDate}`); 
    if(target) { target.classList.add('active'); try { target.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' }); } catch(e) {} } 
    let evts = window.appCalEvts[selDate] || []; evts.sort((a,b) => String(a.time||'').localeCompare(String(b.time||''))); 
    let html = ''; 
    if(evts.length === 0) { html = `<div class="empty-state" style="padding:40px 0;">예정된 상담 일정이 없습니다.</div>`; } else { evts.forEach(e => { let rawTooltip = String(e.tooltip||''); let descParts = rawTooltip.split('|'); let descText = descParts.length > 1 ? descParts.slice(1).join(' | ').trim() : rawTooltip; html += `<div class="m-cal-card" style="align-items:flex-start; text-align:left; width:100%; box-sizing:border-box;"><div style="display:flex; align-items:center; justify-content:space-between; width:100%; margin-bottom: 4px;"><div class="m-cal-card-title" style="margin:0;">${window.escapeHtml(e.text)||''}</div><div class="m-cal-card-time" style="color:var(--primary); font-weight:800; font-size:13px;">${e.time || '종일'}</div></div><div class="m-cal-card-desc" style="font-size:13px; color:var(--text-secondary); margin-top:0; width:100%;">${window.escapeHtml(descText)}</div></div>`; }); } 
    let listWrap = $("m-cal-list-app"); if(listWrap) listWrap.innerHTML = html; 
};

window.renderAppDailyBanner = function(filteredApps) {
    let td = new Date(); let mm = td.getMonth() + 1; let dd = td.getDate();
    let scheduled = filteredApps.filter(a => a.status === '상담 일정 확정' && a.call_time);
    let todayEvts = scheduled.filter(app => { 
        const m = String(app.call_time||'').match(/(\d+)\s*월\s*(\d+)\s*일/); 
        return m && parseInt(m[1], 10) === mm && parseInt(m[2], 10) === dd; 
    });
    let html = '';
    if(todayEvts.length === 0) { 
        html = `<div class="inout-card"><div style="font-weight:800; margin-bottom:8px; color:var(--text-display); border-bottom:1px solid var(--border-strong); padding-bottom:8px;">오늘의 상담 일정</div><div style="font-size:13px; color:var(--text-secondary); padding:8px 0;">오늘 확정된 상담 일정이 없습니다.</div></div>`; 
    } else { 
        html = `<div class="inout-card"><div style="font-weight:800; font-size:15px; margin-bottom:12px; color:var(--text-display); border-bottom:1px solid var(--border-strong); padding-bottom:8px;">오늘의 상담 일정 (${todayEvts.length}건)</div><div style="display:flex; flex-direction:column; gap:8px;">`; 
        todayEvts.sort((a,b) => { 
            let tA = String(a.call_time||'').match(/(오전|오후)\s+(\d+)[시:]\s*(\d+)?/); 
            let tB = String(b.call_time||'').match(/(오전|오후)\s+(\d+)[시:]\s*(\d+)?/); 
            let timeA = tA ? (tA[1]==='오후' && tA[2]!=='12' ? parseInt(tA[2], 10)+12 : (tA[1]==='오전' && tA[2]==='12' ? 0 : parseInt(tA[2], 10))) * 60 + (tA[3]?parseInt(tA[3], 10):0) : 0; 
            let timeB = tB ? (tB[1]==='오후' && tB[2]!=='12' ? parseInt(tB[2], 10)+12 : (tB[1]==='오전' && tB[2]==='12' ? 0 : parseInt(tB[2], 10))) * 60 + (tB[3]?parseInt(tB[3], 10):0) : 0; 
            return timeA - timeB; 
        });
        todayEvts.forEach(evt => { 
            const tm = String(evt.call_time||'').match(/(오전|오후)\s+(\d+)[시:]\s*(\d+)?/); 
            let timeStr = tm ? `${tm[1]} ${tm[2]}:${tm[3] ? String(parseInt(tm[3], 10)).padStart(2,'0') : '00'}` : evt.call_time; 
            html += `<div style="display:flex; align-items:center; flex-wrap:nowrap; overflow-x:auto;"><div class="today-time-wrap" style="color:var(--primary); background:var(--primary-light); padding:2px 8px; border-radius:4px; font-size:12px; font-weight:700; white-space:nowrap; flex-shrink:0;">${timeStr}</div> <div class="today-time-wrap" style="font-weight:800; margin:0 8px; flex-shrink:0;">[${evt.desired_batch||'-'}] ${window.escapeHtml(evt.name)}</div> <div style="white-space:nowrap; font-weight:500; color:var(--text-secondary); flex-shrink:0;">(${window.escapeHtml(evt.phone)}) | 담당: ${window.escapeHtml(evt.counselor_name||'미정')}</div></div>`; 
        }); 
        html += `</div></div>`; 
    }
    if($("appDailyBanner")) $("appDailyBanner").innerHTML = html;
};

window.openScheduleModal = function(id, callTime, counselorName) {
    currentScheduleAppId = id;
    if($("scheduleModal")) $("scheduleModal").classList.add('show');
    let dateEl = $("schedDate") || $("schedInputDate");
    let timeEl = $("schedTime") || $("schedInputTime");
    let nameEl = $("counselorName") || $("schedInputName");
    if(dateEl && timeEl) {
        if(callTime && callTime !== 'null' && callTime.includes('년')) {
            let mDate = callTime.match(/(\d+)년\s*(\d+)월\s*(\d+)일/);
            if (mDate) dateEl.value = (dateEl.type === 'date') ? `${mDate[1]}-${String(mDate[2]).padStart(2,'0')}-${String(mDate[3]).padStart(2,'0')}` : `${mDate[1]}년 ${mDate[2]}월 ${mDate[3]}일`; 
            let mTime = callTime.match(/(오전|오후)\s+(\d+)[시:]\s*(\d+)?/);
            if (mTime) {
                let hh = parseInt(mTime[2], 10); let mm = mTime[3] ? parseInt(mTime[3], 10) : 0;
                if (mTime[1] === '오후' && hh < 12) hh += 12; if (mTime[1] === '오전' && hh === 12) hh = 0;
                timeEl.value = (timeEl.type === 'time') ? `${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}` : `${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}`;
            }
        } else { dateEl.value = ''; timeEl.value = ''; }
    }
    if(nameEl) nameEl.value = counselorName && counselorName !== 'null' && counselorName !== 'undefined' ? counselorName : '';
};

window.closeScheduleModal = function() { if($("scheduleModal")) $("scheduleModal").classList.remove('show'); };

window.saveSchedule = async function() {
    if(!currentScheduleAppId) return;
    let dateEl = $("schedDate") || $("schedInputDate");
    let timeEl = $("schedTime") || $("schedInputTime");
    let nameEl = $("counselorName") || $("schedInputName");
    let dVal = dateEl ? dateEl.value.trim() : ""; let tVal = timeEl ? timeEl.value.trim() : ""; let cName = nameEl ? nameEl.value.trim() : "";
    if(!dVal || !tVal) return showToast("상담 날짜와 시간을 입력해주세요.");
    let targetYear, targetMonth, targetDate; const now = new Date(); 
    let dateMatch = dVal.match(/(\d{4})\s*[\-\.년/]\s*(\d{1,2})\s*[\-\.월/]\s*(\d{1,2})/);
    if (dateMatch) { targetYear = parseInt(dateMatch[1], 10); targetMonth = parseInt(dateMatch[2], 10); targetDate = parseInt(dateMatch[3], 10); } 
    else {
        let dt = dVal.replace(/\D/g, ''); 
        if (dt.length === 8) { targetYear = parseInt(dt.slice(0,4), 10); targetMonth = parseInt(dt.slice(4,6), 10); targetDate = parseInt(dt.slice(6,8), 10); } 
        else if (dt.length === 6) { targetYear = 2000 + parseInt(dt.slice(0,2), 10); targetMonth = parseInt(dt.slice(2,4), 10); targetDate = parseInt(dt.slice(4,6), 10); } 
        else if (dt.length === 4) { targetYear = now.getFullYear(); targetMonth = parseInt(dt.slice(0,2), 10); targetDate = parseInt(dt.slice(2,4), 10); if (targetMonth < now.getMonth() + 1 - 2) targetYear += 1; } 
        else return showToast("날짜 형식을 확인해주세요.");
    }
    let targetHour = 0, targetMin = 0; let isPm = tVal.includes('오후'); let isAm = tVal.includes('오전');
    let timeMatch = tVal.match(/(\d{1,2})\s*[:시]\s*(\d{1,2})/);
    if (timeMatch) { targetHour = parseInt(timeMatch[1], 10); targetMin = parseInt(timeMatch[2], 10); } 
    else {
        let timeRe = tVal.replace(/\D/g, '');
        if (timeRe.length === 4) { targetHour = parseInt(timeRe.slice(0,2), 10); targetMin = parseInt(timeRe.slice(2,4), 10); } 
        else if (timeRe.length === 3) { targetHour = parseInt(timeRe.slice(0,1), 10); targetMin = parseInt(timeRe.slice(1,3), 10); } 
        else if (timeRe.length === 1 || timeRe.length === 2) { targetHour = parseInt(timeRe, 10); targetMin = 0; } 
        else return showToast("시간 형식을 확인해주세요.");
    }
    if (isPm && targetHour < 12) targetHour += 12; if (isAm && targetHour === 12) targetHour = 0;
    let testDate = new Date(targetYear, targetMonth - 1, targetDate); if (isNaN(testDate.getTime())) return showToast("유효하지 않은 날짜입니다.");
    let dow = ['일','월','화','수','목','금','토'][testDate.getDay()]; let ampm = targetHour >= 12 ? '오후' : '오전'; let hh12 = targetHour % 12 || 12;
    let finalTimeStr = `${targetYear}년 ${targetMonth}월 ${targetDate}일(${dow}) ${ampm} ${hh12}:${String(targetMin).padStart(2,'0')}`;
    const { error } = await supabaseClient.from('applications').update({ call_time: finalTimeStr, counselor_name: cName, status: '상담 일정 확정' }).eq('id', currentScheduleAppId);
    if(error) showToast("저장 실패");
    else { 
        showToast("상담 일정이 저장되었습니다."); window.closeScheduleModal(); window.fetchApplications(); 
        const app = globalApps.find(a => String(a.id) === String(currentScheduleAppId));
        if (app) { let surveyLink = `https://www.wecoffee.co.kr/survey?uid=${currentScheduleAppId}&name=${encodeURIComponent(app.name || '')}`; window.openCustomConfirm("일정 확정 완료", null, `고객에게 발송할 <b>사전 설문 링크</b>를 복사하시겠습니까?`, surveyLink, "복사하기"); }
    }
};
window.saveScheduleData = window.saveSchedule;
