module.exports = {
  apps: [{
    name: "linear-whatsapp-bot",
    script: "npx",
    args: "tsx src/index.ts",
    cwd: "/home/marcos/linear-whatsapp-bot",
    watch: false,
    env: {
      NODE_ENV: "production",
    }
  }]
}
