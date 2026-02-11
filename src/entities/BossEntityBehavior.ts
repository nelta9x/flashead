import Phaser from 'phaser';
import { Data } from '../data/DataManager';
import { COLORS } from '../data/constants';
import { EventBus, GameEvents } from '../utils/EventBus';
import { BossRenderer } from '../effects/BossRenderer';
import { resolveBossHpSegmentState } from './bossHpSegments';
import type { FeedbackSystem } from '../systems/FeedbackSystem';

/**
 * Entity의 보스 전용 행동(렌더링, 아머, 피격 반응, 사망 애니메이션, 이벤트 리스너)을
 * 분리한 composition 헬퍼.
 *
 * Entity가 게이트키퍼(boss)일 때만 생성되며,
 * "상태(armor/push/shake) + 타이밍(reaction tweens) + 이벤트(MONSTER_HP_CHANGED)"가
 * 함께 움직이는 기능 덩어리를 단일 책임으로 캡슐화한다.
 */

interface BossHpChangeCallback {
  (current: number, max: number, sourceX?: number, sourceY?: number): void;
}

interface BossDeathCallback {
  (): void;
}

export class BossEntityBehavior {
  private readonly scene: Phaser.Scene;
  private readonly host: Phaser.GameObjects.Container;
  private readonly onHpChanged: BossHpChangeCallback;
  private readonly onDeath: BossDeathCallback;

  // === 렌더링 ===
  private bossRenderer: BossRenderer | null = null;
  private feedbackSystem: FeedbackSystem | null = null;

  // === 아머 세그먼트 ===
  private defaultArmorPieces: number = 10;
  private armorPieceCount: number = 10;
  private currentArmorCount: number = 10;
  private hpSlotCount: number = 0;
  private filledHpSlotCount: number = 0;

  // === 피격 반응 (Entity가 읽는 공개 필드) ===
  shakeOffsetX: number = 0;
  shakeOffsetY: number = 0;
  pushOffsetX: number = 0;
  pushOffsetY: number = 0;
  isHitStunned: boolean = false;

  // === 트윈 관리 ===
  private reactionTweens: Phaser.Tweens.Tween[] = [];
  private deathTween: Phaser.Tweens.Tween | null = null;

  // === EventBus 리스너 ===
  private entityId: string = '';
  private boundOnMonsterHpChanged: ((...args: unknown[]) => void) | null = null;
  private boundOnMonsterDied: ((...args: unknown[]) => void) | null = null;

  constructor(
    scene: Phaser.Scene,
    host: Phaser.GameObjects.Container,
    onHpChanged: BossHpChangeCallback,
    onDeath: BossDeathCallback
  ) {
    this.scene = scene;
    this.host = host;
    this.onHpChanged = onHpChanged;
    this.onDeath = onDeath;
  }

  // === 초기화 ===

  init(entityId: string, maxHp: number): void {
    this.entityId = entityId;
    const bossConfig = Data.boss.visual;
    this.defaultArmorPieces = Math.max(1, Math.floor(bossConfig.armor.maxPieces));
    this.armorPieceCount = this.defaultArmorPieces;
    this.currentArmorCount = this.defaultArmorPieces;

    if (!this.bossRenderer) {
      this.bossRenderer = new BossRenderer(this.scene, this.host);
    }

    this.host.setDepth(Data.boss.depth);
    this.resetReactionState();
    this.refreshArmorSegments(maxHp, maxHp);
  }

  // === 렌더링 ===

  render(hpRatio: number, timeElapsed: number): void {
    this.bossRenderer?.render({
      hpRatio,
      timeElapsed,
      armorPieceCount: this.armorPieceCount,
      filledArmorPieceCount: this.currentArmorCount,
    });
  }

  // === 아머 ===

  refreshArmorSegments(currentHp: number, maxHp: number): void {
    const segmentState = resolveBossHpSegmentState(currentHp, maxHp, {
      defaultPieces: this.defaultArmorPieces,
      hpScale: Data.boss.visual.armor.hpSegments,
    });

    const oldFilledSlotCount = this.filledHpSlotCount;
    this.hpSlotCount = segmentState.pieceCount;
    this.filledHpSlotCount = segmentState.filledPieces;
    this.armorPieceCount = Math.max(1, this.hpSlotCount);
    this.currentArmorCount = Phaser.Math.Clamp(this.filledHpSlotCount, 0, this.armorPieceCount);

    if (this.filledHpSlotCount < oldFilledSlotCount) {
      this.onArmorBreak();
    }
  }

  private onArmorBreak(): void {
    if (!this.feedbackSystem) return;
    const config = Data.boss.visual.armor;
    this.feedbackSystem.onBossArmorBreak(
      this.host.x,
      this.host.y,
      config.innerRadius,
      config.radius,
      BossRenderer.resolveColor(config.bodyColor, COLORS.RED)
    );
  }

  // === 피격 반응 ===

