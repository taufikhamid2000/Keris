// missions strings: Malay (ms, source of truth) and English (en). Same keys in both; i18n.test.ts checks.
// Keys: mission.<levelId>.<field>, intro.*, gate.<exitId>, tide.*
export const ms: Record<string, string> = {};
export const en: Record<string, string> = {};

type Fields = Record<string, string>;
function level(id: string, m: Fields, e: Fields): void {
  for (const k of Object.keys(m)) ms[`mission.${id}.${k}`] = m[k];
  for (const k of Object.keys(e)) en[`mission.${id}.${k}`] = e[k];
}

level(
  "harbour",
  {
    name: "Bateri Jambatan",
    story:
      "Armada Portugis berlabuh di perairan dan bateri mereka menguasai jambatan. Tetua Hang Tuah telah memilihmu, Pendekar, untuk " +
      "menyenyapkan Kapitan itu sebelum meriam dihalakan ke arah bandar. Susuri bumbung atap dan lorong-lorong kampung, tikam sekali " +
      "dengan kerismu, kemudian menyelinap keluar melalui jeti.",
    checkpoint: "Kapitan sudah tumbang",
    winTitle: "Kapitan telah disenyapkan",
    winBody: "Kamu sampai ke jeti lalu hilang di pelabuhan. Bateri itu akan menunggu pemerintah baharu.",
    objective: "Cari dan senyapkan Kapitan bateri jambatan",
    escape: "Menyelinap keluar ke jeti",
    targetDown: "Kapitan sudah tumbang. Sampai ke jeti.",
    targetSpotted: "Kapitan sudah nampak kamu!",
    strike: "Tikam Kapitan dengan keris",
    leap: "Terjun menerkam Kapitan",
  },
  {
    name: "The Bridge Battery",
    story:
      "The Portuguese fleet lies in the roads and their battery commands the bridge. The elder Hang Tuah has chosen you, Pendekar, to " +
      "silence the Kapitan before the guns are turned on the town. Move over the atap roofs and through the kampung lanes, strike once with " +
      "your keris, and slip out by the jetty.",
    checkpoint: "the Kapitan is down",
    winTitle: "The Kapitan is silenced",
    winBody: "You reached the jetty and vanished into the harbour. The battery will wait for a new commander.",
    objective: "Find and silence the Kapitan of the bridge battery",
    escape: "Slip away to the jetty",
    targetDown: "The Kapitan is down. Reach the jetty.",
    targetSpotted: "The Kapitan has seen you!",
    strike: "Strike the Kapitan with the keris",
    leap: "Leap down on the Kapitan",
  },
);

level(
  "kampung",
  {
    name: "Kampung Hulu",
    story:
      "Seseorang telah menjual pelan bateri kepada Portugis, dan jejaknya membawa ke seorang kerani pelabuhan yang bersembunyi di kampung hulu. " +
      "Dia mundar-mandir di hadapan balai penghulu, dikawal dan gelisah. Seberangi bumbung dari pintu timur laut, selesaikan dia sebelum " +
      "dia sempat menjual apa-apa lagi, dan keluar melalui jeti sungai.",
    checkpoint: "kerani itu sudah disenyapkan",
    winTitle: "Kerani telah disenyapkan",
    winBody: "Kamu menyelinap keluar melalui jeti sungai sebelum kampung terjaga. Apa sahaja yang dia tahu kekal di kampung hulu.",
    objective: "Cari kerani pengkhianat yang menjual pelan bateri",
    escape: "Menyelinap keluar ke jeti sungai",
    targetDown: "Kerani sudah disenyapkan. Sampai ke jeti sungai.",
    targetSpotted: "Kerani sudah nampak kamu!",
    strike: "Tikam kerani dengan keris",
    leap: "Terjun menerkam kerani",
  },
  {
    name: "Kampung Hulu",
    story:
      "Someone sold the battery's plans to the Portuguese, and the trail leads to a harbour clerk hiding in the upper kampung. " +
      "He paces in front of the penghulu's hall, guarded and nervous. Cross the rooftops from the north-east gate, deal with him before " +
      "he can sell anything more, and leave by the river jetty.",
    checkpoint: "the clerk is silenced",
    winTitle: "The clerk is silenced",
    winBody: "You slipped out by the river jetty before the kampung woke. Whatever he knew stays in the upper kampung.",
    objective: "Find the turncoat clerk who sold the battery plans",
    escape: "Slip away to the river jetty",
    targetDown: "The clerk is silenced. Reach the river jetty.",
    targetSpotted: "The clerk has seen you!",
    strike: "Strike the clerk with the keris",
    leap: "Leap down on the clerk",
  },
);

