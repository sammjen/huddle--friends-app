import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import AppHeader from "@/components/AppHeader";

const PersonalityTest = () => {
  const navigate = useNavigate();
  const [q1, setQ1] = useState([50]);
  const [q2, setQ2] = useState([3]);
  const [q3, setQ3] = useState([50]);
  const [q4, setQ4] = useState([50]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppHeader />

      {/* Intro text */}
      <div className="px-6 py-5 text-center">
        <h1 className="text-lg font-bold text-primary">
          Welcome to the personality test!
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          We will use your answers here to determine your groups.
        </p>
      </div>

      {/* Questions */}
      <div className="flex-1 px-4 space-y-4 pb-6">
        {/* Q1 */}
        <div className="bg-card text-card-foreground rounded-2xl p-5 shadow-sm">
          <p className="text-center font-semibold text-sm mb-4">
            How often do you go out of your way to talk to new people at a group event?
          </p>
          <Slider
            value={q1}
            onValueChange={setQ1}
            max={100}
            step={1}
            className="my-2"
          />
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>Rarely</span>
            <span>Frequently</span>
          </div>
        </div>

        {/* Q2 */}
        <div className="bg-card text-card-foreground rounded-2xl p-5 shadow-sm">
          <p className="text-center font-semibold text-sm mb-4">
            How many nights a week do you spend out with friends?
          </p>
          <Slider
            value={q2}
            onValueChange={setQ2}
            max={7}
            step={1}
            className="my-2"
          />
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>0</span>
            <span>7</span>
          </div>
        </div>

        {/* Q3 */}
        <div className="bg-card text-card-foreground rounded-2xl p-5 shadow-sm">
          <p className="text-center font-semibold text-sm mb-4">
            Do you find yourself talking with people similar or different to yourself?
          </p>
          <Slider
            value={q3}
            onValueChange={setQ3}
            max={100}
            step={1}
            className="my-2"
          />
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>Similar</span>
            <span>Different</span>
          </div>
        </div>

        {/* Q4 */}
        <div className="bg-card text-card-foreground rounded-2xl p-5 shadow-sm">
          <p className="text-center font-semibold text-sm mb-4">
            How often do you talk to new people daily (i.e. at work, school, religious affiliation)?
          </p>
          <Slider
            value={q4}
            onValueChange={setQ4}
            max={100}
            step={1}
            className="my-2"
          />
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>Rarely</span>
            <span>Frequently</span>
          </div>
        </div>

        <Button
          onClick={() => navigate("/chats")}
          className="w-full h-12 text-base font-semibold rounded-xl bg-secondary text-secondary-foreground hover:bg-secondary/80"
          variant="secondary"
        >
          Next
        </Button>
      </div>
    </div>
  );
};

export default PersonalityTest;
