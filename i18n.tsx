
import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Language } from './types';

type Translations = {
  [key: string]: string;
};

const en: Translations = {
  // Sidebar
  'app.title': 'NovelFlow',
  'sidebar.manuscript': 'Manuscript',
  'sidebar.tools': 'Tools',
  'sidebar.codex': 'Codex Manager',
  'sidebar.guide': 'Quick Guide',
  'sidebar.new_project': 'New Project',
  'sidebar.settings': 'Settings',
  'sidebar.plan': 'Artisan Plan',
  'sidebar.toggle_lang': '中文', 
  'sidebar.view_mode': 'View Mode',
  'sidebar.view_write': 'Writer',
  'sidebar.view_plan': 'Storyboard',
  'sidebar.saving': 'Saving...',
  'sidebar.saved': 'Saved',
  'sidebar.history': 'History & Snapshots',
  'sidebar.back_to_dashboard': 'Back to Projects',

  // Dashboard
  'dashboard.title': 'Your Projects',
  'dashboard.tab_local': 'My Workspace',
  'dashboard.tab_gallery': 'Novel Gallery (Cloud)',
  'dashboard.create_new': 'Create New Story',
  'dashboard.last_modified': 'Last modified',
  'dashboard.chapters': 'chapters',
  'dashboard.words': 'words',
  'dashboard.delete_confirm': 'Are you sure you want to delete this project? This action cannot be undone.',
  'dashboard.empty': 'No projects yet. Start your journey!',
  'dashboard.publish': 'Publish to Gallery',
  'dashboard.publish_confirm': 'Publish "%s" to the Gallery? You can choose visibility next.',
  
  // Gallery
  'gallery.title': 'Community Novels',
  'gallery.search_placeholder': 'Search novels...',
  'gallery.filter_all': 'All Genres',
  'gallery.sort_newest': 'Newest',
  'gallery.sort_popular': 'Most Popular',
  'gallery.empty': 'No novels found in the gallery.',
  'gallery.download': 'Clone to Workspace',
  'gallery.downloaded': 'Cloned!',
  'gallery.likes': 'Likes',
  'gallery.downloads': 'Clones',
  'gallery.visibility_public': 'Public',
  'gallery.visibility_private': 'Private',
  'gallery.publish_success': 'Novel published successfully!',
  'gallery.config_warning': 'Please configure your Supabase URL and Anon Key in Settings first.',

  // Storyboard
  'storyboard.title': 'Chapter Storyboard',
  'storyboard.scenes': 'Scenes',
  'storyboard.empty': 'No scenes in this chapter.',
  'storyboard.summary_placeholder': 'Add a summary...',
  'storyboard.edit': 'Edit Scene',
  'storyboard.words': 'words',

  // Settings
  'settings.title': 'Settings',
  'settings.tab_appearance': 'Appearance',
  'settings.tab_writing': 'Writing',
  'settings.tab_ai': 'AI',
  'settings.tab_image': 'Image',
  'settings.tab_account': 'Account',
  'settings.theme': 'Theme',
  'settings.accent': 'Accent Color',
  'settings.light': 'Light',
  'settings.dark': 'Dark',
  'settings.close': 'Close',
  'settings.ai_config': 'AI Configuration',
  'settings.provider': 'AI Provider',
  'settings.api_key': 'API Key',
  'settings.api_key_placeholder': 'Enter your API Key...',
  'settings.auto_scan': 'Auto-scan for new Codex entries after AI generation',
  'settings.clear_codex_before_scan': 'Clear Codex before scanning',
  'settings.generate_opening': 'Use AI to generate unique novel opening',
  'settings.delete_project': 'Danger Zone',
  'settings.delete_btn': 'Delete Current Project',
  'settings.delete_confirm': 'Are you sure? This will delete the current project and reset to default.',
  'settings.writing_lang': 'Novel Writing Language',
  'settings.shortcuts': 'Keyboard Shortcuts',
  'settings.shortcut_continue': 'AI Continue / Write Ahead',
  'settings.shortcut_placeholder': 'Click to record...',
  'settings.test_conn': 'Test Connection',
  'settings.test_success': 'Success!',
  'settings.test_fail': 'Failed',
  
  // Image Generation Settings
  'settings.image_title': 'Text-to-Image Generation',
  'settings.image_provider': 'Image Provider',
  'settings.image_model': 'Model Name',
  'settings.image_base_url': 'Base URL (Optional)',
  'settings.image_api_key': 'API Key (Optional)',

  // Codex
  'codex.title': 'Codex (World Bible)',
  'codex.all': 'All',
  'codex.new_placeholder': 'New Entry Name...',
  'codex.consulting': 'Consulting the oracle...',
  'codex.no_entries': 'No entries found.',
  'codex.create_tip': 'Create one to start building your world.',
  'codex.save': 'Save',
  'codex.delete': 'Delete',
  'codex.generated_tag': 'AI Generated',

  // Chat
  'chat.title': 'AI Assistant',
  'chat.active': 'Codex Active',
  'chat.entries': 'entries',
  'chat.placeholder': 'Ask about your story...',
  'chat.you': 'You',
  'chat.model': 'AI',
  'chat.welcome': 'Greetings, Author. I have read your Codex. How can I assist with your story today?',

  // Editor
  'editor.words': 'words',
  'editor.rewrite': 'Rewrite Selection',
  'editor.write_ahead': 'Write Ahead',
  'editor.continue_scene': 'Continue Scene',
  'editor.finish_scene': 'Finish Scene',
  'editor.finish_chapter': 'Finish Chapter',
  'editor.auto_decide': 'Auto Decide',
  'editor.writing': 'Writing...',
  'editor.scanning': 'Scanning Codex...',
  'editor.gen_image': 'Generate Image',
  'editor.generating_image': 'Painting...',
  'editor.draft_mode': 'Draft Mode',
  'editor.opening_scene': 'Opening',

  // Modal - New Project
  'modal.new_project.title': 'Create New Project',
  'modal.new_project.name': 'Story Title',
  'modal.new_project.author': 'Author Name',
  'modal.new_project.genre': 'Genre',
  'modal.new_project.subgenre': 'Subgenre',
  'modal.new_project.select_genre': 'Select Genre',
  'modal.new_project.select_subgenre': 'Select Subgenre',
  'modal.new_project.create': 'Create Novel',
  'modal.new_project.generating': 'Generating Opening...',
  'modal.new_project.cancel': 'Cancel',
  'modal.new_project.writing_lang': 'Writing Language (for AI)',
  'modal.new_project.advanced_settings': 'Advanced Settings (Optional)',
  'modal.new_project.description': 'Story Synopsis',
  'modal.new_project.description_placeholder': 'Brief description of your story...',
  'modal.new_project.target_audience': 'Target Audience',
  'modal.new_project.narrative_perspective': 'Narrative Perspective',
  'modal.new_project.writing_tone': 'Writing Tone',

  // Audience options
  'audience.general': 'General Audience',
  'audience.young_adult': 'Young Adult',
  'audience.adult': 'Adult',
  'audience.children': 'Children',

  // Perspective options
  'perspective.first_person': 'First Person (I)',
  'perspective.third_limited': 'Third Person Limited',
  'perspective.third_omniscient': 'Third Person Omniscient',
  'perspective.second_person': 'Second Person (You)',

  // Tone options
  'tone.conversational': 'Conversational',
  'tone.formal': 'Formal',
  'tone.poetic': 'Poetic',
  'tone.casual': 'Casual',
  'tone.academic': 'Academic',

  // History Modal
  'history.title': 'Project Snapshots',
  'history.create': 'Create Snapshot',
  'history.restore': 'Restore',
  'history.placeholder': 'Snapshot description...',
  'history.no_snapshots': 'No snapshots found.',
  'history.created': 'Created',
  'history.restore_confirm': 'Restore this snapshot? Current progress will be overwritten.',
  'history.delete': 'Delete',
  'history.delete_confirm': 'Are you sure you want to delete this snapshot?',

  // Help Modal
  'help.title': 'NovelFlow Quick Guide',
  'help.close': 'Got it, let\'s write!',
  'help.section1.title': 'The Codex (World Bible)',
  'help.section1.desc': 'The Codex is the brain of your project. It stores Characters, Locations, Items, and Lore.',
  'help.section1.p1': 'Why it matters: Every time you use AI to write or chat, it reads your Codex first.',
  'help.section1.p2': 'Benefit: The AI "knows" your protagonist\'s eye color or the rules of your magic system, preventing hallucinations.',
  'help.section1.p3': 'Tip: Use the "Generate with AI" (Sparkles icon) in the Codex panel to quickly flesh out ideas.',
  
  'help.section2.title': 'Writing & Continuation',
  'help.section2.desc': 'Write normally in the main editor. When you get stuck or need inspiration:',
  'help.section2.p1': 'Write Ahead: Click the "Write Ahead" button to let the AI write the next few paragraphs based on your recent text and Codex context.',
  'help.section2.p2': 'Rewrite Selection: Highlight any text in the editor. A "Rewrite Selection" button will appear in the toolbar.',

  'help.section3.title': 'AI Chat Assistant',
  'help.section3.desc': 'The Chat panel (right sidebar) is your co-author.',
  'help.section3.p1': 'Context Aware: Unlike ChatGPT, this assistant has access to your specific story bible.',
  'help.section3.p2': 'Use Cases: Ask "What happens if Elara visits the Syndicate?" or "Help me brainstorm a plot twist".',
  
  'help.privacy': 'Privacy & Keys',
  'help.privacy.desc': 'NovelFlow uses a BYOK (Bring Your Own Key) model. Your API Key communicates directly with Google or DeepSeek servers.',

  // Languages
  'lang.en': 'English',
  'lang.zh': 'Chinese (Simplified)',
  'lang.ja': 'Japanese',
  'lang.ko': 'Korean',
  'lang.es': 'Spanish',
  'lang.fr': 'French',
  'lang.de': 'German',
  'lang.it': 'Italian',
  'lang.ru': 'Russian',
  'lang.pt': 'Portuguese'
};

