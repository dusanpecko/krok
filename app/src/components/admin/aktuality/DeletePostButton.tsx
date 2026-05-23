'use client'

import { useState, useTransition } from 'react'
import { Trash2, Loader2 } from 'lucide-react'
import { deletePost } from '@/app/admin/aktuality/actions'
import { useRouter } from 'next/navigation'

interface DeletePostButtonProps {
  id: string
  title: string
}

export default function DeletePostButton({ id, title }: DeletePostButtonProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const handleDelete = async () => {
    if (!confirm(`Naozaj chcete natrvalo vymazať článok „${title}“? \n\nTáto akcia taktiež vymaže všetky priradené obrázky a vygenerované audio nahrávky z Backblaze B2.`)) {
      return
    }

    startTransition(async () => {
      setError(null)
      try {
        const result = await deletePost(id)
        if (result.success) {
          router.refresh()
        } else {
          setError(result.error || 'Nepodarilo sa zmazať príspevok')
          alert(result.error || 'Nepodarilo sa zmazať príspevok')
        }
      } catch (err: any) {
        setError(err.message || 'Nastala neočakávaná chyba')
        alert(err.message || 'Nastala neočakávaná chyba')
      }
    })
  }

  return (
    <button
      onClick={handleDelete}
      disabled={isPending}
      className="flex items-center gap-1 text-xs font-black text-red-600 hover:text-red-800 disabled:opacity-50 transition-colors bg-red-50 hover:bg-red-100/80 px-3 py-1.5 rounded-xl cursor-pointer"
    >
      {isPending ? (
        <Loader2 size={12} className="animate-spin" />
      ) : (
        <Trash2 size={12} />
      )}
      Zmazať
    </button>
  )
}
