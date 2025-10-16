export async function onRequestPost({ request, env }) {
  try {
    const { OPENAI_API_KEY, CHATKIT_WORKFLOW_ID, CHATKIT_WORKFLOW_VERSION } = env;

    // Verificación básica
    if (!OPENAI_API_KEY || !CHATKIT_WORKFLOW_ID) {
      return new Response("Faltan variables de entorno", { status: 500 });
    }

    // ID de usuario (puede ser aleatorio)
    const uid = "web-" + crypto.randomUUID();

    // 🚀 Cuerpo de la petición
    const body = {
      workflow: CHATKIT_WORKFLOW_VERSION
        ? { id: CHATKIT_WORKFLOW_ID, version: CHATKIT_WORKFLOW_VERSION }
        : { id: CHATKIT_WORKFLOW_ID },
      user: uid,

      // ✅ Aquí se activa la subida de archivos
      chatkit_configuration: {
        file_upload: {
          enabled: true,
          // Opcional: puedes limitar formatos o cantidad
          accept: ["application/pdf", "image/*"],
          max_files: 3
        }
      }
    };

    // 🔗 Llamada a la API
    const r = await fetch("https://api.openai.com/v1/chatkit/sessions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
        "OpenAI-Beta": "chatkit_beta=v1" // ⚠️ obligatorio
      },
      body: JSON.stringify(body)
    });

    const txt = await r.text();
    if (!r.ok) return new Response(`OpenAI ${r.status}: ${txt}`, { status: r.status });

    return new Response(txt, {
      headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    return new Response(`Error al crear sesión: ${err.message}`, { status: 500 });
  }
}
