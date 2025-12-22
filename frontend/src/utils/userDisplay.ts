export type UserLike = {
  username?: string;
  favoriteSports?: string[];
  bio?: string;
  role?: string;
};

/**
 * Returns a short, non-PII subtitle for a user.
 * Prioritizes favoriteSports; falls back to role; otherwise empty.
 */
export function getUserSubtitle(u: UserLike | any, status?: any): string {
  try {
    // Prefer a short bio if present
    const bio = typeof u?.bio === "string" ? u.bio.trim() : "";
    if (bio) return bio;

    // Then user status (emoji + mood) like AllUsers
    if (status && (status.mood || status.emoji)) {
      const emoji = status.emoji ? String(status.emoji) + " " : "";
      const mood = status.mood ? String(status.mood) : "Status set";
      return (emoji + mood).trim();
    }

    const sports = Array.isArray(u?.favoriteSports)
      ? u.favoriteSports.filter(Boolean).join(", ")
      : "";
    if (sports) return sports;

    const role = typeof u?.role === "string" ? u.role : "";
    if (role && role.toUpperCase() !== "ADMIN") return role;

    // Avoid bio for now (could be long); keep subtitle concise
    return "";
  } catch {
    return "";
  }
}
