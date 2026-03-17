import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Users, MessageCircle, LogIn, UserPlus } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import AppHeader from "@/components/AppHeader";
import { useAuth } from "@/components/AuthProvider";

const MOCK_GROUPS = [
  {
    id: "1",
    name: "The Boys",
    members: ["Steve B.", "John C.", "Karl G.", "Josh D.", "Phil F."],
    emoji: "🏀",
    lastMessage: "Who's free tonight?",
    unread: 3,
  },
  {
    id: "2",
    name: "Fortnite Quads",
    members: ["Steve B.", "John C.", "Karl G.", "Josh D.", "Phil F."],
    emoji: "🎮",
    lastMessage: "GG's that was insane",
    unread: 0,
  },
  {
    id: "3",
    name: "Marketplace Crew",
    members: ["Steve B.", "John C.", "Karl G.", "Josh D.", "Phil F."],
    emoji: "🏪",
    lastMessage: "Found a great deal on...",
    unread: 1,
  },
  {
    id: "4",
    name: "Study Squad",
    members: ["Kayla G.", "Becca M.", "Karl G.", "Emma P."],
    emoji: "📚",
    lastMessage: "Library at 6?",
    unread: 0,
  },
  {
    id: "5",
    name: "Weekend Warriors",
    members: ["Steve B.", "John C.", "Karl G.", "Josh D.", "Phil F."],
    emoji: "🎉",
    lastMessage: "Saturday plans??",
    unread: 5,
  },
];

const getTimeUntilMidnightUTC = () => {
  const now = new Date();
  const nextMidnight = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
  const diff = Math.max(0, Math.floor((nextMidnight.getTime() - now.getTime()) / 1000));
  return { h: Math.floor(diff / 3600), m: Math.floor((diff % 3600) / 60), s: diff % 60 };
};

const CountdownTimer = () => {
  const [time, setTime] = useState(getTimeUntilMidnightUTC);

  useEffect(() => {
    const interval = setInterval(() => {
      setTime(getTimeUntilMidnightUTC());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <div className="flex gap-3 justify-center">
      {[
        { value: pad(time.h), label: "Hours" },
        { value: pad(time.m), label: "Min" },
        { value: pad(time.s), label: "Sec" },
      ].map((unit, i) => (
        <div key={unit.label} className="flex items-center gap-3">
          <div className="text-center">
            <p className="text-4xl font-black tabular-nums text-foreground">{unit.value}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">{unit.label}</p>
          </div>
          {i < 2 && <span className="text-2xl font-bold text-primary/50 -mt-4">:</span>}
        </div>
      ))}
    </div>
  );
};

const ChatList = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppHeader />

      {!isAuthenticated ? (
        <div className="flex-1 flex items-center justify-center px-4 py-16">
          <div className="bg-card rounded-2xl p-8 max-w-sm w-full shadow-lg text-center space-y-6">
            <div className="w-16 h-16 rounded-full bg-primary/15 flex items-center justify-center mx-auto">
              <MessageCircle className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">Sign in to view Chats</h2>
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                Log in or create an account to see your group chats and start connecting with friends.
              </p>
            </div>
            <div className="space-y-3">
              <Button
                onClick={() => navigate("/get-started")}
                className="w-full h-12 text-base font-semibold rounded-xl gap-2"
              >
                <UserPlus className="w-5 h-5" />
                Sign Up
              </Button>
              <Button
                onClick={() => navigate("/get-started")}
                variant="outline"
                className="w-full h-12 text-base font-semibold rounded-xl gap-2"
              >
                <LogIn className="w-5 h-5" />
                Log In
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Countdown Hero */}
          <div className="px-4 md:px-8 pt-4 max-w-4xl mx-auto w-full">
            <div className="bg-secondary rounded-2xl p-6 text-center relative overflow-hidden">
              <div className="absolute inset-0 bg-primary/5 rounded-2xl" />
              <div className="relative">
                <p className="text-xs text-muted-foreground uppercase tracking-widest mb-3">Next Introduction In</p>
                <div className="animate-pulse-glow">
                  <CountdownTimer />
                </div>
                <p className="text-sm text-muted-foreground mt-4">New friends drop every 24 hours</p>
              </div>
            </div>
          </div>

          {/* Groups */}
          <div className="flex-1 px-4 md:px-8 py-6 max-w-4xl mx-auto w-full">
            <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Your Groups
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {MOCK_GROUPS.map((group) => (
                <button
                  key={group.id}
                  onClick={() => navigate(`/chat/${group.id}`)}
                  className="w-full bg-card rounded-2xl p-4 shadow-sm hover:bg-card/80 transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="w-12 h-12 flex-shrink-0">
                      <AvatarFallback className="bg-secondary text-xl">
                        {group.emoji}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <h3 className="font-semibold text-sm text-foreground">{group.name}</h3>
                        <Badge variant="secondary" className="text-[10px] bg-secondary border-0 px-2 py-0 text-muted-foreground">
                          {group.members.length} members
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">{group.lastMessage}</p>
                    </div>
                    {group.unread > 0 && (
                      <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                        <span className="text-[10px] font-bold text-primary-foreground">{group.unread}</span>
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ChatList;
