import { useState } from 'react';
import { useAuth } from '../AuthContext';

export default function Chat() {
  const { call } = useAuth();
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState([{ role: 'assistant', content: 'Hi! Ask me how to donate, how to claim food, or about food safety.' }]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);

  const send = async (e) => {
    e.preventDefault();
    if (!text.trim() || busy) return;
    const next = [...msgs, { role: 'user', content: text.trim() }];
    setMsgs(next); setText(''); setBusy(true);
    try {
      // the API needs the conversation to start with a user turn
      const { reply } = await call('/ai/chat', { method: 'POST', body: { messages: next.slice(1) } });
      setMsgs([...next, { role: 'assistant', content: reply }]);
    } catch (err) {
      setMsgs([...next, { role: 'assistant', content: 'Sorry, something went wrong: ' + err.message }]);
    } finally { setBusy(false); }
  };

  return (
    <div className="fixed bottom-4 right-4 z-10">
      {open && (
        <section aria-label="Chat assistant" className="mb-2 flex h-96 w-80 max-w-[calc(100vw-2rem)] flex-col border-2 border-ink bg-white">
          <div className="flex-1 space-y-2 overflow-y-auto p-3 text-sm" aria-live="polite">
            {msgs.map((m, i) => (
              <p key={i} className={m.role === 'user' ? 'ml-8 bg-crate/30 p-2' : 'mr-8 bg-leaf/10 p-2'}>{m.content}</p>
            ))}
            {busy && <p className="italic">Thinking...</p>}
          </div>
          <form onSubmit={send} className="flex border-t-2 border-ink">
            <input className="input flex-1 !border-0" aria-label="Your message" value={text} onChange={(e) => setText(e.target.value)} placeholder="Type a question" />
            <button className="btn !border-0">Send</button>
          </form>
        </section>
      )}
      <button className="btn btn-dark float-right" onClick={() => setOpen(!open)} aria-expanded={open}>{open ? 'Close chat' : 'Ask AI helper'}</button>
    </div>
  );
}
