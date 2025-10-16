// functions/api/chatkit/start.js
export async function onRequestPost({ request, env }) {
  try {
    const { CHATKIT_WORKFLOW_ID, CHATKIT_WORKFLOW_VERSION, OPENAI_API_KEY } = env;
    if (!OPENAI_API_KEY || !CHATKIT_WORKFLOW_ID) {
      return new Response("Faltan variables de entorno necesarias", { status: 500 });
    }

    // Reutiliza un uid por cookie (opcional pero aconsejado)
    const cookie = request.headers.get('Cookie') || '';
    const m = cookie.match(/(?:^|;\s*)megafy_uid=([^;]+)/);
    const uid = m ? decodeURIComponent(m[1]) : `web-${crypto.randomUUID()}`;

    // Body mínimo y válido para ChatKit Sessions
    const body = {
      workflow: CHATKIT_WORKFLOW_VERSION
        ? { id: CHATKIT_WORKFLOW_ID, version: CHATKIT_WORKFLOW_VERSION }
        : { id: CHATKIT_WORKFLOW_ID },
      user: uid,
      chatkit_configuration: {
        file_upload: { enabled: true } // 📎 activar adjuntos nativos
      }
    };

    const r = await fetch("https://api.openai.com/v1/chatkit/sessions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
        "OpenAI-Beta": "chatkit_beta=v1" // ← ¡OBLIGATORIO!
      },
      body: JSON.stringify(body)
    });

    const txt = await r.text();

    if (!r.ok) {
      return new Response(`OpenAI ${r.status}: ${txt}`, { status: r.status });
    }

    // Devolvemos tal cual (incluye { client_secret: ... })
    const headers = new Headers({ "Content-Type": "application/json" });
    if (!m) {
      headers.set("Set-Cookie",
        `megafy_uid=${encodeURIComponent(uid)}; Path=/; Max-Age=31536000; SameSite=Lax; Secure`);
    }
    return new Response(txt, { headers });
  } catch (err) {
    return new Response(`Error al crear la sesión: ${err?.message || err}`, { status: 500 });
  }
}
