'use client';

import React, { useCallback } from "react";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import ArtworkLayout from "./layouts/ArtworkLayout";
import styles from "@/styles/embla.module.css";

const EmblaCarousel = ({ slides, options = {} }) => {
  const [emblaRef, emblaApi] = useEmblaCarousel(
    {
      loop: true,
      speed: 5,
      draggable: true,
      align: "center",
      containScroll: "trimSnaps",
      breakpoints: {
        768: {
          perView: 1,
        },
        1024: {
          perView: 3,
        },
      },
      ...options,
    },
    [Autoplay({ playOnInit: true, delay: 7000 })]
  );

  const scrollPrev = useCallback(() => {
    if (emblaApi) emblaApi.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    if (emblaApi) emblaApi.scrollNext();
  }, [emblaApi]);

  return (
    <section className={styles.embla}>
      <div className={styles.embla__viewport} ref={emblaRef}>
        <div className={styles.embla__container}>
          {slides.map((slide, index) => (
            <div className={styles.embla__slide} key={index}>
              <ArtworkLayout slide={slide} />
            </div>
          ))}
        </div>
      </div>
      <button
        className={`${styles.embla__button} ${styles.embla__button__prev}`}
        onClick={scrollPrev}
        aria-label="Scroll to previous slide"
      >
        {"<"}
      </button>
      <button
        className={`${styles.embla__button} ${styles.embla__button__next}`}
        onClick={scrollNext}
        aria-label="Scroll to next slide"
      >
        {">"}
      </button>
    </section>
  );
};

export default EmblaCarousel; 