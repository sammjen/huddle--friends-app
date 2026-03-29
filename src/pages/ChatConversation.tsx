import { useState, useRef, useEffect } from "react";
import { useNavigate, useParams, Navigate } from "react-router-dom";
import { ArrowLeft, Send, Pencil, X, MessageCircle, ChevronRight, UserPlus, UserCheck, Flag } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/components/AuthProvider";
import { apiUrl } from "@/lib/api";
import { toast } from "sonner";

interface Message {
  id: string;
  sender: string;
  text: string;
  isMe: boolean;
  time: string;
  edited: boolean;
}

interface Member {
  id: number;
  username: string;
  display_name: string | null;
  city: string | null;
  profile_photo: string | null;
  is_friend: boolean;
}

const CONVERSATION_STARTERS = [
  "How do you like to spend your free time?",
  "What are you doing this weekend?",
  "What is your favorite place nearby to visit?",
];

const ChatConversation = () => {
  const navigate = useNavigate();
  const { groupId } = useParams();
  const { isAuthenticated, user } = useAuth();
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [groupName, setGroupName] = useState("Chat");
  const [groupEmoji, setGroupEmoji] = useState<string | null>(null);
  const [memberCount, setMemberCount] = useState(0);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messagesLoading, setMessagesLoading] = useState(true);
  const [membersOpen, setMembersOpen] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [reportTarget, setReportTarget] = useState<Member | null>(null);
  const [reportReason, setReportReason] = useState("");
  const [reportDescription, setReportDescription] = useState("");
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  if (!isAuthenticated) {
    return <Navigate to="/chats" replace />;
  }

  useEffect(() => {
    if (!groupId) return;

    fetch(apiUrl(`/api/groupchats/${groupId}`))
      .then((res) => res.json())
      .then((data) => {
        setGroupName(data.name);
        setGroupEmoji(data.chat_photo);
        setMemberCount(data.member_count);
      })
      .catch(() => toast.error("Couldn't load group info."));

    fetch(apiUrl(`/api/messages/${groupId}`))
      .then((res) => res.json())
      .then((data: { id: number; message: string; sent_time: string; user_id: number | null; username: string | null; edited: number }[]) => {
        setMessages(
          data.map((m) => ({
            id: String(m.id),
            sender: m.username || "Unknown",
            text: m.message,
            isMe: m.user_id === user?.id,
            time: new Date(m.sent_time).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
            edited: m.edited === 1,
          }))
        );
      })
      .catch(() => toast.error("Couldn't load messages."))
      .finally(() => setMessagesLoading(false));
  }, [groupId, user?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Fetch members when sheet opens
  useEffect(() => {
    if (!membersOpen || !groupId || !user) return;
    setMembersLoading(true);
    fetch(apiUrl(`/api/groupchats/${groupId}/members?userId=${user.id}`))
      .then((res) => res.json())
      .then((data) => setMembers(Array.isArray(data) ? data : []))
      .catch(() => toast.error("Couldn't load members."))
      .finally(() => setMembersLoading(false));
  }, [membersOpen, groupId, user]);

  const toggleFriend = async (memberId: number, currentlyFriend: boolean) => {
    if (!user) return;
    try {
      if (currentlyFriend) {
        await fetch(apiUrl(`/api/friends?friendId=${memberId}&userId=${user.id}`), { method: "DELETE" });
      } else {
        await fetch(apiUrl("/api/friends"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: user.id, friendId: memberId }),
        });
      }
      setMembers((prev) =>
        prev.map((m) => (m.id === memberId ? { ...m, is_friend: !currentlyFriend } : m))
      );
      toast.success(currentlyFriend ? "Removed friend" : "Added friend!");
    } catch {
      toast.error("Failed to update friend.");
    }
  };

  const REPORT_REASONS = [
    "Harassment or bullying",
    "Spam or scam",
    "Inappropriate content",
    "Impersonation",
    "Other",
  ];

  const submitReport = async () => {
    if (!user || !reportTarget || !reportReason) return;
    setReportSubmitting(true);
    try {
      const res = await fetch(apiUrl("/api/reports"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          reportedId: reportTarget.id,
          reason: reportReason,
          description: reportDescription.trim() || undefined,
        }),
      });
      if (res.ok) {
        toast.success("Report submitted. An admin will review it.");
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to submit report.");
      }
    } catch {
      toast.error("Failed to submit report.");
    } finally {
      setReportSubmitting(false);
      setReportTarget(null);
      setReportReason("");
      setReportDescription("");
    }
  };

  const handleSend = async () => {
    if (!message.trim() || !groupId) return;
    const text = message.trim();
    setMessage("");

    const optimisticId = String(Date.now());
    setMessages((prev) => [
      ...prev,
      {
        id: optimisticId,
        sender: user?.displayName || user?.username || "You",
        text,
        isMe: true,
        time: new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
        edited: false,
      },
    ]);

    try {
      const res = await fetch(apiUrl("/api/messages"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user?.id, groupId: Number(groupId), message: text }),
      });
      if (res.ok) {
        const saved = await res.json();
        setMessages((prev) =>
          prev.map((m) => (m.id === optimisticId ? { ...m, id: String(saved.id) } : m))
        );
      }
    } catch {
      toast.error("Failed to send message.");
    }

    setTimeout(() => inputRef.current?.focus(), 10);
  };

  const startEditing = (msg: Message) => {
    setEditingId(msg.id);
    setSelectedId(null);
    setMessage(msg.text);
    setTimeout(() => inputRef.current?.focus(), 10);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setMessage("");
  };

  const handleEdit = async () => {
    if (!message.trim() || !editingId) return;
    const text = message.trim();

    setMessages((prev) =>
      prev.map((m) => (m.id === editingId ? { ...m, text, edited: true } : m))
    );
    const savedEditingId = editingId;
    setEditingId(null);
    setMessage("");

    try {
      await fetch(apiUrl(`/api/messages/${savedEditingId}`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user?.id, message: text }),
      });
    } catch {
      toast.error("Failed to edit message.");
    }
  };

  const applyConversationStarter = (starter: string) => {
    setMessage(starter);
    setTimeout(() => inputRef.current?.focus(), 10);
  };

  const shouldShowSender = (index: number) => {
    if (index === 0) return true;
    return messages[index].sender !== messages[index - 1].sender;
  };

  const initials = (name: string | null, username: string) => {
    if (name) {
      const parts = name.split(" ");
      return parts.length > 1
        ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
        : name.slice(0, 2).toUpperCase();
    }
    return username.slice(0, 2).toUpperCase();
  };

  return (
    <div className="h-[100dvh] bg-background flex flex-col max-w-4xl mx-auto w-full">
      {/* Header — tappable to open members */}
      <header className="flex-shrink-0 flex items-center gap-3 px-3 sm:px-6 md:px-8 py-2.5 sm:py-3 bg-background/80 backdrop-blur-sm border-b border-border">
        <button
          onClick={() => navigate("/chats")}
          className="w-10 h-10 rounded-full bg-secondary border border-border flex items-center justify-center hover:bg-secondary/80 transition-colors flex-shrink-0 touch-manipulation"
          aria-label="Back to chats"
        >
          <ArrowLeft className="h-4 w-4 text-foreground" />
        </button>
        <button
          onClick={() => setMembersOpen(true)}
          className="flex-1 flex items-center gap-2 min-w-0 hover:opacity-80 transition-opacity touch-manipulation text-left"
        >
          <div className="min-w-0 flex-1">
            <h1 className="text-sm sm:text-base font-semibold text-foreground leading-tight truncate">{groupName}</h1>
            <p className="text-[11px] sm:text-xs text-muted-foreground">{memberCount} members — tap to view</p>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        </button>
      </header>

      {/* Members Sheet */}
      <Sheet open={membersOpen} onOpenChange={setMembersOpen}>
        <SheetContent side="right" className="w-full sm:max-w-sm p-0">
          <SheetHeader className="px-5 pt-5 pb-3 border-b border-border">
            <SheetTitle className="flex items-center gap-2 text-base">
              {groupEmoji && <span className="text-lg">{groupEmoji}</span>}
              {groupName}
            </SheetTitle>
            <p className="text-xs text-muted-foreground">{memberCount} members</p>
          </SheetHeader>

          <div className="overflow-y-auto flex-1 px-3 py-2">
            {membersLoading ? (
              <div className="space-y-3 py-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex items-center gap-3 px-2">
                    <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-3.5 w-28" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                    <Skeleton className="h-8 w-20 rounded-lg" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-1">
                {members.map((member) => {
                  const isMe = member.id === user?.id;
                  return (
                    <div
                      key={member.id}
                      className="flex items-center gap-3 px-2 py-2.5 rounded-xl hover:bg-secondary/50 transition-colors"
                    >
                      <Avatar className="w-10 h-10 flex-shrink-0">
                        {member.profile_photo && <AvatarImage src={member.profile_photo} />}
                        <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                          {initials(member.display_name, member.username)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {member.display_name || member.username}
                          {isMe && <span className="text-muted-foreground font-normal"> (you)</span>}
                        </p>
                        {member.city && (
                          <p className="text-[11px] text-muted-foreground truncate">{member.city}</p>
                        )}
                      </div>
                      {!isMe && (
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <Button
                            variant={member.is_friend ? "secondary" : "default"}
                            size="sm"
                            className="h-8 px-3 text-xs gap-1.5 rounded-lg"
                            onClick={() => toggleFriend(member.id, member.is_friend)}
                          >
                            {member.is_friend ? (
                              <>
                                <UserCheck className="w-3.5 h-3.5" />
                                Friends
                              </>
                            ) : (
                              <>
                                <UserPlus className="w-3.5 h-3.5" />
                                Add
                              </>
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                            onClick={() => setReportTarget(member)}
                            title="Report user"
                          >
                            <Flag className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Report Dialog */}
      <Dialog open={!!reportTarget} onOpenChange={(open) => { if (!open) { setReportTarget(null); setReportReason(""); setReportDescription(""); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Flag className="h-4 w-4 text-destructive" />
              Report {reportTarget?.display_name || reportTarget?.username}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Reason</label>
              <div className="grid gap-2">
                {REPORT_REASONS.map((reason) => (
                  <button
                    key={reason}
                    onClick={() => setReportReason(reason)}
                    className={`text-left px-3 py-2.5 rounded-lg border text-sm transition-colors ${
                      reportReason === reason
                        ? "border-primary bg-primary/10 text-foreground font-medium"
                        : "border-border bg-secondary/30 text-muted-foreground hover:bg-secondary/60"
                    }`}
                  >
                    {reason}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Additional details (optional)</label>
              <Textarea
                value={reportDescription}
                onChange={(e) => setReportDescription(e.target.value)}
                placeholder="Describe what happened..."
                className="resize-none"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setReportTarget(null); setReportReason(""); setReportDescription(""); }}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={submitReport}
              disabled={!reportReason || reportSubmitting}
            >
              {reportSubmitting ? "Submitting..." : "Submit Report"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Messages */}
      <div
        className="flex-1 overflow-y-auto px-3 sm:px-4 md:px-6 py-3 sm:py-4 space-y-1 overscroll-contain"
        onClick={() => setSelectedId(null)}
      >
        {messagesLoading && (
          <div className="space-y-3 py-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className={`flex ${i % 2 === 0 ? "justify-end" : "justify-start"}`}>
                <div className="space-y-1.5">
                  {i % 2 !== 0 && <Skeleton className="h-3 w-16 ml-1" />}
                  <Skeleton className={`h-10 rounded-2xl ${i % 2 === 0 ? "w-48 rounded-br-sm" : "w-56 rounded-bl-sm"}`} />
                </div>
              </div>
            ))}
          </div>
        )}
        {!messagesLoading && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <MessageCircle className="w-7 h-7 text-primary" />
            </div>
            <p className="text-sm font-medium text-foreground mb-1">No messages yet</p>
            <p className="text-xs text-muted-foreground">Be the first to say something!</p>
          </div>
        )}
        {messages.map((msg, i) => {
          const showSender = shouldShowSender(i);
          const isSelected = selectedId === msg.id;
          const isLastInGroup = i === messages.length - 1 || messages[i + 1]?.sender !== msg.sender;
          return (
            <div
              key={msg.id}
              className={`flex flex-col ${msg.isMe ? "items-end" : "items-start"} ${showSender && i > 0 ? "mt-3" : ""}`}
            >
              {!msg.isMe && showSender && (
                <span className="text-[11px] sm:text-xs text-muted-foreground mb-1 ml-1 font-medium">{msg.sender}</span>
              )}
              <div className="relative">
                <div
                  onClick={(e) => {
                    if (msg.isMe && !editingId) {
                      e.stopPropagation();
                      setSelectedId(isSelected ? null : msg.id);
                    }
                  }}
                  className={`max-w-[82%] sm:max-w-[75%] px-3 sm:px-4 py-2 sm:py-2.5 text-sm shadow-sm ${
                    msg.isMe
                      ? `bg-primary text-primary-foreground rounded-2xl rounded-br-sm ${!editingId ? "cursor-pointer active:opacity-80" : ""}`
                      : "bg-card text-card-foreground rounded-2xl rounded-bl-sm"
                  } ${editingId === msg.id ? "ring-2 ring-primary/50" : ""}`}
                >
                  {msg.text}
                </div>
                {isSelected && msg.isMe && (
                  <button
                    onClick={(e) => { e.stopPropagation(); startEditing(msg); }}
                    className="absolute -top-8 right-0 flex items-center gap-1 px-2.5 py-1 rounded-lg bg-secondary border border-border shadow-md text-xs font-medium text-foreground hover:bg-secondary/80 transition-colors"
                  >
                    <Pencil className="h-3 w-3" />
                    Edit
                  </button>
                )}
              </div>
              <div className={`flex items-center gap-1.5 mt-0.5 mx-1 ${msg.isMe ? "flex-row-reverse" : ""}`}>
                {msg.edited && (
                  <span className="text-[10px] text-muted-foreground/70 italic flex items-center gap-0.5">
                    <Pencil className="h-2.5 w-2.5" />
                    edited
                  </span>
                )}
                {isLastInGroup && (
                  <span className="text-[10px] text-muted-foreground">{msg.time}</span>
                )}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div
        className="flex-shrink-0 bg-background border-t border-border"
        style={{ paddingBottom: "max(0.625rem, env(safe-area-inset-bottom))" }}
      >
        {!editingId && (
          <div className="max-w-4xl mx-auto px-3 sm:px-4 pt-2 pb-1">
            <div className="flex gap-2 overflow-x-auto no-scrollbar">
              {CONVERSATION_STARTERS.map((starter) => (
                <button
                  key={starter}
                  type="button"
                  onClick={() => applyConversationStarter(starter)}
                  className="whitespace-nowrap rounded-full border border-border bg-secondary px-3 py-1.5 text-xs text-foreground hover:bg-secondary/80 transition-colors"
                >
                  {starter}
                </button>
              ))}
            </div>
          </div>
        )}
        {editingId && (
          <div className="flex items-center justify-between px-4 py-1.5 bg-secondary/60 border-b border-border">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Pencil className="h-3 w-3 text-primary" />
              <span>Editing message</span>
            </div>
            <button
              onClick={cancelEditing}
              className="p-1 rounded-full hover:bg-secondary transition-colors"
              aria-label="Cancel editing"
            >
              <X className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          </div>
        )}
        <div className="flex gap-2 items-center max-w-4xl mx-auto px-3 sm:px-4 py-2.5 sm:py-3">
          <Input
            ref={inputRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                editingId ? handleEdit() : handleSend();
              }
              if (e.key === "Escape" && editingId) cancelEditing();
            }}
            placeholder={editingId ? "Edit your message..." : "Type a message..."}
            className={`flex-1 rounded-full bg-secondary border-border h-10 sm:h-11 text-base ${editingId ? "ring-1 ring-primary/30" : ""}`}
            autoComplete="off"
            autoCorrect="on"
          />
          <button
            onClick={editingId ? handleEdit : handleSend}
            disabled={!message.trim()}
            className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-primary flex items-center justify-center flex-shrink-0 hover:bg-primary/90 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
            aria-label={editingId ? "Save edit" : "Send message"}
          >
            {editingId ? (
              <Pencil className="h-4 w-4 sm:h-5 sm:w-5 text-primary-foreground" />
            ) : (
              <Send className="h-4 w-4 sm:h-5 sm:w-5 text-primary-foreground" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatConversation;
