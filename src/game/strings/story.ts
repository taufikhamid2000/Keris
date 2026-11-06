// story strings: Malay (ms, source of truth) and English (en). Same keys in both; i18n.test.ts checks.
// Each entry below is written once as [ms, en] so the two dictionaries cannot drift apart.
// Numbered variants (key.0, key.1, ...) are picked by seed or at random; both languages must have the same count.
//
// Terms follow docs/STORYLINE-DRAFT.md: this is an in-world fiction set in Melaka in 1511. Hang Tuah and the puteri of
// Gunung Ledang are legend, and nothing here is offered as documented history.

type Pair = [string, string];
const D: Record<string, Pair> = {};

/** Numbered variants: key.0, key.1, ... */
function many(prefix: string, ms: string[], en: string[]) {
  if (ms.length !== en.length) throw new Error(`story strings: ${prefix} has ${ms.length} ms but ${en.length} en variants`);
  ms.forEach((m, i) => (D[`${prefix}.${i}`] = [m, en[i]]));
}

// ---------------------------------------------------------------- guard chatter (barks.ts)

many(
  "bark.suspicious",
  ["Quem está aí?", "Kau dengar tadi?", "Ada sesuatu bergerak di sana.", "Siapa di situ? Tunjukkan dirimu.", "Hmm. Mungkin monyet.", "Aku pergi tengok."],
  ["Quem está aí?", "Did you hear that?", "Something moved over there.", "Who goes there? Show yourself.", "Hm. Probably a monkey.", "I'll take a look."],
);
many(
  "bark.alert",
  ["Ali! Di sana!", "Alarme! Penceroboh!", "Itu dia! Tangkap dia!", "Angkat senjata! Angkat senjata!", "Orang Melayu bersenjata! Ke sini!"],
  ["Ali! There!", "Alarme! Intruder!", "There he is! Take him!", "To arms! To arms!", "A Malay with a blade! Here!"],
);
many(
  "bark.search",
  ["Dia ada di sini tadi.", "Berpecah. Dia tak mungkin pergi jauh.", "Periksa bayang-bayang.", "Cari di bawah rumah-rumah.", "Ke mana dia pergi?"],
  ["He was right here.", "Spread out. He can't have gone far.", "Check the shadows.", "Look under the houses.", "Where did he go?"],
);
many(
  "bark.giveup",
  ["Tiada apa-apa. Kembali ke pos.", "Angin sahaja.", "Mataku mempermainkan aku lagi.", "Siapa pun dia, dia sudah pergi.", "Nada. Kembali bekerja."],
  ["Nothing. Back to the post.", "Only the wind.", "My eyes are playing tricks again.", "Whoever it was, he's gone.", "Nada. Back to work."],
);
many(
  "bark.body",
  ["Deus! Ada orang rebah di sini!", "Dia sudah mati. Bunyikan penggera!", "Ada yang membunuh orang kita!"],
  ["Deus! A man down here!", "He's dead. Sound the alarm!", "Someone has been killing our men!"],
);
many("bark.blind", ["Mataku! Lada!", "Aku tak nampak!", "Aduh, pedihnya!"], ["My eyes! Pepper!", "I can't see!", "Ai, it burns!"]);
many("bark.stunned", ["Ugh, kepalaku...", "Apa yang menghentamku?"], ["Ugh, my head...", "What hit me?"]);

many(
  "bark.idle.all",
  [
    "Panas ini akan membunuhku sebelum mana-mana orang Melayu sempat.",
    "Tiga bulan di laut demi tempat ini.",
    "Kasutku tidak pernah kering sejak di Goa.",
    "Kata orang, pasukan sultan boleh memanjat macam kucing.",
    "Perhatikan bumbung. Dari situlah mereka datang.",
    "Bila kita nak diganti?",
    "Santa Maria, nyamuk-nyamuk ini.",
    "Aku rindu roti. Roti yang sebenar.",
  ],
  [
    "This heat will kill me before any Malay does.",
    "Three months at sea for this.",
    "My boots have not been dry since Goa.",
    "They say the sultan's men can climb like cats.",
    "Keep your eyes on the roofs. That's where they come from.",
    "When do we get relieved?",
    "Santa Maria, the mosquitoes.",
    "I miss bread. Real bread.",
  ],
);
many(
  "bark.idle.harbour",
  ["Kapitan mahu meriam dihalakan ke bandar sebelum pagi.", "Awasi jeti. Sampan keluar masuk sepanjang malam.", "Armada akan masuk apabila kubu meriam sudah siap."],
  ["The Kapitan wants the guns turned on the town by morning.", "Watch the jetty. Sampans come and go all night.", "The fleet sails in when the battery is ready."],
);
many(
  "bark.idle.kampung",
  ["Kerani itu bayar mahal, tapi banyak mulut.", "Balai penghulu itu buat aku rasa tak sedap hati.", "Siapa yang berjalan di bawah rumah? Orang Melayu, siapa lagi."],
  ["That clerk pays well and talks too much.", "The penghulu's hall gives me a bad feeling.", "Who walks around under houses? Malays, that's who."],
);
many(
  "bark.idle.plans",
  ["Katanya ada sesuatu disembunyikan di bawah balai.", "Jaga balai itu. Tiada sesiapa dibenarkan ke bawah.", "Kalau pelan itu hilang, kepala kitalah yang melayang."],
  ["Something was hidden under the hall, they say.", "Guard the hall. Nobody goes underneath.", "If the plans go missing, it's our heads."],
);
many(
  "bark.idle.jungle",
  ["Semua denai ini nampak serupa.", "Kekal di denai. Hutan ini memakan orang.", "Ada sesuatu memerhati kita dari pokok-pokok.", "Peta kapten itu elok-elok betul."],
  ["These trails all look the same.", "Stay on the path. The jungle eats men.", "Something's watching us from the trees.", "The captain's map had better be right."],
);
many(
  "bark.idle.ledang",
  ["Katanya ada seorang puteri tinggal di gunung ini.", "Berkabus lagi. Tangan sendiri pun tak nampak.", "Siapa yang tinggalkan emas di puncak gunung?", "Hati-hati dengan tebing. Jauh jatuhnya."],
  ["They say a princess lives on this mountain.", "Mist again. I can't see my own hand.", "Who leaves gold on a mountain top?", "Mind the ledges. Long way down."],
);
many(
  "bark.idle.penjara",
  [
    "Lembap di bawah sini meresap sampai ke tulangku.",
    "Setiap malam banduan menyanyi. Setiap malam tanpa gagal.",
    "Simpan kunci di tali pinggang. Jangan sekali-kali di paku.",
    "Tukang perahu tua itu masih enggan bercakap.",
    "Air menitis sepanjang malam. Boleh buat aku gila.",
    "Tikus dalam sel ini lebih besar daripada kucing.",
    "Minyak pelita dijatah lagi. Dijatah!",
    "Longkang ini lebih busuk daripada pelabuhan.",
    "Tiga hari tanpa matahari. Aku lupa hari apa sekarang.",
    "Kalau seorang daripada mereka terlepas, kapten akan menyiat kulit kita.",
  ],
  [
    "The damp gets into my bones down here.",
    "Every night the prisoners sing. Every single night.",
    "Keep the keys on your belt. Never on a nail.",
    "That old boatwright still won't talk.",
    "Water drips all night. It will drive me mad.",
    "Rats bigger than cats in these cells.",
    "Lantern oil rationed again. Rationed!",
    "The drain stinks worse than the harbour.",
    "Three days without sun. I forget what day it is.",
    "If one of them gets loose, the captain will have our hides.",
  ],
);
many(
  "bark.idle.masjid",
  [
    "Perintahnya, biarkan halaman masjid itu. Aku tak kisah.",
    "Setiap pembawa pesanan di bandar ini diperiksa malam ini.",
    "Awasi lorong dan pantai. Sepucuk surat akan dihantar dengan perahu.",
    "Penjaga tua itu sudah beberapa hari tak keluar.",
    "Waktu senja di sini sunyi. Terlalu sunyi.",
    "Tiada sesiapa melepasi jalan besar tanpa diperhatikan.",
  ],
  [
    "Orders are to leave the masjid yard alone. Fine by me.",
    "Every messenger in the town gets searched tonight.",
    "Watch the lanes and the shore. A letter will go out by boat.",
    "The old caretaker has not come out in days.",
    "It is quiet here at dusk. Too quiet.",
    "Nobody gets past the main street without being looked at.",
  ],
);
many(
  "bark.idle.kota",
  [
    "Perintah Capitão-mor: pintu gerbang dipalang pada loceng petang.",
    "Gandakan kawalan di tembok utara malam ini.",
    "Majlis bersidang di menara utama sehingga pelita malap. Jangan biarkan apa-apa mengganggunya.",
    "Pengawal, lapor. Ada apa-apa di batu-batu itu?",
    "Seorang Melayu dilihat di tebing barat waktu senja. Perhatikan batu-batu, bukan jalan sahaja.",
    "Katanya pintu kecil di tembok barat pernah dibiarkan tidak berpalang. Periksa sekali lagi.",
    "Tiada sesiapa memanjat bumbung menara tanpa meterai Capitão.",
    "Gabenor mahu bilangan penuh meriam sebelum pagi.",
    "Kalau peta perang hilang, setiap orang di tembok ini akan menjawabnya.",
    "Kekal di pos. Pengganti datang pada loceng ketiga.",
  ],
  [
    "Orders of the Capitão-mor: the gate is barred at the evening bell.",
    "Double the watch on the north wall tonight.",
    "The council sits in the keep until the lamps burn low. Let nothing disturb it.",
    "Sentinel, report. Anything on the rocks?",
    "A Malay was seen by the west crag at dusk. Watch the stones, not only the road.",
    "They say a postern in the west wall was once left unbarred. Check it again.",
    "No one climbs to the keep roof without the Capitão's seal.",
    "The Governor wants a full count of the guns by morning.",
    "If the war map is lost, every man on this wall will answer for it.",
    "Hold your post. The relief comes at the third bell.",
  ],
);

