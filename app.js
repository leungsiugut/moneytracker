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
  { id: 'grp-1', name: 'Credit Cards', theme: 'pink', currency: 'CAD' },
  { id: 'grp-2', name: 'Bank & Cash', theme: 'mint', currency: 'CAD' },
  { id: 'grp-3', name: 'Brokerage', theme: 'blue', currency: 'CAD' }
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
let searchKeyword = '';
let chartInstance = null;

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

/* 色板初始化與切換（掛載至 window 保證全域調用） */
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

function fmtCur(amt, cur = 'CAD') {
  const sign = amt < 0 ? '-' : '';
  const absAmt = Math.abs(amt);
  const isZeroDecimal = ['JPY', 'TWD', 'KRW'].includes(cur);
  const formatted = absAmt.toLocaleString('en-US', {
    minimumFractionDigits: isZeroDecimal ? 0 : 2,
    maximumFractionDigits: isZeroDecimal ? 0 : 2
  });
  return `${sign}$${formatted} ${cur}`;
}

function setSyncStatus(state, msg) {
  const el = document.getElementById('sync-status-indicator');
  const text = document.getElementById('sync-status-text');
  if (el) el.className = `sync-status ${state}`;
  if (text) text.innerText = msg;
}

async function pushToGoogleSheet() {
  if (!SCRIPT_URL) return;
  setSyncStatus('syncing', '正在儲存...');
  try {
    const payload = { accounts, groups, categories, transactions };
    await fetch(SCRIPT_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    setSyncStatus('synced', '已同步');
  } catch (err) {
    console.error('Push failed:', err);
    setSyncStatus('error', '同步失敗');
  }
}

async function pullFromGoogleSheet() {
  if (!SCRIPT_URL) {
    setSyncStatus('', '未連線（點擊設定）');
    return;
  }
  setSyncStatus('syncing', '正在讀取...');
  try {
    const res = await fetch(SCRIPT_URL);
    const data = await res.json();
    
    if (data.accounts && data.accounts.length > 0) accounts = data.accounts;
    if (data.groups && data.groups.length > 0) groups = data.groups;
    if (data.categories && data.categories.length > 0) categories = data.categories;
    if (data.transactions) transactions = data.transactions;

    if (accounts.length > 0 && !accounts.some(a => a.id === currentAccountId)) {
      currentAccountId = accounts[0].id;
    }

    saveLocalDataOnly();
    setSyncStatus('synced', '已是最新');
  } catch (err) {
    console.error('Pull failed:', err);
    setSyncStatus('error', '連線失敗');
  }
}

function manualSyncFromCloud() {
  if (!SCRIPT_URL) { openSettingsModal(); return; }
  pullFromGoogleSheet();
}

function saveLocalDataOnly() {
  localStorage.setItem('wiz_cats_cloud', JSON.stringify(categories));
  localStorage.setItem('wiz_grps_cloud', JSON.stringify(groups));
  localStorage.setItem('wiz_accs_cloud', JSON.stringify(accounts));
  localStorage.setItem('wiz_txs_cloud', JSON.stringify(transactions));
  localStorage.setItem('wiz_stock_cache_cloud', JSON.stringify(stockPriceCache));
  renderApp();
}

function saveData() {
  saveLocalDataOnly();
  pushToGoogleSheet();
}

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

function handleCSVFileSelected(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      let text = e.target.result;
      if (!text) return;

      if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
      text = text.replace(/^sep=[^\r\n]*[\r\n]+/i, '');

      const parsedData = parseCSVNative(text);
      if (!parsedData || parsedData.length <= 1) {
        alert('CSV 解析後沒有足夠的資料列！');
        return;
      }
      processMoneyWizCSVNative(parsedData);
    } catch (err) {
      alert('解析處理時發生錯誤：' + err.message);
    } finally {
      event.target.value = '';
    }
  };
  reader.readAsText(file, 'UTF-8');
}

