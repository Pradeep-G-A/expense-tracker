import { useState, useCallback, useMemo, useEffect } from 'react';
import { Plus, X, List, BarChart2, Target, Settings } from 'lucide-react';
import { ThemeProvider } from './context/ThemeContext';
import { useAuth } from './hooks/useAuth';
import { useTransactions } from './hooks/useTransactions';
import { useAccounts } from './hooks/useAccounts';
import LoginForm from './components/Auth/LoginForm';
import Header from './components/Layout/Header';
import AccountCards from './components/Accounts/AccountCards';
import TransactionForm from './components/Transactions/TransactionForm';
import TransactionTable from './components/Transactions/TransactionTable';
import StatisticsView from './components/Statistics/StatisticsView';
import FilterBar from './components/Transactions/FilterBar';
import SavingsGoalsView from './components/Goals/SavingsGoalsView';
import Toast from './components/common/Toast';

function AppContent() {
  const { user, loading: authLoading, error: authError, signIn, signUp, signOut, setError } = useAuth();
  const {
    transactions,
    loading: txnLoading,
    isOnline,
    syncing,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    reorderTransactions,
  } = useTransactions(user);
  const { accounts, loading: accLoading } = useAccounts(transactions, user);

  const [activeLedger, setActiveLedger] = useState(1);
  const [activeTab, setActiveTab] = useState('transactions');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [filters, setFilters] = useState({
    account: 'all',
    category: 'all',
    dateFrom: '',
    dateTo: '',
    search: '',
  });

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      // Check if an input field is currently focused
      const activeEl = document.activeElement;
      const isInputActive = activeEl && (
        activeEl.tagName === 'INPUT' || 
        activeEl.tagName === 'SELECT' || 
        activeEl.tagName === 'TEXTAREA' || 
        activeEl.isContentEditable
      );

      // 1. Tab Switching (Alt + 1 / Alt + 2 / Alt + 3)
      if (e.altKey && (e.key === '1' || e.key === '2' || e.key === '3')) {
        e.preventDefault();
        if (e.key === '1') setActiveTab('transactions');
        if (e.key === '2') setActiveTab('statistics');
        if (e.key === '3') setActiveTab('goals');
        return;
      }

      // If typing in an input, don't trigger general shortcuts (N, F)
      if (isInputActive) return;

      // 2. Focus Amount (N)
      if (e.key.toLowerCase() === 'n') {
        e.preventDefault();
        setActiveTab('transactions');
        // Give a tiny timeout for tab state to flush, then dispatch focus
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('focus-amount'));
        }, 50);
      }

      // 3. Focus Search (F)
      if (e.key.toLowerCase() === 'f') {
        e.preventDefault();
        setActiveTab('transactions');
        // Give a tiny timeout for tab state to flush, then dispatch focus
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('focus-search'));
        }, 50);
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  const filteredTransactions = useMemo(() => {
    let result = [...transactions];

    if (filters.account && filters.account !== 'all') {
      result = result.filter(t => t.account === filters.account);
    }
    if (filters.category && filters.category !== 'all') {
      result = result.filter(t => t.category === filters.category);
    }
    if (filters.dateFrom) {
      result = result.filter(t => t.date >= filters.dateFrom);
    }
    if (filters.dateTo) {
      result = result.filter(t => t.date <= filters.dateTo);
    }
    if (filters.search) {
      const q = filters.search.toLowerCase();
      result = result.filter(t =>
        (t.note && t.note.toLowerCase().includes(q)) ||
        t.category.toLowerCase().includes(q) ||
        t.account.toLowerCase().includes(q)
      );
    }

    return result;
  }, [transactions, filters]);

  const showToast = useCallback((message, type = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const handleAdd = async (data) => {
    try {
      await addTransaction(data);
      showToast('Transaction added successfully');
    } catch {
      showToast('Failed to add transaction', 'error');
    }
  };

  const handleUpdate = async (id, data) => {
    try {
      await updateTransaction(id, data);
      showToast('Transaction updated');
    } catch {
      showToast('Failed to update transaction', 'error');
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteTransaction(id);
      showToast('Transaction deleted');
    } catch {
      showToast('Failed to delete transaction', 'error');
    }
  };

  if (authLoading) {
    return (
      <div className="app-loading">
        <div className="spinner spinner--lg" />
        <p>Loading...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <LoginForm
        onSignIn={signIn}
        onSignUp={signUp}
        error={authError}
        setError={setError}
      />
    );
  }

  return (
    <div className="app">
      <Header 
        user={user} 
        onSignOut={signOut} 
        activeLedger={activeLedger} 
        onToggleLedger={() => setActiveLedger(prev => prev === 1 ? 2 : 1)} 
      />

      {!isOnline && (
        <div className="offline-banner">
          <span>Offline Mode: New transactions are saved locally and will auto-sync when online.</span>
        </div>
      )}

      {syncing && (
        <div className="sync-banner">
          <span className="spinner spinner--sm"></span>
          <span>Syncing with Supabase...</span>
        </div>
      )}

      <main className="main">
        <div className="tabs">
          <button 
            className={`tab-btn ${activeTab === 'transactions' ? 'tab-btn--active' : ''}`}
            onClick={() => setActiveTab('transactions')}
            title="Shortcut: Alt+1"
          >
            Transactions
          </button>
          <button 
            className={`tab-btn ${activeTab === 'statistics' ? 'tab-btn--active' : ''}`}
            onClick={() => setActiveTab('statistics')}
            title="Shortcut: Alt+2"
          >
            Statistics
          </button>
          <button 
            className={`tab-btn ${activeTab === 'goals' ? 'tab-btn--active' : ''}`}
            onClick={() => setActiveTab('goals')}
            title="Shortcut: Alt+3"
          >
            Savings Goals
          </button>
        </div>

        {activeTab === 'transactions' && (
          <>
            <AccountCards accounts={accounts} loading={accLoading} txnLoading={txnLoading} activeLedger={activeLedger} transactions={transactions} />
            
            <div className="transaction-form-desktop">
              <TransactionForm accounts={accounts} onAdd={handleAdd} />
            </div>

            <FilterBar
              accounts={accounts}
              filters={filters}
              onFilterChange={setFilters}
            />
            <TransactionTable
              transactions={transactions}
              filteredTransactions={filteredTransactions}
              accounts={accounts}
              loading={txnLoading}
              onUpdate={handleUpdate}
              onDelete={handleDelete}
              onReorder={reorderTransactions}
              activeLedger={activeLedger}
            />
          </>
        )}

        {activeTab === 'statistics' && (
          <>
            <FilterBar
              accounts={accounts}
              filters={filters}
              onFilterChange={setFilters}
            />
            <StatisticsView
              transactions={filteredTransactions}
              filters={filters}
              onFilterChange={setFilters}
              onNavigate={() => setActiveTab('transactions')}
            />
          </>
        )}

        {activeTab === 'goals' && (
          <SavingsGoalsView accounts={accounts} onAddTransaction={handleAdd} />
        )}

        {activeTab === 'settings' && (
          <div className="settings-view" style={{ padding: '20px', paddingBottom: '40px' }}>
            <h2 className="section-title" style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Settings size={24} /> Settings & Profile
            </h2>
            
            <div className="settings-section" style={{ background: 'var(--bg-card)', padding: '20px', borderRadius: '16px', marginBottom: '32px', border: '1px solid var(--border-color)', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
              <h3 style={{ marginTop: 0, marginBottom: '16px', fontSize: '1.1rem', color: 'var(--text-primary)' }}>Active Ledger</h3>
              <div className="ledger-toggle-wrapper" style={{ display: 'flex', width: '100%' }}>
                <button 
                  className={`ledger-toggle-btn ${activeLedger === 1 ? 'ledger-toggle-btn--active' : ''}`}
                  onClick={() => setActiveLedger(1)}
                  style={{ flex: 1, padding: '12px', fontSize: '1rem' }}
                >
                  Ledger 1
                </button>
                <button 
                  className={`ledger-toggle-btn ${activeLedger === 2 ? 'ledger-toggle-btn--active' : ''}`}
                  onClick={() => setActiveLedger(2)}
                  style={{ flex: 1, padding: '12px', fontSize: '1rem' }}
                >
                  Ledger 2
                </button>
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '12px', marginBottom: 0 }}>
                Switching ledgers dynamically updates all balances and transaction history across the app.
              </p>
            </div>

            <h2 className="section-title" style={{ marginBottom: '16px' }}>Dashboard Summary</h2>
            <div className="settings-dashboard-override">
              <AccountCards accounts={accounts} loading={accLoading} txnLoading={txnLoading} activeLedger={activeLedger} transactions={transactions} />
            </div>
          </div>
        )}
      </main>

      {/* Global Transaction Modal - Opens from any tab! */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setIsModalOpen(false)}>
              <X size={20} />
            </button>
            <TransactionForm accounts={accounts} onAdd={(data) => {
              handleAdd(data);
              setIsModalOpen(false);
            }} />
          </div>
        </div>
      )}

      <div className="toast-container">
        {toasts.map(toast => (
          <Toast
            key={toast.id}
            message={toast.message}
            type={toast.type}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </div>

      <nav className="bottom-nav">
        <button 
          className={`bottom-nav__item ${activeTab === 'transactions' ? 'bottom-nav__item--active' : ''}`} 
          onClick={() => setActiveTab('transactions')}
        >
          <List size={22} />
          <span>Txns</span>
        </button>
        <button 
          className={`bottom-nav__item ${activeTab === 'statistics' ? 'bottom-nav__item--active' : ''}`} 
          onClick={() => setActiveTab('statistics')}
        >
          <BarChart2 size={22} />
          <span>Stats</span>
        </button>
        
        <div className="bottom-nav__fab-wrapper">
          <button className="bottom-nav__fab" onClick={() => setIsModalOpen(true)}>
            <Plus size={28} />
          </button>
        </div>

        <button 
          className={`bottom-nav__item ${activeTab === 'goals' ? 'bottom-nav__item--active' : ''}`} 
          onClick={() => setActiveTab('goals')}
        >
          <Target size={22} />
          <span>Goals</span>
        </button>
        <button 
          className={`bottom-nav__item ${activeTab === 'settings' ? 'bottom-nav__item--active' : ''}`} 
          onClick={() => setActiveTab('settings')}
        >
          <Settings size={22} />
          <span>Settings</span>
        </button>
      </nav>
    </div>
  );
}

export default function App() {
  useEffect(() => {
    const splash = document.getElementById('splash-screen');
    if (splash) {
      splash.classList.add('splash-screen--fade-out');
      const timer = setTimeout(() => splash.remove(), 400);
      return () => clearTimeout(timer);
    }
  }, []);

  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}
