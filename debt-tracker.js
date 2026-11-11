// 全域待還款陣列 (本地快取)
let debtRepayments = JSON.parse(localStorage.getItem('wiz_debt_repayments')) || [];

function cleanDateStr(d) {
  if (!d) return '';
  return String(d).split('T')[0];
}

// 計算特定交易的累計已還金額
window.getTxRepaidAmount = function(txId) {
  debtRepayments = JSON.parse(localStorage.getItem('wiz_debt_repayments')) || [];
  return debtRepayments
    .filter(r => r.txId === txId)
    .reduce((sum, r) => sum + parseFloat(r.amount || 0), 0);
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
    const origAmt = parseFloat(tx.amount || 0);
    const repaidAmt = getTxRepaidAmount(tx.id);
    const remainAmt = Math.max(0, origAmt - repaidAmt);
    const acc = accounts.find(a => a.id === tx.accountId);
    const accName = acc ? acc.name : '未知帳戶';
    const cur = acc ? acc.currency : 'CAD';

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
        <div class="debt-outstanding-amt">${fmtCur(remainAmt, cur)}</div>
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
    editingIdInput.value = editRepayId;
    document.getElementById('repay-amount').value = record.amount;
    document.getElementById('repay-note').value = record.note || '';
    document.getElementById('repay-date').value = cleanDateStr(record.date);
    document.querySelector('#quick-repay-modal .modal-header span').innerText = '編輯還款記錄';
  } else {
    editingIdInput.value = '';
    document.getElementById('repay-amount').value = '';
    document.getElementById('repay-note').value = '';
    document.getElementById('repay-date').value = new Date().toISOString().split('T')[0];
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

  if (isNaN(amount) || amount <= 0) {
    alert('請填寫有效還款金額！');
    return;
  }

  debtRepayments = JSON.parse(localStorage.getItem('wiz_debt_repayments')) || [];

  if (editId) {
    const idx = debtRepayments.findIndex(r => r.id === editId);
    if (idx !== -1) {
      debtRepayments[idx] = { ...debtRepayments[idx], amount, note, date };
    }
  } else {
    debtRepayments.push({
      id: 'rep-' + Date.now(),
      txId,
      date,
      amount,
      note
    });
  }

  localStorage.setItem('wiz_debt_repayments', JSON.stringify(debtRepayments));

  const tx = transactions.find(t => t.id === txId);
  if (tx) {
    const totalRepaid = getTxRepaidAmount(txId);
    if (totalRepaid >= parseFloat(tx.amount)) {
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
  const logs = debtRepayments.filter(r => r.txId === txId).sort((a, b) => new Date(cleanDateStr(b.date)) - new Date(cleanDateStr(a.date)));

  // 頂部總結（純顯示：原額／已補回／仲差，數字全部來自現有資料與 getTxRepaidAmount）
  // 注意：要等記錄列表 render 完先插入最頂，因為空記錄嗰句會用 innerHTML 成個 container 洗版
  let summaryEl = null;
  const tx = transactions.find(t => t.id === txId);
  if (tx) {
    const origAmt = parseFloat(tx.amount || 0);
    const repaidAmt = getTxRepaidAmount(txId);
    const remainAmt = Math.max(0, origAmt - repaidAmt);
    const acc = accounts.find(a => a.id === tx.accountId);
    const cur = acc ? acc.currency : 'CAD';
    const summary = document.createElement('div');
    summary.style.cssText = 'display:flex; text-align:center; background:#FAFAF8; border:1px solid #F0EFEA; border-radius:10px; padding:10px 6px; margin-bottom:10px;';
    summary.innerHTML = `
      <div style="flex:1;">
        <div style="font-size:10.5px; color:var(--text-muted);">原額</div>
        <div style="font-size:13.5px; font-weight:700; margin-top:2px;">${fmtCur(origAmt, cur)}</div>
      </div>
      <div style="flex:1; border-left:1px solid #EFEDE8;">
        <div style="font-size:10.5px; color:var(--text-muted);">已補回</div>
        <div style="font-size:13.5px; font-weight:700; margin-top:2px; color:#2D6A4F;">${fmtCur(repaidAmt, cur)}</div>
      </div>
      <div style="flex:1; border-left:1px solid #EFEDE8;">
        <div style="font-size:10.5px; color:var(--text-muted);">仲差</div>
        <div style="font-size:13.5px; font-weight:700; margin-top:2px; color:#D95D5D;">${fmtCur(remainAmt, cur)}</div>
      </div>
    `;
    summaryEl = summary;
  }

  if (logs.length === 0) {
    container.innerHTML = '<p style="color:var(--text-muted); text-align:center; padding: 20px 0;">尚無任何還款記錄</p>';
  } else {
    logs.forEach(log => {
      const row = document.createElement('div');
      row.style.cssText = 'display:flex; justify-content:space-between; align-items:center; padding:8px 4px; border-bottom:1px solid #F2F2F7; font-size:13px;';
      row.innerHTML = `
        <div>
          <div style="font-weight:600;">${log.note || '分期還款'}</div>
          <div style="font-size:11px; color:var(--text-muted);">${cleanDateStr(log.date)}</div>
        </div>
        <div style="display:flex; align-items:center; gap:8px;">
          <span style="font-weight:700; color:#2D6A4F;">+${parseFloat(log.amount).toFixed(2)}</span>
          <button type="button" style="background:none; border:none; cursor:pointer;" onclick="editRepayRecord('${log.id}')" title="編輯">${uiIcon('pencil', 14)}</button>
          <button type="button" style="background:none; border:none; cursor:pointer;" onclick="deleteRepayRecord('${log.id}', '${txId}')" title="刪除">${uiIcon('trash', 14)}</button>
        </div>
      `;
      container.appendChild(row);
    });
  }

  if (summaryEl) container.insertBefore(summaryEl, container.firstChild);

  openModal('repay-log-modal');
};

window.editRepayRecord = function(repayId) {
  debtRepayments = JSON.parse(localStorage.getItem('wiz_debt_repayments')) || [];
  const record = debtRepayments.find(r => r.id === repayId);
  if (!record) return;
  openQuickRepayModal(record.txId, repayId);
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