level(
  "plans",
  {
    name: "Pelan Bateri",
    story:
      "Kerani itu sudah mati, tetapi pelan bateri yang dijualnya tidak pernah ditemui. Khabarnya dia menyorokkannya dalam sebuah peti di bawah balai penghulu " +
      "sebelum ajalnya. Merangkaklah masuk di bawah lantai, ambil semula pelan itu, dan keluar melalui jeti sungai. Tiada siapa boleh tahu kamu pernah ke sini: " +
      "jika seorang pengawal sahaja membunyikan penggera, misi gagal.",
    checkpoint: "pelan sudah diambil",
    winTitle: "Pelan telah diperoleh semula",
    winBody: "Peti di bawah balai itu kosong dan tiada siapa nampak siapa yang mengosongkannya. Rahsia bateri selamat semula.",
    objective: "Cari peti yang tersembunyi di bawah balai penghulu",
    escape: "Bawa pelan ke jeti sungai tanpa dilihat",
    targetDown: "Pelan sudah di tangan. Sampai ke jeti sungai tanpa dilihat.",
    take: "Ambil pelan bateri",
  },
  {
    name: "The Battery Plans",
    story:
      "The clerk is dead, but the battery plans he sold were never found. Word is he hid them in a chest under the penghulu's hall " +
      "before the end. Crawl in beneath the floor, take them back, and leave by the river jetty. No one may know you were here: " +
      "if a single guard raises the alarm, the mission fails.",
    checkpoint: "the plans are taken",
    winTitle: "The plans are recovered",
    winBody: "The chest under the hall is empty and no one saw who emptied it. The battery's secrets are safe again.",
    objective: "Find the chest hidden under the penghulu's hall",
    escape: "Carry the plans to the river jetty unseen",
    targetDown: "You have the plans. Reach the river jetty unseen.",
    take: "Take the battery plans",
  },
);

level(
  "jungle",
  {
    name: "Perkhemahan Hutan",
    story:
      "Sepasukan peninjau Portugis berkhemah di hutan utara Kampung Hulu, memetakan laluan rimba untuk menyerang Melaka dari belakang. " +
      "Menyusup di celah pokok dari pintu timur laut, senyapkan kapten mereka di perkhemahan, kemudian kembali menerusi kampung ke " +
      "jeti sungai sebelum para peninjau membunyikan penggera. Seekor kuda menunggu di tepi pintu.",
    checkpoint: "kapten peninjau sudah tumbang",
    winTitle: "Para peninjau tiada ketua",
    winBody: "Kapten mereka terbaring di tanah lapang dan peta laluan mereka kini bersamamu. Hutan itu terus menutup pintu belakang Melaka.",
    objective: "Cari kapten peninjau di perkhemahan hutan",
    escape: "Kembali ke jeti sungai",
    targetDown: "Kapten sudah tumbang. Kembali menerusi kampung ke jeti sungai.",
    targetSpotted: "Kapten sudah nampak kamu!",
    strike: "Tikam kapten dengan keris",
    leap: "Terjun menerkam kapten",
  },
  {
    name: "The Jungle Camp",
    story:
      "A Portuguese scouting party has made camp in the hutan north of Kampung Hulu, mapping the jungle trails to take Malacca from behind. " +
      "Slip through the trees from the north-east gate, silence their captain in his camp, then get back through the kampung to the " +
      "river jetty before the scouts raise the alarm. A horse waits by the gate.",
    checkpoint: "the scout captain is down",
    winTitle: "The scouts are leaderless",
    winBody: "Their captain lies in the clearing and his maps of the trails went with you. The hutan keeps Malacca's back door shut.",
    objective: "Find the scout captain in the jungle camp",
    escape: "Get back to the river jetty",
    targetDown: "The captain is down. Back through the kampung to the river jetty.",
    targetSpotted: "The captain has seen you!",
    strike: "Strike the captain with the keris",
    leap: "Leap down on the captain",
  },
);

