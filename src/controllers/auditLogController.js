const AuditLog = require('../models/AuditLog');
const asyncHandler = require('../utils/asyncHandler');

const getAuditLogs = asyncHandler(async (req, res) => {
  const logs = await AuditLog.find()
    .populate('user', 'name email role')
    .sort({ createdAt: -1 })
    .limit(200);

  res.status(200).json({
    success: true,
    count: logs.length,
    data: {
      logs
    }
  });
});

module.exports = {
  getAuditLogs
};
