import type { ReactNode } from 'react'

/** Zdieľané štýly formulárov v module Výzvy (rovnaký vzhľad ako ostatné admin moduly). */

export const inputCls =
  'w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-900 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 transition-all disabled:opacity-60 disabled:cursor-not-allowed'

export const labelCls = 'block text-xs font-bold text-gray-400 uppercase tracking-wider px-1 mb-1.5'

export const cardCls = 'bg-white border border-gray-100 rounded-3xl p-6 shadow-sm'

export const btnPrimary =
  'inline-flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 text-white rounded-xl text-sm font-black shadow-lg shadow-blue-500/10 cursor-pointer transition-all'

export const btnSecondary =
  'inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-gray-200 hover:border-blue-300 hover:bg-blue-50 text-gray-700 rounded-xl text-xs font-bold cursor-pointer transition-all disabled:opacity-50'

export const btnIcon = 'p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all cursor-pointer disabled:opacity-30'

export const btnIconDanger = 'p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all cursor-pointer'

export const checkboxCls = 'w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500/20'

export function Field({ label, hint, children, className = '' }: { label: string; hint?: string; children: ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label className={labelCls}>{label}</label>
      {children}
      {hint && <p className="text-[11px] text-gray-400 mt-1.5 px-1 leading-snug">{hint}</p>}
    </div>
  )
}

export function SectionTitle({ title, description }: { title: string; description?: string }) {
  return (
    <div className="mb-5">
      <h3 className="font-extrabold text-sm text-gray-900 uppercase tracking-wider">{title}</h3>
      {description && <p className="text-xs text-gray-400 mt-1">{description}</p>}
    </div>
  )
}

export function Notice({ kind, children }: { kind: 'error' | 'success' | 'info'; children: ReactNode }) {
  const cls =
    kind === 'error'
      ? 'bg-red-50 border-red-100 text-red-800'
      : kind === 'success'
        ? 'bg-emerald-50 border-emerald-100 text-emerald-800'
        : 'bg-blue-50 border-blue-100 text-blue-800'
  return <div className={`p-4 rounded-2xl border text-sm font-bold ${cls}`}>{children}</div>
}
