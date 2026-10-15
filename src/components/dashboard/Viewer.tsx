import { useEffect, useRef, type RefObject } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import type { CornerState } from '../../engine/types';
import type { Theme } from '../../state/theme';

/** Same-origin copy first; GitHub raw (pinned to the commit that added it, so it never moves) as fallback. */
export const MODEL_URLS = [
  '/models/rb22.glb',
  'https://raw.githubusercontent.com/roshan-ds-tech/f1/bbc28fcfe1fbb1c5c2da524c8b84ffb1f07cd4b1/2026_redbull_rb22.glb',
];
export type Corner = CornerState['corner'];
export type Slot = 'tl' | 'tr' | 'bl' | 'br';
export type ViewerStatus = { state: 'loading' | 'ready' | 'error'; progress: number; loaded: number; error: string };

interface Wheel { c: THREE.Vector3; r: number; w: number }
interface Ctx {
  r: THREE.WebGLRenderer; scene: THREE.Scene; cam: THREE.PerspectiveCamera; ctr: OrbitControls;
  hemi: THREE.HemisphereLight; key: THREE.DirectionalLight; rim: THREE.DirectionalLight; rim2: THREE.DirectionalLight;
  ground: THREE.Mesh<THREE.PlaneGeometry, THREE.ShadowMaterial>;
  wheels: Partial<Record<Corner, Wheel>>; rings: Partial<Record<Corner, THREE.Mesh>>;
  home?: { pos: THREE.Vector3; tgt: THREE.Vector3 }; fit: number;
}

export interface ViewerApi { zoom(f: number): void; reset(): void }

function tyrePts(root: THREE.Object3D) {
  const pts: THREE.Vector3[] = [], v = new THREE.Vector3();
  root.traverse(o => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    const mats = ([] as THREE.Material[]).concat(m.material);
    if (!mats.some(x => /sidewall|tyre|tire/i.test(x.name || ''))) return;
    const p = m.geometry.attributes.position;
    const st = Math.max(1, Math.floor(p.count / 5000));
    for (let i = 0; i < p.count; i += st) pts.push(v.fromBufferAttribute(p, i).applyMatrix4(m.matrixWorld).clone());
  });
  return pts;
}
function cluster(pts: THREE.Vector3[], la: 'x' | 'z', wa: 'x' | 'z') {
  const b = new THREE.Box3().setFromPoints(pts), c = b.getCenter(new THREE.Vector3());
  const cl: Record<string, THREE.Box3> = {};
  pts.forEach(p => { const k = (p[la] > c[la] ? '1' : '0') + (p[wa] > c[wa] ? '1' : '0'); (cl[k] ||= new THREE.Box3()).expandByPoint(p); });
  return cl;
}

/**
 * RB22 GLB viewer, ported from the design's initViewer/onModel. Wheel screen positions are
 * written into `slots` each frame so the tyre cards can draw leader lines.
 */
