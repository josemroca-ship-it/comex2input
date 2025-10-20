export async function onRequestPost({ request, env }) {
  try {
    const { OPENAI_API_KEY, CHATKIT_WORKFLOW_ID, CHATKIT_WORKFLOW_VERSION } = env;
    if (!OPENAI_API_KEY || !CHATKIT_WORKFLOW_ID) {
      return new Response("Faltan OPENAI_API_KEY o CHATKIT_WORKFLOW_ID", { status: 500 });
    }

    // ?reset=1 para forzar nueva sesión
    const url = new URL(request.url);
    const forceNew = url.searchParams.get("reset") === "1";

    // Cookie uid persistente (o nueva si reset)
    const cookie = request.headers.get("Cookie") || "";
    const m = !forceNew && cookie.match(/(?:^|;\s*)megafy_uid=([^;]+)/);
    const uid = m ? decodeURIComponent(m[1]) : `web-${crypto.randomUUID()}`;

    const bodyForOpenAI = {
      workflow: CHATKIT_WORKFLOW_VERSION
        ? { id: CHATKIT_WORKFLOW_ID, version: CHATKIT_WORKFLOW_VERSION }
        : { id: CHATKIT_WORKFLOW_ID },
      user: uid,
      // 👇 Adjuntos nativos ON. SOLO enabled:true (nada más)
      chatkit_configuration: { file_upload: { enabled: true } }
    };

    const r = await fetch("https://api.openai.com/v1/chatkit/sessions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
        "OpenAI-Beta": "chatkit_beta=v1"
      },
      body: JSON.stringify(bodyForOpenAI)
    });

    const txt = await r.text();
    if (!r.ok) return new Response(`OpenAI ${r.status}: ${txt}`, { status: r.status });

    const headers = new Headers({ "Content-Type": "application/json" });
    if (!m || forceNew) {
      headers.set("Set-Cookie", `megafy_uid=${encodeURIComponent(uid)}; Path=/; Max-Age=31536000; SameSite=Lax; Secure`);
    }
    return new Response(txt, { headers });
  } catch (err) {
    return new Response(`Error al crear la sesión: ${err?.message || err}`, { status: 500 });
  }
}
