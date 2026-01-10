
import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage, CodexEntry, AIConfig, WritingLanguage, Scene, Chapter, StoryStructureContext, NarrativePerspective, TargetAudience, WritingTone, StoryTheme } from '../types';
import { Icons } from '../constants';
import { chatWithCodex } from '../services/aiService';
import { useI18n } from '../i18n';
import { useTheme } from '../theme';

interface ChatPanelProps {
  codex: CodexEntry[];
  aiConfig: AIConfig;
  writingLanguage: WritingLanguage;
  projectInfo?: {
    title?: string;
    genre?: string;
    subgenre?: string;
    description?: string;
    targetAudience?: TargetAudience;
    narrativePerspective?: NarrativePerspective;
    writingTone?: WritingTone;
    themes?: StoryTheme[];
  };
  structureContext?: StoryStructureContext;
  activeScene?: Scene;
  activeChapter?: Chapter;
  allChapters?: Chapter[];
  pendingSceneReference?: string;
  onSceneReferenceInserted?: () => void;
}

const ChatPanel: React.FC<ChatPanelProps> = ({ codex, aiConfig, writingLanguage, projectInfo, structureContext, activeScene, activeChapter, allChapters, pendingSceneReference, onSceneReferenceInserted }) => {
  const { t } = useI18n();
  const { colorClasses } = useTheme();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // Initialize welcome message when language changes or first load
  useEffect(() => {
    if (messages.length === 0) {
        setMessages([{
            id: '1',
            role: 'model',
            text: t('chat.welcome'),
            timestamp: Date.now()
        }]);
    }
  }, [t, messages.length]);

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (pendingSceneReference && !loading) {
      setInput(prev => {
        const cursorPos = textareaRef.current?.selectionStart || prev.length;
        const before = prev.slice(0, cursorPos);
        const after = prev.slice(cursorPos);
        return before + pendingSceneReference + ' ' + after;
      });
      onSceneReferenceInserted?.();

      setTimeout(() => {
        textareaRef.current?.focus();
      }, 0);
    }
  }, [pendingSceneReference, loading, onSceneReferenceInserted]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: input,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const responseText = await chatWithCodex(
          messages.concat(userMsg),
          input,
          codex,
          writingLanguage,
          aiConfig,
          projectInfo,
          structureContext,
          activeScene,
          activeChapter,
          allChapters
      );
      
      const aiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: responseText,
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch (e) {
      // Error handled in service, but we show a generic message
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 w-80">
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <h2 className="text-slate-800 dark:text-slate-100 font-bold flex items-center gap-2">
          <Icons.Sparkles /> {t('chat.title')}
        </h2>
        <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-green-500 inline-block"></span>
          {t('chat.active')} ({codex.length} {t('chat.entries')})
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={scrollRef}>
        {messages.map((msg) => (
          <div 
            key={msg.id} 
            className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div 
              className={`max-w-[90%] rounded-lg p-3 text-sm leading-relaxed ${
                msg.role === 'user' 
                  ? `${colorClasses.primary} text-white rounded-br-none` 
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-bl-none border border-slate-200 dark:border-slate-700'
              }`}
            >
              {msg.text}
            </div>
            <span className="text-[10px] text-slate-500 dark:text-slate-600 mt-1">
               {msg.role === 'user' ? t('chat.you') : t('chat.model')}
            </span>
          </div>
        ))}
        {loading && (
           <div className="flex justify-start">
             <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-3 rounded-bl-none border border-slate-200 dark:border-slate-700">
               <div className="flex gap-1">
                 <div className="w-2 h-2 bg-slate-400 dark:bg-slate-500 rounded-full animate-bounce"></div>
                 <div className="w-2 h-2 bg-slate-400 dark:bg-slate-500 rounded-full animate-bounce delay-75"></div>
                 <div className="w-2 h-2 bg-slate-400 dark:bg-slate-500 rounded-full animate-bounce delay-150"></div>
               </div>
             </div>
           </div>
        )}
      </div>

      <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
        <div className="relative">
          <textarea
            ref={textareaRef}
             className={`w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg pl-3 pr-10 py-2 text-sm text-slate-900 dark:text-slate-200 focus:outline-none ${colorClasses.ring} resize-none`}
             rows={3}
             placeholder={t('chat.placeholder')}
             value={input}
             onChange={(e) => setInput(e.target.value)}
             onKeyDown={(e) => {
               if (e.key === 'Enter' && !e.shiftKey) {
                 e.preventDefault();
                 handleSend();
               }
             }}
           />
          <button 
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className={`absolute bottom-2 right-2 p-1.5 ${colorClasses.primary} ${colorClasses.hover} text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors`}
          >
            <Icons.Send />
          </button>
        </div>
         <p className="text-[10px] text-slate-400 dark:text-slate-600 text-center mt-2 flex justify-center items-center gap-1">
           <Icons.Server /> {aiConfig.provider === 'gemini' ? 'Gemini 3 Flash' : 'DeepSeek V3'}
         </p>
         {allChapters && allChapters.length > 0 && (
           <p className="text-[10px] text-slate-300 dark:text-slate-700 text-center mt-1">
             💡 引用示例：@第一章.第二scene
           </p>
         )}
      </div>
    </div>
  );
};

export default ChatPanel;