// Gua Lanun: pirates, not soldiers
many(
  "bark.own.gualanun.idle",
  [
    "Aduh, lembap ini meresap sampai ke tulang.",
    "Kira semula tong-tong itu, lah.",
    "Ketua kata kita belayar pada air pasang berikutnya.",
    "Jauhkan obor dari serbuk bedil, bodoh.",
    "Dalam sini sejuk, di luar panas. Siapa pilih gua ini?",
    "Tuan Laut akan menyiat kita kalau sebuah tong pun hilang.",
    "Yang aku bau hanya ikan dan asap.",
    "Lenganku masih sengal sejak prahu yang lalu itu.",
    "Syhh. Di sini air pun mendengar.",
    "Tiada siapa menjumpai Gua Lanun. Tiada siapa.",
    "Perak Pahang itu berat, tapi belum cukup berat.",
  ],
  [
    "Aduh, the damp gets into my bones.",
    "Count the casks again, lah.",
    "The chief says we sail on the next tide.",
    "Keep the torch away from the powder, bodoh.",
    "Cold in here, hot outside. Who chose this cave?",
    "Tuan Laut will skin us if one cask is missing.",
    "All I smell is fish and smoke.",
    "My arm still aches from that last prahu.",
    "Hush. Even the water listens in here.",
    "Nobody finds Gua Lanun. Nobody.",
    "Pahang silver is heavy, but not heavy enough.",
  ],
);
many(
  "bark.own.gualanun.suspicious",
  ["Siapa tu?", "Eh, siapa di situ?", "Air tadi bergerak ke?", "Ada yang memijak batu.", "Tikus lagi, harap-harap.", "Tunjukkan diri, lah."],
  ["Siapa tu?", "Eh, who's there?", "Did the water move?", "Something stepped on a stone.", "Tikus again, I hope.", "Show yourself, lah."],
);
many(
  "bark.own.gualanun.alert",
  ["Musuh! Penceroboh!", "Serang hendap! Keluarkan pedang!", "Lanun, awas!", "Jangan biar dia sampai ke air!", "Orang asing! Sini!"],
  ["Musuh! Intruder!", "Ambush! Swords out!", "Lanun, awas!", "Don't let him reach the water!", "Orang asing! Here!"],
);
many(
  "bark.own.gualanun.search",
  ["Dia masih dalam gua!", "Periksa belakang peti, lah.", "Angkat obor tinggi-tinggi! Cari di penjuru.", "Berpecah, cari dia.", "Dia tak boleh berenang melepasi dermaga."],
  ["He's still in the cave!", "Check behind the crates, lah.", "Torches high! Look in the corners.", "Spread out, cari dia.", "He can't swim past the dock."],
);
many(
  "bark.own.gualanun.giveup",
  ["Tiada apa-apa. Balik ke pos masing-masing.", "Hanya gema gua.", "Hantu laut, mungkin. Sambung kerja.", "Aiyo, mataku. Tak ada apa pun.", "Tak ada apa-apa."],
  ["Nothing. Back to your posts.", "Only the cave echoing.", "Hantu laut, maybe. Back to work.", "Aiyo, my eyes. Nothing there.", "Tak ada apa-apa."],
);
many(
  "bark.own.gualanun.body",
  ["Mati! Ada orang mati di sini!", "Tuan! Rahim dibunuh orang!", "Dia sudah sejuk. Tiup kerang!"],
  ["Mati! A man dead here!", "Tuan! Someone has killed Rahim!", "He's cold. Sound the conch!"],
);
many("bark.own.gualanun.blind", ["Mata aku! Lada!", "Aku tak nampak, aduh!", "Pedihnya!"], ["Mata aku! Pepper!", "I can't see, aduh!", "It burns!"]);
many("bark.own.gualanun.stunned", ["Aduh, kepala aku...", "Apa tu?"], ["Aduh, my head...", "Apa tu?"]);

// ---------------------------------------------------------------- Kitab (kitab.ts, Kitab.tsx)

D["kitab.kind.fakta"] = ["Fakta", "Fact"];
D["kitab.kind.legenda"] = ["Legenda", "Legend"];
D["kitab.kind.rekaan"] = ["Rekaan", "Fiction"];
D["kitab.kindNote.fakta"] = ["Sejarah yang disahkan sumber", "History confirmed by sources"];
D["kitab.kindNote.legenda"] = ["Cerita lisan, bukan sejarah yang terjamin", "Oral tradition, not guaranteed history"];
D["kitab.kindNote.rekaan"] = ["Rekaan untuk permainan", "Invented for the game"];
D["kitab.sumber"] = ["Sumber", "Sources"];
D["kitab.notWritten"] = ["Belum ditulis", "Not written yet"];
D["kitab.count"] = ["{n} daripada {total}", "{n} of {total}"];
D["kitab.pagesOf"] = ["daripada {total} halaman telah ditulis", "of {total} pages written"];
D["kitab.sec.places.name"] = ["Tempat", "Tempat"];
D["kitab.sec.places.sub"] = ["Tempat yang dikunjungi", "Places reached"];
D["kitab.sec.charms.name"] = ["Tangkal", "Tangkal"];
D["kitab.sec.charms.sub"] = ["Tangkal yang ditemui", "Amulets found"];
D["kitab.sec.tales.name"] = ["Hikayat", "Hikayat"];
D["kitab.sec.tales.sub"] = ["Misi yang selesai", "Missions completed"];
D["kitab.sec.pantun.name"] = ["Pantun", "Pantun"];
D["kitab.sec.pantun.sub"] = ["Kata laluan yang terdengar", "Passwords overheard"];
D["kitab.sec.ghaib.name"] = ["Ghaib", "Ghaib"];
D["kitab.sec.ghaib.sub"] = ["Alam yang tidak kelihatan", "The unseen"];
D["kitab.hint.charm"] = ["Tersembunyi di {level}", "Hidden on {level}"];
D["kitab.hint.charmAny"] = ["Tersembunyi dalam salah satu misi", "Hidden on a mission"];
D["kitab.hint.mission"] = ["Selesaikan {level}", "Complete {level}"];

