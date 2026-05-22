'use client'

import { ArrowDownRight, ArrowUpRight, CheckCircle2, UserPlus } from 'lucide-react'

interface TransactionListProps {
  transactions: any[]
  onPairClick: (tx: any) => void
  onQuickMatchAnon: (tx: any) => void
}

export default function TransactionList({ transactions, onPairClick, onQuickMatchAnon }: TransactionListProps) {
  if (transactions.length === 0) {
    return (
      <div className="bg-white rounded-3xl border border-gray-100 p-12 text-center shadow-sm">
        <h3 className="text-xl font-bold text-gray-400">Nenašli sa žiadne transakcie</h3>
        <p className="text-sm text-gray-400 mt-2">Pre zadané filtre neexistuje žiadny záznam z banky.</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
      <table className="w-full text-left">
        <thead>
          <tr className="bg-gray-50/50 border-b border-gray-100 text-[10px] font-black uppercase tracking-widest text-gray-400">
            <th className="px-6 py-4">Smer / Dátum</th>
            <th className="px-6 py-4">Protiúčet / Meno</th>
            <th className="px-6 py-4">Suma</th>
            <th className="px-6 py-4">Symboly / Správa</th>
            <th className="px-6 py-4 text-right">Stav spárovania</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {transactions.map((tx) => {
            const isCredit = tx.direction === 'credit'
            
            return (
              <tr key={tx.id} className="hover:bg-blue-50/20 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                      isCredit ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {isCredit ? <ArrowDownRight size={16} /> : <ArrowUpRight size={16} />}
                    </div>
                    <div>
                      <div className="text-sm font-bold text-gray-900">
                        {new Date(tx.booking_date).toLocaleDateString('sk-SK')}
                      </div>
                      <div className="text-xs text-gray-500 uppercase tracking-wide">
                        {isCredit ? 'Príjem' : 'Výdaj'}
                      </div>
                    </div>
                  </div>
                </td>
                
                <td className="px-6 py-4">
                  {tx.counterparty_name ? (
                     <div className="text-sm font-bold text-gray-900">{tx.counterparty_name}</div>
                  ) : (
                     <div className="text-sm italic text-gray-400">Neznámy partner</div>
                  )}
                  <div className="text-xs font-mono text-gray-500 mt-0.5">{tx.counterparty_iban || 'Banka'}</div>
                </td>
                
                <td className="px-6 py-4">
                  <span className={`text-base font-black ${isCredit ? 'text-green-600' : 'text-gray-900'}`}>
                    {isCredit ? '+' : '-'}{tx.amount.toFixed(2)} {tx.currency}
                  </span>
                </td>
                
                <td className="px-6 py-4">
                  <div className="flex flex-col gap-1 text-xs">
                    {(tx.variable_symbol || tx.specific_symbol) && (
                      <div className="flex gap-2">
                         {tx.variable_symbol && <span className="px-1.5 py-0.5 bg-gray-100 text-gray-600 font-mono rounded">VS:{tx.variable_symbol}</span>}
                         {tx.specific_symbol && <span className="px-1.5 py-0.5 bg-gray-100 text-gray-600 font-mono rounded">SS:{tx.specific_symbol}</span>}
                      </div>
                    )}
                    {tx.remittance_info && (
                      <span className="text-gray-500 max-w-[200px] truncate" title={tx.remittance_info}>
                        {tx.remittance_info}
                      </span>
                    )}
                  </div>
                </td>
                
                <td className="px-6 py-4 text-right">
                  {tx.matched ? (
                     <div className="flex flex-col items-end">
                       <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-green-50 text-green-700 text-xs font-bold">
                         <CheckCircle2 size={14} /> Spárované
                       </span>
                       {tx.donors && (
                          <span className="text-[10px] text-gray-400 font-bold mt-1 uppercase tracking-wide">
                            {tx.donors.first_name} {tx.donors.last_name}
                          </span>
                       )}
                       {isCredit && (
                         <button
                           onClick={() => onPairClick(tx)}
                           className="mt-2 text-[10px] text-blue-600 font-bold hover:underline transition-all"
                         >
                           Opraviť spárovanie
                         </button>
                       )}
                     </div>
                  ) : (
                     isCredit ? (
                       <div className="flex flex-col gap-2 items-end">
                          <button 
                            onClick={() => onPairClick(tx)}
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 text-sm font-bold transition-colors shadow-sm w-full justify-center"
                          >
                            <UserPlus size={16} /> Spárovať ručne
                          </button>
                          <button
                             onClick={async () => {
                                onQuickMatchAnon(tx)
                             }}
                             className="px-4 py-1.5 bg-orange-100 hover:bg-orange-200 text-orange-700 text-[10px] font-black rounded-lg transition-all w-full text-center"
                          >
                             DARY (Anonymné)
                          </button>
                       </div>
                     ) : (
                       <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-100 text-gray-500 text-xs font-bold">
                         Výdavok
                       </span>
                     )
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
