// 全域待還款陣列 (本地快取)
let debtRepayments = JSON.parse(localStorage.getItem('wiz_debt_repayments')) || [];

function cleanDateStr(d) {
  if (!d) return '';
  return String(d).split('T')[0];
}

// 記錄類型：冇 type 一律當還款（兼容舊記錄）
window.debtRecordType = function(r) {
  return r && String(r.type || '').trim().toLowerCase() === 'adjust' ? 'adjust' : 'repay';
};

// 單筆借貸嘅完整狀態（fold 計法）：由原額開始，順住記錄次序行 —
// repay 逐條按佢自己嘅 currency 換返戶口貨幣扣減（冇 currency 當戶口貨幣）；
// adjust 直接將餘額 set 做佢存嘅金額（換返戶口貨幣），並成為之後顯示用嘅貨幣。
window.getTxDebtState = function(txId) {
  const tx = transactions.find(t => t.id === txId);
  debtRepayments = JSON.parse(localStorage.getItem('wiz_debt_repayments')) || [];
  const acc = tx ? accounts.find(a => a.id === tx.accountId) : null;
  const acctCur = acc ? acc.currency : 'CAD';
  const origAmt = tx ? parseFloat(tx.amount || 0) : 0;
  let remain = origAmt;
  let displayCur = acctCur;
  let hasAdjust = false;
  debtRepayments.filter(r => r && typeof r === 'object' && r.txId === txId).forEach(r => {
    const amt = parseFloat(r.amount || 0);
    const cur = String(r.currency || '').trim() || acctCur;
    if (window.debtRecordType(r) === 'adjust') {
      remain = convertAmount(amt, cur, acctCur);
      displayCur = cur;
      hasAdjust = true;
    } else {
      remain -= convertAmount(amt, cur, acctCur);
    }
  });
  const remainAmt = Math.max(0, remain);
  return {
    origAmt,
    acctCur,
    remainAmt,
    repaidAmt: Math.max(0, origAmt - remainAmt),
    displayCur,
    hasAdjust,
    remainDisplay: convertAmount(remainAmt, acctCur, displayCur)
  };
};

// 累計已補回金額（戶口貨幣）：fold 計法下 = 原額 − 而家餘額，維持舊有 caller 嘅語意
window.getTxRepaidAmount = function(txId) {
  return window.getTxDebtState(txId).repaidAmt;
};

// 貨幣下拉選單填充（還款／調整兩個 form 共用）
window.fillDebtCurrencySelect = function(sel, selected) {
  if (!sel) return;
  const list = (typeof SUPPORTED_CURRENCIES !== 'undefined' && Array.isArray(SUPPORTED_CURRENCIES))
    ? SUPPORTED_CURRENCIES.map(c => c.code)
    : ['CAD', 'USD', 'HKD', 'CNY', 'EUR'];
  sel.innerHTML = list.map(code => `<option value="${code}">${code}</option>`).join('');
  sel.value = list.includes(selected) ? selected : list[0];
};

// 判定交易是否屬於 Pending
window.isPendingTx = function(t) {
  return t.isPending === true || String(t.isPending).trim().toUpperCase() === 'TRUE';
};

