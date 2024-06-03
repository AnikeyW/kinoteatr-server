import { HttpException, HttpStatus, Injectable, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { CreateAdminDto } from './dto/create-admin.dto';
import { Admin, Token } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly jwtService: JwtService,
  ) {}
  async registration(dto: CreateAdminDto): Promise<string> {
    const candidate = await this.findAdminByEmail(dto.email);

    if (candidate) {
      throw new HttpException('Емэил занят', HttpStatus.BAD_REQUEST);
    }

    const hashPassword = bcrypt.hashSync(dto.password, 10);

    const admin = await this.createAdmin({ email: dto.email, password: hashPassword });

    const { email } = admin;
    return email;
  }

  async login(admin: { id: number; email: string }) {
    const payload = { id: admin.id, email: admin.email };

    const tokens = this.generateTokens(payload);
    await this.saveToken(admin.id, tokens.refreshToken);

    return {
      ...tokens,
      admin,
    };
  }

  async logout(refreshToken: string) {
    const token = await this.prismaService.token.delete({
      where: { refreshToken },
    });

    return 'ok';
  }

  async refresh(refreshToken: string) {
    if (!refreshToken) {
      throw new UnauthorizedException();
    }
    const userData = this.validateRefreshToken(refreshToken);
    if (!userData) {
      try {
        await this.prismaService.token.delete({
          where: {
            adminId: userData.id,
          },
        });
        throw new UnauthorizedException();
      } catch (e) {
        console.log('refresh, delete token from db', e);
      }
    }

    const admin = await this.findAdminByEmail(userData.email);
    const payload = { id: admin.id, email: admin.email };
    const tokens = this.generateTokens(payload);
    await this.saveToken(admin.id, tokens.refreshToken);

    return {
      ...tokens,
      admin: {
        id: admin.id,
        email: admin.email,
      },
    };
  }

  async validateAdmin(email: string, password: string): Promise<any> {
    const admin = await this.findAdminByEmail(email);

    if (admin && bcrypt.compareSync(password, admin.password)) {
      return {
        id: admin.id,
        email: admin.email,
      };
    }
    return null;
  }

  private async findAdminByEmail(email: string): Promise<Admin> {
    return this.prismaService.admin.findUnique({ where: { email } });
  }

  private async createAdmin({ email, password }: { email: string; password: string }) {
    return this.prismaService.admin.create({
      data: {
        email,
        password,
      },
    });
  }

  private generateTokens(payload) {
    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(payload, { expiresIn: '30d' });
    return {
      accessToken,
      refreshToken,
    };
  }

  private async saveToken(adminId: number, refreshToken) {
    const tokenData = await this.prismaService.token.findUnique({ where: { adminId: adminId } });

    if (tokenData) {
      return this.prismaService.token.update({
        data: { refreshToken },
        where: { id: tokenData.id },
      });
    }

    return this.prismaService.token.create({
      data: {
        adminId,
        refreshToken,
      },
    });
  }

  validateRefreshToken(token: string): { id: number; email: string } {
    try {
      const userData = this.jwtService.verify(token, {
        secret: process.env.JWT_SECRET,
        ignoreExpiration: false,
      });
      return userData;
    } catch (e) {
      return null;
    }
  }

  // async findOneRefreshToken(refreshToken: string): Promise<Token> {
  //   return this.prismaService.token.findFirst({ where: { refreshToken: refreshToken } });
  // }
}
