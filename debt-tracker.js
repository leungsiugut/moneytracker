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

// 模組 3：借貸看板卡片排版、日期排序（由新至舊）與文字簡化
window.renderDebtTrackerView = function() {
  const container = document.getElementById('debt-cards-container');
  const summaryBadge = document.getElementById('debt-summary-badge');
  if (!container) return;

  container.innerHTML = '';
  
  // 撈出 Pending 交易並按日期倒序排列 (愈新在愈頂)
  const pendingTxs = transactions
    .filter(window.isPendingTx)
    .sort((a, b) => new Date(cleanDateStr(b.date)) - new Date(cleanDateStr(a.date)));

  let totalRemaining = 0;

  if (pendingTxs.length === 0) {
    container.innerHTML = '<p style="color:var(--text-muted); text-align:center; padding: 40px 0;">🎉 目前沒有任何待還借貸項目。</p>';
    if (summaryBadge) summaryBadge.innerText = '待還總額: $0.00';
    return;
  }

  pendingTxs.forEach(tx => {
    const origAmt = parseFloat(tx.amount || 0);
    const repaidAmt = getTxRepaidAmount(tx.id);
    const remainAmt = Math.max(0, origAmt - repaidAmt);
    const acc = accounts.find(a => a.id === tx.accountId);
    const accName = acc ? acc.name : '未知帳戶';
    const cur = acc ? acc.currency : 'CAD';

    totalRemaining += convertAmount(remainAmt, cur, baseCurrency);

    const card = document.createElement('div');
    card.className = 'debt-card';
    card.innerHTML = `
      <div class="debt-card-header" style="margin-bottom: 4px;">
        <span class="debt-card-title">${tx.title || '借貸項目'}</span>
        <span class="debt-card-date">${cleanDateStr(tx.date)}</span>
      </div>
      <!-- 直接顯示來源帳戶與幣種，拔除「所屬帳戶:」字眼 -->
      <div style="font-size: 11.5px; color: var(--text-muted); margin-bottom: 10px;">
        ${accName} (${cur})
      </div>
      <div class="debt-stats-container" style="border-top:1px dashed var(--border-color); border-bottom:1px dashed var(--border-color); padding: 8px 0; margin-bottom: 12px; font-size: 12.5px; display: flex; flex-direction: column; gap: 4px;">
        <div style="display:flex; justify-content:space-between;">
          <span>原額: <b>${fmtCur(origAmt, cur)}</b></span>
          <span>剩餘: <span class="debt-stat-val remain" style="color:#D95D5D; font-weight:800;">${fmtCur(remainAmt, cur)}</span></span>
        </div>
        <div style="display:flex; justify-content:space-between; color: #2D6A4F;">
          <span>已還款: <b>${fmtCur(repaidAmt, cur)}</b></span>
        </div>
      </div>
      <div style="display:flex; justify-content:flex-end; gap:8px;">
        <button class="btn-action btn-secondary" onclick="openRepayLogModal('${tx.id}')">查看記錄</button>
        <button class="btn-action" onclick="openQuickRepayModal('${tx.id}')">快速還款</button>
      </div>
    `;
    container.appendChild(card);
  });

  if (summaryBadge) {
    summaryBadge.innerText = `待還總額: ${fmtCur(totalRemaining, baseCurrency)}`;
  }
};

// 支援完整彈窗編輯（金額、日期、備註）
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
      if (confirm('🎉 此筆大數已全數還清！是否取消該筆交易的 Pending 標記？')) {
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
          <span style="font-weight:700; color:#2D6A4F;">+$${parseFloat(log.amount).toFixed(2)}</span>
          <button type="button" style="background:none; border:none; cursor:pointer;" onclick="editRepayRecord('${log.id}')" title="編輯">✏️</button>
          <button type="button" style="background:none; border:none; cursor:pointer;" onclick="deleteRepayRecord('${log.id}', '${txId}')" title="刪除">🗑️</button>
        </div>
      `;
      container.appendChild(row);
    });
  }

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