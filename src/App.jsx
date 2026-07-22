import { useCallback, useEffect, useRef, useState } from "react";
import { Route, Routes, useNavigate } from "react-router-dom";
import "./App.css";

import AuthRedirect from "./components/auth/AuthRedirect";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import AppLayout from "./layouts/AppLayout";
import { CallProvider } from "./contexts/CallContext";
import { useAuth } from "./contexts/AuthContext";

import CalendarPage from "./pages/CalendarPage";
import Chat from "./pages/Chat";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import LoveLetters from "./pages/LoveLetters";
import Memories from "./pages/Memories";
import Profile from "./pages/Profile";
import SharedMedia from "./pages/SharedMedia";
import CallHistory from "./pages/CallHistory";
import CoupleTimeline from "./pages/CoupleTimeline";
import MoreTogether from "./pages/MoreTogether";
import Setup from "./pages/Setup";
import SplashScreen from "./components/ui/SplashScreen";

function ProtectedPage({ children }) {
  return <ProtectedRoute>{children}</ProtectedRoute>;
}

function App() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [showSplash, setShowSplash] = useState(true);
  const [splashCompleted, setSplashCompleted] = useState(false);
  const initialRedirectDone = useRef(false);
  const closeSplash = useCallback(() => setSplashCompleted(true), []);

  useEffect(() => {
    if (!splashCompleted || authLoading || initialRedirectDone.current) {
      return;
    }

    initialRedirectDone.current = true;
    navigate(user ? "/dashboard" : "/", { replace: true });
    setShowSplash(false);
  }, [splashCompleted, authLoading, user, navigate]);

  if (showSplash) {
    return <SplashScreen onComplete={closeSplash} />;
  }

  return (
    <CallProvider>
    <Routes>
      <Route path="/" element={<AuthRedirect />} />
      <Route path="/login" element={<Login />} />

      <Route
        path="/setup"
        element={
          <ProtectedPage>
            <Setup />
          </ProtectedPage>
        }
      />

      <Route
        element={
          <ProtectedPage>
            <AppLayout />
          </ProtectedPage>
        }
      >
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/chat" element={<Chat />} />
        <Route path="/love-letters" element={<LoveLetters />} />
        <Route path="/memories" element={<Memories />} />
        <Route path="/calendar" element={<CalendarPage />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/shared-media" element={<SharedMedia />} />
        <Route path="/call-history" element={<CallHistory />} />
        <Route path="/timeline" element={<CoupleTimeline />} />
        <Route path="/more-together" element={<MoreTogether />} />
      </Route>

      <Route path="*" element={<AuthRedirect />} />
    </Routes>
    </CallProvider>
  );
}

export default App;
