"use client";

import { useState } from "react";
import { auth, db } from "../firebase/firebaseConfig";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { collection, addDoc, Timestamp } from "firebase/firestore";
import styles from "../styles/ContactForm.module.css";

export default function RegisterForm() {
  const [form, setForm] = useState({
    firstName: "",
    username: "", // Nuevo campo para el nombre de usuario
    email: "",
    password: "",
  });

  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);

        try {
          const res = await fetch("/api/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(form),
          });

          if (!res.ok) {
            const data = await res.json();
            throw new Error(data.message || "Error al registrar.");
          }

          setSubmitted(true);
        } catch (err) {
          console.error(err);
          setError(err.message || "Error al registrar.");
        }
      };

  return submitted ? (
    <div className={styles.gracias}>¡Gracias por registrarte!</div>
  ) : (
    <form onSubmit={handleSubmit} className={styles.formulario}>
      <input name="username" placeholder="Nombre de Usuario" value={form.username} onChange={handleChange} required className={styles.input} /> {/* Nuevo campo */}
      <input name="email" type="email" placeholder="Email" value={form.email} onChange={handleChange} required className={styles.input} />
      <input name="password" type="password" placeholder="Contraseña" value={form.password} onChange={handleChange} required className={styles.input} />
      <button type="submit" className={styles.boton}>Registrarse</button>
      {error && <p className={styles.error}>{error}</p>}
    </form>
  );
}