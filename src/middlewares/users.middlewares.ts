import { NextFunction, Request, Response } from 'express'
import { checkSchema } from 'express-validator'
import { JsonWebTokenError, JwtPayload } from 'jsonwebtoken'
import { capitalize } from 'lodash'
import HTTP_STATUS from '~/constants/httpStatus'
import { USER_MESSAGES } from '~/constants/messages'
import { ErrorWithStatus } from '~/models/Errors'
import databaseServices from '~/services/database.services'
import usersServices from '~/services/users.services'
import { hashPassword } from '~/utils/crypto'
import { verifyToken } from '~/utils/jwt'
import { validate } from '~/utils/validation'

export const loginValidator = validate(
  checkSchema(
    {
      email: {
        isEmail: { errorMessage: USER_MESSAGES.EMAIL_IS_INVALID },
        notEmpty: { errorMessage: USER_MESSAGES.EMAIL_IS_REQUIRED },
        trim: true,
        errorMessage: USER_MESSAGES.EMAIL_IS_REQUIRED,
        custom: {
          options: async (value, { req }) => {
            const user = await databaseServices.users.findOne({
              email: value,
              password: hashPassword(req.body.password)
            })
            if (user === null) {
              throw new Error(USER_MESSAGES.EMAIL_OR_PASSWORD_IS_INCORRECT)
            }

            req.user = user
            return true
          }
        }
      },
      password: {
        isLength: {
          options: { min: 6, max: 50 },
          errorMessage: USER_MESSAGES.PASSWORD_MUST_BE_FROM_6_TO_50_CHARACTERS
        },
        isString: { errorMessage: USER_MESSAGES.PASSWORD_MUST_BE_A_STRING },
        notEmpty: { errorMessage: USER_MESSAGES.PASSWORD_IS_REQUIRED },
        errorMessage: USER_MESSAGES.PASSWORD_IS_REQUIRED
      }
    },
    ['body']
  )
)

export const registerValidator = validate(
  checkSchema(
    {
      name: {
        isLength: { options: { min: 1, max: 100 } },
        isString: { errorMessage: USER_MESSAGES.NAME_MUST_BE_A_STRING },
        notEmpty: { errorMessage: USER_MESSAGES.NAME_IS_REQUIRED },
        trim: true,
        errorMessage: USER_MESSAGES.NAME_MUST_BE_FROM_1_TO_100_CHARACTERS
      },
      email: {
        isEmail: { errorMessage: USER_MESSAGES.EMAIL_IS_INVALID },
        notEmpty: { errorMessage: USER_MESSAGES.EMAIL_IS_REQUIRED },
        trim: true,
        errorMessage: USER_MESSAGES.EMAIL_IS_REQUIRED,
        custom: {
          options: async (value) => {
            if (await usersServices.checkEmailExists(value)) {
              throw new Error(USER_MESSAGES.EMAIL_ALREADY_EXISTS)
            }
            return true
          }
        }
      },
      password: {
        isLength: {
          options: { min: 6, max: 50 },
          errorMessage: USER_MESSAGES.PASSWORD_MUST_BE_FROM_6_TO_50_CHARACTERS
        },
        isString: { errorMessage: USER_MESSAGES.PASSWORD_MUST_BE_A_STRING },
        notEmpty: { errorMessage: USER_MESSAGES.PASSWORD_IS_REQUIRED },
        errorMessage: USER_MESSAGES.PASSWORD_IS_REQUIRED
      },
      confirm_password: {
        isLength: {
          options: { min: 6, max: 50 },
          errorMessage: USER_MESSAGES.CONFIRM_PASSWORD_MUST_BE_FROM_6_TO_50_CHARACTERS
        },
        isString: { errorMessage: USER_MESSAGES.CONFIRM_PASSWORD_MUST_BE_A_STRING },
        notEmpty: { errorMessage: USER_MESSAGES.CONFIRM_PASSWORD_IS_REQUIRED },
        custom: {
          options: (value, { req }) => {
            if (value !== req.body.password) {
              throw new ErrorWithStatus({
                message: USER_MESSAGES.CONFIRM_PASSWORD_MUST_BE_THE_SAME_AS_PASSWORD,
                status: HTTP_STATUS.BAD_REQUEST
              })
            }
            return true
          }
        },
        errorMessage: USER_MESSAGES.CONFIRM_PASSWORD_IS_REQUIRED
      },
      date_of_birth: {
        isISO8601: {
          options: { strict: true, strictSeparator: true },
          errorMessage: USER_MESSAGES.DATE_OF_BIRTH_MUST_BE_A_DATE
        },
        notEmpty: { errorMessage: USER_MESSAGES.DATE_OF_BIRTH_IS_REQUIRED },
        errorMessage: USER_MESSAGES.DATE_OF_BIRTH_IS_REQUIRED
      }
    },
    ['body']
  )
)

