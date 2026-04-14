import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { logger } from '../utils/logger';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

let supabaseInstance: SupabaseClient | null = null;

if (supabaseUrl && supabaseAnonKey) {
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
            flowType: 'pkce',
            detectSessionInUrl: true,
            autoRefreshToken: true,
            persistSession: true,
        }
    });
    logger.log('[Supabase] Client initialized.');
} else {
    logger.warn('[Supabase] Missing env vars. Running in offline mode.');
}

// Fallback cuando faltan env vars: un query builder falso que soporta
// encadenamiento arbitrario (.select().eq().gte().order().limit().maybeSingle()…)
// y al final devuelve { data: [] | null, error }. También soporta channel/on/subscribe.
// Así la app no crashea con TypeError — solo muestra estado vacío.
const OFFLINE_ERROR = { message: 'Supabase not configured (Missing Envs)' };

type ThenableBuilder = {
    [key: string]: unknown;
    then: (resolve: (v: { data: null; error: typeof OFFLINE_ERROR }) => unknown) => unknown;
};

const makeOfflineBuilder = (): ThenableBuilder => {
    const builder: ThenableBuilder = new Proxy({} as ThenableBuilder, {
        get(_t, prop) {
            // Soporte await: si alguien hace `await supabase.from('x').select('*')`, esto resuelve.
            if (prop === 'then') {
                return (resolve: (v: { data: null; error: typeof OFFLINE_ERROR }) => unknown) =>
                    resolve({ data: null, error: OFFLINE_ERROR });
            }
            // Cualquier otro método (select, eq, gte, order, limit, maybeSingle, etc.)
            // devuelve el mismo builder para permitir encadenamiento.
            return () => builder;
        },
    });
    return builder;
};

const makeOfflineChannel = () => {
    const channel: { [k: string]: unknown } = {};
    channel.on = () => channel;
    channel.subscribe = () => channel;
    channel.unsubscribe = () => Promise.resolve('ok');
    return channel;
};

export const supabase: SupabaseClient = supabaseInstance || new Proxy({} as SupabaseClient, {
    get(_target, prop) {
        if (prop === 'from' || prop === 'rpc') {
            return () => makeOfflineBuilder();
        }
        if (prop === 'channel') {
            return () => makeOfflineChannel();
        }
        if (prop === 'removeChannel' || prop === 'removeAllChannels') {
            return () => Promise.resolve('ok');
        }
        if (prop === 'auth') {
            return {
                signInWithOAuth: () => Promise.resolve({ error: OFFLINE_ERROR }),
                signOut: () => Promise.resolve({ error: null }),
                onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => { } } } }),
                getSession: () => Promise.resolve({ data: { session: null }, error: null }),
                getUser: () => Promise.resolve({ data: { user: null }, error: null }),
            };
        }
        if (prop === 'storage') {
            return {
                from: () => ({
                    upload: () => Promise.resolve({ data: null, error: OFFLINE_ERROR }),
                    download: () => Promise.resolve({ data: null, error: OFFLINE_ERROR }),
                    getPublicUrl: () => ({ data: { publicUrl: '' } }),
                }),
            };
        }
        return () => makeOfflineBuilder();
    },
});

import { Capacitor } from '@capacitor/core';

export const signInWithGoogle = async () => {
    if (!supabaseInstance) return { error: { message: 'Supabase not configured' } };

    // Determine the redirect URL based on platform
    const isNative = Capacitor.isNativePlatform();
    const redirectToUrl = isNative ? 'com.rufianes.app://login-callback' : window.location.origin;

    const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
            redirectTo: redirectToUrl,
        },
    });
    return { data, error };
};

export const signOut = async () => {
    if (!supabaseInstance) return { error: { message: 'Supabase not configured' } };
    const { error } = await supabase.auth.signOut();
    return { error };
};
