#ifdef GL_ES
precision mediump float;
#endif

attribute vec4 pos_uv;
uniform vec2 offset;
uniform float scale;

varying highp vec2 vTextureCoord;

void main() {
  gl_Position = vec4(pos_uv.xy * scale + offset, 0, 1.0);
  vTextureCoord = pos_uv.zw;
}
