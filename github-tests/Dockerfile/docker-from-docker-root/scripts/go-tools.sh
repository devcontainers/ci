# --> Delve debugger
go install github.com/go-delve/delve/cmd/dlv@v1.24.1
# --> Go language server
go install golang.org/x/tools/gopls@v0.18.1
# --> GolangCI-lint
curl -sSfL https://raw.githubusercontent.com/golangci/golangci-lint/master/install.sh | sh -s -- -b $(go env GOPATH)/bin v1.64.5
