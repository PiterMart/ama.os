"use client"

import { useState, useEffect } from "react";
import styles from "./page.module.css";
import AuthForm from "../components/AuthForm";
import HeroSection from "../components/HeroSection"
import { useAuth } from "@/contexts/AuthContext";
import LoadingScreen from "../components/LoadingScreen";

export default function Home() {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <HeroSection />
        {!user && <AuthForm />}
      </main>
      <footer className={styles.footer}></footer>
    </div>
  );
}