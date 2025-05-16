import { jwtVerify } from 'jose';
import { JWT_SEC } from './consts';

// Get the session data from the JWT token
export async function getServerSession(token: string | undefined) {
  try {
    if (!token) {
      return { user: null };
    }

    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(JWT_SEC)
    );

    return { user: payload };
  } catch (error) {
    console.error('Error verifying JWT:', error);
    return { user: null };
  }
} 