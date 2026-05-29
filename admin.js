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

let currentTimelineDate = null;

let currentMemberPage = 1, memberItemsPerPage = 50, currentFilteredMembers = [];
let currentResPage = 1, resItemsPerPage = 10, currentFilteredRes = [];

window.currentEditingBlockId = null;

window.showGlobalTooltip = function(e, el) {
    let tt = document.getElementById('global-tooltip');
    if(!tt) {
        tt = document.createElement('div');
        tt.id = 'global-tooltip';
        tt.style.cssText = 'position:fixed;background:#333d4b;color:#fff;padding:8px 12px;border-radius:8px;font-size:13px;font-weight:500;white-space:pre-wrap;z-index:999999;pointer-events:none;word-break:keep-all;line-height:1.5;text-align:left;max-width:260px;';
        document.body.appendChild(tt);
    }
    tt.innerHTML = el.getAttribute('data-tippy') || '';
    tt.style.left = '-9999px'; tt.style.top = '0px'; tt.style.display = 'block';
    const ttW = tt.offsetWidth || 160; const ttH = tt.offsetHeight || 36;
    let rect = el.getBoundingClientRect();
    let left = rect.left + rect.width / 2 - ttW / 2;
    const placement = el.getAttribute('data-tippy-placement') || 'top';
    let top = placement === 'bottom' ? rect.bottom + 8 : rect.top - ttH - 8;
    if (placement !== 'bottom' && top < 8) top = rect.bottom + 8;
    left = Math.max(8, Math.min(left, window.innerWidth - ttW - 8));
    tt.style.left = left + 'px'; tt.style.top = top + 'px';
};
window.hideGlobalTooltip = function() { let tt = document.getElementById('global-tooltip'); if(tt) tt.style.display = 'none'; };

// ★★★ PATCH (서버부하 ③): setTimeout 중복 렌더 제거 ★★★
window.changeGlobalCenter = function(centerValue) {
    currentGlobalCenter = centerValue;
    if(window.updateDashSpaceFilter) window.updateDashSpaceFilter();
    window.fetchCenterData(); // 내부의 stale check 적용. setTimeout(renderTimeline) 중복 제거
};

