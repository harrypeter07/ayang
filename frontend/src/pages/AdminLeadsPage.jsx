import React from "react";
import Sidebar from "../components/Sidebar";
import LeadsTable from "../components/LeadsTable";

export default function AdminLeadsPage() {
  return (
    <div className="flex bg-[#FAFAFA] min-h-screen" data-testid="admin-leads-page">
      <Sidebar />
      <main className="flex-1 p-6 md:p-10 overflow-y-auto">
        <div className="max-w-6xl mx-auto">
          <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-500 mb-2">Admin</div>
          <h1 className="font-heading text-3xl md:text-4xl font-black tracking-tight mb-2">All Leads</h1>
          <p className="text-zinc-500 mb-8">View everything. Reassign on the fly. Delete dupes.</p>
          <LeadsTable canEdit canReassign />
        </div>
      </main>
    </div>
  );
}
