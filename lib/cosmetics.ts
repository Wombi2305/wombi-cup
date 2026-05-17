// 🎨 WÖRTERBUCH FÜR FARBEN (Hintergründe & Text)
// 'bg' wird für die Vorschau-Kacheln im Inventar genutzt.
// 'text' wird für den Teamnamen (z.B. auf der TeamCard oder im Profil) genutzt.
export const COSMETIC_COLORS: Record<string, { bg: string; text: string }> = {
  // Level 14: Deep Emerald (Dunkles, sattes Grün/Teal)
  '0': {
    bg: 'bg-gradient-to-tr from-emerald-800 to-teal-950',
    text: 'text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-teal-700',
  },
  
  // Level 30: Purple-Blue Fade
  '1': {
    bg: 'bg-gradient-to-tr from-purple-500 to-blue-500',
    text: 'text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400',
  },

  // Level 44: Magma Glow
  '2': {
    bg: 'bg-gradient-to-tr from-orange-500 to-red-600',
    text: 'text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-500',
  },

  // Level 49: Dark Gunmetal / Cosmic Chrome (Dunkles Metallic/Schwarz)
  '3': {
    bg: 'bg-gradient-to-tr from-slate-700 via-zinc-900 to-black',
    text: 'text-transparent bg-clip-text bg-gradient-to-r from-slate-400 via-gray-500 to-zinc-600',
  },
};


// 🖼️ WÖRTERBUCH FÜR RAHMEN
// 'border' wird für die tatsächliche TeamCard / Profil genutzt (hier kannst du auch fette Glow-Effekte einbauen).
// 'preview' wird für die kleine Vorschau-Kachel im Inventar genutzt (ohne Glow, damit es in der Box gut aussieht).
export const COSMETIC_BORDERS: Record<string, { border: string; preview: string }> = {
  // Level 40: Gold-Rahmen
  '1': {
    border: 'border-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.4)]',
    preview: 'border-yellow-500',
  },

  // 💡 BEISPIELE FÜR ZUKÜNFTIGE RAHMEN (z.B. für Turniersieger oder Events):
  'red_border': {
    border: 'border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.4)]',
    preview: 'border-red-500',
  },
  'ice_border': {
    border: 'border-cyan-300 shadow-[0_0_15px_rgba(103,232,249,0.5)]',
    preview: 'border-cyan-300',
  },
};