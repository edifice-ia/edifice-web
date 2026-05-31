import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  REVIEWER_SANDBOX_PATH,
  isReviewerUser,
} from "@/src/lib/auth/roles";
import { getSupabaseConfig } from "./config";

const reviewerAllowedPaths = [
  REVIEWER_SANDBOX_PATH,
  "/api/oauth/tiktok/start",
  "/api/oauth/tiktok/callback",
  "/api/oauth/tiktok/status",
  "/api/oauth/tiktok/upload-test",
];

const reviewerBlockedPrefixes = [
  "/demo",
  "/dashboard",
  "/interface",
  "/settings",
  "/api/demo",
  "/api/agents/demo-publisher",
  "/api/admin",
  "/api/meta",
  "/api/oauth",
  "/api/assistant",
  "/api/project-memory",
];

function isReviewerAllowedPath(pathname: string) {
  return reviewerAllowedPaths.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}

function isReviewerBlockedPath(pathname: string) {
  return reviewerBlockedPrefixes.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}

function redirectReviewerToDemo(request: NextRequest) {
  const target = new URL(REVIEWER_SANDBOX_PATH, request.url);
  target.searchParams.set("limited", "1");

  return NextResponse.redirect(target);
}

function redirectToLogin(request: NextRequest) {
  return NextResponse.redirect(new URL("/login", request.url));
}

export async function updateSession(request: NextRequest) {
  const config = getSupabaseConfig();
  let response = NextResponse.next({ request });

  if (!config) {
    return response;
  }

  const supabase = createServerClient(config.url, config.anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));

        response = NextResponse.next({ request });

        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });

        Object.entries(headers).forEach(([key, value]) => {
          response.headers.set(key, value);
        });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  if (!user && isReviewerAllowedPath(pathname)) {
    return redirectToLogin(request);
  }

  if (
    user &&
    isReviewerUser(user) &&
    isReviewerBlockedPath(pathname) &&
    !isReviewerAllowedPath(pathname)
  ) {
    return redirectReviewerToDemo(request);
  }

  return response;
}
