import React, { useEffect, useState } from "react";
import { api, formatApiErrorDetail } from "../lib/api";
import Sidebar from "../components/Sidebar";
import LeadsTable from "../components/LeadsTable";
import { Users, ListChecks, PhoneCall, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export default function AdminDashboard() {
  const [stats, setStats] = useState({ total: 0, not_called: 0, approved: 0, closers: 0 });
  const [activity, setActivity] = useState([]);

  const load = async () => {
    try {
      const [leadsRes, closersRes, actRes] = await Promise.all([
        api.get("/leads"),
        api.get("/users/closers"),
        api.get("/stats/closer-activity"),
      ]);
      const leads = leadsRes.data;
      setStats({
        total: leads.length,
        not_called: leads.filter(l => l.status === "not_called").length,
        approved: leads.filter(l => l.status === "approved").length,
        closers: closersRes.data.length,
      });
      setActivity(actRes.data);
    } catch (e) {
      toast.error(formatApiErrorDetail(e.response?.data?.detail));
    }
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, []);

  const cards = [
    { label: "Total Leads", value: stats.total, icon: ListChecks, color: "text-zinc-900 bg-zinc-100" },
    { label: "Not Called", value: stats.not_called, icon: PhoneCall, color: "text-[#8B0000] bg-[#FEF2F2]" },
    { label: "Approved", value: stats.approved, icon: CheckCircle2, color: "text-[#047857] bg-[#ECFDF5]" },
    { label: "Closers", value: stats.closers, icon: Users, color: "text-zinc-900 bg-zinc-100" },
  ];

  return (
    <div className="flex bg-[#FAFAFA] min-h-screen" data-testid="admin-dashboard">
      <Sidebar />
      <main className="flex-1 p-6 md:p-10 overflow-y-auto">
        <div className="max-w-6xl mx-auto">
          <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-500 mb-2">Admin · Overview</div>
          <h1 className="font-heading text-3xl md:text-4xl font-black tracking-tight mb-8">Dashboard</h1>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
            {cards.map((c) => (
              <div key={c.label} className="bg-white border border-zinc-200 rounded-xl p-5">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${c.color}`}>
                  <c.icon className="w-5 h-5" />
                </div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">{c.label}</div>
                <div className="font-heading text-3xl font-black mt-1">{c.value}</div>
              </div>
            ))}
          </div>

          <h2 className="font-heading text-2xl font-bold mb-4">Closer activity</h2>
          <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden mb-10">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 border-b border-zinc-200">
                <tr className="text-left text-[11px] font-bold uppercase tracking-[0.12em] text-zinc-500">
                  <th className="px-4 py-3">Closer</th>
                  <th className="px-4 py-3">Total</th>
                  <th className="px-4 py-3">Not Called</th>
                  <th className="px-4 py-3">Called</th>
                  <th className="px-4 py-3">Approved</th>
                  <th className="px-4 py-3">Rejected</th>
                  <th className="px-4 py-3">Follow-up</th>
                </tr>
              </thead>
              <tbody>
                {activity.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-zinc-500">No activity yet.</td></tr>
                )}
                {activity.map((a) => (
                  <tr key={a.closer_id} className="border-t border-zinc-100">
                    <td className="px-4 py-3 font-semibold">{a.closer_name}</td>
                    <td className="px-4 py-3">{a.total}</td>
                    <td className="px-4 py-3 text-[#8B0000] font-semibold">{a.by_status?.not_called || 0}</td>
                    <td className="px-4 py-3">{a.by_status?.called || 0}</td>
                    <td className="px-4 py-3 text-[#047857] font-semibold">{a.by_status?.approved || 0}</td>
                    <td className="px-4 py-3 text-zinc-500">{a.by_status?.rejected || 0}</td>
                    <td className="px-4 py-3 text-[#B45309] font-semibold">{a.by_status?.follow_up || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
