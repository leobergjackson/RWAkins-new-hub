// Copyright 2026 AeroFyta
// Licensed under the Apache License, Version 2.0
// See LICENSE file for details

import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { API_BASE } from "./useFetch";

interface WebSocketEvent {
  event: string;
  data: unknown;
  timestamp: string;
}

type EventCallback = (data: unknown) => void;

/**
 * React hook for real-time WebSocket connection to the Colibrí agent.
 *
 * - Connects to the agent's Socket.IO server
 * - Auto-reconnects on disconnect
 * - Falls back gracefully if WebSocket is unavailable
 * - Returns connection state, last event, and a subscribe function
 */
export function useWebSocket() {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<WebSocketEvent | null>(null);
  const listenersRef = useRef<Map<string, Set<EventCallback>>>(new Map());

  // Subscribe to a specific event type
  const subscribe = useCallback((event: string, callback: EventCallback) => {
    if (!listenersRef.current.has(event)) {
      listenersRef.current.set(event, new Set());
    }
    listenersRef.current.get(event)!.add(callback);

    // If socket already exists, add the listener
    if (socketRef.current) {
      socketRef.current.off(event); // clear previous catch-all for this event
      socketRef.current.on(event, (data: unknown) => {
        const wsEvent: WebSocketEvent = {
          event,
          data,
          timestamp: new Date().toISOString(),
        };
        setLastEvent(wsEvent);
        const cbs = listenersRef.current.get(event);
        if (cbs) {
          cbs.forEach((cb) => cb(data));
        }
      });
    }

    // Cleanup function
    return () => {
      const cbs = listenersRef.current.get(event);
      if (cbs) {
        cbs.delete(callback);
        if (cbs.size === 0) {
          listenersRef.current.delete(event);
          socketRef.current?.off(event);
        }
      }
    };
  }, []);

  useEffect(() => {
    const wsUrl = API_BASE || window.location.origin;

    const socket = io(wsUrl, {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
      timeout: 5000,
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      setIsConnected(true);
    });

    socket.on("disconnect", () => {
      setIsConnected(false);
    });

    socket.on("connect_error", () => {
      setIsConnected(false);
    });

    // Re-register all current listeners on the new socket
    for (const [event] of listenersRef.current) {
      socket.on(event, (data: unknown) => {
        const wsEvent: WebSocketEvent = {
          event,
          data,
          timestamp: new Date().toISOString(),
        };
        setLastEvent(wsEvent);
        const cbs = listenersRef.current.get(event);
        if (cbs) {
          cbs.forEach((cb) => cb(data));
        }
      });
    }

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  return { isConnected, lastEvent, subscribe };
}
