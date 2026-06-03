'use client';
import { useEffect, useRef, useState, useCallback } from 'react';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000';

export interface ProcessingUpdate {
  type: 'processing_update' | 'processing_complete' | 'processing_error';
  document_id: string;
  step?: string;
  progress?: number;
  message?: string;
  document?: any;
  error?: string;
}

export function useWebSocket(clientId: string) {
  const wsRef = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<ProcessingUpdate | null>(null);
  const pingRef = useRef<NodeJS.Timeout>();

  const connect = useCallback(() => {
    try {
      const ws = new WebSocket(`${WS_URL}/ws/${clientId}`);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
        // Heartbeat
        pingRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) ws.send('ping');
        }, 30000);
      };

      ws.onmessage = (event) => {
        if (event.data === 'pong') return;
        try {
          const data: ProcessingUpdate = JSON.parse(event.data);
          setLastUpdate(data);
        } catch {}
      };

      ws.onclose = () => {
        setConnected(false);
        clearInterval(pingRef.current);
        // Reconnect after 3s
        setTimeout(connect, 3000);
      };

      ws.onerror = () => {
        ws.close();
      };
    } catch (e) {
      setTimeout(connect, 3000);
    }
  }, [clientId]);

  useEffect(() => {
    connect();
    return () => {
      clearInterval(pingRef.current);
      wsRef.current?.close();
    };
  }, [connect]);

  return { connected, lastUpdate };
}
