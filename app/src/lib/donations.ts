/** Popisky spôsobov platby (enum `payment_method` v DB). */
export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  bank_transfer: 'Prevod',
  card_online: 'Kartou online',
  card_24pay: 'Kartou (24pay)',
  postal_order: 'Poštová poukážka',
  cash: 'Hotovosť',
}

export function paymentMethodLabel(method?: string | null): string {
  if (!method) return 'Prevod'
  return PAYMENT_METHOD_LABELS[method] ?? method
}
