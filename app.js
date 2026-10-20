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

// 預設折疊狀態快取
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

// 輔助函式：根據分組名稱或帳戶類型推斷預設 Emoji 圖示
function getGroupDefaultIcon(grp) {
  if (grp.icon && grp.icon.trim()) return grp.icon.trim();
  const name = (grp.name || '').toLowerCase();
  if (name.includes('credit')) return '💳';
  if (name.includes('bank') || name.includes('cash')) return '🏦';
  if (name.includes('stock') || name.includes('invest') || name.includes('broker')) return '📈';
  if (name.includes('crypto')) return '🪙';
  return '📁';
}

// 輔助函式：取得結餘正負對應 class（正數綠色、負數紅色、零元中性灰）
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

window.setSyncStatus = function(state, msg) {
  const btn = document.getElementById('btn-manual-sync');
  const text = document.getElementById('sync-text');
  const icon = document.getElementById('sync-icon');
  if (btn) btn.className = `sync-status ${state}`;
  if (text) text.innerText = msg;
  if (icon) {
    if (state === 'syncing') icon.innerText = '⏳';
    else if (state === 'synced') icon.innerText = '☁️';
    else if (state === 'error') icon.innerText = '⚠️';
    else icon.innerText = '☁️';
  }
};

window.pushToGoogleSheet = async function() {
  if (!SCRIPT_URL) return;
  setSyncStatus('syncing', '正在儲存...');
  try {
    const debtRepayments = JSON.parse(localStorage.getItem('wiz_debt_repayments')) || [];
    const payload = { accounts, groups, categories, transactions, debtRepayments };
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
};

window.pullFromGoogleSheet = async function() {
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
    if (data.debtRepayments && Array.isArray(data.debtRepayments)) {
      localStorage.setItem('wiz_debt_repayments', JSON.stringify(data.debtRepayments));
    }

    if (accounts.length > 0 && !accounts.some(a => a.id === currentAccountId)) {
      currentAccountId = accounts[0].id;
    }

    saveLocalDataOnly();
    setSyncStatus('synced', '已是最新');
  } catch (err) {
    console.error('Pull failed:', err);
    setSyncStatus('error', '連線失敗');
  }
};

window.manualSyncTrigger = function() {
  if (!SCRIPT_URL) {
    switchMainTab('settings');
    return;
  }
  setSyncStatus('syncing', '同步中...');
  pullFromGoogleSheet();
};

function saveLocalDataOnly() {
  localStorage.setItem('wiz_cats_cloud', JSON.stringify(categories));
  localStorage.setItem('wiz_grps_cloud', JSON.stringify(groups));
  localStorage.setItem('wiz_accs_cloud', JSON.stringify(accounts));
  localStorage.setItem('wiz_txs_cloud', JSON.stringify(transactions));
  localStorage.setItem('wiz_stock_cache_cloud', JSON.stringify(stockPriceCache));
  renderApp();
}

