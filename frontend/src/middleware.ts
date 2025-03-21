import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtDecode } from 'jwt-decode';

// Define paths that require authentication
const protectedPaths = [
  '/dashboard',
  '/dashboard/owner',
  '/dashboard/investor',
  '/dashboard/tokens',
  '/profile',
];

// Define paths that require specific roles
const ownerPaths = ['/dashboard/owner'];
const investorPaths = ['/dashboard/investor'];

// Define common paths that can be accessed by both roles
const commonPaths = ['/dashboard/tokens'];

// Define paths that are public
const publicPaths = [
  '/',
  '/auth/login',
  '/auth/signup',
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('token')?.value;
  
  // Check if the path is protected
  const isProtectedPath = protectedPaths.some(path => pathname.startsWith(path));
  const isAuthPath = pathname.startsWith('/auth/');
  const isCommonPath = commonPaths.some(path => pathname.startsWith(path));
  
  // Enhanced redirect loop detection
  const referer = request.headers.get('referer');
  const hasRefererLoop = referer && new URL(referer).pathname === pathname;
  
  // Check for multiple redirects in a short time
  const redirectCount = request.cookies.get('redirect_count')?.value;
  const redirectTimestamp = request.cookies.get('redirect_timestamp')?.value;
  const now = Date.now();
  
  // If we detect a potential redirect loop, just continue without redirecting
  if (hasRefererLoop || (redirectCount && redirectTimestamp && 
      parseInt(redirectCount) > 3 && 
      now - parseInt(redirectTimestamp) < 5000)) {
    // Reset redirect tracking
    const response = NextResponse.next();
    response.cookies.delete('redirect_count');
    response.cookies.delete('redirect_timestamp');
    return response;
  }
  
  // Track redirects
  const newRedirectCount = redirectCount ? parseInt(redirectCount) + 1 : 1;
  const newTimestamp = now.toString();
  
  // If it's a protected path and there's no token, redirect to login
  if (isProtectedPath && !token) {
    // Extract role from the URL path for proper redirection
    let role = null;
    if (pathname.includes('/owner')) {
      role = 'owner';
    } else if (pathname.includes('/investor')) {
      role = 'investor';
    }
    
    const url = new URL('/auth/login', request.url);
    // Add role parameter if available
    if (role) {
      url.searchParams.set('role', role);
    }
    // Add a redirect parameter to return to the original page after login
    url.searchParams.set('redirect', pathname);
    
    const response = NextResponse.redirect(url);
    response.cookies.set('redirect_count', newRedirectCount.toString());
    response.cookies.set('redirect_timestamp', newTimestamp);
    return response;
  }
  
  // If there's a token, check role-specific paths
  if (token) {
    try {
      // Decode the token to get the user's role
      const decoded = jwtDecode<{ role: string }>(token);
      const userRole = decoded.role;
      
      // If it's an auth path and there's a token, redirect to appropriate dashboard
      if (isAuthPath) {
        // Don't redirect if the user is selecting a role
        const url = new URL(request.url);
        const hasRoleParam = url.searchParams.has('role');
        
        // Only redirect if we're not in the middle of role selection
        if (!hasRoleParam || pathname.includes('/auth/login') || pathname.includes('/auth/signup')) {
          const dashboardPath = userRole === 'investor' ? '/dashboard/investor' : '/dashboard/owner';
          
          const response = NextResponse.redirect(new URL(dashboardPath, request.url));
          response.cookies.set('redirect_count', newRedirectCount.toString());
          response.cookies.set('redirect_timestamp', newTimestamp);
          return response;
        }
      }
      
      // Check if user is trying to access a role-specific path they don't have access to
      if (!isCommonPath) {
        const isOwnerPath = ownerPaths.some(path => pathname.startsWith(path));
        const isInvestorPath = investorPaths.some(path => pathname.startsWith(path));
        
        if (isOwnerPath && userRole !== 'owner') {
          // Redirect investor trying to access owner pages
          const response = NextResponse.redirect(new URL('/dashboard/investor', request.url));
          response.cookies.set('redirect_count', newRedirectCount.toString());
          response.cookies.set('redirect_timestamp', newTimestamp);
          return response;
        }
        
        if (isInvestorPath && userRole !== 'investor') {
          // Redirect owner trying to access investor pages
          const response = NextResponse.redirect(new URL('/dashboard/owner', request.url));
          response.cookies.set('redirect_count', newRedirectCount.toString());
          response.cookies.set('redirect_timestamp', newTimestamp);
          return response;
        }
      }
      
      // If it's the root dashboard path, redirect to the role-specific dashboard
      if (pathname === '/dashboard') {
        const dashboardPath = userRole === 'investor' ? '/dashboard/investor' : '/dashboard/owner';
        
        const response = NextResponse.redirect(new URL(dashboardPath, request.url));
        response.cookies.set('redirect_count', newRedirectCount.toString());
        response.cookies.set('redirect_timestamp', newTimestamp);
        return response;
      }
    } catch (error) {
      // If token is invalid, remove it
      const response = NextResponse.next();
      response.cookies.delete('token');
      return response;
    }
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}; 