const place = (id: string, title: Pair, hint: Pair, text: Pair) => {
  D[`kitab.place.${id}.title`] = title;
  D[`kitab.place.${id}.hint`] = hint;
  D[`kitab.place.${id}.text`] = text;
};
place(
  "jeti",
  ["Jeti pelabuhan", "The harbour jetty"],
  ["Di tepi laut", "Down by the sea"],
  [
    "Tempat bandar bertemu Selat. Sampan ditambat di sini waktu senja, dan seorang pendekar yang sampai ke hujung papan boleh lesap sebelum penggera dibunyikan.",
    "Where the town meets the Straits. Sampans tie up here at dusk, and a pendekar who reaches the end of the boards can be gone before the alarm is raised.",
  ],
);
place(
  "pelabuhan",
  ["Bandar Melaka", "Bandar Melaka"],
  ["Bandar pelabuhan", "The harbour town"],
  [
    "Bumbung atap berhimpit di atas lorong, gerai di bawah cucur atap, dan kini sebuah kubu meriam Portugis di jambatan. Bumbung ialah jalan bagi sesiapa yang cukup ringan untuk berlari di atasnya.",
    "Atap roofs packed close above the lanes, stalls under the eaves, and now a Portuguese battery at the bridge. Roofs are roads to anyone light enough to run them.",
  ],
);
place(
  "sungai",
  ["Sungai", "The river"],
  ["Antara pelabuhan dan kampung hulu", "Between the harbour and the upper kampung"],
  [
    "Air keruh yang tiada siapa berani redah. Jambatan yang dikawal ialah jalan mudah untuk menyeberang; titian papan yang sempit di tebing barat ialah jalan yang senyap.",
    "Brown water nobody wades. The guarded bridge is the easy way over; the narrow plank on the west bank is the quiet one.",
  ],
);
place(
  "kampung-hulu",
  ["Kampung Hulu", "Kampung Hulu"],
  ["Hulu sungai, selepas jambatan", "Upriver, past the bridge"],
  [
    "Kampung di hulu, sekitar balai penghulu. Rumah-rumahnya berdiri di atas tiang, dan gelap di bawah lantai cukup luas untuk merangkak.",
    "The upper kampung around the penghulu's hall. Houses stand on stilts, and the dark under the floors is room enough to crawl.",
  ],
);
place(
  "hutan",
  ["Hutan", "The hutan"],
  ["Di seberang pagar utara kampung", "Beyond the kampung's north fence"],
  [
    "Hutan tua di utara kampung. Denainya sedikit dan paku pakisnya tebal; pengakap yang tersasar dari denai mudah sesat, dan mudah ditemui.",
    "Old jungle north of the kampung. The trails are few and the ferns are deep; a scout who strays from the path is easy to lose, and easy to find.",
  ],
);
place(
  "kem",
  ["Perkhemahan pengakap", "The scouts' camp"],
  ["Tanah lapang jauh di dalam hutan", "A clearing deep in the hutan"],
  [
    "Sebuah perkhemahan Portugis di tanah lapang, dengan peta denai hutan dijemur di tepi unggun api. Mereka bercadang menyerang Melaka dari belakang.",
    "A Portuguese camp in a clearing, maps of the jungle trails drying by the fire. They mean to come at Malacca from behind.",
  ],
);
place(
  "ledang",
  ["Gunung Ledang", "Gunung Ledang"],
  ["Gunung di utara", "The mountain to the north"],
  [
    "Gunung yang dikaitkan dengan legenda puterinya, yang dikatakan telah menetapkan hantaran yang mustahil kepada seorang sultan. Tebing-tebingnya mendaki berperingkat ke dalam kabus.",
    "The mountain of the legend of its puteri, who is said to have set a sultan impossible gifts as her bride price. Its ledges climb in tiers into the mist.",
  ],
);
place(
  "kolam",
  ["Kolam di kaki air terjun", "The pool below the falls"],
  ["Di kaki gunung, dekat air yang jatuh", "At the foot of the mountain, by falling water"],
  [
    "Kolam yang dalam dan sejuk di bawah air terjun. Bunyi air melindungi tapak kaki, dan nafas yang ditahan melindungi selebihnya.",
    "A deep, cold pool under the falls. The noise of the water covers footsteps, and a held breath covers the rest.",
  ],
);
place(
  "puncak",
  ["Tempat persembahan di puncak", "The summit shrine"],
  ["Setinggi mana gunung itu mendaki", "As high as the mountain goes"],
  [
    "Sebuah tempat persembahan kecil di atas awan, tempat sajian diletakkan. Tepak sireh emas itu pernah terletak di atas pelantarnya sebelum para askar datang.",
    "A small shrine above the clouds where offerings are left. The golden tepak sireh sat on its altar before the soldiers came.",
  ],
);
place(
  "halaman-penjara",
  ["Halaman penjara", "The penjara yard"],
  ["Di bawah tembok kota, di luar pintu", "Below the fort wall, outside the gate"],
  [
    "Halaman bertembok berlantai tanah padat, tempat pengawal bertukar giliran. Sebuah pintu dan pintu belakang penjaga penjara menuruni ke sel, dan tiada apa tumbuh di sini selain jerami.",
    "A walled yard of packed earth where the guard is changed. One gate and the jailer's back door lead down to the cells, and nothing grows here but straw.",
  ],
);
place(
  "sel",
  ["Sel-sel", "The cells"],
  ["Di bawah sana yang lembap, selepas pintu", "Down in the damp, past the gate"],
  [
    "Batu dan jerami, dengan air mengalir di dinding dan sebuah pelita pada setiap sudut yang kedua. Lorongnya hanya cukup lebar untuk dua orang, dan di belakang sel terakhir sebuah parit lama masih mengalir ke sungai.",
    "Stone and straw, with water running down the walls and a lantern at every second corner. The corridors are only wide enough for two men, and somewhere behind the last cell an old drain still runs to the river.",
  ],
);
place(
  "masjid",
  ["Masjid lama", "The old masjid"],
  ["Di dalam tembok rendah, di tengah bandar", "Inside the low wall, in the heart of the town"],
  [
    "Sebuah masjid kayu di bawah tiga tingkat bumbung atap, dengan serambi di hadapannya dan rumah beduk di penjuru halaman yang tenang. Para askar tidak memasuki halaman itu, begitu juga setiap bilah senjata.",
    "A timber masjid under three stacked atap roofs, a verandah at its front and a beduk house in the corner of a quiet yard. The soldiers keep out of the yard, and so does every blade.",
  ],
);
place(
  "kolam-masjid",
  ["Kolam wuduk", "The washing pond"],
  ["Di pintu selatan masjid", "By the south gate of the masjid"],
  [
    "Kolam yang tenang bertepi batu, disediakan untuk berwuduk sebelum beribadah. Walaupun waktu senja, airnya jernih.",
    "A still pond with a stone ledge, kept for washing before worship. Even at dusk the water is clear.",
  ],
);
place(
  "kota-bukit",
  ["Batu-batan di bawah Kota", "The rocks below the Kota"],
  ["Di bawah tembok kota", "Under the fortress walls"],
  [
    "Longgokan batu dan duri yang mendaki ke tembok barat. Para pengawal memerhati jalan; mereka tidak pernah belajar memerhati batu-batu.",
    "A tumble of rock and thorn running up to the west wall. The sentries watch the road; they have never learned to watch the stones.",
  ],
);
place(
  "kota-halaman",
  ["Halaman Kota", "The Kota courtyard"],
  ["Di dalam tembok kota", "Inside the fortress walls"],
  [
    "Sebuah perigi, berek yang tidak pernah tidur, sebuah gudang senjata, dan menara utama setinggi tiga tingkat. Segala yang di dalam tembok memandang ke luar, dan tiada siapa terfikir memandang ke bumbung.",
    "A well, a barracks that never sleeps, an armoury, and a keep three storeys high. Everything inside the walls looks outward, and no one thinks to look at the roofs.",
  ],
);
place(
  "kota-kubu",
  ["Bumbung menara utama", "The keep roof"],
  ["Puncak menara utama", "The top of the keep"],
  [
    "Bumbung rata di bawah bintang dan sebuah meja dengan peta majlis, ditindih sebilah belati dan sebuah pelita. Dari sini tembok laut hanya sekali lompat dan jeti hanya sekali jatuh yang panjang.",
    "A flat roof under the stars and a table with the council's map, weighted down by a dagger and a lantern. From here the sea wall is one jump and the jetty one long fall.",
  ],
);
place(
  "gua-lorong",
  ["Celah ke Gua Lanun", "The cleft to Gua Lanun"],
  ["Rekahan batu, jauh di timur", "A crack in the rock, far to the east"],
  [
    "Alur di antara bukit yang cukup lebar untuk seorang lelaki dan bayangnya. Ia berliku lima kali sebelum terbuka, dan para lanun menyukainya begitu: tiada siapa mendakinya dengan pantas, dan tiada siapa keluar tanpa dilihat.",
    "A seam in the hills just wide enough for a man and his shadow. It turns five times before it opens, and the lanun like it so: nobody comes up it quickly, and nobody leaves it unseen.",
  ],
);
place(
  "gua-lanun",
  ["Gua Lanun", "Gua Lanun"],
  ["Di bawah bukit, tempat laut masuk", "Under the hills, where the sea comes in"],
  [
    "Sebuah gua tempat air pasang masuk melalui lorong yang tenggelam dan memenuhi lagun yang hitam. Sampan berlanggar di dermaga lanun, dan cahaya obor pada batu yang basah ialah satu-satunya yang bergerak.",
    "A cavern where the tide runs in through a flooded passage and fills a black lagoon. Sampans knock together at the lanun's dock, and torchlight on wet rock is the only thing that moves.",
  ],
);

const charm = (id: string, text: Pair) => (D[`kitab.charm.${id}`] = text);
charm("harimau", [
  "Diukir daripada kuku seekor harimau yang bertahun-tahun menjelajah lorong pelabuhan tanpa pernah dilihat. Pakailah, dan papan lantai akan melupakanmu.",
  "Carved from the claw of a tiger that walked the harbour lanes for years without being seen. Wear it and the floorboards forget you.",
]);
charm("kancil", [
  "Sang kancil memperdaya buaya dan harimau dalam setiap cerita. Yang ini cukup kecil untuk kau lupa kau memakainya, dan begitu juga para pengawal.",
  "The mousedeer outwits the crocodile and the tiger in every tale. This one is small enough to forget you are wearing it, and so do the guards.",
]);
charm("besi", [
  "Besi daripada bilah yang patah, diikat dengan loyang. Kata tukang besi, semangat sebilah bilah kekal dalam besinya, dan ia lebih senang berdekatan bilah-bilah lain.",
  "Iron from a broken blade, bound in brass. Smiths say a blade's spirit stays in its iron, and it is happier near other blades.",
]);
charm("buaya", [
  "Sebatang taring buaya pada seutas tali. Buaya menunggu di bawah air selama mana yang perlu.",
  "A crocodile's tooth on a cord. The buaya waits under the water for as long as it must.",
]);
charm("merpati", [
  "Sehelai bulu merpati kelabu yang diikat dengan benang, ditemui di tempat lorong-lorong sunyi. Merpati bersarang di cucur atap lama dan tidak terkejut mendengar tapak kaki yang dikenalinya.",
  "A grey dove's feather bound in thread, found where the lanes run quiet. Doves nest in old eaves and do not startle at footsteps they know.",
]);
charm("puteri", [
  "Seutas benang emas yang dikatakan daripada selendang puteri sendiri, ditinggalkan di gunung. Luka sembuh sedikit lebih cepat di dekatnya.",
  "A thread of gold said to be from the puteri's own sash, left on the mountain. Wounds close a little faster near it.",
]);
charm("rantai", [
  "Satu mata rantai banduan, licin dimamah gelap. Ia pernah mengikat orang yang tidak sepatutnya diikat, dan ia tahu cara melepaskan: bilah yang ditepis ditepis seketika lebih lama.",
  "One link of a prisoner's chain, worn smooth in the dark. It has held men who should never have been held, and it remembers how to let go: a blade turned aside is turned a moment longer.",
]);

