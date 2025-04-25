import { AuthProvider } from '../contexts/AuthContext';
import { ChatProvider } from '../contexts/ChatContext';
import '../app/globals.css';
import Navbar from '../../components/Navbar';

export const metadata = {
  title: 'AMA.OS',
  description: 'Your AI-powered assistant',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <ChatProvider>
            <Navbar />
            {children}
          </ChatProvider>
        </AuthProvider>
      </body>
    </html>
  );
} 