'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { 
  ArrowLeft, Save, Loader2, Sparkles, Volume2, Image as ImageIcon,
  Trash2, AlertTriangle, Link as LinkIcon, Pin
} from 'lucide-react'
import Link from 'next/link'
import { createOrUpdatePost, generateElevenLabsTTS, uploadPostImage, generateAiContent, generateAiExcerpt, checkGrammar, generateAiImage } from '@/app/admin/aktuality/actions'
import SimpleRichTextEditor from '@/components/admin/SimpleRichTextEditor'
import { Wrench } from 'lucide-react'

interface PostData {
  id?: string
  title: string
  slug: string
  excerpt?: string
  content: string
  featured_image?: string
  audio_url?: string | null
  status: 'draft' | 'published' | 'archived'
  published_at?: string | null
  pinned?: boolean
  pin_order?: number
}

interface AktualityFormProps {
  initialData?: PostData
}

export default function AktualityForm({ initialData }: AktualityFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // Form states
  const [title, setTitle] = useState(initialData?.title || '')
  const [slug, setSlug] = useState(initialData?.slug || '')
  const [isCustomSlug, setIsCustomSlug] = useState(!!initialData?.slug)
  const [excerpt, setExcerpt] = useState(initialData?.excerpt || '')
  const [content, setContent] = useState(initialData?.content || '')
  const [status, setStatus] = useState<'draft' | 'published' | 'archived'>(initialData?.status || 'draft')
  const [featuredImage, setFeaturedImage] = useState(initialData?.featured_image || '')
  const [audioUrl, setAudioUrl] = useState(initialData?.audio_url || '')
  const [pinned, setPinned] = useState(initialData?.pinned ?? false)
  const [pinOrder, setPinOrder] = useState(initialData?.pin_order?.toString() || '0')

  // Operation states
  const [imageLoading, setImageLoading] = useState(false)
  const [ttsLoading, setTtsLoading] = useState(false)
  const [ttsSuccess, setTtsSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Gemini AI states
  const [aiPrompt, setAiPrompt] = useState('')
  const [aiMode, setAiMode] = useState<'generate' | 'refine'>('generate')
  const [aiLoading, setAiLoading] = useState(false)
  const [excerptLoading, setExcerptLoading] = useState(false)
  const [grammarChecking, setGrammarChecking] = useState(false)
  const [imagePrompt, setImagePrompt] = useState('')
  const [imageGenerating, setImageGenerating] = useState(false)
  const [showImagePromptField, setShowImagePromptField] = useState(false)

  // Auto-slug generation from Title
  const handleTitleChange = (val: string) => {
    setTitle(val)
    if (!isCustomSlug) {
      const cleanSlug = val
        .toString()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, '-')
        .replace(/[^\w-]+/g, '')
        .replace(/--+/g, '-')
        .replace(/^-+/, '')
        .replace(/-+$/, '')
      setSlug(cleanSlug)
    }
  }

  // Image upload handler (B2)
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setImageLoading(true)
    setError(null)
    setSuccess(null)

    const formData = new FormData()
    formData.append('file', file)
    if (initialData?.id) {
      formData.append('postId', initialData.id)
    }

    try {
      const res = await uploadPostImage(formData)
      if (res.url) {
        setFeaturedImage(res.url)
        setSuccess('Obrázok bol úspešne nahraný na Backblaze B2.')
      } else {
        setError(res.error || 'Nahrávanie obrázka zlyhalo')
      }
    } catch (err: any) {
      setError(err.message || 'Chyba pri nahrávaní obrázka')
    } finally {
      setImageLoading(false)
    }
  }

  // Generate ElevenLabs TTS
  const handleGenerateTTS = async () => {
    if (!initialData?.id) return

    setTtsLoading(true)
    setError(null)
    setSuccess(null)
    setTtsSuccess(false)

    try {
      const res = await generateElevenLabsTTS(initialData.id)
      if (res.success && res.audioUrl) {
        setAudioUrl(res.audioUrl)
        setTtsSuccess(true)
        setSuccess('Hlasová nahrávka bola úspešne vygenerovaná prostredníctvom ElevenLabs (Sam v3) a uložená na B2!')
        setTimeout(() => setTtsSuccess(false), 5000)
        router.refresh()
      } else {
        setError(res.error || 'Generovanie audiostopy zlyhalo.')
      }
    } catch (err: any) {
      setError(err.message || 'Nastala chyba pri generovaní reči.')
    } finally {
      setTtsLoading(false)
    }
  }

  // Google Gemini AI Generation handler
  const handleGenerateAiContent = async () => {
    if (!aiPrompt.trim()) {
      setError('Zadajte tému alebo pokyn pre AI asistenta.')
      return
    }

    setAiLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const res = await generateAiContent(aiPrompt, content, aiMode)
      if (res.success && res.content) {
        setContent(res.content)
        setSuccess(
          aiMode === 'generate'
            ? 'Článok bol úspešne vygenerovaný pomocou Google Gemini!'
            : 'Článok bol úspešne vylepšený a prepracovaný pomocou Google Gemini!'
        )
        setAiPrompt('')
      } else {
        setError(res.error || 'Generovanie obsahu zlyhalo.')
      }
    } catch (err: any) {
      setError(err.message || 'Nastala chyba pri generovaní obsahu cez AI.')
    } finally {
      setAiLoading(false)
    }
  }

  // Google Gemini AI Excerpt handler
  const handleGenerateAiExcerpt = async () => {
    if (!content || !content.replace(/<[^>]*>/g, '').trim()) {
      setError('Pred vygenerovaním zhrnutia musíte najprv napísať alebo vygenerovať obsah článku.')
      return
    }

    setExcerptLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const res = await generateAiExcerpt(content)
      if (res.success && res.excerpt) {
        setExcerpt(res.excerpt)
        setSuccess('Stručný úryvok článku bol úspešne vygenerovaný pomocou AI!')
      } else {
        setError(res.error || 'Generovanie úryvku zlyhalo.')
      }
    } catch (err: any) {
      setError(err.message || 'Nastala chyba pri generovaní zhrnutia cez AI.')
    } finally {
      setExcerptLoading(false)
    }
  }

  // Google Gemini AI Grammar Check handler
  const handleCheckGrammar = async () => {
    if (!content || !content.replace(/<[^>]*>/g, '').trim()) {
      setError('Pred spustením kontroly gramatiky musíte najprv napísať nejaký text.')
      return
    }

    setGrammarChecking(true)
    setError(null)
    setSuccess(null)

    try {
      const res = await checkGrammar(content)
      if (res.success && res.correctedText) {
        setContent(res.correctedText)
        setSuccess(`Gramatika úspešne skontrolovaná a opravená! Vykonané zmeny: ${res.changesMade}`)
      } else {
        setError(res.error || 'Kontrola gramatiky zlyhalo.')
      }
    } catch (err: any) {
      setError(err.message || 'Nastala chyba pri kontrole gramatiky cez AI.')
    } finally {
      setGrammarChecking(false)
    }
  }

  // Google Imagen AI Image Generation handler
  const handleGenerateAiImage = async () => {
    if (!imagePrompt.trim()) {
      setError('Zadajte popis obrázka (prompt) pre generovanie.')
      return
    }

    setImageGenerating(true)
    setError(null)
    setSuccess(null)

    try {
      const res = await generateAiImage(imagePrompt, initialData?.id)
      if (res.success && res.url) {
        setFeaturedImage(res.url)
        setSuccess('Titulný obrázok bol úspešne vygenerovaný pomocou Google Imagen 3 a uložený na B2!')
        setShowImagePromptField(false)
        setImagePrompt('')
      } else {
        setError(res.error || 'Generovanie obrázka zlyhalo.')
      }
    } catch (err: any) {
      setError(err.message || 'Nastala chyba pri generovaní obrázka cez AI.')
    } finally {
      setImageGenerating(false)
    }
  }

  // Save Post Handler
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) {
      setError('Názov článku je povinný.')
      return
    }
    if (!content.trim()) {
      setError('Obsah článku je povinný.')
      return
    }

    startTransition(async () => {
      setError(null)
      setSuccess(null)

      const payload: PostData = {
        id: initialData?.id,
        title,
        slug,
        excerpt,
        content,
        featured_image: featuredImage,
        audio_url: audioUrl || null,
        status,
        published_at: initialData?.published_at,
        pinned,
        pin_order: pinned ? (parseInt(pinOrder, 10) || 0) : 0
      }

      const res = await createOrUpdatePost(payload)
      if (res.success && res.post) {
        setSuccess('Článok bol úspešne uložený.')
        if (!initialData?.id) {
          // New post redirect to edit mode to allow ElevenLabs generation
          router.push(`/admin/aktuality/${res.post.id}`)
        } else {
          router.refresh()
        }
      } else {
        setError(res.error || 'Nepodarilo sa uložiť článok.')
      }
    })
  }

  return (
    <form onSubmit={handleSave} className="space-y-6">
      {/* Alert banners */}
      {error && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-100 text-red-800 text-sm font-bold flex items-start gap-2 shadow-sm animate-in fade-in duration-300">
          <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <div>{error}</div>
        </div>
      )}

      {success && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-800 text-sm font-bold flex items-start gap-2 shadow-sm animate-in fade-in duration-300">
          <Sparkles className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
          <div>{success}</div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Editor Card */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm space-y-6">
            {/* Title */}
            <div className="space-y-2">
              <label className="text-xs font-black text-gray-400 uppercase tracking-widest pl-1">Nadpis</label>
              <input
                type="text"
                value={title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="Zadajte názov článku..."
                className="w-full text-xl font-extrabold text-gray-900 bg-gray-50 border border-gray-200 focus:border-blue-500/50 focus:bg-white focus:ring-4 focus:ring-blue-500/10 rounded-2xl px-5 py-4 focus:outline-none transition-all"
              />
            </div>

            {/* Rich Text Editor */}
            <SimpleRichTextEditor
              label="Obsah príspevku"
              value={content}
              onChange={setContent}
              postId={initialData?.id}
              minHeight="350px"
            />
          </div>
        </div>

        {/* Sidebar Settings Card */}
        <div className="space-y-6">
          {/* Action Save Card */}
          <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm space-y-4">
            <h3 className="font-extrabold text-sm text-gray-900 pl-1 uppercase tracking-wider">Publikovanie</h3>
            
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400">Stav článku</label>
              <select
                value={status}
                onChange={(e: any) => setStatus(e.target.value)}
                className="w-full text-sm font-bold text-gray-800 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                <option value="draft">Koncept (Draft)</option>
                <option value="published">Zverejnené (Live)</option>
                <option value="archived">Archivované (Archived)</option>
              </select>
            </div>

            {/* Pripnutie článku */}
            <div className="space-y-2">
              <label className="flex items-center gap-3 cursor-pointer p-3 bg-gray-50 border border-gray-200 rounded-xl hover:border-blue-300 transition-all">
                <input
                  type="checkbox"
                  checked={pinned}
                  onChange={(e) => setPinned(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500/20"
                />
                <div>
                  <p className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                    <Pin size={14} className="text-blue-600" /> Pripnúť článok
                  </p>
                  <p className="text-[10px] text-gray-400">
                    Pripnuté články sa zobrazujú pred ostatnými bez ohľadu na dátum
                  </p>
                </div>
              </label>
              {pinned && (
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400">
                    Poradie pripnutia (nižšie číslo = vyššie)
                  </label>
                  <input
                    type="number"
                    value={pinOrder}
                    onChange={(e) => setPinOrder(e.target.value)}
                    className="w-full text-sm font-bold text-gray-800 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}
            </div>

            {/* Slug URL */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-gray-400">URL Adresa (Slug)</label>
                <button
                  type="button"
                  onClick={() => setIsCustomSlug(true)}
                  className="text-[10px] text-blue-600 font-extrabold cursor-pointer"
                >
                  Upraviť ručne
                </button>
              </div>
              <div className="relative">
                <LinkIcon size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  disabled={!isCustomSlug}
                  placeholder="automaticky-generovany-slug"
                  className="w-full text-xs font-bold text-gray-700 bg-gray-50 disabled:bg-gray-100/50 border border-gray-200 rounded-xl pl-9 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="w-full px-5 py-3.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 text-white rounded-xl text-sm font-black shadow-lg shadow-blue-500/10 cursor-pointer flex items-center justify-center gap-2 mt-4"
            >
              {isPending ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Save size={16} />
              )}
              Uložiť článok
            </button>
          </div>

          {/* Gemini AI Asistent Card */}
          <div className="bg-gradient-to-br from-violet-50 to-indigo-50 border border-violet-100/70 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="space-y-1 pl-1">
              <h3 className="font-extrabold text-sm text-indigo-950 uppercase tracking-wider flex items-center gap-2">
                <Sparkles className="text-violet-600 w-5 h-5 animate-pulse" />
                Gemini AI Asistent
              </h3>
              <p className="text-[10px] text-indigo-700/80 font-bold">Inteligentné písanie a úprava článkov.</p>
            </div>

            {/* AI Mode Toggle */}
            <div className="flex gap-2 p-1 bg-violet-100/50 border border-violet-100/80 rounded-xl">
              <button
                type="button"
                onClick={() => setAiMode('generate')}
                className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                  aiMode === 'generate'
                    ? 'bg-white shadow-sm text-violet-700 border border-violet-100'
                    : 'text-violet-600 hover:text-violet-800'
                }`}
              >
                ✍️ Nový článok
              </button>
              <button
                type="button"
                onClick={() => setAiMode('refine')}
                className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                  aiMode === 'refine'
                    ? 'bg-white shadow-sm text-violet-700 border border-violet-100'
                    : 'text-violet-600 hover:text-violet-800'
                }`}
              >
                🔧 Vylepšiť text
              </button>
            </div>

            <div className="space-y-2">
              <textarea
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder={
                  aiMode === 'generate'
                    ? 'Zadajte tému alebo osnovu príspevku (napr. "Význam milodarov v našej farnosti")...'
                    : 'Zadajte pokyn pre úpravu (napr. "Rozšír text o jeden odsek a zmeň tón na inšpiratívnejší")...'
                }
                rows={3}
                className="w-full text-xs font-medium text-gray-800 bg-white/70 border border-violet-200 focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 rounded-xl px-4 py-3 focus:outline-none transition-all resize-none"
              />
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleGenerateAiContent}
                disabled={aiLoading || !aiPrompt.trim()}
                className="flex-1 px-3 py-3 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 disabled:opacity-50 text-white font-black rounded-xl text-[10px] uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-violet-500/10"
              >
                {aiLoading ? (
                  <Loader2 size={12} className="animate-spin text-white" />
                ) : (
                  <Sparkles size={12} />
                )}
                {aiLoading
                  ? 'Píšem...'
                  : aiMode === 'generate'
                  ? 'Koncept'
                  : 'Upraviť'}
              </button>

              <button
                type="button"
                onClick={handleCheckGrammar}
                disabled={grammarChecking || !content || !content.replace(/<[^>]*>/g, '').trim()}
                className="flex-1 px-3 py-3 bg-white hover:bg-violet-50/50 disabled:opacity-50 text-violet-700 border border-violet-200 hover:border-violet-300 font-black rounded-xl text-[10px] uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer shadow-sm transition-all"
                title="Skontrolovať slovenskú gramatiku a opraviť chyby cez Google Gemini"
              >
                {grammarChecking ? (
                  <Loader2 size={12} className="animate-spin text-violet-600" />
                ) : (
                  <Wrench size={12} />
                )}
                Gramatika
              </button>
            </div>
          </div>

          {/* ElevenLabs TTS Widget Card */}
          <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="space-y-1 pl-1">
              <h3 className="font-extrabold text-sm text-gray-900 uppercase tracking-wider flex items-center gap-2">
                <Volume2 className="text-blue-500 w-5 h-5 animate-pulse" />
                Predčítanie textu
              </h3>
              <p className="text-[10px] text-gray-400 font-bold">Profesionálna reč od ElevenLabs.</p>
            </div>

            {!initialData?.id ? (
              <div className="p-4 rounded-2xl bg-amber-50/50 border border-amber-100 text-amber-800 text-xs font-bold select-none leading-relaxed">
                ⚠️ Pred vygenerovaním hlasovej nahrávky musíte článok najskôr uložiť a vytvoriť.
              </div>
            ) : (
              <div className="space-y-4">
                <button
                  type="button"
                  onClick={handleGenerateTTS}
                  disabled={ttsLoading}
                  className="w-full px-4 py-3 bg-gradient-to-r from-indigo-50 to-blue-50 hover:from-indigo-100 hover:to-blue-100 disabled:opacity-50 text-indigo-700 border border-indigo-100 font-black rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                >
                  {ttsLoading ? (
                    <Loader2 size={14} className="animate-spin text-indigo-600" />
                  ) : (
                    <Volume2 size={14} />
                  )}
                  {ttsLoading ? 'Generujem slovenský hlas...' : 'Vygenerovať nahrávku (ElevenLabs)'}
                </button>

                {audioUrl && (
                  <div className="space-y-2 p-4 bg-slate-50 border border-slate-100 rounded-2xl shadow-sm">
                    <div className="flex justify-between items-center pl-1">
                      <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Nahrávka Sam v3:</span>
                      <button
                        type="button"
                        onClick={() => setAudioUrl('')}
                        className="text-red-500 hover:text-red-700 transition-colors cursor-pointer"
                        title="Zmazať nahrávku"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                    <audio src={audioUrl} controls className="w-full h-8" />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Excerpt Summary Card */}
          <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm space-y-3">
            <div className="flex justify-between items-center pl-1">
              <h3 className="font-extrabold text-sm text-gray-900 uppercase tracking-wider">Krátky úryvok</h3>
              <button
                type="button"
                onClick={handleGenerateAiExcerpt}
                disabled={excerptLoading || !content || !content.replace(/<[^>]*>/g, '').trim()}
                className="text-[10px] text-violet-600 hover:text-violet-850 disabled:opacity-40 font-extrabold flex items-center gap-1 cursor-pointer transition-colors"
                title="Generovať stručný úryvok z obsahu článku s Google Gemini"
              >
                {excerptLoading ? (
                  <Loader2 size={10} className="animate-spin text-violet-600" />
                ) : (
                  <Sparkles size={10} />
                )}
                Auto-Zhrnutie
              </button>
            </div>
            <textarea
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              placeholder="Krátky zhrňujúci úryvok článku pre zoznamy správ..."
              rows={4}
              className="w-full text-xs font-medium text-gray-800 bg-gray-50 border border-gray-200 focus:border-blue-500/50 focus:bg-white focus:ring-4 focus:ring-blue-500/10 rounded-xl px-4 py-3 focus:outline-none transition-all resize-none"
            />
          </div>

          {/* Media Featured Image Card */}
          <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex justify-between items-center pl-1">
              <h3 className="font-extrabold text-sm text-gray-900 uppercase tracking-wider">Titulný obrázok</h3>
              {!featuredImage && (
                <button
                  type="button"
                  onClick={() => setShowImagePromptField(!showImagePromptField)}
                  className={`text-[10px] font-extrabold flex items-center gap-1 cursor-pointer transition-colors ${
                    showImagePromptField ? 'text-red-500 hover:text-red-700' : 'text-violet-600 hover:text-violet-850'
                  }`}
                  title="Generovať jedinečný ilustračný obrázok cez Google Imagen 3"
                >
                  <Sparkles size={10} />
                  {showImagePromptField ? 'Zrušiť AI' : 'Generovať s AI'}
                </button>
              )}
            </div>
            
            {showImagePromptField && !featuredImage && (
              <div className="p-4 rounded-2xl bg-violet-50/50 border border-violet-100 space-y-3 animate-in fade-in duration-200">
                <label className="text-[10px] font-black text-violet-850 uppercase tracking-widest pl-1 block">Popis obrázka (Slovensky alebo Anglicky)</label>
                <textarea
                  value={imagePrompt}
                  onChange={(e) => setImagePrompt(e.target.value)}
                  placeholder="Napr.: Krásny západ slnka nad historickým kostolom v diecéze, fotorealistické, teplé svetlo, 8k..."
                  rows={3}
                  className="w-full text-xs font-medium text-gray-800 bg-white border border-violet-200 focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 rounded-xl px-3 py-2.5 focus:outline-none transition-all resize-none"
                />
                <button
                  type="button"
                  onClick={handleGenerateAiImage}
                  disabled={imageGenerating || !imagePrompt.trim()}
                  className="w-full px-4 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 disabled:opacity-50 text-white font-black rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                >
                  {imageGenerating ? (
                    <Loader2 size={12} className="animate-spin text-white" />
                  ) : (
                    <Sparkles size={12} />
                  )}
                  {imageGenerating ? 'Generujem obrázok...' : 'Vygenerovať (Google Imagen 3)'}
                </button>
              </div>
            )}

            {featuredImage ? (
              <div className="relative rounded-2xl overflow-hidden border border-gray-200 group aspect-video">
                <img src={featuredImage} alt="Preview" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <button
                    type="button"
                    onClick={() => setFeaturedImage('')}
                    className="p-3 bg-red-600 rounded-full text-white hover:bg-red-700 transition-colors shadow-lg cursor-pointer"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ) : (
              !showImagePromptField && (
                <div className="relative border-2 border-dashed border-gray-200 hover:border-blue-500/50 rounded-2xl aspect-video flex flex-col items-center justify-center gap-2 bg-gray-50/50 hover:bg-blue-50/10 transition-all cursor-pointer">
                  {imageLoading ? (
                    <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                  ) : (
                    <ImageIcon className="w-8 h-8 text-gray-300" />
                  )}
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">
                    {imageLoading ? 'Nahrávam obrázok...' : 'Kliknutím nahrajte B2 obrázok'}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={imageLoading}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                </div>
              )
            )}
          </div>
        </div>
      </div>
    </form>
  )
}
