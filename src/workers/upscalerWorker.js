import { pipeline, env, RawImage } from '@huggingface/transformers';

// Configure environment
env.allowLocalModels = false;
env.backends.onnx.wasm.numThreads = 1; // Limit threads to avoid freezing UI if WASM is used

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
        const output = await upscaler(dataUrl);

        // output is a RawImage. We need to convert it back to a blob
        const canvas = new OffscreenCanvas(output.width, output.height);
        const ctx = canvas.getContext('2d');
        
        const imageData = new ImageData(
            new Uint8ClampedArray(output.data),
            output.width,
            output.height
        );
        ctx.putImageData(imageData, 0, 0);

        const upscaledBlob = await canvas.convertToBlob({ type: 'image/png' });
        const upscaledUrl = URL.createObjectURL(upscaledBlob);

        // Send the output back to the main thread
        self.postMessage({
            jobId,
            status: 'success',
            resultUrl: upscaledUrl
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
