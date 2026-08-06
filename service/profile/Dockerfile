# ---- Build ----
FROM golang:1.26-alpine AS builder
WORKDIR /src

COPY go.mod go.sum ./
RUN go mod download

COPY . .
# Static binary: the runtime image carries no libc.
ENV CGO_ENABLED=0
RUN go build -trimpath -ldflags="-s -w" -o /out/server ./cmd/server \
    && go build -trimpath -ldflags="-s -w" -o /out/migrate ./cmd/migrate

# ---- Runtime ----
FROM gcr.io/distroless/static-debian12:nonroot

COPY --from=builder /out/server /server
COPY --from=builder /out/migrate /migrate

USER nonroot:nonroot
EXPOSE 3001
ENV PORT=3001

# CMD, not ENTRYPOINT: an ECS command override runs /migrate instead.
CMD ["/server"]
