import nodemailer from "nodemailer";
import { db } from "../../firebase/firebaseConfig"; // ✅ use the initialized db
import { collection, getDocs } from "firebase/firestore";

export default async function handler(req, res) {
    if (req.method !== "POST") {
      res.setHeader("Allow", ["POST"]);
      return res.status(405).json({ message: "Only POST allowed" });
    }
  
    const { subject, headline, body, imageUrl, buttonText, buttonLink } = req.body;
  
    try {
      const clientsSnapshot = await getDocs(collection(db, "clients"));
      const clients = clientsSnapshot.docs.map(doc => doc.data());
  
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: process.env.MAIL_USER,
          pass: process.env.MAIL_PASS,
        },
      });
  
      for (const client of clients) {
        await transporter.sendMail({
          from: `"NCNL" <${process.env.MAIL_USER}>`,
          to: client.email,
          subject: subject || "Our Latest Update",
          html: `
            <div style="font-family: sans-serif; line-height: 1.6;">
              <h1>${headline}</h1>
              <p>${body}</p>
              ${
                imageUrl
                  ? `<img src="${imageUrl}" alt="Newsletter Image" style="width:100%; max-width: 600px;" />`
                  : ""
              }
              ${
                buttonLink && buttonText
                  ? `<p><a href="${buttonLink}" style="background:#000;color:#fff;padding:10px 20px;text-decoration:none;border-radius:5px;display:inline-block;margin-top:10px;">${buttonText}</a></p>`
                  : ""
              }
            </div>
          `,
        });
      }
  
      res.status(200).json({ message: `Emails sent to ${clients.length} users.` });
    } catch (error) {
      console.error("Failed to send emails", error);
      res.status(500).json({ message: "Something went wrong.", error });
    }
  }
  