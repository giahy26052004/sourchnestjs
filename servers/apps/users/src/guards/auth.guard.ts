import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { PrismaService } from "../../../../prisma/Prisma.service";
import { ConfigService } from "@nestjs/config";

import { GqlExecutionContext } from "@nestjs/graphql";

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const gqlContext = GqlExecutionContext.create(context);
    const { req } = gqlContext.getContext();
    const accessToken = req.headers.accesstoken as string;
    const refreshToken = req.headers.refreshtoken as string;

    if (!accessToken || !refreshToken) {
      throw new UnauthorizedException("Please login to access this resouce");
    }
    if (accessToken) {
      const decoded = this.jwt.decode(accessToken);
      if (!decoded) {
        throw new UnauthorizedException("Invalid access token");
      }
      await this.updateAccessToken(req);
    }
    return true;
  }
  private async updateAccessToken(req: any): Promise<void> {
    try {
      const refreshTokenData = req.headers.refreshtoken as string;
      const decoded = this.jwt.decode(refreshTokenData);
      if (!decoded) {
        throw new UnauthorizedException("Invalid refresh token");
      }
      const user = await this.prisma.user.findUnique({
        where: {
          id: decoded.id,
        },
      });
      const accessToken = this.jwt.sign(
        {
          id: user.id,
        },
        {
          secret: this.configService.get<string>("ACCESS_TOKEN_SECRET"),
          expiresIn: "15m",
        },
      );
      const refreshToken = this.jwt.sign(
        {
          id: user.id,
        },
        {
          secret: this.configService.get<string>("REFRESH_TOKEN_SECRET"),
          expiresIn: "3d",
        },
      );
      req.accesstoken = accessToken;
      req.refreshtoken = refreshToken;
      req.user = user;
    } catch (error) {
      console.log(error);
    }
  }
}
