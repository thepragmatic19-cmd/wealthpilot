"use client";

import { useState } from "react";
import { Sidebar } from "@/components/dashboard/sidebar";
import { Topbar } from "@/components/dashboard/topbar";
import { BottomNavBar } from "@/components/dashboard/bottom-nav-bar";
import type { Profile } from "@/types/database";

interface DashboardShellProps {
    profile: Profile | null;
    children: React.ReactNode;
}

export function DashboardShell({ profile, children }: DashboardShellProps) {
    const [collapsed, setCollapsed] = useState(false);

    return (
        <div className="flex h-screen overflow-hidden">
            <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
            <div className="flex flex-1 flex-col overflow-hidden">
                <Topbar profile={profile} />
                {/* pb-24 on mobile reserves space above the fixed bottom nav + iOS safe area */}
                <main className="flex-1 overflow-y-auto scroll-touch p-4 md:p-6 pb-24 md:pb-6">
                    {children}
                </main>
            </div>
            {/* Persistent bottom tab bar — visible only on < md */}
            <BottomNavBar />
        </div>
    );
}

