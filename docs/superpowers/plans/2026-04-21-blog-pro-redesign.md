# Blog pro redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a TipTap WYSIWYG editor with inline + cover image upload to `/admin/blog`, fix the latent bug that prevents published article bodies from rendering, and enable a draft preview flow — all without a DB migration.

**Architecture:** Three commits mapped to three layers. Layer 1 is the smallest: public-side HTML render fix with DOMPurify, preview-mode query param in the public blog API, and one-line admin cookie path widening so the admin token is available to all `/api/*` routes. Layer 2 installs TipTap + DOMPurify, creates `BlogEditor`, `BlogImageUpload`, and the upload API route. Layer 3 wires these into the existing admin page and adds the "Prévisualiser" button.

**Tech Stack:** Next.js 14 App Router, Tailwind, React, TipTap 2 (`@tiptap/react` + 4 extensions), `isomorphic-dompurify`, Vercel Blob (existing `lib/blob.ts`), HMAC token cookie (existing `lib/admin-auth.ts`).

**Spec:** `docs/superpowers/specs/2026-04-21-blog-pro-redesign-design.md`

---

## File Structure

**Created (3 files):**
- `src/components/blog/BlogEditor.tsx` — TipTap editor with toolbar + drag/drop image upload (~200 LOC)
- `src/components/blog/BlogImageUpload.tsx` — cover-image dropzone component (~80 LOC)
- `src/app/api/admin/blog/upload/route.ts` — authenticated file upload to Vercel Blob (~55 LOC)

**Modified (6 files):**
- `package.json` / `package-lock.json` — 6 new npm deps
- `src/app/admin/login/page.tsx` — cookie path `/admin` → `/`
- `src/app/admin/layout.tsx` — cookie cleanup path `/admin` → `/`
- `src/app/admin/blog/page.tsx` — wire BlogEditor + BlogImageUpload + preview button
- `src/app/(public)/blog/[slug]/page.tsx` — render HTML via DOMPurify, remove TOC sidebar that depended on removed `sections` shape
- `src/app/api/public/blog/[slug]/route.ts` — accept `?preview=1` when admin cookie is valid

**Not touched:** DB schema, `src/lib/blob.ts`, public blog listing page, public blog listing API.

---

## Task 1: Layer 1 — public render fix + preview + cookie path

### Step 1.1: Widen admin cookie path (login page)

- [ ] Open `src/app/admin/login/page.tsx`
- [ ] Find the cookie assignment around line 36:

**Before:**
```tsx
    document.cookie = `admin_token=${data.token}; path=/admin; max-age=86400; SameSite=Strict`;
```

**After:**
```tsx
    document.cookie = `admin_token=${data.token}; path=/; max-age=86400; SameSite=Strict`;
```

Change: `path=/admin` → `path=/`. This makes the cookie available to `/api/admin/*` and `/api/public/*` routes, which is needed for the upload API auth and the preview-mode flow.

### Step 1.2: Widen admin cookie cleanup (layout)

- [ ] Open `src/app/admin/layout.tsx`
- [ ] Find the `clearAdminToken` function around line 43:

**Before:**
```tsx
function clearAdminToken() {
  document.cookie = "admin_token=; path=/admin; max-age=0";
}
```

**After:**
```tsx
function clearAdminToken() {
  document.cookie = "admin_token=; path=/; max-age=0";
}
```

Same path change — otherwise logout leaves a stale cookie on `/` that can't be cleared from `/admin`.

### Step 1.3: Install DOMPurify

- [ ] Run:

```bash
cd /c/Users/FX507/Downloads/demenagement24
npm install isomorphic-dompurify
```

Expected: installs `isomorphic-dompurify` at version 2.x, updates `package.json` + `package-lock.json`.

### Step 1.4: Update public blog article API to accept preview mode

- [ ] Open `src/app/api/public/blog/[slug]/route.ts`
- [ ] Replace the entire file with:

