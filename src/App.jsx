import { Canvas, useFrame } from '@react-three/fiber';
import { Sky, ContactShadows } from '@react-three/drei';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';

const WHEAT = new THREE.Vector3(12, 0, -7);
const TRAINING_POST = new THREE.Vector3(-7, 0, -2);
const WORLD_LIMIT = 48;

function seededRandom(seed) {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

function makeGroundTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 512;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#b78c50';
  ctx.fillRect(0, 0, 512, 512);
  const random = seededRandom(27);
  for (let i = 0; i < 26000; i++) {
    const x = random() * 512;
    const y = random() * 512;
    const r = 0.35 + random() * 2.2;
    const tone = random();
    ctx.fillStyle = tone > 0.52 ? 'rgba(70,44,24,0.11)' : 'rgba(255,220,151,0.14)';
    ctx.beginPath();
    ctx.ellipse(x, y, r * (1.2 + random()), r * 0.7, random() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }
  for (let i = 0; i < 340; i++) {
    const x = random() * 512, y = random() * 512;
    ctx.strokeStyle = 'rgba(65,47,29,0.10)';
    ctx.lineWidth = 0.6 + random();
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + (random() - 0.5) * 14, y + 2 + random() * 7);
    ctx.stroke();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(18, 18);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

function Terrain() {
  const texture = useMemo(makeGroundTexture, []);
  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(170, 170, 140, 140);
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i);
      const ridge = Math.max(0, (Math.abs(x) - 35) / 22) * 2.1 +
        Math.max(0, (Math.abs(y) - 35) / 23) * 1.7;
      const undulation = Math.sin(x * 0.075) * Math.cos(y * 0.063) * 0.22 +
        Math.sin((x + y) * 0.11) * 0.08;
      p.setZ(i, ridge + undulation);
    }
    geo.computeVertexNormals();
    return geo;
  }, []);
  return <mesh geometry={geometry} rotation-x={-Math.PI / 2} receiveShadow>
    <meshStandardMaterial map={texture} color="#d4b078" roughness={1} />
  </mesh>;
}

function Mountain({ position, scale = [1, 1, 1], color = '#82715e' }) {
  const geo = useMemo(() => {
    const g = new THREE.ConeGeometry(10, 18, 11, 4);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const f = 1 + 0.07 * Math.sin(i * 12.9898);
      p.setX(i, p.getX(i) * f);
      p.setZ(i, p.getZ(i) * f);
    }
    g.computeVertexNormals();
    return g;
  }, []);
  return <group position={position} scale={scale}>
    <mesh geometry={geo} position={[0, 7, 0]} castShadow receiveShadow>
      <meshStandardMaterial color={color} roughness={1} flatShading />
    </mesh>
    <mesh geometry={geo} position={[6, 4, 2]} scale={[0.7, 0.74, 0.85]} castShadow>
      <meshStandardMaterial color="#9b8063" roughness={1} flatShading />
    </mesh>
    <mesh geometry={geo} position={[-7, 2, -1]} scale={[0.62, 0.58, 0.72]} castShadow>
      <meshStandardMaterial color="#75624f" roughness={1} flatShading />
    </mesh>
  </group>;
}

function PathRibbon() {
  const geometry = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-3, 0, 20),
      new THREE.Vector3(-1, 0, 14),
      new THREE.Vector3(-5, 0, 7),
      new THREE.Vector3(-1, 0, 1),
      new THREE.Vector3(1, 0, -8),
      new THREE.Vector3(-5, 0, -17),
      new THREE.Vector3(-2, 0, -28),
      new THREE.Vector3(5, 0, -38),
    ]);
    const points = curve.getPoints(110);
    const positions = [];
    const uvs = [];
    const indices = [];
    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      const tangent = curve.getTangent(i / (points.length - 1)).normalize();
      const side = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
      const width = 2.7 + Math.sin(i / points.length * Math.PI) * 0.45;
      const left = p.clone().addScaledVector(side, width);
      const right = p.clone().addScaledVector(side, -width);
      positions.push(left.x, 0.045, left.z, right.x, 0.045, right.z);
      uvs.push(0, i / 9, 1, i / 9);
      if (i < points.length - 1) {
        const n = i * 2;
        indices.push(n, n + 2, n + 1, n + 1, n + 2, n + 3);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    g.setIndex(indices);
    g.computeVertexNormals();
    return g;
  }, []);
  return <mesh geometry={geometry} receiveShadow>
    <meshStandardMaterial color="#665038" roughness={1} />
  </mesh>;
}

