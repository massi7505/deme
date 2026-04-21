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

  // Sync external value → editor without fighting the user:
  // - skip if editor's current HTML already matches value (prevents cursor jumps during typing)
  // - skip if the editor has focus (user is actively typing — don't stomp their cursor)
  useEffect(() => {
    if (!editor) return;
    const incoming = value || "";
    const current = editor.getHTML();
    // TipTap's "empty" representation is "<p></p>"; treat it as equivalent to "".
    const normalizedCurrent = current === "<p></p>" ? "" : current;
    if (incoming === normalizedCurrent) return;
    if (typeof document !== "undefined" && document.activeElement === editor.view.dom) return;
    editor.commands.setContent(incoming, { emitUpdate: false });
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
