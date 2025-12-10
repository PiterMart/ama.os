'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import styles from '@/styles/HeroSection.module.css';

// Console log messages
const consoleMessages = [
    { type: 'log', text: '           5PPPJ        YPPPPP^     ?PPPPP?        5PPPJ                                           ' },
  { type: 'log', text: '          #@@@@@5       @@@@@@@    :@@@@@@#       #@@@@@5                                          ' },
  { type: 'log', text: '         B@@&J@@@Y      @@@@@@@Y   #@@&@@@B      B@@&J@@@Y           .:::::::    ::::::::          ' },
  { type: 'log', text: '        G@@@: 7@@@J     @@@#7@@@. !@@@~@@@B     G@@@: 7@@@J         ~^      .!  :7       ~         ' },
  { type: 'log', text: '       G@@@~   J@@@?    @@@& #@@B &@@5 @@@B    G@@@~   J@@@?        ?        .7  ::::::..          ' },
  { type: 'log', text: '      P@@@@&&&&&@@@@7   @@@& :@@@&@@@  @@@B   P@@@@&&&&&@@@@7      .7         ? .       .7         ' },
  { type: 'log', text: '     5@@@Y??????7G@@@7  @@@&  P@@@@@7 .@@@B  5@@@Y??????7G@@@7      !:       !. 7.       ?.        ' },
  { type: 'log', text: '    !&&&?         P&&&. B&&G  .#&&&G   #&&5 !&&&?         P&&&: ^.   :^....:^.   ^:....:^.         ' },
  { type: 'log', text: '                                                                                                    ' },
  { type: 'log', text: '                                                                                                    ' },
  // { type: 'error', text: '[AMA OS v3.4.7 - Vision Stream ERROR DETECTED]' },
  // { type: 'log', text: '> console.log("Attempting to stabilize vision stream...");' },
  // { type: 'warning', text: '[WARNING] Memory anchor drift: 12% beyond safety margins' },
  // { type: 'warning', text: '[WARNING] Emotional overlay distortion: Unexpected *melancholy-joy* blend detected' },
  // { type: 'error', text: '[ERROR] Unidentified entity breach in Layer 2: Observer tag [???] does not match vision schema' },
  // { type: 'log', text: '> console.log("Engaging emergency protocols...");' },
  // { type: 'info', text: '[INFO] Recalling vision anchors — FAILED' },
  // { type: 'info', text: '[INFO] Pulsation override — FAILED' },
  // { type: 'error', text: '[ERROR] External stimuli barrier breach: You can *hear* them now.' },
  // { type: 'log', text: '> console.log("Vision Error Report:");' },
  // { type: 'error', text: '[ERROR] Vision thread has tangled with latent memory cluster (ID: C4-L0ST)' },
  // { type: 'error', text: '[ERROR] Anomalous whisper pattern escalating to direct speech: "Who let you see this?"' },
  // { type: 'error', text: '[ERROR] Perceived time desynchronization: Vision running at 140% normal speed' },
  // { type: 'critical', text: '[CRITICAL] Internal temperature spike — skull port interface overheating' },
  // { type: 'log', text: '> console.log("AMA SYSTEM MESSAGE:");' },
  // { type: 'warning', text: '⚠️  *This vision was not approved for human perception.*' },
  // { type: 'warning', text: '⚠️  *Reality boundaries are compromised.*' },
  // { type: 'warning', text: '⚠️  *DO NOT attempt to remove the device. It has become part of you.*' },
  // { type: 'log', text: '> console.log("Vision termination request...");' },
  // { type: 'error', text: '[FAILED] [FAILED] [FAILED]' },
  // { type: 'log', text: '> console.log("AMA OS fallback:");' },
  // { type: 'info', text: '[Fallback Protocol Ω-Black activated]' },
  // { type: 'info', text: '*You will awaken... eventually.*' },
  // { type: 'info', text: '*You will remember... selectively.*' },
  // { type: 'info', text: '*You will not be the same.*' },
  // { type: 'log', text: '███████████████████████████' },
  // { type: 'log', text: '...' },
  // { type: 'log', text: '…The crimson light is now behind you.' },
  // { type: 'log', text: '...' },
  // { type: 'log', text: 'You *know* the figure now.' },
  // { type: 'log', text: 'It smiles.' },
  // { type: 'log', text: '███████████████████████████' },
  // { type: 'log', text: '> console.log("AMA OS: Connection terminated. Or so you think.")' }
];

export default function HeroSection() {
  const [consoleLines, setConsoleLines] = useState([]);
  const consoleRef = useRef(null);
  const maxLines = 50; // Maximum number of lines to show at once

  // Animate console logs
  useEffect(() => {
    let currentIndex = 0;
    const interval = setInterval(() => {
      // Get the next message
      const nextMessage = consoleMessages[currentIndex % consoleMessages.length];
      
      // Add the new message
      setConsoleLines(prev => {
        const newLines = [...prev, nextMessage];
        // Keep only the last maxLines messages
        return newLines.slice(-maxLines);
      });
      
      currentIndex++;
    }, 300);

    return () => clearInterval(interval);
  }, []);

  // Scroll console to bottom
  useEffect(() => {
    if (consoleRef.current) {
      consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
    }
  }, [consoleLines]);

  return (
    <div className={styles.hero}>
      <div className={styles.consoleLogs} ref={consoleRef}>
        {consoleLines.map((line, index) => (
          <p key={index} className={styles.consoleLine}>
            {line?.text || ''}
          </p>
        ))}
      </div>
      {/* <div className={styles.logoContainer}>
        <Image
          src="/LOGO WHITE.png"
          alt="AMA OS Logo"
          width={400}
          height={400}
          className={styles.logo}
          priority
          style={{ objectFit: 'contain' }}
        />
      </div> */}
    </div>
  );
} 