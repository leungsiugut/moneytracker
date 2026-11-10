const SUPPORTED_CURRENCIES = [
  { code: 'CAD', name: 'CAD' },
  { code: 'USD', name: 'USD' },
  { code: 'HKD', name: 'HKD' },
  { code: 'EUR', name: 'EUR' },
  { code: 'JPY', name: 'JPY' },
  { code: 'GBP', name: 'GBP' },
  { code: 'AED', name: 'AED' },
  { code: 'AUD', name: 'AUD' },
  { code: 'CNY', name: 'CNY' },
  { code: 'TWD', name: 'TWD' },
  { code: 'CHF', name: 'CHF' },
  { code: 'SGD', name: 'SGD' }
];

const THEME_PALETTES = [
  { key: 'pink', bg: '#FAD2E1', name: '櫻花蜜桃粉' },
  { key: 'mint', bg: '#D8F3DC', name: '薄荷開心果' },
  { key: 'blue', bg: '#D0E1FD', name: '薰衣草霧藍' },
  { key: 'cream', bg: '#FFF1C5', name: '雲呢拿暖杏' },
  { key: 'purple', bg: '#E2D4F0', name: '香芋淺紫' },
  { key: 'grey', bg: '#E5E7EB', name: '莫蘭迪霧灰' }
];

let fxRatesCache = JSON.parse(localStorage.getItem('wiz_fx_cache')) || {
  'CAD': {
    'CAD': 1, 'USD': 0.74, 'HKD': 5.80, 'EUR': 0.68,
    'JPY': 110.5, 'GBP': 0.58, 'AED': 2.72, 'AUD': 1.12,
    'CNY': 5.25, 'TWD': 23.5, 'CHF': 0.64, 'SGD': 0.99
  }
};

const DEFAULT_SCRIPT_URL = "";
let SCRIPT_URL = localStorage.getItem('wiz_gas_url') || DEFAULT_SCRIPT_URL;

let baseCurrency = localStorage.getItem('wiz_base_currency') || 'CAD';

const DEFAULT_CATEGORIES = [
  { id: 'cat-exp-auto', flowType: 'expense', name: 'Automobile', icon: '🚗', parentId: null },
  { id: 'cat-exp-auto-loan', flowType: 'expense', name: 'Car Loan', icon: '🚙', parentId: 'cat-exp-auto' },
  { id: 'cat-exp-auto-gas', flowType: 'expense', name: 'Gas/Fuel', icon: '⛽', parentId: 'cat-exp-auto' },
  { id: 'cat-exp-auto-ins', flowType: 'expense', name: 'Car Insurance', icon: '🛡️', parentId: 'cat-exp-auto' },
  { id: 'cat-exp-bills', flowType: 'expense', name: 'Bills', icon: '📅', parentId: null },
  { id: 'cat-exp-bills-util', flowType: 'expense', name: 'Utilities', icon: '⚡', parentId: 'cat-exp-bills' },
  { id: 'cat-exp-food', flowType: 'expense', name: 'Food & Dining', icon: '☕', parentId: null },
  { id: 'cat-exp-food-dine', flowType: 'expense', name: 'Restaurants', icon: '🍽️', parentId: 'cat-exp-food' },
  { id: 'cat-exp-food-groc', flowType: 'expense', name: 'Groceries', icon: '🛒', parentId: 'cat-exp-food' },
  { id: 'cat-inc-sal', flowType: 'income', name: 'Salary & Wages', icon: '💼', parentId: null },
  { id: 'cat-inc-int', flowType: 'income', name: 'Interest', icon: '📈', parentId: null },
  { id: 'cat-inc-div', flowType: 'income', name: 'Dividend', icon: '📊', parentId: null },
  { id: 'cat-inc-other', flowType: 'income', name: 'Other Income', icon: '💰', parentId: null }
];

const DEFAULT_GROUPS = [
  { id: 'grp-1', name: 'Credit Cards', theme: 'pink', currency: 'CAD', icon: '💳' },
  { id: 'grp-2', name: 'Bank & Cash', theme: 'mint', currency: 'CAD', icon: '🏦' },
  { id: 'grp-3', name: 'Brokerage', theme: 'blue', currency: 'CAD', icon: '📈' }
];

const DEFAULT_ACCOUNTS = [
  { id: 'acc-1', name: 'Amex Cobalt', currency: 'CAD', groupId: 'grp-1', type: 'credit', initialBalance: 0 },
  { id: 'acc-2', name: 'Checking Account', currency: 'CAD', groupId: 'grp-2', type: 'checking', initialBalance: 5000 },
  { id: 'acc-3', name: 'Wealthsimple Trade', currency: 'CAD', groupId: 'grp-3', type: 'investment', initialBalance: 2000 }
];

let categories = JSON.parse(localStorage.getItem('wiz_cats_cloud')) || DEFAULT_CATEGORIES;
let groups = JSON.parse(localStorage.getItem('wiz_grps_cloud')) || DEFAULT_GROUPS;
let accounts = JSON.parse(localStorage.getItem('wiz_accs_cloud')) || DEFAULT_ACCOUNTS;
let transactions = JSON.parse(localStorage.getItem('wiz_txs_cloud')) || [];
let stockPriceCache = JSON.parse(localStorage.getItem('wiz_stock_cache_cloud')) || { 'HXT.TO': 98.50, 'AAPL': 225.00 };

let collapsedGroups = JSON.parse(localStorage.getItem('wiz_collapsed_groups')) || {};
let collapsedCatParents = JSON.parse(localStorage.getItem('wiz_collapsed_cats')) || {};

let currentAccountId = accounts.length > 0 ? accounts[0].id : null;
let currentTxType = 'expense';
let currentInvestSubTab = 'holdings';
let currentCatSettingsTab = 'expense';
let currentMainTab = 'accounts';
let previousActiveTab = 'accounts';
let searchKeyword = '';
let chartInstance = null;

// =======================
// 最近使用分類管理 (Recent Categories)
// =======================
function getRecentCategoryIds() {
  try {
    return JSON.parse(localStorage.getItem('wiz_recent_cat_ids')) || [];
  } catch (e) {
    return [];
  }
}

function recordRecentCategory(catId) {
  if (!catId) return;
  let recents = getRecentCategoryIds();
  recents = recents.filter(id => id !== catId);
  recents.unshift(catId);
  recents = recents.slice(0, 5);
  localStorage.setItem('wiz_recent_cat_ids', JSON.stringify(recents));
}

// =======================
// 編輯模式狀態管理 (Edit Mode)
// =======================
window.isEditMode = false;
window.toggleEditMode = function() {
  window.isEditMode = !window.isEditMode;
  const btn = document.getElementById('btn-toggle-edit-mode');
  const txt = document.getElementById('txt-edit-mode');
  
  if (btn && txt) {
    if (window.isEditMode) {
      btn.classList.add('active-edit-mode');
      btn.querySelector('.btn-icon').innerText = '✓';
      txt.innerText = '完成';
    } else {
      btn.classList.remove('active-edit-mode');
      btn.querySelector('.btn-icon').innerText = '✏️';
      txt.innerText = '編輯';
    }
  }
  renderAccountsView();
};

// =======================
// 待同步佇列 (Pending Outbox)
// =======================
function getPendingUploads() {
  return JSON.parse(localStorage.getItem('wiz_pending_uploads')) || [];
}

function addPendingUpload(txId) {
  const list = getPendingUploads();
  if (!list.includes(txId)) {
    list.push(txId);
    localStorage.setItem('wiz_pending_uploads', JSON.stringify(list));
  }
  updateSyncStatusUI();
}

function clearPendingUploads() {
  localStorage.removeItem('wiz_pending_uploads');
  updateSyncStatusUI();
}

// 支援頂部 Header 與帳戶明細指示圓點連動更新
function updateSyncStatusUI(customState = null, msg = null) {
  const btn = document.getElementById('btn-manual-sync');
  const icon = document.getElementById('sync-icon');
  const text = document.getElementById('sync-text');
  const dot = document.getElementById('detail-sync-dot');

  const pending = getPendingUploads();

  let currentStatus = 'synced';
  let defaultTitle = '已同步';

  if (customState === 'syncing') {
    currentStatus = 'syncing';
    defaultTitle = msg || '正在同步...';
  } else if (customState === 'error') {
    currentStatus = 'error';
    defaultTitle = msg || '同步失敗';
  } else if (pending.length > 0) {
    currentStatus = 'pending-sync';
    defaultTitle = `未同步 (${pending.length} 筆待上傳)`;
  }

  // 1. 更新主頁頂部 Header 按鈕
  if (btn && icon && text) {
    if (currentStatus === 'syncing') {
      btn.className = 'sync-status syncing';
      icon.innerText = '🔄';
      text.innerText = defaultTitle;
    } else if (currentStatus === 'error') {
      btn.className = 'sync-status error';
      icon.innerText = '⚠️';
      text.innerText = defaultTitle;
    } else if (currentStatus === 'pending-sync') {
      btn.className = 'sync-status pending-sync';
      icon.innerText = '🟠';
      text.innerText = defaultTitle;
    } else {
      btn.className = 'sync-status synced';
      icon.innerText = '☁️';
      text.innerText = '已同步';
    }
  }

  // 2. 更新帳戶明細頂部微型圓點指示燈
  if (dot) {
    dot.className = `sync-dot-indicator ${currentStatus}`;
    dot.title = defaultTitle;
  }
}

// 電腦版選單控制
window.toggleDesktopMenu = function(forceState = null) {
  const menu = document.getElementById('desktop-nav-dropdown');
  if (!menu) return;
  if (forceState !== null) {
    menu.style.display = forceState ? 'flex' : 'none';
  } else {
    menu.style.display = (menu.style.display === 'none' || !menu.style.display) ? 'flex' : 'none';
  }
};

document.addEventListener('click', (e) => {
  const container = document.querySelector('.desktop-menu-container');
  if (container && !container.contains(e.target)) {
    window.toggleDesktopMenu(false);
  }
});

function getGroupDefaultIcon(grp) {
  if (grp.icon && grp.icon.trim()) return grp.icon.trim();
  const name = (grp.name || '').toLowerCase();
  if (name.includes('credit')) return '💳';
  if (name.includes('bank') || name.includes('cash')) return '🏦';
  if (name.includes('stock') || name.includes('invest') || name.includes('broker')) return '📈';
  if (name.includes('crypto')) return '🪙';
  return '📁';
}

function getBalanceColorClass(amt) {
  const num = parseFloat(amt);
  if (isNaN(num) || Math.abs(num) < 0.005) return 'bal-zero';
  return num > 0 ? 'bal-positive' : 'bal-negative';
}

function getAccountTypeIcon(type) {
  const t = (type || '').toLowerCase();
  switch (t) {
    case 'credit_card':
    case 'credit':
      return '💳';
    case 'investment':
    case 'brokerage':
      return '📈';
    case 'crypto':
      return '🪙';
    case 'checking':
      return '👛';
    case 'savings':
      return '🏦';
    case 'cash':
      return '💵';
    default:
      return '💰';
  }
}

function initCurrencyDropdowns() {
  const selects = [
    document.getElementById('setting-base-currency'),
    document.getElementById('group-currency'),
    document.getElementById('acc-currency')
  ];

  selects.forEach(select => {
    if (!select) return;
    const currentVal = select.value;
    select.innerHTML = '';
    SUPPORTED_CURRENCIES.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.code;
      opt.innerText = c.code;
      select.appendChild(opt);
    });
    if (currentVal) select.value = currentVal;
  });
}

window.initColorSwatches = function(selectedKey = 'pink') {
  const container = document.getElementById('group-swatch-picker');
  if (!container) return;
  container.innerHTML = '';

  const palettes = [
    { key: 'pink', name: '櫻花粉', bg: '#FAD2E1' },
    { key: 'mint', name: '薄荷綠', bg: '#D8F3DC' },
    { key: 'blue', name: '霧灰藍', bg: '#D0E1FD' },
    { key: 'cream', name: '暖杏黃', bg: '#FFF1C5' },
    { key: 'purple', name: '薰衣草紫', bg: '#E2D4F0' },
    { key: 'grey', name: '冷灰', bg: '#E5E7EB' }
  ];

  palettes.forEach(p => {
    const item = document.createElement('div');
    item.className = `color-swatch-item ${p.key === selectedKey ? 'active' : ''}`;
    item.style.backgroundColor = p.bg;
    item.title = p.name;
    item.onclick = () => {
      document.querySelectorAll('.color-swatch-item').forEach(el => el.classList.remove('active'));
      item.classList.add('active');
      const themeInput = document.getElementById('group-theme');
      if (themeInput) themeInput.value = p.key;
    };
    if (p.key === selectedKey) item.innerText = '✓';
    container.appendChild(item);
  });

  const themeInput = document.getElementById('group-theme');
  if (themeInput) themeInput.value = selectedKey;
};

async function updateFXRates(base = 'CAD') {
  try {
    const res = await fetch(`https://open.er-api.com/v6/latest/${base}`);
    if (res.ok) {
      const data = await res.json();
      if (data && data.rates) {
        fxRatesCache[base] = data.rates;
        localStorage.setItem('wiz_fx_cache', JSON.stringify(fxRatesCache));
      }
    }
  } catch (e) {
    console.warn('FX Rates fetch error:', e);
  }
}

