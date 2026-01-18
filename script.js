/**
 * Sudoku Logic & UI Controller
 */

/* Game State */
let solutionBoard = [];
let playBoard = []; // Contains current state including user inputs
let initialBoard = []; // To track which cells are immutable
let selectedCell = null; // {r, c}
let difficulty = 'medium';
let timerInterval;
let seconds = 0;

/* DOM Elements */
const boardElement = document.getElementById('sudoku-board');
const numBtns = document.querySelectorAll('.num-btn');
const btnNewGame = document.getElementById('btn-new-game');
const btnErase = document.getElementById('btn-erase');
const dialog = document.getElementById('difficulty-dialog');
const btnConfirmDiff = document.getElementById('confirm-difficulty');
const timerDisplay = document.querySelector('.timer');
const diffLabel = document.querySelector('.difficulty-label');

/* Logical Techniques Flags */
const TECHNIQUES = {
    NAKED_SINGLE: 'Naked Single',
    HIDDEN_SINGLE: 'Hidden Single',
    HIDDEN_PAIR: 'Hidden Pair',
    X_WING: 'X-Wing'
};

/* Initialization */
window.addEventListener('DOMContentLoaded', () => {
    initGame(difficulty);
});

/* Event Listeners */
btnNewGame.addEventListener('click', () => {
    dialog.showModal();
});

btnConfirmDiff.addEventListener('click', (e) => {
    e.preventDefault(); // Prevent form submission
    const form = dialog.querySelector('form');
    const selected = form.difficulty.value;
    difficulty = selected;
    diffLabel.textContent = `Diff: ${difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}`;
    dialog.close();
    initGame(difficulty);
});

numBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        if (!selectedCell) return;
        const val = parseInt(btn.dataset.num);
        fillCell(selectedCell.r, selectedCell.c, val);
    });
});

btnErase.addEventListener('click', () => {
    if (!selectedCell) return;
    fillCell(selectedCell.r, selectedCell.c, 0);
});

document.addEventListener('keydown', (e) => {
    if (!selectedCell) return;

    // Numbers
    if (e.key >= '1' && e.key <= '9') {
        fillCell(selectedCell.r, selectedCell.c, parseInt(e.key));
    }
    // Backspace / Delete
    if (e.key === 'Backspace' || e.key === 'Delete') {
        fillCell(selectedCell.r, selectedCell.c, 0);
    }
    // Arrows (Movement) - Optional, simple implementation
    if (e.key.startsWith('Arrow')) {
        moveSelection(e.key);
    }
});

/* Game Logic Functions */

function initGame(diff) {
    // 1. Generate full valid board
    solutionBoard = generateFullBoard();

    // 2. Remove numbers based on difficulty
    let attempts = 30; // Default Medium
    if (diff === 'easy') attempts = 20; // Fewer removed
    if (diff === 'hard') attempts = 50; // More removed

    // Clone solution to playBoard
    playBoard = JSON.parse(JSON.stringify(solutionBoard));
    initialBoard = removeNumbersSmart(playBoard, diff);

    // 3. Render UI
    renderBoard();

    // 4. Start Timer
    resetTimer();
}

function generateFullBoard() {
    const board = Array.from({ length: 9 }, () => Array(9).fill(0));
    solveSudoku(board);
    return board;
}

function solveSudoku(board) {
    for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
            if (board[r][c] === 0) {
                const nums = [1, 2, 3, 4, 5, 6, 7, 8, 9];
                shuffleArray(nums); // Randomize for varied boards

                for (let num of nums) {
                    if (isValid(board, r, c, num)) {
                        board[r][c] = num;
                        if (solveSudoku(board)) return true;
                        board[r][c] = 0;
                    }
                }
                return false;
            }
        }
    }
    return true; // Solved
}

function isValid(board, r, c, num) {
    // Row & Col
    for (let i = 0; i < 9; i++) {
        if (board[r][i] === num) return false;
        if (board[i][c] === num) return false;
    }
    // 3x3 Box
    const startR = Math.floor(r / 3) * 3;
    const startC = Math.floor(c / 3) * 3;
    for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
            if (board[startR + i][startC + j] === num) return false;
        }
    }
    return true;
}

