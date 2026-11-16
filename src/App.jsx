import { Canvas, useFrame } from '@react-three/fiber';
import { Sky, ContactShadows } from '@react-three/drei';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';

const WHEAT = new THREE.Vector3(10, 0, 8);
const POST = new THREE.Vector3(-4, 0, -2);

function Terrain() {
  const ground = useMemo(() => {
    const geo = new THREE.PlaneGeometry(110, 110, 90, 90);
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i);
      const ridge = Math.max(0, (Math.abs(x) - 23) / 25) * 1.4 + Math.max(0, (Math.abs(y) - 23) / 25) * 1.1;
      p.setZ(i, ridge + Math.sin(x * 0.13) * Math.cos(y * 0.1) * 0.12);
    }
    geo.computeVertexNormals();
    return geo;
  }, []);
  return <mesh geometry={ground} rotation-x={-Math.PI / 2} receiveShadow><meshStandardMaterial color="#a99570" roughness={1} /></mesh>;
}

function Mountain({ position, scale, color = '#716653' }) {
  const geo = useMemo(() => {
    const g = new THREE.ConeGeometry(9, 15, 9, 3);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const v = 1 + 0.045 * Math.sin(i * 12.9898);
      p.setX(i, p.getX(i) * v);
      p.setZ(i, p.getZ(i) * v);
    }
    g.computeVertexNormals();
    return g;
  }, []);
  return <group position={position} scale={scale}>
    <mesh geometry={geo} position={[0, 6, 0]} castShadow receiveShadow><meshStandardMaterial color={color} roughness={1} flatShading /></mesh>
    <mesh geometry={geo} position={[5, 3, 1]} scale={[0.65, 0.7, 0.8]} castShadow><meshStandardMaterial color="#89785f" roughness={1} flatShading /></mesh>
  </group>;
}

function House({ position, rotation = 0, tone = '#b5a083' }) {
  return <group position={position} rotation-y={rotation}>
    <mesh position={[0, 1.35, 0]} castShadow receiveShadow><boxGeometry args={[4.2, 2.7, 3.6]} /><meshStandardMaterial color={tone} roughness={1} /></mesh>
    <mesh position={[0, 2.76, 0]}><boxGeometry args={[4.35, 0.16, 3.75]} /><meshStandardMaterial color="#806d54" roughness={1} /></mesh>
    <mesh position={[0, 0.92, 1.81]}><planeGeometry args={[0.9, 1.8]} /><meshStandardMaterial color="#463326" roughness={1} /></mesh>
    <mesh position={[-1.35, 1.72, 1.815]}><boxGeometry args={[0.58, 0.72, 0.06]} /><meshStandardMaterial color="#554332" /></mesh>
    <mesh position={[-1.35, 1.72, 1.86]}><boxGeometry args={[0.44, 0.56, 0.04]} /><meshStandardMaterial color="#26343a" emissive="#b58a52" emissiveIntensity={0.12} /></mesh>
    <mesh position={[1.35, 1.72, 1.815]}><boxGeometry args={[0.58, 0.72, 0.06]} /><meshStandardMaterial color="#554332" /></mesh>
    <mesh position={[1.35, 1.72, 1.86]}><boxGeometry args={[0.44, 0.56, 0.04]} /><meshStandardMaterial color="#26343a" /></mesh>
    {[-1.7,-0.9,0,0.9,1.7].map((x,i)=><mesh key={i} position={[x,0.15,1.86]}><boxGeometry args={[0.12,0.25,0.12]} /><meshStandardMaterial color="#8c7658" /></mesh>)}
    <mesh position={[0, 2.88, 0]}><boxGeometry args={[4.6,0.12,4]} /><meshStandardMaterial color="#9a805b" roughness={1} /></mesh>
    <mesh position={[0, 3.05, -1.55]}><boxGeometry args={[4.3,0.22,0.5]} /><meshStandardMaterial color="#806d54" /></mesh>
  </group>;
}

function OliveTree({ position, scale = 1 }) {
  return <group position={position} scale={scale}>
    <mesh position={[0,1.1,0]} rotation-z={-0.08} castShadow><cylinderGeometry args={[0.18,0.3,2.2,8]} /><meshStandardMaterial color="#66503a" /></mesh>
    {[[0,2.15,0],[0.65,2.3,0.1],[-0.62,2.15,-0.18],[0.1,2.65,0.35],[0.35,1.9,-0.48]].map((p,i)=><mesh key={i} position={p} scale={[1.15,0.72,0.9]} castShadow><icosahedronGeometry args={[0.82,1]} /><meshStandardMaterial color={i%2?'#66734a':'#7d8050'} roughness={1} flatShading /></mesh>)}
  </group>;
}

