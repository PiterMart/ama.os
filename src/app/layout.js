import { AuthProvider } from '../contexts/AuthContext';
import { ChatProvider } from '../contexts/ChatContext';
import '../app/globals.css';
import styles from "./page.module.css";
import Navbar from '../components/Navbar';
import ChatModal from '../components/ChatModal';

export const metadata = {
  title: 'AMA.OS',
  description: 'Your AI-powered assistant',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
      <div className={styles.videoContainer}>
          <video
            autoPlay
            muted
            loop
            width={0}
            height={0}
            playsInline
            className={styles.backgroundVideo}
          >
            <source src="/placeholderbgamaos0001.mp4" type="video/mp4" />
          </video>
        </div>
        <AuthProvider>
          <ChatProvider>
            <Navbar />
            {children}
            <ChatModal />
          </ChatProvider>
        </AuthProvider>
      </body>
    </html>
  );
} 