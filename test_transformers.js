import { pipeline } from '@huggingface/transformers';

async function test() {
  try {
    const upscaler = await pipeline('image-to-image', 'Xenova/swin2SR-classical-sr-x2-64');
    console.log("Success! Upscaler pipeline created.");
    process.exit(0);
  } catch (e) {
    console.error("Error creating pipeline:", e);
    process.exit(1);
  }
}

test();
