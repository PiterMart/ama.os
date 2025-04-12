"use client";

import { useState } from "react";
import validator from "validator";
import styles from "../styles/ContactForm.module.css";

export default function ContactForm() {
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    country: "",
    profession: "",
    message: "",
    style: "",
    team: "",
  });

  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!validator.isEmail(form.email)) {
      setError("El email no es válido.");
      return;
    }

    if (
      form.firstName.length > 30 ||
      form.lastName.length > 30 ||
      form.email.length > 100 ||
      form.profession.length > 50 ||
      form.message.length > 300 ||
      form.style.length > 20
    ) {
      setError("Uno o más campos exceden el límite de caracteres permitido.");
      return;
    }

    const style = [form.style];

    const res = await fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, style }),
    });

    if (res.status === 200) {
      setSubmitted(true);
    } else if (res.status === 409) {
      setError("Este correo ya está registrado.");
    } else {
      setError("Ocurrió un error. Intentá más tarde.");
    }
  };

  const teams = [
    "Boca Juniors",
    "River Plate",
    "Racing Club",
    "San Lorenzo",
    "Independiente",
    "Huracán",
    "Vélez Sarsfield",
    "Rosario Central",
    "Newell's Old Boys",
    "Estudiantes de La Plata",
    "Gimnasia La Plata",
    "Argentinos Juniors",
    "Lanús",
    "Banfield",
    "Tigre",
    "Platense",
    "Barracas Central",
    "Defensa y Justicia",
    "Atlético Tucumán",
    "Instituto",
    "Talleres",
    "Belgrano",
    "Central Córdoba",
    "Unión",
    "Colón"
  ];

  return submitted ? (
    <div className={styles.gracias}>¡Gracias por sumarte!</div>
  ) : (
    <form onSubmit={handleSubmit} className={styles.formulario}>
      <input
        name="firstName"
        placeholder="Nombre"
        value={form.firstName}
        onChange={handleChange}
        maxLength={30}
        required
        className={styles.input}
      />
      <input
        name="lastName"
        placeholder="Apellido"
        value={form.lastName}
        onChange={handleChange}
        maxLength={30}
        required
        className={styles.input}
      />
      <input
        name="email"
        placeholder="Email"
        value={form.email}
        onChange={handleChange}
        maxLength={100}
        required
        className={styles.input}
      />
      <input
        name="country"
        placeholder="País"
        value={form.country}
        onChange={handleChange}
        className={styles.input}
      />
      <input
        name="profession"
        placeholder="Profesión"
        value={form.profession}
        onChange={handleChange}
        maxLength={50}
        className={styles.input}
      />
      <textarea
        name="message"
        placeholder="Dejanos un mensaje"
        value={form.message}
        onChange={handleChange}
        maxLength={300}
        className={styles.textarea}
      />
        <div className={styles.styleInputs}>
            <label>Tu estilo en 1 palabras:</label>
            <input
                name="style"
                placeholder="Palabra"
                value={form.style}
                onChange={handleChange}
                maxLength={20}
                required
                className={styles.input}
            />
        </div>
        <select name="team" onChange={handleChange} className={styles.styleInputs}>
            <option value="">Seleccioná tu equipo</option>
            {teams.map((team) => (
            <option key={team} value={team}>{team}</option>
            ))}
        </select>
      <button type="submit" className={styles.boton}>
        Enviar
      </button>
      {error && <p className={styles.error}>{error}</p>}
    </form>
  );
}
