import { Feed } from "./Feed";
import { ProfileRail } from "./ProfileRail";
import { Shell } from "./Shell";

/**
 * Hero product shot: the desktop app with feed + profile rail.
 * Content data lives in utils/constants/landing/appmock.ts.
 */
export function AppWindow() {
  return (
    <div className="relative mx-auto max-w-4xl">
      <Shell>
        <Feed />
        <ProfileRail />
      </Shell>
    </div>
  );
}
