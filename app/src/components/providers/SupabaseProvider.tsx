// Adaptované z lectio.one SupabaseProvider
'use client'

import { createClient } from '@/lib/supabase/client'
import type { Session, SupabaseClient } from '@supabase/supabase-js'
import { createContext, useContext, useEffect, useState } from 'react'

type SupabaseContext = {
  supabase: SupabaseClient
  session: Session | null
  isLoading: boolean
  sessionChecked: boolean
}

const Context = createContext<SupabaseContext | undefined>(undefined)

export default function SupabaseProvider({
  children,
  session,
}: {
  children: React.ReactNode
  session: Session | null
}) {
  const [supabase] = useState(() => createClient())
  const [currentSession, setCurrentSession] = useState<Session | null>(session)
  const [isLoading, setIsLoading] = useState(true)
  const [sessionChecked, setSessionChecked] = useState(false)
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
    supabase.auth.getSession().then(({ data: { session: cachedSession } }) => {
      setCurrentSession(cachedSession)
      setSessionChecked(true)
      setIsLoading(false)
    }).catch(() => {
      setSessionChecked(true)
      setIsLoading(false)
    })
  }, [supabase])

  useEffect(() => {
    if (!isMounted) return
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') return
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED' || event === 'PASSWORD_RECOVERY') {
        setCurrentSession(newSession)
        setSessionChecked(true)
        setIsLoading(false)
      }
    })
    return () => subscription.unsubscribe()
  }, [supabase, isMounted])

  if (!isMounted) {
    return (
      <Context.Provider value={{ supabase, session: null, isLoading: true, sessionChecked: false }}>
        {children}
      </Context.Provider>
    )
  }

  return (
    <Context.Provider value={{ supabase, session: currentSession, isLoading, sessionChecked }}>
      {children}
    </Context.Provider>
  )
}

export const useSupabase = () => {
  const context = useContext(Context)
  if (context === undefined) {
    throw new Error('useSupabase must be used inside SupabaseProvider')
  }
  return context
}