const mission = (id: string, title: Pair, text: Pair) => {
  D[`kitab.mission.${id}.title`] = title;
  D[`kitab.mission.${id}.text`] = text;
};
mission(
  "harbour",
  ["Kapitan", "The Kapitan"],
  [
    "Setelah Kapitan tiada, kubu meriam itu sepi selama tiga malam. Namun seseorang telah memberitahu orang Portugis tepat di mana hendak meletakkannya.",
    "With the Kapitan gone the battery sat silent for three nights. Someone, though, had told the Portuguese exactly where to put it.",
  ],
);
mission(
  "kampung",
  ["Kerani itu", "The clerk"],
  [
    "Kerani itu dibayar perak untuk sesalinan pelan kubu meriam. Di mana dia menyimpan salinan itu, tidak pernah dikatakannya.",
    "The clerk was paid in silver for a copy of the battery's plans. Where he kept the copy, he never said.",
  ],
);
mission(
  "plans",
  ["Pelan-pelan itu", "The plans"],
  [
    "Pelan-pelan itu kembali dalam sebuah peti dari bawah balai penghulu, dan tiada seorang pun di kampung tahu ia pernah hilang.",
    "The plans came back in a chest from under the penghulu's hall, and nobody in the kampung ever knew they had been gone.",
  ],
);
mission(
  "jungle",
  ["Para pengakap", "The scouts"],
  [
    "Tanpa kapten mereka, para pengakap kehilangan denai yang telah mereka petakan. Jalan masuk dari hutan tertutup, buat masa ini.",
    "Without their captain the scouts lost the trails they had mapped. The way in from the hutan is closed, for now.",
  ],
);
mission(
  "ledang",
  ["Tepak sireh", "The tepak sireh"],
  [
    "Tepak sireh itu kembali di pelantar puncak. Kabus turun semula di belakangmu, seolah-olah gunung itu telah menunggu.",
    "The betel box is back on the summit altar. The mist came down again behind you, as if the mountain had been waiting.",
  ],
);
mission(
  "wayang",
  ["Wayang kulit", "The shadow play"],
  [
    "Dalang menyimpan patung Pendekar dalam kotaknya sendiri. Katanya patung itu bergerak di atas kelir sebelum dia menyentuh tangkainya.",
    "The dalang keeps the Pendekar's puppet in a box of its own. He says it moves on the kelir before he touches the rods.",
  ],
);
mission(
  "penjara",
  ["Sel yang kosong", "The empty cell"],
  [
    "Pada loceng pagi, penjaga penjara bersumpah pintunya masih berkunci. Di dalam parit, para askar menemui tapak kaki yang basah, sebuah kopiah tukang perahu, dan tiada sesiapa untuk ditanya.",
    "At the morning bell the jailer swore the door was still locked. Down in the drain the soldiers found wet footprints, a boatwright's cap, and no one to ask.",
  ],
);
mission(
  "masjid",
  ["Warkah", "The warkah"],
  [
    "Surat itu meninggalkan bandar berlipat dalam kain minyak, dan tiada seorang askar pun melangkah tembok masjid untuk bertanya di mana ia disimpan. Penjaga masjid masih menyapu halaman setiap pagi.",
    "The letter left the town folded in oilcloth, and not one soldier ever crossed the masjid's wall to ask where it had been kept. The penjaga still sweeps the yard each morning.",
  ],
);
mission(
  "kota",
  ["Peta perang", "The war map"],
  [
    "Peta itu sampai kepada tetua berbalut kain basah. Kata orang, Capitão-mor mengira tembok dua kali malam itu, dan tidak sekali pun memandang ke arah laut.",
    "The map reached the elder wrapped in wet cloth. They say the Capitão-mor counted the walls twice that night, and never once looked at the sea.",
  ],
);
mission(
  "gualanun",
  ["Ufti", "The tribute"],
  [
    "Peti itu pulang dengan meterai Sultan masih di atas lilin. Para lanun bercerita tentang bayang yang melintasi cahaya obor mereka dua kali, dan ketua mereka berkata itu hanyalah air pasang.",
    "The casket came home with the Sultan's seal still on the wax. The lanun tell of a shadow that crossed their torchlight twice, and the chief says it was only the tide.",
  ],
);

// ---------------------------------------------------------------- tangkal, ilmu, alat (amulets.ts, skills.ts, tools.ts)

D["amulet.harimau.desc"] = ["Bunyi tapak kaki 20% lebih perlahan", "Footsteps 20% quieter"];
D["amulet.kancil.desc"] = ["Pengawal mengambil masa sedikit lebih lama untuk mengesanmu", "Guards take a little longer to spot you"];
D["amulet.besi.desc"] = ["Bawa 2 pisau lempar tambahan", "Carry 2 more throwing knives"];
D["amulet.buaya.desc"] = ["Tahan nafas 50% lebih lama", "Hold your breath half again as long"];
D["amulet.puteri.desc"] = ["Nyawa mula pulih 2 s lebih awal", "Health starts coming back 2 s sooner"];
D["amulet.rantai.desc"] = ["Ruang masa untuk menangkis 20% lebih luas", "Parry window 20% wider"];
D["amulet.merpati.desc"] = ["Ruang masa untuk menangkis suku lebih luas", "A quarter longer to catch a parry"];

D["skill.branch.bayang.name"] = ["Bayang", "Bayang"];
D["skill.branch.bayang.sub"] = ["Senyap", "Shadow"];
D["skill.branch.silat.name"] = ["Silat", "Silat"];
D["skill.branch.silat.sub"] = ["Pertarungan", "Combat"];
D["skill.branch.helang.name"] = ["Helang", "Helang"];
D["skill.branch.helang.sub"] = ["Serangan jauh", "Eagle"];
const skill = (id: string, name: Pair, desc: Pair) => {
  D[`skill.${id}.name`] = name;
  D[`skill.${id}.desc`] = desc;
};
skill("langkah-kucing", ["Langkah kucing", "Langkah kucing"], ["Bunyi tapak kaki merambat 40% kurang jauh", "Footsteps carry 40% less far"]);
skill("bayang-senja", ["Bayang senja", "Bayang senja"], ["Pengawal mengambil masa sepertiga lebih lama untuk mengesanmu", "Guards take a third longer to spot you"]);
skill("nafas-panjang", ["Nafas panjang", "Nafas panjang"], ["Tahan nafas 75% lebih lama di bawah air", "Hold your breath 75% longer under water"]);
skill("tangkis-tajam", ["Tangkis tajam", "Tangkis tajam"], ["Masa untuk menangkis 50% lebih panjang", "Half again as long to catch a parry"]);
skill("kebal", ["Kebal", "Kebal"], ["Tambah satu mata nyawa", "One more point of health"]);
skill("pulih", ["Pulih", "Pulih"], ["Nyawa mula pulih selepas 3 s, bukan 6 s", "Health starts coming back after 3 s instead of 6 s"]);
skill("pisau-tambahan", ["Pisau tambahan", "Pisau tambahan"], ["Bawa 3 pisau lempar tambahan", "Carry 3 more throwing knives"]);
skill("pisau-berat", ["Pisau berat", "Pisau berat"], ["Pisau melumpuhkan pengawal selama 9 s, bukan 5 s", "A knife stuns for 9 s instead of 5 s"]);
skill("sambar", ["Sambar", "Sambar"], ["Melompat ke atas pengawal dari jarak sehingga 10 m, bukan 7 m", "Leap onto a guard from up to 10 m instead of 7 m"]);

D["tool.knife.name"] = ["Pisau lempar", "Pisau lempar"];
D["tool.knife.desc"] = [
  "Melumpuhkan pengawal yang terkena; jika tersasar, bunyinya berdenting dan menarik pengawal ke situ",
  "Stuns the guard it hits; a miss clatters and draws guards to it",
];
D["tool.stone.name"] = ["Batu", "Batu"];
D["tool.stone.desc"] = [
  "Batu yang dilontar: pengawal dalam jarak 14 m dari tempat ia jatuh akan pergi memeriksa",
  "A thrown stone: guards within 14 m of where it lands go and look",
];
D["tool.pepper.name"] = ["Serbuk lada", "Serbuk lada"];
D["tool.pepper.desc"] = [
  "Serbuk lada ke muka: membutakan setiap pengawal dalam jarak 4.5 m, malah dalam pertarungan",
  "Pepper in the face: blinds every guard within 4.5 m, even in a fight",
];

// ---------------------------------------------------------------- pantun (pantun.ts, PantunChoice.tsx)

const pantunTitle = (id: string, t: Pair) => (D[`pantun.title.${id}`] = t);
pantunTitle("bangau", ["Bangau ke hulu", "The egret upriver"]);
pantunTitle("kolek", ["Perahu di Kuala Linggi", "The boat at Kuala Linggi"]);
pantunTitle("rusa", ["Anak rusa di tepi kali", "The fawn by the stream"]);
pantunTitle("pelita", ["Pelita di anjung", "The lamp on the porch"]);
pantunTitle("nelayan", ["Nelayan di waktu petang", "The fisherman at dusk"]);
pantunTitle("kabus", ["Kabus di gunung", "Mist on the mountain"]);

