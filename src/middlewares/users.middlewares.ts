import { NextFunction, Request, Response } from 'express'
import { checkSchema } from 'express-validator'
import HTTP_STATUS from '~/constants/httpStatus'
import { USER_MESSAGES } from '~/constants/messages'
import { ErrorWithStatus } from '~/models/Errors'
import databaseServices from '~/services/database.services'
import usersServices from '~/services/users.services'
import { hashPassword } from '~/utils/crypto'
import { validate } from '~/utils/validation'

export const loginValidator = validate(
  checkSchema({
    email: {
      isEmail: { errorMessage: USER_MESSAGES.EMAIL_IS_INVALID },
      notEmpty: { errorMessage: USER_MESSAGES.EMAIL_IS_REQUIRED },
      trim: true,
      errorMessage: USER_MESSAGES.EMAIL_IS_REQUIRED,
      custom: {
        options: async (value, { req }) => {
          const user = await databaseServices.users.findOne({ email: value, password: hashPassword(req.body.password) })
          if (user === null) {
            throw new Error(USER_MESSAGES.EMAIL_OR_PASSWORD_IS_INCORRECT)
          }

          req.user = user
          return true
        }
      }
    },
    password: {
      isLength: { options: { min: 6, max: 50 }, errorMessage: USER_MESSAGES.PASSWORD_MUST_BE_FROM_6_TO_50_CHARACTERS },
      isString: { errorMessage: USER_MESSAGES.PASSWORD_MUST_BE_A_STRING },
      notEmpty: { errorMessage: USER_MESSAGES.PASSWORD_IS_REQUIRED },
      errorMessage: USER_MESSAGES.PASSWORD_IS_REQUIRED
    }
  })
)

export const registerValidator = validate(
  checkSchema({
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
      isLength: { options: { min: 6, max: 50 }, errorMessage: USER_MESSAGES.PASSWORD_MUST_BE_FROM_6_TO_50_CHARACTERS },
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
  })
)
