// functions/api/message.js
export async function onRequestOptions({ env }) {
  return new Response(JSON.stringify({ model: env.OPENAI_MODEL || 'gpt-4.1' }), {
    headers: { 'Content-Type': 'application/json' }
  });
}

export async function onRequestPost({ request, env }) {
  try {
    if (!env.OPENAI_API_KEY) return new Response('Missing OPENAI_API_KEY', { status: 500 });

    const body = await request.json().catch(() => ({}));
    const text = body.text?.toString() || '';
    const file_ids = Array.isArray(body.file_ids) ? body.file_ids : [];

    // Construimos el "input" para Responses API
    // Formato típico: array con bloques "input_text" y (si aplica) "input_file"
    // Doc: Responses API (crear respuesta) + adjuntar file_ids.  [oai_citation:2‡Plataforma OpenAI](https://platform.openai.com/docs/api-reference/responses?utm_source=chatgpt.com)
    const input = [];
    if (text) input.push({ role: 'user', content: [{ type: 'input_text', text }] });
    if (file_ids.length) {
      // Adjunta cada archivo como bloque input_file
      input.push({
        role: 'user',
        content: file_ids.map(id => ({ type: 'input_file', file_id: id }))
      });
    }

    if (input.length === 0) {
      return new Response('Falta texto o archivos', { status: 400 });
    }

    const res = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: env.OPENAI_MODEL || 'gpt-4.1',
        input,
        // Opcional: streaming, truncation, etc.
      })
    });

    const txt = await res.text();
    if (!res.ok) return new Response(`OpenAI ${res.status}: ${txt}`, { status: res.status });

    const data = JSON.parse(txt || '{}');

    // Respuesta “amigable”: busca el texto más directo
    // En Responses API normalmente viene en data.output_text (o en items)
    const reply = data.output_text
      || data.output?.[0]?.content?.[0]?.text
      || JSON.stringify(data);

    return new Response(JSON.stringify({ reply }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (e) {
    return new Response(`Server error: ${e?.message || e}`, { status: 500 });
  }
}
