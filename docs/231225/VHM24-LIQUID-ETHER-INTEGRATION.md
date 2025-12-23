# 🌊 LIQUID ETHER INTEGRATION - VHM24 VendHub Manager

**Премиум fluid animation background для VendHub Office**

**Версия:** 1.0  
**Совместимость:** Next.js 16.1, React 19, TypeScript  
**Дата:** 23 декабря 2025

---

## 📋 СОДЕРЖАНИЕ

1. [Обзор интеграции](#1-обзор-интеграции)
2. [Установка компонента](#2-установка-компонента)
3. [Страница входа (Login)](#3-страница-входа)
4. [Dashboard фон](#4-dashboard-фон)
5. [Публичная страница](#5-публичная-страница)
6. [Glass-morphism компоненты](#6-glass-morphism-компоненты)
7. [Оптимизация производительности](#7-оптимизация)
8. [Пресеты и темы](#8-пресеты-и-темы)

---

## 1. ОБЗОР ИНТЕГРАЦИИ

### Что добавляем

**LiquidEther** - интерактивный WebGL fluid simulation:
- Реагирует на движение мыши
- Плавные переливающиеся цвета
- Auto-demo режим (когда нет взаимодействия)
- Оптимизированная производительность
- Поддержка Dark/Light mode

### Где используем в VHM24

| Страница | Интенсивность | Назначение |
|----------|---------------|------------|
| Login/Register | 60% opacity | Впечатляющий первый контакт |
| Dashboard | 15-20% opacity | Subtle премиум-эффект |
| Public Landing | 40% opacity | Маркетинговый вау-эффект |
| Setup Wizard | 30% opacity | Приятный onboarding |

### Цветовая схема VendHub

```typescript
// Основная палитра VendHub
const VENDHUB_COLORS = {
  primary: ['#3B82F6', '#2563EB', '#1D4ED8'],     // Blue (основной)
  accent: ['#8B5CF6', '#7C3AED', '#6D28D9'],       // Purple (акцент)
  success: ['#10B981', '#059669', '#047857'],     // Green (успех)
  warning: ['#F59E0B', '#D97706', '#B45309'],     // Amber (предупреждение)
  
  // Для fluid эффекта
  fluidPrimary: ['#3B82F6', '#8B5CF6', '#06B6D4'], // Blue → Purple → Cyan
  fluidDark: ['#1E293B', '#334155', '#475569'],    // Dark grays
  fluidSuccess: ['#10B981', '#3B82F6', '#8B5CF6'], // Green → Blue → Purple
};
```

---

## 2. УСТАНОВКА КОМПОНЕНТА

### TASK V.1: Создание компонента (15 мин)

**Путь:** `frontend/src/components/effects/LiquidEther.tsx`

```bash
# В Claude Code:
cd frontend
npm install three@0.160.0
mkdir -p src/components/effects
```

**Prompt для Claude Code:**

```
Create WebGL fluid simulation component for VHM24:

File: frontend/src/components/effects/LiquidEther.tsx

```typescript
'use client';

import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import * as THREE from 'three';

// ============================================
// ТИПЫ
// ============================================

interface LiquidEtherProps {
  colors?: string[];
  mouseForce?: number;
  cursorSize?: number;
  resolution?: number;
  viscous?: number;
  iterationsPoisson?: number;
  iterationsViscous?: number;
  autoDemo?: boolean;
  autoSpeed?: number;
  autoIntensity?: number;
  className?: string;
  style?: React.CSSProperties;
}

// ============================================
// ШЕЙДЕРЫ
// ============================================

const SHADERS = {
  // Vertex shader (общий для всех)
  vertex: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = vec4(position, 1.0);
    }
  `,

  // Fragment shaders
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
      
      // Gradient между тремя цветами
      vec3 color;
      if (speed < 0.5) {
        color = mix(uColor1, uColor2, speed * 2.0);
      } else {
        color = mix(uColor2, uColor3, (speed - 0.5) * 2.0);
      }
      
      // Добавляем свечение
      float glow = speed * 0.5;
      color += glow * 0.2;
      
      gl_FragColor = vec4(color, 1.0);
    }
  `
};

// ============================================
// УТИЛИТЫ
// ============================================

function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? [
        parseInt(result[1], 16) / 255,
        parseInt(result[2], 16) / 255,
        parseInt(result[3], 16) / 255
      ]
    : [0, 0, 0];
}

function createRenderTarget(width: number, height: number): THREE.WebGLRenderTarget {
  return new THREE.WebGLRenderTarget(width, height, {
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    format: THREE.RGBAFormat,
    type: THREE.FloatType
  });
}

// ============================================
// ГЛАВНЫЙ КОМПОНЕНТ
// ============================================

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
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number>(0);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const mouseRef = useRef({ x: 0.5, y: 0.5, prevX: 0.5, prevY: 0.5 });
  const isInteractingRef = useRef(false);
  const lastInteractionRef = useRef(0);

  // Memoized colors
  const colorVectors = useMemo(() => ({
    color1: new THREE.Vector3(...hexToRgb(colors[0] || '#3B82F6')),
    color2: new THREE.Vector3(...hexToRgb(colors[1] || '#8B5CF6')),
    color3: new THREE.Vector3(...hexToRgb(colors[2] || '#06B6D4'))
  }), [colors]);

  // Initialize WebGL
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Setup
    const width = container.clientWidth;
    const height = container.clientHeight;
    const simWidth = Math.floor(width * resolution);
    const simHeight = Math.floor(height * resolution);

    // Renderer
    const renderer = new THREE.WebGLRenderer({ 
      alpha: true,
      antialias: false,
      powerPreference: 'high-performance'
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Scene & Camera
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    // Geometry
    const geometry = new THREE.PlaneGeometry(2, 2);

    // Render Targets
    let velocity0 = createRenderTarget(simWidth, simHeight);
    let velocity1 = createRenderTarget(simWidth, simHeight);
    let pressure0 = createRenderTarget(simWidth, simHeight);
    let pressure1 = createRenderTarget(simWidth, simHeight);
    const divergenceTarget = createRenderTarget(simWidth, simHeight);

    // Materials
    const texelSize = new THREE.Vector2(1 / simWidth, 1 / simHeight);

    const mouseMaterial = new THREE.ShaderMaterial({
      vertexShader: SHADERS.vertex,
      fragmentShader: SHADERS.mouse,
      uniforms: {
        uMouse: { value: new THREE.Vector2(0.5, 0.5) },
        uMouseDelta: { value: new THREE.Vector2(0, 0) },
        uSize: { value: cursorSize },
        uForce: { value: mouseForce }
      }
    });

    const advectMaterial = new THREE.ShaderMaterial({
      vertexShader: SHADERS.vertex,
      fragmentShader: SHADERS.advect,
      uniforms: {
        uVelocity: { value: null },
        uSource: { value: null },
        uDt: { value: 0.016 },
        uDissipation: { value: 0.98 }
      }
    });

    const divergenceMaterial = new THREE.ShaderMaterial({
      vertexShader: SHADERS.vertex,
      fragmentShader: SHADERS.divergence,
      uniforms: {
        uVelocity: { value: null },
        uTexelSize: { value: texelSize }
      }
    });

    const pressureMaterial = new THREE.ShaderMaterial({
      vertexShader: SHADERS.vertex,
      fragmentShader: SHADERS.pressure,
      uniforms: {
        uPressure: { value: null },
        uDivergence: { value: null },
        uTexelSize: { value: texelSize }
      }
    });

    const gradientMaterial = new THREE.ShaderMaterial({
      vertexShader: SHADERS.vertex,
      fragmentShader: SHADERS.gradientSubtract,
      uniforms: {
        uPressure: { value: null },
        uVelocity: { value: null },
        uTexelSize: { value: texelSize }
      }
    });

    const viscousMaterial = new THREE.ShaderMaterial({
      vertexShader: SHADERS.vertex,
      fragmentShader: SHADERS.viscous,
      uniforms: {
        uVelocity: { value: null },
        uTexelSize: { value: texelSize },
        uViscous: { value: viscous }
      }
    });

    const displayMaterial = new THREE.ShaderMaterial({
      vertexShader: SHADERS.vertex,
      fragmentShader: SHADERS.display,
      uniforms: {
        uVelocity: { value: null },
        uColor1: { value: colorVectors.color1 },
        uColor2: { value: colorVectors.color2 },
        uColor3: { value: colorVectors.color3 }
      }
    });

    const mesh = new THREE.Mesh(geometry, displayMaterial);
    scene.add(mesh);

    // Render pass helper
    const renderPass = (material: THREE.ShaderMaterial, target: THREE.WebGLRenderTarget | null) => {
      mesh.material = material;
      renderer.setRenderTarget(target);
      renderer.render(scene, camera);
    };

    // Animation loop
    let time = 0;
    const animate = () => {
      animationRef.current = requestAnimationFrame(animate);
      time += 0.016;

      const mouse = mouseRef.current;
      const now = Date.now();
      const timeSinceInteraction = now - lastInteractionRef.current;

      // Auto-demo mode
      if (autoDemo && timeSinceInteraction > 2000) {
        const autoX = 0.5 + Math.sin(time * autoSpeed) * 0.3;
        const autoY = 0.5 + Math.cos(time * autoSpeed * 1.3) * 0.3;
        mouse.x += (autoX - mouse.x) * 0.02;
        mouse.y += (autoY - mouse.y) * 0.02;
      }

      // Calculate delta
      const deltaX = mouse.x - mouse.prevX;
      const deltaY = mouse.y - mouse.prevY;
      mouse.prevX = mouse.x;
      mouse.prevY = mouse.y;

      // Apply mouse force
      const force = autoDemo && timeSinceInteraction > 2000 ? autoIntensity : 1;
      mouseMaterial.uniforms.uMouse.value.set(mouse.x, mouse.y);
      mouseMaterial.uniforms.uMouseDelta.value.set(deltaX * force, deltaY * force);
      renderPass(mouseMaterial, velocity0);

      // Advect velocity
      advectMaterial.uniforms.uVelocity.value = velocity0.texture;
      advectMaterial.uniforms.uSource.value = velocity0.texture;
      renderPass(advectMaterial, velocity1);
      [velocity0, velocity1] = [velocity1, velocity0];

      // Viscous diffusion
      for (let i = 0; i < iterationsViscous; i++) {
        viscousMaterial.uniforms.uVelocity.value = velocity0.texture;
        renderPass(viscousMaterial, velocity1);
        [velocity0, velocity1] = [velocity1, velocity0];
      }

      // Compute divergence
      divergenceMaterial.uniforms.uVelocity.value = velocity0.texture;
      renderPass(divergenceMaterial, divergenceTarget);

      // Pressure solve
      for (let i = 0; i < iterationsPoisson; i++) {
        pressureMaterial.uniforms.uPressure.value = pressure0.texture;
        pressureMaterial.uniforms.uDivergence.value = divergenceTarget.texture;
        renderPass(pressureMaterial, pressure1);
        [pressure0, pressure1] = [pressure1, pressure0];
      }

      // Subtract gradient
      gradientMaterial.uniforms.uPressure.value = pressure0.texture;
      gradientMaterial.uniforms.uVelocity.value = velocity0.texture;
      renderPass(gradientMaterial, velocity1);
      [velocity0, velocity1] = [velocity1, velocity0];

      // Display
      displayMaterial.uniforms.uVelocity.value = velocity0.texture;
      displayMaterial.uniforms.uColor1.value = colorVectors.color1;
      displayMaterial.uniforms.uColor2.value = colorVectors.color2;
      displayMaterial.uniforms.uColor3.value = colorVectors.color3;
      renderPass(displayMaterial, null);
    };

    animate();

    // Event handlers
    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      mouseRef.current.x = (e.clientX - rect.left) / rect.width;
      mouseRef.current.y = 1 - (e.clientY - rect.top) / rect.height;
      lastInteractionRef.current = Date.now();
      isInteractingRef.current = true;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        const touch = e.touches[0];
        const rect = container.getBoundingClientRect();
        mouseRef.current.x = (touch.clientX - rect.left) / rect.width;
        mouseRef.current.y = 1 - (touch.clientY - rect.top) / rect.height;
        lastInteractionRef.current = Date.now();
        isInteractingRef.current = true;
      }
    };

    const handleResize = () => {
      const newWidth = container.clientWidth;
      const newHeight = container.clientHeight;
      renderer.setSize(newWidth, newHeight);
    };

    container.addEventListener('mousemove', handleMouseMove);
    container.addEventListener('touchmove', handleTouchMove);
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      cancelAnimationFrame(animationRef.current);
      container.removeEventListener('mousemove', handleMouseMove);
      container.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('resize', handleResize);
      
      renderer.dispose();
      geometry.dispose();
      velocity0.dispose();
      velocity1.dispose();
      pressure0.dispose();
      pressure1.dispose();
      divergenceTarget.dispose();
      
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [colorVectors, mouseForce, cursorSize, resolution, viscous, iterationsPoisson, iterationsViscous, autoDemo, autoSpeed, autoIntensity]);

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
  );
}
```

Also create: frontend/src/components/effects/index.ts
```typescript
export { default as LiquidEther } from './LiquidEther';
```

Verify component compiles without TypeScript errors.
```

---

## 3. СТРАНИЦА ВХОДА

### TASK V.2: Login Page с LiquidEther (30 мин)

**Путь:** `frontend/src/app/(auth)/login/page.tsx`

**Prompt для Claude Code:**

```
Update VHM24 login page with LiquidEther background and glass-morphism design:

File: frontend/src/app/(auth)/login/page.tsx

```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff, Coffee, Loader2 } from 'lucide-react';
import { LiquidEther } from '@/components/effects';

export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    remember: false
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    // Auth logic here
    setTimeout(() => {
      router.push('/dashboard');
    }, 1500);
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Left Side - Fluid Animation */}
      <div className="hidden lg:block relative bg-slate-950 overflow-hidden">
        <LiquidEther
          colors={['#3B82F6', '#8B5CF6', '#06B6D4']}
          mouseForce={30}
          cursorSize={150}
          resolution={0.6}
          autoDemo={true}
          autoSpeed={0.4}
          autoIntensity={2.0}
          className="opacity-60"
        />
        
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950/40 via-transparent to-slate-950/60 z-10" />
        
        {/* Overlay Content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center p-12 z-20">
          <div className="max-w-md text-center">
            {/* Logo */}
            <div className="flex items-center justify-center gap-3 mb-8">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
                <Coffee className="w-8 h-8 text-white" />
              </div>
              <span className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                VendHub
              </span>
            </div>
            
            <h2 className="text-4xl font-bold text-white mb-4">
              Добро пожаловать!
            </h2>
            <p className="text-xl text-slate-300 mb-12">
              Управляйте сетью вендинговых автоматов из одного места
            </p>
            
            {/* Features List */}
            <div className="space-y-4 text-left">
              <div className="flex items-center gap-4 p-4 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10">
                <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-blue-400">📊</span>
                </div>
                <div>
                  <div className="text-white font-medium">Real-time мониторинг</div>
                  <div className="text-slate-400 text-sm">31+ автоматов под контролем</div>
                </div>
              </div>
              
              <div className="flex items-center gap-4 p-4 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10">
                <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-purple-400">💰</span>
                </div>
                <div>
                  <div className="text-white font-medium">Финансовая аналитика</div>
                  <div className="text-slate-400 text-sm">Выручка, расходы, прибыль</div>
                </div>
              </div>
              
              <div className="flex items-center gap-4 p-4 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10">
                <div className="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-cyan-400">🔔</span>
                </div>
                <div>
                  <div className="text-white font-medium">Умные уведомления</div>
                  <div className="text-slate-400 text-sm">Telegram + Email + Push</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="flex items-center justify-center p-6 sm:p-8 bg-slate-950">
        {/* Mobile Logo */}
        <div className="absolute top-6 left-6 lg:hidden">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <Coffee className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-white">VendHub</span>
          </div>
        </div>

        <div className="w-full max-w-md">
          {/* Form Card */}
          <div className="bg-slate-900/50 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">
            <h2 className="text-2xl font-bold text-white mb-2">Вход в систему</h2>
            <p className="text-slate-400 mb-8">Введите данные для входа в аккаунт</p>
            
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-slate-800/50 border border-white/10 text-white placeholder-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition"
                  placeholder="admin@vendhub.uz"
                  required
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Пароль
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-slate-800/50 border border-white/10 text-white placeholder-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition pr-12"
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Remember & Forgot */}
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.remember}
                    onChange={(e) => setFormData({ ...formData, remember: e.target.checked })}
                    className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-blue-500 focus:ring-blue-500"
                  />
                  Запомнить меня
                </label>
                <Link 
                  href="/forgot-password" 
                  className="text-sm text-blue-400 hover:text-blue-300 transition"
                >
                  Забыли пароль?
                </Link>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-500 via-purple-500 to-blue-600 text-white font-semibold hover:from-blue-600 hover:via-purple-600 hover:to-blue-700 transition-all hover:shadow-lg hover:shadow-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Входим...
                  </>
                ) : (
                  'Войти'
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="my-6 flex items-center gap-4">
              <div className="flex-1 h-px bg-white/10" />
              <span className="text-sm text-slate-500">или</span>
              <div className="flex-1 h-px bg-white/10" />
            </div>

            {/* Demo Access */}
            <button
              onClick={() => {
                setFormData({ email: 'demo@vendhub.uz', password: 'demo123', remember: false });
              }}
              className="w-full py-3 rounded-xl bg-slate-800/50 border border-white/10 text-white hover:bg-slate-800 transition flex items-center justify-center gap-2"
            >
              <span className="text-lg">🎮</span>
              Демо доступ
            </button>

            {/* Register Link */}
            <p className="mt-6 text-center text-sm text-slate-400">
              Нет аккаунта?{' '}
              <Link href="/register" className="text-blue-400 hover:text-blue-300 font-medium transition">
                Регистрация
              </Link>
            </p>
          </div>

          {/* Footer */}
          <p className="mt-8 text-center text-xs text-slate-500">
            © 2024 VendHub. Все права защищены.
          </p>
        </div>
      </div>
    </div>
  );
}
```

FEATURES:
- Split-screen design (fluid left, form right)
- Glass-morphism form with backdrop-blur
- VendHub branding with gradient logo
- Password visibility toggle
- Demo access button
- Mobile responsive (fluid hidden on mobile)
- Loading state with spinner
- Smooth transitions and hover effects
```

