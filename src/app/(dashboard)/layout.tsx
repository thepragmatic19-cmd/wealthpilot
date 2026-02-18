import { createClient } from '@/lib/supabase/server';
import { ErrorBoundary } from "@/components/error-boundary";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import type { Profile } from "@/types/database";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let profile: Profile | null = null;

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();
      profile = data as Profile | null;
    }
  } catch (err) {
    console.error("Error loading profile:", err);
  }

  return (
    <DashboardShell profile={profile}>
      <ErrorBoundary>
        {children}
      </ErrorBoundary>
    </DashboardShell>
  );
}
