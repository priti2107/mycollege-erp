import { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { Navbar } from "./Navbar";

interface DashboardLayoutProps {
  children: ReactNode;
  userRole: 'admin' | 'faculty' | 'student';
  user: {
    name: string;
    email: string;
    role: string;
    avatar?: string;
  };
  onLogout: () => void;
}

export function DashboardLayout({ children, userRole, user, onLogout }: DashboardLayoutProps) {
  return (
    <div className="flex h-screen bg-background">
      <Sidebar userRole={userRole} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar user={user} onLogout={onLogout} />
        <main className="flex-1 overflow-auto p-6">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}