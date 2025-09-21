# Use the official Bun image
FROM oven/bun:latest

# Copy the file into the container
COPY or_proxy.js .

# RUN
CMD ["bun", "i"]

# Run the script
CMD ["bun", "run", "or_proxy.js"]
