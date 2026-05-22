import { ArrowRight, HandHeart, Landmark, ShieldCheck } from 'lucide-react'
import Link from 'next/link'

export default function HomePage() {
  return (
    <div className="space-y-32 mb-32">
      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <h1 className="text-5xl lg:text-7xl font-black text-gray-900 leading-tight mb-6">
              Tvoj <span className="text-blue-600">KROK</span> k lepšej diecéze.
            </h1>
            <p className="text-xl text-gray-600 mb-10 leading-relaxed">
              Podporujeme pastoračné projekty a aktivity v Žilinskej diecéze. Darujte cielene a transparentne cez náš fond.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link 
                href="/registracia"
                className="px-8 py-4 bg-blue-600 text-white rounded-full text-lg font-bold shadow-xl hover:bg-blue-700 transition-all flex items-center justify-center gap-2 group"
              >
                Chcem podporiť <ArrowRight className="group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link 
                href="/projekty"
                className="px-8 py-4 bg-white text-gray-900 border-2 border-gray-100 rounded-full text-lg font-bold hover:border-blue-600 transition-all flex items-center justify-center"
              >
                Zobraziť projekty
              </Link>
            </div>
          </div>
          
          <div className="relative">
             <div className="aspect-square bg-gradient-to-tr from-blue-100 via-yellow-50 to-red-50 rounded-3xl relative overflow-hidden flex items-center justify-center shadow-2xl">
                {/* Placeholder content for now - the user's logo identity is abstract enough to present as modern Art */}
                <div className="text-[200px] font-black opacity-10 select-none">K</div>
                <div className="absolute inset-0 bg-white/40 backdrop-blur-[2px]" />
                <div className="relative p-12 text-center">
                   <Landmark size={80} className="text-blue-600 mx-auto mb-6" />
                   <h3 className="text-3xl font-bold text-gray-900">Spoločne tvoríme <br/>živú Cirkev</h3>
                </div>
             </div>
             {/* Decorative badges */}
             <div className="absolute -bottom-6 -left-6 bg-white p-6 rounded-2xl shadow-xl border border-gray-100 flex items-center gap-4">
                <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
                   <ShieldCheck size={24} />
                </div>
                <div>
                   <p className="text-sm font-bold text-gray-900">100% Transparentné</p>
                   <p className="text-xs text-gray-500">Každý cent ide na účel</p>
                </div>
             </div>
          </div>
        </div>
      </section>

      {/* Stats / Info section */}
      <section className="bg-gray-50 py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {[
              {
                icon: HandHeart,
                title: "Darcovská zóna",
                desc: "Majte prehľad o svojich daroch, spravujte si potvrdenia pre daňové účely a sledujte projekty."
              },
              {
                icon: Landmark,
                title: "Podpora farností",
                desc: "Financujeme opravy, mládežnícke aktivity a charitatívne diela v 112 farnostiach našej diecézy."
              },
              {
                icon: ShieldCheck,
                title: "Dôvera",
                desc: "Sme oficiálny fond Žilinskej diecézy zriadený pre transparentnú správu milodarov."
              }
            ].map((feature, i) => (
              <div key={i} className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 hover:shadow-lg transition-shadow">
                <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-6">
                  <feature.icon size={32} />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">{feature.title}</h3>
                <p className="text-gray-600 leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Call to action */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center bg-blue-600 rounded-[3rem] py-20 relative overflow-hidden">
         <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
         <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-700/50 rounded-full translate-y-1/2 -translate-x-1/2" />
         
         <div className="relative z-10">
            <h2 className="text-4xl lg:text-5xl font-black text-white mb-8">Staňte sa súčasťou <br/>fondového spoločenstva</h2>
            <p className="text-blue-100 text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
               Váš pravidelný dar nám umožňuje plánovať pomoc dlhodobo. Krok za krokom k budovaniu pastoračných diel.
            </p>
            <Link 
              href="/prihlasenie"
              className="inline-flex items-center px-10 py-5 bg-white text-blue-600 rounded-full text-xl font-bold shadow-2xl hover:bg-gray-100 transition-all"
            >
              Vstúpiť do zóny
            </Link>
         </div>
      </section>
    </div>
  )
}
