import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';

export function useAccounts(transactions) {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAccounts = useCallback(async () => {
    const { data, error } = await supabase
      .from('accounts')
      .select('*')
      .order('name');

    if (error) {
      console.error('Error fetching accounts:', error);
      return;
    }
    setAccounts(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAccounts();

    const channel = supabase
      .channel('accounts-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'accounts' }, () => {
        fetchAccounts();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchAccounts]);

  // Compute current balances — both ledgers affected equally
  // Expenses are negative amounts, income is positive
  // So balance = initial + SUM(all amounts)
  const accountsWithBalances = accounts.map(account => {
    const accountTransactions = (transactions || []).filter(
      t => t.account === account.name
    );
    const totalChange = accountTransactions.reduce(
      (sum, t) => sum + Number(t.amount),
      0
    );
    const totalExpenses = accountTransactions
      .filter(t => Number(t.amount) < 0)
      .reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0);
    const totalIncome = accountTransactions
      .filter(t => Number(t.amount) > 0)
      .reduce((sum, t) => sum + Number(t.amount), 0);
    return {
      ...account,
      current_balance_1: Number(account.initial_balance_1) + totalChange,
      current_balance_2: Number(account.initial_balance_2) + totalChange,
      total_expenses: totalExpenses,
      total_income: totalIncome,
      transaction_count: accountTransactions.length,
    };
  });

  return { accounts: accountsWithBalances, loading, refetch: fetchAccounts };
}
