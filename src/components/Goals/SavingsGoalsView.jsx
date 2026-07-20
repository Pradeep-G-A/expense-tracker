import { useState, useEffect } from 'react';
import { Target, Plus, Trash2, Calendar } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';
import { supabase } from '../../supabaseClient';

export default function SavingsGoalsView({ accounts, onAddTransaction }) {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newGoal, setNewGoal] = useState({
    name: '',
    targetAmount: '',
    currentAmount: '',
    monthlyTarget: '',
    targetDate: '',
  });

  // Track deposit/withdrawal inputs per goal
  const [adjustments, setAdjustments] = useState({});
  // Track ledger linking options per goal
  const [linkOptions, setLinkOptions] = useState({});

  const handleLinkChange = (id, field, value) => {
    setLinkOptions(prev => ({
      ...prev,
      [id]: {
        ...(prev[id] || { linked: false, account: accounts?.[0]?.name || 'HDFC' }),
        [field]: value
      }
    }));
  };

  const fetchGoals = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('savings_goals')
        .select('*')
        .order('created_at', { ascending: true });
      
      if (error) {
        console.error('Error fetching savings goals:', error);
      } else {
        setGoals(data || []);
      }
    } catch (err) {
      console.error('Failed to load goals:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGoals();
  }, []);

  const handleAddGoal = async (e) => {
    e.preventDefault();
    if (!newGoal.name || !newGoal.targetAmount) return;

    try {
      const { error } = await supabase
        .from('savings_goals')
        .insert({
          name: newGoal.name,
          target_amount: Number(newGoal.targetAmount),
          current_amount: Number(newGoal.currentAmount || 0),
          monthly_target: Number(newGoal.monthlyTarget || 0),
          target_date: newGoal.targetDate || null,
        });

      if (error) {
        console.error('Error inserting savings goal:', error);
        alert('Failed to add savings goal. Please try again.');
      } else {
        await fetchGoals();
        setNewGoal({
          name: '',
          targetAmount: '',
          currentAmount: '',
          monthlyTarget: '',
          targetDate: '',
        });
        setShowAddForm(false);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteGoal = async (id) => {
    if (confirm('Are you sure you want to delete this savings goal?')) {
      try {
        const { error } = await supabase
          .from('savings_goals')
          .delete()
          .eq('id', id);

        if (error) {
          console.error('Error deleting savings goal:', error);
        } else {
          setGoals(prev => prev.filter(g => g.id !== id));
        }
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleAdjustSavings = async (goal, isDeposit, overrideAmt = null) => {
    const amtStr = overrideAmt !== null ? String(overrideAmt) : (adjustments[goal.id] || '');
    const amt = Number(amtStr);
    if (!amtStr || isNaN(amt) || amt <= 0) return;

    const factor = isDeposit ? 1 : -1;
    const newAmt = Math.max(0, Math.min(goal.target_amount, goal.current_amount + (amt * factor)));
    const actualChange = newAmt - goal.current_amount;

    if (actualChange === 0) return;

    // Optional Ledger Link
    const linkState = linkOptions[goal.id] || {};
    if (linkState.linked && onAddTransaction) {
       const ledgerAmount = isDeposit ? -Math.abs(actualChange) : Math.abs(actualChange);
       try {
         await onAddTransaction({
           amount: ledgerAmount,
           category: 'Savings & Investments',
           account: linkState.account || accounts?.[0]?.name || 'HDFC',
           date: new Date().toISOString().split('T')[0],
           time: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
           note: `${isDeposit ? 'Transfer to' : 'Withdrawal from'} Goal: ${goal.name}`,
           linked_goal_id: goal.id,
         });
       } catch (err) {
         console.error('Failed to log transaction to ledger', err);
       }
    }

    try {
      const { error } = await supabase
        .from('savings_goals')
        .update({ current_amount: newAmt })
        .eq('id', goal.id);

      if (error) {
        console.error('Error updating savings progress:', error);
        alert('Failed to update savings.');
      } else {
        // Optimistically update local state to avoid full refetch delay
        setGoals(prev => prev.map(g => g.id === goal.id ? { ...g, current_amount: newAmt } : g));
        setAdjustments(prev => ({ ...prev, [goal.id]: '' }));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAdjustmentChange = (id, val) => {
    setAdjustments(prev => ({ ...prev, [id]: val }));
  };

  // Calculated values
  const totalTarget = goals.reduce((sum, g) => sum + Number(g.target_amount || 0), 0);
  const totalSaved = goals.reduce((sum, g) => sum + Number(g.current_amount || 0), 0);
  const totalMonthlyCommitment = goals.reduce((sum, g) => sum + Number(g.monthly_target || 0), 0);
  const overallPercentage = totalTarget > 0 ? Math.round((totalSaved / totalTarget) * 100) : 0;

  if (loading && goals.length === 0) {
    return (
      <div className="table-loading">
        <div className="spinner spinner--lg" />
        <p>Loading savings goals...</p>
      </div>
    );
  }

  return (
    <div className="goals-view">
      {/* Overview Cards */}
      <div className="stats-summary">
        <div className="stats-summary__card">
          <h4>Total Goal Savings</h4>
          <span className="text-positive">{formatCurrency(totalSaved)}</span>
          <span className="summary-card-sub">of {formatCurrency(totalTarget)} target ({overallPercentage}%)</span>
        </div>
        <div className="stats-summary__card">
          <h4>Monthly Contribution Goal</h4>
          <span className="text-primary-color" style={{ color: 'var(--primary)' }}>{formatCurrency(totalMonthlyCommitment)} / mo</span>
          <span className="summary-card-sub">for all savings goals</span>
        </div>
      </div>

      <div className="goals-header">
        <h3 className="section-title">
          <Target size={20} />
          Savings Goals
          <span className="section-count">{goals.length}</span>
        </h3>
        <button
          className="btn btn--primary btn--sm"
          onClick={() => setShowAddForm(!showAddForm)}
        >
          <Plus size={16} /> Add Goal
        </button>
      </div>

      {/* Add Goal Form */}
      {showAddForm && (
        <form onSubmit={handleAddGoal} className="goal-add-form flat-form-card">
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="goal-name">Goal Name *</label>
              <input
                id="goal-name"
                type="text"
                placeholder="e.g. Emergency Fund"
                value={newGoal.name}
                onChange={e => setNewGoal(prev => ({ ...prev, name: e.target.value }))}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="goal-target">Target Amount (₹) *</label>
              <input
                id="goal-target"
                type="number"
                min="1"
                placeholder="50000"
                value={newGoal.targetAmount}
                onChange={e => setNewGoal(prev => ({ ...prev, targetAmount: e.target.value }))}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="goal-current">Initial Saved Amount (₹)</label>
              <input
                id="goal-current"
                type="number"
                min="0"
                placeholder="0"
                value={newGoal.currentAmount}
                onChange={e => setNewGoal(prev => ({ ...prev, currentAmount: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label htmlFor="goal-monthly">Monthly Target Contribution (₹)</label>
              <input
                id="goal-monthly"
                type="number"
                min="0"
                placeholder="1000"
                value={newGoal.monthlyTarget}
                onChange={e => setNewGoal(prev => ({ ...prev, monthlyTarget: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label htmlFor="goal-date">Target Date</label>
              <input
                id="goal-date"
                type="date"
                value={newGoal.targetDate}
                onChange={e => setNewGoal(prev => ({ ...prev, targetDate: e.target.value }))}
              />
            </div>
          </div>
          <div className="form-actions">
            <button type="submit" className="btn btn--primary">Create Goal</button>
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => setShowAddForm(false)}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Goal Cards Grid */}
      <div className="goals-grid">
        {goals.map(goal => {
          const pct = Math.min(100, Math.round((Number(goal.current_amount || 0) / Number(goal.target_amount || 1)) * 100));
          return (
            <div key={goal.id} className="goal-card">
              <div className="goal-card__header">
                <div>
                  <h4 className="goal-card__title">{goal.name}</h4>
                  {goal.target_date && (
                    <span className="goal-card__date">
                      <Calendar size={12} /> Target: {new Date(goal.target_date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                    </span>
                  )}
                </div>
                <button
                  className="btn btn--icon btn--danger"
                  onClick={() => handleDeleteGoal(goal.id)}
                  title="Delete Goal"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              {/* Circular Progress & Details Layout */}
              <div className="goal-progress-layout">
                <div className="goal-ring-wrapper">
                  <svg className="circular-chart" viewBox="0 0 36 36">
                    <path
                      className="circular-bg"
                      d="M18 2.0845
                        a 15.9155 15.9155 0 0 1 0 31.831
                        a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                    <path
                      className="circular-fill"
                      strokeDasharray={`${pct}, 100`}
                      d="M18 2.0845
                        a 15.9155 15.9155 0 0 1 0 31.831
                        a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                  </svg>
                  <div className="goal-ring-content">
                    <span className="goal-ring-percent">{pct}%</span>
                  </div>
                </div>

                <div className="goal-stats-column">
                  <div className="goal-stat-main">
                    <strong>{formatCurrency(goal.current_amount)}</strong>
                    <span className="goal-stat-sub">of {formatCurrency(goal.target_amount)}</span>
                  </div>

                  {/* Extra Details */}
                  <div className="goal-details-row">
                    {Number(goal.monthly_target || 0) > 0 && (
                      <div className="goal-detail-item">
                        <span className="goal-detail-label">Monthly Target</span>
                        <span className="goal-detail-value">{formatCurrency(goal.monthly_target)}</span>
                      </div>
                    )}
                    <div className="goal-detail-item">
                      <span className="goal-detail-label">Remaining</span>
                      <span className="goal-detail-value text-negative">
                        {formatCurrency(Math.max(0, Number(goal.target_amount || 0) - Number(goal.current_amount || 0)))}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Deposit/Withdrawal Adjustments */}
              <div className="goal-card__actions">
                {/* Quick Add Chips */}
                <div className="goal-quick-chips">
                  <span className="quick-chip-label">Quick Save:</span>
                  <button type="button" className="quick-chip" onClick={() => handleAdjustSavings(goal, true, 100)}>+ ₹100</button>
                  <button type="button" className="quick-chip" onClick={() => handleAdjustSavings(goal, true, 500)}>+ ₹500</button>
                  <button type="button" className="quick-chip" onClick={() => handleAdjustSavings(goal, true, 1000)}>+ ₹1k</button>
                  <button type="button" className="quick-chip" onClick={() => handleAdjustSavings(goal, true, 5000)}>+ ₹5k</button>
                </div>

                <div className="goal-adjust-row">
                  <div className="goal-adjust-input-wrapper">
                    <span className="goal-adjust-symbol">₹</span>
                    <input
                      type="number"
                      min="1"
                      placeholder="Amount"
                      value={adjustments[goal.id] || ''}
                      onChange={(e) => handleAdjustmentChange(goal.id, e.target.value)}
                      className="goal-adjust-input"
                    />
                  </div>
                  <div className="goal-adjust-buttons">
                    <button
                      className="btn btn--sm btn--primary"
                      onClick={() => handleAdjustSavings(goal, true)}
                      disabled={!adjustments[goal.id]}
                    >
                      Save
                    </button>
                    <button
                      className="btn btn--sm btn--ghost"
                      onClick={() => handleAdjustSavings(goal, false)}
                      disabled={!adjustments[goal.id]}
                    >
                      Withdraw
                    </button>
                  </div>
                </div>

                {/* Link to Ledger Toggle */}
                <div className="goal-ledger-link">
                  <label className="checkbox-label" style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                    <input 
                      type="checkbox"
                      checked={(linkOptions[goal.id] || {}).linked || false}
                      onChange={(e) => handleLinkChange(goal.id, 'linked', e.target.checked)}
                      style={{ cursor: 'pointer', accentColor: 'var(--primary)' }}
                    />
                    <span className="checkbox-text" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Sync with Ledger</span>
                  </label>
                  {(linkOptions[goal.id] || {}).linked && (
                    <select
                      className="goal-account-select"
                      value={(linkOptions[goal.id] || {}).account || (accounts?.[0]?.name || 'HDFC')}
                      onChange={(e) => handleLinkChange(goal.id, 'account', e.target.value)}
                    >
                      {accounts?.map(acc => (
                        <option key={acc.name} value={acc.name}>{acc.name}</option>
                      )) || <option value="HDFC">HDFC</option>}
                    </select>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {goals.length === 0 && (
          <div className="stats-empty" style={{ gridColumn: '1 / -1', width: '100%' }}>
            <h3>No Savings Goals Active</h3>
            <p>Define targets to start budgeting, tracking savings, and logging monthly commitments.</p>
          </div>
        )}
      </div>
    </div>
  );
}
