module.exports = {
  apps: [
    {
      name: "academy26-sns",
      script: "node_modules/next/dist/bin/next",
      args: "dev -H 0.0.0.0 -p 3000",
      cwd: "/home/user/webapp",
      env: {
        NODE_ENV: "development",
        PORT: 3000,
      },
      watch: false,
      instances: 1,
      exec_mode: "fork",
    },
  ],
};
