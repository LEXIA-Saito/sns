import Feed from "@/components/Feed";
import OpeningAnimation from "@/components/OpeningAnimation";

export default function Home() {
  return (
    <>
      {/* 起動時のオープニング。同じタブでは初回のみ。フィードの上に重ねて自分で消える */}
      <OpeningAnimation />
      <Feed />
    </>
  );
}
