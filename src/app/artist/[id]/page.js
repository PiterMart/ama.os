'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Link from 'next/link';
import ArtworkCarousel from '@/components/ArtworkCarousel';
import styles from '@/styles/ArtistProfile.module.css';
import buttonStyles from '@/styles/Buttons.module.css';

export default function ArtistProfile() {
  const { id } = useParams();
  const [artist, setArtist] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchArtist = async () => {
      try {
        const artistRef = doc(db, 'users', id);
        const artistSnap = await getDoc(artistRef);
        
        if (artistSnap.exists()) {
          const artistData = artistSnap.data();
          // Ensure all social media fields exist
          const socialLinks = {
            instagram: artistData.instagram || '',
            twitter: artistData.twitter || '',
            website: artistData.website || '',
            behance: artistData.behance || '',
            artstation: artistData.artstation || ''
          };

          setArtist({
            id: artistSnap.id,
            displayName: artistData.displayName || 'Anonymous Artist',
            photoURL: artistData.photoURL || '',
            bio: artistData.bio || '',
            socialLinks
          });
        } else {
          setError('Artist not found');
        }
      } catch (err) {
        setError('Error fetching artist information');
        console.error('Error fetching artist:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchArtist();
  }, [id]);

  if (loading) {
    return <div className={styles.loading}>Loading...</div>;
  }

  if (error || !artist) {
    return <div className={styles.error}>{error || 'Artist not found'}</div>;
  }

  const socialLinks = Object.entries(artist.socialLinks)
    .filter(([_, url]) => url && url.trim() !== '') // Filter out empty/null URLs
    .map(([platform, url]) => ({
      platform,
      url: url.startsWith('http') ? url : `https://${url}`, // Ensure URL has protocol
      icon: getSocialIcon(platform)
    }));

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Link href="/" className={`${buttonStyles.button} ${buttonStyles.small}`}>
          ← Back to Home
        </Link>
        <h1>{artist.displayName}</h1>
      </div>

      <div className={styles.content}>
        <div className={styles.profileSection}>
          <div className={styles.profileImage}>
            {artist.photoURL ? (
              <img 
                src={artist.photoURL} 
                alt={artist.displayName} 
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.style.display = 'none';
                  e.target.parentElement.querySelector('.placeholderImage').style.display = 'flex';
                }}
              />
            ) : null}
            <div className={styles.placeholderImage} style={{ display: artist.photoURL ? 'none' : 'flex' }}>
              {artist.displayName.charAt(0)}
            </div>
          </div>
          
          <div className={styles.profileInfo}>
            <h2>About</h2>
            <p>{artist.bio || 'No bio available'}</p>
            
            {socialLinks.length > 0 && (
              <div className={styles.socialLinks}>
                <h3>Social Links</h3>
                <div className={styles.links}>
                  {socialLinks.map(({ platform, url, icon }) => (
                    <a
                      key={platform}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.socialLink}
                      title={platform.charAt(0).toUpperCase() + platform.slice(1)}
                    >
                      {icon}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className={styles.artworksSection}>
          <h2>Artworks</h2>
          <ArtworkCarousel artistId={id} />
        </div>
      </div>
    </div>
  );
}

function getSocialIcon(platform) {
  switch (platform) {
    case 'instagram':
      return '📸';
    case 'twitter':
      return '🐦';
    case 'website':
      return '🌐';
    case 'behance':
      return '🎨';
    case 'artstation':
      return '🖼️';
    default:
      return platform.charAt(0).toUpperCase();
  }
} 