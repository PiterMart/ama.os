"use client"

import { useState, useEffect } from "react";
import styles from "./page.module.css";
import AuthForm from "../../components/AuthForm";
import ChatModal from "../../components/ChatModal";
import ChatLayout from "../../components/layouts/ChatLayout";
import { auth } from "../../firebase/firebaseConfig";
import LoadingScreen from "../../components/LoadingScreen";
import HeroSection from "../components/HeroSection";

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
          <div className={styles.videoContainer}>
          <video
            autoPlay
            muted
            loop
            width={0}
            height={0}
            playsInline
            className={styles.backgroundVideo}
          >
            <source src="/placeholderbgamaos0001.mp4" type="video/mp4" />
          </video>
        </div>
          {/* <LoadingScreen /> */}
          <HeroSection />
          {!user ? (
            <AuthForm />
          ) : (
            <div>
              <ChatModal chatId={chatId} onClose={closeModal} />
            </div>
          )}
        </main>
        <footer className={styles.footer}></footer>
      </div>
    </ChatLayout>
  );
}