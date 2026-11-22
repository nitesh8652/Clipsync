import { Routes, Route, Navigate } from "react-router-dom";
import ClipInput from "./Components/ClipBoard";
import Login from "./Components/Login";
import Register from "./Components/Register";
import SetPassword from "./Components/SetPassword";

function ProtectedRoute({ children }) {
  const token = localStorage.getItem("token");
  return token ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/set-password" element={<SetPassword />} />
      <Route path="/clips" element={<ProtectedRoute><ClipInput /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/clips" replace />} />
    </Routes>
  );
}
