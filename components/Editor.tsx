
import React, { useState, useEffect, useCallback, useMemo, useRef, forwardRef, useImperativeHandle } from 'react';
import { Scene, CodexEntry, AIConfig, WritingLanguage, KeyboardConfig, CodexCategory, Chapter, StoryStructureContext, ExplicitAction, NarrativePerspective, TargetAudience, WritingTone, StoryTheme } from '../types';
import { generateStoryContinuation, generateSmartContinuation, extractEntitiesFromText, generateImageDescription, generateImage } from '../services/aiService';
import { Icons, AI_CONTINUATION_MODES, CODEX_HIGHLIGHT_COLORS } from '../constants';
import { useI18n } from '../i18n';
import { useTheme } from '../theme';

export interface EditorRef {
  scrollToPage: (pageIndex: number) => void;
}

interface EditorProps {
  activeChapter: Chapter;
  activeScene: Scene;
  onSceneUpdate: (scene: Scene) => void;
  onCreateScene?: (title: string, content: string) => void;
  onCreateChapter?: (title: string, firstSceneTitle: string, content: string) => void;
  onCodexAdd?: (entry: CodexEntry) => void;
  onCodexAddOrUpdate?: (entry: CodexEntry) => void;
  onClearCodex?: () => void;
  onActivePageChange?: (pageIndex: number) => void;
  onPageCountChange?: (pageCount: number) => void;

  codex: CodexEntry[];
  aiConfig: AIConfig;
  writingLanguage: WritingLanguage;
  shortcuts: KeyboardConfig;
  projectInfo: {
    title: string;
    genre: string;
    subgenre?: string;
    description?: string;
    targetAudience?: TargetAudience;
    narrativePerspective?: NarrativePerspective;
    writingTone?: WritingTone;
    themes?: StoryTheme[];
  };
}

const PAGE_HEIGHT_PX = 1123; // A4 height in pixels at 96 DPI
const FILL_RATIO = 0.95;
const MAX_PAGE_CONTENT_HEIGHT = PAGE_HEIGHT_PX * FILL_RATIO;

// Helper to generate fallback scene titles based on genre
const generateFallbackSceneTitle = (sceneIndex: number, genre?: string): string => {
  const titlesByGenre: Record<string, string[]> = {
    'Fantasy': ['The Hidden Path', 'Whispers in the Dark', 'The Ancient Promise', 'Shadows Rising', 'The Fateful Encounter'],
    '玄幻奇幻': ['隐秘之路', '黑暗低语', '远古誓言', '阴影升起', '宿命相遇'],
    'Xianxia/Wuxia': ['Breakthrough', 'The Challenge', 'Sword Drawn', 'Cultivation Progress', 'The Duel'],
    '仙侠武侠': ['突破', '挑战', '拔剑', '修为精进', '决战'],
    'Urban': ['A New Day', 'Unexpected Visitor', 'Late Night Call', 'The Decision', 'Changes'],
    '都市': ['新的一天', '不速之客', '深夜来电', '决定', '变化'],
    'Sci-Fi/Apocalypse': ['Signal Received', 'The Discovery', 'System Alert', 'Beyond the Wall', 'Contact'],
    '科幻': ['收到信号', '发现', '系统警报', '墙外', '接触'],
    'Suspense/Mystery': ['The Clue', 'Hidden Truth', 'Following Leads', 'The Reveal', 'Suspicion'],
    '悬疑': ['线索', '隐藏的真相', '追踪', '揭露', '怀疑'],
    'History/Military': ['The Battle Begins', 'Strategy Meeting', 'March to War', 'The Siege', 'Victory'],
    '历史军事': ['战斗开始', '战略会议', '进军', '围攻', '胜利'],
  };

  const genreKey = Object.keys(titlesByGenre).find(k => genre?.includes(k));
  const genreTitles = genreKey ? titlesByGenre[genreKey] : ['Scene Continuation', 'The Next Chapter', 'Moving Forward', 'A New Beginning'];

  return genreTitles[sceneIndex % genreTitles.length];
};

