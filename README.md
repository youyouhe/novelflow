# NovelFlow

**Languages**: [English](README.md) | [简体中文](README.zh-CN.md) | [日本語](README.ja.md) | [한국어](README.ko.md)

**NovelFlow** is a professional fiction writing environment featuring a dedicated Codex (Wiki) system that integrates deeply with Google Gemini AI to maintain story consistency, character voice, and world-building rules during AI-assisted writing.

## Features

- **AI-Powered Writing**: Smart continuation with context-aware scene generation
- **Codex System**: Maintain characters, locations, lore, and more with AI-assisted scanning
- **Storyboard**: Drag-and-drop scene planning
- **Multi-language Support**: English, Chinese, Japanese, Korean, Spanish, French, German, Italian, Russian, Portuguese
- **Cloud Gallery**: Share and discover novels via Supabase backend (optional)
- **Dark/Light Theme**: Customizable accent colors
- **Auto-save**: Local storage persistence

## Screenshots

### English Interface
<img src="/public/novelflow-en.png" alt="NovelFlow English Interface" width="1200"/>

### Chinese Interface
<img src="/public/novelflow-zh.png" alt="NovelFlow Chinese Interface" width="1200"/>

### Other Languages
<img src="/public/novelflow-other.png" alt="NovelFlow Other Languages" width="1200"/>

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS
- **AI**: Google Gemini AI (with DeepSeek support)
- **Backend**: Supabase (optional, for cloud features)
- **State Management**: React Context API
- **Storage**: localStorage (local), Supabase (cloud)

## Quick Start

### Prerequisites

- Node.js 18+
- Google Gemini API key (required for AI features)
- Supabase account (optional, for cloud features)

### Installation

1. **Clone and install dependencies**:
   ```bash
   npm install
   ```

2. **Configure environment variables**:
   Create `.env.local` in the project root:
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   ```

3. **Run the development server**:
   ```bash
   npm run dev
   ```

4. **Open your browser**:
   Navigate to `http://localhost:3000`

### Build for Production

```bash
npm run build
npm run preview
```

## Supabase Setup (Optional - for Cloud Gallery)

If you want to enable the cloud gallery feature for sharing and discovering novels, follow these steps:

### 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Wait for the project to be provisioned

### 2. Create the `novels` Table

Go to the **SQL Editor** in your Supabase dashboard and run:

```sql
-- Create the novels table
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

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_novels_visibility ON public.novels(visibility);
CREATE INDEX IF NOT EXISTS idx_novels_genre ON public.novels(genre);
CREATE INDEX IF NOT EXISTS idx_novels_owner_id ON public.novels(owner_id);
CREATE INDEX IF NOT EXISTS idx_novels_content_hash ON public.novels(content_hash);
CREATE INDEX IF NOT EXISTS idx_novels_published_at ON public.novels(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_novels_likes ON public.novels(likes DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE public.novels ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
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

-- Create updated_at trigger
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

### 3. Create RPC Functions

In the **SQL Editor**, run these commands to create the like and download increment functions:

```sql
-- Function to increment likes
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

-- Function to increment downloads
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

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.increment_likes(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_downloads(TEXT) TO anon, authenticated;
```

### 4. Get Your Supabase Credentials

1. In Supabase dashboard, go to **Settings** > **API**
2. Copy your:
   - **Project URL** (under "Config")
   - **anon/public key** (under "Project API keys")

### 5. Configure NovelFlow

1. Open NovelFlow
2. Click **Settings** (gear icon)
3. Go to **Account** tab
4. Enter your Supabase URL and anon key
5. Click **Save**

## AI Configuration

### Gemini (Default)

NovelFlow uses Google Gemini AI by default. Set your API key in `.env.local`:

```env
GEMINI_API_KEY=your_api_key_here
```

### DeepSeek (Alternative)

To use DeepSeek instead:

1. Open Settings
2. Go to **Writing** tab
3. Change **AI Provider** to "DeepSeek"
4. Enter your DeepSeek API key

## Keyboard Shortcuts

- **Alt+C**: AI Continue writing
- **Alt+S**: Save snapshot
- **Alt+N**: New scene
- **Alt+B**: Toggle storyboard
- **Alt+P**: Toggle codex panel

Customize shortcuts in **Settings** > **Writing**.

## Project Structure

```
novelflow/
├── App.tsx              # Main application (state, panels, shortcuts, auto-save)
├── index.tsx            # Entry point
├── types.ts             # TypeScript types
├── constants.tsx        # Icons, constants
├── i18n.tsx             # I18n provider (English/Chinese)
├── theme.tsx            # Theme provider (light/dark + accent colors)
├── components/          # React components
│   ├── Dashboard.tsx    # Project list
│   ├── Editor.tsx       # Scene editing with AI
│   ├── CodexPanel.tsx   # Entity management
│   ├── ChatPanel.tsx    # Codex assistant
│   ├── Storyboard.tsx   # Scene planning
│   └── SettingsModal.tsx # Configuration
└── services/            # Business logic
    ├── aiService.ts     # AI generation
    ├── galleryService.ts # Supabase integration
    └── supabaseClient.ts # Supabase client
```

## Development

### Available Scripts

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run preview  # Preview production build
```

### Adding Tests

```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom
```

### Adding Linting

```bash
npm install -D eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin eslint-plugin-react
```

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
