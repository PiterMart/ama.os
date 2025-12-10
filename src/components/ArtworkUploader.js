'use client';

import { useState, useRef } from 'react';
import { storage, db } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '@/lib/firebase';
import styles from '@/styles/ArtworkUploader.module.css';

// Helper function to compress image
const compressImage = async (file) => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Resize if dimensions exceed 1920px
        if (width > 1920 || height > 1920) {
          if (width > height) {
            height = Math.round((height * 1920) / width);
            width = 1920;
          } else {
            width = Math.round((width * 1920) / height);
            height = 1920;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to blob with 80% quality
        canvas.toBlob(
          (blob) => {
            resolve(blob);
          },
          'image/jpeg',
          0.8
        );
      };
    };
  });
};

// Helper function to check file size
const isFileSizeValid = (file) => {
  return file.size <= 2 * 1024 * 1024; // 2MB limit
};

export default function ArtworkUploader() {
  const [user] = useAuthState(auth);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');
  const fileInputRef = useRef(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    tags: '',
    price: '',
    isForSale: false,
    externalLink: '',
  });

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
      setError('Please upload an image or video file');
      return;
    }

    // Check file size
    if (!isFileSizeValid(file)) {
      setError('File size must be less than 2MB');
      return;
    }

    // Create preview URL
    setPreviewUrl(URL.createObjectURL(file));
    setError('');
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleUpload = async () => {
    if (!user) {
      setError('You must be logged in to upload artwork');
      return;
    }

    const file = fileInputRef.current?.files[0];
    if (!file) {
      setError('Please select a file to upload');
      return;
    }

    setIsUploading(true);
    setError('');

    try {
      let fileToUpload = file;
      
      // Compress image if it's an image file
      if (file.type.startsWith('image/')) {
        fileToUpload = await compressImage(file);
      }

      // Create a simpler storage path
      const timestamp = Date.now();
      const fileExtension = file.name.split('.').pop();
      const fileName = `${timestamp}.${fileExtension}`;
      
      // Use a simpler path structure
      const storageRef = ref(storage, `artworks/${fileName}`);
      
      // Upload the file with metadata
      const metadata = {
        contentType: file.type,
        customMetadata: {
          uploadedBy: user.uid,
          uploadedAt: timestamp.toString()
        }
      };
      
      const snapshot = await uploadBytes(storageRef, fileToUpload, metadata);
      const downloadURL = await getDownloadURL(snapshot.ref);

      // Save artwork data to Firestore
      await addDoc(collection(db, 'artworks'), {
        artistId: user.uid,
        title: formData.title,
        description: formData.description,
        imageUrl: downloadURL,
        category: formData.category,
        tags: formData.tags.split(',').map(tag => tag.trim()),
        price: formData.isForSale ? parseFloat(formData.price) : null,
        isForSale: formData.isForSale,
        externalLink: formData.externalLink,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Reset form
      setFormData({
        title: '',
        description: '',
        category: '',
        tags: '',
        price: '',
        isForSale: false,
        externalLink: '',
      });
      setPreviewUrl('');
      fileInputRef.current.value = '';
      
    } catch (err) {
      console.error('Upload error details:', {
        code: err.code,
        message: err.message,
        stack: err.stack
      });
      setError(`Error uploading artwork: ${err.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.uploadSection}>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/*,video/*"
          className={styles.fileInput}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          className={styles.uploadButton}
          disabled={isUploading}
        >
          Select File
        </button>
        {previewUrl && (
          <div className={styles.previewContainer}>
            {fileInputRef.current?.files[0]?.type.startsWith('image/') ? (
              <img src={previewUrl} alt="Preview" className={styles.preview} />
            ) : (
              <video src={previewUrl} controls className={styles.preview} />
            )}
          </div>
        )}
      </div>

      {error && <div className={styles.error}>{error}</div>}

      <form className={styles.form}>
        <div className={styles.formGroup}>
          <label htmlFor="title">Title</label>
          <input
            type="text"
            id="title"
            name="title"
            value={formData.title}
            onChange={handleInputChange}
            className={styles.input}
            required
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="description">Description</label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            className={styles.textarea}
            required
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="category">Category</label>
          <select
            id="category"
            name="category"
            value={formData.category}
            onChange={handleInputChange}
            className={styles.select}
            required
          >
            <option value="">Select a category</option>
            <option value="digital">Digital Art</option>
            <option value="traditional">Traditional Art</option>
            <option value="photography">Photography</option>
            <option value="video">Video</option>
          </select>
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="tags">Tags (comma-separated)</label>
          <input
            type="text"
            id="tags"
            name="tags"
            value={formData.tags}
            onChange={handleInputChange}
            className={styles.input}
            placeholder="e.g., abstract, landscape, digital"
          />
        </div>

        <div className={styles.formGroup}>
          <label>
            <input
              type="checkbox"
              name="isForSale"
              checked={formData.isForSale}
              onChange={handleInputChange}
              className={styles.checkbox}
            />
            This artwork is for sale
          </label>
        </div>

        {formData.isForSale && (
          <div className={styles.formGroup}>
            <label htmlFor="price">Price (USD)</label>
            <input
              type="number"
              id="price"
              name="price"
              value={formData.price}
              onChange={handleInputChange}
              className={styles.input}
              min="0"
              step="0.01"
              required
            />
          </div>
        )}

        <button
          type="button"
          onClick={handleUpload}
          className={styles.uploadButton}
          disabled={isUploading}
        >
          {isUploading ? 'Uploading...' : 'Upload Artwork'}
        </button>
      </form>
    </div>
  );
} 