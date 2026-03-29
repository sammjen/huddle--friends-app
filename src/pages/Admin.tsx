import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/components/AuthProvider";
import AppHeader from "@/components/AppHeader";
import { apiUrl } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, MessageSquare, LayoutDashboard, Shield, FlaskConical, RefreshCw, Flag, AlertTriangle, Inbox } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

interface Stats {
  users: number;
  admins: number;
  messages: number;
  groupchats: number;
  personalityTests: number;
  pendingReports: number;
  pendingAppeals: number;
}

interface AppealRow {
  id: number;
  user_id: number;
  message: string;
  status: "pending" | "approved" | "rejected";
  admin_note: string | null;
  created_at: string;
  resolved_at: string | null;
  username: string | null;
  display_name: string | null;
  email: string | null;
  active: number;
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
  const [appeals, setAppeals] = useState<AppealRow[]>([]);
  const [appealNotes, setAppealNotes] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "users" | "chats" | "messages" | "reports" | "appeals">("overview");

  useEffect(() => {
    if (!user) { navigate("/get-started"); return; }
    if (user.role !== "admin") { navigate("/"); return; }
  }, [user, navigate]);

  const fetchAll = async () => {
    if (!user) return;
    const uid = Number(user.id);
    if (!Number.isInteger(uid)) {
      setError("Invalid session. Please log out and sign in again.");
      return;
    }
    setLoading(true);
    setError(null);
    const q = `userId=${uid}`;
    const parse = async (resPromise: Promise<Response>, label: string) => {
      const res = await resPromise;
      let body: unknown = null;
      try {
        body = await res.json();
      } catch {
        throw new Error(`${label}: server returned non-JSON (${res.status}). Is the API URL correct?`);
      }
      if (!res.ok) {
        const msg = typeof body === "object" && body !== null && "error" in body
          ? String((body as { error: string }).error)
          : res.statusText;
        throw new Error(`${label}: ${msg}`);
      }
      return body;
    };
    try {
      const settled = await Promise.allSettled([
        parse(fetch(apiUrl(`/api/admin/stats?${q}`)), "Stats"),
        parse(fetch(apiUrl(`/api/admin/users?${q}`)), "Users"),
        parse(fetch(apiUrl(`/api/admin/groupchats?${q}`)), "Group chats"),
        parse(fetch(apiUrl(`/api/admin/messages?${q}&limit=50`)), "Messages"),
        parse(fetch(apiUrl(`/api/admin/reports?${q}`)), "Reports"),
        parse(fetch(apiUrl(`/api/admin/appeals?${q}`)), "Appeals"),
      ]);
      const errs: string[] = [];
      const val = <T,>(i: number, fallback: T, isValid: (x: unknown) => x is T): T => {
        const r = settled[i];
        if (r.status === "rejected") {
          errs.push(r.reason instanceof Error ? r.reason.message : String(r.reason));
          return fallback;
        }
        const data = r.value;
        if (!isValid(data)) {
          errs.push(`Unexpected response for index ${i}`);
          return fallback;
        }
        return data;
      };
      setStats(val(0, null, (x): x is Stats => x !== null && typeof x === "object" && "users" in x));
      setUsers(val(1, [], Array.isArray));
      setGroupchats(val(2, [], Array.isArray));
      setMessages(val(3, [], Array.isArray));
      setReports(val(4, [], Array.isArray));
      setAppeals(val(5, [], Array.isArray));
      if (errs.length) setError(errs.join(" "));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load admin data. Is the server running?");
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

  const resolveAppeal = async (appealId: number, status: "approved" | "rejected") => {
    if (!user) return;
    const targetUserId = appeals.find((a) => a.id === appealId)?.user_id;
    const adminNote = appealNotes[appealId]?.trim() || undefined;
    const res = await fetch(apiUrl(`/api/admin/appeals/${appealId}`), {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user.id, status, adminNote }),
    });
    if (!res.ok) return;
    setAppeals((prev) => {
      const next = prev.map((a) =>
        a.id === appealId
          ? {
              ...a,
              status,
              admin_note: adminNote ?? a.admin_note,
              resolved_at: new Date().toISOString(),
              active: status === "approved" ? 1 : a.active,
            }
          : a
      );
      const pending = next.filter((a) => a.status === "pending").length;
      setStats((s) => (s ? { ...s, pendingAppeals: pending } : s));
      return next;
    });
    if (status === "approved" && targetUserId != null) {
      setUsers((prev) => prev.map((u) => (u.id === targetUserId ? { ...u, active: 1 } : u)));
    }
  };

