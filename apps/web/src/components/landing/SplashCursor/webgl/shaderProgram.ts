import { hashCode } from "../utils";

function addKeywords(source: string, keywords?: string[]): string {
  if (!keywords) return source;
  return keywords.map((k) => `#define ${k}\n`).join("") + source;
}

export function compileShader(
  gl: WebGL2RenderingContext,
  type: number,
  source: string,
  keywords?: string[],
): WebGLShader {
  const shader = gl.createShader(type)!;
  gl.shaderSource(shader, addKeywords(source, keywords));
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) console.trace(gl.getShaderInfoLog(shader));
  return shader;
}

export function createProgram(
  gl: WebGL2RenderingContext,
  vertexShader: WebGLShader,
  fragmentShader: WebGLShader,
): WebGLProgram {
  const program = gl.createProgram()!;
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) console.trace(gl.getProgramInfoLog(program));
  return program;
}

export function getUniforms(
  gl: WebGL2RenderingContext,
  program: WebGLProgram,
): Record<string, WebGLUniformLocation> {
  const uniforms: Record<string, WebGLUniformLocation> = {};
  const count = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
  for (let i = 0; i < count; i++) {
    const info = gl.getActiveUniform(program, i);
    if (!info) continue;
    const location = gl.getUniformLocation(program, info.name);
    if (location) uniforms[info.name] = location;
  }
  return uniforms;
}

export class Material {
  private gl: WebGL2RenderingContext;
  private vertexShader: WebGLShader;
  private fragmentShaderSource: string;
  private programs: Record<number, WebGLProgram> = {};
  activeProgram: WebGLProgram | null = null;
  uniforms: Record<string, WebGLUniformLocation> = {};

  constructor(gl: WebGL2RenderingContext, vertexShader: WebGLShader, fragmentShaderSource: string) {
    this.gl = gl;
    this.vertexShader = vertexShader;
    this.fragmentShaderSource = fragmentShaderSource;
  }

  setKeywords(keywords: string[]) {
    let hash = 0;
    for (const keyword of keywords) hash += hashCode(keyword);
    let program = this.programs[hash];
    if (program == null) {
      const fragmentShader = compileShader(this.gl, this.gl.FRAGMENT_SHADER, this.fragmentShaderSource, keywords);
      program = createProgram(this.gl, this.vertexShader, fragmentShader);
      this.programs[hash] = program;
    }
    if (program === this.activeProgram) return;
    this.uniforms = getUniforms(this.gl, program);
    this.activeProgram = program;
  }

  bind() {
    this.gl.useProgram(this.activeProgram);
  }
}

export class Program {
  private gl: WebGL2RenderingContext;
  program: WebGLProgram;
  uniforms: Record<string, WebGLUniformLocation>;

  constructor(gl: WebGL2RenderingContext, vertexShader: WebGLShader, fragmentShader: WebGLShader) {
    this.gl = gl;
    this.program = createProgram(gl, vertexShader, fragmentShader);
    this.uniforms = getUniforms(gl, this.program);
  }

  bind() {
    this.gl.useProgram(this.program);
  }
}