function parseCSVNative(text) {
  const lines = [];
  let row = [];
  let col = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    const next = text[i + 1];

    if (c === '"') {
      if (inQuotes && next === '"') { col += '"'; i++; }
      else { inQuotes = !inQuotes; }
    } else if (c === ',' && !inQuotes) {
      row.push(col.trim()); col = '';
    } else if ((c === '\r' || c === '\n') && !inQuotes) {
      if (c === '\r' && next === '\n') i++;
      row.push(col.trim());
      if (row.some(f => f.length > 0)) lines.push(row);
      row = []; col = '';
    } else {
      col += c;
    }
  }
  if (col.length > 0 || row.length > 0) {
    row.push(col.trim());
    if (row.some(f => f.length > 0)) lines.push(row);
  }
  return lines;
}

function processMoneyWizCSVNative(grid) {
  const headers = grid[0].map(h => h.trim().toLowerCase());
  function findIndex(patterns) {
    return headers.findIndex(h => patterns.some(p => h.includes(p)));
  }

  const idxName = findIndex(['name']);
  const idxAcc = findIndex(['account']);
  const idxTransfer = findIndex(['transfers', 'transfer']);
  const idxDate = findIndex(['date']);
  const idxAmt = findIndex(['amount']);
  const idxCat = findIndex(['category']);
  const idxPayee = findIndex(['payee', 'description']);
  const idxCur = findIndex(['currency']);

  if (idxDate === -1 || idxAmt === -1) {
    alert('未能對齊欄位！\nHeaders 為：\n' + grid[0].join(' | '));
    return;
  }

  let importedCount = 0;
  let defaultGroup = groups[0] || { id: 'grp-1', name: 'General', theme: 'mint', currency: 'CAD' };
  let currentParsedAccount = null;

  function getOrCreateAccount(accName, curVal = 'CAD', isDefaultCredit = false) {
    accName = accName.replace(/\?/g, ' ').replace(/\s+/g, ' ').trim();
    let acc = accounts.find(a => a.name.toLowerCase() === accName.toLowerCase());
    if (!acc) {
      const isCredit = isDefaultCredit || accName.toLowerCase().includes('visa') || accName.toLowerCase().includes('card');
      acc = {
        id: 'acc-' + Date.now() + '-' + Math.floor(Math.random() * 10000),
        name: accName,
        groupId: defaultGroup.id,
        type: isCredit ? 'credit' : 'checking',
        currency: curVal || 'CAD',
        initialBalance: 0
      };
      accounts.push(acc);
    }
    return acc;
  }

  for (let i = 1; i < grid.length; i++) {
    const row = grid[i];
    if (!row || row.length === 0) continue;

    const rawAmt = row[idxAmt] || '';
    const amtClean = parseFloat(rawAmt.replace(/[^0-9.-]+/g, ''));
    if (isNaN(amtClean)) continue;

    const rawDate = row[idxDate] || '';
    if (!rawDate) continue;
    const txDate = normalizeDateString(rawDate);

    let curVal = 'CAD';
    if (idxCur !== -1 && row[idxCur]) {
      const match = row[idxCur].toString().toUpperCase().match(/[A-Z]{3}/);
      if (match) curVal = match[0];
    }

    let accName = '';
    if (idxAcc !== -1 && row[idxAcc]) accName = row[idxAcc].trim();
    if (!accName && idxName !== -1 && row[idxName]) accName = row[idxName].trim();

    if (accName) {
      currentParsedAccount = accName;
    } else if (currentParsedAccount) {
      accName = currentParsedAccount;
    } else {
      accName = 'Imported Account';
    }

    const mainAcc = getOrCreateAccount(accName, curVal, amtClean < 0);

    const transferTargetRaw = idxTransfer !== -1 ? (row[idxTransfer] || '').trim() : '';
    if (transferTargetRaw) {
      const transferAcc = getOrCreateAccount(transferTargetRaw, curVal, false);
      const isExpense = amtClean < 0;

      transactions.push({
        id: 'tx-' + Date.now() + '-' + Math.floor(Math.random() * 1000000),
        type: isExpense ? 'expense' : 'income',
        accountId: mainAcc.id,
        amount: Math.abs(amtClean),
        currency: curVal,
        title: isExpense ? `轉帳至 ${transferAcc.name}` : `由 ${transferAcc.name} 轉入`,
        categoryId: null,
        date: txDate,
        isPending: false
      });
      importedCount++;
      continue;
    }

    let rawCat = idxCat !== -1 ? (row[idxCat] || '').trim() : '';
    let finalCatId = null;
    let subCatName = '';

    if (rawCat) {
      const catParts = rawCat.split('>').map(s => s.trim()).filter(s => s.length > 0);
      if (catParts.length > 0) {
        const parentName = catParts[0];
        const isIncome = amtClean > 0;
        const flowType = isIncome ? 'income' : 'expense';

        let parentCat = categories.find(c => c.name.toLowerCase() === parentName.toLowerCase() && !c.parentId);
        if (!parentCat) {
          parentCat = {
            id: 'cat-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
            flowType: flowType,
            name: parentName,
            icon: isIncome ? '💰' : '🏷️',
            parentId: null
          };
          categories.push(parentCat);
        }
        finalCatId = parentCat.id;

        if (catParts.length > 1 && catParts[1]) {
          subCatName = catParts[1];
          let childCat = categories.find(c => c.name.toLowerCase() === subCatName.toLowerCase() && c.parentId === parentCat.id);
          if (!childCat) {
            childCat = {
              id: 'cat-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
              flowType: flowType,
              name: subCatName,
              icon: '🔹',
              parentId: parentCat.id
            };
            categories.push(childCat);
          }
          finalCatId = childCat.id;
        }
      }
    }

    let payeeRaw = idxPayee !== -1 ? (row[idxPayee] || '').replace(/"/g, '').trim() : '';
    if (!payeeRaw) {
      payeeRaw = subCatName || (rawCat.split('>')[0] || (amtClean < 0 ? '日常支出' : '日常收入')).trim();
    }

    transactions.push({
      id: 'tx-' + Date.now() + '-' + Math.floor(Math.random() * 1000000),
      type: amtClean < 0 ? 'expense' : 'income',
      accountId: mainAcc.id,
      amount: Math.abs(amtClean),
      currency: curVal,
      title: payeeRaw,
      categoryId: finalCatId,
      date: txDate,
      isPending: false
    });

    importedCount++;
  }

  if (importedCount > 0) {
    currentAccountId = accounts[0].id;
    saveData();
    alert(`成功匯入 ${importedCount} 筆 MoneyWiz 歷史交易！✨\n已依 MoneyWiz 原裝邏輯完整還原每筆流水帳。`);
  } else {
    alert('未能在 CSV 中讀取到任何有效交易列！');
  }
}

async function handleOCRImageSelected(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;

  setSyncStatus('syncing', '正在 OCR 辨識截圖...');

  try {
    const worker = await Tesseract.createWorker('eng');
    const ret = await worker.recognize(file);
    await worker.terminate();

    const fullText = ret.data.text;
    const amtMatch = fullText.match(/\$\s*(\d+[\.,]\d{2})/);
    const amount = amtMatch ? amtMatch[1].replace(',', '.') : '';

    const textLines = fullText.split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 2 && !l.includes('$') && !l.toLowerCase().includes('done'));
    const guessedTitle = textLines.length > 0 ? textLines[0] : 'Wallet 交易';

    let guessedDate = new Date().toISOString().split('T')[0];
    const dateMatch = fullText.match(/\b(\d{4}[-\/]\d{1,2}[-\/]\d{1,2})\b/) || fullText.match(/\b(\d{1,2}[-\/]\d{1,2}[-\/]\d{4})\b/);
    if (dateMatch) {
      guessedDate = normalizeDateString(dateMatch[1]);
    }

    setSyncStatus('synced', '辨識完成');

    let targetAccId = currentAccountId;
    if (!targetAccId && accounts.length > 0) {
      targetAccId = accounts[0].id;
    }

    openTxModal();
    switchTxTab('expense');

    if (amount) document.getElementById('tx-amount').value = amount;
    if (guessedTitle) document.getElementById('tx-title').value = guessedTitle;
    if (guessedDate) document.getElementById('tx-date').value = guessedDate;

    const modalAccSelect = document.getElementById('tx-from-acc');
    if (modalAccSelect && targetAccId) {
      modalAccSelect.value = targetAccId;
      handleFromAccountChange();
    }

  } catch (err) {
    console.error('OCR failed:', err);
    setSyncStatus('error', 'OCR 辨識失敗');
    alert('截圖辨識未能成功，請直接手動輸入。');
  } finally {
    event.target.value = '';
  }
}

