import Navbar from '../../../components/Navbar';

export const metadata = {
  title: 'Authentication - AMA.OS',
  description: 'Login or register to access AMA.OS',
};

export default function AuthLayout({ children }) {
  return (
    <>
      <Navbar />
      {children}
    </>
  );
} 