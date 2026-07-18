import { _decorator, Component, EventTarget } from 'cc';
const { ccclass } = _decorator;

export const COLS = 10;
export const ROWS = 20;

// Piece index in this array = color index - 1 (0 in the board means "empty")
export const SHAPES: number[][][] = [
    [[1, 1, 1, 1]],                 // I
    [[1, 1], [1, 1]],               // O
    [[0, 1, 0], [1, 1, 1]],         // T
    [[0, 1, 1], [1, 1, 0]],         // S
    [[1, 1, 0], [0, 1, 1]],         // Z
    [[1, 0, 0], [1, 1, 1]],         // J
    [[0, 0, 1], [1, 1, 1]],         // L
];

export enum GameEvent {
    BoardChanged = 'board-changed',  // any visual state change -> views should redraw
    LinesCleared = 'lines-cleared',  // payload: number of lines
    HardDrop     = 'hard-drop',      // payload: cells travelled
    GameOver     = 'game-over',
    GameReset    = 'game-reset',
}

/**
 * Pure game logic. Knows nothing about rendering, input devices, or UI.
 * Mutate it via the public command methods; observe it via `events` + getters.
 */
@ccclass('TetrisGame')
export class TetrisGame extends Component {

    readonly events = new EventTarget();

    private _board: number[][] = [];
    private _piece: number[][] = [];
    private _pieceColor = 1;
    private _pieceRow = 0;
    private _pieceCol = 0;
    private _nextIdx = 0;
    private _lines = 0;              // kept here only because gravity speed depends on it
    private _gameOver = false;

    private dropTimer = 0;
    private dropInterval = 0.8;
    private dropLocker = true;

    // ---------- Read-only view of the state ----------

    get board(): ReadonlyArray<ReadonlyArray<number>> { return this._board; }
    get piece(): ReadonlyArray<ReadonlyArray<number>> { return this._piece; }
    get pieceColor() { return this._pieceColor; }
    get pieceRow()   { return this._pieceRow; }
    get pieceCol()   { return this._pieceCol; }
    get nextIndex()  { return this._nextIdx; }
    get isGameOver() { return this._gameOver; }

    // ---------- Lifecycle ----------

    onLoad() {
        this.initState();
        // No events emitted here: listeners subscribe in their own onLoad,
        // and onLoad order between components is not guaranteed.
        // Views pull initial state in start() instead.
    }

    update(dt: number) {
        if (this._gameOver) return;
        this.dropTimer += dt;
        if (this.dropTimer >= this.dropInterval) {
            this.dropTimer = 0;
            this.softDrop();
        }
    }

    // ---------- Public commands (called by input, UI buttons, tests...) ----------

    moveLeft()  { this.tryMove(0, -1); }
    moveRight() { this.tryMove(0, +1); }

    unlockDrop(){
        this.dropLocker = false;
    }
    
    softDropInput() {
        if (this.dropLocker) return;
        
        this.softDrop();
    }
    
    private softDrop() {
        if (this._gameOver) return;
        if (!this.collides(this._piece, this._pieceRow + 1, this._pieceCol)) {
            this._pieceRow++;
        } else {
            this.lockPiece();
        }
        this.dropTimer = 0;
        this.emitChanged();
    }

    hardDrop() {
        if (this._gameOver) return;
        let travelled = 0;
        while (!this.collides(this._piece, this._pieceRow + 1, this._pieceCol)) {
            this._pieceRow++;
            travelled++;
        }
        if (travelled > 0) this.events.emit(GameEvent.HardDrop, travelled);
        this.lockPiece();
        this.emitChanged();
    }

    rotatePiece() {
        if (this._gameOver) return;
        // Clockwise rotation = transpose + reverse rows
        const rotated = this._piece[0].map((_, c) =>
            this._piece.map(row => row[c]).reverse()
        );
        // Simple wall kicks
        for (const kick of [0, -1, 1, -2, 2]) {
            if (!this.collides(rotated, this._pieceRow, this._pieceCol + kick)) {
                this._piece = rotated;
                this._pieceCol += kick;
                this.emitChanged();
                return;
            }
        }
    }

    resetGame() {
        this.initState();
        this.events.emit(GameEvent.GameReset);
        this.emitChanged();
    }

    // ---------- Internals ----------

    private initState() {
        this._board = Array.from({ length: ROWS }, () => new Array(COLS).fill(0));
        this._lines = 0;
        this.dropInterval = 0.8;
        this.dropTimer = 0;
        this._gameOver = false;
        this.dropLocker = true;
        this._nextIdx = Math.floor(Math.random() * SHAPES.length);
        this.spawnPiece();
    }

    private tryMove(dRow: number, dCol: number) {
        if (this._gameOver) return;
        if (!this.collides(this._piece, this._pieceRow + dRow, this._pieceCol + dCol)) {
            this._pieceRow += dRow;
            this._pieceCol += dCol;
            this.emitChanged();
        }
    }

    private spawnPiece() {
        const idx = this._nextIdx;
        this._nextIdx = Math.floor(Math.random() * SHAPES.length);
        this._piece = SHAPES[idx].map(row => [...row]);
        this._pieceColor = idx + 1;
        this._pieceRow = 0;
        this._pieceCol = Math.floor((COLS - this._piece[0].length) / 2);
        this.dropLocker = true;

        if (this.collides(this._piece, this._pieceRow, this._pieceCol)) {
            this._gameOver = true;
            this.events.emit(GameEvent.GameOver);
        }
    }

    private lockPiece() {
        for (let r = 0; r < this._piece.length; r++) {
            for (let c = 0; c < this._piece[r].length; c++) {
                if (this._piece[r][c]) {
                    this._board[this._pieceRow + r][this._pieceCol + c] = this._pieceColor;
                }
            }
        }
        this.clearLines();
        this.spawnPiece();
    }

    private clearLines() {
        let cleared = 0;
        for (let r = ROWS - 1; r >= 0; r--) {
            if (this._board[r].every(v => v !== 0)) {
                this._board.splice(r, 1);
                this._board.unshift(new Array(COLS).fill(0));
                cleared++;
                r++; // re-check the row that just slid into this index
            }
        }
        if (cleared > 0) {
            this._lines += cleared;
            this.dropInterval = Math.max(0.1, 0.8 - Math.floor(this._lines / 10) * 0.07);
            this.events.emit(GameEvent.LinesCleared, cleared);
        }
    }

    private collides(shape: ReadonlyArray<ReadonlyArray<number>>, row: number, col: number): boolean {
        for (let r = 0; r < shape.length; r++) {
            for (let c = 0; c < shape[r].length; c++) {
                if (!shape[r][c]) continue;
                const br = row + r;
                const bc = col + c;
                if (bc < 0 || bc >= COLS || br >= ROWS) return true;
                if (br >= 0 && this._board[br][bc] !== 0) return true;
            }
        }
        return false;
    }

    private emitChanged() {
        this.events.emit(GameEvent.BoardChanged);
    }
}
