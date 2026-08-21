import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  Canvas,
  useFrame,
  useThree,
} from "@react-three/fiber";

import {
  Billboard,
  Stars,
  Text,
  Sparkles,
} from "@react-three/drei";

import * as THREE from "three";


/* =========================================================
   ERROR BOUNDARY

   Without this, an uncaught error thrown while (re)creating
   the Canvas/WebGL context — e.g. during one of the recovery
   remounts triggered by visibility/focus/pageshow — propagates
   all the way up and unmounts this ENTIRE component tree.
   Since ZodiacWheel is rendered into its own separate React
   root (createRoot() called directly in main.jsx, not part of
   the main app tree), there's no boundary above it either, so
   the whole #zodiac-wheel-root section goes empty and collapses
   to 0 height — which is exactly the "entire area disappears"
   symptom, as opposed to a canvas that's merely blank.

   This boundary catches that error, logs the real cause, and
   shows a fixed-size fallback instead of vanishing — so layout
   never collapses even if a remount attempt fails. When
   `resetKey` changes (we pass canvasKey), it gives the Canvas
   another chance rather than staying stuck in the failed state.
========================================================= */

class WheelErrorBoundary extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      hasError: false,
    };
  }

  static getDerivedStateFromError() {
    return {
      hasError: true,
    };
  }

  componentDidCatch(
    error,
    info
  ) {
    console.error(
      "[wheel-debug] ZodiacWheel Canvas threw and was caught by the error boundary:",
      error,
      info?.componentStack
    );
  }

  componentDidUpdate(
    prevProps
  ) {
    if (
      this.state.hasError &&
      prevProps.resetKey !==
        this.props.resetKey
    ) {
      // A new remount attempt is coming (canvasKey
      // changed) — give it a clean slate instead of
      // staying stuck showing the fallback forever.
      this.setState({
        hasError: false,
      });
    }
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }

    return this.props.children;
  }
}

/* =========================================================
   ZODIAC
========================================================= */

const ZODIACS = [
  { name: "ARIES", symbol: "♈" },
  { name: "TAURUS", symbol: "♉" },
  { name: "GEMINI", symbol: "♊" },
  { name: "CANCER", symbol: "♋" },
  { name: "LEO", symbol: "♌" },
  { name: "VIRGO", symbol: "♍" },
  { name: "LIBRA", symbol: "♎" },
  { name: "SCORPIO", symbol: "♏" },
  { name: "SAGITTARIUS", symbol: "♐" },
  { name: "CAPRICORN", symbol: "♑" },
  { name: "AQUARIUS", symbol: "♒" },
  { name: "PISCES", symbol: "♓" },
];

/* =========================================================
   COLORS
========================================================= */

const COLORS = {
  background: "#020611",
  gold: "#D88A16",
  brightGold: "#FFBD45",
  lightGold: "#FFE5A3",
  darkGold: "#6F3600",
  hoverGold: "#FFD86A",
};

/* =========================================================
   SUN
========================================================= */

function Sun() {
  const sunRef = useRef();

  useFrame(({ clock }) => {
    if (!sunRef.current) return;

    const pulse =
      1 +
      Math.sin(clock.elapsedTime * 2) *
        0.025;

    sunRef.current.scale.setScalar(
      pulse
    );
  });

  return (
    <group>
      <mesh>
        <sphereGeometry
          args={[1.35, 48, 48]}
        />

        <meshBasicMaterial
          color="#FF9700"
          transparent
          opacity={0.08}
          depthWrite={false}
        />
      </mesh>

      <mesh>
        <sphereGeometry
          args={[1.08, 48, 48]}
        />

        <meshBasicMaterial
          color="#FFB52F"
          transparent
          opacity={0.14}
          depthWrite={false}
        />
      </mesh>

      <mesh ref={sunRef}>
        <sphereGeometry
          args={[0.82, 64, 64]}
        />

        <meshStandardMaterial
          color="#FFB52F"
          emissive="#E87800"
          emissiveIntensity={1.9}
          roughness={0.25}
          metalness={0.05}
        />
      </mesh>

      <pointLight
        color="#FFB52F"
        intensity={8}
        distance={13}
        decay={2}
      />
    </group>
  );
}

