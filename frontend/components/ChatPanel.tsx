"use client";

import { useEffect, useRef, useState } from "react";
import { NDAFormValues } from "@/lib/nda-template";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface Props {
  values: NDAFormValues;
  onChange: (values: NDAFormValues) => void;
  onDownload: () => void;
  downloading: boolean;
}

export default function ChatPanel({ values, onChange, onDownload, downloading }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [errorText, setErrorText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const valuesRef = useRef(values);
  const hasGreeted = useRef(false);

  useEffect(() => {
    valuesRef.current = values;
  }, [values]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingText]);

  async function fetchChat(msgs: Message[]) {
    setStreaming(true);
    setStreamingText("");
    setErrorText("");

    let accumulated = "";

    try {
      const response = await fetch("/api/chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: msgs }),
      });

      if (!response.body) throw new Error("No response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // SSE messages are separated by double newline
        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? "";

        for (const part of parts) {
          const lines = part.trim().split("\n");
          let eventType = "";
          let dataStr = "";

          for (const line of lines) {
            if (line.startsWith("event: ")) eventType = line.slice(7);
            else if (line.startsWith("data: ")) dataStr = line.slice(6);
          }

          if (!eventType || !dataStr) continue;

          if (eventType === "token") {
            const { text } = JSON.parse(dataStr);
            accumulated += text;
            setStreamingText(accumulated);
          } else if (eventType === "fields") {
            const fields = JSON.parse(dataStr);
            onChange({ ...valuesRef.current, ...fields });
          } else if (eventType === "error") {
            const { text } = JSON.parse(dataStr);
            setErrorText(text);
          }
        }
      }
    } catch {
      setErrorText("Connection error. Please try again.");
    }

    if (accumulated) {
      setMessages((prev) => [...prev, { role: "assistant", content: accumulated }]);
    }
    setStreamingText("");
    setStreaming(false);
  }

  useEffect(() => {
    if (hasGreeted.current) return;
    hasGreeted.current = true;
    fetchChat([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSend() {
    const text = input.trim();
    if (!text || streaming) return;

    const userMsg: Message = { role: "user", content: text };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput("");

    await fetchChat(updatedMessages);
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-5 border-b border-gray-100 flex-shrink-0">
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-semibold" style={{ color: "#032147" }}>
            NDA Assistant
          </h1>
          {streaming && (
            <span
              className="w-2 h-2 rounded-full animate-pulse"
              style={{ backgroundColor: "#209dd7" }}
            />
          )}
        </div>
        <p className="text-xs mt-0.5" style={{ color: "#888888" }}>
          Chat to fill in your Mutual NDA
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                msg.role === "user"
                  ? "text-white rounded-br-sm"
                  : "bg-white border border-gray-100 shadow-sm text-gray-800 rounded-bl-sm"
              }`}
              style={msg.role === "user" ? { backgroundColor: "#209dd7" } : {}}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {/* Streaming bubble */}
        {(streaming || streamingText) && (
          <div className="flex justify-start">
            <div className="max-w-[85%] bg-white border border-gray-100 shadow-sm rounded-2xl rounded-bl-sm px-3.5 py-2.5 text-sm leading-relaxed text-gray-800 whitespace-pre-wrap">
              {streamingText ? (
                streamingText
              ) : (
                <span className="flex items-center gap-1">
                  <span
                    className="w-1.5 h-1.5 rounded-full animate-bounce"
                    style={{ backgroundColor: "#888888", animationDelay: "0ms" }}
                  />
                  <span
                    className="w-1.5 h-1.5 rounded-full animate-bounce"
                    style={{ backgroundColor: "#888888", animationDelay: "150ms" }}
                  />
                  <span
                    className="w-1.5 h-1.5 rounded-full animate-bounce"
                    style={{ backgroundColor: "#888888", animationDelay: "300ms" }}
                  />
                </span>
              )}
            </div>
          </div>
        )}

        {/* Error bubble — shown but not committed to conversation history */}
        {errorText && (
          <div className="flex justify-start">
            <div className="max-w-[85%] rounded-2xl rounded-bl-sm px-3.5 py-2.5 text-sm leading-relaxed border"
              style={{ backgroundColor: "#fff3f3", borderColor: "#fca5a5", color: "#dc2626" }}>
              {errorText}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input + actions */}
      <div className="flex-shrink-0 border-t border-gray-100 p-4 space-y-3">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Type a message…"
            disabled={streaming}
            className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:opacity-50"
          />
          <button
            onClick={handleSend}
            disabled={streaming || !input.trim()}
            className="px-4 py-2 text-white text-sm font-medium rounded-lg disabled:opacity-50 transition-opacity hover:opacity-90"
            style={{ backgroundColor: "#209dd7" }}
          >
            Send
          </button>
        </div>

        <button
          onClick={onDownload}
          disabled={downloading}
          className="w-full text-white text-sm font-medium py-2.5 rounded-lg transition-opacity hover:opacity-90 disabled:opacity-50"
          style={{ backgroundColor: "#753991" }}
        >
          {downloading ? "Generating PDF…" : "Download PDF"}
        </button>
      </div>
    </div>
  );
}