const zh: Translations = {
  // Sidebar
  'app.title': 'NovelFlow',
  'sidebar.manuscript': '稿件 (Manuscript)',
  'sidebar.tools': '工具箱 (Tools)',
  'sidebar.codex': '设定集管理 (Codex)',
  'sidebar.guide': '快速指南 (Guide)',
  'sidebar.new_project': '新建项目 (New)',
  'sidebar.settings': '设置 (Settings)',
  'sidebar.plan': '工匠版 (Artisan)',
  'sidebar.toggle_lang': 'English',
  'sidebar.view_mode': '视图模式',
  'sidebar.view_write': '写作模式',
  'sidebar.view_plan': '故事板',
  'sidebar.saving': '正在保存...',
  'sidebar.saved': '已保存',
  'sidebar.history': '历史快照',
  'sidebar.back_to_dashboard': '返回项目列表',

  // Dashboard
  'dashboard.title': '我的项目',
  'dashboard.tab_local': '我的工作台',
  'dashboard.tab_gallery': '云端画廊 (Gallery)',
  'dashboard.create_new': '创建新故事',
  'dashboard.last_modified': '最后修改',
  'dashboard.chapters': '章',
  'dashboard.words': '字',
  'dashboard.delete_confirm': '确定要删除这个项目吗？此操作无法撤销。',
  'dashboard.empty': '暂无项目，开始你的创作之旅吧！',
  'dashboard.publish': '发布到画廊',
  'dashboard.publish_confirm': '将 "%s" 发布到画廊？你可以在下一步选择是否公开。',

  // Gallery
  'gallery.title': '社区精选',
  'gallery.search_placeholder': '搜索小说...',
  'gallery.filter_all': '全部分类',
  'gallery.sort_newest': '最新发布',
  'gallery.sort_popular': '最受欢迎',
  'gallery.empty': '画廊里还没有小说。',
  'gallery.download': '克隆到本地',
  'gallery.downloaded': '已克隆！',
  'gallery.likes': '点赞',
  'gallery.downloads': '克隆',
  'gallery.visibility_public': '公开',
  'gallery.visibility_private': '私有',
  'gallery.publish_success': '发布成功！',
  'gallery.config_warning': '请先在设置中配置 Supabase URL 和 Anon Key。',

  // Storyboard
  'storyboard.title': '章节故事板',
  'storyboard.scenes': '场景',
  'storyboard.empty': '本章暂无场景。',
  'storyboard.summary_placeholder': '添加摘要...',
  'storyboard.edit': '编辑场景',
  'storyboard.words': '字',

  // Settings
  'settings.title': '设置',
  'settings.tab_appearance': '外观',
  'settings.tab_writing': '写作',
  'settings.tab_ai': 'AI设置',
  'settings.tab_image': '图像',
  'settings.tab_account': '账户',
  'settings.theme': '主题',
  'settings.accent': '强调色',
  'settings.light': '亮色',
  'settings.dark': '暗色',
  'settings.close': '关闭',
  'settings.ai_config': 'AI 配置',
  'settings.provider': 'AI 提供商',
  'settings.api_key': 'API Key',
  'settings.api_key_placeholder': '输入你的 API Key...',
  'settings.auto_scan': 'AI 续写后自动扫描并添加设定集条目',
  'settings.clear_codex_before_scan': '清空设定集',
  'settings.generate_opening': '利用 AI 生成独一无二的小说开头',
  'settings.delete_project': '危险区域',
  'settings.delete_btn': '删除当前项目',
  'settings.delete_confirm': '确定要删除吗？这将清空当前项目并重置为默认状态。',
  'settings.writing_lang': '小说写作语言',
  'settings.shortcuts': '快捷键',
  'settings.shortcut_continue': 'AI 续写 / 向下写',
  'settings.shortcut_placeholder': '点击录制按键...',
  'settings.test_conn': '测试连接',
  'settings.test_success': '连接成功!',
  'settings.test_fail': '连接失败',
  
  // Image Generation Settings
  'settings.image_title': '文生图设置',
  'settings.image_provider': '图片生成服务商',
  'settings.image_model': '模型名称',
  'settings.image_base_url': 'Base URL (可选)',
  'settings.image_api_key': 'API Key (可选)',

  // Codex
  'codex.title': '设定集 (世界圣经)',
  'codex.all': '全部',
  'codex.new_placeholder': '新条目名称...',
  'codex.consulting': '正在咨询神谕...',
  'codex.no_entries': '暂无条目。',
  'codex.create_tip': '创建一个条目来构建你的世界。',
  'codex.save': '保存',
  'codex.delete': '删除',
  'codex.generated_tag': 'AI生成',

  // Chat
  'chat.title': 'AI 助手',
  'chat.active': '设定集已激活',
  'chat.entries': '条目',
  'chat.placeholder': '询问关于你故事的问题...',
  'chat.you': '你',
  'chat.model': 'AI',
  'chat.welcome': '你好，作者。我已经阅读了你的设定集。今天我能为你做些什么？',

  // Editor
  'editor.words': '字数',
  'editor.rewrite': 'AI 重写选中',
  'editor.write_ahead': 'AI 续写',
  'editor.continue_scene': '继续当前',
  'editor.finish_scene': '结束场景',
  'editor.finish_chapter': '结束章节',
  'editor.auto_decide': '自动判断',
  'editor.writing': '写作中...',
  'editor.scanning': '正在扫描设定...',
  'editor.gen_image': '生成配图',
  'editor.generating_image': '绘画中...',
  'editor.draft_mode': '草稿模式',
  'editor.opening_scene': '开篇',

  // Modal - New Project
  'modal.new_project.title': '创建新项目',
  'modal.new_project.name': '小说标题',
  'modal.new_project.author': '作者名',
  'modal.new_project.genre': '大类',
  'modal.new_project.subgenre': '小类',
  'modal.new_project.select_genre': '选择大类',
  'modal.new_project.select_subgenre': '选择小类',
  'modal.new_project.create': '开始创作',
  'modal.new_project.generating': '正在生成开篇...',
  'modal.new_project.cancel': '取消',
  'modal.new_project.writing_lang': '写作语言 (AI输出)',
  'modal.new_project.advanced_settings': '高级设置（可选）',
  'modal.new_project.description': '故事简介',
  'modal.new_project.description_placeholder': '简要描述您的故事...',
  'modal.new_project.target_audience': '目标读者',
  'modal.new_project.narrative_perspective': '叙事视角',
  'modal.new_project.writing_tone': '写作风格',

  // Audience options
  'audience.general': '大众读者',
  'audience.young_adult': '青少年',
  'audience.adult': '成人',
  'audience.children': '儿童',

  // Perspective options
  'perspective.first_person': '第一人称（我）',
  'perspective.third_limited': '第三人称限制视角',
  'perspective.third_omniscient': '第三人称全知视角',
  'perspective.second_person': '第二人称（你）',

  // Tone options
  'tone.conversational': '对话式',
  'tone.formal': '正式',
  'tone.poetic': '诗意',
  'tone.casual': '随意',
  'tone.academic': '学术',

  // History Modal
  'history.title': '项目快照 (History)',
  'history.create': '创建快照',
  'history.restore': '恢复',
  'history.placeholder': '快照描述...',
  'history.no_snapshots': '暂无快照。',
  'history.created': '创建于',
  'history.restore_confirm': '恢复此快照？当前未保存的进度将被覆盖。',
  'history.delete': '删除',
  'history.delete_confirm': '确定要删除此快照吗？',

  // Help Modal
  'help.title': 'NovelFlow Quick Guide',
  'help.close': '明白了，开始写作！',
  'help.section1.title': '设定集 (Codex)',
  'help.section1.desc': '设定集是你项目的“大脑”。它存储角色、地点、物品和传说。',
  'help.section1.p1': '重要性：每次 AI 写作或聊天时，都会先阅读你的设定集。',
  'help.section1.p2': '好处：AI “知道”你主角的眼睛颜色或魔法规则，防止出现幻觉。',
  'help.section1.p3': '提示：使用设定集面板中的“AI 生成”（闪光图标）快速填充创意。',
  
  'help.section2.title': '写作与续写',
  'help.section2.desc': '在主编辑器中正常写作。当你卡住或需要灵感时：',
  'help.section2.p1': 'AI 续写：点击按钮，让 AI 根据前文和设定集继续写几段。',
  'help.section2.p2': '重写选中：选中文本，工具栏会出现“重写”按钮，帮助润色。',

  'help.section3.title': 'AI 聊天助手',
  'help.section3.desc': '右侧的聊天面板是你的合著者。',
  'help.section3.p1': '上下文感知：与普通 ChatGPT 不同，它能访问你的专属故事设定。',
  'help.section3.p2': '用例：问“如果 Elara 拜访辛迪加会发生什么？”或“帮我构思一个反转”。',
  
  'help.privacy': '隐私与 Key',
  'help.privacy.desc': 'NovelFlow 采用 BYOK（自带 Key）模式。你的 API Key 直接与 Google 或 DeepSeek 服务器通信，我们不存储数据。',

  // Languages
  'lang.en': '英语 (English)',
  'lang.zh': '简体中文',
  'lang.ja': '日语 (Japanese)',
  'lang.ko': '韩语 (Korean)',
  'lang.es': '西班牙语 (Spanish)',
  'lang.fr': '法语 (French)',
  'lang.de': '德语 (German)',
  'lang.it': '意大利语 (Italian)',
  'lang.ru': '俄语 (Russian)',
  'lang.pt': '葡萄牙语 (Portuguese)'
};

const dictionaries = { en, zh };

interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export const I18nProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>('en');

  const t = (key: string): string => {
    return dictionaries[language][key] || key;
  };

  return (
    <I18nContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </I18nContext.Provider>
  );
};

export const useI18n = () => {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
};
