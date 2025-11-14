"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "@/hooks/useSession";
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarTrigger,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
} from "@/components/ui/sidebar";
import {
  LayoutDashboard,
  Users,
  FileText,
  ClipboardCheck,
  Gauge,
  Book,
  LineChart,
} from "lucide-react";
import { Header } from "./header";

const navItems = [
  { href: "/", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/catalog", icon: Book, label: "Product Catalog" },
  { href: "/users", icon: Users, label: "Users & Teams" },
  { href: "/lagam", icon: FileText, label: "Lagam Hub" },
  { href: "/production", icon: ClipboardCheck, label: "Production" },
  { href: "/reports", icon: LineChart, label: "Reports" },
  { href: "/control", icon: Gauge, label: "Control Tower" },
];

export function MainLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { session, isLoading } = useSession();

  useEffect(() => {
    if (!isLoading && !session.isLoggedIn && pathname !== '/login') {
      router.push('/login');
    }
    if (!isLoading && session.isLoggedIn && pathname === '/login') {
      router.push('/');
    }
  }, [isLoading, session.isLoggedIn, pathname, router]);

  if (isLoading || (!session.isLoggedIn && pathname !== '/login')) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-16 w-16 animate-spin rounded-full border-4 border-solid border-primary border-t-transparent"></div>
      </div>
    );
  }

  if (session.isLoggedIn && pathname === '/login') {
    return (
       <div className="flex h-screen items-center justify-center">
        <div className="h-16 w-16 animate-spin rounded-full border-4 border-solid border-primary border-t-transparent"></div>
      </div>
    );
  }

  if (!session.isLoggedIn && pathname === '/login') {
    return <>{children}</>;
  }
  
  if (!session.isLoggedIn) {
      return null
  }

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader className="p-4">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold">TULANTEX PM System</h1>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            {navItems.map((item) => {
              const isActive = pathname === item.href;

              return (
                <SidebarMenuItem key={item.href}>
                  <Link href={item.href}>
                    <SidebarMenuButton
                      isActive={isActive}
                      tooltip={item.label}
                    >
                      <item.icon />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </Link>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarContent>
      </Sidebar>
      <SidebarInset>
        <Header />
        <main className="p-4 sm:p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}