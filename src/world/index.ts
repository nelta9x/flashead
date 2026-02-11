export { ComponentStore } from './ComponentStore';
export type { ComponentDef } from './ComponentDef';
export { defineComponent } from './ComponentDef';
export { World } from './World';
export { ArchetypeRegistry, registerBuiltinArchetypes, BUILTIN_ARCHETYPES } from './archetypes';
export type { ArchetypeDefinition } from './archetypes';
export {
  C_Identity,
  C_Transform,
  C_Health,
  C_StatusCache,
  C_Lifetime,
  C_DishProps,
  C_CursorInteraction,
  C_VisualState,
  C_Movement,
  C_PhaserNode,
  C_BossBehavior,
  C_PlayerInput,
  C_PlayerRender,
} from './components';
export type {
  IdentityComponent,
  TransformComponent,
  HealthComponent,
  StatusCacheComponent,
  LifetimeComponent,
  DishPropsComponent,
  CursorInteractionComponent,
  VisualStateComponent,
  MovementComponent,
  PhaserNodeComponent,
  BossBehaviorComponent,
  PlayerInputComponent,
  PlayerRenderComponent,
} from './components';
