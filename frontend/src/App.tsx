// src/App.tsx

import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
} from "react-router-dom";

import { AuthProvider } from "./contexts/AuthContext";
import { ThemeProvider } from "./contexts/ThemeContext";

import { ProtectedRoute } from "./components/ProtectedRoute";
import AppLayout from "./components/AppLayout";
import GlobalLanguageController from "./components/GlobalLanguageController";

import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import Features from "./pages/Features";
import Solutions from "./pages/Solutions";
import About from "./pages/About";
import Contact from "./pages/Contact";

import Dashboard from "./pages/Dashboard";
import ChatPage from "./pages/ChatPage";
import Chats from "./pages/Chats";
import Account from "./pages/Account";
import Library from "./pages/Library";
import Settings from "./pages/Settings";
import Archive from "./pages/Archive";
import WebsiteSafety from "./pages/WebsiteSafety";
import Caregiver from "./pages/Caregiver";
import AlertHistory from "./pages/AlertHistory";
import HearingAssistant from "./pages/HearingAssistant";

import globalBackground from "./assets/wellpaper.jpg";


function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <GlobalLanguageController />
          <div
            className="accessmate-global-app"
            style={{
              minHeight: "100dvh",
              backgroundImage: `url(${globalBackground})`,
              backgroundSize: "cover",
              backgroundPosition: "center center",
              backgroundRepeat: "no-repeat",
              backgroundAttachment: "fixed",
            }}
          >
            <Routes>

              {/* PUBLIC ROUTES */}

              <Route path="/" element={<Landing />} />
              <Route path="/features" element={<Features />} />
              <Route path="/solutions" element={<Solutions />} />
              <Route path="/about" element={<About />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/auth" element={<Auth />} />


              {/* PROTECTED ROUTES */}

              <Route element={<ProtectedRoute />}>
                <Route element={<AppLayout />}>

                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/chats" element={<Chats />} />
                  <Route path="/chat/:chatId" element={<ChatPage />} />
                  <Route path="/account" element={<Account />} />
                  <Route path="/library" element={<Library />} />
                  <Route path="/website-safety" element={<WebsiteSafety />} />
                  <Route path="/caregiver" element={<Caregiver />} />
                  <Route path="/alert-history" element={<AlertHistory />} />
                  <Route path="/hearing-assistant" element={<HearingAssistant />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/archive" element={<Archive />} />

                </Route>
              </Route>


              {/* FALLBACK */}

              <Route
                path="*"
                element={<Navigate to="/" replace />}
              />

            </Routes>
          </div>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}


export default App;