function StoneHouse({ position, rotation = 0, variant = 0, awning = false }) {
  const stoneRef = useRef();
  const stones = useMemo(() => {
    const rand = seededRandom(120 + variant * 71);
    const result = [];
    for (let row = 0; row < 7; row++) {
      const y = 0.22 + row * 0.37;
      const offset = row % 2 ? 0.38 : 0;
      for (let col = 0; col < 7; col++) {
        const x = -2.0 + col * 0.66 + offset;
        const w = 0.52 + rand() * 0.22;
        const h = 0.25 + rand() * 0.1;
        const tones = ['#a98d6d', '#c1a17c', '#92785e', '#b59a77', '#d0b58e'];
        result.push({ position: [x, y, 1.96 + rand() * 0.035], scale: [w, h, 0.13], color: tones[Math.floor(rand() * tones.length)] });
        result.push({ position: [x, y, -1.96 - rand() * 0.035], scale: [w, h, 0.13], color: tones[Math.floor(rand() * tones.length)] });
      }
    }
    for (let row = 0; row < 7; row++) {
      const y = 0.22 + row * 0.37;
      const offset = row % 2 ? 0.25 : 0;
      for (let col = 0; col < 6; col++) {
        const z = -1.63 + col * 0.66 + offset;
        const tones = ['#a98d6d', '#c1a17c', '#92785e', '#b59a77', '#d0b58e'];
        result.push({ position: [2.25 + rand() * 0.03, y, z], scale: [0.13, 0.27, 0.55 + rand() * 0.15], color: tones[Math.floor(rand() * tones.length)] });
        result.push({ position: [-2.25 - rand() * 0.03, y, z], scale: [0.13, 0.27, 0.55 + rand() * 0.15], color: tones[Math.floor(rand() * tones.length)] });
      }
    }
    return result;
  }, [variant]);

  useEffect(() => {
    if (!stoneRef.current) return;
    const dummy = new THREE.Object3D();
    stones.forEach((stone, index) => {
      dummy.position.set(...stone.position);
      dummy.scale.set(...stone.scale);
      dummy.rotation.y = (index % 4) * 0.008;
      dummy.updateMatrix();
      stoneRef.current.setMatrixAt(index, dummy.matrix);
      stoneRef.current.setColorAt(index, new THREE.Color(stone.color));
    });
    stoneRef.current.instanceMatrix.needsUpdate = true;
    if (stoneRef.current.instanceColor) stoneRef.current.instanceColor.needsUpdate = true;
  }, [stones]);

  return <group position={position} rotation-y={rotation}>
    <mesh position={[0, 1.38, 0]} castShadow receiveShadow>
      <boxGeometry args={[4.55, 2.76, 3.9]} />
      <meshStandardMaterial color={variant % 2 ? '#bda17c' : '#c7ad87'} roughness={1} />
    </mesh>
    <instancedMesh ref={stoneRef} args={[undefined, undefined, stones.length]} castShadow receiveShadow>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial roughness={0.98} />
    </instancedMesh>
    <mesh position={[0, 2.82, 0]} castShadow>
      <boxGeometry args={[4.8, 0.22, 4.18]} />
      <meshStandardMaterial color="#8f7658" roughness={1} />
    </mesh>
    <mesh position={[0, 2.98, -1.55]} castShadow>
      <boxGeometry args={[4.6, 0.2, 0.48]} />
      <meshStandardMaterial color="#755a3d" roughness={1} />
    </mesh>
    <group position={[0, 0.9, 1.99]}>
      <mesh castShadow><boxGeometry args={[1.1, 1.82, 0.14]} /><meshStandardMaterial color="#4c2e1d" roughness={0.9} /></mesh>
      {[-0.39, -0.13, 0.13, 0.39].map((x) => <mesh key={x} position={[x, 0, 0.085]} castShadow><boxGeometry args={[0.045, 1.7, 0.035]} /><meshStandardMaterial color="#8d623b" roughness={0.85} /></mesh>)}
      <mesh position={[0.38, 0, 0.11]}><sphereGeometry args={[0.055, 12, 10]} /><meshStandardMaterial color="#c79b50" metalness={0.55} roughness={0.38} /></mesh>
      <mesh position={[0, 0.97, 0]} castShadow><boxGeometry args={[1.32, 0.16, 0.26]} /><meshStandardMaterial color="#785637" /></mesh>
    </group>
    {[-1.37, 1.37].map((x) => <group key={x} position={[x, 1.75, 1.99]}>
      <mesh><boxGeometry args={[0.67, 0.76, 0.12]} /><meshStandardMaterial color="#493425" roughness={1} /></mesh>
      <mesh position={[0, 0, 0.075]}><boxGeometry args={[0.49, 0.57, 0.035]} /><meshStandardMaterial color="#29333a" emissive="#b97b3e" emissiveIntensity={0.12} /></mesh>
      {[-0.28, 0.28].map((dx) => <mesh key={dx} position={[dx, 0, 0.12]}><boxGeometry args={[0.075, 0.88, 0.08]} /><meshStandardMaterial color="#725135" /></mesh>)}
      <mesh position={[0, 0.41, 0.12]}><boxGeometry args={[0.7, 0.08, 0.08]} /><meshStandardMaterial color="#725135" /></mesh>
    </group>)}
    {awning && <group position={[0, 2.08, 2.15]}>
      <mesh rotation-x={-0.17} position={[0, 0, 0.58]} castShadow>
        <boxGeometry args={[2.55, 0.08, 1.35]} />
        <meshStandardMaterial color="#a75e32" roughness={1} />
      </mesh>
      {[-0.95, -0.32, 0.32, 0.95].map((x, i) => <mesh key={x} position={[x, -0.52, 1.17]} rotation-x={-0.08} castShadow>
        <boxGeometry args={[0.64, 1.02, 0.045]} />
        <meshStandardMaterial color={i % 2 ? '#d9bd8f' : '#a65731'} roughness={1} side={THREE.DoubleSide} />
      </mesh>)}
      {[-1.3, 1.3].map((x) => <mesh key={x} position={[x, -0.15, 0.75]} castShadow><cylinderGeometry args={[0.055, 0.07, 1.9, 8]} /><meshStandardMaterial color="#68462b" /></mesh>)}
    </group>}
    <mesh position={[0, 0.08, 0]}><boxGeometry args={[4.8, 0.16, 4.15]} /><meshStandardMaterial color="#94785a" roughness={1} /></mesh>
  </group>;
}

