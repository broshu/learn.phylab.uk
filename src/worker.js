// learn.phylab.uk Worker
// Static pages come from public/. Only /api/* runs through this code.
export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // old address of the in-class part
    if (url.pathname === "/in-class" || url.pathname.startsWith("/in-class/")) {
      return Response.redirect(url.origin + "/during/" + url.pathname.replace(/^\/in-class\/?/, "") + url.search, 301);
    }

    if (url.pathname === "/api/health") {
      return Response.json({ ok: true, site: "learn.phylab.uk", time: new Date().toISOString() });
    }

    if (url.pathname.startsWith("/api/")) {
      return Response.json({ error: "not found" }, { status: 404 });
    }

    return env.ASSETS.fetch(request);
  },
};
