import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, getCurrentUser, setCurrentUser, getUsers, saveUser, initializeStorage } from '@/lib/storage';
import { useToast } from '@/hooks/use-toast';

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => boolean;
  register: (username: string, password: string) => boolean;
  logout: () => void;
  isAdmin: boolean;
  refreshUser: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const { toast } = useToast();

  // Function to refresh user data from storage
  const refreshUser = () => {
    const currentUser = getCurrentUser();
    if (currentUser) {
      // Get the latest data from storage
      const users = getUsers();
      const updatedUser = users.find(u => u.id === currentUser.id);
      if (updatedUser) {
        setUser(updatedUser);
        setCurrentUser(updatedUser);
      }
    }
  };

  useEffect(() => {
    initializeStorage();
    const currentUser = getCurrentUser();
    setUser(currentUser);
  }, []);

  const login = (username: string, password: string): boolean => {
    const users = getUsers();
    const foundUser = users.find(
      u => u.username === username && u.password === password
    );

    if (foundUser) {
      setUser(foundUser);
      setCurrentUser(foundUser);
      toast({
        title: "Welcome back!",
        description: `Logged in as ${username}`,
      });
      return true;
    }

    toast({
      title: "Login failed",
      description: "Invalid username or password",
      variant: "destructive",
    });
    return false;
  };

  const register = (username: string, password: string): boolean => {
    const users = getUsers();
    
    if (users.find(u => u.username === username)) {
      toast({
        title: "Registration failed",
        description: "Username already exists",
        variant: "destructive",
      });
      return false;
    }

    if (!username.trim() || !password.trim()) {
      toast({
        title: "Registration failed",
        description: "Username and password are required",
        variant: "destructive",
      });
      return false;
    }

    // Generate unique user ID with timestamp and random string
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    const uniqueId = `user_${timestamp}_${random}`;

    const newUser: User = {
      id: uniqueId,
      username,
      password,
      createdAt: new Date().toISOString(),
    };

    saveUser(newUser);
    setUser(newUser);
    setCurrentUser(newUser);
    
    toast({
      title: "Account created!",
      description: `Welcome, ${username}!`,
    });
    return true;
  };

  const logout = () => {
    setUser(null);
    setCurrentUser(null);
    toast({
      title: "Logged out",
      description: "See you next time!",
    });
  };

  const isAdmin = user?.username === 'Kind';

  return (
    <AuthContext.Provider value={{ user, login, register, logout, isAdmin, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
