'use client';

import { useState, useRef, useEffect } from 'react';
import { useScheduleStore } from '@/hooks/useScheduleStore';
import { ChatMessage } from './ChatMessage';
import { ChatMessage as ChatMessageType } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';

export function ChatPanel() {
  const { chatMessages, addChatMessage, schedule, doctors, config, stats, changeHistory, errors, rules } = useScheduleStore();
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
          history: chatMessages.slice(-20).map(m => ({ role: m.role, content: m.content })),
          schedule,
          doctors,
          config,
          stats,
          changeHistory: changeHistory.filter(r => r.source !== 'generate').slice(-50),
          errors,
          rules,
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

      // Apply all actions returned by the API
      const store = useScheduleStore.getState();

      if (data.scheduleChanges) {
        for (const change of data.scheduleChanges) {
          store.assignDoctor(change.day, change.slot, change.doctorId, 'chat');
        }
      }

      if (data.doctorUpdates) {
        for (const upd of data.doctorUpdates) {
          store.updateDoctor(upd.doctorId, upd.updates);
        }
      }

      if (data.vacations) {
        for (const vac of data.vacations) {
          const doctor = store.doctors.find(d => d.id === vac.doctorId);
          if (doctor) {
            const newDates = [...new Set([...doctor.unavailableDates, ...vac.dates])].sort();
            store.updateDoctor(vac.doctorId, { unavailableDates: newDates });
          }
        }
      }

      if (data.unavailables) {
        for (const u of data.unavailables) {
          const doctor = store.doctors.find(d => d.id === u.doctorId);
          if (doctor && !doctor.unavailableDates.includes(u.date)) {
            store.updateDoctor(u.doctorId, {
              unavailableDates: [...doctor.unavailableDates, u.date].sort(),
            });
          }
        }
      }

      if (data.ruleUpdates) {
        for (const ru of data.ruleUpdates) {
          store.updateRule(ru.ruleId, ru.updates);
        }
      }

      if (data.addRules) {
        for (const rule of data.addRules) {
          store.addRule(rule);
        }
      }

      if (data.removeRules) {
        for (const ruleId of data.removeRules) {
          store.removeRule(ruleId);
        }
      }

      if (data.regenerate) {
        store.generate();
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
      <div className="px-4 py-3 border-b bg-gradient-to-r from-blue-50 to-indigo-50 rounded-t-lg">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <h3 className="font-semibold text-sm">Laima — budėjimų asistentė</h3>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">Grafikų pakeitimai, keitimai, patikrinimai</p>
      </div>

      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-3">
          {chatMessages.length === 0 && (
            <div className="text-center text-sm text-muted-foreground py-6">
              <p className="font-medium text-gray-700">Sveiki! Aš esu Laima.</p>
              <p className="mt-1 text-gray-500">Padėsiu su budėjimų grafiku.</p>
              <div className="mt-4 space-y-1.5 text-xs text-center max-w-[260px] mx-auto">
                <p className="font-medium text-gray-600 text-center mb-2">Ką galiu padaryti:</p>
                <div className="bg-gray-50 rounded-md px-3 py-1.5 text-gray-600">
                  „Tamašauskas negali 15 dieną"
                </div>
                <div className="bg-gray-50 rounded-md px-3 py-1.5 text-gray-600">
                  „Sukeisk Deltuvą su Simaičiu"
                </div>
                <div className="bg-gray-50 rounded-md px-3 py-1.5 text-gray-600">
                  „Kas gali budėti 20 d. už respubliką?"
                </div>
              </div>
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