---

## 4. DASHBOARD ФОН

### TASK V.3: Subtle Dashboard Background (20 мин)

**Путь:** `frontend/src/app/dashboard/layout.tsx`

**Prompt для Claude Code:**

```
Add subtle LiquidEther background to VHM24 dashboard layout:

File: frontend/src/app/dashboard/layout.tsx

```tsx
'use client';

import { useState, useEffect } from 'react';
import { LiquidEther } from '@/components/effects';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import MobileNav from '@/components/layout/MobileNav';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [showFluidBg, setShowFluidBg] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return (
    <div className="relative min-h-screen bg-slate-950">
      {/* Subtle Fluid Background (disabled on mobile for performance) */}
      {showFluidBg && !isMobile && (
        <div className="fixed inset-0 pointer-events-none z-0">
          <LiquidEther
            colors={['#0F172A', '#1E293B', '#334155']} // Very dark, subtle grays
            mouseForce={12}
            cursorSize={80}
            resolution={0.25} // Low for performance
            autoDemo={true}
            autoSpeed={0.15}
            autoIntensity={1.0}
            viscous={50}
            iterationsPoisson={16}
            iterationsViscous={16}
            className="opacity-15"
          />
        </div>
      )}

      {/* Main Layout */}
      <div className="relative z-10 flex">
        {/* Sidebar - Desktop */}
        <aside className="hidden lg:block fixed left-0 top-0 bottom-0 w-64 bg-slate-900/70 backdrop-blur-xl border-r border-white/5 z-30">
          <Sidebar />
        </aside>

        {/* Main Content Area */}
        <div className="flex-1 lg:ml-64">
          {/* Header */}
          <header className="sticky top-0 z-20 bg-slate-900/50 backdrop-blur-xl border-b border-white/5">
            <Header />
          </header>

          {/* Page Content */}
          <main className="p-4 lg:p-6 min-h-[calc(100vh-64px)]">
            {children}
          </main>
        </div>
      </div>

      {/* Mobile Navigation */}
      <div className="lg:hidden">
        <MobileNav />
      </div>

      {/* Fluid Background Toggle (for testing/dev) */}
      {process.env.NODE_ENV === 'development' && (
        <button
          onClick={() => setShowFluidBg(!showFluidBg)}
          className="fixed bottom-4 right-4 z-50 px-3 py-1.5 rounded-lg bg-slate-800/80 backdrop-blur-sm border border-white/10 text-xs text-slate-400 hover:text-white transition"
        >
          {showFluidBg ? '🌊 On' : '🌊 Off'}
        </button>
      )}
    </div>
  );
}
```

KEY POINTS:
- Very subtle (15% opacity) so it doesn't distract from data
- Dark muted colors matching VHM24 dark theme
- Low resolution (0.25) for better performance
- Disabled on mobile for battery saving
- backdrop-blur on sidebar/header for glass effect
- Dev toggle button for testing

UPDATE existing components to have backdrop-blur:

Sidebar.tsx - add: className="bg-slate-900/70 backdrop-blur-xl"
Header.tsx - add: className="bg-slate-900/50 backdrop-blur-xl"
```

