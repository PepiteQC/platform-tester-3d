import { useEffect, useRef, useCallback, useState } from 'react';

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:3001/ws/audit';

export function useAuditWebSocket(onEvent) {
  const wsRef            = useRef(null);
  const reconnectTimeout = useRef(null);
  const [status, setStatus] = useState('disconnected'); // connected | disconnected | reconnecting

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    setStatus('reconnecting');
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      setStatus('connected');
      clearTimeout(reconnectTimeout.current);
    };

    ws.onmessage = (evt) => {
      try {
        const msg = JSON.parse(evt.data);
        onEvent?.(msg);
      } catch {/* ignore malformed */ }
    };

    ws.onclose = () => {
      setStatus('disconnected');
      // Reconnexion automatique avec backoff
      reconnectTimeout.current = setTimeout(connect, 3000);
    };

    ws.onerror = () => ws.close();
  }, [onEvent]);

  useEffect(() => {
    connect();
    return () => {
      clearTimeout(reconnectTimeout.current);
      wsRef.current?.close();
    };
  }, [connect]);

  return { status };
}