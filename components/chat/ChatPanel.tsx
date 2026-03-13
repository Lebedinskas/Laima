'use client';

import { useState, useRef, useEffect } from 'react';
import { useScheduleStore } from '@/hooks/useScheduleStore';
import { ChatMessage } from './ChatMessage';
import { ChatMessage as ChatMessageType } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';

export function ChatPanel() {
  const { chatMessages, addChatMessage, schedule, doctors, config } = useScheduleStore();
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatMessages]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: ChatMessageType = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: Date.now(),
    };
    addChatMessage(userMsg);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          schedule,
          doctors,
          config,
        }),
      });

      const data = await res.json();

      const assistantMsg: ChatMessageType = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response || 'Atsiprašau, nepavyko apdoroti užklausos.',
        timestamp: Date.now(),
      };
      addChatMessage(assistantMsg);

      // If the API returned schedule changes, apply them
      if (data.scheduleChanges) {
        const store = useScheduleStore.getState();
        for (const change of data.scheduleChanges) {
          store.assignDoctor(change.day, change.slot, change.doctorId);
        }
      }
    } catch {
      addChatMessage({
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Klaida: nepavyko pasiekti serverio. Patikrinkite ar nustatytas API raktas.',
        timestamp: Date.now(),
      });
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full border rounded-lg bg-white">
      <div className="px-4 py-3 border-b bg-gray-50 rounded-t-lg">
        <h3 className="font-semibold text-sm">Laima — asistentė</h3>
        <p className="text-xs text-muted-foreground">Rašykite lietuviškai apie grafiko pakeitimus</p>
      </div>

      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-3">
          {chatMessages.length === 0 && (
            <div className="text-center text-sm text-muted-foreground py-8">
              <p>Sveiki! Aš esu Laima.</p>
              <p className="mt-1">Pasakykite ką norėtumėte pakeisti grafike.</p>
              <p className="mt-3 text-xs">
                Pavyzdžiai:<br />
                „Tamašauskas negali 15 dieną"<br />
                „Sukeisk Deltuvą su Simaičiu penktadienį"<br />
                „Kas gali budėti 20 dieną už respubliką?"
              </p>
            </div>
          )}
          {chatMessages.map(msg => (
            <ChatMessage key={msg.id} message={msg} />
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 rounded-lg px-3 py-2 text-sm text-muted-foreground">
                Galvoju...
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="p-3 border-t">
        <div className="flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Rašykite čia..."
            className="resize-none min-h-[40px] max-h-[100px]"
            rows={1}
          />
          <Button
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            className="bg-blue-600 hover:bg-blue-700 shrink-0"
          >
            ↑
          </Button>
        </div>
      </div>
    </div>
  );
}
