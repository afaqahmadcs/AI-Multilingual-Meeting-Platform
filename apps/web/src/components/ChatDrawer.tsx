'use client';

import React, { useState } from 'react';
import { ChatMessage, SupportedLanguage } from '@linguameet/types';
import { X, Send, Sparkles, Languages } from 'lucide-react';

interface ChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  messages: ChatMessage[];
  currentUserId: string;
  userLanguage: SupportedLanguage;
  onSendMessage: (text: string) => void;
}

export const ChatDrawer: React.FC<ChatDrawerProps> = ({
  isOpen,
  onClose,
  messages,
  currentUserId,
  userLanguage,
  onSendMessage,
}) => {
  const [inputText, setInputText] = useState('');
  const [isTranslatingInput, setIsTranslatingInput] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    onSendMessage(inputText.trim());
    setInputText('');
  };

  const handleTranslateInputToUrdu = async () => {
    if (!inputText.trim()) return;
    setIsTranslatingInput(true);
    try {
      const res = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: inputText,
          from: 'en',
          to: 'ur',
        }),
      });
      const data = await res.json();
      if (data.success) {
        setInputText(data.translatedText);
      }
    } catch (err) {
      console.error('Chat translation error:', err);
    } finally {
      setIsTranslatingInput(false);
    }
  };

  return (
    <aside className="fixed top-0 right-0 w-80 sm:w-96 h-full z-50 bg-[#0F172A]/95 border-l border-slate-800 shadow-2xl flex flex-col backdrop-blur-xl animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-sm text-slate-100">Meeting Chat</h3>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-mono">
            Live
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-xs text-slate-400 space-y-2">
            <Languages className="w-8 h-8 text-indigo-400/50" />
            <p>No messages yet.</p>
            <p className="text-[11px] text-slate-400">
              Type in English or Urdu to chat with participants.
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.senderId === currentUserId;
            // Simple heuristic for Urdu characters
            const isUrdu = /[\u0600-\u06FF]/.test(msg.message);

            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
              >
                <span className="text-[10px] text-slate-400 px-1 mb-0.5">
                  {isMe ? 'You' : msg.senderName}
                </span>
                <div
                  className={`max-w-[85%] p-3 rounded-2xl text-xs ${
                    isMe
                      ? 'bg-indigo-600 text-white rounded-br-sm'
                      : 'bg-slate-800/90 text-slate-100 border border-slate-700/60 rounded-bl-sm'
                  } ${isUrdu ? 'urdu-text text-sm' : 'ltr-text'}`}
                >
                  {msg.message}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Input Box */}
      <form onSubmit={handleSubmit} className="p-3 border-t border-slate-800 bg-[#0B0F19]/90 space-y-2">
        <div className="flex items-center justify-between px-1">
          <span className="text-[10px] text-slate-400">
            Current Lang: <strong className="text-indigo-400 uppercase">{userLanguage}</strong>
          </span>
          <button
            type="button"
            onClick={handleTranslateInputToUrdu}
            disabled={isTranslatingInput || !inputText.trim()}
            className="text-[11px] text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition-colors disabled:opacity-40"
            title="Convert your English text to Urdu Nastaliq before sending"
          >
            <Sparkles className="w-3 h-3" />
            <span>Translate to اردو</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder={
              userLanguage === 'ur' ? 'یہاں پیغام لکھیں...' : 'Send a message...'
            }
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            className="flex-1 px-3 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          <button
            type="submit"
            disabled={!inputText.trim()}
            className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>
    </aside>
  );
};
