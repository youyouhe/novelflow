
export enum CodexCategory {
  Character = 'Character',
  Location = 'Location',
  Item = 'Item',
  Lore = 'Lore',
  Faction = 'Faction', // Organizations, Guilds, Families
  System = 'System',   // Magic systems, Tech rules, Laws
  Species = 'Species', // Races, Creatures, Flora
  Event = 'Event'      // History, Wars, Timeline
}

export interface CodexEntry {
  id: string;
  name: string;
  category: CodexCategory;
  description: string;
  tags: string[];
}

export interface Scene {
  id: string;
  title: string;
  content: string;
  summary?: string;
}

export interface Chapter {
  id: string;
  title: string;
  scenes: Scene[];
}

export interface Snapshot {
  id: string;
  timestamp: number;
  note: string;
  data: Project;
}

export type WritingLanguage = 'en' | 'zh' | 'ja' | 'ko' | 'es' | 'fr' | 'de' | 'it' | 'ru' | 'pt';

// Novel Structure Types
export type NarrativePerspective =
  | 'first_person'
  | 'third_person_limited'
  | 'third_person_omniscient'
  | 'second_person';

export type TargetAudience =
  | 'children'
  | 'young_adult'
  | 'adult'
  | 'general';

export type WritingTone =
  | 'formal'
  | 'casual'
  | 'poetic'
  | 'conversational'
  | 'academic';

export type StoryTheme =
  | 'adventure'
  | 'romance'
  | 'mystery'
  | 'horror'
  | 'comedy'
  | 'drama'
  | 'coming_of_age'
  | 'revenge'
  | 'redemption'
  | 'betrayal'
  | 'friendship'
  | 'family'
  | 'war'
  | 'political'
  | 'psychological';

export interface Project {
  id: string;
  title: string;
  author: string;
  genre: string;        // Required for story context
  subgenre: string;     // Required for story context
  writingLanguage: WritingLanguage;

  // Optional novel structure metadata
  description?: string;           // Brief project synopsis
  targetAudience?: TargetAudience;
  narrativePerspective?: NarrativePerspective;
  writingTone?: WritingTone;
  themes?: StoryTheme[];          // Story themes/genres

  chapters: Chapter[];
  codex: CodexEntry[];
  snapshots?: Snapshot[];
  lastModified?: number; // Added for sorting in dashboard
  contentHash?: string; // New: SHA-256 hash of the content
}

export interface ProjectMetadata {
  id: string;
  title: string;
  author: string;
  genre: string;        // Required
  subgenre: string;     // Required

  // Optional display fields
  description?: string;
  targetAudience?: TargetAudience;
  narrativePerspective?: NarrativePerspective;

  writingLanguage: WritingLanguage;
  lastModified: number;
  wordCount: number;
  chapterCount: number;
  contentHash?: string; // New: Exposed in list for quick checks
}

// --- Gallery Types ---

export interface SupabaseConfig {
    url: string;
    anonKey: string;
}

export type NovelVisibility = 'public' | 'private';

export interface GalleryNovelMetadata {
    id: string;
    title: string;
    author: string;
    genre: string;
    subgenre?: string;
    description: string; // Brief summary for the card
    wordCount: number;
    visibility: NovelVisibility;
    likes: number;
    downloads: number;
    publishedAt: number | string;
    tags: string[];
    contentHash?: string; 
    ownerId?: string; // New: To identify if it belongs to current user
}

export interface GalleryFilter {
    search: string;
    genre: string; // 'All' or specific genre
    sort: 'newest' | 'popular';
    scope: 'community' | 'mine'; // New: Filter by ownership
}

// ---------------------

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}

export enum ViewMode {
  Write = 'Write',
  Plan = 'Plan',
  Codex = 'Codex'
}

export type Language = 'en' | 'zh';

export type ThemeMode = 'light' | 'dark';
export type AccentColor = 'blue' | 'purple' | 'emerald' | 'rose' | 'amber';

export type SettingsTab = 'appearance' | 'writing' | 'ai' | 'image' | 'account';

export type AIProvider = 'gemini' | 'deepseek';
export type ImageProvider = 'gemini' | 'openai_compatible';

export type AIContinuationMode = 'general' | 'action' | 'dialogue' | 'description' | 'twist';
export type AIContinuationLength = 'short' | 'medium' | 'long' | 'very_long';
export type AIContextSize = 'small' | 'medium' | 'large' | 'huge';

export type ExplicitAction = 'continue' | 'new_scene' | 'new_chapter';

export interface AIConfig {
  provider: AIProvider;
  model: string;
  continuationMode?: AIContinuationMode;
  continuationLength?: AIContinuationLength;
  contextSize?: AIContextSize;
  autoScanAfterContinue?: boolean;
  clearCodexBeforeScan?: boolean;
  generateOpeningWithAI?: boolean;
  deepseekApiKey?: string;
  
  // Structure/Pacing Config
  targetSceneWordCount?: number; // Target words per scene (default: 2000)
  targetSceneCountPerChapter?: number; // Target scenes per chapter (default: 5)
  
  // Image Generation Config
  imageProvider?: ImageProvider;
  imageModel?: string; // e.g. 'gemini-2.5-flash-image' or 'dall-e-3'
  imageBaseUrl?: string; // For openai_compatible
  imageApiKey?: string; // For openai_compatible
  imageSize?: string; // e.g. '1024x1024' or '2:3'
  
  // Mode-specific length constraints override: true = ignore length constraint for this mode
  modeLengthOverrides?: Record<AIContinuationMode, boolean>;
  
  // Explicit action override: if set, use this action instead of letting AI decide
  explicitAction?: ExplicitAction;
}

export interface KeyboardConfig {
  aiContinue: string; // e.g., "Alt+c"
}

// Response structure for Smart Continuation
export interface SmartContinuationResponse {
    action: 'continue' | 'new_scene' | 'new_chapter';
    title?: string; // Required if action is new_scene or new_chapter
    content: string;
    summary?: string; // Optional summary for the new scene
}

export interface StoryStructureContext {
    projectTitle: string;
    genre: string;
    subgenre?: string;

    // Optional style and audience context
    description?: string;
    targetAudience?: TargetAudience;
    narrativePerspective?: NarrativePerspective;
    writingTone?: WritingTone;
    themes?: StoryTheme[];

    chapterTitle: string;
    sceneTitle: string;
    sceneIndex: number; // 0-based index
    totalScenesInChapter: number;
    previousSceneSummary?: string;
    currentSceneWordCount?: number; // Added for pacing control
    currentScenePageCount?: number; // Added for pacing control
    currentPageIndex?: number; // Current page being edited (0-based)
    targetSceneWordCount?: number; // Target words per scene for pacing control
    targetScenesPerChapter?: number; // Target scenes per chapter for pacing control
}

export interface SceneReference {
    chapterTitle: string;
    sceneIndex: number;
    scene: Scene;
    displayText: string;
}
