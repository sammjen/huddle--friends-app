import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import AppHeader from "@/components/AppHeader";

const GetStarted = () => {
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [city, setCity] = useState("");
  const [attendsUniversity, setAttendsUniversity] = useState(true);
  const [hobbies, setHobbies] = useState("");

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppHeader />

      {/* Banner */}
      <div className="bg-primary py-4 px-6">
        <h1 className="text-xl font-bold text-primary-foreground text-center">
          Tell us about Yourself
        </h1>
      </div>

      {/* Form Card */}
      <div className="flex-1 flex justify-center px-4 py-6">
        <div className="bg-card text-card-foreground rounded-2xl p-6 w-full max-w-sm shadow-lg space-y-5">
          <div className="space-y-2">
            <Label className="text-card-foreground font-semibold">First Name</Label>
            <Input
              placeholder="Enter First Name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="bg-card border-border text-card-foreground"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-card-foreground font-semibold">Last Name</Label>
            <Input
              placeholder="Enter Last Name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="bg-card border-border text-card-foreground"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-card-foreground font-semibold">Where are you from?</Label>
            <Input
              placeholder="Enter City"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="bg-card border-border text-card-foreground"
            />
          </div>

          <div className="flex items-center justify-between">
            <Label className="text-card-foreground font-semibold">Do you attend University?</Label>
            <Switch
              checked={attendsUniversity}
              onCheckedChange={setAttendsUniversity}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-card-foreground font-semibold">Hobbies</Label>
            <Textarea
              placeholder="What are your hobbies?"
              value={hobbies}
              onChange={(e) => setHobbies(e.target.value)}
              className="bg-card border-border text-card-foreground min-h-[80px]"
            />
          </div>

          <div className="space-y-3 pt-2">
            <Button
              onClick={() => navigate("/personality-test")}
              className="w-full h-12 text-base font-semibold rounded-xl bg-secondary text-secondary-foreground hover:bg-secondary/80"
              variant="secondary"
            >
              Next
            </Button>
            <Button
              onClick={() => navigate("/")}
              className="w-full h-12 text-base font-semibold rounded-xl"
              variant="default"
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