function OliveTree({ position, scale = 1, seed = 1 }) {
  const rand = useMemo(() => seededRandom(seed), [seed]);
  const clusters = useMemo(() => Array.from({ length: 11 }, (_, i) => ({
    position: [(rand() - 0.5) * 2.6, 2.15 + rand() * 1.55, (rand() - 0.5) * 1.8],
    scale: [0.7 + rand() * 0.35, 0.42 + rand() * 0.25, 0.68 + rand() * 0.38],
    color: ['#697444', '#7c8650', '#59683e', '#87905a'][Math.floor(rand() * 4)],
  })), [rand]);
  return <group position={position} scale={scale}>
    <mesh position={[0, 1.2, 0]} rotation-z={-0.08} castShadow>
      <cylinderGeometry args={[0.16, 0.34, 2.45, 12]} />
      <meshStandardMaterial color="#60422e" roughness={1} />
    </mesh>
    {[[0.3, 1.45, 0], [-0.28, 1.5, 0.1], [0.02, 1.8, -0.3], [0.12, 1.9, 0.2]].map((p, i) => <mesh key={i} position={p} rotation-z={i % 2 ? 0.35 : -0.3} castShadow><cylinderGeometry args={[0.06, 0.1, 1.4, 8]} /><meshStandardMaterial color="#6b4b30" /></mesh>)}
    {clusters.map((cluster, i) => <mesh key={i} position={cluster.position} scale={cluster.scale} castShadow receiveShadow>
      <icosahedronGeometry args={[0.82, 2]} />
      <meshStandardMaterial color={cluster.color} roughness={1} />
    </mesh>)}
  </group>;
}

function PalmTree({ position, scale = 1 }) {
  const fronds = useMemo(() => Array.from({ length: 11 }, (_, i) => i * Math.PI * 2 / 11), []);
  return <group position={position} scale={scale}>
    <mesh position={[0, 3.0, 0]} rotation-z={-0.06} castShadow>
      <cylinderGeometry args={[0.2, 0.33, 6, 12, 4]} />
      <meshStandardMaterial color="#765039" roughness={1} />
    </mesh>
    {Array.from({ length: 8 }, (_, i) => <mesh key={i} position={[0, 0.45 + i * 0.72, 0]} rotation-y={i * 0.7}>
      <torusGeometry args={[0.22 + i * 0.012, 0.025, 5, 14]} />
      <meshStandardMaterial color="#a37c51" roughness={1} />
    </mesh>)}
    {fronds.map((angle, i) => <PalmFrond key={i} angle={angle} index={i} />)}
  </group>;
}

