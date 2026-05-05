// Server/Jobs/cleanupExpired.js
const cron = require("node-cron");
const Clip = require("../Models/file.model");
const cloudinary = require("../Config/cloudinary");
const mongoose = require("mongoose");

/**
 * Runs every 15 minutes.
 * Finds all clips past their expiresAt, deletes their Cloudinary asset (if any),
 * then removes the MongoDB document.
 */
function startCleanupJob() {
  cron.schedule("*/15 * * * *", async () => {

    if(mongoose.connection.readyState !== 1) {
         console.warn("⏭️  Cleanup skipped — DB not connected (readyState:", mongoose.connection.readyState, ")"); //mongoose recoonect when it sleeps to perform corn job
         return
    }

    try {
      const now = new Date();

      // Find all expired clips that still have a Cloudinary asset
      const expiredWithFiles = await Clip.find({
        expiresAt: { $lte: now },
        cloudinaryPublicId: { $ne: null },
      }).select("_id cloudinaryPublicId");

      // Delete from Cloudinary first
      const cloudinaryResults = await Promise.allSettled(
        expiredWithFiles.map((clip) =>
          cloudinary.uploader.destroy(clip.cloudinaryPublicId, {
            resource_type: "raw",
          })
        )
      );

      cloudinaryResults.forEach((result, i) => {
        if (result.status === "rejected") {
          console.warn(
            `⚠️  Cloudinary delete failed for ${expiredWithFiles[i].cloudinaryPublicId}:`,
            result.reason?.message
          );
        }
      });

      // Delete all expired docs from MongoDB
      const { deletedCount } = await Clip.deleteMany({
        expiresAt: { $lte: now },
      });

      if (deletedCount > 0) {
        console.log(`🗑️  Cleanup job: removed ${deletedCount} expired clip(s)`);
      }
    } catch (err) {
      console.error("❌ Cleanup job error:", err.message);
    }
  });

  console.log("⏰ Clip cleanup job scheduled (every 15 min)");
}

module.exports = startCleanupJob;