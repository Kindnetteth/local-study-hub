import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import Login from "./pages/Login";
import Home from "./pages/Home";
import BundleEditor from "./pages/BundleEditor";
import FlashcardEditor from "./pages/FlashcardEditor";
import Study from "./pages/Study";
import Profile from "./pages/Profile";
import Admin from "./pages/Admin";
import PlaylistEditor from "./pages/PlaylistEditor";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  return user ? <>{children}</> : <Navigate to="/" replace />;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Login />} />
            <Route path="/home" element={<ProtectedRoute><Home /></ProtectedRoute>} />
            <Route path="/bundle/:bundleId" element={<ProtectedRoute><BundleEditor /></ProtectedRoute>} />
            <Route path="/bundle/:bundleId/cards" element={<ProtectedRoute><FlashcardEditor /></ProtectedRoute>} />
            <Route path="/study/:bundleId" element={<ProtectedRoute><Study /></ProtectedRoute>} />
            <Route path="/playlist/:playlistId" element={<ProtectedRoute><PlaylistEditor /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="/profile/:userId" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
