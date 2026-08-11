"use client";

import { useState } from "react";
import styles from "./ChatWidget.module.css";

const CHAT_FUNCTION_URL =
  "https://us-central1-admisun.cloudfunctions.net/admisunChat";

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const toggleChat = () => {
    setOpen((prev) => !prev);
  };

  const sendMessage = async () => {
    const message = input.trim();

    if (!message || loading) return;

    setMessages((prev) => [...prev, { role: "user", text: message }]);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch(CHAT_FUNCTION_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error || `Request failed with status ${response.status}`
        );
      }

      if (!data?.response) {
        throw new Error("The AI returned an empty response.");
      }

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: data.response,
        },
      ]);
    } catch (error) {
      console.error("Admisun AI error:", error);

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: "Sorry, I couldn't generate a response right now. Please try again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button
        onClick={toggleChat}
        className={styles.floatingButton}
        aria-label="Open chat"
      >
        💬
      </button>

      {open && (
        <div className={styles.chatContainer}>
          <div className={styles.chatHeader}>Admisun AI</div>

          <div className={styles.chatMessages}>
            {messages.map((msg, index) => (
              <div
                key={index}
                className={
                  msg.role === "user"
                    ? styles.userMessage
                    : styles.assistantMessage
                }
              >
                {msg.text}
              </div>
            ))}

            {loading && (
              <div className={styles.loadingMessage}>…</div>
            )}
          </div>

          <div className={styles.chatInputWrapper}>
            <input
              type="text"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  sendMessage();
                }
              }}
              placeholder="Type a message…"
              className={styles.chatInput}
              disabled={loading}
            />

            <button
              onClick={sendMessage}
              disabled={loading || !input.trim()}
              className={styles.sendButton}
            >
              Send
            </button>
          </div>
        </div>
      )}
    </div>
  );
}