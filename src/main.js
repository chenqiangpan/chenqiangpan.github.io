class Stone {
    constructor(xIndex, yIndex, color, cellSize, boardSize, stones) {
        this.xIndex = xIndex;
        this.yIndex = yIndex;
        this.color = color;
        this.cellSize = cellSize;
        this.boardSize = boardSize;
        this.stones = stones;
        this.qi = this.calculateQi();
    }

    calculateQi() {
        let qi = 0;
        const directions = [
            [0, 1],   // right
            [1, 0],   // down
            [0, -1],  // left
            [-1, 0]   // up
        ];

        for (let [dx, dy] of directions) {
            const neighborX = this.xIndex + dx;
            const neighborY = this.yIndex + dy;
            if (neighborX >= 0 && neighborX < this.boardSize && neighborY >= 0 && neighborY < this.boardSize) {
                if (!this.stones[neighborX][neighborY]) {
                    qi++; // Increment qi for each empty neighboring position
                }
            }
        }

        return qi;
    }

    draw(ctx, offset) {
        const radius = this.cellSize / 3;
        const fontSize = this.cellSize / 2; // Increased font size
        const x = offset + this.xIndex * this.cellSize;
        const y = offset + this.yIndex * this.cellSize;

        ctx.beginPath();
        ctx.arc(x, y, radius, 0, 2 * Math.PI);
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.stroke();

        // Draw the number of qi on top of the stone
        ctx.fillStyle = this.color === 'black' ? 'white' : 'black';
        ctx.font = `${fontSize}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.qi, x, y);
    }
}

let lastCapturedPosition = null;
let lastMove = null; // Track the last move
let previousBoardState = null; // Track the previous board state



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

function updateTurnIndicator(turn) {
    const turnIndicator = document.getElementById('turnIndicator');
    turnIndicator.textContent = `${turn.charAt(0).toUpperCase() + turn.slice(1)}'s turn`;
}

function serializeBoard(stones) {
    return stones.map(row => row.map(stone => (stone ? stone.color : '0')).join('')).join('/');
}
window.onload = function() {
    const canvas = document.getElementById('goBoard');
    const ctx = canvas.getContext('2d');
    const boardSize = 19;
    const cellSize = 40;
    const offset = 20;
    let currentStoneColor = 'black'; // First stone color
    let lastMove = null; // Initialize last move

    // Initialize the stones array
    const stones = Array.from({ length: boardSize }, () => Array(boardSize).fill(null));

    // Set the canvas background color
    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw the board grid
    ctx.strokeStyle = '#000000';
    for (let i = 0; i < boardSize; i++) {
        // Draw vertical lines
        ctx.beginPath();
        ctx.moveTo(offset + i * cellSize, offset);
        ctx.lineTo(offset + i * cellSize, offset + (boardSize - 1) * cellSize);
        ctx.stroke();

        // Draw horizontal lines
        ctx.beginPath();
        ctx.moveTo(offset, offset + i * cellSize);
        ctx.lineTo(offset + (boardSize - 1) * cellSize, offset + i * cellSize);
        ctx.stroke();
    }

    // Initialize turn indicator
    updateTurnIndicator(currentStoneColor);

    canvas.addEventListener('click', function(event) {
        const rect = canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
    
        // Find the nearest cross point
        const i = Math.round((x - offset) / cellSize);
        const j = Math.round((y - offset) / cellSize);
    
        const xPos = offset + i * cellSize;
        const yPos = offset + j * cellSize;
    
        // Check if the click is close enough to a cross point and the position is empty
        if (Math.abs(x - xPos) < cellSize / 2 && Math.abs(y - yPos) < cellSize / 2 && !stones[i][j]) {
            // Check for Ko rule
            if (lastCapturedPosition && lastCapturedPosition.i === i && lastCapturedPosition.j === j) {
                // Temporarily place the stone
                const tempStone = new Stone(i, j, currentStoneColor, cellSize, boardSize, stones);
                stones[i][j] = tempStone;
    
                // Recalculate qi for the temporary stone
                const tempQi = tempStone.calculateQi();
    
                // Check if the temporary stone has only one qi
                if (tempQi === 1) {
                    // Remove the temporary stone and show a warning
                    stones[i][j] = null;
                    alert('Not allowed due to Ko rule');
                    return;
                }
    
                // Remove the temporary stone since it was just a check
                stones[i][j] = null;
            }
    
            // Save the current board state before making the move
            const currentBoardState = serializeBoard(stones);
    
            // Temporarily place the stone
            const tempStone = new Stone(i, j, currentStoneColor, cellSize, boardSize, stones);
            stones[i][j] = tempStone;
    
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
    
            // Remove captured stones
            capturedStones.forEach(pos => {
                stones[pos.x][pos.y] = null;
            });
    
            // Recalculate qi after potential captures
            updateQiForAllGroups(stones, boardSize);
    
            // Check the qi of the temporary stone after potential captures
            if (tempStone.qi <= 0 && capturedStones.length === 0) {
                // Remove the temporary stone and show a warning
                stones[i][j] = null;
                alert('Not allowed');
                return;
            }
    
            // Update the last captured position if there were captures
            if (capturedStones.length > 0) {
                lastCapturedPosition = { i, j };
            } else {
                lastCapturedPosition = null;
            }
    
            // Finalize the placement and update the last move
            lastMove = capturedStones.length > 0 ? { i, j, color: currentStoneColor } : null;
    
            // Redraw the board and all stones
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#f0f0f0';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
    
            // Redraw the board grid
            ctx.strokeStyle = '#000000';
            for (let i = 0; i < boardSize; i++) {
                // Draw vertical lines
                ctx.beginPath();
                ctx.moveTo(offset + i * cellSize, offset);
                ctx.lineTo(offset + i * cellSize, offset + (boardSize - 1) * cellSize);
                ctx.stroke();
    
                // Draw horizontal lines
                ctx.beginPath();
                ctx.moveTo(offset, offset + i * cellSize);
                ctx.lineTo(offset + (boardSize - 1) * cellSize, offset + i * cellSize);
                ctx.stroke();
            }
    
            for (let row of stones) {
                for (let s of row) {
                    if (s) {
                        s.draw(ctx, offset);
                    }
                }
            }
    
            // Alternate stone color
            currentStoneColor = currentStoneColor === 'black' ? 'white' : 'black';
    
            // Update turn indicator
            updateTurnIndicator(currentStoneColor);
        }
    });



}


