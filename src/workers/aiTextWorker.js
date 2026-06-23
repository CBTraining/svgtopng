import { pipeline, env } from '@huggingface/transformers';

// Configure environment
env.allowLocalModels = false;
env.backends.onnx.wasm.numThreads = navigator.hardwareConcurrency 
    ? Math.max(1, Math.min(4, navigator.hardwareConcurrency - 1)) 
    : 1;

class TextPipelineSingleton {
    static models = {
        summarize: { task: 'summarization', model: 'Xenova/distilbart-cnn-6-6' },
        grammar: { task: 'text2text-generation', model: 'Xenova/grammar-synthesis-small' }
    };
    
    static instances = {};

    static async getInstance(type, progress_callback = null) {
        if (!this.instances[type]) {
            const config = this.models[type];
            this.instances[type] = await pipeline(config.task, config.model, {
                progress_callback,
                device: 'wasm', // NLP runs fine on wasm, webgpu sometimes has issues with text models
                dtype: 'fp32', // Fix ONNX parsing errors for qdq weights by forcing full precision
            });
        }
        return this.instances[type];
    }
}

self.addEventListener('message', async (event) => {
    const { jobId, action, type, text, options } = event.data;

    try {
        if (action === 'load') {
            self.postMessage({ jobId, status: 'init', log: `Downloading AI ${type} model... (~240MB)` });
            await TextPipelineSingleton.getInstance(type, (x) => {
                self.postMessage({ jobId, status: 'progress', progressData: x });
            });
            self.postMessage({ jobId, status: 'ready', type });
            return;
        }

        if (action === 'generate') {
            self.postMessage({ jobId, status: 'processing', log: 'Processing text...' });
            
            // Should already be loaded, but getInstance ensures it is.
            const modelPipeline = await TextPipelineSingleton.getInstance(type);

            let result;
            if (type === 'summarize') {
                const res = await modelPipeline(text, {
                    max_new_tokens: options?.maxLength || 100,
                    min_length: options?.minLength || 30,
                });
                result = res[0].summary_text;
            } else if (type === 'grammar') {
                const res = await modelPipeline(text, {
                    max_new_tokens: 200
                });
                result = res[0].generated_text;
            }

            self.postMessage({
                jobId,
                status: 'success',
                result: result
            });
        }

    } catch (error) {
        console.error("Text AI Error:", error);
        self.postMessage({
            jobId,
            status: 'error',
            error: error.message || "An unknown error occurred during AI text processing."
        });
    }
});
