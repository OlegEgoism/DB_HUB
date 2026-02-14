// frontend/src/middleware/systemRequests.ts
export const SYSTEM_ROUTES = [
  '/.well-known/appspecific/com.chrome.devtools.json',
  '/favicon.ico',
  '/manifest.json',
  '/robots.txt',
];

export function isSystemRequest(pathname: string): boolean {
  return SYSTEM_ROUTES.some(route => pathname.includes(route));
}