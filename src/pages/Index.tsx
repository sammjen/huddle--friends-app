import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

const REVIEWS = [
  { quote: "I struggled to make friends, but through this app I have made lifelong friends!", name: "Amanda", location: "San Francisco" },
  { quote: "I finally have friends to play pickup basketball with now.", name: "Thomas", location: "Cleveland" },
  { quote: "I now have a full squad to play with on Fortnite.", name: "LeBron", location: "Los Angeles" },
  { quote: "I feel like I finally have a support group.", name: "Alice", location: "Dallas" },
  { quote: "I found gym bros finally.", name: "Greg", location: "Provo" },
  { quote: "App helped me reconnect with an old friend by chance!", name: "Ryan", location: "Earth" },
];

const FOOTER_LINKS = {
  "Use cases": ["UI design", "UX design", "Wireframing", "Diagramming", "Brainstorming", "Online whiteboard", "Team collaboration"],
  "Explore": ["Design", "Prototyping", "Development features", "Design systems", "Collaboration features", "Design process", "FigJam"],
  "Resources": ["Blog", "Best practices", "Colors", "Color wheel", "Support", "Developers", "Resource library"],
};

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Hero */}
      <section className="flex flex-col items-center justify-center px-6 pt-16 pb-12 text-center">
        <h1 className="text-4xl font-black text-foreground leading-tight">Find a Friend</h1>
        <p className="text-lg text-muted-foreground mt-2">Form Lasting Friendships</p>
        <div className="flex gap-3 mt-6">
          <Button variant="outline" className="rounded-full px-6 border-foreground text-foreground hover:bg-foreground hover:text-background" onClick={() => navigate("/get-started")}>
            Log in
          </Button>
          <Button className="rounded-full px-6" onClick={() => navigate("/get-started")}>
            Get Started
          </Button>
        </div>
      </section>

      {/* Reviews */}
      <section className="px-6 pb-12">
        <h2 className="text-lg font-semibold text-foreground mb-5">Reviews from our actual users:</h2>
        <div className="space-y-4">
          {REVIEWS.map((r) => (
            <div key={r.name} className="bg-secondary rounded-xl p-5 space-y-3">
              <p className="text-foreground text-sm font-medium">"{r.quote}"</p>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-muted-foreground/30 flex items-center justify-center text-xs font-bold text-foreground">
                  {r.name[0]}
                </div>
                <div>
                  <p className="text-sm font-semibold text-primary">{r.name}</p>
                  <p className="text-xs text-muted-foreground">{r.location}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border px-6 py-10 space-y-8">
        <div className="flex items-center justify-between">
          <span className="text-2xl font-black text-foreground">BB</span>
          <div className="flex gap-4 text-muted-foreground">
            {["𝕏", "◉", "▶", "in"].map((icon) => (
              <span key={icon} className="text-sm cursor-pointer hover:text-foreground transition-colors">{icon}</span>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-3">
          {Object.entries(FOOTER_LINKS).map(([title, links]) => (
            <div key={title}>
              <h3 className="text-sm font-bold text-foreground mb-3">{title}</h3>
              <ul className="space-y-1.5">
                {links.map((link) => (
                  <li key={link}>
                    <span className="text-xs text-muted-foreground hover:text-primary cursor-pointer transition-colors">{link}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </footer>
    </div>
  );
};

export default Index;
