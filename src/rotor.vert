#ifdef GL_ES
precision mediump float;
#endif

//attribute vec2 u_matrix;
attribute vec2 position;

void main() {
    gl_Position = vec4(position, 0, 1.0);
}
