import { useState, useEffect, useRef } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { Camera, X, Plus, Lock, User, MapPin, Mail, Sparkles, Shield, LogOut, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import AppHeader from "@/components/AppHeader";
import { apiUrl } from "@/lib/api";
import { useAuth } from "@/components/AuthProvider";
import { toast } from "sonner";

interface ProfileData {
  display_name: string;
  bio: string;
  city: string;
  email: string;
  profile_photo: string;
  hobbies: string[];
}

const PERSONALITY_QUESTIONS = [
  {
    key: "q1",
    question: "How often do you go out of your way to talk to new people at a group event?",
    min: "Rarely",
    max: "Frequently",
    maxValue: 100,
  },
  {
    key: "q2",
    question: "How many nights a week do you spend out with friends?",
    min: "0",
    max: "7",
    maxValue: 7,
  },
  {
    key: "q3",
    question: "Do you find yourself talking with people similar or different to yourself?",
    min: "Similar",
    max: "Different",
    maxValue: 100,
  },
  {
    key: "q4",
    question: "How often do you talk to new people daily — at work, school, or around town?",
    min: "Rarely",
    max: "Frequently",
    maxValue: 100,
  },
];

const resizeImage = (file: File, maxPx: number): Promise<string> =>
  new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(maxPx / img.width, maxPx / img.height, 1);
        const canvas = document.createElement("canvas");
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });

const SectionCard = ({ icon: Icon, title, children }: { icon: React.ElementType; title: string; children: React.ReactNode }) => (
  <div className="bg-card rounded-2xl p-5 sm:p-6 shadow-sm border border-border/50">
    <div className="flex items-center gap-2.5 mb-5">
      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
        <Icon className="w-4 h-4 text-primary" />
      </div>
      <h2 className="text-base font-semibold text-foreground">{title}</h2>
    </div>
    {children}
  </div>
);

