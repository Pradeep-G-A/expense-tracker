import { useState, useEffect, useRef } from 'react';
import { Filter, X, Search, Calendar } from 'lucide-react';
import { CATEGORIES } from '../../utils/constants';

export default function FilterBar({ accounts, filters, onFilterChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const searchInputRef = useRef(null);

  useEffect(() => {
    const handleFocusSearch = () => {
      if (searchInputRef.current) {
        searchInputRef.current.focus();
        searchInputRef.current.select();
      }
    };
    window.addEventListener('focus-search', handleFocusSearch);
    return () => window.removeEventListener('focus-search', handleFocusSearch);
  }, []);

  const activeCount = Object.values(filters).filter(v => v && v !== 'all').length;

  const handleChange = (key, value) => {
    onFilterChange({ ...filters, [key]: value });
  };

  const clearFilters = () => {
    onFilterChange({
      account: 'all',
      category: 'all',
      dateFrom: '',
      dateTo: '',
      search: '',
    });
  };

  const applyThisMonth = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const firstDay = `${year}-${month}-01`;
    const lastDay = new Date(year, now.getMonth() + 1, 0);
    const lastDayStr = `${year}-${month}-${String(lastDay.getDate()).padStart(2, '0')}`;

    onFilterChange({
      ...filters,
      dateFrom: firstDay,
      dateTo: lastDayStr,
    });
  };

  const isThisMonthActive = (() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const firstDay = `${year}-${month}-01`;
    const lastDay = new Date(year, now.getMonth() + 1, 0);
    const lastDayStr = `${year}-${month}-${String(lastDay.getDate()).padStart(2, '0')}`;
    return filters.dateFrom === firstDay && filters.dateTo === lastDayStr;
  })();

  return (
    <div className="filter-bar">
      <div className="filter-bar__toggle-row">
        <button
          className={`btn btn--ghost filter-bar__toggle ${isOpen ? 'filter-bar__toggle--active' : ''}`}
          onClick={() => setIsOpen(!isOpen)}
        >
          <Filter size={16} />
          Filters
          {activeCount > 0 && <span className="filter-badge">{activeCount}</span>}
        </button>

        <button
          className={`btn btn--ghost btn--sm ${isThisMonthActive ? 'filter-bar__toggle--active' : ''}`}
          onClick={applyThisMonth}
        >
          <Calendar size={14} />
          This Month
        </button>

        <div className="filter-bar__search">
          <Search size={16} className="search-icon" />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search notes..."
            value={filters.search || ''}
            onChange={e => handleChange('search', e.target.value)}
            className="filter-search-input"
          />
          {filters.search && (
            <button className="search-clear" onClick={() => handleChange('search', '')}>
              <X size={14} />
            </button>
          )}
        </div>

        {activeCount > 0 && (
          <button className="btn btn--ghost btn--sm" onClick={clearFilters}>
            <X size={14} /> Clear
          </button>
        )}
      </div>

      {isOpen && (
        <div className="filter-bar__controls">
          <div className="form-group">
            <label htmlFor="filter-account">Account</label>
            <select
              id="filter-account"
              value={filters.account || 'all'}
              onChange={e => handleChange('account', e.target.value)}
            >
              <option value="all">All Accounts</option>
              {accounts.map(a => (
                <option key={a.name} value={a.name}>{a.name}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="filter-category">Category</label>
            <select
              id="filter-category"
              value={filters.category || 'all'}
              onChange={e => handleChange('category', e.target.value)}
            >
              <option value="all">All Categories</option>
              {CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="filter-date-from">From</label>
            <input
              id="filter-date-from"
              type="date"
              value={filters.dateFrom || ''}
              onChange={e => handleChange('dateFrom', e.target.value)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="filter-date-to">To</label>
            <input
              id="filter-date-to"
              type="date"
              value={filters.dateTo || ''}
              onChange={e => handleChange('dateTo', e.target.value)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
