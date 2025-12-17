import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';
import { AuthService } from '../auth.service';
import { User } from '@modules/users/entities/user.entity';

// Request type for passport-local strategy with body containing email/username
interface LocalStrategyRequest {
  body: {
    email?: string;
    username?: string;
  };
}

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly authService: AuthService) {
    super({
      usernameField: 'email',
      passwordField: 'password',
      passReqToCallback: true,
    });
  }

  async validate(req: LocalStrategyRequest, email: string, password: string): Promise<User> {
    // Support both email and username login
    const emailOrUsername = req.body.email || req.body.username || email;

    const user = await this.authService.validateUser(emailOrUsername, password);

    if (!user) {
      throw new UnauthorizedException('Неверные учетные данные');
    }

    return user;
  }
}
