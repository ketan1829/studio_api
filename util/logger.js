const pino = require("pino");
const uuid = require("uuid");
const context = require("./async-context.js");

// const fileTransport = pino.transport({
//   target: "pino/file",
//   prettyPrint: true,
//   options: {
//       destination: `./logs/info.log`
//   }
//   // options: { destination: `${__dirname}/app.log` },
// })

const fileTransport = pino.transport({
  targets: [
    {
      level: "info",
      format: "json",
      target: "pino-pretty", // must be installed separately
      options: { destination: `./logs/info.log`, colorize: false },
    },
    {
      level: "error",
      target: "pino-pretty",
      options: { destination: `./logs/error.log`, colorize: false },
    },
  ],
});

// Create a logging instance
const logger = pino(
  {
    level: process.env.NODE_ENV === "production" ? "info" : "debug",
    timestamp: () => `,"date":"${new Date().toISOString()}"`,
    serializers: {
      // Custom serializer for errors
      err: pino.stdSerializers.err, // Use the default error serializer
    },
  },
  fileTransport
);

// Proxify logger instance to use child logger from context if it exists
module.exports.logger = new Proxy(logger, {
  get(target, property, receiver) {
    target = context.getStore()?.get("logger") || target;
    return Reflect.get(target, property, receiver);
  },
});

// Generate a unique ID for each incoming request and store a child logger in context
// to always log the request ID
module.exports.contextMiddleware = (req, res, next) => {
  const child = logger.child({ requestId: uuid.v4() });
  const store = new Map();
  store.set("logger", child);

  return context.run(store, next);
};

// module.exports.log = (message="",value) =>{
//   logger.info({ [message] :value });
// }

module.exports.log = (message = '', value = null) => {
  let logObject = {};
  if (message !== "") {
    logObject = { [message]: value };
  } else {
    logObject = { "value": value };
  }
};
