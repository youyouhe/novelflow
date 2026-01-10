# NovelFlow

**NovelFlow** 是一个专业的小说写作环境，具有专门的设定集（Wiki）系统，与 Google Gemini AI 深度集成，以在 AI 辅助写作中维护故事连贯性、角色口吻和世界观构建规则。

**语言**：[English](README.md) | [简体中文](README.zh-CN.md) | [日本語](README.ja.md) | [한국어](README.ko.md) | [Español](README.es.md) | [Français](README.fr.md) | [Deutsch](README.de.md) | [Italiano](README.it.md) | [Русский](README.ru.md) | [Português](README.pt.md)

## 功能特点

- **AI 驱动写作**：智能续写，具有上下文感知的场景生成
- **设定集系统**：维护角色、地点、传说等，支持 AI 辅助扫描
- **故事板**：拖放式场景规划
- **多语言支持**：英语、中文、日语、韩语、西班牙语、法语、德语、意大利语、俄语、葡萄牙语
- **云端画廊**：通过 Supabase 后端分享和发现小说（可选）
- **深色/浅色主题**：可自定义的强调色
- **自动保存**：本地存储持久化

## 截图

### 英语界面
<img src="/public/novelflow-en.png" alt="NovelFlow English Interface" width="1200"/>

### 中文界面
<img src="/public/novelflow-zh.png" alt="NovelFlow Chinese Interface" width="1200"/>

### 其他语言界面
<img src="/public/novelflow-other.png" alt="NovelFlow Other Languages" width="1200"/>

## 技术栈

- **前端**：React 19、TypeScript、Vite、Tailwind CSS
- **AI**：Google Gemini AI（支持 DeepSeek）
- **后端**：Supabase（可选，用于云功能）
- **状态管理**：React Context API
- **存储**：localStorage（本地）、Supabase（云端）

## 快速开始

### 前置要求

- Node.js 18+
- Google Gemini API 密钥（AI 功能必需）
- Supabase 账户（可选，用于云功能）

### 安装

1. **克隆并安装依赖**：
   ```bash
   npm install
   ```

2. **配置环境变量**：
   在项目根目录创建 `.env.local`：
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   ```

3. **运行开发服务器**：
   ```bash
   npm run dev
   ```

4. **打开浏览器**：
   访问 `http://localhost:3000`

### 生产构建

```bash
npm run build
npm run preview
```

## Supabase 设置（可选 - 用于云端画廊）

如果要启用云端画廊功能以分享和发现小说，请按照以下步骤操作：

### 1. 创建 Supabase 项目

