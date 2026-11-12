// 全域帳單陣列
let creditStatements = JSON.parse(localStorage.getItem('wiz_credit_statements')) || [];

// 而家編輯緊邊一期帳單（null = 建立新帳單模式）
let editingStatementId = null;

// 用家喺揀選清單手動取消勾選嘅交易（記住佢，費事重 render 嗰陣又自動勾返；建立／編輯模式共用）
let stmtDeselected = new Set();

window.noteStmtToggle = function(cb) {
  if (cb.checked) stmtDeselected.delete(cb.value);
  else stmtDeselected.add(cb.value);
};

// 持久化帳單清單
function persistStatements() {
  localStorage.setItem('wiz_credit_statements', JSON.stringify(creditStatements));
}

// 交易層面嘅已找數旗（Sheets 來回會變字串 'TRUE'，跟 isPending 嗰套一樣寬容判斷）
function isTxPaid(t) {
  return t.isPaid === true || String(t.isPaid).trim().toUpperCase() === 'TRUE';
}

// 一條交易喺某戶口角度嘅帶號金額（跟 app.js getAccountCashBalance 嗰套會計方向）：
// 支出／轉出 = 負（增加應付），收入／轉入找數 = 正（減少應付），調整 = 照金額正負
function stmtTxAmount(t, accId) {
  const amt = parseFloat(t.amount) || 0;
  const comm = parseFloat(t.commission) || 0;
  if (t.type === 'expense') return -(amt + comm);
  if (t.type === 'income') return amt;
  if (t.type === 'adjust') return amt;
  if (t.type === 'transfer' || t.type === 'exchange') {
    if (t.toAccountId === accId) return parseFloat(t.toAmount || t.amount) || 0;
    if (t.accountId === accId) return -(amt + comm);
  }
  return 0;
}

// 本地今日日期（YYYY-MM-DD，唔用 UTC 避免時區跳日）
function todayLocalStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// 計一期帳單嘅實際應付總額、已找金額同筆數（以 transactions 身上嘅 statementId 為準，最可靠）
// 應付 = 帶號淨額嘅相反數：支出加、找數入賬減，early payment 會自動 offset
function getStatementTxStats(stmtId, accId) {
  const txs = transactions.filter(t => t.statementId === stmtId);
  const net = txs.reduce((acc, t) => acc + stmtTxAmount(t, accId || t.accountId), 0);
  const paidNet = txs.filter(t => isTxPaid(t)).reduce((acc, t) => acc + stmtTxAmount(t, accId || t.accountId), 0);
  return {
    count: txs.length,
    sum: -net,
    paidSum: -paidNet
  };
}

// 在切換帳戶時，控制「📑 對帳單」按鈕僅在信用卡帳戶顯示
window.checkStatementButtonVisibility = function(currentAcc) {
  const btn = document.getElementById('btn-statement-entry');
  if (!btn) return;
  btn.style.display = (currentAcc && currentAcc.type === 'credit') ? 'inline-flex' : 'none';
};

// 打開對帳單 Modal（建立新帳單模式）
window.openStatementModal = function() {
  const currentAcc = accounts.find(a => a.id === currentAccountId);
  if (!currentAcc) return;

  editingStatementId = null;
  stmtDeselected = new Set();
  const titleEl = document.getElementById('statement-modal-title');
  if (titleEl) titleEl.textContent = '信用卡帳單核對';
  const saveBtn = document.getElementById('stmt-save-btn');
  if (saveBtn) saveBtn.textContent = '鎖定帳單';

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
  renderStatementsList();
  openModal('statement-modal');
};

