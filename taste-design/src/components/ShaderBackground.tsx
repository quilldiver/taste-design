"use client";

import { useEffect, useRef } from "react";

/**
 * 波浪渐变蓝色 shader 背景
 *
 * 来源：shader-footer.framer.website（framer-1xpjwr2-container 蓝色版）
 * GLSL 从其 shared-lib chunk 原样移植，uniform 参数与站点配置逐项一致：
 * blend .54 / softness .74 / amp .5 / angle -114 / freqX .9 / freqY 6 / speed 1.46
 * 配色 u_colors = [黑, 黑, rgb(0,105,158), 黑]
 *
 * 降级策略：
 * - 无 WebGL / 编译失败 → 保留 CSS 渐变兜底层（在 globals.css 里始终存在）
 * - prefers-reduced-motion → 只渲染一帧静态构图
 * - 标签页不可见 → 暂停 RAF
 */

const VERT = `
attribute vec2 aPos;
void main() {
  gl_Position = vec4(aPos, 0.0, 1.0);
}
`;

const FRAG = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform vec2  uRes;
uniform float uTime;
uniform float uSeed;
uniform float uBlend;
uniform float uMaskSoft;
uniform float uAmp;
uniform float uAngle;
uniform float uFreqX;
uniform float uFreqY;
uniform float uSpeed;
uniform float uColorsLen;
uniform vec3  uC0;
uniform vec3  uC1;
uniform vec3  uC2;
uniform vec3  uC3;

#define S(a,b,t) smoothstep(a,b,t)
mat2 Rot(float a) {
  float s = sin(a), c = cos(a);
  return mat2(c, -s, s, c);
}

vec2 hash(vec2 p) {
  float s = uSeed;
  vec2 k1 = vec2(2127.1 + s * 13.37, 81.17 + s * 7.31);
  vec2 k2 = vec2(1269.5 + s * 11.13, 283.37 + s * 5.79);
  p = vec2(dot(p, k1), dot(p, k2));
  return fract(sin(p) * (43758.5453 + s * 1.618));
}

float noise(in vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float n = mix(
    mix(dot(-1.0 + 2.0 * hash(i), f),
        dot(-1.0 + 2.0 * hash(i + vec2(1.0, 0.0)), f - vec2(1.0, 0.0)), u.x),
    mix(dot(-1.0 + 2.0 * hash(i + vec2(0.0, 1.0)), f - vec2(0.0, 1.0)),
        dot(-1.0 + 2.0 * hash(i + vec2(1.0, 1.0)), f - vec2(1.0, 1.0)), u.x),
    u.y
  );
  return 0.5 + 0.5 * n;
}

/* u_colors[idx] 动态索引在 WebGL1 不可用，展开为常量分支 */
vec3 getColor(int idx) {
  if (uColorsLen < 1.0) return vec3(0.0);
  int maxIdx = int(uColorsLen) - 1;
  int safe = idx;
  if (safe < 0) safe = 0;
  if (safe > maxIdx) safe = maxIdx;
  if (safe == 0) return uC0;
  if (safe == 1) return uC1;
  if (safe == 2) return uC2;
  return uC3;
}

float seedF(float base) {
  return base * (1.0 + 0.5 * sin(uSeed * 3.17 + base));
}

vec2 warpUV(vec2 uv) {
  float t = uTime * uSpeed;

  float angleOffset = sin(uSeed * 2.73) * 30.0;
  mat2 dirRot = Rot(radians(uAngle + angleOffset));
  vec2 ruv = dirRot * uv;

  float fxMod = seedF(uFreqX);
  float fyMod = seedF(uFreqY);

  float phaseX = fract(sin(uSeed * 7.19) * 437.58) * 6.2832;
  float phaseY = fract(cos(uSeed * 3.41) * 291.37) * 6.2832;

  float harmonic = sin(uSeed * 1.23) * 0.5;
  float a = fyMod * ruv.y - sin(ruv.x * fxMod + ruv.y - t + phaseX);
  a += harmonic * sin(ruv.x * fxMod * 2.0 + ruv.y * 0.5 + t * 0.7 + phaseY);

  a = smoothstep(
    cos(a) * uMaskSoft,
    sin(a) * uMaskSoft + 3.0,
    cos(a - fyMod * ruv.y) - sin(a - fxMod * ruv.x)
  );

  a *= uAmp;

  uv = cos(a) * uv + sin(a) * vec2(-uv.y, uv.x);
  return uv;
}

