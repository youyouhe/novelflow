
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Project, Chapter, Scene, CodexEntry, ViewMode, AIConfig, Snapshot, KeyboardConfig, ProjectMetadata, SupabaseConfig } from './types';
import { INITIAL_PROJECT_DATA, Icons } from './constants';
import CodexPanel from './components/CodexPanel';
import ChatPanel from './components/ChatPanel';
import Editor, { EditorRef } from './components/Editor';
import Storyboard from './components/Storyboard';
import HelpModal from './components/HelpModal';
import NewProjectModal from './components/NewProjectModal';
import SettingsModal from './components/SettingsModal';
import HistoryModal from './components/HistoryModal';
import Dashboard from './components/Dashboard';
import { useI18n } from './i18n';
import { useTheme } from './theme';
import { publishNovelToGallery, computeProjectHash } from './services/galleryService';

const LEGACY_STORAGE_KEY = 'novelflow_project_data_v1';
const LIST_STORAGE_KEY = 'novelflow_project_list';
const AI_CONFIG_KEY = 'novelflow_ai_config';
const SHORTCUTS_KEY = 'novelflow_shortcuts';
const SB_CONFIG_KEY = 'novelflow_supabase_config';
const MANUSCRIPT_EXPANDED_KEY = 'novelflow_manuscript_expanded';

const DEFAULT_SHORTCUTS: KeyboardConfig = {
  aiContinue: 'Alt+c'
};

// Provided defaults by user
const DEFAULT_SB_CONFIG: SupabaseConfig = {
    url: 'https://utevqpdbrihhpvvvdzdr.supabase.co',
    anonKey: 'sb_publishable_u61JRCt7LMjKGyS6d-zMpQ_QgoPueJU'
};

// Helper to count words (simple version for metadata)
const countProjectWords = (project: Project): number => {
    return project.chapters.reduce((acc, chap) => {
        return acc + chap.scenes.reduce((sAcc, s) => {
             const text = s.content || "";
             const cjkCount = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
             const nonCJKText = text.replace(/[\u4e00-\u9fa5]/g, ' ');
             const spaceSeparatedCount = nonCJKText.split(/\s+/).filter(w => w.length > 0).length;
             return sAcc + cjkCount + spaceSeparatedCount;
        }, 0);
    }, 0);
};

// Migration helper for backward compatibility
const migrateProject = (project: any): Project => {
    return {
        ...project,
        genre: project.genre || 'Fiction',
        subgenre: project.subgenre || 'General',
        // New fields are optional, no need to set defaults
    };
};

