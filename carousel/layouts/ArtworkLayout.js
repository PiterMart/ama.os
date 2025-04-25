import React from "react";
import Link from "next/link";
import styles from "../../styles/page.module.css";
import Image from "next/image";

const ArtworkLayout = ({ slide }) => {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <Link href={`/artworks/${slide.slug}`}>
        <div className={styles.artist_page_image_container}>
          <Image
          src={slide.url} 
          alt={slide.title}
          width={0}
          height={0}
          sizes="100vw"
          placeholder="empty"
          loading="lazy"
          />
        </div>
      </Link>
      <div className={styles.artwork_details}>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
          <p>{slide.title}</p>
          <p>{slide.date}</p>
        </div>
        <div style={{ color: "gray" }}>
          <p>{slide.medium}</p>
          <p>{slide.measurements}</p>
        </div>
      </div>
    </div>
  );
};

export default ArtworkLayout;
