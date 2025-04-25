import { adminAuth, adminDb } from "../../../../firebase/firebaseAdmin";
import { Timestamp } from "firebase-admin/firestore";
import nodemailer from "nodemailer";

export async function POST(request) {
  console.log("Valor de FIREBASE_PROJECT_ID en Vercel:", process.env.FIREBASE_PROJECT_ID);
  
  try {
    const { username, email, password } = await request.json();

    if (!username || !email || !password) {
      return new Response(
        JSON.stringify({ message: "Faltan campos obligatorios." }),
        { status: 400 }
      );
    }

    // Verificar si ya existe el usuario por email
    try {
      await adminAuth.getUserByEmail(email);
      return new Response(
        JSON.stringify({ message: "El email ya está registrado." }),
        { status: 400 }
      );
    } catch (error) {
      console.error("Error al verificar email:", error);
      if (error.code !== "auth/user-not-found") {
        return new Response(
          JSON.stringify({ message: "Error al verificar el email." }),
          { status: 500 }
        );
      }
    }

    // Verificar si ya existe el nombre de usuario
    try {
      const userByUsernameSnapshot = await adminDb.collection("users").where("username", "==", username).get();
      if (!userByUsernameSnapshot.empty) {
        return new Response(
          JSON.stringify({ message: "El nombre de usuario ya está en uso." }),
          { status: 400 }
        );
      }
    } catch (error) {
      console.error("Error al verificar nombre de usuario:", error);
      return new Response(
        JSON.stringify({ message: "Error al verificar el nombre de usuario." }),
        { status: 500 }
      );
    }

    // Crear usuario en Firebase Auth
    let userRecord;
    try {
      userRecord = await adminAuth.createUser({
        email,
        password,
        displayName: username,
      });
    } catch (authError) {
      console.error("Error al crear usuario en Auth:", authError);
      return new Response(
        JSON.stringify({ message: "Error al crear la cuenta de usuario." }),
        { status: 500 }
      );
    }

    // Guardar datos en Firestore
    try {
      await adminDb.collection("users").doc(username).set({
        uid: userRecord.uid,
        username,
        email,
        role: "user",
        timestamp: Timestamp.now(),
      });
    } catch (error) {
      console.error("Error al guardar en Firestore:", error);
      return new Response(
        JSON.stringify({ message: "Error al guardar datos del usuario." }),
        { status: 500 }
      );
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
        `,
      });
    } catch (error) {
      console.error("Error al enviar email:", error);
      return new Response(
        JSON.stringify({ message: "Error al enviar el email de confirmación." }),
        { status: 500 }
      );
    }

    return new Response(
      JSON.stringify({ message: "Usuario registrado con éxito." }),
      { status: 200 }
    );
  } catch (err) {
    console.error("Error general al registrar:", err);
    return new Response(
      JSON.stringify({ message: "Error del servidor." }),
      { status: 500 }
    );
  }
} 