---

## 5. ПУБЛИЧНАЯ СТРАНИЦА

### TASK V.4: Public Landing Page (опционально)

**Путь:** `frontend/src/app/(public)/page.tsx`

**Prompt для Claude Code:**

```
Create VendHub public landing page with LiquidEther hero:

File: frontend/src/app/(public)/page.tsx

```tsx
import { LiquidEther } from '@/components/effects';
import { Coffee, BarChart3, Bell, Smartphone, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function PublicLandingPage() {
  return (
    <div className="min-h-screen bg-slate-950">
      {/* Hero Section with Fluid */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Fluid Background */}
        <div className="absolute inset-0">
          <LiquidEther
            colors={['#3B82F6', '#8B5CF6', '#EC4899']}
            mouseForce={25}
            cursorSize={120}
            resolution={0.5}
            autoDemo={true}
            autoSpeed={0.3}
            autoIntensity={1.8}
            className="opacity-40"
          />
        </div>

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/80 via-slate-950/50 to-slate-950/90 z-10" />

        {/* Content */}
        <div className="relative z-20 max-w-6xl mx-auto px-6 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 backdrop-blur-sm border border-white/10 mb-8">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-sm text-slate-300">Платформа управления вендингом</span>
          </div>

          {/* Heading */}
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold mb-6">
            <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              VendHub Manager
            </span>
          </h1>

          <p className="text-xl md:text-2xl text-slate-400 mb-12 max-w-3xl mx-auto">
            Полный контроль над сетью кофейных автоматов. 
            Мониторинг, аналитика, задачи — всё в одном месте.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <Link
              href="/login"
              className="group px-8 py-4 rounded-xl bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 text-white font-semibold text-lg transition-all hover:scale-105 hover:shadow-2xl hover:shadow-purple-500/30 flex items-center gap-2"
            >
              Войти в систему
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            
            <Link
              href="/demo"
              className="px-8 py-4 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 text-white font-semibold text-lg hover:bg-white/10 transition-all"
            >
              Демо версия
            </Link>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl mx-auto">
            {[
              { value: '31+', label: 'Автоматов' },
              { value: '24/7', label: 'Мониторинг' },
              { value: '99.9%', label: 'Uptime' },
              { value: '₽15M+', label: 'Выручка/мес' }
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-white mb-1">{stat.value}</div>
                <div className="text-sm text-slate-400">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20">
          <div className="w-6 h-10 rounded-full border-2 border-white/20 flex items-start justify-center p-2">
            <div className="w-1.5 h-3 rounded-full bg-white/40 animate-bounce" />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 px-6 bg-slate-950/50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-white text-center mb-16">
            Всё для управления вендингом
          </h2>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: Coffee,
                title: 'Управление автоматами',
                description: 'Статусы, локации, инвентарь в реальном времени',
                color: 'blue'
              },
              {
                icon: BarChart3,
                title: 'Аналитика продаж',
                description: 'Детальные отчёты по каждому автомату и продукту',
                color: 'purple'
              },
              {
                icon: Bell,
                title: 'Умные уведомления',
                description: 'Алерты о низких остатках и инцидентах',
                color: 'pink'
              },
              {
                icon: Smartphone,
                title: 'Мобильное приложение',
                description: 'Управление на ходу для операторов',
                color: 'cyan'
              }
            ].map((feature) => (
              <div
                key={feature.title}
                className="p-6 rounded-2xl bg-slate-800/30 backdrop-blur-xl border border-white/10 hover:bg-slate-800/50 transition-all group"
              >
                <div className={`w-12 h-12 rounded-xl bg-${feature.color}-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <feature.icon className={`w-6 h-6 text-${feature.color}-400`} />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
                <p className="text-slate-400 text-sm">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
```

This creates a stunning marketing landing page with fluid hero.
```

---

## 6. GLASS-MORPHISM КОМПОНЕНТЫ

### TASK V.5: Обновление UI компонентов (30 мин)

**Prompt для Claude Code:**

```
Update VHM24 UI components to glass-morphism style:

1. Card Component - frontend/src/components/ui/Card.tsx
Add glass effect variant:

```tsx
interface CardProps {
  children: React.ReactNode;
  variant?: 'default' | 'glass';
  className?: string;
}

export function Card({ children, variant = 'default', className = '' }: CardProps) {
  const variants = {
    default: 'bg-slate-800 border-slate-700',
    glass: 'bg-slate-800/30 backdrop-blur-xl border-white/10 hover:bg-slate-800/50'
  };

  return (
    <div className={`
      rounded-xl border p-6 transition-all
      ${variants[variant]}
      ${className}
    `}>
      {children}
    </div>
  );
}
```

2. Button Component - add gradient variant:
```tsx
const variants = {
  // ... existing
  gradient: 'bg-gradient-to-r from-blue-500 via-purple-500 to-blue-600 text-white hover:from-blue-600 hover:via-purple-600 hover:to-blue-700 hover:shadow-lg hover:shadow-blue-500/30',
  glass: 'bg-white/5 backdrop-blur-sm border border-white/10 text-white hover:bg-white/10'
};
```

3. Input Component - add glass style:
```tsx
const baseStyles = `
  w-full px-4 py-3 rounded-xl 
  bg-slate-800/50 backdrop-blur-sm
  border border-white/10 
  text-white placeholder-slate-500
  focus:border-blue-500 focus:ring-1 focus:ring-blue-500 
  outline-none transition
`;
```

4. Modal Component - update backdrop:
```tsx
{/* Backdrop */}
<div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" />

{/* Modal */}
<div className="bg-slate-900/90 backdrop-blur-xl border border-white/10 rounded-2xl">
```

Apply these glass-morphism styles consistently throughout the app.
```

---

## 7. ОПТИМИЗАЦИЯ

### TASK V.6: Performance Optimizations

**Prompt для Claude Code:**

```
Optimize LiquidEther for VHM24:

1. Create presets file: frontend/src/components/effects/liquidPresets.ts

```typescript
export const liquidPresets = {
  // Login/Register pages - impressive effect
  auth: {
    colors: ['#3B82F6', '#8B5CF6', '#06B6D4'],
    mouseForce: 30,
    cursorSize: 150,
    resolution: 0.6,
    autoDemo: true,
    autoSpeed: 0.4,
    autoIntensity: 2.0,
    className: 'opacity-60'
  },

  // Dashboard - subtle background
  dashboard: {
    colors: ['#0F172A', '#1E293B', '#334155'],
    mouseForce: 12,
    cursorSize: 80,
    resolution: 0.25,
    autoDemo: true,
    autoSpeed: 0.15,
    autoIntensity: 1.0,
    viscous: 50,
    iterationsPoisson: 16,
    iterationsViscous: 16,
    className: 'opacity-15'
  },

  // Public landing - eye-catching
  landing: {
    colors: ['#3B82F6', '#8B5CF6', '#EC4899'],
    mouseForce: 25,
    cursorSize: 120,
    resolution: 0.5,
    autoDemo: true,
    autoSpeed: 0.3,
    autoIntensity: 1.8,
    className: 'opacity-40'
  },

  // Setup wizard - medium
  wizard: {
    colors: ['#10B981', '#3B82F6', '#8B5CF6'],
    mouseForce: 20,
    cursorSize: 100,
    resolution: 0.4,
    autoDemo: true,
    autoSpeed: 0.25,
    autoIntensity: 1.5,
    className: 'opacity-30'
  }
};

// Usage:
// import { liquidPresets } from '@/components/effects/liquidPresets';
// <LiquidEther {...liquidPresets.auth} />
```

2. Add dynamic import for SSR safety:

```typescript
// frontend/src/components/effects/index.ts
import dynamic from 'next/dynamic';

export const LiquidEther = dynamic(
  () => import('./LiquidEther'),
  { 
    ssr: false,
    loading: () => <div className="animate-pulse bg-slate-900" />
  }
);
```

3. Add responsive settings hook:

```typescript
// frontend/src/hooks/useLiquidSettings.ts
import { useState, useEffect } from 'react';

export function useLiquidSettings() {
  const [settings, setSettings] = useState({
    resolution: 0.5,
    enabled: true
  });

  useEffect(() => {
    const width = window.innerWidth;
    
    // Disable on mobile for performance
    if (width < 768) {
      setSettings({ resolution: 0.2, enabled: false });
    } else if (width < 1024) {
      setSettings({ resolution: 0.3, enabled: true });
    } else {
      setSettings({ resolution: 0.5, enabled: true });
    }
  }, []);

  return settings;
}
```
```

---

## 8. ПРЕСЕТЫ И ТЕМЫ

### Цветовые схемы для VendHub

```typescript
// VendHub Brand Colors
export const VENDHUB_THEMES = {
  // Основная тема (синий)
  primary: {
    fluid: ['#3B82F6', '#8B5CF6', '#06B6D4'],
    gradient: 'from-blue-500 via-purple-500 to-cyan-500'
  },
  
  // Успех (зелёный)
  success: {
    fluid: ['#10B981', '#059669', '#047857'],
    gradient: 'from-green-500 to-emerald-600'
  },
  
  // Предупреждение (оранжевый)
  warning: {
    fluid: ['#F59E0B', '#D97706', '#B45309'],
    gradient: 'from-amber-500 to-orange-600'
  },
  
  // Ошибка (красный)
  error: {
    fluid: ['#EF4444', '#DC2626', '#B91C1C'],
    gradient: 'from-red-500 to-rose-600'
  },
  
  // Премиум (золотой)
  premium: {
    fluid: ['#F59E0B', '#8B5CF6', '#EC4899'],
    gradient: 'from-amber-500 via-purple-500 to-pink-500'
  }
};
```

---

## ✅ ЧЕКЛИСТ ИНТЕГРАЦИИ

```
□ TASK V.1 - Установка LiquidEther компонента (15 мин)
□ TASK V.2 - Login page с fluid эффектом (30 мин)
□ TASK V.3 - Dashboard subtle background (20 мин)
□ TASK V.4 - Public landing page (опционально)
□ TASK V.5 - Glass-morphism компоненты (30 мин)
□ TASK V.6 - Performance оптимизация (15 мин)

ТЕСТИРОВАНИЕ:
□ Рендеринг без ошибок
□ Плавное взаимодействие с мышью
□ Auto-demo работает
□ Производительность на Desktop (60fps)
□ Отключение на Mobile
□ Dark mode совместимость
□ Текст читаемый поверх эффекта
□ Нет memory leaks
```

---

## 🎯 ПОРЯДОК ВНЕДРЕНИЯ

**Рекомендуемая последовательность:**

1. ✅ **V.1** - Setup component (15 мин)
2. ✅ **V.2** - Login page (30 мин) - *первое впечатление!*
3. ✅ **V.6** - Performance opts (15 мин)
4. ✅ **V.5** - UI components update (30 мин)
5. ✅ **V.3** - Dashboard background (20 мин)
6. ⏸️ **V.4** - Public landing (опционально)

**Общее время:** ~2 часа

---

## 💡 ВАЖНЫЕ ЗАМЕЧАНИЯ

### Производительность
- На mobile fluid **отключён** для экономии батареи
- Dashboard использует **низкое разрешение** (0.25)
- Auto-pause когда вкладка неактивна

### Доступность
- Текст должен быть читаемым (contrast ratio)
- Предусмотреть отключение для пользователей с vestibular disorders
- Добавить в Settings возможность отключения

### Совместимость с Dark Mode
- Все цвета подобраны для dark theme VHM24
- Light mode потребует отдельной палитры

---

**Готово к внедрению в VHM24! 🚀**