// Helper to generate fallback chapter titles based on genre
const generateFallbackChapterTitle = (genre?: string): string => {
  const titlesByGenre: Record<string, string[]> = {
    'Fantasy': ['The Awakening', 'Into the Unknown', 'Rising Storm', 'Shadows and Light', 'The Final Stand'],
    '玄幻奇幻': ['觉醒', '踏入未知', '风暴来袭', '光影交错', '最终之战'],
    'Urban': ['New Beginnings', 'Crossroads', 'Turning Points', 'Revelations', 'Moving On'],
    '都市': ['新的开始', '十字路口', '转折点', '真相', '前行'],
    'Sci-Fi': ['First Contact', 'The Signal', 'System Failure', 'Beyond Earth', 'New Horizons'],
    '科幻': ['初次接触', '信号', '系统故障', '地球之外', '新地平线'],
  };

  const genreKey = Object.keys(titlesByGenre).find(k => genre?.includes(k));
  const genreTitles = genreKey ? titlesByGenre[genreKey] : ['Continuing On', 'The Journey', 'Next Steps'];

  return genreTitles[Math.floor(Math.random() * genreTitles.length)];
};

// Helper to count words (supporting CJK)
const countWords = (text: string) => {
    if (!text) return 0;
    // Count CJK characters
    const cjkCount = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
    // Replace CJK with space to count other words
    const nonCJKText = text.replace(/[\u4e00-\u9fa5]/g, ' ');
    // Count space-separated words (filter out empty strings)
    const spaceSeparatedCount = nonCJKText.split(/\s+/).filter(w => w.length > 0).length;
    return cjkCount + spaceSeparatedCount;
};

// Helper to split text into page-sized chunks based on visual height
const splitContentIntoPages = (text: string): string[] => {
    if (typeof document === 'undefined') return [text];
    if (!text) return [''];

    const container = document.createElement('div');
    // Ensure this matches the editor page styling exactly: 210mm width, p-12 padding, font settings
    container.className = 'fixed top-0 left-0 -z-50 p-12 font-serif text-lg leading-loose whitespace-pre-wrap break-words opacity-0 pointer-events-none';
    container.style.boxSizing = 'border-box'; 
    container.style.width = '210mm'; 
    
    document.body.appendChild(container);

    const paragraphs = text.split('\n');
    const pages: string[] = [];
    let currentPage = '';

    for (let i = 0; i < paragraphs.length; i++) {
        const p = paragraphs[i];
        const contentWithNewPara = currentPage ? (currentPage + '\n' + p) : p;
        
        // Use textContent to ensure leading spaces (indentation) are calculated correctly
        container.textContent = contentWithNewPara;
        
        if (container.scrollHeight > MAX_PAGE_CONTENT_HEIGHT) {
             if (currentPage) {
                 pages.push(currentPage);
                 currentPage = p;
             } else {
                 pages.push(p);
                 currentPage = ''; 
             }
        } else {
            currentPage = contentWithNewPara;
        }
    }

    if (currentPage) {
        pages.push(currentPage);
    }
    
    document.body.removeChild(container);
    return pages;
};

