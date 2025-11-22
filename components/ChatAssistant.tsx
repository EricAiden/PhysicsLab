
import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { streamGeminiResponse } from '../services/geminiService';
import { Message, ChatState, CircuitState } from '../types';

interface Props {
    circuitContext?: {
        components: any[];
        wires: any[];
        error?: string;
    };
}

const ChatAssistant: React.FC<Props> = ({ circuitContext }) => {
  const [input, setInput] = useState('');
  const [chatState, setChatState] = useState<ChatState>({
    messages: [
      { role: 'model', text: '你好！我是你的物理实验助手。' }
    ],
    isLoading: false,
  });
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatState.messages]);

  const handleSend = async () => {
    if (!input.trim() || chatState.isLoading) return;

    const userMsg: Message = { role: 'user', text: input };
    setChatState(prev => ({
      ...prev,
      messages: [...prev.messages, userMsg],
      isLoading: true
    }));
    setInput('');

    try {
      setChatState(prev => ({
        ...prev,
        messages: [...prev.messages, { role: 'model', text: '' }]
      }));

      const stream = await streamGeminiResponse(
          userMsg.text, 
          chatState.messages, 
          circuitContext as CircuitState
      );
      
      for await (const chunk of stream) {
        const textChunk = chunk.text;
        setChatState(prev => {
          const newMessages = [...prev.messages];
          const lastMsg = newMessages[newMessages.length - 1];
          if (lastMsg.role === 'model') {
             lastMsg.text += textChunk;
          }
          return { ...prev, messages: newMessages };
        });
      }
    } catch (error) {
      setChatState(prev => ({
        ...prev,
        messages: [...prev.messages, { role: 'model', text: '网络开小差了，请稍后再试。', isError: true }]
      }));
    } finally {
      setChatState(prev => ({ ...prev, isLoading: false }));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center shadow-sm z-10">
        <Bot className="w-5 h-5 mr-2 text-indigo-600" />
        <h2 className="font-bold text-gray-800 text-sm">AI 助教</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-gray-50">
        {chatState.messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`flex max-w-[95%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 shadow-sm mt-1 ${msg.role === 'user' ? 'bg-indigo-600 ml-2' : 'bg-white mr-2'}`}>
                {msg.role === 'user' ? <User className="w-3 h-3 text-white" /> : <Bot className="w-4 h-4 text-indigo-600" />}
              </div>
              <div className={`px-3 py-2 rounded-xl text-xs leading-relaxed shadow-sm ${
                msg.role === 'user' 
                  ? 'bg-indigo-600 text-white rounded-tr-none' 
                  : 'bg-white text-gray-800 border border-gray-100 rounded-tl-none'
              }`}>
                <ReactMarkdown 
                    className="prose prose-sm max-w-none prose-p:my-1 prose-pre:bg-gray-100 prose-pre:text-gray-800"
                     components={{
                        code({className, children, ...props}) {
                            return <code className={`${className} bg-black/20 rounded px-1`} {...props}>{children}</code>
                        }
                    }}
                >
                    {msg.text}
                </ReactMarkdown>
              </div>
            </div>
          </div>
        ))}
        {chatState.isLoading && (
             <div className="flex justify-start">
                 <div className="bg-white px-3 py-2 rounded-2xl rounded-tl-none border border-gray-100 ml-8 flex items-center shadow-sm">
                     <Loader2 className="w-3 h-3 animate-spin text-indigo-600 mr-2" />
                     <span className="text-gray-400 text-xs">Thinking...</span>
                 </div>
             </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="p-3 bg-white border-t border-gray-200">
        <div className="relative flex items-center">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入问题..."
            className="w-full pl-3 pr-9 py-2 bg-gray-100 rounded-lg border-none focus:ring-1 focus:ring-indigo-500 focus:bg-white transition-all text-xs"
            disabled={chatState.isLoading}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || chatState.isLoading}
            className={`absolute right-1.5 p-1 rounded-md transition-colors ${
              !input.trim() || chatState.isLoading 
                ? 'text-gray-400' 
                : 'text-indigo-600 hover:bg-indigo-50'
            }`}
          >
            <Send className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatAssistant;
