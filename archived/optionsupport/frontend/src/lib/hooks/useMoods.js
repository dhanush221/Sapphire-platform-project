import { useCallback, useEffect, useState } from 'react';
import api from '../api.js';

export function useMoods({ autoRefresh = false, limit = 7, days = 7 } = {}) {
  const [entries, setEntries] = useState([]);
  const [trendPoints, setTrendPoints] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [list, trends] = await Promise.all([
        api.listMoods(limit),
        api.moodTrends(days)
      ]);
      setEntries(Array.isArray(list) ? list : []);
      setTrendPoints(trends?.points || []);
    } catch (err) {
      setError(err?.message || 'Failed to load mood history');
    } finally {
      setLoading(false);
    }
  }, [limit, days]);

  const create = useCallback(async (payload) => {
    setSaving(true);
    setError(null);
    try {
      await api.createMood(payload);
      await refresh();
    } catch (err) {
      setError(err?.message || 'Failed to save check-in');
      throw err;
    } finally {
      setSaving(false);
    }
  }, [refresh]);

  useEffect(() => {
    if (autoRefresh) refresh();
  }, [autoRefresh, refresh]);

  return { entries, trendPoints, loading, saving, error, refresh, create };
}

export default useMoods;
