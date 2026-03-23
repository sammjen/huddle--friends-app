import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
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
  const [searchParams] = useSearchParams();
  const isLogin = searchParams.get("mode") !== "signup";
  const { login } = useAuth();

  // Signup fields
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [username, setUsername] = useState("");
  const [city, setCity] = useState("");
  const [attendsUniversity, setAttendsUniversity] = useState(true);
  const [hobbies, setHobbies] = useState("");

  // Shared fields
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Login-only fields
  const [loginUsername, setLoginUsername] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const canProceedSignup = firstName.trim() && username.trim() && city.trim() && password.trim() && password === confirmPassword;
  const canProceedLogin = loginUsername.trim() && password.trim();

  const handleLogin = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: loginUsername.trim(), password: password.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong.");
        return;
      }
      login({ id: data.id, username: data.username, displayName: data.display_name || data.username, role: data.role || "user" });
      navigate("/chats");
    } catch {
      setError("Could not connect to server.");
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async () => {
    setLoading(true);
    setError("");
    const displayName = `${firstName.trim()} ${lastName.trim()}`.trim();

    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password: password.trim(), city: city.trim(), display_name: displayName }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong.");
        return;
      }
      login({ id: data.id, username: data.username, displayName: data.display_name || displayName, role: data.role || "user" });
      navigate("/personality-test");
    } catch {
      setError("Could not connect to server. Make sure the backend is running.");
    } finally {
      setLoading(false);
    }
  };

  if (isLogin) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <AppHeader />
        <div className="flex-1 flex items-center justify-center px-4 py-8">
          <div className="bg-card rounded-2xl p-6 sm:p-8 w-full max-w-sm shadow-lg space-y-5">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-foreground">Welcome back</h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">Log in to your account.</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="font-semibold text-sm">Username</Label>
                <Input
                  placeholder="your_username"
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                  className="bg-secondary/50 border-border h-11 text-base"
                  autoComplete="username"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="font-semibold text-sm">Password</Label>
                <Input
                  type="password"
                  placeholder="Your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-secondary/50 border-border h-11 text-base"
                  autoComplete="current-password"
                  onKeyDown={(e) => e.key === "Enter" && canProceedLogin && handleLogin()}
                />
              </div>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="space-y-2">
              <Button
                onClick={handleLogin}
                disabled={!canProceedLogin || loading}
                className="w-full h-12 text-base font-semibold rounded-xl touch-manipulation"
              >
                {loading ? "Logging in..." : "Log In"}
              </Button>
              <Button
                onClick={() => navigate("/get-started?mode=signup")}
                variant="ghost"
                className="w-full h-10 text-sm text-muted-foreground hover:text-foreground touch-manipulation"
              >
                Don't have an account? Sign up
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppHeader />

      {/* Progress */}
      <div className="px-4 sm:px-6 pt-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-muted-foreground">Step 1 of 2</span>
          <span className="text-xs text-primary font-medium">Your Profile</span>
        </div>
        <Progress value={50} className="h-1.5" />
      </div>

      {/* Heading */}
      <div className="px-4 sm:px-6 pt-4 sm:pt-6 pb-2">
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">
          Tell us about <span className="text-primary">yourself</span>
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1">We'll use this to find your perfect crew.</p>
      </div>

      {/* Form */}
      <div className="flex-1 flex justify-center px-4 py-4 pb-8">
        <div className="bg-card rounded-2xl p-4 sm:p-6 w-full max-w-sm sm:max-w-lg shadow-lg space-y-4 sm:space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5 sm:space-y-2">
              <Label className="font-semibold text-sm">First Name</Label>
              <Input
                placeholder="First Name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="bg-secondary/50 border-border h-11 text-base"
                autoComplete="given-name"
              />
            </div>
            <div className="space-y-1.5 sm:space-y-2">
              <Label className="font-semibold text-sm">Last Name</Label>
              <Input
                placeholder="Last Name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="bg-secondary/50 border-border h-11 text-base"
                autoComplete="family-name"
              />
            </div>
          </div>

          <div className="space-y-1.5 sm:space-y-2">
            <Label className="font-semibold text-sm">Username</Label>
            <Input
              placeholder="choose_a_username"
              value={username}
              onChange={(e) => setUsername(e.target.value.replace(/\s+/g, "_").toLowerCase())}
              className="bg-secondary/50 border-border h-11 text-base"
              autoComplete="username"
            />
          </div>

          <div className="space-y-1.5 sm:space-y-2">
            <Label className="font-semibold text-sm">Where are you from?</Label>
            <Input
              placeholder="Enter City"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="bg-secondary/50 border-border h-11 text-base"
              autoComplete="off"
            />
          </div>

          <div className="space-y-1.5 sm:space-y-2">
            <Label className="font-semibold text-sm">Password</Label>
            <Input
              type="password"
              placeholder="Create a password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-secondary/50 border-border h-11 text-base"
              autoComplete="new-password"
            />
          </div>

          <div className="space-y-1.5 sm:space-y-2">
            <Label className="font-semibold text-sm">Confirm Password</Label>
            <Input
              type="password"
              placeholder="Re-enter your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="bg-secondary/50 border-border h-11 text-base"
              autoComplete="new-password"
            />
            {confirmPassword && password !== confirmPassword && (
              <p className="text-xs text-destructive">Passwords do not match.</p>
            )}
          </div>

          <div className="flex items-center justify-between py-1">
            <div>
              <Label className="font-semibold text-sm">Do you attend University?</Label>
              <p className="text-[11px] text-muted-foreground mt-0.5">We'll find groups near your campus</p>
            </div>
            <Switch
              checked={attendsUniversity}
              onCheckedChange={setAttendsUniversity}
              className="flex-shrink-0 ml-4"
            />
          </div>

          <div className="space-y-1.5 sm:space-y-2">
            <Label className="font-semibold text-sm">Hobbies</Label>
            <Textarea
              placeholder="What do you enjoy doing?"
              value={hobbies}
              onChange={(e) => setHobbies(e.target.value)}
              className="bg-secondary/50 border-border min-h-[80px] text-base resize-none"
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="space-y-2 sm:space-y-3 pt-1">
            <Button
              onClick={handleSignup}
              disabled={!canProceedSignup || loading}
              className="w-full h-12 text-base font-semibold rounded-xl touch-manipulation"
            >
              {loading ? "Saving..." : "Next"}
            </Button>
            <Button
              onClick={() => navigate("/get-started")}
              variant="ghost"
              className="w-full h-10 text-sm text-muted-foreground hover:text-foreground touch-manipulation"
            >
              Already have an account? Log in
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GetStarted;
