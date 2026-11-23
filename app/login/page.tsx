export const dynamic = "force-dynamic";

export default async function Login({ searchParams }: { searchParams: Promise<{ error?: string; next?: string }> }) {
  const sp = await searchParams;
  return (
    <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#fff" }}>
      <form method="POST" action="/api/login" style={{ width: 320, display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ color: "#3667F6", fontWeight: 700, letterSpacing: "0.02em" }}>©OMPANY POLICY</div>
        <div style={{ fontSize: 12, letterSpacing: "0.08em", color: "#666" }}>STATE OF AFFAIRS</div>
        <input type="hidden" name="next" value={sp.next || "/"} />
        <input name="password" type="password" placeholder="Password" autoFocus required
          style={{ padding: "12px 14px", border: "1px solid #ccc", borderRadius: 8, fontSize: 15 }} />
        {sp.error && <div style={{ color: "#D93B2B", fontSize: 13 }}>Wrong password, try again.</div>}
        <button type="submit" style={{ padding: "12px 14px", background: "#3667F6", color: "#fff", border: 0, borderRadius: 8, fontSize: 13, letterSpacing: "0.06em", cursor: "pointer" }}>
          ENTER
        </button>
      </form>
    </main>
  );
}
