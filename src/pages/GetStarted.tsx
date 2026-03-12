import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import AppHeader from "@/components/AppHeader";
import { useAuth } from "@/components/AuthProvider";

const GetStarted = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [city, setCity] = useState("");
  const [attendsUniversity, setAttendsUniversity] = useState(true);
  const [hobbies, setHobbies] = useState("");

  const canProceed = firstName.trim() && city.trim();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppHeader />

      {/* Progress */}
      <div className="px-6 pt-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-muted-foreground">Step 1 of 2</span>
          <span className="text-xs text-primary font-medium">Your Profile</span>
        </div>
        <Progress value={50} className="h-1.5" />
      </div>

      {/* Heading */}
      <div className="px-6 pt-6 pb-2">
        <h1 className="text-2xl font-bold text-foreground">
          Tell us about <span className="text-primary">yourself</span>
        </h1>
        <p className="text-sm text-muted-foreground mt-1">We'll use this to find your perfect crew.</p>
      </div>

      {/* Form */}
      <div className="flex-1 flex justify-center px-4 py-4">
        <div className="bg-card rounded-2xl p-6 w-full max-w-sm md:max-w-lg shadow-lg space-y-5">
          <div className="space-y-2">
            <Label className="font-semibold text-sm">First Name</Label>
            <Input
              placeholder="Enter First Name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="bg-secondary/50 border-border h-11"
            />
          </div>

          <div className="space-y-2">
            <Label className="font-semibold text-sm">Last Name</Label>
            <Input
              placeholder="Enter Last Name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="bg-secondary/50 border-border h-11"
            />
          </div>

          <div className="space-y-2">
            <Label className="font-semibold text-sm">Where are you from?</Label>
            <Input
              placeholder="Enter City"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="bg-secondary/50 border-border h-11"
            />
          </div>

          <div className="flex items-center justify-between py-1">
            <Label className="font-semibold text-sm">Do you attend University?</Label>
            <Switch
              checked={attendsUniversity}
              onCheckedChange={setAttendsUniversity}
            />
          </div>

          <div className="space-y-2">
            <Label className="font-semibold text-sm">Hobbies</Label>
            <Textarea
              placeholder="What do you enjoy doing?"
              value={hobbies}
              onChange={(e) => setHobbies(e.target.value)}
              className="bg-secondary/50 border-border min-h-[80px]"
            />
          </div>

          <div className="space-y-3 pt-2">
            <Button
              onClick={() => {
                login({ firstName: firstName.trim(), lastName: lastName.trim() });
                navigate("/personality-test");
              }}
              disabled={!canProceed}
              className="w-full h-12 text-base font-semibold rounded-xl"
            >
              Next
            </Button>
            <Button
              onClick={() => navigate("/")}
              variant="ghost"
              className="w-full h-10 text-sm text-muted-foreground hover:text-foreground"
            >
              Go Back
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GetStarted;
