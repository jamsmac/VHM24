'use client'

import React, { useRef, useEffect, useMemo } from 'react'
import * as THREE from 'three'

interface LiquidEtherProps {
  colors?: string[]
  mouseForce?: number
  cursorSize?: number
  resolution?: number
  viscous?: number
  iterationsPoisson?: number
  iterationsViscous?: number
  autoDemo?: boolean
  autoSpeed?: number
  autoIntensity?: number
  className?: string
  style?: React.CSSProperties
}

const SHADERS = {
  vertex: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = vec4(position, 1.0);
    }
  `,

  mouse: `
    uniform vec2 uMouse;
    uniform vec2 uMouseDelta;
    uniform float uSize;
    uniform float uForce;
    varying vec2 vUv;

    void main() {
      vec2 diff = vUv - uMouse;
      float dist = length(diff);
      float strength = exp(-dist * dist * uSize) * uForce;
      vec2 velocity = normalize(uMouseDelta + 0.001) * strength;
      gl_FragColor = vec4(velocity, 0.0, 1.0);
    }
  `,

  advect: `
    uniform sampler2D uVelocity;
    uniform sampler2D uSource;
    uniform float uDt;
    uniform float uDissipation;
    varying vec2 vUv;

    void main() {
      vec2 velocity = texture2D(uVelocity, vUv).xy;
      vec2 coord = vUv - velocity * uDt;
      gl_FragColor = texture2D(uSource, coord) * uDissipation;
    }
  `,

  divergence: `
    uniform sampler2D uVelocity;
    uniform vec2 uTexelSize;
    varying vec2 vUv;

    void main() {
      float L = texture2D(uVelocity, vUv - vec2(uTexelSize.x, 0.0)).x;
      float R = texture2D(uVelocity, vUv + vec2(uTexelSize.x, 0.0)).x;
      float T = texture2D(uVelocity, vUv + vec2(0.0, uTexelSize.y)).y;
      float B = texture2D(uVelocity, vUv - vec2(0.0, uTexelSize.y)).y;
      float div = 0.5 * (R - L + T - B);
      gl_FragColor = vec4(div, 0.0, 0.0, 1.0);
    }
  `,

  pressure: `
    uniform sampler2D uPressure;
    uniform sampler2D uDivergence;
    uniform vec2 uTexelSize;
    varying vec2 vUv;

    void main() {
      float L = texture2D(uPressure, vUv - vec2(uTexelSize.x, 0.0)).x;
      float R = texture2D(uPressure, vUv + vec2(uTexelSize.x, 0.0)).x;
      float T = texture2D(uPressure, vUv + vec2(0.0, uTexelSize.y)).x;
      float B = texture2D(uPressure, vUv - vec2(0.0, uTexelSize.y)).x;
      float C = texture2D(uDivergence, vUv).x;
      float pressure = (L + R + B + T - C) * 0.25;
      gl_FragColor = vec4(pressure, 0.0, 0.0, 1.0);
    }
  `,

  gradientSubtract: `
    uniform sampler2D uPressure;
    uniform sampler2D uVelocity;
    uniform vec2 uTexelSize;
    varying vec2 vUv;

    void main() {
      float L = texture2D(uPressure, vUv - vec2(uTexelSize.x, 0.0)).x;
      float R = texture2D(uPressure, vUv + vec2(uTexelSize.x, 0.0)).x;
      float T = texture2D(uPressure, vUv + vec2(0.0, uTexelSize.y)).x;
      float B = texture2D(uPressure, vUv - vec2(0.0, uTexelSize.y)).x;
      vec2 velocity = texture2D(uVelocity, vUv).xy;
      velocity.xy -= vec2(R - L, T - B);
      gl_FragColor = vec4(velocity, 0.0, 1.0);
    }
  `,

  viscous: `
    uniform sampler2D uVelocity;
    uniform vec2 uTexelSize;
    uniform float uViscous;
    varying vec2 vUv;

    void main() {
      vec2 L = texture2D(uVelocity, vUv - vec2(uTexelSize.x, 0.0)).xy;
      vec2 R = texture2D(uVelocity, vUv + vec2(uTexelSize.x, 0.0)).xy;
      vec2 T = texture2D(uVelocity, vUv + vec2(0.0, uTexelSize.y)).xy;
      vec2 B = texture2D(uVelocity, vUv - vec2(0.0, uTexelSize.y)).xy;
      vec2 C = texture2D(uVelocity, vUv).xy;
      vec2 velocity = (L + R + T + B + uViscous * C) / (4.0 + uViscous);
      gl_FragColor = vec4(velocity, 0.0, 1.0);
    }
  `,

  display: `
    uniform sampler2D uVelocity;
    uniform vec3 uColor1;
    uniform vec3 uColor2;
    uniform vec3 uColor3;
    varying vec2 vUv;

    void main() {
      vec2 velocity = texture2D(uVelocity, vUv).xy;
      float speed = length(velocity) * 2.0;

      vec3 color;
      if (speed < 0.5) {
        color = mix(uColor1, uColor2, speed * 2.0);
      } else {
        color = mix(uColor2, uColor3, (speed - 0.5) * 2.0);
      }

      float glow = speed * 0.5;
      color += glow * 0.2;

      gl_FragColor = vec4(color, 1.0);
    }
  `
}

function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result
    ? [
        parseInt(result[1], 16) / 255,
        parseInt(result[2], 16) / 255,
        parseInt(result[3], 16) / 255
      ]
    : [0, 0, 0]
}

function createRenderTarget(width: number, height: number): THREE.WebGLRenderTarget {
  return new THREE.WebGLRenderTarget(width, height, {
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    format: THREE.RGBAFormat,
    type: THREE.FloatType
  })
}

export default function LiquidEther({
  colors = ['#3B82F6', '#8B5CF6', '#06B6D4'],
  mouseForce = 20,
  cursorSize = 100,
  resolution = 0.5,
  viscous = 30,
  iterationsPoisson = 32,
  iterationsViscous = 32,
  autoDemo = true,
  autoSpeed = 0.3,
  autoIntensity = 1.5,
  className = '',
  style = {}
}: LiquidEtherProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const animationRef = useRef<number>(0)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const mouseRef = useRef({ x: 0.5, y: 0.5, prevX: 0.5, prevY: 0.5 })
  const lastInteractionRef = useRef(0)

  const colorVectors = useMemo(() => ({
    color1: new THREE.Vector3(...hexToRgb(colors[0] || '#3B82F6')),
    color2: new THREE.Vector3(...hexToRgb(colors[1] || '#8B5CF6')),
    color3: new THREE.Vector3(...hexToRgb(colors[2] || '#06B6D4'))
  }), [colors])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const width = container.clientWidth
    const height = container.clientHeight

    if (width === 0 || height === 0) return

    const simWidth = Math.floor(width * resolution)
    const simHeight = Math.floor(height * resolution)

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: false,
      powerPreference: 'high-performance'
    })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    container.appendChild(renderer.domElement)
    rendererRef.current = renderer

    const scene = new THREE.Scene()
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
    const geometry = new THREE.PlaneGeometry(2, 2)

    let velocity0 = createRenderTarget(simWidth, simHeight)
    let velocity1 = createRenderTarget(simWidth, simHeight)
    let pressure0 = createRenderTarget(simWidth, simHeight)
    let pressure1 = createRenderTarget(simWidth, simHeight)
    const divergenceTarget = createRenderTarget(simWidth, simHeight)

    const texelSize = new THREE.Vector2(1 / simWidth, 1 / simHeight)

    const mouseMaterial = new THREE.ShaderMaterial({
      vertexShader: SHADERS.vertex,
      fragmentShader: SHADERS.mouse,
      uniforms: {
        uMouse: { value: new THREE.Vector2(0.5, 0.5) },
        uMouseDelta: { value: new THREE.Vector2(0, 0) },
        uSize: { value: cursorSize },
        uForce: { value: mouseForce }
      }
    })

    const advectMaterial = new THREE.ShaderMaterial({
      vertexShader: SHADERS.vertex,
      fragmentShader: SHADERS.advect,
      uniforms: {
        uVelocity: { value: null },
        uSource: { value: null },
        uDt: { value: 0.016 },
        uDissipation: { value: 0.98 }
      }
    })

    const divergenceMaterial = new THREE.ShaderMaterial({
      vertexShader: SHADERS.vertex,
      fragmentShader: SHADERS.divergence,
      uniforms: {
        uVelocity: { value: null },
        uTexelSize: { value: texelSize }
      }
    })

    const pressureMaterial = new THREE.ShaderMaterial({
      vertexShader: SHADERS.vertex,
      fragmentShader: SHADERS.pressure,
      uniforms: {
        uPressure: { value: null },
        uDivergence: { value: null },
        uTexelSize: { value: texelSize }
      }
    })

    const gradientMaterial = new THREE.ShaderMaterial({
      vertexShader: SHADERS.vertex,
      fragmentShader: SHADERS.gradientSubtract,
      uniforms: {
        uPressure: { value: null },
        uVelocity: { value: null },
        uTexelSize: { value: texelSize }
      }
    })

    const viscousMaterial = new THREE.ShaderMaterial({
      vertexShader: SHADERS.vertex,
      fragmentShader: SHADERS.viscous,
      uniforms: {
        uVelocity: { value: null },
        uTexelSize: { value: texelSize },
        uViscous: { value: viscous }
      }
    })

    const displayMaterial = new THREE.ShaderMaterial({
      vertexShader: SHADERS.vertex,
      fragmentShader: SHADERS.display,
      uniforms: {
        uVelocity: { value: null },
        uColor1: { value: colorVectors.color1 },
        uColor2: { value: colorVectors.color2 },
        uColor3: { value: colorVectors.color3 }
      }
    })

    const mesh = new THREE.Mesh(geometry, displayMaterial)
    scene.add(mesh)

    const renderPass = (material: THREE.ShaderMaterial, target: THREE.WebGLRenderTarget | null) => {
      mesh.material = material
      renderer.setRenderTarget(target)
      renderer.render(scene, camera)
    }

    let time = 0
    const animate = () => {
      animationRef.current = requestAnimationFrame(animate)
      time += 0.016

      const mouse = mouseRef.current
      const now = Date.now()
      const timeSinceInteraction = now - lastInteractionRef.current

      if (autoDemo && timeSinceInteraction > 2000) {
        const autoX = 0.5 + Math.sin(time * autoSpeed) * 0.3
        const autoY = 0.5 + Math.cos(time * autoSpeed * 1.3) * 0.3
        mouse.x += (autoX - mouse.x) * 0.02
        mouse.y += (autoY - mouse.y) * 0.02
      }

      const deltaX = mouse.x - mouse.prevX
      const deltaY = mouse.y - mouse.prevY
      mouse.prevX = mouse.x
      mouse.prevY = mouse.y

      const force = autoDemo && timeSinceInteraction > 2000 ? autoIntensity : 1
      mouseMaterial.uniforms.uMouse.value.set(mouse.x, mouse.y)
      mouseMaterial.uniforms.uMouseDelta.value.set(deltaX * force, deltaY * force)
      renderPass(mouseMaterial, velocity0)

      advectMaterial.uniforms.uVelocity.value = velocity0.texture
      advectMaterial.uniforms.uSource.value = velocity0.texture
      renderPass(advectMaterial, velocity1)
      ;[velocity0, velocity1] = [velocity1, velocity0]

      for (let i = 0; i < iterationsViscous; i++) {
        viscousMaterial.uniforms.uVelocity.value = velocity0.texture
        renderPass(viscousMaterial, velocity1)
        ;[velocity0, velocity1] = [velocity1, velocity0]
      }

      divergenceMaterial.uniforms.uVelocity.value = velocity0.texture
      renderPass(divergenceMaterial, divergenceTarget)

      for (let i = 0; i < iterationsPoisson; i++) {
        pressureMaterial.uniforms.uPressure.value = pressure0.texture
        pressureMaterial.uniforms.uDivergence.value = divergenceTarget.texture
        renderPass(pressureMaterial, pressure1)
        ;[pressure0, pressure1] = [pressure1, pressure0]
      }

      gradientMaterial.uniforms.uPressure.value = pressure0.texture
      gradientMaterial.uniforms.uVelocity.value = velocity0.texture
      renderPass(gradientMaterial, velocity1)
      ;[velocity0, velocity1] = [velocity1, velocity0]

      displayMaterial.uniforms.uVelocity.value = velocity0.texture
      displayMaterial.uniforms.uColor1.value = colorVectors.color1
      displayMaterial.uniforms.uColor2.value = colorVectors.color2
      displayMaterial.uniforms.uColor3.value = colorVectors.color3
      renderPass(displayMaterial, null)
    }

    animate()

    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect()
      mouseRef.current.x = (e.clientX - rect.left) / rect.width
      mouseRef.current.y = 1 - (e.clientY - rect.top) / rect.height
      lastInteractionRef.current = Date.now()
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        const touch = e.touches[0]
        const rect = container.getBoundingClientRect()
        mouseRef.current.x = (touch.clientX - rect.left) / rect.width
        mouseRef.current.y = 1 - (touch.clientY - rect.top) / rect.height
        lastInteractionRef.current = Date.now()
      }
    }

    const handleResize = () => {
      const newWidth = container.clientWidth
      const newHeight = container.clientHeight
      if (newWidth > 0 && newHeight > 0) {
        renderer.setSize(newWidth, newHeight)
      }
    }

    container.addEventListener('mousemove', handleMouseMove)
    container.addEventListener('touchmove', handleTouchMove, { passive: true })
    window.addEventListener('resize', handleResize)

    return () => {
      cancelAnimationFrame(animationRef.current)
      container.removeEventListener('mousemove', handleMouseMove)
      container.removeEventListener('touchmove', handleTouchMove)
      window.removeEventListener('resize', handleResize)

      renderer.dispose()
      geometry.dispose()
      velocity0.dispose()
      velocity1.dispose()
      pressure0.dispose()
      pressure1.dispose()
      divergenceTarget.dispose()

      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement)
      }
    }
  }, [colorVectors, mouseForce, cursorSize, resolution, viscous, iterationsPoisson, iterationsViscous, autoDemo, autoSpeed, autoIntensity])

  return (
    <div
      ref={containerRef}
      className={`liquid-ether-container ${className}`}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        ...style
      }}
    />
  )
}
