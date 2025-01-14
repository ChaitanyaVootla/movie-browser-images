import sharp from "sharp";
import { Readable } from "node:stream";
import * as fs from "fs";
import * as path from "path";
import { pipeline, PassThrough } from "stream";
import { promisify } from "util";
import { CONVERT_PAYLOAD, CONVERT_RESULT } from "@typings";

const pipelineAsync = promisify(pipeline);

const BASE_STORE_PATH = "./data/images";

export const convertImage = async (payload: CONVERT_PAYLOAD): Promise<CONVERT_RESULT> => {
  const result: CONVERT_RESULT = {
    ...payload,
    success: true,
    originalSizeBytes: 0,
    sizeBytes: 0,
    compressionRatio: 0,
  };

  try {
    // Handle .svg by switching to .png fetch URL
    if (payload.original.endsWith(".svg")) {
      payload.original = payload.original.replace(".svg", ".png");
    }

    // Fetch the image (Web ReadableStream in node-fetch v3+)
    const response = await fetch(payload.original);
    if (!response.ok) {
      throw new Error(
        `Failed to fetch image ${payload.original}: ${response.statusText}`
      );
    }

    // Convert Web ReadableStream -> NodeJS.Readable stream for pipeline
    if (!response.body) {
      throw new Error("No response body returned by fetch");
    }
    // @ts-ignore
    const nodeStream = Readable.fromWeb(response.body);

    // Prepare output file and directories
    const filePath = path.join(BASE_STORE_PATH, `${payload.target}.${payload.type}`);
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Track original size
    const originalSizeTracker = new PassThrough();
    let originalSize = 0;
    originalSizeTracker.on("data", (chunk) => {
      originalSize += chunk.length;
    });

    // Track final size
    const finalSizeTracker = new PassThrough();
    let finalSize = 0;
    finalSizeTracker.on("data", (chunk) => {
      finalSize += chunk.length;
    });

    // Configure Sharp transform
    let transform = sharp();
    switch (payload.type) {
      case "webp":
        transform = transform.webp({ quality: payload.quality });
        break;
      case "avif":
        transform = transform.avif({ quality: payload.quality });
        break;
      default:
        throw new Error(`Invalid image type: ${payload.type}`);
    }

    // Create the file write stream
    const outStream = fs.createWriteStream(filePath);

    // Pipeline: (network) -> (measure original) -> (sharp) -> (measure final) -> (disk)
    await pipelineAsync(
      nodeStream,
      originalSizeTracker,
      transform,
      finalSizeTracker,
      outStream
    );

    // Update stats
    result.originalSizeBytes = originalSize;
    result.sizeBytes = finalSize;
    result.compressionRatio = originalSize ? finalSize / originalSize : 0;

    return result;
  } catch (error) {
    console.error("Error converting image:", error, payload.original, payload.target);
    result.success = false;
    return result;
  }
};
