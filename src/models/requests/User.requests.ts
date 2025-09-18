import { JwtPayload } from 'jsonwebtoken'
import { TokenType } from '~/constants/enum'

export interface LoginRequestBody {
  email: string
  password: string
}
export interface RegisterRequestBody {
  name: string
  email: string
  password: string
  confirm_password: string
  date_of_birth: string
}

export interface LogoutRequestBody {
  refresh_token: string
}

export interface TokenPayload extends JwtPayload {
  user_id: string
  token_type: TokenType
}
export interface VerifyEmailRequestBody {
  email_verify_token: string
}

export interface ForgotPasswordRequestBody {
  email: string
}

export interface VerifyForgotPasswordRequestBody {
  forgot_password_token: string
}

export interface ResetPasswordRequestBody {
  forgot_password_token: string
  password: string
  confirm_password: string
}

export interface UpdateMeRequestBody {
  name?: string
  date_of_birth?: string
  bio?: string
  location?: string
  website?: string
  username?: string
  avatar?: string
  cover_photo?: string
}

export interface GetProfileReqParams {
  username: string
}

export interface FollowUserRequestBody {
  followed_user_id: string
}

export interface UnfollowUserRequestBody {
  followed_user_id: string
}

export interface ChangePasswordRequestBody {
  old_password: string
  password: string
  confirm_password: string
}
