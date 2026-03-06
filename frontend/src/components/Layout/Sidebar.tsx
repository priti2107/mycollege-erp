import { useState } from "react";
import { NavLink } from "react-router-dom";
import { 
  LayoutDashboard, 
  Users, 
  UserCheck, 
  BookOpen, 
  ClipboardList, 
  CreditCard, 
  Library, 
  Settings,
  ChevronLeft,
  GraduationCap,
  UserPlus
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface SidebarProps {
  userRole: 'admin' | 'faculty' | 'student';
}

const menuItems = {
  admin: [
    { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
    { icon: Users, label: "Students", path: "/students" },
    { icon: UserCheck, label: "Faculty", path: "/faculty" },
    { icon: UserPlus, label: "Assign Classes", path: "/class-assignment" },
    { icon: ClipboardList, label: "Attendance", path: "/attendance" },
    { icon: BookOpen, label: "Results", path: "/results" },
    { icon: CreditCard, label: "Fees", path: "/fees" },
    { icon: Library, label: "Library", path: "/library" },
    { icon: Settings, label: "Settings", path: "/settings" },
  ],
  faculty: [
    { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
    { icon: ClipboardList, label: "Attendance", path: "/faculty-attendance" },
    { icon: BookOpen, label: "Assignments", path: "/faculty-assignments" },
    { icon: GraduationCap, label: "Grades", path: "/faculty-grades" },
    { icon: Library, label: "Library", path: "/library" },
    { icon: Settings, label: "Settings", path: "/settings" },
  ],
  student: [
    { icon: LayoutDashboard, label: "Dashboard", path: "/student-dashboard" },
    { icon: ClipboardList, label: "Attendance", path: "/student-attendance" },
    { icon: BookOpen, label: "Results", path: "/student-results" },
    { icon: CreditCard, label: "Fees", path: "/student-fees" },
    { icon: Library, label: "Library", path: "/library" },
    { icon: Settings, label: "Settings", path: "/settings" },
  ]
};

export function Sidebar({ userRole }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const items = menuItems[userRole];

  return (
    <div className={cn(
      "h-screen bg-surface erp-card border-r border-border/50 transition-all duration-300 flex flex-col",
      isCollapsed ? "w-16" : "w-64"
    )}>
      {/* Header */}
      <div className="p-4 border-b border-border/50 flex items-center justify-between">
        {!isCollapsed && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 erp-gradient-bg rounded-lg flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">MyCollege</h2>
              <p className="text-xs text-muted-foreground">ERP System</p>
            </div>
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="w-8 h-8 p-0"
        >
          <ChevronLeft className={cn(
            "w-4 h-4 transition-transform",
            isCollapsed && "rotate-180"
          )} />
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {items.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200",
              "hover:bg-primary/10 hover:text-primary",
              isActive && "bg-primary text-primary-foreground shadow-md",
              isCollapsed && "justify-center"
            )}
          >
            <item.icon className="w-5 h-5" />
            {!isCollapsed && <span className="font-medium">{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* User Role Badge */}
      {!isCollapsed && (
        <div className="p-4 border-t border-border/50">
          <div className="px-3 py-2 bg-accent/10 rounded-lg">
            <p className="text-sm font-medium capitalize">{userRole}</p>
            <p className="text-xs text-muted-foreground">Dashboard</p>
          </div>
        </div>
      )}
    </div>
  );
}