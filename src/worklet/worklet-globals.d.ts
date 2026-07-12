// Типы AudioWorkletGlobalScope — их нет в lib.dom, объявляем сами.
declare const sampleRate: number;

declare class AudioWorkletProcessor {
  readonly port: MessagePort;
  constructor(options?: { processorOptions?: unknown });
}

declare function registerProcessor(
  name: string,
  processorCtor: new (options?: { processorOptions?: unknown }) => AudioWorkletProcessor,
): void;
