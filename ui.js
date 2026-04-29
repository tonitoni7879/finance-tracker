/**
 * ui.js — DOM rendering, modal management, and UI interactions
 */

const UI = (() => {

  // ── Format helpers ────────────────────────────────────────────────────────
  const formatCurrency = (amount) =>
    '₹' + Math.abs(amount).toLocaleString('en-IN', { maximumFractionDigits: 0 });

  const formatDate = (dateStr) => {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const timeAgo = (dateStr) => {
    const d = new Date(dateStr + 'T00:00:00');
    const now = new Date();
    const diff = Math.floor((now - d) / 86400000);
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Yesterday';
    if (diff < 7) return `${diff}d ago`;
    return formatDate(dateStr);
  };

  // ── Summary Cards ─────────────────────────────────────────────────────────
  const renderSummary = (transactions) => {
    const income = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expenses = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const balance = income - expenses;

    animateCounter('totalBalance', balance, true);
    animateCounter('totalIncome', income);
    animateCounter('totalExpenses', expenses);

    // Savings rate
    const savingsRate = income > 0 ? ((balance / income) * 100).toFixed(0) : 0;
    const el = document.getElementById('savingsRate');
    if (el) el.textContent = `${savingsRate}% savings rate`;

    // Balance color
    const balanceEl = document.getElementById('totalBalance');
    if (balanceEl) {
      balanceEl.style.color = balance >= 0
        ? 'var(--color-income)'
        : 'var(--color-expense)';
    }
  };

  const animateCounter = (id, target, signed = false) => {
    const el = document.getElementById(id);
    if (!el) return;

    const duration = 800;
    const start = performance.now();
    const from = 0;

    const tick = (now) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      const current = from + (target - from) * eased;

      const prefix = signed && target < 0 ? '-' : '';
      el.textContent = prefix + formatCurrency(current);

      if (progress < 1) requestAnimationFrame(tick);
    };

    requestAnimationFrame(tick);
  };

  // ── Transaction List ──────────────────────────────────────────────────────
  const renderTransactions = (transactions, categories, filters = {}) => {
    const container = document.getElementById('transactionList');
    if (!container) return;

    let filtered = [...transactions];

    // Apply filters
    if (filters.type && filters.type !== 'all') {
      filtered = filtered.filter(t => t.type === filters.type);
    }
    if (filters.category && filters.category !== 'all') {
      filtered = filtered.filter(t => t.category === filters.category);
    }
    if (filters.dateFrom) {
      filtered = filtered.filter(t => t.date >= filters.dateFrom);
    }
    if (filters.dateTo) {
      filtered = filtered.filter(t => t.date <= filters.dateTo);
    }
    if (filters.search) {
      const q = filters.search.toLowerCase();
      filtered = filtered.filter(t =>
        t.description.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q)
      );
    }

    // Update count badge
    const countEl = document.getElementById('txCount');
    if (countEl) countEl.textContent = filtered.length;

    if (filtered.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📋</div>
          <p>No transactions found</p>
          <span>Try adjusting your filters or add a new transaction</span>
        </div>`;
      return;
    }

    const allCats = [...categories.expense, ...categories.income];

    container.innerHTML = filtered.map((t, i) => {
      const cat = allCats.find(c => c.id === t.category) || { name: t.category, icon: '💸', color: '#9CA3AF' };
      const isIncome = t.type === 'income';

      return `
        <div class="tx-item" data-id="${t.id}" style="animation-delay:${i * 30}ms">
          <div class="tx-icon" style="background:${cat.color}22; color:${cat.color}">
            ${cat.icon}
          </div>
          <div class="tx-info">
            <span class="tx-desc">${escapeHtml(t.description)}</span>
            <div class="tx-meta">
              <span class="tx-cat-badge" style="background:${cat.color}22; color:${cat.color}">${cat.name}</span>
              <span class="tx-date">${timeAgo(t.date)}</span>
            </div>
          </div>
          <div class="tx-right">
            <span class="tx-amount ${isIncome ? 'income' : 'expense'}">
              ${isIncome ? '+' : '-'}${formatCurrency(t.amount)}
            </span>
            <button class="tx-delete" data-id="${t.id}" title="Delete transaction">
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
              </svg>
            </button>
          </div>
        </div>`;
    }).join('');

    // Delete event delegation
    container.querySelectorAll('.tx-delete').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.dataset.id;
        showConfirm('Delete this transaction?', () => {
          App.deleteTransaction(id);
        });
      });
    });
  };

  // ── Category Filter Dropdowns ─────────────────────────────────────────────
  const populateCategorySelects = (categories) => {
    const allCats = [...categories.expense, ...categories.income];

    // Add transaction form
    ['expenseCategorySelect', 'incomeCategorySelect'].forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      const type = id.includes('expense') ? 'expense' : 'income';
      const list = categories[type];
      el.innerHTML = list.map(c =>
        `<option value="${c.id}">${c.icon} ${c.name}</option>`
      ).join('');
    });

    // Filter dropdown
    const filterCat = document.getElementById('filterCategory');
    if (filterCat) {
      filterCat.innerHTML = `<option value="all">All Categories</option>` +
        allCats.map(c => `<option value="${c.id}">${c.icon} ${c.name}</option>`).join('');
    }

    // Budget select
    const budgetCat = document.getElementById('budgetCategory');
    if (budgetCat) {
      budgetCat.innerHTML = categories.expense.map(c =>
        `<option value="${c.id}">${c.icon} ${c.name}</option>`
      ).join('');
    }
  };

  // ── Budget Alerts ─────────────────────────────────────────────────────────
  const renderBudgetAlerts = (transactions, budgets, categories) => {
    const container = document.getElementById('budgetAlerts');
    if (!container) return;

    const now = new Date();
    const thisMonth = transactions.filter(t => {
      const d = new Date(t.date);
      return t.type === 'expense' &&
        d.getMonth() === now.getMonth() &&
        d.getFullYear() === now.getFullYear();
    });

    const spending = {};
    thisMonth.forEach(t => {
      spending[t.category] = (spending[t.category] || 0) + t.amount;
    });

    const alerts = [];
    Object.entries(budgets).forEach(([catId, limit]) => {
      const spent = spending[catId] || 0;
      const pct = (spent / limit) * 100;
      if (pct > 0) {
        const cat = [...categories.expense, ...categories.income].find(c => c.id === catId);
        alerts.push({ catId, cat, spent, limit, pct });
      }
    });

    if (alerts.length === 0) {
      container.innerHTML = `<p class="no-budgets">No budgets set. Add limits to track spending.</p>`;
      return;
    }

    container.innerHTML = alerts.map(a => {
      const over = a.pct > 100;
      const warn = a.pct > 80;
      const color = over ? 'var(--color-expense)' : warn ? '#F59E0B' : 'var(--color-income)';

      return `
        <div class="budget-item ${over ? 'over' : warn ? 'warn' : ''}">
          <div class="budget-header">
            <span class="budget-cat">${a.cat?.icon || '💰'} ${a.cat?.name || a.catId}</span>
            <span class="budget-status" style="color:${color}">
              ${over ? '🚨 Over budget' : warn ? '⚠️ Near limit' : '✅ On track'}
            </span>
          </div>
          <div class="budget-bar-track">
            <div class="budget-bar-fill" style="width:${Math.min(a.pct, 100)}%; background:${color}"></div>
          </div>
          <div class="budget-amounts">
            <span>${formatCurrency(a.spent)} spent</span>
            <span>Limit: ${formatCurrency(a.limit)}</span>
          </div>
        </div>`;
    }).join('');
  };

  // ── Smart Insights ────────────────────────────────────────────────────────
  const renderInsights = (transactions, categories) => {
    const container = document.getElementById('insightsList');
    if (!container) return;

    const insights = [];
    const now = new Date();
    const thisMonth = transactions.filter(t => {
      const d = new Date(t.date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    const lastMonth = transactions.filter(t => {
      const d = new Date(t.date);
      const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      return d.getMonth() === lm.getMonth() && d.getFullYear() === lm.getFullYear();
    });

    const tmIncome = thisMonth.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const tmExpense = thisMonth.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const lmExpense = lastMonth.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

    if (tmIncome > 0) {
      const rate = ((tmIncome - tmExpense) / tmIncome * 100).toFixed(0);
      insights.push({
        icon: rate >= 20 ? '🏆' : rate >= 0 ? '📊' : '⚠️',
        text: rate >= 20
          ? `Excellent! You're saving ${rate}% of your income this month.`
          : rate >= 0
            ? `You're saving ${rate}% this month. Aim for 20%+.`
            : `You're spending more than you earn this month by ${formatCurrency(tmExpense - tmIncome)}.`,
        type: rate >= 20 ? 'good' : rate >= 0 ? 'neutral' : 'bad',
      });
    }

    if (lmExpense > 0 && tmExpense > 0) {
      const change = ((tmExpense - lmExpense) / lmExpense * 100).toFixed(0);
      insights.push({
        icon: change > 0 ? '📈' : '📉',
        text: change > 0
          ? `Expenses up ${change}% vs last month (${formatCurrency(lmExpense)} → ${formatCurrency(tmExpense)}).`
          : `Expenses down ${Math.abs(change)}% vs last month. Great discipline!`,
        type: change > 10 ? 'bad' : 'good',
      });
    }

    // Top spending category
    const catSpend = {};
    thisMonth.filter(t => t.type === 'expense').forEach(t => {
      catSpend[t.category] = (catSpend[t.category] || 0) + t.amount;
    });
    const topCat = Object.entries(catSpend).sort((a, b) => b[1] - a[1])[0];
    if (topCat) {
      const cat = [...categories.expense].find(c => c.id === topCat[0]);
      insights.push({
        icon: cat?.icon || '💸',
        text: `Biggest spend: ${cat?.name || topCat[0]} at ${formatCurrency(topCat[1])} this month.`,
        type: 'neutral',
      });
    }

    if (insights.length === 0) {
      container.innerHTML = `<p class="no-insights">Add more transactions to unlock insights.</p>`;
      return;
    }

    container.innerHTML = insights.map(i => `
      <div class="insight-item insight-${i.type}">
        <span class="insight-icon">${i.icon}</span>
        <p>${i.text}</p>
      </div>
    `).join('');
  };

  // ── Toast Notifications ───────────────────────────────────────────────────
  const toast = (message, type = 'success') => {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const el = document.createElement('div');
    el.className = `toast toast-${type}`;
    el.innerHTML = `
      <span class="toast-icon">${type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ'}</span>
      <span>${message}</span>
    `;
    container.appendChild(el);

    requestAnimationFrame(() => el.classList.add('show'));

    setTimeout(() => {
      el.classList.remove('show');
      setTimeout(() => el.remove(), 300);
    }, 3000);
  };

  // ── Confirm Dialog ────────────────────────────────────────────────────────
  const showConfirm = (message, onConfirm) => {
    const modal = document.getElementById('confirmModal');
    const msg = document.getElementById('confirmMessage');
    const btn = document.getElementById('confirmOk');

    if (!modal || !msg || !btn) { onConfirm(); return; }

    msg.textContent = message;
    modal.classList.add('active');

    const cleanup = () => modal.classList.remove('active');
    btn.onclick = () => { cleanup(); onConfirm(); };
    document.getElementById('confirmCancel').onclick = cleanup;
    modal.querySelector('.modal-backdrop').onclick = cleanup;
  };

  // ── Modal helpers ─────────────────────────────────────────────────────────
  const openModal = (id) => {
    document.getElementById(id)?.classList.add('active');
    document.body.style.overflow = 'hidden';
  };

  const closeModal = (id) => {
    document.getElementById(id)?.classList.remove('active');
    document.body.style.overflow = '';
  };

  // ── Sidebar ───────────────────────────────────────────────────────────────
  const setActiveNav = (section) => {
    document.querySelectorAll('.nav-item').forEach(el => {
      el.classList.toggle('active', el.dataset.section === section);
    });
    document.querySelectorAll('.section').forEach(el => {
      el.classList.toggle('active', el.id === section + 'Section');
    });
  };

  // ── CSV Export ────────────────────────────────────────────────────────────
  const exportCSV = (transactions, categories) => {
    const allCats = [...categories.expense, ...categories.income];
    const header = ['Date', 'Description', 'Category', 'Type', 'Amount (₹)'];

    const rows = transactions.map(t => {
      const cat = allCats.find(c => c.id === t.category);
      return [
        t.date,
        `"${t.description.replace(/"/g, '""')}"`,
        cat?.name || t.category,
        t.type,
        t.amount,
      ];
    });

    const csv = [header, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `finance-tracker-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── User display ──────────────────────────────────────────────────────────
  const renderUser = (user) => {
    document.querySelectorAll('.user-name').forEach(el => el.textContent = user.name);
    document.querySelectorAll('.user-avatar').forEach(el => el.textContent = user.avatar);
  };

  // ── Escape HTML ───────────────────────────────────────────────────────────
  const escapeHtml = (str) => {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  };

  return {
    formatCurrency,
    formatDate,
    renderSummary,
    renderTransactions,
    populateCategorySelects,
    renderBudgetAlerts,
    renderInsights,
    toast,
    showConfirm,
    openModal,
    closeModal,
    setActiveNav,
    exportCSV,
    renderUser,
  };
})();
