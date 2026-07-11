import { Wallet, LogOut } from 'lucide-react';
import ThemeToggle from '../common/ThemeToggle';

export default function Header({ user, onSignOut, activeLedger, onToggleLedger }) {
  return (
    <header className="header">
      <div className="header__left">
        <div className="header__logo">
          <Wallet size={24} />
        </div>
        <h1 className="header__title">Expense Tracker</h1>
      </div>
      <div className="header__right">
        <div className="ledger-toggle-wrapper">
          <button 
            className={`ledger-toggle-btn ${activeLedger === 1 ? 'ledger-toggle-btn--active' : ''}`}
            onClick={() => activeLedger !== 1 && onToggleLedger()}
          >
            Ledger 1
          </button>
          <button 
            className={`ledger-toggle-btn ${activeLedger === 2 ? 'ledger-toggle-btn--active' : ''}`}
            onClick={() => activeLedger !== 2 && onToggleLedger()}
          >
            Ledger 2
          </button>
        </div>
        <ThemeToggle />
        {user && (
          <div className="header__user">
            <span className="header__email">{user.email}</span>
            <button className="btn btn--ghost btn--sm" onClick={onSignOut} title="Sign out">
              <LogOut size={18} />
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
