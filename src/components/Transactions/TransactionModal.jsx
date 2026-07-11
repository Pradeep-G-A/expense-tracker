import React, { useState } from 'react';
import { X, Trash2, Save, Pencil, Calendar, Tag, CreditCard, FileText } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';
import { CATEGORIES } from '../../utils/constants';

export default function TransactionModal({ transaction, accounts, onClose, onUpdate, onDelete }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    amount: Math.abs(transaction.amount),
    isIncome: transaction.amount >= 0,
    category: transaction.category,
    account: transaction.account,
    date: transaction.date,
    time: transaction.time ? transaction.time.substring(0, 5) : '00:00',
    note: transaction.note || ''
  });
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleSave = () => {
    if (!editData.amount || editData.amount <= 0) return;
    const finalAmount = editData.isIncome ? Number(editData.amount) : -Number(editData.amount);
    onUpdate(transaction.id, {
      amount: finalAmount,
      category: editData.category,
      account: editData.account,
      date: editData.date,
      time: editData.time,
      note: editData.note
    });
    setIsEditing(false);
  };

  const handleDelete = () => {
    if (confirmDelete) {
      onDelete(transaction.id);
      onClose();
    } else {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 3000);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Transaction Details</h2>
          <button className="btn btn--icon" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          {isEditing ? (
            <div className="modal-form">
              <div className="form-group-row">
                <div className="form-group">
                  <label>Date</label>
                  <input
                    type="date"
                    value={editData.date}
                    onChange={e => setEditData(prev => ({ ...prev, date: e.target.value }))}
                    className="input"
                  />
                </div>
                <div className="form-group">
                  <label>Time</label>
                  <input
                    type="time"
                    value={editData.time}
                    onChange={e => setEditData(prev => ({ ...prev, time: e.target.value }))}
                    className="input"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Type</label>
                <div className="type-toggle">
                  <button
                    className={`type-btn ${!editData.isIncome ? 'type-btn--expense type-btn--active' : ''}`}
                    onClick={() => setEditData(prev => ({ ...prev, isIncome: false }))}
                  >
                    Expense
                  </button>
                  <button
                    className={`type-btn ${editData.isIncome ? 'type-btn--income type-btn--active' : ''}`}
                    onClick={() => setEditData(prev => ({ ...prev, isIncome: true }))}
                  >
                    Income
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label>Amount</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={editData.amount}
                  onChange={e => setEditData(prev => ({ ...prev, amount: e.target.value }))}
                  className="input input--amount"
                />
              </div>

              <div className="form-group">
                <label>Category</label>
                <select
                  value={editData.category}
                  onChange={e => setEditData(prev => ({ ...prev, category: e.target.value }))}
                  className="input"
                >
                  {CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Account</label>
                <select
                  value={editData.account}
                  onChange={e => setEditData(prev => ({ ...prev, account: e.target.value }))}
                  className="input"
                >
                  {accounts.map(acc => (
                    <option key={acc.name} value={acc.name}>{acc.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Note</label>
                <input
                  type="text"
                  value={editData.note}
                  onChange={e => setEditData(prev => ({ ...prev, note: e.target.value }))}
                  className="input"
                  placeholder="Optional note"
                />
              </div>
            </div>
          ) : (
            <div className="modal-details-container">
              <div className="modal-details-hero">
                <div className={`details-hero-amount ${transaction.amount >= 0 ? 'text-positive' : 'text-negative'}`}>
                  {transaction.amount >= 0 ? '+' : '−'}{formatCurrency(Math.abs(transaction.amount))}
                </div>
                <span className="details-hero-subtitle">Transaction Amount</span>
              </div>

              <div className="modal-details-grid">
                <div className="detail-item">
                  <div className="detail-item__icon-wrapper">
                    <Calendar size={18} />
                  </div>
                  <div className="detail-item__content">
                    <span className="detail-item__label">Date & Time</span>
                    <span className="detail-item__value">
                      {new Date(transaction.date).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'long', day: 'numeric' })}
                      {transaction.time && ` at ${transaction.time.substring(0, 5)}`}
                    </span>
                  </div>
                </div>

                <div className="detail-item">
                  <div className="detail-item__icon-wrapper">
                    <Tag size={18} />
                  </div>
                  <div className="detail-item__content">
                    <span className="detail-item__label">Category</span>
                    <span className="category-badge">{transaction.category}</span>
                  </div>
                </div>

                <div className="detail-item">
                  <div className="detail-item__icon-wrapper">
                    <CreditCard size={18} />
                  </div>
                  <div className="detail-item__content">
                    <span className="detail-item__label">Account</span>
                    <span className={`account-badge account-badge--${transaction.account.toLowerCase()}`}>{transaction.account}</span>
                  </div>
                </div>

                <div className="detail-item detail-item--full">
                  <div className="detail-item__icon-wrapper">
                    <FileText size={18} />
                  </div>
                  <div className="detail-item__content">
                    <span className="detail-item__label">Note</span>
                    <span className="detail-item__value detail-item__value--note">
                      {transaction.note || '—'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          {isEditing ? (
            <>
              <button className="btn btn--secondary" onClick={() => setIsEditing(false)}>Cancel</button>
              <button className="btn btn--primary" onClick={handleSave}><Save size={16} /> Save Changes</button>
            </>
          ) : (
            <>
              <button className={`btn ${confirmDelete ? 'btn--danger' : 'btn--secondary'}`} onClick={handleDelete}>
                <Trash2 size={16} /> {confirmDelete ? 'Confirm Delete' : 'Delete'}
              </button>
              <button className="btn btn--primary" onClick={() => setIsEditing(true)}>
                <Pencil size={16} /> Edit
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
