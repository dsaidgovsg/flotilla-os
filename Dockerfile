FROM golang:latest

RUN mkdir -p /go/src/github.com/datagovsg/flotilla-os
ADD . /go/src/github.com/datagovsg/flotilla-os
RUN go get -u github.com/kardianos/govendor
RUN go get -u github.com/hashicorp/nomad/api
RUN go get -u github.com/hashicorp/nomad/jobspec
WORKDIR /go/src/github.com/datagovsg/flotilla-os
RUN govendor sync
RUN go install github.com/datagovsg/flotilla-os

ENTRYPOINT /go/bin/flotilla-os /go/src/github.com/datagovsg/flotilla-os/conf