function convertAmount(amt, fromCur, toCur) {
  if (!amt || isNaN(amt)) return 0;
  fromCur = (fromCur || 'CAD').toUpperCase();
  toCur = (toCur || 'CAD').toUpperCase();
  if (fromCur === toCur) return Number(amt);

  const cadRates = fxRatesCache['CAD'] || {};
  const rateFromToCAD = fromCur === 'CAD' ? 1 : (1 / (cadRates[fromCur] || 1));
  const rateCADToTarget = toCur === 'CAD' ? 1 : (cadRates[toCur] || 1);

  const totalInCAD = Number(amt) * rateFromToCAD;
  return totalInCAD * rateCADToTarget;
}

// 核心金額格式化函式（消除 -0.00 負零現象 & 徹底移除 $ 符號）
function fmtCur(amt, cur = 'CAD') {
  let num = Number(amt) || 0;
  // 1. 微小值歸零防護（消除浮點數微負數導致的 -0.00 現象）
  if (Math.abs(num) < 0.005) {
    num = 0;
  }
  
  const sign = num < 0 ? '-' : '';
  const absAmt = Math.abs(num);
  const isZeroDecimal = ['JPY', 'TWD', 'KRW'].includes(cur);
  const formatted = absAmt.toLocaleString('en-US', {
    minimumFractionDigits: isZeroDecimal ? 0 : 2,
    maximumFractionDigits: isZeroDecimal ? 0 : 2
  });
  
  // 2. 徹底移除 $ 符號：純粹輸出 符號 + 數值 + 幣種
  return `${sign}${formatted} ${cur}`;
}

