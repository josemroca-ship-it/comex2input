export async function onRequestPost({ request, env }) {
  try {
    const { OPENAI_API_KEY, CHATKIT_WORKFLOW_ID, CHATKIT_WORKFLOW_VERSION } = env;
    const { file_id, user } = await request.json();

    if (!file_id) return new Response("Falta file_id", { status: 400 });

    const body = {
      workflow: CHATKIT_WORKFLOW_VERSION
        ? { id: CHATKIT_WORKFLOW_ID, version: CHATKIT_WORKFLOW_VERSION }
        : { id: CHATKIT_WORKFLOW_ID },
      user: user || "web-" + crypto.randomUUID(),
      input: `Procesa el archivo con ID ${file_id} y extrae los datos relevantes.`,
      attachments: [{ file_id }],
    };

    const res = await fetch("https://api.openai.com/v1/workflows/runs", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    return new Response(JSON.stringify(data), {
      headers: { "Content-Type": "application/json" },
      status: res.status,
    });
  } catch (err) {
    return new Response("Error ejecutando workflow: " + err.message, { status: 500 });
  }
}
