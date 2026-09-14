import type { AdminOnlinePayment } from './actions'

/**
 * Zaplatená prvá platba, ktorej predplatné sa u Mollie nezaložilo (ostalo
 * pending/activating bez sub_ ID) – darca zaplatil, ale opakované platby nebežia.
 * (Mimo actions.ts, lebo súbor so 'use server' smie exportovať len async funkcie.)
 */
export function isSubscriptionStuck(p: AdminOnlinePayment): boolean {
  return (
    p.kind === 'recurring_first' &&
    p.status === 'paid' &&
    !!p.subscription &&
    !p.subscription.mollie_subscription_id &&
    ['pending', 'activating'].includes(p.subscription.status)
  )
}
