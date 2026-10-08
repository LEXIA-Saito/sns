import type { ComponentType, SVGProps } from "react";
import { ArrowLeft as LibArrowLeft } from "pixelarticons/react/ArrowLeft.js";
import { Calendar as LibCalendar } from "pixelarticons/react/Calendar.js";
import { Camera as LibCamera } from "pixelarticons/react/Camera.js";
import { ChartLine as LibChartLine } from "pixelarticons/react/ChartLine.js";
import { Check as LibCheck } from "pixelarticons/react/Check.js";
import { ChevronLeft as LibChevronLeft } from "pixelarticons/react/ChevronLeft.js";
import { ChevronRight as LibChevronRight } from "pixelarticons/react/ChevronRight.js";
import { Clock as LibClock } from "pixelarticons/react/Clock.js";
import { Close as LibClose } from "pixelarticons/react/Close.js";
import { Collapse as LibCollapse } from "pixelarticons/react/Collapse.js";
import { Crown as LibCrown } from "pixelarticons/react/Crown.js";
import { Database as LibDatabase } from "pixelarticons/react/Database.js";
import { Download as LibDownload } from "pixelarticons/react/Download.js";
import { Expand as LibExpand } from "pixelarticons/react/Expand.js";
import { Eye as LibEye } from "pixelarticons/react/Eye.js";
import { EyeOff as LibEyeOff } from "pixelarticons/react/EyeOff.js";
import { Fire as LibFire } from "pixelarticons/react/Fire.js";
import { Grid3x3 as LibGrid3x3 } from "pixelarticons/react/Grid3x3.js";
import { Image as LibImage } from "pixelarticons/react/Image.js";
import { Heart as LibHeart } from "pixelarticons/react/Heart.js";
import { Key as LibKey } from "pixelarticons/react/Key.js";
import { Leaf as LibLeaf } from "pixelarticons/react/Leaf.js";
import { Loader as LibLoader } from "pixelarticons/react/Loader.js";
import { Lock as LibLock } from "pixelarticons/react/Lock.js";
import { Login as LibLogin } from "pixelarticons/react/Login.js";
import { Logout as LibLogout } from "pixelarticons/react/Logout.js";
import { MapPin as LibMapPin } from "pixelarticons/react/MapPin.js";
import { MemoryStick as LibMemoryStick } from "pixelarticons/react/MemoryStick.js";
import { Message as LibMessage } from "pixelarticons/react/Message.js";
import { Pause as LibPause } from "pixelarticons/react/Pause.js";
import { PenSquare as LibPenSquare } from "pixelarticons/react/PenSquare.js";
import { Pencil as LibPencil } from "pixelarticons/react/Pencil.js";
import { Play as LibPlay } from "pixelarticons/react/Play.js";
import { QrCode as LibQrCode } from "pixelarticons/react/QrCode.js";
import { Save as LibSave } from "pixelarticons/react/Save.js";
import { ScanBarcode as LibScanBarcode } from "pixelarticons/react/ScanBarcode.js";
import { Search as LibSearch } from "pixelarticons/react/Search.js";
import { Send as LibSend } from "pixelarticons/react/Send.js";
import { Server as LibServer } from "pixelarticons/react/Server.js";
import { Shield as LibShield } from "pixelarticons/react/Shield.js";
import { Sparkles as LibSparkles } from "pixelarticons/react/Sparkles.js";
import { Star as LibStar } from "pixelarticons/react/Star.js";
import { Trash as LibTrash } from "pixelarticons/react/Trash.js";
import { Tree as LibTree } from "pixelarticons/react/Tree.js";
import { Tv as LibTv } from "pixelarticons/react/Tv.js";
import { Users as LibUsers } from "pixelarticons/react/Users.js";
import { Video as LibVideo } from "pixelarticons/react/Video.js";
import { WarningDiamond as LibWarningDiamond } from "pixelarticons/react/WarningDiamond.js";

/**
 * アプリ内のアイコンはすべて pixelarticons（24x24のドット絵アイコン、MIT）を使う。
 * 画面側は <PixelXxx size={16} /> の形で呼ぶ。色は currentColor。
 * 新しいアイコンが要るときは、ここに1行足してから使う。
 */
