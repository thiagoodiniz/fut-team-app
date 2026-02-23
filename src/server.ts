import './instrument'
import { app } from './app'
import process from 'process'

const port = Number(process.env.PORT || 8000)

app.listen(port, () => {
  // eslint-disable-next-line no-undef
  console.log(`🚀 API rodando na porta: ${port}`)
})
