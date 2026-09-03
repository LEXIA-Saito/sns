/**
 * 写真ダウンロード用のファイル名整形および、
 * 外部ライブラリなしでブラウザ/Nodeで動く純粋なZIP生成ヘルパー
 */

/**
 * 写真ダウンロード用のファイル名生成
 * 形式: accountId_氏名_YYYYMMDD-HHmm_連番.拡張子
 */
export function formatPhotoFileName(
  accountId: string,
  name: string,
  createdAt: number,
  index: number,
  originalUrlOrPath: string = ""
): string {
  const safeId = (accountId || "unknown").replace(/[^\w-]/g, "");
  const safeName = (name || "名前未設定").replace(/[\s　/\\:?*"<>|]/g, "");

  // 日時 YYYYMMDD-HHmm (JST)
  const d = new Date(createdAt);
  const jst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  const y = jst.getUTCFullYear();
  const m = String(jst.getUTCMonth() + 1).padStart(2, "0");
  const day = String(jst.getUTCDate()).padStart(2, "0");
  const h = String(jst.getUTCHours()).padStart(2, "0");
  const min = String(jst.getUTCMinutes()).padStart(2, "0");
  const dateStr = `${y}${m}${day}-${h}${min}`;

  const numStr = String(index).padStart(2, "0");

  // 拡張子の抽出
  let ext = "jpg";
  const cleanUrl = originalUrlOrPath.split("?")[0] || "";
  const match = cleanUrl.match(/\.([a-zA-Z0-9]+)$/);
  if (match && match[1]) {
    const rawExt = match[1].toLowerCase();
    if (["jpg", "jpeg", "png", "webp", "gif"].includes(rawExt)) {
      ext = rawExt === "jpeg" ? "jpg" : rawExt;
    }
  }

  return `${safeId}_${safeName}_${dateStr}_${numStr}.${ext}`;
}

// -------------------------------------------------------------
// 外部ライブラリ不要の軽量 Store (非圧縮) ZIP 生成
// -------------------------------------------------------------

// CRC32 計算用テーブル
const crcTable = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  crcTable[i] = c;
}

function crc32(buf: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

export interface ZipFileEntry {
  name: string;
  data: Uint8Array;
}

/**
 * 複数のファイルを1つのZIPバイナリ（Uint8Array）にまとめる（Store方式・圧縮なし）
 */
export function createZipArchive(files: ZipFileEntry[]): Uint8Array {
  const encoder = new TextEncoder();
  const localHeaders: Uint8Array[] = [];
  const centralHeaders: Uint8Array[] = [];
  let offset = 0;

  for (const file of files) {
    const nameBytes = encoder.encode(file.name);
    const dataBytes = file.data;
    const crc = crc32(dataBytes);
    const size = dataBytes.length;

    // Local file header (30 bytes + filename + data)
    const localHeader = new Uint8Array(30 + nameBytes.length);
    const lv = new DataView(localHeader.buffer);
    lv.setUint32(0, 0x04034b50, true); // signature
    lv.setUint16(4, 20, true); // version needed
    lv.setUint16(6, 0x0800, true); // flags (UTF-8)
    lv.setUint16(8, 0, true); // compression method (0 = store)
    lv.setUint16(10, 0, true); // mod time
    lv.setUint16(12, 0, true); // mod date
    lv.setUint32(14, crc, true); // crc-32
    lv.setUint32(18, size, true); // compressed size
    lv.setUint32(22, size, true); // uncompressed size
    lv.setUint16(26, nameBytes.length, true); // filename length
    lv.setUint16(28, 0, true); // extra field length
    localHeader.set(nameBytes, 30);

    localHeaders.push(localHeader, dataBytes);

    // Central directory header (46 bytes + filename)
    const centralHeader = new Uint8Array(46 + nameBytes.length);
    const cv = new DataView(centralHeader.buffer);
    cv.setUint32(0, 0x02014b50, true); // signature
    cv.setUint16(4, 20, true); // version made by
    cv.setUint16(6, 20, true); // version needed
    cv.setUint16(8, 0x0800, true); // flags (UTF-8)
    cv.setUint16(10, 0, true); // compression method (0 = store)
    cv.setUint16(12, 0, true); // mod time
    cv.setUint16(14, 0, true); // mod date
    cv.setUint32(16, crc, true); // crc-32
    cv.setUint32(20, size, true); // compressed size
    cv.setUint32(24, size, true); // uncompressed size
    cv.setUint16(28, nameBytes.length, true); // filename length
    cv.setUint16(30, 0, true); // extra field length
    cv.setUint16(32, 0, true); // comment length
    cv.setUint16(34, 0, true); // disk number start
    cv.setUint16(36, 0, true); // internal file attributes
    cv.setUint32(38, 0, true); // external file attributes
    cv.setUint32(42, offset, true); // relative offset of local header
    centralHeader.set(nameBytes, 46);

    centralHeaders.push(centralHeader);

    offset += localHeader.length + dataBytes.length;
  }

  const centralOffset = offset;
  let centralSize = 0;
  for (const ch of centralHeaders) centralSize += ch.length;

  // End of central directory record (22 bytes)
  const eocd = new Uint8Array(22);
  const ev = new DataView(eocd.buffer);
  ev.setUint32(0, 0x06054b50, true); // signature
  ev.setUint16(4, 0, true); // disk number
  ev.setUint16(6, 0, true); // disk with central directory
  ev.setUint16(8, files.length, true); // total entries on disk
  ev.setUint16(10, files.length, true); // total entries
  ev.setUint32(12, centralSize, true); // size of central directory
  ev.setUint32(16, centralOffset, true); // offset of central directory
  ev.setUint16(20, 0, true); // comment length

  // 合計バッファの結合
  let totalLength = offset + centralSize + 22;
  const result = new Uint8Array(totalLength);
  let pos = 0;
  for (const part of [...localHeaders, ...centralHeaders, eocd]) {
    result.set(part, pos);
    pos += part.length;
  }

  return result;
}
