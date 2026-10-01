"use client";

import { KrokImage, type ImageAlign } from './editor/KrokImage';
import Link from '@tiptap/extension-link';
import Subscript from '@tiptap/extension-subscript';
import Superscript from '@tiptap/extension-superscript';
import { Table } from '@tiptap/extension-table';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { TableRow } from '@tiptap/extension-table-row';
import TextAlign from '@tiptap/extension-text-align';
import Underline from '@tiptap/extension-underline';
import { Youtube } from '@tiptap/extension-youtube';
import { EditorContent, useEditor, useEditorState } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import {
  AlignCenter, AlignJustify, AlignLeft, AlignRight,
  Bold, Heading1, Heading2,
  Heading3, Image as ImageIcon, Italic, Link2,
  LinkIcon, List, ListOrdered, Minus,
  Plus, Quote, Redo,
  Strikethrough,
  Subscript as SubscriptIcon, Superscript as SuperscriptIcon,
  Table as TableIcon, Trash2, Type,
  Underline as UnderlineIcon,
  Undo, Video, X
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { uploadPostImage } from '@/app/admin/aktuality/actions';
import { cleanPastedHtml } from '@/lib/html/clean-paste';

/** Predvolené šírky obrázka (hodnota = CSS šírka) */
const IMAGE_WIDTHS: { value: string; label: string }[] = [
  { value: '', label: 'Pôvodná šírka' },
  { value: '100px', label: '100 px (malé logo)' },
  { value: '150px', label: '150 px (logo)' },
  { value: '200px', label: '200 px' },
  { value: '300px', label: '300 px' },
  { value: '33%', label: 'Tretina šírky' },
  { value: '50%', label: 'Polovica šírky' },
  { value: '75%', label: 'Tri štvrtiny' },
  { value: '100%', label: 'Celá šírka' },
];

const IMAGE_ALIGNS: { value: ImageAlign; label: string; title: string }[] = [
  { value: 'left', label: '◧ Vľavo', title: 'Vľavo, text obteká vpravo' },
  { value: 'center', label: '▣ Stred', title: 'Na stred, samostatne' },
  { value: 'right', label: '◨ Vpravo', title: 'Vpravo, text obteká vľavo' },
  { value: 'none', label: 'Bez', title: 'Bez zarovnania (samostatne, vľavo)' },
];

/** „www.partner.sk“ → „https://www.partner.sk“ */
function normalizeUrl(url: string): string {
  const u = url.trim();
  return /^(https?:|mailto:|tel:|\/)/i.test(u) ? u : `https://${u}`;
}

interface SimpleRichTextEditorProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  minHeight?: string;
  className?: string;
  postId?: string;
  /** Vlastná upload akcia (napr. modul výziev); predvolene uploadPostImage z aktualít. */
  uploader?: (formData: FormData) => Promise<{ url?: string; error?: string }>;
}

