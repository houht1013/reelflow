import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { localeMiddleware } from './middlewares/localeMiddleware';
import { authMiddleware } from './middlewares/authMiddleware';

export async function middleware(request: NextRequest) {
  const startTime = Date.now();
  const pathname = request.nextUrl.pathname;

  // Log middleware execution start
  console.log(`🚀 Middleware start for: ${pathname}`);

  // --- Skip static files and images --- 
  if (
    /^\/(_next|images)\/.*$/.test(pathname) ||
    pathname.includes('.') // This covers files like favicon.ico, manifest.json etc.
  ) {
    return NextResponse.next(); // Let these requests pass through
  }

  // --- Locale Handling --- 
  const localeStart = Date.now();
  const localeResponse = localeMiddleware(request);
  console.log(`⏱️ Locale middleware: ${Date.now() - localeStart}ms`);
  if (localeResponse) {
    console.log(`🔄 Locale redirect for: ${pathname}`);
    return localeResponse; // Redirect if locale is missing (primarily for pages)
  }

  // --- Authentication Check --- 
  const authStart = Date.now();
  const authResponse = await authMiddleware(request);
  console.log(`⏱️ Auth middleware: ${Date.now() - authStart}ms`);
  if (authResponse) {
    console.log(`🔒 Auth response for: ${pathname}`);
    return authResponse; // Redirect (pages) or return 401 (API) if auth fails
  }

  // --- Default: Continue Request --- 
  const totalTime = Date.now() - startTime;
  console.log(`✅ Middleware completed for: ${pathname} in ${totalTime}ms`);
  return NextResponse.next(); // If all checks pass, continue
}

export const config = {
  runtime: 'nodejs',
  // Matcher包含API路径以便进行权限检查，以及auth路径以便重定向已登录用户
  matcher: [
    // Skip all internal paths (_next) but include API routes for auth check and auth pages for redirect
    '/((?!_next|images|[\\w-]+\\.\\w+).*)',
  ],
};