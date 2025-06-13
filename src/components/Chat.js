"use client";

import { useEffect, useState, useRef } from "react";
import { db, auth } from "../firebase/firebaseConfig";
import {
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";
import styles from "../styles/ChatModal.module.css";

export default function ChatModal({ chatId, onClose }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const bottomRef = useRef(null);
  const user = auth.currentUser;

  // Cargar mensajes en tiempo real
  useEffect(() => {
    if (!chatId) return;

    const messagesRef = collection(db, "chats", chatId, "messages");
    const q = query(messagesRef, orderBy("timestamp", "asc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setMessages(msgs);
      // Scroll automático al final
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    });

    return () => unsubscribe();
  }, [chatId]);

  // Enviar mensaje
  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    await addDoc(collection(db, "chats", chatId, "messages"), {
      text: newMessage,
      senderId: user.uid,
      senderName: user.email,
      timestamp: serverTimestamp(),
    });

    setNewMessage("");
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h3>Chat {chatId === "global" ? "Global" : "Privado"}</h3>
          <button onClick={onClose}>Cerrar</button>
        </div>

        <div className={styles.chatBox}>
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`${styles.message} ${
                msg.senderId === user.uid ? styles.mine : styles.theirs
              }`}
            >
              <strong>{msg.senderName}</strong>
              <p>{msg.text}</p>
            </div>
          ))}
          <div ref={bottomRef}></div>
        </div>

        <form onSubmit={sendMessage} className={styles.form}>
          <input
            type="text"
            placeholder="Escribí un mensaje..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            className={styles.input}
          />
          <button type="submit" className={styles.sendButton}>Enviar</button>
        </form>
      </div>
    </div>
  );
}
