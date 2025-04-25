"use client";
import { useState } from "react";
import { useAuth } from "../src/contexts/AuthContext";
import RegisterForm from "./RegsiterForm";
import Link from "next/link";
import styles from "../styles/ContactForm.module.css";

export default function AuthForm({ isLogin = true }) {
  const [form, setForm] = useState({
    email: "",
    password: "",
  });
  const [error, setError] = useState(null);
  const { user, login } = useAuth();

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    try {
      const result = await login(form.email, form.password);
      if (!result.success) {
        setError(result.error);
      }
    } catch (err) {
      console.error(err);
      setError(err.message || "Error al iniciar sesión.");
    }
  };

  return (
    <div>
      {user ? (
        <div>Bienvenido, {user.displayName || user.email}!</div>
      ) : (
        <div>
          <h2>{isLogin ? "Iniciar sesión" : "Registrarse"}</h2>
          {isLogin ? (
            <>
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
              <div className={styles.registerLink}>
                <p>¿No tienes cuenta? <Link href="/auth/register">Regístrate</Link></p>
              </div>
            </>
          ) : (
            <RegisterForm />
          )}
        </div>
      )}
    </div>
  );
}
