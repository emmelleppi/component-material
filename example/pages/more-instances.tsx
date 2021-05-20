import 'react-app-polyfill/ie11'
import * as React from 'react'
import { Suspense, useRef } from 'react'
import { Canvas, useFrame } from 'react-three-fiber'
import { Environment, Sphere } from '@react-three/drei'
import { useTweaks } from 'use-tweaks'
import distortion from '../simplex3d'
import M, { GenericMaterial } from '../../dist'

const RADIUS = 4

function CustomMaterial(props) {
  const material = useRef<GenericMaterial>()
  const { metalness, clearcoat, roughness, radiusVariationAmplitude, radiusNoiseFrequency } = useTweaks({
    metalness: { value: 1, min: 0, max: 1 },
    clearcoat: { value: 0.6, min: 0, max: 1 },
    roughness: { value: 0.5, min: 0, max: 1 },
    radiusVariationAmplitude: { value: 1.25, min: 0, max: 5 },
    radiusNoiseFrequency: { value: 0.2, min: 0, max: 2 },
  })
  useFrame(({ clock }) => {
    if (material.current) {
      material.current.time = clock.getElapsedTime()
    }
  })
  return (
    <M
      ref={material}
      clearcoat={clearcoat}
      metalness={metalness}
      roughness={roughness}
      {...props}
      uniforms={{
        radius: { value: RADIUS, type: 'float' },
        time: { value: 0, type: 'float' },
        radiusVariationAmplitude: { value: radiusVariationAmplitude, type: 'float' },
        radiusNoiseFrequency: { value: radiusNoiseFrequency, type: 'float' },
      }}>
      <M.Vert.Head>{/*glsl*/ `
          ${distortion}
          
          float fsnoise(float val1, float val2, float val3){
            return snoise(vec3(val1,val2,val3));
          }

          vec3 distortFunct(vec3 transformed, float factor) {
            float radiusVariation = -fsnoise(
              transformed.x * radiusNoiseFrequency + time,
              transformed.y * radiusNoiseFrequency + time,
              transformed.z * radiusNoiseFrequency + time 
            ) * radiusVariationAmplitude * factor;
            return normalize(transformed) * (radiusVariation + radius);
          }

          vec3 orthogonal(vec3 v) {
            return normalize(abs(v.x) > abs(v.z) ? vec3(-v.y, v.x, 0.0)
            : vec3(0.0, -v.z, v.y));
          }

          vec3 distortNormal(vec3 position, vec3 distortedPosition, vec3 normal){
            vec3 tangent1 = orthogonal(normal);
            vec3 tangent2 = normalize(cross(normal, tangent1));
            vec3 nearby1 = position + tangent1 * 0.1;
            vec3 nearby2 = position + tangent2 * 0.1;
            vec3 distorted1 = distortFunct(nearby1, 1.0);
            vec3 distorted2 = distortFunct(nearby2, 1.0);
            return normalize(cross(distorted1 - distortedPosition, distorted2 - distortedPosition));
          }
        `}</M.Vert.Head>
      <M.Vert.Body>{/*glsl*/ `
          float updateTime = time / 10.0;
          transformed = distortFunct(transformed, 1.0);
          vec3 distortedNormal = distortNormal(position, transformed, normal);
          vNormal = normal + distortedNormal;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(transformed,1.);
        `}</M.Vert.Body>
    </M>
  )
}

function Scene({ color, ...props }) {
  return (
    <Sphere args={[1, 512, 512]} {...props}>
      <CustomMaterial color={color} />
    </Sphere>
  )
}

function App() {
  return (
    <>
      <Canvas camera={{ position: [0, 0, 10] }}>
        <color args={[0, 0, 0]} attach="background" />
        <ambientLight intensity={0.2} />
        <directionalLight position={[3, 3, -3]} intensity={4} />
        <directionalLight position={[-10, 10, -10]} intensity={1} />
        <Scene scale={[0.2, 0.2, 0.2]} position-x={-6} color="purple" />
        <Scene scale={[0.2, 0.2, 0.2]} position-x={-2} color="red" />
        <Scene scale={[0.2, 0.2, 0.2]} position-x={2} color="green" />
        <Scene scale={[0.2, 0.2, 0.2]} position-x={6} color="yellow" />
        <Suspense fallback={null}>
          <Environment preset="studio" />
        </Suspense>
      </Canvas>
    </>
  )
}

export default App
