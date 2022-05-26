go get github.com/go-delve/delve/cmd/dlv@v1.6.0
# --> Go language server
go get golang.org/x/tools/gopls@v0.6.6 \
# --> Go symbols and outline for go to symbol support and test support 
go get github.com/acroca/go-symbols@v0.1.1 && go get github.com/ramya-rao-a/go-outline@7182a932836a71948db4a81991a494751eccfe77 \
# --> GolangCI-lint
curl -sSfL https://raw.githubusercontent.com/golangci/golangci-lint/master/install.sh | sh -s -- -b $(go env GOPATH)/bin v1.43.0