level(
  "ledang",
  {
    name: "Gunung Ledang",
    story:
      "Askar Portugis telah mendaki Gunung Ledang, gunung yang dikaitkan dengan legenda puterinya, dan menempatkan pengawal di setiap bendul batu. " +
      "Di balai keramat di puncak, mereka merampas tepak sireh emas yang diletakkan di situ sebagai persembahan. Daki gunung " +
      "melalui bendul atau tangga, ambil semula tepak itu dari tempat persembahan, dan turun ke pelantar di kolam bawah air terjun. Kabus " +
      "melindungimu semasa mendaki; ia melindungi mereka juga.",
    checkpoint: "tepak sireh sudah diambil",
    winTitle: "Persembahan dipulangkan",
    winBody: "Tepak sireh emas kembali ke tangan Melayu, dan pengawal di Gunung Ledang tidak pernah nampak siapa yang mengambilnya.",
    objective: "Daki ke balai keramat di puncak dan ambil tepak sireh",
    escape: "Turun ke pelantar di kolam bawah air terjun",
    targetDown: "Tepak sireh sudah di tangan. Turun ke kolam di bawah air terjun.",
    take: "Ambil tepak sireh emas",
  },
  {
    name: "Gunung Ledang",
    story:
      "Portuguese soldiers have climbed Gunung Ledang, the mountain of the legend of its puteri, and set a watch on every ledge. " +
      "At the shrine on the summit they hold the golden tepak sireh, the betel box left there as an offering. Climb the mountain " +
      "by ledge or by stair, take it back from the altar, and get down to the landing in the pool below the falls. The mist " +
      "hides you as you climb; it hides them too.",
    checkpoint: "the tepak sireh is taken",
    winTitle: "The offering is returned",
    winBody: "The golden tepak sireh is back in Malay hands, and the watch on Gunung Ledang never saw who took it.",
    objective: "Climb to the summit shrine and take the tepak sireh",
    escape: "Get down to the landing in the pool below the falls",
    targetDown: "You have the tepak sireh. Down to the pool below the falls.",
    take: "Take the golden tepak sireh",
  },
);

level(
  "wayang",
  {
    name: "Wayang: Bateri Diceritakan Semula",
    story:
      "Malam di kampung, dan tok dalang telah menyalakan blencong di belakang kelir. Malam ini dia menuturkan semula Hikayat Bateri Jambatan, " +
      "dengan kamu sebagai Pendekarnya. Jauhi cahaya pelita: sedekat itu dengan api, bayangmu membesar di layar, dan " +
      "para pengawal turut menatap layar itu. Bagaimana tok dalang menamatkan cerita bergantung pada cara kamu bermain.",
    checkpoint: "patung Kapitan sudah tumbang",
    winTitle: "Cerita selesai dituturkan",
    winBody: "Tok dalang meletakkan patung-patung itu dan api blencong semakin malap.",
    objective: "Senyapkan patung Kapitan di tepi perigi",
    escape: "Menyelinap ke jeti sebelum pelita malap",
    targetDown: "Patung Kapitan rebah. Sampai ke jeti.",
    targetSpotted: "Kapitan sudah nampak bayangmu!",
    strike: "Tikam Kapitan dengan keris",
    leap: "Terjun menerkam Kapitan",
  },
  {
    name: "Wayang: The Battery Retold",
    story:
      "Night in the kampung, and the dalang has lit the blencong behind the kelir. Tonight he tells the Hikayat of the Bridge Battery " +
      "again, with you as his Pendekar. Keep out of the lamplight: so close to the flame your shadow grows huge on the screen, and the " +
      "guards watch the screen too. How he ends the tale depends on how you play it.",
    checkpoint: "the Kapitan's puppet is down",
    winTitle: "The tale is told",
    winBody: "The dalang lays the puppets down and the blencong burns low.",
    objective: "Silence the Kapitan's puppet by the well",
    escape: "Slip away to the jetty before the lamp burns low",
    targetDown: "The Kapitan's puppet falls. Reach the jetty.",
    targetSpotted: "The Kapitan has seen your shadow!",
    strike: "Strike the Kapitan with the keris",
    leap: "Leap down on the Kapitan",
  },
);

