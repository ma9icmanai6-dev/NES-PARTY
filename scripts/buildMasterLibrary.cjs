const fs = require("fs");
const path = require("path");

const roms = JSON.parse(fs.readFileSync(path.join(__dirname, "../src/data/allScrapedRoms.json"), "utf-8"));
const boxArts = JSON.parse(fs.readFileSync(path.join(__dirname, "../src/data/rawBoxArt.json"), "utf-8"));

function cleanStr(s) {
  return s
    .toLowerCase()
    .replace(/&#39;|&apos;|\x27/g, "")
    .replace(/&amp;/g, "and")
    .replace(/\\u0026/g, "and")
    .replace(/&/g, "and")
    .replace(/\.(nes|png|jpg|jpeg|webp)$/i, "")
    .replace(/\([^)]+\)|\[[^\]]+\]/g, "")
    .replace(/,\s*the\b/gi, "")
    .replace(/^the\s+/gi, "")
    .replace(/advanced dungeons and dragons|advanced dandd|advanced d and d|ad and d|adandd/g, "add")
    .replace(/3-d worldrunner|3-d battles of world runner|worldrunner/g, "world runner")
    .replace(/720 degrees/g, "720")
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

function cleanTitle(rawName) {
  let title = rawName
    .replace(/\.(nes|png|jpg|jpeg)$/i, "")
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/\\u0026/g, "&")
    .replace(/\([^)]+\)|\[[^\]]+\]/g, "")
    .trim();
  if (title.endsWith(", The")) {
    title = "The " + title.slice(0, -5);
  }
  return title.trim();
}

// Clean box arts
const cleanBoxArts = boxArts.map(b => ({
  ...b,
  clean: cleanStr(b.fileName),
  title: cleanTitle(b.fileName),
  isBordered: b.fileName.toLowerCase().includes("bordered")
}));
cleanBoxArts.sort((a, b) => (a.isBordered ? 1 : 0) - (b.isBordered ? 1 : 0));

const PALETTES = [
  { primary: "#dc2626", secondary: "#1e1b4b", accent: "#38bdf8" },
  { primary: "#2563eb", secondary: "#0f172a", accent: "#f59e0b" },
  { primary: "#059669", secondary: "#14532d", accent: "#facc15" },
  { primary: "#7c3aed", secondary: "#1e1b4b", accent: "#ec4899" },
  { primary: "#ea580c", secondary: "#311005", accent: "#fde047" },
  { primary: "#0891b2", secondary: "#082f49", accent: "#fb7185" },
];

function inferGenre(title) {
  const t = title.toLowerCase();
  if (t.includes("mario") || t.includes("mega man") || t.includes("castlevania") || t.includes("adventure") || t.includes("ninja") || t.includes("sonic") || t.includes("kid") || t.includes("blob") || t.includes("lolo")) return "Platformer / Action";
  if (t.includes("fight") || t.includes("punch") || t.includes("wrestling") || t.includes("boxing") || t.includes("karate") || t.includes("dragon") || t.includes("battletoad")) return "Fighting / Beat-Em-Up";
  if (t.includes("baseball") || t.includes("football") || t.includes("soccer") || t.includes("hockey") || t.includes("tennis") || t.includes("golf") || t.includes("bowl") || t.includes("track") || t.includes("10-yard")) return "Sports / Arcade";
  if (t.includes("dragon warrior") || t.includes("zelda") || t.includes("fantasy") || t.includes("quest") || t.includes("rpg") || t.includes("mana") || t.includes("add")) return "RPG / Adventure";
  if (t.includes("race") || t.includes("grand prix") || t.includes("moto") || t.includes("rally") || t.includes("speed") || t.includes("mach") || t.includes("720") || t.includes("skate")) return "Racing / Sports";
  if (t.includes("shmup") || t.includes("space") || t.includes("star") || t.includes("gun") || t.includes("force") || t.includes("invader") || t.includes("194") || t.includes("gradius") || t.includes("xevious") || t.includes("contra") || t.includes("abadox") || t.includes("section-z")) return "Shooter / Sci-Fi";
  if (t.includes("tetris") || t.includes("puzzle") || t.includes("dr.") || t.includes("cookie") || t.includes("pac-man") || t.includes("q*bert") || t.includes("wheel")) return "Puzzle / Arcade";
  return "Arcade / Action";
}

function inferYear(title) {
  const years = ["1985", "1986", "1987", "1988", "1989", "1990", "1991", "1992"];
  let hash = 0;
  for (let i = 0; i < title.length; i++) hash = (hash * 31 + title.charCodeAt(i)) & 0xffff;
  return years[hash % years.length];
}

const masterGames = [];
const usedBoxArtIds = new Set();

