// Decodes a recorded audio Blob (whatever format MediaRecorder produced,
// typically webm/opus) and resamples it to 16kHz mono — the exact format
// Whisper's ONNX pipeline expects as raw input.

export async function blobToWhisperInput(blob: Blob): Promise<Float32Array> {
  const arrayBuffer = await blob.arrayBuffer();

  // Decode at the recording's native sample rate first.
  const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const decodeCtx = new AudioCtx();
  const decoded = await decodeCtx.decodeAudioData(arrayBuffer);
  decodeCtx.close();

  // Re-render through an OfflineAudioContext at 16kHz mono — this is the
  // standard, correct way to resample audio in-browser (avoids writing
  // manual interpolation resampling code).
  const targetSampleRate = 16000;
  const offlineCtx = new OfflineAudioContext(
    1,
    Math.ceil(decoded.duration * targetSampleRate),
    targetSampleRate
  );
  const source = offlineCtx.createBufferSource();
  source.buffer = decoded;
  source.connect(offlineCtx.destination);
  source.start(0);

  const rendered = await offlineCtx.startRendering();
  return rendered.getChannelData(0);
}
