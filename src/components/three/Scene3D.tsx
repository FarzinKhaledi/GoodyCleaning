"use client";

import { useRef, useMemo } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ScrollControls, useScroll, Float, Stars, Text } from "@react-three/drei";
import * as THREE from "three";
import { BenefitIcons } from "./scenes/BenefitIcons";
import { TestimonialCards } from "./scenes/TestimonialCards";

function Particles({ count = 800, color = "#7EE1BF" }) {
  const ref = useRef<THREE.Points>(null);
  const scroll = useScroll();

  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 20;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 20;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 20;
    }
    return pos;
  }, [count]);

  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime;
    ref.current.rotation.y = t * 0.05 + scroll.offset * Math.PI;
    ref.current.rotation.x = scroll.offset * 0.5;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial size={0.04} color={color} transparent opacity={0.6} />
    </points>
  );
}

function LowPolyHouse() {
  const group = useRef<THREE.Group>(null);
  const scroll = useScroll();

  useFrame(() => {
    if (!group.current) return;
    const offset = scroll.offset;
    group.current.rotation.y = offset * Math.PI * 0.5;
    group.current.position.y = Math.sin(offset * Math.PI) * 0.5;
  });

  return (
    <group ref={group} position={[0, -1, 0]}>
      {/* Base */}
      <mesh position={[0, 0.5, 0]}>
        <boxGeometry args={[3, 1, 2.5]} />
        <meshStandardMaterial color="#1a3a5c" />
      </mesh>
      {/* Roof */}
      <mesh position={[0, 1.5, 0]} rotation={[0, Math.PI / 4, 0]}>
        <coneGeometry args={[2.2, 1.2, 4]} />
        <meshStandardMaterial color="#7EE1BF" />
      </mesh>
      {/* Door */}
      <mesh position={[0, 0.3, 1.26]}>
        <boxGeometry args={[0.6, 0.8, 0.05]} />
        <meshStandardMaterial color="#0B1B3A" />
      </mesh>
      {/* Windows with warm glow */}
      {[[-0.8, 0.6, 1.26], [0.8, 0.6, 1.26]].map((pos, i) => (
        <mesh key={i} position={pos as [number, number, number]}>
          <boxGeometry args={[0.5, 0.5, 0.05]} />
          <meshStandardMaterial
            color="#FFE4A0"
            emissive="#FFE4A0"
            emissiveIntensity={0.5 + scroll.offset * 2}
          />
        </mesh>
      ))}
    </group>
  );
}

function CleaningTools() {
  const group = useRef<THREE.Group>(null);
  const scroll = useScroll();

  useFrame((state) => {
    if (!group.current) return;
    const t = state.clock.elapsedTime;
    group.current.rotation.y = t * 0.3;
    group.current.visible = scroll.offset > 0.25 && scroll.offset < 0.55;
  });

  const tools = [
    { pos: [2, 0, 0] as [number, number, number], color: "#7EE1BF", geo: "cylinder" },
    { pos: [-2, 0.5, 0] as [number, number, number], color: "#4ECDC4", geo: "box" },
    { pos: [0, -1, 2] as [number, number, number], color: "#FFE66D", geo: "sphere" },
    { pos: [1.5, 1, -1.5] as [number, number, number], color: "#FF6B6B", geo: "box" },
  ];

  return (
    <group ref={group}>
      {tools.map((tool, i) => (
        <Float key={i} speed={2} floatIntensity={0.5}>
          <mesh position={tool.pos}>
            {tool.geo === "cylinder" && <cylinderGeometry args={[0.15, 0.15, 1, 8]} />}
            {tool.geo === "box" && <boxGeometry args={[0.4, 0.6, 0.3]} />}
            {tool.geo === "sphere" && <sphereGeometry args={[0.3, 16, 16]} />}
            <meshStandardMaterial color={tool.color} />
          </mesh>
        </Float>
      ))}
    </group>
  );
}

function CameraRig() {
  const scroll = useScroll();
  const { camera } = useThree();

  useFrame(() => {
    const offset = scroll.offset;
    camera.position.x = Math.sin(offset * Math.PI * 2) * 3;
    camera.position.y = 2 + Math.sin(offset * Math.PI) * 1.5;
    camera.position.z = 6 - offset * 3;
    camera.lookAt(0, 0, 0);
  });

  return null;
}

function Scene() {
  const scroll = useScroll();

  return (
    <>
      <color attach="background" args={["#0B1B3A"]} />
      <fog attach="fog" args={["#0B1B3A", 5, 20]} />
      <ambientLight intensity={0.3} />
      <directionalLight position={[5, 5, 5]} intensity={0.8} />
      <pointLight position={[-3, 2, 2]} color="#7EE1BF" intensity={0.5} />

      <CameraRig />
      <Particles />

      {scroll.offset < 0.15 && (
        <Text
          position={[0, 1, -2]}
          fontSize={0.5}
          color="#7EE1BF"
          anchorX="center"
          anchorY="middle"
        >
          Goodycleaning
        </Text>
      )}

      <Float speed={1} floatIntensity={0.3}>
        <LowPolyHouse />
      </Float>

      <CleaningTools />
      <BenefitIcons scrollOffset={scroll.offset} />
      <TestimonialCards scrollOffset={scroll.offset} />
      <Stars radius={50} depth={50} count={2000} factor={3} fade speed={0.5} />
    </>
  );
}

export function Scene3D() {
  return (
    <div className="fixed inset-0 -z-10">
      <Canvas camera={{ position: [0, 2, 6], fov: 60 }}>
        <ScrollControls pages={7} damping={0.2}>
          <Scene />
        </ScrollControls>
      </Canvas>
    </div>
  );
}
