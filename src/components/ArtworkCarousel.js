'use client';

import { useState, useEffect, useCallback } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Link from 'next/link';
import styles from '@/styles/HomeCarousel.module.css';

export default function ArtworkCarousel({ artistId }) {
  const [artworks, setArtworks] = useState([]);
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: 'start',
    loop: true,
    skipSnaps: false,
    inViewThreshold: 0.7,
  });

  const fetchArtworks = useCallback(async () => {
    try {
      const q = query(
        collection(db, 'artworks'),
        where('artistId', '==', artistId),
        orderBy('createdAt', 'desc')
      );
      const querySnapshot = await getDocs(q);
      const artworksData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setArtworks(artworksData);
    } catch (error) {
      console.error('Error fetching artworks:', error);
    }
  }, [artistId]);

  useEffect(() => {
    fetchArtworks();
  }, [fetchArtworks]);

  return (
    <div className={styles.embla}>
      <div className={styles.embla__viewport} ref={emblaRef}>
        <div className={styles.embla__container}>
          {artworks.map((artwork) => (
            <div className={styles.embla__slide} key={artwork.id}>
              <Link href={`/artwork/${artwork.id}`} className={styles.artworkLink}>
                <div className={styles.artworkCard}>
                  <img
                    src={artwork.imageUrl}
                    alt={artwork.title}
                    className={styles.artworkImage}
                  />
                  <div className={styles.artworkInfo}>
                    <h3 className={styles.artworkTitle}>{artwork.title}</h3>
                    <p className={styles.artworkArtist}>{artwork.artistName}</p>
                  </div>
                </div>
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
} 