// ==========================================
// 雙向同步核心流程加固（先 Push 後 Pull）
// ==========================================
window.pushToGoogleSheet = async function() {
  if (!SCRIPT_URL) return false;
  try {
    const debtRepayments = JSON.parse(localStorage.getItem('wiz_debt_repayments')) || [];
    const newSymbols = window.pendingNewSymbols || [];
    const payload = { accounts, groups, categories, transactions, debtRepayments, newSymbols };
    await fetch(SCRIPT_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    window.pendingNewSymbols = [];
    return true;
  } catch (err) {
    console.error('Push failed:', err);
    return false;
  }
};

window.pullFromGoogleSheet = async function() {
  if (!SCRIPT_URL) return false;
  const res = await fetch(SCRIPT_URL);
  if (!res.ok) throw new Error('Network response was not ok');
  const data = await res.json();
  
  if (data.accounts && data.accounts.length > 0) accounts = data.accounts;
  if (data.groups && data.groups.length > 0) groups = data.groups;
  if (data.categories && data.categories.length > 0) categories = data.categories;
  if (data.transactions) transactions = data.transactions;
  if (data.debtRepayments && Array.isArray(data.debtRepayments)) {
    localStorage.setItem('wiz_debt_repayments', JSON.stringify(data.debtRepayments));
  }

  if (data.stockPrices && Array.isArray(data.stockPrices)) {
    data.stockPrices.forEach(row => {
      const sym = (row.symbol || '').toString().trim().toUpperCase();
      const p = parseFloat(row.price);
      if (sym && !isNaN(p) && p > 0) {
        stockPriceCache[sym] = p;
      }
    });
    localStorage.setItem('wiz_stock_cache_cloud', JSON.stringify(stockPriceCache));
  }

  if (accounts.length > 0 && !accounts.some(a => a.id === currentAccountId)) {
    currentAccountId = accounts[0].id;
  }

  saveLocalDataOnly();
  return true;
};

window.manualSyncTrigger = async function() {
  if (!SCRIPT_URL) {
    alert('請先在設定頁面填入 Google Apps Script URL！');
    switchMainTab('settings');
    return;
  }
  
  updateSyncStatusUI('syncing', '正在同步...');

  try {
    const pendingList = getPendingUploads();
    if (pendingList.length > 0 || window.hasLocalChanges) {
      const pushSuccess = await pushToGoogleSheet();
      if (!pushSuccess) throw new Error('Push failed');
      clearPendingUploads();
      window.hasLocalChanges = false;
    }

    await pullFromGoogleSheet();
    updateSyncStatusUI();
  } catch (err) {
    console.error('同步失敗：', err);
    updateSyncStatusUI('error', '連線失敗');
    setTimeout(() => updateSyncStatusUI(), 3000);
    alert('⚠️ 網絡連線不穩，同步失敗！本機資料已妥善保存，稍後連線恢復將自動重試。');
  }
};

async function handleAfterTxSave(txId) {
  window.hasLocalChanges = true;
  updateSyncStatusUI('syncing', '正在上傳...');
  
  try {
    const success = await pushToGoogleSheet();
    if (success) {
      window.hasLocalChanges = false;
      clearPendingUploads();
      updateSyncStatusUI();
    } else {
      addPendingUpload(txId);
    }
  } catch (e) {
    addPendingUpload(txId);
  }
}

function saveLocalDataOnly() {
  localStorage.setItem('wiz_cats_cloud', JSON.stringify(categories));
  localStorage.setItem('wiz_grps_cloud', JSON.stringify(groups));
  localStorage.setItem('wiz_accs_cloud', JSON.stringify(accounts));
  localStorage.setItem('wiz_txs_cloud', JSON.stringify(transactions));
  localStorage.setItem('wiz_stock_cache_cloud', JSON.stringify(stockPriceCache));
  renderApp();
}

window.saveData = function(txId = null) {
  saveLocalDataOnly();
  handleAfterTxSave(txId || ('tx-' + Date.now()));
};

function normalizeDateString(dateStr) {
  if (!dateStr) return new Date().toISOString().split('T')[0];
  dateStr = dateStr.toString().trim().replace(/"/g, '');
  if (dateStr.includes('T')) {
    dateStr = dateStr.split('T')[0];
  }

  if (/^\d{4}[\/-]\d{1,2}[\/-]\d{1,2}$/.test(dateStr)) {
    const parts = dateStr.split(/[\/-]/);
    return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
  }

  if (/^\d{1,2}[\/-]\d{1,2}[\/-]\d{4}$/.test(dateStr)) {
    const parts = dateStr.split(/[\/-]/);
    return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
  }

  return dateStr;
}

// 底部拍照按鈕喚起與處理
window.triggerBottomCamera = function() {
  const fileInput = document.getElementById('bottom-camera-input');
  if (fileInput) fileInput.click();
};

window.handleBottomCameraUpload = async function(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;
  if (typeof handleOCRImageSelected === 'function') {
    await handleOCRImageSelected(event);
  }
  event.target.value = '';
};

// ==========================================================================
// Apple Wallet 截圖 OCR 雙保險與地圖雜訊過濾演算法
// ==========================================================================
window.handleOCRImageSelected = async function(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;

  updateSyncStatusUI('syncing', '正在辨識截圖...');

  try {
    const worker = await Tesseract.createWorker('eng');
    const ret = await worker.recognize(file);
    await worker.terminate();

    const fullText = ret.data.text || '';
    const rawLines = fullText.split('\n').map(l => l.trim()).filter(l => l.length > 0);

    let amount = '';
    let amtLineIdx = -1;
    for (let i = 0; i < rawLines.length; i++) {
      const match = rawLines[i].match(/(?:CA)?\$\s*(\d+[\.,]\d{2})/i);
      if (match) {
        amount = match[1].replace(',', '.');
        amtLineIdx = i;
        break;
      }
    }

    const isNoise = (text) => {
      if (!text || text.length < 2) return true;
      if (/^[\\\/\|\sA-Za-z]{1,4}$/.test(text) && (text.includes('\\') || text.includes('/'))) return true;
      const lower = text.toLowerCase();
      const blackList = [
        'apple card', 'apple pay', 'wealthsimple', 'approved', 'declined',
        'status:', '狀態', '已批核', '總計', 'total', 'done', '完成',
        'kennedy', 'avenue', 'ave', 'road', 'rd', 'blvd', 'street', 'st',
        'church', 'baptist', 'report', 'incorrect', 'merchant', '聯絡', '報告'
      ];
      return blackList.some(k => lower.includes(k));
    };

    let guessedTitle = '';

    if (amtLineIdx !== -1 && amtLineIdx + 1 < rawLines.length) {
      let candidate = rawLines[amtLineIdx + 1];
      candidate = candidate.split(',')[0].trim();
      if (!isNoise(candidate)) {
        guessedTitle = candidate;
      }
    }

    if (!guessedTitle || guessedTitle.length < 2) {
      let statusSeen = false;
      for (let i = 0; i < rawLines.length; i++) {
        const line = rawLines[i];
        if (line.includes('狀態') || line.includes('已批核') || line.toLowerCase().includes('status')) {
          statusSeen = true;
          continue;
        }
        if (statusSeen) {
          if (line.includes('聯絡') || line.includes('報告') || line.toLowerCase().includes('contact')) {
            break;
          }
          const cleaned = line.split(',')[0].trim();
          if (!isNoise(cleaned) && cleaned.length >= 2) {
            guessedTitle = cleaned;
            break;
          }
        }
      }
    }

    if (!guessedTitle) {
      guessedTitle = 'Wallet 交易';
    }

    let guessedDate = new Date().toISOString().split('T')[0];
    const dateMatch = fullText.match(/\b(\d{4}[-\/]\d{1,2}[-\/]\d{1,2})\b/) || fullText.match(/\b(\d{1,2}[-\/]\d{1,2}[-\/]\d{4})\b/);
    if (dateMatch) {
      guessedDate = normalizeDateString(dateMatch[1]);
    }

    updateSyncStatusUI();

    let targetAccId = (typeof currentAccountId !== 'undefined') ? currentAccountId : null;
    if (!targetAccId && typeof accounts !== 'undefined' && accounts.length > 0) {
      targetAccId = accounts[0].id;
    }

    openTxPage(null);
    switchTxTab('expense');

    const amtInput = document.getElementById('tx-amount');
    const titleInput = document.getElementById('tx-title');
    const dateInput = document.getElementById('tx-date');
    const accSelect = document.getElementById('tx-from-acc');

    if (amtInput && amount) amtInput.value = amount;
    if (titleInput && guessedTitle) titleInput.value = guessedTitle;
    if (dateInput && guessedDate) dateInput.value = guessedDate;

    if (accSelect && targetAccId) {
      accSelect.value = targetAccId;
      handleFromAccountChange();
    }

  } catch (err) {
    console.error('OCR 解析失敗：', err);
    updateSyncStatusUI('error', 'OCR 辨識失敗');
    setTimeout(() => updateSyncStatusUI(), 3000);
    alert('截圖辨識未能成功，請直接手動輸入。');
  } finally {
    event.target.value = '';
  }
};

window.fetchQuote = function(symbol) {
  if (!symbol) return null;
  const querySym = symbol.trim().toUpperCase();
  return stockPriceCache[querySym] || null;
};

window.fetchQuoteForInput = function() {
  const sym = document.getElementById('tx-stock-symbol').value.trim().toUpperCase();
  if (!sym) { alert('請先輸入 Symbol！'); return; }
  
  const price = fetchQuote(sym);
  if (price) {
    document.getElementById('tx-stock-price').value = Number(price).toFixed(2);
    calcStockTotal();
  } else {
    alert(`在 StockPrices 表中尚未有 ${sym} 的快取報價，請直接輸入市價，系統將自動同步並計算！`);
  }
};

window.refreshLiveStockPrices = async function() {
  const btn = document.getElementById('btn-refresh-prices') || event?.target;
  const originalText = btn ? btn.innerText : '🔄 更新市價';

  if (btn) {
    btn.innerText = '⏳ 正在更新市價...';
    btn.disabled = true;
    btn.style.opacity = '0.6';
    btn.style.cursor = 'not-allowed';
  }

  try {
    await manualSyncTrigger();
    renderApp();
    alert('✅ 持倉市價已更新');
  } catch (err) {
    alert('⚠️ 更新市價失敗，請檢查網絡連線！');
  } finally {
    if (btn) {
      btn.innerText = originalText;
      btn.disabled = false;
      btn.style.opacity = '1';
      btn.style.cursor = 'pointer';
    }
  }
};

// ==========================================================================
// 核心現金結餘計算（包含買賣股票扣除與實收標準會計邏輯）
// ==========================================================================
function getAccountCashBalance(accId) {
  const acc = accounts.find(a => a.id === accId);
  if (!acc) return 0;
  let balance = Number(acc.initialBalance || 0);

  transactions.forEach(t => {
    const txCur = t.currency || acc.currency;

    if (t.type === 'adjust' && t.accountId === accId) {
      const amt = (txCur === acc.currency) ? Number(t.amount) : convertAmount(Number(t.amount), txCur, acc.currency);
      balance += amt;
    }

    if (t.type === 'expense' && t.accountId === accId) {
      const comm = Number(t.commission) || 0;
      const amt = (txCur === acc.currency) ? Number(t.amount) : convertAmount(Number(t.amount), txCur, acc.currency);
      balance -= (amt + comm);
    }

    if (t.type === 'income' && t.accountId === accId) {
      const amt = (txCur === acc.currency) ? Number(t.amount) : convertAmount(Number(t.amount), txCur, acc.currency);
      balance += amt;
    }

    if (t.type === 'transfer') {
      const comm = Number(t.commission) || 0;
      if (t.accountId === accId) {
        const outCur = t.currency || acc.currency;
        const amt = (outCur === acc.currency) ? Number(t.amount) : convertAmount(Number(t.amount), outCur, acc.currency);
        balance -= (amt + comm);
      }
      if (t.toAccountId === accId) {
        const inAmt = Number(t.toAmount || t.amount);
        const inCur = t.toCurrency || acc.currency;
        const amtConverted = (inCur === acc.currency) ? inAmt : convertAmount(inAmt, inCur, acc.currency);
        balance += amtConverted;
      }
    }

    if (t.type === 'exchange') {
      const comm = Number(t.commission) || 0;
      if (t.accountId === accId) {
        const outCur = t.currency || acc.currency;
        const outAmt = (outCur === acc.currency) ? Number(t.amount) : convertAmount(Number(t.amount), outCur, acc.currency);
        balance -= (outAmt + comm);
      }
      if (t.toAccountId === accId) {
        const inCur = t.toCurrency || acc.currency;
        const inAmt = (inCur === acc.currency) ? Number(t.toAmount) : convertAmount(Number(t.toAmount), inCur, acc.currency);
        balance += inAmt;
      }
    }

    // 買入證券：扣除 (總價 + 佣金)
    if (t.type === 'buy' && t.accountId === accId) {
      balance -= (Number(t.amount) + (Number(t.commission) || 0));
    }

    // 賣出證券：實收 = 總價(amount) - 佣金(commission)
    if (t.type === 'sell' && t.accountId === accId) {
      balance += (Number(t.amount) - (Number(t.commission) || 0));
    }

    // 股息照常計入現金
    if (t.type === 'dividend' && t.accountId === accId) {
      balance += Number(t.amount);
    }
  });

  return balance;
}

function getHoldings(accId) {
  const holdingsMap = {};
  const accTxs = transactions
    .filter(t => t.accountId === accId && (t.type === 'buy' || t.type === 'sell' || t.type === 'dividend'))
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  accTxs.forEach(t => {
    const sym = (t.symbol || '').toString().trim().toUpperCase();
    if (!sym) return;

    if (!holdingsMap[sym]) {
      holdingsMap[sym] = { shares: 0, totalCost: 0, totalDividends: 0 };
    }
    const h = holdingsMap[sym];
    const shares = parseFloat(t.shares) || 0;
    const amount = parseFloat(t.amount) || 0;
    const commission = parseFloat(t.commission) || 0;

    if (t.type === 'buy') {
      const buyCost = amount + commission;
      h.shares += shares;
      h.totalCost += buyCost;
    } else if (t.type === 'sell') {
      const currentShares = h.shares;
      const avgCost = currentShares > 0 ? (h.totalCost / currentShares) : 0;
      h.shares = Math.max(0, currentShares - shares);
      h.totalCost = Math.max(0, h.totalCost - (avgCost * Math.min(currentShares, shares)));
    } else if (t.type === 'dividend') {
      h.totalDividends += amount;
    }
  });

  const list = [];
  for (const [sym, data] of Object.entries(holdingsMap)) {
    if (data.shares > 0.0001) {
      const avgCost = data.shares > 0 ? (data.totalCost / data.shares) : 0;
      const currentPrice = stockPriceCache[sym] || avgCost;
      const marketValue = data.shares * currentPrice;
      const capitalGL = marketValue - data.totalCost;
      const totalGL = capitalGL + data.totalDividends;
      const totalGLPercent = data.totalCost > 0 ? (totalGL / data.totalCost) * 100 : 0;

      list.push({
        symbol: sym,
        shares: data.shares,
        avgCost,
        currentPrice,
        marketValue,
        capitalGL,
        totalGL,
        totalGLPercent,
        totalDividends: data.totalDividends
      });
    }
  }

  list.sort((a, b) => a.symbol.localeCompare(b.symbol));
  return list;
}

function getAccountTotalValue(accId) {
  const cash = getAccountCashBalance(accId);
  const acc = accounts.find(a => a.id === accId);
  if (!acc) return 0;
  if (acc.type === 'investment' || acc.type === 'crypto') {
    const holdings = getHoldings(accId);
    const holdingsValue = holdings.reduce((sum, h) => sum + h.marketValue, 0);
    return cash + holdingsValue;
  }
  return cash;
}

// 帳戶主頁分組渲染
window.renderAccountsView = function() {
  const container = document.getElementById('account-groups-container');
  if (!container) return;
  container.innerHTML = '';

  if (typeof collapsedGroups === 'undefined') window.collapsedGroups = {};

  groups.forEach(grp => {
    const isCollapsed = collapsedGroups[grp.id] !== false;
    const grpAccounts = accounts.filter(a => a.groupId === grp.id);

    let grpTotal = 0;
    grpAccounts.forEach(acc => {
      const b = (typeof getAccountTotalValue === 'function') ? getAccountTotalValue(acc.id) : getAccountCashBalance(acc.id);
      grpTotal += convertAmount(b, acc.currency, grp.currency || baseCurrency);
    });

    const grpIcon = (grp.icon && grp.icon.trim()) ? grp.icon.trim() : (typeof getGroupDefaultIcon === 'function' ? getGroupDefaultIcon(grp) : '📁');
    const balColorClass = getBalanceColorClass(grpTotal);

    const groupCard = document.createElement('div');
    groupCard.className = `ios-group-card ${window.isEditMode ? 'is-edit-mode' : ''}`;

    const headerRow = document.createElement('div');
    headerRow.className = 'group-header-row';
    if (!isCollapsed && !window.isEditMode) {
      headerRow.style.paddingBottom = '10px';
      headerRow.style.borderBottom = '0.5px solid #F0F1F5';
    }

    headerRow.onclick = () => {
      if (window.isEditMode) {
        openEditGroupModal(grp.id);
      } else {
        toggleGroupCollapse(grp.id);
      }
    };

    headerRow.innerHTML = `
      <div style="display:flex; align-items:center; gap:8px;">
        <span style="font-size:10px; color:#8E8E93; width:12px; text-align:center;">${window.isEditMode ? '✎' : (isCollapsed ? '▶' : '▼')}</span>
        <span style="font-size:18px;">${grpIcon}</span>
        <span style="font-size:15px; font-weight:700; color:#1C1C1E;">${grp.name}</span>
      </div>
      <div style="display:flex; align-items:center; gap:6px;">
        <span class="${balColorClass} group-bal-text" style="font-size:15px; font-feature-settings:'tnum' 1; font-variant-numeric:tabular-nums;">${fmtCur(grpTotal, grp.currency || baseCurrency)}</span>
      </div>
    `;
    groupCard.appendChild(headerRow);

    const accList = document.createElement('div');
    accList.style.display = (isCollapsed || window.isEditMode) ? 'none' : 'block';

    if (grpAccounts.length === 0) {
      accList.innerHTML = '<div style="font-size:12px; color:var(--text-muted); padding:10px 0; text-align:center;">此分組尚無帳戶</div>';
    } else {
      grpAccounts.forEach((acc) => {
        const bal = (typeof getAccountTotalValue === 'function') ? getAccountTotalValue(acc.id) : getAccountCashBalance(acc.id);
        const itemBalClass = getBalanceColorClass(bal);

        const row = document.createElement('div');
        row.className = 'group-account-item';
        row.onclick = (e) => {
          e.stopPropagation();
          selectAccount(acc.id);
        };

        row.innerHTML = `
          <div>
            <div style="font-size:14.5px; font-weight:600; color:#1C1C1E;">${acc.name}</div>
          </div>
          <div style="display:flex; align-items:center; gap:6px;">
            <span class="${itemBalClass}" style="font-size:14px; font-feature-settings:'tnum' 1; font-variant-numeric:tabular-nums;">${fmtCur(bal, acc.currency)}</span>
            <span style="color:#C7C7CC; font-size:14px;">›</span>
          </div>
        `;
        accList.appendChild(row);
      });
    }

    groupCard.appendChild(accList);
    container.appendChild(groupCard);
  });
};

window.toggleGroupCollapse = function(grpId) {
  if (typeof collapsedGroups === 'undefined') window.collapsedGroups = {};
  const currentState = collapsedGroups[grpId] !== false;
  collapsedGroups[grpId] = !currentState;
  localStorage.setItem('wiz_collapsed_groups', JSON.stringify(collapsedGroups));
  renderAccountsView();
};

window.renderApp = function() {
  let totalNetWorthInBase = 0;
  accounts.forEach(acc => {
    const accVal = getAccountTotalValue(acc.id);
    totalNetWorthInBase += convertAmount(accVal, acc.currency || 'CAD', baseCurrency);
  });

  const titleEl = document.getElementById('header-networth-title');
  const amtEl = document.getElementById('total-net-worth');
  if (titleEl) titleEl.innerText = `Net Worth (${baseCurrency} 📈)`;
  // 移除 $ 符號
  if (amtEl) amtEl.innerText = `${totalNetWorthInBase.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  if (typeof window.renderAccountsView === 'function') window.renderAccountsView();
  renderDetailView();
  if (window.renderDebtTrackerView) window.renderDebtTrackerView();
  renderCategoryTree();
  updateSyncStatusUI();
};

window.selectAccount = function(accId) {
  currentAccountId = accId;
  document.body.classList.add('mobile-view-detail');
  document.body.classList.add('hide-header');
  renderApp();
};

window.goBackToList = function() {
  document.body.classList.remove('mobile-view-detail');
  document.body.classList.remove('hide-header');
  switchMainTab('accounts');
};

window.switchInvestSubTab = function(tab) {
  currentInvestSubTab = tab;
  const hBtn = document.getElementById('tab-btn-holdings');
  const tBtn = document.getElementById('tab-btn-txs');
  if (hBtn) hBtn.classList.toggle('active', tab === 'holdings');
  if (tBtn) tBtn.classList.toggle('active', tab === 'transactions');
  renderDetailView();
};

window.handleSearchInput = function(val) {
  searchKeyword = val.trim().toLowerCase();
  renderDetailView();
};

window.switchMainTab = function(tabName) {
  currentMainTab = tabName;

  const viewAccs = document.getElementById('view-accounts');
  const viewDebts = document.getElementById('view-debt-tracker') || document.getElementById('view-debts');
  const viewSettings = document.getElementById('view-settings');
  const viewForm = document.getElementById('view-tx-form');

  if (viewAccs) viewAccs.style.display = 'none';
  if (viewDebts) viewDebts.style.display = 'none';
  if (viewSettings) viewSettings.style.display = 'none';
  if (viewForm) viewForm.style.display = 'none';

  document.querySelectorAll('.ios-tab-bar .tab-item').forEach(el => el.classList.remove('active'));

  if (tabName === 'accounts') {
    if (viewAccs) viewAccs.style.display = 'flex';
    const tabBtn = document.getElementById('tab-btn-accounts');
    if (tabBtn) tabBtn.classList.add('active');
    if (!document.body.classList.contains('mobile-view-detail')) {
      document.body.classList.remove('hide-header');
    }
    if (typeof window.renderAccountsView === 'function') window.renderAccountsView();
  } else if (tabName === 'debts') {
    if (viewDebts) viewDebts.style.display = 'flex';
    const tabBtn = document.getElementById('tab-btn-debts');
    if (tabBtn) tabBtn.classList.add('active');
    document.body.classList.add('hide-header');
    if (typeof window.renderDebtTrackerView === 'function') window.renderDebtTrackerView();
  } else if (tabName === 'settings') {
    if (viewSettings) viewSettings.style.display = 'flex';
    const tabBtn = document.getElementById('tab-btn-settings');
    if (tabBtn) tabBtn.classList.add('active');
    document.body.classList.add('hide-header');
    
    const baseCur = document.getElementById('setting-base-currency');
    const cloudUrl = document.getElementById('setting-cloud-url');
    if (baseCur) baseCur.value = baseCurrency;
    if (cloudUrl) cloudUrl.value = SCRIPT_URL;
    renderCategoryTree();
  }
};

delete window.renderAllTransactionsView;
delete window.handleAllTxSearch;
delete window.allTxSearchQuery;

// ==========================================================================
// 分類選取器 (含 Recent 5 儲存與渲染)
// ==========================================================================
function selectCategoryFromPicker(cat) {
  const catInput = document.getElementById('tx-category');
  const catDisplay = document.getElementById('tx-cat-display-name');
  if (catInput) catInput.value = cat.id;
  if (catDisplay) catDisplay.innerText = `${cat.icon || '🏷️'} ${cat.name}`;

  recordRecentCategory(cat.id);
  closeModal('cat-picker-drawer');
}

window.openCatPicker = function() {
  const searchInput = document.getElementById('cat-picker-search');
  if (searchInput) searchInput.value = '';
  renderPickerCategories(currentTxType, '');
  openModal('cat-picker-drawer');
};

window.renderPickerCategories = function(flowType, keyword = '') {
  const container = document.getElementById('cat-picker-list');
  if (!container) return;
  container.innerHTML = '';
  const kw = (keyword || '').toLowerCase().trim();

  if (!kw) {
    const recentIds = getRecentCategoryIds();
    const validRecents = recentIds
      .map(id => categories.find(c => c.id === id && (c.flowType === flowType || !c.flowType)))
      .filter(Boolean);

    if (validRecents.length > 0) {
      const section = document.createElement('div');
      section.className = 'recent-cats-section';
      section.innerHTML = `<div class="recent-cats-title">⏱️ 最近使用</div>`;

      const wrap = document.createElement('div');
      wrap.className = 'recent-cats-wrap';

      validRecents.forEach(cat => {
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'recent-cat-chip';
        chip.innerHTML = `<span>${cat.icon || '🏷️'}</span><span>${cat.name}</span>`;
        chip.onclick = () => {
          selectCategoryFromPicker(cat);
        };
        wrap.appendChild(chip);
      });

      section.appendChild(wrap);
      container.appendChild(section);
    }
  }

  const parents = categories.filter(c => (!c.flowType || c.flowType === flowType) && !c.parentId);
  parents.forEach(p => {
    const children = categories.filter(c => c.parentId === p.id);
    const matchedChildren = children.filter(ch => ch.name.toLowerCase().includes(kw));
    const parentMatches = p.name.toLowerCase().includes(kw);

    if (kw && !parentMatches && matchedChildren.length === 0) return;

    const showChildren = kw ? matchedChildren : children;

    const pHeader = document.createElement('div');
    pHeader.style.cssText = 'font-size:11.5px; font-weight:700; color:#8E8E93; padding:10px 8px 4px 8px; text-transform:uppercase;';
    pHeader.innerText = `${p.icon || '📁'} ${p.name}`;
    container.appendChild(pHeader);

    showChildren.forEach(ch => {
      const row = document.createElement('div');
      row.className = 'picker-cat-row';
      row.style.cssText = 'display:flex; align-items:center; gap:10px; padding:10px 8px; border-radius:10px; cursor:pointer;';
      row.innerHTML = `<span style="font-size:18px;">${ch.icon || '🏷️'}</span><span style="font-size:13.5px; font-weight:600; color:#1C1C1E;">${ch.name}</span>`;
      row.onclick = () => {
        selectCategoryFromPicker(ch);
      };
      container.appendChild(row);
    });
  });
};

window.filterPickerCategories = function(kw) {
  renderPickerCategories(currentTxType, kw);
};

window.openTxPage = function(txId = null) {
  previousActiveTab = currentMainTab || 'accounts';
  
  const viewAccs = document.getElementById('view-accounts');
  const viewDebts = document.getElementById('view-debt-tracker') || document.getElementById('view-debts');
  const viewSettings = document.getElementById('view-settings');
  
  if (viewAccs) viewAccs.style.display = 'none';
  if (viewDebts) viewDebts.style.display = 'none';
  if (viewSettings) viewSettings.style.display = 'none';
  
  const tabBar = document.querySelector('.ios-tab-bar');
  if (tabBar) tabBar.style.display = 'none';

  document.body.classList.add('hide-header');

  const txPage = document.getElementById('view-tx-form');
  if (txPage) txPage.style.display = 'flex';

  if (txId) {
    const titleEl = document.getElementById('tx-page-title');
    const delBtn = document.getElementById('btn-delete-tx-page');
    if (titleEl) titleEl.innerText = '編輯交易';
    if (delBtn) delBtn.style.display = 'block';
    setupEditTxForm(txId);
  } else {
    const titleEl = document.getElementById('tx-page-title');
    const delBtn = document.getElementById('btn-delete-tx-page');
    if (titleEl) titleEl.innerText = '記一筆交易';
    if (delBtn) delBtn.style.display = 'none';
    resetTxForm();
  }
};

window.closeTxPage = function() {
  const txPage = document.getElementById('view-tx-form');
  if (txPage) txPage.style.display = 'none';
  
  const tabBar = document.querySelector('.ios-tab-bar');
  if (tabBar && window.innerWidth <= 768) {
    tabBar.style.display = 'flex';
  }
  
  switchMainTab(previousActiveTab);
};

window.saveTransactionFromPage = function() {
  const success = saveTransaction();
  if (success !== false) {
    closeTxPage();
  }
};

window.deleteCurrentTxFromPage = function() {
  if (confirm('確定刪除此交易？')) {
    deleteCurrentTx();
    closeTxPage();
  }
};

function resetTxForm() {
  const defaultAcc = accounts.find(a => a.id === currentAccountId) || accounts[0];
  const isInvest = defaultAcc && (defaultAcc.type === 'investment' || defaultAcc.type === 'crypto');

  ['tx-id', 'tx-title', 'tx-amount', 'tx-foreign-amount', 'tx-base-amount', 
   'tx-foreign-rate', 'tx-expense-commission', 'tx-from-amount', 'tx-to-amount', 
   'tx-exchange-rate', 'tx-commission', 'tx-stock-symbol', 'tx-stock-shares', 
   'tx-stock-price', 'tx-stock-total', 'tx-stock-commission'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  
  const pendingEl = document.getElementById('tx-is-pending');
  if (pendingEl) pendingEl.checked = false;
  
  const dateEl = document.getElementById('tx-date');
  if (dateEl) dateEl.value = new Date().toISOString().split('T')[0];

  const catInput = document.getElementById('tx-category');
  const catDisplay = document.getElementById('tx-cat-display-name');
  if (catInput) catInput.value = '';
  if (catDisplay) catDisplay.innerText = '🏷️ 點擊選擇分類';

  setupModalTypeTabs(isInvest);
  populateTransferAccountSelects(defaultAcc ? defaultAcc.id : null);

  const targetAcc = accounts.find(a => a.id !== (defaultAcc ? defaultAcc.id : '')) || defaultAcc;
  if (defaultAcc) {
    populateCurrencyOptions(document.getElementById('tx-from-currency'), defaultAcc.currency);
  }
  if (targetAcc) {
    populateCurrencyOptions(document.getElementById('tx-to-currency'), targetAcc.currency);
  }

  // 強制重設外幣區塊顯示，預設對齊本幣
  const standardAmtBox = document.getElementById('f-group-amount');
  const foreignAmtBox = document.getElementById('f-group-foreign-expense');
  if (standardAmtBox) standardAmtBox.style.display = 'flex';
  if (foreignAmtBox) foreignAmtBox.style.display = 'none';

  switchTxTab(isInvest ? 'buy' : 'expense');
}

function setupEditTxForm(txId) {
  const tx = transactions.find(t => t.id === txId);
  if (!tx) return;
  const acc = accounts.find(a => a.id === tx.accountId) || accounts[0];
  const isInvest = acc && (acc.type === 'investment' || acc.type === 'crypto');

  ['tx-id', 'tx-title', 'tx-amount', 'tx-foreign-amount', 'tx-base-amount', 
   'tx-foreign-rate', 'tx-expense-commission', 'tx-from-amount', 'tx-to-amount', 
   'tx-exchange-rate', 'tx-commission', 'tx-stock-symbol', 'tx-stock-shares', 
   'tx-stock-price', 'tx-stock-total', 'tx-stock-commission'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });

  document.getElementById('tx-id').value = tx.id;
  const pendingEl = document.getElementById('tx-is-pending');
  if (pendingEl) {
    pendingEl.checked = (tx.isPending === true || String(tx.isPending).trim().toUpperCase() === 'TRUE');
  }
  
  setupModalTypeTabs(isInvest);
  populateTransferAccountSelects(tx.accountId, tx.toAccountId);

  const fromAcc = accounts.find(a => a.id === tx.accountId);
  const toAcc = accounts.find(a => a.id === tx.toAccountId);
  
  // 優先還原交易外幣，若無則還原基準扣款幣
  const currentTxCur = tx.foreignCurrency || tx.currency || fromAcc?.currency || 'CAD';
  populateCurrencyOptions(document.getElementById('tx-from-currency'), currentTxCur);
  populateCurrencyOptions(document.getElementById('tx-to-currency'), tx.toCurrency || toAcc?.currency || 'CAD');

  switchTxTab(tx.type);

  if (tx.type === 'adjust') {
    document.getElementById('tx-title').value = tx.title || '餘額調整';
    document.getElementById('tx-amount').value = tx.amount;
  } else if (tx.type === 'expense' || tx.type === 'income') {
    document.getElementById('tx-title').value = tx.title || '';
    document.getElementById('tx-category').value = tx.categoryId || '';
    const cat = categories.find(c => c.id === tx.categoryId);
    const catDisplay = document.getElementById('tx-cat-display-name');
    if (catDisplay) {
      catDisplay.innerText = cat ? `${cat.icon} ${cat.name}` : '🏷️ 點擊選擇分類';
    }

    if (tx.type === 'expense') {
      const baseCur = fromAcc ? fromAcc.currency : 'CAD';
      const isForeign = tx.foreignCurrency && tx.foreignCurrency !== baseCur;
      
      if (isForeign) {
        document.getElementById('tx-from-currency').value = tx.foreignCurrency;
        handleExpenseCurrencyChange();
        document.getElementById('tx-foreign-amount').value = tx.foreignAmount || '';
        document.getElementById('tx-base-amount').value = tx.amount || '';
        document.getElementById('tx-foreign-rate').value = tx.rate || '';
        document.getElementById('tx-expense-commission').value = tx.commission || '';
      } else {
        document.getElementById('tx-from-currency').value = tx.currency || baseCur;
        handleExpenseCurrencyChange();
        document.getElementById('tx-amount').value = tx.amount || '';
      }
    } else {
      document.getElementById('tx-amount').value = tx.amount || '';
    }
  } else if (tx.type === 'transfer') {
    document.getElementById('tx-commission').value = tx.commission || '';
    const activeFromCur = document.getElementById('tx-from-currency').value;
    const activeToCur = document.getElementById('tx-to-currency').value;

    if (activeFromCur !== activeToCur) {
      document.getElementById('tx-from-amount').value = tx.amount;
      document.getElementById('tx-to-amount').value = tx.toAmount || tx.amount;
      document.getElementById('tx-exchange-rate').value = tx.rate || ((tx.toAmount || tx.amount) / tx.amount).toFixed(4);
    } else {
      document.getElementById('tx-amount').value = tx.amount;
    }
  } else if (tx.type === 'exchange') {
    document.getElementById('tx-from-amount').value = tx.amount;
    document.getElementById('tx-to-amount').value = tx.toAmount;
    document.getElementById('tx-exchange-rate').value = tx.rate;
    document.getElementById('tx-commission').value = tx.commission || '';
  } else if (tx.type === 'buy' || tx.type === 'sell') {
    document.getElementById('tx-stock-symbol').value = tx.symbol || '';
    document.getElementById('tx-stock-shares').value = tx.shares || '';
    document.getElementById('tx-stock-price').value = tx.price || '';
    document.getElementById('tx-stock-total').value = tx.amount || '';
    document.getElementById('tx-stock-commission').value = tx.commission || '';
  } else if (tx.type === 'dividend') {
    document.getElementById('tx-stock-symbol').value = tx.symbol || '';
    document.getElementById('tx-stock-total').value = tx.amount || '';
  }

  const dateInput = document.getElementById('tx-date');
  if (dateInput) dateInput.value = normalizeDateString(tx.date);
}

function renderDetailView() {
  const currentAcc = accounts.find(a => a.id === currentAccountId);
  const nameEl = document.getElementById('current-account-name');
  const balEl = document.getElementById('current-account-balance');
  const container = document.getElementById('content-container');
  const investTabs = document.getElementById('invest-subtabs');

  if (window.checkStatementButtonVisibility) {
    window.checkStatementButtonVisibility(currentAcc);
  }

  if (!container) return;

  if (!currentAcc) {
    if (nameEl) nameEl.innerText = '請先建立帳戶';
    if (balEl) balEl.innerText = '0.00';
    container.innerHTML = '<p style="color:var(--text-muted); text-align:center; padding: 40px 0;">未有選定帳戶</p>';
    if (investTabs) investTabs.style.display = 'none';
    return;
  }

  const icon = getAccountTypeIcon(currentAcc.type);
  if (nameEl) nameEl.innerHTML = `<span style="margin-right: 6px;">${icon}</span>${currentAcc.name}`;
  
  const totalVal = getAccountTotalValue(currentAcc.id);
  const cashBal = getAccountCashBalance(currentAcc.id);

  if (currentAcc.type === 'investment' || currentAcc.type === 'crypto') {
    if (investTabs) investTabs.style.display = 'flex';
    if (balEl) balEl.innerText = `總市值: ${fmtCur(totalVal, currentAcc.currency)} (現金: ${fmtCur(cashBal, currentAcc.currency)})`;
    if (currentInvestSubTab === 'holdings') {
      renderHoldings(currentAcc);
      return;
    }
  } else {
    if (investTabs) investTabs.style.display = 'none';
    if (balEl) balEl.innerText = `${fmtCur(cashBal, currentAcc.currency)}`;
  }

  renderTransactions(currentAcc);
}

function renderHoldings(currentAcc) {
  const container = document.getElementById('content-container');
  if (!container) return;
  const holdings = getHoldings(currentAcc.id);
  container.innerHTML = '<div style="padding: 14px 20px;"></div>';
  const wrapper = container.firstElementChild;

  if (holdings.length === 0) {
    wrapper.innerHTML = '<p style="color:var(--text-muted); text-align:center; padding: 40px 0;">目前無任何持倉。請撳「+ 記一筆」並選擇 Buy 買入股票 ✨</p>';
    return;
  }

  holdings.forEach(h => {
    const card = document.createElement('div');
    card.className = 'holding-card';
    const isPos = h.totalGL >= 0;
    const displayShares = parseFloat(Number(h.shares).toFixed(4));

    card.innerHTML = `
      <div>
        <div class="holding-symbol">${h.symbol}</div>
        <div class="holding-shares">${displayShares} 股 • 均價 ${h.avgCost.toFixed(2)} (市價 ${h.currentPrice.toFixed(2)})</div>
        ${h.totalDividends > 0 ? `<div class="holding-div-badge">累積股息: +${h.totalDividends.toFixed(2)}</div>` : ''}
      </div>
      <div>
        <div class="holding-val">${fmtCur(h.marketValue, currentAcc.currency)}</div>
        <div class="holding-gl ${isPos ? 'pos' : 'neg'}">
          ${isPos ? '+' : ''}${fmtCur(h.totalGL, currentAcc.currency)} (${isPos ? '+' : ''}${h.totalGLPercent.toFixed(2)}%)
        </div>
      </div>
    `;
    wrapper.appendChild(card);
  });
}

function renderTransactions(currentAcc) {
  const container = document.getElementById('content-container');
  if (!container) return;
  let accTxs = transactions.filter(t => t.accountId === currentAcc.id || t.toAccountId === currentAcc.id);

  if (searchKeyword) {
    const isDatePattern = /^\d{4}[-/]\d{1,2}/.test(searchKeyword) || /^\d{2}[-/]\d{2}/.test(searchKeyword);
    accTxs = accTxs.filter(t => {
      const txDate = normalizeDateString(t.date);
      if (isDatePattern) {
        return txDate.includes(searchKeyword.replace('/', '-'));
      }
      const title = (t.title || '').toLowerCase();
      const sym = (t.symbol || '').toLowerCase();
      const cat = categories.find(c => c.id === t.categoryId);
      const catName = cat ? cat.name.toLowerCase() : '';
      const amt = (t.amount || '').toString();
      return title.includes(searchKeyword) || sym.includes(searchKeyword) || catName.includes(searchKeyword) || amt.includes(searchKeyword);
    });
  }

  accTxs.sort((a,b) => new Date(b.date) - new Date(a.date));

  const isPendingTx = (t) => t.isPending === true || String(t.isPending).trim().toUpperCase() === 'TRUE';

  const pendingTxs = accTxs.filter(isPendingTx);
  const regularTxs = accTxs.filter(t => !isPendingTx(t));

  container.innerHTML = '';

  if (accTxs.length === 0) {
    container.innerHTML = '<p style="color:var(--text-muted); text-align:center; padding: 40px 0;">未有符合條件的交易紀錄 ✨</p>';
    return;
  }

  if (pendingTxs.length > 0) {
    const pHeader = document.createElement('div');
    pHeader.className = 'tx-section-header';
    pHeader.innerText = `🚩 待還 / Pending 項目 (${pendingTxs.length})`;
    container.appendChild(pHeader);

    const pList = document.createElement('div');
    pList.className = 'tx-list';
    pendingTxs.forEach(t => pList.appendChild(createTxElement(t, currentAcc)));
    container.appendChild(pList);
  }

  const monthsMap = {};
  regularTxs.forEach(t => {
    const rawDate = normalizeDateString(t.date);
    const ym = (rawDate || '').slice(0, 7) || 'Other';
    if (!monthsMap[ym]) monthsMap[ym] = [];
    monthsMap[ym].push(t);
  });

  const sortedMonths = Object.keys(monthsMap).sort().reverse();

  sortedMonths.forEach(ym => {
    const monthTxs = monthsMap[ym];
    let monthTitle = ym;
    if (/^\d{4}-\d{2}$/.test(ym)) {
      const [y, m] = ym.split('-');
      monthTitle = `${y} 年 ${m} 月`;
    }

    const div = document.createElement('div');
    div.className = 'month-divider';
    div.innerHTML = `<span>📅 ${monthTitle}</span><span>${monthTxs.length} 筆明細</span>`;
    container.appendChild(div);

    const list = document.createElement('div');
    list.className = 'tx-list';
    monthTxs.forEach(t => list.appendChild(createTxElement(t, currentAcc)));
    container.appendChild(list);
  });
}

function createTxElement(tx, currentAcc) {
  const isPending = tx.isPending === true || String(tx.isPending).trim().toUpperCase() === 'TRUE';
  const item = document.createElement('div');
  item.className = `tx-item ${isPending ? 'pending-item' : ''}`;

  let icon = '📝';
  let title = tx.title || '交易';
  const cleanDate = normalizeDateString(tx.date);
  let catBadgeHtml = '';
  let amtClass = 'expense';
  let amtStr = '';

  const displayCur = (tx.accountId === currentAcc.id 
    ? (tx.currency || currentAcc.currency) 
    : (tx.toCurrency || currentAcc.currency));

  if (tx.type === 'adjust') {
    icon = '⚖️';
    title = tx.title || '餘額調整';
    catBadgeHtml = `<span class="tx-cat-chip">⚖️ 調整項目</span>`;
    const numAmt = Number(tx.amount) || 0;
    if (numAmt >= 0) {
      amtClass = 'income';
      amtStr = `+${fmtCur(numAmt, displayCur)}`;
    } else {
      amtClass = 'expense';
      amtStr = `-${fmtCur(Math.abs(numAmt), displayCur)}`;
    }
  } else if (tx.type === 'expense' || tx.type === 'income') {
    const cat = categories.find(c => c.id === tx.categoryId);
    if (cat) {
      icon = cat.icon || '🏷️';
      const parent = cat.parentId ? categories.find(p => p.id === cat.parentId) : null;
      const catFullName = `${parent ? parent.name + ' > ' : ''}${cat.name}`;
      catBadgeHtml = `<span class="tx-cat-chip">${cat.icon || '🏷️'} ${catFullName}</span>`;
    }
    amtClass = tx.type;

    if (tx.type === 'expense') {
      const comm = Number(tx.commission) || 0;
      const totalOut = Number(tx.amount) + comm;
      amtStr = `-${fmtCur(totalOut, displayCur)}`;

      // 外幣支出審計展示（徹底移除 $）
      if (tx.foreignAmount && tx.foreignCurrency && tx.foreignCurrency !== displayCur) {
        const commStr = comm > 0 ? ` + 手續費 ${comm.toFixed(2)}` : '';
        const fxInfo = `包含 ${tx.foreignCurrency} ${Number(tx.foreignAmount).toFixed(2)} @ ${Number(tx.rate || 1).toFixed(4)}${commStr}`;
        catBadgeHtml += `<span class="tx-cat-chip">🌐 ${fxInfo}</span>`;
      } else if (comm > 0) {
        catBadgeHtml += `<span class="tx-cat-chip">含手續費 ${fmtCur(comm, displayCur)}</span>`;
      }
    } else {
      amtStr = `+${fmtCur(Number(tx.amount), displayCur)}`;
    }
  } else if (tx.type === 'transfer') {
    icon = '🔁';
    const toAcc = accounts.find(a => a.id === tx.toAccountId);
    const fromAcc = accounts.find(a => a.id === tx.accountId);
    const comm = Number(tx.commission) || 0;
    
    if (tx.accountId === currentAcc.id) {
      title = `轉帳至 ${toAcc ? toAcc.name : ''}`;
      amtClass = 'expense';
      amtStr = `-${fmtCur(Number(tx.amount) + comm, displayCur)}`;
      let note = comm > 0 ? `含手續費 ${fmtCur(comm, displayCur)}` : '';
      if (tx.toCurrency && tx.toCurrency !== tx.currency) {
        note += (note ? ' • ' : '') + `實收 ${fmtCur(Number(tx.toAmount || tx.amount), tx.toCurrency)}`;
      }
      if (note) catBadgeHtml = `<span class="tx-cat-chip">🔁 ${note}</span>`;
    } else {
      title = `由 ${fromAcc ? fromAcc.name : ''} 轉入`;
      amtClass = 'income';
      const incomingAmt = Number(tx.toAmount || tx.amount);
      amtStr = `+${fmtCur(incomingAmt, displayCur)}`;
      if (tx.currency && tx.currency !== tx.toCurrency) {
        catBadgeHtml = `<span class="tx-cat-chip">🔁 轉出 ${fmtCur(Number(tx.amount), tx.currency)}</span>`;
      }
    }
  } else if (tx.type === 'exchange') {
    icon = '💱';
    const toAcc = accounts.find(a => a.id === tx.toAccountId);
    const fromAcc = accounts.find(a => a.id === tx.accountId);
    const comm = Number(tx.commission) || 0;
    const isSameAcc = (tx.accountId === tx.toAccountId);

    if (isSameAcc) {
      title = `貨幣兌換 (${tx.currency || '原幣'} ➔ ${tx.toCurrency || '目標幣'})`;
      amtClass = 'transfer';
      amtStr = `-${fmtCur(Number(tx.amount) + comm, tx.currency)} ➔ +${fmtCur(Number(tx.toAmount), tx.toCurrency)}`;
      catBadgeHtml = `<span class="tx-cat-chip">💱 匯率 ${tx.rate || '-'}${comm > 0 ? ' • 手續費 ' + fmtCur(comm, tx.currency) : ''}</span>`;
    } else {
      if (tx.accountId === currentAcc.id) {
        title = `兌換至 ${toAcc ? toAcc.name : ''}`;
        amtClass = 'transfer';
        amtStr = `-${fmtCur(Number(tx.amount) + comm, displayCur)}`;
        catBadgeHtml = `<span class="tx-cat-chip">💱 匯率 ${tx.rate || '-'}${comm > 0 ? ' • 手續費 ' + fmtCur(comm, displayCur) : ''}</span>`;
      } else {
        title = `由 ${fromAcc ? fromAcc.name : ''} 存入`;
        amtClass = 'income';
        amtStr = `+${fmtCur(Number(tx.toAmount), displayCur)}`;
      }
    }
  } else if (tx.type === 'buy') {
    icon = '📈';
    // 徹底移除 $
    title = `買入 ${tx.symbol} (${tx.shares} 股 @ ${tx.price})`;
    amtClass = 'expense';
    amtStr = `-${fmtCur(Number(tx.amount) + (Number(tx.commission) || 0), displayCur)}`;
    catBadgeHtml = `<span class="tx-cat-chip">📈 證券買入</span>`;
  } else if (tx.type === 'sell') {
    icon = '📉';
    const comm = Number(tx.commission) || 0;
    // 徹底移除 $
    title = `賣出 ${tx.symbol} (${tx.shares} 股 @ ${tx.price})${comm > 0 ? ' • 佣金 ' + comm : ''}`;
    const netProceeds = Number(tx.amount) - comm;
    amtClass = 'income';
    amtStr = `+${fmtCur(netProceeds, displayCur)}`;
    catBadgeHtml = `<span class="tx-cat-chip">📉 證券賣出</span>`;
  } else if (tx.type === 'dividend') {
    icon = '📊';
    title = `收到 ${tx.symbol} 現金股息`;
    amtClass = 'income';
    amtStr = `+${fmtCur(Number(tx.amount), displayCur)}`;
    catBadgeHtml = `<span class="tx-cat-chip">📊 股息入帳</span>`;
  }

  item.innerHTML = `
    <div class="tx-left" onclick="openTxPage('${tx.id}')">
      <div class="tx-tag">${icon}</div>
      <div class="tx-content">
        <div class="tx-title">${title}</div>
        <div class="tx-sub-date">${cleanDate}</div>
        ${catBadgeHtml ? `<div class="tx-sub-cat">${catBadgeHtml}</div>` : ''}
      </div>
    </div>
    <div style="display: flex; align-items: center; gap: 8px;">
      <div class="tx-amt ${amtClass}">${amtStr}</div>
      <button class="flag-toggle-btn ${isPending ? 'flagged' : ''}" title="切換待還狀態" onclick="event.stopPropagation(); toggleTxFlag('${tx.id}')">🚩</button>
    </div>
  `;
  return item;
}

window.toggleTxFlag = function(txId) {
  const tx = transactions.find(t => t.id === txId);
  if (tx) {
    const curPending = tx.isPending === true || String(tx.isPending).trim().toUpperCase() === 'TRUE';
    tx.isPending = !curPending;
    if (tx.linkedTxId) {
      const linked = transactions.find(t => t.id === tx.linkedTxId);
      if (linked) linked.isPending = tx.isPending;
    }
    saveData(tx.id);
  }
};

window.setupModalTypeTabs = function(isInvest) {
  const tabContainer = document.getElementById('modal-type-tabs');
  if (!tabContainer) return;
  tabContainer.innerHTML = '';
  const standardTypes = ['expense', 'income', 'transfer', 'exchange', 'adjust'];
  const investTypes = ['expense', 'income', 'buy', 'sell', 'dividend', 'transfer', 'exchange', 'adjust'];
  const typesToRender = isInvest ? investTypes : standardTypes;

  typesToRender.forEach(type => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `type-tab ${currentTxType === type ? 'active' : ''}`;
    btn.innerText = type.charAt(0).toUpperCase() + type.slice(1);
    btn.onclick = () => switchTxTab(type);
    tabContainer.appendChild(btn);
  });
};

// ==========================================================================
// 幣種切換與動態折算（手動優先反推）
// ==========================================================================
window.handleExpenseCurrencyChange = function() {
  const accId = document.getElementById('tx-from-acc')?.value || currentAccountId;
  const acc = accounts.find(a => a.id === accId);
  const baseCur = acc ? acc.currency : 'CAD';
  const chosenCur = document.getElementById('tx-from-currency')?.value || baseCur;

  const isTransfer = (currentTxType === 'transfer');
  const isExchange = (currentTxType === 'exchange');

  if (isTransfer || isExchange) {
    updateTransferOrExchangeUI();
    syncExchangeValuesOnAccountChange();
    return;
  }

  const standardAmtBox = document.getElementById('f-group-amount');
  const foreignAmtBox = document.getElementById('f-group-foreign-expense');

  if (currentTxType === 'expense' && chosenCur !== baseCur) {
    if (standardAmtBox) standardAmtBox.style.display = 'none';
    if (foreignAmtBox) foreignAmtBox.style.display = 'flex';
    const lForeign = document.getElementById('label-foreign-amount');
    const lBase = document.getElementById('label-base-amount');
    if (lForeign) lForeign.innerText = `金額 (${chosenCur})`;
    if (lBase) lBase.innerText = `金額 (${baseCur})`;
    fetchLiveExpenseFX(true);
  } else {
    if (standardAmtBox) standardAmtBox.style.display = (currentTxType === 'expense' || currentTxType === 'income') ? 'flex' : 'none';
    if (foreignAmtBox) foreignAmtBox.style.display = 'none';
    document.getElementById('tx-foreign-amount').value = '';
    document.getElementById('tx-base-amount').value = '';
    document.getElementById('tx-foreign-rate').value = '';
    document.getElementById('tx-expense-commission').value = '';
    const lAmt = document.getElementById('label-amount');
    if (lAmt) lAmt.innerText = '金額';
  }
};

window.handleExpenseAmountInput = function(source) {
  const accId = document.getElementById('tx-from-acc')?.value || currentAccountId;
  const acc = accounts.find(a => a.id === accId);
  const baseCur = acc ? acc.currency : 'CAD';
  const foreignCur = document.getElementById('tx-from-currency')?.value || baseCur;
  if (foreignCur === baseCur) return;

  const fAmt = parseFloat(document.getElementById('tx-foreign-amount').value) || 0;
  const bAmt = parseFloat(document.getElementById('tx-base-amount').value) || 0;
  const rateInput = document.getElementById('tx-foreign-rate');

  if (source === 'foreign') {
    const currentRate = parseFloat(rateInput.value) || 0;
    if (currentRate > 0) {
      document.getElementById('tx-base-amount').value = (fAmt * currentRate).toFixed(2);
    } else {
      fetchLiveExpenseFX(true);
    }
  } else if (source === 'base') {
    // 手動輸入本幣金額，優先反推匯率
    if (fAmt > 0 && bAmt > 0) {
      rateInput.value = (bAmt / fAmt).toFixed(4);
    }
  }
};

window.handleExpenseRateInput = function() {
  const fAmt = parseFloat(document.getElementById('tx-foreign-amount').value) || 0;
  const rate = parseFloat(document.getElementById('tx-foreign-rate').value) || 0;
  if (fAmt > 0 && rate > 0) {
    document.getElementById('tx-base-amount').value = (fAmt * rate).toFixed(2);
  }
};

window.fetchLiveExpenseFX = async function(silent = false) {
  const accId = document.getElementById('tx-from-acc')?.value || currentAccountId;
  const acc = accounts.find(a => a.id === accId);
  const baseCur = acc ? acc.currency : 'CAD';
  const foreignCur = document.getElementById('tx-from-currency')?.value || baseCur;
  if (foreignCur === baseCur) return;

  try {
    const res = await fetch(`https://open.er-api.com/v6/latest/${foreignCur}`);
    const data = await res.json();
    const rate = data.rates[baseCur];
    if (rate) {
      document.getElementById('tx-foreign-rate').value = rate.toFixed(4);
      const fAmt = parseFloat(document.getElementById('tx-foreign-amount').value) || 0;
      if (fAmt > 0) {
        document.getElementById('tx-base-amount').value = (fAmt * rate).toFixed(2);
      }
    }
  } catch (e) {
    if (!silent) alert('取得即時匯率失敗，請手動輸入匯率。');
  }
};

// ==========================================================================
// 嚴格隔離的 switchTxTab（杜絕 Transfer 欄位殘留至 Expense）
// ==========================================================================
window.switchTxTab = function(type) {
  currentTxType = type;
  document.querySelectorAll('#modal-type-tabs .type-tab').forEach(tab => {
    tab.classList.toggle('active', tab.innerText.toLowerCase() === type);
  });

  const isTransfer = (type === 'transfer');
  const isExchange = (type === 'exchange');
  const isTransferOrExchange = (isTransfer || isExchange);
  const isAdjust = (type === 'adjust');
  const isExpense = (type === 'expense');
  const isIncome = (type === 'income');
  const isStock = (type === 'buy' || type === 'sell' || type === 'dividend');

  // 1. 轉出 / 帳戶標籤與目標帳戶控制
  const labelFrom = document.getElementById('label-from-acc');
  if (labelFrom) labelFrom.innerText = isTransferOrExchange ? '轉出戶口' : '帳戶';
  
  const targetContainer = document.getElementById('f-group-target-container');
  if (targetContainer) targetContainer.style.display = isTransferOrExchange ? 'block' : 'none';

  // 2. 幣種選單：僅在 Expense、Transfer、Exchange 顯示
  const curGroup = document.getElementById('f-group-tx-currency');
  if (curGroup) {
    curGroup.style.display = (isExpense || isTransferOrExchange) ? 'flex' : 'none';
  }

  // 3. 標題與分類
  const fTitle = document.getElementById('f-group-title');
  if (fTitle) fTitle.style.display = (isExpense || isIncome || isAdjust) ? 'flex' : 'none';

  const fCat = document.getElementById('f-group-category');
  if (fCat) fCat.style.display = (isExpense || isIncome) ? 'flex' : 'none';

  // 4. 股票群組控制
  const fStock = document.getElementById('f-group-stock');
  if (fStock) fStock.style.display = isStock ? 'flex' : 'none';

  const isDiv = (type === 'dividend');
  const sShares = document.getElementById('stock-shares-box');
  const sPrice = document.getElementById('stock-price-box');
  const sComm = document.getElementById('stock-commission-box');
  if (sShares) sShares.style.display = isDiv ? 'none' : 'flex';
  if (sPrice) sPrice.style.display = isDiv ? 'none' : 'flex';
  if (sComm) sComm.style.display = isDiv ? 'none' : 'flex';

  // 5. 核心金額與換匯欄位重設（杜絕 Transfer 欄位殘留至 Expense）
  const fAmount = document.getElementById('f-group-amount');
  const fExchange = document.getElementById('f-group-exchange');
  const fCommission = document.getElementById('f-group-commission');
  const foreignAmtBox = document.getElementById('f-group-foreign-expense');
  const labelAmt = document.getElementById('label-amount');
  const labelT = document.getElementById('label-title');

  // 先預設隱藏轉帳外匯欄位
  if (fExchange) fExchange.style.display = 'none';
  if (fCommission) fCommission.style.display = 'none';

  if (isAdjust) {
    if (fAmount) fAmount.style.display = 'flex';
    if (foreignAmtBox) foreignAmtBox.style.display = 'none';
    if (labelAmt) labelAmt.innerText = '調整金額（正數增加 +，負數減少 -）';
    if (labelT) labelT.innerText = '調整原因';
    const txT = document.getElementById('tx-title');
    if (txT && !txT.value.trim()) txT.value = '餘額調整';
  } else {
    if (labelT) labelT.innerText = '標題 / 商戶';
  }

  if (isTransferOrExchange) {
    if (foreignAmtBox) foreignAmtBox.style.display = 'none';
    populateTransferAccountSelects();
    updateTransferOrExchangeUI();
  } else if (isExpense) {
    handleExpenseCurrencyChange();
  } else if (isIncome) {
    if (fAmount) fAmount.style.display = 'flex';
    if (labelAmt) labelAmt.innerText = '金額';
    if (foreignAmtBox) foreignAmtBox.style.display = 'none';
  } else {
    if (fAmount) fAmount.style.display = 'none';
    if (foreignAmtBox) foreignAmtBox.style.display = 'none';
  }
};

function populateGroupedAccountSelect(selectEl, selectedId = null, excludeAccId = null) {
  if (!selectEl) return;
  selectEl.innerHTML = '';

  groups.forEach(grp => {
    const grpAccounts = accounts.filter(a => a.groupId === grp.id && a.id !== excludeAccId);
    if (grpAccounts.length === 0) return;

    const optGroup = document.createElement('optgroup');
    optGroup.label = grp.name;

    grpAccounts.forEach(acc => {
      const opt = document.createElement('option');
      opt.value = acc.id;
      opt.innerText = `${acc.name}    ${acc.currency}`;
      if (selectedId === acc.id) opt.selected = true;
      optGroup.appendChild(opt);
    });

    selectEl.appendChild(optGroup);
  });
}

function populateTransferAccountSelects(selectedFromId = null, selectedToId = null) {
  const fromSelect = document.getElementById('tx-from-acc');
  const toSelect = document.getElementById('tx-target-acc');
  if (!fromSelect || !toSelect) return;

  const activeFrom = selectedFromId || fromSelect.value || currentAccountId || (accounts[0] ? accounts[0].id : '');
  populateGroupedAccountSelect(fromSelect, activeFrom, null);
  if (activeFrom) fromSelect.value = activeFrom;

  rebuildToAccountOptions(selectedToId);
}

function rebuildToAccountOptions(preferredToId = null) {
  const fromSelect = document.getElementById('tx-from-acc');
  const toSelect = document.getElementById('tx-target-acc');
  if (!fromSelect || !toSelect) return;

  const currentFromId = fromSelect.value;
  const currentToId = preferredToId || toSelect.value;

  const excludeId = (currentTxType === 'exchange') ? null : currentFromId;
  populateGroupedAccountSelect(toSelect, currentToId, excludeId);

  const availableOptions = Array.from(toSelect.querySelectorAll('option'));
  if (availableOptions.some(opt => opt.value === currentToId)) {
    toSelect.value = currentToId;
  } else if (availableOptions.length > 0) {
    toSelect.value = (currentTxType === 'exchange' && availableOptions.some(opt => opt.value === currentFromId))
      ? currentFromId 
      : availableOptions[0].value;
  }
}

function populateCurrencyOptions(selectEl, selectedCode) {
  if (!selectEl) return;
  selectEl.innerHTML = '';
  SUPPORTED_CURRENCIES.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c.code;
    opt.innerText = c.code;
    if (c.code === selectedCode) opt.selected = true;
    selectEl.appendChild(opt);
  });
  if (selectedCode) selectEl.value = selectedCode;
}

