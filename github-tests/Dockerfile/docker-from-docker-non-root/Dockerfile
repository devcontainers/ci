FROM golang:1.16.0-alpine3.13 as builder

# Install certs, git, and mercurial
# RUN apk add --no-cache ca-certificates git build-base

WORKDIR /workspace

# Copy go.mod etc and download dependencies (leverage docker layer caching)
COPY go.mod go.mod
# COPY go.sum go.sum
ENV GO111MODULE=on
RUN go mod download

# Copy source code over
COPY ./ .

# Build
RUN go build -o foo ./

# Refer to https://github.com/GoogleContainerTools/distroless for more details
FROM gcr.io/distroless/static:nonroot 
WORKDIR /
COPY --from=builder /workspace/foo .
USER nonroot:nonroot

ENTRYPOINT [ "/foo" ]