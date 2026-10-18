export function onRequest() {
  return new Response("Page not found.", {
    status: 404,
    headers: {
      "Cache-Control": "no-store",
      "CDN-Cache-Control": "no-store",
      "X-Robots-Tag": "noindex, nofollow",
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}
