import type { World } from '../../world';
import type { CursorSnapshot } from './GameSceneContracts';

export class GameEnvironment {
  isGameOver = false;
  isPaused = false;
  isUpgrading = false;
  isEscPaused = false;
  pendingWaveNumber = 1;

  constructor(private readonly world: World) {}

  getCursorPosition(): CursorSnapshot {
    const t = this.world.transform.get(this.world.context.playerId);
    return t ? { x: t.x, y: t.y } : { x: 0, y: 0 };
  }
}
