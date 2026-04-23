import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';

export interface GoogleProfile {
  id: string;
  email: string;
  displayName: string;
  picture: string;
}

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(private configService: ConfigService) {
    super({
      clientID: configService.get<string>('google.clientId'),
      clientSecret: configService.get<string>('google.clientSecret'),
      callbackURL: configService.get<string>('google.callbackUrl'),
      scope: ['email', 'profile'],
    });
  }

  validate(_accessToken: string, _refreshToken: string, profile: any, done: VerifyCallback) {
    const googleProfile: GoogleProfile = {
      id: profile.id,
      email: profile.emails?.[0]?.value,
      displayName: profile.displayName,
      picture: profile.photos?.[0]?.value,
    };
    done(null, googleProfile);
  }
}
