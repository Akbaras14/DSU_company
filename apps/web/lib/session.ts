import type { Role } from "@dsu/contracts";
/** Identity and session cookies are managed exclusively by the backend. */
export function redirectPathForRole(role: Role): string {
  return role === "ADMIN" ? "/admin" : role === "PETUGAS" ? "/petugas" : "/";
}
