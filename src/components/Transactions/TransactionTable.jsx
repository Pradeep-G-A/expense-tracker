import React, { useState, useMemo } from 'react';
import TransactionRow from './TransactionRow';
import TransactionModal from './TransactionModal';
import { Receipt, CreditCard, Building2, WalletCards } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';

const ACCOUNT_ICONS = {
  HDFC: CreditCard,
  SBI: Building2,
  Wallet: WalletCards,
};

export default function TransactionTable({
  transactions,
  filteredTransactions,
  accounts,
  loading,
  onUpdate,
  onDelete,
  activeLedger,
}) {
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [viewingTransactionId, setViewingTransactionId] = useState(null);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString(undefined, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const sortedTransactions = useMemo(() => {
    let result = [...filteredTransactions];

    if (sortConfig.key) {
      result.sort((a, b) => {
        let aVal = a[sortConfig.key];
        let bVal = b[sortConfig.key];

        if (sortConfig.key === 'amount') {
          aVal = Number(aVal);
          bVal = Number(bVal);
        } else if (sortConfig.key === 'date') {
          aVal = new Date(aVal);
          bVal = new Date(bVal);
        } else {
          aVal = String(aVal || '').toLowerCase();
          bVal = String(bVal || '').toLowerCase();
        }

        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [filteredTransactions, sortConfig]);

  const runningBalanceMap = useMemo(() => {
    const map = {};
    const balances = {};
    accounts.forEach(a => {
      balances[a.name] = activeLedger === 1 ? Number(a.initial_balance_1) : Number(a.initial_balance_2);
    });

    const chronologicalTxns = [...transactions].sort((a, b) => {
      const dateDiff = new Date(a.date) - new Date(b.date);
      if (dateDiff !== 0) return dateDiff;
      const timeA = a.time || '00:00:00';
      const timeB = b.time || '00:00:00';
      return timeA.localeCompare(timeB);
    });

    chronologicalTxns.forEach(t => {
      const acct = t.account;
      if (balances[acct] === undefined) {
        balances[acct] = 0;
      }
      balances[acct] += Number(t.amount);
      map[t.id] = balances[acct];
    });

    return map;
  }, [transactions, accounts, activeLedger]);

  const dailyTotalsMap = useMemo(() => {
    const totals = {};
    sortedTransactions.forEach(t => {
      const date = t.date;
      if (!totals[date]) {
        totals[date] = { income: 0, expense: 0 };
      }
      const amt = Number(t.amount);
      if (amt > 0) {
        totals[date].income += amt;
      } else {
        totals[date].expense += Math.abs(amt);
      }
    });
    return totals;
  }, [sortedTransactions]);

  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };



  if (loading) {
    return (
      <div className="table-wrapper">
        <div className="table-loading">
          <div className="spinner spinner--lg" />
          <p>Loading transactions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="table-section">
      <div className="table-section__header">
        <h2 className="section-title">
          <Receipt size={20} />
          Transactions
          <span className="section-count">{sortedTransactions.length}</span>
        </h2>
      </div>

      {sortedTransactions.length === 0 ? (
        <div className="table-empty">
          <p>No transactions found matching your filters.</p>
        </div>
      ) : (
        <div className="table-wrapper">
          <table className="txn-table">
            <thead>
              <tr>
                <th className="th--date" onClick={() => handleSort('date')}>
                  <div className="th-content">
                    Date
                  </div>
                </th>
                <th className="th--amount" onClick={() => handleSort('amount')}>
                  <div className="th-content">
                    Amount
                  </div>
                </th>
                <th className="th--category" onClick={() => handleSort('category')}>
                  <div className="th-content">
                    Category
                  </div>
                </th>
                <th className="th--account" onClick={() => handleSort('account')}>
                  <div className="th-content">
                    Account
                  </div>
                </th>
                <th className="th--note">Note</th>
                <th className="th--balance">Net Balance</th>
                <th className="th--actions">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedTransactions.map((transaction, index) => {
                const prevTxn = index > 0 ? sortedTransactions[index - 1] : null;
                const isNewDateGroup = !prevTxn || prevTxn.date !== transaction.date;
                const dailyTotals = dailyTotalsMap[transaction.date] || { income: 0, expense: 0 };

                return (
                  <React.Fragment key={transaction.id}>
                    {isNewDateGroup && (
                      <tr className="txn-date-header">
                        <td colSpan="7" className="txn-date-header-text">
                          <div className="txn-date-header-inner">
                            <span className="txn-date-header-date">{formatDate(transaction.date)}</span>
                            <div className="daily-totals" style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                              {dailyTotals.income > 0 && (
                                <span className="text-positive">
                                  In: +{formatCurrency(dailyTotals.income)}
                                </span>
                              )}
                              {dailyTotals.expense > 0 && (
                                <span className="text-negative">
                                  Out: -{formatCurrency(dailyTotals.expense)}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                    <TransactionRow
                      transaction={transaction}
                      accounts={accounts}
                      onUpdate={onUpdate}
                      onDelete={onDelete}
                      onView={() => setViewingTransactionId(transaction.id)}
                      runningBalance={runningBalanceMap[transaction.id]}
                    />
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {viewingTransactionId && (
        <TransactionModal
          transaction={transactions.find(t => t.id === viewingTransactionId)}
          accounts={accounts}
          onClose={() => setViewingTransactionId(null)}
          onUpdate={onUpdate}
          onDelete={onDelete}
        />
      )}
    </div>
  );
}
