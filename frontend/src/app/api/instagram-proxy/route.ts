import { NextRequest, NextResponse } from 'next/server'
import https from 'https'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const targetUrl = searchParams.get('url')

  if (!targetUrl) {
    return new NextResponse('Missing url parameter', { status: 400 })
  }

  // Validasi URL hanya dari instagram atau cdn fbcdn
  try {
    const parsed = new URL(targetUrl)
    const validHosts = ['instagram.com', 'www.instagram.com', 'cdninstagram.com', 'fbcdn.net']
    const isAllowed = validHosts.some(h => parsed.hostname.endsWith(h))
    if (!isAllowed) {
      return new NextResponse('Invalid host', { status: 403 })
    }
  } catch {
    return new NextResponse('Malformed url', { status: 400 })
  }

  return new Promise<NextResponse>((resolve) => {
    function fetchWithRedirect(url: string, redirectCount = 0) {
      if (redirectCount > 5) {
        resolve(new NextResponse('Too many redirects', { status: 502 }))
        return
      }

      const req = https.get(
        url,
        {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'
          }
        },
        (res) => {
          if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            return fetchWithRedirect(res.headers.location, redirectCount + 1)
          }

          if (res.statusCode !== 200) {
            resolve(new NextResponse('Failed to fetch image from provider', { status: res.statusCode || 502 }))
            return
          }

          const chunks: Buffer[] = []
          res.on('data', (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)))
          res.on('end', () => {
            const buffer = Buffer.concat(chunks as any)
            const contentType = res.headers['content-type'] || 'image/jpeg'

            resolve(
              new NextResponse(buffer, {
                status: 200,
                headers: {
                  'Content-Type': contentType,
                  'Cache-Control': 'public, max-age=86400, stale-while-revalidate=43200'
                }
              })
            )
          })
        }
      )

      req.on('error', () => {
        resolve(new NextResponse('Internal connection error', { status: 500 }))
      })
    }

    fetchWithRedirect(targetUrl)
  })
}
