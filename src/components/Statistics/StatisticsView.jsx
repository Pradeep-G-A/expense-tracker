import { useState, useMemo } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid
} from 'recharts';
import { formatCurrency } from '../../utils/formatters';
import Skeleton from '../common/Skeleton';

const COLORS = ['#6366f1', '#ec4899', '#14b8a6', '#f59e0b', '#8b5cf6', '#ef4444', '#10b981', '#3b82f6'];

const formatDateStr = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getPresets = () => {
  const now = new Date();
  
  // This Month
  const thisMonthStart = formatDateStr(new Date(now.getFullYear(), now.getMonth(), 1));
  const thisMonthEnd = formatDateStr(new Date(now.getFullYear(), now.getMonth() + 1, 0));

  // Last 30 Days
  const last30Start = formatDateStr(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29));
  const last30End = formatDateStr(now);

  // Last Month
  const lastMonthStart = formatDateStr(new Date(now.getFullYear(), now.getMonth() - 1, 1));
  const lastMonthEnd = formatDateStr(new Date(now.getFullYear(), now.getMonth(), 0));

  // This Year
  const thisYearStart = formatDateStr(new Date(now.getFullYear(), 0, 1));
  const thisYearEnd = formatDateStr(new Date(now.getFullYear(), 11, 31));

  return [
    { id: 'allTime', label: 'All Time', dateFrom: '', dateTo: '' },
    { id: 'thisMonth', label: 'This Month', dateFrom: thisMonthStart, dateTo: thisMonthEnd },
    { id: 'last30', label: 'Last 30 Days', dateFrom: last30Start, dateTo: last30End },
    { id: 'lastMonth', label: 'Last Month', dateFrom: lastMonthStart, dateTo: lastMonthEnd },
    { id: 'thisYear', label: 'This Year', dateFrom: thisYearStart, dateTo: thisYearEnd },
    { id: 'custom', label: 'Custom Range', dateFrom: null, dateTo: null },
  ];
};

