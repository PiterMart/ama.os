'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Link from 'next/link';
import styles from '@/styles/ArtworkDetail.module.css';
import buttonStyles from '@/styles/Buttons.module.css';

export default function ArtworkDetail() {
  const { id } = useParams();
  const [artwork, setArtwork] = useState(null);
  const [artist, setArtist] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchArtworkAndArtist = async () => {
      try {
        // Fetch artwork
        const artworkRef = doc(db, 'artworks', id);
        const artworkSnap = await getDoc(artworkRef);
        
        if (artworkSnap.exists()) {
          const artworkData = { id: artworkSnap.id, ...artworkSnap.data() };
          setArtwork(artworkData);

          // Fetch artist information
          const artistRef = doc(db, 'users', artworkData.artistId);
          const artistSnap = await getDoc(artistRef);
          
          if (artistSnap.exists()) {
            setArtist(artistSnap.data());
          } else {
            setError('Artist information not found');
          }
        } else {
          setError('Artwork not found');
        }
      } catch (err) {
        setError('Error fetching artwork');
        console.error('Error fetching artwork:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchArtworkAndArtist();
  }, [id]);

  if (loading) {
    return <div className={styles.loading}>Loading...</div>;
  }

  if (error || !artwork) {
    return <div className={styles.error}>{error || 'Artwork not found'}</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Link href="/" className={`${buttonStyles.button} ${buttonStyles.small}`}>
          ← Back to Home
        </Link>
        <h1>{artwork.title}</h1>
      </div>

      <div className={styles.content}>
        <div className={styles.imageContainer}>
          <img src={artwork.imageUrl} alt={artwork.title} className={styles.image} />
        </div>

        <div className={styles.details}>
          <div className={styles.section}>
            <h2>Description</h2>
            <p>{artwork.description}</p>
          </div>

          <div className={styles.section}>
            <h2>Details</h2>
            <div className={styles.detailGrid}>
              <div className={styles.detailItem}>
                <span className={styles.label}>Category:</span>
                <span className={styles.value}>{artwork.category}</span>
              </div>
              <div className={styles.detailItem}>
                <span className={styles.label}>Tags:</span>
                <span className={styles.value}>{artwork.tags.join(', ')}</span>
              </div>
              {artwork.isForSale && (
                <div className={styles.detailItem}>
                  <span className={styles.label}>Price:</span>
                  <span className={styles.value}>${artwork.price}</span>
                </div>
              )}
              <div className={styles.detailItem}>
                <span className={styles.label}>Uploaded:</span>
                <span className={styles.value}>
                  {new Date(artwork.createdAt.toDate()).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>

          {artwork.links && artwork.links.length > 0 && (
            <div className={styles.section}>
              <h2>Links</h2>
              <div className={styles.links}>
                {artwork.links.split('\n').map((link, index) => (
                  <a
                    key={index}
                    href={link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.link}
                  >
                    {link}
                  </a>
                ))}
              </div>
            </div>
          )}

          <div className={styles.section}>
            <h2>Artist</h2>
            {artist && (
              <Link href={`/artist/${artwork.artistId}`} className={styles.artistLink}>
                {artist.displayName || 'Anonymous'}
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 