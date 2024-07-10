const jwt = require('jsonwebtoken');

exports.guestLogin = (req, res) => {
  const { deviceId } = req.body;

  if (!deviceId ) {
    return res.status(400).json({ message: 'Device ID is required' });
  }

  const token = jwt.sign({ deviceId }, process.env.JWT_SECRET);

  return res.status(200).json({ token });
};
