import QRCode from 'qrcode'

/** QR kód overovacej adresy ako SVG (ostrý pri tlači). Serverový modul. */
export async function celebretQrSvg(url: string): Promise<string> {
  return QRCode.toString(url, { type: 'svg', margin: 0, errorCorrectionLevel: 'M', color: { dark: '#000000', light: '#ffffff00' } })
}
