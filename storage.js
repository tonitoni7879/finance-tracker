/**
 * storage.js — LocalStorage persistence layer
 * All read/write operations for transactions, categories, budgets, and preferences
 */

const Storage = (() => {
  const KEYS = {
    TRANSACTIONS: 'ft_transactions',
    CATEGORIES: 'ft_categories',
    BUDGETS: 'ft_budgets',
    THEME: 'ft_theme',
    USER: 'ft_user',
  };

  // ── Transactions ──────────────────────────────────────────────────────────
  const getTransactions = () => {
    try {
      return JSON.parse(localStorage.getItem(KEYS.TRANSACTIONS)) || [];
    } catch {
      return [];
    }
  };

  const saveTransactions = (transactions) => {
    localStorage.setItem(KEYS.TRANSACTIONS, JSON.stringify(transactions));
  };

  const addTransaction = (transaction) => {
    const all = getTransactions();
    all.unshift(transaction); // newest first
    saveTransactions(all);
    return all;
  };

  const deleteTransaction = (id) => {
    const filtered = getTransactions().filter(t => t.id !== id);
    saveTransactions(filtered);
    return filtered;
  };

  const updateTransaction = (id, updates) => {
    const all = getTransactions().map(t => t.id === id ? { ...t, ...updates } : t);
    saveTransactions(all);
    return all;
  };

  // ── Categories ────────────────────────────────────────────────────────────
  const DEFAULT_CATEGORIES = {
    expense: [
      { id: 'food', name: 'Food & Dining', icon: '🍽️', color: '#F59E0B' },
      { id: 'transport', name: 'Transport', icon: '🚗', color: '#3B82F6' },
      { id: 'housing', name: 'Housing', icon: '🏠', color: '#8B5CF6' },
      { id: 'entertainment', name: 'Entertainment', icon: '🎬', color: '#EC4899' },
      { id: 'health', name: 'Health', icon: '💊', color: '#10B981' },
      { id: 'shopping', name: 'Shopping', icon: '🛍️', color: '#F97316' },
      { id: 'utilities', name: 'Utilities', icon: '⚡', color: '#06B6D4' },
      { id: 'education', name: 'Education', icon: '📚', color: '#6366F1' },
      { id: 'other_exp', name: 'Other', icon: '📦', color: '#9CA3AF' },
    ],
    income: [
      { id: 'salary', name: 'Salary', icon: '💼', color: '#10B981' },
      { id: 'freelance', name: 'Freelance', icon: '💻', color: '#06B6D4' },
      { id: 'investment', name: 'Investment', icon: '📈', color: '#6366F1' },
      { id: 'business', name: 'Business', icon: '🏢', color: '#F59E0B' },
      { id: 'gift', name: 'Gift', icon: '🎁', color: '#EC4899' },
      { id: 'other_inc', name: 'Other', icon: '💰', color: '#9CA3AF' },
    ],
  };

  const getCategories = () => {
    try {
      const saved = JSON.parse(localStorage.getItem(KEYS.CATEGORIES));
      if (!saved) return DEFAULT_CATEGORIES;
      // Merge defaults with custom
      return {
        expense: [...DEFAULT_CATEGORIES.expense, ...(saved.expense || [])],
        income: [...DEFAULT_CATEGORIES.income, ...(saved.income || [])],
      };
    } catch {
      return DEFAULT_CATEGORIES;
    }
  };

  const addCategory = (type, category) => {
    const saved = JSON.parse(localStorage.getItem(KEYS.CATEGORIES)) || { expense: [], income: [] };
    saved[type].push(category);
    localStorage.setItem(KEYS.CATEGORIES, JSON.stringify(saved));
    return getCategories();
  };

  // ── Budgets ───────────────────────────────────────────────────────────────
  const getBudgets = () => {
    try {
      return JSON.parse(localStorage.getItem(KEYS.BUDGETS)) || {};
    } catch {
      return {};
    }
  };

  const saveBudget = (categoryId, amount) => {
    const budgets = getBudgets();
    budgets[categoryId] = parseFloat(amount);
    localStorage.setItem(KEYS.BUDGETS, JSON.stringify(budgets));
    return budgets;
  };

  // ── Theme ─────────────────────────────────────────────────────────────────
  const getTheme = () => localStorage.getItem(KEYS.THEME) || 'dark';
  const saveTheme = (theme) => localStorage.setItem(KEYS.THEME, theme);

  // ── User ──────────────────────────────────────────────────────────────────
  const getUser = () => {
    try {
      return JSON.parse(localStorage.getItem(KEYS.USER)) || { name: 'Alex Morgan', avatar: 'AM' };
    } catch {
      return { name: 'Alex Morgan', avatar: 'AM' };
    }
  };

  // ── Seed Data ─────────────────────────────────────────────────────────────
  const seedSampleData = () => {
    if (getTransactions().length > 0) return; // Don't overwrite existing data

    const now = new Date();
    const sample = [
      // This month
      { id: 'tx_001', type: 'income',  amount: 85000,  category: 'salary',       description: 'Monthly Salary',         date: fmt(now, 0, 1)  },
      { id: 'tx_002', type: 'income',  amount: 15000,  category: 'freelance',    description: 'Web Design Project',     date: fmt(now, 0, 5)  },
      { id: 'tx_003', type: 'expense', amount: 12000,  category: 'housing',      description: 'Rent Payment',           date: fmt(now, 0, 2)  },
      { id: 'tx_004', type: 'expense', amount: 3200,   category: 'food',         description: 'Grocery Shopping',       date: fmt(now, 0, 6)  },
      { id: 'tx_005', type: 'expense', amount: 1800,   category: 'transport',    description: 'Monthly Metro Pass',     date: fmt(now, 0, 3)  },
      { id: 'tx_006', type: 'expense', amount: 2500,   category: 'entertainment',description: 'Netflix + Spotify',      date: fmt(now, 0, 7)  },
      { id: 'tx_007', type: 'expense', amount: 4500,   category: 'shopping',     description: 'New Headphones',         date: fmt(now, 0, 10) },
      { id: 'tx_008', type: 'income',  amount: 8000,   category: 'investment',   description: 'Dividend Income',        date: fmt(now, 0, 12) },
      { id: 'tx_009', type: 'expense', amount: 900,    category: 'health',       description: 'Gym Membership',         date: fmt(now, 0, 4)  },
      { id: 'tx_010', type: 'expense', amount: 600,    category: 'utilities',    description: 'Electricity Bill',       date: fmt(now, 0, 8)  },
      // Last month
      { id: 'tx_011', type: 'income',  amount: 85000,  category: 'salary',       description: 'Monthly Salary',         date: fmt(now, -1, 1) },
      { id: 'tx_012', type: 'expense', amount: 12000,  category: 'housing',      description: 'Rent Payment',           date: fmt(now, -1, 2) },
      { id: 'tx_013', type: 'expense', amount: 6800,   category: 'food',         description: 'Dining Out',             date: fmt(now, -1, 14)},
      { id: 'tx_014', type: 'expense', amount: 3200,   category: 'shopping',     description: 'Clothes Shopping',       date: fmt(now, -1, 9) },
      { id: 'tx_015', type: 'income',  amount: 5000,   category: 'freelance',    description: 'Logo Design',            date: fmt(now, -1, 20)},
      { id: 'tx_016', type: 'expense', amount: 2100,   category: 'transport',    description: 'Cab + Auto rides',       date: fmt(now, -1, 18)},
      { id: 'tx_017', type: 'expense', amount: 1500,   category: 'education',    description: 'Online Course',          date: fmt(now, -1, 22)},
      // 2 months ago
      { id: 'tx_018', type: 'income',  amount: 85000,  category: 'salary',       description: 'Monthly Salary',         date: fmt(now, -2, 1) },
      { id: 'tx_019', type: 'expense', amount: 12000,  category: 'housing',      description: 'Rent Payment',           date: fmt(now, -2, 2) },
      { id: 'tx_020', type: 'expense', amount: 9500,   category: 'shopping',     description: 'Festival Shopping',      date: fmt(now, -2, 15)},
      { id: 'tx_021', type: 'expense', amount: 4200,   category: 'food',         description: 'Party Catering',         date: fmt(now, -2, 20)},
      { id: 'tx_022', type: 'income',  amount: 20000,  category: 'business',     description: 'Consulting Project',     date: fmt(now, -2, 10)},
    ];

    saveTransactions(sample);
  };

  function fmt(date, monthOffset, day) {
    const d = new Date(date.getFullYear(), date.getMonth() + monthOffset, day);
    return d.toISOString().split('T')[0];
  }

  return {
    getTransactions,
    saveTransactions,
    addTransaction,
    deleteTransaction,
    updateTransaction,
    getCategories,
    addCategory,
    getBudgets,
    saveBudget,
    getTheme,
    saveTheme,
    getUser,
    seedSampleData,
  };
})();
