/**
 * Component Registry Interface - defines contract for component management
 * Following Interface Segregation Principle
 */

import React from 'react';

export type ComponentProps = Record<string, unknown>;
export type ReactComponent = React.ElementType;
export type ComponentCallback = (...args: unknown[]) => unknown;

export interface IComponentDefinition {
  name: string;
  component: ReactComponent | (() => Promise<{ default: ReactComponent }>);
  isAsync?: boolean;
  defaultProps?: ComponentProps;
  propTypes?: ComponentProps;
  config?: IComponentConfig;
  metadata?: IComponentMetadata;
}

export interface IComponentConfig {
  lazy?: boolean;
  cache?: boolean;
  ssr?: boolean;
  preload?: boolean;
  wrapper?: string | ReactComponent;
  middleware?: Array<IComponentMiddleware>;
  dependencies?: string[];
  version?: string;
}

export interface IComponentMetadata {
  description?: string;
  category?: string;
  tags?: string[];
  author?: string;
  docs?: string;
  examples?: Array<{
    name: string;
    props: ComponentProps;
    description?: string;
  }>;
}

export type IComponentMiddleware = (
  component: ReactComponent,
  props: ComponentProps,
  context: IComponentContext
) => ReactComponent | Promise<ReactComponent>;

export interface IComponentContext {
  registry: IComponentRegistry;
  hooks: IHookManager;
  config: IComponentConfig;
  metadata: IComponentMetadata;
}

export interface IHookManager {
  addHook(event: string, callback: ComponentCallback, priority?: number): void;
  removeHook(event: string, callback: ComponentCallback): void;
  executeHooks(event: string, data?: unknown): unknown;
}

export interface IComponentRegistry {
  register(definition: IComponentDefinition): void;
  subscribe(listener: () => void): () => void;
  get(name: string): IComponentDefinition | undefined;
  create(name: string, props?: ComponentProps): ReactComponent | null;
  has(name: string): boolean;
  unregister(name: string): boolean;
  clear(): void;
  getComponentNames(): string[];
  getStats(): {
    totalComponents: number;
    categoryCounts: Record<string, number>;
    tagCounts: Record<string, number>;
  };
  mount(componentName: string, containerId: string, props?: ComponentProps): void;
  unmount(containerId: string): void;
}

export interface IEventSystem {
  on(event: string, callback: ComponentCallback, priority?: number): void;
  off(event: string, callback: ComponentCallback): void;
  emit(event: string, data?: unknown): unknown;
  hasListeners(event: string): boolean;
}
