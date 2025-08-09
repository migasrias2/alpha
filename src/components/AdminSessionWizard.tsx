import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { db, supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

interface UserOption {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  role: string;
}

interface AdminSessionWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  users: UserOption[];
  adminId: string;
  onBooked: (session: any) => void;
}

export function AdminSessionWizard({ open, onOpenChange, users, adminId, onBooked }: AdminSessionWizardProps) {
  const { toast } = useToast();

  const [step, setStep] = useState<number>(1);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [dateTimeLocal, setDateTimeLocal] = useState<string>("");
  const [duration, setDuration] = useState<number>(60);
  const [title, setTitle] = useState<string>("1:1 Mentorship Session");
  const [description, setDescription] = useState<string>("");
  const [booking, setBooking] = useState<boolean>(false);
  const [conflict, setConflict] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      // Reset on close
      setStep(1);
      setSelectedUserId("");
      setDateTimeLocal("");
      setDuration(60);
      setTitle("1:1 Mentorship Session");
      setDescription("");
      setConflict(null);
    }
  }, [open]);

  const selectedUser = useMemo(() => users.find(u => u.id === selectedUserId), [users, selectedUserId]);

  const checkConflicts = async () => {
    setConflict(null);
    if (!selectedUserId || !dateTimeLocal) return;
    const scheduledAt = new Date(dateTimeLocal);
    const start = new Date(scheduledAt.getTime() - 2 * 60 * 60 * 1000); // 2h back
    const end = new Date(scheduledAt.getTime() + 4 * 60 * 60 * 1000); // 4h ahead
    const { data, error } = await supabase
      .from('mentorship_sessions')
      .select('id, scheduled_at, duration_minutes, status')
      .eq('student_id', selectedUserId)
      .gte('scheduled_at', start.toISOString())
      .lte('scheduled_at', end.toISOString());
    if (error) return;
    const overlap = (data || []).some((s: any) => {
      const sStart = new Date(s.scheduled_at).getTime();
      const sEnd = sStart + (s.duration_minutes || 60) * 60 * 1000;
      const nStart = scheduledAt.getTime();
      const nEnd = nStart + duration * 60 * 1000;
      return Math.max(sStart, nStart) < Math.min(sEnd, nEnd);
    });
    if (overlap) {
      setConflict("This user already has a session around that time.");
    }
  };

  useEffect(() => {
    checkConflicts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedUserId, dateTimeLocal, duration]);

  const canContinueStep1 = selectedUserId.length > 0;
  const canContinueStep2 = !!dateTimeLocal && duration > 0;

  const handleBook = async () => {
    if (!selectedUserId || !dateTimeLocal) return;
    setBooking(true);
    try {
      const scheduledAt = new Date(dateTimeLocal).toISOString();
      const sessionData = {
        title,
        description,
        scheduled_at: scheduledAt,
        duration_minutes: duration,
        status: 'scheduled',
        student_id: selectedUserId,
        admin_id: adminId,
      } as any;

      const { data, error } = await db.createMentorshipSession(sessionData);
      if (error) throw error;
      const created = Array.isArray(data) ? data[0] : (data ?? sessionData);
      onBooked(created);
      toast({
        title: "Session booked ✔️",
        description: `${selectedUser?.first_name || selectedUser?.email} • ${new Date(scheduledAt).toLocaleString()}`,
      });
      onOpenChange(false);
    } catch (err: any) {
      toast({
        title: "Failed to book session",
        description: err?.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setBooking(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[680px]">
        <DialogHeader>
          <DialogTitle>Book Mentorship Session</DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          <div className="flex items-center justify-center gap-2 text-sm">
            <div className={`px-3 py-1 rounded-full border ${step >= 1 ? 'bg-black text-white' : 'bg-white text-black'} border-black/20`}>1</div>
            <div className="w-8 h-px bg-gray-300" />
            <div className={`px-3 py-1 rounded-full border ${step >= 2 ? 'bg-black text-white' : 'bg-white text-black'} border-black/20`}>2</div>
            <div className="w-8 h-px bg-gray-300" />
            <div className={`px-3 py-1 rounded-full border ${step >= 3 ? 'bg-black text-white' : 'bg-white text-black'} border-black/20`}>3</div>
          </div>

          {step === 1 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Select mentee</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="w-full p-2 border border-gray-200 rounded-lg"
                >
                  <option value="">Choose a user</option>
                  {users.filter(u => u.role !== 'admin').map((u) => (
                    <option key={u.id} value={u.id}>
                      {(u.first_name && u.last_name) ? `${u.first_name} ${u.last_name}` : u.email}
                    </option>
                  ))}
                </select>

                <div className="flex justify-end">
                  <Button disabled={!canContinueStep1} onClick={() => setStep(2)} className="rounded-full">
                    Continue
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {step === 2 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Pick date & time</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm text-gray-600">Date and time</label>
                    <Input type="datetime-local" value={dateTimeLocal} onChange={(e) => setDateTimeLocal(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">Duration (minutes)</label>
                    <Input type="number" min={15} step={15} value={duration} onChange={(e) => setDuration(parseInt(e.target.value || '60', 10))} />
                  </div>
                </div>
                {conflict && <p className="text-sm text-red-600">{conflict}</p>}

                <div className="flex justify-between">
                  <Button variant="outline" className="rounded-full" onClick={() => setStep(1)}>Back</Button>
                  <Button disabled={!canContinueStep2 || !!conflict} onClick={() => setStep(3)} className="rounded-full">Continue</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {step === 3 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Details & confirm</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <label className="text-sm text-gray-600">Title</label>
                  <Input value={title} onChange={(e) => setTitle(e.target.value)} />
                </div>
                <div>
                  <label className="text-sm text-gray-600">Description (optional)</label>
                  <Textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
                </div>
                <div className="p-3 bg-gray-50 rounded-lg text-sm">
                  <div><span className="text-gray-500">Mentee:</span> {selectedUser ? ((selectedUser.first_name && selectedUser.last_name) ? `${selectedUser.first_name} ${selectedUser.last_name}` : selectedUser.email) : '-'}</div>
                  <div><span className="text-gray-500">When:</span> {dateTimeLocal ? new Date(dateTimeLocal).toLocaleString() : '-'}</div>
                  <div><span className="text-gray-500">Duration:</span> {duration} min</div>
                </div>
                <div className="flex justify-between">
                  <Button variant="outline" className="rounded-full" onClick={() => setStep(2)}>Back</Button>
                  <Button className="rounded-full" onClick={handleBook} disabled={booking}>
                    {booking ? 'Booking…' : 'Book session'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default AdminSessionWizard;