async function fetchQuote(symbol) {
  if (!symbol) return null;
  const querySym = symbol.trim().toUpperCase();
  const targetUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(querySym)}`;

  const proxyBuilders = [
    url => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
    url => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
    url => `https://corsproxy.io/?${encodeURIComponent(url)}`
  ];

  for (const buildProxy of proxyBuilders) {
    try {
      const proxyUrl = buildProxy(targetUrl);
      const res = await fetch(proxyUrl);
      if (res.ok) {
        const text = await res.text();
        const data = JSON.parse(text);
        const price = data.chart?.result?.[0]?.meta?.regularMarketPrice;
        if (price) {
          stockPriceCache[querySym] = Number(price);
          localStorage.setItem('wiz_stock_cache_cloud', JSON.stringify(stockPriceCache));
          return price;
        }
      }
    } catch (err) {
      continue;
    }
  }

  return stockPriceCache[querySym] || null;
}

async function fetchQuoteForInput() {
  const sym = document.getElementById('tx-stock-symbol').value.trim().toUpperCase();
  if (!sym) { alert('請先輸入 Symbol！'); return; }
  
  const btn = document.getElementById('btn-quote-search');
  btn.innerText = '拉取中... ⏳';
  const price = await fetchQuote(sym);
  btn.innerText = '🔍 查 Yahoo 市價';

  if (price) {
    document.getElementById('tx-stock-price').value = Number(price).toFixed(2);
    calcStockTotal();
  } else {
    alert('未能即時拉取報價，請手動輸入市價。');
  }
}

