import { formatCurrency } from '../../utils/formatters';

export default function TransactionCard({ transaction, onView, onDelete, runningBalance }) {

  const formatShortDate = (dateString) => {
    return new Date(dateString).toLocaleDateString(undefined, {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
  };

  return (
    <div className={`txn-card ${transaction.is_offline ? 'txn-card--offline' : ''}`}>

      {/* Row 1: Category badge + Account badge + Action button */}
      <div className="txn-card__top">
        <div className="txn-card__badges">
          <span className="category-badge">{transaction.category}</span>
          <span className={`account-badge account-badge--${transaction.account.toLowerCase()}`}>
            {transaction.account}
          </span>
          {transaction.is_offline && (
            <span className="badge badge--offline">Offline</span>
          )}
        </div>
        <div className="txn-card__actions">
          {transaction.is_offline ? (
            <button
              className="btn btn--sm btn--danger-outline"
              onClick={() => onDelete(transaction.id)}
            >
              Delete
            </button>
          ) : (
            <button className="btn btn--view" onClick={onView}>View</button>
          )}
        </div>
      </div>

      {/* Row 2: Date + Amount + Running Balance */}
      <div className="txn-card__mid">
        <span className="txn-card__date">{formatShortDate(transaction.date)}</span>
        <span className={`txn-card__amount ${transaction.amount >= 0 ? 'text-positive' : 'text-negative'}`}>
          {transaction.amount >= 0 ? '+' : '−'}{formatCurrency(Math.abs(transaction.amount))}
        </span>
        {runningBalance != null && (
          <span className="txn-card__balance">
            Bal {formatCurrency(runningBalance)}
          </span>
        )}
      </div>

      {/* Row 3: Note (only if exists) */}
      {transaction.note && (
        <div className="txn-card__note">"{transaction.note}"</div>
      )}
    </div>
  );
}
