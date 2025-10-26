import { NextResponse, NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  return NextResponse.redirect(new URL('/home', request.url))
}

const runtime = 'edge'
const config = {
  matcher: '/api/:path*',
}

export { runtime, config }