/* =========================================================
   RING
========================================================= */

function Ring({
  radius,
  tube,
  color = COLORS.gold,
  opacity = 1,
}) {
  return (
    <mesh
      rotation={[
        Math.PI / 2,
        0,
        0,
      ]}
    >
      <torusGeometry
        args={[
          radius,
          tube,
          16,
          180,
        ]}
      />

      <meshStandardMaterial
        color={color}
        emissive={COLORS.darkGold}
        emissiveIntensity={0.8}
        metalness={0.95}
        roughness={0.18}
        transparent
        opacity={opacity}
      />
    </mesh>
  );
}

/* =========================================================
   ZODIAC MEDALLION
========================================================= */

function ZodiacMedallion({
  sign,
  index,
}) {
  const group = useRef();
  const discMaterial = useRef();
  const rimMaterial = useRef();

  const [hovered, setHovered] =
    useState(false);

  const { size } = useThree();

  const isMobile =
    size.width < 768;

  const isSmallPhone =
    size.width < 430;

  const radius = 4.05;

  const angle =
    (index / ZODIACS.length) *
      Math.PI *
      2 -
    Math.PI / 2;

  const x =
    Math.cos(angle) *
    radius;

  const z =
    Math.sin(angle) *
    radius;

  const symbolSize =
    isSmallPhone
      ? 0.50
      : isMobile
      ? 0.48
      : 0.42;

  let nameSize;

  if (sign.name === "SAGITTARIUS") {
    nameSize =
      isSmallPhone
        ? 0.125
        : isMobile
        ? 0.118
        : 0.105;
  } else if (sign.name.length > 7) {
    nameSize =
      isSmallPhone
        ? 0.145
        : isMobile
        ? 0.135
        : 0.12;
  } else {
    nameSize =
      isSmallPhone
        ? 0.17
        : isMobile
        ? 0.155
        : 0.14;
  }

  const targetScale =
    hovered
      ? 1.12
      : 1;

  useFrame((_, delta) => {
    if (!group.current) {
      return;
    }

    const current =
      group.current.scale.x;

    const next =
      THREE.MathUtils.lerp(
        current,
        targetScale,
        Math.min(delta * 10, 1)
      );

    group.current.scale.setScalar(
      next
    );

    if (discMaterial.current) {
      discMaterial.current.emissiveIntensity =
        THREE.MathUtils.lerp(
          discMaterial.current
            .emissiveIntensity,
          hovered ? 1.1 : 0.35,
          Math.min(delta * 8, 1)
        );

      discMaterial.current.color.lerp(
        new THREE.Color(
          hovered
            ? "#251707"
            : "#171008"
        ),
        Math.min(delta * 8, 1)
      );
    }

    if (rimMaterial.current) {
      rimMaterial.current.emissiveIntensity =
        THREE.MathUtils.lerp(
          rimMaterial.current
            .emissiveIntensity,
          hovered ? 2.4 : 1.1,
          Math.min(delta * 8, 1)
        );
    }
  });

  const handlePointerOver = (event) => {
    event.stopPropagation();
    setHovered(true);
    document.body.style.cursor = "pointer";
  };

  const handlePointerOut = (event) => {
    event.stopPropagation();
    setHovered(false);
    document.body.style.cursor = "default";
  };

  const handleClick = (event) => {
    event.stopPropagation();

    /*
      On mobile, tapping a sign briefly
      activates the same visual effect.
    */
    setHovered(true);

    window.setTimeout(() => {
      setHovered(false);
    }, 650);
  };

  return (
    <group
      ref={group}
      position={[
        x,
        0.08,
        z,
      ]}
      onPointerOver={
        handlePointerOver
      }
      onPointerOut={
        handlePointerOut
      }
      onClick={handleClick}
    >
      {/* Soft outer glow */}
      <mesh position={[0, -0.01, -0.01]}>
        <cylinderGeometry
          args={[
            hovered
              ? 0.56
              : 0.49,
            hovered
              ? 0.56
              : 0.49,
            0.035,
            48,
          ]}
        />

        <meshBasicMaterial
          color={
            COLORS.hoverGold
          }
          transparent
          opacity={
            hovered ? 0.13 : 0
          }
          depthWrite={false}
        />
      </mesh>

      {/* Dark backing */}
      <mesh
        position={[
          0,
          -0.05,
          0,
        ]}
      >
        <cylinderGeometry
          args={[
            0.42,
            0.48,
            0.14,
            48,
          ]}
        />

        <meshStandardMaterial
          ref={discMaterial}
          color="#171008"
          metalness={0.88}
          roughness={0.22}
          emissive="#4B2400"
          emissiveIntensity={0.35}
        />
      </mesh>

      {/* Gold rim */}
      <mesh
        rotation={[
          Math.PI / 2,
          0,
          0,
        ]}
        position={[
          0,
          0.06,
          0.08,
        ]}
      >
        <torusGeometry
          args={[
            0.38,
            hovered
              ? 0.035
              : 0.025,
            12,
            64,
          ]}
        />

        <meshStandardMaterial
          ref={rimMaterial}
          color={
            hovered
              ? COLORS.hoverGold
              : COLORS.brightGold
          }
          emissive="#A95400"
          emissiveIntensity={1.1}
          metalness={1}
          roughness={0.15}
        />
      </mesh>

      {/* Symbol */}
      <Billboard
        follow
        position={[
          0,
          0.12,
          0.14,
        ]}
      >
        <Text
          fontSize={
            symbolSize
          }
          color={
            hovered
              ? COLORS.hoverGold
              : COLORS.lightGold
          }
          anchorX="center"
          anchorY="middle"
          outlineWidth={
            isMobile
              ? 0.016
              : 0.012
          }
          outlineColor="#4B2200"
          depthTest={false}
          depthWrite={false}
          renderOrder={100}
        >
          {sign.symbol}
        </Text>
      </Billboard>

      {/* Name */}
      <Billboard
        follow
        position={[
          0,
          -0.56,
          0.15,
        ]}
      >
        <Text
          fontSize={
            nameSize
          }
          color={
            hovered
              ? COLORS.hoverGold
              : COLORS.lightGold
          }
          anchorX="center"
          anchorY="middle"
          letterSpacing={
            isMobile
              ? 0.045
              : 0.035
          }
          outlineWidth={
            isMobile
              ? 0.011
              : 0.008
          }
          outlineColor="#160B00"
          depthTest={false}
          depthWrite={false}
          renderOrder={101}
        >
          {sign.name}
        </Text>
      </Billboard>
    </group>
  );
}

