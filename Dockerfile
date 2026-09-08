FROM node:20.20.2-alpine

ARG LOCAL_USER=app
ARG USER_ID=1000
ARG GROUP_ID=1000

RUN deluser node && \
    delgroup node 2>/dev/null || true; \
    addgroup -g "$GROUP_ID" "$LOCAL_USER" && \
    adduser -D -u "$USER_ID" -G "$LOCAL_USER" "$LOCAL_USER"

WORKDIR /app
RUN chown "${USER_ID}:${GROUP_ID}" /app

COPY --chown=${USER_ID}:${GROUP_ID} package.json package-lock.json ./
USER ${USER_ID}:${GROUP_ID}
RUN npm ci --ignore-scripts

COPY --chown=${USER_ID}:${GROUP_ID} . .

EXPOSE 3000

CMD ["npm", "run", "dev"]
