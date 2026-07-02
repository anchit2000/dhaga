import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

export interface SessionOption {
  id: string;
  name: string;
}

/**
 * Attach-to-session fields for capture forms. Pick an existing session or
 * type a new name — the save action prefers the new name when both are set.
 */
export function SessionPicker({ sessions }: { sessions: SessionOption[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 rounded-xl border border-seam bg-paper/[0.02] p-4 sm:grid-cols-2">
      <div>
        <Label htmlFor="sessionId" className="mb-2 text-fog">
          Session
        </Label>
        <Select id="sessionId" name="sessionId" defaultValue="">
          <option value="">None</option>
          {sessions.map((session) => (
            <option key={session.id} value={session.id}>
              {session.name}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <Label htmlFor="newSessionName" className="mb-2 text-fog">
          …or start a new one
        </Label>
        <Input
          id="newSessionName"
          name="newSessionName"
          placeholder="Web Summit 2026"
          className="h-10"
        />
      </div>
    </div>
  );
}
