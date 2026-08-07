import { getCurrentUser } from "@/lib/auth/guard";
import { getUiTheme } from "@/lib/repo/settings";
import { ProfileSetting } from "@/components/app/settings/ProfileSetting";
import { AppearanceSetting } from "@/components/app/settings/AppearanceSetting";
import { SecuritySetting } from "@/components/app/settings/SecuritySetting";

/** Name (editable via better-auth) + account email (read-only). Core — renders
 *  the same in self-host and hosted mode. */
export async function ProfileSection() {
  const user = await getCurrentUser();
  return user ? <ProfileSetting name={user.name} email={user.email} /> : null;
}

/** Palette + font for this user's /app. Core — the presets are constants, so it
 *  renders the same in self-host and hosted mode. */
export async function AppearanceSection() {
  return <AppearanceSetting theme={await getUiTheme()} />;
}

export async function SecuritySection() {
  // getCurrentUser() is the memoized session lookup the page guard already ran;
  // twoFactorEnabled is added to the user row by the twoFactor plugin — not part
  // of the base user type getCurrentUser() is statically typed with.
  const user = await getCurrentUser();
  if (!user) return null;
  return (
    <SecuritySetting
      email={user.email}
      twoFactorEnabled={Boolean((user as { twoFactorEnabled?: boolean }).twoFactorEnabled)}
    />
  );
}
