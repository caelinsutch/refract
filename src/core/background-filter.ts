/** Separable background filter. Buffers are reused; callers cache static results. */
export class BackgroundFilter {
  private canvas = new OffscreenCanvas(1, 1);
  private gl = this.canvas.getContext("webgl2", {
    premultipliedAlpha: true,
    preserveDrawingBuffer: true,
    antialias: false,
    depth: false,
    stencil: false,
  });
  private program?: WebGLProgram;
  private textures: WebGLTexture[] = [];
  private framebuffer?: WebGLFramebuffer;
  private size = "";

  constructor() {
    const gl = this.gl;
    if (!gl) return;
    const compile = (type: number, source: string) => {
      const shader = gl.createShader(type)!;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        const error = gl.getShaderInfoLog(shader);
        gl.deleteShader(shader);
        throw new Error(error ?? "Background shader compilation failed");
      }
      return shader;
    };
    const vertex = compile(
      gl.VERTEX_SHADER,
      `#version 300 es
      out vec2 uv;
      void main() {
        vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
        uv = p; gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
      }`,
    );
    const fragment = compile(
      gl.FRAGMENT_SHADER,
      `#version 300 es
      precision highp float;
      uniform sampler2D image;
      uniform vec2 stepSize;
      uniform bool present;
      uniform bool diagonal;
      in vec2 uv;
      out vec4 color;
      vec4 sampleAt(vec2 p) {
        if (any(lessThan(p, vec2(0.0))) || any(greaterThan(p, vec2(1.0)))) return vec4(0.0);
        return texture(image, p);
      }
      void main() {
        if (present) { color = texture(image, vec2(uv.x, 1.0 - uv.y)); return; }
        if (diagonal) {
          color = (sampleAt(uv + stepSize) + sampleAt(uv - stepSize)
            + sampleAt(uv + vec2(stepSize.x, -stepSize.y))
            + sampleAt(uv + vec2(-stepSize.x, stepSize.y))) * 0.25;
          return;
        }
        color = sampleAt(uv - 2.0 * stepSize) * 0.153388
          + sampleAt(uv - stepSize) * 0.221461
          + sampleAt(uv) * 0.250301
          + sampleAt(uv + stepSize) * 0.221461
          + sampleAt(uv + 2.0 * stepSize) * 0.153388;
      }`,
    );
    const program = gl.createProgram()!;
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    gl.deleteShader(vertex);
    gl.deleteShader(fragment);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      gl.deleteProgram(program);
      throw new Error("Background shader linking failed");
    }
    this.program = program;
    this.framebuffer = gl.createFramebuffer()!;
    this.textures = [gl.createTexture()!, gl.createTexture()!];
    for (const texture of this.textures) {
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    }
  }

  render(
    source: OffscreenCanvas | HTMLCanvasElement,
    strength: number,
    kernels?: readonly number[],
  ) {
    const gl = this.gl;
    if (!gl || !this.program || gl.isContextLost()) return null;
    const { width, height } = source;
    if (Math.max(width, height) > gl.getParameter(gl.MAX_TEXTURE_SIZE))
      return null;
    const key = `${width}:${height}`;
    if (key !== this.size) {
      this.canvas.width = width;
      this.canvas.height = height;
      for (const texture of this.textures) {
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(
          gl.TEXTURE_2D,
          0,
          gl.RGBA,
          width,
          height,
          0,
          gl.RGBA,
          gl.UNSIGNED_BYTE,
          null,
        );
      }
      this.size = key;
    }
    gl.viewport(0, 0, width, height);
    gl.disable(gl.BLEND);
    gl.disable(gl.DITHER);
    gl.useProgram(this.program);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.textures[0]);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gl.RGBA, gl.UNSIGNED_BYTE, source);
    const step = gl.getUniformLocation(this.program, "stepSize");
    const present = gl.getUniformLocation(this.program, "present");
    gl.uniform1i(present, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer!);
    gl.uniform1i(
      gl.getUniformLocation(this.program, "diagonal"),
      kernels ? 1 : 0,
    );
    const steps: [number, number][] = kernels
      ? kernels.map((offset) => [offset / width, offset / height])
      : Array.from({ length: 40 }, (_, i) =>
          i < 20 ? [strength / 20 / width, 0] : [0, strength / 20 / height],
        );
    let input = 0;
    for (const [dx, dy] of steps) {
      gl.uniform2f(step, dx, dy);
      const output = 1 - input;
      gl.bindTexture(gl.TEXTURE_2D, this.textures[input]);
      gl.framebufferTexture2D(
        gl.FRAMEBUFFER,
        gl.COLOR_ATTACHMENT0,
        gl.TEXTURE_2D,
        this.textures[output],
        0,
      );
      if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE)
        return null;
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      input = output;
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.bindTexture(gl.TEXTURE_2D, this.textures[input]);
    gl.uniform1i(present, 1);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    return gl.getError() === gl.NO_ERROR ? this.canvas : null;
  }
}
