exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Method not allowed' }),
    };
  }

  try {
    const response = await fetch('https://institutopersonayfamilia.railway.app/api/create-preference', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: event.body,
    });

    const text = await response.text();
    console.log('[proxy] Railway status:', response.status, '| body:', text.slice(0, 300));

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      console.error('[proxy] Railway returned non-JSON:', text.slice(0, 300));
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Error interno. Por favor intenta de nuevo.' }),
      };
    }

    return {
      statusCode: response.status,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    };
  } catch (err) {
    console.error('[proxy] fetch failed:', err.message);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Error interno. Por favor intenta de nuevo.' }),
    };
  }
};
