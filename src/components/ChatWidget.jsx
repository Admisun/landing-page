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
    setOpen((previous) => !previous);
  };

  const sendMessage = async () => {
    const trimmedMessage = input.trim();

    if (!trimmedMessage || loading) {
      return;
    }

    const userMsg = {
      role: "user",
      text: trimmedMessage,
    };

    setMessages((previous) => [...previous, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch(CHAT_FUNCTION_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: trimmedMessage,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error || `Request failed with status ${response.status}`
        );
      }

      if (data?.response) {
        setMessages((previous) => [
          ...previous,
          {
            role: "assistant",
            text: data.response,
          },
        ]);
      } else {
        throw new Error("No response returned from Admisun AI.");
      }
    } catch (error) {
      console.error("Admisun AI error:", error);

      setMessages((previous) => [
        ...previous,
        {
          role: "assistant",
          text: "Sorry, I couldn't process that request right now. Please try again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button
        type="button"
        onClick={toggleChat}
        className={styles.floatingButton}
        aria-label="Open Admisun AI chat"
      >
        💬
      </button>

      {open && (
        <div className={styles.chatContainer}>
          <div className={styles.chatHeader}>
            Admisun AI
          </div>

          <div className={styles.chatMessages}>
            {messages.length === 0 && (
              <div className={styles.assistantMessage}>
                Hi! I&apos;m Admisun AI. How can I help with your university
                admissions?
              </div>
            )}

            {messages.map((message, index) => (
              <div
                key={`${message.role}-${index}`}
                className={
                  message.role === "user"
                    ? styles.userMessage
                    : styles.assistantMessage
                }
              >
                {message.text}
              </div>
            ))}

            {loading && (
              <div className={styles.loadingMessage}>
                …
              </div>
            )}
          </div>

          <div className={styles.chatInputWrapper}>
            <input
              type="text"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  sendMessage();
                }
              }}
              placeholder="Ask about admissions..."
              className={styles.chatInput}
              disabled={loading}
            />

            <button
              type="button"
              onClick={sendMessage}
              disabled={loading || !input.trim()}
              className={styles.sendButton}
            >
              {loading ? "..." : "Send"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}