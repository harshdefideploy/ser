import { redirect } from "next/navigation";

export default function HomePage() {
  // Always start at login — AuthGate also protects /admin.
  redirect("/login");
}
