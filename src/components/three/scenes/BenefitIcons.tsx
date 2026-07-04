"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Float } from "@react-three/drei";
import * as THREE from "three";

export function BenefitIcons({ scrollOffset }: { scrollOffset: number }) {
  const group = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (!group.current) return;
    group.current.visible = scrollOffset > 0.55 && scrollOffset < 0.75;
    group.current.rotation.y = state.clock.elapsedTime * 0.2;
  });

  const icons = [
    { pos: [-2, 0, 0] as [number, number, number], color: "#7EE1BF" },
    { pos: [2, 0, 0] as [number, number, number], color: "#4ECDC4" },
    { pos: [0, 2, 0] as [number, number, number], color: "#FFE66D" },
    { pos: [0, -2, 0] as [number, number, number], color: "#FF6B6B" },
  ];

  return (
    <group ref={group}>
      {icons.map((icon, i) => (
        <Float key={i} speed={1.5} floatIntensity={0.4}>
          <mesh position={icon.pos}>
            <octahedronGeometry args={[0.4, 0]} />
            <meshStandardMaterial
              color={icon.color}
              emissive={icon.color}
              emissiveIntensity={0.3}
            />
          </mesh>
        </Float>
      ))}
    </group>
  );
}
