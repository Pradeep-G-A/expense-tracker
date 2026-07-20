import { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Settings, Database, Download, Tag, Sliders,
  Plus, Trash2, Eye, EyeOff, Save, CheckCircle, Moon, Sun, Monitor, X, Edit2
} from 'lucide-react';
import { supabase } from '../../supabaseClient';
import { CURRENCIES, CATEGORIES } from '../../utils/constants';
import { INCOME_CATEGORIES } from '../../utils/constants';

const THEME_OPTIONS = [
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'system', label: 'System', icon: Monitor },
];

export default function SettingsView({
  accounts,
  transactions,
  activeLedger,
  settings,
  onSignOut,
}) {
  const {
    currency, setCurrency,
    themePref, setThemePref,
    chipAmounts, setChipAmounts,
    hiddenCategories, toggleCategoryVisibility,
    customCategories, addCustomCategory, removeCustomCategory,
    allCategories,
  } = settings;

  // ── Account Balances State ──
  const [balanceEdits, setBalanceEdits] = useState(() =>
    Object.fromEntries(accounts.map(a => [a.name, {
      initial_balance_1: a.initial_balance_1,
      initial_balance_2: a.initial_balance_2,
    }]))
  );
  const [savingBalances, setSavingBalances] = useState({});
  const [balanceSaved, setBalanceSaved] = useState({});
  const [isBalanceModalOpen, setIsBalanceModalOpen] = useState(false);

  // ── Chip Config State ──
  const [chipEdits, setChipEdits] = useState([...chipAmounts]);

  // ── New Category State ──
  const [newCategoryInput, setNewCategoryInput] = useState('');

  // ── CSV Export ──
  const handleExportCSV = () => {
    const headers = ['Date', 'Time', 'Account', 'Category', 'Amount', 'Type', 'Note'];
    const rows = transactions.map(t => {
      // Split YYYY-MM-DD to DD/MM/YYYY for better Excel compatibility
      const parts = t.date.split('-');
      const formattedDate = parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : t.date;
      return [
        `"${formattedDate}"`,
        `"${t.time || ''}"`,
        `"${t.account}"`,
        `"${t.category}"`,
        Math.abs(Number(t.amount)).toFixed(2),
        `"${Number(t.amount) >= 0 ? 'Income' : 'Expense'}"`,
        `"${(t.note || '').replace(/"/g, '""')}"`,
      ];
    });
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transactions_ledger${activeLedger}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Save Account Balances ──
  const [confirmingBalance, setConfirmingBalance] = useState({});

  const handleSaveBalance = async (accountName) => {
    if (!confirmingBalance[accountName]) {
      setConfirmingBalance(prev => ({ ...prev, [accountName]: true }));
      setTimeout(() => setConfirmingBalance(prev => ({ ...prev, [accountName]: false })), 3000);
      return;
    }

    setConfirmingBalance(prev => ({ ...prev, [accountName]: false }));
    setSavingBalances(prev => ({ ...prev, [accountName]: true }));
    const edit = balanceEdits[accountName];
    const { error } = await supabase
      .from('accounts')
      .update({
        initial_balance_1: Number(edit.initial_balance_1),
        initial_balance_2: Number(edit.initial_balance_2),
      })
      .eq('name', accountName);

    setSavingBalances(prev => ({ ...prev, [accountName]: false }));
    if (!error) {
      setBalanceSaved(prev => ({ ...prev, [accountName]: true }));
      setTimeout(() => setBalanceSaved(prev => ({ ...prev, [accountName]: false })), 2000);
    }
  };

  // ── Save Chip Amounts ──
  const handleSaveChips = () => {
    const parsed = chipEdits.map(v => Number(v)).filter(v => v > 0);
    setChipAmounts(parsed);
  };

  return (
    <div className="settings-view">
      <h2 className="section-title" style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Settings size={22} /> Settings & Preferences
      </h2>

      {/* ── 1. ACCOUNT BALANCE EDITOR ── */}
      <div className="settings-card">
        <div className="settings-card__header">
          <Database size={18} />
          <h3>Account Starting Balances</h3>
        </div>
        <p className="settings-card__desc">
          Set the opening balance for each account per ledger. This is the baseline for your running balance calculations.
        </p>
        <button
          className="settings-export-btn"
          onClick={() => setIsBalanceModalOpen(true)}
        >
          <Edit2 size={16} />
          Edit Balances
        </button>

        {isBalanceModalOpen && createPortal(
          <div className="modal-overlay" onClick={() => setIsBalanceModalOpen(false)}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
              <div className="modal-header" style={{ padding: '12px 16px' }}>
                <h2 style={{ fontSize: '1.1rem', color: 'var(--text-primary)', margin: 0 }}>Edit Balances</h2>
                <button className="btn--icon" onClick={() => setIsBalanceModalOpen(false)}>
                  <X size={18} />
                </button>
              </div>
              <div className="modal-body" style={{ padding: '12px', maxHeight: '50vh', overflowY: 'auto' }}>
                <div className="settings-balance-list" style={{ gap: '8px' }}>
                {accounts.map(account => (
                  <div key={account.name} className="settings-balance-row">
                    <div className="settings-balance-name">{account.name}</div>
                    <div className="settings-balance-inputs">
                      <div className="settings-input-group">
                        <label>Ledger 1</label>
                        <input
                          type="number"
                          value={balanceEdits[account.name]?.initial_balance_1 ?? account.initial_balance_1}
                          onChange={e => setBalanceEdits(prev => ({
                            ...prev,
                            [account.name]: { ...prev[account.name], initial_balance_1: e.target.value }
                          }))}
                          className="settings-input"
                        />
                      </div>
                      <div className="settings-input-group">
                        <label>Ledger 2</label>
                        <input
                          type="number"
                          value={balanceEdits[account.name]?.initial_balance_2 ?? account.initial_balance_2}
                          onChange={e => setBalanceEdits(prev => ({
                            ...prev,
                            [account.name]: { ...prev[account.name], initial_balance_2: e.target.value }
                          }))}
                          className="settings-input"
                        />
                      </div>
                      <button
                        className={`settings-save-btn ${balanceSaved[account.name] ? 'settings-save-btn--saved' : confirmingBalance[account.name] ? 'settings-save-btn--confirm' : ''}`}
                        onClick={() => handleSaveBalance(account.name)}
                        disabled={savingBalances[account.name]}
                      >
                        {balanceSaved[account.name]
                          ? <><CheckCircle size={14} /> Saved!</>
                          : savingBalances[account.name]
                            ? 'Saving...'
                            : confirmingBalance[account.name]
                              ? 'Sure? (Save)'
                              : <><Save size={14} /> Save</>
                        }
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
      </div>

      {/* ── 2. CSV EXPORT ── */}
      <div className="settings-card">
        <div className="settings-card__header">
          <Download size={18} />
          <h3>Backup & Export</h3>
        </div>
        <p className="settings-card__desc">
          Download all your transactions as a CSV file — perfect for Excel, Google Sheets, or your accountant.
        </p>
        <div className="settings-export-info">
          <span>{transactions.length} transactions</span>
          <span>·</span>
          <span>Ledger {activeLedger} active</span>
        </div>
        <button className="settings-export-btn" onClick={handleExportCSV}>
          <Download size={16} />
          Download CSV
        </button>
      </div>

      {/* ── 3. CATEGORY MANAGER ── */}
      <div className="settings-card">
        <div className="settings-card__header">
          <Tag size={18} />
          <h3>Category Manager</h3>
        </div>
        <p className="settings-card__desc">
          Toggle categories on/off or add your own custom ones. Hidden categories won't appear in the transaction form.
        </p>

        <div className="settings-category-grid">
          {allCategories.map(cat => {
            const isHidden = hiddenCategories.includes(cat);
            const isCustom = customCategories.includes(cat);
            return (
              <div key={cat} className={`settings-category-chip ${isHidden ? 'settings-category-chip--hidden' : ''}`}>
                <span>{cat}</span>
                <div className="settings-category-actions">
                  <button
                    className="settings-icon-btn"
                    onClick={() => toggleCategoryVisibility(cat)}
                    title={isHidden ? 'Show category' : 'Hide category'}
                  >
                    {isHidden ? <EyeOff size={13} /> : <Eye size={13} />}
                  </button>
                  {isCustom && (
                    <button
                      className="settings-icon-btn settings-icon-btn--danger"
                      onClick={() => removeCustomCategory(cat)}
                      title="Delete custom category"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="settings-add-category">
          <input
            type="text"
            placeholder="New category name..."
            value={newCategoryInput}
            onChange={e => setNewCategoryInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && newCategoryInput.trim()) {
                addCustomCategory(newCategoryInput);
                setNewCategoryInput('');
              }
            }}
            className="settings-input"
          />
          <button
            className="settings-add-btn"
            onClick={() => {
              addCustomCategory(newCategoryInput);
              setNewCategoryInput('');
            }}
            disabled={!newCategoryInput.trim()}
          >
            <Plus size={16} /> Add
          </button>
        </div>
      </div>

      {/* ── 4. APP PREFERENCES ── */}
      <div className="settings-card">
        <div className="settings-card__header">
          <Sliders size={18} />
          <h3>App Preferences</h3>
        </div>

        {/* Theme */}
        <div className="settings-pref-group">
          <label className="settings-pref-label">Theme</label>
          <div className="settings-theme-selector">
            {THEME_OPTIONS.map(opt => {
              const Icon = opt.icon;
              return (
                <button
                  key={opt.value}
                  className={`settings-theme-btn ${themePref === opt.value ? 'settings-theme-btn--active' : ''}`}
                  onClick={() => setThemePref(opt.value)}
                >
                  <Icon size={16} />
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Currency */}
        <div className="settings-pref-group">
          <label className="settings-pref-label">Currency</label>
          <select
            className="settings-select"
            value={currency}
            onChange={e => setCurrency(e.target.value)}
          >
            {CURRENCIES.map(c => (
              <option key={c.code} value={c.code}>{c.label}</option>
            ))}
          </select>
          <span className="settings-pref-hint">Changes affect all amounts across the app after reload.</span>
        </div>

        {/* Quick-Save Chips */}
        <div className="settings-pref-group">
          <label className="settings-pref-label">Quick-Save Chip Amounts</label>
          <div className="settings-chip-config">
            {chipEdits.map((val, i) => (
              <input
                key={i}
                type="number"
                min="1"
                value={val}
                onChange={e => {
                  const next = [...chipEdits];
                  next[i] = e.target.value;
                  setChipEdits(next);
                }}
                className="settings-input settings-chip-input"
              />
            ))}
            <button className="settings-add-btn" onClick={handleSaveChips}>
              <Save size={14} /> Apply
            </button>
          </div>
          <span className="settings-pref-hint">These appear as quick-tap buttons on your Savings Goals cards.</span>
        </div>
      </div>

      {/* ── Active Ledger ── */}
      <div className="settings-card" style={{ display: 'none' }} id="ledger-section-placeholder" />
    </div>
  );
}
