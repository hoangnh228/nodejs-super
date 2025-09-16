import { Request, Response } from 'express'
import { ParamsDictionary } from 'express-serve-static-core'
import usersServices from '~/services/users.services'
import { RegisterRequestBody } from '~/models/requests/User.requests'

export const loginController = (req: Request, res: Response) => {
  if (req.body.email === 'admin@gmail.com' && req.body.password === '123456') {
    return res.status(200).json({ message: 'Login successfully' })
  }

  res.status(400).json({
    message: 'Email or password is incorrect'
  })
}

export const registerController = async (req: Request<ParamsDictionary, any, RegisterRequestBody>, res: Response) => {
  try {
    const result = await usersServices.register(req.body)
    res.json({
      message: 'Register successfully',
      data: result
    })
  } catch (error) {
    res.status(400).json({
      message: 'Register failed',
      error
    })
  }
}
