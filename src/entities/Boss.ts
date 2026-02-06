import Phaser from 'phaser';
import { Data } from '../data/DataManager';
import { COLORS } from '../data/constants';
import { EventBus, GameEvents } from '../utils/EventBus';

export class Boss extends Phaser.GameObjects.Container {
  private core: Phaser.GameObjects.Arc;
  private coreLight: Phaser.GameObjects.Arc;
  private glowGraphics: Phaser.GameObjects.Graphics;
  private armorGraphics: Phaser.GameObjects.Graphics;
  private hpRatio: number = 1;
  private timeElapsed: number = 0;
  private isDead: boolean = false;
  private frozen: boolean = false;

  // 아머 설정 (HP바 역할)
  private readonly maxArmorPieces: number;
  private currentArmorCount: number;

  // 움직임 관련
  private homeX: number;
  private homeY: number;
  private baseX: number;
  private baseY: number;
  private shakeOffsetX: number = 0;
  private shakeOffsetY: number = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);

    const config = Data.boss.visual;
    this.maxArmorPieces = config.armor.maxPieces;
    this.currentArmorCount = this.maxArmorPieces;

    // 초기 위치 저장
    this.homeX = x;
    this.homeY = y;
    this.baseX = x;
    this.baseY = y;

    // 네온 글로우를 그릴 그래픽스 (가산 혼합)
    this.glowGraphics = scene.add.graphics();
    this.glowGraphics.setBlendMode(Phaser.BlendModes.ADD);
    this.add(this.glowGraphics);

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

    // 코어 내부 강한 광원
    this.coreLight = scene.add.arc(
      0,
      0,
      config.core.radius * 0.4,
      0,
      360,
      false,
      0xffffff,
      0.8
    );
    this.add(this.coreLight);

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

    // 움직임 초기화
    this.baseX = this.homeX;
    this.baseY = this.homeY;
    this.shakeOffsetX = 0;
    this.shakeOffsetY = 0;
    this.x = this.homeX;
    this.y = this.homeY;

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
      targets: [this.core, this.coreLight],
      fillAlpha: 1,
      duration: 50,
      yoyo: true,
      onStart: () => {
        this.core.setFillStyle(0xffffff);
        this.coreLight.setFillStyle(0xffffff);
      },
      onComplete: () => {
        this.core.setFillStyle(COLORS.RED, Data.boss.visual.core.initialAlpha);
        this.coreLight.setFillStyle(0xffffff, 0.8);
      },
    });

    // shakeOffset을 tween하여 updateMovement와 충돌하지 않도록 함
    this.scene.tweens.add({
      targets: this,
      shakeOffsetX: Phaser.Math.Between(-config.intensity, config.intensity),
      shakeOffsetY: Phaser.Math.Between(-config.intensity, config.intensity),
      duration: config.duration,
      yoyo: true,
      repeat: 1,
      onComplete: () => {
        this.shakeOffsetX = 0;
        this.shakeOffsetY = 0;
      },
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

    // 4. 게이지 파편 shattering & falling 효과
    const shardCount = 25;
    const armor = config.armor;
    const armorColor = parseInt(armor.bodyColor);

    for (let i = 0; i < shardCount; i++) {
      // 보스 주변(아머 위치)에서 랜덤하게 생성
      const angle = Math.random() * Math.PI * 2;
      const radius = Phaser.Math.Between(armor.innerRadius, armor.radius);
      const startX = this.x + Math.cos(angle) * radius;
      const startY = this.y + Math.sin(angle) * radius;

      // 파편 그래픽 (작은 삼각형/사각형)
      const shard = this.scene.add.graphics();
      shard.setDepth(1999);
      
      const size = Phaser.Math.Between(4, 12);
      // 색상 다양화: 70%는 빨간색(에너지), 30%는 어두운 아머 색상
      const isEnergy = Math.random() > 0.3;
      const color = isEnergy ? COLORS.RED : armorColor;
      const alpha = isEnergy ? 1 : 0.8;
      
      shard.fillStyle(color, alpha);
      
      // 랜덤한 다각형 파편 그리기 (3~5개 꼭짓점)
      const points = [];
      const numPoints = Phaser.Math.Between(3, 5);
      for (let j = 0; j < numPoints; j++) {
        const pAngle = (j / numPoints) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
        const pRadius = size / 2 * (0.5 + Math.random() * 0.5);
        points.push({ x: Math.cos(pAngle) * pRadius, y: Math.sin(pAngle) * pRadius });
      }
      
      shard.fillPoints(points, true);

      // 테두리 추가 (에너지 파편인 경우)
      if (isEnergy) {
        shard.lineStyle(1, 0xffffff, 0.5);
        shard.strokePoints(points, true);
      }

      shard.setPosition(startX, startY);
      shard.setRotation(Math.random() * Math.PI * 2);

      // 물리 효과 시뮬레이션 (초기 속도 + 중력)
      const velocityX = (Math.cos(angle) * 0.5 + (Math.random() - 0.5)) * Phaser.Math.Between(100, 300);
      const velocityY = (Math.sin(angle) * 0.5 + (Math.random() - 0.5)) * Phaser.Math.Between(100, 300) - 150; // 위로 더 튀게
      const gravity = 800;
      const rotationSpeed = (Math.random() - 0.5) * 15;
      const duration = Phaser.Math.Between(1000, 2000);

      this.scene.tweens.add({
        targets: shard,
        alpha: 0,
        duration: duration,
        ease: 'Cubic.easeIn',
        onUpdate: (_tween) => {
          const t = _tween.elapsed / 1000;
          // X: 등속도, Y: 중력 적용 (v0*t + 0.5*g*t^2)
          const curX = startX + velocityX * t;
          const curY = startY + velocityY * t + 0.5 * gravity * t * t;
          shard.setPosition(curX, curY);
          shard.setRotation(shard.rotation + rotationSpeed * 0.016);
        },
        onComplete: () => shard.destroy()
      });
    }

    // 5. 추가 스파크/먼지 효과 (ParticleManager 활용 가능 시)
    // GameScene에서 particleManager를 가져오거나 Boss에서 직접 생성
    // 여기서는 간단히 아머 본체 색상의 작은 점들을 추가
    for (let i = 0; i < 15; i++) {
      const angle = Math.random() * Math.PI * 2;
      const spark = this.scene.add.circle(
        this.x + Math.cos(angle) * armor.radius,
        this.y + Math.sin(angle) * armor.radius,
        2,
        0xffffff,
        0.8
      );
      spark.setDepth(2001);

      this.scene.tweens.add({
        targets: spark,
        x: spark.x + Math.cos(angle) * 100,
        y: spark.y + Math.sin(angle) * 100,
        alpha: 0,
        scale: 0,
        duration: 500,
        onComplete: () => spark.destroy()
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

  private updateMovement(_delta: number): void {
    const mov = Data.boss.movement;

    // 사인파 드리프트 직접 적용
    this.baseX = this.homeX + Math.sin(this.timeElapsed * mov.drift.xFrequency) * mov.drift.xAmplitude;
    this.baseY = this.homeY + Math.sin(this.timeElapsed * mov.drift.yFrequency) * mov.drift.yAmplitude;

    // bounds 클램프
    this.baseX = Phaser.Math.Clamp(this.baseX, mov.bounds.minX, mov.bounds.maxX);
    this.baseY = Phaser.Math.Clamp(this.baseY, mov.bounds.minY, mov.bounds.maxY);
  }

  update(delta: number): void {
    if (!this.visible || this.isDead) return;

    const config = Data.boss;
    const dangerLevel = 1 - this.hpRatio;

    // frozen 상태에서는 이동하지 않음 (시각 효과는 유지)
    if (!this.frozen) {
      this.timeElapsed += delta;
      this.updateMovement(delta);
    }

    // 코어 연출
    const corePulse =
      config.visual.core.initialAlpha +
      Math.sin(this.timeElapsed * config.visual.core.pulseSpeed * (1 + dangerLevel)) *
        config.visual.core.pulseIntensity;
    this.core.setAlpha(corePulse);
    this.core.setScale(1 + dangerLevel * 0.1);

    // 코어 내부 광원 펄스 (더 빠르게)
    const lightPulse = 0.8 + Math.sin(this.timeElapsed * config.visual.core.pulseSpeed * 2) * 0.2;
    this.coreLight.setAlpha(lightPulse);

    // 그래픽스 갱신
    this.glowGraphics.clear();
    this.armorGraphics.clear();

    this.drawGlow();
    this.drawArmor();

    // 최종 위치 = 기본 위치 + 피격 흔들림 오프셋
    this.x = this.baseX + this.shakeOffsetX;
    this.y = this.baseY + this.shakeOffsetY;

    // 위기 시 제자리 진동 (상시)
    if (dangerLevel > config.feedback.vibrationThreshold) {
      const intensity = config.feedback.vibrationIntensity * dangerLevel;
      this.x += (Math.random() - 0.5) * intensity;
      this.y += (Math.random() - 0.5) * intensity;
    }
  }

  freeze(): void {
    this.frozen = true;
  }

  unfreeze(): void {
    this.frozen = false;
  }

  private drawGlow(): void {
    const config = Data.boss.visual;
    const dangerLevel = 1 - this.hpRatio;
    const pulseFactor = 1 + Math.sin(this.timeElapsed * config.core.pulseSpeed) * 0.1;

    // 1. 코어 글로우 (여러 겹)
    if (config.core.glowLevels) {
      config.core.glowLevels.forEach((level) => {
        this.glowGraphics.fillStyle(COLORS.RED, level.alpha * pulseFactor);
        this.glowGraphics.fillCircle(0, 0, config.core.radius * level.radius * (1 + dangerLevel * 0.2));
      });
    }

    // 2. 아머 테두리 글로우
    const armor = config.armor;
    const rotation = this.timeElapsed * armor.rotationSpeed;
    const pieceAngle = (Math.PI * 2) / this.maxArmorPieces;
    const glowAlpha = (armor.glowAlpha ?? 0.4) * pulseFactor;
    const glowWidth = armor.glowWidth ?? 4;

    for (let i = 0; i < this.currentArmorCount; i++) {
      const startAngle = rotation + i * pieceAngle + armor.gap;
      const endAngle = rotation + (i + 1) * pieceAngle - armor.gap;

      const p1x = Math.cos(startAngle) * armor.innerRadius;
      const p1y = Math.sin(startAngle) * armor.innerRadius;
      const p2x = Math.cos(endAngle) * armor.innerRadius;
      const p2y = Math.sin(endAngle) * armor.innerRadius;
      const p3x = Math.cos(endAngle) * armor.radius;
      const p3y = Math.sin(endAngle) * armor.radius;
      const p4x = Math.cos(startAngle) * armor.radius;
      const p4y = Math.sin(startAngle) * armor.radius;

      // 테두리 글로우 (두꺼운 선)
      this.glowGraphics.lineStyle(glowWidth, COLORS.RED, glowAlpha);
      this.glowGraphics.strokePoints(
        [
          { x: p1x, y: p1y },
          { x: p2x, y: p2y },
          { x: p3x, y: p3y },
          { x: p4x, y: p4y },
        ],
        true
      );
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

      // 아머 본체 (어두운 색)
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

      // 아머 테두리 (핵심 선)
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

      // 아머 내부 디테일 라인
      this.armorGraphics.lineStyle(1, COLORS.RED, 0.4);
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
