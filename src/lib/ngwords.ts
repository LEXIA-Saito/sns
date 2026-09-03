/**
 * 投稿の言葉づかいの事前チェック。
 *
 * 例会当日は投稿が会場のスクリーンに投影されるため、送信前に止める。
 * 「block」は送信させない。「warn」は確認のうえ本人の判断で送信できる。
 *
 * すり抜け対策として、判定の前に次をならす。
 *   ・全角/半角、大文字/小文字、カタカナ/ひらがな
 *   ・空白、記号、中黒、伸ばし棒（「ち・ん・こ」「ちーんこ」）
 *   ・当て字によく使う漢字の読み（「珍子」「セック巣」）
 *   ・伏せ字（「痴●」「ま○こ」）は1文字ぶんの穴として扱う
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

/** 伏せ字に使われる文字。1文字ぶんの穴として扱う */
const MASK_CHARS = "●○◯〇◎■□▪▫★☆▲△▼▽×✕✖✗*＊_＿";
/** 穴を表す内部記号（通常の入力には現れない文字） */
const MASK = "\u0001";

/**
 * 誤検知を防ぐため、判定の前に取り除く語。
 * 例：「ばかり」を「ばか」と、「analysis」を「anal」と判定しないようにする。
 */
const ALLOW_PHRASES = [
  "ばかり",
  "ばかげ",
  "ばかん",
  "ちんちんに", // 名古屋・西尾では「とても熱い」の意味で使う
  "ちんちんの",
  "いっぱい",
  "しねば", // 「〜しねばならない」
  "音痴",
  "愚痴",
  "ホモサピエンス",
  "バイブス",
  "バイブコーディング",
  "バイブレーション",
  "analysis",
  "analog",
  "analytics",
  "analyze",
  "canal",
  "banal",
  "grape",
  "drape",
  "scrape",
  "罪を犯", // 「罪を犯した」は正当な言い回し（「犯罪を犯して」は残るので止まる）
  "過ちを犯",
  "ミスを犯",
  "ギンギンに冷え", // 「ギンギンに冷えたビール」は普通の言い回し
  "キンキンに冷え",
  "処女作",
  "処女航海",
  "裸足",
  "裸一貫",
  "インポート",
  "ちょんまげ",
  "ぽるとがる",
  "穴があったら入りたい", // 慣用句。「入れたい」は止める
  "ばかうけ",
  "ばか正直",
  "ばかでかい",
  "ばか売れ",
  "お腹がぱんぱん",
  "お腹ぱんぱん",
  "スーツがぱつぱつ",
  "裸の付き合い", // 温泉などで使う言い回し
  "授乳室",
  "赤裸々",
  "姦しい", // 「かしましい」は普通の言葉
  "ぶっかけうどん",
  "ぶっかけそば",
  "ぶっかけ飯",
  "ぶっかけご飯",
  "av機器", // 音響・映像の機材
  "av端子",
  "avケーブル",
  "available",
  "口内炎", // 口の中の炎症
  "口内ケア",
  "口内環境",
  "触手を伸ば", // 「事業に触手を伸ばす」は普通の言い回し
  "地面の割れ目",
  "岩の割れ目",
];

/** 当て字対策。判定の前に読みへ置き換える */
const HOMOPHONES: Array<[string, string]> = [
  ["珍", "ちん"],
  ["巣", "す"],
  ["子", "こ"],
  ["個", "こ"],
  ["満", "まん"],
  ["万", "まん"],
  ["穴", "あな"],
  ["尻", "しり"],
  ["汁", "しる"],
  ["舐", "なめ"],
  ["足", "あし"],
  ["手", "て"],
  ["口", "くち"],
  ["胸", "むね"],
  ["乙", "おつ"], // 「パイ乙」対策
];

/**
 * 除外語より先に判定する語。
 * 「犯罪を犯して」のように、除外語（罪を犯）を含みつつ止めたいもの。
 */
