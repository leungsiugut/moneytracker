// 全域帳單陣列
let creditStatements = JSON.parse(localStorage.getItem('wiz_credit_statements')) || [];

// 在切換帳戶時，控制「📑 對帳單」按鈕僅在信用卡帳戶顯示
window.checkStatementButtonVisibility = function(currentAcc) {
  const btn = document.getElementById('btn-statement-entry');
  if (!btn) return;
  btn.style.display = (currentAcc && currentAcc.type === 'credit') ? 'inline-flex' : 'none';
};

// 打開對帳單 Modal
window.openStatementModal = function() {
  const currentAcc = accounts.find(a => a.id === currentAccountId);
  if (!currentAcc) return;

  const today = new Date();
  const defaultName = `${today.getFullYear()}年${today.getMonth() + 1}月帳單`;
  document.getElementById('stmt-name').value = defaultName;
  document.getElementById('stmt-due-date').value = '';
  document.getElementById('stmt-target-amount').value = '';

  const toDateStr = today.toISOString().split('T')[0];
  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - 30);
  const fromDateStr = fromDate.toISOString().split('T')[0];

  document.getElementById('stmt-to-date').value = toDateStr;
  document.getElementById('stmt-from-date').value = fromDateStr;

  filterStatementTxs();
  openModal('statement-modal');
};

// 根據日期區間篩選交易
window.filterStatementTxs = function() {
  const currentAcc = accounts.find(a => a.id === currentAccountId);
  if (!currentAcc) return;

  const fromDate = document.getElementById('stmt-from-date').value;
  const toDate = document.getElementById('stmt-to-date').value;

  let unbilledTxs = transactions.filter(t => 
    t.accountId === currentAcc.id && 
    t.type === 'expense' && 
    !t.statementId
  );

  if (fromDate) {
    unbilledTxs = unbilledTxs.filter(t => normalizeDateString(t.date) >= fromDate);
  }
  if (toDate) {
    unbilledTxs = unbilledTxs.filter(t => normalizeDateString(t.date) <= toDate);
  }

  unbilledTxs.sort((a, b) => new Date(a.date) - new Date(b.date));

  const listContainer = document.getElementById('stmt-tx-checklist');
  if (!listContainer) return;
  listContainer.innerHTML = '';

  if (unbilledTxs.length === 0) {
    listContainer.innerHTML = '<p style="color:var(--text-muted); text-align:center; padding: 20px 0; font-size:12.5px;">此日期區間無未結算的信用卡支出</p>';
  } else {
    unbilledTxs.forEach(t => {
      const row = document.createElement('div');
      row.style.cssText = 'display:flex; justify-content:space-between; align-items:center; padding:6px 4px; border-bottom:1px solid #F5F5F7;';
      row.innerHTML = `
        <label style="display:flex; align-items:center; gap:8px; font-size:12.5px; cursor:pointer; flex:1; min-width:0;">
          <input type="checkbox" class="stmt-check-item" value="${t.id}" data-amount="${t.amount}" checked onchange="updateStmtCheckSum()">
          <span style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${normalizeDateString(t.date)} · ${t.title}</span>
        </label>
        <span style="font-weight:700; font-size:12.5px; margin-left:8px; white-space:nowrap;">$${parseFloat(t.amount).toFixed(2)}</span>
      `;
      listContainer.appendChild(row);
    });
  }

  updateStmtCheckSum();
};

// 一鍵全選 / 取消全選
window.toggleAllStmtTxs = function() {
  const checkboxes = document.querySelectorAll('.stmt-check-item');
  if (checkboxes.length === 0) return;
  const anyUnchecked = Array.from(checkboxes).some(cb => !cb.checked);
  checkboxes.forEach(cb => { cb.checked = anyUnchecked; });
  updateStmtCheckSum();
};

// 動態加總勾選金額
window.updateStmtCheckSum = function() {
  let sum = 0;
  document.querySelectorAll('.stmt-check-item:checked').forEach(cb => {
    sum += parseFloat(cb.dataset.amount || 0);
  });
  const target = parseFloat(document.getElementById('stmt-target-amount').value) || 0;
  const summaryEl = document.getElementById('stmt-calc-summary');
  if (!summaryEl) return;
  
  const isMatch = target > 0 && Math.abs(sum - target) < 0.01;
  summaryEl.innerHTML = `已勾選: <b>$${sum.toFixed(2)}</b> ${isMatch ? '<span style="color:#2D6A4F;">✓ 與對帳單吻合</span>' : ''}`;
};

// 儲存並鎖定帳單
window.saveStatement = function() {
  const name = document.getElementById('stmt-name').value.trim();
  const dueDate = document.getElementById('stmt-due-date').value;
  const targetAmount = parseFloat(document.getElementById('stmt-target-amount').value) || 0;
  
  const selectedTxIds = Array.from(document.querySelectorAll('.stmt-check-item:checked')).map(cb => cb.value);

  if (!name || selectedTxIds.length === 0) {
    alert('請填寫帳單名稱並至少勾選一筆交易！');
    return;
  }

  const stmtId = 'stmt-' + Date.now();
  const newStmt = {
    id: stmtId,
    accountId: currentAccountId,
    name,
    dueDate,
    targetAmount,
    txIds: selectedTxIds,
    isPaid: false
  };

  transactions.forEach(t => {
    if (selectedTxIds.includes(t.id)) {
      t.statementId = stmtId;
    }
  });

  creditStatements.push(newStmt);
  localStorage.setItem('wiz_credit_statements', JSON.stringify(creditStatements));

  closeModal('statement-modal');
  saveData();
  alert(`成功建立對帳單「${name}」！已鎖定 ${selectedTxIds.length} 筆明細。✨`);
};