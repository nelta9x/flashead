import Phaser from 'phaser';
import type { ServicePlugin } from '../../types/SystemPlugin';
import type { ServiceEntry } from '../../ServiceRegistry';
import { DEPTHS } from '../../../data/constants';
import { Data } from '../../../data/DataManager';
import { AbilityManager } from '../../../systems/AbilityManager';
import { ComboSystem } from './ComboSystem';
import { HealthSystem } from '../../../systems/HealthSystem';
import { MonsterSystem } from './MonsterSystem';
import { StatusEffectManager } from '../../../systems/StatusEffectManager';
import { ParticleManager } from '../../../effects/ParticleManager';
import { ScreenShake } from '../../../systems/ScreenShake';
import { DamageText } from '../../../ui/DamageText';
import { CursorTrail } from '../entities/CursorTrail';
import { SoundSystem } from './SoundSystem';
import { FeedbackSystem } from './FeedbackSystem';
import { GaugeSystem } from './GaugeSystem';
import { CursorRenderer } from '../entities/CursorRenderer';
import { OrbRenderer } from '../abilities/OrbRenderer';
import { BlackHoleRenderer } from '../abilities/BlackHoleRenderer';
import { BossShatterEffect } from '../entities/BossShatterEffect';
import { AbilityDataRepository } from './abilities/AbilityDataRepository';
import { AbilityProgressionService } from './abilities/AbilityProgressionService';
import { AbilityRuntimeQueryService } from './abilities/AbilityRuntimeQueryService';
import { AbilityPresentationService } from './abilities/AbilityPresentationService';

export class CoreServicesPlugin implements ServicePlugin {
  readonly id = 'core:services';
  readonly services: ServiceEntry[] = [
    // auto-inject (no deps)
    ComboSystem,
    {
      key: AbilityDataRepository,
      factory: () => new AbilityDataRepository(),
    },
    {
      key: AbilityProgressionService,
      factory: (r) => new AbilityProgressionService(r.get(AbilityDataRepository)),
    },
    {
      key: AbilityRuntimeQueryService,
      factory: (r) => new AbilityRuntimeQueryService(
        r.get(AbilityManager),
        r.get(AbilityProgressionService),
        r.get(AbilityDataRepository),
      ),
    },
    {
      key: AbilityPresentationService,
      factory: (r) => new AbilityPresentationService(
        r.get(AbilityProgressionService),
        r.get(AbilityDataRepository),
        r.get(AbilityManager),
      ),
    },
    HealthSystem,
    MonsterSystem,
    StatusEffectManager,

    // custom factory (singleton — needed before ParticleManager)
    {
      key: SoundSystem,
      factory: (r) => {
        const s = SoundSystem.getInstance();
        s.setScene(r.get(Phaser.Scene));
        return s;
      },
    },

    // auto-inject / custom factory (inject = [Phaser.Scene])
    {
      key: ParticleManager,
      factory: (r) => new ParticleManager(r.get(Phaser.Scene), undefined, r.get(SoundSystem), new BossShatterEffect(r.get(Phaser.Scene))),
    },
    ScreenShake,
    DamageText,
    CursorTrail,

    // auto-inject (complex deps)
    FeedbackSystem,
    GaugeSystem,

    // custom factory (post-init)
    {
      key: CursorRenderer,
      factory: (r) => {
        const cr = new CursorRenderer(r.get(Phaser.Scene));
        cr.setDepth(DEPTHS.cursor);
        return cr;
      },
    },
    {
      key: OrbRenderer,
      factory: (r) => {
        const renderer = new OrbRenderer(r.get(Phaser.Scene));
        renderer.setDepth(DEPTHS.orb);
        return renderer;
      },
    },
    {
      key: BlackHoleRenderer,
      factory: (r) => {
        const renderer = new BlackHoleRenderer(r.get(Phaser.Scene));
        renderer.setDepth(Data.gameConfig.blackHoleVisual.depth);
        return renderer;
      },
    },
  ];
}
