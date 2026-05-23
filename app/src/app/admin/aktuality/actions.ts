'use server'

import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { uploadBuffer, deleteImage, uploadImage } from '@/lib/storage'
import { GoogleGenerativeAI } from '@google/generative-ai'

const supabaseAdmin = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const ELEVENLABS_API_URL = "https://api.elevenlabs.io/v1"
const DEFAULT_VOICE_ID = "scOwDtmlUjD3prqpp97I" // Sam (najlepší pre slovenčinu)
const DEFAULT_MODEL_ID = "eleven_v3" // Najnovší profesionálny model

export interface PostPayload {
  id?: string
  title: string
  slug: string
  excerpt?: string
  content: string
  featured_image?: string
  audio_url?: string | null
  status: 'draft' | 'published' | 'archived'
  published_at?: string | null
}

/**
 * Získa zoznam všetkých článkov pre admin prostredie.
 */
export async function getPosts() {
  const { data, error } = await supabaseAdmin
    .from('posts')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Chyba pri načítaní článkov:', error)
    return []
  }

  return data || []
}

/**
 * Získa konkrétny článok podľa ID.
 */
export async function getPostById(id: string) {
  const { data, error } = await supabaseAdmin
    .from('posts')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    console.error(`Chyba pri načítaní článku s ID ${id}:`, error)
    return null
  }

  return data
}

/**
 * Pomocná funkcia na vytvorenie slug-u z nadpisu (odstránenie diakritiky, pomlčky).
 */
function generateSlug(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .normalize('NFD') // Odstránenie diakritiky
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '')
}

/**
 * Pomocník pre získanie kľúča (key) súboru z verejnej B2 URL adresy.
 */
function getB2KeyFromUrl(url?: string | null): string | null {
  if (!url) return null
  const bucketName = process.env.B2_BUCKET_NAME || 'parochia-storage-v1'
  const parts = url.split(bucketName + '/')
  if (parts.length > 1) {
    return parts[1]
  }
  return null
}

/**
 * Vytvorí alebo aktualizuje príspevok v databáze.
 */
export async function createOrUpdatePost(payload: PostPayload) {
  try {
    const finalSlug = payload.slug.trim() || generateSlug(payload.title)
    
    const dbPayload = {
      title: payload.title,
      slug: finalSlug,
      excerpt: payload.excerpt || null,
      content: payload.content,
      featured_image: payload.featured_image || null,
      audio_url: payload.audio_url || null,
      status: payload.status,
      published_at: payload.status === 'published' 
        ? (payload.published_at || new Date().toISOString()) 
        : null,
      updated_at: new Date().toISOString()
    }

    let error
    let data

    if (payload.id) {
      // Úprava
      const res = await supabaseAdmin
        .from('posts')
        .update(dbPayload)
        .eq('id', payload.id)
        .select()
        .single()
      error = res.error
      data = res.data
    } else {
      // Vytvorenie
      const res = await supabaseAdmin
        .from('posts')
        .insert({
          ...dbPayload,
          created_at: new Date().toISOString()
        })
        .select()
        .single()
      error = res.error
      data = res.data
    }

    if (error) throw error

    revalidatePath('/admin/aktuality')
    revalidatePath('/aktuality')
    if (payload.slug) {
      revalidatePath(`/aktuality/${payload.slug}`)
    }

    return { success: true, post: data }
  } catch (err: any) {
    console.error('Chyba pri zápise článku:', err)
    return { success: false, error: err.message || 'Nepodarilo sa uložiť článok' }
  }
}

/**
 * Vymaže článok z databázy vrátane priradených súborov na B2 (ilustrácia + audio).
 */
export async function deletePost(id: string) {
  try {
    // 1. Načítame príspevok pre získanie URL adries súborov
    const { data: post, error: fetchError } = await supabaseAdmin
      .from('posts')
      .select('featured_image, audio_url')
      .eq('id', id)
      .single()

    if (fetchError || !post) {
      throw new Error('Článok sa nenašiel na vymazanie.')
    }

    // 2. Vymažeme titulný obrázok z B2
    const imgKey = getB2KeyFromUrl(post.featured_image)
    if (imgKey) {
      await deleteImage(imgKey)
    }

    // 3. Vymažeme ElevenLabs audio z B2
    const audioKey = getB2KeyFromUrl(post.audio_url)
    if (audioKey) {
      await deleteImage(audioKey)
    }

    // 4. Odstránime samotný článok z DB
    const { error: deleteError } = await supabaseAdmin
      .from('posts')
      .delete()
      .eq('id', id)

    if (deleteError) throw deleteError

    revalidatePath('/admin/aktuality')
    revalidatePath('/aktuality')
    
    return { success: true }
  } catch (err: any) {
    console.error('Chyba pri mazaní článku:', err)
    return { success: false, error: err.message || 'Nepodarilo sa zmazať článok' }
  }
}

