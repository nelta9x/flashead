/**
 * 컴포넌트 identity 토큰.
 * name이 고유 식별자, 제네릭 T가 해당 컴포넌트의 데이터 형태를 전달.
 */
export interface ComponentDef<T = unknown> {
  readonly name: string;
  /** 타입 브랜딩용. 런타임에서 사용하지 않음. */
  readonly _phantom?: T;
}

/** ComponentDef 팩토리. 타입 파라미터로 컴포넌트 형태를 지정. */
export function defineComponent<T>(name: string): ComponentDef<T> {
  return Object.freeze({ name }) as ComponentDef<T>;
}
