import React from "react";

export function ConnectivityBadge() {
  const [ok, setOk] = React.useState<null | boolean>(null);
  const [msg, setMsg] = React.useState<string>("");
  const base =
    (import.meta as any).env?.DEV ? "/api" :
    ((import.meta as any).env?.VITE_VX_API_BASE || "(unset)");

  async function ping() {
    setOk(null);
    setMsg("");
    try {
      const r = await fetch(`${base}/sign-upload`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: "ping.txt", content_type: "text/plain" }),
      });
      setOk(r.ok);
      if (!r.ok) setMsg(`HTTP ${r.status}`);
    } catch (e: any) {
      setOk(false);
      setMsg(String(e?.message || e));
    }
  }

  React.useEffect(() => { ping(); }, []);

  return (
    <div style={{fontSize:12, opacity:.9, display:'flex', gap:8, alignItems:'center'}}>
      <span>API Base: <code>{base}</code></span>
      <span>·</span>
      <span>Status:{" "}
        <strong style={{color: ok==null?"#aaa": ok?"#22c55e":"#ef4444"}}>
          {ok==null?"…": ok?"OK":"FAIL"}
        </strong>
      </span>
      <button onClick={ping} style={{marginLeft:6, fontSize:12, padding:'2px 8px'}}>Retry</button>
      {msg && <span style={{color:'#fca5a5'}}>· {msg}</span>}
    </div>
  );
}
