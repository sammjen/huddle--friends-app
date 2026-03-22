import { useMemo, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { UserPlus, Clock, MessageCircle, Star, Instagram, Twitter, Youtube } from "lucide-react";
import AppHeader from "@/components/AppHeader";
import { toast } from "@/hooks/use-toast";
import { DEFAULT_REVIEWS, loadUserReviews, saveUserReviews, type Review } from "@/lib/reviews";

const STEPS = [
  {
    icon: UserPlus,
    title: "Take the Quiz",
    description: "Answer a quick personality quiz so we can understand your vibe and what you're looking for.",
  },
  {
    icon: Clock,
    title: "Get Matched Every 24h",
    description: "Every day, we drop you into a new group of people who share your energy and interests.",
  },
  {
    icon: MessageCircle,
    title: "Chat & Connect",
    description: "Jump into your group chat, make plans, and turn strangers into your new crew.",
  },
];

const Index = () => {
  const navigate = useNavigate();
  const [userReviews, setUserReviews] = useState<Review[]>(() => loadUserReviews());
  const [quote, setQuote] = useState("");
  const [reviewerName, setReviewerName] = useState("");
  const [reviewerLocation, setReviewerLocation] = useState("");
  const [stars, setStars] = useState(5);
  const [formError, setFormError] = useState<string | null>(null);

  const allReviews = useMemo(() => [...userReviews, ...DEFAULT_REVIEWS], [userReviews]);

  const submitReview = (e: FormEvent) => {
    e.preventDefault();
    const q = quote.trim();
    const n = reviewerName.trim();
    const loc = reviewerLocation.trim();
    if (q.length < 10) {
      setFormError("Please write at least a few sentences (10+ characters).");
      return;
    }
    if (!n || !loc) {
      setFormError("Name and city are required.");
      return;
    }
    setFormError(null);
    const newReview: Review = {
      id: crypto.randomUUID(),
      quote: q,
      name: n.slice(0, 80),
      location: loc.slice(0, 80),
      stars,
    };
    const next = [newReview, ...userReviews];
    setUserReviews(next);
    saveUserReviews(next);
    setQuote("");
    setReviewerName("");
    setReviewerLocation("");
    setStars(5);
    toast({ title: "Thanks!", description: "Your review was added to the carousel." });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppHeader />

      {/* Hero */}
      <section className="relative flex flex-col items-center justify-center px-4 sm:px-6 pt-16 sm:pt-24 pb-12 sm:pb-16 text-center overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[250px] h-[250px] sm:w-[400px] sm:h-[400px] md:w-[500px] md:h-[500px] bg-primary/15 rounded-full blur-[80px] sm:blur-[100px] pointer-events-none" />
        <h1 className="text-5xl sm:text-6xl md:text-8xl font-black text-foreground leading-none tracking-tight animate-fade-in relative">
          Huddle
        </h1>
        <p className="text-lg sm:text-xl md:text-2xl font-semibold text-primary mt-3 animate-slide-up">
          New friends, every 24 hours.
        </p>
        <p className="text-sm sm:text-base md:text-lg text-muted-foreground mt-3 sm:mt-4 max-w-xs sm:max-w-sm md:max-w-xl leading-relaxed animate-slide-up px-2">
          We match you with people who get you — then drop you into a group chat. No swiping. No awkward intros.
        </p>
        <div className="flex gap-3 mt-6 sm:mt-8 animate-slide-up">
          <Button
            variant="ghost"
            className="rounded-full px-4 sm:px-6 text-muted-foreground hover:text-foreground text-sm sm:text-base"
            onClick={() => navigate("/get-started")}
          >
            Log in
          </Button>
          <Button
            className="rounded-full px-6 sm:px-8 h-11 sm:h-12 text-sm sm:text-base font-semibold"
            onClick={() => navigate("/get-started")}
          >
            Get Started
          </Button>
        </div>
      </section>

      {/* How It Works */}
      <section className="px-4 sm:px-6 py-10 sm:py-12">
        <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground text-center mb-6 sm:mb-8">How It Works</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 max-w-sm sm:max-w-xl md:max-w-4xl mx-auto">
          {STEPS.map((step, i) => (
            <div key={step.title} className="bg-secondary rounded-2xl p-4 sm:p-5 flex items-start gap-4 md:flex-col md:items-center md:text-center md:p-8">
              <div className="flex-shrink-0 w-11 h-11 sm:w-12 sm:h-12 md:w-16 md:h-16 rounded-xl bg-primary/15 flex items-center justify-center">
                <step.icon className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 text-primary" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1 md:justify-center md:mb-2">
                  <Badge variant="secondary" className="text-[10px] bg-primary/10 text-primary border-0 px-2 py-0">
                    Step {i + 1}
                  </Badge>
                  <h3 className="font-semibold text-foreground text-sm md:text-base">{step.title}</h3>
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Reviews */}
      <section className="px-4 sm:px-6 py-10 sm:py-12">
        <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground text-center mb-1 sm:mb-2">What People Are Saying</h2>
        <p className="text-xs sm:text-sm text-muted-foreground text-center mb-6 sm:mb-8">Real stories from real users</p>
        <div className="max-w-sm sm:max-w-xl md:max-w-4xl mx-auto space-y-8 sm:space-y-10">
          <form
            onSubmit={submitReview}
            className="bg-secondary/50 border border-border rounded-2xl p-4 sm:p-6 space-y-4"
          >
            <h3 className="text-sm sm:text-base font-semibold text-foreground text-center">Share your story</h3>
            <div className="space-y-2">
              <Label htmlFor="review-quote">Your review</Label>
              <Textarea
                id="review-quote"
                value={quote}
                onChange={(e) => {
                  setFormError(null);
                  setQuote(e.target.value);
                }}
                placeholder="Tell others what Huddle has been like for you…"
                className="min-h-[100px] resize-y bg-background"
                maxLength={600}
                required
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="review-name">Name</Label>
                <Input
                  id="review-name"
                  value={reviewerName}
                  onChange={(e) => {
                    setFormError(null);
                    setReviewerName(e.target.value);
                  }}
                  placeholder="First name or nickname"
                  maxLength={80}
                  autoComplete="name"
                  className="bg-background"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="review-location">City</Label>
                <Input
                  id="review-location"
                  value={reviewerLocation}
                  onChange={(e) => {
                    setFormError(null);
                    setReviewerLocation(e.target.value);
                  }}
                  placeholder="Where you're based"
                  maxLength={80}
                  autoComplete="address-level2"
                  className="bg-background"
                />
              </div>
            </div>
            <div className="space-y-2">
              <span className="text-sm font-medium leading-none">Rating</span>
              <div className="flex gap-1" role="group" aria-label="Star rating">
                {Array.from({ length: 5 }).map((_, i) => {
                  const value = i + 1;
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setStars(value)}
                      className="p-0.5 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      aria-label={`${value} star${value === 1 ? "" : "s"}`}
                    >
                      <Star
                        className={`w-6 h-6 sm:w-7 sm:h-7 ${value <= stars ? "text-primary fill-primary" : "text-muted-foreground/30"}`}
                      />
                    </button>
                  );
                })}
              </div>
            </div>
            {formError ? <p className="text-sm text-destructive">{formError}</p> : null}
            <Button type="submit" className="w-full rounded-full font-semibold">
              Submit review
            </Button>
          </form>
          <Carousel className="w-full">
            <CarouselContent>
              {allReviews.map((r) => (
                <CarouselItem key={r.id} className="sm:basis-1/2 lg:basis-1/3">
                  <div className="bg-secondary/50 border border-border rounded-2xl p-4 sm:p-6 space-y-3 sm:space-y-4 h-full">
                    <div className="flex gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${i < r.stars ? "text-primary fill-primary" : "text-muted-foreground/30"}`} />
                      ))}
                    </div>
                    <p className="text-foreground text-xs sm:text-sm leading-relaxed">"{r.quote}"</p>
                    <div className="flex items-center gap-2 sm:gap-3 pt-1">
                      <Avatar className="w-8 h-8 sm:w-9 sm:h-9">
                        <AvatarFallback className="bg-primary/20 text-primary text-xs font-bold">{r.name[0]}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-xs sm:text-sm font-semibold text-foreground">{r.name}</p>
                        <p className="text-[10px] sm:text-xs text-muted-foreground">{r.location}</p>
                      </div>
                    </div>
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <div className="flex justify-center gap-2 mt-4">
              <CarouselPrevious className="static translate-y-0 bg-secondary border-border hover:bg-secondary/80 w-9 h-9 sm:w-10 sm:h-10" />
              <CarouselNext className="static translate-y-0 bg-secondary border-border hover:bg-secondary/80 w-9 h-9 sm:w-10 sm:h-10" />
            </div>
          </Carousel>
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 sm:px-6 py-10 sm:py-12 text-center">
        <div className="bg-secondary rounded-2xl p-6 sm:p-8 max-w-sm sm:max-w-xl md:max-w-2xl mx-auto">
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground mb-2">Ready to find your crew?</h2>
          <p className="text-xs sm:text-sm md:text-base text-muted-foreground mb-5 sm:mb-6">It takes less than 2 minutes to get started.</p>
          <Button
            className="rounded-full px-8 h-11 sm:h-12 text-sm sm:text-base font-semibold w-full sm:w-auto"
            onClick={() => navigate("/get-started")}
          >
            Get Started
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border px-4 sm:px-6 py-6 sm:py-8">
        <div className="max-w-sm sm:max-w-xl md:max-w-4xl mx-auto space-y-4 sm:space-y-6">
          <div className="flex items-center justify-between">
            <span className="text-lg font-bold text-foreground">
              <span className="text-primary">H</span>uddle
            </span>
            <div className="flex gap-3 sm:gap-4 text-muted-foreground">
              <Twitter className="w-4 h-4 cursor-pointer hover:text-foreground transition-colors" />
              <Instagram className="w-4 h-4 cursor-pointer hover:text-foreground transition-colors" />
              <Youtube className="w-4 h-4 cursor-pointer hover:text-foreground transition-colors" />
            </div>
          </div>
          <div className="flex flex-wrap gap-4 sm:gap-6 text-xs sm:text-sm text-muted-foreground">
            <span className="hover:text-foreground cursor-pointer transition-colors">About</span>
            <span className="hover:text-foreground cursor-pointer transition-colors">Privacy</span>
            <span className="hover:text-foreground cursor-pointer transition-colors">Contact</span>
          </div>
          <p className="text-[10px] sm:text-xs text-muted-foreground/60">&copy; 2026 Huddle. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;