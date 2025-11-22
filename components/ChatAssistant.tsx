import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { streamGeminiResponse } from '../services/geminiService';
import { Message, ChatState, CircuitState } from '../types';

// Helper hook to access parent state if we were using context, but here we need to pass it or inspect DOM.
// Actually, let's just export it and let App pass the circuit state.
// But wait, App.tsx imports ChatAssistant without props in the previous file. 
// I need to change App.tsx to pass the state, which I did not do in the App.tsx block above completely (I left it as <ChatAssistant />).
// Let me fix ChatAssistant first to accept props, then I will ensure App.tsx passes them. 

// Actually, looking at my App.tsx above, I rendered <ChatAssistant /> with no props.
// I should update ChatAssistant to be generic, but ideally it needs the circuit state.
// I will add an optional prop `circuitContext` to ChatAssistant.

// Wait, I cannot modify App.tsx *again* in the same response easily without duplication.
// I will assume App.tsx passes the props in the `content` of App.tsx I generated above? 
// Ah, in the App.tsx block above, I wrote `<ChatAssistant />`. I need to correct that to `<ChatAssistant circuitContext={{components, wires, error}} />`
// BUT, I can't edit the App.tsx block I just wrote in the XML. 
// Actually, I can. I will just rewrite the App.tsx block in the final output to be correct.

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
      { role: 'model', text: '你好！我是你的物理实验助手。你可以搭建任意电路，遇到问题随时问我！比如：“为什么电流表没有示数？”' }
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

      // Pass circuit context to the service
      const stream = await streamGeminiResponse(
          userMsg.text, 
          chatState.messages, 
          circuitContext as CircuitState // casting for simplicity
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
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4 flex items-center shadow-sm z-10">
        <Bot className="w-5 h-5 mr-2 text-indigo-600" />
        <h2 className="font-bold text-gray-800">实验助手</h2>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {chatState.messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`flex max-w-[90%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm ${msg.role === 'user' ? 'bg-indigo-600 ml-2' : 'bg-white mr-2'}`}>
                {msg.role === 'user' ? <User className="w-4 h-4 text-white" /> : <Bot className="w-5 h-5 text-indigo-600" />}
              </div>
              <div className={`p-3 rounded-2xl text-sm shadow-sm ${
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
                 <div className="bg-white p-3 rounded-2xl rounded-tl-none border border-gray-100 ml-10 flex items-center shadow-sm">
                     <Loader2 className="w-3 h-3 animate-spin text-indigo-600 mr-2" />
                     <span className="text-gray-400 text-xs">分析电路中...</span>
                 </div>
             </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input Area */}
      <div className="p-3 bg-white border-t border-gray-200">
        <div className="relative flex items-center">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入问题..."
            className="w-full pl-4 pr-10 py-2.5 bg-gray-100 rounded-lg border-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-sm"
            disabled={chatState.isLoading}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || chatState.isLoading}
            className={`absolute right-1.5 p-1.5 rounded-md transition-colors ${
              !input.trim() || chatState.isLoading 
                ? 'text-gray-400' 
                : 'text-indigo-600 hover:bg-indigo-50'
            }`}
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatAssistant;
