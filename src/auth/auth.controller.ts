import {
  Controller,
  Post,
  UseGuards,
  Get,
  Req,
  HttpException,
  HttpStatus,
  Res,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import * as process from 'process';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // @Post('registration')
  // registration(@Body() dto: CreateAdminDto) {
  //   return this.authService.registration(dto);
  // }

  @UseGuards(LocalAuthGuard)
  @Post('login')
  async login(@Req() req, @Res() res) {
    const userData = await this.authService.login(req.user);

    const clientUrl = new URL(process.env.CLIENT_URL);
    const clientDomain = clientUrl.hostname;

    res.cookie('refreshToken', userData.refreshToken, {
      maxAge: 30 * 24 * 60 * 60 * 1000,
      httpOnly: true,
      sameSite: 'none',
      secure: true,
      domain: `.${clientDomain}`,
    });
    res.cookie('accessToken', userData.accessToken, {
      maxAge: 15 * 60 * 1000,
      httpOnly: true,
      sameSite: 'none',
      secure: true,
      domain: `.${clientDomain}`,
    });

    const { admin } = userData;
    return res.json(admin);
  }

  @UseGuards(JwtAuthGuard)
  @Get('logout')
  async logout(@Req() req, @Res() res) {
    const { refreshToken } = req.cookies;
    if (!refreshToken) {
      throw new HttpException('Отсутствует refreshToken', HttpStatus.UNAUTHORIZED);
    }
    await this.authService.logout(refreshToken);
    res.clearCookie('refreshToken');
    res.clearCookie('accessToken');
    return res.json('logout success');
  }

  @Get('refresh')
  async refresh(@Req() req, @Res() res) {
    let refreshToken = null;
    if (req.headers.refreshtoken) {
      refreshToken = req.headers.refreshtoken;
    }
    if (req.cookies.refreshToken) {
      refreshToken = req.cookies.refreshToken;
    }
    if (!refreshToken) {
      throw new HttpException('В Cookies отсутствует refreshToken', HttpStatus.UNAUTHORIZED);
    }

    const clientUrl = new URL(process.env.CLIENT_URL);
    const clientDomain = clientUrl.hostname;

    const userData = await this.authService.refresh(refreshToken);
    res.cookie('refreshToken', userData.refreshToken, {
      maxAge: 30 * 24 * 60 * 60 * 1000,
      httpOnly: true,
      sameSite: 'none',
      secure: true,
      domain: `.${clientDomain}`,
    });
    res.cookie('accessToken', userData.accessToken, {
      maxAge: 15 * 60 * 1000,
      httpOnly: true,
      sameSite: 'none',
      secure: true,
      domain: `.${clientDomain}`,
    });

    return res.json({ admin: userData.admin });
  }
}
