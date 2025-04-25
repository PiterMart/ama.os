export async function POST() {
  return new Response(
    JSON.stringify({ method: 'POST recibido en /api/test' }),
    { status: 200 }
  );
}

export async function GET() {
  return new Response(
    JSON.stringify({ error: 'Método no permitido en /api/test' }),
    { status: 405 }
  );
} 