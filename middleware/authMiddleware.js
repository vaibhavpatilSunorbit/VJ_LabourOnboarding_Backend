
const jwt = require('jsonwebtoken');
const secretKey = process.env.JWT_SECRET || "jlkjfkljgjroijlkjalkfjdklfjfkj";

function authMiddleware(req, res, next) {
  const authHeader = req.headers["authorization"]; // Bearer <token>
  if (!authHeader) {
    return res.status(401).json({ msg: "Authorization header missing" });
  }

  const token = authHeader.split(" ")[1];
  if (!token) {
    return res.status(401).json({ msg: "Token missing" });
  }

  try {
    const decoded = jwt.verify(token, secretKey); // Verify token
    req.user = decoded; // Attach payload to request object
    next(); // Continue to controller
  } catch (err) {
    return res.status(403).json({ msg: "Invalid or expired token" });
  }
}

module.exports = authMiddleware;
