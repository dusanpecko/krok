import { encode, removeDiacritics, PaymentOptions, Periodicity, type DataModel, type Payment } from 'bysquare/pay'
import { Version } from 'bysquare'
import QRCode from 'qrcode'

/**
 * PAY by square – slovenský štandard QR platby (bankové appky SK).
 *
 * Kompatibilita (overené 2026-09-04 – ČSOB a Fio QR s verziou 1.2.0 aj 1.1.0
 * v hlavičke neprečítali):
 *  - bankové appky akceptujú v hlavičke LEN verziu 1.0.0 (Fio hlási „Nepodporovaná
 *    verzia BySquare QR kódu" – bysquare issue #9). Knižnica `bysquare` v2, ktorá
 *    roky fungovala v produkcii, zapisovala 1.0.0 aj s menom príjemcu v payload-e;
 *    telo QR je inak identické. Preto verzia 1.0.0.
 *  - trvalý príkaz (StandingOrder) z QR podporuje len málo appiek → aj mesačný
 *    dar kódujeme ako bežný platobný príkaz; trvalý príkaz si darca nastaví
 *    v banke sám (prepínač USE_STANDING_ORDER).
 */

const BYSQUARE_VERSION = Version['1.0.0']
const USE_STANDING_ORDER = false

export const KROK_IBAN = 'SK0483300000002901688673'
export const KROK_BENEFICIARY = 'Pastoračný fond Žilinskej diecézy'
export const KROK_CONSTANT_SYMBOL = '0558'

export interface PayBySquareInput {
  amount: number
  /** Mesačný trvalý príkaz namiesto jednorazového príkazu. */
  recurring?: boolean
  variableSymbol?: string | null
  /** Špecifický symbol výzvy/projektu (párovanie daru k projektu). */
  specificSymbol?: string | null
  note?: string
}

/** Zostaví PAY by square reťazec (na vloženie do QR). */
export function buildPayBySquare(input: PayBySquareInput): string {
  const amount = Math.round(Number(input.amount) * 100) / 100
  const vs = input.variableSymbol?.replace(/\D/g, '').slice(0, 10) || undefined
  const ss = input.specificSymbol?.replace(/\D/g, '').slice(0, 10) || undefined

  const base = {
    amount: amount > 0 ? amount : undefined,
    currencyCode: 'EUR',
    variableSymbol: vs,
    specificSymbol: ss,
    constantSymbol: KROK_CONSTANT_SYMBOL,
    paymentNote: input.note ?? (input.recurring ? 'Pravidelny dar KROK' : 'Dar KROK'),
    bankAccounts: [{ iban: KROK_IBAN }],
    beneficiary: { name: KROK_BENEFICIARY },
  }

  const payment: Payment = input.recurring && USE_STANDING_ORDER
    ? {
        ...base,
        type: PaymentOptions.StandingOrder,
        periodicity: Periodicity.Monthly,
        // Deň splatnosti = dnešný deň, max. 28, aby existoval v každom mesiaci
        day: Math.min(new Date().getDate(), 28),
      }
    : { ...base, type: PaymentOptions.PaymentOrder }

  const model: DataModel = { payments: [payment] }
  // Bez diakritiky – bankové appky ju v payload-e odmietajú. Pozor: encode()
  // s vlastnými options diakritiku NEodstráni automaticky (napriek dokumentácii),
  // preto ju odstraňujeme explicitne aj cez `deburr: true`.
  removeDiacritics(model)
  return encode(model, { version: BYSQUARE_VERSION, deburr: true })
}

/** PAY by square QR ako PNG data URL (na priame vloženie do <img>). */
export async function buildPayBySquareQrDataUrl(input: PayBySquareInput, size = 320): Promise<string> {
  const payload = buildPayBySquare(input)
  return QRCode.toDataURL(payload, {
    errorCorrectionLevel: 'H', // vydrží logo v strede
    margin: 3, // tichá zóna – čítačky v bankových appkách sú na ňu citlivé
    width: size,
    color: { dark: '#051b30', light: '#ffffff' },
  })
}
