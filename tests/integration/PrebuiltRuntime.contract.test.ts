import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { JSDOM } from 'jsdom';
import React, { act } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const bundle = readFileSync(resolve(process.cwd(), 'resources/vendor/react-wrapper.js'), 'utf8');

describe('prebuilt Composer runtime', () => {
  let dom: JSDOM | undefined;

  afterEach(() => {
    dom?.window.close();
    dom = undefined;
  });

  it.skipIf(!React.version.startsWith('18.'))(
    'mounts a registered field and bridges its value through Livewire when the host React matches the embedded runtime',
    async () => {
      let livewireValue = 'from server';
      let morphCallback: (() => void) | undefined;
      const set = vi.fn();
      const get = vi.fn(() => livewireValue);
      const hook = vi.fn((_name: string, callback: () => void) => {
        morphCallback = callback;
      });
      const wire = { $set: set, get };

      dom = new JSDOM('<!doctype html><body></body>', {
        runScripts: 'outside-only',
        url: 'http://localhost/',
      });
      dom.window.localStorage.setItem('react-wrapper-debug', 'false');
      dom.window.Livewire = {
        find: vi.fn(() => wire),
        hook,
      } as never;
      dom.window.eval(bundle);

      const runtime = (
        dom.window as unknown as {
          FilamentReact: {
            registerComponent: (
              name: string,
              component: React.ComponentType<Record<string, unknown>>
            ) => void;
          };
        }
      ).FilamentReact;

      runtime.registerComponent('PrebuiltInput', props =>
        React.createElement(
          'button',
          {
            type: 'button',
            onClick: () => (props.onChange as (value: string) => void)('from prebuilt React'),
          },
          String(props.value ?? '')
        )
      );

      const container = dom.window.document.createElement('div');
      container.id = 'prebuilt-field';
      container.setAttribute('wire:id', 'prebuilt-livewire');
      container.innerHTML =
        '<div id="prebuilt-input" data-react-component="PrebuiltInput" ' +
        'data-react-state-path="data.content" data-react-reactive="false" ' +
        'data-react-props=\'{"isField":true,"value":"from server","errors":[]}\'></div>';
      dom.window.document.body.append(container);

      const button = await waitForElement(dom.window.document, 'button');
      await act(async () => {
        button.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
      });

      expect(set).toHaveBeenCalledWith('data.content', 'from prebuilt React', false);

      livewireValue = 'server update';
      await act(async () => morphCallback?.());
      await waitFor(() => expect(button.textContent).toBe('server update'));
    }
  );

  it('does not initialize when another runtime mode is already active', () => {
    dom = new JSDOM('<!doctype html><body></body>', {
      runScripts: 'outside-only',
      url: 'http://localhost/',
    });
    dom.window.localStorage.setItem('react-wrapper-debug', 'false');
    const error = vi.spyOn(dom.window.console, 'error').mockImplementation(() => undefined);
    dom.window.__filamentReactWrapperRuntime = {
      mode: 'vite',
      reactVersion: '19.0.0',
    };

    dom.window.eval(bundle);

    expect(error).toHaveBeenCalledWith(
      expect.stringContaining('Refusing to initialize a prebuilt runtime')
    );
    expect(dom.window.__filamentReactWrapperRuntime).toEqual({
      mode: 'vite',
      reactVersion: '19.0.0',
    });
    expect(dom.window.FilamentReact).toBeUndefined();
  });
});

async function waitForElement(
  document: JSDOM['window']['document'],
  selector: string
): Promise<HTMLElement> {
  await waitFor(() => expect(document.querySelector(selector)).not.toBeNull());
  return document.querySelector(selector) as HTMLElement;
}

async function waitFor(assertion: () => void, timeout = 1000): Promise<void> {
  const started = Date.now();

  while (true) {
    try {
      assertion();
      return;
    } catch (error) {
      if (Date.now() - started >= timeout) throw error;
      await new Promise(resolvePromise => setTimeout(resolvePromise, 10));
    }
  }
}
