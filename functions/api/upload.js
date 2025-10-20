// functions/api/upload.js
export async function onRequestPost({ request, env }) {
  try {
    const { OPENAI_API_KEY } = env;
    if (!OPENAI_API_KEY) {
      return new Response(JSON.stringify({ error: "Missing OPENAI_API_KEY" }), {
        status: 500, headers: { "Content-Type": "application/json" }
      });
    }

    const form = await request.formData();
    const file = form.get("file");
    if (!file || typeof file === "string") {
      return new Response(JSON.stringify({ error: "Missing file" }), {
        status: 400, headers: { "Content-Type": "application/json" }
      });
    }

    // Reempaquetar el archivo (evita problemas de boundary)
    const fd = new FormData();
    fd.append("file", new Blob([await file.arrayBuffer()], { type: file.type }), file.name || "document.pdf");
    // Si tu cuenta lo requiere, podrías añadir purpose:
    // fd.append("purpose", "assistants");

    const r = await fetch("https://api.openai.com/v1/files", {
      method: "POST",
      headers: { "Authorization": `Bearer ${OPENAI_API_KEY}` },
      body: fd
    });

    const txt = await r.text();
    if (!r.ok) {
      return new Response(JSON.stringify({ error: `OpenAI ${r.status}: ${txt}` }), {
        status: r.status, headers: { "Content-Type": "application/json" }
      });
    }

    const data = JSON.parse(txt || "{}");
    if (!data?.id) {
      return new Response(JSON.stringify({ error: "Upload ok but missing id", raw: data }), {
        status: 500, headers: { "Content-Type": "application/json" }
      });
    }

    return new Response(JSON.stringify({ file_id: data.id }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e?.message || String(e) }), {
      status: 500, headers: { "Content-Type": "application/json" }
    });
  }
}
