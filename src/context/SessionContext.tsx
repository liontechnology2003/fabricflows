
'use client';

import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { SessionData, defaultSession } from '@/lib/types';

interface SessionContextType {
    session: SessionData;
    isLoading: boolean;
    login: (userData: SessionData) => void;
    logout: () => void;
    refreshSession: () => Promise<void>;
}

export const SessionContext = createContext<SessionContextType>(
    { session: defaultSession, isLoading: true, login: () => {}, logout: () => {}, refreshSession: async () => {} }
);

export const SessionProvider = ({ children }: { children: ReactNode }) => {
    const [session, setSession] = useState<SessionData>(defaultSession);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchSession = async () => {
            try {
                const res = await fetch('/api/auth/user');
                if (res.ok) {
                    const data = await res.json();
                    setSession({ ...data, isLoggedIn: true });
                } else {
                    setSession(defaultSession);
                }
            } catch (error) {
                setSession(defaultSession);
            } finally {
                setIsLoading(false);
            }
        };

        fetchSession();
    }, []); // No specific dependencies here, call once on mount

    const refreshSession = async () => {
        setIsLoading(true);
        try {
            const res = await fetch('/api/auth/user');
            if (res.ok) {
                const data = await res.json();
                setSession({ ...data, isLoggedIn: true });
            } else {
                setSession(defaultSession);
            }
        } catch (error) {
            setSession(defaultSession);
        } finally {
            setIsLoading(false);
        }
    };

    const login = (userData: SessionData) => {
        setSession({ ...userData, isLoggedIn: true });
        refreshSession(); // Refresh session after login
    };

    const logout = async () => {
        await fetch('/api/auth/logout', { method: 'POST' });
        refreshSession(); // Refresh session after logout
    };

    return (
        <SessionContext.Provider value={{ session, isLoading, login, logout, refreshSession }}>
            {children}
        </SessionContext.Provider>
    );
};
