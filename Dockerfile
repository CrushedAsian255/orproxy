FROM oven/bun:latest
COPY package.json .
RUN bun install
COPY or_proxy.js .
CMD ["bun", "run", "or_proxy.js"]
