run:
	@go run main.go

docker-build:
	@docker build . -t foo

docker-run: docker-build
	@docker run --rm foo
