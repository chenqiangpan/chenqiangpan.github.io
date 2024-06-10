import { Stone, deepCopyStones, updateQiForAllGroups, findGroup, calculateGroupQi, serializeBoard } from './main.js';

const koHistory = [];
const transpositionTable = new Map();

function isEyePoint(stones, i, j, color, boardSize) {
    const directions = [
        [0, 1],   // right
        [1, 0],   // down
        [0, -1],  // left
        [-1, 0]   // up
    ];
    let surrounded = true;
    for (let [dx, dy] of directions) {
        const neighborX = i + dx;
        const neighborY = j + dy;
        if (neighborX >= 0 && neighborX < boardSize && neighborY >= 0 && neighborY < boardSize) {
            const neighbor = stones[neighborX][neighborY];
            if (!neighbor || neighbor.color !== color) {
                surrounded = false;
                break;
            }
        } else {
            surrounded = false;
            break;
        }
    }
    return surrounded;
}

function isMoveLegal(stones, i, j, color, boardSize) {
    if (isEyePoint(stones, i, j, color, boardSize)) {
        return false; // Avoid placing in own eyes
    }

    const tempStones = deepCopyStones(stones);
    const newStone = new Stone(i, j, color, 40, boardSize, tempStones);
    tempStones[i][j] = newStone;
    updateQiForAllGroups(tempStones, boardSize);

    if (newStone.calculateQi() === 0) {
        const visited = Array.from({ length: boardSize }, () => Array(boardSize).fill(false));
        const group = findGroup(newStone, tempStones, visited);
        const totalQi = calculateGroupQi(group, tempStones);

        if (totalQi === 0) {
            let capturedStones = [];
            for (let x = 0; x < boardSize; x++) {
                for (let y = 0; y < boardSize; y++) {
                    if (tempStones[x][y] && tempStones[x][y].qi <= 0 && tempStones[x][y].color !== color) {
                        capturedStones.push({ x, y });
                    }
                }
            }

            if (capturedStones.length === 0) {
                return false;
            }
        }
    }

    const serializedState = serializeBoard(tempStones);
    if (koHistory.includes(serializedState)) {
        return false;
    }

    return true;
}

function getLegalMoves(stones, color, boardSize) {
    let legalMoves = [];
    for (let i = 0; i < boardSize; i++) {
        for (let j = 0; j < boardSize; j++) {
            if (!stones[i][j] && isMoveLegal(stones, i, j, color, boardSize)) {
                legalMoves.push({ i, j });
            }
        }
    }
    return legalMoves;
}

function getRandomMove(stones, color, boardSize) {
    const legalMoves = getLegalMoves(stones, color, boardSize);
    if (legalMoves.length > 0) {
        return legalMoves[Math.floor(Math.random() * legalMoves.length)];
    }
    return null;
}

function evaluateBoard(stones, color) {
    let score = 0;
    const enemyColor = color === 'black' ? 'white' : 'black';

    stones.forEach(row => {
        row.forEach(stone => {
            if (stone) {
                if (stone.color === color) {
                    score += stone.qi;
                    // Adjust heuristic values for corners, sides, and center
                    if ((stone.xIndex === 0 || stone.xIndex === stones.length - 1) &&
                        (stone.yIndex === 0 || stone.yIndex === stones.length - 1)) {
                        score -= 100; // Further increased penalty for corners
                    } else if (stone.xIndex === 0 || stone.xIndex === stones.length - 1 ||
                               stone.yIndex === 0 || stone.yIndex === stones.length - 1) {
                        score -= 70; // Further increased penalty for sides
                    } else {
                        score += 20; // Higher reward for central positions
                    }
                } else {
                    score -= stone.qi;
                }
            }
        });
    });

    return score;
}


function getStrategicMove(stones, color, boardSize) {
    const legalMoves = getLegalMoves(stones, color, boardSize);
    if (legalMoves.length > 0) {
        const strategicMoves = legalMoves.filter(move => move.i > 2 && move.i < boardSize - 3 && move.j > 2 && move.j < boardSize - 3);
        if (strategicMoves.length > 0) {
            return strategicMoves[Math.floor(Math.random() * strategicMoves.length)];
        }
        return legalMoves[Math.floor(Math.random() * legalMoves.length)];
    }
    return null;
}

function getBestMove(stones, color, boardSize, depth) {
    let bestMove = getStrategicMove(stones, color, boardSize);
    if (!bestMove) {
        bestMove = getMinimaxMove(stones, color, boardSize, depth);
    }
    return bestMove;
}


