// ==========================================
// 分類階層解析函式（取得 主分類 > 子分類）
// ==========================================
function getCategoryBreadcrumb(categoryId, txType) {
  if (txType === 'transfer') return '轉帳';
  if (txType === 'buy' || txType === 'sell') return '投資交易';
  if (txType === 'adjust') return '餘額調整';
  
  const cat = categories.find(c => c.id === categoryId);
  if (!cat) return txType === 'income' ? '收入' : '支出';

  // 若為子分類且有 parentId
  if (cat.parentId) {
    const parent = categories.find(c => c.id === cat.parentId);
    if (parent) {
      return `${parent.name} > ${cat.name}`;
    }
  }
  return cat.name;
}

// ==========================================
// 重構 renderAllTransactionsView()（1:1 還原特定帳戶交易列，並修復點擊崩潰）
// ==========================================
window.renderAllTransactionsView = function() {
  const container = document.getElementById('all-transactions-list');
  if (!container) return;
  container.innerHTML = '';

  const query = (window.allTxSearchQuery || '').trim().toLowerCase();

  // 1. 過濾邏輯 (支援日期、商戶、分類、備註)
  let filtered = transactions.filter(tx => {
    if (!query) return true;
    const d = (tx.date || '').split('T')[0];
    const title = (tx.title || '').toLowerCase();
    const note = (tx.note || '').toLowerCase();
    const catBreadcrumb = getCategoryBreadcrumb(tx.categoryId, tx.type).toLowerCase();
    return d.includes(query) || title.includes(query) || note.includes(query) || catBreadcrumb.includes(query);
  });

  // 按日期由新至舊排序
  filtered.sort((a, b) => new Date((b.date || '').split('T')[0]) - new Date((a.date || '').split('T')[0]));

  if (filtered.length === 0) {
    container.innerHTML = '<div style="color:var(--text-muted); text-align:center; padding: 40px 0; font-size:14px;">找不到相關交易紀錄</div>';
    return;
  }

  // 2. 按月份分組
  const monthGroups = {};
  filtered.forEach(tx => {
    const dStr = (tx.date || '').split('T')[0];
    const mKey = dStr.substring(0, 7) || '其他';
    if (!monthGroups[mKey]) monthGroups[mKey] = [];
    monthGroups[mKey].push(tx);
  });

  // 3. 渲染月份區塊
  Object.keys(monthGroups).forEach(mKey => {
    const groupTxs = monthGroups[mKey];

    const mHeader = document.createElement('div');
    mHeader.style.cssText = 'display:flex; justify-content:space-between; align-items:center; padding: 14px 4px 8px 4px; font-size:12px; font-weight:700; color:#8E8E93;';
    mHeader.innerHTML = `
      <span>📅 ${mKey}</span>
      <span>${groupTxs.length} 筆明細</span>
    `;
    container.appendChild(mHeader);

    groupTxs.forEach(tx => {
      const dStr = (tx.date || '').split('T')[0];
      const visual = getCategoryVisual(tx.categoryId, tx.type);
      const catBreadcrumb = getCategoryBreadcrumb(tx.categoryId, tx.type);
      const amt = parseFloat(tx.amount || 0);
      const isIncome = tx.type === 'income';
      const balClass = isIncome ? 'bal-positive' : 'bal-negative';
      const prefix = isIncome ? '+' : '-';

      const card = document.createElement('div');
      card.className = 'tx-card-item';
      
      // 修復點擊 Hang 機：以 try-catch 包裹，確保即使缺少 context 也能安全開啟編輯全螢幕頁
      card.onclick = (e) => {
        e.stopPropagation();
        try {
          if (typeof openTxPage === 'function') {
            openTxPage(tx.id);
          } else if (typeof openTxModal === 'function') {
            openTxModal(tx.id);
          }
        } catch (err) {
          console.error('開啟編輯交易失敗：', err);
        }
      };

      // 1:1 還原雙行排版 (上行商戶、中行日期、下行 主類別 > 子類別)
      card.innerHTML = `
        <div style="display:flex; align-items:center;">
          <div class="tx-icon-badge" style="background-color: ${visual.bg};">${visual.icon}</div>
          <div>
            <div style="font-size:14px; font-weight:600; color:#1C1C1E;">${tx.title || '無標題'}</div>
            <div style="font-size:11px; color:#8E8E93; margin-top:2px;">${dStr}</div>
            <div class="tx-cat-breadcrumb">${catBreadcrumb}</div>
          </div>
        </div>
        <div style="display:flex; align-items:center; gap:6px;">
          <span class="${balClass}" style="font-size:14px;">${prefix}${fmtCur(amt, baseCurrency)}</span>
          <span style="color:#C7C7CC; font-size:14px;">›</span>
        </div>
      `;
      container.appendChild(card);
    });
  });
};