function WheatField({ position, count = 170 }) {
  const ref = useRef();
  const dummy = useMemo(() => new THREE.Object3D(), []);
  useEffect(() => {
    if (!ref.current) return;
    for (let i=0;i<count;i++) {
      const x=(Math.random()-.5)*15, z=(Math.random()-.5)*12;
      dummy.position.set(x,0.48,z);
      dummy.rotation.set(0,Math.random()*Math.PI,(Math.random()-.5)*0.12);
      const h=.65+Math.random()*.6;
      dummy.scale.set(.13,h,.13);
      dummy.updateMatrix();
      ref.current.setMatrixAt(i,dummy.matrix);
    }
    ref.current.instanceMatrix.needsUpdate=true;
  },[count,dummy]);
  return <instancedMesh ref={ref} args={[null,null,count]} position={position} castShadow><cylinderGeometry args={[.045,.075,1,5]} /><meshStandardMaterial color="#c8a24c" roughness={1} /></instancedMesh>;
}

function Fence({ position, length = 8 }) {
  return <group position={position}>
    {Array.from({length:Math.floor(length/1.5)+1},(_,i)=><group key={i} position={[i*1.5,0,0]}>
      <mesh position={[0,.65,0]} castShadow><cylinderGeometry args={[.07,.09,1.3,6]} /><meshStandardMaterial color="#684a30" /></mesh>
    </group>)}
    {[.42,.95].map(y=><mesh key={y} position={[length/2,y,0]} castShadow><boxGeometry args={[length,.12,.12]} /><meshStandardMaterial color="#795638" /></mesh>)}
  </group>;
}

function Jar({ position }) {
  return <group position={position}>
    <mesh position={[0,.35,0]} castShadow><latheGeometry args={[ [new THREE.Vector2(0,0),new THREE.Vector2(.22,.08),new THREE.Vector2(.32,.3),new THREE.Vector2(.28,.55),new THREE.Vector2(.14,.68),new THREE.Vector2(.12,.78)],12]} /><meshStandardMaterial color="#99714c" roughness={.9} /></mesh>
  </group>;
}

