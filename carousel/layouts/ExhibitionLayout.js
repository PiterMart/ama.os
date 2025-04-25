import React from "react";
import Link from "next/link";
import styles from "../../styles/embla.module.css"
import Image from "next/image"


const ExhibitionLayout = ({ slide }) => {
  const formatDate = (timestamp) => {
    if (!timestamp || !timestamp.seconds) return "";
    const date = new Date(timestamp.seconds * 1000);
    return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
  };

  return (
    <div className={styles.embla__slide__inner}>
      <div className={styles.embla__slide__text}>
        <p style={{ fontSize: "1.25rem", fontWeight: "600" }}>{slide.name}</p>
        <p style={{ fontSize: "1rem", fontWeight: "400" }}>Tomas Redrado Art - {slide.sedeSlug}</p>
          {formatDate(slide.openingDate)} - {formatDate(slide.closingDate)}
          <p style={{fontSize: '1rem', fontWeight: '100', bottom: '0', position: 'absolute', alignSelf: 'end', paddingBottom: '1rem'}}>[exhibition]</p>
      </div>
      <Link href={`/headquarters/${slide.headquarterSlug}/${slide.slug}`} style={{margin: '0px', padding: '0px', width: '100vw'}}>
        <Image
          className={styles.embla__slide__img}
          src={slide.image}
          alt= "image of the exhibition"
          width={0}
          height={0}
          sizes="100vw"
          placeholder="empty"
          loading="lazy"
          quality={75} 
        />
      </Link>
    </div>
  );
};

export default ExhibitionLayout;
