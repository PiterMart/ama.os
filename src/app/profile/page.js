'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { db, auth } from '@/lib/firebase';
import { doc, getDoc, collection, query, where, getDocs, updateDoc, orderBy, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '@/lib/firebase';
import Image from 'next/image';
import Link from 'next/link';
import styles from '@/styles/Profile.module.css';
import buttonStyles from '@/styles/Buttons.module.css';
import EmblaCarousel from '@/components/carousel/EmblaCarousel';
import { onAuthStateChanged } from 'firebase/auth';

// Helper function to extract username from various input formats
const extractUsername = (input, platform) => {
  if (!input) return '';
  
  // Remove any leading @ symbol
  input = input.replace(/^@/, '');
  
  // Remove any URLs and extract just the username
  const patterns = {
    instagram: /(?:https?:\/\/)?(?:www\.)?instagram\.com\/([^\/\?]+)/,
    twitter: /(?:https?:\/\/)?(?:www\.)?twitter\.com\/([^\/\?]+)/,
    facebook: /(?:https?:\/\/)?(?:www\.)?facebook\.com\/([^\/\?]+)/
  };

  const match = input.match(patterns[platform]);
  return match ? match[1] : input;
};

export default function ProfilePage() {
  const { user, loading: authLoading, firebaseUser } = useAuth();
  const [userData, setUserData] = useState(null);
  const [artworks, setArtworks] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [formData, setFormData] = useState({
    displayName: '',
    bio: '',
    website: '',
    socialMedia: {
      instagram: '',
      twitter: '',
      facebook: ''
    }
  });

  useEffect(() => {
    const fetchUserData = async () => {
      if (user) {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setUserData(data);
          setFormData({
            displayName: data.displayName || '',
            bio: data.bio || '',
            website: data.website || '',
            socialMedia: data.socialMedia || {
              instagram: '',
              twitter: '',
              facebook: ''
            }
          });

          // Fetch user's artworks
          const artworksQuery = query(
            collection(db, 'artworks'),
            where('artistId', '==', user.uid),
            orderBy('createdAt', 'desc')
          );
          const artworksSnapshot = await getDocs(artworksQuery);
          const artworksData = artworksSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          setArtworks(artworksData);
        }
      }
    };

    fetchUserData();
  }, [user]);

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !user || !firebaseUser) {
      setUploadError('Please log in to upload images');
      return;
    }

    try {
      setIsUploading(true);
      setUploadError(null);

      // Validate file type
      const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        throw new Error('Please upload a valid image file (JPEG, PNG, or WebP)');
      }

      // Validate file size (max 5MB)
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (file.size > maxSize) {
        throw new Error('Image size must be less than 5MB');
      }

      // Get the ID token from the firebaseUser
      const token = await firebaseUser.getIdToken(true);
      console.log('Got fresh Firebase Auth token');

      // Create a unique filename using timestamp
      const timestamp = Date.now();
      const fileExtension = file.name.split('.').pop();
      const fileName = `profile_${timestamp}.${fileExtension}`;
      
      // Create storage reference with the correct path according to rules
      const storageRef = ref(storage, `profiles/${user.uid}/${fileName}`);
      console.log('Storage reference created:', storageRef.fullPath);
      console.log('User ID:', user.uid);
      console.log('Storage bucket:', storageRef.bucket);
      
      // Upload the file with metadata
      const metadata = {
        contentType: file.type,
        customMetadata: {
          'uploadedBy': user.uid,
          'uploadedAt': timestamp.toString(),
          'originalName': file.name
        }
      };
      
      console.log('Starting upload with metadata:', metadata);
      const uploadTask = await uploadBytes(storageRef, file, metadata);
      console.log('Upload completed:', uploadTask.ref.fullPath);
      
      // Get the download URL
      const downloadURL = await getDownloadURL(uploadTask.ref);
      console.log('Got download URL:', downloadURL);

      // Update user's profile in Firestore
      await updateDoc(doc(db, 'users', user.uid), {
        profilePicture: downloadURL,
        updatedAt: serverTimestamp()
      });

      // Update local state
      setUserData(prev => ({
        ...prev,
        profilePicture: downloadURL
      }));

      console.log('Profile picture updated successfully');
    } catch (error) {
      console.error('Error uploading image:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      console.error('Error details:', error.customData);
      setUploadError(error.message || 'Failed to upload image');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await updateDoc(doc(db, 'users', user.uid), formData);
      setUserData(prev => ({
        ...prev,
        ...formData
      }));
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating profile:', error);
    }
  };

  if (authLoading) {
    return <div className={styles.loading}>Loading...</div>;
  }

  if (!user) {
    return (
      <div className={styles.notLoggedIn}>
        <p>Please log in to view your profile.</p>
        <Link href="/auth/login" className={buttonStyles.button}>
          Log In
        </Link>
      </div>
    );
  }

  const artworkSlides = artworks.map(artwork => ({
    imageUrl: artwork.imageUrl,
    title: artwork.title,
    description: artwork.description,
    externalLink: artwork.externalLink
  }));

  return (
    <div className={styles.container}>
      <div className={styles.profileHeader}>
        <div className={styles.profilePicture}>
          {userData?.profilePicture ? (
            <Image
              src={userData.profilePicture}
              alt="Profile"
              width={150}
              height={150}
              className={styles.profileImage}
            />
          ) : (
            <div className={styles.profilePlaceholder}>
              {userData?.displayName?.[0] || '?'}
            </div>
          )}
          {isEditing && (
            <label className={`${buttonStyles.button} ${buttonStyles.small}`}>
              Change Photo
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className={styles.fileInput}
                style={{ display: 'none' }}
              />
            </label>
          )}
        </div>
        <div className={styles.profileInfo}>
          {isEditing ? (
            <form onSubmit={handleSubmit} className={styles.editForm}>
              <input
                type="text"
                value={formData.displayName}
                onChange={(e) => setFormData(prev => ({ ...prev, displayName: e.target.value }))}
                placeholder="Display Name"
                className={styles.input}
              />
              <textarea
                value={formData.bio}
                onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                placeholder="Bio"
                className={styles.textarea}
              />
              <input
                type="text"
                value={formData.website}
                onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
                placeholder="Website"
                className={styles.input}
              />
              <div className={styles.socialInputs}>
                <input
                  type="text"
                  value={formData.socialMedia.instagram}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    socialMedia: { ...prev.socialMedia, instagram: e.target.value }
                  }))}
                  placeholder="Instagram"
                  className={styles.input}
                />
                <input
                  type="text"
                  value={formData.socialMedia.twitter}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    socialMedia: { ...prev.socialMedia, twitter: e.target.value }
                  }))}
                  placeholder="Twitter"
                  className={styles.input}
                />
                <input
                  type="text"
                  value={formData.socialMedia.facebook}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    socialMedia: { ...prev.socialMedia, facebook: e.target.value }
                  }))}
                  placeholder="Facebook"
                  className={styles.input}
                />
              </div>
              <div className={styles.formActions}>
                <button type="submit" className={`${buttonStyles.button} ${buttonStyles.medium}`}>Save Changes</button>
                <button 
                  type="button" 
                  onClick={() => setIsEditing(false)} 
                  className={`${buttonStyles.button} ${buttonStyles.medium} ${buttonStyles.secondary}`}
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <>
              <h1 className={styles.displayName}>{userData?.displayName || 'Anonymous'}</h1>
              <p className={styles.bio}>{userData?.bio || 'No bio yet.'}</p>
              {userData?.website && (
                <a href={userData.website} target="_blank" rel="noopener noreferrer" className={styles.website}>
                  {userData.website}
                </a>
              )}
              <div className={styles.socialLinks}>
                {userData?.socialMedia?.instagram && (
                  <a href={userData.socialMedia.instagram} target="_blank" rel="noopener noreferrer">
                    Instagram
                  </a>
                )}
                {userData?.socialMedia?.twitter && (
                  <a href={userData.socialMedia.twitter} target="_blank" rel="noopener noreferrer">
                    Twitter
                  </a>
                )}
                {userData?.socialMedia?.facebook && (
                  <a href={userData.socialMedia.facebook} target="_blank" rel="noopener noreferrer">
                    Facebook
                  </a>
                )}
              </div>
              <div className={styles.profileActions}>
                <button
                  onClick={() => setIsEditing(true)}
                  className={`${buttonStyles.button} ${buttonStyles.medium}`}
                >
                  Edit Profile
                </button>
                <Link 
                  href="/upload" 
                  className={`${buttonStyles.button} ${buttonStyles.medium}`}
                >
                  Add Artwork
                </Link>
              </div>
            </>
          )}
        </div>
      </div>

      <div className={styles.artworksSection}>
        <h2>Your Artworks</h2>
        {artworks.length > 0 ? (
          <EmblaCarousel slides={artworkSlides} />
        ) : (
          <div className={styles.noArtworks}>
            <p>You haven&apos;t uploaded any artworks yet.</p>
            <Link href="/upload" className={`${buttonStyles.button} ${buttonStyles.medium}`}>
              Upload Your First Artwork
            </Link>
          </div>
        )}
      </div>
    </div>
  );
} 