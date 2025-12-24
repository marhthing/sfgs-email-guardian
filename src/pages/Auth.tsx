import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { GraduationCap, Loader2, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

// Fixed admin account - only one user in the system
const ADMIN_EMAIL = "admin@sfgs.local";

export default function Auth() {
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Use effect to navigate after login to avoid render loop
  useEffect(() => {
    if (!authLoading && user) {
      navigate("/dashboard", { replace: true });
    }
  }, [authLoading, user, navigate]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (user) {
    // Prevent rendering anything while redirecting
    return null;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!password.trim()) {
      toast({
        title: "Error",
        description: "Please enter the password.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      // Get the admin password from database
      const { data: settings } = await supabase
        .from("system_settings")
        .select("admin_password")
        .maybeSingle();

      const correctPassword = settings?.admin_password || "sfgsadmin";

      // Check if password matches
      if (password !== correctPassword) {
        toast({
          title: "Wrong Password",
          description: "The password you entered is incorrect.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      // Password correct - sign in to the fixed admin account
      // Try to sign in first
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: ADMIN_EMAIL,
        password: correctPassword,
      });

      if (signInError) {
        // Account doesn't exist, create it
        if (signInError.message.includes("Invalid login credentials")) {
          const { data: signUpData, error: signUpError } =
            await supabase.auth.signUp({
              email: ADMIN_EMAIL,
              password: correctPassword,
              options: { emailRedirectTo: `${window.location.origin}/` },
            });

          if (signUpError) {
            toast({
              title: "Error",
              description: "Failed to initialize. Please try again.",
              variant: "destructive",
            });
            setIsLoading(false);
            return;
          }

          // Add admin role for the new user
          if (signUpData.user) {
            await supabase
              .from("user_roles")
              .upsert(
                { user_id: signUpData.user.id, role: "admin" },
                { onConflict: "user_id,role" }
              );
          }

          // Sign in with the new account
          await supabase.auth.signInWithPassword({
            email: ADMIN_EMAIL,
            password: correctPassword,
          });
        } else {
          toast({
            title: "Error",
            description: "Login failed. Please try again.",
            variant: "destructive",
          });
          setIsLoading(false);
          return;
        }
      }

      toast({
        title: "Welcome!",
        description: "Login successful.",
      });
      // Removed navigate("/dashboard") here to avoid navigation loop
    } catch (err) {
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-primary">
            <GraduationCap className="h-7 w-7 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl font-bold">
            SFGS Admin Portal
          </CardTitle>
          <CardDescription>
            Sure Foundation Group of School - Email Automation System
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing In...
                </>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