function PalmFrond({ angle, index }) {
  const geometry = useMemo(() => {
    const positions = [];
    const indices = [];
    const length = 3.1 + (index % 3) * 0.28;
    for (let i = 0; i <= 12; i++) {
      const t = i / 12;
      const radius = t * length;
      const y = 0.12 + Math.sin(t * Math.PI) * 0.5 - t * t * 1.6;
      const width = (1 - t) * 0.32 + 0.012;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      positions.push(x - Math.sin(angle) * width, y, z + Math.cos(angle) * width);
      positions.push(x + Math.sin(angle) * width, y, z - Math.cos(angle) * width);
      if (i < 12) {
        const n = i * 2;
        indices.push(n, n + 1, n + 2, n + 1, n + 3, n + 2);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    g.setIndex(indices);
    g.computeVertexNormals();
    return g;
  }, [angle, index]);
  return <mesh geometry={geometry} position={[0, 5.45, 0]} castShadow>
    <meshStandardMaterial color={index % 3 ? '#526c39' : '#6f8748'} roughness={1} side={THREE.DoubleSide} />
  </mesh>;
}

function WheatField({ position, count = 620, seed = 14 }) {
  const stems = useRef();
  const heads = useRef();
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const rand = useMemo(() => seededRandom(seed), [seed]);
  useEffect(() => {
    if (!stems.current || !heads.current) return;
    for (let i = 0; i < count; i++) {
      const x = (rand() - 0.5) * 17;
      const z = (rand() - 0.5) * 13;
      const h = 0.72 + rand() * 0.78;
      dummy.position.set(x, h / 2, z);
      dummy.rotation.set((rand() - 0.5) * 0.12, rand() * Math.PI, (rand() - 0.5) * 0.12);
      dummy.scale.set(0.09, h, 0.09);
      dummy.updateMatrix();
      stems.current.setMatrixAt(i, dummy.matrix);
      dummy.position.set(x + 0.025, h + 0.08, z);
      dummy.rotation.set(0.2, rand() * Math.PI, 0.18);
      dummy.scale.set(0.11, 0.23, 0.09);
      dummy.updateMatrix();
      heads.current.setMatrixAt(i, dummy.matrix);
      const color = new THREE.Color().setHSL(0.105 + rand() * 0.025, 0.4 + rand() * 0.18, 0.42 + rand() * 0.16);
      stems.current.setColorAt(i, color);
      heads.current.setColorAt(i, color.clone().multiplyScalar(1.13));
    }
    stems.current.instanceMatrix.needsUpdate = true;
    heads.current.instanceMatrix.needsUpdate = true;
    if (stems.current.instanceColor) stems.current.instanceColor.needsUpdate = true;
    if (heads.current.instanceColor) heads.current.instanceColor.needsUpdate = true;
  }, [count, dummy, rand]);
  return <group position={position}>
    <instancedMesh ref={stems} args={[undefined, undefined, count]} castShadow>
      <cylinderGeometry args={[0.07, 0.1, 1, 6]} />
      <meshStandardMaterial color="#d4b45e" roughness={1} />
    </instancedMesh>
    <instancedMesh ref={heads} args={[undefined, undefined, count]} castShadow>
      <sphereGeometry args={[1, 7, 6]} />
      <meshStandardMaterial color="#e0c16b" roughness={1} />
    </instancedMesh>
  </group>;
}

function Rock({ position, scale = [1, 1, 1], color = '#8e795f' }) {
  return <mesh position={position} scale={scale} rotation-y={position[0] * 0.19} castShadow receiveShadow>
    <dodecahedronGeometry args={[1, 1]} />
    <meshStandardMaterial color={color} roughness={1} flatShading />
  </mesh>;
}

function ClayJar({ position, scale = 1 }) {
  const profile = useMemo(() => [
    new THREE.Vector2(0, 0), new THREE.Vector2(0.18, 0.05), new THREE.Vector2(0.27, 0.2),
    new THREE.Vector2(0.33, 0.43), new THREE.Vector2(0.31, 0.67), new THREE.Vector2(0.2, 0.82),
    new THREE.Vector2(0.12, 0.88), new THREE.Vector2(0.13, 0.96),
  ], []);
  return <group position={position} scale={scale}>
    <mesh position={[0, 0.03, 0]} castShadow receiveShadow>
      <latheGeometry args={[profile, 20]} />
      <meshStandardMaterial color="#a56d48" roughness={0.8} />
    </mesh>
    <mesh position={[0, 0.96, 0]}><torusGeometry args={[0.13, 0.035, 8, 18]} /><meshStandardMaterial color="#805235" /></mesh>
    <mesh position={[0, 0.56, 0]}><torusGeometry args={[0.318, 0.022, 6, 24]} /><meshStandardMaterial color="#c08b5b" /></mesh>
  </group>;
}

function Crate({ position, rotation = 0 }) {
  return <group position={position} rotation-y={rotation}>
    <mesh position={[0, 0.35, 0]} castShadow><boxGeometry args={[0.85, 0.7, 0.75]} /><meshStandardMaterial color="#7a5230" roughness={1} /></mesh>
    {[-0.29, 0, 0.29].map((x) => <mesh key={x} position={[x, 0.35, 0.39]}><boxGeometry args={[0.24, 0.64, 0.035]} /><meshStandardMaterial color="#a17442" roughness={1} /></mesh>)}
    {[-0.29, 0, 0.29].map((x) => <mesh key={x} position={[x, 0.35, -0.39]}><boxGeometry args={[0.24, 0.64, 0.035]} /><meshStandardMaterial color="#a17442" roughness={1} /></mesh>)}
    <mesh position={[0, 0.72, 0]}><boxGeometry args={[0.9, 0.08, 0.8]} /><meshStandardMaterial color="#6e4828" /></mesh>
  </group>;
}

function WheatBundle({ collected }) {
  if (collected) return null;
  return <group position={WHEAT.toArray()}>
    {[0, 1, 2, 3].map((i) => <mesh key={i} position={[i * 0.13, 0.24, i * 0.07]} rotation-z={i * 0.21 - 0.4} castShadow>
      <cylinderGeometry args={[0.08, 0.12, 0.78, 8]} />
      <meshStandardMaterial color={i % 2 ? '#dbbd68' : '#b89342'} roughness={1} />
    </mesh>)}
  </group>;
}

const KEY_BINDINGS = {
  ArrowUp: 'up', KeyW: 'up', w: 'up', W: 'up',
  ArrowDown: 'down', KeyS: 'down', s: 'down', S: 'down',
  ArrowLeft: 'left', KeyA: 'left', a: 'left', A: 'left',
  ArrowRight: 'right', KeyD: 'right', d: 'right', D: 'right',
  KeyZ: 'run', z: 'run', Z: 'run',
  KeyX: 'action', x: 'action', X: 'action',
};

function Gideon({ onStatus, onCollected, touchDirection }) {
  const root = useRef();
  const leftLeg = useRef();
  const rightLeg = useRef();
  const leftArm = useRef();
  const rightArm = useRef();
  const cloak = useRef();
  const keys = useRef({ up: false, down: false, left: false, right: false, run: false });
  const stealth = useRef(false);
  const collected = useRef(false);
  const lock = useRef(false);
  const [isStealth, setIsStealth] = useState(false);
  const [nearWheat, setNearWheat] = useState(false);
  const [nearPost, setNearPost] = useState(false);

  const act = useCallback(() => {
    if (!root.current || lock.current) return;
    lock.current = true;
    const p = root.current.position;
    if (!collected.current && p.distanceTo(WHEAT) < 3.1) {
      collected.current = true;
      onCollected();
      onStatus('Has recuperado el trigo escondido.');
    } else if (p.distanceTo(TRAINING_POST) < 3.1) {
      onStatus('Gedeón golpea el poste de práctica.');
      if (rightArm.current) rightArm.current.rotation.x = -2;
    } else {
      stealth.current = !stealth.current;
      setIsStealth(stealth.current);
      onStatus(stealth.current ? 'Sigilo activado.' : 'Has salido del modo sigilo.');
    }
    window.setTimeout(() => {
      lock.current = false;
      if (rightArm.current) rightArm.current.rotation.x = 0;
    }, 420);
  }, [onCollected, onStatus]);

  useEffect(() => {
    const clearKeys = () => Object.keys(keys.current).forEach((key) => { keys.current[key] = false; });
    const down = (event) => {
      const action = KEY_BINDINGS[event.code] || KEY_BINDINGS[event.key];
      if (!action) return;
      event.preventDefault();
      if (action === 'action') {
        if (!event.repeat) act();
        return;
      }
      keys.current[action] = true;
    };
    const up = (event) => {
      const action = KEY_BINDINGS[event.code] || KEY_BINDINGS[event.key];
      if (action && action !== 'action') keys.current[action] = false;
    };
    window.addEventListener('keydown', down, { capture: true, passive: false });
    window.addEventListener('keyup', up, true);
    window.addEventListener('blur', clearKeys);
    document.addEventListener('visibilitychange', clearKeys);
    return () => {
      window.removeEventListener('keydown', down, true);
      window.removeEventListener('keyup', up, true);
      window.removeEventListener('blur', clearKeys);
      document.removeEventListener('visibilitychange', clearKeys);
    };
  }, [act]);

  useFrame((state, delta) => {
    if (!root.current) return;
    const k = keys.current;
    const x = Number(k.right || touchDirection.x > 0.2) - Number(k.left || touchDirection.x < -0.2);
    const z = Number(k.down || touchDirection.y > 0.2) - Number(k.up || touchDirection.y < -0.2);
    const moving = !!(x || z);
    const running = moving && k.run && !stealth.current;
    const speed = stealth.current ? 1.65 : running ? 7.1 : 3.55;

    if (moving) {
      const direction = new THREE.Vector3(x, 0, z).normalize();
      root.current.position.addScaledVector(direction, Math.min(delta, 0.05) * speed);
      root.current.position.x = THREE.MathUtils.clamp(root.current.position.x, -WORLD_LIMIT, WORLD_LIMIT);
      root.current.position.z = THREE.MathUtils.clamp(root.current.position.z, -WORLD_LIMIT, WORLD_LIMIT);
      root.current.rotation.y = Math.atan2(direction.x, direction.z);
    }

    const wheatDistance = root.current.position.distanceTo(WHEAT);
    const postDistance = root.current.position.distanceTo(TRAINING_POST);
    if (nearWheat !== (!collected.current && wheatDistance < 3.1)) setNearWheat(!collected.current && wheatDistance < 3.1);
    if (nearPost !== (postDistance < 3.1)) setNearPost(postDistance < 3.1);

    const t = state.clock.elapsedTime;
    const stride = moving ? Math.sin(t * (running ? 13 : 8)) * (running ? 0.72 : 0.42) : 0;
    if (leftLeg.current) leftLeg.current.rotation.x = stride;
    if (rightLeg.current) rightLeg.current.rotation.x = -stride;
    if (leftArm.current) leftArm.current.rotation.x = -stride * 0.55;
    if (rightArm.current) rightArm.current.rotation.x = lock.current && rightArm.current.rotation.x < -1 ? rightArm.current.rotation.x : stride * 0.55;
    if (cloak.current) {
      cloak.current.rotation.x = 0.06 + Math.sin(t * 3.2) * 0.018 + (running ? 0.08 : 0);
    }

    // Camera stays behind Gideon and looks into the direction he is facing.
    const forward = new THREE.Vector3(Math.sin(root.current.rotation.y), 0, Math.cos(root.current.rotation.y));
    const side = new THREE.Vector3(forward.z, 0, -forward.x);
    const cameraPosition = root.current.position.clone()
      .addScaledVector(forward, -7.8)
      .addScaledVector(side, 0.82)
      .add(new THREE.Vector3(0, 3.35, 0));
    const cameraTarget = root.current.position.clone()
      .addScaledVector(forward, 4.0)
      .add(new THREE.Vector3(0, 1.45, 0));
    state.camera.position.lerp(cameraPosition, 1 - Math.exp(-5.2 * delta));
    state.camera.lookAt(cameraTarget);
  });

  return <group ref={root} position={[0, 0, 15]} rotation-y={Math.PI}>
    <group ref={cloak} position={[0, 1.0, -0.23]} rotation-x={0.08}>
      <mesh scale={[0.58, 0.9, 0.22]} castShadow receiveShadow>
        <sphereGeometry args={[1, 24, 20]} />
        <meshStandardMaterial color="#653d2d" roughness={1} />
      </mesh>
      <mesh position={[0, -0.53, -0.05]} rotation-x={-0.12} castShadow>
        <coneGeometry args={[0.55, 0.42, 24, 1, true]} />
        <meshStandardMaterial color="#744632" side={THREE.DoubleSide} roughness={1} />
      </mesh>
    </group>
    <mesh position={[0, 0.97, 0]} castShadow receiveShadow>
      <latheGeometry args={[[
        new THREE.Vector2(0.19, 0.08), new THREE.Vector2(0.34, 0.12),
        new THREE.Vector2(0.4, 0.38), new THREE.Vector2(0.36, 0.85),
        new THREE.Vector2(0.43, 1.22), new THREE.Vector2(0.47, 1.43),
        new THREE.Vector2(0.3, 1.63), new THREE.Vector2(0.22, 1.68),
      ], 28]} />
      <meshStandardMaterial color="#b89a72" roughness={0.96} />
    </mesh>
    <mesh position={[0, 1.22, -0.01]} castShadow>
      <boxGeometry args={[0.78, 0.12, 0.64]} />
      <meshStandardMaterial color="#563c2a" roughness={1} />
    </mesh>
    <mesh position={[0, 1.22, 0.34]} castShadow><boxGeometry args={[0.12, 0.13, 0.06]} /><meshStandardMaterial color="#b68b4e" metalness={0.45} roughness={0.5} /></mesh>
    <mesh position={[0, 1.58, -0.06]} rotation-z={0.02} castShadow>
      <torusGeometry args={[0.29, 0.055, 9, 32]} />
      <meshStandardMaterial color="#8b5b36" roughness={1} />
    </mesh>
    <group ref={leftLeg} position={[-0.19, 0.42, 0]}>
      <mesh position={[0, -0.15, 0]} castShadow><capsuleGeometry args={[0.15, 0.6, 6, 12]} /><meshStandardMaterial color="#594333" roughness={1} /></mesh>
      <mesh position={[0, -0.47, 0.1]} castShadow><capsuleGeometry args={[0.15, 0.22, 4, 10]} /><meshStandardMaterial color="#4b3022" roughness={0.95} /></mesh>
    </group>
    <group ref={rightLeg} position={[0.19, 0.42, 0]}>
      <mesh position={[0, -0.15, 0]} castShadow><capsuleGeometry args={[0.15, 0.6, 6, 12]} /><meshStandardMaterial color="#594333" roughness={1} /></mesh>
      <mesh position={[0, -0.47, 0.1]} castShadow><capsuleGeometry args={[0.15, 0.22, 4, 10]} /><meshStandardMaterial color="#4b3022" roughness={0.95} /></mesh>
    </group>
    <group ref={leftArm} position={[-0.46, 1.42, 0]}>
      <mesh position={[0, -0.29, 0]} rotation-z={-0.08} castShadow><capsuleGeometry args={[0.15, 0.58, 6, 12]} /><meshStandardMaterial color="#a36e4d" roughness={0.95} /></mesh>
      <mesh position={[0, -0.64, 0.02]} castShadow><sphereGeometry args={[0.14, 14, 12]} /><meshStandardMaterial color="#996444" roughness={0.95} /></mesh>
    </group>
    <group ref={rightArm} position={[0.46, 1.42, 0]}>
      <mesh position={[0, -0.29, 0]} rotation-z={0.08} castShadow><capsuleGeometry args={[0.15, 0.58, 6, 12]} /><meshStandardMaterial color="#a36e4d" roughness={0.95} /></mesh>
      <mesh position={[0, -0.64, 0.02]} castShadow><sphereGeometry args={[0.14, 14, 12]} /><meshStandardMaterial color="#996444" roughness={0.95} /></mesh>
    </group>
    <mesh position={[0, 2.0, 0]} castShadow><sphereGeometry args={[0.29, 24, 20]} /><meshStandardMaterial color="#a97151" roughness={0.95} /></mesh>
    <mesh position={[0, 2.13, -0.07]} scale={[1.02, 0.76, 0.92]} castShadow><sphereGeometry args={[0.3, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshStandardMaterial color="#2d211c" roughness={1} /></mesh>
    {[-0.21, -0.1, 0, 0.1, 0.21].map((x, i) => <mesh key={x} position={[x, 1.92 + (i % 2) * 0.04, -0.23]} rotation-z={x * 0.7} castShadow><sphereGeometry args={[0.095, 12, 10]} /><meshStandardMaterial color="#30221b" roughness={1} /></mesh>)}
    <mesh position={[0, 2.21, 0.02]}><torusGeometry args={[0.28, 0.035, 7, 28]} /><meshStandardMaterial color="#b99356" metalness={0.2} roughness={0.7} /></mesh>
    <mesh position={[0, 1.83, 0.16]} castShadow><sphereGeometry args={[0.16, 14, 12]} /><meshStandardMaterial color="#3a261d" roughness={1} /></mesh>
    <mesh position={[0, 2.47, -0.01]}><sphereGeometry args={[0.13, 12, 10]} /><meshStandardMaterial color="#3c281f" roughness={1} /></mesh>
    {isStealth && <mesh position={[0, 2.8, 0]}><sphereGeometry args={[0.6, 16, 12]} /><meshBasicMaterial color="#273b3b" transparent opacity={0.1} /></mesh>}
  </group>;
}

function World({ collected, onStatus, onCollected, touchDirection }) {
  return <>
    <Sky distance={450000} sunPosition={[90, 18, -75]} inclination={0.46} azimuth={0.25} rayleigh={2.8} turbidity={8.5} mieCoefficient={0.012} mieDirectionalG={0.82} />
    <color attach="background" args={['#d7a66f']} />
    <fog attach="fog" args={['#d9ae7c', 52, 132]} />
    <ambientLight intensity={0.58} color="#ffe0b2" />
    <hemisphereLight args={['#dce5f2', '#65472f', 0.82]} />
    <directionalLight position={[-32, 28, -18]} intensity={3.0} color="#ffd49c" castShadow shadow-mapSize={[2048, 2048]} shadow-camera-near={1} shadow-camera-far={110} shadow-camera-left={-42} shadow-camera-right={42} shadow-camera-top={42} shadow-camera-bottom={-42} />
    <directionalLight position={[15, 10, 9]} intensity={0.42} color="#9baec8" />
    <Terrain />
    <PathRibbon />
    <Mountain position={[-42, -3, -54]} scale={[2.9, 2.0, 2.6]} color="#88745f" />
    <Mountain position={[-13, -5, -60]} scale={[3.6, 2.1, 2.7]} color="#9b8065" />
    <Mountain position={[27, -4, -58]} scale={[3.1, 2.15, 2.7]} color="#7c6a58" />
    <Mountain position={[55, -4, -28]} scale={[2.2, 1.7, 2.2]} color="#92765c" />

    <StoneHouse position={[-9, 0, -18]} rotation={0.16} variant={1} awning />
    <StoneHouse position={[1, 0, -29]} rotation={-0.08} variant={2} />
    <StoneHouse position={[14, 0, -22]} rotation={-0.28} variant={3} awning />
    <StoneHouse position={[-17, 0, -5]} rotation={0.42} variant={4} />
    <StoneHouse position={[22, 0, -5]} rotation={-0.5} variant={5} />
    <StoneHouse position={[-27, 0, -31]} rotation={0.2} variant={6} />

    <PalmTree position={[-19, 0, -18]} scale={1.2} />
    <PalmTree position={[20, 0, -32]} scale={1.05} />
    <PalmTree position={[31, 0, -13]} scale={0.85} />
    <OliveTree position={[-15, 0, -37]} scale={1.45} seed={25} />
    <OliveTree position={[8, 0, -42]} scale={1.2} seed={41} />
    <OliveTree position={[27, 0, -40]} scale={1.05} seed={62} />
    <OliveTree position={[-29, 0, -18]} scale={1.15} seed={79} />
    <OliveTree position={[-3, 0, 4]} scale={1.05} seed={83} />
    <OliveTree position={[30, 0, 7]} scale={1.1} seed={95} />

    <WheatField position={[15, 0, -8]} count={1050} seed={52} />
    <WheatField position={[31, 0, -25]} count={780} seed={88} />
    <WheatField position={[-32, 0, -37]} count={670} seed={107} />
    <WheatBundle collected={collected} />

    <group position={[...TRAINING_POST.toArray()]}>
      <mesh position={[0, 1.15, 0]} castShadow><cylinderGeometry args={[0.14, 0.2, 2.3, 10]} /><meshStandardMaterial color="#6e472b" roughness={1} /></mesh>
      <mesh position={[0, 1.82, 0]} castShadow><sphereGeometry args={[0.35, 16, 14]} /><meshStandardMaterial color="#a1784d" roughness={1} /></mesh>
      <mesh position={[0, 0.18, 0]}><cylinderGeometry args={[0.42, 0.48, 0.28, 8]} /><meshStandardMaterial color="#60452f" /></mesh>
    </group>
    <ClayJar position={[-5.8, 0, 1.8]} scale={1.1} />
    <ClayJar position={[-5.0, 0, 2.1]} scale={0.78} />
    <ClayJar position={[8.5, 0, -12]} scale={1.15} />
    <Crate position={[-11.8, 0, -15.7]} rotation={0.3} />
    <Crate position={[-12.4, 0, -15.2]} rotation={-0.2} />
    <Rock position={[-10, 0.2, 8]} scale={[1.8, 0.55, 1.1]} />
    <Rock position={[13, 0.15, 4]} scale={[1.1, 0.4, 0.8]} color="#a08a6c" />
    <Rock position={[34, 0.2, -4]} scale={[1.7, 0.6, 1.2]} color="#9a8161" />
    <Rock position={[-34, 0.2, -4]} scale={[1.3, 0.45, 1.1]} color="#806b53" />

    <Gideon onStatus={onStatus} onCollected={onCollected} touchDirection={touchDirection} />
    <ContactShadows position={[0, 0.025, 0]} opacity={0.34} scale={72} blur={3.2} far={24} />
  </>;
}

function MiniMap() {
  return <div className="mini-map" aria-label="Minimapa">
    <span className="map-north">N</span>
    <span className="map-path map-path-one" />
    <span className="map-path map-path-two" />
    <span className="map-marker map-marker-player">▲</span>
    <span className="map-marker map-marker-goal">◆</span>
  </div>;
}

function TouchControls({ onDirection, onAction }) {
  const padRef = useRef(null);
  const pointerRef = useRef(null);
  const [active, setActive] = useState(false);
  const move = useCallback((event) => {
    if (pointerRef.current !== event.pointerId || !padRef.current) return;
    const rect = padRef.current.getBoundingClientRect();
    const radius = rect.width * 0.36;
    const dx = event.clientX - (rect.left + rect.width / 2);
    const dy = event.clientY - (rect.top + rect.height / 2);
    const distance = Math.hypot(dx, dy);
    const scale = distance > radius ? radius / distance : 1;
    const x = dx * scale / radius;
    const y = dy * scale / radius;
    onDirection({ x, y });
    const knob = padRef.current.querySelector('.joystick-knob');
    if (knob) knob.style.transform = `translate(${x * 31}px, ${y * 31}px)`;
  }, [onDirection]);
  const stop = useCallback((event) => {
    if (pointerRef.current !== event.pointerId) return;
    pointerRef.current = null;
    setActive(false);
    onDirection({ x: 0, y: 0 });
    if (padRef.current) {
      const knob = padRef.current.querySelector('.joystick-knob');
      if (knob) knob.style.transform = 'translate(0, 0)';
      try { padRef.current.releasePointerCapture(event.pointerId); } catch {}
    }
  }, [onDirection]);
  return <div className="touch-controls" aria-label="Controles táctiles">
    <div ref={padRef} className={`joystick-pad${active ? ' is-active' : ''}`}
      role="application" aria-label="Desliza el dedo para dirigir a Gedeón"
      onPointerDown={(event) => { event.preventDefault(); pointerRef.current = event.pointerId; setActive(true); event.currentTarget.setPointerCapture(event.pointerId); move(event); }}
      onPointerMove={move} onPointerUp={stop} onPointerCancel={stop} onLostPointerCapture={stop}>
      <span className="joystick-direction direction-up">▲</span>
      <span className="joystick-direction direction-down">▼</span>
      <span className="joystick-direction direction-left">◀</span>
      <span className="joystick-direction direction-right">▶</span>
      <span className="joystick-knob" />
    </div>
    <button className="touch-action" type="button" onPointerDown={(event) => event.stopPropagation()} onClick={onAction}>
      <span>X</span><small>Acción</small>
    </button>
  </div>;
}

export default function App() {
  const [status, setStatus] = useState('Dirígete al campo donde escondiste el trigo.');
  const [collected, setCollected] = useState(false);
  const [touchDirection, setTouchDirection] = useState({ x: 0, y: 0 });
  const onStatus = useCallback((value) => setStatus(value), []);
  const onCollected = useCallback(() => setCollected(true), []);
  const onTouchAction = useCallback(() => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'x', code: 'KeyX', bubbles: true }));
    window.dispatchEvent(new KeyboardEvent('keyup', { key: 'x', code: 'KeyX', bubbles: true }));
  }, []);
  return <main className="game">
    <Canvas shadows camera={{ position: [0, 4.3, 23], fov: 48, near: 0.1, far: 220 }} dpr={[1, 1.5]} gl={{ antialias: true, powerPreference: 'high-performance' }}>
      <World collected={collected} onStatus={onStatus} onCollected={onCollected} touchDirection={touchDirection} />
    </Canvas>
    <header className="hud-top">
      <div className="player-card"><div className="player-avatar"><span>G</span></div>
        <div className="player-info"><div className="player-name">Gedeón</div><div className="stat-bar health"><span /></div><div className="stat-bar stamina"><span /></div></div>
      </div>
      <div className="chapter">CAPÍTULO I <i>·</i> TIEMPOS DE OPRESIÓN</div><MiniMap />
    </header>
    <section className="mission-card">
      <div className="panel-heading"><span className="mission-glyph">✦</span> Misión actual</div>
      <h1>{collected ? 'Trigo recuperado' : 'Encuentra tu escondite'}</h1>
      <p>{collected ? 'Has recuperado el trigo que escondiste.' : status}</p>
      <div className="mission-objective"><span className={collected ? 'checked' : ''}>{collected ? '✓' : ''}</span>{collected ? 'Objetivo completado' : 'Dirígete al lugar donde has ocultado el trigo.'}</div>
    </section>
    <section className="controls-card">
      <div className="panel-heading"><span className="mission-glyph">✥</span> Controles</div>
      <div className="control-row"><span className="key">↑</span><span className="key">←</span><span className="key">↓</span><span className="key">→</span><span>Caminar</span></div>
      <div className="control-row"><span className="key wide">Z</span><span>Correr</span></div>
      <div className="control-row"><span className="key wide">X</span><span>Acción / recoger / sigilo</span></div>
    </section>
    <div className="action-prompt"><span className="action-key">X</span><span>{collected ? 'Misión completada' : 'Explora la aldea'}</span></div>
    <div className="mission-toast" aria-live="polite">{status}</div>
    <TouchControls onDirection={setTouchDirection} onAction={onTouchAction} />
  </main>;
}
