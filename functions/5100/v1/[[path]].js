export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const normalizedPath = url.pathname.replace(/\/+$/, "");

  if (normalizedPath === "/5100/v1" || normalizedPath === "/5100/v1/index.html") {
    const indexUrl = new URL(context.request.url);
    indexUrl.pathname = "/5100/v1-entry";
    const response = await context.env.ASSETS.fetch(new Request(indexUrl, context.request));
    const headers = new Headers(response.headers);
    headers.set("Cache-Control", "no-store, max-age=0, must-revalidate");
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  }

  return context.env.ASSETS.fetch(context.request);
}