export const accessTokenValidator = validate(
  checkSchema(
    {
      Authorization: {
        trim: true,
        custom: {
          options: async (value: string, { req }) => {
            const accessToken = (value || '').split(' ')[1]
            if (!accessToken) {
              throw new ErrorWithStatus({
                message: USER_MESSAGES.ACCESS_TOKEN_IS_REQUIRED,
                status: HTTP_STATUS.UNAUTHORIZED
              })
            }

            try {
              const decoded = await verifyToken({
                token: accessToken,
                scretOrPublicKey: process.env.JWT_SECRET_ACCESS_TOKEN as string
              })
              ;(req as Request).decoded_authorization = decoded
            } catch (error) {
              if (error) {
                throw new ErrorWithStatus({
                  message: capitalize((error as JsonWebTokenError).message),
                  status: HTTP_STATUS.UNAUTHORIZED
                })
              }

              throw error
            }

            return true
          }
        }
      }
    },
    ['headers']
  )
)

export const refreshTokenValidator = validate(
  checkSchema(
    {
      refresh_token: {
        trim: true,
        custom: {
          options: async (value: string, { req }) => {
            if (!value) {
              throw new ErrorWithStatus({
                message: USER_MESSAGES.REFRESH_TOKEN_IS_REQUIRED,
                status: HTTP_STATUS.UNAUTHORIZED
              })
            }

            try {
              const [decoded, refreshToken] = await Promise.all([
                verifyToken({
                  token: value,
                  scretOrPublicKey: process.env.JWT_SECRET_EMAIL_VERIFY_TOKEN as string
                }) as Promise<JwtPayload>,
                databaseServices.refreshTokens.findOne({ token: value })
              ])

              if (refreshToken === null) {
                throw new ErrorWithStatus({
                  message: USER_MESSAGES.REFRESH_TOKEN_DOES_NOT_EXIST,
                  status: HTTP_STATUS.UNAUTHORIZED
                })
              }
              ;(req as Request).decoded_refresh_token = decoded
            } catch (error) {
              if (error instanceof JsonWebTokenError) {
                throw new ErrorWithStatus({
                  message: capitalize(error.message),
                  status: HTTP_STATUS.UNAUTHORIZED
                })
              }

              throw error
            }

            return true
          }
        }
      }
    },
    ['body']
  )
)

export const emailVerifyTokenValidator = validate(
  checkSchema(
    {
      email_verify_token: {
        trim: true,
        custom: {
          options: async (value, { req }) => {
            if (!value) {
              throw new ErrorWithStatus({
                message: USER_MESSAGES.EMAIL_VERIFY_TOKEN_IS_REQUIRED,
                status: HTTP_STATUS.UNAUTHORIZED
              })
            }

            try {
              const decoded = await verifyToken({
                token: value,
                scretOrPublicKey: process.env.JWT_SECRET_EMAIL_VERIFY_TOKEN as string
              })

              ;(req as Request).decoded_email_verify_token = decoded
            } catch (error) {
              throw new ErrorWithStatus({
                message: capitalize((error as JsonWebTokenError).message),
                status: HTTP_STATUS.UNAUTHORIZED
              })
            }

            return true
          }
        }
      }
    },
    ['body']
  )
)
