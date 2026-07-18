import { _decorator, Component, EventTarget } from 'cc';
import { TetrisGame, GameEvent } from './TetrisGame';
import { SaveService } from './SaveService';
const { ccclass } = _decorator;

const LINE_POINTS = [0, 100, 300, 500, 800];
const HARD_DROP_POINTS_PER_CELL = 2;

export enum StatsEvent {
    Changed = 'stats-changed',
}

/**
 * Owns every number in the game: current session (score, lines)
 * and lifetime records (high score, totals) via SaveService.
 * Listens to game facts, applies scoring rules, persists on game over.
 * Views read the getters; they never compute anything.
 */
@ccclass('TetrisStats')
export class TetrisStats extends Component {

    readonly events = new EventTarget();

    private game: TetrisGame = null!;
    private _score = 0;
    private _lines = 0;
    private _isNewRecord = false;

    // ---------- Session ----------
    get score() { return this._score; }
    get lines() { return this._lines; }
    get isNewRecord() { return this._isNewRecord; }

    // ---------- Lifetime (straight from save data) ----------
    get highScore()  { return SaveService.instance.data.highScore; }
    get totalLines() { return SaveService.instance.data.totalLinesCleared; }
    get gamesPlayed() { return SaveService.instance.data.gamesPlayed; }

    onLoad() {
        this.game = this.getComponent(TetrisGame)!;
        const ev = this.game.events;
        ev.on(GameEvent.LinesCleared, this.onLinesCleared, this);
        ev.on(GameEvent.HardDrop, this.onHardDrop, this);
        ev.on(GameEvent.GameOver, this.onGameOver, this);
        ev.on(GameEvent.GameReset, this.onReset, this);
    }

    onDestroy() {
        const ev = this.game.events;
        ev.off(GameEvent.LinesCleared, this.onLinesCleared, this);
        ev.off(GameEvent.HardDrop, this.onHardDrop, this);
        ev.off(GameEvent.GameOver, this.onGameOver, this);
        ev.off(GameEvent.GameReset, this.onReset, this);
    }

    private onLinesCleared(count: number) {
        this._lines += count;
        this._score += LINE_POINTS[count] ?? 0;
        this.emitChanged();
    }

    private onHardDrop(cells: number) {
        this._score += cells * HARD_DROP_POINTS_PER_CELL;
        this.emitChanged();
    }

    private onGameOver() {
        const save = SaveService.instance;
        this._isNewRecord = this._score > save.data.highScore;
        if (this._isNewRecord) save.data.highScore = this._score;
        save.data.totalLinesCleared += this._lines;
        save.data.gamesPlayed += 1;
        save.save();
        this.emitChanged();
    }

    private onReset() {
        this._score = 0;
        this._lines = 0;
        this._isNewRecord = false;
        this.emitChanged();
    }

    private emitChanged() {
        this.events.emit(StatsEvent.Changed);
    }
}