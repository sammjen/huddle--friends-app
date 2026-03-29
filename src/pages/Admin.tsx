import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/components/AuthProvider";
import AppHeader from "@/components/AppHeader";
import { apiUrl } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, MessageSquare, LayoutDashboard, Shield, FlaskConical, RefreshCw, Flag, AlertTriangle } from "lucide-react";

interface Stats {
  users: number;
  admins: number;
  messages: number;
  groupchats: number;
  personalityTests: number;
  pendingReports: number;
}

interface ReportRow {
  id: number;
  reason: string;
  description: string | null;
  status: "pending" | "reviewed" | "dismissed" | "action_taken";
  created_at: string;
  resolved_at: string | null;
  reporter_id: number;
  reporter_username: string | null;
  reporter_display_name: string | null;
  reported_id: number;
  reported_username: string | null;
  reported_display_name: string | null;
  reported_active: number;
}

interface UserRow {
  id: number;
  username: string;
  display_name: string | null;
  city: string | null;
  email: string | null;
  role: "user" | "admin";
  active: number;
}

interface GroupchatRow {
  id: number;
  name: string;
  chat_photo: string;
  active: number;
  member_count: number;
  message_count: number;
}

interface MessageRow {
  id: number;
  message: string;
  sent_time: string;
  edited: number;
  username: string | null;
  display_name: string | null;
  groupchat_name: string | null;
}

