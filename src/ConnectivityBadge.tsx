import React from "react";

export function ConnectivityBadge() {
  const [ok, setOk] = React.useState<null | boolean>(null);
  const base = (import.meta as any).env?.DEV ? "/api"
    : ((import.meta as any).env?.VITE_VX_API_BASE || "(unset)");

  async function ping() {
    try {
      const r = await fetch(`${base}/sign-upload`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: "ping.txt", content_type: "text/plain" }),
      });
      setOk(r.ok);
    } catch { setOk(false); }
  }

  React.useEffect(() => { ping(); }, []);

  return (
    <div style={{fontSize:12,opacity:.85}}>
      API Base: <code>{base}</code> · Status:{" "}
      <span style={{color: ok==null?"#aaa": ok?"#22c55e":"#ef4444"}}>
        {ok==null?"…": ok?"OK":"FAIL"}
      </span>
      <button onClick={ping} style={{marginLeft:8,fontSize:12}}>Retry</button>
    </div>
  );
}
