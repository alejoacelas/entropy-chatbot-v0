export const AUTH_COOKIE = "entropy_lab_auth";

export async function accessToken(code: string) {
  const bytes = new TextEncoder().encode(`entropy-lab:${code}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}
