"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:8000";

export default function Home() {
  const [userId, setUserId] = useState("1");
  const [messages, setMessages] = useState<string[]>([]);
  const [input, setInput] = useState("");
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  const connect = useCallback(() => {
    if (wsRef.current) wsRef.current.close();
    const ws = new WebSocket(`${WS_URL}/ws?token=${userId}`);
    ws.onopen = () => setConnected(true);
    ws.onclose = () => setConnected(false);
    ws.onmessage = (e) => setMessages((prev) => [...prev, e.data]);
    wsRef.current = ws;
  }, [userId]);

  useEffect(() => {
    connect();
    return () => wsRef.current?.close();
  }, [connect]);

  const send = () => {
    if (wsRef.current?.readyState === WebSocket.OPEN && input.trim()) {
      wsRef.current.send(JSON.stringify({ content: input }));
      setInput("");
    }
  };

  return (
    <div className="flex flex-col h-screen max-w-lg mx-auto p-4 gap-4">
      <h1 className="text-xl font-bold">WebSocket Test</h1>

      <div className="flex items-center gap-2">
        <label className="text-sm">User ID:</label>
        <input
          type="text"
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          className="border rounded px-2 py-1 w-16"
        />
        <button onClick={connect} className="text-sm underline">
          Reconnect
        </button>
        <span
          className={`text-sm ${connected ? "text-green-600" : "text-red-600"}`}
        >
          {connected ? "Connected" : "Disconnected"}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto border rounded p-3 bg-zinc-50 dark:bg-zinc-900 text-sm font-mono whitespace-pre-wrap">
        {messages.length === 0 && (
          <span className="text-zinc-400">No messages yet.</span>
        )}
        {messages.map((m, i) => (
          <div key={i}>{m}</div>
        ))}
      </div>

      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Type a message..."
          className="flex-1 border rounded px-3 py-2"
        />
        <button
          onClick={send}
          className="bg-blue-600 text-white rounded px-4 py-2"
        >
          Send
        </button>
      </div>
    </div>
  );
}
