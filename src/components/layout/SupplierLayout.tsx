import { Outlet } from 'react-router-dom';
import SupplierSidebar from './SupplierSidebar';

export default function SupplierLayout() {
  return (
    <div className="min-h-screen flex" style={{ backgroundColor: 'var(--color-background)' }}>
      <SupplierSidebar />
      <main className="flex-1 pt-[72px] md:pt-8 px-4 pb-6 md:px-8 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
