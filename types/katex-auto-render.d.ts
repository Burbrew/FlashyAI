// types/katex-auto-render.d.ts
declare module 'katex/dist/contrib/auto-render' {
    export default function renderMathInElement(
      element: HTMLElement,
      options?: {
        delimiters?: { left: string; right: string; display: boolean }[];
        throwOnError?: boolean;
        errorColor?: string;
        macros?: { [key: string]: string };
        fleqn?: boolean;
        leqno?: boolean;
        trust?: boolean;
        strict?: boolean | string | ((errorCode: string, errorMsg: string) => boolean);
      }
    ): void;
  }
  