// 內部借貸待補回視圖渲染（純 UI 改動：清單排版、齊頭式、圖示分類與純淨按鈕）
window.renderDebtTrackerView = function() {
  const container = document.getElementById('debt-cards-container');
  const summaryBadge = document.getElementById('debt-summary-badge');
  const overallProgressBar = document.getElementById('debt-overall-progress-bar');
  const overallProgressText = document.getElementById('debt-overall-progress-text');
  if (!container) return;

  container.innerHTML = '';
  
  // 撈出 Pending 交易並按日期倒序排列 (愈新在愈頂) - 邏輯維持原樣
  const pendingTxs = transactions
    .filter(window.isPendingTx)
    .sort((a, b) => new Date(cleanDateStr(b.date)) - new Date(cleanDateStr(a.date)));

  let totalRemainingInBase = 0;
  let totalOriginalInBase = 0;
  let totalRepaidInBase = 0;

  if (pendingTxs.length === 0) {
    container.innerHTML = '<p style="color:var(--text-muted); text-align:center; padding: 40px 0;">目前沒有任何待還借貸項目。</p>';
    if (summaryBadge) summaryBadge.innerText = '待還總額: 0.00';
    if (overallProgressBar) overallProgressBar.style.width = '0%';
    if (overallProgressText) overallProgressText.innerText = '共 0 項 · 整體已補回 0%';
    return;
  }

  // 建立外層白色圓角 Grouped List 容器
  const listWrapper = document.createElement('div');
  listWrapper.className = 'debt-grouped-list';

  pendingTxs.forEach(tx => {
    const state = getTxDebtState(tx.id);
    const origAmt = state.origAmt;
    const repaidAmt = state.repaidAmt;
    const remainAmt = state.remainAmt;
    const acc = accounts.find(a => a.id === tx.accountId);
    const accName = acc ? acc.name : '未知帳戶';
    const cur = state.acctCur;

    // 換算基準貨幣總結（純顯示）
    totalRemainingInBase += convertAmount(remainAmt, cur, baseCurrency);
    totalOriginalInBase += convertAmount(origAmt, cur, baseCurrency);
    totalRepaidInBase += convertAmount(repaidAmt, cur, baseCurrency);

    // 單筆已補回百分比
    const itemPercent = origAmt > 0 ? Math.min(100, Math.round((repaidAmt / origAmt) * 100)) : 0;

    // 分類圖示（沿用現有交易清單所用的圖示系統）
    const cat = categories.find(c => c.id === tx.categoryId);
    const catIconHtml = typeof catIcon === 'function' ? catIcon(cat, 18) : (cat?.icon || '🏷️');

    const row = document.createElement('div');
    row.className = 'debt-row-item';
    row.innerHTML = `
      <!-- 左邊：分類圖示圓角格仔 -->
      <div class="debt-cat-tile">
        ${catIconHtml}
      </div>

      <!-- 中間：四行資訊 -->
      <div class="debt-row-middle">
        <div class="debt-item-title">${tx.title || '借貸項目'}</div>
        <div class="debt-item-account">${accName} (${cur})</div>
        <div class="debt-item-date">${cleanDateStr(tx.date)}</div>
        <div class="debt-item-progress-wrap">
          <div class="debt-item-progress-track">
            <div class="debt-item-progress-bar" style="width: ${itemPercent}%;"></div>
          </div>
          <span class="debt-item-progress-text">已補回 ${itemPercent}%</span>
        </div>
      </div>

      <!-- 右邊：金額與操作按鈕 -->
      <div class="debt-row-right">
        <div class="debt-outstanding-amt">${fmtCur(state.remainDisplay, state.displayCur)}</div>
        <div class="debt-action-buttons">
          <button type="button" class="debt-btn-circle secondary" onclick="openRepayLogModal('${tx.id}')" title="查看記錄">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>
          </button>
          <button type="button" class="debt-btn-circle primary" onclick="openQuickRepayModal('${tx.id}')" title="補回">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>
          </button>
        </div>
      </div>
    `;
    listWrapper.appendChild(row);
  });

  container.appendChild(listWrapper);

  // 更新標題待還總額
  if (summaryBadge) {
    summaryBadge.innerText = `待還總額: ${fmtCur(totalRemainingInBase, baseCurrency)}`;
  }

  // 更新整體進度條與說明文字（純顯示，防除以 0）
  const overallPercent = totalOriginalInBase > 0 ? Math.min(100, Math.round((totalRepaidInBase / totalOriginalInBase) * 100)) : 0;
  if (overallProgressBar) {
    overallProgressBar.style.width = `${overallPercent}%`;
  }
  if (overallProgressText) {
    overallProgressText.innerText = `共 ${pendingTxs.length} 項 · 整體已補回 ${overallPercent}%`;
  }
};

