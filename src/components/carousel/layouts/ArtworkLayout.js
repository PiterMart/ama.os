import React from "react";
import Link from "next/link";
import Image from "next/image";
import styles from "@/styles/ArtworkCarousel.module.css";

const ArtworkLayout = ({ slide }) => {
  return (
    <div className={styles.artworkContainer}>
      <div className={styles.artworkImageContainer}>
        <Image
          src={slide.imageUrl}
          alt={slide.title}
          width={500}
          height={500}
          style={{ objectFit: 'contain' }}
        />
      </div>
      <div className={styles.artworkInfo}>
        <h3 className={styles.title}>{slide.title}</h3>
        <p className={styles.description}>{slide.description}</p>
        {slide.externalLink && (
          <a 
            href={slide.externalLink}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.externalLink}
          >
            View on External Platform
          </a>
        )}
      </div>
    </div>
  );
};

export default ArtworkLayout; 