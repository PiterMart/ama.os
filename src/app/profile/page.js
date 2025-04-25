'use client';

import { useState, useEffect } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc, collection, query, where, getDocs, updateDoc, orderBy } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '@/lib/firebase';
import Image from 'next/image';
import Link from 'next/link';
import styles from '@/styles/Profile.module.css';
import buttonStyles from '@/styles/Buttons.module.css';
import EmblaCarousel from '@/components/carousel/EmblaCarousel';

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
  const [user, loading] = useAuthState(auth);
  const [userData, setUserData] = useState(null);
  const [artworks, setArtworks] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
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
    if (!file) return;

    try {
      const storageRef = ref(storage, `profiles/${user.uid}/${file.name}`);
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);

      await updateDoc(doc(db, 'users', user.uid), {
        profilePicture: downloadURL
      });

      setUserData(prev => ({
        ...prev,
        profilePicture: downloadURL
      }));
    } catch (error) {
      console.error('Error uploading image:', error);
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

  if (loading) {
    return <div className={styles.loading}>Loading...</div>;
  }

  if (!user) {
    return <div className={styles.notLoggedIn}>Please log in to view your profile.</div>;
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
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className={styles.fileInput}
            />
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
              <button type="submit" className={`${buttonStyles.button} ${buttonStyles.medium}`}>Save Changes</button>
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
            </>
          )}
          <button
            onClick={() => setIsEditing(!isEditing)}
            className={`${buttonStyles.button} ${buttonStyles.medium}`}
          >
            {isEditing ? 'Cancel' : 'Edit Profile'}
          </button>
          <Link 
            href="/upload" 
            className={`${buttonStyles.button} ${buttonStyles.medium}`}
          >
            Add Artwork
          </Link>
        </div>
      </div>

      <div className={styles.artworksSection}>
        <h2>Your Artworks</h2>
        {artworks.length > 0 ? (
          <EmblaCarousel slides={artworkSlides} />
        ) : (
          <div className={styles.noArtworks}>
            <p>You haven't uploaded any artworks yet.</p>
            <Link href="/upload" className={`${buttonStyles.button} ${buttonStyles.medium}`}>
              Upload Your First Artwork
            </Link>
          </div>
        )}
      </div>
    </div>
  );
} 