const Admin = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [groupchats, setGroupchats] = useState<GroupchatRow[]>([]);
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "users" | "chats" | "messages" | "reports">("overview");

  useEffect(() => {
    if (!user) { navigate("/get-started"); return; }
    if (user.role !== "admin") { navigate("/"); return; }
  }, [user, navigate]);

  const fetchAll = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const [s, u, g, m, rp] = await Promise.all([
        fetch(apiUrl(`/api/admin/stats?userId=${user.id}`)).then((r) => r.json()),
        fetch(apiUrl(`/api/admin/users?userId=${user.id}`)).then((r) => r.json()),
        fetch(apiUrl(`/api/admin/groupchats?userId=${user.id}`)).then((r) => r.json()),
        fetch(apiUrl(`/api/admin/messages?userId=${user.id}&limit=50`)).then((r) => r.json()),
        fetch(apiUrl(`/api/admin/reports?userId=${user.id}`)).then((r) => r.json()),
      ]);
      setStats(s);
      setUsers(u);
      setGroupchats(g);
      setMessages(m);
      setReports(Array.isArray(rp) ? rp : []);
    } catch {
      setError("Failed to load admin data. Is the server running?");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, [user]);

  const toggleRole = async (targetId: number, currentRole: "user" | "admin") => {
    if (!user) return;
    const newRole = currentRole === "admin" ? "user" : "admin";
    await fetch(apiUrl(`/api/admin/users/${targetId}/role`), {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user.id, role: newRole }),
    });
    setUsers((prev) => prev.map((u) => u.id === targetId ? { ...u, role: newRole } : u));
  };

  const updateReportStatus = async (reportId: number, status: string, deactivateUser = false) => {
    if (!user) return;
    await fetch(apiUrl(`/api/admin/reports/${reportId}`), {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user.id, status, deactivateUser }),
    });
    setReports((prev) =>
      prev.map((r) =>
        r.id === reportId
          ? { ...r, status: status as ReportRow["status"], resolved_at: status === "pending" ? null : new Date().toISOString() }
          : r
      )
    );
    if (deactivateUser) {
      const report = reports.find((r) => r.id === reportId);
      if (report) {
        setUsers((prev) => prev.map((u) => u.id === report.reported_id ? { ...u, active: 0 } : u));
      }
    }
  };

  const deleteReport = async (reportId: number) => {
    if (!user) return;
    await fetch(apiUrl(`/api/admin/reports/${reportId}?userId=${user.id}`), { method: "DELETE" });
    setReports((prev) => prev.filter((r) => r.id !== reportId));
  };

  if (!user || user.role !== "admin") return null;

  const pendingCount = reports.filter((r) => r.status === "pending").length;

  const tabs = [
    { key: "overview", label: "Overview", icon: LayoutDashboard },
    { key: "users", label: "Users", icon: Users },
    { key: "chats", label: "Group Chats", icon: MessageSquare },
    { key: "messages", label: "Messages", icon: MessageSquare },
    { key: "reports", label: `Reports${pendingCount > 0 ? ` (${pendingCount})` : ""}`, icon: Flag },
  ] as const;

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="max-w-6xl mx-auto px-4 md:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Admin Dashboard</h1>
              <p className="text-sm text-muted-foreground">Manage users, chats, and app data</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={fetchAll} disabled={loading} className="gap-2">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm">
            {error}
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex gap-1 mb-6 bg-secondary/50 p-1 rounded-xl w-fit">
          {tabs.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                activeTab === key
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === "overview" && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              { label: "Total Users", value: stats?.users, icon: Users, color: "text-blue-500" },
              { label: "Admins", value: stats?.admins, icon: Shield, color: "text-purple-500" },
              { label: "Group Chats", value: stats?.groupchats, icon: LayoutDashboard, color: "text-green-500" },
              { label: "Messages", value: stats?.messages, icon: MessageSquare, color: "text-orange-500" },
              { label: "Personality Tests", value: stats?.personalityTests, icon: FlaskConical, color: "text-pink-500" },
              { label: "Pending Reports", value: stats?.pendingReports, icon: AlertTriangle, color: "text-red-500" },
            ].map(({ label, value, icon: Icon, color }) => (
              <Card key={label}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    {label}
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex items-center gap-2">
                  <Icon className={`h-5 w-5 ${color}`} />
                  <span className="text-2xl font-bold text-foreground">
                    {loading ? "—" : value ?? 0}
                  </span>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Users Tab */}
        {activeTab === "users" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">All Users ({users.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left">
                      <th className="pb-3 pr-4 font-medium text-muted-foreground">ID</th>
                      <th className="pb-3 pr-4 font-medium text-muted-foreground">Username</th>
                      <th className="pb-3 pr-4 font-medium text-muted-foreground">Display Name</th>
                      <th className="pb-3 pr-4 font-medium text-muted-foreground">City</th>
                      <th className="pb-3 pr-4 font-medium text-muted-foreground">Email</th>
                      <th className="pb-3 pr-4 font-medium text-muted-foreground">Role</th>
                      <th className="pb-3 font-medium text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.id} className="border-b border-border/50 last:border-0">
                        <td className="py-3 pr-4 text-muted-foreground">{u.id}</td>
                        <td className="py-3 pr-4 font-medium text-foreground">{u.username}</td>
                        <td className="py-3 pr-4 text-muted-foreground">{u.display_name || "—"}</td>
                        <td className="py-3 pr-4 text-muted-foreground">{u.city || "—"}</td>
                        <td className="py-3 pr-4 text-muted-foreground">{u.email || "—"}</td>
                        <td className="py-3 pr-4">
                          <Badge variant={u.role === "admin" ? "default" : "secondary"}>
                            {u.role}
                          </Badge>
                        </td>
                        <td className="py-3">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => toggleRole(u.id, u.role)}
                            disabled={u.id === user.id}
                            className="text-xs h-7"
                          >
                            {u.role === "admin" ? "Remove admin" : "Make admin"}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Group Chats Tab */}
        {activeTab === "chats" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Group Chats ({groupchats.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left">
                      <th className="pb-3 pr-4 font-medium text-muted-foreground">ID</th>
                      <th className="pb-3 pr-4 font-medium text-muted-foreground">Name</th>
                      <th className="pb-3 pr-4 font-medium text-muted-foreground">Members</th>
                      <th className="pb-3 pr-4 font-medium text-muted-foreground">Messages</th>
                      <th className="pb-3 font-medium text-muted-foreground">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groupchats.map((g) => (
                      <tr key={g.id} className="border-b border-border/50 last:border-0">
                        <td className="py-3 pr-4 text-muted-foreground">{g.id}</td>
                        <td className="py-3 pr-4 font-medium text-foreground">
                          <span className="mr-2">{g.chat_photo}</span>{g.name}
                        </td>
                        <td className="py-3 pr-4 text-muted-foreground">{g.member_count}</td>
                        <td className="py-3 pr-4 text-muted-foreground">{g.message_count}</td>
                        <td className="py-3">
                          <Badge variant={g.active ? "default" : "secondary"}>
                            {g.active ? "Active" : "Inactive"}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Messages Tab */}
        {activeTab === "messages" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recent Messages (last 50)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left">
                      <th className="pb-3 pr-4 font-medium text-muted-foreground">Sender</th>
                      <th className="pb-3 pr-4 font-medium text-muted-foreground">Chat</th>
                      <th className="pb-3 pr-4 font-medium text-muted-foreground">Message</th>
                      <th className="pb-3 font-medium text-muted-foreground">Sent</th>
                    </tr>
                  </thead>
                  <tbody>
                    {messages.map((m) => (
                      <tr key={m.id} className="border-b border-border/50 last:border-0">
                        <td className="py-3 pr-4 font-medium text-foreground whitespace-nowrap">
                          {m.display_name || m.username || "Anonymous"}
                        </td>
                        <td className="py-3 pr-4 text-muted-foreground whitespace-nowrap">
                          {m.groupchat_name || "—"}
                        </td>
                        <td className="py-3 pr-4 text-foreground max-w-xs truncate">
                          {m.message}
                          {m.edited ? <span className="ml-1 text-xs text-muted-foreground">(edited)</span> : null}
                        </td>
                        <td className="py-3 text-muted-foreground whitespace-nowrap text-xs">
                          {new Date(m.sent_time).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Reports Tab */}
        {activeTab === "reports" && (
          <div className="space-y-4">
            {reports.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-3">
                    <Shield className="h-6 w-6 text-green-500" />
                  </div>
                  <p className="text-sm font-medium text-foreground">No reports</p>
                  <p className="text-xs text-muted-foreground mt-1">Everything looks good!</p>
                </CardContent>
              </Card>
            ) : (
              reports.map((r) => (
                <Card key={r.id} className={r.status === "pending" ? "border-destructive/30" : ""}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center ${
                          r.status === "pending" ? "bg-destructive/10" : "bg-muted"
                        }`}>
                          <Flag className={`h-4 w-4 ${r.status === "pending" ? "text-destructive" : "text-muted-foreground"}`} />
                        </div>
                        <div>
                          <CardTitle className="text-sm">
                            {r.reported_display_name || r.reported_username || "Deleted user"}
                            {r.reported_active === 0 && (
                              <span className="ml-2 text-xs font-normal text-muted-foreground">(deactivated)</span>
                            )}
                          </CardTitle>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Reported by {r.reporter_display_name || r.reporter_username || "Deleted user"}
                            {" · "}
                            {new Date(r.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                          </p>
                        </div>
                      </div>
                      <Badge variant={
                        r.status === "pending" ? "destructive" :
                        r.status === "action_taken" ? "default" :
                        "secondary"
                      }>
                        {r.status === "action_taken" ? "Action taken" : r.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-3">
                    <div className="flex flex-wrap gap-2 text-xs">
                      <span className="px-2.5 py-1 rounded-full bg-secondary text-foreground font-medium">{r.reason}</span>
                    </div>
                    {r.description && (
                      <p className="text-sm text-muted-foreground bg-secondary/50 rounded-lg p-3">{r.description}</p>
                    )}
                    <div className="flex gap-2 pt-1">
                      {r.status === "pending" && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs h-7"
                            onClick={() => updateReportStatus(r.id, "dismissed")}
                          >
                            Dismiss
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs h-7"
                            onClick={() => updateReportStatus(r.id, "reviewed")}
                          >
                            Mark Reviewed
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            className="text-xs h-7"
                            onClick={() => updateReportStatus(r.id, "action_taken", true)}
                          >
                            Deactivate User
                          </Button>
                        </>
                      )}
                      {r.status !== "pending" && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs h-7"
                            onClick={() => updateReportStatus(r.id, "pending")}
                          >
                            Reopen
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs h-7 text-muted-foreground hover:text-destructive"
                            onClick={() => deleteReport(r.id)}
                          >
                            Delete
                          </Button>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default Admin;
