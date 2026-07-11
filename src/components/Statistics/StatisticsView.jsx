import { useMemo } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { formatCurrency } from '../../utils/formatters';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#06b6d4'];

export default function StatisticsView({ transactions }) {
  const { expensesByCategory, dailySpend, totalIncome, totalExpense } = useMemo(() => {
    const expenses = {};
    const daily = {};
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

        // Daily spend breakdown
        const date = t.date; // YYYY-MM-DD
        if (!daily[date]) daily[date] = 0;
        daily[date] += Math.abs(amount);
      }
    });

    const expensesData = Object.entries(expenses)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    // Sort daily data chronologically
    const dailyData = Object.entries(daily)
      .map(([date, amount]) => ({
        date: new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        amount,
        rawDate: date
      }))
      .sort((a, b) => new Date(a.rawDate) - new Date(b.rawDate))
      .slice(-14); // Last 14 active days

    return { expensesByCategory: expensesData, dailySpend: dailyData, totalIncome: tIncome, totalExpense: tExpense };
  }, [transactions]);

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

      <div className="stats-charts">
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
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {expensesByCategory.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value) => formatCurrency(value)}
                    contentStyle={{ background: 'var(--surface-elevated)', border: 'none', borderRadius: '8px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="chart-legend">
                {expensesByCategory.map((entry, index) => (
                  <div key={entry.name} className="chart-legend-item">
                    <span className="chart-legend-color" style={{ background: COLORS[index % COLORS.length] }}></span>
                    <span className="chart-legend-label">{entry.name}</span>
                    <span className="chart-legend-value">{formatCurrency(entry.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="stats-empty-text">No expenses recorded yet.</p>
          )}
        </div>

        <div className="stats-chart-container">
          <h3>Daily Spending Trend (Last 14 Days)</h3>
          {dailySpend.length > 0 ? (
            <div className="chart-wrapper">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={dailySpend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-primary)" />
                  <XAxis dataKey="date" tick={{ fill: 'var(--text-muted)', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(value) => `₹${value}`} />
                  <Tooltip 
                    formatter={(value) => formatCurrency(value)}
                    cursor={{ fill: 'var(--surface-glass)' }}
                    contentStyle={{ background: 'var(--surface-elevated)', border: 'none', borderRadius: '8px', color: 'var(--text-primary)' }}
                  />
                  <Bar dataKey="amount" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="stats-empty-text">No expenses recorded yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