/* =========================================================
   ZODIAC BAND
========================================================= */

function ZodiacBand() {
  return (
    <group>
      <Ring
        radius={4.48}
        tube={0.05}
      />

      <Ring
        radius={4.28}
        tube={0.02}
        color={
          COLORS.brightGold
        }
      />

      {ZODIACS.map(
        (sign, index) => (
          <ZodiacMedallion
            key={sign.name}
            sign={sign}
            index={index}
          />
        )
      )}
    </group>
  );
}

/* =========================================================
   SPOKES
========================================================= */

function Spokes() {
  return (
    <group>
      {ZODIACS.map(
        (_, index) => {
          const angle =
            (index /
              ZODIACS.length) *
            Math.PI *
            2;

          const innerRadius =
            1.2;

          const outerRadius =
            4.0;

          const x1 =
            Math.cos(angle) *
            innerRadius;

          const z1 =
            Math.sin(angle) *
            innerRadius;

          const x2 =
            Math.cos(angle) *
            outerRadius;

          const z2 =
            Math.sin(angle) *
            outerRadius;

          const dx =
            x2 - x1;

          const dz =
            z2 - z1;

          const length =
            Math.sqrt(
              dx * dx +
                dz * dz
            );

          const midX =
            (x1 + x2) / 2;

          const midZ =
            (z1 + z2) / 2;

          return (
            <mesh
              key={index}
              position={[
                midX,
                0,
                midZ,
              ]}
              rotation={[
                0,
                -Math.atan2(
                  dz,
                  dx
                ),
                0,
              ]}
            >
              <boxGeometry
                args={[
                  length,
                  0.012,
                  0.012,
                ]}
              />

              <meshBasicMaterial
                color="#B86A08"
                transparent
                opacity={0.55}
              />
            </mesh>
          );
        }
      )}
    </group>
  );
}

