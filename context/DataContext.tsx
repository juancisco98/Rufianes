import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import {
    Barbershop,
    Barber,
    Service,
    Client,
    HaircutSession,
    ShiftClosing,
    AppNotification,
    LigaEntry,
    LigaConfig,
    LigaClient,
    LigaMonthlyClosing,
} from '../types';
import {
    DbHaircutSessionRow,
    DbShiftClosingRow,
    DbNotificationRow,
    DbLigaEntryRow,
    DbLigaConfigRow,
    DbLigaClientRow,
    DbLigaMonthlyClosingRow,
} from '../types/dbRows';
import { supabase } from '../services/supabaseClient';
import {
    dbToBarbershop,
    dbToBarber,
    dbToService,
    dbToClient,
    dbToHaircutSession,
    dbToShiftClosing,
    dbToNotification,
    dbToLigaEntry,
    dbToLigaConfig,
    dbToLigaClient,
    dbToLigaMonthlyClosing,
} from '../utils/mappers';
import { handleError } from '../utils/errorHandler';
import { SESSIONS_LOAD_DAYS } from '../constants';
import { toast } from 'sonner';
import { Scissors, CheckCircle } from 'lucide-react';

interface DataContextType {
    barbershops: Barbershop[];
    setBarbershops: React.Dispatch<React.SetStateAction<Barbershop[]>>;
    barbers: Barber[];
    setBarbers: React.Dispatch<React.SetStateAction<Barber[]>>;
    services: Service[];
    setServices: React.Dispatch<React.SetStateAction<Service[]>>;
    clients: Client[];
    setClients: React.Dispatch<React.SetStateAction<Client[]>>;
    sessions: HaircutSession[];
    setSessions: React.Dispatch<React.SetStateAction<HaircutSession[]>>;
    shiftClosings: ShiftClosing[];
    setShiftClosings: React.Dispatch<React.SetStateAction<ShiftClosing[]>>;
    ligaEntries: LigaEntry[];
    setLigaEntries: React.Dispatch<React.SetStateAction<LigaEntry[]>>;
    ligaConfigs: LigaConfig[];
    setLigaConfigs: React.Dispatch<React.SetStateAction<LigaConfig[]>>;
    ligaMonthlyClosings: LigaMonthlyClosing[];
    setLigaMonthlyClosings: React.Dispatch<React.SetStateAction<LigaMonthlyClosing[]>>;
    ligaClients: LigaClient[];
    setLigaClients: React.Dispatch<React.SetStateAction<LigaClient[]>>;
    notifications: AppNotification[];
    unreadCount: number;
    markNotificationRead: (id: string) => Promise<void>;
    markAllNotificationsRead: () => Promise<void>;
    isLoading: boolean;
    refreshData: () => Promise<void>;
    initBarberMode: (barbershopId: string) => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [barbershops, setBarbershops] = useState<Barbershop[]>([]);
    const [barbers, setBarbers] = useState<Barber[]>([]);
    const [services, setServices] = useState<Service[]>([]);
    const [clients, setClients] = useState<Client[]>([]);
    const [sessions, setSessions] = useState<HaircutSession[]>([]);
    const [shiftClosings, setShiftClosings] = useState<ShiftClosing[]>([]);
    const [notifications, setNotifications] = useState<AppNotification[]>([]);
    const [ligaEntries, setLigaEntries] = useState<LigaEntry[]>([]);
    const [ligaConfigs, setLigaConfigs] = useState<LigaConfig[]>([]);
    const [ligaMonthlyClosings, setLigaMonthlyClosings] = useState<LigaMonthlyClosing[]>([]);
    const [ligaClients, setLigaClients] = useState<LigaClient[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Filtro de barbería: cuando está seteado, las queries y eventos realtime
    // se limitan a esa barbería (modo BARBER). Null = sin filtro (modo ADMIN).
    const barbershopFilterRef = useRef<string | null>(null);

    const unreadCount = notifications.filter(n => !n.read).length;

    const markNotificationRead = useCallback(async (id: string) => {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
        await supabase.from('notifications').update({ read: true }).eq('id', id);
    }, []);

    const markAllNotificationsRead = useCallback(async () => {
        const unreadIds = notifications.filter(n => !n.read).map(n => n.id);
        if (unreadIds.length === 0) return;
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        await supabase.from('notifications').update({ read: true }).in('id', unreadIds);
    }, [notifications]);

    const loadData = async (barbershopId?: string) => {
        setIsLoading(true);
        try {
            // Ventana de carga: últimos N días para sessions y shift_closings
            const dateFrom = new Date();
            dateFrom.setDate(dateFrom.getDate() - SESSIONS_LOAD_DAYS);
            const dateCutoff = dateFrom.toISOString();

            // Queries de sesiones y cierres — filtradas por barbería en modo BARBER
            let sessionsQuery = supabase
                .from('haircut_sessions').select('*')
                .gte('started_at', dateCutoff)
                .order('started_at', { ascending: false });
            let closingsQuery = supabase
                .from('shift_closings').select('*')
                .gte('shift_date', dateCutoff.slice(0, 10))
                .order('shift_date', { ascending: false });

            // Liga: cargar entries de los últimos 90 días + config + cierres mensuales
            let ligaEntriesQuery = supabase
                .from('liga_entries').select('*')
                .gte('created_at', dateCutoff)
                .order('created_at', { ascending: false });
            let ligaConfigsQuery = supabase.from('liga_config').select('*');
            let ligaClosingsQuery = supabase
                .from('liga_monthly_closings').select('*')
                .order('month', { ascending: false }).limit(24);
            let ligaClientsQuery = supabase
                .from('liga_clients').select('*')
                .order('code', { ascending: true });

            if (barbershopId) {
                sessionsQuery = sessionsQuery.eq('barbershop_id', barbershopId);
                closingsQuery = closingsQuery.eq('barbershop_id', barbershopId);
                ligaEntriesQuery = ligaEntriesQuery.eq('barbershop_id', barbershopId);
                ligaConfigsQuery = ligaConfigsQuery.eq('barbershop_id', barbershopId);
                ligaClosingsQuery = ligaClosingsQuery.eq('barbershop_id', barbershopId);
                ligaClientsQuery = ligaClientsQuery.eq('barbershop_id', barbershopId);
            }

            const [
                barbershopsResult,
                barbersResult,
                servicesResult,
                sessionsResult,
                shiftClosingsResult,
                notificationsResult,
            ] = await Promise.all([
                supabase.from('barbershops').select('*').order('name', { ascending: true }),
                supabase.from('barbers').select('*').order('name', { ascending: true }),
                supabase.from('services').select('*').order('name', { ascending: true }),
                sessionsQuery,
                closingsQuery,
                supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(50),
            ]);

            if (barbershopsResult.error) throw barbershopsResult.error;
            if (barbersResult.error) throw barbersResult.error;
            if (servicesResult.error) throw servicesResult.error;

            if (barbershopsResult.data) setBarbershops(barbershopsResult.data.map(dbToBarbershop));
            if (barbersResult.data) setBarbers(barbersResult.data.map(dbToBarber));
            if (servicesResult.data) setServices(servicesResult.data.map(dbToService));
            if (sessionsResult.data) setSessions(sessionsResult.data.map(dbToHaircutSession));
            if (shiftClosingsResult.data) setShiftClosings(shiftClosingsResult.data.map(dbToShiftClosing));
            if (notificationsResult.data) setNotifications(notificationsResult.data.map(dbToNotification));

            // Liga: best-effort, no bloquea la app si las tablas no existen aún (migración pendiente)
            try {
                const [ligaEntriesResult, ligaConfigsResult, ligaClosingsResult, ligaClientsResult] = await Promise.all([
                    ligaEntriesQuery,
                    ligaConfigsQuery,
                    ligaClosingsQuery,
                    ligaClientsQuery,
                ]);
                if (ligaEntriesResult.data) setLigaEntries(ligaEntriesResult.data.map(dbToLigaEntry));
                if (ligaConfigsResult.data) setLigaConfigs(ligaConfigsResult.data.map(dbToLigaConfig));
                if (ligaClosingsResult.data) setLigaMonthlyClosings(ligaClosingsResult.data.map(dbToLigaMonthlyClosing));
                if (ligaClientsResult.data) setLigaClients(ligaClientsResult.data.map(dbToLigaClient));
            } catch (ligaErr) {
                console.warn('[DataContext] Tablas Liga no disponibles (¿migración aplicada?)', ligaErr);
            }

            // Clientes: tabla opcional, no bloquea la app si falta
            try {
                const clientsResult = await supabase.from('clients').select('*').order('name', { ascending: true });
                if (clientsResult.data) setClients(clientsResult.data.map(dbToClient));
            } catch {
                console.warn('[DataContext] Tabla clients no disponible');
            }

        } catch (error) {
            handleError(error, 'Error al cargar los datos. Por favor recargue la página.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadData();

        // Realtime: sesiones de corte
        const sessionsChannel = supabase
            .channel('haircut_sessions_realtime')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'haircut_sessions' },
                (payload) => {
                    // En modo BARBER, ignorar eventos de otras barberías.
                    // En DELETE, payload.new es vacío → usar payload.old.barbershop_id.
                    const filter = barbershopFilterRef.current;
                    if (filter) {
                        const shopId = payload.eventType === 'DELETE'
                            ? (payload.old as { barbershop_id?: string })?.barbershop_id
                            : (payload.new as { barbershop_id?: string })?.barbershop_id;
                        if (shopId && shopId !== filter) return;
                    }

                    if (payload.eventType === 'INSERT') {
                        setSessions(prev => {
                            if (prev.some(s => s.id === payload.new.id)) return prev;
                            return [dbToHaircutSession(payload.new as DbHaircutSessionRow), ...prev];
                        });
                    } else if (payload.eventType === 'UPDATE') {
                        setSessions(prev => prev.map(s =>
                            s.id === payload.new.id ? dbToHaircutSession(payload.new as DbHaircutSessionRow) : s
                        ));
                    } else if (payload.eventType === 'DELETE') {
                        setSessions(prev => prev.filter(s => s.id !== payload.old.id));
                    }
                }
            )
            .subscribe();

        // Realtime: cierres de turno
        const shiftClosingsChannel = supabase
            .channel('shift_closings_realtime')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'shift_closings' },
                (payload) => {
                    const filter = barbershopFilterRef.current;
                    if (filter) {
                        const shopId = payload.eventType === 'DELETE'
                            ? (payload.old as { barbershop_id?: string })?.barbershop_id
                            : (payload.new as { barbershop_id?: string })?.barbershop_id;
                        if (shopId && shopId !== filter) return;
                    }

                    if (payload.eventType === 'INSERT') {
                        setShiftClosings(prev => {
                            if (prev.some(c => c.id === payload.new.id)) return prev;
                            return [dbToShiftClosing(payload.new as DbShiftClosingRow), ...prev];
                        });
                    } else if (payload.eventType === 'UPDATE') {
                        setShiftClosings(prev => prev.map(c =>
                            c.id === payload.new.id ? dbToShiftClosing(payload.new as DbShiftClosingRow) : c
                        ));
                    } else if (payload.eventType === 'DELETE') {
                        setShiftClosings(prev => prev.filter(c => c.id !== payload.old.id));
                    }
                }
            )
            .subscribe();