  onDamage(sourceX?: number, sourceY?: number): void {
    const reaction = Data.boss.feedback.hitReaction;
    if (!reaction) return;

    this.bossRenderer?.playHitFlash(reaction.flashDuration);

    if (sourceX !== undefined && sourceY !== undefined) {
      this.stopReactionTweens();
      this.isHitStunned = true;

      const angle = Phaser.Math.Angle.Between(sourceX, sourceY, this.host.x, this.host.y);
      const pushX = Math.cos(angle) * reaction.pushDistance;
      const pushY = Math.sin(angle) * reaction.pushDistance;
      const hitRotation = (sourceX < this.host.x ? 1 : -1) * reaction.hitRotation;

      this.registerReactionTween(
        this.scene.tweens.add({
          targets: this,
          pushOffsetX: pushX,
          pushOffsetY: pushY,
          duration: reaction.pushDuration,
          ease: reaction.pushEase,
        })
      );

      // host rotation (Entity의 Container.rotation)
      this.registerReactionTween(
        this.scene.tweens.add({
          targets: this.host,
          rotation: hitRotation,
          duration: reaction.pushDuration,
          ease: reaction.pushEase,
        })
      );

      this.registerReactionTween(
        this.scene.tweens.add({
          targets: this,
          shakeOffsetX: { from: -reaction.shakeIntensity, to: reaction.shakeIntensity },
          shakeOffsetY: { from: reaction.shakeIntensity, to: -reaction.shakeIntensity },
          duration: reaction.shakeFrequency,
          yoyo: true,
          repeat: Math.floor(reaction.shakeDuration / reaction.shakeFrequency),
          onComplete: () => {
            if (!this.scene) return;
            this.shakeOffsetX = 0;
            this.shakeOffsetY = 0;
            this.registerReactionTween(
              this.scene.tweens.add({
                targets: this,
                pushOffsetX: 0,
                pushOffsetY: 0,
                duration: reaction.returnDuration,
                ease: reaction.returnEase,
                onComplete: () => {
                  if (!this.scene) return;
                  this.isHitStunned = false;
                },
              })
            );
            this.registerReactionTween(
              this.scene.tweens.add({
                targets: this.host,
                rotation: 0,
                duration: reaction.returnDuration,
                ease: reaction.returnEase,
              })
            );
          },
        })
      );
    }
  }

  // === 사망 애니메이션 ===

  playDeathAnimation(): void {
    this.stopAllTweens();
    const deathAnim = Data.boss.feedback.deathAnimation;
    this.deathTween = this.scene.tweens.add({
      targets: this.host,
      scale: deathAnim.scale,
      alpha: 0,
      duration: deathAnim.duration,
      ease: deathAnim.ease,
      onComplete: () => {
        if (!this.scene) return;
        this.host.setVisible(false);
        this.deathTween = null;
      },
    });
  }

  // === EventBus 리스너 ===

  setupEventListeners(entityId: string): void {
    this.teardownEventListeners();
    this.entityId = entityId;
    const bus = EventBus.getInstance();

    this.boundOnMonsterHpChanged = (...args: unknown[]) => {
      const data = args[0] as {
        bossId: string;
        current?: number;
        max?: number;
        ratio: number;
        sourceX?: number;
        sourceY?: number;
      };
      if (data.bossId !== this.entityId) return;
      const max = typeof data.max === 'number' && data.max > 0 ? Math.floor(data.max) : 0;
      const current = typeof data.current === 'number'
        ? Math.max(0, Math.floor(data.current))
        : Math.round(max * data.ratio);
      this.onHpChanged(current, max, data.sourceX, data.sourceY);
    };

    this.boundOnMonsterDied = (...args: unknown[]) => {
      const data = args[0] as { bossId: string } | undefined;
      if (!data || data.bossId !== this.entityId) return;
      this.onDeath();
    };

    bus.on(GameEvents.MONSTER_HP_CHANGED, this.boundOnMonsterHpChanged);
    bus.on(GameEvents.MONSTER_DIED, this.boundOnMonsterDied);
  }

  teardownEventListeners(): void {
    const bus = EventBus.getInstance();
    if (this.boundOnMonsterHpChanged) {
      bus.off(GameEvents.MONSTER_HP_CHANGED, this.boundOnMonsterHpChanged);
      this.boundOnMonsterHpChanged = null;
    }
    if (this.boundOnMonsterDied) {
      bus.off(GameEvents.MONSTER_DIED, this.boundOnMonsterDied);
      this.boundOnMonsterDied = null;
    }
  }

  // === FeedbackSystem ===

  setFeedbackSystem(feedbackSystem: FeedbackSystem): void {
    this.feedbackSystem = feedbackSystem;
  }

  // === 트윈 관리 ===

  private registerReactionTween(tween: Phaser.Tweens.Tween): void {
    this.reactionTweens.push(tween);
  }

  private stopReactionTweens(): void {
    for (const tween of this.reactionTweens) {
      tween.stop();
      tween.remove();
    }
    this.reactionTweens = [];
    this.resetReactionState();
  }

  private resetReactionState(): void {
    this.shakeOffsetX = 0;
    this.shakeOffsetY = 0;
    this.pushOffsetX = 0;
    this.pushOffsetY = 0;
    this.isHitStunned = false;
  }

  stopAllTweens(): void {
    this.stopReactionTweens();
    if (this.deathTween) {
      this.deathTween.stop();
      this.deathTween = null;
    }
  }

  destroy(): void {
    this.stopAllTweens();
    this.teardownEventListeners();
  }
}
