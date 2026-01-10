
import React, { useState } from 'react';
import { GENRE_TEMPLATES } from '../constants';
import { useI18n } from '../i18n';
import { Project, WritingLanguage, AIConfig, NarrativePerspective, TargetAudience, WritingTone } from '../types';
import { useTheme } from '../theme';
import { generateNovelOpening } from '../services/aiService';

interface NewProjectModalProps {
  onClose: () => void;
  onCreate: (project: Project) => void;
  aiConfig?: AIConfig; // Optional to handle if not passed yet
}

const NewProjectModal: React.FC<NewProjectModalProps> = ({ onClose, onCreate, aiConfig }) => {
  const { t, language } = useI18n();
  const { colorClasses } = useTheme();
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [selectedGenreId, setSelectedGenreId] = useState('');
  const [selectedSubgenre, setSelectedSubgenre] = useState('');
  const [writingLanguage, setWritingLanguage] = useState<WritingLanguage>('en');
  const [isGenerating, setIsGenerating] = useState(false);

  // Advanced settings state
  const [description, setDescription] = useState('');
  const [targetAudience, setTargetAudience] = useState<TargetAudience>('general');
  const [narrativePerspective, setNarrativePerspective] = useState<NarrativePerspective>('third_person_limited');
  const [writingTone, setWritingTone] = useState<WritingTone>('conversational');
  const [showAdvanced, setShowAdvanced] = useState(false);

  const selectedTemplate = GENRE_TEMPLATES.find(g => g.id === selectedGenreId);

  const getOpeningContent = async (): Promise<string> => {
      // 1. Check if AI generation is enabled and config is present
      if (aiConfig?.generateOpeningWithAI) {
          try {
              setIsGenerating(true);
              const aiOpening = await generateNovelOpening(
                  title,
                  author,
                  selectedTemplate?.name[language] || '',
                  selectedSubgenre,
                  writingLanguage,
                  aiConfig
              );
              return aiOpening;
          } catch (e) {
              console.error("Failed to generate opening with AI, falling back to template", e);
              // Fallback to static template on error
          } finally {
              setIsGenerating(false);
          }
      }

      // 2. Default: Randomly select a static template option
      const langKey = (writingLanguage === 'zh') ? 'zh' : 'en';
      if (selectedTemplate?.openingOptions && selectedTemplate.openingOptions.length > 0) {
          const randomIndex = Math.floor(Math.random() * selectedTemplate.openingOptions.length);
          return selectedTemplate.openingOptions[randomIndex][langKey];
      }
      
      // 3. Fallback to legacy default content if available
      return selectedTemplate?.defaultContent?.[langKey] || '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !author || !selectedGenreId || !selectedSubgenre || isGenerating) return;

    // Show loading state if we are about to generate
    if (aiConfig?.generateOpeningWithAI) {
        setIsGenerating(true);
    }

    const content = await getOpeningContent();

    const newProject: Project = {
      id: `proj_${Date.now()}`,
      title,
      author,
      genre: selectedTemplate?.name[language] || 'Fiction',
      subgenre: selectedTemplate?.subcategories.find(s => s.zh === selectedSubgenre || s.en === selectedSubgenre)?.[language] || selectedSubgenre || 'General',
      writingLanguage,
      description: description || undefined,
      targetAudience,
      narrativePerspective,
      writingTone,
      chapters: [
        {
          id: `chap_${Date.now()}`,
          title: language === 'zh' ? '第一章：序幕' : 'Chapter 1: The Beginning',
          scenes: [
            {
              id: `scene_${Date.now()}`,
              title: language === 'zh' ? '开场' : 'Opening Scene',
              content: content,
              summary: 'Start of the adventure.'
            }
          ]
        }
      ],
      codex: [] // Empty codex for new project
    };

    onCreate(newProject);
  };

  const supportedLanguages: WritingLanguage[] = ['en', 'zh', 'ja', 'ko', 'es', 'fr', 'de', 'it', 'ru', 'pt'];

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl max-w-md w-full flex flex-col">
        <div className="p-6 border-b border-slate-200 dark:border-slate-800">
          <h2 className="text-xl font-bold text-slate-800 dark:text-white">
             {t('modal.new_project.title')}
          </h2>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">{t('modal.new_project.name')}</label>
            <input 
              required
              className={`w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded px-3 py-2 text-slate-900 dark:text-slate-200 focus:outline-none ${colorClasses.ring}`}
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="..."
            />
          </div>
          
          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">{t('modal.new_project.author')}</label>
            <input 
              required
              className={`w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded px-3 py-2 text-slate-900 dark:text-slate-200 focus:outline-none ${colorClasses.ring}`}
              value={author}
              onChange={e => setAuthor(e.target.value)}
              placeholder="..."
            />
          </div>

           <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">{t('modal.new_project.writing_lang')}</label>
              <select
                className={`w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded px-3 py-2 text-slate-900 dark:text-slate-200 focus:outline-none text-sm ${colorClasses.ring}`}
                value={writingLanguage}
                onChange={e => setWritingLanguage(e.target.value as WritingLanguage)}
              >
                 {supportedLanguages.map(lang => (
                    <option key={lang} value={lang}>{t(`lang.${lang}`)}</option>
                 ))}
              </select>
           </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
               <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">{t('modal.new_project.genre')}</label>
               <select 
                  required
                  className={`w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded px-3 py-2 text-slate-900 dark:text-slate-200 focus:outline-none text-sm ${colorClasses.ring}`}
                  value={selectedGenreId}
                  onChange={e => {
                    setSelectedGenreId(e.target.value);
                    setSelectedSubgenre('');
                  }}
               >
                  <option value="" disabled>{t('modal.new_project.select_genre')}</option>
                  {GENRE_TEMPLATES.map(g => (
                    <option key={g.id} value={g.id}>
                      {g.name[language]}
                    </option>
                  ))}
               </select>
            </div>
            
            <div>
               <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">{t('modal.new_project.subgenre')}</label>
               <select 
                  required
                  disabled={!selectedGenreId}
                  className={`w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded px-3 py-2 text-slate-900 dark:text-slate-200 focus:outline-none text-sm disabled:opacity-50 ${colorClasses.ring}`}
                  value={selectedSubgenre}
                  onChange={e => setSelectedSubgenre(e.target.value)}
               >
                  <option value="" disabled>{t('modal.new_project.select_subgenre')}</option>
                  {selectedTemplate?.subcategories.map(s => (
                    <option key={s.zh} value={s.zh}>
                      {s[language]}
                    </option>
                  ))}
               </select>
            </div>
          </div>

          {/* Advanced Settings Toggle */}
          <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="w-full text-left px-2 py-2 text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 flex items-center gap-2 transition-colors"
            >
              <span>{showAdvanced ? '▼' : '▶'}</span>
              <span>{t('modal.new_project.advanced_settings') || 'Advanced Settings (Optional)'}</span>
            </button>

            {showAdvanced && (
              <div className="mt-4 space-y-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                {/* Description */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
                    {t('modal.new_project.description') || 'Story Synopsis'}
                  </label>
                  <textarea
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded px-3 py-2 text-sm text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder={t('modal.new_project.description_placeholder') || 'Brief description of your story...'}
                    rows={2}
                  />
                </div>

                {/* Target Audience */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
                    {t('modal.new_project.target_audience') || 'Target Audience'}
                  </label>
                  <select
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded px-3 py-2 text-sm text-slate-900 dark:text-slate-200 focus:outline-none"
                    value={targetAudience}
                    onChange={e => setTargetAudience(e.target.value as TargetAudience)}
                  >
                    <option value="general">{t('audience.general') || 'General Audience'}</option>
                    <option value="young_adult">{t('audience.young_adult') || 'Young Adult'}</option>
                    <option value="adult">{t('audience.adult') || 'Adult'}</option>
                    <option value="children">{t('audience.children') || 'Children'}</option>
                  </select>
                </div>

                {/* Narrative Perspective */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
                    {t('modal.new_project.narrative_perspective') || 'Narrative Perspective'}
                  </label>
                  <select
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded px-3 py-2 text-sm text-slate-900 dark:text-slate-200 focus:outline-none"
                    value={narrativePerspective}
                    onChange={e => setNarrativePerspective(e.target.value as NarrativePerspective)}
                  >
                    <option value="third_person_limited">{t('perspective.third_limited') || 'Third Person Limited'}</option>
                    <option value="first_person">{t('perspective.first_person') || 'First Person (I)'}</option>
                    <option value="third_person_omniscient">{t('perspective.third_omniscient') || 'Third Person Omniscient'}</option>
                    <option value="second_person">{t('perspective.second_person') || 'Second Person (You)'}</option>
                  </select>
                </div>

                {/* Writing Tone */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
                    {t('modal.new_project.writing_tone') || 'Writing Tone'}
                  </label>
                  <select
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded px-3 py-2 text-sm text-slate-900 dark:text-slate-200 focus:outline-none"
                    value={writingTone}
                    onChange={e => setWritingTone(e.target.value as WritingTone)}
                  >
                    <option value="conversational">{t('tone.conversational') || 'Conversational'}</option>
                    <option value="formal">{t('tone.formal') || 'Formal'}</option>
                    <option value="poetic">{t('tone.poetic') || 'Poetic'}</option>
                    <option value="casual">{t('tone.casual') || 'Casual'}</option>
                    <option value="academic">{t('tone.academic') || 'Academic'}</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {aiConfig?.generateOpeningWithAI && (
             <div className="text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 p-2 rounded">
                🤖 AI Generation Active: The opening scene will be uniquely generated based on your title and genre.
             </div>
          )}

          <div className="pt-4 flex justify-end gap-3">
             <button 
               type="button" 
               onClick={onClose}
               disabled={isGenerating}
               className="px-4 py-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition-colors text-sm disabled:opacity-50"
             >
               {t('modal.new_project.cancel')}
             </button>
             <button 
               type="submit"
               disabled={isGenerating}
               className={`px-6 py-2 ${colorClasses.primary} ${colorClasses.hover} text-white rounded font-medium text-sm transition-colors shadow-lg flex items-center gap-2 disabled:opacity-70 disabled:cursor-wait`}
             >
               {isGenerating && <span className="animate-spin text-lg">⟳</span>}
               {isGenerating ? t('modal.new_project.generating') : t('modal.new_project.create')}
             </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewProjectModal;
