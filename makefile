node_modules:
	npm install

webroot/demoapp.js: node_modules
	./node_modules/.bin/webpack

webroot/naive.wasm:
	emcc ./cc/naivewasmanimationmanager.cc -O3 -s SIDE_MODULE=1 -s WASM=1 -o ./webroot/naive.wasm

.PHONY: clean
clean:
	rm -rf webroot/demoapp.js
	rm -rf webroot/naive.wasm

.PHONY: wasm
wasm: webroot/naive.wasm

.PHONY: app
app: clean node_modules webroot/demoapp.js wasm