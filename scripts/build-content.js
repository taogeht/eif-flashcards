process.env.TS_NODE_COMPILER_OPTIONS = JSON.stringify({
  module: "commonjs",
  moduleResolution: "node"
});
require("ts-node/register");

const fs = require("fs/promises");
const path = require("path");

const { LEVEL_1A_TRACKS } = require("../apps/web/config/levels/1A");
const { LEVEL_1B_TRACKS } = require("../apps/web/config/levels/1B");
const { LEVEL_2A_TRACKS } = require("../apps/web/config/levels/2A");
const { LEVEL_2B_TRACKS } = require("../apps/web/config/levels/2B");
const { LEVEL_3A_TRACKS } = require("../apps/web/config/levels/3A");
const { LEVEL_3B_TRACKS } = require("../apps/web/config/levels/3B");

const LEVEL_TRACKS = {
  "1A": LEVEL_1A_TRACKS,
  "1B": LEVEL_1B_TRACKS,
  "2A": LEVEL_2A_TRACKS,
  "2B": LEVEL_2B_TRACKS,
  "3A": LEVEL_3A_TRACKS,
  "3B": LEVEL_3B_TRACKS
};

const rootDir = path.resolve(__dirname, "..");
const ASSETS_ROOT = path.join(rootDir, "apps", "web", "public", "assets", "levels");
const contentDir = path.join(rootDir, "packages", "content");

const ensureDir = (dir) => fs.mkdir(dir, { recursive: true });
const unitSlug = (index) => `u${String(index + 1).padStart(2, "0")}`;

async function build() {
  await fs.rm(contentDir, { recursive: true, force: true });
  await ensureDir(contentDir);

  const levelsDir = path.join(contentDir, "levels");
  await ensureDir(levelsDir);

  const imagesIndex = {};
  const audioIndex = {};
  const levelMetadata = {};

  for (const [level, tracks] of Object.entries(LEVEL_TRACKS)) {
    const levelDir = path.join(levelsDir, level);
    await ensureDir(levelDir);
    levelMetadata[level] = { title: `English is Fun ${level}` };

    await Promise.all(
      tracks.map(async (track, index) => {
        const slug = unitSlug(index);
        const unitFile = path.join(levelDir, `${slug}.json`);

        const unitAudioKey = `${level}-track${track.id}`;
        audioIndex[unitAudioKey] = `/assets/levels/${level}/audio/track${track.id}.mp3`;

        const items = track.cards.map((card) => {
          const itemKey = `${level}-track${track.id}-card${card.id}`;
          imagesIndex[itemKey] = `/assets/levels/${level}/images/flashcards/track${track.id}/${card.image}`;
          audioIndex[itemKey] = `/assets/levels/${level}/audio/voice/track${track.id}/card${card.id}.mp3`;

          return {
            id: card.id,
            text: card.word,
            imageKey: itemKey,
            audioKey: itemKey
          };
        });

        const unit = {
          slug,
          title: track.name,
          level,
          order: index + 1,
          audioKey: unitAudioKey,
          items
        };

        await fs.writeFile(unitFile, JSON.stringify(unit, null, 2), "utf8");
      })
    );

    await addAdditionalAssets(level, imagesIndex, audioIndex);
  }

  await fs.writeFile(path.join(contentDir, "images.index.json"), JSON.stringify(imagesIndex, null, 2), "utf8");
  await fs.writeFile(path.join(contentDir, "audio.index.json"), JSON.stringify(audioIndex, null, 2), "utf8");
  await fs.writeFile(path.join(contentDir, "levels.meta.json"), JSON.stringify(levelMetadata, null, 2), "utf8");
}

build().catch((error) => {
  console.error(error);
  process.exit(1);
});
async function addAdditionalAssets(level, imagesIndex, audioIndex) {
  const levelAssetDir = path.join(ASSETS_ROOT, level);

  async function addFiles(dir, prefix, target, formatter = (name) => name) {
    try {
      const entries = await fs.readdir(dir);
      await Promise.all(
        entries
          .filter((file) => !file.startsWith("."))
          .map(async (file) => {
            const fullPath = path.join(dir, file);
            const stat = await fs.stat(fullPath);
            if (stat.isDirectory()) {
              return;
            }
            const key = `${level}-${prefix}-${formatter(file)}`;
            target[key] = path
              .join("/assets/levels", level, path.relative(levelAssetDir, fullPath))
              .replace(/\\/g, "/");
          })
      );
    } catch (error) {
      if (error.code !== "ENOENT") {
        throw error;
      }
    }
  }

  const extraImagesDir = path.join(levelAssetDir, "images");
  const flashcardsDir = path.join(extraImagesDir, "flashcards");

  // Add non-flashcard images
  try {
    const entries = await fs.readdir(extraImagesDir);
    await Promise.all(
      entries
        .filter((file) => !file.startsWith(".") && file !== "flashcards")
        .map(async (file) => {
          const fullPath = path.join(extraImagesDir, file);
          const stat = await fs.stat(fullPath);
          if (stat.isDirectory()) return;
          const key = `${level}-image-${path.parse(file).name}`;
          imagesIndex[key] = path
            .join("/assets/levels", level, "images", file)
            .replace(/\\/g, "/");
        })
    );
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }
  }

  await addFiles(path.join(levelAssetDir, "audio", "voiceover"), "voiceover", audioIndex, (file) =>
    path.parse(file).name
  );
  await addFiles(path.join(levelAssetDir, "audio", "effects"), "effect", audioIndex, (file) =>
    path.parse(file).name
  );
}
