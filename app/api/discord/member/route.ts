import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server"; // 🔥 WICHTIG

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }

    const GUILD_ID = process.env.DISCORD_GUILD_ID!;
    const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN!;

    const res = await fetch(
      `https://discord.com/api/v10/guilds/${GUILD_ID}/members/${userId}`,
      {
        headers: {
          Authorization: `Bot ${BOT_TOKEN}`,
        },
      }
    );

    if (!res.ok) {
      return NextResponse.json({ error: "Discord fetch failed" }, { status: 500 });
    }

    const member = await res.json();
    const roles = member.roles || [];

    // 🔥 Rollen IDs
    const ORGA = "1492478735444873398";
    const STREAMER = "1493976124173062195";
    const TEAMVM = "1492462340787011624";
    const FREEAGENT = "1492462347967664198";

    // Standard-Rolle ist "spieler", wird überschrieben, wenn was Höheres zutrifft
    let role = "spieler"; 

    if (roles.includes(ORGA)) {
      role = "orga";
    } else if (roles.includes(STREAMER)) {
      role = "streamer";
    } else if (roles.includes(TEAMVM)) {
      role = "teamvm";
    } else if (roles.includes(FREEAGENT)) {
      role = "freeagent";
    }

    // 🔥 SERVER CLIENT (FIX)
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    // 🔥 DB updaten (Jetzt ohne "&& role", damit das Update IMMER feuert)
    if (user) {
      await supabase.from("profiles").upsert({
        id: user.id,
        discord_id: userId,
        role: role, 
      });
    }

    return NextResponse.json({
      nick: member.nick || member.user?.username,
      roles,
      role,
    });

  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}