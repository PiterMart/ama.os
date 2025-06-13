import Navbar from '../../components/Navbar';

export default function ProfileLayout({ children }) {
  return (
    <>
      <Navbar />
      {children}
    </>
  );
} 