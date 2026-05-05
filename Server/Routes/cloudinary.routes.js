const express = require("express");
const router = express.Router()
const streamifier = require("streamifier"); // buffer to stream (cloudinary supports only stream so need to convert)
const Clip = require("../Models/file.model")
const authMiddleware = require("../Middleware/auth")
const upload = require("../Middleware/upload")
const cloudinary = require("../Config/cloudinary")




/**
 * @des upload a buffer to cloudinary
 */

function uploadToCloudinary(buffer, options) {
    return new Promise((resolve, reject) => {

        const stream = cloudinary.uploader.upload_stream(options, (err, result) => {
            if (err) return reject(err)
            resolve(result)
        })
        // buffer → streamifier → readable stream → pipe → cloudinary stream
        streamifier.createReadStream(buffer).pipe(stream)
    })
}



/**
 *@desc proxy-download route to bypass Cloudinary "untrusted" restriction)
 */

router.get("/:id/download", authMiddleware, async (req, res) => {
    try {
        const clip = await Clip.findOne({ _id: req.params.id, userId: req.user.id });
        if (!clip) return res.status(404).json({ error: "Clip not found" });
        if (!clip.fileUrl) return res.status(400).json({ error: "No file attached" });

        console.log("Fetching fileUrl:", clip.fileUrl);

        //Cloudinary "untrusted" restriction bypass
        const fileRes = await fetch(clip.fileUrl);
        console.log("Status:", fileRes.status);

        if (!fileRes.ok) return res.status(502).json({ error: "Failed to fetch file from Cloudinary" });

        res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(clip.title)}"`); //direct download

        /**
         *@setHeader  standard http response header (server -> browser (data type information))
         *@Content_Type tells the type of file
         * @fileRes_get while fetching response from cloudinary (clip.fileUrl) -> it aleady has content-type, this part extracts it
         * @default application/octet-stream if content-type is not set then defualt (just enables download)
         */
        res.setHeader("Content-Type", fileRes.headers.get("content-type") || "application/octet-stream");

        //file size
        const contentLength = fileRes.headers.get("content-length");
        if (contentLength) res.setHeader("Content-Length", contentLength);

        const { Readable } = require("stream");
        Readable.fromWeb(fileRes.body).pipe(res);
    } catch (err) {
        console.error("GET /:id/download error", err);
        if (!res.headersSent) res.status(500).json({ error: "Internal Server Error" });
    }
});


/**
 @desc  Schedule Cloudinary deletion to match MongoDB TTL
 */



/**
 * @desc upload a file to cloudinary
 * @route POST/clips/upload
 * @access private
 */

router.post("/upload", authMiddleware, upload.single("file"),
    async (req, res) => {
        try {
            //req.file -> an object which has fie data with buffer
            if (!req.file) return res.status(400).json({ error: "No file uploaded" })

            /**
             * @buffer -> temporary memory container (ram me binary formate me data store)
             *          1. fast, 2. easy, 3. streaming possible for service like cloudinary
             * @mimetype -> file type PDF, image, video, etc
             */

            const { originalname, mimetype, buffer, size } = req.file; //through multer

            //upload raw file to cloudinary
            const result = await uploadToCloudinary(buffer, {
                folder: `clipsync/${req.user.id}`,
                //spaces replace with underscore _
                public_id: `${Date.now()}_${originalname.replace(/\s+/g, "_")}`,
                resource_type: "auto",
                use_filename: false, //custon file name -> public id
            })

            //save metadata clip doc with cloudinary

            const clip = await Clip.create({
                userId: req.user.id,
                title: originalname,
                type: "file",
                action: "download",
                iconBg: req.body.iconBg || "#f0fdf4",
                iconColor: req.body.iconColor || "#22c55e",
                cloudinaryPublicId: result.public_id,
                fileUrl: result.secure_url,

            })

            res.status(201).json({ clip })

        } catch (err) {
            console.error("Post/ upload error", err)

            //file size

            if (err.message?.includes("file too large") || err.message?.includes("unsupported file type")) {
                return res.status(400).json({
                    error: err.message
                })
            }
            res.status(500).json({ error: "Upload failed" })
        }
    })

module.exports = router


/**
 * @upload_flow -> Client → Multer → Buffer → Streamifier → Cloudinary → MongoDB → Response
 * @download_flow -> Client → Backend → Fetch Cloudinary → Stream → Client Download
 */