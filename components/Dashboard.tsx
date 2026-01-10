
import React, { useState, useEffect, useRef } from 'react';
import { ProjectMetadata, Project, SupabaseConfig } from '../types';
import { Icons } from '../constants';
import { useI18n } from '../i18n';
import { useTheme } from '../theme';
import GalleryView from './GalleryView';

interface DashboardProps {
  projects: ProjectMetadata[];
  onCreateNew: () => void;
  onSelectProject: (id: string) => void;
  onDeleteProject: (id: string) => void;
  onToggleTheme: () => void;
  onToggleLanguage: () => void;
  onImportProject: (project: Project) => void;
  onPublishRequest: (id: string, visibility: 'public' | 'private') => Promise<void>;
  supabaseConfig: SupabaseConfig;
  onUpdateSupabaseConfig: (config: SupabaseConfig) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ 
  projects, 
  onCreateNew, 
  onSelectProject, 
  onDeleteProject,
  onToggleTheme,
  onToggleLanguage,
  onImportProject,
  onPublishRequest,
  supabaseConfig,
  onUpdateSupabaseConfig
}) => {
  const { t, language } = useI18n();
  const { mode, colorClasses } = useTheme();
  
  const [activeTab, setActiveTab] = useState<'local' | 'gallery'>('local');

  // --- PUBLISH WIZARD STATE ---
  const [publishModal, setPublishModal] = useState<{
      isOpen: boolean;
      step: 'confirm' | 'processing';
      project: ProjectMetadata | null;
      logs: string[];
      isError: boolean;
  }>({
      isOpen: false,
      step: 'confirm',
      project: null,
      logs: [],
      isError: false
  });

  const logEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll logs
  useEffect(() => {
    if (publishModal.isOpen && logEndRef.current) {
        logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [publishModal.logs, publishModal.isOpen]);

  const addLog = (msg: string, isErr = false) => {
      setPublishModal(prev => ({
          ...prev,
          logs: [...prev.logs, `[${new Date().toLocaleTimeString()}] ${msg}`],
          isError: prev.isError || isErr
      }));
  };

  const handlePublishClick = (e: React.MouseEvent, project: ProjectMetadata) => {
      e.stopPropagation();
      // Initialize Modal in Confirmation Step
      setPublishModal({
          isOpen: true,
          step: 'confirm',
          project: project,
          logs: [],
          isError: false
      });
  };

  const executePublish = async (visibility: 'public' | 'private') => {
      if (!publishModal.project) return;

      // Switch to processing view
      setPublishModal(prev => ({
          ...prev,
          step: 'processing',
          logs: [`Initiating publish for "${prev.project?.title}"...`, `Visibility: ${visibility.toUpperCase()}`]
      }));

      try {
          // 1. Config Check
          addLog("Checking configuration...");
          const url = supabaseConfig?.url;
          const key = supabaseConfig?.anonKey;

          if (!url || !key) {
              throw new Error("Supabase URL or Key is missing in Settings.");
          }
          addLog("Configuration found.");

          // 2. Execute
          addLog(`Connecting to Supabase at ${url}...`);
          await onPublishRequest(publishModal.project.id, visibility);

          addLog("✅ SUCCESS: Project successfully published!");
          addLog("It is now available in the Gallery.");

      } catch (e: any) {
          console.error("Publish Error:", e);
          const errMsg = e?.message || JSON.stringify(e);
          addLog(`❌ ERROR: ${errMsg}`, true);
          addLog("Please check your Supabase Settings and try again.");
      }
  };

  const closePublishModal = () => {
      setPublishModal(prev => ({ ...prev, isOpen: false }));
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      if (window.confirm(t('dashboard.delete_confirm'))) {
          onDeleteProject(id);
      }
  };

  // Sort by last modified descending
  const sortedProjects = [...projects].sort((a, b) => b.lastModified - a.lastModified);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 font-sans transition-colors duration-200 relative">
        
        {/* CUSTOM PUBLISH MODAL */}
        {publishModal.isOpen && publishModal.project && (
            <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={(e) => e.stopPropagation()}>
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl max-w-lg w-full flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
                    
                    {/* Modal Header */}
                    <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex justify-between items-center">
                        <h3 className="font-bold text-lg flex items-center gap-2">
                            {publishModal.step === 'confirm' ? (
                                <><Icons.Globe /> Publish to Gallery</>
                            ) : (
                                <><Icons.Server /> Publishing Status</>
                            )}
                        </h3>
                        <button onClick={closePublishModal} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">✕</button>
                    </div>

                    {/* Step 1: Confirmation */}
                    {publishModal.step === 'confirm' && (
                        <div className="p-6">
                            <p className="mb-4 text-slate-600 dark:text-slate-300">
                                You are about to publish <strong>{publishModal.project.title}</strong> to the community gallery.
                            </p>
                            
                            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 p-3 rounded mb-6 text-sm text-blue-800 dark:text-blue-300">
                                <strong>Note:</strong> This will upload your novel's metadata and content to your configured Supabase backend.
                            </div>

                            <div className="flex flex-col gap-3">
                                <button 
                                    onClick={() => executePublish('public')}
                                    className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-2"
                                >
                                    <Icons.Globe /> Publish as Public (Visible to All)
                                </button>
                                <button 
                                    onClick={() => executePublish('private')}
                                    className="w-full py-3 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                                >
                                    <Icons.Key /> Publish as Private (Only Me)
                                </button>
                            </div>
                            
                            <div className="mt-4 text-center">
                                <button onClick={closePublishModal} className="text-sm text-slate-400 hover:text-slate-600 underline">Cancel</button>
                            </div>
                        </div>
                    )}

                    {/* Step 2: Processing Logs */}
                    {publishModal.step === 'processing' && (
                        <div className="flex flex-col h-[400px]">
                            <div className="flex-1 p-4 overflow-y-auto bg-slate-950 font-mono text-xs">
                                {publishModal.logs.map((line, idx) => (
                                    <div key={idx} className={`mb-1.5 ${line.includes('ERROR') ? 'text-red-400 font-bold' : ''} ${line.includes('SUCCESS') ? 'text-emerald-400 font-bold' : 'text-slate-300'}`}>
                                        {line}
                                    </div>
                                ))}
                                <div ref={logEndRef} />
                            </div>
                            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex justify-end">
                                <button 
                                    onClick={closePublishModal}
                                    className={`px-4 py-2 rounded font-medium text-sm text-white ${publishModal.isError ? 'bg-red-600 hover:bg-red-700' : 'bg-slate-600 hover:bg-slate-700'}`}
                                >
                                    {publishModal.isError ? 'Close' : 'Done'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        )}

        {/* Header */}
        <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-20">
            <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
                <div className="flex items-center gap-8">
                    <div>
                        <h1 className={`text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r ${colorClasses.gradient}`}>
                            {t('app.title')}
                        </h1>
                    </div>
                    
                    {/* Tabs */}
                    <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                        <button
                            onClick={() => setActiveTab('local')}
                            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
                                activeTab === 'local' 
                                ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-800 dark:text-white' 
                                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                            }`}
                        >
                            <span className="flex items-center gap-2"><Icons.Grid /> {t('dashboard.tab_local')}</span>
                        </button>
                        <button
                            onClick={() => setActiveTab('gallery')}
                            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
                                activeTab === 'gallery' 
                                ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-800 dark:text-white' 
                                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                            }`}
                        >
                            <span className="flex items-center gap-2"><Icons.Globe /> {t('dashboard.tab_gallery')}</span>
                        </button>
                    </div>
                </div>
                
                <div className="flex items-center gap-2">
                    <button 
                        onClick={onToggleTheme}
                        className="w-9 h-9 flex items-center justify-center bg-slate-100 dark:bg-slate-800 border-none text-slate-500 dark:text-slate-400 rounded-lg hover:text-slate-900 dark:hover:text-white transition-colors"
                    >
                        {mode === 'light' ? <Icons.Moon /> : <Icons.Sun />}
                    </button>
                    <button 
                        onClick={onToggleLanguage}
                        className="h-9 px-3 bg-slate-100 dark:bg-slate-800 border-none text-slate-500 dark:text-slate-400 rounded-lg hover:text-slate-900 dark:hover:text-white font-medium text-xs"
                    >
                        {language === 'en' ? '中文' : 'EN'}
                    </button>
                </div>
            </div>
        </div>

        <div className="pt-8">
            {activeTab === 'gallery' ? (
                <GalleryView 
                    onImport={onImportProject} 
                    config={supabaseConfig} 
                    onUpdateConfig={onUpdateSupabaseConfig}
                    existingHashes={new Set(projects.map(p => p.contentHash).filter(Boolean) as string[])}
                />
            ) : (
                <div className="max-w-6xl mx-auto px-6 pb-20">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        
                        {/* Create New Card */}
                        <button 
                            onClick={onCreateNew}
                            className="flex flex-col items-center justify-center h-48 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 text-slate-400 hover:border-blue-500 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-all group"
                        >
                            <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                <Icons.Plus />
                            </div>
                            <span className="font-medium">{t('dashboard.create_new')}</span>
                        </button>

                        {/* Project Cards */}
                        {sortedProjects.map(project => (
                            <div
                                key={project.id}
                                onClick={() => onSelectProject(project.id)}
                                className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-200 flex flex-col h-52 cursor-pointer relative group"
                            >
                                <div className="p-5 flex-1 flex flex-col">
                                    <div className="flex justify-between items-start mb-2">
                                        {/* Genre badges */}
                                        <div className="flex flex-wrap gap-1">
                                            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                                                {project.genre || 'Fiction'}
                                            </span>
                                            {project.subgenre && (
                                                <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                                    {project.subgenre}
                                                </span>
                                            )}
                                            {project.targetAudience && project.targetAudience !== 'general' && (
                                                <span className="text-[10px] px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300">
                                                    {t(`audience.${project.targetAudience}`) || project.targetAudience}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex gap-1">
                                             <button
                                                onClick={(e) => handlePublishClick(e, project)}
                                                className={`text-slate-300 hover:text-blue-500 transition-colors p-1`}
                                                title={t('dashboard.publish')}
                                            >
                                                <Icons.Globe />
                                            </button>
                                            <button
                                                onClick={(e) => handleDelete(e, project.id)}
                                                className="text-slate-300 hover:text-red-500 transition-colors p-1"
                                                title={t('codex.delete')}
                                            >
                                                <Icons.Trash />
                                            </button>
                                        </div>
                                    </div>

                                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 line-clamp-2 mb-1">
                                        {project.title}
                                    </h3>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">
                                        {project.author}
                                    </p>

                                    {/* Description snippet */}
                                    {project.description && (
                                        <p className="text-xs text-slate-600 dark:text-slate-500 line-clamp-2 mt-auto">
                                            {project.description}
                                        </p>
                                    )}
                                </div>

                                <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-xs text-slate-400 bg-slate-50/50 dark:bg-slate-950/50 rounded-b-xl">
                                    <span>
                                        {new Date(project.lastModified).toLocaleDateString()}
                                    </span>
                                    <div className="flex gap-3">
                                        <span>{project.chapterCount} {t('dashboard.chapters')}</span>
                                        <span>{project.wordCount > 1000 ? `${(project.wordCount/1000).toFixed(1)}k` : project.wordCount} {t('dashboard.words')}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {sortedProjects.length === 0 && (
                        <div className="mt-12 text-center text-slate-400">
                            {t('dashboard.empty')}
                        </div>
                    )}
                </div>
            )}
        </div>
    </div>
  );
};

export default Dashboard;
