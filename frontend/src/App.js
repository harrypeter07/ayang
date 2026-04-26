import React from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import LoginPage from "@/pages/LoginPage";
import FillerPage from "@/pages/FillerPage";
import CloserDashboard from "@/pages/CloserDashboard";
import AdminDashboard from "@/pages/AdminDashboard";
import AdminLeadsPage from "@/pages/AdminLeadsPage";
import UserManagementPage from "@/pages/UserManagementPage";

function RoleRedirect() {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center text-zinc-500">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === "admin") return <Navigate to="/admin" replace />;
  if (user.role === "lead_filler") return <Navigate to="/filler" replace />;
  return <Navigate to="/closer" replace />;
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster position="top-right" richColors />
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route path="/admin" element={
            <ProtectedRoute roles={["admin"]}><AdminDashboard /></ProtectedRoute>
          } />
          <Route path="/admin/leads" element={
            <ProtectedRoute roles={["admin"]}><AdminLeadsPage /></ProtectedRoute>
          } />
          <Route path="/admin/users" element={
            <ProtectedRoute roles={["admin"]}><UserManagementPage /></ProtectedRoute>
          } />

          <Route path="/filler" element={
            <ProtectedRoute roles={["admin", "lead_filler"]}><FillerPage /></ProtectedRoute>
          } />

          <Route path="/closer" element={
            <ProtectedRoute roles={["closer"]}><CloserDashboard /></ProtectedRoute>
          } />

          <Route path="/" element={<RoleRedirect />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