export default function StatisticsView({ transactions, filters, onFilterChange, onNavigate, loading }) {
  const [showCustomPicker, setShowCustomPicker] = useState(false);
  const [hoveredBarIndex, setHoveredBarIndex] = useState(null);
  const presets = useMemo(() => getPresets(), []);

  const activePresetId = useMemo(() => {
    const dFrom = filters?.dateFrom || '';
    const dTo = filters?.dateTo || '';
    if (!dFrom && !dTo) return 'allTime';

    const found = presets.find(p => p.id !== 'custom' && p.dateFrom === dFrom && p.dateTo === dTo);
    return found ? found.id : 'custom';
  }, [filters, presets]);

  const handleSelectPreset = (preset) => {
    if (!onFilterChange) return;
    if (preset.id === 'custom') {
      setShowCustomPicker(prev => !prev);
    } else {
      setShowCustomPicker(false);
      onFilterChange({
        ...filters,
        dateFrom: preset.dateFrom,
        dateTo: preset.dateTo,
      });
    }
  };

  const { expensesByCategory, totalIncome, totalExpense, dailyExpenses } = useMemo(() => {
    const expenses = {};
    const daily = {};
    let tIncome = 0;
    let tExpense = 0;

    transactions.forEach(t => {
      const amount = Number(t.amount);
      if (amount > 0) {
        tIncome += amount;
      } else {
        const absAmount = Math.abs(amount);
        tExpense += absAmount;
        
        // Category breakdown
        if (!expenses[t.category]) expenses[t.category] = 0;
        expenses[t.category] += absAmount;

        // Daily breakdown
        if (!daily[t.date]) daily[t.date] = { date: t.date, total: 0, byCategory: {} };
        daily[t.date].total += absAmount;
        if (!daily[t.date].byCategory[t.category]) daily[t.date].byCategory[t.category] = 0;
        daily[t.date].byCategory[t.category] += absAmount;
      }
    });

    const expensesData = Object.entries(expenses)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    const sortedDaily = Object.values(daily).sort((a, b) => new Date(a.date) - new Date(b.date));

    return { expensesByCategory: expensesData, totalIncome: tIncome, totalExpense: tExpense, dailyExpenses: sortedDaily };
  }, [transactions]);

  const activeCategory = filters?.category && filters.category !== 'all' ? filters.category : null;

  const chartDailyData = useMemo(() => {
    return dailyExpenses.map(d => ({
      date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      amount: activeCategory ? (d.byCategory[activeCategory] || 0) : d.total
    }));
  }, [dailyExpenses, activeCategory]);

  const tableData = useMemo(() => {
    const rows = [];
    dailyExpenses.forEach(d => {
      if (activeCategory) {
        if (d.byCategory[activeCategory]) {
           rows.push({ date: d.date, category: activeCategory, amount: d.byCategory[activeCategory] });
        }
      } else {
         Object.entries(d.byCategory).forEach(([cat, amt]) => {
           rows.push({ date: d.date, category: cat, amount: amt });
         });
      }
    });
    return rows.sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [dailyExpenses, activeCategory]);

  const handleCategoryClick = (categoryName) => {
    if (!onFilterChange || !filters) return;

    if (filters.category === categoryName) {
      onFilterChange({ ...filters, category: 'all' });
    } else {
      onFilterChange({ ...filters, category: categoryName });
      if (onNavigate) {
        onNavigate();
      }
    }
  };

  // Derive the active category's color for bar chart
  const activeCategoryColor = useMemo(() => {
    if (!activeCategory) return 'var(--primary)';
    const idx = expensesByCategory.findIndex(e => e.name === activeCategory);
    return idx !== -1 ? COLORS[idx % COLORS.length] : 'var(--primary)';
  }, [activeCategory, expensesByCategory]);

  // Center label values for the donut
  const donutCenterValue = activeCategory
    ? expensesByCategory.find(e => e.name === activeCategory)?.value || 0
    : totalExpense;
  const donutCenterLabel = activeCategory || 'Total Spent';

  if (loading) {
    return (
      <div className="statistics-view">
        <div className="stats-date-presets-wrapper">
          <Skeleton height="40px" borderRadius="20px" />
        </div>
        <div className="stats-chart-container">
          <Skeleton height="24px" width="200px" style={{ marginBottom: '16px' }} />
          <Skeleton height="20px" width="300px" style={{ marginBottom: '24px' }} />
          <div className="chart-wrapper pie-chart-layout">
            <div className="pie-container">
              <Skeleton height="280px" borderRadius="16px" />
            </div>
            <div className="pie-legend">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <Skeleton height="20px" width="120px" />
                  <Skeleton height="20px" width="60px" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="statistics-view">
      {/* Date Range Quick Presets */}
      <div className="stats-date-presets-wrapper">
        <div className="stats-date-presets">
          {presets.map(preset => {
            const isActive = activePresetId === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                className={`preset-pill ${isActive ? 'active' : ''}`}
                onClick={() => handleSelectPreset(preset)}
              >
                {preset.label}
              </button>
            );
          })}
        </div>

        {(activePresetId === 'custom' || showCustomPicker) && (
          <div className="stats-custom-date-row">
            <div className="stats-custom-date-group">
              <label htmlFor="stats-from">From:</label>
              <input
                id="stats-from"
                type="date"
                value={filters?.dateFrom || ''}
                onChange={e => onFilterChange && onFilterChange({ ...filters, dateFrom: e.target.value })}
              />
            </div>
            <div className="stats-custom-date-group">
              <label htmlFor="stats-to">To:</label>
              <input
                id="stats-to"
                type="date"
                value={filters?.dateTo || ''}
                onChange={e => onFilterChange && onFilterChange({ ...filters, dateTo: e.target.value })}
              />
            </div>
            {(filters?.dateFrom || filters?.dateTo) && (
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={() => onFilterChange && onFilterChange({ ...filters, dateFrom: '', dateTo: '' })}
              >
                Clear Dates
              </button>
            )}
          </div>
        )}
      </div>

      {!transactions.length ? (
        <div className="stats-empty">
          <h3>No Data Available</h3>
          <p>No transactions found for the selected time range.</p>
        </div>
      ) : (
        <>
          <div className="stats-chart-container">
        <h3>Expenses by Category</h3>
        
        <div className="stats-totals-line">
          <span>Income: <strong className="text-positive">{formatCurrency(totalIncome)}</strong></span>
          <span className="line-separator">|</span>
          <span>Expenses: <strong className="text-negative">{formatCurrency(totalExpense)}</strong></span>
        </div>

        {expensesByCategory.length > 0 ? (
          <div className="chart-wrapper pie-chart-layout">
            {/* Donut with center label */}
            <div className="pie-container">
              <div className="pie-donut-wrapper">
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={expensesByCategory}
                      cx="50%"
                      cy="50%"
                      innerRadius={72}
                      outerRadius={112}
                      paddingAngle={2}
                      dataKey="value"
                      onClick={(data) => handleCategoryClick(data.name)}
                      style={{ cursor: 'pointer' }}
                      labelLine={false}
                    >
                      {expensesByCategory.map((entry, index) => {
                        const isSelected = activeCategory === entry.name;
                        const finalOpacity = activeCategory
                          ? (isSelected ? 1.0 : 0.15)
                          : 1.0;
                        return (
                          <Cell
                            key={`cell-${index}`}
                            fill={COLORS[index % COLORS.length]}
                            opacity={finalOpacity}
                            stroke="var(--bg-primary)"
                            strokeWidth={3}
                          />
                        );
                      })}
                    </Pie>
                    <Tooltip
                      formatter={(value) => formatCurrency(value)}
                      contentStyle={{
                        background: 'rgba(14,14,14,0.88)',
                        backdropFilter: 'blur(16px)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '10px',
                        color: 'var(--text-primary)',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                        fontSize: '0.85rem',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                {/* Center label overlay */}
                <div className="pie-center-label">
                  <span className="pie-center-value">{formatCurrency(donutCenterValue)}</span>
                  <span className="pie-center-sub">{donutCenterLabel}</span>
                </div>
              </div>
            </div>
            <div className="chart-legend-detailed">
              {expensesByCategory.map((entry, index) => {
                const isSelected = activeCategory === entry.name;
                const finalOpacity = activeCategory
                  ? (isSelected ? 1.0 : 0.3)
                  : 1.0;
                const percentage = ((entry.value / totalExpense) * 100).toFixed(1);

                return (
                  <div
                    key={entry.name}
                    className={`chart-legend-item-detailed ${isSelected ? 'active' : ''}`}
                    onClick={() => handleCategoryClick(entry.name)}
                    style={{ opacity: finalOpacity }}
                  >
                    <div className="legend-main">
                      <span 
                        className="legend-color-dot" 
                        style={{ background: COLORS[index % COLORS.length] }}
                      />
                      <span className="legend-category-name">{entry.name}</span>
                    </div>
                    <div className="legend-stats">
                      <span className="legend-amount">{formatCurrency(entry.value)}</span>
                      <span className="legend-percentage">{percentage}%</span>
                    </div>
                  </div>
                );
              })}
              {activeCategory && (
                <button
                  className="btn btn--ghost btn--sm"
                  onClick={() => onFilterChange({ ...filters, category: 'all' })}
                  style={{ marginTop: '4px' }}
                >
                  Clear filter
                </button>
              )}
            </div>
          </div>
        ) : (
          <p className="stats-empty-text">No expenses recorded yet.</p>
        )}
      </div>

      {expensesByCategory.length > 0 && chartDailyData.length > 0 && (
        <div className="stats-chart-container day-wise-chart">
          <h3>Daily Spending {activeCategory ? `— ${activeCategory}` : ''}</h3>
          <div className="bar-chart-wrapper">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartDailyData}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                onMouseMove={(state) => {
                  if (state.isTooltipActive) {
                    setHoveredBarIndex(state.activeTooltipIndex ?? null);
                  } else {
                    setHoveredBarIndex(null);
                  }
                }}
                onMouseLeave={() => setHoveredBarIndex(null)}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--glass-border)" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(val) => `₹${val}`}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(255,255,255,0.04)', radius: 6 }}
                  formatter={(value) => [formatCurrency(value), 'Spent']}
                  contentStyle={{
                    background: 'rgba(14,14,14,0.88)',
                    backdropFilter: 'blur(16px)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '10px',
                    color: 'var(--text-primary)',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                    fontSize: '0.85rem',
                  }}
                />
                <Bar dataKey="amount" radius={[6, 6, 0, 0]} maxBarSize={48}>
                  {chartDailyData.map((entry, index) => {
                    const isHovered = hoveredBarIndex === index;
                    const isDimmed = hoveredBarIndex !== null && !isHovered;
                    return (
                      <Cell
                        key={`bar-${index}`}
                        fill={activeCategoryColor}
                        opacity={isDimmed ? 0.35 : 1}
                        style={{
                          filter: isHovered ? `drop-shadow(0 0 8px ${activeCategoryColor}88)` : 'none',
                          transition: 'opacity 0.2s ease, filter 0.2s ease',
                        }}
                      />
                    );
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {tableData.length > 0 && (
        <div className="stats-chart-container daily-spending-table-container">
          <div className="stats-table-header">
            <h3>Daily Breakdown {activeCategory ? <span className="stats-table-filter-badge">{activeCategory}</span> : ''}</h3>
            <span className="stats-table-count">{tableData.length} entries</span>
          </div>
          <div className="stats-table-scroll">
            <table className="daily-spending-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Category</th>
                  <th className="th--right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {tableData.map((row, idx) => {
                  const showDate = idx === 0 || tableData[idx - 1].date !== row.date;
                  const formattedDate = new Date(row.date).toLocaleDateString('en-US', {
                    month: 'short', day: 'numeric', year: 'numeric'
                  });
                  return (
                    <tr key={idx} className={`stats-table-row ${showDate && idx !== 0 ? 'stats-table-row--new-date' : ''}`}>
                      <td className="td--date-cell">
                        {showDate ? <span className="td--date-text">{formattedDate}</span> : null}
                      </td>
                      <td>
                        <span className="category-badge">{row.category}</span>
                      </td>
                      <td className="td--amount">{formatCurrency(row.amount)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
        </>
      )}
    </div>
  );
}
