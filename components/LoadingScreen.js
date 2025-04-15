// components/LoadingScreen.js
import React, { useState, useEffect, useRef } from 'react';
import styles from '../styles/LoadingScreen.module.css';

const loadingTextSequence = [
  "[AMA OS v3.4.7 - Vision Boot Sequence Initiated]",
  "> console.log(\"Preparing neural environment...\");",
  "[INFO] Silencing external stimuli...",
  "[INFO] Redirecting ocular input to internal stream...",
  "[INFO] Auditory dampening: 70% — faint external sound permitted for grounding.",
  "> console.log(\"Loading vision construct...\");",
  "[INFO] Parsing vision package: VSN-Δ47-B (\"The Forgotten Tower\")",
  "[INFO] Architecture: Fractal geometry with impossible symmetry",
  "[INFO] Emotional tone: Nostalgia / Dread hybrid",
  "[INFO] Temperature override: Cool mist sensation — ON",
  "> console.log(\"Injecting vision markers...\");",
  "[OK] Marker #1: Distant whisper, language unknown",
  "[OK] Marker #2: Crimson light source, impossible to approach",
  "[OK] Marker #3: A figure you *almost* recognize, just out of view",
  "> console.log(\"Reality anchors set. Fail-safe active.\");",
  "[ANCHORS]",
  "🔹 Tactile recall: pressure on left wrist = emergency reset",
  "🔹 Memory loop protection: enabled",
  "🔹 Oxygen monitoring: linked",
  "> console.log(\"Final lock: AMA OS ceding control to vision stream...\");",
  "[COUNTDOWN]",
  "3...",
  "2...",
  "1...",
  "> console.log(\"Vision Boot Complete.\")",
  "> console.log(\"AMA OS: You are now *elsewhere.*\")",
  "██████████████████████████████",
  "— Fractal structures unfold in impossible skies —",
  "— Footsteps behind you, but no shadow —",
  "— A door with no handle. You know you must open it —",
  "██████████████████████████████",
];


const LoadingScreen = () => {
      const [loadingProgress, setLoadingProgress] = useState(0);
      const [showLoading, setShowLoading] = useState(true);
      const [fadeOut, setFadeOut] = useState(false);
      const [animatedText, setAnimatedText] = useState([]);
      const [textIndex, setTextIndex] = useState(0);
      const [progressPercent, setProgressPercent] = useState(0);
      const consoleTextRef = useRef(null);
    const logoAnimationRef = useRef(null);
    const restElementsRef = useRef(null);

      useEffect(() => {
        let animationInterval;
        let progressInterval;
        const fakeLoadingDuration = 9000;
        const fadeOutDuration = 500;
        const incrementInterval = fakeLoadingDuration / 100;
    
        progressInterval = setInterval(() => {
          setLoadingProgress((prevProgress) => {
            if (prevProgress < 100) {
              return prevProgress + 1;
            }
            return prevProgress;
          });
          setProgressPercent((prevPercent) => {
            if (prevPercent < 100) {
              return Math.floor(prevPercent + 1);
            }
            return prevPercent;
          });
        }, incrementInterval);
    
        const finishLoading = () => {
          clearInterval(progressInterval);
          setLoadingProgress(100);
          setFadeOut(true);
          setTimeout(() => setShowLoading(false), fadeOutDuration);
        };
    
        const simulatePageLoad = setTimeout(() => {
          finishLoading();
        }, fakeLoadingDuration);
    
        return () => {
          clearInterval(animationInterval);
          clearInterval(progressInterval);
          clearTimeout(simulatePageLoad);
        };
      }, []);

    useEffect(() => {
            const logoFadeInTimer = setTimeout(() => {
              if (logoAnimationRef.current) {
                logoAnimationRef.current.classList.add(styles.fadeIn);
              }
            }, 500);
        
            const restFadeInTimer = setTimeout(() => {
              if (restElementsRef.current) {
                restElementsRef.current.classList.add(styles.restFadeIn);
              }
            }, 500); // Aumentamos el delay a 3 segundos
        
            return () => {
              clearTimeout(logoFadeInTimer);
              clearTimeout(restFadeInTimer);
            };
          }, []);

      useEffect(() => {
        if (textIndex < loadingTextSequence.length) {
          const timer = setTimeout(() => {
            setAnimatedText((prevText) => [...prevText, loadingTextSequence[textIndex]]);
            setTextIndex(textIndex + 1);
            if (consoleTextRef.current) {
              consoleTextRef.current.scrollTop = consoleTextRef.current.scrollHeight;
            }
          }, 300);
          return () => clearTimeout(timer);
        }
      }, [textIndex]);
    
      if (!showLoading) {
            return null;
          }
        
          return (
                <div className={`${styles.loadingContainer} ${fadeOut ? styles.fadeOut : ''}`}>
                  <div className={styles.logoAnimation} ref={logoAnimationRef}> {/* Añade la referencia al logo */}
                    <img src="/LOGO-BLACK.png" alt="Logo" />
                  </div>
                  <div ref={restElementsRef} className={styles.restElements}> {/* Contenedor para el resto */}
                    <div className={styles.progressBar}>
                      <div className={styles.progress} key={loadingProgress} style={{ width: `${loadingProgress}%` }}></div>
                    </div>
                    <p className={styles.loadingText}>Cargando... {progressPercent}%</p>
                    <div className={styles.consoleText} ref={consoleTextRef}>
                      {animatedText.map((line, index) => (
                        <p key={index}>{line}</p>
                        ))}
                    </div>
                  </div>
                </div>
              );
            };
        
        export default LoadingScreen;