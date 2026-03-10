import { Outlet } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';
import BottomNav from './BottomNav';

export default function MainLayout() {
  return (
    <div className="min-h-screen flex flex-col relative">
      {/* Background */}
      <div
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          backgroundImage: `url("/images/bg.jpeg")`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          opacity: 0.15,
        }}
      />
      <Header />
      <main className="flex-1 pb-20 md:pb-0 relative z-10">
        <Outlet />
      </main>
      <Footer />
      <BottomNav />
    </div>
  );
}
