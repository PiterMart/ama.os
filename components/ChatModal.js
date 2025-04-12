import { useState, useEffect } from "react";
import { db, auth } from "../firebase/firebaseConfig.js";
import {
  collection,
  addDoc,
  doc,
  query,
  orderBy,
  limit,
  onSnapshot,
  Timestamp,
  getDoc
} from "firebase/firestore";
import styles from "../styles/ChatModal.module.css";

export default function ChatModal({ chatId = "global", onClose }) {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const chatRef = doc(db, "chats", chatId);
    const messagesRef = collection(chatRef, "messages");
    const q = query(messagesRef, orderBy("timestamp", "asc"), limit(50));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const msgs = [];
      querySnapshot.forEach((doc) => {
        msgs.push(doc.data());
      });
      setMessages(msgs);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [chatId]);
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;

    const user = auth.currentUser;
    if (!user) return;

    try {
      // Obtener el documento del usuario desde Firestore usando su UID
      const userDoc = await getDoc(doc(db, "users", user.uid));
      const userData = userDoc.data();
      const senderUsername = userData?.username || "Usuario Desconocido";

      const chatRef = doc(db, "chats", chatId);
      const messagesRef = collection(chatRef, "messages");

      await addDoc(messagesRef, {
        sender: senderUsername, // Guardar el nombre de usuario del remitente
        text: message.trim(),
        timestamp: Timestamp.now(),
      });
      setMessage("");
    } catch (err) {
      console.error("Error al enviar el mensaje:", err);
    }
  };

  return (
    <div className={styles.modal}>
      <div className={styles.modalContent}>
        <h3 className={styles.chatTitle}>
          {chatId === "global" ? "Chat Global" : ` ${chatId}`}
        </h3>

        <div className={styles.messages}>
          {loading ? (
            <p>Cargando mensajes...</p>
          ) : (
            messages.map((msg, index) => (
              <div key={index} className={styles.message}>
                <span className={styles.sender}>{msg.sender}:</span> {msg.text}
              </div>
            ))
          )}
        </div>

        <form onSubmit={handleSendMessage} className={styles.inputForm}>
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className={styles.input}
            placeholder="Escribí un mensaje..."
          />
          <button type="submit" className={styles.sendButton}>
            Enviar
          </button>
        </form>

        <button className={styles.closeButton} onClick={onClose}>
          Cerrar
        </button>
      </div>
    </div>
  );
}