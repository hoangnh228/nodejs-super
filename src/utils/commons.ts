import { Request } from 'express'
import { JsonWebTokenError } from 'jsonwebtoken'
import { capitalize } from 'lodash'
import HTTP_STATUS from '~/constants/httpStatus'
import { USER_MESSAGES } from '~/constants/messages'
import { ErrorWithStatus } from '~/models/Errors'
import { verifyToken } from '~/utils/jwt'

export const numberEnumToArray = (numberEnum: { [key: string]: string | number }) => {
  return Object.values(numberEnum).filter((value) => typeof value === 'number')
}

export const verifyAccessToken = async (accessToken: string, req?: Request) => {
  if (!accessToken) {
    throw new ErrorWithStatus({ message: USER_MESSAGES.ACCESS_TOKEN_IS_REQUIRED, status: HTTP_STATUS.UNAUTHORIZED })
  }
  try {
    const decoded = await verifyToken({
      token: accessToken,
      scretOrPublicKey: process.env.JWT_SECRET_ACCESS_TOKEN as string
    })

    if (req) {
      ;(req as Request).decoded_authorization = decoded
      return true
    }

    return decoded
  } catch (error) {
    throw new ErrorWithStatus({
      message: capitalize((error as JsonWebTokenError).message),
      status: HTTP_STATUS.UNAUTHORIZED
    })
  }
}
