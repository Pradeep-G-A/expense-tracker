import { Wallet, TrendingDown, CreditCard, Building2, WalletCards, HandCoins } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';
import { useMemo } from 'react';

const ACCOUNT_ICONS = {
  HDFC: CreditCard,
  SBI: Building2,
  Wallet: WalletCards,
};

export default function AccountCards({ accounts, loading, txnLoading, activeLedger, transactions }) {

  const { totalBalance, todaySpend, yesterdaySpend, totalLent } = useMemo(() => {
    let totalBal = 0;
    if (!txnLoading) {
      accounts.forEach(acc => {
        const bal = activeLedger === 1 ? acc.current_balance_1 : acc.current_balance_2;
        totalBal += bal;
      });
    }

    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const getISODate = (d) => {
      const offset = d.getTimezoneOffset();
      d = new Date(d.getTime() - (offset * 60 * 1000));
      return d.toISOString().split('T')[0];
    };

    const todayStr = getISODate(today);
    const yesterdayStr = getISODate(yesterday);

    let tSpend = 0, ySpend = 0, tLent = 0;

    if (!txnLoading) {
      (transactions || []).forEach(t => {
        if (t.amount < 0) {
          if (t.date === todayStr)     tSpend += Math.abs(t.amount);
          if (t.date === yesterdayStr) ySpend += Math.abs(t.amount);
        }
        if (t.category === 'Lent') {
          tLent -= Number(t.amount || 0);
        }
      });
    }

    return { totalBalance: totalBal, todaySpend: tSpend, yesterdaySpend: ySpend, totalLent: tLent };
  }, [accounts, activeLedger, transactions, txnLoading]);

  if (loading) {
    return (
      <>
        {/* Desktop Skeleton */}
        <div className="dashboard-modules desktop-only">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="dashboard-module dashboard-module--skeleton">
              <div className="skeleton-line skeleton-line--sm" />
              <div className="skeleton-line skeleton-line--lg" style={{ marginTop: 8 }} />
            </div>
          ))}
        </div>

        {/* Mobile Skeleton */}
        <div className="dash-hero-layout mobile-only">
          <div className="dash-hero-row">
            <div className="dash-hero-card dash-hero-card--skeleton">
              <div className="skeleton-line skeleton-line--sm" />
              <div className="skeleton-line skeleton-line--lg" style={{ marginTop: 8 }} />
            </div>
            <div className="dash-hero-card dash-hero-card--skeleton">
              <div className="skeleton-line skeleton-line--sm" />
              <div className="skeleton-line skeleton-line--lg" style={{ marginTop: 8 }} />
            </div>
          </div>
          <div className="dash-account-chips">
            {[1, 2, 3].map(i => (
              <div key={i} className="dash-account-chip dash-account-chip--skeleton">
                <div className="skeleton-line skeleton-line--sm" />
                <div className="skeleton-line skeleton-line--md" style={{ marginTop: 6 }} />
              </div>
            ))}
          </div>
          <div className="dash-spend-row">
            <div className="dash-spend-chip dash-spend-chip--skeleton">
              <div className="skeleton-line skeleton-line--sm" />
              <div className="skeleton-line skeleton-line--md" style={{ marginTop: 6 }} />
            </div>
            <div className="dash-spend-chip dash-spend-chip--skeleton">
              <div className="skeleton-line skeleton-line--sm" />
              <div className="skeleton-line skeleton-line--md" style={{ marginTop: 6 }} />
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      {/* ── DESKTOP LAYOUT (4 equal modules) ── */}
      <div className="dashboard-modules desktop-only">
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
              const currentBalance = txnLoading ? 0 : (activeLedger === 1 ? account.current_balance_1 : account.current_balance_2);
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

        {/* Module 4: Lent & Receivables */}
        <div className="dashboard-module">
          <h3 className="dashboard-module__title">Lent & Receivables</h3>
          <div className="dashboard-module__content dashboard-module__content--center">
            <span className={`dashboard-module__main-value ${totalLent > 0 ? 'text-positive' : (totalLent < 0 ? 'text-negative' : '')}`}>
              {formatCurrency(totalLent)}
            </span>
            <span className="dashboard-module__subtitle">
              {totalLent > 0 ? 'To be received' : (totalLent < 0 ? 'You owe others' : 'All settled')}
            </span>
          </div>
        </div>
      </div>

      {/* ── MOBILE LAYOUT (Hero + Chips) ── */}
      <div className="dash-hero-layout mobile-only">

        {/* ── Row 1: Hero Numbers ─────────────────────────── */}
        <div className="dash-hero-row">
          <div className="dash-hero-card dash-hero-card--balance">
            <span className="dash-hero-label">Total Balance</span>
            <span className={`dash-hero-value ${totalBalance >= 0 ? 'text-positive' : 'text-negative'}`}>
              {formatCurrency(totalBalance)}
            </span>
            <span className="dash-hero-sub">Ledger {activeLedger}</span>
          </div>

          <div className="dash-hero-card dash-hero-card--lent">
            <span className="dash-hero-label">
              <HandCoins size={11} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />
              Lent &amp; Receivables
            </span>
            <span className={`dash-hero-value ${totalLent > 0 ? 'text-positive' : totalLent < 0 ? 'text-negative' : ''}`}>
              {formatCurrency(totalLent)}
            </span>
            <span className="dash-hero-sub">
              {totalLent > 0 ? 'To be received' : totalLent < 0 ? 'You owe others' : 'All settled ✓'}
            </span>
          </div>
        </div>

        {/* ── Row 2: Account Chips ────────────────────────── */}
        <div className="dash-account-chips">
          {accounts.map((account, i) => {
            const bal = txnLoading ? 0 : (activeLedger === 1 ? account.current_balance_1 : account.current_balance_2);
            const Icon = ACCOUNT_ICONS[account.name] || Wallet;
            return (
              <div
                key={account.name}
                className="dash-account-chip"
                style={{ animationDelay: `${0.1 + i * 0.07}s` }}
              >
                <div className="dash-account-chip__top">
                  <div className="dash-account-chip__icon">
                    <Icon size={14} />
                  </div>
                  <span className="dash-account-chip__name">{account.name}</span>
                </div>
                <span className={`dash-account-chip__balance ${bal >= 0 ? 'text-positive' : 'text-negative'}`}>
                  {formatCurrency(bal)}
                </span>
              </div>
            );
          })}
        </div>

        {/* ── Row 3: Spend Chips ──────────────────────────── */}
        <div className="dash-spend-row">
          <div className="dash-spend-chip">
            <div className="dash-spend-chip__header">
              <TrendingDown size={13} className="dash-spend-icon" />
              <span className="dash-spend-label">Today</span>
            </div>
            <span className="dash-spend-value text-expense">
              {todaySpend > 0 ? formatCurrency(todaySpend) : '—'}
            </span>
            <span className="dash-spend-sub">spent today</span>
          </div>

          <div className="dash-spend-chip">
            <div className="dash-spend-chip__header">
              <TrendingDown size={13} className="dash-spend-icon" />
              <span className="dash-spend-label">Yesterday</span>
            </div>
            <span className="dash-spend-value text-expense">
              {yesterdaySpend > 0 ? formatCurrency(yesterdaySpend) : '—'}
            </span>
            <span className="dash-spend-sub">spent yesterday</span>
          </div>
        </div>

      </div>
    </>
  );
}