```ts
import { NextRequest, NextResponse } from "next/server";
import { createUntypedAdminClient } from "@/lib/supabase/admin";
import { verifyAdminToken } from "@/lib/admin-auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const supabase = createUntypedAdminClient();

  const url = new URL(request.url);
  const previewRequested = url.searchParams.get("preview") === "1";
  const adminCookie = request.cookies.get("admin_token")?.value;
  const isAdminPreview =
    previewRequested && !!adminCookie && verifyAdminToken(adminCookie);

  let query = supabase.from("blog_posts").select("*").eq("slug", slug);
  if (!isAdminPreview) {
    query = query.eq("status", "published");
  }
  const { data, error } = await query.single();

  if (error || !data) {
    return NextResponse.json(
      { error: "Article introuvable" },
      { status: 404 }
    );
  }

  // Get related articles (same category, excluding current). Only published
  // for both preview and non-preview requests — no point showing drafts in
  // the "Articles liés" block.
  const { data: related } = await supabase
    .from("blog_posts")
    .select("id, slug, title, category, cover_image, excerpt")
    .eq("status", "published")
    .eq("category", data.category)
    .neq("id", data.id)
    .order("published_at", { ascending: false })
    .limit(3);

  return NextResponse.json({
    article: data,
    related: related || [],
  });
}
```

Key changes: import `NextRequest` and `verifyAdminToken`; check `?preview=1` + `admin_token` cookie; only apply `status='published'` filter when not a valid admin preview.

### Step 1.5: Update public blog article page to render HTML

- [ ] Open `src/app/(public)/blog/[slug]/page.tsx`
- [ ] Replace the entire `Article` interface (around line 24-35) with:

```tsx
interface Article {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  author: string;
  cover_image?: string;
  read_time: string;
  published_at: string;
  content: string;
}
```

Notes: `cover_image` (matches the DB column exactly — the old interface renamed it to `cover_image_url`); `content` is now a string (HTML) not `Section[]`.

- [ ] In the same file, update the `RelatedArticle` interface to use `cover_image` too:

```tsx
interface RelatedArticle {
  id: string;
  slug: string;
  title: string;
  category: string;
  cover_image?: string;
  read_time: string;
}
```

- [ ] Remove the `Section` interface entirely (it's around line 18-22) — no longer used.

- [ ] At the top of the file, add these imports (after the existing `import toast from "react-hot-toast";`):

```tsx
import DOMPurify from "isomorphic-dompurify";
```

- [ ] Update the import line for lucide-react icons — remove `ChevronRight` (no longer needed after removing breadcrumb-sidebar structure — actually we keep breadcrumb; keep `ChevronRight`). Actually ChevronRight stays for the breadcrumb. No change to the lucide import line.

- [ ] Update the `fetchArticle` useCallback so it also picks up a potential `?preview=1` query string. Replace the whole function body with:

```tsx
  const fetchArticle = useCallback(async () => {
    if (!slug) return;
    try {
      const previewQs = typeof window !== "undefined"
        && new URL(window.location.href).searchParams.get("preview") === "1"
        ? "?preview=1"
        : "";
      const res = await fetch(`/api/public/blog/${slug}${previewQs}`);
      if (res.status === 404) {
        setNotFound(true);
        return;
      }
      if (!res.ok) {
        throw new Error("Erreur lors du chargement");
      }
      const data = await res.json();
      setArticle(data.article);
      setRelated(data.related || []);
    } catch {
      toast.error("Impossible de charger l’article");
    } finally {
      setLoading(false);
    }
  }, [slug]);
```

- [ ] Replace the `sections` logic. Find the block around line 106-110:

**Before:**
```tsx
  // Sections for the body
  const sections: Section[] = Array.isArray(article.content)
    ? article.content
    : [];
```

**After:**
```tsx
  // Content stored as HTML string by the admin editor. Sanitize before render
  // so a future editorial delegation can't inject <script> / onclick / etc.
  const sanitizedHtml = DOMPurify.sanitize(article.content || "");
```

- [ ] Replace the main article body render. Find the block that starts with `<div className="prose-like mt-10 space-y-8">` (around line 211) through its closing `</div>`. Replace with:

```tsx
            {/* Body */}
            {sanitizedHtml ? (
              <div
                className="prose prose-lg max-w-none mt-10 text-gray-800"
                dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
              />
            ) : article.excerpt ? (
              <p className="mt-10 leading-relaxed text-muted-foreground">
                {article.excerpt}
              </p>
            ) : null}
```

- [ ] Remove the entire `<aside>` block (table of contents). Find it around line 231-251:

**Before:**
```tsx
          {/* Sidebar - Table of contents */}
          {sections.length > 0 && (
            <aside className="hidden lg:block">
              <div className="sticky top-24">
                <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                  Sommaire
                </h3>
                <nav className="mt-4 space-y-1">
                  {sections.map((section) => (
                    <a
                      key={section.id}
                      href={`#${section.id}`}
                      className="block rounded-lg px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-green-50 hover:text-green-700"
                    >
                      {section.heading}
                    </a>
                  ))}
                </nav>
              </div>
            </aside>
          )}
