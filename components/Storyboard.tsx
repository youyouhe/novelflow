
import React, { useMemo } from 'react';
import { Chapter, Scene } from '../types';
import { useI18n } from '../i18n';
import { useTheme } from '../theme';
import { Icons } from '../constants';

interface StoryboardProps {
  chapters: Chapter[];
  onSceneSelect: (sceneId: string) => void;
  onSceneUpdate: (scene: Scene) => void;
  onSceneReferenceInsert?: (displayText: string, chapterTitle: string, sceneTitle?: string) => void;
}

// Helper to count words (supporting CJK) - duplicated from Editor for self-containment
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

const Storyboard: React.FC<StoryboardProps> = ({ chapters, onSceneSelect, onSceneUpdate, onSceneReferenceInsert }) => {
  const { t } = useI18n();
  const { colorClasses } = useTheme();

  const handleChapterClick = (e: React.MouseEvent, chapter: Chapter) => {
    if (e.ctrlKey && onSceneReferenceInsert) {
      e.preventDefault();
      onSceneReferenceInsert(`@${chapter.title}`, chapter.title);
      return;
    }
  };

  const handleSceneClick = (e: React.MouseEvent, chapter: Chapter, scene: Scene) => {
    if (e.ctrlKey && onSceneReferenceInsert) {
      e.preventDefault();
      onSceneReferenceInsert(`@${chapter.title}.${scene.title}`, chapter.title, scene.title);
      return;
    }
  };

  // State for tracking which scene title is being edited
  const [editingSceneId, setEditingSceneId] = React.useState<string | null>(null);
  const [editingTitle, setEditingTitle] = React.useState('');

  const totalScenes = useMemo(() => chapters.reduce((acc, c) => acc + c.scenes.length, 0), [chapters]);
  const totalWords = useMemo(() => {
      return chapters.reduce((acc, c) => {
          return acc + c.scenes.reduce((sAcc, s) => sAcc + countWords(s.content), 0);
      }, 0);
  }, [chapters]);

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 overflow-hidden">
      {/* Header */}
      <div className="h-14 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between px-6 z-10 shadow-sm">
        <h2 className="text-slate-800 dark:text-slate-200 font-bold truncate max-w-md flex items-center gap-2">
          <Icons.Grid /> {t('storyboard.title')}
        </h2>
        <div className="flex gap-2">
            <div className="text-xs text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
            {chapters.length} Chapters
            </div>
            <div className="text-xs text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
            {totalScenes} {t('storyboard.scenes')}
            </div>
             <div className="text-xs text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
            {totalWords} {t('editor.words')}
            </div>
        </div>
      </div>

      {onSceneReferenceInsert && (
        <div className="px-6 py-2 bg-blue-50 dark:bg-blue-950/30 border-b border-blue-200 dark:border-blue-900/30 text-xs text-blue-700 dark:text-blue-300">
          💡 提示：按 Ctrl+点击 章节标题或场景卡片，快速插入引用语法到 AI 助手
        </div>
      )}

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-8 space-y-12">
        {chapters.length === 0 ? (
          <div className="flex items-center justify-center h-full text-slate-400">
            {t('storyboard.empty')}
          </div>
        ) : (
          chapters.map((chapter) => (
              <div key={chapter.id} className="space-y-4">
                  {/* Chapter Divider */}
                  <div
                    className={`flex items-center gap-4 border-b border-slate-200 dark:border-slate-800 pb-2 sticky top-0 bg-slate-50/95 dark:bg-slate-950/95 backdrop-blur-sm z-10 pt-2 ${onSceneReferenceInsert ? 'cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-900' : ''}`}
                    onClick={(e) => handleChapterClick(e, chapter)}
                    title={onSceneReferenceInsert ? "Ctrl+Click to insert chapter reference" : undefined}
                  >
                      <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300">
                          {chapter.title}
                      </h3>
                      <span className="text-xs text-slate-400 font-mono bg-slate-200 dark:bg-slate-800 px-1.5 rounded">
                          {chapter.scenes.length}
                      </span>
                  </div>

                 {/* Scenes Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                     {chapter.scenes.map((scene) => {
                         const excerpt = scene.content.slice(0, 200) + (scene.content.length > 200 ? '...' : '');
                         return (
                         <div
                             key={scene.id}
                             onClick={(e) => handleSceneClick(e, chapter, scene)}
                             title={onSceneReferenceInsert ? "Ctrl+Click to insert scene reference" : undefined}
                             className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 flex flex-col h-80 group hover:-translate-y-1 ${onSceneReferenceInsert ? 'cursor-pointer' : ''}`}
                         >
                            {/* Card Header */}
                            <div className="p-3 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-950/50 rounded-t-xl shrink-0">
                                {editingSceneId === scene.id ? (
                                    <input
                                        type="text"
                                        className="font-bold text-slate-800 dark:text-slate-200 text-sm bg-transparent border-b border-blue-500 focus:outline-none flex-1 mr-2"
                                        value={editingTitle}
                                        onChange={(e) => setEditingTitle(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                onSceneUpdate({ ...scene, title: editingTitle });
                                                setEditingSceneId(null);
                                            } else if (e.key === 'Escape') {
                                                setEditingSceneId(null);
                                            }
                                        }}
                                        onBlur={() => {
                                            if (editingTitle.trim()) {
                                                onSceneUpdate({ ...scene, title: editingTitle });
                                            }
                                            setEditingSceneId(null);
                                        }}
                                        autoFocus
                                        onClick={(e) => e.stopPropagation()}
                                    />
                                ) : (
                                    <h3
                                        className="font-bold text-slate-800 dark:text-slate-200 text-sm truncate pr-2 cursor-pointer hover:text-blue-500 dark:hover:text-blue-400 transition-colors"
                                        title={scene.title}
                                        onDoubleClick={(e) => {
                                            e.stopPropagation();
                                            setEditingSceneId(scene.id);
                                            setEditingTitle(scene.title);
                                        }}
                                    >
                                        {scene.title}
                                    </h3>
                                )}
                                <button
                                    onClick={() => onSceneSelect(scene.id)}
                                    className={`opacity-0 group-hover:opacity-100 ${colorClasses.text} hover:underline text-xs transition-opacity font-medium`}
                                >
                                    {t('storyboard.edit')}
                                </button>
                            </div>
                            
                            {/* Card Body: Excerpt + Summary */}
                            <div className="flex-1 flex flex-col min-h-0">
                                {/* Excerpt (Read Only) */}
                                <div className="flex-1 p-3 overflow-hidden border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
                                    <div className="text-[10px] uppercase text-slate-400 mb-1 font-bold tracking-wider">Content Preview</div>
                                    <p className="text-xs text-slate-600 dark:text-slate-400 font-serif whitespace-pre-wrap leading-relaxed">
                                        {excerpt || <span className="italic opacity-50 text-slate-300 dark:text-slate-600">No content written yet...</span>}
                                    </p>
                                </div>

                                {/* Summary (Editable) */}
                                <div className="h-24 p-2 bg-slate-50 dark:bg-slate-950 shrink-0">
                                    <textarea 
                                        className="w-full h-full bg-transparent resize-none text-xs text-slate-600 dark:text-slate-400 focus:outline-none placeholder:text-slate-300 dark:placeholder:text-slate-700"
                                        placeholder={t('storyboard.summary_placeholder')}
                                        value={scene.summary || ''}
                                        onChange={(e) => onSceneUpdate({ ...scene, summary: e.target.value })}
                                    />
                                </div>
                            </div>

                            {/* Card Footer */}
                            <div className="p-2 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-[10px] text-slate-400 shrink-0">
                                <div className="flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700"></span>
                                    {countWords(scene.content)} {t('storyboard.words')}
                                </div>
                                <div className="truncate max-w-[100px] opacity-30 font-mono">
                                    {scene.id.slice(-6)}
                                </div>
                            </div>
                        </div>
                        );
                    })}
                    
                    {/* Visual placeholder if chapter is empty */}
                    {chapter.scenes.length === 0 && (
                        <div className="col-span-full py-8 text-center text-slate-400 text-sm italic border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                            {t('storyboard.empty')}
                        </div>
                    )}
                 </div>
             </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Storyboard;