const App: React.FC = () => {
  const { t, language, setLanguage } = useI18n();
  const { colorClasses, mode, setMode } = useTheme();

  // State
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [projectList, setProjectList] = useState<ProjectMetadata[]>([]);
  
  // UI State
  const [activeSceneId, setActiveSceneId] = useState<string>('');
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.Write);
  const [showLeftPanel, setShowLeftPanel] = useState(true);
  const [showRightPanel, setShowRightPanel] = useState(true);
  const [rightPanelMode, setRightPanelMode] = useState<'Chat' | 'Codex'>('Chat');
  const [showHelp, setShowHelp] = useState(false);
  const [showNewProject, setShowNewProject] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [isToolsExpanded, setIsToolsExpanded] = useState(true);

  const editorRef = useRef<EditorRef>(null);
  const [activePageCount, setActivePageCount] = useState<number>(0);
  const [activePageIndex, setActivePageIndex] = useState<number>(0);
  const [expandedScenes, setExpandedScenes] = useState<Set<string>>(new Set());
  const [isManuscriptExpanded, setIsManuscriptExpanded] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(MANUSCRIPT_EXPANDED_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.isManuscriptExpanded !== undefined ? parsed.isManuscriptExpanded : true;
      }
      return true;
    } catch {
      return true;
    }
  });
  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem(MANUSCRIPT_EXPANDED_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return new Set(parsed.expandedChapters || []);
      }
      return new Set();
    } catch {
      return new Set();
    }
  });

  // Auto-save state
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  const [pendingSceneReference, setPendingSceneReference] = useState<string>('');

  // AI & Shortcut Config
  const [aiConfig, setAiConfig] = useState<AIConfig>(() => {
      try {
          const saved = localStorage.getItem(AI_CONFIG_KEY);
          return saved ? JSON.parse(saved) : { provider: 'gemini', model: '', continuationMode: 'general', continuationLength: 'medium', contextSize: 'medium', targetSceneWordCount: 2000, targetSceneCountPerChapter: 5 };
      } catch {
          return { provider: 'gemini', model: '', continuationMode: 'general', continuationLength: 'medium', contextSize: 'medium', targetSceneWordCount: 2000, targetSceneCountPerChapter: 5 };
      }
  });

  const [shortcuts, setShortcuts] = useState<KeyboardConfig>(() => {
      try {
          const saved = localStorage.getItem(SHORTCUTS_KEY);
          return saved ? JSON.parse(saved) : DEFAULT_SHORTCUTS;
      } catch {
          return DEFAULT_SHORTCUTS;
      }
  });

  const [supabaseConfig, setSupabaseConfig] = useState<SupabaseConfig>(() => {
      try {
          const saved = localStorage.getItem(SB_CONFIG_KEY);
          return saved ? JSON.parse(saved) : DEFAULT_SB_CONFIG;
      } catch {
          return DEFAULT_SB_CONFIG;
      }
  });

  // --- Data Management Functions ---

  const saveProject = useCallback((project: Project) => {
      const now = Date.now();
      const updatedProject = { ...project, lastModified: now };
      
      // Save Full Data
      localStorage.setItem(`novelflow_data_${project.id}`, JSON.stringify(updatedProject));
      
      // Update Metadata List
      setProjectList(prev => {
          const meta: ProjectMetadata = {
              id: project.id,
              title: project.title,
              author: project.author,
              genre: project.genre,
              subgenre: project.subgenre,
              description: project.description,
              targetAudience: project.targetAudience,
              narrativePerspective: project.narrativePerspective,
              writingLanguage: project.writingLanguage,
              lastModified: now,
              wordCount: countProjectWords(project),
              chapterCount: project.chapters.length,
              contentHash: project.contentHash // Store hash in list for quick checks
          };
          
          const existingIndex = prev.findIndex(p => p.id === project.id);
          const newList = [...prev];
          if (existingIndex >= 0) {
              newList[existingIndex] = meta;
          } else {
              newList.push(meta);
          }
          
          localStorage.setItem(LIST_STORAGE_KEY, JSON.stringify(newList));
          return newList;
      });
      
      setLastSaved(new Date(now));
  }, []);

  const deleteProject = useCallback((id: string) => {
      // Remove data
      localStorage.removeItem(`novelflow_data_${id}`);
      
      // Update List
      setProjectList(prev => {
          const newList = prev.filter(p => p.id !== id);
          localStorage.setItem(LIST_STORAGE_KEY, JSON.stringify(newList));
          return newList;
      });

      // If active, close it
      if (activeProject && activeProject.id === id) {
          setActiveProject(null);
      }
  }, [activeProject]);

  // Load List & Migration on Mount
  useEffect(() => {
      // 1. Load List
      let list: ProjectMetadata[] = [];
      try {
          const savedList = localStorage.getItem(LIST_STORAGE_KEY);
          if (savedList) list = JSON.parse(savedList);
      } catch(e) { console.error(e); }

      // 2. Check for legacy single-project data
      const legacyData = localStorage.getItem(LEGACY_STORAGE_KEY);
      if (legacyData) {
          try {
              const p = JSON.parse(legacyData);
              if (!list.find(item => item.id === p.id)) {
                   const now = Date.now();
                   const meta: ProjectMetadata = {
                      id: p.id,
                      title: p.title,
                      author: p.author,
                      genre: p.genre,
                      subgenre: p.subgenre,
                      writingLanguage: p.writingLanguage,
                      lastModified: now,
                      wordCount: countProjectWords(p),
                      chapterCount: p.chapters.length
                   };
                   list.push(meta);
                   localStorage.setItem(`novelflow_data_${p.id}`, JSON.stringify({ ...p, lastModified: now }));
                   localStorage.setItem(LIST_STORAGE_KEY, JSON.stringify(list));
              }
              localStorage.removeItem(LEGACY_STORAGE_KEY);
          } catch(e) {
              console.error("Migration failed", e);
          }
      }

      setProjectList(list);
  }, []);

  // Auto-save active project with Hash Calculation
  useEffect(() => {
    if (!activeProject) return;

    setIsSaving(true);
    const handler = setTimeout(async () => {
      try {
        // Calculate hash asynchronously before saving
        const hash = await computeProjectHash(activeProject);
        // Only trigger save if hash changed (or just attach it)
        // We attach it to the object so it gets saved to localStorage
        const projectWithHash = { ...activeProject, contentHash: hash };
        saveProject(projectWithHash);
      } catch (e) {
        console.error("Failed to save project", e);
      } finally {
        setIsSaving(false);
      }
    }, 1000);

    return () => clearTimeout(handler);
  }, [activeProject, saveProject]);

  // Save Settings
  useEffect(() => {
      localStorage.setItem(AI_CONFIG_KEY, JSON.stringify(aiConfig));
  }, [aiConfig]);
  useEffect(() => {
      localStorage.setItem(SHORTCUTS_KEY, JSON.stringify(shortcuts));
  }, [shortcuts]);
  useEffect(() => {
      localStorage.setItem(SB_CONFIG_KEY, JSON.stringify(supabaseConfig));
  }, [supabaseConfig]);

  // --- View Handlers ---

  const handleCreateProject = (newProject: Project) => {
      saveProject(newProject);
      setActiveProject(newProject);
      if (newProject.chapters.length > 0 && newProject.chapters[0].scenes.length > 0) {
          setActiveSceneId(newProject.chapters[0].scenes[0].id);
      }
      setExpandedChapters(new Set());
      setShowNewProject(false);
  };

  const handleOpenProject = (id: string) => {
      const data = localStorage.getItem(`novelflow_data_${id}`);
      if (data) {
          try {
              const p = migrateProject(JSON.parse(data));
              setActiveProject(p);
              if (p.chapters.length > 0 && p.chapters[0].scenes.length > 0) {
                  setActiveSceneId(p.chapters[0].scenes[0].id);
              }
              setExpandedChapters(new Set());
          } catch (e) {
              console.error("Failed to load project", e);
              alert("Failed to load project data.");
          }
      } else {
          alert("Project data not found.");
      }
  };

  const handleImportProject = (project: Project) => {
      saveProject(project);
      // Optional: Auto open imported project?
      // setActiveProject(project);
  }

  const handlePublishRequest = async (id: string, visibility: 'public' | 'private') => {
      // 1. Load full project data from LocalStorage
      const data = localStorage.getItem(`novelflow_data_${id}`);
      if (!data) throw new Error("Project not found");
      const project = JSON.parse(data) as Project;

      // 2. Call Service
      await publishNovelToGallery(project, visibility, supabaseConfig);
  }

  const handleCloseProject = () => {
      setActiveProject(null);
  };

  const handleDeleteActiveProject = () => {
      if (activeProject) {
          deleteProject(activeProject.id);
          setActiveProject(null);
          setShowSettings(false);
      }
  };

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'zh' : 'en');
  };

  const handleActivePageChange = useCallback((pageIndex: number) => {
    setActivePageIndex(pageIndex);
  }, []);

  const handlePageCountChange = useCallback((pageCount: number) => {
    setActivePageCount(pageCount);
  }, []);

  const handlePageJump = useCallback((sceneId: string, pageIndex: number) => {
    if (activeSceneId !== sceneId) {
      setActiveSceneId(sceneId);
    }
    setTimeout(() => {
      editorRef.current?.scrollToPage(pageIndex);
    }, activeSceneId === sceneId ? 0 : 300);
  }, [activeSceneId]);

  const handleSceneReferenceInsert = useCallback((
    displayText: string,
    chapterTitle: string,
    sceneTitle?: string
  ) => {
    setPendingSceneReference(displayText);
    if (rightPanelMode !== 'Chat') {
      setRightPanelMode('Chat');
    }
  }, [rightPanelMode]);

  const handleSceneReferenceInserted = useCallback(() => {
    setPendingSceneReference('');
  }, []);

  const handleToggleScenePages = useCallback((sceneId: string) => {
    setExpandedScenes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sceneId)) {
        newSet.delete(sceneId);
      } else {
        newSet.add(sceneId);
      }
      return newSet;
    });
  }, []);

  const handleToggleChapter = useCallback((chapterId: string) => {
    setExpandedChapters(prev => {
      const newSet = new Set(prev);
      if (newSet.has(chapterId)) {
        newSet.delete(chapterId);
      } else {
        newSet.add(chapterId);
      }
      return newSet;
    });
  }, []);

  const handleToggleManuscript = useCallback(() => {
    setIsManuscriptExpanded(prev => !prev);
  }, []);

  useEffect(() => {
    const state = {
      isManuscriptExpanded,
      expandedChapters: Array.from(expandedChapters)
    };
    localStorage.setItem(MANUSCRIPT_EXPANDED_KEY, JSON.stringify(state));
  }, [isManuscriptExpanded, expandedChapters]);

  // Reset page count when scene changes
  useEffect(() => {
    setActivePageCount(0);
    setActivePageIndex(0);
    setExpandedScenes(new Set());
  }, [activeSceneId]);

  // --- Render Logic ---

  if (!activeProject) {
      return (
          <>
            <Dashboard 
                projects={projectList}
                onCreateNew={() => setShowNewProject(true)}
                onSelectProject={handleOpenProject}
                onDeleteProject={deleteProject}
                onToggleTheme={() => setMode(mode === 'light' ? 'dark' : 'light')}
                onToggleLanguage={toggleLanguage}
                onImportProject={handleImportProject}
                onPublishRequest={handlePublishRequest}
                supabaseConfig={supabaseConfig}
                onUpdateSupabaseConfig={setSupabaseConfig}
            />
            {showNewProject && (
                <NewProjectModal 
                    onClose={() => setShowNewProject(false)} 
                    onCreate={handleCreateProject}
                    aiConfig={aiConfig} 
                />
            )}
          </>
      );
  }

  // --- Editor View (Existing App Logic) ---
  
  const activeChapter = activeProject.chapters.find(c => c.scenes.some(s => s.id === activeSceneId)) || activeProject.chapters[0];
  const activeScene = activeChapter.scenes.find(s => s.id === activeSceneId) || activeChapter.scenes[0];

  const handleSceneUpdate = (updatedScene: Scene) => {
    setActiveProject(prev => {
      if (!prev) return null;
      const newChapters = prev.chapters.map(chap => ({
        ...chap,
        scenes: chap.scenes.map(s => s.id === updatedScene.id ? updatedScene : s)
      }));
      return { ...prev, chapters: newChapters };
    });
  };

  const handleAddChapter = () => {
    const newChapterId = `chap_${Date.now()}`;
    const newSceneId = `scene_${Date.now()}`;
    const newChapter: Chapter = {
      id: newChapterId,
      title: `Chapter ${activeProject.chapters.length + 1}`,
      scenes: [{
        id: newSceneId,
        title: 'New Scene',
        content: '',
        summary: ''
      }]
    };
    
    setActiveProject(prev => prev ? ({
      ...prev,
      chapters: [...prev.chapters, newChapter]
    }) : null);
    setActiveSceneId(newSceneId);
  };

  const handleAddScene = (chapterId: string) => {
    const newSceneId = `scene_${Date.now()}`;
    const newScene: Scene = {
      id: newSceneId,
      title: 'New Scene',
      content: '',
      summary: ''
    };

    setActiveProject(prev => prev ? ({
      ...prev,
      chapters: prev.chapters.map(c => 
        c.id === chapterId ? { ...c, scenes: [...c.scenes, newScene] } : c
      )
    }) : null);
    setActiveSceneId(newSceneId);
  };

  const handleAICreateScene = (title: string, content: string) => {
      const newSceneId = `scene_${Date.now()}`;
      const newScene: Scene = {
          id: newSceneId,
          title: title,
          content: content,
          summary: 'AI Generated'
      };
      
      setActiveProject(prev => prev ? ({
          ...prev,
          chapters: prev.chapters.map(c => 
            c.id === activeChapter.id ? { ...c, scenes: [...c.scenes, newScene] } : c
          )
      }) : null);
      setActiveSceneId(newSceneId);
  };

  const handleAICreateChapter = (title: string, sceneTitle: string, content: string) => {
      const newChapterId = `chap_${Date.now()}`;
      const newSceneId = `scene_${Date.now()}`;
      const newChapter: Chapter = {
          id: newChapterId,
          title: title,
          scenes: [{
              id: newSceneId,
              title: sceneTitle,
              content: content,
              summary: 'AI Generated'
          }]
      };
      setActiveProject(prev => prev ? ({
          ...prev,
          chapters: [...prev.chapters, newChapter]
      }) : null);
      setActiveSceneId(newSceneId);
  }

  const handleCodexAdd = (entry: CodexEntry) => {
    setActiveProject(prev => prev ? ({ ...prev, codex: [...prev.codex, entry] }) : null);
  };

  const handleCodexAddOrUpdate = (entry: CodexEntry) => {
    setActiveProject(prev => {
        if (!prev) return null;

        const existingIndex = prev.codex.findIndex(e => e.name === entry.name);

        if (existingIndex >= 0) {
            return {
                ...prev,
                codex: prev.codex.map((e, i) => 
                    i === existingIndex 
                        ? { ...e, description: entry.description, tags: entry.tags }
                        : e
                )
            };
        } else {
            return {
                ...prev,
                codex: [...prev.codex, entry]
            };
        }
    });
  };

  const handleClearCodex = () => {
    setActiveProject(prev => prev ? ({ ...prev, codex: [] }) : null);
  };

  const handleCodexUpdate = (updatedEntry: CodexEntry) => {
    setActiveProject(prev => prev ? ({
      ...prev,
      codex: prev.codex.map(e => e.id === updatedEntry.id ? updatedEntry : e)
    }) : null);
  };

  const handleCodexDelete = (id: string) => {
    setActiveProject(prev => prev ? ({
      ...prev,
      codex: prev.codex.filter(e => e.id !== id)
    }) : null);
  };

  const handleChapterSelect = (chapter: Chapter) => {
    if (chapter.scenes.length > 0) {
      setActiveSceneId(chapter.scenes[0].id);
    }
    setViewMode(ViewMode.Plan);
  };

  // Snapshot Handlers
  const handleCreateSnapshot = (note: string) => {
      const newSnapshot: Snapshot = {
          id: `snap_${Date.now()}`,
          timestamp: Date.now(),
          note: note,
          data: JSON.parse(JSON.stringify(activeProject))
      };
      if (newSnapshot.data.snapshots) delete newSnapshot.data.snapshots;

      setActiveProject(prev => prev ? ({
          ...prev,
          snapshots: [...(prev.snapshots || []), newSnapshot]
      }) : null);
  };

  const handleRestoreSnapshot = (snapshot: Snapshot) => {
      setActiveProject(prev => prev ? ({
          ...snapshot.data,
          snapshots: prev.snapshots
      }) : null);
      if(snapshot.data.chapters.length > 0) {
          setActiveSceneId(snapshot.data.chapters[0].scenes[0].id);
      }
  };

  const handleDeleteSnapshot = (snapshotId: string) => {
      setActiveProject(prev => prev ? ({
          ...prev,
          snapshots: (prev.snapshots || []).filter(s => s.id !== snapshotId)
      }) : null);
  };

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 overflow-hidden font-sans transition-colors duration-200">
      
      {/* LEFT SIDEBAR */}
      {showLeftPanel && (
        <div className="w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col transition-colors duration-200 shrink-0">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-start">
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                     <button 
                        onClick={handleCloseProject}
                        className="text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 transition-colors p-1 -ml-1"
                        title={t('sidebar.back_to_dashboard')}
                     >
                        <Icons.ArrowLeft />
                     </button>
                    <h1 className={`text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r ${colorClasses.gradient} truncate`}>
                        {t('app.title')}
                    </h1>
                </div>
                <p className="text-xs text-slate-500 truncate max-w-full">{activeProject.title}</p>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0 ml-1">
                 <button 
                    onClick={() => setShowLeftPanel(false)}
                    className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                >
                    <Icons.PanelLeft />
                </button>
            </div>
            </div>

            {/* View Switcher */}
            <div className="px-4 py-2 grid grid-cols-2 gap-2 border-b border-slate-200 dark:border-slate-800">
            <button 
                onClick={() => setViewMode(ViewMode.Write)}
                className={`flex items-center justify-center gap-1 py-1.5 rounded text-xs font-medium transition-colors ${
                viewMode === ViewMode.Write 
                    ? `${colorClasses.primary} text-white` 
                    : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
                title={t('sidebar.view_write')}
            >
                <Icons.Pen />
            </button>
            <button 
                onClick={() => setViewMode(ViewMode.Plan)}
                className={`flex items-center justify-center gap-1 py-1.5 rounded text-xs font-medium transition-colors ${
                viewMode === ViewMode.Plan 
                    ? `${colorClasses.primary} text-white` 
                    : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
                title={t('sidebar.view_plan')}
            >
                <Icons.Grid />
            </button>
            </div>

            <nav className="flex-1 overflow-y-auto py-4">
            <div className="px-4 mb-2 flex justify-between items-center cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 py-1" onClick={handleToggleManuscript}>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t('sidebar.manuscript')}</span>
                <span className="text-slate-400 text-xs transform transition-transform duration-200">
                  {isManuscriptExpanded ? '▼' : '▶'}
                </span>
            </div>
            {isManuscriptExpanded && (
              <div className="space-y-1">
                {activeProject.chapters.map(chapter => {
                  const isChapterExpanded = !expandedChapters.has(chapter.id);

                  return (
                    <div key={chapter.id}>
                      <div className="px-4 py-1 flex justify-between items-center group/chapter">
                        <div
                          onClick={() => {
                            handleToggleChapter(chapter.id);
                            handleChapterSelect(chapter);
                          }}
                          className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center cursor-pointer hover:text-slate-800 dark:hover:text-slate-200"
                        >
                          <span className="opacity-50 mr-1">{isChapterExpanded ? '▼' : '▶'}</span>
                          {chapter.title}
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleAddScene(chapter.id); }}
                          className="opacity-0 group-hover/chapter:opacity-100 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs"
                          title="Add Scene"
                        >
                          <Icons.Plus />
                        </button>
                      </div>

                      {isChapterExpanded && (
                        <div>
                          {chapter.scenes.map(scene => {
                            const isCurrentScene = activeSceneId === scene.id;
                            const isExpanded = expandedScenes.has(scene.id) || isCurrentScene;

                            return (
                              <div key={scene.id}>
                                <div className="flex items-center">
                                  <div
                                    role="button"
                                    tabIndex={0}
                                    onClick={() => {
                                      setActiveSceneId(scene.id);
                                      setViewMode(ViewMode.Write);
                                    }}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault();
                                        setActiveSceneId(scene.id);
                                        setViewMode(ViewMode.Write);
                                      }
                                    }}
                                    className={`flex-1 text-left px-8 py-2 text-sm transition-colors border-l-2 flex items-center justify-between cursor-pointer ${
                                      isCurrentScene
                                        ? `bg-slate-50 dark:bg-slate-800 ${colorClasses.text} ${colorClasses.border}`
                                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50 border-transparent'
                                    }`}
                                  >
                                    <span>{scene.title}</span>
                                    {isCurrentScene && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleToggleScenePages(scene.id);
                                        }}
                                        className="text-[10px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 px-1"
                                        title={isExpanded ? 'Collapse Pages' : 'Expand Pages'}
                                      >
                                        {isExpanded ? '▲' : '▼'}
                                      </button>
                                    )}
                                  </div>
                                </div>

                                {isCurrentScene && isExpanded && (
                                  <div className="pl-14 pr-4 py-1 space-y-0.5">
                                    {Array.from({ length: activePageCount }, (_, i) => (
                                      <button
                                        key={i}
                                        onClick={() => handlePageJump(scene.id, i)}
                                        className={`w-full text-left px-3 py-1 text-xs rounded transition-colors ${
                                          activePageIndex === i
                                            ? `${colorClasses.text} ${colorClasses.bg} font-medium`
                                            : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                                        }`}
                                      >
                                        Page {i + 1}
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <div className="px-4 mt-2">
                <button
                onClick={handleAddChapter} 
                className="w-full py-1 text-xs border border-dashed border-slate-300 dark:border-slate-700 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 rounded hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center justify-center gap-1"
                >
                    <Icons.Plus /> Add Chapter
                </button>
            </div>

            <div 
                onClick={() => setIsToolsExpanded(!isToolsExpanded)}
                className="mt-8 px-4 mb-2 flex items-center justify-between cursor-pointer group select-none hover:bg-slate-50 dark:hover:bg-slate-800/50 py-1"
            >
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors">
                {t('sidebar.tools')}
                </div>
                <div className={`text-slate-400 transform transition-transform duration-200 ${isToolsExpanded ? 'rotate-90' : ''} scale-75`}>
                <Icons.ChevronRight />
                </div>
            </div>

            <div className={`space-y-1 overflow-hidden transition-all duration-300 ease-in-out ${isToolsExpanded ? 'max-h-80 opacity-100' : 'max-h-0 opacity-0'}`}>
                <button 
                onClick={() => { setShowRightPanel(true); setRightPanelMode('Codex'); }}
                className="w-full text-left px-4 py-2 text-sm text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2"
                >
                <Icons.Book /> {t('sidebar.codex')}
                </button>

                <button 
                onClick={() => setShowHistory(true)}
                className="w-full text-left px-4 py-2 text-sm text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2"
                >
                <Icons.History /> {t('sidebar.history')}
                </button>
                
                <button 
                onClick={() => setShowSettings(true)}
                className="w-full text-left px-4 py-2 text-sm text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2"
                >
                <Icons.Settings /> {t('sidebar.settings')}
                </button>

                <button 
                onClick={() => setShowHelp(true)}
                className="w-full text-left px-4 py-2 text-sm text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2"
                >
                <Icons.Help /> {t('sidebar.guide')}
                </button>
            </div>
            </nav>

            <div className="p-4 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-500">
            {activeProject.subgenre && (
                <div className="mb-2 text-slate-500">
                <span className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-[10px]">{activeProject.subgenre}</span>
                </div>
            )}
            <div className="flex justify-between items-center opacity-70">
                <span>{t('sidebar.plan')}</span>
                <span className={`text-[10px] ${isSaving ? 'animate-pulse text-blue-500' : 'text-slate-400'}`}>
                    {isSaving ? t('sidebar.saving') : lastSaved ? `${t('sidebar.saved')} ${lastSaved.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}` : ''}
                </span>
            </div>
            </div>
        </div>
      )}

      {/* CENTER */}
      <div className="flex-1 flex flex-col min-w-0">
        {viewMode === ViewMode.Plan ? (
           <Storyboard
              chapters={activeProject.chapters}
              onSceneSelect={(id) => {
                 setActiveSceneId(id);
                 setViewMode(ViewMode.Write);
              }}
              onSceneUpdate={handleSceneUpdate}
              onSceneReferenceInsert={handleSceneReferenceInsert}
           />
        ) : activeScene ? (
          <Editor
            ref={editorRef}
            activeChapter={activeChapter}
            activeScene={activeScene}
            onSceneUpdate={handleSceneUpdate}
            onCreateScene={handleAICreateScene}
             onCreateChapter={handleAICreateChapter}
             onCodexAdd={handleCodexAdd}
             onCodexAddOrUpdate={handleCodexAddOrUpdate}
             codex={activeProject.codex}
             aiConfig={aiConfig}
             writingLanguage={activeProject.writingLanguage || 'en'}
             shortcuts={shortcuts}
             projectInfo={{
               title: activeProject.title,
               genre: activeProject.genre || 'Fiction',
               subgenre: activeProject.subgenre || 'General',
               description: activeProject.description,
               targetAudience: activeProject.targetAudience,
               narrativePerspective: activeProject.narrativePerspective,
               writingTone: activeProject.writingTone,
               themes: activeProject.themes
             }}
             onActivePageChange={handleActivePageChange}
             onPageCountChange={handlePageCountChange}
           />
        ) : (
          <div className="flex items-center justify-center h-full text-slate-400">
            Select a scene to start writing
          </div>
        )}
      </div>

      {/* RIGHT SIDEBAR */}
      {showRightPanel && (
        <div className="w-80 border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col shadow-xl z-10 transition-colors duration-200 shrink-0">
          <div className="flex border-b border-slate-200 dark:border-slate-800 relative">
            <button
              onClick={() => setRightPanelMode('Chat')}
              className={`flex-1 py-3 text-xs font-bold uppercase tracking-wide transition-colors ${
                rightPanelMode === 'Chat' 
                  ? `border-b-2 ${colorClasses.border} ${colorClasses.text} bg-slate-50 dark:bg-slate-800/50` 
                  : 'text-slate-500 dark:text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              {t('chat.title')}
            </button>
            <button
              onClick={() => setRightPanelMode('Codex')}
              className={`flex-1 py-3 text-xs font-bold uppercase tracking-wide transition-colors ${
                rightPanelMode === 'Codex' 
                  ? `border-b-2 ${colorClasses.border} ${colorClasses.text} bg-slate-50 dark:bg-slate-800/50` 
                  : 'text-slate-500 dark:text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              {t('codex.title')}
            </button>
            <button 
                onClick={() => setShowRightPanel(false)}
                className="px-3 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 absolute right-0 top-0 bottom-0 border-l border-slate-100 dark:border-slate-800"
                title="Collapse Panel"
            >
                <Icons.PanelRight />
            </button>
          </div>

          <div className="flex-1 overflow-hidden relative">
            {rightPanelMode === 'Codex' ? (
              <CodexPanel
                entries={activeProject.codex}
                onAddEntry={handleCodexAdd}
                onAddOrUpdateEntry={handleCodexAddOrUpdate}
                onUpdateEntry={handleCodexUpdate}
                onDeleteEntry={handleCodexDelete}
                aiConfig={aiConfig}
                writingLanguage={activeProject.writingLanguage || 'en'}
                currentSceneContent={activeScene?.content}
              />
            ) : (
              <ChatPanel
                  codex={activeProject.codex}
                  aiConfig={aiConfig}
                  writingLanguage={activeProject.writingLanguage || 'en'}
                  projectInfo={{
                    title: activeProject.title,
                    genre: activeProject.genre,
                    subgenre: activeProject.subgenre,
                    description: activeProject.description,
                    targetAudience: activeProject.targetAudience,
                    narrativePerspective: activeProject.narrativePerspective,
                    writingTone: activeProject.writingTone,
                    themes: activeProject.themes
                  }}
                  structureContext={activeChapter && activeScene ? {
                    projectTitle: activeProject.title,
                    genre: activeProject.genre,
                    subgenre: activeProject.subgenre,
                    description: activeProject.description,
                    targetAudience: activeProject.targetAudience,
                    narrativePerspective: activeProject.narrativePerspective,
                    writingTone: activeProject.writingTone,
                    themes: activeProject.themes,
                    chapterTitle: activeChapter.title,
                    sceneTitle: activeScene.title,
                    sceneIndex: activeChapter.scenes.findIndex((s: Scene) => s.id === activeScene.id),
                    totalScenesInChapter: activeChapter.scenes.length,
                    previousSceneSummary: activeChapter.scenes[activeChapter.scenes.findIndex((s: Scene) => s.id === activeScene.id) - 1]?.summary,
                    targetSceneWordCount: aiConfig.targetSceneWordCount,
                    targetScenesPerChapter: aiConfig.targetSceneCountPerChapter
                  } : undefined}
                  activeScene={activeScene}
                  activeChapter={activeChapter}
                  allChapters={activeProject.chapters}
                  pendingSceneReference={pendingSceneReference}
                  onSceneReferenceInserted={handleSceneReferenceInserted}
              />
            )}
          </div>
        </div>
      )}
      
      {!showRightPanel && (
         <div className="absolute right-4 top-4 z-50">
             <button 
               onClick={() => setShowRightPanel(true)}
               className="bg-white dark:bg-slate-800 p-2 rounded-full shadow-lg border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-700 transition-all"
               title="Expand Panel"
             >
                 <Icons.PanelRight />
             </button>
         </div>
      )}

      {/* Modals */}
      {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}
      {showSettings && (
        <SettingsModal 
          onClose={() => setShowSettings(false)} 
          aiConfig={aiConfig}
          onUpdateAIConfig={setAiConfig}
          supabaseConfig={supabaseConfig}
          onUpdateSupabaseConfig={setSupabaseConfig}
          onDeleteProject={handleDeleteActiveProject}
          project={activeProject}
          onUpdateProject={setActiveProject}
          shortcuts={shortcuts}
          onUpdateShortcuts={setShortcuts}
        />
      )}
      {showHistory && (
          <HistoryModal 
            project={activeProject}
            onClose={() => setShowHistory(false)}
            onCreateSnapshot={handleCreateSnapshot}
            onRestoreSnapshot={handleRestoreSnapshot}
            onDeleteSnapshot={handleDeleteSnapshot}
          />
      )}

    </div>
  );
};

export default App;
