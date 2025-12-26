import {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  ReactNode,
} from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isAdmin: boolean;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const timerRef = useRef<number | null>(null);

  // Idle timeout in milliseconds (10 minutes)
  const IDLE_TIMEOUT_MS = 10 * 60 * 1000;

  const clearIdleTimer = () => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const startIdleTimer = () => {
    clearIdleTimer();
    timerRef.current = window.setTimeout(async () => {
      // Auto sign out on idle
      await supabase.auth.signOut();
      setUser(null);
      setSession(null);
      setIsAdmin(false);
      toast({ title: "Signed out due to inactivity" });
    }, IDLE_TIMEOUT_MS);
  };

  const resetIdleTimer = () => {
    if (!user) return;
    startIdleTimer();
  };

  const checkAdminRole = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .eq("role", "admin")
        .maybeSingle();
      if (error) {
        return false;
      }
      return !!data;
    } catch (err) {
      return false;
    }
  };

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
    });

    return () => {
      subscription.unsubscribe();
      clearIdleTimer();
    };
  }, []);

  useEffect(() => {
    if (user) {
      setIsLoading(true);
      checkAdminRole(user.id).then((adminStatus) => {
        setIsAdmin(adminStatus);
        setIsLoading(false);
      });
    } else {
      setIsAdmin(false);
      setIsLoading(false);
    }
    // start/stop idle timer and activity listeners
    const activityEvents = [
      "mousemove",
      "mousedown",
      "keydown",
      "touchstart",
      "click",
    ] as const;
    const handleActivity = () => resetIdleTimer();

    if (user) {
      // start timer and attach listeners
      startIdleTimer();
      activityEvents.forEach((ev) =>
        window.addEventListener(ev, handleActivity)
      );
    } else {
      // ensure timer/listeners removed when no user
      clearIdleTimer();
      activityEvents.forEach((ev) =>
        window.removeEventListener(ev, handleActivity)
      );
    }

    return () => {
      clearIdleTimer();
      activityEvents.forEach((ev) =>
        window.removeEventListener(ev, handleActivity)
      );
    };
  }, [user]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error: error as Error | null };
  };

  const signUp = async (email: string, password: string) => {
    const redirectUrl = `${window.location.origin}/`;
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: redirectUrl },
    });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setIsAdmin(false);
    clearIdleTimer();
  };

  return (
    <AuthContext.Provider
      value={{ user, session, isAdmin, isLoading, signIn, signUp, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