/* =========================================================
   INNER PARTICLES
========================================================= */

function InnerParticles() {
  const count = 150;

  const positions =
    useMemo(() => {
      const data =
        new Float32Array(
          count * 3
        );

      for (
        let i = 0;
        i < count;
        i++
      ) {
        const angle =
          Math.random() *
          Math.PI *
          2;

        const radius =
          1.25 +
          Math.random() *
            1.1;

        data[i * 3] =
          Math.cos(angle) *
          radius;

        data[i * 3 + 1] =
          (Math.random() -
            0.5) *
          0.07;

        data[i * 3 + 2] =
          Math.sin(angle) *
          radius;
      }

      return data;
    }, []);

  const points = useRef();

  useFrame(
    ({ clock }) => {
      if (!points.current) {
        return;
      }

      points.current.rotation.y =
        clock.elapsedTime *
        0.35;
    }
  );

  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>

      <pointsMaterial
        color="#FFD56A"
        size={0.035}
        sizeAttenuation
        transparent
        opacity={0.9}
        depthWrite={false}
      />
    </points>
  );
}

/* =========================================================
   MAIN WHEEL
========================================================= */

function MainWheel() {
  const wheel = useRef();

  useFrame((_, delta) => {
    if (!wheel.current) return;

    wheel.current.rotation.y +=
      delta * 0.16;
  });

  return (
    <group
      ref={wheel}
      rotation={[
        THREE.MathUtils.degToRad(
          20
        ),
        0,
        THREE.MathUtils.degToRad(
          -8
        ),
      ]}
    >
      <Ring
        radius={4.75}
        tube={0.07}
      />

      <Ring
        radius={4.56}
        tube={0.024}
        color={
          COLORS.brightGold
        }
      />

      <Ring
        radius={4.34}
        tube={0.017}
        color="#A65B07"
      />

      <Ring
        radius={2.45}
        tube={0.032}
      />

      <Spokes />
      <ZodiacBand />
    </group>
  );
}

/* =========================================================
   THIN BANGLE RINGS
========================================================= */

function BangleRings() {
  const ring1 = useRef();
  const ring2 = useRef();
  const ring3 = useRef();

  useFrame(
    ({ clock }) => {
      const t =
        clock.elapsedTime;

      if (ring1.current) {
        ring1.current.rotation.y =
          t * 0.18;

        ring1.current.rotation.x =
          THREE.MathUtils.degToRad(
            65
          );
      }

      if (ring2.current) {
        ring2.current.rotation.z =
          -t * 0.14;

        ring2.current.rotation.x =
          THREE.MathUtils.degToRad(
            105
          );
      }

      if (ring3.current) {
        ring3.current.rotation.y =
          -t * 0.10;

        ring3.current.rotation.z =
          THREE.MathUtils.degToRad(
            -24
          );
      }
    }
  );

  return (
    <group>
      <mesh ref={ring1}>
        <torusGeometry
          args={[
            4.98,
            0.018,
            10,
            200,
          ]}
        />

        <meshStandardMaterial
          color={
            COLORS.brightGold
          }
          emissive="#9D4F00"
          emissiveIntensity={1}
          metalness={1}
          roughness={0.12}
        />
      </mesh>

      <mesh ref={ring2}>
        <torusGeometry
          args={[
            5.12,
            0.014,
            10,
            200,
          ]}
        />

        <meshStandardMaterial
          color="#F1A11C"
          emissive="#823D00"
          emissiveIntensity={0.9}
          metalness={1}
          roughness={0.15}
        />
      </mesh>

      <mesh ref={ring3}>
        <torusGeometry
          args={[
            5.26,
            0.011,
            10,
            200,
          ]}
        />

        <meshStandardMaterial
          color="#C8730C"
          emissive="#5D2C00"
          emissiveIntensity={0.8}
          metalness={1}
          roughness={0.18}
        />
      </mesh>
    </group>
  );
}

