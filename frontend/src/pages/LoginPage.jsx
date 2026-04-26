import React, { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Lock, Mail, Flame } from "lucide-react";

export default function LoginPage() {
  const { user, login } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (user) return <Navigate to="/" replace />;

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    const res = await login(email.trim().toLowerCase(), password);
    setSubmitting(false);
    if (res.ok) nav("/", { replace: true });
    else setError(res.error || "Login failed");
  };

  return (
    <div className="min-h-screen grid md:grid-cols-2 bg-white" data-testid="login-page">
      {/* Left - form */}
      <div className="flex items-center justify-center p-8 md:p-16">
        <div className="w-full max-w-sm">
          <div className="flex items-center gap-2 mb-10">
            <div className="w-9 h-9 rounded-lg bg-[#8B0000] flex items-center justify-center">
              <Flame className="w-5 h-5 text-white" strokeWidth={2.2} />
            </div>
            <span className="font-heading text-xl font-bold tracking-tight">RCC Leads</span>
          </div>

          <h1 className="font-heading text-4xl sm:text-5xl font-black tracking-tight mb-3">
            Welcome back.
          </h1>
          <p className="text-zinc-500 mb-8">
            Sign in to your calling workspace.
          </p>

          <form onSubmit={onSubmit} className="space-y-5" data-testid="login-form">
            <div>
              <Label className="text-sm font-semibold text-zinc-700 mb-1.5 block">Email</Label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <Input
                  data-testid="login-email-input"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  className="h-12 pl-9 bg-zinc-50 focus:bg-white border-zinc-200"
                />
              </div>
            </div>

            <div>
              <Label className="text-sm font-semibold text-zinc-700 mb-1.5 block">Password</Label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <Input
                  data-testid="login-password-input"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="h-12 pl-9 bg-zinc-50 focus:bg-white border-zinc-200"
                />
              </div>
            </div>

            {error && (
              <div
                data-testid="login-error-message"
                className="text-sm text-[#8B0000] bg-[#FEF2F2] border border-[#FECACA] rounded-md px-3 py-2"
              >
                {error}
              </div>
            )}

            <Button
              data-testid="login-submit-button"
              type="submit"
              disabled={submitting}
              className="w-full h-12 font-semibold rcc-btn-primary"
            >
              {submitting ? "Signing in…" : "Sign in"}
            </Button>
          </form>

          <p className="text-xs text-zinc-400 mt-10">
            Closer accounts are created by your admin.
          </p>
        </div>
      </div>

      {/* Right - brand */}
      <div className="hidden md:block relative bg-[#18181B] overflow-hidden">
        <div className="absolute inset-0 opacity-[0.08]" style={{
          backgroundImage: "radial-gradient(circle at 20% 20%, rgba(139,0,0,0.9), transparent 40%), radial-gradient(circle at 80% 60%, rgba(16,185,129,0.7), transparent 40%)"
        }} />
        <div className="relative h-full flex flex-col justify-end p-12 text-white">
          <div className="text-xs font-bold uppercase tracking-[0.3em] text-zinc-500 mb-4">
            Lead Workflow · Premium CRM
          </div>
          <h2 className="font-heading text-4xl lg:text-5xl font-bold leading-tight">
            Close faster.
            <br />
            <span className="text-[#10B981]">Lose fewer.</span>
          </h2>
          <p className="text-zinc-400 mt-6 max-w-sm">
            Assign. Call. Qualify. Move on. Built for teams that can't afford a
            slow pipeline.
          </p>
        </div>
      </div>
    </div>
  );
}