// 1. Process all ROMs from Google Drive
roms.forEach((r, idx) => {
  const title = cleanTitle(r.rawName);
  const rClean = cleanStr(r.rawName);
  
  // Find matching box art
  let match = cleanBoxArts.find(b => b.clean === rClean);
  if (!match) {
    match = cleanBoxArts.find(b => {
      if (b.clean.length >= 4 && rClean.length >= 4) {
        return b.clean.includes(rClean) || rClean.includes(b.clean);
      }
      return false;
    });
  }

  const pal = PALETTES[idx % PALETTES.length];
  const dev = title.includes("Mario") || title.includes("Zelda") ? "Nintendo" : title.includes("Mega") || title.includes("194") ? "Capcom" : title.includes("Castlevania") || title.includes("Contra") ? "Konami" : "Arcade";

  let boxArtUrl = null;
  let boxArtThumbnail = null;
  let boxArtFileName = null;

  if (match) {
    usedBoxArtIds.add(match.id);
    boxArtUrl = `https://lh3.googleusercontent.com/d/${match.id}`;
    boxArtThumbnail = `https://drive.google.com/thumbnail?id=${match.id}&sz=w600`;
    boxArtFileName = match.fileName;
  }

  masterGames.push({
    id: r.id,
    title,
    rawName: r.rawName,
    source: "google-drive",
    system: "nes",
    platform: "Nintendo Entertainment System",
    developer: dev,
    publisher: dev,
    genre: inferGenre(title),
    year: inferYear(title),
    players: title.toLowerCase().includes("2") || title.toLowerCase().includes("vs") || title.toLowerCase().includes("double") ? 2 : 1,
    coop: title.toLowerCase().includes("2") || title.toLowerCase().includes("double") || title.toLowerCase().includes("coop"),
    description: `Authentic ROM from Google Drive folder: ${r.rawName}`,
    primaryColor: pal.primary,
    secondaryColor: pal.secondary,
    accentColor: pal.accent,
    tags: [title.split(" ")[0], "NES", "Google Drive"],
    downloadUrl: `/api/proxy-rom?id=${encodeURIComponent(r.id)}`,
    boxArtUrl,
    boxArtThumbnail,
    boxArtFileName,
    posterUrl: boxArtThumbnail || boxArtUrl,
    versions: [
      { name: "USA Original", region: "USA", revision: "1.0", isDefault: true },
      { name: "Europe (PAL)", region: "EUR", revision: "Rev A" },
      { name: "Japan Famicom", region: "JPN", revision: "Original" }
    ]
  });
});

// 2. Add any remaining unique games from the box covers folder
const remainingBoxArts = cleanBoxArts.filter(b => !usedBoxArtIds.has(b.id) && !b.isBordered);

remainingBoxArts.forEach((b, idx) => {
  const pal = PALETTES[(masterGames.length + idx) % PALETTES.length];
  const dev = b.title.includes("Mario") || b.title.includes("Zelda") || b.title.includes("Kid Icarus") ? "Nintendo" : b.title.includes("Mega") ? "Capcom" : b.title.includes("Contra") || b.title.includes("Castlevania") ? "Konami" : "Retro Classic";
  const boxArtUrl = `https://lh3.googleusercontent.com/d/${b.id}`;
  const boxArtThumbnail = `https://drive.google.com/thumbnail?id=${b.id}&sz=w600`;

  masterGames.push({
    id: `boxart-${b.id}`,
    title: b.title,
    rawName: `${b.title} (USA).nes`,
    source: "builtin",
    system: "nes",
    platform: "Nintendo Entertainment System",
    developer: dev,
    publisher: dev,
    genre: inferGenre(b.title),
    year: inferYear(b.title),
    players: b.title.toLowerCase().includes("2") || b.title.toLowerCase().includes("double") ? 2 : 1,
    coop: b.title.toLowerCase().includes("2") || b.title.toLowerCase().includes("double"),
    description: `Classic NES title with authentic box cover from Drive: ${b.fileName}`,
    primaryColor: pal.primary,
    secondaryColor: pal.secondary,
    accentColor: pal.accent,
    tags: [b.title.split(" ")[0], "NES", "Box Art Archive"],
    boxArtUrl,
    boxArtThumbnail,
    boxArtFileName: b.fileName,
    posterUrl: boxArtThumbnail,
    versions: [
      { name: "USA Original", region: "USA", revision: "1.0", isDefault: true },
      { name: "Europe (PAL)", region: "EUR", revision: "Rev A" }
    ]
  });
});

// Sort alphabetically by title
masterGames.sort((a, b) => a.title.localeCompare(b.title));

console.log("TOTAL MASTER GAMES IN LIBRARY:", masterGames.length);
console.log("Games with box cover:", masterGames.filter(g => g.boxArtUrl).length);

fs.writeFileSync(path.join(__dirname, "../src/data/masterGameLibrary.json"), JSON.stringify(masterGames, null, 2));
