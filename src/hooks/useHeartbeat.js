import { useEffect, useRef } from 'react';
import api from '../utils/api';
import authStore from '../stores/authStore';

const HEARTBEAT_INTERVAL_MS = 30 * 1000; // 30 секунд

export const useHeartbeat = () => {
  const intervalRef = useRef(null);

  useEffect(() => {
    if (!authStore.isAuthenticated) return;

    const sendHeartbeat = () => {
      api.post('/auth/heartbeat').catch(() => {});
    };

    sendHeartbeat();
    intervalRef.current = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [authStore.isAuthenticated]);
};
