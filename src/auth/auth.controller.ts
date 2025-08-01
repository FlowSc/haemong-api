import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  Req,
  Res,
  Query,
  Delete,
  Put,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request, Response } from 'express';
import { AuthService } from './services/auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { CheckNicknameDto } from './dto/check-nickname.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { UpdateNicknameDto } from './dto/update-nickname.dto';
import { UserProfileDto } from './dto/user-profile.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body() registerDto: RegisterDto): Promise<AuthResponseDto> {
    return this.authService.register(registerDto);
  }

  @Post('login')
  async login(@Body() loginDto: LoginDto): Promise<AuthResponseDto> {
    return this.authService.login(loginDto);
  }

  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleAuth(@Req() req: Request) {
    // Guard redirects to Google
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleAuthRedirect(@Req() req: Request, @Res() res: Response) {
    const authResponse = req.user as any as AuthResponseDto;

    // Redirect to frontend with tokens
    const redirectUrl = `${process.env.FRONTEND_URL}/auth/callback?token=${authResponse.accessToken}&refresh=${authResponse.refreshToken}`;
    res.redirect(redirectUrl);
  }

  @Get('apple')
  @UseGuards(AuthGuard('apple'))
  async appleAuth(@Req() req: Request) {
    // Guard redirects to Apple
  }

  @Get('apple/callback')
  @UseGuards(AuthGuard('apple'))
  async appleAuthRedirect(@Req() req: Request, @Res() res: Response) {
    const authResponse = req.user as any as AuthResponseDto;

    // Redirect to frontend with tokens
    const redirectUrl = `${process.env.FRONTEND_URL}/auth/callback?token=${authResponse.accessToken}&refresh=${authResponse.refreshToken}`;
    res.redirect(redirectUrl);
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  async getProfile(@Req() req: Request): Promise<UserProfileDto> {
    const userId = req.user?.['sub'];
    if (!userId) {
      throw new Error('User ID not found');
    }
    return this.authService.getUserProfile(userId);
  }

  @Get('check-nickname')
  async checkNickname(@Query() checkNicknameDto: CheckNicknameDto) {
    const isAvailable = await this.authService.checkNicknameAvailability(
      checkNicknameDto.nickname,
    );
    return { available: isAvailable };
  }

  @Get('generate-nickname')
  async generateNickname() {
    const nickname = await this.authService.generateUniqueNickname();
    return { nickname };
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  async logout() {
    return { message: 'Logged out successfully' };
  }

  @Put('nickname')
  @UseGuards(JwtAuthGuard)
  async updateNickname(
    @Req() req: Request,
    @Body() updateNicknameDto: UpdateNicknameDto,
  ) {
    const userId = req.user?.['sub'];
    if (!userId) {
      throw new Error('User ID not found');
    }
    await this.authService.updateNickname(userId, updateNicknameDto.nickname);
    return { message: 'Nickname updated successfully' };
  }

  @Delete('account')
  @UseGuards(JwtAuthGuard)
  async deleteAccount(@Req() req: Request) {
    const userId = req.user?.['sub'];
    if (!userId) {
      throw new Error('User ID not found');
    }
    await this.authService.deleteAccount(userId);
    return { message: 'Account deleted successfully' };
  }
}