void main() {
  vec2 fragCoord = gl_FragCoord.xy;
  vec2 uv = fragCoord / uRes;
  float ratio = uRes.x / uRes.y;
  float t = uTime * uSpeed;

  vec2 tuv = uv - 0.5;

  vec2 seedShift = vec2(sin(uSeed * 4.37), cos(uSeed * 5.91)) * 100.0;
  float degree = noise(vec2(t * 0.1, tuv.x * tuv.y) + seedShift);
  tuv.y *= 1.0 / ratio;
  tuv *= Rot(radians((degree - 0.5) * 720.0 + 180.0));
  tuv.y *= ratio;

  vec2 uv2 = (fragCoord * 2.0 - uRes) / (uRes.x + uRes.y) * 2.0;
  float preRotAngle = fract(sin(uSeed * 5.63) * 173.29) * 6.2832;
  uv2 *= Rot(preRotAngle);
  vec2 warped = warpUV(uv2) * 0.5 + 0.5;

  vec2 blendUV = mix(tuv, warped - 0.5, uBlend);

  float layerRot1 = -5.0 + sin(uSeed * 1.83) * 20.0;
  float layerRot2 = 10.0 + cos(uSeed * 2.47) * 20.0;

  vec3 c0 = getColor(0);
  vec3 c1 = getColor(1);
  vec3 c2 = getColor(2);
  vec3 c3 = getColor(3);

  vec3 layer1 = mix(c0, c2, S(-0.3, 0.3, (blendUV * Rot(radians(layerRot1))).x));
  vec3 layer2 = mix(c3, c1, S(-0.3, 0.3, (blendUV * Rot(radians(layerRot2))).x));
  vec3 col = mix(layer1, layer2, S(0.3, -0.3, blendUV.y));

  col = mix(col, col * col + 0.5 * sqrt(col), 0.3);

  gl_FragColor = vec4(col, 1.0);
}
`;

function compile(gl: WebGLRenderingContext, type: number, src: string) {
  const sh = gl.createShader(type);
  if (!sh) return null;
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    console.warn("[shader]", gl.getShaderInfoLog(sh));
    gl.deleteShader(sh);
    return null;
  }
  return sh;
}

export default function ShaderBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl =
      (canvas.getContext("webgl", {
        antialias: false,
        depth: false,
        stencil: false,
        alpha: false,
        powerPreference: "high-performance",
      }) as WebGLRenderingContext | null) ??
      (canvas.getContext("experimental-webgl") as WebGLRenderingContext | null);

    // 无 WebGL：直接保留 CSS 渐变兜底
    if (!gl) return;

    const vs = compile(gl, gl.VERTEX_SHADER, VERT);
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) return;

    const prog = gl.createProgram();
    if (!prog) return;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.warn("[shader] link failed", gl.getProgramInfoLog(prog));
      return;
    }
    gl.useProgram(prog);

    // 全屏三角形（比四边形少一次栅格化接缝）
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 3, -1, -1, 3]),
      gl.STATIC_DRAW
    );
    const aPos = gl.getAttribLocation(prog, "aPos");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const uRes = gl.getUniformLocation(prog, "uRes");
    const uTime = gl.getUniformLocation(prog, "uTime");

    // 站点配置原值一次写入
    const f1 = (name: string, v: number) =>
      gl.uniform1f(gl.getUniformLocation(prog, name), v);
    f1("uSeed", 32);
    f1("uBlend", 0.54);
    f1("uMaskSoft", 0.74);
    f1("uAmp", 0.5);
    f1("uAngle", -114);
    f1("uFreqX", 0.9);
    f1("uFreqY", 6);
    f1("uSpeed", 1.46);
    f1("uColorsLen", 4);
    const c = (name: string, r: number, g: number, b: number) =>
      gl.uniform3f(gl.getUniformLocation(prog, name), r, g, b);
    c("uC0", 0, 0, 0);
    c("uC1", 0, 0, 0);
    c("uC2", 0, 105 / 255, 158 / 255);
    c("uC3", 0, 0, 0);

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");

    // 累计动画时间（秒）。暂停期间不增长，所以恢复后画面不会突然跳一大截
    let elapsed = 0;
    // 静态构图取 t=12
    const STATIC_T = 12;

    const draw = () => {
      gl.uniform1f(uTime, reduce.matches ? STATIC_T : elapsed);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    const resize = () => {
      // DPR 上限 1.5：shader 是柔和渐变，没有必要跑满 3x
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const w = Math.max(1, Math.floor(window.innerWidth * dpr));
      const h = Math.max(1, Math.floor(window.innerHeight * dpr));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        gl.viewport(0, 0, w, h);
      }
      gl.uniform2f(uRes, canvas.width, canvas.height);
      draw(); // 尺寸变化后立刻重画，避免拉伸/空白
    };
    resize();
    window.addEventListener("resize", resize);

    let raf = 0;
    let last = performance.now();
    let stopped = false;

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      elapsed += (now - last) / 1000;
      last = now;
      draw();
    };

    const play = () => {
      // 静态模式下永远不进动画循环
      if (stopped || reduce.matches) return;
      last = performance.now(); // 复位基准，暂停期间的时长不会被计入
      raf = requestAnimationFrame(frame);
    };
    const pause = () => cancelAnimationFrame(raf);

    const onVisibility = () => {
      if (document.hidden) pause();
      else if (reduce.matches) draw();
      else play();
    };
    document.addEventListener("visibilitychange", onVisibility);

    const onLost = (e: Event) => {
      e.preventDefault();
      stopped = true;
      pause();
    };
    canvas.addEventListener("webglcontextlost", onLost);

    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVisibility);
      canvas.removeEventListener("webglcontextlost", onLost);
      gl.deleteProgram(prog);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      gl.deleteBuffer(buf);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 h-full w-full"
    />
  );
}
