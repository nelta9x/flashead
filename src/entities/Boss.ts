import Phaser from 'phaser';
import { Data } from '../data/DataManager';
import { COLORS } from '../data/constants';
import { EventBus, GameEvents } from '../utils/EventBus';

export class Boss extends Phaser.GameObjects.Container {
  private core: Phaser.GameObjects.Arc;
  private armorGraphics: Phaser.GameObjects.Graphics;
  private hpRatio: number = 1;
  private timeElapsed: number = 0;
  private isDead: boolean = false;

  // 아머 설정 (HP바 역할)
  private readonly maxArmorPieces: number;
  private currentArmorCount: number;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);

    const config = Data.boss.visual;
    this.maxArmorPieces = config.armor.maxPieces;
    this.currentArmorCount = this.maxArmorPieces;

    // 중앙 코어 생성
    this.core = scene.add.arc(
      0,
      0,
      config.core.radius,
      0,
      360,
      false,
      COLORS.RED,
      config.core.initialAlpha
    );
    this.add(this.core);

    // 아머를 그릴 그래픽스
    this.armorGraphics = scene.add.graphics();
    this.add(this.armorGraphics);

    this.setVisible(false);
    this.setAlpha(0);

    scene.add.existing(this);
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    EventBus.getInstance().on(GameEvents.MONSTER_HP_CHANGED, (...args: unknown[]) => {
      const data = args[0] as { ratio: number };
      const oldArmorCount = this.currentArmorCount;
      this.hpRatio = data.ratio;

      // HP 비율에 따른 아머 개수 계산
      this.currentArmorCount = Math.ceil(this.hpRatio * this.maxArmorPieces);

      // 아머가 부서질 때 효과
      if (this.currentArmorCount < oldArmorCount) {
        this.onArmorBreak();
      }

      this.onDamage();
    });

    EventBus.getInstance().on(GameEvents.MONSTER_DIED, () => {
      this.die();
    });

    EventBus.getInstance().on(GameEvents.WAVE_STARTED, () => {
      this.spawn();
    });
  }

  private spawn(): void {
    const config = Data.boss.spawn;
    this.isDead = false;
    this.hpRatio = 1;
    this.currentArmorCount = this.maxArmorPieces;
    this.setVisible(true);

    this.scene.tweens.add({
      targets: this,
      alpha: 1,
      scale: { from: config.initialScale, to: 1 },
      duration: config.duration,
      ease: 'Back.easeOut',
    });
  }

  private onDamage(): void {
    if (this.isDead) return;
    const config = Data.boss.feedback.damageShake;

    this.scene.tweens.add({
      targets: this.core,
      fillAlpha: 1,
      duration: 50,
      yoyo: true,
      onStart: () => {
        this.core.setFillStyle(0xffffff);
      },
      onComplete: () => {
        this.core.setFillStyle(COLORS.RED, Data.boss.visual.core.initialAlpha);
      },
    });

    this.scene.tweens.add({
      targets: this,
      x: this.x + Phaser.Math.Between(-config.intensity, config.intensity),
      y: this.y + Phaser.Math.Between(-config.intensity, config.intensity),
      duration: config.duration,
      yoyo: true,
      repeat: 1,
    });
  }

  private onArmorBreak(): void {
    const config = Data.boss.visual;
    const feedback = Data.boss.feedback.armorBreakShake;

    // 1. 화면 효과: 강한 흔들림
    this.scene.cameras.main.shake(feedback.duration, feedback.intensity);

    // 2. 사운드 효과: 묵직한 폭발음
    import('../systems/SoundSystem').then((m) => {
      m.SoundSystem.getInstance().playBossImpactSound();
    });

    // 3. 충격파 연출 (Expanding Ring)
    const sw = config.shockwave;
    const shockwave = this.scene.add.graphics();
    shockwave.setDepth(2000);
    this.scene.tweens.add({
      targets: { radius: sw.initialRadius, alpha: sw.initialAlpha },
      radius: sw.maxRadius,
      alpha: 0,
      duration: sw.duration,
      ease: 'Quad.easeOut',
      onUpdate: (_tween, target) => {
        shockwave.clear();
        shockwave.lineStyle(4, 0xffffff, target.alpha);
        shockwave.strokeCircle(this.x, this.y, target.radius);
      },
      onComplete: () => shockwave.destroy(),
    });

    // 4. 파편 비산 효과 강화
    const bp = config.breakParticles;
    for (let i = 0; i < bp.count; i++) {
      const angle = ((Math.PI * 2) / bp.count) * i + (Math.random() - 0.5);
      const px = Math.cos(angle) * bp.spawnDistance;
      const py = Math.sin(angle) * bp.spawnDistance;

      const chunk = this.scene.add.arc(
        this.x + px,
        this.y + py,
        bp.radius,
        0,
        360,
        false,
        COLORS.RED,
        1
      );
      chunk.setDepth(1999);

      this.scene.tweens.add({
        targets: chunk,
        x: chunk.x + Math.cos(angle) * bp.travelDistance,
        y: chunk.y + Math.sin(angle) * bp.travelDistance,
        alpha: 0,
        scale: 0,
        rotation: 720,
        duration: bp.duration,
        ease: 'Cubic.easeOut',
        onComplete: () => chunk.destroy(),
      });
    }
  }

  private die(): void {
    this.isDead = true;
    this.scene.tweens.add({
      targets: this,
      scale: 1.5,
      alpha: 0,
      duration: 800,
      ease: 'Power2.In',
      onComplete: () => {
        this.setVisible(false);
      },
    });
  }

  update(delta: number): void {
    if (!this.visible || this.isDead) return;

    const config = Data.boss;
    this.timeElapsed += delta;
    const dangerLevel = 1 - this.hpRatio;

    // 코어 연출
    const corePulse =
      config.visual.core.initialAlpha +
      Math.sin(this.timeElapsed * config.visual.core.pulseSpeed * (1 + dangerLevel)) *
        config.visual.core.pulseIntensity;
    this.core.setAlpha(corePulse);
    this.core.setScale(1 + dangerLevel * 0.1);

    // 아머 그리기
    this.armorGraphics.clear();
    this.drawArmor();

    // 위기 시 제자리 진동 (상시)
    if (dangerLevel > config.feedback.vibrationThreshold) {
      const intensity = config.feedback.vibrationIntensity * dangerLevel;
      this.x += (Math.random() - 0.5) * intensity;
      this.y += (Math.random() - 0.5) * intensity;
    }
  }

  private drawArmor(): void {
    const config = Data.boss.visual.armor;
    const rotation = this.timeElapsed * config.rotationSpeed;

    const pieceAngle = (Math.PI * 2) / this.maxArmorPieces;

    for (let i = 0; i < this.currentArmorCount; i++) {
      const startAngle = rotation + i * pieceAngle + config.gap;
      const endAngle = rotation + (i + 1) * pieceAngle - config.gap;

      const p1x = Math.cos(startAngle) * config.innerRadius;
      const p1y = Math.sin(startAngle) * config.innerRadius;
      const p2x = Math.cos(endAngle) * config.innerRadius;
      const p2y = Math.sin(endAngle) * config.innerRadius;
      const p3x = Math.cos(endAngle) * config.radius;
      const p3y = Math.sin(endAngle) * config.radius;
      const p4x = Math.cos(startAngle) * config.radius;
      const p4y = Math.sin(startAngle) * config.radius;

      // 아머 본체
      this.armorGraphics.fillStyle(parseInt(config.bodyColor), config.bodyAlpha);
      this.armorGraphics.fillPoints(
        [
          { x: p1x, y: p1y },
          { x: p2x, y: p2y },
          { x: p3x, y: p3y },
          { x: p4x, y: p4y },
        ],
        true
      );

      // 아머 테두리
      this.armorGraphics.lineStyle(2, COLORS.RED, 1);
      this.armorGraphics.strokePoints(
        [
          { x: p1x, y: p1y },
          { x: p2x, y: p2y },
          { x: p3x, y: p3y },
          { x: p4x, y: p4y },
        ],
        true
      );

      // 아머 내부 글로우 라인
      this.armorGraphics.lineStyle(1, COLORS.RED, 0.3);
      const midRadius = (config.radius + config.innerRadius) / 2;
      this.armorGraphics.beginPath();
      this.armorGraphics.arc(
        0,
        0,
        midRadius,
        Phaser.Math.RadToDeg(startAngle),
        Phaser.Math.RadToDeg(endAngle)
      );
      this.armorGraphics.strokePath();
    }
  }
}