/**
 * Vyčistí HTML / Markdown tagy z textu pre potreby čistej reči ElevenLabs.
 */
function cleanTextForTts(text: string): string {
  let clean = text
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<[^>]*>/g, ' ') // Odstránenie HTML
    .replace(/\!\[.*?\]\(.*?\)/g, '') // Odstránenie Markdown obrázkov
    .replace(/\[(.*?)\]\(.*?\)/g, '$1') // Ponechanie len textu odkazov z MD
    .replace(/[\#\*\_]+/g, '') // Odstránenie MD formátovania (#, *, _)
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n/g, '\n')
    .trim()
  
  return clean
}

/**
 * Rozdelí dlhý text na segmenty do 5000 znakov s rešpektovaním odsekov a viet.
 */
function splitTextChunks(text: string, maxChunk: number = 5000): string[] {
  if (text.length <= maxChunk) return [text]
  
  const chunks: string[] = []
  let current = ''
  
  const paragraphs = text.split(/\n\s*\n/)
  for (const paragraph of paragraphs) {
    const trimmed = paragraph.trim()
    if (!trimmed) continue
    
    if (current.length + trimmed.length + 2 <= maxChunk) {
      current += (current ? '\n\n' : '') + trimmed
    } else if (trimmed.length > maxChunk) {
      if (current.trim()) {
        chunks.push(current.trim())
        current = ''
      }
      const sentences = trimmed.split(/(?<=[.!?])\s+/)
      for (const sentence of sentences) {
        if (current.length + sentence.length + 1 > maxChunk && current.length > 0) {
          chunks.push(current.trim())
          current = sentence
        } else {
          current += (current ? ' ' : '') + sentence
        }
      }
    } else {
      if (current.trim()) chunks.push(current.trim())
      current = trimmed
    }
  }
  
  if (current.trim()) chunks.push(current.trim())
  return chunks
}

/**
 * Serverovo vygeneruje audiostopu pre článok pomocou ElevenLabs a uloží ju na B2.
 */
