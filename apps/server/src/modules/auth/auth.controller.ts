import { Body, Controller, Post, Res, HttpCode } from '@nestjs/common';
import { UserDTO } from './auth.dto';
import { AuthService } from './auth.service';
import type { Response } from 'express';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }
  @Post('register')
  register(@Body() userDTO: UserDTO) {
    return this.authService.register(userDTO);
  }

  @Post('login')
  @HttpCode(200)
  async login(@Body() loginDto: UserDTO, @Res() res: Response) {
    const { accessToken, refetch } = await this.authService.login(loginDto);
    res.setHeader('Authorization', `Bearer ${accessToken}`);
    res.setHeader('Refetch', refetch);
    return res.send({ staus: 'success' });
  }
}
