const { createRemoteJWKSet, jwtVerify } = require('jose');

// Supabase JWT verification endpoint
const supabaseJwksUrl = new URL(`${process.env.SUPABASE_URL}/auth/v1/.well-known/jwks.json`);
const jwks = createRemoteJWKSet(supabaseJwksUrl);

// Protect routes — require authentication via Supabase JWT
const protect = async (req, res, next) => {
  let token;

  // Check for token in cookies first, then Authorization header
  if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  } else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized. Please log in.'
    });
  }

  try {
    // Verify the Supabase JWT using JWKS
    const { payload } = await jwtVerify(token, jwks, {
      issuer: `${process.env.SUPABASE_URL}/auth/v1`
    });

    // payload.sub is the Supabase user ID (UUID)
    // payload.email is the user's email
    // payload.user_metadata contains custom fields (name, username, etc.)
    req.user = {
      id: payload.sub,
      email: payload.email,
      user_metadata: payload.user_metadata || {},
      app_metadata: payload.app_metadata || {}
    };

    next();
  } catch (error) {
    let message = 'Not authorized. Token invalid or expired.';

    if (error.code === 'ERR_JWT_EXPIRED') {
      message = 'Session expired. Please log in again.';
    } else if (error.code === 'ERR_JWT_SIGNATURE_INVALID') {
      message = 'Invalid token. Please log in again.';
    }

    return res.status(401).json({
      success: false,
      message
    });
  }
};

module.exports = { protect };
