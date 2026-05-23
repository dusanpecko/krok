'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { getFormBySlug, getSubmissionById, submitFormResponse } from '@/app/admin/granty/actions'
import FormEngine from '@/components/admin/grants/FormEngine'
import { Loader2, ArrowLeft, CheckCircle2, ChevronRight, Mail, Phone, ExternalLink } from 'lucide-react'
import Link from 'next/link'

const KROK = {
  blue: '#003DA5',
  lightBlue: '#0072CE',
  red: '#E4002B',
  yellow: '#FFD100',
  darkBlue: '#002D72',
}

// Pomocná funkcia na premenu File na base64 (pre Server Actions prenos)
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1]
      resolve(base64)
    }
    reader.onerror = error => reject(error)
  })
}

export default function DynamickyFormularPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const slug = params?.slug as string

  const submissionId = searchParams.get('id')
  const isReadOnly = searchParams.get('readOnly') === 'true'

  const [formSchema, setFormSchema] = useState<any>(null)
  const [submission, setSubmission] = useState<any>(null)
  const [loadingSchema, setLoadingSchema] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Načítanie šablóny formulára a prípadnej existujúcej odpovede (ak editujeme draft)
  useEffect(() => {
    if (!slug) return

    async function loadData() {
      setLoadingSchema(true)
      try {
        const schema = await getFormBySlug(slug)
        if (!schema) {
          setError('Tento formulár alebo grantová výzva neexistuje.')
          setLoadingSchema(false)
          return
        }
        setFormSchema(schema)

        if (submissionId) {
          const sub = await getSubmissionById(submissionId)
          if (sub) {
            setSubmission(sub)
          }
        }
      } catch (err) {
        console.error('Failed to load form schema:', err)
        setError('Zlyhalo načítanie grantovej výzvy.')
      } finally {
        setLoadingSchema(false)
      }
    }

    loadData()
  }, [slug, submissionId])

  const handleFormSubmission = async (
    formData: Record<string, any>,
    formFiles: Record<string, File>,
    signatureBase64: string | null,
    isDraftSubmit: boolean
  ) => {
    setSubmitting(true)
    setError(null)

    try {
      // 1. Previesť všetky vybrané súbory na base64 pre sieťový prenos
      const base64Files: Record<string, { base64: string; name: string; type: string }> = {}
      for (const [fieldId, file] of Object.entries(formFiles)) {
        const base64 = await fileToBase64(file)
        base64Files[fieldId] = {
          base64,
          name: file.name,
          type: file.type
        }
      }

      // 2. Zavolať serverovú akciu
      const res = await submitFormResponse({
        formId: formSchema.id,
        submissionId: submissionId || undefined,
        data: formData,
        files: base64Files,
        signatureBase64: signatureBase64,
        isDraft: isDraftSubmit
      })

      if (res.success) {
        setSuccess(true)
        // Po 3 sekundách presmerovať na dashboard
        setTimeout(() => {
          router.push('/granty/dashboard')
        }, 3500)
      } else {
        setError(res.error || 'Nepodarilo sa odoslať formulár. Skúste to znova.')
      }
    } catch (err: any) {
      console.error('Submission failed:', err)
      setError(err?.message || 'Nastala chyba počas odosielania. Skontrolujte prílohy a pripojenie.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loadingSchema) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-500 text-sm font-medium">Načítavam formulár...</p>
        </div>
      </div>
    )
  }

  if (error && !formSchema) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center max-w-md border border-gray-100">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Formulár nenájdený</h2>
          <p className="text-gray-500 text-sm mb-6">{error}</p>
          <Link href="/granty/dashboard" className="px-6 py-2.5 rounded-xl text-white font-medium text-sm transition-all" style={{ backgroundColor: KROK.blue }}>
            Späť na dashboard
          </Link>
        </div>
      </div>
    )
  }

  // PRÍPAD: Úspešné odoslanie žiadosti/správy
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-6">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-gray-100 p-8 text-center">
          <div className="w-16 h-16 mx-auto bg-green-50 rounded-full flex items-center justify-center mb-6">
            <CheckCircle2 size={32} className="text-green-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Formulár bol uložený!</h2>
          <p className="text-gray-500 text-sm mb-6 leading-relaxed">
            Vaša odpoveď bola úspešne zaregistrovaná. Všetky súbory a podpisy boli bezpečne uložené na Backblaze B2 úložisko.
            O malú chvíľu vás presmerujeme späť do vášho klientskeho panelu.
          </p>
          <div className="w-8 h-8 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50/50 py-8 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto">
        {/* Back Link */}
        <Link
          href="/granty/dashboard"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-800 transition-colors mb-6"
        >
          <ArrowLeft size={14} />
          Späť na môj dashboard
        </Link>

        {/* Top Header Card */}
        <div className="bg-white rounded-3xl border border-gray-100 p-6 sm:p-8 shadow-sm mb-6">
          <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900 tracking-tight leading-snug">
            {formSchema.title}
          </h1>
          {formSchema.description && (
            <p className="text-gray-500 text-xs sm:text-sm mt-3 leading-relaxed">
              {formSchema.description}
            </p>
          )}

          {/* Vykreslenie Kontaktov a Časovej osi len ak ide o Žiadosť (ziadost-cesty-obnovy-2025) */}
          {slug === 'ziadost-cesty-obnovy-2025' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6 pt-6 border-t border-gray-100 text-xs text-gray-600">
              {/* Kontaktné info */}
              <div>
                <h4 className="font-bold text-gray-800 uppercase tracking-wider mb-2">Vyhlasovateľ & Kontakt</h4>
                <p className="font-semibold text-gray-900">KROK – Pastoračný fond Žilinskej diecézy</p>
                <p className="text-gray-500 mt-1">Jána Kalinčiaka 1, 010 01 Žilina</p>
                <div className="space-y-1 mt-3">
                  <span className="flex items-center gap-1.5 text-gray-500">
                    <Phone size={12} />
                    +421 903 982 982
                  </span>
                  <span className="flex items-center gap-1.5 text-gray-500">
                    <Mail size={12} />
                    mojkrok@dcza.sk
                  </span>
                  <a href="https://mojkrok.sk" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-blue-600 hover:underline">
                    https://mojkrok.sk
                    <ExternalLink size={10} />
                  </a>
                </div>
              </div>

              {/* Časová os */}
              <div>
                <h4 className="font-bold text-gray-800 uppercase tracking-wider mb-2">Časová Os Výzvy</h4>
                <ul className="space-y-1.5">
                  <li className="flex items-center gap-1.5 text-gray-500">
                    <ChevronRight size={12} className="text-blue-500 flex-shrink-0" />
                    <span>Uzávierka žiadostí: <b>28. február 2025</b></span>
                  </li>
                  <li className="flex items-center gap-1.5 text-gray-500">
                    <ChevronRight size={12} className="text-blue-500 flex-shrink-0" />
                    <span>Zverejnenie výsledkov: <b>15. marec 2025</b></span>
                  </li>
                  <li className="flex items-center gap-1.5 text-gray-500">
                    <ChevronRight size={12} className="text-blue-500 flex-shrink-0" />
                    <span>Realizácia projektov: <b>apríl 2025 - január 2026</b></span>
                  </li>
                  <li className="flex items-center gap-1.5 text-gray-500">
                    <ChevronRight size={12} className="text-blue-500 flex-shrink-0" />
                    <span>Vyúčtovanie a správa: <b>30. marec 2026</b></span>
                  </li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Chyba odoslania */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3">
            <Loader2 className="w-5 h-5 text-red-500 flex-shrink-0" />
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Dynamic Form Sheet */}
        <div className="bg-white rounded-3xl border border-gray-100 p-6 sm:p-8 shadow-sm">
          <FormEngine
            fields={formSchema.fields}
            initialData={submission?.data || {}}
            isReadOnly={isReadOnly}
            loading={submitting}
            submitButtonText={submissionId ? 'Uložiť a odoslať zmeny' : 'Odoslať hotovú žiadosť'}
            onSubmit={async (formData, formFiles, signatureBase64) => {
              // Predvolené uloženie ako Ostré odoslanie (Podaný)
              await handleFormSubmission(formData, formFiles, signatureBase64, false)
            }}
          />

          {/* Doplňujúca možnosť pre Draft / Koncept (Len ak nie je Read-Only) */}
          {!isReadOnly && (
            <div className="mt-4 pt-4 border-t border-gray-100 flex justify-start">
              <button
                type="button"
                disabled={submitting}
                onClick={async () => {
                  // Vynútiť uloženie rozpracovaného konceptu (isDraft = true)
                  // Pre draft zamedzíme plným validáciám ak nie sú polia vyplnené, ale FormEngine má svoje required kontroly.
                  // Získame referenciu na vstupné polia
                  const form = document.querySelector('form')
                  if (form) {
                    // Aby sme mohli uložiť draft bez splnenia všetkých povinných polí, povieme to serveru.
                    // Ale musíme zavolať onSubmit priamo so súčasným stavom.
                    // Vytvoríme vlastnú mini-funkciu pre uloženie draftu
                    const elements = form.querySelectorAll('input, select, textarea')
                    const draftData: Record<string, any> = { ...submission?.data }
                    
                    elements.forEach((el: any) => {
                      if (el.name || el.id) {
                        const id = el.id || el.name
                        if (el.type === 'checkbox') {
                          draftData[id] = el.checked
                        } else if (el.type !== 'file') {
                          draftData[id] = el.value
                        }
                      }
                    })

                    // Získame podpis
                    const hiddenSignature: any = document.getElementById('signature_1')
                    const signatureData = hiddenSignature ? hiddenSignature.toDataURL() : null

                    await handleFormSubmission(draftData, {}, signatureData, true)
                  }
                }}
                className="text-xs font-bold text-gray-500 hover:text-gray-700 transition-colors py-2 px-4 rounded-lg bg-gray-50 border border-gray-200 hover:bg-gray-100 cursor-pointer"
              >
                {submitting ? 'Ukladám...' : 'Rozpracovať (Uložiť ako rozpracovaný koncept / draft)'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
