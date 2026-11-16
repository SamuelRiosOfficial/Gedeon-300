import { Canvas, useFrame } from '@react-three/fiber';
import { Sky, ContactShadows } from '@react-three/drei';
import { useCallback, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

const WHEAT_SPOT = new THREE.Vector3(10, 0, 8);
const TRAINING_POST = new THREE.Vector3(-4, 0, -2);

function Ground() {
  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial color="#9b8a68" roughness={1} />
      </mesh>
      <mesh position={[0, 0.025, 0]} rotation-x={-Math.PI / 2}>
        <ringGeometry args={[3.2, 4.1, 64]} />
        <meshStandardMaterial color="#b49a70" roughness={1} />
      </mesh>
      <mesh position={[0, 0.04, 5]} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[4, 25]} />
        <meshStandardMaterial color="#b29b75" roughness={1} />
      </mesh>
    </group>
  );
}

function Mountain({ position, scale, color = '#756b5b' }) {
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 5, 0]} castShadow receiveShadow>
        <coneGeometry args={[8, 12, 7]} />
        <meshStandardMaterial color={color} roughness={1} />
      </mesh>
      <mesh position={[3.8, 3.5, 1]} rotation-z={0.2} castShadow>
        <coneGeometry args={[5, 8, 7]} />
        <meshStandardMaterial color="#8b7b63" roughness={1} />
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

function OliveTree({ position, scale = 1 }) {
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 1.15, 0]} castShadow>
        <cylinderGeometry args={[0.16, 0.25, 2.3, 7]} />
        <meshStandardMaterial color="#66513a" roughness={1} />
      </mesh>
      {[[0, 2.4, 0], [0.65, 2.1, 0.1], [-0.55, 2.05, -0.2], [0.1, 2.65, 0.4]].map((p, i) => (
        <mesh key={i} position={p} castShadow>
          <icosahedronGeometry args={[0.9, 1]} />
          <meshStandardMaterial color={i % 2 ? '#66734b' : '#7b8050'} roughness={1} />
        </mesh>
      ))}
    </group>
  );
}