// 根據日期區間篩選交易
// 建立模式：顯示未入任何帳單、牽涉到本戶口嘅交易（唔限類型 — 支出、找數轉入、收入、調整都要，
// 找數嗰啲會以正數 offset 返支出，個淨額先對得返銀行 statement balance；已找數嘅都照顯示，佢仍然屬於嗰期）
// 編輯模式：額外顯示嗰期帳單本身嘅交易（預設勾選，唔受日期區間限制，費事俾篩選食咗）
window.filterStatementTxs = function() {
  const currentAcc = accounts.find(a => a.id === currentAccountId);
  if (!currentAcc) return;

  const fromDate = document.getElementById('stmt-from-date').value;
  const toDate = document.getElementById('stmt-to-date').value;
  const editingId = editingStatementId;
  const STMT_TYPES = ['expense', 'income', 'transfer', 'exchange', 'adjust'];

  let unbilledTxs = transactions.filter(t => 
    (t.accountId === currentAcc.id || t.toAccountId === currentAcc.id) &&
    STMT_TYPES.includes(t.type) &&
    (!t.statementId || (editingId && t.statementId === editingId))
  );

  if (fromDate) {
    unbilledTxs = unbilledTxs.filter(t => (editingId && t.statementId === editingId) || normalizeDateString(t.date) >= fromDate);
  }
  if (toDate) {
    unbilledTxs = unbilledTxs.filter(t => (editingId && t.statementId === editingId) || normalizeDateString(t.date) <= toDate);
  }

  unbilledTxs.sort((a, b) => new Date(a.date) - new Date(b.date));

  const listContainer = document.getElementById('stmt-tx-checklist');
  if (!listContainer) return;
  listContainer.innerHTML = '';

  if (unbilledTxs.length === 0) {
    listContainer.innerHTML = '<p style="color:var(--text-muted); text-align:center; padding: 20px 0; font-size:12.5px;">此日期區間無未結算的信用卡交易</p>';
  } else {
    unbilledTxs.forEach(t => {
      const signed = stmtTxAmount(t, currentAcc.id);
      const paid = isTxPaid(t);
      const isChecked = !stmtDeselected.has(t.id);
      const row = document.createElement('div');
      row.style.cssText = 'display:flex; justify-content:space-between; align-items:center; padding:6px 4px; border-bottom:1px solid #F5F5F7;';
      row.innerHTML = `
        <label style="display:flex; align-items:center; gap:8px; font-size:12.5px; cursor:pointer; flex:1; min-width:0;">
          <input type="checkbox" class="stmt-check-item" value="${t.id}" data-amount="${signed}" ${isChecked ? 'checked' : ''} onchange="updateStmtCheckSum(); noteStmtToggle(this)">
          <span style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${normalizeDateString(t.date)} · ${t.title}</span>
        </label>
        <button type="button" onclick="toggleStmtTxPaid('${t.id}')" title="切換呢條數嘅找數狀態" style="border:1px solid ${paid ? '#2D6A4F' : 'rgba(0,0,0,0.15)'}; background:${paid ? '#EAF5EF' : 'transparent'}; color:${paid ? '#2D6A4F' : 'var(--text-muted)'}; border-radius:20px; padding:1px 8px; font-size:10.5px; font-weight:700; cursor:pointer; white-space:nowrap; margin-left:6px;">${paid ? '✓ 已找數' : '未找數'}</button>
        <span style="font-weight:700; font-size:12.5px; margin-left:8px; white-space:nowrap;">${signed < 0 ? '-' : '+'}$${Math.abs(signed).toFixed(2)}</span>
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
  checkboxes.forEach(cb => {
    cb.checked = anyUnchecked;
    if (anyUnchecked) stmtDeselected.delete(cb.value);
    else stmtDeselected.add(cb.value);
  });
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
  
  // checkbox 嘅 data-amount 係帶號金額：支出負、找數入賬正；應付淨額 = 淨額嘅相反數
  const owed = -sum;
  const isMatch = target > 0 && Math.abs(owed - target) < 0.01;
  summaryEl.innerHTML = `已勾選應付淨額: <b>$${owed.toFixed(2)}</b> ${isMatch ? '<span style="color:#2D6A4F;">✓ 與對帳單吻合</span>' : ''}`;
};

// 儲存並鎖定帳單（建立模式）／更新帳單（編輯模式）
window.saveStatement = function() {
  const name = document.getElementById('stmt-name').value.trim();
  const dueDate = document.getElementById('stmt-due-date').value;
  const targetAmount = parseFloat(document.getElementById('stmt-target-amount').value) || 0;
  
  const selectedTxIds = Array.from(document.querySelectorAll('.stmt-check-item:checked')).map(cb => cb.value);

  if (!name || selectedTxIds.length === 0) {
    alert('請填寫帳單名稱並至少勾選一筆交易！');
    return;
  }

  // ===== 編輯模式：更新既有帳單嘅關聯 =====
  if (editingStatementId) {
    const stmt = creditStatements.find(s => s.id === editingStatementId);
    if (stmt) {
      const prevIds = transactions.filter(t => t.statementId === stmt.id).map(t => t.id);
      const changed = prevIds.length !== selectedTxIds.length || prevIds.some(id => !selectedTxIds.includes(id));

      transactions.forEach(t => {
        if (t.statementId === stmt.id && !selectedTxIds.includes(t.id)) {
          delete t.statementId;
        }
        if (selectedTxIds.includes(t.id)) {
          t.statementId = stmt.id;
        }
      });

      stmt.name = name;
      stmt.dueDate = dueDate;
      stmt.targetAmount = targetAmount;
      stmt.txIds = selectedTxIds;

      let note = '';
      if (stmt.isPaid && changed) {
        stmt.isPaid = false;
        stmt.paidDate = '';
        note = '（因交易有變動，已自動改回「未找數」）';
      }

      persistStatements();
      editingStatementId = null;
      stmtDeselected = new Set();
      closeModal('statement-modal');
      saveData();
      alert(`已更新帳單「${name}」！${note}`);
      return;
    }
    editingStatementId = null;
  }

  // ===== 建立模式 =====
  const stmtId = 'stmt-' + Date.now();
  const newStmt = {
    id: stmtId,
    accountId: currentAccountId,
    name,
    dueDate,
    targetAmount,
    txIds: selectedTxIds,
    isPaid: false,
    paidDate: ''
  };

  transactions.forEach(t => {
    if (selectedTxIds.includes(t.id)) {
      t.statementId = stmtId;
    }
  });

  creditStatements.push(newStmt);
  persistStatements();

  closeModal('statement-modal');
  saveData();
  alert(`成功建立對帳單「${name}」！已鎖定 ${selectedTxIds.length} 筆明細。`);
};

// ===== 已建立帳單清單（當前戶口）=====
window.renderStatementsList = function() {
  const container = document.getElementById('stmt-existing-list');
  if (!container) return;

  const list = creditStatements
    .filter(s => s.accountId === currentAccountId)
    .sort((a, b) => b.id.localeCompare(a.id));

  if (list.length === 0) {
    container.innerHTML = '<p style="color:var(--text-muted); text-align:center; padding: 12px 0; font-size:12.5px;">尚未建立任何帳單</p>';
    return;
  }

  container.innerHTML = '';
  list.forEach(stmt => {
    const stats = getStatementTxStats(stmt.id, stmt.accountId);
    const paid = !!stmt.isPaid;
    const statusHtml = paid
      ? `<span style="color:#2D6A4F; font-weight:700;">已找數${stmt.paidDate ? `（${stmt.paidDate}）` : ''}</span>`
      : `<span style="color:#D97706; font-weight:700;">未找數${stats.paidSum > 0 ? `（已找 $${stats.paidSum.toFixed(2)}）` : ''}</span>`;
    const row = document.createElement('div');
    row.style.cssText = 'padding:8px 4px; border-bottom:1px solid #F5F5F7;';
    row.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; gap:8px;">
        <span style="font-size:13px; font-weight:700; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${stmt.name}</span>
        ${statusHtml}
      </div>
      <div style="font-size:11.5px; color:var(--text-muted); margin-top:2px;">
        ${stmt.dueDate ? `到期 ${stmt.dueDate} · ` : ''}對帳 $${parseFloat(stmt.targetAmount || 0).toFixed(2)} · 實際 $${stats.sum.toFixed(2)} · ${stats.count} 筆
      </div>
      <div style="display:flex; gap:6px; margin-top:6px;">
        <button type="button" class="btn-action btn-secondary" style="padding:2px 10px; font-size:11px;" onclick="openStatementEditor('${stmt.id}')">編輯</button>
        <button type="button" class="btn-action btn-secondary" style="padding:2px 10px; font-size:11px;" onclick="toggleStatementPaid('${stmt.id}')">${paid ? '改回未找數' : '標記已找數'}</button>
        <button type="button" class="btn-action btn-secondary" style="padding:2px 10px; font-size:11px; color:#C0392B;" onclick="deleteStatement('${stmt.id}')">刪除</button>
      </div>
    `;
    container.appendChild(row);
  });
};

// 進入編輯模式：將嗰期帳單載入返表單
window.openStatementEditor = function(stmtId) {
  const stmt = creditStatements.find(s => s.id === stmtId);
  if (!stmt) return;

  editingStatementId = stmtId;
  stmtDeselected = new Set();
  const titleEl = document.getElementById('statement-modal-title');
  if (titleEl) titleEl.textContent = '編輯帳單';
  const saveBtn = document.getElementById('stmt-save-btn');
  if (saveBtn) saveBtn.textContent = '儲存修改';

  document.getElementById('stmt-name').value = stmt.name || '';
  document.getElementById('stmt-due-date').value = stmt.dueDate || '';
  document.getElementById('stmt-target-amount').value = stmt.targetAmount || '';

  // 日期區間預設涵蓋嗰期帳單嘅交易，方便加減嗰段時間附近嘅數
  const ownTxs = transactions.filter(t => t.statementId === stmtId);
  if (ownTxs.length > 0) {
    const dates = ownTxs.map(t => normalizeDateString(t.date)).sort();
    document.getElementById('stmt-from-date').value = dates[0];
    // 結算日預設去到「嗰期最遲嗰條數」同「今日」兩者較遲嗰個，方便加入漏咗嘅近期數
    const lastOwn = dates[dates.length - 1];
    const todayStr = todayLocalStr();
    document.getElementById('stmt-to-date').value = lastOwn >= todayStr ? lastOwn : todayStr;
  }

  filterStatementTxs();
};

// 逐條交易切換已找數（cut-off 前 early payment 嗰啲就靠呢個逐條 mark）
window.toggleStmtTxPaid = function(txId) {
  const tx = transactions.find(t => t.id === txId);
  if (!tx) return;
  tx.isPaid = !isTxPaid(tx);
  saveData(tx.id);
  filterStatementTxs();
  renderStatementsList();
};

// 成期標記已找數／改回未找數（找數嗰刻自動記錄找數日）
window.toggleStatementPaid = function(stmtId) {
  const stmt = creditStatements.find(s => s.id === stmtId);
  if (!stmt) return;

  stmt.isPaid = !stmt.isPaid;
  stmt.paidDate = stmt.isPaid ? todayLocalStr() : '';

  // 成期 mark 已找數嗰陣，順手將入面每條數都標埋已找數（逐條狀態同成期狀態保持一致）
  if (stmt.isPaid) {
    transactions.forEach(t => {
      if (t.statementId === stmtId) t.isPaid = true;
    });
  }

  persistStatements();
  // 一定要行 saveData 去觸發同步：唔行嘅話 hasLocalChanges 唔會起，
  // 㩒同步嗰陣會跳過 push、再俾 pull 用 Sheet 嘅舊資料蓋返轉頭（即係「變番未找數」嗰個 bug）
  saveData();
  renderStatementsList();
};

// 刪除成期帳單：入面嘅交易會清走 statementId，返去未入帳單狀態
window.deleteStatement = function(stmtId) {
  const stmt = creditStatements.find(s => s.id === stmtId);
  if (!stmt) return;

  const stats = getStatementTxStats(stmtId);
  if (!confirm(`確定刪除帳單「${stmt.name}」？入面 ${stats.count} 筆交易會釋放返出嚟（變回未入帳單）。`)) return;

  transactions.forEach(t => {
    if (t.statementId === stmtId) delete t.statementId;
  });
  creditStatements = creditStatements.filter(s => s.id !== stmtId);
  if (editingStatementId === stmtId) {
    editingStatementId = null;
    stmtDeselected = new Set();
    const titleEl = document.getElementById('statement-modal-title');
    if (titleEl) titleEl.textContent = '信用卡帳單核對';
    const saveBtn = document.getElementById('stmt-save-btn');
    if (saveBtn) saveBtn.textContent = '鎖定帳單';
  }

  persistStatements();
  saveData();
  renderStatementsList();
  filterStatementTxs();
};
