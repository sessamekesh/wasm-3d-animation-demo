node_modules:
	npm install

webroot/demoapp.js: node_modules
	./node_modules/.bin/webpack

.PHONY: clean
clean:
	rm -rf webroot/demoapp.js

.PHONY: app
app: clean node_modules webroot/demoapp.js