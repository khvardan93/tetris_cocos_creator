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

/**
 * Pure presentation. Reads game state through getters, never mutates it.
 * Redraws only when the game says something changed.
 */
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
        // First draw happens here, after every component's onLoad has run.
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

        // Locked cells
        const board = this.game.board;
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                if (board[r][c]) this.drawCell(r, c, COLORS[board[r][c] - 1]);
            }
        }

        // Falling piece
        if (!this.game.isGameOver) {
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
        if (row < 0) return; // above the visible board
        const g = this.gfx;
        const x = col * CELL;
        const y = (ROWS - 1 - row) * CELL; // board row 0 = top of screen
        g.fillColor = color;
        g.rect(x + 1, y + 1, CELL - 2, CELL - 2);
        g.fill();
        // Retro bevel highlight
        g.fillColor = new Color(255, 255, 255, 60);
        g.rect(x + 1, y + CELL - 6, CELL - 2, 5);
        g.fill();
    }
}

