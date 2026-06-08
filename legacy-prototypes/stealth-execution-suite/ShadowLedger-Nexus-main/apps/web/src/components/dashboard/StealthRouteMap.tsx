// Built by vsrupeshkumar
"use client";

import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, Line, Sphere, Stars } from '@react-three/drei';
import * as THREE from 'three';

function RouteLine({ start, end, color }: { start: [number, number, number], end: [number, number, number], color: string }) {
  const lineRef = useRef<any>(null);
  
  useFrame((state) => {
    if (lineRef.current) {
      lineRef.current.dashOffset -= 0.01;
    }
  });

  const points = useMemo(() => [
    new THREE.Vector3(...start),
    new THREE.Vector3(start[0], end[1], start[2]),
    new THREE.Vector3(...end)
  ], [start, end]);

  return (
    <Line
      ref={lineRef}
      points={points}
      color={color}
      lineWidth={1}
      dashed
      dashScale={5}
      dashSize={0.5}
    />
  );
}

function Nodes() {
  const nodes = useMemo(() => {
    return Array.from({ length: 8 }).map((_, i) => ({
      position: [
        (Math.random() - 0.5) * 10,
        (Math.random() - 0.5) * 10,
        (Math.random() - 0.5) * 5
      ] as [number, number, number],
      color: i === 0 ? "#00f2ff" : "#7000ff"
    }));
  }, []);

  return (
    <>
      {nodes.map((node, i) => (
        <Float key={i} speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
          <Sphere args={[0.15, 16, 16]} position={node.position}>
            <meshStandardMaterial 
              color={node.color} 
              emissive={node.color} 
              emissiveIntensity={2} 
            />
          </Sphere>
          {i > 0 && (
            <RouteLine 
              start={nodes[0].position} 
              end={node.position} 
              color={node.color} 
            />
          )}
        </Float>
      ))}
    </>
  );
}

export function StealthRouteMap() {
  return (
    <div className="w-full h-full min-h-[300px] rounded-3xl overflow-hidden bg-black/20 border border-white/5 relative">
      <div className="absolute top-4 left-4 z-10">
        <p className="text-[10px] font-mono text-cyan-glow uppercase tracking-widest">Active Camouflage Routing</p>
        <p className="text-xs text-muted-foreground">Path randomization: ACTIVE</p>
      </div>
      
      <Canvas camera={{ position: [0, 0, 15], fov: 45 }}>
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1} />
        <Nodes />
        <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
      </Canvas>
    </div>
  );
}