window.saveData = function() {
  saveLocalDataOnly();
  pushToGoogleSheet();
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

window.handleCSVFileSelected = function(event) {
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
};

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

// 截圖 OCR 辨識
window.handleOCRImageSelected = async function(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;

  setSyncStatus('syncing', '正在 OCR 辨識截圖...');

  try {
    const worker = await Tesseract.createWorker('eng');
    const ret = await worker.recognize(file);
    await worker.terminate();

    const fullText = ret.data.text;
    const lines = fullText.split('\n').map(l => l.trim()).filter(l => l.length > 0);

    let amount = '';
    let amtLineIdx = -1;

    for (let i = 0; i < lines.length; i++) {
      const match = lines[i].match(/(?:CA)?\$\s*(\d+[\.,]\d{2})/i);
      if (match) {
        amount = match[1].replace(',', '.');
        amtLineIdx = i;
        break;
      }
    }

    let guessedTitle = 'Wallet 交易';
    if (amtLineIdx !== -1 && amtLineIdx + 1 < lines.length) {
      let rawMerchant = lines[amtLineIdx + 1];
      guessedTitle = rawMerchant.split(',')[0].trim();
    } else {
      const textLines = lines.filter(l => l.length > 2 && !l.includes('$') && !l.toLowerCase().includes('done'));
      if (textLines.length > 0) guessedTitle = textLines[0].split(',')[0].trim();
    }

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

    openTxPage(null);
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
};

window.fetchQuote = async function(symbol) {
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
};

window.fetchQuoteForInput = async function() {
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
};

window.refreshLiveStockPrices = async function() {
  const symbols = new Set(transactions.filter(t => t.symbol).map(t => t.symbol));
  if (symbols.size === 0) return;
  for (const sym of symbols) {
    await fetchQuote(sym);
  }
  renderApp();
  alert('持倉市價已更新完成！✨');
};

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

// 模組 2：主頁帳戶分組渲染更新（方案 A：Group 標題馬卡龍 Badge + 正綠負紅）
window.renderAccountsView = function() {
  const container = document.getElementById('sidebar-accounts');
  if (!container) return;
  container.innerHTML = '';

  if (typeof collapsedGroups === 'undefined') window.collapsedGroups = {};

  groups.forEach(grp => {
    // 預設為折疊：只有明確設為 false 才是展開
    const isCollapsed = collapsedGroups[grp.id] !== false;

    // 撈出屬於該 Group 的 Accounts
    const grpAccounts = accounts.filter(a => a.groupId === grp.id);

    // 計算分組結算幣種總額
    let grpTotal = 0;
    grpAccounts.forEach(acc => {
      const b = getAccountCashBalance(acc.id);
      grpTotal += convertAmount(b, acc.currency, grp.currency || baseCurrency);
    });

    // 決定圖示、馬卡龍主題 Class 與結餘顏色 Class
    const grpIcon = getGroupDefaultIcon(grp);
    const themeKey = (grp.theme || 'mint').toLowerCase();
    const badgeClass = `group-badge-${themeKey}`;
    const balColorClass = getBalanceColorClass(grpTotal);

    // 1. 純白卡片容器
    const groupCard = document.createElement('div');
    groupCard.className = 'ios-group-card';

    // 2. 分組 Header 列（帶有 36x36 圓角馬卡龍方塊 Badge）
    const headerRow = document.createElement('div');
    headerRow.className = 'group-header-row';
    if (!isCollapsed) {
      headerRow.style.paddingBottom = '10px';
      headerRow.style.borderBottom = '0.5px solid #F0F1F5';
    }

    headerRow.innerHTML = `
      <div style="display:flex; align-items:center;" onclick="toggleGroupCollapse('${grp.id}')">
        <span style="font-size:10px; color:#8E8E93; width:14px;">${isCollapsed ? '▶' : '▼'}</span>
        <div class="group-macaron-badge ${badgeClass}">${grpIcon}</div>
        <div style="font-size:15px; font-weight:700; color:#1C1C1E;">${grp.name}</div>
      </div>
      <div style="display:flex; align-items:center; gap:6px;">
        <span class="${balColorClass}" style="font-size:15px;">${fmtCur(grpTotal, grp.currency || baseCurrency)}</span>
        <button type="button" style="background:none; border:none; color:#C7C7CC; cursor:pointer; font-size:12px; padding:4px;" onclick="event.stopPropagation(); openEditGroupModal('${grp.id}')">✏️</button>
      </div>
    `;
    groupCard.appendChild(headerRow);

    // 3. 展開後的 Accounts 清單
    const accList = document.createElement('div');
    accList.style.display = isCollapsed ? 'none' : 'block';

    if (grpAccounts.length === 0) {
      accList.innerHTML = '<div style="font-size:12px; color:var(--text-muted); padding:10px 0; text-align:center;">此分組尚無帳戶</div>';
    } else {
      grpAccounts.forEach((acc, idx) => {
        const bal = getAccountCashBalance(acc.id);
        const itemBalClass = getBalanceColorClass(bal);

        const row = document.createElement('div');
        row.className = 'acc-item-row';
        if (idx === grpAccounts.length - 1) row.style.borderBottom = 'none';
        row.onclick = () => selectAccount(acc.id);

        row.innerHTML = `
          <div>
            <div style="font-size:14px; font-weight:600; color:#1C1C1E;">${acc.name}</div>
            <div style="font-size:11px; color:#8E8E93;">${acc.type}</div>
          </div>
          <div style="display:flex; align-items:center; gap:4px;">
            <span class="${itemBalClass}" style="font-size:14px;">${fmtCur(bal, acc.currency)}</span>
            <span style="color:#C7C7CC; font-size:14px; margin-left:2px;">›</span>
          </div>
        `;
        accList.appendChild(row);
      });
    }

    groupCard.appendChild(accList);
    container.appendChild(groupCard);
  });
};

// 折疊狀態切換（預設為折疊，點擊後展開）
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
  if (amtEl) amtEl.innerText = `$${totalNetWorthInBase.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  window.renderAccountsView();
  renderDetailView();
  if (window.renderDebtTrackerView) window.renderDebtTrackerView();
  renderCategoryTree();
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

window.switchMainTab = function(tab) {
  currentMainTab = tab;
  document.querySelectorAll('.ios-tab-bar .tab-item').forEach(el => el.classList.remove('active'));
  
  const viewAccounts = document.getElementById('view-accounts');
  const viewDebts = document.getElementById('view-debt-tracker');
  const viewSettings = document.getElementById('view-settings');
  const viewTxForm = document.getElementById('view-tx-form');

  if (viewAccounts) viewAccounts.style.display = 'none';
  if (viewDebts) viewDebts.style.display = 'none';
  if (viewSettings) viewSettings.style.display = 'none';
  if (viewTxForm) viewTxForm.style.display = 'none';

  if (tab === 'accounts') {
    const navAcc = document.getElementById('tab-nav-accounts');
    if (navAcc) navAcc.classList.add('active');
    if (viewAccounts) viewAccounts.style.display = 'flex';
    if (!document.body.classList.contains('mobile-view-detail')) {
      document.body.classList.remove('hide-header');
    }
  } else if (tab === 'debts') {
    const navDebts = document.getElementById('tab-nav-debts');
    if (navDebts) navDebts.classList.add('active');
    if (viewDebts) viewDebts.style.display = 'flex';
    document.body.classList.add('hide-header');
    if (window.renderDebtTrackerView) window.renderDebtTrackerView();
  } else if (tab === 'settings') {
    const navSettings = document.getElementById('tab-nav-settings');
    if (navSettings) navSettings.classList.add('active');
    if (viewSettings) viewSettings.style.display = 'flex';
    document.body.classList.add('hide-header');
    
    const baseCur = document.getElementById('setting-base-currency');
    const cloudUrl = document.getElementById('setting-cloud-url');
    if (baseCur) baseCur.value = baseCurrency;
    if (cloudUrl) cloudUrl.value = SCRIPT_URL;
    renderCategoryTree();
  }
};

window.openTxPage = function(txId = null) {
  previousActiveTab = currentMainTab || 'accounts';
  
  document.getElementById('view-accounts').style.display = 'none';
  if (document.getElementById('view-debt-tracker')) document.getElementById('view-debt-tracker').style.display = 'none';
  if (document.getElementById('view-settings')) document.getElementById('view-settings').style.display = 'none';
  
  const tabBar = document.querySelector('.ios-tab-bar');
  if (tabBar) tabBar.style.display = 'none';

  document.body.classList.add('hide-header');

  const txPage = document.getElementById('view-tx-form');
  txPage.style.display = 'flex';

  if (txId) {
    document.getElementById('tx-page-title').innerText = '編輯交易';
    document.getElementById('btn-delete-tx-page').style.display = 'block';
    setupEditTxForm(txId);
  } else {
    document.getElementById('tx-page-title').innerText = '記一筆交易';
    document.getElementById('btn-delete-tx-page').style.display = 'none';
    resetTxForm();
  }
};

window.closeTxPage = function() {
  document.getElementById('view-tx-form').style.display = 'none';
  
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
  const isInvest = defaultAcc && defaultAcc.type === 'investment';

  ['tx-id', 'tx-title', 'tx-amount', 'tx-from-amount', 'tx-to-amount', 
   'tx-exchange-rate', 'tx-commission', 'tx-stock-symbol', 'tx-stock-shares', 
   'tx-stock-price', 'tx-stock-total', 'tx-stock-commission'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  document.getElementById('tx-is-pending').checked = false;
  document.getElementById('tx-date').value = new Date().toISOString().split('T')[0];

  document.getElementById('tx-category').value = '';
  document.getElementById('tx-cat-display-name').innerText = '🏷️ 點擊選擇分類';

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
}

function setupEditTxForm(txId) {
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
  document.getElementById('tx-is-pending').checked = (tx.isPending === true || String(tx.isPending).trim().toUpperCase() === 'TRUE');
  
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
    document.getElementById('tx-category').value = tx.categoryId || '';
    const cat = categories.find(c => c.id === tx.categoryId);
    document.getElementById('tx-cat-display-name').innerText = cat ? `${cat.icon} ${cat.name}` : '🏷️ 點擊選擇分類';
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
    if (balEl) balEl.innerText = '$0.00';
    container.innerHTML = '<p style="color:var(--text-muted); text-align:center; padding: 40px 0;">未有選定帳戶</p>';
    if (investTabs) investTabs.style.display = 'none';
    return;
  }

  const icon = getAccountTypeIcon(currentAcc.type);
  if (nameEl) nameEl.innerHTML = `<span style="margin-right: 6px;">${icon}</span>${currentAcc.name}`;
  
  const totalVal = getAccountTotalValue(currentAcc.id);
  const cashBal = getAccountCashBalance(currentAcc.id);

  if (currentAcc.type === 'investment') {
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
    saveData();
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

window.switchTxTab = function(type) {
  currentTxType = type;
  document.querySelectorAll('#modal-type-tabs .type-tab').forEach(tab => {
    tab.classList.toggle('active', tab.innerText.toLowerCase() === type);
  });

  const isTransfer = (type === 'transfer');
  const isExchange = (type === 'exchange');
  const isTransferOrExchange = (isTransfer || isExchange);
  const isAdjust = (type === 'adjust');

  const labelFrom = document.getElementById('label-from-acc');
  if (labelFrom) labelFrom.innerText = isTransferOrExchange ? '轉出戶口' : '帳戶';
  
  const targetContainer = document.getElementById('f-group-target-container');
  if (targetContainer) targetContainer.style.display = isTransferOrExchange ? 'block' : 'none';

  const fromCurSelect = document.getElementById('tx-from-currency');
  if (fromCurSelect) fromCurSelect.style.display = isTransferOrExchange ? 'block' : 'none';

  const fTitle = document.getElementById('f-group-title');
  if (fTitle) fTitle.style.display = (type === 'expense' || type === 'income' || isAdjust) ? 'flex' : 'none';

  const fCat = document.getElementById('f-group-category');
  if (fCat) fCat.style.display = (type === 'expense' || type === 'income') ? 'flex' : 'none';

  const fStock = document.getElementById('f-group-stock');
  if (fStock) fStock.style.display = (type === 'buy' || type === 'sell' || type === 'dividend') ? 'flex' : 'none';

  const isDiv = (type === 'dividend');
  const sShares = document.getElementById('stock-shares-box');
  const sPrice = document.getElementById('stock-price-box');
  const sComm = document.getElementById('stock-commission-box');
  if (sShares) sShares.style.display = isDiv ? 'none' : 'flex';
  if (sPrice) sPrice.style.display = isDiv ? 'none' : 'flex';
  if (sComm) sComm.style.display = isDiv ? 'none' : 'flex';

  const fAmount = document.getElementById('f-group-amount');
  const fExchange = document.getElementById('f-group-exchange');
  const fCommission = document.getElementById('f-group-commission');
  const labelAmt = document.getElementById('label-amount');
  const labelT = document.getElementById('label-title');

  if (isAdjust) {
    if (fAmount) fAmount.style.display = 'flex';
    if (fExchange) fExchange.style.display = 'none';
    if (fCommission) fCommission.style.display = 'none';
    if (labelAmt) labelAmt.innerText = '調整金額（正數增加 +，負數減少 -）';
    if (labelT) labelT.innerText = '調整原因';
    const txT = document.getElementById('tx-title');
    if (txT && !txT.value.trim()) {
      txT.value = '餘額調整';
    }
  } else {
    if (labelT) labelT.innerText = '標題 / 商戶';
  }

  if (isTransferOrExchange) {
    populateTransferAccountSelects();
    updateTransferOrExchangeUI();
  } else if (!isAdjust) {
    if (fAmount) fAmount.style.display = (type === 'expense' || type === 'income') ? 'flex' : 'none';
    if (labelAmt) labelAmt.innerText = '金額';
    if (fExchange) fExchange.style.display = 'none';
    if (fCommission) fCommission.style.display = 'none';
  }
};

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
  const kw = keyword.toLowerCase();

  const currentFlow = (flowType === 'income') ? 'income' : 'expense';
  const parents = categories.filter(c => c.flowType === currentFlow && !c.parentId);

  parents.forEach(p => {
    const children = categories.filter(c => c.parentId === p.id);
    const matchedChildren = children.filter(ch => ch.name.toLowerCase().includes(kw));
    const parentMatches = p.name.toLowerCase().includes(kw);

    if (kw && !parentMatches && matchedChildren.length === 0) return;

    const headerEl = document.createElement('div');
    headerEl.className = 'picker-cat-header';
    headerEl.innerHTML = `<span>${p.icon}</span><span>${p.name}</span>`;
    
    if (children.length === 0) {
      headerEl.style.cursor = 'pointer';
      headerEl.onclick = () => {
        document.getElementById('tx-category').value = p.id;
        document.getElementById('tx-cat-display-name').innerText = `${p.icon} ${p.name}`;
        closeModal('cat-picker-drawer');
      };
      container.appendChild(headerEl);
      return;
    }

    container.appendChild(headerEl);

    const showChildren = kw ? (parentMatches ? children : matchedChildren) : children;
    showChildren.forEach(ch => {
      const row = document.createElement('div');
      row.className = 'picker-cat-row child-indent';
      row.innerHTML = `<span style="font-size:16px;">${ch.icon}</span><span style="font-size:13.5px; font-weight:600;">${ch.name}</span>`;
      row.onclick = () => {
        document.getElementById('tx-category').value = ch.id;
        document.getElementById('tx-cat-display-name').innerText = `${ch.icon} ${p.name} > ${ch.name}`;
        closeModal('cat-picker-drawer');
      };
      container.appendChild(row);
    });
  });
};

window.filterPickerCategories = function(kw) {
  renderPickerCategories(currentTxType, kw);
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
  populateCurrencyOptions(document.getElementById('tx-from-currency'), fromAcc?.currency || 'CAD');
  updateTransferOrExchangeUI();
  syncExchangeValuesOnAccountChange();
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

window.saveTransaction = function() {
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

  if (currentTxType === 'adjust') {
    const adjAmt = parseFloat(document.getElementById('tx-amount').value);
    if (isNaN(adjAmt)) { alert('請填寫有效調整金額！'); return false; }
    const title = document.getElementById('tx-title').value.trim() || '餘額調整';
    txData = { ...txData, title, amount: adjAmt };
  } else if (currentTxType === 'expense' || currentTxType === 'income') {
    const title = document.getElementById('tx-title').value.trim() || '未命名項目';
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

  saveData();
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

  saveData();
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
  pullFromGoogleSheet();
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
      runningNetWorth -= convertAmount(Number(t.amount), cur, baseCurrency);
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
        y: { ticks: { callback: v => '$' + v.toLocaleString() } }
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
  if (!modal) return;
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

// 初始化
try {
  if (typeof initCurrencyDropdowns === 'function') initCurrencyDropdowns();
  if (typeof updateFXRates === 'function') updateFXRates(typeof baseCurrency !== 'undefined' ? baseCurrency : 'CAD');
  if (typeof renderApp === 'function') renderApp();
  
  const savedGasUrl = localStorage.getItem('wiz_gas_url') || "";
  if (savedGasUrl && typeof pullFromGoogleSheet === 'function') {
    pullFromGoogleSheet();
  } else if (typeof setSyncStatus === 'function') {
    setSyncStatus('', '未連線（點擊設定）');
  }
} catch (initErr) {
  console.error('初始化失敗:', initErr);
}