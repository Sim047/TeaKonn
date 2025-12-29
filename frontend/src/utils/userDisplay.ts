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
    const MAX = 40;
    const clip = (s: string) => {
      const t = s || '';
      return t.length > MAX ? t.slice(0, MAX) + '…' : t;
    };
    // Prefer a short bio if present
    const bio = typeof u?.bio === 'string' ? u.bio.trim() : '';
    if (bio) return clip(bio);

    // Then user status (emoji + mood) like AllUsers
    if (status && (status.mood || status.emoji)) {
      const emoji = status.emoji ? String(status.emoji) + ' ' : '';
      const mood = status.mood ? String(status.mood) : 'Status set';
      return clip((emoji + mood).trim());
    }

    const sports = Array.isArray(u?.favoriteSports)
      ? u.favoriteSports.filter(Boolean).join(', ')
      : '';
    if (sports) return clip(sports);

    const role = typeof u?.role === 'string' ? u.role : '';
    if (role && role.toUpperCase() !== 'ADMIN') return clip(role);

    // Avoid bio for now (could be long); keep subtitle concise
    return '';
  } catch {
    return '';
  }
}
