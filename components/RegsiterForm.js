"use client";

import { useState } from "react";
import { auth, db } from "../firebase/firebaseConfig";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth"; // Import updateProfile
import { collection, doc, setDoc, Timestamp } from "firebase/firestore"; // Import doc y setDoc
import styles from "../styles/ContactForm.module.css";
import { useRouter } from 'next/navigation'; // Import useRouter

export default function RegisterForm() {
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
  });
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(null);
  const router = useRouter(); // Inicializa el router

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    const { username, email, password } = form;

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Actualiza el displayName del usuario con el nombre de usuario
      await updateProfile(user, { displayName: username });

      // Guarda los datos del usuario en Firestore
      const usersRef = collection(db, "users");
      await setDoc(doc(usersRef, username), { // Usa el nombre de usuario como ID
        uid: user.uid,
        username,
        email,
        role: "user",
        timestamp: Timestamp.now(),
      });

      setSubmitted(true);
      // Redirige al usuario a otra página si es necesario
      // router.push('/dashboard');

    } catch (err) {
      console.error("Error al registrar:", err);
      setError(err.message || "Error al registrar.");
    }
  };

  return submitted ? (
    <div className={styles.gracias}>¡Gracias por registrarte!</div>
  ) : (
    <form onSubmit={handleSubmit} className={styles.formulario}>
      <input name="username" placeholder="Nombre de Usuario" value={form.username} onChange={handleChange} required className={styles.input} />
      <input name="email" type="email" placeholder="Email" value={form.email} onChange={handleChange} required className={styles.input} />
      <input name="password" type="password" placeholder="Contraseña" value={form.password} onChange={handleChange} required className={styles.input} />
      <button type="submit" className={styles.boton}>Registrarse</button>
      {error && <p className={styles.error}>{error}</p>}
    </form>
  );
}