export async function generateElevenLabsTTS(postId: string) {
  try {
    if (!process.env.ELEVENLABS_API_KEY) {
      throw new Error('ElevenLabs API kľúč nie je nakonfigurovaný v .env.local')
    }

    // 1. Načítame príspevok
    const { data: post, error: fetchError } = await supabaseAdmin
      .from('posts')
      .select('id, title, excerpt, content, audio_url')
      .eq('id', postId)
      .single()

    if (fetchError || !post) {
      throw new Error('Článok sa nenašiel pre generovanie TTS.')
    }

    // 2. Odstránime predchádzajúce audio z B2, ak už existuje
    if (post.audio_url) {
      const oldKey = getB2KeyFromUrl(post.audio_url)
      if (oldKey) {
        await deleteImage(oldKey)
      }
    }

    // 3. Pripravíme spojený čistý text (Nadpis + Úryvok + Obsah)
    const combinedText = `${post.title}.\n\n${post.excerpt ? post.excerpt + '.\n\n' : ''}${post.content}`
    const cleanText = cleanTextForTts(combinedText)

    if (cleanText.length === 0) {
      throw new Error('Článok neobsahuje žiadny text na predčítanie.')
    }

    // 4. Rozdelíme text na bezpečné chunk-y pre optimálnu kvalitu reči
    const chunks = splitTextChunks(cleanText, 5000)
    console.log(`[TTS] Spúšťam ElevenLabs pre článok '${post.title}'. Počet segmentov: ${chunks.length}`)

    const audioBuffers: Buffer[] = []

    // 5. Zavoláme ElevenLabs pre každý segment
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i]
      console.log(`[TTS] Spracovávam segment ${i + 1}/${chunks.length} (${chunk.length} znakov)`)

      const requestBody = {
        text: chunk,
        model_id: DEFAULT_MODEL_ID,
        voice_settings: {
          stability: 0.85,          // Vyššia stabilita pre čisté liturgické/formálne čítanie
          similarity_boost: 0.8,
          style: 0.0,
          use_speaker_boost: true
        }
      }

      const response = await fetch(`${ELEVENLABS_API_URL}/text-to-speech/${DEFAULT_VOICE_ID}`, {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': process.env.ELEVENLABS_API_KEY!,
        },
        body: JSON.stringify(requestBody)
      })

      if (!response.ok) {
        const errText = await response.text()
        console.error(`[TTS] ElevenLabs zlyhal na segmente ${i+1}:`, errText)
        throw new Error(`ElevenLabs API zlyhalo: ${response.status} - ${errText}`)
      }

      const chunkBuffer = Buffer.from(await response.arrayBuffer())
      audioBuffers.push(chunkBuffer)

      // Malý delay na predídenie rate limitu
      if (i < chunks.length - 1) {
        await new Promise(res => setTimeout(res, 250))
      }
    }

    // 6. Spojíme nahrávky do jedného finálneho MP3 súboru
    const combinedBuffer = Buffer.concat(audioBuffers)

    // 7. Nahráme MP3 buffer do Backblaze B2 úložiska
    const uploadResult = await uploadBuffer(combinedBuffer, 'audio/mpeg', `posts/${post.id}/audio`)
    if (!uploadResult) {
      throw new Error('Nahrávanie audiostopy na Backblaze B2 zlyhalo.')
    }

    // 8. Aktualizujeme audio_url v databáze
    const { error: updateError } = await supabaseAdmin
      .from('posts')
      .update({ audio_url: uploadResult.url })
      .eq('id', post.id)

    if (updateError) throw updateError

    revalidatePath('/admin/aktuality')
    revalidatePath('/aktuality')

    console.log(`[TTS] Audiostopa pre článok '${post.title}' úspešne vygenerovaná: ${uploadResult.url}`)
    return { success: true, audioUrl: uploadResult.url }
  } catch (err: any) {
    console.error('[TTS] Chyba pri generovaní TTS nahrávky:', err)
    return { success: false, error: err.message || 'Chyba pri generovaní hlasu' }
  }
}

/**
 * Server Action na nahrávanie titulného obrázka článku na Backblaze B2.
 */
export async function uploadPostImage(formData: FormData) {
  try {
    const file = formData.get('file') as File
    const postId = formData.get('postId') as string

    if (!file) {
      return { error: 'Žiadny súbor nebol odovzdaný' }
    }

    const folder = postId ? `posts/${postId}/images` : 'posts/temp'
    const result = await uploadImage(file, folder)
    
    if (!result) {
      return { error: 'Nahrávanie na Backblaze B2 zlyhalo' }
    }

    return { url: result.url }
  } catch (err: any) {
    console.error('Chyba pri nahrávaní obrázka:', err)
    return { error: err.message || 'Chyba pri nahrávaní súboru' }
  }
}

/**
 * Server Action na generovanie alebo úpravu obsahu článku pomocou Google Gemini.
 */
