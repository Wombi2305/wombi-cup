import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        // 🔥 VITAL: Erlaubt Supabase, die Login-Session live im Browser zu speichern
        set(name: string, value: string, options: any) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch (error) {
            // Kann in reinen Server Components ignoriert werden, läuft aber im Route Handler sauber durch
          }
        },
        // 🔥 VITAL: Erlaubt Supabase, Cookies zu löschen (z.B. beim Logout)
        remove(name: string, options: any) {
          try {
            cookieStore.delete({ name, ...options });
          } catch (error) {
            // Kann in Server Components ignoriert werden
          }
        },
      },
    }
  );
}