```

**After:** delete the entire block (empty — no replacement).

- [ ] Since the sidebar is gone, the grid can collapse to a single column. Find the parent `<div>` around line 159:

**Before:**
```tsx
        <div className="grid gap-10 lg:grid-cols-[1fr_280px]">
```

**After:**
```tsx
        <div className="mx-auto max-w-3xl">
```

- [ ] In the cover-image render (around line 196-208), replace all `cover_image_url` with `cover_image` (matches the corrected interface + DB column).

- [ ] In the "Related articles" render (around line 263-296), also replace `relArticle.cover_image_url` with `relArticle.cover_image`.

### Step 1.6: Verify build passes

- [ ] Run: `npm run build`
- [ ] Expected: compiles successfully with no new type errors. Warnings are OK.

### Step 1.7: Commit + push + deploy Layer 1

- [ ] Run:

```bash
cd /c/Users/FX507/Downloads/demenagement24
git add package.json package-lock.json src/app/admin/login/page.tsx src/app/admin/layout.tsx src/app/\(public\)/blog/\[slug\]/page.tsx src/app/api/public/blog/\[slug\]/route.ts
git commit -m "$(cat <<'EOF'
fix(blog): render HTML content on public article page + preview mode

The public article page expected content as Section[] but the admin
saves it as raw HTML, so published articles only rendered their
excerpt -- the body was silently dropped. This switches to direct
HTML render via DOMPurify (default sanitizer config strips script,
on*, iframe, javascript:).

Also adds ?preview=1 on the public article API that, combined with a
valid admin_token cookie, lifts the status='published' filter so
admins can preview drafts in the final public rendering.