level(
  "masjid",
  {
    name: "Masjid: Warkah",
    story:
      "Portugis memeriksa setiap pembawa pesanan yang masuk ke bandar. Seorang penjaga tua di masjid menyimpan sepucuk warkah bermeterai " +
      "untuk utusan Sultan, dan dia membungkusnya dengan kain lalu menyimpannya di bawah lantai rumah beduk, tempat gendang disimpan. " +
      "Rentasi bandar pada senja, melepasi rondaan di lorong-lorong, dan ambil warkah itu. Askar tidak akan memijak kawasan " +
      "masjid, dan bilah kerismu pun tidak boleh dihunus: tanah ini untuk kedamaian. Kemudian pergi sesenyap kamu datang, dan serahkan warkah itu kepada " +
      "tukang perahu utusan di jeti. Jika seorang pengawal sahaja membunyikan penggera, surat itu hilang.",
    checkpoint: "warkah sudah di tangan",
    winTitle: "Warkah telah diserahkan",
    winBody: "Tukang perahu itu berkayuh pergi dengan surat berbungkus kain minyak, dan bandar tidak pernah tahu ada sesuatu yang melalui laman masjid.",
    objective: "Cari warkah di bawah rumah beduk, di dalam pagar masjid",
    escape: "Bawa warkah ke jeti tanpa dilihat",
    targetDown: "Warkah sudah di tangan. Tinggalkan kawasan masjid dengan senyap dan sampai ke jeti tanpa dilihat.",
    take: "Ambil warkah bermeterai",
  },
  {
    name: "Masjid: The Warkah",
    story:
      "The Portuguese are searching every messenger who comes into the town. An old penjaga at the masjid has kept a sealed warkah " +
      "for the Sultan's envoy, and he has left it wrapped in cloth beneath the floor of the beduk house, where the drum is kept. " +
      "Cross the town at dusk, past the patrols in the lanes, and take it up. The soldiers will not set foot in the compound, and " +
      "neither will any blade of yours: this ground is for peace. Then leave as quietly as you came, and give the warkah to the " +
      "envoy's boatman at the jetty. If a single guard raises the alarm, the letter is lost.",
    checkpoint: "the warkah is in hand",
    winTitle: "The warkah is delivered",
    winBody: "The boatman pushed off with the letter wrapped in oilcloth, and the town never learned that anything had passed through the masjid's yard.",
    objective: "Find the warkah beneath the beduk house, inside the masjid's wall",
    escape: "Carry the warkah to the jetty unseen",
    targetDown: "You have the warkah. Leave the grounds quietly and reach the jetty unseen.",
    take: "Take up the sealed warkah",
  },
);

level(
  "gualanun",
  {
    name: "Gua Lanun",
    story:
      "Lanun, perompak laut dari perairan Riau, merampas perahu ufti Sultan di luar Tanjung Tuan dan membawanya masuk ke sebuah gua yang mereka panggil Gua Lanun. " +
      "Peti emas ufti Pahang kini terletak di bendul batu ketua mereka, dan mereka akan belayar pada air pasang berikutnya. Ikut celah batu, " +
      "menyelinap melepasi pengawal masuk ke dalam gua, ambil peti itu dari bawah pandangan ketua, dan keluar melalui pintu air di pantai timur lagun. " +
      "Hanya obor mereka menerangi tempat ini. Kekallah dalam gelap di antaranya.",
    checkpoint: "peti sudah diambil",
    winTitle: "Ufti telah diperoleh semula",
    winBody: "Kamu sampai ke pintu air dengan peti Sultan. Ketika lanun mengira kerugian mereka, air pasang sudah menutup gua di belakangmu.",
    objective: "Ambil peti emas Sultan dari bendul batu ketua lanun",
    escape: "Menyelinap keluar melalui pintu air di pantai timur lagun",
    targetDown: "Peti sudah di tangan. Keluar melalui pintu air.",
    take: "Ambil peti emas Sultan",
  },
  {
    name: "Gua Lanun",
    story:
      "Lanun, sea-raiders out of the Riau waters, took the Sultan's tribute prahu off Tanjung Tuan and ran it into a cave they call Gua Lanun. " +
      "The gold casket of Pahang's tribute sits on their chief's ledge, and they sail with the next tide. Follow the cleft in the rock, " +
      "slip past the sentries into the cavern, take the casket from under the chief's eye, and leave by the water gate on the lagoon's east shore. " +
      "Only their torches give light in here. Keep to the dark between them.",
    checkpoint: "the casket is taken",
    winTitle: "The tribute is recovered",
    winBody: "You reached the water gate with the Sultan's casket. By the time the lanun count their loss, the tide has closed the cave behind you.",
    objective: "Take the Sultan's gold casket from the lanun chief's ledge",
    escape: "Slip out by the water gate on the lagoon's east shore",
    targetDown: "You have the casket. Out by the water gate.",
    take: "Take the Sultan's gold casket",
  },
);