const PRIORITY_BLOCK_WORDS = ["犯罪を犯"];

/** 送信させない語 */
const BLOCK_WORDS = [
  // 性的表現（部位）
  "ちんこ", "ちんぽ", "ちんぽこ", "まんこ", "おめこ", "ぺにす", "penis",
  "ばぎな", "vagina", "陰茎", "陰核", "陰部", "性器", "亀頭", "膣",
  "きんたま", "金玉", "睾丸", "乳首", "ぱいずり", "陰毛", "まんげ",
  "しりあな", "けつあな", "あなる", "anal", "肛門",
  "おっぱい", "おっぱお", "おしり", "巨乳", "貧乳",
  // 性的表現（行為）
  "せっくす", "sex", "性交", "性行為", "挿入", "中出し", "なまはめ", "はめどり",
  "ふぇら", "fellatio", "くんに", "cunnilingus", "おーらる",
  "おなにー", "onani", "masturbat", "自慰", "しこしこ", "射精", "精液", "勃起",
  // 性的表現（呼称・状況）
  "わいせつ", "猥褻", "猥せつ", "卑猥", "ひわい", "淫乱", "淫行", "淫語",
  "痴女", "痴漢", "盗撮", "露出狂", "変質者",
  "れいぷ", "rape", "強姦", "輪姦", "近親相姦", "ぽるの", "porn",
  "せふれ", "やりまん", "童貞", "風俗嬢", "そーぷらんど", "でりへる",
  "援助交際", "えんこう", "売春", "買春", "av女優",
  "ほ別", "円光", "ぱぱ活", "まま活", "p活", "交際くらぶ", "裏引き",
  "ろりこん", "ぺどふぃりあ", "児童買春", "じゅくじょ好き", "jk", "児ぽ",
  "av", "あだると", "asmr", "xvideos", "missav", "pornhub", "xhamster",
  "ふぁんざ", "えろさいと", "えろ動画", "抜きげー", "性処理",
  "せくきゃば", "ぴんさろ", "いめくら", "はぷばー", "出会い系",
  "おなほ", "でんま", "ばいぶ", "ばいぶれーた", "えねまぐら", "ぶるせら",
  "でぃるど", "いらま", "ぱいぱん", "てこき", "あしこき", "くちこき",
  "ふぁっく", "ふぃすと", "びっち", "しりのあな", "あながあったら入れ",
  "おほ顔", "んほ", "あんあん", "喘ぎ", "あえぎ", "いくいく", "どぴゅ", "ぴゅっぴゅ",
  "ぱいおつ", "せくろす", "にゃんにゃんす", "気持ちいいことす", "授乳",
  "姦", "官能小説", "官能描写", "ぺろぺろしたい", "ぺろぺろさせ",
  "すまた", "素股", "ぶっかけ", "おなさぽ", "おな禁", "おな電", "白濁",
  "いめーじびでお", "びきに", "ぶらじゃー", "割れ目", "口内", "触手",
  "校内写生", "くっ殺", "いんさーとぷれい", "水着姿", "水着写真",
  "けつまん", "まん筋", "秘部", "大人のおもちゃ", "無修正", "裏本",
  "18禁", "r18", "成人向け", "えろげ", "抜きどころ", "たまなめ",
  "なめたい", "なめさせ", "なめ回", "ざーめん", "手まん", "潮吹き", "顔射",
  "孕ませ", "種付け", "淫夢", "性癖", "猥褻物",
  "生足", "裸", "ぱんちら", "ぱんつ見せ", "ぱんつ脱", "下着見せ", "脱ぎたて",
  "使用済み下着", "使用済み靴下", "しりのらいん", "巨しり", "美しり",
  "しりふぇち", "あしふぇち", "匂いふぇち", "下着どろ", "下着泥棒", "出歯亀",
  "やりたい", "やらせて", "はめたい", "抱かせて", "ほてる行こ", "犯りたい",
  "ぱんっぱん", "ぱんぱん♡", "ぱんぱん♥", "むねがぱつぱつ", "むねぱつ",
  "痴感", "逆さ撮り", "逆さどり", "盗み撮り",
  "えろ", "しこい", "むらむら", "びんびん", "ぎんぎん",
  "むねの谷間", "野獣先輩", "ほもび", "のんけ",
  // 犯罪の自慢・ほのめかし
  "犯す", "犯し", "ひき逃げ", "轢き逃げ", "当て逃げ", "飲酒運転", "万引き",
  "闇ばいと", "特殊詐欺", "脱税", "ねずみ講", "まるち商法",
  "やくざ", "暴力団", "組員募集", "半ぐれ", "反社会的勢力", "みかじめ",
  "示談金", "示談のためにお金", "現金を用意", "名義貸し", "振り込め",
  // 性的表現（状態・呼称の追加）
  "全裸", "半裸", "裸体", "脱衣", "下半身", "下ネタ", "性欲", "発情", "欲情",
  "絶頂", "あへ顔", "猥談", "痴態", "緊縛",
  "やりちん", "やりさー", "熟女", "巨根", "短小", "いんぽ", "早漏", "遅漏",
  "媚薬", "ばいあぐら", "らぶほ", "こんどーむ", "中絶", "性病",
  "処女", "せくはら", "ぱふぱふ", "ぬーどしゃしん",
  // 英語のスラング
  "fuck", "bitch", "bastard", "asshole", "dick", "pussy", "cunt",
  "whore", "slut", "boobs", "horny", "hentai", "ecchi", "orgasm",
  // 排泄
  "うんこ", "うんち", "おしっこ", "小便", "大便", "糞尿", "脱糞",
  // 差別語
  "きちがい", "気違い", "基地外", "がいじ", "池沼", "白痴", "知恵遅れ",
  "めくら", "つんぼ", "かたわ", "びっこ", "部落民", "えたひにん",
  "ちょん公", "支那人", "土人", "乞食", "nigger",
  "ほも", "おかま", "れず",
  // 人格・容姿への攻撃
  "ばか", "馬鹿", "あほ", "阿呆", "まぬけ", "間抜け", "無能", "役立たず", "くず野郎",
  "はげ", "ぶす", "でぶ", "ぶさいく", "不細工", "ちび", "きもい", "きしょい",
  "きもおた", "加齢臭", "老害", "じじい", "ばばあ", "でこすけ",
  "頭ぴか", "頭ぴっか", "ぴっかりーん", "頭つるつる", "頭てかてか", "ずるむけ",
  // 差別語（追加）
  "気狂い", "奇形", "精神異常", "低脳", "低能児",
  // 攻撃・脅し
  "死ね", "しね", "殺す", "ころす", "殺害", "自殺しろ", "首吊り", "死んで詫び",
  "殺害予告", "爆破予告", "りすかっと", "りすとかっと", "練炭", "飛び降りろ",
  // 薬物
  "覚醒剤", "覚せい剤", "大麻", "こかいん", "へろいん", "しゃぶ中", "麻薬", "違法薬物",
];

