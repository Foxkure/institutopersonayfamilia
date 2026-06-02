module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const response = await fetch('https://institutopersonayfamilia.railway.app/api/create-preference', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body),
    });

    const text = await response.text();
    console.log('[proxy] Railway status:', response.status, '| body:', text.slice(0, 300));

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      console.error('[proxy] Railway returned non-JSON:', text.slice(0, 300));
      return res.status(500).json({ message: 'Error interno. Por favor intenta de nuevo.' });
    }

    return res.status(response.status).json(data);
  } catch (err) {
    console.error('[proxy] fetch failed:', err.message);
    return res.status(500).json({ message: 'Error interno. Por favor intenta de nuevo.' });
  }
};
