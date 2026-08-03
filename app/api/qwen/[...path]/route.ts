const DASHSCOPE_BASE = "https://dashscope-intl.aliyuncs.com"

// Proxy all DashScope requests server-side so the API key never reaches the browser.
async function proxy(req: Request, params: Promise<{ path: string[] }>) {
  const apiKey = process.env.DASHSCOPE_API_KEY
  if (!apiKey) {
    return Response.json(
      { error: "DASHSCOPE_API_KEY غير مضبوط — أضفه من إعدادات المشروع (Vars)" },
      { status: 500 },
    )
  }

  const { path } = await params
  const url = new URL(req.url)
  const target = `${DASHSCOPE_BASE}/${path.join("/")}${url.search}`

  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
  }
  const contentType = req.headers.get("content-type")
  if (contentType) headers["Content-Type"] = contentType
  const dsAsync = req.headers.get("x-dashscope-async")
  if (dsAsync) headers["X-DashScope-Async"] = dsAsync

  const upstream = await fetch(target, {
    method: req.method,
    headers,
    body: req.method === "GET" || req.method === "HEAD" ? undefined : req.body,
    // @ts-expect-error - duplex is required for streaming request bodies
    duplex: "half",
  })

  // Stream the response straight through (supports SSE streaming + audio blobs)
  return new Response(upstream.body, {
    status: upstream.status,
    headers: {
      "Content-Type": upstream.headers.get("content-type") ?? "application/json",
      "Cache-Control": "no-store",
    },
  })
}

export async function GET(req: Request, ctx: { params: Promise<{ path: string[] }> }) {
  return proxy(req, ctx.params)
}

export async function POST(req: Request, ctx: { params: Promise<{ path: string[] }> }) {
  return proxy(req, ctx.params)
}

export const maxDuration = 300
