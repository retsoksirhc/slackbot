const plugin = {
    init: async (bot) => {
        this.bot = bot;
        // Post a message, connect to a database, etc
    },
    handleMessage: (message) => {
      const {trimmedText, fromUser, fromChannel} = message;
      switch (trimmedText.toLowerCase()) {
        case 'ping':
          this.bot.postMessage(fromChannel, `<@${fromUser}> pong!`);
          break;
        default:
      }
    }
}

module.exports = plugin;
