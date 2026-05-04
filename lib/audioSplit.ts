"use client";

export type AudioChunk = {
  blob: Blob;
  index: number;
  startOffset: number;
};

const TARGET_SAMPLE_RATE = 16000;
const TARGET_CHANNELS = 1;
const MAX_WAV_CHUNK_BYTES = Math.floor(3.5 * 1024 * 1024);
const WAV_HEADER_BYTES = 44;
const BYTES_PER_SAMPLE = 2;
const BYTES_PER_SECOND =
  TARGET_SAMPLE_RATE * TARGET_CHANNELS * BYTES_PER_SAMPLE;
const MAX_CHUNK_SECONDS_BY_SIZE = Math.max(
  1,
  Math.floor((MAX_WAV_CHUNK_BYTES - WAV_HEADER_BYTES) / BYTES_PER_SECOND)
);

function getAudioContextConstructor() {
  return window.AudioContext || (window as typeof window & {
    webkitAudioContext?: typeof AudioContext;
  }).webkitAudioContext;
}

function mixToMono(buffer: AudioBuffer, context: BaseAudioContext) {
  if (buffer.numberOfChannels === 1) {
    return buffer;
  }

  const monoBuffer = context.createBuffer(1, buffer.length, buffer.sampleRate);
  const monoChannel = monoBuffer.getChannelData(0);

  for (let channelIndex = 0; channelIndex < buffer.numberOfChannels; channelIndex += 1) {
    const channelData = buffer.getChannelData(channelIndex);
    for (let sampleIndex = 0; sampleIndex < channelData.length; sampleIndex += 1) {
      monoChannel[sampleIndex] += channelData[sampleIndex] / buffer.numberOfChannels;
    }
  }

  return monoBuffer;
}

function audioBufferToWavBlob(buffer: AudioBuffer) {
  const samples = buffer.getChannelData(0);
  const pcmBuffer = new ArrayBuffer(WAV_HEADER_BYTES + samples.length * BYTES_PER_SAMPLE);
  const view = new DataView(pcmBuffer);

  const writeString = (offset: number, value: string) => {
    for (let i = 0; i < value.length; i += 1) {
      view.setUint8(offset + i, value.charCodeAt(i));
    }
  };

  writeString(0, "RIFF");
  view.setUint32(4, 36 + samples.length * BYTES_PER_SAMPLE, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, TARGET_CHANNELS, true);
  view.setUint32(24, TARGET_SAMPLE_RATE, true);
  view.setUint32(28, BYTES_PER_SECOND, true);
  view.setUint16(32, TARGET_CHANNELS * BYTES_PER_SAMPLE, true);
  view.setUint16(34, 16, true);
  writeString(36, "data");
  view.setUint32(40, samples.length * BYTES_PER_SAMPLE, true);

  let offset = WAV_HEADER_BYTES;
  for (let i = 0; i < samples.length; i += 1) {
    const sample = Math.max(-1, Math.min(1, samples[i] || 0));
    view.setInt16(
      offset,
      sample < 0 ? sample * 0x8000 : sample * 0x7fff,
      true
    );
    offset += BYTES_PER_SAMPLE;
  }

  return new Blob([pcmBuffer], { type: "audio/wav" });
}

export async function encodeWavFromAudioBuffer(
  buffer: AudioBuffer,
  startSecond: number,
  endSecond: number
) {
  const duration = Math.max(0, endSecond - startSecond);
  const frameCount = Math.max(1, Math.ceil(duration * TARGET_SAMPLE_RATE));
  const offlineContext = new OfflineAudioContext(
    TARGET_CHANNELS,
    frameCount,
    TARGET_SAMPLE_RATE
  );
  const source = offlineContext.createBufferSource();
  source.buffer = buffer;
  source.connect(offlineContext.destination);
  source.start(0, startSecond, duration);

  const renderedBuffer = await offlineContext.startRendering();
  return audioBufferToWavBlob(renderedBuffer);
}

export async function splitAudioToWavChunks(
  fileOrBlob: Blob,
  chunkSeconds = 60
): Promise<AudioChunk[]> {
  const AudioContextConstructor = getAudioContextConstructor();
  if (!AudioContextConstructor) {
    throw new Error("无法处理该音频格式，请换成 MP3 或 WAV。");
  }

  const audioContext = new AudioContextConstructor();

  try {
    const arrayBuffer = await fileOrBlob.arrayBuffer();
    const decodedBuffer = await audioContext.decodeAudioData(arrayBuffer.slice(0));
    const monoBuffer = mixToMono(decodedBuffer, audioContext);
    const effectiveChunkSeconds = Math.min(
      Math.max(1, chunkSeconds),
      MAX_CHUNK_SECONDS_BY_SIZE
    );
    const chunks: AudioChunk[] = [];

    for (
      let startOffset = 0, index = 0;
      startOffset < monoBuffer.duration;
      startOffset += effectiveChunkSeconds, index += 1
    ) {
      const endOffset = Math.min(
        monoBuffer.duration,
        startOffset + effectiveChunkSeconds
      );
      const blob = await encodeWavFromAudioBuffer(
        monoBuffer,
        startOffset,
        endOffset
      );

      chunks.push({
        blob,
        index,
        startOffset,
      });
    }

    return chunks;
  } catch {
    throw new Error("无法处理该音频格式，请换成 MP3 或 WAV。");
  } finally {
    void audioContext.close();
  }
}

