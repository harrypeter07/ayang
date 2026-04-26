import React, { useState } from "react";
import { api, formatApiErrorDetail } from "../lib/api";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "./ui/dialog";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { Label } from "./ui/label";
import { Calendar } from "./ui/calendar";
import { Popover, PopoverTrigger, PopoverContent } from "./ui/popover";
import { CheckCircle2, XCircle, Clock, CalendarIcon } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export default function StatusUpdateDialog({ lead, open, onClose, onSaved }) {
  const [status, setStatus] = useState("approved");
  const [notes, setNotes] = useState(lead?.closer_notes || "");
  const [date, setDate] = useState(null);
  const [saving, setSaving] = useState(false);
  const [dateOpen, setDateOpen] = useState(false);

  const save = async () => {
    if (!notes.trim()) {
      toast.error("Notes are required before saving");
      return;
    }
    if (status === "follow_up" && !date) {
      toast.error("Pick a follow-up date");
      return;
    }
    setSaving(true);
    try {
      await api.patch(`/leads/${lead.id}/status`, {
        status,
        closer_notes: notes,
        follow_up_date: status === "follow_up" ? format(date, "yyyy-MM-dd") : null,
      });
      toast.success("Updated", { description: `Marked as ${status.replace("_"," ")}` });
      onSaved?.();
      onClose();
    } catch (e) {
      toast.error(formatApiErrorDetail(e.response?.data?.detail));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent data-testid="status-update-dialog" className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading text-2xl">Update Call Outcome</DialogTitle>
          <DialogDescription className="text-sm text-zinc-500">{lead?.business_name} · @{lead?.instagram_id}</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-2">
          <button
            data-testid="status-update-approved"
            onClick={() => setStatus("approved")}
            className={`flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition-all ${status==="approved" ? "border-[#10B981] bg-[#ECFDF5]" : "border-zinc-200 hover:bg-zinc-50"}`}
          >
            <CheckCircle2 className="w-5 h-5 text-[#10B981]" />
            <span className="text-xs font-semibold">Approved</span>
          </button>
          <button
            data-testid="status-update-rejected"
            onClick={() => setStatus("rejected")}
            className={`flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition-all ${status==="rejected" ? "border-zinc-400 bg-zinc-100" : "border-zinc-200 hover:bg-zinc-50"}`}
          >
            <XCircle className="w-5 h-5 text-zinc-500" />
            <span className="text-xs font-semibold">Rejected</span>
          </button>
          <button
            data-testid="status-update-followup"
            onClick={() => setStatus("follow_up")}
            className={`flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition-all ${status==="follow_up" ? "border-[#F59E0B] bg-[#FFFBEB]" : "border-zinc-200 hover:bg-zinc-50"}`}
          >
            <Clock className="w-5 h-5 text-[#B45309]" />
            <span className="text-xs font-semibold">Follow-up</span>
          </button>
        </div>

        {status === "follow_up" && (
          <div>
            <Label className="text-sm font-semibold mb-1.5 block">Follow-up date</Label>
            <Popover open={dateOpen} onOpenChange={setDateOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" data-testid="followup-date-button" className="w-full justify-start h-11 bg-zinc-50">
                  <CalendarIcon className="w-4 h-4 mr-2" />
                  {date ? format(date, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(d) => { setDate(d); setDateOpen(false); }}
                  initialFocus
                  disabled={(d) => d < new Date(new Date().setHours(0,0,0,0))}
                />
              </PopoverContent>
            </Popover>
          </div>
        )}

        <div>
          <Label className="text-sm font-semibold mb-1.5 block">Notes (required)</Label>
          <Textarea
            data-testid="status-notes-input"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="What was discussed? Next step?"
            rows={4}
            className="bg-zinc-50 resize-none"
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button data-testid="status-save-button" onClick={save} disabled={saving} className="rcc-btn-primary">
            {saving ? "Saving…" : "Save Update"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
