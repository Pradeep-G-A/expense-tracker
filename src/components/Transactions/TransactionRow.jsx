import { formatCurrency, formatDate } from '../../utils/formatters';

export default function TransactionRow({ 
  transaction, 
  onView, 
  runningBalance 
}) {
  return (
    <tr className="txn-row">
      <td className="td--date" data-label="Date">{formatDate(transaction.date)}</td>
      <td className={`td--amount ${transaction.amount >= 0 ? 'text-positive' : 'text-negative'}`} data-label="Amount">
        {transaction.amount >= 0 ? '+' : '−'}{formatCurrency(Math.abs(transaction.amount))}
      </td>
      <td className="td--category" data-label="Category">
        <span className="category-badge">{transaction.category}</span>
      </td>
      <td className="td--account" data-label="Account">
        <span className={`account-badge account-badge--${transaction.account.toLowerCase()}`}>
          {transaction.account}
        </span>
      </td>
      <td className="td--note" data-label="Note">{transaction.note || '—'}</td>
      <td className="td--balance" data-label="Net Balance">
        {runningBalance != null ? `${transaction.account}: ${formatCurrency(runningBalance)}` : '—'}
      </td>
      <td className="td--actions" data-label="Actions">
        <button className="btn btn--view" onClick={onView}>View</button>
      </td>
    </tr>
  );
}
