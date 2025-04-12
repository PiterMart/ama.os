"use client";
import { useState, useEffect } from "react";
import { auth } from "../firebase/firebaseConfig";  // Importa tu configuración de Firebase
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged } from "firebase/auth";
import RegisterForm from "../components/RegsiterForm";  // Importa tu formulario de registro
import styles from "../styles/ContactForm.module.css";

export default function AuthForm() {
  const [form, setForm] = useState({
    email: "",
    password: "",
  });
  const [isLogin, setIsLogin] = useState(true);  // Determina si es Login o Registro
  const [user, setUser] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUser(user);  // Establece el usuario cuando esté autenticado
      } else {
        setUser(null);  // Si no hay usuario, lo ponemos en null
      }
    });
    return () => unsubscribe();
  }, []);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, form.email, form.password);
      } else {
        await createUserWithEmailAndPassword(auth, form.email, form.password);
      }
    } catch (err) {
      console.error(err);
      setError(err.message || "Error al registrar.");
    }
  };

  const toggleForm = () => setIsLogin(!isLogin);  // Alterna entre Login y Registro

  return (
    <div>
      {user ? (
        <div>Bienvenido, {user.displayName || user.email}!</div>  // Muestra el nombre del usuario
      ) : isLogin ? (
        <div>
          <h2>Iniciar sesión</h2>
          <form onSubmit={handleSubmit} className={styles.formulario}>
            <input
              name="email"
              type="email"
              placeholder="Email"
              value={form.email}
              onChange={handleChange}
              required
              className={styles.input}
            />
            <input
              name="password"
              type="password"
              placeholder="Contraseña"
              value={form.password}
              onChange={handleChange}
              required
              className={styles.input}
            />
            <button type="submit" className={styles.boton}>Entrar</button>
            {error && <p className={styles.error}>{error}</p>}
          </form>
          <button onClick={toggleForm} className={styles.boton}>¿No tienes cuenta? Regístrate</button>
        </div>
      ) : (
        <div>
          <h2>Registrarse</h2>
          <RegisterForm />
          <button onClick={toggleForm} className={styles.boton}>¿Ya tienes cuenta? Inicia sesión</button>
        </div>
      )}
    </div>
  );
}
