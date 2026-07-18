import { _decorator, Component, EventTarget } from 'cc';
const { ccclass } = _decorator;

export const COLS = 10;
export const ROWS = 20;

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
    BoardChanged = 'board-changed',
    LinesCleared = 'lines-cleared',  // payload: number of lines (fires AFTER the clear animation)
    HardDrop     = 'hard-drop',      // payload: cells travelled
    GameOver     = 'game-over',
    GameReset    = 'game-reset',
}

@ccclass('TetrisGame')
export class TetrisGame extends Component {

    private static readonly CLEAR_DURATION = 0.45; // seconds of clear animation

    readonly events = new EventTarget();

    private _board: number[][] = [];
    private _piece: number[][] = [];
    private _pieceColor = 1;
    private _pieceRow = 0;
    private _pieceCol = 0;
    private _nextIdx = 0;
    private _lines = 0;
    private _gameOver = false;
    private _dropLocker = true;

    // Clearing state: while non-empty, gravity and input are frozen
    // and the view animates these rows using clearProgress.
    private _clearingRows: number[] = [];
    private _clearTimer = 0;

    private dropTimer = 0;
    private dropInterval = 0.8;

    // ---------- Read-only state ----------

    get board(): ReadonlyArray<ReadonlyArray<number>> {
        return this._board;
    }

    get piece(): ReadonlyArray<ReadonlyArray<number>> {
        return this._piece;
    }

    get pieceColor() {
        return this._pieceColor;
    }

    get pieceRow() {
        return this._pieceRow;
    }

    get pieceCol() {
        return this._pieceCol;
    }

    get nextIndex() {
        return this._nextIdx;
    }

    get isGameOver() {
        return this._gameOver;
    }

    get isClearing() {
        return this._clearingRows.length > 0;
    }

    get clearingRows(): ReadonlyArray<number> {
        return this._clearingRows;
    }

    /** 0..1 progress of the clear animation. The view renders from this. */
    get clearProgress() {
        return this.isClearing
            ? Math.min(1, this._clearTimer / TetrisGame.CLEAR_DURATION)
            : 0;
    }

    // ---------- Lifecycle ----------

    onLoad() {
        this.initState();
    }

    update(dt: number) {
        if (this._gameOver) return;

        if (this.isClearing) {
            this._clearTimer += dt;
            if (this._clearTimer >= TetrisGame.CLEAR_DURATION) {
                this.finishClearing();
            }
            this.emitChanged(); // animate every frame while clearing
            return;             // gravity is frozen
        }

        this.dropTimer += dt;
        if (this.dropTimer >= this.dropInterval) {
            this.dropTimer = 0;
            this.softDrop();
        }
    }

    // ---------- Public commands ----------

    moveLeft() {
        this.tryMove(0, -1);
    }

    moveRight() {
        this.tryMove(0, +1);
    }

    unlockDrop() {
        this._dropLocker = false;
    }

    softDropInput() {
        if(this._dropLocker) return;

        this.softDrop();
    }
    
    softDrop() {
        if (this._gameOver || this.isClearing) return;
        if (!this.collides(this._piece, this._pieceRow + 1, this._pieceCol)) {
            this._pieceRow++;
        } else {
            this.lockPiece();
        }
        this.dropTimer = 0;
        this.emitChanged();
    }

    hardDrop() {
        if (this._gameOver || this.isClearing) return;
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
        if (this._gameOver || this.isClearing) return;
        const rotated = this._piece[0].map((_, c) =>
            this._piece.map(row => row[c]).reverse()
        );
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
        this._board = Array.from({length: ROWS}, () => new Array(COLS).fill(0));
        this._lines = 0;
        this.dropInterval = 0.8;
        this.dropTimer = 0;
        this._gameOver = false;
        this._dropLocker = true;
        this._clearingRows = [];
        this._clearTimer = 0;
        this._nextIdx = Math.floor(Math.random() * SHAPES.length);
        this.spawnPiece();
    }

    private tryMove(dRow: number, dCol: number) {
        if (this._gameOver || this.isClearing) return;
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
        this._dropLocker = true;

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

        const fullRows: number[] = [];
        for (let r = 0; r < ROWS; r++) {
            if (this._board[r].every(v => v !== 0)) fullRows.push(r);
        }

        if (fullRows.length > 0) {
            // Enter clearing state; rows are removed when the animation ends.
            this._clearingRows = fullRows;
            this._clearTimer = 0;
        } else {
            this.spawnPiece();
        }
    }

    private finishClearing() {
        const count = this._clearingRows.length;

        // Ascending order keeps the remaining indices valid:
        // removing row r and unshifting a fresh row on top only
        // shifts rows ABOVE r, and all later targets are below.
        for (const r of [...this._clearingRows].sort((a, b) => a - b)) {
            this._board.splice(r, 1);
            this._board.unshift(new Array(COLS).fill(0));
        }

        this._clearingRows = [];
        this._clearTimer = 0;
        this._lines += count;
        this.dropInterval = Math.max(0.1, 0.8 - Math.floor(this._lines / 10) * 0.07);
        this.events.emit(GameEvent.LinesCleared, count);
        this.spawnPiece();
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