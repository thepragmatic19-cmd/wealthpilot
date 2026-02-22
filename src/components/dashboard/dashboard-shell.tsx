"use client";

import { useState } from "react";
import { Sidebar } from "@/components/dashboard/sidebar";
import { Topbar } from "@/components/dashboard/topbar";
import type { Profile } from "@/types/database";

interface DashboardShellProps {
    profile: Profile | null;
    children: React.ReactNode;
}

export function DashboardShell({ profile, children }: DashboardShellProps) {
    const [collapsed, setCollapsed] = useState(false);

    return (
        <div className="flex h-dvh overflow-hidden">
            <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
            <div className="flex flex-1 flex-col overflow-hidden">
                <Topbar profile={profile} />
                <main className="flex-1 overflow-y-auto p-4 md:p-6">
                    {children}
                </main>
            </div>
        </div>
    );
}
