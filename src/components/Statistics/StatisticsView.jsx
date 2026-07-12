import { useMemo } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { formatCurrency } from '../../utils/formatters';

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

  // Helper to calculate monochromatic opacity based on slice index
  const getSliceOpacity = (index, total) => {
    if (total <= 1) return 1.0;
    // Distribute opacities from 1.0 down to 0.25
    return 1.0 - (index / Math.max(1, total - 1)) * 0.75;
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
      <div className="stats-chart-container">
        <h3>Expenses by Category</h3>
        
        {/* Simple totals line replacing the card summary */}
        <div className="stats-totals-line">
          <span>Income: <strong className="text-positive">{formatCurrency(totalIncome)}</strong></span>
          <span className="line-separator">|</span>
          <span>Expenses: <strong className="text-negative">{formatCurrency(totalExpense)}</strong></span>
        </div>

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
                  paddingAngle={2}
                  dataKey="value"
                  onClick={(data) => handleCategoryClick(data.name)}
                  style={{ cursor: 'pointer' }}
                >
                  {expensesByCategory.map((entry, index) => {
                    const baseOpacity = getSliceOpacity(index, expensesByCategory.length);
                    // Dim if another category is selected
                    const isSelected = activeCategory === entry.name;
                    const finalOpacity = activeCategory 
                      ? (isSelected ? 1.0 : 0.15) 
                      : baseOpacity;

                    return (
                      <Cell
                        key={`cell-${index}`}
                        fill="var(--primary)"
                        opacity={finalOpacity}
                        stroke="var(--bg-card)"
                        strokeWidth={2}
                      />
                    );
                  })}
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
              {expensesByCategory.map((entry, index) => {
                const baseOpacity = getSliceOpacity(index, expensesByCategory.length);
                const isSelected = activeCategory === entry.name;
                const finalOpacity = activeCategory
                  ? (isSelected ? 1.0 : 0.25)
                  : baseOpacity;

                return (
                  <div
                    key={entry.name}
                    className={`chart-legend-item ${isSelected ? 'chart-legend-item--active' : ''}`}
                    onClick={() => handleCategoryClick(entry.name)}
                    style={{ 
                      cursor: 'pointer', 
                      opacity: finalOpacity 
                    }}
                  >
                    <span 
                      className="chart-legend-color" 
                      style={{ 
                        background: 'var(--primary)', 
                        opacity: baseOpacity
                      }}
                    ></span>
                    <span className="chart-legend-label">{entry.name}</span>
                    <span className="chart-legend-value">{formatCurrency(entry.value)}</span>
                  </div>
                );
              })}
            </div>
            {activeCategory && (
              <button
                className="btn btn--ghost btn--sm"
                onClick={() => onFilterChange({ ...filters, category: 'all' })}
                style={{ alignSelf: 'center', marginTop: '12px' }}
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
