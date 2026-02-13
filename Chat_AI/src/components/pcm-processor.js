class PCMProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
        this.buffer = new Float32Array();
        this.isRecording = false;
        this.silenceThreshold = 0.01;
        this.silenceCounter = 0;
        this.silenceTimeout = 100; // frames of silence to consider speech ended
        
        this.port.onmessage = (e) => {
            if (e.data.command === 'start') {
                this.isRecording = true;
                this.buffer = new Float32Array();
                this.silenceCounter = 0;
            } else if (e.data.command === 'stop') {
                this.isRecording = false;
                // Send final buffer to main thread
                if (this.buffer.length > 0) {
                    this.port.postMessage({
                        type: 'audioData',
                        audioData: this.buffer
                    });
                    this.buffer = new Float32Array();
                }
            }
        };
    }

    process(inputs, outputs) {
        const input = inputs[0];
        if (!input || !input.length || input[0].length === 0) {
            return true;
        }
        
        const inputChannel = input[0];
        
        if (this.isRecording) {
            // Check if there's audio or silence
            let hasSound = false;
            for (let i = 0; i < inputChannel.length; i++) {
                if (Math.abs(inputChannel[i]) > this.silenceThreshold) {
                    hasSound = true;
                    break;
                }
            }
            
            // Always add input data to buffer while recording
            const newBuffer = new Float32Array(this.buffer.length + inputChannel.length);
            newBuffer.set(this.buffer);
            newBuffer.set(inputChannel, this.buffer.length);
            this.buffer = newBuffer;
            
            // Update silence counter
            if (!hasSound) {
                this.silenceCounter++;
            } else {
                this.silenceCounter = 0;
            }
            
            // Send current buffer when silence is detected for a while
            // This helps with continuous feedback while speaking
            if (this.silenceCounter > this.silenceTimeout && this.buffer.length > 0) {
                this.port.postMessage({
                    type: 'audioData',
                    audioData: this.buffer
                });
                this.silenceCounter = 0;
            }
        }
        
        return true;
    }
}

registerProcessor('pcm-processor', PCMProcessor);