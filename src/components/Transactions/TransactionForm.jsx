import { useState, useEffect, useRef } from 'react';
import { Plus, Minus, Send, Tag, Save } from 'lucide-react';
import { CATEGORIES } from '../../utils/constants';
import { getTodayStr } from '../../utils/formatters';
import { evaluateMath } from '../../utils/mathParser';
import { supabase } from '../../supabaseClient';

const ACCOUNT_NAMES = ['HDFC', 'SBI', 'Wallet'];

const DEFAULT_TEMPLATES = [
  { name: '🚌 Bus Ticket', amount: 40, category: 'Transportation', account: 'Wallet', note: 'Bus Ticket' },
  { name: '☕ Tea', amount: 15, category: 'Food & Dining', account: 'Wallet', note: 'Tea' },
  { name: '🍽️ Lunch', amount: 120, category: 'Food & Dining', account: 'HDFC', note: 'Lunch' }
];

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
  const [templates, setTemplates] = useState([]);
  
  const amountRef = useRef(null);
  const formRef = useRef(null);

  // Fetch / Seed Templates from Supabase
  const fetchTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('quick_templates')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching templates:', error);
        return;
      }

      if (data && data.length > 0) {
        // Map legacy category names if any (e.g. 'Transport' -> 'Transportation')
        const mapped = data.map(t => ({
          ...t,
          category: t.category === 'Transport' ? 'Transportation' : (t.category === 'Food' ? 'Food & Dining' : t.category)
        }));
        setTemplates(mapped);
      } else {
        // If user has no templates in Supabase, seed default templates
        const { error: seedError } = await supabase
          .from('quick_templates')
          .insert(DEFAULT_TEMPLATES);

        if (!seedError) {
          // Re-fetch to get them with database IDs
          const { data: seededData } = await supabase
            .from('quick_templates')
            .select('*')
            .order('created_at', { ascending: true });
          
          const mappedSeeded = (seededData || []).map(t => ({
            ...t,
            category: t.category === 'Transport' ? 'Transportation' : (t.category === 'Food' ? 'Food & Dining' : t.category)
          }));
          setTemplates(mappedSeeded);
        } else {
          // Fallback to offline defaults if insert fails (e.g. policy block)
          setTemplates(DEFAULT_TEMPLATES);
        }
      }
    } catch (err) {
      console.error('Failed to load templates:', err);
      setTemplates(DEFAULT_TEMPLATES);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  // Listen to keyboard shortcut focus event
  useEffect(() => {
    const handleFocusAmount = () => {
      if (amountRef.current) {
        amountRef.current.focus();
        amountRef.current.select();
      }
    };
    window.addEventListener('focus-amount', handleFocusAmount);
    return () => window.removeEventListener('focus-amount', handleFocusAmount);
  }, []);

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleAmountBlur = () => {
    // Attempt evaluation of math expressions
    const rawVal = form.amount;
    if (rawVal && (rawVal.includes('+') || rawVal.includes('-') || rawVal.includes('*') || rawVal.includes('/'))) {
      const parsed = evaluateMath(rawVal);
      if (parsed !== null) {
        handleChange('amount', parsed.toString());
      }
    }
  };

  const handleKeyDown = (e) => {
    // Ctrl + Enter to submit form
    if (e.ctrlKey && e.key === 'Enter') {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    
    // Evaluate math one last time in case they submitted before bluring
    let finalAmount = form.amount;
    if (finalAmount && (finalAmount.includes('+') || finalAmount.includes('-') || finalAmount.includes('*') || finalAmount.includes('/'))) {
      const parsed = evaluateMath(finalAmount);
      if (parsed !== null) {
        finalAmount = parsed.toString();
      }
    }

    if (!finalAmount || Number(finalAmount) <= 0) return;
    if (!form.account) return;

    setSubmitting(true);
    try {
      const amountVal = isExpense ? -Math.abs(Number(finalAmount)) : Math.abs(Number(finalAmount));
      await onAdd({
        ...form,
        amount: amountVal,
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

  const handleApplyTemplate = (tpl) => {
    const mappedCategory = tpl.category === 'Transport' 
      ? 'Transportation' 
      : (tpl.category === 'Food' ? 'Food & Dining' : tpl.category);

    setForm(prev => ({
      ...prev,
      amount: tpl.amount ? tpl.amount.toString() : '',
      category: mappedCategory || CATEGORIES[0],
      account: tpl.account || 'HDFC',
      note: tpl.note || '',
    }));
    
    // Autofocus amount after choosing template
    if (amountRef.current) {
      amountRef.current.focus();
    }
  };

  const handleSaveAsTemplate = async () => {
    if (!form.note) {
      alert('Please enter a note/description to save as a template.');
      return;
    }

    const tplName = prompt('Enter a label/icon for this template:', `🚌 ${form.note}`);
    if (!tplName) return;

    try {
      const { error } = await supabase
        .from('quick_templates')
        .insert({
          name: tplName,
          amount: form.amount ? Number(form.amount) : null,
          category: form.category,
          account: form.account,
          note: form.note,
        });

      if (error) {
        console.error('Error saving template:', error);
        alert('Failed to save template to database.');
      } else {
        await fetchTemplates();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteTemplate = async (e, id) => {
    e.stopPropagation(); // prevent applying template
    if (confirm('Delete this template?')) {
      try {
        const { error } = await supabase
          .from('quick_templates')
          .delete()
          .eq('id', id);

        if (error) {
          console.error('Error deleting template:', error);
          alert('Failed to delete template.');
        } else {
          setTemplates(prev => prev.filter(t => t.id !== id));
        }
      } catch (err) {
        console.error(err);
      }
    }
  };

  return (
    <div className="transaction-form-wrapper">
      {/* Quick Templates Bar */}
      <div className="quick-templates-section">
        <span className="templates-label"><Tag size={12} /> Templates:</span>
        <div className="templates-list">
          {templates.map(tpl => (
            <button
              key={tpl.id}
              type="button"
              className="template-btn"
              onClick={() => handleApplyTemplate(tpl)}
              title={`Load template. Right-click or press X to delete.`}
            >
              <span>{tpl.name}</span>
              <span className="template-btn__delete" onClick={(e) => handleDeleteTemplate(e, tpl.id)}>×</span>
            </button>
          ))}
        </div>
      </div>

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

      <form ref={formRef} onSubmit={handleSubmit} onKeyDown={handleKeyDown} className="transaction-form">
        <div className="transaction-form__fields">
          <div className="form-group form-group--amount">
            <label htmlFor="txn-amount">Amount (₹)</label>
            <input
              id="txn-amount"
              ref={amountRef}
              type="text"
              placeholder="0.00"
              value={form.amount}
              onChange={e => handleChange('amount', e.target.value)}
              onBlur={handleAmountBlur}
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
              {ACCOUNT_NAMES.map(name => (
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

        <div className="form-submit-row">
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
                Save {isExpense ? 'Expense' : 'Income'} <span className="btn-key-tip">[Ctrl+Enter]</span>
              </>
            )}
          </button>
          
          <button
            type="button"
            className="btn btn--ghost btn--icon-text"
            onClick={handleSaveAsTemplate}
            title="Save current details as a template"
          >
            <Save size={16} /> Save as Template
          </button>
        </div>
      </form>
    </div>
  );
}
