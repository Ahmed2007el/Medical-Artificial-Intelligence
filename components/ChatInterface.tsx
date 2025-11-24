import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage, Language } from '../types';

interface ChatInterfaceProps {
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  isLoading: boolean;
  language: Language;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ messages, onSendMessage, isLoading, language }) => {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    onSendMessage(input);
    setInput('');
  };

  const isRtl = language === Language.Arabic;

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
      <div className="p-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex justify-between items-center">
        <h3 className="font-semibold text-slate-800 dark:text-white">
          <i className="fa-solid fa-comments mr-2 text-blue-500"></i>
          {language === Language.Arabic ? 'المساعد الطبي' : 'Medical Assistant'}
        </h3>
        <span className="text-xs text-slate-500 bg-slate-200 dark:bg-slate-700 px-2 py-1 rounded">Gemini 2.5</span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 dark:bg-slate-900/30">
        {messages.length === 0 && (
          <div className="text-center text-slate-400 mt-10">
            <i className="fa-regular fa-comment-dots text-4xl mb-2 opacity-50"></i>
            <p className="text-sm">
              {language === Language.Arabic 
                ? 'اسأل أي سؤال حول هذا المصطلح...' 
                : 'Ask any questions about this term...'}
            </p>
          </div>
        )}
        
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-sm ${
                msg.role === 'user'
                  ? 'bg-blue-600 text-white rounded-br-none'
                  : 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-100 dark:border-slate-600 rounded-bl-none'
              } ${isRtl && msg.role !== 'user' ? 'text-right' : ''}`}
            >
              {msg.text}
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white dark:bg-slate-700 rounded-2xl rounded-bl-none px-4 py-4 border border-slate-100 dark:border-slate-600 flex space-x-1">
              <div className="typing-dot w-2 h-2 bg-blue-500 rounded-full"></div>
              <div className="typing-dot w-2 h-2 bg-blue-500 rounded-full"></div>
              <div className="typing-dot w-2 h-2 bg-blue-500 rounded-full"></div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="p-3 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700">
        <div className="flex gap-2 relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={language === Language.Arabic ? 'اكتب سؤالك هنا...' : 'Type your question here...'}
            className={`flex-1 pl-4 pr-10 py-2.5 bg-slate-100 dark:bg-slate-900 border border-transparent focus:border-blue-500 focus:bg-white dark:focus:bg-black rounded-lg outline-none text-sm transition-all text-slate-900 dark:text-white ${isRtl ? 'text-right' : 'text-left'}`}
            dir={isRtl ? 'rtl' : 'ltr'}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 w-8 h-8 flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white rounded-full disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <i className={`fa-solid ${isRtl ? 'fa-arrow-left' : 'fa-arrow-right'} text-xs`}></i>
          </button>
        </div>
      </form>
    </div>
  );
};

export default ChatInterface;