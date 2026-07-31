import { buildUserThemeCss } from "@/lib/theme/css";
import type { UiTheme } from "@/utils/constants/theme";

/**
 * Emits the current user's palette/font overrides as a stylesheet.
 *
 * Server component on purpose — this is what makes the theme FLASH-FREE. The
 * choice lives in Postgres, so next-themes' pre-hydration localStorage script
 * (which is what stops the light/dark flash) cannot know it; the only way the
 * browser has the palette before first paint is for it to arrive inside the
 * server-rendered HTML.
 *
 * Deliberately a plain <style>, not React's hoisted `<style href precedence>`
 * form: hoisted styles are document-lifetime resources deduplicated by `href`,
 * so after a user changes their theme the re-render would find the same `href`
 * already inserted and keep serving the OLD css. A plain element reconciles
 * normally and always reflects the current props.
 */
export function AppThemeStyle({ theme }: { theme: UiTheme }): React.ReactElement | null {
  const css = buildUserThemeCss(theme);
  if (!css) return null;
  // Not user input: every value is interpolated from the closed constant set in
  // utils/constants/theme, keyed by ids parseUiTheme has already validated.
  return <style dangerouslySetInnerHTML={{ __html: css }} />;
}