Side-effect: the admin cookie path is widened from /admin to / so the
cookie actually reaches /api/* routes (needed for this preview flow
and the upcoming upload auth).

The lg: sidebar table-of-contents is removed; it referenced the
non-existent Section[] JSON shape. A re-add on top of the HTML headings
can happen later if content depth grows.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
git push
curl -X POST "https://api.vercel.com/v1/integrations/deploy/prj_ScEfzxa5vgqh7w84HVr0VHO77k20/lQzqg9gaSp"
```

---

## Task 2: Layer 2 — TipTap editor, upload component, upload API

### Step 2.1: Install TipTap packages

- [ ] Run:

```bash
cd /c/Users/FX507/Downloads/demenagement24
npm install @tiptap/react @tiptap/starter-kit @tiptap/extension-image @tiptap/extension-link @tiptap/extension-placeholder
```

Expected: installs 5 packages at their latest 2.x, updates `package.json` + lock.

### Step 2.2: Create the upload API route

- [ ] Create `src/app/api/admin/blog/upload/route.ts` with content:

```ts
import { NextRequest, NextResponse } from "next/server";
import {
  uploadBlob,
  ALLOWED_IMAGE_TYPES,
  MAX_IMAGE_SIZE,
  extFromFile,
} from "@/lib/blob";
import { verifyAdminToken } from "@/lib/admin-auth";
import crypto from "crypto";

export async function POST(request: NextRequest) {
  // Auth: admin_token cookie is set by /admin/login with path=/ so it
  // reaches this route.
  const token = request.cookies.get("admin_token")?.value;
  if (!token || !verifyAdminToken(token)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "Aucun fichier fourni" }, { status: 400 });
    }
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Type de fichier non autorisé. Utilisez JPG, PNG ou WebP." },
        { status: 400 }
      );
    }
    if (file.size > MAX_IMAGE_SIZE) {
      return NextResponse.json(
        { error: "Le fichier ne doit pas dépasser 5 Mo" },
        { status: 400 }
      );
    }

    // blog/{YYYY-MM}/{timestamp}-{random}.{ext} keeps storage browsable.
    const now = new Date();
    const yyyymm = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const random = crypto.randomBytes(3).toString("hex");
    const ext = extFromFile(file);
    const pathname = `blog/${yyyymm}/${now.getTime()}-${random}.${ext}`;

    const { url } = await uploadBlob(file, pathname);
    return NextResponse.json({ url });
  } catch (err) {
    console.error("[admin/blog/upload]", err);
    return NextResponse.json(
      { error: "Erreur lors de l'upload" },
      { status: 500 }
    );
  }
}
```

### Step 2.3: Create the cover-image upload component

- [ ] Create `src/components/blog/BlogImageUpload.tsx` with content:

```tsx
"use client";

import { useRef, useState } from "react";
import { ImageIcon, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE = 5 * 1024 * 1024; // 5 MB

interface BlogImageUploadProps {
  value: string;
  onChange: (url: string) => void;
}

export function BlogImageUpload({ value, onChange }: BlogImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);

  async function handleFile(file: File) {
    if (!ACCEPTED.includes(file.type)) {
      toast.error("Utilisez un fichier JPG, PNG ou WebP.");
      return;
    }
    if (file.size > MAX_SIZE) {
      toast.error("Fichier trop volumineux (5 Mo max).");
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/blog/upload", {
        method: "POST",
        body: fd,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Erreur d'upload");
      }
      const { url } = await res.json();
      onChange(url);
      toast.success("Image uploadée");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload impossible");
    } finally {
      setUploading(false);
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium">
        Image de couverture
      </label>
      <div
        onClick={() => !uploading && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={cn(
          "relative flex min-h-[180px] cursor-pointer items-center justify-center overflow-hidden rounded-lg border-2 border-dashed transition-colors",
          dragging
            ? "border-[var(--brand-green)] bg-green-50"
            : "border-gray-300 bg-gray-50 hover:border-gray-400",
          uploading && "cursor-wait opacity-70"
        )}
      >
        {value ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={value}
              alt="Cover"
              className="h-full max-h-[220px] w-full object-cover"
            />
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange("");
              }}
              className="absolute right-2 top-2 rounded-full bg-black/60 p-1 text-white hover:bg-red-600"
              aria-label="Supprimer l'image"
            >
              <X className="h-4 w-4" />
            </button>
          </>
        ) : uploading ? (
          <div className="flex flex-col items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin" />
            Upload en cours...
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 text-sm text-muted-foreground">
            <ImageIcon className="h-8 w-8" />
            <span>Glissez une image ou cliquez pour choisir</span>
            <span className="text-xs">JPG, PNG ou WebP &middot; 5 Mo max</span>
          </div>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
          e.target.value = ""; // allow re-selecting same file
        }}
      />
    </div>
  );
}
```

### Step 2.4: Create the TipTap editor component

- [ ] Create `src/components/blog/BlogEditor.tsx` with content:

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { useEditor, EditorContent, Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import {
  Bold as BoldIcon, Italic as ItalicIcon, Strikethrough, Code,
  List, ListOrdered, Quote, Link as LinkIcon, Image as ImageIcon,
  Minus, Undo, Redo, Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE = 5 * 1024 * 1024;

interface BlogEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

export function BlogEditor({ value, onChange, placeholder }: BlogEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const initializedRef = useRef(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3, 4] } }),
      Image,
      Link.configure({ openOnClick: false, autolink: true }),
      Placeholder.configure({
        placeholder: placeholder || "Commencez à écrire...",
      }),
    ],
    content: value,
    immediatelyRender: false, // avoid SSR mismatch in Next App Router
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class:
          "prose prose-sm sm:prose-base max-w-none min-h-[360px] focus:outline-none px-4 py-3",
      },
      handleDrop: (_view, event) => {
        const files = Array.from(event.dataTransfer?.files || []);
        const file = files[0];
        if (file && ACCEPTED.includes(file.type)) {
          event.preventDefault();
          uploadAndInsert(file);
          return true;
        }
        return false;
      },
    },
  });

  // Sync external value changes ONLY when swapping to a different article
  // (not on every keystroke — that would cause cursor-jumps).
  useEffect(() => {
    if (!editor) return;
    if (!initializedRef.current) {
      editor.commands.setContent(value || "");
      initializedRef.current = true;
    }
  }, [editor, value]);

  async function uploadAndInsert(file: File) {
    if (!ACCEPTED.includes(file.type)) {
      toast.error("Utilisez un fichier JPG, PNG ou WebP.");
      return;
    }
    if (file.size > MAX_SIZE) {
      toast.error("Fichier trop volumineux (5 Mo max).");
      return;
    }
    setUploadingImage(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/blog/upload", {
        method: "POST",
        body: fd,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Erreur d'upload");
      }
      const { url } = await res.json();
      editor?.chain().focus().setImage({ src: url }).run();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload impossible");
    } finally {
      setUploadingImage(false);
    }
  }

  function promptLink() {
    if (!editor) return;
    const previous = editor.getAttributes("link").href || "";
    const url = window.prompt("URL du lien :", previous);
    if (url === null) return; // cancelled
    if (url === "") {
      editor.chain().focus().unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }

  if (!editor) {
    return (
      <div className="flex min-h-[400px] items-center justify-center rounded-lg border">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-white">
      <Toolbar
        editor={editor}
        onImageClick={() => fileInputRef.current?.click()}
        onLinkClick={promptLink}
        uploadingImage={uploadingImage}
      />
      <EditorContent editor={editor} />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) uploadAndInsert(f);
          e.target.value = "";
        }}
      />
    </div>
  );
}

function Toolbar({
  editor,
  onImageClick,
  onLinkClick,
  uploadingImage,
}: {
  editor: Editor;
  onImageClick: () => void;
  onLinkClick: () => void;
  uploadingImage: boolean;
}) {
  const btn = (active: boolean) =>
    cn(
      "flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-gray-100",
      active && "bg-green-100 text-green-700"
    );

  return (
    <div className="sticky top-0 z-10 flex flex-wrap items-center gap-0.5 border-b bg-white/95 px-2 py-1.5 backdrop-blur">
      <select
        className="mr-1 rounded-md border-0 bg-transparent px-2 py-1 text-xs font-medium hover:bg-gray-100"
        value={
          editor.isActive("heading", { level: 2 }) ? "h2"
          : editor.isActive("heading", { level: 3 }) ? "h3"
          : editor.isActive("heading", { level: 4 }) ? "h4"
          : "p"
        }
        onChange={(e) => {
          const v = e.target.value;
          if (v === "p") editor.chain().focus().setParagraph().run();
          else if (v === "h2") editor.chain().focus().toggleHeading({ level: 2 }).run();
          else if (v === "h3") editor.chain().focus().toggleHeading({ level: 3 }).run();
          else if (v === "h4") editor.chain().focus().toggleHeading({ level: 4 }).run();
        }}
      >
        <option value="p">Paragraphe</option>
        <option value="h2">Titre 2</option>
        <option value="h3">Titre 3</option>
        <option value="h4">Titre 4</option>
      </select>
      <div className="mx-1 h-6 w-px bg-gray-200" />
      <button type="button" className={btn(editor.isActive("bold"))} onClick={() => editor.chain().focus().toggleBold().run()} title="Gras">
        <BoldIcon className="h-4 w-4" />
      </button>
      <button type="button" className={btn(editor.isActive("italic"))} onClick={() => editor.chain().focus().toggleItalic().run()} title="Italique">
        <ItalicIcon className="h-4 w-4" />
      </button>
      <button type="button" className={btn(editor.isActive("strike"))} onClick={() => editor.chain().focus().toggleStrike().run()} title="Barré">
        <Strikethrough className="h-4 w-4" />
      </button>
      <button type="button" className={btn(editor.isActive("code"))} onClick={() => editor.chain().focus().toggleCode().run()} title="Code">
        <Code className="h-4 w-4" />
      </button>
      <div className="mx-1 h-6 w-px bg-gray-200" />
      <button type="button" className={btn(editor.isActive("bulletList"))} onClick={() => editor.chain().focus().toggleBulletList().run()} title="Liste à puces">
        <List className="h-4 w-4" />
      </button>
      <button type="button" className={btn(editor.isActive("orderedList"))} onClick={() => editor.chain().focus().toggleOrderedList().run()} title="Liste numérotée">
        <ListOrdered className="h-4 w-4" />
      </button>
      <button type="button" className={btn(editor.isActive("blockquote"))} onClick={() => editor.chain().focus().toggleBlockquote().run()} title="Citation">
        <Quote className="h-4 w-4" />
      </button>
      <div className="mx-1 h-6 w-px bg-gray-200" />
      <button type="button" className={btn(editor.isActive("link"))} onClick={onLinkClick} title="Lien">
        <LinkIcon className="h-4 w-4" />
      </button>
      <button type="button" className={btn(false)} onClick={onImageClick} disabled={uploadingImage} title="Image">
        {uploadingImage ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
      </button>
      <button type="button" className={btn(false)} onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Séparateur">
        <Minus className="h-4 w-4" />
      </button>
      <div className="mx-1 h-6 w-px bg-gray-200" />
      <button type="button" className={btn(false)} onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} title="Annuler">
        <Undo className="h-4 w-4" />
      </button>
      <button type="button" className={btn(false)} onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} title="Rétablir">
        <Redo className="h-4 w-4" />
      </button>
    </div>
  );
}
```

### Step 2.5: Verify build passes

- [ ] Run: `npm run build`
- [ ] Expected: compiles successfully. Bundle size of `/admin/blog` route will increase (~60 KB gzipped), which is fine for an admin-only route.

### Step 2.6: Commit + push + deploy Layer 2

- [ ] Run:

```bash
cd /c/Users/FX507/Downloads/demenagement24
git add package.json package-lock.json src/components/blog/BlogEditor.tsx src/components/blog/BlogImageUpload.tsx src/app/api/admin/blog/upload/route.ts
git commit -m "$(cat <<'EOF'
feat(blog): TipTap editor, cover-image dropzone, and upload API

BlogEditor wraps TipTap with a full toolbar (headings 2-4, bold/italic/
strike/code, lists, blockquote, link prompt, inline image upload, hr,
undo/redo). Drag/drop image files on the editor surface uploads and
inserts them at the drop position.

BlogImageUpload is a click-or-drop zone for the cover image, with
preview + delete. Both components validate type + size client-side
and show react-hot-toast errors.

/api/admin/blog/upload authenticates via the admin_token cookie (now
available on all paths after the cookie-path widening in the Layer 1
commit), uploads to Vercel Blob under blog/{YYYY-MM}/{timestamp}-{random}.{ext},
and returns { url }.

Not yet wired into the admin page -- that's the next commit.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
git push
curl -X POST "https://api.vercel.com/v1/integrations/deploy/prj_ScEfzxa5vgqh7w84HVr0VHO77k20/lQzqg9gaSp"
```

---

## Task 3: Layer 3 — wire editor + image upload + preview button into admin page

### Step 3.1: Import new components

- [ ] Open `src/app/admin/blog/page.tsx`
- [ ] Find the existing lucide-react import (around line 5). Replace the import block + add new imports:

**Before:**
```tsx
import { cn, formatDateShort } from "@/lib/utils";
import { Plus, Edit, Trash2, Eye, Search, RefreshCw, Loader2, Save, ArrowLeft } from "lucide-react";
import toast from "react-hot-toast";
```

**After:**
```tsx
import { cn, formatDateShort } from "@/lib/utils";
import { Plus, Edit, Trash2, Eye, Search, RefreshCw, Loader2, Save, ArrowLeft, ExternalLink } from "lucide-react";
import toast from "react-hot-toast";
import { BlogEditor } from "@/components/blog/BlogEditor";
import { BlogImageUpload } from "@/components/blog/BlogImageUpload";
```

### Step 3.2: Replace the content textarea with BlogEditor

- [ ] In the same file, find the content `<div>` block (around line 173-182):

**Before:**
```tsx
              <div>
                <label className="mb-1.5 block text-sm font-medium">Contenu (HTML)</label>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  rows={20}
                  className="w-full rounded-lg border px-3 py-2.5 font-mono text-xs outline-none focus:border-[var(--brand-green)] resize-y"
                  placeholder="<h2>Titre section</h2><p>Paragraphe...</p>"
                />
              </div>
```

**After:**
```tsx
              <div>
                <label className="mb-1.5 block text-sm font-medium">Contenu</label>
                <BlogEditor
                  value={formData.content}
                  onChange={(html) => setFormData({ ...formData, content: html })}
                />
              </div>
```

### Step 3.3: Replace cover-image URL input with BlogImageUpload

- [ ] In the same file, find the cover-image `<div>` (around line 202-205):

**Before:**
```tsx
              <div>
                <label className="mb-1.5 block text-sm font-medium">Image de couverture (URL)</label>
                <input value={formData.cover_image} onChange={(e) => setFormData({ ...formData, cover_image: e.target.value })} className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-[var(--brand-green)]" placeholder="https://..." />
              </div>
```

**After:**
```tsx
              <BlogImageUpload
                value={formData.cover_image}
                onChange={(url) => setFormData({ ...formData, cover_image: url })}
              />
```

### Step 3.4: Add Prévisualiser button

- [ ] In the editor-view header (around line 133-140), replace the `<div className="flex gap-2">` block containing the Annuler + Enregistrer buttons with:

**Before:**
```tsx
          <div className="flex gap-2">
            <button onClick={closeForm} className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-gray-50">Annuler</button>
            <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 rounded-lg bg-brand-gradient px-5 py-2 text-sm font-bold text-white hover:brightness-110 disabled:opacity-50">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {saving ? "Enregistrement..." : "Enregistrer"}
            </button>
          </div>
```

**After:**
```tsx
          <div className="flex gap-2">
            <button onClick={closeForm} className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-gray-50">Annuler</button>
            <button
              onClick={async () => {
                await handleSave();
                if (formData.slug) window.open(`/blog/${formData.slug}?preview=1`, "_blank");
              }}
              disabled={saving || !formData.slug}
              className="flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
              title="Enregistre et ouvre l'aperçu dans un nouvel onglet"
            >
              <ExternalLink className="h-4 w-4" />
              Prévisualiser
            </button>
            <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 rounded-lg bg-brand-gradient px-5 py-2 text-sm font-bold text-white hover:brightness-110 disabled:opacity-50">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {saving ? "Enregistrement..." : "Enregistrer"}
            </button>
          </div>
```

### Step 3.5: Verify build passes

- [ ] Run: `npm run build`
- [ ] Expected: compiles successfully.

### Step 3.6: Commit + push + deploy Layer 3

- [ ] Run:

```bash
cd /c/Users/FX507/Downloads/demenagement24
git add src/app/admin/blog/page.tsx
git commit -m "$(cat <<'EOF'
feat(admin): wire TipTap editor + cover upload + preview into /admin/blog

Replaces the raw-HTML textarea with BlogEditor (WYSIWYG, inline image
upload via drag/drop or toolbar button) and the URL text input with
BlogImageUpload (dropzone).

Adds a Prévisualiser button that saves the draft and opens
/blog/{slug}?preview=1 in a new tab, using the admin-token cookie +
the preview flag added in the Layer 1 commit so drafts render in the
real public rendering without going through a publish-then-unpublish
dance.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
git push
curl -X POST "https://api.vercel.com/v1/integrations/deploy/prj_ScEfzxa5vgqh7w84HVr0VHO77k20/lQzqg9gaSp"
```

---

## Task 4: Validation

Wait ~2 minutes for the final deploy, then on `https://deme-iota.vercel.app`:

### Step 4.1: Logged-out visitor

- [ ] Open an incognito window → `https://deme-iota.vercel.app/blog`
- [ ] Click any published article → **content now displays** (bug fix)
- [ ] Try `/blog/<any-draft-slug>?preview=1` → **404** (no admin cookie)

### Step 4.2: Admin editor flow

- [ ] Log in at `/admin/login`
- [ ] Navigate to `/admin/blog`
- [ ] Click an existing article → editor opens with HTML parsed into TipTap (headings, paragraphs render correctly)
- [ ] Click "Nouvel article":
  - Type a title, an intro paragraph
  - Use toolbar to add a **Titre 2** heading
  - Insert a **bullet list**
  - Use the **image button** in the toolbar → pick a JPG from disk → image uploads and appears inline
  - **Drag & drop** another image onto the editor → inserts at cursor
  - Upload a **cover image** by drag-dropping on the left sidebar zone
  - Save draft
- [ ] Click **Prévisualiser** → new tab opens `/blog/{slug}?preview=1` → article renders with cover + body + images
- [ ] In the new tab, remove `?preview=1` from the URL and reload → **404** (still draft)

### Step 4.3: Sanitization check

- [ ] In the editor, switch to dev tools briefly and manually insert `<script>alert(1)</script>` in the HTML (via TipTap's plain-text-paste is stripped — so paste via the DOM in devtools)
- [ ] Save → preview the article → `alert(1)` **does not fire** (DOMPurify stripped the script tag)

### Step 4.4: Backward compatibility

- [ ] Edit an article that was created **before** this change (has HTML stored from the old textarea)
- [ ] Verify the editor shows the content correctly formatted
- [ ] Save without changes → diff on the DB row: whitespace may differ (TipTap re-serializes), but visible content is identical

### Step 4.5: Desktop non-regression

- [ ] `/admin/blog` list view still loads, search works, publish toggle works
- [ ] `/blog` listing page unchanged
- [ ] Other admin pages still load normally (cookie path change is non-breaking)

### Step 4.6: Mobile responsiveness check

- [ ] Chrome DevTools iPhone 14 Pro emulation → `/admin/blog` → open editor → toolbar wraps cleanly, editor area scrolls, no horizontal overflow
- [ ] Public article on mobile → cover image scales, body text readable, `prose-lg` class gives proper mobile typography

---

## Self-review checklist

- [ ] All 3 commits pushed to `origin/master`
- [ ] 3 Vercel deploys triggered and all green
- [ ] Old articles are editable (Task 4.4) and newly-rendered on the public side (Task 4.1)
- [ ] Preview + sanitization work (Task 4.2, 4.3)
- [ ] No regressions on admin, public blog list, or other admin pages (Task 4.5)

## Rollback

Each layer is independently reversible by `git revert <sha>`:
- Revert Layer 3 → admin page reverts to textarea + URL input, other layers remain (preview URL still works, public fix still works).
- Revert Layer 2 → upload component + editor gone, but Layer 3 won't compile (depends on them) — revert Layer 3 first.
- Revert Layer 1 → public reverts to the excerpt-only bug; cookie path reverts; preview disabled.

## Done

After all boxes are checked, the blog admin is pro-grade: rich content editing, native image upload, safe public render, and a painless preview workflow.
