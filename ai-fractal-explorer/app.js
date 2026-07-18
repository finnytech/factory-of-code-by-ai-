document.addEventListener("DOMContentLoaded", () => {
    const canvas = document.getElementById("fractal-canvas");
    const gl = canvas.getContext("webgl");

    if (!gl) {
        alert("WebGL not supported in this browser.");
        return;
    }

    // Parameters State
    let params = {
        zoom: 1.0,
        iterations: 100,
        colorShift: 1.0,
        offset: [0.0, 0.0],
        mode: 0, // 0 = Mandelbrot, 1 = Julia
        juliaC: [-0.4, 0.6], // Initial interesting Julia seed
        targetZoom: 1.0,
        targetOffset: [0.0, 0.0]
    };

    let isDragging = false;
    let lastMousePos = [0, 0];
    let startTime = Date.now();

    // DOM Elements
    const zoomInput = document.getElementById("zoom");
    const iterInput = document.getElementById("iterations");
    const colorInput = document.getElementById("color-shift");
    const mutateBtn = document.getElementById("mutate-btn");
    const toggleBtn = document.getElementById("toggle-mode");
    const coordDisplay = document.getElementById("coordinates");

    // Initialize WebGL Program
    const program = createProgram(gl, vertexShaderSource, fragmentShaderSource);
    gl.useProgram(program);

    // Quad covering the whole canvas
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
        -1.0, -1.0,
         1.0, -1.0,
        -1.0,  1.0,
        -1.0,  1.0,
         1.0, -1.0,
         1.0,  1.0,
    ]), gl.STATIC_DRAW);

    const positionLocation = gl.getAttribLocation(program, "a_position");
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    // Uniform Locations
    const uResolution = gl.getUniformLocation(program, "u_resolution");
    const uOffset = gl.getUniformLocation(program, "u_offset");
    const uZoom = gl.getUniformLocation(program, "u_zoom");
    const uTime = gl.getUniformLocation(program, "u_time");
    const uMaxIterations = gl.getUniformLocation(program, "u_max_iterations");
    const uColorShift = gl.getUniformLocation(program, "u_color_shift");
    const uMode = gl.getUniformLocation(program, "u_mode");
    const uJuliaC = gl.getUniformLocation(program, "u_julia_c");

    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.uniform2f(uResolution, canvas.width, canvas.height);
    }

    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    // Interaction handlers
    zoomInput.addEventListener('input', (e) => {
        params.targetZoom = parseFloat(e.target.value);
    });

    iterInput.addEventListener('input', (e) => {
        params.iterations = parseInt(e.target.value);
    });

    colorInput.addEventListener('input', (e) => {
        params.colorShift = parseFloat(e.target.value);
    });

    toggleBtn.addEventListener('click', () => {
        params.mode = params.mode === 0 ? 1 : 0;
        toggleBtn.textContent = params.mode === 0 ? "Switch to Julia" : "Switch to Mandelbrot";
        // Reset view
        params.targetZoom = 1.0;
        params.targetOffset = [0.0, 0.0];
        zoomInput.value = 1.0;
    });

    mutateBtn.addEventListener('click', () => {
        // AI Mutation simulation
        params.colorShift = Math.random() * 5.0 + 0.5;
        colorInput.value = params.colorShift;

        if(params.mode === 1) {
            // Mutate Julia seed
            params.juliaC = [
                (Math.random() - 0.5) * 2.0,
                (Math.random() - 0.5) * 2.0
            ];
        } else {
            // Jump to interesting Mandelbrot spot
            const interestingSpots = [
                [-0.743643887037151, 0.131825904205330],
                [-0.743643135, 0.131825963],
                [0.2869, 0.0142]
            ];
            const spot = interestingSpots[Math.floor(Math.random() * interestingSpots.length)];
            params.targetOffset = spot;
            params.targetZoom = Math.random() * 5.0 + 2.0;
            zoomInput.value = params.targetZoom;
        }

        mutateBtn.textContent = "Mutating...";
        setTimeout(() => { mutateBtn.textContent = "AI Mutate"; }, 500);
    });

    // Mouse interactions for panning
    canvas.addEventListener('mousedown', (e) => {
        isDragging = true;
        lastMousePos = [e.clientX, e.clientY];
    });

    canvas.addEventListener('mouseup', () => {
        isDragging = false;
    });

    canvas.addEventListener('mousemove', (e) => {
        if (isDragging) {
            const dx = (e.clientX - lastMousePos[0]) / canvas.width;
            const dy = -(e.clientY - lastMousePos[1]) / canvas.height;

            // Adjust pan speed based on zoom
            const aspect = canvas.width / canvas.height;
            params.targetOffset[0] -= dx * 4.0 / params.zoom * aspect;
            params.targetOffset[1] -= dy * 4.0 / params.zoom;

            lastMousePos = [e.clientX, e.clientY];
        }
    });

    // Mouse wheel for zooming
    canvas.addEventListener('wheel', (e) => {
        e.preventDefault();
        const zoomFactor = 1.1;
        if(e.deltaY < 0) {
            params.targetZoom *= zoomFactor;
        } else {
            params.targetZoom /= zoomFactor;
        }
        // Clamp zoom
        params.targetZoom = Math.max(0.1, Math.min(params.targetZoom, 100000.0));
        zoomInput.value = Math.log10(params.targetZoom); // approximate mapping for UI
    });


    // Render Loop
    function render() {
        // Smooth interpolation for zoom and pan (easing)
        params.zoom += (params.targetZoom - params.zoom) * 0.1;
        params.offset[0] += (params.targetOffset[0] - params.offset[0]) * 0.1;
        params.offset[1] += (params.targetOffset[1] - params.offset[1]) * 0.1;

        const time = (Date.now() - startTime) * 0.001;

        gl.uniform2f(uOffset, params.offset[0], params.offset[1]);
        gl.uniform1f(uZoom, params.zoom);
        gl.uniform1f(uTime, time);
        gl.uniform1i(uMaxIterations, params.iterations);
        gl.uniform1f(uColorShift, params.colorShift);
        gl.uniform1i(uMode, params.mode);
        gl.uniform2f(uJuliaC, params.juliaC[0], params.juliaC[1]);

        gl.drawArrays(gl.TRIANGLES, 0, 6);

        // Update UI displays
        coordDisplay.textContent = `${params.offset[0].toFixed(4)}, ${params.offset[1].toFixed(4)}`;

        requestAnimationFrame(render);
    }

    // Start loop
    render();
});
