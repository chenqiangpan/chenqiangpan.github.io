let ctx;
let stones;
const history = [];
let lastCapturedPosition = null;
let lastMove = null; // Track the last move
let currentStoneColor = 'black'; // First stone color

// Load the wood texture image
const woodTexture = new Image();
woodTexture.src = 'wood_texture.jpg';

class Stone {
    constructor(xIndex, yIndex, color, cellSize, boardSize, stones) {
        this.xIndex = xIndex;
        this.yIndex = yIndex;
        this.color = color;
        this.cellSize = cellSize;
        this.boardSize = boardSize;
        this.stones = stones;
        this.qi = 0; // Number of liberties, initially 0
    }

    calculateQi() {
        const directions = [
            [0, 1],   // right
            [1, 0],   // down
            [0, -1],  // left
            [-1, 0]   // up
        ];
        let qi = 0;
        for (let [dx, dy] of directions) {
            const neighborX = this.xIndex + dx;
            const neighborY = this.yIndex + dy;
            if (neighborX >= 0 && neighborX < this.boardSize && neighborY >= 0 && neighborY < this.boardSize) {
                if (!this.stones[neighborX][neighborY]) {
                    qi++;
                }
            }
        }
        return qi;
    }

    draw(ctx, offset) {
        const radius = this.cellSize / 2.5;
        const fontSize = this.cellSize / 2;
        const x = offset + this.xIndex * this.cellSize;
        const y = offset + this.yIndex * this.cellSize;

        // Create radial gradient for a more realistic stone
        const gradient = ctx.createRadialGradient(x - radius / 3, y - radius / 3, radius / 10, x, y, radius);
        if (this.color === 'black') {
            gradient.addColorStop(0, '#555');
            gradient.addColorStop(1, '#000');
        } else {
            gradient.addColorStop(0, '#fff');
            gradient.addColorStop(1, '#aaa');
        }

        ctx.beginPath();
        ctx.arc(x, y, radius, 0, 2 * Math.PI, false);
        ctx.fillStyle = gradient;
        ctx.fill();
        ctx.strokeStyle = '#555';
        ctx.stroke();

        // Draw the number of qi on top of the stone
        ctx.fillStyle = this.color === 'black' ? 'white' : 'black';
        ctx.font = `${fontSize}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.qi, x, y);
    }
}

function findGroup(stone, stones, visited) {
    const directions = [
        [0, 1],   // right
        [1, 0],   // down
        [0, -1],  // left
        [-1, 0]   // up
    ];
    const stack = [stone];
    const group = [];

    while (stack.length > 0) {
        const current = stack.pop();
        group.push(current);
        visited[current.xIndex][current.yIndex] = true;

        for (let [dx, dy] of directions) {
            const neighborX = current.xIndex + dx;
            const neighborY = current.yIndex + dy;
            if (neighborX >= 0 && neighborX < stones.length && neighborY >= 0 && neighborY < stones.length) {
                const neighbor = stones[neighborX][neighborY];
                if (neighbor && !visited[neighborX][neighborY] && neighbor.color === stone.color) {
                    stack.push(neighbor);
                    visited[neighborX][neighborY] = true;
                }
            }
        }
    }

    return group;
}

function calculateGroupQi(group) {
    const uniqueLiberties = new Set();

    for (const stone of group) {
        const directions = [
            [0, 1],   // right
            [1, 0],   // down
            [0, -1],  // left
            [-1, 0]   // up
        ];

        for (let [dx, dy] of directions) {
            const neighborX = stone.xIndex + dx;
            const neighborY = stone.yIndex + dy;
            if (neighborX >= 0 && neighborX < stone.boardSize && neighborY >= 0 && neighborY < stone.boardSize) {
                if (!stone.stones[neighborX][neighborY]) {
                    uniqueLiberties.add(`${neighborX},${neighborY}`);
                }
            }
        }
    }

    return uniqueLiberties.size;
}

function updateQiForAllGroups(stones, boardSize) {
    const visited = Array.from({ length: boardSize }, () => Array(boardSize).fill(false));
    for (let x = 0; x < boardSize; x++) {
        for (let y = 0; y < boardSize; y++) {
            if (stones[x][y] && !visited[x][y]) {
                const group = findGroup(stones[x][y], stones, visited);
                const totalQi = calculateGroupQi(group);
                for (const s of group) {
                    s.qi = totalQi;
                }
            }
        }
    }
}

function updateTurnIndicator(turnColor) {
    const turnCanvas = document.getElementById('turnIndicatorCanvas');
    const ctx = turnCanvas.getContext('2d');
    ctx.clearRect(0, 0, turnCanvas.width, turnCanvas.height);

    // Create radial gradient for a more realistic stone
    const radius = 20;
    const x = turnCanvas.width / 2;
    const y = turnCanvas.height / 3;
    const gradient = ctx.createRadialGradient(x - radius / 3, y - radius / 3, radius / 10, x, y, radius);
    if (turnColor === 'black') {
        gradient.addColorStop(0, '#555');
        gradient.addColorStop(1, '#000');
    } else {
        gradient.addColorStop(0, '#fff');
        gradient.addColorStop(1, '#aaa');
    }

    ctx.beginPath();
    ctx.arc(x, y, radius, 0, 2 * Math.PI, false);
    ctx.fillStyle = gradient;
    ctx.fill();
    ctx.strokeStyle = '#555';
    ctx.stroke();

    // Draw the text "TURN" below the stone
    ctx.fillStyle = 'black';
    ctx.font = '16px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('Turn', x, y + radius + 5);
}


function serializeBoard(stones) {
    const serializedRows = stones.map(row =>
        row.map(stone => (stone ? stone.color.charAt(0) : '0')).join('')
    );
    return serializedRows.join('/');
}

function deserializeBoard(serializedBoard, stones, cellSize, boardSize) {
    const rows = serializedBoard.split('/');
    for (let i = 0; i < boardSize; i++) {
        for (let j = 0; j < boardSize; j++) {
            const char = rows[i][j];
            if (char === '0') {
                stones[i][j] = null;
            } else {
                const color = char === 'b' ? 'black' : 'white';
                stones[i][j] = new Stone(i, j, color, cellSize, boardSize, stones);
            }
        }
    }
    updateQiForAllGroups(stones, boardSize);
}

function undoLastMove() {
    if (history.length > 0) {
        const previousState = history.pop();
        console.log('Undoing to previous state:', previousState);
        deserializeBoard(previousState, stones, 40, 19); // Adjust the cellSize and boardSize as needed
        lastCapturedPosition = null;
        lastMove = null;
        drawBoard();
        currentStoneColor = currentStoneColor === 'black' ? 'white' : 'black';
        updateTurnIndicator(currentStoneColor);
    }
}

function drawBoard() {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    // Draw the wood texture as the background
    ctx.drawImage(woodTexture, 0, 0, ctx.canvas.width, ctx.canvas.height);

    // Redraw the board grid
    ctx.strokeStyle = '#000000';
    for (let i = 0; i < stones.length; i++) {
        // Draw vertical lines
        ctx.beginPath();
        ctx.moveTo(20 + i * 40, 20); // Adjust the offset and cellSize as needed
        ctx.lineTo(20 + i * 40, 20 + (stones.length - 1) * 40);
        ctx.stroke();

        // Draw horizontal lines
        ctx.beginPath();
        ctx.moveTo(20, 20 + i * 40);
        ctx.lineTo(20 + (stones.length - 1) * 40, 20 + i * 40);
        ctx.stroke();
    }

    for (let row of stones) {
        for (let s of row) {
            if (s) {
                s.draw(ctx, 20); // Adjust the offset as needed
            }
        }
    }
}

window.onload = function() {
    const canvas = document.getElementById('goBoard');
    ctx = canvas.getContext('2d');
    const boardSize = 19;
    const cellSize = 40;
    const offset = 20;

    // Initialize the stones array
    stones = Array.from({ length: boardSize }, () => Array(boardSize).fill(null));

    // Draw the board only after the wood texture has loaded
    woodTexture.onload = function() {
        drawBoard();
    };

    // Redraw the board to ensure it is displayed correctly initially
    drawBoard();

    // Initialize turn indicator
    updateTurnIndicator(currentStoneColor);

    // Event listener for mouse click
    canvas.addEventListener('click', function(event) {
        const rect = canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

        // Find the nearest cross point
        const i = Math.round((x - offset) / cellSize);
        const j = Math.round((y - offset) / cellSize);

        const xPos = offset + i * cellSize;
        const yPos = offset + j * cellSize;

        console.log(`Click detected at (${x}, ${y}), nearest grid point is (${i}, ${j})`);

        // Check if the click is close enough to a cross point and the position is empty
        if (Math.abs(x - xPos) < cellSize / 2 && Math.abs(y - yPos) < cellSize / 2 && !stones[i][j]) {
            console.log('Position is valid and empty, placing stone');

            // Save the current board state to history
            const serializedState = serializeBoard(stones);
            console.log('Serialized State:', serializedState);
            history.push(serializedState);

            // Temporarily place the stone
            const tempStone = new Stone(i, j, currentStoneColor, cellSize, boardSize, stones);
            stones[i][j] = tempStone;

            console.log('Temporary stone placed, recalculating qi for all groups');

            // Recalculate qi for all groups
            updateQiForAllGroups(stones, boardSize);

            // Check if placing the stone would result in capturing any enemy stones
            let capturedStones = [];
            for (let x = 0; x < boardSize; x++) {
                for (let y = 0; y < boardSize; y++) {
                    if (stones[x][y] && stones[x][y].qi <= 0 && stones[x][y].color !== currentStoneColor) {
                        capturedStones.push({ x, y });
                    }
                }
            }

            console.log('Captured stones:', capturedStones);

            // Remove captured stones
            capturedStones.forEach(pos => {
                stones[pos.x][pos.y] = null;
            });

            // Recalculate qi after potential captures
            updateQiForAllGroups(stones, boardSize);

            // Check the qi of the temporary stone after potential captures
            if (tempStone.qi <= 0 && capturedStones.length === 0) {
                console.log('Move is not allowed, removing temporary stone');
                // Remove the temporary stone and show a warning
                stones[i][j] = null;
                alert('Not allowed');
                history.pop(); // Remove the last saved state if the move was invalid
                return;
            }

            console.log('Move is valid, finalizing placement');

            // Update the last captured position if there were captures
            if (capturedStones.length > 0) {
                lastCapturedPosition = { i, j };
            } else {
                lastCapturedPosition = null;
            }

            // Finalize the placement and update the last move
            lastMove = { i, j, color: currentStoneColor };

            // Redraw the board and all stones
            drawBoard();

            // Alternate stone color
            currentStoneColor = currentStoneColor === 'black' ? 'white' : 'black';

            // Update turn indicator
            updateTurnIndicator(currentStoneColor);
        } else {
            console.log('Invalid move: either out of bounds or position already occupied');
        }
    });

    // Add event listener for undo action
    document.addEventListener('keydown', function(event) {
        if (event.key === 'z' || event.key === 'Z') {
            undoLastMove();
        }
    });

    // Add event listener for undo button
    const undoButton = document.getElementById('undoButton');
    undoButton.addEventListener('click', function() {
        undoLastMove();
    });
}