D["pantun.sentry.jambatan"] = ["jambatan", "the bridge"];
D["pantun.sentry.pagar"] = ["pintu pagar utara kampung", "the kampung's north gate"];
D["pantun.sentry.denai"] = ["denai lama ke Gunung Ledang", "the old trail to Gunung Ledang"];
D["pantun.sentry.tangga"] = ["tangga pertama Gunung Ledang", "the first stair of Gunung Ledang"];
D["pantun.where.bangau"] = ["lorong barat pelabuhan", "the harbour's west lanes"];
D["pantun.where.kolek"] = ["lorong timur pelabuhan", "the harbour's east lanes"];
D["pantun.where.rusa"] = ["pasar kampung", "the kampung market"];
D["pantun.where.pelita"] = ["rumah-rumah di tenggara kampung", "the kampung's south-east houses"];
D["pantun.where.nelayan"] = ["denai hutan ke air terjun", "the hutan trail to the falls"];
D["pantun.where.kabus"] = ["kaki Gunung Ledang", "the foot of Gunung Ledang"];
D["pantun.hint.heard"] = ["Terdengar di {where}", "Overheard in {where}"];
D["pantun.hint.somewhere"] = ["Terdengar entah di mana", "Overheard somewhere"];
D["pantun.ui.aria"] = ["Jawab pantun", "Answer the pantun"];
D["pantun.ui.where"] = ["Penjaga pintu di {where}", "Gatekeeper at {where}"];
D["pantun.ui.known"] = ["Pernah didengar", "Overheard"];
D["pantun.ui.help"] = ["1-4 atau W / S dan E untuk menjawab · X untuk berundur", "1-4 or W / S and E to answer · X to step back"];

// ---------------------------------------------------------------- ghaib (ghaib.ts)

many(
  "ghaib.whisper.suci",
  [
    "Engkau lalu bagai kabus di atas padi. Sehelai daun pun tidak tercalar. Jejakilah lorong-lorongku bila-bila masa engkau mahu.",
    "Tiada darah, tiada jeritan. Kelip-kelip pun tidak berhenti berkelip. Aku senang denganmu.",
    "Kata orang bunian, sesusuk bayang melintasi kampung mereka dan membiarkan sireh mereka tidak terusik. Bayang itu ialah engkau.",
  ],
  [
    "You passed like mist over the padi. Not one leaf was bruised. Walk my paths whenever you wish.",
    "No blood, no shout. Even the kelip-kelip did not stop their blinking. I am pleased with you.",
    "The bunian say a shadow crossed their kampung and left the sirih untouched. That shadow was you.",
  ],
);
many(
  "ghaib.whisper.berkenan",
  [
    "Berkali-kali engkau memilih sisi pipih pisau daripada matanya yang tajam. Gunung ini mengingati kebaikan yang kecil.",
    "Ada yang melihatmu, namun engkau tetap membiarkan mereka hidup. Itu lebih sukar daripada membunuh. Aku memerhati.",
    "Tidak bersih, tetapi berbudi. Bakarlah sedikit kemenyan dan teruskan seperti yang engkau mulakan.",
  ],
  [
    "You chose the knife's flat over its edge more than once. The mountain remembers small kindnesses.",
    "Some saw you, and still you spared them. That is harder than killing. I watched.",
    "Not clean, but kind. Burn a little kemenyan and go on as you began.",
  ],
);
many(
  "ghaib.whisper.diam",
  [
    "Malam ini aku tidak berkata apa-apa. Timbanglah perbuatanmu, dan tentukan sendiri apa nilainya.",
    "Darah di satu tangan, belas kasihan di tangan yang lain. Kabus belum memilih yang mana satu hendak diselubunginya.",
    "Orang bunian menutup pintu mereka ketika engkau lalu. Bukan kerana marah. Hanya memerhati.",
  ],
  [
    "I say nothing tonight. Weigh what you did, and decide for yourself what it was worth.",
    "Blood on one hand, mercy in the other. The mist has not yet chosen which to cover.",
    "The bunian closed their doors as you passed. Not in anger. Only watching.",
  ],
);
many(
  "ghaib.whisper.murka",
  [
    "Sungai membawa hanyut apa yang engkau tinggalkan. Lorong-lorongku malap di bawah kaki seperti kakimu.",
    "Terlalu ramai yang gugur tanpa perlu. Jangan pinta cahaya daripada gunung ini.",
    "Engkau berlawan padahal boleh bersembunyi. Kemenyan berasap pahit malam ini.",
  ],
  [
    "The river carries what you left behind. My paths grow dim under feet like yours.",
    "Too many fell who did not need to. Do not ask the mountain for its light.",
    "You fought where you might have hidden. The kemenyan smokes bitter tonight.",
  ],
);
D["ghaib.change.granted"] = [
  "Restu diberikan: lorong bunian bersinar lebih terang dan Mata Helang membakar semangatmu dengan lebih perlahan.",
  "Restu granted: the bunian paths shine brighter and Mata Helang burns your semangat more slowly.",
];
D["ghaib.change.lost"] = ["Restunya ditarik balik. Lorong bunian kembali bercahaya malap seperti biasa.", "Her restu is withdrawn. The bunian paths burn at their plain light again."];
D["ghaib.change.wrath"] = ["Dia memalingkan muka: lorong bunian berkelip-kelip di bawah kakimu.", "She turns her face away: the bunian paths flicker under your feet."];
D["ghaib.change.eased"] = ["Kemarahannya reda. Lorong bunian kembali teguh.", "Her anger cools. The bunian paths hold steady again."];
D["ghaib.standing.restu"] = [
  "Buat masa ini dia berkenan kepadamu: lorong bersinar lebih terang, dan Mata Helang membakar semangatmu dengan lebih perlahan.",
  "For now she smiles on you: the paths shine brighter, and Mata Helang burns your semangat more slowly.",
];
D["ghaib.standing.none"] = ["Buat masa ini dia memerhati, tidak memberi apa-apa dan tidak mengambil apa-apa.", "For now she watches and gives nothing, and takes nothing."];
D["ghaib.standing.murka"] = ["Buat masa ini dia tidak senang: lorong berkelip-kelip, seolah-olah mungkin tidak akan bertahan.", "For now she is displeased: the paths flicker, as if they might not hold."];
D["ghaib.page.bunian.title"] = ["Jalan orang bunian", "Jalan orang bunian"];
D["ghaib.page.bunian.text"] = [
  "Di sisi setiap kampung kita, orang bunian memiliki kampung mereka sendiri, dan lorong mereka melalui tempat yang tidak dilalui lorong kita: batu pijak merentas sungai, tangga melangkahi pagar utara, anak tangga di tepi air terjun, dan titian akar mengelilingi perkhemahan pengakap. Bukalah Mata Helang dan lorong-lorong itu kelihatan keemasan pucat, dengan kelip-kelip dan asap kemenyan. Ia hanya bertahan selagi engkau memandang, dan Mata Helang membakar semangat selagi ia terbuka; engkau berjalan lebih perlahan di dunia mereka.",
  "Beside every kampung of ours the orang bunian keep one of their own, and their paths run where ours do not: stones across the river, a stair over the north fence, steps beside the falls, a vine bridge round the scouts' camp. Open Mata Helang and they show in pale gold, with fireflies and kemenyan smoke. They hold only while you look, and Mata Helang burns semangat as you do; you walk slower in their world.",
];
D["ghaib.page.bunian.hint"] = ["Selesaikan satu misi dan dengarlah puteri", "Finish a mission and hear the puteri"];
D["ghaib.page.restu.title"] = ["Restu Puteri Gunung Ledang", "Restu Puteri Gunung Ledang"];
D["ghaib.page.restu.text"] = [
  "Puteri gunung itu memerhati setiap misi. Pengawal yang dibiarkan hidup dan laluan tanpa dilihat menyenangkannya; membunuh mereka yang tidak perlu mati, dan amaran, tidak. Sasaran misi ialah tugas dan dia tidak mengiranya. {standing}",
  "The puteri of the mountain watches each mission. Guards spared and passes unseen please her; killing those who need not die, and alarms, do not. The mission's target is the task and she does not count it. {standing}",
];
D["ghaib.page.restu.hint"] = ["Biarkan dia memerhati kerjamu, misi demi misi", "Let her watch you work, mission after mission"];

// ---------------------------------------------------------------- hikayat (hikayat.ts)

