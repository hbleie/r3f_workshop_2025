import { Sky, Text } from '@react-three/drei'
import { SimpleCharacter, BvhPhysicsBody, BvhPhysicsSensor, PrototypeBox } from '@react-three/viverse'
import { useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Group, Vector3 } from 'three'

interface Box {
  id: number
  position: [number, number, number]
}

interface HealthOrb {
  id: number
  position: [number, number, number]
}

const platformPositions: Array<[number, number, number]> = [
  [0, -2, 0],        // Main ground
  [8, 0, 8],         // Platform 1 - low, northeast
  [-8, 0, 8],        // Platform 2 - low, northwest
  [8, 0, -8],        // Platform 3 - low, southeast
  [-8, 0, -8],       // Platform 4 - low, southwest
  [12, 2, 0],        // Platform 5 - mid, east
  [-12, 2, 0],       // Platform 6 - mid, west
  [0, 2, 12],        // Platform 7 - mid, north
  [0, 2, -12],       // Platform 8 - mid, south
  [0, 5, 0],         // Center high platform - peak
]

export function Scene() {
  const characterRef = useRef<Group>(null)
  const zombieRef = useRef<Group>(null)
  const [counter, setCounter] = useState(0)
  const [health, setHealth] = useState(100)
  const [damageFlash, setDamageFlash] = useState(0)
  const [gameOver, setGameOver] = useState(false)
  const [boxes, setBoxes] = useState<Box[]>([
    { id: 0, position: [3, 0, 0] }
  ])
  const [healthOrbs, setHealthOrbs] = useState<HealthOrb[]>([
    { id: 1000, position: [-3, 0, 0] }
  ])
  const nextIdRef = useRef(1)
  const nextHealthOrbIdRef = useRef(1001)
  const zombieMoveTimerRef = useRef(0)
  const zombieAttackCooldownRef = useRef(0)
  const [zombiePosition, setZombiePosition] = useState(new Vector3(-5, -1.5, -5))
  const { camera } = useThree()

    // Respawn logic
  useFrame((_state, delta) => {
    if (characterRef.current == null || gameOver) {
      return
    }

    const currentY = characterRef.current.position.y

    // Fade out damage flash
    if (damageFlash > 0) {
      setDamageFlash(prev => Math.max(0, prev - 0.02))
    }

    // Zombie attack cooldown
    if (zombieAttackCooldownRef.current > 0) {
      zombieAttackCooldownRef.current -= delta
    }

    // Zombie AI - move towards player, gets faster every 5 points
    // Base speed: 1 second per move, reduced by 0.1 seconds for each 5 points (minimum 0.2 seconds)
    const speedLevel = Math.floor(counter / 5)
    const zombieMoveInterval = Math.max(0.2, 1.0 - (speedLevel * 0.1))
    
    zombieMoveTimerRef.current += delta
    if (zombieMoveTimerRef.current >= zombieMoveInterval) {
      zombieMoveTimerRef.current = 0
      
      const playerPos = characterRef.current.position
      const direction = new Vector3(
        playerPos.x - zombiePosition.x,
        0,
        playerPos.z - zombiePosition.z
      ).normalize()
      
      // Move one unit towards player and match player's Y position (with slight offset)
      const newZombiePos = new Vector3(
        zombiePosition.x + direction.x,
        playerPos.y - 0.5, // Match player height with slight offset
        zombiePosition.z + direction.z
      )
      setZombiePosition(newZombiePos)
      
      if (zombieRef.current) {
        zombieRef.current.position.copy(newZombiePos)
        // Make zombie look at player
        zombieRef.current.lookAt(playerPos.x, newZombiePos.y, playerPos.z)
      }
    }

    // Check zombie collision with player - 25% damage with 1 second cooldown
    if (zombieRef.current && characterRef.current && zombieAttackCooldownRef.current <= 0) {
      const distance = zombiePosition.distanceTo(characterRef.current.position)
      if (distance < 1.5) {
        setDamageFlash(1) // Trigger red flash
        zombieAttackCooldownRef.current = 1.0 // 1 second cooldown between attacks
        setHealth(prev => {
          const newHealth = Math.max(0, prev - 25)
          if (newHealth === 0) {
            setGameOver(true)
          }
          return newHealth
        })
      }
    }

    // Reset if fell off the map
    if (currentY < -10) {
      setDamageFlash(1) // Trigger red flash
      setHealth(0)
      setGameOver(true)
      if (characterRef.current) {
        characterRef.current.position.set(0, 0, 0)
      }
    }
  })

  const handleBoxCollision = (id: number) => {
    if (gameOver) return
    
    setCounter(prev => prev + 1)
    setBoxes(prev => {
      const filtered = prev.filter(box => box.id !== id)
      // Pick a random platform
      const platform = platformPositions[Math.floor(Math.random() * platformPositions.length)]
      const x = platform[0] + (Math.random() - 0.5) * 3 // Smaller spawn area
      const y = platform[1] + 1 // Above the platform
      const z = platform[2] + (Math.random() - 0.5) * 3
      return [...filtered, { id: nextIdRef.current++, position: [x, y, z] }]
    })
  }

  const handleRestart = () => {
    setGameOver(false)
    setHealth(100)
    setCounter(0)
    setDamageFlash(0)
    if (characterRef.current) {
      characterRef.current.position.set(0, 0, 0)
    }
    setBoxes([{ id: 0, position: [3, 0, 0] }])
    nextIdRef.current = 1
    zombieMoveTimerRef.current = 0
    zombieAttackCooldownRef.current = 0
    setZombiePosition(new Vector3(-5, -1.5, -5))
    if (zombieRef.current) {
      zombieRef.current.position.set(-5, -1.5, -5)
    }
  }

  const healthColor = health > 50 ? '#4CAF50' : health > 25 ? '#FFA500' : '#FF0000'

  return (
    <>
      {/* Environment */}
      <Sky />
      
      {/* Red flash effect using fog */}
      {damageFlash > 0 && (
        <fog attach="fog" args={['red', 1, 50]} />
      )}

      {/* Lighting with red tint on damage */}
      <directionalLight
        intensity={1.2}
        position={[5, 10, 10]}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-left={-20}
        shadow-camera-right={20}
        shadow-camera-top={20}
        shadow-camera-bottom={-20}
      />
      <ambientLight 
        intensity={1} 
        color={damageFlash > 0 ? `rgb(${255}, ${Math.floor(255 * (1 - damageFlash * 0.8))}, ${Math.floor(255 * (1 - damageFlash * 0.8))})` : 'white'}
      />

      {/* Character */}
      <SimpleCharacter ref={characterRef} />

      {/* Zombie - green box that hunts the player */}
      {!gameOver && (
        <group ref={zombieRef} position={zombiePosition}>
          <mesh position={[0, 0.5, 0]}>
            <boxGeometry args={[0.8, 1.6, 0.8]} />
            <meshStandardMaterial color="#00FF00" />
          </mesh>
          {/* Zombie eyes */}
          <mesh position={[0.2, 1, 0.4]}>
            <sphereGeometry args={[0.1, 16, 16]} />
            <meshStandardMaterial color="#FF0000" emissive="#FF0000" emissiveIntensity={2} />
          </mesh>
          <mesh position={[-0.2, 1, 0.4]}>
            <sphereGeometry args={[0.1, 16, 16]} />
            <meshStandardMaterial color="#FF0000" emissive="#FF0000" emissiveIntensity={2} />
          </mesh>
        </group>
      )}

                       {/* Level Geometry */}
      <BvhPhysicsBody>
        {/* Main ground platform */}
        <PrototypeBox
          color="#87CEEB"
          scale={[20, 0.5, 20]}
          position={[0, -2, 0]}
        />

        {/* Low corner platforms - 4 corners */}
        {/* Platform 1 - Northeast */}
        <PrototypeBox color="#FF6B6B" scale={[3, 0.5, 3]} position={[8, 0, 8]} />
        <PrototypeBox color="#FF8E8E" scale={[1.5, 0.3, 1.5]} position={[2, -1.65, 2]} />
        <PrototypeBox color="#FF8E8E" scale={[1.5, 0.3, 1.5]} position={[4, -1.15, 4]} />
        <PrototypeBox color="#FF8E8E" scale={[1.5, 0.3, 1.5]} position={[6, -0.65, 6]} />
        <PrototypeBox color="#FF8E8E" scale={[1.5, 0.3, 1.5]} position={[7.2, -0.15, 7.2]} />

        {/* Platform 2 - Northwest */}
        <PrototypeBox color="#4ECDC4" scale={[3, 0.5, 3]} position={[-8, 0, 8]} />
        <PrototypeBox color="#6FD9D1" scale={[1.5, 0.3, 1.5]} position={[-2, -1.65, 2]} />
        <PrototypeBox color="#6FD9D1" scale={[1.5, 0.3, 1.5]} position={[-4, -1.15, 4]} />
        <PrototypeBox color="#6FD9D1" scale={[1.5, 0.3, 1.5]} position={[-6, -0.65, 6]} />
        <PrototypeBox color="#6FD9D1" scale={[1.5, 0.3, 1.5]} position={[-7.2, -0.15, 7.2]} />

        {/* Platform 3 - Southeast */}
        <PrototypeBox color="#95E1D3" scale={[3, 0.5, 3]} position={[8, 0, -8]} />
        <PrototypeBox color="#AAEAE2" scale={[1.5, 0.3, 1.5]} position={[2, -1.65, -2]} />
        <PrototypeBox color="#AAEAE2" scale={[1.5, 0.3, 1.5]} position={[4, -1.15, -4]} />
        <PrototypeBox color="#AAEAE2" scale={[1.5, 0.3, 1.5]} position={[6, -0.65, -6]} />
        <PrototypeBox color="#AAEAE2" scale={[1.5, 0.3, 1.5]} position={[7.2, -0.15, -7.2]} />

        {/* Platform 4 - Southwest */}
        <PrototypeBox color="#FFD93D" scale={[3, 0.5, 3]} position={[-8, 0, -8]} />
        <PrototypeBox color="#FFE066" scale={[1.5, 0.3, 1.5]} position={[-2, -1.65, -2]} />
        <PrototypeBox color="#FFE066" scale={[1.5, 0.3, 1.5]} position={[-4, -1.15, -4]} />
        <PrototypeBox color="#FFE066" scale={[1.5, 0.3, 1.5]} position={[-6, -0.65, -6]} />
        <PrototypeBox color="#FFE066" scale={[1.5, 0.3, 1.5]} position={[-7.2, -0.15, -7.2]} />

        {/* Mid-level platforms - 4 cardinal directions */}
        {/* Platform 5 - East */}
        <PrototypeBox color="#E76F51" scale={[2.5, 0.5, 2.5]} position={[12, 2, 0]} />
        <PrototypeBox color="#F4A261" scale={[1.2, 0.3, 1.2]} position={[9, 0.5, 2]} />
        <PrototypeBox color="#F4A261" scale={[1.2, 0.3, 1.2]} position={[10, 1.0, 1]} />
        <PrototypeBox color="#F4A261" scale={[1.2, 0.3, 1.2]} position={[11, 1.5, 0.5]} />
        <PrototypeBox color="#F4A261" scale={[1.2, 0.3, 1.2]} position={[11.5, 1.85, 0.2]} />

        <PrototypeBox color="#F4A261" scale={[1.2, 0.3, 1.2]} position={[9, 0.5, -2]} />
        <PrototypeBox color="#F4A261" scale={[1.2, 0.3, 1.2]} position={[10, 1.0, -1]} />
        <PrototypeBox color="#F4A261" scale={[1.2, 0.3, 1.2]} position={[11, 1.5, -0.5]} />
        <PrototypeBox color="#F4A261" scale={[1.2, 0.3, 1.2]} position={[11.5, 1.85, -0.2]} />

        {/* Platform 6 - West */}
        <PrototypeBox color="#2A9D8F" scale={[2.5, 0.5, 2.5]} position={[-12, 2, 0]} />
        <PrototypeBox color="#3CB9A9" scale={[1.2, 0.3, 1.2]} position={[-9, 0.5, 2]} />
        <PrototypeBox color="#3CB9A9" scale={[1.2, 0.3, 1.2]} position={[-10, 1.0, 1]} />
        <PrototypeBox color="#3CB9A9" scale={[1.2, 0.3, 1.2]} position={[-11, 1.5, 0.5]} />
        <PrototypeBox color="#3CB9A9" scale={[1.2, 0.3, 1.2]} position={[-11.5, 1.85, 0.2]} />

        <PrototypeBox color="#3CB9A9" scale={[1.2, 0.3, 1.2]} position={[-9, 0.5, -2]} />
        <PrototypeBox color="#3CB9A9" scale={[1.2, 0.3, 1.2]} position={[-10, 1.0, -1]} />
        <PrototypeBox color="#3CB9A9" scale={[1.2, 0.3, 1.2]} position={[-11, 1.5, -0.5]} />
        <PrototypeBox color="#3CB9A9" scale={[1.2, 0.3, 1.2]} position={[-11.5, 1.85, -0.2]} />

        {/* Platform 7 - North */}
        <PrototypeBox color="#9B59B6" scale={[2.5, 0.5, 2.5]} position={[0, 2, 12]} />
        <PrototypeBox color="#B57EDC" scale={[1.2, 0.3, 1.2]} position={[2, 0.5, 9]} />
        <PrototypeBox color="#B57EDC" scale={[1.2, 0.3, 1.2]} position={[1, 1.0, 10]} />
        <PrototypeBox color="#B57EDC" scale={[1.2, 0.3, 1.2]} position={[0.5, 1.5, 11]} />
        <PrototypeBox color="#B57EDC" scale={[1.2, 0.3, 1.2]} position={[0.2, 1.85, 11.5]} />

        <PrototypeBox color="#B57EDC" scale={[1.2, 0.3, 1.2]} position={[-2, 0.5, 9]} />
        <PrototypeBox color="#B57EDC" scale={[1.2, 0.3, 1.2]} position={[-1, 1.0, 10]} />
        <PrototypeBox color="#B57EDC" scale={[1.2, 0.3, 1.2]} position={[-0.5, 1.5, 11]} />
        <PrototypeBox color="#B57EDC" scale={[1.2, 0.3, 1.2]} position={[-0.2, 1.85, 11.5]} />

        {/* Platform 8 - South */}
        <PrototypeBox color="#E74C3C" scale={[2.5, 0.5, 2.5]} position={[0, 2, -12]} />
        <PrototypeBox color="#EC7063" scale={[1.2, 0.3, 1.2]} position={[2, 0.5, -9]} />
        <PrototypeBox color="#EC7063" scale={[1.2, 0.3, 1.2]} position={[1, 1.0, -10]} />
        <PrototypeBox color="#EC7063" scale={[1.2, 0.3, 1.2]} position={[0.5, 1.5, -11]} />
        <PrototypeBox color="#EC7063" scale={[1.2, 0.3, 1.2]} position={[0.2, 1.85, -11.5]} />

        <PrototypeBox color="#EC7063" scale={[1.2, 0.3, 1.2]} position={[-2, 0.5, -9]} />
        <PrototypeBox color="#EC7063" scale={[1.2, 0.3, 1.2]} position={[-1, 1.0, -10]} />
        <PrototypeBox color="#EC7063" scale={[1.2, 0.3, 1.2]} position={[-0.5, 1.5, -11]} />
        <PrototypeBox color="#EC7063" scale={[1.2, 0.3, 1.2]} position={[-0.2, 1.85, -11.5]} />

        {/* Center high platform - accessible from all 4 mid-level platforms */}
        <PrototypeBox color="#A78BFA" scale={[3, 0.5, 3]} position={[0, 5, 0]} />
        
        {/* Stairs from East platform to center */}
        <PrototypeBox color="#C4B5FD" scale={[1.2, 0.3, 1.2]} position={[11, 2.4, 0]} />
        <PrototypeBox color="#C4B5FD" scale={[1.2, 0.3, 1.2]} position={[9, 2.9, 0]} />
        <PrototypeBox color="#C4B5FD" scale={[1.2, 0.3, 1.2]} position={[7, 3.4, 0]} />
        <PrototypeBox color="#C4B5FD" scale={[1.2, 0.3, 1.2]} position={[5, 3.9, 0]} />
        <PrototypeBox color="#C4B5FD" scale={[1.2, 0.3, 1.2]} position={[3, 4.4, 0]} />
        <PrototypeBox color="#C4B5FD" scale={[1.2, 0.3, 1.2]} position={[1.7, 4.85, 0]} />

        {/* Stairs from West platform to center */}
        <PrototypeBox color="#C4B5FD" scale={[1.2, 0.3, 1.2]} position={[-11, 2.4, 0]} />
        <PrototypeBox color="#C4B5FD" scale={[1.2, 0.3, 1.2]} position={[-9, 2.9, 0]} />
        <PrototypeBox color="#C4B5FD" scale={[1.2, 0.3, 1.2]} position={[-7, 3.4, 0]} />
        <PrototypeBox color="#C4B5FD" scale={[1.2, 0.3, 1.2]} position={[-5, 3.9, 0]} />
        <PrototypeBox color="#C4B5FD" scale={[1.2, 0.3, 1.2]} position={[-3, 4.4, 0]} />
        <PrototypeBox color="#C4B5FD" scale={[1.2, 0.3, 1.2]} position={[-1.7, 4.85, 0]} />

        {/* Stairs from North platform to center */}
        <PrototypeBox color="#C4B5FD" scale={[1.2, 0.3, 1.2]} position={[0, 2.4, 11]} />
        <PrototypeBox color="#C4B5FD" scale={[1.2, 0.3, 1.2]} position={[0, 2.9, 9]} />
        <PrototypeBox color="#C4B5FD" scale={[1.2, 0.3, 1.2]} position={[0, 3.4, 7]} />
        <PrototypeBox color="#C4B5FD" scale={[1.2, 0.3, 1.2]} position={[0, 3.9, 5]} />
        <PrototypeBox color="#C4B5FD" scale={[1.2, 0.3, 1.2]} position={[0, 4.4, 3]} />
        <PrototypeBox color="#C4B5FD" scale={[1.2, 0.3, 1.2]} position={[0, 4.85, 1.7]} />

        {/* Stairs from South platform to center */}
        <PrototypeBox color="#C4B5FD" scale={[1.2, 0.3, 1.2]} position={[0, 2.4, -11]} />
        <PrototypeBox color="#C4B5FD" scale={[1.2, 0.3, 1.2]} position={[0, 2.9, -9]} />
        <PrototypeBox color="#C4B5FD" scale={[1.2, 0.3, 1.2]} position={[0, 3.4, -7]} />
        <PrototypeBox color="#C4B5FD" scale={[1.2, 0.3, 1.2]} position={[0, 3.9, -5]} />
        <PrototypeBox color="#C4B5FD" scale={[1.2, 0.3, 1.2]} position={[0, 4.4, -3]} />
        <PrototypeBox color="#C4B5FD" scale={[1.2, 0.3, 1.2]} position={[0, 4.85, -1.7]} />
      </BvhPhysicsBody>
      {/* 3D Text UI on platform */}
      {!gameOver && (
        <>
          <Text
            position={[0, 0.5, 0]}
            fontSize={0.8}
            color="white"
            anchorX="center"
            anchorY="middle"
          >
            Score: {counter}
          </Text>

          <Text
            position={[0, 0.5, -2]}
            fontSize={0.8}
            color={healthColor}
            anchorX="center"
            anchorY="middle"
          >
            Health: {health}%
          </Text>
        </>
      )}

      {/* Game Over Screen */}
      {gameOver && (
        <group position={[camera.position.x, camera.position.y, camera.position.z - 5]}>
          <Text
            position={[0, 1, 0]}
            fontSize={1.5}
            color="#FF0000"
            anchorX="center"
            anchorY="middle"
          >
            GAME OVER
          </Text>
          <Text
            position={[0, 0, 0]}
            fontSize={0.8}
            color="white"
            anchorX="center"
            anchorY="middle"
          >
            Final Score: {counter}
          </Text>
          <Text
            position={[0, -1, 0]}
            fontSize={0.6}
            color="#AAAAAA"
            anchorX="center"
            anchorY="middle"
            onClick={handleRestart}
            onPointerOver={(e) => (document.body.style.cursor = 'pointer')}
            onPointerOut={(e) => (document.body.style.cursor = 'auto')}
          >
            Click to Restart
          </Text>
        </group>
      )}

      {/* Collectible boxes that spawn at random positions */}
      {!gameOver && boxes.map(box => (
        <BvhPhysicsSensor
          key={box.id}
          onIntersectedChanged={(intersected) => {
            if (intersected) {
              handleBoxCollision(box.id)
            }
          }}
        >
          <mesh position={box.position}>
            <sphereGeometry args={[0.5, 32, 32]} />
            <meshStandardMaterial color="#ff0000" />
          </mesh>
        </BvhPhysicsSensor>
      ))}
    </>
  )
}