import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import AppHeader from "@/components/AppHeader";

const MOCK_GROUPS = [
  {
    id: "1",
    name: "The Boys",
    members: ["Steve B.", "John C", "Karl G.", "Josh D.", "Phil F."],
    avatar: "🏀",
  },
  {
    id: "2",
    name: "Fortnite Quads",
    members: ["Steve B.", "John C", "Karl G.", "Josh D.", "Phil F."],
    avatar: "🎮",
  },
  {
    id: "3",
    name: "Marketplace peeps",
    members: ["Steve B.", "John C", "Karl G.", "Josh D.", "Phil F."],
    avatar: "🏪",
    hasCountdown: true,
  },
  {
    id: "4",
    name: "Study Squad",
    members: ["Kayla G.", "Becca M.", "Karl G.", "Emma P."],
    avatar: "📚",
  },
  {
    id: "5",
    name: "The Boys",
    members: ["Steve B.", "John C", "Karl G.", "Josh D.", "Phil F."],
    avatar: "🎉",
  },
];

const CountdownTimer = () => {
  const [time, setTime] = useState({ h: 23, m: 20, s: 19 });

  useEffect(() => {
    const interval = setInterval(() => {
      setTime((prev) => {
        let { h, m, s } = prev;
        s -= 1;
        if (s < 0) { s = 59; m -= 1; }
        if (m < 0) { m = 59; h -= 1; }
        if (h < 0) { h = 23; m = 59; s = 59; }
        return { h, m, s };
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <div className="text-foreground text-right">
      <p className="text-3xl font-black tabular-nums">
        {pad(time.h)}:{pad(time.m)}:{pad(time.s)}
      </p>
      <p className="text-lg font-bold">Until Drop</p>
    </div>
  );
};

const ChatList = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppHeader />

      <div className="flex-1 px-4 py-4 space-y-4">
        {MOCK_GROUPS.map((group) => (
          <div
            key={group.id}
            className={`flex items-center gap-3 ${group.hasCountdown ? "" : ""}`}
          >
            {/* Group Card */}
            <button
              onClick={() => navigate(`/chat/${group.id}`)}
              className="bg-card text-card-foreground rounded-2xl p-4 flex-shrink-0 shadow-sm hover:shadow-md transition-shadow text-left"
              style={{ minWidth: group.hasCountdown ? "55%" : "100%" }}
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-xl">
                  {group.avatar}
                </div>
                <h3 className="font-bold text-sm">{group.name}</h3>
                <div className="ml-auto w-7 h-7 rounded-full bg-card-foreground flex items-center justify-center">
                  <ChevronRight className="h-4 w-4 text-card" />
                </div>
              </div>
              <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                {group.members.map((m) => (
                  <span key={m}>{m}</span>
                ))}
              </div>
            </button>

            {/* Countdown */}
            {group.hasCountdown && (
              <div className="flex-1">
                <CountdownTimer />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ChatList;
