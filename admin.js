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

// 예정된 상담 캘린더 렌더링
window.renderAppDashboard = async function() {
    const now = new Date(); 
    let targetDate = new Date(now.getFullYear(), now.getMonth() + appDashMonthOffset, 1);
    const yyyy = targetDate.getFullYear(); 
    const mm = targetDate.getMonth();
    const daysInMonth = new Date(yyyy, mm + 1, 0).getDate(); 
    const currDay = now.getDay();
    
    if (currentAppDashView === 'month' && $("appDashMonthTitle")) $("appDashMonthTitle").innerText = `${yyyy}년 ${mm + 1}월`;
    await window.fetchHolidays(yyyy);

    let scheduledApps = globalApps.filter(a => a.status === '상담 일정 확정' && a.call_time);
    let calEvts = {};

    if (currentAppDashView === 'week') {
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

    scheduledApps.forEach(app => {
        const m = String(app.call_time||'').match(/(\d+)월\s+(\d+)일/);
        if (m) {
            let appM = parseInt(m[1]); let appD = parseInt(m[2]);
            let appY = yyyy; 
            let ds = `${appY}-${String(appM).padStart(2,'0')}-${String(appD).padStart(2,'0')}`;
            if (calEvts[ds]) {
                const tm = String(app.call_time||'').match(/(오전|오후)\s+(\d+)시(?:\s+(\d+)분)?/);
                let timeStr = tm ? `${tm[1]} ${tm[2]}:${tm[3]||'00'}` : app.call_time;
                calEvts[ds].push({ time: timeStr, text: `[${app.desired_batch||'-'}] ${app.name}`, tooltip: `${timeStr} | 담당: ${app.counselor_name||'미정'}`});
            }
        }
    });

    let mHtml = `<div class="dash-cal-grid"><div class="dash-cal-header" style="color:var(--error);">일</div><div class="dash-cal-header">월</div><div class="dash-cal-header">화</div><div class="dash-cal-header">수</div><div class="dash-cal-header">목</div><div class="dash-cal-header">금</div><div class="dash-cal-header" style="color:var(--blue);">토</div>`;
    
    let iterDates = Object.keys(calEvts).sort();
    if (currentAppDashView === 'month') {
        let firstDay = new Date(yyyy, mm, 1).getDay();
        for(let i=0; i<firstDay; i++) mHtml += `<div class="dash-cal-cell empty"></div>`;
    }

    iterDates.forEach(ds => {
        let dObj = new Date(ds);
        let evts = calEvts[ds];
        let holidayName = window.getHoliday(dObj.getFullYear(), dObj.getMonth() + 1, dObj.getDate());
        let dateClass = holidayName ? 'holiday-date' : '';
        let dateText = dObj.getDate() + (holidayName ? ` <span style="font-size:10px; font-weight:600; display:block; float:right;">${holidayName}</span>` : '');
        
        let evtsHtml = evts.slice(0, 3).map(e => `<div class="dash-item" style="background:#FFF6EF; border-left-color:var(--primary); color:var(--primary);"><div class="dash-item-text"><span class="dash-time">${e.time||''}</span>${e.text||''}</div><div class="dash-tooltip">${e.tooltip||''}</div></div>`).join('');
        if(evts.length > 3) {
            let hiddenText = evts.slice(3).map(e => `${e.time||''} | ${e.text||''}`).join('<br>');
            evtsHtml += `<div class="dash-cal-more-wrap"><div class="dash-cal-more">+${evts.length - 3}건 더보기</div><div class="dash-tooltip" style="text-align:left; white-space:nowrap; font-weight:normal;">${hiddenText}</div></div>`;
        }
        mHtml += `<div class="dash-cal-cell"><div class="dash-cal-date ${dateClass}">${dateText}</div>${evtsHtml}</div>`;
    });
    mHtml += `</div>`;

    window.appCalEvts = calEvts;
    let mobStrip = `<div class="mobile-cal"><div class="m-cal-strip" id="m-cal-strip-app">`;
    iterDates.forEach(ds => {
        let dObj = new Date(ds); let dayKr = ["일","월","화","수","목","금","토"][dObj.getDay()];
        let hasEvt = calEvts[ds].length > 0 ? 'has-evt' : '';
        mobStrip += `<div class="m-cal-date" id="m-date-app-${ds}" onclick="window.renderMCalApp('${ds}')"><span class="m-cal-day">${dayKr}</span><span class="m-cal-num">${dObj.getDate()}</span><div class="m-cal-dot ${hasEvt}"></div></div>`;
    });
    mobStrip += `</div><div id="m-cal-list-app" class="m-cal-list"></div></div>`;
    
    if($("appDashContent")) $("appDashContent").innerHTML = `<div class="desktop-cal">${mHtml}</div>` + mobStrip;
    let td = new Date(); let todayStr = `${td.getFullYear()}-${String(td.getMonth()+1).padStart(2,'0')}-${String(td.getDate()).padStart(2,'0')}`;
    window.renderMCalApp(calEvts[todayStr] ? todayStr : iterDates[0]);
}

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

window.closeCrmModal = function() {
    $("crmModal").classList.remove('show');
};

// 🔥 설문 응답 모달 (이모지 제거, 뱃지 UI 개선, 가로 넘침 방지 오토레이아웃)
window.renderCrmInner = function(id) {
    const app = globalApps.find(a => String(a.id) === String(id)); if(!app) return;
    $("crmName").innerText = app.name || '이름 없음';
    
    let batchTag = `<span style="background:var(--bg-page); padding:6px 10px; border-radius:6px; font-size:13px; font-weight:600; color:var(--text-secondary);">[${app.desired_batch||'기수 미정'}]</span>`;
    let phoneTag = `<span style="background:var(--bg-page); padding:6px 10px; border-radius:6px; font-size:13px; font-weight:600; color:var(--text-secondary);">${app.phone||'-'}</span>`;
    let acqTag = `<span style="background:var(--bg-page); padding:6px 10px; border-radius:6px; font-size:13px; font-weight:600; color:var(--text-secondary);">${app.acquisition_channel||'-'}</span>`;
    $("crmProfile").innerHTML = `${batchTag}${phoneTag}${acqTag}`;
    
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
                <button class="btn-outline" style="color:var(--primary); border-color:var(--primary); padding:12px 24px; font-size:15px;" onclick="copyTxt('https://www.wecoffee.co.kr/survey?uid=${app.id}&name=${encodeURIComponent(app.name || '')}')">고객 전용 설문 링크 복사하기</button>
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

// 🔥 일정 저장 로직 (과거 시간 차단 + 연도 자동 계산)
window.saveScheduleData = async function() {
    if (!currentScheduleAppId) return;
    const dVal = $("schedInputDate").value; const tVal = $("schedInputTime").value; const name = $("schedInputName").value.trim();
    if (!dVal || !tVal) { showToast("상담 날짜와 시간을 모두 입력해주세요."); return; }
    
    const dt = String(dVal).replace(/\D/g, ''); 
    const timeRe = String(tVal).replace(/\D/g, '');
    
    if(dt.length !== 4) { showToast("날짜는 MMDD 형식(4자리)으로 입력해주세요."); return; }
    if(timeRe.length !== 4) { showToast("시간은 HHMM 형식(4자리)으로 입력해주세요."); return; }

    const now = new Date();
    let currentYear = now.getFullYear();
    const mm = parseInt(dt.slice(0,2), 10); 
    const dd = parseInt(dt.slice(2,4), 10);
    const hh = parseInt(timeRe.slice(0,2), 10); 
    const min = parseInt(timeRe.slice(2,4), 10);

    // 연도 자동 보정 로직
    if (mm < now.getMonth() + 1 - 2) { 
        currentYear += 1;
    }

    const parseDate = new Date(currentYear, mm - 1, dd, hh, min);
    if(isNaN(parseDate.getTime())) { showToast("유효하지 않은 날짜입니다."); return; }
    
    // 과거 시간 필터링
    if(parseDate < now) {
        showToast("과거 시간은 설정할 수 없습니다.");
        return;
    }

    const dow = ['일','월','화','수','목','금','토'][parseDate.getDay()];
    let ampm = hh >= 12 ? '오후' : '오전'; 
    let hh12 = hh % 12 || 12;
    const formattedCallTime = `${mm}월 ${dd}일(${dow}) ${ampm} ${hh12}:${String(min).padStart(2,'0')}`;

    const { error } = await supabaseClient.from('applications').update({ status: '상담 일정 확정', call_time: formattedCallTime, counselor_name: name }).eq('id', currentScheduleAppId);
    if (error) { showToast("저장 실패"); } else { 
        showToast("상담 일정이 확정되었습니다."); window.closeScheduleModal(); window.fetchApplications(); 
        
        const app = globalApps.find(a => String(a.id) === String(currentScheduleAppId));
        // 모달 띄울 때 복사 함수를 동기적으로 실행할 수 있도록 세팅
        setTimeout(() => {
            window.openCustomConfirm(
              "일정 확정 완료", 
              null, 
              `고객에게 발송할 <b>사전 설문 링크</b>를 복사하시겠습니까?`, 
              () => { copyTxt(`https://www.wecoffee.co.kr/survey?uid=${currentScheduleAppId}&name=${encodeURIComponent(app.name || '')}`); }, 
              "복사하기"
            );
        }, 300);
    }
};

// 🔥 멤버 이관 실패 방지(상태값) & 롤백(DB 삭제) & 결제 내역(165만) 자동 추가
window.updateAppStatus = async function(id, column, value) {
    const app = globalApps.find(a => String(a.id) === String(id)); if (!app) return;

    // 롤백: 가입 완료 -> 다른 상태로 변경 시
    if (column === 'join_status' && app.join_status === '가입 완료' && value !== '가입 완료') {
        window.openCustomConfirm(
            "가입 취소 (롤백)", 
            null, 
            `해당 고객의 가입 처리를 취소하시겠습니까?<br><span style="font-size:12px; color:var(--text-secondary); font-weight:500;">멤버 리스트와 결제 내역에서 데이터가 완전히 삭제되며,<br>상태가 [${value}](으)로 되돌아갑니다.</span>`, 
            async () => {
                await supabaseClient.from('members').delete().eq('phone', app.phone);
                await supabaseClient.from('member_history').delete().eq('member_phone', app.phone);
                await supabaseClient.from('applications').update({ join_status: value }).eq('id', id);
                showToast("멤버 리스트에서 삭제되고 롤백 되었습니다.");
                window.fetchApplications(); window.fetchMembers();
            }
        );
        return;
    }

    if (column === 'join_status' && value === '가입 완료') {
        window.openCustomConfirm("가입 완료 (멤버 전환)", null, `해당 고객을 멤버 리스트로 이관하시겠습니까?<br><span style="font-size:12px; color:var(--text-secondary); font-weight:500;">오늘 기준으로 6개월 활동 종료일 및 결제 내역이 자동 세팅됩니다.</span>`, async () => {
            if (!app.phone) { showToast("연락처가 없는 고객은 이관할 수 없습니다."); return; }
            
            const d = new Date(); d.setMonth(d.getMonth() + 6);
            const endDateStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
            const targetBatch = app.desired_batch || '미정';
            const targetName = app.name || '이름없음';

            const { data: existingMember, error: checkErr } = await supabaseClient.from('members').select('*').eq('phone', app.phone).limit(1);
            if (checkErr) { showToast("멤버 조회 중 오류 발생"); return; }
            
            let dbErr;
            if (existingMember && existingMember.length > 0) {
                const { error: updateErr } = await supabaseClient.from('members').update({ status: '활동 중', end_date: endDateStr, batch: targetBatch, name: targetName }).eq('phone', app.phone);
                dbErr = updateErr;
            } else {
                const { error: insertErr } = await supabaseClient.from('members').insert([{ name: targetName, phone: app.phone, batch: targetBatch, status: '활동 중', end_date: endDateStr }]);
                dbErr = insertErr;
            }

            if(dbErr) { showToast(`이관 실패: members 테이블에 status 컬럼이 없습니다.`); return; }
            
            // 6개월 가입 결제 히스토리 삽입
            await supabaseClient.from('member_history').insert([{ 
                member_name: targetName, 
                member_phone: app.phone, 
                action_detail: '신규 가입 (6개월)', 
                amount: '1,650,000원' 
            }]);

            await supabaseClient.from('applications').update({ join_status: '가입 완료' }).eq('id', id);
            showToast("멤버 이관 및 내역 등록이 완료되었습니다."); window.fetchApplications(); window.fetchMembers();
        });
        return;
    }
    
    if (column === 'join_status' && value === '다음 기수 희망') {
        let nextBatch = app.desired_batch;
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

// 🔥 테이블 렌더링 (토글 버튼 높이 정렬 밸런스 유지)
window.renderAppTable = function(data) {
  const tbody = $("appTableBody"); tbody.innerHTML = '';
  if(data.length === 0) { tbody.innerHTML = `<tr><td colspan="8" class="empty-state">내역이 없습니다.</td></tr>`; return; }
  data.forEach(row => {
    const interestFull = row.interest_detail ? `${row.interest_area} <div class="sub-text">(${row.interest_detail})</div>` : (row.interest_area || '-');
    let routeDisplay = parseAcquisitionChannel(row.acquisition_channel);
    if (row.brand_awareness_duration && row.brand_awareness_duration !== '정보없음') routeDisplay += ` <div class="sub-text">(${row.brand_awareness_duration})</div>`; else if (row.acquisition_detail) routeDisplay += ` <div class="sub-text">(${row.acquisition_detail})</div>`;
    
    const cStat = statusClassMap[row.status] || 'st-wait'; const cJoin = joinClassMap[row.join_status || ''] || 'jn-none'; const dis = row.status === '상담 완료' ? '' : 'disabled'; 
    
    let timeBadgeHtml = '';
    let emptyJoinSpace = '';
    // 일정 수정 버튼이 있을 경우 옆 칸에 똑같은 높이의 투명한 여백 추가
    if(row.status === '상담 일정 확정' || row.status === '설문 완료') {
      let displayTime = (row.call_time && row.call_time !== 'null') ? row.call_time : '미정';
      timeBadgeHtml = `<div class="edit-schedule-link" onclick="window.openScheduleModal('${row.id}', '${displayTime}', '${row.counselor_name}')">상담 일정 수정</div>`;
      emptyJoinSpace = `<div style="font-size:13px; margin-top:4px; visibility:hidden; pointer-events:none;">-</div>`;
    }

    let hasSurvey = row.survey_job || row.survey_edu;
    let surveyBadge = hasSurvey ? `<span class="status-badge badge-orange" style="margin-right:8px; font-size:11px; padding:2px 6px;">설문완료</span>` : `<span class="status-badge badge-gray" style="margin-right:8px; font-size:11px; padding:2px 6px;">미응답</span>`;
    let nameHtml = `${surveyBadge}<strong style="cursor:pointer; color:var(--text-display); transition:0.2s;" onmouseover="this.style.color='var(--primary)'" onmouseout="this.style.color='var(--text-display)'" onclick="window.openCrmModal('${row.id}')">${row.name || '-'}</strong>`;

    let mPreview = `<td class="m-preview" onclick="this.closest('tr').classList.toggle('expanded')"><div class="m-prev-top"><span class="m-prev-date">${formatDtWithDow(row.created_at)}</span><span class="status-badge ${cStat}" style="margin:0 !important;">${row.status}</span></div><div class="m-prev-title">[${row.desired_batch || '-'}] ${row.name || '-'} <span style="font-size:13px; font-weight:500; color:var(--text-secondary); margin-left:4px;">(${row.phone || '-'})</span></div><div class="m-prev-desc">${row.interest_area || '-'}</div><span class="m-toggle-hint">상세 정보 보기 ▼</span></td>`;

    const tr = document.createElement('tr');
    tr.innerHTML = `${mPreview}<td data-label="신청일시">${formatDt(row.created_at)}</td><td data-label="기수">${row.desired_batch || '-'}</td><td data-label="성함">${nameHtml}</td><td data-label="연락처">${row.phone || '-'}</td><td data-label="관심 분야"><div>${interestFull}</div></td><td data-label="유입 경로"><div>${routeDisplay}</div></td><td data-label="상담 진행 상황"><div class="action-wrap"><select class="status-select ${cStat}" onchange="window.handleStatusChange('${row.id}', this.value, '${String(row.call_time || '')}', '${String(row.counselor_name || '')}')"><option value="대기" ${row.status === '대기' ? 'selected' : ''}>대기</option><option value="상담 일정 조율 중" ${row.status === '상담 일정 조율 중' ? 'selected' : ''}>상담 일정 조율 중</option><option value="상담 일정 확정" ${row.status === '상담 일정 확정' ? 'selected' : ''}>상담 일정 확정</option><option value="설문 완료" ${row.status === '설문 완료' ? 'selected' : ''}>설문 완료 (확정)</option><option value="상담 완료" ${row.status === '상담 완료' ? 'selected' : ''}>상담 완료</option><option value="연락 두절" ${row.status === '연락 두절' ? 'selected' : ''}>연락 두절</option></select>${timeBadgeHtml}</div></td><td data-label="가입 여부"><div class="action-wrap"><select class="status-select ${cJoin}" onchange="window.updateAppStatus('${row.id}', 'join_status', this.value)" ${dis}><option value="" ${!row.join_status ? 'selected' : ''}>선택 전</option><option value="고민 중" ${row.join_status === '고민 중' ? 'selected' : ''}>고민 중</option><option value="가입 완료" ${row.join_status === '가입 완료' ? 'selected' : ''}>가입 완료</option><option value="미가입" ${row.join_status === '미가입' ? 'selected' : ''}>미가입</option><option value="다음 기수 희망" ${row.join_status === '다음 기수 희망' ? 'selected' : ''}>다음 기수 희망</option></select>${emptyJoinSpace}</div></td>`;
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
  if (error || !data || data.length === 0) { body.innerHTML = '<div class="empty-state" style="color:var(--text-tertiary);">결제/연장 내역이 없습니다.</div>'; return; }
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
  if(type === 'applications') { data = globalApps; filename = "가입신청"; headers = ['신청일', '기수', '성함', '연락처', '관심분야', '유입경로', '진행상황', '가입여부', '상담일시', '담당자']; } else if(type === 'members') { globalMembers.forEach(m => m.batch = m.batch || '미정'); data = globalMembers; filename = "멤버리스트"; headers = ['등록일', '상태', '기수', '성함', '연락처', '활동종료일']; } else if(type === 'reservations') { data = gRes; filename = "예약현황"; headers = ['접수일', '기수', '성함', '연락처', '예약날짜', '예약시간', '센터', '장비', '상태', '취소사유']; } else if(type === 'trainings') { data = gTrn; filename = "수업훈련"; headers = ['신청일', '기수', '성함', '연락처', '콘텐츠', '상태', '취소사유']; } else if(type === 'orders') { data = gOrd; filename = "생두주문"; headers = ['주문일', '주문번호', '기수', '성함', '연락처', '생두사', '상품명', '수량', '총금액', '상태']; }
  if(data.length === 0) { showToast('다운로드할 데이터가 없습니다.'); return; }
  let csvContent = '\uFEFF' + headers.join(',') + '\n';
  data.forEach(d => {
    let row = [];
    if(type === 'applications') row = [formatDt(d.created_at), d.desired_batch, d.name, d.phone, d.interest_area, d.acquisition_channel, d.status, d.join_status, d.call_time, d.counselor_name]; else if(type === 'members') row = [formatDt(d.created_at), d.status, d.batch, d.name, d.phone, d.end_date]; else if(type === 'reservations') row = [formatDt(d.created_at), d.batch, d.name, d.phone, d.res_date, d.res_time, d.center, d.space_equip, d.status, d.cancel_reason]; else if(type === 'trainings') row = [formatDt(d.created_at), d.batch, d.name, d.phone, d.content, d.status, d.cancel_reason]; else if(type === 'orders') row = [formatDt(d.created_at), d.id, d.batch, d.name, d.phone, d.vendor, d.item_name, d.quantity, d.total_price, d.status];
    csvContent += row.map(item => { let text = String(item || ''); text = text.replace(/"/g, '""'); text = text.replace(/\n/g, ' '); return `"${text}"`; }).join(',') + '\n';
  });
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' }); const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `${filename}_${new Date().toISOString().slice(0,10)}.csv`; document.body.appendChild(link); link.click(); document.body.removeChild(link);
}
