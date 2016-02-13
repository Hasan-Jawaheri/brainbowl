#ifdef GL_ES
precision mediump float;
#endif

uniform sampler2D base;
uniform vec2 scale;
uniform float threshold;
uniform int copy;

void main() {
    vec4 value = texture2D(base, gl_FragCoord.xy / scale);
    if (copy != 0) {
        gl_FragColor = value;
    } else if (value.r > 0.35 && value.g < 0.1 && value.b < 0.1) {
        gl_FragColor = vec4(1.0, 0.2, 0.4, 1.0);
    } else {
        gl_FragColor = value;
    }
}