export async function generateAiContent(
  prompt: string,
  currentContent?: string,
  mode: 'generate' | 'refine' = 'generate'
) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('Google Gemini API kľúč nie je nakonfigurovaný v .env.local')
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
    
    // Použijeme najnovší stabilný model Gemini
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-pro',
      generationConfig: {
        temperature: 0.7,
      }
    })

    const SYSTEM_PROMPT = `
Si profesionálny a pútavý copywriter, textár a duchovný autor pre pastoračný fond KROK a Žilinskú diecézu.
Tvojou úlohou je napísať alebo vylepšiť príspevok v modernej, krásnej slovenčine.

DÔLEŽITÉ PRAVIDLÁ:
1. Formát výstupu MUSÍ byť čisté a dobre štruktúrované HTML.
2. Nepoužívaj ŽIADNE Markdown tagy (ako **, #, *, etc.) ani Markdown kódové bloky (napr. \`\`\`html). Vráť čisto iba HTML obsah.
3. Používaj výhradne tieto povolené HTML značky, ktoré podporuje náš editor:
   - Nadpisy: <h2>, <h3> (Nikdy nepoužívaj <h1>, ten reprezentuje nadpis článku na stránke)
   - Odseky a formátovanie: <p>, <strong> (pre tučné písmo), <em> (pre kurzívu), <u> (pre podčiarknuté), <s> (pre prečiarknuté)
   - Zoznamy: <ul>, <ol>, <li>
   - Blokové citácie: <blockquote> (pre hlboké duchovné myšlienky alebo citáty)
   - Tabuľky: <table>, <tr>, <th>, <td> (ak sa hodí štruktúrovaný prehľad údajov alebo program)
4. Tón textu má byť úctivý, inšpiratívny, hlboký, no zároveň zrozumiteľný pre širokú verejnosť a darcov pastoračného fondu.
`

    let userPrompt = ''
    if (mode === 'generate') {
      userPrompt = `Vytvor nový inšpiratívny a pútavý článok v slovenčine na tému alebo na základe tohto zadania: "${prompt}".\nObsah bohato naformátuj pomocou povolených HTML tagov. Článok by mal mať aspoň 3-4 odseky, prípadne zoznamy či podnadpisy H2/H3.`
    } else {
      userPrompt = `Zober nasledovný existujúci HTML obsah článku a uprav/vylepši ho na základe tohto pokynu: "${prompt}".

Existujúci obsah:
${currentContent || ''}

Upravený text vráť ako čisté HTML s dodržaním pôvodných štruktúr a formátovania, pokiaľ pokyn nevyžaduje inak.`
    }

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
      systemInstruction: SYSTEM_PROMPT,
    })

    const responseText = result.response.text()
    if (!responseText) {
      throw new Error('AI model nevrátil žiadnu odpoveď.')
    }

    // Odstránenie prípadných markdown blokov, ak by ich Gemini napriek tomu vrátilo
    const cleanHtml = responseText
      .replace(/```html/gi, '')
      .replace(/```/g, '')
      .trim()

    return { success: true, content: cleanHtml }
  } catch (err: any) {
    console.error('Chyba pri generovaní AI obsahu:', err)
    return { success: false, error: err.message || 'Chyba pri generovaní textu cez AI' }
  }
}

/**
 * Server Action na automatické generovanie zhrnutia (excerpt) článku z HTML obsahu.
 */
export async function generateAiExcerpt(content: string) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('Google Gemini API kľúč nie je nakonfigurovaný v .env.local')
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      generationConfig: {
        temperature: 0.5,
        maxOutputTokens: 150,
      }
    })

    const prompt = `
Analyzuj nasledovný HTML obsah článku a vytvor z neho stručný, pútavý a zhrňujúci úryvok (excerpt) v slovenčine.
Tento úryvok bude slúžiť ako upútavka v zozname správ na hlavnej stránke.

PRAVIDLÁ:
1. Dĺžka úryvku musí byť maximálne 1 až 2 vety (približne 120-180 znakov).
2. Výstupom musí byť čistý obyčajný text (Plain Text) - nepoužívaj žiadne HTML tagy ani formátovanie.
3. Úryvok musí hneď zaujať darcov pastoračného fondu a vystihovať podstatu článku.

HTML Obsah článku:
${content}
`

    const result = await model.generateContent(prompt)
    const responseText = result.response.text()
    
    if (!responseText) {
      throw new Error('AI nevrátila žiadne zhrnutie.')
    }

    return { success: true, excerpt: responseText.trim() }
  } catch (err: any) {
    console.error('Chyba pri generovaní úryvku:', err)
    return { success: false, error: err.message || 'Chyba pri generovaní zhrnutia' }
  }
}

/**
 * Server Action na kontrolu gramatiky, preklepov a štylistiky v slovenskom texte pomocou Google Gemini.
 */
