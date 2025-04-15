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
  getDoc,
  updateDoc,
  where,
  getDocs
} from "firebase/firestore";
import styles from "../styles/ChatModal.module.css";

export default function ChatModal({ chatId = "global", onClose }) {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userColors, setUserColors] = useState({});
  const [selectedColor, setSelectedColor] = useState('#000000'); // Estado para el color seleccionado

  useEffect(() => {
    const chatRef = doc(db, "chats", chatId);
    const messagesRef = collection(chatRef, "messages");
    const q = query(messagesRef, orderBy("timestamp", "asc"), limit(50));

    const unsubscribe = onSnapshot(q, async (querySnapshot) => {
      const msgs = [];
      const senders = new Set();
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        msgs.push(data);
        senders.add(data.sender);
      });
      setMessages(msgs);
      setLoading(false);

      const newColors = { ...userColors };
      for (const sender of senders) {
        if (!newColors[sender]) {
          const userQuery = query(collection(db, "users"), where("username", "==", sender));
          const userSnapshot = await getDocs(userQuery);
          userSnapshot.forEach((userDoc) => {
            const userData = userDoc.data();
            newColors[sender] = userData.chatColor || 'inherit';
          });
        }
      }
      setUserColors(newColors);
    });

    return () => unsubscribe();
  }, [chatId]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;

    const user = auth.currentUser;
    if (!user) return;

    const senderUsername = user.displayName || "Usuario Desconocido";

    try {
      const chatRef = doc(db, "chats", chatId);
      const messagesRef = collection(chatRef, "messages");

      await addDoc(messagesRef, {
        sender: senderUsername,
        text: message.trim(),
        timestamp: Timestamp.now(),
      });
      setMessage("");
    } catch (err) {
      console.error("Error al enviar el mensaje:", err);
    }
  };

  const handleColorChange = (event) => {
    setSelectedColor(event.target.value);
  };

  const handleSaveColor = async () => {
    const user = auth.currentUser;
    if (!user) return;

    const senderUsername = user.displayName;
    if (senderUsername) {
      const userRef = doc(db, "users", senderUsername);
      try {
        await updateDoc(userRef, { chatColor: selectedColor });
        // Opcional: Puedes actualizar el estado local userColors inmediatamente
        setUserColors({...userColors, [senderUsername]: selectedColor});
      } catch (error) {
        console.error("Error al guardar el color:", error);
      }
    }
  };

  return (
    <div className={styles.modal}>
      <div className={styles.modalContent}>
        <h3 className={styles.chatTitle}>
          {chatId === "global" ? "Chat Global" : ` ${chatId}`}
        </h3>

        <div className={styles.colorPicker}> {/* Contenedor para el selector de color */}
          <label htmlFor="colorPicker">Elegir color del nombre:</label>
          <input
            type="color"
            id="colorPicker"
            value={selectedColor}
            onChange={handleColorChange}
          />
          <button onClick={handleSaveColor}>Guardar Color</button>
        </div>

        <div className={styles.messages}>
          {loading ? (
            <p>Cargando mensajes...</p>
          ) : (
            messages.map((msg, index) => (
              <div key={index} className={styles.message}>
                <span
                  className={styles.sender}
                  style={{ color: userColors[msg.sender] }}
                >
                  {msg.sender}:
                </span>{" "}
                {msg.text}
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