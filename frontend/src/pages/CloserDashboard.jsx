import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { api, formatApiErrorDetail } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import StatusUpdateDialog from "../components/StatusUpdateDialog";
import { Phone, Search, LogOut, Filter, Instagram, Clock, CheckCircle2, XCircle, PhoneCall } from "lucide-react";
import { toast } from "sonner";
import { format, parseISO, isToday } from "date-fns";

const statusPillStyle = (s) => {
  switch (s) {
    case "approved": return { label: "Approved", cls: "bg-[#ECFDF5] text-[#047857] border-[#A7F3D0]", dot: "bg-[#10B981]" };
    case "rejected": return { label: "Rejected", cls: "bg-zinc-100 text-zinc-600 border-zinc-200", dot: "bg-zinc-400" };
    case "called":   return { label: "Called",   cls: "bg-[#FFFBEB] text-[#B45309] border-[#FDE68A]", dot: "bg-[#F59E0B]" };
    case "follow_up":return { label: "Follow-up",cls: "bg-[#FFFBEB] text-[#B45309] border-[#FDE68A]", dot: "bg-[#F59E0B]" };
    default:         return { label: "Not Called", cls: "bg-[#FEF2F2] text-[#8B0000] border-[#FECACA]", dot: "bg-[#8B0000]" };
  }
};

const filters = [
  { key: "all",          label: "All Leads" },
  { key: "not_called",   label: "Not Called" },
  { key: "follow_today", label: "Follow-up Today" },
];

