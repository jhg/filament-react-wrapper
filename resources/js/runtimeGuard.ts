import { version as reactVersion } from 'react';

export type ReactWrapperRuntimeMode = 'prebuilt' | 'vite' | 'unknown';

export interface ReactWrapperRuntimeInfo {
  mode: ReactWrapperRuntimeMode;
  reactVersion: string;
}

declare const __REACT_WRAPPER_RUNTIME_MODE__: ReactWrapperRuntimeMode | undefined;

const runtimeMode: ReactWrapperRuntimeMode =
  typeof __REACT_WRAPPER_RUNTIME_MODE__ === 'undefined'
    ? 'unknown'
    : __REACT_WRAPPER_RUNTIME_MODE__;

export const runtimeInfo: ReactWrapperRuntimeInfo = {
  mode: runtimeMode,
  reactVersion,
};

const runtimeMarker = '__filamentReactWrapperRuntime';
const existingRuntime =
  typeof window !== 'undefined'
    ? (window as unknown as Record<string, ReactWrapperRuntimeInfo | undefined>)[runtimeMarker]
    : undefined;

export const runtimeCanInitialize =
  !existingRuntime || existingRuntime.mode === 'unknown' || runtimeMode === 'unknown'
    ? true
    : existingRuntime.mode === runtimeMode;

const getReactMajor = (version: string): number | undefined => {
  const major = Number.parseInt(version.split('.')[0] ?? '', 10);
  return Number.isFinite(major) ? major : undefined;
};

const hasDifferentReactMajor =
  runtimeCanInitialize &&
  existingRuntime &&
  existingRuntime.mode === runtimeMode &&
  getReactMajor(existingRuntime.reactVersion) !== undefined &&
  getReactMajor(existingRuntime.reactVersion) !== getReactMajor(reactVersion);

if (typeof window !== 'undefined') {
  if (!existingRuntime) {
    (window as unknown as Record<string, ReactWrapperRuntimeInfo>)[runtimeMarker] = runtimeInfo;
  } else if (!runtimeCanInitialize) {
    console.error(
      `[Filament React Wrapper] Refusing to initialize a ${runtimeMode} runtime because a ${existingRuntime.mode} runtime is already active. ` +
        'Load only one runtime mode per page; use REACT_WRAPPER_ASSET_MODE=vite for application-owned React components.'
    );
  } else if (hasDifferentReactMajor) {
    console.warn(
      `[Filament React Wrapper] Multiple ${runtimeMode} runtimes use different React major versions ` +
        `(${existingRuntime.reactVersion} and ${reactVersion}). Keep one application React major per page ` +
        'unless the islands are intentionally isolated.'
    );
  }
}
