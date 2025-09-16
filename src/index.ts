import express from 'express'
import usersRouter from './routes/users.routes'
import databaseService from './services/database.services'

const app = express()
const port = 3000

app.get('/', (req, res) => {
  res.send('Hello World')
})

app.use(express.json())
app.use('/users', usersRouter)

databaseService.connect()
app.listen(port, () => {
  console.log(`Server is running on port ${port}`)
})
