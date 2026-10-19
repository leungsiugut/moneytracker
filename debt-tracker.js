// 全域待還款陣列 (本地快取)
let debtRepayments = JSON.parse(localStorage.getItem('wiz_debt_repayments')) || [];

// 計算特定交易的累計已還金額
window.getTxRepaidAmount = function(txId) {
  return debtRepayments
    .filter(r => r.txId === txId)
    .reduce((sum, r) => sum + parseFloat(r.amount || 0), 0);
};

// 渲染內部借貸專屬視圖
window.renderDebtTrackerView = function() {
  const container = document.getElementById('debt-cards-container');
  const summaryBadge = document.getElementById('debt-summary-badge');
  if (!container) return;

  container.innerHTML = '';
  const pendingTxs = transactions.filter(t => t.isPending);

  let totalRemaining = 0;

  if (pendingTxs.length === 0) {
    container.innerHTML = '<p style="color:var(--text-muted); text-align:center; padding: 40px 0;">🎉 太棒了！目前沒有任何待還借貸項目。</p>';
    if (summaryBadge) summaryBadge.innerText = '待還總額: $0.00';
    return;
  }

  pendingTxs.forEach(tx => {
    const origAmt = parseFloat(tx.amount || 0);
    const repaidAmt = getTxRepaidAmount(tx.id);
    const remainAmt = Math.max(0, origAmt - repaidAmt);
    const acc = accounts.find(a => a.id === tx.accountId);
    const cur = acc ? acc.currency : 'CAD';

    totalRemaining += convertAmount(remainAmt, cur, baseCurrency);

    const card = document.createElement('div');
    card.className = 'debt-card';
    card.innerHTML = `
      <div class="debt-card-header">
        <span class="debt-card-title">${tx.title || '借貸項目'}</span>
        <span class="debt-card-date">${tx.date}</span>
      </div>
      <div class="debt-stats-row">
        <div>原額: <b>${fmtCur(origAmt, cur)}</b></div>
        <div>已還: <b>${fmtCur(repaidAmt, cur)}</b></div>
        <div>剩餘: <span class="debt-stat-val remain">${fmtCur(remainAmt, cur)}</span></div>
      </div>
      <div style="display:flex; justify-content:flex-end; gap:8px;">
        <button class="btn-action btn-secondary" onclick="openRepayLogModal('${tx.id}')">查看記錄</button>
        <button class="btn-action" onclick="openQuickRepayModal('${tx.id}', ${remainAmt})">快速還款</button>
      </div>
    `;
    container.appendChild(card);
  });

  if (summaryBadge) {
    summaryBadge.innerText = `待還總額: ${fmtCur(totalRemaining, baseCurrency)}`;
  }
};

// 打開快速還款 Modal
window.openQuickRepayModal = function(txId, remainAmt) {
  document.getElementById('repay-target-tx-id').value = txId;
  document.getElementById('repay-amount').value = Number(remainAmt).toFixed(2);
  document.getElementById('repay-note').value = '';
  document.getElementById('repay-date').value = new Date().toISOString().split('T')[0];
  openModal('quick-repay-modal');
};

// 儲存快速還款紀錄
window.saveQuickRepayment = function() {
  const txId = document.getElementById('repay-target-tx-id').value;
  const amount = parseFloat(document.getElementById('repay-amount').value);
  const note = document.getElementById('repay-note').value.trim() || '分期還款';
  const date = document.getElementById('repay-date').value || new Date().toISOString().split('T')[0];

  if (isNaN(amount) || amount <= 0) {
    alert('請填寫有效還款金額！');
    return;
  }

  const newRepayment = {
    id: 'rep-' + Date.now(),
    txId,
    date,
    amount,
    note
  };

  debtRepayments.push(newRepayment);
  localStorage.setItem('wiz_debt_repayments', JSON.stringify(debtRepayments));

  // 檢查是否已還清
  const tx = transactions.find(t => t.id === txId);
  if (tx) {
    const totalRepaid = getTxRepaidAmount(txId);
    if (totalRepaid >= parseFloat(tx.amount)) {
      if (confirm('🎉 呢筆大數已全數還清！是否取消該筆交易的 Pending 標記？')) {
        tx.isPending = false;
      }
    }
  }

  closeModal('quick-repay-modal');
  saveData();
  renderDebtTrackerView();
};

// 打開還款歷史明細 Modal
window.openRepayLogModal = function(txId) {
  const container = document.getElementById('repay-log-list');
  if (!container) return;
  container.innerHTML = '';

  const logs = debtRepayments.filter(r => r.txId === txId).sort((a, b) => new Date(b.date) - new Date(a.date));

  if (logs.length === 0) {
    container.innerHTML = '<p style="color:var(--text-muted); text-align:center; padding: 20px 0;">尚無任何還款記錄</p>';
  } else {
    logs.forEach(log => {
      const row = document.createElement('div');
      row.style.cssText = 'display:flex; justify-content:space-between; align-items:center; padding:8px 4px; border-bottom:1px solid #F2F2F7; font-size:13px;';
      row.innerHTML = `
        <div>
          <div style="font-weight:600;">${log.note || '分期還款'}</div>
          <div style="font-size:11px; color:var(--text-muted);">${log.date}</div>
        </div>
        <div style="font-weight:700; color:#2D6A4F;">+$${parseFloat(log.amount).toFixed(2)}</div>
      `;
      container.appendChild(row);
    });
  }

  openModal('repay-log-modal');
};