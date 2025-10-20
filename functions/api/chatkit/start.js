export async function onRequestPost({ request, env }) {
  try {
    const { OPENAI_API_KEY, CHATKIT_WORKFLOW_ID, CHATKIT_WORKFLOW_VERSION } = env;
    if (!OPENAI_API_KEY || !CHATKIT_WORKFLOW_ID) {
      return new Response("Faltan OPENAI_API_KEY o CHATKIT_WORKFLOW_ID", { status: 500 });
    }

    // Permitir regenerar sesión con ?reset=1
    const url = new URL(request.url);
    const forceNew = url.searchParams.get("reset") === "1";

    // Reutiliza un uid de cookie (o crea uno nuevo si reset=1)
    const cookie = request.headers.get("Cookie") || "";
    const m = !forceNew && cookie.match(/(?:^|;\s*)megafy_uid=([^;]+)/);
    const uid = m ? decodeURIComponent(m[1]) : `web-${crypto.randomUUID()}`;

    // Cuerpo mínimo válido para ChatKit Sessions
    const body = {
      workflow: CHATKIT_WORKFLOW_VERSION
        ? { id: CHATKIT_WORKFLOW_ID, version: CHATKIT_WORKFLOW_VERSION }
        : { id: CHATKIT_WORKFLOW_ID },
      user: uid,

      // ✅ Activar adjuntos nativos en el compositor2
      chatkit_configuration: {
        file_upload: {
          enabled: true
          // Opcional:
          accept: ["application/pdf", "image/*"],
          // max_files: 3,
          // multiple: true
        }
      }
    };

    const r = await fetch("https://api.openai.com/v1/chatkit/sessions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
        "OpenAI-Beta": "chatkit_beta=v1" // 👈 obligatorio para ChatKit
      },
      body: JSON.stringify(body)
    });

    const txt = await r.text();
    if (!r.ok) return new Response(`OpenAI ${r.status}: ${txt}`, { status: r.status });

    // Devolver client_secret y fijar cookie si hace falta
    const headers = new Headers({ "Content-Type": "application/json" });
    if (!m || forceNew) headers.set(
      "Set-Cookie",
      `megafy_uid=${encodeURIComponent(uid)}; Path=/; Max-Age=31536000; SameSite=Lax; Secure`
    );
    return new Response(txt, { headers });
  } catch (err) {
    return new Response(`Error al crear la sesión: ${err?.message || err}`, { status: 500 });
  }
}
