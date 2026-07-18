import { _decorator, Component, Label } from 'cc';
import { TetrisGame } from './TetrisGame';
import { TetrisStats, StatsEvent } from './TetrisStats';
const { ccclass, property } = _decorator;

/**
 * Pure display. Formats numbers owned by TetrisStats into a label.
 * No scoring rules, no persistence, no game knowledge beyond isGameOver.
 */
@ccclass('ScoreView')
export class ScoreView extends Component {

    @property(Label)
    scoreLabel: Label | null = null;

    private game: TetrisGame = null!;
    private stats: TetrisStats = null!;

    onLoad() {
        this.game = this.getComponent(TetrisGame)!;
        this.stats = this.getComponent(TetrisStats)!;
        this.stats.events.on(StatsEvent.Changed, this.refresh, this);
    }

    start() {
        this.refresh();
    }

    onDestroy() {
        this.stats.events.off(StatsEvent.Changed, this.refresh, this);
    }

    private refresh() {
        if (!this.scoreLabel) return;

        if (this.game.isGameOver) {
            const record = this.stats.isNewRecord ? '\nNEW RECORD!' : '';
            this.scoreLabel.string =
                `GAME OVER${record}\n` +
                `Score: ${this.stats.score}\n` +
                `High: ${this.stats.highScore}\n` +
                `Press R`;
        } else {
            this.scoreLabel.string =
                `Score: ${this.stats.score}\n` +
                `Lines: ${this.stats.lines}\n` +
                `High: ${this.stats.highScore}`;
        }
    }
}