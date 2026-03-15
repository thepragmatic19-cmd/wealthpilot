"use client";

import { useState } from "react";
import { Sidebar } from "@/components/dashboard/sidebar";
import { Topbar } from "@/components/dashboard/topbar";
import { MobileNav } from "@/components/dashboard/mobile-nav";
import { SimpleModeProvider } from "@/contexts/simple-mode-context";
import type { Profile } from "@/types/database";

interface DashboardShellProps {
    profile: Profile | null;
    children: React.ReactNode;
}

export function DashboardShell({ profile, children }: DashboardShellProps) {
    const [collapsed, setCollapsed] = useState(false);

    return (
        <SimpleModeProvider>
            <div className="flex h-dvh overflow-hidden">
                <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
                <div className="flex flex-1 flex-col overflow-hidden">
                    <Topbar profile={profile} />
                    <main className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6 pb-[4.5rem] md:pb-6">
                        {children}
                    </main>
                    <MobileNav />
                </div>
            </div>
        </SimpleModeProvider>
    );
}
