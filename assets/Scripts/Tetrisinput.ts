import { _decorator, Component, input, Input, KeyCode, EventKeyboard } from 'cc';
import { TetrisGame } from './TetrisGame';
const { ccclass } = _decorator;

/**
 * The only class that knows about the keyboard.
 * Translates device events into TetrisGame commands.
 * Swapping this for touch buttons or a gamepad later touches nothing else.
 */
@ccclass('TetrisInput')
export class TetrisInput extends Component {

    private game: TetrisGame = null!;

    onLoad() {
        this.game = this.getComponent(TetrisGame)!;
        input.on(Input.EventType.KEY_DOWN, this.onKeyDown, this);
    }

    onDestroy() {
        input.off(Input.EventType.KEY_DOWN, this.onKeyDown, this);
    }

    private onKeyDown(event: EventKeyboard) {
        if (this.game.isGameOver) {
            if (event.keyCode === KeyCode.KEY_R) this.game.resetGame();
            return;
        }
        switch (event.keyCode) {
            case KeyCode.ARROW_LEFT:  this.game.moveLeft();    break;
            case KeyCode.ARROW_RIGHT: this.game.moveRight();   break;
            case KeyCode.ARROW_DOWN:  this.game.softDrop();    break;
            case KeyCode.ARROW_UP:    this.game.rotatePiece(); break;
            case KeyCode.SPACE:       this.game.hardDrop();    break;
        }
    }
}