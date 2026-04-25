import { AuthTokenPayload } from './auth-token-payload';

export interface TokenService {
  generateToken(payload: AuthTokenPayload): Promise<string>;
}
