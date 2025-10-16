export async function onRequestPost({ request, env }) {
  try {
    if (!env.OPENAI_API_KEY) return new Response('Missing OPENAI_API_KEY', { status: 500 });
    if (!env.CHATKIT_WORKFLOW_ID) return new Response('Missing CHATKIT_WORKFLOW_ID', { status: 500 });

    // Identidad de usuario (cookie) para mantener la sesión
    const cookie = request.headers.get('Cookie') || '';
    const match  = cookie.match(/(?:^|;\s*)megafy_uid=([^;]+)/);
    const uid    = match ? decodeURIComponent(match[1]) : `web-${crypto.randomUUID()}`;

    const body = {
      workflow: { id: env.CHATKIT_WORKFLOW_ID },
      ...(env.CHATKIT_WORKFLOW_VERSION ? { version: env.CHATKIT_WORKFLOW_VERSION } : {}),
      user: uid,
      // 👇 Habilita capacidad de adjuntos en la sesión
      capabilities: {
        attachments: {
          enabled: true,
          // opcional: restringe tipos si quieres
          accept: ["application/pdf", "image/*", "text/plain"],
          multiple: true,
          max_files: 5
        }
      }
    };

    const r = await fetch("https://api.openai.com/v1/chatkit/sessions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
        "OpenAI-Beta": "chatkit_beta=v1"
      },
      body: JSON.stringify(body)
    });

    const txt = await r.text();
    if (!r.ok) return new Response(`OpenAI ${r.status}: ${txt}`, { status: r.status });

    const data = JSON.parse(txt || "{}");
    if (!data.client_secret) return new Response(`Missing client_secret. Raw: ${txt}`, { status: 500 });

    const headers = new Headers({ "Content-Type": "application/json" });
    if (!match) headers.set("Set-Cookie", `megafy_uid=${encodeURIComponent(uid)}; Path=/; Max-Age=31536000; SameSite=Lax; Secure`);
    return new Response(JSON.stringify({ client_secret: data.client_secret }), { headers });
  } catch (e) {
    return new Response(`Server error: ${e?.message || e}`, { status: 500 });
  }
}
