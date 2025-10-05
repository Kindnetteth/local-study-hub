import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { PeerProvider } from "./contexts/PeerContext";
import { UpdateNotification } from "@/components/UpdateNotification";
import Login from '@/pages/Login';
import Home from '@/pages/Home';
import BundleEditor from '@/pages/BundleEditor';
import FlashcardEditor from '@/pages/FlashcardEditor';
import Study from '@/pages/Study';
import PlaylistEditor from '@/pages/PlaylistEditor';
import Profile from '@/pages/Profile';
import Admin from '@/pages/Admin';
import { PeerSync } from '@/pages/PeerSync';
import Settings from '@/pages/Settings';
import NotFound from '@/pages/NotFound';
import { AboutDialog } from '@/components/AboutDialog';
import { useState, useEffect } from 'react';

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  return user ? <>{children}</> : <Navigate to="/" replace />;
};

const App = () => {
  const [showAbout, setShowAbout] = useState(false);

  useEffect(() => {
    if ((window as any).electronAPI) {
      (window as any).electronAPI.onShowAbout(() => {
        setShowAbout(true);
      });
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <UpdateNotification />
        <AboutDialog open={showAbout} onOpenChange={setShowAbout} />
        <HashRouter>
          <AuthProvider>
            <PeerProvider>
              <Routes>
                <Route path="/" element={<Login />} />
                <Route path="/home" element={<ProtectedRoute><Home /></ProtectedRoute>} />
                <Route path="/bundle/:bundleId" element={<ProtectedRoute><BundleEditor /></ProtectedRoute>} />
                <Route path="/bundle/:bundleId/cards" element={<ProtectedRoute><FlashcardEditor /></ProtectedRoute>} />
                <Route path="/study/:bundleId" element={<ProtectedRoute><Study /></ProtectedRoute>} />
                <Route path="/playlist/:playlistId" element={<ProtectedRoute><PlaylistEditor /></ProtectedRoute>} />
                <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
                <Route path="/profile/:userId" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
                <Route path="/peer-sync" element={<ProtectedRoute><PeerSync /></ProtectedRoute>} />
                <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
                <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </PeerProvider>
          </AuthProvider>
        </HashRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