function updateTransferOrExchangeUI() {
  const fromAccId = document.getElementById('tx-from-acc').value;
  const toAccId = document.getElementById('tx-target-acc').value;
  const fromAcc = accounts.find(a => a.id === fromAccId);
  const toAcc = accounts.find(a => a.id === toAccId);

  const fromCurSelect = document.getElementById('tx-from-currency');
  const toCurSelect = document.getElementById('tx-to-currency');

  const fComm = document.getElementById('f-group-commission');
  if (fComm) fComm.style.display = 'flex';

  if (!fromCurSelect.value) {
    populateCurrencyOptions(fromCurSelect, fromAcc?.currency || 'CAD');
  }
  if (!toCurSelect.value) {
    populateCurrencyOptions(toCurSelect, toAcc?.currency || 'CAD');
  }

  const activeFromCur = fromCurSelect.value || fromAcc?.currency || 'CAD';
  const activeToCur = toCurSelect.value || toAcc?.currency || 'CAD';
  const isSameCurrency = (activeFromCur === activeToCur);

  const fAmt = document.getElementById('f-group-amount');
  const fEx = document.getElementById('f-group-exchange');
  const lAmt = document.getElementById('label-amount');
  const lFromAmt = document.getElementById('label-from-amount');
  const lToAmt = document.getElementById('label-to-amount');

  if (currentTxType === 'transfer') {
    if (isSameCurrency) {
      if (fAmt) fAmt.style.display = 'flex';
      if (lAmt) lAmt.innerText = `金額 (${activeFromCur})`;
      if (fEx) fEx.style.display = 'none';
    } else {
      if (fAmt) fAmt.style.display = 'none';
      if (fEx) fEx.style.display = 'flex';
      if (lFromAmt) lFromAmt.innerText = `轉出金額 (${activeFromCur})`;
      if (lToAmt) lToAmt.innerText = `轉入金額 (${activeToCur})`;
    }
  } else if (currentTxType === 'exchange') {
    if (fAmt) fAmt.style.display = 'none';
    if (fEx) fEx.style.display = 'flex';
    if (lFromAmt) lFromAmt.innerText = `轉出金額 (${activeFromCur})`;
    if (lToAmt) lToAmt.innerText = `轉入金額 (${activeToCur})`;
  }
}

