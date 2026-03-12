import { useState, useRef, useEffect } from "react";
import { useNavigate, useParams, Navigate } from "react-router-dom";
import { ArrowLeft, Send } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/components/AuthProvider";

const MOCK_MESSAGES = [
  { id: "1", sender: "Steve B.", text: "Hey everyone! Who's online?", isMe: false, time: "8:30 PM" },
  { id: "2", sender: "You", text: "I'm here! What's up?", isMe: true, time: "8:31 PM" },
  { id: "3", sender: "John C.", text: "Same here. Anyone down to hang out tonight?", isMe: false, time: "8:32 PM" },
  { id: "4", sender: "You", text: "I'm free after 9, let's do it!", isMe: true, time: "8:33 PM" },
  { id: "5", sender: "Karl G.", text: "Count me in", isMe: false, time: "8:34 PM" },
  { id: "6", sender: "Phil F.", text: "Same, where are we meeting?", isMe: false, time: "8:35 PM" },
  { id: "7", sender: "You", text: "How about the usual spot?", isMe: true, time: "8:36 PM" },
];

const GROUP_INFO: Record<string, { name: string; members: number }> = {
  "1": { name: "The Boys", members: 5 },
  "2": { name: "Fortnite Quads", members: 5 },
  "3": { name: "Marketplace Crew", members: 5 },
  "4": { name: "Study Squad", members: 4 },
  "5": { name: "Weekend Warriors", members: 5 },
};

const ChatConversation = () => {
  const navigate = useNavigate();
  const { groupId } = useParams();
  const { isAuthenticated } = useAuth();
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState(MOCK_MESSAGES);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const group = GROUP_INFO[groupId || "1"] || { name: "Chat", members: 0 };

  if (!isAuthenticated) {
    return <Navigate to="/chats" replace />;
  }

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (!message.trim()) return;
    setMessages((prev) => [
      ...prev,
      {
        id: String(Date.now()),
        sender: "You",
        text: message,
        isMe: true,
        time: new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
      },
    ]);
    setMessage("");
  };

  // Group consecutive messages from the same sender
  const shouldShowSender = (index: number) => {
    if (index === 0) return true;
    return messages[index].sender !== messages[index - 1].sender;
  };

  return (
    <div className="min-h-screen bg-background flex flex-col max-w-4xl mx-auto w-full">
      {/* Header */}
      <header className="sticky top-0 z-50 flex items-center gap-3 px-4 md:px-8 py-3 bg-background/80 backdrop-blur-sm border-b border-border">
        <button
          onClick={() => navigate("/chats")}
          className="w-9 h-9 rounded-full bg-secondary border border-border flex items-center justify-center hover:bg-secondary/80 transition-colors"
        >
          <ArrowLeft className="h-4 w-4 text-foreground" />
        </button>
        <div>
          <h1 className="text-base font-semibold text-foreground leading-tight">{group.name}</h1>
          <p className="text-xs text-muted-foreground">{group.members} members</p>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
        {messages.map((msg, i) => {
          const showSender = shouldShowSender(i);
          return (
            <div
              key={msg.id}
              className={`flex flex-col ${msg.isMe ? "items-end" : "items-start"} ${showSender && i > 0 ? "mt-3" : ""}`}
            >
              {!msg.isMe && showSender && (
                <span className="text-xs text-muted-foreground mb-1 ml-1 font-medium">{msg.sender}</span>
              )}
              <div
                className={`max-w-[75%] px-4 py-2.5 text-sm shadow-sm ${
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
      <div className="sticky bottom-0 px-4 py-3 bg-background border-t border-border" style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}>
        <div className="flex gap-2 items-center">
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Type a message..."
            className="flex-1 rounded-full bg-secondary border-border h-11"
          />
          <button
            onClick={handleSend}
            disabled={!message.trim()}
            className="w-11 h-11 rounded-full bg-primary flex items-center justify-center flex-shrink-0 hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="h-5 w-5 text-primary-foreground" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatConversation;
