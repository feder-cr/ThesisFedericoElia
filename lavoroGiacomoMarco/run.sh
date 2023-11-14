#!/bin/sh

#start falco with log_server configurations and pipe stout in decode_buffer
sudo falco -c falco/falco.yaml -r falco/log_server.yaml -r falco/sense-hat.yaml -b -A \
	| node ws/decode_buffer.js
