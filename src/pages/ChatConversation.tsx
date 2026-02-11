import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Send } from "lucide-react";
import { Input } from "@/components/ui/input";

const MOCK_MESSAGES = [
  { id: "1", sender: "Steve B.", text: "Hey everyone! Who's online?", isMe: false, time: "8:30 PM" },
  { id: "2", sender: "You", text: "I'm here! What's up?", isMe: true, time: "8:31 PM" },
  { id: "3", sender: "John C", text: "Same here. Anyone down to hang out tonight?", isMe: false, time: "8:32 PM" },
  { id: "4", sender: "You", text: "I'm free after 9, let's do it!", isMe: true, time: "8:33 PM" },
  { id: "5", sender: "Karl G.", text: "Count me in 🤙", isMe: false, time: "8:34 PM" },
  { id: "6", sender: "Phil F.", text: "Same, where are we meeting?", isMe: false, time: "8:35 PM" },
  { id: "7", sender: "You", text: "How about the usual spot?", isMe: true, time: "8:36 PM" },
];

const ChatConversation = () => {
  const navigate = useNavigate();
  const { groupId } = useParams();
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState(MOCK_MESSAGES);

  const groupNames: Record<string, string> = {
    "1": "The Boys",
    "2": "Fortnite Quads",
    "3": "Marketplace peeps",
    "4": "Study Squad",
    "5": "The Boys",
  };

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

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="flex items-center gap-3 px-4 py-3 bg-primary/30">
        <button
          onClick={() => navigate("/chats")}
          className="w-9 h-9 rounded-full bg-foreground flex items-center justify-center"
        >
          <ArrowLeft className="h-5 w-5 text-background" />
        </button>
        <h1 className="text-lg font-bold text-foreground">
          {groupNames[groupId || "1"] || "Chat"}
        </h1>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${msg.isMe ? "items-end" : "items-start"}`}
          >
            {!msg.isMe && (
              <span className="text-xs text-muted-foreground mb-1 ml-1">{msg.sender}</span>
            )}
            <div
              className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm ${
                msg.isMe
                  ? "bg-primary text-primary-foreground rounded-br-md"
                  : "bg-secondary text-secondary-foreground rounded-bl-md"
              }`}
            >
              {msg.text}
            </div>
            <span className="text-[10px] text-muted-foreground mt-1 mx-1">{msg.time}</span>
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="px-4 py-3 bg-secondary/50 border-t border-border">
        <div className="flex gap-2 items-center">
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Type a message..."
            className="flex-1 rounded-full bg-secondary text-secondary-foreground border-border h-11"
          />
          <button
            onClick={handleSend}
            className="w-11 h-11 rounded-full bg-primary flex items-center justify-center flex-shrink-0 hover:bg-primary/90 transition-colors"
          >
            <Send className="h-5 w-5 text-primary-foreground" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatConversation;
