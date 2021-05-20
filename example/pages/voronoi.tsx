import 'react-app-polyfill/ie11'
import * as React from 'react'
import { Suspense, useRef } from 'react'
import { Canvas, useFrame } from 'react-three-fiber'
import { Environment, Sphere } from '@react-three/drei'
import { useTweaks } from 'use-tweaks'
import M, { GenericMaterial } from '../../dist'
import voronoi from '../voronoi'

function Scene(): JSX.Element {
  const material = useRef<GenericMaterial>()
  const sphere = useRef()

  const { amplitude, frequency, jitter, metalness, roughness } = useTweaks({
    metalness: { value: 1, min: 0, max: 1 },
    roughness: { value: 1, min: 0, max: 1 },
    amplitude: { value: 1, min: -5, max: 5 },
    frequency: { value: 0.85, min: 0, max: 10 },
    jitter: { value: 0.9, min: 0, max: 2 },
  })

  useFrame(({ clock }) => {
    if (material.current) {
      material.current.time = clock.getElapsedTime()
    }
  })

  const RADIUS = 4

  return (
    <Sphere args={[4, 512, 512]} ref={sphere}>
      <M
        ref={material}
        roughness={roughness}
        metalness={metalness}
        uniforms={{
          radius: { value: RADIUS, type: 'float' },
          time: { value: 0, type: 'float' },
          jitter: { value: jitter, type: 'float' },
          amplitude: { value: amplitude, type: 'float' },
          frequency: { value: frequency, type: 'float' },
        }}
        varyings={{ vTransformed: { type: 'vec3' } }}
        color="white">
        <M.Vert.Head>
          {/*glsl*/ `
            ${voronoi}

            vec3 distortFunct(vec3 transformed, float factor) {
              vec3 deformed = transformed.xyz * vec3(1., 7., 3.);
              vec2 f = worley(deformed * frequency * 0.1 + time * 0.4, jitter, false) * amplitude * factor;
              return normalize(transformed) * (f.x + radius);
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
          `}
        </M.Vert.Head>
        <M.Vert.Body>
          {/*glsl*/ `
            float updateTime = time / 10.0;
            
            transformed = distortFunct(transformed, 1.0);

            vec3 distortedNormal = distortNormal(position, transformed, normal);

            vTransformed = transformed;
            
            vNormal = normal + distortedNormal;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(transformed,1.);
          `}
        </M.Vert.Body>
      </M>
    </Sphere>
  )
}

function App() {
  return (
    <Canvas camera={{ position: [0, 0, 10] }}>
      <color args={[0, 0, 0]} attach="background" />
      <directionalLight position={[0, 0, 10]} intensity={0.4} />
      <spotLight position={[8, 8, -8]} angle={Math.PI} intensity={1} />
      <spotLight position={[-4, 8, 4]} color="blue" angle={Math.PI} intensity={0.4} />
      <directionalLight position={[4, -8, 0]} color="red" intensity={0.4} />
      <Scene />
      <Suspense fallback={null}>
        <Environment preset="studio" />
      </Suspense>
    </Canvas>
  )
}

export default App
