const AuditLog = require('../models/AuditLog');

const getRequestIp = (req) => {
  const forwardedFor = req.headers['x-forwarded-for'];

  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }

  return req.ip || req.socket?.remoteAddress || '';
};

const createAuditLog = async ({ req, action, module, description }) => {
  if (!req.user) {
    return null;
  }

  return AuditLog.create({
    user: req.user.id,
    action,
    module,
    description,
    ipAddress: getRequestIp(req)
  });
};

module.exports = {
  createAuditLog
};
