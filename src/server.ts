import createApp from './app.js';

const start = async () => {
  let app;
  try {
    app = await createApp();
    const port = parseInt(process.env.PORT || '3000', 10);
    const host = '0.0.0.0';

    await app.listen({ port, host });

    app.log.info(`🚀 Server ready at http://localhost:${port}`);
    app.log.info(`📚 API Documentation available at http://localhost:${port}/docs`);
  } catch (err) {
    if (app) {
      app.log.error(err);
    } else {
      // eslint-disable-next-line no-console
      console.error(err);
    }
    process.exit(1);
  }
};

start();