async function refreshLiveStockPrices() {
  const symbols = new Set(transactions.filter(t => t.symbol).map(t => t.symbol));
  if (symbols.size === 0) return;
  for (const sym of symbols) {
    await fetchQuote(sym);
  }
  renderApp();
  alert('持倉市價已更新完成！✨');
}

function getAccountCashBalance(accId) {
  const acc = accounts.find(a => a.id === accId);
  if (!acc) return 0;
  let balance = Number(acc.initialBalance);

  transactions.forEach(t => {
    const txCur = t.currency || acc.currency;

    if (t.type === 'adjust' && t.accountId === accId) {
      const amt = (txCur === acc.currency) ? Number(t.amount) : convertAmount(Number(t.amount), txCur, acc.currency);
      balance += amt;
    }

    if (t.type === 'expense' && t.accountId === accId) {
      const amt = (txCur === acc.currency) ? Number(t.amount) : convertAmount(Number(t.amount), txCur, acc.currency);
      balance -= amt;
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

    if (t.type === 'buy' && t.accountId === accId) {
      balance -= (Number(t.amount) + (Number(t.commission) || 0));
    }
    if (t.type === 'sell' && t.accountId === accId) {
      balance += (Number(t.amount) - (Number(t.commission) || 0));
    }
    if (t.type === 'dividend' && t.accountId === accId) balance += Number(t.amount);
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
  if (acc.type === 'investment') {
    const holdings = getHoldings(accId);
    const holdingsValue = holdings.reduce((sum, h) => sum + h.marketValue, 0);
    return cash + holdingsValue;
  }
  return cash;
}

function renderApp() {
  let totalNetWorthInBase = 0;
  accounts.forEach(acc => {
    const accVal = getAccountTotalValue(acc.id);
    totalNetWorthInBase += convertAmount(accVal, acc.currency || 'CAD', baseCurrency);
  });

  document.getElementById('header-networth-title').innerText = `Net Worth (${baseCurrency} 📈)`;
  document.getElementById('total-net-worth').innerText = `$${totalNetWorthInBase.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const sidebar = document.getElementById('sidebar-accounts');
  sidebar.innerHTML = '';

  groups.forEach(grp => {
    const grpCur = grp.currency || 'CAD';
    const groupAccs = accounts.filter(a => a.groupId === grp.id);

    const groupBalanceInGrpCur = groupAccs.reduce((sum, a) => {
      const val = getAccountTotalValue(a.id);
      return sum + convertAmount(val, a.currency || 'CAD', grpCur);
    }, 0);

    const isCollapsed = !!collapsedGroups[grp.id];

    const card = document.createElement('div');
    card.className = `group-card group-${grp.theme || 'mint'}`;
    card.innerHTML = `
      <div class="group-header">
        <div class="group-title-area" onclick="toggleGroupCollapse('${grp.id}')">
          <span class="group-collapse-btn ${isCollapsed ? 'collapsed' : ''}">▼</span>
          <span>${grp.name}</span>
          <span style="font-size: 11px; opacity: 0.6;" onclick="event.stopPropagation(); openEditGroupModal('${grp.id}')" title="設定分組">✎</span>
        </div>
        <span>${fmtCur(groupBalanceInGrpCur, grpCur)}</span>
      </div>
      <div class="group-accounts" style="display: ${isCollapsed ? 'none' : 'block'};"></div>
    `;

    const listContainer = card.querySelector('.group-accounts');
    groupAccs.forEach(acc => {
      const accVal = getAccountTotalValue(acc.id);
      const icon = getAccountTypeIcon(acc.type);
      const item = document.createElement('div');
      item.className = `account-item ${acc.id === currentAccountId ? 'active' : ''}`;
      item.onclick = () => selectAccount(acc.id);
      
      item.innerHTML = `
        <div style="display: flex; align-items: center;">
          <div class="account-icon-badge">${icon}</div>
          <div class="account-info">
            <span class="account-name">${acc.name}</span>
          </div>
        </div>
        <span class="account-balance">${fmtCur(accVal, acc.currency)}</span>
      `;
      listContainer.appendChild(item);
    });

    sidebar.appendChild(card);
  });

  renderDetailView();
}

function toggleGroupCollapse(grpId) {
  collapsedGroups[grpId] = !collapsedGroups[grpId];
  localStorage.setItem('wiz_collapsed_groups', JSON.stringify(collapsedGroups));
  renderApp();
}

function selectAccount(accId) {
  currentAccountId = accId;
  document.body.classList.add('mobile-view-detail');
  renderApp();
}

function goBackToList() {
  document.body.classList.remove('mobile-view-detail');
}

function switchInvestSubTab(tab) {
  currentInvestSubTab = tab;
  document.getElementById('tab-btn-holdings').classList.toggle('active', tab === 'holdings');
  document.getElementById('tab-btn-txs').classList.toggle('active', tab === 'transactions');
  renderDetailView();
}

function handleSearchInput(val) {
  searchKeyword = val.trim().toLowerCase();
  renderDetailView();
}

function renderDetailView() {
  const currentAcc = accounts.find(a => a.id === currentAccountId);
  const nameEl = document.getElementById('current-account-name');
  const balEl = document.getElementById('current-account-balance');
  const container = document.getElementById('content-container');
  const investTabs = document.getElementById('invest-subtabs');

  if (!currentAcc) {
    nameEl.innerText = '請先建立帳戶';
    balEl.innerText = '$0.00';
    container.innerHTML = '<p style="color:var(--text-muted); text-align:center; padding: 40px 0;">未有選定帳戶</p>';
    investTabs.style.display = 'none';
    return;
  }

  const icon = getAccountTypeIcon(currentAcc.type);
  nameEl.innerHTML = `<span style="margin-right: 6px;">${icon}</span>${currentAcc.name}`;
  
  const totalVal = getAccountTotalValue(currentAcc.id);
  const cashBal = getAccountCashBalance(currentAcc.id);

  if (currentAcc.type === 'investment') {
    investTabs.style.display = 'flex';
    balEl.innerText = `總市值: ${fmtCur(totalVal, currentAcc.currency)} (現金: ${fmtCur(cashBal, currentAcc.currency)})`;
    if (currentInvestSubTab === 'holdings') {
      renderHoldings(currentAcc);
      return;
    }
  } else {
    investTabs.style.display = 'none';
    balEl.innerText = `${fmtCur(cashBal, currentAcc.currency)}`;
  }

  renderTransactions(currentAcc);
}

function renderHoldings(currentAcc) {
  const container = document.getElementById('content-container');
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
        <div class="holding-shares">${displayShares} 股 • 均價 $${h.avgCost.toFixed(2)} (市價 $${h.currentPrice.toFixed(2)})</div>
        ${h.totalDividends > 0 ? `<div class="holding-div-badge">累積股息: +$${h.totalDividends.toFixed(2)}</div>` : ''}
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

  const pendingTxs = accTxs.filter(t => t.isPending);
  const regularTxs = accTxs.filter(t => !t.isPending);

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
  const item = document.createElement('div');
  item.className = `tx-item ${tx.isPending ? 'pending-item' : ''}`;

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
    amtStr = (tx.type === 'expense' ? '-' : '+') + fmtCur(Number(tx.amount), displayCur);
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
    title = `買入 ${tx.symbol} (${tx.shares} 股 @ $${tx.price})`;
    amtClass = 'expense';
    amtStr = `-${fmtCur(Number(tx.amount) + (Number(tx.commission) || 0), displayCur)}`;
    catBadgeHtml = `<span class="tx-cat-chip">📈 證券買入</span>`;
  } else if (tx.type === 'sell') {
    icon = '📉';
    const comm = Number(tx.commission) || 0;
    title = `賣出 ${tx.symbol} (${tx.shares} 股 @ $${tx.price})${comm > 0 ? ' • 佣金 $' + comm : ''}`;
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
    <div class="tx-left" onclick="openEditTxModal('${tx.id}')">
      <div class="tx-tag">${icon}</div>
      <div class="tx-content">
        <div class="tx-title">${title}</div>
        <div class="tx-sub-date">${cleanDate}</div>
        ${catBadgeHtml ? `<div class="tx-sub-cat">${catBadgeHtml}</div>` : ''}
      </div>
    </div>
    <div style="display: flex; align-items: center; gap: 8px;">
      <div class="tx-amt ${amtClass}">${amtStr}</div>
      <button class="flag-toggle-btn ${tx.isPending ? 'flagged' : ''}" title="切換待還狀態" onclick="event.stopPropagation(); toggleTxFlag('${tx.id}')">🚩</button>
    </div>
  `;
  return item;
}

function toggleTxFlag(txId) {
  const tx = transactions.find(t => t.id === txId);
  if (tx) {
    tx.isPending = !tx.isPending;
    if (tx.linkedTxId) {
      const linked = transactions.find(t => t.id === tx.linkedTxId);
      if (linked) linked.isPending = tx.isPending;
    }
    saveData();
  }
}

function setupModalTypeTabs(isInvest) {
  const tabContainer = document.getElementById('modal-type-tabs');
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
}

function switchTxTab(type) {
  currentTxType = type;
  document.querySelectorAll('#modal-type-tabs .type-tab').forEach(tab => {
    tab.classList.toggle('active', tab.innerText.toLowerCase() === type);
  });

  const isTransfer = (type === 'transfer');
  const isExchange = (type === 'exchange');
  const isTransferOrExchange = (isTransfer || isExchange);
  const isAdjust = (type === 'adjust');

  document.getElementById('label-from-acc').innerText = isTransferOrExchange ? '轉出戶口' : '帳戶';
  document.getElementById('f-group-target-container').style.display = isTransferOrExchange ? 'block' : 'none';
  document.getElementById('tx-from-currency').style.display = isTransferOrExchange ? 'block' : 'none';

  document.getElementById('f-group-title').style.display = (type === 'expense' || type === 'income' || isAdjust) ? 'flex' : 'none';
  document.getElementById('f-group-category').style.display = (type === 'expense' || type === 'income') ? 'flex' : 'none';
  document.getElementById('f-group-stock').style.display = (type === 'buy' || type === 'sell' || type === 'dividend') ? 'flex' : 'none';

  const isDiv = (type === 'dividend');
  document.getElementById('stock-shares-box').style.display = isDiv ? 'none' : 'flex';
  document.getElementById('stock-price-box').style.display = isDiv ? 'none' : 'flex';
  document.getElementById('stock-commission-box').style.display = isDiv ? 'none' : 'flex';

  if (isAdjust) {
    document.getElementById('f-group-amount').style.display = 'flex';
    document.getElementById('f-group-exchange').style.display = 'none';
    document.getElementById('f-group-commission').style.display = 'none';
    document.getElementById('label-amount').innerText = '調整金額（正數增加 +，負數減少 -）';
    document.getElementById('label-title').innerText = '調整原因';
    if (!document.getElementById('tx-title').value.trim()) {
      document.getElementById('tx-title').value = '餘額調整';
    }
  } else {
    document.getElementById('label-title').innerText = '標題 / 商戶';
  }

  if (type === 'expense' || type === 'income') {
    populateCategoryDropdown(type);
  }

  if (isTransferOrExchange) {
    populateTransferAccountSelects();
    updateTransferOrExchangeUI();
  } else if (!isAdjust) {
    document.getElementById('f-group-amount').style.display = (type === 'expense' || type === 'income') ? 'flex' : 'none';
    document.getElementById('label-amount').innerText = '金額';
    document.getElementById('f-group-exchange').style.display = 'none';
    document.getElementById('f-group-commission').style.display = 'none';
  }
}

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

  document.getElementById('f-group-commission').style.display = 'flex';

  if (!fromCurSelect.value) {
    populateCurrencyOptions(fromCurSelect, fromAcc?.currency || 'CAD');
  }
  if (!toCurSelect.value) {
    populateCurrencyOptions(toCurSelect, toAcc?.currency || 'CAD');
  }

  const activeFromCur = fromCurSelect.value || fromAcc?.currency || 'CAD';
  const activeToCur = toCurSelect.value || toAcc?.currency || 'CAD';
  const isSameCurrency = (activeFromCur === activeToCur);

  if (currentTxType === 'transfer') {
    if (isSameCurrency) {
      document.getElementById('f-group-amount').style.display = 'flex';
      document.getElementById('label-amount').innerText = `金額 (${activeFromCur})`;
      document.getElementById('f-group-exchange').style.display = 'none';
    } else {
      document.getElementById('f-group-amount').style.display = 'none';
      document.getElementById('f-group-exchange').style.display = 'flex';
      document.getElementById('label-from-amount').innerText = `轉出金額 (${activeFromCur})`;
      document.getElementById('label-to-amount').innerText = `轉入金額 (${activeToCur})`;
    }
  } else if (currentTxType === 'exchange') {
    document.getElementById('f-group-amount').style.display = 'none';
    document.getElementById('f-group-exchange').style.display = 'flex';
    document.getElementById('label-from-amount').innerText = `轉出金額 (${activeFromCur})`;
    document.getElementById('label-to-amount').innerText = `轉入金額 (${activeToCur})`;
  }
}

function handleFromAccountChange() {
  const fromAccId = document.getElementById('tx-from-acc').value;
  const fromAcc = accounts.find(a => a.id === fromAccId);
  rebuildToAccountOptions();
  populateCurrencyOptions(document.getElementById('tx-from-currency'), fromAcc?.currency || 'CAD');
  updateTransferOrExchangeUI();
  syncExchangeValuesOnAccountChange();
}

function handleToAccountChange() {
  const toAccId = document.getElementById('tx-target-acc').value;
  const toAcc = accounts.find(a => a.id === toAccId);
  populateCurrencyOptions(document.getElementById('tx-to-currency'), toAcc?.currency || 'CAD');
  updateTransferOrExchangeUI();
  syncExchangeValuesOnAccountChange();
}

function handleFromCurrencyChange() {
  updateTransferOrExchangeUI();
  syncExchangeValuesOnAccountChange();
}

function handleToCurrencyChange() {
  updateTransferOrExchangeUI();
  syncExchangeValuesOnAccountChange();
}

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

function populateCategoryDropdown(flowType, selectedId = null) {
  const select = document.getElementById('tx-category');
  select.innerHTML = '';
  const parents = categories.filter(c => c.flowType === flowType && !c.parentId);
  parents.forEach(p => {
    const children = categories.filter(c => c.parentId === p.id);
    if (children.length > 0) {
      const optGroup = document.createElement('optgroup');
      optGroup.label = `${p.icon} ${p.name}`;
      children.forEach(ch => {
        const opt = document.createElement('option');
        opt.value = ch.id; opt.innerText = `${ch.icon} ${ch.name}`;
        if (selectedId === ch.id) opt.selected = true;
        optGroup.appendChild(opt);
      });
      select.appendChild(optGroup);
    } else {
      const opt = document.createElement('option');
      opt.value = p.id; opt.innerText = `${p.icon} ${p.name}`;
      if (selectedId === p.id) opt.selected = true;
      select.appendChild(opt);
    }
  });
}

function openTxModal() {
  const defaultAcc = accounts.find(a => a.id === currentAccountId) || accounts[0];
  const isInvest = defaultAcc && defaultAcc.type === 'investment';

  ['tx-id', 'tx-title', 'tx-amount', 'tx-from-amount', 'tx-to-amount', 
   'tx-exchange-rate', 'tx-commission', 'tx-stock-symbol', 'tx-stock-shares', 
   'tx-stock-price', 'tx-stock-total', 'tx-stock-commission'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  document.getElementById('tx-is-pending').checked = false;
  document.getElementById('tx-date').value = new Date().toISOString().split('T')[0];
  document.getElementById('btn-delete-tx').style.display = 'none';
  document.getElementById('tx-modal-title').innerText = '記一筆交易';

  setupModalTypeTabs(isInvest);
  populateTransferAccountSelects(defaultAcc ? defaultAcc.id : null);

  const targetAcc = accounts.find(a => a.id !== (defaultAcc ? defaultAcc.id : '')) || defaultAcc;
  if (defaultAcc) {
    populateCurrencyOptions(document.getElementById('tx-from-currency'), defaultAcc.currency);
  }
  if (targetAcc) {
    populateCurrencyOptions(document.getElementById('tx-to-currency'), targetAcc.currency);
  }

  switchTxTab(isInvest ? 'buy' : 'expense');
  openModal('tx-modal');
}

function openEditTxModal(txId) {
  const tx = transactions.find(t => t.id === txId);
  if (!tx) return;
  const acc = accounts.find(a => a.id === tx.accountId) || accounts[0];
  const isInvest = acc && acc.type === 'investment';

  ['tx-id', 'tx-title', 'tx-amount', 'tx-from-amount', 'tx-to-amount', 
   'tx-exchange-rate', 'tx-commission', 'tx-stock-symbol', 'tx-stock-shares', 
   'tx-stock-price', 'tx-stock-total', 'tx-stock-commission'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });

  document.getElementById('tx-id').value = tx.id;
  document.getElementById('tx-modal-title').innerText = '編輯交易';
  document.getElementById('tx-is-pending').checked = !!tx.isPending;
  
  setupModalTypeTabs(isInvest);
  
  populateTransferAccountSelects(tx.accountId, tx.toAccountId);
  const fromAcc = accounts.find(a => a.id === tx.accountId);
  const toAcc = accounts.find(a => a.id === tx.toAccountId);
  populateCurrencyOptions(document.getElementById('tx-from-currency'), tx.currency || fromAcc?.currency || 'CAD');
  populateCurrencyOptions(document.getElementById('tx-to-currency'), tx.toCurrency || toAcc?.currency || 'CAD');

  switchTxTab(tx.type);

  if (tx.type === 'adjust') {
    document.getElementById('tx-title').value = tx.title || '餘額調整';
    document.getElementById('tx-amount').value = tx.amount;
  } else if (tx.type === 'expense' || tx.type === 'income') {
    document.getElementById('tx-title').value = tx.title;
    document.getElementById('tx-amount').value = tx.amount;
    populateCategoryDropdown(tx.type, tx.categoryId);
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
    document.getElementById('tx-stock-symbol').value = tx.symbol;
    document.getElementById('tx-stock-shares').value = tx.shares;
    document.getElementById('tx-stock-price').value = tx.price;
    document.getElementById('tx-stock-total').value = tx.amount;
    document.getElementById('tx-stock-commission').value = tx.commission || '';
  } else if (tx.type === 'dividend') {
    document.getElementById('tx-stock-symbol').value = tx.symbol;
    document.getElementById('tx-stock-total').value = tx.amount;
  }

  document.getElementById('tx-date').value = normalizeDateString(tx.date);
  document.getElementById('btn-delete-tx').style.display = 'inline-block';
  openModal('tx-modal');
}

function saveTransaction() {
  const id = document.getElementById('tx-id').value;
  const date = normalizeDateString(document.getElementById('tx-date').value);
  const isPending = document.getElementById('tx-is-pending').checked;
  
  const activeAccountId = document.getElementById('tx-from-acc').value || currentAccountId || (accounts[0] ? accounts[0].id : '');
  const activeAcc = accounts.find(a => a.id === activeAccountId);

  let txData = { 
    id: id || 'tx-' + Date.now(), 
    type: currentTxType, 
    accountId: activeAccountId, 
    currency: activeAcc?.currency || 'CAD',
    date, 
    isPending 
  };

  if