const NUM_MS = ["tiada", "satu", "dua", "tiga", "empat", "lima", "enam", "tujuh", "lapan", "sembilan", "sepuluh", "sebelas", "dua belas"];
const NUM_EN = ["no", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve"];
NUM_MS.forEach((m, i) => (D[`hikayat.num.${i}`] = [m, NUM_EN[i]]));
D["hikayat.times.1"] = ["sekali", "once"];
D["hikayat.times.2"] = ["dua kali", "twice"];
D["hikayat.times.3"] = ["tiga kali", "thrice"];
D["hikayat.times.n"] = ["{n} kali", "{n} times"];
D["hikayat.and"] = ["dan", "and"];
/** Words that may lose their capital after a connective ("Maka dia..."); names and "But / Tetapi" keep theirs. */
D["hikayat.lowerable"] = [
  "Dia|Dari|Jalannya|Ditinggalkannya|Sepanjang|Segala|Satu|Dua|Tiga|Empat|Lima|Enam|Tujuh|Lapan|Sembilan|Sepuluh|Sebelas|Sekali|Seorang|Sebiji|Sebilah|Segenggam|Sebuah|Dengan|Ramailah|Kerisnya|Keris|Setitik|Di|Tiada|Menjelang|Sekilas|Malam|Perkara|Para|Merahlah|Siapakah|Pelita|Pisau|Kesemua|Akhirnya|Kemudian|Darahnya|Kerja",
  "He|His|Him|The|There|Twice|Thrice|Once|One|Two|Three|Four|Five|Six|Seven|Eight|Nine|Ten|Many|A|An|At|In|On|By|When|Not|Where|Down|Up|Into|From|Only|Even|Before|After|With|Below|Above|Some|No|None|So|Of|All|Each|Under|Over|Long|Every",
];

const cast = (id: string, who: Pair, deed: Pair, region: Pair, exit: Pair) => {
  D[`hikayat.cast.${id}.who`] = who;
  D[`hikayat.cast.${id}.deed`] = deed;
  D[`hikayat.cast.${id}.region`] = region;
  D[`hikayat.cast.${id}.exit`] = exit;
};
cast(
  "harbour",
  ["Kapitan itu", "the Kapitan"],
  ["menyenyapkan Kapitan di kubu meriam jambatan", "silence the Kapitan of the bridge battery"],
  ["Bandar Melaka", "Bandar Melaka"],
  ["jeti pelabuhan", "the harbour jetty"],
);
cast(
  "kampung",
  ["kerani pembelot itu", "the turncoat clerk"],
  ["mencari kerani yang telah menjual pelan kubu meriam demi perak", "find the clerk who had sold the battery plans for silver"],
  ["Kampung Hulu", "Kampung Hulu"],
  ["jeti sungai", "the river jetty"],
);
cast(
  "plans",
  ["peti pelan itu", "the chest of plans"],
  ["merampas semula pelan kubu meriam dari bawah balai penghulu", "take back the battery plans from under the penghulu's hall"],
  ["Kampung Hulu", "Kampung Hulu"],
  ["jeti sungai", "the river jetty"],
);
cast(
  "jungle",
  ["ketua pengakap itu", "the scout captain"],
  ["mencari ketua pengakap di perkhemahannya dalam hutan", "find the captain of the scouts in his jungle camp"],
  ["hutan", "the hutan"],
  ["jeti sungai", "the river jetty"],
);
cast(
  "ledang",
  ["tepak sireh emas itu", "the golden tepak sireh"],
  ["membawa keluar tepak sireh emas dari tangan para askar", "bring the golden tepak sireh out of the soldiers' hands"],
  ["Gunung Ledang", "Gunung Ledang"],
  ["kolam di kaki air terjun", "the pool below the falls"],
);
cast(
  "penjara",
  ["Pak Long Hasan", "Pak Long Hasan"],
  ["membebaskan Pak Long Hasan, tukang perahu tua itu, dari sel di bawah kota", "free Pak Long Hasan, the old boatwright, from the cells under the fort"],
  ["penjara", "the penjara"],
  ["parit lama menuju sungai", "the old drain to the river"],
);
cast(
  "masjid",
  ["warkah bermeterai itu", "the sealed warkah"],
  [
    "membawa warkah bermeterai milik penjaga masjid keluar dari bandar kepada tukang perahu sang utusan",
    "carry the penjaga's sealed warkah out of the town to the envoy's boatman",
  ],
  ["lorong-lorong sekitar masjid lama", "the lanes round the old masjid"],
  ["jeti pelabuhan", "the harbour jetty"],
);
cast(
  "wayang",
  ["patung Kapitan itu", "the Kapitan's puppet"],
  ["menyenyapkan patung Kapitan di tepi perigi", "silence the Kapitan's puppet by the well"],
  ["pentas wayang", "the shadow-play stage"],
  ["jalan keluar", "the way out"],
);
cast(
  "kota",
  ["peta perang itu", "the council's war map"],
  ["memanjat menara utama dan mengambil peta perang majlis", "climb the keep and take the council's war map"],
  ["Kota Batu", "Kota Batu"],
  ["tembok di tepi laut", "the sea wall"],
);
cast(
  "gualanun",
  ["peti emas Sultan itu", "the Sultan's gold casket"],
  ["mengambil peti emas Sultan dari tebing ketua lanun", "take the Sultan's gold casket from the lanun chief's ledge"],
  ["Gua Lanun", "Gua Lanun"],
  ["pintu air di tebing timur lagun", "the water gate on the lagoon's east shore"],
);
D["hikayat.cast.default.who.steal"] = ["hadiah itu", "the prize"];
D["hikayat.cast.default.who.kill"] = ["lelaki yang dicarinya", "the man he sought"];
D["hikayat.cast.default.exit"] = ["jalan keluar", "the way out"];

D["hikayat.dusk.ledang"] = ["ketika kabus tebal menyelubungi gunung", "when the mist lay thick on the mountain"];
D["hikayat.dusk.jungle"] = ["ketika hutan riuh dengan bunyi serangga", "when the hutan was loud with insects"];
D["hikayat.dusk.default"] = ["ketika pelita dinyalakan di sepanjang lorong", "when the lamps were lit along the lanes"];

many(
  "hikayat.open.target.steal",
  [
    "Adapun {who} sudah pun berada di tangannya, dan yang tinggal bagi pendekar itu hanyalah jalan menuju {exit}.",
    "Sebermula, kerja itu sudah separuh selesai: {who} telah diambil, dan pendekar itu belum lagi sampai ke {exit} dengan selamat.",
  ],
  [
    "Adapun {who} was already in his hands, and there remained to the pendekar only the road to {exit}.",
    "Sebermula, the work was half done: {who} was taken, and the pendekar had yet to reach {exit} alive.",
  ],
);
many(
  "hikayat.open.target.kill",
  [
    "Adapun {who} sudah pun terbujur kaku, dan yang tinggal bagi pendekar itu hanyalah jalan menuju {exit}.",
    "Sebermula, kerja itu sudah separuh selesai: {who} terbujur diam, dan pendekar itu belum lagi sampai ke {exit} dengan selamat.",
  ],
  [
    "Adapun {who} was already dead, and there remained to the pendekar only the road to {exit}.",
    "Sebermula, the work was half done: {who} lay still, and the pendekar had yet to reach {exit} alive.",
  ],
);
many(
  "hikayat.open.start",
  [
    "Sebermula, pada zaman kapal-kapal Portugis berlabuh di perairan Melaka, seorang pendekar diutus untuk {deed}.",
    "Alkisah, diceritakan bahawa {dusk}, pendekar itu keluar ke {region} untuk {deed}.",
    "Adapun pendekar itu, setelah menerima amanah daripada tetua, berangkatlah {dusk} untuk {deed}.",
  ],
  [
    "Sebermula, in the days when the Portuguese ships lay in the roads off Melaka, a pendekar was sent to {deed}.",
    "Alkisah, it is told that {dusk}, the pendekar went out into {region} to {deed}.",
    "Adapun the pendekar, having taken his charge from the elder, set out {dusk} to {deed}.",
  ],
);

const pw = (id: string, p: Pair) => (D[`hikayat.place.${id}`] = p);
pw("jeti", ["jeti pelabuhan", "the harbour jetty"]);
pw("pelabuhan", ["lorong-lorong Bandar Melaka", "the lanes of Bandar Melaka"]);
pw("sungai", ["sungai yang keruh", "the brown river"]);
pw("kampung-hulu", ["Kampung Hulu", "Kampung Hulu"]);
pw("hutan", ["hutan tua", "the old hutan"]);
pw("kem", ["perkhemahan pengakap", "the scouts' camp"]);
pw("ledang", ["lereng Gunung Ledang", "the slopes of Gunung Ledang"]);
pw("kolam", ["kolam di kaki air terjun", "the pool below the falls"]);
pw("puncak", ["tempat persembahan di puncak", "the summit shrine"]);
pw("halaman-penjara", ["halaman penjara", "the yard of the penjara"]);
pw("sel", ["sel yang menitis air", "the dripping cells"]);
pw("masjid", ["halaman masjid yang tenang", "the quiet yard of the masjid"]);
pw("kolam-masjid", ["kolam yang tenang di tepi pintu", "the still pond by the gate"]);
pw("kota-bukit", ["batu-batan di bawah Kota", "the rocks below the Kota"]);
pw("kota-halaman", ["halaman Kota", "the courtyard of the Kota"]);
pw("kota-kubu", ["bumbung menara utama", "the roof of the keep"]);
pw("gua-lorong", ["celah sempit ke Gua Lanun", "the narrow cleft to Gua Lanun"]);
pw("gua-lanun", ["Gua Lanun", "Gua Lanun"]);

many(
  "hikayat.road.mid",
  [
    "Dari {first} dia melalui {mid}, lalu tiba akhirnya di {last}.",
    "Jalannya bermula dari {first}, menerusi {mid}, hingga ke {last}, dan sepanjang jalan itu dia berlindung dalam gelap.",
  ],
  [
    "From {first} he went by way of {mid}, and came at last to {last}.",
    "His road ran from {first} through {mid} to {last}, and he kept to the dark the whole way.",
  ],
);
many(
  "hikayat.road.nomid",
  [
    "Dari {first} dia meneruskan langkah ke {last}, menyusur bayang-bayang cucur atap.",
    "Ditinggalkannya {first} di belakang, lalu diteruskannya langkah ke {last}.",
  ],
  ["From {first} he went on to {last}, keeping to the shadows of the eaves.", "He left {first} behind him and went on to {last}."],
);
many(
  "hikayat.road.one",
  ["Sepanjang malam itu dia hanya bergerak di sekitar {place}.", "Segala yang dilakukannya, dilakukannya di {place}."],
  ["He kept to {place} the whole night through.", "All that he did, he did in {place}."],
);

many(
  "hikayat.travel.dive",
  [
    "dia terjun ke air bagai buaya, dan {times} dia menyelam lalu menahan nafas sementara para askar menoleh ke sana sini",
    "dia mengharungi air, lalu menyelam {times} di tempat yang tiada mata dapat mengekori",
  ],
  [
    "into the water he went like a buaya, and {times} he slipped under and held his breath while the soldiers looked about",
    "he took to the water, and went under {times} where no eye could follow",
  ],
);
many(
  "hikayat.travel.swim",
  [
    "dia berenang di tempat yang tiada askar sanggup meredah",
    "dia menyeberangi air seperti buaya menyeberang, hanya matanya di atas permukaan",
  ],
  ["he swam where no soldier would wade", "he crossed the water as the buaya crosses it, with only his eyes above"],
);
many(
  "hikayat.travel.boat",
  [
    "dia menaiki sampan lalu meluncur di atas air, dan dayungnya tidak berkocak",
    "sebuah sampan membawanya seketika, rendah di atas air",
  ],
  ["he took a sampan and slid along the water, and his paddle made no splash", "a sampan carried him a while, low on the water"],
);
many(
  "hikayat.travel.horse",
  [
    "dia menunggang kuda dengan laju, sehingga bunyi tapaknya kedengaran dari jauh",
    "dia menunggang kuda curi seketika, dan jalan berlalu pantas di bawahnya",
  ],
  ["he took a horse and rode it hard, so that the hooves were heard from far off", "he rode a while on a stolen horse, and the road went by fast beneath him"],
);

many(
  "hikayat.hide.a",
  [
    "{times} dia menyorokkan diri dalam jerami dan semak, dan para askar lalu hampir cukup untuk disentuh",
    "{times} dia bersembunyi dalam jerami dan dedaun, menunggu tapak kasut berlalu",
  ],
  [
    "{times} he folded himself into the hay and the bushes, and the soldiers walked by close enough to touch",
    "{times} he went to ground in the hay and the leaves and waited for the boots to pass",
  ],
);
D["hikayat.hide.join"] = [", dan ", ", and "];
D["hikayat.hide.body.1"] = [
  "seorang daripada yang mati diseretnya ke tempat berlindung, supaya tiada sesiapa menemuinya",
  "one of the dead he dragged into cover, that no one should find him",
];
D["hikayat.hide.body.n"] = [
  "{n} daripada yang mati diseretnya ke tempat berlindung, supaya tiada sesiapa menemui mereka",
  "{n} of the dead he dragged into cover, that no one should find them",
];

D["hikayat.tool.stone.heard1"] = [
  "sebiji batu dilontar ke dalam gelap, memalingkan kepala seorang askar ke arah yang salah",
  "one stone tossed into the dark turned a soldier's head the wrong way",
];
D["hikayat.tool.stone.heardN"] = [
  "{n} biji batu dilontarnya ke dalam gelap, dan para askar pergi memeriksa kekosongan",
  "{n} stones he threw into the dark, and the soldiers went to look at nothing",
];
D["hikayat.tool.stone.quiet1"] = ["sebiji batu dilontarnya tanpa didengari sesiapa", "a stone he threw that no one heard"];
D["hikayat.tool.stone.quietN"] = ["{n} biji batu dilontarnya tanpa didengari sesiapa", "{n} stones he threw that no one heard"];
D["hikayat.men.1"] = ["seorang lelaki", "a man"];
D["hikayat.men.n"] = ["{n} orang lelaki", "{n} men"];
D["hikayat.tool.pepper.hit"] = [
  "dengan serbuk lada dibutakannya {men}, yang menangis sambil mencakar mata sendiri",
  "with serbuk lada he blinded {men}, who wept and clawed at their eyes",
];
D["hikayat.tool.pepper.miss"] = [
  "segenggam lada diserahkannya kepada angin, dan tiada seorang pun buta kerananya",
  "a handful of pepper he gave to the wind, and it blinded nobody",
];
D["hikayat.tool.knife.all1"] = ["sebilah pisau lemparnya", "his one throwing knife"];
D["hikayat.tool.knife.allN"] = ["kesemua {n} bilah pisau lemparnya", "all {n} of his throwing knives"];
D["hikayat.tool.knife.some"] = ["{h} daripada {n} bilah pisau lemparnya", "{h} of his {n} throwing knives"];
D["hikayat.tool.knife.hit"] = ["{what} tepat mengena, dan mereka yang terkena terhuyung-hayang", "{what} struck home, and the struck men reeled"];
D["hikayat.tool.knife.miss"] = ["pisau-pisau lemparnya berdenting jatuh ke dalam gelap", "his throwing knives clattered off into the dark"];

many(
  "hikayat.kill.silent1",
  [
    "seorang pengawal diterkamnya dari belakang, dan lelaki itu tidak sempat bersuara",
    "seorang pengawal rebah dengan keris di belakangnya sebelum sedar dirinya tidak bersendirian",
  ],
  [
    "one guard he took from behind, and the man made no sound",
    "a single guard died with the keris in his back before he knew he was not alone",
  ],
);
many(
  "hikayat.kill.silentN",
  [
    "{n} pengawal rebah di hadapannya tanpa sebarang bunyi",
    "{n} orang diterkamnya dari belakang, seorang demi seorang, dan tiada seorang pun sempat menjerit",
  ],
  [
    "{n} guards fell before him without a sound",
    "{n} men he took from behind, one by one, and not one of them cried out",
  ],
);
many(
  "hikayat.kill.air1",
  [
    "seorang diterkamnya dari atas, jatuh ke atasnya bagai helang menyambar anak ayam",
    "seorang tidak terfikir untuk memandang ke atas, lalu pendekar itu turun menerkamnya dari cucur atap",
  ],
  [
    "one he took from above, dropping on him as the helang drops on a chick",
    "one never thought to look up, and the pendekar came down on him from the eaves",
  ],
);
D["hikayat.kill.airN"] = [
  "{times} dia terjun dari tempat tinggi bagai helang, dan setiap kali itu seorang tidak bangun lagi",
  "{times} he dropped from on high like the helang, and each time a man did not rise",
];
D["hikayat.kill.counter1"] = ["seorang yang terhuyung di bawah bilahnya ditamatkannya di tempat dia berdiri", "one who staggered under his blade he finished where he stood"];
D["hikayat.kill.counterN"] = [
  "{n} orang yang terhuyung-hayang dek bilahnya ditamatkannya sebelum sempat menegakkan diri",
  "{n} who reeled from his blade he finished before they could steady themselves",
];
many(
  "hikayat.kill.cut1",
  ["seorang ditumbangkannya berdepan muka", "seorang menentangnya di tempat terbuka, lalu tumbang ditetak"],
  ["one he cut down face to face", "one stood against him in the open, and was cut down"],
);
many(
  "hikayat.kill.cutN",
  [
    "{n} orang ditewaskannya bilah lawan bilah, di hadapan semua orang",
    "{n} orang menentangnya di tempat terbuka, dan tanah merah dengan darah mereka",
  ],
  [
    "{n} he cut down blade to blade, for all to see",
    "{n} stood against him in the open, and the ground was red with them",
  ],
);
D["hikayat.kill.lead"] = ["Ramailah askar yang bertemu dengannya: ", "Many were the soldiers who met him: "];
many(
  "hikayat.nokill.task",
  [
    "Keris itu tidak merasa darah malam itu, kecuali sekadar yang dituntut tugasnya.",
    "Setitik darah askar pun tidak ditumpahkannya melainkan yang terpaksa.",
  ],
  [
    "His keris tasted no blood that night save what the task required.",
    "Not one soldier's blood did he spill that he did not have to.",
  ],
);
many(
  "hikayat.nokill.none",
  ["Kerisnya tidak sekali pun keluar dari sarungnya.", "Seorang askar pun tidak dicederakannya, dan kerisnya kekal dalam sarung."],
  ["His keris never once left its sheath.", "Not a single soldier did he harm, and his keris stayed in its sheath."],
);

D["hikayat.seen.body1"] = [", dan sekali itu mayat yang ditinggalkannya ditemui", ", and once it was a body he had left that was found"];
D["hikayat.seen.bodyN"] = [", dan {times} mayat yang ditinggalkannyalah yang membongkar kehadirannya", ", and {times} it was the bodies he had left that gave him away"];
D["hikayat.seen.alarm1"] = ["amaran itu", "the alarm"];
D["hikayat.seen.alarmN"] = ["setiap kali amaran itu", "each time the alarm"];
D["hikayat.seen.target"] = [" {Who} sendiri melihatnya lalu memanggil orang-orangnya.", " {Who} himself saw him and called for his men."];
many(
  "hikayat.seen.v",
  [
    "Tetapi {times} laungan bergema dan para askar berlari datang{body}.",
    "Namun dia dilihat {times}, dan {alarm} menjalar dari pos ke pos{body}.",
  ],
  [
    "But {times} the cry went up and the soldiers came running{body}.",
    "Yet he was seen {times}, and {alarm} ran from post to post{body}.",
  ],
);

D["hikayat.fight.parry1"] = ["satu tetakan ditepisnya dengan keris", "one blow he turned aside on the keris"];
D["hikayat.fight.parryN"] = ["{n} tetakan ditepisnya dengan keris", "{n} blows he turned aside on the keris"];
D["hikayat.fight.near.won"] = [
  "sekali darahnya mengalir begitu deras hingga kisah ini hampir berakhir di situ, namun dia tidak rebah",
  "once his own blood ran so freely that the tale nearly ended there, but he did not fall",
];
D["hikayat.fight.near.lost"] = ["darahnya mengalir deras", "his blood ran freely"];
D["hikayat.fight.wound1"] = ["dia terluka sekali namun tidak dihiraukannya", "he took one cut and paid it no mind"];
D["hikayat.fight.woundN"] = ["dia menerima {n} luka namun tidak dihiraukannya", "he took {n} cuts and paid them no mind"];

many(
  "hikayat.charm",
  [
    "Dan di celah jerami ditemuinya {charm}, lalu dipakainya sesudah itu.",
    "Di situ juga dia terjumpa {charm}, terselit di tempat yang hanya pendekar akan menjenguk.",
  ],
  [
    "And hidden in the straw he found the {charm}, and wore it after.",
    "There too he came upon the {charm}, tucked away where only a pendekar would look.",
  ],
);

many("hikayat.quick", [", sebelum pengawal sempat bertukar giliran", ", ketika malam masih muda"], [", before the watch had even changed", ", and the night was still young"]);
D["hikayat.deed.steal.alert"] = [
  "{Who} ditemuinya di tempat ia tersembunyi lalu diambilnya, walaupun pemburuan riuh di sekelilingnya{quick}.",
  "{Who} he found where it was hidden and took it up, though the hunt was loud around him{quick}.",
];
D["hikayat.deed.steal.quiet.0"] = [
  "{Who} ditemuinya di tempat ia disembunyikan, lalu diambilnya, dan tiada tangan yang menghalangnya{quick}.",
  "{Who} he found where it was hidden, and took it up, and no hand stopped him{quick}.",
];
D["hikayat.deed.steal.quiet.1"] = [
  "Akhirnya dia menyentuh {who}, dan tiada sesiapa di seluruh {region} tahu ia sudah hilang{quick}.",
  "He laid his hand on {who} at last, and no one in all {region} knew it was gone{quick}.",
];
D["hikayat.deed.kill.air"] = [
  "Dari atas dia menerkam {who}, sebagaimana helang menyambar mangsanya, dan selesailah dalam sekelip mata{quick}.",
  "From above he fell upon {who}, as the helang falls upon its prey, and it was done in a breath{quick}.",
];
D["hikayat.deed.kill.silent.0"] = [
  "{Who} ditemuinya akhirnya, lalu didekati dari belakang, dan keris itu menusuk sekali, dan {who} tidak bersuara lagi{quick}.",
  "{Who} he found at last, and came at him from behind, and the keris went in once, and {who} spoke no more{quick}.",
];
D["hikayat.deed.kill.silent.1"] = [
  "Kemudian dia berdiri di belakang {who}, dekat bagai bayang-bayang, lalu menikam sekali{quick}.",
  "Then he stood behind {who}, close as a shadow, and struck once{quick}.",
];
D["hikayat.deed.kill.open"] = [
  "{Who} enggan mati dengan senyap; mereka bertentang bilah di tempat terbuka, dan akhirnya keris itu menemuinya{quick}.",
  "{Who} would not die quietly; they crossed blades in the open, and at the last the keris found him{quick}.",
];

many(
  "hikayat.tone.ghost",
  [
    "Tiada seorang askar pun nampak walau bayangnya; bagi mereka dia hanyalah angin yang bergerak di atap nipah.",
    "Menjelang pagi para askar akan bersumpah bahawa tiada sesiapa pun datang.",
  ],
  [
    "No soldier saw so much as his shadow; to them he was only a wind moving in the atap.",
    "The soldiers would swear by morning that nobody had come at all.",
  ],
);
many(
  "hikayat.tone.shadow",
  ["Dia sempat dilihat, tetapi hanya sekejap, dan sekejap itu berlalu.", "Sekilas mereka melihatnya, tidak lebih, dan sekilas bukanlah nama."],
  ["Seen he was, but only for a moment, and moments pass.", "A glimpse they had of him, no more, and a glimpse is not a name."],
);
many(
  "hikayat.tone.messy",
  [
    "Malam itu bukan malam yang senyap; khabarnya sampai ke seluruh {region} menjelang pagi.",
    "Perkara itu riuh dan kucar-kacir, dan para askar tidak lena lagi malam itu.",
  ],
  [
    "It was not a quiet night; all {region} heard of it by morning.",
    "It was a loud and ragged business, and the soldiers did not sleep again that night.",
  ],
);
many(
  "hikayat.tone.bloody",
  [
    "Para askar akan menyebut malam itu dengan berbisik untuk waktu yang lama.",
    "Merahlah keris itu malam itu, dan kapal-kapal di perairan mendengar bilangannya menjelang subuh.",
  ],
  [
    "The soldiers would speak of that night in whispers for a long time after.",
    "Red was the keris that night, and the ships in the roads heard the count by dawn.",
  ],
);
many(
  "hikayat.tone.fallen",
  ["Siapakah dia, para askar tidak pernah tahu.", "Pelita di tempat tinggal para askar menyala hingga lewat malam itu."],
  ["Who he was, the soldiers never learned.", "The lamps burned late that night in the soldiers' quarters."],
);

D["hikayat.pace.0"] = ["lebih singkat daripada sekunyah sireh", "quicker than a quid of sireh is chewed"];
D["hikayat.pace.1"] = ["dalam masa yang diperlukan untuk menanak nasi", "in the time it takes rice to cook"];
D["hikayat.pace.2"] = ["dan {n} minit telah berlalu sejak dia berangkat", "and {n} minutes had passed since he set out"];
many(
  "hikayat.end.won",
  [
    "Hatta, turunlah dia ke {exit} lalu lenyap, {pace}.",
    "Maka sampailah dia ke {exit} dan menghilang ke dalam gelap, {pace}.",
  ],
  [
    "Hatta, he went down to {exit} and was gone, {pace}.",
    "Maka he came to {exit} and slipped away into the dark, {pace}.",
  ],
);
many(
  "hikayat.end.slain",
  [
    "Maka di {where} rebahlah pendekar itu akhirnya, dan para askar berdiri mengelilinginya sambil tertanya-tanya siapakah dia.",
    "Hatta, di {where} bilah-bilah menutup di sekelilingnya, dan di situlah pendekar itu rebah.",
  ],
  [
    "Maka there in {where} the pendekar fell at last, and the soldiers stood over him and wondered who he had been.",
    "Hatta, in {where} the blades closed around him, and there the pendekar fell.",
  ],
);
D["hikayat.end.detected"] = [
  "Maka amaran pun berbunyi di {where}, dan apa yang mesti dilakukan tanpa dilihat tidak dapat dilakukan malam itu.",
  "Maka the alarm went up in {where}, and what had to be done unseen could not be done that night.",
];
D["hikayat.end.other"] = [
  "Maka di {where} kerja itu menjadi berantakan, dan pendekar itu terpaksa meninggalkannya untuk malam yang lain.",
  "Maka in {where} the work came undone, and the pendekar had to leave it for another night.",
];
many(
  "hikayat.closing.won",
  [
    "Demikianlah kisah ini, sebagaimana dituturkan oleh yang empunya cerita; dan Allah lebih mengetahui.",
    "Demikianlah kisahnya, dan demikianlah yang berlaku; wallahualam.",
    "Tamatlah bahagian hikayat pendekar ini, seperti yang dituturkan oleh para penutur.",
  ],
  [
    "Demikianlah the tale, as the one who owns it told it; and God knows best.",
    "Thus it is told, and thus it was; wallahualam.",
    "So ends this part of the hikayat of the pendekar, as the tellers tell it.",
  ],
);
many(
  "hikayat.closing.lost",
  [
    "Maka putuslah kisah ini di sini; namun cerita-cerita di Melaka dituturkan lebih daripada sekali.",
    "Demikianlah dikisahkan, meskipun para penutur berkata pada kali yang lain kesudahannya berbeza; wallahualam.",
  ],
  [
    "So the tale breaks off here; but tales in Melaka are told more than once.",
    "Thus it is told, though the tellers say it ended otherwise the next time; wallahualam.",
  ],
);

export const ms: Record<string, string> = Object.fromEntries(Object.entries(D).map(([k, v]) => [k, v[0]]));
export const en: Record<string, string> = Object.fromEntries(Object.entries(D).map(([k, v]) => [k, v[1]]));
