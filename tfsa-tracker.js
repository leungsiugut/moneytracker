// ==========================================================================
// TFSA Contribution Limit Tracker 獨立模組 (SPEC-002 / SPEC-003)
// ==========================================================================

let tfsaTransactions = JSON.parse(localStorage.getItem('wiz_tfsa_txs')) || [];

function getTFSATransactions() {
  try {
    return JSON.parse(localStorage.getItem('wiz_tfsa_txs')) || [];
  } catch (e) {
    return [];
  }
}

function persistTFSATransactions(txs) {
  localStorage.setItem('wiz_tfsa_txs', JSON.stringify(txs));
  tfsaTransactions = txs;
}

// 日期清洗：過濾並切除 ISO 時間戳字串 (例如 T05:00:00.000Z)，確保純粹 YYYY-MM-DD
function cleanTFSADateStr(dateStr) {
  if (!dateStr) return '';
  return String(dateStr).split('T')[0].trim();
}

// 核心計算引擎：按日期由舊至新嚴格累積試算 (對齊舊版 logic)
function calculateTFSARoomAndBalances() {
  const rawList = getTFSATransactions();
  // 複製並按日期遞增排序 (舊 -> 新)
  const sorted = [...rawList].sort((a, b) => new Date(cleanTFSADateStr(a.date)) - new Date(cleanTFSADateStr(b.date)));

  let currentRoom = 0;
  const bankBalances = {};

  const historyWithState = sorted.map(t => {
    const amt = parseFloat(t.amount) || 0;
    const action = t.action;
    const bank = (t.bankAccount || '').trim();

    if (action === 'Annual Room Increase') {
      currentRoom += amt;
    } else if (action === 'Contribution') {
      currentRoom -= amt;
      if (bank) {
        bankBalances[bank] = (bankBalances[bank] || 0) + amt;
      }
    } else if (action === 'Withdraw') {
      currentRoom += amt; // 跟足舊版邏輯即時加回
      if (bank) {
        bankBalances[bank] = (bankBalances[bank] || 0) - amt;
      }
    } else if (action === 'Interest') {
      // 利息/收益：不影響 Room，戶口結餘增加
      if (bank) {
        bankBalances[bank] = (bankBalances[bank] || 0) + amt;
      }
    } else if (action === 'Transfer') {
      // 轉帳：不影響 Room，解析 "From -> To"
      if (bank.includes('->')) {
        const parts = bank.split('->').map(s => s.trim());
        const fromBank = parts[0];
        const toBank = parts[1];
        if (fromBank) bankBalances[fromBank] = (bankBalances[fromBank] || 0) - amt;
        if (toBank) bankBalances[toBank] = (bankBalances[toBank] || 0) + amt;
      }
    }

    // 負零防護：微小值歸零，避免出現 -$0.00
    let safeRoom = currentRoom;
    if (Math.abs(safeRoom) < 0.005) {
      safeRoom = 0;
    }

    return {
      ...t,
      runningRoom: safeRoom
    };
  });

  if (Math.abs(currentRoom) < 0.005) {
    currentRoom = 0;
  }

  return {
    currentRoom,
    bankBalances,
    historyWithState
  };
}

