/**
 * 26ロゴ（public/26logo.glb）の3D表示。
 *
 * three.js は gzip後でも150KB前後あるので、3Dを実際に出す瞬間まで読み込まない。
 * このファイルを import した時点では何も起きず、mountLogo3D() を呼んで初めて
 * three.js 本体と glb を取りに行く。
 *
 * glb はモジュール内で1回だけ読み、オープニングと読み込み中の表示で使い回す。
 */

import type * as THREE_NS from "three";

/** opening: 回り込んで正面で止まる / spin: ずっとゆっくり回り続ける */
export type Logo3DVariant = "opening" | "spin";

export interface MountLogo3DOptions {
  variant: Logo3DVariant;
  /** モデルを描き終えた時に1度だけ呼ばれる（静止画から差し替える合図に使う） */
  onReady?: () => void;
}

export interface Logo3DHandle {
  dispose: () => void;
}

const MODEL_URL = "/26logo.glb";

/** 正面に落ち着くまでの秒数 */
const OPENING_SPIN_SEC = 1.8;

type ThreeModule = typeof THREE_NS;

let threePromise: Promise<{
  THREE: ThreeModule;
  GLTFLoader: typeof import("three/examples/jsm/loaders/GLTFLoader.js").GLTFLoader;
}> | null = null;

let binaryPromise: Promise<ArrayBuffer> | null = null;

function loadThree() {
  threePromise ??= (async () => {
    const [THREE, { GLTFLoader }] = await Promise.all([
      import("three"),
      import("three/examples/jsm/loaders/GLTFLoader.js"),
    ]);
    return { THREE, GLTFLoader };
  })();
  return threePromise;
}

/**
 * glb を読み込み、中心を原点・最大辺を1に正規化したモデルを返す。
 * Blenderからの書き出しは実寸13cm相当・原点が隅にあるので、そのままだと画面に収まらない。
 *
 * ジオメトリやテクスチャはWebGLコンテキストごとにGPUへ載せるものなので、
 * オープニングと読み込み中で同じオブジェクトを使い回すと描画が壊れる
 * （glDrawElements: Must have element array buffer bound）。
 * 通信を増やさないために取得した中身だけ使い回し、解析は表示のたびに行う。
 */
async function loadModel() {
  const { THREE, GLTFLoader } = await loadThree();
  binaryPromise ??= fetch(MODEL_URL).then((res) => {
    if (!res.ok) throw new Error(`26logo.glb を取得できません (${res.status})`);
    return res.arrayBuffer();
  });

  const gltf = await new GLTFLoader().parseAsync(await binaryPromise, "");
  const root = gltf.scene;

  root.traverse((obj) => {
    const mesh = obj as THREE_NS.Mesh;
    if (!mesh.isMesh) return;
    const material = mesh.material as THREE_NS.MeshStandardMaterial;
    if (!material) return;
    // テクスチャは8割が完全透明のくり抜き。半透明合成にすると
    // 裏表の描画順が崩れて面が消えるので、閾値で抜いて深度を書かせる
    material.transparent = false;
    material.alphaTest = 0.5;
    material.depthWrite = true;
    material.side = THREE.DoubleSide;
    if (material.map) {
      material.map.anisotropy = 4;
      // ロゴの赤は暗く、黒地の配色だとライトを当てただけでは沈む。
      // 同じテクスチャを発光にも使い、自分で光らせて輪郭を出す
      material.emissive = new THREE.Color(0xffffff);
      material.emissiveMap = material.map;
      material.emissiveIntensity = 0.55;
    }
  });

  const box = new THREE.Box3().setFromObject(root);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  root.position.sub(center);

  const model = new THREE.Group();
  model.add(root);
  model.scale.setScalar(1 / Math.max(size.x, size.y, size.z));
  return model as THREE_NS.Object3D;
}

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

/**
 * canvas に3Dロゴを描き始める。
 * WebGLが使えない・glbが落ちてこない場合は reject するので、呼び出し側で静止画に逃がすこと。
 */
export async function mountLogo3D(
  canvas: HTMLCanvasElement,
  { variant, onReady }: MountLogo3DOptions
): Promise<Logo3DHandle> {
  const { THREE } = await loadThree();

  // 正規化済みモデルの scale には「最大辺を1にする倍率」が入っている。
  // 演出で拡大縮小するとそれを壊すので、外側にpivotを1枚かぶせてそちらを動かす
  const pivot = new THREE.Group();
  pivot.add(await loadModel());

  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
    powerPreference: "low-power",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const scene = new THREE.Scene();
  scene.add(pivot);

  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
  camera.position.set(0, 0, 1.8);

  // 金属ではなく紙のような質感のモデルなので、環境光多め＋正面キー＋後ろからの縁取り
  scene.add(new THREE.HemisphereLight(0xffffff, 0x1a1a1a, 2.2));
  const key = new THREE.DirectionalLight(0xffffff, 3.2);
  key.position.set(2, 3, 4);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xfff0f0, 1.4);
  rim.position.set(-3, -1, -2);
  scene.add(rim);

  const resize = () => {
    const w = canvas.clientWidth || 1;
    const h = canvas.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // 縦長・横長どちらでもロゴが切れないように、細い方に合わせて引く
    camera.position.z = camera.aspect < 1 ? 1.8 / camera.aspect : 1.8;
    camera.updateProjectionMatrix();
  };
  resize();

  const observer = new ResizeObserver(resize);
  if (canvas.parentElement) observer.observe(canvas.parentElement);

  const clock = new THREE.Clock();
  let frame = 0;
  let notified = false;

  const tick = () => {
    frame = requestAnimationFrame(tick);
    const t = clock.getElapsedTime();

    if (variant === "spin") {
      pivot.rotation.y = t * 1.5;
      pivot.rotation.x = 0.12 + Math.sin(t * 0.9) * 0.06;
    } else if (t < OPENING_SPIN_SEC) {
      // 奥から1回転して正面まで回り込む
      const e = easeOutCubic(t / OPENING_SPIN_SEC);
      pivot.rotation.y = -Math.PI * 2 * (1 - e);
      pivot.rotation.x = 0.45 * (1 - e) + 0.06;
      pivot.position.z = -0.5 * (1 - e);
      pivot.scale.setScalar(0.8 + 0.2 * e);
    } else {
      // 止まったあとは呼吸するように揺らし続ける（完全静止だと画像に見える）
      const idle = t - OPENING_SPIN_SEC;
      pivot.rotation.y = Math.sin(idle * 0.9) * 0.14;
      pivot.rotation.x = 0.06 + Math.sin(idle * 0.6) * 0.03;
      pivot.position.z = 0;
      pivot.scale.setScalar(1);
    }

    renderer.render(scene, camera);

    if (!notified) {
      notified = true;
      onReady?.();
    }
  };

  if (variant === "opening") {
    pivot.scale.setScalar(0.8);
    pivot.position.z = -0.5;
  }

  tick();

  return {
    dispose: () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      // この表示専用に解析したモデルなので、GPU上のものごと片付ける
      pivot.traverse((obj) => {
        const mesh = obj as THREE_NS.Mesh;
        if (!mesh.isMesh) return;
        mesh.geometry?.dispose();
        const material = mesh.material as THREE_NS.MeshStandardMaterial;
        material?.map?.dispose();
        material?.dispose();
      });
      // ブラウザが同時に持てるWebGLコンテキストは十数個しかないので、
      // 表示をやめたらすぐ手放す
      renderer.forceContextLoss();
      renderer.dispose();
    },
  };
}
