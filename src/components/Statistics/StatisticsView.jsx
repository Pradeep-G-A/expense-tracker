import { useMemo } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { formatCurrency } from '../../utils/formatters';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#06b6d4'];

export default function StatisticsView({ transactions, filters, onFilterChange, onNavigate }) {
  const { expensesByCategory, totalIncome, totalExpense } = useMemo(() => {
    const expenses = {};
    let tIncome = 0;
    let tExpense = 0;

    transactions.forEach(t => {
      const amount = Number(t.amount);
      if (amount > 0) {
        tIncome += amount;
      } else {
        tExpense += Math.abs(amount);
        
        // Category breakdown
        if (!expenses[t.category]) expenses[t.category] = 0;
        expenses[t.category] += Math.abs(amount);
      }
    });

    const expensesData = Object.entries(expenses)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    return { expensesByCategory: expensesData, totalIncome: tIncome, totalExpense: tExpense };
  }, [transactions]);

  const activeCategory = filters?.category && filters.category !== 'all' ? filters.category : null;

  const handleCategoryClick = (categoryName) => {
    if (!onFilterChange || !filters) return;

    // Toggle: if already filtering by this category, clear it
    if (filters.category === categoryName) {
      onFilterChange({ ...filters, category: 'all' });
    } else {
      onFilterChange({ ...filters, category: categoryName });
      if (onNavigate) {
        onNavigate();
      }
    }
  };

  if (!transactions.length) {
    return (
      <div className="stats-empty">
        <h3>No Data Available</h3>
        <p>Add some transactions to see your statistics.</p>
      </div>
    );
  }

  return (
    <div className="statistics-view">
      <div className="stats-summary">
        <div className="stats-summary__card">
          <h4>Total Income</h4>
          <span className="text-positive">{formatCurrency(totalIncome)}</span>
        </div>
        <div className="stats-summary__card">
          <h4>Total Expenses</h4>
          <span className="text-negative">{formatCurrency(totalExpense)}</span>
        </div>
      </div>

      <div className="stats-chart-container">
        <h3>Expenses by Category</h3>
        {expensesByCategory.length > 0 ? (
          <div className="chart-wrapper">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={expensesByCategory}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={3}
                  dataKey="value"
                  onClick={(data) => handleCategoryClick(data.name)}
                  style={{ cursor: 'pointer' }}
                >
                  {expensesByCategory.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                      opacity={activeCategory && activeCategory !== entry.name ? 0.3 : 1}
                      stroke={activeCategory === entry.name ? '#ffffff' : 'none'}
                      strokeWidth={activeCategory === entry.name ? 3 : 0}
                    />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value) => formatCurrency(value)}
                  contentStyle={{ 
                    background: 'var(--bg-card)', 
                    border: '2px solid var(--border-primary)', 
                    borderRadius: '4px',
                    color: 'var(--text-primary)'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="chart-legend">
              {expensesByCategory.map((entry, index) => (
                <div
                  key={entry.name}
                  className={`chart-legend-item ${activeCategory === entry.name ? 'chart-legend-item--active' : ''}`}
                  onClick={() => handleCategoryClick(entry.name)}
                  style={{ cursor: 'pointer', opacity: activeCategory && activeCategory !== entry.name ? 0.4 : 1 }}
                >
                  <span className="chart-legend-color" style={{ background: COLORS[index % COLORS.length] }}></span>
                  <span className="chart-legend-label">{entry.name}</span>
                  <span className="chart-legend-value">{formatCurrency(entry.value)}</span>
                </div>
              ))}
            </div>
            {activeCategory && (
              <button
                className="btn btn--ghost btn--sm"
                onClick={() => onFilterChange({ ...filters, category: 'all' })}
                style={{ alignSelf: 'center', marginTop: '8px' }}
              >
                Clear category filter
              </button>
            )}
          </div>
        ) : (
          <p className="stats-empty-text">No expenses recorded yet.</p>
        )}
      </div>
    </div>
  );
}