function removeNumbers(board, count) {
    // Legacy removal logic: remove N cells randomly
    let holes = count;
    const newBoard = JSON.parse(JSON.stringify(board));

    while (holes > 0) {
        const r = Math.floor(Math.random() * 9);
        const c = Math.floor(Math.random() * 9);
        if (newBoard[r][c] !== 0) {
            newBoard[r][c] = 0;
            holes--;
        }
    }
    return newBoard;
}

/**
 * Advanced Removal Logic:
 * Ensures uniqueness and solvability by logic.
 */
function removeNumbersSmart(board, diff) {
    const newBoard = JSON.parse(JSON.stringify(board));

    // Target holes based on difficulty
    let targetHoles = 30; // easy
    let maxLevel = 1; // 1: Singles, 2: Pairs, 3: X-Wing
    if (diff === 'medium') {
        targetHoles = 45;
        maxLevel = 2;
    } else if (diff === 'hard') {
        targetHoles = 55;
        maxLevel = 3;
    }

    const cells = [];
    for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) cells.push({ r, c });
    }
    shuffleArray(cells);

    let holesCount = 0;
    for (let cell of cells) {
        if (holesCount >= targetHoles) break;

        const backup = newBoard[cell.r][cell.c];
        newBoard[cell.r][cell.c] = 0;

        // Check uniqueness
        if (countSolutions(newBoard) === 1) {
            // Check logical solvability
            const logicResult = solveLogically(newBoard);
            if (logicResult.solvable && logicResult.level <= maxLevel) {
                holesCount++;
                continue;
            }
        }

        // Restore if it broke rules
        newBoard[cell.r][cell.c] = backup;
    }

    return newBoard;
}

/**
 * Backtracking solver to count solutions.
 * Stops at 2 to be efficient (we only care if it's > 1).
 */
function countSolutions(board, count = 0) {
    for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
            if (board[r][c] === 0) {
                for (let num = 1; num <= 9; num++) {
                    if (isValid(board, r, c, num)) {
                        board[r][c] = num;
                        count = countSolutions(board, count);
                        board[r][c] = 0;
                        if (count > 1) return count;
                    }
                }
                return count;
            }
        }
    }
    return count + 1;
}

/**
 * Logic-based solver.
 * level: 1 (singles), 2 (pairs), 3 (X-wing)
 */
function solveLogically(board) {
    const tempBoard = JSON.parse(JSON.stringify(board));
    let progress = true;
    let maxLevelUsed = 1;

    while (progress) {
        progress = false;
        const candidates = getCandidatesGrid(tempBoard);

        // 1. Naked Singles
        let naked = findNakedSingles(tempBoard, candidates);
        if (naked) {
            tempBoard[naked.r][naked.c] = naked.v;
            progress = true;
            continue;
        }

        // 2. Hidden Singles
        let hidden = findHiddenSingles(tempBoard, candidates);
        if (hidden) {
            tempBoard[hidden.r][hidden.c] = hidden.v;
            progress = true;
            continue;
        }

        // 3. Hidden Pairs (simplification - removing candidates)
        if (applyHiddenPairs(candidates)) {
            maxLevelUsed = Math.max(maxLevelUsed, 2);
            progress = true;
            continue;
        }

        // 4. X-Wings (simplification - removing candidates)
        if (applyXWings(candidates)) {
            maxLevelUsed = Math.max(maxLevelUsed, 3);
            progress = true;
            continue;
        }
    }

    // Check if solved
    let solved = true;
    for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
            if (tempBoard[r][c] === 0) solved = false;
        }
    }

    return { solvable: solved, level: maxLevelUsed };
}

function getCandidatesGrid(board) {
    const grid = Array.from({ length: 9 }, () => Array(9).fill(null));
    for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
            if (board[r][c] === 0) {
                grid[r][c] = [];
                for (let n = 1; n <= 9; n++) {
                    if (isValid(board, r, c, n)) grid[r][c].push(n);
                }
            }
        }
    }
    return grid;
}

function findNakedSingles(board, candidates) {
    for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
            if (candidates[r][c] && candidates[r][c].length === 1) {
                return { r, c, v: candidates[r][c][0] };
            }
        }
    }
    return null;
}

