import { DashboardPreview } from "./DashboardPreview";
import { Shell } from "./Shell";

/**
 * Hero product shot: a compact rendering of the current Home dashboard.
 * Content data lives in utils/constants/landing/appmock.ts.
 */
export function AppWindow() {
  return (
    <div className="relative mx-auto max-w-5xl">
      <Shell showSidebar={false}>
        <DashboardPreview />
      </Shell>
    </div>
  );
}
