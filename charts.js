/**
 * charts.js — All Chart.js chart instances and update logic
 */

const Charts = (() => {
  let pieChart = null;
  let barChart = null;

  const CHART_COLORS = [
    '#F59E0B', '#3B82F6', '#8B5CF6', '#EC4899',
    '#10B981', '#F97316', '#06B6D4', '#6366F1',
    '#9CA3AF', '#EF4444',
  ];

  const isDark = () => document.documentElement.getAttribute('data-theme') === 'dark';

  const getGridColor = () => isDark() ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
  const getTextColor = () => isDark() ? '#9CA3AF' : '#6B7280';
  const getTooltipBg = () => isDark() ? '#1F2937' : '#FFFFFF';
  const getTooltipText = () => isDark() ? '#F9FAFB' : '#111827';

  // ── Pie/Doughnut: Expenses by Category ───────────────────────────────────
  const initPieChart = (data) => {
    const ctx = document.getElementById('pieChart');
    if (!ctx) return;

    if (pieChart) { pieChart.destroy(); pieChart = null; }

    if (!data.labels.length) {
      ctx.getContext('2d').clearRect(0, 0, ctx.width, ctx.height);
      return;
    }

    pieChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: data.labels,
        datasets: [{
          data: data.values,
          backgroundColor: CHART_COLORS.slice(0, data.values.length),
          borderColor: isDark() ? '#1F2937' : '#FFFFFF',
          borderWidth: 3,
          hoverBorderWidth: 0,
          hoverOffset: 8,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '70%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              color: getTextColor(),
              padding: 16,
              usePointStyle: true,
              pointStyleWidth: 8,
              font: { family: 'Sora', size: 11 },
            },
          },
          tooltip: {
            backgroundColor: getTooltipBg(),
            titleColor: getTooltipText(),
            bodyColor: getTextColor(),
            borderColor: isDark() ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
            borderWidth: 1,
            padding: 12,
            cornerRadius: 10,
            callbacks: {
              label: (ctx) => {
                const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
                const pct = ((ctx.parsed / total) * 100).toFixed(1);
                return `  ₹${ctx.parsed.toLocaleString('en-IN')} (${pct}%)`;
              },
            },
          },
        },
      },
    });
  };

  // ── Bar: Monthly Income vs Expenses ──────────────────────────────────────
  const initBarChart = (data) => {
    const ctx = document.getElementById('barChart');
    if (!ctx) return;

    if (barChart) { barChart.destroy(); barChart = null; }

    barChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: data.labels,
        datasets: [
          {
            label: 'Income',
            data: data.income,
            backgroundColor: 'rgba(16, 185, 129, 0.85)',
            borderRadius: 6,
            borderSkipped: false,
          },
          {
            label: 'Expenses',
            data: data.expenses,
            backgroundColor: 'rgba(239, 68, 68, 0.85)',
            borderRadius: 6,
            borderSkipped: false,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        scales: {
          x: {
            grid: { color: getGridColor(), drawBorder: false },
            ticks: { color: getTextColor(), font: { family: 'Sora', size: 11 } },
          },
          y: {
            grid: { color: getGridColor(), drawBorder: false },
            ticks: {
              color: getTextColor(),
              font: { family: 'Sora', size: 11 },
              callback: (v) => '₹' + (v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v),
            },
            beginAtZero: true,
          },
        },
        plugins: {
          legend: {
            labels: {
              color: getTextColor(),
              usePointStyle: true,
              pointStyleWidth: 8,
              font: { family: 'Sora', size: 11 },
            },
          },
          tooltip: {
            backgroundColor: getTooltipBg(),
            titleColor: getTooltipText(),
            bodyColor: getTextColor(),
            borderColor: isDark() ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
            borderWidth: 1,
            padding: 12,
            cornerRadius: 10,
            callbacks: {
              label: (ctx) => ` ${ctx.dataset.label}: ₹${ctx.parsed.y.toLocaleString('en-IN')}`,
            },
          },
        },
      },
    });
  };

  // ── Data Processors ───────────────────────────────────────────────────────
  const buildPieData = (transactions, categories) => {
    const expenses = transactions.filter(t => t.type === 'expense');
    const catMap = {};

    expenses.forEach(t => {
      catMap[t.category] = (catMap[t.category] || 0) + t.amount;
    });

    const allCats = categories.expense;
    const sorted = Object.entries(catMap).sort((a, b) => b[1] - a[1]);

    return {
      labels: sorted.map(([id]) => allCats.find(c => c.id === id)?.name || id),
      values: sorted.map(([, v]) => v),
    };
  };

  const buildBarData = (transactions) => {
    // Last 6 months
    const months = [];
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
        label: d.toLocaleString('default', { month: 'short', year: '2-digit' }),
        income: 0,
        expenses: 0,
      });
    }

    transactions.forEach(t => {
      const monthKey = t.date.slice(0, 7);
      const m = months.find(m => m.key === monthKey);
      if (!m) return;
      if (t.type === 'income') m.income += t.amount;
      else m.expenses += t.amount;
    });

    return {
      labels: months.map(m => m.label),
      income: months.map(m => m.income),
      expenses: months.map(m => m.expenses),
    };
  };

  // ── Public refresh ────────────────────────────────────────────────────────
  const refreshAll = (transactions, categories) => {
    initPieChart(buildPieData(transactions, categories));
    initBarChart(buildBarData(transactions));
  };

  const refreshTheme = (transactions, categories) => {
    // Re-render with new theme colors
    refreshAll(transactions, categories);
  };

  return { refreshAll, refreshTheme, buildPieData, buildBarData };
})();
