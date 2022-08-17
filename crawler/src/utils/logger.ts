import pino from 'pino';

const transport = pino.transport({
  targets: [
    {
      level: 'info',
      target: 'pino-pretty', // must be installed separately
      options: {
        colorize: true,
        translateTime: 'yyyy-dd-mm, h:MM:ss TT',
      },
    },
    {
      level: 'trace',
      target: 'pino/file',
      options: { destination: './selendra-explorer.log' },
    },
  ],
});

export default pino(transport);
