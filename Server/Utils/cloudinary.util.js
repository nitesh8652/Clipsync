const streamifier = require("streamifier");
const cloudinary = require("../Config/cloudinary");

/**
 * @desc upload a buffer to Cloudinary
 * @returns {Promise<object>} Cloudinary upload result
 */
function uploadToCloudinary(buffer, options) {
    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(options, (err, result) => {
            if (err) return reject(err);
            resolve(result);
        });
        // buffer → streamifier → readable stream → pipe → cloudinary stream
        streamifier.createReadStream(buffer).pipe(stream);
    });
}

/**
 * @desc delete a Cloudinary asset, trying the known resource types when unknown
 */
async function destroyCloudinaryAsset(publicId, resourceType) {
    if (!publicId) return null;

    const types = resourceType ? [resourceType] : ["image", "raw", "video"];
    let last = null;

    for (const rt of types) {
        try {
            const result = await cloudinary.uploader.destroy(publicId, { resource_type: rt });
            last = result;
            if (result.result === "ok") return result;
        } catch (err) {
            last = err;
        }
    }

    return last;
}

module.exports = { uploadToCloudinary, destroyCloudinaryAsset };
