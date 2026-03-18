import { useState, useRef, useEffect } from "react";
import { useNavigate, useParams, Navigate } from "react-router-dom";
import { ArrowLeft, Send } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/components/AuthProvider";

interface Message {
  id: string;
  sender: string;
  text: string;
  isMe: boolean;
  time: string;
}

const ChatConversation = () => {
  const navigate = useNavigate();
  const { groupId } = useParams();
  const { isAuthenticated, user } = useAuth();
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [groupName, setGroupName] = useState("Chat");
  const [memberCount, setMemberCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  if (!isAuthenticated) {
    return <Navigate to="/chats" replace />;
  }

  useEffect(() => {
    if (!groupId) return;

    // Fetch group info
    fetch(`/api/groups/${user?.id}`)
      .then((res) => res.json())
      .then((data: { id: number; name: string; member_count: number }[]) => {
        const group = data.find((g) => String(g.id) === groupId);
        if (group) {
          setGroupName(group.name);
          setMemberCount(group.member_count);
        }
      })
      .catch(console.error);

    // Fetch messages
    fetch(`/api/messages/${groupId}`)
      .then((res) => res.json())
      .then((data: { id: number; message: string; sent_time: string; user_id: number | null; username: string | null }[]) => {
        setMessages(
          data.map((m) => ({
            id: String(m.id),
            sender: m.username || "Unknown",
            text: m.message,
            isMe: m.user_id === user?.id,
            time: new Date(m.sent_time).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
          }))
        );
      })
      .catch(console.error);
  }, [groupId, user?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!message.trim() || !groupId) return;
    const text = message.trim();
    setMessage("");

    // Optimistically add message
    const optimisticId = String(Date.now());
    setMessages((prev) => [
      ...prev,
      {
        id: optimisticId,
        sender: user?.displayName || user?.username || "You",
        text,
        isMe: true,
        time: new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
      },
    ]);

    try {
      await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user?.id, groupId: Number(groupId), message: text }),
      });
    } catch (err) {
      console.error("Failed to send message:", err);
    }

    setTimeout(() => inputRef.current?.focus(), 10);
  };

  const shouldShowSender = (index: number) => {
    if (index === 0) return true;
    return messages[index].sender !== messages[index - 1].sender;
  };

  return (
    <div className="h-[100dvh] bg-background flex flex-col max-w-4xl mx-auto w-full">
      {/* Header */}
      <header className="flex-shrink-0 flex items-center gap-3 px-3 sm:px-6 md:px-8 py-2.5 sm:py-3 bg-background/80 backdrop-blur-sm border-b border-border">
        <button
          onClick={() => navigate("/chats")}
          className="w-10 h-10 rounded-full bg-secondary border border-border flex items-center justify-center hover:bg-secondary/80 transition-colors flex-shrink-0 touch-manipulation"
          aria-label="Back to chats"
        >
          <ArrowLeft className="h-4 w-4 text-foreground" />
        </button>
        <div className="min-w-0">
          <h1 className="text-sm sm:text-base font-semibold text-foreground leading-tight truncate">{groupName}</h1>
          <p className="text-[11px] sm:text-xs text-muted-foreground">{memberCount} members</p>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 sm:px-4 md:px-6 py-3 sm:py-4 space-y-1 overscroll-contain">
        {messages.map((msg, i) => {
          const showSender = shouldShowSender(i);
          return (
            <div
              key={msg.id}
              className={`flex flex-col ${msg.isMe ? "items-end" : "items-start"} ${showSender && i > 0 ? "mt-3" : ""}`}
            >
              {!msg.isMe && showSender && (
                <span className="text-[11px] sm:text-xs text-muted-foreground mb-1 ml-1 font-medium">{msg.sender}</span>
              )}
              <div
                className={`max-w-[82%] sm:max-w-[75%] px-3 sm:px-4 py-2 sm:py-2.5 text-sm shadow-sm ${
                  msg.isMe
                    ? "bg-primary text-primary-foreground rounded-2xl rounded-br-sm"
                    : "bg-card text-card-foreground rounded-2xl rounded-bl-sm"
                }`}
              >
                {msg.text}
              </div>
              {(i === messages.length - 1 || messages[i + 1]?.sender !== msg.sender) && (
                <span className="text-[10px] text-muted-foreground mt-1 mx-1">{msg.time}</span>
              )}
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div
        className="flex-shrink-0 px-3 sm:px-4 py-2.5 sm:py-3 bg-background border-t border-border"
        style={{ paddingBottom: "max(0.625rem, env(safe-area-inset-bottom))" }}
      >
        <div className="flex gap-2 items-center max-w-4xl mx-auto">
          <Input
            ref={inputRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
            placeholder="Type a message..."
            className="flex-1 rounded-full bg-secondary border-border h-10 sm:h-11 text-base"
            autoComplete="off"
            autoCorrect="on"
          />
          <button
            onClick={handleSend}
            disabled={!message.trim()}
            className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-primary flex items-center justify-center flex-shrink-0 hover:bg-primary/90 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
            aria-label="Send message"
          >
            <Send className="h-4 w-4 sm:h-5 sm:h-5 text-primary-foreground" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatConversation;