export default function CloserDashboard() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const [leads, setLeads] = useState([]);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);

  const onLogout = async () => {
    await logout();
    nav("/login", { replace: true });
  };

  const load = async () => {
    try {
      const params = {};
      if (filter === "not_called") params.status = "not_called";
      if (filter === "follow_today") params.follow_up_today = true;
      if (search) params.search = search;
      const { data } = await api.get("/leads", { params });
      setLeads(data);
    } catch (e) {
      toast.error(formatApiErrorDetail(e.response?.data?.detail));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
    // eslint-disable-next-line
  }, [filter, search]);

  const counts = useMemo(() => {
    const todayFu = leads.filter(l => l.status === "follow_up" && l.follow_up_date && isToday(parseISO(l.follow_up_date))).length;
    const notCalled = leads.filter(l => l.status === "not_called").length;
    return { todayFu, notCalled, total: leads.length };
  }, [leads]);

  // Call/tel: handoff is done inline on the <a> element below.

  return (
    <div className="min-h-screen bg-[#FAFAFA] pb-28" data-testid="closer-dashboard">
      {/* Top bar */}
      <div className="bg-white border-b border-zinc-200 sticky top-0 z-30">
        <div className="max-w-md mx-auto px-5 py-4 flex items-center justify-between">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">Closer</div>
            <div className="font-heading font-bold text-lg truncate max-w-[180px]">{user?.name}</div>
          </div>
          <button data-testid="closer-logout" onClick={onLogout} className="p-2 rounded-lg hover:bg-zinc-100">
            <LogOut className="w-5 h-5 text-zinc-600" />
          </button>
        </div>

        {/* Stat chips */}
        <div className="max-w-md mx-auto px-5 pb-3 flex gap-2">
          <div className="flex-1 bg-[#FEF2F2] border border-[#FECACA] rounded-lg px-3 py-2">
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#8B0000]">Not Called</div>
            <div className="text-lg font-heading font-bold text-[#8B0000]">{counts.notCalled}</div>
          </div>
          <div className="flex-1 bg-[#FFFBEB] border border-[#FDE68A] rounded-lg px-3 py-2">
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#B45309]">Today FU</div>
            <div className="text-lg font-heading font-bold text-[#B45309]">{counts.todayFu}</div>
          </div>
          <div className="flex-1 bg-zinc-100 border border-zinc-200 rounded-lg px-3 py-2">
            <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Total</div>
            <div className="text-lg font-heading font-bold text-zinc-900">{counts.total}</div>
          </div>
        </div>
      </div>

      {/* Search + Filters */}
      <div className="max-w-md mx-auto px-5 pt-5 space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <Input
            data-testid="closer-search-input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by Instagram ID…"
            className="h-11 pl-9 bg-white"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-5 px-5 pb-1">
          {filters.map((f) => (
            <button
              key={f.key}
              data-testid={`filter-${f.key}`}
              onClick={() => setFilter(f.key)}
              className={`whitespace-nowrap px-4 h-9 rounded-full text-sm font-semibold border transition-all ${
                filter === f.key
                  ? "bg-[#8B0000] text-white border-[#8B0000]"
                  : "bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-50"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Leads list */}
      <div className="max-w-md mx-auto px-5 pt-5 space-y-3">
        {loading && <div className="text-center text-zinc-500 py-12">Loading…</div>}
        {!loading && leads.length === 0 && (
          <div className="text-center py-20">
            <PhoneCall className="w-10 h-10 text-zinc-300 mx-auto mb-3" />
            <div className="text-zinc-500 text-sm">No leads for this filter.</div>
          </div>
        )}

        {leads.map((l, idx) => {
          const s = statusPillStyle(l.status);
          return (
            <div
              key={l.id}
              data-testid={`lead-card-${l.id}`}
              className="bg-white border border-zinc-200 rounded-xl p-5 shadow-sm relative fade-in-up"
              style={{ animationDelay: `${idx * 25}ms` }}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0 pr-3">
                  <div className="font-heading font-bold text-lg text-zinc-900 truncate">{l.business_name}</div>
                  <a
                    href={`https://instagram.com/${l.instagram_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm text-zinc-500 mt-0.5"
                  >
                    <Instagram className="w-3.5 h-3.5" /> @{l.instagram_id}
                  </a>
                </div>
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold rounded-full border ${s.cls}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} /> {s.label}
                </span>
              </div>

              {l.category && (
                <div className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">{l.category}</div>
              )}

              {l.notes && (
                <p className="text-sm text-zinc-600 mb-3 line-clamp-2">{l.notes}</p>
              )}

              {l.status === "follow_up" && l.follow_up_date && (
                <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#B45309] bg-[#FFFBEB] border border-[#FDE68A] rounded-md px-2 py-1 mb-3">
                  <Clock className="w-3 h-3" /> FU: {format(parseISO(l.follow_up_date), "PP")}
                </div>
              )}

              {l.closer_notes && (
                <div className="text-xs text-zinc-500 bg-zinc-50 rounded-md p-2 mb-3 border border-zinc-100">
                  <span className="font-semibold text-zinc-600">Note:</span> {l.closer_notes}
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <a
                  data-testid={`call-button-${l.id}`}
                  href={`tel:${l.phone}`}
                  onClick={(e) => {
                    if (!window.confirm(`Call ${l.business_name} at ${l.phone}?`)) {
                      e.preventDefault();
                      return;
                    }
                    if (l.status === "not_called") {
                      api.patch(`/leads/${l.id}/status`, {
                        status: "called",
                        closer_notes: l.closer_notes || "Dialed.",
                        follow_up_date: null,
                      }).then(load).catch(() => {});
                    }
                  }}
                  className="flex-1 h-12 rcc-btn-primary font-semibold rounded-md flex items-center justify-center"
                >
                  <Phone className="w-4 h-4 mr-2" /> Call {l.phone}
                </a>
                <Button
                  data-testid={`update-button-${l.id}`}
                  variant="outline"
                  onClick={() => setSelected(l)}
                  className="h-12 px-4 border-zinc-300"
                >
                  Update
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {selected && (
        <StatusUpdateDialog
          lead={selected}
          open={!!selected}
          onClose={() => setSelected(null)}
          onSaved={load}
        />
      )}
    </div>
  );
}
