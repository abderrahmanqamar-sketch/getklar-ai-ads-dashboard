import React, { useState, useRef, useEffect } from 'react';
import { Campaign } from '../types';
import { askQuestion } from '../lib/gemini';
import { Send, Bot, User, Loader2, Sparkles } from 'lucide-react';

interface ChatInterfaceProps {
  campaigns: Campaign[];
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export function ChatInterface({ campaigns }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', role: 'assistant', content: 'Hi! Ask me anything about your campaigns. For example: "Which campaign had the best ROAS?"' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userText = input.trim();
    setInput('');
    
    const newMessages = [...messages, { id: Date.now().toString(), role: 'user' as const, content: userText }];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      // Build history for context (exclude newest message we just added since askQuestion gets it separate)
      const history = newMessages.slice(0, -1).map(m => ({
        role: m.role,
        parts: [{ text: m.content }]
      }));
      
      const response = await askQuestion(userText, history, campaigns);
      
      setMessages(prev => [...prev, { 
        id: (Date.now() + 1).toString(), 
        role: 'assistant', 
        content: response 
      }]);
    } catch (error) {
      setMessages(prev => [...prev, { 
        id: (Date.now() + 1).toString(), 
        role: 'assistant', 
        content: 'Sorry, I encountered an error answering your question. Please try again.' 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden shadow-lg flex flex-col h-full h-[500px]">
      <div className="px-5 py-4 border-b border-slate-700 bg-slate-800/80 flex items-center justify-between">
        <div className="flex items-center gap-2">
           <div className="bg-purple-600/20 p-1.5 rounded-lg border border-purple-500/30">
               <Bot size={18} className="text-purple-400" />
           </div>
           <h2 className="text-lg font-bold text-white">Ask AI Assistant</h2>
        </div>
        <div className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded text-[10px] uppercase font-bold flex items-center gap-1">
            <Sparkles size={10} /> Online
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4 rounded-b-2xl scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`p-2 rounded-full shrink-0 h-8 w-8 flex items-center justify-center ${
              msg.role === 'user' ? 'bg-purple-600 text-white' : 'bg-slate-700 text-purple-400'
            }`}>
              {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
            </div>
            <div className={`px-4 py-2.5 rounded-2xl max-w-[85%] text-sm leading-relaxed shadow-sm ${
              msg.role === 'user' 
                ? 'bg-purple-600 text-white rounded-tr-sm' 
                : 'bg-slate-900 border border-slate-700 text-slate-300 rounded-tl-sm'
            }`}>
              {msg.content}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex gap-3">
            <div className="p-2 rounded-full shrink-0 h-8 w-8 flex items-center justify-center bg-slate-700 text-purple-400">
               <Bot size={16} />
            </div>
            <div className="px-4 py-3 rounded-2xl bg-slate-900 border border-slate-700 text-slate-400 rounded-tl-sm flex items-center gap-2">
              <Loader2 size={14} className="animate-spin" /> Thinking...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 bg-slate-800/90 border-t border-slate-700 mt-auto">
        <form onSubmit={handleSubmit} className="relative flex items-center">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your campaigns..."
            className="w-full bg-slate-900 border border-slate-700 rounded-full pl-5 pr-12 py-3 text-sm text-white focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all placeholder:text-slate-500"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="absolute right-2 p-2 bg-purple-600 hover:bg-purple-500 text-white rounded-full disabled:opacity-50 disabled:hover:bg-purple-600 transition-colors"
          >
            <Send size={16} />
          </button>
        </form>
      </div>
    </div>
  );
}
