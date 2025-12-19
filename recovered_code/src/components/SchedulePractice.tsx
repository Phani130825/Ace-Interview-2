import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Calendar,
  Clock,
  Trash2,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import api from "@/services/api";

interface Props {
  onStart?: () => void;
}

interface Schedule {
  _id: string;
  practiceType: string;
  scheduledDate: string;
  duration: number;
  status: string;
  notes: string;
  reminderSent: boolean;
}

const practiceTypeLabels: { [key: string]: string } = {
  aptitude: "Aptitude Test",
  coding: "Coding Round",
  "technical-interview": "Technical Interview",
  "hr-interview": "HR Interview",
  "managerial-interview": "Managerial Interview",
};

const SchedulePractice = ({ onStart }: Props) => {
  const { user } = useAuth();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Form state
  const [practiceType, setPracticeType] = useState("aptitude");
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [duration, setDuration] = useState(30);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    loadSchedules();
  }, []);

  const loadSchedules = async () => {
    try {
      const response = await api.get("/schedules/upcoming");
      if (response.data.success) {
        setSchedules(response.data.data);
      }
    } catch (err: any) {
      console.error("Error loading schedules:", err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!scheduledDate || !scheduledTime) {
      setError("Please select both date and time");
      return;
    }

    // Combine date and time
    const dateTimeString = `${scheduledDate}T${scheduledTime}`;
    const scheduleDateTime = new Date(dateTimeString);

    if (scheduleDateTime <= new Date()) {
      setError("Please select a future date and time");
      return;
    }

    setLoading(true);

    try {
      const response = await api.post("/schedules", {
        practiceType,
        scheduledDate: scheduleDateTime.toISOString(),
        duration,
        notes,
      });

      if (response.data.success) {
        setSuccess(
          "Practice session scheduled successfully! Check your email for confirmation."
        );
        // Reset form
        setScheduledDate("");
        setScheduledTime("");
        setDuration(30);
        setNotes("");
        setPracticeType("aptitude");
        // Reload schedules
        await loadSchedules();
      }
    } catch (err: any) {
      setError(
        err.response?.data?.message || "Failed to schedule practice session"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (scheduleId: string) => {
    if (!confirm("Are you sure you want to delete this schedule?")) {
      return;
    }

    try {
      await api.delete(`/schedules/${scheduleId}`);
      setSuccess("Schedule deleted successfully");
      await loadSchedules();
    } catch (err: any) {
      setError("Failed to delete schedule");
    }
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getMinDateTime = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 30); // At least 30 minutes from now
    return now.toISOString().slice(0, 16);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Schedule Practice
          </h1>
          <p className="text-gray-600">
            Schedule your practice sessions and receive email reminders
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
            <AlertCircle className="h-5 w-5" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-700">
            <CheckCircle className="h-5 w-5" />
            <span>{success}</span>
          </div>
        )}

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Schedule Form */}
          <Card>
            <CardHeader>
              <CardTitle>Create New Schedule</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Practice Type
                  </label>
                  <select
                    value={practiceType}
                    onChange={(e) => setPracticeType(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="aptitude">Aptitude Test</option>
                    <option value="coding">Coding Round</option>
                    <option value="technical-interview">
                      Technical Interview
                    </option>
                    <option value="hr-interview">HR Interview</option>
                    <option value="managerial-interview">
                      Managerial Interview
                    </option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date
                  </label>
                  <input
                    type="date"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    min={new Date().toISOString().split("T")[0]}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Time
                  </label>
                  <input
                    type="time"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Duration (minutes)
                  </label>
                  <select
                    value={duration}
                    onChange={(e) => setDuration(Number(e.target.value))}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value={15}>15 minutes</option>
                    <option value={30}>30 minutes</option>
                    <option value={45}>45 minutes</option>
                    <option value={60}>60 minutes</option>
                    <option value={90}>90 minutes</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notes (Optional)
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add any notes or specific topics to focus on..."
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={3}
                  />
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Scheduling..." : "Schedule Practice"}
                </Button>

                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800">
                    📧 You will receive a confirmation email immediately and a
                    reminder 30 minutes before your scheduled practice.
                  </p>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Upcoming Schedules */}
          <Card>
            <CardHeader>
              <CardTitle>Upcoming Schedules</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 max-h-[600px] overflow-y-auto">
                {schedules.length > 0 ? (
                  schedules.map((schedule) => (
                    <div
                      key={schedule._id}
                      className="p-4 border rounded-xl bg-gradient-to-r from-blue-50 to-purple-50"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3 flex-1">
                          <div className="p-2 bg-gradient-to-r from-brand-primary to-brand-secondary rounded-lg text-white">
                            <Calendar className="h-5 w-5" />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-900">
                              {practiceTypeLabels[schedule.practiceType]}
                            </h4>
                            <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                              <Clock className="h-4 w-4" />
                              <span>
                                {formatDateTime(schedule.scheduledDate)}
                              </span>
                            </div>
                            <div className="text-sm text-gray-600 mt-1">
                              Duration: {schedule.duration} minutes
                            </div>
                            {schedule.notes && (
                              <div className="text-sm text-gray-600 mt-2 italic">
                                "{schedule.notes}"
                              </div>
                            )}
                            {schedule.reminderSent && (
                              <div className="text-xs text-green-600 mt-2 flex items-center gap-1">
                                <CheckCircle className="h-3 w-3" />
                                Reminder sent
                              </div>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(schedule._id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Calendar className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                    <p>No upcoming schedules</p>
                    <p className="text-sm mt-2">
                      Create your first practice schedule using the form
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default SchedulePractice;
