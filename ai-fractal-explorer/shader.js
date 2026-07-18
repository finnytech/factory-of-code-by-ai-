const vertexShaderSource = `
    attribute vec2 a_position;
    void main() {
        gl_Position = vec4(a_position, 0.0, 1.0);
    }
`;

const fragmentShaderSource = `
    precision highp float;

    uniform vec2 u_resolution;
    uniform vec2 u_offset;
    uniform float u_zoom;
    uniform float u_time;
    uniform int u_max_iterations;
    uniform float u_color_shift;
    uniform int u_mode; // 0 for Mandelbrot, 1 for Julia
    uniform vec2 u_julia_c;

    // AI inspired color mapping
    vec3 colorMap(float t) {
        vec3 a = vec3(0.5, 0.5, 0.5);
        vec3 b = vec3(0.5, 0.5, 0.5);
        vec3 c = vec3(1.0, 1.0, 1.0);
        vec3 d = vec3(0.263, 0.416, 0.557) * u_color_shift;

        return a + b * cos(6.28318 * (c * t + d + u_time * 0.1));
    }

    void main() {
        // Normalize coordinates and apply zoom/offset
        vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution) / min(u_resolution.y, u_resolution.x);
        vec2 z = uv * (4.0 / u_zoom) + u_offset;
        vec2 c = (u_mode == 0) ? z : u_julia_c;

        int iter = 0;
        float iterFloat = 0.0;

        for(int i = 0; i < 500; i++) {
            if(i >= u_max_iterations) break;

            // z = z^2 + c
            float x = (z.x * z.x - z.y * z.y) + c.x;
            float y = (z.y * z.x + z.x * z.y) + c.y;

            if((x * x + y * y) > 4.0) break;
            z.x = x;
            z.y = y;

            iter++;
        }

        iterFloat = float(iter);

        // Smooth coloring
        if (iter < u_max_iterations) {
            float log_zn = log(z.x*z.x + z.y*z.y) / 2.0;
            float nu = log(log_zn / log(2.0)) / log(2.0);
            iterFloat = iterFloat + 1.0 - nu;
        }

        vec3 color = vec3(0.0);
        if (iter < u_max_iterations) {
            float t = iterFloat / float(u_max_iterations);
            color = colorMap(t * 3.0); // Multiply for more bands

            // Add neon glow near the edges
            float glow = exp(-t * 10.0) * 0.5;
            color += vec3(glow * 0.5, glow * 1.0, glow * 0.8);
        } else {
            // Interior color (void)
            color = vec3(0.02, 0.02, 0.05);
        }

        gl_FragColor = vec4(color, 1.0);
    }
`;

function compileShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('Shader compile error:', gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }
    return shader;
}

function createProgram(gl, vsSource, fsSource) {
    const vertexShader = compileShader(gl, gl.VERTEX_SHADER, vsSource);
    const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, fsSource);

    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error('Program link error:', gl.getProgramInfoLog(program));
        return null;
    }
    return program;
}