// 支援完整彈窗編輯（金額、日期、備註）- 保持原樣
window.openQuickRepayModal = function(txId, editRepayId = null) {
  document.getElementById('repay-target-tx-id').value = txId;
  let editingIdInput = document.getElementById('repay-edit-id');
  if (!editingIdInput) {
    editingIdInput = document.createElement('input');
    editingIdInput.type = 'hidden';
    editingIdInput.id = 'repay-edit-id';
    document.getElementById('quick-repay-modal').querySelector('.modal-body').appendChild(editingIdInput);
  }

  if (editRepayId) {
    debtRepayments = JSON.parse(localStorage.getItem('wiz_debt_repayments')) || [];
    const record = debtRepayments.find(r => r.id === editRepayId);
    if (!record) return;
    // adjust 記錄唔應該入還款 form，轉去調整 form（保險：正常入口已經喺 editRepayRecord 分流）
    if (window.debtRecordType(record) === 'adjust') {
      window.openAdjustModal(txId, editRepayId);
      return;
    }
    editingIdInput.value = editRepayId;
    document.getElementById('repay-amount').value = record.amount;
    document.getElementById('repay-note').value = record.note || '';
    document.getElementById('repay-date').value = cleanDateStr(record.date);
    window.fillDebtCurrencySelect(document.getElementById('repay-currency'), record.currency || window.getTxDebtState(txId).acctCur);
    document.querySelector('#quick-repay-modal .modal-header span').innerText = '編輯還款記錄';
  } else {
    editingIdInput.value = '';
    document.getElementById('repay-amount').value = '';
    document.getElementById('repay-note').value = '';
    document.getElementById('repay-date').value = new Date().toISOString().split('T')[0];
    // 新還款預設跟顯示貨幣（做咗換算就係換算後嗰隻，否則戶口貨幣）
    window.fillDebtCurrencySelect(document.getElementById('repay-currency'), window.getTxDebtState(txId).displayCur);
    document.querySelector('#quick-repay-modal .modal-header span').innerText = '記錄還款';
  }

  openModal('quick-repay-modal');
};

window.saveQuickRepayment = function() {
  const txId = document.getElementById('repay-target-tx-id').value;
  const editId = document.getElementById('repay-edit-id') ? document.getElementById('repay-edit-id').value : '';
  const amount = parseFloat(document.getElementById('repay-amount').value);
  const note = document.getElementById('repay-note').value.trim() || '分期還款';
  const date = document.getElementById('repay-date').value || new Date().toISOString().split('T')[0];
  const currencySel = document.getElementById('repay-currency');
  const currency = currencySel && currencySel.value ? currencySel.value : window.getTxDebtState(txId).acctCur;

  if (isNaN(amount) || amount <= 0) {
    alert('請填寫有效還款金額！');
    return;
  }

  debtRepayments = JSON.parse(localStorage.getItem('wiz_debt_repayments')) || [];

  if (editId) {
    const idx = debtRepayments.findIndex(r => r.id === editId);
    if (idx !== -1) {
      debtRepayments[idx] = { ...debtRepayments[idx], amount, note, date, type: 'repay', currency };
    }
  } else {
    debtRepayments.push({
      id: 'rep-' + Date.now(),
      txId,
      date,
      amount,
      note,
      type: 'repay',
      currency
    });
  }

  localStorage.setItem('wiz_debt_repayments', JSON.stringify(debtRepayments));

  const tx = transactions.find(t => t.id === txId);
  if (tx) {
    if (window.getTxDebtState(txId).remainAmt <= 0.01) {
      if (confirm('此筆大數已全數還清！是否取消該筆交易的 Pending 標記？')) {
        tx.isPending = false;
      }
    } else {
      tx.isPending = true;
    }
  }

  closeModal('quick-repay-modal');
  saveData();
  renderDebtTrackerView();
  
  const repayLogModal = document.getElementById('repay-log-modal');
  if (repayLogModal && repayLogModal.classList.contains('open')) {
    openRepayLogModal(txId);
  }
};

