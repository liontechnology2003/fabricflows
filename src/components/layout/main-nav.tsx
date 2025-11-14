'use client';

import Link from 'next/link';
import { useSession } from '@/hooks/useSession';
import { cn } from '@/lib/utils';

export function MainNav({ className, ...props }: React.HTMLAttributes<HTMLElement>) {
    const { session } = useSession();

    return (
        <nav className={cn("flex items-center space-x-4 lg:space-x-6", className)} {...props}>
            <Link href="/" className="text-sm font-medium transition-colors hover:text-primary">
                Dashboard
            </Link>
            <Link href="/catalog" className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary">
                Catalog
            </Link>
            <Link href="/production" className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary">
                Production
            </Link>
            <Link href="/reports" className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary">
                Reports
            </Link>
            {session.isLoggedIn && (session.role === 'Admin' || session.role === 'Manager') && (
                 <Link href="/admin/user-management" className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary">
                    Users
                </Link>
            )}
        </nav>
    );
}