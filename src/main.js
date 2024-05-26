let ctx;
let stones;
let history = [];
const koHistory = []; // Track board states where captures occurred
let lastCapturePosition = null; // Track the last capture position to enforce Ko rule

let lastMove = null; // Track the last move
let currentStoneColor = 'black'; // First stone color
let boardSize = 19; // Define boardSize globally

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

function chooseBoardSize(size) {
    boardSize = size;
    document.getElementById('boardSizeSelection').style.display = 'none';
    document.getElementById('sidePanel').style.display = 'flex';
    document.getElementById('goBoard').style.display = 'block';

    initGame();
}

function initGame() {
    const canvas = document.getElementById('goBoard');
    ctx = canvas.getContext('2d');
    const maxCanvasSize = Math.min(window.innerWidth, window.innerHeight) * 0.8;
    const cellSize = maxCanvasSize / (boardSize + 1);
    const offset = cellSize;

    canvas.width = cellSize * (boardSize + 1);
    canvas.height = cellSize * (boardSize + 1);

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

        handleBoardClick(i, j, cellSize);
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

function calculateGroupQi(group, stones) {
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
            if (neighborX >= 0 && neighborY >= 0 && neighborX < stones.length && neighborY < stones.length) {
                if (!stones[neighborX][neighborY]) {
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
                const totalQi = calculateGroupQi(group, stones);
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

function drawBoard() {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    // Draw the wood texture as the background
    ctx.drawImage(woodTexture, 0, 0, ctx.canvas.width, ctx.canvas.height);

    const cellSize = ctx.canvas.width / (boardSize + 1);
    const offset = cellSize;

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
                s.draw(ctx, offset); // Adjust the offset as needed
            }
        }
    }
}

function deepCopyStones(stones) {
    const copy = Array.from({ length: stones.length }, () => Array(stones[0].length).fill(null));
    for (let i = 0; i < stones.length; i++) {
        for (let j = 0; j < stones[i].length; j++) {
            if (stones[i][j]) {
                copy[i][j] = new Stone(
                    stones[i][j].xIndex,
                    stones[i][j].yIndex,
                    stones[i][j].color,
                    stones[i][j].cellSize,
                    stones[i][j].boardSize,
                    copy // Use the copy array here to avoid circular reference
                );
            }
        }
    }
    return copy;
}

function serializeBoard(stones) {
    const serializedRows = stones.map(row =>
        row.map(stone => (stone ? stone.color.charAt(0) : '0')).join('')
    );
    const serializedBoard = serializedRows.join('/');
    console.log('Serialized Board:', serializedBoard);
    return serializedBoard;
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
    console.log('Deserialized Board:', serializeBoard(stones)); // Log the deserialized state
}

function checkKoSituation(tempStones, i, j, color) {
    const tempStone = new Stone(i, j, color, 40, boardSize, tempStones);
    tempStones[i][j] = tempStone;

    // Recalculate qi for all groups
    updateQiForAllGroups(tempStones, boardSize);

    // Serialize the board state
    const serializedState = serializeBoard(tempStones);
    const isKo = koHistory.includes(serializedState);

    // Remove the temporary stone
    tempStones[i][j] = null;

    console.log('Checking Ko Situation: ', serializedState, 'isKo:', isKo); // Log the check
    return isKo;
}

function isKoSituation(newSerializedState) {
    if (history.length === 0) return false;
    const lastSerializedState = history[history.length - 1];

    console.log('Comparing states for Ko:');
    console.log('New State:', newSerializedState);
    console.log('Last State:', lastSerializedState);

    const isKo = newSerializedState === lastSerializedState;

    // Log lengths of the serialized strings
    console.log('New State Length:', newSerializedState.length);
    console.log('Last State Length:', lastSerializedState.length);

    // Perform character-by-character comparison if lengths are the same but isKo is false
    if (!isKo && newSerializedState.length === lastSerializedState.length) {
        for (let i = 0; i < newSerializedState.length; i++) {
            if (newSerializedState[i] !== lastSerializedState[i]) {
                console.log(`Mismatch at index ${i}: '${newSerializedState[i]}' !== '${lastSerializedState[i]}'`);
                break;
            }
        }
    }

    console.log('Ko comparison result:', isKo);
    return isKo;
}

function preemptiveKoCheck(stones, capturedStones, color) {
    const opponentColor = color === 'black' ? 'white' : 'black';
    const tempStones = deepCopyStones(stones);

    for (const pos of capturedStones) {
        if (stones[pos.x][pos.y] === null) continue; // Skip null stones

        tempStones[pos.x][pos.y] = new Stone(
            pos.x, pos.y, opponentColor,
            stones[pos.x][pos.y] ? stones[pos.x][pos.y].cellSize : 40, // Default cell size if null
            stones[pos.x][pos.y] ? stones[pos.x][pos.y].boardSize : 19, // Default board size if null
            tempStones
        );
        updateQiForAllGroups(tempStones, tempStones.length);
        const serializedState = serializeBoard(tempStones);
        if (koHistory.includes(serializedState)) {
            console.log('Preemptive Ko Check: ', serializedState, 'willCreateKo:', true);
            return true;
        }
        tempStones[pos.x][pos.y] = null;
    }

    console.log('Preemptive Ko Check: No Ko detected');
    return false;
}

function undoLastMove() {
    if (history.length > 0) {
        // Remove the last state from history
        const previousState = history.pop();

        // Remove the last Ko history entry if there was a capture
        if (koHistory.length > 0) {
            koHistory.pop();
        }

        if (history.length > 0) {
            const lastState = history[history.length - 1];
            console.log('Undoing to previous state:', lastState);
            deserializeBoard(lastState, stones, ctx.canvas.width / (boardSize + 1), boardSize); // Use calculated cellSize
            drawBoard();
            currentStoneColor = currentStoneColor === 'black' ? 'white' : 'black';
            updateTurnIndicator(currentStoneColor);
        } else {
            // If history is empty, reset the board
            stones = Array.from({ length: boardSize }, () => Array(boardSize).fill(null));
            drawBoard();
            currentStoneColor = 'black';
            updateTurnIndicator(currentStoneColor);
        }
    }
}



function handleBoardClick(i, j, cellSize) {
    if (i >= 0 && i < boardSize && j >= 0 && j < boardSize && !stones[i][j]) { // Added bounds check
        console.log('Position is valid and empty, checking Ko situation');

        // Place the stone temporarily to calculate qi
        const tempStonesBefore = deepCopyStones(stones);
        const newStone = new Stone(i, j, currentStoneColor, cellSize, boardSize, tempStonesBefore);
        tempStonesBefore[i][j] = newStone;
        updateQiForAllGroups(tempStonesBefore, boardSize);
        
        // Check if the new stone has zero qi and is not connected to any group with qi
        if (newStone.calculateQi() === 0) {
            const visited = Array.from({ length: boardSize }, () => Array(boardSize).fill(false));
            const group = findGroup(newStone, tempStonesBefore, visited);
            const totalQi = calculateGroupQi(group, tempStonesBefore);

            if (totalQi === 0) {
                // Check if placing the stone would result in capturing any enemy stones
                let capturedStones = [];
                for (let x = 0; x < boardSize; x++) {
                    for (let y = 0; y < boardSize; y++) {
                        if (tempStonesBefore[x][y] && tempStonesBefore[x][y].qi <= 0 && tempStonesBefore[x][y].color !== currentStoneColor) {
                            capturedStones.push({ x, y });
                        }
                    }
                }

                // If no stones are captured, the move is invalid
                if (capturedStones.length === 0) {
                    console.log('Move not allowed: Stone would have zero qi');
                    alert('Invalid move: Stone would have zero qi');
                    return;
                }
            }
        }

        // Check for Ko situation before placing the stone
        if (lastCapturePosition && lastCapturePosition.length === 1 && lastCapturePosition[0].x === i && lastCapturePosition[0].y === j) {
            console.log('Immediate recapture in Ko position detected, move not allowed');
            alert('Ko rule violation: move not allowed');
            return;
        }

        console.log('Position is valid and empty, placing stone');

        // Place the stone
        stones[i][j] = newStone;

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

        // Serialize the board state after captures
        const postCaptureSerializedState = serializeBoard(stones);

        // Check for Ko situation after captures
        if (koHistory.includes(postCaptureSerializedState) || isKoSituation(postCaptureSerializedState)) {
            console.log('Ko situation detected after capture, move not allowed');
            // Restore the board state before the move and show a warning
            stones[i][j] = null;
            capturedStones.forEach(pos => {
                stones[pos.x][pos.y] = new Stone(pos.x, pos.y, currentStoneColor === 'black' ? 'white' : 'black', cellSize, boardSize, stones);
            });
            updateQiForAllGroups(stones, boardSize);
            drawBoard();
            alert('Ko rule violation: move not allowed');
            return;
        }

        // Track the position of the last capture
        lastCapturePosition = capturedStones.length === 1 ? capturedStones : null;

        // Track the new state in the Ko history if captures occurred
        if (capturedStones.length > 0) {
            koHistory.push(postCaptureSerializedState);
            console.log('Ko history updated:', koHistory); // Log the updated koHistory
        }

        console.log('Move is valid, finalizing placement');

        // Save the current board state to history after finalizing the move
        history.push(postCaptureSerializedState);

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
}




window.onload = function() {
    // No initial setup needed as it is handled by chooseBoardSize function
};
