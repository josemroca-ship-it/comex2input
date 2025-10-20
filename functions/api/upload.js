export async function onRequestPost({ request, env }) {
  try {
    const { OPENAI_API_KEY } = env;
    if (!OPENAI_API_KEY) {
      return new Response("Falta OPENAI_API_KEY", { status: 500 });
    }

    const formData = await request.formData();
    const file = formData.get("file");
    if (!file) {
      return new Response("No se envió archivo", { status: 400 });
    }

    // Subida del archivo al endpoint de files
    const uploadRes = await fetch("https://api.openai.com/v1/files", {
      method: "POST",
      headers: { Authorization: `Bearer ${OPENAI_API_KEY}` },
      body: formData,
    });

    const data = await uploadRes.json();
    if (!uploadRes.ok) throw new Error(JSON.stringify(data));

    return new Response(JSON.stringify({ file_id: data.id }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response("Error subiendo archivo: " + err.message, { status: 500 });
  }
}
