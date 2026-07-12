// Накопитель PCM-чанков для записи WAV — чистая логика рекордер-процессора.
export class RecorderCore {
  recording = false;
  private chunks: Float32Array[] = [];

  start(): void {
    this.recording = true;
    this.chunks = [];
  }

  push(chunk: Float32Array): void {
    if (this.recording) this.chunks.push(new Float32Array(chunk));
  }

  /** Останавливает запись и возвращает склеенный буфер. */
  stop(): Float32Array {
    this.recording = false;
    const totalLength = this.chunks.reduce((acc, c) => acc + c.length, 0);
    const result = new Float32Array(totalLength);
    let offset = 0;
    for (const chunk of this.chunks) {
      result.set(chunk, offset);
      offset += chunk.length;
    }
    this.chunks = [];
    return result;
  }
}
