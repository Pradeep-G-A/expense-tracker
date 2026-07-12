import { useState } from 'react';
import { Plus, Minus, Send } from 'lucide-react';
import { CATEGORIES } from '../../utils/constants';
import { getTodayStr } from '../../utils/formatters';

const ACCOUNT_NAMES = ['HDFC', 'SBI', 'Wallet'];

export default function TransactionForm({ accounts, onAdd }) {
  const [isExpense, setIsExpense] = useState(true);
  const [form, setForm] = useState({
    amount: '',
    category: CATEGORIES[0],
    account: 'HDFC',
    date: getTodayStr(),
    time: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
    note: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const accountNames = ACCOUNT_NAMES;

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.amount || Number(form.amount) <= 0) return;
    if (!form.account) return;

    setSubmitting(true);
    try {
      const amount = isExpense ? -Math.abs(Number(form.amount)) : Math.abs(Number(form.amount));
      await onAdd({
        ...form,
        amount,
      });
      setForm({
        amount: '',
        category: CATEGORIES[0],
        account: form.account,
        date: getTodayStr(),
        time: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
        note: '',
      });
    } catch (err) {
      console.error('Failed to add transaction:', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="transaction-form-wrapper">
      <div className="transaction-form__header">
        <h2 className="section-title">Add Transaction</h2>
      </div>

      <div className="transaction-type-toggle">
        <button
          type="button"
          className={`type-btn type-btn--expense ${isExpense ? 'type-btn--active' : ''}`}
          onClick={() => setIsExpense(true)}
        >
          <Minus size={16} /> Expense
        </button>
        <button
          type="button"
          className={`type-btn type-btn--income ${!isExpense ? 'type-btn--active' : ''}`}
          onClick={() => setIsExpense(false)}
        >
          <Plus size={16} /> Income
        </button>
      </div>

      <form onSubmit={handleSubmit} className="transaction-form">
        <div className="transaction-form__fields">
          <div className="form-group form-group--amount">
            <label htmlFor="txn-amount">Amount (₹)</label>
            <input
              id="txn-amount"
              type="number"
              step="0.01"
              min="0.01"
              placeholder="0.00"
              value={form.amount}
              onChange={e => handleChange('amount', e.target.value)}
              required
              className="input--amount"
            />
          </div>

          <div className="form-group">
            <label htmlFor="txn-account">Account</label>
            <select
              id="txn-account"
              value={form.account}
              onChange={e => handleChange('account', e.target.value)}
              required
            >
              {accountNames.map(name => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="txn-category">Category</label>
            <select
              id="txn-category"
              value={form.category}
              onChange={e => handleChange('category', e.target.value)}
              required
            >
              {CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div className="form-group-row">
            <div className="form-group">
              <label htmlFor="txn-date">Date</label>
              <input
                id="txn-date"
                type="date"
                value={form.date}
                onChange={e => handleChange('date', e.target.value)}
                required
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="txn-time">Time</label>
              <input
                id="txn-time"
                type="time"
                value={form.time}
                onChange={e => handleChange('time', e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group form-group--note">
            <label htmlFor="txn-note">Note</label>
            <input
              id="txn-note"
              type="text"
              placeholder="Short note..."
              value={form.note}
              onChange={e => handleChange('note', e.target.value)}
              maxLength={100}
            />
          </div>
        </div>

        <button
          type="submit"
          className={`btn btn--submit ${isExpense ? 'btn--expense' : 'btn--income'}`}
          disabled={submitting || !form.amount || !form.account}
        >
          {submitting ? (
            <span className="spinner" />
          ) : (
            <>
              <Send size={16} />
              Save {isExpense ? 'Expense' : 'Income'}
            </>
          )}
        </button>
      </form>
    </div>
  );
}
