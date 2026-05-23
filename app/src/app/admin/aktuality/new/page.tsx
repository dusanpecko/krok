import AktualityForm from '@/components/admin/aktuality/AktualityForm'

export default function NewPostPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <h1 className="text-xl font-black text-gray-900">Nový článok</h1>
        <p className="text-xs text-gray-400 font-bold mt-1">Vytvorte novú aktualitu a doplňte ju o hlasové predčítanie pre darcov.</p>
      </div>
      <AktualityForm />
    </div>
  )
}
