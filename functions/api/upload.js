// functions/api/upload.js
export async function onRequestPost({ request, env }) {
  try {
    if (!env.OPENAI_API_KEY) return new Response('Missing OPENAI_API_KEY', { status: 500 });

    const ctype = request.headers.get('content-type') || '';
    if (!ctype.includes('multipart/form-data')) {
      return new Response('Expected multipart/form-data', { status: 400 });
    }

    const form = await request.formData();
    const file = form.get('file');
    if (!file || typeof file === 'string') {
      return new Response('Missing file', { status: 400 });
    }
    if (file.type !== 'application/pdf') {
      return new Response('Solo se admite application/pdf en este ejemplo', { status: 400 });
    }

    // Reenvía el archivo a OpenAI Files API
    const fd = new FormData();
    // Propósito: con Responses API no es obligatorio “assistants”,
    // pero se recomienda subir a Files y referenciar el file_id al consultar.
    fd.append('file', new Blob([await file.arrayBuffer()], { type: file.type }), file.name || 'documento.pdf');
    // Algunas integraciones usan 'purpose' (p.ej. assistants). Si tu cuenta lo requiere:
    // fd.append('purpose', 'assistants');

    const res = await fetch('https://api.openai.com/v1/files', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${env.OPENAI_API_KEY}` },
      body: fd
    });

    const txt = await res.text();
    if (!res.ok) return new Response(`OpenAI ${res.status}: ${txt}`, { status: res.status });
    const data = JSON.parse(txt || '{}');

    if (!data?.id) return new Response(`Upload ok pero sin id: ${txt}`, { status: 500 });
    return new Response(JSON.stringify({ file_id: data.id }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (e) {
    return new Response(`Server error: ${e?.message || e}`, { status: 500 });
  }
}
