# Design — Blog pro redesign (WYSIWYG + image upload)

**Date:** 2026-04-21
**Scope:** Admin blog editor (`/admin/blog`) + minimal fixes to public article page (`/blog/[slug]`)
**Goal:** Replace the raw-HTML textarea with a professional WYSIWYG editor (TipTap), add cover-image upload and inline image upload, fix a latent bug that prevents published article bodies from displaying, and add a draft preview flow.

## Problem

1. **No image upload.** Cover image is a URL text input. Inline content images must be typed as raw `<img>` HTML. An admin who has a photo on their desktop cannot add it without going to a third-party image host.
2. **Raw HTML textarea.** Content is edited as plain HTML in a `<textarea>`. Formatting is painful, error-prone, and produces inconsistent markup.
3. **Latent rendering bug.** The admin saves `content` as an HTML string, but the public page `/blog/[slug]/page.tsx` expects `content: Section[]` (JSON array) and falls back to `sections = []`. As a result, **published articles only display the excerpt** — the body is silently dropped. Any real article shipped today is half-rendered.
4. **No preview.** The only way to see a finished article is to publish, check, then depublish — which briefly exposes a broken article to visitors and Googlebot.
5. **No HTML sanitization.** `dangerouslySetInnerHTML` is used later in the flow (implied by the fix) on admin-authored content. Admin is trusted today, but the pattern of rendering user-provided HTML without a sanitizer is a ticking time bomb once editorial duties are delegated.

## Out of scope

- Public blog listing page (`/blog/page.tsx`) — unchanged
- Pagination of the listing — stays out
- Next/Image optimization of blog images — stays out (keeps current `<img>` approach)
- RSS feed, auto OG-image per article, shared media library — stays out
- Categories management UI (free-text field kept as-is)
- Schema changes to `blog_posts` — not needed

## Decisions made during brainstorming

| Decision | Chosen | Alternatives rejected | Why |
|---|---|---|---|
| Scope | B (admin WYSIWYG + upload) | A (upload only) / C (full rebuild) | Upload alone is timid; full rebuild is overkill |
| Editor library | TipTap | Lexical, EditorJS, Quill | React-native, headless, HTML output, ~50kb, great docs |
| Image scope | Cover (1) + inline (N) | Plus gallery / plus media library | Standard blog pattern (Ghost, Substack), YAGNI |
| Extras | Preview + DOMPurify | None / preview only | Both trivial time cost, preview saves publish-check-depublish dance, DOMPurify future-proofs |
| Table of contents | Remove | Keep + regenerate from `<h2>` | Nice-to-have; re-add later if content depth grows |

## Architecture

Three layers of change, from smallest to largest:

### Layer 1 — Public side fix + whitelist (smallest, 3 files)

**`src/app/(public)/blog/[slug]/page.tsx`** — replace the `sections: Section[]` indirection with direct HTML rendering of `article.content` via DOMPurify:

```tsx
import DOMPurify from "isomorphic-dompurify";
// ...
const sanitizedHtml = DOMPurify.sanitize(article.content || "");
// replace the section mapping with:
<div
  className="prose prose-lg max-w-none"
  dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
/>
```

Also remove the `<aside>` table of contents (depends on the removed `sections`).

**`src/app/api/public/blog/[slug]/route.ts`** — accept `?preview=1` query param. If present AND an `admin_token` cookie is present and verified via `lib/admin-auth.ts::verifyAdminToken()`, omit the `status='published'` filter:

```ts
const url = new URL(request.url);
const preview = url.searchParams.get("preview") === "1";
const isAdmin = preview && (await verifyAdminTokenFromCookies());

let query = supabase.from("blog_posts").select("*").eq("slug", slug);
if (!isAdmin) query = query.eq("status", "published");
const { data, error } = await query.single();
```

**`src/lib/blob.ts`** — add `"blog/"` to the whitelisted path prefixes for `uploadBlob()`.

### Layer 2 — Upload API + image components (new files)