/**
 * 投稿全体がその語だけのときに止める。
 * 「69」のように部分一致だと普通の数字まで巻き込むもの。
 */
const EXACT_BLOCK_WORDS = ["69", "水着", "ぶら"];

/** 確認のうえ送信できる語（軽い悪態） */
const WARN_WORDS = [
  "ばか", "馬鹿", "あほ", "阿呆", "くそ", "うざい", "うぜー", "きもい", "きしょい",
  "まぬけ", "間抜け", "無能", "ぶす", "でぶ", "はげ", "だまれ", "黙れ",
  "ちんちん", "えっち", "変態", "すけべ", "ぬーど", "いやらしい", "しばく",
  "死にたい", "消えろ", "ふざけんな", "ざまあ", "だせぇ",
  "儲け話", "うまい話", "お金を用意",
  "煽り", "びびってる", "へたくそ", "下手くそ", "しょぼい",
  // 普通の意味でも使うため止めきらない（「お腹パンパン」「スーツがパツパツ」）
  "ぱんぱん", "ぱつぱつ", "にゃんにゃん", "ぱんつ", "ぺろぺろ", "ぬるぬる", "てかてか",
];

/** カタカナをひらがなへ */
function kataToHira(value: string): string {
  return value.replace(/[ァ-ヶ]/g, (c) =>
    String.fromCharCode(c.charCodeAt(0) - 0x60)
  );
}

