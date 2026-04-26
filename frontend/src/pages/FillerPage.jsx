import React, { useEffect, useState } from "react";
import { api, formatApiErrorDetail } from "../lib/api";
import Sidebar from "../components/Sidebar";
import LeadForm from "../components/LeadForm";
import LeadsTable from "../components/LeadsTable";
import { Button } from "../components/ui/button";
import { ExternalLink, Instagram } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { toast } from "sonner";

export default function FillerPage() {
  const [refreshKey, setRefreshKey] = useState(0);
  const { logout, user } = useAuth();

  return (
    <div className="flex bg-[#FAFAFA] min-h-screen" data-testid="filler-page">
      <Sidebar />

      <main className="flex-1 overflow-hidden">
        <div className="md:hidden flex items-center justify-between p-4 border-b border-zinc-200 bg-white sticky top-0 z-10">
          <div className="font-heading font-bold">RCC Leads · Entry</div>
          <button onClick={logout} className="text-sm text-zinc-500" data-testid="mobile-logout">Logout</button>
        </div>

        <div className="grid lg:grid-cols-12 min-h-[calc(100vh-0px)]">
          {/* LEFT - Instagram panel (desktop only) */}
          <div className="hidden lg:flex col-span-4 xl:col-span-3 border-r border-zinc-200 bg-zinc-50 flex-col p-8 items-center justify-center h-screen sticky top-0">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#8B0000] to-[#c31c1c] flex items-center justify-center mb-6 shadow-lg">
              <Instagram className="w-10 h-10 text-white" strokeWidth={2.2} />
            </div>
            <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-500 mb-2">Research Panel</div>
            <h3 className="font-heading text-2xl font-bold mb-3 text-center">Browse Instagram</h3>
            <p className="text-sm text-zinc-500 text-center mb-6 max-w-xs">
              Instagram blocks embedding. Open it in a new tab — keep this window side-by-side while you capture leads.
            </p>
            <Button
              data-testid="open-instagram-button"
              onClick={() => window.open("https://www.instagram.com/", "_blank", "noopener,noreferrer")}
              className="rcc-btn-primary h-12 px-6 font-semibold"
            >
              <ExternalLink className="w-4 h-4 mr-2" /> Open Instagram
            </Button>
            <div className="mt-10 text-xs text-zinc-400 text-center">
              Tip: keep a shortcut to your target niche hashtag for faster scouting.
            </div>
          </div>

          {/* RIGHT - Entry + table */}
          <div className="col-span-12 lg:col-span-8 xl:col-span-9 overflow-y-auto p-6 md:p-10">
            <div className="max-w-5xl mx-auto">
              <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-500 mb-2">
                {user?.role === "admin" ? "Admin · Lead Entry" : "Lead Filler"}
              </div>
              <h1 className="font-heading text-3xl md:text-4xl font-black tracking-tight mb-2">
                Capture a new lead
              </h1>
              <p className="text-zinc-500 mb-8">Fast entry — press tab through fields. Duplicates are blocked automatically.</p>

              <div className="bg-white border border-zinc-200 rounded-xl p-6 md:p-8 shadow-sm mb-10">
                <LeadForm onCreated={() => setRefreshKey((k) => k + 1)} />
              </div>

              <div className="flex items-center justify-between mb-4">
                <h2 className="font-heading text-2xl font-bold">Recent leads</h2>
              </div>
              <LeadsTable canEdit canReassign refreshKey={refreshKey} />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
