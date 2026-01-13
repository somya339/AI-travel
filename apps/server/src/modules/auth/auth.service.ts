import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { UserDTO } from './auth.dto';
import { Model } from 'mongoose';
import { User, UserSchema } from './user.schema';
import { InjectModel } from '@nestjs/mongoose';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserSchema>,
    private readonly jwtService: JwtService,
  ) {}

  async register(user: UserDTO) {
    // check if user already exists
    const existingUser = await this.userModel.findOne({
      email: user.email,
    });
    if (existingUser) {
      throw new ConflictException('User already exists');
    }

    // Hash password before saving
    const hashedPassword = await bcrypt.hash(user.password, 10);
    const userResponse = await this.userModel.create({
      email: user.email,
      password: hashedPassword,
    });

    // Generate tokens with user data
    const payload = {
      email: userResponse.email,
      sub: userResponse._id.toString(),
    };
    const refetch = this.jwtService.sign(payload, { expiresIn: '7d' });
    const accessToken = this.jwtService.sign(payload, { expiresIn: '15m' });

    return { userResponse, refetch, accessToken };
  }

  async login(userCredentials: UserDTO) {
    const user = await this.userModel.findOne({
      email: userCredentials.email,
    });

    if (!user) {
      throw new UnauthorizedException('The user name or password is incorrect');
    }

    // use bcrypt to match passwords
    const match: boolean = await bcrypt.compare(
      userCredentials.password,
      user.password,
    );

    if (!match) {
      throw new UnauthorizedException('The user name or password is incorrect');
    }

    // Generate tokens with user data
    const payload = { email: user.email, sub: user._id.toString() };
    const refetch = this.jwtService.sign(payload, { expiresIn: '7d' });
    const accessToken = this.jwtService.sign(payload, { expiresIn: '15m' });

    return { refetch, accessToken };
  }
}
