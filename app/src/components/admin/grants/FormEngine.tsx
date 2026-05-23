'use client'

import { useState, useEffect } from 'react'
import { useSupabase } from '@/components/providers/SupabaseProvider'
import SignaturePad from './SignaturePad'
import { UploadCloud, FileText, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react'

// KROK farebná paleta
const KROK = {
  blue: '#003DA5',
  lightBlue: '#0072CE',
  red: '#E4002B',
  yellow: '#FFD100',
  darkBlue: '#002D72',
}

interface FormField {
  id: string
  type: 'section' | 'heading' | 'text' | 'number' | 'email' | 'date' | 'select' | 'textarea' | 'file' | 'signature' | 'checkbox' | 'parish_select' | 'calculated_total'
  label: string
  required?: boolean
  placeholder?: string
  options?: string[]
  width?: 'col-12' | 'col-6' | 'col-4' | 'col-8'
  max?: number
  readonly?: boolean
  formula?: string // napr. "text_14 + text_677666"
  level?: number // pre headings
  rows?: number // pre textarea
  accept?: string // pre file upload
}

interface FormEngineProps {
  fields: FormField[]
  initialData?: Record<string, any>
  onSubmit: (
    data: Record<string, any>,
    files: Record<string, File>,
    signatureBase64: string | null
  ) => Promise<void>
  loading?: boolean
  isReadOnly?: boolean
  submitButtonText?: string
}

export default function FormEngine({
  fields,
  initialData = {},
  onSubmit,
  loading = false,
  isReadOnly = false,
  submitButtonText = 'Odoslať formulár',
}: FormEngineProps) {
  const { supabase } = useSupabase()
  const [formData, setFormData] = useState<Record<string, any>>({})
  const [formFiles, setFormFiles] = useState<Record<string, File>>({})
  const [signature, setSignature] = useState<string | null>(null)
  
  // Parishes pre parish_select
  const [parishes, setParishes] = useState<{ id: string; name: string }[]>([])
  const [parishesLoading, setParishesLoading] = useState(false)

  // Lokálne chyby a validácie
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [spamAnswer, setSpamAnswer] = useState('')
  const [spamQuiz, setSpamQuiz] = useState({ q: '', a: 0 })

  // Inicializácia hodnôt a matematického antispamu
  useEffect(() => {
    // Načítanie počiatočných hodnôt
    const defaults: Record<string, any> = {}
    fields.forEach(field => {
      if (initialData[field.id] !== undefined) {
        defaults[field.id] = initialData[field.id]
      } else {
        defaults[field.id] = field.type === 'checkbox' ? false : ''
      }
    })
    setFormData(defaults)
    
    if (initialData.signature_url) {
      setSignature(initialData.signature_url)
    }

    // Vygenerovanie nového antispamu
    const num1 = Math.floor(Math.random() * 8) + 2 // 2 až 9
    const num2 = Math.floor(Math.random() * 8) + 2
    setSpamQuiz({
      q: `Koľko je ${num1} + ${num2}?`,
      a: num1 + num2
    })
  }, [fields, initialData])

  // Dynamické načítanie farností zo Supabase pre parish_select
  useEffect(() => {
    const hasParishSelect = fields.some(f => f.type === 'parish_select')
    if (!hasParishSelect) return

    async function loadParishes() {
      setParishesLoading(true)
      try {
        const { data, error } = await supabase
          .from('parishes')
          .select('id, name')
          .order('name')
        
        if (!error && data) {
          setParishes(data)
        }
      } catch (err) {
        console.error('Failed to load parishes:', err)
      } finally {
        setParishesLoading(false)
      }
    }
    loadParishes()
  }, [fields, supabase])

  // Dynamická kalkulácia pre calculated_total polia (napr. Suma + Spolufinancovanie = Spolu)
  useEffect(() => {
    const calculatedFields = fields.filter(f => f.type === 'calculated_total')
    if (calculatedFields.length === 0) return

    let updated = false
    const newFormData = { ...formData }

    calculatedFields.forEach(calcField => {
      if (!calcField.formula) return
      
      // Rozdelenie vzorca (napr. "text_14 + text_677666")
      const tokens = calcField.formula.split('+').map(t => t.trim())
      if (tokens.length === 2) {
        const val1 = parseFloat(formData[tokens[0]]) || 0
        const val2 = parseFloat(formData[tokens[1]]) || 0
        const total = val1 + val2

        if (formData[calcField.id] !== total) {
          newFormData[calcField.id] = total
          updated = true
        }
      }
    })

    if (updated) {
      setFormData(newFormData)
    }
  }, [formData, fields])

  const handleInputChange = (fieldId: string, value: any) => {
    if (isReadOnly) return
    setFormData(prev => ({
      ...prev,
      [fieldId]: value
    }))
    
    // Vyčistenie chýb po zmene
    if (errors[fieldId]) {
      setErrors(prev => {
        const copy = { ...prev }
        delete copy[fieldId]
        return copy
      })
    }
  }

  const handleFileChange = (fieldId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    if (isReadOnly) return
    const filesList = e.target.files
    if (filesList && filesList.length > 0) {
      const file = filesList[0]
      setFormFiles(prev => ({
        ...prev,
        [fieldId]: file
      }))

      // Vyčistenie chyby súboru
      if (errors[fieldId]) {
        setErrors(prev => {
          const copy = { ...prev }
          delete copy[fieldId]
          return copy
        })
      }
    }
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    // Overenie povinných polí
    fields.forEach(field => {
      if (field.type === 'section' || field.type === 'heading') return

      const value = formData[field.id]
      const isFieldRequired = field.required

      // Validácia bežných vstupov
      if (isFieldRequired) {
        if (field.type === 'checkbox' && !value) {
          newErrors[field.id] = 'Musíte udeliť súhlas pre pokračovanie.'
        } else if (field.type === 'signature' && !signature) {
          newErrors[field.id] = 'Podpis je povinný.'
        } else if (field.type === 'file' && !formFiles[field.id] && !initialData[field.id]) {
          newErrors[field.id] = 'Priloženie súboru je povinné.'
        } else if (field.type !== 'file' && field.type !== 'signature' && field.type !== 'checkbox' && (!value || String(value).trim() === '')) {
          newErrors[field.id] = 'Tento údaj je povinný.'
        }
      }

      // Validácia emailu
      if (field.type === 'email' && value && !/\S+@\S+\.\S+/.test(value)) {
        newErrors[field.id] = 'Zadajte platnú e-mailovú adresu.'
      }

      // Validácia obmedzenia počtu znakov (napr. max 25 znakov na názov)
      if (field.max && value && String(value).length > field.max) {
        newErrors[field.id] = `Maximálny počet znakov je ${field.max}.`
      }
    })

    // Validácia spam ochrany (len ak nie je read-only)
    if (!isReadOnly) {
      const isAnswerCorrect = parseInt(spamAnswer) === spamQuiz.a
      if (!spamAnswer || !isAnswerCorrect) {
        newErrors['spam'] = 'Nesprávny výsledok. Overenie neprebehlo úspešne.'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmitSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isReadOnly) return

    const isValid = validateForm()
    if (!isValid) {
      // Scrolovať na prvú chybu
      const firstErrorKey = Object.keys(errors)[0]
      const element = document.getElementById(firstErrorKey)
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
      return
    }

    await onSubmit(formData, formFiles, signature)
  }

  return (
    <form onSubmit={handleSubmitSubmit} className="space-y-6">
      <div className="grid grid-cols-12 gap-x-6 gap-y-5">
        {fields.map(field => {
          const fieldError = errors[field.id]
          const isRequired = field.required
          
          // Nastavenie šírky v CSS gridi
          let gridSpan = 'col-span-12'
          if (field.width === 'col-6') gridSpan = 'col-span-12 md:col-span-6'
          if (field.width === 'col-4') gridSpan = 'col-span-12 sm:col-span-4'
          if (field.width === 'col-8') gridSpan = 'col-span-12 sm:col-span-8'

          // 1. Sekcia (Nadpis sekcie)
          if (field.type === 'section') {
            return (
              <div key={field.id} className="col-span-12 pt-6 pb-2 first:pt-0">
                <div className="flex items-center gap-3">
                  <div className="h-6 w-1 rounded-full" style={{ backgroundColor: KROK.red }} />
                  <h2 className="text-md sm:text-lg font-bold text-gray-900 uppercase tracking-wide">
                    {field.label}
                  </h2>
                </div>
                <hr className="mt-2 border-gray-100" />
              </div>
            )
          }

          // 2. Heading (Podnadpis v sekcii)
          if (field.type === 'heading') {
            const Level = field.level === 3 ? 'h3' : 'h4'
            return (
              <div key={field.id} className="col-span-12 pt-2">
                <Level className="text-sm font-semibold text-gray-700 uppercase">
                  {field.label}
                </Level>
              </div>
            )
          }

          // 3. Textové a číselné polia
          return (
            <div key={field.id} id={field.id} className={`${gridSpan} flex flex-col`}>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wider">
                {field.label}
                {isRequired && <span className="text-red-500 ml-1 font-bold">*</span>}
              </label>

              {/* Rôzne typy vstupov */}
              {field.type === 'textarea' ? (
                <textarea
                  value={formData[field.id] || ''}
                  onChange={e => handleInputChange(field.id, e.target.value)}
                  placeholder={field.placeholder}
                  disabled={isReadOnly || field.readonly}
                  rows={field.rows || 5}
                  maxLength={field.max}
                  className={`w-full px-4 py-3 rounded-xl border bg-white/50 backdrop-blur-sm text-sm focus:outline-none focus:ring-2 focus:border-transparent transition-all shadow-sm ${
                    fieldError
                      ? 'border-red-300 focus:ring-red-200'
                      : 'border-gray-200 focus:ring-blue-100'
                  }`}
                  style={{ '--tw-ring-color': KROK.blue } as React.CSSProperties}
                />
              ) : field.type === 'select' ? (
                <select
                  value={formData[field.id] || ''}
                  onChange={e => handleInputChange(field.id, e.target.value)}
                  disabled={isReadOnly || field.readonly}
                  className={`w-full px-4 py-2.5 rounded-xl border bg-white/50 backdrop-blur-sm text-sm focus:outline-none focus:ring-2 focus:border-transparent transition-all shadow-sm ${
                    fieldError
                      ? 'border-red-300 focus:ring-red-200'
                      : 'border-gray-200 focus:ring-blue-100'
                  }`}
                  style={{ '--tw-ring-color': KROK.blue } as React.CSSProperties}
                >
                  <option value="">-- Vyberte možnosť --</option>
                  {field.options?.map((opt, i) => (
                    <option key={i} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              ) : field.type === 'parish_select' ? (
                <select
                  value={formData[field.id] || ''}
                  onChange={e => handleInputChange(field.id, e.target.value)}
                  disabled={isReadOnly || field.readonly || parishesLoading}
                  className={`w-full px-4 py-2.5 rounded-xl border bg-white/50 backdrop-blur-sm text-sm focus:outline-none focus:ring-2 focus:border-transparent transition-all shadow-sm ${
                    fieldError
                      ? 'border-red-300 focus:ring-red-200'
                      : 'border-gray-200 focus:ring-blue-100'
                  }`}
                  style={{ '--tw-ring-color': KROK.blue } as React.CSSProperties}
                >
                  <option value="">
                    {parishesLoading ? 'Načítavam farnosti...' : '-- Vyberte farnosť --'}
                  </option>
                  {parishes.map(parish => (
                    <option key={parish.id} value={parish.name}>
                      {parish.name}
                    </option>
                  ))}
                </select>
              ) : field.type === 'file' ? (
                <div className="w-full">
                  {!isReadOnly ? (
                    <div className={`relative border-2 border-dashed rounded-xl p-4 text-center cursor-pointer hover:bg-white/40 transition-all ${
                      fieldError ? 'border-red-300 bg-red-50/20' : 'border-gray-300 bg-white/20'
                    }`}>
                      <input
                        type="file"
                        onChange={e => handleFileChange(field.id, e)}
                        accept={field.accept}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                      <UploadCloud size={24} className="mx-auto text-gray-400 mb-2" />
                      <p className="text-xs font-semibold text-gray-600">
                        {formFiles[field.id] ? 'Zmeniť vybraný súbor' : 'Kliknite alebo presuňte súbor sem'}
                      </p>
                      <p className="text-[10px] text-gray-400 mt-1">
                        Podporované formáty: {field.accept || 'Všetky'}
                      </p>
                    </div>
                  ) : null}

                  {/* Zobrazenie vybraného alebo nahraného súboru */}
                  {(formFiles[field.id] || initialData[field.id]) && (
                    <div className="flex items-center gap-2 mt-2 p-2 bg-white/50 border border-gray-100 rounded-lg text-xs">
                      <FileText size={14} className="text-blue-500" />
                      <span className="font-medium text-gray-700 truncate flex-1">
                        {formFiles[field.id] ? formFiles[field.id].name : 'Nahraný súbor prílohy'}
                      </span>
                      {initialData[field.id] && (
                        <a
                          href={initialData[field.id]}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2 py-0.5 rounded bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors font-medium"
                        >
                          Zobraziť
                        </a>
                      )}
                    </div>
                  )}
                </div>
              ) : field.type === 'signature' ? (
                <div className="w-full">
                  {isReadOnly ? (
                    signature ? (
                      <div className="p-4 bg-white rounded-2xl border border-gray-150 shadow-inner flex items-center justify-center">
                        <img src={signature} alt="Podpis" className="max-h-[140px] object-contain" />
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400 italic">Nepodpísané</p>
                    )
                  ) : (
                    <SignaturePad
                      onChange={setSignature}
                      value={signature || undefined}
                      required={isRequired}
                    />
                  )}
                </div>
              ) : field.type === 'checkbox' ? (
                <div className="flex items-start gap-2.5 pt-1">
                  <input
                    type="checkbox"
                    checked={!!formData[field.id]}
                    onChange={e => handleInputChange(field.id, e.target.checked)}
                    disabled={isReadOnly}
                    className="mt-0.5 rounded border-gray-300 text-blue-600 focus:ring-blue-100 cursor-pointer"
                  />
                  <span className="text-xs text-gray-500 font-medium leading-relaxed">
                    {field.label}
                  </span>
                </div>
              ) : (
                <input
                  type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
                  value={formData[field.id] || ''}
                  onChange={e => handleInputChange(field.id, e.target.value)}
                  placeholder={field.placeholder}
                  disabled={isReadOnly || field.readonly}
                  maxLength={field.max}
                  className={`w-full px-4 py-2.5 rounded-xl border bg-white/50 backdrop-blur-sm text-sm focus:outline-none focus:ring-2 focus:border-transparent transition-all shadow-sm ${
                    fieldError
                      ? 'border-red-300 focus:ring-red-200'
                      : 'border-gray-200 focus:ring-blue-100'
                  }`}
                  style={{ '--tw-ring-color': KROK.blue } as React.CSSProperties}
                />
              )}

              {/* Informácie pod poľom alebo chyby */}
              {fieldError ? (
                <span className="text-[10px] text-red-500 font-semibold mt-1 flex items-center gap-1">
                  <AlertTriangle size={10} />
                  {fieldError}
                </span>
              ) : field.placeholder && field.type !== 'checkbox' && field.type !== 'file' ? (
                <span className="text-[10px] text-gray-400 mt-1">{field.placeholder}</span>
              ) : null}
            </div>
          )
        })}

        {/* Spam ochrana pre verejné doručenie */}
        {!isReadOnly && (
          <div className="col-span-12 pt-4 border-t border-gray-100">
            <div className="bg-blue-50/30 border border-blue-100/50 rounded-2xl p-4 max-w-sm flex items-center gap-3">
              <ShieldCheck size={24} className="text-blue-600 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <label className="block text-xs font-semibold text-gray-700 mb-1 uppercase">
                  Antispam Overenie (Človek)
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-blue-900 whitespace-nowrap">{spamQuiz.q}</span>
                  <input
                    type="number"
                    value={spamAnswer}
                    onChange={e => {
                      setSpamAnswer(e.target.value)
                      if (errors['spam']) {
                        setErrors(prev => {
                          const copy = { ...prev }
                          delete copy['spam']
                          return copy
                        })
                      }
                    }}
                    className={`w-16 px-2 py-1 rounded bg-white text-xs border focus:outline-none focus:ring-2 focus:border-transparent ${
                      errors['spam'] ? 'border-red-300' : 'border-gray-200'
                    }`}
                    placeholder="?"
                    required
                  />
                </div>
                {errors['spam'] && (
                  <span className="text-[9px] text-red-500 font-semibold mt-1 block">
                    {errors['spam']}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Submit tlačidlo */}
        {!isReadOnly && (
          <div className="col-span-12 pt-6">
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 rounded-xl text-white font-bold text-sm shadow-md transition-all duration-200 hover:shadow-lg disabled:opacity-60 flex items-center gap-2 cursor-pointer"
              style={{ backgroundColor: KROK.blue }}
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Odosielam...
                </>
              ) : (
                <>
                  <CheckCircle2 size={16} />
                  {submitButtonText}
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </form>
  )
}
