const crypto = require('crypto');

module.exports = function verifyFincraSignature(signature, payload, secret) {
  const hash = crypto
    .createHmac('sha512', secret)
    .update(payload)
    .digest('hex');
  return signature === hash;
};