  if (!user || user.role !== "admin") return null;

  const pendingCount = reports.filter((r) => r.status === "pending").length;
  const pendingAppealCount = appeals.filter((a) => a.status === "pending").length;

  const tabs = [
    { key: "overview", label: "Overview", icon: LayoutDashboard },
    { key: "users", label: "Users", icon: Users },
    { key: "chats", label: "Group Chats", icon: MessageSquare },
    { key: "messages", label: "Messages", icon: MessageSquare },
    { key: "reports", label: `Reports${pendingCount > 0 ? ` (${pendingCount})` : ""}`, icon: Flag },
    { key: "appeals", label: `Appeals${pendingAppealCount > 0 ? ` (${pendingAppealCount})` : ""}`, icon: Inbox },
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
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[
              { label: "Total Users", value: stats?.users, icon: Users, color: "text-blue-500" },
              { label: "Admins", value: stats?.admins, icon: Shield, color: "text-purple-500" },
              { label: "Group Chats", value: stats?.groupchats, icon: LayoutDashboard, color: "text-green-500" },
              { label: "Messages", value: stats?.messages, icon: MessageSquare, color: "text-orange-500" },
              { label: "Personality Tests", value: stats?.personalityTests, icon: FlaskConical, color: "text-pink-500" },
              { label: "Pending Reports", value: stats?.pendingReports, icon: AlertTriangle, color: "text-red-500" },
              { label: "Pending Appeals", value: stats?.pendingAppeals, icon: Inbox, color: "text-amber-600" },
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

        {/* Appeals Tab */}
        {activeTab === "appeals" && (
          <div className="space-y-4">
            {appeals.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                    <Inbox className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium text-foreground">No appeals yet</p>
                  <p className="text-xs text-muted-foreground mt-1">Deactivated users can submit a reactivation request from the account-deactivated page.</p>
                </CardContent>
              </Card>
            ) : (
              appeals.map((a) => (
                <Card key={a.id} className={a.status === "pending" ? "border-amber-500/30" : ""}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-9 h-9 rounded-full flex items-center justify-center ${
                            a.status === "pending" ? "bg-amber-500/10" : "bg-muted"
                          }`}
                        >
                          <Inbox className={`h-4 w-4 ${a.status === "pending" ? "text-amber-600" : "text-muted-foreground"}`} />
                        </div>
                        <div>
                          <CardTitle className="text-sm">
                            {a.display_name || a.username || "User"} <span className="text-muted-foreground font-normal">@{a.username}</span>
                          </CardTitle>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {a.email || "No email"} · Submitted{" "}
                            {new Date(a.created_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <Badge
                        variant={
                          a.status === "pending"
                            ? "default"
                            : a.status === "approved"
                              ? "default"
                              : "secondary"
                        }
                      >
                        {a.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-3">
                    <p className="text-sm text-foreground bg-secondary/50 rounded-lg p-3 whitespace-pre-wrap">{a.message}</p>
                    {a.admin_note && (
                      <p className="text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">Admin note:</span> {a.admin_note}
                      </p>
                    )}
                    {a.status === "pending" && (
                      <>
                        <Textarea
                          placeholder="Optional note to the user (stored with the decision)"
                          value={appealNotes[a.id] ?? ""}
                          onChange={(e) =>
                            setAppealNotes((prev) => ({ ...prev, [a.id]: e.target.value }))
                          }
                          className="min-h-[72px] text-sm resize-y"
                        />
                        <div className="flex flex-wrap gap-2">
                          <Button
                            variant="default"
                            size="sm"
                            className="text-xs h-8"
                            onClick={() => resolveAppeal(a.id, "approved")}
                          >
                            Approve — Reactivate account
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs h-8"
                            onClick={() => resolveAppeal(a.id, "rejected")}
                          >
                            Reject appeal
                          </Button>
                        </div>
                      </>
                    )}
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
