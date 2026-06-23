import { pipeline, env } from '@huggingface/transformers';

// Configure environment
env.allowLocalModels = false;
env.backends.onnx.wasm.numThreads = navigator.hardwareConcurrency 
    ? Math.max(1, Math.min(4, navigator.hardwareConcurrency - 1)) 
    : 1;

class TextPipelineSingleton {
    static models = {
        summarize: { task: 'summarization', model: 'Xenova/distilbart-cnn-6-6' },
        grammar: { task: 'text2text-generation', model: 'Xenova/t5-small' }
    };
    
    static instances = {};

    static async getInstance(type, progress_callback = null) {
        if (!this.instances[type]) {
            const config = this.models[type];
            this.instances[type] = await pipeline(config.task, config.model, {
                progress_callback,
                device: 'wasm', // NLP runs fine on wasm, webgpu sometimes has issues with text models
            });
        }
        return this.instances[type];
    }
}

self.addEventListener('message', async (event) => {
    const { jobId, type, text, options } = event.data;

    try {
        self.postMessage({ jobId, status: 'init', log: `Initializing AI ${type} model... (first run downloads ~240MB)` });

        const modelPipeline = await TextPipelineSingleton.getInstance(type, (x) => {
            self.postMessage({ jobId, status: 'progress', progressData: x });
        });

        self.postMessage({ jobId, status: 'processing', log: 'Processing text...' });

        let result;
        if (type === 'summarize') {
            const res = await modelPipeline(text, {
                max_new_tokens: options?.maxLength || 100,
                min_length: options?.minLength || 30,
            });
            result = res[0].summary_text;
        } else if (type === 'grammar') {
            // T5 requires a prefix for tasks. For generic correction, "grammar: " or similar is often used in fine-tunes.
            // But base T5 might try to just complete it. We will use a generic prompt.
            const prompt = `fix grammar: ${text}`;
            const res = await modelPipeline(prompt, {
                max_new_tokens: 200
            });
            result = res[0].generated_text;
        }

        self.postMessage({
            jobId,
            status: 'success',
            result: result
        });

    } catch (error) {
        console.error("Text AI Error:", error);
        self.postMessage({
            jobId,
            status: 'error',
            error: error.message || "An unknown error occurred during AI text processing."
        });
    }
});
