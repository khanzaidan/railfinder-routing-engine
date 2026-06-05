import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';

export default function Layout() {
  return (
    <div className="flex flex-col min-h-screen bg-slate-50 font-sans">
      <Navbar />

      {/* Page content fills remaining space */}
      <main className="flex-1">
        <Outlet />
      </main>

      <Footer />
    </div>
  );
}
