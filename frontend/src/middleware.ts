import middleware from "next-auth/middleware";
export default middleware;

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes and backend proxy)
     * - login
     * - signup
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|login|signup|_next/static|_next/image|favicon.ico).*)',
  ],
}
