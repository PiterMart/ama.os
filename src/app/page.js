"use client"

import { useState, useEffect } from "react";
import styles from "./page.module.css";
import AuthForm from "../../components/AuthForm";
import ChatModal from "../../components/ChatModal";
import ChatLayout from "../../components/layouts/ChatLayout";
import { auth } from "../../firebase/firebaseConfig";
import LoadingScreen from "../../components/LoadingScreen";

export default function Home() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [chatId, setChatId] = useState(null);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  const openChat = (chatId) => {
    setChatId(chatId);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setChatId(null);
  };

  return (
    <ChatLayout>
      <div className={styles.page}>
        <main className={styles.main}>
          <LoadingScreen /> {/* La LoadingScreen se renderiza siempre aquí */}
          {!user ? (
            <AuthForm />
          ) : (
            <div>
              <button
                onClick={() => openChat("global")}
                className={styles.chatButton}
              >
                Chatear globalmente
              </button>

              {isModalOpen && <ChatModal chatId={chatId} onClose={closeModal} />}
            </div>
          )}
        </main>
        <footer className={styles.footer}></footer>
      </div>
    </ChatLayout>
  );
}