export function Viewer({ theme, autoRotate, selected, apiRef, onStatus, onFrame }: {
  theme: Theme; autoRotate: boolean; selected: Corner | null; attempt: number;
  apiRef: RefObject<ViewerApi | null>;
  onStatus(s: ViewerStatus): void;
  onFrame(pos: Partial<Record<Corner, { x: number; y: number }>>, w: number, h: number): void;
}) {
  const mount = useRef<HTMLDivElement>(null);
  const ctx = useRef<Ctx | null>(null);
  const frameCb = useRef(onFrame); frameCb.current = onFrame;
  const statusCb = useRef(onStatus); statusCb.current = onStatus;

  useEffect(() => {
    const el = mount.current;
    if (!el) return;
    let dead = false, raf = 0;
    statusCb.current({ state: 'loading', progress: 0, loaded: 0, error: '' });
    let r: THREE.WebGLRenderer;
    try {
      r = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      statusCb.current({ state: 'error', progress: 0, loaded: 0, error: 'WebGL is not available in this browser.' });
      return;
    }
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    r.outputColorSpace = THREE.SRGBColorSpace; r.toneMapping = THREE.ACESFilmicToneMapping;
    r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap;
    r.domElement.style.cssText = 'width:100%;height:100%;display:block;outline:none;cursor:grab;touch-action:none';
    el.appendChild(r.domElement);
    const scene = new THREE.Scene();
    const pm = new THREE.PMREMGenerator(r);
    scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
    const cam = new THREE.PerspectiveCamera(26, 1, 0.1, 200);
    const ctr = new OrbitControls(cam, r.domElement);
    Object.assign(ctr, { enableDamping: true, dampingFactor: .08, enablePan: false, minPolarAngle: .35, maxPolarAngle: 1.5, rotateSpeed: .6, autoRotateSpeed: .5, minDistance: 7, maxDistance: 28, zoomSpeed: .6 });
    const hemi = new THREE.HemisphereLight(0xffffff, 0xd8dde4, .6); scene.add(hemi);
    const key = new THREE.DirectionalLight(0xffffff, 2); key.position.set(3, 8, 4); key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048); key.shadow.radius = 6; key.shadow.bias = -0.0004;
    Object.assign(key.shadow.camera, { left: -5, right: 5, top: 5, bottom: -5, near: .5, far: 30 }); scene.add(key);
    const rim = new THREE.DirectionalLight(0xff2a1f, 0); rim.position.set(-6, 2.5, 3); scene.add(rim);
    const rim2 = new THREE.DirectionalLight(0xff2a1f, 0); rim2.position.set(4, 1.2, -6); scene.add(rim2);
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.ShadowMaterial({ opacity: .2 }));
    ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
    const c: Ctx = { r, scene, cam, ctr, hemi, key, rim, rim2, ground, wheels: {}, rings: {}, fit: 11 };
    ctx.current = c;

    const setHome = () => {
      const dir = new THREE.Vector3(.86, .4, -.78).normalize(), tgt = new THREE.Vector3(0, .5, 0);
      c.home = { pos: dir.multiplyScalar(c.fit).add(tgt), tgt };
      cam.position.copy(c.home.pos); ctr.target.copy(tgt); ctr.update();
    };
    const resize = () => {
      const w = el.clientWidth, h = el.clientHeight;
      if (w < 10 || h < 10) return;
      r.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix();
      const hf = Math.atan(Math.tan(13 * Math.PI / 180) * cam.aspect);
      c.fit = Math.min(26, Math.max(10, (5.2 / (w < 760 ? .94 : w < 900 ? .9 : .84)) / (2 * Math.tan(hf))));
    };
    const ro = new ResizeObserver(resize); ro.observe(el); resize(); setHome();
    r.domElement.addEventListener('pointerdown', () => { r.domElement.style.cursor = 'grabbing'; });
    const up = () => { r.domElement.style.cursor = 'grab'; };
    window.addEventListener('pointerup', up);

    apiRef.current = {
      zoom: (f: number) => {
        const off = cam.position.clone().sub(ctr.target);
        cam.position.copy(ctr.target).add(off.setLength(Math.min(ctr.maxDistance, Math.max(ctr.minDistance, off.length() * f))));
      },
      reset: () => setHome(),
    };

    const loop = () => {
      if (dead) return;
      raf = requestAnimationFrame(loop);
      ctr.update(); r.render(scene, cam);
      const W = el.clientWidth, H = el.clientHeight;
      const out: Partial<Record<Corner, { x: number; y: number }>> = {};
      (Object.keys(c.wheels) as Corner[]).forEach(k => {
        const p = c.wheels[k]!.c.clone().project(cam);
        out[k] = { x: (p.x + 1) / 2 * W, y: (1 - p.y) / 2 * H };
      });
      if (Object.keys(out).length) frameCb.current(out, W, H);
    };
    loop();

    const onModel = (g: { scene: THREE.Group }) => {
      if (dead) return;
      const model = g.scene;
      model.traverse(o => { const m = o as THREE.Mesh; if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
      const wrap = new THREE.Group(); wrap.add(model);
      let box = new THREE.Box3().setFromObject(wrap), size = box.getSize(new THREE.Vector3());
      wrap.scale.setScalar(5 / Math.max(size.x, size.z)); wrap.updateMatrixWorld(true);
      box = new THREE.Box3().setFromObject(wrap); size = box.getSize(new THREE.Vector3());
      const la: 'x' | 'z' = size.x > size.z ? 'x' : 'z', wa: 'x' | 'z' = la === 'x' ? 'z' : 'x';
      let pts = tyrePts(wrap), sign = 1;
      if (pts.length > 40) {
        const cl = cluster(pts, la, wa);
        const wid = (k: string) => cl[k] ? cl[k].getSize(new THREE.Vector3())[wa] : 0;
        const w1 = (wid('10') + wid('11')) / 2, w0 = (wid('00') + wid('01')) / 2;
        if (Math.abs(w1 - w0) > .001) sign = w1 < w0 ? 1 : -1;
      }
      const f = la === 'x' ? { x: sign, z: 0 } : { x: 0, z: sign };
      wrap.rotation.y = Math.atan2(f.z, f.x); wrap.updateMatrixWorld(true);
      box = new THREE.Box3().setFromObject(wrap);
      const cen = box.getCenter(new THREE.Vector3());
      wrap.position.set(-cen.x, -box.min.y, -cen.z); wrap.updateMatrixWorld(true);
      scene.add(wrap);
      box = new THREE.Box3().setFromObject(wrap); size = box.getSize(new THREE.Vector3());
      pts = tyrePts(wrap);
      const W: Partial<Record<Corner, Wheel>> = {};
      if (pts.length > 40) {
        Object.entries(cluster(pts, 'x', 'z')).forEach(([k, b]) => {
          const key = ((k[0] === '1' ? 'F' : 'R') + (k[1] === '0' ? 'L' : 'R')) as Corner;
          const sz = b.getSize(new THREE.Vector3());
          W[key] = { c: b.getCenter(new THREE.Vector3()), r: sz.y / 2, w: sz.z };
        });
      }
      (['FL', 'FR', 'RL', 'RR'] as Corner[]).forEach(k => {
        if (!W[k]) { const fx = k[0] === 'F' ? .36 : -.38, sz = k[1] === 'L' ? -1 : 1; W[k] = { c: new THREE.Vector3(fx * size.x, size.y * .22, sz * size.z * .4), r: size.y * .22, w: size.z * .15 }; }
      });
      c.wheels = W;
      (Object.entries(W) as [Corner, Wheel][]).forEach(([k, w]) => {
        const side = k[1] === 'L' ? -1 : 1;
        const ring = new THREE.Mesh(new THREE.TorusGeometry(w.r * 1.08, w.r * .05, 12, 72), new THREE.MeshBasicMaterial({ color: 0xff2a1f, transparent: true, opacity: .95, depthTest: false }));
        ring.position.copy(w.c).add(new THREE.Vector3(0, 0, side * w.w * .55)); ring.visible = false; ring.renderOrder = 5;
        scene.add(ring); c.rings[k] = ring;
      });
      statusCb.current({ state: 'ready', progress: 1, loaded: 0, error: '' });
    };
    const tryLoad = (i: number) => {
      new GLTFLoader().load(MODEL_URLS[i], onModel, x => {
        if (!dead) statusCb.current({ state: 'loading', progress: x.total ? x.loaded / x.total : 0, loaded: x.loaded, error: '' });
      }, err => {
        if (dead) return;
        console.warn(`[PITWISE] 3D model failed from ${MODEL_URLS[i]}`, err);
        if (i + 1 < MODEL_URLS.length) { statusCb.current({ state: 'loading', progress: 0, loaded: 0, error: '' }); tryLoad(i + 1); }
        else statusCb.current({ state: 'error', progress: 0, loaded: 0, error: 'The model file could not be downloaded.' });
      });
    };
    tryLoad(0);

    return () => {
      dead = true; cancelAnimationFrame(raf); ro.disconnect(); window.removeEventListener('pointerup', up);
      ctr.dispose(); r.dispose(); r.domElement.remove(); ctx.current = null; apiRef.current = null;
    };
  }, [apiRef]);

  useEffect(() => {
    const c = ctx.current; if (!c) return;
    const d = theme === 'dark';
    c.r.toneMappingExposure = d ? .9 : 1.05; c.scene.environmentIntensity = d ? .35 : 1;
    c.hemi.intensity = d ? .12 : .6; c.hemi.groundColor.set(d ? 0x111111 : 0xd8dde4);
    c.key.intensity = d ? 1.3 : 2.1; c.rim.intensity = d ? 3.2 : 0; c.rim2.intensity = d ? 2.2 : 0;
    c.ground.material.opacity = d ? .6 : .2;
  });
  useEffect(() => { if (ctx.current) ctx.current.ctr.autoRotate = autoRotate; }, [autoRotate]);
  useEffect(() => {
    const c = ctx.current; if (!c) return;
    (Object.entries(c.rings) as [Corner, THREE.Mesh][]).forEach(([k, ring]) => { ring.visible = k === selected; });
  });

  return <div ref={mount} style={{ position: 'absolute', inset: 0 }} />;
}
