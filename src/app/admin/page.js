// app/admin/page.js or pages/admin.js
"use client";

import { useEffect, useState } from "react";
import { auth } from "../../../firebase/firebaseConfig";
import { signInWithEmailAndPassword, onAuthStateChanged } from "firebase/auth";
import NewsletterForm from "components/NewsletterForm";
import styles from "../../../styles/AdminDashboard.module.css";

export default function AdminDashboard() {
  const [user, setUser] = useState(null);
  const [emailSent, setEmailSent] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  const [loginData, setLoginData] = useState({ email: "", password: "" });

  const handleInputChange = (e) => {
    setLoginData({ ...loginData, [e.target.name]: e.target.value });
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, loginData.email, loginData.password);
    } catch (err) {
      alert("Login failed");
    }
  };

  const sendEmails = async (formData) => {
    const res = await fetch("/api/sendNewsletter", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(formData),
    });

    if (res.ok) {
      setEmailSent(true);
    } else {
      alert("Failed to send");
    }
  };

  if (!user) {
    return (
      <div className={styles.container}>
        <h2 className={styles.title}>Admin Login</h2>
        <form onSubmit={handleLogin} className={styles.form}>
          <input
            type="email"
            name="email"
            placeholder="Email"
            onChange={handleInputChange}
            className={styles.input}
            required
          />
          <input
            type="password"
            name="password"
            placeholder="Password"
            onChange={handleInputChange}
            className={styles.input}
            required
          />
          <button type="submit" className={styles.button}>
            Login
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Welcome, {user.email}</h1>
      <h2 className={styles.subtitle}>Send a Newsletter</h2>
      <NewsletterForm onSend={sendEmails} />
      {emailSent && <p className={styles.successMessage}>Newsletter sent!</p>}
    </div>
  );
}
