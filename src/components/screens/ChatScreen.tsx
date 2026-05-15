'use client';
import { useState, useRef, useEffect } from 'react';
import { theme as T } from '@/lib/theme';
import { CHAT_MESSAGES } from '@/lib/data';
import { Header, Avatar } from '@/components/ui';

interface Props {
  goto: (s: string) => void;
  fireToast: (msg: string, color?: string, textColor?: string) => void;
}

export function ChatScreen({ goto }: Props) {
  const [messages, setMessages] = useState(CHAT_MESSAGES);
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = () => {
    if (!input.trim()) return;
    setMessages(prev => [...prev, {
      from: 'Tú', side: 'me', text: input.trim(), time: '13:25',
    }]);
    setInput('');
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: T.bgSubtle, overflow: 'hidden' }}>
      <Header
        title="Chat: MEX vs RSA"
        onBack={() => goto('detalle')}
        right={
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: T.blue, animation: 'evo-pulse 1.4s ease-in-out infinite' }}/>
            <span style={{ fontSize: 12, fontWeight: 600, color: T.blue }}>12 en línea</span>
          </div>
        }
      />

      {/* Typing indicator */}
      <div style={{ padding: '6px 16px', fontSize: 11.5, color: T.muted, fontStyle: 'italic' }}>Juan está escribiendo...</div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {messages.map((msg, i) => {
          if (msg.side === 'system') {
            return (
              <div key={i} style={{
                alignSelf: 'center', background: T.blueSoft,
                color: T.blueDeep, borderRadius: 20, padding: '6px 14px',
                fontSize: 11.5, fontWeight: 600, letterSpacing: 0.2,
              }}>{msg.text}</div>
            );
          }
          const isMe = msg.side === 'me';
          return (
            <div key={i} style={{ display: 'flex', flexDirection: isMe ? 'row-reverse' : 'row', gap: 8, alignItems: 'flex-end' }}>
              {!isMe && (
                <Avatar initials={('avatar' in msg ? msg.avatar as string : undefined) ?? msg.from.slice(0,2)} size={32}/>
              )}
              <div style={{ maxWidth: '72%' }}>
                {!isMe && (
                  <div style={{ fontSize: 10.5, fontWeight: 600, color: T.muted, marginBottom: 3, paddingLeft: 2 }}>{msg.from}</div>
                )}
                <div style={{
                  padding: '10px 14px', borderRadius: isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                  background: isMe ? T.bgInk : '#fff',
                  color: isMe ? '#fff' : T.ink,
                  fontSize: 13.5, lineHeight: 1.5,
                  border: isMe ? 'none' : `1px solid ${T.border}`,
                  boxShadow: T.shadowSm,
                }}>{msg.text}</div>
                <div style={{ fontSize: 10, color: T.muted, marginTop: 3, paddingLeft: 2, textAlign: isMe ? 'right' : 'left' }}>{msg.time}</div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef}/>
      </div>

      {/* Input */}
      <div style={{
        padding: '10px 14px 14px',
        background: '#fff', borderTop: `1px solid ${T.border}`,
        display: 'flex', gap: 10, alignItems: 'flex-end',
      }}>
        <input
          value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') send(); }}
          placeholder="Escribe un mensaje..."
          style={{
            flex: 1, padding: '10px 14px', height: 44,
            border: `1.5px solid ${T.border}`, borderRadius: 22,
            fontSize: 14, color: T.ink, background: T.bgSoft,
            outline: 'none', transition: 'border-color 150ms',
          }}
          onFocus={e => e.currentTarget.style.borderColor = T.blue}
          onBlur={e => e.currentTarget.style.borderColor = T.border}
        />
        <button onClick={send} style={{
          width: 44, height: 44, borderRadius: '50%',
          background: T.blue, border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, boxShadow: T.shadowBlue,
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13"/>
            <polygon points="22 2 15 22 11 13 2 9 22 2"/>
          </svg>
        </button>
      </div>
    </div>
  );
}
