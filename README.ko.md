# NovelFlow

**NovelFlow**는 Google Gemini AI와 깊게 통합된 전용 설정집(Wiki) 시스템을 갖춘 전문 소설 작성 환경으로, AI 지원 작성 중 이야기의 일관성, 캐릭터 목소리, 세계관 규칙을 유지합니다.

**언어**: [English](README.md) | [简体中文](README.zh-CN.md) | [日本語](README.ja.md) | [한국어](README.ko.md) | [Español](README.es.md) | [Français](README.fr.md) | [Deutsch](README.de.md) | [Italiano](README.it.md) | [Русский](README.ru.md) | [Português](README.pt.md)

## 기능

- **AI 기반 작성**: 컨텍스트 인식 장면 생성을 통한 스마트 연속 작성
- **설정집 시스템**: AI 지원 스캔으로 캐릭터, 장소, 설정 등 관리
- **스토리보드**: 드래그 앤 드롭 장면 계획
- **다국어 지원**: 영어, 중국어, 일본어, 한국어, 스페인어, 프랑스어, 독일어, 이탈리아어, 러시아어, 포르투갈어
- **클라우드 갤러리**: Supabase 백엔드를 통한 소설 공유 및 발견 (선택 사항)
- **다크/라이트 테마**: 사용자 정의 가능한 강조색
- **자동 저장**: 로컬 스토리지 지속성

## 스크린샷

### 영어 인터페이스
<img src="/public/novelflow-en.png" alt="NovelFlow English Interface" width="1200"/>

### 중국어 인터페이스
<img src="/public/novelflow-zh.png" alt="NovelFlow Chinese Interface" width="1200"/>

### 기타 언어 인터페이스
<img src="/public/novelflow-other.png" alt="NovelFlow Other Languages" width="1200"/>

## 기술 스택

- **프론트엔드**: React 19, TypeScript, Vite, Tailwind CSS
- **AI**: Google Gemini AI (DeepSeek 지원)
- **백엔드**: Supabase (선택 사항, 클라우드 기능용)
- **상태 관리**: React Context API
- **스토리지**: localStorage (로컬), Supabase (클라우드)

## 빠른 시작

### 전제 조건

- Node.js 18+
- Google Gemini API 키 (AI 기능에 필요)
- Supabase 계정 (선택 사항, 클라우드 기능용)

### 설치

1. **복제 및 종속성 설치**:
   ```bash
   npm install
   ```

2. **환경 변수 구성**:
   프로젝트 루트에 `.env.local` 생성:
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   ```

3. **개발 서버 실행**:
   ```bash
   npm run dev
   ```

4. **브라우저 열기**:
   `http://localhost:3000`로 이동

### 프로덕션 빌드

```bash
npm run build
npm run preview
```

## Supabase 설정 (선택 사항 - 클라우드 갤러리용)

소설 공유 및 발견을 위한 클라우드 갤러리 기능을 활성화하려면 다음 단계를 따르세요:

### 1. Supabase 프로젝트 생성

1. [supabase.com](https://supabase.com)으로 이동
2. 새 프로젝트 생성
3. 프로젝트 프로비저닝 대기

### 2. `novels` 테이블 생성

Supabase 대시보드에서 **SQL 에디터**를 열고 다음을 실행:

```sql
-- novels 테이블 생성
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

-- 쿼리 성능 향상을 위한 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_novels_visibility ON public.novels(visibility);
CREATE INDEX IF NOT EXISTS idx_novels_genre ON public.novels(genre);
CREATE INDEX IF NOT EXISTS idx_novels_owner_id ON public.novels(owner_id);
CREATE INDEX IF NOT EXISTS idx_novels_content_hash ON public.novels(content_hash);
CREATE INDEX IF NOT EXISTS idx_novels_published_at ON public.novels(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_novels_likes ON public.novels(likes DESC);

-- 행 수준 보안(RLS) 활성화
ALTER TABLE public.novels ENABLE ROW LEVEL SECURITY;

-- RLS 정책 생성
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

-- updated_at 트리거 생성
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

### 3. RPC 함수 생성

**SQL 에디터**에서 좋아요 및 다운로드 수 증가 함수를 만드는 다음 명령을 실행:

```sql
-- 좋아요 수 증가 함수
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

-- 다운로드 수 증가 함수
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

-- 실행 권한 부여
GRANT EXECUTE ON FUNCTION public.increment_likes(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_downloads(TEXT) TO anon, authenticated;
```

### 4. Supabase 자격 증명 가져오기

1. Supabase 대시보드에서 **설정** > **API**로 이동
2. 다음을 복사:
   - **프로젝트 URL**("Config" 아래)
   - **anon/public key**("Project API keys" 아래)

### 5. NovelFlow 구성

1. NovelFlow 열기
2. **설정**(기어 아이콘) 클릭
3. **계정** 탭으로 이동
4. Supabase URL과 anon 키 입력
5. **저장** 클릭

## AI 구성

### Gemini (기본값)

NovelFlow는 기본적으로 Google Gemini AI를 사용합니다. `.env.local`에서 API 키 설정:

```env
GEMINI_API_KEY=your_api_key_here
```

### DeepSeek (대안)

DeepSeek를 사용하려면:

1. 설정 열기
2. **작성** 탭으로 이동
3. **AI 공급자**를 "DeepSeek"로 변경
4. DeepSeek API 키 입력

## 키보드 단축키

- **Alt+C**: AI 연속 작성
- **Alt+S**: 스냅샷 저장
- **Alt+N**: 새 장면
- **Alt+B**: 스토리보드 토글
- **Alt+P**: 설정집 패널 토글

**설정** > **작성**에서 단축키를 사용자 정의.

## 프로젝트 구조

```
novelflow/
├── App.tsx              # 메인 애플리케이션 (상태, 패널, 단축키, 자동 저장)
├── index.tsx            # 진입점
├── types.ts             # TypeScript 유형
├── constants.tsx        # 아이콘, 상수
├── i18n.tsx             # i18n 공급자 (영어/중국어)
├── theme.tsx            # 테마 공급자 (라이트/다크 + 강조색)
├── components/          # React 컴포넌트
│   ├── Dashboard.tsx    # 프로젝트 목록
│   ├── Editor.tsx       # 장면 편집 및 AI
│   ├── CodexPanel.tsx   # 엔티티 관리
│   ├── ChatPanel.tsx    # 설정집 도우미
│   ├── Storyboard.tsx   # 장면 계획
│   └── SettingsModal.tsx # 구성
└── services/            # 비즈니스 로직
    ├── aiService.ts     # AI 생성
    ├── galleryService.ts # Supabase 통합
    └── supabaseClient.ts # Supabase 클라이언트
```

## 개발

### 사용 가능한 스크립트

```bash
npm run dev      # 개발 서버 시작
npm run build    # 프로덕션 빌드
npm run preview  # 프로덕션 빌드 미리보기
```

### 테스트 추가

```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom
```

### 린팅 추가

```bash
npm install -D eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin eslint-plugin-react
```

## 라이선스

MIT

## 기여

기여를 환영합니다! 언제든지 풀 리퀘스트를 제출해 주세요.
