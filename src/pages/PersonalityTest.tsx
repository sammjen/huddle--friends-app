import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { CheckCircle2, ArrowLeft } from "lucide-react";
import AppHeader from "@/components/AppHeader";
import { useAuth } from "@/components/AuthProvider";

type AnswerLetter = "A" | "B" | "C" | "D" | "E";

const QUESTIONS = [
  {
    number: 1,
    prompt: "What do you enjoy doing in your free time for creative expression?",
    options: [
      "Painting, drawing, or digital art",
      "Writing, journaling, or storytelling",
      "Music (playing instruments or producing)",
      "Crafts, DIY projects, or building things",
      "Other",
    ],
  },
  {
    number: 2,
    prompt: "Which type of physical activity appeals to you most?",
    options: [
      "Team sports (soccer, basketball, volleyball)",
      "Individual fitness (gym, running, yoga)",
      "Outdoor adventures (hiking, climbing, camping)",
      "Water activities (swimming, surfing, kayaking)",
      "Other",
    ],
  },
  {
    number: 3,
    prompt: "How do you prefer to spend your entertainment time?",
    options: [
      "Gaming (video games, board games, card games)",
      "Movies, TV shows, or documentaries",
      "Reading books, manga, or comics",
      "Podcasts, audiobooks, or educational content",
      "Other",
    ],
  },
  {
    number: 4,
    prompt: "What's your ideal way to socialize?",
    options: [
      "Large group events and parties",
      "Small gatherings with close friends",
      "One-on-one hangouts",
      "Online communities and forums",
      "Other",
    ],
  },
  {
    number: 5,
    prompt: "What's your relationship with food and cooking?",
    options: [
      "Cooking and experimenting with new recipes",
      "Trying different cuisines and restaurants",
      "Food photography and food culture",
      "Baking and dessert-making",
      "Other",
    ],
  },
  {
    number: 6,
    prompt: "What sparks your intellectual curiosity?",
    options: [
      "Science and technology",
      "History, politics, and current events",
      "Philosophy, psychology, and self-improvement",
      "Languages and cultural studies",
      "Other",
    ],
  },
  {
    number: 7,
    prompt: "Do you enjoy collecting or focusing deeply on specific interests?",
    options: [
      "Gaming/collectibles (cards, figurines, memorabilia)",
      "Fashion and style",
      "Plants, gardening, or nature observation",
      "Travel and exploring new places",
      "Other",
    ],
  },
  {
    number: 8,
    prompt: "What's your connection to music and performance?",
    options: [
      "Attending live concerts and festivals",
      "Listening to music as a passion",
      "Performing or making music myself",
      "Exploring music production or sound design",
      "Other",
    ],
  },
  {
    number: 9,
    prompt: "How do you spend time online?",
    options: [
      "Social media and content creation",
      "Online gaming or streaming",
      "Learning through courses or tutorials",
      "Building things (websites, apps, digital projects)",
      "Other",
    ],
  },
  {
    number: 10,
    prompt: "How do you prioritize your wellness and relaxation?",
    options: [
      "Meditation, mindfulness, or spiritual practices",
      "Fitness, nutrition, and health tracking",
      "Mental health and therapy/counseling",
      "Hobbies and activities purely for fun",
      "Other",
    ],
  },
];

const LETTERS: AnswerLetter[] = ["A", "B", "C", "D", "E"];

