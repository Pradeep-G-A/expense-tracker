import { useState, useCallback, useMemo, useEffect } from 'react';
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
            <TransactionForm accounts={accounts} onAdd={handleAdd} />
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
          <SavingsGoalsView />
        )}
      </main>

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
