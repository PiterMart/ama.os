// pages/api/test.js
export default async function handler(req, res) {
    if (req.method === 'POST') {
      res.status(200).json({ method: 'POST recibido en /api/test' });
    } else {
      res.status(405).json({ error: 'Método no permitido en /api/test' });
    }
  }