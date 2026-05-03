const express = require("express");
const router = express.Router()
const Clip = require("../Models/file.model")
const authMiddleware = require("../Middleware/auth")

/**
 * @desc    Get all clips
 * @route   GET /api/clips
 * @access  Private
 */
router.get("/", authMiddleware, async (req, res) => {
    try {
        //users see only their clip
        const clips = await Clip.find({
            userId: req.user.id
        }).sort({ createdAt: -1 }).limit(50) //desending order (newest first)
        res.json({ clips })
    } catch (err) {
        console.eror("Get/ clips error", err)
        res.status(500).json({ error: "Internal Server Error" })

    }
})

/**
 * @desc    Create a clip
 * @route   POST /api/clips
 * @access  Private
 */
router.post("/", authMiddleware, async (req, res) => {
    try {
        //destructing data from frontend 
        const { title, preview, rawText, type, action, iconBg, iconColor } = req.body

        if (!title) return res.status(400).json({ error: "title required" })

        //clip is the moongoose model .create inserts a new document 
        const clip = await Clip.create({
            userId: req.user.id, // links the clip to the loged-in user to see only their data 
            title,
            preview,
            rawText,
            type,
            action,
            iconBg,
            iconColor
        })
        res.status(201).json({ clip })

    } catch (err) {
        console.error("Post/ clips error", err)
        res.status(500).json({ error: "Internal Server Error" })
    }
})

router.delete("/:id",authMiddleware, async (req,res) => {
    try{
        const clip = await Clip.findOneAndDelete({
            _id:req.params.id, //find clip by clip id
            userId:req.user.id //ensue clip belongs to the user
        })
        if(!clip) return res.status(404).json({error:"Clip Not Found"})
        res.json({success:true})
        }catch(err){
            console.error("Delete/ clips error", err)
            res.status(500).json({ error: "Internal Server Error" })
        }
})

module.exports = router