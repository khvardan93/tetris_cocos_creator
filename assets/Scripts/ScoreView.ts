import { _decorator, Component, Label } from 'cc';
import { TetrisGame, GameEvent } from './TetrisGame';
const { ccclass, property } = _decorator;

// Classic scoring table: index = lines cleared at once
const LINE_POINTS = [0, 100, 300, 500, 800];
const HARD_DROP_POINTS_PER_CELL = 2;

/**
 * Owns the scoring rules AND the score display.
 * The game logic never computes points - it only reports facts
 * (lines cleared, cells hard-dropped) and this class decides their worth.
 */
@ccclass('ScoreView')
export class ScoreView extends Component {

    @property(Label)
    scoreLabel: Label | null = null;

    private game: TetrisGame = null!;
    private score = 0;
    private lines = 0;

    onLoad() {
        this.game = this.getComponent(TetrisGame)!;
        const ev = this.game.events;
        ev.on(GameEvent.LinesCleared, this.onLinesCleared, this);
        ev.on(GameEvent.HardDrop, this.onHardDrop, this);
        ev.on(GameEvent.GameOver, this.refresh, this);
        ev.on(GameEvent.GameReset, this.onReset, this);
    }

    start() {
        this.refresh();
    }

    onDestroy() {
        const ev = this.game.events;
        ev.off(GameEvent.LinesCleared, this.onLinesCleared, this);
        ev.off(GameEvent.HardDrop, this.onHardDrop, this);
        ev.off(GameEvent.GameOver, this.refresh, this);
        ev.off(GameEvent.GameReset, this.onReset, this);
    }

    private onLinesCleared(count: number) {
        this.lines += count;
        this.score += LINE_POINTS[count] ?? 0;
        this.refresh();
    }

    private onHardDrop(cells: number) {
        this.score += cells * HARD_DROP_POINTS_PER_CELL;
        this.refresh();
    }

    private onReset() {
        this.score = 0;
        this.lines = 0;
        this.refresh();
    }

    private refresh() {
        if (!this.scoreLabel) return;
        this.scoreLabel.string = this.game.isGameOver
            ? `GAME OVER\nScore: ${this.score}\nPress R`
            : `Score: ${this.score}\nLines: ${this.lines}`;
    }
}