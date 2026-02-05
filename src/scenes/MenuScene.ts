import Phaser from 'phaser';
import { COLORS, COLORS_HEX, GAME_WIDTH, GAME_HEIGHT, FONTS } from '../config/constants';
import { SoundSystem } from '../systems/SoundSystem';

export class MenuScene extends Phaser.Scene {
  private titleText!: Phaser.GameObjects.Text;
  private startPrompt!: Phaser.GameObjects.Text;
  private isTransitioning: boolean = false;

  constructor() {
    super({ key: 'MenuScene' });
  }

  create(): void {
    this.createBackground();
    this.createTitle();
    
    // 입력을 감지하기 위한 이벤트 리스너 등록
    this.setupInputHandlers();
  }

  private createBackground(): void {
    // 그리드 배경 (기존 유지하되 더 어둡고 정적인 느낌으로)
    const graphics = this.add.graphics();
    graphics.lineStyle(1, COLORS.CYAN, 0.05);

    const gridSize = 50;
    for (let x = 0; x < GAME_WIDTH; x += gridSize) {
      graphics.moveTo(x, 0);
      graphics.lineTo(x, GAME_HEIGHT);
    }
    for (let y = 0; y < GAME_HEIGHT; y += gridSize) {
      graphics.moveTo(0, y);
      graphics.lineTo(GAME_WIDTH, y);
    }
    graphics.strokePath();
  }

  private createTitle(): void {
    // 메인 타이틀
    this.titleText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 20, 'VIBESHOOTER', {
      fontFamily: FONTS.MAIN,
      fontSize: '84px',
      color: COLORS_HEX.CYAN,
      stroke: COLORS_HEX.WHITE,
      strokeThickness: 2,
    });
    this.titleText.setOrigin(0.5);

    // 은은한 글로우/애니메이션
    this.tweens.add({
      targets: this.titleText,
      y: GAME_HEIGHT / 2 - 30,
      duration: 2000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // 시작 안내 텍스트 (작고 희미하게)
    this.startPrompt = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 60, 'PRESS ANY KEY OR MOVE MOUSE', {
      fontFamily: FONTS.MAIN,
      fontSize: '18px',
      color: COLORS_HEX.WHITE,
    });
    this.startPrompt.setOrigin(0.5);
    this.startPrompt.setAlpha(0.4);

    this.tweens.add({
      targets: this.startPrompt,
      alpha: 0.1,
      duration: 1000,
      yoyo: true,
      repeat: -1,
    });
  }

  private setupInputHandlers(): void {
    // 아무 키나 입력
    this.input.keyboard?.on('keydown', () => this.startGame());
    
    // 마우스 클릭
    this.input.on('pointerdown', () => this.startGame());
    
    // 마우스 움직임 감지 (감도 조절을 위해 일정 거리 이상 움직였을 때 시작)
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (pointer.velocity.length() > 10) {
        this.startGame();
      }
    });
  }

  private startGame(): void {
    if (this.isTransitioning) return;
    this.isTransitioning = true;

    // 사운드 시스템 활성화 (브라우저 정책 대응)
    SoundSystem.getInstance().init();

    // 시작 시 강렬한 효과
    this.tweens.add({
      targets: [this.titleText, this.startPrompt],
      scaleX: 1.5,
      scaleY: 1.5,
      alpha: 0,
      duration: 400,
      ease: 'Power2',
      onComplete: () => {
        this.scene.start('GameScene');
      }
    });

    this.cameras.main.fadeOut(400, 0, 0, 0);
  }
}