export default function SimpleRichTextEditor({
  label,
  value,
  onChange,
  disabled = false,
  minHeight = '200px',
  className = '',
  postId,
  uploader
}: SimpleRichTextEditorProps) {
  const [showImageDialog, setShowImageDialog] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [imageFloat, setImageFloat] = useState<ImageAlign>('none');
  const [imageWidth, setImageWidth] = useState<string>('');
  const [imageLink, setImageLink] = useState<string>('');
  const [uploadMethod, setUploadMethod] = useState<'url' | 'upload'>('url');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  
  const [showVideoDialog, setShowVideoDialog] = useState(false);
  const [videoUrl, setVideoUrl] = useState('');
  const [videoWidth, setVideoWidth] = useState<string>('640');
  const [videoHeight, setVideoHeight] = useState<string>('480');

  const editor = useEditor({
    immediatelyRender: false, // Fix SSR hydration issues in Next.js
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
        code: false, // Zakázať code blocks
        codeBlock: false,
      }),
      Underline,
      Subscript,
      Superscript,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-600 underline hover:text-blue-800',
        },
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
        alignments: ['left', 'center', 'right', 'justify'],
      }),
      KrokImage.configure({
        inline: true,
        allowBase64: true,
        HTMLAttributes: {
          class: 'editor-image',
        },
      }),
      Table.configure({
        resizable: true,
        HTMLAttributes: {
          class: 'editor-table',
        },
      }),
      TableRow,
      TableHeader,
      TableCell,
      Youtube.configure({
        controls: true,
        nocookie: true,
        HTMLAttributes: {
          class: 'editor-video',
        },
      }),
    ],
    content: value || '',
    editable: !disabled,
    // Vloženie z Wordu – odstráni štýly, mso-* a podmienené komentáre (návrh farností O30)
    editorProps: { transformPastedHTML: cleanPastedHtml },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      // Ak je obsah prázdny paragraph, vráť prázdny string
      if (html === '<p></p>') {
        onChange('');
      } else {
        onChange(html);
      }
    },
  });

  // Vybraný obrázok (panel „Obrázok“) – v Tiptap v3 sa editor sám nerenderuje pri zmene výberu
  const imageSel = useEditorState({
    editor,
    selector: ({ editor: ed }) => {
      if (!ed || !ed.isActive('image')) return null;
      const attrs = ed.getAttributes('image');
      return {
        align: (attrs.align as ImageAlign) || 'none',
        width: (attrs.width as string | null) || '',
        href: (ed.getAttributes('link').href as string | undefined) || '',
      };
    },
  });

  // Sync external value changes to editor
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value || '');
    }
  }, [value, editor]);

  if (!editor) {
    return (
      <div className={className}>
        <label className="block text-xs font-black text-gray-400 uppercase tracking-widest pl-1 mb-2">
          {label}
        </label>
        <div className="border border-gray-200 rounded-2xl p-6 bg-gray-50/50">
          <div className="animate-pulse text-xs font-semibold text-gray-400">Načítavam bohatý textový editor...</div>
        </div>
      </div>
    );
  }

  const ToolbarButton = ({ 
    onClick, 
    active, 
    icon: Icon, 
    title,
    disabled: buttonDisabled = false
  }: { 
    onClick: () => void; 
    active?: boolean; 
    icon: React.ComponentType<{ size?: number; className?: string }>; 
    title: string;
    disabled?: boolean;
  }) => (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || buttonDisabled}
      className={`
        p-2 rounded-lg transition-colors cursor-pointer
        ${active 
          ? 'bg-blue-50 text-blue-600 border border-blue-100 shadow-sm' 
          : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900 border border-transparent'
        }
        ${(disabled || buttonDisabled) ? 'opacity-50 cursor-not-allowed' : ''}
      `}
      title={title}
    >
      <Icon size={16} />
    </button>
  );

  // Získaj plain text pre počítadlo slov
  const plainText = editor.getText();
  const wordCount = plainText.trim() ? plainText.trim().split(/\s+/).length : 0;
  const charCount = plainText.length;

  return (
    <div className={`space-y-2 ${className}`}>
      <label className="block text-xs font-black text-gray-400 uppercase tracking-widest pl-1">
        {label}
      </label>
      
      <div className="border border-gray-200 rounded-3xl overflow-hidden focus-within:ring-4 focus-within:ring-blue-500/10 focus-within:border-blue-500/50 transition-all bg-white shadow-sm">
        {/* Toolbar */}
        <div className="bg-gray-50/50 border-b border-gray-200 p-3 flex gap-1.5 flex-wrap items-center">
          {/* Nadpisy */}
          <div className="flex items-center gap-1">
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
              active={editor.isActive('heading', { level: 1 })}
              icon={Heading1}
              title="Nadpis 1"
            />
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
              active={editor.isActive('heading', { level: 2 })}
              icon={Heading2}
              title="Nadpis 2"
            />
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
              active={editor.isActive('heading', { level: 3 })}
              icon={Heading3}
              title="Nadpis 3"
            />
          </div>
          
          <div className="w-px h-6 bg-gray-200 mx-1" />
          
          {/* Formátovanie textu */}
          <div className="flex items-center gap-1">
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleBold().run()}
              active={editor.isActive('bold')}
              icon={Bold}
              title="Tučné (Ctrl+B)"
            />
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleItalic().run()}
              active={editor.isActive('italic')}
              icon={Italic}
              title="Kurzíva (Ctrl+I)"
            />
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleUnderline().run()}
              active={editor.isActive('underline')}
              icon={UnderlineIcon}
              title="Podčiarknuté (Ctrl+U)"
            />
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleStrike().run()}
              active={editor.isActive('strike')}
              icon={Strikethrough}
              title="Prečiarknuté"
            />
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleSubscript().run()}
              active={editor.isActive('subscript')}
              icon={SubscriptIcon}
              title="Dolný index (H₂O)"
            />
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleSuperscript().run()}
              active={editor.isActive('superscript')}
              icon={SuperscriptIcon}
              title="Horný index (x²)"
            />
          </div>
          
          <div className="w-px h-6 bg-gray-200 mx-1" />
          
          {/* Zoznamy */}
          <div className="flex items-center gap-1">
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              active={editor.isActive('bulletList')}
              icon={List}
              title="Odrážky"
            />
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              active={editor.isActive('orderedList')}
              icon={ListOrdered}
              title="Číslovaný zoznam"
            />
          </div>
          
          <div className="w-px h-6 bg-gray-200 mx-1" />
          
          {/* Zarovnanie */}
          <div className="flex items-center gap-1">
            <ToolbarButton
              onClick={() => editor.chain().focus().setTextAlign('left').run()}
              active={editor.isActive({ textAlign: 'left' })}
              icon={AlignLeft}
              title="Zarovnať vľavo"
            />
            <ToolbarButton
              onClick={() => editor.chain().focus().setTextAlign('center').run()}
              active={editor.isActive({ textAlign: 'center' })}
              icon={AlignCenter}
              title="Zarovnať na stred"
            />
            <ToolbarButton
              onClick={() => editor.chain().focus().setTextAlign('right').run()}
              active={editor.isActive({ textAlign: 'right' })}
              icon={AlignRight}
              title="Zarovnať vpravo"
            />
            <ToolbarButton
              onClick={() => editor.chain().focus().setTextAlign('justify').run()}
              active={editor.isActive({ textAlign: 'justify' })}
              icon={AlignJustify}
              title="Zarovnať do bloku"
            />
          </div>
          
          <div className="w-px h-6 bg-gray-200 mx-1" />
          
          {/* Špeciálne */}
          <div className="flex items-center gap-1">
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleBlockquote().run()}
              active={editor.isActive('blockquote')}
              icon={Quote}
              title="Citácia"
            />
            <ToolbarButton
              onClick={() => editor.chain().focus().setHorizontalRule().run()}
              icon={Minus}
              title="Horizontálna čiara"
            />
            <ToolbarButton
              onClick={() => {
                const url = window.prompt('URL adresa odkazu:');
                if (url) {
                  editor.chain().focus().setLink({ href: url }).run();
                }
              }}
              active={editor.isActive('link')}
              icon={LinkIcon}
              title="Pridať odkaz"
            />
            <ToolbarButton
              onClick={() => setShowImageDialog(true)}
              icon={ImageIcon}
              title="Vložiť obrázok z B2"
            />
            <ToolbarButton
              onClick={() => setShowVideoDialog(true)}
              icon={Video}
              title="Vložiť video"
            />
          </div>
          
          <div className="w-px h-6 bg-gray-200 mx-1" />
          
          {/* Tabuľka */}
          <div className="flex items-center gap-1">
            <ToolbarButton
              onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
              icon={TableIcon}
              title="Vložiť tabuľku"
            />
            {editor.isActive('table') && (
              <>
                <ToolbarButton
                  onClick={() => editor.chain().focus().addColumnBefore().run()}
                  icon={Plus}
                  title="Pridať stĺpec vľavo"
                />
                <ToolbarButton
                  onClick={() => editor.chain().focus().addColumnAfter().run()}
                  icon={Plus}
                  title="Pridať stĺpec vpravo"
                />
                <ToolbarButton
                  onClick={() => editor.chain().focus().deleteColumn().run()}
                  icon={X}
                  title="Odstrániť stĺpec"
                />
                <ToolbarButton
                  onClick={() => editor.chain().focus().addRowBefore().run()}
                  icon={Plus}
                  title="Pridať riadok hore"
                />
                <ToolbarButton
                  onClick={() => editor.chain().focus().addRowAfter().run()}
                  icon={Plus}
                  title="Pridať riadok dole"
                />
                <ToolbarButton
                  onClick={() => editor.chain().focus().deleteRow().run()}
                  icon={X}
                  title="Odstrániť riadok"
                />
                <ToolbarButton
                  onClick={() => editor.chain().focus().deleteTable().run()}
                  icon={Trash2}
                  title="Odstrániť tabuľku"
                />
              </>
            )}
          </div>
          
          <div className="w-px h-6 bg-gray-200 mx-1" />
          
          {/* Undo/Redo */}
          <div className="flex items-center gap-1">
            <ToolbarButton
              onClick={() => editor.chain().focus().undo().run()}
              icon={Undo}
              title="Späť (Ctrl+Z)"
              disabled={!editor.can().undo()}
            />
            <ToolbarButton
              onClick={() => editor.chain().focus().redo().run()}
              icon={Redo}
              title="Dopredu (Ctrl+Y)"
              disabled={!editor.can().redo()}
            />
          </div>
 
          {/* Utility buttons */}
          <div className="ml-auto flex items-center gap-2">
            {editor.isActive('link') && (
              <button
                type="button"
                onClick={() => editor.chain().focus().unsetLink().run()}
                className="px-2.5 py-1.5 text-xs font-black bg-red-50 hover:bg-red-100 text-red-700 rounded-xl flex items-center gap-1 cursor-pointer"
                title="Odstrániť odkaz z vybraného textu"
              >
                <Link2 size={12} />
                Zrušiť link
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                editor.chain().focus().clearNodes().unsetAllMarks().run();
              }}
              className="px-2.5 py-1.5 text-xs font-black bg-blue-50/50 hover:bg-blue-50 text-blue-700 rounded-xl flex items-center gap-1 cursor-pointer"
              title="Odstrániť formátovanie"
            >
              <Type size={12} />
              Vyčistiť
            </button>
            <button
              type="button"
              onClick={() => {
                if (confirm('Naozaj chcete vymazať celý obsah editora?')) {
                  editor.commands.clearContent();
                  onChange('');
                }
              }}
              className="px-2.5 py-1.5 text-xs font-black bg-red-50 hover:bg-red-100 text-red-600 rounded-xl flex items-center gap-1 cursor-pointer"
              title="Vymazať celý obsah"
              disabled={!plainText}
            >
              <Trash2 size={12} />
              Zmazať všetko
            </button>
          </div>
        </div>
 
        {/* Panel pre vybraný obrázok: umiestnenie, šírka, odkaz */}
        {imageSel && !disabled && (
          <div className="bg-blue-50/60 border-b border-blue-100 px-3 py-2 flex flex-wrap items-center gap-2 text-xs">
            <span className="font-black text-blue-700 uppercase tracking-wider text-[10px] mr-1">Obrázok</span>
            <div className="flex items-center gap-1 bg-white border border-blue-100 rounded-lg p-0.5">
              {IMAGE_ALIGNS.map((a) => (
                <button
                  key={a.value}
                  type="button"
                  onClick={() => editor.chain().focus().updateAttributes('image', { align: a.value }).run()}
                  className={`px-2 py-1 rounded-md font-bold cursor-pointer ${imageSel.align === a.value ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
                  title={a.title}
                >
                  {a.label}
                </button>
              ))}
            </div>
            <select
              value={imageSel.width}
              onChange={(e) => editor.chain().focus().updateAttributes('image', { width: e.target.value || null }).run()}
              className="bg-white border border-blue-100 rounded-lg px-2 py-1.5 font-bold text-gray-700 cursor-pointer"
              aria-label="Šírka obrázka"
            >
              {IMAGE_WIDTHS.some((w) => w.value === imageSel.width) ? null : <option value={imageSel.width}>{imageSel.width}</option>}
              {IMAGE_WIDTHS.map((w) => <option key={w.value} value={w.value}>{w.label}</option>)}
            </select>
            <button
              type="button"
              onClick={() => {
                const url = window.prompt('Odkaz po kliknutí na obrázok (prázdne = zrušiť odkaz):', imageSel.href);
                if (url === null) return;
                if (url.trim()) editor.chain().focus().setLink({ href: normalizeUrl(url), target: '_blank' }).run();
                else editor.chain().focus().unsetLink().run();
              }}
              className={`inline-flex items-center gap-1 px-2 py-1.5 rounded-lg font-bold cursor-pointer border ${imageSel.href ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-blue-100 hover:bg-gray-50'}`}
              title={imageSel.href || 'Pridať odkaz na obrázok'}
            >
              <LinkIcon size={12} /> {imageSel.href ? 'Odkaz ✓' : 'Odkaz'}
            </button>
            <span className="text-[10px] text-gray-500 ml-auto hidden md:inline">
              Logo s textom vedľa: „Vľavo“ + šírka 150 px. Najlepšie fotky: šírka 1200–1600 px, logá 300–400 px.
            </span>
          </div>
        )}

        {/* Editor Content */}
        <EditorContent 
          editor={editor}
          className="simple-rich-editor"
          style={{ minHeight }}
        />
        
        {/* Info bar */}
        <div className="bg-gray-50/30 border-t border-gray-200 px-4 py-2.5 text-[10px] font-bold text-gray-400 flex justify-between items-center">
          <span>
            {charCount > 0 && `${charCount} znakov`}
            {charCount > 0 && wordCount > 0 && ' • '}
            {wordCount > 0 && `${wordCount} slov`}
          </span>
          {disabled && (
            <span className="text-gray-400 italic">Iba na čítanie</span>
          )}
        </div>
      </div>
 
      {/* Image Dialog */}
      {showImageDialog && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-gray-100 animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-black mb-4 text-gray-900">Vložiť obrázok</h3>
            
            <div className="space-y-4">
              {/* Toggle between URL and Upload */}
              <div className="flex gap-2 p-1 bg-gray-50 border border-gray-200 rounded-xl">
                <button
                  type="button"
                  onClick={() => setUploadMethod('url')}
                  className={`flex-1 px-3 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    uploadMethod === 'url'
                      ? 'bg-white shadow-sm text-blue-600 border border-gray-100'
                      : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  🔗 URL odkaz
                </button>
                <button
                  type="button"
                  onClick={() => setUploadMethod('upload')}
                  className={`flex-1 px-3 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    uploadMethod === 'upload'
                      ? 'bg-white shadow-sm text-blue-600 border border-gray-100'
                      : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  📤 Nahrať na B2
                </button>
              </div>
 
              {uploadMethod === 'url' ? (
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 pl-1">
                    URL adresa obrázka
                  </label>
                  <input
                    type="text"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="https://example.com/image.jpg"
                    className="w-full text-xs font-bold text-gray-700 bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    autoFocus
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 pl-1 block">
                    Nahrať lokálny súbor
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
 
                      setUploading(true);
                      setUploadError(null);
 
                      try {
                        const formData = new FormData();
                        formData.append('file', file);
                        if (postId) {
                          formData.append('postId', postId);
                        }
 
                        const result = uploader ? await uploader(formData) : await uploadPostImage(formData);
 
                        if (result.error) {
                          setUploadError(result.error);
                          return;
                        }
 
                        if (result.url) {
                          setImageUrl(result.url);
                        }
                      } catch (error) {
                        setUploadError('Chyba pri nahrávaní obrázka');
                        console.error('Upload error:', error);
                      } finally {
                        setUploading(false);
                      }
                    }}
                    className="w-full text-xs font-bold text-gray-700 bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                    disabled={uploading}
                  />
                  {uploading && (
                    <p className="text-xs text-blue-600 font-bold animate-pulse">📤 Nahrávam na Backblaze B2...</p>
                  )}
                  {uploadError && (
                    <p className="text-xs text-red-600 font-bold">❌ {uploadError}</p>
                  )}
                  {imageUrl && !uploading && (
                    <p className="text-xs text-emerald-600 font-bold">✅ Súbor nahraný na B2!</p>
                  )}
                </div>
              )}
 
              {/* Šírka obrázka */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-400 pl-1">
                  Šírka (voliteľné)
                </label>
                <select
                  value={imageWidth}
                  onChange={(e) => setImageWidth(e.target.value)}
                  className="w-full text-xs font-bold text-gray-700 bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                >
                  {IMAGE_WIDTHS.map((w) => <option key={w.value} value={w.value}>{w.label}</option>)}
                </select>
              </div>

              {/* Odkaz na obrázku */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-400 pl-1">
                  Odkaz po kliknutí na obrázok (voliteľné)
                </label>
                <input
                  type="text"
                  value={imageLink}
                  onChange={(e) => setImageLink(e.target.value)}
                  placeholder="https://www.partner.sk"
                  className="w-full text-xs font-bold text-gray-700 bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Obtekanie */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-400 pl-1">
                  Umiestnenie
                </label>
                <div className="flex gap-2 p-1 bg-gray-50 border border-gray-200 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setImageFloat('none')}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      imageFloat === 'none'
                        ? 'bg-white shadow-sm text-blue-600 border border-gray-100'
                        : 'text-gray-500 hover:text-gray-900'
                    }`}
                  >
                    Žiadne
                  </button>
                  <button
                    type="button"
                    onClick={() => setImageFloat('left')}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      imageFloat === 'left'
                        ? 'bg-white shadow-sm text-blue-600 border border-gray-100'
                        : 'text-gray-500 hover:text-gray-900'
                    }`}
                  >
                    Vľavo, text vedľa
                  </button>
                  <button
                    type="button"
                    onClick={() => setImageFloat('center')}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      imageFloat === 'center'
                        ? 'bg-white shadow-sm text-blue-600 border border-gray-100'
                        : 'text-gray-500 hover:text-gray-900'
                    }`}
                  >
                    Na stred
                  </button>
                  <button
                    type="button"
                    onClick={() => setImageFloat('right')}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      imageFloat === 'right'
                        ? 'bg-white shadow-sm text-blue-600 border border-gray-100'
                        : 'text-gray-500 hover:text-gray-900'
                    }`}
                  >
                    Vpravo, text vedľa
                  </button>
                </div>
              </div>
            </div>
 
            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={() => {
                  if (imageUrl) {
                    const imageNode = {
                      type: 'image',
                      attrs: { src: imageUrl, align: imageFloat, width: imageWidth || null },
                      ...(imageLink.trim()
                        ? { marks: [{ type: 'link', attrs: { href: normalizeUrl(imageLink), target: '_blank' } }] }
                        : {}),
                    };
                    editor.chain().focus().insertContent(imageNode).run();
                  }
                  setShowImageDialog(false);
                  setImageUrl('');
                  setImageFloat('none');
                  setImageWidth('');
                  setImageLink('');
                }}
                disabled={!imageUrl}
                className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-black shadow-lg shadow-blue-500/10 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
              >
                Vložiť obrázok
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowImageDialog(false);
                  setImageUrl('');
                  setImageFloat('none');
                  setImageWidth('');
                  setImageLink('');
                  setUploadMethod('url');
                  setUploadError(null);
                }}
                className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-black transition-colors cursor-pointer"
              >
                Zrušiť
              </button>
            </div>
          </div>
        </div>
      )}
 
      {/* Video Dialog */}
      {showVideoDialog && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-gray-100 animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-black mb-4 text-gray-900">Vložiť video</h3>
            
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-400 pl-1">
                  YouTube adresa alebo ID videa
                </label>
                <input
                  type="text"
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  placeholder="https://youtube.com/watch?v=... alebo dQw4w9WgXcQ"
                  className="w-full text-xs font-bold text-gray-700 bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-3 focus:outline-none"
                  autoFocus
                />
                <p className="text-[10px] text-gray-400 font-bold pl-1">
                  Podporuje YouTube odkazy, Vimeo, alebo priame MP4 URL adresy.
                </p>
              </div>
 
              {/* Rozmery videa */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-400 pl-1">
                  Rozmery videa (voliteľné)
                </label>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <input
                      type="text"
                      value={videoWidth}
                      onChange={(e) => setVideoWidth(e.target.value)}
                      placeholder="Šírka (predvolená 640)"
                      className="w-full text-xs font-bold text-gray-700 bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 focus:outline-none"
                    />
                  </div>
                  <div className="flex-1">
                    <input
                      type="text"
                      value={videoHeight}
                      onChange={(e) => setVideoHeight(e.target.value)}
                      placeholder="Výška (predvolená 480)"
                      className="w-full text-xs font-bold text-gray-700 bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>
 
            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={() => {
                  if (videoUrl) {
                    if (videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be')) {
                      editor.chain().focus().setYoutubeVideo({
                        src: videoUrl,
                        width: parseInt(videoWidth) || 640,
                        height: parseInt(videoHeight) || 480,
                      }).run();
                    } else {
                      const videoHtml = `<div class="editor-video-container" style="max-width: ${videoWidth}px; margin: 1rem 0;">
                        <video controls style="width: 100%; height: auto; border-radius: 8px;">
                          <source src="${videoUrl}" type="video/mp4">
                          Váš prehliadač nepodporuje video tag.
                        </video>
                      </div>`;
                      
                      const currentContent = editor.getHTML();
                      editor.commands.setContent(currentContent + videoHtml);
                    }
                  }
                  setShowVideoDialog(false);
                  setVideoUrl('');
                  setVideoWidth('640');
                  setVideoHeight('480');
                }}
                disabled={!videoUrl}
                className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-black shadow-lg shadow-blue-500/10 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
              >
                Vložiť video
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowVideoDialog(false);
                  setVideoUrl('');
                  setVideoWidth('640');
                  setVideoHeight('480');
                }}
                className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-black transition-colors cursor-pointer"
              >
                Zrušiť
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