window.handleFromAccountChange = function() {
  const fromAccId = document.getElementById('tx-from-acc').value;
  const fromAcc = accounts.find(a => a.id === fromAccId);
  rebuildToAccountOptions();
  
  if (currentTxType === 'expense') {
    populateCurrencyOptions(document.getElementById('tx-from-currency'), fromAcc?.currency || 'CAD');
    handleExpenseCurrencyChange();
  } else {
    populateCurrencyOptions(document.getElementById('tx-from-currency'), fromAcc?.currency || 'CAD');
    updateTransferOrExchangeUI();
    syncExchangeValuesOnAccountChange();
  }
};

window.handleToAccountChange = function() {
  const toAccId = document.getElementById('tx-target-acc').value;
  const toAcc = accounts.find(a => a.id === toAccId);
  populateCurrencyOptions(document.getElementById('tx-to-currency'), toAcc?.currency || 'CAD');
  updateTransferOrExchangeUI();
  syncExchangeValuesOnAccountChange();
};

window.handleFromCurrencyChange = function() {
  updateTransferOrExchangeUI();
  syncExchangeValuesOnAccountChange();
};

window.handleToCurrencyChange = function() {
  updateTransferOrExchangeUI();
  syncExchangeValuesOnAccountChange();
};

async function syncExchangeValuesOnAccountChange() {
  const fromVal = parseFloat(document.getElementById('tx-from-amount').value);
  const toVal = parseFloat(document.getElementById('tx-to-amount').value);
  const rateVal = parseFloat(document.getElementById('tx-exchange-rate').value);

  if ((toVal && toVal > 0) || (rateVal && rateVal > 0)) {
    if (fromVal > 0 && toVal > 0) {
      document.getElementById('tx-exchange-rate').value = (toVal / fromVal).toFixed(4);
    }
    return;
  }

  if (fromVal && fromVal > 0) {
    await fetchLiveExchangeRate(false);
  }
}

