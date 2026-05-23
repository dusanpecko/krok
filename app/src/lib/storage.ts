import { S3Client, PutObjectCommand, DeleteObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3'

// Inicializácia S3 klienta pre Backblaze B2 z .env.local hodnôt
const s3 = new S3Client({
    endpoint: process.env.B2_ENDPOINT,
    region: process.env.B2_REGION || 'eu-central-003',
    credentials: {
        accessKeyId: process.env.B2_APPLICATION_KEY_ID!,
        secretAccessKey: process.env.B2_APPLICATION_KEY!,
    },
})

export interface UploadResult {
    url: string
    key: string
}

/**
 * Nahrá bežný súbor (obrázok atď.) do Backblaze B2.
 */
export async function uploadImage(file: File, folder: string = 'uploads'): Promise<UploadResult | null> {
    try {
        const fileBuffer = await file.arrayBuffer()
        const buffer = Buffer.from(fileBuffer)

        // Vytvorenie unikátneho názvu súboru s časovou pečiatkou
        const timestamp = Date.now()
        const safeName = file.name.replace(/[^a-zA-Z0-9.]/g, '-').toLowerCase()
        const key = `${folder}/${timestamp}-${safeName}`

        await s3.send(new PutObjectCommand({
            Bucket: process.env.B2_BUCKET_NAME!,
            Key: key,
            Body: buffer,
            ContentType: file.type,
        }))

        // Použijeme verejnú URL adresu
        const baseUrl = process.env.B2_PUBLIC_URL || `${process.env.B2_ENDPOINT}/${process.env.B2_BUCKET_NAME}`
        return { url: `${baseUrl}/${key}`, key }
    } catch (error) {
        console.error('[Storage] Upload súboru zlyhal:', error)
        return null
    }
}

/**
 * Nahrá programovo vygenerovaný Buffer (napr. MP3 nahrávku z ElevenLabs) do Backblaze B2.
 */
export async function uploadBuffer(buffer: Buffer, mimeType: string, folder: string = 'generated'): Promise<UploadResult | null> {
    try {
        const timestamp = Date.now()
        const randomSuffix = Math.random().toString(36).substring(7)
        const ext = mimeType.split('/')[1] || 'mp3'
        const key = `${folder}/${timestamp}-${randomSuffix}.${ext}`

        await s3.send(new PutObjectCommand({
            Bucket: process.env.B2_BUCKET_NAME!,
            Key: key,
            Body: buffer,
            ContentType: mimeType,
        }))

        const baseUrl = process.env.B2_PUBLIC_URL || `${process.env.B2_ENDPOINT}/${process.env.B2_BUCKET_NAME}`
        return { url: `${baseUrl}/${key}`, key }
    } catch (error) {
        console.error('[Storage] Upload bufferu zlyhal:', error)
        return null
    }
}

/**
 * Odstráni súbor z Backblaze B2 úložiska.
 */
export async function deleteImage(key: string): Promise<boolean> {
    console.log(`[Storage] Pokus o zmazanie kľúča: '${key}' z bucketu: '${process.env.B2_BUCKET_NAME}'`)
    try {
        // Kontrolné overenie existencie pred zmazaním pre debugovanie
        try {
            await s3.send(new HeadObjectCommand({
                Bucket: process.env.B2_BUCKET_NAME!,
                Key: key,
            }))
            console.log(`[Storage] Súbor na B2 potvrdený, existuje: ${key}`)
        } catch (headError: any) {
            const code = headError.name || headError.code
            if (code === 'NotFound' || code === '404') {
                console.warn(`[Storage] Upozornenie: Súbor sa nenašiel na B2 (kľúč môže byť neplatný): ${key}`)
            } else {
                console.warn(`[Storage] HeadObject zlyhal:`, headError)
            }
        }

        await s3.send(new DeleteObjectCommand({
            Bucket: process.env.B2_BUCKET_NAME!,
            Key: key,
        }))
        console.log(`[Storage] Príkaz na vymazanie odoslaný úspešne pre: ${key}`)
        return true
    } catch (error) {
        console.error('[Storage] Odstránenie súboru z B2 zlyhalo:', error)
        return false
    }
}
