import { NextFunction, Request, Response } from 'express'
import { ParamsDictionary } from 'express-serve-static-core'
import usersServices from '~/services/users.services'
import { LogoutRequestBody, RegisterRequestBody } from '~/models/requests/User.requests'
import User from '~/models/schemas/User.schema'
import { ObjectId } from 'mongodb'
import { USER_MESSAGES } from '~/constants/messages'
import { JwtPayload } from 'jsonwebtoken'
import HTTP_STATUS from '~/constants/httpStatus'
import databaseServices from '~/services/database.services'

export const loginController = async (req: Request, res: Response) => {
  const user = req.user as User
  const userId = user._id as ObjectId
  const result = await usersServices.login(userId.toString())

  res.json({
    message: USER_MESSAGES.LOGIN_SUCCESS,
    data: result
  })
}

export const registerController = async (req: Request<ParamsDictionary, any, RegisterRequestBody>, res: Response) => {
  const result = await usersServices.register(req.body)
  res.json({
    message: USER_MESSAGES.REGISTER_SUCCESS,
    data: result
  })
}

export const logoutController = async (req: Request<ParamsDictionary, any, LogoutRequestBody>, res: Response) => {
  await usersServices.logout(req.body.refresh_token)
  res.json({
    message: USER_MESSAGES.LOGOUT_SUCCESS
  })
}

export const verifyEmailController = async (req: Request, res: Response, next: NextFunction) => {
  const { user_id } = req.decoded_email_verify_token as JwtPayload
  const user = await databaseServices.users.findOne({ _id: new ObjectId(user_id) })
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