// ==========================================================================
// 交易儲存（安全加固與向後相容）
// ==========================================================================
window.saveTransaction = function() {
  const id = document.getElementById('tx-id').value;
  const date = normalizeDateString(document.getElementById('tx-date').value);
  const isPending = document.getElementById('tx-is-pending').checked;
  
  const activeAccountId = document.getElementById('tx-from-acc').value || currentAccountId || (accounts[0] ? accounts[0].id : '');
  const activeAcc = accounts.find(a => a.id === activeAccountId);
  const baseCur = activeAcc ? activeAcc.currency : 'CAD';

  let txData = { 
    id: id || 'tx-' + Date.now(), 
    type: currentTxType, 
    accountId: activeAccountId, 
    currency: baseCur,
    date, 
    isPending 
  };

  if (currentTxType === 'adjust') {
    const adjAmt = parseFloat(document.getElementById('tx-amount').value);
    if (isNaN(adjAmt)) { alert('請填寫有效調整金額！'); return false; }
    const title = document.getElementById('tx-title').value.trim() || '餘額調整';
    txData = { ...txData, title, amount: adjAmt };
  } else if (currentTxType === 'expense') {
    const title = document.getElementById('tx-title').value.trim() || '未命名支出';
    const categoryId = document.getElementById('tx-category').value;
    const chosenCur = document.getElementById('tx-from-currency')?.value || baseCur;

    if (chosenCur !== baseCur) {
      const foreignAmt = parseFloat(document.getElementById('tx-foreign-amount').value) || 0;
      const baseAmt = parseFloat(document.getElementById('tx-base-amount').value) || 0;
      const rate = parseFloat(document.getElementById('tx-foreign-rate').value) || (foreignAmt > 0 ? (baseAmt / foreignAmt) : 1);
      const comm = parseFloat(document.getElementById('tx-expense-commission').value) || 0;

      if (baseAmt <= 0 && foreignAmt <= 0) { alert('請填寫有效金額！'); return; }

      txData = {
        ...txData,
        title,
        categoryId,
        amount: baseAmt,              // 扣除本幣核心金額
        currency: baseCur,            // 基準幣種
        foreignAmount: foreignAmt,    // 原始外幣金額
        foreignCurrency: chosenCur,  // 外幣代號
        rate: rate,                   // 匯率
        commission: comm              // 海外手續費
      };
    } else {
      const amount = parseFloat(document.getElementById('tx-amount').value) || 0;
      if (amount <= 0) { alert('請填寫有效金額！'); return; }
      txData = {
        ...txData,
        title,
        categoryId,
        amount: amount,
        currency: baseCur,
        commission: 0
      };
    }
  } else if (currentTxType === 'income') {
    const title = document.getElementById('tx-title').value.trim() || '未命名收入';
    const amount = parseFloat(document.getElementById('tx-amount').value);
    const categoryId = document.getElementById('tx-category').value;
    if (isNaN(amount) || amount <= 0) { alert('請填寫有效金額！'); return false; }
    txData = { ...txData, title, amount, categoryId };
  } else if (currentTxType === 'transfer') {
    const toAccountId = document.getElementById('tx-target-acc').value;
    if (!activeAccountId || !toAccountId || activeAccountId === toAccountId) {
      alert('轉出與轉入帳戶不能相同！');
      return false;
    }

    const fromAcc = accounts.find(a => a.id === activeAccountId);
    const toAcc = accounts.find(a => a.id === toAccountId);
    
    const fromCur = document.getElementById('tx-from-currency').value || fromAcc.currency;
    const toCur = document.getElementById('tx-to-currency').value || toAcc.currency;
    const isDiffCurrency = (fromCur !== toCur);
    const commission = parseFloat(document.getElementById('tx-commission').value) || 0;

    let amount = 0;
    let toAmount = 0;
    let rate = 1;

    if (!isDiffCurrency) {
      amount = parseFloat(document.getElementById('tx-amount').value);
      toAmount = amount;
      rate = 1;
    } else {
      amount = parseFloat(document.getElementById('tx-from-amount').value);
      toAmount = parseFloat(document.getElementById('tx-to-amount').value);
      rate = parseFloat(document.getElementById('tx-exchange-rate').value) || (toAmount / amount);
    }

    if (isNaN(amount) || amount <= 0 || isNaN(toAmount) || toAmount <= 0) {
      alert('請填寫有效轉帳金額！');
      return false;
    }

    txData = {
      ...txData,
      toAccountId,
      amount,
      toAmount,
      rate,
      commission,
      currency: fromCur,
      toCurrency: toCur,
      title: `轉帳至 ${toAcc ? toAcc.name : ''}`
    };

  } else if (currentTxType === 'exchange') {
    const toAccountId = document.getElementById('tx-target-acc').value || activeAccountId;
    const fromAmt = parseFloat(document.getElementById('tx-from-amount').value);
    const toAmt = parseFloat(document.getElementById('tx-to-amount').value);
    const rate = parseFloat(document.getElementById('tx-exchange-rate').value) || (toAmt / fromAmt);
    const commission = parseFloat(document.getElementById('tx-commission').value) || 0;
    const fromCurrency = document.getElementById('tx-from-currency').value;
    const toCurrency = document.getElementById('tx-to-currency').value;

    if (isNaN(fromAmt) || isNaN(toAmt) || fromAmt <= 0 || toAmt <= 0) {
      alert('請填寫完整且有效的兌換金額！');
      return false;
    }
    if (fromCurrency === toCurrency && activeAccountId === toAccountId) {
      alert('同帳戶兌換之轉出與轉入幣種不能相同！');
      return false;
    }

    const toAcc = accounts.find(a => a.id === toAccountId);
    const isSameAcc = (activeAccountId === toAccountId);
    const title = isSameAcc 
      ? `貨幣兌換 (${fromCurrency} ➔ ${toCurrency})`
      : `兌換至 ${toAcc ? toAcc.name : ''}`;

    txData = { 
      ...txData, 
      toAccountId, 
      amount: fromAmt, 
      toAmount: toAmt, 
      rate, 
      commission,
      currency: fromCurrency,
      toCurrency: toCurrency,
      title
    };
  } else if (currentTxType === 'buy' || currentTxType === 'sell') {
    const symbol = document.getElementById('tx-stock-symbol').value.trim().toUpperCase();
    const shares = parseFloat(document.getElementById('tx-stock-shares').value);
    const price = parseFloat(document.getElementById('tx-stock-price').value);
    const amount = parseFloat(document.getElementById('tx-stock-total').value);
    const commission = parseFloat(document.getElementById('tx-stock-commission').value) || 0;
    if (!symbol || isNaN(shares) || isNaN(price) || isNaN(amount)) { alert('請填寫完整股票明細！'); return false; }
    txData = { ...txData, symbol, shares, price, amount, commission };

    if (currentTxType === 'buy' && symbol) {
      const knownSymbols = Object.keys(stockPriceCache);
      if (!knownSymbols.includes(symbol)) {
        window.pendingNewSymbols = window.pendingNewSymbols || [];
        if (!window.pendingNewSymbols.includes(symbol)) {
          window.pendingNewSymbols.push(symbol);
        }
      }
    }
  } else if (currentTxType === 'dividend') {
    const symbol = document.getElementById('tx-stock-symbol').value.trim().toUpperCase();
    const amount = parseFloat(document.getElementById('tx-stock-total').value);
    if (!symbol || isNaN(amount) || amount <= 0) { alert('請填寫股票代號及派息金額！'); return false; }
    txData = { ...txData, symbol, amount };
  }

  if (id) {
    const idx = transactions.findIndex(t => t.id === id);
    if (idx !== -1) transactions[idx] = txData;
  } else {
    transactions.push(txData);
  }

  saveData(txData.id);
  return true;
};

