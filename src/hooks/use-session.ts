
import { useState, useEffect } from 'react';
import { SessionData, defaultSession } from '@/lib/types';

export function useSession() {
  const [session, setSession] = useState<SessionData>(defaultSession);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSession() {
      try {
        const res = await fetch('/api/auth/user');
        if (res.ok) {
          const data = await res.json();
          setSession(data);
        } else {
          setSession(defaultSession);
        }
      } catch (error) {
        console.error('Failed to fetch session', error);
        setSession(defaultSession);
      } finally {
        setLoading(false);
      }
    }

    fetchSession();
  }, []);

  return { session, loading };
}
