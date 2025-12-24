import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { AdminSidebar } from "./AdminSidebar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";

interface AdminLayoutProps {
  children: ReactNode;
  title: string;
  description?: string;
}

function LoadingState() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <div className="h-12 w-12 rounded-lg bg-primary animate-pulse" />
        <div className="flex flex-col items-center gap-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
    </div>
  );
}

export function AdminLayout({
  children,
  title,
  description,
}: AdminLayoutProps) {
  const { user, isAdmin, isLoading } = useAuth();

  // Only render logs when state actually changes (not on every render)
  // Remove for production
  // useEffect(() => {
  //   console.log("AdminLayout:", { user, isAdmin, isLoading });
  // }, [user, isAdmin, isLoading]);

  if (isLoading) {
    return <LoadingState />;
  }

  // Only redirect after loading is complete and user is confirmed
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (!isAdmin) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AdminSidebar />
        <main className="flex-1 flex flex-col min-h-screen">
          <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-6">
            <SidebarTrigger className="-ml-2" />
            <div className="flex flex-col">
              <h1 className="text-lg font-semibold text-foreground">{title}</h1>
              {description && (
                <p className="text-xs text-muted-foreground">{description}</p>
              )}
            </div>
          </header>
          <div className="flex-1 p-6 overflow-auto">{children}</div>
        </main>
      </div>
    </SidebarProvider>
  );
}