export async function checkGrammar(text: string) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('Google Gemini API kľúč nie je nakonfigurovaný v .env.local')
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
    
    // Použijeme rýchly a vysoko efektívny model Gemini 1.5 Flash pre gramatiku
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      generationConfig: {
        temperature: 0.2, // Nízka teplota pre presné opravy
        responseMimeType: 'application/json',
      }
    })

    const SYSTEM_PROMPT = `
Si expert na slovenskú gramatiku, pravopis, interpunkciu a štylistiku.
Tvojou úlohou je skontrolovať poskytnutý slovenský text (ktorý môže obsahovať HTML tagy, tie musíš zachovať bez zmeny) a opraviť v ňom gramatické chyby, preklepy a štylizáciu.

PRAVIDLÁ:
1. Oprav gramatické chyby, preklepy, nesprávny slovosled a chýbajúcu/chybnú interpunkciu (čiarky, bodky, atď.).
2. ZACHOVAJ všetky HTML tagy (napr. <p>, <h2>, <strong>, <em>, <ul>, <li>, <table>, atď.) presne na ich pôvodných miestach. Neupravuj, neodstraňuj ani nepridávaj HTML tagy, pokiaľ to nie je nutné pre gramatickú správnosť obsahu.
3. Zachovaj pôvodný význam, tón a štruktúru textu. Nevymýšľaj si nové fakty. Prepracuj alebo uprav text len tak, aby znel prirodzene a spisovne po slovensky.
4. Výstup MUSÍ byť v JSON formáte s týmito dvoma kľúčmi:
   - "corrected_text": "opravený HTML text so zachovanými tagmi"
   - "changes_made": "krátky zoznam vykonaných opráv v slovenčine (napr. 'Opravené i/y v slove x, pridaná čiarka pred spojku y'), alebo 'Žiadne zmeny potrebné'"

Vstupný text na opravu:
`

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: text }] }],
      systemInstruction: SYSTEM_PROMPT,
    })

    const responseText = result.response.text()
    if (!responseText) {
      throw new Error('AI model nevrátil žiadnu odpoveď.')
    }

    let parsedResult
    try {
      parsedResult = JSON.parse(responseText)
    } catch {
      const cleaned = responseText
        .replace(/```json\s*/g, '')
        .replace(/```\s*/g, '')
        .trim()
      parsedResult = JSON.parse(cleaned)
    }

    return {
      success: true,
      correctedText: parsedResult.corrected_text,
      changesMade: parsedResult.changes_made,
    }
  } catch (err: any) {
    console.error('Chyba pri kontrole gramatiky:', err)
    return { success: false, error: err.message || 'Chyba pri kontrole gramatiky cez AI' }
  }
}

/**
 * Server Action na generovanie titulného obrázka pomocou Google Imagen 3 a uloženie na B2.
 */
export async function generateAiImage(prompt: string, postId?: string) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('Google Gemini API kľúč nie je nakonfigurovaný v .env.local')
    }

    const endpoint = 'https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict'
    
    console.log(`[IMAGEN] Spúšťam generovanie obrázka pre prompt: "${prompt}"`)

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'x-goog-api-key': process.env.GEMINI_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        instances: [
          {
            prompt: prompt,
          }
        ],
        parameters: {
          sampleCount: 1,
          aspectRatio: '16:9',
          outputMimeType: 'image/jpeg',
        }
      })
    })

    if (!response.ok) {
      const errText = await response.text()
      console.error('[IMAGEN] Google API error:', errText)
      throw new Error(`Google Imagen API zlyhalo: ${response.status} - ${errText}`)
    }

    const data = await response.json()
    const base64Str = data.predictions?.[0]?.bytesBase64Encoded

    if (!base64Str) {
      throw new Error('Google Imagen API nevrátilo žiadne dáta obrázka.')
    }

    // Previesť base64 na binárny buffer
    const buffer = Buffer.from(base64Str, 'base64')

    // Určiť cestu pre nahrávanie
    const uniqueId = Math.random().toString(36).substring(2, 15)
    const folderPath = postId ? `posts/${postId}/images/ai-${uniqueId}` : `posts/temp/ai-${uniqueId}`

    // Nahrať na B2
    const uploadResult = await uploadBuffer(buffer, 'image/jpeg', folderPath)
    
    if (!uploadResult) {
      throw new Error('Nahrávanie vygenerovaného obrázka na Backblaze B2 zlyhalo.')
    }

    console.log(`[IMAGEN] Obrázok úspešne vygenerovaný a nahraný na B2: ${uploadResult.url}`)
    return { success: true, url: uploadResult.url }
  } catch (err: any) {
    console.error('[IMAGEN] Chyba pri generovaní obrázka:', err)
    return { success: false, error: err.message || 'Chyba pri generovaní obrázka cez AI' }
  }
}


