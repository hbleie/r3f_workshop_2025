import { Sky, useTexture } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import {
  Viverse,
  SimpleCharacter,
  BvhPhysicsBody,
  PrototypeBox,
  FirstPersonCharacterCameraBehavior,
  PointerLockInput,
  LocomotionKeyboardInput,
} from '@react-three/viverse'

function Scene() {
  const texture = useTexture('/image.png')

  return (
    <>
      <Sky />
      <directionalLight intensity={1.2} position={[-10, 10, -10]} />
      <ambientLight intensity={1} />
      <SimpleCharacter
        model={false}
        input={[LocomotionKeyboardInput, PointerLockInput]}
        cameraBehavior={FirstPersonCharacterCameraBehavior}
      />
      <BvhPhysicsBody>
        <PrototypeBox scale={[10, 1, 15]} position={[0, -0.5, 0]} />
      </BvhPhysicsBody>

      {/* Textured box */}
      <BvhPhysicsBody>
        <mesh position={[0, 1, -3]} scale={[2, 2, 2]}>
          <boxGeometry />
          <meshStandardMaterial map={texture} />
        </mesh>
      </BvhPhysicsBody>
    </>
  )
}

export function ViverseFirstPerson() {
  return (
    <Canvas
      onClick={(e) => (e.target as HTMLElement).requestPointerLock()}
      style={{ position: 'absolute', inset: '0', touchAction: 'none' }}
    >
      <Viverse>
        <Scene />
      </Viverse>
    </Canvas>
  )
}