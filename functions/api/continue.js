// functions/api/continue.js
export async function onRequestPost({ request, env }) {
  try {
    const { OPENAI_API_KEY, CHATKIT_WORKFLOW_ID, CHATKIT_WORKFLOW_VERSION, OPENAI_MODEL } = env;
    if (!OPENAI_API_KEY) {
      return new Response(JSON.stringify({ error: "Missing OPENAI_API_KEY" }), {
        status: 500, headers: { "Content-Type": "application/json" }
      });
    }

    const { file_id, text } = await request.json().catch(() => ({}));
    if (!file_id) {
      return new Response(JSON.stringify({ error: "Missing file_id" }), {
        status: 400, headers: { "Content-Type": "application/json" }
      });
    }

    // Construimos input para Responses API: texto opcional + input_file
    const input = [];
    if (text) input.push({ role: "user", content: [{ type: "input_text", text }] });
    input.push({ role: "user", content: [{ type: "input_file", file_id }] });

    // Si tienes workflow, úsalo; si no, usa model
    const payload = CHATKIT_WORKFLOW_ID
      ? {
          workflow: CHATKIT_WORKFLOW_VERSION
            ? { id: CHATKIT_WORKFLOW_ID, version: CHATKIT_WORKFLOW_VERSION }
            : { id: CHATKIT_WORKFLOW_ID },
          input
        }
      : {
          model: OPENAI_MODEL || "gpt-4.1-mini",
          input
        };

    const r = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const txt = await r.text();
    if (!r.ok) {
      return new Response(JSON.stringify({ error: `OpenAI ${r.status}: ${txt}` }), {
        status: r.status, headers: { "Content-Type": "application/json" }
      });
    }

    const data = JSON.parse(txt || "{}");
    const reply = data.output_text
      || data.output?.[0]?.content?.[0]?.text
      || "(sin respuesta)";

    return new Response(JSON.stringify({ reply, raw: data }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e?.message || String(e) }), {
      status: 500, headers: { "Content-Type": "application/json" }
    });
  }
}