/* =========================================================
   COMET
========================================================= */

function ShootingStar() {
  const group = useRef();

  const { viewport } =
    useThree();

  const comet = useRef({
    active: false,
    x: 0,
    y: 0,
    z: -3,
    vx: 0,
    vy: 0,
    life: 0,
    duration: 1,
    angle: 0,
  });

  const nextSpawn =
    useRef(
      Math.random() * 2
    );

  const resetComet = () => {
    const side =
      Math.floor(
        Math.random() * 4
      );

    const halfW =
      viewport.width / 2;

    const halfH =
      viewport.height / 2;

    let x;
    let y;

    if (side === 0) {
      x = -halfW - 1;
      y =
        (Math.random() -
          0.5) *
        viewport.height;
    } else if (side === 1) {
      x =
        halfW + 1;
      y =
        (Math.random() -
          0.5) *
        viewport.height;
    } else if (side === 2) {
      x =
        (Math.random() -
          0.5) *
        viewport.width;
      y =
        halfH + 1;
    } else {
      x =
        (Math.random() -
          0.5) *
        viewport.width;
      y =
        -halfH - 1;
    }

    const targetX =
      (Math.random() -
        0.5) *
      viewport.width *
      0.75;

    const targetY =
      (Math.random() -
        0.5) *
      viewport.height *
      0.75;

    let dx =
      targetX - x;

    let dy =
      targetY - y;

    const distance =
      Math.sqrt(
        dx * dx +
          dy * dy
      ) || 1;

    dx /= distance;
    dy /= distance;

    const speed =
      2.8 +
      Math.random() * 2.2;

    comet.current = {
      active: true,
      x,
      y,
      z:
        -2 -
        Math.random() * 3,
      vx:
        dx * speed,
      vy:
        dy * speed,
      life: 0,
      duration:
        0.75 +
        Math.random() *
          0.65,
      angle:
        Math.atan2(
          dy,
          dx
        ),
    };

    if (group.current) {
      group.current.visible =
        true;
    }
  };

  useEffect(() => {
    const timer =
      setTimeout(
        resetComet,
        600 +
          Math.random() *
            2200
      );

    return () =>
      clearTimeout(timer);
  }, []);

  useFrame(
    (_, delta) => {
      if (!group.current) {
        return;
      }

      const c =
        comet.current;

      if (!c.active) {
        nextSpawn.current -=
          delta;

        if (
          nextSpawn.current <=
          0
        ) {
          resetComet();
        }

        return;
      }

      c.life += delta;
      c.x += c.vx * delta;
      c.y += c.vy * delta;

      group.current.position.set(
        c.x,
        c.y,
        c.z
      );

      group.current.rotation.z =
        c.angle;

      const progress =
        c.life / c.duration;

      let opacity = 1;

      if (progress < 0.1) {
        opacity =
          progress / 0.1;
      } else if (
        progress > 0.82
      ) {
        opacity =
          (1 - progress) /
          0.18;
      }

      group.current.traverse(
        (child) => {
          if (
            child.material &&
            child.material.userData
          ) {
            child.material.opacity =
              opacity *
              child.material
                .userData
                .baseOpacity;
          }
        }
      );

      if (
        c.life >=
          c.duration ||
        c.x <
          -viewport.width / 2 -
            2 ||
        c.x >
          viewport.width / 2 +
            2 ||
        c.y <
          -viewport.height / 2 -
            2 ||
        c.y >
          viewport.height / 2 +
            2
      ) {
        c.active = false;

        group.current.visible =
          false;

        nextSpawn.current =
          0.5 +
          Math.random() *
            2.5;
      }
    }
  );

  return (
    <group
      ref={group}
      visible={false}
    >
      {/* Comet head */}
      <mesh>
        <sphereGeometry
          args={[
            0.055,
            12,
            12,
          ]}
        />

        <meshBasicMaterial
          color="#FFFFFF"
          transparent
          opacity={1}
          depthWrite={false}
          userData={{
            baseOpacity: 1,
          }}
        />
      </mesh>

      {/* Glow */}
      <mesh scale={1.8}>
        <sphereGeometry
          args={[
            0.055,
            12,
            12,
          ]}
        />

        <meshBasicMaterial
          color="#CFE8FF"
          transparent
          opacity={0.22}
          depthWrite={false}
          userData={{
            baseOpacity: 0.22,
          }}
        />
      </mesh>

      {/* Main tail */}
      <mesh
        position={[
          -0.42,
          0,
          0,
        ]}
        rotation={[
          0,
          0,
          Math.PI / 2,
        ]}
      >
        <coneGeometry
          args={[
            0.045,
            0.95,
            8,
          ]}
        />

        <meshBasicMaterial
          color="#E9F5FF"
          transparent
          opacity={0.8}
          depthWrite={false}
          userData={{
            baseOpacity: 0.8,
          }}
        />
      </mesh>

      {/* Secondary tail */}
      <mesh
        position={[
          -0.70,
          0,
          -0.01,
        ]}
        rotation={[
          0,
          0,
          Math.PI / 2,
        ]}
      >
        <coneGeometry
          args={[
            0.025,
            0.8,
            8,
          ]}
        />

        <meshBasicMaterial
          color="#9FCBFF"
          transparent
          opacity={0.3}
          depthWrite={false}
          userData={{
            baseOpacity: 0.3,
          }}
        />
      </mesh>
    </group>
  );
}