function WheatBundle({ collected }) {
  if(collected)return null;
  return <group position={WHEAT.toArray()}>
    {[0,1,2].map(i=><mesh key={i} position={[i*.18,.22,i*.06]} rotation-z={i*.35-.4} castShadow><cylinderGeometry args={[.1,.15,.7,7]} /><meshStandardMaterial color={i===1?'#d8bd69':'#b99843'} /></mesh>)}
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

function Gideon({onStatus,onCollected}) {
  const root=useRef(), leftLeg=useRef(), rightLeg=useRef(), leftArm=useRef(), rightArm=useRef(), cloak=useRef();
  const keys=useRef({up:false,down:false,left:false,right:false,run:false});
  const stealth=useRef(false), collected=useRef(false), lock=useRef(false);
  const [isStealth,setIsStealth]=useState(false);
  const act=useCallback(()=>{
    if(!root.current||lock.current)return;
    lock.current=true;
    const p=root.current.position;
    if(!collected.current&&p.distanceTo(WHEAT)<2.8){collected.current=true;onCollected();onStatus('Has recuperado el trigo escondido.');}
    else if(p.distanceTo(POST)<2.8){onStatus('Gedeón golpea el poste de práctica.');if(rightArm.current)rightArm.current.rotation.x=-2;}
    else {stealth.current=!stealth.current;setIsStealth(stealth.current);onStatus(stealth.current?'Sigilo activado.':'Has salido del modo sigilo.');}
    window.setTimeout(()=>{lock.current=false;if(rightArm.current)rightArm.current.rotation.x=0;},420);
  },[onCollected,onStatus]);
  useEffect(()=>{
    const clearKeys=()=>{Object.keys(keys.current).forEach(key=>{keys.current[key]=false;});};
    const down=e=>{
      const action=KEY_BINDINGS[e.code]||KEY_BINDINGS[e.key];
      if(!action)return;
      e.preventDefault();
      if(action==='action'){
        if(!e.repeat)act();
        return;
      }
      keys.current[action]=true;
    };
    const up=e=>{
      const action=KEY_BINDINGS[e.code]||KEY_BINDINGS[e.key];
      if(action&&action!=='action')keys.current[action]=false;
    };
    // Capture phase keeps the controls working even when the canvas has focus.
    window.addEventListener('keydown',down,{capture:true,passive:false});
    window.addEventListener('keyup',up,true);
    window.addEventListener('blur',clearKeys);
    document.addEventListener('visibilitychange',clearKeys);
    return()=>{
      window.removeEventListener('keydown',down,true);
      window.removeEventListener('keyup',up,true);
      window.removeEventListener('blur',clearKeys);
      document.removeEventListener('visibilitychange',clearKeys);
    };
  },[act]);
  useFrame((state,delta)=>{
    if(!root.current)return;
    const k=keys.current,x=Number(k.right)-Number(k.left),z=Number(k.down)-Number(k.up);
    const moving=!!(x||z),running=moving&&k.run&&!stealth.current,speed=stealth.current?1.55:running?7.2:3.7;
    if(moving){const d=new THREE.Vector3(x,0,z).normalize();root.current.position.addScaledVector(d,delta*speed);root.current.position.x=THREE.MathUtils.clamp(root.current.position.x,-24,24);root.current.position.z=THREE.MathUtils.clamp(root.current.position.z,-24,24);root.current.rotation.y=Math.atan2(d.x,d.z);}
    const t=state.clock.elapsedTime, stride=moving?Math.sin(t*(running?13:8))*(running ? 0.72 : 0.43):0;
    if(leftLeg.current)leftLeg.current.rotation.x=stride;if(rightLeg.current)rightLeg.current.rotation.x=-stride;
    if(leftArm.current)leftArm.current.rotation.x=-stride*.55;if(rightArm.current&&rightArm.current.rotation.x===0)rightArm.current.rotation.x=stride*.55;
    if(cloak.current){cloak.current.rotation.x=.08+Math.sin(t*4)*.025+(running?.08:0);}
    const offset=new THREE.Vector3(0,3.35,stealth.current?7.6:6.4).applyAxisAngle(new THREE.Vector3(0,1,0),root.current.rotation.y);
    state.camera.position.lerp(root.current.position.clone().add(offset),1-Math.exp(-4.5*delta));
    state.camera.lookAt(root.current.position.x,1.25,root.current.position.z);
  });
  return <group ref={root} position={[0,0,7]}>
    <mesh position={[0,1.18,0]} castShadow><capsuleGeometry args={[.37,.95,5,10]} /><meshStandardMaterial color="#a88b68" roughness={1} /></mesh>
    <mesh position={[0,1.48,-.22]} rotation-x={-.16} ref={cloak} castShadow><capsuleGeometry args={[.39,.9,5,10]} /><meshStandardMaterial color="#674333" roughness={1} /></mesh>
    <mesh position={[0,2.02,.015]} castShadow><sphereGeometry args={[.29,20,16]} /><meshStandardMaterial color="#a9704f" roughness={.95} /></mesh>
    <mesh position={[0,2.13,.015]} castShadow><sphereGeometry args={[.3,18,10,0,Math.PI*2,0,Math.PI/2]} /><meshStandardMaterial color="#30251f" roughness={1} /></mesh>
    <mesh position={[0,2.22,.015]}><torusGeometry args={[.29,.045,6,24]} /><meshStandardMaterial color="#b18a51" /></mesh>
    <mesh position={[0,1.83,.23]} castShadow><sphereGeometry args={[.16,12,8]} /><meshStandardMaterial color="#34251e" /></mesh>
    <group ref={leftLeg} position={[-.18,.7,0]}><mesh position={[0,-.34,0]} castShadow><capsuleGeometry args={[.13,.55,4,8]} /><meshStandardMaterial color="#514438" /></mesh></group>
    <group ref={rightLeg} position={[.18,.7,0]}><mesh position={[0,-.34,0]} castShadow><capsuleGeometry args={[.13,.55,4,8]} /><meshStandardMaterial color="#514438" /></mesh></group>
    <group ref={leftArm} position={[-.43,1.58,0]}><mesh position={[0,-.28,0]} castShadow><capsuleGeometry args={[.12,.52,4,8]} /><meshStandardMaterial color="#a9704f" /></mesh></group>
    <group ref={rightArm} position={[.43,1.58,0]}><mesh position={[0,-.28,0]} castShadow><capsuleGeometry args={[.12,.52,4,8]} /><meshStandardMaterial color="#a9704f" /></mesh></group>
    <mesh position={[0,.16,.08]} castShadow><boxGeometry args={[.66,.22,.82]} /><meshStandardMaterial color="#49392c" /></mesh>
    {isStealth&&<mesh position={[0,2.8,0]}><sphereGeometry args={[.52,12,8]} /><meshBasicMaterial color="#273b3b" transparent opacity={.12} /></mesh>}
  </group>;
}

function World({status,collected,onStatus,onCollected}) {
  return <>
    <Sky distance={450000} sunPosition={[-80,14,-65]} inclination={.46} azimuth={.25} rayleigh={2.4} turbidity={7} />
    <ambientLight intensity={.62} color="#f6dfbd" />
    <hemisphereLight args={['#f5dcb4','#67583e',.7]} />
    <directionalLight position={[-18,24,-12]} intensity={2.15} color="#ffd09a" castShadow shadow-mapSize={[1536,1536]} />
    <Terrain />
    <Mountain position={[-34,-2,-34]} scale={[2.3,1.7,2]} />
    <Mountain position={[-8,-3,-43]} scale={[3,2.1,2.2]} color="#82735f" />
    <Mountain position={[26,-2,-36]} scale={[2.6,1.9,2.1]} />
    <Mountain position={[38,-3,6]} scale={[2,1.5,2]} color="#8b785f" />
    <House position={[-7,0,-5]} rotation={.2} tone="#b5a083" />
    <House position={[7,0,-7]} rotation={-.4} tone="#a99475" />
    <House position={[-10,0,5]} rotation={.8} tone="#c0aa87" />
    <House position={[1,0,-13]} rotation={.3} tone="#a58d70" />
    <OliveTree position={[-15,0,-4]} scale={1.25} />
    <OliveTree position={[15,0,-13]} />
    <OliveTree position={[17,0,2]} scale={.9} />
    <OliveTree position={[-2,0,14]} scale={.85} />
    <WheatField position={[12,0,8]} />
    <WheatField position={[-13,0,-12]} count={120} />
    <Fence position={[6,0,13]} length={8} />
    <Fence position={[14,0,13]} length={6} />
    <Jar position={[-4,0,2]} /><Jar position={[-3.2,0,2.2]} />
    <WheatBundle collected={collected} />
    <group position={POST.toArray()}><mesh position={[0,1.1,0]} castShadow><cylinderGeometry args={[.13,.17,2.2,8]} /><meshStandardMaterial color="#68492f" /></mesh><mesh position={[0,1.7,0]} castShadow><sphereGeometry args={[.34,12,10]} /><meshStandardMaterial color="#98714c" /></mesh></group>
    <Gideon onStatus={onStatus} onCollected={onCollected} />
    <ContactShadows position={[0,.03,0]} opacity={.38} scale={48} blur={2.8} far={14} />
  </>;
}

export default function App() {
  const [status,setStatus]=useState('Explora la aldea y encuentra el trigo.');
  const [collected,setCollected]=useState(false);
  const onStatus=useCallback(v=>setStatus(v),[]);
  const onCollected=useCallback(()=>setCollected(true),[]);
  return <main className="game">
    <Canvas shadows camera={{position:[0,4,14],fov:49}} dpr={[1,1.5]} gl={{antialias:true,alpha:false}}>
      <color attach="background" args={['#c8a77d']} /><fog attach="fog" args={['#c8a77d',36,92]} />
      <World status={status} collected={collected} onStatus={onStatus} onCollected={onCollected} />
    </Canvas>
    <header className="hud"><div className="brand">GEDEÓN <span>300</span></div><div className="chapter">CAPÍTULO I · TIEMPOS DE OPRESIÓN</div></header>
    <section className="mission"><p className="eyebrow">MISIÓN PRINCIPAL</p><h1>{collected?'Trigo recuperado':'Encuentra tu escondite'}</h1><p>{collected?'Has recuperado el trigo que escondiste.':status}</p><div className="objective"><span className={collected?'complete':''}/>{collected?'Objetivo completado':'Busca el trigo en el campo'}</div></section>
    <footer className="controls"><span>MOVER</span><b>↑</b><b>←</b><b>↓</b><b>→</b><span>CORRER</span><b>Z</b><span>ACCIÓN / SIGILO</span><b>X</b></footer>
  </main>;
}
