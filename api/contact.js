import { db, Timestamp } from "../../firebase/firebaseConfig";
import { collection, addDoc, query, where, getDocs } from "firebase/firestore";
import nodemailer from "nodemailer";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const {
    firstName,
    lastName,
    email,
    country,
    profession,
    message,
    style,
    team,
  } = req.body;

  try {
    const clientsRef = collection(db, "clients");

    // Verificamos si el email ya está registrado
    const existingQuery = query(clientsRef, where("email", "==", email));
    const existingSnap = await getDocs(existingQuery);

    if (!existingSnap.empty) {
      return res.status(409).json({ message: "User already subscribed" });
    }

    // Guardamos en Firestore
    await addDoc(clientsRef, {
      firstName,
      lastName,
      email,
      country,
      profession,
      message,
      style,
      team,
      timestamp: Timestamp.now(),
    });

    // Configuración del mail
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: `"NCNL" <${process.env.MAIL_USER}>`,
      to: email,
      subject: "NCNL",
      html: `
        <h1>Gracias por sumarte a nuestro universo visual.</h1>
        <p>Pronto vas a recibir contenido exclusivo.</p>
        <hr />
        <p><strong>Tu estilo:</strong> ${style}</p>
        ${team ? `<p><strong>Equipo:</strong> ${team}</p>` : ""}
      `,
    });

    res.status(200).json({ message: "Success" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
}
