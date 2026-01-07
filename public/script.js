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
let highScore = 0;

/* DOM Elements */
const boardElement = document.getElementById('sudoku-board');
const numBtns = document.querySelectorAll('.num-btn');
const btnNewGame = document.getElementById('btn-new-game');
const btnErase = document.getElementById('btn-erase');
const dialog = document.getElementById('difficulty-dialog');
const btnConfirmDiff = document.getElementById('confirm-difficulty');
const timerDisplay = document.querySelector('.timer');
const diffLabel = document.querySelector('.difficulty-label');
const highScoreDisplay = document.getElementById('high-score');

/* Initialization */
window.addEventListener('DOMContentLoaded', () => {
    loadHighScore();
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
    initialBoard = removeNumbers(playBoard, attempts);

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
    // Simple removal logic: remove N cells randomly
    // Note: A robust generator checks if solution is still unique. 
    // For this simple version, we'll just punch holes.
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

    // Calculate Score
    const multiplier = getDifficultyMultiplier(difficulty);
    // Base score 10000 reduced by time taken. Minimum score 100.
    // Formula: (10000 / (seconds + 1)) * multiplier
    const rawScore = Math.floor((10000 / (Math.max(seconds, 1))) * multiplier);
    const finalScore = Math.max(rawScore, 100);

    // Check High Score
    if (finalScore > highScore) {
        highScore = finalScore;
        saveHighScore(highScore);
        alert(`Congratulations! New High Score: ${finalScore}`);
    } else {
        alert(`Congratulations! You solved it! Score: ${finalScore}`);
    }

    clearInterval(timerInterval);
}

function getDifficultyMultiplier(diff) {
    if (diff === 'easy') return 1;
    if (diff === 'medium') return 2;
    if (diff === 'hard') return 3;
    return 1;
}

function saveHighScore(score) {
    localStorage.setItem('sudoku-highscore', score);
    updateHighScoreUI();
}

function loadHighScore() {
    const saved = localStorage.getItem('sudoku-highscore');
    if (saved) {
        highScore = parseInt(saved);
        updateHighScoreUI();
    }
}

function updateHighScoreUI() {
    if (highScoreDisplay) {
        highScoreDisplay.textContent = highScore;
    }
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
