'use client';

import React, { useState, useEffect } from 'react';
import { Heart, QrCode, Copy, FileText, CreditCard, Loader2, AlertCircle } from 'lucide-react';
import { motion, useReducedMotion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { getPaymentQrCode } from '@/app/(public)/actions';
import { getRegistrationFormOptions } from '@/app/(public)/registracia/actions';
import { startOnlineDonation, getMyOnlineSubscriptions, type MyOnlineSubscription } from '@/app/(public)/platby/actions';
import { useSupabase } from '@/components/providers/SupabaseProvider';
import RecurringChoice, { type RecurringChoiceValue } from '@/components/public/RecurringChoice';

// Bankový účet fondu KROK (Fio banka)
const KROK_IBAN = 'SK0483300000002901688673';
const KROK_IBAN_FORMATTED = KROK_IBAN.replace(/(.{4})/g, '$1 ').trim();

interface Props {
  /** HTML id sekcie (kotva, napr. #dar) – zároveň prefix id polí formulára */
  id?: string;
  kicker?: string;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  /** Doplnkové triedy sekcie (pozadie) */
  className?: string;
}

/**
 * Darovacia sekcia fondu KROK: výber sumy (7/14/21 € alebo vlastná), mesačne / jednorazovo,
 * a platobné okno – karta cez Mollie alebo prevod (IBAN, VS, PAY by square QR).
 * Funguje aj bez prihlásenia (anonymný dar). Používa sa na domovskej stránke a pri registrácii.
 */
export default function DonationSection({
  id = 'dar',
  kicker = 'Pozvanie',
  title = <>Vstúpte do Veľkej rodiny <br />malých darcov</>,
  subtitle = 'Váš dar je investíciou do duchovného zdravia našej diecézy. Vyberte si výšku daru a staňte sa stabilným pilierom pastoračného fondu KROK.',
  className = 'bg-white/5',
}: Props) {
  // Stav pre darovací formulár
  const [isMonthly, setIsMonthly] = useState(true);
  const [selectedTier, setSelectedTier] = useState<number | 'custom'>(14);
  const [customAmount, setCustomAmount] = useState<string>('');
  // Údaje darcu – všetko nepovinné (dá sa darovať aj anonymne)
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [parishId, setParishId] = useState('');
  const [parishes, setParishes] = useState<{ id: string; name: string }[]>([]);
  useEffect(() => {
    let cancelled = false;
    getRegistrationFormOptions()
      .then((o) => { if (!cancelled) setParishes(o.parishes); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [copiedIBAN, setCopiedIBAN] = useState(false);

  // Online platba kartou (Mollie)
  const { session } = useSupabase();
  const [donorEmail, setDonorEmail] = useState('');
  const [payLoading, setPayLoading] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);

  useEffect(() => {
    if (session?.user?.email && !donorEmail) setDonorEmail(session.user.email);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.email]);

  // Prihlásený darca: existujúce pravidelné dary (upozornenie) + jeho variabilný symbol
  const [mySubs, setMySubs] = useState<MyOnlineSubscription[]>([]);
  const [recurringChoice, setRecurringChoice] = useState<RecurringChoiceValue>({ mode: 'replace', replaceId: null });
  useEffect(() => {
    if (!isModalOpen || !session?.user) return;
    let cancelled = false;
    getMyOnlineSubscriptions().then((subs) => {
      if (cancelled) return;
      // Modál na domovskej je všeobecná podpora fondu – predplatné na výzvy sa nenahrádzajú
      const general = subs.filter((s) => !s.project_id);
      setMySubs(general);
      setRecurringChoice({ mode: 'replace', replaceId: general[0]?.id ?? null });
    });
    return () => { cancelled = true; };
  }, [isModalOpen, session?.user]);

  // PAY by square QR pre prevod (jednorazový príkaz / mesačný trvalý príkaz) + VS darcu
  const [myVS, setMyVS] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!isModalOpen) return;
    let cancelled = false;
    // currentAmount je deklarované až nižšie – suma sa tu odvodí priamo zo stavu
    const amount = selectedTier === 'custom' ? (Number(customAmount) || 0) : selectedTier;
    getPaymentQrCode({ amount, recurring: isMonthly }).then((qr) => {
      if (cancelled || !qr) return;
      setQrDataUrl(qr.dataUrl);
      setMyVS(qr.variableSymbol);
    });
    return () => { cancelled = true; };
  }, [isModalOpen, selectedTier, customAmount, isMonthly, session?.user]);

  const prefersReducedMotion = useReducedMotion();

  // Získanie výšky daru
  const currentAmount = selectedTier === 'custom' ? (Number(customAmount) || 0) : selectedTier;

  // Zobrazenie zvolenej sumy
  const cardAmountDisplay = currentAmount > 0 ? `${currentAmount} €` : "0 €";

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedIBAN(true);
    setTimeout(() => setCopiedIBAN(false), 2000);
  };

  // Založí platbu u Mollie a presmeruje na platobnú bránu
  const handleCardPayment = async () => {
    setPayError(null);
    if (currentAmount < 1) {
      setPayError('Minimálna suma daru je 1 €.');
      return;
    }
    setPayLoading(true);
    const replacing = isMonthly && mySubs.length > 0 && recurringChoice.mode === 'replace' && !!recurringChoice.replaceId;
    const res = await startOnlineDonation({
      amount: currentAmount,
      recurring: isMonthly,
      interval: 'month',
      email: donorEmail,
      firstName,
      lastName,
      parishId: parishId || null,
      replaceSubscriptionId: replacing ? recurringChoice.replaceId : null,
    });
    if (res.success) {
      window.location.href = res.url;
      return;
    }
    setPayError(res.error);
    setPayLoading(false);
  };

  return (
    <>
    {/* =========================================================================
        DAROVACIA SEKCIA (výber sumy + platobné okno)
        ========================================================================= */}
    <section id={id} className={`relative py-28 md:py-36 border-t border-white/5 overflow-hidden ${className}`}>
      
      {/* Pozadie */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue/10 blur-[150px] pointer-events-none rounded-full" />
      <div className="absolute bottom-0 right-0 w-[300px] h-[300px] bg-gold/5 blur-[100px] pointer-events-none rounded-full" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        <div className="max-w-3xl mx-auto text-center mb-16">
          <div className="flex items-center justify-center gap-3 text-gold kicker uppercase tracking-widest text-xs font-extrabold mb-3">
            <span className="w-8 h-[2px] bg-gold rounded-full" />
            <span>{kicker}</span>
            <span className="w-8 h-[2px] bg-gold rounded-full" />
          </div>
          <h2 className="text-3xl md:text-5xl font-light text-white leading-tight">
            {title}
          </h2>
          <p className="text-zinc-350 text-base md:text-lg mt-4 max-w-2xl mx-auto leading-relaxed font-light">
            {subtitle}
          </p>
        </div>

        <div className="max-w-2xl mx-auto">
          
          {/* Platobný a darovací formulár */}
          <div className="bg-white/5 border border-white/10 rounded-3xl p-6 md:p-8 backdrop-blur-sm">
            
            {/* Prepínač: Mesačne vs. Jednorazovo */}
            <div className="flex bg-blue-deep/60 p-1 rounded-xl border border-white/5 mb-8">
              <button
                onClick={() => { setIsMonthly(true); if (selectedTier === 'custom') setSelectedTier(14); }}
                className={`flex-1 py-3 text-sm font-extrabold rounded-lg transition-all ${
                  isMonthly 
                    ? 'bg-blue text-white shadow-md' 
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Pravidelne (Mesačne)
              </button>
              <button
                onClick={() => { setIsMonthly(false); }}
                className={`flex-1 py-3 text-sm font-extrabold rounded-lg transition-all ${
                  !isMonthly 
                    ? 'bg-blue text-white shadow-md' 
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Jednorazovo
              </button>
            </div>

            {/* Výber výšky daru (Tiers) */}
            <div className="space-y-4 mb-6">
              <label className="text-xs uppercase tracking-widest text-zinc-400 font-extrabold block">
                Zvoľte výšku Vášho príspevku
              </label>
              
              <div className="grid grid-cols-3 gap-3">
                {[7, 14, 21].map((tier) => (
                  <button
                    key={tier}
                    onClick={() => { setSelectedTier(tier); setCustomAmount(''); }}
                    className={`py-4 rounded-xl text-lg font-extrabold border transition-all ${
                      selectedTier === tier
                        ? 'bg-gold/15 border-gold text-gold-bright shadow-lg shadow-gold/5'
                        : 'bg-blue-deep/80 border-white/5 hover:border-white/20 text-zinc-400 hover:text-white'
                    }`}
                  >
                    {tier} €
                  </button>
                ))}
              </div>

              {/* Tlačidlo pre vlastnú sumu */}
              <button
                onClick={() => setSelectedTier('custom')}
                className={`w-full py-3.5 rounded-xl text-sm font-extrabold border transition-all ${
                  selectedTier === 'custom'
                    ? 'bg-gold/15 border-gold text-gold-bright'
                    : 'bg-blue-deep/80 border-white/5 text-zinc-400 hover:text-white'
                }`}
              >
                Zadať vlastnú sumu
              </button>

              {/* Input pre vlastnú sumu */}
              <AnimatePresence>
                {selectedTier === 'custom' && (
                  <motion.div
                    initial={prefersReducedMotion ? { opacity: 1, height: 'auto' } : { opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={prefersReducedMotion ? { opacity: 0, height: 0 } : { opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="relative mt-2">
                      <input
                        type="number"
                        value={customAmount}
                        onChange={(e) => setCustomAmount(e.target.value)}
                        placeholder="Zadajte ľubovoľnú sumu"
                        className="w-full bg-blue-deep border border-white/10 focus:border-gold-bright focus:ring-1 focus:ring-gold-bright rounded-xl py-3 px-4 text-white text-base outline-none pr-12 font-mono"
                        min="1"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 font-extrabold">€</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Meno darcu (nepovinné) */}
            <div className="space-y-3 mb-8">
              <p className="text-xs uppercase tracking-widest text-zinc-400 font-extrabold">
                Vaše údaje <span className="normal-case tracking-normal font-medium text-zinc-500">(nepovinné – môžete darovať aj anonymne)</span>
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  id={`${id}-first-name`}
                  type="text"
                  maxLength={50}
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Meno"
                  aria-label="Meno"
                  autoComplete="given-name"
                  className="w-full bg-blue-deep border border-white/10 focus:border-blue rounded-xl py-3.5 px-4 text-white text-sm outline-none transition-colors"
                />
                <input
                  id={`${id}-last-name`}
                  type="text"
                  maxLength={50}
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Priezvisko"
                  aria-label="Priezvisko"
                  autoComplete="family-name"
                  className="w-full bg-blue-deep border border-white/10 focus:border-blue rounded-xl py-3.5 px-4 text-white text-sm outline-none transition-colors"
                />
              </div>
              {parishes.length > 0 && (
                <select
                  id={`${id}-parish`}
                  value={parishId}
                  onChange={(e) => setParishId(e.target.value)}
                  aria-label="Farnosť"
                  className={`w-full bg-blue-deep border border-white/10 focus:border-blue rounded-xl py-3.5 px-4 text-sm outline-none transition-colors cursor-pointer ${parishId ? 'text-white' : 'text-zinc-500'}`}
                >
                  <option value="">Farnosť (nepovinné)</option>
                  {parishes.map((p) => (
                    <option key={p.id} value={p.id} className="text-white">{p.name}</option>
                  ))}
                </select>
              )}
            </div>

            {/* Hlavné tlačidlo "Darovať" */}
            <button
              onClick={() => setIsModalOpen(true)}
              disabled={currentAmount <= 0}
              className="w-full py-4.5 bg-gradient-to-r from-gold via-gold-bright to-gold hover:from-gold hover:to-gold-bright text-blue-deep font-extrabold text-lg rounded-2xl shadow-xl hover:shadow-gold/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 border border-gold/20"
            >
              <Heart size={20} className="fill-current" />
              Darovať {cardAmountDisplay} {isMonthly && '/ mesačne'}
            </button>

            {/* Sekundárne alternatívy pod formulárom */}
            <div className="mt-8 pt-6 border-t border-white/5 grid grid-cols-2 gap-4">
              
              {/* Možnosť 1: 2% z dane */}
              <button 
                onClick={() => {
                  alert("Informácie k darovaniu 2% z Vašej dane z príjmu. Údaje priebežného prijímateľa: Pastoračný fond KROK, Žilinská diecéza.");
                }}
                className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-left transition-all"
              >
                <div className="w-10 h-10 bg-blue-deep text-zinc-400 rounded-lg flex items-center justify-center border border-white/10 shrink-0">
                  <FileText size={18} />
                </div>
                <div>
                  <span className="text-xs text-white font-extrabold block">Pravidelný donorský program</span>
                  <span className="text-[10px] text-zinc-500 block">Stiahnuť vyhlásenie</span>
                </div>
              </button>

              {/* Možnosť 2: Iné formy podpory */}
              <button 
                onClick={() => setIsModalOpen(true)}
                className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-left transition-all"
              >
                <div className="w-10 h-10 bg-blue-deep text-zinc-400 rounded-lg flex items-center justify-center border border-white/10 shrink-0">
                  <QrCode size={18} />
                </div>
                <div>
                  <span className="text-xs text-white font-extrabold block">Bankový prevod / QR</span>
                  <span className="text-[10px] text-zinc-500 block">Zobraziť IBAN a kód</span>
                </div>
              </button>

            </div>

          </div>

        </div>

      </div>
    </section>

    {/* =========================================================================
        MODÁLNE OKNO S INFORMÁCIAMI K PLATBE
        ========================================================================= */}
    <AnimatePresence>
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          
          {/* Overlay s blur efektom */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsModalOpen(false)}
            className="absolute inset-0 bg-blue-deep/90 backdrop-blur-sm"
          />

          {/* Samotné telo modálu */}
          <motion.div 
            initial={prefersReducedMotion ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.95, y: 20 }}
            className="relative bg-blue-deep border border-white/10 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl z-10"
          >
            
            {/* Hlavička modálu */}
            <div className="p-6 border-b border-white/10 bg-white/5 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <Heart className="text-gold-bright fill-gold-bright" size={24} />
                <h3 className="text-xl font-extrabold text-white">Ďakujeme za Váš KROK</h3>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* Telo modálu */}
            <div className="p-6 space-y-6">
              
              <p className="text-zinc-300 text-sm leading-relaxed font-light">
                Ste krôčik od vstupu do našej rodiny darcov. Zaplaťte bezpečne kartou online, alebo pošlite dar priamo cez Váš internet banking pomocou platobných údajov nižšie.
              </p>

              {/* Zobrazenie platobnej sumy */}
              <div className="p-4 rounded-2xl bg-white/5 text-center border border-white/10 space-y-1">
                <div className="text-xs text-zinc-500 uppercase tracking-widest font-mono font-extrabold">Suma k úhrade</div>
                <div className="text-3xl font-extrabold text-white">
                  {cardAmountDisplay} {isMonthly && '/ mesačne'}
                </div>
              </div>

              {/* Platba kartou online (Mollie) */}
              <div className="space-y-3 p-4 rounded-2xl bg-gold/5 border border-gold/20">
                <label htmlFor={`${id}-email`} className="text-xs uppercase tracking-widest text-zinc-400 font-extrabold block">
                  Váš e-mail (pre potvrdenie platby)
                </label>
                <input
                  id={`${id}-email`}
                  type="email"
                  value={donorEmail}
                  onChange={(e) => setDonorEmail(e.target.value)}
                  placeholder="meno@priklad.sk"
                  autoComplete="email"
                  className="w-full bg-blue-deep border border-white/10 focus:border-gold-bright rounded-xl py-3 px-4 text-white text-sm outline-none transition-colors"
                />
                {isMonthly && (
                  <RecurringChoice
                    subscriptions={mySubs}
                    newAmount={currentAmount}
                    value={recurringChoice}
                    onChange={setRecurringChoice}
                  />
                )}
                {payError && (
                  <div className="flex items-start gap-2 text-xs text-red-200">
                    <AlertCircle size={14} className="shrink-0 mt-0.5" /> {payError}
                  </div>
                )}
                <button
                  onClick={handleCardPayment}
                  disabled={payLoading || currentAmount < 1 || !donorEmail}
                  className="w-full py-3.5 bg-gradient-to-r from-gold via-gold-bright to-gold text-blue-deep font-extrabold text-sm rounded-xl shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {payLoading ? <Loader2 size={18} className="animate-spin" /> : <CreditCard size={18} />}
                  {payLoading ? 'Presmerúvame na platobnú bránu…' : `Zaplatiť kartou ${cardAmountDisplay}${isMonthly ? ' mesačne' : ''}`}
                </button>
                <p className="text-[10px] text-zinc-500 text-center">
                  Karta, Apple Pay, Google Pay – cez Mollie. {isMonthly && 'Pravidelný dar môžete kedykoľvek zrušiť vo svojom profile.'}
                </p>
              </div>

              <div className="flex items-center gap-3 text-[10px] uppercase tracking-widest text-zinc-500 font-extrabold">
                <div className="flex-1 h-px bg-white/10" /> alebo prevodom <div className="flex-1 h-px bg-white/10" />
              </div>

              {/* Prevodné údaje */}
              <div className="space-y-4">
                
                {/* IBAN */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-zinc-500 font-mono">Číslo účtu (IBAN)</span>
                    <button 
                      onClick={() => copyToClipboard(KROK_IBAN)}
                      className="text-xs text-gold-bright hover:text-gold flex items-center gap-1.5 font-medium"
                    >
                      <Copy size={12} />
                      {copiedIBAN ? 'Skopírované!' : 'Kopírovať'}
                    </button>
                  </div>
                  <div className="p-3.5 bg-white/5 border border-white/10 rounded-xl text-sm font-mono text-white select-all">
                    {KROK_IBAN_FORMATTED}
                  </div>
                </div>

                {/* Ostatné údaje */}
                <div className="grid grid-cols-2 gap-4">
                  
                  {/* Variabilný symbol – vlastný VS darcu z jeho profilu */}
                  <div>
                    <span className="text-xs text-zinc-500 font-mono block mb-1">Variabilný symbol</span>
                    {myVS ? (
                      <div className="p-3 bg-white/5 border border-white/10 rounded-xl text-sm font-mono text-white select-all">
                        {myVS}
                      </div>
                    ) : (
                      <a
                        href={session ? '/profil' : '/registracia'}
                        className="block p-3 bg-white/5 border border-white/10 rounded-xl text-xs text-zinc-300 hover:text-white hover:border-gold/40 transition-colors leading-snug"
                      >
                        {session
                          ? 'Váš VS nájdete v profile →'
                          : 'Váš vlastný VS získate registráciou →'}
                      </a>
                    )}
                  </div>

                  {/* Konštantný symbol */}
                  <div>
                    <span className="text-xs text-zinc-500 font-mono block mb-1">Konštantný symbol</span>
                    <div className="p-3 bg-white/5 border border-white/10 rounded-xl text-sm font-mono text-zinc-300">
                      0558
                    </div>
                  </div>

                </div>

              </div>

              {/* PAY by square QR kód – reálne platobné údaje (IBAN, suma, VS, KS) */}
              <div className="pt-2 flex flex-col items-center justify-center space-y-3">
                <div className="relative w-40 h-40 bg-white p-1.5 rounded-2xl border border-zinc-800 flex items-center justify-center">
                  {qrDataUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={qrDataUrl} alt="PAY by square QR kód na úhradu daru" className="w-full h-full object-contain" />
                  ) : (
                    <QrCode size={110} className="text-zinc-300 animate-pulse" />
                  )}
                  {/* Tiny watermark logotypu v strede QR kódu */}
                  <div className="absolute w-9 h-9 bg-white rounded-lg flex items-center justify-center border border-zinc-200 overflow-hidden p-1">
                    <Image
                      src="/logo/logo_c.webp"
                      alt="KROK"
                      width={28}
                      height={28}
                      className="w-auto h-full object-contain"
                    />
                  </div>
                </div>
                <div className="text-center">
                  <span className="text-xs text-white font-bold block">Naskenujte v bankovej aplikácii (PAY by square)</span>
                  <span className="text-[10px] text-zinc-500">
                    {isMonthly
                      ? 'QR nastaví príjemcu, sumu a váš VS – v banke ho uložte ako trvalý príkaz (mesačne)'
                      : 'QR nastaví príjemcu, sumu a váš variabilný symbol'}
                  </span>
                </div>
              </div>

            </div>

            {/* Päta modálu */}
            <div className="p-6 bg-white/5 border-t border-white/10 flex justify-between items-center text-xs text-zinc-500">
              <span>Platba je bezpečná a transparentná</span>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="px-5 py-2.5 bg-white/10 text-zinc-300 font-bold rounded-xl border border-white/10 hover:bg-white/20 hover:text-white"
              >
                Rozumiem, hotovo
              </button>
            </div>

          </motion.div>

        </div>
      )}
    </AnimatePresence>
    </>
  );
}
