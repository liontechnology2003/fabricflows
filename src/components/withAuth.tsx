
"use client";

import { useSession } from "@/hooks/use-session";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function withAuth<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  allowedRoles: string[]
) {
  const WithAuth: React.FC<P> = (props) => {
    const { session, loading } = useSession();
    const router = useRouter();

    useEffect(() => {
      if (!loading && !session.isLoggedIn) {
        router.push("/login");
      }

      if (!loading && session.isLoggedIn && !allowedRoles.includes(session.role)) {
        router.push("/denied-access");
      }
    }, [loading, session, router]);

    if (loading || !session.isLoggedIn || !allowedRoles.includes(session.role)) {
      return <div>Loading...</div>;
    }

    return <WrappedComponent {...props} />;
  };

  return WithAuth;
}
