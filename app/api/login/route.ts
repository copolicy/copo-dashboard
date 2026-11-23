import { NextResponse } from "next/server";

async function hash(s: string) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(d)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function POST(req: Request) {
  const form = await req.formData();
  const given = String(form.get("password") || "");
  let next = String(form.get("next") || "/");
  if (!next.startsWith("/") || next.startsWith("//")) next = "/";
  const pw = process.env.DASHBOARD_PASSWORD || "";
  const base = new URL(req.url);
  if (!pw || given !== pw) {
    const u = new URL("/login", base);
    u.searchParams.set("error", "1");
    if (next !== "/") u.searchParams.set("next", next);
    return NextResponse.redirect(u, 303);
  }
  const res = NextResponse.redirect(new URL(next, base), 303);
  res.cookies.set("copo_auth", await hash(pw), {
    httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}