/* =========================================================
   SPACE
========================================================= */

function Space() {
  return (
    <>
      <color
        attach="background"
        args={[
          COLORS.background,
        ]}
      />

      <Stars
        radius={40}
        depth={30}
        count={2600}
        factor={2}
        saturation={0}
        fade
        speed={0.15}
      />

      <Sparkles
        count={180}
        scale={[
          14,
          9,
          14,
        ]}
        size={1}
        speed={0.2}
        color="#FFD88A"
      />
    </>
  );
}

/* =========================================================
   RESPONSIVE SCENE
========================================================= */

function ResponsiveScene() {
  const {
    size,
    camera,
  } = useThree();

  const isMobile =
    size.width < 768;

  const isSmallPhone =
    size.width < 430;

  useFrame(() => {
    if (isMobile) {
      camera.position.set(
        0,
        2.25,
        isSmallPhone
          ? 9.2
          : 9.8
      );

      camera.fov =
        isSmallPhone
          ? 48
          : 46;
    } else {
      camera.position.set(
        0,
        3.0,
        11.5
      );

      camera.fov = 43;
    }

    camera.updateProjectionMatrix();
  });

  let scale = 0.66;

  if (size.width < 1100) {
    scale = 0.64;
  }

  if (isMobile) {
    scale = 0.78;
  }

  if (isSmallPhone) {
    scale = 0.74;
  }

  return (
    <>
      <Space />

      <ambientLight
        intensity={0.3}
      />

      <directionalLight
        position={[
          4,
          6,
          8,
        ]}
        intensity={2}
        color="#FFD27A"
      />

      <pointLight
        position={[
          0,
          0,
          2,
        ]}
        intensity={4}
        distance={15}
        color="#FFAE32"
      />

      <group
        scale={scale}
        position={[
          0,
          -0.05,
          0,
        ]}
      >
        <Sun />
        <InnerParticles />
        <MainWheel />
        <BangleRings />
      </group>

      <ShootingStar />
      <ShootingStar />
      <ShootingStar />
    </>
  );
}

/* =========================================================
   MAIN COMPONENT
========================================================= */