export interface PixelIconProps extends SVGProps<SVGSVGElement> {
  size?: number | string;
}

type LibIcon = ComponentType<SVGProps<SVGSVGElement>>;

function wrap(Icon: LibIcon, label: string) {
  function PixelIcon({ size = 16, className = "", ...props }: PixelIconProps) {
    return (
      <Icon
        width={size}
        height={size}
        className={className}
        shapeRendering="crispEdges"
        aria-hidden="true"
        {...props}
      />
    );
  }
  PixelIcon.displayName = label;
  return PixelIcon;
}

export const PixelImage = wrap(LibImage, "PixelImage");
export const PixelHeart = wrap(LibHeart, "PixelHeart");
export const PixelComment = wrap(LibMessage, "PixelComment");
export const PixelPen = wrap(LibPencil, "PixelPen");
export const PixelCamera = wrap(LibCamera, "PixelCamera");
export const PixelTrash = wrap(LibTrash, "PixelTrash");
export const PixelEdit = wrap(LibPenSquare, "PixelEdit");
export const PixelX = wrap(LibClose, "PixelX");
export const PixelShield = wrap(LibShield, "PixelShield");
export const PixelTv = wrap(LibTv, "PixelTv");
export const PixelDatabase = wrap(LibDatabase, "PixelDatabase");
export const PixelQrCode = wrap(LibQrCode, "PixelQrCode");
export const PixelSend = wrap(LibSend, "PixelSend");
export const PixelEye = wrap(LibEye, "PixelEye");
export const PixelEyeOff = wrap(LibEyeOff, "PixelEyeOff");
export const PixelLogOut = wrap(LibLogout, "PixelLogOut");
export const PixelSparkle = wrap(LibSparkles, "PixelSparkle");
export const PixelFilm = wrap(LibVideo, "PixelFilm");
export const PixelLogIn = wrap(LibLogin, "PixelLogIn");
export const PixelKey = wrap(LibKey, "PixelKey");
export const PixelWarning = wrap(LibWarningDiamond, "PixelWarning");
export const PixelArrowLeft = wrap(LibArrowLeft, "PixelArrowLeft");
export const PixelCalendar = wrap(LibCalendar, "PixelCalendar");
export const PixelCheck = wrap(LibCheck, "PixelCheck");
export const PixelChevronLeft = wrap(LibChevronLeft, "PixelChevronLeft");
export const PixelChevronRight = wrap(LibChevronRight, "PixelChevronRight");
export const PixelClock = wrap(LibClock, "PixelClock");
export const PixelDownload = wrap(LibDownload, "PixelDownload");
export const PixelSpreadsheet = wrap(LibGrid3x3, "PixelSpreadsheet");
export const PixelLoader = wrap(LibLoader, "PixelLoader");
export const PixelLock = wrap(LibLock, "PixelLock");
export const PixelExpand = wrap(LibExpand, "PixelExpand");
export const PixelCollapse = wrap(LibCollapse, "PixelCollapse");
export const PixelPause = wrap(LibPause, "PixelPause");
export const PixelPlay = wrap(LibPlay, "PixelPlay");
export const PixelPin = wrap(LibMapPin, "PixelPin");
export const PixelPinOff = wrap(LibClose, "PixelPinOff");
export const PixelSave = wrap(LibSave, "PixelSave");
export const PixelScan = wrap(LibScanBarcode, "PixelScan");
export const PixelSearch = wrap(LibSearch, "PixelSearch");
export const PixelServer = wrap(LibServer, "PixelServer");
export const PixelUsers = wrap(LibUsers, "PixelUsers");
export const PixelChart = wrap(LibChartLine, "PixelChart");
export const PixelStorage = wrap(LibMemoryStick, "PixelStorage");
export const PixelLeaf = wrap(LibLeaf, "PixelLeaf");
export const PixelTree = wrap(LibTree, "PixelTree");
export const PixelFire = wrap(LibFire, "PixelFire");
export const PixelStar = wrap(LibStar, "PixelStar");
export const PixelCrown = wrap(LibCrown, "PixelCrown");
