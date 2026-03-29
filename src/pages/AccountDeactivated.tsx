import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import AppHeader from "@/components/AppHeader";
import { apiUrl } from "@/lib/api";
import { ShieldAlert, ArrowLeft } from "lucide-react";

const AccountDeactivated = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const prefilled = searchParams.get("username") || "";

  const [username, setUsername] = useState(prefilled);
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (prefilled) setUsername(prefilled);
  }, [prefilled]);

  const handleSubmit = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(apiUrl("/api/account-appeal"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: username.trim(),
          password: password.trim(),
          message: message.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong.");
        return;
      }
      setSuccess(true);
      setPassword("");
      setMessage("");
    } catch {
      setError("Could not reach the server.");
    } finally {
      setLoading(false);
    }
  };

  const canSubmit = username.trim() && password.trim() && message.trim().length >= 10;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppHeader />
      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="bg-card rounded-2xl p-6 sm:p-8 w-full max-w-md shadow-lg space-y-5">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center flex-shrink-0">
              <ShieldAlert className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Account deactivated</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Your account is no longer active, so you cannot sign in. If you believe this was a mistake, you can
                submit a request below. An administrator will review your message and may restore your access.
              </p>
            </div>
          </div>

          {success ? (
            <div className="rounded-xl border border-green-500/30 bg-green-500/5 p-4 text-sm text-foreground">
              <p className="font-medium">Appeal submitted</p>
              <p className="text-muted-foreground mt-1">
                We will review your request. You will be able to log in again if your appeal is approved.
              </p>
              <Button variant="outline" className="mt-4 w-full" onClick={() => navigate("/get-started")}>
                Back to sign in
              </Button>
            </div>
          ) : (
            <>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="font-semibold text-sm">Username</Label>
                  <Input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="bg-secondary/50 border-border h-11"
                    autoComplete="username"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="font-semibold text-sm">Password</Label>
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-secondary/50 border-border h-11"
                    autoComplete="current-password"
                  />
                  <p className="text-[11px] text-muted-foreground">We verify your password to confirm it is your account.</p>
                </div>
                <div className="space-y-1.5">
                  <Label className="font-semibold text-sm">Why should your account be reactivated?</Label>
                  <Textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Explain your situation in at least a few sentences..."
                    className="bg-secondary/50 border-border min-h-[120px] resize-none"
                  />
                  <p className="text-[11px] text-muted-foreground">Minimum 10 characters.</p>
                </div>
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}

              <div className="space-y-2">
                <Button
                  onClick={handleSubmit}
                  disabled={!canSubmit || loading}
                  className="w-full h-12 font-semibold rounded-xl"
                >
                  {loading ? "Submitting..." : "Submit appeal"}
                </Button>
                <Button variant="ghost" className="w-full gap-2 text-muted-foreground" asChild>
                  <Link to="/get-started">
                    <ArrowLeft className="h-4 w-4" />
                    Back to sign in
                  </Link>
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AccountDeactivated;
