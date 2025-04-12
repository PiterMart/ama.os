// components/NewsletterForm.js
"use client";

import { useState } from "react";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "../firebase/firebaseConfig"; 
import { v4 as uuidv4 } from "uuid";
import styles from "../styles/NewsletterForm.module.css";

export default function NewsletterForm({ onSend }) {
  const [formData, setFormData] = useState({
    subject: "",
    headline: "",
    body: "",
    imageUrl: "",
    buttonText: "",
    buttonLink: "",
  });

  const [imageFile, setImageFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    let uploadedImageUrl = formData.imageUrl;

    if (imageFile) {
      const imageRef = ref(storage, `newsletter-images/${uuidv4()}`);
      await uploadBytes(imageRef, imageFile);
      uploadedImageUrl = await getDownloadURL(imageRef);
    }

    await onSend({
      ...formData,
      imageUrl: uploadedImageUrl,
    });

    setFormData({
      subject: "",
      headline: "",
      body: "",
      imageUrl: "",
      buttonText: "",
      buttonLink: "",
    });
    setImageFile(null);
    setPreviewUrl("");
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    setImageFile(file);
    if (file) {
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  return (
    <div className={styles.container}>
      <form onSubmit={handleSubmit} className={styles.form}>
        <input
          name="subject"
          placeholder="Email Subject"
          value={formData.subject}
          onChange={handleChange}
          className={styles.input}
          required
        />
        <input
          name="headline"
          placeholder="Headline"
          value={formData.headline}
          onChange={handleChange}
          className={styles.input}
          required
        />
        <textarea
          name="body"
          placeholder="Body Text"
          value={formData.body}
          onChange={handleChange}
          className={styles.textarea}
          required
        />
        <input
          type="file"
          accept="image/*"
          onChange={handleImageChange}
          className={styles.fileInput}
        />
        <input
          name="buttonText"
          placeholder="Button Text"
          value={formData.buttonText}
          onChange={handleChange}
          className={styles.input}
        />
        <input
          name="buttonLink"
          placeholder="Button Link"
          value={formData.buttonLink}
          onChange={handleChange}
          className={styles.input}
        />
        <button type="submit" className={styles.button}>
          Send Newsletter
        </button>
      </form>

      <hr className="my-6" />

      <div className={styles.preview}>
        <h2 className="text-2xl font-bold mb-2">{formData.headline || "Your Headline Here"}</h2>
        <p className="mb-4">{formData.body || "This is your newsletter body text."}</p>
        {(previewUrl || formData.imageUrl) && (
          <img
            src={previewUrl || formData.imageUrl}
            alt="Preview"
            className={styles.previewImage}
          />
        )}
        {formData.buttonText && formData.buttonLink && (
          <a
            href={formData.buttonLink}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.previewButton}
          >
            {formData.buttonText}
          </a>
        )}
      </div>
    </div>
  );
}
