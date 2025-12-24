import { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { GraduationCap, Loader2, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const ADMIN_EMAIL = "admin@sfgs.local";

export default function Auth() {
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { signIn, signUp, user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!password.trim()) {
      toast({
        title: "Error",
        description: "Please enter the admin password.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      // First, verify password against database
      const { data: settings, error: settingsError } = await supabase
        .from("system_settings")
        .select("admin_password")
        .single();

      if (settingsError || !settings) {
        // If no settings exist, create default and check against default password
        if (password !== "sfgsadmin") {
          toast({
            title: "Invalid Password",
            description: "The password you entered is incorrect.",
            variant: "destructive",
          });
          setIsLoading(false);
          return;
        }
      } else if (settings.admin_password !== password) {
        toast({
          title: "Invalid Password",
          description: "The password you entered is incorrect.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      // Password is correct, now sign in or create the Supabase auth user
      const { error: signInError } = await signIn(ADMIN_EMAIL, password);
      
      if (signInError) {
        // User might not exist yet, try to create it
        if (signInError.message.includes("Invalid login credentials")) {
          const { error: signUpError } = await signUp(ADMIN_EMAIL, password);
          
          if (signUpError) {
            toast({
              title: "Error",
              description: "Failed to initialize admin account. Please try again.",
              variant: "destructive",
            });
            setIsLoading(false);
            return;
          }
          
          // Wait a moment for the user to be created, then sign in
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Now sign in with the newly created account
          const { data: signInData, error: retrySignInError } = await supabase.auth.signInWithPassword({
            email: ADMIN_EMAIL,
            password: password,
          });
          
          if (retrySignInError || !signInData.user) {
            toast({
              title: "Error",
              description: "Account created. Please try logging in again.",
              variant: "destructive",
            });
            setIsLoading(false);
            return;
          }
          
          // Add admin role for the newly created user
          await supabase
            .from("user_roles")
            .upsert({ user_id: signInData.user.id, role: "admin" }, { onConflict: "user_id,role" });
            
        } else {
          toast({
            title: "Error",
            description: signInError.message,
            variant: "destructive",
          });
          setIsLoading(false);
          return;
        }
      }

      navigate("/dashboard");
    } catch (err) {
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
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
          <CardTitle className="text-2xl font-bold">SFGS Admin Portal</CardTitle>
          <CardDescription>
            Sure Foundation Group of School - Email Automation System
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Admin Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter admin password"
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
