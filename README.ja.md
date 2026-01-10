# NovelFlow

**NovelFlow**は、Google Gemini AIと深く統合された専用の設定集（Wiki）システムを備えた専門的な小説執筆環境で、AI支援執筆中にストーリーの一貫性、キャラクターの声、世界観のルールを維持します。

**言語**: [English](README.md) | [简体中文](README.zh-CN.md) | [日本語](README.ja.md) | [한국어](README.ko.md) | [Español](README.es.md) | [Français](README.fr.md) | [Deutsch](README.de.md) | [Italiano](README.it.md) | [Русский](README.ru.md) | [Português](README.pt.md)

## 機能

- **AI駆動執筆**: コンテキストを認識したシーン生成によるスマートな続きの執筆
- **設定集システム**: キャラクター、場所、伝承などをAI支援スキャンで管理
- **ストーリーボード**: ドラッグ＆ドロップによるシーンの計画
- **多言語対応**: 英語、中国語、日本語、韓国語、スペイン語、フランス語、ドイツ語、イタリア語、ロシア語、ポルトガル語
- **クラウドギャラリー**: Supabaseバックエンドによる小説の共有と発見（オプション）
- **ダーク/ライトテーマ**: カスタマイズ可能なアクセントカラー
- **自動保存**: ローカルストレージでの永続化

## スクリーンショット

### 英語インターフェース
<img src="/public/novelflow-en.png" alt="NovelFlow English Interface" width="1200"/>

### 中国語インターフェース
<img src="/public/novelflow-zh.png" alt="NovelFlow Chinese Interface" width="1200"/>

### その他の言語インターフェース
<img src="/public/novelflow-other.png" alt="NovelFlow Other Languages" width="1200"/>

## 技術スタック

- **フロントエンド**: React 19、TypeScript、Vite、Tailwind CSS
- **AI**: Google Gemini AI（DeepSeek対応）
- **バックエンド**: Supabase（オプション、クラウド機能用）
- **状態管理**: React Context API
- **ストレージ**: localStorage（ローカル）、Supabase（クラウド）

## クイックスタート

### 前提条件

- Node.js 18+
- Google Gemini APIキー（AI機能に必要）
- Supabaseアカウント（オプション、クラウド機能用）

### インストール

1. **クローンして依存関係をインストール**:
   ```bash
   npm install
   ```

2. **環境変数を設定**:
   プロジェクトルートに `.env.local` を作成:
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   ```

3. **開発サーバーを起動**:
   ```bash
   npm run dev
   ```

4. **ブラウザを開く**:
   `http://localhost:3000` に移動

### 本番ビルド

```bash
npm run build
npm run preview
```

## Supabase設定（オプション - クラウドギャラリー用）

小説の共有と発見のためのクラウドギャラリー機能を有効にする場合は、次の手順に従ってください：

### 1. Supabaseプロジェクトの作成

1. [supabase.com](https://supabase.com) に移動
2. 新しいプロジェクトを作成
3. プロジェクトのプロビジョニングを待つ

### 2. `novels`テーブルの作成

Supabaseダッシュボードで**SQLエディタ**を開き、以下を実行：

```sql
-- novelsテーブルの作成
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

-- クエリパフォーマンス向上のためのインデックス作成
CREATE INDEX IF NOT EXISTS idx_novels_visibility ON public.novels(visibility);
CREATE INDEX IF NOT EXISTS idx_novels_genre ON public.novels(genre);
CREATE INDEX IF NOT EXISTS idx_novels_owner_id ON public.novels(owner_id);
CREATE INDEX IF NOT EXISTS idx_novels_content_hash ON public.novels(content_hash);
CREATE INDEX IF NOT EXISTS idx_novels_published_at ON public.novels(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_novels_likes ON public.novels(likes DESC);

-- 行レベルセキュリティ（RLS）を有効化
ALTER TABLE public.novels ENABLE ROW LEVEL SECURITY;

-- RLSポリシーの作成
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

-- updated_atトリガーの作成
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

### 3. RPC関数の作成

**SQLエディタ**で、いいねとダウンロード数の増分関数を作成する以下のコマンドを実行：

```sql
-- いいね数を増やす関数
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

-- ダウンロード数を増やす関数
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

-- 実行権限の付与
GRANT EXECUTE ON FUNCTION public.increment_likes(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_downloads(TEXT) TO anon, authenticated;
```

### 4. Supabase認証情報の取得

1. Supabaseダッシュボードで、**設定** > **API** に移動
2. 次の情報をコピー：
   - **プロジェクトURL**（"Config"の下）
   - **anon/public key**（"Project API keys"の下）

### 5. NovelFlowの設定

1. NovelFlowを開く
2. **設定**（歯車アイコン）をクリック
3. **アカウント**タブに移動
4. Supabase URLとanonキーを入力
5. **保存**をクリック

## AI設定

### Gemini（デフォルト）

NovelFlowはデフォルトでGoogle Gemini AIを使用します。`.env.local`でAPIキーを設定：

```env
GEMINI_API_KEY=your_api_key_here
```

### DeepSeek（代替）

DeepSeekを使用する場合：

1. 設定を開く
2. **執筆**タブに移動
3. **AIプロバイダー**を"DeepSeek"に変更
4. DeepSeek APIキーを入力

## キーボードショートカット

- **Alt+C**: AIで続きを執筆
- **Alt+S**: スナップショットを保存
- **Alt+N**: 新しいシーン
- **Alt+B**: ストーリーボードを切り替え
- **Alt+P**: 設定集パネルを切り替え

**設定** > **執筆**でショートカットをカスタマイズ。

## プロジェクト構造

```
novelflow/
├── App.tsx              # メインアプリケーション（状態、パネル、ショートカット、自動保存）
├── index.tsx            # エントリーポイント
├── types.ts             # TypeScript型
├── constants.tsx        # アイコン、定数
├── i18n.tsx             # i18nプロバイダー（英語/中国語）
├── theme.tsx            # テーマプロバイダー（ライト/ダーク + アクセントカラー）
├── components/          # Reactコンポーネント
│   ├── Dashboard.tsx    # プロジェクトリスト
│   ├── Editor.tsx       # シーン編集とAI
│   ├── CodexPanel.tsx   # エンティティ管理
│   ├── ChatPanel.tsx    # 設定集アシスタント
│   ├── Storyboard.tsx   # シーン計画
│   └── SettingsModal.tsx # 設定
└── services/            # ビジネスロジック
    ├── aiService.ts     # AI生成
    ├── galleryService.ts # Supabase統合
    └── supabaseClient.ts # Supabaseクライアント
```

## 開発

### 利用可能なスクリプト

```bash
npm run dev      # 開発サーバーを起動
npm run build    # 本番ビルド
npm run preview  # 本番ビルドをプレビュー
```

### テストの追加

```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom
```

### リンティングの追加

```bash
npm install -D eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin eslint-plugin-react
```

## ライセンス

MIT

## 貢献

貢献を歓迎します！お気軽にプルリクエストを提出してください。
