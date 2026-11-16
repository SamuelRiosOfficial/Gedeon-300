import { Canvas, useFrame } from '@react-three/fiber';
import { Sky, ContactShadows } from '@react-three/drei';
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

function Ground() {
  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[180, 180, 1, 1]} />
        <meshStandardMaterial color="#9a895e" roughness={1} />
      </mesh>
      <mesh position={[0, 0.015, 0]} rotation-x={-Math.PI / 2}>
        <circleGeometry args={[13, 64]} />
        <meshStandardMaterial color="#b49a66" roughness={1} />
      </mesh>
    </group>
  );
}

function House({ position, rotation = 0 }) {
  return (
    <group position={position} rotation-y={rotation}>
      <mesh position={[0, 1.05, 0]} castShadow receiveShadow>
        <boxGeometry args={[3.5, 2.1, 3]} />
        <meshStandardMaterial color="#a99578" roughness={1} />
      </mesh>
      <mesh position={[0, 2.45, 0]} rotation-y={Math.PI / 4} castShadow>
        <coneGeometry args={[2.55, 1.35, 4]} />
        <meshStandardMaterial color="#75634d" roughness={1} />
      </mesh>
      <mesh position={[0, 0.72, 1.506]}>
        <planeGeometry args={[0.85, 1.45]} />
        <meshStandardMaterial color="#403329" />
      </mesh>
    </group>
  );
}

function WheatField({ position, count = 90 }) {
  const stalks = useRef();
  const dummy = new THREE.Object3D();
  useEffect(() => {
    if (!stalks.current) return;
    for (let i = 0; i < count; i += 1) {
      const x = (Math.random() - 0.5) * 13;
      const z = (Math.random() - 0.5) * 10;
      dummy.position.set(x, 0.55, z);
      dummy.rotation.set(0, Math.random() * Math.PI, (Math.random() - 0.5) * 0.12);
      const s = 0.65 + Math.random() * 0.65;
      dummy.scale.set(0.12, s, 0.12);
      dummy.updateMatrix();
      stalks.current.setMatrixAt(i, dummy.matrix);
    }
    stalks.current.instanceMatrix.needsUpdate = true;
  }, [count]);
  return (
    <instancedMesh ref={stalks} args={[null, null, count]} position={position} castShadow>
      <cylinderGeometry args={[0.055, 0.075, 1, 5]} />
      <meshStandardMaterial color="#c5a34d" roughness={1} />
    </instancedMesh>
  );
}

function Gideon() {
  const body = useRef();
  const keys = useRef({});
  const direction = useRef(new THREE.Vector3());
  const [moving, setMoving] = useState(false);

  useEffect(() => {
    const down = (e) => { keys.current[e.code] = true; };
    const up = (e) => { keys.current[e.code] = false; };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, []);

  useFrame((state, delta) => {
    if (!body.current) return;
    const k = keys.current;
    direction.current.set(
      Number(k.KeyD || k.ArrowRight) - Number(k.KeyA || k.ArrowLeft),
      0,
      Number(k.KeyS || k.ArrowDown) - Number(k.KeyW || k.ArrowUp),
    );
    const active = direction.current.lengthSq() > 0;
    setMoving((old) => old === active ? old : active);
    if (active) {
      direction.current.normalize();
      body.current.position.addScaledVector(direction.current, delta * 4.2);
      body.current.position.x = THREE.MathUtils.clamp(body.current.position.x, -24, 24);
      body.current.position.z = THREE.MathUtils.clamp(body.current.position.z, -24, 24);
      body.current.rotation.y = Math.atan2(direction.current.x, direction.current.z);
    }
    const target = body.current.position.clone().add(new THREE.Vector3(0, 3.2, 6.8));
    state.camera.position.lerp(target, 1 - Math.exp(-5 * delta));
    state.camera.lookAt(body.current.position.x, 1, body.current.position.z);
  });

  return (
    <group ref={body} position={[0, 0, 7]}>
      <mesh position={[0, 1.05, 0]} castShadow>
        <capsuleGeometry args={[0.38, 0.9, 4, 8]} />
        <meshStandardMaterial color="#526b78" roughness={0.9} />
      </mesh>
      <mesh position={[0, 1.82, 0]} castShadow>
        <sphereGeometry args={[0.3, 16, 12]} />
        <meshStandardMaterial color="#b98763" roughness={0.95} />
      </mesh>
      <mesh position={[0, 2.02, 0]} castShadow>
        <sphereGeometry args={[0.31, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#514033" roughness={1} />
      </mesh>
      <mesh position={[0, 0.28, 0.05]} castShadow>
        <boxGeometry args={[0.68, 0.16, 0.82]} />
        <meshStandardMaterial color="#47382c" />
      </mesh>
    </group>
  );
}

function World() {
  return (
    <>
      <Sky distance={450000} sunPosition={[80, 18, -60]} inclination={0.48} azimuth={0.25} rayleigh={2.5} turbidity={8} />
      <ambientLight intensity={0.75} color="#f4dfbd" />
      <directionalLight position={[-15, 22, -10]} intensity={2.1} color="#ffd49a" castShadow shadow-mapSize={[1024, 1024]} />
      <Ground />
      <House position={[-7, 0, -5]} rotation={0.2} />
      <House position={[7, 0, -7]} rotation={-0.4} />
      <House position={[-10, 0, 5]} rotation={0.8} />
      <WheatField position={[12, 0, 8]} />
      <WheatField position={[-13, 0, -12]} count={65} />
      <Gideon />
      <ContactShadows position={[0, 0.025, 0]} opacity={0.35} scale={45} blur={2.5} far={12} />
    </>
  );
}

export default function App() {
  return (
    <main className="game">
      <Canvas shadows camera={{ position: [0, 4, 14], fov: 55 }} dpr={[1, 1.5]}>
        <color attach="background" args={['#c8a77d']} />
        <fog attach="fog" args={['#c8a77d', 28, 85]} />
        <World />
      </Canvas>
      <header className="hud">
        <div className="brand">GEDEÓN <span>300</span></div>
        <div className="chapter">CAPÍTULO I · TIEMPOS DE OPRESIÓN</div>
      </header>
      <section className="mission">
        <p className="eyebrow">MISIÓN PRINCIPAL</p>
        <h1>Encuentra tu escondite</h1>
        <p>Explora la aldea y descubre dónde está oculto el trigo.</p>
        <div className="objective"><span /> Explora los alrededores</div>
      </section>
      <footer className="controls">MOVERSE <b>W A S D</b> <i>o</i> <b>↑ ↓ ← →</b></footer>
    </main>
  );
}
