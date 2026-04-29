/**
 * app.js — Application orchestrator
 * Wires Storage ↔ UI ↔ Charts and handles all user events
 */

const App = (() => {

  // ── State ─────────────────────────────────────────────────────────────────
  let state = {
    transactions: [],
    categories: {},
    budgets: {},
    filters: { type: 'all', category: 'all', dateFrom: '', dateTo: '', search: '' },
    activeSection: 'dashboard',
    addType: 'expense',
  };

  // ── Boot ──────────────────────────────────────────────────────────────────
  const init = () => {
    // Seed data & load state
    Storage.seedSampleData();
    state.transactions = Storage.getTransactions();
    state.categories   = Storage.getCategories();
    state.budgets      = Storage.getBudgets();

    // Apply saved theme
    applyTheme(Storage.getTheme());

    // Render user
    UI.renderUser(Storage.getUser());

    // Initial render
    renderAll();

    // Attach all event listeners
    bindEvents();

    // Show dashboard
    UI.setActiveNav('dashboard');
  };

  // ── Render all ────────────────────────────────────────────────────────────
  const renderAll = () => {
    UI.renderSummary(state.transactions);
    UI.renderTransactions(state.transactions, state.categories, state.filters);
    UI.populateCategorySelects(state.categories);
    UI.renderBudgetAlerts(state.transactions, state.budgets, state.categories);
    UI.renderInsights(state.transactions, state.categories);
    Charts.refreshAll(state.transactions, state.categories);
  };

  // ── Theme ─────────────────────────────────────────────────────────────────
  const applyTheme = (theme) => {
    document.documentElement.setAttribute('data-theme', theme);
    const icon = document.getElementById('themeIcon');
    if (icon) icon.textContent = theme === 'dark' ? '☀️' : '🌙';
    Storage.saveTheme(theme);
  };

  const toggleTheme = () => {
    const current = Storage.getTheme();
    const next = current === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    // Refresh charts to use new theme colors
    setTimeout(() => Charts.refreshTheme(state.transactions, state.categories), 50);
  };

  // ── Add Transaction ───────────────────────────────────────────────────────
  const handleAddTransaction = () => {
    const type = state.addType;
    const amountEl = document.getElementById('txAmount');
    const descEl   = document.getElementById('txDescription');
    const dateEl   = document.getElementById('txDate');
    const catEl    = document.getElementById(type === 'expense' ? 'expenseCategorySelect' : 'incomeCategorySelect');

    const amount = parseFloat(amountEl?.value);
    const description = descEl?.value.trim();
    const date = dateEl?.value;
    const category = catEl?.value;

    // Validation
    if (!amount || isNaN(amount) || amount <= 0) {
      UI.toast('Please enter a valid amount', 'error');
      amountEl?.classList.add('shake');
      setTimeout(() => amountEl?.classList.remove('shake'), 500);
      return;
    }
    if (!description) {
      UI.toast('Please add a description', 'error');
      descEl?.classList.add('shake');
      setTimeout(() => descEl?.classList.remove('shake'), 500);
      return;
    }
    if (!date) {
      UI.toast('Please select a date', 'error');
      return;
    }

    const transaction = {
      id: 'tx_' + Date.now(),
      type,
      amount,
      category,
      description,
      date,
    };

    state.transactions = Storage.addTransaction(transaction);
    renderAll();

    // Reset form
    amountEl.value = '';
    descEl.value = '';
    dateEl.value = new Date().toISOString().split('T')[0];

    UI.toast(`${type === 'income' ? 'Income' : 'Expense'} added successfully!`, 'success');
    UI.closeModal('addTransactionModal');

    // Navigate to transactions section briefly to show the new item
    // (stay on dashboard if user was there)
  };

  // ── Delete Transaction ────────────────────────────────────────────────────
  const deleteTransaction = (id) => {
    state.transactions = Storage.deleteTransaction(id);
    renderAll();
    UI.toast('Transaction deleted', 'success');
  };

  // ── Budget ────────────────────────────────────────────────────────────────
  const handleSaveBudget = () => {
    const catEl = document.getElementById('budgetCategory');
    const amtEl = document.getElementById('budgetAmount');

    const categoryId = catEl?.value;
    const amount = parseFloat(amtEl?.value);

    if (!amount || isNaN(amount) || amount <= 0) {
      UI.toast('Please enter a valid budget amount', 'error');
      return;
    }

    state.budgets = Storage.saveBudget(categoryId, amount);
    UI.renderBudgetAlerts(state.transactions, state.budgets, state.categories);
    amtEl.value = '';
    UI.toast('Budget saved!', 'success');
    UI.closeModal('budgetModal');
  };

  // ── Add Custom Category ───────────────────────────────────────────────────
  const handleAddCategory = () => {
    const nameEl = document.getElementById('catName');
    const typeEl = document.getElementById('catType');
    const iconEl = document.getElementById('catIcon');

    const name = nameEl?.value.trim();
    const type = typeEl?.value;
    const icon = iconEl?.value.trim() || '📁';

    if (!name) {
      UI.toast('Category name is required', 'error');
      return;
    }

    const id = 'custom_' + Date.now();
    const color = '#' + Math.floor(Math.random() * 0xFFFFFF).toString(16).padStart(6, '0');

    state.categories = Storage.addCategory(type, { id, name, icon, color });
    UI.populateCategorySelects(state.categories);

    nameEl.value = '';
    iconEl.value = '';
    UI.toast(`Category "${name}" added!`, 'success');
    UI.closeModal('categoryModal');
  };

  // ── Filters ───────────────────────────────────────────────────────────────
  const applyFilters = () => {
    state.filters = {
      type:     document.getElementById('filterType')?.value     || 'all',
      category: document.getElementById('filterCategory')?.value || 'all',
      dateFrom: document.getElementById('filterDateFrom')?.value || '',
      dateTo:   document.getElementById('filterDateTo')?.value   || '',
      search:   document.getElementById('searchInput')?.value    || '',
    };
    UI.renderTransactions(state.transactions, state.categories, state.filters);
  };

  const clearFilters = () => {
    ['filterType', 'filterCategory', 'filterDateFrom', 'filterDateTo', 'searchInput']
      .forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = el.tagName === 'SELECT' ? el.options[0].value : '';
      });
    state.filters = { type: 'all', category: 'all', dateFrom: '', dateTo: '', search: '' };
    UI.renderTransactions(state.transactions, state.categories, state.filters);
  };

  // ── Events ────────────────────────────────────────────────────────────────
  const bindEvents = () => {

    // Theme toggle
    document.getElementById('themeToggle')?.addEventListener('click', toggleTheme);

    // Navigation
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', () => {
        const section = item.dataset.section;
        state.activeSection = section;
        UI.setActiveNav(section);
        closeSidebar();
        // Re-render charts on dashboard
        if (section === 'dashboard') {
          setTimeout(() => Charts.refreshAll(state.transactions, state.categories), 100);
        }
      });
    });

    // Mobile sidebar
    document.getElementById('menuToggle')?.addEventListener('click', toggleSidebar);
    document.getElementById('sidebarBackdrop')?.addEventListener('click', closeSidebar);

    // Add transaction modal
    document.getElementById('addTxBtn')?.addEventListener('click', () => {
      const dateEl = document.getElementById('txDate');
      if (dateEl && !dateEl.value) dateEl.value = new Date().toISOString().split('T')[0];
      UI.openModal('addTransactionModal');
    });
    document.getElementById('addTxBtnHeader')?.addEventListener('click', () => {
      const dateEl = document.getElementById('txDate');
      if (dateEl && !dateEl.value) dateEl.value = new Date().toISOString().split('T')[0];
      UI.openModal('addTransactionModal');
    });
    document.getElementById('submitTx')?.addEventListener('click', handleAddTransaction);
    document.getElementById('closeTxModal')?.addEventListener('click', () => UI.closeModal('addTransactionModal'));
    document.querySelector('#addTransactionModal .modal-backdrop')?.addEventListener('click', () => UI.closeModal('addTransactionModal'));

    // Type tabs in add transaction modal
    document.querySelectorAll('.type-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        state.addType = tab.dataset.type;
        document.querySelectorAll('.type-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        document.querySelectorAll('.category-group').forEach(g => {
          g.classList.toggle('active', g.dataset.type === state.addType);
        });
      });
    });

    // Budget modal
    document.getElementById('budgetBtn')?.addEventListener('click', () => UI.openModal('budgetModal'));
    document.getElementById('saveBudgetBtn')?.addEventListener('click', handleSaveBudget);
    document.getElementById('closeBudgetModal')?.addEventListener('click', () => UI.closeModal('budgetModal'));
    document.querySelector('#budgetModal .modal-backdrop')?.addEventListener('click', () => UI.closeModal('budgetModal'));

    // Category modal
    document.getElementById('addCatBtn')?.addEventListener('click', () => UI.openModal('categoryModal'));
    document.getElementById('saveCategoryBtn')?.addEventListener('click', handleAddCategory);
    document.getElementById('closeCatModal')?.addEventListener('click', () => UI.closeModal('categoryModal'));
    document.querySelector('#categoryModal .modal-backdrop')?.addEventListener('click', () => UI.closeModal('categoryModal'));

    // Filters
    ['filterType', 'filterCategory', 'filterDateFrom', 'filterDateTo'].forEach(id => {
      document.getElementById(id)?.addEventListener('change', applyFilters);
    });
    document.getElementById('searchInput')?.addEventListener('input', debounce(applyFilters, 300));
    document.getElementById('clearFilters')?.addEventListener('click', clearFilters);

    // CSV Export
    document.getElementById('exportCsvBtn')?.addEventListener('click', () => {
      UI.exportCSV(state.transactions, state.categories);
      UI.toast('CSV exported!', 'success');
    });

    // Keyboard: Escape closes modals
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        ['addTransactionModal', 'budgetModal', 'categoryModal', 'confirmModal'].forEach(id => {
          document.getElementById(id)?.classList.remove('active');
        });
        document.body.style.overflow = '';
      }
      // Ctrl+N = New transaction
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        UI.openModal('addTransactionModal');
      }
    });
  };

  // ── Sidebar (mobile) ──────────────────────────────────────────────────────
  const toggleSidebar = () => {
    document.getElementById('sidebar')?.classList.toggle('open');
    document.getElementById('sidebarBackdrop')?.classList.toggle('visible');
  };

  const closeSidebar = () => {
    document.getElementById('sidebar')?.classList.remove('open');
    document.getElementById('sidebarBackdrop')?.classList.remove('visible');
  };

  // ── Utilities ─────────────────────────────────────────────────────────────
  const debounce = (fn, delay) => {
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), delay); };
  };

  // ── Public API ────────────────────────────────────────────────────────────
  return { init, deleteTransaction };

})();

// Start the app when DOM is ready
document.addEventListener('DOMContentLoaded', App.init);