window.openRepayLogModal = function(txId) {
  const container = document.getElementById('repay-log-list');
  if (!container) return;
  container.innerHTML = '';

  debtRepayments = JSON.parse(localStorage.getItem('wiz_debt_repayments')) || [];
  const logs = debtRepayments.filter(r => r && typeof r === 'object' && r.txId === txId).sort((a, b) => new Date(cleanDateStr(b.date)) - new Date(cleanDateStr(a.date)));

  // 頂部總結（純顯示：原額／已補回／仲差，數字全部來自現有資料與 getTxRepaidAmount）
  // 注意：要等記錄列表 render 完先插入最頂，因為空記錄嗰句會用 innerHTML 成個 container 洗版
  let summaryEl = null;
  const tx = transactions.find(t => t.id === txId);
  if (tx) {
    const state = window.getTxDebtState(txId);
    // 總結三格統一用顯示貨幣（冇 adjust 時即係戶口貨幣，同舊版一樣），三格先加得返埋
    const sumCur = state.displayCur;
    const sumOrig = convertAmount(state.origAmt, state.acctCur, sumCur);
    const sumRepaid = convertAmount(state.repaidAmt, state.acctCur, sumCur);
    const sumRemain = state.remainDisplay;
    const summary = document.createElement('div');
    summary.style.cssText = 'display:flex; text-align:center; background:#FAFAF8; border:1px solid #F0EFEA; border-radius:10px; padding:10px 6px; margin-bottom:10px;';
    summary.innerHTML = `
      <div style="flex:1;">
        <div style="font-size:10.5px; color:var(--text-muted);">原額</div>
        <div style="font-size:13.5px; font-weight:700; margin-top:2px;">${fmtCur(sumOrig, sumCur)}</div>
      </div>
      <div style="flex:1; border-left:1px solid #EFEDE8;">
        <div style="font-size:10.5px; color:var(--text-muted);">已補回</div>
        <div style="font-size:13.5px; font-weight:700; margin-top:2px; color:#2D6A4F;">${fmtCur(sumRepaid, sumCur)}</div>
      </div>
      <div style="flex:1; border-left:1px solid #EFEDE8;">
        <div style="font-size:10.5px; color:var(--text-muted);">仲差</div>
        <div style="font-size:13.5px; font-weight:700; margin-top:2px; color:#D95D5D;">${fmtCur(sumRemain, sumCur)}</div>
      </div>
    `;
    summaryEl = summary;
  }

  if (logs.length === 0) {
    container.innerHTML = '<p style="color:var(--text-muted); text-align:center; padding: 20px 0;">尚無任何還款記錄</p>';
  } else {
    const logAcctCur = window.getTxDebtState(txId).acctCur;
    logs.forEach(log => {
      const row = document.createElement('div');
      row.style.cssText = 'display:flex; justify-content:space-between; align-items:center; padding:8px 4px; border-bottom:1px solid #F2F2F7; font-size:13px;';
      const logCur = String(log.currency || '').trim() || logAcctCur;
      if (window.debtRecordType(log) === 'adjust') {
        row.innerHTML = `
        <div>
          <div style="font-weight:600;">餘額調整（換算）</div>
          <div style="font-size:11px; color:var(--text-muted);">${cleanDateStr(log.date)}${log.note && log.note !== '餘額調整（換算）' ? ' · ' + log.note : ''}</div>
        </div>
        <div style="display:flex; align-items:center; gap:8px;">
          <span style="font-weight:700; color:#B7791F;">→ ${fmtCur(parseFloat(log.amount || 0), logCur)}</span>
          <button type="button" style="background:none; border:none; cursor:pointer;" onclick="editRepayRecord('${log.id}')" title="編輯">${uiIcon('pencil', 14)}</button>
          <button type="button" style="background:none; border:none; cursor:pointer;" onclick="deleteRepayRecord('${log.id}', '${txId}')" title="刪除">${uiIcon('trash', 14)}</button>
        </div>
      `;
      } else {
        row.innerHTML = `
        <div>
          <div style="font-weight:600;">${log.note || '分期還款'}</div>
          <div style="font-size:11px; color:var(--text-muted);">${cleanDateStr(log.date)}</div>
        </div>
        <div style="display:flex; align-items:center; gap:8px;">
          <span style="font-weight:700; color:#2D6A4F;">+${fmtCur(parseFloat(log.amount || 0), logCur)}</span>
          <button type="button" style="background:none; border:none; cursor:pointer;" onclick="editRepayRecord('${log.id}')" title="編輯">${uiIcon('pencil', 14)}</button>
          <button type="button" style="background:none; border:none; cursor:pointer;" onclick="deleteRepayRecord('${log.id}', '${txId}')" title="刪除">${uiIcon('trash', 14)}</button>
        </div>
      `;
      }
      container.appendChild(row);
    });
  }

  if (summaryEl) container.insertBefore(summaryEl, container.firstChild);

  // 「調整餘額」入口：總結下面加一個掣，開換算 form（將餘額直接 set 做指定貨幣金額）
  const adjustBtnWrap = document.createElement('div');
  adjustBtnWrap.style.cssText = 'margin-bottom:10px;';
  adjustBtnWrap.innerHTML = `<button type="button" onclick="openAdjustModal('${txId}')" style="width:100%; padding:8px 0; background:none; border:1px dashed #C9C4B8; border-radius:10px; color:inherit; font-size:13px; cursor:pointer;">＋ 調整餘額（換算）</button>`;
  if (summaryEl && summaryEl.nextSibling) container.insertBefore(adjustBtnWrap, summaryEl.nextSibling);
  else if (summaryEl) container.appendChild(adjustBtnWrap);
  else container.insertBefore(adjustBtnWrap, container.firstChild);

  openModal('repay-log-modal');
};

