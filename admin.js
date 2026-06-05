const { createClient } = supabase;
const supabaseClient = createClient('https://dqvzowmhxorxhiqoibmk.supabase.co', 'sb_publishable_DSi3rGnuQhy6OtML_3ukEA_7ptfaoK-');
const $ = id => document.getElementById(id), $$ = q => document.querySelector(q), $$$ = q => document.querySelectorAll(q);

let globalApps=[], globalMembers=[], gRes=[], gTrn=[], gOrd=[], gBlk=[], gNotice=[];
let isInsightView = false, currentCalDate = new Date(), currentScheduleAppId = null, currentBlockId = null, pendingOptionData = null;
let currentGlobalCenter = '전체', currentDashView = 'week', currentDashMonthOffset = 0, currentAppDashView = 'week', appDashMonthOffset = 0;
let currentSummaryData = [], currentInsightData = {};
let isCrmReadOnly = false;
let currentAdminEmail = '';
const adminNameMap = {'sungwon.work@gmail.com':'박성원','sungbin0528@gmail.com':'조성빈','ocarinist89@gmail.com':'강현준','klaesiksoul@gmail.com':'최현준'};
window.getAdminName = function(email) { if(!email) return ''; return adminNameMap[email] || email; };
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

window.changeGlobalCenter = function(centerValue) {
    currentGlobalCenter = centerValue;
    if(window.updateDashSpaceFilter) window.updateDashSpaceFilter();
    window.fetchCenterData();
};

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
    td[data-label="접수일"], td[data-label="신청일"], td[data-label="신청일시"], td[data-label="등록일"], td[data-label="주문 시간"], td[data-label="작성일"] { white-space:nowrap !important; }
    @media screen and (max-width:768px) { td::before { min-width:90px !important; } }
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

window.normalizePhone = function(p) {
    if(!p) return '';
    let d = String(p).replace(/\D/g, '');
    if(!d) return '';
    if(d.length === 11 && d.startsWith('010')) return `${d.slice(0,3)}-${d.slice(3,7)}-${d.slice(7,11)}`;
    if(d.length === 10 && (d.startsWith('011') || d.startsWith('016') || d.startsWith('017') || d.startsWith('018') || d.startsWith('019'))) return `${d.slice(0,3)}-${d.slice(3,6)}-${d.slice(6,10)}`;
    if(d.length === 10 && d.startsWith('01')) return `${d.slice(0,3)}-${d.slice(3,6)}-${d.slice(6,10)}`;
    return d;
};
window.samePhone = function(a, b) {
    return String(a||'').replace(/\D/g,'') === String(b||'').replace(/\D/g,'') && String(a||'').replace(/\D/g,'') !== '';
};
window.mapInterestLevel = function(v) {
    if(!v) return '';
    const map = {'꼭 가입하고 싶어요':'꼭 가입하고 싶어요. 오래 지켜봐 왔어요.','상담 후 결정하고 싶어요':'상담 후 예상과 비슷하다면 가입 의향이 있어요.','아직 고민 중이에요':'관심이 생겨서 좀 더 알아보고 싶어요.'};
    return map[v] || v;
};

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
function formatDtWithDow(dateStr) { if(!dateStr) return "-"; try { let d=new Date(dateStr); if(isNaN(d.getTime())) return String(dateStr); let dow=['일','월','화','수','목','금','토'][d.getDay()]; let h=d.getHours(),mi=d.getMinutes(); let ap=h>=12?'오후':'오전'; let h12=h%12||12; let miStr=mi>0?` ${mi}분`:''; return `${d.getFullYear()}년 ${d.getMonth()+1}월 ${d.getDate()}일(${dow}) ${ap} ${h12}시${miStr}`; } catch(e) { return String(dateStr); } }
function formatDtKorean(dateStr) { if(!dateStr) return "-"; try { let d=new Date(dateStr); if(isNaN(d.getTime())) return String(dateStr); let dow=['일','월','화','수','목','금','토'][d.getDay()]; let h=d.getHours(),mi=d.getMinutes(); let ap=h>=12?'오후':'오전'; let h12=h%12||12; let miStr=mi>0?` ${mi}분`:''; return `${d.getFullYear()}년 ${d.getMonth()+1}월 ${d.getDate()}일(${dow}) ${ap} ${h12}시${miStr}`; } catch(e) { return String(dateStr); } }
function formatDt(dateStr) { if(!dateStr) return "-"; try { let d=new Date(dateStr); if(isNaN(d.getTime())) return String(dateStr); let dow=['일','월','화','수','목','금','토'][d.getDay()]; let h=d.getHours(),mi=String(d.getMinutes()).padStart(2,'0'); let ap=h>=12?'오후':'오전'; let h12=h%12||12; let yearPrefix=d.getFullYear()===new Date().getFullYear()?'':d.getFullYear()+'년 '; return `${yearPrefix}${d.getMonth()+1}/${d.getDate()}(${dow}) ${ap} ${h12}:${mi}`; } catch(e) { return String(dateStr); } }
function comma(str) { return Number(String(str).replace(/[^0-9]/g,'')).toLocaleString(); }
function showToast(msg) { const toast=$("toast"); if(!toast) return; toast.innerText=msg; toast.classList.add('show'); setTimeout(()=>toast.classList.remove('show'),3500); }
window.toggleAll=function(checkbox,targetClass){document.querySelectorAll('.'+targetClass).forEach(cb=>{if(!cb.disabled)cb.checked=checkbox.checked;});};

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

window.updateCancelAccumulationBanner=function(){
    let now=new Date();
    let y=now.getFullYear();
    let m=String(now.getMonth()+1).padStart(2,'0');
    let monthPrefix=`${y}-${m}`;
    let cancelMap={};
    let addCancel=(phoneRaw,name,batch,desc,reason,dateStr)=>{
        let phone = window.normalizePhone(phoneRaw);
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
function initializeApp(){window.fetchHolidays(new Date().getFullYear());if(window.updateDashSpaceFilter)window.updateDashSpaceFilter();supabaseClient.auth.getSession().then(({data:{session}})=>{if(session&&!isAppInitialized){currentAdminEmail=session.user?.email||'';handleLoginSuccess();isAppInitialized=true;}});supabaseClient.auth.onAuthStateChange((event,session)=>{if(session){currentAdminEmail=session.user?.email||'';if(!isAppInitialized){handleLoginSuccess();isAppInitialized=true;}}else{var lv=$("login-view");if(lv)lv.classList.add('active');var dv=$("dashboard-view");if(dv)dv.style.display='none';isAppInitialized=false;if(realtimeChannel){supabaseClient.removeChannel(realtimeChannel);realtimeChannel=null;}if(pollingTimer){clearInterval(pollingTimer);pollingTimer=null;}}});}
if(document.readyState==='loading')document.addEventListener("DOMContentLoaded",initializeApp);else initializeApp();
window.switchMainTab=function(pageId,element){$$$(".page").forEach(p=>p.classList.remove('active'));if($(pageId))$(pageId).classList.add('active');$$$(".gnb-item").forEach(item=>item.classList.remove('active'));let targetEl=element||document.querySelector(`.gnb-item[onclick*="${pageId}"]`);if(targetEl)targetEl.classList.add('active');localStorage.setItem('wecoffee_main_tab',pageId);if(pageId==='page-center')window.fetchCenterData();if(pageId==='page-applications'){window.fetchApplications();isInsightView=false;if($("app-table-area"))$("app-table-area").style.display="block";if($("app-insight-area"))$("app-insight-area").style.display="none";if($("insightToggleBtn"))$("insightToggleBtn").innerText="인사이트 보기";}if(pageId==='page-members')window.fetchMembers();};
window.switchSubTab=function(subId,element){$$$(".sub-page").forEach(p=>p.classList.remove('active'));if($(subId))$(subId).classList.add('active');$$$(".sub-item").forEach(item=>item.classList.remove('active'));let targetEl=element||document.querySelector(`.sub-item[onclick*="${subId}"]`);if(targetEl){targetEl.classList.add('active');targetEl.classList.remove("tab-pulse");}if(subId==='sub-notice'){if($('globalFilterWrap'))$('globalFilterWrap').style.display='none';}else{if($('globalFilterWrap'))$('globalFilterWrap').style.display='inline-flex';}localStorage.setItem('wecoffee_sub_tab',subId);if(subId==='sub-res'||subId==='sub-trn-blk'||subId==='sub-ord'){window.fetchCenterData();}};
window.handleLogin=async function(e){e.preventDefault();const email=$("loginEmail").value,password=$("loginPassword").value;const{error}=await supabaseClient.auth.signInWithPassword({email,password});if(error)showToast("접근 권한이 없습니다.");else showToast("접속되었습니다.");};
window.handleLogout=async function(){await supabaseClient.auth.signOut();showToast("로그아웃 되었습니다.");};
window.openCustomConfirm=function(title,statusHtml,actionHtml,callbackOrText,btnText='적용하기'){if($("confirmTarget"))$("confirmTarget").innerHTML=title;if(statusHtml){if($("confirmStateBox"))$("confirmStateBox").style.display='block';if($("confirmSimpleBox"))$("confirmSimpleBox").style.display='none';if($("confirmStatus"))$("confirmStatus").innerHTML=statusHtml;if($("confirmActionState"))$("confirmActionState").innerHTML=actionHtml;}else{if($("confirmStateBox"))$("confirmStateBox").style.display='none';if($("confirmSimpleBox"))$("confirmSimpleBox").style.display='block';if($("confirmActionSimple"))$("confirmActionSimple").innerHTML=actionHtml;}let btn=$("confirmBtn");if(btn){btn.innerText=btnText;let newBtn=btn.cloneNode(true);btn.parentNode.replaceChild(newBtn,btn);newBtn.onclick=function(){if(btnText==='복사하기'){window.copyTxt(callbackOrText,"상담 안내 메시지가 복사되었습니다.");window.closeConfirmModal();}else{(async()=>{newBtn.disabled=true;let originalText=newBtn.innerText;newBtn.innerText="처리 중...";try{await callbackOrText();}catch(e){console.error(e);}finally{newBtn.disabled=false;newBtn.innerText=originalText;window.closeConfirmModal();}})();}};let cancelBtn=newBtn.previousElementSibling;if(cancelBtn&&cancelBtn.tagName==='BUTTON'){cancelBtn.style.display=(btnText==='확인')?'none':'block';}}if($("confirmModal"))$("confirmModal").classList.add('show');};
window.closeConfirmModal=function(){if($("confirmModal"))$("confirmModal").classList.remove('show');};
window.closeOnBackdrop=function(event,modalId){ /* 여백 클릭 닫힘 방지 — 입력 내용 보호 */ return; };
window.showCancelReason=function(reason){window.openCustomConfirm("당일 취소 사유",null,`<div style="padding:16px;background:#f9fafb;border-radius:8px;text-align:left;font-size:14px;line-height:1.5;color:var(--text-display);border:1px solid var(--border-strong);white-space:pre-wrap;">${window.escapeHtml(reason||'사유가 기재되지 않았습니다.')}</div>`,()=>{},"확인");};
window.isOrderExpired=function(order,now){let baseDate=order.delivery_date?window.parseDeliveryDate(order.delivery_date):window.safeKST(order.created_at);let cancelBaseDate=order.updated_at?window.safeKST(order.updated_at):baseDate;let status=order.status||'주문 접수';if(['주문 접수','입금 대기','입금 확인 중','입금 확인','대기'].includes(status))return false;if(status==='주문 취소'||status==='품절')return(now.getTime()-cancelBaseDate.getTime())>48*60*60*1000;if(status==='센터 도착')return(now.getTime()-baseDate.getTime())>7*24*60*60*1000;return false;};

let isFetchingCenter = false;
let lastCenterFetchAt = 0;
const CENTER_STALE_MS = 120000;

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
      if(window.ensureInvoiceButton) window.ensureInvoiceButton();
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
    if(window.ensureInvoiceButton) window.ensureInvoiceButton();
  } catch(e) { console.error(e); }
};

// ▼▼▼ 파트1 끝 — 파트2에서 이어집니다 ▼▼▼
// ▼▼▼ 파트2 시작 (toggleDashView 부터) ▼▼▼

window.toggleDashView=function(view){currentDashView=view;if(view==='month'){if($("dashMonthNav"))$("dashMonthNav").style.display='flex';}else{if($("dashMonthNav"))$("dashMonthNav").style.display='none';currentDashMonthOffset=0;}window.renderDashboard();};
window.changeDashMonth=function(offset){currentDashMonthOffset+=offset;window.renderDashboard();};
window.resetDashMonth=function(){currentDashMonthOffset=0;window.renderDashboard();};