        // Realtime: liga_entries
        const ligaEntriesChannel = supabase
            .channel('liga_entries_realtime')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'liga_entries' },
                (payload) => {
                    const filter = barbershopFilterRef.current;
                    if (filter) {
                        const shopId = payload.eventType === 'DELETE'
                            ? (payload.old as { barbershop_id?: string })?.barbershop_id
                            : (payload.new as { barbershop_id?: string })?.barbershop_id;
                        if (shopId && shopId !== filter) return;
                    }
                    if (payload.eventType === 'INSERT') {
                        setLigaEntries(prev => {
                            if (prev.some(e => e.id === payload.new.id)) return prev;
                            return [dbToLigaEntry(payload.new as DbLigaEntryRow), ...prev];
                        });
                    } else if (payload.eventType === 'UPDATE') {
                        setLigaEntries(prev => prev.map(e =>
                            e.id === payload.new.id ? dbToLigaEntry(payload.new as DbLigaEntryRow) : e
                        ));
                    } else if (payload.eventType === 'DELETE') {
                        setLigaEntries(prev => prev.filter(e => e.id !== payload.old.id));
                    }
                }
            )
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'liga_config' },
                (payload) => {
                    if (payload.eventType === 'DELETE') {
                        setLigaConfigs(prev => prev.filter(c => c.barbershopId !== (payload.old as DbLigaConfigRow).barbershop_id));
                    } else {
                        const cfg = dbToLigaConfig(payload.new as DbLigaConfigRow);
                        setLigaConfigs(prev => {
                            const exists = prev.some(c => c.barbershopId === cfg.barbershopId);
                            return exists
                                ? prev.map(c => c.barbershopId === cfg.barbershopId ? cfg : c)
                                : [...prev, cfg];
                        });
                    }
                }
            )
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'liga_monthly_closings' },
                (payload) => {
                    const closing = dbToLigaMonthlyClosing(payload.new as DbLigaMonthlyClosingRow);
                    setLigaMonthlyClosings(prev => {
                        if (prev.some(c => c.id === closing.id)) return prev;
                        return [closing, ...prev];
                    });
                }
            )
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'liga_clients' },
                (payload) => {
                    const filter = barbershopFilterRef.current;
                    if (filter) {
                        const shopId = payload.eventType === 'DELETE'
                            ? (payload.old as { barbershop_id?: string })?.barbershop_id
                            : (payload.new as { barbershop_id?: string })?.barbershop_id;
                        if (shopId && shopId !== filter) return;
                    }
                    if (payload.eventType === 'INSERT') {
                        setLigaClients(prev => {
                            if (prev.some(c => c.id === payload.new.id)) return prev;
                            return [...prev, dbToLigaClient(payload.new as DbLigaClientRow)];
                        });
                    } else if (payload.eventType === 'UPDATE') {
                        setLigaClients(prev => prev.map(c =>
                            c.id === payload.new.id ? dbToLigaClient(payload.new as DbLigaClientRow) : c
                        ));
                    } else if (payload.eventType === 'DELETE') {
                        setLigaClients(prev => prev.filter(c => c.id !== payload.old.id));
                    }
                }
            )
            .subscribe();

        // Realtime: notificaciones
        const notificationsChannel = supabase
            .channel('notifications_realtime')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'notifications' },
                (payload) => {
                    const notif = dbToNotification(payload.new as DbNotificationRow);
                    setNotifications(prev => [notif, ...prev]);

                    if (notif.type === 'SHIFT_CLOSED') {
                        toast(notif.title, {
                            description: notif.message,
                            icon: React.createElement(CheckCircle, { className: 'w-4 h-4 text-emerald-500' }),
                            duration: 6000,
                        });
                    } else if (notif.type === 'BARBER_ADDED') {
                        toast(notif.title, {
                            description: notif.message,
                            icon: React.createElement(Scissors, { className: 'w-4 h-4 text-indigo-500' }),
                            duration: 6000,
                        });
                    } else {
                        toast(notif.title, { description: notif.message, duration: 5000 });
                    }
                }
            )
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'notifications' },
                (payload) => {
                    setNotifications(prev => prev.map(n =>
                        n.id === payload.new.id ? dbToNotification(payload.new as DbNotificationRow) : n
                    ));
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(sessionsChannel);
            supabase.removeChannel(shiftClosingsChannel);
            supabase.removeChannel(notificationsChannel);
            supabase.removeChannel(ligaEntriesChannel);
        };
    }, []);

    const initBarberMode = useCallback(async (barbershopId: string) => {
        barbershopFilterRef.current = barbershopId;
        await loadData(barbershopId);
    }, []);

    return (
        <DataContext.Provider value={{
            barbershops, setBarbershops,
            barbers, setBarbers,
            services, setServices,
            clients, setClients,
            sessions, setSessions,
            shiftClosings, setShiftClosings,
            ligaEntries, setLigaEntries,
            ligaConfigs, setLigaConfigs,
            ligaMonthlyClosings, setLigaMonthlyClosings,
            ligaClients, setLigaClients,
            notifications,
            unreadCount,
            markNotificationRead,
            markAllNotificationsRead,
            isLoading,
            refreshData: loadData,
            initBarberMode,
        }}>
            {children}
        </DataContext.Provider>
    );
};

export const useDataContext = () => {
    const context = useContext(DataContext);
    if (!context) {
        throw new Error('useDataContext must be used within a DataProvider');
    }
    return context;
};
