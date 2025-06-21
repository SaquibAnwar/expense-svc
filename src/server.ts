import createApp from './app.js'

const start = async () => {
  try {
    const app = await createApp()
    const port = parseInt(process.env.PORT || '3000', 10)
    const host = '0.0.0.0'
    
    await app.listen({ port, host })
    
    console.log(`🚀 Server ready at http://localhost:${port}`)
    console.log(`📚 API Documentation available at http://localhost:${port}/docs`)
  } catch (err) {
    console.error(err)
    process.exit(1)
  }
}

start() 