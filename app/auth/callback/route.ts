import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createClient } from "@/lib/supabase-server";
import { cookies } from 'next/headers'; // 🔥 NEU: Importiert für das Auslesen des Cookies

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  
  // 🔥 NEU: Wir holen uns das Ziel aus dem Cookie. Wenn keins da ist, nehmen wir '/'
  const cookieStore = await cookies();
  const next = cookieStore.get('redirect_next')?.value || '/';

  if (code) {
    const supabase = await createClient();
    
    // Tauscht den Code gegen die echte Session aus
    const { data } = await supabase.auth.exchangeCodeForSession(code);
    
    // Discord-Rollen direkt beim Login prüfen und in DB schreiben
    if (data?.user) {
      // Wir holen die Discord ID direkt aus den Nutzerdaten der Session-Antwort
      const discordIdentity = data.user.identities?.find(
        (id: any) => id.provider === 'discord'
      );
      
      if (discordIdentity?.id) {
        // Ruft deine API auf
        await fetch(`${requestUrl.origin}/api/discord/member?userId=${discordIdentity.id}`);
      }
    }
  }

  // Erstelle die Weiterleitung an dein eigentliches Ziel
  const response = NextResponse.redirect(new URL(next, request.url));
  
  // 🔥 NEU: Das temporäre Cookie direkt nach der Weiterleitung wieder löschen
  response.cookies.delete('redirect_next');

  return response;
}