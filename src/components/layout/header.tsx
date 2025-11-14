
"use client";

import { SidebarTrigger } from "@/components/ui/sidebar";
import { ModeToggle } from "../mode-toggle";
import { UserNav } from "./user-nav";

export function Header() {
    return (
        <header className="sticky top-0 z-10 flex h-14 items-center justify-between gap-4 border-b bg-background/80 px-4 backdrop-blur-sm sm:px-6 md:justify-end">
            <SidebarTrigger className="md:hidden" />
            <div className="flex items-center gap-2">
                <ModeToggle />
                <UserNav />
            </div>
        </header>
    );
}
