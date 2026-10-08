import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

/**
 * Súkromné úložisko kňazskej zóny (B2, S3 API). Súbory sa nikdy neodkazujú priamo –
 * nahrávajú sa podpísanou adresou z prehliadača (bez limitu 4,5 MB na Verceli) a sťahujú
 * cez /knazska-zona/subor/[id] po kontrole prístupu krátkodobou podpísanou adresou.
 *
 * B2_PRIVATE_BUCKET = súkromný bucket (odporúčané). Bez neho sa použije hlavný bucket
 * s náhodnými kľúčmi – ten je však verejne čitateľný, admin preto zobrazí upozornenie.
 */

const s3 = new S3Client({
  endpoint: process.env.B2_ENDPOINT,
  region: process.env.B2_REGION || 'eu-central-003',
  credentials: { accessKeyId: process.env.B2_PRIVATE_KEY_ID || process.env.B2_APPLICATION_KEY_ID!, secretAccessKey: process.env.B2_PRIVATE_KEY || process.env.B2_APPLICATION_KEY! },
})

export const zoneBucket = () => process.env.B2_PRIVATE_BUCKET || process.env.B2_BUCKET_NAME!
export const isPrivateStorage = () => !!process.env.B2_PRIVATE_BUCKET

export const MAX_FILE_BYTES = 100 * 1024 * 1024

export function newFileKey(docId: string, fileName: string): string {
  const ext = (fileName.split('.').pop() ?? 'bin').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 8) || 'bin'
  return `knazska-zona/${docId}/${crypto.randomUUID()}.${ext}`
}

export async function presignUpload(key: string, contentType: string): Promise<string> {
  return getSignedUrl(s3, new PutObjectCommand({ Bucket: zoneBucket(), Key: key, ContentType: contentType }), { expiresIn: 900 })
}

/** Krátkodobá adresa na stiahnutie / zobrazenie (inline = otvorí sa v prehliadači). */
export async function presignDownload(key: string, fileName: string, inline: boolean): Promise<string> {
  const disposition = `${inline ? 'inline' : 'attachment'}; filename*=UTF-8''${encodeURIComponent(fileName)}`
  return getSignedUrl(s3, new GetObjectCommand({ Bucket: zoneBucket(), Key: key, ResponseContentDisposition: disposition }), { expiresIn: 300 })
}

export async function readObject(key: string): Promise<{ bytes: Uint8Array; size: number; contentType: string | null } | null> {
  try {
    const res = await s3.send(new GetObjectCommand({ Bucket: zoneBucket(), Key: key }))
    const bytes = await res.Body!.transformToByteArray()
    return { bytes, size: bytes.length, contentType: res.ContentType ?? null }
  } catch {
    return null
  }
}

export async function deleteObject(key: string): Promise<void> {
  try {
    await s3.send(new DeleteObjectCommand({ Bucket: zoneBucket(), Key: key }))
  } catch {
    /* súbor už neexistuje */
  }
}
