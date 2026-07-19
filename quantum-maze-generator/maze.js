const canvas = document.getElementById('mazeCanvas');
const ctx = canvas.getContext('2d');

const width = canvas.width;
const height = canvas.height;
const cols = 30;
const rows = 30;
const w = width / cols;

let grid = [];
let current;
let stack = [];

class Cell {
    constructor(i, j) {
        this.i = i;
        this.j = j;
        this.walls = [true, true, true, true]; // top, right, bottom, left
        this.visited = false;
    }

    checkNeighbors() {
        let neighbors = [];

        let top = grid[index(this.i, this.j - 1)];
        let right = grid[index(this.i + 1, this.j)];
        let bottom = grid[index(this.i, this.j + 1)];
        let left = grid[index(this.i - 1, this.j)];

        if (top && !top.visited) {
            neighbors.push(top);
        }
        if (right && !right.visited) {
            neighbors.push(right);
        }
        if (bottom && !bottom.visited) {
            neighbors.push(bottom);
        }
        if (left && !left.visited) {
            neighbors.push(left);
        }

        if (neighbors.length > 0) {
            let r = Math.floor(Math.random() * neighbors.length);
            return neighbors[r];
        } else {
            return undefined;
        }
    }

    show() {
        let x = this.i * w;
        let y = this.j * w;
        ctx.strokeStyle = '#00ffcc';
        ctx.lineWidth = 2;

        if (this.walls[0]) {
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x + w, y);
            ctx.stroke();
        }
        if (this.walls[1]) {
            ctx.beginPath();
            ctx.moveTo(x + w, y);
            ctx.lineTo(x + w, y + w);
            ctx.stroke();
        }
        if (this.walls[2]) {
            ctx.beginPath();
            ctx.moveTo(x + w, y + w);
            ctx.lineTo(x, y + w);
            ctx.stroke();
        }
        if (this.walls[3]) {
            ctx.beginPath();
            ctx.moveTo(x, y + w);
            ctx.lineTo(x, y);
            ctx.stroke();
        }

        if (this.visited) {
            ctx.fillStyle = '#112222';
            ctx.fillRect(x, y, w, w);
        }
    }

    highlight() {
        let x = this.i * w;
        let y = this.j * w;
        ctx.fillStyle = '#ff00ff';
        ctx.fillRect(x, y, w, w);
    }
}

function index(i, j) {
    if (i < 0 || j < 0 || i > cols - 1 || j > rows - 1) {
        return -1;
    }
    return i + j * cols;
}

function setup() {
    for (let j = 0; j < rows; j++) {
        for (let i = 0; i < cols; i++) {
            let cell = new Cell(i, j);
            grid.push(cell);
        }
    }

    current = grid[0];
}

function draw() {
    ctx.clearRect(0, 0, width, height);

    for (let i = 0; i < grid.length; i++) {
        grid[i].show();
    }

    current.visited = true;
    current.highlight();

    let next = current.checkNeighbors();
    if (next) {
        next.visited = true;

        stack.push(current);

        removeWalls(current, next);

        current = next;
    } else if (stack.length > 0) {
        current = stack.pop();
    }

    if (stack.length > 0) {
        requestAnimationFrame(draw);
    } else {
        // Draw one last time to clear the highlight when finished
        ctx.clearRect(0, 0, width, height);
        for (let i = 0; i < grid.length; i++) {
            grid[i].show();
        }
    }
}

function removeWalls(a, b) {
    let x = a.i - b.i;
    if (x === 1) {
        a.walls[3] = false;
        b.walls[1] = false;
    } else if (x === -1) {
        a.walls[1] = false;
        b.walls[3] = false;
    }

    let y = a.j - b.j;
    if (y === 1) {
        a.walls[0] = false;
        b.walls[2] = false;
    } else if (y === -1) {
        a.walls[2] = false;
        b.walls[0] = false;
    }
}

setup();
draw();
