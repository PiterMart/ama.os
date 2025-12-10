'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { db, storage, auth } from '@/lib/firebase';
import { collection, addDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import Link from 'next/link';
import styles from '@/styles/ArtworkUploader.module.css';
import buttonStyles from '@/styles/Buttons.module.css';

export default function UploadPage() {
  const { user, loading, firebaseUser, error: authError } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [tags, setTags] = useState('');
  const [price, setPrice] = useState('');
  const [isForSale, setIsForSale] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [error, setError] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [links, setLinks] = useState('');


  if (loading) {
    return (
      <div className={styles.loading}>
        <p>Loading authentication state...</p>
      </div>
    );
  }

  if (!user || !firebaseUser) {
    return (
      <div className={styles.notLoggedIn}>
        <p>You must be logged in to upload artwork.</p>
        {!user && <p>User profile not found. Please try logging in again.</p>}
        {!firebaseUser && <p>Firebase authentication not found. Please try logging in again.</p>}
        {authError && <p className={styles.error}>{authError}</p>}
        <Link href="/auth/login" className={buttonStyles.button}>
          Log In
        </Link>
      </div>
    );
  }

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user || !firebaseUser) {
      setError('You must be logged in to upload artwork');
      return;
    }

    if (!imageFile) {
      setError('Please select an image');
      return;
    }

    try {
      setIsUploading(true);
      setError('');

      // Get a fresh token from the Firebase user
      const token = await firebaseUser.getIdToken(true);

      // Upload image to Firebase Storage
      const storageRef = ref(storage, `artworks/${user.uid}/${Date.now()}_${imageFile.name}`);
      const metadata = {
        contentType: imageFile.type,
        customMetadata: {
          'uploadedBy': user.uid,
          'uploadedAt': Date.now().toString(),
          'originalName': imageFile.name
        }
      };
      
      const snapshot = await uploadBytes(storageRef, imageFile, metadata);
      const imageUrl = await getDownloadURL(snapshot.ref);

      // Save artwork data to Firestore
      await addDoc(collection(db, 'artworks'), {
        artistId: user.uid,
        title,
        description,
        imageUrl,
        category,
        tags: tags.split(',').map(tag => tag.trim()),
        price: isForSale ? parseFloat(price) : null,
        isForSale,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      // Reset form
      setTitle('');
      setDescription('');
      setCategory('');
      setTags('');
      setPrice('');
      setIsForSale(false);
      setImageFile(null);
      setPreviewUrl('');
      setError('Artwork uploaded successfully!');
    } catch (err) {
      console.error('Upload error:', err);
      console.error('Error code:', err.code);
      console.error('Error message:', err.message);
      setError(err.message || 'Failed to upload artwork');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Link href="/profile" className={`${buttonStyles.button} ${buttonStyles.small}`}>
          ← Back to Profile
        </Link>
        <h1>Upload Artwork</h1>
      </div>

      <div className={styles.uploadSection}>
        <div className={styles.previewContainer}>
          {previewUrl ? (
            <img src={previewUrl} alt="Preview" className={styles.preview} />
          ) : (
            <div className={styles.uploadPlaceholder}>
              <label className={styles.fileInputLabel}>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className={styles.fileInput}
                />
                <span className={styles.fileInputText}>Choose Image</span>
              </label>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label htmlFor="title">Title</label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="category">Category</label>
            <select
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              required
              className={styles.select}
            >
              <option value="">Select a category</option>
              <option value="Digital Art">Digital Art</option>
              <option value="Traditional Art">Traditional Art</option>
              <option value="Photography">Photography</option>
              <option value="3D Art">3D Art</option>
              <option value="Animation">Animation</option>
              <option value="Concept Art">Concept Art</option>
              <option value="Illustration">Illustration</option>
              <option value="Character Design">Character Design</option>
              <option value="Environment Design">Environment Design</option>
              <option value="Fan Art">Fan Art</option>
            </select>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="tags">Tags (comma-separated)</label>
            <input
              type="text"
              id="tags"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="links">Links (one per line)</label>
            <textarea
              id="links"
              value={links}
              onChange={(e) => setLinks(e.target.value)}
              placeholder="https://example.com"
              className={styles.textarea}
            />
          </div>

          <div className={styles.formGroup}>
            <label>
              <input
                type="checkbox"
                checked={isForSale}
                onChange={(e) => setIsForSale(e.target.checked)}
              />
              This artwork is for sale
            </label>
          </div>

          {isForSale && (
            <div className={styles.formGroup}>
              <label htmlFor="price">Price (USD)</label>
              <div className={styles.priceInput}>
                <span className={styles.dollarSign}>$</span>
                <input
                  type="number"
                  id="price"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  min="0"
                  step="0.01"
                  required
                  className={styles.priceField}
                />
              </div>
            </div>
          )}

          {error && <div className={styles.error}>{error}</div>}

          <button
            type="submit"
            disabled={isUploading}
            className={`${buttonStyles.button} ${buttonStyles.medium} ${buttonStyles.fullWidth}`}
          >
            {isUploading ? 'Uploading...' : 'Upload Artwork'}
          </button>
        </form>
      </div>
    </div>
  );
} 