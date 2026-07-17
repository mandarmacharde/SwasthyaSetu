export function getUser(defaultName = "User", defaultRole: "asha" | "doctor" | "admin" = "asha") {
  if (typeof window === "undefined") return { name: defaultName, role: defaultRole };
  try {
    const raw = localStorage.getItem("swasthyasetu_user");
    if (raw) return JSON.parse(raw);
  } catch {}
  return { name: defaultName, role: defaultRole };
}
