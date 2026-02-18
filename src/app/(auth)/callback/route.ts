import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Allowed redirect paths (must start with /)
function isValidRedirectPath(path: string): boolean {
  // Must start with / and not with // (protocol-relative URL)
  // Must not contain @ (user info in URL)
  return path.startsWith("/") && !path.startsWith("//") && !path.includes("@");
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/onboarding";

  // Validate redirect path to prevent open redirect attacks
  const safePath = isValidRedirectPath(next) ? next : "/onboarding";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("onboarding_completed")
          .eq("id", user.id)
          .maybeSingle();

        if (profile?.onboarding_completed) {
          return NextResponse.redirect(`${origin}/dashboard`);
        }
      }
      return NextResponse.redirect(`${origin}${safePath}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}