window.editRepayRecord = function(repayId) {
  debtRepayments = JSON.parse(localStorage.getItem('wiz_debt_repayments')) || [];
  const record = debtRepayments.find(r => r.id === repayId);
  if (!record) return;
  if (window.debtRecordType(record) === 'adjust') {
    window.openAdjustModal(record.txId, repayId);
  } else {
    openQuickRepayModal(record.txId, repayId);
  }
};

window.deleteRepayRecord = function(repayId, txId) {
  if (!confirm('確定刪除這筆還款記錄？')) return;
  debtRepayments = JSON.parse(localStorage.getItem('wiz_debt_repayments')) || [];
  debtRepayments = debtRepayments.filter(r => r.id !== repayId);
  localStorage.setItem('wiz_debt_repayments', JSON.stringify(debtRepayments));

  const tx = transactions.find(t => t.id === txId);
  if (tx && getTxRepaidAmount(txId) < parseFloat(tx.amount)) {
    tx.isPending = true;
  }

  saveData();
  openRepayLogModal(txId);
  renderDebtTrackerView();
};
// ===== 調整餘額（換算）：將餘額直接 set 做指定貨幣金額，寫一條 type=adjust 記錄，唔掂 transaction 本身 =====
window.openAdjustModal = function(txId, editId = null) {
  document.getElementById('adjust-target-tx-id').value = txId;
  document.getElementById('adjust-edit-id').value = editId || '';
  const state = window.getTxDebtState(txId);

  if (editId) {
    debtRepayments = JSON.parse(localStorage.getItem('wiz_debt_repayments')) || [];
    const record = debtRepayments.find(r => r.id === editId);
    if (!record) return;
    document.getElementById('adjust-amount').value = record.amount;
    document.getElementById('adjust-note').value = (record.note && record.note !== '餘額調整（換算）') ? record.note : '';
    document.getElementById('adjust-date').value = cleanDateStr(record.date);
    window.fillDebtCurrencySelect(document.getElementById('adjust-currency'), record.currency || state.acctCur);
    document.querySelector('#adjust-balance-modal .modal-header span').innerText = '編輯餘額調整';
  } else {
    document.getElementById('adjust-amount').value = '';
    document.getElementById('adjust-note').value = '';
    document.getElementById('adjust-date').value = new Date().toISOString().split('T')[0];
    window.fillDebtCurrencySelect(document.getElementById('adjust-currency'), state.displayCur);
    document.querySelector('#adjust-balance-modal .modal-header span').innerText = '調整餘額（換算）';
  }

  const amtEl = document.getElementById('adjust-amount');
  const curEl = document.getElementById('adjust-currency');
  if (amtEl) amtEl.oninput = window.updateAdjustPreview;
  if (curEl) curEl.onchange = window.updateAdjustPreview;
  window.updateAdjustPreview();
  openModal('adjust-balance-modal');
};

