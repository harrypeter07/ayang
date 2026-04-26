import React, { useEffect, useState } from "react";
import { api, formatApiErrorDetail } from "../lib/api";
import Sidebar from "../components/Sidebar";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "../components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "../components/ui/dialog";
import { toast } from "sonner";
import { UserPlus, Trash2, Users } from "lucide-react";

const roleLabel = { admin: "Admin", lead_filler: "Lead Filler", closer: "Closer" };

export default function UserManagementPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  const load = async () => {
    try {
      const { data } = await api.get("/users");
      setUsers(data);
    } catch (e) {
      toast.error(formatApiErrorDetail(e.response?.data?.detail));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const onDelete = async (id) => {
    if (!window.confirm("Delete this user? Their leads will become unassigned.")) return;
    try {
      await api.delete(`/users/${id}`);
      toast.success("User deleted");
      load();
    } catch (e) {
      toast.error(formatApiErrorDetail(e.response?.data?.detail));
    }
  };

  return (
    <div className="flex bg-[#FAFAFA] min-h-screen" data-testid="admin-users-page">
      <Sidebar />
      <main className="flex-1 p-6 md:p-10 overflow-y-auto">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-start justify-between mb-8">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-500 mb-2">Admin</div>
              <h1 className="font-heading text-3xl md:text-4xl font-black tracking-tight">Users</h1>
              <p className="text-zinc-500 mt-2">Manage closers and fillers. Admin can create new users at any time.</p>
            </div>
            <Button data-testid="add-user-button" onClick={() => setOpen(true)} className="rcc-btn-primary h-11">
              <UserPlus className="w-4 h-4 mr-2" /> New User
            </Button>
          </div>

          <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 border-b border-zinc-200">
                <tr className="text-left text-[11px] font-bold uppercase tracking-[0.12em] text-zinc-500">
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {loading && <tr><td colSpan={4} className="px-4 py-8 text-center text-zinc-500">Loading…</td></tr>}
                {!loading && users.map((u) => (
                  <tr key={u.id} className="border-t border-zinc-100 hover:bg-zinc-50/70" data-testid={`user-row-${u.id}`}>
                    <td className="px-4 py-3 font-semibold">{u.name}</td>
                    <td className="px-4 py-3 text-zinc-600">{u.email}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex px-2.5 py-1 text-xs font-semibold rounded-full bg-zinc-100 text-zinc-700 border border-zinc-200">
                        {roleLabel[u.role] || u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {u.role !== "admin" && (
                        <Button data-testid={`delete-user-${u.id}`} variant="ghost" size="icon" onClick={() => onDelete(u.id)} className="h-8 w-8 text-[#8B0000] hover:bg-[#FEF2F2]">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      <NewUserDialog open={open} onOpenChange={setOpen} onCreated={load} />
    </div>
  );
}

function NewUserDialog({ open, onOpenChange, onCreated }) {
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "closer" });
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!form.name || !form.email || !form.password) {
      toast.error("Fill all fields");
      return;
    }
    setSaving(true);
    try {
      await api.post("/users", { ...form, email: form.email.toLowerCase().trim() });
      toast.success(`${form.name} added`);
      setForm({ name: "", email: "", password: "", role: "closer" });
      onOpenChange(false);
      onCreated?.();
    } catch (e) {
      toast.error(formatApiErrorDetail(e.response?.data?.detail));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="new-user-dialog" className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading text-2xl">New User</DialogTitle>
          <DialogDescription className="text-sm text-zinc-500">Create a closer or lead filler account.</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label className="text-sm font-semibold mb-1.5 block">Full name</Label>
            <Input data-testid="new-user-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="h-11 bg-zinc-50" />
          </div>
          <div>
            <Label className="text-sm font-semibold mb-1.5 block">Email</Label>
            <Input data-testid="new-user-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="h-11 bg-zinc-50" />
          </div>
          <div>
            <Label className="text-sm font-semibold mb-1.5 block">Password</Label>
            <Input data-testid="new-user-password" type="text" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="h-11 bg-zinc-50" />
          </div>
          <div>
            <Label className="text-sm font-semibold mb-1.5 block">Role</Label>
            <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
              <SelectTrigger data-testid="new-user-role" className="h-11 bg-zinc-50"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="closer">Closer</SelectItem>
                <SelectItem value="lead_filler">Lead Filler</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button data-testid="new-user-submit" onClick={submit} disabled={saving} className="rcc-btn-primary">
            {saving ? "Creating…" : "Create User"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