function WheatField({ position, count = 100 }) {
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

function WheatBundle({ collected }) {
  if (collected) return null;
  return (
    <group position={[WHEAT_SPOT.x, 0, WHEAT_SPOT.z]}>
      <mesh position={[0, 0.3, 0]} rotation-z={0.9} castShadow>
        <cylinderGeometry args={[0.13, 0.18, 0.8, 7]} />
        <meshStandardMaterial color="#d5b85f" />
      </mesh>
      <mesh position={[0.3, 0.25, 0.1]} rotation-z={-0.8} castShadow>
        <cylinderGeometry args={[0.12, 0.16, 0.7, 7]} />
        <meshStandardMaterial color="#b99843" />
      </mesh>
    </group>
  );
}

function TrainingPost() {
  return (
    <group position={TRAINING_POST.toArray()}>
      <mesh position={[0, 1.15, 0]} castShadow>
        <cylinderGeometry args={[0.12, 0.16, 2.3, 8]} />
        <meshStandardMaterial color="#6b4a31" roughness={1} />
      </mesh>
      <mesh position={[0, 1.75, 0]} castShadow>
        <sphereGeometry args={[0.35, 12, 10]} />
        <meshStandardMaterial color="#98714c" roughness={1} />
      </mesh>
    </group>
  );
}

function Gideon({ onStatus, onWheatCollected }) {
  const body = useRef();
  const leftLeg = useRef();
  const rightLeg = useRef();
  const leftArm = useRef();
  const rightArm = useRef();
  const keys = useRef({});
  const actionLock = useRef(false);
  const stealth = useRef(false);
  const collected = useRef(false);
  const actionCooldown = useRef(0);

  const handleAction = useCallback(() => {
    if (!body.current || actionLock.current) return;
    actionLock.current = true;
    const position = body.current.position;
    const wheatDistance = position.distanceTo(WHEAT_SPOT);
    const postDistance = position.distanceTo(TRAINING_POST);

    if (!collected.current && wheatDistance < 2.6) {
      collected.current = true;
      onWheatCollected();
      onStatus('Has recogido el trigo escondido.');
    } else if (postDistance < 2.8) {
      onStatus('Gedeón golpea el poste de práctica.');
      rightArm.current.rotation.x = -1.5;
      window.setTimeout(() => {
        if (rightArm.current) rightArm.current.rotation.x = 0;
      }, 260);
    } else {
      stealth.current = !stealth.current;
      onStatus(stealth.current ? 'Sigilo activado: muévete con cautela.' : 'Has salido del modo sigilo.');
    }
    window.setTimeout(() => { actionLock.current = false; }, 350);
  }, [onStatus, onWheatCollected]);

  useEffect(() => {
    const down = (event) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyZ', 'KeyX'].includes(event.code)) {
        event.preventDefault();
      }
      if (event.code === 'KeyX' && !event.repeat) handleAction();
      keys.current[event.code] = true;
    };
    const up = (event) => { keys.current[event.code] = false; };
    window.addEventListener('keydown', down, { passive: false });
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, [handleAction]);

  useFrame((state, delta) => {
    if (!body.current) return;
    const k = keys.current;
    const x = Number(k.ArrowRight) - Number(k.ArrowLeft);
    const z = Number(k.ArrowDown) - Number(k.ArrowUp);
    const moving = x !== 0 || z !== 0;
    const running = moving && Boolean(k.KeyZ) && !stealth.current;
    const speed = stealth.current ? 1.65 : running ? 8 : 4.1;

    if (moving) {
      const direction = new THREE.Vector3(x, 0, z).normalize();
      body.current.position.addScaledVector(direction, delta * speed);
      body.current.position.x = THREE.MathUtils.clamp(body.current.position.x, -23, 23);
      body.current.position.z = THREE.MathUtils.clamp(body.current.position.z, -23, 23);
      body.current.rotation.y = Math.atan2(direction.x, direction.z);
    }

    const t = state.clock.elapsedTime;
    const stride = moving ? Math.sin(t * (running ? 13 : 8)) * (running ? 0.75 : 0.48) : 0;
    if (leftLeg.current) leftLeg.current.rotation.x = stride;
    if (rightLeg.current) rightLeg.current.rotation.x = -stride;
    if (leftArm.current) leftArm.current.rotation.x = -stride * 0.65;
    if (rightArm.current && actionCooldown.current <= 0) rightArm.current.rotation.x = stride * 0.65;

    const offset = new THREE.Vector3(0, 3.8, stealth.current ? 7.8 : 6.8);
    offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), body.current.rotation.y);
    const target = body.current.position.clone().add(offset);
    state.camera.position.lerp(target, 1 - Math.exp(-5 * delta));
    state.camera.lookAt(body.current.position.x, 1.15, body.current.position.z);
  });

  return (
    <group ref={body} position={[0, 0, 7]}>
      <mesh position={[0, 1.25, 0]} castShadow>
        <capsuleGeometry args={[0.37, 0.95, 4, 8]} />
        <meshStandardMaterial color={stealth.current ? '#343c3b' : '#526b78'} roughness={0.9} />
      </mesh>
      <mesh position={[0, 2.05, 0]} castShadow>
        <sphereGeometry args={[0.29, 16, 12]} />
        <meshStandardMaterial color="#b98763" roughness={0.95} />
      </mesh>
      <mesh position={[0, 2.24, 0]} castShadow>
        <sphereGeometry args={[0.3, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#514033" roughness={1} />
      </mesh>
      <group position={[-0.19, 0.72, 0]} ref={leftLeg}>
        <mesh position={[0, -0.35, 0]} castShadow>
          <capsuleGeometry args={[0.13, 0.55, 3, 6]} />
          <meshStandardMaterial color="#514438" />
        </mesh>
      </group>
      <group position={[0.19, 0.72, 0]} ref={rightLeg}>
        <mesh position={[0, -0.35, 0]} castShadow>
          <capsuleGeometry args={[0.13, 0.55, 3, 6]} />
          <meshStandardMaterial color="#514438" />
        </mesh>
      </group>
      <group position={[-0.47, 1.65, 0]} ref={leftArm}>
        <mesh position={[0, -0.28, 0]} rotation-z={0.12} castShadow>
          <capsuleGeometry args={[0.12, 0.52, 3, 6]} />
          <meshStandardMaterial color="#526b78" />
        </mesh>
      </group>
      <group position={[0.47, 1.65, 0]} ref={rightArm}>
        <mesh position={[0, -0.28, 0]} rotation-z={-0.12} castShadow>
          <capsuleGeometry args={[0.12, 0.52, 3, 6]} />
          <meshStandardMaterial color="#526b78" />
        </mesh>
      </group>
    </group>
  );
}

function World({ onStatus, onWheatCollected, wheatCollected }) {
  return (
    <>
      <Sky distance={450000} sunPosition={[80, 18, -60]} inclination={0.48} azimuth={0.25} rayleigh={2.5} turbidity={8} />
      <ambientLight intensity={0.72} color="#f4dfbd" />
      <directionalLight position={[-15, 22, -10]} intensity={2.1} color="#ffd49a" castShadow shadow-mapSize={[1024, 1024]} />
      <Ground />
      <Mountain position={[-30, -2, -30]} scale={[2.4, 1.8, 1.8]} />
      <Mountain position={[-5, -3, -39]} scale={[3, 2.2, 2]} color="#82735f" />
      <Mountain position={[28, -2, -34]} scale={[2.8, 2, 2]} />
      <Mountain position={[35, -3, 5]} scale={[2, 1.6, 2]} color="#8a785f" />
      <House position={[-7, 0, -5]} rotation={0.2} />
      <House position={[7, 0, -7]} rotation={-0.4} />
      <House position={[-10, 0, 5]} rotation={0.8} />
      <House position={[1, 0, -13]} rotation={0.3} />
      <OliveTree position={[-15, 0, -4]} scale={1.2} />
      <OliveTree position={[15, 0, -13]} />
      <OliveTree position={[17, 0, 2]} scale={0.9} />
      <WheatField position={[12, 0, 8]} />
      <WheatField position={[-13, 0, -12]} count={65} />
      <WheatBundle collected={wheatCollected} />
      <TrainingPost />
      <Gideon onStatus={onStatus} onWheatCollected={onWheatCollected} />
      <ContactShadows position={[0, 0.025, 0]} opacity={0.35} scale={45} blur={2.5} far={12} />
    </>
  );
}

export default function App() {
  const [status, setStatus] = useState('Explora la aldea y encuentra el trigo.');
  const [wheatCollected, setWheatCollected] = useState(false);
  const handleStatus = useCallback((message) => setStatus(message), []);
  const handleWheatCollected = useCallback(() => setWheatCollected(true), []);

  return (
    <main className="game">
      <Canvas shadows camera={{ position: [0, 4, 14], fov: 55 }} dpr={[1, 1.5]}>
        <color attach="background" args={['#c8a77d']} />
        <fog attach="fog" args={['#c8a77d', 32, 90]} />
        <World onStatus={handleStatus} onWheatCollected={handleWheatCollected} wheatCollected={wheatCollected} />
      </Canvas>
      <header className="hud">
        <div className="brand">GEDEÓN <span>300</span></div>
        <div className="chapter">CAPÍTULO I · TIEMPOS DE OPRESIÓN</div>
      </header>
      <section className="mission">
        <p className="eyebrow">MISIÓN PRINCIPAL</p>
        <h1>{wheatCollected ? 'Trigo recuperado' : 'Encuentra tu escondite'}</h1>
        <p>{wheatCollected ? 'Has recuperado el trigo que escondiste.' : status}</p>
        <div className="objective"><span className={wheatCollected ? 'complete' : ''} /> {wheatCollected ? 'Objetivo completado' : 'Busca el trigo en el campo'}</div>
      </section>
      <footer className="controls">
        <span>MOVER</span> <b>↑</b><b>←</b><b>↓</b><b>→</b>
        <span>CORRER</span> <b>Z</b>
        <span>ACCIÓN / SIGILO</span> <b>X</b>
      </footer>
    </main>
  );
}
