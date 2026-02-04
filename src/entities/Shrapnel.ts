import Phaser from 'phaser';
import { COLORS, SHRAPNEL } from '../config/constants';
import { Poolable } from '../utils/ObjectPool';
import { EventBus, GameEvents } from '../utils/EventBus';
import { Dish } from './Dish';

export class Shrapnel extends Phaser.GameObjects.Container implements Poolable {
  active: boolean = false;
  private graphics: Phaser.GameObjects.Graphics;
  private target: Dish | null = null;
  private speed: number = SHRAPNEL.BASE_SPEED;
  private damage: number = SHRAPNEL.BASE_DAMAGE;
  private lifetime: number = SHRAPNEL.LIFETIME;
  private elapsedTime: number = 0;
  private velocityX: number = 0;
  private velocityY: number = 0;
  private color: number = COLORS.CYAN;
  private rotation_angle: number = 0;
  private isChainShrapnel: boolean = false;

  constructor(scene: Phaser.Scene) {
    super(scene, 0, 0);
    scene.add.existing(this);

    this.graphics = scene.add.graphics();
    this.add(this.graphics);

    this.setVisible(false);
    this.setActive(false);
  }

  reset(): void {
    this.target = null;
    this.elapsedTime = 0;
    this.velocityX = 0;
    this.velocityY = 0;
    this.rotation_angle = 0;
    this.isChainShrapnel = false;
    this.setVisible(true);
    this.setActive(true);
    this.setAlpha(1);
    this.setScale(1);
  }

  spawn(
    x: number,
    y: number,
    target: Dish | null,
    color: number,
    damageBonus: number = 0,
    isChainShrapnel: boolean = false
  ): void {
    this.setPosition(x, y);
    this.target = target;
    this.color = color;
    this.damage = SHRAPNEL.BASE_DAMAGE + damageBonus;
    this.speed = SHRAPNEL.BASE_SPEED;
    this.lifetime = SHRAPNEL.LIFETIME;
    this.elapsedTime = 0;
    this.isChainShrapnel = isChainShrapnel;
    this.active = true;

    // 초기 방향 설정 (타겟이 있으면 타겟 방향, 없으면 랜덤)
    if (target && target.active) {
      const dx = target.x - x;
      const dy = target.y - y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 0) {
        this.velocityX = (dx / dist) * this.speed;
        this.velocityY = (dy / dist) * this.speed;
        this.rotation_angle = Math.atan2(dy, dx);
      }
    } else {
      // 랜덤 방향
      const angle = Math.random() * Math.PI * 2;
      this.velocityX = Math.cos(angle) * this.speed;
      this.velocityY = Math.sin(angle) * this.speed;
      this.rotation_angle = angle;
    }

    this.draw();
  }

  update(delta: number): void {
    if (!this.active) return;

    this.elapsedTime += delta;

    // 생존 시간 초과 시 비활성화
    if (this.elapsedTime >= this.lifetime) {
      this.deactivate();
      return;
    }

    // 유도 로직 (타겟이 유효하면)
    if (this.target && this.target.active) {
      const dx = this.target.x - this.x;
      const dy = this.target.y - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > 0) {
        // 타겟 방향
        const targetAngle = Math.atan2(dy, dx);

        // 현재 방향
        const currentAngle = Math.atan2(this.velocityY, this.velocityX);

        // 각도 차이 계산 (최단 경로)
        let angleDiff = targetAngle - currentAngle;
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

        // 유도 강도만큼 회전
        const newAngle = currentAngle + angleDiff * SHRAPNEL.HOMING_STRENGTH;

        this.velocityX = Math.cos(newAngle) * this.speed;
        this.velocityY = Math.sin(newAngle) * this.speed;
        this.rotation_angle = newAngle;

        // 충돌 체크
        const hitDistance = SHRAPNEL.SIZE + this.target.getSize();
        if (dist <= hitDistance) {
          this.onHitTarget();
          return;
        }
      }
    }

    // 위치 업데이트
    const deltaSeconds = delta / 1000;
    this.x += this.velocityX * deltaSeconds;
    this.y += this.velocityY * deltaSeconds;

    // 화면 밖으로 나가면 비활성화
    if (this.x < -50 || this.x > 1330 || this.y < -50 || this.y > 770) {
      this.deactivate();
      return;
    }

    this.draw();
  }

  private onHitTarget(): void {
    if (!this.target || !this.target.active) {
      this.deactivate();
      return;
    }

    // 데미지 적용
    this.target.applyDamage(this.damage);

    // 파편 히트 이벤트 발생
    EventBus.getInstance().emit(GameEvents.SHRAPNEL_HIT, {
      x: this.x,
      y: this.y,
      color: this.color,
      target: this.target,
      isChainShrapnel: this.isChainShrapnel,
    });

    this.deactivate();
  }

  private draw(): void {
    this.graphics.clear();

    // 글로우 효과
    this.graphics.fillStyle(this.color, 0.3);
    this.graphics.fillCircle(0, 0, SHRAPNEL.SIZE + 4);

    // 삼각형 파편 (회전 적용)
    const size = SHRAPNEL.SIZE;
    const cos = Math.cos(this.rotation_angle);
    const sin = Math.sin(this.rotation_angle);

    // 삼각형 꼭짓점 (뾰족한 부분이 앞)
    const points = [
      { x: size * 1.5, y: 0 },           // 앞 (뾰족)
      { x: -size * 0.8, y: -size * 0.6 }, // 뒤 왼쪽
      { x: -size * 0.8, y: size * 0.6 },  // 뒤 오른쪽
    ];

    // 회전 적용
    const rotatedPoints = points.map(p => ({
      x: p.x * cos - p.y * sin,
      y: p.x * sin + p.y * cos,
    }));

    // 삼각형 그리기
    this.graphics.fillStyle(this.color, 0.9);
    this.graphics.beginPath();
    this.graphics.moveTo(rotatedPoints[0].x, rotatedPoints[0].y);
    this.graphics.lineTo(rotatedPoints[1].x, rotatedPoints[1].y);
    this.graphics.lineTo(rotatedPoints[2].x, rotatedPoints[2].y);
    this.graphics.closePath();
    this.graphics.fillPath();

    // 외곽선
    this.graphics.lineStyle(2, COLORS.WHITE, 0.8);
    this.graphics.beginPath();
    this.graphics.moveTo(rotatedPoints[0].x, rotatedPoints[0].y);
    this.graphics.lineTo(rotatedPoints[1].x, rotatedPoints[1].y);
    this.graphics.lineTo(rotatedPoints[2].x, rotatedPoints[2].y);
    this.graphics.closePath();
    this.graphics.strokePath();
  }

  deactivate(): void {
    this.active = false;
    this.target = null;
    this.setVisible(false);
    this.setActive(false);
  }

  getColor(): number {
    return this.color;
  }

  isChain(): boolean {
    return this.isChainShrapnel;
  }
}