window.renderCenterData=function(){
  const _savedCheckboxes = (typeof window.preserveCheckboxState === 'function') ? window.preserveCheckboxState() : null;

  const now=new Date();const oneMonthAgo=new Date();oneMonthAgo.setDate(now.getDate()-30);let todayForBlk=new Date();todayForBlk.setHours(0,0,0,0);
  try{window.updateDailyInOutBanner();if(window.updateCancelAccumulationBanner)window.updateCancelAccumulationBanner();}catch(e){}
  try{const addTooltipToText=(textMatch,id,tooltipText,isLong=false)=>{let titles=document.querySelectorAll('.page-title,.section-title,h2,h3,.table-toolbar > div,.sub-page-title');titles.forEach(el=>{if(el.textContent.includes(textMatch)&&!document.getElementById(id)&&!el.closest('#dynamic-ord-container')){let sub=el.querySelector('.sub-text');if(sub)sub.remove();el.style.display='flex';el.style.alignItems='center';el.style.gap='6px';el.insertAdjacentHTML('beforeend',`<i id="${id}" class="info-tooltip ${isLong?'long-text':''}" data-tippy="${tooltipText}" onmouseenter="window.showGlobalTooltip(event,this)" onmouseleave="window.hideGlobalTooltip()">i</i>`);}});};
  let resTitle=document.querySelector('#sub-res .table-toolbar .section-title');if(resTitle&&resTitle.textContent.includes('상세 예약 로그'))resTitle.innerHTML='센터 예약 리스트';if(resTitle&&!document.getElementById('resAccordionBtn')){resTitle.innerHTML+=`<button id="resAccordionBtn" class="btn-outline btn-sm" style="margin-left:12px;font-size:12px;padding:2px 8px;height:26px;" onclick="window.toggleResAccordion()">접기 ▲</button>`;}
  addTooltipToText('센터 예약 리스트','tt-res','최근 1개월(30일) 내의 예약만 표시됩니다. 이전 내역은 서버에 안전하게 보관됩니다.',true);addTooltipToText('수업 및 훈련','tt-trn','종료된 일정은 자정(다음 날)을 기점으로 리스트에서 자동 정리되며, 과거 내역은 서버에 보관됩니다.',true);addTooltipToText('생두 주문 관리','tt-ord-main',"주문 및 입금 관련 상태는 리스트에 계속 유지됩니다. 단, '취소/품절' 건은 2일 뒤, '센터 도착' 건은 7일 뒤 자동 정리되어 서버에 보관됩니다.",true);}catch(e){}
  try{let resTable=$("resTableBody")?.closest('table');if(resTable){let theadTr=resTable.querySelector('thead tr');if(theadTr){let firstTh=theadTr.querySelector('th');if(firstTh&&!firstTh.querySelector('input[type="checkbox"]')&&firstTh.innerText.includes('접수')){let chkTh=document.createElement('th');chkTh.style.width='48px';chkTh.style.textAlign='center';chkTh.innerHTML='<input type="checkbox" onchange="window.toggleAll(this,\'chk-res\')">';theadTr.insertBefore(chkTh,firstTh);}}}let trnTable=$("trnTableBody")?.closest('table');if(trnTable){let theadTr=trnTable.querySelector('thead tr');if(theadTr){let firstTh=theadTr.querySelector('th');if(firstTh&&!firstTh.querySelector('input[type="checkbox"]')&&(firstTh.innerText.includes('신청')||firstTh.innerText.includes('일시'))){let chkTh=document.createElement('th');chkTh.style.width='48px';chkTh.style.textAlign='center';chkTh.innerHTML='<input type="checkbox" onchange="window.toggleAll(this,\'chk-trn\')">';theadTr.insertBefore(chkTh,firstTh);}}}}catch(e){}
  try{let qRes=($("searchRes")?.value||"").toLowerCase();let sRes=$("resSpaceFilter")?.value||"전체";let fRes=gRes.filter(r=>{let rDate=window.safeKST(r.res_date||r.created_at);let matchSpace=sRes==='전체'||String(r.space_equip||'').includes(sRes);return(rDate>=oneMonthAgo)&&(currentGlobalCenter==='전체'||r.center===currentGlobalCenter)&&(`${r.name} ${r.phone}`.toLowerCase().includes(qRes))&&matchSpace;});window.currentFilteredRes=fRes;currentResPage=1;window.renderResTablePage();}catch(e){console.error(e);}
  try{let qTrn=($("searchTrn")?.value||"").toLowerCase();let sTrn=$("trnContentFilter")?.value||"전체";let fTrnList=gTrn.filter(t=>{let matchContent=true;let cInfo=String(t.content||'').split('||').map(s=>s.trim());if(sTrn!=='전체'){let targetStr=cInfo.length>=5?`[${cInfo[0]}] [${cInfo[2]}] ${cInfo[4]}`:String(t.content||'').trim();if(targetStr.replace(/\s+/g,'')!==sTrn.replace(/\s+/g,''))matchContent=false;}if(cInfo.length>=5){let tDateObj=new Date(cInfo[0]);tDateObj.setHours(0,0,0,0);if(tDateObj<todayForBlk)return false;}else{let tDate=window.safeKST(t.created_at);if(tDate<oneMonthAgo)return false;}return(currentGlobalCenter==='전체'||String(t.content||"").includes(currentGlobalCenter))&&(`${t.name} ${t.phone} ${t.content}`.toLowerCase().includes(qTrn))&&matchContent;});window.currentFilteredTrn=fTrnList;
  if($("trnTableBody"))$("trnTableBody").innerHTML=fTrnList.length?fTrnList.map(t=>{let displayStatus=t.status||'';let actBtn=String(displayStatus).includes('취소')?'':`<button class="btn-outline btn-sm" onclick="window.cancelAction('trainings','${t.id}')">취소</button>`;let cInfo=String(t.content||'').split('||').map(s=>s.trim());let niceContent=t.content;let preDate=cInfo[0]||'-',preTime=cInfo[2]||'-',preCenter=cInfo[3]||'-',preName=cInfo[4]||'-';let contentName=cInfo.length>=5?cInfo[4]:String(t.content||'').trim();let attendCount=gTrn.filter(x=>{if(x.phone!==t.phone)return false;if(String(x.status||'').includes('취소'))return false;let xInfo=String(x.content||'').split('||').map(s=>s.trim());let xName=xInfo.length>=5?xInfo[4]:String(x.content||'').trim();return xName===contentName;}).length;t._attendCount=attendCount;let nthBadge=attendCount>=2?`<span class="nth-badge">${attendCount}회차</span>`:'';if(cInfo.length>=5){niceContent=`<div style="margin-bottom:4px;font-size:12px;color:var(--text-secondary);">[${cInfo[3]}] ${cInfo[0]} (${cInfo[2]})</div><div style="font-weight:600;color:var(--text-display);line-height:1.4;">${window.escapeHtml(cInfo[4])} <span style="font-weight:400;color:var(--text-tertiary);margin-left:4px;">- ${cInfo[1]||''}</span></div>`;}let badgeClass=displayStatus==='당일 취소'?'badge-red':(String(displayStatus).includes('취소')?'badge-gray':(displayStatus==='접수완료'?'badge-green':'badge-gray'));let statHtml=displayStatus==='당일 취소'?`<span class="status-badge ${badgeClass}" style="cursor:pointer;" data-reason="${window.escapeHtml(t.cancel_reason||'사유 미기재')}" onclick="event.stopPropagation();window.showCancelReason(this.getAttribute('data-reason'))">${displayStatus}</span>`:`<span class="status-badge ${badgeClass}">${displayStatus}</span>`;let dow=getDow(preDate);let mPreview=`<td class="m-preview has-checkbox" onclick="this.closest('tr').classList.toggle('expanded')"><div class="m-prev-top"><span class="m-prev-date" style="font-weight:700;color:var(--primary);font-size:13px;">${t.batch||'-'} ${window.escapeHtml(t.name)} ${nthBadge}</span>${statHtml}</div><div class="m-prev-title" style="font-size:18px;color:var(--text-display);letter-spacing:-0.5px;">${preDate}(${dow}) ${preTime}</div><div class="m-prev-desc" style="font-size:13px;font-weight:500;">[${preCenter}] ${window.escapeHtml(preName)}</div><span class="m-toggle-hint">상세 정보 보기 ▼</span></td>`;return `<tr>${mPreview}<td data-label="선택" class="tc"><input type="checkbox" class="chk-trn" value="${t.id}" ${String(displayStatus).includes('취소')?'disabled':''}></td><td data-label="신청일">${formatDt(t.created_at)}</td><td data-label="기수">${t.batch||'-'}</td><td data-label="성함" style="white-space:nowrap;"><strong style="vertical-align:middle;">${window.escapeHtml(t.name)}</strong>${nthBadge}</td><td data-label="연락처">${window.escapeHtml(t.phone)}</td><td data-label="정보">${niceContent}</td><td data-label="상태" class="tc">${statHtml}</td><td data-label="관리">${actBtn}</td></tr>`;}).join(""):`<tr><td colspan="9" class="empty-state">내역 없음</td></tr>`;}catch(e){console.error(e);}
  try{let qOrd=($("searchOrd")?.value||"").toLowerCase();let vOrd=$("ordVendorFilter")?.value||"전체";let isOrdFilter=$("filterPendingOrd")?.checked;let fOrd=gOrd.filter(o=>{let matchCenter=(currentGlobalCenter==='전체'||o.center===currentGlobalCenter);let matchQ=`${o.name} ${o.phone} ${o.vendor} ${o.item_name} ${o.center||''}`.toLowerCase().includes(qOrd);let matchV=vOrd==='전체'?true:o.vendor===vOrd;let matchS=isOrdFilter?(o.status==='주문 접수'):true;return matchCenter&&matchQ&&matchV&&matchS;});if(!isOrdFilter){fOrd=fOrd.filter(o=>!window.isOrderExpired(o,now));}let groupedOrders={};fOrd.forEach(o=>{let dateKey=window.formatDeliveryDateFull(o.delivery_date);if(!groupedOrders[dateKey])groupedOrders[dateKey]=[];groupedOrders[dateKey].push(o);});let sortedKeys=Object.keys(groupedOrders).sort((a,b)=>window.parseDeliveryDate(groupedOrders[a][0].delivery_date)-window.parseDeliveryDate(groupedOrders[b][0].delivery_date));let dynamicHtml='';if(sortedKeys.length===0){dynamicHtml=`<div class="table-wrap" style="margin-bottom:32px;"><div class="empty-state">발주 내역이 없습니다.</div></div>`;}else{sortedKeys.forEach((key,idx)=>{let list=groupedOrders[key];let uniqClass='chk-ord-dyn-'+idx;dynamicHtml+=`<div class="section-title" style="margin-bottom:12px;display:flex;align-items:center;flex-wrap:wrap;"><span style="background:#212529;color:#fff;padding:6px 12px;border-radius:8px;font-size:14px;font-weight:700;display:inline-block;letter-spacing:-0.5px;">${key} 발주</span></div>`;dynamicHtml+=`<div class="table-wrap" style="margin-bottom:32px;"><table><thead><tr><th style="width:36px;text-align:center;"><input type="checkbox" onchange="window.toggleAll(this,'${uniqClass}')"></th><th style="width:130px;">주문 시간</th><th style="width:56px;text-align:center;">수령 센터</th><th style="width:96px;">주문자</th><th>생두사 / 상품명</th><th style="width:40px;text-align:center;">수량</th><th style="width:80px;text-align:right;">총 금액</th><th style="width:110px;text-align:center;border-left:1px solid var(--border-strong);">결제</th><th style="width:96px;text-align:center;border-left:1px solid var(--border-strong);">배송</th></tr></thead><tbody>${generateOrderRows(list,uniqClass,key)}</tbody></table></div>`;});}let ordTab=document.getElementById('sub-ord');if(ordTab){let container=document.getElementById('dynamic-ord-container');if(!container){container=document.createElement('div');container.id='dynamic-ord-container';let fw=ordTab.querySelector('.filter-wrap');if(fw)fw.parentNode.insertBefore(container,fw.nextSibling);else ordTab.appendChild(container);}container.innerHTML=dynamicHtml;Array.from(ordTab.children).forEach(child=>{if(child.id!=='dynamic-ord-container'&&!child.classList.contains('filter-wrap')&&!child.classList.contains('table-toolbar')&&!child.querySelector('.filter-wrap'))child.style.display='none';});}}catch(e){console.error(e);}
  try{let fBlk=gBlk.filter(b=>{let bDate=new Date(b.block_date);bDate.setHours(0,0,0,0);let matchCenter=(currentGlobalCenter==='전체'||b.center===currentGlobalCenter);return matchCenter&&(bDate>=todayForBlk);});
  let blkTable=$("blkTableBody")?.closest('table');if(blkTable){let theadTr=blkTable.querySelector('thead tr');if(theadTr&&!theadTr.querySelector('th[data-col="target-batch"]')){let capTh=Array.from(theadTr.querySelectorAll('th')).find(th=>th.textContent.includes('정원'));if(capTh){let batchTh=document.createElement('th');batchTh.setAttribute('data-col','target-batch');batchTh.textContent='대상 기수';batchTh.className='tc';capTh.parentNode.insertBefore(batchTh,capTh);}}}
  if($("blkTableBody"))$("blkTableBody").innerHTML=fBlk.length?fBlk.map(b=>{let capVal=b.capacity;let max=capVal===null?null:parseInt(capVal);let current=gTrn.filter(t=>{if(String(t.status||'').includes('취소'))return false;let cInfo=String(t.content||'').split('||').map(s=>s.trim());if(cInfo.length>=5)return cInfo[0]===b.block_date&&cInfo[2]===`${b.start_time}~${b.end_time}`&&cInfo[3]===b.center&&cInfo[4]===`[${b.category}] ${b.reason}`;return false;}).length;let capDisplay=max===null?'-':(max===0?`<span style="color:var(--primary);font-weight:800;font-size:12px;border:1px solid var(--primary);padding:4px 8px;border-radius:12px;background:#fff;">오픈 예정</span>`:(current>=max?`<strong style="color:var(--error);">마감 (${max}명)</strong>`:`<strong>${current}</strong> / ${max}`));let dow=getDow(b.block_date);let batchRaw=b.target_batch||'';let batchLabel=batchRaw?(/^\d+$/.test(batchRaw.trim())?batchRaw.trim()+'기':batchRaw):'';let batchDisplay=batchLabel?`<span class="status-badge badge-blue">${window.escapeHtml(batchLabel)}</span>`:`<span style="color:var(--text-tertiary);font-size:12px;">전체 기수</span>`;let mPreview=`<td class="m-preview" onclick="this.closest('tr').classList.toggle('expanded')"><div class="m-prev-top"><span class="m-prev-date" style="font-weight:700;color:var(--primary);font-size:13px;">${b.category}</span>${batchLabel?`<span class="status-badge badge-blue" style="margin-left:6px;">${window.escapeHtml(batchLabel)}</span>`:''}</div><div class="m-prev-title" style="font-size:18px;color:var(--text-display);letter-spacing:-0.5px;">${b.block_date}(${dow}) ${b.start_time}~${b.end_time}</div><div class="m-prev-desc" style="font-size:13px;font-weight:500;">[${b.center}] ${b.space_equip||'전체'}</div><span class="m-toggle-hint">상세 정보 보기 ▼</span></td>`;let reasonCell=`<td data-label="사유"><span style="cursor:pointer;color:var(--text-secondary);font-weight:500;transition:color 0.15s;" onmouseover="this.style.color='var(--text-display)';this.style.fontWeight='700'" onmouseout="this.style.color='var(--text-secondary)';this.style.fontWeight='500'" onclick="event.stopPropagation();window.openBlkAttendees('${b.id}')" title="신청자 명단 보기">${window.escapeHtml(b.reason)}</span></td>`;return `<tr>${mPreview}<td data-label="날짜"><strong>${b.block_date}</strong></td><td data-label="시간">${b.start_time} ~ ${b.end_time}</td><td data-label="구분"><span style="color:var(--primary);font-weight:600;">${b.category}</span></td><td data-label="공간">${b.center} <span class="sub-text">${b.space_equip||'전체'}</span></td>${reasonCell}<td data-label="대상 기수" class="tc">${batchDisplay}</td><td data-label="정원" class="tc">${capDisplay}</td><td data-label="관리" class="tc"><div class="action-wrap-flex"><button class="btn-outline btn-sm" onclick="window.editBlock('${b.id}')">수정</button> <button class="btn-outline btn-sm" onclick="window.deleteBlock('${b.id}')" style="color:var(--error);border-color:var(--error)">삭제</button></div></td></tr>`;}).join(""):`<tr><td colspan="9" class="empty-state">진행 예정인 스케줄이 없습니다.</td></tr>`;}catch(e){console.error(e);}

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

    const _parts = displayDate.split('-').map(Number);
    const _dObj = new Date(_parts[0], _parts[1]-1, _parts[2]);
    const _todayObj = new Date();
    const _yearPrefix = (_dObj.getFullYear() !== _todayObj.getFullYear()) ? `${_dObj.getFullYear()}년 ` : '';
    const niceDateLabel = `${_yearPrefix}${_dObj.getMonth()+1}월 ${_dObj.getDate()}일 (${dowKr})`;

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
                barsHtml+=generateBar(r.res_time,`${r.batch||'-'} ${r.name}`,'bar-res',`${r.res_time} | ${r.batch||'-'} ${r.name} | ${r.space_equip}`);
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

// ▼▼▼ 파트2 끝 — 파트3에서 이어집니다 ▼▼▼

// ▼▼▼ 파트3 시작 (renderResTablePage 부터) ▼▼▼

window.renderResTablePage = function() {
    let data = window.currentFilteredRes || [];
    let tbody = $("resTableBody");
    if(!tbody) return;
    let startIndex = (currentResPage - 1) * resItemsPerPage;
    let pageData = data.slice(startIndex, startIndex + resItemsPerPage);
    const now = new Date();
    if(pageData.length === 0) { tbody.innerHTML = `<tr><td colspan="11" class="empty-state">내역 없음</td></tr>`; window.updateResPaginationUI(0); return; }
    tbody.innerHTML = pageData.map(r => {
        let displayStatus = r.status || ''; let isExpired = false;
        if(r.res_time && r.res_date && !String(displayStatus).includes('취소')) {
            let endTimeStr = String(r.res_time).split('~')[1];
            if(endTimeStr) { let [hh, mm] = endTimeStr.trim().split(':'); let resEndObj = new Date(`${r.res_date}T${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}:00`); if(resEndObj < now) { displayStatus = '이용완료'; isExpired = true; } }
        }
        let actBtn = (String(displayStatus).includes('취소') || displayStatus === '이용완료' || isExpired)
            ? `<button class="btn-outline btn-sm" disabled style="opacity:0.5;cursor:not-allowed;">취소</button>`
            : `<button class="btn-outline btn-sm" onclick="window.cancelAction('reservations','${r.id}')">취소</button>`;
        let badgeClass = displayStatus === '당일 취소' ? 'badge-red' : (String(displayStatus).includes('취소') ? 'badge-gray' : (displayStatus === '이용완료' ? 'badge-gray' : (displayStatus === '예약완료' ? 'badge-green' : 'badge-gray')));
        let statHtml = displayStatus === '당일 취소'
            ? `<span class="status-badge ${badgeClass}" style="cursor:pointer;" data-reason="${window.escapeHtml(r.cancel_reason||'사유 미기재')}" onclick="event.stopPropagation();window.showCancelReason(this.getAttribute('data-reason'))">${displayStatus}</span>`
            : `<span class="status-badge ${badgeClass}">${displayStatus}</span>`;
        let dow = getDow(r.res_date);
        let mPreview = `<td class="m-preview has-checkbox" onclick="this.closest('tr').classList.toggle('expanded')"><div class="m-prev-top"><span class="m-prev-date" style="font-weight:700;color:var(--primary);font-size:13px;">${r.batch||'-'} ${window.escapeHtml(r.name)}</span>${statHtml}</div><div class="m-prev-title" style="font-size:18px;color:var(--text-display);letter-spacing:-0.5px;">${r.res_date}(${dow}) ${r.res_time}</div><div class="m-prev-desc" style="font-size:13px;font-weight:500;">[${r.center}] ${r.space_equip||'-'}</div><span class="m-toggle-hint">상세 정보 보기 ▼</span></td>`;
        return `<tr>${mPreview}<td data-label="선택" class="tc"><input type="checkbox" class="chk-res" value="${r.id}" ${String(displayStatus).includes('취소')?'disabled':''}></td><td data-label="접수일">${formatDt(r.created_at)}</td><td data-label="기수">${r.batch||'-'}</td><td data-label="성함"><strong>${window.escapeHtml(r.name)}</strong></td><td data-label="연락처">${window.escapeHtml(r.phone)}</td><td data-label="예약일">${r.res_date}</td><td data-label="시간">${r.res_time}</td><td data-label="공간">${r.center} <span class="sub-text">${r.space_equip}</span></td><td data-label="상태" class="tc">${statHtml}</td><td data-label="관리">${actBtn}</td></tr>`;
    }).join("");
    window.updateResPaginationUI(data.length);
};

window.updateResPaginationUI = function(totalItems) {
    let paginationWrap = document.getElementById('resPaginationWrap');
    let tableWrap = document.querySelector('#resTableBody')?.closest('.table-wrap');
    if(!paginationWrap && tableWrap) {
        tableWrap.id = 'resTableWrap';
        paginationWrap = document.createElement('div'); paginationWrap.id = 'resPaginationWrap';
        paginationWrap.style.cssText = 'display:flex;justify-content:center;align-items:center;gap:8px;padding:20px 0;';
        tableWrap.parentNode.insertBefore(paginationWrap, tableWrap.nextSibling);
    }
    if(!paginationWrap) return;
    if(totalItems === 0 || resItemsPerPage >= totalItems) { paginationWrap.innerHTML = ''; return; }
    let totalPages = Math.ceil(totalItems / resItemsPerPage); let html = '';
    let startPage = Math.max(1, currentResPage - 2); let endPage = Math.min(totalPages, startPage + 4); if(endPage - startPage < 4) startPage = Math.max(1, endPage - 4);
    if(currentResPage > 1) html += `<button class="pagination-btn" onclick="window.changeResPage(${currentResPage-1})">이전</button>`;
    for(let i = startPage; i <= endPage; i++) { html += `<button class="pagination-btn ${i===currentResPage?'active':''}" onclick="window.changeResPage(${i})">${i}</button>`; }
    if(currentResPage < totalPages) html += `<button class="pagination-btn" onclick="window.changeResPage(${currentResPage+1})">다음</button>`;
    paginationWrap.innerHTML = html;
};

function generateOrderRows(fOrd, chkClass, dateKey) {
  return fOrd.map(o => {
    let badgeClass = (o.status==='주문 취소'||o.status==='품절')?'st-ghosted':o.status==='센터 도착'?'st-completed':o.status==='입금 확인'?'st-confirmed':(o.status==='입금 대기'||o.status==='입금 확인 중')?'st-arranging':'st-wait';
    let cNm = o.item_name||""; let m = String(cNm).match(/(.+) \[(?:희망:\s*)?(\d+)[\/\.](\d+)\s*\((월|화|수|목|금|토|일)\).*?\]/); if(m) cNm=m[1].trim(); else { let oM=String(cNm).match(/(.+) \[(.*?)\]/); if(oM) cNm=oM[1].trim(); }
    let centerShort = (o.center||'미지정').replace(' 센터','');
    let vendorUrl = o.link?o.link:(o.url?o.url:'#'); let vendorHtml = `<a href="${vendorUrl}" target="_blank" style="color:var(--text-secondary);font-weight:700;font-size:13px;text-decoration:none;cursor:pointer;" onmouseover="this.style.textDecoration='underline'" onmouseout="this.style.textDecoration='none'">${window.escapeHtml(o.vendor)}</a>`;
    let copyableHtml = `<div class="copyable-wrap" onclick="window.copyTxt('${String(cNm).replace(/'/g,"\\'")}','상품명이 복사되었습니다.')" data-full-text="${window.escapeHtml(cNm)}"><div style="display:flex;align-items:center;width:100%;min-width:0;"><span class="copyable-text">${window.escapeHtml(cNm)}</span><span class="copyable-hint">복사</span></div></div>`;
    let isArrived = o.status==='센터 도착';
    let isCancelled = o.status==='주문 취소'||o.status==='품절';
    let payStatus = isArrived ? '입금 확인' : (o.status||'주문 접수');
    let payClass = isCancelled?'st-ghosted':payStatus==='입금 확인'?'st-confirmed':(payStatus==='입금 대기'||payStatus==='입금 확인 중')?'st-arranging':'st-wait';
    let payDisabled = isArrived ? 'disabled' : '';
    let delEnabled = (o.status==='입금 확인'||isArrived);
    let delClass = isArrived?'st-completed':'';
    let paySelect = `<select class="status-select ${payClass}" onchange="window.handlePaymentStatus('${o.id}',this.value,this)" style="font-size:12px;padding:6px 30px 6px 10px;width:100%;text-align-last:center;" ${payDisabled}><option value="주문 접수" ${payStatus==='주문 접수'?'selected':''}>주문 접수</option><option value="입금 대기" ${payStatus==='입금 대기'?'selected':''}>입금 대기</option><option value="입금 확인 중" ${payStatus==='입금 확인 중'?'selected':''}>입금 확인 중</option><option value="입금 확인" ${payStatus==='입금 확인'?'selected':''}>입금 확인</option><option value="주문 취소" ${payStatus==='주문 취소'?'selected':''}>주문 취소</option><option value="품절" ${payStatus==='품절'?'selected':''}>품절</option></select>`;
    let delSelect = `<select class="status-select ${delClass}" onchange="window.handleDeliveryStatus('${o.id}',this.value,this)" style="font-size:12px;padding:6px 30px 6px 10px;width:100%;text-align-last:center;" ${delEnabled?'':'disabled'}><option value="" ${!isArrived?'selected':''}>—</option><option value="센터 도착" ${isArrived?'selected':''}>센터 도착</option></select>`;
    let cTxtPreview = o.center?`<span style="background:var(--border);color:var(--text-secondary);padding:2px 6px;border-radius:4px;font-size:11px;font-weight:600;margin-right:6px;vertical-align:middle;white-space:nowrap;">${o.center}</span>`:'';
    let mPreview = `<td class="m-preview has-checkbox" onclick="this.closest('tr').classList.toggle('expanded')"><div class="m-prev-top"><span class="m-prev-date">${formatDtWithDow(o.created_at)}</span><span class="status-badge ${badgeClass}">${o.status}</span></div><div class="m-prev-title">${o.batch||'-'} <span style="font-weight:800;">${window.escapeHtml(o.name)}</span> <span style="font-size:13px;font-weight:500;color:var(--text-secondary);margin-left:4px;">(${o.quantity})</span></div><div class="m-prev-desc" style="color:var(--text-display);font-weight:500;line-height:1.5;">${cTxtPreview}<span style="font-size:12px;color:var(--text-secondary);margin-right:4px;">${window.escapeHtml(o.vendor)}</span>${window.escapeHtml(cNm)}</div><span class="m-toggle-hint">상세 정보 보기 ▼</span></td>`;
    let safeDateKey = window.escapeHtml(dateKey||'').replace(/'/g,"\\'");
    return `<tr style="border-bottom:1px solid var(--border-strong);" data-ord-id="${o.id}" data-ord-phone="${window.escapeHtml(o.phone)}">${mPreview}<td data-label="선택" class="tc"><input type="checkbox" class="chk-ord ${chkClass}" value="${o.id}"></td><td data-label="주문 시간" style="font-size:12px;color:var(--text-secondary);white-space:nowrap;">${formatDt(o.created_at)}</td><td data-label="수령 센터" class="tc"><span style="background:var(--border);color:var(--text-display);padding:4px 8px;border-radius:6px;font-size:12px;font-weight:700;white-space:nowrap;">${centerShort}</span></td><td data-label="주문자"><span style="font-size:13px;color:var(--text-secondary);font-weight:600;">${o.batch||'-'}</span> <strong style="font-size:15px;font-weight:800;color:var(--text-display);cursor:pointer;transition:font-weight 0.12s;" onmouseover="this.style.fontWeight='900'" onmouseout="this.style.fontWeight='800'" onclick="window.toggleOrderDetail('${o.id}','${safeDateKey}')">${window.escapeHtml(o.name)}</strong></td><td data-label="생두사 / 상품명" style="max-width:300px;"><div style="display:flex;align-items:center;width:100%;min-width:0;gap:8px;"><div style="flex-shrink:0;">${vendorHtml}</div><span style="color:var(--border-strong);font-size:12px;flex-shrink:0;">|</span><div style="flex:1;min-width:0;">${copyableHtml}</div></span></td><td data-label="수량" class="tc" style="font-size:14px;font-weight:700;">${o.quantity}</td><td data-label="총 금액" style="text-align:right;"><input type="text" value="${o.total_price||''}" placeholder="0원" style="width:80px;padding:8px 8px;text-align:right;font-size:13px;font-weight:600;background:#fff;border:1px solid var(--border-strong);border-radius:8px;color:var(--text-display);outline:none;transition:0.2s;" onfocus="this.style.borderColor='var(--primary)';" onblur="this.style.borderColor='var(--border-strong)';window.handlePriceInput('${o.id}',this.value,'${o.status}',this)"></td><td data-label="결제" class="tc" style="border-left:1px solid var(--border-strong);">${paySelect}</td><td data-label="배송" class="tc" style="border-left:1px solid var(--border-strong);">${delSelect}</td></tr>`;
  }).join("");
}

// ★ 수정: 금액 변경 시 invoice_logs에 자동 기록
window.handlePriceInput = async function(id, val, currentStatus, inputEl) {
    let formatted = val ? comma(val) + '원' : ''; let updates = { total_price: formatted }; let newStatus = currentStatus;
    if(val && currentStatus === '주문 접수') { updates.status = '입금 대기'; newStatus = '입금 대기'; }
    let order = gOrd.find(o => String(o.id) === String(id));
    let oldPrice = order ? (order.total_price || '') : '';
    if(order) { order.total_price = formatted; order.status = newStatus; }
    inputEl.value = formatted;
    if(newStatus !== currentStatus) { let row = inputEl.closest('tr'); let selectEl = row.querySelector('.status-select'); if(selectEl) { selectEl.value = newStatus; selectEl.className = 'status-select st-arranging'; let badgeEl = row.querySelector('.m-prev-top .status-badge'); if(badgeEl) { badgeEl.className = 'status-badge st-arranging'; badgeEl.innerText = newStatus; } } }
    await supabaseClient.from('orders').update(updates).eq('id', id);
    if(oldPrice !== formatted){try{await supabaseClient.from('invoice_logs').insert([{order_id:String(id),action:'price_changed',field_name:'total_price',old_value:oldPrice,new_value:formatted,performed_by:currentAdminEmail||'unknown',target_member:order?.name||''}]);}catch(e){console.warn('invoice log failed',e);}}
    showToast("저장되었습니다.");
}

window.handleOrderStatusChange = function(id, newValue, selectEl) {
    let order = gOrd.find(o => String(o.id) === String(id)); if(!order) return; let oldStatus = order.status||'주문 접수'; if(oldStatus === newValue) return;
    let confirmMsg = `<div style="font-size:15px;color:var(--text-display);margin-top:8px;">주문 상태를 <strong style="color:var(--primary);font-size:18px;">[${newValue}]</strong>(으)로<br>변경하시겠습니까?</div>`;
    let isRollback = (oldStatus==='입금 확인 중'||oldStatus==='입금 확인'||oldStatus==='센터 도착')&&(newValue==='입금 대기'||newValue==='주문 접수');
    if(isRollback) { confirmMsg = `<div style="background:#fff0f0;border:1px solid #ffcdd2;border-radius:8px;padding:16px;margin-bottom:12px;text-align:left;"><div style="color:var(--error);font-weight:800;font-size:14px;margin-bottom:8px;">롤백 경고</div><div style="font-size:14px;color:var(--text-display);line-height:1.5;word-break:keep-all;">현재 <span style="font-weight:700;">[${oldStatus}]</span> 상태입니다.<br>정말 <strong style="color:var(--error);font-size:16px;">[${newValue}]</strong> (으)로 되돌리시겠습니까?</div></div>`; }
    window.openCustomConfirm("주문 상태 변경", null, confirmMsg, async () => { const { error } = await supabaseClient.from('orders').update({ status: newValue }).eq('id', id); if(error) { showToast("상태 변경에 실패했습니다."); } else { showToast(`[${newValue}] 상태로 변경되었습니다.`); window.fetchCenterData({force:true}); } }, "변경하기");
    selectEl.value = oldStatus;
};

window.handlePaymentStatus=function(id,newValue,selectEl){
    let order=gOrd.find(o=>String(o.id)===String(id));if(!order)return;
    let oldStatus=order.status||'주문 접수';
    let effectiveOld=(oldStatus==='센터 도착')?'입금 확인':oldStatus;
    if(effectiveOld===newValue)return;
    let isRollback=(effectiveOld==='입금 확인 중'||effectiveOld==='입금 확인')&&(newValue==='입금 대기'||newValue==='주문 접수');
    let confirmMsg=isRollback?`<div style="background:#fff0f0;border:1px solid #ffcdd2;border-radius:8px;padding:16px;text-align:left;"><div style="color:var(--error);font-weight:800;font-size:14px;margin-bottom:8px;">롤백 경고</div><div style="font-size:14px;color:var(--text-display);line-height:1.5;">현재 <b>[${effectiveOld}]</b> 상태입니다.<br>정말 <b style="color:var(--error);">[${newValue}]</b>(으)로 되돌리시겠습니까?</div></div>`:`<div style="font-size:15px;color:var(--text-display);">결제 상태를 <b style="color:var(--primary);">[${newValue}]</b>(으)로 변경하시겠습니까?</div>`;
    window.openCustomConfirm("결제 상태 변경",null,confirmMsg,async()=>{const{error}=await supabaseClient.from('orders').update({status:newValue}).eq('id',id);if(error)showToast("변경 실패");else{showToast(`[${newValue}] 상태로 변경되었습니다.`);try{await supabaseClient.from('invoice_logs').insert([{order_id:String(id),action:'status_changed',field_name:'status',old_value:effectiveOld,new_value:newValue,performed_by:currentAdminEmail||'unknown',target_member:order?.name||''}]);}catch(e){}window.fetchCenterData({force:true});}},"변경하기");
    selectEl.value=effectiveOld;
};
window.handleDeliveryStatus=function(id,newValue,selectEl){
    let order=gOrd.find(o=>String(o.id)===String(id));if(!order)return;
    let targetStatus=newValue==='센터 도착'?'센터 도착':'입금 확인';
    if(order.status===targetStatus){selectEl.value=newValue;return;}
    let confirmMsg=newValue==='센터 도착'?`<div style="font-size:15px;color:var(--text-display);">배송 상태를 <b style="color:var(--primary);">[센터 도착]</b>(으)로 변경하시겠습니까?</div>`:`<div style="font-size:15px;color:var(--text-display);">센터 도착을 취소하고 <b>[입금 확인]</b> 상태로 되돌리시겠습니까?</div>`;
    window.openCustomConfirm("배송 상태 변경",null,confirmMsg,async()=>{let oldSt=order.status||'';const{error}=await supabaseClient.from('orders').update({status:targetStatus}).eq('id',id);if(error)showToast("변경 실패");else{showToast(`[${targetStatus}] 상태로 변경되었습니다.`);try{await supabaseClient.from('invoice_logs').insert([{order_id:String(id),action:'status_changed',field_name:'delivery_status',old_value:oldSt,new_value:targetStatus,performed_by:currentAdminEmail||'unknown',target_member:order?.name||''}]);}catch(e){}window.fetchCenterData({force:true});}},"변경하기");
    selectEl.value=order.status==='센터 도착'?'센터 도착':'';
};
window.toggleOrderDetail=function(orderId,dateKey){
    let existingPanel=document.getElementById('ord-detail-'+orderId);
    if(existingPanel){existingPanel.style.display=existingPanel.style.display==='none'?'table-row':'none';return;}
    let order=gOrd.find(o=>String(o.id)===String(orderId));if(!order)return;
    let samePersonOrders=gOrd.filter(o=>window.samePhone(o.phone,order.phone)&&window.formatDeliveryDateFull(o.delivery_date)===dateKey);
    let itemsHtml=samePersonOrders.map((o,i)=>{
        let nm=o.item_name||'';let m=String(nm).match(/(.+) \[(?:希望:\s*)?(\d+)[\/\.](\d+).*?\]/);if(m)nm=m[1].trim();else{let oM=String(nm).match(/(.+) \[(.*?)\]/);if(oM)nm=oM[1].trim();}
        return `<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--border-strong);font-size:13px;"><span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--text-display);font-weight:500;">${window.escapeHtml(o.vendor||'')} | ${window.escapeHtml(nm)}</span><span style="flex-shrink:0;width:44px;text-align:center;color:var(--text-secondary);font-weight:600;">${o.quantity}</span><span style="flex-shrink:0;width:76px;text-align:right;font-weight:700;">${o.total_price||'-'}</span></div>`;
    }).join('');
    let totalAmt=0;samePersonOrders.forEach(o=>{let p=String(o.total_price||'0').replace(/[^0-9]/g,'');totalAmt+=parseInt(p)||0;});
    let totalStr=totalAmt>0?totalAmt.toLocaleString()+'원':'미입력';
    let tr=document.createElement('tr');tr.id='ord-detail-'+orderId;tr.style.cssText='border-bottom:1px solid var(--border-strong);';
    tr.innerHTML=`<td colspan="9" style="padding:0;background:#f9fafb;border-top:1px solid var(--border-strong);"><div style="padding:16px 20px;display:flex;gap:24px;"><div style="min-width:130px;display:flex;flex-direction:column;gap:12px;"><div><div style="font-size:11px;color:var(--text-tertiary);font-weight:600;margin-bottom:3px;">주문 시간</div><div style="font-size:13px;font-weight:700;color:var(--text-display);">${formatDtKorean(order.created_at)}</div></div><div><div style="font-size:11px;color:var(--text-tertiary);font-weight:600;margin-bottom:3px;">수령 센터</div><div style="font-size:13px;font-weight:700;color:var(--text-display);">${order.center||'미지정'}</div></div><div><div style="font-size:11px;color:var(--text-tertiary);font-weight:600;margin-bottom:3px;">멤버 연락처</div><div style="font-size:13px;font-weight:700;color:var(--text-display);">${window.escapeHtml(window.normalizePhone(order.phone)||order.phone||'-')}</div></div></div><div style="flex:1;min-width:0;"><div style="font-size:13px;font-weight:700;color:var(--text-display);margin-bottom:10px;padding-bottom:8px;border-bottom:1px solid var(--border-strong);">${window.escapeHtml(order.name)} 님의 발주 명세서 · ${order.center||''}</div>${itemsHtml}<div style="display:flex;justify-content:space-between;align-items:center;margin-top:12px;padding-top:12px;border-top:2px solid var(--text-tertiary);"><span style="font-size:13px;font-weight:700;color:var(--text-secondary);">총 청구 금액 (${samePersonOrders.length}건)</span><span style="font-size:20px;font-weight:800;color:var(--primary);">${totalStr}</span></div><div style="margin-top:12px;"><button class="btn-outline btn-sm" style="font-size:12px;padding:8px 14px;font-weight:700;" onclick="window.copyOrderInvoice('${orderId}','${dateKey.replace(/'/g,"\\'")}')">명세서 복사하기</button></div></div></div><div style="font-size:11px;color:var(--text-tertiary);text-align:right;padding:4px 20px 10px;cursor:pointer;" onclick="document.getElementById('ord-detail-${orderId}').style.display='none'">접기 ▲</div></td>`;
    let sourceRow=document.querySelector(`tr[data-ord-id="${orderId}"]`);
    if(sourceRow&&sourceRow.parentNode)sourceRow.parentNode.insertBefore(tr,sourceRow.nextSibling);
};
window.copyOrderInvoice=function(orderId,dateKey){
    let order=gOrd.find(o=>String(o.id)===String(orderId));if(!order)return;
    let samePersonOrders=gOrd.filter(o=>window.samePhone(o.phone,order.phone)&&window.formatDeliveryDateFull(o.delivery_date)===dateKey);
    let lines=[`[위커피] ${order.name} 님 ${dateKey} 명세서`,`수령 센터: ${order.center||'미지정'}`,``];
    let totalAmt=0;
    samePersonOrders.forEach((o,i)=>{
        let nm=o.item_name||'';let m=String(nm).match(/(.+) \[(?:희望:\s*)?(\d+)[\/\.](\d+).*?\]/);if(m)nm=m[1].trim();else{let oM=String(nm).match(/(.+) \[(.*?)\]/);if(oM)nm=oM[1].trim();}
        let price=o.total_price||'미입력';lines.push(`${i+1}. ${o.vendor?o.vendor+' | ':''}${nm} (${o.quantity}) — ${price}`);
        let p=String(o.total_price||'0').replace(/[^0-9]/g,'');totalAmt+=parseInt(p)||0;
    });
    lines.push(``);lines.push(`총 청구 금액: ${totalAmt>0?totalAmt.toLocaleString()+'원':'미입력'}`);
    window.copyTxt(lines.join('\n'),'명세서가 복사되었습니다.');
};

window.renderDashboard = async function() {
    const now = new Date(); let targetDate = new Date(now.getFullYear(), now.getMonth() + currentDashMonthOffset, 1); const yyyy = targetDate.getFullYear(); const mm = targetDate.getMonth(); const daysInMonth = new Date(yyyy, mm+1, 0).getDate(); const currDay = now.getDay();
    if(currentDashView === 'month' && $("dashMonthTitle")) $("dashMonthTitle").innerText = `${yyyy}년 ${mm+1}월`;
    await window.fetchHolidays(yyyy);
    let spaceFilter = $("dashSpaceFilter")?$("dashSpaceFilter").value:'전체'; let batchFilter = $("dashBatchFilter")?$("dashBatchFilter").value:'전체'; let calEvts = {};
    if(currentDashView === 'week') { let startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate()-currDay); for(let i=0;i<7;i++) { let dObj = new Date(startOfWeek.getFullYear(),startOfWeek.getMonth(),startOfWeek.getDate()+i); let ds=`${dObj.getFullYear()}-${String(dObj.getMonth()+1).padStart(2,'0')}-${String(dObj.getDate()).padStart(2,'0')}`; calEvts[ds]=[]; } }
    else { for(let d=1;d<=daysInMonth;d++) { let ds=`${yyyy}-${String(mm+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`; calEvts[ds]=[]; } }
    let goEvts=[]; try { goEvts = await window.fetchGoogleCalendarEvents(yyyy, mm+1); } catch(e){}
    try {
        goEvts.forEach(g => { let include=true; if(currentGlobalCenter!=='전체') { let keyword=currentGlobalCenter.split(' ')[0]; if(!String(g.text).includes(keyword)) include=false; } if(spaceFilter!=='전체') { let spaceKeyword=spaceFilter.replace('룸','').replace('존',''); if(!String(g.text).includes(spaceKeyword)) include=false; } if(include && calEvts[g.date]) calEvts[g.date].push({ time:g.time||'종일', start:g.start||'00:00', text:g.text, type:'google', tooltip:g.text }); });
        gRes.forEach(r => { if(String(r.status||'').includes('취소')||(currentGlobalCenter!=='전체'&&r.center!==currentGlobalCenter)||(spaceFilter!=='전체'&&!String(r.space_equip||'').includes(spaceFilter))||(batchFilter!=='전체'&&r.batch!==batchFilter)) return; if(calEvts[r.res_date]) { let st=String(r.res_time||"").split('~')[0].trim(); let spc=String(r.space_equip||"").split(' ')[0]; calEvts[r.res_date].push({ time:r.res_time, start:st, text:`[${spc}] ${r.name}`, type:'res', tooltip:`${r.res_time} | ${r.space_equip} | ${r.name}` }); } });
        gBlk.forEach(b => { if((currentGlobalCenter!=='전체'&&b.center!==currentGlobalCenter)||(spaceFilter!=='전체'&&!String(b.space_equip||'').includes(spaceFilter))) return; if(calEvts[b.block_date]) { let timeStr=`${b.start_time}~${b.end_time}`; calEvts[b.block_date].push({ time:timeStr, start:b.start_time, text:`[${b.category}] ${b.reason}`, type:'blk', tooltip:`${timeStr} | ${b.space_equip||'전체'} | ${b.reason}` }); } });
        gTrn.forEach(t => { if(String(t.status||'').includes('취소')||(batchFilter!=='전체'&&t.batch!==batchFilter)) return; let cInfo=String(t.content||"").split(' || '); if(cInfo.length>=5) { let tDate=cInfo[0].trim(); let tCenter=cInfo[3].trim(); let tSpc=cInfo[4].trim(); if((currentGlobalCenter!=='전체'&&tCenter!==currentGlobalCenter)||(spaceFilter!=='전체'&&!String(tSpc).includes(spaceFilter))) return; if(calEvts[tDate]) { let st=String(cInfo[2]||"").split('~')[0].trim(); calEvts[tDate].push({ time:cInfo[2], start:st, text:`[수강] ${t.name}`, type:'trn', tooltip:`${cInfo[2]} | ${tSpc} | ${t.name} (${cInfo[1]})` }); } } });
    } catch(e) { console.error(e); }
    try {
        let mHtml = `<div class="dash-cal-grid"><div class="dash-cal-header" style="color:var(--error);">일</div><div class="dash-cal-header">월</div><div class="dash-cal-header">화</div><div class="dash-cal-header">수</div><div class="dash-cal-header">목</div><div class="dash-cal-header">금</div><div class="dash-cal-header" style="color:var(--blue);">토</div>`;
        let iterDates = Object.keys(calEvts).sort();
        if(currentDashView==='month') { let firstDay=new Date(yyyy,mm,1).getDay(); for(let i=0;i<firstDay;i++) mHtml+=`<div class="dash-cal-cell empty"></div>`; }
        iterDates.forEach(ds => {
            let dObj=new Date(ds); let evts=calEvts[ds]; evts.sort((a,b)=>String(a.start||'').localeCompare(String(b.start||'')));
            let holidayName=window.getHoliday(dObj.getFullYear(),dObj.getMonth()+1,dObj.getDate()); let dateClass=holidayName?'holiday-date':'';
            let dateText=dObj.getDate()+(holidayName?` <span style="font-size:10px;font-weight:600;display:block;float:right;">${holidayName}</span>`:'');
            let evtsHtml=evts.slice(0,3).map(e=>{ let badgeClass=e.type==='google'?'dash-item-google':(e.type==='res'?'dash-item-res':(e.type==='trn'?'dash-item-trn':'dash-item-blk')); return `<div class="dash-item ${badgeClass}"><div class="dash-item-text"><span class="dash-time">${e.time||''}</span>${window.escapeHtml(e.text)||''}</div><div class="dash-tooltip">${window.escapeHtml(e.tooltip)||''}</div></div>`; }).join('');
            if(evts.length>3) { let hiddenText=evts.slice(3).map(e=>`${e.time||''} | ${window.escapeHtml(e.text)||''}`).join('<br>'); evtsHtml+=`<div class="dash-cal-more-wrap" style="position:relative;"><div class="dash-cal-more">+${evts.length-3}건 더보기</div><div class="dash-tooltip" style="text-align:left;white-space:nowrap;font-weight:normal;">${hiddenText}</div></div>`; }
            mHtml+=`<div class="dash-cal-cell"><div class="dash-cal-date ${dateClass}">${dateText}</div>${evtsHtml}</div>`;
        });
        mHtml+=`</div>`;
        window.centerCalEvts = calEvts;
        let mobStrip=`<div class="mobile-cal"><div class="m-cal-strip" id="m-cal-strip-center">`;
        iterDates.forEach(ds=>{ let dObj=new Date(ds); let dayKr=["일","월","화","수","목","금","토"][dObj.getDay()]; let hasEvt=calEvts[ds].length>0?'has-evt':''; mobStrip+=`<div class="m-cal-date" id="m-date-center-${ds}" onclick="window.renderMCalCenter('${ds}')"><span class="m-cal-day">${dayKr}</span><span class="m-cal-num">${dObj.getDate()}</span><div class="m-cal-dot ${hasEvt}"></div></div>`; });
        mobStrip+=`</div><div id="m-cal-list-center" class="m-cal-list"></div></div>`;
        if($("dash-content")) $("dash-content").innerHTML=`<div class="desktop-cal">${mHtml}</div>`+mobStrip;
        let td=new Date(); let todayStr=`${td.getFullYear()}-${String(td.getMonth()+1).padStart(2,'0')}-${String(td.getDate()).padStart(2,'0')}`;
        window.renderMCalCenter(calEvts[todayStr]?todayStr:iterDates[0]);
    } catch(e) { console.error("Render HTML Error:", e); }
};

window.renderAppMCal=function(selDate){$$$("#appDashContent .m-cal-date").forEach(el=>el.classList.remove('active'));let target=document.getElementById(`m-date-app-${selDate}`);if(target){target.classList.add('active');try{target.scrollIntoView({behavior:'smooth',block:'nearest',inline:'center'});}catch(e){}}let evts=window.appCalEvts[selDate]||[];evts.sort((a,b)=>String(a.time||'').localeCompare(String(b.time||'')));let html='';if(evts.length===0){html=`<div class="empty-state" style="padding:40px 0;">예정된 상담 일정이 없습니다.</div>`;}else{evts.forEach(e=>{let rawTooltip=String(e.tooltip||'');let descParts=rawTooltip.split('|');let descText=descParts.length>1?descParts.slice(1).join(' | ').trim():rawTooltip;html+=`<div class="m-cal-card" style="align-items:flex-start;text-align:left;width:100%;box-sizing:border-box;"><div style="display:flex;align-items:center;justify-content:space-between;width:100%;margin-bottom:4px;"><div class="m-cal-card-title" style="margin:0;">${window.escapeHtml(e.text)||''}</div><div class="m-cal-card-time" style="color:var(--primary);font-weight:800;font-size:13px;">${e.time||'종일'}</div></div><div class="m-cal-card-desc" style="font-size:13px;color:var(--text-secondary);margin-top:0;width:100%;">${window.escapeHtml(descText)}</div></div>`;});}let listWrap=$("m-cal-list-app");if(listWrap)listWrap.innerHTML=html;};
window.renderMCalApp = window.renderAppMCal;

window.parseCallTime=function(t){const s=String(t||'').trim();if(!s||s==='null'||s==='undefined')return null;let iso=s.match(/(\d{4})-(\d{1,2})-(\d{1,2})(?:[T\s]+(\d{1,2}):(\d{2}))?/);if(iso){const h=iso[4]?parseInt(iso[4],10):null;const mi=iso[5]?parseInt(iso[5],10):0;let ts='';if(h!==null){const ap=h>=12?'오후':'오전';const h12=(h%12)||12;ts=`${ap} ${h12}:${String(mi).padStart(2,'0')}`;}return{month:parseInt(iso[2],10),day:parseInt(iso[3],10),hour:h,minute:mi,timeStr:ts};}let kor=s.match(/(\d+)\s*월\s*(\d+)\s*일/);if(kor){const tm=s.match(/(오전|오후)\s+(\d+)[시:]\s*(\d+)?/);let h=null,mi=0,ts='';if(tm){h=parseInt(tm[2],10);if(tm[1]==='오후'&&h!==12)h+=12;if(tm[1]==='오전'&&h===12)h=0;mi=tm[3]?parseInt(tm[3],10):0;ts=`${tm[1]} ${tm[2]}:${tm[3]?String(parseInt(tm[3],10)).padStart(2,'0'):'00'}`;}return{month:parseInt(kor[1],10),day:parseInt(kor[2],10),hour:h,minute:mi,timeStr:ts};}return null;};

window.renderAppDailyBanner=function(filteredApps){let td=new Date();let mm=td.getMonth()+1;let dd=td.getDate();let scheduled=filteredApps.filter(a=>(a.status==='상담 일정 확정'||a.status==='설문 완료')&&a.call_time);let todayEvts=scheduled.filter(app=>{const p=window.parseCallTime(app.call_time);return p&&p.month===mm&&p.day===dd;});let html='';if(todayEvts.length===0){html=`<div class="inout-card"><div style="font-weight:800;margin-bottom:8px;color:var(--text-display);border-bottom:1px solid var(--border-strong);padding-bottom:8px;">오늘의 상담 일정</div><div style="font-size:13px;color:var(--text-secondary);padding:8px 0;">오늘 확정된 상담 일정이 없습니다.</div></div>`;}else{html=`<div class="inout-card"><div style="font-weight:800;font-size:15px;margin-bottom:12px;color:var(--text-display);border-bottom:1px solid var(--border-strong);padding-bottom:8px;">오늘의 상담 일정 (${todayEvts.length}건)</div><div style="display:flex;flex-direction:column;gap:12px;">`;todayEvts.sort((a,b)=>{const pA=window.parseCallTime(a.call_time);const pB=window.parseCallTime(b.call_time);const tA=pA&&pA.hour!==null?pA.hour*60+pA.minute:0;const tB=pB&&pB.hour!==null?pB.hour*60+pB.minute:0;return tA-tB;});todayEvts.forEach(evt=>{const p=window.parseCallTime(evt.call_time);let timeStr=p&&p.timeStr?p.timeStr:evt.call_time;html+=`<div style="display:flex;align-items:center;flex-wrap:wrap;gap:6px;margin-bottom:4px;width:100%;"><div style="color:var(--primary);background:var(--primary-light);padding:4px 8px;border-radius:4px;font-size:12px;font-weight:700;white-space:nowrap;flex-shrink:0;">${timeStr}</div> <div style="font-weight:800;flex-shrink:0;">${evt.desired_batch||'-'} ${window.escapeHtml(evt.name)}</div> <div style="font-weight:500;color:var(--text-secondary);flex-shrink:0;">(${window.escapeHtml(evt.phone)}) | 담당: ${window.escapeHtml(evt.counselor_name||'미정')}</div></div>`;});html+=`</div></div>`;}if($("appDailyBanner"))$("appDailyBanner").innerHTML=html;};

window.renderAppDashboard=async function(){const now=new Date();let targetDate=new Date(now.getFullYear(),now.getMonth()+appDashMonthOffset,1);const yyyy=targetDate.getFullYear();const mm=targetDate.getMonth();const daysInMonth=new Date(yyyy,mm+1,0).getDate();const currDay=now.getDay();if(currentAppDashView==='month'&&$("appDashMonthTitle"))$("appDashMonthTitle").innerText=`${yyyy}년 ${mm+1}월`;await window.fetchHolidays(yyyy);let scheduledApps=globalApps.filter(a=>(a.status==='상담 일정 확정'||a.status==='설문 완료')&&a.call_time);let calEvts={};if(currentAppDashView==='week'){let startOfWeek=new Date(now.getFullYear(),now.getMonth(),now.getDate()-currDay);for(let i=0;i<7;i++){let dObj=new Date(startOfWeek.getFullYear(),startOfWeek.getMonth(),startOfWeek.getDate()+i);let ds=`${dObj.getFullYear()}-${String(dObj.getMonth()+1).padStart(2,'0')}-${String(dObj.getDate()).padStart(2,'0')}`;calEvts[ds]=[];}}else{for(let d=1;d<=daysInMonth;d++){let ds=`${yyyy}-${String(mm+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;calEvts[ds]=[];}}scheduledApps.forEach(app=>{const p=window.parseCallTime(app.call_time);if(p&&p.month){let ds=`${yyyy}-${String(p.month).padStart(2,'0')}-${String(p.day).padStart(2,'0')}`;if(calEvts[ds]){let timeStr=p.timeStr||app.call_time;calEvts[ds].push({time:timeStr,text:`${app.desired_batch||'-'} ${window.escapeHtml(app.name)}`,tooltip:`${timeStr} | 담당: ${window.escapeHtml(app.counselor_name||'미정')}`});}}});let mHtml=`<div class="dash-cal-grid"><div class="dash-cal-header" style="color:var(--error);">일</div><div class="dash-cal-header">월</div><div class="dash-cal-header">화</div><div class="dash-cal-header">수</div><div class="dash-cal-header">목</div><div class="dash-cal-header">금</div><div class="dash-cal-header" style="color:var(--blue);">토</div>`;let iterDates=Object.keys(calEvts).sort();if(currentAppDashView==='month'){let firstDay=new Date(yyyy,mm,1).getDay();for(let i=0;i<firstDay;i++)mHtml+=`<div class="dash-cal-cell empty"></div>`;}iterDates.forEach(ds=>{let dObj=new Date(ds);let evts=calEvts[ds];let holidayName=window.getHoliday(dObj.getFullYear(),dObj.getMonth()+1,dObj.getDate());let dateClass=holidayName?'holiday-date':'';let dateText=dObj.getDate()+(holidayName?` <span style="font-size:10px;font-weight:600;display:block;float:right;">${holidayName}</span>`:'');let evtsHtml=evts.slice(0,3).map(e=>`<div class="dash-item" style="background:#FFF6EF;border-left-color:var(--primary);color:var(--primary);"><div class="dash-item-text"><span class="dash-time">${e.time||''}</span>${e.text||''}</div><div class="dash-tooltip">${e.tooltip||''}</div></div>`).join('');if(evts.length>3){let hiddenText=evts.slice(3).map(e=>`${e.time||''} | ${e.text||''}`).join('<br>');evtsHtml+=`<div class="dash-cal-more-wrap"><div class="dash-cal-more">+${evts.length-3}건 더보기</div><div class="dash-tooltip" style="text-align:left;white-space:nowrap;font-weight:normal;">${hiddenText}</div></div>`;}mHtml+=`<div class="dash-cal-cell"><div class="dash-cal-date ${dateClass}">${dateText}</div>${evtsHtml}</div>`;});mHtml+=`</div>`;window.appCalEvts=calEvts;let mobStrip=`<div class="mobile-cal"><div class="m-cal-strip" id="m-cal-strip-app">`;iterDates.forEach(ds=>{let dObj=new Date(ds);let dayKr=["일","월","화","수","목","금","토"][dObj.getDay()];let hasEvt=calEvts[ds].length>0?'has-evt':'';mobStrip+=`<div class="m-cal-date" id="m-date-app-${ds}" onclick="window.renderMCalApp('${ds}')"><span class="m-cal-day">${dayKr}</span><span class="m-cal-num">${dObj.getDate()}</span><div class="m-cal-dot ${hasEvt}"></div></div>`;});mobStrip+=`</div><div id="m-cal-list-app" class="m-cal-list"></div></div>`;if($("appDashContent"))$("appDashContent").innerHTML=`<div class="desktop-cal">${mHtml}</div>`+mobStrip;let td=new Date();let todayStr=`${td.getFullYear()}-${String(td.getMonth()+1).padStart(2,'0')}-${String(td.getDate()).padStart(2,'0')}`;window.renderMCalApp(calEvts[todayStr]?todayStr:iterDates[0]);}
window.toggleInsight=function(){isInsightView=!isInsightView;let insightArea=$("app-insight-area");if(insightArea){insightArea.style.paddingTop="32px";insightArea.style.display=isInsightView?"block":"none";}if($("app-table-area"))$("app-table-area").style.display=isInsightView?"none":"block";if($("insightToggleBtn"))$("insightToggleBtn").innerText=isInsightView?"리스트 보기":"인사이트 보기";if(isInsightView)window.applyFilterApp();}
window.toggleAppDashView=function(view){currentAppDashView=view;if(view==='month'){if($("appDashMonthNav"))$("appDashMonthNav").style.display='flex';}else{if($("appDashMonthNav"))$("appDashMonthNav").style.display='none';appDashMonthOffset=0;}window.renderAppDashboard();}
window.changeAppDashMonth=function(offset){appDashMonthOffset+=offset;window.renderAppDashboard();}
window.resetAppDashMonth=function(){appDashMonthOffset=0;window.renderAppDashboard();}

window.fetchApplications=async function(){try{const{data,error}=await supabaseClient.from('applications').select('*').order('created_at',{ascending:false}).limit(2000);if(error)throw error;globalApps=data||[];const batches=[...new Set(globalApps.map(d=>d.desired_batch).filter(Boolean))].sort((a,b)=>parseInt(String(a).replace(/[^0-9]/g,'')||0)-parseInt(String(b).replace(/[^0-9]/g,'')||0));let optionsHTML='<option value="all">전체 기수 보기</option>';batches.forEach(b=>optionsHTML+=`<option value="${b}">${b}</option>`);if($("batchFilterApp"))$("batchFilterApp").innerHTML=optionsHTML;window.applyFilterApp();if($("crmModal")&&$("crmModal").classList.contains('show')&&$("crmAppId").value){window.renderCrmInner($("crmAppId").value,isCrmReadOnly);}}catch(e){console.error(e);}}

window.applyFilterApp=function(){try{const selected=$("batchFilterApp").value;const filtered=selected==='all'?globalApps:globalApps.filter(d=>d.desired_batch===selected);window.currentFilteredApps=filtered;if(isInsightView){window.renderStatistics(filtered);}else{window.renderAppTable(filtered);window.renderAppDailyBanner(filtered);window.renderAppDashboard();}}catch(e){console.error(e);}}
const statusClassMap={'대기':'st-wait','상담 일정 조율 중':'st-arranging','상담 일정 확정':'st-confirmed','상담 완료':'st-completed','연락 두절':'st-ghosted','설문 완료':'st-confirmed','품절':'st-ghosted'};
const joinClassMap={'':'jn-none','고민 중':'jn-thinking','연락 후 미가입':'jn-declined','상담 후 미가입':'jn-declined','가입 완료':'jn-joined','미가입':'jn-declined','다음 기수 희망':'jn-next'};

function parseAcquisitionChannel(rawText){if(!rawText)return '-';return String(rawText);}
window.closeCrmModal=function(){if($("crmModal"))$("crmModal").classList.remove('show');};
window.openCrmModal=function(id,isReadOnly=false){isCrmReadOnly=isReadOnly;if($("crmAppId"))$("crmAppId").value=id;window.renderCrmInner(id,isReadOnly);if($("crmModal"))$("crmModal").classList.add('show');};

window.renderCrmInner=function(id,isReadOnly=false){const app=globalApps.find(a=>String(a.id)===String(id));if(!app)return;let cCount=0;let now=new Date();let monthPrefix=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;if(gRes&&gTrn){gRes.forEach(r=>{if(window.samePhone(r.phone,app.phone)&&r.status==='당일 취소'&&String(r.res_date||r.created_at).startsWith(monthPrefix))cCount++;});gTrn.forEach(t=>{if(window.samePhone(t.phone,app.phone)&&t.status==='당일 취소'){let dStr=String(t.content||'').split(' || ')[0]||String(t.created_at);if(dStr.startsWith(monthPrefix))cCount++;}});}let warnHtml=cCount>=4?`<span style="background:var(--error);color:#fff;font-size:11px;padding:2px 6px;border-radius:4px;margin-left:8px;font-weight:700;vertical-align:middle;">경고</span>`:'';if($("crmName"))$("crmName").innerHTML=`<span style="font-weight:800;color:var(--text-display);margin-right:4px;">${app.desired_batch||'미정'}</span> ${window.escapeHtml(app.name||'이름 없음')} ${warnHtml}`;
    let _row = (label, value, valueStyle) => `<div style="display:table;width:100%;padding:4px 0;"><span style="display:table-cell;color:var(--text-tertiary);font-size:13px;font-weight:600;width:80px;padding-right:12px;vertical-align:top;white-space:nowrap;">${label}</span><span style="display:table-cell;vertical-align:top;${valueStyle||'font-weight:700;color:var(--text-display);font-size:14px;'}">${value}</span></div>`;
    let _profileHtml = '';
    _profileHtml += _row('연락처', window.escapeHtml(window.normalizePhone(app.phone)||app.phone||'-'));
    if(app.interest_area) _profileHtml += _row('관심 분야', window.escapeHtml(app.interest_area), 'font-weight:700;color:var(--text-display);font-size:14px;line-height:1.5;');
    if(app.acquisition_channel) _profileHtml += _row('유입 경로', window.escapeHtml(app.acquisition_channel));
    if(app.known_duration) _profileHtml += _row('인지 기간', window.escapeHtml(app.known_duration));
    if(app.interest_level) _profileHtml += _row('관심도', window.escapeHtml(window.mapInterestLevel(app.interest_level)), 'font-weight:700;color:var(--primary);font-size:14px;');
    if(app.desired_center) _profileHtml += _row('희망 센터', window.escapeHtml(app.desired_center));
    if($("crmProfile")){$("crmProfile").setAttribute('style','display:block;font-size:14px;line-height:1.5;');$("crmProfile").innerHTML=`<div style="display:flex;flex-direction:column;gap:6px;width:100%;">${_profileHtml}</div>`;}
    let _rawCallTime = app.call_time && app.call_time !== 'null' ? app.call_time : '';
    let _isScheduled = /^\d{4}-\d{2}-\d{2}/.test(_rawCallTime);
    let _timeLabel = _isScheduled ? '상담 예정일' : '통화 선호 시간';
    let _timeValue = '미정';
    if(_rawCallTime){
        if(_isScheduled){
            let _cp=_rawCallTime.split(' ');let _dn='',_tn='';
            if(_cp[0]){let _dp=_cp[0].split('-');let _dObj=new Date(parseInt(_dp[0]),parseInt(_dp[1])-1,parseInt(_dp[2]));let _dow=['일','월','화','수','목','금','토'][_dObj.getDay()];_dn=`${_dp[0]}년 ${parseInt(_dp[1])}월 ${parseInt(_dp[2])}일(${_dow})`;}
            if(_cp[1]){let _tp=_cp[1].split(':');let _h=parseInt(_tp[0]),_m=_tp[1]||'00';let _ap=_h>=12?'오후':'오전';let _h12=_h%12||12;_tn=` ${_ap} ${_h12}시 ${_m==='00'?'':_m+'분'}`;}
            _timeValue=window.escapeHtml((_dn+_tn).trim());
        }else{
            _timeValue=window.escapeHtml(_rawCallTime);
        }
    }
    if($("crmTimeBadge"))$("crmTimeBadge").innerHTML=`<div style="margin-top:12px;padding-top:10px;border-top:1px solid var(--border-strong,#e5e8eb);"><div style="display:table;width:100%;padding:4px 0;"><span style="display:table-cell;color:var(--text-tertiary);font-size:13px;font-weight:600;width:80px;padding-right:12px;vertical-align:top;white-space:nowrap;">${_timeLabel}</span><span style="display:table-cell;vertical-align:top;font-weight:700;color:var(--text-display);font-size:14px;">${_timeValue}</span></div></div>`;const job=app.survey_job;const edu=app.survey_edu;const goal=app.survey_goal;const brand=app.survey_brand;const region=app.survey_region;const ageGroup=app.survey_age_group;const curious=app.survey_curious;const useTime=app.survey_use_time;const expectations=app.survey_expectations;if($("crmSurveyResult")){if(job||edu||region||ageGroup){$("crmSurveyResult").innerHTML=`<div class="crm-box"><div class="crm-label">1. 거주 지역</div><div class="crm-answer">${window.escapeHtml(region)||'<span class="crm-empty">미작성</span>'}</div></div><div class="crm-box"><div class="crm-label">2. 연령대</div><div class="crm-answer">${window.escapeHtml(ageGroup)||'<span class="crm-empty">미작성</span>'}</div></div><div class="crm-box"><div class="crm-label">3. 직업 상태</div><div class="crm-answer">${window.escapeHtml(job)||'<span class="crm-empty">미작성</span>'}</div></div><div class="crm-box"><div class="crm-label">4. 선호 브랜드</div><div class="crm-answer">${window.escapeHtml(brand)||'<span class="crm-empty">미작성</span>'}</div></div><div class="crm-box"><div class="crm-label">5. 과거 교육 피드백</div><div class="crm-answer">${window.escapeHtml(edu)||'<span class="crm-empty">미작성</span>'}</div></div><div class="crm-box"><div class="crm-label">6. 커피 지식 궁금한 점</div><div class="crm-answer">${window.escapeHtml(curious)||'<span class="crm-empty">미작성</span>'}</div></div><div class="crm-box"><div class="crm-label">7. 달성 목표 (니즈)</div><div class="crm-answer">${window.escapeHtml(goal)||'<span class="crm-empty">미작성</span>'}</div></div><div class="crm-box"><div class="crm-label">8. 이용 희망 시간대</div><div class="crm-answer">${window.escapeHtml(useTime)||'<span class="crm-empty">미작성</span>'}</div></div><div class="crm-box"><div class="crm-label">9. 기대/바라는 점</div><div class="crm-answer">${window.escapeHtml(expectations)||'<span class="crm-empty">미작성</span>'}</div></div>`;}else{let _survUrl='https://www.wecoffee.co.kr/survey?uid='+app.id+'&name='+encodeURIComponent(app.name||'');$("crmSurveyResult").innerHTML=`<div style="text-align:center;padding:40px 20px;background:#fff;border-radius:12px;border:1px dashed var(--border-strong);"><div style="font-size:16px;font-weight:700;color:var(--text-secondary);margin-bottom:16px;">아직 사전 설문을 작성하지 않은 고객입니다.</div><button class="btn-outline" style="color:var(--primary);border-color:var(--primary);padding:12px 24px;font-size:15px;" onclick="window.copySurveyTemplate('${app.id}')">상담 안내 메시지 복사하기</button></div>`;}}let notesHtml='';if(app.admin_memo){let notes=app.admin_memo.split('|||');notes.forEach(note=>{let parts=note.split(':::');if(parts.length===2){notesHtml+=`<div class="crm-box"><div class="crm-label">${window.escapeHtml(parts[0])}</div><div class="crm-answer">${window.escapeHtml(parts[1]).replace(/\n/g,'<br>')}</div></div>`;}else if(note.trim()){notesHtml+=`<div class="crm-box"><div class="crm-answer">${window.escapeHtml(note.trim()).replace(/\n/g,'<br>')}</div></div>`;}});}if(!notesHtml)notesHtml=`<div style="font-size:13px;color:var(--text-tertiary);text-align:center;padding:10px;">등록된 상담 기록이 없습니다.</div>`;if($("crmAdminNotes"))$("crmAdminNotes").innerHTML=notesHtml;if($("crmNoteTitle"))$("crmNoteTitle").value='';if($("crmNoteInput"))$("crmNoteInput").value='';let initialStatus=app.join_status||(app.status==='상담 완료'?'상담 완료':'');if(!initialStatus||initialStatus==='대기')initialStatus='상담 완료';if($("crmStatusSelect"))$("crmStatusSelect").value=initialStatus;if($("crmNoteInputWrap"))$("crmNoteInputWrap").style.display=isReadOnly?'none':'block';if($("crmStatusActionArea"))$("crmStatusActionArea").style.display=isReadOnly?'none':'flex';}

window.updateAppStatus = async function(id, field, value, selectEl) {
    const app = globalApps.find(a => String(a.id) === String(id));
    const prevValue = app ? app[field] : null;
    if (field === 'join_status' && prevValue === '가입 완료' && value !== '가입 완료') {
        if (selectEl) selectEl.value = prevValue || '';
        const target = globalMembers.find(m => window.samePhone(m.phone, app?.phone));
        const dialogContent = target
            ? `<strong style="color:var(--primary);">${window.escapeHtml(app.name)}</strong> 님의 가입 여부를 변경하시겠습니까?<br><span style="color:var(--text-secondary);font-size:13px;">멤버리스트에서도 자동 삭제됩니다.</span>`
            : `<strong style="color:var(--primary);">${window.escapeHtml(app.name)}</strong> 님의 가입 여부를 변경하시겠습니까?<br><span style="color:var(--text-secondary);font-size:13px;">연결된 멤버 정보가 없습니다.</span>`;
        window.openCustomConfirm("가입 여부 변경", null, `<div style="font-size:15px;color:var(--text-display);line-height:1.6;">${dialogContent}</div>`,
            async () => {
                await supabaseClient.from('applications').update({ [field]: value }).eq('id', id);
                if (app) app[field] = value;
                if (target) {
                    await supabaseClient.from('members').delete().eq('id', target.id);
                    globalMembers = globalMembers.filter(m => m.id !== target.id);
                    if (typeof window.searchMembers === 'function') window.searchMembers();
                    showToast(`${app.name} 님이 멤버리스트에서 제거되었습니다.`);
                } else { showToast("상태가 변경되었습니다."); }
                window.applyFilterApp();
            }, target ? "변경 및 멤버리스트 삭제" : "변경");
        return;
    }
    if (field === 'join_status' && value === '다음 기수 희망' && app) {
        const batchStr = String(app.desired_batch || '').trim();
        const m = batchStr.match(/^(\d+)\s*기$/);
        if (!m) { showToast(`기수 정보('${batchStr}')가 표준 포맷이 아니어서 자동 이관할 수 없습니다.`); if (selectEl) selectEl.value = prevValue || ''; return; }
        const nextBatch = (parseInt(m[1], 10) + 1) + '기';
        const stamp = new Date().toISOString().slice(0, 10);
        const autoMemo = `[자동] ${stamp} ${batchStr} → ${nextBatch} 이관 (다음 기수 희망)`;
        const newMemo = app.admin_memo ? app.admin_memo + '|||' + autoMemo : autoMemo;
        const { error } = await supabaseClient.from('applications').update({ desired_batch: nextBatch, status: '대기', call_time: null, counselor_name: null, join_status: value, admin_memo: newMemo }).eq('id', id);
        if (error) { showToast("이관 실패"); if (selectEl) selectEl.value = prevValue || ''; return; }
        app.desired_batch = nextBatch; app.status = '대기'; app.call_time = null; app.counselor_name = null; app.join_status = value; app.admin_memo = newMemo;
        showToast(`${batchStr} → ${nextBatch} 이관 완료. 상담 기록은 보존됩니다.`);
        window.applyFilterApp();
        return;
    }
    const updates = {}; updates[field] = value;
    const { error } = await supabaseClient.from('applications').update(updates).eq('id', id);
    if (error) { showToast("변경 실패"); return; }
    if (app) app[field] = value;
    showToast("변경되었습니다.");
};

window.handleStatusChange = async function(id, newStatus, currentCallTime, currentCounselor) {
    const app = globalApps.find(a => String(a.id) === String(id));
    const prevStatus = app ? app.status : null;
    const { error } = await supabaseClient.from('applications').update({ status: newStatus }).eq('id', id);
    if (error) { showToast("상태 변경 실패"); return; }
    if (app) app.status = newStatus;
    if (newStatus === '연락 두절' && app && app.phone) {
        const { error: blkErr } = await supabaseClient.from('blocked_applicants').upsert({ name: app.name, phone: app.phone, reason: '연락 두절', application_id: id, blocked_at: new Date().toISOString() }, { onConflict: 'phone' });
        if (blkErr) { console.warn('블랙리스트 등록 실패:', blkErr); showToast("상태는 변경됐으나 차단 등록 실패."); }
        else { showToast("연락 두절 처리 완료. 해당 연락처는 신청이 차단됩니다."); }
        window.applyFilterApp();
        return;
    }
    if (prevStatus === '연락 두절' && newStatus !== '연락 두절' && app && app.phone) {
        await supabaseClient.from('blocked_applicants').delete().eq('phone', app.phone);
    }
    if (newStatus === '상담 일정 확정' || newStatus === '설문 완료') { window.openScheduleModal(id, currentCallTime, currentCounselor); }
    else { showToast("상태가 변경되었습니다."); window.applyFilterApp(); }
};

function _korDateToInput(str) { const m=String(str||'').match(/(\d+)월\s*(\d+)일/); if(!m)return ''; const y=new Date().getFullYear(),mo=String(parseInt(m[1])).padStart(2,'0'),d=String(parseInt(m[2])).padStart(2,'0'); return `${y}-${mo}-${d}`; }
function _korTimeToInput(str) { const m=String(str||'').match(/(오전|오후)\s*(\d+)[시:]\s*(\d+)?/); if(!m)return ''; let h=parseInt(m[2]),min=m[3]?parseInt(m[3]):0; if(m[1]==='오후'&&h!==12)h+=12; if(m[1]==='오전'&&h===12)h=0; return `${String(h).padStart(2,'0')}:${String(min).padStart(2,'0')}`; }
function _inputToKorDate(val) { if(!val)return ''; const d=new Date(val+'T00:00:00'); return `${d.getMonth()+1}월 ${d.getDate()}일`; }
function _inputToKorTime(val) { if(!val)return ''; const[h,m]=val.split(':').map(Number); const ap=h>=12?'오후':'오전'; const h12=h%12||12; return `${ap} ${h12}:${String(m).padStart(2,'0')}`; }
window.openScheduleModal = function(id, currentCallTime, currentCounselor) {
    let modal = document.getElementById('scheduleModal');
    const needsBuild = !modal || !document.getElementById('schedDateInput');
    if (!modal) { modal = document.createElement('div'); modal.id = 'scheduleModal'; modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:99990;align-items:center;justify-content:center;padding:16px;box-sizing:border-box;'; document.body.appendChild(modal); }
    if (needsBuild) {
        modal.innerHTML = `<div style="background:#fff;border-radius:16px;width:100%;max-width:480px;box-shadow:0 8px 32px rgba(0,0,0,0.18);overflow:hidden;"><div style="padding:20px 24px 16px;border-bottom:1px solid var(--border-strong);"><div style="font-size:16px;font-weight:800;color:var(--text-display);">상담 일정 설정</div></div><div style="padding:20px 24px;display:flex;flex-direction:column;gap:16px;"><div><label style="font-size:13px;font-weight:700;color:var(--text-secondary);display:block;margin-bottom:6px;">상담 날짜</label><div class="input-with-icon-right" style="position:relative;"><input id="schedDateInput" type="text" placeholder="MMDD (예: 0514)" class="input-search icon-p" style="width:100%;box-sizing:border-box;" onblur="this.value=window.formatBlockDate(this.value)"><input type="date" class="hidden-native-picker" onchange="document.getElementById('schedDateInput').value=this.value;document.getElementById('schedDateInput').blur();"><svg class="input-icon-right" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg></div></div><div><label style="font-size:13px;font-weight:700;color:var(--text-secondary);display:block;margin-bottom:6px;">상담 시간</label><div class="input-with-icon-right" style="position:relative;"><input id="schedTimeInput" type="text" placeholder="HHMM (예: 1430)" class="input-search icon-p" style="width:100%;box-sizing:border-box;" onblur="this.value=window.formatBlockTime(this.value)"><input type="time" class="hidden-native-picker" onchange="document.getElementById('schedTimeInput').value=this.value.replace(':','');document.getElementById('schedTimeInput').blur();"><svg class="input-icon-right" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg></div></div><div><label style="font-size:13px;font-weight:700;color:var(--text-secondary);display:block;margin-bottom:6px;">상담 예정자</label><input id="schedCounselorInput" type="text" placeholder="담당자 이름" style="width:100%;padding:10px 12px;border:1px solid var(--border-strong);border-radius:8px;font-size:14px;box-sizing:border-box;outline:none;background:#fff;color:var(--text-display);" onfocus="this.style.borderColor='var(--primary)'" onblur="this.style.borderColor='var(--border-strong)'"></div></div><div style="padding:16px 24px;border-top:1px solid var(--border-strong);display:flex;justify-content:flex-end;gap:8px;"><button class="btn-outline" onclick="window.closeScheduleModal()" style="padding:10px 20px;">취소</button><button onclick="window.saveSchedule()" style="padding:10px 20px;background:var(--primary);color:#fff;border:none;border-radius:8px;font-weight:700;cursor:pointer;font-size:14px;">저장</button></div></div>`;
        /* 여백 클릭 닫힘 방지 — 입력 내용 보호 */
    }
    modal._targetId = id;
    const dateInput = document.getElementById('schedDateInput'); const timeInput = document.getElementById('schedTimeInput'); const counselorInput = document.getElementById('schedCounselorInput');
    if (currentCallTime && currentCallTime !== 'null' && currentCallTime !== 'undefined') {
        const parts = String(currentCallTime).split(' ');
        const dateOk = parts[0] && /^\d{4}-\d{2}-\d{2}$/.test(parts[0]);
        const timeOk = parts[1] && /^\d{2}:\d{2}$/.test(parts[1]);
        if (dateInput) dateInput.value = dateOk ? parts[0] : '';
        if (timeInput) timeInput.value = timeOk ? parts[1].replace(':','') : '';
    } else { if (dateInput) dateInput.value = ''; if (timeInput) timeInput.value = ''; }
    if (counselorInput) counselorInput.value = (currentCounselor && currentCounselor !== 'null' && currentCounselor !== 'undefined') ? currentCounselor : '';
    modal.classList.add('show'); modal.style.display = 'flex';
};
window.closeScheduleModal = function() { const modal = document.getElementById('scheduleModal'); if (modal) { modal.classList.remove('show'); modal.style.display = 'none'; } };
window.saveSchedule = async function() { const modal = document.getElementById('scheduleModal'); if (!modal || !modal._targetId) return; const id = modal._targetId; const dateVal = (document.getElementById('schedDateInput')?.value || '').trim(); const timeVal = (document.getElementById('schedTimeInput')?.value || '').trim(); const counselorVal = (document.getElementById('schedCounselorInput')?.value || '').trim(); const callTime = [dateVal?window.formatBlockDate(dateVal):'', timeVal?window.formatBlockTime(timeVal):''].filter(Boolean).join(' '); const { error } = await supabaseClient.from('applications').update({ call_time: callTime || null, counselor_name: counselorVal || null }).eq('id', id); if (error) { showToast("저장 실패"); return; } const app = globalApps.find(a => String(a.id) === String(id)); if (app) { app.call_time = callTime; app.counselor_name = counselorVal; } window.closeScheduleModal(); window.applyFilterApp(); const surveyUrl=`https://www.wecoffee.co.kr/survey?uid=${id}&name=${encodeURIComponent(app?.name||'')}`;let _ct=callTime.split(' ');let _dateNice='',_timeNice='';if(_ct[0]){let _dp=_ct[0].split('-');let _dObj=new Date(parseInt(_dp[0]),parseInt(_dp[1])-1,parseInt(_dp[2]));let _dow=['일','월','화','수','목','금','토'][_dObj.getDay()];_dateNice=`${parseInt(_dp[1])}월 ${parseInt(_dp[2])}일(${_dow})`;}if(_ct[1]){let _tp=_ct[1].split(':');let _h=parseInt(_tp[0]),_m=_tp[1]||'00';let _ap=_h>=12?'오후':'오전';let _h12=_h%12||12;_timeNice=`${_ap} ${_h12}:${_m}`;}let _scheduleStr=_dateNice&&_timeNice?`${_dateNice}, ${_timeNice}`:callTime;let _msgTemplate=`안녕하세요 ${app?.name||''}님, 통화했던 위커피 운영팀입니다 :)\n상담일정은 ${_scheduleStr} 입니다.\n\n오시기 전에 아래 링크의 설문을 작성해주시길 부탁드립니다.\n\n[Wecoffee 주소]\n마포 센터: 서울 마포구 월드컵북로 41 301호\n광진 센터: 서울 광진구 능동로36길 18 3층\n\n*센터 내 지정 주차 공간은 마련되어 있지 않습니다.\n차량으로 방문하실 경우 인근의 공영 주차장 이용을 부탁드립니다.\n\n[상담 전 작성설문]\n${surveyUrl}\n\n[상담 전 홈페이지 내용을 꼼꼼히 숙지해주세요]\nwww.wecoffee.co.kr`;window.openCustomConfirm("상담 안내 메시지",null,`<div style="text-align:center;font-size:14px;color:var(--text-secondary);line-height:1.7;">상담 일정이 저장되었습니다.<br><strong style="color:var(--text-display);font-size:15px;">${window.escapeHtml(app?.name||'')}님</strong>께 상담 안내 메시지를 전달하시겠어요?</div>`,_msgTemplate,"복사하기"); };

window.renderAppTable = function(data) {
    if(!$("appTableBody"))return;
    const tbody=$("appTableBody");
    tbody.innerHTML='';
    if(data.length===0){tbody.innerHTML=`<tr><td colspan="9" class="empty-state">내역이 없습니다.</td></tr>`;return;}
    if(!document.getElementById('wc-m-only-style')){const s=document.createElement('style');s.id='wc-m-only-style';s.textContent='.m-only-cell{display:none!important}@media(max-width:768px){tr.expanded .m-only-cell{display:block!important;padding-top:10px!important;padding-bottom:10px!important}}';document.head.appendChild(s);}
    data.forEach(row=>{
        const interestFull=row.interest_area||'-';
        let routeDisplay=row.acquisition_channel||'-';
        const cStat=statusClassMap[row.status]||'st-wait';
        const cJoin=joinClassMap[row.join_status||'']||'jn-none';
        let timeBadgeHtml=(row.status==='상담 일정 확정'||row.status==='설문 완료')?`<div class="edit-schedule-link" onclick="window.openScheduleModal('${row.id}','${row.call_time}','${row.counselor_name}')">상담 일정 수정</div>`:'';
        let surveyBadge=(row.survey_job||row.survey_edu)?`<span class="status-badge badge-orange" style="margin-right:8px;font-size:11px;">설문완료</span>`:`<span class="status-badge badge-gray" style="margin-right:8px;font-size:11px;">미응답</span>`;
        let nameHtml=`${surveyBadge}<strong style="cursor:pointer;" onclick="window.openCrmModal('${row.id}')">${window.escapeHtml(row.name)}</strong>`;
        let _mRawTime = row.call_time && row.call_time !== 'null' ? row.call_time : '';
        let _mIsScheduled = /^\d{4}-\d{2}-\d{2}/.test(_mRawTime);
        let _mTimeLabel = _mIsScheduled ? '상담 예정일' : '통화 선호 시간';
        let _mTimeValue = _mRawTime || '미정';
        let mPreview=`<td class="m-preview" onclick="this.closest('tr').classList.toggle('expanded')"><div class="m-prev-top"><span class="m-prev-date">${formatDtWithDow(row.created_at)}</span><span class="status-badge ${cStat}">${row.status}</span></div><div class="m-prev-title">${row.desired_batch||'-'} ${window.escapeHtml(row.name)} <span style="font-size:13px;color:var(--text-secondary);">(${window.escapeHtml(window.normalizePhone(row.phone)||row.phone||'')})</span></div><span class="m-toggle-hint">상세 정보 보기 ▼</span></td>`;
        const tr=document.createElement('tr');
        tr.innerHTML=`${mPreview}<td data-label="신청일시">${formatDt(row.created_at)}</td><td data-label="기수">${row.desired_batch||'-'}</td><td data-label="성함">${nameHtml}</td><td data-label="연락처">${window.escapeHtml(window.normalizePhone(row.phone)||row.phone||'')}</td><td data-label="관심 분야"><div>${interestFull}</span></td><td data-label="유입 경로"><div>${routeDisplay}</span></td><td data-label="인지 기간" class="m-only-cell"><span style="flex:1;">${window.escapeHtml(row.known_duration||'-')}</span></td><td data-label="관심도" class="m-only-cell"><span style="flex:1;"><span style="color:var(--primary);font-weight:700;">${window.escapeHtml(window.mapInterestLevel(row.interest_level)||'-')}</span></span></td><td data-label="희망 센터" class="m-only-cell"><span style="flex:1;">${window.escapeHtml(row.desired_center||'-')}</span></td><td data-label="${window.escapeHtml(_mTimeLabel)}" class="m-only-cell"><span style="flex:1;"><span style="font-weight:600;">${window.escapeHtml(_mTimeValue)}</span></span></td><td data-label="상담 진행 상황" style="vertical-align:top !important;"><select class="status-select ${cStat}" style="display:block;" onchange="window.handleStatusChange('${row.id}',this.value,'${row.call_time}','${row.counselor_name}')"><option value="대기" ${row.status==='대기'?'selected':''}>대기</option><option value="상담 일정 조율 중" ${row.status==='상담 일정 조율 중'?'selected':''}>상담 일정 조율 중</option><option value="상담 일정 확정" ${row.status==='상담 일정 확정'?'selected':''}>상담 일정 확정</option><option value="설문 완료" ${row.status==='설문 완료'?'selected':''}>상담 설문 완료</option><option value="상담 완료" ${row.status==='상담 완료'?'selected':''}>상담 완료</option><option value="연락 두절" ${row.status==='연락 두절'?'selected':''}>연락 두절</option></select>${timeBadgeHtml}</td><td data-label="가입 여부" style="vertical-align:top !important;"><select class="status-select ${cJoin}" style="display:block;" onchange="window.updateAppStatus('${row.id}','join_status',this.value,this)" ${row.status==='상담 완료'?'':'disabled'}><option value="" ${!row.join_status?'selected':''}>선택 전</option><option value="고민 중" ${row.join_status==='고민 중'?'selected':''}>고민 중</option><option value="연락 후 미가입" ${row.join_status==='연락 후 미가입'?'selected':''}>연락 후 미가입</option><option value="상담 후 미가입" ${row.join_status==='상담 후 미가입'?'selected':''}>상담 후 미가입</option><option value="가입 완료" ${row.join_status==='가입 완료'?'selected':''}>가입 완료</option><option value="미가입" ${row.join_status==='미가입'?'selected':''}>미가입</option><option value="다음 기수 희망" ${row.join_status==='다음 기수 희망'?'selected':''}>다음 기수 희망</option></select></td>`;
        tbody.appendChild(tr);
    });
}

function getFrequency(arr){return Object.entries(arr.reduce((acc,val)=>{if(val)acc[val]=(acc[val]||0)+1;return acc;},{})).sort((a,b)=>b[1]-a[1]);}
function generateBarHTML(label,count,maxCount,opacity=1){const percent=maxCount===0?0:Math.round((count/maxCount)*100);return `<div style="margin-bottom:8px;"><div style="font-size:13px;font-weight:600;margin-bottom:4px;display:flex;justify-content:space-between;"><span>${label}</span><span style="color:var(--text-secondary);font-size:12px;">${count}건 (${percent}%)</span></div><div style="background:var(--border-strong);height:8px;border-radius:4px;overflow:hidden;"><div style="width:${percent}%;background:rgba(255,121,0,${opacity});height:100%;"></div></div></div>`;}

window.renderStatistics=function(data){if(!$("statsContainer"))return;const container=$("statsContainer");container.innerHTML='';if(data.length===0){if($("insightSummaryText"))$("insightSummaryText").innerHTML="<div style='padding:16px;'>데이터가 부족합니다.</div>";return;}const total=data.length;const counseled=data.filter(d=>d.status==='상담 일정 확정'||d.status==='설문 완료'||d.status==='상담 완료').length;const joined=data.filter(d=>d.join_status==='가입 완료').length;const convRate=total>0?Math.round((joined/total)*100):0;const dropoutCount=data.filter(d=>d.join_status==='연락 후 미가입'||d.join_status==='상담 후 미가입'||d.join_status==='미가입').length;const realDropoutRate=counseled>0?Math.round((dropoutCount/counseled)*100):0;const applyDropoutRate=total>0?Math.round((dropoutCount/total)*100):0;const stage1=data.filter(d=>d.join_status==='연락 후 미가입').length;const stage2=data.filter(d=>d.join_status==='상담 후 미가입').length;const stage3=data.filter(d=>d.join_status==='미가입').length;const counselorMap={};data.forEach(d=>{const cname=(d.counselor_name&&d.counselor_name!=='null'&&d.counselor_name.trim())?d.counselor_name.trim():'미지정';if(!counselorMap[cname])counselorMap[cname]={total:0,joined:0,dropout:0,pending:0};counselorMap[cname].total++;if(d.join_status==='가입 완료')counselorMap[cname].joined++;else if(d.join_status==='연락 후 미가입'||d.join_status==='상담 후 미가입'||d.join_status==='미가입')counselorMap[cname].dropout++;else counselorMap[cname].pending++;});const counselorList=Object.entries(counselorMap).filter(([k,v])=>v.total>0&&k!=='미지정').sort((a,b)=>{const rA=a[1].total>0?a[1].joined/a[1].total:0;const rB=b[1].total>0?b[1].joined/b[1].total:0;return rB-rA;});let channelMap={};let safeDataForSummary={instaFollow:0,instaNonFollow:0,adNow:0,leadTime3M:0};data.forEach(d=>{let rawAcq=String(d.acquisition_channel||'기타');let acq_ch=rawAcq;let etcDetail='';if(rawAcq.startsWith('기타')){let colonIdx=rawAcq.indexOf(':');if(colonIdx>-1){acq_ch='기타';etcDetail=rawAcq.substring(colonIdx+1).trim();}else{acq_ch='기타';}}if(!channelMap[acq_ch])channelMap[acq_ch]={total:0,details:{}};channelMap[acq_ch].total++;let detail='';if(acq_ch==='인스타그램'){if(d.is_follow==='네, 팔로우하고 있어요')safeDataForSummary.instaFollow++;else if(d.is_follow)safeDataForSummary.instaNonFollow++;detail=d.follow_duration||d.is_follow||'';}else if(acq_ch==='광고'){detail=d.ad_duration||'';if(detail==='최근 일주일 이내'||detail==='한 달 이내')safeDataForSummary.adNow++;else if(detail==='3개월 이내'||detail==='1년 이내')safeDataForSummary.leadTime3M++;}else if(acq_ch==='지인·카페·커뮤니티'||acq_ch==='지인 추천'){detail='';}else if(acq_ch==='기타'){detail=etcDetail;}if(detail){channelMap[acq_ch].details[detail]=(channelMap[acq_ch].details[detail]||0)+1;}});let interestAllVals=[];let interestEtcMap={};data.forEach(d=>{if(d.interest_area)String(d.interest_area).split(',').map(s=>s.trim()).filter(Boolean).forEach(v=>{if(v.startsWith('기타')){let colonIdx=v.indexOf(':');if(colonIdx>-1){let etcDet=v.substring(colonIdx+1).trim();interestAllVals.push('기타');if(etcDet)interestEtcMap[etcDet]=(interestEtcMap[etcDet]||0)+1;}else{interestAllVals.push('기타');}}else{interestAllVals.push(v);}});});let interestData=getFrequency(interestAllVals);let topInterest=interestData.length>0?interestData[0][0]:'없음';let topInterestRate=total>0&&interestData.length>0?Math.round((interestData[0][1]/total)*100):0;let summaryHtml=`<div style="display:flex;flex-wrap:wrap;gap:16px;margin-bottom:32px;"><div style="flex:1;min-width:260px;background:#fff;border:1px solid var(--border-strong);border-radius:12px;padding:24px;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;"><div style="font-size:13px;color:var(--text-secondary);margin-bottom:8px;font-weight:600;">기수 주요 목적 (관심사)</div><div style="font-size:20px;font-weight:800;color:var(--text-display);">${topInterest} <span style="font-size:15px;color:var(--primary);">(${topInterestRate}%)</span></div></div><div style="flex:1;min-width:260px;background:#fff;border:1px solid var(--border-strong);border-radius:12px;padding:24px;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;"><div style="font-size:13px;color:var(--text-secondary);margin-bottom:8px;font-weight:600;">인스타그램 팔로워 유입 현황</div><div style="font-size:15px;font-weight:700;color:var(--text-display);">팔로워 <span style="font-size:22px;color:var(--primary);font-weight:800;">${safeDataForSummary.instaFollow}</span>명 <span style="color:var(--border-strong);margin:0 8px;">|</span> 비팔로워 <span style="font-size:20px;font-weight:800;">${safeDataForSummary.instaNonFollow}</span>명</div></div><div style="flex:1;min-width:260px;background:#fff;border:1px solid var(--border-strong);border-radius:12px;padding:24px;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;"><div style="font-size:13px;color:var(--text-secondary);margin-bottom:8px;font-weight:600;">광고 리드타임 (노출 → 신청)</div><div style="font-size:15px;font-weight:700;color:var(--text-display);">단기 (1달 이내) <span style="font-size:22px;color:var(--primary);font-weight:800;">${safeDataForSummary.adNow}</span>명 <span style="color:var(--border-strong);margin:0 8px;">|</span> 장기 (3개월+) <span style="font-size:20px;font-weight:800;">${safeDataForSummary.leadTime3M}</span>명</div></div></div>`;if($("insightSummaryText"))$("insightSummaryText").innerHTML=summaryHtml;let cardsHtml=`<div class="stat-card" style="padding:24px 16px;"><div style="font-size:13px;color:var(--text-secondary);margin-bottom:8px;font-weight:600;">총 신청 건수</div><div style="font-size:26px;font-weight:800;color:var(--text-display);line-height:1;">${total}<span style="font-size:15px;margin-left:2px;">건</span></div></div><div class="stat-card" style="padding:24px 16px;"><div style="font-size:13px;color:var(--text-secondary);margin-bottom:8px;font-weight:600;">최종 가입 전환율</div><div style="font-size:26px;font-weight:800;color:var(--primary);line-height:1;">${convRate}<span style="font-size:18px;">%</span></div></div><div class="stat-card" style="padding:24px 16px;"><div style="font-size:13px;color:var(--text-secondary);margin-bottom:8px;font-weight:600;">인스타그램 (총합)</div><div style="font-size:26px;font-weight:800;color:var(--text-display);line-height:1;">${channelMap['인스타그램']?channelMap['인스타그램'].total:0}<span style="font-size:15px;margin-left:2px;">건</span></div></div><div class="stat-card" style="padding:24px 16px;"><div style="font-size:13px;color:var(--text-secondary);margin-bottom:8px;font-weight:600;">모집 광고 (총합)</div><div style="font-size:26px;font-weight:800;color:var(--text-display);line-height:1;">${channelMap['모집 광고']?channelMap['모집 광고'].total:0}<span style="font-size:15px;margin-left:2px;">건</span></div></div>`;if($("statsCards"))$("statsCards").innerHTML=cardsHtml;let funnelHtml=`<div class="stat-card" style="padding:24px;"><div style="font-size:16px;font-weight:800;margin-bottom:20px;color:var(--text-display);width:100%;text-align:left;">고객 전환 퍼널 (Funnel)</div><div class="funnel-wrap"><div class="funnel-step"><div style="font-size:13px;color:var(--text-secondary);margin-bottom:6px;font-weight:600;">신청 접수</div><div style="font-size:20px;font-weight:800;color:var(--text-display);">${total}명</div></div><div class="funnel-arrow">➔</div><div class="funnel-step"><div style="font-size:13px;color:var(--text-secondary);margin-bottom:6px;font-weight:600;">상담 확정/완료</div><div style="font-size:20px;font-weight:800;color:var(--text-display);margin-bottom:4px;">${counseled}명</div><div style="font-size:12px;color:var(--primary);font-weight:700;background:#fff;padding:2px 8px;border-radius:4px;border:1px solid #f2f4f6;">${total>0?Math.round(counseled/total*100):0}% 전환</div></div><div class="funnel-arrow">➔</div><div class="funnel-step success"><div style="font-size:13px;margin-bottom:6px;font-weight:600;">가입 완료</div><div style="font-size:20px;font-weight:800;margin-bottom:4px;">${joined}명</div><div style="font-size:12px;color:var(--primary);font-weight:700;background:#fff;padding:2px 8px;border-radius:4px;">${counseled>0?Math.round(joined/counseled*100):0}% 전환</div></div></div></div>`;if($("statsFunnel")){$("statsFunnel").innerHTML=funnelHtml;$("statsFunnel").style.display='block';}let dropoutColor=realDropoutRate>=30?'var(--error)':(realDropoutRate>=15?'#f59e0b':'var(--text-display)');let dropoutCardHtml=`<div class="stat-card" style="padding:24px;text-align:left;align-items:flex-start;margin-bottom:24px;"><div style="display:flex;justify-content:space-between;align-items:flex-start;width:100%;margin-bottom:8px;"><div style="font-size:14px;color:var(--text-secondary);font-weight:700;">실질 이탈률 <span style="font-size:11px;color:var(--text-tertiary);font-weight:500;margin-left:4px;">(상담 완료 대비)</span></div><div style="font-size:11px;color:var(--text-tertiary);font-weight:500;background:#f9fafb;padding:4px 8px;border-radius:6px;">참고: 신청 대비 ${applyDropoutRate}%</div></div><div style="font-size:42px;font-weight:900;color:${dropoutColor};line-height:1;margin-bottom:6px;letter-spacing:-1px;">${realDropoutRate}<span style="font-size:22px;">%</span></div><div style="font-size:13px;color:var(--text-secondary);font-weight:500;margin-bottom:20px;">상담 완료자 ${counseled}명 중 <strong style="color:var(--text-display);">${dropoutCount}명</strong> 이탈</div><div style="width:100%;border-top:1px solid var(--border-strong);padding-top:16px;"><div style="display:flex;align-items:center;margin-bottom:10px;"><div style="color:var(--text-tertiary);margin-right:8px;font-size:12px;font-weight:800;">ㄴ</div><div style="flex:1;display:flex;justify-content:space-between;align-items:center;"><span style="font-size:13px;color:var(--text-secondary);font-weight:600;">연락 후 미가입</span><span style="font-size:13px;color:var(--text-display);font-weight:700;">${stage1}명</span></div></div><div style="display:flex;align-items:center;margin-bottom:10px;"><div style="color:var(--text-tertiary);margin-right:8px;font-size:12px;font-weight:800;">ㄴ</div><div style="flex:1;display:flex;justify-content:space-between;align-items:center;"><span style="font-size:13px;color:var(--text-secondary);font-weight:600;">상담 후 미가입</span><span style="font-size:13px;color:var(--text-display);font-weight:700;">${stage2}명</span></div></div><div style="display:flex;align-items:center;"><div style="color:var(--text-tertiary);margin-right:8px;font-size:12px;font-weight:800;">ㄴ</div><div style="flex:1;display:flex;justify-content:space-between;align-items:center;"><span style="font-size:13px;color:var(--text-secondary);font-weight:600;">미가입 (기타)</span><span style="font-size:13px;color:var(--text-display);font-weight:700;">${stage3}명</span></div></div></div></div>`;let counselorChartHtml='';counselorList.forEach(([name,stats])=>{const joinedPct=stats.total>0?(stats.joined/stats.total)*100:0;const dropoutPct=stats.total>0?(stats.dropout/stats.total)*100:0;const pendingPct=stats.total>0?(stats.pending/stats.total)*100:0;const joinRate=Math.round(joinedPct);counselorChartHtml+=`<div style="margin-bottom:18px;"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;"><span style="font-size:14px;font-weight:800;color:var(--text-display);">${window.escapeHtml(name)}</span><span style="font-size:13px;font-weight:600;color:var(--text-secondary);">${stats.joined}/${stats.total}명 <span style="color:var(--primary);font-weight:800;margin-left:4px;">(가입률 ${joinRate}%)</span></span></div><div style="display:flex;height:14px;border-radius:7px;overflow:hidden;background:var(--border-strong);"><div style="width:${joinedPct}%;background:#32b06a;transition:0.3s;"></div><div style="width:${dropoutPct}%;background:#e85d5d;transition:0.3s;"></div><div style="width:${pendingPct}%;background:#b0b8c1;transition:0.3s;"></div></div><div style="display:flex;gap:12px;margin-top:8px;font-size:11px;color:var(--text-tertiary);font-weight:600;"><span><span style="display:inline-block;width:8px;height:8px;background:#32b06a;border-radius:2px;margin-right:4px;vertical-align:middle;"></span>가입 ${stats.joined}명</span><span><span style="display:inline-block;width:8px;height:8px;background:#e85d5d;border-radius:2px;margin-right:4px;vertical-align:middle;"></span>이탈 ${stats.dropout}명</span><span><span style="display:inline-block;width:8px;height:8px;background:#b0b8c1;border-radius:2px;margin-right:4px;vertical-align:middle;"></span>진행 중 ${stats.pending}명</span></div></div>`;});let counselorCardHtml=counselorList.length>0?`<div class="stat-card" style="padding:24px;text-align:left;align-items:flex-start;margin-bottom:24px;"><div style="font-size:16px;font-weight:800;margin-bottom:24px;width:100%;color:var(--text-display);">상담자별 가입/이탈률</div><div style="width:100%;">${counselorChartHtml}</div></div>`:'';let sortedChannels=Object.entries(channelMap).sort((a,b)=>b[1].total-a[1].total);let treeChartHtml='';sortedChannels.forEach((item,index)=>{let chName=item[0];let chTotal=item[1].total;let details=item[1].details;let opacity=index===0?1:(index===1?0.8:(index===2?0.6:0.4));let percent=total>0?Math.round((chTotal/total)*100):0;treeChartHtml+=`<div style="margin-bottom:16px;"><div style="font-size:14px;font-weight:800;color:var(--text-display);margin-bottom:4px;display:flex;justify-content:space-between;"><span>${index+1}. ${chName}</span><span>${chTotal}건 (${percent}%)</span></div><div style="background:var(--border-strong);height:8px;border-radius:4px;overflow:hidden;margin-bottom:8px;"><div style="width:${percent}%;background:rgba(255,121,0,${opacity});height:100%;"></div></div>`;let sortedDetails=Object.entries(details).sort((a,b)=>b[1]-a[1]);if(sortedDetails.length>0){sortedDetails.forEach(det=>{let dName=det[0];let dCount=det[1];let dPercent=Math.round((dCount/chTotal)*100);treeChartHtml+=`<div style="display:flex;align-items:center;margin-bottom:6px;padding-left:12px;"><div style="color:var(--text-tertiary);margin-right:8px;font-size:12px;font-weight:800;">ㄴ</div><div style="flex:1;"><div style="display:flex;justify-content:space-between;font-size:12px;font-weight:600;color:var(--text-secondary);margin-bottom:4px;"><span>${dName}</span><span>${dCount}건</span></div><div style="background:var(--border);height:4px;border-radius:2px;overflow:hidden;"><div style="width:${dPercent}%;background:rgba(255,121,0,${opacity*0.4});height:100%;"></div></div></div></div>`;});}treeChartHtml+=`</div>`;});let chartsHtml=`<div class="stat-card" style="padding:24px;text-align:left;align-items:flex-start;"><div style="font-size:16px;font-weight:800;margin-bottom:24px;width:100%;">전체 유입 경로 순위 (상세 속성 트리)</div><div style="width:100%;">${treeChartHtml}</div></div><div class="stat-card" style="padding:24px;text-align:left;align-items:flex-start;"><div style="font-size:16px;font-weight:800;margin-bottom:24px;width:100%;">관심 분야 (목적)</div><div style="width:100%;">${getFrequency(interestAllVals).map((c,i)=>{let label=c[0];let cnt=c[1];let op=i===0?1:(i===1?0.8:(i===2?0.6:0.4));let pct=total===0?0:Math.round((cnt/total)*100);let html=`<div style="margin-bottom:8px;"><div style="font-size:13px;font-weight:600;margin-bottom:4px;display:flex;justify-content:space-between;"><span>${label}</span><span style="color:var(--text-secondary);font-size:12px;">${cnt}건 (${pct}%)</span></div><div style="background:var(--border-strong);height:8px;border-radius:4px;overflow:hidden;"><div style="width:${pct}%;background:rgba(255,121,0,${op});height:100%;"></div></div>`;if(label==='기타'&&Object.keys(interestEtcMap).length>0){Object.entries(interestEtcMap).sort((a,b)=>b[1]-a[1]).forEach(det=>{let dPct=cnt>0?Math.round((det[1]/cnt)*100):0;html+=`<div style="display:flex;align-items:center;margin-top:6px;padding-left:12px;"><div style="color:var(--text-tertiary);margin-right:8px;font-size:12px;font-weight:800;">ㄴ</div><div style="flex:1;"><div style="display:flex;justify-content:space-between;font-size:12px;font-weight:600;color:var(--text-secondary);margin-bottom:4px;"><span>${det[0]}</span><span>${det[1]}건</span></div><div style="background:var(--border);height:4px;border-radius:2px;overflow:hidden;"><div style="width:${dPct}%;background:rgba(255,121,0,${op*0.4});height:100%;"></div></div></div></div>`;});}html+='</div>';return html;}).join('')}</div></div>`;container.innerHTML=dropoutCardHtml+counselorCardHtml+chartsHtml;let knownDurData=getFrequency(data.map(d=>d.known_duration).filter(Boolean));if(knownDurData.length>0){let kdHtml=`<div class="stat-card" style="padding:24px;text-align:left;align-items:flex-start;"><div style="font-size:16px;font-weight:800;margin-bottom:24px;width:100%;">위커피 인지 기간 분포</div><div style="width:100%;">`;knownDurData.forEach((c,i)=>{let pct=total===0?0:Math.round((c[1]/total)*100);let op=i===0?1:(i===1?0.8:(i===2?0.6:0.4));kdHtml+=`<div style="margin-bottom:8px;"><div style="font-size:13px;font-weight:600;margin-bottom:4px;display:flex;justify-content:space-between;"><span>${c[0]}</span><span style="color:var(--text-secondary);font-size:12px;">${c[1]}건 (${pct}%)</span></div><div style="background:var(--border-strong);height:8px;border-radius:4px;overflow:hidden;"><div style="width:${pct}%;background:rgba(255,121,0,${op});height:100%;"></div></div></div>`;});kdHtml+=`</div></div>`;container.innerHTML+=kdHtml;}window.currentInsightData={total,joined,dropoutCount,realDropoutRate,applyDropoutRate,instaCount:channelMap['인스타그램']?channelMap['인스타그램'].total:0,adCount:channelMap['모집 광고']?channelMap['모집 광고'].total:0,instaFollow:safeDataForSummary.instaFollow,instaNonFollow:safeDataForSummary.instaNonFollow,leadTime1M:safeDataForSummary.adNow,leadTime3M:safeDataForSummary.leadTime3M,channelMap,counselorMap,knownDurData:getFrequency(data.map(d=>d.known_duration).filter(Boolean))};}

// ▼▼▼ 파트3 끝 — 파트4에서 이어집니다 ▼▼▼

// ▼▼▼ 파트4 시작 (changeMemberPerPage 부터) ▼▼▼

window.changeMemberPerPage=function(val){memberItemsPerPage=val==='all'?999999:parseInt(val);currentMemberPage=1;renderMemberTablePage();};
window.changeMemberPage=function(page){currentMemberPage=page;renderMemberTablePage();};

window.fetchMembers=async function(){const{data,error}=await supabaseClient.from('members').select('*').order('created_at',{ascending:false}).limit(2000);if(error)return;globalMembers=data;let bSet=new Set();globalMembers.forEach(m=>{if(m.batch)bSet.add(m.batch);});let bHtml=`<option value="all">기수 전체</option>`+Array.from(bSet).sort((a,b)=>parseInt(String(a).replace(/[^0-9]/g,'')||0)-parseInt(String(b).replace(/[^0-9]/g,'')||0)).map(b=>`<option value="${b}">${b}</option>`).join("");if($("memberBatchFilter"))$("memberBatchFilter").innerHTML=bHtml;window.searchMembers();}

window.searchMembers=function(){const query=$("memberSearch")?$("memberSearch").value.trim().toLowerCase():"";const statusFilter=$("memberStatusFilter")?$("memberStatusFilter").value:'all';const batchFilter=$("memberBatchFilter")?$("memberBatchFilter").value:'all';const today=new Date();today.setHours(0,0,0,0);let filtered=globalMembers.filter(m=>{let isExpired=true;let isPaused=m.status==='활동 일시정지';if(m.end_date&&m.end_date.length===10){let endD=new Date(m.end_date);endD.setHours(0,0,0,0);if(endD>=today)isExpired=false;}let statusText=m.status||'활동 중';if(statusText==='패널티 정지')statusText='패널티 정지';else if(statusText==='활동 일시정지')statusText='활동 일시정지';else if(isExpired)statusText='활동 종료';let matchQuery=`${m.batch||''} ${m.name||''} ${m.phone||''} ${statusText}`.toLowerCase().includes(query);let matchBatch=batchFilter==='all'||m.batch===batchFilter;let matchStatus=false;if(statusFilter==='all')matchStatus=true;else if(statusFilter==='활동 중 (전체)')matchStatus=['활동 중','연장 활동 중','단일권 이용'].includes(statusText);else matchStatus=statusText===statusFilter;return matchQuery&&matchStatus&&matchBatch;});filtered.sort((a,b)=>{let batchA=a.batch||'';let batchB=b.batch||'';if(batchA!==batchB)return parseInt(String(batchB).replace(/[^0-9]/g,'')||0)-parseInt(String(batchA).replace(/[^0-9]/g,'')||0);return String(a.name||'').localeCompare(String(b.name||''));});currentFilteredMembers=filtered;window.currentFilteredMembers=filtered;currentMemberPage=1;let filterWrap=document.querySelector('#page-members .filter-wrap');if(filterWrap&&!document.getElementById('memberPerPage')){let selectHtml=`<select id="memberPerPage" class="filter-sel" style="margin-left:8px;width:auto;" onchange="window.changeMemberPerPage(this.value)"><option value="10">10명씩 보기</option><option value="50" selected>50명씩 보기</option><option value="100">100명씩 보기</option><option value="all">전체 보기</option></select>`;filterWrap.insertAdjacentHTML('beforeend',selectHtml);}renderMemberTablePage();}

window.renderMemberTablePage=function(){
    if(!$("memberTableBody"))return;
    const tbody=$("memberTableBody");
    const _savedCheckboxes = (typeof window.preserveCheckboxState === 'function') ? window.preserveCheckboxState() : null;
    tbody.innerHTML='';
    let data=currentFilteredMembers;
    if(data.length===0){tbody.innerHTML=`<tr><td colspan="9" class="empty-state">내역이 없습니다.</td></tr>`;updatePaginationUI(0);try{if(_savedCheckboxes)window.restoreCheckboxState(_savedCheckboxes);}catch(e){}return;}
    let memTable=tbody.closest('table');if(memTable){let theadTr=memTable.querySelector('thead tr');if(theadTr){let firstTh=theadTr.querySelector('th');if(firstTh&&!firstTh.querySelector('input[type="checkbox"]')&&firstTh.innerText.includes('등록일')){let chkTh=document.createElement('th');chkTh.style.width='48px';chkTh.style.textAlign='center';chkTh.innerHTML='<input type="checkbox" onchange="window.toggleAll(this,\'chk-mem\')">';theadTr.insertBefore(chkTh,firstTh);}}}
    let startIndex=(currentMemberPage-1)*memberItemsPerPage;
    let pageData=data.slice(startIndex,startIndex+memberItemsPerPage);
    const today=new Date();today.setHours(0,0,0,0);
    let now=new Date();let monthPrefix=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
    let getCancelCount=(memberPhone)=>{let count=0;gRes.forEach(r=>{if(window.samePhone(r.phone,memberPhone)&&r.status==='당일 취소'&&String(r.res_date||r.created_at).startsWith(monthPrefix))count++;});gTrn.forEach(t=>{if(window.samePhone(t.phone,memberPhone)&&t.status==='당일 취소'){let dStr=String(t.content||'').split(' || ')[0]||String(t.created_at);if(dStr.startsWith(monthPrefix))count++;}});return count;};
    pageData.forEach(row=>{let yy='',mm='',dd='';let isExpired=true;let isPaused=row.status==='활동 일시정지';if(row.end_date&&row.end_date.length===10){[yy,mm,dd]=row.end_date.split('-');let endD=new Date(row.end_date);endD.setHours(0,0,0,0);if(endD>=today)isExpired=false;}if(isExpired&&!isPaused&&row.status!=='패널티 정지'){yy='';mm='';dd='';}let currentStat=row.status||'활동 중';let statusBadge="";if(currentStat==='패널티 정지')statusBadge=`<span class="status-badge badge-red">패널티 정지</span>`;else if(isPaused)statusBadge=`<span class="status-badge badge-gray">일시정지</span>`;else if(isExpired)statusBadge=`<span class="status-badge badge-ended" style="background:#fff0f0;color:var(--error);">활동 종료</span>`;else statusBadge=`<span class="status-badge badge-active" style="background:#e8f5e9;color:var(--success);">${currentStat}</span>`;
let yearOpts='<option value="">년도</option>';for(let i=2024;i<=2030;i++)yearOpts+=`<option value="${i}" ${yy==i?'selected':''}>${i}년</option>`;let monthOpts='<option value="">월</option>';for(let i=1;i<=12;i++){let val=String(i).padStart(2,'0');monthOpts+=`<option value="${val}" ${mm==val?'selected':''}>${i}월</option>`;}let dayOpts='<option value="">일</option>';for(let i=1;i<=31;i++){let val=String(i).padStart(2,'0');dayOpts+=`<option value="${val}" ${dd==val?'selected':''}>${i}일</option>`;}
let optionHtml=`<div class="action-btns mem-action-row"><select class="date-sel option-btn" onchange="window.handleMemberOption('${row.id}','${row.batch||'미정'}','${window.escapeHtml(row.name)}','${window.escapeHtml(row.phone)}','${row.end_date||''}',this)"><option value="">옵션 선택</option><option value="1">1개월 연장</option><option value="3">3개월 연장</option><option value="6">6개월 연장</option><option value="bonus">보너스 1개월</option><option value="day">당일권 추가</option><option value="pause">활동 일시정지</option><option value="resume">활동 재개 (자동 연장)</option><option value="release">패널티 적용/해제</option></select><button class="btn-outline btn-sm" style="flex-shrink:0;height:32px;" onclick="event.stopPropagation();window.openHistoryModal('${window.escapeHtml(row.phone)}','${window.escapeHtml(row.name)}')">내역</button></div>`;
let dateActionHtml=`<div class="date-inputs mem-action-row"><select class="date-sel year">${yearOpts}</select><select class="date-sel month">${monthOpts}</select><select class="date-sel day">${dayOpts}</select><button class="btn-outline btn-sm apply-date-btn" style="flex-shrink:0;height:32px;padding:0 12px;border-color:var(--primary);color:var(--primary);font-weight:700;" onclick="window.applyMemberDate('${row.id}',this)">적용</button></div>`;
let cCount=getCancelCount(row.phone);let warnHtml=cCount>=4?`<span style="background:var(--error);color:#fff;font-size:11px;padding:2px 6px;border-radius:4px;margin-left:6px;font-weight:700;vertical-align:middle;">경고</span>`:'';
let displayPhone = window.normalizePhone(row.phone) || row.phone || '-';
let nameHtml=`<strong style="color:var(--text-display);cursor:pointer;" onclick="window.openCrmModalFromPhone('${row.phone}')" title="이전 설문/상담 내역 보기">${window.escapeHtml(row.name)||'-'}</strong>${warnHtml}`;
let mPreview=`<td class="m-preview has-checkbox" onclick="this.closest('tr').classList.toggle('expanded')"><div class="m-prev-top"><span class="m-prev-date">${formatDtWithDow(row.created_at)}</span>${statusBadge}</div><div class="m-prev-title" style="font-size:16px;">[${row.batch||'-'}] ${window.escapeHtml(row.name)||'-'} <span style="font-size:13px;font-weight:500;color:var(--text-secondary);margin-left:4px;">(${window.escapeHtml(displayPhone)})</span></div><span class="m-toggle-hint">상세 정보 보기 ▼</span></td>`;
const tr=document.createElement('tr');tr.innerHTML=`${mPreview}<td data-label="선택" class="tc"><input type="checkbox" class="chk-mem" value="${row.id}"></td><td data-label="등록일">${formatDt(row.created_at)}</td><td data-label="상태" class="tc">${statusBadge}</td><td data-label="기수"><strong>${row.batch||'-'}</strong></td><td data-label="성함">${nameHtml}</td><td data-label="연락처">${window.escapeHtml(displayPhone)}</td><td data-label="종료일 관리" class="col-action"><div class="date-select-group mem-action-wrap" data-id="${row.id}">${optionHtml}${dateActionHtml}</div></td>`;tbody.appendChild(tr);});
    updatePaginationUI(data.length);
    try{if(_savedCheckboxes && typeof window.restoreCheckboxState === 'function') window.restoreCheckboxState(_savedCheckboxes);}catch(e){console.warn('member checkbox restore failed',e);}
}
function updatePaginationUI(totalItems){let paginationWrap=document.getElementById('memberPaginationWrap');if(!paginationWrap){let tableWrap=document.querySelector('#page-members .table-wrap');if(tableWrap){paginationWrap=document.createElement('div');paginationWrap.id='memberPaginationWrap';paginationWrap.style.cssText='display:flex;justify-content:center;align-items:center;gap:8px;padding:20px 0;';tableWrap.parentNode.insertBefore(paginationWrap,tableWrap.nextSibling);}}if(!paginationWrap)return;if(totalItems===0||memberItemsPerPage>totalItems){paginationWrap.innerHTML='';return;}let totalPages=Math.ceil(totalItems/memberItemsPerPage);let html='';let startPage=Math.max(1,currentMemberPage-2);let endPage=Math.min(totalPages,startPage+4);if(endPage-startPage<4)startPage=Math.max(1,endPage-4);if(currentMemberPage>1)html+=`<button class="pagination-btn" onclick="window.changeMemberPage(${currentMemberPage-1})">이전</button>`;for(let i=startPage;i<=endPage;i++){html+=`<button class="pagination-btn ${i===currentMemberPage?'active':''}" onclick="window.changeMemberPage(${i})">${i}</button>`;}if(currentMemberPage<totalPages)html+=`<button class="pagination-btn" onclick="window.changeMemberPage(${currentMemberPage+1})">다음</button>`;paginationWrap.innerHTML=html;}
window.applyMemberDate=async function(id,btn){const group=btn.closest('.date-select-group');const y=group.querySelector('.year').value,m=group.querySelector('.month').value,d=group.querySelector('.day').value;if(y&&m&&d){let originalText=btn.innerText;btn.disabled=true;btn.innerText="...";await window.updateMemberEndDate(id,`${y}-${m}-${d}`);btn.disabled=false;btn.innerText=originalText;window.fetchMembers();}else{showToast("년/월/일을 모두 선택해주세요.");}};
window.handleMemberOption=function(id,batch,name,phone,currentEndDate,selectEl){const opt=selectEl.value;const optText=selectEl.options[selectEl.selectedIndex].text;selectEl.value='';if(!opt)return;let confirmMsg="";let baseDateForUpdate=new Date();baseDateForUpdate.setHours(0,0,0,0);if(currentEndDate&&currentEndDate.length===10){let endD=new Date(currentEndDate);endD.setHours(0,0,0,0);if(endD>=baseDateForUpdate){baseDateForUpdate=endD;}}if(opt==='release'){const m=globalMembers.find(x=>String(x.id)===String(id));let newStat=m.status==='패널티 정지'?'활동 중':'패널티 정지';confirmMsg=`상태를 <b>[${newStat}]</b> 상태로 전환하시겠습니까?`;}else if(opt==='pause'){confirmMsg=`활동을 <b>일시정지</b>하시겠습니까?<br><span style="font-size:12px;color:var(--text-secondary);font-weight:500;">(재개 시 정지된 기간만큼 종료일이 연장됩니다.)</span>`;}else if(opt==='resume'){confirmMsg=`활동을 <b>재개</b>하시겠습니까?<br><span style="font-size:12px;color:var(--text-secondary);font-weight:500;">(이전 정지 기간을 자동 계산하여 연장합니다.)</span>`;}else{let baseDate=new Date();baseDate.setHours(0,0,0,0);let isActive=false;if(currentEndDate&&currentEndDate.length===10){let endD=new Date(currentEndDate);endD.setHours(0,0,0,0);if(endD>=baseDate)isActive=true;}if(isActive){confirmMsg=`이어서 <b>${optText}</b>을 적용하시겠습니까?`;}else{confirmMsg=`오늘 날짜를 기준으로<br><b>${optText}</b>을 새롭게 적용하시겠습니까?`;}}let statText="";if(opt==='release'||opt==='pause'||opt==='resume'){let cur=opt==='resume'?'일시정지':(opt==='release'?'확인요망':'활동 중');statText=`현재 상태: <b>${cur}</b>`;}else{if(currentEndDate&&new Date(currentEndDate)>=new Date().setHours(0,0,0,0)){statText=`현재 활동 종료일: <b>${currentEndDate}</b>`;}else{statText=`현재 활동 종료 상태입니다.`;}}pendingOptionData={id,name,phone,opt,optText,baseDate:baseDateForUpdate,currentEndDate};
window.openCustomConfirm(`[${batch||'미정'}] ${name} 님`,statText,confirmMsg,async()=>{if(opt==='release'){const m=globalMembers.find(x=>String(x.id)===String(id));let newStat=m.status==='패널티 정지'?'활동 중':'패널티 정지';m.status=newStat;window.searchMembers();await supabaseClient.from('members').update({status:newStat}).eq('id',id);showToast(`상태가 [${newStat}] 상태로 변경되었습니다.`);return;}if(opt==='pause'){const m=globalMembers.find(x=>String(x.id)===String(id));m.status='활동 일시정지';window.searchMembers();await supabaseClient.from('members').update({status:'활동 일시정지'}).eq('id',id);await supabaseClient.from('member_history').insert([{member_name:name,member_phone:phone,action_detail:'활동 일시정지 시작',amount:'-',performed_by:currentAdminEmail||'unknown'}]);showToast("활동이 일시정지되었습니다.");return;}if(opt==='resume'){const{data:hist}=await supabaseClient.from('member_history').select('*').eq('member_phone',phone).like('action_detail','활동 일시정지 시작%').order('created_at',{ascending:false}).limit(1);let extendDays=0;if(hist&&hist.length>0){let pauseDate=new Date(hist[0].created_at);pauseDate.setHours(0,0,0,0);let todayDate=new Date();todayDate.setHours(0,0,0,0);extendDays=Math.floor((todayDate-pauseDate)/(1000*60*60*24));}if(extendDays<0)extendDays=0;let endD=new Date(currentEndDate);endD.setDate(endD.getDate()+extendDays);let newEndDate=`${endD.getFullYear()}-${String(endD.getMonth()+1).padStart(2,'0')}-${String(endD.getDate()).padStart(2,'0')}`;const m=globalMembers.find(x=>String(x.id)===String(id));m.status='연장 활동 중';m.end_date=newEndDate;window.searchMembers();await supabaseClient.from('members').update({status:'연장 활동 중',end_date:newEndDate}).eq('id',id);await supabaseClient.from('member_history').insert([{member_name:name,member_phone:phone,action_detail:`활동 재개 (정지일수: ${extendDays}일 자동 연장)`,amount:'-',performed_by:currentAdminEmail||'unknown'}]);showToast(`재개 완료. ${extendDays}일이 연장되었습니다.`);return;}
let amountStr='0원';let targetStatus='연장 활동 중';function _addMonths(d,n){let orig=d.getDate();d.setMonth(d.getMonth()+n);if(d.getDate()!==orig)d.setDate(0);}if(opt==='1'){_addMonths(baseDateForUpdate,1);amountStr='220,000원';}else if(opt==='3'){_addMonths(baseDateForUpdate,3);amountStr='550,000원';}else if(opt==='6'){_addMonths(baseDateForUpdate,6);amountStr='1,100,000원';}else if(opt==='bonus'){_addMonths(baseDateForUpdate,1);amountStr='무료 제공';}else if(opt==='day'){baseDateForUpdate.setDate(baseDateForUpdate.getDate()+1);amountStr='별도 안내';targetStatus='단일권 이용';}
let yyyy=baseDateForUpdate.getFullYear(),mm=String(baseDateForUpdate.getMonth()+1).padStart(2,'0'),dd=String(baseDateForUpdate.getDate()).padStart(2,'0');const newDateStr=`${yyyy}-${mm}-${dd}`;const m=globalMembers.find(x=>String(x.id)===String(id));m.end_date=newDateStr;m.status=targetStatus;window.searchMembers();await supabaseClient.from('members').update({status:targetStatus,end_date:newDateStr}).eq('id',id);await supabaseClient.from('member_history').insert([{member_name:name,member_phone:phone,action_detail:optText,amount:amountStr,performed_by:currentAdminEmail||'unknown'}]);showToast("업데이트 되었습니다.");});}
window.updateMemberEndDate=async function(id,dateStr){const{error}=await supabaseClient.from('members').update({end_date:dateStr}).eq('id',id);if(error)showToast("날짜 변경에 실패했습니다.");else showToast("종료일이 업데이트 되었습니다.");}
window.deleteHistory=async function(id,phone,name,action_detail){window.openCustomConfirm("내역 삭제",null,`해당 내역을 완전히 삭제하시겠습니까?<br><span style='font-size:12px;color:var(--text-secondary);'>(삭제 시, 늘어난 종료일이 자동으로 계산되어 복구됩니다.)</span>`,async()=>{await supabaseClient.from('member_history').delete().eq('id',id);const m=globalMembers.find(x=>window.samePhone(x.phone,phone));if(m&&m.end_date){let d=new Date(m.end_date);let isChanged=false;function _subM(dt,n){let orig=dt.getDate();dt.setMonth(dt.getMonth()-n);if(dt.getDate()!==orig)dt.setDate(0);}if(action_detail.includes('1개월 연장')||action_detail.includes('보너스 1개월')){_subM(d,1);isChanged=true;}else if(action_detail.includes('3개월 연장')){_subM(d,3);isChanged=true;}else if(action_detail.includes('6개월 연장')){_subM(d,6);isChanged=true;}else if(action_detail.includes('당일권 추가')){d.setDate(d.getDate()-1);isChanged=true;}if(isChanged){let newEndDate=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;m.end_date=newEndDate;await supabaseClient.from('members').update({end_date:newEndDate}).eq('phone',phone);}}showToast("내역이 삭제되고 종료일이 복구되었습니다.");window.searchMembers();window.openHistoryModal(phone,name);});};
window.openHistoryModal=async function(phone,name){if(!$("historyModalTitle"))return;$("historyModalTitle").innerText=`${name} 님의 내역`;const modal=$("historyModal");modal.classList.add('show');const body=$("historyModalBody");body.innerHTML='<div class="empty-state">내역을 불러오는 중입니다.</div>';const{data,error}=await supabaseClient.from('member_history').select('*').eq('member_phone',phone).order('created_at',{ascending:false});if(error||!data||data.length===0){body.innerHTML='<div class="empty-state" style="color:var(--text-tertiary);">결제/연장 내역이 없습니다.</div>';return;}body.innerHTML='<div style="display:flex;flex-direction:column;gap:12px;padding:24px 0;">'+data.map(item=>`<div style="background:#f9fafb;padding:16px;border-radius:12px;border:1px solid var(--border-strong);display:flex;justify-content:space-between;align-items:center;"><div><div style="font-weight:700;margin-bottom:4px;color:var(--text-display);">${item.action_detail}</div><div style="font-size:13px;color:var(--text-secondary);">${formatDt(item.created_at)}${item.performed_by?` · ${window.getAdminName(item.performed_by)}`:''}</div></div><div style="display:flex;align-items:center;gap:12px;"><div style="font-weight:700;color:var(--primary);">${item.amount||''}</div><button class="btn-outline btn-sm" style="color:var(--error);border-color:var(--border-strong);" onclick="event.stopPropagation();window.deleteHistory('${item.id}','${phone}','${name}','${item.action_detail}')">삭제</button></div></div>`).join('')+'</div>';}
window.closeHistoryModal=function(){if($("historyModal"))$("historyModal").classList.remove('show');}
window.downloadAttendanceExcel=function(){if(!window.currentFilteredTrn||window.currentFilteredTrn.length===0){showToast('출력할 데이터가 없습니다.');return;}let csv="\uFEFF기수,성함,연락처,참여 회차,상태,수업 정보\n";window.currentFilteredTrn.forEach(t=>{let cInfo=String(t.content||'').split(' || ');let classInfo=cInfo.length>=5?`[${cInfo[0]}] ${cInfo[2]} ${cInfo[4]}`:t.content;csv+=`"${t.batch||'-'}","${String(t.name).replace(/"/g,'""')}","${String(t.phone).replace(/"/g,'""')}","${t._attendCount||1}회차","${t.status}","${String(classInfo).replace(/"/g,'""')}"\n`;});const blob=new Blob([csv],{type:'text/csv;charset=utf-8;'});const link=document.createElement('a');link.href=URL.createObjectURL(blob);link.download=`위커피_참가자리스트_${new Date().toISOString().slice(0,10)}.csv`;link.click();};

window.downloadExcel = function(type) {
    try {
        if(type === 'applications' && typeof isInsightView !== 'undefined' && isInsightView) {
            const d = window.currentInsightData || {};
            let csv = "\uFEFF카테고리,세부 항목,수치,비고\n";
            csv += `전체 요약,총 신청 건수,${d.total||0}건,-\n`;csv += `전체 요약,최종 가입 완료,${d.joined||0}건,(전환율 ${d.total>0?Math.round(d.joined/d.total*100):0}%)\n`;csv += `전체 요약,실질 이탈률,${d.realDropoutRate||0}%,(이탈자 ${d.dropoutCount||0}명)\n`;csv += `유입 채널,인스타그램 총 유입,${d.instaCount||0}건,-\n`;csv += `인스타 상세,팔로워 유입,${d.instaFollow||0}건,-\n`;csv += `인스타 상세,비팔로워 유입,${d.instaNonFollow||0}건,-\n`;csv += `유입 채널,모집 광고/스폰서드 유입,${d.adCount||0}건,-\n`;csv += `광고 리드타임,단기 유입 (1개월 이내),${d.leadTime1M||0}건,-\n`;csv += `광고 리드타임,장기 유입 (3개월 이상),${d.leadTime3M||0}건,-\n`;
            if(d.knownDurData&&d.knownDurData.length>0){csv+=`\n인지 기간 분포,기간,건수,비고\n`;d.knownDurData.forEach(k=>{csv+=`인지 기간,${k[0]},${k[1]}건,-\n`;});}
            if(d.counselorMap){csv+=`\n상담자별 가입/이탈,상담자,건수,비고\n`;for(let cn in d.counselorMap){let cd=d.counselorMap[cn];if(cn==='미지정')continue;let rate=cd.total>0?Math.round(cd.joined/cd.total*100):0;csv+=`[${cn}],담당 총 ${cd.total}명,${cd.joined}명 가입 / ${cd.dropout}명 이탈,(가입률 ${rate}%)\n`;}}
            if(d.channelMap){csv+=`\n상세 채널별 트래킹,상세 내역,건수,비고\n`;for(let ch in d.channelMap){let chData=d.channelMap[ch];csv+=`[${ch}],(총 ${chData.total}건),-,-\n`;for(let det in chData.details){let detSafe=String(det).replace(/"/g,'""');csv+=`ㄴ,${detSafe},${chData.details[det]}건,-\n`;}}}
            const blob=new Blob([csv],{type:'text/csv;charset=utf-8;'});const link=document.createElement('a');link.href=URL.createObjectURL(blob);link.download=`위커피_인사이트_마케팅_보고서_${new Date().toISOString().slice(0,10)}.csv`;link.click();return;
        }
        let data=[],headers=[],filename="";
        if(type==='applications'){if(Array.isArray(window.currentFilteredApps)){data=window.currentFilteredApps;}else{const selected=$("batchFilterApp")?$("batchFilterApp").value:'all';data=(selected==='all')?globalApps:globalApps.filter(d=>d.desired_batch===selected);}filename="가입신청";headers=['신청일','기수','성함','연락처','관심분야','관심도','유입경로','인지 기간','진행상황','가입여부','상담일시','담당자'];}
        else if(type==='members'){const filterEmpty=(!$("memberSearch")||!$("memberSearch").value.trim())&&(!$("memberStatusFilter")||$("memberStatusFilter").value==='all')&&(!$("memberBatchFilter")||$("memberBatchFilter").value==='all');if(filterEmpty){data=globalMembers;}else{data=(Array.isArray(window.currentFilteredMembers)?window.currentFilteredMembers:currentFilteredMembers)||[];}data.forEach(m=>m.batch=m.batch||'미정');filename="멤버리스트";headers=['등록일','상태','기수','성함','연락처','활동종료일'];}
        else if(type==='reservations'){data=Array.isArray(window.currentFilteredRes)?window.currentFilteredRes:gRes;filename="예약현황";headers=['접수일','기수','성함','연락처','예약날짜','예약시간','센터','장비','상태','취소사유'];}
        else if(type==='trainings'){data=Array.isArray(window.currentFilteredTrn)?window.currentFilteredTrn:gTrn;filename="수업훈련";headers=['신청일','기수','성함','연락처','콘텐츠','상태','취소사유'];}
        else if(type==='orders'){const now=new Date();const qOrd=($("searchOrd")?.value||"").toLowerCase();const vOrd=$("ordVendorFilter")?.value||"전체";const isOrdFilter=$("filterPendingOrd")?.checked;data=gOrd.filter(o=>{const matchCenter=(currentGlobalCenter==='전체'||o.center===currentGlobalCenter);const matchQ=`${o.name} ${o.phone} ${o.vendor} ${o.item_name} ${o.center||''}`.toLowerCase().includes(qOrd);const matchV=(vOrd==='전체')?true:o.vendor===vOrd;const matchS=isOrdFilter?(o.status==='주문 접수'):true;const notExpired=isOrdFilter?true:(typeof window.isOrderExpired==='function'?!window.isOrderExpired(o,now):true);return matchCenter&&matchQ&&matchV&&matchS&&notExpired;});filename="생두주문";headers=['주문일','주문번호','기수','성함','연락처','생두사','상품명','수량','총금액','상태'];}
        if(!data||data.length===0){if(typeof showToast==='function')showToast('다운로드할 데이터가 없습니다.');return;}
        let csvContent='\uFEFF'+headers.join(',')+'\n';
        data.forEach(d=>{let row=[];const phoneOut=window.normalizePhone(d.phone)||d.phone||'';if(type==='applications')row=[formatDt(d.created_at),d.desired_batch,d.name,phoneOut,d.interest_area,window.mapInterestLevel(d.interest_level),d.acquisition_channel,d.known_duration,d.status,d.join_status,d.call_time,d.counselor_name];else if(type==='members')row=[formatDt(d.created_at),d.status,d.batch,d.name,phoneOut,d.end_date];else if(type==='reservations')row=[formatDt(d.created_at),d.batch,d.name,phoneOut,d.res_date,d.res_time,d.center,d.space_equip,d.status,d.cancel_reason];else if(type==='trainings')row=[formatDt(d.created_at),d.batch,d.name,phoneOut,d.content,d.status,d.cancel_reason];else if(type==='orders')row=[formatDt(d.created_at),d.id,d.batch,d.name,phoneOut,d.vendor,d.item_name,d.quantity,d.total_price,d.status];csvContent+=row.map(item=>{let text=String(item==null?'':item);text=text.replace(/"/g,'""');text=text.replace(/\n/g,' ');return `"${text}"`;}).join(',')+'\n';});
        const blob=new Blob([csvContent],{type:'text/csv;charset=utf-8;'});const link=document.createElement('a');link.href=URL.createObjectURL(blob);link.download=`${filename}_${new Date().toISOString().slice(0,10)}.csv`;document.body.appendChild(link);link.click();document.body.removeChild(link);
    }catch(err){console.error("Excel Download Error: ",err);if(typeof showToast==='function')showToast('엑셀 다운로드 중 오류가 발생했습니다.');}
};

window.copySurveyTemplate=function(appId){
    let app=globalApps.find(a=>String(a.id)===String(appId));if(!app)return showToast('신청 정보를 찾을 수 없습니다.');
    let surveyUrl=`https://www.wecoffee.co.kr/survey?uid=${app.id}&name=${encodeURIComponent(app.name||'')}`;
    let scheduleStr='미정';
    if(app.call_time&&app.call_time!=='null'){let ct=String(app.call_time).split(' ');let dateNice='',timeNice='';if(ct[0]&&ct[0].includes('-')){let dp=ct[0].split('-');let dObj=new Date(parseInt(dp[0]),parseInt(dp[1])-1,parseInt(dp[2]));let dow=['일','월','화','수','목','금','토'][dObj.getDay()];dateNice=`${parseInt(dp[1])}월 ${parseInt(dp[2])}일(${dow})`;}if(ct[1]&&ct[1].includes(':')){let tp=ct[1].split(':');let h=parseInt(tp[0]),m=tp[1]||'00';let ap=h>=12?'오후':'오전';let h12=h%12||12;timeNice=`${ap} ${h12}:${m}`;}if(dateNice&&timeNice)scheduleStr=`${dateNice}, ${timeNice}`;else if(dateNice)scheduleStr=dateNice;else scheduleStr=app.call_time;}
    let msg=`안녕하세요 ${app?.name||''}님, 통화했던 위커피 운영팀입니다 :)\n상담일정은 ${scheduleStr} 입니다.\n\n오시기 전에 아래 링크의 설문을 작성해주시길 부탁드립니다.\n\n[Wecoffee 주소]\n마포 센터: 서울 마포구 월드컵북로 41 301호\n광진 센터: 서울 광진구 능동로36길 18 3층\n\n*센터 내 지정 주차 공간은 마련되어 있지 않습니다.\n차량으로 방문하실 경우 인근의 공영 주차장 이용을 부탁드립니다.\n\n[상담 전 작성설문]\n${surveyUrl}\n\n[상담 전 홈페이지 내용을 꼼꼼히 숙지해주세요]\nwww.wecoffee.co.kr`;
    window.copyTxt(msg,'상담 안내 메시지가 복사되었습니다.');
};

window.saveAdminNote=async function(){if(!$("crmAppId"))return;const id=$("crmAppId").value;const app=globalApps.find(a=>String(a.id)===String(id));if(!app){showToast("신청 정보를 찾을 수 없습니다.");return;}const title=$("crmNoteTitle")?$("crmNoteTitle").value.trim():"";const content=$("crmNoteInput")?$("crmNoteInput").value.trim():"";if(!title&&!content)return showToast("내용을 입력해주세요.");const newNote=`${title}:::${content}`;let updatedMemo=app.admin_memo?app.admin_memo+'|||'+newNote:newNote;const originalMemo=app.admin_memo;app.admin_memo=updatedMemo;window.renderCrmInner(id,isCrmReadOnly);const{error}=await supabaseClient.from('applications').update({admin_memo:updatedMemo}).eq('id',id);if(error){app.admin_memo=originalMemo;window.renderCrmInner(id,isCrmReadOnly);showToast("기록 추가에 실패했습니다.");console.error(error);}else{showToast("상담 기록이 추가되었습니다.");}}

window.openCrmModalFromPhone=async function(phone){
    if(!phone||phone==='-')return showToast("연락처 정보가 없어 설문 내역을 찾을 수 없습니다.");
    const targetDigits=String(phone).replace(/\D/g,'');
    let app=globalApps.find(a=>window.samePhone(a.phone,phone));
    if(app){window.openCrmModal(app.id,true);}else{
        showToast("내역을 불러오는 중입니다...");
        const last4=targetDigits.slice(-4);
        if(last4.length<4){showToast("연락처 정보가 충분하지 않아 검색할 수 없습니다.");return;}
        const{data,error}=await supabaseClient.from('applications').select('*').ilike('phone',`%${last4}`).limit(50);
        if(!error&&data){let matched=data.find(a=>window.samePhone(a.phone,phone));if(matched){if(!globalApps.find(a=>String(a.id)===String(matched.id)))globalApps.push(matched);window.openCrmModal(matched.id,true);return;}}
        showToast("해당 멤버의 가입 신청/설문 내역을 찾을 수 없습니다.");
    }
}


// ── 발주 요약 (기존 기능 그대로 — 수량/품목 중심) ──
window.showOrderSummary=function(){let qOrd=($("searchOrd")?.value||"").toLowerCase();let vOrd=$("ordVendorFilter")?.value||"전체";let checkedBoxes=document.querySelectorAll('.chk-ord:checked, input[type="checkbox"][class*="chk-ord-dyn-"]:checked');let checkedIds=Array.from(checkedBoxes).map(cb=>String(cb.value)).filter(val=>val!=="on");let pendingOrders=gOrd.filter(o=>{if(checkedIds.length>0){if(o.status!=='주문 접수')return false;return checkedIds.includes(String(o.id));}else{if(o.status!=='주문 접수')return false;let matchCenter=(currentGlobalCenter==='전체'||o.center===currentGlobalCenter);let matchQ=`${o.name} ${o.phone} ${o.vendor} ${o.item_name} ${o.center||''}`.toLowerCase().includes(qOrd);let matchV=vOrd==='전체'?true:o.vendor===vOrd;return matchCenter&&matchQ&&matchV;}});if(pendingOrders.length===0){$("summaryModalBody").innerHTML='<div class="empty-state" style="padding:80px 0;">요약할 정상 발주(주문 접수) 내역이 없습니다.</div>';}else{window.currentMemberInfoMap={};pendingOrders.forEach(o=>{if(o.name&&o.name!=='이름없음'&&!window.currentMemberInfoMap[o.name])window.currentMemberInfoMap[o.name]={phone:o.phone||'-',batch:String(o.batch||'-')};});let grouped={};pendingOrders.forEach(o=>{let center=o.center||'미지정';let cNm=o.item_name;let targetDayStr=window.formatDeliveryDateFull(o.delivery_date);let bigKey=`[${targetDayStr} 발주] ${center}`;let vendor=o.vendor||'기타 생두사';let m=String(cNm).match(/(.+) \[(?:희망:\s*)?(\d+)[\/\.](\d+)\s*\((월|화|수|목|금|토|일)\).*?\]/);if(m)cNm=m[1].trim();else{let oM=String(cNm).match(/(.+) \[(.*?)\]/);if(oM)cNm=oM[1].trim();}if(!grouped[bigKey])grouped[bigKey]={};if(!grouped[bigKey][vendor])grouped[bigKey][vendor]={totalGrams:0,items:{}};if(!grouped[bigKey][vendor].items[cNm])grouped[bigKey][vendor].items[cNm]={totalGrams:0,orderers:[]};let rawQty=String(o.quantity||'0').trim().toLowerCase();let numMatch=rawQty.match(/[0-9.]+/);let numVal=numMatch?parseFloat(numMatch[0]):0;let grams=rawQty.includes('kg')?numVal*1000:numVal;grouped[bigKey][vendor].totalGrams+=grams;grouped[bigKey][vendor].items[cNm].totalGrams+=grams;let safePhone=(!o.phone||String(o.phone).trim()==='undefined')?'-':o.phone;let safeName=(!o.name||String(o.name).trim()==='undefined')?'이름없음':o.name;let safeBatch=(!o.batch||String(o.batch).trim()==='undefined')?'-':String(o.batch);grouped[bigKey][vendor].items[cNm].orderers.push({batch:safeBatch,name:safeName,phone:safePhone,rawQty:o.quantity||'0'});});let html=`<div style="display:flex;flex-direction:column;gap:0;width:100%;min-width:0;">`;let sortedBigKeys=Object.keys(grouped).sort();sortedBigKeys.forEach(bigKey=>{html+=`<div style="font-size:18px;font-weight:900;color:var(--text-display);margin-top:32px;padding-bottom:12px;border-bottom:3px solid var(--text-display);letter-spacing:-0.5px;">${bigKey}</div>`;let sortedVendors=Object.keys(grouped[bigKey]).sort();sortedVendors.forEach(vendor=>{let vData=grouped[bigKey][vendor];html+=`<div style="margin-top:20px;font-size:15px;font-weight:800;color:var(--primary);padding-left:4px;">${window.escapeHtml(vendor)}</div>`;let sortedItems=Object.keys(vData.items).sort();sortedItems.forEach(item=>{let d=vData.items[item];let displayQty=d.totalGrams>=1000?(d.totalGrams%1000===0?(d.totalGrams/1000)+'kg':(d.totalGrams/1000)+'kg'):d.totalGrams+'g';displayQty=displayQty.replace('.0kg','kg');let ordererText=d.orderers.map(ord=>`[${ord.batch}] ${ord.name}(${ord.rawQty})`).join(', ');html+=`<div style="margin:12px 0;padding:16px;background:#fff;border:1px solid var(--border-strong);border-radius:12px;"><div style="display:flex;justify-content:space-between;align-items:flex-start;"><div style="flex:1;font-weight:700;font-size:15px;color:var(--text-display);line-height:1.4;">${window.escapeHtml(item)}</div><div style="font-size:20px;font-weight:900;color:var(--primary);margin-left:12px;white-space:nowrap;">${displayQty}</div></div><div style="font-size:12px;color:var(--text-tertiary);margin-top:8px;line-height:1.5;">주문자: ${window.escapeHtml(ordererText)}</div><div style="margin-top:10px;text-align:right;"><span style="font-size:11px;color:var(--primary);cursor:pointer;font-weight:800;border:1px solid var(--primary);padding:4px 10px;border-radius:6px;" onclick="window.copyTxt('${String(item).replace(/'/g,"\\'")}','상품명이 복사되었습니다.')">상품명 복사</span></div></div>`;});let vTotalQty=vData.totalGrams>=1000?(vData.totalGrams%1000===0?(vData.totalGrams/1000)+'kg':(vData.totalGrams/1000)+'kg'):vData.totalGrams+'g';vTotalQty=vTotalQty.replace('.0kg','kg');html+=`<div style="margin-bottom:24px;padding:16px;background:#f9fafb;border-radius:12px;display:flex;justify-content:space-between;align-items:center;border:1px solid #e5e8eb;"><span style="font-size:13px;font-weight:600;color:var(--text-secondary);">${window.escapeHtml(vendor)} 선택된 발주 총 수량</span><span style="font-size:18px;font-weight:900;color:var(--text-display);">${vTotalQty}</span></div>`;});});html+=`<div style="margin-top:32px;padding-top:24px;border-top:1px solid var(--border);display:flex;justify-content:center;gap:8px;"><button class="btn-outline" style="border-color:#32b06a;color:#32b06a;padding:12px 24px;font-size:14px;font-weight:700;" id="btn-send-sheet" onclick="window.sendToGoogleSheet()">구글 시트 전송</button></div></div>`;$("summaryModalBody").innerHTML=html;let exportData=[];pendingOrders.forEach(o=>{let dateGroup=window.formatDeliveryDateFull(o.delivery_date);let cNm=o.item_name;let m=String(cNm).match(/(.+) \[(?:희망:\s*)?(\d+)[\/\.](\d+)\s*\((월|화|수|목|금|토|일)\).*?\]/);if(m)cNm=m[1].trim();else{let oM=String(cNm).match(/(.+) \[(.*?)\]/);if(oM)cNm=oM[1].trim();}let safePhone=(!o.phone||String(o.phone).trim()==='undefined')?'-':o.phone;let safeName=(!o.name||String(o.name).trim()==='undefined')?'이름없음':o.name;let safeBatch=(!o.batch||String(o.batch).trim()==='undefined')?'-':String(o.batch);exportData.push({"등록 일시":formatDt(o.created_at),"발주 구분":dateGroup+" 발주","수령 센터":o.center||"미지정","생두사":o.vendor||"기타 생두사","상품명":cNm,"주문 수량":o.quantity||"0","결제 금액":"","기수":safeBatch,"성함":safeName,"연락처":safePhone});});exportData.sort((a,b)=>{if(a["발주 구분"]!==b["발주 구분"])return a["발주 구분"].localeCompare(b["발주 구분"]);if(a["수령 센터"]!==b["수령 센터"])return a["수령 센터"].localeCompare(b["수령 센터"]);if(a["생두사"]!==b["생두사"])return a["생두사"].localeCompare(b["생두사"]);return a["상품명"].localeCompare(b["상품명"]);});let separatedData=[];let prevCenter=null;exportData.forEach(row=>{if(prevCenter!==null&&prevCenter!==row["수령 센터"])separatedData.push({"등록 일시":"","발주 구분":"","수령 센터":"▼ "+row["수령 센터"]+" ▼","생두사":"","상품명":"","주문 수량":"","결제 금액":"","기수":"","성함":"","연락처":""});separatedData.push(row);prevCenter=row["수령 센터"];});window.currentSummaryData=separatedData;}const modal=$("summaryModal");if(modal)modal.classList.add('show');};
window.closeSummaryModal=function(){const modal=$("summaryModal");if(modal)modal.classList.remove('show');};
window.sendToGoogleSheet=async function(){if(!window.currentSummaryData||window.currentSummaryData.length===0){showToast('데이터 없음');return;}const GAS_URL='https://script.google.com/macros/s/AKfycbynlyczuJ5VWzfG5IFOstLzkRybv4Yvjgo9bxDHoUQlK84gAehaTuCNommlmrXuFsJK/exec';const btn=document.getElementById('btn-send-sheet');if(btn){btn.innerText='전송 중...';btn.disabled=true;}try{let uniqueMembers=[...new Set(window.currentSummaryData.map(d=>d['성함']))].filter(name=>name!=="이름없음"&&name!=="");let invoiceData=uniqueMembers.map(name=>{let info=window.currentMemberInfoMap&&window.currentMemberInfoMap[name]?window.currentMemberInfoMap[name]:{phone:'',batch:''};return{"등록 일시":"","발주 구분":"","수령 센터":"","생두사":"","상품명":`[${name}] 님 최종 청구 금액`,"주문 수량":"","결제 금액":`CALC_TOTAL:${name}`,"기수":info.batch,"성함":name,"연락처":info.phone};});let payload=[...window.currentSummaryData,{"등록 일시":"","발주 구분":"","수령 센터":"","생두사":"","상품명":"--- ▼ 멤버별 총 결제 금액 명세서 ▼ ---","주문 수량":"","결제 금액":"","기수":"","성함":"","연락처":""},...invoiceData];await fetch(GAS_URL,{method:'POST',mode:'no-cors',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});showToast("구글 시트에 명세서와 함께 전송되었습니다.");}catch(e){showToast("전송 오류");}finally{if(btn){btn.innerText='구글 시트 전송';btn.disabled=false;}}};

// ★ 수정: cancelAction → 관리자 취소 (사유 생략, 당일 취소 누적 미포함)
window.cancelAction=function(table,id){
    const cancelStatus='관리자 취소';
    window.openCustomConfirm("일정 취소",null,
        `이 일정을 <b>관리자 취소</b> 처리하시겠습니까?<div style="font-size:12px;color:var(--text-tertiary);margin-top:8px;">관리자 취소는 당일 취소 누적에 포함되지 않습니다.</div>`,
        async()=>{const{error}=await supabaseClient.from(table).update({status:cancelStatus}).eq('id',id);if(error)showToast("취소 처리 실패");else{showToast("관리자 취소 처리되었습니다.");window.fetchCenterData({force:true});}});
};

window.toggleAllDay=function(checkbox){let blkStart=$("blkStart");let blkEnd=$("blkEnd");if(checkbox.checked){if(blkStart){blkStart.value='00:00';blkStart.disabled=true;blkStart.style.opacity='0.4';}if(blkEnd){blkEnd.value='23:59';blkEnd.disabled=true;blkEnd.style.opacity='0.4';}}else{if(blkStart){blkStart.disabled=false;blkStart.style.opacity='1';if(blkStart.value==='00:00')blkStart.value='09:00';}if(blkEnd){blkEnd.disabled=false;blkEnd.style.opacity='1';if(blkEnd.value==='23:59')blkEnd.value='18:00';}}};
window.setupBlockModalControls=function(isEdit){
  let blkStartEl=$("blkStart");let blkEndEl=$("blkEnd");
  if(blkStartEl&&!document.getElementById('blkAllDayWrap')){let wrap=document.createElement('div');wrap.id='blkAllDayWrap';wrap.innerHTML=`<input type="checkbox" id="blkAllDay" onchange="window.toggleAllDay(this)"><label for="blkAllDay">하루 종일</label>`;let timeContainer=blkStartEl.parentNode;while(timeContainer&&blkEndEl&&!timeContainer.contains(blkEndEl)){timeContainer=timeContainer.parentNode;}if(timeContainer&&timeContainer.parentNode){timeContainer.parentNode.insertBefore(wrap,timeContainer);}else{blkStartEl.parentNode.insertBefore(wrap,blkStartEl);}}
  let allDayCb=document.getElementById('blkAllDay');
  if(allDayCb){allDayCb.checked=false;if(blkStartEl){blkStartEl.disabled=false;blkStartEl.style.opacity='1';}if(blkEndEl){blkEndEl.disabled=false;blkEndEl.style.opacity='1';}}
  let repTypeEl=$("blkRepeatType");
  if(repTypeEl){let repSection=repTypeEl.parentElement?.parentElement;if(repSection)repSection.style.display=isEdit?'none':'flex';if(!isEdit){repTypeEl.value='none';let repCountEl=$("blkRepeatCount");if(repCountEl)repCountEl.value='';}}
  if(!document.getElementById('blkBatchWrap')){let blkCapacityEl=$("blkCapacity");if(blkCapacityEl){let batchWrap=document.createElement('div');batchWrap.id='blkBatchWrap';batchWrap.style.cssText='margin-bottom:12px;';batchWrap.innerHTML=`<label class="input-label">대상 기수 <span style="font-size:11px;font-weight:500;color:var(--text-tertiary);">비워두면 전체 기수</span></label><input type="text" id="blkBatch" class="input-search" style="width:100%;box-sizing:border-box;" placeholder="예: 34기" onblur="let v=this.value.trim();if(v&&/^\\d+$/.test(v))this.value=v+'기';">`;let capParent=blkCapacityEl.parentElement;if(capParent&&capParent.parentNode)capParent.parentNode.insertBefore(batchWrap,capParent);}}
};
window.updateRepeatPreview=function(){let baseDateStr=$("blkDate")?$("blkDate").value:'';let repType=document.getElementById('blkRepeatType')?document.getElementById('blkRepeatType').value:'none';let repCount=parseInt(document.getElementById('blkRepeatCount')?document.getElementById('blkRepeatCount').value:'4')||4;let preview=document.getElementById('blkRepeatPreview');if(!preview||repType==='none'||!baseDateStr)return;let baseDate=new Date(baseDateStr+'T00:00:00');if(isNaN(baseDate.getTime()))return;let lastDate=new Date(baseDate);if(repType==='weekly')lastDate.setDate(lastDate.getDate()+(repCount-1)*7);else if(repType==='monthly')lastDate.setMonth(lastDate.getMonth()+(repCount-1));let dow=['일','월','화','수','목','금','토'][baseDate.getDay()];let lastStr=`${lastDate.getFullYear()}-${String(lastDate.getMonth()+1).padStart(2,'0')}-${String(lastDate.getDate()).padStart(2,'0')}`;preview.style.display='block';preview.innerHTML=`📅 ${baseDateStr}(${dow}) 부터 ${repCount}회 → 마지막: ${lastStr}`;};
window.openBlockModal=function(dateStr,timeStr){if($("blockModal"))$("blockModal").classList.add('show');if($("blkId"))$("blkId").value='';if($("blkDate"))$("blkDate").value=window.formatBlockDate(dateStr||currentCalDate.toISOString().split('T')[0]);if($("blkStart"))$("blkStart").value=window.formatBlockTime(timeStr||'09:00');if($("blkEnd"))$("blkEnd").value=window.formatBlockTime(timeStr?String(parseInt(timeStr.split(':')[0])+2).padStart(2,'0')+':00':'18:00');if($("blkCategory"))$("blkCategory").value='기본 수업';if($("blkCenter"))$("blkCenter").value=currentGlobalCenter==='전체'?'마포 센터':currentGlobalCenter;if(window.updateSpaceOptions)window.updateSpaceOptions();if($("blkSpace")){$("blkSpace").value='';$("blkSpace").dataset.selectedValues='';}if($("blkReason"))$("blkReason").value='';if($("blkCapacity"))$("blkCapacity").value='';if($("blkBatch"))$("blkBatch").value='';if($("blockModalTitle"))$("blockModalTitle").innerText="신규 스케줄 등록";window.setupBlockModalControls(false);};
window.editBlock=function(id){let b=gBlk.find(x=>String(x.id)===String(id));if(!b)return;if($("blockModal"))$("blockModal").classList.add('show');if($("blkId"))$("blkId").value=b.id;if($("blkDate"))$("blkDate").value=b.block_date;if($("blkStart"))$("blkStart").value=b.start_time;if($("blkEnd"))$("blkEnd").value=b.end_time;if($("blkCategory"))$("blkCategory").value=b.category;if($("blkCenter"))$("blkCenter").value=b.center||'마포 센터';if(window.updateSpaceOptions)window.updateSpaceOptions();if($("blkSpace")){$("blkSpace").value=b.space_equip||'';$("blkSpace").dataset.selectedValues=b.space_equip||'';}if($("blkReason"))$("blkReason").value=b.reason;if($("blkCapacity"))$("blkCapacity").value=b.capacity===null?'':b.capacity;if($("blkBatch"))$("blkBatch").value=b.target_batch||'';if($("blockModalTitle"))$("blockModalTitle").innerText="스케줄 수정";window.setupBlockModalControls(true);let allDayCb=document.getElementById('blkAllDay');if(allDayCb&&b.start_time==='00:00'&&b.end_time==='23:59'){allDayCb.checked=true;window.toggleAllDay(allDayCb);}};
window.closeBlockModal=function(){if($("blockModal"))$("blockModal").classList.remove('show');};
window.isSavingBlock=false;

window.saveBlockData=async function(){
    if(window.isSavingBlock)return;window.isSavingBlock=true;
    let id=$("blockId")?$("blockId").value:($("blkId")?$("blkId").value:"");
    let capVal=$("blkCapacity")?$("blkCapacity").value.trim():"";
    let batchVal=$("blkBatch")?$("blkBatch").value.trim():"";
    if(batchVal&&/^\d+$/.test(batchVal))batchVal=batchVal+'기';
    let spaceVal=$("blkSpace")?$("blkSpace").value.trim():"전체";
    let baseDateStr=$("blkDate")?$("blkDate").value:"";
    let startTime=$("blkStart")?$("blkStart").value:"";
    let endTime=$("blkEnd")?$("blkEnd").value:"";
    let category=$("blkCategory")?$("blkCategory").value:"수업";
    let center=$("blkCenter")?$("blkCenter").value:"마포 센터";
    let reason=$("blkReason")?$("blkReason").value:"";
    let capacity=capVal===""?null:parseInt(capVal);
    if(!baseDateStr||!startTime||!endTime||!reason){window.isSavingBlock=false;return showToast("필수 항목을 모두 입력해주세요.");}
    let repeatType='none';let repeatCount=1;
    if(!id||id===""){let repTypeEl=document.getElementById('blkRepeatType');let repCountEl=document.getElementById('blkRepeatCount');if(repTypeEl)repeatType=repTypeEl.value||'none';if(repeatType!=='none'&&repCountEl){let parsed=parseInt(repCountEl.value);if(!isNaN(parsed)&&parsed>=1)repeatCount=parsed;}}
    let payloads=[];let baseDate=new Date(baseDateStr+'T00:00:00');
    for(let i=0;i<repeatCount;i++){let targetDate=new Date(baseDate);if(repeatType==='weekly')targetDate.setDate(baseDate.getDate()+i*7);else if(repeatType==='monthly')targetDate.setMonth(baseDate.getMonth()+i);let yyyy=targetDate.getFullYear();let mm=String(targetDate.getMonth()+1).padStart(2,'0');let dd=String(targetDate.getDate()).padStart(2,'0');payloads.push({block_date:`${yyyy}-${mm}-${dd}`,start_time:startTime,end_time:endTime,category:category,center:center,space_equip:spaceVal||"전체",reason:reason,capacity:capacity,target_batch:batchVal||null});}
    let error;let syncResult={updated:0,notified:0};
    if(id&&id!==""){
        const oldBlock=gBlk.find(b=>String(b.id)===String(id));const newPayload=payloads[0];const res=await supabaseClient.from('blocks').update(newPayload).eq('id',id);error=res.error;
        if(!error&&oldBlock){try{const oldContentKey=`[${oldBlock.category}] ${oldBlock.reason}`;const oldTimeRange=`${oldBlock.start_time}~${oldBlock.end_time}`;const newContentKey=`[${newPayload.category}] ${newPayload.reason}`;const newTimeRange=`${newPayload.start_time}~${newPayload.end_time}`;const affected=gTrn.filter(t=>{const cInfo=String(t.content||'').split('||').map(s=>s.trim());if(cInfo.length<5)return false;return cInfo[0]===oldBlock.block_date&&cInfo[2]===oldTimeRange&&cInfo[3]===oldBlock.center&&cInfo[4]===oldContentKey;});for(const t of affected){const cInfo=String(t.content||'').split('||').map(s=>s.trim());cInfo[0]=newPayload.block_date;cInfo[2]=newTimeRange;cInfo[3]=newPayload.center;cInfo[4]=newContentKey;const newContent=cInfo.join(' || ');await supabaseClient.from('trainings').update({content:newContent}).eq('id',t.id);}syncResult.updated=affected.length;const changes=[];if(oldBlock.block_date!==newPayload.block_date)changes.push(`날짜: ${oldBlock.block_date} → ${newPayload.block_date}`);if(oldTimeRange!==newTimeRange)changes.push(`시간: ${oldTimeRange} → ${newTimeRange}`);if(oldBlock.center!==newPayload.center)changes.push(`센터: ${oldBlock.center} → ${newPayload.center}`);if((oldBlock.space_equip||'전체')!==(newPayload.space_equip||'전체'))changes.push(`공간/장비: ${oldBlock.space_equip||'전체'} → ${newPayload.space_equip||'전체'}`);if(oldBlock.reason!==newPayload.reason)changes.push(`상세 내용: ${oldBlock.reason} → ${newPayload.reason}`);const activeAffected=affected.filter(t=>!String(t.status||'').includes('취소'));if(activeAffected.length>0&&changes.length>0){const changeText=changes.join('\n');const notifications=activeAffected.map(t=>({member_phone:t.phone,member_name:t.name,title:'신청하신 수업/훈련 정보가 변경되었습니다',message:`${t.name}님이 신청하신 [${oldBlock.reason}]의 정보가 다음과 같이 변경되었습니다.\n\n${changeText}\n\n일정 확인 후 참여가 어려울 경우 취소 요청드립니다.`,related_type:'training_change',related_id:String(id)}));const notifRes=await supabaseClient.from('member_notifications').insert(notifications);if(!notifRes.error)syncResult.notified=activeAffected.length;}}catch(syncErr){console.warn('Sync error:',syncErr);}}
    }else{const res=await supabaseClient.from('blocks').insert(payloads);error=res.error;}
    window.isSavingBlock=false;
    if(error){showToast("저장 실패");console.error(error);}
    else{let msg=payloads.length>1?`${payloads.length}개의 스케줄이 등록되었습니다.`:"저장되었습니다.";if(syncResult.updated>0){msg=`저장 완료. 신청자 ${syncResult.updated}명의 정보가 함께 업데이트되었습니다${syncResult.notified>0?` (${syncResult.notified}명에게 알림 발송)`:''}.`;}showToast(msg);window.closeBlockModal();window.fetchCenterData({force:true});}
};

window.deleteBlock=function(id){window.openCustomConfirm("스케줄 삭제",null,"이 스케줄을 삭제하시겠습니까?",async()=>{const{error}=await supabaseClient.from('blocks').delete().eq('id',id);if(error)showToast("삭제 실패");else{showToast("삭제되었습니다.");window.fetchCenterData({force:true});}});};

function initQuill(){if(!quillEditor&&$('editor-container')){quillEditor=new Quill('#editor-container',{theme:'snow',modules:{toolbar:[[{'header':[1,2,3,false]}],['bold','italic','underline','strike'],[{'list':'ordered'},{'list':'bullet'}],[{'align':[]}],[{'color':[]},{'background':[]}],['clean']]},placeholder:'내용을 자유롭게 적어주세요.'});}}
window.openNoticeModal=function(){if($("noticeModal"))$("noticeModal").classList.add('show');setTimeout(()=>{try{initQuill();if(quillEditor)quillEditor.root.innerHTML='';}catch(e){}},50);if($("noticeId"))$("noticeId").value='';if($("noticeTitle"))$("noticeTitle").value='';if($("noticePinned"))$("noticePinned").checked=false;if($("noticeStatus"))$("noticeStatus").value='발행';if($("noticeTargetBatch"))$("noticeTargetBatch").value='';if($("noticeModalTitle"))$("noticeModalTitle").innerText="새 공지사항 등록";}
window.editNotice=function(id){let n=gNotice.find(x=>String(x.id)===String(id));if(!n)return;if($("noticeModal"))$("noticeModal").classList.add('show');setTimeout(()=>{try{initQuill();if(quillEditor)quillEditor.root.innerHTML=n.content||'';}catch(e){}},50);if($("noticeId"))$("noticeId").value=n.id;if($("noticeTitle"))$("noticeTitle").value=n.title;if($("noticePinned"))$("noticePinned").checked=n.is_pinned;if($("noticeStatus"))$("noticeStatus").value=n.status||'발행';if($("noticeTargetBatch"))$("noticeTargetBatch").value=n.target_batch||'';if($("noticeModalTitle"))$("noticeModalTitle").innerText="공지사항 수정";}
window.closeNoticeModal=function(){if($("noticeModal"))$("noticeModal").classList.remove('show');}

window.saveNoticeData=async function(){let id=$("noticeId")?$("noticeId").value:"";let htmlContent=quillEditor?quillEditor.root.innerHTML:'';let targetBatchVal=$("noticeTargetBatch")?$("noticeTargetBatch").value.trim():"";let payload={title:$("noticeTitle")?$("noticeTitle").value.trim():"",content:htmlContent,is_pinned:$("noticePinned")?$("noticePinned").checked:false,status:$("noticeStatus")?$("noticeStatus").value:"발행",target_batch:targetBatchVal===""?null:targetBatchVal};if(!payload.title)return showToast("제목을 입력해주세요.");if(!payload.content||payload.content==='<p><br></p>')return showToast("내용을 입력해주세요.");let error;if(id){const res=await supabaseClient.from('notices').update(payload).eq('id',id);error=res.error;}else{const res=await supabaseClient.from('notices').insert([payload]);error=res.error;}if(error){showToast("저장 실패: "+(error.message||error.details||"알 수 없는 오류"));console.error("Notice Save Error:",error);}else{showToast("저장되었습니다.");window.closeNoticeModal();window.fetchCenterData({force:true});}}

window.deleteNotice=function(id){window.openCustomConfirm("공지사항 삭제",null,`이 공지사항을 완전히 삭제하시겠습니까?`,async()=>{const{error}=await supabaseClient.from('notices').delete().eq('id',id);if(error)showToast("삭제 실패");else{showToast("삭제되었습니다.");window.fetchCenterData({force:true});}});}

window.renderMCalCenter=function(selDate){$$$("#m-cal-strip-center .m-cal-date").forEach(el=>el.classList.remove('active'));let target=document.getElementById(`m-date-center-${selDate}`);if(target){target.classList.add('active');try{target.scrollIntoView({behavior:'smooth',block:'nearest',inline:'center'});}catch(e){}}let evts=window.centerCalEvts&&window.centerCalEvts[selDate]?window.centerCalEvts[selDate]:[];evts.sort((a,b)=>String(a.start||'').localeCompare(String(b.start||'')));let html='';if(evts.length===0){html=`<div class="empty-state" style="padding:40px 0;">예정된 스케줄이 없습니다.</div>`;}else{evts.forEach(e=>{let timeStr=e.time||'종일';html+=`<div class="m-cal-card" style="align-items:flex-start;text-align:left;width:100%;box-sizing:border-box;"><div style="display:flex;align-items:center;justify-content:space-between;width:100%;margin-bottom:4px;"><div class="m-cal-card-title" style="margin:0;">${window.escapeHtml(e.text)||''}</div><div class="m-cal-card-time" style="color:var(--primary);font-weight:800;font-size:13px;">${timeStr}</div></div><div class="m-cal-card-desc" style="font-size:13px;color:var(--text-secondary);margin-top:0;width:100%;">${window.escapeHtml(e.tooltip||'')}</div></div>`;});}let listWrap=$("m-cal-list-center");if(listWrap)listWrap.innerHTML=html;};

// ★ 신규 함수 1: CRM 모달 하단 상태 변경 핸들러
window.saveCrmStatus=async function(){
    if(!$("crmAppId"))return;
    const id=$("crmAppId").value;
    const newStatus=$("crmStatusSelect")?$("crmStatusSelect").value:'';
    if(!newStatus){showToast("상태를 선택해주세요.");return;}
    const app=globalApps.find(a=>String(a.id)===String(id));
    if(!app){showToast("신청 정보를 찾을 수 없습니다.");return;}
    const prevStatus=app.join_status||'';
    if(prevStatus===newStatus){showToast("동일한 상태입니다.");return;}
    await window.updateAppStatus(id,'join_status',newStatus,$("crmStatusSelect"));
    window.renderCrmInner(id,isCrmReadOnly);
};



// ── 명세서 (디자인 리뉴얼 — 밀집 레이아웃 + 카드형 이력) ──
window.showInvoiceModal=async function(){
    let modal=document.getElementById('invoiceModal');
    if(!modal){
        modal=document.createElement('div');modal.id='invoiceModal';
        modal.style.cssText='position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.45);z-index:99990;display:none;align-items:center;justify-content:center;padding:16px;box-sizing:border-box;';
        modal.innerHTML=`<div style="background:#fff;border-radius:20px;width:100%;max-width:720px;max-height:88vh;display:flex;flex-direction:column;box-shadow:0 20px 60px rgba(0,0,0,0.15);overflow:hidden;">
            <div style="padding:24px 28px 18px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #f0f0f0;">
                <div style="display:flex;align-items:center;gap:10px;">
                    <span style="font-size:20px;font-weight:900;color:#111;letter-spacing:-0.5px;">멤버별 청구 명세서</span>
                    <i class="info-tooltip long-text" data-tippy="멤버별 주문 건의 발주일, 수령 센터, 결제 금액, 입금 현황을 확인하고 관리합니다. 금액·상태 변경 시 담당 근무자가 자동 기록됩니다. 입금 확인·센터 도착·취소·품절 건은 자동 정리되며, 데이터는 서버에 보관됩니다. 주문 리스트에서 체크한 건이 있으면 해당 건만 표시됩니다." onmouseenter="window.showGlobalTooltip(event,this)" onmouseleave="window.hideGlobalTooltip()">i</i>
                </div>
                <button onclick="window.closeInvoiceModal()" style="background:none;border:none;font-size:24px;cursor:pointer;color:#999;line-height:1;padding:4px;">✕</button>
            </div>
            <div id="invoiceModalBody" style="flex:1;overflow-y:auto;padding:20px 28px;background:#fafafa;"></div>
            <div id="invoiceModalFooter" style="padding:16px 28px 20px;background:#fff;border-top:1px solid #f0f0f0;"></div>
        </div>`;
        document.body.appendChild(modal);
    }
    let body=document.getElementById('invoiceModalBody');
    let footer=document.getElementById('invoiceModalFooter');
    body.innerHTML='<div style="text-align:center;padding:60px 0;color:#aaa;font-weight:600;">불러오는 중...</div>';
    footer.innerHTML='';
    modal.style.display='flex';

    let checkedBoxes=document.querySelectorAll('.chk-ord:checked, input[type="checkbox"][class*="chk-ord-dyn-"]:checked');
    let checkedIds=Array.from(checkedBoxes).map(cb=>String(cb.value)).filter(val=>val!=="on");
    let activeOrders=gOrd.filter(o=>{
        let st=o.status||'';
        if(!['주문 접수','입금 대기','입금 확인 중'].includes(st))return false;
        if(checkedIds.length>0)return checkedIds.includes(String(o.id));
        return(currentGlobalCenter==='전체'||o.center===currentGlobalCenter);
    });

    if(activeOrders.length===0){body.innerHTML='<div style="text-align:center;padding:80px 0;color:#bbb;font-size:15px;font-weight:600;">표시할 주문 내역이 없습니다.</div>';footer.innerHTML=`<button style="width:100%;padding:14px;font-size:14px;font-weight:700;background:#111;color:#fff;border:none;border-radius:12px;cursor:pointer;" onclick="window.showInvoiceLogs()">전체 변경 이력</button>`;return;}

    let orderIds=activeOrders.map(o=>String(o.id));
    let allLogs={};
    try{
        const{data:logs}=await supabaseClient.from('invoice_logs').select('*').in('order_id',orderIds).eq('action','price_changed').order('created_at',{ascending:true});
        if(logs)logs.forEach(log=>{if(!allLogs[log.order_id])allLogs[log.order_id]=[];allLogs[log.order_id].push(log);});
    }catch(e){}

    let members={};
    activeOrders.forEach(o=>{
        let name=o.name||'이름없음';
        let deliveryLabel=window.formatDeliveryDateFull(o.delivery_date);
        let center=o.center||'미지정';
        let groupKey=`${deliveryLabel}__${center}`;
        if(!members[name])members[name]={batch:o.batch||'-',phone:o.phone||'-',groups:{}};
        if(!members[name].groups[groupKey])members[name].groups[groupKey]={deliveryLabel,center,items:[]};
        let cNm=o.item_name||'';let m=String(cNm).match(/(.+) \[(?:희望:\s*)?(\d+)[\/\.](\d+).*?\]/);if(m)cNm=m[1].trim();else{let oM=String(cNm).match(/(.+) \[(.*?)\]/);if(oM)cNm=oM[1].trim();}
        let logs=allLogs[String(o.id)]||[];
        let latestLog=logs.length>0?logs[logs.length-1]:null;
        members[name].groups[groupKey].items.push({
            vendor:o.vendor||'',itemName:cNm,quantity:o.quantity||'',price:o.total_price||'',status:o.status||'주문 접수',
            enteredBy:latestLog?latestLog.performed_by:'',enteredAt:latestLog?formatDt(latestLog.created_at):'',
            logs:logs,hasEdits:logs.length>1,orderId:String(o.id)
        });
    });

    let html='';let firstNoLog=true;
    Object.entries(members).sort((a,b)=>a[0].localeCompare(b[0])).forEach(([name,data])=>{
        let memberTotal=0,enteredCount=0,totalCount=0;
        let itemsHtml='';

        Object.values(data.groups).forEach(group=>{
            itemsHtml+=`<div style="padding:4px 0 8px;"><div style="font-size:11px;font-weight:700;color:#ff7900;background:#fff7f0;padding:3px 10px;border-radius:20px;display:inline-block;margin-bottom:6px;">${group.deliveryLabel} · ${group.center}</div>`;
            group.items.forEach(item=>{
                totalCount++;
                let amt=parseInt(String(item.price||'0').replace(/[^0-9]/g,''))||0;
                memberTotal+=amt;
                let hasValidPrice=amt>0;
                if(hasValidPrice)enteredCount++;

                let rawAmt=String(item.price||'').replace(/[^0-9]/g,'');
                let displayPrice=hasValidPrice?comma(rawAmt)+'원':'';
                let priceStr=`<input type="text" value="${displayPrice}" placeholder="금액 입력" style="width:100px;font-size:13px;font-weight:600;color:${hasValidPrice?'#111':'#aaa'};text-align:right;border:1px solid var(--border-strong);border-radius:6px;padding:6px 10px;outline:none;background:#fff;height:34px;box-sizing:border-box;" onfocus="this.style.borderColor='var(--primary)';this.select();" onblur="this.style.borderColor='var(--border-strong)';window.handleInvoicePriceInput('${item.orderId}',this.value,this)">`;
                let stOpts=['주문 접수','입금 대기','입금 확인 중','입금 확인'].map(s=>`<option value="${s}" ${item.status===s?'selected':''}>${s}</option>`).join('');
                let stClass=item.status==='입금 확인'?'st-confirmed':(item.status==='입금 대기'||item.status==='입금 확인 중')?'st-arranging':'st-wait';

                let metaHtml='';
                if(item.enteredBy){metaHtml=`<span style="color:#aaa;">${window.getAdminName(item.enteredBy)} · ${item.enteredAt}</span>`;}
                else if(hasValidPrice){metaHtml=`<span style="color:#ccc;">기록 없음${firstNoLog?(firstNoLog=false,' <i class="info-tooltip" data-tippy="시스템 업데이트 이전 입력분은 기록이 없습니다. 이후 변경 건부터 자동 기록됩니다." onmouseenter="window.showGlobalTooltip(event,this)" onmouseleave="window.hideGlobalTooltip()" style="font-size:10px;vertical-align:middle;">i</i>'):''}</span>`;}

                let editToggle='';
                if(item.hasEdits){
                    let logId='lg-'+item.orderId;
                    let logCards=item.logs.map(l=>`<div style="display:flex;justify-content:space-between;padding:4px 0;font-size:11px;color:#888;border-bottom:1px solid #f5f5f5;"><span>${formatDt(l.created_at)}</span><span>${window.getAdminName(l.performed_by)}</span><span>${l.old_value||'—'} → ${l.new_value}</span></div>`).join('');
                    editToggle=`<span style="color:#ff7900;cursor:pointer;font-weight:700;margin-left:6px;" onclick="let e=document.getElementById('${logId}');e.style.display=e.style.display==='none'?'block':'none';">이력${item.logs.length}</span><div id="${logId}" style="display:none;margin-top:4px;padding:8px 10px;background:#fafafa;border-radius:8px;border:1px solid #f0f0f0;">${logCards}</div>`;
                }

                itemsHtml+=`<div style="padding:10px 0;border-bottom:1px solid #f5f5f5;">
                    <div style="font-size:13px;line-height:1.5;margin-bottom:6px;"><span style="color:#999;font-size:12px;">${window.escapeHtml(item.vendor)}</span> <span style="color:#bbb;margin:0 4px;">|</span> <span style="color:#111;font-weight:600;">${window.escapeHtml(item.itemName)}</span> <span style="color:#999;font-weight:500;margin-left:4px;">${item.quantity}</span></div>
                    <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                        ${priceStr}
                        <select class="status-select ${stClass}" style="font-size:12px;padding:6px 24px 6px 10px;border-radius:6px;height:34px;" onchange="window.handleInvoiceStatusChange('${item.orderId}',this.value,this)">${stOpts}</select>
                    </div>
                    <div style="display:flex;align-items:center;gap:4px;margin-top:3px;font-size:11px;">${metaHtml}${editToggle}</div>
                </div>`;
            });
            itemsHtml+=`</div>`;
        });

        let unenteredCount=totalCount-enteredCount;
        let statusBadge=unenteredCount>0
            ?`<span style="font-size:11px;color:#ef4444;font-weight:700;">${totalCount}건 중 ${unenteredCount}건 미입력</span>`
            :`<span style="font-size:11px;color:#22c55e;font-weight:700;">전체 입력 완료</span>`;
        let totalStr=memberTotal>0?memberTotal.toLocaleString()+'원':'—';

        html+=`<div style="background:#fff;border-radius:16px;border:1px solid #eee;margin-bottom:12px;overflow:hidden;">
            <div style="display:flex;justify-content:space-between;align-items:center;padding:14px 16px;border-bottom:1px solid #f0f0f0;border-left:4px solid #ff7900;">
                <div><span style="font-weight:800;font-size:15px;color:#111;">${data.batch} ${window.escapeHtml(name)}</span> <span style="font-size:12px;color:#bbb;margin-left:4px;">${window.escapeHtml(data.phone)}</span></div>
                <div style="text-align:right;"><div style="font-size:18px;font-weight:900;color:#111;">${totalStr}</div>${statusBadge}</div>
            </div>
            <div style="padding:8px 16px 12px;">${itemsHtml}</div>
        </div>`;
    });

    body.innerHTML=html;
    window._invoiceMainHtml=html;
    footer.innerHTML=`<button style="width:100%;padding:14px;font-size:14px;font-weight:700;background:#111;color:#fff;border:none;border-radius:12px;cursor:pointer;transition:0.15s;" onmouseover="this.style.background='#333'" onmouseout="this.style.background='#111'" onclick="window.showInvoiceLogs()">전체 변경 이력</button>`;
};

window.closeInvoiceModal=function(){let modal=document.getElementById('invoiceModal');if(modal)modal.style.display='none';};

window.handleInvoiceStatusChange=async function(orderId,newValue,selectEl){
    let order=gOrd.find(o=>String(o.id)===String(orderId));if(!order)return;
    let oldStatus=order.status||'주문 접수';
    if(oldStatus===newValue)return;
    const{error}=await supabaseClient.from('orders').update({status:newValue}).eq('id',orderId);
    if(error){showToast("변경 실패");selectEl.value=oldStatus;return;}
    try{await supabaseClient.from('invoice_logs').insert([{order_id:String(orderId),action:'status_changed',field_name:'status',old_value:oldStatus,new_value:newValue,performed_by:currentAdminEmail||'unknown',target_member:order?.name||''}]);}catch(e){}
    order.status=newValue;
    showToast(`[${newValue}] 변경 완료`);
    if(newValue==='입금 확인'){showToast('입금 확인 — 명세서에서 제외됩니다.');setTimeout(()=>window.showInvoiceModal(),600);}
    window.fetchCenterData({force:true});
};

// 명세서 내 금액 입력 (주문 리스트와 동기화)
window.handleInvoicePriceInput=async function(orderId,val,inputEl){
    let numOnly=String(val).replace(/[^0-9]/g,'');
    let formatted=numOnly?comma(numOnly)+'원':'';
    let order=gOrd.find(o=>String(o.id)===String(orderId));if(!order)return;
    let oldPrice=order.total_price||'';
    if(oldPrice===formatted){inputEl.value=formatted;return;}
    let updates={total_price:formatted};
    let newStatus=order.status;
    if(numOnly&&order.status==='주문 접수'){updates.status='입금 대기';newStatus='입금 대기';}
    order.total_price=formatted;order.status=newStatus;
    inputEl.value=formatted;
    inputEl.style.color=formatted?'#111':'#ccc';
    inputEl.style.borderColor='#e5e5e5';
    inputEl.style.background=formatted?'#fff':'#fff5f5';
    await supabaseClient.from('orders').update(updates).eq('id',orderId);
    if(oldPrice!==formatted){try{await supabaseClient.from('invoice_logs').insert([{order_id:String(orderId),action:'price_changed',field_name:'total_price',old_value:oldPrice,new_value:formatted,performed_by:currentAdminEmail||'unknown',target_member:order?.name||''}]);}catch(e){}}
    showToast('저장되었습니다.');
    window.fetchCenterData({force:true});
};

// 전체 변경 이력 (카드형)
window.showInvoiceLogs=async function(){
    let body=document.getElementById('invoiceModalBody');
    let footer=document.getElementById('invoiceModalFooter');
    if(!body)return;
    body.innerHTML='<div style="text-align:center;padding:60px 0;color:#aaa;">이력을 불러오는 중...</div>';
    footer.innerHTML=`<button style="width:100%;padding:14px;font-size:14px;font-weight:700;background:#111;color:#fff;border:none;border-radius:12px;cursor:pointer;" onclick="window.restoreInvoiceMain()">← 명세서로 돌아가기</button>`;
    try{
        const{data,error}=await supabaseClient.from('invoice_logs').select('*').in('action',['price_changed','status_changed']).order('created_at',{ascending:false}).limit(500);
        if(error||!data||data.length===0){body.innerHTML='<div style="text-align:center;padding:60px 0;color:#bbb;font-size:15px;">변경 이력이 없습니다.</div>';return;}
        let activeIds=new Set(gOrd.map(o=>String(o.id)));
        let filtered=data.filter(log=>activeIds.has(String(log.order_id)));

        if(filtered.length===0){body.innerHTML='<div style="text-align:center;padding:60px 0;color:#bbb;font-size:15px;">변경 이력이 없습니다.</div>';return;}

        let cards=filtered.map(log=>{
            let isPrice=log.action==='price_changed';
            let badgeColor=isPrice?'#ff7900':'#2563eb';
            let badgeBg=isPrice?'#fff7f0':'#eff6ff';
            let badgeText=isPrice?'금액':'결제';
            let order=gOrd.find(o=>String(o.id)===String(log.order_id));
            let vendor=order?order.vendor||'':'';
            let itemName=order?(order.item_name||'').replace(/\s*\[.*?\]\s*$/,''):'';
            let qty=order?order.quantity||'':'';

            return `<div style="padding:16px 20px;background:#fff;border:1px solid #eee;border-radius:14px;margin-bottom:10px;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
                    <div style="display:flex;align-items:center;gap:8px;">
                        <span style="font-size:12px;font-weight:700;color:${badgeColor};background:${badgeBg};padding:3px 10px;border-radius:6px;">${badgeText}</span>
                        <span style="font-weight:800;font-size:16px;color:#111;">${window.escapeHtml(log.target_member||'-')}</span>
                    </div>
                    <span style="font-size:12px;color:#999;">${formatDt(log.created_at)}</span>
                </div>
                ${itemName?`<div style="font-size:14px;margin-bottom:10px;line-height:1.4;"><span style="color:#999;">${window.escapeHtml(vendor)}</span> <span style="color:#ccc;">|</span> <span style="color:#333;font-weight:600;">${window.escapeHtml(itemName)}</span>${qty?` <span style="color:#999;">${qty}</span>`:''}</div>`:''}
                <div style="background:#f9fafb;padding:10px 14px;border-radius:8px;display:flex;justify-content:space-between;align-items:center;">
                    <div style="font-size:14px;"><span style="color:#aaa;">${window.escapeHtml(log.old_value||'—')}</span> <span style="color:#ccc;font-weight:600;">→</span> <span style="font-weight:800;color:#111;font-size:15px;">${window.escapeHtml(log.new_value||'—')}</span></div>
                    <span style="font-size:11px;color:#aaa;">${window.escapeHtml(window.getAdminName(log.performed_by)||'-')}</span>
                </div>
            </div>`;
        }).join('');

        body.innerHTML=`<div style="margin-bottom:16px;"><span style="font-size:18px;font-weight:900;color:#111;">전체 변경 이력</span></div>${cards}`;
    }catch(e){body.innerHTML='<div style="text-align:center;padding:60px 0;color:#ef4444;">이력 조회 실패</div>';console.error(e);}
};

window.restoreInvoiceMain=function(){
    let body=document.getElementById('invoiceModalBody');
    let footer=document.getElementById('invoiceModalFooter');
    if(body&&window._invoiceMainHtml)body.innerHTML=window._invoiceMainHtml;
    if(footer)footer.innerHTML=`<button style="width:100%;padding:14px;font-size:14px;font-weight:700;background:#111;color:#fff;border:none;border-radius:12px;cursor:pointer;transition:0.15s;" onmouseover="this.style.background='#333'" onmouseout="this.style.background='#111'" onclick="window.showInvoiceLogs()">전체 변경 이력</button>`;
};

window.ensureInvoiceButton=function(){
    if(document.getElementById('invoiceBtn'))return;
    let btns=document.querySelectorAll('button,.btn');
    let summaryBtn=Array.from(btns).find(b=>b.textContent.includes('발주 요약'));
    if(summaryBtn&&summaryBtn.parentNode){
        let wrapper=document.createElement('div');
        wrapper.style.cssText='display:flex;gap:8px;flex-wrap:wrap;';
        summaryBtn.parentNode.insertBefore(wrapper,summaryBtn);
        wrapper.appendChild(summaryBtn);
        let invoiceBtn=document.createElement('button');
        invoiceBtn.id='invoiceBtn';
        invoiceBtn.style.cssText='padding:10px 16px;font-size:14px;font-weight:600;background:var(--primary);color:#fff;border:none;border-radius:8px;cursor:pointer;transition:0.15s;white-space:nowrap;height:38px;display:inline-flex;align-items:center;justify-content:center;';
        invoiceBtn.textContent='명세서';
        invoiceBtn.onmouseover=function(){this.style.opacity='0.9';};
        invoiceBtn.onmouseout=function(){this.style.opacity='1';};
        invoiceBtn.onclick=function(){window.showInvoiceModal();};
        wrapper.appendChild(invoiceBtn);
    }
};
// fetchCenterData 완료 후 자동 호출됨 (Part 1에서 호출)

// ▼▼▼ 파트4 끝 (전체 코드 끝) ▼▼▼