const Editor = forwardRef<EditorRef, EditorProps>(({ activeChapter, activeScene, onSceneUpdate, onCreateScene, onCreateChapter, onCodexAdd, onCodexAddOrUpdate, onClearCodex, onActivePageChange, onPageCountChange, codex, aiConfig, writingLanguage, shortcuts, projectInfo }, ref) => {
  const { t, language } = useI18n();
  const { colorClasses, mode } = useTheme();

  const [pages, setPages] = useState<string[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [isPainting, setIsPainting] = useState(false);

  const [selection, setSelection] = useState<string>('');
  const [focusedPageIndex, setFocusedPageIndex] = useState<number | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1.0);
  const [explicitAction, setExplicitAction] = useState<ExplicitAction | undefined>(undefined);
  const [showActionMenu, setShowActionMenu] = useState(false);

  const getActionButtonLabel = useCallback((): string => {
      if (!explicitAction) return t('editor.write_ahead');
      switch (explicitAction) {
          case 'continue': return t('editor.continue_scene');
          case 'new_scene': return t('editor.finish_scene');
          case 'new_chapter': return t('editor.finish_chapter');
      }
  }, [explicitAction, language]);

  const handleActionSelect = (action: ExplicitAction | undefined) => {
      setExplicitAction(action);
      setShowActionMenu(false);
  };

  const handleMenuButtonClick = (e: React.MouseEvent<HTMLButtonElement>, action: ExplicitAction | undefined) => {
      e.stopPropagation();
      handleActionSelect(action);
  };

  const containerRef = useRef<HTMLDivElement>(null);
  const textareaRefs = useRef<(HTMLTextAreaElement | null)[]>([]);

  useEffect(() => {
    const lastId = localStorage.getItem('last_scene_id');
    if (!isInitialized || activeScene.id !== lastId) {
        const rawContent = activeScene.content || '';
        const newPages = splitContentIntoPages(rawContent);
        setPages(newPages);
        setIsInitialized(true);
        localStorage.setItem('last_scene_id', activeScene.id);
    }
  }, [activeScene.id, activeScene.content, isInitialized]);

  useEffect(() => {
    if (onPageCountChange) {
      onPageCountChange(pages.length);
    }
  }, [pages.length, onPageCountChange]);

  const updateContentFromPages = useCallback((newPages: string[]) => {
      const fullContent = newPages.join('\n');
      onSceneUpdate({ ...activeScene, content: fullContent });
  }, [activeScene, onSceneUpdate]);

  const handlePageChange = (index: number, value: string) => {
      const newPages = [...pages];
      newPages[index] = value;
      setPages(newPages);
      updateContentFromPages(newPages);
      adjustTextareaHeight(index);
  };

  const adjustTextareaHeight = (index: number) => {
      const el = textareaRefs.current[index];
      if (el) {
          el.style.height = 'auto';
          const newHeight = Math.max(el.scrollHeight, 1123);
          el.style.height = `${newHeight}px`;
      }
  };

  useImperativeHandle(ref, () => ({
      scrollToPage: (pageIndex: number) => {
          setFocusedPageIndex(pageIndex);
          setTimeout(() => {
              const pageElement = containerRef.current?.querySelector(`[data-page-index="${pageIndex}"]`);
              pageElement?.scrollIntoView({ behavior: 'smooth', block: 'center' });
              textareaRefs.current[pageIndex]?.focus();
          }, 0);
      }
  }));

  useEffect(() => {
      if (focusedPageIndex !== null && onActivePageChange) {
          onActivePageChange(focusedPageIndex);
      }
  }, [focusedPageIndex, onActivePageChange]);

  useEffect(() => {
      pages.forEach((_, i) => adjustTextareaHeight(i));
  }, [pages]);

  // Handle Zoom via Alt + Scroll using Native Event Listener to support preventDefault (non-passive)
  useEffect(() => {
      const container = containerRef.current;
      if (!container) return;

      const handleWheelNative = (e: WheelEvent) => {
          if (e.altKey) {
              e.preventDefault();
              e.stopPropagation();

              const delta = e.deltaY * -0.001;
              setZoomLevel(prev => {
                  const newZoom = prev + delta;
                  return Math.min(Math.max(newZoom, 0.5), 3.0); // Clamp between 0.5x and 3.0x
              });
          }
      };

      // Attaching with { passive: false } is crucial to allow preventDefault()
      container.addEventListener('wheel', handleWheelNative, { passive: false });

      return () => {
          container.removeEventListener('wheel', handleWheelNative);
      };
  }, []);

  const handleAddPage = () => {
      const newPages = [...pages, ''];
      setPages(newPages);
      updateContentFromPages(newPages);
  };

  const handleRepaginate = () => {
      const fullContent = pages.join('\n');
      const newPages = splitContentIntoPages(fullContent);
      setPages(newPages);
      updateContentFromPages(newPages);
  };

  const handleSelection = (e: React.SyntheticEvent<HTMLTextAreaElement>) => {
      const target = e.target as HTMLTextAreaElement;
      setSelection(target.value.substring(target.selectionStart, target.selectionEnd));
  }

  const handleAIContinue = useCallback(async () => {
    if (isGenerating) return;

    const targetIndex = focusedPageIndex !== null ? focusedPageIndex : pages.length - 1;
    const currentContext = pages.slice(0, targetIndex + 1).join('\n');

    // Calculate current stats to guide AI
    const fullContent = pages.join('\n');
    const currentWordCount = countWords(fullContent);

    // Prepare Structure Info
    const sceneIndex = activeChapter.scenes.findIndex(s => s.id === activeScene.id);
    const prevScene = sceneIndex > 0 ? activeChapter.scenes[sceneIndex - 1] : undefined;

    const structureContext: StoryStructureContext = {
        projectTitle: projectInfo.title,
        genre: projectInfo.genre,
        subgenre: projectInfo.subgenre,
        description: projectInfo.description,
        targetAudience: projectInfo.targetAudience,
        narrativePerspective: projectInfo.narrativePerspective,
        writingTone: projectInfo.writingTone,
        themes: projectInfo.themes,
        chapterTitle: activeChapter.title,
        sceneTitle: activeScene.title,
        sceneIndex: sceneIndex,
        totalScenesInChapter: activeChapter.scenes.length,
        previousSceneSummary: prevScene?.summary,
        currentSceneWordCount: currentWordCount,
        currentScenePageCount: pages.length,
        currentPageIndex: targetIndex,
        targetSceneWordCount: aiConfig.targetSceneWordCount,
        targetScenesPerChapter: aiConfig.targetSceneCountPerChapter
    };

    setIsGenerating(true);
    try {
      const mode = aiConfig.continuationMode || 'general';
      const modeConfig = AI_CONTINUATION_MODES.find(m => m.id === mode);
      const prompt = modeConfig
        ? (language === 'zh' ? modeConfig.prompt.zh : modeConfig.prompt.en)
        : "Continue the story naturally.";

      // Use Smart Continuation with explicitAction
      const configWithAction = explicitAction ? { ...aiConfig, explicitAction } : aiConfig;
      const result = await generateSmartContinuation(
          currentContext,
          codex,
          prompt,
          writingLanguage,
          configWithAction,
          structureContext
      );

      let newContentAdded = "";

      if (result.action === 'new_scene' && onCreateScene) {
          // Handle creation of new scene
          const sceneTitle = result.title || generateFallbackSceneTitle(activeChapter.scenes.length + 1, structureContext?.genre);
          onCreateScene(sceneTitle, result.content);
          newContentAdded = result.content;
      } else if (result.action === 'new_chapter' && onCreateChapter) {
          // Handle creation of new chapter
          const chapterTitle = result.title || `Chapter 2: ${generateFallbackChapterTitle(structureContext?.genre)}`;
          onCreateChapter(chapterTitle, t('editor.opening_scene') || "Opening", result.content);
          newContentAdded = result.content;
      } else {
          // Standard continuation (append)
          const tempPages = [...pages];
          const targetPageContent = tempPages[targetIndex] || "";

          let separator = "";
          if (targetPageContent.trim().length > 0) {
             if (targetPageContent.endsWith('\n\n')) {
                 separator = "";
             } else if (targetPageContent.endsWith('\n')) {
                 separator = "\n";
             } else {
                 separator = "\n\n";
             }
          }

          newContentAdded = result.content;
          tempPages[targetIndex] = targetPageContent + separator + result.content;

          const fullContent = tempPages.join('\n');
          const reorderedPages = splitContentIntoPages(fullContent);

           setPages(reorderedPages);
           updateContentFromPages(reorderedPages);
       }

       // Auto Scan Logic
      if (aiConfig.autoScanAfterContinue && (onCodexAdd || onCodexAddOrUpdate) && newContentAdded.length > 20) {
          setIsScanning(true);
          try {
              // Clear Codex before scanning if enabled
              if (aiConfig.clearCodexBeforeScan && onClearCodex) {
                  onClearCodex();
              }

              // We scan that newly added content. 
              const existingNames = codex.map(c => c.name);
              const newEntities = await extractEntitiesFromText(
                  newContentAdded,
                  existingNames,
                  writingLanguage,
                  aiConfig
              );
               const addHandler = onCodexAddOrUpdate || onCodexAdd;
               newEntities.forEach(e => addHandler(e));
          } catch (e) {
              console.error("Auto scan failed", e);
          } finally {
              setIsScanning(false);
          }
    }

     } catch (e) {
       console.error(e);
       alert("Failed to generate content.");
     } finally {
       setIsGenerating(false);
     }
     }, [pages, focusedPageIndex, codex, writingLanguage, aiConfig, updateContentFromPages, isGenerating, language, onCreateScene, onCreateChapter, activeChapter, activeScene, projectInfo, onCodexAdd, onCodexAddOrUpdate, onClearCodex, explicitAction]);

  // Shortcut Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        const parts = shortcuts.aiContinue.split('+');
        const key = parts[parts.length - 1].toLowerCase();
        const modifiers = parts.slice(0, parts.length - 1);
        
        const keyMatch = e.key.toLowerCase() === key;
        const ctrlMatch = modifiers.includes('Ctrl') ? e.ctrlKey : !e.ctrlKey;
        const altMatch = modifiers.includes('Alt') ? e.altKey : !e.altKey;
        const shiftMatch = modifiers.includes('Shift') ? e.shiftKey : !e.shiftKey;
        const metaMatch = modifiers.includes('Meta') ? e.metaKey : !e.metaKey;

        if (keyMatch && ctrlMatch && altMatch && shiftMatch && metaMatch) {
            e.preventDefault();
            handleAIContinue();
        }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts, handleAIContinue]);

  const handleAIRewrite = async () => {
      if(!selection || focusedPageIndex === null) return;
      setIsGenerating(true);
      try {
           const rewritten = await generateStoryContinuation(
               pages[focusedPageIndex], 
               codex, 
               `Rewrite the selected text to be more descriptive and show-don't-tell. Selected text: "${selection}"`, 
               writingLanguage,
               aiConfig
            );
           
           const newPages = [...pages];
           newPages[focusedPageIndex] = newPages[focusedPageIndex].replace(selection, rewritten);
           setPages(newPages);
           updateContentFromPages(newPages);
      } catch (e) {
          alert("Rewrite failed.");
      } finally {
          setIsGenerating(false);
      }
  }

  // --- Image Generation Handler ---
  const handleGenerateImage = async () => {
      // Use selection if available, else return (button is hidden anyway)
      const textToVisualize = selection;
      if (!textToVisualize.trim()) {
          alert("Please select text to visualize.");
          return;
      }
      
      const targetPageIndex = focusedPageIndex !== null ? focusedPageIndex : pages.length - 1;

      setIsPainting(true);
      try {
          // 1. Generate Prompt
          const imagePrompt = await generateImageDescription(textToVisualize, aiConfig);
          console.log("Generated Image Prompt:", imagePrompt);
          
          // 2. Generate Image (Base64 or URL)
          const resultData = await generateImage(imagePrompt, aiConfig);
          
          // 3. Insert into text
          // Check if result is URL or Base64
          const isUrl = resultData.startsWith('http');
          const markdownImage = isUrl 
            ? `\n\n![${imagePrompt.substring(0, 50)}...](${resultData})\n\n`
            : `\n\n![${imagePrompt.substring(0, 50)}...](data:image/png;base64,${resultData})\n\n`;
          
          const newPages = [...pages];
          const pageContent = newPages[targetPageIndex] || '';
          
          // If we have a selection, append after the selection.
          // Find the selection end in the specific page and insert after
          const endPos = pageContent.indexOf(selection) + selection.length;
          if (endPos > selection.length - 1) { // Found
                newPages[targetPageIndex] = pageContent.slice(0, endPos) + markdownImage + pageContent.slice(endPos);
          } else {
                // Fallback append
                newPages[targetPageIndex] = pageContent + markdownImage;
          }
          
          setPages(newPages);
          updateContentFromPages(newPages);

      } catch (e: any) {
          console.error(e);
          alert("Image generation failed: " + e.message);
      } finally {
          setIsPainting(false);
      }
  }

  // --- Syntax Highlighting Logic ---
  const nameToCategoryMap = useMemo<Map<string, CodexCategory>>(() => {
      const map = new Map<string, CodexCategory>();
      codex.forEach(c => {
          if (c.name.trim()) {
              map.set(c.name.trim(), c.category);
          }
      });
      return map;
  }, [codex]);

  const highlightingRegex = useMemo(() => {
      const names: string[] = Array.from(nameToCategoryMap.keys());
      if (names.length === 0) return null;
      
      const sortedNames = names.sort((a, b) => b.length - a.length);
      const escapedNames = sortedNames.map(name => name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
      const isCJK = ['zh', 'ja', 'ko'].includes(writingLanguage);
      
      if (isCJK) {
          return new RegExp(`(${escapedNames.join('|')})`, 'g');
      } else {
          return new RegExp(`\\b(${escapedNames.join('|')})\\b`, 'g');
      }
  }, [nameToCategoryMap, writingLanguage]);

  const renderHighlightedText = (text: string) => {
    const textLines = text.split('\n');
    return textLines.map((line, lineIndex) => {
        if (!line) return <div key={lineIndex}>&#8203;</div>; 

        // Detect Markdown Image syntax: ![Alt](Url)
        const imageMatch = line.match(/^!\[(.*?)\]\((.*?)\)$/);
        if (imageMatch) {
             // We can render a placeholder or visual indicator in the background layer
             return (
                 <div key={lineIndex} className="text-transparent">
                     {/* The text must remain transparent to align with textarea, but we could add a border/bg if we wanted */}
                     {line}
                     {/* We can't easily render the real image here without messing up line height sync with textarea */}
                 </div>
             );
        }

        const trimmed = line.trim();
        const isSceneHeading = /^(INT\.|EXT\.|EST\.|I\/E\.|内\.|外\.|场景\.)/i.test(trimmed);
        
        if (isSceneHeading) {
            return <div key={lineIndex} className="text-blue-700 dark:text-blue-400 font-bold uppercase tracking-wide">{line}</div>;
        }

        if (!highlightingRegex) {
            return <div key={lineIndex} className="text-slate-800 dark:text-slate-300">{line}</div>;
        }

         const parts = line.split(highlightingRegex);
         return (
             <div key={lineIndex} className="text-slate-800 dark:text-slate-300">
                 {parts.map((part, partIndex) => {
                     const category = nameToCategoryMap.get(part);
                     if (category) {
                         const colors = CODEX_HIGHLIGHT_COLORS[category];
                         if (colors) {
                             return (
                                 <span
                                     key={partIndex}
                                     className={`${mode === 'dark' ? colors.dark : colors.light} font-semibold`}
                                 >
                                     {part}
                                 </span>
                             );
                         }
                     }
                     return <span key={partIndex}>{part}</span>;
                 })}
             </div>
         );
    });
  };

  const wordCount = useMemo(() => {
      const content = pages.join('\n');
      return countWords(content);
  }, [pages]);

  return (
    <div className="flex flex-col h-full bg-slate-200 dark:bg-slate-950 relative overflow-hidden transition-colors duration-200">
      {/* Toolbar */}
      <div className="h-14 border-b border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between px-6 z-20 shadow-sm flex-shrink-0">
        <div className="flex items-center gap-4">
           <div className="flex flex-col justify-center">
              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider leading-none mb-1">
                  {activeChapter.title}
              </span>
              <div className="flex items-center gap-3">
                  <h2 className="text-slate-800 dark:text-slate-200 font-medium truncate max-w-md leading-none">
                      {activeScene.title}
                  </h2>
                  <div className="h-3 w-px bg-slate-300 dark:bg-slate-700 mx-1"></div>
                  <div className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                         {pages.length} Page{pages.length !== 1 ? 's' : ''}
                      </span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                         {wordCount} {t('editor.words')}
                      </span>
                  </div>
              </div>
           </div>
        </div>
        
         <div className="flex items-center gap-2">
             <button
               onClick={handleRepaginate}
               className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs rounded transition-colors"
               title="Recalculate page breaks"
             >
               <Icons.List /> Repaginate
             </button>

            {/* IMAGE GENERATOR BUTTON - ONLY SHOW IF SELECTION EXISTS */}
            {selection && (
                <button
                  onClick={handleGenerateImage}
                  disabled={isGenerating || isPainting}
                  className={`flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs rounded transition-colors border border-transparent ${isPainting ? 'animate-pulse text-purple-600 dark:text-purple-400 border-purple-200' : ''}`}
                  title="Generate Image from selection"
                >
                   {isPainting ? (
                       <>
                         <span className="animate-spin">⟳</span> {t('editor.generating_image')}
                       </>
                   ) : (
                       <>
                         <Icons.Image /> {t('editor.gen_image')}
                       </>
                   )}
                </button>
            )}

            {selection && (
              <button
               onClick={handleAIRewrite}
               disabled={isGenerating || isPainting}
               className={`flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 ${colorClasses.text} text-xs rounded transition-colors border ${colorClasses.border}`}
              >
                  <Icons.Sparkles /> {t('editor.rewrite')}
              </button>
            )}

           {/* AI Action Button Group */}
           <div className="relative">
               <button
                 onClick={handleAIContinue}
                 disabled={isGenerating || isPainting}
                 className={`flex items-center gap-2 px-4 py-1.5 rounded-l text-sm font-medium transition-all border-r border-slate-300 dark:border-slate-700 ${
                   isGenerating || isScanning || isPainting
                     ? 'bg-slate-200 dark:bg-slate-800 text-slate-500 cursor-wait'
                     : `${colorClasses.primary} ${colorClasses.hover} text-white`
                 }`}
                 title={`${t('editor.write_ahead')} (${shortcuts.aiContinue})`}
               >
                 {isGenerating ? (
                   <>
                     <span className="animate-spin text-lg">⟳</span> {t('editor.writing')}
                   </>
                 ) : isScanning ? (
                   <>
                     <span className="animate-spin text-lg">⟳</span> {t('editor.scanning')}
                   </>
                 ) : (
                   <>
                     <Icons.Pen /> {getActionButtonLabel()}
                   </>
                 )}
               </button>
               {/* Dropdown Toggle */}
               <button
                 onClick={() => setShowActionMenu(!showActionMenu)}
                 className={`absolute right-0 top-0 h-full px-2 rounded-r text-sm font-medium transition-all border-l border-slate-300 dark:border-slate-700 ${
                   isGenerating || isPainting
                     ? 'bg-slate-200 dark:bg-slate-800 text-slate-500 cursor-wait'
                     : `${colorClasses.primary} ${colorClasses.hover} text-white`
                 }`}
                 title="Select action mode"
               >
                 {showActionMenu ? '▲' : '▼'}
               </button>

                {/* Dropdown Menu */}
                {showActionMenu && (
                    <div className="absolute top-full right-0 mt-1 w-48 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl z-50">
                        <button
                          onClick={(e) => handleMenuButtonClick(e, undefined)}
                          className={`w-full text-left px-4 py-2 text-sm first:rounded-t-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors ${!explicitAction ? 'bg-slate-100 dark:bg-slate-700 font-bold' : ''}`}
                        >
                          <span className="flex items-center gap-2">
                            <Icons.Pen />
                            {t('editor.auto_decide')}
                          </span>
                          {!explicitAction && <span className="ml-auto text-[10px] bg-blue-500 text-white px-1.5 py-0.5 rounded">Active</span>}
                        </button>
                        <button
                          onClick={(e) => handleMenuButtonClick(e, 'continue')}
                          className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors ${explicitAction === 'continue' ? 'bg-slate-100 dark:bg-slate-700 font-bold' : ''}`}
                        >
                          <span className="flex items-center gap-2">
                            <Icons.Pen />
                            {t('editor.continue_scene')}
                          </span>
                          {explicitAction === 'continue' && <span className="ml-auto text-[10px] bg-blue-500 text-white px-1.5 py-0.5 rounded">Active</span>}
                        </button>
                        <button
                          onClick={(e) => handleMenuButtonClick(e, 'new_scene')}
                          className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors ${explicitAction === 'new_scene' ? 'bg-slate-100 dark:bg-slate-700 font-bold' : ''}`}
                        >
                          <span className="flex items-center gap-2">
                            <Icons.Plus />
                            {t('editor.finish_scene')}
                          </span>
                          {explicitAction === 'new_scene' && <span className="ml-auto text-[10px] bg-blue-500 text-white px-1.5 py-0.5 rounded">Active</span>}
                        </button>
                        <button
                          onClick={(e) => handleMenuButtonClick(e, 'new_chapter')}
                          className={`w-full text-left px-4 py-2 text-sm last:rounded-b-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors ${explicitAction === 'new_chapter' ? 'bg-slate-100 dark:bg-slate-700 font-bold' : ''}`}
                        >
                          <span className="flex items-center gap-2">
                            <Icons.Book />
                            {t('editor.finish_chapter')}
                          </span>
                          {explicitAction === 'new_chapter' && <span className="ml-auto text-[10px] bg-blue-500 text-white px-1.5 py-0.5 rounded">Active</span>}
                        </button>
                    </div>
                )}

               {/* Close dropdown when clicking outside */}
               {showActionMenu && (
                   <div
                     className="fixed inset-0 z-40"
                     onClick={() => setShowActionMenu(false)}
                   />
               )}
           </div>
         </div>
      </div>

      <div ref={containerRef} className="flex-1 overflow-auto p-8 scrollbar-hide">
         <div 
            className="flex flex-col items-center gap-8 pb-20 origin-top transition-transform duration-75 ease-out min-w-min mx-auto"
            style={{ transform: `scale(${zoomLevel})` }}
         >
              {pages.map((pageContent, index) => (
                  <div
                     key={index}
                     data-page-index={index}
                     className="relative w-[210mm] min-h-[297mm] bg-white dark:bg-slate-900 shadow-xl transition-colors duration-200 group flex-shrink-0"
                  >
                    <div className="absolute top-2 right-4 text-[10px] text-slate-300 dark:text-slate-700 font-mono select-none">
                        {index + 1}
                    </div>

                    <div className="absolute inset-0 p-12 whitespace-pre-wrap break-words font-serif text-lg leading-loose pointer-events-none z-0">
                        {renderHighlightedText(pageContent)}
                    </div>

                    <textarea
                        ref={(el) => { textareaRefs.current[index] = el; }}
                        className="relative w-full min-h-[297mm] p-12 bg-transparent resize-none focus:outline-none font-serif text-lg leading-loose z-10 text-transparent caret-slate-800 dark:caret-slate-200 whitespace-pre-wrap break-words overflow-hidden"
                        value={pageContent}
                        onChange={(e) => handlePageChange(index, e.target.value)}
                        onSelect={handleSelection}
                        onFocus={() => setFocusedPageIndex(index)}
                        placeholder={index === 0 ? "Start writing your masterpiece..." : ""}
                        spellCheck={false}
                        autoCapitalize="off"
                        autoComplete="off"
                        autoCorrect="off"
                    />
                 </div>
             ))}

             <button 
                onClick={handleAddPage}
                className="flex flex-col items-center gap-2 text-slate-400 hover:text-slate-600 dark:text-slate-600 dark:hover:text-slate-400 transition-colors group"
             >
                 <div className="w-8 h-8 rounded-full border-2 border-dashed border-current flex items-center justify-center">
                     <Icons.Plus />
                 </div>
                 <span className="text-xs font-medium">Add Page</span>
             </button>
         </div>
      </div>
      
      <div className="flex-shrink-0 h-8 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center px-4 justify-between text-[10px] text-slate-500 z-20">
         <div className="flex items-center gap-4">
             <span>{t('editor.draft_mode')} • Paged View</span>
             <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700" onClick={() => setZoomLevel(1.0)} title="Reset Zoom">
                 <span>Zoom: {Math.round(zoomLevel * 100)}%</span>
             </div>
         </div>
         <span>Mode: {aiConfig.continuationMode || 'General'} • {activeScene.id} {isScanning ? '• Auto-Scanning...' : ''}</span>
      </div>
     </div>
   );
});

Editor.displayName = 'Editor';

export default Editor;
