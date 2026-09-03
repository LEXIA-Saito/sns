/**
 * 投稿・コメントの言葉づかいの事前チェック。
 *
 * 例会当日は投稿が会場のスクリーンに投影されるため、送信前に止める。
 * 「block」は送信させない。「warn」は確認のうえ本人の判断で送信できる。
 *
 * ※ このファイルには判定用の語をそのまま並べている。性質上そうせざるを得ないが、
 *   ブラウザーへ配信されるため、閲覧できる前提で扱うこと。
 */

export type NgLevel = "block" | "warn";

export interface NgCheckResult {
  /** 該当なしなら null */
  level: NgLevel | null;
  /** 何件該当したか（語そのものは画面に出さない） */
  count: number;
}

/**
 * 誤検知を防ぐため、判定の前に取り除く語。
 * 例：「ばかり」を「ばか」と誤って判定しないようにする。
 */
const ALLOW_PHRASES = [
  "ばかり",
  "ばかげ",
  "ばかん",
  "ちんちんに", // 名古屋・西尾では「とても熱い」の意味で使う
  "ちんちんの",
  "いっぱい",
  "しねば", // 「〜しねばならない」
];

/** 送信させない語（性的表現・差別語・強い攻撃） */
const BLOCK_WORDS = [
  // 性的表現
  "ちんこ", "ちんぽ", "まんこ", "せっくす", "sex", "ふぇら", "おなにー", "onanie",
  "射精", "精液", "勃起", "陰茎", "陰部", "性器", "性交", "自慰", "中出し",
  "れいぷ", "rape", "強姦", "痴漢", "淫乱", "セフレ", "せふれ", "やりまん",
  "童貞", "風俗嬢", "でりへる", "そーぷらんど", "エッチしよ", "えっちしよ",
  // 差別語
  "きちがい", "気違い", "基地外", "がいじ", "池沼", "白痴", "知恵遅れ",
  "めくら", "つんぼ", "かたわ", "びっこ", "部落民", "えたひにん", "ちょん公", "支那人",
  // 強い攻撃・脅し
  "死ね", "しね", "殺す", "ころす", "殺害", "死んで詫び", "自殺しろ",
];

/** 確認のうえ送信できる語（軽い悪態） */
const WARN_WORDS = [
  "ばか", "馬鹿", "あほ", "阿呆", "くそ", "クソ", "うざい", "うぜー", "きもい", "キモい",
  "まぬけ", "間抜け", "無能", "ぶす", "でぶ", "はげ", "ハゲ", "だまれ", "黙れ",
  "ちんちん", "おっぱい", "えろ", "エロ", "変態", "ヌード", "ぬーど",
];

/** カタカナをひらがなへ */
function kataToHira(value: string): string {
  return value.replace(/[ァ-ヶ]/g, (c) =>
    String.fromCharCode(c.charCodeAt(0) - 0x60)
  );
}

/**
 * 表記ゆれと伏せ字をならす。
 * 全角半角・大文字小文字・カタカナ・記号・空白・伸ばし棒を取り除いて比較する。
 */
export function normalizeForCheck(text: string): string {
  const normalized = text.normalize("NFKC").toLowerCase();
  return kataToHira(normalized)
    .replace(/[\s　]/g, "")
    .replace(/[ー〜~・.,、。!?！？"'`^*_\-–—+=/\\|()[\]{}<>@#$%&:;]/g, "");
}

/** 判定に使う文字列（誤検知しやすい語をあらかじめ除去） */
function prepare(text: string): string {
  let prepared = normalizeForCheck(text);
  for (const phrase of ALLOW_PHRASES) {
    prepared = prepared.split(normalizeForCheck(phrase)).join("");
  }
  return prepared;
}

function countMatches(prepared: string, words: string[]): number {
  let count = 0;
  for (const word of words) {
    if (prepared.includes(normalizeForCheck(word))) count += 1;
  }
  return count;
}

/**
 * 本文を判定する。block が1件でもあれば block を返す。
 */
export function checkText(text: string): NgCheckResult {
  const prepared = prepare(text);
  if (!prepared) return { level: null, count: 0 };

  const blocked = countMatches(prepared, BLOCK_WORDS);
  if (blocked > 0) return { level: "block", count: blocked };

  const warned = countMatches(prepared, WARN_WORDS);
  if (warned > 0) return { level: "warn", count: warned };

  return { level: null, count: 0 };
}

/** 送信を止めるときの案内文 */
export const NG_BLOCK_MESSAGE =
  "不適切な表現が含まれているため投稿できません。表現を直してからもう一度お試しください。";

/** 確認を求めるときの案内文 */
export const NG_WARN_MESSAGE =
  "強い言い方が含まれています。投稿は例会当日に会場のスクリーンへ投影されます。このまま投稿しますか？";
