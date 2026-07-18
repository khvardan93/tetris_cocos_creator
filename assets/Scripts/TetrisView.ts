import { _decorator, Component, Graphics, Color } from 'cc';
import { TetrisGame, GameEvent, COLS, ROWS } from './TetrisGame';
const { ccclass } = _decorator;

const CELL = 30;

const COLORS: Color[] = [
    new Color(0, 240, 240),   // I - cyan
    new Color(240, 240, 0),   // O - yellow
    new Color(160, 0, 240),   // T - purple
    new Color(0, 240, 0),     // S - green
    new Color(240, 0, 0),     // Z - red
    new Color(0, 0, 240),     // J - blue
    new Color(240, 160, 0),   // L - orange
];

@ccclass('TetrisView')
export class TetrisView extends Component {

    private game: TetrisGame = null!;
    private gfx: Graphics = null!;

    onLoad() {
        this.game = this.getComponent(TetrisGame)!;
        this.gfx = this.getComponent(Graphics)!;
        this.game.events.on(GameEvent.BoardChanged, this.redraw, this);
    }

    start() {
        this.redraw();
    }

    onDestroy() {
        this.game.events.off(GameEvent.BoardChanged, this.redraw, this);
    }

    private redraw() {
        const g = this.gfx;
        g.clear();

        // Background
        g.fillColor = new Color(15, 15, 25);
        g.rect(0, 0, COLS * CELL, ROWS * CELL);
        g.fill();

        // Clear animation state.
        // Each column's destruction order = distance from nearest edge:
        // 0 for the outer pair, 4 for the center pair. A cell disappears
        // once progress * (COLS/2) passes its order -> edges die first.
        const clearing = new Set(this.game.clearingRows);
        const destroyedUpTo = this.game.clearProgress * (COLS / 2);

        // Locked cells
        const board = this.game.board;
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                if (!board[r][c]) continue;

                if (clearing.has(r)) {
                    const order = Math.min(c, COLS - 1 - c);
                    if (order < destroyedUpTo) continue;      // already gone
                    this.drawCell(r, c, COLORS[board[r][c] - 1]);
                    this.drawClearFlash(r, c);                // doomed: flash white
                } else {
                    this.drawCell(r, c, COLORS[board[r][c] - 1]);
                }
            }
        }

        // Falling piece - none exists while clearing (locked, next not spawned yet)
        if (!this.game.isGameOver && !this.game.isClearing) {
            const piece = this.game.piece;
            for (let r = 0; r < piece.length; r++) {
                for (let c = 0; c < piece[r].length; c++) {
                    if (piece[r][c]) {
                        this.drawCell(this.game.pieceRow + r,
                            this.game.pieceCol + c,
                            COLORS[this.game.pieceColor - 1]);
                    }
                }
            }
        }

        // Grid lines
        g.strokeColor = new Color(40, 40, 60);
        g.lineWidth = 1;
        for (let c = 0; c <= COLS; c++) {
            g.moveTo(c * CELL, 0);
            g.lineTo(c * CELL, ROWS * CELL);
        }
        for (let r = 0; r <= ROWS; r++) {
            g.moveTo(0, r * CELL);
            g.lineTo(COLS * CELL, r * CELL);
        }
        g.stroke();
    }

    private drawCell(row: number, col: number, color: Color) {
        if (row < 0) return;
        const g = this.gfx;
        const x = col * CELL;
        const y = (ROWS - 1 - row) * CELL;
        g.fillColor = color;
        g.rect(x + 1, y + 1, CELL - 2, CELL - 2);
        g.fill();
        g.fillColor = new Color(255, 255, 255, 60);
        g.rect(x + 1, y + CELL - 6, CELL - 2, 5);
        g.fill();
    }

    /** White overlay on cells that are about to be destroyed - grows with progress. */
    private drawClearFlash(row: number, col: number) {
        const g = this.gfx;
        const x = col * CELL;
        const y = (ROWS - 1 - row) * CELL;
        const alpha = 60 + this.game.clearProgress * 160; // brighter as doom approaches
        g.fillColor = new Color(255, 255, 255, alpha);
        g.rect(x + 1, y + 1, CELL - 2, CELL - 2);
        g.fill();
    }
}