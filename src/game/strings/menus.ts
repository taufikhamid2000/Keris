// menus strings: Malay (ms, source of truth) and English (en). Same keys in both; i18n.test.ts checks.
// Written as [ms, en] pairs so a key can never exist in one language only.
const P: Record<string, [string, string]> = {
  "common.back": ["Kembali", "Back"],

  // title screen
  "title.kicker": ["Melaka, Julai 1511", "Malacca, July 1511"],
  "title.splash.aria": ["Mula", "Start"],
  "title.splash.touch": ["Ketik untuk mula", "Tap to start"],
  "title.splash.key": ["Tekan mana-mana butang", "Press any button"],
  "title.hint.touch": ["Paling sesuai dalam mod landskap. Skrin penuh diminta jika pelayar anda membenarkan.", "Best in landscape. Fullscreen is requested where your browser allows it."],
  "title.hint.mouse": ["Apabila permainan bermula, tetikus akan ditangkap.", "Starting captures the mouse."],
  "title.checkpoint": ["Pusat semak: {label}", "Checkpoint: {label}"],
  "title.checkpointStart": ["Pusat semak: permulaan misi", "Checkpoint: mission start"],
  "title.credits.1": ["Reka bentuk oleh Taufik Hamid. Kod ditulis dengan Claude Code berdasarkan spesifikasi pereka.", "Design by Taufik Hamid. Code written with Claude Code from the designer's spec."],
  "title.credits.2": ["Dibina dengan three.js, Next.js dan React. Dunia dijana secara prosedur, tanpa audio.", "Built with three.js, Next.js and React. Procedural world, no audio."],
  "title.credits.3": ["Model watak dan animasi oleh Quaternius (CC0).", "Character models and animations by Quaternius (CC0)."],
  "title.credits.4": ["Hang Tuah ialah tokoh lagenda Melayu. Kisah di sini adalah rekaan.", "Hang Tuah is a figure of Malay legend. The story here is fiction."],
  "title.credits.5": ["Diilhamkan oleh genre senyap-sembunyi. Tiada kaitan dengan Ubisoft.", "Inspired by the stealth genre. Not affiliated with Ubisoft."],

  // pause menu: gear tab
  "menu.slot.weapon": ["Senjata", "Weapon"],
  "menu.slot.tool1": ["Alat 1", "Tool 1"],
  "menu.slot.tool2": ["Alat 2", "Tool 2"],
  "menu.slot.tool3": ["Alat 3", "Tool 3"],
  "menu.slot.clothing": ["Pakaian", "Clothing"],
  "menu.slot.charm": ["Tangkal", "Tangkal"],
  "menu.slot.health": ["Nyawa", "Life"],
  "menu.gear.keris": ["Tikaman senyap dan pertarungan dekat", "Takedowns and close fighting"],
  "menu.gear.knives": ["{n} daripada {max} tinggal", "{n} of {max} left"],
  "menu.gear.stones": ["{n} biji batu tinggal", "{n} stones left"],
  "menu.gear.pepper": ["{n} genggam tinggal", "{n} handfuls left"],
  "menu.gear.clothing": ["Kain gelap untuk senja", "Dark cloth for the dusk"],
  "menu.gear.clothingName": ["Baju pendekar", "Pendekar's garb"],
  "menu.gear.healthName": ["Kesihatan", "Health"],
  "menu.gear.healthValue": ["{n} daripada {max}", "{n} of {max}"],
  "menu.gear.empty": ["Kosong", "Empty"],
  "menu.gear.noneWorn": ["Tiada yang dipakai", "None worn"],
  "menu.gear.noneFound": ["Belum jumpa tangkal", "No amulet found yet"],
  "menu.charms.count": ["{n} daripada {total} ditemui · satu tersembunyi dalam timbunan jerami atau semak pada setiap misi", "{n} of {total} found · one hidden in a haystack or bush on each mission"],
  "menu.charms.missing": ["Belum ditemui", "Not found yet"],
  "menu.charms.hereHidden": ["Tersembunyi di suatu tempat dalam misi ini", "Hidden somewhere on this mission"],
  "menu.charms.elsewhere": ["Ada dalam misi lain", "On another mission"],
  "menu.charms.takeOff": ["Tanggalkan", "Take off"],
  "menu.charms.wear": ["Pakai", "Wear"],

  // pause menu: hikayat tab
  "menu.hikayat.stats": ["Masa {time} · Pengawal ditumpaskan {down} daripada {total} · Kali dilihat {alerts}", "Time {time} · Guards down {down} of {total} · Times seen {alerts}"],
  "menu.hikayat.charmFound": ["Tangkal: {name} ditemui", "Tangkal: {name} found"],
  "menu.hikayat.charmHidden": ["Tangkal: masih tersembunyi dalam misi ini", "Tangkal: still hidden on this mission"],
  "menu.hikayat.last": ["Hikayat terakhir anda", "Your last tale"],
  "menu.hikayat.title": ["Hikayat", "Hikayat"],
  "menu.hikayat.copy": ["Salin hikayat", "Copy tale"],
  "menu.hikayat.copied": ["Disalin", "Copied"],
  "menu.hikayat.copyFail": ["Tidak dapat disalin", "Could not copy"],

  // map
  "map.aria": ["Peta {name}", "Map of {name}"],
  "map.zoom.group": ["Zum peta", "Map zoom"],
  "map.zoom.in": ["Zum masuk", "Zoom in"],
  "map.zoom.out": ["Zum keluar", "Zoom out"],
  "map.zoom.fitAria": ["Muatkan seluruh peta", "Fit whole map"],
  "map.zoom.fit": ["Muat", "Fit"],
  "map.legend": ["Petunjuk", "Legend"],
  "map.legend.you": ["Anda", "You"],
  "map.legend.item": ["Barang", "Item"],
  "map.legend.target": ["Sasaran", "Target"],
  "map.legend.escape": ["Jalan keluar", "Escape"],
  "map.legend.gate": ["Pintu ke peta lain", "Gate to another map"],
  "map.legend.hide": ["Tempat bersembunyi", "Hiding spot"],
  "map.legend.fog": ["Belum diterokai", "Not explored yet"],
  "map.mission": ["Misi", "Mission"],
  "map.unseen": ["Kekal tidak dilihat: sebarang penggera menggagalkan misi", "Stay unseen: any alarm fails the mission"],
  "map.routes": ["Laluan", "Routes"],
  "map.gateTo": ["Ke {name}", "To {name}"],
  "map.gateUnknown": ["Jalan ke ...?", "Road to ...?"],
  "map.explored": ["Diterokai", "Explored"],
  "map.exploredPct": ["{pct}% diterokai", "{pct}% explored"],
  "map.places": ["Tempat", "Places"],
  "map.placesCount": ["{open} daripada {total}", "{open} of {total}"],
  "map.placeMissing": ["Belum ditulis", "Not written yet"],

  // skills (Ilmu)
  "skills.points.one": ["mata kemahiran", "skill point"],
  "skills.points.other": ["mata kemahiran", "skill points"],
  "skills.earn": ["{m} bagi setiap misi selesai, {g} lagi untuk penilaian Ghost", "{m} for each mission completed, {g} more for a Ghost rating on it"],
  "skills.known": ["Sudah dikuasai: {what}", "Known: {what}"],
  "skills.known.bayang": ["Mencangkung, bersembunyi dalam jerami dan semak, mengangkat mayat, terjun", "Crouch, hide in hay and bushes, carry bodies, dive"],
  "skills.known.silat": ["Tikam, serangan berat, tangkis, bergolek", "Tikam, heavy strike, parry, roll"],
  "skills.known.helang": ["Mata Helang, pisau lempar, tikaman melompat", "Mata Helang, throwing knives, leap takedowns"],
  "skills.branch.bayang": ["Senyap", "Shadow"],
  "skills.branch.silat": ["Pertarungan", "Combat"],
  "skills.branch.helang": ["Pandangan", "Eagle"],
  "skills.learned": ["Dipelajari", "Learned"],
  "skills.learn": ["Pelajari · {cost}", "Learn · {cost}"],
  "skills.short": ["{cost} · Mata tidak cukup", "{cost} · Need points"],
  "skills.locked": ["Pelajari yang di atas dahulu", "Learn the one above first"],
  "skills.cost.one": ["{n} mata", "{n} pt"],
  "skills.cost.other": ["{n} mata", "{n} pts"],
  "skills.reset": ["Lupakan semua (mata dipulangkan)", "Unlearn all (points back)"],

  // chapters
  "chapters.title": ["Bab", "Chapters"],
  "chapters.back": ["‹ Bab", "‹ Chapters"],
  "chapters.soon": ["Akan datang", "Coming soon"],
  "chapters.era.prasejarah": ["Prasejarah", "Prehistory"],
};

export const ms: Record<string, string> = {};
export const en: Record<string, string> = {};
for (const [k, [m, e]] of Object.entries(P)) {
  ms[k] = m;
  en[k] = e;
}
