class PCMProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
    }

    process(inputs, outputs, parameters) {
        const input = inputs[0];
        if (input.length > 0) {
            const channelData = input[0];
            // Convert Float32Array to Int16Array (PCM 16-bit)
            const pcm16 = new Int16Array(channelData.length);
            for (let i = 0; i < channelData.length; i++) {
                let s = Math.max(-1, Math.min(1, channelData[i]));
                pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
            }

            // Send the Int16Array buffer to the main thread
            this.port.postMessage(pcm16.buffer, [pcm16.buffer]);
        }
        return true;
    }
}

registerProcessor('pcm-processor', PCMProcessor);