function findHiddenSingles(board, candidates) {
    // Check rows, cols, boxes
    for (let val = 1; val <= 9; val++) {
        for (let i = 0; i < 9; i++) {
            // Row
            let rowMatches = [];
            for (let c = 0; c < 9; c++) {
                if (candidates[i][c] && candidates[i][c].includes(val)) rowMatches.push(c);
            }
            if (rowMatches.length === 1) return { r: i, c: rowMatches[0], v: val };

            // Col
            let colMatches = [];
            for (let r = 0; r < 9; r++) {
                if (candidates[r][i] && candidates[r][i].includes(val)) colMatches.push(r);
            }
            if (colMatches.length === 1) return { r: colMatches[0], c: i, v: val };

            // Box
            let boxMatches = [];
            const startR = Math.floor(i / 3) * 3;
            const startC = (i % 3) * 3;
            for (let r = 0; r < 3; r++) {
                for (let c = 0; c < 3; c++) {
                    if (candidates[startR + r][startC + c] && candidates[startR + r][startC + c].includes(val)) {
                        boxMatches.push({ r: startR + r, c: startC + c });
                    }
                }
            }
            if (boxMatches.length === 1) return { r: boxMatches[0].r, c: boxMatches[0].c, v: val };
        }
    }
    return null;
}

function applyHiddenPairs(candidates) {
    let changed = false;

    // Helper to find hidden pairs in a list of cell references
    function findInGroup(cells) {
        let valPositions = {};
        for (let val = 1; val <= 9; val++) {
            valPositions[val] = [];
            cells.forEach((cell, idx) => {
                if (candidates[cell.r][cell.c] && candidates[cell.r][cell.c].includes(val)) {
                    valPositions[val].push(idx);
                }
            });
        }

        // Look for two values that appear only in the same two cells
        for (let v1 = 1; v1 <= 9; v1++) {
            if (valPositions[v1].length !== 2) continue;
            for (let v2 = v1 + 1; v2 <= 9; v2++) {
                if (valPositions[v2].length !== 2) continue;

                if (valPositions[v1][0] === valPositions[v2][0] && valPositions[v1][1] === valPositions[v2][1]) {
                    // Hidden Pair found! Prune other candidates from these two cells
                    const idx1 = valPositions[v1][0];
                    const idx2 = valPositions[v1][1];
                    const cell1 = cells[idx1];
                    const cell2 = cells[idx2];

                    [cell1, cell2].forEach(cell => {
                        const oldLen = candidates[cell.r][cell.c].length;
                        candidates[cell.r][cell.c] = candidates[cell.r][cell.c].filter(n => n === v1 || n === v2);
                        if (candidates[cell.r][cell.c].length < oldLen) changed = true;
                    });
                }
            }
        }
    }

    // Apply to rows, cols, boxes
    for (let i = 0; i < 9; i++) {
        // Rows
        let rowCells = [];
        for (let c = 0; c < 9; c++) rowCells.push({ r: i, c });
        findInGroup(rowCells);

        // Cols
        let colCells = [];
        for (let r = 0; r < 9; r++) colCells.push({ r, c: i });
        findInGroup(colCells);

        // Boxes
        let boxCells = [];
        const startR = Math.floor(i / 3) * 3;
        const startC = (i % 3) * 3;
        for (let r = 0; r < 3; r++) {
            for (let c = 0; c < 3; c++) boxCells.push({ r: startR + r, c: startC + c });
        }
        findInGroup(boxCells);
    }

    return changed;
}

