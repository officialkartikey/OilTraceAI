import middleware from "next-auth/middleware";
export default middleware;

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (API routes for next-auth)
     * - login
     * - signup
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api/auth|login|signup|_next/static|_next/image|favicon.ico).*)',
  ],
}