**`src/app/api/admin/blog/upload/route.ts`** (new):
- Auth: `verifyAdminToken()` on the `admin_token` cookie; 401 if invalid
- Validation: `ALLOWED_IMAGE_TYPES` + `MAX_IMAGE_SIZE` from `lib/blob.ts` (same 5 MB cap as other uploads)
- Path: `blog/{YYYY-MM}/{timestamp}-{random-6chars}.{ext}` (grouped by month so Blob listing stays browsable)
- Returns: `{ url: string }` — no DB row is inserted (the URL is stored either in `blog_posts.cover_image` or inside the `content` HTML by TipTap)

**`src/components/blog/BlogImageUpload.tsx`** (new, ~80 LOC):
- Props: `value: string` (current URL, empty if no cover), `onChange: (url: string) => void`, optional `label`
- Drag-and-drop zone + file input, 200px min height
- Client-side validation: type in `image/jpeg|png|webp`, size ≤ 5 MB
- Shows preview when `value` is set, with a `×` button to clear
- Shows spinner + "Upload en cours..." during POST
- Error toasts via react-hot-toast on validation failure or network error

**`src/components/blog/BlogEditor.tsx`** (new, ~200 LOC):
- Props: `value: string` (HTML), `onChange: (html: string) => void`, `placeholder?: string`
- Instantiates TipTap with `StarterKit`, `Image`, `Link`, `Placeholder` extensions
- Toolbar row with buttons: H2/H3/H4 dropdown, Bold, Italic, Strike, Inline code, UL, OL, Blockquote, Link (prompt), Image (file picker), HR, Undo, Redo
- Image button opens a hidden `<input type="file">`; on change → POST to `/api/admin/blog/upload` → on response, `editor.chain().focus().setImage({ src: url }).run()`
- Drag-and-drop files onto the editor surface: same flow, but the insertion position is where the cursor was just before drop
- Loading state on image insertion (blocks double-inserts)

**Package additions:**
```
@tiptap/react @tiptap/starter-kit @tiptap/extension-image @tiptap/extension-link @tiptap/extension-placeholder isomorphic-dompurify
```
Approximate bundle impact on `/admin/blog`: +80 KB gzipped. No impact on public bundles — TipTap is admin-only, DOMPurify is tree-shaken to only the sanitize function on the server.

### Layer 3 — Admin page wiring

**`src/app/admin/blog/page.tsx`** — replace two fields in the existing editor view (the rest of the 305-line file is untouched):

1. Replace the content `<textarea>` (lines 174-182) with:
   ```tsx
   <BlogEditor
     value={formData.content}
     onChange={(html) => setFormData({ ...formData, content: html })}
     placeholder="Commencez à écrire..."
   />
   ```

2. Replace the "Image de couverture (URL)" `<input>` (lines 202-205) with:
   ```tsx
   <BlogImageUpload
     value={formData.cover_image}
     onChange={(url) => setFormData({ ...formData, cover_image: url })}
   />
   ```

3. Add a "Prévisualiser" button next to "Enregistrer" (inside the existing header flex):
   ```tsx
   <button
     onClick={async () => {
       await handleSave();
       window.open(`/blog/${formData.slug}?preview=1`, "_blank");
     }}
     disabled={!formData.slug || saving}
     className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-gray-50"
   >
     Prévisualiser
   </button>
   ```

## Data flow

**Create article:**
1. Admin opens `/admin/blog`, clicks "Nouvel article"
2. Types title → slug auto-generated (existing behavior)
3. Drag-drops a cover image → `BlogImageUpload` → `POST /api/admin/blog/upload` → URL saved in `formData.cover_image`
4. Writes in the TipTap editor. Drag-drops an inline image → editor uploads via same API → `<img src="...">` inserted at cursor
5. Click "Enregistrer" → `POST /api/admin/blog` with `action: "create"` → article row with HTML content
6. Click "Prévisualiser" → saves, opens `/blog/{slug}?preview=1` in new tab
7. When satisfied, toggle status to "Publié" from the list view

**Render public article:**
1. Visitor hits `/blog/some-slug`
2. Page fetches `/api/public/blog/some-slug` → API filters `status='published'`
3. Page renders `<div dangerouslySetInnerHTML={DOMPurify.sanitize(content)} />` inside a `.prose` wrapper
4. `<img>` tags inside the HTML are rendered as native browser images (no Next/Image, out of scope)

