import { Request, Response } from 'express'
import usersServices from '~/services/users.services'
import {
  ChangePasswordRequestBody,
  FollowUserRequestBody,
  ForgotPasswordRequestBody,
  GetProfileReqParams,
  LoginRequestBody,
  LogoutRequestBody,
  RegisterRequestBody,
  ResetPasswordRequestBody,
  TokenPayload,
  UnfollowUserRequestBody,
  UpdateMeRequestBody,
  VerifyEmailRequestBody,
  VerifyForgotPasswordRequestBody
} from '~/models/requests/User.requests'
import User from '~/models/schemas/User.schema'
import { ObjectId } from 'mongodb'
import { USER_MESSAGES } from '~/constants/messages'
import { JwtPayload } from 'jsonwebtoken'
import HTTP_STATUS from '~/constants/httpStatus'
import databaseServices from '~/services/database.services'
import { UserVerifyStatus } from '~/constants/enum'

export const loginController = async (req: Request<LoginRequestBody>, res: Response) => {
  const { _id, verify } = req.user as User
  const result = await usersServices.login({ userId: (_id as ObjectId).toString(), verify })

  res.json({
    message: USER_MESSAGES.LOGIN_SUCCESS,
    data: result
  })
}

export const registerController = async (req: Request<RegisterRequestBody>, res: Response) => {
  const result = await usersServices.register(req.body)
  res.json({
    message: USER_MESSAGES.REGISTER_SUCCESS,
    data: result
  })
}

export const logoutController = async (req: Request<LogoutRequestBody>, res: Response) => {
  await usersServices.logout(req.body.refresh_token)
  res.json({
    message: USER_MESSAGES.LOGOUT_SUCCESS
  })
}

export const verifyEmailController = async (req: Request<VerifyEmailRequestBody>, res: Response) => {
  const { user_id } = req.decoded_email_verify_token as JwtPayload
  const user = await databaseServices.users.findOne({ _id: new ObjectId(user_id as string) })
  if (!user) {
    return res.status(HTTP_STATUS.NOT_FOUND).json({
      message: USER_MESSAGES.USER_NOT_FOUND
    })
  }

  if (user.email_verify_token === '') {
    return res.status(HTTP_STATUS.OK).json({
      message: USER_MESSAGES.EMAIL_ALREADY_VERIFIED
    })
  }

  const result = await usersServices.verifyEmail(user_id)
  res.json({
    message: USER_MESSAGES.VERIFY_EMAIL_SUCCESS,
    data: result
  })
}

export const resendVerifyEmailController = async (req: Request, res: Response) => {
  const { user_id } = req.decoded_authorization as JwtPayload
  const user = await databaseServices.users.findOne({ _id: new ObjectId(user_id as string) })
  if (!user) {
    return res.status(HTTP_STATUS.NOT_FOUND).json({
      message: USER_MESSAGES.USER_NOT_FOUND
    })
  }

  if (user.verify === UserVerifyStatus.Verified) {
    return res.status(HTTP_STATUS.OK).json({
      message: USER_MESSAGES.EMAIL_ALREADY_VERIFIED
    })
  }

  const result = await usersServices.resendVerifyEmail(user_id)
  res.json(result)
}

export const forgotPasswordController = async (req: Request<ForgotPasswordRequestBody>, res: Response) => {
  const { _id, verify } = req.user as User
  const result = await usersServices.forgotPassword({ userId: (_id as ObjectId).toString(), verify })
  res.json(result)
}

export const verifyForgotPasswordController = async (req: Request<VerifyForgotPasswordRequestBody>, res: Response) => {
  res.json({
    message: USER_MESSAGES.VERIFY_FORGOT_PASSWORD_SUCCESS
  })
}

export const resetPasswordController = async (req: Request<ResetPasswordRequestBody>, res: Response) => {
  const { user_id } = req.decoded_forgot_password_token as JwtPayload
  const { password } = req.body
  const result = await usersServices.resetPassword((user_id as ObjectId).toString(), password)
  res.json(result)
}

export const getMeController = async (req: Request, res: Response) => {
  const { user_id } = req.decoded_authorization as TokenPayload
  const user = await usersServices.getMe(user_id)
  res.json({
    message: USER_MESSAGES.GET_ME_SUCCESS,
    data: user
  })
}

export const updateMeController = async (req: Request<UpdateMeRequestBody>, res: Response) => {
  const { user_id } = req.decoded_authorization as TokenPayload
  const { body } = req
  const user = await usersServices.updateMe(user_id, body)
  res.json({
    message: USER_MESSAGES.UPDATE_ME_SUCCESS,
    data: user
  })
}

export const getUserProfileController = async (req: Request<GetProfileReqParams>, res: Response) => {
  const { username } = req.params
  const user = await usersServices.getUserProfile(username)
  res.json({
    message: USER_MESSAGES.GET_USER_PROFILE_SUCCESS,
    data: user
  })
}

export const followUserController = async (req: Request<FollowUserRequestBody>, res: Response) => {
  const { user_id } = req.decoded_authorization as TokenPayload
  const { followed_user_id } = req.body
  const result = await usersServices.followUser(user_id, followed_user_id)
  res.json(result)
}

export const unfollowUserController = async (req: Request<UnfollowUserRequestBody>, res: Response) => {
  const { user_id } = req.decoded_authorization as TokenPayload
  const { followed_user_id } = req.params
  const result = await usersServices.unfollowUser(user_id, followed_user_id)
  res.json(result)
}

export const changePasswordController = async (req: Request<ChangePasswordRequestBody>, res: Response) => {
  const { user_id } = req.decoded_authorization as TokenPayload
  const { password } = req.body
  const result = await usersServices.changePassword(user_id, password)
  res.json(result)
}
