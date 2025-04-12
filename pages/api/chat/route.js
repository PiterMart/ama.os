import { db, collection, addDoc, getDocs, serverTimestamp, query, orderBy } from "../../../firebase/firebaseConfig";

console.log('db:', db);

export async function GET() {
  try {
    const q = query(collection(db, "globalChat"), orderBy("timestamp", "asc"));
    const snapshot = await getDocs(q);

    const messages = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    return Response.json(messages);
  } catch (error) {
    console.error("Error getting messages:", error);
    return new Response("Error al obtener mensajes", { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { uid, name, message } = await request.json();

    if (!uid || !name || !message) {
      return new Response("Datos incompletos", { status: 400 });
    }

    const docRef = await addDoc(collection(db, "globalChat"), {
      uid,
      name,
      message,
      timestamp: serverTimestamp(),
    });

    return Response.json({ success: true, id: docRef.id });
  } catch (error) {
    console.error("Error saving message:", error);
    return new Response("Error al guardar el mensaje", { status: 500 });
  }
}