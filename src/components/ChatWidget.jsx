"use client";
// src/components/ChatWidget.jsx
import { useState } from 'react';

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
      <button
        onClick={toggleChat}
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          background: '#4F46E5',
          color: '#fff',
          border: 'none',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          cursor: 'pointer',
        }}
        aria-label="Open chat"
      >
        💬
      </button>
      {open && (
        <div
          style={{
            position: 'fixed',
            bottom: '90px',
            right: '24px',
            width: '320px',
            maxHeight: '480px',
            background: '#fff',
            borderRadius: '12px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div style={{ padding: '12px', borderBottom: '1px solid #eee', fontWeight: 'bold' }}>
            Admisun AI
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
            {messages.map((msg, idx) => (
              <div key={idx} style={{ marginBottom: '8px', textAlign: msg.role === 'user' ? 'right' : 'left' }}>
                <span style={{
                  display: 'inline-block',
                  background: msg.role === 'user' ? '#4F46E5' : '#f1f1f1',
                  color: msg.role === 'user' ? '#fff' : '#000',
                  borderRadius: '8px',
                  padding: '6px 10px',
                  maxWidth: '80%',
                  wordBreak: 'break-word',
                }}>
                  {msg.text}
                </span>
              </div>
            ))}
            {loading && (
              <div style={{ textAlign: 'left' }}>
                <span style={{ background: '#f1f1f1', padding: '6px 10px', borderRadius: '8px' }}>…</span>
              </div>
            )}
          </div>
          <div style={{ display: 'flex', borderTop: '1px solid #eee', padding: '8px' }}>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="Type a message…"
              style={{ flex: 1, border: '1px solid #ccc', borderRadius: '4px', padding: '6px' }}
            />
            <button
              onClick={sendMessage}
              disabled={loading}
              style={{ marginLeft: '4px', padding: '6px 12px', background: '#4F46E5', color: '#fff', border: 'none', borderRadius: '4px' }}
            >
              Send
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
