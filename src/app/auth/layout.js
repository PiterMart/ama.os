import { AuthProvider } from '../../../contexts/AuthContext';
import { ChatProvider } from '../../../contexts/ChatContext';
import Navbar from '../../../components/Navbar';

export const metadata = {
  title: 'Authentication - AMA.OS',
  description: 'Login or register to access AMA.OS',
};

export default function AuthLayout({ children }) {
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