export default function ZodiacWheel() {
  const [
    width,
    setWidth,
  ] = useState(
    typeof window !==
      "undefined"
      ? window.innerWidth
      : 1200
  );

  useEffect(() => {
    const handleResize =
      () => {
        setWidth(
          window.innerWidth
        );
      };

    window.addEventListener(
      "resize",
      handleResize
    );

    return () =>
      window.removeEventListener(
        "resize",
        handleResize
      );
  }, []);


  /* =======================================================
     WEBGL CONTEXT RECOVERY

     Earlier attempts tried to be "smart" about this — guess
     from browser events when the context had died, or check
     gl.isContextLost() before deciding to remount. Neither
     fully worked: some navigation paths (e.g. switching away
     to another site/tab and back) leave the canvas blank with
     no console errors and isContextLost() still reporting
     false — the WebGL context is technically fine, it's the
     render loop or the compositor's paint of the canvas that
     never resumes after the page was hidden/frozen.

     Since there is no reliable signal to gate on, this version
     stops trying to detect "is it actually broken" and just
     unconditionally remounts <Canvas> — cheap for a widget
     this size — on every plausible "we might be back" signal:

       - visibilitychange → visible
       - window focus
       - pageshow (any pageshow, not only bfcache-persisted
         ones — some browsers don't reliably set `persisted`)

     A short cooldown prevents remounting twice for the same
     "return" event when multiple of these fire together
     (e.g. visibilitychange and focus firing back to back).
  ======================================================= */

  const [
    canvasKey,
    setCanvasKey,
  ] = useState(0);

  useEffect(() => {
    let lastRemountAt = 0;

    function forceRemount() {

      const now =
        Date.now();

      if (
        now - lastRemountAt <
        400
      ) {
        return;
      }

      lastRemountAt = now;

      setCanvasKey(
        (key) => key + 1
      );
    }

    function handleVisibilityChange() {
      if (
        document.visibilityState ===
        "visible"
      ) {
        forceRemount();
      }
    }

    document.addEventListener(
      "visibilitychange",
      handleVisibilityChange
    );

    window.addEventListener(
      "focus",
      forceRemount
    );

    window.addEventListener(
      "pageshow",
      forceRemount
    );

    return () => {

      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange
      );

      window.removeEventListener(
        "focus",
        forceRemount
      );

      window.removeEventListener(
        "pageshow",
        forceRemount
      );
    };
  }, []);

  const isMobile =
    width < 768;

  const height = isMobile
    ? Math.max(
        300,
        Math.min(
          360,
          width * 0.78
        )
      )
    : 700;

  return (
    <div
      style={{
        width: "100%",
        height: `${height}px`,
        minHeight: `${height}px`,
        position: "relative",
        overflow: "hidden",
        display: "block",
        background:
          "radial-gradient(circle at center, #091321 0%, #020611 62%, #000208 100%)",
      }}
    >
      <WheelErrorBoundary
        resetKey={canvasKey}
        fallback={
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems:
                "center",
              justifyContent:
                "center",
              color: "#888",
              fontSize: "13px",
            }}
          >
            Unable to load the
            zodiac wheel.
          </div>
        }
      >
        <Canvas
          key={canvasKey}
          camera={{
            position: [
              0,
              isMobile
                ? 2.25
                : 3.0,
              isMobile
                ? 9.8
                : 11.5,
            ],
            fov:
              isMobile
                ? 46
                : 43,
            near: 0.1,
            far: 100,
          }}
          dpr={[1, 2]}
          gl={{
            antialias: true,
            alpha: false,
            powerPreference:
              "high-performance",
          }}
          onCreated={({
            gl,
          }) => {

            /*
             * Secondary safety net: if the context is
             * lost while the tab is still visible (e.g.
             * the GPU process reclaims it under memory
             * pressure from other tabs), calling
             * preventDefault() here tells the browser we
             * want it to try restoring the context
             * automatically. The unconditional remount
             * above (triggered on visibility/focus/
             * pageshow) is what actually rebuilds the
             * canvas for the far more common case where
             * the context isn't technically "lost" but
             * simply isn't painting anymore.
             */
            gl.domElement.addEventListener(
              "webglcontextlost",
              (event) => {
                event.preventDefault();
              },
              false
            );
          }}
        >
          <ResponsiveScene />
        </Canvas>
      </WheelErrorBoundary>
    </div>
  );
}