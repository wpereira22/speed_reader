import type { UploadResponse, WordData } from '../types';

const SAMPLE_TEXT = `
On Tuesday evenings the old train depot turns into the Moonlight Market, a cozy maze of lanterns, snack carts, and small mysteries. People bring folding chairs, dogs on gentle leashes, and a polite appetite. The market is not loud, but it is lively. You can hear dice rolling, a kettle steaming, and the soft clink of glass bottles as a vendor lines them up by color.

At the entrance there is a chalkboard map that changes every week. It never lies, but it does take liberties. A booth called "The Compass Drawer" sells handmade maps of places that do not quite exist. The owner says they are still useful because they teach your feet how to be curious. A tiny arrow points toward "warm tea" and another points toward "something that smells like cinnamon."

The first stall sells vegetables that look like they are in on a secret. There are striped carrots, lilac potatoes, and cucumbers that curl like question marks. The farmer explains that plants respond well to compliments, so he narrates his garden every morning. He says it does not matter if they understand. The plants just like being part of a story.

A few steps later a musician sits on a crate and plays a small piano with the lid open. The sound is soft and bright, like a kitchen window in spring. A basket by her feet holds buttons instead of coins, and the sign says, "Pay what you can, even if it is a story." People drop a blue button, a smooth stone, and once in a while an actual story written on a scrap of paper.

Halfway down the aisle there is a booth for lost items. It is not a lost and found. It is a lost and maybe. The keeper offers to trade you a found item for a missing one, or just listen while you describe the thing you cannot find. He keeps a notebook with detailed entries like, "a scarf that smelled like rain," and "a red mitten that believed in adventure."

Around the corner is a tiny library on wheels, no bigger than a bicycle cart. The librarian has a list of quick reads for people who are waiting for dumplings or rides. She calls them snack books. You can check out a story about a cloud that got a job, or a poem about a goose that prefers jazz. She stamps the due date with a tiny moon.

The market has a game called The Token Trail. You start at a bell jar of wooden tokens and pick one stamped with a symbol, like a star or a pinecone. Then you walk and look for the matching symbol hidden in a sign or painted on a cup. If you find it, you earn a ribbon that says "good finder." People of all ages play, though the toddlers tend to declare victory early.

If you get hungry you can follow the smell of roasted corn to a cart that claims to sell "whispers." The chef insists that food tastes better if you say something kind before the first bite. He is not trying to be mystical, just polite. The corn is buttery, the grilled peaches are warm, and the bread rolls crackle when you pull them apart.

Near closing time the lanterns dim and the chalkboard map is erased for a fresh start. The Compass Drawer packs up his maps. The pianist closes her lid and trades stories for a cup of tea. People walk toward the exit slowly, as if the path might reveal one more small surprise.

When you leave, the Moonlight Market hands you a paper ticket that reads, "Good for one ordinary day." It is a reminder that you can carry the market with you. You can turn a quiet corner into a discovery, or a grocery list into a tiny adventure. All it takes is a bit of attention, and maybe a blue button in your pocket.
`;

const WORD_CORE_RE = /^([^A-Za-z0-9]*)([A-Za-z0-9]+(?:['-][A-Za-z0-9]+)*)([^A-Za-z0-9]*)$/;

const calculateOrpCore = (core: string) => {
  const trimmed = core.trim();
  if (!trimmed) return 0;

  const length = trimmed.length;
  if (length <= 1) return 0;
  if (length <= 5) return 1;
  if (length <= 9) return 2;
  if (length <= 13) return 3;
  return 4;
};

const splitLeadingCoreTrailing = (token: string) => {
  const match = WORD_CORE_RE.exec(token);
  if (!match) {
    return { leading: '', core: token, trailing: '' };
  }
  return { leading: match[1], core: match[2], trailing: match[3] };
};

const normalizePreserveParagraphs = (text: string) => {
  let normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  normalized = normalized.replace(/[ \t]+/g, ' ');
  normalized = normalized.replace(/\n{3,}/g, '\n\n');
  return normalized.trim();
};

const normalizeForWords = (text: string) => text.replace(/\s+/g, ' ').trim();

const tokensFromText = (text: string) => text.match(/\S+/g) ?? [];

const processTokens = (tokens: string[]): WordData[] =>
  tokens.map((raw) => {
    const { leading, core, trailing } = splitLeadingCoreTrailing(raw);
    const orpCore = calculateOrpCore(core);
    const display = `${leading}${core}${trailing}`;
    let orpDisplay = leading.length + orpCore;
    if (!display) {
      orpDisplay = 0;
    } else {
      orpDisplay = Math.max(0, Math.min(orpDisplay, display.length - 1));
    }
    return { word: display, orpIndex: orpDisplay };
  });

export const getSampleDocument = (): UploadResponse => {
  const fullText = normalizePreserveParagraphs(SAMPLE_TEXT);
  const wordText = normalizeForWords(SAMPLE_TEXT);
  const words = processTokens(tokensFromText(wordText));

  return {
    words,
    fullText,
    meta: {
      type: 'txt',
      title: 'Moonlight Market Notes',
      creator: 'Sample Library',
    },
    fileName: 'Moonlight Market Notes',
  };
};