// 渲染 TFSA 視圖
window.renderTFSATrackerView = function() {
  const { currentRoom, bankBalances, historyWithState } = calculateTFSARoomAndBalances();

  // 1. 更新 Hero 額度卡片
  const roomEl = document.getElementById('tfsa-current-room');
  if (roomEl) {
    const sign = currentRoom < 0 ? '-' : '';
    const formatted = Math.abs(currentRoom).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    roomEl.innerText = `${sign}$${formatted} CAD`;
    roomEl.style.color = currentRoom < 0 ? 'var(--ios-red)' : 'var(--hero-text)';
  }

  // 2. 更新銀行帳戶結餘列表 (過濾結餘等於 0 或負微小值者)
  const bankContainer = document.getElementById('tfsa-bank-balances');
  if (bankContainer) {
    bankContainer.innerHTML = '';
    // 嚴格過濾：結餘小於等於 0.004 之帳戶直接略過不 render
    const activeBankEntries = Object.entries(bankBalances).filter(([, bal]) => {
      const numBal = Number(bal) || 0;
      return numBal > 0.004;
    });

    if (activeBankEntries.length === 0) {
      bankContainer.style.display = 'none';
    } else {
      bankContainer.style.display = 'grid';
      activeBankEntries.forEach(([bank, bal]) => {
        const chip = document.createElement('div');
        chip.className = 'tfsa-bank-chip';
        const formattedBal = Number(bal || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        chip.innerHTML = `
          <span class="tfsa-bank-chip-name">${bank}</span>
          <span class="tfsa-bank-chip-val">$${formattedBal} CAD</span>
        `;
        bankContainer.appendChild(chip);
      });
    }
  }

  // 3. 渲染交易流水清單 (按日期倒序顯示：新 -> 舊)
  const listContainer = document.getElementById('tfsa-tx-list-container');
  if (!listContainer) return;
  listContainer.innerHTML = '';

  if (historyWithState.length === 0) {
    listContainer.innerHTML = '<p style="color:var(--text-muted); text-align:center; padding: 30px 0; font-size:13px;">目前尚無任何 TFSA 記錄。點擊右上角「＋ 記錄」新增。</p>';
    return;
  }

  // 倒序展示
  const displayList = [...historyWithState].reverse();

  displayList.forEach(item => {
    const row = document.createElement('div');
    row.className = 'tfsa-tx-item';

    let badgeClass = 'tfsa-badge-contrib';
    if (item.action === 'Annual Room Increase') badgeClass = 'tfsa-badge-room';
    else if (item.action === 'Withdraw') badgeClass = 'tfsa-badge-withdraw';
    else if (item.action === 'Interest') badgeClass = 'tfsa-badge-interest';
    else if (item.action === 'Transfer') badgeClass = 'tfsa-badge-transfer';

    // 日期清洗
    const cleanDate = cleanTFSADateStr(item.date);

    // 金額色彩對齊銀行帳戶流水：Withdraw 用紅色 (--ios-red)，其餘一律用綠色 (--ios-green)
    const isWithdraw = (item.action === 'Withdraw');
    const amtColor = isWithdraw ? 'var(--ios-red)' : 'var(--ios-green)';

    // 操作後餘額負零防護格式化
    let safeRunningRoom = Number(item.runningRoom || 0);
    if (Math.abs(safeRunningRoom) < 0.005) {
      safeRunningRoom = 0;
    }
    const runningRoomStr = safeRunningRoom.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const amtStr = Number(item.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    row.innerHTML = `
      <div style="flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4px;">
        <!-- 行 1：動作類型 Tag -->
        <div>
          <span class="tfsa-action-badge ${badgeClass}">${item.action}</span>
        </div>
        <!-- 行 2：銀行名稱 -->
        <div style="font-size: 14px; font-weight: 700; color: #1C1C1E; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
          ${item.bankAccount || 'Government / CRA'}
        </div>
        <!-- 行 3：記錄日期 (純 YYYY-MM-DD) -->
        <div style="font-size: 11px; color: var(--text-muted); line-height: 1.2;">
          ${cleanDate}
        </div>
        <!-- 行 4：操作後餘額 -->
        <div style="font-size: 11px; color: var(--text-muted); line-height: 1.2;">
          操作後餘額: $${runningRoomStr}
        </div>
      </div>
      <div style="display: flex; align-items: center; gap: 8px;">
        <span style="font-size: 14px; font-weight: 700; color: ${amtColor}; font-feature-settings: 'tnum' 1; font-variant-numeric: tabular-nums;">
          $${amtStr}
        </span>
        <div style="display: flex; gap: 4px;">
          <button type="button" class="debt-btn-circle secondary" onclick="openTFSAModal('${item.id}')" title="編輯">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
          </button>
          <button type="button" class="debt-btn-circle secondary" onclick="deleteTFSATransaction('${item.id}')" title="刪除" style="color:var(--ios-red);">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          </button>
        </div>
      </div>
    `;
    listContainer.appendChild(row);
  });
};

// 彈窗控制
window.openTFSAModal = function(editId = null) {
  const modal = document.getElementById('tfsa-modal');
  if (!modal) return;

  const titleEl = document.getElementById('tfsa-modal-title');
  const editIdInput = document.getElementById('tfsa-edit-id');
  const dateInput = document.getElementById('tfsa-date');
  const actionSelect = document.getElementById('tfsa-action');
  const bankInput = document.getElementById('tfsa-bank');
  const fromBankInput = document.getElementById('tfsa-from-bank');
  const toBankInput = document.getElementById('tfsa-to-bank');
  const amountInput = document.getElementById('tfsa-amount');

  if (editId) {
    const list = getTFSATransactions();
    const item = list.find(t => t.id === editId);
    if (!item) return;

    if (titleEl) titleEl.innerText = '編輯 TFSA 記錄';
    if (editIdInput) editIdInput.value = item.id;
    if (dateInput) dateInput.value = cleanTFSADateStr(item.date);
    if (actionSelect) actionSelect.value = item.action;
    if (amountInput) amountInput.value = item.amount;

    if (item.action === 'Transfer' && (item.bankAccount || '').includes('->')) {
      const parts = item.bankAccount.split('->').map(s => s.trim());
      if (fromBankInput) fromBankInput.value = parts[0] || '';
      if (toBankInput) toBankInput.value = parts[1] || '';
      if (bankInput) bankInput.value = '';
    } else {
      if (bankInput) bankInput.value = item.bankAccount || '';
      if (fromBankInput) fromBankInput.value = '';
      if (toBankInput) toBankInput.value = '';
    }
  } else {
    if (titleEl) titleEl.innerText = '新增 TFSA 記錄';
    if (editIdInput) editIdInput.value = '';
    if (dateInput) dateInput.value = new Date().toISOString().split('T')[0];
    if (actionSelect) actionSelect.value = 'Contribution';
    if (bankInput) bankInput.value = '';
    if (fromBankInput) fromBankInput.value = '';
    if (toBankInput) toBankInput.value = '';
    if (amountInput) amountInput.value = '';
  }

  handleTFSAActionChange();
  modal.classList.add('open');
};

window.closeTFSAModal = function() {
  const modal = document.getElementById('tfsa-modal');
  if (modal) modal.classList.remove('open');
};

window.handleTFSAActionChange = function() {
  const action = document.getElementById('tfsa-action')?.value;
  const singleBankGroup = document.getElementById('tfsa-group-single-bank');
  const transferBankGroup = document.getElementById('tfsa-group-transfer-bank');
  const bankLabel = document.getElementById('tfsa-label-bank');
  const bankInput = document.getElementById('tfsa-bank');

  if (action === 'Transfer') {
    if (singleBankGroup) singleBankGroup.style.display = 'none';
    if (transferBankGroup) transferBankGroup.style.display = 'flex';
  } else if (action === 'Annual Room Increase') {
    if (singleBankGroup) singleBankGroup.style.display = 'flex';
    if (transferBankGroup) transferBankGroup.style.display = 'none';
    if (bankLabel) bankLabel.innerText = '備註 / 來源（可選填）';
    if (bankInput) bankInput.placeholder = '例如：CRA 額度上調';
  } else {
    if (singleBankGroup) singleBankGroup.style.display = 'flex';
    if (transferBankGroup) transferBankGroup.style.display = 'none';
    if (bankLabel) bankLabel.innerText = '銀行 / 機構名稱';
    if (bankInput) bankInput.placeholder = '例如：Wealthsimple / Questrade';
  }
};

window.saveTFSATransaction = function() {
  const editId = document.getElementById('tfsa-edit-id')?.value;
  const rawDate = document.getElementById('tfsa-date')?.value || new Date().toISOString().split('T')[0];
  const date = cleanTFSADateStr(rawDate);
  const action = document.getElementById('tfsa-action')?.value;
  const amount = parseFloat(document.getElementById('tfsa-amount')?.value);

  if (isNaN(amount) || amount <= 0) {
    alert('請填寫有效金額！');
    return;
  }

  let bankAccount = '';
  if (action === 'Transfer') {
    const fromBank = document.getElementById('tfsa-from-bank')?.value.trim();
    const toBank = document.getElementById('tfsa-to-bank')?.value.trim();
    if (!fromBank || !toBank) {
      alert('請填寫轉出與轉入銀行！');
      return;
    }
    bankAccount = `${fromBank} -> ${toBank}`;
  } else {
    bankAccount = document.getElementById('tfsa-bank')?.value.trim();
    if (action !== 'Annual Room Increase' && !bankAccount) {
      alert('請填寫銀行/機構名稱！');
      return;
    }
  }

  const list = getTFSATransactions();

  if (editId) {
    const idx = list.findIndex(t => t.id === editId);
    if (idx !== -1) {
      list[idx] = { ...list[idx], date, action, bankAccount, amount };
    }
  } else {
    const newTx = {
      id: 'tfsa_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      date,
      action,
      bankAccount,
      amount
    };
    list.push(newTx);
  }

  persistTFSATransactions(list);
  closeTFSAModal();
  renderTFSATrackerView();

  // 明確標記有本地未同步改動，並觸發同步
  window.hasLocalChanges = true;
  if (typeof window.saveData === 'function') {
    window.saveData();
  }
};

window.deleteTFSATransaction = function(id) {
  if (!confirm('確定刪除此筆 TFSA 記錄？')) return;

  let list = getTFSATransactions();
  list = list.filter(t => t.id !== id);
  persistTFSATransactions(list);

  renderTFSATrackerView();

  window.hasLocalChanges = true;
  if (typeof window.saveData === 'function') {
    window.saveData();
  }
};