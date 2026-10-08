import { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const camId = searchParams.get('cam_id') || searchParams.get('camId') || 'cam-1'
    const pythonUrl = `http://127.0.0.1:8089/video_feed?cam_id=${encodeURIComponent(camId)}`
    const res = await fetch(pythonUrl, {
      cache: 'no-store',
      headers: {
        'Accept': 'multipart/x-mixed-replace, image/jpeg, */*',
      },
    })

    if (!res.ok || !res.body) {
      return new Response('Microservice video stream not ready', { status: 503 })
    }

    const reader = res.body.getReader()
    const safeStream = new ReadableStream({
      async start(controller) {
        try {
          while (true) {
            const { done, value } = await reader.read()
            if (done) {
              try { controller.close() } catch {}
              break
            }
            controller.enqueue(value)
          }
        } catch {
          // Tangani koneksi terputus/ECONNRESET dari sumber python tanpa menyebabkan unhandled pipe error
          try {
            controller.close()
          } catch {}
        } finally {
          try {
            reader.releaseLock()
          } catch {}
        }
      },
      cancel() {
        try {
          reader.cancel()
        } catch {}
      }
    })

    return new Response(safeStream, {
      status: 200,
      headers: {
        'Content-Type': res.headers.get('Content-Type') || 'multipart/x-mixed-replace; boundary=frame',
        'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0',
        'X-Accel-Buffering': 'no',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
      },
    })
  } catch (error: any) {
    return new Response(`Stream error: ${error?.message || 'Cannot reach FaceNet service'}`, { status: 502 })
  }
}
