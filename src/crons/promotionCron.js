const cron = require("node-cron");
const { Op } = require("sequelize");
const { Promotion } = require("../../models");

const startPromotionCron = () => {
  cron.schedule("* * * * *", async () => {
    try {
      const now = new Date();

      // Auto-deactivate expired promotions
      const [expiredCount] = await Promotion.update(
        { isActive: false },
        { where: { endDate: { [Op.lt]: now }, isActive: true } }
      );

      // Auto-activate upcoming promotions
      const [activatedCount] = await Promotion.update(
        { isActive: true },
        { where: { startDate: { [Op.lte]: now }, endDate: { [Op.gte]: now }, isActive: false } }
      );

      if (expiredCount > 0)   console.log(`✅ ${expiredCount} promotion(s) deactivated.`);
      if (activatedCount > 0) console.log(`✅ ${activatedCount} promotion(s) activated.`);

    } catch (error) {
      console.error("Cron job error:", error.message);
    }
  });

  console.log("🕐 Promotion cron job started.");
};

module.exports = { startPromotionCron };