function applyXWings(candidates) {
    let changed = false;

    for (let val = 1; val <= 9; val++) {
        // Row-based X-Wing (prunes columns)
        let rowMatches = [];
        for (let r = 0; r < 9; r++) {
            let cols = [];
            for (let c = 0; c < 9; c++) {
                if (candidates[r][c] && candidates[r][c].includes(val)) cols.push(c);
            }
            if (cols.length === 2) rowMatches.push({ r, cols });
        }

        for (let i = 0; i < rowMatches.length; i++) {
            for (let j = i + 1; j < rowMatches.length; j++) {
                const r1 = rowMatches[i];
                const r2 = rowMatches[j];
                if (r1.cols[0] === r2.cols[0] && r1.cols[1] === r2.cols[1]) {
                    // X-Wing found in rows r1.r and r2.r at cols c1, c2
                    const c1 = r1.cols[0];
                    const c2 = r1.cols[1];
                    // Remove val from these columns in other rows
                    for (let r = 0; r < 9; r++) {
                        if (r !== r1.r && r !== r2.r) {
                            [c1, c2].forEach(c => {
                                if (candidates[r][c] && candidates[r][c].includes(val)) {
                                    candidates[r][c] = candidates[r][c].filter(n => n !== val);
                                    changed = true;
                                }
                            });
                        }
                    }
                }
            }
        }

        // Column-based X-Wing (prunes rows) - similar logic
        let colMatches = [];
        for (let c = 0; c < 9; c++) {
            let rows = [];
            for (let r = 0; r < 9; r++) {
                if (candidates[r][c] && candidates[r][c].includes(val)) rows.push(r);
            }
            if (rows.length === 2) colMatches.push({ c, rows });
        }

        for (let i = 0; i < colMatches.length; i++) {
            for (let j = i + 1; j < colMatches.length; j++) {
                const c1 = colMatches[i];
                const c2 = colMatches[j];
                if (c1.rows[0] === c2.rows[0] && c1.rows[1] === c2.rows[1]) {
                    const r1 = c1.rows[0];
                    const r2 = c1.rows[1];
                    for (let c = 0; c < 9; c++) {
                        if (c !== c1.c && c !== c2.c) {
                            [r1, r2].forEach(r => {
                                if (candidates[r][c] && candidates[r][c].includes(val)) {
                                    candidates[r][c] = candidates[r][c].filter(n => n !== val);
                                    changed = true;
                                }
                            });
                        }
                    }
                }
            }
        }
    }

    return changed;
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

/* UI Functions */

function renderBoard() {
    boardElement.innerHTML = '';
    for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
            const cell = document.createElement('div');
            cell.classList.add('cell');

            // Grid lines
            if ((c + 1) % 3 === 0 && c !== 8) cell.classList.add('border-right');
            if ((r + 1) % 3 === 0 && r !== 8) cell.classList.add('border-bottom');

            // Value
            const val = initialBoard[r][c];
            if (val !== 0) {
                cell.textContent = val;
                cell.classList.add('initial');
            } else {
                playBoard[r][c] = 0; // Ensure play state matches
            }

            cell.dataset.r = r;
            cell.dataset.c = c;

            cell.addEventListener('click', () => selectCell(r, c));
            boardElement.appendChild(cell);
        }
    }
}

function selectCell(r, c) {
    // Clear previous selection
    document.querySelectorAll('.selected').forEach(el => el.classList.remove('selected'));
    document.querySelectorAll('.highlighted').forEach(el => el.classList.remove('highlighted'));

    selectedCell = { r, c };

    // Highlight selected
    const cellIdx = r * 9 + c;
    const cellEl = boardElement.children[cellIdx];
    cellEl.classList.add('selected');

    // Highlight specific number across board if cell has content
    const val = playBoard[r][c];
    if (val !== 0) {
        highlightNumber(val);
    }
}

function highlightNumber(num) {
    for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
            if (playBoard[r][c] === num) {
                const idx = r * 9 + c;
                boardElement.children[idx].classList.add('highlighted');
            }
        }
    }
}

function fillCell(r, c, val) {
    // Cannot edit initial cells
    if (initialBoard[r][c] !== 0) return;

    playBoard[r][c] = val;
    const idx = r * 9 + c;
    const cellEl = boardElement.children[idx];

    cellEl.textContent = val === 0 ? '' : val;

    // Animation
    if (val !== 0) {
        cellEl.classList.remove('pop-in');
        void cellEl.offsetWidth; // Trigger reflow
        cellEl.classList.add('pop-in');
    }

    // Check for errors (simple check against solution)
    cellEl.classList.remove('error');
    if (val !== 0 && val !== solutionBoard[r][c]) {
        cellEl.classList.add('error');
    }

    // Re-highlight if changed
    if (val !== 0) {
        document.querySelectorAll('.highlighted').forEach(el => el.classList.remove('highlighted'));
        highlightNumber(val);
    }

    checkWin();
}

function checkWin() {
    for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
            if (playBoard[r][c] !== solutionBoard[r][c]) return;
        }
    }
    alert('Congratulations! You solved it!');
    clearInterval(timerInterval);
}

function resetTimer() {
    clearInterval(timerInterval);
    seconds = 0;
    timerInterval = setInterval(() => {
        seconds++;
        const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
        const secs = (seconds % 60).toString().padStart(2, '0');
        timerDisplay.textContent = `${mins}:${secs}`;
    }, 1000);
}

function moveSelection(key) {
    // Implement arrow key logic if needed
    // Simple version: just return for now or implement based on selectedCell
}
