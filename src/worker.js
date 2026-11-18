// learn.phylab.uk Worker
// Static pages come from public/. Only /, /api/* and old addresses run through this code.
import { handleAI } from "./ai.js";

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // old address of the in-class part
    if (url.pathname === "/in-class" || url.pathname.startsWith("/in-class/")) {
      return Response.redirect(url.origin + "/during/" + url.pathname.replace(/^\/in-class\/?/, "") + url.search, 301);
    }

    // the bare address opens straight on the lesson: Before class, step 1 (the check-in), without a home page first
    if (url.pathname === "/") {
      const page = await env.ASSETS.fetch(new Request(url.origin + "/before/", request));
      return new Response(page.body, page);
    }

    if (url.pathname === "/api/health") {
      return Response.json({ ok: true, site: "learn.phylab.uk", time: new Date().toISOString() });
    }

    if (url.pathname === "/api/mother" || url.pathname === "/api/brief") {
      return handleAI(request, env, ctx, url.pathname);
    }

    if (url.pathname.startsWith("/api/")) {
      return Response.json({ error: "not found" }, { status: 404 });
    }

    return env.ASSETS.fetch(request);
  },
};
