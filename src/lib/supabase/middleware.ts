import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Protected routes
  // Public API routes (no auth required)
  const isPublicApi = pathname.startsWith('/api/auth/') || pathname.startsWith('/api/billing/webhook');

  const isProtectedRoute = !isPublicApi && (
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/onboarding') ||
    pathname.startsWith('/portfolio') ||
    pathname.startsWith('/transactions') ||
    pathname.startsWith('/fiscal') ||
    pathname.startsWith('/retirement') ||
    pathname.startsWith('/achievements') ||
    pathname.startsWith('/billing') ||
    pathname.startsWith('/profile') ||
    pathname.startsWith('/chat') ||
    pathname.startsWith('/api/')
  );

  const isAuthRoute = pathname.startsWith('/login') || pathname.startsWith('/register');

  if (!user && isProtectedRoute) {
    // API routes should get a JSON 401, not a redirect
    if (pathname.startsWith('/api/')) {
      return new NextResponse(
        JSON.stringify({ error: "Non autorisé" }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  if (user && isAuthRoute) {
    const url = request.nextUrl.clone();
    // Check onboarding status
    const { data: profile } = await supabase
      .from('profiles')
      .select('onboarding_completed')
      .eq('id', user.id)
      .single();

    if (profile && !profile.onboarding_completed) {
      url.pathname = '/onboarding';
    } else {
      url.pathname = '/dashboard';
    }
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
