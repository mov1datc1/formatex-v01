import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'wms360-formatex-secret-key-2026',
    });
  }

  async validate(payload: { sub: string; username: string; role: string; nivel: number }) {
    return {
      sub: payload.sub,
      username: payload.username,
      role: payload.role,
      nivel: payload.nivel,
    };
  }
}
