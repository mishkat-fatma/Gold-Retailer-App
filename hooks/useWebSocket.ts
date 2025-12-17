import { useCallback, useEffect, useRef, useState } from "react";

export interface GoldPriceData {
  sell_price_999?: number;
}

export default function useWebSocket(uri: string, enabled = true) {
  const [data, setData] = useState<GoldPriceData | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const connect = useCallback(() => {
    if (!enabled) return;

    const ws = new WebSocket(`wss://${uri}`);
    wsRef.current = ws;

    ws.onmessage = (e) => {
      try {
        const parsed = JSON.parse(e.data);
        const payload = parsed?.data ?? parsed;
        if (payload?.sell_price_999) setData(payload);
      } catch {}
    };

    ws.onclose = () => setTimeout(connect, 3000);
  }, [uri, enabled]);

  useEffect(() => {
    connect();
    return () => wsRef.current?.close();
  }, [connect]);

  return { data };
}
