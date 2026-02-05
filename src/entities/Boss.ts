import Phaser from 'phaser';
import { COLORS } from '../data/constants';
import { EventBus, GameEvents } from '../utils/EventBus';

export class Boss extends Phaser.GameObjects.Container {
  private core: Phaser.GameObjects.Arc;
  private armorGraphics: Phaser.GameObjects.Graphics;
  private rings: Phaser.GameObjects.Graphics;
  private hpGauge: Phaser.GameObjects.Graphics;
  private hpRatio: number = 1;
  private timeElapsed: number = 0;
  private isDead: boolean = false;
  
  // 아머 설정
  private readonly maxArmorPieces = 6;
  private currentArmorCount = 6;
  
  // 링 설정
  private ringConfigs = [
    { radius: 85, speed: 0.0015, segments: 2, gap: 0.6 }
  ];

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);

    // 중앙 코어 생성
    this.core = scene.add.arc(0, 0, 30, 0, 360, false, COLORS.RED, 0.8);
    this.add(this.core);

    // 아머를 그릴 그래픽스
    this.armorGraphics = scene.add.graphics();
    this.add(this.armorGraphics);

    // 링을 그릴 그래픽스
    this.rings = scene.add.graphics();
    this.add(this.rings);

    // HP 게이지 그래픽스
    this.hpGauge = scene.add.graphics();
    this.add(this.hpGauge);

    this.setVisible(false);
    this.setAlpha(0);

    scene.add.existing(this);
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    EventBus.getInstance().on(GameEvents.MONSTER_HP_CHANGED, (...args: any[]) => {
      const data = args[0] as { ratio: number };
      const oldArmorCount = this.currentArmorCount;
      this.hpRatio = data.ratio;
      
      // HP 비율에 따른 아머 개수 계산 (6개 파츠)
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
    this.isDead = false;
    this.hpRatio = 1;
    this.currentArmorCount = this.maxArmorPieces;
    this.setVisible(true);
    
    this.scene.tweens.add({
      targets: this,
      alpha: 1,
      scale: { from: 0.5, to: 1 },
      duration: 1000,
      ease: 'Back.easeOut'
    });
  }

  private onDamage(): void {
    if (this.isDead) return;

    this.scene.tweens.add({
      targets: this.core,
      fillAlpha: 1,
      duration: 50,
      yoyo: true,
      onStart: () => {
        this.core.setFillStyle(0xffffff);
      },
      onComplete: () => {
        this.core.setFillStyle(COLORS.RED, 0.8);
      }
    });

    this.scene.tweens.add({
      targets: this,
      x: this.x + Phaser.Math.Between(-3, 3),
      y: this.y + Phaser.Math.Between(-3, 3),
      duration: 50,
      yoyo: true,
      repeat: 1
    });
  }

  private onArmorBreak(): void {
    // 아머 파편이 튀는 듯한 연출 (화면 흔들림 및 짧은 슬로우)
    this.scene.cameras.main.shake(150, 0.005);
    
    // 파손 위치에서 파티클 효과 (대략적인 위치)
    const angle = Math.random() * Math.PI * 2;
    const px = Math.cos(angle) * 50;
    const py = Math.sin(angle) * 50;
    
    // 단순 원형 파티클 조각들 생성
    for (let i = 0; i < 5; i++) {
      const chunk = this.scene.add.arc(this.x + px, this.y + py, 4, 0, 360, false, COLORS.RED, 1);
      this.scene.tweens.add({
        targets: chunk,
        x: chunk.x + (Math.random() - 0.5) * 100,
        y: chunk.y + (Math.random() - 0.5) * 100,
        alpha: 0,
        scale: 0,
        duration: 500,
        onComplete: () => chunk.destroy()
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
      }
    });
  }

  update(delta: number): void {
    if (!this.visible || this.isDead) return;

    this.timeElapsed += delta;
    const dangerLevel = 1 - this.hpRatio;
    
    // 코어 연출
    const corePulse = 0.8 + Math.sin(this.timeElapsed * 0.01 * (1 + dangerLevel)) * 0.2;
    this.core.setAlpha(corePulse);
    this.core.setScale(1 + dangerLevel * 0.1);

    // 아머 및 링 그리기
    this.armorGraphics.clear();
    this.rings.clear();
    this.hpGauge.clear();
    
    this.drawArmor();
    this.drawHPGauge();
    
    // 링 연출 (항상 1개)
    const config = this.ringConfigs[0];
    const speedMult = 1 + dangerLevel;
    const rotation = this.timeElapsed * config.speed * speedMult;
    this.drawRing(config.radius, rotation, config.segments, config.gap, dangerLevel);
    
    if (dangerLevel > 0.6) {
      this.x += (Math.random() - 0.5) * dangerLevel * 2;
      this.y += (Math.random() - 0.5) * dangerLevel * 2;
    }
  }

  private drawArmor(): void {
    const radius = 55;
    const innerRadius = 40;
    const rotation = this.timeElapsed * 0.0005; // 아머도 천천히 회전
    
    const pieceAngle = (Math.PI * 2) / this.maxArmorPieces;
    const gap = 0.1; // 조각 사이 간격
    
    for (let i = 0; i < this.currentArmorCount; i++) {
      const startAngle = rotation + i * pieceAngle + gap;
      const endAngle = rotation + (i + 1) * pieceAngle - gap;
      
      const p1x = Math.cos(startAngle) * innerRadius;
      const p1y = Math.sin(startAngle) * innerRadius;
      const p2x = Math.cos(endAngle) * innerRadius;
      const p2y = Math.sin(endAngle) * innerRadius;
      const p3x = Math.cos(endAngle) * radius;
      const p3y = Math.sin(endAngle) * radius;
      const p4x = Math.cos(startAngle) * radius;
      const p4y = Math.sin(startAngle) * radius;

      // 아머 본체 (어두운 빨강)
      this.armorGraphics.fillStyle(0x440000, 0.9);
      this.armorGraphics.fillPoints([
        { x: p1x, y: p1y },
        { x: p2x, y: p2y },
        { x: p3x, y: p3y },
        { x: p4x, y: p4y }
      ], true);

      // 아머 테두리 (밝은 빨강)
      this.armorGraphics.lineStyle(2, COLORS.RED, 1);
      this.armorGraphics.strokePoints([
        { x: p1x, y: p1y },
        { x: p2x, y: p2y },
        { x: p3x, y: p3y },
        { x: p4x, y: p4y }
      ], true);
      
      // 아머 내부 글로우 라인
      this.armorGraphics.lineStyle(1, COLORS.RED, 0.3);
      const midRadius = (radius + innerRadius) / 2;
      this.armorGraphics.beginPath();
      this.armorGraphics.arc(0, 0, midRadius, Phaser.Math.RadToDeg(startAngle), Phaser.Math.RadToDeg(endAngle));
      this.armorGraphics.strokePath();
    }
  }

  private drawHPGauge(): void {
    const radius = 105; // 링보다 약간 바깥쪽
    const thickness = 4;
    
    // 배경 (어두운 가이드 라인)
    this.hpGauge.lineStyle(thickness, 0xffffff, 0.1);
    this.hpGauge.strokeCircle(0, 0, radius);

    if (this.hpRatio <= 0) return;

    // 실제 HP 바 (빨간색 아크)
    // 12시 방향부터 시작하도록 -90도 오프셋
    const startAngle = -90;
    const endAngle = startAngle + 360 * this.hpRatio;

    // HP가 낮을수록 더 밝게 빛남
    const color = this.hpRatio < 0.3 ? 0xff0000 : COLORS.RED;
    const alpha = 0.8;

    this.hpGauge.lineStyle(thickness, color, alpha);
    this.hpGauge.beginPath();
    this.hpGauge.arc(0, 0, radius, Phaser.Math.DegToRad(startAngle), Phaser.Math.DegToRad(endAngle), false);
    this.hpGauge.strokePath();

    // 게이지 끝부분 포인트 효과
    const pointX = Math.cos(Phaser.Math.DegToRad(endAngle)) * radius;
    const pointY = Math.sin(Phaser.Math.DegToRad(endAngle)) * radius;
    this.hpGauge.fillStyle(0xffffff, 0.8);
    this.hpGauge.fillCircle(pointX, pointY, 3);
    
    // 글로우 효과
    this.hpGauge.lineStyle(thickness * 2, color, 0.3);
    this.hpGauge.beginPath();
    this.hpGauge.arc(0, 0, radius, Phaser.Math.DegToRad(startAngle), Phaser.Math.DegToRad(endAngle), false);
    this.hpGauge.strokePath();
  }

  private drawRing(radius: number, rotation: number, segments: number, gap: number, dangerLevel: number): void {
    const color = COLORS.RED;
    const alpha = 0.3 + (1 - this.hpRatio) * 0.3;
    const thickness = 3 + dangerLevel * 3;

    this.rings.lineStyle(thickness, color, alpha);

    const segmentAngle = (Math.PI * 2) / segments;
    const gapAngle = segmentAngle * gap;
    const drawAngle = segmentAngle - gapAngle;

    for (let i = 0; i < segments; i++) {
      const startAngle = rotation + i * segmentAngle;
      
      this.rings.beginPath();
      this.rings.arc(0, 0, radius, Phaser.Math.RadToDeg(startAngle), Phaser.Math.RadToDeg(startAngle + drawAngle));
      this.rings.strokePath();
      
      // 글로우
      this.rings.lineStyle(thickness * 2, color, alpha * 0.3);
      this.rings.beginPath();
      this.rings.arc(0, 0, radius, Phaser.Math.RadToDeg(startAngle), Phaser.Math.RadToDeg(startAngle + drawAngle));
      this.rings.strokePath();
      
      this.rings.lineStyle(thickness, color, alpha);
    }
  }
}