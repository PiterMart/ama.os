import { adminAuth, adminDb } from "../../firebase/firebaseAdmin";
import { Timestamp } from "firebase-admin/firestore";
import nodemailer from "nodemailer";

export default async function handler(req, res) {
  console.log("Valor de FIREBASE_PROJECT_ID en Vercel:", process.env.FIREBASE_PROJECT_ID);
  if (req.method !== "POST") return res.status(405).end();

  const { username, email, password } = req.body; // Eliminé country y profession

  if (!username || !email || !password ) {
    return res.status(400).json({ message: "Faltan campos obligatorios." });
  }

  try {
    // Verificar si ya existe el usuario por email
    let userRecordByEmail;
    try {
      userRecordByEmail = await adminAuth.getUserByEmail(email);
      return res.status(400).json({ message: "El email ya está registrado." });
    } catch (error) {
      console.error("Error al verificar email:", error); // Agregué este log
      if (error.code !== "auth/user-not-found") {
        return res.status(500).json({ message: "Error al verificar el email." }); // Mejor manejo del error
      }
    }

    // Verificar si ya existe el nombre de usuario
    try {
      const userByUsernameSnapshot = await adminDb.collection("users").where("username", "==", username).get();
      if (!userByUsernameSnapshot.empty) {
        return res.status(400).json({ message: "El nombre de usuario ya está en uso." });
      }
    } catch (error) {
      console.error("Error al verificar nombre de usuario:", error); // Agregué este log
      return res.status(500).json({ message: "Error al verificar el nombre de usuario." }); // Mejor manejo del error
    }


    let userRecord;
    // Crear usuario en Firebase Auth
    try {
      userRecord = await adminAuth.createUser({
        email,
        password,
        displayName: username,
      });
    } catch (authError) {
      console.error("Error al crear usuario en Auth:", authError);
      return res.status(500).json({ message: "Error al crear la cuenta de usuario." });
    }

    // Guardar datos en Firestore usando el nombre de usuario como ID del documento
    try {
      await adminDb.collection("users").doc(username).set({
        uid: userRecord.uid,
        username,
        email,
        role: "user",
        timestamp: Timestamp.now(),
      });
    } catch (error) {
      console.error("Error al guardar en Firestore:", error); // Agregué este log
      return res.status(500).json({ message: "Error al guardar datos del usuario." }); // Mejor manejo del error
    }


    // Enviar email de confirmación
    try {
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: process.env.MAIL_USER,
          pass: process.env.MAIL_PASS,
        },
      });

      await transporter.sendMail({
        from: `"AMA.OS" <${process.env.MAIL_USER}>`,
        to: email,
        subject: "Gracias por sumarte a AMA.OS",
        html: `
          <h1>Gracias por sumarte a nuestro universo visual.</h1>
          <p>Pronto vas a recibir contenido exclusivo.</p>
          <hr />
          <p><strong>Nombre de Usuario:</strong> ${username}</p>
        `, // Eliminé referencia a país y profesión
      });
    } catch (error) {
      console.error("Error al enviar email:", error); // Agregué este log
      return res.status(500).json({ message: "Error al enviar el email de confirmación." }); // Mejor manejo del error
    }

    res.status(200).json({ message: "Usuario registrado con éxito." });
  } catch (err) {
    console.error("Error general al registrar:", err); // Agregué este log
    res.status(500).json({ message: "Error del servidor." });
  }
}