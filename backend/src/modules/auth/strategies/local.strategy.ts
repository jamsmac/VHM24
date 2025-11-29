import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';
import { AuthService } from '../auth.service';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly authService: AuthService) {
    super({
      usernameField: 'email',
      passwordField: 'password',
      passReqToCallback: true,
    });
  }

  async validate(req: any, email: string, password: string): Promise<any> {
    // Support both email and username login
    const emailOrUsername = req.body.email || req.body.username || email;

    const user = await this.authService.validateUser(emailOrUsername, password);

    if (!user) {
      throw new UnauthorizedException('Неверные учетные данные');
    }

    return user;
  }
}