window.deleteCurrentTx = function() {
  const id = document.getElementById('tx-id').value;
  if (!id) return;

  const txToDelete = transactions.find(t => t.id === id);
  if (txToDelete && txToDelete.linkedTxId) {
    transactions = transactions.filter(t => t.id !== id && t.id !== txToDelete.linkedTxId);
  } else {
    transactions = transactions.filter(t => t.id !== id);
  }

  saveData(id);
};

window.handleExchangeInput = function(source) {
  const from = parseFloat(document.getElementById('tx-from-amount').value);
  const to = parseFloat(document.getElementById('tx-to-amount').value);
  const rateInput = document.getElementById('tx-exchange-rate');
  const rate = parseFloat(rateInput.value);

  if (source === 'from' || source === 'to') {
    if (from > 0 && to > 0) {
      rateInput.value = (to / from).toFixed(4);
    }
  } else if (source === 'rate') {
    if (from > 0 && rate > 0) {
      document.getElementById('tx-to-amount').value = (from * rate).toFixed(2);
    }
  }
};

window.fetchLiveExchangeRate = async function(isManualClick = false) {
  const fromCur = document.getElementById('tx-from-currency').value || 'CAD';
  const toCur = document.getElementById('tx-to-currency').value || 'CAD';

  const fromVal = parseFloat(document.getElementById('tx-from-amount').value);
  const toVal = parseFloat(document.getElementById('tx-to-amount').value);
  const rateVal = parseFloat(document.getElementById('tx-exchange-rate').value);

  if (!isManualClick && ((toVal && toVal > 0) || (rateVal && rateVal > 0))) {
    return;
  }

  try {
    const res = await fetch(`https://open.er-api.com/v6/latest/${fromCur}`);
    const data = await res.json();
    const rate = data.rates[toCur];
    if (rate) {
      document.getElementById('tx-exchange-rate').value = rate.toFixed(4);
      if (fromVal > 0) {
        document.getElementById('tx-to-amount').value = (fromVal * rate).toFixed(2);
      }
    }
  } catch (e) {
    if (isManualClick) alert('取得匯率失敗，請手動輸入。');
  }
};

function calcStockTotal() {
  const shares = parseFloat(document.getElementById('tx-stock-shares').value) || 0;
  const price = parseFloat(document.getElementById('tx-stock-price').value) || 0;
  document.getElementById('tx-stock-total').value = (shares * price).toFixed(2);
}

window.handleMainScroll = function(el) {
  const btn = document.getElementById('btn-back-to-top');
  if (!btn) return;
  if (el.scrollTop > 280) {
    btn.style.display = 'flex';
  } else {
    btn.style.display = 'none';
  }
};

window.scrollToTop = function() {
  const el = document.getElementById('main-detail-scroll');
  if (el) el.scrollTo({ top: 0, behavior: 'smooth' });
};

window.changeBaseCurrency = function(cur) {
  baseCurrency = cur;
  localStorage.setItem('wiz_base_currency', baseCurrency);
  updateFXRates(baseCurrency);
  renderApp();
};

window.saveCloudConfigFromSettings = function() {
  const url = document.getElementById('setting-cloud-url').value.trim();
  SCRIPT_URL = url;
  localStorage.setItem('wiz_gas_url', SCRIPT_URL);
  alert('已更新 Google Sheets URL 並嘗試同步！');
  manualSyncTrigger();
};

window.switchCatViewType = function(type) {
  currentCatSettingsTab = type;
  const tabExp = document.getElementById('tab-cat-exp');
  const tabInc = document.getElementById('tab-cat-inc');
  if (tabExp) tabExp.classList.toggle('active', type === 'expense');
  if (tabInc) tabInc.classList.toggle('active', type === 'income');
  renderCategoryTree();
};

window.toggleCatParentCollapse = function(parentId) {
  collapsedCatParents[parentId] = !collapsedCatParents[parentId];
  localStorage.setItem('wiz_collapsed_cats', JSON.stringify(collapsedCatParents));
  renderCategoryTree();
};