function moveOrdering(moves, stones, color, boardSize) {
    // Simple heuristic: prioritize moves close to existing stones and avoid corners early
    return moves.sort((a, b) => {
        let scoreA = 0;
        let scoreB = 0;
        const directions = [
            [0, 1],   // right
            [1, 0],   // down
            [0, -1],  // left
            [-1, 0]   // up
        ];
        directions.forEach(([dx, dy]) => {
            if (stones[a.i + dx] && stones[a.i + dx][a.j + dy]) scoreA++;
            if (stones[b.i + dx] && stones[b.i + dx][b.j + dy]) scoreB++;
        });
        // De-prioritize corners and sides strongly
        if ((a.i === 0 || a.i === boardSize - 1) && (a.j === 0 || a.j === boardSize - 1)) scoreA -= 30;
        if ((b.i === 0 || b.i === boardSize - 1) && (b.j === 0 || b.j === boardSize - 1)) scoreB -= 30;
        if ((a.i === 0 || a.i === boardSize - 1 || a.j === 0 || a.j === boardSize - 1) && !((a.i === 0 || a.i === boardSize - 1) && (a.j === 0 || a.j === boardSize - 1))) scoreA -= 10;
        if ((b.i === 0 || b.i === boardSize - 1 || b.j === 0 || b.j === boardSize - 1) && !((b.i === 0 || b.i === boardSize - 1) && (b.j === 0 || b.j === boardSize - 1))) scoreB -= 10;
        return scoreB - scoreA; // Descending order
    });
}


function minimax(stones, depth, alpha, beta, maximizingPlayer, color, boardSize) {
    const serializedState = serializeBoard(stones);
    if (transpositionTable.has(serializedState)) {
        return transpositionTable.get(serializedState);
    }

    if (depth === 0) {
        const evaluation = evaluateBoard(stones, color);
        transpositionTable.set(serializedState, evaluation);
        return evaluation;
    }

    const possibleMoves = getLegalMoves(stones, color, boardSize);
    const orderedMoves = moveOrdering(possibleMoves, stones, color, boardSize);

    if (orderedMoves.length === 0) {
        const evaluation = evaluateBoard(stones, color);
        transpositionTable.set(serializedState, evaluation);
        return evaluation;
    }

    let value;
    if (maximizingPlayer) {
        value = -Infinity;
        for (const move of orderedMoves) {
            const tempStones = deepCopyStones(stones);
            tempStones[move.i][move.j] = new Stone(move.i, move.j, color, 40, boardSize, tempStones);
            updateQiForAllGroups(tempStones, boardSize);
            value = Math.max(value, minimax(tempStones, depth - 1, alpha, beta, false, color === 'black' ? 'white' : 'black', boardSize));
            alpha = Math.max(alpha, value);
            if (alpha >= beta) {
                break;
            }
        }
    } else {
        value = Infinity;
        for (const move of orderedMoves) {
            const tempStones = deepCopyStones(stones);
            tempStones[move.i][move.j] = new Stone(move.i, move.j, color === 'black' ? 'white' : 'black', 40, boardSize, tempStones);
            updateQiForAllGroups(tempStones, boardSize);
            value = Math.min(value, minimax(tempStones, depth - 1, alpha, beta, true, color, boardSize));
            beta = Math.min(beta, value);
            if (alpha >= beta) {
                break;
            }
        }
    }
    transpositionTable.set(serializedState, value);
    return value;
}

function iterativeDeepening(stones, color, boardSize, maxDepth) {
    let bestMove = null;
    for (let depth = 1; depth <= maxDepth; depth++) {
        bestMove = getMinimaxMove(stones, color, boardSize, depth);
    }
    return bestMove;
}

function getMinimaxMove(stones, color, boardSize, depth) {
    let bestMove = null;
    let bestValue = -Infinity;
    const possibleMoves = getLegalMoves(stones, color, boardSize);

    for (const move of possibleMoves) {
        const tempStones = deepCopyStones(stones);
        tempStones[move.i][move.j] = new Stone(move.i, move.j, color, 40, boardSize, tempStones);
        updateQiForAllGroups(tempStones, boardSize);
        const moveValue = minimax(tempStones, depth - 1, -Infinity, Infinity, false, color === 'black' ? 'white' : 'black', boardSize);
        if (moveValue > bestValue) {
            bestValue = moveValue;
            bestMove = move;
        }
    }

    return bestMove;
}

export { getRandomMove, getMinimaxMove, iterativeDeepening, getBestMove };
