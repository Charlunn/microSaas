export const tokens = {
  surface: "#0e0e0e",
  surfaceLow: "#131313",
  surfaceContainer: "#1a1919",
  surfaceHighest: "#262626",
  primary: "#a1ffc2",
  primaryContainer: "#00fc9a",
  secondary: "#00cffc",
  outlineVariant: "#484847",
  onSurface: "#ffffff",
  onSurfaceVariant: "#adaaaa",
  onPrimary: "#00643a"
};

export function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}
