import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Users, MessageCircle, LogIn, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import AppHeader from "@/components/AppHeader";
import { useAuth } from "@/components/AuthProvider";
import { apiUrl } from "@/lib/api";

interface Group {
  id: number;
  name: string;
  chat_photo: string | null;
  member_count: number;
  last_message: string | null;
}

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
    <div className="flex gap-2 sm:gap-3 justify-center">
      {[
        { value: pad(time.h), label: "Hours" },
        { value: pad(time.m), label: "Min" },
        { value: pad(time.s), label: "Sec" },
      ].map((unit, i) => (
        <div key={unit.label} className="flex items-center gap-2 sm:gap-3">
          <div className="text-center">
            <p className="text-3xl sm:text-4xl font-black tabular-nums text-foreground">{unit.value}</p>
            <p className="text-[9px] sm:text-[10px] text-muted-foreground uppercase tracking-wider mt-1">{unit.label}</p>
          </div>
          {i < 2 && <span className="text-xl sm:text-2xl font-bold text-primary/50 -mt-4">:</span>}
        </div>
      ))}
    </div>
  );
};

const ChatList = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !user) return;
    setLoading(true);
    fetch(apiUrl(`/api/groups/${user.id}`))
      .then((res) => res.json())
      .then((data) => setGroups(Array.isArray(data) ? data : []))
      .catch(() => toast.error("Couldn't load groups."))
      .finally(() => setLoading(false));
  }, [isAuthenticated, user]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppHeader />

      {!isAuthenticated ? (
        <div className="flex-1 flex items-center justify-center px-4 py-12 sm:py-16">
          <div className="bg-card rounded-2xl p-6 sm:p-8 max-w-sm w-full shadow-lg text-center space-y-5 sm:space-y-6">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-primary/15 flex items-center justify-center mx-auto">
              <MessageCircle className="w-7 h-7 sm:w-8 sm:h-8 text-primary" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-foreground">Sign in to view Chats</h2>
              <p className="text-xs sm:text-sm text-muted-foreground mt-2 leading-relaxed">
                Log in or create an account to see your group chats and start connecting with friends.
              </p>
            </div>
            <div className="space-y-2 sm:space-y-3">
              <Button
                onClick={() => navigate("/get-started?mode=signup")}
                className="w-full h-12 text-base font-semibold rounded-xl gap-2 touch-manipulation"
              >
                <UserPlus className="w-5 h-5" />
                Sign Up
              </Button>
              <Button
                onClick={() => navigate("/get-started")}
                variant="outline"
                className="w-full h-12 text-base font-semibold rounded-xl gap-2 touch-manipulation"
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
            <div className="bg-secondary rounded-2xl p-4 sm:p-6 text-center relative overflow-hidden">
              <div className="absolute inset-0 bg-primary/5 rounded-2xl" />
              <div className="relative">
                <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-widest mb-3">Next Introduction In</p>
                <CountdownTimer />
                <p className="text-xs sm:text-sm text-muted-foreground mt-3 sm:mt-4">New friends drop every 24 hours</p>
              </div>
            </div>
          </div>

          {/* Groups */}
          <div className="flex-1 px-4 md:px-8 py-4 sm:py-6 max-w-4xl mx-auto w-full">
            <h2 className="text-base sm:text-lg font-semibold text-foreground mb-3 sm:mb-4 flex items-center gap-2">
              <Users className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
              Your Groups
            </h2>

            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-card rounded-2xl p-3 sm:p-4 shadow-sm">
                    <div className="flex items-center gap-3">
                      <Skeleton className="w-11 h-11 sm:w-12 sm:h-12 rounded-full flex-shrink-0" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-48" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : groups.length === 0 ? (
              <p className="text-sm text-muted-foreground">You're not in any groups yet. Check back after the next introduction!</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-3">
                {groups.map((group) => (
                  <button
                    key={group.id}
                    onClick={() => navigate(`/chat/${group.id}`)}
                    className="w-full bg-card rounded-2xl p-3 sm:p-4 shadow-sm hover:bg-card/80 active:scale-[0.98] transition-all text-left touch-manipulation"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="w-11 h-11 sm:w-12 sm:h-12 flex-shrink-0">
                        <AvatarFallback className="bg-secondary text-lg sm:text-xl">
                          {group.chat_photo || "💬"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <h3 className="font-semibold text-sm text-foreground">{group.name}</h3>
                          <Badge variant="secondary" className="text-[10px] bg-secondary border-0 px-2 py-0 text-muted-foreground flex-shrink-0 ml-1">
                            {group.member_count} members
                          </Badge>
                        </div>
                        <p className="text-xs sm:text-sm text-muted-foreground truncate">
                          {group.last_message || "No messages yet"}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default ChatList;
