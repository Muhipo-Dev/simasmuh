import { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const pythonUrl = 'http://127.0.0.1:8089/video_feed'
    const res = await fetch(pythonUrl, {
      cache: 'no-store',
      headers: {
        'Accept': 'multipart/x-mixed-replace, image/jpeg, */*',
      },
    })

    if (!res.ok || !res.body) {
      return new Response('Microservice video stream not ready', { status: 503 })
    }

    return new Response(res.body, {
      status: 200,
      headers: {
        'Content-Type': res.headers.get('Content-Type') || 'multipart/x-mixed-replace; boundary=frame',
        'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Access-Control-Allow-Origin': '*',
      },
    })
  } catch (error: any) {
    return new Response(`Stream error: ${error?.message || 'Cannot reach FaceNet service'}`, { status: 502 })
  }
}
