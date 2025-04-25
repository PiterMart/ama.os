import React, { useState } from "react";
import Lightbox from "react-image-lightbox"; 
import "react-image-lightbox/style.css"; 
import styles from "../../styles/page.module.css";
import Image from "next/image";

const PictureLayout = ({ slide }) => {
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [photoIndex, setPhotoIndex] = useState(0); 

  const handleImageClick = () => {
    setPhotoIndex(0);
    setIsLightboxOpen(true);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <div className={styles.artist_page_image_container}>
        <Image
          src={slide.image}
          alt={slide.title}
          style={{ width: "100%", cursor: "pointer" }} 
          onClick={handleImageClick} 
          width={0}
          height={0}
          sizes="100vw"
          placeholder="empty"
          loading="lazy"
        />
      </div>

      {/* Lightbox */}
      {isLightboxOpen && (
        <Lightbox
          mainSrc={slide.image} 
          onCloseRequest={() => setIsLightboxOpen(false)}
        />
      )}
    </div>
  );
};

export default PictureLayout;