const PersonalityTest = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();

  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<(AnswerLetter | null)[]>(() =>
    Array(QUESTIONS.length).fill(null)
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !user?.id) {
      toast.message("Please sign up or log in to take the quiz.");
      navigate("/get-started");
    }
  }, [isAuthenticated, user, navigate]);

  const questionProgress = useMemo(
    () => ((currentQuestion + 1) / QUESTIONS.length) * 100,
    [currentQuestion]
  );

  const selectAnswer = (value: AnswerLetter) => {
    setAnswers((prev) => {
      const next = [...prev];
      next[currentQuestion] = value;
      return next;
    });
  };

  const handleNext = () => {
    if (!answers[currentQuestion]) {
      toast.error("Please choose an answer before continuing.");
      return;
    }
    if (currentQuestion === QUESTIONS.length - 1) {
      handleSubmit();
    } else {
      setCurrentQuestion((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentQuestion > 0) setCurrentQuestion((prev) => prev - 1);
  };

  const handleSubmit = async () => {
    if (!user?.id) {
      toast.error("Please log in again to submit your answers.");
      navigate("/get-started");
      return;
    }
    if (answers.some((a) => !a)) {
      toast.error("Answer every question before submitting.");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        userId: user.id,
        answers: QUESTIONS.map((q, idx) => ({
          questionNumber: q.number,
          answer: answers[idx] as AnswerLetter,
        })),
      };

      const res = await fetch("/api/hobby-answers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to save answers.");
      }

      setIsComplete(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to submit answers.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isComplete) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <AppHeader />
        <div className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 text-center animate-fade-in">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-primary/15 flex items-center justify-center mb-5 sm:mb-6">
            <CheckCircle2 className="w-8 h-8 sm:w-10 sm:h-10 text-primary" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">You're all set!</h1>
          <p className="text-sm sm:text-base text-muted-foreground mb-6 sm:mb-8 max-w-xs">
            We saved your interests and will match you with the best crew.
          </p>
          <Button
            onClick={() => navigate("/chats")}
            className="rounded-full px-8 h-11 sm:h-12 text-sm sm:text-base font-semibold touch-manipulation"
          >
            Find My Group
          </Button>
        </div>
      </div>
    );
  }

  const q = QUESTIONS[currentQuestion];
  const selected = answers[currentQuestion];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppHeader />

      <div className="px-4 sm:px-6 pt-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-muted-foreground">Step 2 of 2</span>
          <span className="text-xs text-primary font-medium">Personality Quiz</span>
        </div>
        <Progress value={100} className="h-1.5" />
      </div>

      <div className="px-4 sm:px-6 pt-3 sm:pt-4">
        <div className="flex items-center justify-between mb-2">
          <Badge variant="secondary" className="text-[10px] bg-primary/10 text-primary border-0 px-2 py-0.5">
            Question {currentQuestion + 1} of {QUESTIONS.length}
          </Badge>
          <span className="text-xs text-muted-foreground">{Math.round(questionProgress)}%</span>
        </div>
        <Progress value={questionProgress} className="h-1" />
      </div>

      <div className="flex-1 flex flex-col justify-center px-4 py-4 sm:py-6">
        <Card className="max-w-xl mx-auto w-full shadow-lg animate-fade-in">
          <CardContent className="p-5 sm:p-6 space-y-5">
            <p className="text-center font-semibold text-base sm:text-lg leading-relaxed">{q.prompt}</p>

            <RadioGroup
              key={q.number}
              value={selected ?? ""}
              onValueChange={(val) => selectAnswer(val as AnswerLetter)}
              className="space-y-3"
            >
              {q.options.map((opt, idx) => (
                <label
                  key={opt}
                  className={`flex items-start gap-3 rounded-xl border p-3 cursor-pointer transition hover:border-primary ${
                    selected === LETTERS[idx] ? "border-primary bg-primary/5" : "border-border"
                  }`}
                >
                  <RadioGroupItem value={LETTERS[idx]} className="mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {LETTERS[idx]}) {opt}
                    </p>
                  </div>
                </label>
              ))}
            </RadioGroup>
          </CardContent>
        </Card>

        <div className="max-w-xl mx-auto w-full mt-5 space-y-2 sm:space-y-3">
          <Button
            onClick={handleNext}
            disabled={isSubmitting}
            className="w-full h-12 text-sm sm:text-base font-semibold rounded-xl touch-manipulation"
          >
            {isSubmitting ? "Saving..." : currentQuestion === QUESTIONS.length - 1 ? "Submit" : "Next Question"}
          </Button>
          {currentQuestion > 0 && (
            <Button
              onClick={handleBack}
              variant="ghost"
              className="w-full h-10 text-sm text-muted-foreground hover:text-foreground touch-manipulation"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Previous
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default PersonalityTest;
