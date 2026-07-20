import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../supabaseClient';
import {
  addPendingTransaction,
  getPendingTransactions,
  deletePendingTransaction
} from '../utils/indexedDb';

export function useTransactions(user) {
  const userId = user?.id;

  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncing, setSyncing] = useState(false);
  const isSyncingRef = useRef(false);

  const fetchTransactions = useCallback(async () => {
    // Get local pending items first
    let pending = [];
    try {
      pending = await getPendingTransactions();
    } catch (e) {
      console.warn('Failed to load pending transactions from IndexedDB:', e);
    }

    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .order('date', { ascending: false })
      .order('time', { ascending: false });

    if (error) {
      console.error('Error fetching transactions:', error);
      // If query fails (e.g. network disconnected), show whatever we currently have plus offline items
      if (pending.length > 0) {
        setTransactions(prev => {
          const nonPending = prev.filter(t => !t.is_offline);
          return [...pending, ...nonPending];
        });
      }
      setLoading(false);
      return;
    }

    // Combine remote data with local offline pending transactions
    // Prepend pending transactions so they appear at the top
    const combined = [...pending, ...(data || [])];
    setTransactions(combined);
    setLoading(false);
  }, []);

  const syncOfflineTransactions = useCallback(async () => {
    if (!navigator.onLine || isSyncingRef.current) return;
    isSyncingRef.current = true;
    setSyncing(true);
    try {
      const pending = await getPendingTransactions();
      if (pending.length > 0) {
        console.log(`Syncing ${pending.length} offline transactions...`);
        for (const tx of pending) {
          // Prepare Supabase insert payload (strip out local database metadata)
          const { id, is_offline, created_at, ...payload } = tx;
          
          const { error } = await supabase
            .from('transactions')
            .insert(payload);
          
          if (!error) {
            await deletePendingTransaction(tx.id);
          } else {
            console.error('Error syncing transaction to Supabase:', error);
            // If it's a structural or validation error, we delete it to avoid getting stuck,
            // but if it's a network issue we keep it. Since we are navigator.onLine,
            // it's likely a auth/validation error.
            if (error.code !== 'PGRST100' && error.status !== 503) {
              await deletePendingTransaction(tx.id);
            }
          }
        }
        await fetchTransactions();
      }
    } catch (err) {
      console.error('Failed during offline sync:', err);
    } finally {
      isSyncingRef.current = false;
      setSyncing(false);
    }
  }, [fetchTransactions]);

  // Monitor network status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      syncOfflineTransactions();
    };
    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial sync trigger
    if (navigator.onLine) {
      syncOfflineTransactions();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [syncOfflineTransactions]);

  // Fetch when user state changes
  useEffect(() => {
    if (!userId) {
      setTransactions([]);
      return;
    }
    fetchTransactions();
  }, [fetchTransactions, userId]);

  const addTransaction = async (transaction) => {
    const maxSortOrder = transactions.length > 0
      ? Math.max(...transactions.map(t => t.sort_order || 0))
      : 0;

    const newTx = {
      amount: Number(transaction.amount),
      category: transaction.category,
      account: transaction.account,
      date: transaction.date,
      time: transaction.time || null,
      note: transaction.note || null,
      sort_order: maxSortOrder + 1,
      linked_goal_id: transaction.linked_goal_id || null,
    };

    if (!navigator.onLine) {
      const tempId = `offline-${Date.now()}`;
      const offlineTx = {
        ...newTx,
        id: tempId,
        is_offline: true,
        created_at: new Date().toISOString()
      };

      await addPendingTransaction(offlineTx);
      
      // Update local state optimistically
      setTransactions(prev => [offlineTx, ...prev]);
      return offlineTx;
    }

    const { data, error } = await supabase
      .from('transactions')
      .insert(newTx)
      .select()
      .single();

    if (error) {
      console.error('Error adding transaction:', error);
      throw error;
    }

    await fetchTransactions();
    return data;
  };

  const updateTransaction = async (id, updates) => {
    // Prevent updating offline items until they are synced
    if (id.toString().startsWith('offline-')) {
      alert('Cannot update transactions while they are queued offline. Please reconnect first.');
      return;
    }

    const oldTxn = transactions.find(t => t.id === id);
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

    // Bidirectional Sync: If transaction was linked and amount changed
    if (oldTxn && oldTxn.linked_goal_id && cleanUpdates.amount !== undefined && oldTxn.amount !== cleanUpdates.amount) {
      try {
        const { data: goalData } = await supabase
          .from('savings_goals')
          .select('*')
          .eq('id', oldTxn.linked_goal_id)
          .single();

        if (goalData) {
          const amountDiff = cleanUpdates.amount - oldTxn.amount;
          const newAmt = Math.max(0, goalData.current_amount - amountDiff);
          
          await supabase
            .from('savings_goals')
            .update({ current_amount: newAmt })
            .eq('id', goalData.id);
        }
      } catch (syncErr) {
         console.error('Error syncing goal after transaction update:', syncErr);
      }
    }

    await fetchTransactions();
    return data;
  };

  const deleteTransaction = async (id) => {
    if (id.toString().startsWith('offline-')) {
      // Simply delete from IndexedDB
      await deletePendingTransaction(id);
      setTransactions(prev => prev.filter(t => t.id !== id));
      return;
    }

    const txnToDelete = transactions.find(t => t.id === id);

    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting transaction:', error);
      throw error;
    }

    // Bidirectional Sync: If we deleted a transaction linked to a goal, reverse the amount
    if (txnToDelete && txnToDelete.linked_goal_id) {
      try {
        const { data: goalData } = await supabase
          .from('savings_goals')
          .select('*')
          .eq('id', txnToDelete.linked_goal_id)
          .single();

        if (goalData) {
          // If transaction amount was -500 (expense), we had originally ADDED 500 to the goal.
          // By reversing it, we need to subtract 500 from the goal.
          // math: current_amount + txnToDelete.amount
          // e.g. 1000 + (-500) = 500
          const newAmt = Math.max(0, goalData.current_amount + txnToDelete.amount);
          await supabase
            .from('savings_goals')
            .update({ current_amount: newAmt })
            .eq('id', goalData.id);
        }
      } catch (syncErr) {
        console.error('Error syncing goal after transaction deletion:', syncErr);
      }
    }

    await fetchTransactions();
  };

  const reorderTransactions = async (activeId, overId) => {
    if (activeId.toString().startsWith('offline-') || overId.toString().startsWith('offline-')) {
      alert('Reordering is not supported for offline pending transactions.');
      return;
    }

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
    isOnline,
    syncing,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    reorderTransactions,
    refetch: fetchTransactions,
  };
}
