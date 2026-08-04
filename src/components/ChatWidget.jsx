"use client";
// src/components/ChatWidget.jsx
import { useState } from 'react';
import styles from './ChatWidget.module.css';

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const toggleChat = () => setOpen(!open);

  const sendMessage = async () => {
    if (!input.trim()) return;
    const userMsg = { role: 'user', text: input };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg.text }),
      });
      const data = await res.json();
      if (data.response) {
        setMessages((prev) => [...prev, { role: 'assistant', text: data.response }]);
      } else {
        setMessages((prev) => [...prev, { role: 'assistant', text: 'Error: no response' }]);
      }
    } catch (e) {
      console.error(e);
      setMessages((prev) => [...prev, { role: 'assistant', text: 'Error: request failed' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button onClick={toggleChat} className={styles.floatingButton} aria-label="Open chat">
        💬
      </button>
      {open && (
        <div className={styles.chatContainer}>
          <div className={styles.chatHeader}>Admisun AI</div>
          <div className={styles.chatMessages}>
            {messages.map((msg, idx) => (
              <div key={idx} className={msg.role === 'user' ? styles.userMessage : styles.assistantMessage}>
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
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="Type a message…"
              className={styles.chatInput}
            />
            <button onClick={sendMessage} disabled={loading} className={styles.sendButton}>Send</button>
          </div>
        </div>
      )}
    </div>
  );
}
