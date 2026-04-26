import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { Flame, Users, ListChecks, Pencil, PhoneCall, LogOut, BarChart3 } from "lucide-react";

const navByRole = {
  admin: [
    { to: "/admin", label: "Dashboard", icon: BarChart3 },
    { to: "/admin/leads", label: "All Leads", icon: ListChecks },
    { to: "/admin/users", label: "Users", icon: Users },
    { to: "/filler", label: "Lead Entry", icon: Pencil },
  ],
  lead_filler: [
    { to: "/filler", label: "Lead Entry", icon: Pencil },
  ],
  closer: [
    { to: "/closer", label: "Calling", icon: PhoneCall },
  ],
};

export default function Sidebar() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const links = navByRole[user?.role] || [];

  const onLogout = async () => {
    await logout();
    nav("/login", { replace: true });
  };

  return (
    <aside className="hidden md:flex flex-col w-64 bg-[#18181B] text-zinc-200 h-screen sticky top-0 p-5" data-testid="desktop-sidebar">
      <div className="flex items-center gap-2 mb-10 px-2">
        <div className="w-9 h-9 rounded-lg bg-[#8B0000] flex items-center justify-center">
          <Flame className="w-5 h-5 text-white" strokeWidth={2.2} />
        </div>
        <div>
          <div className="font-heading text-lg font-bold tracking-tight text-white">RCC Leads</div>
          <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">
            {user?.role?.replace("_", " ")}
          </div>
        </div>
      </div>

      <nav className="space-y-1 flex-1">
        {links.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            end
            data-testid={`sidebar-link-${l.label.toLowerCase().replace(/\s/g, '-')}`}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? "bg-white/10 text-white"
                  : "text-zinc-400 hover:bg-white/5 hover:text-white"
              }`
            }
          >
            <l.icon className="w-4 h-4" strokeWidth={2.2} />
            {l.label}
          </NavLink>
        ))}
      </nav>

      <div className="pt-4 border-t border-white/10">
        <div className="px-2 mb-3">
          <div className="text-sm font-semibold text-white truncate">{user?.name}</div>
          <div className="text-xs text-zinc-500 truncate">{user?.email}</div>
        </div>
        <button
          data-testid="sidebar-logout-button"
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-zinc-400 hover:bg-white/5 hover:text-white transition-all"
        >
          <LogOut className="w-4 h-4" strokeWidth={2.2} />
          Sign out
        </button>
      </div>
    </aside>
  );
}
