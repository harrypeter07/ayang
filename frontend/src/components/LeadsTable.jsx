import React, { useEffect, useState } from "react";
import { api, formatApiErrorDetail } from "../lib/api";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "./ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Pencil, Trash2, Search, UserPlus, Phone } from "lucide-react";
import { toast } from "sonner";

const statusStyle = {
  not_called:  { label: "Not Called",  cls: "bg-[#FEF2F2] text-[#8B0000] border-[#FECACA]" },
  called:      { label: "Called",      cls: "bg-[#FFFBEB] text-[#B45309] border-[#FDE68A]" },
  approved:    { label: "Approved",    cls: "bg-[#ECFDF5] text-[#047857] border-[#A7F3D0]" },
  rejected:    { label: "Rejected",    cls: "bg-zinc-100 text-zinc-600 border-zinc-200" },
  follow_up:   { label: "Follow-up",   cls: "bg-[#FFFBEB] text-[#B45309] border-[#FDE68A]" },
};

export default function LeadsTable({ canEdit = true, canReassign = true, refreshKey = 0 }) {
  const [leads, setLeads] = useState([]);
  const [closers, setClosers] = useState([]);
  const [filterCloser, setFilterCloser] = useState("all");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const params = {};
      if (filterCloser && filterCloser !== "all") params.assigned_closer_id = filterCloser;
      if (search) params.search = search;
      const { data } = await api.get("/leads", { params });
      setLeads(data);
    } catch (e) {
      toast.error(formatApiErrorDetail(e.response?.data?.detail) || "Failed to load leads");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/users/closers");
        setClosers(data);
      } catch {}
    })();
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
    // eslint-disable-next-line
  }, [filterCloser, search, refreshKey]);

  const onDelete = async (id) => {
    if (!window.confirm("Delete this lead?")) return;
    try {
      await api.delete(`/leads/${id}`);
      toast.success("Lead deleted");
      load();
    } catch (e) {
      toast.error(formatApiErrorDetail(e.response?.data?.detail));
    }
  };

  const onReassign = async (id, closerId) => {
    try {
      await api.put(`/leads/${id}`, { assigned_closer_id: closerId || null });
      toast.success("Reassigned");
      load();
    } catch (e) {
      toast.error(formatApiErrorDetail(e.response?.data?.detail));
    }
  };

  return (
    <div data-testid="leads-table">
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <Input
            data-testid="leads-search-input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by Instagram ID…"
            className="h-11 pl-9 bg-zinc-50"
          />
        </div>
        <Select value={filterCloser} onValueChange={setFilterCloser}>
          <SelectTrigger data-testid="leads-filter-closer" className="w-full sm:w-56 h-11 bg-zinc-50">
            <SelectValue placeholder="Filter by closer" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Closers</SelectItem>
            {closers.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="border border-zinc-200 rounded-xl overflow-hidden bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 border-b border-zinc-200">
              <tr className="text-left text-[11px] font-bold uppercase tracking-[0.12em] text-zinc-500">
                <th className="px-4 py-3">Business</th>
                <th className="px-4 py-3">Instagram</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Closer</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-zinc-500">Loading…</td></tr>
              )}
              {!loading && leads.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-zinc-500">No leads yet. Add one on the right →</td></tr>
              )}
              {leads.map((l) => {
                const s = statusStyle[l.status] || statusStyle.not_called;
                return (
                  <tr key={l.id} data-testid={`lead-row-${l.id}`} className="border-t border-zinc-100 hover:bg-zinc-50/70 transition-colors">
                    <td className="px-4 py-3 font-semibold text-zinc-900">{l.business_name}</td>
                    <td className="px-4 py-3 text-zinc-600">@{l.instagram_id}</td>
                    <td className="px-4 py-3">
                      <a href={`tel:${l.phone}`} className="inline-flex items-center gap-1.5 text-[#8B0000] font-medium">
                        <Phone className="w-3.5 h-3.5" /> {l.phone}
                      </a>
                    </td>
                    <td className="px-4 py-3 text-zinc-600">{l.category}</td>
                    <td className="px-4 py-3">
                      {canReassign ? (
                        <Select value={l.assigned_closer_id || "none"} onValueChange={(v) => onReassign(l.id, v === "none" ? null : v)}>
                          <SelectTrigger data-testid={`reassign-${l.id}`} className="h-9 w-40 bg-white">
                            <SelectValue placeholder="Unassigned" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Unassigned</SelectItem>
                            {closers.map((c) => (
                              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <span className="text-zinc-700">{l.assigned_closer_name || "—"}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2.5 py-1 text-xs font-semibold rounded-full border ${s.cls}`}>
                        {s.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {canEdit && (
                        <div className="inline-flex gap-1">
                          <Button variant="ghost" size="icon" data-testid={`edit-lead-${l.id}`} onClick={() => setEditing(l)} className="h-8 w-8">
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" data-testid={`delete-lead-${l.id}`} onClick={() => onDelete(l.id)} className="h-8 w-8 text-[#8B0000] hover:bg-[#FEF2F2]">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {editing && (
        <EditLeadDialog lead={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />
      )}
    </div>
  );
}

function EditLeadDialog({ lead, onClose, onSaved }) {
  const [form, setForm] = useState({
    instagram_id: lead.instagram_id,
    business_name: lead.business_name,
    phone: lead.phone,
    category: lead.category,
    notes: lead.notes || "",
  });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await api.put(`/leads/${lead.id}`, form);
      toast.success("Lead updated");
      onSaved();
    } catch (e) {
      toast.error(formatApiErrorDetail(e.response?.data?.detail));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent data-testid="edit-lead-dialog" className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-heading text-2xl">Edit Lead</DialogTitle>
          <DialogDescription className="text-sm text-zinc-500">Update details for this lead.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {["instagram_id","business_name","phone","category"].map((k) => (
            <div key={k}>
              <Label className="text-sm font-semibold">{k.replace("_"," ")}</Label>
              <Input value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} className="h-11 bg-zinc-50" />
            </div>
          ))}
          <div>
            <Label className="text-sm font-semibold">Notes</Label>
            <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} className="bg-zinc-50 resize-none" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={saving} className="rcc-btn-primary">{saving ? "Saving…" : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