level(
  "kota",
  {
    name: "Kota Batu",
    story:
      "Portugis telah mendirikan kota batu di bukit di atas pelabuhan, dan malam ini para kapten mereka duduk di dalam menara induk " +
      "mengelilingi peta Melaka yang dilukis: setiap meriam, setiap pintu, setiap jalan yang mereka rancang untuk dirampas. Tetua Hang Tuah memilihmu, Pendekar, " +
      "untuk mengambil peta itu dari meja di bumbung menara sebelum majlis sempat menggunakannya. Ada tiga jalan masuk. Pintu gerbang itu bising dan " +
      "diawasi dari setiap penjuru. Batu karang di bawah tembok barat sunyi tetapi curam. Dan kota yang sukar dari depan sentiasa " +
      "lemah di suatu tempat di belakang. Apabila peta sudah di tangan, panjat tembok laut dan turun ke jeti.",
    checkpoint: "peta perang sudah diambil",
    winTitle: "Peta perang telah diambil",
    winBody: "Kamu melepasi tembok laut dengan peta majlis di bawah bajumu dan hilang sebelum loceng berbunyi. Kota itu masih tegak, tetapi tuan-tuannya kini merancang dalam gelap.",
    objective: "Daki menara induk dan ambil peta perang majlis",
    escape: "Melepasi tembok laut dan turun ke jeti",
    targetDown: "Peta perang sudah di tangan. Lepasi tembok laut ke jeti.",
    take: "Ambil peta perang majlis",
  },
  {
    name: "Kota Batu",
    story:
      "The Portuguese have raised a stone fort, the Kota, on the hill above the harbour, and tonight their captains sit in its keep " +
      "over a painted map of Malacca: every gun, every gate, every road they mean to take. The elder Hang Tuah has chosen you, Pendekar, " +
      "to take that map from the table on the keep's roof before the council can use it. There are three ways in. The gate is loud and " +
      "watched from every side. The rocks under the west wall are quiet but steep. And a fort that is hard from the front is always " +
      "soft somewhere behind. When you hold the map, go over the sea wall and down to the jetty.",
    checkpoint: "the war map is taken",
    winTitle: "The war map is taken",
    winBody: "You went over the sea wall with the council's map under your baju and were gone before the bell. The Kota still stands, but its masters now plan in the dark.",
    objective: "Climb the keep and take the council's war map",
    escape: "Over the sea wall and down to the jetty",
    targetDown: "You have the war map. Over the sea wall to the jetty.",
    take: "Take the council's war map",
  },
);

level(
  "penjara",
  {
    name: "Penjara",
    story:
      "Pak Long Hasan, tukang perahu tua yang membina separuh daripada perahu Sultan, ditangkap pada waktu malam. Dia tahu setiap alur " +
      "pelabuhan, dan Portugis mahu mengorek rahsia itu daripadanya di penjara bawah kota: batu lembap, jerami, askar di setiap " +
      "sudut dan seorang sipir yang tidak pernah menanggalkan kuncinya. Terjun ke halaman, turun melalui pintu besar atau pintu belakang sipir, cari " +
      "sel yang paling dalam dan bebaskan dia. Di belakangnya ada jeriji berkarat yang membuka ke parit lama yang mengalir ke sungai. Pelitanya sedikit " +
      "di bawah sana. Kekallah dalam gelap.",
    checkpoint: "Pak Long Hasan sudah bebas",
    winTitle: "Tukang perahu sudah bebas",
    winBody: "Parit membawamu keluar ke sungai, dan sungai menghapus jejak. Pak Long Hasan kini berselindung di bawah tikar sebuah sampan, dan penjara itu kehilangan seorang tahanan.",
    objective: "Cari Pak Long Hasan di sel paling dalam penjara",
    escape: "Keluar melalui jeriji dan parit ke sungai",
    targetDown: "Tukang perahu sudah bebas. Keluar melalui parit ke sungai.",
    take: "Buka kunci sel dan bebaskan Pak Long Hasan",
  },
  {
    name: "Penjara",
    story:
      "Pak Long Hasan, the old boatwright who built half the sultan's prahu, was taken in the night. He knows every channel of the " +
      "harbour, and the Portuguese mean to have it out of him in the penjara under the fort: damp stone, straw, a soldier at every " +
      "corner and a jailer who never takes his keys off. Drop into the yard, go down by the gate or the jailer's back door, find the " +
      "deepest cell and free him. Behind it a rusted grating opens on the old drain that empties into the river. The lanterns are few " +
      "down there. Keep to the dark.",
    checkpoint: "Pak Long Hasan is free",
    winTitle: "The boatwright is free",
    winBody: "The drain took you out into the river, and the river took the trail. Pak Long Hasan is away under a sampan's mat, and the penjara has one cell empty.",
    objective: "Find Pak Long Hasan in the deepest cell of the penjara",
    escape: "Out through the grating and the drain to the river",
    targetDown: "The boatwright is free. Out by the drain to the river.",
    take: "Unlock the cell and free Pak Long Hasan",
  },
);