// ★★★ PATCH (버그수정 1): 글로벌 센터 필터 영역 안 클릭만 처리 ★★★
// 이전: 화면 어디서든 '마포 센터' 텍스트만 있으면 센터 변경 → 금일 출입 현황 카드 클릭 시 광진 사라지는 버그
// 수정: #globalFilterWrap 또는 data-role="center-filter" 영역 안에서만 동작
document.addEventListener('click', function(e) {
    let txt = e.target.innerText || '';
    if (e.target.tagName !== 'SELECT' && e.target.tagName !== 'OPTION') {
        let cleanTxt = txt.trim();
        const inCenterFilter = e.target.closest && e.target.closest('#globalFilterWrap, [data-role="center-filter"]');
        if (inCenterFilter && (cleanTxt === '전체 센터' || cleanTxt === '마포 센터' || cleanTxt === '광진 센터')) {
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
    .info-tooltip { position: relative; display: inline-flex; align-items: center; justify-content: center; margin-left: 8px; cursor: pointer; color: #b0b8c1; vertical-align: middle; transition: 0.2s; font-style: normal !important; font-weight: 700; width: 18px; height: 18px; border-radius: 50%; border: 1.5px solid #b0b8c1; font-size: 11px; line-height: 1; font-family: sans-serif; }
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
    .edit-schedule-link { font-size:12px !important; font-weight:500 !important; color:var(--text-secondary) !important; cursor:pointer; margin-top:6px; transition:all 0.12s; }
    .edit-schedule-link:hover { font-weight:700 !important; color:var(--text-display) !important; }
    .space-opt-item:hover { background: #f9fafb; color: var(--primary); font-weight: 700; }
    .space-opt-item.selected { background: #e8f0fe; color: var(--primary); font-weight: 700; }
    #dynamic-ord-container { padding-bottom: 120px; }
    #timeline-area { width: 100%; max-width: 100vw; box-sizing: border-box; margin-top: 32px; display: block !important; clear: both; }
    #timeline-area .timeline-section { width: 100%; margin: 0 0 32px 0 !important; background: #fff; padding: 24px; border-radius: 12px; border: 1px solid var(--border-strong); box-shadow: 0 4px 20px rgba(0,0,0,0.05); box-sizing: border-box; overflow: hidden; text-align: left; display: block !important; }
    .timeline-container { width: 100%; overflow-x: auto; position: relative; border: 1px solid #eee; border-radius: 8px; -webkit-overflow-scrolling: touch; padding-bottom: 8px; box-sizing: border-box; text-align: left; display: block !important; }
    .timeline-grid { min-width: 1200px; display: flex !important; flex-direction: column !important; border-top: 1px solid #eee; border-left: 1px solid #eee; border-right: 1px solid #eee; position: relative; }
    .timeline-header { display: flex !important; flex-direction: row !important; background: #f9fafb; border-bottom: 2px solid #eee; width: 100%; }
    .resource-label-header { position: sticky !important; left: 0 !important; z-index: 10 !important; background: #f9fafb !important; width: 210px; flex-shrink: 0; padding: 12px; border-right: 1px solid #eee; font-weight: 800; font-size: 13px; color: var(--text-secondary); text-align: center; box-sizing: border-box; }
    .time-slots-header { display: flex !important; flex-direction: row !important; flex-grow: 1; }
    .time-slot-num { flex: 1; text-align: center; font-size: 11px; font-weight: 700; padding: 12px 0; color: #999; border-right: 1px solid #f0f0f0; }
    .zone-group-row { display: flex !important; flex-direction: row !important; border-bottom: 1px solid #eee; width: 100%; }
    .zone-col { position: sticky !important; left: 0 !important; z-index: 10 !important; background: #f4f5f7 !important; width: 90px; flex-shrink: 0; border-right: 1px solid #eee; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 800; color: #333d4b; text-align: center; word-break: keep-all; padding: 8px; box-sizing: border-box; }
    .equip-col-wrapper { flex: 1; display: flex !important; flex-direction: column !important; min-width: 0; }
    .timeline-row { display: flex !important; flex-direction: row !important; border-bottom: 1px solid #eee; min-height: 54px; position: relative; width: 100%; }
    .equip-name { position: sticky !important; left: 90px !important; z-index: 10 !important; background: #fcfcfc !important; width: 120px; flex-shrink: 0; padding: 10px 12px; border-right: 1px solid #eee; font-size: 12px; font-weight: 600; display: flex; align-items: center; justify-content: center; line-height: 1.3; color: #505967; text-align: center; word-break: keep-all; box-sizing: border-box; }
    .merged-col { position: sticky !important; left: 0 !important; z-index: 10 !important; background: #f4f5f7 !important; width: 210px; flex-shrink: 0; border-right: 1px solid #eee; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 800; color: #333d4b; text-align: center; box-sizing: border-box; }
    .time-grid-bg { display: flex !important; flex-direction: row !important; flex-grow: 1; position: relative; background-image: repeating-linear-gradient(to right, transparent, transparent calc(4.16666% - 1px), #f0f0f0 calc(4.16666% - 1px), #f0f0f0 4.16666%); }
    .timeline-bar { position: absolute; height: 36px; top: 9px; border-radius: 8px; color: #fff; padding: 0 10px; display: flex; align-items: center; font-size: 11px; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; z-index: 2; cursor: pointer; transition: transform 0.2s; border: 1.5px solid rgba(255,255,255,0.4); box-sizing: border-box; }
    .bar-res { background: var(--primary); }
    .bar-trn { background: rgba(255, 121, 0, 0.65); color: #fff; }
    .bar-blk { background: #9ca3af; color: #fff; }

    /* ★★★ PATCH (UI 개선 2): 세그먼트형 날짜 네비게이션 ★★★ */
    .timeline-date-nav {
        display: inline-flex; align-items: center;
        background: #fff;
        border: 1.5px solid var(--border-strong, #e5e8eb);
        border-radius: 10px;
        padding: 3px;
        height: 38px; box-sizing: border-box;
        transition: border-color 0.15s;
    }
    .timeline-date-nav:hover { border-color: var(--text-tertiary, #8b95a1); }
    .timeline-date-nav .tdn-arrow {
        width: 30px; height: 30px;
        display: inline-flex; align-items: center; justify-content: center;
        border: none; background: transparent; cursor: pointer; padding: 0;
        border-radius: 7px;
        color: var(--text-secondary, #6b7684);
        transition: background 0.12s, color 0.12s, transform 0.08s;
        -webkit-tap-highlight-color: transparent;
    }
    .timeline-date-nav .tdn-arrow:hover { background: #f4f6f8; color: var(--text-display, #191f28); }
    .timeline-date-nav .tdn-arrow:active { transform: scale(0.9); }
    .timeline-date-nav .tdn-arrow svg { display: block; pointer-events: none; }
    .timeline-date-nav .tdn-label {
        display: inline-flex; align-items: center; gap: 6px;
        height: 30px; padding: 0 12px;
        font-size: 13px; font-weight: 700;
        color: var(--text-display, #191f28);
        cursor: pointer; border-radius: 7px;
        transition: background 0.12s;
        user-select: none; position: relative;
        white-space: nowrap;
        -webkit-tap-highlight-color: transparent;
    }
    .timeline-date-nav .tdn-label:hover { background: #f4f6f8; }
    .timeline-date-nav .tdn-today-dot {
        width: 5px; height: 5px; border-radius: 50%;
        background: var(--primary, #ff7900);
        display: inline-block;
        box-shadow: 0 0 0 2px rgba(255, 121, 0, 0.15);
        flex-shrink: 0;
    }
    .timeline-date-nav .tdn-today-link {
        font-size: 12px; font-weight: 600;
        color: var(--primary, #ff7900);
        padding-left: 8px; margin-left: 2px;
        border-left: 1px solid var(--border-strong, #e5e8eb);
        cursor: pointer;
        transition: opacity 0.12s;
    }
    .timeline-date-nav .tdn-today-link:hover { opacity: 0.7; }
    .timeline-date-nav .tdn-hidden-picker {
        position: absolute; opacity: 0; pointer-events: none;
        width: 1px; height: 1px; left: 50%; bottom: 0;
    }
    /* === Timeline date nav: 세그먼트형 끝 === */

    #trnContentModal { display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); z-index:99990; align-items:center; justify-content:center; padding:16px; box-sizing:border-box; }
    #trnContentModal.show { display:flex; }
    #trnContentModal .tcm-box { background:#fff; border-radius:16px; width:100%; max-width:900px; max-height:80vh; display:flex; flex-direction:column; box-shadow:0 8px 32px rgba(0,0,0,0.18); overflow:hidden; }
    #trnContentModal .tcm-header { padding:20px 24px 16px; border-bottom:1px solid var(--border-strong); flex-shrink:0; }
    #trnContentModal .tcm-title { font-size:16px; font-weight:800; color:var(--text-display); margin-bottom:4px; line-height:1.4; word-break:keep-all; }
    #trnContentModal .tcm-sub { font-size:13px; color:var(--text-secondary); font-weight:500; }
    #trnContentModal .tcm-body { flex:1; overflow-y:auto; overflow-x:hidden; padding:16px 24px; }
    #trnContentModal .tcm-footer { padding:16px 24px; border-top:1px solid var(--border-strong); display:flex; justify-content:space-between; align-items:center; flex-shrink:0; gap:8px; }
    #trnContentModal .tcm-table { width:100%; border-collapse:collapse; font-size:13px; }
    #trnContentModal .tcm-table th { background:#f9fafb; padding:8px 12px; text-align:left; font-weight:700; color:var(--text-secondary); border-bottom:1px solid var(--border-strong); font-size:12px; }
    #trnContentModal .tcm-table td { padding:10px 12px; border-bottom:1px solid var(--border-strong,#eee); color:var(--text-display); vertical-align:middle; }
    #trnContentModal .tcm-table tr:last-child td { border-bottom:none; }
    #trnContentModal .tcm-table tr:hover td { background:#f9fafb; }
    #blkAllDayWrap { display: flex !important; align-items: center !important; gap: 8px !important; padding: 8px 0 4px !important; width: 100% !important; flex: 0 0 100% !important; grid-column: 1 / -1 !important; box-sizing: border-box !important; }
    #blkAllDayWrap input[type="checkbox"] { appearance: none !important; -webkit-appearance: none !important; width: 18px !important; height: 18px !important; min-width: 18px !important; max-width: 18px !important; min-height: 18px !important; max-height: 18px !important; border: 2px solid var(--border-strong, #d1d5db) !important; border-radius: 4px !important; background: #fff !important; cursor: pointer !important; flex-shrink: 0 !important; margin: 0 !important; padding: 0 !important; position: relative !important; transition: all 0.15s !important; box-shadow: none !important; vertical-align: middle !important; }
    #blkAllDayWrap input[type="checkbox"]:checked { background: var(--primary, #ff7900) !important; border-color: var(--primary, #ff7900) !important; }
    #blkAllDayWrap input[type="checkbox"]:checked::after { content: '' !important; position: absolute !important; top: 1px !important; left: 5px !important; width: 5px !important; height: 9px !important; border: 2px solid #fff !important; border-top: none !important; border-left: none !important; transform: rotate(45deg) !important; }
    #blkAllDayWrap label { font-size: 14px; font-weight: 600; color: var(--text-display); cursor: pointer; user-select: none; line-height: 1; vertical-align: middle; }
    #blkRepeatSection { margin-top:12px; padding:12px 14px; background:#f9fafb; border-radius:10px; border:1px solid var(--border-strong,#e5e8eb); display:flex; flex-direction:column; gap:10px; }
    #blkRepeatSection .rp-row { display:flex; align-items:center; gap:10px; flex-wrap:wrap; }
    #blkRepeatSection label { font-size:13px; font-weight:600; color:var(--text-secondary); white-space:nowrap; }
    #blkRepeatSection select, #blkRepeatSection input { height:36px; border:1px solid var(--border-strong,#e5e8eb); border-radius:8px; padding:0 10px; font-size:13px; font-weight:600; background:#fff; color:var(--text-display); outline:none; }
    #blkRepeatSection input[type="number"] { width:70px; }
    #blkRepeatPreview { font-size:12px; color:var(--primary,#ff7900); font-weight:700; margin-top:2px; }
    @media (max-width: 1024px) { .mem-action-wrap { flex-wrap: nowrap !important; overflow-x: auto; } }
    @media (max-width: 768px) {
        .wecoffee-banner-wrap, .banner-grid { flex-direction: column; }
        .mem-action-wrap { flex-direction: column !important; align-items: stretch !important; gap: 8px !important; width: 100%; overflow-x: visible; }
        .mem-action-row { width: 100%; justify-content: space-between; flex-wrap: wrap !important; gap: 6px; }
        .mem-action-row select { flex: 1; min-width: 0; padding-left: 8px !important; padding-right: 28px !important; }
        #timeline-area .timeline-section { padding: 16px; margin-bottom: 24px !important; }
        .timeline-date-nav .tdn-label { padding: 0 8px; font-size: 12px; }
        .timeline-fullscreen-btn { display: inline-flex !important; align-items: center; justify-content: center; width: 32px; height: 32px; border-radius: 8px; border: 1.5px solid var(--border-strong, #e5e8eb); background: #fff; cursor: pointer; color: var(--text-secondary, #6b7684); transition: all 0.15s; flex-shrink: 0; -webkit-tap-highlight-color: transparent; }
        .timeline-fullscreen-btn:active { background: #fff6ef; border-color: var(--primary, #ff7900); color: var(--primary, #ff7900); }
        #timelineFullscreenOverlay { display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: 99998; background: #fff; overflow: hidden; }
        #timelineFullscreenOverlay.active { display: block; }
        #timelineFullscreenInner { position: absolute; top: 0; left: 0; width: 100vh; height: 100vw; transform: translate(calc((100vw - 100vh) / 2), calc((100vh - 100vw) / 2)) rotate(90deg); transform-origin: center center; display: flex; flex-direction: column; background: #fff; overflow: hidden; }
        #timelineFullscreenHeader { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; background: #fff; border-bottom: 1.5px solid var(--border-strong, #e5e8eb); flex-shrink: 0; gap: 12px; }
        #timelineFullscreenHeader .fs-left { display: flex; align-items: center; gap: 8px; min-width: 0; }
        #timelineFullscreenHeader .fs-title { font-size: 15px; font-weight: 800; color: var(--text-display, #191f28); white-space: nowrap; }
        #timelineFullscreenHeader .fs-date { font-size: 12px; color: var(--text-tertiary, #8b95a1); font-weight: 500; white-space: nowrap; }
        #timelineFullscreenHeader .fs-legend { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
        #timelineFullscreenHeader .fs-legend-item { display: flex; align-items: center; gap: 4px; font-size: 11px; font-weight: 600; color: var(--text-secondary, #6b7684); white-space: nowrap; }
        #timelineFullscreenHeader .fs-legend-dot { width: 10px; height: 10px; border-radius: 3px; flex-shrink: 0; }
        #timelineFullscreenHeader .fs-close-btn { display: inline-flex; align-items: center; justify-content: center; width: 32px; height: 32px; border-radius: 8px; border: 1.5px solid var(--border-strong, #e5e8eb); background: #fff; cursor: pointer; color: var(--text-secondary, #6b7684); font-size: 18px; font-weight: 300; flex-shrink: 0; -webkit-tap-highlight-color: transparent; }
        #timelineFullscreenBody { flex: 1; overflow: auto; -webkit-overflow-scrolling: touch; padding: 12px; box-sizing: border-box; }
        #timelineFullscreenBody .timeline-section { padding: 0 !important; border: none !important; box-shadow: none !important; border-radius: 0 !important; margin: 0 0 20px 0 !important; background: transparent !important; }
        #timelineFullscreenBody .timeline-section > div:first-child { display: none !important; }
        #timelineFullscreenBody .timeline-container { overflow: auto !important; overscroll-behavior: contain !important; -webkit-overflow-scrolling: touch; }
    }
    @media (min-width: 769px) { .timeline-fullscreen-btn { display: none !important; } #timelineFullscreenOverlay { display: none !important; } }
`;

window.escapeHtml = function(unsafe) { if (!unsafe) return ''; return String(unsafe).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;"); };

// ★★★ PATCH (전역 헬퍼 F): 연락처 정규화 ★★★
// 한국 휴대폰: 010-1234-5678 / 01012345678 / 010 1234 5678 등 → 모두 '010-1234-5678'로 통일
// 일반전화/기타: 숫자만 반환. 비교 키로도 사용 가능.
window.normalizePhone = function(p) {
    if(!p) return '';
    let d = String(p).replace(/\D/g, '');
    if(!d) return '';
    if(d.length === 11 && d.startsWith('010')) return `${d.slice(0,3)}-${d.slice(3,7)}-${d.slice(7,11)}`;
    if(d.length === 10 && (d.startsWith('011') || d.startsWith('016') || d.startsWith('017') || d.startsWith('018') || d.startsWith('019'))) return `${d.slice(0,3)}-${d.slice(3,6)}-${d.slice(6,10)}`;
    if(d.length === 10 && d.startsWith('01')) return `${d.slice(0,3)}-${d.slice(3,6)}-${d.slice(6,10)}`;
    return d;
};
// 비교 전용: 정규화된 형식이 달라도 숫자만 비교 (010-1234-5678 vs 01012345678 매칭)
window.samePhone = function(a, b) {
    return String(a||'').replace(/\D/g,'') === String(b||'').replace(/\D/g,'') && String(a||'').replace(/\D/g,'') !== '';
};
// ★★★ 관심도 매핑: DB 짧은 값 → 신청폼 풀 텍스트 ★★★
window.mapInterestLevel = function(v) {
    if(!v) return '';
    const map = {'꼭 가입하고 싶어요':'꼭 가입하고 싶어요. 오래 지켜봐 왔어요.','상담 후 결정하고 싶어요':'상담 후 예상과 비슷하다면 가입 의향이 있어요.','아직 고민 중이에요':'관심이 생겨서 좀 더 알아보고 싶어요.'};
    return map[v] || v;
};

// ★★★ PATCH (전역 헬퍼 E): 체크박스 선택 상태 보존/복원 ★★★
// 사용처: renderCenterData 시작/끝, renderMemberTablePage 시작/끝
window.preserveCheckboxState = function(scope) {
    scope = scope || document;
    const state = {};
    ['chk-res', 'chk-trn', 'chk-ord', 'chk-mem'].forEach(cls => {
        state[cls] = Array.from(scope.querySelectorAll('input.' + cls + ':checked'))
            .map(cb => String(cb.value)).filter(v => v && v !== 'on');
    });
    state['chk-ord-dyn'] = Array.from(scope.querySelectorAll('input[type="checkbox"][class*="chk-ord-dyn"]:checked'))
        .map(cb => String(cb.value)).filter(v => v && v !== 'on');
    return state;
};
window.restoreCheckboxState = function(state, scope) {
    if(!state) return;
    scope = scope || document;
    Object.keys(state).forEach(cls => {
        if(!Array.isArray(state[cls]) || state[cls].length === 0) return;
        state[cls].forEach(id => {
            try {
                const safeId = String(id).replace(/"/g, '\\"');
                const selector = cls === 'chk-ord-dyn'
                    ? `input[type="checkbox"][class*="chk-ord-dyn"][value="${safeId}"]`
                    : `input.${cls}[value="${safeId}"]`;
                scope.querySelectorAll(selector).forEach(cb => {
                    if(cb && !cb.disabled) cb.checked = true;
                });
            } catch(e) {}
        });
    });
};

window.safeKST = function(dateStr) { if(!dateStr) return new Date(); let d = new Date(dateStr); if(isNaN(d.getTime())) { let str = String(dateStr).replace(/-/g, '/').replace('T', ' ').split('.')[0]; d = new Date(str); } return isNaN(d.getTime()) ? new Date() : d; };
window.parseDeliveryDate = function(dateStr) { if(!dateStr) return new Date(); let str = String(dateStr).trim(); let currentYear = new Date().getFullYear(); let m = str.match(/(\d{1,2})[\/\-\.월]\s*(\d{1,2})/); if(m) return new Date(currentYear, parseInt(m[1],10)-1, parseInt(m[2],10)); let d = new Date(str); if(!isNaN(d.getTime())) { if(d.getFullYear()<2010) d.setFullYear(currentYear); return d; } return new Date(); };
window.formatDeliveryDateFull = function(dateStr) { if(!dateStr) return '미정'; let d=window.parseDeliveryDate(dateStr); let dow=['일','월','화','수','목','금','토'][d.getDay()]; return `${d.getMonth()+1}월 ${d.getDate()}일 ${dow}요일`; };
window.holidaysCache = {};
window.fetchHolidays = async function(year) { if(window.holidaysCache['fetched_'+year]) return; window.holidaysCache['fetched_'+year]=true; const serviceKey='dd13ab368b573e49574bd2b121ecf8b4dd4673e273e64135156968f533954bd5'; const url=`https://apis.data.go.kr/B090041/openapi/service/SpcdeInfoService/getRestDeInfo?serviceKey=${serviceKey}&solYear=${year}&numOfRows=100&_type=json`; try { const res=await fetch(url); const data=await res.json(); const items=data?.response?.body?.items?.item; if(items) { let arr=Array.isArray(items)?items:[items]; arr.forEach(item=>{ if(item.isHoliday==='Y') { let dStr=String(item.locdate); let fmt=`${dStr.substring(0,4)}-${dStr.substring(4,6)}-${dStr.substring(6,8)}`; window.holidaysCache[fmt]=item.dateName; } }); } } catch(e) { console.error("Holiday API Fallback"); } };
window.getHoliday = function(y,m,d) { let key=`${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`; return window.holidaysCache[key]||null; };

function getDow(dStr) { if(!dStr) return ''; try { let str=String(dStr).replace('T',' ').split('.')[0]; let datePart=str.split(' ')[0]; if(!datePart) return ''; let [y,m,d]=datePart.split('-'); if(!y||!m||!d) return ''; return ['일','월','화','수','목','금','토'][new Date(y,m-1,d).getDay()]||''; } catch(e) { return ''; } }
function formatDtWithDow(dateStr) { if(!dateStr) return "-"; try { let str=String(dateStr).replace('T',' ').split('.')[0]; let parts=str.split(' '); if(parts.length<2) return str; let [y,m,d]=parts[0].split('-'); let [hh,mm]=parts[1].split(':'); if(!y||!m||!d||!hh||!mm) return str; let dow=['일','월','화','수','목','금','토'][new Date(y,m-1,d).getDay()]||''; return `${y.slice(-2)}/${m}/${d}(${dow}) ${hh}:${mm}`; } catch(e) { return String(dateStr); } }
function formatDtKorean(dateStr) { if(!dateStr) return "-"; try { let str=String(dateStr).replace('T',' ').split('.')[0]; let parts=str.split(' '); if(parts.length<2) return str; let [y,m,d]=parts[0].split('-'); let [hh,mm]=parts[1].split(':'); if(!y||!m||!d||!hh||!mm) return str; let dow=['일','월','화','수','목','금','토'][new Date(y,m-1,d).getDay()]||''; let h=parseInt(hh),mi=parseInt(mm); let ap=h>=12?'오후':'오전'; let h12=h%12||12; let miStr=mi>0?` ${mi}분`:''; return `${y}년 ${parseInt(m)}월 ${parseInt(d)}일(${dow}) ${ap} ${h12}시${miStr}`; } catch(e) { return String(dateStr); } }
function formatDt(dateStr) { if(!dateStr) return "-"; try { let str=String(dateStr).replace('T',' ').split('.')[0]; let parts=str.split(' '); if(parts.length<2) return str; let [y,m,d]=parts[0].split('-'); let [hh,mm]=parts[1].split(':'); if(!y||!m||!d||!hh||!mm) return str; return `${y.slice(-2)}/${m}/${d} ${hh}:${mm}`; } catch(e) { return String(dateStr); } }
function comma(str) { return Number(String(str).replace(/[^0-9]/g,'')).toLocaleString(); }
function showToast(msg) { const toast=$("toast"); if(!toast) return; toast.innerText=msg; toast.classList.add('show'); setTimeout(()=>toast.classList.remove('show'),3500); }
window.toggleAll=function(checkbox,targetClass){document.querySelectorAll('.'+targetClass).forEach(cb=>{if(!cb.disabled)cb.checked=checkbox.checked;});};

// ★★★ PATCH (서버부하 ⑤): 쓰기 액션은 force:true ★★★
window.batchUpdateOrderStatus=async function(statusText){let checkedBoxes=document.querySelectorAll('input[type="checkbox"][class*="chk-ord"]:checked');let idsToUpdate=Array.from(checkedBoxes).map(cb=>String(cb.value)).filter(val=>val!=="on");if(idsToUpdate.length===0)return showToast("선택된 발주 건이 없습니다.");window.openCustomConfirm("일괄 상태 변경",null,`선택한 ${idsToUpdate.length}건을 일괄 <b>[${statusText}]</b> 처리하시겠습니까?`,async()=>{const{error}=await supabaseClient.from('orders').update({status:statusText}).in('id',idsToUpdate);if(error){showToast("일괄 변경에 실패했습니다.");console.error(error);}else{showToast(`${idsToUpdate.length}건이 [${statusText}] 상태로 변경되었습니다.`);window.fetchCenterData({force:true});}},"일괄 변경");};

window.formatBlockDate=function(v){let d=String(v).replace(/\D/g,'');if(d.length===4){let y=new Date().getFullYear();return `${y}-${d.slice(0,2)}-${d.slice(2,4)}`;}if(d.length===6)return `20${d.slice(0,2)}-${d.slice(2,4)}-${d.slice(4,6)}`;if(d.length>=8)return `${d.slice(0,4)}-${d.slice(4,6)}-${d.slice(6,8)}`;return v;};
window.formatBlockTime=function(v){let t=String(v).replace(/\D/g,'');if(t.length===1)return `0${t}:00`;if(t.length===2)return `${t.padStart(2,'0')}:00`;if(t.length===3)return `0${t.slice(0,1)}:${t.slice(1,3)}`;if(t.length>=4)return `${t.slice(0,2)}:${t.slice(2,4)}`;return v;};
window.formatCounselDateDisplay=function(val){if(!val)return '';let dt=String(val).replace(/\D/g,'');if(dt.length===8)dt=dt.slice(4);if(dt.length>4&&dt.length!==8)dt=dt.slice(-4);if(dt.length!==4)return val;let now=new Date();let y=now.getFullYear();let m=parseInt(dt.slice(0,2),10);let d=parseInt(dt.slice(2,4),10);if(m<now.getMonth()+1-2)y+=1;let dObj=new Date(y,m-1,d);if(isNaN(dObj.getTime()))return val;let dowKr=['일','월','화','수','목','금','토'][dObj.getDay()];return `${y}년 ${m}월 ${d}일 (${dowKr})`;};
window.formatCounselDateRaw=function(val){if(!val)return '';let match=val.match(/(\d+)년\s*(\d+)월\s*(\d+)일/);if(match)return String(match[2]).padStart(2,'0')+String(match[3]).padStart(2,'0');let dt=String(val).replace(/\D/g,'');if(dt.length>4)return dt.slice(-4);return dt;};
window.formatCounselTimeDisplay=function(val){if(!val)return '';let t=String(val).replace(/\D/g,'');if(t.length<3)return val;let hh=parseInt(t.length===3?t.slice(0,1):t.slice(0,2),10);let mm=t.length===3?t.slice(1,3):t.slice(2,4);let ampm=hh>=12?'오후':'오전';let hh12=hh%12||12;return `${ampm} ${hh12}:${mm}`;};
window.copyTxt=function(txt,successMsg="복사되었습니다."){if(navigator.clipboard&&window.isSecureContext){navigator.clipboard.writeText(txt).then(()=>{showToast(successMsg);}).catch(()=>{fallbackCopyTextToClipboard(txt,successMsg);});}else{fallbackCopyTextToClipboard(txt,successMsg);}};
function fallbackCopyTextToClipboard(text,successMsg){var textArea=document.createElement("textarea");textArea.value=text;textArea.style.cssText="position:fixed;top:0;left:0;";document.body.appendChild(textArea);textArea.focus();textArea.select();try{document.execCommand('copy');showToast(successMsg);}catch(err){showToast("복사 실패");}document.body.removeChild(textArea);}
window.fetchGoogleCalendarEvents=async function(yyyy,mm){const API_KEY='AIzaSyAjtrSlv56VPhtqMYGsQd0L4q1AlZTW1Ng';const CALENDAR_ID='wecoffeekorea@gmail.com';try{const timeMin=new Date(yyyy,mm-1,1).toISOString();const timeMax=new Date(yyyy,mm,0,23,59,59).toISOString();const url=`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(CALENDAR_ID)}/events?key=${API_KEY}&timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&orderBy=startTime`;const response=await fetch(url);if(!response.ok)return[];const data=await response.json();return(data.items||[]).map(event=>{let dateStr,timeStr;if(event.start.date){dateStr=event.start.date;timeStr='종일';}else if(event.start.dateTime){dateStr=event.start.dateTime.split('T')[0];timeStr=event.start.dateTime.split('T')[1].substring(0,5);}else return null;return{date:dateStr,time:timeStr,start:timeStr,text:event.summary||'일정',type:'google'};}).filter(Boolean);}catch(error){return[];}};
window.updateDailyInOutBanner=function(){let td=new Date();let ds=`${td.getFullYear()}-${String(td.getMonth()+1).padStart(2,'0')}-${String(td.getDate()).padStart(2,'0')}`;const getDailyEvents=(centerFilter)=>{let evts=[];gRes.forEach(r=>{if(r.res_date===ds&&r.center===centerFilter&&!String(r.status||'').includes('취소')){let st=String(r.res_time||"").split('~')[0].trim();let enParts=String(r.res_time||"").split('~');let en=enParts.length>1?enParts[1].trim():'';let spc=String(r.space_equip||"").split(' ')[0];evts.push({start:st,end:en,name:r.name,space:spc});}});return evts;};let centers=currentGlobalCenter==='전체'?['마포 센터','광진 센터']:[currentGlobalCenter];let html='';centers.forEach(c=>{let evts=getDailyEvents(c);if(evts.length===0){html+=`<div class="inout-card"><div style="font-weight:800;margin-bottom:8px;color:var(--text-display);border-bottom:1px solid var(--border-strong);padding-bottom:8px;">${c}</div><div style="font-size:13px;color:var(--text-secondary);padding:8px 0;">오늘 확정된 예약이 없습니다.</div></div>`;}else{let first=[...evts].sort((a,b)=>String(a.start||'').localeCompare(String(b.start||'')))[0];let last=[...evts].sort((a,b)=>String(b.end||'').localeCompare(String(a.end||'')))[0];html+=`<div class="inout-card" style="padding:16px;gap:8px;border-radius:12px;border:1px solid var(--border-strong);background:#fff;align-items:flex-start;text-align:left;width:100%;box-sizing:border-box;"><div style="font-weight:800;font-size:15px;margin-bottom:12px;color:var(--text-display);border-bottom:1px solid var(--border-strong);padding-bottom:8px;width:100%;">${c}</div><div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;width:100%;"><span style="font-weight:600;font-size:14px;color:var(--text-display);">[${first.space||''}] ${window.escapeHtml(first.name||'')}</span><span style="color:var(--text-secondary);font-size:13px;font-weight:600;">첫 입실 <strong style="color:var(--text-display);font-weight:600;">${first.start||''}</strong></span></div><div style="display:flex;align-items:center;justify-content:space-between;width:100%;"><span style="font-weight:600;font-size:14px;color:var(--text-display);">[${last.space||''}] ${window.escapeHtml(last.name||'')}</span><span style="color:var(--text-secondary);font-size:13px;font-weight:600;">최종 퇴실 <strong style="color:var(--text-display);font-weight:600;">${last.end||''}</strong></span></div></div>`;}});if($("dailyInOutBanner"))$("dailyInOutBanner").innerHTML=html;};

// ★★★ PATCH (연락처 정규화 F): phone을 정규화된 키로 통일 ★★★
window.updateCancelAccumulationBanner=function(){
    let now=new Date();
    let y=now.getFullYear();
    let m=String(now.getMonth()+1).padStart(2,'0');
    let monthPrefix=`${y}-${m}`;
    let cancelMap={};
    let addCancel=(phoneRaw,name,batch,desc,reason,dateStr)=>{
        let phone = window.normalizePhone(phoneRaw); // ← 정규화
        if(!phone)return;
        if(!cancelMap[phone])cancelMap[phone]={name,batch,phone,count:0,items:[]};
        cancelMap[phone].count++;
        cancelMap[phone].items.push({date:dateStr,desc:desc,reason:reason||'사유 미기재'});
    };
    gRes.forEach(r=>{
        if(r.status==='당일 취소'&&String(r.res_date||r.created_at).startsWith(monthPrefix)){
            let desc=`[예약] ${r.center||''} ${r.space_equip||'-'} (${r.res_time||''})`;
            addCancel(r.phone,r.name,r.batch,desc,r.cancel_reason,r.res_date);
        }
    });
    gTrn.forEach(t=>{
        if(t.status==='당일 취소'){
            let cInfo=String(t.content||'').split('||').map(s=>s.trim());
            let dateStr=cInfo.length>=5?cInfo[0]:String(t.created_at).slice(0,10);
            if(dateStr.startsWith(monthPrefix)){
                let desc=cInfo.length>=5?`[수강] ${cInfo[4]} (${cInfo[2]})`:`[수강] ${t.content}`;
                addCancel(t.phone,t.name,t.batch,desc,t.cancel_reason,dateStr);
            }
        }
    });
    window.cancelDataMap=cancelMap;
    let sorted=Object.entries(cancelMap).sort((a,b)=>b[1].count-a[1].count);
    let warnings=sorted.filter(([p,u])=>u.count>=4);
    let nonWarnings=sorted.filter(([p,u])=>u.count<4);
    let html='';
    if(sorted.length===0){
        html=`<div class="inout-card" style="text-align:center;color:var(--text-secondary);padding:16px;background:#fff;border:1px solid var(--border-strong);border-radius:12px;">이번 달 당일 취소 내역이 없습니다.</div>`;
    }else{
        warnings.forEach(([phone,user])=>{
            html+=`<div onclick="window.openCancelDetailModal('${phone}')" style="padding:14px 16px;border-radius:12px;display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;border:1px solid var(--error);background:#fff0f0;cursor:pointer;transition:0.15s;" onmouseover="this.style.background='#ffe5e5'" onmouseout="this.style.background='#fff0f0'"><div style="color:var(--error);font-weight:800;font-size:14px;">[${user.batch||'-'}] ${window.escapeHtml(user.name)} <span style="background:var(--error);color:#fff;font-size:11px;padding:2px 6px;border-radius:4px;margin-left:8px;font-weight:700;vertical-align:middle;">경고</span></div><div style="font-size:14px;font-weight:800;color:var(--error);">${user.count}회</div></div>`;
        });
        if(nonWarnings.length>0){
            let restRows='';
            nonWarnings.forEach(([phone,user])=>{
                restRows+=`<div onclick="window.openCancelDetailModal('${phone}')" style="padding:10px 14px;border-radius:8px;display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;border:1px solid var(--border-strong);background:#fff;cursor:pointer;transition:0.15s;" onmouseover="this.style.borderColor='var(--text-tertiary)'" onmouseout="this.style.borderColor='var(--border-strong)'"><div style="color:var(--text-display);font-weight:700;font-size:14px;">[${user.batch||'-'}] ${window.escapeHtml(user.name)}</div><div style="font-size:13px;font-weight:700;color:var(--text-secondary);">${user.count}회</div></div>`;
            });
            html+=`<div style="margin-top:${warnings.length>0?'8px':'0'};border:1px solid var(--border-strong);border-radius:12px;background:#fff;overflow:hidden;transition:0.15s;" onmouseover="this.style.borderColor='var(--text-tertiary)'" onmouseout="this.style.borderColor='var(--border-strong)'"><div onclick="window.toggleCancelAccordion()" style="padding:14px 16px;display:flex;justify-content:space-between;align-items:center;cursor:pointer;font-size:14px;font-weight:700;color:var(--text-secondary);background:#fff;"><span>1~3회 누적 멤버 (${nonWarnings.length}명)</span><span id="cancelAccordionArrow" style="color:var(--text-tertiary);font-size:12px;">▼</span></div><div id="cancelAccordionContent" style="display:none;padding:8px 12px 12px;border-top:1px solid var(--border-strong);">${restRows}</div></div>`;
        }
    }
    if($("cancelAccumulationBanner"))$("cancelAccumulationBanner").innerHTML=html;
};
window.toggleCancelAccordion=function(){
    let content=document.getElementById('cancelAccordionContent');
    let arrow=document.getElementById('cancelAccordionArrow');
    if(!content)return;
    if(content.style.display==='none'){
        content.style.display='block';
        if(arrow)arrow.textContent='▲';
    }else{
        content.style.display='none';
        if(arrow)arrow.textContent='▼';
    }
};
window.openCancelDetailModal=function(phone){
    let userData=window.cancelDataMap?.[phone];
    if(!userData){showToast('취소 내역을 찾을 수 없습니다.');return;}
    let modal=document.getElementById('cancelDetailModal');
    if(!modal){
        modal=document.createElement('div');
        modal.id='cancelDetailModal';
        modal.style.cssText='position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:99990;display:none;align-items:center;justify-content:center;padding:16px;box-sizing:border-box;';
        document.body.appendChild(modal);
        modal.addEventListener('click',function(e){if(e.target===modal)window.closeCancelDetailModal();});
    }
    let itemsHtml=userData.items.map((item,idx)=>`<div style="background:#f9fafb;padding:12px 14px;border-radius:8px;border:1px solid var(--border-strong);margin-bottom:8px;"><div style="font-size:11px;color:var(--text-tertiary);font-weight:700;margin-bottom:4px;">${idx+1}. ${item.date}</div><div style="font-size:13px;color:var(--text-display);font-weight:700;line-height:1.4;margin-bottom:6px;">${window.escapeHtml(item.desc)}</div><div style="font-size:12px;color:var(--text-secondary);background:#fff;padding:8px 10px;border-radius:6px;line-height:1.4;border:1px solid var(--border-strong);"><span style="color:var(--text-tertiary);font-weight:700;margin-right:4px;">사유:</span>${window.escapeHtml(item.reason)}</div></div>`).join('');
    modal.innerHTML=`<div style="background:#fff;border-radius:16px;width:100%;max-width:520px;max-height:80vh;display:flex;flex-direction:column;box-shadow:0 8px 32px rgba(0,0,0,0.18);overflow:hidden;"><div style="padding:20px 24px 16px;border-bottom:1px solid var(--border-strong);"><div style="font-size:16px;font-weight:800;color:var(--text-display);">[${userData.batch||'-'}] ${window.escapeHtml(userData.name)} 님 당일 취소 내역</div><div style="font-size:13px;color:var(--text-secondary);margin-top:4px;">이번 달 총 <strong style="color:${userData.count>=4?'var(--error)':'var(--text-display)'};font-size:15px;">${userData.count}회</strong> 당일 취소</div></div><div style="flex:1;overflow-y:auto;padding:16px 24px;">${itemsHtml}</div><div style="padding:16px 24px;border-top:1px solid var(--border-strong);display:flex;justify-content:flex-end;"><button class="btn-outline" onclick="window.closeCancelDetailModal()" style="padding:10px 20px;">닫기</button></div></div>`;
    modal.style.display='flex';
};
window.closeCancelDetailModal=function(){
    let modal=document.getElementById('cancelDetailModal');
    if(modal)modal.style.display='none';
};

window.renderNoticeData=function(){let fNoti=[...gNotice];fNoti.sort((a,b)=>{if(a.is_pinned===b.is_pinned)return window.safeKST(b.created_at)-window.safeKST(a.created_at);return a.is_pinned?-1:1;});if($("noticeTableBody"))$("noticeTableBody").innerHTML=fNoti.length?fNoti.map(n=>{let pinBadge=n.is_pinned?`<span class="status-badge badge-orange" style="margin-right:8px;">필독</span>`:`<span class="status-badge badge-gray" style="margin-right:8px;">일반</span>`;let statBadge=n.status==='발행'?`<span class="status-badge badge-green">발행 중</span>`:`<span class="status-badge badge-gray">숨김</span>`;let targetBadge=n.target_batch?`<span class="status-badge badge-blue">${window.escapeHtml(n.target_batch)}</span>`:`<span class="status-badge badge-gray">전체</span>`;let mPreview=`<td class="m-preview" onclick="this.closest('tr').classList.toggle('expanded')"><div class="m-prev-top"><span class="m-prev-date">${formatDt(n.created_at)}</span>${statBadge}</div><div class="m-prev-title" style="font-size:16px;">${pinBadge}${window.escapeHtml(n.title)}</div><span class="m-toggle-hint">관리 메뉴 보기 ▼</span></td>`;return `<tr>${mPreview}<td data-label="구분" class="tc">${pinBadge}</td><td data-label="대상" class="tc">${targetBadge}</td><td data-label="제목"><strong style="color:var(--text-display);">${window.escapeHtml(n.title)}</strong></td><td data-label="상태" class="tc">${statBadge}</td><td data-label="작성일">${formatDt(n.created_at)}</td><td data-label="관리" class="tc"><div class="action-wrap-flex" style="justify-content:center;"><button class="btn-outline btn-sm" onclick="window.editNotice('${n.id}')">수정</button> <button class="btn-outline btn-sm" onclick="window.deleteNotice('${n.id}')" style="color:var(--error);border-color:var(--error)">삭제</button></div></td></tr>`;}).join(""):`<tr><td colspan="6" class="empty-state">등록된 공지사항이 없습니다.</td></tr>`;};
window.updateDashSpaceFilter=function(){let filter=$("dashSpaceFilter");if(!filter)return;let currentVal=filter.value;let html=`<option value="전체">전체 공간</option>`;if(currentGlobalCenter==='마포 센터')html+=`<option value="에스프레소존">에스프레소존</option><option value="로스팅존">로스팅존</option><option value="브루잉존">브루잉존</option><option value="커핑존">커핑존</option><option value="스터디존">스터디존</option>`;else if(currentGlobalCenter==='광진 센터')html+=`<option value="에스프레소존">에스프레소존</option><option value="로스팅존">로스팅존</option><option value="브루잉존">브루잉존</option><option value="커핑존">커핑존</option><option value="스터디룸">스터디룸</option>`;else html+=`<option value="에스프레소존">에스프레소존</option><option value="로스팅존">로스팅존</option><option value="브루잉존">브루잉존</option><option value="커핑존">커핑존</option><option value="스터디">스터디존/룸</option>`;filter.innerHTML=html;if([...filter.options].some(o=>o.value===currentVal))filter.value=currentVal;else filter.value='전체';};
window.currentSpaceOpts=[];

window.updateSpaceOptions=function(){let center=$("blkCenter")?$("blkCenter").value:"마포 센터";window.currentSpaceOpts=['전체 (공간 전체)'];if(center==='마포 센터'){window.currentSpaceOpts.push('에스프레소존','아스토리아 스톰 1번(좌)','아스토리아 스톰 2번(우)','로스팅존','이지스터 800 1번(좌)','이지스터 800 2번(우)','이지스터 1.8','스트롱홀드 S7X','브루잉존','커핑존','스터디존');}else{window.currentSpaceOpts.push('에스프레소존','시네소 MVP 1번(좌)','시네소 MVP 2번(우)','페마 페미나','산레모 You','이글원 프리마 프로','이글원 프리마 EXP','로스팅존','이지스터 800 1번(좌)','이지스터 800 2번(우)','이지스터 1.8 1번(좌)','이지스터 1.8 2번','스트롱홀드 S7X','브루잉존','커핑존','스터디룸');}let blkSpaceInput=$("blkSpace");if(!blkSpaceInput)return;blkSpaceInput.removeAttribute('list');let wrapper=document.getElementById('custom-space-dropdown');if(!wrapper){wrapper=document.createElement('div');wrapper.id='custom-space-dropdown';wrapper.style.cssText='position:absolute;background:#fff;border:1px solid var(--border-strong);border-radius:8px;max-height:200px;overflow-y:auto;width:100%;z-index:9999;display:none;box-shadow:0 4px 12px rgba(0,0,0,0.15);margin-top:4px;';blkSpaceInput.parentNode.style.position='relative';blkSpaceInput.parentNode.appendChild(wrapper);blkSpaceInput.addEventListener('focus',()=>{wrapper.style.display='block';window.renderCustomOptions("");});blkSpaceInput.addEventListener('click',()=>{wrapper.style.display='block';window.renderCustomOptions("");});document.addEventListener('click',(e)=>{if(e.target!==blkSpaceInput&&!wrapper.contains(e.target))wrapper.style.display='none';});blkSpaceInput.addEventListener('input',function(){let parts=this.value.split(',');let lastTerm=parts[parts.length-1].trim();wrapper.style.display='block';window.renderCustomOptions(lastTerm);});}window.renderCustomOptions=(searchTerm="")=>{let currentArr=blkSpaceInput.value?blkSpaceInput.value.split(',').map(s=>s.trim()).filter(Boolean):[];let filteredOpts=searchTerm?window.currentSpaceOpts.filter(opt=>opt.toLowerCase().includes(searchTerm.toLowerCase())):window.currentSpaceOpts;if(filteredOpts.length===0){wrapper.innerHTML=`<div style="padding:10px 12px;font-size:13px;color:var(--text-secondary);">검색 결과가 없습니다.</div>`;}else{wrapper.innerHTML=filteredOpts.map(opt=>{let isSelected=currentArr.includes(opt);let bgStyle=isSelected?'background:#e8f0fe;color:var(--primary);font-weight:800;':'';return `<div class="space-opt-item" style="padding:10px 12px;cursor:pointer;font-size:14px;border-bottom:1px solid #f2f4f6;transition:0.1s;${bgStyle}">${opt}</div>`;}).join('');}wrapper.querySelectorAll('.space-opt-item').forEach(item=>{item.addEventListener('click',function(e){e.preventDefault();e.stopPropagation();let clickedVal=this.innerText.trim();let parts=blkSpaceInput.value.split(',').map(s=>s.trim());if(searchTerm)parts.pop();if(clickedVal==='전체 (공간 전체)'){blkSpaceInput.value='전체 (공간 전체)';}else{let arr=parts.filter(s=>s!=='전체 (공간 전체)'&&s!=='');if(!arr.includes(clickedVal))arr.push(clickedVal);else arr=arr.filter(v=>v!==clickedVal);blkSpaceInput.value=arr.join(', ');}blkSpaceInput.focus();window.renderCustomOptions("");});});};let currentVals=blkSpaceInput.value.split(',').map(s=>s.trim()).filter(Boolean);if(currentVals.some(v=>!window.currentSpaceOpts.includes(v)&&v!==""))blkSpaceInput.value='';window.renderCustomOptions("");};

let fetchDebounceTimer = null;
let pollingTimer = null;

function hasActiveCheckboxSelection() {
    try {
        return document.querySelectorAll('input[type="checkbox"]:checked').length > 0
            && document.querySelectorAll('.chk-ord:checked, .chk-res:checked, .chk-trn:checked, .chk-mem:checked, input[type="checkbox"][class*="chk-ord-dyn"]:checked').length > 0;
    } catch(e) { return false; }
}

// ★★★ PATCH (서버부하 ①②④): 폴링 10분, notices 구독 제거, Realtime은 force:true ★★★
function startRealtimeSync(){
    if(realtimeChannel) return;
    function debouncedFetchCenter() {
        clearTimeout(fetchDebounceTimer);
        fetchDebounceTimer = setTimeout(() => {
            if(hasActiveCheckboxSelection()) {
                clearTimeout(fetchDebounceTimer);
                fetchDebounceTimer = setTimeout(debouncedFetchCenter, 15000);
                return;
            }
            window.fetchCenterData({force: true});
        }, 10000);
    }
    realtimeChannel = supabaseClient.channel('admin-realtime')
        .on('postgres_changes',{event:'*',schema:'public',table:'reservations'}, debouncedFetchCenter)
        .on('postgres_changes',{event:'*',schema:'public',table:'trainings'},    debouncedFetchCenter)
        .on('postgres_changes',{event:'*',schema:'public',table:'orders'},       debouncedFetchCenter)
        .on('postgres_changes',{event:'*',schema:'public',table:'blocks'},       debouncedFetchCenter)
        .on('postgres_changes',{event:'*',schema:'public',table:'applications'}, ()=>{ window.fetchApplications(); })
        .on('postgres_changes',{event:'*',schema:'public',table:'members'},      ()=>{ window.fetchMembers(); })
        .subscribe((status) => { console.log('[Realtime]', status); });
    if(pollingTimer) clearInterval(pollingTimer);
    pollingTimer = setInterval(() => {
        if(document.visibilityState !== 'visible') return;
        if(hasActiveCheckboxSelection()) return;
        window.fetchCenterData();
    }, 600000);
}

document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && isAppInitialized) {
        window.fetchCenterData();
    }
});

function handleLoginSuccess(){var lv=$("login-view");if(lv)lv.classList.remove('active');var dv=$("dashboard-view");if(dv)dv.style.display='block';startRealtimeSync();let savedMain=localStorage.getItem('wecoffee_main_tab')||'page-center';let savedSub=localStorage.getItem('wecoffee_sub_tab')||'sub-res';if(savedSub==='sub-trn'||savedSub==='sub-blk')savedSub='sub-trn-blk';let mainEl=document.querySelector(`.gnb-item[onclick*="${savedMain}"]`);if(mainEl)window.switchMainTab(savedMain,mainEl);else window.switchMainTab('page-center',document.querySelector(`.gnb-item[onclick*="page-center"]`));if(savedMain==='page-center'){let subEl=document.querySelector(`.sub-item[onclick*="${savedSub}"]`);if(subEl)window.switchSubTab(savedSub,subEl);}}
function initializeApp(){window.fetchHolidays(new Date().getFullYear());if(window.updateDashSpaceFilter)window.updateDashSpaceFilter();supabaseClient.auth.getSession().then(({data:{session}})=>{if(session&&!isAppInitialized){handleLoginSuccess();isAppInitialized=true;}});supabaseClient.auth.onAuthStateChange((event,session)=>{if(session){if(!isAppInitialized){handleLoginSuccess();isAppInitialized=true;}}else{var lv=$("login-view");if(lv)lv.classList.add('active');var dv=$("dashboard-view");if(dv)dv.style.display='none';isAppInitialized=false;if(realtimeChannel){supabaseClient.removeChannel(realtimeChannel);realtimeChannel=null;}if(pollingTimer){clearInterval(pollingTimer);pollingTimer=null;}}});}
if(document.readyState==='loading')document.addEventListener("DOMContentLoaded",initializeApp);else initializeApp();
window.switchMainTab=function(pageId,element){$$$(".page").forEach(p=>p.classList.remove('active'));if($(pageId))$(pageId).classList.add('active');$$$(".gnb-item").forEach(item=>item.classList.remove('active'));let targetEl=element||document.querySelector(`.gnb-item[onclick*="${pageId}"]`);if(targetEl)targetEl.classList.add('active');localStorage.setItem('wecoffee_main_tab',pageId);if(pageId==='page-center')window.fetchCenterData();if(pageId==='page-applications'){window.fetchApplications();isInsightView=false;if($("app-table-area"))$("app-table-area").style.display="block";if($("app-insight-area"))$("app-insight-area").style.display="none";if($("insightToggleBtn"))$("insightToggleBtn").innerText="인사이트 보기";}if(pageId==='page-members')window.fetchMembers();};
window.switchSubTab=function(subId,element){$$$(".sub-page").forEach(p=>p.classList.remove('active'));if($(subId))$(subId).classList.add('active');$$$(".sub-item").forEach(item=>item.classList.remove('active'));let targetEl=element||document.querySelector(`.sub-item[onclick*="${subId}"]`);if(targetEl){targetEl.classList.add('active');targetEl.classList.remove("tab-pulse");}if(subId==='sub-notice'){if($('globalFilterWrap'))$('globalFilterWrap').style.display='none';}else{if($('globalFilterWrap'))$('globalFilterWrap').style.display='inline-flex';}localStorage.setItem('wecoffee_sub_tab',subId);if(subId==='sub-res'||subId==='sub-trn-blk'||subId==='sub-ord'){window.fetchCenterData();}};
window.handleLogin=async function(e){e.preventDefault();const email=$("loginEmail").value,password=$("loginPassword").value;const{error}=await supabaseClient.auth.signInWithPassword({email,password});if(error)showToast("접근 권한이 없습니다.");else showToast("접속되었습니다.");};
window.handleLogout=async function(){await supabaseClient.auth.signOut();showToast("로그아웃 되었습니다.");};
window.openCustomConfirm=function(title,statusHtml,actionHtml,callbackOrText,btnText='적용하기'){if($("confirmTarget"))$("confirmTarget").innerHTML=title;if(statusHtml){if($("confirmStateBox"))$("confirmStateBox").style.display='block';if($("confirmSimpleBox"))$("confirmSimpleBox").style.display='none';if($("confirmStatus"))$("confirmStatus").innerHTML=statusHtml;if($("confirmActionState"))$("confirmActionState").innerHTML=actionHtml;}else{if($("confirmStateBox"))$("confirmStateBox").style.display='none';if($("confirmSimpleBox"))$("confirmSimpleBox").style.display='block';if($("confirmActionSimple"))$("confirmActionSimple").innerHTML=actionHtml;}let btn=$("confirmBtn");if(btn){btn.innerText=btnText;let newBtn=btn.cloneNode(true);btn.parentNode.replaceChild(newBtn,btn);newBtn.onclick=function(){if(btnText==='복사하기'){window.copyTxt(callbackOrText,"상담 안내 메시지가 복사되었습니다.");window.closeConfirmModal();}else{(async()=>{newBtn.disabled=true;let originalText=newBtn.innerText;newBtn.innerText="처리 중...";try{await callbackOrText();}catch(e){console.error(e);}finally{newBtn.disabled=false;newBtn.innerText=originalText;window.closeConfirmModal();}})();}};let cancelBtn=newBtn.previousElementSibling;if(cancelBtn&&cancelBtn.tagName==='BUTTON'){cancelBtn.style.display=(btnText==='확인')?'none':'block';}}if($("confirmModal"))$("confirmModal").classList.add('show');};
window.closeConfirmModal=function(){if($("confirmModal"))$("confirmModal").classList.remove('show');};
window.closeOnBackdrop=function(event,modalId){if(event.target.id===modalId&&$(modalId))$(modalId).classList.remove('show');};
window.showCancelReason=function(reason){window.openCustomConfirm("당일 취소 사유",null,`<div style="padding:16px;background:#f9fafb;border-radius:8px;text-align:left;font-size:14px;line-height:1.5;color:var(--text-display);border:1px solid var(--border-strong);white-space:pre-wrap;">${window.escapeHtml(reason||'사유가 기재되지 않았습니다.')}</div>`,()=>{},"확인");};
window.isOrderExpired=function(order,now){let baseDate=order.delivery_date?window.parseDeliveryDate(order.delivery_date):window.safeKST(order.created_at);let cancelBaseDate=order.updated_at?window.safeKST(order.updated_at):baseDate;let status=order.status||'주문 접수';if(['주문 접수','입금 대기','입금 확인 중','입금 확인','대기'].includes(status))return false;if(status==='주문 취소'||status==='품절')return(now.getTime()-cancelBaseDate.getTime())>48*60*60*1000;if(status==='센터 도착')return(now.getTime()-baseDate.getTime())>7*24*60*60*1000;return false;};

// ▼▼▼ 파트2에서 이어집니다 (fetchCenterData 부터) ▼▼▼
// ★★★ PATCH (서버부하 ⑥ + B): fetchCenterData 3중 방어선 + orders 90일 필터 ★★★
let isFetchingCenter = false;
let lastCenterFetchAt = 0;
const CENTER_STALE_MS = 120000; // 2분

window.fetchCenterData = async function(opts) {
  opts = opts || {};
  const force = opts.force === true;

  if (isFetchingCenter) return;

  if (!force && (Date.now() - lastCenterFetchAt) < CENTER_STALE_MS && lastCenterFetchAt > 0) {
    try { window.renderCenterData(); } catch(e) { console.error(e); }
    try { window.renderDashboard(); } catch(e) { console.error(e); }
    try { window.renderNoticeData(); } catch(e) { console.error(e); }
    try {
      if(!document.getElementById('timeline-area')) {
        const dailyBanner=document.getElementById('dailyInOutBanner');
        const cancelBanner=document.getElementById('cancelAccumulationBanner');
        if(dailyBanner&&cancelBanner){let commonWrapper=dailyBanner.parentElement;while(commonWrapper&&!commonWrapper.contains(cancelBanner)){commonWrapper=commonWrapper.parentElement;}if(commonWrapper){const area=document.createElement('div');area.id='timeline-area';commonWrapper.insertAdjacentElement('afterend',area);}}
        else if(dailyBanner&&dailyBanner.parentNode){let wrapper=dailyBanner.parentElement;if(wrapper.parentElement&&wrapper.parentElement.tagName==='DIV')wrapper=wrapper.parentElement;const area=document.createElement('div');area.id='timeline-area';wrapper.insertAdjacentElement('afterend',area);}
      }
      if(window.renderTimeline) window.renderTimeline();
    } catch(e) { console.error(e); }
    return;
  }

  isFetchingCenter = true;
  const lockSafetyTimer = setTimeout(() => {
    console.warn('[fetchCenterData] 안전 타임아웃 — 락 강제 해제');
    isFetchingCenter = false;
  }, 30000);

  try {
    const now = new Date();
    const sixtyDaysAgo = new Date(now);
    sixtyDaysAgo.setDate(now.getDate() - 60);
    const sixtyDaysAgoDate = sixtyDaysAgo.toISOString().split('T')[0];
    const sixtyDaysAgoISO = sixtyDaysAgo.toISOString();
    const todayDate = now.toISOString().split('T')[0];

    const [res, trn, ord, blk, noti] = await Promise.all([
      supabaseClient.from('reservations')
        .select('id, created_at, batch, name, phone, res_date, res_time, center, space_equip, status, cancel_reason')
        .gte('res_date', sixtyDaysAgoDate)
        .order('created_at', {ascending: false})
        .limit(500),
      supabaseClient.from('trainings')
        .select('id, created_at, batch, name, phone, content, status, cancel_reason')
        .gte('created_at', sixtyDaysAgoISO)
        .order('created_at', {ascending: false})
        .limit(500),
      // ★ PATCH (B): 진행 중 상태는 기간 무관 전부 + 60일 이내 건. 오래된 진행 중 주문이 잘리는 사고 방지
      supabaseClient.from('orders')
        .select('*')
        .or(`status.in.("주문 접수","입금 대기","입금 확인 중","입금 확인"),created_at.gte.${sixtyDaysAgoISO}`)
        .order('created_at', {ascending: false})
        .limit(1000),
      supabaseClient.from('blocks')
        .select('id, block_date, start_time, end_time, category, center, space_equip, reason, capacity, target_batch')
        .gte('block_date', todayDate)
        .order('block_date', {ascending: false}),
      supabaseClient.from('notices')
        .select('id, created_at, title, content, is_pinned, status, target_batch')
        .order('created_at', {ascending: false})
        .limit(100)
    ]);

    gRes = res?.data || [];
    gTrn = trn?.data || [];
    gOrd = ord?.data || [];
    gBlk = blk?.data || [];
    gNotice = noti?.data || [];

    try {
      gRes.forEach(r=>{if(r.space_equip)r.space_equip=String(r.space_equip).replace(/로스팅룸/g,'로스팅존');});
      gBlk.forEach(b=>{if(b.space_equip)b.space_equip=String(b.space_equip).replace(/로스팅룸/g,'로스팅존');});
      gTrn.forEach(t=>{if(t.content)t.content=String(t.content).replace(/로스팅룸/g,'로스팅존');});
      let bSet=new Set();gRes.forEach(r=>{if(r.batch)bSet.add(r.batch);});gTrn.forEach(t=>{if(t.batch)bSet.add(t.batch);});
      let bHtml=`<option value="전체">전체 기수</option>`+Array.from(bSet).sort((a,b)=>parseInt(String(a).replace(/[^0-9]/g,'')||0)-parseInt(String(b).replace(/[^0-9]/g,'')||0)).map(b=>`<option value="${b}">${b}</option>`).join("");
      if($("dashBatchFilter")&&$("dashBatchFilter").innerHTML!==bHtml)$("dashBatchFilter").innerHTML=bHtml;
      let sSet=new Set();gRes.forEach(r=>{if(r.space_equip)sSet.add(String(r.space_equip).split(' ')[0]);});
      let sHtml=`<option value="전체">전체 공간/장비</option>`+Array.from(sSet).sort().map(s=>`<option value="${s}">${s}</option>`).join("");
      if($("resSpaceFilter")&&$("resSpaceFilter").innerHTML.length<100)$("resSpaceFilter").innerHTML=sHtml;
      let todayForFilter=new Date();todayForFilter.setHours(0,0,0,0);
      let tSet=new Set();gTrn.forEach(t=>{let cInfo=String(t.content||'').split('||').map(s=>s.trim());if(cInfo.length>=5){let tDateObj=new Date(cInfo[0]);tDateObj.setHours(0,0,0,0);if(tDateObj>=todayForFilter)tSet.add(`[${cInfo[0]}] [${cInfo[2]}] ${cInfo[4]}`);}else{tSet.add(String(t.content||'').trim());}});
      let tHtml=`<option value="전체">전체 콘텐츠</option>`+Array.from(tSet).sort().map(c=>`<option value="${window.escapeHtml(c)}">${window.escapeHtml(c)}</option>`).join("");
      if($("trnContentFilter")&&$("trnContentFilter").innerHTML.length<100)$("trnContentFilter").innerHTML=tHtml;
    } catch(err) { console.error("Data prep error:", err); }

    lastCenterFetchAt = Date.now();

  } catch(e) {
    console.error("fetchCenterData Error:", e);
  } finally {
    clearTimeout(lockSafetyTimer);
    isFetchingCenter = false;
  }

  try { window.renderCenterData(); } catch(e) { console.error(e); }
  try { window.renderDashboard(); } catch(e) { console.error(e); }
  try { window.renderNoticeData(); } catch(e) { console.error(e); }
  try {
    if(!document.getElementById('timeline-area')) {
      const dailyBanner=document.getElementById('dailyInOutBanner');
      const cancelBanner=document.getElementById('cancelAccumulationBanner');
      if(dailyBanner&&cancelBanner){let commonWrapper=dailyBanner.parentElement;while(commonWrapper&&!commonWrapper.contains(cancelBanner)){commonWrapper=commonWrapper.parentElement;}if(commonWrapper){const area=document.createElement('div');area.id='timeline-area';commonWrapper.insertAdjacentElement('afterend',area);}}
      else if(dailyBanner&&dailyBanner.parentNode){let wrapper=dailyBanner.parentElement;if(wrapper.parentElement&&wrapper.parentElement.tagName==='DIV')wrapper=wrapper.parentElement;const area=document.createElement('div');area.id='timeline-area';wrapper.insertAdjacentElement('afterend',area);}
    }
    if(window.renderTimeline) window.renderTimeline();
  } catch(e) { console.error(e); }
};

// ▼▼▼ 파트1 끝 — 다음은 toggleDashView, renderCenterData, renderTimeline 등 (파트2) ▼▼▼
// ▼▼▼ 파트2 시작 (toggleDashView 부터) ▼▼▼

window.toggleDashView=function(view){currentDashView=view;if(view==='month'){if($("dashMonthNav"))$("dashMonthNav").style.display='flex';}else{if($("dashMonthNav"))$("dashMonthNav").style.display='none';currentDashMonthOffset=0;}window.renderDashboard();};
window.changeDashMonth=function(offset){currentDashMonthOffset+=offset;window.renderDashboard();};
window.resetDashMonth=function(){currentDashMonthOffset=0;window.renderDashboard();};

// ★★★ PATCH (E): renderCenterData 시작/끝에 체크박스 보존·복원 ★★★
window.renderCenterData=function(){
  // ★ E-1: 렌더 직전 체크박스 상태 저장
  const _savedCheckboxes = (typeof window.preserveCheckboxState === 'function') ? window.preserveCheckboxState() : null;

  const now=new Date();const oneMonthAgo=new Date();oneMonthAgo.setDate(now.getDate()-30);let todayForBlk=new Date();todayForBlk.setHours(0,0,0,0);
  try{window.updateDailyInOutBanner();if(window.updateCancelAccumulationBanner)window.updateCancelAccumulationBanner();}catch(e){}
  try{const addTooltipToText=(textMatch,id,tooltipText,isLong=false)=>{let titles=document.querySelectorAll('.page-title,.section-title,h2,h3,.table-toolbar > div,.sub-page-title');titles.forEach(el=>{if(el.textContent.includes(textMatch)&&!document.getElementById(id)&&!el.closest('#dynamic-ord-container')){let sub=el.querySelector('.sub-text');if(sub)sub.remove();el.style.display='flex';el.style.alignItems='center';el.style.gap='6px';el.insertAdjacentHTML('beforeend',`<i id="${id}" class="info-tooltip ${isLong?'long-text':''}" data-tippy="${tooltipText}" onmouseenter="window.showGlobalTooltip(event,this)" onmouseleave="window.hideGlobalTooltip()">i</i>`);}});};
  let resTitle=document.querySelector('#sub-res .table-toolbar .section-title');if(resTitle&&resTitle.textContent.includes('상세 예약 로그'))resTitle.innerHTML='센터 예약 리스트';if(resTitle&&!document.getElementById('resAccordionBtn')){resTitle.innerHTML+=`<button id="resAccordionBtn" class="btn-outline btn-sm" style="margin-left:12px;font-size:12px;padding:2px 8px;height:26px;" onclick="window.toggleResAccordion()">접기 ▲</button>`;}
  addTooltipToText('센터 예약 리스트','tt-res','최근 1개월(30일) 내의 예약만 표시됩니다. 이전 내역은 서버에 안전하게 보관됩니다.',true);addTooltipToText('수업 및 훈련','tt-trn','종료된 일정은 자정(다음 날)을 기점으로 리스트에서 자동 정리되며, 과거 내역은 서버에 보관됩니다.',true);addTooltipToText('생두 주문 관리','tt-ord-main',"주문 및 입금 관련 상태는 리스트에 계속 유지됩니다. 단, '취소/품절' 건은 2일 뒤, '센터 도착' 건은 7일 뒤 자동 정리되어 서버에 보관됩니다.",true);}catch(e){}
  try{let resTable=$("resTableBody")?.closest('table');if(resTable){let theadTr=resTable.querySelector('thead tr');if(theadTr){let firstTh=theadTr.querySelector('th');if(firstTh&&!firstTh.querySelector('input[type="checkbox"]')&&firstTh.innerText.includes('접수')){let chkTh=document.createElement('th');chkTh.style.width='48px';chkTh.style.textAlign='center';chkTh.innerHTML='<input type="checkbox" onchange="window.toggleAll(this,\'chk-res\')">';theadTr.insertBefore(chkTh,firstTh);}}}let trnTable=$("trnTableBody")?.closest('table');if(trnTable){let theadTr=trnTable.querySelector('thead tr');if(theadTr){let firstTh=theadTr.querySelector('th');if(firstTh&&!firstTh.querySelector('input[type="checkbox"]')&&(firstTh.innerText.includes('신청')||firstTh.innerText.includes('일시'))){let chkTh=document.createElement('th');chkTh.style.width='48px';chkTh.style.textAlign='center';chkTh.innerHTML='<input type="checkbox" onchange="window.toggleAll(this,\'chk-trn\')">';theadTr.insertBefore(chkTh,firstTh);}}}}catch(e){}
  try{let qRes=($("searchRes")?.value||"").toLowerCase();let sRes=$("resSpaceFilter")?.value||"전체";let fRes=gRes.filter(r=>{let rDate=window.safeKST(r.res_date||r.created_at);let matchSpace=sRes==='전체'||String(r.space_equip||'').includes(sRes);return(rDate>=oneMonthAgo)&&(currentGlobalCenter==='전체'||r.center===currentGlobalCenter)&&(`${r.name} ${r.phone}`.toLowerCase().includes(qRes))&&matchSpace;});window.currentFilteredRes=fRes;currentResPage=1;window.renderResTablePage();}catch(e){console.error(e);}
  try{let qTrn=($("searchTrn")?.value||"").toLowerCase();let sTrn=$("trnContentFilter")?.value||"전체";let fTrnList=gTrn.filter(t=>{let matchContent=true;let cInfo=String(t.content||'').split('||').map(s=>s.trim());if(sTrn!=='전체'){let targetStr=cInfo.length>=5?`[${cInfo[0]}] [${cInfo[2]}] ${cInfo[4]}`:String(t.content||'').trim();if(targetStr.replace(/\s+/g,'')!==sTrn.replace(/\s+/g,''))matchContent=false;}if(cInfo.length>=5){let tDateObj=new Date(cInfo[0]);tDateObj.setHours(0,0,0,0);if(tDateObj<todayForBlk)return false;}else{let tDate=window.safeKST(t.created_at);if(tDate<oneMonthAgo)return false;}return(currentGlobalCenter==='전체'||String(t.content||"").includes(currentGlobalCenter))&&(`${t.name} ${t.phone} ${t.content}`.toLowerCase().includes(qTrn))&&matchContent;});window.currentFilteredTrn=fTrnList;
  if($("trnTableBody"))$("trnTableBody").innerHTML=fTrnList.length?fTrnList.map(t=>{let displayStatus=t.status||'';let actBtn=String(displayStatus).includes('취소')?'':`<button class="btn-outline btn-sm" onclick="window.cancelAction('trainings','${t.id}')">취소</button>`;let cInfo=String(t.content||'').split('||').map(s=>s.trim());let niceContent=t.content;let preDate=cInfo[0]||'-',preTime=cInfo[2]||'-',preCenter=cInfo[3]||'-',preName=cInfo[4]||'-';let contentName=cInfo.length>=5?cInfo[4]:String(t.content||'').trim();let attendCount=gTrn.filter(x=>{if(x.phone!==t.phone)return false;if(String(x.status||'').includes('취소'))return false;let xInfo=String(x.content||'').split('||').map(s=>s.trim());let xName=xInfo.length>=5?xInfo[4]:String(x.content||'').trim();return xName===contentName;}).length;t._attendCount=attendCount;let nthBadge=attendCount>=2?`<span class="nth-badge">${attendCount}회차</span>`:'';if(cInfo.length>=5){niceContent=`<div style="margin-bottom:4px;font-size:12px;color:var(--text-secondary);">[${cInfo[3]}] ${cInfo[0]} (${cInfo[2]})</div><div style="font-weight:600;color:var(--text-display);line-height:1.4;">${window.escapeHtml(cInfo[4])} <span style="font-weight:400;color:var(--text-tertiary);margin-left:4px;">- ${cInfo[1]||''}</span></div>`;}let badgeClass=displayStatus==='당일 취소'?'badge-red':(String(displayStatus).includes('취소')?'badge-gray':(displayStatus==='접수완료'?'badge-green':'badge-gray'));let statHtml=displayStatus==='당일 취소'?`<span class="status-badge ${badgeClass}" style="cursor:pointer;" data-reason="${window.escapeHtml(t.cancel_reason||'사유 미기재')}" onclick="event.stopPropagation();window.showCancelReason(this.getAttribute('data-reason'))">${displayStatus}</span>`:`<span class="status-badge ${badgeClass}">${displayStatus}</span>`;let dow=getDow(preDate);let mPreview=`<td class="m-preview has-checkbox" onclick="this.closest('tr').classList.toggle('expanded')"><div class="m-prev-top"><span class="m-prev-date" style="font-weight:700;color:var(--primary);font-size:13px;">[${t.batch||'-'}] ${window.escapeHtml(t.name)} ${nthBadge}</span>${statHtml}</div><div class="m-prev-title" style="font-size:18px;color:var(--text-display);letter-spacing:-0.5px;">${preDate}(${dow}) ${preTime}</div><div class="m-prev-desc" style="font-size:13px;font-weight:500;">[${preCenter}] ${window.escapeHtml(preName)}</div><span class="m-toggle-hint">상세 정보 보기 ▼</span></td>`;return `<tr>${mPreview}<td data-label="선택" class="tc"><input type="checkbox" class="chk-trn" value="${t.id}" ${String(displayStatus).includes('취소')?'disabled':''}></td><td data-label="신청일">${formatDt(t.created_at)}</td><td data-label="기수">${t.batch||'-'}</td><td data-label="성함" style="white-space:nowrap;"><strong style="vertical-align:middle;">${window.escapeHtml(t.name)}</strong>${nthBadge}</td><td data-label="연락처">${window.escapeHtml(t.phone)}</td><td data-label="정보">${niceContent}</td><td data-label="상태" class="tc">${statHtml}</td><td data-label="관리">${actBtn}</td></tr>`;}).join(""):`<tr><td colspan="9" class="empty-state">내역 없음</td></tr>`;}catch(e){console.error(e);}
  try{let qOrd=($("searchOrd")?.value||"").toLowerCase();let vOrd=$("ordVendorFilter")?.value||"전체";let isOrdFilter=$("filterPendingOrd")?.checked;let fOrd=gOrd.filter(o=>{let matchCenter=(currentGlobalCenter==='전체'||o.center===currentGlobalCenter);let matchQ=`${o.name} ${o.phone} ${o.vendor} ${o.item_name} ${o.center||''}`.toLowerCase().includes(qOrd);let matchV=vOrd==='전체'?true:o.vendor===vOrd;let matchS=isOrdFilter?(o.status==='주문 접수'):true;return matchCenter&&matchQ&&matchV&&matchS;});if(!isOrdFilter){fOrd=fOrd.filter(o=>!window.isOrderExpired(o,now));}let groupedOrders={};fOrd.forEach(o=>{let dateKey=window.formatDeliveryDateFull(o.delivery_date);if(!groupedOrders[dateKey])groupedOrders[dateKey]=[];groupedOrders[dateKey].push(o);});let sortedKeys=Object.keys(groupedOrders).sort((a,b)=>window.parseDeliveryDate(groupedOrders[a][0].delivery_date)-window.parseDeliveryDate(groupedOrders[b][0].delivery_date));let dynamicHtml='';if(sortedKeys.length===0){dynamicHtml=`<div class="table-wrap" style="margin-bottom:32px;"><div class="empty-state">발주 내역이 없습니다.</div></div>`;}else{sortedKeys.forEach((key,idx)=>{let list=groupedOrders[key];let uniqClass='chk-ord-dyn-'+idx;dynamicHtml+=`<div class="section-title" style="margin-bottom:12px;display:flex;align-items:center;flex-wrap:wrap;"><span style="background:#212529;color:#fff;padding:6px 12px;border-radius:8px;font-size:14px;font-weight:700;display:inline-block;letter-spacing:-0.5px;">${key} 발주</span></div>`;dynamicHtml+=`<div class="table-wrap" style="margin-bottom:32px;"><table><thead><tr><th style="width:36px;text-align:center;"><input type="checkbox" onchange="window.toggleAll(this,'${uniqClass}')"></th><th style="width:130px;">주문 시간</th><th style="width:56px;text-align:center;">수령 센터</th><th style="width:96px;">주문자</th><th>생두사 / 상품명</th><th style="width:40px;text-align:center;">수량</th><th style="width:80px;text-align:right;">총 금액</th><th style="width:110px;text-align:center;border-left:1px solid var(--border-strong);">결제</th><th style="width:96px;text-align:center;border-left:1px solid var(--border-strong);">배송</th></tr></thead><tbody>${generateOrderRows(list,uniqClass,key)}</tbody></table></div>`;});}let ordTab=document.getElementById('sub-ord');if(ordTab){let container=document.getElementById('dynamic-ord-container');if(!container){container=document.createElement('div');container.id='dynamic-ord-container';let fw=ordTab.querySelector('.filter-wrap');if(fw)fw.parentNode.insertBefore(container,fw.nextSibling);else ordTab.appendChild(container);}container.innerHTML=dynamicHtml;Array.from(ordTab.children).forEach(child=>{if(child.id!=='dynamic-ord-container'&&!child.classList.contains('filter-wrap')&&!child.classList.contains('table-toolbar')&&!child.querySelector('.filter-wrap'))child.style.display='none';});}}catch(e){console.error(e);}
  try{let fBlk=gBlk.filter(b=>{let bDate=new Date(b.block_date);bDate.setHours(0,0,0,0);let matchCenter=(currentGlobalCenter==='전체'||b.center===currentGlobalCenter);return matchCenter&&(bDate>=todayForBlk);});
  let blkTable=$("blkTableBody")?.closest('table');if(blkTable){let theadTr=blkTable.querySelector('thead tr');if(theadTr&&!theadTr.querySelector('th[data-col="target-batch"]')){let capTh=Array.from(theadTr.querySelectorAll('th')).find(th=>th.textContent.includes('정원'));if(capTh){let batchTh=document.createElement('th');batchTh.setAttribute('data-col','target-batch');batchTh.textContent='대상 기수';batchTh.className='tc';capTh.parentNode.insertBefore(batchTh,capTh);}}}
  if($("blkTableBody"))$("blkTableBody").innerHTML=fBlk.length?fBlk.map(b=>{let capVal=b.capacity;let max=capVal===null?null:parseInt(capVal);let current=gTrn.filter(t=>{if(String(t.status||'').includes('취소'))return false;let cInfo=String(t.content||'').split('||').map(s=>s.trim());if(cInfo.length>=5)return cInfo[0]===b.block_date&&cInfo[2]===`${b.start_time}~${b.end_time}`&&cInfo[3]===b.center&&cInfo[4]===`[${b.category}] ${b.reason}`;return false;}).length;let capDisplay=max===null?'-':(max===0?`<span style="color:var(--primary);font-weight:800;font-size:12px;border:1px solid var(--primary);padding:4px 8px;border-radius:12px;background:#fff;">오픈 예정</span>`:(current>=max?`<strong style="color:var(--error);">마감 (${max}명)</strong>`:`<strong>${current}</strong> / ${max}`));let dow=getDow(b.block_date);let batchRaw=b.target_batch||'';let batchLabel=batchRaw?(/^\d+$/.test(batchRaw.trim())?batchRaw.trim()+'기':batchRaw):'';let batchDisplay=batchLabel?`<span class="status-badge badge-blue">${window.escapeHtml(batchLabel)}</span>`:`<span style="color:var(--text-tertiary);font-size:12px;">전체 기수</span>`;let mPreview=`<td class="m-preview" onclick="this.closest('tr').classList.toggle('expanded')"><div class="m-prev-top"><span class="m-prev-date" style="font-weight:700;color:var(--primary);font-size:13px;">${b.category}</span>${batchLabel?`<span class="status-badge badge-blue" style="margin-left:6px;">${window.escapeHtml(batchLabel)}</span>`:''}</div><div class="m-prev-title" style="font-size:18px;color:var(--text-display);letter-spacing:-0.5px;">${b.block_date}(${dow}) ${b.start_time}~${b.end_time}</div><div class="m-prev-desc" style="font-size:13px;font-weight:500;">[${b.center}] ${b.space_equip||'전체'}</div><span class="m-toggle-hint">상세 정보 보기 ▼</span></td>`;let reasonCell=`<td data-label="사유"><span style="cursor:pointer;color:var(--text-secondary);font-weight:500;transition:color 0.15s;" onmouseover="this.style.color='var(--text-display)';this.style.fontWeight='700'" onmouseout="this.style.color='var(--text-secondary)';this.style.fontWeight='500'" onclick="event.stopPropagation();window.openBlkAttendees('${b.id}')" title="신청자 명단 보기">${window.escapeHtml(b.reason)}</span></td>`;return `<tr>${mPreview}<td data-label="날짜"><strong>${b.block_date}</strong></td><td data-label="시간">${b.start_time} ~ ${b.end_time}</td><td data-label="구분"><span style="color:var(--primary);font-weight:600;">${b.category}</span></td><td data-label="공간">${b.center} <span class="sub-text">${b.space_equip||'전체'}</span></td>${reasonCell}<td data-label="대상 기수" class="tc">${batchDisplay}</td><td data-label="정원" class="tc">${capDisplay}</td><td data-label="관리" class="tc"><div class="action-wrap-flex"><button class="btn-outline btn-sm" onclick="window.editBlock('${b.id}')">수정</button> <button class="btn-outline btn-sm" onclick="window.deleteBlock('${b.id}')" style="color:var(--error);border-color:var(--error)">삭제</button></div></td></tr>`;}).join(""):`<tr><td colspan="9" class="empty-state">진행 예정인 스케줄이 없습니다.</td></tr>`;}catch(e){console.error(e);}

  // ★ E-2: 모든 innerHTML 갱신 끝난 뒤 체크박스 상태 복원
  try { if(_savedCheckboxes && typeof window.restoreCheckboxState === 'function') window.restoreCheckboxState(_savedCheckboxes); } catch(e) { console.warn('checkbox restore failed', e); }
};

window.changeResPage=function(page){currentResPage=page;window.renderResTablePage();};
window.toggleResAccordion=function(){let wrap=document.getElementById('resTableWrap');let pg=document.getElementById('resPaginationWrap');let btn=document.getElementById('resAccordionBtn');if(wrap.style.display==='none'){wrap.style.display='block';if(pg)pg.style.display='flex';btn.innerHTML='접기 ▲';}else{wrap.style.display='none';if(pg)pg.style.display='none';btn.innerHTML='펼치기 ▼';}};

function ensureTrnContentModal(){if(document.getElementById('trnContentModal'))return;let modal=document.createElement('div');modal.id='trnContentModal';modal.innerHTML=`<div class="tcm-box"><div class="tcm-header"><div class="tcm-title" id="tcmTitle"></div><div class="tcm-sub" id="tcmSub"></div></div><div class="tcm-body" id="tcmBody"></div><div class="tcm-footer"><span id="tcmCount" style="font-size:13px;font-weight:700;color:var(--text-secondary);"></span><div style="display:flex;gap:8px;"><button class="btn-outline" onclick="window.downloadTrnContentAttendees()" style="font-size:13px;padding:8px 16px;border-color:var(--primary);color:var(--primary);font-weight:700;">신청자 명단 다운로드</button><button class="btn-outline" onclick="window.closeTrnContentModal()" style="font-size:13px;padding:8px 16px;">닫기</button></div></div></div>`;modal.addEventListener('click',function(e){if(e.target===modal)window.closeTrnContentModal();});document.body.appendChild(modal);}
function calcNth(phone,contentName){return gTrn.filter(x=>{if(x.phone!==phone)return false;if(String(x.status||'').includes('취소'))return false;let xInfo=String(x.content||'').split('||').map(s=>s.trim());let xName=xInfo.length>=5?xInfo[4]:String(x.content||'').trim();return xName===contentName;}).length;}

function renderAttendeeModal(title,sub,attendees,contentKey,downloadMeta){ensureTrnContentModal();let titleEl=document.getElementById('tcmTitle');let subEl=document.getElementById('tcmSub');let countEl=document.getElementById('tcmCount');let bodyEl=document.getElementById('tcmBody');if(titleEl)titleEl.textContent=title;if(subEl)subEl.textContent=sub;if(countEl)countEl.textContent=`총 ${attendees.length}명 (취소 제외)`;if(bodyEl){if(attendees.length===0){bodyEl.innerHTML=`<div style="text-align:center;padding:40px 0;color:var(--text-tertiary);font-size:14px;font-weight:600;">신청자가 없습니다.</div>`;}else{bodyEl.innerHTML=`<table class="tcm-table" style="width:100%;table-layout:fixed;"><thead><tr><th style="width:36px;">#</th><th style="width:56px;">기수</th><th style="width:76px;">성함</th><th style="width:150px;">연락처</th><th style="width:80px;text-align:center;">참여회차</th><th style="width:130px;">신청일</th></tr></thead><tbody>${attendees.map((t,idx)=>`<tr><td style="color:var(--text-tertiary);font-size:12px;">${idx+1}</td><td><strong>${t.batch||'-'}</strong></td><td><strong style="color:var(--text-display);">${window.escapeHtml(t.name)}</strong></td><td style="color:var(--text-secondary);">${window.escapeHtml(t.phone)}</td><td style="text-align:center;">${t._nth>=2?`<span class="nth-badge">${t._nth}회차</span>`:'-'}</td><td style="color:var(--text-tertiary);font-size:12px;">${formatDt(t.created_at)}</td></tr>`).join('')}</tbody></table>`;}}window._trnContentModalData={attendees,contentKey,...downloadMeta};document.getElementById('trnContentModal').classList.add('show');}

window.openBlkAttendees=function(blockId){let b=gBlk.find(x=>String(x.id)===String(blockId));if(!b)return;let contentKey=`[${b.category}] ${b.reason}`;let timeRange=`${b.start_time}~${b.end_time}`;let attendees=gTrn.filter(t=>{if(String(t.status||'').includes('취소'))return false;let cInfo=String(t.content||'').split('||').map(s=>s.trim());if(cInfo.length<5)return false;return cInfo[0]===b.block_date&&cInfo[2]===timeRange&&cInfo[3]===b.center&&cInfo[4]===contentKey;});attendees=attendees.map(t=>({...t,_nth:calcNth(t.phone,contentKey)}));attendees.sort((a,b)=>new Date(a.created_at)-new Date(b.created_at));renderAttendeeModal(b.reason,`${b.block_date} | ${timeRange} | ${b.center}`,attendees,contentKey,{title:`${b.block_date}_${b.reason}`});};
window.closeTrnContentModal=function(){let modal=document.getElementById('trnContentModal');if(modal)modal.classList.remove('show');};
window.downloadTrnContentAttendees=function(){let d=window._trnContentModalData;if(!d||!d.attendees||d.attendees.length===0){showToast('다운로드할 데이터가 없습니다.');return;}let titleStr=d.title||d.contentKey||'명단';let csv='\uFEFF순번,기수,성함,연락처,참여회차,신청일\n';d.attendees.forEach((t,idx)=>{csv+=`"${idx+1}","${t.batch||'-'}","${String(t.name||'').replace(/"/g,'""')}","${String(t.phone||'').replace(/"/g,'""')}","${t._nth>=2?t._nth+'회차':'-'}","${formatDt(t.created_at)}"\n`;});const blob=new Blob([csv],{type:'text/csv;charset=utf-8;'});const link=document.createElement('a');link.href=URL.createObjectURL(blob);link.download=`위커피_신청자명단_${String(titleStr).replace(/[\/\s:]/g,'_').slice(0,40)}_${new Date().toISOString().slice(0,10)}.csv`;link.click();showToast('명단이 다운로드되었습니다.');};

// ★★★ PATCH (UI 개선 2): 타임라인 날짜 네비게이션 — 세그먼트형 통합 컨트롤 ★★★
// 변경점:
//  - 상단의 별도 칩(날짜 표시)을 제거하고, 네비게이션 라벨이 직접 날짜를 보여줌
//  - ◀ / 라벨 / ▶ 가 단일 컨테이너로 묶여 토스·카카오 스타일의 세그먼트 컨트롤이 됨
//  - 라벨 클릭 시 숨겨진 date picker가 열림 (showPicker 우선)
//  - 오늘이면 작은 주황 점, 다른 날짜면 인라인 "· 오늘로" 링크
//  - 한국식 자연어 날짜 ("5월 26일 (화)"), 연도 다르면 "2025년 12월 31일 (수)"
window.renderTimeline=function(){
    const timelineArea=document.getElementById('timeline-area');
    if(!timelineArea)return;
    let centersToRender=currentGlobalCenter==='전체'?['마포 센터','광진 센터']:[currentGlobalCenter];
    const today=new Date();
    const realTodayStr=`${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
    const displayDate = currentTimelineDate || realTodayStr;
    const isToday = (displayDate === realTodayStr);
    const dowKr = getDow(displayDate);
    const TOTAL_MINUTES=24*60;

    if(!document.getElementById('timelineFullscreenOverlay')){
        const overlay=document.createElement('div');
        overlay.id='timelineFullscreenOverlay';
        overlay.innerHTML=`<div id="timelineFullscreenInner"><div id="timelineFullscreenHeader"><div class="fs-left"><span class="fs-title">실시간 센터 현황</span><span class="fs-date" id="timelineFullscreenDate"></span></div><div class="fs-legend"><div class="fs-legend-item"><div class="fs-legend-dot" style="background:var(--primary,#ff7900);"></div>예약</div><div class="fs-legend-item"><div class="fs-legend-dot" style="background:rgba(255,121,0,0.6);"></div>수강</div><div class="fs-legend-item"><div class="fs-legend-dot" style="background:#9ca3af;"></div>블락</div></div><button class="fs-close-btn" onclick="window.closeTimelineFullscreen()" aria-label="닫기">✕</button></div><div id="timelineFullscreenBody"></div></div>`;
        document.body.appendChild(overlay);
    }

    // 한국식 자연어 날짜 라벨 (연도 같으면 생략)
    const _parts = displayDate.split('-').map(Number);
    const _dObj = new Date(_parts[0], _parts[1]-1, _parts[2]);
    const _todayObj = new Date();
    const _yearPrefix = (_dObj.getFullYear() !== _todayObj.getFullYear()) ? `${_dObj.getFullYear()}년 ` : '';
    const niceDateLabel = `${_yearPrefix}${_dObj.getMonth()+1}월 ${_dObj.getDate()}일 (${dowKr})`;

    // 오늘 표시: 점 vs "· 오늘로" 인라인 링크
    const todayIndicatorHtml = isToday
        ? `<span class="tdn-today-dot" title="오늘" aria-label="오늘"></span>`
        : `<span class="tdn-today-link" onclick="event.stopPropagation();window.goToTodayTimeline();" role="button" tabindex="0">· 오늘로</span>`;

    let finalHtml=`<div class="timeline-section">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;flex-wrap:wrap;gap:12px;">
            <div style="font-size:18px;font-weight:800;color:var(--text-display);line-height:1;">실시간 센터 현황</div>
            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                <div class="timeline-date-nav" role="group" aria-label="날짜 탐색">
                    <button class="tdn-arrow" onclick="window.changeTimelineDate(-1)" aria-label="이전 날" title="이전 날">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
                    </button>
                    <div class="tdn-label" onclick="const p=document.getElementById('timelineDatePicker'); if(p){ if(p.showPicker){try{p.showPicker();}catch(e){p.click();}} else {p.click();} }" role="button" tabindex="0" aria-label="날짜 선택">
                        <span>${niceDateLabel}</span>
                        ${todayIndicatorHtml}
                        <input type="date" id="timelineDatePicker" class="tdn-hidden-picker" value="${displayDate}" onchange="window.setTimelineDate(this.value)" aria-hidden="true" tabindex="-1">
                    </div>
                    <button class="tdn-arrow" onclick="window.changeTimelineDate(1)" aria-label="다음 날" title="다음 날">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                    </button>
                </div>
                <button class="timeline-fullscreen-btn" onclick="window.openTimelineFullscreen()" title="전체화면으로 보기" aria-label="전체화면">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>
                </button>
            </div>
        </div>`;

    function generateBar(timeRange,label,typeClass,tooltip){
        if(!timeRange||!timeRange.includes('~'))return '';
        const[startStr,endStr]=timeRange.split('~');
        const[sh,sm]=startStr.trim().split(':').map(Number);
        const[eh,em]=endStr.trim().split(':').map(Number);
        if(isNaN(sh)||isNaN(eh))return '';
        const startMins=sh*60+(sm||0);
        const endMins=eh*60+(em||0);
        const duration=endMins-startMins;
        if(duration<=0)return '';
        const left=(startMins/TOTAL_MINUTES)*100;
        const width=(duration/TOTAL_MINUTES)*100;
        return `<div class="timeline-bar ${typeClass}" style="left:${left}%;width:${width}%;" data-tippy="${window.escapeHtml(tooltip)}" onmouseenter="window.showGlobalTooltip(event,this)" onmouseleave="window.hideGlobalTooltip()">${window.escapeHtml(label)}</div>`;
    }
    function isMatch(dbSpace,uiEquip,zoneName){
        let dbStr=String(dbSpace||'').trim();
        if(uiEquip==='merged'||uiEquip==='공간 전체'){let safeDb=dbStr.replace(/\s+/g,'');return safeDb===zoneName.replace(/\s+/g,'')||safeDb.includes('전체');}
        let uiClean=uiEquip.split('(')[0].trim();
        let safeUi=uiClean.replace(/\s+/g,'');
        let safeDb=dbStr.replace(/\s+/g,'');
        if(safeDb.includes(safeUi))return true;
        if(uiClean.split(' ').every(word=>safeDb.includes(word)))return true;
        return false;
    }
    function renderBarsFor(equipName,zoneName,centerName){
        let barsHtml='';
        gRes.forEach(r=>{
            if(r.res_date===displayDate&&r.center===centerName&&!String(r.status).includes('취소')&&isMatch(r.space_equip,equipName,zoneName))
                barsHtml+=generateBar(r.res_time,`[${r.batch||'-'}] ${r.name}`,'bar-res',`${r.res_time} | [${r.batch||'-'}] ${r.name} | ${r.space_equip}`);
        });
        function matchSpace(spaceStr,eqName,znName){if(!spaceStr)return(eqName==='merged'||eqName==='공간 전체');return String(spaceStr).split(',').map(s=>s.trim()).some(sp=>isMatch(sp,eqName,znName));}
        gTrn.forEach(t=>{
            let cInfo=String(t.content||'').split('||').map(s=>s.trim());
            if(cInfo.length>=5&&cInfo[0]===displayDate&&cInfo[3]===centerName&&!String(t.status).includes('취소')){
                let matchBlk=gBlk.find(b=>b.block_date===cInfo[0]&&b.center===cInfo[3]&&`[${b.category}] ${b.reason}`===cInfo[4]);
                let blkSpace=matchBlk?matchBlk.space_equip:null;
                if(matchSpace(blkSpace,equipName,zoneName))
                    barsHtml+=generateBar(cInfo[2],`[수강] ${t.name}`,'bar-trn',`${cInfo[2]} | ${cInfo[4]} | ${t.name}`);
            }
        });
        gBlk.forEach(b=>{
            if(b.block_date===displayDate&&b.center===centerName&&matchSpace(b.space_equip,equipName,zoneName))
                barsHtml+=generateBar(`${b.start_time}~${b.end_time}`,`[${b.category}] ${b.reason}`,'bar-blk',`${b.start_time}~${b.end_time} | ${b.reason}`);
        });
        return barsHtml;
    }

    let mapoSpaces=[
        {zone:'에스프레소존',equips:['공간 전체','아스토리아 스톰 1번(좌)','아스토리아 스톰 2번(우)']},
        {zone:'로스팅존',equips:['공간 전체','이지스터 800 1번(좌)','이지스터 800 2번(우)','이지스터 1.8','스트롱홀드 S7X']},
        {zone:'브루잉존',equips:['merged']},
        {zone:'커핑존',equips:['merged']},
        {zone:'스터디존',equips:['merged']}
    ];
    let gwangjinSpaces=[
        {zone:'에스프레소존',equips:['공간 전체','시네소 MVP 1번(좌)','시네소 MVP 2번(우)','페마 페미나','산레모 You','이글원 프리마 프로','이글원 프리마 EXP']},
        {zone:'로스팅존',equips:['공간 전체','이지스터 800 1번(좌)','이지스터 800 2번(우)','이지스터 1.8 1번(좌)','이지스터 1.8 2번','스트롱홀드 S7X']},
        {zone:'브루잉존',equips:['merged']},
        {zone:'커핑존',equips:['merged']},
        {zone:'스터디룸',equips:['merged']}
    ];

    centersToRender.forEach((centerName,idx)=>{
        let spaceGroups=centerName==='마포 센터'?mapoSpaces:gwangjinSpaces;
        finalHtml+=`<div style="${idx>0?'margin-top:32px;':''}"><div style="font-size:15px;font-weight:800;color:var(--text-display);margin-bottom:12px;text-align:left;">${centerName}</div><div class="timeline-container"><div class="timeline-grid"><div class="timeline-header"><div class="resource-label-header">공간 / 장비</div><div class="time-slots-header">${Array.from({length:24},(_,i)=>`<div class="time-slot-num">${String(i).padStart(2,'0')}:00</div>`).join('')}</div></div>`;
        spaceGroups.forEach(group=>{
            if(group.equips.length===1&&group.equips[0]==='merged'){
                finalHtml+=`<div class="timeline-row"><div class="merged-col">${group.zone}</div><div class="time-grid-bg">${renderBarsFor('merged',group.zone,centerName)}</div></div>`;
            }else{
                finalHtml+=`<div class="zone-group-row"><div class="zone-col">${group.zone}</div><div class="equip-col-wrapper">`;
                group.equips.forEach(eq=>{
                    finalHtml+=`<div class="timeline-row"><div class="equip-name">${eq}</div><div class="time-grid-bg">${renderBarsFor(eq,group.zone,centerName)}</div></div>`;
                });
                finalHtml+=`</div></div>`;
            }
        });
        finalHtml+=`</div></div></div>`;
    });
    timelineArea.innerHTML=finalHtml+`</div>`;
};

window.changeTimelineDate=function(direction){
    let base;
    if(currentTimelineDate){
        let parts=currentTimelineDate.split('-').map(Number);
        base=new Date(parts[0],parts[1]-1,parts[2]);
    }else{
        base=new Date();
        base.setHours(0,0,0,0);
    }
    base.setDate(base.getDate()+direction);
    let y=base.getFullYear();
    let m=String(base.getMonth()+1).padStart(2,'0');
    let d=String(base.getDate()).padStart(2,'0');
    currentTimelineDate=`${y}-${m}-${d}`;
    window.renderTimeline();
};
window.setTimelineDate=function(dateStr){
    if(!dateStr){currentTimelineDate=null;}
    else{currentTimelineDate=dateStr;}
    window.renderTimeline();
};
window.goToTodayTimeline=function(){
    currentTimelineDate=null;
    window.renderTimeline();
};

window.openTimelineFullscreen=function(){
    const overlay=document.getElementById('timelineFullscreenOverlay');
    const body=document.getElementById('timelineFullscreenBody');
    const dateEl=document.getElementById('timelineFullscreenDate');
    const timelineArea=document.getElementById('timeline-area');
    if(!overlay||!body||!timelineArea)return;
    const today=new Date();
    const realTodayStr=`${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
    const displayDate=currentTimelineDate||realTodayStr;
    const dowKr=getDow(displayDate);
    const isToday=(displayDate===realTodayStr);
    if(dateEl)dateEl.textContent=` — ${displayDate} (${dowKr})${isToday?' · 오늘':''}`;
    const source=timelineArea.querySelector('.timeline-section');
    if(source)body.innerHTML=source.outerHTML;
    overlay.classList.add('active');
    document.body.style.overflow='hidden';
};
window.closeTimelineFullscreen=function(){const overlay=document.getElementById('timelineFullscreenOverlay');if(overlay)overlay.classList.remove('active');document.body.style.overflow='';};
document.addEventListener('keydown',function(e){if(e.key==='Escape')window.closeTimelineFullscreen();});

// ▼▼▼ 파트2 끝 — 다음은 renderResTablePage 부터 시작 (파트3) ▼▼▼
// ▼▼▼ 파트2 시작 (toggleDashView 부터) ▼▼▼

window.toggleDashView=function(view){currentDashView=view;if(view==='month'){if($("dashMonthNav"))$("dashMonthNav").style.display='flex';}else{if($("dashMonthNav"))$("dashMonthNav").style.display='none';currentDashMonthOffset=0;}window.renderDashboard();};
window.changeDashMonth=function(offset){currentDashMonthOffset+=offset;window.renderDashboard();};
window.resetDashMonth=function(){currentDashMonthOffset=0;window.renderDashboard();};

// ★★★ PATCH (E): renderCenterData 시작/끝에 체크박스 보존·복원 ★★★
window.renderCenterData=function(){
  // ★ E-1: 렌더 직전 체크박스 상태 저장
  const _savedCheckboxes = (typeof window.preserveCheckboxState === 'function') ? window.preserveCheckboxState() : null;

  const now=new Date();const oneMonthAgo=new Date();oneMonthAgo.setDate(now.getDate()-30);let todayForBlk=new Date();todayForBlk.setHours(0,0,0,0);
  try{window.updateDailyInOutBanner();if(window.updateCancelAccumulationBanner)window.updateCancelAccumulationBanner();}catch(e){}
  try{const addTooltipToText=(textMatch,id,tooltipText,isLong=false)=>{let titles=document.querySelectorAll('.page-title,.section-title,h2,h3,.table-toolbar > div,.sub-page-title');titles.forEach(el=>{if(el.textContent.includes(textMatch)&&!document.getElementById(id)&&!el.closest('#dynamic-ord-container')){let sub=el.querySelector('.sub-text');if(sub)sub.remove();el.style.display='flex';el.style.alignItems='center';el.style.gap='6px';el.insertAdjacentHTML('beforeend',`<i id="${id}" class="info-tooltip ${isLong?'long-text':''}" data-tippy="${tooltipText}" onmouseenter="window.showGlobalTooltip(event,this)" onmouseleave="window.hideGlobalTooltip()">i</i>`);}});};
  let resTitle=document.querySelector('#sub-res .table-toolbar .section-title');if(resTitle&&resTitle.textContent.includes('상세 예약 로그'))resTitle.innerHTML='센터 예약 리스트';if(resTitle&&!document.getElementById('resAccordionBtn')){resTitle.innerHTML+=`<button id="resAccordionBtn" class="btn-outline btn-sm" style="margin-left:12px;font-size:12px;padding:2px 8px;height:26px;" onclick="window.toggleResAccordion()">접기 ▲</button>`;}
  addTooltipToText('센터 예약 리스트','tt-res','최근 1개월(30일) 내의 예약만 표시됩니다. 이전 내역은 서버에 안전하게 보관됩니다.',true);addTooltipToText('수업 및 훈련','tt-trn','종료된 일정은 자정(다음 날)을 기점으로 리스트에서 자동 정리되며, 과거 내역은 서버에 보관됩니다.',true);addTooltipToText('생두 주문 관리','tt-ord-main',"주문 및 입금 관련 상태는 리스트에 계속 유지됩니다. 단, '취소/품절' 건은 2일 뒤, '센터 도착' 건은 7일 뒤 자동 정리되어 서버에 보관됩니다.",true);}catch(e){}
  try{let resTable=$("resTableBody")?.closest('table');if(resTable){let theadTr=resTable.querySelector('thead tr');if(theadTr){let firstTh=theadTr.querySelector('th');if(firstTh&&!firstTh.querySelector('input[type="checkbox"]')&&firstTh.innerText.includes('접수')){let chkTh=document.createElement('th');chkTh.style.width='48px';chkTh.style.textAlign='center';chkTh.innerHTML='<input type="checkbox" onchange="window.toggleAll(this,\'chk-res\')">';theadTr.insertBefore(chkTh,firstTh);}}}let trnTable=$("trnTableBody")?.closest('table');if(trnTable){let theadTr=trnTable.querySelector('thead tr');if(theadTr){let firstTh=theadTr.querySelector('th');if(firstTh&&!firstTh.querySelector('input[type="checkbox"]')&&(firstTh.innerText.includes('신청')||firstTh.innerText.includes('일시'))){let chkTh=document.createElement('th');chkTh.style.width='48px';chkTh.style.textAlign='center';chkTh.innerHTML='<input type="checkbox" onchange="window.toggleAll(this,\'chk-trn\')">';theadTr.insertBefore(chkTh,firstTh);}}}}catch(e){}
  try{let qRes=($("searchRes")?.value||"").toLowerCase();let sRes=$("resSpaceFilter")?.value||"전체";let fRes=gRes.filter(r=>{let rDate=window.safeKST(r.res_date||r.created_at);let matchSpace=sRes==='전체'||String(r.space_equip||'').includes(sRes);return(rDate>=oneMonthAgo)&&(currentGlobalCenter==='전체'||r.center===currentGlobalCenter)&&(`${r.name} ${r.phone}`.toLowerCase().includes(qRes))&&matchSpace;});window.currentFilteredRes=fRes;currentResPage=1;window.renderResTablePage();}catch(e){console.error(e);}
  try{let qTrn=($("searchTrn")?.value||"").toLowerCase();let sTrn=$("trnContentFilter")?.value||"전체";let fTrnList=gTrn.filter(t=>{let matchContent=true;let cInfo=String(t.content||'').split('||').map(s=>s.trim());if(sTrn!=='전체'){let targetStr=cInfo.length>=5?`[${cInfo[0]}] [${cInfo[2]}] ${cInfo[4]}`:String(t.content||'').trim();if(targetStr.replace(/\s+/g,'')!==sTrn.replace(/\s+/g,''))matchContent=false;}if(cInfo.length>=5){let tDateObj=new Date(cInfo[0]);tDateObj.setHours(0,0,0,0);if(tDateObj<todayForBlk)return false;}else{let tDate=window.safeKST(t.created_at);if(tDate<oneMonthAgo)return false;}return(currentGlobalCenter==='전체'||String(t.content||"").includes(currentGlobalCenter))&&(`${t.name} ${t.phone} ${t.content}`.toLowerCase().includes(qTrn))&&matchContent;});window.currentFilteredTrn=fTrnList;
  if($("trnTableBody"))$("trnTableBody").innerHTML=fTrnList.length?fTrnList.map(t=>{let displayStatus=t.status||'';let actBtn=String(displayStatus).includes('취소')?'':`<button class="btn-outline btn-sm" onclick="window.cancelAction('trainings','${t.id}')">취소</button>`;let cInfo=String(t.content||'').split('||').map(s=>s.trim());let niceContent=t.content;let preDate=cInfo[0]||'-',preTime=cInfo[2]||'-',preCenter=cInfo[3]||'-',preName=cInfo[4]||'-';let contentName=cInfo.length>=5?cInfo[4]:String(t.content||'').trim();let attendCount=gTrn.filter(x=>{if(x.phone!==t.phone)return false;if(String(x.status||'').includes('취소'))return false;let xInfo=String(x.content||'').split('||').map(s=>s.trim());let xName=xInfo.length>=5?xInfo[4]:String(x.content||'').trim();return xName===contentName;}).length;t._attendCount=attendCount;let nthBadge=attendCount>=2?`<span class="nth-badge">${attendCount}회차</span>`:'';if(cInfo.length>=5){niceContent=`<div style="margin-bottom:4px;font-size:12px;color:var(--text-secondary);">[${cInfo[3]}] ${cInfo[0]} (${cInfo[2]})</div><div style="font-weight:600;color:var(--text-display);line-height:1.4;">${window.escapeHtml(cInfo[4])} <span style="font-weight:400;color:var(--text-tertiary);margin-left:4px;">- ${cInfo[1]||''}</span></div>`;}let badgeClass=displayStatus==='당일 취소'?'badge-red':(String(displayStatus).includes('취소')?'badge-gray':(displayStatus==='접수완료'?'badge-green':'badge-gray'));let statHtml=displayStatus==='당일 취소'?`<span class="status-badge ${badgeClass}" style="cursor:pointer;" data-reason="${window.escapeHtml(t.cancel_reason||'사유 미기재')}" onclick="event.stopPropagation();window.showCancelReason(this.getAttribute('data-reason'))">${displayStatus}</span>`:`<span class="status-badge ${badgeClass}">${displayStatus}</span>`;let dow=getDow(preDate);let mPreview=`<td class="m-preview has-checkbox" onclick="this.closest('tr').classList.toggle('expanded')"><div class="m-prev-top"><span class="m-prev-date" style="font-weight:700;color:var(--primary);font-size:13px;">[${t.batch||'-'}] ${window.escapeHtml(t.name)} ${nthBadge}</span>${statHtml}</div><div class="m-prev-title" style="font-size:18px;color:var(--text-display);letter-spacing:-0.5px;">${preDate}(${dow}) ${preTime}</div><div class="m-prev-desc" style="font-size:13px;font-weight:500;">[${preCenter}] ${window.escapeHtml(preName)}</div><span class="m-toggle-hint">상세 정보 보기 ▼</span></td>`;return `<tr>${mPreview}<td data-label="선택" class="tc"><input type="checkbox" class="chk-trn" value="${t.id}" ${String(displayStatus).includes('취소')?'disabled':''}></td><td data-label="신청일">${formatDt(t.created_at)}</td><td data-label="기수">${t.batch||'-'}</td><td data-label="성함" style="white-space:nowrap;"><strong style="vertical-align:middle;">${window.escapeHtml(t.name)}</strong>${nthBadge}</td><td data-label="연락처">${window.escapeHtml(t.phone)}</td><td data-label="정보">${niceContent}</td><td data-label="상태" class="tc">${statHtml}</td><td data-label="관리">${actBtn}</td></tr>`;}).join(""):`<tr><td colspan="9" class="empty-state">내역 없음</td></tr>`;}catch(e){console.error(e);}
  try{let qOrd=($("searchOrd")?.value||"").toLowerCase();let vOrd=$("ordVendorFilter")?.value||"전체";let isOrdFilter=$("filterPendingOrd")?.checked;let fOrd=gOrd.filter(o=>{let matchCenter=(currentGlobalCenter==='전체'||o.center===currentGlobalCenter);let matchQ=`${o.name} ${o.phone} ${o.vendor} ${o.item_name} ${o.center||''}`.toLowerCase().includes(qOrd);let matchV=vOrd==='전체'?true:o.vendor===vOrd;let matchS=isOrdFilter?(o.status==='주문 접수'):true;return matchCenter&&matchQ&&matchV&&matchS;});if(!isOrdFilter){fOrd=fOrd.filter(o=>!window.isOrderExpired(o,now));}let groupedOrders={};fOrd.forEach(o=>{let dateKey=window.formatDeliveryDateFull(o.delivery_date);if(!groupedOrders[dateKey])groupedOrders[dateKey]=[];groupedOrders[dateKey].push(o);});let sortedKeys=Object.keys(groupedOrders).sort((a,b)=>window.parseDeliveryDate(groupedOrders[a][0].delivery_date)-window.parseDeliveryDate(groupedOrders[b][0].delivery_date));let dynamicHtml='';if(sortedKeys.length===0){dynamicHtml=`<div class="table-wrap" style="margin-bottom:32px;"><div class="empty-state">발주 내역이 없습니다.</div></div>`;}else{sortedKeys.forEach((key,idx)=>{let list=groupedOrders[key];let uniqClass='chk-ord-dyn-'+idx;dynamicHtml+=`<div class="section-title" style="margin-bottom:12px;display:flex;align-items:center;flex-wrap:wrap;"><span style="background:#212529;color:#fff;padding:6px 12px;border-radius:8px;font-size:14px;font-weight:700;display:inline-block;letter-spacing:-0.5px;">${key} 발주</span></div>`;dynamicHtml+=`<div class="table-wrap" style="margin-bottom:32px;"><table><thead><tr><th style="width:36px;text-align:center;"><input type="checkbox" onchange="window.toggleAll(this,'${uniqClass}')"></th><th style="width:130px;">주문 시간</th><th style="width:56px;text-align:center;">수령 센터</th><th style="width:96px;">주문자</th><th>생두사 / 상품명</th><th style="width:40px;text-align:center;">수량</th><th style="width:80px;text-align:right;">총 금액</th><th style="width:110px;text-align:center;border-left:1px solid var(--border-strong);">결제</th><th style="width:96px;text-align:center;border-left:1px solid var(--border-strong);">배송</th></tr></thead><tbody>${generateOrderRows(list,uniqClass,key)}</tbody></table></div>`;});}let ordTab=document.getElementById('sub-ord');if(ordTab){let container=document.getElementById('dynamic-ord-container');if(!container){container=document.createElement('div');container.id='dynamic-ord-container';let fw=ordTab.querySelector('.filter-wrap');if(fw)fw.parentNode.insertBefore(container,fw.nextSibling);else ordTab.appendChild(container);}container.innerHTML=dynamicHtml;Array.from(ordTab.children).forEach(child=>{if(child.id!=='dynamic-ord-container'&&!child.classList.contains('filter-wrap')&&!child.classList.contains('table-toolbar')&&!child.querySelector('.filter-wrap'))child.style.display='none';});}}catch(e){console.error(e);}
  try{let fBlk=gBlk.filter(b=>{let bDate=new Date(b.block_date);bDate.setHours(0,0,0,0);let matchCenter=(currentGlobalCenter==='전체'||b.center===currentGlobalCenter);return matchCenter&&(bDate>=todayForBlk);});
  let blkTable=$("blkTableBody")?.closest('table');if(blkTable){let theadTr=blkTable.querySelector('thead tr');if(theadTr&&!theadTr.querySelector('th[data-col="target-batch"]')){let capTh=Array.from(theadTr.querySelectorAll('th')).find(th=>th.textContent.includes('정원'));if(capTh){let batchTh=document.createElement('th');batchTh.setAttribute('data-col','target-batch');batchTh.textContent='대상 기수';batchTh.className='tc';capTh.parentNode.insertBefore(batchTh,capTh);}}}
  if($("blkTableBody"))$("blkTableBody").innerHTML=fBlk.length?fBlk.map(b=>{let capVal=b.capacity;let max=capVal===null?null:parseInt(capVal);let current=gTrn.filter(t=>{if(String(t.status||'').includes('취소'))return false;let cInfo=String(t.content||'').split('||').map(s=>s.trim());if(cInfo.length>=5)return cInfo[0]===b.block_date&&cInfo[2]===`${b.start_time}~${b.end_time}`&&cInfo[3]===b.center&&cInfo[4]===`[${b.category}] ${b.reason}`;return false;}).length;let capDisplay=max===null?'-':(max===0?`<span style="color:var(--primary);font-weight:800;font-size:12px;border:1px solid var(--primary);padding:4px 8px;border-radius:12px;background:#fff;">오픈 예정</span>`:(current>=max?`<strong style="color:var(--error);">마감 (${max}명)</strong>`:`<strong>${current}</strong> / ${max}`));let dow=getDow(b.block_date);let batchRaw=b.target_batch||'';let batchLabel=batchRaw?(/^\d+$/.test(batchRaw.trim())?batchRaw.trim()+'기':batchRaw):'';let batchDisplay=batchLabel?`<span class="status-badge badge-blue">${window.escapeHtml(batchLabel)}</span>`:`<span style="color:var(--text-tertiary);font-size:12px;">전체 기수</span>`;let mPreview=`<td class="m-preview" onclick="this.closest('tr').classList.toggle('expanded')"><div class="m-prev-top"><span class="m-prev-date" style="font-weight:700;color:var(--primary);font-size:13px;">${b.category}</span>${batchLabel?`<span class="status-badge badge-blue" style="margin-left:6px;">${window.escapeHtml(batchLabel)}</span>`:''}</div><div class="m-prev-title" style="font-size:18px;color:var(--text-display);letter-spacing:-0.5px;">${b.block_date}(${dow}) ${b.start_time}~${b.end_time}</div><div class="m-prev-desc" style="font-size:13px;font-weight:500;">[${b.center}] ${b.space_equip||'전체'}</div><span class="m-toggle-hint">상세 정보 보기 ▼</span></td>`;let reasonCell=`<td data-label="사유"><span style="cursor:pointer;color:var(--text-secondary);font-weight:500;transition:color 0.15s;" onmouseover="this.style.color='var(--text-display)';this.style.fontWeight='700'" onmouseout="this.style.color='var(--text-secondary)';this.style.fontWeight='500'" onclick="event.stopPropagation();window.openBlkAttendees('${b.id}')" title="신청자 명단 보기">${window.escapeHtml(b.reason)}</span></td>`;return `<tr>${mPreview}<td data-label="날짜"><strong>${b.block_date}</strong></td><td data-label="시간">${b.start_time} ~ ${b.end_time}</td><td data-label="구분"><span style="color:var(--primary);font-weight:600;">${b.category}</span></td><td data-label="공간">${b.center} <span class="sub-text">${b.space_equip||'전체'}</span></td>${reasonCell}<td data-label="대상 기수" class="tc">${batchDisplay}</td><td data-label="정원" class="tc">${capDisplay}</td><td data-label="관리" class="tc"><div class="action-wrap-flex"><button class="btn-outline btn-sm" onclick="window.editBlock('${b.id}')">수정</button> <button class="btn-outline btn-sm" onclick="window.deleteBlock('${b.id}')" style="color:var(--error);border-color:var(--error)">삭제</button></div></td></tr>`;}).join(""):`<tr><td colspan="9" class="empty-state">진행 예정인 스케줄이 없습니다.</td></tr>`;}catch(e){console.error(e);}

  // ★ E-2: 모든 innerHTML 갱신 끝난 뒤 체크박스 상태 복원
  try { if(_savedCheckboxes && typeof window.restoreCheckboxState === 'function') window.restoreCheckboxState(_savedCheckboxes); } catch(e) { console.warn('checkbox restore failed', e); }
};

window.changeResPage=function(page){currentResPage=page;window.renderResTablePage();};
window.toggleResAccordion=function(){let wrap=document.getElementById('resTableWrap');let pg=document.getElementById('resPaginationWrap');let btn=document.getElementById('resAccordionBtn');if(wrap.style.display==='none'){wrap.style.display='block';if(pg)pg.style.display='flex';btn.innerHTML='접기 ▲';}else{wrap.style.display='none';if(pg)pg.style.display='none';btn.innerHTML='펼치기 ▼';}};

function ensureTrnContentModal(){if(document.getElementById('trnContentModal'))return;let modal=document.createElement('div');modal.id='trnContentModal';modal.innerHTML=`<div class="tcm-box"><div class="tcm-header"><div class="tcm-title" id="tcmTitle"></div><div class="tcm-sub" id="tcmSub"></div></div><div class="tcm-body" id="tcmBody"></div><div class="tcm-footer"><span id="tcmCount" style="font-size:13px;font-weight:700;color:var(--text-secondary);"></span><div style="display:flex;gap:8px;"><button class="btn-outline" onclick="window.downloadTrnContentAttendees()" style="font-size:13px;padding:8px 16px;border-color:var(--primary);color:var(--primary);font-weight:700;">신청자 명단 다운로드</button><button class="btn-outline" onclick="window.closeTrnContentModal()" style="font-size:13px;padding:8px 16px;">닫기</button></div></div></div>`;modal.addEventListener('click',function(e){if(e.target===modal)window.closeTrnContentModal();});document.body.appendChild(modal);}
function calcNth(phone,contentName){return gTrn.filter(x=>{if(x.phone!==phone)return false;if(String(x.status||'').includes('취소'))return false;let xInfo=String(x.content||'').split('||').map(s=>s.trim());let xName=xInfo.length>=5?xInfo[4]:String(x.content||'').trim();return xName===contentName;}).length;}

function renderAttendeeModal(title,sub,attendees,contentKey,downloadMeta){ensureTrnContentModal();let titleEl=document.getElementById('tcmTitle');let subEl=document.getElementById('tcmSub');let countEl=document.getElementById('tcmCount');let bodyEl=document.getElementById('tcmBody');if(titleEl)titleEl.textContent=title;if(subEl)subEl.textContent=sub;if(countEl)countEl.textContent=`총 ${attendees.length}명 (취소 제외)`;if(bodyEl){if(attendees.length===0){bodyEl.innerHTML=`<div style="text-align:center;padding:40px 0;color:var(--text-tertiary);font-size:14px;font-weight:600;">신청자가 없습니다.</div>`;}else{bodyEl.innerHTML=`<table class="tcm-table" style="width:100%;table-layout:fixed;"><thead><tr><th style="width:36px;">#</th><th style="width:56px;">기수</th><th style="width:76px;">성함</th><th style="width:150px;">연락처</th><th style="width:80px;text-align:center;">참여회차</th><th style="width:130px;">신청일</th></tr></thead><tbody>${attendees.map((t,idx)=>`<tr><td style="color:var(--text-tertiary);font-size:12px;">${idx+1}</td><td><strong>${t.batch||'-'}</strong></td><td><strong style="color:var(--text-display);">${window.escapeHtml(t.name)}</strong></td><td style="color:var(--text-secondary);">${window.escapeHtml(t.phone)}</td><td style="text-align:center;">${t._nth>=2?`<span class="nth-badge">${t._nth}회차</span>`:'-'}</td><td style="color:var(--text-tertiary);font-size:12px;">${formatDt(t.created_at)}</td></tr>`).join('')}</tbody></table>`;}}window._trnContentModalData={attendees,contentKey,...downloadMeta};document.getElementById('trnContentModal').classList.add('show');}

window.openBlkAttendees=function(blockId){let b=gBlk.find(x=>String(x.id)===String(blockId));if(!b)return;let contentKey=`[${b.category}] ${b.reason}`;let timeRange=`${b.start_time}~${b.end_time}`;let attendees=gTrn.filter(t=>{if(String(t.status||'').includes('취소'))return false;let cInfo=String(t.content||'').split('||').map(s=>s.trim());if(cInfo.length<5)return false;return cInfo[0]===b.block_date&&cInfo[2]===timeRange&&cInfo[3]===b.center&&cInfo[4]===contentKey;});attendees=attendees.map(t=>({...t,_nth:calcNth(t.phone,contentKey)}));attendees.sort((a,b)=>new Date(a.created_at)-new Date(b.created_at));renderAttendeeModal(b.reason,`${b.block_date} | ${timeRange} | ${b.center}`,attendees,contentKey,{title:`${b.block_date}_${b.reason}`});};
window.closeTrnContentModal=function(){let modal=document.getElementById('trnContentModal');if(modal)modal.classList.remove('show');};
window.downloadTrnContentAttendees=function(){let d=window._trnContentModalData;if(!d||!d.attendees||d.attendees.length===0){showToast('다운로드할 데이터가 없습니다.');return;}let titleStr=d.title||d.contentKey||'명단';let csv='\uFEFF순번,기수,성함,연락처,참여회차,신청일\n';d.attendees.forEach((t,idx)=>{csv+=`"${idx+1}","${t.batch||'-'}","${String(t.name||'').replace(/"/g,'""')}","${String(t.phone||'').replace(/"/g,'""')}","${t._nth>=2?t._nth+'회차':'-'}","${formatDt(t.created_at)}"\n`;});const blob=new Blob([csv],{type:'text/csv;charset=utf-8;'});const link=document.createElement('a');link.href=URL.createObjectURL(blob);link.download=`위커피_신청자명단_${String(titleStr).replace(/[\/\s:]/g,'_').slice(0,40)}_${new Date().toISOString().slice(0,10)}.csv`;link.click();showToast('명단이 다운로드되었습니다.');};

// ★★★ PATCH (UI 개선 2): 타임라인 날짜 네비게이션 — 세그먼트형 통합 컨트롤 ★★★
// 변경점:
//  - 상단의 별도 칩(날짜 표시)을 제거하고, 네비게이션 라벨이 직접 날짜를 보여줌
//  - ◀ / 라벨 / ▶ 가 단일 컨테이너로 묶여 토스·카카오 스타일의 세그먼트 컨트롤이 됨
//  - 라벨 클릭 시 숨겨진 date picker가 열림 (showPicker 우선)
//  - 오늘이면 작은 주황 점, 다른 날짜면 인라인 "· 오늘로" 링크
//  - 한국식 자연어 날짜 ("5월 26일 (화)"), 연도 다르면 "2025년 12월 31일 (수)"
window.renderTimeline=function(){
    const timelineArea=document.getElementById('timeline-area');
    if(!timelineArea)return;
    let centersToRender=currentGlobalCenter==='전체'?['마포 센터','광진 센터']:[currentGlobalCenter];
    const today=new Date();
    const realTodayStr=`${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
    const displayDate = currentTimelineDate || realTodayStr;
    const isToday = (displayDate === realTodayStr);
    const dowKr = getDow(displayDate);
    const TOTAL_MINUTES=24*60;

    if(!document.getElementById('timelineFullscreenOverlay')){
        const overlay=document.createElement('div');
        overlay.id='timelineFullscreenOverlay';
        overlay.innerHTML=`<div id="timelineFullscreenInner"><div id="timelineFullscreenHeader"><div class="fs-left"><span class="fs-title">실시간 센터 현황</span><span class="fs-date" id="timelineFullscreenDate"></span></div><div class="fs-legend"><div class="fs-legend-item"><div class="fs-legend-dot" style="background:var(--primary,#ff7900);"></div>예약</div><div class="fs-legend-item"><div class="fs-legend-dot" style="background:rgba(255,121,0,0.6);"></div>수강</div><div class="fs-legend-item"><div class="fs-legend-dot" style="background:#9ca3af;"></div>블락</div></div><button class="fs-close-btn" onclick="window.closeTimelineFullscreen()" aria-label="닫기">✕</button></div><div id="timelineFullscreenBody"></div></div>`;
        document.body.appendChild(overlay);
    }

    // 한국식 자연어 날짜 라벨 (연도 같으면 생략)
    const _parts = displayDate.split('-').map(Number);
    const _dObj = new Date(_parts[0], _parts[1]-1, _parts[2]);
    const _todayObj = new Date();
    const _yearPrefix = (_dObj.getFullYear() !== _todayObj.getFullYear()) ? `${_dObj.getFullYear()}년 ` : '';
    const niceDateLabel = `${_yearPrefix}${_dObj.getMonth()+1}월 ${_dObj.getDate()}일 (${dowKr})`;

    // 오늘 표시: 점 vs "· 오늘로" 인라인 링크
    const todayIndicatorHtml = isToday
        ? `<span class="tdn-today-dot" title="오늘" aria-label="오늘"></span>`
        : `<span class="tdn-today-link" onclick="event.stopPropagation();window.goToTodayTimeline();" role="button" tabindex="0">· 오늘로</span>`;

    let finalHtml=`<div class="timeline-section">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;flex-wrap:wrap;gap:12px;">
            <div style="font-size:18px;font-weight:800;color:var(--text-display);line-height:1;">실시간 센터 현황</div>
            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                <div class="timeline-date-nav" role="group" aria-label="날짜 탐색">
                    <button class="tdn-arrow" onclick="window.changeTimelineDate(-1)" aria-label="이전 날" title="이전 날">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
                    </button>
                    <div class="tdn-label" onclick="const p=document.getElementById('timelineDatePicker'); if(p){ if(p.showPicker){try{p.showPicker();}catch(e){p.click();}} else {p.click();} }" role="button" tabindex="0" aria-label="날짜 선택">
                        <span>${niceDateLabel}</span>
                        ${todayIndicatorHtml}
                        <input type="date" id="timelineDatePicker" class="tdn-hidden-picker" value="${displayDate}" onchange="window.setTimelineDate(this.value)" aria-hidden="true" tabindex="-1">
                    </div>
                    <button class="tdn-arrow" onclick="window.changeTimelineDate(1)" aria-label="다음 날" title="다음 날">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                    </button>
                </div>
                <button class="timeline-fullscreen-btn" onclick="window.openTimelineFullscreen()" title="전체화면으로 보기" aria-label="전체화면">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>
                </button>
            </div>
        </div>`;

    function generateBar(timeRange,label,typeClass,tooltip){
        if(!timeRange||!timeRange.includes('~'))return '';
        const[startStr,endStr]=timeRange.split('~');
        const[sh,sm]=startStr.trim().split(':').map(Number);
        const[eh,em]=endStr.trim().split(':').map(Number);
        if(isNaN(sh)||isNaN(eh))return '';
        const startMins=sh*60+(sm||0);
        const endMins=eh*60+(em||0);
        const duration=endMins-startMins;
        if(duration<=0)return '';
        const left=(startMins/TOTAL_MINUTES)*100;
        const width=(duration/TOTAL_MINUTES)*100;
        return `<div class="timeline-bar ${typeClass}" style="left:${left}%;width:${width}%;" data-tippy="${window.escapeHtml(tooltip)}" onmouseenter="window.showGlobalTooltip(event,this)" onmouseleave="window.hideGlobalTooltip()">${window.escapeHtml(label)}</div>`;
    }
    function isMatch(dbSpace,uiEquip,zoneName){
        let dbStr=String(dbSpace||'').trim();
        if(uiEquip==='merged'||uiEquip==='공간 전체'){let safeDb=dbStr.replace(/\s+/g,'');return safeDb===zoneName.replace(/\s+/g,'')||safeDb.includes('전체');}
        let uiClean=uiEquip.split('(')[0].trim();
        let safeUi=uiClean.replace(/\s+/g,'');
        let safeDb=dbStr.replace(/\s+/g,'');
        if(safeDb.includes(safeUi))return true;
        if(uiClean.split(' ').every(word=>safeDb.includes(word)))return true;
        return false;
    }
    function renderBarsFor(equipName,zoneName,centerName){
        let barsHtml='';
        gRes.forEach(r=>{
            if(r.res_date===displayDate&&r.center===centerName&&!String(r.status).includes('취소')&&isMatch(r.space_equip,equipName,zoneName))
                barsHtml+=generateBar(r.res_time,`[${r.batch||'-'}] ${r.name}`,'bar-res',`${r.res_time} | [${r.batch||'-'}] ${r.name} | ${r.space_equip}`);
        });
        function matchSpace(spaceStr,eqName,znName){if(!spaceStr)return(eqName==='merged'||eqName==='공간 전체');return String(spaceStr).split(',').map(s=>s.trim()).some(sp=>isMatch(sp,eqName,znName));}
        gTrn.forEach(t=>{
            let cInfo=String(t.content||'').split('||').map(s=>s.trim());
            if(cInfo.length>=5&&cInfo[0]===displayDate&&cInfo[3]===centerName&&!String(t.status).includes('취소')){
                let matchBlk=gBlk.find(b=>b.block_date===cInfo[0]&&b.center===cInfo[3]&&`[${b.category}] ${b.reason}`===cInfo[4]);
                let blkSpace=matchBlk?matchBlk.space_equip:null;
                if(matchSpace(blkSpace,equipName,zoneName))
                    barsHtml+=generateBar(cInfo[2],`[수강] ${t.name}`,'bar-trn',`${cInfo[2]} | ${cInfo[4]} | ${t.name}`);
            }
        });
        gBlk.forEach(b=>{
            if(b.block_date===displayDate&&b.center===centerName&&matchSpace(b.space_equip,equipName,zoneName))
                barsHtml+=generateBar(`${b.start_time}~${b.end_time}`,`[${b.category}] ${b.reason}`,'bar-blk',`${b.start_time}~${b.end_time} | ${b.reason}`);
        });
        return barsHtml;
    }

    let mapoSpaces=[
        {zone:'에스프레소존',equips:['공간 전체','아스토리아 스톰 1번(좌)','아스토리아 스톰 2번(우)']},
        {zone:'로스팅존',equips:['공간 전체','이지스터 800 1번(좌)','이지스터 800 2번(우)','이지스터 1.8','스트롱홀드 S7X']},
        {zone:'브루잉존',equips:['merged']},
        {zone:'커핑존',equips:['merged']},
        {zone:'스터디존',equips:['merged']}
    ];
    let gwangjinSpaces=[
        {zone:'에스프레소존',equips:['공간 전체','시네소 MVP 1번(좌)','시네소 MVP 2번(우)','페마 페미나','산레모 You','이글원 프리마 프로','이글원 프리마 EXP']},
        {zone:'로스팅존',equips:['공간 전체','이지스터 800 1번(좌)','이지스터 800 2번(우)','이지스터 1.8 1번(좌)','이지스터 1.8 2번','스트롱홀드 S7X']},
        {zone:'브루잉존',equips:['merged']},
        {zone:'커핑존',equips:['merged']},
        {zone:'스터디룸',equips:['merged']}
    ];

    centersToRender.forEach((centerName,idx)=>{
        let spaceGroups=centerName==='마포 센터'?mapoSpaces:gwangjinSpaces;
        finalHtml+=`<div style="${idx>0?'margin-top:32px;':''}"><div style="font-size:15px;font-weight:800;color:var(--text-display);margin-bottom:12px;text-align:left;">${centerName}</div><div class="timeline-container"><div class="timeline-grid"><div class="timeline-header"><div class="resource-label-header">공간 / 장비</div><div class="time-slots-header">${Array.from({length:24},(_,i)=>`<div class="time-slot-num">${String(i).padStart(2,'0')}:00</div>`).join('')}</div></div>`;
        spaceGroups.forEach(group=>{
            if(group.equips.length===1&&group.equips[0]==='merged'){
                finalHtml+=`<div class="timeline-row"><div class="merged-col">${group.zone}</div><div class="time-grid-bg">${renderBarsFor('merged',group.zone,centerName)}</div></div>`;
            }else{
                finalHtml+=`<div class="zone-group-row"><div class="zone-col">${group.zone}</div><div class="equip-col-wrapper">`;
                group.equips.forEach(eq=>{
                    finalHtml+=`<div class="timeline-row"><div class="equip-name">${eq}</div><div class="time-grid-bg">${renderBarsFor(eq,group.zone,centerName)}</div></div>`;
                });
                finalHtml+=`</div></div>`;
            }
        });
        finalHtml+=`</div></div></div>`;
    });
    timelineArea.innerHTML=finalHtml+`</div>`;
};

window.changeTimelineDate=function(direction){
    let base;
    if(currentTimelineDate){
        let parts=currentTimelineDate.split('-').map(Number);
        base=new Date(parts[0],parts[1]-1,parts[2]);
    }else{
        base=new Date();
        base.setHours(0,0,0,0);
    }
    base.setDate(base.getDate()+direction);
    let y=base.getFullYear();
    let m=String(base.getMonth()+1).padStart(2,'0');
    let d=String(base.getDate()).padStart(2,'0');
    currentTimelineDate=`${y}-${m}-${d}`;
    window.renderTimeline();
};
window.setTimelineDate=function(dateStr){
    if(!dateStr){currentTimelineDate=null;}
    else{currentTimelineDate=dateStr;}
    window.renderTimeline();
};
window.goToTodayTimeline=function(){
    currentTimelineDate=null;
    window.renderTimeline();
};

window.openTimelineFullscreen=function(){
    const overlay=document.getElementById('timelineFullscreenOverlay');
    const body=document.getElementById('timelineFullscreenBody');
    const dateEl=document.getElementById('timelineFullscreenDate');
    const timelineArea=document.getElementById('timeline-area');
    if(!overlay||!body||!timelineArea)return;
    const today=new Date();
    const realTodayStr=`${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
    const displayDate=currentTimelineDate||realTodayStr;
    const dowKr=getDow(displayDate);
    const isToday=(displayDate===realTodayStr);
    if(dateEl)dateEl.textContent=` — ${displayDate} (${dowKr})${isToday?' · 오늘':''}`;
    const source=timelineArea.querySelector('.timeline-section');
    if(source)body.innerHTML=source.outerHTML;
    overlay.classList.add('active');
    document.body.style.overflow='hidden';
};
window.closeTimelineFullscreen=function(){const overlay=document.getElementById('timelineFullscreenOverlay');if(overlay)overlay.classList.remove('active');document.body.style.overflow='';};
document.addEventListener('keydown',function(e){if(e.key==='Escape')window.closeTimelineFullscreen();});

// ▼▼▼ 파트2 끝 — 다음은 renderResTablePage 부터 시작 (파트3) ▼▼▼