window.updateAdjustPreview = function() {
  const previewEl = document.getElementById('adjust-preview');
  if (!previewEl) return;
  const txId = document.getElementById('adjust-target-tx-id').value;
  const state = window.getTxDebtState(txId);
  const curSel = document.getElementById('adjust-currency');
  const cur = curSel && curSel.value ? curSel.value : state.acctCur;
  const amount = parseFloat(document.getElementById('adjust-amount').value);
  if (isNaN(amount)) {
    previewEl.innerText = `而家餘額：${fmtCur(state.remainDisplay, state.displayCur)}`;
    return;
  }
  if (cur === state.acctCur) {
    previewEl.innerText = `儲存後餘額會 set 做 ${fmtCur(amount, cur)}（同戶口貨幣，唔使換算）`;
    return;
  }
  const converted = convertAmount(amount, cur, state.acctCur);
  const rate = convertAmount(1, cur, state.acctCur);
  previewEl.innerText = `儲存後餘額 ≈ ${fmtCur(converted, state.acctCur)}（匯率 1 ${cur} ≈ ${rate.toLocaleString('en-US', { maximumFractionDigits: 4 })} ${state.acctCur}）`;
};

window.saveAdjustBalance = function() {
  const txId = document.getElementById('adjust-target-tx-id').value;
  const editId = document.getElementById('adjust-edit-id').value;
  const amount = parseFloat(document.getElementById('adjust-amount').value);
  const curSel = document.getElementById('adjust-currency');
  const currency = curSel && curSel.value ? curSel.value : window.getTxDebtState(txId).acctCur;
  const note = document.getElementById('adjust-note').value.trim() || '餘額調整（換算）';
  const date = document.getElementById('adjust-date').value || new Date().toISOString().split('T')[0];

  if (isNaN(amount) || amount < 0) {
    alert('請填寫有效嘅剩餘金額（可以係 0）！');
    return;
  }

  debtRepayments = JSON.parse(localStorage.getItem('wiz_debt_repayments')) || [];

  if (editId) {
    const idx = debtRepayments.findIndex(r => r.id === editId);
    if (idx !== -1) {
      debtRepayments[idx] = { ...debtRepayments[idx], amount, currency, note, date, type: 'adjust' };
    }
  } else {
    debtRepayments.push({
      id: 'adj-' + Date.now(),
      txId,
      date,
      amount,
      currency,
      note,
      type: 'adjust'
    });
  }

  localStorage.setItem('wiz_debt_repayments', JSON.stringify(debtRepayments));

  const tx = transactions.find(t => t.id === txId);
  if (tx) {
    if (window.getTxDebtState(txId).remainAmt <= 0.01) {
      if (confirm('此筆大數已全數還清！是否取消該筆交易的 Pending 標記？')) {
        tx.isPending = false;
      }
    } else {
      tx.isPending = true;
    }
  }

  closeModal('adjust-balance-modal');
  saveData();
  renderDebtTrackerView();

  const repayLogModal = document.getElementById('repay-log-modal');
  if (repayLogModal && repayLogModal.classList.contains('open')) {
    openRepayLogModal(txId);
  }
};
