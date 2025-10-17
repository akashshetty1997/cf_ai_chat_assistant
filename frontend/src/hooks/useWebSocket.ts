// frontend/src/hooks/useWebSocket.ts

import { useEffect, useRef, useState, useCallback } from "react";
import { Message, WebSocketMessage } from "../types";

const WS_URL = import.meta.env.VITE_WS_URL || "ws://127.0.0.1:8787";

export function useWebSocket(
  userId: string,
  onMessage: (message: Message) => void
) {
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;
  const isConnectingRef = useRef(false);
  const shouldReconnectRef = useRef(true);

  // Store onMessage in a ref to avoid dependency issues
  const onMessageRef = useRef(onMessage);

  // Update ref when onMessage changes
  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  const connect = useCallback(() => {
    // Prevent multiple simultaneous connection attempts
    if (
      isConnectingRef.current ||
      wsRef.current?.readyState === WebSocket.OPEN
    ) {
      console.log("Connection already in progress or established");
      return;
    }

    try {
      isConnectingRef.current = true;
      console.log("Connecting to WebSocket...", `${WS_URL}?userId=${userId}`);

      const ws = new WebSocket(`${WS_URL}?userId=${userId}`);

      ws.onopen = () => {
        console.log("✅ WebSocket connected successfully");
        setIsConnected(true);
        reconnectAttemptsRef.current = 0;
        isConnectingRef.current = false;
      };

      ws.onmessage = (event) => {
        try {
          console.log("📨 Received message:", event.data);
          const data: WebSocketMessage = JSON.parse(event.data);

          // Handle different message types
          if (data.type === "message" && data.content) {
            const message: Message = {
              id: data.messageId || crypto.randomUUID(),
              role: data.role || "assistant",
              content: data.content,
              timestamp: data.timestamp,
            };
            onMessageRef.current(message); // Use ref here
          } else if (data.type === "system" && data.content) {
            const message: Message = {
              id: crypto.randomUUID(),
              role: "system",
              content: data.content,
              timestamp: data.timestamp,
            };
            onMessageRef.current(message); // Use ref here
          } else if (data.type === "error" && data.content) {
            console.error("WebSocket error message:", data.content);
            const message: Message = {
              id: crypto.randomUUID(),
              role: "system",
              content: `Error: ${data.content}`,
              timestamp: data.timestamp,
            };
            onMessageRef.current(message); // Use ref here
          }
        } catch (error) {
          console.error("Failed to parse WebSocket message:", error);
        }
      };

      ws.onclose = (event) => {
        console.log(
          `WebSocket disconnected: code=${event.code}, reason=${event.reason}`
        );
        setIsConnected(false);
        isConnectingRef.current = false;
        wsRef.current = null;

        // Only reconnect if we should and haven't exceeded max attempts
        if (
          shouldReconnectRef.current &&
          reconnectAttemptsRef.current < maxReconnectAttempts
        ) {
          reconnectAttemptsRef.current++;
          const delay = Math.min(
            1000 * Math.pow(2, reconnectAttemptsRef.current),
            30000
          );
          console.log(
            `🔄 Reconnecting in ${delay}ms... (attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts})`
          );

          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, delay);
        } else if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
          console.error("❌ Max reconnection attempts reached");
        }
      };

      ws.onerror = (error) => {
        console.error("❌ WebSocket error:", error);
        isConnectingRef.current = false;
      };

      wsRef.current = ws;
    } catch (error) {
      console.error("Failed to create WebSocket:", error);
      setIsConnected(false);
      isConnectingRef.current = false;
    }
  }, [userId]); // Only userId as dependency now

  useEffect(() => {
    shouldReconnectRef.current = true;
    connect();

    return () => {
      console.log("🧹 Cleaning up WebSocket connection");
      shouldReconnectRef.current = false;

      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }

      if (wsRef.current) {
        wsRef.current.close(1000, "Component unmounting");
        wsRef.current = null;
      }

      isConnectingRef.current = false;
    };
  }, [connect]); // This should only run once now

  const sendMessage = useCallback((content: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const message = {
        content,
        timestamp: Date.now(),
      };
      console.log("📤 Sending message:", message);
      wsRef.current.send(JSON.stringify(message));
      return true;
    } else {
      console.warn(
        "⚠️ WebSocket not connected. ReadyState:",
        wsRef.current?.readyState
      );
      return false;
    }
  }, []);

  return {
    isConnected,
    sendMessage,
  };
}
