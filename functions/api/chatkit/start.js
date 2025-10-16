// functions/api/chatkit/start.js

export async function onRequestPost({ request, env }) {
  try {
    const { CHATKIT_WORKFLOW_ID, CHATKIT_WORKFLOW_VERSION, OPENAI_API_KEY } = env;

    if (!OPENAI_API_KEY || !CHATKIT_WORKFLOW_ID) {
      return new Response("Faltan variables de entorno necesarias", { status: 500 });
    }

    // Generamos un ID único por usuario/sesión
    const uid = "user_" + crypto.randomUUID().slice(0, 8);

    // Construcción del body de la sesión
    const body = {
      // Tu agente o workflow
      workflow: { id: CHATKIT_WORKFLOW_ID },
      user: uid,
      model: "gpt-4.1-mini", // puedes cambiar a tu modelo del builder si es otro

      // Si tienes versionado, lo agregamos
      ...(CHATKIT_WORKFLOW_VERSION
        ? { workflow: { id: CHATKIT_WORKFLOW_ID, version: CHATKIT_WORKFLOW_VERSION } }
        : {}),

      // ✅ Habilitar subida de archivos (nativo ChatKit)
      chatkit_configuration: {
        file_upload: {
          enabled: true,
        },
      },
    };

    const res = await fetch("https://api.openai.com/v1/chatkit/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const txt = await res.text();
    if (!res.ok) {
      return new Response(`OpenAI ${res.status}: ${txt}`, { status: res.status });
    }

    return new Response(txt, {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(`Error al crear la sesión: ${err.message}`, { status: 500 });
  }
}
