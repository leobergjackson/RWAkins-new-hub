import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/utils/supabase/middleware";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://kubryx.vercel.app",
  "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const isApiRoute = path.startsWith("/api");

  // Health check and any other unauthenticated routes must bypass Supabase
  // session refresh — otherwise a missing NEXT_PUBLIC_SUPABASE_URL env var
  // throws and Render's health probe sees 500.
  if (path === "/api/health") {
    return NextResponse.next();
  }

  if (isApiRoute && request.method === "OPTIONS") {
    return new NextResponse(null, { status: 204, headers: corsHeaders });
  }

  let response: NextResponse;
  try {
    response = await updateSession(request);
  } catch (err) {
    console.warn("[middleware] supabase updateSession failed:", err);
    response = NextResponse.next();
  }

  if (isApiRoute) {
    Object.entries(corsHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/health|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
