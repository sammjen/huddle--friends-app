import { useEffect, useState } from "react";
import { CalendarDays, LogIn, MapPin, Pencil, Plus, Trash2, UserPlus, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import AppHeader from "@/components/AppHeader";
import { useAuth } from "@/components/AuthProvider";
import { apiUrl } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";

interface EventRow {
  id: number;
  name: string;
  event_date: string;
  location: string;
  description: string | null;
  created_at: string;
  isRsvped: boolean;
}

const EVENT_DATE_MIN = "2000-01-01T00:00";
const EVENT_DATE_MAX = "2099-12-31T23:59";

const parseEventDate = (value: string) => {
  const normalized = value.trim().replace(" ", "T");
  const matches = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(normalized);
  if (!matches) return null;

  const year = Number(matches[1]);
  if (year < 2000 || year >= 2100) return null;

  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatEventDate = (value: string) => {
  const parsed = parseEventDate(value);
  if (!parsed) return "Invalid event date";

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsed);
};

const compareEventDates = (a: string, b: string) => {
  const aDate = parseEventDate(a);
  const bDate = parseEventDate(b);

  if (!aDate && !bDate) return 0;
  if (!aDate) return 1;
  if (!bDate) return -1;
  return aDate.getTime() - bDate.getTime();
};

const Events = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingIds, setPendingIds] = useState<number[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingEventId, setEditingEventId] = useState<number | null>(null);
  const [savingEvent, setSavingEvent] = useState(false);
  const [eventForm, setEventForm] = useState({
    name: "",
    event_date: "",
    location: "",
  });

  const isAdmin = user?.role === "admin";

  useEffect(() => {
    if (!isAuthenticated || !user) {
      setEvents([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    fetch(apiUrl(`/api/events?userId=${user.id}`))
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Failed to fetch events.");
        }
        setEvents(Array.isArray(data) ? data : []);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [isAuthenticated, user]);

  const toggleRsvp = async (eventId: number) => {
    if (!user) return;
    const current = events.find((event) => event.id === eventId);
    if (!current) return;

    setPendingIds((prev) => [...prev, eventId]);
    setEvents((prev) =>
      prev.map((event) =>
        event.id === eventId ? { ...event, isRsvped: !event.isRsvped } : event
      )
    );

    try {
      const response = await fetch(apiUrl(`/api/events/${eventId}/rsvp`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update RSVP.");
      }

      setEvents((prev) =>
        prev.map((event) =>
          event.id === eventId ? { ...event, isRsvped: Boolean(data.isRsvped) } : event
        )
      );
    } catch (err) {
      setEvents((prev) =>
        prev.map((event) =>
          event.id === eventId ? { ...event, isRsvped: current.isRsvped } : event
        )
      );
      setError(err instanceof Error ? err.message : "Failed to update RSVP.");
    } finally {
      setPendingIds((prev) => prev.filter((id) => id !== eventId));
    }
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingEventId(null);
    setEventForm({ name: "", event_date: "", location: "" });
  };

  const startAddEvent = () => {
    setError(null);
    setEditingEventId(null);
    setEventForm({ name: "", event_date: "", location: "" });
    setShowForm(true);
  };

  const startEditEvent = (event: EventRow) => {
    setError(null);
    setEditingEventId(event.id);
    setEventForm({
      name: event.name,
      event_date: parseEventDate(event.event_date)
        ? event.event_date.replace(" ", "T").slice(0, 16)
        : "",
      location: event.location,
    });
    setShowForm(true);
  };

  const saveEvent = async () => {
    if (!user || !isAdmin || savingEvent) return;

    setSavingEvent(true);
    setError(null);

    const parsedDate = parseEventDate(eventForm.event_date);
    if (!eventForm.name.trim() || !eventForm.location.trim() || !parsedDate) {
      setSavingEvent(false);
      setError("Enter a valid name, location, and date. Year must be 4 digits from 2000 to 2099.");
      return;
    }

    const payload = {
      userId: user.id,
      name: eventForm.name.trim(),
      event_date: eventForm.event_date.replace("T", " ").trim(),
      location: eventForm.location.trim(),
    };

    try {
      const response = await fetch(
        editingEventId ? apiUrl(`/api/events/${editingEventId}`) : apiUrl("/api/events"),
        {
          method: editingEventId ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to save event.");
      }

      setEvents((prev) => {
        const next = editingEventId
          ? prev.map((event) => (event.id === editingEventId ? data : event))
          : [...prev, data];

        return next.sort((a, b) => compareEventDates(a.event_date, b.event_date));
      });
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save event.");
    } finally {
      setSavingEvent(false);
    }
  };

  const deleteEvent = async (eventId: number) => {
    if (!user || !isAdmin) return;
    const confirmed = window.confirm("Delete this event?");
    if (!confirmed) return;

    try {
      const response = await fetch(apiUrl(`/api/events/${eventId}`), {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to delete event.");
      }

      setEvents((prev) => prev.filter((event) => event.id !== eventId));
      if (editingEventId === eventId) {
        resetForm();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete event.");
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppHeader />

      {!isAuthenticated || !user ? (
        <div className="flex-1 flex items-center justify-center px-4 py-12 sm:py-16">
          <div className="bg-card rounded-2xl p-6 sm:p-8 max-w-sm w-full shadow-lg text-center space-y-5 sm:space-y-6">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-primary/15 flex items-center justify-center mx-auto">
              <CalendarDays className="w-7 h-7 sm:w-8 sm:h-8 text-primary" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-foreground">Sign in to RSVP to Events</h2>
              <p className="text-xs sm:text-sm text-muted-foreground mt-2 leading-relaxed">
                You need an account to view shared plans and RSVP to upcoming events.
              </p>
            </div>
            <div className="space-y-2 sm:space-y-3">
              <Button
                onClick={() => navigate("/get-started?mode=signup")}
                className="w-full h-12 text-base font-semibold rounded-xl gap-2 touch-manipulation"
              >
                <UserPlus className="w-5 h-5" />
                Sign Up
              </Button>
              <Button
                onClick={() => navigate("/get-started")}
                variant="outline"
                className="w-full h-12 text-base font-semibold rounded-xl gap-2 touch-manipulation"
              >
                <LogIn className="w-5 h-5" />
                Log In
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <main id="main-content" className="flex-1 px-4 md:px-8 py-6 max-w-5xl mx-auto w-full">
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <Badge variant="secondary" className="mb-3 bg-primary/10 text-primary border-0">
                Upcoming Events
              </Badge>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Plan something together</h1>
              <p className="text-sm text-muted-foreground mt-2 max-w-2xl">
                Browse a few simple hangout ideas and RSVP to let your group know you are in.
              </p>
            </div>
            {isAdmin ? (
              <Button onClick={showForm && editingEventId === null ? resetForm : startAddEvent} className="gap-2">
                {showForm && editingEventId === null ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                {showForm && editingEventId === null ? "Cancel" : "Add Event"}
              </Button>
            ) : null}
          </div>

          {error ? (
            <div className="mb-6 p-4 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm">
              {error}
            </div>
          ) : null}

          {isAdmin && showForm ? (
            <Card className="mb-6 border-border/70">
              <CardHeader>
                <CardTitle className="text-lg">
                  {editingEventId ? "Edit Event" : "Add Event"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="event-name">Name</Label>
                    <Input
                      id="event-name"
                      value={eventForm.name}
                      onChange={(e) => setEventForm((prev) => ({ ...prev, name: e.target.value }))}
                      placeholder="Coffee Meetup"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="event-date">Date</Label>
                    <Input
                      id="event-date"
                      type="datetime-local"
                      min={EVENT_DATE_MIN}
                      max={EVENT_DATE_MAX}
                      value={eventForm.event_date}
                      onChange={(e) => setEventForm((prev) => ({ ...prev, event_date: e.target.value }))}
                    />
                    <p className="text-xs text-muted-foreground">
                      Use a 4-digit year from 2000 to 2099.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="event-location">Location</Label>
                    <Input
                      id="event-location"
                      value={eventForm.location}
                      onChange={(e) => setEventForm((prev) => ({ ...prev, location: e.target.value }))}
                      placeholder="Downtown Denver"
                    />
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button onClick={saveEvent} disabled={savingEvent}>
                    {savingEvent ? "Saving..." : editingEventId ? "Save Changes" : "Create Event"}
                  </Button>
                  <Button variant="outline" onClick={resetForm} disabled={savingEvent}>
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : null}

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2].map((i) => (
                <Card key={i} className="border-border/70">
                  <CardHeader>
                    <Skeleton className="h-6 w-40" />
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Skeleton className="h-4 w-52" />
                    <Skeleton className="h-4 w-36" />
                    <Skeleton className="h-10 w-24 rounded-lg" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : events.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center">
                <p className="text-base font-medium text-foreground">No events available right now.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {events.map((event) => {
                const isPending = pendingIds.includes(event.id);

                return (
                  <Card key={event.id} className="border-border/70">
                    <CardHeader>
                      <CardTitle className="text-xl">{event.name}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2 text-foreground">
                          <CalendarDays className="h-4 w-4 text-primary" />
                          <span>{formatEventDate(event.event_date)}</span>
                        </div>
                        <div className="flex items-center gap-2 text-foreground">
                          <MapPin className="h-4 w-4 text-primary" />
                          <span>{event.location}</span>
                        </div>
                      </div>

                      {event.description ? (
                        <p className="text-sm text-muted-foreground">{event.description}</p>
                      ) : null}

                      <Button
                        onClick={() => toggleRsvp(event.id)}
                        disabled={isPending}
                        variant={event.isRsvped ? "outline" : "default"}
                        className="w-full sm:w-auto"
                      >
                        {isPending ? "Updating..." : event.isRsvped ? "Cancel RSVP" : "RSVP"}
                      </Button>
                      {isAdmin ? (
                        <div className="flex flex-wrap gap-2">
                          <Button
                            onClick={() => startEditEvent(event)}
                            variant="outline"
                            className="w-full sm:w-auto gap-2"
                          >
                            <Pencil className="h-4 w-4" />
                            Edit
                          </Button>
                          <Button
                            onClick={() => deleteEvent(event.id)}
                            variant="destructive"
                            className="w-full sm:w-auto gap-2"
                          >
                            <Trash2 className="h-4 w-4" />
                            Delete
                          </Button>
                        </div>
                      ) : null}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </main>
      )}
    </div>
  );
};

export default Events;
