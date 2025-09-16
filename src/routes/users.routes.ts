import { Router } from 'express'
import { loginValidator, registerValidator } from '~/middlewares/users.middlewares'
import { loginController, registerController } from '~/controllers/users.controllers'

const usersRouter = Router()

usersRouter.post('/login', loginValidator, loginController)

/**
 * Description: Register a new user
 * Path: /register
 * Method: POST
 * Body: { name, email, password, confirm_password, date_of_birth }
 * Response: { message: 'Register successfully', data: result }
 * Error: { message: 'Register failed', error }
 */
usersRouter.post('/register', registerValidator, registerController)

export default usersRouter
