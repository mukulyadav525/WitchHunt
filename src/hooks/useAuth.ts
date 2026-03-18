import { useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'

export function useAuth() {
    const { user, profile, isLoading, setUser, setProfile, setLoading, clear } = useAuthStore()

    useEffect(() => {
        let mounted = true;

        const handleAuthChange = async (event: string, session: any) => {
            console.log('Auth Hook: Event ->', event, session?.user?.email)

            if (session?.user) {
                if (mounted) {
                    setUser(session.user)
                    // Fire-and-forget profile sync so it never blocks the UI
                    fetchProfile(session.user.id)
                }
            } else {
                if (mounted) {
                    clear()
                    setLoading(false)
                }
            }
        }

        // 1. Initial Sync
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session?.user) handleAuthChange('INITIAL', session)
            else setLoading(false)
        })

        // 2. Listener
        const { data: { subscription } } = supabase.auth.onAuthStateChange(handleAuthChange)

        return () => {
            mounted = false;
            subscription.unsubscribe()
        }
    }, [setUser, setLoading, clear])

    async function fetchProfile(userId: string) {
        if (!userId) return;
        console.log('Profile Sync: Starting for', userId)

        try {
            // Use a race with a timeout of 5 seconds to prevent eternal hangs
            const fetchPromise = supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single()

            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Sync Timeout')), 5000)
            )

            const { data, error } = await Promise.race([fetchPromise, timeoutPromise]) as any

            if (error) {
                console.warn('Profile Sync Error:', error.message)
                if (error.code === 'PGRST116') {
                    setProfile({ id: userId, role: 'citizen', email: 'unknown' } as any)
                }
            } else if (data) {
                console.log('Profile Sync: SUCCESS', data.role)
                setProfile(data)
            }
        } catch (err: any) {
            console.error('Profile Sync Failed:', err.message)
            // Default to citizen to unblock the UI
            setProfile({ id: userId, role: 'citizen', email: 'unknown' } as any)
        } finally {
            setLoading(false)
        }
    }

    async function signUp(email: string, password: string) {
        const { error } = await supabase.auth.signUp({
            email,
            password,
            options: { data: { role: 'citizen' } }
        })
        if (error) throw error
    }

    async function signIn(email: string, password: string) {
        console.log('Auth Service: Initiating Link...')
        const result = await supabase.auth.signInWithPassword({ email, password })
        if (result.error) throw result.error
        console.log('Auth Service: Link OK')
        return result.data
    }

    async function signOut() {
        await supabase.auth.signOut()
        clear()
    }

    return { user, profile, isLoading, signIn, signUp, signOut }
}
