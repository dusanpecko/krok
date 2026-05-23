'use client'

import { useState, useEffect } from 'react'
import { 
  getAllSubmissions, 
  getActiveForms, 
  getEvaluatorsList, 
  assignEvaluator,
  createNewForm
} from './actions'
import { 
  FolderHeart, 
  FileText, 
  Users, 
  Star, 
  CheckCircle, 
  AlertCircle, 
  Loader2, 
  TrendingUp, 
  Download, 
  ChevronRight,
  Search,
  UserPlus,
  PlusCircle,
  FileHeart,
  Undo
} from 'lucide-react'
import Link from 'next/link'

const KROK = {
  blue: '#003DA5',
  lightBlue: '#0072CE',
  red: '#E4002B',
  yellow: '#FFD100',
  darkBlue: '#002D72',
}

export default function AdminGrantyDashboard() {
  const [activeForms, setActiveForms] = useState<any[]>([])
  const [submissions, setSubmissions] = useState<any[]>([])
  const [evaluators, setEvaluators] = useState<any[]>([])
  
  const [loading, setLoading] = useState(true)
  const [updatingSubId, setUpdatingSubId] = useState<string | null>(null)
  
  // Filtre
  const [search, setSearch] = useState('')
  const [selectedForm, setSelectedForm] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('')
  
  // Vybraná karta / záložka
  const [activeTab, setActiveTab] = useState<'submissions' | 'forms'>('submissions')

  // Stavy pre novú výzvu
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newSlug, setNewSlug] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [newTemplate, setNewTemplate] = useState<'ziadost' | 'zaverecna'>('ziadost')
  const [creatingForm, setCreatingForm] = useState(false)

  // Preddefinované šablóny polí (rovnaké ako v SQL seedingu)
  const TEMPLATE_FIELDS = {
    ziadost: [
      {id: "organizacia_section", type: "section", label: "I. ŽIADATEĽ (Osoba zodpovedná za realizáciu projektu)"},
      {id: "text_1", type: "text", label: "Názov organizácie:", required: true, width: "col-6"},
      {id: "text_3", type: "text", label: "IČO:", required: false, width: "col-6"},
      {id: "text_4", type: "text", label: "Zastúpená:", required: true, width: "col-12"},
      {id: "address_heading", type: "heading", label: "Sídlo organizácie:", level: 3},
      {id: "text_10", type: "text", label: "Ulica:", required: true, width: "col-12"},
      {id: "text_11", type: "text", label: "PSČ:", required: true, width: "col-4"},
      {id: "text_2", type: "text", label: "Mesto:", required: true, width: "col-8"},
      {id: "text_13", type: "text", label: "Telefónne číslo:", required: true, placeholder: "+421", width: "col-6"},
      {id: "email_1", type: "email", label: "E-mail:", required: true, placeholder: "@", width: "col-6"},
      {id: "projekt_section", type: "section", label: "II. REGISTROVANIE PROJEKTU"},
      {id: "text_5", type: "text", label: "Názov projektu (max. 25 znakov):", required: true, max: 25, width: "col-12"},
      {id: "text_6", type: "text", label: "Garant Projektu:", required: true, placeholder: "Meno a priezvisko osoby zodpovednej za realizáciu", width: "col-12"},
      {id: "text_7", type: "text", label: "Číslo bankového účtu organizácie (IBAN):", required: true, width: "col-12"},
      {id: "text_9", type: "text", label: "VS (pridelí správca fondu)", required: false, readonly: true, width: "col-6"},
      {id: "text_8", type: "text", label: "ŠS (pridelí správca fondu)", required: false, readonly: true, width: "col-6"},
      {id: "selectlist_1", type: "parish_select", label: "Farnosť:", required: true, placeholder: "Vyberte farnosť kde bude projekt realizovaný", width: "col-12"},
      {id: "selectlist_2", type: "select", label: "Cieľ projektovej výzvy:", required: true, options: [
        "Nové ohlasovanie neveriacim a tým, čo stratili kresťanskú vieru.",
        "Posilnenie komunitného života.",
        "Prehĺbenie duchovného života.",
        "Solidarita a služba blížnemu.",
        "Milosrdenstvo a odpustenie."
      ], width: "col-12"},
      {id: "selectlist_3", type: "select", label: "Typ žiadateľa:", required: true, options: [
        "Neformálna skupina",
        "Farnosti Žilinskej diecézy",
        "Dekanát Žilinskej diecézy",
        "Rehoľné spoločenstvo pôsobiace v Žilinskej diecéze",
        "Cirkevná škola a školské zariadenie v Žilinskej diecéze",
        "Občianske združenie",
        "Nezisková organizácia",
        "Účelové zariadenie Cirkvi"
      ], width: "col-12"},
      {id: "rozpocet_section", type: "section", label: "III. STANOVENIE VÝŠKY GRANTU A CELKOVÉHO ROZPOČTU"},
      {id: "text_14", type: "number", label: "Suma požadovaná od Pastoračného fondu (€):", required: true, placeholder: "max. 1500 €", width: "col-6"},
      {id: "text_677666", type: "number", label: "Vlastné a iné zdroje (€):", required: true, placeholder: "spolufinancovanie min. 30%", width: "col-6"},
      {id: "text_15", type: "calculated_total", label: "Spolu na projekt (€):", formula: "text_14 + text_677666", readonly: true, width: "col-12"},
      {id: "file_1", type: "file", label: "Priložiť súbor \"Rozpočet projektu\":", required: true, accept: ".gif,.jpg,.png,.pdf,.xlsx,.xls", placeholder: "Vzorec rozpočtu stiahnete na webe", width: "col-12"},
      {id: "detaily_section", type: "section", label: "IV. OBSAHOVÉ NÁLEŽITOSTI PROJEKTU"},
      {id: "text_16", type: "text", label: "4. Cieľová skupina:", required: true, width: "col-12"},
      {id: "text_17", type: "text", label: "5. S kým plánujete spolupracovať:", required: true, width: "col-12"},
      {id: "date_4", type: "date", label: "Predpokladaný začiatok projektu:", required: true, width: "col-6"},
      {id: "date_2", type: "date", label: "Predpokladané ukončenie projektu:", required: true, width: "col-6"},
      {id: "text_20", type: "text", label: "7. Udržateľnosť projektu:", required: true, width: "col-12"},
      {id: "text_21", type: "text", label: "8. Kvalitatívne ukazovatele hodnotenia projektu:", required: true, width: "col-12"},
      {id: "text_19", type: "text", label: "9. Kvantitatívne ukazovatele hodnotenia projektu:", required: true, width: "col-12"},
      {id: "textarea_1", type: "textarea", label: "Opis projektu:", required: true, placeholder: "Snažte sa v opise projektu zdôrazniť jeho jedinečnosť a prínos (max 1800 znakov)...", rows: 10, max: 1800, width: "col-12"},
      {id: "prilohy_section", type: "section", label: "V. PRÍLOHY (DOPLŇUJÚCE DOKUMENTY)"},
      {id: "file_2", type: "file", label: "Priložiť súbor - ilustračná fotografia (min. 350x180 px):", required: false, accept: ".gif,.jpg,.png", width: "col-12"},
      {id: "file_4", type: "file", label: "Štatút organizácie (ak je relevantné):", required: false, accept: ".gif,.jpg,.png,.pdf,.xlsx,.xls,.doc,.docx", width: "col-12"},
      {id: "file_5", type: "file", label: "Pri neformálnej skupine kópia OP:", required: false, accept: ".gif,.jpg,.png,.pdf,.xlsx,.xls,.doc,.docx", width: "col-12"},
      {id: "file_3", type: "file", label: "Pri PO kópia IČO, prípadne zriaďovaciu listinu:", required: false, accept: ".gif,.jpg,.png,.pdf,.xlsx,.xls,.doc,.docx", width: "col-12"},
      {id: "podpis_section", type: "section", label: "VI. POTVRDENIE A DIGITÁLNY PODPIS"},
      {id: "text_18", type: "text", label: "Miesto podpisu (V):", required: true, placeholder: "napr. Žiline", width: "col-6"},
      {id: "date_3", type: "date", "label": "Dňa:", required: true, width: "col-6"},
      {id: "signature_1", type: "signature", label: "Elektronický podpis žiadateľa (nakreslite prstom/myšou):", required: true, width: "col-12"},
      {id: "checkbox_1_0", type: "checkbox", label: "Súhlasím so spracovaním osobných údajov (Zásady ochrany osobných údajov Pastoračného fondu KROK)", required: true, width: "col-12"}
    ],
    zaverecna: [
      {id: "info_section", type: "section", label: "I. ZÁKLADNÉ INFORMÁCIE O PROJEKTE"},
      {id: "text_18", type: "text", label: "Číslo zmluvy:", required: true, width: "col-12"},
      {id: "text_1", type: "text", label: "Názov projektu:", required: true, width: "col-12"},
      {id: "text_2", type: "text", label: "Názov prijímateľa/organizácie:", required: true, width: "col-12"},
      {id: "text_8", type: "text", label: "Zodpovedný garant za projekt:", required: true, width: "col-12"},
      {id: "textarea_1", type: "textarea", label: "Adresa prijímateľa:", required: true, rows: 3, width: "col-12"},
      {id: "text_3", type: "text", label: "IČO (ak je relevantné):", required: false, width: "col-6"},
      {id: "text_4", type: "text", label: "DIČ (ak je relevantné):", required: false, width: "col-6"},
      {id: "text_5", type: "text", label: "IBAN (číslo účtu pre prípadné vrátenie/doplatok):", required: true, width: "col-12"},
      {id: "text_6", type: "text", label: "Telefón / Mobil:", required: true, width: "col-6"},
      {id: "email_1", type: "email", label: "E-mail:", required: true, width: "col-6"},
      {id: "obdobie_heading", type: "heading", label: "Obdobie realizácie projektu:", level: 3},
      {id: "date_1", type: "date", label: "Od:", required: true, width: "col-6"},
      {id: "date_2", type: "date", label: "Do:", required: true, width: "col-6"},
      {id: "vyhodnotenie_section", type: "section", label: "II. VECNÉ VYHODNOTENIE PROJEKTU"},
      {id: "textarea_2", type: "textarea", label: "Stručný priebeh projektu (čo všetko sa podarilo zrealizovať):", required: true, rows: 5, width: "col-12"},
      {id: "textarea_3", type: "textarea", label: "Splnenie stanovených cieľov a udržateľnosť (aký mal projekt duchovný/komunitný prínos):", required: true, rows: 5, width: "col-12"},
      {id: "text_22", type: "text", label: "Reálny celkový počet účastníkov:", required: true, width: "col-6"},
      {id: "text_23", type: "text", label: "Z toho odhadovaný počet mládeže/detí:", required: true, width: "col-6"},
      {id: "financie_section", type: "section", label: "III. FINANČNÉ VYÚČTOVANIE GRANTU"},
      {id: "text_14", type: "number", label: "Celkové reálne náklady na projekt (€):", required: true, width: "col-4"},
      {id: "text_15", type: "number", label: "Výška poskytnutého príspevku z PF (€):", required: true, width: "col-4"},
      {id: "text_16", type: "number", label: "Reálne vyčerpaná suma z príspevku PF (€):", required: true, width: "col-4"},
      {id: "file_1", type: "file", label: "Priložiť vyúčtovaciu tabuľku (zoznam dokladov + faktúry/bločky v jednom PDF/Excel):", required: true, accept: ".pdf,.xlsx,.xls,.zip", width: "col-12"},
      {id: "file_2", type: "file", label: "Fotodokumentácia z realizácie projektu (min. 3 fotografie, zabaliť do ZIP alebo nahrať PDF):", required: true, accept: ".pdf,.zip,.jpg,.png", width: "col-12"},
      {id: "podpis_section", type: "section", label: "IV. POTVRDENIE SPRÁVNOSTI ÚDAJOV"},
      {id: "text_24", type: "text", label: "Miesto podpisu:", required: true, placeholder: "napr. Žiline", width: "col-6"},
      {id: "date_3", type: "date", label: "Dňa:", required: true, width: "col-6"},
      {id: "signature_1", type: "signature", label: "Elektronický podpis zodpovedného garanta:", required: true, width: "col-12"},
      {id: "checkbox_1_0", type: "checkbox", label: "Vyhlasujem, že všetky uvedené údaje sú pravdivé, úplné a zhodujú sa s účtovnou dokumentáciou.", required: true, width: "col-12"}
    ]
  }

  // Odoslanie novej výzvy
  const handleCreateFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTitle.trim() || !newSlug.trim()) {
      alert('Zadajte prosím názov a slug.')
      return
    }

    setCreatingForm(true)
    try {
      const fieldsToSave = TEMPLATE_FIELDS[newTemplate]
      const res = await createNewForm({
        title: newTitle,
        slug: newSlug,
        description: newDesc,
        fields: fieldsToSave
      })

      if (res.success) {
        alert('Nová grantová výzva bola úspešne spustená na webe!')
        setShowCreateForm(false)
        setNewTitle('')
        setNewSlug('')
        setNewDesc('')
        
        // Obnoviť zoznam
        const forms = await getActiveForms()
        setActiveForms(forms)
      } else {
        alert(res.error || 'Nepodarilo sa vytvoriť výzvu.')
      }
    } catch (err) {
      alert('Nastala chyba pri odosielaní.')
    } finally {
      setCreatingForm(false)
    }
  }

  // Načítanie údajov
  const loadData = async () => {
    setLoading(true)
    try {
      const forms = await getActiveForms()
      setActiveForms(forms)

      const subs = await getAllSubmissions()
      setSubmissions(subs)

      const evs = await getEvaluatorsList()
      setEvaluators(evs)
    } catch (err) {
      console.error('Failed to load admin grant data:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Priradenie kontrolóra
  const handleAssignEvaluator = async (submissionId: string, evaluatorId: string) => {
    setUpdatingSubId(submissionId)
    try {
      const targetId = evaluatorId === '' ? null : evaluatorId
      const res = await assignEvaluator(submissionId, targetId)
      if (res.success) {
        // Obnoviť lokálne prihlášky
        const subs = await getAllSubmissions()
        setSubmissions(subs)
      } else {
        alert(res.error || 'Zlyhalo priradenie hodnotiteľa.')
      }
    } catch (err) {
      alert('Chyba pripojenia.')
    } finally {
      setUpdatingSubId(null)
    }
  }

  // Preklad stavov a farieb
  const getStatusDetails = (status: string) => {
    switch (status) {
      case 'draft':
        return { label: 'Rozpracovaný', color: 'bg-gray-100 text-gray-700 border-gray-200' }
      case 'submitted':
        return { label: 'Podaný / Odoslaný', color: 'bg-blue-50 text-blue-700 border-blue-200' }
      case 'returned_for_changes':
        return { label: 'Na doplnenie', color: 'bg-amber-50 text-amber-700 border-amber-200' }
      case 'accepted_for_evaluation':
        return { label: 'Posudzovaný', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' }
      case 'evaluated':
        return { label: 'Hodnotený', color: 'bg-purple-50 text-purple-700 border-purple-200' }
      case 'approved':
        return { label: 'Schválený', color: 'bg-green-50 text-green-700 border-green-200' }
      case 'rejected':
        return { label: 'Neschválený', color: 'bg-red-50 text-red-700 border-red-200' }
      default:
        return { label: status, color: 'bg-gray-100 text-gray-700 border-gray-200' }
    }
  }

  // Filtrovanie prihlášok
  const filteredSubmissions = submissions.filter(sub => {
    const projectName = (sub.data.text_5 || sub.data.text_1 || '').toLowerCase()
    const orgName = (sub.data.text_1 || sub.data.text_2 || '').toLowerCase()
    const matchesSearch = projectName.includes(search.toLowerCase()) || orgName.includes(search.toLowerCase())
    const matchesForm = selectedForm === '' || sub.form_id === selectedForm
    const matchesStatus = selectedStatus === '' || sub.status === selectedStatus
    return matchesSearch && matchesForm && matchesStatus
  })

  // Štatistiky prihlášok
  const stats = {
    total: submissions.length,
    submitted: submissions.filter(s => s.status === 'submitted').length,
    evaluating: submissions.filter(s => s.status === 'accepted_for_evaluation' || s.status === 'evaluated').length,
    approved: submissions.filter(s => s.status === 'approved').length,
    approvedSum: submissions.filter(s => s.status === 'approved').reduce((sum, s) => sum + (parseFloat(s.approved_amount) || 0), 0)
  }

  // Export do CSV
  const handleExportCSV = () => {
    if (filteredSubmissions.length === 0) return

    // Hlavičky stĺpcov
    const headers = [
      'ID Prihlášky',
      'Typ Výzvy',
      'Názov Projektu',
      'Žiadateľ (Organizácia)',
      'Garant Projektu',
      'Farnosť',
      'Suma Požadovaná (€)',
      'Suma Vlastná (€)',
      'Spolu Celkom (€)',
      'Stav',
      'Bodové Hodnotenie (1-10)',
      'Schválená Suma (€)',
      'Variabilný Symbol',
      'Špecifický Symbol',
      'Dátum Podania'
    ]

    // Dáta riadkov
    const rows = filteredSubmissions.map(sub => {
      const data = sub.data
      return [
        sub.id,
        sub.forms?.title || '',
        data.text_5 || data.text_1 || 'Nezadané',
        data.text_1 || data.text_2 || 'Nezadané',
        data.text_6 || data.text_8 || 'Nezadané',
        data.selectlist_1 || '',
        data.text_14 || 0,
        data.text_677666 || 0,
        (parseFloat(data.text_14) || 0) + (parseFloat(data.text_677666) || 0),
        sub.status,
        sub.evaluation_rating || 'Nehodnotené',
        sub.approved_amount || 0,
        sub.variable_symbol || '',
        sub.specific_symbol || '',
        new Date(sub.created_at).toLocaleDateString('sk-SK')
      ]
    })

    // Spojenie do CSV
    const csvContent = [
      headers.join(';'),
      ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(';'))
    ].join('\n')

    // Stiahnutie súboru
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `granty_export_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-500 text-sm font-medium">Načítavam správu grantov...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Top Title */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            Centrum Správy Grantov a Výziev
          </h1>
          <p className="text-xs text-gray-400 mt-1 uppercase tracking-widest font-semibold">
            Pastoračný fond Žilinskej diecézy – KROK
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          disabled={filteredSubmissions.length === 0}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-white font-bold text-xs shadow-sm hover:shadow-md transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ backgroundColor: KROK.blue }}
        >
          <Download size={14} />
          Exportovať filtre do CSV
        </button>
      </div>

      {/* Premium Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Stat 1: Total */}
        <div className="bg-white rounded-2xl border border-gray-150 p-5 shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
            <FolderHeart size={20} />
          </div>
          <div>
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Celkovo prihlášok</span>
            <span className="text-xl font-black text-gray-900">{stats.total}</span>
          </div>
        </div>

        {/* Stat 2: Submitted */}
        <div className="bg-white rounded-2xl border border-gray-150 p-5 shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600">
            <FileText size={20} />
          </div>
          <div>
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Nové (Na posúdenie)</span>
            <span className="text-xl font-black text-gray-900">{stats.submitted}</span>
          </div>
        </div>

        {/* Stat 3: Evaluating */}
        <div className="bg-white rounded-2xl border border-gray-150 p-5 shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center text-purple-600">
            <Star size={20} />
          </div>
          <div>
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">V procese hodnotenia</span>
            <span className="text-xl font-black text-gray-900">{stats.evaluating}</span>
          </div>
        </div>

        {/* Stat 4: Approved */}
        <div className="bg-white rounded-2xl border border-gray-150 p-5 shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center text-green-600">
            <CheckCircle size={20} />
          </div>
          <div>
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Schválené projekty</span>
            <span className="text-xl font-black text-gray-900">{stats.approved}</span>
          </div>
        </div>

        {/* Stat 5: Approved Sum */}
        <div className="bg-white rounded-2xl border border-gray-150 p-5 shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center text-red-600">
            <TrendingUp size={20} />
          </div>
          <div>
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Vyplatené granty celkom</span>
            <span className="text-lg font-black text-red-600">{stats.approvedSum.toLocaleString('sk-SK')} €</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab('submissions')}
          className={`px-5 py-3 font-semibold text-sm border-b-2 transition-all cursor-pointer ${
            activeTab === 'submissions'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Doručené Žiadosti ({filteredSubmissions.length})
        </button>
        <button
          onClick={() => setActiveTab('forms')}
          className={`px-5 py-3 font-semibold text-sm border-b-2 transition-all cursor-pointer ${
            activeTab === 'forms'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Nastavenie Aktívnych Výziev ({activeForms.length})
        </button>
      </div>

      {/* TAB A: Submissions */}
      {activeTab === 'submissions' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-white rounded-2xl border border-gray-150 p-4 shadow-sm flex flex-col md:flex-row gap-4 items-center">
            {/* Search */}
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Hľadať podľa názvu projektu alebo organizácie..."
                className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 text-xs bg-gray-50/50 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all"
              />
            </div>

            {/* Filter by Form */}
            <select
              value={selectedForm}
              onChange={e => setSelectedForm(e.target.value)}
              className="w-full md:w-56 px-3 py-2 rounded-xl border border-gray-200 text-xs bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all"
            >
              <option value="">Všetky typy výziev</option>
              {activeForms.map(f => (
                <option key={f.id} value={f.id}>{f.title}</option>
              ))}
            </select>

            {/* Filter by Status */}
            <select
              value={selectedStatus}
              onChange={e => setSelectedStatus(e.target.value)}
              className="w-full md:w-48 px-3 py-2 rounded-xl border border-gray-200 text-xs bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all"
            >
              <option value="">Všetky stavy</option>
              <option value="draft">Koncept (Draft)</option>
              <option value="submitted">Nové podané (Submitted)</option>
              <option value="returned_for_changes">Vrátené na doplnenie</option>
              <option value="accepted_for_evaluation">Posudzované (Kontrola)</option>
              <option value="evaluated">Hodnotené (Oznámkované)</option>
              <option value="approved">Schválené (Approved)</option>
              <option value="rejected">Neschválené (Rejected)</option>
            </select>
          </div>

          {/* Grid / Table Listing */}
          {filteredSubmissions.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-150 p-12 text-center">
              <FileText size={32} className="mx-auto text-gray-300 mb-2" />
              <p className="text-gray-400 text-xs italic">Nenašli sa žiadne prihlášky vyhovujúce filtrom.</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-150 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-150 text-gray-400 font-bold uppercase tracking-wider">
                      <th className="px-5 py-3">Projekt / Organizácia</th>
                      <th className="px-5 py-3">Dátum doručenia</th>
                      <th className="px-5 py-3">Suma / Rozpočet</th>
                      <th className="px-5 py-3">Stav</th>
                      <th className="px-5 py-3">Hodnotiteľ (Kontrolór)</th>
                      <th className="px-5 py-3 text-right">Akcia</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-150">
                    {filteredSubmissions.map(sub => {
                      const { label: statusLabel, color: statusColor } = getStatusDetails(sub.status)
                      const projectName = sub.data.text_5 || sub.data.text_1 || `Projekt – ${sub.id.substring(0, 6)}`
                      const applicantName = sub.data.text_1 || sub.data.text_2 || 'Neznámy žiadateľ'
                      
                      const requestedSum = parseFloat(sub.data.text_14) || 0
                      const ownSum = parseFloat(sub.data.text_677666) || 0
                      const totalSum = requestedSum + ownSum

                      return (
                        <tr key={sub.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-5 py-4">
                            <div>
                              <span className="font-extrabold text-gray-900 block truncate max-w-[280px]">
                                {projectName}
                              </span>
                              <span className="text-[10px] text-gray-400 font-semibold block truncate max-w-[280px] mt-0.5">
                                Žiadateľ: {applicantName}
                              </span>
                            </div>
                          </td>
                          <td className="px-5 py-4 text-gray-500 font-medium">
                            {new Date(sub.created_at).toLocaleDateString('sk-SK')}
                          </td>
                          <td className="px-5 py-4">
                            <div>
                              <span className="font-bold text-gray-900 block">
                                {requestedSum.toLocaleString('sk-SK')} €
                              </span>
                              <span className="text-[9px] text-gray-400 font-bold uppercase block mt-0.5">
                                Rozpočet: {totalSum.toLocaleString('sk-SK')} €
                              </span>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <span className={`px-2 py-0.5 rounded-full font-bold border text-[9px] ${statusColor}`}>
                              {statusLabel}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            {/* Dynamický dropdown pre priradenie kontrolóra priamo v riadku tabuľky! */}
                            {updatingSubId === sub.id ? (
                              <Loader2 size={14} className="animate-spin text-blue-600" />
                            ) : (
                              <div className="flex items-center gap-1.5">
                                <UserPlus size={12} className="text-gray-400" />
                                <select
                                  value={sub.assigned_evaluator_id || ''}
                                  onChange={e => handleAssignEvaluator(sub.id, e.target.value)}
                                  className="border border-gray-200 rounded-lg p-1 bg-transparent text-[10px] focus:outline-none focus:ring-1 focus:ring-blue-100 max-w-[150px]"
                                >
                                  <option value="">-- Nepriradený --</option>
                                  {evaluators.map(ev => (
                                    <option key={ev.id} value={ev.id}>{ev.name}</option>
                                  ))}
                                </select>
                                {sub.evaluation_rating && (
                                  <span className="font-bold text-purple-600 bg-purple-50 border border-purple-100 px-1.5 py-0.5 rounded text-[9px]">
                                    ★ {sub.evaluation_rating}/10
                                  </span>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="px-5 py-4 text-right">
                            <Link
                              href={`/admin/granty/submissions/${sub.id}`}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gray-50 border border-gray-200 hover:bg-gray-100 text-gray-700 font-bold transition-all"
                            >
                              Detail
                              <ChevronRight size={12} />
                            </Link>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB B: Forms (Manage Active Grant Calls) */}
      {activeTab === 'forms' && (
        <div className="space-y-6">
          
          {/* KARTA: Vytvoriť novú výzvu */}
          <div className="bg-gradient-to-r from-blue-900 to-indigo-950 rounded-3xl p-6 text-white shadow-md flex flex-col justify-between">
            {!showCreateForm ? (
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h3 className="text-sm sm:text-base font-extrabold flex items-center gap-2">
                    <PlusCircle size={18} className="text-yellow-400" />
                    Chcete spustiť úplne novú grantovú výzvu?
                  </h3>
                  <p className="text-[11px] text-blue-200/80 mt-1 leading-relaxed">
                    Môžete okamžite vytvoriť novú výzvu alebo vyhodnocovaciu záverečnú správu skopírovaním overených šablón.
                  </p>
                </div>
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="px-4 py-2 rounded-xl text-blue-950 font-bold text-xs bg-yellow-300 hover:bg-yellow-400 transition-all cursor-pointer flex items-center gap-1 shrink-0"
                >
                  <PlusCircle size={13} />
                  Spustiť novú výzvu
                </button>
              </div>
            ) : (
              <form onSubmit={handleCreateFormSubmit} className="space-y-4">
                <div className="flex justify-between items-center border-b border-white/10 pb-2">
                  <span className="text-xs font-black uppercase text-yellow-300">Nová grantová výzva</span>
                  <button 
                    type="button" 
                    onClick={() => setShowCreateForm(false)} 
                    className="text-[10px] font-bold text-blue-200 hover:text-white"
                  >
                    Zrušiť
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[9px] font-bold text-blue-200 uppercase mb-1">
                      Názov grantu / formulára:
                    </label>
                    <input
                      type="text"
                      value={newTitle}
                      onChange={e => setNewTitle(e.target.value)}
                      placeholder="napr. Žiadosť o podporu projektov 2026/2027"
                      className="w-full px-3 py-2 rounded-lg border border-white/10 text-xs bg-white/10 text-white placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-yellow-300"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] font-bold text-blue-200 uppercase mb-1">
                      Unikátny slug (časť URL za /granty/):
                    </label>
                    <input
                      type="text"
                      value={newSlug}
                      onChange={e => setNewSlug(e.target.value)}
                      placeholder="napr. ziadost-projekty-2026"
                      className="w-full px-3 py-2 rounded-lg border border-white/10 text-xs bg-white/10 text-white placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-yellow-300"
                      required
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-[9px] font-bold text-blue-200 uppercase mb-1">
                      Typ formulára (predvolená šablóna polí):
                    </label>
                    <select
                      value={newTemplate}
                      onChange={e => setNewTemplate(e.target.value as 'ziadost' | 'zaverecna')}
                      className="w-full px-3 py-2 rounded-lg border border-white/10 text-xs bg-white/10 text-white focus:outline-none focus:ring-1 focus:ring-yellow-300"
                    >
                      <option value="ziadost" className="text-gray-900">Šablóna Žiadosti (Žiadateľ, Projekt, Rozpočet, B2, Kreslený Podpis)</option>
                      <option value="zaverecna" className="text-gray-900">Šablóna Záverečnej správy (Vyúčtovanie, IBAN, Zmluva, Excel vyúčtovanie, ZIP fotky, Podpis)</option>
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-[9px] font-bold text-blue-200 uppercase mb-1">
                      Opis výzvy a inštrukcie pre žiadateľov:
                    </label>
                    <textarea
                      value={newDesc}
                      onChange={e => setNewDesc(e.target.value)}
                      rows={3}
                      placeholder="Zadajte úvodný text a dôležité informácie, ktoré žiadatelia uvidia na vrchu formulára..."
                      className="w-full px-3 py-2 rounded-lg border border-white/10 text-xs bg-white/10 text-white placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-yellow-300"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateForm(false)}
                    className="px-4 py-2 rounded-lg text-xs font-bold bg-white/10 hover:bg-white/20 transition-all"
                  >
                    Zrušiť
                  </button>
                  <button
                    type="submit"
                    disabled={creatingForm}
                    className="px-5 py-2 rounded-lg text-blue-950 font-bold text-xs bg-yellow-300 hover:bg-yellow-400 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {creatingForm ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-950" />
                        Spúšťam výzvu...
                      </>
                    ) : (
                      <>
                        <FileHeart size={13} />
                        Spustiť výzvu live!
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Zoznam výziev */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {activeForms.map(form => (
              <div key={form.id} className="bg-white rounded-3xl border border-gray-150 p-6 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-bold text-[9px] uppercase tracking-wider mb-4">
                    Slug: {form.slug}
                  </div>
                  <h3 className="text-sm sm:text-base font-extrabold text-gray-900 mb-2 leading-snug">
                    {form.title}
                  </h3>
                  {form.description && (
                    <p className="text-gray-400 text-xs line-clamp-3 mb-4 leading-relaxed">
                      {form.description}
                    </p>
                  )}
                  <div className="bg-gray-50 border border-gray-150 rounded-2xl p-3 text-[10px] text-gray-500 font-medium">
                    Počet definovaných vstupných polí v JSON: <b>{form.fields?.length || 0} polí</b>
                  </div>
                </div>

                <div className="flex gap-2 mt-6 pt-4 border-t border-gray-100 justify-end">
                  <a
                    href={`/granty/${form.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 rounded-xl bg-gray-50 border border-gray-200 text-gray-600 hover:bg-gray-100 transition-colors font-bold text-xs flex items-center gap-1"
                  >
                    Otvoriť živý formulár
                    <ChevronRight size={12} />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
