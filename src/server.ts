import 'dotenv/config'
import { app } from './app'
import process from 'process'

const port = Number(process.env.PORT || 3333)

app.listen(port, () => {
  // eslint-disable-next-line no-undef
  console.log(`🚀 API rodando em http://localhost:${port}`)
})