/** 表記ゆれをならす（照合用。伏せ字は残さない） */
export function normalizeForCheck(text: string): string {
  return normalizeInternal(text).split(MASK).join("");
}

/** 判定の前処理。伏せ字だけは穴として残す */
function normalizeInternal(text: string): string {
  let value = kataToHira(text.normalize("NFKC").toLowerCase());
  for (const [kanji, reading] of HOMOPHONES) {
    value = value.split(kanji).join(reading);
  }
  let result = "";
  for (const ch of value) {
    if (MASK_CHARS.includes(ch)) {
      result += MASK;
      continue;
    }
    if (/[\s　ー〜~・.,、。!?！？"'`^+#@:;$%&|/\\()[\]{}<>-]/.test(ch)) {
      continue;
    }
    result += ch;
  }
  return result;
}

/**
 * 判定に使う文字列（誤検知しやすい語をあらかじめ除去）。
 * 取り除いた跡には区切りを入れ、前後がつながって別の語に化けるのを防ぐ。
 */
const SEPARATOR = "\u0000";

function prepare(text: string): string {
  let prepared = normalizeInternal(text);
  for (const phrase of ALLOW_PHRASES) {
    prepared = prepared.split(normalizeForCheck(phrase)).join(SEPARATOR);
  }
  return prepared;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const KANJI = /[一-鿿]/;

/**
 * 語が含まれるか。伏せ字（穴）は任意の1文字として扱う。
 * ただし穴だらけの文字列がたまたま一致しないよう、
 *   ・穴は語の半分まで
 *   ・2文字の語は見えている側が漢字のときだけ（「痴●」は拾い、「★か」は拾わない）
 * とする。
 */
function includesWord(prepared: string, word: string): boolean {
  if (prepared.includes(word)) return true;
  if (!prepared.includes(MASK)) return false;
  if (word.length < 2) return false;
  if (word.length === 2 && !KANJI.test(word)) return false;

  const pattern = new RegExp(
    Array.from(word).map((c) => `[${escapeRegExp(c)}${MASK}]`).join("")
  );
  const matched = prepared.match(pattern);
  if (!matched) return false;

  const holes = Array.from(matched[0]).filter((c) => c === MASK).length;
  if (holes === 0 || holes * 2 > word.length) return holes === 0;
  if (word.length === 2) {
    // 2文字の語は「痴●」のように頭が見えているときだけ拾う。
    // 「●人」で伏せ字にした人名まで巻き込まないため
    if (matched[0].startsWith(MASK)) return false;
    if (!KANJI.test(matched[0].split(MASK).join(""))) return false;
  }
  return true;
}

function countMatches(prepared: string, words: string[]): number {
  let count = 0;
  for (const word of words) {
    if (includesWord(prepared, normalizeForCheck(word))) count += 1;
  }
  return count;
}

/**
 * 本文を判定する。block が1件でもあれば block を返す。
 */
export function checkText(text: string): NgCheckResult {
  // 除外語で守る前に、優先して止める語を見る
  const raw = normalizeInternal(text);
  const priority = countMatches(raw, PRIORITY_BLOCK_WORDS);
  if (priority > 0) return { level: "block", count: priority };

  const prepared = prepare(text);
  if (!prepared) return { level: null, count: 0 };

  if (EXACT_BLOCK_WORDS.includes(prepared)) {
    return { level: "block", count: 1 };
  }

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
