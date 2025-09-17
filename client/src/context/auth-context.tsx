import { createContext, useContext, ReactNode } from 'react';
import { useCurrentUser, useLogin, useLogout, useSignup, type SafeUser } from '@/hooks/use-sessions';
import { useToast } from '@/hooks/use-toast';

interface AuthContextType {
  user: SafeUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (credentials: { username: string; password: string }) => Promise<void>;
  signup: (userData: { username: string; password: string; confirmPassword: string }) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const { data: userData, isLoading } = useCurrentUser();
  const loginMutation = useLogin();
  const signupMutation = useSignup();
  const logoutMutation = useLogout();
  const { toast } = useToast();

  const user = userData?.user || null;
  const isAuthenticated = !!user;

  const login = async (credentials: { username: string; password: string }) => {
    try {
      await loginMutation.mutateAsync(credentials);
      toast({
        title: "Login Successful",
        description: "Welcome back to AI Think Tank!",
      });
    } catch (error: any) {
      const errorMessage = error?.message || "Login failed. Please check your credentials.";
      toast({
        title: "Login Failed",
        description: errorMessage,
        variant: "destructive",
      });
      throw error;
    }
  };

  const signup = async (userData: { username: string; password: string; confirmPassword: string }) => {
    try {
      await signupMutation.mutateAsync(userData);
      toast({
        title: "Account Created",
        description: "Your account has been created successfully! Please log in.",
      });
    } catch (error: any) {
      const errorMessage = error?.message || "Registration failed. Please try again.";
      toast({
        title: "Registration Failed",
        description: errorMessage,
        variant: "destructive",
      });
      throw error;
    }
  };

  const logout = async () => {
    try {
      await logoutMutation.mutateAsync();
      toast({
        title: "Logged Out",
        description: "You have been successfully logged out.",
      });
    } catch (error: any) {
      toast({
        title: "Logout Error",
        description: "There was an issue logging out.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const contextValue: AuthContextType = {
    user,
    isLoading: isLoading || loginMutation.isPending || signupMutation.isPending || logoutMutation.isPending,
    isAuthenticated,
    login,
    signup,
    logout,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}