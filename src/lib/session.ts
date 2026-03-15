const SESSION_KEY = "chatloot_session_id";
const LAST_ROOM_KEY = "chatloot_last_room";

export function getSessionId(): string {
  if (typeof window === "undefined") return "";

  let id = localStorage.getItem(SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

export function saveLastRoom(code: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(LAST_ROOM_KEY, code);
}

export function getLastRoom(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(LAST_ROOM_KEY);
}

export function clearLastRoom(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(LAST_ROOM_KEY);
}
