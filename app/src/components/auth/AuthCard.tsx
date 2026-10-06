import type { ReactNode } from 'react'
import KrokLogo from '@/components/KrokLogo'

/** Jednoduchá karta pre stránky účtu (overenie odkazu, heslo) – svetlý vzhľad webu. */
export default function AuthCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="min-h-screen bg-paper-warm flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md bg-white border border-blue/10 rounded-3xl shadow-xl p-8 sm:p-10">
        <div className="flex justify-center mb-6">
          <KrokLogo variant="color" height={40} />
        </div>
        <h1 className="text-2xl font-extrabold text-ink text-center mb-4">{title}</h1>
        {children}
      </div>
    </div>
  )
}

export const authInputCls =
  'w-full px-4 py-3 bg-white border border-blue/15 rounded-xl text-sm text-ink outline-none focus:border-blue focus:ring-4 focus:ring-blue/10'
export const authBtnCls =
  'w-full py-3.5 rounded-xl bg-blue text-white font-extrabold hover:bg-blue-deep transition-colors disabled:opacity-50 cursor-pointer'
