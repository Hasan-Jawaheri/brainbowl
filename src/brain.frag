#ifdef GL_ES
precision mediump float;
#endif

varying highp vec2 vTextureCoord;

uniform sampler2D base;
uniform float alpha;

void main() {
  vec4 value = texture2D(base, vTextureCoord);
  gl_FragColor = value;
  gl_FragColor.a *= alpha;
}
