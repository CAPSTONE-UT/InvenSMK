import type { NextFunction, Request, Response } from "express";

import type {
  AuthService,
  LoginInput,
  RefreshInput,
  RegisterInput,
} from "../types/auth.types.js";
import { toUserProfilePayload } from "../types/auth.types.js";
import { AuthenticationError } from "../utils/api-error.js";
import { sendSuccess } from "../utils/api-response.js";

export class AuthController {
  public constructor(private readonly authService: AuthService) {}

  public register = async (
    request: Request,
    response: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const result = await this.authService.register(
        request.body as RegisterInput,
      );
      sendSuccess(
        response,
        201,
        {
          user_id: result.userId,
          email: result.email,
          email_verification_required: result.emailVerificationRequired,
          ...(result.session === undefined ? {} : { session: result.session }),
        },
        result.emailVerificationRequired
          ? "Pendaftaran berhasil; silakan verifikasi email"
          : "Pendaftaran berhasil",
      );
    } catch (error: unknown) {
      next(error);
    }
  };

  public login = async (
    request: Request,
    response: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const result = await this.authService.login(request.body as LoginInput);
      sendSuccess(
        response,
        200,
        {
          session: result.session,
          user: toUserProfilePayload(result.user),
        },
        "Login berhasil",
      );
    } catch (error: unknown) {
      next(error);
    }
  };

  public refresh = async (
    request: Request,
    response: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const result = await this.authService.refresh(request.body as RefreshInput);
      sendSuccess(
        response,
        200,
        {
          session: result.session,
          user: toUserProfilePayload(result.user),
        },
        "Session diperbarui",
      );
    } catch (error: unknown) {
      next(error);
    }
  };

  public getProfile = async (
    request: Request,
    response: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      if (request.auth === undefined) throw new AuthenticationError();
      const profile = await this.authService.getCurrentProfile(request.auth);
      sendSuccess(response, 200, toUserProfilePayload(profile));
    } catch (error: unknown) {
      next(error);
    }
  };

  public logout = async (
    request: Request,
    response: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      if (request.auth === undefined) throw new AuthenticationError();
      await this.authService.logout(request.auth);
      sendSuccess(response, 200, undefined, "Logout berhasil");
    } catch (error: unknown) {
      next(error);
    }
  };
}