1. 访问 [supabase.com](https://supabase.com)
2. 创建新项目
3. 等待项目配置完成

### 2. 创建 `novels` 表

在 Supabase 仪表板中打开 **SQL 编辑器**并运行：

```sql
-- 创建 novels 表
CREATE TABLE IF NOT EXISTS public.novels (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    author TEXT NOT NULL,
    genre TEXT NOT NULL DEFAULT 'Fiction',
    subgenre TEXT,
    description TEXT,
    word_count INTEGER NOT NULL DEFAULT 0,
    visibility TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('public', 'private')),
    likes INTEGER NOT NULL DEFAULT 0,
    downloads INTEGER NOT NULL DEFAULT 0,
    published_at BIGINT NOT NULL,
    tags TEXT[] DEFAULT '{}',
    content_hash TEXT NOT NULL,
    owner_id TEXT NOT NULL,
    content JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_novels_visibility ON public.novels(visibility);
CREATE INDEX IF NOT EXISTS idx_novels_genre ON public.novels(genre);
CREATE INDEX IF NOT EXISTS idx_novels_owner_id ON public.novels(owner_id);
CREATE INDEX IF NOT EXISTS idx_novels_content_hash ON public.novels(content_hash);
CREATE INDEX IF NOT EXISTS idx_novels_published_at ON public.novels(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_novels_likes ON public.novels(likes DESC);

-- 启用行级安全性（RLS）
ALTER TABLE public.novels ENABLE ROW LEVEL SECURITY;

-- 创建 RLS 策略
CREATE POLICY "Public novels are viewable by everyone"
    ON public.novels FOR SELECT
    USING (visibility = 'public');

CREATE POLICY "Users can view their own novels"
    ON public.novels FOR SELECT
    USING (owner_id = auth.uid()::TEXT);

CREATE POLICY "Users can insert their own novels"
    ON public.novels FOR INSERT
    WITH CHECK (owner_id = auth.uid()::TEXT);

CREATE POLICY "Users can update their own novels"
    ON public.novels FOR UPDATE
    USING (owner_id = auth.uid()::TEXT)
    WITH CHECK (owner_id = auth.uid()::TEXT);

CREATE POLICY "Users can delete their own novels"
    ON public.novels FOR DELETE
    USING (owner_id = auth.uid()::TEXT);

-- 创建 updated_at 触发器
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER novels_updated_at
    BEFORE UPDATE ON public.novels
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();
```

### 3. 创建 RPC 函数

在 **SQL 编辑器**中，运行以下命令来创建点赞和下载增量函数：

```sql
-- 增加点赞数的函数
CREATE OR REPLACE FUNCTION public.increment_likes(row_id TEXT)
RETURNS INTEGER AS $$
DECLARE
    current_likes INTEGER;
BEGIN
    UPDATE public.novels
    SET likes = likes + 1
    WHERE id = row_id
    RETURNING likes INTO current_likes;

    RETURN current_likes;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 增加下载次数的函数
CREATE OR REPLACE FUNCTION public.increment_downloads(row_id TEXT)
RETURNS INTEGER AS $$
DECLARE
    current_downloads INTEGER;
BEGIN
    UPDATE public.novels
    SET downloads = downloads + 1
    WHERE id = row_id
    RETURNING downloads INTO current_downloads;

    RETURN current_downloads;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 授予执行权限
GRANT EXECUTE ON FUNCTION public.increment_likes(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_downloads(TEXT) TO anon, authenticated;
```

### 4. 获取 Supabase 凭据

1. 在 Supabase 仪表板中，转到 **设置** > **API**
2. 复制您的：
   - **项目 URL**（在"Config"下）
   - **anon/public key**（在"Project API keys"下）

### 5. 配置 NovelFlow

1. 打开 NovelFlow
2. 点击 **设置**（齿轮图标）
3. 转到 **账户** 选项卡
4. 输入您的 Supabase URL 和 anon 密钥
5. 点击 **保存**

## AI 配置

### Gemini（默认）

NovelFlow 默认使用 Google Gemini AI。在 `.env.local` 中设置您的 API 密钥：

```env
GEMINI_API_KEY=your_api_key_here
```

### DeepSeek（替代方案）

要使用 DeepSeek：

1. 打开设置
2. 转到 **写作** 选项卡
3. 将 **AI 提供商** 更改为"DeepSeek"
4. 输入您的 DeepSeek API 密钥

## 键盘快捷键

- **Alt+C**：AI 继续写作
- **Alt+S**：保存快照
- **Alt+N**：新场景
- **Alt+B**：切换故事板
- **Alt+P**：切换设定集面板

在 **设置** > **写作** 中自定义快捷键。

## 项目结构

```
novelflow/
├── App.tsx              # 主应用程序（状态、面板、快捷键、自动保存）
├── index.tsx            # 入口点
├── types.ts             # TypeScript 类型
├── constants.tsx        # 图标、常量
├── i18n.tsx             # 国际化提供者（英语/中文）
├── theme.tsx            # 主题提供者（浅色/深色 + 强调色）
├── components/          # React 组件
│   ├── Dashboard.tsx    # 项目列表
│   ├── Editor.tsx       # 场景编辑与 AI
│   ├── CodexPanel.tsx   # 实体管理
│   ├── ChatPanel.tsx    # 设定集助手
│   ├── Storyboard.tsx   # 场景规划
│   └── SettingsModal.tsx # 配置
└── services/            # 业务逻辑
    ├── aiService.ts     # AI 生成
    ├── galleryService.ts # Supabase 集成
    └── supabaseClient.ts # Supabase 客户端
```

## 开发

### 可用脚本

```bash
npm run dev      # 启动开发服务器
npm run build    # 构建生产版本
npm run preview  # 预览生产构建
```

### 添加测试

```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom
```

### 添加代码检查

```bash
npm install -D eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin eslint-plugin-react
```

## 许可证

MIT

## 贡献

欢迎贡献！请随时提交 Pull Request。