/** Malay (source) text of a level field, for the plain-data LevelDef literals. */
export const mt = (levelId: string, field: string): string => ms[`mission.${levelId}.${field}`];

// ---------------------------------------------------------------- intro captions
Object.assign(ms, {
  "intro.1": "Melaka, Julai 1511.",
  "intro.2": "Armada Portugis berlabuh di perairan.",
  "intro.3": "Bateri mereka menguasai jambatan, dan meriamnya boleh dihalakan ke arah bandar.",
  "intro.4": "Tetua Hang Tuah telah memilihmu, Pendekar.",
  "intro.5": "Senyapkan Kapitan itu. Keluar melalui jeti.",
});
Object.assign(en, {
  "intro.1": "Malacca, July 1511.",
  "intro.2": "A Portuguese fleet lies in the roads.",
  "intro.3": "Their battery commands the bridge, and its guns may turn on the town.",
  "intro.4": "The elder Hang Tuah has chosen you, Pendekar.",
  "intro.5": "Silence the Kapitan. Leave by the jetty.",
});

// ---------------------------------------------------------------- gate labels (the Peta map and the gate prompt)
const gates: [string, string, string][] = [
  ["harbour-kampung", "Ke Kampung Hulu", "To Kampung Hulu"],
  ["harbour-masjid", "Ke Masjid", "To the Masjid"],
  ["harbour-penjara", "Ke Penjara", "To the Penjara"],
  ["kampung-harbour", "Ke Pelabuhan", "To the Harbour"],
  ["kampung-jungle", "Ke Hutan", "To the Hutan"],
  ["jungle-kampung", "Ke Kampung Hulu", "To Kampung Hulu"],
  ["jungle-ledang", "Ke Gunung Ledang", "To Gunung Ledang"],
  ["jungle-kota", "Ke Kota Batu", "To Kota Batu"],
  ["ledang-jungle", "Ke Hutan", "To the Hutan"],
  ["ledang-gualanun", "Gua Lanun", "Gua Lanun"],
  ["gualanun-ledang", "Ke Gunung Ledang", "To Gunung Ledang"],
  ["masjid-harbour", "Ke Pelabuhan", "To the Harbour"],
  ["penjara-harbour", "Ke Pelabuhan", "To the Harbour"],
  ["kota-jungle", "Ke Hutan", "To the Hutan"],
];
for (const [id, m, e] of gates) {
  ms[`gate.${id}`] = m;
  en[`gate.${id}`] = e;
}
ms["gate.enter"] = "Masuk: {label}";
en["gate.enter"] = "Enter: {label}";

// ---------------------------------------------------------------- tide
Object.assign(ms, {
  "tide.surut": "Air surut",
  "tide.naik": "Pasang naik",
  "tide.pasang": "Air pasang",
  "tide.turun": "Air turun",
  "tide.heading": "Pasang surut",
  "tide.toEbb": "berbalik surut",
  "tide.toFlood": "berbalik pasang",
  "tide.mudBare": "lumpur terdedah",
  "tide.overBanks": "sungai melimpah tebing",
  "tide.line": "{heading}: {state} ({level}){extra} · {next} dalam {clock}",
  "tide.toast.surut": "{state}: lumpur terdedah di sepanjang pantai dan tebing sungai.",
  "tide.toast.pasang": "{state}: sungai melimpah tebingnya.",
});
Object.assign(en, {
  "tide.surut": "Low water",
  "tide.naik": "Rising",
  "tide.pasang": "High water",
  "tide.turun": "Falling",
  "tide.heading": "Tide",
  "tide.toEbb": "turns to ebb",
  "tide.toFlood": "turns to flood",
  "tide.mudBare": "the mudflats are bare",
  "tide.overBanks": "the river is over its banks",
  "tide.line": "{heading}: {state} ({level}){extra} · {next} in {clock}",
  "tide.toast.surut": "{state}: the mud is bare along the shore and the river banks.",
  "tide.toast.pasang": "{state}: the river is over its banks.",
});
