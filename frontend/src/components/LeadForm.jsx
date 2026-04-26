import React, { useEffect, useState } from "react";
import { api, formatApiErrorDetail } from "../lib/api";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "./ui/select";
import { toast } from "sonner";
import { Plus } from "lucide-react";

export default function LeadForm({ onCreated }) {
  const [form, setForm] = useState({
    instagram_id: "",
    business_name: "",
    phone: "",
    category: "",
    notes: "",
    assigned_closer_id: "",
  });
  const [closers, setClosers] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/users/closers");
        setClosers(data);
      } catch (e) {
        // ignore
      }
    })();
  }, []);

  const update = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!form.instagram_id || !form.business_name || !form.phone || !form.category) {
      toast.error("Please fill all required fields");
      return;
    }
    setSubmitting(true);
    try {
      const payload = { ...form };
      if (!payload.assigned_closer_id) delete payload.assigned_closer_id;
      const { data } = await api.post("/leads", payload);
      toast.success("Lead added", { description: data.business_name });
      setForm({ instagram_id: "", business_name: "", phone: "", category: "", notes: "", assigned_closer_id: "" });
      onCreated?.(data);
    } catch (e) {
      toast.error(formatApiErrorDetail(e.response?.data?.detail) || "Failed to add");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4" data-testid="lead-form">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label className="text-sm font-semibold text-zinc-700 mb-1.5 block">Instagram ID *</Label>
          <Input data-testid="lead-instagram-input" value={form.instagram_id} onChange={update("instagram_id")} placeholder="@username" className="h-11 bg-zinc-50 focus:bg-white" />
        </div>
        <div>
          <Label className="text-sm font-semibold text-zinc-700 mb-1.5 block">Business Name *</Label>
          <Input data-testid="lead-business-input" value={form.business_name} onChange={update("business_name")} placeholder="Acme Co." className="h-11 bg-zinc-50 focus:bg-white" />
        </div>
        <div>
          <Label className="text-sm font-semibold text-zinc-700 mb-1.5 block">Phone Number *</Label>
          <Input data-testid="lead-phone-input" value={form.phone} onChange={update("phone")} placeholder="+91 98xxx xxxxx" className="h-11 bg-zinc-50 focus:bg-white" />
        </div>
        <div>
          <Label className="text-sm font-semibold text-zinc-700 mb-1.5 block">Category / Niche *</Label>
          <Input data-testid="lead-category-input" value={form.category} onChange={update("category")} placeholder="Fashion, Cafe, Fitness…" className="h-11 bg-zinc-50 focus:bg-white" />
        </div>
      </div>

      <div>
        <Label className="text-sm font-semibold text-zinc-700 mb-1.5 block">Initial Notes</Label>
        <Textarea data-testid="lead-notes-input" value={form.notes} onChange={update("notes")} placeholder="What makes this lead interesting?" rows={3} className="bg-zinc-50 focus:bg-white resize-none" />
      </div>

      <div>
        <Label className="text-sm font-semibold text-zinc-700 mb-1.5 block">Assign to Closer</Label>
        <Select value={form.assigned_closer_id || undefined} onValueChange={(v) => setForm({ ...form, assigned_closer_id: v })}>
          <SelectTrigger data-testid="lead-closer-select" className="h-11 bg-zinc-50">
            <SelectValue placeholder="Unassigned" />
          </SelectTrigger>
          <SelectContent>
            {closers.length === 0 && (
              <div className="px-3 py-2 text-sm text-zinc-500">No closers yet — ask admin to add.</div>
            )}
            {closers.map((c) => (
              <SelectItem key={c.id} value={c.id} data-testid={`closer-option-${c.id}`}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button type="submit" disabled={submitting} data-testid="lead-submit-button" className="w-full h-12 rcc-btn-primary font-semibold text-base">
        <Plus className="w-4 h-4 mr-2" /> {submitting ? "Adding…" : "Add Lead"}
      </Button>
    </form>
  );
}