const Profile = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user, logout, login } = useAuth();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Profile section
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [profilePhoto, setProfilePhoto] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  // Personal info section
  const [city, setCity] = useState("");
  const [email, setEmail] = useState("");
  const [savingInfo, setSavingInfo] = useState(false);

  // Interests section
  const [hobbies, setHobbies] = useState<string[]>([]);
  const [hobbyInput, setHobbyInput] = useState("");
  const [savingHobbies, setSavingHobbies] = useState(false);

  // Personality results
  const [personalityResults, setPersonalityResults] = useState<Record<string, number> | null>(null);
  const [loadingPersonality, setLoadingPersonality] = useState(false);

  // Security section
  const [username, setUsername] = useState("");
  const [savingUsername, setSavingUsername] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  const [loading, setLoading] = useState(true);

  if (!isAuthenticated) return <Navigate to="/get-started" replace />;

  useEffect(() => {
    if (!user) return;
    fetch(apiUrl(`/api/profile/${user.id}`))
      .then((r) => r.json())
      .then((data) => {
        setDisplayName(data.display_name || user.displayName || "");
        setUsername(data.username || user.username || "");
        setBio(data.bio || "");
        setCity(data.city || "");
        setEmail(data.email || "");
        setProfilePhoto(data.profile_photo || "");
        setHobbies(Array.isArray(data.hobbies) ? data.hobbies : []);
      })
      .catch(() => toast.error("Couldn't load profile."))
      .finally(() => setLoading(false));
  }, [user?.id]);

  useEffect(() => {
    if (!user) return;
    setLoadingPersonality(true);
    fetch(apiUrl(`/api/profile/${user.id}/personality-results`))
      .then(async (r) => {
        if (r.status === 404) return null;
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((data) => {
        setPersonalityResults(data?.results || null);
      })
      .catch(() => toast.error("Couldn't load personality results."))
      .finally(() => setLoadingPersonality(false));
  }, [user?.id]);

  const initials = (displayName || user?.username || "?")
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB.");
      return;
    }
    const resized = await resizeImage(file, 320);
    setProfilePhoto(resized);
    e.target.value = "";
  };

  const addHobby = () => {
    const val = hobbyInput.trim().replace(/,+$/, "");
    if (!val || hobbies.includes(val) || hobbies.length >= 15) return;
    setHobbies([...hobbies, val]);
    setHobbyInput("");
  };

  const removeHobby = (idx: number) => setHobbies(hobbies.filter((_, i) => i !== idx));

  const saveProfile = async () => {
    if (!user) return;
    setSavingProfile(true);
    try {
      const res = await fetch(apiUrl(`/api/profile/${user.id}`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ display_name: displayName, bio, city, email, profile_photo: profilePhoto, hobbies }),
      });
      if (!res.ok) throw new Error();
      const updated = await res.json();
      login({
        id: user.id,
        username: user.username,
        displayName: updated.display_name || displayName || user.username,
        role: user.role,
      });
      toast.success("Profile saved!");
    } catch {
      toast.error("Couldn't save profile.");
    } finally {
      setSavingProfile(false);
    }
  };

  const saveInfo = async () => {
    if (!user) return;
    setSavingInfo(true);
    try {
      const res = await fetch(apiUrl(`/api/profile/${user.id}`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ display_name: displayName, bio, city, email, profile_photo: profilePhoto, hobbies }),
      });
      if (!res.ok) throw new Error();
      const updated = await res.json();
      login({
        id: user.id,
        username: user.username,
        displayName: updated.display_name || displayName || user.username,
        role: user.role,
      });
      toast.success("Info saved!");
    } catch {
      toast.error("Couldn't save info.");
    } finally {
      setSavingInfo(false);
    }
  };

  const saveHobbies = async () => {
    if (!user) return;
    setSavingHobbies(true);
    try {
      const res = await fetch(apiUrl(`/api/profile/${user.id}`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ display_name: displayName, bio, city, email, profile_photo: profilePhoto, hobbies }),
      });
      if (!res.ok) throw new Error();
      const updated = await res.json();
      login({
        id: user.id,
        username: user.username,
        displayName: updated.display_name || displayName || user.username,
        role: user.role,
      });
      toast.success("Interests saved!");
    } catch {
      toast.error("Couldn't save interests.");
    } finally {
      setSavingHobbies(false);
    }
  };

  const saveUsername = async () => {
    if (!user) return;
    const trimmed = username.trim();
    if (!trimmed) {
      toast.error("Username can't be empty.");
      return;
    }
    if (trimmed === user.username) {
      toast.success("Username is already up to date.");
      return;
    }
    setSavingUsername(true);
    try {
      const res = await fetch(apiUrl(`/api/profile/${user.id}/username`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Couldn't update username.");
        return;
      }
      setUsername(data.username || trimmed);
      login({
        id: user.id,
        username: data.username || trimmed,
        displayName: displayName || user.displayName || trimmed,
        role: user.role,
      });
      toast.success("Username updated!");
    } catch {
      toast.error("Couldn't update username.");
    } finally {
      setSavingUsername(false);
    }
  };

  const savePassword = async () => {
    if (!user) return;
    if (newPassword !== confirmNewPassword) {
      toast.error("New passwords don't match.");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }
    setSavingPassword(true);
    try {
      const res = await fetch(apiUrl(`/api/profile/${user.id}/password`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Couldn't update password.");
        return;
      }
      toast.success("Password updated!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
    } catch {
      toast.error("Couldn't update password.");
    } finally {
      setSavingPassword(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <AppHeader />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppHeader />

      <div className="flex-1 w-full max-w-2xl mx-auto px-4 py-6 space-y-4">

        {/* Page heading */}
        <div className="px-1">
          <h1 className="text-xl font-bold text-foreground">Your Profile</h1>
          <p className="text-sm text-muted-foreground mt-0.5">How you show up to the Huddle community.</p>
        </div>

        {/* ── Profile Card ── */}
        <SectionCard icon={User} title="Profile">
          {/* Avatar + name row */}
          <div className="flex flex-col sm:flex-row gap-5 items-start sm:items-center mb-5">
            {/* Avatar */}
            <div className="relative group flex-shrink-0">
              <Avatar className="w-20 h-20 ring-4 ring-primary/20">
                {profilePhoto ? (
                  <img src={profilePhoto} alt="avatar" className="w-full h-full object-cover rounded-full" />
                ) : (
                  <AvatarFallback className="bg-primary/10 text-primary text-xl font-bold">{initials}</AvatarFallback>
                )}
              </Avatar>
              <button
                onClick={() => fileRef.current?.click()}
                className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label="Change photo"
              >
                <Camera className="w-5 h-5 text-white" />
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
            </div>

            {/* Name + username */}
            <div className="flex-1 min-w-0 space-y-2">
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Display Name</Label>
                <Input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your name"
                  className="bg-secondary/50 border-border h-10 font-medium"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs bg-secondary text-muted-foreground rounded-full px-3 py-1 font-mono">
                  @{user?.username}
                </span>
                <span className="text-xs text-muted-foreground">· username</span>
              </div>
            </div>
          </div>

          {profilePhoto && (
            <button
              onClick={() => setProfilePhoto("")}
              className="text-xs text-muted-foreground hover:text-destructive transition-colors mb-4 flex items-center gap-1"
            >
              <X className="w-3 h-3" /> Remove photo
            </button>
          )}

          {/* Bio */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">Bio</Label>
              <span className="text-xs text-muted-foreground">{bio.length}/160</span>
            </div>
            <Textarea
              value={bio}
              onChange={(e) => setBio(e.target.value.slice(0, 160))}
              placeholder="Tell people a bit about yourself — what you're into, what you're looking for..."
              className="bg-secondary/50 border-border resize-none min-h-[80px] text-sm"
            />
          </div>

          <Button onClick={saveProfile} disabled={savingProfile} className="w-full mt-5 h-11 rounded-xl font-semibold">
            {savingProfile ? "Saving..." : "Save Profile"}
          </Button>
        </SectionCard>

        {/* ── Personal Info Card ── */}
        <SectionCard icon={MapPin} title="Personal Info">
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                <MapPin className="w-3 h-3" /> City
              </Label>
              <Input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Where are you based?"
                className="bg-secondary/50 border-border h-10"
                autoComplete="off"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Mail className="w-3 h-3" /> Email
              </Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="bg-secondary/50 border-border h-10"
                autoComplete="email"
              />
            </div>
          </div>
          <Button onClick={saveInfo} disabled={savingInfo} variant="outline" className="w-full mt-5 h-11 rounded-xl font-semibold">
            {savingInfo ? "Saving..." : "Save Info"}
          </Button>
        </SectionCard>

        {/* ── Interests Card ── */}
        <SectionCard icon={Sparkles} title="Your Interests">
          <p className="text-xs text-muted-foreground mb-4">
            Add things you're into — hobbies, sports, music, whatever. This helps Huddle find your people.
          </p>

          {/* Chips */}
          {hobbies.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {hobbies.map((h, i) => (
                <span
                  key={i}
                  className="flex items-center gap-1.5 bg-primary/10 text-primary text-sm font-medium px-3 py-1.5 rounded-full"
                >
                  {h}
                  <button
                    onClick={() => removeHobby(i)}
                    className="hover:text-primary/50 transition-colors"
                    aria-label={`Remove ${h}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}

          {hobbies.length === 0 && (
            <p className="text-sm text-muted-foreground italic mb-4">No interests added yet.</p>
          )}

          {/* Add input */}
          {hobbies.length < 15 && (
            <div className="flex gap-2">
              <Input
                value={hobbyInput}
                onChange={(e) => setHobbyInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === ",") {
                    e.preventDefault();
                    addHobby();
                  }
                }}
                placeholder="Type an interest and press Enter..."
                className="flex-1 bg-secondary/50 border-border h-10 text-sm"
              />
              <Button onClick={addHobby} variant="outline" size="sm" className="h-10 px-4 rounded-xl">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          )}
          {hobbies.length >= 15 && (
            <p className="text-xs text-muted-foreground">Maximum 15 interests reached.</p>
          )}

          <Button onClick={saveHobbies} disabled={savingHobbies} variant="outline" className="w-full mt-5 h-11 rounded-xl font-semibold">
            {savingHobbies ? "Saving..." : "Save Interests"}
          </Button>
        </SectionCard>

        {/* ── Personality Test Card ── */}
        <SectionCard icon={CheckCircle2} title="Personality Test">
          {loadingPersonality && (
            <p className="text-sm text-muted-foreground">Loading your results...</p>
          )}

          {!loadingPersonality && !personalityResults && (
            <>
              <p className="text-sm text-muted-foreground mb-4">
                You haven't taken the personality test yet.
              </p>
              <Button
                onClick={() => navigate("/personality-test")}
                variant="outline"
                className="w-full h-11 rounded-xl font-semibold"
              >
                Take Personality Test
              </Button>
            </>
          )}

          {!loadingPersonality && personalityResults && (
            <div className="space-y-4">
              {PERSONALITY_QUESTIONS.map((q) => {
                const value = Number(personalityResults[q.key]);
                const pct = Math.round((value / q.maxValue) * 100);
                return (
                  <div key={q.key} className="space-y-2">
                    <p className="text-sm font-medium text-foreground">{q.question}</p>
                    <Progress value={pct} className="h-2" />
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{q.min}</span>
                      <span className="text-primary font-semibold">{value}</span>
                      <span>{q.max}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </SectionCard>

        {/* ── Security Card ── */}
        <SectionCard icon={Shield} title="Security">
          <p className="text-xs text-muted-foreground mb-4">
            Choose a strong password you don't use elsewhere.
          </p>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                <User className="w-3 h-3" /> Username
              </Label>
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="your_username"
                className="bg-secondary/50 border-border h-10"
                autoComplete="username"
              />
              <Button
                onClick={saveUsername}
                disabled={savingUsername || !username.trim()}
                variant="outline"
                className="w-full mt-2 h-10 rounded-xl font-semibold"
              >
                {savingUsername ? "Updating..." : "Update Username"}
              </Button>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Lock className="w-3 h-3" /> Current Password
              </Label>
              <Input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
                className="bg-secondary/50 border-border h-10"
                autoComplete="current-password"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">New Password</Label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="bg-secondary/50 border-border h-10"
                autoComplete="new-password"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Confirm New Password</Label>
              <Input
                type="password"
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                placeholder="Re-enter new password"
                className={`bg-secondary/50 border-border h-10 ${confirmNewPassword && newPassword !== confirmNewPassword ? "border-destructive" : ""}`}
                autoComplete="new-password"
              />
              {confirmNewPassword && newPassword !== confirmNewPassword && (
                <p className="text-xs text-destructive">Passwords don't match.</p>
              )}
            </div>
          </div>
          <Button
            onClick={savePassword}
            disabled={savingPassword || !currentPassword || !newPassword || newPassword !== confirmNewPassword}
            variant="outline"
            className="w-full mt-5 h-11 rounded-xl font-semibold"
          >
            {savingPassword ? "Updating..." : "Update Password"}
          </Button>
        </SectionCard>

        {/* ── Log Out ── */}
        <div className="bg-card rounded-2xl p-5 sm:p-6 shadow-sm border border-border/50">
          {!showLogoutConfirm ? (
            <button
              onClick={() => setShowLogoutConfirm(true)}
              className="w-full flex items-center justify-center gap-2 text-destructive hover:text-destructive/80 font-semibold text-sm py-2 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Log Out
            </button>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-center text-foreground font-medium">Are you sure you want to log out?</p>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowLogoutConfirm(false)}
                  className="flex-1 h-11 rounded-xl font-semibold"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => { logout(); navigate("/"); }}
                  className="flex-1 h-11 rounded-xl font-semibold bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                >
                  Log Out
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Bottom padding for mobile */}
        <div className="h-6" />
      </div>
    </div>
  );
};

export default Profile;
