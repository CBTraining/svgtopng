import { pipeline, env, RawImage } from '@huggingface/transformers';

// Configure environment
env.allowLocalModels = false;
env.backends.onnx.wasm.numThreads = navigator.hardwareConcurrency 
    ? Math.max(1, Math.min(4, navigator.hardwareConcurrency - 1)) 
    : 1; // Limit max threads to 4 to prevent mobile freezing, but allow multicore

class PipelineSingleton {
    static task = 'image-to-image';
    static model = 'Xenova/swin2SR-classical-sr-x2-64';
    static instance = null;

    static async getInstance(progress_callback = null) {
        if (this.instance === null) {
            this.instance = await pipeline(this.task, this.model, {
                progress_callback,
                device: 'webgpu', // Will fallback to wasm if webgpu is unsupported
            });
        }
        return this.instance;
    }
}

self.addEventListener('message', async (event) => {
    const { jobId, imageBlobUrl } = event.data;

    try {
        // Report initialization status
        self.postMessage({ jobId, status: 'init', log: 'Initializing AI Upscaler...' });

        // Retrieve the image-to-image pipeline
        const upscaler = await PipelineSingleton.getInstance(x => {
            self.postMessage({ jobId, status: 'progress', progressData: x });
        });

        self.postMessage({ jobId, status: 'processing', log: 'Processing image... This might take a minute.' });

        // Fetch and load the image from the blob URL
        const imageResponse = await fetch(imageBlobUrl);
        const imageBlob = await imageResponse.blob();
        
        // Read blob as Data URL to pass to RawImage or pipeline
        const reader = new FileReaderSync();
        const dataUrl = reader.readAsDataURL(imageBlob);

        // Run the model on the image
        let output;
        try {
            output = await upscaler(dataUrl);
        } catch (e) {
            console.warn("WebGPU processing failed, falling back to WASM...", e);
            self.postMessage({ jobId, status: 'processing', log: 'Hardware acceleration failed, falling back to CPU. This may take longer...' });
            
            // Dispose existing pipeline if possible
            try {
                if (upscaler && upscaler.dispose) await upscaler.dispose();
            } catch (disposeErr) {
                console.error("Failed to dispose pipeline:", disposeErr);
            }
            
            // Reset singleton instance to force recreation
            PipelineSingleton.instance = null;
            
            // Re-create pipeline explicitly with wasm
            const fallbackUpscaler = await pipeline(PipelineSingleton.task, PipelineSingleton.model, {
                device: 'wasm',
            });
            output = await fallbackUpscaler(dataUrl);
        }

        // output is either a RawImage or an object containing a RawImage
        const resultImage = (Array.isArray(output) ? output[0] : (output.image || output));

        let upscaledBlob;
        if (typeof resultImage.toBlob === 'function') {
            // Use native Transformers.js method
            upscaledBlob = await resultImage.toBlob('image/png');
        } else {
            // Fallback manual conversion
            const canvas = new OffscreenCanvas(resultImage.width, resultImage.height);
            const ctx = canvas.getContext('2d');
            
            let rgbaData;
            if (resultImage.channels === 3) {
                rgbaData = new Uint8ClampedArray(resultImage.width * resultImage.height * 4);
                for (let i = 0, j = 0; i < resultImage.data.length; i += 3, j += 4) {
                    rgbaData[j] = resultImage.data[i];
                    rgbaData[j + 1] = resultImage.data[i + 1];
                    rgbaData[j + 2] = resultImage.data[i + 2];
                    rgbaData[j + 3] = 255;
                }
            } else if (resultImage.channels === 1) {
                rgbaData = new Uint8ClampedArray(resultImage.width * resultImage.height * 4);
                for (let i = 0, j = 0; i < resultImage.data.length; i += 1, j += 4) {
                    const val = resultImage.data[i];
                    rgbaData[j] = val;
                    rgbaData[j + 1] = val;
                    rgbaData[j + 2] = val;
                    rgbaData[j + 3] = 255;
                }
            } else {
                rgbaData = new Uint8ClampedArray(resultImage.data);
            }
            
            const imageData = new ImageData(rgbaData, resultImage.width, resultImage.height);
            ctx.putImageData(imageData, 0, 0);
    
            upscaledBlob = await canvas.convertToBlob({ type: 'image/png' });
        }

        // Send the output back to the main thread
        self.postMessage({
            jobId,
            status: 'success',
            resultBlob: upscaledBlob
        });

    } catch (error) {
        console.error("Upscaler Error:", error);
        self.postMessage({
            jobId,
            status: 'error',
            error: error.message
        });
    }
});
