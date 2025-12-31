import {
  LayoutDashboard,
  Upload,
  FileText,
  Mail,
  CheckCircle,
  XCircle,
  Settings,
  LogOut,
  GraduationCap,
  Cake,
  ArrowUpRight,
  Archive, // Add Archive icon
  RotateCcw,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/contexts/AuthContext";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";

const mainNavItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  // { title: "Upload PDFs", url: "/upload", icon: Upload }, // Removed as per user request
  { title: "Uploaded Files", url: "/files", icon: FileText },
  { title: "Email Queue", url: "/queue", icon: Mail },
  { title: "Students", url: "/students", icon: GraduationCap },
  { title: "Archived Students", url: "/archived-students", icon: Archive }, // Use Archive icon
  { title: "Student Promotion", url: "/student-promotion", icon: ArrowUpRight },
  { title: "Birthdays", url: "/birthdays", icon: Cake },
];

const historyNavItems = [
  { title: "Sent History", url: "/history/sent", icon: CheckCircle },
  { title: "Failed Emails", url: "/history/failed", icon: XCircle },
  { title: "Cancelled Emails", url: "/CancelledEmails", icon: XCircle },
];

const settingsNavItems = [
  { title: "Settings", url: "/settings", icon: Settings },
];

export function AdminSidebar() {
  const { signOut, user } = useAuth();

  return (
    <Sidebar className="border-r border-sidebar-border">
      <SidebarHeader className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg">
            <img
              src="/sfgs-logo.jpg"
              alt="SFGS Logo"
              className="h-7 w-7 rounded"
            />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-sidebar-foreground">
              SFGS
            </span>
            <span className="text-xs text-sidebar-muted">Admin Portal</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2">
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-muted text-xs uppercase tracking-wider px-3 py-2">
            Main
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      className="flex items-center gap-3 rounded-lg px-3 py-2 text-sidebar-foreground transition-colors hover:bg-sidebar-accent"
                      activeClassName="bg-white text-[rgb(74,15,63)] font-bold"
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-muted text-xs uppercase tracking-wider px-3 py-2">
            History
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {historyNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      className="flex items-center gap-3 rounded-lg px-3 py-2 text-sidebar-foreground transition-colors hover:bg-sidebar-accent"
                      activeClassName="bg-white text-[rgb(74,15,63)] font-bold"
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-muted text-xs uppercase tracking-wider px-3 py-2">
            System
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {settingsNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      className="flex items-center gap-3 rounded-lg px-3 py-2 text-sidebar-foreground transition-colors hover:bg-sidebar-accent"
                      activeClassName="bg-white text-[rgb(74,15,63)] font-bold"
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-sidebar-border">
        <div className="flex flex-col gap-2">
          <div className="text-xs text-sidebar-muted truncate">
            {user?.email}
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"
            onClick={signOut}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
