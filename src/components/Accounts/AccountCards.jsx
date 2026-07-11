import { Wallet, TrendingDown, CreditCard, Building2, WalletCards } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';
import { useMemo } from 'react';

const ACCOUNT_ICONS = {
  HDFC: CreditCard,
  SBI: Building2,
  Wallet: WalletCards,
};

export default function AccountCards({ accounts, loading, activeLedger, transactions }) {
  const { totalBalance, todaySpend, yesterdaySpend } = useMemo(() => {
    let totalBal = 0;
    accounts.forEach(acc => {
      const bal = activeLedger === 1 ? acc.current_balance_1 : acc.current_balance_2;
      totalBal += bal;
    });

    // Calculate dates
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const getISODate = (d) => {
      const offset = d.getTimezoneOffset();
      d = new Date(d.getTime() - (offset*60*1000));
      return d.toISOString().split('T')[0];
    };

    const todayStr = getISODate(today);
    const yesterdayStr = getISODate(yesterday);

    let tSpend = 0;
    let ySpend = 0;

    (transactions || []).forEach(t => {
      if (t.amount < 0) { // Expense
        if (t.date === todayStr) tSpend += Math.abs(t.amount);
        if (t.date === yesterdayStr) ySpend += Math.abs(t.amount);
      }
    });

    return { totalBalance: totalBal, todaySpend: tSpend, yesterdaySpend: ySpend };
  }, [accounts, activeLedger, transactions]);

  if (loading) {
    return (
      <div className="dashboard-modules">
        {[1, 2, 3].map(i => (
          <div key={i} className="dashboard-module dashboard-module--skeleton">
            <div className="skeleton-line skeleton-line--sm" />
            <div className="skeleton-line skeleton-line--lg" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="dashboard-modules">
      {/* Module 1: Total Balance */}
      <div className="dashboard-module">
        <h3 className="dashboard-module__title">Total Balance</h3>
        <div className="dashboard-module__content dashboard-module__content--center">
          <span className={`dashboard-module__main-value ${totalBalance >= 0 ? 'text-positive' : 'text-negative'}`}>
            {formatCurrency(totalBalance)}
          </span>
          <span className="dashboard-module__subtitle">Ledger {activeLedger}</span>
        </div>
      </div>

      {/* Module 2: Account Breakdown */}
      <div className="dashboard-module">
        <h3 className="dashboard-module__title">Account Breakdown</h3>
        <div className="dashboard-module__list">
          {accounts.map(account => {
            const currentBalance = activeLedger === 1 ? account.current_balance_1 : account.current_balance_2;
            const Icon = ACCOUNT_ICONS[account.name] || Wallet;
            
            return (
              <div key={account.name} className="dashboard-module__list-item">
                <div className="dashboard-module__list-icon">
                  <Icon size={20} color="var(--text-muted)" />
                </div>
                <span className="dashboard-module__list-name">{account.name}</span>
                <span className={`dashboard-module__list-value ${currentBalance >= 0 ? 'text-positive' : 'text-negative'}`}>
                  {formatCurrency(currentBalance)}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Module 3: Recent Spend */}
      <div className="dashboard-module">
        <h3 className="dashboard-module__title">Recent Spend</h3>
        <div className="dashboard-module__list dashboard-module__list--gap">
          <div className="dashboard-module__spend-item">
            <span className="dashboard-module__spend-label">Today</span>
            <span className="dashboard-module__spend-value text-expense">
              {formatCurrency(todaySpend)}
            </span>
          </div>
          <div className="dashboard-module__spend-item">
            <span className="dashboard-module__spend-label">Yesterday</span>
            <span className="dashboard-module__spend-value text-expense">
              {formatCurrency(yesterdaySpend)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
