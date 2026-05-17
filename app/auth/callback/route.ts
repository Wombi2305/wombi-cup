import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createClient } from "@/lib/supabase-server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  
  // 🔥 Holt das Ziel direkt aus dem URL-Parameter (?next=/invite/123)
  const next = requestUrl.searchParams.get('next') || '/';

  if (code) {
    const supabase = await createClient();
    
    // Tauscht den Code gegen die echte Session aus 
    // (schreibt jetzt dank des Fixes in lib/supabase-server.ts das Cookie fehlerfrei!)
    const { data } = await supabase.auth.exchangeCodeForSession(code);
    
    // Discord-Rollen direkt beim Login prüfen und in DB schreiben
    if (data?.user) {
      const discordIdentity = data.user.identities?.find(
        (id: any) => id.provider === 'discord'
      );
      
      if (discordIdentity?.id) {
        // Ruft deine API auf
        await fetch(`${requestUrl.origin}/api/discord/member?userId=${discordIdentity.id}`);
      }
    }
  }

  // Leitet den User erfolgreich eingeloggt zurück auf die Invite-Seite
  return NextResponse.redirect(new URL(next, request.url));
}