function renderCategoryTree() {
  const container = document.getElementById('cat-tree-container');
  if (!container) return;
  container.innerHTML = '';
  const parents = categories.filter(c => c.flowType === currentCatSettingsTab && !c.parentId);

  parents.forEach(p => {
    const children = categories.filter(c => c.parentId === p.id);
    const isCollapsed = !!collapsedCatParents[p.id];
    const item = document.createElement('div');
    item.className = 'cat-tree-item';

    let childRows = '';
    children.forEach(ch => {
      childRows += `
        <div class="cat-child-row">
          <span>${ch.icon} ${ch.name}</span>
          <button class="btn-action btn-secondary" style="padding: 2px 7px; font-size: 11px;" onclick="openEditCategoryModal('${ch.id}')">✎</button>
        </div>
      `;
    });

    item.innerHTML = `
      <div class="cat-parent-row">
        <div onclick="toggleCatParentCollapse('${p.id}')" style="display: flex; align-items: center; gap: 6px; user-select: none;">
          <span style="font-size: 10px; transition: transform 0.2s; ${isCollapsed ? 'transform: rotate(-90deg);' : ''}">▼</span>
          <span>${p.icon} ${p.name}</span>
          <span style="font-size: 11px; color: var(--text-muted);">(${children.length})</span>
        </div>
        <div style="display: flex; gap: 5px;">
          <button class="btn-action btn-secondary" style="padding: 2px 7px; font-size: 11px;" onclick="openAddCategoryModal('${p.id}')">+ 子類別</button>
          <button class="btn-action btn-secondary" style="padding: 2px 7px; font-size: 11px;" onclick="openEditCategoryModal('${p.id}')">✎</button>
        </div>
      </div>
      ${children.length > 0 ? `<div class="cat-child-list" style="display: ${isCollapsed ? 'none' : 'block'};">${childRows}</div>` : ''}
    `;
    container.appendChild(item);
  });
}

window.openAddCategoryModal = function(parentId = null) {
  document.getElementById('edit-cat-id').value = '';
  document.getElementById('edit-cat-parent-id').value = parentId || '';
  document.getElementById('edit-cat-flow-type').value = currentCatSettingsTab;
  document.getElementById('cat-edit-modal-title').innerText = parentId ? '新增子類別' : '新增父類別';
  document.getElementById('edit-cat-name').value = '';
  document.getElementById('edit-cat-icon').value = '🏷️';
  document.getElementById('btn-delete-cat').style.display = 'none';
  openModal('cat-edit-modal');
};

window.openEditCategoryModal = function(catId) {
  const cat = categories.find(c => c.id === catId);
  if (!cat) return;
  document.getElementById('edit-cat-id').value = cat.id;
  document.getElementById('edit-cat-parent-id').value = cat.parentId || '';
  document.getElementById('edit-cat-flow-type').value = cat.flowType;
  document.getElementById('cat-edit-modal-title').innerText = '編輯分類';
  document.getElementById('edit-cat-name').value = cat.name;
  document.getElementById('edit-cat-icon').value = cat.icon || '🏷️';
  document.getElementById('btn-delete-cat').style.display = 'inline-block';
  openModal('cat-edit-modal');
};

window.saveCategory = function() {
  const id = document.getElementById('edit-cat-id').value;
  const parentId = document.getElementById('edit-cat-parent-id').value || null;
  const flowType = document.getElementById('edit-cat-flow-type').value;
  const name = document.getElementById('edit-cat-name').value.trim();
  const icon = document.getElementById('edit-cat-icon').value.trim() || '🏷️';

  if (!name) { alert('請填寫分類名稱！'); return; }

  if (id) {
    const idx = categories.findIndex(c => c.id === id);
    if (idx !== -1) categories[idx] = { ...categories[idx], name, icon };
  } else {
    categories.push({ id: 'cat-' + Date.now(), flowType, name, icon, parentId });
  }

  closeModal('cat-edit-modal');
  saveData();
  renderCategoryTree();
};

window.deleteCurrentCategory = function() {
  const id = document.getElementById('edit-cat-id').value;
  const hasChildren = categories.some(c => c.parentId === id);
  if (hasChildren) { alert('此父類別下尚有子類別，請先刪除子類別！'); return; }
  if (!confirm('確定刪除此分類？')) return;
  categories = categories.filter(c => c.id !== id);
  closeModal('cat-edit-modal');
  saveData();
  renderCategoryTree();
};

window.openReportModal = function() {
  document.getElementById('report-modal-title').innerText = `📈 Net Worth Over Time (${baseCurrency})`;
  openModal('report-modal');
  renderNetWorthChart();
};

function renderNetWorthChart() {
  const sortedTxs = [...transactions].sort((a,b) => new Date(a.date) - new Date(b.date));
  const dates = [];
  const netWorthValues = [];
  
  let runningNetWorth = accounts.reduce((sum, a) => {
    return sum + convertAmount(Number(a.initialBalance || 0), a.currency || 'CAD', baseCurrency);
  }, 0);

  sortedTxs.forEach(t => {
    const acc = accounts.find(a => a.id === t.accountId);
    const cur = t.currency || (acc ? acc.currency : 'CAD') || 'CAD';

    if (t.type === 'adjust') {
      runningNetWorth += convertAmount(Number(t.amount), cur, baseCurrency);
    } else if (t.type === 'income' || t.type === 'dividend') {
      runningNetWorth += convertAmount(Number(t.amount), cur, baseCurrency);
    } else if (t.type === 'expense') {
      const comm = Number(t.commission) || 0;
      runningNetWorth -= convertAmount(Number(t.amount) + comm, cur, baseCurrency);
    } else if (t.type === 'transfer' && t.commission) {
      runningNetWorth -= convertAmount(Number(t.commission), cur, baseCurrency);
    } else if (t.type === 'buy') {
      runningNetWorth -= convertAmount(Number(t.commission) || 0, cur, baseCurrency);
    } else if (t.type === 'sell') {
      runningNetWorth -= convertAmount(Number(t.commission) || 0, cur, baseCurrency);
    } else if (t.type === 'exchange' && t.commission) {
      runningNetWorth -= convertAmount(Number(t.commission), cur, baseCurrency);
    }

    dates.push(normalizeDateString(t.date));
    netWorthValues.push(runningNetWorth);
  });

  if (dates.length === 0) {
    dates.push(new Date().toISOString().split('T')[0]);
    netWorthValues.push(runningNetWorth);
  }

  const chartEl = document.getElementById('netWorthChart');
  if (!chartEl) return;
  const ctx = chartEl.getContext('2d');
  if (chartInstance) chartInstance.destroy();

  chartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: dates,
      datasets: [{
        label: `Net Worth (${baseCurrency})`,
        data: netWorthValues,
        borderColor: '#2B5C8F',
        backgroundColor: 'rgba(208, 225, 253, 0.4)',
        fill: true,
        tension: 0.35,
        pointRadius: 4
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false } },
        // 移除走勢圖 Y 軸刻度硬編碼之 $ 符號
        y: { ticks: { callback: v => v.toLocaleString() } }
      }
    }
  });
}

window.openModal = function(id) { 
  const modal = document.getElementById(id);
  if (modal) modal.classList.add('open'); 
};

window.closeModal = function(id) { 
  const modal = document.getElementById(id);
  if (modal) modal.classList.remove('open'); 
};

function populateGroupSelect(selectedId = null) {
  const select = document.getElementById('acc-group-id');
  if (!select) return;
  select.innerHTML = '';
  groups.forEach(grp => {
    const opt = document.createElement('option');
    opt.value = grp.id;
    opt.innerText = grp.name;
    if (selectedId === grp.id) opt.selected = true;
    select.appendChild(opt);
  });
}

window.openAccountModal = function() {
  if (groups.length === 0) { alert('請先建立至少一個 Account Group！'); return; }
  populateGroupSelect();
  document.getElementById('acc-id').value = '';
  document.getElementById('account-modal-title').innerText = '新增帳戶';
  document.getElementById('acc-name').value = '';
  document.getElementById('acc-type').value = 'checking';
  document.getElementById('acc-currency').value = baseCurrency;
  document.getElementById('acc-initial-balance').value = '0';
  document.getElementById('btn-delete-acc').style.display = 'none';
  openModal('account-modal');
};

window.openEditAccountModal = function() {
  const acc = accounts.find(a => a.id === currentAccountId);
  if (!acc) return;
  populateGroupSelect(acc.groupId);
  document.getElementById('acc-id').value = acc.id;
  document.getElementById('account-modal-title').innerText = '編輯帳戶';
  document.getElementById('acc-name').value = acc.name;
  document.getElementById('acc-type').value = acc.type;
  document.getElementById('acc-currency').value = acc.currency || 'CAD';
  document.getElementById('acc-initial-balance').value = acc.initialBalance;
  document.getElementById('btn-delete-acc').style.display = 'inline-block';
  openModal('account-modal');
};

window.saveAccount = function() {
  const id = document.getElementById('acc-id').value;
  const name = document.getElementById('acc-name').value.trim();
  const groupId = document.getElementById('acc-group-id').value;
  const type = document.getElementById('acc-type').value;
  const currency = document.getElementById('acc-currency').value;
  const initialBalance = parseFloat(document.getElementById('acc-initial-balance').value) || 0;

  if (!name) { alert('請填寫帳戶名稱！'); return; }

  if (id) {
    const index = accounts.findIndex(a => a.id === id);
    if (index !== -1) accounts[index] = { ...accounts[index], name, groupId, type, currency, initialBalance };
  } else {
    const newId = 'acc-' + Date.now();
    accounts.push({ id: newId, name, groupId, type, currency, initialBalance });
    currentAccountId = newId;
  }

  closeModal('account-modal');
  saveData();
};

window.deleteCurrentAccount = function() {
  const id = document.getElementById('acc-id').value;
  if (!confirm('確定刪除呢個帳戶？連帶交易亦會被刪除！')) return;
  accounts = accounts.filter(a => a.id !== id);
  transactions = transactions.filter(t => t.accountId !== id && t.toAccountId !== id);
  currentAccountId = accounts.length > 0 ? accounts[0].id : null;
  closeModal('account-modal');
  saveData();
};

window.openGroupModal = function() {
  const modal = document.getElementById('group-modal');
  if (!modal) {
    console.error('找不到 #group-modal 元素');
    return;
  }
  document.getElementById('group-id').value = '';
  document.getElementById('group-modal-title').innerText = '新增帳戶分組';
  document.getElementById('group-name').value = '';
  
  const curSelect = document.getElementById('group-currency');
  if (curSelect) {
    curSelect.value = (typeof baseCurrency !== 'undefined' ? baseCurrency : 'CAD');
  }
  
  initColorSwatches('pink');
  
  const delBtn = document.getElementById('btn-delete-group');
  if (delBtn) delBtn.style.display = 'none';
  
  openModal('group-modal');
};

window.openEditGroupModal = function(grpId) {
  const grp = groups.find(g => g.id === grpId);
  if (!grp) return;
  document.getElementById('group-id').value = grp.id;
  document.getElementById('group-modal-title').innerText = '編輯帳戶分組';
  document.getElementById('group-name').value = grp.name;
  
  const curSelect = document.getElementById('group-currency');
  if (curSelect) {
    curSelect.value = grp.currency || (typeof baseCurrency !== 'undefined' ? baseCurrency : 'CAD');
  }
  
  initColorSwatches(grp.theme || 'pink');
  
  const delBtn = document.getElementById('btn-delete-group');
  if (delBtn) delBtn.style.display = 'inline-block';
  
  openModal('group-modal');
};

window.saveGroup = function() {
  const id = document.getElementById('group-id').value;
  const name = document.getElementById('group-name').value.trim();
  const currency = document.getElementById('group-currency').value;
  const theme = document.getElementById('group-theme').value || 'pink';
  
  if (!name) {
    alert('請填寫分組名稱！');
    return;
  }
  
  if (id) {
    const idx = groups.findIndex(g => g.id === id);
    if (idx !== -1) groups[idx] = { ...groups[idx], name, currency, theme };
  } else {
    groups.push({ id: 'grp-' + Date.now(), name, currency, theme });
  }
  
  closeModal('group-modal');
  saveData();
};

window.deleteCurrentGroup = function() {
  const id = document.getElementById('group-id').value;
  const hasAccounts = accounts.some(a => a.groupId === id);
  if (hasAccounts) {
    alert('此分組內仍有帳戶，請先將帳戶移至其他分組再刪除！');
    return;
  }
  if (!confirm('確定刪除呢個分組？')) return;
  groups = groups.filter(g => g.id !== id);
  closeModal('group-modal');
  saveData();
};

// ==========================================================================
// 底部安全初始化區塊
// ==========================================================================
try {
  if (typeof initCurrencyDropdowns === 'function') initCurrencyDropdowns();
  if (typeof updateFXRates === 'function') updateFXRates(typeof baseCurrency !== 'undefined' ? baseCurrency : 'CAD');
  if (typeof window.renderAccountsView === 'function') window.renderAccountsView();
  if (typeof renderApp === 'function') renderApp();

  const savedGasUrl = localStorage.getItem('wiz_gas_url') || "";
  if (savedGasUrl && typeof manualSyncTrigger === 'function') {
    manualSyncTrigger();
  } else if (typeof updateSyncStatusUI === 'function') {
    updateSyncStatusUI();
  }
} catch (e) {
  console.error('初始化失敗：', e);
}