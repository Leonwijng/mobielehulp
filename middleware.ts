import { type NextRequest, NextResponse } from "next/server"

const locales = ["nl", "en", "de", "fr"]
const defaultLocale = "nl"

function getLocale(request: NextRequest): string {
  // Check if locale is in the pathname
  const pathname = request.nextUrl.pathname
  const pathnameLocale = locales.find((locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`)

  if (pathnameLocale) return pathnameLocale

  // Check Accept-Language header
  const acceptLanguage = request.headers.get("accept-language")
  if (acceptLanguage) {
    const preferredLocale = acceptLanguage
      .split(",")
      .map((locale) => locale.split(";")[0].trim())
      .find((locale) => locales.includes(locale.split("-")[0]))

    if (preferredLocale) {
      return preferredLocale.split("-")[0]
    }
  }

  return defaultLocale
}

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // Skip middleware for static files and API routes
  if (pathname.startsWith("/_next") || pathname.startsWith("/api") || pathname.includes(".")) {
    return
  }

  // /nl/... is dezelfde pagina als /...: één adres, zodat Google ze niet als dubbel ziet.
  if (pathname === "/nl" || pathname.startsWith("/nl/")) {
    const zonder = new URL(pathname.slice(3) || "/", request.url)
    zonder.search = request.nextUrl.search
    return NextResponse.redirect(zonder, 308)
  }

  // De Engelse, Duitse en Franse versies blijven bruikbaar, maar gaan niet in Google.
  const pathnameHasLocale = locales.some((locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`)
  if (pathnameHasLocale) {
    const response = NextResponse.next()
    response.headers.set("X-Robots-Tag", "noindex, follow")
    return response
  }

  // Route requests without an explicit locale
  const locale = getLocale(request)
  const newUrl = new URL(`/${locale}${pathname}`, request.url)

  // Keep the default locale on the root path without forcing /nl in the URL
  if (locale === defaultLocale) {
    return NextResponse.rewrite(newUrl)
  }

  // Non-default locales still get redirected to their prefixed path
  return NextResponse.redirect(newUrl)
}

export const config = {
  matcher: ["/((?!_next|api|favicon.ico).*)"],
}