**Render preview:**
1. Admin clicks "Prévisualiser" → new tab on `/blog/some-slug?preview=1`
2. Page fetches `/api/public/blog/some-slug?preview=1`
3. API verifies `admin_token` cookie → bypasses `status='published'` filter
4. Draft article renders identically to a published one

## Backward compatibility

- **Existing articles with raw HTML content:** TipTap accepts HTML input via `editor.commands.setContent(html)`. Opening an old article in the new editor parses the HTML and makes it editable with no data loss.
- **Existing cover URLs (external images pasted as URLs, Vercel Blob URLs from earlier uploads):** `BlogImageUpload` accepts any URL as its `value` prop and renders it via a regular `<img>`. Only when the admin uploads a new file does the URL get replaced.
- **Articles where `content` was intended as `Section[]` JSON:** none in production — inspection of the public page showed `sections = []` was the silent path. No migration needed because no data is in that shape today.

## Security

- **Admin API auth:** the new upload route uses `verifyAdminToken()` from `lib/admin-auth.ts`, the same pattern as `/api/admin/companies` and other admin routes. Public requests return 401 without touching Blob.
- **File validation:** both client-side (fast UX feedback) and server-side (authoritative). Types restricted to `image/jpeg|png|webp`. Max size 5 MB.
- **HTML sanitization:** `DOMPurify.sanitize()` applied on every public render. Default config strips `<script>`, `<iframe>` (non-allowlisted), `on*` attributes, `javascript:` URLs. Admin-authored content is trusted but sanitization defends against copy-paste from Word/Google Docs that injects weird markup.
- **Draft exposure via preview URL:** the `?preview=1` param alone does NOT reveal drafts — the API checks a valid `admin_token` cookie. A non-admin visitor hitting `/blog/unpublished?preview=1` gets the same 404 as if they had not added the param.

## Testing / validation plan

No automated UI tests (consistent with CLAUDE.md: "only pure helpers are tested"). Validation is manual after deploy:

1. **Build:** `npm run build` must pass with 0 errors and no new warnings. Existing warnings (`react-hooks/exhaustive-deps`) are pre-silenced.
2. **Admin editor smoke:**
   - Create a new article, type some text with headings and a list, insert an inline image via drag-drop, upload a cover, save as draft
   - Reopen → content, cover, title survive
   - Edit an existing (old-HTML) article → TipTap parses and renders it, save → unchanged content preserved
3. **Preview:**
   - Draft article, click "Prévisualiser" → new tab shows the article with body + cover
   - Logged-out browser: `/blog/that-slug` → 404 (draft hidden)
   - Logged-out browser: `/blog/that-slug?preview=1` → 404 (still hidden, no admin cookie)
4. **Public render (bug fix verification):**
   - Publish one of the articles that previously only showed its excerpt → full HTML content now renders
   - Inspect the rendered DOM: no `<script>` tags even if inserted via devtools paste
5. **Upload resilience:**
   - Reject a `.pdf` drop → client-side error toast
   - Reject a 10 MB image → client-side error toast
   - Force through via curl with a valid admin_token and an oversized file → 400 from server

## Rollback plan

- Layer 1 (public fix + blob whitelist) rolls back by reverting the commit; public page falls back to the old broken behavior (excerpts only). Not ideal but data-safe.
- Layer 2 (new API + components) rolls back by reverting the commit and removing package-lock additions. Zero impact on existing articles (cover URLs still work as free-text URLs with the old admin UI).
- Layer 3 (admin wiring) rolls back by reverting the admin/blog/page.tsx changes. The editor reverts to the raw HTML textarea.

Each layer is a separate commit; rollback is granular.

## Deliverables

1. New files:
   - `src/components/blog/BlogEditor.tsx`
   - `src/components/blog/BlogImageUpload.tsx`
   - `src/app/api/admin/blog/upload/route.ts`
2. Modified files:
   - `package.json` / `package-lock.json` — 6 new deps
   - `src/lib/blob.ts` — 1-line whitelist addition
   - `src/app/admin/blog/page.tsx` — replace textarea + URL input, add preview button
   - `src/app/(public)/blog/[slug]/page.tsx` — switch to HTML render + DOMPurify, remove TOC
   - `src/app/api/public/blog/[slug]/route.ts` — accept `?preview=1` with admin-token check
3. Three commits (one per layer), each followed by a Vercel deploy via the deploy hook.
