import { Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import { useEffect } from "react";
import ClipInput from "./Components/ClipBoard";
import Login from "./Components/Login";
import Register from "./Components/Register";
import SetPassword from "./Components/SetPassword";

function ProtectedRoute({ children }) {
  const token = localStorage.getItem("token");
  return token ? children : <Navigate to="/login" replace />;
}

// Intercepts /clips?token=... from Google OAuth, saves token, then renders the app
function ClipsPage() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const token = new URLSearchParams(location.search).get("token");
    if (token) {
      localStorage.setItem("token", token);
      navigate("/clips", { replace: true });
    }
  }, []);

  return <ClipInput />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/set-password" element={<SetPassword />} />
      <Route path="/clips" element={
        // Save token from URL first, then guard
        new URLSearchParams(window.location.search).get("token")
          ? <ClipsPage />
          : <ProtectedRoute><ClipsPage /></ProtectedRoute>
      } />
      <Route path="*" element={<Navigate to="/clips" replace />} />
    </Routes>
  );
}
