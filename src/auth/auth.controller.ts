import {
  Body,
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
import { CreateAdminDto } from './dto/create-admin.dto';

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
    console.log(userData);
    await res.cookie('refreshToken', userData.refreshToken, {
      maxAge: 30 * 24 * 60 * 60 * 1000,
      httpOnly: true,
      // sameSite: 'none',
      // secure: true,
    });
    await res.cookie('accessToken', userData.accessToken, {
      maxAge: 15 * 60 * 1000,
    });
    console.log(res.getHeaders()['set-cookie']);
    const { refreshToken, ...result } = userData;
    return res.json(result);
  }

  @UseGuards(JwtAuthGuard)
  @Get('checkauth')
  async checkAuth(@Req() req) {
    return req.user;
  }

  @UseGuards(JwtAuthGuard)
  @Get('logout')
  async logout(@Req() req, @Res() res) {
    const { refreshToken } = req.cookies;
    if (!refreshToken) {
      throw new HttpException('Отсутствует refreshToken', HttpStatus.UNAUTHORIZED);
    }
    const token = await this.authService.logout(refreshToken);
    res.clearCookie('refreshToken');
    res.clearCookie('accessToken');
    return 'Logout success';
  }

  @Get('refresh')
  async refresh(@Req() req, @Res() res) {
    const { refreshToken } = req.cookies;
    if (!refreshToken) {
      throw new HttpException('В Cookies отсутствует refreshToken', HttpStatus.UNAUTHORIZED);
    }

    const userData = await this.authService.refresh(refreshToken);
    await res.cookie('refreshToken', userData.refreshToken, {
      maxAge: 30 * 24 * 60 * 60 * 1000,
      httpOnly: true,
      // sameSite: 'none',
      // secure: true,
    });
    await res.cookie('accessToken', userData.accessToken, {
      maxAge: 15 * 60 * 1000,
    });
    return res.json({ admin: userData.admin, accessToken: userData.accessToken });
  }
}
