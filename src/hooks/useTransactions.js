import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';

export function useTransactions() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchTransactions = useCallback(async () => {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .order('date', { ascending: false })
      .order('time', { ascending: false });

    if (error) {
      console.error('Error fetching transactions:', error);
      return;
    }
    setTransactions(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchTransactions();

    const channel = supabase
      .channel('transactions-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'transactions' },
        () => {
          fetchTransactions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchTransactions]);

  const addTransaction = async (transaction) => {
    const maxSortOrder = transactions.length > 0
      ? Math.max(...transactions.map(t => t.sort_order || 0))
      : 0;

    const { data, error } = await supabase
      .from('transactions')
      .insert({
        amount: Number(transaction.amount),
        category: transaction.category,
        account: transaction.account,
        date: transaction.date,
        time: transaction.time || null,
        note: transaction.note || null,
        sort_order: maxSortOrder + 1,
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding transaction:', error);
      throw error;
    }

    // Re-fetch to get properly sorted data
    await fetchTransactions();
    return data;
  };

  const updateTransaction = async (id, updates) => {
    const cleanUpdates = { ...updates };
    if (cleanUpdates.amount !== undefined) {
      cleanUpdates.amount = Number(cleanUpdates.amount);
    }

    const { data, error } = await supabase
      .from('transactions')
      .update(cleanUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating transaction:', error);
      throw error;
    }

    // Re-fetch to get properly sorted data (in case date/time changed)
    await fetchTransactions();
    return data;
  };

  const deleteTransaction = async (id) => {
    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting transaction:', error);
      throw error;
    }

    // Re-fetch to ensure consistent state
    await fetchTransactions();
  };

  const reorderTransactions = async (activeId, overId) => {
    const oldIndex = transactions.findIndex(t => t.id === activeId);
    const newIndex = transactions.findIndex(t => t.id === overId);

    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = [...transactions];
    const [moved] = reordered.splice(oldIndex, 1);
    reordered.splice(newIndex, 0, moved);

    let newSortOrder;
    if (newIndex === 0) {
      newSortOrder = (reordered[1]?.sort_order || 1) - 1;
    } else if (newIndex === reordered.length - 1) {
      newSortOrder = (reordered[reordered.length - 2]?.sort_order || 0) + 1;
    } else {
      const before = reordered[newIndex - 1].sort_order;
      const after = reordered[newIndex + 1].sort_order;
      newSortOrder = (before + after) / 2;
    }

    moved.sort_order = newSortOrder;
    setTransactions(reordered);

    const { error } = await supabase
      .from('transactions')
      .update({ sort_order: newSortOrder })
      .eq('id', activeId);

    if (error) {
      console.error('Error reordering:', error);
      fetchTransactions();
    }
  };

  return {
    transactions,
    loading,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    reorderTransactions,
    refetch: fetchTransactions,
  };
}
