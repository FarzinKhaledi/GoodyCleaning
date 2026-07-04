"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

export function TestimonialCards({ scrollOffset }: { scrollOffset: number }) {
  const group = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (!group.current) return;
    group.current.visible = scrollOffset > 0.75 && scrollOffset < 0.9;
    group.current.position.x = Math.sin(state.clock.elapsedTime * 0.5) * 0.5;
  });

  const cards = [-2, 0, 2];

  return (
    <group ref={group}>
      {cards.map((x, i) => (
        <mesh key={i} position={[x, 0.5, -1]} rotation={[0, 0, 0]}>
          <boxGeometry args={[1.8, 1, 0.05]} />
          <meshStandardMaterial
            color="#ffffff"
            transparent
            opacity={0.15}
            emissive="#7EE1BF"
            emissiveIntensity={0.1}
          />
        </mesh>
      ))}
    </group>
  );
}
